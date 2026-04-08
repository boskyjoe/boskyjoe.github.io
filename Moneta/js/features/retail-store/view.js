import { getState, subscribe } from "../../app/store.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { showSummaryModal } from "../../shared/modal.js";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import {
    initializeRetailExpenseHistoryGrid,
    initializeRetailPaymentHistoryGrid,
    initializeRetailSalesGrid,
    initializeRetailWorksheetGrid,
    refreshRetailExpenseHistoryGrid,
    refreshRetailPaymentHistoryGrid,
    refreshRetailSalesGrid,
    refreshRetailWorksheetGrid,
    setRetailWorksheetMode,
    setRetailWorksheetReadOnly,
    updateRetailSalesGridSearch,
    updateRetailWorksheetGridSearch
} from "./grid.js";
import {
    getRetailSalePayments,
    subscribeToRetailCatalogueItems,
    subscribeToRetailSaleExpenses,
    subscribeToRetailSalePayments,
    subscribeToRetailSales
} from "./repository.js";
import { downloadRetailSalePdf } from "./pdf.js";
import {
    addRetailSaleReturn,
    addRetailSaleExpense,
    calculateRetailDraftSummary,
    RETAIL_DISCOUNT_TYPES,
    RETAIL_PAYMENT_TYPES,
    RETAIL_SALE_TYPES,
    RETAIL_STORES,
    getRetailStoreTaxDefaults,
    resolveRetailSaleEditScope,
    saveRetailSalePayment,
    saveRetailSaleUpdate,
    saveRetailSale
} from "./service.js";

const featureState = {
    sales: [],
    selectedCatalogueItems: [],
    searchTerm: "",
    worksheetSearchTerm: "",
    filteredSalesCount: null,
    unsubscribeSales: null,
    unsubscribeCatalogueItems: null,
    catalogueItemsListenerId: null,
    workspaceMode: "create",
    viewingSaleId: null,
    editingSaleId: null,
    editModeScope: null,
    paymentModalOpen: false,
    paymentSaleId: null,
    payments: [],
    unsubscribePayments: null,
    paymentDraft: createDefaultRetailPaymentDraft(),
    returningSaleId: null,
    returnDraft: createDefaultRetailReturnDraft(),
    expenseModalOpen: false,
    expenseSaleId: null,
    expenseHistory: [],
    unsubscribeExpenseHistory: null,
    expenseDraft: createDefaultExpenseDraft(),
    saleDraft: createDefaultSaleDraft(),
    lineItemDrafts: {}
};

function createDefaultSaleDraft() {
    return {
        saleDate: toDateInputValue(new Date()),
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerAddress: "",
        manualVoucherNumber: "",
        store: "",
        saleType: "Revenue",
        salesCatalogueId: "",
        paymentType: "Pay Later",
        paymentMode: "",
        amountReceived: "",
        transactionRef: "",
        paymentNotes: "",
        saleNotes: "",
        editReason: "",
        orderDiscountType: "Percentage",
        orderDiscountPercentage: "",
        orderDiscountAmount: "",
        orderTaxPercentage: ""
    };
}

function createDefaultExpenseDraft(defaultDate = new Date()) {
    return {
        expenseDate: toDateInputValue(defaultDate),
        justification: "",
        amount: ""
    };
}

function createDefaultRetailPaymentDraft(defaultDate = new Date()) {
    return {
        paymentDate: toDateInputValue(defaultDate),
        amountPaid: "",
        paymentMode: "",
        transactionRef: "",
        notes: ""
    };
}

function createDefaultRetailReturnDraft(defaultDate = new Date()) {
    return {
        returnDate: toDateInputValue(defaultDate),
        reason: ""
    };
}

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

function resetRetailWorkspace() {
    featureState.workspaceMode = "create";
    featureState.viewingSaleId = null;
    featureState.editingSaleId = null;
    featureState.returningSaleId = null;
    featureState.editModeScope = null;
    featureState.saleDraft = createDefaultSaleDraft();
    featureState.lineItemDrafts = {};
    clearCatalogueItemsSubscription();
    closeRetailPaymentModalState();
    closeRetailReturnModalState();
    closeRetailExpenseModalState();
}

function clearCatalogueItemsSubscription() {
    featureState.unsubscribeCatalogueItems?.();
    featureState.unsubscribeCatalogueItems = null;
    featureState.catalogueItemsListenerId = null;
    featureState.selectedCatalogueItems = [];
}

function closeRetailExpenseModalState() {
    featureState.unsubscribeExpenseHistory?.();
    featureState.unsubscribeExpenseHistory = null;
    featureState.expenseModalOpen = false;
    featureState.expenseSaleId = null;
    featureState.expenseHistory = [];
    featureState.expenseDraft = createDefaultExpenseDraft();
}

function closeRetailReturnModalState() {
    featureState.returningSaleId = null;
    featureState.returnDraft = createDefaultRetailReturnDraft();
}

function exitRetailReturnWorkspaceIfActive() {
    if (!isRetailReturnMode()) return;

    featureState.workspaceMode = "create";
    featureState.viewingSaleId = null;
    featureState.editingSaleId = null;
    featureState.returningSaleId = null;
    featureState.editModeScope = null;
    featureState.saleDraft = createDefaultSaleDraft();
    featureState.lineItemDrafts = {};
    clearCatalogueItemsSubscription();
}

function closeRetailPaymentModalState() {
    featureState.unsubscribePayments?.();
    featureState.unsubscribePayments = null;
    featureState.paymentModalOpen = false;
    featureState.paymentSaleId = null;
    featureState.payments = [];
    featureState.paymentDraft = createDefaultRetailPaymentDraft();
}

function openRetailPaymentModal(sale) {
    if (!sale?.id) return;

    exitRetailReturnWorkspaceIfActive();
    closeRetailReturnModalState();
    closeRetailExpenseModalState();
    featureState.unsubscribePayments?.();
    featureState.unsubscribePayments = null;
    featureState.paymentModalOpen = true;
    featureState.paymentSaleId = sale.id;
    featureState.payments = [];
    featureState.paymentDraft = createDefaultRetailPaymentDraft(sale.saleDate?.toDate ? sale.saleDate.toDate() : sale.saleDate || new Date());

    featureState.unsubscribePayments = subscribeToRetailSalePayments(
        sale.id,
        rows => {
            featureState.payments = rows;

            if (getState().currentRoute === "#/retail-store" && featureState.paymentModalOpen) {
                syncRetailPaymentHistoryGrid();
                syncRetailPaymentDraftPreview();
            }
        },
        error => {
            console.error("[Moneta] Failed to load retail payments:", error);
            showToast("Could not load retail payment history.", "error", {
                title: "Retail Store"
            });
        }
    );
}

function closeRetailPaymentModal() {
    closeRetailPaymentModalState();
    if (getState().currentRoute === "#/retail-store") {
        renderRetailStoreView();
    }
}

function openRetailExpenseModal(sale) {
    if (!sale?.id) return;

    exitRetailReturnWorkspaceIfActive();
    closeRetailPaymentModalState();
    closeRetailReturnModalState();
    featureState.unsubscribeExpenseHistory?.();
    featureState.unsubscribeExpenseHistory = null;
    featureState.expenseModalOpen = true;
    featureState.expenseSaleId = sale.id;
    featureState.expenseDraft = createDefaultExpenseDraft(sale.saleDate?.toDate ? sale.saleDate.toDate() : sale.saleDate || new Date());
    featureState.expenseHistory = [];

    featureState.unsubscribeExpenseHistory = subscribeToRetailSaleExpenses(
        sale.id,
        rows => {
            featureState.expenseHistory = rows;
            if (getState().currentRoute === "#/retail-store" && featureState.expenseModalOpen) {
                syncRetailExpenseHistoryGrid();
            }
        },
        error => {
            console.error("[Moneta] Failed to load retail sale expenses:", error);
            showToast("Could not load retail sale expense history.", "error", {
                title: "Retail Store"
            });
        }
    );
}

function closeRetailReturnModal() {
    resetRetailWorkspace();
    if (getState().currentRoute === "#/retail-store") {
        renderRetailStoreView();
    }
}

function closeRetailExpenseModal() {
    closeRetailExpenseModalState();
    if (getState().currentRoute === "#/retail-store") {
        renderRetailStoreView();
    }
}

function buildRetailWorksheetRows(snapshot) {
    const isStaticWorksheetMode = featureState.workspaceMode === "view"
        || featureState.workspaceMode === "return"
        || (isRetailEditMode() && featureState.editModeScope !== "full");

    if (isStaticWorksheetMode) {
        const products = snapshot.masterData.products || [];
        const categories = snapshot.masterData.categories || [];

        return Object.entries(featureState.lineItemDrafts).map(([productId, draft]) => {
            const product = products.find(entry => entry.id === productId) || null;
            const categoryId = draft.categoryId || product?.categoryId || "";
            const categoryName = draft.categoryName
                || categories.find(category => category.id === categoryId)?.categoryName
                || "-";

            return {
                productId,
                productName: draft.productName || product?.itemName || "Untitled Product",
                categoryId,
                categoryName,
                inventoryCount: Number(product?.inventoryCount) || 0,
                unitPrice: Number(draft.unitPrice) || 0,
                quantity: Number(draft.quantity) || 0,
                returnQuantity: Number(draft.returnQuantity) || 0,
                lineDiscountPercentage: Number(draft.lineDiscountPercentage) || 0,
                cgstPercentage: Number(draft.cgstPercentage) || 0,
                sgstPercentage: Number(draft.sgstPercentage) || 0,
                lineTotal: Number(draft.lineTotal) || 0
            };
        });
    }

    const categories = snapshot.masterData.categories || [];
    const products = snapshot.masterData.products || [];
    const storeTaxDefaults = getRetailStoreTaxDefaults(featureState.saleDraft.store);
    const selectedRows = (featureState.selectedCatalogueItems || []).map(item => {
        const product = products.find(entry => entry.id === item.productId) || null;
        const draft = featureState.lineItemDrafts[item.productId] || {};
        const categoryId = item.categoryId || product?.categoryId || "";
        const categoryName = item.categoryName
            || categories.find(category => category.id === categoryId)?.categoryName
            || "-";

        return {
            productId: item.productId,
            productName: item.productName || product?.itemName || "Untitled Product",
            categoryId,
            categoryName,
            inventoryCount: Number(product?.inventoryCount) || 0,
            unitPrice: Number(item.sellingPrice) || 0,
            quantity: Number(draft.quantity) || 0,
            returnQuantity: Number(draft.returnQuantity) || 0,
            lineDiscountPercentage: Number(draft.lineDiscountPercentage) || 0,
            cgstPercentage: draft.cgstPercentage ?? storeTaxDefaults.cgstPercentage,
            sgstPercentage: draft.sgstPercentage ?? storeTaxDefaults.sgstPercentage
        };
    });
    const selectedIds = new Set(selectedRows.map(row => row.productId));
    const draftOnlyRows = Object.entries(featureState.lineItemDrafts || {})
        .filter(([productId]) => !selectedIds.has(productId))
        .map(([productId, draft]) => {
            const product = products.find(entry => entry.id === productId) || null;
            const categoryId = draft.categoryId || product?.categoryId || "";
            const categoryName = draft.categoryName
                || categories.find(category => category.id === categoryId)?.categoryName
                || "-";

            return {
                productId,
                productName: draft.productName || product?.itemName || "Untitled Product",
                categoryId,
                categoryName,
                inventoryCount: Number(product?.inventoryCount) || 0,
                unitPrice: Number(draft.unitPrice) || 0,
                quantity: Number(draft.quantity) || 0,
                returnQuantity: Number(draft.returnQuantity) || 0,
                lineDiscountPercentage: Number(draft.lineDiscountPercentage) || 0,
                cgstPercentage: draft.cgstPercentage ?? storeTaxDefaults.cgstPercentage,
                sgstPercentage: draft.sgstPercentage ?? storeTaxDefaults.sgstPercentage,
                lineTotal: Number(draft.lineTotal) || 0
            };
        });

    return [...selectedRows, ...draftOnlyRows];
}

function applyStoreTaxDefaultsToLineItemDrafts(storeName) {
    const storeTaxDefaults = getRetailStoreTaxDefaults(storeName);

    featureState.lineItemDrafts = Object.fromEntries(Object.entries(featureState.lineItemDrafts).map(([productId, draft]) => {
        return [productId, {
            ...draft,
            cgstPercentage: storeTaxDefaults.cgstPercentage,
            sgstPercentage: storeTaxDefaults.sgstPercentage
        }];
    }));
}

function getRetailSummary(snapshot = getState()) {
    return calculateRetailDraftSummary(buildRetailWorksheetRows(snapshot), {
        orderDiscountType: featureState.saleDraft.orderDiscountType,
        orderDiscountPercentage: featureState.saleDraft.orderDiscountPercentage,
        orderDiscountAmount: featureState.saleDraft.orderDiscountAmount,
        orderTaxPercentage: featureState.saleDraft.orderTaxPercentage
    }, {
        amountReceived: featureState.saleDraft.amountReceived
    });
}

function getSalesHistoryRows() {
    return (featureState.sales || []).map(sale => ({
        id: sale.id,
        saleId: sale.saleId || "-",
        manualVoucherNumber: sale.manualVoucherNumber || "-",
        saleDate: sale.saleDate,
        customerName: sale.customerInfo?.name || "-",
        store: sale.store || "-",
        saleType: sale.saleType || "-",
        lineItemCount: Number(sale.lineItemCount) || (sale.lineItems || []).length || 0,
        returnCount: Number(sale.returnCount) || 0,
        returnStatus: sale.returnStatus || "Not Returned",
        saleStatus: sale.saleStatus || "Active",
        invoiceTotal: Number(sale.financials?.grandTotal ?? sale.financials?.totalAmount) || 0,
        amountPaid: Number(sale.totalAmountPaid) || 0,
        totalExpenses: Number(sale.financials?.totalExpenses) || 0,
        balanceDue: Number(sale.balanceDue) || 0,
        paymentStatus: sale.paymentStatus || "Unpaid"
    }));
}

function renderStoreOptions(currentValue) {
    return RETAIL_STORES.map(store => `
        <option value="${store}" ${store === currentValue ? "selected" : ""}>${store}</option>
    `).join("");
}

function renderSaleTypeOptions(currentValue) {
    return RETAIL_SALE_TYPES.map(type => `
        <option value="${type}" ${type === currentValue ? "selected" : ""}>${type}</option>
    `).join("");
}

function renderPaymentTypeOptions(currentValue) {
    return RETAIL_PAYMENT_TYPES.map(type => `
        <option value="${type}" ${type === currentValue ? "selected" : ""}>${type}</option>
    `).join("");
}

function renderDiscountTypeOptions(currentValue) {
    return RETAIL_DISCOUNT_TYPES.map(type => `
        <option value="${type}" ${type === currentValue ? "selected" : ""}>${type}</option>
    `).join("");
}

function renderSalesCatalogueOptions(snapshot, currentValue) {
    return (snapshot.masterData.salesCatalogues || [])
        .filter(catalogue => catalogue.isActive || catalogue.id === currentValue)
        .map(catalogue => `
            <option value="${catalogue.id}" ${catalogue.id === currentValue ? "selected" : ""}>
                ${catalogue.catalogueName} (${catalogue.seasonName || "No Season"})
            </option>
        `).join("");
}

function renderPaymentModeOptions(snapshot, currentValue) {
    return (snapshot.masterData.paymentModes || [])
        .filter(mode => mode.isActive || mode.paymentMode === currentValue)
        .map(mode => `
            <option value="${mode.paymentMode}" ${mode.paymentMode === currentValue ? "selected" : ""}>
                ${mode.paymentMode}
            </option>
        `).join("");
}

function getPaymentModalSale() {
    if (!featureState.paymentSaleId) return null;
    return featureState.sales.find(entry => entry.id === featureState.paymentSaleId) || null;
}

function getReturnWorkspaceSale() {
    if (!featureState.returningSaleId) return null;
    return featureState.sales.find(entry => entry.id === featureState.returningSaleId) || null;
}

function getReturnDraftQuantity(productId, fallback = 0) {
    const draft = featureState.lineItemDrafts?.[productId] || {};
    const value = draft.returnQuantity ?? fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function calculateWorksheetLineTotal(item) {
    const quantity = Number(item?.quantity) || 0;
    const unitPrice = Number(item?.unitPrice) || 0;
    const lineDiscountPercentage = Number(item?.lineDiscountPercentage) || 0;
    const cgstPercentage = Number(item?.cgstPercentage) || 0;
    const sgstPercentage = Number(item?.sgstPercentage) || 0;
    const gross = quantity * unitPrice;
    const discount = gross * (lineDiscountPercentage / 100);
    const taxableAmount = gross - discount;
    const cgstAmount = taxableAmount * (cgstPercentage / 100);
    const sgstAmount = taxableAmount * (sgstPercentage / 100);
    return Number((taxableAmount + cgstAmount + sgstAmount).toFixed(2));
}

function calculateRetailReturnDraftSummary(sale) {
    const lineItems = buildRetailWorksheetRows(getState()) || sale?.lineItems || [];
    const selectedItems = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    lineItems.forEach(item => {
        const productId = item.productId;
        const availableQuantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
        if (!productId || availableQuantity <= 0) return;

        const requestedQuantity = Math.min(getReturnDraftQuantity(productId), availableQuantity);
        if (requestedQuantity <= 0) return;

        const lineTotal = Number(item.lineTotal) || calculateWorksheetLineTotal(item);
        const unitReturnAmount = availableQuantity > 0
            ? lineTotal / availableQuantity
            : Number(item.unitPrice) || 0;
        const estimatedAmount = Number((requestedQuantity * unitReturnAmount).toFixed(2));

        selectedItems.push({
            productId,
            productName: item.productName || "",
            quantity: requestedQuantity,
            estimatedAmount
        });

        totalQuantity += requestedQuantity;
        totalAmount += estimatedAmount;
    });

    return {
        selectedItems,
        totalQuantity,
        totalAmount: Number(totalAmount.toFixed(2))
    };
}

function isRetailEditMode() {
    return featureState.workspaceMode === "edit";
}

function isRetailReturnMode() {
    return featureState.workspaceMode === "return";
}

function isRetailWorksheetLockedMode() {
    if (featureState.workspaceMode === "view") return true;
    if (isRetailEditMode() && featureState.editModeScope !== "full") return true;
    return false;
}

function getPaymentDraftAmount() {
    const amountInput = document.getElementById("retail-payment-entry-amount");
    const value = amountInput?.value ?? featureState.paymentDraft.amountPaid;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function syncRetailPaymentDraftPreview() {
    if (!featureState.paymentModalOpen) return;

    const sale = getPaymentModalSale();
    if (!sale) return;

    const balanceDue = Number(sale.balanceDue) || 0;
    const draftAmount = getPaymentDraftAmount();
    const appliedDraft = Math.min(draftAmount, balanceDue);
    const remaining = Math.max(balanceDue - appliedDraft, 0);
    const remainingNode = document.getElementById("retail-payment-balance-after-draft");

    if (remainingNode) {
        remainingNode.textContent = formatCurrency(remaining);
    }
}

function renderRetailPaymentModal(snapshot) {
    if (!featureState.paymentModalOpen) return "";

    const sale = getPaymentModalSale();
    if (!sale) return "";

    const paymentModes = (snapshot.masterData.paymentModes || []).filter(mode => mode.isActive);
    const invoiceTotal = Number(sale.financials?.grandTotal ?? sale.financials?.totalAmount) || 0;
    const amountPaid = Number(sale.totalAmountPaid) || 0;
    const balanceDue = Number(sale.balanceDue ?? Math.max(invoiceTotal - amountPaid, 0)) || 0;
    const draftAmount = Number(featureState.paymentDraft.amountPaid) || 0;
    const remainingBalance = Math.max(balanceDue - Math.min(draftAmount, balanceDue), 0);
    const canRecordPayment = sale.saleStatus !== "Voided" && balanceDue > 0 && paymentModes.length > 0;
    const paymentStatus = sale.paymentStatus || "Unpaid";

    return `
        <div id="retail-payment-modal" class="purchase-payment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="retail-payment-modal-title">
            <div class="purchase-payment-modal-card">
                <div class="panel-header panel-header-accent purchase-payment-modal-header">
                    <div class="purchase-payment-modal-title-row">
                        <span class="panel-icon panel-icon-alt">${icons.payment}</span>
                        <div>
                            <h3 id="retail-payment-modal-title">Record Retail Payment</h3>
                            <p class="panel-copy">Capture customer payments for the selected retail sale and keep the payment history visible below.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta purchase-payment-modal-meta">
                        <span class="status-pill">${sale.saleId || sale.manualVoucherNumber || "-"}</span>
                        <span class="status-pill">${sale.store || "-"}</span>
                        <span class="status-pill">${featureState.payments.length} payments</span>
                    </div>
                </div>
                <div class="panel-body purchase-payment-modal-body">
                    <div class="purchase-payments-layout">
                        <div class="payment-workspace-card">
                            <div class="purchase-payment-meta-grid">
                                <article class="summary-card">
                                    <p class="summary-label">Customer</p>
                                    <p class="summary-value payment-summary-copy">${sale.customerInfo?.name || "-"}</p>
                                </article>
                                <article class="summary-card">
                                    <p class="summary-label">Invoice Total</p>
                                    <p class="summary-value">${formatCurrency(invoiceTotal)}</p>
                                </article>
                                <article class="summary-card">
                                    <p class="summary-label">Amount Paid</p>
                                    <p class="summary-value">${formatCurrency(amountPaid)}</p>
                                </article>
                                <article class="summary-card retail-summary-card-strong">
                                    <p class="summary-label">Balance Due</p>
                                    <p class="summary-value">${formatCurrency(balanceDue)}</p>
                                </article>
                            </div>

                            <form id="retail-payment-form" class="purchase-payment-form">
                                <div class="form-grid">
                                    <div class="field">
                                        <label for="retail-payment-entry-date">Payment Date <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="retail-payment-entry-date" class="input" type="date" value="${featureState.paymentDraft.paymentDate}" required>
                                    </div>
                                    <div class="field">
                                        <label for="retail-payment-entry-amount">Amount Paid <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="retail-payment-entry-amount" class="input" type="number" min="0" step="0.01" value="${featureState.paymentDraft.amountPaid}" placeholder="0.00" ${balanceDue <= 0 ? "disabled" : ""} required>
                                    </div>
                                    <div class="field">
                                        <label for="retail-payment-entry-mode">Payment Mode <span class="required-mark" aria-hidden="true">*</span></label>
                                        <select id="retail-payment-entry-mode" class="select" ${canRecordPayment ? "" : "disabled"} required>
                                            <option value="">Select payment mode</option>
                                            ${renderPaymentModeOptions(snapshot, featureState.paymentDraft.paymentMode)}
                                        </select>
                                    </div>
                                    <div class="field field-full">
                                        <label for="retail-payment-entry-reference">Payment Reference <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="retail-payment-entry-reference" class="input" type="text" value="${featureState.paymentDraft.transactionRef}" placeholder="UPI / cash reference / card slip">
                                    </div>
                                    <div class="field field-full">
                                        <label for="retail-payment-entry-notes">Payment Notes</label>
                                        <textarea id="retail-payment-entry-notes" class="textarea" placeholder="Optional notes for this payment">${featureState.paymentDraft.notes}</textarea>
                                    </div>
                                </div>
                                <div class="purchase-payment-preview">
                                    <article class="summary-card">
                                        <p class="summary-label">Current Status</p>
                                        <p class="summary-value">${paymentStatus}</p>
                                    </article>
                                    <article class="summary-card">
                                        <p class="summary-label">Balance After Draft</p>
                                        <p id="retail-payment-balance-after-draft" class="summary-value">${formatCurrency(remainingBalance)}</p>
                                    </article>
                                </div>
                                ${balanceDue <= 0 ? `
                                    <p class="panel-copy panel-copy-tight">This sale is already fully paid. You can still review the payment history below.</p>
                                ` : ""}
                                ${balanceDue > 0 && paymentModes.length === 0 ? `
                                    <p class="panel-copy panel-copy-tight">Add at least one active payment mode before recording retail payments.</p>
                                ` : ""}
                                <div class="form-actions">
                                    <button id="retail-payment-cancel-button" class="button button-secondary retail-payment-close-trigger" type="button">
                                        <span class="button-icon">${icons.inactive}</span>
                                        Close
                                    </button>
                                    <button class="button button-primary-alt" type="submit" ${canRecordPayment ? "" : "disabled"}>
                                        <span class="button-icon">${icons.payment}</span>
                                        Record Payment
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div class="payment-workspace-card">
                            <div class="purchase-payments-history-header">
                                <p class="section-kicker">Payment History</p>
                                <p id="retail-payment-history-count" class="panel-copy">${featureState.payments.length} payment record(s) linked to this sale.</p>
                            </div>
                            <div class="ag-shell purchase-payment-history-shell">
                                <div id="retail-payment-history-grid" class="ag-theme-alpine moneta-grid" style="height: 400px; width: 100%;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function syncRetailReturnDraftPreview() {
    if (!isRetailReturnMode()) return;
    const sale = getReturnWorkspaceSale();
    if (!sale) return;

    const draftSummary = calculateRetailReturnDraftSummary(sale);
    const qtyNode = document.getElementById("retail-return-selected-qty");
    const amountNode = document.getElementById("retail-return-selected-amount");

    if (qtyNode) {
        qtyNode.textContent = String(draftSummary.totalQuantity);
    }

    if (amountNode) {
        amountNode.textContent = formatCurrency(draftSummary.totalAmount);
    }
}

function getExpenseModalSale() {
    if (!featureState.expenseSaleId) return null;

    const liveSale = featureState.sales.find(entry => entry.id === featureState.expenseSaleId);
    if (liveSale) return liveSale;

    if (featureState.viewingSaleId === featureState.expenseSaleId) {
        return {
            id: featureState.viewingSaleId,
            saleId: featureState.saleDraft.manualVoucherNumber || "-",
            manualVoucherNumber: featureState.saleDraft.manualVoucherNumber || "-",
            saleDate: featureState.saleDraft.saleDate,
            customerInfo: {
                name: featureState.saleDraft.customerName || "-",
                phone: featureState.saleDraft.customerPhone || "",
                email: featureState.saleDraft.customerEmail || "",
                address: featureState.saleDraft.customerAddress || ""
            },
            balanceDue: 0,
            financials: {
                grandTotal: 0,
                totalExpenses: 0
            },
            paymentStatus: "Unknown"
        };
    }

    return null;
}

function renderRetailExpenseModal(sale) {
    if (!featureState.expenseModalOpen || !sale) return "";

    const invoiceTotal = Number(sale.financials?.grandTotal ?? sale.financials?.totalAmount) || 0;
    const currentExpenses = Number(sale.financials?.totalExpenses) || 0;
    const balanceDue = Number(sale.balanceDue) || 0;
    const expenseCount = featureState.expenseHistory.length;
    const displaySaleId = sale.saleId || sale.manualVoucherNumber || "-";
    const defaultDate = featureState.expenseDraft.expenseDate || toDateInputValue(new Date());

    return `
        <div id="retail-expense-modal" class="retail-expense-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="retail-expense-modal-title">
            <div class="retail-expense-modal-card">
                <div class="panel-header panel-header-accent purchase-payment-modal-header">
                    <div class="purchase-payment-modal-title-row">
                        <span class="panel-icon">${icons.payment}</span>
                        <div>
                            <h3 id="retail-expense-modal-title">Add Sale Expense</h3>
                            <p class="panel-copy">Log retail sale expenses, keep the expense history visible, and update sale balance in one safe operation.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta purchase-payment-modal-meta">
                        <span class="status-pill">${displaySaleId}</span>
                        <span class="status-pill">${sale.store || "-"}</span>
                        <span class="status-pill">${sale.paymentStatus || "Unpaid"}</span>
                    </div>
                </div>
                <div class="panel-body purchase-payment-modal-body">
                    <div class="retail-expense-layout">
                        <div class="retail-expense-summary-grid">
                            <article class="summary-card">
                                <p class="summary-label">Invoice Total</p>
                                <p class="summary-value">${formatCurrency(invoiceTotal)}</p>
                            </article>
                            <article class="summary-card">
                                <p class="summary-label">Current Expenses</p>
                                <p class="summary-value">${formatCurrency(currentExpenses)}</p>
                            </article>
                            <article class="summary-card retail-summary-card-strong">
                                <p class="summary-label">Balance Due</p>
                                <p class="summary-value">${formatCurrency(balanceDue)}</p>
                            </article>
                        </div>

                        <section class="payment-workspace-card retail-expense-entry-card">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Add New Expense</p>
                                <p class="panel-copy">Capture date, reason, and amount. Expenses reduce the open sale balance due.</p>
                            </div>
                            <form id="retail-expense-form">
                                <div class="form-grid">
                                    <div class="field">
                                        <label for="retail-expense-date">Expense Date <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="retail-expense-date" class="input" type="date" value="${defaultDate}" required>
                                    </div>
                                    <div class="field field-full">
                                        <label for="retail-expense-justification">Justification <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="retail-expense-justification" class="input" type="text" value="${featureState.expenseDraft.justification}" placeholder="Delivery charges, special packaging, etc." required>
                                    </div>
                                    <div class="field">
                                        <label for="retail-expense-amount">Amount <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="retail-expense-amount" class="input" type="number" min="0.01" step="0.01" value="${featureState.expenseDraft.amount}" placeholder="0.00" required>
                                    </div>
                                </div>
                                <div class="form-actions">
                                    <button id="retail-expense-cancel-button" class="button button-secondary" type="button">
                                        <span class="button-icon">${icons.inactive}</span>
                                        Close
                                    </button>
                                    <button class="button button-primary-alt" type="submit">
                                        <span class="button-icon">${icons.plus}</span>
                                        Add Expense
                                    </button>
                                </div>
                            </form>
                        </section>

                        <section class="payment-workspace-card">
                            <div class="purchase-payments-history-header">
                                <p class="section-kicker">Expense History</p>
                                <p id="retail-expense-history-count" class="panel-copy">${expenseCount} expense record(s) linked to this sale.</p>
                            </div>
                            <div class="purchase-payment-history-shell">
                                <div id="retail-expense-history-grid" class="ag-theme-alpine moneta-grid" style="height: 300px; width: 100%;"></div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderRetailStoreViewShell(snapshot) {
    const root = document.getElementById("retail-store-root");
    if (!root) return;

    const summary = getRetailSummary(snapshot);
    const activeCatalogues = snapshot.masterData.salesCatalogues?.filter(catalogue => catalogue.isActive).length || 0;
    const selectedCatalogueLabel = snapshot.masterData.salesCatalogues
        ?.find(catalogue => catalogue.id === featureState.saleDraft.salesCatalogueId)?.catalogueName || "No catalogue";
    const isPayNow = featureState.saleDraft.paymentType === "Pay Now";
    const isSampleSale = featureState.saleDraft.saleType === "Sample";
    const isTastyTreats = featureState.saleDraft.store === "Tasty Treats";
    const isViewMode = featureState.workspaceMode === "view";
    const isEditMode = featureState.workspaceMode === "edit";
    const isReturnMode = featureState.workspaceMode === "return";
    const isEditModeFull = isEditMode && featureState.editModeScope === "full";
    const isEditModeLimited = isEditMode && featureState.editModeScope === "limited";
    const viewingSale = isViewMode
        ? featureState.sales.find(entry => entry.id === featureState.viewingSaleId) || null
        : null;
    const editingSale = isEditMode
        ? featureState.sales.find(entry => entry.id === featureState.editingSaleId) || null
        : null;
    const returningSale = isReturnMode
        ? featureState.sales.find(entry => entry.id === featureState.returningSaleId) || null
        : null;
    const workspaceSale = viewingSale || editingSale || returningSale;
    const workspaceTotalExpenses = Number(workspaceSale?.financials?.totalExpenses) || 0;
    const workspaceBalanceDue = Number(workspaceSale?.balanceDue) || 0;
    const returnDraftSummary = isReturnMode && returningSale
        ? calculateRetailReturnDraftSummary(returningSale)
        : { totalQuantity: 0, totalAmount: 0 };
    const projectedGrandTotal = Math.max(summary.grandTotal - returnDraftSummary.totalAmount, 0);
    const projectedBalanceDue = Math.max(workspaceBalanceDue - returnDraftSummary.totalAmount, 0);
    const filteredHistoryCount = featureState.filteredSalesCount ?? featureState.sales.length;
    const draftPaymentStatus = summary.grandTotal <= 0
        ? "Paid"
        : featureState.saleDraft.paymentType === "Pay Now"
            ? (summary.balanceDue <= 0 ? "Paid" : summary.appliedPayment > 0 ? "Partially Paid" : "Unpaid")
            : "Unpaid";
    const paymentStatus = (isViewMode || isEditMode || isReturnMode)
        ? workspaceSale?.paymentStatus || draftPaymentStatus
        : draftPaymentStatus;
    const expenseModalSale = getExpenseModalSale();
    const canEditSaleIdentity = !isViewMode && !isReturnMode && (!isEditMode || isEditModeFull);
    const canEditCustomerInfo = !isViewMode && !isReturnMode;
    const canEditSaleContext = !isViewMode && !isEditMode && !isReturnMode;
    const canEditSettlement = !isViewMode && !isEditMode && !isReturnMode;
    const canEditFinancials = !isViewMode && !isReturnMode && (!isEditMode || isEditModeFull);

    const saleIdentityDisabledAttr = canEditSaleIdentity ? "" : "disabled";
    const customerDisabledAttr = canEditCustomerInfo ? "" : "disabled";
    const saleContextDisabledAttr = canEditSaleContext ? "" : "disabled";
    const financialDisabledAttr = canEditFinancials ? "" : "disabled";

    const viewModeBanner = isViewMode ? `
        <div class="retail-view-mode-banner">
            <div>
                <p class="section-kicker">Read Only View</p>
                <p class="panel-copy">You are reviewing a posted retail sale. All fields are locked so you can inspect the full sale safely.</p>
            </div>
            <div class="toolbar-meta">
                <span class="status-pill">${featureState.saleDraft.manualVoucherNumber || "-"}</span>
                <span class="status-pill">${formatCurrency(summary.grandTotal)} total</span>
                <span class="status-pill">${paymentStatus}</span>
            </div>
        </div>
    ` : "";
    const editModeBanner = isEditMode ? `
        <div class="retail-edit-mode-banner ${isEditModeLimited ? "retail-edit-mode-banner-limited" : "retail-edit-mode-banner-full"}">
            <div>
                <p class="section-kicker">${isEditModeLimited ? "Limited Edit Mode" : "Full Edit Mode"}</p>
                <p class="panel-copy">
                    ${isEditModeLimited
                        ? `<span class="retail-edit-warning-prefix"><span class="retail-edit-warning-icon" aria-hidden="true">${icons.warning}</span>Payments, expenses, or returns are already linked.</span> You can update customer details and notes only. Product list, discounts, tax, and settlement are locked.`
                        : "No linked payments, expenses, or returns were found. Full retail edit is enabled, including product list and invoice adjustments."}
                </p>
            </div>
            <div class="toolbar-meta">
                <span class="status-pill">${featureState.saleDraft.manualVoucherNumber || "-"}</span>
                <span class="status-pill">${formatCurrency(summary.grandTotal)} total</span>
                <span class="status-pill">${paymentStatus}</span>
            </div>
        </div>
    ` : "";
    const returnModeBanner = isReturnMode ? `
        <div class="retail-return-mode-banner">
            <div>
                <p class="section-kicker">Return Mode</p>
                <p class="panel-copy"><span class="retail-edit-warning-prefix"><span class="retail-edit-warning-icon" aria-hidden="true">${icons.warning}</span>Read-only sale snapshot.</span> Set return quantities in Product List, add a return reason, then process the return.</p>
            </div>
            <div class="toolbar-meta">
                <span class="status-pill">${featureState.saleDraft.manualVoucherNumber || "-"}</span>
                <span class="status-pill">${returnDraftSummary.totalQuantity} qty selected</span>
                <span class="status-pill">${formatCurrency(returnDraftSummary.totalAmount)} est. return</span>
            </div>
        </div>
    ` : "";

    root.innerHTML = `
        <div class="panel-card ${(isViewMode || isEditMode || isReturnMode) ? "retail-view-mode-card" : ""}">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.retail}</span>
                    <div>
                        <h2>${isViewMode ? "View Retail Sale" : isEditMode ? "Edit Retail Sale" : isReturnMode ? "Return Retail Sale" : "Retail Store"}</h2>
                        <p class="panel-copy">
                            ${isViewMode
                                ? "Review the full retail sale exactly as it was posted, including customer, settlement, product tax, and totals."
                                : isEditMode
                                    ? "Edit the selected retail sale with strict safeguards based on linked payments and expenses."
                                    : isReturnMode
                                        ? "Process a product return from this posted sale using a controlled, read-only workspace with explicit return quantities."
                                    : "Process direct store sales using active sales catalogues, worksheet-based product selection, and optional immediate payment capture."}
                        </p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${activeCatalogues} active catalogues</span>
                    <span class="status-pill">${summary.itemCount} active products</span>
                    <span class="status-pill">${featureState.sales.length} sales recorded</span>
                </div>
            </div>
            <div class="panel-body">
                ${viewModeBanner}
                ${editModeBanner}
                ${returnModeBanner}
                <form id="retail-store-form">
                    <div class="workspace-form-sections">
                        <section class="workspace-form-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Customer Info</p>
                                <p class="panel-copy">Capture the sale date, customer identity, and the contact details needed for follow-up.</p>
                            </div>
                            <div class="workspace-form-section-grid">
                                <div class="field">
                                    <label for="retail-sale-date">Sale Date <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="retail-sale-date" class="input" type="date" value="${featureState.saleDraft.saleDate}" ${saleIdentityDisabledAttr} required>
                                </div>
                                <div class="field">
                                    <label for="retail-voucher-number">Manual Voucher # <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="retail-voucher-number" class="input" type="text" value="${featureState.saleDraft.manualVoucherNumber}" placeholder="TT-APR-001" ${saleIdentityDisabledAttr} required>
                                </div>
                                <div class="field field-wide">
                                    <label for="retail-customer-name">Customer Name <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="retail-customer-name" class="input" type="text" value="${featureState.saleDraft.customerName}" placeholder="Customer name" ${customerDisabledAttr} required>
                                </div>
                                <div class="field">
                                    <label for="retail-customer-phone">Customer Phone <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="retail-customer-phone" class="input" type="tel" value="${featureState.saleDraft.customerPhone}" placeholder="Customer phone" ${customerDisabledAttr} required>
                                </div>
                                <div class="field">
                                    <label for="retail-customer-email">Email</label>
                                    <input id="retail-customer-email" class="input" type="email" value="${featureState.saleDraft.customerEmail}" placeholder="Customer email" ${customerDisabledAttr}>
                                </div>
                                <div class="field field-full" ${isTastyTreats ? "" : "hidden"}>
                                    <label for="retail-customer-address">Customer Address <span class="required-mark" aria-hidden="true">*</span></label>
                                    <textarea id="retail-customer-address" class="textarea" ${customerDisabledAttr} placeholder="Delivery address for Tasty Treats orders">${featureState.saleDraft.customerAddress}</textarea>
                                </div>
                            </div>
                        </section>

                        <section class="workspace-form-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Sale Context</p>
                                <p class="panel-copy">Choose the store and catalogue that define which products, prices, and rules apply to this sale.</p>
                            </div>
                            <div class="workspace-form-section-grid">
                                <div class="field">
                                    <label for="retail-store">Store <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="retail-store" class="select" ${saleContextDisabledAttr} required>
                                        <option value="">Select store</option>
                                        ${renderStoreOptions(featureState.saleDraft.store)}
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="retail-sale-type">Sale Type <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="retail-sale-type" class="select" ${saleContextDisabledAttr} required>
                                        <option value="">Select sale type</option>
                                        ${renderSaleTypeOptions(featureState.saleDraft.saleType)}
                                    </select>
                                </div>
                                <div class="field field-full">
                                    <label for="retail-sales-catalogue">Sales Catalogue <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="retail-sales-catalogue" class="select" ${saleContextDisabledAttr} required>
                                        <option value="">Select catalogue</option>
                                        ${renderSalesCatalogueOptions(snapshot, featureState.saleDraft.salesCatalogueId)}
                                    </select>
                                </div>
                                <div class="field field-full">
                                    <label for="retail-sale-notes">Sale Notes</label>
                                    <textarea id="retail-sale-notes" class="textarea" ${customerDisabledAttr} placeholder="Optional notes for this retail sale">${featureState.saleDraft.saleNotes}</textarea>
                                </div>
                            </div>
                        </section>

                        <section class="workspace-form-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Settlement</p>
                                <p class="panel-copy">Choose whether to invoice the customer or capture payment immediately as part of the sale.</p>
                            </div>
                            <div class="workspace-form-section-grid">
                                <div class="field">
                                    <label for="retail-payment-type">Payment Type <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="retail-payment-type" class="select" ${(isSampleSale || !canEditSettlement) ? "disabled" : ""} required>
                                        ${renderPaymentTypeOptions(featureState.saleDraft.paymentType)}
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="retail-payment-mode">Payment Mode ${isPayNow ? '<span class="required-mark" aria-hidden="true">*</span>' : ""}</label>
                                    <select id="retail-payment-mode" class="select" ${(isPayNow && canEditSettlement) ? "" : "disabled"}>
                                        <option value="">Select payment mode</option>
                                        ${renderPaymentModeOptions(snapshot, featureState.saleDraft.paymentMode)}
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="retail-amount-received">Amount Received ${isPayNow ? '<span class="required-mark" aria-hidden="true">*</span>' : ""}</label>
                                    <input id="retail-amount-received" class="input" type="number" min="0" step="0.01" value="${featureState.saleDraft.amountReceived}" ${(isPayNow && canEditSettlement) ? "" : "disabled"} placeholder="0.00">
                                </div>
                                <div class="field field-full">
                                    <label for="retail-transaction-ref">Payment Reference ${isPayNow ? '<span class="required-mark" aria-hidden="true">*</span>' : ""}</label>
                                    <input id="retail-transaction-ref" class="input" type="text" value="${featureState.saleDraft.transactionRef}" ${(isPayNow && canEditSettlement) ? "" : "disabled"} placeholder="UPI / Cash Ref / Card Slip">
                                </div>
                                <div class="field field-full">
                                    <label for="retail-payment-notes">Payment Notes</label>
                                    <textarea id="retail-payment-notes" class="textarea" ${(isPayNow && canEditSettlement) ? "" : "disabled"} placeholder="Optional notes about the payment">${featureState.saleDraft.paymentNotes}</textarea>
                                </div>
                            </div>
                            ${isEditMode ? `
                                <p class="panel-copy panel-copy-tight">Settlement fields are locked during edit. Use the <strong>Payments</strong> action in Sales History to record customer payments.</p>
                            ` : ""}
                        </section>
                    </div>
                    ${isEditMode ? `
                        <section class="workspace-form-section retail-edit-reason-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Edit Audit</p>
                                <p class="panel-copy">Capture why this sale is being edited. The reason is stored on the sale for audit history.</p>
                            </div>
                            <div class="workspace-form-section-grid">
                                <div class="field field-full">
                                    <label for="retail-edit-reason">Edit Reason <span class="required-mark" aria-hidden="true">*</span></label>
                                    <textarea id="retail-edit-reason" class="textarea" placeholder="Explain why this retail sale is being edited" ${customerDisabledAttr} required>${featureState.saleDraft.editReason || ""}</textarea>
                                </div>
                            </div>
                        </section>
                    ` : ""}
                    ${isReturnMode ? `
                        <section class="workspace-form-section retail-return-reason-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Return Details</p>
                                <p class="panel-copy">Capture the return date and reason. Then enter return quantities directly in the Product List worksheet.</p>
                            </div>
                            <div class="workspace-form-section-grid">
                                <div class="field">
                                    <label for="retail-return-date">Return Date <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="retail-return-date" class="input" type="date" value="${featureState.returnDraft.returnDate || ""}" required>
                                </div>
                                <div class="field field-full">
                                    <label for="retail-return-reason">Return Reason <span class="required-mark" aria-hidden="true">*</span></label>
                                    <textarea id="retail-return-reason" class="textarea" placeholder="State why these products are being returned" required>${featureState.returnDraft.reason || ""}</textarea>
                                </div>
                            </div>
                            <div class="retail-return-preview-row">
                                <article class="retail-finance-chip">
                                    <span>Selected Qty</span>
                                    <strong id="retail-return-selected-qty">${returnDraftSummary.totalQuantity}</strong>
                                </article>
                                <article class="retail-finance-chip">
                                    <span>Estimated Return Value</span>
                                    <strong id="retail-return-selected-amount">${formatCurrency(returnDraftSummary.totalAmount)}</strong>
                                </article>
                            </div>
                        </section>
                    ` : ""}

                    <div class="retail-product-list-shell">
                        <div class="panel-card">
                            <div class="panel-header">
                                <div class="panel-title-wrap">
                                    <span class="panel-icon">${icons.products}</span>
                                    <div>
                                        <h3>Product List</h3>
                                        <p class="panel-copy">
                                            ${isReturnMode
                                                ? "Review sold products and set Return Qty for each line item you need to bring back into stock."
                                                : "Search the selected catalogue, then set Qty greater than zero to include products in this sale. Pricing comes directly from the active catalogue, and each line carries CGST and SGST."}
                                        </p>
                                    </div>
                                </div>
                                <div class="toolbar-meta">
                                    <span class="status-pill">${selectedCatalogueLabel}</span>
                                    <span class="status-pill">${summary.totalQuantity} ${isReturnMode ? "sold qty" : "total qty"}</span>
                                </div>
                            </div>
                            <div class="panel-body">
                                <div class="toolbar">
                                    <div>
                                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Worksheet</p>
                                        <p class="panel-copy">
                                            ${isReturnMode
                                                ? "Only Return Qty is editable in return mode. All sale pricing, discounts, and tax fields stay read-only."
                                                : "Use line discount, CGST, and SGST at product level, then finish with invoice-level discount and any order tax below."}
                                        </p>
                                    </div>
                                    <div class="search-wrap">
                                        <span class="search-icon">${icons.search}</span>
                                        <input
                                            id="retail-worksheet-search"
                                            class="input toolbar-search"
                                            type="search"
                                            placeholder="Search product, category, or stock"
                                            value="${featureState.worksheetSearchTerm}">
                                    </div>
                                </div>
                                <div class="ag-shell">
                                    <div id="retail-worksheet-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                                </div>
                            </div>
                        </div>

                        <div class="panel-card">
                            <div class="panel-header">
                                <div class="panel-title-wrap">
                                    <span class="panel-icon panel-icon-alt">${icons.payment}</span>
                                    <div>
                                        <h3>Invoice Adjustments</h3>
                                        <p class="panel-copy">Shape the final invoice in a compact finance bar: discount first, then tax, then settlement totals.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-body">
                                <div class="retail-finance-bar">
                                    <section class="retail-finance-section">
                                        <div class="retail-finance-section-head">
                                            <p class="workspace-form-section-kicker">Discounting</p>
                                            <p class="panel-copy">Choose the discount method and apply either a percentage or a fixed invoice amount.</p>
                                        </div>
                                        <div class="retail-finance-fields retail-finance-fields-discount">
                                            <div class="field">
                                                <label for="retail-order-discount-type">Discount Type</label>
                                                <select id="retail-order-discount-type" class="select" ${financialDisabledAttr}>
                                                    ${renderDiscountTypeOptions(featureState.saleDraft.orderDiscountType)}
                                                </select>
                                            </div>
                                            <div class="field">
                                                <label for="retail-order-discount-percentage">Invoice Discount %</label>
                                                <input
                                                    id="retail-order-discount-percentage"
                                                    class="input"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    value="${featureState.saleDraft.orderDiscountPercentage}"
                                                    ${(featureState.saleDraft.orderDiscountType === "Percentage" && canEditFinancials) ? "" : "disabled"}>
                                            </div>
                                            <div class="field">
                                                <label for="retail-order-discount-amount">Invoice Discount Amount</label>
                                                <input
                                                    id="retail-order-discount-amount"
                                                    class="input"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value="${featureState.saleDraft.orderDiscountAmount}"
                                                    ${(featureState.saleDraft.orderDiscountType === "Fixed" && canEditFinancials) ? "" : "disabled"}>
                                            </div>
                                        </div>
                                        <div class="retail-finance-chip-row">
                                            <article class="retail-finance-chip">
                                                <span>Line Discount</span>
                                                <strong>${formatCurrency(summary.totalLineDiscount)}</strong>
                                            </article>
                                            <article class="retail-finance-chip">
                                                <span>Invoice Discount</span>
                                                <strong>${formatCurrency(summary.orderDiscountAmount)}</strong>
                                            </article>
                                        </div>
                                    </section>

                                    <section class="retail-finance-section">
                                        <div class="retail-finance-section-head">
                                            <p class="workspace-form-section-kicker">Tax</p>
                                            <p class="panel-copy">Product-level CGST and SGST flow in from the worksheet. Use invoice tax for any order-level adjustment.</p>
                                        </div>
                                        <div class="retail-finance-fields retail-finance-fields-tax">
                                            <div class="field">
                                                <label for="retail-order-tax-percentage">Invoice Tax %</label>
                                                <input
                                                    id="retail-order-tax-percentage"
                                                    class="input"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value="${featureState.saleDraft.orderTaxPercentage}" ${financialDisabledAttr}>
                                            </div>
                                        </div>
                                        <div class="retail-finance-chip-row">
                                            <article class="retail-finance-chip">
                                                <span>CGST</span>
                                                <strong>${formatCurrency(summary.totalCGST)}</strong>
                                            </article>
                                            <article class="retail-finance-chip">
                                                <span>SGST</span>
                                                <strong>${formatCurrency(summary.totalSGST)}</strong>
                                            </article>
                                            <article class="retail-finance-chip">
                                                <span>Item Tax</span>
                                                <strong>${formatCurrency(summary.totalItemLevelTax)}</strong>
                                            </article>
                                            <article class="retail-finance-chip">
                                                <span>Order Tax</span>
                                                <strong>${formatCurrency(summary.orderLevelTaxAmount)}</strong>
                                            </article>
                                        </div>
                                    </section>

                                    <aside class="retail-finance-totals">
                                        <div class="retail-finance-section-head">
                                            <p class="workspace-form-section-kicker">Totals</p>
                                            <p class="panel-copy">Review the final invoice picture before saving the sale.</p>
                                        </div>
                                        <div class="retail-finance-total-list">
                                            <div class="retail-finance-total-row">
                                                <span>Subtotal</span>
                                                <strong>${formatCurrency(summary.itemsSubtotal)}</strong>
                                            </div>
                                            <div class="retail-finance-total-row">
                                                <span>After Discounts</span>
                                                <strong>${formatCurrency(summary.finalTaxableAmount)}</strong>
                                            </div>
                                            <div class="retail-finance-total-row">
                                                <span>Total Tax</span>
                                                <strong>${formatCurrency(summary.totalTax)}</strong>
                                            </div>
                                            <div class="retail-finance-total-row">
                                                <span>Applied Payment</span>
                                                <strong>${formatCurrency(summary.appliedPayment)}</strong>
                                            </div>
                                            <div class="retail-finance-total-row retail-finance-total-row-strong">
                                                <span>Grand Total</span>
                                                <strong>${formatCurrency(summary.grandTotal)}</strong>
                                            </div>
                                            ${(isViewMode || isEditMode || isReturnMode) ? `
                                                <div class="retail-finance-total-row retail-finance-total-row-danger">
                                                    <span>Total Expense</span>
                                                    <strong>-${formatCurrency(workspaceTotalExpenses)}</strong>
                                                </div>
                                            ` : ""}
                                            ${isReturnMode ? `
                                                <div class="retail-finance-total-row retail-finance-total-row-danger">
                                                    <span>Return Value (Est.)</span>
                                                    <strong>-${formatCurrency(returnDraftSummary.totalAmount)}</strong>
                                                </div>
                                                <div class="retail-finance-total-row">
                                                    <span>Projected Grand Total</span>
                                                    <strong>${formatCurrency(projectedGrandTotal)}</strong>
                                                </div>
                                            ` : ""}
                                            <div class="retail-finance-total-row">
                                                <span>Balance Due</span>
                                                <strong>${formatCurrency(isReturnMode ? projectedBalanceDue : (isViewMode || isEditModeLimited) ? workspaceBalanceDue : summary.balanceDue)}</strong>
                                            </div>
                                        </div>
                                        <div class="retail-finance-status-row">
                                            <span class="summary-label">Payment Status</span>
                                            <span class="summary-value retail-summary-status">${paymentStatus}</span>
                                        </div>
                                    </aside>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button id="retail-reset-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            ${isViewMode ? "Close View" : isEditMode ? "Cancel Edit" : isReturnMode ? "Cancel Return" : "Reset"}
                        </button>
                        ${isViewMode ? `
                            <button id="retail-open-returns-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.warning}</span>
                                Returns
                            </button>
                            <button id="retail-open-payments-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.payment}</span>
                                Payments
                            </button>
                            <button id="retail-download-pdf-button" class="button button-primary-alt" type="button">
                                <span class="button-icon">${icons.download}</span>
                                Download PDF
                            </button>
                        ` : isReturnMode ? `
                            <button id="retail-return-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel Return
                            </button>
                            <button class="button button-primary-alt" type="submit">
                                <span class="button-icon">${icons.warning}</span>
                                Process Return
                            </button>
                        ` : `
                            <button class="button button-primary-alt" type="submit">
                                <span class="button-icon">${isEditMode ? icons.edit : icons.plus}</span>
                                ${isEditMode ? (isEditModeLimited ? "Save Limited Changes" : "Update Retail Sale") : "Save Retail Sale"}
                            </button>
                        `}
                    </div>
                </form>
            </div>
        </div>

        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.retail}</span>
                    <div>
                        <h3>Sales History</h3>
                        <p class="panel-copy">Review direct retail sales across stores, with invoice totals, payments received, and current balances.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span id="retail-history-visible-count" class="status-pill">${filteredHistoryCount} visible</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">History</p>
                        <p class="panel-copy">Use Edit for controlled sale updates, Return for product reversals, Payments for collections, and Expense for sale-linked cost adjustments.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="retail-sales-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search voucher, customer, store, or status"
                            value="${featureState.searchTerm}">
                    </div>
                </div>
                <div class="ag-shell">
                    <div id="retail-sales-grid" class="ag-theme-alpine moneta-grid" style="height: 520px; width: 100%;"></div>
                </div>
            </div>
        </div>
        ${renderRetailPaymentModal(snapshot)}
        ${renderRetailExpenseModal(expenseModalSale)}
    `;
}

function syncRetailWorksheetGrid() {
    const snapshot = getState();
    const gridElement = document.getElementById("retail-worksheet-grid");
    setRetailWorksheetMode(isRetailReturnMode() ? "return" : "standard");
    setRetailWorksheetReadOnly(isRetailWorksheetLockedMode());
    initializeRetailWorksheetGrid(gridElement, rows => {
        featureState.lineItemDrafts = Object.fromEntries(rows.map(row => [row.productId, {
            productName: row.productName || "",
            categoryId: row.categoryId || "",
            categoryName: row.categoryName || "",
            quantity: Number(row.quantity) || 0,
            returnQuantity: Number(row.returnQuantity) || 0,
            unitPrice: Number(row.unitPrice) || 0,
            lineDiscountPercentage: Number(row.lineDiscountPercentage) || 0,
            cgstPercentage: Number(row.cgstPercentage) || 0,
            sgstPercentage: Number(row.sgstPercentage) || 0,
            lineTotal: calculateWorksheetLineTotal(row)
        }]));
        renderRetailStoreView();
    });
    refreshRetailWorksheetGrid(buildRetailWorksheetRows(snapshot));
    updateRetailWorksheetGridSearch(featureState.worksheetSearchTerm);
}

function syncRetailSalesGrid() {
    const gridElement = document.getElementById("retail-sales-grid");
    initializeRetailSalesGrid(gridElement, count => {
        featureState.filteredSalesCount = count;
        const countBadge = document.getElementById("retail-history-visible-count");
        if (countBadge) {
            countBadge.textContent = `${count} visible`;
        }
    });
    refreshRetailSalesGrid(getSalesHistoryRows());
    updateRetailSalesGridSearch(featureState.searchTerm);
}

function syncRetailExpenseHistoryGrid() {
    if (!featureState.expenseModalOpen) return;

    const gridElement = document.getElementById("retail-expense-history-grid");
    if (!gridElement) return;

    initializeRetailExpenseHistoryGrid(gridElement);
    refreshRetailExpenseHistoryGrid(featureState.expenseHistory);

    const historyCount = document.getElementById("retail-expense-history-count");
    if (historyCount) {
        historyCount.textContent = `${featureState.expenseHistory.length} expense record(s) linked to this sale.`;
    }
}

function syncRetailPaymentHistoryGrid() {
    if (!featureState.paymentModalOpen) return;

    const gridElement = document.getElementById("retail-payment-history-grid");
    if (!gridElement) return;

    initializeRetailPaymentHistoryGrid(gridElement);
    refreshRetailPaymentHistoryGrid(featureState.payments);

    const historyCount = document.getElementById("retail-payment-history-count");
    if (historyCount) {
        historyCount.textContent = `${featureState.payments.length} payment record(s) linked to this sale.`;
    }
}

function ensureRetailSalesListener(snapshot) {
    if (!snapshot.currentUser || snapshot.currentRoute !== "#/retail-store") {
        featureState.unsubscribeSales?.();
        featureState.unsubscribeSales = null;
        featureState.sales = [];
        closeRetailPaymentModalState();
        closeRetailReturnModalState();
        closeRetailExpenseModalState();
        return;
    }

    if (featureState.unsubscribeSales) return;

    featureState.unsubscribeSales = subscribeToRetailSales(
        snapshot.currentUser,
        rows => {
            featureState.sales = rows;

            if (featureState.workspaceMode === "view" && featureState.viewingSaleId) {
                const viewingSale = rows.find(entry => entry.id === featureState.viewingSaleId) || null;
                if (!viewingSale) {
                    resetRetailWorkspace();
                    showToast("The sale you were viewing is no longer available.", "warning", {
                        title: "Retail Store"
                    });
                }
            }

            if (featureState.workspaceMode === "edit" && featureState.editingSaleId) {
                const editingSale = rows.find(entry => entry.id === featureState.editingSaleId) || null;
                if (!editingSale) {
                    resetRetailWorkspace();
                    showToast("The sale you were editing is no longer available.", "warning", {
                        title: "Retail Store"
                    });
                } else {
                    const latestScope = resolveRetailSaleEditScope(editingSale);
                    if (latestScope === "none") {
                        resetRetailWorkspace();
                        showToast("This sale was voided and can no longer be edited.", "warning", {
                            title: "Retail Store"
                        });
                    } else if (latestScope !== featureState.editModeScope) {
                        loadSaleIntoEditWorkspace(editingSale);
                        showToast(
                            latestScope === "limited"
                                ? "Edit scope changed to Limited because linked payment/expense data was added."
                                : "Edit scope changed to Full.",
                            "info",
                            { title: "Retail Store" }
                        );
                    }
                }
            }

            if (featureState.workspaceMode === "return" && featureState.returningSaleId) {
                const returnSale = rows.find(entry => entry.id === featureState.returningSaleId) || null;
                if (!returnSale || returnSale.saleStatus === "Voided") {
                    resetRetailWorkspace();
                    showToast("The selected sale is no longer available for returns.", "warning", {
                        title: "Retail Store"
                    });
                } else if ((Number(returnSale.lineItemCount) || (returnSale.lineItems || []).length || 0) <= 0) {
                    resetRetailWorkspace();
                    showToast("All products on this sale were already returned.", "info", {
                        title: "Retail Store"
                    });
                }
            }

            if (getState().currentRoute === "#/retail-store") {
                renderRetailStoreView();
            }
        },
        error => {
            console.error("[Moneta] Failed to load retail sales:", error);
            showToast("Could not load retail sales history.", "error", {
                title: "Retail Store"
            });
        }
    );
}

function ensureCatalogueItemsListener(snapshot) {
    const catalogueId = featureState.saleDraft.salesCatalogueId;
    const shouldListenToCatalogue = featureState.workspaceMode === "create"
        || (isRetailEditMode() && featureState.editModeScope === "full");

    if (!shouldListenToCatalogue) {
        clearCatalogueItemsSubscription();
        return;
    }

    if (!catalogueId || snapshot.currentRoute !== "#/retail-store") {
        clearCatalogueItemsSubscription();
        return;
    }

    if (featureState.catalogueItemsListenerId === catalogueId && featureState.unsubscribeCatalogueItems) return;

    clearCatalogueItemsSubscription();
    featureState.catalogueItemsListenerId = catalogueId;
    featureState.unsubscribeCatalogueItems = subscribeToRetailCatalogueItems(
        catalogueId,
        rows => {
            featureState.selectedCatalogueItems = rows;

            if (getState().currentRoute === "#/retail-store") {
                renderRetailStoreView();
            }
        },
        error => {
            console.error("[Moneta] Failed to load retail catalogue items:", error);
            showToast("Could not load products for the selected catalogue.", "error", {
                title: "Retail Store"
            });
        }
    );
}

function syncSaleTypeBehavior() {
    if (featureState.workspaceMode !== "create") return;
    if (featureState.saleDraft.saleType !== "Sample") return;

    featureState.saleDraft.paymentType = "Pay Later";
    featureState.saleDraft.paymentMode = "";
    featureState.saleDraft.amountReceived = "";
    featureState.saleDraft.transactionRef = "";
    featureState.saleDraft.paymentNotes = "";
    featureState.saleDraft.orderDiscountType = "Percentage";
    featureState.saleDraft.orderDiscountPercentage = "100";
    featureState.saleDraft.orderDiscountAmount = "";
}

export function renderRetailStoreView() {
    const snapshot = getState();
    syncSaleTypeBehavior();
    ensureRetailSalesListener(snapshot);
    ensureCatalogueItemsListener(snapshot);
    renderRetailStoreViewShell(snapshot);
    syncRetailWorksheetGrid();
    syncRetailSalesGrid();
    syncRetailPaymentHistoryGrid();
    syncRetailExpenseHistoryGrid();
    syncRetailPaymentDraftPreview();
    syncRetailReturnDraftPreview();
}

function updateDraftField(field, value) {
    featureState.saleDraft[field] = value;
}

function buildSaleDraftFromSale(sale) {
    return {
        saleDate: toDateInputValue(sale.saleDate),
        customerName: sale.customerInfo?.name || "",
        customerPhone: sale.customerInfo?.phone || "",
        customerEmail: sale.customerInfo?.email || "",
        customerAddress: sale.customerInfo?.address || "",
        manualVoucherNumber: sale.manualVoucherNumber || "",
        store: sale.store || "",
        saleType: sale.saleType || "Revenue",
        salesCatalogueId: sale.salesCatalogueId || "",
        paymentType: Number(sale.totalAmountPaid) > 0 ? "Pay Now" : "Pay Later",
        paymentMode: sale.latestPaymentMode || "",
        amountReceived: Number(sale.totalAmountPaid) > 0 ? String(Number(sale.totalAmountPaid) || 0) : "",
        transactionRef: "",
        paymentNotes: "",
        saleNotes: sale.saleNotes || "",
        orderDiscountType: sale.financials?.orderDiscountType || "Percentage",
        orderDiscountPercentage: sale.financials?.orderDiscountType === "Percentage"
            ? String(Number(sale.financials?.orderDiscountValue) || 0)
            : "",
        orderDiscountAmount: sale.financials?.orderDiscountType === "Fixed"
            ? String(Number(sale.financials?.orderDiscountValue) || 0)
            : "",
        orderTaxPercentage: String(Number(sale.financials?.orderTaxPercentage) || 0),
        editReason: ""
    };
}

function buildLineItemDraftsFromSale(sale) {
    return Object.fromEntries((sale.lineItems || []).map(item => [item.productId, {
        productName: item.productName || "",
        categoryId: item.categoryId || "",
        categoryName: item.categoryName || "",
        quantity: Number(item.quantity) || 0,
        returnQuantity: 0,
        unitPrice: Number(item.unitPrice) || 0,
        lineDiscountPercentage: Number(item.lineDiscountPercentage) || 0,
        cgstPercentage: Number(item.cgstPercentage) || 0,
        sgstPercentage: Number(item.sgstPercentage) || 0,
        lineTotal: Number(item.lineTotal) || 0
    }]));
}

function loadSaleIntoViewWorkspace(sale) {
    closeRetailPaymentModalState();
    closeRetailReturnModalState();
    closeRetailExpenseModalState();
    featureState.workspaceMode = "view";
    featureState.viewingSaleId = sale.id;
    featureState.editingSaleId = null;
    featureState.returningSaleId = null;
    featureState.editModeScope = null;
    featureState.saleDraft = buildSaleDraftFromSale(sale);
    featureState.lineItemDrafts = buildLineItemDraftsFromSale(sale);
    featureState.selectedCatalogueItems = [];
    clearCatalogueItemsSubscription();
}

function loadSaleIntoEditWorkspace(sale) {
    const editScope = resolveRetailSaleEditScope(sale);

    if (editScope === "none") {
        showToast("Voided retail sales cannot be edited.", "error", {
            title: "Retail Store"
        });
        return false;
    }

    closeRetailPaymentModalState();
    closeRetailReturnModalState();
    closeRetailExpenseModalState();
    featureState.workspaceMode = "edit";
    featureState.viewingSaleId = null;
    featureState.editingSaleId = sale.id;
    featureState.returningSaleId = null;
    featureState.editModeScope = editScope;
    featureState.saleDraft = buildSaleDraftFromSale(sale);
    featureState.lineItemDrafts = buildLineItemDraftsFromSale(sale);
    featureState.selectedCatalogueItems = [];
    clearCatalogueItemsSubscription();
    return true;
}

function loadSaleIntoReturnWorkspace(sale) {
    if (!sale?.id) return false;

    if ((sale.saleStatus || "") === "Voided") {
        showToast("Voided sales cannot accept returns.", "error", {
            title: "Retail Store"
        });
        return false;
    }

    if ((Number(sale.lineItemCount) || (sale.lineItems || []).length || 0) <= 0) {
        showToast("There are no remaining products on this sale to return.", "warning", {
            title: "Retail Store"
        });
        return false;
    }

    closeRetailPaymentModalState();
    closeRetailReturnModalState();
    closeRetailExpenseModalState();

    featureState.workspaceMode = "return";
    featureState.viewingSaleId = null;
    featureState.editingSaleId = null;
    featureState.returningSaleId = sale.id;
    featureState.editModeScope = null;
    featureState.saleDraft = buildSaleDraftFromSale(sale);
    featureState.lineItemDrafts = buildLineItemDraftsFromSale(sale);
    featureState.returnDraft = createDefaultRetailReturnDraft(sale.saleDate?.toDate ? sale.saleDate.toDate() : sale.saleDate || new Date());
    featureState.selectedCatalogueItems = [];
    clearCatalogueItemsSubscription();
    return true;
}

function handleRetailInput(target) {
    const fieldMap = {
        "retail-sale-date": "saleDate",
        "retail-voucher-number": "manualVoucherNumber",
        "retail-customer-name": "customerName",
        "retail-customer-phone": "customerPhone",
        "retail-customer-email": "customerEmail",
        "retail-customer-address": "customerAddress",
        "retail-amount-received": "amountReceived",
        "retail-transaction-ref": "transactionRef",
        "retail-payment-notes": "paymentNotes",
        "retail-sale-notes": "saleNotes",
        "retail-edit-reason": "editReason",
        "retail-order-discount-percentage": "orderDiscountPercentage",
        "retail-order-discount-amount": "orderDiscountAmount",
        "retail-order-tax-percentage": "orderTaxPercentage",
        "retail-payment-entry-date": "paymentDate",
        "retail-payment-entry-amount": "amountPaid",
        "retail-payment-entry-mode": "paymentMode",
        "retail-payment-entry-reference": "transactionRef",
        "retail-payment-entry-notes": "notes",
        "retail-return-date": "returnDate",
        "retail-return-reason": "reason",
        "retail-expense-date": "expenseDate",
        "retail-expense-justification": "justification",
        "retail-expense-amount": "amount"
    };

    if (target.id === "retail-sales-search") {
        featureState.searchTerm = target.value || "";
        updateRetailSalesGridSearch(featureState.searchTerm);
        return;
    }

    if (target.id === "retail-worksheet-search") {
        featureState.worksheetSearchTerm = target.value || "";
        updateRetailWorksheetGridSearch(featureState.worksheetSearchTerm);
        return;
    }

    if (target.id.startsWith("retail-return-qty-")) {
        const productId = target.dataset.productId || target.id.replace("retail-return-qty-", "");
        if (!productId) return;
        featureState.lineItemDrafts[productId] = {
            ...(featureState.lineItemDrafts[productId] || {}),
            returnQuantity: target.value || ""
        };
        syncRetailReturnDraftPreview();
        return;
    }

    const field = fieldMap[target.id];
    if (!field) return;

    if (target.id.startsWith("retail-payment-entry-")) {
        featureState.paymentDraft[field] = target.value || "";
        if (target.id === "retail-payment-entry-amount") {
            syncRetailPaymentDraftPreview();
        }
        return;
    }

    if (target.id.startsWith("retail-expense-")) {
        featureState.expenseDraft[field] = target.value || "";
        return;
    }

    if (target.id.startsWith("retail-return-")) {
        featureState.returnDraft[field] = target.value || "";
        return;
    }

    updateDraftField(field, target.value || "");
}

function handleRetailChange(target) {
    switch (target.id) {
        case "retail-store":
            updateDraftField("store", target.value || "");
            applyStoreTaxDefaultsToLineItemDrafts(target.value || "");
            renderRetailStoreView();
            return;
        case "retail-sale-type":
            updateDraftField("saleType", target.value || "Revenue");
            syncSaleTypeBehavior();
            renderRetailStoreView();
            return;
        case "retail-sales-catalogue":
            updateDraftField("salesCatalogueId", target.value || "");
            featureState.lineItemDrafts = {};
            clearCatalogueItemsSubscription();
            renderRetailStoreView();
            return;
        case "retail-payment-type":
            updateDraftField("paymentType", target.value || "Pay Later");
            if (target.value !== "Pay Now") {
                featureState.saleDraft.paymentMode = "";
                featureState.saleDraft.amountReceived = "";
                featureState.saleDraft.transactionRef = "";
                featureState.saleDraft.paymentNotes = "";
            }
            renderRetailStoreView();
            return;
        case "retail-payment-mode":
            updateDraftField("paymentMode", target.value || "");
            return;
        case "retail-amount-received":
            updateDraftField("amountReceived", target.value || "");
            renderRetailStoreView();
            return;
        case "retail-order-discount-type":
            updateDraftField("orderDiscountType", target.value || "Percentage");
            if (featureState.saleDraft.orderDiscountType === "Fixed") {
                featureState.saleDraft.orderDiscountPercentage = "";
            } else {
                featureState.saleDraft.orderDiscountAmount = "";
            }
            renderRetailStoreView();
            return;
        case "retail-order-discount-percentage":
            updateDraftField("orderDiscountPercentage", target.value || "");
            renderRetailStoreView();
            return;
        case "retail-order-discount-amount":
            updateDraftField("orderDiscountAmount", target.value || "");
            renderRetailStoreView();
            return;
        case "retail-order-tax-percentage":
            updateDraftField("orderTaxPercentage", target.value || "");
            renderRetailStoreView();
            return;
        case "retail-payment-entry-date":
            featureState.paymentDraft.paymentDate = target.value || "";
            return;
        case "retail-payment-entry-mode":
            featureState.paymentDraft.paymentMode = target.value || "";
            return;
        case "retail-payment-entry-reference":
            featureState.paymentDraft.transactionRef = target.value || "";
            return;
        case "retail-payment-entry-notes":
            featureState.paymentDraft.notes = target.value || "";
            return;
        case "retail-payment-entry-amount":
            featureState.paymentDraft.amountPaid = target.value || "";
            syncRetailPaymentDraftPreview();
            return;
        case "retail-expense-date":
            featureState.expenseDraft.expenseDate = target.value || "";
            return;
        case "retail-expense-justification":
            featureState.expenseDraft.justification = target.value || "";
            return;
        case "retail-expense-amount":
            featureState.expenseDraft.amount = target.value || "";
            return;
        case "retail-return-date":
            featureState.returnDraft.returnDate = target.value || "";
            return;
        case "retail-return-reason":
            featureState.returnDraft.reason = target.value || "";
            return;
        default:
            if (target.id?.startsWith("retail-return-qty-")) {
                const productId = target.dataset.productId || target.id.replace("retail-return-qty-", "");
                if (!productId) return;
                featureState.lineItemDrafts[productId] = {
                    ...(featureState.lineItemDrafts[productId] || {}),
                    returnQuantity: target.value || ""
                };
                syncRetailReturnDraftPreview();
            }
            break;
    }
}

async function handleRetailSaleSubmit(event) {
    event.preventDefault();

    try {
        const snapshot = getState();
        const isEditMode = featureState.workspaceMode === "edit";
        const isReturnMode = featureState.workspaceMode === "return";
        const returningSale = isReturnMode
            ? featureState.sales.find(entry => entry.id === featureState.returningSaleId) || null
            : null;
        const customerName = normalizeText(featureState.saleDraft.customerName) || "-";
        const selectedStore = normalizeText(featureState.saleDraft.store) || "-";
        const selectedCatalogueLabel = snapshot.masterData.salesCatalogues
            ?.find(catalogue => catalogue.id === featureState.saleDraft.salesCatalogueId)?.catalogueName || "-";
        const editingSale = isEditMode
            ? featureState.sales.find(entry => entry.id === featureState.editingSaleId) || null
            : null;

        if (isReturnMode && !returningSale) {
            throw new Error("The retail sale selected for return could not be found. Refresh and try again.");
        }

        if (isEditMode && !editingSale) {
            throw new Error("The retail sale being edited could not be found. Refresh and try again.");
        }

        if (isReturnMode) {
            const draftSummary = calculateRetailReturnDraftSummary(returningSale);
            const result = await runProgressToastFlow({
                title: "Processing Product Return",
                initialMessage: "Reading current sale and return worksheet...",
                initialProgress: 18,
                initialStep: "Step 1 of 4",
                successTitle: "Return Processed",
                successMessage: "The product return was recorded successfully."
            }, async ({ update }) => {
                update("Validating return reason, product quantities, and inventory impact...", 42, "Step 2 of 4");
                update("Writing return record, restoring stock, and recalculating sale totals...", 78, "Step 3 of 4");

                const result = await addRetailSaleReturn(
                    returningSale,
                    {
                        returnDate: featureState.returnDraft.returnDate,
                        reason: featureState.returnDraft.reason,
                        items: draftSummary.selectedItems
                    },
                    snapshot.currentUser
                );

                update("Refreshing retail history and workspace totals...", 95, "Step 4 of 4");
                resetRetailWorkspace();
                renderRetailStoreView();
                return result;
            });

            showToast("Product return processed.", "success", {
                title: "Retail Store"
            });
            ProgressToast.hide(0);
            await showSummaryModal({
                title: "Retail Return Processed",
                message: "The selected return quantities were posted and inventory was restored.",
                details: [
                    { label: "Sale", value: returningSale.saleId || returningSale.manualVoucherNumber || "-" },
                    { label: "Returned Quantity", value: String(result.summary.returnedQuantity || 0) },
                    { label: "Return Value", value: formatCurrency(result.summary.returnedAmount || 0) },
                    { label: "Next Grand Total", value: formatCurrency(result.summary.nextGrandTotal || 0) },
                    { label: "Balance Due", value: formatCurrency(result.summary.nextBalanceDue || 0) },
                    { label: "Credit Balance", value: formatCurrency(result.summary.creditBalance || 0) }
                ]
            });
            return;
        }

        const result = await runProgressToastFlow({
            title: isEditMode ? "Updating Retail Sale" : "Saving Retail Sale",
            initialMessage: isEditMode ? "Reading the selected sale and edit workspace..." : "Reading the retail workspace...",
            initialProgress: 14,
            initialStep: "Step 1 of 5",
            successTitle: isEditMode ? "Retail Sale Updated" : "Retail Sale Saved",
            successMessage: isEditMode
                ? "The retail sale update was saved successfully."
                : "The retail sale was saved successfully."
        }, async ({ update }) => {
            update(
                isEditMode
                    ? "Validating allowed edit scope, customer details, and update payload..."
                    : "Validating the customer, catalogue, product worksheet, and settlement details...",
                34,
                "Step 2 of 5"
            );

            update(
                isEditMode
                    ? "Writing sale updates and applying any inventory deltas..."
                    : "Writing the sale and payment data to the database...",
                74,
                "Step 3 of 5"
            );

            const result = isEditMode
                ? await saveRetailSaleUpdate(
                    editingSale,
                    {
                        ...featureState.saleDraft,
                        editScope: featureState.editModeScope || "limited",
                        lineItems: buildRetailWorksheetRows(snapshot)
                    },
                    snapshot.currentUser,
                    featureState.selectedCatalogueItems
                )
                : await saveRetailSale(
                    {
                        ...featureState.saleDraft,
                        lineItems: buildRetailWorksheetRows(snapshot)
                    },
                    snapshot.currentUser,
                    snapshot.masterData.salesCatalogues,
                    featureState.selectedCatalogueItems
                );

            update("Refreshing retail history and inventory-aware worksheet context...", 90, "Step 4 of 5");
            resetRetailWorkspace();
            renderRetailStoreView();
            update("Retail history is up to date.", 96, "Step 5 of 5");
            return result;
        });

        showToast(isEditMode ? "Retail sale updated." : "Retail sale saved.", "success", {
            title: "Retail Store"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: isEditMode ? "Retail Sale Updated" : "Retail Sale Saved",
            message: isEditMode
                ? "The sale update was completed successfully with the configured edit safeguards."
                : "The direct sale has been recorded successfully.",
            details: [
                { label: "Customer", value: customerName },
                { label: "Store", value: selectedStore },
                { label: "Catalogue", value: selectedCatalogueLabel },
                { label: "Payment Status", value: result.summary.paymentStatus },
                { label: "Grand Total", value: formatCurrency(result.summary.grandTotal) },
                { label: "Edit Scope", value: isEditMode ? (result.summary.editScope || featureState.editModeScope || "limited") : "New Sale" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Retail sale save/update failed:", error);
        ProgressToast.hide(0);
        showToast(error?.message || "Could not save the retail sale.", "error", {
            title: "Retail Store"
        });
    }
}

function handleRetailReset() {
    resetRetailWorkspace();
    renderRetailStoreView();
}

async function handleRetailSaleView(button) {
    const saleId = button.dataset.saleId || "";
    const sale = featureState.sales.find(entry => entry.id === saleId) || null;
    if (!sale) return;

    loadSaleIntoViewWorkspace(sale);
    renderRetailStoreView();
    document.getElementById("retail-store-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleRetailSaleEdit(button) {
    const saleId = button.dataset.saleId || "";
    const sale = featureState.sales.find(entry => entry.id === saleId) || null;
    if (!sale) return;

    if (!loadSaleIntoEditWorkspace(sale)) return;

    renderRetailStoreView();
    if (featureState.editModeScope === "limited") {
        showToast("Limited edit mode enabled due to linked payments, expenses, or returns. Only customer details and sale notes can be changed.", "info", {
            title: "Retail Store"
        });
    }

    document.getElementById("retail-store-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    const focusTarget = featureState.editModeScope === "full"
        ? document.getElementById("retail-voucher-number")
        : document.getElementById("retail-customer-phone");
    focusTarget?.focus();
}

function handleRetailSalePayments(button) {
    const saleId = button.dataset.saleId || "";
    const sale = featureState.sales.find(entry => entry.id === saleId) || null;
    if (!sale) return;

    openRetailPaymentModal(sale);
    renderRetailStoreView();
    document.getElementById("retail-payment-entry-amount")?.focus();
}

function handleRetailSaleReturn(button) {
    const saleId = button.dataset.saleId || "";
    const sale = featureState.sales.find(entry => entry.id === saleId) || null;
    if (!sale) return;

    if (!loadSaleIntoReturnWorkspace(sale)) return;

    renderRetailStoreView();
    document.getElementById("retail-store-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("retail-return-reason")?.focus();
}

async function handleRetailPaymentSubmit(event) {
    event.preventDefault();

    const snapshot = getState();
    const sale = getPaymentModalSale();

    if (!sale) {
        showToast("The selected sale could not be found. Reopen the payment modal and try again.", "error", {
            title: "Retail Store"
        });
        closeRetailPaymentModal();
        return;
    }

    try {
        const result = await runProgressToastFlow({
            title: "Recording Retail Payment",
            initialMessage: "Reading sale and payment draft details...",
            initialProgress: 18,
            initialStep: "Step 1 of 4",
            successTitle: "Payment Recorded",
            successMessage: "The retail payment was recorded successfully."
        }, async ({ update }) => {
            update("Validating payment date, mode, reference, and outstanding balance...", 42, "Step 2 of 4");
            update("Writing payment entry and updating sale balance...", 76, "Step 3 of 4");
            const result = await saveRetailSalePayment(featureState.paymentDraft, sale, snapshot.masterData, snapshot.currentUser);
            update("Refreshing sales history and payment ledger view...", 95, "Step 4 of 4");
            return result;
        });

        closeRetailPaymentModalState();
        renderRetailStoreView();

        showToast("Retail payment recorded.", "success", {
            title: "Retail Store"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Retail Payment Recorded",
            message: "The payment was linked to the sale and the customer balance was updated.",
            details: [
                { label: "Sale", value: sale.saleId || sale.manualVoucherNumber || "-" },
                { label: "Amount", value: formatCurrency(result.summary.paymentAmount) },
                { label: "Payment Status", value: result.summary.nextPaymentStatus || "-" },
                { label: "Balance Due", value: formatCurrency(result.summary.nextBalanceDue) }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Retail payment save failed:", error);
        ProgressToast.hide(0);
        showToast(error?.message || "Could not record the retail payment.", "error", {
            title: "Retail Store"
        });
    }
}

async function handleRetailSalePdf(button) {
    const saleId = button.dataset.saleId || "";
    const sale = featureState.sales.find(entry => entry.id === saleId) || null;
    if (!sale) return;

    try {
        await runProgressToastFlow({
            title: "Preparing PDF Invoice",
            initialMessage: "Reading the sale record...",
            initialProgress: 18,
            initialStep: "Step 1 of 4",
            successTitle: "PDF Ready",
            successMessage: "The invoice PDF was generated successfully."
        }, async ({ update }) => {
            update("Loading linked payment details...", 42, "Step 2 of 4");
            const payments = await getRetailSalePayments(sale.id);

            update("Rendering the invoice layout...", 74, "Step 3 of 4");
            await downloadRetailSalePdf(sale, payments[0] || null);

            update("Download started successfully.", 96, "Step 4 of 4");
        });

        showToast("Invoice PDF download started.", "success", {
            title: "Retail Store"
        });
        ProgressToast.hide(0);
    } catch (error) {
        console.error("[Moneta] Retail sale PDF generation failed:", error);
        ProgressToast.hide(0);
        showToast(error?.message || "Could not generate the invoice PDF.", "error", {
            title: "Retail Store"
        });
    }
}

function handleRetailSaleExpense(button) {
    const saleId = button.dataset.saleId || "";
    const sale = featureState.sales.find(entry => entry.id === saleId) || null;
    if (!sale) return;

    openRetailExpenseModal(sale);
    renderRetailStoreView();
    document.getElementById("retail-expense-justification")?.focus();
}

async function handleRetailExpenseSubmit(event) {
    event.preventDefault();

    const snapshot = getState();
    const sale = featureState.sales.find(entry => entry.id === featureState.expenseSaleId) || null;
    if (!sale) {
        showToast("The selected sale could not be found. Reopen the expense modal and try again.", "error", {
            title: "Retail Store"
        });
        closeRetailExpenseModal();
        return;
    }

    try {
        const result = await runProgressToastFlow({
            title: "Saving Sale Expense",
            initialMessage: "Reading the selected retail sale...",
            initialProgress: 18,
            initialStep: "Step 1 of 4",
            successTitle: "Expense Added",
            successMessage: "The sale expense was recorded successfully."
        }, async ({ update }) => {
            update("Validating expense date, justification, and amount...", 42, "Step 2 of 4");

            update("Writing expense entry and updating sale balance...", 76, "Step 3 of 4");
            const result = await addRetailSaleExpense(sale, featureState.expenseDraft, snapshot.currentUser);

            update("Refreshing sale history and linked expense records...", 95, "Step 4 of 4");
            return result;
        });

        closeRetailExpenseModalState();
        featureState.expenseDraft = createDefaultExpenseDraft(sale.saleDate?.toDate ? sale.saleDate.toDate() : sale.saleDate || new Date());
        renderRetailStoreView();

        showToast("Sale expense added.", "success", {
            title: "Retail Store"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Sale Expense Recorded",
            message: "The expense has been linked to the sale and financial totals were updated.",
            details: [
                { label: "Sale", value: sale.saleId || sale.manualVoucherNumber || "-" },
                { label: "Expense Amount", value: formatCurrency(result.summary.expenseAmount) },
                { label: "Total Expenses", value: formatCurrency(result.summary.nextTotalExpenses) },
                { label: "Balance Due", value: formatCurrency(result.summary.nextBalanceDue) }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Retail expense save failed:", error);
        ProgressToast.hide(0);
        showToast(error?.message || "Could not add the sale expense.", "error", {
            title: "Retail Store"
        });
    }
}

function bindRetailStoreDomEvents() {
    const root = document.getElementById("retail-store-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("input", event => {
        handleRetailInput(event.target);
    });

    root.addEventListener("change", event => {
        handleRetailChange(event.target);
    });

    root.addEventListener("submit", event => {
        if (event.target.closest("#retail-store-form")) {
            handleRetailSaleSubmit(event);
            return;
        }

        if (event.target.closest("#retail-payment-form")) {
            handleRetailPaymentSubmit(event);
            return;
        }

        if (event.target.closest("#retail-expense-form")) {
            handleRetailExpenseSubmit(event);
        }
    });

    root.addEventListener("click", event => {
        const targetElement = event.target instanceof Element
            ? event.target
            : event.target?.parentElement;
        if (!targetElement) return;

        const resetButton = targetElement.closest("#retail-reset-button");
        const editButton = targetElement.closest(".retail-sale-edit-button");
        const returnButton = targetElement.closest(".retail-sale-return-button");
        const paymentsButton = targetElement.closest(".retail-sale-payments-button");
        const viewButton = targetElement.closest(".retail-sale-view-button");
        const expenseButton = targetElement.closest(".retail-sale-expense-button");
        const pdfButton = targetElement.closest(".retail-sale-pdf-button");
        const viewModeReturnsButton = targetElement.closest("#retail-open-returns-button");
        const viewModePaymentsButton = targetElement.closest("#retail-open-payments-button");
        const workspacePdfButton = targetElement.closest("#retail-download-pdf-button");
        const paymentCancelButton = targetElement.closest("#retail-payment-cancel-button") || targetElement.closest(".retail-payment-close-trigger");
        const paymentModalBackdrop = targetElement.closest("#retail-payment-modal");
        const returnCancelButton = targetElement.closest("#retail-return-cancel-button");
        const expenseCancelButton = targetElement.closest("#retail-expense-cancel-button") || targetElement.closest(".retail-expense-close-trigger");
        const expenseModalBackdrop = targetElement.closest("#retail-expense-modal");

        if (resetButton) {
            handleRetailReset();
            return;
        }

        if (viewButton) {
            handleRetailSaleView(viewButton);
            return;
        }

        if (editButton) {
            handleRetailSaleEdit(editButton);
            return;
        }

        if (returnButton) {
            handleRetailSaleReturn(returnButton);
            return;
        }

        if (paymentsButton) {
            handleRetailSalePayments(paymentsButton);
            return;
        }

        if (expenseButton) {
            handleRetailSaleExpense(expenseButton);
            return;
        }

        if (pdfButton) {
            handleRetailSalePdf(pdfButton);
            return;
        }

        if (viewModeReturnsButton && featureState.viewingSaleId) {
            handleRetailSaleReturn({ dataset: { saleId: featureState.viewingSaleId } });
            return;
        }

        if (viewModePaymentsButton && featureState.viewingSaleId) {
            handleRetailSalePayments({ dataset: { saleId: featureState.viewingSaleId } });
            return;
        }

        if (workspacePdfButton && featureState.viewingSaleId) {
            handleRetailSalePdf({ dataset: { saleId: featureState.viewingSaleId } });
            return;
        }

        if (paymentCancelButton) {
            closeRetailPaymentModal();
            return;
        }

        if (targetElement.id === "retail-payment-modal" && paymentModalBackdrop) {
            closeRetailPaymentModal();
            return;
        }

        if (returnCancelButton) {
            closeRetailReturnModal();
            return;
        }

        if (expenseCancelButton) {
            closeRetailExpenseModal();
            return;
        }

        if (targetElement.id === "retail-expense-modal" && expenseModalBackdrop) {
            closeRetailExpenseModal();
        }
    });

    root.dataset.bound = "true";
}

export function initializeRetailStoreFeature() {
    subscribe(snapshot => {
        ensureRetailSalesListener(snapshot);
        ensureCatalogueItemsListener(snapshot);

        if (snapshot.currentRoute === "#/retail-store") {
            renderRetailStoreView();
            bindRetailStoreDomEvents();
        }
    });
}
