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
        .select("item_id, name, itemslot, weapon_type, item_level, jobs, stats, set, ffxi_url")
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

  const armorSlots = ["head", "body", "hands", "legs", "feet"];

  return [...new Set(
    equipmentItemsCache
      .filter(item =>
        armorSlots.includes(String(item.itemslot || "").toLowerCase())
      )
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


let selectedWeaponSet = null;

const WEAPON_SLOT_IDS = ["main", "sub", "range", "ammo"];

function getWeaponSets() {
  if (!equipmentItemsCache) return [];

  const weaponItems = equipmentItemsCache.filter(item =>
    WEAPON_SLOT_IDS.includes(
      String(item.itemslot || "").toLowerCase()
    )
  );

  const sets = [
    ...new Set(
      weaponItems
        .map(item => String(item.set || "").trim())
        .filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));

  const result = sets.map(set => ({
    value: set,
    label: set
  }));

  return result;
}

function populateWeaponsSubmenu() {
  const submenu = document.getElementById("weapons-submenu");
  if (!submenu) return;

  const sets = getWeaponSets();

  if (!sets.some(set => set.value === selectedWeaponSet)) {
    selectedWeaponSet = sets.length ? sets[0].value : null;
  }

  submenu.innerHTML = "";

  sets.forEach(set => {
    const button = document.createElement("button");

    button.type = "button";
    button.dataset.weaponSet = set.value;
    button.textContent = set.label;

    if (selectedWeaponSet === set.value) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      selectedWeaponSet = set.value;

      submenu.classList.add("open");

      populateWeaponsSubmenu();
      showPage("weapons");
      renderWeapons();
    });

    submenu.appendChild(button);
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

let weaponCollectionCategory = "all";
let weaponCollectionOwned = {};
let weaponCollectionCharacterId = null;

async function loadWeaponCollection() {
  if (!activeCharacter) return;

  const characterId = activeCharacter.id;

  const { data, error } = await db
    .from("character_collection")
    .select("item_id, owned")
    .eq("character_id", characterId)
    .eq("item_type", "equipment");

  if (error) throw error;

  if (activeCharacter?.id !== characterId) return;

  weaponCollectionOwned = {};

  (data || []).forEach(item => {
    weaponCollectionOwned[String(item.item_id)] = Boolean(item.owned);
  });

  weaponCollectionCharacterId = characterId;
}

function isWeaponOwned(itemId) {
  return weaponCollectionOwned[String(itemId)] === true;
}

async function toggleWeaponOwned(itemId) {
  if (!activeCharacter || !currentUser) return;

  const characterId = activeCharacter.id;
  const key = String(itemId);
  const nextOwned = !isWeaponOwned(key);

  const button = document.querySelector(
    `[data-weapon-id="${CSS.escape(key)}"]`
  );

  if (button) button.disabled = true;

  const { error } = await db
    .from("character_collection")
    .upsert({
      character_id: characterId,
      item_type: "equipment",
      item_id: key,
      owned: nextOwned,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "character_id,item_type,item_id"
    });

  if (error) {
    alert("Weapon could not be saved: " + error.message);
    if (button) button.disabled = false;
    return;
  }

  if (activeCharacter?.id !== characterId) return;

  weaponCollectionOwned[key] = nextOwned;
  renderWeapons();
}

function injectWeaponStyles() {
  if (document.getElementById("ffxi-weapon-styles")) return;

  const style = document.createElement("style");
  style.id = "ffxi-weapon-styles";

  style.textContent = `
    #weapon-list .collection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 14px;
    }

    #weapon-list .weapon-card {
      padding: 14px;
      min-height: 190px;
    }

    #weapon-list .weapon-card-image {
      min-height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #weapon-list .weapon-card-image img {
      width: 88px;
      height: 88px;
      object-fit: contain;
    }
  `;

  document.head.appendChild(style);
}

function renderWeapons() {
  injectWeaponStyles();
  const container = document.getElementById("weapon-list");
  if (!container || !activeCharacter) return;

  if (equipmentItemsCache === null) {
    container.innerHTML = "<p>Loading weapons...</p>";
    loadEquipmentItems().then(renderWeapons);
    return;
  }

  const selectedSet = getWeaponSets().find(
    set => set.value === selectedWeaponSet
  );

  if (!selectedSet) {
    container.innerHTML = "<p>No weapon sets found.</p>";
    return;
  }

  if (weaponCollectionCharacterId !== activeCharacter.id) {
    container.innerHTML = "<p>Loading weapon collection...</p>";

    loadWeaponCollection()
      .then(renderWeapons)
      .catch(error => {
        console.error(error);
        container.innerHTML = `<p>Error: ${escapeCollectionText(error.message)}</p>`;
      });

    return;
  }

  const items = equipmentItemsCache.filter(item =>
    WEAPON_SLOT_IDS.includes(
      String(item.itemslot || "").toLowerCase()
    ) &&
    String(item.set || "").trim() === selectedWeaponSet
  );

  // Waffen mit gleichem Namen und Slot zusammenfassen
  const weaponGroups = new Map();
  
  items.forEach(item => {
    const slot = String(item.itemslot || "").toLowerCase();
    const name = String(item.name || "").trim();
    const key = `${slot}::${name.toLowerCase()}`;
  
    if (!weaponGroups.has(key)) {
      weaponGroups.set(key, []);
    }
  
    weaponGroups.get(key).push(item);
  });
  
  const displayedItems = [...weaponGroups.entries()].map(([key, variants]) => ({
    ...variants[0],
    variants,
    collectionId: `weapon:${selectedWeaponSet}:${key}`
  }));
  
  const filteredItems = displayedItems;

  const ownedCount = displayedItems.filter(item =>
    isWeaponOwned(item.collectionId)
  ).length;
  
  const totalCount = displayedItems.length;

  const title = document.querySelector("#weapons h1");
  if (title) title.textContent = selectedSet.label;

  container.innerHTML = `
    <div class="collection-summary">
      <strong>${ownedCount} / ${totalCount}</strong>
      <span>Weapons collected</span>

      <div class="track">
        <div class="fill" style="width:${
          items.length ? ownedCount / items.length * 100 : 0
        }%"></div>
      </div>
    </div>

    <div class="collection-grid">
      ${filteredItems.map(item => {
        const owned = isWeaponOwned(item.collectionId);

        return `
          <button type="button"
            class="collection-item weapon-card ${owned ? "owned" : "not-owned"}"
            data-weapon-id="${escapeCollectionText(item.collectionId)}"
            title="${escapeCollectionText(item.name)}">

            <div class="collection-image weapon-card-image">
              <a
                href="${escapeCollectionText(item.ffxi_url || "#")}"
                target="_blank"
                rel="noopener noreferrer"
                onclick="event.stopPropagation(); if (this.getAttribute('href') === '#') event.preventDefault()">

                <img
                  src="https://static.ffxiah.com/images/icon/${item.item_id}.png"
                  alt="${escapeCollectionText(item.name)}"
                  loading="lazy"
                  onerror="this.style.display='none'">
              </a>
            </div>

            <strong>${escapeCollectionText(item.name)}</strong>

            <span class="collection-status">
              ${owned ? "✓ Obtained" : "Not obtained"}
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  container.querySelectorAll("[data-weapon-id]").forEach(button => {
    button.addEventListener("click", () => {
      toggleWeaponOwned(button.dataset.weaponId);
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
      ["head", "body", "hands", "legs", "feet"].includes(
        String(item.itemslot || "").toLowerCase()
      ) &&
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
  
      if (!groups[key].items.some(existing =>
        String(existing.item_id) === String(item.item_id)
      )) {
        groups[key].items.push(item);
      }
    });
  
    // Upgrade-Stufen in die richtige Reihenfolge bringen
    function getStageOrder(item) {
      const stage = getEquipmentStage(item);
  
      const order = {
        "109": 0,
        "119": 1,
        "119+1": 2,
        "119+2": 3,
        "119+3": 4,
        "119+4": 5
      };
  
      return order[stage] ?? 99;
    }
  
    return Object.values(groups)
      .map(group => {
        group.items.sort((a, b) =>
          getStageOrder(a) - getStageOrder(b) ||
          Number(a.item_id) - Number(b.item_id)
        );
  
        return group;
      })
      .sort((a, b) => {
        const slotA = EQUIPMENT_SLOTS.findIndex(
          slot => slot.id === a.slotId
        );
        const slotB = EQUIPMENT_SLOTS.findIndex(
          slot => slot.id === b.slotId
        );
  
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
                                  href="${displayedItem.ffxi_url || '#'}"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onclick="event.preventDefault(); event.stopPropagation(); if (this.getAttribute('href') !== '#') window.open(this.href, '_blank', 'noopener,noreferrer')"
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
        
        // Doppelte Item-IDs entfernen
        const uniqueOptions = [...new Set(options)];

        const currentIndex = uniqueOptions.indexOf(currentValue);
        const nextValue = uniqueOptions[
          (currentIndex + 1) % uniqueOptions.length
        ];

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

function initGoalsNavigation() {
  const toggle = document.getElementById("goals-menu-toggle");
  const submenu = document.getElementById("goals-submenu");
  const arrow = document.getElementById("goals-menu-arrow");

  if (!toggle || !submenu || toggle.dataset.initialized) return;

  toggle.dataset.initialized = "true";

  toggle.addEventListener("click", () => {
    submenu.classList.toggle("open");

    if (arrow) {
      arrow.textContent = submenu.classList.contains("open") ? "▴" : "▾";
    }
  });
}

initGoalsNavigation();

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

