import { getState, subscribe } from "../../app/store.js";
import { showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import { subscribeToPurchaseInvoices } from "./repository.js";
import { calculatePurchaseDraftSummary, savePurchaseInvoice } from "./service.js";
import { initializePurchasesGrid, refreshPurchasesGrid, updatePurchasesGridSearch } from "./grid.js";

const featureState = {
    invoices: [],
    editingInvoiceId: null,
    searchTerm: "",
    unsubscribeInvoices: null,
    bulkProductSearch: "",
    selectedBulkProductIds: new Set(),
    filteredInvoiceCount: 0
};

function normalizeText(value) {
    return (value || "").trim();
}

function toDateInputValue(value) {
    if (!value) return "";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function normalizeStoredDiscountType(value) {
    return normalizeText(value) === "Percentage" ? "Percentage" : "Fixed";
}

function getInvoiceDiscountFieldValues(invoice) {
    const discountType = normalizeStoredDiscountType(invoice?.invoiceDiscountType);
    const storedValue = Number(invoice?.invoiceDiscountValue) || 0;

    return {
        discountType,
        discountPercentageValue: discountType === "Percentage" ? storedValue : "",
        discountFixedValue: discountType === "Fixed" ? storedValue : ""
    };
}

function getEditingInvoice() {
    if (!featureState.editingInvoiceId) return null;
    return featureState.invoices.find(invoice => invoice.id === featureState.editingInvoiceId) || null;
}

function renderSupplierOptions(suppliers, currentValue) {
    return suppliers.map(supplier => `
        <option value="${supplier.id}" ${supplier.id === currentValue ? "selected" : ""}>
            ${supplier.supplierName}
        </option>
    `).join("");
}

function renderProductOptions(products, currentValue) {
    return products.map(product => `
        <option value="${product.id}" ${product.id === currentValue ? "selected" : ""}>
            ${product.itemName} (${product.itemId || "Pending ID"})
        </option>
    `).join("");
}

function getCurrentLineItemProductIds(root) {
    if (!root) return new Set();

    return new Set(
        getDraftLineItemsFromDom(root)
            .map(item => normalizeText(item.masterProductId))
            .filter(Boolean)
    );
}

function getVisibleBulkProducts(products) {
    const searchTerm = featureState.bulkProductSearch.toLowerCase();

    return products.filter(product => {
        if (!searchTerm) return true;

        const haystack = [
            product.itemName,
            product.itemId,
            product.inventoryCount,
            product.categoryId
        ]
            .filter(value => value !== undefined && value !== null)
            .join(" ")
            .toLowerCase();

        return haystack.includes(searchTerm);
    });
}

function renderBulkProductPicker(products, addedProductIds) {
    const visibleProducts = getVisibleBulkProducts(products);

    if (visibleProducts.length === 0) {
        return `
            <div class="empty-state">
                No products match the current bulk-add filter.
            </div>
        `;
    }

    return visibleProducts.map(product => {
        const isAlreadyAdded = addedProductIds.has(product.id);
        const isChecked = featureState.selectedBulkProductIds.has(product.id);

        return `
            <label class="bulk-product-option ${isAlreadyAdded ? "bulk-product-option-disabled" : ""}">
                <input
                    class="purchase-bulk-product-checkbox"
                    type="checkbox"
                    value="${product.id}"
                    ${isChecked ? "checked" : ""}
                    ${isAlreadyAdded ? "disabled" : ""}>
                <span class="bulk-product-copy">
                    <strong>${product.itemName}</strong>
                    <span class="panel-copy">${product.itemId || "Pending ID"} • Stock ${product.inventoryCount || 0} • Cost ${formatCurrency(product.unitPrice || 0)}</span>
                </span>
                <span class="status-pill">${isAlreadyAdded ? "Added" : "Ready"}</span>
            </label>
        `;
    }).join("");
}

function getLineItemProductMeta(products, item) {
    const product = products.find(entry => entry.id === normalizeText(item.masterProductId));
    if (!product) return "Select a product to attach stock and weight context.";

    return `Stock ${product.inventoryCount || 0} units • Net wt ${Number(product.netWeightKg || 0).toFixed(3)} kg`;
}

function renderLineItemRow(item, index, products) {
    const lineItem = {
        masterProductId: normalizeText(item.masterProductId),
        quantity: Number(item.quantity) || 0,
        unitPurchasePrice: Number(item.unitPurchasePrice) || 0,
        discountType: normalizeStoredDiscountType(item.discountType),
        discountValue: Number(item.discountValue) || 0,
        taxPercentage: Number(item.taxPercentage) || 0,
        lineItemTotal: Number(item.lineItemTotal) || 0
    };

    return `
        <div class="line-item-row" data-line-item-row>
            <div class="line-item-grid">
                <div class="field field-full">
                    <label for="purchase-product-${index}">Product</label>
                    <select id="purchase-product-${index}" class="select line-item-product" data-field="masterProductId">
                        <option value="">Select product</option>
                        ${renderProductOptions(products, lineItem.masterProductId)}
                    </select>
                    <p class="line-item-note">${getLineItemProductMeta(products, lineItem)}</p>
                </div>
                <div class="field">
                    <label for="purchase-qty-${index}">Qty</label>
                    <input id="purchase-qty-${index}" class="input" type="number" min="0" step="1" value="${lineItem.quantity || ""}" data-field="quantity">
                </div>
                <div class="field">
                    <label for="purchase-price-${index}">Unit Price</label>
                    <input id="purchase-price-${index}" class="input" type="number" min="0" step="0.01" value="${lineItem.unitPurchasePrice || ""}" data-field="unitPurchasePrice">
                </div>
                <div class="field">
                    <label for="purchase-discount-type-${index}">Discount Type</label>
                    <select id="purchase-discount-type-${index}" class="select" data-field="discountType">
                        <option value="Percentage" ${lineItem.discountType === "Percentage" ? "selected" : ""}>Percentage</option>
                        <option value="Fixed" ${lineItem.discountType === "Fixed" ? "selected" : ""}>Fixed</option>
                    </select>
                </div>
                <div class="field">
                    <label for="purchase-discount-value-${index}">Discount</label>
                    <input id="purchase-discount-value-${index}" class="input" type="number" min="0" step="0.01" value="${lineItem.discountValue || ""}" data-field="discountValue">
                </div>
                <div class="field">
                    <label for="purchase-tax-${index}">Tax %</label>
                    <input id="purchase-tax-${index}" class="input" type="number" min="0" step="0.01" value="${lineItem.taxPercentage || ""}" data-field="taxPercentage">
                </div>
                <div class="field">
                    <label for="purchase-total-${index}">Line Total</label>
                    <input id="purchase-total-${index}" class="input line-item-total" type="text" value="${formatCurrency(lineItem.lineItemTotal || 0)}" readonly>
                </div>
            </div>
            <div class="line-item-actions">
                <button class="button button-ghost purchase-remove-line-item" type="button">
                    <span class="button-icon">${icons.inactive}</span>
                    Remove line
                </button>
            </div>
        </div>
    `;
}

function renderPurchasesViewShell(snapshot) {
    const root = document.getElementById("purchases-root");
    if (!root) return;

    const editingInvoice = getEditingInvoice();
    const invoiceDiscountFields = getInvoiceDiscountFieldValues(editingInvoice);
    const suppliers = snapshot.masterData.suppliers || [];
    const products = snapshot.masterData.products || [];
    const draftLineItems = editingInvoice?.lineItems?.length
        ? editingInvoice.lineItems
        : [{ quantity: 1, discountType: "Percentage", taxPercentage: 0 }];
    const draftLineItemIds = new Set(
        draftLineItems
            .map(item => normalizeText(item.masterProductId))
            .filter(Boolean)
    );
    const draftSummary = calculatePurchaseDraftSummary({
        lineItems: draftLineItems,
        invoiceDiscountType: invoiceDiscountFields.discountType,
        invoiceDiscountValue: invoiceDiscountFields.discountType === "Percentage"
            ? invoiceDiscountFields.discountPercentageValue
            : invoiceDiscountFields.discountFixedValue,
        invoiceTaxPercentage: editingInvoice?.invoiceTaxPercentage || 0
    }, products);
    const canSaveInvoice = suppliers.length > 0 && products.length > 0;

    root.innerHTML = `
        <div class="section-stack">
            <div class="panel-card">
                <div class="panel-header panel-header-accent">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.purchases}</span>
                        <div>
                            <h2>${editingInvoice ? "Edit Purchase Invoice" : "Purchase Invoices"}</h2>
                            <p class="panel-copy">Capture supplier invoices and update inventory with transaction-safe stock movement.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span class="status-pill">${featureState.invoices.length} invoices</span>
                        <span class="status-pill">${products.length} active products</span>
                    </div>
                </div>
                <div class="panel-body">
                    <form id="purchase-invoice-form">
                        <input type="hidden" id="purchase-invoice-doc-id" value="${editingInvoice?.id || ""}">
                        <div class="form-grid">
                            <div class="field">
                                <label for="purchase-date">Purchase Date</label>
                                <input id="purchase-date" class="input" type="date" value="${toDateInputValue(editingInvoice?.purchaseDate) || toDateInputValue(new Date())}" required>
                            </div>
                            <div class="field">
                                <label for="purchase-supplier">Supplier</label>
                                <select id="purchase-supplier" class="select" required>
                                    <option value="">Select supplier</option>
                                    ${renderSupplierOptions(suppliers, editingInvoice?.supplierId)}
                                </select>
                            </div>
                            <div class="field">
                                <label for="supplier-invoice-no">Supplier Invoice Ref</label>
                                <input id="supplier-invoice-no" class="input" type="text" value="${editingInvoice?.supplierInvoiceNo || ""}" placeholder="Optional supplier invoice number">
                            </div>
                            <div class="field field-wide">
                                <label for="purchase-invoice-name">Invoice Name</label>
                                <input id="purchase-invoice-name" class="input" type="text" value="${editingInvoice?.invoiceName || ""}" placeholder="Stock Purchase - Apr 2026" required>
                            </div>
                        </div>

                        <div class="toolbar" style="margin-top: 1.5rem;">
                            <div>
                                <p class="section-kicker" style="margin-bottom: 0.25rem;">Line Items</p>
                                <p class="panel-copy">Each line updates the matching product inventory when the invoice is saved, and you can bulk-add products before fine-tuning the rows.</p>
                            </div>
                            <div class="toolbar-meta">
                                <button id="purchase-select-visible-products" class="button button-ghost" type="button">
                                    Select Visible
                                </button>
                                <button id="purchase-clear-bulk-selection" class="button button-ghost" type="button">
                                    Clear Selection
                                </button>
                                <button id="purchase-add-selected-products" class="button button-secondary" type="button">
                                    <span class="button-icon">${icons.plus}</span>
                                    Add Selected Products
                                </button>
                                <button id="purchase-add-line-item" class="button button-secondary" type="button">
                                    <span class="button-icon">${icons.plus}</span>
                                    Add Single Line
                                </button>
                            </div>
                        </div>

                        <div class="bulk-product-picker">
                            <div class="bulk-product-picker-header">
                                <div>
                                    <p class="section-kicker" style="margin-bottom: 0.25rem;">Bulk Add</p>
                                    <p class="panel-copy">Select multiple products here, then add them to the invoice in one step.</p>
                                </div>
                                <div class="search-wrap">
                                    <span class="search-icon">${icons.search}</span>
                                    <input id="purchase-bulk-product-search" class="input toolbar-search" type="search" placeholder="Search products by name or code" value="${featureState.bulkProductSearch}">
                                </div>
                            </div>
                            <div class="bulk-product-picker-meta">
                                <span id="purchase-bulk-selection-summary" class="panel-copy">
                                    ${featureState.selectedBulkProductIds.size} products selected
                                </span>
                            </div>
                            <div id="purchase-bulk-product-list" class="bulk-product-list">
                                ${renderBulkProductPicker(products, draftLineItemIds)}
                            </div>
                        </div>

                        <div id="purchase-line-items-container" class="line-items-list">
                            ${draftLineItems.map((item, index) => renderLineItemRow(item, index, products)).join("")}
                        </div>

                        <div class="purchase-adjustments">
                            <div class="purchase-adjustments-header">
                                <div>
                                    <p class="section-kicker" style="margin-bottom: 0.25rem;">Invoice Adjustments</p>
                                    <p class="panel-copy">Invoice-level discount and tax are applied after the line items are calculated.</p>
                                </div>
                            </div>
                            <div class="purchase-adjustments-grid">
                                <div class="field">
                                    <label for="invoice-discount-type">Invoice Discount Type</label>
                                    <select id="invoice-discount-type" class="select">
                                        <option value="Percentage" ${invoiceDiscountFields.discountType === "Percentage" ? "selected" : ""}>Percentage</option>
                                        <option value="Fixed" ${invoiceDiscountFields.discountType === "Fixed" ? "selected" : ""}>Fixed</option>
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="invoice-discount-percentage">Invoice Discount %</label>
                                    <input id="invoice-discount-percentage" class="input" type="number" min="0" step="0.01" value="${invoiceDiscountFields.discountPercentageValue}">
                                </div>
                                <div class="field">
                                    <label for="invoice-discount-fixed">Invoice Discount Amount</label>
                                    <input id="invoice-discount-fixed" class="input" type="number" min="0" step="0.01" value="${invoiceDiscountFields.discountFixedValue}">
                                </div>
                                <div class="field">
                                    <label for="invoice-tax-percentage">Invoice Tax %</label>
                                    <input id="invoice-tax-percentage" class="input" type="number" min="0" step="0.01" value="${editingInvoice?.invoiceTaxPercentage || ""}">
                                </div>
                            </div>
                        </div>

                        <div class="purchase-summary-grid">
                            <article class="summary-card">
                                <p class="summary-label">Items Subtotal</p>
                                <p id="purchase-summary-subtotal" class="summary-value">${formatCurrency(draftSummary.itemsSubtotal)}</p>
                            </article>
                            <article class="summary-card">
                                <p class="summary-label">Invoice Discount</p>
                                <p id="purchase-summary-discount" class="summary-value">${formatCurrency(draftSummary.invoiceDiscountAmount)}</p>
                            </article>
                            <article class="summary-card">
                                <p class="summary-label">Total Tax</p>
                                <p id="purchase-summary-tax" class="summary-value">${formatCurrency(draftSummary.totalTaxAmount)}</p>
                            </article>
                            <article class="summary-card">
                                <p class="summary-label">Invoice Total</p>
                                <p id="purchase-summary-total" class="summary-value">${formatCurrency(draftSummary.invoiceTotal)}</p>
                            </article>
                        </div>

                        ${canSaveInvoice ? "" : `
                            <p class="panel-copy" style="margin-top: 1rem;">
                                You need at least one active supplier and one active product before creating purchase invoices.
                            </p>
                        `}

                        <div class="form-actions">
                            ${editingInvoice ? `
                                <button id="purchase-cancel-button" class="button button-secondary" type="button">
                                    <span class="button-icon">${icons.inactive}</span>
                                    Cancel
                                </button>
                            ` : ""}
                            <button class="button button-primary-alt" type="submit" ${canSaveInvoice ? "" : "disabled"}>
                                <span class="button-icon">${editingInvoice ? icons.edit : icons.plus}</span>
                                ${editingInvoice ? "Update Invoice" : "Save Invoice"}
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
                            <h3>Invoice History</h3>
                            <p class="panel-copy">Live purchase invoice records from the shared Firestore purchase ledger.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span id="purchase-grid-visible-count" class="status-pill">${featureState.filteredInvoiceCount || featureState.invoices.length} visible</span>
                        <div class="search-wrap">
                            <span class="search-icon">${icons.search}</span>
                            <input id="purchase-search" class="input toolbar-search" type="search" placeholder="Search by invoice, supplier, reference, or status" value="${featureState.searchTerm}">
                        </div>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="ag-shell">
                        <div id="purchases-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getDraftLineItemsFromDom(root) {
    return Array.from(root.querySelectorAll("[data-line-item-row]")).map(row => ({
        masterProductId: row.querySelector('[data-field="masterProductId"]')?.value || "",
        quantity: row.querySelector('[data-field="quantity"]')?.value || 0,
        unitPurchasePrice: row.querySelector('[data-field="unitPurchasePrice"]')?.value || 0,
        discountType: row.querySelector('[data-field="discountType"]')?.value || "Percentage",
        discountValue: row.querySelector('[data-field="discountValue"]')?.value || 0,
        taxPercentage: row.querySelector('[data-field="taxPercentage"]')?.value || 0
    }));
}

function getInvoiceAdjustmentDraftFromDom() {
    const discountType = normalizeStoredDiscountType(document.getElementById("invoice-discount-type")?.value);
    const percentageValue = document.getElementById("invoice-discount-percentage")?.value || 0;
    const fixedValue = document.getElementById("invoice-discount-fixed")?.value || 0;

    return {
        discountType,
        discountPercentageValue: percentageValue,
        discountFixedValue: fixedValue,
        invoiceDiscountValue: discountType === "Percentage" ? percentageValue : fixedValue,
        invoiceTaxPercentage: document.getElementById("invoice-tax-percentage")?.value || 0
    };
}

function syncInvoiceAdjustmentInputs() {
    const discountType = normalizeStoredDiscountType(document.getElementById("invoice-discount-type")?.value);
    const percentageInput = document.getElementById("invoice-discount-percentage");
    const fixedInput = document.getElementById("invoice-discount-fixed");

    if (!percentageInput || !fixedInput) return;

    const isPercentage = discountType === "Percentage";
    percentageInput.disabled = !isPercentage;
    fixedInput.disabled = isPercentage;
}

function refreshBulkProductPicker() {
    const root = document.getElementById("purchases-root");
    if (!root) return;

    const products = getState().masterData.products || [];
    const listNode = document.getElementById("purchase-bulk-product-list");
    const summaryNode = document.getElementById("purchase-bulk-selection-summary");
    const addedProductIds = getCurrentLineItemProductIds(root);

    featureState.selectedBulkProductIds.forEach(productId => {
        if (addedProductIds.has(productId)) {
            featureState.selectedBulkProductIds.delete(productId);
        }
    });

    if (listNode) {
        listNode.innerHTML = renderBulkProductPicker(products, addedProductIds);
    }

    if (summaryNode) {
        const visibleProducts = getVisibleBulkProducts(products);
        const selectableVisibleCount = visibleProducts.filter(product => !addedProductIds.has(product.id)).length;
        summaryNode.textContent = `${featureState.selectedBulkProductIds.size} selected • ${selectableVisibleCount} visible products ready to add`;
    }
}

function syncPurchasesGrid() {
    const rows = featureState.invoices.slice();
    const gridElement = document.getElementById("purchases-grid");

    initializePurchasesGrid(gridElement, count => {
        featureState.filteredInvoiceCount = count;
        const countNode = document.getElementById("purchase-grid-visible-count");
        if (countNode) {
            countNode.textContent = `${count} visible`;
        }
    });
    refreshPurchasesGrid(rows);
    updatePurchasesGridSearch(featureState.searchTerm);
}

function updatePurchaseDraftPreview() {
    const root = document.getElementById("purchases-root");
    if (!root) return;

    const snapshot = getState();
    const products = snapshot.masterData.products || [];
    const adjustments = getInvoiceAdjustmentDraftFromDom();
    const summary = calculatePurchaseDraftSummary({
        lineItems: getDraftLineItemsFromDom(root),
        invoiceDiscountType: adjustments.discountType,
        invoiceDiscountValue: adjustments.invoiceDiscountValue,
        invoiceTaxPercentage: adjustments.invoiceTaxPercentage
    }, products);

    root.querySelectorAll("[data-line-item-row]").forEach((row, index) => {
        const lineItem = summary.lineItems[index];
        const totalField = row.querySelector(".line-item-total");
        const noteField = row.querySelector(".line-item-note");

        if (totalField && lineItem) {
            totalField.value = formatCurrency(lineItem.lineItemTotal || 0);
        }

        if (noteField && lineItem) {
            noteField.textContent = getLineItemProductMeta(products, lineItem);
        }
    });

    const subtotalNode = document.getElementById("purchase-summary-subtotal");
    const discountNode = document.getElementById("purchase-summary-discount");
    const taxNode = document.getElementById("purchase-summary-tax");
    const totalNode = document.getElementById("purchase-summary-total");

    if (subtotalNode) subtotalNode.textContent = formatCurrency(summary.itemsSubtotal);
    if (discountNode) discountNode.textContent = formatCurrency(summary.invoiceDiscountAmount);
    if (taxNode) taxNode.textContent = formatCurrency(summary.totalTaxAmount);
    if (totalNode) totalNode.textContent = formatCurrency(summary.invoiceTotal);

    syncInvoiceAdjustmentInputs();
    refreshBulkProductPicker();
}

function appendNewLineItemRow() {
    const root = document.getElementById("purchases-root");
    const container = document.getElementById("purchase-line-items-container");
    if (!root || !container) return;

    const products = getState().masterData.products || [];
    const rowCount = container.querySelectorAll("[data-line-item-row]").length;

    container.insertAdjacentHTML(
        "beforeend",
        renderLineItemRow(
            { quantity: 1, discountType: "Percentage", taxPercentage: 0 },
            rowCount,
            products
        )
    );

    updatePurchaseDraftPreview();
}

function appendProductsToInvoice(productIds) {
    const root = document.getElementById("purchases-root");
    const container = document.getElementById("purchase-line-items-container");
    if (!root || !container || productIds.length === 0) return;

    const products = getState().masterData.products || [];
    const productsById = new Map(products.map(product => [product.id, product]));
    const currentProductIds = getCurrentLineItemProductIds(root);
    const productIdsToAdd = productIds.filter(productId => !currentProductIds.has(productId) && productsById.has(productId));
    const skippedCount = productIds.length - productIdsToAdd.length;
    const rowCount = container.querySelectorAll("[data-line-item-row]").length;

    productIdsToAdd.forEach((productId, index) => {
        const product = productsById.get(productId);

        container.insertAdjacentHTML(
            "beforeend",
            renderLineItemRow(
                {
                    masterProductId: product.id,
                    quantity: 1,
                    unitPurchasePrice: Number(product.unitPrice) || 0,
                    discountType: "Percentage",
                    discountValue: 0,
                    taxPercentage: 0
                },
                rowCount + index,
                products
            )
        );

        featureState.selectedBulkProductIds.delete(productId);
    });

    updatePurchaseDraftPreview();

    if (productIdsToAdd.length > 0) {
        showToast(`${productIdsToAdd.length} product${productIdsToAdd.length === 1 ? "" : "s"} added to the invoice.`, "success");
    }

    if (skippedCount > 0) {
        showToast(`${skippedCount} product${skippedCount === 1 ? "" : "s"} were already on the invoice and were skipped.`, "info");
    }
}

function removeLineItemRow(button) {
    const container = document.getElementById("purchase-line-items-container");
    const row = button.closest("[data-line-item-row]");
    if (!container || !row) return;

    row.remove();

    if (container.querySelectorAll("[data-line-item-row]").length === 0) {
        appendNewLineItemRow();
        return;
    }

    updatePurchaseDraftPreview();
}

async function handlePurchaseFormSubmit(event) {
    event.preventDefault();

    const root = document.getElementById("purchases-root");
    if (!root) return;

    const adjustments = getInvoiceAdjustmentDraftFromDom();

    try {
        const result = await savePurchaseInvoice({
            docId: document.getElementById("purchase-invoice-doc-id")?.value,
            purchaseDate: document.getElementById("purchase-date")?.value,
            supplierId: document.getElementById("purchase-supplier")?.value,
            supplierInvoiceNo: document.getElementById("supplier-invoice-no")?.value,
            invoiceName: document.getElementById("purchase-invoice-name")?.value,
            invoiceDiscountType: adjustments.discountType,
            invoiceDiscountValue: adjustments.invoiceDiscountValue,
            invoiceTaxPercentage: adjustments.invoiceTaxPercentage,
            lineItems: getDraftLineItemsFromDom(root)
        }, getState().masterData, getState().currentUser);

        featureState.editingInvoiceId = null;
        featureState.selectedBulkProductIds.clear();
        renderPurchasesView();
        showToast(result.mode === "create"
            ? "Purchase invoice saved and inventory updated."
            : "Purchase invoice updated and inventory reconciled.", "success");
    } catch (error) {
        console.error("[Moneta] Purchase invoice save failed:", error);
        showToast(error.message || "Could not save purchase invoice.", "error");
    }
}

function handleInvoiceSearch(target) {
    featureState.searchTerm = target.value || "";
    updatePurchasesGridSearch(featureState.searchTerm);
}

function handleEditInvoice(button) {
    featureState.editingInvoiceId = button.dataset.invoiceId || null;
    featureState.selectedBulkProductIds.clear();
    renderPurchasesView();
    document.getElementById("purchase-invoice-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleBulkProductSearch(target) {
    featureState.bulkProductSearch = target.value || "";
    refreshBulkProductPicker();
}

function handleBulkProductToggle(target) {
    const productId = normalizeText(target.value);
    if (!productId) return;

    if (target.checked) {
        featureState.selectedBulkProductIds.add(productId);
    } else {
        featureState.selectedBulkProductIds.delete(productId);
    }

    refreshBulkProductPicker();
}

function handleSelectVisibleBulkProducts() {
    const root = document.getElementById("purchases-root");
    if (!root) return;

    const products = getState().masterData.products || [];
    const addedProductIds = getCurrentLineItemProductIds(root);

    getVisibleBulkProducts(products).forEach(product => {
        if (!addedProductIds.has(product.id)) {
            featureState.selectedBulkProductIds.add(product.id);
        }
    });

    refreshBulkProductPicker();
}

function handleClearBulkSelection() {
    featureState.selectedBulkProductIds.clear();
    refreshBulkProductPicker();
}

function handleAddSelectedProducts() {
    if (featureState.selectedBulkProductIds.size === 0) {
        showToast("Select one or more products from Bulk Add first.", "info");
        return;
    }

    appendProductsToInvoice(Array.from(featureState.selectedBulkProductIds));
}

function bindPurchasesDomEvents() {
    const root = document.getElementById("purchases-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("submit", event => {
        if (event.target.id === "purchase-invoice-form") {
            handlePurchaseFormSubmit(event);
        }
    });

    root.addEventListener("input", event => {
        const target = event.target;

        if (target.id === "purchase-search") {
            handleInvoiceSearch(target);
            return;
        }

        if (target.id === "purchase-bulk-product-search") {
            handleBulkProductSearch(target);
            return;
        }

        if (
            target.id === "invoice-discount-percentage" ||
            target.id === "invoice-discount-fixed" ||
            target.id === "invoice-tax-percentage" ||
            target.matches("[data-field='quantity']") ||
            target.matches("[data-field='unitPurchasePrice']") ||
            target.matches("[data-field='discountValue']") ||
            target.matches("[data-field='taxPercentage']")
        ) {
            updatePurchaseDraftPreview();
        }
    });

    root.addEventListener("change", event => {
        const target = event.target;

        if (
            target.id === "purchase-supplier" ||
            target.id === "invoice-discount-type" ||
            target.matches("[data-field='masterProductId']") ||
            target.matches("[data-field='discountType']")
        ) {
            updatePurchaseDraftPreview();
            return;
        }

        if (target.matches(".purchase-bulk-product-checkbox")) {
            handleBulkProductToggle(target);
        }
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const addButton = target.closest("#purchase-add-line-item");
        const addSelectedButton = target.closest("#purchase-add-selected-products");
        const selectVisibleButton = target.closest("#purchase-select-visible-products");
        const clearSelectionButton = target.closest("#purchase-clear-bulk-selection");
        const removeButton = target.closest(".purchase-remove-line-item");
        const editButton = target.closest(".purchase-edit-button");
        const cancelButton = target.closest("#purchase-cancel-button");

        if (addButton) {
            appendNewLineItemRow();
            return;
        }

        if (addSelectedButton) {
            handleAddSelectedProducts();
            return;
        }

        if (selectVisibleButton) {
            handleSelectVisibleBulkProducts();
            return;
        }

        if (clearSelectionButton) {
            handleClearBulkSelection();
            return;
        }

        if (removeButton) {
            removeLineItemRow(removeButton);
            return;
        }

        if (editButton) {
            handleEditInvoice(editButton);
            return;
        }

        if (cancelButton) {
            featureState.editingInvoiceId = null;
            featureState.selectedBulkProductIds.clear();
            renderPurchasesView();
        }
    });

    root.dataset.bound = "true";
}

function ensureInvoiceListener(snapshot) {
    const hasUser = Boolean(snapshot.currentUser);

    if (hasUser && !featureState.unsubscribeInvoices) {
        featureState.unsubscribeInvoices = subscribeToPurchaseInvoices(
            invoices => {
                featureState.invoices = invoices;
                featureState.filteredInvoiceCount = invoices.length;

                if (featureState.editingInvoiceId && !invoices.some(invoice => invoice.id === featureState.editingInvoiceId)) {
                    featureState.editingInvoiceId = null;
                }

                if (getState().currentRoute === "#/purchases") {
                    renderPurchasesView();
                }
            },
            error => {
                console.error("[Moneta] Purchase invoice listener failed:", error);
                showToast("Could not load purchase invoices.", "error");
            }
        );
    }

    if (!hasUser && featureState.unsubscribeInvoices) {
        featureState.unsubscribeInvoices();
        featureState.unsubscribeInvoices = null;
        featureState.invoices = [];
        featureState.editingInvoiceId = null;
    }
}

export function renderPurchasesView() {
    const root = document.getElementById("purchases-root");
    if (!root) return;

    renderPurchasesViewShell(getState());
    bindPurchasesDomEvents();
    updatePurchaseDraftPreview();
    syncPurchasesGrid();
}

export function initializePurchasesFeature() {
    subscribe(snapshot => {
        ensureInvoiceListener(snapshot);

        if (snapshot.currentRoute === "#/purchases") {
            renderPurchasesView();
        }
    });
}
