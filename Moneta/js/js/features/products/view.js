import { getState, subscribe } from "../../app/store.js";
import { showModal } from "../../shared/modal.js";
import { showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { initializeProductsGrid, refreshProductsGrid, updateProductsGridSearch } from "./grid.js";
import { calculateSellingPrice, saveProduct, toggleProductStatus } from "./service.js";

const featureState = {
    searchTerm: "",
    editingProductId: null
};

function getEditingProduct(snapshot) {
    if (!featureState.editingProductId) return null;
    return (snapshot.masterData.products || []).find(product => product.id === featureState.editingProductId) || null;
}

function renderCategoryOptions(categories, currentValue) {
    return categories.map(category => `
        <option value="${category.id}" ${category.id === currentValue ? "selected" : ""}>
            ${category.categoryName}
        </option>
    `).join("");
}

function renderProductsViewShell(snapshot) {
    const root = document.getElementById("products-root");
    if (!root) return;

    const editingProduct = getEditingProduct(snapshot);
    const categories = snapshot.masterData.categories || [];
    const productsCount = snapshot.masterData.products?.length || 0;

    root.innerHTML = `
        <div style="display:grid; gap:1rem;">
            <div class="panel-card">
                <div class="panel-header panel-header-accent">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.products}</span>
                        <div>
                            <h2>${editingProduct ? "Edit Product" : "Product Catalogue"}</h2>
                            <p class="panel-copy">Products are the first AG Grid-based feature in Moneta.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span class="status-pill">${productsCount} products</span>
                        <span class="status-pill">${categories.length} categories</span>
                    </div>
                </div>
                <div class="panel-body">
                    <form id="product-form">
                        <input type="hidden" id="product-doc-id" value="${editingProduct?.id || ""}">
                        <div class="form-grid">
                            <div class="field">
                                <label for="product-name">Product Name</label>
                                <input id="product-name" class="input" type="text" value="${editingProduct?.itemName || ""}" required>
                            </div>
                            <div class="field">
                                <label for="product-category">Category</label>
                                <select id="product-category" class="select" required>
                                    <option value="">Select category</option>
                                    ${renderCategoryOptions(categories, editingProduct?.categoryId)}
                                </select>
                            </div>
                            <div class="field">
                                <label for="product-type">Type</label>
                                <select id="product-type" class="select">
                                    <option value="Standard" ${editingProduct?.itemType === "Standard" ? "selected" : ""}>Standard</option>
                                    <option value="Custom" ${editingProduct?.itemType === "Custom" ? "selected" : ""}>Custom</option>
                                </select>
                            </div>
                            <div class="field">
                                <label for="product-unit-price">Unit Price</label>
                                <input id="product-unit-price" class="input" type="number" min="0" step="0.01" value="${editingProduct?.unitPrice || 0}">
                            </div>
                            <div class="field">
                                <label for="product-margin">Margin %</label>
                                <input id="product-margin" class="input" type="number" min="0" step="0.01" value="${editingProduct?.unitMarginPercentage || 0}">
                            </div>
                            <div class="field">
                                <label for="product-selling-price">Selling Price</label>
                                <input id="product-selling-price" class="input" type="number" value="${calculateSellingPrice(editingProduct?.unitPrice || 0, editingProduct?.unitMarginPercentage || 0)}" readonly>
                            </div>
                            <div class="field">
                                <label for="product-inventory">Opening Stock</label>
                                <input id="product-inventory" class="input" type="number" min="0" step="1" value="${editingProduct?.inventoryCount || 0}">
                            </div>
                            <div class="field">
                                <label for="product-weight">Net Weight (kg)</label>
                                <input id="product-weight" class="input" type="number" min="0" step="0.01" value="${editingProduct?.netWeightKg || 0}">
                            </div>
                        </div>
                        <div class="form-actions">
                            ${editingProduct ? `
                                <button id="product-cancel-button" class="button button-secondary" type="button">
                                    <span class="button-icon">${icons.inactive}</span>
                                    Cancel
                                </button>
                            ` : ""}
                            <button class="button button-primary-alt" type="submit">
                                <span class="button-icon">${editingProduct ? icons.edit : icons.plus}</span>
                                ${editingProduct ? "Update Product" : "Add Product"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="panel-card">
                <div class="panel-header">
                    <div class="panel-title-wrap">
                        <span class="panel-icon">${icons.catalogue}</span>
                        <div>
                            <h3>AG Grid Catalogue</h3>
                            <p class="panel-copy">Products now use a denser, more scalable data grid.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <div class="search-wrap">
                            <span class="search-icon">${icons.search}</span>
                            <input id="products-grid-search" class="input toolbar-search" type="search" placeholder="Search products, category, or id" value="${featureState.searchTerm}">
                        </div>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="ag-shell">
                        <div id="products-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function syncProductsGrid(snapshot) {
    const rows = (snapshot.masterData.products || []).slice().sort((left, right) => (left.itemName || "").localeCompare(right.itemName || ""));
    const categories = snapshot.masterData.categories || [];
    const gridElement = document.getElementById("products-grid");
    initializeProductsGrid(gridElement, categories);
    refreshProductsGrid(rows, categories);
    updateProductsGridSearch(featureState.searchTerm);
}

export function renderProductsView() {
    const snapshot = getState();
    renderProductsViewShell(snapshot);
    syncProductsGrid(snapshot);
}

function updateSellingPricePreview() {
    const unitPrice = document.getElementById("product-unit-price")?.value || 0;
    const margin = document.getElementById("product-margin")?.value || 0;
    const display = document.getElementById("product-selling-price");
    if (display) {
        display.value = calculateSellingPrice(unitPrice, margin);
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();

    try {
        const result = await saveProduct({
            docId: document.getElementById("product-doc-id")?.value,
            itemName: document.getElementById("product-name")?.value,
            categoryId: document.getElementById("product-category")?.value,
            itemType: document.getElementById("product-type")?.value,
            unitPrice: document.getElementById("product-unit-price")?.value,
            unitMarginPercentage: document.getElementById("product-margin")?.value,
            inventoryCount: document.getElementById("product-inventory")?.value,
            netWeightKg: document.getElementById("product-weight")?.value
        }, getState().currentUser);

        featureState.editingProductId = null;
        renderProductsView();
        showToast(result.mode === "create" ? "Product created." : "Product updated.", "success");
    } catch (error) {
        console.error("[Moneta] Product save failed:", error);
        showToast(error.message || "Could not save product.", "error");
    }
}

function handleProductEdit(target) {
    featureState.editingProductId = target.dataset.productId || null;
    renderProductsView();
}

async function handleProductStatusToggle(target) {
    const productId = target.dataset.productId;
    const field = target.dataset.statusField;
    const nextValue = target.dataset.nextStatus === "true";
    const product = getState().masterData.products.find(item => item.id === productId);

    if (!product) {
        showToast("Product record could not be found.", "error");
        return;
    }

    const confirmed = await showModal({
        title: `${nextValue ? "Activate" : "Deactivate"} Product`,
        message: `${nextValue ? "Activate" : "Deactivate"} ${product.itemName}?`,
        confirmText: nextValue ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        showCancel: true
    });

    if (!confirmed) return;

    try {
        await toggleProductStatus(productId, field, nextValue, getState().currentUser);
        showToast(`Product ${nextValue ? "activated" : "deactivated"}.`, "success");
    } catch (error) {
        console.error("[Moneta] Product status update failed:", error);
        showToast(error.message || "Could not update product status.", "error");
    }
}

function bindProductsDomEvents() {
    const root = document.getElementById("products-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("submit", event => {
        if (event.target.id === "product-form") {
            handleProductFormSubmit(event);
        }
    });

    root.addEventListener("input", event => {
        const target = event.target;

        if (target.id === "product-unit-price" || target.id === "product-margin") {
            updateSellingPricePreview();
        }

        if (target.id === "products-grid-search") {
            featureState.searchTerm = target.value || "";
            updateProductsGridSearch(featureState.searchTerm);
        }
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const editButton = target.closest(".product-edit-button");
        const statusButton = target.closest(".product-status-button");
        const cancelButton = target.closest("#product-cancel-button");

        if (editButton) {
            handleProductEdit(editButton);
            return;
        }

        if (statusButton) {
            handleProductStatusToggle(statusButton);
            return;
        }

        if (cancelButton) {
            featureState.editingProductId = null;
            renderProductsView();
        }
    });

    root.dataset.bound = "true";
}

export function initializeProductsFeature() {
    bindProductsDomEvents();

    subscribe(snapshot => {
        if (snapshot.currentRoute === "#/products") {
            renderProductsView();
        }
    });
}
