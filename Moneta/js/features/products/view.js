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

function inferStandardCostSource(product = {}, settings = {}) {
    if (settings.costingMethod === "manual-standard-cost") {
        return "manual-standard-cost";
    }

    const storedSource = product?.pricingMeta?.standardCostSource;
    if (storedSource === "manual-override" && settings.allowManualCostOverride) {
        return "manual-override";
    }

    if (!settings.allowManualCostOverride) {
        return "policy-default";
    }

    const policyDerivedCost = getPolicyDerivedStandardCost(product, settings);
    return roundCurrency(product?.unitPrice) !== policyDerivedCost
        ? "manual-override"
        : "policy-default";
}

function getStandardCostHelpCopy(settings = {}, source = "policy-default", policyDerivedCost = 0) {
    const costingLabel = getCostingMethodLabel(settings);
    const formattedPolicyCost = `₹${roundCurrency(policyDerivedCost).toFixed(2)}`;

    if (settings.costingMethod === "manual-standard-cost") {
        return "Standard cost is fully manual under the active pricing policy.";
    }

    if (source === "manual-override") {
        return `Manual override is active. Moneta will keep this entered standard cost until you switch back to ${costingLabel}.`;
    }

    if (!settings.allowManualCostOverride) {
        return `Locked by pricing policy: ${costingLabel} controls standard cost for this product. Current policy cost: ${formattedPolicyCost}.`;
    }

    return `Controlled by pricing policy: ${costingLabel} is currently supplying the standard cost. Current policy cost: ${formattedPolicyCost}. Switch Cost Source to Manual Override if you need an exception.`;
}

function syncStandardCostSourceControl() {
    const costSourceSelect = document.getElementById("product-cost-source");
    const standardCostInput = document.getElementById("product-unit-price");
    const standardCostHelp = document.getElementById("product-unit-price-help");

    if (!costSourceSelect || !standardCostInput || !standardCostHelp) {
        return;
    }

    const allowManualOverride = costSourceSelect.dataset.allowManualCostOverride === "true";
    const isManualOverride = allowManualOverride && costSourceSelect.value === "manual-override";
    const manualCost = standardCostInput.dataset.manualCost || standardCostInput.value || 0;
    const policyCost = standardCostInput.dataset.policyCost || standardCostInput.value || 0;

    if (isManualOverride) {
        standardCostInput.removeAttribute("readonly");
        standardCostInput.readOnly = false;
        standardCostInput.value = manualCost;
        requestAnimationFrame(() => {
            standardCostInput.focus();
            if (typeof standardCostInput.select === "function") {
                standardCostInput.select();
            }
        });
    } else {
        standardCostInput.setAttribute("readonly", "readonly");
        standardCostInput.readOnly = true;
        standardCostInput.value = policyCost;
    }

    standardCostHelp.textContent = getStandardCostHelpCopy(
        {
            costingMethod: costSourceSelect.dataset.costingMethod,
            allowManualCostOverride: allowManualOverride
        },
        isManualOverride ? "manual-override" : "policy-default",
        policyCost
    );

    updateSellingPricePreview();
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
    const isPurchaseDrivenCosting = pricingPolicySettings.costingMethod === "weighted-average"
        || pricingPolicySettings.costingMethod === "latest-purchase";
    const standardCostSource = editingProduct
        ? inferStandardCostSource(editingProduct, pricingPolicySettings)
        : pricingPolicySettings.costingMethod === "manual-standard-cost"
            ? "manual-standard-cost"
            : "policy-default";
    const policyDerivedStandardCost = editingProduct
        ? getPolicyDerivedStandardCost(editingProduct, pricingPolicySettings)
        : 0;
    const marginValue = editingProduct?.unitMarginPercentage ?? pricingPolicySettings.defaultTargetMarginPercentage;
    const standardCostValue = editingProduct?.unitPrice || 0;
    const displayedStandardCost = editingProduct && isPurchaseDrivenCosting && standardCostSource !== "manual-override"
        ? policyDerivedStandardCost
        : standardCostValue;
    const recommendedSellingPrice = calculateSellingPrice(displayedStandardCost, marginValue);
    const liveSellingPrice = editingProduct?.sellingPrice ?? recommendedSellingPrice;
    const isManualSellingPrice = pricingPolicySettings.sellingPriceBehavior === "manual";
    const costOverrideLocked = Boolean(editingProduct)
        && isPurchaseDrivenCosting
        && standardCostSource !== "manual-override";
    const isAdminUser = snapshot.currentUser?.role === "admin";
    const showAdminFastTrackActions = isAdminUser && Boolean(editingProduct);
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
                                        ${editingProduct && isPurchaseDrivenCosting ? `
                                            <label for="product-cost-source">Cost Source</label>
                                            <select
                                                id="product-cost-source"
                                                class="select"
                                                data-costing-method="${pricingPolicySettings.costingMethod}"
                                                data-allow-manual-override="${pricingPolicySettings.allowManualCostOverride ? "true" : "false"}"
                                                ${pricingPolicySettings.allowManualCostOverride ? "" : "disabled"}>
                                                <option value="policy-default" ${standardCostSource !== "manual-override" ? "selected" : ""}>
                                                    Use ${getCostingMethodLabel(pricingPolicySettings)}
                                                </option>
                                                <option value="manual-override" ${standardCostSource === "manual-override" ? "selected" : ""} ${pricingPolicySettings.allowManualCostOverride ? "" : "disabled"}>
                                                    Manual Override
                                                </option>
                                            </select>
                                        ` : ""}
                                        <label for="product-unit-price">Standard Cost</label>
                                        <input
                                            id="product-unit-price"
                                            class="input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value="${displayedStandardCost}"
                                            data-policy-cost="${policyDerivedStandardCost}"
                                            data-manual-cost="${standardCostValue}"
                                            ${costOverrideLocked ? "readonly" : ""}>
                                        <p id="product-unit-price-help" class="panel-copy panel-copy-tight">${editingProduct
                                            ? getStandardCostHelpCopy(pricingPolicySettings, standardCostSource, policyDerivedStandardCost)
                                            : "Use this as the starting standard cost. Moneta can later refresh it from purchase history if the policy requires it."}</p>
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
                                    ${editingProduct && isPurchaseDrivenCosting ? `
                                        <p class="panel-copy panel-copy-tight">
                                            Cost source: ${standardCostSource === "manual-override"
                                                ? "Manual Override"
                                                : getCostingMethodLabel(pricingPolicySettings)}.
                                        </p>
                                    ` : ""}
                                    <p class="panel-copy panel-copy-tight">${priceReviewCopy}</p>
                                    ${showAdminFastTrackActions ? `
                                        <p class="panel-copy panel-copy-tight">
                                            Standard save already creates a price review when pricing impact exists. Use the admin approval actions below only when you want to fast-track the pricing decision immediately.
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
    syncStandardCostSourceControl();
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
                standardCostSource: document.getElementById("product-cost-source")?.value,
                unitPrice: document.getElementById("product-unit-price")?.value,
                unitMarginPercentage: document.getElementById("product-margin")?.value,
                sellingPrice: document.getElementById("product-selling-price")?.value,
                inventoryCount: document.getElementById("product-inventory")?.value,
                netWeightKg: document.getElementById("product-weight")?.value
            }, getState().masterData, getState().currentUser, {
                postSaveAction: saveIntent
            });

            update(
                saveIntent === "approve-and-sync-catalogues"
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

        await showSummaryModal({
            title: result.mode === "create"
                ? "Product Added"
                : result.pricingAction === "approve-price-change"
                    ? "Product Saved and Price Approved"
                    : result.pricingAction === "approve-and-sync-catalogues"
                        ? "Product Saved, Approved, and Synced"
                        : "Product Saved",
            message: "The product record has been saved successfully.",
            details: summaryDetails
        });
    } catch (error) {
        console.error("[Moneta] Product save failed:", error);
        if (error.productSaved) {
            featureState.editingProductId = null;
            renderProductsView();
            showToast("Product was saved, but the fast-track pricing action could not be completed. The review remains pending.", "warning", {
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

        if (target.id === "product-cost-source") {
            syncStandardCostSourceControl();
            return;
        }

        if (target.id === "product-unit-price" || target.id === "product-margin") {
            if (target.id === "product-unit-price" && !target.readOnly) {
                target.dataset.manualCost = target.value || "0";
            }
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

    root.addEventListener("change", event => {
        const target = event.target;

        if (target.id === "product-cost-source") {
            syncStandardCostSourceControl();
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
