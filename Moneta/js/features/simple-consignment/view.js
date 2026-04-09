import { getState, subscribe } from "../../app/store.js";
import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import {
    getSimpleConsignmentWorksheetRows,
    initializeSimpleConsignmentOrdersGrid,
    initializeSimpleConsignmentTransactionsGrid,
    initializeSimpleConsignmentWorksheetGrid,
    refreshSimpleConsignmentOrdersGrid,
    refreshSimpleConsignmentTransactionsGrid,
    refreshSimpleConsignmentWorksheetGrid,
    setSimpleConsignmentTransactionsVoidEnabled,
    setSimpleConsignmentWorksheetMode,
    setSimpleConsignmentWorksheetReadOnly,
    updateSimpleConsignmentOrdersGridSearch,
    updateSimpleConsignmentTransactionsGridSearch,
    updateSimpleConsignmentWorksheetGridSearch
} from "./grid.js";
import {
    fetchSimpleConsignmentCatalogueItems,
    getSimpleConsignmentOrderById,
    subscribeToSimpleConsignmentOrders,
    subscribeToSimpleConsignmentTransactions
} from "./repository.js";
import {
    addSimpleConsignmentTransaction,
    cancelSimpleConsignmentOrderEntry,
    finalizeSimpleConsignmentOrder,
    saveSimpleConsignmentCheckout,
    saveSimpleConsignmentSettlement,
    voidSimpleConsignmentTransactionEntry
} from "./service.js";

const featureState = {
    orders: [],
    transactions: [],
    workspaceMode: "create",
    activeOrderId: null,
    selectedCatalogueId: "",
    catalogueItemRows: [],
    ordersSearchTerm: "",
    worksheetSearchTerm: "",
    transactionsSearchTerm: "",
    filteredOrderCount: 0,
    unsubscribeOrders: null,
    unsubscribeTransactions: null,
    transactionsOrderId: null,
    cancelReason: "",
    checkoutDraft: createDefaultCheckoutDraft(),
    transactionDraft: createDefaultTransactionDraft()
};

function createDefaultCheckoutDraft(defaultDate = new Date()) {
    return {
        checkoutDate: toDateInputValue(defaultDate),
        manualVoucherNumber: "",
        teamName: "",
        teamMemberName: "",
        memberPhone: "",
        memberEmail: "",
        venue: "",
        salesCatalogueId: ""
    };
}

function createDefaultTransactionDraft(defaultDate = new Date()) {
    return {
        transactionDate: toDateInputValue(defaultDate),
        paymentType: "Payment",
        paymentMode: "",
        amountApplied: "",
        reference: "",
        contact: "",
        notes: ""
    };
}

function normalizeText(value) {
    return (value || "").trim();
}

function resolveCategoryDisplay(snapshot, sourceItem = {}, product = null) {
    const categories = snapshot?.masterData?.categories || [];

    const rawCategoryId = normalizeText(sourceItem.categoryId)
        || normalizeText(sourceItem.category)
        || normalizeText(product?.categoryId)
        || normalizeText(product?.category);
    const categoryFromMaster = categories.find(category => category.id === rawCategoryId);
    const rawCategoryName = normalizeText(sourceItem.categoryName)
        || normalizeText(product?.categoryName)
        || normalizeText(categoryFromMaster?.categoryName);

    const categoryName = rawCategoryName || rawCategoryId || "-";

    return {
        categoryId: rawCategoryId,
        categoryName
    };
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

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

const SETTLEMENT_TRACKED_FIELDS = [
    { key: "quantitySold", label: "Sold" },
    { key: "quantityReturned", label: "Returned" },
    { key: "quantityDamaged", label: "Damaged" },
    { key: "quantityGifted", label: "Gifted" }
];

const ORDER_CONTEXT_TRACKED_FIELDS = [
    "manualVoucherNumber",
    "teamName",
    "teamMemberName",
    "memberPhone",
    "memberEmail",
    "venue"
];

function toWholeNumber(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
}

function formatSignedInteger(value) {
    const normalized = Math.trunc(Number(value) || 0);
    if (normalized === 0) return "0";
    return normalized > 0 ? `+${normalized}` : `${normalized}`;
}

function formatSignedCurrency(value) {
    const normalized = roundCurrency(value);
    if (normalized === 0) {
        return formatCurrency(0);
    }

    const prefix = normalized > 0 ? "+" : "-";
    return `${prefix}${formatCurrency(Math.abs(normalized))}`;
}

function buildPersistedSettlementRows(order) {
    return (order?.items || []).map(item => ({
        productId: item.productId,
        productName: item.productName || "Untitled Product",
        sellingPrice: Number(item.sellingPrice) || 0,
        quantityCheckedOut: toWholeNumber(item.quantityCheckedOut),
        quantitySold: toWholeNumber(item.quantitySold),
        quantityReturned: toWholeNumber(item.quantityReturned),
        quantityDamaged: toWholeNumber(item.quantityDamaged),
        quantityGifted: toWholeNumber(item.quantityGifted)
    }));
}

function buildSettlementDeltaSummary(order, nextRows = []) {
    const previousRows = buildPersistedSettlementRows(order);
    const previousMap = new Map(previousRows.map(row => [row.productId, row]));
    const nextMap = new Map((nextRows || []).map(row => [row.productId, row]));
    const productIds = Array.from(new Set([...previousMap.keys(), ...nextMap.keys()]));
    const lineChanges = [];

    productIds.forEach(productId => {
        const previous = previousMap.get(productId) || {};
        const next = nextMap.get(productId) || {};
        const fieldChanges = [];

        SETTLEMENT_TRACKED_FIELDS.forEach(field => {
            const before = toWholeNumber(previous[field.key]);
            const after = toWholeNumber(next[field.key]);
            const delta = after - before;
            if (delta !== 0) {
                fieldChanges.push(`${field.label} ${before} -> ${after} (${formatSignedInteger(delta)})`);
            }
        });

        if (fieldChanges.length > 0) {
            lineChanges.push({
                productName: next.productName || previous.productName || productId || "Product",
                changeCopy: fieldChanges.join(", ")
            });
        }
    });

    lineChanges.sort((left, right) => left.productName.localeCompare(right.productName));

    const previousMetrics = computeWorksheetMetrics(previousRows);
    const nextMetrics = computeWorksheetMetrics(nextRows || []);
    const paid = Number(order?.totalAmountPaid) || 0;
    const expenses = Number(order?.totalExpenses) || 0;
    const previousBalanceDue = roundCurrency(previousMetrics.totalValueSold - paid - expenses);
    const nextBalanceDue = roundCurrency(nextMetrics.totalValueSold - paid - expenses);

    return {
        lineChanges,
        lineChangeCount: lineChanges.length,
        impact: {
            soldValueDelta: roundCurrency(nextMetrics.totalValueSold - previousMetrics.totalValueSold),
            returnedValueDelta: roundCurrency(nextMetrics.totalValueReturned - previousMetrics.totalValueReturned),
            damagedValueDelta: roundCurrency(nextMetrics.totalValueDamaged - previousMetrics.totalValueDamaged),
            giftedValueDelta: roundCurrency(nextMetrics.totalValueGifted - previousMetrics.totalValueGifted),
            onHandValueDelta: roundCurrency(nextMetrics.totalValueOnHand - previousMetrics.totalValueOnHand),
            onHandQuantityDelta: Math.trunc((Number(nextMetrics.totalOnHandQuantity) || 0) - (Number(previousMetrics.totalOnHandQuantity) || 0)),
            balanceDueDelta: roundCurrency(nextBalanceDue - previousBalanceDue)
        }
    };
}

function hasOrderContextUpdated(order, contextPayload = {}) {
    return ORDER_CONTEXT_TRACKED_FIELDS.some(field => (
        normalizeText(order?.[field]) !== normalizeText(contextPayload?.[field])
    ));
}

function getActiveOrder() {
    if (!featureState.activeOrderId) return null;
    return featureState.orders.find(order => order.id === featureState.activeOrderId) || null;
}

function isCreateMode() {
    return featureState.workspaceMode === "create";
}

function isSettleMode() {
    return featureState.workspaceMode === "settle";
}

function isViewMode() {
    return featureState.workspaceMode === "view";
}

function isCancelMode() {
    return featureState.workspaceMode === "cancel";
}

function resetWorkspaceToCreate() {
    featureState.workspaceMode = "create";
    featureState.activeOrderId = null;
    featureState.cancelReason = "";
    featureState.checkoutDraft = createDefaultCheckoutDraft();
    featureState.transactionDraft = createDefaultTransactionDraft();
    featureState.selectedCatalogueId = "";
    featureState.catalogueItemRows = [];
    detachTransactionsListener();
}

function detachTransactionsListener(options = {}) {
    const { clearRows = true } = options;

    featureState.unsubscribeTransactions?.();
    featureState.unsubscribeTransactions = null;
    featureState.transactionsOrderId = null;

    if (clearRows) {
        featureState.transactions = [];
    }
}

function detachOrdersListener(options = {}) {
    const { clearRows = false } = options;

    featureState.unsubscribeOrders?.();
    featureState.unsubscribeOrders = null;

    if (clearRows) {
        featureState.orders = [];
        resetWorkspaceToCreate();
    }
}

function resolveCatalogueOptions(snapshot, currentValue) {
    return (snapshot.masterData.salesCatalogues || [])
        .filter(catalogue => catalogue.isActive || catalogue.id === currentValue)
        .map(catalogue => `
            <option value="${catalogue.id}" ${catalogue.id === currentValue ? "selected" : ""}>
                ${catalogue.catalogueName || "-"} ${catalogue.seasonName ? `(${catalogue.seasonName})` : ""}
            </option>
        `).join("");
}

function resolvePaymentModeOptions(snapshot, currentValue) {
    return (snapshot.masterData.paymentModes || [])
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

function buildConsignmentOrderGridRows() {
    return (featureState.orders || []).map(order => ({
        ...order,
        lineItemCount: Number(order.lineItemCount) || (Array.isArray(order.items) ? order.items.length : 0),
        totalValueCheckedOut: Number(order.totalValueCheckedOut) || 0,
        totalValueSold: Number(order.totalValueSold) || 0,
        totalAmountPaid: Number(order.totalAmountPaid) || 0,
        totalExpenses: Number(order.totalExpenses) || 0,
        balanceDue: Number(order.balanceDue) || 0,
        totalOnHandQuantity: Number(order.totalOnHandQuantity) || 0
    }));
}

function getCreateWorksheetRows() {
    return (featureState.catalogueItemRows || []).map(row => ({
        productId: row.productId,
        productName: row.productName,
        categoryId: row.categoryId || "",
        categoryName: row.categoryName || "-",
        sellingPrice: Number(row.sellingPrice) || 0,
        inventoryCount: Math.max(0, Math.floor(Number(row.inventoryCount) || 0)),
        quantityCheckedOut: Math.max(0, Math.floor(Number(row.quantityCheckedOut) || 0)),
        quantitySold: 0,
        quantityReturned: 0,
        quantityDamaged: 0,
        quantityGifted: 0
    }));
}

function getOrderWorksheetRows(order, snapshot) {
    if (!order) return [];

    const productMap = new Map((snapshot.masterData.products || []).map(product => [product.id, product]));

    return (order.items || []).map(item => {
        const product = productMap.get(item.productId);
        const resolvedCategory = resolveCategoryDisplay(snapshot, item, product);
        return {
            productId: item.productId,
            productName: item.productName || product?.itemName || "Untitled Product",
            categoryId: resolvedCategory.categoryId,
            categoryName: resolvedCategory.categoryName,
            sellingPrice: Number(item.sellingPrice) || 0,
            inventoryCount: Math.max(0, Math.floor(Number(product?.inventoryCount) || 0)),
            quantityCheckedOut: Math.max(0, Math.floor(Number(item.quantityCheckedOut) || 0)),
            quantitySold: Math.max(0, Math.floor(Number(item.quantitySold) || 0)),
            quantityReturned: Math.max(0, Math.floor(Number(item.quantityReturned) || 0)),
            quantityDamaged: Math.max(0, Math.floor(Number(item.quantityDamaged) || 0)),
            quantityGifted: Math.max(0, Math.floor(Number(item.quantityGifted) || 0))
        };
    });
}

function computeWorksheetMetrics(rows = []) {
    return (rows || []).reduce((summary, row) => {
        const quantityCheckedOut = Math.max(0, Math.floor(Number(row.quantityCheckedOut) || 0));
        const quantitySold = Math.max(0, Math.floor(Number(row.quantitySold) || 0));
        const quantityReturned = Math.max(0, Math.floor(Number(row.quantityReturned) || 0));
        const quantityDamaged = Math.max(0, Math.floor(Number(row.quantityDamaged) || 0));
        const quantityGifted = Math.max(0, Math.floor(Number(row.quantityGifted) || 0));
        const price = Number(row.sellingPrice) || 0;

        summary.totalQuantityCheckedOut += quantityCheckedOut;
        summary.totalQuantitySold += quantitySold;
        summary.totalQuantityReturned += quantityReturned;
        summary.totalQuantityDamaged += quantityDamaged;
        summary.totalQuantityGifted += quantityGifted;
        summary.totalOnHandQuantity += quantityCheckedOut - (quantitySold + quantityReturned + quantityDamaged + quantityGifted);
        summary.totalValueCheckedOut += quantityCheckedOut * price;
        summary.totalValueSold += quantitySold * price;
        summary.totalValueReturned += quantityReturned * price;
        summary.totalValueDamaged += quantityDamaged * price;
        summary.totalValueGifted += quantityGifted * price;
        summary.totalValueOnHand += (quantityCheckedOut - (quantitySold + quantityReturned + quantityDamaged + quantityGifted)) * price;
        return summary;
    }, {
        totalQuantityCheckedOut: 0,
        totalQuantitySold: 0,
        totalQuantityReturned: 0,
        totalQuantityDamaged: 0,
        totalQuantityGifted: 0,
        totalOnHandQuantity: 0,
        totalValueCheckedOut: 0,
        totalValueSold: 0,
        totalValueReturned: 0,
        totalValueDamaged: 0,
        totalValueGifted: 0,
        totalValueOnHand: 0
    });
}

function getCloseOrderGuard(order, worksheetMetrics) {
    if (!order) {
        return {
            disabled: true,
            reason: "Select an active consignment order first."
        };
    }

    if (normalizeText(order.status) !== "Active") {
        return {
            disabled: true,
            reason: "Only active consignment orders can be closed."
        };
    }

    const amountPaid = Number(order.totalAmountPaid) || 0;
    const totalExpenses = Number(order.totalExpenses) || 0;
    const liveBalanceDue = roundCurrency((Number(worksheetMetrics.totalValueSold) || 0) - amountPaid - totalExpenses);
    const onHand = Number(worksheetMetrics.totalOnHandQuantity) || 0;

    if (onHand > 0) {
        return {
            disabled: true,
            reason: `${onHand} checked-out items are still on hand.`
        };
    }

    if (liveBalanceDue > 0) {
        return {
            disabled: true,
            reason: `Balance due ${formatCurrency(liveBalanceDue)} must be settled before closing.`
        };
    }

    if (liveBalanceDue < 0) {
        return {
            disabled: true,
            reason: "Sold value is below applied payments and expenses. Save corrected settlement first."
        };
    }

    return {
        disabled: false,
        reason: ""
    };
}

function getCancelOrderGuard(order) {
    if (!order) {
        return {
            disabled: true,
            reason: "Select an active consignment order first."
        };
    }

    if (normalizeText(order.status) !== "Active") {
        return {
            disabled: true,
            reason: "Only active consignment orders can be cancelled."
        };
    }

    const hasLineActivity = (Number(order.totalQuantitySold) || 0) > 0
        || (Number(order.totalQuantityReturned) || 0) > 0
        || (Number(order.totalQuantityDamaged) || 0) > 0
        || (Number(order.totalQuantityGifted) || 0) > 0;
    if (hasLineActivity) {
        return {
            disabled: true,
            reason: "Cancellation is blocked because quantity activity already exists."
        };
    }

    const hasFinancialTotals = roundCurrency(order.totalAmountPaid) > 0
        || roundCurrency(order.totalExpenses) > 0
        || (Number(order.paymentCount) || 0) > 0;
    if (hasFinancialTotals || featureState.transactions.length > 0) {
        return {
            disabled: true,
            reason: "Cancellation is blocked because payment or expense activity exists."
        };
    }

    return {
        disabled: false,
        reason: ""
    };
}

function buildSummaryModel(snapshot) {
    const activeOrder = getActiveOrder();
    const worksheetRows = getSimpleConsignmentWorksheetRows();
    const metrics = computeWorksheetMetrics(worksheetRows);

    if (isCreateMode()) {
        const orderCount = featureState.orders.length;
        const activeCount = featureState.orders.filter(order => normalizeText(order.status) === "Active").length;
        const settledCount = featureState.orders.filter(order => normalizeText(order.status) === "Settled").length;
        const cancelledCount = featureState.orders.filter(order => normalizeText(order.status) === "Cancelled").length;

        return {
            headerPills: [
                { label: `${orderCount} orders` },
                { label: `${activeCount} active` },
                { label: `${settledCount} settled` },
                { label: `${cancelledCount} cancelled` }
            ],
            cardRows: [
                { id: "simple-consignment-summary-quantity-out", label: "Qty Checked Out", value: String(metrics.totalQuantityCheckedOut) },
                { id: "simple-consignment-summary-value-out", label: "Value Checked Out", value: formatCurrency(metrics.totalValueCheckedOut) },
                { id: "simple-consignment-summary-catalogue", label: "Catalogue", value: featureState.selectedCatalogueId ? "Selected" : "Not Selected" },
                { id: "simple-consignment-summary-ready", label: "Ready Products", value: String((worksheetRows || []).filter(row => (Number(row.quantityCheckedOut) || 0) > 0).length) }
            ],
            guard: { disabled: true, reason: "" },
            transactionsTitle: "",
            transactionsCountCopy: ""
        };
    }

    const paid = Number(activeOrder?.totalAmountPaid) || 0;
    const expenses = Number(activeOrder?.totalExpenses) || 0;
    const liveBalanceDue = roundCurrency(metrics.totalValueSold - paid - expenses);
    const guard = getCloseOrderGuard(activeOrder, metrics);

    return {
        headerPills: [
            { label: activeOrder?.consignmentId || "-" },
            { label: activeOrder?.status || "-" },
            { label: activeOrder?.teamName || "-" }
        ],
        cardRows: [
            { id: "simple-consignment-summary-quantity-out", label: "Qty Checked Out", value: String(metrics.totalQuantityCheckedOut) },
            { id: "simple-consignment-summary-value-out", label: "Value Checked Out", value: formatCurrency(metrics.totalValueCheckedOut) },
            { id: "simple-consignment-summary-sold", label: "Sold Value", value: formatCurrency(metrics.totalValueSold) },
            { id: "simple-consignment-summary-returned-value", label: "Returned Value", value: formatCurrency(metrics.totalValueReturned) },
            { id: "simple-consignment-summary-damaged-value", label: "Damaged Value", value: formatCurrency(metrics.totalValueDamaged) },
            { id: "simple-consignment-summary-gifted-value", label: "Gifted Value", value: formatCurrency(metrics.totalValueGifted) },
            { id: "simple-consignment-summary-on-hand-value", label: "On-Hand Value", value: formatCurrency(metrics.totalValueOnHand) },
            { id: "simple-consignment-summary-paid", label: "Amount Paid", value: formatCurrency(paid) },
            { id: "simple-consignment-summary-expenses", label: "Expenses", value: formatCurrency(expenses) },
            { id: "simple-consignment-summary-balance", label: "Balance Due", value: formatCurrency(Math.max(liveBalanceDue, 0)) },
            { id: "simple-consignment-summary-on-hand", label: "On Hand", value: String(metrics.totalOnHandQuantity) }
        ],
        guard,
        transactionsTitle: `Order Payments (${featureState.transactions.length})`,
        transactionsCountCopy: `${featureState.transactions.length} record(s) linked to this order.`
    };
}

function renderWorkspaceHeader(summaryModel, mode = "create") {
    const isCreate = mode === "create";
    const isCancel = mode === "cancel";
    const title = isCreate
        ? "Simple Consignment Checkout"
        : isCancel
            ? "Cancel Consignment Order"
            : "Simple Consignment Settlement";
    const copy = isCreate
        ? "Check out catalogue products to a team, then settle sales, returns, damages, and financials in one controlled workflow."
        : isCancel
            ? "Review the order below before cancellation. All values are locked, and only the cancel reason can be entered."
            : "Update product-level settlement quantities, post team transactions, and close the order only when quantities and balance are fully reconciled.";
    const headerClass = isCancel ? "panel-header panel-header-danger-soft" : "panel-header panel-header-accent";

    return `
        <div class="${headerClass}">
            <div class="panel-title-wrap">
                <span class="panel-icon panel-icon-alt">${icons.consignment || icons.retail}</span>
                <div>
                    <h2>${title}</h2>
                    <p class="panel-copy">${copy}</p>
                </div>
            </div>
            <div class="toolbar-meta">
                ${summaryModel.headerPills.map(pill => `<span class="status-pill">${pill.label}</span>`).join("")}
            </div>
        </div>
    `;
}

function renderSummaryCards(summaryModel) {
    return `
        <div class="simple-consignment-summary-grid">
            ${summaryModel.cardRows.map(card => `
                <article class="summary-card">
                    <p class="summary-label">${card.label}</p>
                    <p id="${card.id}" class="summary-value">${card.value}</p>
                </article>
            `).join("")}
        </div>
    `;
}

function renderCheckoutForm(snapshot) {
    const draft = featureState.checkoutDraft;
    const summaryModel = buildSummaryModel(snapshot);

    return `
        <div class="panel-card">
            ${renderWorkspaceHeader(summaryModel, "create")}
            <div class="panel-body">
                <form id="simple-consignment-checkout-form">
                    <div id="simple-consignment-form" class="workspace-form-sections">
                        <section class="workspace-form-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Checkout Context</p>
                            </div>
                            <div class="workspace-form-section-grid">
                                <div class="field">
                                    <label for="simple-consignment-checkout-date">Checkout Date <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="simple-consignment-checkout-date" class="input" type="date" value="${draft.checkoutDate}" required>
                                </div>
                                <div class="field">
                                    <label for="simple-consignment-voucher">Manual Voucher # <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="simple-consignment-voucher" class="input" type="text" value="${draft.manualVoucherNumber}" required>
                                </div>
                                <div class="field field-full">
                                    <label for="simple-consignment-catalogue">Sales Catalogue <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="simple-consignment-catalogue" class="select" required>
                                        <option value="">Select a catalogue...</option>
                                        ${resolveCatalogueOptions(snapshot, draft.salesCatalogueId)}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section class="workspace-form-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Team Details</p>
                            </div>
                            <div class="workspace-form-section-grid">
                                <div class="field">
                                    <label for="simple-consignment-team-name">Team Name <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="simple-consignment-team-name" class="input" type="text" value="${draft.teamName}" required>
                                </div>
                                <div class="field">
                                    <label for="simple-consignment-member-name">Team Member <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="simple-consignment-member-name" class="input" type="text" value="${draft.teamMemberName}" required>
                                </div>
                                <div class="field">
                                    <label for="simple-consignment-member-phone">Member Phone <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="simple-consignment-member-phone" class="input" type="tel" value="${draft.memberPhone}" required>
                                </div>
                                <div class="field">
                                    <label for="simple-consignment-member-email">Member Email</label>
                                    <input id="simple-consignment-member-email" class="input" type="email" value="${draft.memberEmail}">
                                </div>
                            </div>
                        </section>

                        <section class="workspace-form-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Location</p>
                            </div>
                            <div class="workspace-form-section-grid">
                                <div class="field field-full">
                                    <label for="simple-consignment-venue">Venue <span class="required-mark" aria-hidden="true">*</span></label>
                                    <textarea id="simple-consignment-venue" class="textarea" required>${draft.venue}</textarea>
                                </div>
                            </div>
                        </section>
                    </div>

                    ${renderSummaryCards(summaryModel)}

                    <div class="simple-consignment-product-list-shell">
                        <div class="toolbar">
                            <div>
                                <p class="section-kicker" style="margin-bottom: 0.25rem;">Checkout Worksheet</p>
                                <p class="panel-copy">Set quantity checked out. Products with quantity greater than zero become active checkout line items.</p>
                            </div>
                            <div class="search-wrap">
                                <span class="search-icon">${icons.search}</span>
                                <input id="simple-consignment-items-search" class="input toolbar-search" type="search" placeholder="Search product or category" value="${featureState.worksheetSearchTerm}">
                            </div>
                        </div>
                        <div class="ag-shell">
                            <div id="simple-consignment-worksheet-grid" class="ag-theme-alpine moneta-grid" style="height: 500px; width: 100%;"></div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button id="simple-consignment-reset-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            Reset
                        </button>
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${icons.plus}</span>
                            Create Checkout
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderSettlementWorkspace(snapshot) {
    const order = getActiveOrder();
    const draft = featureState.checkoutDraft;
    const isView = isViewMode();
    const isCancel = isCancelMode();
    const isReadOnlyMode = isView || isCancel;
    const contextFieldDisabledAttr = isReadOnlyMode ? "disabled" : "";
    const summaryModel = buildSummaryModel(snapshot);
    const closeButtonDisabledAttr = summaryModel.guard.disabled
        ? `disabled title="${summaryModel.guard.reason.replaceAll('"', "&quot;")}"`
        : "";
    const cancelGuard = getCancelOrderGuard(order);
    const cancelOrderDisabledAttr = cancelGuard.disabled
        ? `disabled title="${cancelGuard.reason.replaceAll('"', "&quot;")}"`
        : "";
    const checkoutDateValue = toDateInputValue(order?.checkoutDate) || "";
    const viewStateCopy = normalizeText(order?.status) === "Cancelled"
        ? "This cancelled order is read-only. Values shown below are final."
        : "This settled order is read-only. Quantities shown below are final.";

    return `
        <div class="panel-card ${isReadOnlyMode ? "retail-view-mode-card" : ""} ${isCancel ? "purchase-void-mode-card" : ""}">
            ${renderWorkspaceHeader(summaryModel, isCancel ? "cancel" : "settlement")}
            <div class="panel-body">
                ${isCancel ? `
                    <div class="purchase-void-mode-banner">
                        <div>
                            <p class="section-kicker">Cancel Mode</p>
                            <p class="panel-copy">Cancellation is allowed only when no quantity activity and no payment or expense activity exist for the order.</p>
                        </div>
                        <div class="toolbar-meta">
                            <span class="status-pill">${order?.consignmentId || "-"}</span>
                            <span class="status-pill">${String(order?.totalQuantityCheckedOut || 0)} qty checked out</span>
                            <span class="status-pill">${formatCurrency(order?.totalValueCheckedOut || 0)} value out</span>
                        </div>
                    </div>
                ` : ""}
                <div id="simple-consignment-form" class="form-grid simple-consignment-form-grid">
                    <div class="field">
                        <label>Order ID</label>
                        <input class="input" type="text" value="${order?.consignmentId || "-"}" disabled>
                    </div>
                    <div class="field">
                        <label>Status</label>
                        <input class="input" type="text" value="${order?.status || "-"}" disabled>
                    </div>
                    <div class="field">
                        <label>Checkout Date</label>
                        <input class="input" type="date" value="${checkoutDateValue}" disabled>
                    </div>
                    <div class="field">
                        <label>Voucher #</label>
                        <input id="simple-consignment-voucher" class="input" type="text" value="${draft.manualVoucherNumber ?? order?.manualVoucherNumber ?? ""}" ${contextFieldDisabledAttr}>
                    </div>
                    <div class="field">
                        <label>Sales Catalogue</label>
                        <input class="input" type="text" value="${order?.salesCatalogueName || "-"}" disabled>
                    </div>
                    <div class="field">
                        <label>Team Name</label>
                        <input id="simple-consignment-team-name" class="input" type="text" value="${draft.teamName ?? order?.teamName ?? ""}" ${contextFieldDisabledAttr}>
                    </div>
                    <div class="field">
                        <label>Team Member</label>
                        <input id="simple-consignment-member-name" class="input" type="text" value="${draft.teamMemberName ?? order?.teamMemberName ?? ""}" ${contextFieldDisabledAttr}>
                    </div>
                    <div class="field">
                        <label>Member Phone</label>
                        <input id="simple-consignment-member-phone" class="input" type="text" value="${draft.memberPhone ?? order?.memberPhone ?? ""}" ${contextFieldDisabledAttr}>
                    </div>
                    <div class="field">
                        <label>Member Email</label>
                        <input id="simple-consignment-member-email" class="input" type="email" value="${draft.memberEmail ?? order?.memberEmail ?? ""}" ${contextFieldDisabledAttr}>
                    </div>
                    <div class="field field-full">
                        <label>Venue</label>
                        <textarea id="simple-consignment-venue" class="textarea" ${contextFieldDisabledAttr}>${draft.venue ?? order?.venue ?? ""}</textarea>
                    </div>
                </div>

                ${renderSummaryCards(summaryModel)}

                <div class="simple-consignment-product-list-shell">
                    <div class="toolbar">
                        <div>
                            <p class="section-kicker" style="margin-bottom: 0.25rem;">Settlement Worksheet</p>
                            <p class="panel-copy">${isCancel
            ? "All worksheet values are locked in cancel mode. Review the order and confirm cancellation if all guard conditions pass."
            : isView
                ? viewStateCopy
                : "Update sold, returned, damaged, and gifted quantities. Save progress to reconcile quantities and values. Payments can be recorded later."}</p>
                        </div>
                        <div class="search-wrap">
                            <span class="search-icon">${icons.search}</span>
                            <input id="simple-consignment-items-search" class="input toolbar-search" type="search" placeholder="Search product" value="${featureState.worksheetSearchTerm}">
                        </div>
                    </div>
                    <div class="ag-shell">
                        <div id="simple-consignment-worksheet-grid" class="ag-theme-alpine moneta-grid" style="height: 500px; width: 100%;"></div>
                    </div>
                </div>

                ${isCancel ? `
                    <div class="purchase-void-mode-reason">
                        <div class="field field-full">
                            <label for="simple-consignment-cancel-reason">Cancel Reason <span class="required-mark" aria-hidden="true">*</span></label>
                            <textarea id="simple-consignment-cancel-reason" class="textarea purchase-void-reason-textarea" placeholder="Explain why this consignment order is being cancelled">${featureState.cancelReason}</textarea>
                        </div>
                        <p class="panel-copy panel-copy-tight">This action cannot be undone. The order remains visible in history with cancelled status and a full audit trail.</p>
                    </div>
                ` : ""}

                <div class="purchase-payments-layout">
                    <div class="payment-workspace-card">
                        <div class="purchase-payments-history-header">
                            <p class="section-kicker">${summaryModel.transactionsTitle || "Order Payments"}</p>
                            <p id="simple-consignment-transactions-count" class="panel-copy">${summaryModel.transactionsCountCopy}</p>
                            ${isView || isCancel ? "" : `<p class="panel-copy">Payments and expenses are optional during quantity updates and can be posted any time before close.</p>`}
                        </div>
                        ${isView || isCancel ? "" : `
                            <form id="simple-consignment-transaction-form" class="purchase-payment-form">
                                <div class="form-grid">
                                    <div class="field">
                                        <label for="simple-consignment-transaction-date">Transaction Date <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="simple-consignment-transaction-date" class="input" type="date" value="${featureState.transactionDraft.transactionDate}" required>
                                    </div>
                                    <div class="field">
                                        <label for="simple-consignment-transaction-type">Type <span class="required-mark" aria-hidden="true">*</span></label>
                                        <select id="simple-consignment-transaction-type" class="select" required>
                                            <option value="Payment" ${featureState.transactionDraft.paymentType === "Payment" ? "selected" : ""}>Payment</option>
                                            <option value="Expense" ${featureState.transactionDraft.paymentType === "Expense" ? "selected" : ""}>Expense</option>
                                        </select>
                                    </div>
                                    <div class="field">
                                        <label for="simple-consignment-transaction-mode">Payment Mode <span class="required-mark" aria-hidden="true">*</span></label>
                                        <select id="simple-consignment-transaction-mode" class="select" required>
                                            <option value="">Select mode...</option>
                                            ${resolvePaymentModeOptions(snapshot, featureState.transactionDraft.paymentMode)}
                                        </select>
                                    </div>
                                    <div class="field">
                                        <label for="simple-consignment-transaction-amount">Amount <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="simple-consignment-transaction-amount" class="input" type="number" min="0" step="0.01" value="${featureState.transactionDraft.amountApplied}" required>
                                    </div>
                                    <div class="field">
                                        <label for="simple-consignment-transaction-reference">Reference <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="simple-consignment-transaction-reference" class="input" type="text" value="${featureState.transactionDraft.reference}" required>
                                    </div>
                                    <div class="field">
                                        <label for="simple-consignment-transaction-contact">Contact</label>
                                        <input id="simple-consignment-transaction-contact" class="input" type="text" value="${featureState.transactionDraft.contact}">
                                    </div>
                                    <div class="field field-full">
                                        <label for="simple-consignment-transaction-notes">Notes</label>
                                        <textarea id="simple-consignment-transaction-notes" class="textarea">${featureState.transactionDraft.notes}</textarea>
                                    </div>
                                </div>
                                <div class="form-actions">
                                    <button class="button button-primary-alt" type="submit">
                                        <span class="button-icon">${icons.payment}</span>
                                        Record Payments
                                    </button>
                                </div>
                            </form>
                        `}
                        <div class="toolbar">
                            <div class="search-wrap">
                                <span class="search-icon">${icons.search}</span>
                                <input id="simple-consignment-transactions-search" class="input toolbar-search" type="search" placeholder="Search payments" value="${featureState.transactionsSearchTerm}">
                            </div>
                        </div>
                        <div class="ag-shell purchase-payment-history-shell">
                            <div id="simple-consignment-transactions-grid" class="ag-theme-alpine moneta-grid" style="height: 420px; width: 100%;"></div>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    ${isCancel ? `
                        <button id="simple-consignment-cancel-order-back-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            Back To Settlement
                        </button>
                        <button id="simple-consignment-cancel-order-confirm-button" class="button button-danger-soft" type="button" ${cancelOrderDisabledAttr}>
                            <span class="button-icon">${icons.inactive}</span>
                            Cancel Order
                        </button>
                    ` : `
                        <button id="simple-consignment-back-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            Back To New Checkout
                        </button>
                    `}
                    ${isView || isCancel ? "" : `
                        <button id="simple-consignment-enter-cancel-mode-button" class="button button-danger-soft" type="button" ${cancelOrderDisabledAttr}>
                            <span class="button-icon">${icons.inactive}</span>
                            Enter Cancel Mode
                        </button>
                        <button id="simple-consignment-save-progress-button" class="button button-primary" type="button">
                            <span class="button-icon">${icons.edit}</span>
                            Save Progress
                        </button>
                        <button id="simple-consignment-close-order-button" class="button button-danger-soft" type="button" ${closeButtonDisabledAttr}>
                            <span class="button-icon">${icons.active}</span>
                            Close Order
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

function renderHistoryPanel() {
    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.consignment || icons.retail}</span>
                    <div>
                        <h3>Consignment Orders History</h3>
                        <p class="panel-copy">Open active orders for settlement or cancellation. Settled and cancelled orders remain available in read-only mode.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill" id="simple-consignment-order-count">${featureState.filteredOrderCount} visible</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Order Registry</p>
                        <p class="panel-copy">Search by order id, voucher, team, member, status, and balance.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input id="simple-consignment-orders-search" class="input toolbar-search" type="search" placeholder="Search consignment orders" value="${featureState.ordersSearchTerm}">
                    </div>
                </div>
                <div class="ag-shell">
                    <div id="simple-consignment-orders-grid" class="ag-theme-alpine moneta-grid" style="height: 580px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function renderSimpleConsignmentViewShell(snapshot) {
    const root = document.getElementById("simple-consignment-root");
    if (!root) return;

    const workspaceMarkup = isCreateMode()
        ? renderCheckoutForm(snapshot)
        : renderSettlementWorkspace(snapshot);

    root.innerHTML = `
        <div class="simple-consignment-shell">
            ${workspaceMarkup}
            ${renderHistoryPanel()}
        </div>
    `;
}

function updateSummaryCardsInPlace() {
    const snapshot = getState();
    const summaryModel = buildSummaryModel(snapshot);

    summaryModel.cardRows.forEach(card => {
        const node = document.getElementById(card.id);
        if (node) {
            node.textContent = card.value;
        }
    });

    const transactionsCount = document.getElementById("simple-consignment-transactions-count");
    if (transactionsCount && summaryModel.transactionsCountCopy) {
        transactionsCount.textContent = summaryModel.transactionsCountCopy;
    }
}

function syncOrdersGrid() {
    const rows = buildConsignmentOrderGridRows();

    initializeSimpleConsignmentOrdersGrid(
        document.getElementById("simple-consignment-orders-grid"),
        count => {
            featureState.filteredOrderCount = count;
            const countNode = document.getElementById("simple-consignment-order-count");
            if (countNode) {
                countNode.textContent = `${count} visible`;
            }
        }
    );

    refreshSimpleConsignmentOrdersGrid(rows);
    updateSimpleConsignmentOrdersGridSearch(featureState.ordersSearchTerm);

    if (!featureState.ordersSearchTerm) {
        featureState.filteredOrderCount = rows.length;
        const countNode = document.getElementById("simple-consignment-order-count");
        if (countNode) {
            countNode.textContent = `${rows.length} visible`;
        }
    }
}

function syncWorksheetGrid(snapshot) {
    const activeOrder = getActiveOrder();
    const rows = isCreateMode()
        ? getCreateWorksheetRows()
        : getOrderWorksheetRows(activeOrder, snapshot);

    initializeSimpleConsignmentWorksheetGrid(document.getElementById("simple-consignment-worksheet-grid"), () => {
        updateSummaryCardsInPlace();
    });
    setSimpleConsignmentWorksheetMode(isCreateMode() ? "checkout" : "settlement");
    setSimpleConsignmentWorksheetReadOnly(isViewMode() || isCancelMode());
    refreshSimpleConsignmentWorksheetGrid(rows);
    updateSimpleConsignmentWorksheetGridSearch(featureState.worksheetSearchTerm);
    updateSummaryCardsInPlace();
}

function syncTransactionsGrid() {
    const element = document.getElementById("simple-consignment-transactions-grid");
    if (!element) return;

    initializeSimpleConsignmentTransactionsGrid(element);
    setSimpleConsignmentTransactionsVoidEnabled(isSettleMode());
    refreshSimpleConsignmentTransactionsGrid(featureState.transactions);
    updateSimpleConsignmentTransactionsGridSearch(featureState.transactionsSearchTerm);
}

async function loadCatalogueItemsIntoWorkspace(catalogueId) {
    featureState.selectedCatalogueId = catalogueId || "";
    featureState.checkoutDraft.salesCatalogueId = catalogueId || "";

    if (!catalogueId) {
        featureState.catalogueItemRows = [];
        refreshSimpleConsignmentWorksheetGrid([]);
        updateSummaryCardsInPlace();
        return;
    }

    try {
        const existingRows = getSimpleConsignmentWorksheetRows();
        const quantityMap = new Map(
            existingRows.map(row => [row.productId, Math.max(0, Math.floor(Number(row.quantityCheckedOut) || 0))])
        );
        const snapshot = getState();
        const productMap = new Map((snapshot.masterData.products || []).map(product => [product.id, product]));
        const catalogueItems = await fetchSimpleConsignmentCatalogueItems(catalogueId);

        featureState.catalogueItemRows = (catalogueItems || []).map(item => {
            const product = productMap.get(item.productId);
            const resolvedCategory = resolveCategoryDisplay(snapshot, item, product);
            return {
                productId: item.productId,
                productName: item.productName || product?.itemName || "Untitled Product",
                categoryId: resolvedCategory.categoryId,
                categoryName: resolvedCategory.categoryName,
                sellingPrice: Number(item.sellingPrice) || 0,
                inventoryCount: Math.max(0, Math.floor(Number(product?.inventoryCount) || 0)),
                quantityCheckedOut: quantityMap.get(item.productId) || 0,
                quantitySold: 0,
                quantityReturned: 0,
                quantityDamaged: 0,
                quantityGifted: 0
            };
        });

        if (getState().currentRoute === "#/simple-consignment" && isCreateMode()) {
            refreshSimpleConsignmentWorksheetGrid(getCreateWorksheetRows());
            updateSimpleConsignmentWorksheetGridSearch(featureState.worksheetSearchTerm);
            updateSummaryCardsInPlace();
        }
    } catch (error) {
        console.error("[Moneta] Failed to load consignment catalogue items:", error);
        showToast("Could not load products for the selected catalogue.", "error", {
            title: "Simple Consignment"
        });
    }
}

function ensureOrdersListener(snapshot) {
    const shouldListen = snapshot.currentRoute === "#/simple-consignment" && Boolean(snapshot.currentUser);

    if (!shouldListen) {
        detachOrdersListener();
        return;
    }

    if (featureState.unsubscribeOrders) return;

    featureState.unsubscribeOrders = subscribeToSimpleConsignmentOrders(
        rows => {
            featureState.orders = rows;
            if (featureState.activeOrderId && !rows.find(order => order.id === featureState.activeOrderId)) {
                resetWorkspaceToCreate();
            }

            if (getState().currentRoute === "#/simple-consignment") {
                renderSimpleConsignmentView();
            }
        },
        error => {
            console.error("[Moneta] Failed to load simple consignment orders:", error);
            showToast("Could not load simple consignment orders.", "error", {
                title: "Simple Consignment"
            });
        }
    );
}

function ensureTransactionsListener(snapshot) {
    const shouldListen = snapshot.currentRoute === "#/simple-consignment"
        && Boolean(snapshot.currentUser)
        && !isCreateMode()
        && Boolean(featureState.activeOrderId);

    if (!shouldListen) {
        detachTransactionsListener();
        return;
    }

    if (featureState.unsubscribeTransactions && featureState.transactionsOrderId === featureState.activeOrderId) {
        return;
    }

    detachTransactionsListener();

    featureState.transactionsOrderId = featureState.activeOrderId;
    featureState.unsubscribeTransactions = subscribeToSimpleConsignmentTransactions(
        featureState.activeOrderId,
        rows => {
            featureState.transactions = rows;

            if (getState().currentRoute === "#/simple-consignment" && !isCreateMode()) {
                syncTransactionsGrid();
                updateSummaryCardsInPlace();
            }
        },
        error => {
            console.error("[Moneta] Failed to load consignment transactions:", error);
            showToast("Could not load linked consignment transactions.", "error", {
                title: "Simple Consignment"
            });
        }
    );
}

function openOrderWorkspace(order) {
    if (!order?.id) return;

    const status = normalizeText(order.status);
    featureState.activeOrderId = order.id;
    featureState.workspaceMode = status === "Active" ? "settle" : "view";
    featureState.checkoutDraft = {
        checkoutDate: toDateInputValue(order.checkoutDate),
        manualVoucherNumber: order.manualVoucherNumber || "",
        teamName: order.teamName || "",
        teamMemberName: order.teamMemberName || "",
        memberPhone: order.memberPhone || "",
        memberEmail: order.memberEmail || "",
        venue: order.venue || "",
        salesCatalogueId: order.salesCatalogueId || ""
    };
    featureState.selectedCatalogueId = order.salesCatalogueId || "";
    featureState.transactionDraft = createDefaultTransactionDraft();
    featureState.cancelReason = "";
    ensureTransactionsListener(getState());

    renderSimpleConsignmentView();

    focusFormField({
        formId: "simple-consignment-form",
        inputSelector: featureState.workspaceMode === "settle"
            ? "#simple-consignment-transaction-amount"
            : "#simple-consignment-back-button"
    });
}

function openOrderCancelWorkspace(order) {
    if (!order?.id) return;

    featureState.activeOrderId = order.id;
    featureState.workspaceMode = "cancel";
    featureState.checkoutDraft = {
        checkoutDate: toDateInputValue(order.checkoutDate),
        manualVoucherNumber: order.manualVoucherNumber || "",
        teamName: order.teamName || "",
        teamMemberName: order.teamMemberName || "",
        memberPhone: order.memberPhone || "",
        memberEmail: order.memberEmail || "",
        venue: order.venue || "",
        salesCatalogueId: order.salesCatalogueId || ""
    };
    featureState.selectedCatalogueId = order.salesCatalogueId || "";
    featureState.transactionDraft = createDefaultTransactionDraft();
    featureState.cancelReason = "";
    ensureTransactionsListener(getState());

    renderSimpleConsignmentView();
    focusFormField({
        formId: "simple-consignment-form",
        inputSelector: "#simple-consignment-cancel-reason"
    });
}

function getCheckoutPayloadFromDom() {
    return {
        checkoutDate: document.getElementById("simple-consignment-checkout-date")?.value || featureState.checkoutDraft.checkoutDate,
        manualVoucherNumber: document.getElementById("simple-consignment-voucher")?.value || featureState.checkoutDraft.manualVoucherNumber,
        teamName: document.getElementById("simple-consignment-team-name")?.value || featureState.checkoutDraft.teamName,
        teamMemberName: document.getElementById("simple-consignment-member-name")?.value || featureState.checkoutDraft.teamMemberName,
        memberPhone: document.getElementById("simple-consignment-member-phone")?.value || featureState.checkoutDraft.memberPhone,
        memberEmail: document.getElementById("simple-consignment-member-email")?.value || featureState.checkoutDraft.memberEmail,
        venue: document.getElementById("simple-consignment-venue")?.value || featureState.checkoutDraft.venue,
        salesCatalogueId: document.getElementById("simple-consignment-catalogue")?.value || featureState.checkoutDraft.salesCatalogueId,
        items: getSimpleConsignmentWorksheetRows()
    };
}

function getSettlementContextPayloadFromDom(order) {
    const manualVoucherInput = document.getElementById("simple-consignment-voucher");
    const teamNameInput = document.getElementById("simple-consignment-team-name");
    const teamMemberInput = document.getElementById("simple-consignment-member-name");
    const memberPhoneInput = document.getElementById("simple-consignment-member-phone");
    const memberEmailInput = document.getElementById("simple-consignment-member-email");
    const venueInput = document.getElementById("simple-consignment-venue");

    return {
        manualVoucherNumber: manualVoucherInput
            ? manualVoucherInput.value
            : (featureState.checkoutDraft.manualVoucherNumber ?? order?.manualVoucherNumber ?? ""),
        teamName: teamNameInput
            ? teamNameInput.value
            : (featureState.checkoutDraft.teamName ?? order?.teamName ?? ""),
        teamMemberName: teamMemberInput
            ? teamMemberInput.value
            : (featureState.checkoutDraft.teamMemberName ?? order?.teamMemberName ?? ""),
        memberPhone: memberPhoneInput
            ? memberPhoneInput.value
            : (featureState.checkoutDraft.memberPhone ?? order?.memberPhone ?? ""),
        memberEmail: memberEmailInput
            ? memberEmailInput.value
            : (featureState.checkoutDraft.memberEmail ?? order?.memberEmail ?? ""),
        venue: venueInput
            ? venueInput.value
            : (featureState.checkoutDraft.venue ?? order?.venue ?? "")
    };
}

function getTransactionPayloadFromDom() {
    return {
        transactionDate: document.getElementById("simple-consignment-transaction-date")?.value || featureState.transactionDraft.transactionDate,
        paymentType: document.getElementById("simple-consignment-transaction-type")?.value || featureState.transactionDraft.paymentType,
        paymentMode: document.getElementById("simple-consignment-transaction-mode")?.value || featureState.transactionDraft.paymentMode,
        amountApplied: document.getElementById("simple-consignment-transaction-amount")?.value || featureState.transactionDraft.amountApplied,
        reference: document.getElementById("simple-consignment-transaction-reference")?.value || featureState.transactionDraft.reference,
        contact: document.getElementById("simple-consignment-transaction-contact")?.value || featureState.transactionDraft.contact,
        notes: document.getElementById("simple-consignment-transaction-notes")?.value || featureState.transactionDraft.notes
    };
}

function getCancelReasonFromDom() {
    const reasonInput = document.getElementById("simple-consignment-cancel-reason");
    if (reasonInput) {
        return reasonInput.value || "";
    }

    return featureState.cancelReason || "";
}

async function handleCreateCheckoutSubmit() {
    const snapshot = getState();
    const payload = getCheckoutPayloadFromDom();
    const user = snapshot.currentUser;

    const result = await runProgressToastFlow({
        title: "Creating Consignment Checkout",
        theme: "info",
        initialMessage: "Reading checkout draft and product worksheet...",
        initialProgress: 12,
        initialStep: "Step 1 of 4",
        successTitle: "Checkout Created",
        successMessage: "Consignment checkout was created and inventory was updated."
    }, async ({ update }) => {
        update("Validating required fields and stock availability...", 40, "Step 2 of 4");
        const saveResult = await saveSimpleConsignmentCheckout(payload, user, snapshot.masterData.salesCatalogues || []);
        update("Persisting checkout and refreshing workspace context...", 82, "Step 3 of 4");
        const createdOrder = await getSimpleConsignmentOrderById(saveResult.orderRef?.id || "");
        update("Finalizing response payload...", 96, "Step 4 of 4");
        return { saveResult, createdOrder };
    });

    showToast("Consignment checkout created.", "success", {
        title: "Simple Consignment"
    });

    const createdOrder = result.createdOrder;
    await showSummaryModal({
        title: "Checkout Created",
        message: "The checkout was posted and selected inventory quantities were moved to the consignment order.",
        details: [
            { label: "Order ID", value: createdOrder?.consignmentId || "-" },
            { label: "Team", value: createdOrder?.teamName || "-" },
            { label: "Qty Checked Out", value: String(createdOrder?.totalQuantityCheckedOut || 0) },
            { label: "Value Checked Out", value: formatCurrency(createdOrder?.totalValueCheckedOut || 0) }
        ]
    });

    if (createdOrder) {
        openOrderWorkspace(createdOrder);
    } else {
        resetWorkspaceToCreate();
        renderSimpleConsignmentView();
    }
}

async function handleSaveSettlementProgress() {
    const snapshot = getState();
    const user = snapshot.currentUser;
    const activeOrder = getActiveOrder();
    if (!activeOrder) return;

    const rows = getSimpleConsignmentWorksheetRows();
    const settlementContextPayload = getSettlementContextPayloadFromDom(activeOrder);
    const contextUpdated = hasOrderContextUpdated(activeOrder, settlementContextPayload);
    const deltaSummary = buildSettlementDeltaSummary(activeOrder, rows);
    const result = await runProgressToastFlow({
        title: "Saving Settlement Progress",
        theme: "info",
        initialMessage: "Reading settlement worksheet...",
        initialProgress: 14,
        initialStep: "Step 1 of 4",
        successTitle: "Settlement Saved",
        successMessage: "Settlement progress was saved. Payment collection can be posted separately when available."
    }, async ({ update }) => {
        update("Validating product quantities and financial consistency...", 42, "Step 2 of 4");
        const saveResult = await saveSimpleConsignmentSettlement(activeOrder, rows, settlementContextPayload, user);
        update("Committing order context, settlement totals, and inventory deltas...", 78, "Step 3 of 4");
        return saveResult;
    });

    showToast("Settlement progress saved.", "success", {
        title: "Simple Consignment"
    });

    const displayedLineChanges = deltaSummary.lineChanges.slice(0, 6);
    const hiddenLineChangesCount = Math.max(0, deltaSummary.lineChangeCount - displayedLineChanges.length);

    await showSummaryModal({
        title: "Settlement Updated",
        message: deltaSummary.lineChangeCount > 0
            ? "Settlement saved with the worksheet updates below. Payment posting remains optional until close."
            : contextUpdated
                ? "Order context was updated. Worksheet quantities were unchanged."
                : "No worksheet quantity updates were detected. Existing values were revalidated and totals were refreshed.",
        details: [
            { label: "Order", value: activeOrder.consignmentId || "-" },
            { label: "Line Updates", value: String(deltaSummary.lineChangeCount) },
            { label: "Sold Value", value: formatCurrency(result.summary?.totalValueSold || 0) },
            { label: "Returned Qty", value: String(result.summary?.totalQuantityReturned || 0) },
            { label: "On Hand", value: String(result.summary?.totalOnHandQuantity || 0) },
            { label: "Balance Due", value: formatCurrency(result.summary?.balanceDue || 0) },
            { label: "Sold Value Delta", value: formatSignedCurrency(deltaSummary.impact.soldValueDelta) },
            { label: "Returned Value Delta", value: formatSignedCurrency(deltaSummary.impact.returnedValueDelta) },
            { label: "Damaged Value Delta", value: formatSignedCurrency(deltaSummary.impact.damagedValueDelta) },
            { label: "Gifted Value Delta", value: formatSignedCurrency(deltaSummary.impact.giftedValueDelta) },
            { label: "On Hand Value Delta", value: formatSignedCurrency(deltaSummary.impact.onHandValueDelta) },
            { label: "On Hand Qty Delta", value: formatSignedInteger(deltaSummary.impact.onHandQuantityDelta) },
            { label: "Balance Delta", value: formatSignedCurrency(deltaSummary.impact.balanceDueDelta) },
            ...displayedLineChanges.map((entry, index) => ({
                label: `Update ${index + 1}`,
                value: `${entry.productName}: ${entry.changeCopy}`
            }))
        ],
        note: [
            contextUpdated ? "Order context updated." : "",
            hiddenLineChangesCount > 0 ? `${hiddenLineChangesCount} additional line update(s) are not shown in this summary.` : ""
        ].filter(Boolean).join(" ")
    });
}

async function handleRecordTransaction() {
    const snapshot = getState();
    const user = snapshot.currentUser;
    const activeOrder = getActiveOrder();
    if (!activeOrder) return;

    const payload = getTransactionPayloadFromDom();
    const result = await runProgressToastFlow({
        title: "Recording Transaction",
        theme: "info",
        initialMessage: "Reading order and transaction draft...",
        initialProgress: 14,
        initialStep: "Step 1 of 4",
        successTitle: "Transaction Recorded",
        successMessage: "Consignment transaction was posted and order totals were updated."
    }, async ({ update }) => {
        update("Validating amount, mode, and reference...", 42, "Step 2 of 4");
        const saveResult = await addSimpleConsignmentTransaction(
            activeOrder,
            payload,
            snapshot.masterData.paymentModes || [],
            user
        );
        update("Writing transaction and updating order totals...", 78, "Step 3 of 4");
        return saveResult;
    });

    featureState.transactionDraft = {
        ...createDefaultTransactionDraft(),
        paymentMode: featureState.transactionDraft.paymentMode
    };

    showToast("Consignment transaction recorded.", "success", {
        title: "Simple Consignment"
    });

    await showSummaryModal({
        title: "Transaction Posted",
        message: "The transaction was recorded and linked to this consignment order.",
        details: [
            { label: "Order", value: activeOrder.consignmentId || "-" },
            { label: "Type", value: result.transaction?.paymentType || "-" },
            { label: "Amount", value: formatCurrency(result.transaction?.amountApplied || 0) },
            { label: "Updated Balance", value: formatCurrency(result.summary?.nextBalanceDue || 0) }
        ]
    });

    renderSimpleConsignmentView();
    focusFormField({
        formId: "simple-consignment-form",
        inputSelector: "#simple-consignment-transaction-amount",
        behavior: "auto"
    });
}

async function handleVoidTransaction(button) {
    const activeOrder = getActiveOrder();
    if (!activeOrder) return;

    const transactionId = button.dataset.transactionId || "";
    const transaction = featureState.transactions.find(entry => entry.id === transactionId) || null;
    if (!transaction) return;

    const confirmed = await showConfirmationModal({
        title: "Void Transaction",
        message: `Void ${transaction.paymentType || "transaction"} ${transaction.reference || transaction.transactionId || ""}?`,
        details: [
            { label: "Amount", value: formatCurrency(transaction.amountApplied || 0) },
            { label: "Mode", value: transaction.paymentMode || "-" },
            { label: "Date", value: toDateInputValue(transaction.transactionDate) || "-" }
        ],
        note: "This creates a reversal entry and restores the order balance.",
        confirmText: "Void Transaction",
        tone: "danger"
    });

    if (!confirmed) return;

    const snapshot = getState();
    const user = snapshot.currentUser;
    if (!user) return;

    const result = await runProgressToastFlow({
        title: "Voiding Transaction",
        theme: "warning",
        initialMessage: "Reading transaction and order totals...",
        initialProgress: 14,
        initialStep: "Step 1 of 4",
        successTitle: "Transaction Voided",
        successMessage: "The transaction was voided and reversal entries were posted."
    }, async ({ update }) => {
        update("Validating void eligibility and reversal constraints...", 42, "Step 2 of 4");
        const voidResult = await voidSimpleConsignmentTransactionEntry(
            activeOrder,
            transaction,
            { voidReason: "Voided from Moneta Simple Consignment workspace." },
            user
        );
        update("Writing reversal entries and recalculating order balance...", 78, "Step 3 of 4");
        return voidResult;
    });

    showToast("Transaction voided.", "success", {
        title: "Simple Consignment"
    });

    await showSummaryModal({
        title: "Transaction Voided",
        message: "A reversal entry was added and the order totals were restored.",
        details: [
            { label: "Order", value: activeOrder.consignmentId || "-" },
            { label: "Type", value: result.summary?.paymentType || "-" },
            { label: "Amount Reversed", value: formatCurrency(result.summary?.amountApplied || 0) },
            { label: "Updated Balance", value: formatCurrency(result.summary?.nextBalanceDue || 0) }
        ]
    });
}

async function handleCloseOrder() {
    const activeOrder = getActiveOrder();
    if (!activeOrder) return;

    const rows = getSimpleConsignmentWorksheetRows();
    const metrics = computeWorksheetMetrics(rows);
    const guard = getCloseOrderGuard(activeOrder, metrics);
    if (guard.disabled) {
        showToast(guard.reason, "warning", {
            title: "Close Guard"
        });
        return;
    }

    const confirmed = await showConfirmationModal({
        title: "Close Consignment Order",
        message: `Close order ${activeOrder.consignmentId || activeOrder.id}?`,
        details: [
            { label: "On Hand", value: String(metrics.totalOnHandQuantity) },
            { label: "Sold Value", value: formatCurrency(metrics.totalValueSold) },
            { label: "Amount Paid", value: formatCurrency(activeOrder.totalAmountPaid || 0) },
            { label: "Expenses", value: formatCurrency(activeOrder.totalExpenses || 0) },
            { label: "Balance Due", value: formatCurrency(Math.max(metrics.totalValueSold - (activeOrder.totalAmountPaid || 0) - (activeOrder.totalExpenses || 0), 0)) }
        ],
        note: "Closing locks this order from further edits.",
        confirmText: "Close Order",
        tone: "danger"
    });

    if (!confirmed) return;

    const snapshot = getState();
    const user = snapshot.currentUser;
    if (!user) return;

    await runProgressToastFlow({
        title: "Closing Order",
        theme: "info",
        initialMessage: "Validating close conditions...",
        initialProgress: 16,
        initialStep: "Step 1 of 4",
        successTitle: "Order Closed",
        successMessage: "Consignment order was successfully closed."
    }, async ({ update }) => {
        update("Checking on-hand quantity and outstanding balance...", 42, "Step 2 of 4");
        await finalizeSimpleConsignmentOrder(activeOrder, user);
        update("Applying settled status and lock markers...", 82, "Step 3 of 4");
    });

    showToast("Consignment order closed.", "success", {
        title: "Simple Consignment"
    });

    await showSummaryModal({
        title: "Order Closed",
        message: "This consignment order is now settled and read-only.",
        details: [
            { label: "Order", value: activeOrder.consignmentId || "-" },
            { label: "Team", value: activeOrder.teamName || "-" },
            { label: "Final Sold Value", value: formatCurrency(metrics.totalValueSold) }
        ]
    });
}

async function handleCancelOrder() {
    const activeOrder = getActiveOrder();
    if (!activeOrder) return;

    const cancelGuard = getCancelOrderGuard(activeOrder);
    if (cancelGuard.disabled) {
        showToast(cancelGuard.reason, "warning", {
            title: "Cancel Guard"
        });
        return;
    }

    const cancelReason = normalizeText(getCancelReasonFromDom());
    if (cancelReason.length < 6) {
        showToast("Please provide a clear cancellation reason before continuing.", "warning", {
            title: "Cancel Guard"
        });
        focusFormField({
            formId: "simple-consignment-form",
            inputSelector: "#simple-consignment-cancel-reason"
        });
        return;
    }

    const confirmed = await showConfirmationModal({
        title: "Cancel Consignment Order",
        message: `Cancel order ${activeOrder.consignmentId || activeOrder.id}?`,
        details: [
            { label: "Qty Checked Out", value: String(activeOrder.totalQuantityCheckedOut || 0) },
            { label: "Value Checked Out", value: formatCurrency(activeOrder.totalValueCheckedOut || 0) },
            { label: "Payments Linked", value: String(featureState.transactions.length) }
        ],
        note: "Cancellation returns all checked-out inventory and marks this order as cancelled. This action cannot be undone.",
        confirmText: "Cancel Order",
        tone: "danger"
    });

    if (!confirmed) return;

    const snapshot = getState();
    const user = snapshot.currentUser;
    if (!user) return;

    const result = await runProgressToastFlow({
        title: "Cancelling Order",
        theme: "warning",
        initialMessage: "Reading order state and cancellation guard checks...",
        initialProgress: 14,
        initialStep: "Step 1 of 4",
        successTitle: "Order Cancelled",
        successMessage: "The order was cancelled and inventory quantities were restored."
    }, async ({ update }) => {
        update("Validating line and financial activity constraints...", 40, "Step 2 of 4");
        const cancelResult = await cancelSimpleConsignmentOrderEntry(
            activeOrder,
            featureState.transactions,
            { cancelReason },
            user
        );
        update("Reversing inventory and applying cancelled status...", 82, "Step 3 of 4");
        return cancelResult;
    });

    showToast("Consignment order cancelled.", "success", {
        title: "Simple Consignment"
    });

    await showSummaryModal({
        title: "Order Cancelled",
        message: "The order was cancelled successfully and all checked-out items were returned to inventory.",
        details: [
            { label: "Order", value: activeOrder.consignmentId || "-" },
            { label: "Qty Restored", value: String(result.summary?.totalQuantityRestored || 0) },
            { label: "Value Restored", value: formatCurrency(result.summary?.totalValueCheckedOut || 0) }
        ],
        note: "Order context remains in history with cancelled status for audit."
    });

    featureState.cancelReason = "";
    resetWorkspaceToCreate();
    renderSimpleConsignmentView();
}

function handleOrdersSearchInput(inputElement) {
    featureState.ordersSearchTerm = inputElement.value || "";
    updateSimpleConsignmentOrdersGridSearch(featureState.ordersSearchTerm);
}

function handleWorksheetSearchInput(inputElement) {
    featureState.worksheetSearchTerm = inputElement.value || "";
    updateSimpleConsignmentWorksheetGridSearch(featureState.worksheetSearchTerm);
}

function handleTransactionsSearchInput(inputElement) {
    featureState.transactionsSearchTerm = inputElement.value || "";
    updateSimpleConsignmentTransactionsGridSearch(featureState.transactionsSearchTerm);
}

function handleCheckoutDraftInput(target) {
    const mapping = {
        "simple-consignment-checkout-date": "checkoutDate",
        "simple-consignment-voucher": "manualVoucherNumber",
        "simple-consignment-team-name": "teamName",
        "simple-consignment-member-name": "teamMemberName",
        "simple-consignment-member-phone": "memberPhone",
        "simple-consignment-member-email": "memberEmail",
        "simple-consignment-venue": "venue",
        "simple-consignment-catalogue": "salesCatalogueId"
    };

    const key = mapping[target.id];
    if (!key) return;

    featureState.checkoutDraft = {
        ...featureState.checkoutDraft,
        [key]: target.value
    };
}

function handleTransactionDraftInput(target) {
    const mapping = {
        "simple-consignment-transaction-date": "transactionDate",
        "simple-consignment-transaction-type": "paymentType",
        "simple-consignment-transaction-mode": "paymentMode",
        "simple-consignment-transaction-amount": "amountApplied",
        "simple-consignment-transaction-reference": "reference",
        "simple-consignment-transaction-contact": "contact",
        "simple-consignment-transaction-notes": "notes"
    };

    const key = mapping[target.id];
    if (!key) return;

    featureState.transactionDraft = {
        ...featureState.transactionDraft,
        [key]: target.value
    };
}

function bindSimpleConsignmentEvents() {
    const root = document.getElementById("simple-consignment-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("input", event => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const ordersSearchInput = target.closest("#simple-consignment-orders-search");
        const worksheetSearchInput = target.closest("#simple-consignment-items-search");
        const transactionsSearchInput = target.closest("#simple-consignment-transactions-search");

        if (ordersSearchInput) {
            handleOrdersSearchInput(ordersSearchInput);
            return;
        }

        if (worksheetSearchInput) {
            handleWorksheetSearchInput(worksheetSearchInput);
            return;
        }

        if (transactionsSearchInput) {
            handleTransactionsSearchInput(transactionsSearchInput);
            return;
        }

        if (target.id === "simple-consignment-cancel-reason") {
            featureState.cancelReason = target.value || "";
            return;
        }

        if (target.id?.startsWith("simple-consignment-transaction-")) {
            handleTransactionDraftInput(target);
            return;
        }

        if (target.id?.startsWith("simple-consignment-")) {
            handleCheckoutDraftInput(target);
        }
    });

    root.addEventListener("change", event => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        if (target.id === "simple-consignment-catalogue") {
            void loadCatalogueItemsIntoWorkspace(target.value || "");
            return;
        }

        if (target.id?.startsWith("simple-consignment-transaction-")) {
            handleTransactionDraftInput(target);
            return;
        }

        if (target.id === "simple-consignment-cancel-reason") {
            featureState.cancelReason = target.value || "";
            return;
        }

        if (target.id?.startsWith("simple-consignment-")) {
            handleCheckoutDraftInput(target);
        }
    });

    root.addEventListener("submit", async event => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;

        if (form.id === "simple-consignment-checkout-form") {
            event.preventDefault();
            try {
                await handleCreateCheckoutSubmit();
            } catch (error) {
                console.error("[Moneta] Simple consignment checkout failed:", error);
                ProgressToast.showError(error?.message || "Could not create the consignment checkout.");
            }
            return;
        }

        if (form.id === "simple-consignment-transaction-form") {
            event.preventDefault();
            try {
                await handleRecordTransaction();
            } catch (error) {
                console.error("[Moneta] Simple consignment transaction failed:", error);
                ProgressToast.showError(error?.message || "Could not record the consignment transaction.");
            }
        }
    });

    root.addEventListener("click", async event => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const openOrderButton = target.closest(".simple-consignment-open-button");
        const cancelModeButton = target.closest(".simple-consignment-cancel-mode-button");
        const enterCancelModeButton = target.closest("#simple-consignment-enter-cancel-mode-button");
        const confirmCancelOrderButton = target.closest("#simple-consignment-cancel-order-confirm-button");
        const cancelOrderBackButton = target.closest("#simple-consignment-cancel-order-back-button");
        const saveProgressButton = target.closest("#simple-consignment-save-progress-button");
        const closeOrderButton = target.closest("#simple-consignment-close-order-button");
        const resetButton = target.closest("#simple-consignment-reset-button");
        const backButton = target.closest("#simple-consignment-back-button");
        const voidTransactionButton = target.closest(".simple-consignment-void-transaction-button");

        if (openOrderButton) {
            const orderId = openOrderButton.dataset.orderId || "";
            const order = featureState.orders.find(entry => entry.id === orderId) || null;
            if (!order) {
                showToast("The selected order could not be found.", "error", {
                    title: "Simple Consignment"
                });
                return;
            }
            openOrderWorkspace(order);
            return;
        }

        if (cancelModeButton || enterCancelModeButton) {
            const sourceOrderId = cancelModeButton?.dataset.orderId || featureState.activeOrderId || "";
            const order = featureState.orders.find(entry => entry.id === sourceOrderId) || null;
            if (!order) {
                showToast("The selected order could not be found.", "error", {
                    title: "Simple Consignment"
                });
                return;
            }

            openOrderCancelWorkspace(order);
            return;
        }

        if (cancelOrderBackButton) {
            const order = getActiveOrder();
            if (order) {
                openOrderWorkspace(order);
            } else {
                resetWorkspaceToCreate();
                renderSimpleConsignmentView();
            }
            return;
        }

        if (confirmCancelOrderButton) {
            try {
                await handleCancelOrder();
            } catch (error) {
                console.error("[Moneta] Simple consignment cancel failed:", error);
                ProgressToast.showError(error?.message || "Could not cancel the consignment order.");
            }
            return;
        }

        if (saveProgressButton) {
            try {
                await handleSaveSettlementProgress();
            } catch (error) {
                console.error("[Moneta] Simple consignment settlement save failed:", error);
                ProgressToast.showError(error?.message || "Could not save settlement progress.");
            }
            return;
        }

        if (closeOrderButton) {
            try {
                await handleCloseOrder();
            } catch (error) {
                console.error("[Moneta] Simple consignment close failed:", error);
                ProgressToast.showError(error?.message || "Could not close the consignment order.");
            }
            return;
        }

        if (resetButton || backButton) {
            resetWorkspaceToCreate();
            renderSimpleConsignmentView();
            return;
        }

        if (voidTransactionButton) {
            try {
                await handleVoidTransaction(voidTransactionButton);
            } catch (error) {
                console.error("[Moneta] Simple consignment transaction void failed:", error);
                ProgressToast.showError(error?.message || "Could not void the consignment transaction.");
            }
        }
    });

    root.dataset.bound = "true";
}

function ensureConsignmentCatalogueLoadedOnCreate(snapshot) {
    if (!isCreateMode()) return;

    const selectedCatalogueId = normalizeText(featureState.checkoutDraft.salesCatalogueId);
    if (!selectedCatalogueId) return;

    if (featureState.selectedCatalogueId === selectedCatalogueId && featureState.catalogueItemRows.length > 0) {
        return;
    }

    void loadCatalogueItemsIntoWorkspace(selectedCatalogueId);
}

export function renderSimpleConsignmentView() {
    const snapshot = getState();
    renderSimpleConsignmentViewShell(snapshot);
    bindSimpleConsignmentEvents();
    syncOrdersGrid();
    syncWorksheetGrid(snapshot);
    syncTransactionsGrid();
}

export function initializeSimpleConsignmentFeature() {
    subscribe(snapshot => {
        ensureOrdersListener(snapshot);
        ensureTransactionsListener(snapshot);

        if (snapshot.currentRoute === "#/simple-consignment") {
            ensureConsignmentCatalogueLoadedOnCreate(snapshot);
            renderSimpleConsignmentView();
        }
    });
}
