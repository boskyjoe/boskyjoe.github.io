import { getState } from "../../app/store.js";
import { COLLECTIONS } from "../../config/collections.js";
import { navConfig } from "../../config/nav-config.js";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_DOCS_PER_COLLECTION = 240;
const LOW_STOCK_THRESHOLD = 5;
const WINDOW_OPTIONS = [
    { key: "today", label: "Today" },
    { key: "7d", label: "Last 7 Days" },
    { key: "30d", label: "Last 30 Days" }
];

const featureState = {
    userKey: "",
    selectedWindow: "30d",
    isLoading: false,
    source: "live",
    loadedAt: 0,
    expiresAt: 0,
    data: null,
    errorMessage: "",
    requestToken: 0
};

function normalizeText(value) {
    return (value || "").trim();
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function toNumber(value) {
    return Number(value) || 0;
}

function toDateValue(value) {
    if (!value) return new Date(0);
    if (typeof value.toDate === "function") return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatSignedCurrency(value) {
    const amount = toNumber(value);
    if (amount > 0) return `+${formatCurrency(amount)}`;
    if (amount < 0) return `-${formatCurrency(Math.abs(amount))}`;
    return formatCurrency(0);
}

function getWindowStart(windowKey) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (windowKey === "today") {
        return start;
    }

    if (windowKey === "7d") {
        start.setDate(start.getDate() - 6);
        return start;
    }

    start.setDate(start.getDate() - 29);
    return start;
}

function getWindowLabel(windowKey) {
    return WINDOW_OPTIONS.find(option => option.key === windowKey)?.label || "Last 30 Days";
}

function buildCacheKey(user, windowKey) {
    const identity = user?.uid || user?.email || "anonymous";
    return `moneta.dashboard.snapshot.v1.${identity}.${windowKey}`;
}

function readDashboardCache(user, windowKey) {
    const cacheKey = buildCacheKey(user, windowKey);

    try {
        const raw = sessionStorage.getItem(cacheKey);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;

        if (!parsed.expiresAt || Date.now() > Number(parsed.expiresAt)) {
            sessionStorage.removeItem(cacheKey);
            return null;
        }

        if (!parsed.data) return null;

        return parsed;
    } catch (error) {
        console.warn("[Moneta] Failed to read dashboard cache:", error);
        return null;
    }
}

function writeDashboardCache(user, windowKey, data, loadedAt) {
    const cacheKey = buildCacheKey(user, windowKey);
    const expiresAt = loadedAt + CACHE_TTL_MS;

    try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
            loadedAt,
            expiresAt,
            data
        }));
    } catch (error) {
        console.warn("[Moneta] Failed to write dashboard cache:", error);
    }

    return expiresAt;
}

function roleCanAccess(route, role) {
    const navItem = navConfig.find(item => item.type === "link" && item.route === route);
    if (!navItem) return false;
    return navItem.roles.includes(role);
}

function getDashboardProfile(user) {
    const role = user?.role || "guest";
    const canLeads = roleCanAccess("#/leads", role);
    const canRetail = roleCanAccess("#/retail-store", role);
    const canConsignment = roleCanAccess("#/simple-consignment", role);
    const canPurchases = roleCanAccess("#/purchases", role);
    const canSuppliers = roleCanAccess("#/suppliers", role);
    const canProducts = roleCanAccess("#/products", role);
    const canFinance = role === "admin" || role === "finance";
    const scopeToOwnData = ["sales_staff", "team_lead", "guest"].includes(role);

    return {
        role,
        canLeads,
        canRetail,
        canConsignment,
        canPurchases,
        canSuppliers,
        canProducts,
        canFinance,
        canCashFlow: canFinance || role === "inventory_manager",
        scopeToOwnData
    };
}

function sortRowsByDateDesc(rows = [], dateField) {
    return [...rows].sort((left, right) => {
        return toDateValue(right?.[dateField]).getTime() - toDateValue(left?.[dateField]).getTime();
    });
}

function filterRowsByWindow(rows = [], dateField, startDate) {
    if (!startDate || !dateField) return rows;
    return rows.filter(row => toDateValue(row?.[dateField]).getTime() >= startDate.getTime());
}

async function fetchWindowedRows(path, {
    dateField = "",
    startDate = null,
    createdBy = "",
    maxDocs = MAX_DOCS_PER_COLLECTION
} = {}) {
    const db = firebase.firestore();

    try {
        let query = db.collection(path);

        if (createdBy) {
            query = query.where("createdBy", "==", createdBy).limit(maxDocs);
            const scopedSnapshot = await query.get();
            const scopedRows = scopedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return sortRowsByDateDesc(filterRowsByWindow(scopedRows, dateField, startDate), dateField).slice(0, maxDocs);
        }

        if (dateField && startDate) {
            query = query.where(dateField, ">=", startDate);
        }

        if (dateField) {
            query = query.orderBy(dateField, "desc");
        }

        query = query.limit(maxDocs);

        const snapshot = await query.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.warn(`[Moneta] Dashboard query fallback for ${path}:`, error);
        const fallbackSnapshot = await db.collection(path).limit(maxDocs).get();
        const fallbackRows = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return sortRowsByDateDesc(filterRowsByWindow(fallbackRows, dateField, startDate), dateField).slice(0, maxDocs);
    }
}

function computeLeadSummary(leads = []) {
    const now = Date.now();
    const summary = {
        total: leads.length,
        open: 0,
        qualified: 0,
        converted: 0,
        lost: 0,
        readyToConvert: 0,
        agingOpen: 0
    };

    leads.forEach(lead => {
        const status = normalizeText(lead.leadStatus || "New");
        const statusLower = status.toLowerCase();
        const isOpen = statusLower !== "converted" && statusLower !== "lost";

        if (isOpen) {
            summary.open += 1;
            const enquiryDate = toDateValue(lead.enquiryDate).getTime();
            if (enquiryDate > 0) {
                const ageInDays = Math.floor((now - enquiryDate) / (24 * 60 * 60 * 1000));
                if (ageInDays >= 3) {
                    summary.agingOpen += 1;
                }
            }
        }

        if (statusLower === "qualified") {
            summary.qualified += 1;
        }
        if (statusLower === "converted") {
            summary.converted += 1;
        }
        if (statusLower === "lost") {
            summary.lost += 1;
        }

        const hasRequestedProducts = (lead.requestedProducts || []).some(item => (toNumber(item.requestedQty) || 0) > 0);
        if (
            statusLower !== "converted"
            && statusLower !== "lost"
            && normalizeText(lead.catalogueId)
            && hasRequestedProducts
        ) {
            summary.readyToConvert += 1;
        }
    });

    return summary;
}

function computeRetailSummary(sales = []) {
    const summary = {
        totalSales: 0,
        paymentReceived: 0,
        balanceDue: 0,
        expenses: 0,
        returnCount: 0,
        activeCount: 0,
        overdueCount: 0,
        byStore: {
            "Tasty Treats": { totalSales: 0, paymentReceived: 0, balanceDue: 0, expenses: 0, count: 0 },
            "Church Store": { totalSales: 0, paymentReceived: 0, balanceDue: 0, expenses: 0, count: 0 }
        }
    };
    const now = Date.now();

    (sales || []).forEach(sale => {
        const saleStatus = normalizeText(sale.saleStatus || "Active").toLowerCase();
        if (saleStatus === "voided") return;

        const totalSales = toNumber(sale.financials?.grandTotal);
        const paymentReceived = toNumber(sale.totalAmountPaid);
        const balanceDue = toNumber(sale.balanceDue);
        const expenses = toNumber(sale.financials?.totalExpenses);
        const returnCount = Math.max(0, Math.floor(toNumber(sale.returnCount)));
        const saleDate = toDateValue(sale.saleDate).getTime();
        const ageInDays = saleDate > 0 ? Math.floor((now - saleDate) / (24 * 60 * 60 * 1000)) : 0;

        summary.totalSales += totalSales;
        summary.paymentReceived += paymentReceived;
        summary.balanceDue += balanceDue;
        summary.expenses += expenses;
        summary.returnCount += returnCount;
        summary.activeCount += 1;

        if (balanceDue > 0 && ageInDays >= 7) {
            summary.overdueCount += 1;
        }

        const storeName = normalizeText(sale.store);
        if (summary.byStore[storeName]) {
            summary.byStore[storeName].totalSales += totalSales;
            summary.byStore[storeName].paymentReceived += paymentReceived;
            summary.byStore[storeName].balanceDue += balanceDue;
            summary.byStore[storeName].expenses += expenses;
            summary.byStore[storeName].count += 1;
        }
    });

    summary.totalSales = roundCurrency(summary.totalSales);
    summary.paymentReceived = roundCurrency(summary.paymentReceived);
    summary.balanceDue = roundCurrency(summary.balanceDue);
    summary.expenses = roundCurrency(summary.expenses);

    Object.keys(summary.byStore).forEach(storeName => {
        summary.byStore[storeName] = {
            ...summary.byStore[storeName],
            totalSales: roundCurrency(summary.byStore[storeName].totalSales),
            paymentReceived: roundCurrency(summary.byStore[storeName].paymentReceived),
            balanceDue: roundCurrency(summary.byStore[storeName].balanceDue),
            expenses: roundCurrency(summary.byStore[storeName].expenses)
        };
    });

    return summary;
}

function computePurchaseSummary(purchases = []) {
    const summary = {
        invoiceTotal: 0,
        amountPaid: 0,
        balanceDue: 0,
        activeInvoices: 0,
        overdueCount: 0
    };
    const now = Date.now();

    (purchases || []).forEach(invoice => {
        const invoiceStatus = normalizeText(invoice.invoiceStatus || "").toLowerCase();
        if (invoiceStatus === "voided") return;

        const invoiceTotal = toNumber(invoice.invoiceTotal);
        const amountPaid = toNumber(invoice.amountPaid);
        const balanceDue = toNumber(invoice.balanceDue ?? Math.max(invoiceTotal - amountPaid, 0));
        const purchaseDate = toDateValue(invoice.purchaseDate).getTime();
        const ageInDays = purchaseDate > 0 ? Math.floor((now - purchaseDate) / (24 * 60 * 60 * 1000)) : 0;

        summary.invoiceTotal += invoiceTotal;
        summary.amountPaid += amountPaid;
        summary.balanceDue += balanceDue;
        summary.activeInvoices += 1;

        if (balanceDue > 0 && ageInDays >= 10) {
            summary.overdueCount += 1;
        }
    });

    summary.invoiceTotal = roundCurrency(summary.invoiceTotal);
    summary.amountPaid = roundCurrency(summary.amountPaid);
    summary.balanceDue = roundCurrency(summary.balanceDue);

    return summary;
}

function computeConsignmentSummary(orders = []) {
    const summary = {
        checkedOutValue: 0,
        soldValue: 0,
        paymentReceived: 0,
        balanceDue: 0,
        expenses: 0,
        activeOrders: 0,
        settlementDueCount: 0
    };
    const now = Date.now();

    (orders || []).forEach(order => {
        const status = normalizeText(order.status || "Active").toLowerCase();
        if (status === "cancelled") return;

        const checkedOutValue = toNumber(order.totalValueCheckedOut);
        const soldValue = toNumber(order.totalValueSold);
        const paymentReceived = toNumber(order.totalAmountPaid);
        const balanceDue = toNumber(order.balanceDue);
        const expenses = toNumber(order.totalExpenses);
        const checkoutDate = toDateValue(order.checkoutDate).getTime();
        const ageInDays = checkoutDate > 0 ? Math.floor((now - checkoutDate) / (24 * 60 * 60 * 1000)) : 0;

        summary.checkedOutValue += checkedOutValue;
        summary.soldValue += soldValue;
        summary.paymentReceived += paymentReceived;
        summary.balanceDue += balanceDue;
        summary.expenses += expenses;

        if (status === "active") {
            summary.activeOrders += 1;
        }

        if (status === "active" && balanceDue > 0 && ageInDays >= 7) {
            summary.settlementDueCount += 1;
        }
    });

    summary.checkedOutValue = roundCurrency(summary.checkedOutValue);
    summary.soldValue = roundCurrency(summary.soldValue);
    summary.paymentReceived = roundCurrency(summary.paymentReceived);
    summary.balanceDue = roundCurrency(summary.balanceDue);
    summary.expenses = roundCurrency(summary.expenses);

    return summary;
}

function computeCashSummary({
    salesPayments = [],
    supplierPayments = [],
    consignmentPayments = []
}) {
    const totals = {
        retailInflow: 0,
        consignmentInflow: 0,
        supplierOutflow: 0
    };

    (salesPayments || []).forEach(payment => {
        const status = normalizeText(payment.status || payment.paymentStatus || "Verified").toLowerCase();
        if (status === "voided") return;
        if (payment.isReversalEntry) return;
        totals.retailInflow += toNumber(payment.amountPaid ?? payment.totalCollected);
    });

    (consignmentPayments || []).forEach(payment => {
        const status = normalizeText(payment.status || "Verified").toLowerCase();
        if (status === "voided" || status === "reversal") return;
        if (payment.isReversalEntry) return;
        totals.consignmentInflow += toNumber(payment.amountPaid ?? payment.totalCollected);
    });

    (supplierPayments || []).forEach(payment => {
        const status = normalizeText(payment.status || payment.paymentStatus || "Verified").toLowerCase();
        if (status === "voided") return;
        if (payment.isReversalEntry) return;
        totals.supplierOutflow += toNumber(payment.amountPaid);
    });

    totals.retailInflow = roundCurrency(totals.retailInflow);
    totals.consignmentInflow = roundCurrency(totals.consignmentInflow);
    totals.supplierOutflow = roundCurrency(totals.supplierOutflow);

    return {
        ...totals,
        netCash: roundCurrency((totals.retailInflow + totals.consignmentInflow) - totals.supplierOutflow)
    };
}

function computeStockSummary(products = [], threshold = LOW_STOCK_THRESHOLD) {
    const lowStockRows = (products || [])
        .filter(product => {
            return Math.max(0, Math.floor(toNumber(product.inventoryCount))) <= threshold;
        })
        .sort((left, right) => {
            return toNumber(left.inventoryCount) - toNumber(right.inventoryCount);
        });

    return {
        threshold,
        totalProducts: (products || []).length,
        lowStockCount: lowStockRows.length,
        lowStockRows: lowStockRows.slice(0, 6)
    };
}

function buildActionQueue(profile, metrics) {
    const items = [];

    if (profile.canLeads && metrics.leads.readyToConvert > 0) {
        items.push({
            tone: "primary",
            title: "Leads Ready For Conversion",
            value: `${metrics.leads.readyToConvert}`,
            description: "Qualified enquiries are ready to convert into Retail draft sales.",
            route: "#/leads",
            actionLabel: "Open Enquiries"
        });
    }

    if (profile.canRetail && metrics.retail.overdueCount > 0) {
        items.push({
            tone: "danger",
            title: "Overdue Retail Balances",
            value: `${metrics.retail.overdueCount}`,
            description: "Active sales older than 7 days still have balance due.",
            route: "#/retail-store",
            actionLabel: "Open Retail Store"
        });
    }

    if (profile.canPurchases && metrics.purchases.overdueCount > 0) {
        items.push({
            tone: "warning",
            title: "Supplier Dues Pending",
            value: `${metrics.purchases.overdueCount}`,
            description: "Purchase invoices older than 10 days still have outstanding balances.",
            route: "#/purchases",
            actionLabel: "Open Purchases"
        });
    }

    if (!profile.canPurchases && profile.canSuppliers && metrics.purchases.overdueCount > 0) {
        items.push({
            tone: "warning",
            title: "Supplier Dues Pending",
            value: `${metrics.purchases.overdueCount}`,
            description: "Outstanding purchase balances are pending follow-up with suppliers.",
            route: "#/suppliers",
            actionLabel: "Open Suppliers"
        });
    }

    if (profile.canConsignment && metrics.consignment.settlementDueCount > 0) {
        items.push({
            tone: "warning",
            title: "Consignment Settlements Pending",
            value: `${metrics.consignment.settlementDueCount}`,
            description: "Active consignment orders need collection or settlement updates.",
            route: "#/simple-consignment",
            actionLabel: "Open Consignment"
        });
    }

    if (profile.canProducts && metrics.stock.lowStockCount > 0) {
        items.push({
            tone: "danger",
            title: "Low Stock Alert",
            value: `${metrics.stock.lowStockCount}`,
            description: `SKUs at or below ${metrics.stock.threshold} units.`,
            route: "#/products",
            actionLabel: "Open Products"
        });
    }

    return items;
}

function buildQuickActions(profile) {
    const actions = [
        { route: "#/leads", icon: icons.leads, label: "New Enquiry", enabled: profile.canLeads },
        { route: "#/retail-store", icon: icons.retail, label: "Retail Sale", enabled: profile.canRetail },
        { route: "#/simple-consignment", icon: icons.consignment, label: "Consignment", enabled: profile.canConsignment },
        { route: "#/purchases", icon: icons.purchases, label: "Purchase Invoice", enabled: profile.canPurchases },
        { route: "#/suppliers", icon: icons.suppliers, label: "Suppliers", enabled: profile.canSuppliers },
        { route: "#/products", icon: icons.products, label: "Products", enabled: profile.canProducts }
    ];

    return actions.filter(action => action.enabled);
}

function buildPrimaryMetricCards(profile, metrics) {
    const cards = [];

    if (profile.canRetail) {
        cards.push({
            title: "Retail Sales",
            value: formatCurrency(metrics.retail.totalSales),
            meta: `${metrics.retail.activeCount} active invoices`,
            tone: "primary"
        });
        cards.push({
            title: "Retail Balance Due",
            value: formatCurrency(metrics.retail.balanceDue),
            meta: `${metrics.retail.overdueCount} overdue`,
            tone: metrics.retail.balanceDue > 0 ? "danger" : "success"
        });
    }

    if (profile.canLeads) {
        cards.push({
            title: "Open Leads",
            value: String(metrics.leads.open),
            meta: `${metrics.leads.qualified} qualified`,
            tone: "primary"
        });
        cards.push({
            title: "Ready To Convert",
            value: String(metrics.leads.readyToConvert),
            meta: `${metrics.leads.agingOpen} aging open leads`,
            tone: metrics.leads.readyToConvert > 0 ? "warning" : "neutral"
        });
    }

    if (profile.canPurchases || profile.canFinance) {
        cards.push({
            title: "Supplier Payables",
            value: formatCurrency(metrics.purchases.balanceDue),
            meta: `${metrics.purchases.activeInvoices} invoices`,
            tone: metrics.purchases.balanceDue > 0 ? "danger" : "success"
        });
    }

    if (profile.canProducts) {
        cards.push({
            title: "Low Stock SKUs",
            value: String(metrics.stock.lowStockCount),
            meta: `Threshold <= ${metrics.stock.threshold}`,
            tone: metrics.stock.lowStockCount > 0 ? "warning" : "success"
        });
    }

    if (profile.canCashFlow) {
        cards.push({
            title: "Net Cash Position",
            value: formatSignedCurrency(metrics.cash.netCash),
            meta: "Inflow - Outflow",
            tone: metrics.cash.netCash >= 0 ? "success" : "danger"
        });
    }

    return cards.slice(0, 6);
}

async function buildDashboardData(user, selectedWindow) {
    const startedAt = performance.now();
    const startDate = getWindowStart(selectedWindow);
    const profile = getDashboardProfile(user);
    const scopedEmail = profile.scopeToOwnData ? normalizeText(user?.email) : "";

    const [
        leads,
        sales,
        purchases,
        consignments,
        salesPayments,
        supplierPayments,
        consignmentPayments
    ] = await Promise.all([
        profile.canLeads
            ? fetchWindowedRows(COLLECTIONS.leads, { dateField: "enquiryDate", startDate, createdBy: scopedEmail })
            : Promise.resolve([]),
        profile.canRetail || profile.canFinance
            ? fetchWindowedRows(COLLECTIONS.salesInvoices, { dateField: "saleDate", startDate, createdBy: scopedEmail })
            : Promise.resolve([]),
        profile.canPurchases || profile.canFinance
            ? fetchWindowedRows(COLLECTIONS.purchaseInvoices, { dateField: "purchaseDate", startDate })
            : Promise.resolve([]),
        profile.canConsignment
            ? fetchWindowedRows(COLLECTIONS.simpleConsignments, { dateField: "checkoutDate", startDate, createdBy: scopedEmail })
            : Promise.resolve([]),
        profile.canCashFlow
            ? fetchWindowedRows(COLLECTIONS.salesPaymentsLedger, { dateField: "paymentDate", startDate })
            : Promise.resolve([]),
        profile.canCashFlow
            ? fetchWindowedRows(COLLECTIONS.supplierPaymentsLedger, { dateField: "paymentDate", startDate })
            : Promise.resolve([]),
        profile.canCashFlow || profile.canConsignment
            ? fetchWindowedRows(COLLECTIONS.consignmentPaymentsLedger, { dateField: "paymentDate", startDate })
            : Promise.resolve([])
    ]);

    const products = getState().masterData.products || [];
    const metrics = {
        leads: computeLeadSummary(leads),
        retail: computeRetailSummary(sales),
        purchases: computePurchaseSummary(purchases),
        consignment: computeConsignmentSummary(consignments),
        cash: computeCashSummary({
            salesPayments,
            supplierPayments,
            consignmentPayments
        }),
        stock: computeStockSummary(products, LOW_STOCK_THRESHOLD)
    };

    return {
        profile,
        windowLabel: getWindowLabel(selectedWindow),
        startDate,
        generatedAt: Date.now(),
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        metrics,
        actionQueue: buildActionQueue(profile, metrics),
        quickActions: buildQuickActions(profile),
        primaryCards: buildPrimaryMetricCards(profile, metrics)
    };
}

function buildWindowButtonsMarkup() {
    return WINDOW_OPTIONS.map(option => {
        const isActive = featureState.selectedWindow === option.key;
        return `
            <button
                class="button dashboard-window-button ${isActive ? "is-active" : ""}"
                type="button"
                data-dashboard-window="${option.key}"
                ${featureState.isLoading ? "disabled" : ""}>
                ${option.label}
            </button>
        `;
    }).join("");
}

function renderPrimaryCards(cards = []) {
    if (!cards.length) {
        return `
            <article class="dashboard-kpi-card tone-neutral">
                <p class="dashboard-kpi-title">No KPI Data</p>
                <p class="dashboard-kpi-value">-</p>
                <p class="dashboard-kpi-meta">Dashboard data will appear based on your role access.</p>
            </article>
        `;
    }

    return cards.map(card => `
        <article class="dashboard-kpi-card tone-${card.tone || "neutral"}">
            <p class="dashboard-kpi-title">${card.title}</p>
            <p class="dashboard-kpi-value">${card.value}</p>
            <p class="dashboard-kpi-meta">${card.meta}</p>
        </article>
    `).join("");
}

function renderActionQueue(queue = []) {
    if (!queue.length) {
        return `
            <div class="dashboard-list-empty">
                No immediate action blockers in this window.
            </div>
        `;
    }

    return `
        <ul class="dashboard-list">
            ${queue.map(item => `
                <li class="dashboard-list-item tone-${item.tone || "neutral"}">
                    <div class="dashboard-list-item-main">
                        <p class="dashboard-list-item-title">${item.title}</p>
                        <p class="dashboard-list-item-copy">${item.description}</p>
                    </div>
                    <div class="dashboard-list-item-meta">
                        <span class="status-pill">${item.value}</span>
                        <a class="button button-secondary dashboard-inline-action" href="${item.route}">
                            ${item.actionLabel}
                        </a>
                    </div>
                </li>
            `).join("")}
        </ul>
    `;
}

function renderLowStockList(stock = {}) {
    if (!stock.lowStockRows || stock.lowStockRows.length === 0) {
        return `
            <div class="dashboard-list-empty">
                No low-stock products at or below ${stock.threshold || LOW_STOCK_THRESHOLD}.
            </div>
        `;
    }

    return `
        <ul class="dashboard-list">
            ${stock.lowStockRows.map(product => `
                <li class="dashboard-list-item tone-warning">
                    <div class="dashboard-list-item-main">
                        <p class="dashboard-list-item-title">${product.itemName || product.productName || "Untitled Product"}</p>
                        <p class="dashboard-list-item-copy">${product.productCategoryName || product.categoryName || "Uncategorized"}</p>
                    </div>
                    <div class="dashboard-list-item-meta">
                        <span class="status-pill">Stock: ${Math.max(0, Math.floor(toNumber(product.inventoryCount)))}</span>
                    </div>
                </li>
            `).join("")}
        </ul>
    `;
}

function renderQuickActions(actions = []) {
    if (!actions.length) {
        return `
            <div class="dashboard-list-empty">
                No quick actions are available for your role.
            </div>
        `;
    }

    return `
        <div class="dashboard-quick-actions">
            ${actions.map(action => `
                <a class="button dashboard-quick-action" href="${action.route}">
                    <span class="button-icon">${action.icon}</span>
                    ${action.label}
                </a>
            `).join("")}
        </div>
    `;
}

function renderDashboardMarkup(user) {
    const dashboard = featureState.data;
    const displayName = user?.displayName || user?.email || "Team Member";
    const profile = dashboard?.profile || getDashboardProfile(user);
    const metrics = dashboard?.metrics || {
        leads: computeLeadSummary([]),
        retail: computeRetailSummary([]),
        purchases: computePurchaseSummary([]),
        consignment: computeConsignmentSummary([]),
        cash: computeCashSummary({}),
        stock: computeStockSummary(getState().masterData.products || [], LOW_STOCK_THRESHOLD)
    };
    const storeTasty = metrics.retail.byStore?.["Tasty Treats"] || { totalSales: 0, paymentReceived: 0, balanceDue: 0, expenses: 0, count: 0 };
    const storeChurch = metrics.retail.byStore?.["Church Store"] || { totalSales: 0, paymentReceived: 0, balanceDue: 0, expenses: 0, count: 0 };
    const sourceLabel = featureState.source === "cache" ? "Cached Snapshot" : "Live Data";
    const expiryLabel = featureState.expiresAt ? formatDateTime(featureState.expiresAt) : "-";
    const loadedLabel = featureState.loadedAt ? formatDateTime(featureState.loadedAt) : "-";
    const windowLabel = dashboard?.windowLabel || getWindowLabel(featureState.selectedWindow);
    const durationLabel = dashboard ? `${dashboard.durationMs} ms` : "-";
    const primaryCards = dashboard?.primaryCards || buildPrimaryMetricCards(profile, metrics);
    const actionQueue = dashboard?.actionQueue || buildActionQueue(profile, metrics);
    const quickActions = dashboard?.quickActions || buildQuickActions(profile);

    return `
        <div class="dashboard-shell">
            <section class="panel-card dashboard-header-card">
                <div class="dashboard-heading-row">
                    <div class="dashboard-heading-copy">
                        <p class="hero-kicker">Operational Dashboard</p>
                        <h2 class="hero-title">Welcome, ${displayName}</h2>
                        <p class="hero-copy">Role-aware insights for ${windowLabel}. Use this page to monitor cash, sales, leads, and inventory priorities.</p>
                    </div>
                    <div class="dashboard-controls">
                        <div class="dashboard-window-switcher">
                            ${buildWindowButtonsMarkup()}
                        </div>
                        <button id="dashboard-refresh-button" class="button button-primary-alt" type="button" ${featureState.isLoading ? "disabled" : ""}>
                            <span class="button-icon">${icons.search}</span>
                            ${featureState.isLoading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </div>
                <div class="dashboard-cache-strip source-${featureState.source}">
                    <span class="status-pill">${sourceLabel}</span>
                    <span>Loaded: <strong>${loadedLabel}</strong></span>
                    <span>Duration: <strong>${durationLabel}</strong></span>
                    <span>Cache Expires: <strong>${expiryLabel}</strong></span>
                </div>
                ${featureState.errorMessage ? `
                    <div class="dashboard-error-strip">
                        <span class="button-icon">${icons.warning}</span>
                        ${featureState.errorMessage}
                    </div>
                ` : ""}
            </section>

            <section class="dashboard-kpi-grid">
                ${renderPrimaryCards(primaryCards)}
            </section>

            <section class="panel-card dashboard-section-card">
                <div class="dashboard-section-head">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.dashboard}</span>
                        <div>
                            <h3>Sales Financial Summary</h3>
                            <p class="panel-copy">Retail and consignment performance snapshot for the selected window.</p>
                        </div>
                    </div>
                    <span class="dashboard-section-badge">Window: ${windowLabel}</span>
                </div>
                <div class="dashboard-financial-grid">
                    <article class="dashboard-financial-card dashboard-financial-card-hero">
                        <p class="dashboard-financial-title">Total Sales</p>
                        <p class="dashboard-financial-value">${formatCurrency(metrics.retail.totalSales)}</p>
                        <div class="dashboard-financial-lines">
                            <p><span>Payment Received</span><strong>${formatCurrency(metrics.retail.paymentReceived)}</strong></p>
                            <p><span>Balance Due</span><strong class="${metrics.retail.balanceDue > 0 ? "dashboard-tone-danger" : "dashboard-tone-success"}">${formatCurrency(metrics.retail.balanceDue)}</strong></p>
                            <p><span>Total Expenses</span><strong>${formatCurrency(metrics.retail.expenses)}</strong></p>
                            <p><span>Returns</span><strong>${metrics.retail.returnCount}</strong></p>
                        </div>
                    </article>
                    <article class="dashboard-financial-card">
                        <p class="dashboard-financial-title">Consignment Orders</p>
                        <div class="dashboard-financial-lines">
                            <p><span>Checked Out</span><strong>${formatCurrency(metrics.consignment.checkedOutValue)}</strong></p>
                            <p><span>Total Sold</span><strong>${formatCurrency(metrics.consignment.soldValue)}</strong></p>
                            <p><span>Payment Received</span><strong>${formatCurrency(metrics.consignment.paymentReceived)}</strong></p>
                            <p><span>Balance Due</span><strong class="${metrics.consignment.balanceDue > 0 ? "dashboard-tone-danger" : "dashboard-tone-success"}">${formatCurrency(metrics.consignment.balanceDue)}</strong></p>
                            <p><span>Expenses</span><strong>${formatCurrency(metrics.consignment.expenses)}</strong></p>
                        </div>
                    </article>
                    <article class="dashboard-financial-card">
                        <p class="dashboard-financial-title">Tasty Treats</p>
                        <div class="dashboard-financial-lines">
                            <p><span>Total Sold</span><strong>${formatCurrency(storeTasty.totalSales)}</strong></p>
                            <p><span>Payment Received</span><strong>${formatCurrency(storeTasty.paymentReceived)}</strong></p>
                            <p><span>Balance Due</span><strong class="${storeTasty.balanceDue > 0 ? "dashboard-tone-danger" : "dashboard-tone-success"}">${formatCurrency(storeTasty.balanceDue)}</strong></p>
                            <p><span>Expenses</span><strong>${formatCurrency(storeTasty.expenses)}</strong></p>
                        </div>
                    </article>
                    <article class="dashboard-financial-card">
                        <p class="dashboard-financial-title">Church Store</p>
                        <div class="dashboard-financial-lines">
                            <p><span>Total Sold</span><strong>${formatCurrency(storeChurch.totalSales)}</strong></p>
                            <p><span>Payment Received</span><strong>${formatCurrency(storeChurch.paymentReceived)}</strong></p>
                            <p><span>Balance Due</span><strong class="${storeChurch.balanceDue > 0 ? "dashboard-tone-danger" : "dashboard-tone-success"}">${formatCurrency(storeChurch.balanceDue)}</strong></p>
                            <p><span>Expenses</span><strong>${formatCurrency(storeChurch.expenses)}</strong></p>
                        </div>
                    </article>
                </div>
            </section>

            ${profile.canCashFlow ? `
                <section class="panel-card dashboard-section-card">
                    <div class="dashboard-section-head">
                        <div class="panel-title-wrap">
                            <span class="panel-icon panel-icon-alt">${icons.payment}</span>
                            <div>
                                <h3>Cash Position</h3>
                                <p class="panel-copy">Inflow and outflow monitoring for the selected dashboard window.</p>
                            </div>
                        </div>
                        <span class="dashboard-section-badge">Cash Flow</span>
                    </div>
                    <div class="dashboard-financial-grid dashboard-financial-grid-cash">
                        <article class="dashboard-financial-card dashboard-financial-card-hero dashboard-financial-card-cash">
                            <p class="dashboard-financial-title">Net Cash In Hand</p>
                            <p class="dashboard-financial-value ${metrics.cash.netCash >= 0 ? "dashboard-tone-success" : "dashboard-tone-danger"}">${formatSignedCurrency(metrics.cash.netCash)}</p>
                            <div class="dashboard-financial-lines">
                                <p><span>Retail Inflow</span><strong>${formatCurrency(metrics.cash.retailInflow)}</strong></p>
                                <p><span>Consignment Inflow</span><strong>${formatCurrency(metrics.cash.consignmentInflow)}</strong></p>
                                <p><span>Supplier Outflow</span><strong>${formatCurrency(metrics.cash.supplierOutflow)}</strong></p>
                            </div>
                        </article>
                        <article class="dashboard-financial-card">
                            <p class="dashboard-financial-title">Purchases</p>
                            <div class="dashboard-financial-lines">
                                <p><span>Invoice Total</span><strong>${formatCurrency(metrics.purchases.invoiceTotal)}</strong></p>
                                <p><span>Amount Paid</span><strong>${formatCurrency(metrics.purchases.amountPaid)}</strong></p>
                                <p><span>Balance Due</span><strong class="${metrics.purchases.balanceDue > 0 ? "dashboard-tone-danger" : "dashboard-tone-success"}">${formatCurrency(metrics.purchases.balanceDue)}</strong></p>
                            </div>
                        </article>
                        <article class="dashboard-financial-card">
                            <p class="dashboard-financial-title">Leads Pipeline</p>
                            <div class="dashboard-financial-lines">
                                <p><span>Open Leads</span><strong>${metrics.leads.open}</strong></p>
                                <p><span>Qualified</span><strong>${metrics.leads.qualified}</strong></p>
                                <p><span>Ready To Convert</span><strong>${metrics.leads.readyToConvert}</strong></p>
                            </div>
                        </article>
                    </div>
                </section>
            ` : ""}

            <section class="dashboard-secondary-grid">
                <article class="panel-card dashboard-section-card">
                    <div class="dashboard-section-head">
                        <div class="panel-title-wrap">
                            <span class="panel-icon panel-icon-alt">${icons.warning}</span>
                            <div>
                                <h3>Action Queue</h3>
                                <p class="panel-copy">Priority tasks based on due balances, stock, and conversion readiness.</p>
                            </div>
                        </div>
                    </div>
                    ${renderActionQueue(actionQueue)}
                </article>
                <article class="panel-card dashboard-section-card">
                    <div class="dashboard-section-head">
                        <div class="panel-title-wrap">
                            <span class="panel-icon panel-icon-alt">${icons.products}</span>
                            <div>
                                <h3>Low Stock Watch</h3>
                                <p class="panel-copy">Products at or below the low-stock threshold.</p>
                            </div>
                        </div>
                        <span class="dashboard-section-badge">${metrics.stock.lowStockCount} alerts</span>
                    </div>
                    ${renderLowStockList(metrics.stock)}
                </article>
            </section>

            <section class="panel-card dashboard-section-card">
                <div class="dashboard-section-head">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.settings}</span>
                        <div>
                            <h3>Quick Actions</h3>
                            <p class="panel-copy">Jump into the next module without using the side navigation.</p>
                        </div>
                    </div>
                </div>
                ${renderQuickActions(quickActions)}
            </section>
        </div>
    `;
}

function bindDashboardEvents(user) {
    const root = document.getElementById("dashboard-root");
    if (!root) return;

    root.querySelectorAll("[data-dashboard-window]").forEach(button => {
        button.addEventListener("click", () => {
            const nextWindow = button.getAttribute("data-dashboard-window");
            if (!nextWindow || nextWindow === featureState.selectedWindow) return;
            featureState.selectedWindow = nextWindow;
            featureState.data = null;
            featureState.errorMessage = "";
            renderDashboardView(user);
            void loadDashboardData(user, { forceRefresh: false });
        });
    });

    root.querySelector("#dashboard-refresh-button")?.addEventListener("click", () => {
        void loadDashboardData(user, { forceRefresh: true });
    });
}

function resetDashboardStateForUser(user) {
    const nextUserKey = normalizeText(user?.uid || user?.email || "");
    if (featureState.userKey === nextUserKey) return;

    featureState.userKey = nextUserKey;
    featureState.isLoading = false;
    featureState.source = "live";
    featureState.loadedAt = 0;
    featureState.expiresAt = 0;
    featureState.data = null;
    featureState.errorMessage = "";
    featureState.requestToken = 0;
}

async function loadDashboardData(user, { forceRefresh = false } = {}) {
    if (!user) return;

    const userKey = normalizeText(user?.uid || user?.email || "");
    const isSameUser = featureState.userKey === userKey;
    const hasFreshData = isSameUser
        && featureState.data
        && featureState.selectedWindow === featureState.data?.windowKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    if (!forceRefresh) {
        const cached = readDashboardCache(user, featureState.selectedWindow);
        if (cached) {
            featureState.data = cached.data;
            featureState.source = "cache";
            featureState.loadedAt = Number(cached.loadedAt) || Date.now();
            featureState.expiresAt = Number(cached.expiresAt) || (Date.now() + CACHE_TTL_MS);
            featureState.errorMessage = "";
            renderDashboardView(user);
            return;
        }
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderDashboardView(user);

    try {
        const data = await buildDashboardData(user, featureState.selectedWindow);

        if (token !== featureState.requestToken) {
            return;
        }

        data.windowKey = featureState.selectedWindow;
        featureState.data = data;
        featureState.source = "live";
        featureState.loadedAt = Date.now();
        featureState.expiresAt = writeDashboardCache(user, featureState.selectedWindow, data, featureState.loadedAt);
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Dashboard load failed:", error);
        featureState.errorMessage = "Could not refresh all dashboard widgets. Showing the latest available snapshot.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/dashboard") {
                renderDashboardView(user);
            }
        }
    }
}

export function renderDashboardView(user) {
    const root = document.getElementById("dashboard-root");
    if (!root) return;

    if (!user) {
        root.innerHTML = `
            <div class="panel-card">
                <h2 class="hero-title">Dashboard</h2>
                <p class="hero-copy">Login to view operational dashboard metrics.</p>
            </div>
        `;
        return;
    }

    resetDashboardStateForUser(user);
    root.innerHTML = renderDashboardMarkup(user);
    bindDashboardEvents(user);

    if (!featureState.isLoading && (!featureState.data || Date.now() > featureState.expiresAt)) {
        void loadDashboardData(user, { forceRefresh: false });
    }
}
