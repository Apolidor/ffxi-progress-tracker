const COALITIONS = [
  { id: "couriers", name: "Couriers' Coalition" },
  { id: "inventors", name: "Inventors' Coalition" },
  { id: "mummers", name: "Mummers' Coalition" },
  { id: "peacekeepers", name: "Peacekeepers' Coalition" },
  { id: "pioneers", name: "Pioneers' Coalition" },
  { id: "scouts", name: "Scouts' Coalition" }
];

const COALITION_RANKS = [
  "Petitioner", "Probationer", "Disciple", "Contributor",
  "Partner", "Advisor", "Magnate", "Legend"
];

// Coalition assignments required for the Golden Shovel Cordon.
// The five Couriers' Provide assignments and the final Gather assignment
// are deliberately excluded.

const COALITION_ASSIGNMENTS = {
  pioneers: [
    {
      group: "Procuring Resources",
      items: [
        "Procure: Ceizak Battlegrounds",
        "Procure: Foret de Hennetiel",
        "Procure: Morimar Basalt Fields",
        "Procure: Cirdas Caverns",
        "Procure: Marjami Ravine",
        "Procure: Yorcia Weald",
        "Procure: Kamihr Drifts",
        "Procure: Outer Ra'Kaznar"
      ]
    },
    {
      group: "Clearing the Way",
      items: [
        "Clear: Ceizak Battlegrounds",
        "Clear: Foret de Hennetiel",
        "Clear: Morimar Basalt Fields",
        "Clear: Cirdas Caverns",
        "Clear: Marjami Ravine",
        "Clear: Yorcia Weald",
        "Clear: Kamihr Drifts",
        "Clear: Outer Ra'Kaznar"
      ]
    }
  ],

  peacekeepers: [
    {
      group: "Preserve the Peace",
      items: [
        "Preserve: Ceizak Battlegrounds",
        "Preserve: Yahse Hunting Grounds",
        "Preserve: Foret de Hennetiel",
        "Preserve: Morimar Basalt Fields",
        "Preserve: Cirdas Caverns",
        "Preserve: Marjami Ravine",
        "Preserve: Yorcia Weald",
        "Preserve: Kamihr Drifts",
        "Preserve: Outer Ra'Kaznar"
      ]
    },
    {
      group: "Patrol",
      items: [
        "Patrol: Rala Waterways",
        "Patrol: Sih Gates",
        "Patrol: Moh Gates",
        "Patrol: Cirdas Caverns",
        "Patrol: Dho Gates",
        "Patrol: Woh Gates",
        "Patrol: Outer Ra'Kaznar"
      ]
    }
  ],

  couriers: [
    {
      group: "Supply Delivery",
      items: [
        "Deliver: Foret de Hennetiel",
        "Deliver: Morimar Basalt Fields",
        "Deliver: Marjami Ravine",
        "Deliver: Yorcia Weald",
        "Deliver: Kamihr Drifts"
      ]
    },
    {
      group: "Frontline Support",
      items: [
        "Support: Ceizak Battlegrounds",
        "Support: Foret de Hennetiel",
        "Support: Morimar Basalt Fields",
        "Support: Marjami Ravine",
        "Support: Yorcia Weald",
        "Support: Kamihr Drifts"
      ]
    }
  ],

  scouts: [
    {
      group: "Land Surveys",
      items: [
        "Survey: Ceizak Battlegrounds",
        "Survey: Sih Gates",
        "Survey: Foret de Hennetiel",
        "Survey: Morimar Basalt Fields",
        "Survey: Cirdas Caverns",
        "Survey: Dho Gates",
        "Survey: Marjami Ravine",
        "Survey: Yorcia Weald",
        "Survey: Kamihr Drifts"
      ]
    },
    {
      group: "Component Analyses",
      items: [
        "Analyze: Foret de Hennetiel",
        "Analyze: Morimar Basalt Fields",
        "Analyze: Cirdas Caverns",
        "Analyze: Marjami Ravine",
        "Analyze: Yorcia Weald",
        "Analyze: Kamihr Drifts",
        "Analyze: Outer Ra'Kaznar"
      ]
    }
  ],

  mummers: [
    {
      group: "Recovering Lost Articles",
      items: [
        "Recover: Ceizak Battlegrounds",
        "Recover: Foret de Hennetiel",
        "Recover: Morimar Basalt Fields",
        "Recover: Marjami Ravine",
        "Recover: Yorcia Weald",
        "Recover: Kamihr Drifts"
      ]
    },
    {
      group: "Behavioral Research",
      items: [
        "Research: Rala Waterways",
        "Research: Ceizak Battlegrounds",
        "Research: Foret de Hennetiel",
        "Research: Morimar Basalt Fields",
        "Research: Marjami Ravine",
        "Research: Yorcia Weald",
        "Research: Kamihr Drifts"
      ]
    },
    {
      group: "Morale Boosting",
      items: [
        "Boost: Foret de Hennetiel",
        "Boost: Marjami Ravine",
        "Boost: Kamihr Drifts"
      ]
    }
  ],

  inventors: [
    {
      group: "Gathering Materials",
      items: [
        "Gather: Rala Waterways",
        "Gather: Ceizak Battlegrounds",
        "Gather: Yahse Hunting Grounds",
        "Gather: Sih Gates",
        "Gather: Moh Gates",
        "Gather: Foret de Hennetiel",
        "Gather: Morimar Basalt Fields",
        "Gather: Cirdas Caverns",
        "Gather: Dho Gates",
        "Gather: Marjami Ravine",
        "Gather: Yorcia Weald",
        "Gather: Woh Gates",
        "Gather: Kamihr Drifts",
        "Gather: Outer Ra'Kaznar"
      ]
    }
  ]
};

let coalitionProgress = {};
let coalitionCharacterId = null;
let coalitionSaving = Promise.resolve();

const ADOULIN_QUESTS = [
  "Twitherym Dust",
  "To Catch a Predator",
  "Empty Nest",
  "Don't Clam Up on Me Now",
  "Hop to It",
  "Boiling Over",
  "Poisoning the Well",
  "Unsullied Lands",
  "No Rime Like the Present",
  "A Geothermal Expedition",
  "Granddaddy Dearest",
  "Wayward Waypoints",
  "One Good Turn...",
  "F.A.I.L.ure Is Not an Option",
  "Order Up",
  "Western Waypoints, Ho!",
  "Wes...Eastern Waypoints, Ho!",
  "Grind to Sawdust",
  "I'm on a Boat",
  "A Stone's Throw Away",
  "Hide and Go Peak",
  "The Whole Place Is Abuzz",
  "Orobon Appetit",
  "Talk About Wrinkly Skin",
  "Did You Feel That?",
  "Breaking the Ice",
  "Lerene's Lament",
  "No Love Lost",
  "Don't Ever Leaf Me",
  "Keep Your Bloomers On, Erisa",
  "Raptor Rapture",
  "Exotic Delicacies",
  "A Pioneer's Best (Imaginary) Friend",
  "Hunger Strikes",
  "The Old Man and the Harpoon",
  "A Certain Substitute Patrolman",
  "It Sets My Heart Aflutter",
  "Transporting",
  "The Starving",
  "Fertile Ground",
  "\"Always more,\" Quoth the Ravenous",
  "Meg-alomaniac",
  "The Longest Way Round...",
  "A Good Pair of Crocs",
  "Cafe...teria",
  "A Shot in the Dark",
  "Open the Floodgates",
  "No Laughing Matter",
  "All the Way to the Bank",
  "To Laugh Is to Love",
  "A Barrel of Laughs",
  "Vegetable Vegetable Revolution",
  "Vegetable Vegetable Evolution",
  "Vegetable Vegetable Crisis",
  "Vegetable Vegetable Frustration",
  "A Thirst for the Ages",
  "A Thirst for the Eons",
  "A Thirst for Eternity",
  "A Thirst Before Time",
  "Dances with Luopans",
  "Children of the Rune",
  "Flowers for Svenja",
  "Thorn in the Side",
  "Flavors of Our Lives",
  "It Never Goes Out of Style",
  "Water, Water, Everywhere",
  "Dirt Cheap",
  "Flower Power",
  "Do Not Go Into the Light",
  "Velkkovert Operations",
  "Hypocritical Oath",
  "The Good, the Bad, the Clement",
  "The Secret to Success",
  "Sick and Tired",
  "The Weatherspoon Inquisition",
  "Eye of the Beholder",
  "The Curious Case of Melvien",
  "No Mercy for the Wicked",
  "Mistress of Ceremonies",
  "Not-So-Clean Bill",
  "In the Land of the Blind",
  "The Weatherspoon War"
];

const MOG_GARDEN_QUESTS = [
  "Full Fields",
  "Green Groves",
  "Mining Missive",
  "Pond Probing",
  "Coastal Chaos",
  "Seed Sowing",
  "Flotsam Finding",
  "Courtesy Crustacean",
  "Trinket for the Tyrant",
  "Hypnotic Hospitality",
  "Titillating Tomes",
  "Release the Fleece",
  "Feeding Frenzy",
  "Cry Not, Caretaker",
  "Chacharoon's Cheer",
  "Trial of the Chacharoon",
  "Doctor Chacharoon",
  "Rowing Together"
];

const WILDSKEEPER_REIVES = [
  "Colkhab",
  "Tchakka",
  "Achuka",
  "Hurkan",
  "Yumcax",
  "Kumhau"
];

const REJA_REWARDS = [
  "First reward from Reja Ygridhi",
  "Second reward from Reja Ygridhi",
  "Third reward from Reja Ygridhi"
];
function adoulinEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function adoulinSlug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function adoulinCheckId(type, value, group = "") {
  return `${type}:${adoulinSlug(group)}:${adoulinSlug(value)}`;
}

function isAdoulinDone(id) {
  return coalitionProgress[id]?.done === true;
}

function getAdoulinStats(items) {
  const total = items.length;
  const completed = items.filter(item => isAdoulinDone(item.id)).length;

  return {
    total,
    completed,
    percentage: total ? (completed / total) * 100 : 0
  };
}

function renderAdoulinChecklist(title, type, items, group = "") {
  const entries = items.map(item => {
    const id = item.id || adoulinCheckId(type, item, group);
    const checked = isAdoulinDone(id);

    return {
      id,
      name: typeof item === "string" ? item : item.name,
      checked
    };
  });

  const stats = getAdoulinStats(entries);

  return `
    <details class="adoulin-section">
      <summary class="adoulin-section-summary">
        <span>
          <strong>${adoulinEscape(title)}</strong>
          <small>${stats.completed} / ${stats.total} abgeschlossen</small>
        </span>
        <span class="tag">${Math.round(stats.percentage)}%</span>
      </summary>

      <div class="adoulin-checklist">
        ${entries.map(entry => `
          <label class="adoulin-check">
            <input
              type="checkbox"
              data-adoulin-id="${adoulinEscape(entry.id)}"
              ${entry.checked ? "checked" : ""}
            >
            <span>${adoulinEscape(entry.name)}</span>
          </label>
        `).join("")}
      </div>
    </details>
  `;
}

function renderCoalitionRanks() {
  return `
    <div class="coalition-grid">
      ${COALITIONS.map(coalition => {
        const saved = coalitionProgress[coalition.id];
        const rank = saved?.rank ?? 0;
        const percentage = (rank / 7) * 100;
        const isLegend = rank === 7;

        return `
          <div class="card coalition-card ${isLegend ? "legend" : ""}">
            <div class="coalition-card-top">
              <h2>${adoulinEscape(coalition.name)}</h2>
              <span class="tag">${rank} / 7</span>
            </div>

            <div class="coalition-track">
              <div
                class="coalition-fill"
                style="width: ${percentage}%"
              ></div>
            </div>

            <select
              data-coalition="${coalition.id}"
              class="coalition-select"
            >
              ${COALITION_RANKS.map((name, index) => `
                <option
                  value="${index}"
                  ${rank === index ? "selected" : ""}
                >
                  ${name}
                </option>
              `).join("")}
            </select>

            ${isLegend
              ? '<div class="coalition-legend-label">★ COALITION LEGEND ★</div>'
              : ""}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderCoalitionAssignments() {
  return Object.entries(COALITION_ASSIGNMENTS).map(([coalitionId, groups]) => {
    const coalition = COALITIONS.find(item => item.id === coalitionId);

    const groupHtml = groups.map(group => {
      const items = group.items.map(name => ({
        id: adoulinCheckId("assignment", name, coalitionId),
        name
      }));

      return renderAdoulinChecklist(
        group.group,
        "assignment",
        items
      );
    }).join("");

    return `
      <details class="adoulin-group-card">
        <summary class="adoulin-section-summary">
          <strong>${adoulinEscape(coalition?.name || coalitionId)}</strong>
        </summary>
        <div class="adoulin-nested">
          ${groupHtml}
        </div>
      </details>
    `;
  }).join("");
}

function renderAdoulinOverview() {
  const allItems = [];

  Object.entries(COALITION_ASSIGNMENTS).forEach(([coalitionId, groups]) => {
    groups.forEach(group => {
      group.items.forEach(name => {
        allItems.push({
          id: adoulinCheckId("assignment", name, coalitionId),
          name
        });
      });
    });
  });

  ADOULIN_QUESTS.forEach(name => {
    allItems.push({
      id: adoulinCheckId("quest", name),
      name
    });
  });

  MOG_GARDEN_QUESTS.forEach(name => {
    allItems.push({
      id: adoulinCheckId("mog", name),
      name
    });
  });

  WILDSKEEPER_REIVES.forEach(name => {
    allItems.push({
      id: adoulinCheckId("wildskeeper", name),
      name
    });
  });

  REJA_REWARDS.forEach(name => {
    allItems.push({
      id: adoulinCheckId("reja", name),
      name
    });
  });

  return getAdoulinStats(allItems);
}

function renderCoalitions() {
  const container = document.getElementById("coalitions-content");
  if (!container) return;

  const stats = renderAdoulinOverview();

  container.innerHTML = `
    <div class="card adoulin-overview">
      <h2>Golden Shovel Cordon</h2>

      <div class="coalition-track adoulin-main-track">
        <div
          class="coalition-fill"
          style="width: ${stats.percentage}%"
        ></div>
      </div>

      <strong>${stats.completed} / ${stats.total} Aufgaben abgeschlossen</strong>
      <span class="tag">${Math.round(stats.percentage)}%</span>
    </div>

    <h2 class="adoulin-heading">Coalition-Ränge</h2>
    ${renderCoalitionRanks()}

    <h2 class="adoulin-heading">Coalition Assignments</h2>
    ${renderCoalitionAssignments()}

    <h2 class="adoulin-heading">Wildskeeper Reives</h2>
    ${renderAdoulinChecklist(
      "Naakuals",
      "wildskeeper",
      WILDSKEEPER_REIVES
    )}

    <h2 class="adoulin-heading">Adoulin-Quests</h2>
    ${renderAdoulinChecklist(
      "Quest-Fortschritt",
      "quest",
      ADOULIN_QUESTS
    )}

    <h2 class="adoulin-heading">Mog Garden</h2>
    ${renderAdoulinChecklist(
      "Mog-Garden-Quests",
      "mog",
      MOG_GARDEN_QUESTS
    )}

    <h2 class="adoulin-heading">Reja Ygridhi</h2>
    ${renderAdoulinChecklist(
      "Belohnungen",
      "reja",
      REJA_REWARDS
    )}
  `;
}
async function loadCoalitionProgress() {
  const container = document.getElementById("coalitions-content");
  const status = document.getElementById("coalitions-status");

  if (!currentUser || !activeCharacter) {
    if (container) {
      container.innerHTML =
        '<p class="empty">Bitte melde dich an und wähle einen Charakter aus.</p>';
    }
    return;
  }

  const characterId = activeCharacter.id;
  coalitionCharacterId = characterId;

  if (container) {
    container.innerHTML =
      '<p class="empty">Adoulin-Fortschritt wird geladen ...</p>';
  }

  const { data, error } = await db
    .from("character_collection")
    .select("item_id, progress, owned")
    .eq("character_id", characterId)
    .eq("item_type", "coalition");

  if (coalitionCharacterId !== characterId) return;

  if (error) {
    console.error("Adoulin loading failed:", error);

    if (container) {
      container.innerHTML =
        '<p class="empty">Adoulin-Fortschritt konnte nicht geladen werden.</p>';
    }

    if (status) {
      status.style.display = "block";
      status.textContent = "Fehler beim Laden: " + error.message;
    }

    return;
  }

  coalitionProgress = {};

  (data || []).forEach(row => {
    const progress = row.progress || {};

    // Coalition rank entries
    if (COALITIONS.some(item => item.id === row.item_id)) {
      const rank = Number(progress.rank ?? 0);

      coalitionProgress[row.item_id] = {
        rank: Math.max(0, Math.min(7, rank))
      };

      return;
    }

    // Checklist entries
    coalitionProgress[row.item_id] = {
      done: progress.done === true || row.owned === true
    };
  });

  if (status) {
    status.style.display = "none";
  }

  renderCoalitions();
}

async function saveAdoulinEntry(itemId, done) {
  if (!currentUser || !activeCharacter) return;

  const characterId = activeCharacter.id;

  coalitionSaving = coalitionSaving.then(async () => {
    if (coalitionCharacterId !== characterId) return;

    const { error } = await db
      .from("character_collection")
      .upsert({
        character_id: characterId,
        item_type: "coalition",
        item_id: itemId,
        owned: done,
        progress: {
          done: done
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: "character_id,item_type,item_id"
      });

    if (coalitionCharacterId !== characterId) return;

    if (error) {
      console.error("Adoulin saving failed:", error);

      const status = document.getElementById("coalitions-status");

      if (status) {
        status.style.display = "block";
        status.textContent = "Speichern fehlgeschlagen: " + error.message;
      }

      await loadCoalitionProgress();
      return;
    }

    coalitionProgress[itemId] = {
      done: done
    };

    const status = document.getElementById("coalitions-status");

    if (status) {
      status.style.display = "none";
    }

    renderCoalitions();
  });

  await coalitionSaving;
}

async function saveCoalitionRank(coalitionId, rank) {
  if (!currentUser || !activeCharacter) return;

  const characterId = activeCharacter.id;
  const numericRank = Math.max(0, Math.min(7, Number(rank)));

  const { error } = await db
    .from("character_collection")
    .upsert({
      character_id: characterId,
      item_type: "coalition",
      item_id: coalitionId,
      owned: numericRank === 7,
      progress: {
        rank: numericRank
      },
      updated_at: new Date().toISOString()
    }, {
      onConflict: "character_id,item_type,item_id"
    });

  if (coalitionCharacterId !== characterId) return;

  if (error) {
    console.error("Coalition saving failed:", error);

    const status = document.getElementById("coalitions-status");

    if (status) {
      status.style.display = "block";
      status.textContent = "Speichern fehlgeschlagen: " + error.message;
    }

    await loadCoalitionProgress();
    return;
  }

  coalitionProgress[coalitionId] = {
    rank: numericRank
  };

  const status = document.getElementById("coalitions-status");

  if (status) {
    status.style.display = "none";
  }

  renderCoalitions();
}

// Event handling
document.addEventListener("change", event => {
  const select = event.target.closest("[data-coalition]");

  if (select) {
    saveCoalitionRank(
      select.dataset.coalition,
      select.value
    );

    return;
  }

  const checkbox = event.target.closest("[data-adoulin-id]");

  if (checkbox) {
    saveAdoulinEntry(
      checkbox.dataset.adoulinId,
      checkbox.checked
    );
  }
});
