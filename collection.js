
let collectionCatalog = {
  trust: null,
  mount: null
};

let collectionOwned = {};
let selectedCollectionType = "trust";
let collectionLoadToken = 0;

async function loadCollectionCatalog(type) {
  if (collectionCatalog[type] !== null) {
    return collectionCatalog[type];
  }

  const table = type === "trust" ? "trusts" : "mounts";

  const { data, error } = await db
    .from(table)
    .select("id, name, category, image_url, source_url, sort_order")
    .order("sort_order");

  if (error) throw error;

  collectionCatalog[type] = data || [];
  return collectionCatalog[type];
}

async function loadCharacterCollection() {
  if (!activeCharacter || !currentUser) return;

  const token = ++collectionLoadToken;
  const characterId = activeCharacter.id;

  const { data, error } = await db
    .from("character_collection")
    .select("item_type, item_id, owned")
    .eq("character_id", characterId);

  if (token !== collectionLoadToken) return;

  if (error) {
    throw error;
  }

  collectionOwned = {};

  (data || []).forEach(item => {
    collectionOwned[`${item.item_type}:${item.item_id}`] =
      Boolean(item.owned);
  });

  renderCollection();
}

function isCollectionOwned(type, id) {
  return collectionOwned[`${type}:${id}`] === true;
}

async function toggleCollectionItem(type, itemId) {
  if (!activeCharacter || !currentUser) return;

  const key = `${type}:${itemId}`;
  const nextOwned = !isCollectionOwned(type, itemId);
  const characterId = activeCharacter.id;

  const button = document.querySelector(
    `[data-collection-type="${type}"][data-collection-id="${CSS.escape(itemId)}"]`
  );

  if (button) button.disabled = true;

  const { error } = await db
    .from("character_collection")
    .upsert({
      character_id: characterId,
      item_type: type,
      item_id: itemId,
      owned: nextOwned,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "character_id,item_type,item_id"
    });

  if (error) {
    alert("Collection could not be saved: " + error.message);
    if (button) button.disabled = false;
    return;
  }

  if (activeCharacter?.id !== characterId) return;

  collectionOwned[key] = nextOwned;
  renderCollection();
}

function escapeCollectionText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function renderCollection() {
  const container = document.getElementById("collection-content");
  if (!container) return;

  const type = selectedCollectionType;
  const items = collectionCatalog[type];

  if (!items) {
    container.innerHTML = '<p>Loading collection...</p>';
    return;
  }

  const ownedCount = items.filter(item =>
    isCollectionOwned(type, item.id)
  ).length;

  const typeName = type === "trust" ? "Trusts" : "Mounts";

  const categories = [...new Set(
    items.map(item => item.category).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));

  container.innerHTML = `
    <div class="collection-summary">
      <strong>${ownedCount} / ${items.length}</strong>
      <span>${typeName} collected</span>
      <div class="track">
        <div class="fill" style="width:${
          items.length ? ownedCount / items.length * 100 : 0
        }%"></div>
      </div>
    </div>

    <div class="collection-category-list">
      <button class="action active" data-collection-category="all">
        All
      </button>
      ${categories.map(category => `
        <button class="action"
          data-collection-category="${escapeCollectionText(category)}">
          ${escapeCollectionText(category)}
        </button>
      `).join("")}
    </div>

    <div class="collection-grid">
      ${items.map(item => {
        const owned = isCollectionOwned(type, item.id);

        return `
          <button type="button"
            class="collection-item ${owned ? "owned" : "not-owned"}"
            data-collection-type="${type}"
            data-collection-id="${escapeCollectionText(item.id)}"
            data-category="${escapeCollectionText(item.category || "")}"
            title="${escapeCollectionText(item.name)}">

            <div class="collection-image">
              <img
                src="${escapeCollectionText(item.image_url || "")}"
                alt="${escapeCollectionText(item.name)}"
                loading="lazy"
                onerror="this.style.display='none'">
            </div>

            <strong>${escapeCollectionText(item.name)}</strong>
            <small>${escapeCollectionText(item.category || "")}</small>
            <span class="collection-status">
              ${owned ? "✓ Obtained" : "Not obtained"}
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;

  container.querySelectorAll("[data-collection-type]")
    .forEach(button => {
      button.addEventListener("click", () => {
        toggleCollectionItem(
          button.dataset.collectionType,
          button.dataset.collectionId
        );
      });
    });

  container.querySelectorAll("[data-collection-category]")
    .forEach(button => {
      button.addEventListener("click", () => {
        const category = button.dataset.collectionCategory;

        container.querySelectorAll(".collection-item")
          .forEach(card => {
            card.style.display =
              category === "all" ||
              card.dataset.category === category
                ? ""
                : "none";
          });

        container.querySelectorAll("[data-collection-category]")
          .forEach(filter => filter.classList.remove("active"));

        button.classList.add("active");
      });
    });
}

async function initCollection() {
  const container = document.getElementById("collection-content");
  if (!container) return;

  if (!activeCharacter || !currentUser) {
    container.innerHTML = '<p>Please select a character first.</p>';
    return;
  }

  container.innerHTML = '<p>Loading collection...</p>';

  try {
    await Promise.all([
      loadCollectionCatalog("trust"),
      loadCollectionCatalog("mount")
    ]);

    await loadCharacterCollection();
  } catch (error) {
    container.innerHTML = `
      <p>Collection could not be loaded: ${
        escapeCollectionText(error.message)
      }</p>
    `;
    console.error("Collection loading failed:", error);
  }
}

function injectCollectionStyles() {
  if (document.getElementById("ffxi-collection-styles")) return;

  const style = document.createElement("style");
  style.id = "ffxi-collection-styles";

  style.textContent = `
    .collection-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }

    .collection-tabs button.active,
    .collection-category-list button.active {
      border-color: var(--accent);
      color: var(--accent);
      background: #202d3d;
    }

    .collection-summary {
      margin-bottom: 20px;
      display: grid;
      gap: 5px;
    }

    .collection-summary strong {
      font-size: 22px;
      color: var(--accent);
    }

    .collection-summary span {
      color: var(--muted);
      font-size: 12px;
    }

    .collection-category-list {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-bottom: 20px;
    }

    .collection-category-list button {
      font-size: 12px;
    }

    .collection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
      gap: 12px;
    }

    .collection-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 7px;
      padding: 12px;
      min-width: 0;
      color: var(--text);
      background: var(--panel2);
      border: 1px solid var(--border);
      border-radius: 10px;
      cursor: pointer;
      text-align: center;
      transition: opacity .15s, border-color .15s;
    }

    .collection-item:hover {
      border-color: var(--accent);
    }

    .collection-item.not-owned {
      opacity: .42;
      filter: grayscale(1);
    }

    .collection-item.owned {
      border-color: #456b62;
    }

    .collection-image {
      width: 100%;
      height: 105px;
      display: grid;
      place-items: center;
    }

    .collection-image img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .collection-item strong {
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .collection-item small {
      color: var(--muted);
      font-size: 11px;
    }

    .collection-status {
      color: var(--accent);
      font-size: 11px;
    }
  `;

  document.head.appendChild(style);
}

function setCollectionType(type) {
  selectedCollectionType = type;

  document.querySelectorAll("[data-collection-tab]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.collectionTab === type
      );
    });

  renderCollection();
}

// Nach der Charakterauswahl die passende Sammlung laden.
const originalSelectCharacter = selectCharacter;

selectCharacter = function(id) {
  originalSelectCharacter(id);
  initCollection();
};

injectCollectionStyles();

function initCollectionNavigation() {
  const toggle = document.getElementById("collection-menu-toggle");
  const submenu = document.getElementById("collection-submenu");
  const arrow = document.getElementById("collection-menu-arrow");

  if (!toggle || !submenu || toggle.dataset.initialized) return;

  toggle.dataset.initialized = "true";

  toggle.addEventListener("click", () => {
    submenu.classList.toggle("open");

    if (arrow) {
      arrow.textContent = submenu.classList.contains("open") ? "▴" : "▾";
    }
  });

  submenu.querySelectorAll("[data-collection-type]").forEach(button => {
    button.addEventListener("click", () => {
      selectedCollectionType = button.dataset.collectionType;

      submenu.querySelectorAll("button").forEach(item => {
        item.classList.toggle("active", item === button);
      });

      submenu.classList.add("open");

      if (arrow) arrow.textContent = "▴";

      showPage("collection");
      renderCollection();
    });
  });
}

initCollectionNavigation();
