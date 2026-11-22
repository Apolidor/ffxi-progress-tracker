/* Sheol Gaol Tracker
 * Speicherung in character_collection:
 * item_type = "sheol_gaol"
 * item_id   = "<boss-id>_v<level>"
 * owned     = true/false
 */
(() => {
  "use strict";

  const ITEM_TYPE = "sheol_gaol";
  const MILESTONES = [0, 5, 10, 15, 20, 25];

  const GROUPS = [
    {
      name: "Atonement I",
      bosses: [
        ["dealan-dhe", "Dealan-dhe"],
        ["sgili", "Sgili"],
        ["u-bnai", "U Bnai"],
        ["gogmagog", "Gogmagog"]
      ]
    },
    {
      name: "Atonement II",
      bosses: [
        ["aristaeus", "Aristaeus"],
        ["raskovniche", "Raskovniche"],
        ["marmorkrebs", "Marmorkrebs"],
        ["gigelorum", "Gigelorum"],
        ["procne", "Procne"],
        ["henwen", "Henwen"]
      ]
    },
    {
      name: "Atonement III",
      bosses: [
        ["xevioso", "Xevioso"],
        ["ngai", "Ngai"],
        ["kalunga", "Kalunga"],
        ["ongo", "Ongo"],
        ["mboze", "Mboze"],
        ["arebati", "Arebati"]
      ]
    },
    {
      name: "Atonement IV",
      bosses: [
        ["bumba", "Bumba"]
      ]
    }
  ];

  let loading = false;
  let savedState = new Set();

  function getCharacterId() {
    if (typeof activeCharacter !== "undefined" && activeCharacter?.id) {
      return activeCharacter.id;
    }
    if (window.activeCharacter?.id) return window.activeCharacter.id;
    return null;
  }

  function getSupabase() {
    if (typeof db !== "undefined" && db?.from) return db;
    if (window.db?.from) return window.db;
    return null;
  }

  function setStatus(message, isError = false) {
    const el = document.getElementById("sheol-gaol-status");
    if (!el) return;
    el.textContent = message;
    el.style.display = message ? "block" : "none";
    el.style.borderColor = isError ? "#7a3d45" : "";
    el.style.background = isError ? "#2b171d" : "";
    el.style.color = isError ? "#f0b8bd" : "";
  }

  function itemId(bossId, level) {
    return `${bossId}_v${level}`;
  }

  function render() {
    const target = document.getElementById("sheol-gaol-content");
    if (!target) return;

    const totalBosses = GROUPS.reduce((sum, group) => sum + group.bosses.length, 0);
    const completedBosses = new Set(
      [...savedState].map(key => key.split("_v")[0])
    ).size;
    const v25Count = GROUPS.flatMap(group => group.bosses)
      .filter(([id]) => savedState.has(itemId(id, 25))).length;

    target.innerHTML = `
      <div class="sg-summary">
        <span class="tag">${completedBosses} / ${totalBosses} Bosse mit Fortschritt</span>
        <span class="tag">${v25Count} / ${totalBosses} auf V25</span>
      </div>
      <div class="sheol-gaol-groups">
        ${GROUPS.map(group => `
          <section class="card sheol-gaol-group">
            <h2>${group.name}</h2>
            <div class="sg-table-wrap">
              <div class="sg-table">
                <div class="sg-head">
                  <span>Boss</span>
                  ${MILESTONES.map(level => `<span style="text-align:center">V${level}</span>`).join("")}
                </div>
                ${group.bosses.map(([bossId, bossName]) => `
                  <div class="sg-row">
                    <div class="sg-boss">${bossName}</div>
                    ${MILESTONES.map(level => {
                      const id = itemId(bossId, level);
                      const checked = savedState.has(id);
                      return `
                        <label class="sg-milestone" title="${bossName} – V${level}">
                          <input type="checkbox"
                            data-sg-boss="${bossId}"
                            data-sg-level="${level}"
                            ${checked ? "checked" : ""}>
                          <span>V${level}</span>
                        </label>`;
                    }).join("")}
                  </div>
                `).join("")}
              </div>
            </div>
          </section>
        `).join("")}
      </div>
    `;

    target.querySelectorAll("input[data-sg-boss]").forEach(input => {
      input.addEventListener("change", () => saveMilestone(input));
    });
  }

  async function loadSheolGaolProgress() {
    if (loading) return;
    const client = getSupabase();
    const characterId = getCharacterId();

    if (!client) {
      setStatus("Supabase ist noch nicht verfügbar. Bitte prüfe, ob auth.js vor sheol-gaol.js geladen wird.", true);
      return;
    }
    if (!characterId) {
      setStatus("Bitte zuerst einen Charakter auswählen.", true);
      return;
    }

    loading = true;
    setStatus("");
    try {
      const { data, error } = await client
        .from("character_collection")
        .select("item_id, owned")
        .eq("character_id", characterId)
        .eq("item_type", ITEM_TYPE);

      if (error) throw error;

      savedState = new Set(
        (data || [])
          .filter(row => row.owned)
          .map(row => row.item_id)
      );
      render();
    } catch (error) {
      console.error("Sheol Gaol laden fehlgeschlagen:", error);
      setStatus(`Sheol-Gaol-Fortschritt konnte nicht geladen werden: ${error.message || error}`, true);
    } finally {
      loading = false;
    }
  }

  async function saveMilestone(input) {
    const client = getSupabase();
    const characterId = getCharacterId();
    if (!client || !characterId) {
      input.checked = !input.checked;
      setStatus("Speichern nicht möglich: Supabase oder aktiver Charakter fehlt.", true);
      return;
    }

    const bossId = input.dataset.sgBoss;
    const level = Number(input.dataset.sgLevel);
    const id = itemId(bossId, level);
    const shouldBeOwned = input.checked;

    // Optimistische Anzeige; bei Fehler wird der Zustand zurückgesetzt.
    if (shouldBeOwned) savedState.add(id);
    else savedState.delete(id);
    render();

    try {
      const { error } = await client
        .from("character_collection")
        .upsert({
          character_id: characterId,
          item_type: ITEM_TYPE,
          item_id: id,
          owned: shouldBeOwned,
          progress: null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "character_id,item_type,item_id"
        });

      if (error) throw error;
      setStatus("Fortschritt gespeichert.");
    } catch (error) {
      console.error("Sheol Gaol speichern fehlgeschlagen:", error);
      if (shouldBeOwned) savedState.delete(id);
      else savedState.add(id);
      render();
      setStatus(`Speichern fehlgeschlagen: ${error.message || error}`, true);
    }
  }

  window.loadSheolGaolProgress = loadSheolGaolProgress;
})();
