import { getState, subscribe } from "../../app/store.js";
import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import {
    subscribeToInvoicePayments,
    subscribeToPurchaseInvoices
} from "./repository.js";
import {
    calculatePurchaseDraftSummary,
    savePurchaseInvoice,
    savePurchasePayment,
    voidPurchasePayment
} from "./service.js";
import {
    getPurchaseLineItemsGridRows,
    initializePurchaseLineItemsGrid,
    initializePurchasePaymentHistoryGrid,
    initializePurchasesGrid,
    refreshPurchaseLineItemsGrid,
    refreshPurchasePaymentHistoryGrid,
    refreshPurchasesGrid,
    updatePurchaseLineItemsGridSearch,
    updatePurchasesGridSearch
} from "./grid.js";

const featureState = {
    invoices: [],
    payments: [],
    editingInvoiceId: null,
    paymentInvoiceId: null,
    paymentDraft: createDefaultPaymentDraft(),
    voidingPaymentId: null,
    paymentVoidReason: "",
    paymentListenerInvoiceId: null,
    searchTerm: "",
    lineItemSearchTerm: "",
    unsubscribeInvoices: null,
    unsubscribePayments: null,
    filteredInvoiceCount: 0
};

function createDefaultPaymentDraft(invoice = null, options = {}) {
    const { prefillAmount = true } = options;
    const balanceDue = Number(invoice?.balanceDue ?? invoice?.invoiceTotal) || 0;

    return {
        paymentDate: toDateInputValue(new Date()),
        amountPaid: prefillAmount && balanceDue > 0 ? balanceDue.toFixed(2) : "",
        paymentMode: "",
        transactionRef: "",
        notes: ""
    };
}

function normalizeText(value) {
    return (value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
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

function getStatusMarkup(value, fallback = "Unpaid") {
    const status = normalizeText(value) || fallback;
    const normalized = status.toLowerCase().replace(/\s+/g, "-");

    return `<span class="purchase-status-pill purchase-status-${normalized}">${status}</span>`;
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

function getPaymentInvoice() {
    if (!featureState.paymentInvoiceId) return null;
    return featureState.invoices.find(invoice => invoice.id === featureState.paymentInvoiceId) || null;
}

function getVoidingPayment() {
    if (!featureState.voidingPaymentId) return null;
    return featureState.payments.find(payment => payment.id === featureState.voidingPaymentId) || null;
}

function resetPaymentDraft(invoice = getPaymentInvoice(), options = {}) {
    featureState.paymentDraft = createDefaultPaymentDraft(invoice, options);
}

function resetPaymentVoidState() {
    featureState.voidingPaymentId = null;
    featureState.paymentVoidReason = "";
}

function detachPaymentListener(options = {}) {
    const { clearPayments = true } = options;

    featureState.unsubscribePayments?.();
    featureState.unsubscribePayments = null;
    featureState.paymentListenerInvoiceId = null;

    if (clearPayments) {
        featureState.payments = [];
    }
}

function renderSupplierOptions(suppliers, currentValue) {
    return suppliers
        .filter(supplier => supplier.isActive || supplier.id === currentValue)
        .map(supplier => `
        <option value="${supplier.id}" ${supplier.id === currentValue ? "selected" : ""}>
            ${supplier.supplierName}
        </option>
    `).join("");
}

function renderPaymentModeOptions(paymentModes, currentValue) {
    return paymentModes
        .filter(mode => mode.isActive || normalizeText(mode.paymentMode) === currentValue)
        .map(mode => {
        const value = normalizeText(mode.paymentMode);
        return `
            <option value="${value}" ${value === currentValue ? "selected" : ""}>
                ${value}
            </option>
        `;
    }).join("");
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

function getPaymentDraftFromDom() {
    return {
        paymentDate: document.getElementById("purchase-payment-date")?.value || featureState.paymentDraft.paymentDate,
        amountPaid: document.getElementById("purchase-payment-amount")?.value || featureState.paymentDraft.amountPaid,
        paymentMode: document.getElementById("purchase-payment-mode")?.value || featureState.paymentDraft.paymentMode,
        transactionRef: document.getElementById("purchase-payment-reference")?.value || featureState.paymentDraft.transactionRef,
        notes: document.getElementById("purchase-payment-notes")?.value || featureState.paymentDraft.notes
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

function syncPurchasePaymentHistoryGrid() {
    const paymentInvoice = getPaymentInvoice();
    const gridElement = document.getElementById("purchase-payment-history-grid");

    if (!paymentInvoice || !gridElement) return;

    initializePurchasePaymentHistoryGrid(gridElement);
    refreshPurchasePaymentHistoryGrid(featureState.payments);
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

function updatePaymentDraftPreview() {
    const invoice = getPaymentInvoice();
    if (!invoice) return;

    const balanceDue = roundCurrency(invoice.balanceDue ?? invoice.invoiceTotal);
    const draftAmount = roundCurrency(normalizeNumber(document.getElementById("purchase-payment-amount")?.value));
    const remainingBalance = roundCurrency(Math.max(balanceDue - draftAmount, 0));
    const remainingBalanceNode = document.getElementById("purchase-payment-balance-after-draft");

    if (remainingBalanceNode) {
        remainingBalanceNode.textContent = formatCurrency(remainingBalance);
    }
}

function renderVoidPaymentPanel() {
    const payment = getVoidingPayment();
    if (!payment) return "";

    return `
        <div class="purchase-payment-void-panel">
            <div class="purchase-payment-void-header">
                <div>
                    <p class="section-kicker">Void Payment</p>
                    <p class="panel-copy">Void the selected payment and create a reversing entry while keeping a full audit trail.</p>
                </div>
                <div class="toolbar-meta">
                    ${getStatusMarkup(payment.paymentStatus || payment.status || "Verified", "Verified")}
                </div>
            </div>

            <div class="purchase-payment-void-summary">
                <article class="summary-card">
                    <p class="summary-label">Amount</p>
                    <p class="summary-value">${formatCurrency(payment.amountPaid || 0)}</p>
                </article>
                <article class="summary-card">
                    <p class="summary-label">Mode</p>
                    <p class="summary-value payment-summary-copy">${payment.paymentMode || "-"}</p>
                </article>
                <article class="summary-card">
                    <p class="summary-label">Reference</p>
                    <p class="summary-value payment-summary-copy">${payment.transactionRef || "-"}</p>
                </article>
                <article class="summary-card">
                    <p class="summary-label">Recorded By</p>
                    <p class="summary-value payment-summary-copy">${payment.recordedBy || payment.audit?.createdBy || "-"}</p>
                </article>
            </div>

            <form id="purchase-payment-void-form" class="purchase-payment-void-form">
                <div class="field field-full">
                    <label for="purchase-payment-void-reason">Void Reason</label>
                    <textarea id="purchase-payment-void-reason" class="textarea" placeholder="Explain why this payment is being voided" required>${featureState.paymentVoidReason}</textarea>
                </div>
                <p class="panel-copy panel-copy-tight">This action will mark the payment as voided, add a reversal entry, and reopen the invoice balance if needed.</p>
                <div class="form-actions">
                    <button id="purchase-payment-void-cancel-button" class="button button-secondary" type="button">
                        <span class="button-icon">${icons.inactive}</span>
                        Cancel
                    </button>
                    <button class="button grid-action-button grid-action-button-danger" type="submit">
                        Void Payment
                    </button>
                </div>
            </form>
        </div>
    `;
}

function renderPaymentModal(snapshot) {
    const paymentInvoice = getPaymentInvoice();
    if (!paymentInvoice) return "";

    const paymentModes = (snapshot.masterData.paymentModes || []).filter(mode => mode.isActive);
    const balanceDue = roundCurrency(paymentInvoice.balanceDue ?? paymentInvoice.invoiceTotal);
    const amountPaid = roundCurrency(paymentInvoice.amountPaid);
    const invoiceTotal = roundCurrency(paymentInvoice.invoiceTotal);
    const draftAmount = roundCurrency(normalizeNumber(featureState.paymentDraft.amountPaid));
    const remainingBalance = roundCurrency(Math.max(balanceDue - draftAmount, 0));
    const canRecordPayment = balanceDue > 0 && paymentModes.length > 0;

    return `
        <div id="purchase-payment-modal" class="purchase-payment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="purchase-payment-modal-title">
            <div class="purchase-payment-modal-card">
                <button id="purchase-payments-close-button" class="purchase-payment-modal-corner-close" type="button" aria-label="Close payment modal">
                    <span class="button-icon">${icons.close}</span>
                </button>
                <div class="panel-header panel-header-accent purchase-payment-modal-header">
                    <div class="purchase-payment-modal-title-row">
                        <div class="panel-title-wrap">
                            <span class="panel-icon panel-icon-alt">${icons.payment}</span>
                            <div>
                                <h3 id="purchase-payment-modal-title">Record Supplier Payment</h3>
                                <p class="panel-copy">Use a focused payment modal for the transaction, with live invoice context and AG Grid history below the entry form.</p>
                            </div>
                        </div>
                    </div>
                    <div class="toolbar-meta purchase-payment-modal-meta">
                        <span class="status-pill">${paymentInvoice.invoiceId || "Draft"}</span>
                        <span class="status-pill">${featureState.payments.length} payments</span>
                    </div>
                </div>
                <div class="panel-body purchase-payment-modal-body">
                    <div class="purchase-payments-layout">
                        <div class="payment-workspace-card">
                            <div class="purchase-payment-meta-grid">
                                <article class="summary-card">
                                    <p class="summary-label">Supplier</p>
                                    <p class="summary-value payment-summary-copy">${paymentInvoice.supplierName || "-"}</p>
                                </article>
                                <article class="summary-card">
                                    <p class="summary-label">Invoice Total</p>
                                    <p class="summary-value">${formatCurrency(invoiceTotal)}</p>
                                </article>
                                <article class="summary-card">
                                    <p class="summary-label">Paid So Far</p>
                                    <p class="summary-value">${formatCurrency(amountPaid)}</p>
                                </article>
                                <article class="summary-card">
                                    <p class="summary-label">Outstanding Balance</p>
                                    <p class="summary-value">${formatCurrency(balanceDue)}</p>
                                </article>
                            </div>

                            <form id="purchase-payment-form" class="purchase-payment-form">
                                <div class="form-grid">
                                    <div class="field">
                                        <label for="purchase-payment-date">Payment Date</label>
                                        <input id="purchase-payment-date" class="input" type="date" value="${featureState.paymentDraft.paymentDate}" required>
                                    </div>
                                    <div class="field">
                                        <label for="purchase-payment-amount">Amount Paid</label>
                                        <input id="purchase-payment-amount" class="input" type="number" min="0" step="0.01" value="${featureState.paymentDraft.amountPaid}" placeholder="0.00" ${balanceDue <= 0 ? "disabled" : ""} required>
                                    </div>
                                    <div class="field">
                                        <label for="purchase-payment-mode">Payment Mode</label>
                                        <select id="purchase-payment-mode" class="select" ${canRecordPayment ? "" : "disabled"} required>
                                            <option value="">Select mode</option>
                                            ${renderPaymentModeOptions(paymentModes, featureState.paymentDraft.paymentMode)}
                                        </select>
                                    </div>
                                    <div class="field field-wide">
                                        <label for="purchase-payment-reference">Reference</label>
                                        <input id="purchase-payment-reference" class="input" type="text" value="${featureState.paymentDraft.transactionRef}" placeholder="Cheque number, transfer ref, or receipt ID">
                                    </div>
                                    <div class="field field-full">
                                        <label for="purchase-payment-notes">Notes</label>
                                        <textarea id="purchase-payment-notes" class="textarea" placeholder="Optional internal note about this payment">${featureState.paymentDraft.notes}</textarea>
                                    </div>
                                </div>

                                <div class="purchase-payment-preview">
                                    <div>
                                        <p class="summary-label">Status</p>
                                        <div class="purchase-payment-inline-pill">${getStatusMarkup(paymentInvoice.paymentStatus)}</div>
                                    </div>
                                    <div>
                                        <p class="summary-label">Balance After Draft</p>
                                        <p id="purchase-payment-balance-after-draft" class="summary-value">${formatCurrency(remainingBalance)}</p>
                                    </div>
                                </div>

                                ${balanceDue <= 0 ? `
                                    <p class="panel-copy panel-copy-tight">This invoice is already fully paid. You can still review the payment history below.</p>
                                ` : ""}
                                ${balanceDue > 0 && paymentModes.length === 0 ? `
                                    <p class="panel-copy panel-copy-tight">Add at least one active payment mode before recording supplier payments.</p>
                                ` : ""}

                                <div class="form-actions">
                                    <button class="button button-primary" type="submit" ${canRecordPayment ? "" : "disabled"}>
                                        <span class="button-icon">${icons.payment}</span>
                                        Record Payment
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div class="payment-workspace-card">
                            <div class="purchase-payments-history-header">
                                <div>
                                    <p class="section-kicker">Payment History</p>
                                    <p class="panel-copy">Every recorded supplier payment for ${paymentInvoice.invoiceName || paymentInvoice.invoiceId || "this invoice"}.</p>
                                </div>
                            </div>
                            <div class="ag-shell purchase-payment-history-shell">
                                <div id="purchase-payment-history-grid" class="ag-theme-alpine moneta-grid" style="height: 420px; width: 100%;"></div>
                            </div>
                            ${renderVoidPaymentPanel()}
                        </div>
                    </div>
                </div>
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
    const activeSuppliers = suppliers.filter(supplier => supplier.isActive || supplier.id === editingInvoice?.supplierId);
    const products = snapshot.masterData.products || [];
    const draftSummary = calculatePurchaseDraftSummary({
        lineItems: editingInvoice?.lineItems || [],
        invoiceDiscountType: invoiceDiscountFields.discountType,
        invoiceDiscountValue: invoiceDiscountFields.discountType === "Percentage"
            ? invoiceDiscountFields.discountPercentageValue
            : invoiceDiscountFields.discountFixedValue,
        invoiceTaxPercentage: editingInvoice?.invoiceTaxPercentage || 0
    }, products);
    const canSaveInvoice = activeSuppliers.length > 0 && products.length > 0;
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

            ${renderPaymentModal(snapshot)}
        </div>
    `;
}

async function handlePurchaseFormSubmit(event) {
    event.preventDefault();

    const adjustments = getInvoiceAdjustmentDraftFromDom();

    try {
        const docId = document.getElementById("purchase-invoice-doc-id")?.value;
        const supplierName = document.getElementById("purchase-supplier")?.selectedOptions?.[0]?.textContent || "-";
        const invoiceName = document.getElementById("purchase-invoice-name")?.value || "-";
        const activeItemCount = getActiveLineItemsFromGrid().length;
        const result = await runProgressToastFlow({
            title: docId ? "Updating Purchase Invoice" : "Creating Purchase Invoice",
            initialMessage: "Reading supplier, invoice, and worksheet data...",
            initialProgress: 14,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Purchase Invoice Updated" : "Purchase Invoice Created",
            successMessage: docId
                ? "The invoice and inventory reconciliation were completed successfully."
                : "The invoice was saved and inventory was updated successfully."
        }, async ({ update }) => {
            update("Validating invoice totals and active line items...", 32, "Step 2 of 5");

            update("Writing invoice and inventory changes to the database...", 72, "Step 3 of 5");

            const result = await savePurchaseInvoice({
                docId,
                purchaseDate: document.getElementById("purchase-date")?.value,
                supplierId: document.getElementById("purchase-supplier")?.value,
                supplierInvoiceNo: document.getElementById("supplier-invoice-no")?.value,
                invoiceName: document.getElementById("purchase-invoice-name")?.value,
                invoiceDiscountType: adjustments.discountType,
                invoiceDiscountValue: adjustments.invoiceDiscountValue,
                invoiceTaxPercentage: adjustments.invoiceTaxPercentage,
                lineItems: getActiveLineItemsFromGrid()
            }, getState().masterData, getState().currentUser);

            update("Refreshing invoice history and balances...", 88, "Step 4 of 5");
            featureState.editingInvoiceId = null;
            renderPurchasesView();
            update("Purchase workspace is now in sync.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create"
            ? "Purchase invoice saved and inventory updated."
            : "Purchase invoice updated and inventory reconciled.", "success", {
            title: "Stock Purchase"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Purchase Invoice Saved" : "Purchase Invoice Updated",
            message: "The supplier invoice has been processed successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Supplier", value: supplierName },
                { label: "Invoice Name", value: invoiceName },
                { label: "Active Items", value: String(activeItemCount) }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Purchase invoice save failed:", error);
    }
}

async function handlePurchasePaymentSubmit(event) {
    event.preventDefault();

    const invoice = getPaymentInvoice();
    if (!invoice) {
        showToast("Choose an invoice before recording payment.", "error");
        return;
    }

    try {
        const paymentData = await runProgressToastFlow({
            title: "Recording Supplier Payment",
            initialMessage: "Reading invoice and payment draft details...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: "Supplier Payment Recorded",
            successMessage: `${formatCurrency(Number(getPaymentDraftFromDom().amountPaid) || 0)} was recorded successfully.`
        }, async ({ update }) => {
            const draft = getPaymentDraftFromDom();
            update("Validating payment amount, mode, and outstanding balance...", 36, "Step 2 of 5");

            update("Writing payment and invoice balance updates...", 72, "Step 3 of 5");

            const paymentData = await savePurchasePayment(
                draft,
                invoice,
                getState().masterData,
                getState().currentUser
            );

            update("Refreshing supplier payment history...", 88, "Step 4 of 5");
            resetPaymentDraft(invoice, { prefillAmount: false });
            renderPurchasesView();
            update("Payment ledger is now in sync.", 96, "Step 5 of 5");
            return paymentData;
        });

        showToast(
            `${formatCurrency(paymentData.amountPaid)} recorded for ${invoice.supplierName || "the selected supplier"}.`,
            "success",
            { title: "Stock Purchase" }
        );
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Supplier Payment Recorded",
            message: "The payment was applied to the supplier invoice successfully.",
            details: [
                { label: "Supplier", value: invoice.supplierName || "-" },
                { label: "Invoice", value: invoice.invoiceId || invoice.invoiceName || "-" },
                { label: "Amount", value: formatCurrency(paymentData.amountPaid) },
                { label: "Mode", value: paymentData.paymentMode || "-" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Purchase payment save failed:", error);
    }
}

async function handlePurchasePaymentVoidSubmit(event) {
    event.preventDefault();

    const payment = getVoidingPayment();
    if (!payment) {
        showToast("Choose a payment before trying to void it.", "error");
        return;
    }

    const confirmed = await showConfirmationModal({
        title: "Void Supplier Payment",
        message: `Void payment ${payment.paymentId || payment.id}?`,
        details: [
            { label: "Supplier", value: payment.supplierName || "-" },
            { label: "Amount", value: formatCurrency(payment.amountPaid) },
            { label: "Payment ID", value: payment.paymentId || payment.id || "-" }
        ],
        note: "This action cannot be undone. Moneta will mark the payment as voided, create a reversal entry, and reopen the invoice balance if required.",
        confirmText: "Void Payment",
        tone: "danger"
    });

    if (!confirmed) return;

    try {
        await runProgressToastFlow({
            title: "Voiding Supplier Payment",
            theme: "warning",
            initialMessage: "Reading the original payment and invoice state...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: "Supplier Payment Voided",
            successMessage: `Payment ${payment.paymentId || payment.id} was voided and reversed successfully.`
        }, async ({ update }) => {
            update("Validating the void reason and reversal eligibility...", 36, "Step 2 of 5");

            update("Writing reversal entries and invoice adjustments...", 72, "Step 3 of 5");

            await voidPurchasePayment(
                payment,
                document.getElementById("purchase-payment-void-reason")?.value || featureState.paymentVoidReason,
                getState().currentUser
            );

            update("Refreshing payment history and invoice balances...", 88, "Step 4 of 5");
            resetPaymentVoidState();
            renderPurchasesView();
            update("Reversal audit trail is now in place.", 96, "Step 5 of 5");
        });

        showToast(`Payment ${payment.paymentId || payment.id} was voided and reversed.`, "success", {
            title: "Stock Purchase"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Supplier Payment Voided",
            message: "The payment was voided and a reversal entry was created successfully.",
            details: [
                { label: "Supplier", value: payment.supplierName || "-" },
                { label: "Payment ID", value: payment.paymentId || payment.id || "-" },
                { label: "Amount Reversed", value: formatCurrency(payment.amountPaid) }
            ],
            note: "The related invoice balance has been recalculated and the audit trail has been preserved."
        });
    } catch (error) {
        console.error("[Moneta] Purchase payment void failed:", error);
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
    focusFormField({
        formId: "purchase-invoice-form",
        inputSelector: "#purchase-invoice-name"
    });
}

function handleOpenPaymentWorkspace(button) {
    const invoiceId = button.dataset.invoiceId || null;
    if (!invoiceId) return;

    const invoice = featureState.invoices.find(entry => entry.id === invoiceId);
    featureState.paymentInvoiceId = invoiceId;
    featureState.editingInvoiceId = null;
    resetPaymentDraft(invoice);
    resetPaymentVoidState();
    renderPurchasesView();
    document.getElementById("purchase-payment-amount")?.focus();
}

function handlePaymentWorkspaceClose() {
    featureState.paymentInvoiceId = null;
    resetPaymentDraft(null, { prefillAmount: false });
    resetPaymentVoidState();
    detachPaymentListener();
    renderPurchasesView();
}

function handleOpenVoidPayment(button) {
    featureState.voidingPaymentId = button.dataset.paymentId || null;
    featureState.paymentVoidReason = "";
    renderPurchasesView();
    document.getElementById("purchase-payment-void-reason")?.focus();
}

function updatePaymentDraftField(target) {
    if (!target?.id) return;

    const fieldById = {
        "purchase-payment-date": "paymentDate",
        "purchase-payment-amount": "amountPaid",
        "purchase-payment-mode": "paymentMode",
        "purchase-payment-reference": "transactionRef",
        "purchase-payment-notes": "notes"
    };

    const field = fieldById[target.id];
    if (!field) return;

    featureState.paymentDraft[field] = target.value;
}

function updatePaymentVoidField(target) {
    if (target?.id !== "purchase-payment-void-reason") return;
    featureState.paymentVoidReason = target.value;
}

function bindPurchasesDomEvents() {
    const root = document.getElementById("purchases-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("submit", event => {
        if (event.target.id === "purchase-invoice-form") {
            handlePurchaseFormSubmit(event);
            return;
        }

        if (event.target.id === "purchase-payment-form") {
            handlePurchasePaymentSubmit(event);
            return;
        }

        if (event.target.id === "purchase-payment-void-form") {
            handlePurchasePaymentVoidSubmit(event);
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
            return;
        }

        updatePaymentDraftField(target);
        updatePaymentDraftPreview();
        updatePaymentVoidField(target);
    });

    root.addEventListener("change", event => {
        const target = event.target;

        if (
            target.id === "purchase-supplier" ||
            target.id === "invoice-discount-type"
        ) {
            updatePurchaseDraftPreview();
            return;
        }

        updatePaymentDraftField(target);
        updatePaymentDraftPreview();
        updatePaymentVoidField(target);
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const editButton = target.closest(".purchase-edit-button");
        const paymentsButton = target.closest(".purchase-payments-button");
        const voidPaymentButton = target.closest(".purchase-payment-void-button");
        const cancelButton = target.closest("#purchase-cancel-button");
        const closePaymentsButton = target.closest("#purchase-payments-close-button");
        const cancelVoidButton = target.closest("#purchase-payment-void-cancel-button");
        const paymentModal = target.closest("#purchase-payment-modal");

        if (editButton) {
            handleEditInvoice(editButton);
            return;
        }

        if (paymentsButton) {
            handleOpenPaymentWorkspace(paymentsButton);
            return;
        }

        if (voidPaymentButton) {
            handleOpenVoidPayment(voidPaymentButton);
            return;
        }

        if (cancelButton) {
            featureState.editingInvoiceId = null;
            featureState.lineItemSearchTerm = "";
            renderPurchasesView();
            return;
        }

        if (closePaymentsButton) {
            handlePaymentWorkspaceClose();
            return;
        }

        if (cancelVoidButton) {
            resetPaymentVoidState();
            renderPurchasesView();
            return;
        }

        if (target.id === "purchase-payment-modal" && paymentModal) {
            handlePaymentWorkspaceClose();
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

                if (featureState.paymentInvoiceId && !invoices.some(invoice => invoice.id === featureState.paymentInvoiceId)) {
                    featureState.paymentInvoiceId = null;
                    resetPaymentDraft(null, { prefillAmount: false });
                    resetPaymentVoidState();
                    detachPaymentListener();
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
        featureState.paymentInvoiceId = null;
        resetPaymentDraft(null, { prefillAmount: false });
        resetPaymentVoidState();
        detachPaymentListener();
    }
}

function ensurePaymentListener(snapshot) {
    const hasUser = Boolean(snapshot.currentUser);
    const paymentInvoice = getPaymentInvoice();

    if (!hasUser || !paymentInvoice) {
        detachPaymentListener();
        return;
    }

    if (
        featureState.unsubscribePayments &&
        featureState.paymentListenerInvoiceId === paymentInvoice.id
    ) {
        return;
    }

    detachPaymentListener();

    featureState.paymentListenerInvoiceId = paymentInvoice.id;
    featureState.unsubscribePayments = subscribeToInvoicePayments(
        paymentInvoice.id,
        payments => {
            featureState.payments = payments;

            const voidingPayment = getVoidingPayment();
            if (featureState.voidingPaymentId && (!voidingPayment || (voidingPayment.paymentStatus || voidingPayment.status) === "Voided")) {
                resetPaymentVoidState();
            }

            if (getState().currentRoute === "#/purchases" && featureState.paymentInvoiceId === paymentInvoice.id) {
                renderPurchasesView();
            }
        },
        error => {
            console.error("[Moneta] Purchase payment listener failed:", error);
            showToast("Could not load supplier payment history.", "error");
        }
    );
}

export function renderPurchasesView() {
    const snapshot = getState();
    const root = document.getElementById("purchases-root");
    if (!root) return;

    ensurePaymentListener(snapshot);
    renderPurchasesViewShell(snapshot);
    bindPurchasesDomEvents();
    syncPurchaseLineItemsGrid(snapshot);
    syncPurchasesGrid();
    syncPurchasePaymentHistoryGrid();
    updatePurchaseDraftPreview();
    updatePaymentDraftPreview();
}

export function initializePurchasesFeature() {
    subscribe(snapshot => {
        ensureInvoiceListener(snapshot);
        ensurePaymentListener(snapshot);

        if (snapshot.currentRoute === "#/purchases") {
            renderPurchasesView();
        }
    });
}
