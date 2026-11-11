
const LIMBUS_TOWERS = {
  temenos: {
    name: "Temenos",
    description: "4 Türme",
    towers: [
      { id: "temenos_northern", name: "Northern Tower" },
      { id: "temenos_eastern", name: "Eastern Tower" },
      { id: "temenos_western", name: "Western Tower" },
      { id: "temenos_central", name: "Central Tower" }
    ]
  },
  apollyon: {
    name: "Apollyon",
    description: "5 Türme",
    towers: [
      { id: "apollyon_northwest", name: "Northwest Tower" },
      { id: "apollyon_northeast", name: "Northeast Tower" },
      { id: "apollyon_southwest", name: "Southwest Tower" },
      { id: "apollyon_southeast", name: "Southeast Tower" },
      { id: "apollyon_central", name: "Central Tower" }
    ]
  }
};

let limbusProgress = {};
let limbusCharacterId = null;

function renderLimbus() {
  const container = document.getElementById("limbus-content");
  if (!container) return;

  container.innerHTML = Object.entries(LIMBUS_TOWERS).map(([key, region]) => {
    const completed = region.towers.filter(
      tower => limbusProgress[tower.id] === true
    ).length;

    return `
      <div class="card" style="margin-bottom:20px">
        <div class="section-head">
          <div>
            <h2>${region.name}</h2>
            <span class="stat-label">${region.description}</span>
          </div>
          <span class="tag">${completed} / ${region.towers.length} geöffnet</span>
        </div>

        ${region.towers.map(tower => `
          <div class="goal ${limbusProgress[tower.id] ? "done" : ""}">
            <input
              type="checkbox"
              id="limbus-${tower.id}"
              data-limbus="${tower.id}"
              ${limbusProgress[tower.id] ? "checked" : ""}
            >
            <label for="limbus-${tower.id}">
              <span>${tower.name}</span>
            </label>
          </div>
        `).join("")}

        <div style="margin-top:20px">
          <button class="action" data-reset-limbus="${key}">
            5.000er-Kiste geöffnet – ${region.name} zurücksetzen
          </button>
        </div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-limbus]").forEach(input => {
    input.addEventListener("change", async () => {
      await saveLimbusTower(input.dataset.limbus, input.checked);
    });
  });

  container.querySelectorAll("[data-reset-limbus]").forEach(button => {
    button.addEventListener("click", async () => {
      const regionKey = button.dataset.resetLimbus;
      await resetLimbusRegion(regionKey);
    });
  });
}

function setLimbusStatus(message, isError = false) {
  const status = document.getElementById("limbus-status");
  if (!status) return;

  status.style.display = "block";
  status.textContent = message;
  status.style.borderColor = isError ? "#8b4545" : "#31483f";
  status.style.background = isError ? "#301b1b" : "#14251f";
  status.style.color = isError ? "#f0b5b5" : "#b9d9cf";
}

async function loadLimbusProgress() {
  if (!activeCharacter || !activeCharacter.id) return;

  const characterId = activeCharacter.id;
  limbusCharacterId = characterId;

  const container = document.getElementById("limbus-content");
  if (container) {
    container.innerHTML = '<p class="empty">Limbus-Fortschritt wird geladen ...</p>';
  }

  const { data, error } = await db
    .from("character_collection")
    .select("item_id, owned")
    .eq("character_id", characterId)
    .eq("item_type", "limbus");

  if (error) {
    setLimbusStatus("Fehler beim Laden: " + error.message, true);
    return;
  }

  // Verhindert, dass ein verspätetes Ergebnis den Stand
  // eines inzwischen ausgewählten anderen Charakters überschreibt.
  if (!activeCharacter || activeCharacter.id !== characterId) return;

  limbusProgress = {};

  (data || []).forEach(row => {
    limbusProgress[row.item_id] = row.owned === true;
  });

  renderLimbus();
}

async function saveLimbusTower(towerId, owned) {
  if (!activeCharacter || !activeCharacter.id) return;

  const characterId = activeCharacter.id;

  const { error } = await db
    .from("character_collection")
    .upsert({
      character_id: characterId,
      item_type: "limbus",
      item_id: towerId,
      owned: owned,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "character_id,item_type,item_id"
    });

  if (error) {
    setLimbusStatus("Speichern fehlgeschlagen: " + error.message, true);
    await loadLimbusProgress();
    return;
  }

  if (!activeCharacter || activeCharacter.id !== characterId) return;

  limbusProgress[towerId] = owned;
  renderLimbus();
  setLimbusStatus("Limbus-Fortschritt wurde gespeichert.");
}

async function resetLimbusRegion(regionKey) {
  if (!activeCharacter || !activeCharacter.id) return;

  const region = LIMBUS_TOWERS[regionKey];
  if (!region) return;

  if (!confirm(
    `Möchtest du alle Checkboxen für ${region.name} zurücksetzen?\n\n` +
    "Der Fortschritt der anderen Region bleibt unverändert."
  )) return;

  const characterId = activeCharacter.id;

  const rows = region.towers.map(tower => ({
    character_id: characterId,
    item_type: "limbus",
    item_id: tower.id,
    owned: false,
    updated_at: new Date().toISOString()
  }));

  const { error } = await db
    .from("character_collection")
    .upsert(rows, {
      onConflict: "character_id,item_type,item_id"
    });

  if (error) {
    setLimbusStatus("Zurücksetzen fehlgeschlagen: " + error.message, true);
    return;
  }

  if (!activeCharacter || activeCharacter.id !== characterId) return;

  region.towers.forEach(tower => {
    limbusProgress[tower.id] = false;
  });

  renderLimbus();
  setLimbusStatus(`${region.name} wurde zurückgesetzt.`);
}
