import { COLLECTIONS } from "../../config/collections.js";
import { fetchReportWindowedRows } from "./repository.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
export const CASH_FLOW_RANGE_OPTIONS = [
    { key: "30d", label: "Last 30 Days" },
    { key: "90d", label: "Last 90 Days" },
    { key: "ytd", label: "Year To Date" },
    { key: "custom", label: "Custom Range" }
];

function normalizeText(value) {
    return (value || "").trim();
}

function toNumber(value) {
    return Number(value) || 0;
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function toDateValue(value) {
    if (!value) return new Date(0);
    if (typeof value.toDate === "function") return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function buildCashFlowCacheKey(user, rangeKey) {
    const identity = user?.uid || user?.email || "anonymous";
    return `moneta.reports.cashflow.v1.${identity}.${rangeKey}`;
}

function readCashFlowCache(user, rangeKey) {
    try {
        const raw = sessionStorage.getItem(buildCashFlowCacheKey(user, rangeKey));
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (!parsed.expiresAt || Date.now() > Number(parsed.expiresAt)) {
            sessionStorage.removeItem(buildCashFlowCacheKey(user, rangeKey));
            return null;
        }

        return parsed;
    } catch (error) {
        console.warn("[Moneta] Failed to read cash flow report cache:", error);
        return null;
    }
}

function writeCashFlowCache(user, rangeKey, data, loadedAt) {
    const expiresAt = loadedAt + CACHE_TTL_MS;

    try {
        sessionStorage.setItem(buildCashFlowCacheKey(user, rangeKey), JSON.stringify({
            loadedAt,
            expiresAt,
            data
        }));
    } catch (error) {
        console.warn("[Moneta] Failed to write cash flow report cache:", error);
    }

    return expiresAt;
}

function buildReportCacheKey(user, reportKey, scopeKey = "default") {
    const identity = user?.uid || user?.email || "anonymous";
    return `moneta.reports.${reportKey}.v1.${identity}.${scopeKey}`;
}

function readReportCache(user, reportKey, scopeKey = "default") {
    try {
        const raw = sessionStorage.getItem(buildReportCacheKey(user, reportKey, scopeKey));
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return null;
        if (!parsed.expiresAt || Date.now() > Number(parsed.expiresAt)) {
            sessionStorage.removeItem(buildReportCacheKey(user, reportKey, scopeKey));
            return null;
        }

        return parsed;
    } catch (error) {
        console.warn(`[Moneta] Failed to read ${reportKey} report cache:`, error);
        return null;
    }
}

function writeReportCache(user, reportKey, scopeKey, data, loadedAt) {
    const expiresAt = loadedAt + CACHE_TTL_MS;

    try {
        sessionStorage.setItem(buildReportCacheKey(user, reportKey, scopeKey), JSON.stringify({
            loadedAt,
            expiresAt,
            data
        }));
    } catch (error) {
        console.warn(`[Moneta] Failed to write ${reportKey} report cache:`, error);
    }

    return expiresAt;
}

export function formatDateLabel(value) {
    if (!value) return "-";
    const date = typeof value?.toDate === "function"
        ? value.toDate()
        : (value instanceof Date ? value : new Date(value));
    if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return "-";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

export function formatDateTime(value) {
    if (!value) return "-";
    const date = typeof value?.toDate === "function"
        ? value.toDate()
        : (value instanceof Date ? value : new Date(value));
    if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return "-";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

export function formatUtcDateTime(value) {
    if (!value) return "-";

    const date = typeof value?.toDate === "function"
        ? value.toDate()
        : (value instanceof Date ? value : new Date(value));

    if (Number.isNaN(date.getTime()) || date.getTime() <= 0) return "-";

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

export function formatAccountingCurrency(value, currency = "INR", locale = "en-IN") {
    const amount = roundCurrency(value);
    const formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    if (amount < 0) {
        return `(${formatter.format(Math.abs(amount))})`;
    }

    return formatter.format(amount);
}

export function formatSignedCurrency(value, currency = "INR", locale = "en-IN") {
    const amount = roundCurrency(value);
    const formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    if (amount > 0) return `+${formatter.format(amount)}`;
    if (amount < 0) return `-${formatter.format(Math.abs(amount))}`;
    return formatter.format(0);
}

export function toDateInputValue(value) {
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

function getWindowStart(daysBack) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (Math.max(1, daysBack) - 1));
    return start;
}

function getYearStart() {
    const start = new Date();
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    return start;
}

export function getDefaultCashFlowCustomRange() {
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = getWindowStart(30);

    return {
        from: toDateInputValue(startDate),
        to: toDateInputValue(endDate)
    };
}

export function resolveCashFlowRangeSpec({ rangeKey = "30d", customFrom = "", customTo = "" } = {}) {
    if (rangeKey === "30d") {
        const startDate = getWindowStart(30);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        return {
            isValid: true,
            rangeKey: "30d",
            rangeLabel: "Last 30 Days",
            startDate,
            endDate
        };
    }

    if (rangeKey === "90d") {
        const startDate = getWindowStart(90);
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        return {
            isValid: true,
            rangeKey: "90d",
            rangeLabel: "Last 90 Days",
            startDate,
            endDate
        };
    }

    if (rangeKey === "ytd") {
        const startDate = getYearStart();
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        return {
            isValid: true,
            rangeKey: "ytd",
            rangeLabel: "Year To Date",
            startDate,
            endDate
        };
    }

    const fromDate = parseDateInput(customFrom, { endOfDay: false });
    const toDate = parseDateInput(customTo, { endOfDay: true });

    if (!fromDate || !toDate) {
        return {
            isValid: false,
            error: "Select valid From and To dates for the custom cash flow range."
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
        rangeKey: `custom:${customFrom}:${customTo}`,
        rangeLabel: `${formatDateLabel(fromDate)} - ${formatDateLabel(toDate)}`,
        startDate: fromDate,
        endDate: toDate
    };
}

function normalizeMovementDateLabel(value) {
    const date = toDateValue(value);
    return Number.isNaN(date.getTime()) ? "-" : toDateInputValue(date);
}

function resolveTransactionDate(row = {}, preferredFields = []) {
    const fallbackFields = [
        ...preferredFields,
        "transactionDate",
        "paymentDate",
        "donationDate",
        "recordedOn",
        "createdAt",
        "createdOn",
        "updatedAt",
        "updatedOn",
        "recordedAt"
    ];

    for (const field of fallbackFields) {
        const candidate = row?.[field];
        if (!candidate) continue;

        const date = toDateValue(candidate);
        if (!Number.isNaN(date.getTime()) && date.getTime() > 0) {
            return date;
        }
    }

    const auditCandidates = [
        row?.audit?.createdOn,
        row?.audit?.createdAt,
        row?.audit?.updatedOn,
        row?.audit?.updatedAt
    ];

    for (const candidate of auditCandidates) {
        if (!candidate) continue;
        const date = toDateValue(candidate);
        if (!Number.isNaN(date.getTime()) && date.getTime() > 0) {
            return date;
        }
    }

    return null;
}

function resolveRecordedAt(row = {}) {
    const candidates = [
        row?.recordedAt,
        row?.recordedOn,
        row?.createdAt,
        row?.createdOn,
        row?.audit?.createdOn,
        row?.audit?.createdAt,
        row?.updatedAt,
        row?.updatedOn,
        row?.audit?.updatedOn,
        row?.audit?.updatedAt
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;
        const date = toDateValue(candidate);
        if (!Number.isNaN(date.getTime()) && date.getTime() > 0) {
            return date;
        }
    }

    return null;
}

function buildRetailMovementRows(rows = []) {
    return rows
        .map(row => {
            const amount = roundCurrency(row.amountApplied ?? row.amountPaid ?? row.totalCollected);
            if (amount === 0) return null;
            const transactionDate = resolveTransactionDate(row, ["paymentDate"]);
            const recordedAt = resolveRecordedAt(row);
            const storeName = normalizeText(row.store) || "Unknown Store";
            let storeKey = "other";

            if (storeName === "Tasty Treats") {
                storeKey = "tastyTreats";
            } else if (storeName === "Church Store") {
                storeKey = "churchStore";
            }

            return {
                id: row.id,
                date: transactionDate,
                transactionDate,
                recordedAt,
                sourceKey: "retail",
                sourceLabel: `Retail Receipt${storeName ? ` - ${storeName}` : ""}`,
                counterparty: normalizeText(row.customerName) || "Retail Customer",
                reference: normalizeText(row.paymentId || row.transactionRef || row.invoiceId || row.relatedSaleId || row.id),
                notes: normalizeText(row.notes || row.paymentNotes || row.modeOfPayment || ""),
                amount,
                storeKey,
                storeName,
                statementBucket: amount >= 0 ? "retailReceipts" : "retailReversals"
            };
        })
        .filter(Boolean);
}

function buildConsignmentMovementRows(rows = []) {
    return rows
        .map(row => {
            const amount = roundCurrency(row.amountApplied ?? row.amountPaid ?? row.totalCollected);
            if (amount === 0) return null;
            const transactionDate = resolveTransactionDate(row, ["paymentDate"]);
            const recordedAt = resolveRecordedAt(row);

            return {
                id: row.id,
                date: transactionDate,
                transactionDate,
                recordedAt,
                sourceKey: "consignment",
                sourceLabel: "Consignment Receipt",
                counterparty: normalizeText(row.teamName || row.teamMemberName) || "Consignment Team",
                reference: normalizeText(row.paymentId || row.transactionRef || row.relatedOrderId || row.id),
                notes: normalizeText(row.notes || row.modeOfPayment || ""),
                amount,
                statementBucket: amount >= 0 ? "consignmentReceipts" : "consignmentReversals"
            };
        })
        .filter(Boolean);
}

function buildDonationMovementRows(rows = [], { salesPayments = [] } = {}) {
    const salesPaymentStoreMap = new Map(
        (salesPayments || []).map(row => [row.id, normalizeText(row.store)])
    );

    return rows
        .map(row => {
            const amount = roundCurrency(row.amount);
            if (amount === 0) return null;
            const transactionDate = resolveTransactionDate(row, ["donationDate"]);
            const recordedAt = resolveRecordedAt(row);

            const counterparty = normalizeText(row.customerName || row.teamName || row.donorName) || "Donation";
            const moduleType = normalizeText(row.moduleType);
            const sourcePaymentDocId = normalizeText(row.sourcePaymentDocId);
            const retailStore = salesPaymentStoreMap.get(sourcePaymentDocId) || "";
            let donationSourceKey = "other";
            let donationSourceLabel = "Other";

            if (moduleType === "Simple Consignment") {
                donationSourceKey = "consignment";
                donationSourceLabel = "Consignment";
            } else if (retailStore === "Tasty Treats") {
                donationSourceKey = "tastyTreats";
                donationSourceLabel = "Tasty Treats";
            } else if (retailStore === "Church Store") {
                donationSourceKey = "churchStore";
                donationSourceLabel = "Church Store";
            } else if (moduleType === "Retail Store") {
                donationSourceKey = "otherRetail";
                donationSourceLabel = "Retail Other";
            }

            return {
                id: row.id,
                date: transactionDate,
                transactionDate,
                recordedAt,
                sourceKey: "donation",
                sourceLabel: `Donation - ${donationSourceLabel}`,
                counterparty,
                reference: normalizeText(row.donationId || row.paymentReference || row.sourceSaleId || row.sourceOrderId || row.id),
                notes: normalizeText(row.notes || row.reason || row.sourceCollection || ""),
                amount,
                donationSourceKey,
                statementBucket: amount >= 0 ? "donationReceipts" : "donationReversals"
            };
        })
        .filter(Boolean);
}

function buildSupplierMovementRows(rows = []) {
    return rows
        .map(row => {
            const paymentAmount = roundCurrency(row.amountPaid);
            if (paymentAmount === 0) return null;
            const transactionDate = resolveTransactionDate(row, ["paymentDate"]);
            const recordedAt = resolveRecordedAt(row);

            const cashAmount = roundCurrency(paymentAmount * -1);

            return {
                id: row.id,
                date: transactionDate,
                transactionDate,
                recordedAt,
                sourceKey: "supplier",
                sourceLabel: "Supplier Payment",
                counterparty: normalizeText(row.supplierName) || "Supplier",
                reference: normalizeText(row.paymentId || row.transactionRef || row.relatedInvoiceNumber || row.relatedInvoiceId || row.id),
                notes: normalizeText(row.notes || row.invoiceName || row.modeOfPayment || ""),
                amount: cashAmount,
                statementBucket: cashAmount < 0 ? "supplierPayments" : "supplierReversals"
            };
        })
        .filter(Boolean);
}

function buildStatementTotals(movements = []) {
    const totals = {
        retailReceipts: 0,
        retailReversals: 0,
        consignmentReceipts: 0,
        consignmentReversals: 0,
        donationReceipts: 0,
        donationReversals: 0,
        supplierPayments: 0,
        supplierReversals: 0,
        retailByStore: {
            tastyTreatsReceipts: 0,
            tastyTreatsReversals: 0,
            churchStoreReceipts: 0,
            churchStoreReversals: 0,
            otherReceipts: 0,
            otherReversals: 0
        },
        donationBySource: {
            tastyTreatsReceipts: 0,
            tastyTreatsReversals: 0,
            churchStoreReceipts: 0,
            churchStoreReversals: 0,
            consignmentReceipts: 0,
            consignmentReversals: 0,
            otherReceipts: 0,
            otherReversals: 0
        }
    };

    movements.forEach(row => {
        if (row.sourceKey === "retail") {
            const storeMap = totals.retailByStore;
            if (row.storeKey === "tastyTreats") {
                if (row.amount >= 0) {
                    storeMap.tastyTreatsReceipts = roundCurrency(storeMap.tastyTreatsReceipts + row.amount);
                } else {
                    storeMap.tastyTreatsReversals = roundCurrency(storeMap.tastyTreatsReversals + row.amount);
                }
            } else if (row.storeKey === "churchStore") {
                if (row.amount >= 0) {
                    storeMap.churchStoreReceipts = roundCurrency(storeMap.churchStoreReceipts + row.amount);
                } else {
                    storeMap.churchStoreReversals = roundCurrency(storeMap.churchStoreReversals + row.amount);
                }
            } else {
                if (row.amount >= 0) {
                    storeMap.otherReceipts = roundCurrency(storeMap.otherReceipts + row.amount);
                } else {
                    storeMap.otherReversals = roundCurrency(storeMap.otherReversals + row.amount);
                }
            }
        }

        if (row.sourceKey === "donation") {
            const donationMap = totals.donationBySource;
            if (row.donationSourceKey === "tastyTreats") {
                if (row.amount >= 0) {
                    donationMap.tastyTreatsReceipts = roundCurrency(donationMap.tastyTreatsReceipts + row.amount);
                } else {
                    donationMap.tastyTreatsReversals = roundCurrency(donationMap.tastyTreatsReversals + row.amount);
                }
            } else if (row.donationSourceKey === "churchStore") {
                if (row.amount >= 0) {
                    donationMap.churchStoreReceipts = roundCurrency(donationMap.churchStoreReceipts + row.amount);
                } else {
                    donationMap.churchStoreReversals = roundCurrency(donationMap.churchStoreReversals + row.amount);
                }
            } else if (row.donationSourceKey === "consignment") {
                if (row.amount >= 0) {
                    donationMap.consignmentReceipts = roundCurrency(donationMap.consignmentReceipts + row.amount);
                } else {
                    donationMap.consignmentReversals = roundCurrency(donationMap.consignmentReversals + row.amount);
                }
            } else {
                if (row.amount >= 0) {
                    donationMap.otherReceipts = roundCurrency(donationMap.otherReceipts + row.amount);
                } else {
                    donationMap.otherReversals = roundCurrency(donationMap.otherReversals + row.amount);
                }
            }
        }

        if (!Object.prototype.hasOwnProperty.call(totals, row.statementBucket)) return;

        if (row.statementBucket === "supplierPayments") {
            totals.supplierPayments = roundCurrency(totals.supplierPayments + Math.abs(row.amount));
            return;
        }

        if (row.statementBucket === "supplierReversals") {
            totals.supplierReversals = roundCurrency(totals.supplierReversals - Math.abs(row.amount));
            return;
        }

        totals[row.statementBucket] = roundCurrency(totals[row.statementBucket] + row.amount);
    });

    const totalInflows = roundCurrency(
        totals.retailReceipts
        + totals.retailReversals
        + totals.consignmentReceipts
        + totals.consignmentReversals
        + totals.donationReceipts
        + totals.donationReversals
    );

    const totalOutflows = roundCurrency(totals.supplierPayments + totals.supplierReversals);

    return {
        ...totals,
        totalInflows,
        totalOutflows,
        netCashMovement: roundCurrency(totalInflows - totalOutflows)
    };
}

function buildDailyRows(movements = []) {
    const byDay = new Map();

    movements.forEach(row => {
        const dayKey = normalizeMovementDateLabel(row.date);
        if (!byDay.has(dayKey)) {
            byDay.set(dayKey, {
                dayKey,
                date: row.date,
                retail: 0,
                consignment: 0,
                donations: 0,
                suppliers: 0,
                net: 0
            });
        }

        const bucket = byDay.get(dayKey);

        if (row.sourceKey === "retail") {
            bucket.retail = roundCurrency(bucket.retail + row.amount);
        }
        if (row.sourceKey === "consignment") {
            bucket.consignment = roundCurrency(bucket.consignment + row.amount);
        }
        if (row.sourceKey === "donation") {
            bucket.donations = roundCurrency(bucket.donations + row.amount);
        }
        if (row.sourceKey === "supplier") {
            bucket.suppliers = roundCurrency(bucket.suppliers + row.amount);
        }

        bucket.net = roundCurrency(bucket.net + row.amount);
    });

    return [...byDay.values()].sort((left, right) => toDateValue(right.date).getTime() - toDateValue(left.date).getTime());
}

function buildActivityRows(movements = []) {
    return [...movements]
        .sort((left, right) => toDateValue(right.date).getTime() - toDateValue(left.date).getTime());
}

function normalizeStatus(value, fallback = "") {
    return normalizeText(value || fallback);
}

function diffDays(fromValue, toValue = new Date()) {
    const fromDate = toDateValue(fromValue);
    const toDate = toDateValue(toValue);
    if (fromDate.getTime() <= 0 || toDate.getTime() <= 0) return 0;

    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.floor((toDate.getTime() - fromDate.getTime()) / msPerDay));
}

function resolveAgeBucket(ageDays = 0) {
    if (ageDays <= 30) return "0-30 days";
    if (ageDays <= 60) return "31-60 days";
    if (ageDays <= 90) return "61-90 days";
    return "91+ days";
}

function buildAgingSummary(rows = []) {
    const seed = {
        "0-30 days": { label: "0-30 days", count: 0, amount: 0 },
        "31-60 days": { label: "31-60 days", count: 0, amount: 0 },
        "61-90 days": { label: "61-90 days", count: 0, amount: 0 },
        "91+ days": { label: "91+ days", count: 0, amount: 0 }
    };

    rows.forEach(row => {
        const bucket = seed[row.ageBucket];
        if (!bucket) return;
        bucket.count += 1;
        bucket.amount = roundCurrency(bucket.amount + roundCurrency(row.balanceDue || 0));
    });

    return Object.values(seed);
}

function buildRetailReceivableRows(rows = [], asOfDate = new Date()) {
    return rows
        .filter(row => normalizeStatus(row.saleStatus, "Active") !== "Voided")
        .map(row => {
            const balanceDue = roundCurrency(row.balanceDue);
            if (balanceDue <= 0) return null;

            const transactionDate = resolveTransactionDate(row, ["saleDate"]);
            const ageDays = diffDays(transactionDate, asOfDate);

            return {
                id: row.id,
                source: "Retail",
                sourceLabel: normalizeText(row.store) || "Retail",
                reference: normalizeText(row.saleId || row.manualVoucherNumber || row.id),
                counterparty: normalizeText(row.customerInfo?.name) || "Retail Customer",
                transactionDate,
                ageDays,
                ageBucket: resolveAgeBucket(ageDays),
                grossAmount: roundCurrency(row.financials?.grandTotal),
                amountPaid: roundCurrency(row.totalAmountPaid),
                balanceDue,
                status: normalizeStatus(row.paymentStatus, "Unpaid"),
                notes: normalizeText(row.saleNotes || row.manualVoucherNumber || "")
            };
        })
        .filter(Boolean);
}

function buildConsignmentReceivableRows(rows = [], asOfDate = new Date()) {
    return rows
        .filter(row => normalizeStatus(row.status, "Active") !== "Cancelled")
        .map(row => {
            const balanceDue = roundCurrency(row.balanceDue);
            if (balanceDue <= 0) return null;

            const transactionDate = resolveTransactionDate(row, ["checkoutDate"]);
            const ageDays = diffDays(transactionDate, asOfDate);

            return {
                id: row.id,
                source: "Consignment",
                sourceLabel: "Consignment",
                reference: normalizeText(row.consignmentId || row.manualVoucherNumber || row.id),
                counterparty: normalizeText(row.teamName || row.teamMemberName) || "Consignment Team",
                transactionDate,
                ageDays,
                ageBucket: resolveAgeBucket(ageDays),
                grossAmount: roundCurrency(row.totalValueSold),
                amountPaid: roundCurrency(row.totalAmountPaid),
                balanceDue,
                status: normalizeStatus(row.status, "Active"),
                notes: normalizeText(row.venue || row.manualVoucherNumber || "")
            };
        })
        .filter(Boolean);
}

function buildOutstandingReceivablesSummary(rows = []) {
    const retailRows = rows.filter(row => row.source === "Retail");
    const consignmentRows = rows.filter(row => row.source === "Consignment");
    const overdueRows = rows.filter(row => row.ageDays > 30);
    const uniqueParties = new Set(rows.map(row => normalizeText(row.counterparty)).filter(Boolean));

    return {
        openBalance: roundCurrency(rows.reduce((sum, row) => sum + row.balanceDue, 0)),
        retailBalance: roundCurrency(retailRows.reduce((sum, row) => sum + row.balanceDue, 0)),
        consignmentBalance: roundCurrency(consignmentRows.reduce((sum, row) => sum + row.balanceDue, 0)),
        overdueBalance: roundCurrency(overdueRows.reduce((sum, row) => sum + row.balanceDue, 0)),
        openItems: rows.length,
        uniqueParties: uniqueParties.size
    };
}

function buildOutstandingReceivablesReportData({
    salesInvoices = [],
    consignmentOrders = [],
    asOfDate = new Date(),
    durationMs = 0,
    truncatedSources = {}
}) {
    const detailRows = [
        ...buildRetailReceivableRows(salesInvoices, asOfDate),
        ...buildConsignmentReceivableRows(consignmentOrders, asOfDate)
    ].sort((left, right) => right.ageDays - left.ageDays || toDateValue(left.transactionDate).getTime() - toDateValue(right.transactionDate).getTime());

    return {
        asOfDate,
        generatedAt: Date.now(),
        durationMs,
        summary: buildOutstandingReceivablesSummary(detailRows),
        agingRows: buildAgingSummary(detailRows),
        detailRows,
        metadata: {
            truncatedSources,
            sourceCounts: {
                salesInvoices: salesInvoices.length,
                consignmentOrders: consignmentOrders.length
            }
        }
    };
}

function buildPurchasePayableRows(rows = [], asOfDate = new Date()) {
    return rows
        .filter(row => normalizeStatus(row.invoiceStatus || row.paymentStatus, "Unpaid") !== "Voided")
        .map(row => {
            const balanceDue = roundCurrency(row.balanceDue ?? row.invoiceTotal);
            if (balanceDue <= 0) return null;

            const transactionDate = resolveTransactionDate(row, ["purchaseDate"]);
            const ageDays = diffDays(transactionDate, asOfDate);

            return {
                id: row.id,
                supplierName: normalizeText(row.supplierName) || "Supplier",
                reference: normalizeText(row.invoiceId || row.supplierInvoiceNo || row.id),
                invoiceName: normalizeText(row.invoiceName) || "Purchase Invoice",
                transactionDate,
                ageDays,
                ageBucket: resolveAgeBucket(ageDays),
                invoiceTotal: roundCurrency(row.invoiceTotal),
                amountPaid: roundCurrency(row.amountPaid),
                balanceDue,
                status: normalizeStatus(row.paymentStatus, "Unpaid")
            };
        })
        .filter(Boolean);
}

function buildSupplierSummaryRows(rows = []) {
    const bySupplier = new Map();

    rows.forEach(row => {
        const key = normalizeText(row.supplierName) || "Supplier";
        if (!bySupplier.has(key)) {
            bySupplier.set(key, {
                supplierName: key,
                invoiceCount: 0,
                invoiceTotal: 0,
                amountPaid: 0,
                balanceDue: 0
            });
        }

        const bucket = bySupplier.get(key);
        bucket.invoiceCount += 1;
        bucket.invoiceTotal = roundCurrency(bucket.invoiceTotal + row.invoiceTotal);
        bucket.amountPaid = roundCurrency(bucket.amountPaid + row.amountPaid);
        bucket.balanceDue = roundCurrency(bucket.balanceDue + row.balanceDue);
    });

    return [...bySupplier.values()].sort((left, right) => right.balanceDue - left.balanceDue);
}

function buildPurchasePayablesSummary(rows = [], supplierRows = []) {
    const overdueRows = rows.filter(row => row.ageDays > 30);

    return {
        openBalance: roundCurrency(rows.reduce((sum, row) => sum + row.balanceDue, 0)),
        overdueBalance: roundCurrency(overdueRows.reduce((sum, row) => sum + row.balanceDue, 0)),
        openInvoices: rows.length,
        supplierCount: supplierRows.length
    };
}

function buildPurchasePayablesReportData({
    purchaseInvoices = [],
    asOfDate = new Date(),
    durationMs = 0,
    truncatedSources = {}
}) {
    const detailRows = buildPurchasePayableRows(purchaseInvoices, asOfDate)
        .sort((left, right) => right.ageDays - left.ageDays || toDateValue(left.transactionDate).getTime() - toDateValue(right.transactionDate).getTime());
    const supplierRows = buildSupplierSummaryRows(detailRows);

    return {
        asOfDate,
        generatedAt: Date.now(),
        durationMs,
        summary: buildPurchasePayablesSummary(detailRows, supplierRows),
        agingRows: buildAgingSummary(detailRows),
        supplierRows,
        detailRows,
        metadata: {
            truncatedSources,
            sourceCounts: {
                purchaseInvoices: purchaseInvoices.length
            }
        }
    };
}

function buildRetailProfitRows(rows = [], productCostMap = new Map()) {
    return rows
        .filter(row => normalizeStatus(row.saleStatus, "Active") !== "Voided")
        .filter(row => normalizeStatus(row.saleType, "Revenue") !== "Sample")
        .map(row => {
            const grossSales = roundCurrency(row.financials?.itemsSubtotal);
            const discounts = roundCurrency((row.financials?.totalLineDiscount || 0) + (row.financials?.orderDiscountAmount || 0));
            const netSales = roundCurrency(row.financials?.finalTaxableAmount);
            const cogs = roundCurrency((row.lineItems || []).reduce((sum, item) => {
                const unitCost = roundCurrency(productCostMap.get(normalizeText(item.productId)) || 0);
                return sum + ((Number(item.quantity) || 0) * unitCost);
            }, 0));

            return {
                id: row.id,
                segment: normalizeText(row.store) || "Retail",
                grossSales,
                discounts,
                netSales,
                cogs,
                expenses: roundCurrency(row.financials?.totalExpenses),
                taxCollected: roundCurrency(row.financials?.totalTax)
            };
        });
}

function buildConsignmentProfitRows(rows = [], productCostMap = new Map()) {
    return rows
        .filter(row => normalizeStatus(row.status, "Active") !== "Cancelled")
        .map(row => {
            const cogs = roundCurrency((row.items || []).reduce((sum, item) => {
                const unitCost = roundCurrency(productCostMap.get(normalizeText(item.productId)) || 0);
                return sum + ((Number(item.quantitySold) || 0) * unitCost);
            }, 0));

            return {
                id: row.id,
                segment: "Consignment",
                grossSales: roundCurrency(row.totalValueSold),
                discounts: 0,
                netSales: roundCurrency(row.totalValueSold),
                cogs,
                expenses: roundCurrency(row.totalExpenses),
                taxCollected: 0
            };
        });
}

function sumMetric(rows = [], field) {
    return roundCurrency(rows.reduce((sum, row) => sum + roundCurrency(row?.[field]), 0));
}

function buildSegmentSummaryRows(rows = []) {
    const bySegment = new Map();

    rows.forEach(row => {
        const key = normalizeText(row.segment) || "Other";
        if (!bySegment.has(key)) {
            bySegment.set(key, {
                segment: key,
                grossSales: 0,
                discounts: 0,
                netSales: 0,
                cogs: 0,
                grossProfit: 0
            });
        }

        const bucket = bySegment.get(key);
        bucket.grossSales = roundCurrency(bucket.grossSales + row.grossSales);
        bucket.discounts = roundCurrency(bucket.discounts + row.discounts);
        bucket.netSales = roundCurrency(bucket.netSales + row.netSales);
        bucket.cogs = roundCurrency(bucket.cogs + row.cogs);
        bucket.grossProfit = roundCurrency(bucket.netSales - bucket.cogs);
    });

    return [...bySegment.values()].sort((left, right) => right.netSales - left.netSales);
}

function buildProfitAndLossReportData({
    salesInvoices = [],
    consignmentOrders = [],
    donations = [],
    products = [],
    rangeSpec,
    durationMs = 0,
    truncatedSources = {}
}) {
    const productCostMap = new Map(
        (products || []).map(product => [normalizeText(product.id), roundCurrency(product.unitPrice)])
    );

    const retailRows = buildRetailProfitRows(salesInvoices, productCostMap);
    const consignmentRows = buildConsignmentProfitRows(consignmentOrders, productCostMap);
    const segmentSourceRows = [...retailRows, ...consignmentRows];

    const retailGrossSales = sumMetric(retailRows, "grossSales");
    const retailDiscounts = sumMetric(retailRows, "discounts");
    const retailNetSales = sumMetric(retailRows, "netSales");
    const retailCogs = sumMetric(retailRows, "cogs");
    const retailExpenses = sumMetric(retailRows, "expenses");
    const retailTaxesCollected = sumMetric(retailRows, "taxCollected");

    const consignmentNetSales = sumMetric(consignmentRows, "netSales");
    const consignmentCogs = sumMetric(consignmentRows, "cogs");
    const consignmentExpenses = sumMetric(consignmentRows, "expenses");

    const netSalesRevenue = roundCurrency(retailNetSales + consignmentNetSales);
    const totalCogs = roundCurrency(retailCogs + consignmentCogs);
    const grossProfit = roundCurrency(netSalesRevenue - totalCogs);
    const totalOperatingExpenses = roundCurrency(retailExpenses + consignmentExpenses);
    const operatingProfit = roundCurrency(grossProfit - totalOperatingExpenses);
    const netDonations = roundCurrency((donations || []).reduce((sum, row) => sum + roundCurrency(row.amount), 0));
    const netProfit = roundCurrency(operatingProfit + netDonations);

    return {
        rangeKey: rangeSpec.rangeKey,
        rangeLabel: rangeSpec.rangeLabel,
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate,
        generatedAt: Date.now(),
        durationMs,
        summary: {
            netSalesRevenue,
            grossProfit,
            operatingProfit,
            netDonations,
            netProfit,
            retailTaxesCollected
        },
        statementRows: [
            { section: "Revenue", label: "Retail Gross Sales", amount: retailGrossSales },
            { section: "Revenue", label: "Less Retail Discounts", amount: roundCurrency(retailDiscounts * -1) },
            { section: "Revenue", label: "Retail Net Sales", amount: retailNetSales, tone: "total" },
            { section: "Revenue", label: "Consignment Sales", amount: consignmentNetSales },
            { section: "Revenue", label: "Net Sales Revenue", amount: netSalesRevenue, tone: "total" },
            { section: "Cost Of Sales", label: "Retail Cost Of Goods Sold", amount: roundCurrency(retailCogs * -1) },
            { section: "Cost Of Sales", label: "Consignment Cost Of Goods Sold", amount: roundCurrency(consignmentCogs * -1) },
            { section: "Cost Of Sales", label: "Gross Profit", amount: grossProfit, tone: "total" },
            { section: "Operating Expenses", label: "Retail Operating Expenses", amount: roundCurrency(retailExpenses * -1) },
            { section: "Operating Expenses", label: "Consignment Operating Expenses", amount: roundCurrency(consignmentExpenses * -1) },
            { section: "Operating Expenses", label: "Operating Profit", amount: operatingProfit, tone: "total" },
            { section: "Other Income", label: "Net Donations", amount: netDonations },
            { section: "Other Income", label: "Net Profit / (Loss)", amount: netProfit, tone: "total" }
        ],
        segmentRows: buildSegmentSummaryRows(segmentSourceRows),
        metadata: {
            truncatedSources,
            sourceCounts: {
                salesInvoices: salesInvoices.length,
                consignmentOrders: consignmentOrders.length,
                donations: donations.length,
                products: products.length
            },
            notes: [
                "Retail revenue excludes output tax and uses final taxable sales value.",
                "Cost of goods sold is estimated from the current product cost basis stored in product master data.",
                "Consignment revenue uses recorded sold value on consignment orders within the selected reporting window."
            ]
        }
    };
}

function buildStatementRows(statement = {}) {
    const rows = [
        { section: "Cash Inflows", label: "Consignment Receipts", amount: statement.consignmentReceipts, tone: "positive" },
        { section: "Cash Inflows", label: "Consignment Reversals", amount: statement.consignmentReversals, tone: "negative" },
        { section: "Cash Inflows", label: "Total Cash Inflows", amount: statement.totalInflows, tone: "total" },
        { section: "Cash Outflows", label: "Supplier Payments", amount: statement.supplierPayments, tone: "positive" },
        { section: "Cash Outflows", label: "Supplier Payment Reversals", amount: statement.supplierReversals, tone: "negative" },
        { section: "Cash Outflows", label: "Total Cash Outflows", amount: statement.totalOutflows, tone: "total" },
        { section: "Net Movement", label: "Net Cash Movement", amount: statement.netCashMovement, tone: statement.netCashMovement >= 0 ? "positive" : "negative" }
    ];

    const retailByStore = statement.retailByStore || {};
    const storeBreakdownRows = [
        { section: "Retail Breakdown", label: "Tasty Treats Receipts", amount: retailByStore.tastyTreatsReceipts || 0 },
        { section: "Retail Breakdown", label: "Tasty Treats Reversals / Refunds", amount: retailByStore.tastyTreatsReversals || 0 },
        { section: "Retail Breakdown", label: "Church Store Receipts", amount: retailByStore.churchStoreReceipts || 0 },
        { section: "Retail Breakdown", label: "Church Store Reversals / Refunds", amount: retailByStore.churchStoreReversals || 0 }
    ];

    if ((retailByStore.otherReceipts || 0) !== 0 || (retailByStore.otherReversals || 0) !== 0) {
        storeBreakdownRows.push(
            { section: "Retail Breakdown", label: "Other Store Receipts", amount: retailByStore.otherReceipts || 0 },
            { section: "Retail Breakdown", label: "Other Store Reversals / Refunds", amount: retailByStore.otherReversals || 0 }
        );
    }

    storeBreakdownRows.push({
        section: "Retail Breakdown",
        label: "Total Retail Net Cash",
        amount: roundCurrency(statement.retailReceipts + statement.retailReversals),
        tone: "total"
    });

    const donationBySource = statement.donationBySource || {};
    const donationBreakdownRows = [
        { section: "Donation Breakdown", label: "Tasty Treats Donations Received", amount: donationBySource.tastyTreatsReceipts || 0 },
        { section: "Donation Breakdown", label: "Tasty Treats Donation Reversals", amount: donationBySource.tastyTreatsReversals || 0 },
        { section: "Donation Breakdown", label: "Church Store Donations Received", amount: donationBySource.churchStoreReceipts || 0 },
        { section: "Donation Breakdown", label: "Church Store Donation Reversals", amount: donationBySource.churchStoreReversals || 0 },
        { section: "Donation Breakdown", label: "Consignment Donations Received", amount: donationBySource.consignmentReceipts || 0 },
        { section: "Donation Breakdown", label: "Consignment Donation Reversals", amount: donationBySource.consignmentReversals || 0 }
    ];

    if ((donationBySource.otherReceipts || 0) !== 0 || (donationBySource.otherReversals || 0) !== 0) {
        donationBreakdownRows.push(
            { section: "Donation Breakdown", label: "Other Donations Received", amount: donationBySource.otherReceipts || 0 },
            { section: "Donation Breakdown", label: "Other Donation Reversals", amount: donationBySource.otherReversals || 0 }
        );
    }

    donationBreakdownRows.push({
        section: "Donation Breakdown",
        label: "Total Donation Net Cash",
        amount: roundCurrency(statement.donationReceipts + statement.donationReversals),
        tone: "total"
    });

    return [...storeBreakdownRows, ...donationBreakdownRows, ...rows];
}

function buildCashFlowSummaryFromRows({
    salesPayments = [],
    consignmentPayments = [],
    supplierPayments = [],
    donations = [],
    rangeSpec,
    durationMs = 0,
    truncatedSources = {}
}) {
    const movements = [
        ...buildRetailMovementRows(salesPayments),
        ...buildConsignmentMovementRows(consignmentPayments),
        ...buildDonationMovementRows(donations, { salesPayments }),
        ...buildSupplierMovementRows(supplierPayments)
    ].sort((left, right) => toDateValue(right.date).getTime() - toDateValue(left.date).getTime());

    const statement = buildStatementTotals(movements);
    const dailyRows = buildDailyRows(movements);
    const activityRows = buildActivityRows(movements);

    return {
        rangeKey: rangeSpec.rangeKey,
        rangeLabel: rangeSpec.rangeLabel,
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate,
        generatedAt: Date.now(),
        durationMs,
        summary: {
            retailNet: roundCurrency(statement.retailReceipts + statement.retailReversals),
            consignmentNet: roundCurrency(statement.consignmentReceipts + statement.consignmentReversals),
            donationNet: roundCurrency(statement.donationReceipts + statement.donationReversals),
            supplierNet: roundCurrency(statement.supplierPayments + statement.supplierReversals),
            netCashMovement: statement.netCashMovement,
            movementCount: movements.length,
            retailByStore: {
                tastyTreats: roundCurrency((statement.retailByStore?.tastyTreatsReceipts || 0) + (statement.retailByStore?.tastyTreatsReversals || 0)),
                churchStore: roundCurrency((statement.retailByStore?.churchStoreReceipts || 0) + (statement.retailByStore?.churchStoreReversals || 0)),
                other: roundCurrency((statement.retailByStore?.otherReceipts || 0) + (statement.retailByStore?.otherReversals || 0))
            }
        },
        statement,
        statementRows: buildStatementRows(statement),
        dailyRows,
        activityRows,
        sourceRows: {
            salesPayments,
            consignmentPayments,
            supplierPayments,
            donations
        },
        metadata: {
            truncatedSources,
            sourceCounts: {
                salesPayments: salesPayments.length,
                consignmentPayments: consignmentPayments.length,
                supplierPayments: supplierPayments.length,
                donations: donations.length
            }
        }
    };
}

export async function getCashFlowSummaryReport(user, rangeSpec, { forceRefresh = false } = {}) {
    if (!user || !["admin", "finance"].includes(user.role)) {
        throw new Error("You do not have access to the cash flow summary report.");
    }

    if (!forceRefresh) {
        const cached = readCashFlowCache(user, rangeSpec.rangeKey);
        if (cached?.data) {
            return {
                data: cached.data,
                source: "cache",
                loadedAt: Number(cached.loadedAt) || Date.now(),
                expiresAt: Number(cached.expiresAt) || (Date.now() + CACHE_TTL_MS)
            };
        }
    }

    const startedAt = performance.now();
    const [salesPaymentsResult, consignmentPaymentsResult, supplierPaymentsResult, donationsResult] = await Promise.all([
        fetchReportWindowedRows(COLLECTIONS.salesPaymentsLedger, {
            dateField: "paymentDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.consignmentPaymentsLedger, {
            dateField: "paymentDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.supplierPaymentsLedger, {
            dateField: "paymentDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.donations, {
            dateField: "donationDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        })
    ]);

    const data = buildCashFlowSummaryFromRows({
        salesPayments: salesPaymentsResult.rows,
        consignmentPayments: consignmentPaymentsResult.rows,
        supplierPayments: supplierPaymentsResult.rows,
        donations: donationsResult.rows,
        rangeSpec,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            salesPayments: salesPaymentsResult.truncated,
            consignmentPayments: consignmentPaymentsResult.truncated,
            supplierPayments: supplierPaymentsResult.truncated,
            donations: donationsResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeCashFlowCache(user, rangeSpec.rangeKey, data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getOutstandingReceivablesReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "finance"].includes(user.role)) {
        throw new Error("You do not have access to the outstanding receivables report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "receivables", "as-of-today");
        if (cached?.data) {
            return {
                data: cached.data,
                source: "cache",
                loadedAt: Number(cached.loadedAt) || Date.now(),
                expiresAt: Number(cached.expiresAt) || (Date.now() + CACHE_TTL_MS)
            };
        }
    }

    const startedAt = performance.now();
    const [salesInvoicesResult, consignmentOrdersResult] = await Promise.all([
        fetchReportWindowedRows(COLLECTIONS.salesInvoices, { dateField: "saleDate" }),
        fetchReportWindowedRows(COLLECTIONS.simpleConsignments, { dateField: "checkoutDate" })
    ]);

    const data = buildOutstandingReceivablesReportData({
        salesInvoices: salesInvoicesResult.rows,
        consignmentOrders: consignmentOrdersResult.rows,
        asOfDate: new Date(),
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            salesInvoices: salesInvoicesResult.truncated,
            consignmentOrders: consignmentOrdersResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "receivables", "as-of-today", data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getPurchasePayablesReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "finance", "inventory_manager"].includes(user.role)) {
        throw new Error("You do not have access to the purchase payables report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "payables", "as-of-today");
        if (cached?.data) {
            return {
                data: cached.data,
                source: "cache",
                loadedAt: Number(cached.loadedAt) || Date.now(),
                expiresAt: Number(cached.expiresAt) || (Date.now() + CACHE_TTL_MS)
            };
        }
    }

    const startedAt = performance.now();
    const purchaseInvoicesResult = await fetchReportWindowedRows(COLLECTIONS.purchaseInvoices, { dateField: "purchaseDate" });

    const data = buildPurchasePayablesReportData({
        purchaseInvoices: purchaseInvoicesResult.rows,
        asOfDate: new Date(),
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            purchaseInvoices: purchaseInvoicesResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "payables", "as-of-today", data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getProfitAndLossReport(user, rangeSpec, { forceRefresh = false } = {}) {
    if (!user || !["admin", "finance"].includes(user.role)) {
        throw new Error("You do not have access to the profit and loss report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "pnl", rangeSpec.rangeKey);
        if (cached?.data) {
            return {
                data: cached.data,
                source: "cache",
                loadedAt: Number(cached.loadedAt) || Date.now(),
                expiresAt: Number(cached.expiresAt) || (Date.now() + CACHE_TTL_MS)
            };
        }
    }

    const startedAt = performance.now();
    const [salesInvoicesResult, consignmentOrdersResult, donationsResult, productsResult] = await Promise.all([
        fetchReportWindowedRows(COLLECTIONS.salesInvoices, {
            dateField: "saleDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.simpleConsignments, {
            dateField: "checkoutDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.donations, {
            dateField: "donationDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.products)
    ]);

    const data = buildProfitAndLossReportData({
        salesInvoices: salesInvoicesResult.rows,
        consignmentOrders: consignmentOrdersResult.rows,
        donations: donationsResult.rows,
        products: productsResult.rows,
        rangeSpec,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            salesInvoices: salesInvoicesResult.truncated,
            consignmentOrders: consignmentOrdersResult.truncated,
            donations: donationsResult.truncated,
            products: productsResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "pnl", rangeSpec.rangeKey, data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}
