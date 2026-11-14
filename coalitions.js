
const COALITIONS = [
  { id: "couriers", name: "Couriers' Coalition" },
  { id: "inventors", name: "Inventors' Coalition" },
  { id: "mummers", name: "Mummers' Coalition" },
  { id: "peacekeepers", name: "Peacekeepers' Coalition" },
  { id: "pioneers", name: "Pioneers' Coalition" },
  { id: "scouts", name: "Scouts' Coalition" }
];

const COALITION_RANKS = [
  "Petitioner",
  "Probationer",
  "Disciple",
  "Contributor",
  "Partner",
  "Advisor",
  "Magnate",
  "Legend"
];

let coalitionProgress = {};
let coalitionCharacterId = null;

function renderCoalitions() {
  const container = document.getElementById("coalitions-content");
  if (!container) return;

  container.innerHTML = `
    <div class="coalition-grid">
      ${COALITIONS.map(coalition => {
        const saved = coalitionProgress[coalition.id];
        const rank = saved?.rank ?? 0;
        const percentage = (rank / 7) * 100;
        const isLegend = rank === 7;

        return `
          <div class="card coalition-card ${isLegend ? "legend" : ""}">
            <div class="coalition-card-top">
              <div>
                <h2>${coalition.name}</h2>
              </div>
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
      '<p class="empty">Coalition-Fortschritt wird geladen ...</p>';
  }

  const { data, error } = await db
    .from("character_collection")
    .select("item_id, progress")
    .eq("character_id", characterId)
    .eq("item_type", "coalition");

  if (coalitionCharacterId !== characterId) return;

  if (error) {
    console.error("Coalition loading failed:", error);

    if (container) {
      container.innerHTML =
        '<p class="empty">Coalition-Fortschritt konnte nicht geladen werden.</p>';
    }

    if (status) {
      status.style.display = "block";
      status.textContent = "Fehler beim Laden: " + error.message;
    }

    return;
  }

  coalitionProgress = {};

  (data || []).forEach(row => {
    const rank = Number(row.progress?.rank ?? 0);

    coalitionProgress[row.item_id] = {
      rank: Math.max(0, Math.min(7, rank))
    };
  });

  if (status) {
    status.style.display = "none";
  }

  renderCoalitions();
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

document.addEventListener("change", event => {
  const select = event.target.closest("[data-coalition]");

  if (!select) return;

  saveCoalitionRank(
    select.dataset.coalition,
    select.value
  );
});
