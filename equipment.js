
let selectedEquipmentJob = "WAR";
let equipmentSaveTimer = null;

let equipmentStatsCache = null;
let equipmentStatsLoading = false;

async function loadEquipmentStats() {
  if (equipmentStatsCache !== null || equipmentStatsLoading) return;

  equipmentStatsLoading = true;

  const { data, error } = await db
    .from("equipment_stats")
    .select("item_name, stage, stats");

  equipmentStatsLoading = false;

  if (error) {
    console.error("Equipment-Stats konnten nicht geladen werden:", error);
    return;
  }

  equipmentStatsCache = data || [];
  renderEquipment();
}

function getEquipmentStatsHtml(itemName, stageId) {
  if (!equipmentStatsCache || stageId === "none") return "";

  const suffix = {
    "119+1": " +1",
    "119+2": " +2",
    "119+3": " +3",
    "119+4": " +4"
  }[stageId] || "";

  const row = equipmentStatsCache.find(item =>
    item.item_name === itemName + suffix &&
    item.stage === stageId
  );

  if (!row || !row.stats) return "";

  const stats = Object.entries(row.stats)
    .map(([name, value]) =>
      `<span class="equipment-stat"><b>${name}:</b> ${value}</span>`
    )
    .join("");

  return `<div class="equipment-stats">${stats}</div>`;
}

function defaultEquipmentProgress() {
  const result = {};

  FFXI_JOBS.forEach(job => {
    result[job.code] = {};

    EQUIPMENT_SETS.forEach(set => {
      result[job.code][set.id] = {};

      EQUIPMENT_SLOTS.forEach(slot => {
        result[job.code][set.id][slot.id] = "none";
      });
    });
  });

  return result;
}

function normalizeEquipmentProgress(saved) {
  const result = defaultEquipmentProgress();

  if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
    return result;
  }

  FFXI_JOBS.forEach(job => {
    EQUIPMENT_SETS.forEach(set => {
      EQUIPMENT_SLOTS.forEach(slot => {
        const value = saved?.[job.code]?.[set.id]?.[slot.id];

        if (EQUIPMENT_STAGES.some(stage => stage.id === value)) {
          result[job.code][set.id][slot.id] = value;
        }
      });
    });
  });

  return result;
}

function renderEquipment() {
  const container = document.getElementById("gear-list");

  if (!container || !activeCharacter) return;
  if (equipmentStatsCache === null && !equipmentStatsLoading) {
  loadEquipmentStats();
}

  injectEquipmentStyles();

  activeCharacter.equipment = normalizeEquipmentProgress(
    activeCharacter.equipment
  );

  const progress = activeCharacter.equipment[selectedEquipmentJob];

  container.innerHTML = `
    <div style="margin-bottom:20px">
      <label for="equipment-job-select">Select job</label>
      <select id="equipment-job-select"
        style="display:block;width:100%;max-width:360px;padding:10px;
        margin-top:7px;background:var(--bg);color:var(--text);
        border:1px solid var(--border);border-radius:8px">
        ${FFXI_JOBS.map(job => `
          <option value="${job.code}"
            ${job.code === selectedEquipmentJob ? "selected" : ""}>
            ${job.code} — ${job.name}
          </option>
        `).join("")}
      </select>
    </div>

    <div class="equipment-set-grid">
      ${EQUIPMENT_SETS.map(set => {
        const pieces = EQUIPMENT_SLOTS.map(
          slot => progress[set.id][slot.id]
        );

        const obtained = pieces.filter(value => value !== "none").length;

        return `
          <div class="equipment-set-card">
            <div class="equipment-set-heading">
              <h3>${set.name}</h3>
              <span class="tag">${obtained}/5</span>
            </div>

            <div class="equipment-piece-list">
              ${EQUIPMENT_SLOTS.map(slot => {
                const stageId = progress[set.id][slot.id];
                const stage = EQUIPMENT_STAGES.find(
                  item => item.id === stageId
                );
                const itemName = getEquipmentItemName(
                  selectedEquipmentJob,
                  set.id,
                  slot.id
                );
                const iconId = getEquipmentIconId(
                  selectedEquipmentJob,
                  set.id,
                  slot.id,
                  stageId
                );

                return `
                  <button type="button"
                    class="equipment-piece-button"
                    data-equipment-set="${set.id}"
                    data-equipment-slot="${slot.id}"
                    title="Click to advance equipment progress">

                    <span class="equipment-piece-icon">
                      ${iconId
                        ? `<img
                            src="https://static.ffxiah.com/images/icon/${iconId}.png"
                            alt=""
                            loading="lazy"
                            onerror="this.style.display='none'">`
                        : stageId === "none" ? slot.icon : "✓"}
                    </span>

                    <span class="equipment-piece-info">
                      <strong>
                        ${itemName}${stageId.startsWith("119+") ? "119"}
                        <small>(${stage?.label || "Not obtained"})</small>
                      </strong>
                      ${getEquipmentStatsHtml(itemName, stageId)}
                    </span>

                    <span class="equipment-piece-next">›</span>
                  </button>
                `;
              }).join("")}
            </div>

            <div class="equipment-completion">
              ${obtained === 5
                ? "✓ Set collected"
                : `${5 - obtained} pieces remaining`}
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <div id="equipment-save-status"
      class="ffxi-save-status" role="status">Ready</div>
  `;

  document.getElementById("equipment-job-select")
    .addEventListener("change", event => {
      selectedEquipmentJob = event.target.value;
      renderEquipment();
    });

  container.querySelectorAll(".equipment-piece-button")
    .forEach(button => {
      button.addEventListener("click", () => {
        const setId = button.dataset.equipmentSet;
        const slotId = button.dataset.equipmentSlot;

        const currentId =
          activeCharacter.equipment[selectedEquipmentJob][setId][slotId];

        const currentIndex = EQUIPMENT_STAGES.findIndex(
          stage => stage.id === currentId
        );

        const maxStageId =
          setId === "empyrean" ? "119+3" : "119+4";

        const maxIndex = EQUIPMENT_STAGES.findIndex(
          stage => stage.id === maxStageId
        );

        const nextIndex = currentIndex >= maxIndex
          ? 0
          : currentIndex + 1;

        activeCharacter.equipment[selectedEquipmentJob][setId][slotId] =
          EQUIPMENT_STAGES[nextIndex].id;

        renderEquipment();
        saveEquipmentSoon();
      });
    });
}

function saveEquipmentSoon() {
  const status = document.getElementById("equipment-save-status");

  if (status) status.textContent = "Saving…";

  clearTimeout(equipmentSaveTimer);
  equipmentSaveTimer = setTimeout(saveCharacterEquipment, 400);
}

async function saveCharacterEquipment() {
  if (!activeCharacter || !currentUser) return;

  const characterId = activeCharacter.id;
  const equipmentToSave = normalizeEquipmentProgress(
    activeCharacter.equipment
  );

  const { error } = await db
    .from("characters")
    .update({
      equipment: equipmentToSave,
      updated_at: new Date().toISOString()
    })
    .eq("id", characterId)
    .eq("user_id", currentUser.id);

  const status = document.getElementById("equipment-save-status");

  if (error) {
    if (status) status.textContent = "Save failed: " + error.message;
    return;
  }

  const character = characters.find(item => item.id === characterId);

  if (character) character.equipment = equipmentToSave;

  if (status && activeCharacter?.id === characterId) {
    status.textContent = "✓ Saved online";
  }
}

function injectEquipmentStyles() {
  if (document.getElementById("ffxi-equipment-styles")) return;

  const style = document.createElement("style");
  style.id = "ffxi-equipment-styles";

  style.textContent = `
    .equipment-set-grid {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
      gap:15px;
    }

    .equipment-set-card {
      padding:16px;
      border:1px solid var(--border);
      border-radius:12px;
      background:var(--panel);
      min-width:0;
    }

    .equipment-set-heading {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:8px;
      margin-bottom:16px;
    }

    .equipment-piece-button {
      display:flex;
      align-items:center;
      gap:10px;
      width:100%;
      padding:11px 8px;
      margin:5px 0;
      text-align:left;
      color:var(--text);
      background:var(--bg);
      border:1px solid var(--border);
      border-radius:8px;
      cursor:pointer;
    }

    .equipment-piece-button:hover {
      border-color:var(--accent);
    }

    .equipment-piece-icon {
      display:grid;
      place-items:center;
      width:32px;
      height:32px;
      flex-shrink:0;
      border-radius:7px;
      background:var(--panel2);
    }

    .equipment-piece-info {
      display:grid;
      gap:4px;
      flex:1;
      min-width:0;
    }

    .equipment-piece-info strong {
      overflow-wrap:anywhere;
    }

    .equipment-piece-info small {
      color:var(--muted);
      font-size:11px;
    }

    .equipment-piece-next {
      font-size:22px;
      color:var(--muted);
    }

    .equipment-completion {
      margin-top:14px;
      color:var(--accent);
      font-size:12px;
    }

    .equipment-piece-icon img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    .equipment-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      margin-top: 6px;
      font-size: 12px;
      color: var(--muted);
    }
    
    .equipment-stat {
      white-space: nowrap;
    }
  `;

  document.head.appendChild(style);
}
