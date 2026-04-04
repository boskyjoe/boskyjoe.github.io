import { getState, subscribe } from "../../app/store.js";
import { showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import { subscribeToPurchaseInvoices } from "./repository.js";
import { calculatePurchaseDraftSummary, savePurchaseInvoice } from "./service.js";
import {
    getPurchaseLineItemsGridRows,
    initializePurchaseLineItemsGrid,
    initializePurchasesGrid,
    refreshPurchaseLineItemsGrid,
    refreshPurchasesGrid,
    updatePurchaseLineItemsGridSearch,
    updatePurchasesGridSearch
} from "./grid.js";

const featureState = {
    invoices: [],
    editingInvoiceId: null,
    searchTerm: "",
    lineItemSearchTerm: "",
    unsubscribeInvoices: null,
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

function getInvoiceAdjustmentDraftFromDom() {
    const discountType = normalizeStoredDiscountType(document.getElementById("invoice-discount-type")?.value);
    const percentageValue = document.getElementById("invoice-discount-percentage")?.value || 0;
    const fixedValue = document.getElementById("invoice-discount-fixed")?.value || 0;

    return {
        discountType,
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

function getPurchaseLineItemRows(snapshot) {
    const editingInvoice = getEditingInvoice();
    const existingLineItems = new Map(
        (editingInvoice?.lineItems || []).map(item => [item.masterProductId, item])
    );

    return (snapshot.masterData.products || []).map(product => {
        const existing = existingLineItems.get(product.id);

        return {
            masterProductId: product.id,
            productName: product.itemName || "Untitled Product",
            inventoryCount: Number(product.inventoryCount) || 0,
            quantity: Number(existing?.quantity) || 0,
            unitPurchasePrice: existing
                ? Number(existing.unitPurchasePrice) || 0
                : Number(product.unitPrice) || 0,
            discountType: normalizeStoredDiscountType(existing?.discountType),
            discountValue: Number(existing?.discountValue) || 0,
            taxPercentage: Number(existing?.taxPercentage) || 0,
            netWeightKg: Number(product.netWeightKg) || 0
        };
    });
}

function getActiveLineItemsFromGrid() {
    return getPurchaseLineItemsGridRows()
        .filter(row => (Number(row.quantity) || 0) > 0)
        .map(row => ({
            masterProductId: row.masterProductId,
            productName: row.productName,
            quantity: Number(row.quantity) || 0,
            unitPurchasePrice: Number(row.unitPurchasePrice) || 0,
            discountType: normalizeStoredDiscountType(row.discountType),
            discountValue: Number(row.discountValue) || 0,
            taxPercentage: Number(row.taxPercentage) || 0,
            netWeightKg: Number(row.netWeightKg) || 0
        }));
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

function syncPurchaseLineItemsGrid(snapshot) {
    const rows = getPurchaseLineItemRows(snapshot);
    const gridElement = document.getElementById("purchase-line-items-grid");

    initializePurchaseLineItemsGrid(gridElement, () => {
        updatePurchaseDraftPreview();
    });
    refreshPurchaseLineItemsGrid(rows);
    updatePurchaseLineItemsGridSearch(featureState.lineItemSearchTerm);
}

function updatePurchaseDraftPreview() {
    const products = getState().masterData.products || [];
    const lineItems = getActiveLineItemsFromGrid();
    const adjustments = getInvoiceAdjustmentDraftFromDom();
    const summary = calculatePurchaseDraftSummary({
        lineItems,
        invoiceDiscountType: adjustments.discountType,
        invoiceDiscountValue: adjustments.invoiceDiscountValue,
        invoiceTaxPercentage: adjustments.invoiceTaxPercentage
    }, products);

    const activeCountNode = document.getElementById("purchase-line-items-active-count");
    const subtotalNode = document.getElementById("purchase-summary-subtotal");
    const discountNode = document.getElementById("purchase-summary-discount");
    const taxNode = document.getElementById("purchase-summary-tax");
    const totalNode = document.getElementById("purchase-summary-total");

    if (activeCountNode) {
        activeCountNode.textContent = `${lineItems.length} active line items`;
    }

    if (subtotalNode) subtotalNode.textContent = formatCurrency(summary.itemsSubtotal);
    if (discountNode) discountNode.textContent = formatCurrency(summary.invoiceDiscountAmount);
    if (taxNode) taxNode.textContent = formatCurrency(summary.totalTaxAmount);
    if (totalNode) totalNode.textContent = formatCurrency(summary.invoiceTotal);

    syncInvoiceAdjustmentInputs();
}

function renderPurchasesViewShell(snapshot) {
    const root = document.getElementById("purchases-root");
    if (!root) return;

    const editingInvoice = getEditingInvoice();
    const invoiceDiscountFields = getInvoiceDiscountFieldValues(editingInvoice);
    const suppliers = snapshot.masterData.suppliers || [];
    const products = snapshot.masterData.products || [];
    const draftSummary = calculatePurchaseDraftSummary({
        lineItems: editingInvoice?.lineItems || [],
        invoiceDiscountType: invoiceDiscountFields.discountType,
        invoiceDiscountValue: invoiceDiscountFields.discountType === "Percentage"
            ? invoiceDiscountFields.discountPercentageValue
            : invoiceDiscountFields.discountFixedValue,
        invoiceTaxPercentage: editingInvoice?.invoiceTaxPercentage || 0
    }, products);
    const canSaveInvoice = suppliers.length > 0 && products.length > 0;
    const initialActiveCount = editingInvoice?.lineItems?.length || 0;

    root.innerHTML = `
        <div class="section-stack">
            <div class="panel-card">
                <div class="panel-header panel-header-accent">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.purchases}</span>
                        <div>
                            <h2>${editingInvoice ? "Edit Purchase Invoice" : "Purchase Invoices"}</h2>
                            <p class="panel-copy">Capture supplier invoices with an AG Grid line-item worksheet built from the active product catalogue.</p>
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

                        <div class="panel-card purchase-line-items-panel">
                            <div class="panel-header">
                                <div class="panel-title-wrap">
                                    <span class="panel-icon">${icons.catalogue}</span>
                                    <div>
                                        <h3>Line Items</h3>
                                        <p class="panel-copy">Search the full active product list and set Qty above 0 to make a row part of the invoice.</p>
                                    </div>
                                </div>
                                <div class="toolbar-meta">
                                    <span id="purchase-line-items-active-count" class="status-pill">${initialActiveCount} active line items</span>
                                    <div class="search-wrap">
                                        <span class="search-icon">${icons.search}</span>
                                        <input id="purchase-line-items-search" class="input toolbar-search" type="search" placeholder="Search products, ids, or stock" value="${featureState.lineItemSearchTerm}">
                                    </div>
                                </div>
                            </div>
                            <div class="panel-body">
                                <div class="ag-shell">
                                    <div id="purchase-line-items-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                                </div>
                            </div>
                        </div>

                        <div class="purchase-adjustments">
                            <div class="purchase-adjustments-header">
                                <div>
                                    <p class="section-kicker" style="margin-bottom: 0.25rem;">Invoice Adjustments</p>
                                    <p class="panel-copy">Invoice-level discount and tax are applied after the active AG Grid line items are calculated.</p>
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

async function handlePurchaseFormSubmit(event) {
    event.preventDefault();

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
            lineItems: getActiveLineItemsFromGrid()
        }, getState().masterData, getState().currentUser);

        featureState.editingInvoiceId = null;
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

function handleLineItemsSearch(target) {
    featureState.lineItemSearchTerm = target.value || "";
    updatePurchaseLineItemsGridSearch(featureState.lineItemSearchTerm);
}

function handleEditInvoice(button) {
    featureState.editingInvoiceId = button.dataset.invoiceId || null;
    featureState.lineItemSearchTerm = "";
    renderPurchasesView();
    document.getElementById("purchase-invoice-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
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

        if (target.id === "purchase-line-items-search") {
            handleLineItemsSearch(target);
            return;
        }

        if (
            target.id === "invoice-discount-percentage" ||
            target.id === "invoice-discount-fixed" ||
            target.id === "invoice-tax-percentage"
        ) {
            updatePurchaseDraftPreview();
        }
    });

    root.addEventListener("change", event => {
        const target = event.target;

        if (
            target.id === "purchase-supplier" ||
            target.id === "invoice-discount-type"
        ) {
            updatePurchaseDraftPreview();
        }
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const editButton = target.closest(".purchase-edit-button");
        const cancelButton = target.closest("#purchase-cancel-button");

        if (editButton) {
            handleEditInvoice(editButton);
            return;
        }

        if (cancelButton) {
            featureState.editingInvoiceId = null;
            featureState.lineItemSearchTerm = "";
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
    const snapshot = getState();
    const root = document.getElementById("purchases-root");
    if (!root) return;

    renderPurchasesViewShell(snapshot);
    bindPurchasesDomEvents();
    syncPurchaseLineItemsGrid(snapshot);
    syncPurchasesGrid();
    updatePurchaseDraftPreview();
}

export function initializePurchasesFeature() {
    subscribe(snapshot => {
        ensureInvoiceListener(snapshot);

        if (snapshot.currentRoute === "#/purchases") {
            renderPurchasesView();
        }
    });
}
