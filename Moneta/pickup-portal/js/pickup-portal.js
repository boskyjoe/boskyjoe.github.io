const fallbackCatalogue = {
  catalogueId: "pickup-preview",
  catalogueName: "Church Pickup Requests",
  currency: "INR",
  publishedAt: "2026-05-04T09:00:00.000Z",
  pickupNotice:
    "Submit a pickup request and wait for confirmation from the church store team before collection.",
  pickupLocation: "Church Resource Centre",
  contactPhone: "+91 98765 43210",
  requestLeadTimeHours: 24,
  categories: [
    { id: "baked-goods", name: "Baked Goods" },
    { id: "books-resources", name: "Books & Resources" },
    { id: "gift-items", name: "Gift Items" }
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
      badge: "Fresh Bake",
      featured: true,
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
      featured: true,
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
      badge: "Popular",
      featured: true,
      isAvailable: true
    },
    {
      id: "family-devotional-guide",
      productId: "prod-family-devotional-guide",
      name: "Family Devotional Guide",
      categoryId: "books-resources",
      description: "Thirty-day resource for home fellowship and children's reflection prompts.",
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

const emptyCatalogue = {
  catalogueId: "pickup-unavailable",
  catalogueName: "Church Pickup Requests",
  currency: "INR",
  publishedAt: "",
  pickupNotice:
    "The published pickup catalogue is unavailable right now. Please ask the church store team to republish the latest catalogue snapshot.",
  pickupLocation: "Not published",
  contactPhone: "Not published",
  requestLeadTimeHours: 0,
  categories: [],
  items: []
};

const canUseSamplePreview =
  window.location.protocol === "file:" ||
  new URLSearchParams(window.location.search).get("preview") === "sample";

const googleClientId = String(window.pickupPortalConfig?.googleClientId || "").trim();
const intakeEndpointUrl = String(window.pickupPortalConfig?.intakeEndpointUrl || "").trim();
const portalUserStorageKey = "monetaPickupPortalGoogleUser";

const state = {
  catalogue: null,
  query: "",
  categoryId: "all",
  sort: "featured",
  cart: new Map(),
  currentPage: "storefront",
  source: "loading",
  sourceError: "",
  activeItemId: "",
  currentUser: null,
  authStatus: "loading",
  isSubmittingRequest: false,
  authInitialized: false
};

const elements = {
  storefrontTitle: document.querySelector("#storefront-title"),
  categorySidebar: document.querySelector("#category-sidebar"),
  categoryRail: document.querySelector("#category-rail"),
  featuredStrip: document.querySelector("#featured-strip"),
  featuredCount: document.querySelector("#featured-count"),
  catalogueGrid: document.querySelector("#catalogue-grid"),
  catalogueSearch: document.querySelector("#catalogue-search"),
  catalogueStatus: document.querySelector("#catalogue-status"),
  catalogueSort: document.querySelector("#catalogue-sort"),
  activeFilters: document.querySelector("#active-filters"),
  cartItems: document.querySelector("#cart-items"),
  cartTotal: document.querySelector("#cart-total"),
  cartCount: document.querySelector("#cart-count"),
  headerCartCount: document.querySelector("#header-cart-count"),
  clearCartButton: document.querySelector("#clear-cart-button"),
  pickupNotice: document.querySelector("#pickup-notice"),
  pickupLocation: document.querySelector("#pickup-location"),
  headerPickupLocation: document.querySelector("#header-pickup-location"),
  headerLeadTimeCopy: document.querySelector("#header-lead-time-copy"),
  headerAccountName: document.querySelector("#header-account-name"),
  headerAccountSubtitle: document.querySelector("#header-account-subtitle"),
  contactPhone: document.querySelector("#contact-phone"),
  leadTime: document.querySelector("#lead-time"),
  publishedAt: document.querySelector("#published-at"),
  publishMeta: document.querySelector("#publish-meta"),
  authStateBadge: document.querySelector("#auth-state-badge"),
  authMessage: document.querySelector("#auth-message"),
  googleSignInButton: document.querySelector("#google-signin-button"),
  googleSignOutButton: document.querySelector("#google-signout-button"),
  requestForm: document.querySelector("#pickup-request-form"),
  customerName: document.querySelector("#customer-name"),
  customerEmail: document.querySelector("#customer-email"),
  customerEmailHint: document.querySelector("#customer-email-hint"),
  customerPhone: document.querySelector("#customer-phone"),
  customerAddress: document.querySelector("#customer-address"),
  pickupDate: document.querySelector("#pickup-date"),
  pickupTime: document.querySelector("#pickup-time"),
  pickupTimeHour: document.querySelector("#pickup-time-hour"),
  pickupTimeMinute: document.querySelector("#pickup-time-minute"),
  pickupTimeMeridiem: document.querySelector("#pickup-time-meridiem"),
  customerNotes: document.querySelector("#customer-notes"),
  reviewRequestButton: document.querySelector("#review-request-button"),
  browseCatalogueButton: document.querySelector("#browse-catalogue-button"),
  heroJumpRequestButton: document.querySelector("#hero-jump-request-button"),
  jumpToRequestButton: document.querySelector("#jump-to-request-button"),
  resultsPanel: document.querySelector("#catalogue-results"),
  heroShowcase: document.querySelector("#hero-showcase"),
  storefrontPage: document.querySelector("#storefront-page"),
  cartPage: document.querySelector("#cart-page"),
  checkoutPage: document.querySelector("#checkout-page"),
  cartContinueShoppingButton: document.querySelector("#cart-continue-shopping-button"),
  checkoutContinueShoppingButton: document.querySelector("#checkout-continue-shopping-button"),
  checkoutBackToCartButton: document.querySelector("#checkout-back-to-cart-button"),
  checkoutButton: document.querySelector("#checkout-button"),
  checkoutItems: document.querySelector("#checkout-items"),
  checkoutTotal: document.querySelector("#checkout-total"),
  checkoutCount: document.querySelector("#checkout-count"),
  modalEyebrow: document.querySelector("#modal-eyebrow"),
  modalTitle: document.querySelector("#modal-title"),
  modalShell: document.querySelector("#request-preview-modal"),
  modalBody: document.querySelector("#modal-body"),
  closeModalButton: document.querySelector("#close-modal-button"),
  closeModalFooterButton: document.querySelector("#close-modal-footer-button"),
  productModalShell: document.querySelector("#product-preview-modal"),
  productModalBody: document.querySelector("#product-modal-body"),
  closeProductModalButton: document.querySelector("#close-product-modal-button")
};

async function initializePortal() {
  bindEvents();
  hydrateStoredUser();
  initializeAuthIntegration();
  await loadCatalogue();
  syncPickupTimeField();
  render();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePortal, { once: true });
} else {
  void initializePortal();
}

function initializeAuthIntegration() {
  if (!googleClientId) {
    state.currentUser = null;
    clearStoredUser();
    state.authStatus = "unavailable";
    renderAuthState("Google sign-in is not configured for this portal yet.");
    return;
  }

  if (!window.google?.accounts?.id) {
    state.authStatus = "loading";
    renderAuthState("Loading Google sign-in...");
    window.onGoogleLibraryLoad = () => {
      initializeAuthIntegration();
    };
    return;
  }

  if (state.authInitialized) {
    renderAuthState();
    return;
  }

  google.accounts.id.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
    ux_mode: "popup"
  });
  google.accounts.id.renderButton(elements.googleSignInButton, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "pill",
    logo_alignment: "left"
  });

  state.authStatus = "ready";
  state.authInitialized = true;
  renderAuthState();
}

function bindEvents() {
  elements.catalogueSearch.addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    setCurrentPage("storefront");
    renderCatalogueWorkspace();
  });

  elements.catalogueSort.addEventListener("change", (event) => {
    state.sort = event.target.value || "featured";
    setCurrentPage("storefront");
    renderCatalogueWorkspace();
  });

  elements.categorySidebar.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category-id]");
    if (!button) return;
    state.categoryId = button.dataset.categoryId;
    setCurrentPage("storefront");
    renderCatalogueWorkspace();
  });

  elements.categoryRail.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category-id]");
    if (!button) return;
    state.categoryId = button.dataset.categoryId;
    setCurrentPage("storefront");
    renderCatalogueWorkspace();
  });

  elements.featuredStrip.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action][data-item-id]");
    if (!button) return;
    handleItemAction(button.dataset.action, button.dataset.itemId);
  });

  elements.catalogueGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action][data-item-id]");
    if (!button) return;
    handleItemAction(button.dataset.action, button.dataset.itemId);
  });

  elements.activeFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-clear]");
    if (!button) return;

    if (button.dataset.clear === "category") {
      state.categoryId = "all";
    }

    if (button.dataset.clear === "query") {
      state.query = "";
      elements.catalogueSearch.value = "";
    }

    setCurrentPage("storefront");
    renderCatalogueWorkspace();
  });

  elements.cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-cart-action]");
    if (!button) return;

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

  elements.googleSignOutButton?.addEventListener("click", () => {
    try {
      if (window.google?.accounts?.id) {
        google.accounts.id.disableAutoSelect();
      }
      state.currentUser = null;
      clearStoredUser();
      renderAuthState();
    } catch (error) {
      console.error("[Pickup Portal] Google sign-out failed:", error);
      renderAuthState("Could not sign out of the pickup portal session.");
    }
  });

  [elements.pickupTimeHour, elements.pickupTimeMinute, elements.pickupTimeMeridiem].forEach((control) => {
    control?.addEventListener("change", syncPickupTimeField);
  });

  elements.requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitPickupRequest();
  });

  elements.browseCatalogueButton.addEventListener("click", () => {
    setCurrentPage("storefront");
    elements.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  elements.heroJumpRequestButton.addEventListener("click", () => {
    setCurrentPage("cart");
  });

  elements.jumpToRequestButton.addEventListener("click", () => {
    setCurrentPage("cart");
  });

  elements.cartContinueShoppingButton.addEventListener("click", () => {
    setCurrentPage("storefront");
  });

  elements.checkoutContinueShoppingButton.addEventListener("click", () => {
    setCurrentPage("storefront");
  });

  elements.checkoutBackToCartButton.addEventListener("click", () => {
    setCurrentPage("cart");
  });

  elements.checkoutButton.addEventListener("click", () => {
    if (!state.cart.size) {
      setCurrentPage("storefront");
      return;
    }

    setCurrentPage("checkout");
  });

  elements.closeModalButton.addEventListener("click", closeRequestPreviewModal);
  elements.closeModalFooterButton.addEventListener("click", closeRequestPreviewModal);
  elements.modalShell.addEventListener("click", (event) => {
    if (event.target === elements.modalShell) {
      closeRequestPreviewModal();
    }
  });

  elements.closeProductModalButton.addEventListener("click", closeProductModal);
  elements.productModalShell.addEventListener("click", (event) => {
    if (event.target === elements.productModalShell) {
      closeProductModal();
    }
  });
}

function renderAuthState(messageOverride = "") {
  const user = state.currentUser;
  const signedIn = Boolean(user?.email);
  const unavailable = state.authStatus === "unavailable";
  const loading = state.authStatus === "loading";

  elements.authStateBadge.textContent = unavailable
    ? "Sign-In Unavailable"
    : loading
      ? "Loading Sign-In"
    : signedIn
      ? "Signed In"
      : "Google Sign-In";
  elements.authStateBadge.dataset.state = unavailable
    ? "unavailable"
    : loading
      ? "loading"
    : signedIn
      ? "signed-in"
      : "ready";

  if (signedIn) {
    elements.authMessage.textContent = `${user.email} will be attached to this pickup request.`;
    elements.googleSignInButton.classList.add("hidden");
    elements.googleSignOutButton.classList.remove("hidden");
    elements.headerAccountName.textContent = user.displayName || user.email;
    elements.headerAccountSubtitle.textContent = user.email;
  } else if (messageOverride) {
    elements.authMessage.textContent = messageOverride;
    elements.googleSignInButton.classList.toggle("hidden", unavailable);
    elements.googleSignOutButton.classList.add("hidden");
    elements.headerAccountName.textContent = unavailable ? "Portal sign-in unavailable" : "Guest shopper";
    elements.headerAccountSubtitle.textContent = unavailable
      ? "Add a Google client ID to enable sign-in"
      : "Sign in to attach your email";
  } else if (unavailable) {
    elements.authMessage.textContent =
      "Google sign-in is not configured for this portal yet.";
    elements.googleSignInButton.classList.add("hidden");
    elements.googleSignOutButton.classList.add("hidden");
    elements.headerAccountName.textContent = "Portal sign-in unavailable";
    elements.headerAccountSubtitle.textContent = "Add a Google client ID to enable sign-in";
  } else if (loading) {
    elements.authMessage.textContent = "Loading Google sign-in...";
    elements.googleSignInButton.classList.remove("hidden");
    elements.googleSignOutButton.classList.add("hidden");
    elements.headerAccountName.textContent = "Guest shopper";
    elements.headerAccountSubtitle.textContent = "Preparing Google sign-in";
  } else {
    elements.authMessage.textContent =
      "Sign in with Google so Moneta can capture your email on the pickup request.";
    elements.googleSignInButton.classList.remove("hidden");
    elements.googleSignOutButton.classList.add("hidden");
    elements.headerAccountName.textContent = "Guest shopper";
    elements.headerAccountSubtitle.textContent = "Sign in to attach your email";
  }

  syncRequestIdentityFields();
  renderCart();
}

function syncRequestIdentityFields() {
  const user = state.currentUser;

  if (user?.displayName) {
    elements.customerName.value = user.displayName;
    elements.customerName.dataset.identitySource = "google";
  } else if (elements.customerName.dataset.identitySource === "google") {
    elements.customerName.value = "";
    delete elements.customerName.dataset.identitySource;
  }

  if (user?.email) {
    elements.customerEmail.value = user.email;
    elements.customerEmail.readOnly = true;
    elements.customerEmail.dataset.identitySource = "google";
    elements.customerEmailHint.textContent = "Captured from Google sign-in for the pickup request.";
  } else {
    if (elements.customerEmail.dataset.identitySource === "google") {
      elements.customerEmail.value = "";
      delete elements.customerEmail.dataset.identitySource;
    }

    elements.customerEmail.readOnly = true;
    elements.customerEmailHint.textContent =
      state.authStatus === "unavailable"
        ? "Google sign-in is not configured for this portal yet."
        : state.authStatus === "loading"
          ? "Google sign-in is still loading."
        : "Sign in with Google to continue checkout with the shopper email.";
  }
}

function handleGoogleCredentialResponse(response) {
  try {
    const payload = decodeJwtPayload(response?.credential || "");
    if (!payload?.email) {
      throw new Error("Google sign-in did not return an email address.");
    }

    state.currentUser = {
      id: payload.sub || "",
      email: payload.email || "",
      emailVerified: Boolean(payload.email_verified),
      displayName: payload.name || payload.given_name || payload.email || "",
      givenName: payload.given_name || "",
      familyName: payload.family_name || "",
      picture: payload.picture || "",
      credential: response.credential || "",
      selectBy: response.select_by || ""
    };

    persistCurrentUser();
    renderAuthState();
  } catch (error) {
    console.error("[Pickup Portal] Google sign-in failed:", error);
    state.currentUser = null;
    clearStoredUser();
    renderAuthState(error.message || "Could not complete Google sign-in.");
  }
}

function hydrateStoredUser() {
  try {
    const raw = window.sessionStorage.getItem(portalUserStorageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed?.email) {
      state.currentUser = parsed;
    }
  } catch (error) {
    console.warn("[Pickup Portal] Could not restore stored Google session.", error);
  }
}

function persistCurrentUser() {
  if (!state.currentUser?.email) return;

  try {
    window.sessionStorage.setItem(
      portalUserStorageKey,
      JSON.stringify({
        id: state.currentUser.id || "",
        email: state.currentUser.email || "",
        emailVerified: Boolean(state.currentUser.emailVerified),
        displayName: state.currentUser.displayName || "",
        givenName: state.currentUser.givenName || "",
        familyName: state.currentUser.familyName || "",
        picture: state.currentUser.picture || ""
      })
    );
  } catch (error) {
    console.warn("[Pickup Portal] Could not persist Google session.", error);
  }
}

function clearStoredUser() {
  try {
    window.sessionStorage.removeItem(portalUserStorageKey);
  } catch (error) {
    console.warn("[Pickup Portal] Could not clear stored Google session.", error);
  }
}

function decodeJwtPayload(token) {
  const parts = String(token || "").split(".");
  if (parts.length < 2) {
    throw new Error("Google credential was not a valid ID token.");
  }

  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4 || 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function loadCatalogue() {
  try {
    const response = await fetch("./data/catalogue.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Catalogue request failed with ${response.status}`);
    }

    state.catalogue = prepareCatalogue(await response.json());
    state.source = "published-json";
    state.sourceError = "";
  } catch (error) {
    if (canUseSamplePreview) {
      console.warn("[Pickup Portal] Using fallback catalogue preview.", error);
      state.catalogue = prepareCatalogue(fallbackCatalogue);
      state.source = "embedded-fallback";
      state.sourceError = error.message || "Could not load published catalogue JSON.";
      return;
    }

    console.error("[Pickup Portal] Published catalogue JSON failed to load.", error);
    state.catalogue = prepareCatalogue(emptyCatalogue);
    state.source = "load-error";
    state.sourceError = error.message || "Could not load published catalogue JSON.";
  }
}

function prepareCatalogue(catalogue = {}) {
  const categories = Array.isArray(catalogue.categories) ? catalogue.categories : [];
  const items = Array.isArray(catalogue.items) ? catalogue.items : [];

  return {
    ...catalogue,
    categories,
    items: items.map((item, index) => ({
      ...item,
      __position: index
    }))
  };
}

function setCurrentPage(page) {
  state.currentPage = page;
  renderPages();

  const target =
    page === "cart"
      ? elements.cartPage
      : page === "checkout"
        ? elements.checkoutPage
        : elements.resultsPanel;

  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderPages() {
  const isStorefront = state.currentPage === "storefront";
  const isCart = state.currentPage === "cart";
  const isCheckout = state.currentPage === "checkout";

  elements.heroShowcase.classList.toggle("commerce-page-hidden", !isStorefront);
  elements.storefrontPage.classList.toggle("commerce-page-hidden", !isStorefront);
  elements.cartPage.classList.toggle("commerce-page-hidden", !isCart);
  elements.checkoutPage.classList.toggle("commerce-page-hidden", !isCheckout);
}

function render() {
  renderPages();
  renderHeader();
  renderFeatured();
  renderCatalogueWorkspace();
  renderCart();
}

function renderHeader() {
  const catalogue = state.catalogue || fallbackCatalogue;
  const publishedLabel = formatDateTime(catalogue.publishedAt);

  document.title = `${catalogue.catalogueName || "Pickup Requests"} · Moneta`;
  elements.storefrontTitle.textContent = catalogue.catalogueName || "Church Pickup Requests";
  elements.pickupNotice.textContent =
    state.source === "load-error"
      ? "The published pickup catalogue could not be loaded. Confirm that pickup-portal/data/catalogue.json has been published to this site."
      : catalogue.pickupNotice || "Pickup notice not configured.";
  elements.pickupLocation.textContent = catalogue.pickupLocation || "Not set";
  elements.headerPickupLocation.textContent = catalogue.pickupLocation || "Not set";
  elements.contactPhone.textContent = catalogue.contactPhone || "Not set";
  elements.leadTime.textContent = `${catalogue.requestLeadTimeHours || 0} hours`;
  elements.headerLeadTimeCopy.textContent =
    catalogue.requestLeadTimeHours
      ? `Ready in about ${catalogue.requestLeadTimeHours} hours`
      : "Ready after confirmation";
  elements.publishedAt.textContent = publishedLabel;
  elements.publishMeta.textContent =
    state.source === "published-json"
      ? `Published JSON loaded · ${publishedLabel}`
      : state.source === "load-error"
        ? `Published JSON unavailable · ${state.sourceError || "Check that data/catalogue.json exists on the site."}`
      : `Fallback preview loaded · ${publishedLabel}`;
}

function renderFeatured() {
  const featuredItems = getFeaturedItems();
  elements.featuredCount.textContent = `${featuredItems.length} items`;

  if (!featuredItems.length) {
    elements.featuredStrip.innerHTML = `<p class="panel-meta">No featured items available yet.</p>`;
    return;
  }

  elements.featuredStrip.innerHTML = featuredItems
    .map((item) => `
      <article class="featured-card">
        <div class="featured-card-copy">
          <div class="product-category">${escapeHtml(getCategoryName(item.categoryId))}</div>
          <div class="featured-card-name">${escapeHtml(item.name)}</div>
          <div class="featured-card-meta">${escapeHtml(item.unitLabel || "each")} · ${formatCurrency(item.price)}</div>
        </div>
        <div class="featured-card-actions">
          <button class="product-details-button featured-card-view" type="button" data-action="details" data-item-id="${escapeHtml(item.id)}">
            View
          </button>
          <button class="featured-card-button" type="button" data-action="add" data-item-id="${escapeHtml(item.id)}">
            Add
          </button>
        </div>
      </article>
    `)
    .join("");
}

function renderCatalogueWorkspace() {
  renderCategorySidebar();
  renderActiveFilters();
  renderCatalogue();
}

function renderCategorySidebar() {
  const categories = state.catalogue?.categories || [];
  const counts = getCategoryCounts();
  const categoryButtons = [
    {
      id: "all",
      name: "All Items",
      count: state.catalogue?.items.filter((item) => item.isAvailable !== false).length || 0
    },
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      count: counts.get(category.id) || 0
    }))
  ];

  elements.categorySidebar.innerHTML = categoryButtons
    .map((category) => `
      <button
        class="category-button${state.categoryId === category.id ? " active" : ""}"
        type="button"
        data-category-id="${escapeHtml(category.id)}"
      >
        <span>${escapeHtml(category.name)}</span>
        <span class="category-button-count">${category.count}</span>
      </button>
    `)
    .join("");

  elements.categoryRail.innerHTML = categoryButtons
    .map((category) => `
      <button
        class="category-rail-button${state.categoryId === category.id ? " active" : ""}"
        type="button"
        data-category-id="${escapeHtml(category.id)}"
      >
        <span>${escapeHtml(category.name)}</span>
        <strong>${category.count}</strong>
      </button>
    `)
    .join("");
}

function renderActiveFilters() {
  const chips = [];

  if (state.categoryId !== "all") {
    chips.push(`
      <div class="active-filter-chip">
        Category: ${escapeHtml(getCategoryName(state.categoryId))}
        <button type="button" data-clear="category" aria-label="Clear category filter">×</button>
      </div>
    `);
  }

  if (state.query) {
    chips.push(`
      <div class="active-filter-chip">
        Search: ${escapeHtml(state.query)}
        <button type="button" data-clear="query" aria-label="Clear search filter">×</button>
      </div>
    `);
  }

  elements.activeFilters.innerHTML = chips.join("");
}

function renderCatalogue() {
  const items = getFilteredItems();
  const totalItems = (state.catalogue?.items || []).filter((item) => item.isAvailable !== false).length;

  if (state.source === "load-error") {
    elements.catalogueStatus.textContent =
      "Published catalogue unavailable. Republish pickup-portal/data/catalogue.json and refresh this page.";
    elements.catalogueGrid.innerHTML = `
      <div class="empty-state">
        <p>No published items are available because the portal could not load its catalogue snapshot.</p>
      </div>
    `;
    return;
  }

  elements.catalogueStatus.textContent =
    items.length === totalItems && state.categoryId === "all" && !state.query
      ? `${totalItems} published items are ready for pickup request preview`
      : `${items.length} of ${totalItems} published items match the current browse state`;

  if (!items.length) {
    elements.catalogueGrid.innerHTML = `
      <div class="empty-state">
        <p>No published items match this search yet. Try another category or clear the current query.</p>
      </div>
    `;
    return;
  }

  elements.catalogueGrid.innerHTML = items
    .map((item) => {
      return `
        <article class="product-card">
          <div class="product-card-top">
            <span class="status-badge">${escapeHtml(item.badge || "Pickup Request")}</span>
            <span class="request-note-badge">Manual confirmation</span>
          </div>
          <div class="product-media">${escapeHtml(item.imageLabel || item.name.slice(0, 1))}</div>
          <div class="product-copy">
            <div class="product-category">${escapeHtml(getCategoryName(item.categoryId))}</div>
            <h4>${escapeHtml(item.name)}</h4>
            <p class="product-description">${escapeHtml(item.description || "No description yet.")}</p>
          </div>
          <div class="product-pricing">
            <div class="price-block">
              <strong class="price-tag">${formatCurrency(item.price)}</strong>
              <span class="unit-copy">${escapeHtml(item.unitLabel || "each")}</span>
            </div>
            <span class="inline-meta">Ready after confirmation</span>
          </div>
          <div class="product-actions">
            <button class="product-details-button" type="button" data-action="details" data-item-id="${escapeHtml(item.id)}">
              View details
            </button>
            <button type="button" data-action="add" data-item-id="${escapeHtml(item.id)}">
              Add
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCart() {
  const cartEntries = getCartEntries();
  const cartLineCount = cartEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const cartTotal = cartEntries.reduce((sum, entry) => sum + entry.total, 0);
  const hasSignedInEmail = Boolean(state.currentUser?.email);
  const canSubmitRequest = Boolean(cartEntries.length && hasSignedInEmail && intakeEndpointUrl && !state.isSubmittingRequest);

  elements.cartCount.textContent = String(cartLineCount);
  elements.cartTotal.textContent = formatCurrency(cartTotal);
  elements.checkoutCount.textContent = String(cartLineCount);
  elements.checkoutTotal.textContent = formatCurrency(cartTotal);
  elements.headerCartCount.textContent = cartLineCount > 99 ? "99+" : String(cartLineCount);
  elements.reviewRequestButton.textContent = state.isSubmittingRequest
    ? "Submitting..."
    : "Submit Pickup Request";

  if (!cartEntries.length) {
    elements.cartItems.innerHTML = `
      <p class="cart-empty">
        Add published items from the catalogue to build your shopping cart.
      </p>
    `;
    elements.checkoutItems.innerHTML = `
      <p class="cart-empty">
        Your checkout summary will appear here after you add items to the cart.
      </p>
    `;
    elements.checkoutButton.disabled = true;
    elements.reviewRequestButton.disabled = true;
    return;
  }

  const cartMarkup = cartEntries
    .map(({ item, quantity, total }) => `
      <article class="cart-item">
        <div class="cart-item-head">
          <div>
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            <div class="cart-item-meta">${escapeHtml(item.unitLabel || "each")} · ${formatCurrency(item.price)}</div>
          </div>
          <button type="button" class="icon-button" data-cart-action="remove" data-item-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">
            ×
          </button>
        </div>
        <div class="cart-item-tail">
          <div class="qty-controls">
            <button type="button" data-cart-action="decrease" data-item-id="${escapeHtml(item.id)}" aria-label="Decrease quantity">−</button>
            <strong>${quantity}</strong>
            <button type="button" data-cart-action="increase" data-item-id="${escapeHtml(item.id)}" aria-label="Increase quantity">+</button>
          </div>
          <strong>${formatCurrency(total)}</strong>
        </div>
      </article>
    `)
    .join("");

  elements.cartItems.innerHTML = cartMarkup;
  elements.checkoutItems.innerHTML = cartMarkup;
  elements.checkoutButton.disabled = false;
  elements.reviewRequestButton.disabled = !canSubmitRequest;
}

function getFilteredItems() {
  const items = (state.catalogue?.items || []).filter((item) => item.isAvailable !== false);

  const filtered = items.filter((item) => {
    const matchesCategory = state.categoryId === "all" || item.categoryId === state.categoryId;
    const haystack = `${item.name} ${item.description || ""}`.toLowerCase();
    const matchesQuery = !state.query || haystack.includes(state.query);
    return matchesCategory && matchesQuery;
  });

  return filtered.sort((left, right) => compareItems(left, right));
}

function compareItems(left, right) {
  if (state.sort === "price-asc") {
    return Number(left.price || 0) - Number(right.price || 0);
  }

  if (state.sort === "price-desc") {
    return Number(right.price || 0) - Number(left.price || 0);
  }

  if (state.sort === "name-asc") {
    return String(left.name || "").localeCompare(String(right.name || ""));
  }

  const leftFeatured = Boolean(left.featured);
  const rightFeatured = Boolean(right.featured);
  if (leftFeatured !== rightFeatured) {
    return leftFeatured ? -1 : 1;
  }

  return Number(left.__position || 0) - Number(right.__position || 0);
}

function getFeaturedItems() {
  const availableItems = (state.catalogue?.items || []).filter((item) => item.isAvailable !== false);
  const featured = availableItems.filter((item) => item.featured);
  return (featured.length ? featured : availableItems).slice(0, 3);
}

function getCategoryCounts() {
  return (state.catalogue?.items || []).reduce((counts, item) => {
    if (item.isAvailable === false) {
      return counts;
    }

    counts.set(item.categoryId, (counts.get(item.categoryId) || 0) + 1);
    return counts;
  }, new Map());
}

function getCategoryName(categoryId) {
  return state.catalogue?.categories?.find((category) => category.id === categoryId)?.name || "Uncategorized";
}

function getItemById(itemId) {
  return state.catalogue?.items?.find((item) => item.id === itemId) || null;
}

function handleItemAction(action, itemId) {
  if (action === "add") {
    addToCart(itemId);
    return;
  }

  if (action === "details") {
    openProductModal(itemId);
  }
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
      if (!item) return null;

      return {
        item,
        quantity,
        total: Number(item.price || 0) * quantity
      };
    })
    .filter(Boolean);
}

function openProductModal(itemId) {
  const item = getItemById(itemId);
  if (!item) return;

  state.activeItemId = itemId;
  elements.productModalBody.innerHTML = `
    <div class="product-modal-layout">
      <div class="product-modal-media">${escapeHtml(item.imageLabel || item.name.slice(0, 1))}</div>
      <div class="product-modal-copy">
        <div class="product-category">${escapeHtml(getCategoryName(item.categoryId))}</div>
        <h4>${escapeHtml(item.name)}</h4>
        <p>${escapeHtml(item.description || "No description yet.")}</p>

        <div class="product-modal-metrics">
          <section class="summary-card">
            <span class="metric-label">Published Price</span>
            <strong>${formatCurrency(item.price)}</strong>
          </section>
          <section class="summary-card">
            <span class="metric-label">Unit</span>
            <strong>${escapeHtml(item.unitLabel || "each")}</strong>
          </section>
          <section class="summary-card">
            <span class="metric-label">Pickup Flow</span>
            <strong>Request first</strong>
          </section>
          <section class="summary-card">
            <span class="metric-label">Fulfilment</span>
            <strong>After staff confirmation</strong>
          </section>
        </div>

        <div class="product-modal-actions">
          <button class="primary-button" type="button" data-product-modal-add="${escapeHtml(item.id)}">
            Add to Cart
          </button>
          <button class="secondary-button" type="button" data-product-modal-close="true">
            Close
          </button>
        </div>
      </div>
    </div>
  `;

  elements.productModalBody
    .querySelector("[data-product-modal-add]")
    ?.addEventListener("click", (event) => {
      addToCart(event.currentTarget.dataset.productModalAdd);
      closeProductModal();
    });

  elements.productModalBody
    .querySelector("[data-product-modal-close]")
    ?.addEventListener("click", closeProductModal);

  elements.productModalShell.classList.remove("hidden");
  elements.productModalShell.setAttribute("aria-hidden", "false");
}

function closeProductModal() {
  state.activeItemId = "";
  elements.productModalShell.classList.add("hidden");
  elements.productModalShell.setAttribute("aria-hidden", "true");
}

async function submitPickupRequest() {
  const cartEntries = getCartEntries();
  if (!cartEntries.length) return;
  syncPickupTimeField();

  if (!state.currentUser?.email) {
    openStatusModal({
      eyebrow: "Google sign-in required",
      title: "Sign in before checkout",
      body: `
        <p class="inline-note">
          Checkout uses the signed-in Google account email for the pickup request. Please sign in and try again.
        </p>
      `
    });
    return;
  }

  if (!intakeEndpointUrl) {
    openStatusModal({
      eyebrow: "Configuration needed",
      title: "Pickup intake endpoint not configured",
      body: `
        <p class="inline-note">
          Add <code>window.pickupPortalConfig.intakeEndpointUrl</code> in <code>pickup-portal/index.html</code> so checkout can send requests to Apps Script.
        </p>
      `
    });
    return;
  }

  if (!elements.requestForm.reportValidity()) {
    return;
  }

  const formData = new FormData(elements.requestForm);
  const total = cartEntries.reduce((sum, entry) => sum + entry.total, 0);
  const body = buildIntakeSubmission(formData, cartEntries, total);

  state.isSubmittingRequest = true;
  renderCart();

  try {
    await fetch(intakeEndpointUrl, {
      method: "POST",
      mode: "no-cors",
      body
    });

    const addressText = String(formData.get("customerAddress") || "").trim();
    const requestLines = cartEntries
      .map(
        ({ item, quantity, total: lineTotal }) =>
          `<li>${escapeHtml(item.name)} · Qty ${quantity} · ${formatCurrency(lineTotal)}</li>`
      )
      .join("");

    state.cart.clear();
    elements.requestForm.reset();
    syncPickupTimeField();
    syncRequestIdentityFields();
    setCurrentPage("storefront");

    openStatusModal({
      eyebrow: "Request sent",
      title: "Pickup request submitted",
      body: `
        <p class="inline-note">
          Your request was sent to the church store intake. Staff will confirm availability before pickup.
        </p>

        <div class="summary-grid">
          <section class="summary-card">
            <span class="metric-label">Customer</span>
            <strong>${escapeHtml(formData.get("customerName") || "Not provided")}</strong>
          </section>
          <section class="summary-card">
            <span class="metric-label">Email</span>
            <strong>${escapeHtml(formData.get("customerEmail") || "Not provided")}</strong>
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
          <section class="summary-card">
            <span class="metric-label">Address</span>
            <strong>${escapeHtml(addressText || "Not provided")}</strong>
          </section>
        </div>

        <section class="summary-lines">
          <span class="metric-label">Requested Items</span>
          <ul>${requestLines}</ul>
        </section>

        <div class="summary-grid">
          <section class="summary-card">
            <span class="metric-label">Estimated Total</span>
            <strong>${formatCurrency(total)}</strong>
          </section>
          <section class="summary-card">
            <span class="metric-label">Pickup Location</span>
            <strong>${escapeHtml(state.catalogue?.pickupLocation || "Not provided")}</strong>
          </section>
        </div>
      `
    });
  } catch (error) {
    console.error("[Pickup Portal] Request submission failed:", error);
    openStatusModal({
      eyebrow: "Submission failed",
      title: "Could not send pickup request",
      body: `
        <p class="inline-note">
          The portal could not reach the pickup intake service. Please try again, or contact the church store team if this keeps happening.
        </p>
      `
    });
  } finally {
    state.isSubmittingRequest = false;
    renderCart();
  }
}

function buildIntakeSubmission(formData, cartEntries, total) {
  const lineItems = cartEntries.map(({ item, quantity, total: lineTotal }) => ({
    catalogueItemId: item.id,
    productId: item.productId || "",
    name: item.name,
    quantity,
    price: Number(item.price || 0),
    lineTotal,
    categoryId: item.categoryId || "",
    unitLabel: item.unitLabel || "each"
  }));

  return new URLSearchParams({
    customerName: String(formData.get("customerName") || ""),
    customerEmail: String(formData.get("customerEmail") || ""),
    customerPhone: String(formData.get("customerPhone") || ""),
    addressLine1: String(formData.get("customerAddress") || ""),
    addressLine2: "",
    pickupDate: String(formData.get("pickupDate") || ""),
    pickupTime: String(formData.get("pickupTime") || ""),
    notes: String(formData.get("notes") || ""),
    itemsJson: JSON.stringify(lineItems),
    subtotal: String(total),
    itemCount: String(cartEntries.reduce((sum, entry) => sum + entry.quantity, 0)),
    currency: String(state.catalogue?.currency || "INR"),
    catalogueId: String(state.catalogue?.catalogueId || ""),
    catalogueName: String(state.catalogue?.catalogueName || ""),
    cataloguePublishedAt: String(state.catalogue?.publishedAt || ""),
    pickupLocation: String(state.catalogue?.pickupLocation || ""),
    source: "moneta-pickup-portal"
  });
}

function syncPickupTimeField() {
  const hour = String(elements.pickupTimeHour?.value || "").trim();
  const minute = String(elements.pickupTimeMinute?.value || "").trim();
  const meridiem = String(elements.pickupTimeMeridiem?.value || "").trim();

  if (!hour || !minute || !meridiem) {
    elements.pickupTime.value = "";
    return;
  }

  elements.pickupTime.value = `${hour}:${minute} ${meridiem}`;
}

function openStatusModal({ eyebrow, title, body }) {
  elements.modalEyebrow.textContent = eyebrow;
  elements.modalTitle.textContent = title;
  elements.modalBody.innerHTML = body;
  elements.modalShell.classList.remove("hidden");
  elements.modalShell.setAttribute("aria-hidden", "false");
}

function openRequestPreviewModal() {
  const cartEntries = getCartEntries();
  if (!cartEntries.length) return;
  if (!state.currentUser?.email) return;

  const formData = new FormData(elements.requestForm);
  const total = cartEntries.reduce((sum, entry) => sum + entry.total, 0);
  const addressText = String(formData.get("customerAddress") || "").trim();
  const requestLines = cartEntries
    .map(
      ({ item, quantity, total: lineTotal }) =>
        `<li>${escapeHtml(item.name)} · Qty ${quantity} · ${formatCurrency(lineTotal)}</li>`
    )
    .join("");

  openStatusModal({
    eyebrow: "Pickup request",
    title: "Pickup request summary",
    body: `
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
          <span class="metric-label">Email</span>
          <strong>${escapeHtml(formData.get("customerEmail") || "Not provided")}</strong>
        </section>
        <section class="summary-card">
          <span class="metric-label">Requested Pickup Date</span>
          <strong>${escapeHtml(formData.get("pickupDate") || "Not provided")}</strong>
        </section>
        <section class="summary-card">
          <span class="metric-label">Requested Pickup Time</span>
          <strong>${escapeHtml(formData.get("pickupTime") || "Not provided")}</strong>
        </section>
        <section class="summary-card">
          <span class="metric-label">Address</span>
          <strong>${escapeHtml(addressText || "Not provided")}</strong>
        </section>
      </div>

      <section class="summary-lines">
        <span class="metric-label">Selected Items</span>
        <ul>${requestLines}</ul>
      </section>

      <div class="summary-grid">
        <section class="summary-card">
          <span class="metric-label">Estimated Total</span>
          <strong>${formatCurrency(total)}</strong>
        </section>
        <section class="summary-card">
          <span class="metric-label">Pickup Location</span>
          <strong>${escapeHtml(state.catalogue?.pickupLocation || "Not provided")}</strong>
        </section>
      </div>

      <section class="summary-card">
        <span class="metric-label">Notes</span>
        <strong>${escapeHtml(formData.get("notes") || "No notes provided")}</strong>
      </section>
    `
  });
}

function closeRequestPreviewModal() {
  elements.modalShell.classList.add("hidden");
  elements.modalShell.setAttribute("aria-hidden", "true");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: state.catalogue?.currency || "INR",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
