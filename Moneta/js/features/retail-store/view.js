import { getState, subscribe } from "../../app/store.js";
import { showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import {
    initializeRetailSalesGrid,
    initializeRetailWorksheetGrid,
    refreshRetailSalesGrid,
    refreshRetailWorksheetGrid,
    updateRetailSalesGridSearch,
    updateRetailWorksheetGridSearch
} from "./grid.js";
import { subscribeToRetailCatalogueItems, subscribeToRetailSales } from "./repository.js";
import {
    calculateRetailDraftSummary,
    RETAIL_DISCOUNT_TYPES,
    RETAIL_PAYMENT_TYPES,
    RETAIL_SALE_TYPES,
    RETAIL_STORES,
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
        orderDiscountType: "Percentage",
        orderDiscountPercentage: "",
        orderDiscountAmount: "",
        orderTaxPercentage: ""
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
    featureState.saleDraft = createDefaultSaleDraft();
    featureState.lineItemDrafts = {};
    clearCatalogueItemsSubscription();
}

function clearCatalogueItemsSubscription() {
    featureState.unsubscribeCatalogueItems?.();
    featureState.unsubscribeCatalogueItems = null;
    featureState.catalogueItemsListenerId = null;
    featureState.selectedCatalogueItems = [];
}

function buildRetailWorksheetRows(snapshot) {
    const categories = snapshot.masterData.categories || [];
    const products = snapshot.masterData.products || [];

    return (featureState.selectedCatalogueItems || []).map(item => {
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
            lineDiscountPercentage: Number(draft.lineDiscountPercentage) || 0
        };
    });
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
        invoiceTotal: Number(sale.financials?.grandTotal ?? sale.financials?.totalAmount) || 0,
        amountPaid: Number(sale.totalAmountPaid) || 0,
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
    const filteredHistoryCount = featureState.filteredSalesCount ?? featureState.sales.length;
    const paymentStatus = summary.grandTotal <= 0
        ? "Paid"
        : featureState.saleDraft.paymentType === "Pay Now"
            ? (summary.balanceDue <= 0 ? "Paid" : summary.appliedPayment > 0 ? "Partially Paid" : "Unpaid")
            : "Unpaid";

    root.innerHTML = `
        <div class="panel-card">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.retail}</span>
                    <div>
                        <h2>Retail Store</h2>
                        <p class="panel-copy">
                            Process direct store sales using active sales catalogues, worksheet-based product selection, and optional immediate payment capture.
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
                                    <input id="retail-sale-date" class="input" type="date" value="${featureState.saleDraft.saleDate}" required>
                                </div>
                                <div class="field">
                                    <label for="retail-voucher-number">Manual Voucher # <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="retail-voucher-number" class="input" type="text" value="${featureState.saleDraft.manualVoucherNumber}" placeholder="TT-APR-001" required>
                                </div>
                                <div class="field field-wide">
                                    <label for="retail-customer-name">Customer Name <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="retail-customer-name" class="input" type="text" value="${featureState.saleDraft.customerName}" placeholder="Customer name" required>
                                </div>
                                <div class="field">
                                    <label for="retail-customer-phone">Phone</label>
                                    <input id="retail-customer-phone" class="input" type="tel" value="${featureState.saleDraft.customerPhone}" placeholder="Customer phone">
                                </div>
                                <div class="field">
                                    <label for="retail-customer-email">Email</label>
                                    <input id="retail-customer-email" class="input" type="email" value="${featureState.saleDraft.customerEmail}" placeholder="Customer email">
                                </div>
                                <div class="field field-full" ${isTastyTreats ? "" : "hidden"}>
                                    <label for="retail-customer-address">Customer Address <span class="required-mark" aria-hidden="true">*</span></label>
                                    <textarea id="retail-customer-address" class="textarea" placeholder="Delivery address for Tasty Treats orders">${featureState.saleDraft.customerAddress}</textarea>
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
                                    <select id="retail-store" class="select" required>
                                        <option value="">Select store</option>
                                        ${renderStoreOptions(featureState.saleDraft.store)}
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="retail-sale-type">Sale Type <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="retail-sale-type" class="select" required>
                                        <option value="">Select sale type</option>
                                        ${renderSaleTypeOptions(featureState.saleDraft.saleType)}
                                    </select>
                                </div>
                                <div class="field field-full">
                                    <label for="retail-sales-catalogue">Sales Catalogue <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="retail-sales-catalogue" class="select" required>
                                        <option value="">Select catalogue</option>
                                        ${renderSalesCatalogueOptions(snapshot, featureState.saleDraft.salesCatalogueId)}
                                    </select>
                                </div>
                                <div class="field field-full">
                                    <label for="retail-sale-notes">Sale Notes</label>
                                    <textarea id="retail-sale-notes" class="textarea" placeholder="Optional notes for this retail sale">${featureState.saleDraft.saleNotes}</textarea>
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
                                    <select id="retail-payment-type" class="select" ${isSampleSale ? "disabled" : ""} required>
                                        ${renderPaymentTypeOptions(featureState.saleDraft.paymentType)}
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="retail-payment-mode">Payment Mode ${isPayNow ? '<span class="required-mark" aria-hidden="true">*</span>' : ""}</label>
                                    <select id="retail-payment-mode" class="select" ${isPayNow ? "" : "disabled"}>
                                        <option value="">Select payment mode</option>
                                        ${renderPaymentModeOptions(snapshot, featureState.saleDraft.paymentMode)}
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="retail-amount-received">Amount Received ${isPayNow ? '<span class="required-mark" aria-hidden="true">*</span>' : ""}</label>
                                    <input id="retail-amount-received" class="input" type="number" min="0" step="0.01" value="${featureState.saleDraft.amountReceived}" ${isPayNow ? "" : "disabled"} placeholder="0.00">
                                </div>
                                <div class="field field-full">
                                    <label for="retail-transaction-ref">Payment Reference ${isPayNow ? '<span class="required-mark" aria-hidden="true">*</span>' : ""}</label>
                                    <input id="retail-transaction-ref" class="input" type="text" value="${featureState.saleDraft.transactionRef}" ${isPayNow ? "" : "disabled"} placeholder="UPI / Cash Ref / Card Slip">
                                </div>
                                <div class="field field-full">
                                    <label for="retail-payment-notes">Payment Notes</label>
                                    <textarea id="retail-payment-notes" class="textarea" ${isPayNow ? "" : "disabled"} placeholder="Optional notes about the payment">${featureState.saleDraft.paymentNotes}</textarea>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div class="retail-product-list-shell">
                        <div class="panel-card">
                            <div class="panel-header">
                                <div class="panel-title-wrap">
                                    <span class="panel-icon">${icons.products}</span>
                                    <div>
                                        <h3>Product List</h3>
                                        <p class="panel-copy">
                                            Search the selected catalogue, then set Qty greater than zero to include products in this sale. Pricing comes directly from the active catalogue.
                                        </p>
                                    </div>
                                </div>
                                <div class="toolbar-meta">
                                    <span class="status-pill">${selectedCatalogueLabel}</span>
                                    <span class="status-pill">${summary.totalQuantity} total qty</span>
                                </div>
                            </div>
                            <div class="panel-body">
                                <div class="toolbar">
                                    <div>
                                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Worksheet</p>
                                        <p class="panel-copy">Use the line discount field for product-specific promos, then finish with invoice-level discount and tax below.</p>
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
                                        <p class="panel-copy">Invoice-level discount and tax are applied after the product level items are calculated.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-body">
                                <div class="purchase-adjustments-grid">
                                    <div class="field">
                                        <label for="retail-order-discount-type">Discount Type</label>
                                        <select id="retail-order-discount-type" class="select">
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
                                            ${featureState.saleDraft.orderDiscountType === "Percentage" ? "" : "disabled"}>
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
                                            ${featureState.saleDraft.orderDiscountType === "Fixed" ? "" : "disabled"}>
                                    </div>
                                    <div class="field">
                                        <label for="retail-order-tax-percentage">Invoice Tax %</label>
                                        <input
                                            id="retail-order-tax-percentage"
                                            class="input"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value="${featureState.saleDraft.orderTaxPercentage}">
                                    </div>
                                </div>

                                <div class="purchase-summary-grid">
                                    <article class="summary-card">
                                        <p class="summary-label">Subtotal</p>
                                        <p class="summary-value">${formatCurrency(summary.itemsSubtotal)}</p>
                                    </article>
                                    <article class="summary-card">
                                        <p class="summary-label">Line Discount</p>
                                        <p class="summary-value">${formatCurrency(summary.totalLineDiscount)}</p>
                                    </article>
                                    <article class="summary-card">
                                        <p class="summary-label">Invoice Discount</p>
                                        <p class="summary-value">${formatCurrency(summary.orderDiscountAmount)}</p>
                                    </article>
                                    <article class="summary-card">
                                        <p class="summary-label">Tax</p>
                                        <p class="summary-value">${formatCurrency(summary.totalTax)}</p>
                                    </article>
                                </div>
                                <div class="retail-summary-grid">
                                    <article class="summary-card retail-summary-card-strong">
                                        <p class="summary-label">Grand Total</p>
                                        <p class="summary-value">${formatCurrency(summary.grandTotal)}</p>
                                    </article>
                                    <article class="summary-card">
                                        <p class="summary-label">Applied Payment</p>
                                        <p class="summary-value">${formatCurrency(summary.appliedPayment)}</p>
                                    </article>
                                    <article class="summary-card">
                                        <p class="summary-label">Balance Due</p>
                                        <p class="summary-value">${formatCurrency(summary.balanceDue)}</p>
                                    </article>
                                    <article class="summary-card">
                                        <p class="summary-label">Payment Status</p>
                                        <p class="summary-value retail-summary-status">${paymentStatus}</p>
                                    </article>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button id="retail-reset-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            Reset
                        </button>
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${icons.plus}</span>
                            Save Retail Sale
                        </button>
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
                        <p class="panel-copy">Payment management and void sale actions will build on top of this history grid next.</p>
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
    `;
}

function syncRetailWorksheetGrid() {
    const snapshot = getState();
    const gridElement = document.getElementById("retail-worksheet-grid");
    initializeRetailWorksheetGrid(gridElement, rows => {
        featureState.lineItemDrafts = Object.fromEntries(rows.map(row => [row.productId, {
            quantity: Number(row.quantity) || 0,
            lineDiscountPercentage: Number(row.lineDiscountPercentage) || 0
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

function ensureRetailSalesListener(snapshot) {
    if (!snapshot.currentUser || snapshot.currentRoute !== "#/retail-store") {
        featureState.unsubscribeSales?.();
        featureState.unsubscribeSales = null;
        featureState.sales = [];
        return;
    }

    if (featureState.unsubscribeSales) return;

    featureState.unsubscribeSales = subscribeToRetailSales(
        snapshot.currentUser,
        rows => {
            featureState.sales = rows;

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
    renderRetailStoreViewShell(snapshot);
    syncRetailWorksheetGrid();
    syncRetailSalesGrid();
}

function updateDraftField(field, value) {
    featureState.saleDraft[field] = value;
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
        "retail-order-discount-percentage": "orderDiscountPercentage",
        "retail-order-discount-amount": "orderDiscountAmount",
        "retail-order-tax-percentage": "orderTaxPercentage"
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

    const field = fieldMap[target.id];
    if (!field) return;

    updateDraftField(field, target.value || "");

    if (["retail-amount-received", "retail-order-discount-percentage", "retail-order-discount-amount", "retail-order-tax-percentage"].includes(target.id)) {
        renderRetailStoreView();
    }
}

function handleRetailChange(target) {
    switch (target.id) {
        case "retail-store":
            updateDraftField("store", target.value || "");
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
        case "retail-order-discount-type":
            updateDraftField("orderDiscountType", target.value || "Percentage");
            if (featureState.saleDraft.orderDiscountType === "Fixed") {
                featureState.saleDraft.orderDiscountPercentage = "";
            } else {
                featureState.saleDraft.orderDiscountAmount = "";
            }
            renderRetailStoreView();
            return;
        default:
            break;
    }
}

async function handleRetailSaleSubmit(event) {
    event.preventDefault();

    try {
        const snapshot = getState();
        const customerName = normalizeText(featureState.saleDraft.customerName) || "-";
        const selectedStore = normalizeText(featureState.saleDraft.store) || "-";
        const selectedCatalogueLabel = snapshot.masterData.salesCatalogues
            ?.find(catalogue => catalogue.id === featureState.saleDraft.salesCatalogueId)?.catalogueName || "-";

        const result = await runProgressToastFlow({
            title: "Saving Retail Sale",
            initialMessage: "Reading the retail workspace...",
            initialProgress: 14,
            initialStep: "Step 1 of 5",
            successTitle: "Retail Sale Saved",
            successMessage: "The retail sale was saved successfully."
        }, async ({ update }) => {
            update("Validating the customer, catalogue, product worksheet, and settlement details...", 34, "Step 2 of 5");

            update("Writing the sale and payment data to the database...", 74, "Step 3 of 5");
            const result = await saveRetailSale({
                ...featureState.saleDraft,
                lineItems: buildRetailWorksheetRows(snapshot)
            }, snapshot.currentUser, snapshot.masterData.salesCatalogues, featureState.selectedCatalogueItems);

            update("Refreshing retail history and inventory-aware worksheet context...", 90, "Step 4 of 5");
            resetRetailWorkspace();
            renderRetailStoreView();
            update("Retail history is up to date.", 96, "Step 5 of 5");
            return result;
        });

        showToast("Retail sale saved.", "success", {
            title: "Retail Store"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Retail Sale Saved",
            message: "The direct sale has been recorded successfully.",
            details: [
                { label: "Customer", value: customerName },
                { label: "Store", value: selectedStore },
                { label: "Catalogue", value: selectedCatalogueLabel },
                { label: "Payment Status", value: result.summary.paymentStatus },
                { label: "Grand Total", value: formatCurrency(result.summary.grandTotal) }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Retail sale save failed:", error);
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

    await showSummaryModal({
        title: "Retail Sale Summary",
        message: "Here is a quick summary of the selected retail sale.",
        details: [
            { label: "Sale ID", value: sale.saleId || "-" },
            { label: "Voucher #", value: sale.manualVoucherNumber || "-" },
            { label: "Date", value: toDateInputValue(sale.saleDate) || "-" },
            { label: "Customer", value: sale.customerInfo?.name || "-" },
            { label: "Store", value: sale.store || "-" },
            { label: "Sale Type", value: sale.saleType || "-" },
            { label: "Products", value: String(Number(sale.lineItemCount) || (sale.lineItems || []).length || 0) },
            { label: "Invoice Total", value: formatCurrency(Number(sale.financials?.grandTotal ?? sale.financials?.totalAmount) || 0) },
            { label: "Amount Paid", value: formatCurrency(Number(sale.totalAmountPaid) || 0) },
            { label: "Balance Due", value: formatCurrency(Number(sale.balanceDue) || 0) },
            { label: "Payment Status", value: sale.paymentStatus || "Unpaid" }
        ]
    });
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
        }
    });

    root.addEventListener("click", event => {
        const resetButton = event.target.closest("#retail-reset-button");
        const viewButton = event.target.closest(".retail-sale-view-button");

        if (resetButton) {
            handleRetailReset();
            return;
        }

        if (viewButton) {
            handleRetailSaleView(viewButton);
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
