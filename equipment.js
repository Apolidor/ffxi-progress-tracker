let selectedEquipmentJob = "WAR";
let selectedEquipmentOrigin = null;
let equipmentSaveTimer = null;

let equipmentItemsCache = null;
let equipmentItemsLoading = false;

let equipmentCollectionCache = {};
let equipmentCollectionCharacterId = null;
let equipmentCollectionLoading = null;

let equipmentCollectionLoadToken = 0;

async function loadEquipmentCollection() {
  if (!activeCharacter) return;

  const characterId = activeCharacter.id;

  if (equipmentCollectionCharacterId === characterId) return;

  const token = ++equipmentCollectionLoadToken;

  const { data, error } = await db
    .from("character_collection")
    .select("item_id, owned, progress")
    .eq("character_id", characterId)
    .eq("item_type", "equipment");

  if (error) throw error;

  // Verhindert, dass ein inzwischen veralteter Ladevorgang
  // die Daten des aktuell ausgewählten Charakters überschreibt.
  if (
    token !== equipmentCollectionLoadToken ||
    activeCharacter?.id !== characterId
  ) {
    return;
  }

  equipmentCollectionCache = {};

  (data || []).forEach(item => {
    equipmentCollectionCache[item.item_id] = item;
  });

  equipmentCollectionCharacterId = characterId;
}

function getEquipmentCollectionId(type, job, origin, group) {
  if (type === "weapon") {
    return `weapon:${job}:${group.key}`;
  }

  return `armor:${job}:${origin}:${group.key}`;
}

function getCollectionEquipmentValue(itemId) {
  const entry = equipmentCollectionCache[itemId];

  if (!entry || !entry.owned) return "none";

  return String(entry.progress?.stage_item_id || "none");
}

async function saveEquipmentCollectionItem({
  itemId,
  value,
  job,
  origin,
  group,
  type
}) {
  if (!activeCharacter || !currentUser) return;

  const characterId = activeCharacter.id;
  const owned = value !== "none";

  const progress = {
    stage_item_id: owned ? Number(value) : null,
    job,
    slot: group.slotId || group.slot,
    set: origin || "Weapons",
    category: type,
    base_name: group.baseName
  };

  const row = {
    character_id: characterId,
    item_type: "equipment",
    item_id: itemId,
    owned,
    progress,
    updated_at: new Date().toISOString()
  };

  // Cache sofort aktualisieren, damit die Anzeige direkt stimmt.
  equipmentCollectionCache[itemId] = row;

  const status = document.getElementById(
    type === "weapon" ? "weapon-save-status" : "equipment-save-status"
  );

  if (status) status.textContent = "Saving…";

  const { error } = await db
    .from("character_collection")
    .upsert(row, {
      onConflict: "character_id,item_type,item_id"
    });

  if (error) {
    console.error("Equipment konnte nicht gespeichert werden:", error);
    if (status) status.textContent = "Save failed: " + error.message;
    return;
  }

  if (status && activeCharacter?.id === characterId) {
    status.textContent = "✓ Saved online";
  }
}

async function loadEquipmentItems() {
  if (equipmentItemsCache !== null || equipmentItemsLoading) return;

  equipmentItemsLoading = true;

  const pageSize = 1000;
  let allItems = [];
  let from = 0;

  try {
    while (true) {
      const { data, error } = await db
        .from("equipment")
        .select("item_id, name, itemslot, item_level, jobs, set, ffxi_url, source_url")
        .range(from, from + pageSize - 1);

      if (error) throw error;

      allItems = allItems.concat(data || []);

      if (!data || data.length < pageSize) break;

      from += pageSize;
    }

    equipmentItemsCache = allItems;

    console.log("Equipment geladen:", allItems.length);

    populateEquipmentSubmenu();
    renderEquipment();

  } catch (error) {
    console.error("Equipment konnten nicht geladen werden:", error);

    const container = document.getElementById("gear-list");
    if (container) {
      container.innerHTML = `<p>Fehler beim Laden: ${error.message}</p>`;
    }

  } finally {
    equipmentItemsLoading = false;
  }
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
  return String(name || "")
    .trim()
    .replace(/\s*\+[1-4]$/, "")
    .trim();
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


let selectedWeaponSlot = "main";

const WEAPON_SLOTS = [
  { id: "main", name: "Main Hand" },
  { id: "sub", name: "Off Hand" },
  { id: "range", name: "Ranged" }
];

function getWeaponSlots() {
  if (!equipmentItemsCache) return [];

  return WEAPON_SLOTS.filter(slot =>
    equipmentItemsCache.some(item =>
      String(item.itemslot || "").toLowerCase() === slot.id
    )
  );
}

function populateWeaponsSubmenu() {
  const submenu = document.getElementById("weapons-submenu");
  if (!submenu) return;

  const slots = getWeaponSlots();

  submenu.innerHTML = slots.map(slot => `
    <button type="button"
      data-weapon-slot="${slot.id}"
      class="${selectedWeaponSlot === slot.id ? "active" : ""}">
      ${slot.name}
    </button>
  `).join("");

  submenu.querySelectorAll("[data-weapon-slot]").forEach(button => {
    button.addEventListener("click", () => {
      selectedWeaponSlot = button.dataset.weaponSlot;
      submenu.classList.add("open");
      populateWeaponsSubmenu();
      showPage("weapons");
      renderWeapons();
    });
  });
}
function initWeaponNavigation() {
  const toggle = document.getElementById("weapons-menu-toggle");
  const submenu = document.getElementById("weapons-submenu");
  const arrow = document.getElementById("weapons-menu-arrow");

  if (!toggle || !submenu || toggle.dataset.initialized) return;

  toggle.dataset.initialized = "true";

  toggle.addEventListener("click", () => {
    submenu.classList.toggle("open");

    if (arrow) {
      arrow.textContent = submenu.classList.contains("open") ? "▴" : "▾";
    }

    if (equipmentItemsCache === null) {
      loadEquipmentItems().then(() => {
        populateWeaponsSubmenu();
        renderWeapons();
      });
    } else {
      populateWeaponsSubmenu();
      renderWeapons();
    }
  });
}

function getWeaponGroups(job, slot) {
  if (!equipmentItemsCache) return [];

  const items = equipmentItemsCache.filter(item =>
    Array.isArray(item.jobs) &&
    item.jobs.includes(job) &&
    String(item.itemslot || "").toLowerCase() === slot
  );

  const groups = {};

  items.forEach(item => {
    const baseName = getEquipmentBaseName(item.name);
    const key = `${slot}::${baseName.toLowerCase()}`;

    if (!groups[key]) {
      groups[key] = {
        key,
        slot,
        baseName,
        items: []
      };
    }

    groups[key].items.push(item);
  });

  return Object.values(groups).map(group => {
    group.items.sort((a, b) => {
      const getOrder = item => {
        const match = item.name.trim().match(/\+([1-4])$/);
        return match ? Number(match[1]) : 0;
      };

      return getOrder(a) - getOrder(b);
    });

    return group;
  }).sort((a, b) => a.baseName.localeCompare(b.baseName));
}

function getWeaponProgressValue(job, group) {
  const itemId = getEquipmentCollectionId(
    "weapon",
    job,
    null,
    group
  );

  return getCollectionEquipmentValue(itemId);
}

function renderWeapons() {
  const container = document.getElementById("weapon-list");
  if (!container || !activeCharacter) return;

  if (equipmentItemsCache === null) {
    container.innerHTML = "<p>Weapons werden geladen ...</p>";
    loadEquipmentItems().then(renderWeapons);
    return;
  }

  if (equipmentCollectionCharacterId !== activeCharacter.id) {
    container.innerHTML = "<p>Equipment-Fortschritt wird geladen ...</p>";

    loadEquipmentCollection()
      .then(renderWeapons)
      .catch(error => {
        console.error(error);
        container.innerHTML =
          `<p>Fehler beim Laden des Fortschritts: ${error.message}</p>`;
      });

    return;
  }
  
  const slot = WEAPON_SLOTS.find(item => item.id === selectedWeaponSlot);

  if (!slot) {
    container.innerHTML = "<p>Keine Waffenkategorie gefunden.</p>";
    return;
  }

  const jobs = FFXI_JOBS.map(job => ({
    ...job,
    groups: getWeaponGroups(job.code, selectedWeaponSlot)
  }));

  const availableJobs = jobs.filter(job => job.groups.length > 0);

  const title = document.querySelector("#weapons h1");
  if (title) title.textContent = slot.name;

  if (!availableJobs.length) {
    container.innerHTML = "<p>Für diese Kategorie wurden keine Waffen gefunden.</p>";
    return;
  }

  container.innerHTML = `
    <div class="equipment-table-wrapper">
      <div class="equipment-job-table">
        <div class="equipment-table-header"
             style="grid-template-columns:110px minmax(0, 1fr)">
          <div>Job</div>
          <div>${slot.name}</div>
        </div>

        ${availableJobs.map(job => `
          <div class="equipment-job-row"
               style="grid-template-columns:110px minmax(0, 1fr)">
            <div class="equipment-job-name">
              <strong>${job.code}</strong>
              <small>${job.name}</small>
            </div>

            <div class="equipment-slot-cell">
              ${job.groups.map(group => {
                const currentValue = getWeaponProgressValue(job.code, group);
                const currentItem = group.items.find(
                  item => String(item.item_id) === currentValue
                );

                return `
                  <button type="button"
                    class="equipment-row-item"
                    data-weapon-job="${job.code}"
                    data-weapon-key="${group.key.replace(/"/g, "&quot;")}">

                    ${currentItem ? `
                      <a
                        href="${currentItem.ffxi_url || currentItem.source_url || '#'}"
                        target="_blank"
                        rel="noopener noreferrer"
                        onclick="event.stopPropagation()"
                        ${currentItem.ffxi_url || currentItem.source_url ? "" : 'onclick="event.preventDefault(); event.stopPropagation()"'}
                      >
                        <img
                          src="https://static.ffxiah.com/images/icon/${currentItem.item_id}.png"
                          alt="${currentItem.name}"
                          loading="lazy"
                          onerror="this.style.display='none'">
                      </a>
                    ` : `
                      <div class="equipment-placeholder-icon">
                        <svg viewBox="0 0 48 48" width="32" height="32"
                             fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M16 8h16l8 8v16l-8 8H16l-8-8V16z"/>
                          <path d="M17 24h14M24 17v14"/>
                        </svg>
                      </div>
                    `}

                    <span>${currentItem ? currentItem.name : group.baseName}</span>
                    <small>${currentItem ? "Obtained" : "Not obtained"}</small>
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
    <div id="weapon-save-status" class="ffxi-save-status" role="status">
      Ready
    </div>
  `;

  container.querySelectorAll("[data-weapon-job]").forEach(button => {
    button.addEventListener("click", async () => {
      const job = button.dataset.weaponJob;
      const group = getWeaponGroups(job, selectedWeaponSlot)
        .find(item => item.key === button.dataset.weaponKey);
  
      if (!group) return;
  
      const currentValue = getWeaponProgressValue(job, group);
  
      const options = [
        "none",
        ...group.items.map(item => String(item.item_id))
      ];
  
      const currentIndex = options.indexOf(currentValue);
      const nextValue = options[(currentIndex + 1) % options.length];
  
      const itemId = getEquipmentCollectionId(
        "weapon",
        job,
        null,
        group
      );
  
      await saveEquipmentCollectionItem({
        itemId,
        value: nextValue,
        job,
        group,
        type: "weapon"
      });
  
      renderWeapons();
    });
  });
}

initWeaponNavigation();


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
    const key = `${slotId}::${baseName.toLowerCase()}`;

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
        const match = item.name.trim().match(/\+([1-4])$/);
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
  const itemId = getEquipmentCollectionId(
    "armor",
    job,
    origin,
    group
  );

  return getCollectionEquipmentValue(itemId);
}


// Ermittelt den eigentlichen Namen eines Rüstungssets.
function getEquipmentSetName(itemName) {
  const name = getEquipmentBaseName(itemName).trim();

  // Der erste Bestandteil des Itemnamens ist der Setname.
  return name.split(/\s+/)[0];
}


function renderEquipment() {
  const container = document.getElementById("gear-list");
  if (!container || !activeCharacter) return;

  if (equipmentItemsCache === null) {
    container.innerHTML = "<p>Equipment wird geladen ...</p>";
    loadEquipmentItems();
    return;
  }

    if (equipmentCollectionCharacterId !== activeCharacter.id) {
    container.innerHTML = "<p>Equipment-Fortschritt wird geladen ...</p>";

    loadEquipmentCollection()
      .then(renderEquipment)
      .catch(error => {
        console.error(error);
        container.innerHTML =
          `<p>Fehler beim Laden des Fortschritts: ${error.message}</p>`;
      });

    return;
  }

  injectEquipmentStyles();


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

  // Sets anhand des ersten Wortes gruppieren.
  const sets = {};

  availableJobs.forEach(job => {
    job.groups.forEach(group => {
      const setName = getEquipmentSetName(group.baseName);
      const setKey = setName.toLowerCase();

      if (!sets[setKey]) {
        sets[setKey] = {
          setName,
          jobs: {}
        };
      }

      if (!sets[setKey].jobs[job.code]) {
        sets[setKey].jobs[job.code] = {
          ...job,
          groups: []
        };
      }

      sets[setKey].jobs[job.code].groups.push(group);
    });
  });

  const availableSets = Object.values(sets).sort((a, b) =>
    a.setName.localeCompare(b.setName)
  );

  container.innerHTML = `
    <div class="equipment-table-wrapper">
      <div class="equipment-job-table">

        <div class="equipment-table-header">
          <div>Set</div>
          ${slots.map(slot => `
            <div>${slot.name}</div>
          `).join("")}
        </div>

        ${availableSets.map(set => {
          const setJobs = Object.values(set.jobs);
          const jobCodes = setJobs.map(job => job.code).join(" · ");

          return `
            <div class="equipment-job-row">

              <div class="equipment-job-name">
                <strong>${set.setName}</strong>
                <small>${jobCodes}</small>
              </div>

              ${slots.map(slot => {
                // Gleiche Items verschiedener Jobs nur einmal sammeln.
                const uniqueEntries = new Map();

                setJobs.forEach(job => {
                  job.groups
                    .filter(group => group.slotId === slot.id)
                    .forEach(group => {
                      if (!uniqueEntries.has(group.key)) {
                        uniqueEntries.set(group.key, {
                          group,
                          jobs: []
                        });
                      }

                      uniqueEntries.get(group.key).jobs.push(job);
                    });
                });

                const slotEntries = Array.from(uniqueEntries.values());

                return `
                  <div class="equipment-slot-cell">
                    ${slotEntries.length
                      ? slotEntries.map(({ group, jobs: entryJobs }) => {
                          const progressValues = entryJobs.map(job =>
                            getEquipmentProgressValue(
                              job.code,
                              selectedEquipmentOrigin,
                              group
                            )
                          );

                          const uniqueProgress = [
                            ...new Set(progressValues)
                          ];

                          const currentItem = group.items.find(
                            item =>
                              String(item.item_id) === progressValues[0]
                          );

                          const anyCurrentItem = entryJobs
                            .map((job, index) =>
                              group.items.find(
                                item =>
                                  String(item.item_id) === progressValues[index]
                              )
                            )
                            .find(Boolean);

                          const displayedItem = currentItem || anyCurrentItem;

                          const statusText = uniqueProgress.length > 1
                            ? "Different progress"
                            : displayedItem
                              ? "Obtained"
                              : "Not obtained";

                          const jobCodesForButton = entryJobs
                            .map(job => job.code)
                            .join(",");

                          return `
                            <button type="button"
                              class="equipment-row-item"
                              data-jobs="${jobCodesForButton}"
                              data-equipment-key="${group.key.replace(/"/g, "&quot;")}">

                              ${displayedItem ? `
                                <a
                                  href="${displayedItem.ffxi_url || displayedItem.source_url || '#'}"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onclick="event.stopPropagation()"
                                  ${displayedItem.ffxi_url || displayedItem.source_url ? "" : 'onclick="event.preventDefault(); event.stopPropagation()"'}
                                >
                                  <img
                                    src="https://static.ffxiah.com/images/icon/${displayedItem.item_id}.png"
                                    alt="${displayedItem.name}"
                                    loading="lazy"
                                    onerror="this.style.display='none'">
                                </a>
                              ` : `
                                <div class="equipment-placeholder-icon">
                                  <svg viewBox="0 0 48 48"
                                       fill="none"
                                       stroke="currentColor"
                                       stroke-width="2"
                                       stroke-linecap="round"
                                       stroke-linejoin="round">
                                    <path d="M16 8h16l8 8v16l-8 8H16l-8-8V16z"/>
                                    <path d="M17 24h14M24 17v14"/>
                                  </svg>
                                </div>
                              `}

                              <span>
                                ${displayedItem
                                  ? displayedItem.name
                                  : group.baseName}
                              </span>
                            </button>
                          `;
                        }).join("")
                      : '<span class="equipment-empty">–</span>'
                    }
                  </div>
                `;
              }).join("")}

            </div>
          `;
        }).join("")}

      </div>
    </div>

    <div id="equipment-save-status"
      class="ffxi-save-status" role="status">Ready</div>
  `;

  container.querySelectorAll(".equipment-row-item")
  .forEach(button => {
    button.addEventListener("click", async () => {
      const jobCodes = button.dataset.jobs.split(",");
      const equipmentKey = button.dataset.equipmentKey;

      for (const jobCode of jobCodes) {
        const job = jobs.find(item => item.code === jobCode);
        if (!job) continue;

        const group = job.groups.find(
          item => item.key === equipmentKey
        );

        if (!group) continue;

        const currentValue = getEquipmentProgressValue(
          jobCode,
          selectedEquipmentOrigin,
          group
        );

        const options = [
          "none",
          ...group.items.map(item => String(item.item_id))
        ];

        const currentIndex = options.indexOf(currentValue);
        const nextValue = options[(currentIndex + 1) % options.length];

        const itemId = getEquipmentCollectionId(
          "armor",
          jobCode,
          selectedEquipmentOrigin,
          group
        );

        await saveEquipmentCollectionItem({
          itemId,
          value: nextValue,
          job: jobCode,
          origin: selectedEquipmentOrigin,
          group,
          type: "armor"
        });
      }

      renderEquipment();
    });
  });
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
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: 10px;
      min-height: 64px;
      padding: 8px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
      text-align: left;
    }
    
    .equipment-row-item:hover {
      border-color: var(--accent);
      background: var(--panel2);
    }
    
    .equipment-row-item img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      flex-shrink: 0;
    }
    
    .equipment-row-item span {
      font-size: 12px;
      overflow-wrap: anywhere;
      text-align: left;
    }

    .equipment-row-item small {
      color: var(--muted);
      font-size: 10px;
    }

    .equipment-empty {
      color: var(--muted);
      text-align: center;
    }

    .equipment-placeholder-icon {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #68778b;
      opacity: 0.65;
    }

    .equipment-placeholder-icon svg {
      width: 32px;
      height: 32px;
    }

  `;

  document.head.appendChild(style);
}
