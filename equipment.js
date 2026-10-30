
let selectedEquipmentJob = "WAR";
let selectedEquipmentOrigin = null;
let equipmentSaveTimer = null;

let equipmentItemsCache = null;
let equipmentItemsLoading = false;

async function loadEquipmentItems() {
  if (equipmentItemsCache !== null || equipmentItemsLoading) return;

  equipmentItemsLoading = true;

  const { data, error } = await db
    .from("equipment")
    .select("item_id, name, itemslot, item_level, jobs, set");

  equipmentItemsLoading = false;

  if (error) {
    console.error("Equipment konnten nicht geladen werden:", error);
    const container = document.getElementById("gear-list");
    if (container) {
      container.innerHTML = `<p>Fehler beim Laden: ${error.message}</p>`;
    }
    return;
  }

  equipmentItemsCache = data || [];

  populateEquipmentSubmenu();
  renderEquipment();
}

function normalizeEquipmentSet(value) {
  const set = String(value || "").toLowerCase();

  if (set.includes("artifact") || set === "af") return "af";
  if (set.includes("relic")) return "relic";
  if (set.includes("empyrean")) return "empyrean";

  return null;
}

function getEquipmentStage(item) {
  if (Number(item.item_level) === 109) return "109";

  const match = item.name.match(/\+([1-4])$/);

  if (match && Number(item.item_level) === 119) {
    return `119+${match[1]}`;
  }

  if (Number(item.item_level) === 119) return "119";

  return null;
}

function getEquipmentBaseName(name) {
  return name.replace(/\s\+\d+$/, "");
}

function getEquipmentOrigins() {
  if (!equipmentItemsCache) return [];

  return [...new Set(
    equipmentItemsCache
      .map(item => String(item.set || "").trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
}

function populateEquipmentSubmenu() {
  const submenu = document.getElementById("equipment-submenu");
  if (!submenu) return;

  const origins = getEquipmentOrigins();

  submenu.innerHTML = origins.map(origin => `
    <button type="button"
      data-equipment-origin="${origin.replace(/"/g, "&quot;")}"
      class="${origin === selectedEquipmentOrigin ? "active" : ""}">
      ${origin}
    </button>
  `).join("");

  submenu.querySelectorAll("[data-equipment-origin]")
    .forEach(button => {
      button.addEventListener("click", () => {
        selectedEquipmentOrigin = button.dataset.equipmentOrigin;

        submenu.classList.add("open");
        populateEquipmentSubmenu();

        showPage("equipment");
        renderEquipment();
      });
    });

  if (!selectedEquipmentOrigin && origins.length) {
    selectedEquipmentOrigin = origins[0];
  }
}

function initEquipmentNavigation() {
  const toggle = document.getElementById("equipment-menu-toggle");
  const submenu = document.getElementById("equipment-submenu");
  const arrow = document.getElementById("equipment-menu-arrow");

  if (!toggle || !submenu || toggle.dataset.initialized) return;

  toggle.dataset.initialized = "true";

  toggle.addEventListener("click", () => {
    submenu.classList.toggle("open");

    if (arrow) {
      arrow.textContent = submenu.classList.contains("open") ? "▴" : "▾";
    }

    if (equipmentItemsCache === null) {
      loadEquipmentItems();
    } else {
      populateEquipmentSubmenu();
      renderEquipment();
    }
  });
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
    const savedJob = saved[job.code];

    if (!savedJob || typeof savedJob !== "object") return;

    Object.entries(savedJob).forEach(([setId, pieces]) => {
      if (!pieces || typeof pieces !== "object") return;

      if (!result[job.code][setId]) {
        result[job.code][setId] = {};
      }

      Object.entries(pieces).forEach(([itemId, value]) => {
        if (
          EQUIPMENT_STAGES.some(stage => stage.id === value) ||
          value === "none" ||
          /^\d+$/.test(String(value))
        ) {
          result[job.code][setId][itemId] = value;
        }
      });
    });
  });

  return result;
}

function getEquipmentGroups(job, origin) {
  if (!equipmentItemsCache) return [];

  const items = equipmentItemsCache.filter(item =>
    Array.isArray(item.jobs) &&
    item.jobs.includes(job) &&
    String(item.set || "").trim() === origin
  );

  const groups = {};

  items.forEach(item => {
    const slotId = String(item.itemslot || "").toLowerCase();
    const baseName = getEquipmentBaseName(item.name);
    const key = `${slotId}::${baseName}`;

    if (!groups[key]) {
      groups[key] = {
        key,
        slotId,
        baseName,
        items: []
      };
    }

    groups[key].items.push(item);
  });

  return Object.values(groups).map(group => {
    group.items.sort((a, b) => {
      const getOrder = item => {
        const match = item.name.match(/\+([1-4])$/);
        return match ? Number(match[1]) : 0;
      };
    
      return getOrder(a) - getOrder(b);
    });

    return group;
  }).sort((a, b) => {
    const slotA = EQUIPMENT_SLOTS.findIndex(slot => slot.id === a.slotId);
    const slotB = EQUIPMENT_SLOTS.findIndex(slot => slot.id === b.slotId);

    if (slotA !== slotB) return slotA - slotB;

    return a.baseName.localeCompare(b.baseName);
  });
}

function getEquipmentProgressValue(job, origin, group) {
  const jobProgress = activeCharacter.equipment[job];

  if (!jobProgress[origin]) {
    jobProgress[origin] = {};
  }

  // Neue Speicherung: Fortschritt pro Ausrüstungsreihe.
  if (jobProgress[origin][group.key] !== undefined) {
    return String(jobProgress[origin][group.key]);
  }

  // Alte Speicherung übernehmen: AF, Relic und Empyrean.
  const oldSet = normalizeEquipmentSet(origin);

  if (oldSet && jobProgress[oldSet]) {
    const oldStage = jobProgress[oldSet][group.slotId];

    if (oldStage && oldStage !== "none") {
      const matchingItem = group.items.find(
        item => getEquipmentStage(item) === oldStage
      );

      if (matchingItem) {
        jobProgress[origin][group.key] = String(matchingItem.item_id);
        return String(matchingItem.item_id);
      }
    }
  }

  jobProgress[origin][group.key] = "none";
  return "none";
}


function renderEquipment() {
  const container = document.getElementById("gear-list");
  if (!container || !activeCharacter) return;

  if (equipmentItemsCache === null) {
    container.innerHTML = "<p>Equipment wird geladen ...</p>";
    loadEquipmentItems();
    return;
  }

  injectEquipmentStyles();

  activeCharacter.equipment = normalizeEquipmentProgress(
    activeCharacter.equipment
  );

  if (!selectedEquipmentOrigin) {
    selectedEquipmentOrigin = getEquipmentOrigins()[0] || null;
  }

  if (!selectedEquipmentOrigin) {
    container.innerHTML = "<p>Keine Ausrüstung gefunden.</p>";
    return;
  }

  const slots = [
    { id: "head", name: "Head" },
    { id: "body", name: "Body" },
    { id: "hands", name: "Hands" },
    { id: "legs", name: "Legs" },
    { id: "feet", name: "Feet" }
  ];

  const jobs = FFXI_JOBS.map(job => ({
    ...job,
    groups: getEquipmentGroups(job.code, selectedEquipmentOrigin)
  }));

  const availableJobs = jobs.filter(job => job.groups.length > 0);

  const title = document.querySelector("#equipment h1");
  if (title) title.textContent = selectedEquipmentOrigin;

  container.innerHTML = `
    <div class="equipment-table-wrapper">
      <div class="equipment-job-table">

        <div class="equipment-table-header">
          <div class="equipment-job-heading">Job</div>
          ${slots.map(slot => `
            <div>${slot.name}</div>
          `).join("")}
        </div>

        ${availableJobs.map(job => `
          <div class="equipment-job-row">

            <div class="equipment-job-name">
              <strong>${job.code}</strong>
              <small>${job.name}</small>
            </div>

            ${slots.map(slot => {
              const groups = job.groups.filter(
                group => group.slotId === slot.id
              );

              return `
                <div class="equipment-slot-cell">
                  ${groups.length
                    ? groups.map(group => {
                        const currentValue = getEquipmentProgressValue(
                          job.code,
                          selectedEquipmentOrigin,
                          group
                        );

                        const currentItem = group.items.find(
                          item => String(item.item_id) === currentValue
                        );

                        const iconItem = currentItem || group.items[0];

                        return `
                          <button type="button"
                            class="equipment-row-item"
                            data-job="${job.code}"
                            data-equipment-key="${group.key.replace(/"/g, "&quot;")}">

                            ${iconItem ? `
                              <img
                                src="https://static.ffxiah.com/images/icon/${iconItem.item_id}.png"
                                alt=""
                                loading="lazy"
                                onerror="this.style.display='none'">
                            ` : ""}

                            <span>
                              ${currentItem
                                ? currentItem.name
                                : group.baseName}
                            </span>

                            <small>
                              ${currentItem ? "Obtained" : "Not obtained"}
                            </small>
                          </button>
                        `;
                      }).join("")
                    : '<span class="equipment-empty">–</span>'
                  }
                </div>
              `;
            }).join("")}

          </div>
        `).join("")}

      </div>
    </div>

    <div id="equipment-save-status"
      class="ffxi-save-status" role="status">Ready</div>
  `;

  container.querySelectorAll(".equipment-row-item")
    .forEach(button => {
      button.addEventListener("click", () => {
        const job = button.dataset.job;

        const group = jobs
          .find(item => item.code === job)
          ?.groups.find(
            item => item.key === button.dataset.equipmentKey
          );

        if (!group) return;

        const currentValue = getEquipmentProgressValue(
          job,
          selectedEquipmentOrigin,
          group
        );

        const options = [
          "none",
          ...group.items.map(item => String(item.item_id))
        ];

        const currentIndex = options.indexOf(currentValue);
        const nextIndex = (currentIndex + 1) % options.length;

        activeCharacter.equipment[job]
          [selectedEquipmentOrigin][group.key] = options[nextIndex];

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

initEquipmentNavigation();

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

    
    .equipment-table-wrapper {
      overflow-x: auto;
      width: 100%;
    }
    
    .equipment-job-table {
      min-width: 850px;
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      background: var(--panel);
    }
    
    .equipment-table-header,
    .equipment-job-row {
      display: grid;
      grid-template-columns: 110px repeat(5, minmax(130px, 1fr));
    }
    
    .equipment-table-header {
      background: var(--panel2);
      color: var(--muted);
      font-size: 12px;
      font-weight: bold;
      text-align: center;
    }
    
    .equipment-table-header > div {
      padding: 14px 8px;
      border-right: 1px solid var(--border);
    }
    
    .equipment-job-row {
      border-top: 1px solid var(--border);
    }
    
    .equipment-job-name {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 10px;
      border-right: 1px solid var(--border);
    }
    
    .equipment-job-name strong {
      font-size: 15px;
      color: var(--accent);
    }
    
    .equipment-job-name small {
      color: var(--muted);
      font-size: 11px;
    }
    
    .equipment-slot-cell {
      display: flex;
      flex-direction: column;
      gap: 5px;
      justify-content: center;
      padding: 6px;
      border-right: 1px solid var(--border);
      min-width: 0;
    }
    
    .equipment-row-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-height: 85px;
      padding: 8px 4px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
      text-align: center;
    }
    
    .equipment-row-item:hover {
      border-color: var(--accent);
      background: var(--panel2);
    }
    
    .equipment-row-item img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }
    
    .equipment-row-item span {
      font-size: 11px;
      overflow-wrap: anywhere;
    }
    
    .equipment-row-item small {
      color: var(--muted);
      font-size: 10px;
    }
    
    .equipment-empty {
      color: var(--muted);
      text-align: center;
    }

  `;

  document.head.appendChild(style);
}
