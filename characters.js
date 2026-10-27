
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

let characters = [];
let activeCharacter = null;

async function initCharacters() {
  const { data, error } = await db
    .from("characters")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at");

  if (error) {
    alert("Charaktere konnten nicht geladen werden: " + error.message);
    return;
  }

  characters = data || [];

  const savedId = localStorage.getItem(
    "ffxi_active_character_" + currentUser.id
  );

  activeCharacter =
    characters.find(c => c.id === savedId) || characters[0] || null;

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
      <h2>Deine Charaktere</h2>
      <p>Wähle einen Charakter oder erstelle einen neuen.</p>

      <div id="character-list"></div>

      <hr style="border-color:#293447;margin:22px 0">

      <h3>Neuen Charakter erstellen</h3>

      <form id="character-form">
        <label for="character-name">Charaktername</label>
        <input id="character-name" required maxlength="50"
          placeholder="Name in Vana'diel"
          style="display:block;width:100%;padding:11px;margin:7px 0 15px;
          background:#0c1018;color:white;border:1px solid #293447;
          border-radius:8px">

        <label for="character-race">Rasse</label>
        <select id="character-race" style="display:block;width:100%;
          padding:11px;margin:7px 0 15px;background:#0c1018;color:white;
          border:1px solid #293447;border-radius:8px">
          <option value="hume">Hume</option>
          <option value="elvaan">Elvaan</option>
          <option value="tarutaru">Tarutaru</option>
          <option value="mithra">Mithra</option>
          <option value="galka">Galka</option>
        </select>

        <label for="character-gender">Geschlecht</label>
        <select id="character-gender" style="display:block;width:100%;
          padding:11px;margin:7px 0 15px;background:#0c1018;color:white;
          border:1px solid #293447;border-radius:8px">
          <option value="male">Männlich</option>
          <option value="female">Weiblich</option>
        </select>

        <div id="avatar-preview" style="font-size:42px;text-align:center;
          padding:12px"></div>

        <button type="submit" class="action"
          style="width:100%;padding:12px">Charakter erstellen</button>
        <p id="character-message" role="status"></p>
      </form>

      <button id="character-close" class="action"
        style="width:100%;margin-top:10px">
        Zurück zum Tracker
      </button>
    </div>
  `;

  const race = document.getElementById("character-race");
  const gender = document.getElementById("character-gender");

  function updateAvatar() {
    const invalid =
      (race.value === "mithra" && gender.value !== "female") ||
      (race.value === "galka" && gender.value !== "male");

    if (invalid) {
      gender.value = race.value === "mithra" ? "female" : "male";
    }

    document.getElementById("avatar-preview").textContent =
      raceSymbols[race.value];
  }

  race.addEventListener("change", updateAvatar);
  gender.addEventListener("change", updateAvatar);
  updateAvatar();

  document.getElementById("character-form").addEventListener(
    "submit", createCharacter
  );

  document.getElementById("character-close").onclick = () => {
    if (activeCharacter) modal.style.display = "none";
    else if (!force) modal.style.display = "none";
  };

  renderCharacterManager();
}

async function createCharacter(event) {
  event.preventDefault();

  const name = document.getElementById("character-name").value.trim();
  const race = document.getElementById("character-race").value;
  const gender = document.getElementById("character-gender").value;
  const message = document.getElementById("character-message");

  if (race === "mithra" && gender !== "female") {
    message.textContent = "Mithra können nur weiblich ausgewählt werden.";
    return;
  }

  if (race === "galka" && gender !== "male") {
    message.textContent = "Galka können nur männlich ausgewählt werden.";
    return;
  }

  message.textContent = "Speichere Charakter …";

  const { data, error } = await db
    .from("characters")
    .insert({
      user_id: currentUser.id,
      name,
      race,
      gender,
      avatar_key: `${race}_${gender}`
    })
    .select()
    .single();

  if (error) {
    message.textContent = "Fehler: " + error.message;
    return;
  }

  characters.push(data);
  selectCharacter(data.id);
  renderCharacterManager();

  document.getElementById("character-modal").style.display = "none";
}

function selectCharacter(id) {
  activeCharacter = characters.find(c => c.id === id);
  if (!activeCharacter) return;

  localStorage.setItem(
    "ffxi_active_character_" + currentUser.id,
    activeCharacter.id
  );

  const profile = document.querySelector(".profile span");
  if (profile) profile.textContent = activeCharacter.name;

  const avatar = document.querySelector(".profile .avatar");
  if (avatar) {
    avatar.textContent = raceSymbols[activeCharacter.race];
    avatar.title =
      raceNames[activeCharacter.race] + " · " +
      (activeCharacter.gender === "male" ? "Männlich" : "Weiblich");
  }

  const title = document.querySelector("#dashboard h1");
  if (title) title.textContent = activeCharacter.name;

  document.querySelectorAll(".character-selected").forEach(el => {
    el.classList.remove("character-selected");
  });

  const selected = document.querySelector(
    `[data-character-id="${id}"]`
  );

  if (selected) selected.classList.add("character-selected");
}

function renderCharacterManager() {
  const list = document.getElementById("character-list");
  if (!list) return;

  list.innerHTML = characters.map(c => `
    <button type="button" data-character-id="${c.id}"
      class="action ${activeCharacter?.id === c.id ? "character-selected" : ""}"
      style="display:flex;align-items:center;gap:12px;width:100%;
      padding:12px;margin:8px 0;text-align:left">
      <span style="font-size:26px">${raceSymbols[c.race]}</span>
      <span>
        <strong>${escapeCharacterText(c.name)}</strong><br>
        <small>${raceNames[c.race]} ·
          ${c.gender === "male" ? "Männlich" : "Weiblich"}</small>
      </span>
      <span style="margin-left:auto">
        ${activeCharacter?.id === c.id ? "✓ Aktiv" : "Auswählen"}
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
    button.textContent = "Charaktere";
    button.onclick = () => openCharacterManager();
    profile.appendChild(button);
  }
}

function escapeCharacterText(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
