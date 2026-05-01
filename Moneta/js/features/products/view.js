import { getState, subscribe } from "../../app/store.js";
import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import {
    getNormalizedPricingPolicySettings,
    roundCurrency,
    resolveSystemDefaultPricingPolicy
} from "../../shared/pricing-policy.js";
import { initializeProductsGrid, refreshProductsGrid, updateProductsGridSearch } from "./grid.js";
import { calculateSellingPrice, saveProduct, toggleProductStatus } from "./service.js";

const featureState = {
    searchTerm: "",
    editingProductId: null
};

function getSaveIntentLabel(intent = "save") {
    if (intent === "approve-price-change") {
        return "Save, Approve Price Change";
    }

    if (intent === "approve-and-sync-catalogues") {
        return "Save, Approve, and Sync Catalogues";
    }

    if (intent === "sync-catalogues") {
        return "Save and Sync Catalogues";
    }

    return "Save Product";
}

function getSaveIntentProgressCopy(docId, intent = "save") {
    const isCreateMode = !docId;

    if (intent === "approve-price-change") {
        return {
            title: "Saving and Approving Product Price",
            successTitle: "Product Saved and Approved",
            successMessage: "The product update and price approval were completed successfully."
        };
    }

    if (intent === "approve-and-sync-catalogues") {
        return {
            title: "Saving, Approving, and Syncing Catalogues",
            successTitle: "Product Saved, Approved, and Synced",
            successMessage: "The product update, price approval, and Sales Catalogue sync were completed successfully."
        };
    }

    if (intent === "sync-catalogues") {
        return {
            title: "Saving and Syncing Catalogues",
            successTitle: "Product Saved and Synced",
            successMessage: "The product update and Sales Catalogue sync were completed successfully."
        };
    }

    return {
        title: isCreateMode ? "Adding New Product" : "Saving Product",
        successTitle: isCreateMode ? "Product Added" : "Product Saved",
        successMessage: isCreateMode ? "The product was added successfully." : "The product was saved successfully."
    };
}

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

function getCostingMethodLabel(settings = {}) {
    if (settings.costingMethod === "weighted-average") {
        return "Weighted Average purchase cost";
    }

    if (settings.costingMethod === "latest-purchase") {
        return "Latest Purchase cost";
    }

    return "Manual Standard Cost";
}

function isCustomProductType(itemType = "") {
    return (itemType || "").trim().toLowerCase() === "custom";
}

function getPurchaseHistoryCount(product = {}) {
    const pricingMeta = product?.pricingMeta || {};
    const countCandidate = Number(pricingMeta.purchaseEntryCount ?? pricingMeta.totalPurchasedUnits);
    return Number.isFinite(countCandidate) ? Math.max(0, countCandidate) : 0;
}

function hasPurchaseHistory(product = {}) {
    return getPurchaseHistoryCount(product) > 0;
}

function isPurchaseDrivenCostingMethod(settings = {}) {
    return settings.costingMethod === "weighted-average"
        || settings.costingMethod === "latest-purchase";
}

function getPolicyDerivedStandardCost(product = {}, settings = {}) {
    const pricingMeta = product?.pricingMeta || {};
    const fallbackCost = roundCurrency(product?.unitPrice);

    if (settings.costingMethod === "weighted-average") {
        return roundCurrency(pricingMeta.weightedAverageCost) > 0
            ? roundCurrency(pricingMeta.weightedAverageCost)
            : fallbackCost;
    }

    if (settings.costingMethod === "latest-purchase") {
        return roundCurrency(pricingMeta.latestPurchasePrice) > 0
            ? roundCurrency(pricingMeta.latestPurchasePrice)
            : fallbackCost;
    }

    return fallbackCost;
}

function isStandardCostLocked({ itemType = "Standard", settings = {}, product = null } = {}) {
    return !isCustomProductType(itemType)
        && Boolean(product)
        && isPurchaseDrivenCostingMethod(settings)
        && hasPurchaseHistory(product);
}

function getStandardCostHelpCopy({
    itemType = "Standard",
    settings = {},
    hasHistory = false,
    policyDerivedCost = 0
} = {}) {
    const costingLabel = getCostingMethodLabel(settings);
    const formattedPolicyCost = `₹${roundCurrency(policyDerivedCost).toFixed(2)}`;

    if (isCustomProductType(itemType)) {
        return "Custom products keep standard cost manual. Purchase-driven pricing policy does not overwrite this field.";
    }

    if (settings.costingMethod === "manual-standard-cost") {
        return "The active pricing policy leaves standard cost manual for standard products.";
    }

    if (hasHistory) {
        return `Locked by pricing policy: ${costingLabel} now drives standard cost because this standard product already has purchase history. Current policy cost: ${formattedPolicyCost}.`;
    }

    return `Editable during setup. Once the first valid purchase is posted, Moneta will switch this standard product to ${costingLabel}.`;
}

function getRecommendedSellingPriceHelpCopy({ itemType = "Standard", settings = {} } = {}) {
    if (isCustomProductType(itemType)) {
        return "Moneta keeps this recommendation in sync with standard cost and target margin, even when you choose a different live selling price.";
    }

    if (settings.sellingPriceBehavior === "manual") {
        return "This recommendation is still calculated from standard cost and target margin, but the active pricing policy leaves the live price manual.";
    }

    if (settings.sellingPriceBehavior === "auto-update-from-margin") {
        return "The active pricing policy uses this recommendation as the live selling price automatically.";
    }

    return "This is Moneta's recommended price from standard cost and target margin.";
}

function getLiveSellingPriceHelpCopy({ itemType = "Standard", settings = {} } = {}) {
    if (isCustomProductType(itemType)) {
        return "Custom products can override the live selling price manually. Use Save and Sync Catalogues when you want active catalogue items updated to this live price.";
    }

    if (settings.sellingPriceBehavior === "manual") {
        return "The active pricing policy leaves the live selling price manual for this standard product.";
    }

    if (settings.sellingPriceBehavior === "auto-update-from-margin") {
        return "The active pricing policy keeps the live selling price aligned to the recommendation.";
    }

    return "Moneta keeps the live selling price steady until an approved price decision changes it.";
}

function getPriceReviewCopy({
    itemType = "Standard",
    reviewRequired = false,
    reviewValue = null,
    hasHistory = false,
    isPurchaseDriven = false
} = {}) {
    if (isCustomProductType(itemType)) {
        return "Custom products stay outside the purchase-driven price-review workflow. Manage the live selling price directly here, then sync active Sales Catalogue items when needed.";
    }

    if (reviewRequired) {
        return `Moneta is flagging this product for price review because standard cost moved${reviewValue === null ? " from no prior baseline." : ` by ${Math.abs(reviewValue)}%.`}`;
    }

    if (hasHistory && isPurchaseDriven) {
        return "Moneta is not currently flagging this product for an additional price review.";
    }

    return "This standard product is still using setup cost because it does not yet have purchase history.";
}

function setInputReadOnlyState(input, isReadOnly) {
    if (!input) return;

    if (isReadOnly) {
        input.setAttribute("readonly", "readonly");
        input.setAttribute("aria-readonly", "true");
        input.dataset.lockState = "locked";
        input.readOnly = true;
    } else {
        input.removeAttribute("readonly");
        input.setAttribute("aria-readonly", "false");
        input.dataset.lockState = "editable";
        input.readOnly = false;
    }
}

function syncProductPricingFormState() {
    const productTypeSelect = document.getElementById("product-type");
    const standardCostInput = document.getElementById("product-unit-price");
    const standardCostHelp = document.getElementById("product-unit-price-help");
    const recommendedPriceHelp = document.getElementById("product-recommended-price-help");
    const liveSellingPriceInput = document.getElementById("product-live-selling-price");
    const liveSellingPriceHelp = document.getElementById("product-live-selling-price-help");
    const snapshotNote = document.getElementById("product-pricing-snapshot-note");
    const priceReviewCopy = document.getElementById("product-price-review-copy");

    if (!productTypeSelect || !standardCostInput || !standardCostHelp || !recommendedPriceHelp || !liveSellingPriceInput || !liveSellingPriceHelp) {
        return;
    }

    const itemType = productTypeSelect.value || "Standard";
    const settings = {
        costingMethod: standardCostInput.dataset.costingMethod,
        sellingPriceBehavior: liveSellingPriceInput.dataset.sellingBehavior
    };
    const historyCount = Number(standardCostInput.dataset.purchaseHistoryCount || 0);
    const historyActive = Number.isFinite(historyCount) && historyCount > 0;
    const policyCost = standardCostInput.dataset.policyCost || standardCostInput.value || 0;
    const customProduct = isCustomProductType(itemType);
    const costLocked = !customProduct
        && isPurchaseDrivenCostingMethod(settings)
        && historyActive;
    const livePriceEditable = customProduct || settings.sellingPriceBehavior === "manual";
    const livePriceSyncMode = customProduct
        ? "preserve"
        : settings.sellingPriceBehavior === "auto-update-from-margin"
            ? "recommended"
            : "preserve";

    if (costLocked) {
        standardCostInput.value = policyCost;
    }

    setInputReadOnlyState(standardCostInput, costLocked);
    setInputReadOnlyState(liveSellingPriceInput, !livePriceEditable);
    liveSellingPriceInput.dataset.syncMode = livePriceSyncMode;
    liveSellingPriceInput.dataset.editable = livePriceEditable ? "true" : "false";

    standardCostHelp.textContent = getStandardCostHelpCopy({
        itemType,
        settings,
        hasHistory: historyActive,
        policyDerivedCost: policyCost
    });
    recommendedPriceHelp.textContent = getRecommendedSellingPriceHelpCopy({ itemType, settings });
    liveSellingPriceHelp.textContent = getLiveSellingPriceHelpCopy({ itemType, settings });

    if (snapshotNote) {
        if (customProduct) {
            snapshotNote.textContent = "Custom products stay manually managed. Purchase sync does not overwrite standard cost, but active Sales Catalogue items can still be synced from the saved live price.";
        } else if (settings.costingMethod === "manual-standard-cost") {
            snapshotNote.textContent = "This standard product stays manually costed because the active pricing policy uses Manual Standard Cost.";
        } else if (historyActive) {
            snapshotNote.textContent = `This standard product is now purchase-driven. ${getCostingMethodLabel(settings)} controls standard cost because purchase history already exists.`;
        } else {
            snapshotNote.textContent = `This standard product is still in setup mode. The first valid purchase will hand standard-cost control to ${getCostingMethodLabel(settings)}.`;
        }
    }

    if (priceReviewCopy) {
        priceReviewCopy.textContent = getPriceReviewCopy({
            itemType,
            reviewRequired: priceReviewCopy.dataset.reviewRequired === "true",
            reviewValue: priceReviewCopy.dataset.reviewValue === "" ? null : Number(priceReviewCopy.dataset.reviewValue),
            hasHistory: historyActive,
            isPurchaseDriven: isPurchaseDrivenCostingMethod(settings)
        });
    }

    updateSellingPricePreview();
}

function bindProductPricingFieldInteractions() {
    const productTypeSelect = document.getElementById("product-type");
    const standardCostInput = document.getElementById("product-unit-price");
    const marginInput = document.getElementById("product-margin");
    const liveSellingPriceInput = document.getElementById("product-live-selling-price");

    if (productTypeSelect) {
        productTypeSelect.onchange = () => syncProductPricingFormState();
    }

    if (standardCostInput) {
        standardCostInput.oninput = () => {
            updateSellingPricePreview();
        };
    }

    if (marginInput) {
        marginInput.oninput = () => updateSellingPricePreview();
    }

    if (liveSellingPriceInput) {
        liveSellingPriceInput.oninput = () => {
            liveSellingPriceInput.dataset.touched = "true";
            updateSellingPricePreview();
        };
    }
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
    const selectedItemType = editingProduct?.itemType || "Standard";
    const customProduct = isCustomProductType(selectedItemType);
    const purchaseHistoryActive = hasPurchaseHistory(editingProduct);
    const isPurchaseDrivenCosting = isPurchaseDrivenCostingMethod(pricingPolicySettings);
    const policyDerivedStandardCost = editingProduct
        ? getPolicyDerivedStandardCost(editingProduct, pricingPolicySettings)
        : 0;
    const marginValue = editingProduct?.unitMarginPercentage ?? pricingPolicySettings.defaultTargetMarginPercentage;
    const standardCostValue = editingProduct?.unitPrice || 0;
    const costLocked = isStandardCostLocked({
        itemType: selectedItemType,
        settings: pricingPolicySettings,
        product: editingProduct
    });
    const displayedStandardCost = costLocked
        ? policyDerivedStandardCost
        : standardCostValue;
    const recommendedSellingPrice = calculateSellingPrice(displayedStandardCost, marginValue);
    const liveSellingPrice = editingProduct?.sellingPrice ?? recommendedSellingPrice;
    const liveSellingPriceEditable = customProduct || pricingPolicySettings.sellingPriceBehavior === "manual";
    const isAdminUser = snapshot.currentUser?.role === "admin";
    const showCatalogueSyncAction = Boolean(editingProduct)
        && customProduct
        && ["admin", "inventory_manager", "sales_staff", "team_lead"].includes(snapshot.currentUser?.role);
    const showAdminFastTrackActions = isAdminUser && Boolean(editingProduct) && !customProduct;
    const priceReviewRequired = Boolean(editingProduct?.pricingMeta?.requiresPriceReview);
    const priceReviewValue = editingProduct?.pricingMeta?.costChangePercent;
    const priceReviewCopy = getPriceReviewCopy({
        itemType: selectedItemType,
        reviewRequired: priceReviewRequired,
        reviewValue: priceReviewValue,
        hasHistory: purchaseHistoryActive,
        isPurchaseDriven: isPurchaseDrivenCosting
    });

    root.innerHTML = `
        <div style="display:grid; gap:1rem;">
            <div class="panel-card">
                <div class="panel-header panel-header-accent">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.products}</span>
                        <div>
                            <h2>${editingProduct ? "Edit Product" : "Product Catalogue"}</h2>
                            <p class="panel-copy">Manage cost, margin, and live pricing under the active policy.</p>
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
                                    <p class="panel-copy">Standard products switch to purchase-driven cost after purchase history exists. Custom products stay manually managed.</p>
                                </div>
                                <div class="product-form-grid product-form-grid-pricing">
                                    <div class="field product-span-3 product-field-with-help">
                                        <label for="product-unit-price">Standard Cost</label>
                                        <input
                                            id="product-unit-price"
                                            class="input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value="${displayedStandardCost}"
                                            data-policy-cost="${policyDerivedStandardCost}"
                                            data-purchase-history-count="${getPurchaseHistoryCount(editingProduct)}"
                                            data-costing-method="${pricingPolicySettings.costingMethod}"
                                            ${costLocked ? "readonly" : ""}>
                                        <p id="product-unit-price-help" class="panel-copy panel-copy-tight">${editingProduct
                                            ? getStandardCostHelpCopy({
                                                itemType: selectedItemType,
                                                settings: pricingPolicySettings,
                                                hasHistory: purchaseHistoryActive,
                                                policyDerivedCost: policyDerivedStandardCost
                                            })
                                            : "Use this as the opening standard cost. For standard products, Moneta will switch to purchase-driven costing after the first valid purchase."}</p>
                                    </div>
                                    <div class="field product-span-3 product-field-with-help">
                                        <label for="product-margin">Target Margin %</label>
                                        <input id="product-margin" class="input" type="number" min="0" step="0.01" value="${marginValue}">
                                        <p class="panel-copy panel-copy-tight">Used to calculate the recommended selling price.</p>
                                    </div>
                                    <div class="field product-span-3 product-field-with-help">
                                        <label for="product-recommended-selling-price">Recommended Selling Price</label>
                                        <input
                                            id="product-recommended-selling-price"
                                            class="input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value="${recommendedSellingPrice}"
                                            readonly>
                                        <p id="product-recommended-price-help" class="panel-copy panel-copy-tight">${getRecommendedSellingPriceHelpCopy({
                                            itemType: selectedItemType,
                                            settings: pricingPolicySettings
                                        })}</p>
                                    </div>
                                    <div class="field product-span-3 product-field-with-help">
                                        <label for="product-live-selling-price">Live Selling Price</label>
                                        <input
                                            id="product-live-selling-price"
                                            class="input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value="${liveSellingPrice}"
                                            data-selling-behavior="${pricingPolicySettings.sellingPriceBehavior}"
                                            data-sync-mode="${!customProduct && pricingPolicySettings.sellingPriceBehavior === "auto-update-from-margin" ? "recommended" : "preserve"}"
                                            ${liveSellingPriceEditable ? "" : "readonly"}>
                                        <p id="product-live-selling-price-help" class="panel-copy panel-copy-tight">${getLiveSellingPriceHelpCopy({
                                            itemType: selectedItemType,
                                            settings: pricingPolicySettings
                                        })}</p>
                                    </div>
                                </div>
                            </section>

                            <section class="product-form-section">
                                <div class="product-form-section-head">
                                    <h3>Inventory Profile</h3>
                                    <p class="panel-copy">Set opening stock and weight for purchasing and reporting.</p>
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
                                    <strong>Pricing Snapshot</strong>
                                    <p class="panel-copy panel-copy-tight">Active policy: ${getPricingPolicyLabel(pricingPolicySettings)}.</p>
                                    <p id="product-pricing-snapshot-note" class="panel-copy panel-copy-tight">${customProduct
                                        ? "Custom products stay manually managed. Purchase sync does not overwrite standard cost, but active Sales Catalogue items can still be synced from the saved live price."
                                        : pricingPolicySettings.costingMethod === "manual-standard-cost"
                                            ? "This standard product stays manually costed because the active pricing policy uses Manual Standard Cost."
                                            : purchaseHistoryActive
                                                ? `This standard product is now purchase-driven. ${getCostingMethodLabel(pricingPolicySettings)} controls standard cost because purchase history already exists.`
                                                : `This standard product is still in setup mode. The first valid purchase will hand standard-cost control to ${getCostingMethodLabel(pricingPolicySettings)}.`}</p>
                                    <p
                                        id="product-price-review-copy"
                                        class="panel-copy panel-copy-tight"
                                        data-review-required="${priceReviewRequired ? "true" : "false"}"
                                        data-review-value="${priceReviewValue ?? ""}">${priceReviewCopy}</p>
                                    ${showAdminFastTrackActions ? `
                                        <p class="panel-copy panel-copy-tight">
                                            Standard save already creates a review when pricing impact exists. Use these actions only to fast-track the decision.
                                        </p>
                                    ` : ""}
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
                            <button class="button button-primary-alt" type="submit" name="product-save-intent" value="save">
                                <span class="button-icon">${editingProduct ? icons.edit : icons.plus}</span>
                                ${editingProduct ? "Save Product" : "Add Product"}
                            </button>
                            ${showCatalogueSyncAction ? `
                                <button class="button button-secondary" type="submit" name="product-save-intent" value="sync-catalogues">
                                    <span class="button-icon">${icons.catalogue}</span>
                                    Save and Sync Catalogues
                                </button>
                            ` : ""}
                            ${showAdminFastTrackActions ? `
                                <button class="button button-secondary" type="submit" name="product-save-intent" value="approve-price-change">
                                    <span class="button-icon">${icons.active}</span>
                                    Save, Approve Price Change
                                </button>
                                <button class="button button-secondary" type="submit" name="product-save-intent" value="approve-and-sync-catalogues">
                                    <span class="button-icon">${icons.catalogue}</span>
                                    Save, Approve, and Sync Catalogues
                                </button>
                            ` : ""}
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
                            <p class="panel-copy">Search and reopen products by category, pricing, or stock.</p>
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
    syncProductPricingFormState();
    bindProductPricingFieldInteractions();
    syncProductsGrid(snapshot);
}

function updateSellingPricePreview() {
    const unitPrice = document.getElementById("product-unit-price")?.value || 0;
    const margin = document.getElementById("product-margin")?.value || 0;
    const recommendedValue = calculateSellingPrice(unitPrice, margin);
    const recommendedPriceInput = document.getElementById("product-recommended-selling-price");
    const livePriceInput = document.getElementById("product-live-selling-price");

    if (recommendedPriceInput) {
        recommendedPriceInput.value = recommendedValue;
    }

    if (livePriceInput && livePriceInput.dataset.syncMode === "recommended" && livePriceInput.readOnly) {
        livePriceInput.value = recommendedValue;
    }
}

async function handleProductFormSubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("product-doc-id")?.value;
        const productName = document.getElementById("product-name")?.value || "-";
        const categoryLabel = document.getElementById("product-category")?.selectedOptions?.[0]?.textContent || "-";
        const saveIntent = event.submitter?.value || "save";
        const progressCopy = getSaveIntentProgressCopy(docId, saveIntent);
        const result = await runProgressToastFlow({
            title: progressCopy.title,
            initialMessage: "Reading product form inputs...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: progressCopy.successTitle,
            successMessage: progressCopy.successMessage
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
                sellingPrice: document.getElementById("product-live-selling-price")?.value,
                inventoryCount: document.getElementById("product-inventory")?.value,
                netWeightKg: document.getElementById("product-weight")?.value
            }, getState().masterData, getState().currentUser, {
                postSaveAction: saveIntent
            });

            update(
                saveIntent === "approve-and-sync-catalogues" || saveIntent === "sync-catalogues"
                    ? "Refreshing product and Sales Catalogue views..."
                    : "Refreshing the product catalogue workspace...",
                88,
                "Step 4 of 5"
            );
            featureState.editingProductId = null;
            renderProductsView();
            update(
                saveIntent === "approve-price-change"
                    ? "Pricing approval is complete."
                    : saveIntent === "approve-and-sync-catalogues"
                        ? "Pricing approval and catalogue sync are complete."
                        : saveIntent === "sync-catalogues"
                            ? "Product save and catalogue sync are complete."
                        : "Product catalogue is up to date.",
                96,
                "Step 5 of 5"
            );
            return result;
        });

        showToast(
            result.mode === "create"
                ? "Product created."
                : result.pricingAction === "approve-price-change"
                    ? "Product saved and price approved."
                    : result.pricingAction === "approve-and-sync-catalogues"
                        ? "Product saved, price approved, and catalogues synced."
                        : result.pricingAction === "sync-catalogues"
                            ? "Product saved and catalogues synced."
                        : "Product saved.",
            "success",
            {
            title: "Product Catalogue"
            }
        );
        ProgressToast.hide(0);

        const summaryDetails = [
            { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
            { label: "Product", value: productName },
            { label: "Category", value: categoryLabel },
            { label: "Pricing Action", value: getSaveIntentLabel(result.pricingAction || saveIntent) }
        ];

        if (result.reviewOutcome?.status === "pending") {
            summaryDetails.push({ label: "Price Review", value: "Pending review created" });
        }

        if (result.pricingAction === "save-only-no-review") {
            summaryDetails.push({ label: "Price Review", value: "No review needed after save" });
        }

        if (result.approvalResult) {
            summaryDetails.push({
                label: "Approved Price",
                value: `₹${Number(result.approvalResult.approvedSellingPrice || 0).toFixed(2)}`
            });
            summaryDetails.push({
                label: "Catalogue Sync",
                value: saveIntent === "approve-and-sync-catalogues"
                    ? `Synced ${result.approvalResult.syncResult?.syncedCount || 0} items`
                    : "Skipped"
            });
        }

        if (result.syncResult) {
            summaryDetails.push({
                label: "Catalogue Sync",
                value: `Synced ${result.syncResult.syncedCount || 0} items`
            });
        }

        await showSummaryModal({
            title: result.mode === "create"
                ? "Product Added"
                : result.pricingAction === "approve-price-change"
                    ? "Product Saved and Price Approved"
                    : result.pricingAction === "approve-and-sync-catalogues"
                        ? "Product Saved, Approved, and Synced"
                        : result.pricingAction === "sync-catalogues"
                            ? "Product Saved and Synced"
                        : "Product Saved",
            message: "The product record has been saved successfully.",
            details: summaryDetails
        });
    } catch (error) {
        console.error("[Moneta] Product save failed:", error);
        if (error.productSaved) {
            featureState.editingProductId = null;
            renderProductsView();
            showToast(error.message || "Product was saved, but the requested follow-up action could not be completed.", "warning", {
                title: "Product Catalogue"
            });
            return;
        }

        showToast(error.message || "Could not save the product.", "error", {
            title: "Product Catalogue"
        });
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

        if (target.id === "product-type") {
            syncProductPricingFormState();
            return;
        }

        if (target.id === "product-unit-price" || target.id === "product-margin") {
            updateSellingPricePreview();
        }

        if (target.id === "product-live-selling-price" && target.dataset.editable === "true") {
            target.dataset.touched = "true";
            updateSellingPricePreview();
        }

        if (target.id === "products-grid-search") {
            featureState.searchTerm = target.value || "";
            updateProductsGridSearch(featureState.searchTerm);
        }
    });

    root.addEventListener("change", event => {
        const target = event.target;

        if (target.id === "product-type") {
            syncProductPricingFormState();
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
