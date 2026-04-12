import { getState } from "../../app/store.js";
import { COLLECTIONS } from "../../config/collections.js";
import { navConfig } from "../../config/nav-config.js";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_DOCS_PER_COLLECTION = 240;
const LOW_STOCK_THRESHOLD = 5;
const MEDIUM_STOCK_THRESHOLD = 20;
const INVENTORY_TARGET_STOCK = 24;
const WINDOW_OPTIONS = [
    { key: "today", label: "Today" },
    { key: "7d", label: "Last 7 Days" },
    { key: "30d", label: "Last 30 Days" },
    { key: "custom", label: "Custom Range" }
];

const featureState = {
    userKey: "",
    selectedWindow: "30d",
    customFrom: "",
    customTo: "",
    inventorySearchTerm: "",
    isLoading: false,
    source: "live",
    loadedAt: 0,
    expiresAt: 0,
    data: null,
    errorMessage: "",
    requestToken: 0,
    inventoryGridApi: null,
    inventoryGridElement: null,
    stockStatusChart: null,
    lowStockCategoryChart: null,
    salesFinanceChart: null,
    salesStoreChart: null,
    cashPositionChart: null,
    leadPipelineChart: null,
    inventoryChartSyncToken: 0,
    financialChartSyncToken: 0
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

function buildCategoryNameMap(categories = []) {
    return new Map(
        (categories || [])
            .map(category => [normalizeText(category.id), normalizeText(category.categoryName)])
            .filter(([id, name]) => id && name)
    );
}

function resolveProductCategoryName(product = {}, categoryNameMap = new Map()) {
    const rawCategoryId = normalizeText(
        product.categoryId
        || product.category
        || product.productCategoryId
        || product.productCategory
    );
    const mappedCategoryName = rawCategoryId ? normalizeText(categoryNameMap.get(rawCategoryId)) : "";
    const directCategoryName = normalizeText(product.categoryName || product.productCategoryName);

    return directCategoryName || mappedCategoryName || rawCategoryId || "Uncategorized";
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

function formatDateLabel(value) {
    if (!value) return "-";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function toDateInputValue(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDateInput(value, { endOfDay = false } = {}) {
    const text = normalizeText(value);
    if (!text) return null;

    const date = new Date(`${text}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;

    if (endOfDay) {
        date.setHours(23, 59, 59, 999);
    } else {
        date.setHours(0, 0, 0, 0);
    }

    return date;
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
    if (windowKey === "custom") return "Custom Range";
    return WINDOW_OPTIONS.find(option => option.key === windowKey)?.label || "Last 30 Days";
}

function getDefaultCustomRange() {
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = getWindowStart("30d");

    return {
        from: toDateInputValue(startDate),
        to: toDateInputValue(endDate)
    };
}

function ensureCustomRangeDefaults() {
    if (featureState.customFrom && featureState.customTo) return;
    const defaults = getDefaultCustomRange();
    featureState.customFrom = featureState.customFrom || defaults.from;
    featureState.customTo = featureState.customTo || defaults.to;
}

function resolveActiveRangeSpec() {
    if (featureState.selectedWindow !== "custom") {
        const startDate = getWindowStart(featureState.selectedWindow);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        return {
            isValid: true,
            rangeKey: featureState.selectedWindow,
            rangeLabel: getWindowLabel(featureState.selectedWindow),
            startDate,
            endDate
        };
    }

    ensureCustomRangeDefaults();
    const fromText = normalizeText(featureState.customFrom);
    const toText = normalizeText(featureState.customTo);
    const fromDate = parseDateInput(fromText, { endOfDay: false });
    const toDate = parseDateInput(toText, { endOfDay: true });

    if (!fromDate || !toDate) {
        return {
            isValid: false,
            error: "Select valid From and To dates for the custom dashboard range."
        };
    }

    if (fromDate.getTime() > toDate.getTime()) {
        return {
            isValid: false,
            error: "Custom range is invalid. From date cannot be later than To date."
        };
    }

    return {
        isValid: true,
        rangeKey: `custom:${fromText}:${toText}`,
        rangeLabel: `${formatDateLabel(fromDate)} - ${formatDateLabel(toDate)}`,
        startDate: fromDate,
        endDate: toDate
    };
}

function buildCacheKey(user, rangeKey) {
    const identity = user?.uid || user?.email || "anonymous";
    return `moneta.dashboard.snapshot.v1.${identity}.${rangeKey}`;
}

function readDashboardCache(user, rangeKey) {
    const cacheKey = buildCacheKey(user, rangeKey);

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

function writeDashboardCache(user, rangeKey, data, loadedAt) {
    const cacheKey = buildCacheKey(user, rangeKey);
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

function filterRowsByWindow(rows = [], dateField, startDate, endDate = null) {
    if (!dateField || (!startDate && !endDate)) return rows;

    return rows.filter(row => {
        const time = toDateValue(row?.[dateField]).getTime();
        if (startDate && time < startDate.getTime()) return false;
        if (endDate && time > endDate.getTime()) return false;
        return true;
    });
}

async function fetchScopedRowsFallbackByCreator(db, path, {
    createdBy,
    dateField,
    startDate,
    endDate,
    maxDocs
}) {
    const pageSize = Math.max(50, Math.min(200, maxDocs));
    const maxPages = 8;
    let lastDoc = null;
    const rows = [];

    for (let page = 0; page < maxPages; page += 1) {
        let query = db.collection(path).where("createdBy", "==", createdBy).limit(pageSize);
        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        if (snapshot.empty) break;

        rows.push(...snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        if (snapshot.size < pageSize) break;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    const windowedRows = filterRowsByWindow(rows, dateField, startDate, endDate);
    if (!dateField) return windowedRows.slice(0, maxDocs);
    return sortRowsByDateDesc(windowedRows, dateField).slice(0, maxDocs);
}

async function fetchWindowedRows(path, {
    dateField = "",
    startDate = null,
    endDate = null,
    createdBy = "",
    maxDocs = MAX_DOCS_PER_COLLECTION
} = {}) {
    const db = firebase.firestore();

    try {
        let query = db.collection(path);

        if (createdBy) {
            query = query.where("createdBy", "==", createdBy);
        }

        if (dateField && startDate) {
            query = query.where(dateField, ">=", startDate);
        }

        if (dateField && endDate) {
            query = query.where(dateField, "<=", endDate);
        }

        if (dateField) {
            query = query.orderBy(dateField, "desc");
        }

        query = query.limit(maxDocs);

        const snapshot = await query.get();
        const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!dateField) return rows;
        return sortRowsByDateDesc(rows, dateField);
    } catch (error) {
        console.warn(`[Moneta] Dashboard query fallback for ${path}:`, error);

        if (createdBy) {
            try {
                return await fetchScopedRowsFallbackByCreator(db, path, {
                    createdBy,
                    dateField,
                    startDate,
                    endDate,
                    maxDocs
                });
            } catch (scopedFallbackError) {
                console.warn(`[Moneta] Dashboard scoped fallback failed for ${path}:`, scopedFallbackError);
            }
        }

        const fallbackSnapshot = await db.collection(path).limit(maxDocs).get();
        const fallbackRows = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const scopedRows = createdBy
            ? fallbackRows.filter(row => normalizeText(row.createdBy) === createdBy)
            : fallbackRows;
        const windowedRows = filterRowsByWindow(scopedRows, dateField, startDate, endDate);
        if (!dateField) return windowedRows.slice(0, maxDocs);
        return sortRowsByDateDesc(windowedRows, dateField).slice(0, maxDocs);
    }
}

function resolveInventoryStatus(inventoryCount) {
    const quantity = Math.max(0, Math.floor(toNumber(inventoryCount)));

    if (quantity <= 0) {
        return { key: "out", label: "Out of Stock", tone: "danger", priority: 0 };
    }

    if (quantity <= LOW_STOCK_THRESHOLD) {
        return { key: "low", label: "Low Stock", tone: "warning", priority: 1 };
    }

    if (quantity <= MEDIUM_STOCK_THRESHOLD) {
        return { key: "medium", label: "Medium", tone: "neutral", priority: 2 };
    }

    return { key: "healthy", label: "Healthy", tone: "success", priority: 3 };
}

function buildInventoryInsights(products = [], categories = []) {
    const categoryNameMap = buildCategoryNameMap(categories);
    const rows = (products || []).map(product => {
        const inventoryCount = Math.max(0, Math.floor(toNumber(product.inventoryCount)));
        const status = resolveInventoryStatus(inventoryCount);
        const productName = normalizeText(product.itemName || product.productName || "Untitled Product");
        const categoryName = resolveProductCategoryName(product, categoryNameMap);
        const reorderSuggestion = status.key === "out" || status.key === "low"
            ? Math.max(INVENTORY_TARGET_STOCK - inventoryCount, 0)
            : 0;

        return {
            id: product.id,
            productName,
            categoryName,
            inventoryCount,
            statusKey: status.key,
            statusLabel: status.label,
            statusTone: status.tone,
            statusPriority: status.priority,
            reorderSuggestion
        };
    });

    rows.sort((left, right) => {
        if (left.statusPriority !== right.statusPriority) {
            return left.statusPriority - right.statusPriority;
        }
        if (left.inventoryCount !== right.inventoryCount) {
            return left.inventoryCount - right.inventoryCount;
        }
        return left.productName.localeCompare(right.productName);
    });

    const counts = { out: 0, low: 0, medium: 0, healthy: 0 };
    const lowByCategory = new Map();

    rows.forEach(row => {
        counts[row.statusKey] += 1;

        if (row.statusKey === "out" || row.statusKey === "low") {
            lowByCategory.set(row.categoryName, (lowByCategory.get(row.categoryName) || 0) + 1);
        }
    });

    const topLowCategories = [...lowByCategory.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 8)
        .map(([categoryName, count]) => ({ categoryName, count }));

    return {
        rows,
        counts,
        threshold: LOW_STOCK_THRESHOLD,
        mediumThreshold: MEDIUM_STOCK_THRESHOLD,
        targetStock: INVENTORY_TARGET_STOCK,
        totalSkus: rows.length,
        alertCount: counts.out + counts.low,
        topLowCategories
    };
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
        donations: 0,
        balanceDue: 0,
        expenses: 0,
        returnCount: 0,
        activeCount: 0,
        overdueCount: 0,
        byStore: {
            "Tasty Treats": { totalSales: 0, paymentReceived: 0, donations: 0, balanceDue: 0, expenses: 0, count: 0 },
            "Church Store": { totalSales: 0, paymentReceived: 0, donations: 0, balanceDue: 0, expenses: 0, count: 0 }
        }
    };
    const now = Date.now();

    (sales || []).forEach(sale => {
        const saleStatus = normalizeText(sale.saleStatus || "Active").toLowerCase();
        if (saleStatus === "voided") return;

        const totalSales = toNumber(sale.financials?.grandTotal);
        const paymentReceived = toNumber(sale.totalAmountPaid);
        const donations = toNumber(sale.totalDonation);
        const balanceDue = toNumber(sale.balanceDue);
        const expenses = toNumber(sale.financials?.totalExpenses);
        const returnCount = Math.max(0, Math.floor(toNumber(sale.returnCount)));
        const saleDate = toDateValue(sale.saleDate).getTime();
        const ageInDays = saleDate > 0 ? Math.floor((now - saleDate) / (24 * 60 * 60 * 1000)) : 0;

        summary.totalSales += totalSales;
        summary.paymentReceived += paymentReceived;
        summary.donations += donations;
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
            summary.byStore[storeName].donations += donations;
            summary.byStore[storeName].balanceDue += balanceDue;
            summary.byStore[storeName].expenses += expenses;
            summary.byStore[storeName].count += 1;
        }
    });

    summary.totalSales = roundCurrency(summary.totalSales);
    summary.paymentReceived = roundCurrency(summary.paymentReceived);
    summary.donations = roundCurrency(summary.donations);
    summary.balanceDue = roundCurrency(summary.balanceDue);
    summary.expenses = roundCurrency(summary.expenses);

    Object.keys(summary.byStore).forEach(storeName => {
        summary.byStore[storeName] = {
            ...summary.byStore[storeName],
            totalSales: roundCurrency(summary.byStore[storeName].totalSales),
            paymentReceived: roundCurrency(summary.byStore[storeName].paymentReceived),
            donations: roundCurrency(summary.byStore[storeName].donations),
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
        donations: 0,
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
        const donations = toNumber(order.totalDonation);
        const balanceDue = toNumber(order.balanceDue);
        const expenses = toNumber(order.totalExpenses);
        const checkoutDate = toDateValue(order.checkoutDate).getTime();
        const ageInDays = checkoutDate > 0 ? Math.floor((now - checkoutDate) / (24 * 60 * 60 * 1000)) : 0;

        summary.checkedOutValue += checkedOutValue;
        summary.soldValue += soldValue;
        summary.paymentReceived += paymentReceived;
        summary.donations += donations;
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
    summary.donations = roundCurrency(summary.donations);
    summary.balanceDue = roundCurrency(summary.balanceDue);
    summary.expenses = roundCurrency(summary.expenses);

    return summary;
}

function computeCashSummary({
    salesPayments = [],
    supplierPayments = [],
    consignmentPayments = [],
    donations = []
}) {
    const totals = {
        retailInflow: 0,
        consignmentInflow: 0,
        donationInflow: 0,
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

    (donations || []).forEach(entry => {
        const status = normalizeText(entry.status || "Active").toLowerCase();
        if (status === "voided" || status === "void reversal" || status === "reversal") return;
        if (entry.isReversalEntry) return;
        totals.donationInflow += toNumber(entry.amount);
    });

    totals.retailInflow = roundCurrency(totals.retailInflow);
    totals.consignmentInflow = roundCurrency(totals.consignmentInflow);
    totals.donationInflow = roundCurrency(totals.donationInflow);
    totals.supplierOutflow = roundCurrency(totals.supplierOutflow);

    return {
        ...totals,
        netCash: roundCurrency((totals.retailInflow + totals.consignmentInflow + totals.donationInflow) - totals.supplierOutflow)
    };
}

function computeStockSummary(products = [], threshold = LOW_STOCK_THRESHOLD, categories = []) {
    const categoryNameMap = buildCategoryNameMap(categories);
    const lowStockRows = (products || [])
        .filter(product => {
            return Math.max(0, Math.floor(toNumber(product.inventoryCount))) <= threshold;
        })
        .map(product => ({
            ...product,
            resolvedCategoryName: resolveProductCategoryName(product, categoryNameMap)
        }))
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

async function buildDashboardData(user, rangeSpec) {
    const startedAt = performance.now();
    const startDate = rangeSpec?.startDate || getWindowStart("30d");
    const endDate = rangeSpec?.endDate || null;
    const profile = getDashboardProfile(user);
    const scopedEmail = profile.scopeToOwnData ? normalizeText(user?.email) : "";

    const [
        leads,
        sales,
        purchases,
        consignments,
        salesPayments,
        supplierPayments,
        consignmentPayments,
        donations
    ] = await Promise.all([
        profile.canLeads
            ? fetchWindowedRows(COLLECTIONS.leads, { dateField: "enquiryDate", startDate, endDate, createdBy: scopedEmail })
            : Promise.resolve([]),
        profile.canRetail || profile.canFinance
            ? fetchWindowedRows(COLLECTIONS.salesInvoices, { dateField: "saleDate", startDate, endDate, createdBy: scopedEmail })
            : Promise.resolve([]),
        profile.canPurchases || profile.canFinance
            ? fetchWindowedRows(COLLECTIONS.purchaseInvoices, { dateField: "purchaseDate", startDate, endDate })
            : Promise.resolve([]),
        profile.canConsignment
            ? fetchWindowedRows(COLLECTIONS.simpleConsignments, { dateField: "checkoutDate", startDate, endDate, createdBy: scopedEmail })
            : Promise.resolve([]),
        profile.canCashFlow
            ? fetchWindowedRows(COLLECTIONS.salesPaymentsLedger, { dateField: "paymentDate", startDate, endDate })
            : Promise.resolve([]),
        profile.canCashFlow
            ? fetchWindowedRows(COLLECTIONS.supplierPaymentsLedger, { dateField: "paymentDate", startDate, endDate })
            : Promise.resolve([]),
        profile.canCashFlow || profile.canConsignment
            ? fetchWindowedRows(COLLECTIONS.consignmentPaymentsLedger, { dateField: "paymentDate", startDate, endDate })
            : Promise.resolve([]),
        profile.canCashFlow || profile.canFinance
            ? fetchWindowedRows(COLLECTIONS.donations, { dateField: "donationDate", startDate, endDate })
            : Promise.resolve([])
    ]);

    const categories = getState().masterData.categories || [];
    const products = getState().masterData.products || [];
    const inventory = buildInventoryInsights(products, categories);
    const metrics = {
        leads: computeLeadSummary(leads),
        retail: computeRetailSummary(sales),
        purchases: computePurchaseSummary(purchases),
        consignment: computeConsignmentSummary(consignments),
        cash: computeCashSummary({
            salesPayments,
            supplierPayments,
            consignmentPayments,
            donations
        }),
        stock: computeStockSummary(products, LOW_STOCK_THRESHOLD, categories),
        inventory
    };

    return {
        profile,
        rangeLabel: rangeSpec?.rangeLabel || getWindowLabel("30d"),
        rangeKey: rangeSpec?.rangeKey || "30d",
        startDate,
        endDate,
        generatedAt: Date.now(),
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        metrics,
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

function buildCustomRangeControlsMarkup() {
    ensureCustomRangeDefaults();

    return `
        <div class="dashboard-custom-range ${featureState.selectedWindow === "custom" ? "is-visible" : ""}">
            <div class="dashboard-custom-field">
                <label for="dashboard-custom-from">From</label>
                <input id="dashboard-custom-from" class="input dashboard-date-input" type="date" value="${featureState.customFrom || ""}" ${featureState.isLoading ? "disabled" : ""}>
            </div>
            <div class="dashboard-custom-field">
                <label for="dashboard-custom-to">To</label>
                <input id="dashboard-custom-to" class="input dashboard-date-input" type="date" value="${featureState.customTo || ""}" ${featureState.isLoading ? "disabled" : ""}>
            </div>
            <button id="dashboard-custom-apply" class="button button-secondary dashboard-custom-apply" type="button" ${featureState.isLoading ? "disabled" : ""}>
                Apply
            </button>
        </div>
    `;
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
                        <p class="dashboard-list-item-copy">${product.resolvedCategoryName || product.productCategoryName || product.categoryName || "Uncategorized"}</p>
                    </div>
                    <div class="dashboard-list-item-meta">
                        <span class="status-pill">Stock: ${Math.max(0, Math.floor(toNumber(product.inventoryCount)))}</span>
                    </div>
                </li>
            `).join("")}
        </ul>
    `;
}

function renderInventorySummary(inventory = {}) {
    const counts = inventory.counts || { out: 0, low: 0, medium: 0, healthy: 0 };

    return `
        <div class="dashboard-inventory-summary">
            <span class="status-pill">Total SKUs: ${inventory.totalSkus || 0}</span>
            <span class="status-pill inventory-pill-danger">Out of Stock: ${counts.out || 0}</span>
            <span class="status-pill inventory-pill-warning">Low Stock: ${counts.low || 0}</span>
            <span class="status-pill inventory-pill-neutral">Medium: ${counts.medium || 0}</span>
            <span class="status-pill inventory-pill-success">Healthy: ${counts.healthy || 0}</span>
            <span class="status-pill">Target Stock: ${inventory.targetStock || INVENTORY_TARGET_STOCK}</span>
        </div>
    `;
}

function renderDashboardMarkup(user) {
    const dashboard = featureState.data;
    const displayName = user?.displayName || user?.email || "Team Member";
    const profile = dashboard?.profile || getDashboardProfile(user);
    const categories = getState().masterData.categories || [];
    const products = getState().masterData.products || [];
    const metrics = dashboard?.metrics || {
        leads: computeLeadSummary([]),
        retail: computeRetailSummary([]),
        purchases: computePurchaseSummary([]),
        consignment: computeConsignmentSummary([]),
        cash: computeCashSummary({}),
        stock: computeStockSummary(products, LOW_STOCK_THRESHOLD, categories),
        inventory: buildInventoryInsights(products, categories)
    };
    const storeTasty = metrics.retail.byStore?.["Tasty Treats"] || { totalSales: 0, paymentReceived: 0, donations: 0, balanceDue: 0, expenses: 0, count: 0 };
    const storeChurch = metrics.retail.byStore?.["Church Store"] || { totalSales: 0, paymentReceived: 0, donations: 0, balanceDue: 0, expenses: 0, count: 0 };
    const sourceLabel = featureState.source === "cache" ? "Cached Snapshot" : "Live Data";
    const expiryLabel = featureState.expiresAt ? formatDateTime(featureState.expiresAt) : "-";
    const loadedLabel = featureState.loadedAt ? formatDateTime(featureState.loadedAt) : "-";
    const activeRangeSpec = resolveActiveRangeSpec();
    const windowLabel = dashboard?.rangeLabel || (activeRangeSpec.isValid ? activeRangeSpec.rangeLabel : getWindowLabel(featureState.selectedWindow));
    const durationLabel = dashboard ? `${dashboard.durationMs} ms` : "-";
    const primaryCards = dashboard?.primaryCards || buildPrimaryMetricCards(profile, metrics);
    const inventory = metrics.inventory || buildInventoryInsights(products, categories);

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
                        ${buildCustomRangeControlsMarkup()}
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
                <div class="dashboard-financial-layout">
                    <div class="dashboard-financial-grid dashboard-financial-grid-compact is-compact">
                        <article class="dashboard-financial-card dashboard-financial-card-hero">
                            <p class="dashboard-financial-title">Total Sales</p>
                            <p class="dashboard-financial-value">${formatCurrency(metrics.retail.totalSales)}</p>
                            <div class="dashboard-financial-lines">
                                <p><span>Payment Received</span><strong>${formatCurrency(metrics.retail.paymentReceived)}</strong></p>
                                <p><span>Donations</span><strong>${formatCurrency(metrics.retail.donations)}</strong></p>
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
                                <p><span>Donations</span><strong>${formatCurrency(metrics.consignment.donations)}</strong></p>
                                <p><span>Balance Due</span><strong class="${metrics.consignment.balanceDue > 0 ? "dashboard-tone-danger" : "dashboard-tone-success"}">${formatCurrency(metrics.consignment.balanceDue)}</strong></p>
                                <p><span>Expenses</span><strong>${formatCurrency(metrics.consignment.expenses)}</strong></p>
                            </div>
                        </article>
                        <article class="dashboard-financial-card">
                            <p class="dashboard-financial-title">Tasty Treats</p>
                            <div class="dashboard-financial-lines">
                                <p><span>Total Sold</span><strong>${formatCurrency(storeTasty.totalSales)}</strong></p>
                                <p><span>Payment Received</span><strong>${formatCurrency(storeTasty.paymentReceived)}</strong></p>
                                <p><span>Donations</span><strong>${formatCurrency(storeTasty.donations)}</strong></p>
                                <p><span>Balance Due</span><strong class="${storeTasty.balanceDue > 0 ? "dashboard-tone-danger" : "dashboard-tone-success"}">${formatCurrency(storeTasty.balanceDue)}</strong></p>
                                <p><span>Expenses</span><strong>${formatCurrency(storeTasty.expenses)}</strong></p>
                            </div>
                        </article>
                        <article class="dashboard-financial-card">
                            <p class="dashboard-financial-title">Church Store</p>
                            <div class="dashboard-financial-lines">
                                <p><span>Total Sold</span><strong>${formatCurrency(storeChurch.totalSales)}</strong></p>
                                <p><span>Payment Received</span><strong>${formatCurrency(storeChurch.paymentReceived)}</strong></p>
                                <p><span>Donations</span><strong>${formatCurrency(storeChurch.donations)}</strong></p>
                                <p><span>Balance Due</span><strong class="${storeChurch.balanceDue > 0 ? "dashboard-tone-danger" : "dashboard-tone-success"}">${formatCurrency(storeChurch.balanceDue)}</strong></p>
                                <p><span>Expenses</span><strong>${formatCurrency(storeChurch.expenses)}</strong></p>
                            </div>
                        </article>
                    </div>
                    <div class="dashboard-financial-charts">
                        <article class="dashboard-chart-card dashboard-chart-card-compact">
                            <div class="dashboard-chart-head">
                                <h4>Retail vs Consignment</h4>
                            </div>
                            <div class="dashboard-chart-canvas-wrap dashboard-chart-canvas-wrap-compact">
                                <canvas id="dashboard-sales-finance-chart"></canvas>
                                <div id="dashboard-sales-finance-empty" class="dashboard-chart-empty" hidden></div>
                            </div>
                        </article>
                        <article class="dashboard-chart-card dashboard-chart-card-compact">
                            <div class="dashboard-chart-head">
                                <h4>Store Performance</h4>
                            </div>
                            <div class="dashboard-chart-canvas-wrap dashboard-chart-canvas-wrap-compact">
                                <canvas id="dashboard-sales-store-chart"></canvas>
                                <div id="dashboard-sales-store-empty" class="dashboard-chart-empty" hidden></div>
                            </div>
                        </article>
                    </div>
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
                    <div class="dashboard-financial-layout dashboard-financial-layout-cash">
                        <div class="dashboard-financial-grid dashboard-financial-grid-cash is-compact">
                            <article class="dashboard-financial-card dashboard-financial-card-hero dashboard-financial-card-cash">
                                <p class="dashboard-financial-title">Net Cash In Hand</p>
                                <p class="dashboard-financial-value ${metrics.cash.netCash >= 0 ? "dashboard-tone-success" : "dashboard-tone-danger"}">${formatSignedCurrency(metrics.cash.netCash)}</p>
                                <div class="dashboard-financial-lines">
                                    <p><span>Retail Inflow</span><strong>${formatCurrency(metrics.cash.retailInflow)}</strong></p>
                                    <p><span>Consignment Inflow</span><strong>${formatCurrency(metrics.cash.consignmentInflow)}</strong></p>
                                    <p><span>Donation Inflow</span><strong>${formatCurrency(metrics.cash.donationInflow)}</strong></p>
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
                        <div class="dashboard-financial-charts dashboard-financial-charts-cash">
                            <article class="dashboard-chart-card dashboard-chart-card-compact">
                                <div class="dashboard-chart-head">
                                    <h4>Cash Flow Mix</h4>
                                </div>
                                <div class="dashboard-chart-canvas-wrap dashboard-chart-canvas-wrap-compact">
                                    <canvas id="dashboard-cash-position-chart"></canvas>
                                    <div id="dashboard-cash-position-empty" class="dashboard-chart-empty" hidden></div>
                                </div>
                            </article>
                            <article class="dashboard-chart-card dashboard-chart-card-compact">
                                <div class="dashboard-chart-head">
                                    <h4>Lead Pipeline Mix</h4>
                                </div>
                                <div class="dashboard-chart-canvas-wrap dashboard-chart-canvas-wrap-compact">
                                    <canvas id="dashboard-lead-pipeline-chart"></canvas>
                                    <div id="dashboard-lead-pipeline-empty" class="dashboard-chart-empty" hidden></div>
                                </div>
                            </article>
                        </div>
                    </div>
                </section>
            ` : ""}

            <section class="panel-card dashboard-section-card">
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
            </section>

            <section class="panel-card dashboard-section-card">
                <div class="dashboard-section-head">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.products}</span>
                        <div>
                            <h3>Inventory Health</h3>
                            <p class="panel-copy">Live stock visibility in chart and grid form for replenishment planning.</p>
                        </div>
                    </div>
                    <span class="dashboard-section-badge">${inventory.alertCount || 0} alerts</span>
                </div>
                ${renderInventorySummary(inventory)}
                <div class="dashboard-inventory-layout">
                    <div class="dashboard-inventory-charts">
                        <article class="dashboard-chart-card">
                            <div class="dashboard-chart-head">
                                <h4>Stock Status Mix</h4>
                            </div>
                            <div class="dashboard-chart-canvas-wrap">
                                <canvas id="dashboard-inventory-status-chart"></canvas>
                                <div id="dashboard-inventory-status-empty" class="dashboard-chart-empty" hidden></div>
                            </div>
                        </article>
                        <article class="dashboard-chart-card">
                            <div class="dashboard-chart-head">
                                <h4>Low Stock By Category</h4>
                            </div>
                            <div class="dashboard-chart-canvas-wrap">
                                <canvas id="dashboard-inventory-category-chart"></canvas>
                                <div id="dashboard-inventory-category-empty" class="dashboard-chart-empty" hidden></div>
                            </div>
                        </article>
                    </div>
                    <div class="dashboard-inventory-grid-card">
                        <div class="dashboard-inventory-grid-toolbar">
                            <div>
                                <p class="section-kicker" style="margin-bottom: 0.25rem;">Inventory Grid</p>
                                <p class="panel-copy">Review stock by SKU, status, and reorder suggestion.</p>
                            </div>
                            <div class="search-wrap">
                                <span class="search-icon">${icons.search}</span>
                                <input
                                    id="dashboard-inventory-search"
                                    class="input toolbar-search"
                                    type="search"
                                    placeholder="Search product or category"
                                    value="${featureState.inventorySearchTerm}">
                            </div>
                        </div>
                        <div class="ag-shell ag-shell-compact">
                            <div id="dashboard-inventory-grid" class="ag-theme-alpine moneta-grid dashboard-inventory-grid" style="width: 100%;"></div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;
}

function destroyInventoryGrid() {
    if (featureState.inventoryGridApi) {
        featureState.inventoryGridApi.destroy();
        featureState.inventoryGridApi = null;
        featureState.inventoryGridElement = null;
    }
}

function destroyInventoryCharts() {
    featureState.stockStatusChart?.destroy();
    featureState.lowStockCategoryChart?.destroy();
    featureState.stockStatusChart = null;
    featureState.lowStockCategoryChart = null;
}

function destroyFinancialCharts() {
    featureState.salesFinanceChart?.destroy();
    featureState.salesStoreChart?.destroy();
    featureState.cashPositionChart?.destroy();
    featureState.leadPipelineChart?.destroy();
    featureState.salesFinanceChart = null;
    featureState.salesStoreChart = null;
    featureState.cashPositionChart = null;
    featureState.leadPipelineChart = null;
}

function cleanupDashboardVisuals() {
    featureState.inventoryChartSyncToken += 1;
    featureState.financialChartSyncToken += 1;
    destroyInventoryGrid();
    destroyInventoryCharts();
    destroyFinancialCharts();
}

function initializeInventoryGrid(inventory = {}) {
    const gridElement = document.getElementById("dashboard-inventory-grid");
    if (!gridElement) {
        destroyInventoryGrid();
        return;
    }

    const rowData = inventory.rows || [];
    destroyInventoryGrid();

    featureState.inventoryGridElement = gridElement;
    featureState.inventoryGridApi = createGrid(gridElement, {
        rowData,
        columnDefs: [
            { field: "productName", headerName: "Product", minWidth: 220, flex: 1.2 },
            { field: "categoryName", headerName: "Category", minWidth: 150, flex: 0.9 },
            {
                field: "inventoryCount",
                headerName: "Stock",
                minWidth: 105,
                maxWidth: 125,
                cellClass: "ag-right-aligned-cell",
                headerClass: "ag-right-aligned-header"
            },
            {
                field: "statusLabel",
                headerName: "Status",
                minWidth: 130,
                flex: 0.8,
                cellRenderer: params => {
                    if (params.node?.rowPinned) return "";
                    const tone = params.data?.statusTone || "neutral";
                    const label = params.value || "Unknown";
                    return `<span class="dashboard-inventory-status-pill tone-${tone}">${label}</span>`;
                }
            },
            {
                field: "reorderSuggestion",
                headerName: "Reorder Qty",
                minWidth: 130,
                flex: 0.8,
                cellClass: "ag-right-aligned-cell",
                headerClass: "ag-right-aligned-header",
                valueFormatter: params => {
                    const value = Math.max(0, Math.floor(toNumber(params.value)));
                    return value > 0 ? String(value) : "-";
                }
            }
        ],
        defaultColDef: {
            resizable: true,
            sortable: true,
            filter: true,
            wrapHeaderText: true,
            autoHeaderHeight: true,
            wrapText: true,
            autoHeight: true
        },
        animateRows: true,
        domLayout: "autoHeight",
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizeSelector: [10, 25, 50, 100],
        suppressCellFocus: true
    });

    if (featureState.inventorySearchTerm) {
        featureState.inventoryGridApi.setGridOption("quickFilterText", featureState.inventorySearchTerm);
    }
}

let chartJsModulePromise = null;
let chartJsRegistrationPromise = null;

async function loadChartJs() {
    if (!chartJsModulePromise) {
        chartJsModulePromise = import("https://cdn.jsdelivr.net/npm/chart.js@4.4.3/+esm");
    }

    return chartJsModulePromise;
}

async function ensureChartJsRegistered() {
    if (!chartJsRegistrationPromise) {
        chartJsRegistrationPromise = (async () => {
            const chartJs = await loadChartJs();
            const {
                Chart,
                registerables = [],
                DoughnutController,
                BarController,
                ArcElement,
                Tooltip,
                Legend,
                CategoryScale,
                LinearScale,
                BarElement
            } = chartJs;

            if (registerables.length) {
                Chart.register(...registerables);
            } else {
                Chart.register(
                    DoughnutController,
                    BarController,
                    ArcElement,
                    Tooltip,
                    Legend,
                    CategoryScale,
                    LinearScale,
                    BarElement
                );
            }

            return chartJs;
        })().catch(error => {
            chartJsRegistrationPromise = null;
            throw error;
        });
    }

    return chartJsRegistrationPromise;
}

function setChartVisibility(canvas, emptyNode, { showChart, message = "" }) {
    if (!canvas) return;
    canvas.hidden = !showChart;
    if (emptyNode) {
        emptyNode.hidden = showChart;
        if (!showChart) {
            emptyNode.textContent = message;
        }
    }
}

async function initializeInventoryCharts(inventory = {}) {
    const statusCanvas = document.getElementById("dashboard-inventory-status-chart");
    const categoryCanvas = document.getElementById("dashboard-inventory-category-chart");
    const statusEmpty = document.getElementById("dashboard-inventory-status-empty");
    const categoryEmpty = document.getElementById("dashboard-inventory-category-empty");

    if (!statusCanvas || !categoryCanvas) {
        destroyInventoryCharts();
        return;
    }

    const syncToken = ++featureState.inventoryChartSyncToken;
    const counts = inventory.counts || { out: 0, low: 0, medium: 0, healthy: 0 };
    const statusData = [counts.out || 0, counts.low || 0, counts.medium || 0, counts.healthy || 0];
    const statusTotal = statusData.reduce((sum, value) => sum + (Number(value) || 0), 0);

    const categoryRows = (inventory.topLowCategories || []).slice(0, 8);
    const categoryLabels = categoryRows.map(row => row.categoryName);
    const categoryData = categoryRows.map(row => row.count);

    const hasStatusData = statusTotal > 0;
    const hasCategoryData = categoryRows.length > 0;

    setChartVisibility(statusCanvas, statusEmpty, {
        showChart: hasStatusData,
        message: "No inventory data is available yet for this dashboard range."
    });
    setChartVisibility(categoryCanvas, categoryEmpty, {
        showChart: hasCategoryData,
        message: "No low-stock categories right now. Inventory levels are currently healthy."
    });

    destroyInventoryCharts();

    if (!hasStatusData && !hasCategoryData) {
        return;
    }

    try {
        const chartJs = await ensureChartJsRegistered();
        if (syncToken !== featureState.inventoryChartSyncToken) return;
        const { Chart } = chartJs;

        if (hasStatusData) {
            featureState.stockStatusChart = new Chart(statusCanvas.getContext("2d"), {
                type: "doughnut",
                data: {
                    labels: ["Out of Stock", "Low Stock", "Medium", "Healthy"],
                    datasets: [{
                        data: statusData,
                        backgroundColor: ["#dc2626", "#d97706", "#64748b", "#16a34a"],
                        borderColor: "#ffffff",
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                usePointStyle: true,
                                boxWidth: 8
                            }
                        }
                    }
                }
            });
        }

        if (hasCategoryData) {
            featureState.lowStockCategoryChart = new Chart(categoryCanvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: categoryLabels,
                    datasets: [{
                        label: "Low Stock SKUs",
                        data: categoryData,
                        backgroundColor: "#2563eb",
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }

        requestAnimationFrame(() => {
            featureState.stockStatusChart?.resize();
            featureState.lowStockCategoryChart?.resize();
        });

        if (hasStatusData && !featureState.stockStatusChart) {
            setChartVisibility(statusCanvas, statusEmpty, {
                showChart: false,
                message: "Stock mix chart is unavailable right now. Use the summary chips above."
            });
        }
        if (hasCategoryData && !featureState.lowStockCategoryChart) {
            setChartVisibility(categoryCanvas, categoryEmpty, {
                showChart: false,
                message: "Category chart is unavailable right now. Low-stock details are still available in the inventory grid."
            });
        }
    } catch (error) {
        console.error("[Moneta] Dashboard inventory charts failed:", error);
        if (hasStatusData) {
            setChartVisibility(statusCanvas, statusEmpty, {
                showChart: false,
                message: "Chart preview is unavailable right now. Use the summary chips and inventory grid below."
            });
        }
        if (hasCategoryData) {
            setChartVisibility(categoryCanvas, categoryEmpty, {
                showChart: false,
                message: "Category chart is unavailable right now. Low-stock details are still available in the inventory grid."
            });
        }
    }
}

async function initializeFinancialCharts(metrics = {}, { canCashFlow = false } = {}) {
    const salesFinanceCanvas = document.getElementById("dashboard-sales-finance-chart");
    const salesStoreCanvas = document.getElementById("dashboard-sales-store-chart");
    const cashPositionCanvas = document.getElementById("dashboard-cash-position-chart");
    const leadPipelineCanvas = document.getElementById("dashboard-lead-pipeline-chart");

    const salesFinanceEmpty = document.getElementById("dashboard-sales-finance-empty");
    const salesStoreEmpty = document.getElementById("dashboard-sales-store-empty");
    const cashPositionEmpty = document.getElementById("dashboard-cash-position-empty");
    const leadPipelineEmpty = document.getElementById("dashboard-lead-pipeline-empty");

    if (!salesFinanceCanvas || !salesStoreCanvas) {
        destroyFinancialCharts();
        return;
    }

    const retail = metrics.retail || {};
    const consignment = metrics.consignment || {};
    const leads = metrics.leads || {};
    const cash = metrics.cash || {};
    const storeMetrics = retail.byStore || {};
    const tastyStore = storeMetrics["Tasty Treats"] || {};
    const churchStore = storeMetrics["Church Store"] || {};

    const salesFinanceDatasets = {
        labels: ["Total Sold", "Collected", "Donations", "Expenses", "Balance Due"],
        retail: [
            toNumber(retail.totalSales),
            toNumber(retail.paymentReceived),
            toNumber(retail.donations),
            toNumber(retail.expenses),
            toNumber(retail.balanceDue)
        ],
        consignment: [
            toNumber(consignment.soldValue),
            toNumber(consignment.paymentReceived),
            toNumber(consignment.donations),
            toNumber(consignment.expenses),
            toNumber(consignment.balanceDue)
        ]
    };
    const hasSalesFinanceData = [...salesFinanceDatasets.retail, ...salesFinanceDatasets.consignment].some(value => value > 0);

    const salesStoreLabels = ["Tasty Treats", "Church Store"];
    const salesStoreData = [
        toNumber(tastyStore.totalSales),
        toNumber(churchStore.totalSales)
    ];
    const hasStoreData = salesStoreData.some(value => value > 0);

    const cashFlowLabels = ["Retail Inflow", "Consignment Inflow", "Donations", "Supplier Outflow"];
    const cashFlowData = [
        toNumber(cash.retailInflow),
        toNumber(cash.consignmentInflow),
        toNumber(cash.donationInflow),
        toNumber(cash.supplierOutflow)
    ];
    const hasCashFlowData = cashFlowData.some(value => value > 0);

    const leadPipelineLabels = ["Open", "Qualified", "Ready To Convert"];
    const leadPipelineData = [
        Math.max(0, Math.floor(toNumber(leads.open))),
        Math.max(0, Math.floor(toNumber(leads.qualified))),
        Math.max(0, Math.floor(toNumber(leads.readyToConvert)))
    ];
    const hasLeadData = leadPipelineData.some(value => value > 0);

    setChartVisibility(salesFinanceCanvas, salesFinanceEmpty, {
        showChart: hasSalesFinanceData,
        message: "No sales finance data is available yet for this dashboard range."
    });
    setChartVisibility(salesStoreCanvas, salesStoreEmpty, {
        showChart: hasStoreData,
        message: "Store-level sales data will appear here once sales are recorded."
    });

    if (canCashFlow && cashPositionCanvas) {
        setChartVisibility(cashPositionCanvas, cashPositionEmpty, {
            showChart: hasCashFlowData,
            message: "Cash flow data is not available yet for this dashboard range."
        });
    }
    if (canCashFlow && leadPipelineCanvas) {
        setChartVisibility(leadPipelineCanvas, leadPipelineEmpty, {
            showChart: hasLeadData,
            message: "Lead pipeline counts are not available yet for this dashboard range."
        });
    }

    destroyFinancialCharts();

    if (!hasSalesFinanceData && !hasStoreData && (!canCashFlow || (!hasCashFlowData && !hasLeadData))) {
        return;
    }

    const syncToken = ++featureState.financialChartSyncToken;

    try {
        const chartJs = await ensureChartJsRegistered();
        if (syncToken !== featureState.financialChartSyncToken) return;
        const { Chart } = chartJs;

        if (hasSalesFinanceData) {
            featureState.salesFinanceChart = new Chart(salesFinanceCanvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: salesFinanceDatasets.labels,
                    datasets: [
                        {
                            label: "Retail",
                            data: salesFinanceDatasets.retail,
                            backgroundColor: "#2563eb",
                            borderRadius: 6
                        },
                        {
                            label: "Consignment",
                            data: salesFinanceDatasets.consignment,
                            backgroundColor: "#0f766e",
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                usePointStyle: true,
                                boxWidth: 8
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        if (hasStoreData) {
            featureState.salesStoreChart = new Chart(salesStoreCanvas.getContext("2d"), {
                type: "doughnut",
                data: {
                    labels: salesStoreLabels,
                    datasets: [{
                        data: salesStoreData,
                        backgroundColor: ["#f97316", "#0ea5e9"],
                        borderColor: "#ffffff",
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                usePointStyle: true,
                                boxWidth: 8
                            }
                        }
                    }
                }
            });
        }

        if (canCashFlow && cashPositionCanvas && hasCashFlowData) {
            featureState.cashPositionChart = new Chart(cashPositionCanvas.getContext("2d"), {
                type: "bar",
                data: {
                    labels: cashFlowLabels,
                    datasets: [{
                        label: "Amount",
                        data: cashFlowData,
                        backgroundColor: ["#2563eb", "#0ea5e9", "#16a34a", "#dc2626"],
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        if (canCashFlow && leadPipelineCanvas && hasLeadData) {
            featureState.leadPipelineChart = new Chart(leadPipelineCanvas.getContext("2d"), {
                type: "doughnut",
                data: {
                    labels: leadPipelineLabels,
                    datasets: [{
                        data: leadPipelineData,
                        backgroundColor: ["#2563eb", "#f59e0b", "#16a34a"],
                        borderColor: "#ffffff",
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                usePointStyle: true,
                                boxWidth: 8
                            }
                        }
                    }
                }
            });
        }

        requestAnimationFrame(() => {
            featureState.salesFinanceChart?.resize();
            featureState.salesStoreChart?.resize();
            featureState.cashPositionChart?.resize();
            featureState.leadPipelineChart?.resize();
        });

        if (hasSalesFinanceData && !featureState.salesFinanceChart) {
            setChartVisibility(salesFinanceCanvas, salesFinanceEmpty, {
                showChart: false,
                message: "Sales finance chart is unavailable right now. Card metrics are still up to date."
            });
        }
        if (hasStoreData && !featureState.salesStoreChart) {
            setChartVisibility(salesStoreCanvas, salesStoreEmpty, {
                showChart: false,
                message: "Store mix chart is unavailable right now. Use store cards for totals."
            });
        }
        if (canCashFlow && hasCashFlowData && !featureState.cashPositionChart && cashPositionCanvas) {
            setChartVisibility(cashPositionCanvas, cashPositionEmpty, {
                showChart: false,
                message: "Cash flow chart is unavailable right now. Card metrics are still available."
            });
        }
        if (canCashFlow && hasLeadData && !featureState.leadPipelineChart && leadPipelineCanvas) {
            setChartVisibility(leadPipelineCanvas, leadPipelineEmpty, {
                showChart: false,
                message: "Lead pipeline chart is unavailable right now. Lead counts are still visible in cards."
            });
        }
    } catch (error) {
        console.error("[Moneta] Dashboard finance charts failed:", error);
        if (hasSalesFinanceData) {
            setChartVisibility(salesFinanceCanvas, salesFinanceEmpty, {
                showChart: false,
                message: "Sales chart preview is unavailable right now. Use the card metrics above."
            });
        }
        if (hasStoreData) {
            setChartVisibility(salesStoreCanvas, salesStoreEmpty, {
                showChart: false,
                message: "Store chart is unavailable right now. Store totals remain available in cards."
            });
        }
        if (canCashFlow && hasCashFlowData && cashPositionCanvas) {
            setChartVisibility(cashPositionCanvas, cashPositionEmpty, {
                showChart: false,
                message: "Cash flow chart is unavailable right now. Use the card metrics above."
            });
        }
        if (canCashFlow && hasLeadData && leadPipelineCanvas) {
            setChartVisibility(leadPipelineCanvas, leadPipelineEmpty, {
                showChart: false,
                message: "Lead chart is unavailable right now. Lead counts remain available in cards."
            });
        }
    }
}

function syncDashboardInventoryVisuals() {
    const categories = getState().masterData.categories || [];
    const products = getState().masterData.products || [];
    const metrics = featureState.data?.metrics || {
        inventory: buildInventoryInsights(products, categories)
    };
    const inventory = metrics.inventory || buildInventoryInsights(products, categories);
    initializeInventoryGrid(inventory);
    void initializeInventoryCharts(inventory);
}

function syncDashboardFinancialVisuals() {
    const categories = getState().masterData.categories || [];
    const products = getState().masterData.products || [];
    const metrics = featureState.data?.metrics || {
        leads: computeLeadSummary([]),
        retail: computeRetailSummary([]),
        purchases: computePurchaseSummary([]),
        consignment: computeConsignmentSummary([]),
        cash: computeCashSummary({}),
        stock: computeStockSummary(products, LOW_STOCK_THRESHOLD, categories),
        inventory: buildInventoryInsights(products, categories)
    };
    const profile = featureState.data?.profile || getDashboardProfile(getState().currentUser);
    void initializeFinancialCharts(metrics, { canCashFlow: Boolean(profile?.canCashFlow) });
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

            if (nextWindow !== "custom") {
                void loadDashboardData(user, { forceRefresh: false });
            }
        });
    });

    const fromInput = root.querySelector("#dashboard-custom-from");
    const toInput = root.querySelector("#dashboard-custom-to");

    fromInput?.addEventListener("change", event => {
        featureState.customFrom = event.target.value || "";
    });

    toInput?.addEventListener("change", event => {
        featureState.customTo = event.target.value || "";
    });

    root.querySelector("#dashboard-custom-apply")?.addEventListener("click", () => {
        featureState.customFrom = fromInput?.value || featureState.customFrom;
        featureState.customTo = toInput?.value || featureState.customTo;
        featureState.selectedWindow = "custom";
        featureState.data = null;
        featureState.errorMessage = "";
        void loadDashboardData(user, { forceRefresh: false });
    });

    root.querySelector("#dashboard-inventory-search")?.addEventListener("input", event => {
        featureState.inventorySearchTerm = event.target.value || "";
        featureState.inventoryGridApi?.setGridOption("quickFilterText", featureState.inventorySearchTerm);
    });

    root.querySelector("#dashboard-refresh-button")?.addEventListener("click", () => {
        void loadDashboardData(user, { forceRefresh: true });
    });
}

function resetDashboardStateForUser(user) {
    const nextUserKey = normalizeText(user?.uid || user?.email || "");
    if (featureState.userKey === nextUserKey) return;
    const defaults = getDefaultCustomRange();
    cleanupDashboardVisuals();

    featureState.userKey = nextUserKey;
    featureState.selectedWindow = "30d";
    featureState.customFrom = defaults.from;
    featureState.customTo = defaults.to;
    featureState.inventorySearchTerm = "";
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

    const rangeSpec = resolveActiveRangeSpec();
    if (!rangeSpec.isValid) {
        featureState.data = null;
        featureState.isLoading = false;
        featureState.errorMessage = rangeSpec.error || "Dashboard range is invalid.";
        renderDashboardView(user);
        return;
    }

    const userKey = normalizeText(user?.uid || user?.email || "");
    const isSameUser = featureState.userKey === userKey;
    const hasFreshData = isSameUser
        && featureState.data
        && rangeSpec.rangeKey === featureState.data?.rangeKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    if (!forceRefresh) {
        const cached = readDashboardCache(user, rangeSpec.rangeKey);
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
        const data = await buildDashboardData(user, rangeSpec);

        if (token !== featureState.requestToken) {
            return;
        }

        featureState.data = data;
        featureState.source = "live";
        featureState.loadedAt = Date.now();
        featureState.expiresAt = writeDashboardCache(user, rangeSpec.rangeKey, data, featureState.loadedAt);
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
        cleanupDashboardVisuals();
        root.innerHTML = `
            <div class="panel-card">
                <h2 class="hero-title">Dashboard</h2>
                <p class="hero-copy">Login to view operational dashboard metrics.</p>
            </div>
        `;
        return;
    }

    resetDashboardStateForUser(user);
    cleanupDashboardVisuals();
    root.innerHTML = renderDashboardMarkup(user);
    bindDashboardEvents(user);
    syncDashboardInventoryVisuals();
    syncDashboardFinancialVisuals();

    const rangeSpec = resolveActiveRangeSpec();
    if (rangeSpec.isValid && !featureState.isLoading && (!featureState.data || Date.now() > featureState.expiresAt)) {
        void loadDashboardData(user, { forceRefresh: false });
    }
}
