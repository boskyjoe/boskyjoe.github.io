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
    voidPurchaseInvoice,
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
    setPurchaseLineItemsGridReadOnly,
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
    voidingInvoiceId: null,
    invoiceVoidReason: "",
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

function buildDisabledActionAttrs(disabled, reason) {
    if (!disabled) return "";

    const safeReason = String(reason || "This action is not available right now.")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    return `disabled title="${safeReason}"`;
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

function isInvoiceVoidMode() {
    return Boolean(featureState.voidingInvoiceId);
}

function getWorkspaceInvoice() {
    return getVoidingInvoice() || getEditingInvoice();
}

function getPaymentInvoice() {
    if (!featureState.paymentInvoiceId) return null;
    return featureState.invoices.find(invoice => invoice.id === featureState.paymentInvoiceId) || null;
}

function getVoidingPayment() {
    if (!featureState.voidingPaymentId) return null;
    return featureState.payments.find(payment => payment.id === featureState.voidingPaymentId) || null;
}

function getVoidingInvoice() {
    if (!featureState.voidingInvoiceId) return null;
    return featureState.invoices.find(invoice => invoice.id === featureState.voidingInvoiceId) || null;
}

function resetPaymentDraft(invoice = getPaymentInvoice(), options = {}) {
    featureState.paymentDraft = createDefaultPaymentDraft(invoice, options);
}

function resetPaymentVoidState() {
    featureState.voidingPaymentId = null;
    featureState.paymentVoidReason = "";
}

function resetInvoiceVoidState() {
    featureState.voidingInvoiceId = null;
    featureState.invoiceVoidReason = "";
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
    if (isInvoiceVoidMode()) {
        document.getElementById("invoice-discount-type")?.setAttribute("disabled", "disabled");
        document.getElementById("invoice-discount-percentage")?.setAttribute("disabled", "disabled");
        document.getElementById("invoice-discount-fixed")?.setAttribute("disabled", "disabled");
        document.getElementById("invoice-tax-percentage")?.setAttribute("disabled", "disabled");
        return;
    }

    const discountType = normalizeStoredDiscountType(document.getElementById("invoice-discount-type")?.value);
    const percentageInput = document.getElementById("invoice-discount-percentage");
    const fixedInput = document.getElementById("invoice-discount-fixed");

    if (!percentageInput || !fixedInput) return;

    const isPercentage = discountType === "Percentage";
    percentageInput.disabled = !isPercentage;
    fixedInput.disabled = isPercentage;
}

function getPurchaseLineItemRows(snapshot) {
    const workspaceInvoice = getWorkspaceInvoice();
    const existingLineItems = new Map(
        (workspaceInvoice?.lineItems || []).map(item => [item.masterProductId, item])
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

    setPurchaseLineItemsGridReadOnly(isInvoiceVoidMode());
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
        activeCountNode.textContent = `${lineItems.length} active products`;
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
    const voidingPayment = getVoidingPayment();
    const isPaymentVoidMode = Boolean(voidingPayment);
    const draftAmount = roundCurrency(normalizeNumber(document.getElementById("purchase-payment-amount")?.value));
    const voidingAmount = roundCurrency(normalizeNumber(voidingPayment?.amountPaid));
    const remainingBalance = isPaymentVoidMode
        ? roundCurrency(Math.max(balanceDue + voidingAmount, 0))
        : roundCurrency(Math.max(balanceDue - draftAmount, 0));
    const remainingBalanceNode = document.getElementById("purchase-payment-balance-after-draft");

    if (remainingBalanceNode) {
        remainingBalanceNode.textContent = formatCurrency(remainingBalance);
    }
}

function renderPaymentModal(snapshot) {
    const paymentInvoice = getPaymentInvoice();
    if (!paymentInvoice) return "";

    const paymentModes = (snapshot.masterData.paymentModes || []).filter(mode => mode.isActive);
    const balanceDue = roundCurrency(paymentInvoice.balanceDue ?? paymentInvoice.invoiceTotal);
    const amountPaid = roundCurrency(paymentInvoice.amountPaid);
    const invoiceTotal = roundCurrency(paymentInvoice.invoiceTotal);
    const voidingPayment = getVoidingPayment();
    const isPaymentVoidMode = Boolean(voidingPayment);
    const voidingPaymentAmount = roundCurrency(normalizeNumber(voidingPayment?.amountPaid));
    const draftAmount = roundCurrency(normalizeNumber(featureState.paymentDraft.amountPaid));
    const remainingBalance = roundCurrency(Math.max(balanceDue - draftAmount, 0));
    const balanceAfterVoid = roundCurrency(Math.max(balanceDue + voidingPaymentAmount, 0));
    const canRecordPayment = balanceDue > 0 && paymentModes.length > 0;
    const recordPaymentDisabledReason = balanceDue <= 0
        ? "This invoice is already fully paid."
        : paymentModes.length === 0
            ? "Add at least one active payment mode before recording payment."
            : "This action is not available right now.";
    const recordPaymentDisabledAttrs = buildDisabledActionAttrs(!canRecordPayment, recordPaymentDisabledReason);
    const paymentFieldDisabledAttrs = isPaymentVoidMode
        ? 'disabled aria-disabled="true"'
        : "";
    const amountFieldDisabledAttrs = (isPaymentVoidMode || balanceDue <= 0)
        ? 'disabled aria-disabled="true"'
        : "";
    const modeFieldDisabledAttrs = (isPaymentVoidMode || !canRecordPayment)
        ? 'disabled aria-disabled="true"'
        : "";
    const paymentDateValue = isPaymentVoidMode
        ? toDateInputValue(voidingPayment?.paymentDate || voidingPayment?.createdAt || "")
        : featureState.paymentDraft.paymentDate;
    const paymentAmountValue = isPaymentVoidMode
        ? String(voidingPaymentAmount || "")
        : featureState.paymentDraft.amountPaid;
    const paymentModeValue = isPaymentVoidMode
        ? (voidingPayment?.paymentMode || "")
        : featureState.paymentDraft.paymentMode;
    const paymentReferenceValue = isPaymentVoidMode
        ? (voidingPayment?.transactionRef || "")
        : featureState.paymentDraft.transactionRef;
    const paymentNotesValue = isPaymentVoidMode
        ? (voidingPayment?.notes || "")
        : featureState.paymentDraft.notes;
    const headerClassName = isPaymentVoidMode
        ? "panel-header panel-header-danger-soft purchase-payment-modal-header purchase-payment-modal-void-header"
        : "panel-header panel-header-accent purchase-payment-modal-header";
    const headerIconClassName = isPaymentVoidMode
        ? "panel-icon panel-icon-danger-soft"
        : "panel-icon panel-icon-alt";
    const modalTitle = isPaymentVoidMode
        ? "Void Supplier Payment"
        : "Record Supplier Payment";
    const modalCopy = isPaymentVoidMode
        ? "Review the selected posted payment, provide a void reason, and confirm to post the reversal."
        : "Use a focused payment modal for the transaction, with live invoice context and AG Grid history below the entry form.";
    const balancePreviewValue = isPaymentVoidMode ? balanceAfterVoid : remainingBalance;

    return `
        <div id="purchase-payment-modal" class="purchase-payment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="purchase-payment-modal-title">
            <div class="purchase-payment-modal-card">
                <button id="purchase-payments-close-button" class="purchase-payment-modal-corner-close" type="button" aria-label="Close payment modal">
                    <span class="button-icon">${icons.close}</span>
                </button>
                <div class="${headerClassName}">
                    <div class="purchase-payment-modal-title-row">
                        <div class="panel-title-wrap">
                            <span class="${headerIconClassName}">${icons.payment}</span>
                            <div>
                                <h3 id="purchase-payment-modal-title">${modalTitle}</h3>
                                <p class="panel-copy">${modalCopy}</p>
                            </div>
                        </div>
                    </div>
                    <div class="toolbar-meta purchase-payment-modal-meta">
                        <span class="status-pill">${paymentInvoice.invoiceId || "Draft"}</span>
                        <span class="status-pill">${featureState.payments.length} payments</span>
                        ${isPaymentVoidMode ? `
                            <span class="status-pill purchase-payment-void-mode-pill">Void Mode</span>
                        ` : ""}
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
                                ${isPaymentVoidMode ? `
                                    <p class="panel-copy panel-copy-tight purchase-payment-void-inline-note">
                                        Voiding payment <strong>${voidingPayment?.paymentId || voidingPayment?.id || "-"}</strong>.
                                        Amount ${formatCurrency(voidingPaymentAmount)}, mode ${voidingPayment?.paymentMode || "-"}, recorded by ${voidingPayment?.recordedBy || voidingPayment?.audit?.createdBy || "-"}.
                                    </p>
                                ` : ""}
                                <div class="form-grid">
                                    <div class="field">
                                        <label for="purchase-payment-date">Payment Date <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="purchase-payment-date" class="input" type="date" value="${paymentDateValue}" ${paymentFieldDisabledAttrs} required>
                                    </div>
                                    <div class="field">
                                        <label for="purchase-payment-amount">Amount Paid <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="purchase-payment-amount" class="input" type="number" min="0" step="0.01" value="${paymentAmountValue}" placeholder="0.00" ${amountFieldDisabledAttrs} required>
                                    </div>
                                    <div class="field">
                                        <label for="purchase-payment-mode">Payment Mode <span class="required-mark" aria-hidden="true">*</span></label>
                                        <select id="purchase-payment-mode" class="select" ${modeFieldDisabledAttrs} required>
                                            <option value="">Select mode</option>
                                            ${renderPaymentModeOptions(paymentModes, paymentModeValue)}
                                        </select>
                                    </div>
                                    <div class="field field-wide">
                                        <label for="purchase-payment-reference">Reference</label>
                                        <input id="purchase-payment-reference" class="input" type="text" value="${paymentReferenceValue}" placeholder="Cheque number, transfer ref, or receipt ID" ${paymentFieldDisabledAttrs}>
                                    </div>
                                    <div class="field field-full">
                                        <label for="purchase-payment-notes">Notes</label>
                                        <textarea id="purchase-payment-notes" class="textarea" placeholder="Optional internal note about this payment" ${paymentFieldDisabledAttrs}>${paymentNotesValue}</textarea>
                                    </div>
                                    ${isPaymentVoidMode ? `
                                        <div class="field field-full">
                                            <label for="purchase-payment-void-reason">Void Reason <span class="required-mark" aria-hidden="true">*</span></label>
                                            <textarea id="purchase-payment-void-reason" class="textarea" placeholder="Explain why this payment is being voided" required>${featureState.paymentVoidReason}</textarea>
                                        </div>
                                    ` : ""}
                                </div>

                                <div class="purchase-payment-preview">
                                    <div>
                                        <p class="summary-label">Status</p>
                                        <div class="purchase-payment-inline-pill">${getStatusMarkup(isPaymentVoidMode ? (voidingPayment?.paymentStatus || voidingPayment?.status || "Verified") : paymentInvoice.paymentStatus)}</div>
                                    </div>
                                    <div>
                                        <p class="summary-label">${isPaymentVoidMode ? "Balance After Void" : "Balance After Draft"}</p>
                                        <p id="purchase-payment-balance-after-draft" class="summary-value">${formatCurrency(balancePreviewValue)}</p>
                                    </div>
                                </div>

                                ${!isPaymentVoidMode && balanceDue <= 0 ? `
                                    <p class="panel-copy panel-copy-tight">This invoice is already fully paid. You can still review the payment history below.</p>
                                ` : ""}
                                ${!isPaymentVoidMode && balanceDue > 0 && paymentModes.length === 0 ? `
                                    <p class="panel-copy panel-copy-tight">Add at least one active payment mode before recording supplier payments.</p>
                                ` : ""}

                                <div class="form-actions">
                                    ${isPaymentVoidMode ? `
                                        <button id="purchase-payment-void-cancel-button" class="button button-secondary" type="button">
                                            <span class="button-icon">${icons.inactive}</span>
                                            Cancel Void
                                        </button>
                                        <button id="purchase-payment-void-confirm-button" class="button button-danger-soft" type="button">
                                            <span class="button-icon">${icons.warning}</span>
                                            Confirm Void Payment
                                        </button>
                                    ` : `
                                        <button class="button button-primary" type="submit" ${recordPaymentDisabledAttrs}>
                                            <span class="button-icon">${icons.payment}</span>
                                            Record Payment
                                        </button>
                                    `}
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
    const workspaceInvoice = getWorkspaceInvoice();
    const isVoidMode = isInvoiceVoidMode();
    const invoiceDiscountFields = getInvoiceDiscountFieldValues(workspaceInvoice);
    const suppliers = snapshot.masterData.suppliers || [];
    const activeSuppliers = suppliers.filter(supplier => supplier.isActive || supplier.id === workspaceInvoice?.supplierId);
    const products = snapshot.masterData.products || [];
    const draftSummary = calculatePurchaseDraftSummary({
        lineItems: workspaceInvoice?.lineItems || [],
        invoiceDiscountType: invoiceDiscountFields.discountType,
        invoiceDiscountValue: invoiceDiscountFields.discountType === "Percentage"
            ? invoiceDiscountFields.discountPercentageValue
            : invoiceDiscountFields.discountFixedValue,
        invoiceTaxPercentage: workspaceInvoice?.invoiceTaxPercentage || 0
    }, products);
    const canSaveInvoice = activeSuppliers.length > 0 && products.length > 0;
    const saveInvoiceDisabledAttrs = buildDisabledActionAttrs(
        !canSaveInvoice,
        "Add at least one active supplier and one active product before saving an invoice."
    );
    const initialActiveCount = workspaceInvoice?.lineItems?.length || 0;
    const panelClassName = isVoidMode ? "panel-card purchase-void-mode-card" : "panel-card";
    const panelHeaderClassName = isVoidMode ? "panel-header panel-header-danger-soft" : "panel-header panel-header-accent";
    const formModeTitle = isVoidMode
        ? "Void Purchase Invoice"
        : editingInvoice
            ? "Edit Purchase Invoice"
            : "Purchase Invoices";
    const formModeCopy = isVoidMode
        ? "Review the full invoice below before voiding it. All invoice details are locked, and only the void reason can be entered."
        : "Use this module to capture supplier purchase invoices, update inventory, and track invoice payment progress in one place.";
    const disableInvoiceFields = isVoidMode ? "disabled" : "";
    const disableSearch = isVoidMode ? "disabled" : "";
    const voidPreview = isVoidMode ? `
        <div class="purchase-void-mode-banner">
            <div>
                <p class="section-kicker">Void Mode</p>
                <p class="panel-copy">This action will void the invoice, reverse any active linked payments, and roll the product quantities back out of inventory.</p>
            </div>
            <div class="toolbar-meta">
                <span class="status-pill">${workspaceInvoice?.invoiceId || workspaceInvoice?.invoiceName || "-"}</span>
                <span class="status-pill">${formatCurrency(workspaceInvoice?.invoiceTotal || 0)} total</span>
                <span class="status-pill">${formatCurrency(workspaceInvoice?.amountPaid || 0)} paid</span>
            </div>
        </div>
    ` : "";
    const voidReasonSection = isVoidMode ? `
        <div class="purchase-void-mode-reason">
            <div class="field field-full">
                <label for="purchase-invoice-void-reason">Void Reason <span class="required-mark" aria-hidden="true">*</span></label>
                <textarea id="purchase-invoice-void-reason" class="textarea purchase-void-reason-textarea" placeholder="Explain why this invoice is being voided" required>${featureState.invoiceVoidReason}</textarea>
            </div>
            <p class="panel-copy panel-copy-tight">This action cannot be undone. Moneta will keep the invoice in history as voided and preserve the full reversal trail.</p>
        </div>
    ` : "";

    root.innerHTML = `
        <div class="section-stack">
            <div class="${panelClassName}">
                <div class="${panelHeaderClassName}">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.purchases}</span>
                        <div>
                            <h2>${formModeTitle}</h2>
                            <p class="panel-copy">${formModeCopy}</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span class="status-pill">${featureState.invoices.length} invoices</span>
                        <span class="status-pill">${products.length} active products</span>
                    </div>
                </div>
                <div class="panel-body">
                    ${voidPreview}
                    <form id="purchase-invoice-form">
                        <input type="hidden" id="purchase-invoice-doc-id" value="${editingInvoice?.id || ""}">
                        <div class="form-grid">
                            <div class="field">
                                <label for="purchase-date">Purchase Date <span class="required-mark" aria-hidden="true">*</span></label>
                                <input id="purchase-date" class="input" type="date" value="${toDateInputValue(workspaceInvoice?.purchaseDate) || toDateInputValue(new Date())}" ${disableInvoiceFields} required>
                            </div>
                            <div class="field">
                                <label for="purchase-supplier">Supplier <span class="required-mark" aria-hidden="true">*</span></label>
                                <select id="purchase-supplier" class="select" ${disableInvoiceFields} required>
                                    <option value="">Select supplier</option>
                                    ${renderSupplierOptions(suppliers, workspaceInvoice?.supplierId)}
                                </select>
                            </div>
                            <div class="field">
                                <label for="supplier-invoice-no">Supplier Invoice Ref</label>
                                <input id="supplier-invoice-no" class="input" type="text" value="${workspaceInvoice?.supplierInvoiceNo || ""}" placeholder="Optional supplier invoice number" ${disableInvoiceFields}>
                            </div>
                            <div class="field field-wide">
                                <label for="purchase-invoice-name">Invoice Name <span class="required-mark" aria-hidden="true">*</span></label>
                                <input id="purchase-invoice-name" class="input" type="text" value="${workspaceInvoice?.invoiceName || ""}" placeholder="Stock Purchase - Apr 2026" ${disableInvoiceFields} required>
                            </div>
                        </div>

                        <div class="panel-card purchase-line-items-panel ${isVoidMode ? "purchase-void-mode-block" : ""}">
                            <div class="panel-header">
                                <div class="panel-title-wrap">
                                    <span class="panel-icon">${icons.catalogue}</span>
                                    <div>
                                        <h3>Product List</h3>
                                        <p class="panel-copy">${isVoidMode
                                            ? "Review the locked product list exactly as it was posted on this invoice."
                                            : "Search the full active product list and set Qty above 0 to make a product part of the invoice."}</p>
                                    </div>
                                </div>
                                <div class="toolbar-meta">
                                    <span id="purchase-line-items-active-count" class="status-pill">${initialActiveCount} active products</span>
                                    <div class="search-wrap">
                                        <span class="search-icon">${icons.search}</span>
                                        <input id="purchase-line-items-search" class="input toolbar-search" type="search" placeholder="Search products, ids, or stock" value="${featureState.lineItemSearchTerm}" ${disableSearch}>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-body">
                                <div class="ag-shell">
                                    <div id="purchase-line-items-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                                </div>
                            </div>
                        </div>

                        <div class="purchase-adjustments ${isVoidMode ? "purchase-void-mode-block" : ""}">
                            <div class="purchase-adjustments-header">
                                <div>
                                    <p class="section-kicker" style="margin-bottom: 0.25rem;">Invoice Adjustments</p>
                                    <p class="panel-copy">Invoice-level discount and tax are applied after the product level items are calculated.</p>
                                </div>
                            </div>
                            <div class="purchase-adjustments-grid">
                                <div class="field">
                                    <label for="invoice-discount-type">Invoice Discount Type</label>
                                    <select id="invoice-discount-type" class="select" ${disableInvoiceFields}>
                                        <option value="Percentage" ${invoiceDiscountFields.discountType === "Percentage" ? "selected" : ""}>Percentage</option>
                                        <option value="Fixed" ${invoiceDiscountFields.discountType === "Fixed" ? "selected" : ""}>Fixed</option>
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="invoice-discount-percentage">Invoice Discount %</label>
                                    <input id="invoice-discount-percentage" class="input" type="number" min="0" step="0.01" value="${invoiceDiscountFields.discountPercentageValue}" ${disableInvoiceFields}>
                                </div>
                                <div class="field">
                                    <label for="invoice-discount-fixed">Invoice Discount Amount</label>
                                    <input id="invoice-discount-fixed" class="input" type="number" min="0" step="0.01" value="${invoiceDiscountFields.discountFixedValue}" ${disableInvoiceFields}>
                                </div>
                                <div class="field">
                                    <label for="invoice-tax-percentage">Invoice Tax %</label>
                                    <input id="invoice-tax-percentage" class="input" type="number" min="0" step="0.01" value="${workspaceInvoice?.invoiceTaxPercentage || ""}" ${disableInvoiceFields}>
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

                        ${isVoidMode ? voidReasonSection : ""}
                        ${canSaveInvoice || isVoidMode ? "" : `
                            <p class="panel-copy" style="margin-top: 1rem;">
                                You need at least one active supplier and one active product before creating purchase invoices.
                            </p>
                        `}

                        <div class="form-actions">
                            ${editingInvoice || isVoidMode ? `
                                <button id="purchase-cancel-button" class="button button-secondary" type="button">
                                    <span class="button-icon">${icons.inactive}</span>
                                    Cancel
                                </button>
                            ` : ""}
                            ${isVoidMode ? `
                                <button id="purchase-invoice-void-button" class="button grid-action-button grid-action-button-danger" type="button">
                                    <span class="button-icon">${icons.inactive}</span>
                                    Void Invoice
                                </button>
                            ` : `
                                <button class="button button-primary-alt" type="submit" ${saveInvoiceDisabledAttrs}>
                                    <span class="button-icon">${editingInvoice ? icons.edit : icons.plus}</span>
                                    ${editingInvoice ? "Update Invoice" : "Save Invoice"}
                                </button>
                            `}
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

    if (isInvoiceVoidMode()) {
        showToast("Use the Void Invoice action to complete this reversal.", "error");
        return;
    }

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
        ProgressToast.hide(0);
        showToast(error.message || "Could not save the purchase invoice.", "error", {
            title: "Stock Purchase"
        });
    }
}

async function handlePurchasePaymentSubmit(event) {
    event.preventDefault();

    if (featureState.voidingPaymentId) {
        showToast("Void mode is active. Use Confirm Void Payment or Cancel Void.", "info");
        return;
    }

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
        ProgressToast.hide(0);
        showToast(error.message || "Could not record the supplier payment.", "error", {
            title: "Stock Purchase"
        });
    }
}

async function handlePurchasePaymentVoidSubmit(event) {
    event?.preventDefault?.();

    const payment = getVoidingPayment();
    if (!payment) {
        showToast("Choose a payment before trying to void it.", "error");
        return;
    }

    const reason = normalizeText(featureState.paymentVoidReason || document.getElementById("purchase-payment-void-reason")?.value);
    if (!reason) {
        showToast("A void reason is required.", "warning");
        document.getElementById("purchase-payment-void-reason")?.focus();
        return;
    }

    if (reason.length < 8) {
        showToast("Please enter a more descriptive void reason.", "warning");
        document.getElementById("purchase-payment-void-reason")?.focus();
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
                reason,
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
        ProgressToast.hide(0);
        showToast(error.message || "Could not void the supplier payment.", "error", {
            title: "Stock Purchase"
        });
    }
}

async function handlePurchaseInvoiceVoidSubmit(event) {
    event?.preventDefault?.();

    const invoice = getVoidingInvoice();
    if (!invoice) {
        showToast("Choose an invoice before trying to void it.", "error");
        return;
    }

    const confirmed = await showConfirmationModal({
        title: "Void Purchase Invoice",
        message: `Void invoice ${invoice.invoiceId || invoice.invoiceName || invoice.id}?`,
        details: [
            { label: "Supplier", value: invoice.supplierName || "-" },
            { label: "Invoice Total", value: formatCurrency(invoice.invoiceTotal || 0) },
            { label: "Paid So Far", value: formatCurrency(invoice.amountPaid || 0) }
        ],
        note: "This action cannot be undone. Moneta will void all active linked payments, reverse the stock quantities from inventory, and retain the invoice in history as voided.",
        confirmText: "Void Invoice",
        tone: "danger"
    });

    if (!confirmed) return;

    try {
        const result = await runProgressToastFlow({
            title: "Voiding Purchase Invoice",
            theme: "warning",
            initialMessage: "Reading the invoice, linked payments, and stock impact...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: "Purchase Invoice Voided",
            successMessage: `Invoice ${invoice.invoiceId || invoice.invoiceName || invoice.id} was voided successfully.`
        }, async ({ update }) => {
            update("Validating the void reason and reversal eligibility...", 36, "Step 2 of 5");

            update("Voiding linked payments and reversing inventory impact...", 72, "Step 3 of 5");

            const result = await voidPurchaseInvoice(
                invoice,
                document.getElementById("purchase-invoice-void-reason")?.value || featureState.invoiceVoidReason,
                getState().currentUser
            );

            update("Refreshing invoice history, balances, and product stock...", 88, "Step 4 of 5");
            resetInvoiceVoidState();

            if (featureState.paymentInvoiceId === invoice.id) {
                handlePaymentWorkspaceClose();
            } else {
                renderPurchasesView();
            }

            update("Invoice reversal audit trail is now in place.", 96, "Step 5 of 5");
            return result;
        });

        showToast(`Invoice ${invoice.invoiceId || invoice.invoiceName || invoice.id} was voided successfully.`, "success", {
            title: "Stock Purchase"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Purchase Invoice Voided",
            message: "The invoice was voided, linked payments were reversed, and stock quantities were rolled back successfully.",
            details: [
                { label: "Invoice", value: invoice.invoiceId || invoice.invoiceName || "-" },
                { label: "Supplier", value: invoice.supplierName || "-" },
                { label: "Payments Voided", value: String(result.voidedPaymentCount || 0) },
                { label: "Stock Quantity Reversed", value: String(result.reversedQuantity || 0) }
            ],
            note: `Total payment reversal: ${formatCurrency(result.voidedPaymentAmount || 0)}`
        });
    } catch (error) {
        console.error("[Moneta] Purchase invoice void failed:", error);
        ProgressToast.hide(0);
        showToast(error.message || "Could not void the purchase invoice.", "error", {
            title: "Stock Purchase"
        });
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
    const invoiceId = button.dataset.invoiceId || null;
    const invoice = featureState.invoices.find(entry => entry.id === invoiceId);

    if (!invoiceId || !invoice) return;

    if ((invoice.invoiceStatus || invoice.paymentStatus) === "Voided") {
        showToast("Voided purchase invoices cannot be edited.", "error");
        return;
    }

    featureState.editingInvoiceId = invoiceId;
    resetInvoiceVoidState();
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
    if (!invoice || (invoice.invoiceStatus || invoice.paymentStatus) === "Voided") {
        showToast("Voided purchase invoices cannot accept payments.", "error");
        return;
    }

    featureState.paymentInvoiceId = invoiceId;
    featureState.editingInvoiceId = null;
    resetPaymentDraft(invoice);
    resetPaymentVoidState();
    resetInvoiceVoidState();
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

function handleOpenVoidInvoice(button) {
    featureState.voidingInvoiceId = button.dataset.invoiceId || null;
    featureState.invoiceVoidReason = "";
    featureState.editingInvoiceId = null;
    featureState.lineItemSearchTerm = "";
    resetPaymentVoidState();
    renderPurchasesView();
    document.getElementById("purchase-invoice-void-reason")?.focus();
}

function handleOpenVoidPayment(button) {
    featureState.voidingPaymentId = button.dataset.paymentId || null;
    featureState.paymentVoidReason = "";
    resetInvoiceVoidState();
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

function updateInvoiceVoidField(target) {
    if (target?.id !== "purchase-invoice-void-reason") return;
    featureState.invoiceVoidReason = target.value;
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
        updateInvoiceVoidField(target);
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
        updateInvoiceVoidField(target);
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const editButton = target.closest(".purchase-edit-button");
        const paymentsButton = target.closest(".purchase-payments-button");
        const voidInvoiceButton = target.closest(".purchase-void-button");
        const voidPaymentButton = target.closest(".purchase-payment-void-button");
        const cancelButton = target.closest("#purchase-cancel-button");
        const confirmInvoiceVoidButton = target.closest("#purchase-invoice-void-button");
        const closePaymentsButton = target.closest("#purchase-payments-close-button");
        const cancelVoidButton = target.closest("#purchase-payment-void-cancel-button");
        const confirmVoidButton = target.closest("#purchase-payment-void-confirm-button");
        const paymentModal = target.closest("#purchase-payment-modal");

        if (editButton) {
            handleEditInvoice(editButton);
            return;
        }

        if (paymentsButton) {
            handleOpenPaymentWorkspace(paymentsButton);
            return;
        }

        if (voidInvoiceButton) {
            handleOpenVoidInvoice(voidInvoiceButton);
            return;
        }

        if (voidPaymentButton) {
            handleOpenVoidPayment(voidPaymentButton);
            return;
        }

        if (confirmInvoiceVoidButton) {
            handlePurchaseInvoiceVoidSubmit();
            return;
        }

        if (cancelButton) {
            featureState.editingInvoiceId = null;
            resetInvoiceVoidState();
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

        if (confirmVoidButton) {
            handlePurchasePaymentVoidSubmit();
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
                const voidingInvoice = getVoidingInvoice();
                const editingInvoice = getEditingInvoice();

                if (
                    featureState.editingInvoiceId &&
                    (!editingInvoice || (editingInvoice.invoiceStatus || editingInvoice.paymentStatus) === "Voided")
                ) {
                    featureState.editingInvoiceId = null;
                }

                if (
                    featureState.paymentInvoiceId &&
                    !invoices.some(invoice => invoice.id === featureState.paymentInvoiceId && (invoice.invoiceStatus || invoice.paymentStatus) !== "Voided")
                ) {
                    featureState.paymentInvoiceId = null;
                    resetPaymentDraft(null, { prefillAmount: false });
                    resetPaymentVoidState();
                    detachPaymentListener();
                }

                if (featureState.voidingInvoiceId && (!voidingInvoice || (voidingInvoice.invoiceStatus || voidingInvoice.paymentStatus) === "Voided")) {
                    resetInvoiceVoidState();
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
        resetInvoiceVoidState();
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
