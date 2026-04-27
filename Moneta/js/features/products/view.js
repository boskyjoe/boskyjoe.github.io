import { getState, subscribe } from "../../app/store.js";
import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import {
    getNormalizedPricingPolicySettings,
    resolveSystemDefaultPricingPolicy
} from "../../shared/pricing-policy.js";
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
    return categories
        .filter(category => category.isActive || category.id === currentValue)
        .map(category => `
        <option value="${category.id}" ${category.id === currentValue ? "selected" : ""}>
            ${category.categoryName}
        </option>
    `).join("");
}

function getActivePricingPolicy(snapshot) {
    return resolveSystemDefaultPricingPolicy(snapshot.masterData.pricingPolicies || [], { activeOnly: true });
}

function getPricingPolicyLabel(settings = {}) {
    const costingLabel = settings.costingMethod === "weighted-average"
        ? "Weighted Average Cost"
        : settings.costingMethod === "latest-purchase"
            ? "Latest Purchase Cost"
            : "Manual Standard Cost";

    const sellingLabel = settings.sellingPriceBehavior === "auto-update-from-margin"
        ? "Auto Price Updates"
        : settings.sellingPriceBehavior === "manual"
            ? "Manual Selling Price"
            : "Suggested Selling Price";

    return `${costingLabel} • ${sellingLabel}`;
}

function renderProductsViewShell(snapshot) {
    const root = document.getElementById("products-root");
    if (!root) return;

    const editingProduct = getEditingProduct(snapshot);
    const categories = snapshot.masterData.categories || [];
    const activeCategories = categories.filter(category => category.isActive || category.id === editingProduct?.categoryId);
    const productsCount = snapshot.masterData.products?.length || 0;
    const pricingPolicy = getActivePricingPolicy(snapshot);
    const pricingPolicySettings = getNormalizedPricingPolicySettings(pricingPolicy || {});
    const marginValue = editingProduct?.unitMarginPercentage ?? pricingPolicySettings.defaultTargetMarginPercentage;
    const standardCostValue = editingProduct?.unitPrice || 0;
    const recommendedSellingPrice = calculateSellingPrice(standardCostValue, marginValue);
    const liveSellingPrice = editingProduct?.sellingPrice ?? recommendedSellingPrice;
    const isManualSellingPrice = pricingPolicySettings.sellingPriceBehavior === "manual";
    const costOverrideLocked = Boolean(editingProduct) && !pricingPolicySettings.allowManualCostOverride;
    const priceReviewRequired = Boolean(editingProduct?.pricingMeta?.requiresPriceReview);
    const priceReviewValue = editingProduct?.pricingMeta?.costChangePercent;
    const priceReviewCopy = priceReviewRequired
        ? `Moneta is flagging this product for price review because standard cost moved${priceReviewValue === null ? " from no prior baseline." : ` by ${Math.abs(priceReviewValue)}%.`}`
        : "Moneta is not currently flagging this product for an additional price review.";

    root.innerHTML = `
        <div style="display:grid; gap:1rem;">
            <div class="panel-card">
                <div class="panel-header panel-header-accent">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.products}</span>
                        <div>
                            <h2>${editingProduct ? "Edit Product" : "Product Catalogue"}</h2>
                            <p class="panel-copy">Manage standard cost, target margin, and selling price under the active Moneta pricing policy.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span class="status-pill">${productsCount} products</span>
                        <span class="status-pill">${activeCategories.length} categories</span>
                        <span class="status-pill">${getPricingPolicyLabel(pricingPolicySettings)}</span>
                    </div>
                </div>
                <div class="panel-body">
                    <form id="product-form">
                        <input type="hidden" id="product-doc-id" value="${editingProduct?.id || ""}">
                        <div class="product-form-sections">
                            <section class="product-form-section">
                                <div class="product-form-section-head">
                                    <h3>Product Setup</h3>
                                    <p class="panel-copy">Keep the identity fields together so catalogue grouping and pricing stay clean.</p>
                                </div>
                                <div class="product-form-grid product-form-grid-identity">
                                    <div class="field product-span-5">
                                        <label for="product-name">Product Name <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="product-name" class="input" type="text" value="${editingProduct?.itemName || ""}" required>
                                    </div>
                                    <div class="field product-span-4">
                                        <label for="product-category">Category <span class="required-mark" aria-hidden="true">*</span></label>
                                        <select id="product-category" class="select" required>
                                            <option value="">Select category</option>
                                            ${renderCategoryOptions(categories, editingProduct?.categoryId)}
                                        </select>
                                    </div>
                                    <div class="field product-span-3">
                                        <label for="product-type">Type</label>
                                        <select id="product-type" class="select">
                                            <option value="Standard" ${editingProduct?.itemType === "Standard" ? "selected" : ""}>Standard</option>
                                            <option value="Custom" ${editingProduct?.itemType === "Custom" ? "selected" : ""}>Custom</option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <section class="product-form-section">
                                <div class="product-form-section-head">
                                    <h3>Pricing</h3>
                                    <p class="panel-copy">These values follow the active Moneta pricing policy and show both recommendation and live price behavior.</p>
                                </div>
                                <div class="product-form-grid product-form-grid-pricing">
                                    <div class="field product-span-3 product-field-with-help">
                                        <label for="product-unit-price">Standard Cost</label>
                                        <input id="product-unit-price" class="input" type="number" min="0" step="0.01" value="${standardCostValue}" ${costOverrideLocked ? "readonly" : ""}>
                                        <p class="panel-copy panel-copy-tight">${costOverrideLocked
                                            ? "Manual standard-cost overrides are locked by the active pricing policy. Update purchases to move cost."
                                            : "Use this as the working standard cost. Moneta can later refresh it from purchase history."}</p>
                                    </div>
                                    <div class="field product-span-3 product-field-with-help">
                                        <label for="product-margin">Target Margin %</label>
                                        <input id="product-margin" class="input" type="number" min="0" step="0.01" value="${marginValue}">
                                        <p class="panel-copy panel-copy-tight">Moneta uses this target margin to calculate the recommended selling price.</p>
                                    </div>
                                    <div class="field product-span-3 product-field-with-help">
                                        <label for="product-selling-price">${isManualSellingPrice ? "Live Selling Price" : "Recommended Selling Price"}</label>
                                        <input
                                            id="product-selling-price"
                                            class="input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value="${isManualSellingPrice ? liveSellingPrice : recommendedSellingPrice}"
                                            ${isManualSellingPrice ? "" : "readonly"}
                                            data-manual-entry="${isManualSellingPrice ? "true" : "false"}">
                                        <p class="panel-copy panel-copy-tight">${isManualSellingPrice
                                            ? "The active pricing policy leaves selling price manual. Set the live price Moneta should use."
                                            : "This is Moneta's recommended price from standard cost and target margin."}</p>
                                    </div>
                                    <div class="field product-span-3 product-field-with-help">
                                        <label for="product-live-selling-price">Current Live Selling Price</label>
                                        <input id="product-live-selling-price" class="input" type="number" value="${liveSellingPrice}" readonly>
                                        <p class="panel-copy panel-copy-tight">${isManualSellingPrice
                                            ? "Current live price follows the manual selling price entered above."
                                            : "When purchase cost changes, Moneta can keep the live selling price steady while surfacing a new recommendation."}</p>
                                    </div>
                                </div>
                            </section>

                            <section class="product-form-section">
                                <div class="product-form-section-head">
                                    <h3>Inventory Profile</h3>
                                    <p class="panel-copy">Keep the starting stock and pack profile together so purchasing and reporting stay predictable.</p>
                                </div>
                                <div class="product-form-grid product-form-grid-inventory">
                                    <div class="field product-span-6">
                                        <label for="product-inventory">Opening Stock</label>
                                        <input id="product-inventory" class="input" type="number" min="0" step="1" value="${editingProduct?.inventoryCount || 0}">
                                    </div>
                                    <div class="field product-span-6">
                                        <label for="product-weight">Net Weight (kg)</label>
                                        <input id="product-weight" class="input" type="number" min="0" step="0.01" value="${editingProduct?.netWeightKg || 0}">
                                    </div>
                                </div>
                            </section>
                        </div>
                        <div class="panel-card product-pricing-snapshot-card">
                            <div class="panel-body">
                                <div class="product-pricing-snapshot-copy">
                                    <strong>Pricing Policy Snapshot</strong>
                                    <p class="panel-copy panel-copy-tight">Active policy: ${getPricingPolicyLabel(pricingPolicySettings)}.</p>
                                    <p class="panel-copy panel-copy-tight">${priceReviewCopy}</p>
                                </div>
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
                            <h3>Product Directory</h3>
                            <p class="panel-copy">Search, review, and manage products across category, pricing, and stock details.</p>
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
    const recommendedValue = calculateSellingPrice(unitPrice, margin);
    const livePriceDisplay = document.getElementById("product-live-selling-price");
    const sellingPriceInput = document.getElementById("product-selling-price");

    if (sellingPriceInput && sellingPriceInput.dataset.manualEntry !== "true") {
        sellingPriceInput.value = recommendedValue;
    }

    if (livePriceDisplay) {
        livePriceDisplay.value = sellingPriceInput?.dataset.manualEntry === "true"
            ? (sellingPriceInput?.value || 0)
            : recommendedValue;
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("product-doc-id")?.value;
        const productName = document.getElementById("product-name")?.value || "-";
        const categoryLabel = document.getElementById("product-category")?.selectedOptions?.[0]?.textContent || "-";
        const result = await runProgressToastFlow({
            title: docId ? "Updating Product" : "Adding New Product",
            initialMessage: "Reading product form inputs...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Product Updated" : "Product Added",
            successMessage: docId ? "The product was updated successfully." : "The product was added successfully."
        }, async ({ update }) => {
            update("Validating category, pricing, and inventory data...", 36, "Step 2 of 5");

            update("Writing product changes to the database...", 72, "Step 3 of 5");

            const result = await saveProduct({
                docId,
                itemName: document.getElementById("product-name")?.value,
                categoryId: document.getElementById("product-category")?.value,
                itemType: document.getElementById("product-type")?.value,
                unitPrice: document.getElementById("product-unit-price")?.value,
                unitMarginPercentage: document.getElementById("product-margin")?.value,
                sellingPrice: document.getElementById("product-selling-price")?.value,
                inventoryCount: document.getElementById("product-inventory")?.value,
                netWeightKg: document.getElementById("product-weight")?.value
            }, getState().masterData, getState().currentUser);

            update("Refreshing the product catalogue workspace...", 88, "Step 4 of 5");
            featureState.editingProductId = null;
            renderProductsView();
            update("Product catalogue is up to date.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Product created." : "Product updated.", "success", {
            title: "Product Catalogue"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Product Added" : "Product Updated",
            message: "The product record has been saved successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Product", value: productName },
                { label: "Category", value: categoryLabel }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Product save failed:", error);
    }
}

function handleProductEdit(target) {
    featureState.editingProductId = target.dataset.productId || null;
    renderProductsView();
    focusFormField({
        formId: "product-form",
        inputSelector: "#product-name"
    });
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

    const confirmed = await showConfirmationModal({
        title: `${nextValue ? "Activate" : "Deactivate"} Product`,
        message: `${nextValue ? "Activate" : "Deactivate"} ${product.itemName}?`,
        details: [
            { label: "Product", value: product.itemName || "-" },
            { label: "Requested Action", value: nextValue ? "Activate" : "Deactivate" }
        ],
        note: nextValue
            ? "Please confirm this status change before Moneta updates product availability."
            : "This will remove the product from active product pickers until it is activated again.",
        confirmText: nextValue ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        tone: nextValue ? "warning" : "danger"
    });

    if (!confirmed) return;

    try {
        await toggleProductStatus(productId, field, nextValue, getState().currentUser);
        showToast(`Product ${nextValue ? "activated" : "deactivated"}.`, "success");
        await showSummaryModal({
            title: `Product ${nextValue ? "Activated" : "Deactivated"}`,
            message: "The product status was updated successfully.",
            details: [
                { label: "Product", value: product.itemName || "-" },
                { label: "New Status", value: nextValue ? "Active" : "Inactive" }
            ]
        });
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

        if (target.id === "product-selling-price" && target.dataset.manualEntry === "true") {
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
