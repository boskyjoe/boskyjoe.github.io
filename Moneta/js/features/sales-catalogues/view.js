import { getState, subscribe } from "../../app/store.js";
import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import {
    initializeAvailableProductsGrid,
    initializeCatalogueItemsGrid,
    initializeExistingCataloguesGrid,
    initializeSalesCataloguePriceHistoryGrid,
    refreshAvailableProductsGrid,
    refreshCatalogueItemsGrid,
    refreshExistingCataloguesGrid,
    refreshSalesCataloguePriceHistoryGrid,
    updateAvailableProductsGridSearch,
    updateCatalogueItemsGridSearch,
    updateExistingCataloguesGridSearch
} from "./grid.js";
import { getSalesCatalogueItemPriceHistory, subscribeToSalesCatalogueItems } from "./repository.js";
import {
    addProductToSalesCatalogue,
    countSyncableSalesCatalogueItems,
    enrichSalesCatalogueItem,
    removeSalesCatalogueItemRecord,
    saveSalesCatalogue,
    syncChangedSalesCatalogueItems,
    syncSalesCatalogueItemToProduct,
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
    unsubscribeItems: null,
    priceHistoryItem: null,
    priceHistoryRows: []
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
    featureState.priceHistoryItem = null;
    featureState.priceHistoryRows = [];
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

function getEnrichedCatalogueItems(snapshot, items = []) {
    const products = snapshot.masterData.products || [];
    const categories = snapshot.masterData.categories || [];
    return (items || []).map(item => enrichSalesCatalogueItem(item, products, categories));
}

function getCatalogueSyncableCount(snapshot, items = []) {
    return countSyncableSalesCatalogueItems(
        items,
        snapshot.masterData.products || [],
        snapshot.masterData.categories || []
    );
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
                            <label for="sales-catalogue-name">Catalogue Name <span class="required-mark" aria-hidden="true">*</span></label>
                            <input
                                id="sales-catalogue-name"
                                class="input"
                                type="text"
                                value="${editingCatalogue?.catalogueName || ""}"
                                placeholder="Easter 2026 Front Store Catalogue"
                                required>
                        </div>
                        <div class="field">
                            <label for="sales-catalogue-season">Sales Season <span class="required-mark" aria-hidden="true">*</span></label>
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
    const syncableCount = getCatalogueSyncableCount(snapshot, workingItems);

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
                        <span class="status-pill">${syncableCount} need sync</span>
                        ${workingItems.length > 0 ? `
                            <button
                                id="sales-catalogue-sync-all-button"
                                class="button button-secondary sales-catalogue-sync-all-button"
                                type="button"
                                ${syncableCount === 0 ? "disabled data-disabled-reason=\"All catalogue item prices are already aligned with the current product master.\"" : ""}>
                                <span class="button-icon">${icons.active}</span>
                                Sync Changed Items
                            </button>
                        ` : ""}
                    </div>
                </div>
                <div class="panel-body">
                    <div class="toolbar">
                        <div>
                            <p class="section-kicker" style="margin-bottom: 0.25rem;">Worksheet</p>
                            <p class="panel-copy">Edit selling prices inline, keep manual overrides when needed, or sync changed items back to the current product price.</p>
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

function renderSalesCataloguePriceHistoryModal() {
    const activeItem = featureState.priceHistoryItem;
    const isOpen = Boolean(activeItem);

    return `
        <div id="sales-catalogue-price-history-modal" class="purchase-payment-modal-overlay" ${isOpen ? "" : "hidden"} role="dialog" aria-modal="true" aria-labelledby="sales-catalogue-price-history-title">
            <div class="purchase-payment-modal-card" style="width:min(1180px, 100%);">
                <div class="panel-header">
                    <div class="panel-title-wrap">
                        <span class="panel-icon">${icons.catalogue}</span>
                        <div>
                            <h3 id="sales-catalogue-price-history-title">Catalogue Price History</h3>
                            <p class="panel-copy">${activeItem?.productName || "Catalogue item"} price changes, sync actions, and starting snapshot.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span class="status-pill">${featureState.priceHistoryRows.length} entries</span>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="purchase-payments-history-header">
                        <p class="panel-copy">Moneta records manual overrides, item syncs, and original catalogue-item pricing snapshots here.</p>
                    </div>
                    <div class="ag-shell purchase-payment-history-shell">
                        <div id="sales-catalogue-price-history-grid" class="ag-theme-alpine moneta-grid" style="height: 420px; width: 100%;"></div>
                    </div>
                    <div class="form-actions">
                        <button id="sales-catalogue-price-history-close-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            Close
                        </button>
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
    const rows = getEnrichedCatalogueItems(snapshot, getWorkingItems())
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
        ${renderSalesCataloguePriceHistoryModal()}
    `;

    syncAvailableProductsGrid(snapshot);
    syncCatalogueItemsGrid(snapshot);
    syncExistingCataloguesGrid(snapshot);
    syncSalesCataloguePriceHistoryGrid();
}

function syncSalesCataloguePriceHistoryGrid() {
    const gridElement = document.getElementById("sales-catalogue-price-history-grid");
    initializeSalesCataloguePriceHistoryGrid(gridElement);
    refreshSalesCataloguePriceHistoryGrid(featureState.priceHistoryRows || []);
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
        const docId = document.getElementById("sales-catalogue-doc-id")?.value;
        const catalogueName = document.getElementById("sales-catalogue-name")?.value || "-";
        const itemCount = featureState.draftItems.length;
        const result = await runProgressToastFlow({
            title: docId ? "Updating Sales Catalogue" : "Building Sales Catalogue",
            initialMessage: "Reading catalogue header and worksheet data...",
            initialProgress: 14,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Sales Catalogue Updated" : "Sales Catalogue Created",
            successMessage: docId ? "The sales catalogue was updated successfully." : "The sales catalogue was created successfully."
        }, async ({ update }) => {
            update("Validating season, catalogue details, and worksheet items...", 34, "Step 2 of 5");

            update("Writing catalogue and pricing data to the database...", 72, "Step 3 of 5");

            const result = await saveSalesCatalogue({
                docId,
                catalogueName: document.getElementById("sales-catalogue-name")?.value,
                seasonId: seasonSelect?.value,
                seasonName: selectedSeasonName,
                items: featureState.draftItems
            }, getState().currentUser);

            update("Refreshing the catalogue workspace...", 88, "Step 4 of 5");
            resetSalesCatalogueWorkspace();
            renderSalesCataloguesView();
            update("Catalogue pricing is ready for sales operations.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Sales catalogue created." : "Sales catalogue updated.", "success", {
            title: "Sales Catalogue"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Sales Catalogue Created" : "Sales Catalogue Updated",
            message: "The sales catalogue has been saved successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Catalogue", value: catalogueName },
                { label: "Season", value: selectedSeasonName || "-" },
                { label: "Items", value: String(itemCount || 0) }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Sales catalogue save failed:", error);
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
        const workingItem = getWorkingItems().find(item => item.id === itemId || item.tempId === itemId || item.productId === itemId);
        const confirmed = await showConfirmationModal({
            title: "Remove Catalogue Item",
            message: "Remove this product from the live sales catalogue?",
            details: [
                { label: "Item", value: workingItem?.productName || itemId },
                { label: "Action", value: "Remove Item" }
            ],
            note: "This removal affects the live catalogue immediately and should be confirmed carefully.",
            confirmText: "Remove",
            cancelText: "Cancel",
            tone: "danger"
        });

        if (!confirmed) return;

        try {
            await removeSalesCatalogueItemRecord(featureState.editingCatalogueId, itemId);
            showToast("Catalogue item removed.", "success");
            await showSummaryModal({
                title: "Catalogue Item Removed",
                message: "The product has been removed from the live sales catalogue.",
                details: [
                    { label: "Catalogue", value: getEditingCatalogue(getState())?.catalogueName || "-" },
                    { label: "Item", value: workingItem?.productName || itemId }
                ]
            });
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
                getState().currentUser,
                params.data
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
    syncCatalogueItemsGrid(getState());
}

async function handleCatalogueItemHistory(button) {
    const itemId = button.dataset.itemId;
    const activeItem = getWorkingItems().find(item => item.id === itemId);

    if (!featureState.editingCatalogueId || !itemId || !activeItem) {
        showToast("Price history is available after the catalogue item is saved.", "warning");
        return;
    }

    try {
        featureState.priceHistoryRows = await getSalesCatalogueItemPriceHistory(featureState.editingCatalogueId, itemId);
        featureState.priceHistoryItem = activeItem;
        renderSalesCataloguesView();
    } catch (error) {
        console.error("[Moneta] Catalogue price history load failed:", error);
        showToast(error.message || "Could not load catalogue price history.", "error");
    }
}

async function handleCatalogueItemSync(button) {
    const itemId = button.dataset.itemId;
    const snapshot = getState();
    const products = snapshot.masterData.products || [];
    const categories = snapshot.masterData.categories || [];
    const targetItem = getWorkingItems().find(item => (item.id || item.tempId || item.productId) === itemId);

    if (!targetItem) {
        showToast("Catalogue item could not be found.", "error");
        return;
    }

    try {
        const syncedItem = await syncSalesCatalogueItemToProduct(
            featureState.editingCatalogueId,
            targetItem,
            products,
            snapshot.currentUser,
            categories
        );

        if (!featureState.editingCatalogueId) {
            featureState.draftItems = featureState.draftItems.map(item => {
                const itemKey = item.id || item.tempId || item.productId;
                return itemKey === itemId ? syncedItem : item;
            });
            renderSalesCataloguesView();
        }

        showToast(`${syncedItem.productName || "Catalogue item"} synced to the latest product price.`, "success");
    } catch (error) {
        console.error("[Moneta] Catalogue item sync failed:", error);
        showToast(error.message || "Could not sync catalogue item.", "error");
    }
}

async function handleSyncAllChangedItems() {
    const snapshot = getState();
    const products = snapshot.masterData.products || [];
    const categories = snapshot.masterData.categories || [];
    const workingItems = getWorkingItems();
    const syncableCount = getCatalogueSyncableCount(snapshot, workingItems);

    if (syncableCount <= 0) {
        showToast("All catalogue items are already in sync.", "success");
        return;
    }

    try {
        const result = await syncChangedSalesCatalogueItems(
            featureState.editingCatalogueId,
            workingItems,
            products,
            snapshot.currentUser,
            categories
        );

        if (!featureState.editingCatalogueId) {
            const syncedMap = new Map(result.syncedItems.map(item => [item.id || item.tempId || item.productId, item]));
            featureState.draftItems = featureState.draftItems.map(item => {
                const key = item.id || item.tempId || item.productId;
                return syncedMap.get(key) || item;
            });
            renderSalesCataloguesView();
        }

        showToast(`${result.syncedCount} catalogue item${result.syncedCount === 1 ? "" : "s"} synced to the latest product prices.`, "success");
        await showSummaryModal({
            title: "Catalogue Prices Synced",
            message: "Moneta updated the selected catalogue items to match the latest product pricing.",
            details: [
                { label: "Catalogue", value: getEditingCatalogue(snapshot)?.catalogueName || "Draft Workspace" },
                { label: "Items Synced", value: String(result.syncedCount) }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Sync all catalogue items failed:", error);
        showToast(error.message || "Could not sync catalogue prices.", "error");
    }
}

function handleCatalogueEdit(button) {
    featureState.editingCatalogueId = button.dataset.catalogueId || null;
    featureState.draftItems = [];

    if (featureState.editingCatalogueId) {
        startCatalogueItemsSubscription(featureState.editingCatalogueId);
    }

    renderSalesCataloguesView();
    focusFormField({
        formId: "sales-catalogue-form",
        inputSelector: "#sales-catalogue-name"
    });
}

async function handleCatalogueStatusToggle(button) {
    const catalogueId = button.dataset.catalogueId;
    const nextStatus = button.dataset.nextStatus === "true";
    const catalogue = getState().masterData.salesCatalogues.find(item => item.id === catalogueId);

    if (!catalogue) {
        showToast("Sales catalogue record could not be found.", "error");
        return;
    }

    const confirmed = await showConfirmationModal({
        title: `${nextStatus ? "Activate" : "Deactivate"} Sales Catalogue`,
        message: `${nextStatus ? "Activate" : "Deactivate"} ${catalogue.catalogueName}?`,
        details: [
            { label: "Catalogue", value: catalogue.catalogueName || "-" },
            { label: "Requested Action", value: nextStatus ? "Activate" : "Deactivate" }
        ],
        note: nextStatus
            ? "Please confirm this catalogue status change before Moneta updates availability."
            : "This will remove the catalogue from active selling workflows until it is activated again.",
        confirmText: nextStatus ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        tone: nextStatus ? "warning" : "danger"
    });

    if (!confirmed) return;

    try {
        await toggleSalesCatalogueStatus(catalogueId, nextStatus, getState().currentUser);
        showToast(`Sales catalogue ${nextStatus ? "activated" : "deactivated"}.`, "success");
        await showSummaryModal({
            title: `Sales Catalogue ${nextStatus ? "Activated" : "Deactivated"}`,
            message: "The catalogue status was updated successfully.",
            details: [
                { label: "Catalogue", value: catalogue.catalogueName || "-" },
                { label: "New Status", value: nextStatus ? "Active" : "Inactive" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Sales catalogue status update failed:", error);
        showToast(error.message || "Could not update sales catalogue status.", "error");
    }
}

function handleCancelEdit() {
    resetSalesCatalogueWorkspace();
    renderSalesCataloguesView();
}

function handleClosePriceHistory() {
    featureState.priceHistoryItem = null;
    featureState.priceHistoryRows = [];
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
        const syncButton = target.closest(".sales-catalogue-sync-item-button");
        const historyButton = target.closest(".sales-catalogue-history-button");
        const editButton = target.closest(".sales-catalogue-edit-button");
        const statusButton = target.closest(".sales-catalogue-status-button");
        const cancelButton = target.closest("#sales-catalogue-cancel-button");
        const syncAllButton = target.closest("#sales-catalogue-sync-all-button");
        const closeHistoryButton = target.closest("#sales-catalogue-price-history-close-button");
        const historyBackdrop = target.closest("#sales-catalogue-price-history-modal");

        if (addButton) {
            handleAddProduct(addButton);
            return;
        }

        if (removeButton) {
            handleCatalogueItemRemoval(removeButton);
            return;
        }

        if (syncButton) {
            handleCatalogueItemSync(syncButton);
            return;
        }

        if (historyButton) {
            handleCatalogueItemHistory(historyButton);
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
            return;
        }

        if (syncAllButton) {
            handleSyncAllChangedItems();
            return;
        }

        if (closeHistoryButton) {
            handleClosePriceHistory();
            return;
        }

        if (target.id === "sales-catalogue-price-history-modal" && historyBackdrop) {
            handleClosePriceHistory();
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
