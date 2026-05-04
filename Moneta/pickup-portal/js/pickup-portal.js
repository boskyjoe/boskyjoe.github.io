const fallbackCatalogue = {
  catalogueId: "pickup-preview",
  catalogueName: "Church Pickup Requests",
  currency: "KES",
  publishedAt: "2026-05-04T09:00:00.000Z",
  pickupNotice:
    "Submit a pickup request and wait for confirmation from the church store team before collection.",
  pickupLocation: "Church Resource Centre",
  contactPhone: "+254 700 123 456",
  requestLeadTimeHours: 24,
  categories: [
    {
      id: "baked-goods",
      name: "Baked Goods"
    },
    {
      id: "books-resources",
      name: "Books & Resources"
    },
    {
      id: "gift-items",
      name: "Gift Items"
    }
  ],
  items: [
    {
      id: "dates-carrot-cake-250g",
      productId: "prod-dates-carrot-cake-250g",
      name: "Dates & Carrot Cake (250 grams)",
      categoryId: "baked-goods",
      description: "Moist carrot loaf with natural date sweetness for pickup-day treats.",
      price: 650,
      unitLabel: "per pack",
      imageLabel: "Cake",
      isAvailable: true
    },
    {
      id: "banana-tea-loaf",
      productId: "prod-banana-tea-loaf",
      name: "Banana Tea Loaf",
      categoryId: "baked-goods",
      description: "Soft family loaf prepared for fellowship and home visits.",
      price: 520,
      unitLabel: "per loaf",
      imageLabel: "Loaf",
      isAvailable: true
    },
    {
      id: "prayer-journal",
      productId: "prod-prayer-journal",
      name: "Prayer Journal",
      categoryId: "books-resources",
      description: "A guided notebook for weekly devotion, prayer points, and testimony tracking.",
      price: 850,
      unitLabel: "each",
      imageLabel: "Journal",
      isAvailable: true
    },
    {
      id: "family-devotional-guide",
      productId: "prod-family-devotional-guide",
      name: "Family Devotional Guide",
      categoryId: "books-resources",
      description: "Thirty-day resource for home fellowship and children’s reflection prompts.",
      price: 1100,
      unitLabel: "each",
      imageLabel: "Guide",
      isAvailable: true
    },
    {
      id: "church-mug",
      productId: "prod-church-mug",
      name: "Church Mug",
      categoryId: "gift-items",
      description: "Branded ceramic mug for appreciation gifts and conference welcome packs.",
      price: 780,
      unitLabel: "each",
      imageLabel: "Mug",
      isAvailable: true
    },
    {
      id: "bookmark-pack",
      productId: "prod-bookmark-pack",
      name: "Scripture Bookmark Pack",
      categoryId: "gift-items",
      description: "Set of five printed bookmarks with memory verses and encouragement lines.",
      price: 260,
      unitLabel: "per pack",
      imageLabel: "Pack",
      isAvailable: true
    }
  ]
};

const state = {
  catalogue: null,
  query: "",
  categoryId: "all",
  cart: new Map(),
  source: "loading"
};

const elements = {
  categoryFilters: document.querySelector("#category-filters"),
  catalogueGrid: document.querySelector("#catalogue-grid"),
  catalogueSearch: document.querySelector("#catalogue-search"),
  catalogueStatus: document.querySelector("#catalogue-status"),
  cartItems: document.querySelector("#cart-items"),
  cartTotal: document.querySelector("#cart-total"),
  clearCartButton: document.querySelector("#clear-cart-button"),
  pickupNotice: document.querySelector("#pickup-notice"),
  pickupLocation: document.querySelector("#pickup-location"),
  contactPhone: document.querySelector("#contact-phone"),
  leadTime: document.querySelector("#lead-time"),
  publishMeta: document.querySelector("#publish-meta"),
  requestForm: document.querySelector("#pickup-request-form"),
  reviewRequestButton: document.querySelector("#review-request-button"),
  modalShell: document.querySelector("#request-preview-modal"),
  modalBody: document.querySelector("#modal-body"),
  closeModalButton: document.querySelector("#close-modal-button"),
  closeModalFooterButton: document.querySelector("#close-modal-footer-button")
};

document.addEventListener("DOMContentLoaded", async () => {
  bindEvents();
  await loadCatalogue();
  render();
});

function bindEvents() {
  elements.catalogueSearch.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderCatalogue();
  });

  elements.categoryFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category-id]");
    if (!button) {
      return;
    }
    state.categoryId = button.dataset.categoryId;
    renderCatalogue();
    renderFilters();
  });

  elements.catalogueGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-item-id]");
    if (!button) {
      return;
    }
    addToCart(button.dataset.itemId);
  });

  elements.cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-cart-action]");
    if (!button) {
      return;
    }

    const itemId = button.dataset.itemId;
    const action = button.dataset.cartAction;

    if (action === "increase") {
      changeQuantity(itemId, 1);
      return;
    }

    if (action === "decrease") {
      changeQuantity(itemId, -1);
      return;
    }

    if (action === "remove") {
      state.cart.delete(itemId);
      renderCart();
    }
  });

  elements.clearCartButton.addEventListener("click", () => {
    state.cart.clear();
    renderCart();
  });

  elements.requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    openPreviewModal();
  });

  elements.closeModalButton.addEventListener("click", closePreviewModal);
  elements.closeModalFooterButton.addEventListener("click", closePreviewModal);

  elements.modalShell.addEventListener("click", (event) => {
    if (event.target === elements.modalShell) {
      closePreviewModal();
    }
  });
}

async function loadCatalogue() {
  try {
    const response = await fetch("./data/catalogue.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Catalogue request failed with ${response.status}`);
    }

    state.catalogue = await response.json();
    state.source = "published-json";
  } catch (error) {
    console.warn("[Pickup Portal] Using fallback catalogue preview.", error);
    state.catalogue = fallbackCatalogue;
    state.source = "embedded-fallback";
  }
}

function render() {
  renderHeader();
  renderFilters();
  renderCatalogue();
  renderCart();
}

function renderHeader() {
  const { pickupNotice, pickupLocation, contactPhone, requestLeadTimeHours, publishedAt } =
    state.catalogue;

  elements.pickupNotice.textContent = pickupNotice;
  elements.pickupLocation.textContent = pickupLocation || "Not set";
  elements.contactPhone.textContent = contactPhone || "Not set";
  elements.leadTime.textContent = `${requestLeadTimeHours || 0} hours`;

  const publishedLabel = publishedAt
    ? new Date(publishedAt).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : "Unknown";

  elements.publishMeta.textContent =
    state.source === "published-json"
      ? `Published JSON loaded · ${publishedLabel}`
      : `Fallback preview loaded · ${publishedLabel}`;
}

function renderFilters() {
  const categories = state.catalogue.categories || [];
  const buttons = [
    renderFilterButton("all", "All Items"),
    ...categories.map((category) => renderFilterButton(category.id, category.name))
  ];

  elements.categoryFilters.innerHTML = buttons.join("");
}

function renderFilterButton(categoryId, label) {
  const activeClass = state.categoryId === categoryId ? " active" : "";
  return `
    <button
      class="category-filter${activeClass}"
      type="button"
      data-category-id="${escapeHtml(categoryId)}"
    >
      ${escapeHtml(label)}
    </button>
  `;
}

function renderCatalogue() {
  const items = getFilteredItems();
  const totalItems = state.catalogue.items.length;

  elements.catalogueStatus.textContent =
    items.length === totalItems
      ? `${totalItems} published items available for preview`
      : `${items.length} of ${totalItems} items match the current filter`;

  if (!items.length) {
    elements.catalogueGrid.innerHTML = `
      <div class="empty-state">
        <p>No published items match this search yet.</p>
      </div>
    `;
    return;
  }

  elements.catalogueGrid.innerHTML = items
    .map((item) => {
      return `
        <article class="product-card">
          <div class="product-media">${escapeHtml(item.imageLabel || item.name.slice(0, 1))}</div>
          <div>
            <h4>${escapeHtml(item.name)}</h4>
            <p class="product-description">${escapeHtml(item.description || "No description yet.")}</p>
          </div>
          <div class="product-meta">
            <span>${escapeHtml(item.unitLabel || "each")}</span>
            <strong class="price-tag">${formatCurrency(item.price)}</strong>
          </div>
          <button type="button" data-item-id="${escapeHtml(item.id)}">
            Add to Request
          </button>
        </article>
      `;
    })
    .join("");
}

function renderCart() {
  const cartEntries = getCartEntries();

  if (!cartEntries.length) {
    elements.cartItems.innerHTML = `
      <p class="cart-empty">
        Add published items from the left to build a pickup request preview.
      </p>
    `;
    elements.cartTotal.textContent = formatCurrency(0);
    elements.reviewRequestButton.disabled = true;
    return;
  }

  elements.reviewRequestButton.disabled = false;
  elements.cartItems.innerHTML = cartEntries
    .map(({ item, quantity, total }) => {
      return `
        <article class="cart-item">
          <div class="cart-item-row">
            <div>
              <div class="cart-item-name">${escapeHtml(item.name)}</div>
              <div class="cart-item-meta">${escapeHtml(item.unitLabel || "each")} · ${formatCurrency(item.price)}</div>
            </div>
            <button type="button" class="icon-button" data-cart-action="remove" data-item-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">
              ×
            </button>
          </div>
          <div class="cart-item-row">
            <div class="qty-controls">
              <button type="button" data-cart-action="decrease" data-item-id="${escapeHtml(item.id)}" aria-label="Decrease quantity">−</button>
              <strong>${quantity}</strong>
              <button type="button" data-cart-action="increase" data-item-id="${escapeHtml(item.id)}" aria-label="Increase quantity">+</button>
            </div>
            <strong>${formatCurrency(total)}</strong>
          </div>
        </article>
      `;
    })
    .join("");

  elements.cartTotal.textContent = formatCurrency(
    cartEntries.reduce((sum, entry) => sum + entry.total, 0)
  );
}

function getFilteredItems() {
  const query = state.query;
  return state.catalogue.items.filter((item) => {
    const matchesCategory =
      state.categoryId === "all" || item.categoryId === state.categoryId;
    const searchHaystack = `${item.name} ${item.description || ""}`.toLowerCase();
    const matchesQuery = !query || searchHaystack.includes(query);
    return matchesCategory && matchesQuery && item.isAvailable !== false;
  });
}

function getItemById(itemId) {
  return state.catalogue.items.find((item) => item.id === itemId) || null;
}

function addToCart(itemId) {
  const current = state.cart.get(itemId) || 0;
  state.cart.set(itemId, current + 1);
  renderCart();
}

function changeQuantity(itemId, delta) {
  const current = state.cart.get(itemId) || 0;
  const next = current + delta;

  if (next <= 0) {
    state.cart.delete(itemId);
  } else {
    state.cart.set(itemId, next);
  }

  renderCart();
}

function getCartEntries() {
  return Array.from(state.cart.entries())
    .map(([itemId, quantity]) => {
      const item = getItemById(itemId);
      if (!item) {
        return null;
      }

      return {
        item,
        quantity,
        total: item.price * quantity
      };
    })
    .filter(Boolean);
}

function openPreviewModal() {
  const cartEntries = getCartEntries();
  if (!cartEntries.length) {
    return;
  }

  const formData = new FormData(elements.requestForm);
  const total = cartEntries.reduce((sum, entry) => sum + entry.total, 0);
  const requestLines = cartEntries
    .map(
      ({ item, quantity, total: lineTotal }) =>
        `<li>${escapeHtml(item.name)} · Qty ${quantity} · ${formatCurrency(lineTotal)}</li>`
    )
    .join("");

  elements.modalBody.innerHTML = `
    <p class="inline-note">
      This scaffold does not submit to Moneta or an external intake service yet. It only previews the public request experience.
    </p>

    <div class="summary-grid">
      <section class="summary-card">
        <span class="metric-label">Customer</span>
        <strong>${escapeHtml(formData.get("customerName") || "Not provided")}</strong>
      </section>
      <section class="summary-card">
        <span class="metric-label">Phone</span>
        <strong>${escapeHtml(formData.get("customerPhone") || "Not provided")}</strong>
      </section>
      <section class="summary-card">
        <span class="metric-label">Requested Pickup Date</span>
        <strong>${escapeHtml(formData.get("pickupDate") || "Not provided")}</strong>
      </section>
      <section class="summary-card">
        <span class="metric-label">Requested Pickup Time</span>
        <strong>${escapeHtml(formData.get("pickupTime") || "Not provided")}</strong>
      </section>
    </div>

    <section class="summary-lines">
      <span class="metric-label">Selected Items</span>
      <ul>${requestLines}</ul>
    </section>

    <section class="summary-card">
      <span class="metric-label">Estimated Total</span>
      <strong>${formatCurrency(total)}</strong>
    </section>

    <section class="summary-card">
      <span class="metric-label">Notes</span>
      <strong>${escapeHtml(formData.get("notes") || "No notes provided")}</strong>
    </section>
  `;

  elements.modalShell.classList.remove("hidden");
  elements.modalShell.setAttribute("aria-hidden", "false");
}

function closePreviewModal() {
  elements.modalShell.classList.add("hidden");
  elements.modalShell.setAttribute("aria-hidden", "true");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: state.catalogue?.currency || "KES",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
