
let characterTodos = [];
let todosLoadToken = 0;

function escapeTodoText(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

async function loadCharacterTodos() {
  if (!currentUser || !activeCharacter) return;

  const characterId = activeCharacter.id;
  const token = ++todosLoadToken;

  setTodoStatus("To-dos werden geladen ...");

  const { data, error } = await db
    .from("character_todos")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });

  if (token !== todosLoadToken) return;

  if (error) {
    setTodoStatus("Laden fehlgeschlagen: " + error.message);
    return;
  }

  characterTodos = data || [];
  renderCharacterTodos();
  setTodoStatus("");
}

function setTodoStatus(message) {
  const status = document.getElementById("todo-status");
  if (status) status.textContent = message;
}

function renderCharacterTodos() {
  const allTodos = document.getElementById("all-goals");
  const dashboardTodos = document.getElementById("goal-list");

  const pending = characterTodos.filter(todo => !todo.completed);
  const completedCount = characterTodos.length - pending.length;

  const renderList = (items, showDelete) => {
    if (!items.length) {
      return `<div class="empty">
        ${showDelete
          ? "Noch keine persönlichen To-dos. Füge oben dein erstes hinzu."
          : "Keine offenen To-dos."}
      </div>`;
    }

    return items.map(todo => `
      <div class="goal ${todo.completed ? "done" : ""}">
        <input
          type="checkbox"
          data-todo-id="${todo.id}"
          ${todo.completed ? "checked" : ""}
          aria-label="To-do erledigt">

        <label>
          <span>${escapeTodoText(todo.title)}</span>
        </label>

        ${showDelete ? `
          <button type="button"
            class="action todo-delete"
            data-delete-todo="${todo.id}"
            title="To-do löschen"
            aria-label="To-do löschen">×</button>
        ` : ""}
      </div>
    `).join("");
  };

  if (allTodos) {
    allTodos.innerHTML = renderList(characterTodos, true);
  }

  if (dashboardTodos) {
    dashboardTodos.innerHTML = renderList(pending.slice(0, 5), false);
  }

  const count = document.getElementById("goal-count");
  if (count) {
    count.textContent = `${completedCount} / ${characterTodos.length}`;
  }

  const progress = document.getElementById("goal-progress");
  if (progress) {
    const percentage = characterTodos.length
      ? Math.round(completedCount / characterTodos.length * 100)
      : 0;

    progress.textContent = `${percentage}% erledigt`;
  }
}

async function addCharacterTodo(event) {
  event.preventDefault();

  if (!currentUser || !activeCharacter) {
    setTodoStatus("Bitte zuerst einen Charakter auswählen.");
    return;
  }

  const input = document.getElementById("todo-input");
  const title = input.value.trim();

  if (!title) return;

  const characterId = activeCharacter.id;

  setTodoStatus("Wird gespeichert ...");

  const { error } = await db
    .from("character_todos")
    .insert({
      character_id: characterId,
      title: title
    });

  if (error) {
    setTodoStatus("Speichern fehlgeschlagen: " + error.message);
    return;
  }

  input.value = "";
  await loadCharacterTodos();
  input.focus();
}

async function toggleCharacterTodo(id, completed) {
  const characterId = activeCharacter?.id;
  if (!characterId) return;

  const { error } = await db
    .from("character_todos")
    .update({
      completed,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("character_id", characterId);

  if (error) {
    setTodoStatus("Aktualisierung fehlgeschlagen: " + error.message);
    await loadCharacterTodos();
    return;
  }

  await loadCharacterTodos();
}

async function deleteCharacterTodo(id) {
  const characterId = activeCharacter?.id;
  if (!characterId) return;

  const { error } = await db
    .from("character_todos")
    .delete()
    .eq("id", id)
    .eq("character_id", characterId);

  if (error) {
    setTodoStatus("Löschen fehlgeschlagen: " + error.message);
    return;
  }

  await loadCharacterTodos();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("todo-form");

  if (form) {
    form.addEventListener("submit", addCharacterTodo);
  }

  document.addEventListener("change", event => {
    const checkbox = event.target.closest("[data-todo-id]");
    if (!checkbox) return;

    toggleCharacterTodo(
      checkbox.dataset.todoId,
      checkbox.checked
    );
  });

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-delete-todo]");
    if (!button) return;

    deleteCharacterTodo(button.dataset.deleteTodo);
  });
});
