
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
      const stageOrder = item => {
        const stage = getEquipmentStage(item);

        if (stage === "109") return 0;
        if (stage === "119") return 1;
        if (stage && stage.startsWith("119+")) {
          return 1 + Number(stage.split("+")[1]);
        }

        return 10;
      };

      return stageOrder(a) - stageOrder(b);
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
    const origins = getEquipmentOrigins();
    selectedEquipmentOrigin = origins[0] || null;
  }

  if (!selectedEquipmentOrigin) {
    container.innerHTML = "<p>Keine Ausrüstung in Supabase gefunden.</p>";
    return;
  }

  const groups = getEquipmentGroups(
    selectedEquipmentJob,
    selectedEquipmentOrigin
  );

  const title = document.querySelector("#equipment h1");
  if (title) title.textContent = selectedEquipmentOrigin;

  const description = document.querySelector("#equipment .welcome p");
  if (description) {
    description.textContent =
      `Ausrüstungsfortschritt für ${selectedEquipmentOrigin}`;
  }

  const progress = activeCharacter.equipment[selectedEquipmentJob];

  const obtained = groups.filter(group =>
    getEquipmentProgressValue(
      selectedEquipmentJob,
      selectedEquipmentOrigin,
      group
    ) !== "none"
  ).length;

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
      <div class="equipment-set-card">
        <div class="equipment-set-heading">
          <h3>${selectedEquipmentOrigin}</h3>
          <span class="tag">${obtained}/${groups.length}</span>
        </div>

        <div class="equipment-piece-list">
          ${groups.map(group => {
            const currentValue = getEquipmentProgressValue(
              selectedEquipmentJob,
              selectedEquipmentOrigin,
              group
            );

            const currentItem = group.items.find(
              item => String(item.item_id) === currentValue
            );

            const iconItem = currentItem || group.items[0];

            const slot = EQUIPMENT_SLOTS.find(
              item => item.id === group.slotId
            );

            return `
              <button type="button"
                class="equipment-piece-button"
                data-equipment-key="${group.key.replace(/"/g, "&quot;")}"
                title="Click to advance equipment progress">

                <span class="equipment-piece-icon">
                  ${iconItem?.item_id
                    ? `<img
                        src="https://static.ffxiah.com/images/icon/${iconItem.item_id}.png"
                        alt=""
                        loading="lazy"
                        onerror="this.style.display='none'">`
                    : slot?.icon || "◇"}
                </span>

                <span class="equipment-piece-info">
                  <strong>
                    ${currentItem
                      ? currentItem.name
                      : group.baseName + " (not obtained)"}
                  </strong>
                  <small>${slot?.name || group.slotId}</small>
                </span>

                <span class="equipment-piece-next">›</span>
              </button>
            `;
          }).join("")}
        </div>

        <div class="equipment-completion">
          ${obtained === groups.length
            ? "✓ All items collected"
            : `${groups.length - obtained} items remaining`}
        </div>
      </div>
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
        const group = groups.find(
          item => item.key === button.dataset.equipmentKey
        );

        if (!group) return;

        const currentValue = getEquipmentProgressValue(
          selectedEquipmentJob,
          selectedEquipmentOrigin,
          group
        );

        const options = [
          "none",
          ...group.items.map(item => String(item.item_id))
        ];

        const currentIndex = options.indexOf(currentValue);
        const nextIndex = (currentIndex + 1) % options.length;

        activeCharacter.equipment[selectedEquipmentJob]
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
  `;

  document.head.appendChild(style);
}
