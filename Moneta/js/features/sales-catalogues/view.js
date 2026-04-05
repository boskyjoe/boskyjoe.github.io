import { getState, subscribe } from "../../app/store.js";
import { showModal } from "../../shared/modal.js";
import { showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import {
    initializeAvailableProductsGrid,
    initializeCatalogueItemsGrid,
    initializeExistingCataloguesGrid,
    refreshAvailableProductsGrid,
    refreshCatalogueItemsGrid,
    refreshExistingCataloguesGrid,
    updateAvailableProductsGridSearch,
    updateCatalogueItemsGridSearch,
    updateExistingCataloguesGridSearch
} from "./grid.js";
import { subscribeToSalesCatalogueItems } from "./repository.js";
import {
    addProductToSalesCatalogue,
    removeSalesCatalogueItemRecord,
    saveSalesCatalogue,
    toggleSalesCatalogueStatus,
    updateSalesCatalogueItemPrice
} from "./service.js";

const featureState = {
    availableSearchTerm: "",
    itemsSearchTerm: "",
    cataloguesSearchTerm: "",
    editingCatalogueId: null,
    draftItems: [],
    catalogueItems: [],
    unsubscribeItems: null
};

function clearCatalogueItemsSubscription() {
    featureState.unsubscribeItems?.();
    featureState.unsubscribeItems = null;
    featureState.catalogueItems = [];
}

function resetSalesCatalogueWorkspace() {
    clearCatalogueItemsSubscription();
    featureState.editingCatalogueId = null;
    featureState.draftItems = [];
}

function getEditingCatalogue(snapshot) {
    if (!featureState.editingCatalogueId) return null;

    return (snapshot.masterData.salesCatalogues || []).find(
        catalogue => catalogue.id === featureState.editingCatalogueId
    ) || null;
}

function getWorkingItems() {
    return featureState.editingCatalogueId ? featureState.catalogueItems : featureState.draftItems;
}

function resolveSeasonName(snapshot, seasonId) {
    return snapshot.masterData.seasons.find(season => season.id === seasonId)?.seasonName || "-";
}

function enrichCatalogueItems(snapshot, items) {
    const products = snapshot.masterData.products || [];
    const categories = snapshot.masterData.categories || [];

    return (items || []).map(item => {
        const product = products.find(entry => entry.id === item.productId) || null;
        const resolvedCategoryId = item.categoryId || product?.categoryId || "";
        const resolvedCategoryName = item.categoryName
            || categories.find(category => category.id === resolvedCategoryId)?.categoryName
            || "-";

        return {
            ...item,
            categoryId: resolvedCategoryId,
            categoryName: resolvedCategoryName
        };
    });
}

function renderSeasonOptions(seasons, currentValue) {
    return seasons
        .filter(season => season.isActive || season.id === currentValue)
        .map(season => `
        <option value="${season.id}" ${season.id === currentValue ? "selected" : ""}>
            ${season.seasonName}
        </option>
    `).join("");
}

function renderSalesCatalogueForm(snapshot) {
    const editingCatalogue = getEditingCatalogue(snapshot);
    const workingItems = getWorkingItems();
    const totalCatalogues = snapshot.masterData.salesCatalogues?.length || 0;
    const activeCatalogues = snapshot.masterData.salesCatalogues?.filter(catalogue => catalogue.isActive).length || 0;

    return `
        <div class="panel-card">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.catalogue}</span>
                    <div>
                        <h2>${editingCatalogue ? "Edit Sales Catalogue" : "Sales Catalogue"}</h2>
                        <p class="panel-copy">
                            Build season-based selling catalogues from the live product master, with editable catalogue pricing.
                        </p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${totalCatalogues} catalogues</span>
                    <span class="status-pill">${activeCatalogues} active</span>
                    <span class="status-pill">${workingItems.length} items in workspace</span>
                </div>
            </div>
            <div class="panel-body">
                <form id="sales-catalogue-form">
                    <input id="sales-catalogue-doc-id" type="hidden" value="${editingCatalogue?.id || ""}">
                    <div class="form-grid">
                        <div class="field field-wide">
                            <label for="sales-catalogue-name">Catalogue Name</label>
                            <input
                                id="sales-catalogue-name"
                                class="input"
                                type="text"
                                value="${editingCatalogue?.catalogueName || ""}"
                                placeholder="Easter 2026 Front Store Catalogue"
                                required>
                        </div>
                        <div class="field">
                            <label for="sales-catalogue-season">Sales Season</label>
                            <select id="sales-catalogue-season" class="select" required>
                                <option value="">Select season</option>
                                ${renderSeasonOptions(snapshot.masterData.seasons || [], editingCatalogue?.seasonId)}
                            </select>
                        </div>
                        <div class="field">
                            <label>Workspace Mode</label>
                            <input class="input" type="text" value="${editingCatalogue ? "Live Edit" : "Draft Build"}" disabled>
                        </div>
                    </div>
                    <div class="form-actions">
                        ${editingCatalogue ? `
                            <button id="sales-catalogue-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${editingCatalogue ? icons.edit : icons.plus}</span>
                            ${editingCatalogue ? "Update Catalogue" : "Save Catalogue"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderSalesCatalogueWorkspace(snapshot) {
    const workingItems = getWorkingItems();
    const readyProducts = snapshot.masterData.products?.length || 0;

    return `
        <div class="sales-catalogue-workspace">
            <div class="panel-card">
                <div class="panel-header">
                    <div class="panel-title-wrap">
                        <span class="panel-icon">${icons.products}</span>
                        <div>
                            <h3>Available Products</h3>
                            <p class="panel-copy">Search the active product catalogue and add products into the sales worksheet.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span class="status-pill">${readyProducts} active products</span>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="toolbar">
                        <div>
                            <p class="section-kicker" style="margin-bottom: 0.25rem;">Source</p>
                            <p class="panel-copy">The add action disables automatically once a product is already in the workspace.</p>
                        </div>
                        <div class="search-wrap">
                            <span class="search-icon">${icons.search}</span>
                            <input
                                id="sales-catalogue-products-search"
                                class="input toolbar-search"
                                type="search"
                                placeholder="Search product, category, or stock"
                                value="${featureState.availableSearchTerm}">
                        </div>
                    </div>
                    <div class="ag-shell">
                        <div id="sales-catalogue-products-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                    </div>
                </div>
            </div>

            <div class="panel-card">
                <div class="panel-header">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.catalogue}</span>
                        <div>
                            <h3>Catalogue Items</h3>
                            <p class="panel-copy">
                                ${featureState.editingCatalogueId
                                    ? "You are editing the live catalogue items. Selling price edits save directly to Firestore."
                                    : "Build the draft catalogue here before saving the parent record."}
                            </p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span class="status-pill">${workingItems.length} selected products</span>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="toolbar">
                        <div>
                            <p class="section-kicker" style="margin-bottom: 0.25rem;">Worksheet</p>
                            <p class="panel-copy">Edit selling prices inline and remove products as the catalogue takes shape.</p>
                        </div>
                        <div class="search-wrap">
                            <span class="search-icon">${icons.search}</span>
                            <input
                                id="sales-catalogue-items-search"
                                class="input toolbar-search"
                                type="search"
                                placeholder="Search worksheet items"
                                value="${featureState.itemsSearchTerm}">
                        </div>
                    </div>
                    <div class="ag-shell">
                        <div id="sales-catalogue-items-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderExistingCatalogues(snapshot) {
    const totalCatalogues = snapshot.masterData.salesCatalogues?.length || 0;

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.catalogue}</span>
                    <div>
                        <h3>Existing Catalogues</h3>
                        <p class="panel-copy">Manage active and inactive catalogue headers and reopen them for price maintenance.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${totalCatalogues} records</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">History</p>
                        <p class="panel-copy">Inactive catalogues remain visible here so they can be reviewed or reactivated.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="sales-catalogues-grid-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search catalogue, season, or status"
                            value="${featureState.cataloguesSearchTerm}">
                    </div>
                </div>
                <div class="ag-shell">
                    <div id="sales-catalogues-grid" class="ag-theme-alpine moneta-grid" style="height: 520px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function syncAvailableProductsGrid(snapshot) {
    const gridElement = document.getElementById("sales-catalogue-products-grid");
    const categories = snapshot.masterData.categories || [];
    const selectedProductIds = new Set(getWorkingItems().map(item => item.productId));
    const rows = (snapshot.masterData.products || [])
        .slice()
        .sort((left, right) => (left.itemName || "").localeCompare(right.itemName || ""));

    initializeAvailableProductsGrid(gridElement, categories, selectedProductIds);
    refreshAvailableProductsGrid(rows, categories, selectedProductIds);
    updateAvailableProductsGridSearch(featureState.availableSearchTerm);
}

function syncCatalogueItemsGrid(snapshot) {
    const gridElement = document.getElementById("sales-catalogue-items-grid");
    const rows = enrichCatalogueItems(snapshot, getWorkingItems())
        .slice()
        .sort((left, right) => (left.productName || "").localeCompare(right.productName || ""));

    initializeCatalogueItemsGrid(gridElement, handleCatalogueItemPriceChange);
    refreshCatalogueItemsGrid(rows);
    updateCatalogueItemsGridSearch(featureState.itemsSearchTerm);
}

function syncExistingCataloguesGrid(snapshot) {
    const gridElement = document.getElementById("sales-catalogues-grid");
    const rows = (snapshot.masterData.salesCatalogues || [])
        .map(catalogue => ({
            ...catalogue,
            seasonName: catalogue.seasonName || resolveSeasonName(snapshot, catalogue.seasonId)
        }))
        .sort((left, right) => (left.catalogueName || "").localeCompare(right.catalogueName || ""));

    initializeExistingCataloguesGrid(gridElement);
    refreshExistingCataloguesGrid(rows);
    updateExistingCataloguesGridSearch(featureState.cataloguesSearchTerm);
}

export function renderSalesCataloguesView() {
    const root = document.getElementById("sales-catalogues-root");
    if (!root) return;

    const snapshot = getState();
    root.innerHTML = `
        <div class="section-stack">
            ${renderSalesCatalogueForm(snapshot)}
            ${renderSalesCatalogueWorkspace(snapshot)}
            ${renderExistingCatalogues(snapshot)}
        </div>
    `;

    syncAvailableProductsGrid(snapshot);
    syncCatalogueItemsGrid(snapshot);
    syncExistingCataloguesGrid(snapshot);
}

function startCatalogueItemsSubscription(catalogueId) {
    clearCatalogueItemsSubscription();

    featureState.unsubscribeItems = subscribeToSalesCatalogueItems(
        catalogueId,
        items => {
            featureState.catalogueItems = items;

            if (getState().currentRoute === "#/sales-catalogues") {
                renderSalesCataloguesView();
            }
        },
        error => {
            console.error("[Moneta] Sales catalogue items listener failed:", error);
            showToast("Could not load catalogue items.", "error");
        }
    );
}

async function handleSalesCatalogueSubmit(event) {
    event.preventDefault();

    try {
        const seasonSelect = document.getElementById("sales-catalogue-season");
        const selectedSeasonName = seasonSelect?.selectedOptions?.[0]?.textContent || "";
        const result = await saveSalesCatalogue({
            docId: document.getElementById("sales-catalogue-doc-id")?.value,
            catalogueName: document.getElementById("sales-catalogue-name")?.value,
            seasonId: seasonSelect?.value,
            seasonName: selectedSeasonName,
            items: featureState.draftItems
        }, getState().currentUser);

        resetSalesCatalogueWorkspace();
        renderSalesCataloguesView();
        showToast(result.mode === "create" ? "Sales catalogue created." : "Sales catalogue updated.", "success");
    } catch (error) {
        console.error("[Moneta] Sales catalogue save failed:", error);
        showToast(error.message || "Could not save sales catalogue.", "error");
    }
}

async function handleAddProduct(button) {
    const productId = button.dataset.productId;
    const snapshot = getState();
    const categories = snapshot.masterData.categories || [];
    const product = (snapshot.masterData.products || []).find(item => item.id === productId);

    if (!product) {
        showToast("Product record could not be found.", "error");
        return;
    }

    try {
        const item = await addProductToSalesCatalogue(
            featureState.editingCatalogueId,
            product,
            getWorkingItems(),
            snapshot.currentUser,
            categories
        );

        if (!featureState.editingCatalogueId) {
            featureState.draftItems = [...featureState.draftItems, item];
            syncAvailableProductsGrid(snapshot);
            syncCatalogueItemsGrid(snapshot);
        }

        showToast(`${product.itemName} added to the catalogue workspace.`, "success");
    } catch (error) {
        console.error("[Moneta] Add catalogue item failed:", error);
        showToast(error.message || "Could not add product to catalogue.", "error");
    }
}

async function handleCatalogueItemRemoval(button) {
    const itemId = button.dataset.itemId;

    if (!itemId) {
        showToast("Catalogue item could not be found.", "error");
        return;
    }

    if (featureState.editingCatalogueId) {
        const confirmed = await showModal({
            title: "Remove Catalogue Item",
            message: "Remove this product from the live sales catalogue?",
            confirmText: "Remove",
            cancelText: "Cancel",
            showCancel: true
        });

        if (!confirmed) return;

        try {
            await removeSalesCatalogueItemRecord(featureState.editingCatalogueId, itemId);
            showToast("Catalogue item removed.", "success");
        } catch (error) {
            console.error("[Moneta] Remove catalogue item failed:", error);
            showToast(error.message || "Could not remove catalogue item.", "error");
        }

        return;
    }

    featureState.draftItems = featureState.draftItems.filter(item => (item.tempId || item.id || item.productId) !== itemId);
    syncAvailableProductsGrid(getState());
    syncCatalogueItemsGrid(getState());
}

async function handleCatalogueItemPriceChange(params) {
    const nextPrice = Number(params.newValue);

    if (featureState.editingCatalogueId) {
        try {
            await updateSalesCatalogueItemPrice(
                featureState.editingCatalogueId,
                params.data.id,
                nextPrice,
                getState().currentUser
            );
        } catch (error) {
            console.error("[Moneta] Catalogue price update failed:", error);
            showToast(error.message || "Could not update selling price.", "error");
            renderSalesCataloguesView();
        }

        return;
    }

    const targetId = params.data.tempId || params.data.id || params.data.productId;
    const normalizedPrice = Number.isFinite(nextPrice) ? nextPrice : params.data.sellingPrice;

    featureState.draftItems = featureState.draftItems.map(item => {
        const itemKey = item.tempId || item.id || item.productId;

        if (itemKey !== targetId) {
            return item;
        }

        return {
            ...item,
            sellingPrice: normalizedPrice,
            isOverridden: true
        };
    });
}

function handleCatalogueEdit(button) {
    featureState.editingCatalogueId = button.dataset.catalogueId || null;
    featureState.draftItems = [];

    if (featureState.editingCatalogueId) {
        startCatalogueItemsSubscription(featureState.editingCatalogueId);
    }

    renderSalesCataloguesView();
}

async function handleCatalogueStatusToggle(button) {
    const catalogueId = button.dataset.catalogueId;
    const nextStatus = button.dataset.nextStatus === "true";
    const catalogue = getState().masterData.salesCatalogues.find(item => item.id === catalogueId);

    if (!catalogue) {
        showToast("Sales catalogue record could not be found.", "error");
        return;
    }

    const confirmed = await showModal({
        title: `${nextStatus ? "Activate" : "Deactivate"} Sales Catalogue`,
        message: `${nextStatus ? "Activate" : "Deactivate"} ${catalogue.catalogueName}?`,
        confirmText: nextStatus ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        showCancel: true
    });

    if (!confirmed) return;

    try {
        await toggleSalesCatalogueStatus(catalogueId, nextStatus, getState().currentUser);
        showToast(`Sales catalogue ${nextStatus ? "activated" : "deactivated"}.`, "success");
    } catch (error) {
        console.error("[Moneta] Sales catalogue status update failed:", error);
        showToast(error.message || "Could not update sales catalogue status.", "error");
    }
}

function handleCancelEdit() {
    resetSalesCatalogueWorkspace();
    renderSalesCataloguesView();
}

function handleSearchInput(target) {
    if (target.id === "sales-catalogue-products-search") {
        featureState.availableSearchTerm = target.value || "";
        updateAvailableProductsGridSearch(featureState.availableSearchTerm);
    }

    if (target.id === "sales-catalogue-items-search") {
        featureState.itemsSearchTerm = target.value || "";
        updateCatalogueItemsGridSearch(featureState.itemsSearchTerm);
    }

    if (target.id === "sales-catalogues-grid-search") {
        featureState.cataloguesSearchTerm = target.value || "";
        updateExistingCataloguesGridSearch(featureState.cataloguesSearchTerm);
    }
}

function bindSalesCatalogueDomEvents() {
    const root = document.getElementById("sales-catalogues-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("submit", event => {
        if (event.target.id === "sales-catalogue-form") {
            handleSalesCatalogueSubmit(event);
        }
    });

    root.addEventListener("input", event => {
        handleSearchInput(event.target);
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const addButton = target.closest(".sales-catalogue-add-product-button");
        const removeButton = target.closest(".sales-catalogue-remove-item-button");
        const editButton = target.closest(".sales-catalogue-edit-button");
        const statusButton = target.closest(".sales-catalogue-status-button");
        const cancelButton = target.closest("#sales-catalogue-cancel-button");

        if (addButton) {
            handleAddProduct(addButton);
            return;
        }

        if (removeButton) {
            handleCatalogueItemRemoval(removeButton);
            return;
        }

        if (editButton) {
            handleCatalogueEdit(editButton);
            return;
        }

        if (statusButton) {
            handleCatalogueStatusToggle(statusButton);
            return;
        }

        if (cancelButton) {
            handleCancelEdit();
        }
    });

    root.dataset.bound = "true";
}

export function initializeSalesCataloguesFeature() {
    bindSalesCatalogueDomEvents();

    subscribe(snapshot => {
        if (snapshot.currentRoute === "#/sales-catalogues") {
            renderSalesCataloguesView();
        }
    });
}
