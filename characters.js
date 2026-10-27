
const raceNames = {
  hume: "Hume",
  elvaan: "Elvaan",
  tarutaru: "Tarutaru",
  mithra: "Mithra",
  galka: "Galka"
};

const raceSymbols = {
  hume: "♙",
  elvaan: "⚔",
  tarutaru: "✦",
  mithra: "🐾",
  galka: "🛡"
};

// All 22 Final Fantasy XI jobs.
const FFXI_JOBS = [
  { code: "WAR", name: "Warrior", icon: "⚔" },
  { code: "MNK", name: "Monk", icon: "✊" },
  { code: "WHM", name: "White Mage", icon: "✧" },
  { code: "BLM", name: "Black Mage", icon: "✦" },
  { code: "RDM", name: "Red Mage", icon: "♦" },
  { code: "THF", name: "Thief", icon: "🗡" },
  { code: "PLD", name: "Paladin", icon: "🛡" },
  { code: "DRK", name: "Dark Knight", icon: "☠" },
  { code: "BST", name: "Beastmaster", icon: "🐾" },
  { code: "BRD", name: "Bard", icon: "♫" },
  { code: "RNG", name: "Ranger", icon: "◎" },
  { code: "SAM", name: "Samurai", icon: "刀" },
  { code: "NIN", name: "Ninja", icon: "忍" },
  { code: "DRG", name: "Dragoon", icon: "🐉" },
  { code: "SMN", name: "Summoner", icon: "✧" },
  { code: "BLU", name: "Blue Mage", icon: "✦" },
  { code: "COR", name: "Corsair", icon: "♠" },
  { code: "PUP", name: "Puppetmaster", icon: "⚙" },
  { code: "DNC", name: "Dancer", icon: "♪" },
  { code: "SCH", name: "Scholar", icon: "▤" },
  { code: "GEO", name: "Geomancer", icon: "◉" },
  { code: "RUN", name: "Rune Fencer", icon: "ᚱ" }
];

let characters = [];
let activeCharacter = null;
let jobSaveTimer = null;

function defaultJobProgress() {
  const result = {};

  FFXI_JOBS.forEach(job => {
    result[job.code] = {
      level: 1,
      jp: 0,
      masterLevel: 0
    };
  });

  return result;
}

function normalizeJobProgress(savedJobs) {
  const result = defaultJobProgress();

  if (
    !savedJobs ||
    typeof savedJobs !== "object" ||
    Array.isArray(savedJobs)
  ) {
    return result;
  }

  FFXI_JOBS.forEach(job => {
    const saved = savedJobs[job.code];
    if (!saved || typeof saved !== "object") return;

    result[job.code] = {
      level: clampNumber(saved.level, 1, 99, 1),
      jp: clampNumber(saved.jp, 0, 2100, 0),
      masterLevel: clampNumber(saved.masterLevel, 0, 50, 0)
    };
  });

  return result;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;

  return Math.min(max, Math.max(min, Math.round(number)));
}

async function initCharacters() {
  if (!currentUser) return;

  const { data, error } = await db
    .from("characters")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at");

  if (error) {
    alert("Characters could not be loaded: " + error.message);
    return;
  }

  characters = (data || []).map(character => ({
    ...character,
    jobs: normalizeJobProgress(character.jobs),
  equipment: normalizeEquipmentProgress(character.equipment)
  }));

  const savedId = localStorage.getItem(
    "ffxi_active_character_" + currentUser.id
  );

  activeCharacter =
    characters.find(character => character.id === savedId) ||
    characters[0] ||
    null;

  renderCharacterManager();

  if (!activeCharacter) {
    openCharacterManager(true);
  } else {
    selectCharacter(activeCharacter.id);
  }
}

function openCharacterManager(force = false) {
  let modal = document.getElementById("character-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "character-modal";

    Object.assign(modal.style, {
      position: "fixed",
      inset: "0",
      zIndex: "10000",
      background: "#0c1018ee",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      overflowY: "auto"
    });

    document.body.appendChild(modal);
  }

  modal.style.display = "flex";
  modal.innerHTML = `
    <div style="width:100%;max-width:560px;background:#141b27;
      border:1px solid #293447;border-radius:16px;padding:24px;
      color:#eef3fa;margin:auto">
      <h2>Your Characters</h2>
      <p>Select a character or create a new one.</p>
      <div id="character-list"></div>
      <hr style="border-color:#293447;margin:22px 0">
      <h3>Create a new character</h3>

      <form id="character-form">
        <label for="character-name">Character name</label>
        <input id="character-name" required maxlength="50"
          placeholder="Name in Vana'diel"
          style="display:block;width:100%;padding:11px;margin:7px 0 15px;
          background:#0c1018;color:white;border:1px solid #293447;
          border-radius:8px">

        <label for="character-race">Race</label>
        <select id="character-race" style="display:block;width:100%;
          padding:11px;margin:7px 0 15px;background:#0c1018;color:white;
          border:1px solid #293447;border-radius:8px">
          <option value="hume">Hume</option>
          <option value="elvaan">Elvaan</option>
          <option value="tarutaru">Tarutaru</option>
          <option value="mithra">Mithra</option>
          <option value="galka">Galka</option>
        </select>

        <label for="character-gender">Gender</label>
        <select id="character-gender" style="display:block;width:100%;
          padding:11px;margin:7px 0 15px;background:#0c1018;color:white;
          border:1px solid #293447;border-radius:8px">
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

        <div id="avatar-preview" style="font-size:42px;text-align:center;
          padding:12px"></div>

        <button type="submit" class="action"
          style="width:100%;padding:12px">Create character</button>
        <p id="character-message" role="status"></p>
      </form>

      <button id="character-close" class="action"
        style="width:100%;margin-top:10px">Back to tracker</button>
    </div>
  `;

  const race = document.getElementById("character-race");
  const gender = document.getElementById("character-gender");

  function updateAvatar() {
    if (race.value === "mithra") gender.value = "female";
    if (race.value === "galka") gender.value = "male";

    document.getElementById("avatar-preview").textContent =
      raceSymbols[race.value];
  }

  race.addEventListener("change", updateAvatar);
  gender.addEventListener("change", updateAvatar);
  updateAvatar();

  document.getElementById("character-form").addEventListener(
    "submit",
    createCharacter
  );

  document.getElementById("character-close").onclick = () => {
    if (activeCharacter || !force) {
      modal.style.display = "none";
    }
  };

  renderCharacterManager();
}

async function createCharacter(event) {
  event.preventDefault();

  if (!currentUser) return;

  const name = document.getElementById("character-name").value.trim();
  const race = document.getElementById("character-race").value;
  const gender = document.getElementById("character-gender").value;
  const message = document.getElementById("character-message");

  if (!name) {
    message.textContent = "Enter a character name.";
    return;
  }

  message.textContent = "Saving character…";

  const { data, error } = await db
    .from("characters")
    .insert({
      user_id: currentUser.id,
      name,
      race,
      gender,
      avatar_key: `${race}_${gender}`,
      jobs: defaultJobProgress(),
      equipment: defaultEquipmentProgress()
    })
    .select()
    .single();

  if (error) {
    message.textContent = "Error: " + error.message;
    return;
  }

  const character = {
    ...data,
    jobs: normalizeJobProgress(data.jobs),
  equipment: normalizeEquipmentProgress(data.equipment)
  };

  characters.push(character);
  selectCharacter(character.id);
  renderCharacterManager();

  document.getElementById("character-modal").style.display = "none";
}

function selectCharacter(id) {
  activeCharacter = characters.find(character => character.id === id);
  if (!activeCharacter) return;

  activeCharacter.jobs = normalizeJobProgress(activeCharacter.jobs);

  localStorage.setItem(
    "ffxi_active_character_" + currentUser.id,
    activeCharacter.id
  );

  const profile = document.querySelector(".profile span");
  if (profile) profile.textContent = activeCharacter.name;

  const avatar = document.querySelector(".profile .avatar");

  if (avatar) {
    avatar.textContent = raceSymbols[activeCharacter.race] || "✦";
    avatar.title =
      raceNames[activeCharacter.race] + " · " +
      (activeCharacter.gender === "male" ? "Male" : "Female");
  }

  const title = document.querySelector("#dashboard h1");
  if (title) title.textContent = activeCharacter.name;

  document.querySelectorAll(".character-selected").forEach(element => {
    element.classList.remove("character-selected");
  });

  const selected = document.querySelector(
    `[data-character-id="${id}"]`
  );

  if (selected) selected.classList.add("character-selected");

  renderCharacterJobs();
  renderEquipment();
}

function renderCharacterManager() {
  const list = document.getElementById("character-list");
  if (!list) return;

  list.innerHTML = characters.map(character => `
    <button type="button" data-character-id="${character.id}"
      class="action ${activeCharacter?.id === character.id ? "character-selected" : ""}"
      style="display:flex;align-items:center;gap:12px;width:100%;
      padding:12px;margin:8px 0;text-align:left">
      <span style="font-size:26px">
        ${raceSymbols[character.race] || "✦"}
      </span>
      <span>
        <strong>${escapeCharacterText(character.name)}</strong><br>
        <small>${raceNames[character.race] || character.race} ·
          ${character.gender === "male" ? "Male" : "Female"}</small>
      </span>
      <span style="margin-left:auto">
        ${activeCharacter?.id === character.id ? "✓ Active" : "Select"}
      </span>
    </button>
  `).join("");

  list.querySelectorAll("[data-character-id]").forEach(button => {
    button.addEventListener("click", () => {
      selectCharacter(button.dataset.characterId);
      document.getElementById("character-modal").style.display = "none";
    });
  });

  const profile = document.querySelector(".profile");

  if (profile && !document.getElementById("manage-characters")) {
    const button = document.createElement("button");
    button.id = "manage-characters";
    button.className = "action";
    button.textContent = "Characters";
    button.onclick = () => openCharacterManager();
    profile.appendChild(button);
  }
}

function escapeCharacterText(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function injectJobStyles() {
  if (document.getElementById("ffxi-job-styles")) return;

  const style = document.createElement("style");
  style.id = "ffxi-job-styles";

  style.textContent = `
    .ffxi-jobs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
    }

    .ffxi-job-card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 15px;
      min-width: 0;
    }

    .ffxi-job-card-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 13px;
    }

    .ffxi-job-card-icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      flex-shrink: 0;
      background: var(--panel2);
      border-radius: 10px;
      font-size: 20px;
    }

    .ffxi-job-card-head small {
      color: var(--muted);
    }

    .ffxi-job-fields {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 9px;
    }

    .ffxi-job-fields label {
      display: block;
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 5px;
    }

    .ffxi-job-fields input {
      width: 100%;
      min-width: 0;
      padding: 8px;
      color: var(--text);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 7px;
    }

    .ffxi-job-fields input:focus {
      outline: 1px solid var(--accent);
    }

    .ffxi-job-progress {
      height: 5px;
      background: var(--border);
      border-radius: 9px;
      overflow: hidden;
      margin-top: 12px;
    }

    .ffxi-job-progress > div {
      height: 100%;
      background: var(--accent);
      transition: width .15s;
    }

    .ffxi-job-stars {
      color: var(--gold);
      font-size: 13px;
      min-height: 19px;
      margin-top: 7px;
    }

    .ffxi-save-status {
      color: var(--muted);
      font-size: 12px;
      margin-top: 12px;
    }

    .ffxi-dashboard-jobs {
      display: grid;
      gap: 8px;
    }

    .ffxi-dashboard-job {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
    }

    .ffxi-dashboard-job:last-child {
      border-bottom: 0;
    }

    .ffxi-dashboard-job .track {
      flex: 1;
      min-width: 35px;
    }

    @media (max-width: 500px) {
      .ffxi-job-fields {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `;

  document.head.appendChild(style);
}

function renderCharacterJobs() {
  if (!activeCharacter) return;

  injectJobStyles();

  const jobs = normalizeJobProgress(activeCharacter.jobs);
  activeCharacter.jobs = jobs;

  const allJobs = document.getElementById("all-jobs");

  if (allJobs) {
    allJobs.innerHTML = `
      <p>Enter each job's level, Job Points (JP), and Master Level (ML).
      Changes are saved to this character's online profile.</p>

      <div class="ffxi-jobs-grid">
        ${FFXI_JOBS.map(job =>
          renderJobCard(job, jobs[job.code])
        ).join("")}
      </div>

      <div id="job-save-status" class="ffxi-save-status" role="status">
        Ready
      </div>
    `;

    allJobs.querySelectorAll("[data-job-code]").forEach(input => {
      input.addEventListener("change", handleJobInput);
      input.addEventListener("input", updateJobCardPreview);
    });
  }

  const dashboardJobs = document.getElementById("job-list");

  if (dashboardJobs) {
    const selectedJobs = FFXI_JOBS
      .filter(job => {
        const progress = jobs[job.code];

        return progress.level > 1 ||
          progress.jp > 0 ||
          progress.masterLevel > 0;
      })
      .sort((a, b) => {
        const pa = jobs[a.code];
        const pb = jobs[b.code];

        return (pb.level + pb.masterLevel) -
          (pa.level + pa.masterLevel);
      })
      .slice(0, 5);

    dashboardJobs.innerHTML = selectedJobs.length
      ? `<div class="ffxi-dashboard-jobs">
          ${selectedJobs.map(job => {
            const progress = jobs[job.code];

            return `
              <div class="ffxi-dashboard-job">
                <strong style="width:38px">${job.code}</strong>

                <div style="flex:1;min-width:0">
                  <div style="display:flex;justify-content:space-between;gap:8px">
                    <span>${job.name}</span>
                    <strong>Lv. ${progress.level}</strong>
                  </div>

                  <div class="track">
                    <div class="fill"
                      style="width:${progress.level / 99 * 100}%"></div>
                  </div>

                  <div class="job-meta">
                    JP ${progress.jp}/2100 · ML ${progress.masterLevel}
                  </div>
                </div>
              </div>
            `;
          }).join("")}
        </div>`
      : `<div class="empty">
          Set your job levels in Jobs &amp; Level to see progress here.
        </div>`;
  }

  const jobTag = document.querySelector(
    "#jobs .section-head .tag"
  );

  if (jobTag) jobTag.textContent = "22 Jobs";

  const dashboardTag = document.querySelector(
    "#dashboard #job-list"
  )?.parentElement?.querySelector(".section-head .tag");

  if (dashboardTag) dashboardTag.textContent = "Your progress";
}

function renderJobCard(job, progress) {
  const mastered = progress.jp >= 2100;

  return `
    <div class="ffxi-job-card" data-job-card="${job.code}">
      <div class="ffxi-job-card-head">
        <div class="ffxi-job-card-icon">${job.icon}</div>
        <div>
          <h3>${job.name}</h3>
          <small>${job.code}</small>
        </div>
      </div>

      <div class="ffxi-job-fields">
        <div>
          <label for="job-${job.code}-level">Level (1–99)</label>
          <input id="job-${job.code}-level"
            data-job-code="${job.code}"
            data-job-field="level"
            type="number" min="1" max="99" step="1"
            value="${progress.level}">
        </div>

        <div>
          <label for="job-${job.code}-jp">Job Points (0–2100)</label>
          <input id="job-${job.code}-jp"
            data-job-code="${job.code}"
            data-job-field="jp"
            type="number" min="0" max="2100" step="1"
            value="${progress.jp}">
        </div>

        <div>
          <label for="job-${job.code}-ml">Master Level (0–50)</label>
          <input id="job-${job.code}-ml"
            data-job-code="${job.code}"
            data-job-field="masterLevel"
            type="number" min="0" max="50" step="1"
            value="${progress.masterLevel}">
        </div>
      </div>

      <div class="ffxi-job-progress">
        <div style="width:${progress.jp / 2100 * 100}%"></div>
      </div>

      <div class="ffxi-job-stars" data-stars="${job.code}">
        ${mastered ? "★★★ Job Master" : `${progress.jp} / 2100 JP`}
      </div>
    </div>
  `;
}

function updateJobCardPreview(event) {
  const input = event.currentTarget;
  const code = input.dataset.jobCode;
  const card = input.closest("[data-job-card]");

  if (!card) return;

  const jpInput = card.querySelector('[data-job-field="jp"]');
  const jp = clampNumber(jpInput.value, 0, 2100, 0);

  const bar = card.querySelector(".ffxi-job-progress > div");
  const stars = card.querySelector(`[data-stars="${code}"]`);

  if (bar) {
    bar.style.width = `${jp / 2100 * 100}%`;
  }

  if (stars) {
    stars.textContent = jp >= 2100
      ? "★★★ Job Master"
      : `${jp} / 2100 JP`;
  }
}

async function handleJobInput(event) {
  if (!activeCharacter || !currentUser) return;

  const input = event.currentTarget;
  const code = input.dataset.jobCode;
  const field = input.dataset.jobField;

  const limits = {
    level: [1, 99],
    jp: [0, 2100],
    masterLevel: [0, 50]
  };

  const [min, max] = limits[field];
  const value = clampNumber(input.value, min, max, min);

  input.value = value;

  activeCharacter.jobs = normalizeJobProgress(
    activeCharacter.jobs
  );

  activeCharacter.jobs[code][field] = value;

  updateJobCardPreview({ currentTarget: input });

  const status = document.getElementById("job-save-status");
  if (status) status.textContent = "Saving…";

  if (jobSaveTimer) {
    clearTimeout(jobSaveTimer);
  }

  jobSaveTimer = setTimeout(saveCharacterJobs, 350);
}

async function saveCharacterJobs() {
  if (!activeCharacter || !currentUser) return;

  const characterId = activeCharacter.id;
  const jobsToSave = normalizeJobProgress(activeCharacter.jobs);

  const { error } = await db
    .from("characters")
    .update({
      jobs: jobsToSave,
      updated_at: new Date().toISOString()
    })
    .eq("id", characterId)
    .eq("user_id", currentUser.id);

  const status = document.getElementById("job-save-status");

  if (error) {
    if (status) {
      status.textContent = "Save failed: " + error.message;
    }
    return;
  }

  const character = characters.find(
    item => item.id === characterId
  );

  if (character) {
    character.jobs = jobsToSave;
  }

  if (status && activeCharacter?.id === characterId) {
    status.textContent = "✓ Saved online";
  }

  renderDashboardJobSummary();
}

function renderDashboardJobSummary() {
  if (!activeCharacter) return;

  const dashboardJobs = document.getElementById("job-list");
  if (!dashboardJobs) return;

  const jobs = normalizeJobProgress(activeCharacter.jobs);

  const selectedJobs = FFXI_JOBS
    .filter(job => {
      const progress = jobs[job.code];

      return progress.level > 1 ||
        progress.jp > 0 ||
        progress.masterLevel > 0;
    })
    .sort((a, b) => {
      const pa = jobs[a.code];
      const pb = jobs[b.code];

      return (pb.level + pb.masterLevel) -
        (pa.level + pa.masterLevel);
    })
    .slice(0, 5);

  dashboardJobs.innerHTML = selectedJobs.length
    ? `<div class="ffxi-dashboard-jobs">
        ${selectedJobs.map(job => {
          const progress = jobs[job.code];

          return `
            <div class="ffxi-dashboard-job">
              <strong style="width:38px">${job.code}</strong>

              <div style="flex:1;min-width:0">
                <div style="display:flex;justify-content:space-between;gap:8px">
                  <span>${job.name}</span>
                  <strong>Lv. ${progress.level}</strong>
                </div>

                <div class="track">
                  <div class="fill"
                    style="width:${progress.level / 99 * 100}%"></div>
                </div>

                <div class="job-meta">
                  JP ${progress.jp}/2100 · ML ${progress.masterLevel}
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>`
    : `<div class="empty">
        Set your job levels in Jobs &amp; Level to see progress here.
      </div>`;
}

const EQUIPMENT_SETS = [
  { id: "af", name: "Artifact Armor (AF)", max: 3 },
  { id: "relic", name: "Relic Armor", max: 3 },
  { id: "empyrean", name: "Empyrean Armor", max: 3 }
];

const EQUIPMENT_SLOTS = [
  { id: "head", name: "Head" },
  { id: "body", name: "Body" },
  { id: "hands", name: "Hands" },
  { id: "legs", name: "Legs" },
  { id: "feet", name: "Feet" }
];

const EQUIPMENT_STAGES = [
  { id: "none", label: "Not obtained" },
  { id: "base", label: "Base version" },
  { id: "109", label: "Item Level 109" },
  { id: "119", label: "Item Level 119" },
  { id: "119+1", label: "Item Level 119 +1" },
  { id: "119+2", label: "Item Level 119 +2" },
  { id: "119+3", label: "Item Level 119 +3" }
];

let selectedEquipmentJob = "WAR";
let equipmentSaveTimer = null;

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

        const stageIndex = EQUIPMENT_STAGES.findIndex(
          stage => stage.id === value
        );

        if (stageIndex !== -1) {
          result[job.code][set.id][slot.id] = value;
        }
      });
    });
  });

  return result;
}

function equipmentStageOptions(maxLevel) {
  const stages = [
    ["none", "Not obtained"],
    ["base", "Base version"],
    ["109", "Item Level 109"],
    ["119+1", "Item Level 119 +1"]
  ];

  for (let level = 2; level <= maxLevel; level++) {
    stages.push([`119+${level}`, `Item Level 119 +${level}`]);
  }

  return stages.map(([value, label]) =>
    `<option value="${value}">${label}</option>`
  ).join("");
}

function renderEquipment() {
  const container = document.getElementById("gear-list");

  if (!container || !activeCharacter) return;

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

        const obtained = pieces.filter(
          value => value !== "none"
        ).length;

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

                return `
                  <button type="button"
                    class="equipment-piece-button"
                    data-equipment-set="${set.id}"
                    data-equipment-slot="${slot.id}">

                    <span class="equipment-piece-icon">
                      ${stageId === "none" ? "○" : "✓"}
                    </span>

                    <span class="equipment-piece-info">
                      <strong>${slot.name}</strong>
                      <small>${stage?.label || "Not obtained"}</small>
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

        const nextIndex =
          (currentIndex + 1) % EQUIPMENT_STAGES.length;

        activeCharacter.equipment[selectedEquipmentJob][setId][slotId] =
          EQUIPMENT_STAGES[nextIndex].id;

        renderEquipment();
        saveEquipmentSoon();
      });
    });
}

function updateEquipmentSetSummary(setId) {
  const set = EQUIPMENT_SETS.find(item => item.id === setId);
  const progress = activeCharacter?.equipment?.[selectedEquipmentJob]?.[setId];

  if (!set || !progress) return;

  const obtained = EQUIPMENT_SLOTS.filter(
    slot => progress[slot.id] !== "none"
  ).length;

  const card = document.querySelector(
    `.equipment-set-card select[data-equipment-set="${setId}"]`
  )?.closest(".equipment-set-card");

  if (!card) return;

  const tag = card.querySelector(".equipment-set-heading .tag");
  const completion = card.querySelector(".equipment-completion");

  if (tag) tag.textContent = `${obtained}/5`;

  if (completion) {
    completion.textContent = obtained === 5
      ? "✓ Set collected"
      : `${5 - obtained} pieces remaining`;
  }
}

function saveEquipmentSoon() {
  const status = document.getElementById("equipment-save-status");

  if (status) status.textContent = "Saving…";

  if (equipmentSaveTimer) {
    clearTimeout(equipmentSaveTimer);
  }

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
    if (status) {
      status.textContent = "Save failed: " + error.message;
    }
    return;
  }

  const character = characters.find(item => item.id === characterId);

  if (character) {
    character.equipment = equipmentToSave;
  }

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

    .equipment-piece {
      display:grid;
      grid-template-columns:65px minmax(0,1fr);
      align-items:center;
      gap:10px;
      margin:10px 0;
    }

    .equipment-piece label {
      color:var(--muted);
      font-size:13px;
    }

    .equipment-piece select {
      width:100%;
      min-width:0;
      padding:9px 7px;
      color:var(--text);
      background:var(--bg);
      border:1px solid var(--border);
      border-radius:7px;
    }

    .equipment-completion {
      margin-top:14px;
      color:var(--accent);
      font-size:12px;
    }

    .equipment-piece-button {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 11px 8px;
      margin: 5px 0;
      text-align: left;
      color: var(--text);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
    }
    
    .equipment-piece-button:hover {
      border-color: var(--accent);
    }
    
    .equipment-piece-icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      flex-shrink: 0;
      border-radius: 7px;
      background: var(--panel2);
    }
    
    .equipment-piece-info {
      display: grid;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    
    .equipment-piece-info small {
      color: var(--muted);
      font-size: 11px;
    }
    
    .equipment-piece-next {
      font-size: 22px;
      color: var(--muted);
    }
  `;

  document.head.appendChild(style);
}

