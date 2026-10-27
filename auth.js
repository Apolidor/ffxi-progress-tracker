
const SUPABASE_URL = "https://wsjcezsvxnebaxhnywbb.supabase.co";
const SUPABASE_KEY = "sb_publishable_I-MiYe9t_TaMr47atbB93A_2-EAYt9R";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = null;

const authBox = document.createElement("div");
authBox.innerHTML = `
  <div id="auth-panel" style="
    position:fixed;inset:0;z-index:9999;
    background:#0c1018ee;display:flex;
    align-items:center;justify-content:center;padding:20px">
    <form id="auth-form" style="
      width:100%;max-width:390px;background:#141b27;
      border:1px solid #293447;border-radius:16px;padding:28px;
      color:#eef3fa;font:15px system-ui">
      <div style="color:#79e0d0;letter-spacing:2px;font-size:11px">
        VANA'DIEL
      </div>
      <h2 id="auth-title">Dein Abenteuer</h2>
      <p style="color:#91a0b6;font-size:13px">
        Melde dich an, um deinen Spielstand online zu speichern.
      </p>
      <label for="auth-email">E-Mail</label>
      <input id="auth-email" type="email" required autocomplete="email"
        style="display:block;width:100%;padding:12px;margin:7px 0 16px;
        background:#0c1018;color:white;border:1px solid #293447;border-radius:8px">
      <label for="auth-password">Passwort</label>
      <input id="auth-password" type="password" required minlength="6"
        autocomplete="current-password"
        style="display:block;width:100%;padding:12px;margin:7px 0 16px;
        background:#0c1018;color:white;border:1px solid #293447;border-radius:8px">
      <button id="auth-submit" type="submit" style="
        width:100%;padding:12px;border:0;border-radius:8px;
        background:#79e0d0;color:#101620;font-weight:700;cursor:pointer">
        Anmelden
      </button>
      <button id="auth-toggle" type="button" style="
        width:100%;padding:12px;margin-top:8px;border:1px solid #293447;
        border-radius:8px;background:transparent;color:#eef3fa;cursor:pointer">
        Neues Konto erstellen
      </button>
      <p id="auth-message" role="status" style="font-size:13px"></p>
    </form>
  </div>
`;
document.body.appendChild(authBox);

let registering = false;

const authForm = document.getElementById("auth-form");
const authMessage = document.getElementById("auth-message");

document.getElementById("auth-toggle").addEventListener("click", () => {
  registering = !registering;
  document.getElementById("auth-title").textContent =
    registering ? "Konto erstellen" : "Dein Abenteuer";
  document.getElementById("auth-submit").textContent =
    registering ? "Registrieren" : "Anmelden";
  document.getElementById("auth-toggle").textContent =
    registering ? "Zurück zur Anmeldung" : "Neues Konto erstellen";
  authMessage.textContent = "";
});

authForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  authMessage.textContent = "Einen Moment bitte …";

  const result = registering
    ? await db.auth.signUp({ email, password })
    : await db.auth.signInWithPassword({ email, password });

  if (result.error) {
    authMessage.textContent = result.error.message;
    return;
  }

  if (registering && !result.data.session) {
    authMessage.textContent =
      "Bitte prüfe deine E-Mails und bestätige deine Registrierung.";
    return;
  }

  if (result.data.user && !result.data.session) {
    authMessage.textContent =
      "Bitte bestätige deine E-Mail-Adresse, bevor du dich anmeldest.";
    return;
  }

  await loadProgress();
});

async function loadProgress() {
  const { data: authData, error: authError } =
    await db.auth.getUser();

  if (authError || !authData.user) return;

  currentUser = authData.user;

  const { data, error } = await db
    .from("player_progress")
    .select("data")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    authMessage.textContent = "Laden fehlgeschlagen: " + error.message;
    return;
  }

  if (data) {
    completed = Array.isArray(data.data.completedGoals)
      ? data.data.completedGoals
      : [];
  } else {
    // Vorhandene lokale Checkliste beim ersten Login übernehmen.
    await saveProgress();
  }

  refresh();
  document.getElementById("auth-panel").style.display = "none";

  const profile = document.querySelector(".profile span");
  if (profile) profile.textContent = currentUser.email;

  const notice = document.querySelector(".notice");
  if (notice) {
    notice.textContent =
      "✓ Angemeldet. Deine Checkliste wird mit deinem Online-Spielstand synchronisiert.";
  }

  let logoutButton = document.getElementById("auth-logout");
  if (!logoutButton) {
    logoutButton = document.createElement("button");
    logoutButton.id = "auth-logout";
    logoutButton.className = "action";
    logoutButton.textContent = "Abmelden";
    document.querySelector(".profile").appendChild(logoutButton);
    logoutButton.addEventListener("click", async () => {
      await db.auth.signOut();
      location.reload();
    });
  }
}

async function saveProgress() {
  if (!currentUser) return;

  const { error } = await db.from("player_progress").upsert({
    user_id: currentUser.id,
    data: { completedGoals: completed },
    updated_at: new Date().toISOString()
  });

  if (error) {
    authMessage.textContent =
      "Speichern fehlgeschlagen: " + error.message;
  }
}

// Jede Änderung an der Checkliste online speichern.
document.addEventListener("change", event => {
  if (event.target.matches("[data-goal]")) {
    saveProgress();
  }
});

db.auth.getSession().then(({ data, error }) => {
  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  if (data.session) {
    loadProgress(
    await initCharacters();
    );
  }
});
