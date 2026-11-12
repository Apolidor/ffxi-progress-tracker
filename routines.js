const ROUTINE_CATEGORIES = {
  daily: {
    title: "Daily",
    description: "Reset: täglich um 00:00 JST",
    tasks: [
      { id: "gobbie_mystery_box", name: "Gobbie Mystery Box", url: "https://www.bg-wiki.com/ffxi/Gobbie_Mystery_Box" },
      { id: "mog_garden", name: "Mog Garden", url: "https://www.bg-wiki.com/ffxi/Mog_Garden" },
      { id: "sortie", name: "Sortie", url: "https://www.bg-wiki.com/ffxi/Sortie" },
      { id: "omen", name: "Omen", url: "https://www.bg-wiki.com/ffxi/Omen" },
      { id: "dynamis_divergence_shared", name: "Dynamis-Divergence Shared", url: "https://www.bg-wiki.com/ffxi/Dynamis_-_Divergence" },
      { id: "salvage", name: "Salvage", url: "https://www.bg-wiki.com/ffxi/Salvage" }
    ]
  },

  weekly: {
    title: "Weekly",
    description: "Reset: Montag um 00:00 JST",
    tasks: [
      { id: "temenos", name: "Temenos", url: "https://www.bg-wiki.com/ffxi/Temenos" },
      { id: "apollyon", name: "Apollyon", url: "https://www.bg-wiki.com/ffxi/Apollyon" },
      { id: "sparks_exchange", name: "Sparks-Tausch", url: "https://www.bg-wiki.com/ffxi/Records_of_Eminence" },
      { id: "ambuscade_weekly", name: "Ambuscade – Weekly RoE", url: "https://www.bg-wiki.com/ffxi/Category:Ambuscade" }
    ]
  },

  monthly: {
    title: "Monthly",
    description: "Reset: zweiter Dienstag um 00:00 JST",
    tasks: [
      { id: "roe_ambuscade", name: "ROE – Ambuscade", url: "https://www.bg-wiki.com/ffxi/Records_of_Eminence" },
      { id: "roe_aman_trove", name: "ROE – AMAN Trove", url: "https://www.bg-wiki.com/ffxi/A.M.A.N._Trove" },
      { id: "roe_peculiar_foes", name: "ROE – Peculiar Foes", url: "https://www.bg-wiki.com/ffxi/Records_of_Eminence" },
      { id: "roe_monthly", name: "ROE – Monthly", url: "https://www.bg-wiki.com/ffxi/Records_of_Eminence" },
      { id: "ambuscade_reset", name: "Ambuscade-Reset", url: "https://www.bg-wiki.com/ffxi/Category:Ambuscade" },
      { id: "mars_orb", name: "Mars Orb", url: "https://www.bg-wiki.com/ffxi/AMAN_Trove" },
      { id: "login_points", name: "Login Points", url: "https://www.bg-wiki.com/ffxi/Login_Points" }
    ]
  }
};

let routineProgress = {};
let routineCharacterId = null;
let routineTimerInterval = null;

/* Japanische Zeit: UTC+9, ohne Sommerzeit. */
function getJapanTime() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

/* Wandelt einen JST-Kalendertag in einen echten UTC-Zeitpunkt um. */
function japanDateToTimestamp(year, month, day) {
  return Date.UTC(year, month, day, -9);
}

function getDailyReset(now = Date.now()) {
  const japan = new Date(now + 9 * 60 * 60 * 1000);

  return japanDateToTimestamp(
    japan.getUTCFullYear(),
    japan.getUTCMonth(),
    japan.getUTCDate()
  );
}

function getWeeklyReset(now = Date.now()) {
  const japan = getJapanTime();

  // JavaScript: Sonntag = 0, Montag = 1.
  const daysSinceMonday = (japan.getUTCDay() + 6) % 7;

  const monday = new Date(Date.UTC(
    japan.getUTCFullYear(),
    japan.getUTCMonth(),
    japan.getUTCDate() - daysSinceMonday
  ));

  return japanDateToTimestamp(
    monday.getUTCFullYear(),
    monday.getUTCMonth(),
    monday.getUTCDate()
  );
}

function getSecondTuesday(year, month) {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const firstTuesday = 1 + ((2 - firstDay.getUTCDay() + 7) % 7);

  return firstTuesday + 7;
}

function getMonthlyReset(now = Date.now()) {
  const japan = getJapanTime();

  let year = japan.getUTCFullYear();
  let month = japan.getUTCMonth();

  let resetDay = getSecondTuesday(year, month);

  let reset = japanDateToTimestamp(year, month, resetDay);

  // Falls der zweite Dienstag bereits vorbei ist,
  // beginnt der aktuelle Zeitraum am zweiten Dienstag des Vormonats.
  if (now < reset) {
    month--;

    if (month < 0) {
      month = 11;
      year--;
    }

    resetDay = getSecondTuesday(year, month);
    reset = japanDateToTimestamp(year, month, resetDay);
  }

  return reset;
}

function getNextReset(type) {
  const now = Date.now();

  if (type === "daily") {
    return getDailyReset(now) + 24 * 60 * 60 * 1000;
  }

  if (type === "weekly") {
    return getWeeklyReset(now) + 7 * 24 * 60 * 60 * 1000;
  }

  if (type === "monthly") {
    const japan = getJapanTime();

    let year = japan.getUTCFullYear();
    let month = japan.getUTCMonth();

    let reset = japanDateToTimestamp(
      year,
      month,
      getSecondTuesday(year, month)
    );

    if (now >= reset) {
      month++;

      if (month > 11) {
        month = 0;
        year++;
      }

      reset = japanDateToTimestamp(
        year,
        month,
        getSecondTuesday(year, month)
      );
    }

    return reset;
  }

  return now;
}

function getRoutinePeriodStart(type) {
  if (type === "daily") return getDailyReset();
  if (type === "weekly") return getWeeklyReset();
  if (type === "monthly") return getMonthlyReset();

  return 0;
}

function formatRoutineTimer(timestamp) {
  const remaining = Math.max(0, timestamp - Date.now());

  const seconds = Math.floor(remaining / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = value => String(value).padStart(2, "0");

  return days > 0
    ? `${days}T ${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

function isRoutineCompleted(taskId, type) {
  const entry = routineProgress[taskId];

  if (!entry || !entry.owned || !entry.updated_at) {
    return false;
  }

  const completedAt = new Date(entry.updated_at).getTime();

  return completedAt >= getRoutinePeriodStart(type);
}

function renderRoutines() {
  const container = document.getElementById("routines-content");
  if (!container) return;

  container.innerHTML = `
    <div class="routine-grid">
      ${Object.entries(ROUTINE_CATEGORIES).map(([type, category]) => `
        <div class="card routine-card">
          <div class="section-head">
            <div>
              <h2>${category.title}</h2>
              <div class="routine-reset-label">${category.description}</div>
              <div class="routine-timer" data-routine-timer="${type}"></div>
            </div>
            <span class="tag">
              ${category.tasks.filter(task => isRoutineCompleted(task.id, type)).length}
              / ${category.tasks.length}
            </span>
          </div>

          ${category.tasks.map(task => {
            const done = isRoutineCompleted(task.id, type);

            return `
              <div class="routine-item ${done ? "done" : ""}">
                <input
                  type="checkbox"
                  data-routine="${task.id}"
                  data-routine-type="${type}"
                  ${done ? "checked" : ""}
                >
                <div>
                  <a href="${task.url}" target="_blank" rel="noopener noreferrer">
                    ${task.name}
                  </a>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `).join("")}
    </div>
  `;

  updateRoutineTimers();
}

function updateRoutineTimers() {
  document.querySelectorAll("[data-routine-timer]").forEach(element => {
    const type = element.dataset.routineTimer;
    const reset = getNextReset(type);

    element.textContent = `Nächster Reset in ${formatRoutineTimer(reset)}`;
  });
}

async function loadRoutineProgress() {
  const container = document.getElementById("routines-content");
  const status = document.getElementById("routines-status");

  if (!currentUser || !activeCharacter) {
    if (container) {
      container.innerHTML =
        '<p class="empty">Bitte melde dich an und wähle einen Charakter aus.</p>';
    }
    return;
  }

  const characterId = activeCharacter.id;
  routineCharacterId = characterId;

  if (container) {
    container.innerHTML =
      '<p class="empty">Aktivitäten werden geladen ...</p>';
  }

  const { data, error } = await db
    .from("character_collection")
    .select("item_id, owned, updated_at")
    .eq("character_id", characterId)
    .eq("item_type", "routine");

  if (routineCharacterId !== characterId) return;

  if (error) {
    console.error("Routine loading failed:", error);

    if (container) {
      container.innerHTML =
        '<p class="empty">Aktivitäten konnten nicht geladen werden.</p>';
    }

    if (status) {
      status.style.display = "block";
      status.textContent = "Fehler beim Laden: " + error.message;
    }

    return;
  }

  routineProgress = {};

  (data || []).forEach(row => {
    routineProgress[row.item_id] = {
      owned: row.owned,
      updated_at: row.updated_at
    };
  });

  if (status) {
    status.style.display = "none";
  }

  renderRoutines();
}

async function saveRoutine(taskId, checked) {
  if (!currentUser || !activeCharacter) return;

  const characterId = activeCharacter.id;

  const { error } = await db
    .from("character_collection")
    .upsert({
      character_id: characterId,
      item_type: "routine",
      item_id: taskId,
      owned: checked,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "character_id,item_type,item_id"
    });

  if (error) {
    console.error("Routine saving failed:", error);

    const status = document.getElementById("routines-status");

    if (status) {
      status.style.display = "block";
      status.textContent = "Speichern fehlgeschlagen: " + error.message;
    }

    await loadRoutineProgress();
    return;
  }

  if (routineCharacterId !== characterId) return;

  routineProgress[taskId] = {
    owned: checked,
    updated_at: new Date().toISOString()
  };

  renderRoutines();
}

document.addEventListener("change", event => {
  const checkbox = event.target.closest("[data-routine]");

  if (!checkbox) return;

  saveRoutine(checkbox.dataset.routine, checkbox.checked);
});

function initRoutineTimers() {
  if (routineTimerInterval) {
    clearInterval(routineTimerInterval);
  }

  routineTimerInterval = setInterval(() => {
    if (document.getElementById("routines")?.classList.contains("active")) {
      updateRoutineTimers();
    }
  }, 1000);
}

initRoutineTimers();
