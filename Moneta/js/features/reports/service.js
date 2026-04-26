import { getState } from "../../app/store.js";
import { COLLECTIONS } from "../../config/collections.js";
import {
    buildReorderPolicyExplanation,
    buildReorderPolicyScopeSummary,
    getMaxReorderPolicyWindowDays,
    resolvePolicyForProduct,
    resolveSystemDefaultPolicy
} from "../../shared/reorder-policy.js";
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

function calculateGrowthPercent(currentValue = 0, previousValue = 0) {
    const current = roundCurrency(currentValue);
    const previous = roundCurrency(previousValue);

    if (previous === 0) {
        return current === 0 ? 0 : null;
    }

    return roundCurrency(((current - previous) / Math.abs(previous)) * 100);
}

function buildComparableRangeSpec(rangeSpec = {}) {
    const startDate = toDateValue(rangeSpec.startDate);
    const endDate = toDateValue(rangeSpec.endDate);

    if (startDate.getTime() <= 0 || endDate.getTime() <= 0 || endDate.getTime() < startDate.getTime()) {
        return null;
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    const compareEndDate = new Date(startDate.getTime() - 1);
    const compareStartDate = new Date(compareEndDate.getTime() - durationMs);

    return {
        isValid: true,
        rangeKey: `compare:${toDateInputValue(compareStartDate)}:${toDateInputValue(compareEndDate)}`,
        rangeLabel: `${formatDateLabel(compareStartDate)} - ${formatDateLabel(compareEndDate)}`,
        startDate: compareStartDate,
        endDate: compareEndDate
    };
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

const RETAIL_STORES = ["Tasty Treats", "Church Store"];
const LOW_STOCK_THRESHOLD = 5;
const MEDIUM_STOCK_THRESHOLD = 20;

function buildSalesInvoiceReportRows(rows = []) {
    return rows
        .filter(row => normalizeStatus(row.saleStatus, "Active") !== "Voided")
        .filter(row => normalizeStatus(row.saleType, "Revenue") !== "Sample")
        .map(row => {
            const transactionDate = resolveTransactionDate(row, ["saleDate"]);
            const grossSales = roundCurrency(row.financials?.itemsSubtotal);
            const discounts = roundCurrency((row.financials?.totalLineDiscount || 0) + (row.financials?.orderDiscountAmount || 0));
            const netSales = roundCurrency(row.financials?.finalTaxableAmount);
            const tax = roundCurrency(row.financials?.totalTax);
            const grossBilled = roundCurrency(row.financials?.grandTotal);
            const collections = roundCurrency(row.totalAmountPaid);
            const donations = roundCurrency(row.totalDonation);
            const expenses = roundCurrency(row.financials?.totalExpenses);
            const balanceDue = roundCurrency(row.balanceDue);

            return {
                id: row.id,
                source: "Retail",
                channel: normalizeText(row.store) || "Other",
                transactionDate,
                store: normalizeText(row.store) || "Other",
                reference: normalizeText(row.saleId || row.manualVoucherNumber || row.id),
                customerName: normalizeText(row.customerInfo?.name) || "Customer",
                grossSales,
                discounts,
                netSales,
                tax,
                grossBilled,
                collections,
                donations,
                expenses,
                balanceDue,
                totalQuantity: Number(row.totalQuantity) || 0,
                paymentStatus: normalizeStatus(row.paymentStatus, "Unpaid")
            };
        });
}

function sumConsignmentQuantity(row = {}, field) {
    if (row?.[field] !== undefined && row?.[field] !== null) {
        return Math.max(0, Math.floor(Number(row[field]) || 0));
    }

    return (Array.isArray(row.items) ? row.items : []).reduce((sum, item) => {
        return sum + Math.max(0, Math.floor(Number(item?.[field]) || 0));
    }, 0);
}

function sumConsignmentValue(row = {}, field) {
    if (row?.[field] !== undefined && row?.[field] !== null) {
        return roundCurrency(row[field]);
    }

    return roundCurrency((Array.isArray(row.items) ? row.items : []).reduce((sum, item) => {
        const quantity = Math.max(0, Math.floor(Number(item?.[field]) || 0));
        const price = roundCurrency(item?.sellingPrice);
        return sum + (quantity * price);
    }, 0));
}

function buildConsignmentSalesReportRows(rows = []) {
    return rows
        .filter(row => normalizeStatus(row.status, "Active") !== "Cancelled")
        .map(row => {
            const transactionDate = resolveTransactionDate(row, ["checkoutDate"]);
            const quantityCheckedOut = Math.max(
                0,
                Math.floor(Number(row.totalQuantityCheckedOut) || sumConsignmentQuantity(row, "quantityCheckedOut"))
            );
            const quantitySold = sumConsignmentQuantity(row, "totalQuantitySold") || sumConsignmentQuantity(row, "quantitySold");
            const quantityReturned = sumConsignmentQuantity(row, "totalQuantityReturned") || sumConsignmentQuantity(row, "quantityReturned");
            const quantityDamaged = sumConsignmentQuantity(row, "totalQuantityDamaged") || sumConsignmentQuantity(row, "quantityDamaged");
            const quantityGifted = sumConsignmentQuantity(row, "totalQuantityGifted") || sumConsignmentQuantity(row, "quantityGifted");
            const quantityOnHand = Math.max(
                0,
                Math.floor(Number(row.totalOnHandQuantity) || (quantityCheckedOut - quantitySold - quantityReturned - quantityDamaged - quantityGifted))
            );
            const valueCheckedOut = row.totalValueCheckedOut !== undefined && row.totalValueCheckedOut !== null
                ? roundCurrency(row.totalValueCheckedOut)
                : sumConsignmentValue(row, "quantityCheckedOut");
            const valueSold = roundCurrency(row.totalValueSold);
            const valueReturned = sumConsignmentValue(row, "quantityReturned");
            const valueDamaged = sumConsignmentValue(row, "quantityDamaged");
            const valueGifted = sumConsignmentValue(row, "quantityGifted");
            const valueOnHand = row.totalValueOnHand !== undefined && row.totalValueOnHand !== null
                ? roundCurrency(row.totalValueOnHand)
                : roundCurrency(valueCheckedOut - valueSold - valueReturned - valueDamaged - valueGifted);

            return {
                id: row.id,
                source: "Consignment",
                channel: "Consignment",
                transactionDate,
                store: "Consignment",
                reference: normalizeText(row.consignmentId || row.manualVoucherNumber || row.id),
                customerName: normalizeText(row.teamName || row.teamMemberName) || "Consignment Team",
                teamName: normalizeText(row.teamName) || "Team",
                teamMemberName: normalizeText(row.teamMemberName) || "-",
                venue: normalizeText(row.venue) || "-",
                grossSales: roundCurrency(row.totalValueSold),
                discounts: 0,
                netSales: roundCurrency(row.totalValueSold),
                tax: 0,
                grossBilled: roundCurrency(row.totalValueSold),
                collections: roundCurrency(row.totalAmountPaid),
                donations: roundCurrency(row.totalDonation),
                expenses: roundCurrency(row.totalExpenses),
                balanceDue: roundCurrency(row.balanceDue),
                totalQuantity: quantitySold,
                quantityCheckedOut,
                quantitySold,
                quantityReturned,
                quantityDamaged,
                quantityGifted,
                quantityOnHand,
                valueCheckedOut,
                valueSold,
                valueReturned,
                valueDamaged,
                valueGifted,
                valueOnHand,
                paymentStatus: normalizeStatus(row.status, "Active")
            };
        });
}

function buildStoreSalesRows(rows = []) {
    const buckets = new Map();

    [...RETAIL_STORES, "Other"].forEach(store => {
        buckets.set(store, {
            store,
            transactionCount: 0,
            totalQuantity: 0,
            grossSales: 0,
            discounts: 0,
            netSales: 0,
            tax: 0,
            grossBilled: 0,
            collections: 0,
            donations: 0,
            expenses: 0,
            balanceDue: 0,
            averageSale: 0,
            collectionRate: 0,
            netContribution: 0
        });
    });

    rows.forEach(row => {
        const key = buckets.has(row.store) ? row.store : "Other";
        const bucket = buckets.get(key);
        bucket.transactionCount += 1;
        bucket.totalQuantity += row.totalQuantity;
        bucket.grossSales = roundCurrency(bucket.grossSales + row.grossSales);
        bucket.discounts = roundCurrency(bucket.discounts + row.discounts);
        bucket.netSales = roundCurrency(bucket.netSales + row.netSales);
        bucket.tax = roundCurrency(bucket.tax + row.tax);
        bucket.grossBilled = roundCurrency(bucket.grossBilled + row.grossBilled);
        bucket.collections = roundCurrency(bucket.collections + row.collections);
        bucket.donations = roundCurrency(bucket.donations + row.donations);
        bucket.expenses = roundCurrency(bucket.expenses + row.expenses);
        bucket.balanceDue = roundCurrency(bucket.balanceDue + row.balanceDue);
    });

    return [...buckets.values()]
        .map(bucket => ({
            ...bucket,
            averageSale: bucket.transactionCount > 0 ? roundCurrency(bucket.netSales / bucket.transactionCount) : 0,
            collectionRate: bucket.netSales > 0 ? roundCurrency((bucket.collections / bucket.netSales) * 100) : 0,
            netContribution: roundCurrency(bucket.collections + bucket.donations - bucket.expenses)
        }))
        .filter(bucket => bucket.transactionCount > 0 || bucket.store !== "Other");
}

function buildSalesChannelRows(rows = []) {
    const buckets = new Map();

    ["Tasty Treats", "Church Store", "Consignment", "Other"].forEach(channel => {
        buckets.set(channel, {
            channel,
            transactionCount: 0,
            totalQuantity: 0,
            grossSales: 0,
            discounts: 0,
            netSales: 0,
            tax: 0,
            grossBilled: 0,
            collections: 0,
            donations: 0,
            expenses: 0,
            balanceDue: 0,
            averageSale: 0,
            collectionRate: 0
        });
    });

    rows.forEach(row => {
        const key = buckets.has(row.channel) ? row.channel : "Other";
        const bucket = buckets.get(key);
        bucket.transactionCount += 1;
        bucket.totalQuantity += row.totalQuantity;
        bucket.grossSales = roundCurrency(bucket.grossSales + row.grossSales);
        bucket.discounts = roundCurrency(bucket.discounts + row.discounts);
        bucket.netSales = roundCurrency(bucket.netSales + row.netSales);
        bucket.tax = roundCurrency(bucket.tax + row.tax);
        bucket.grossBilled = roundCurrency(bucket.grossBilled + row.grossBilled);
        bucket.collections = roundCurrency(bucket.collections + row.collections);
        bucket.donations = roundCurrency(bucket.donations + row.donations);
        bucket.expenses = roundCurrency(bucket.expenses + row.expenses);
        bucket.balanceDue = roundCurrency(bucket.balanceDue + row.balanceDue);
    });

    return [...buckets.values()]
        .map(bucket => ({
            ...bucket,
            averageSale: bucket.transactionCount > 0 ? roundCurrency(bucket.netSales / bucket.transactionCount) : 0,
            collectionRate: bucket.netSales > 0 ? roundCurrency((bucket.collections / bucket.netSales) * 100) : 0
        }))
        .filter(bucket => bucket.transactionCount > 0 || bucket.channel !== "Other");
}

function startOfWeek(value = new Date()) {
    const date = toDateValue(value);
    if (date.getTime() <= 0) return new Date(0);

    const start = new Date(date);
    const weekday = start.getDay();
    const offset = weekday === 0 ? -6 : 1 - weekday;
    start.setDate(start.getDate() + offset);
    start.setHours(0, 0, 0, 0);
    return start;
}

function buildSalesTrendDailyRows(rows = []) {
    const byDay = new Map();

    rows.forEach(row => {
        const transactionDate = toDateValue(row.transactionDate);
        if (transactionDate.getTime() <= 0) return;

        const dayDate = new Date(transactionDate);
        dayDate.setHours(0, 0, 0, 0);
        const dayKey = toDateInputValue(dayDate);

        if (!byDay.has(dayKey)) {
            byDay.set(dayKey, {
                dayKey,
                date: dayDate,
                label: formatDateLabel(dayDate),
                dayName: dayDate.toLocaleDateString("en-IN", { weekday: "short" }),
                totalNetSales: 0,
                directNetSales: 0,
                consignmentNetSales: 0,
                transactionCount: 0,
                totalQuantity: 0,
                averageSale: 0
            });
        }

        const bucket = byDay.get(dayKey);
        const isConsignment = normalizeText(row.channel) === "Consignment";

        bucket.totalNetSales = roundCurrency(bucket.totalNetSales + roundCurrency(row.netSales));
        bucket.directNetSales = roundCurrency(bucket.directNetSales + (isConsignment ? 0 : roundCurrency(row.netSales)));
        bucket.consignmentNetSales = roundCurrency(bucket.consignmentNetSales + (isConsignment ? roundCurrency(row.netSales) : 0));
        bucket.transactionCount += 1;
        bucket.totalQuantity += Math.max(0, Number(row.totalQuantity) || 0);
    });

    const orderedRows = [...byDay.values()].sort((left, right) => left.date.getTime() - right.date.getTime());

    return orderedRows.map((row, index) => {
        const previousRow = orderedRows[index - 1] || null;
        const changeFromPreviousDay = previousRow
            ? roundCurrency(row.totalNetSales - previousRow.totalNetSales)
            : 0;

        return {
            ...row,
            averageSale: row.transactionCount > 0 ? roundCurrency(row.totalNetSales / row.transactionCount) : 0,
            hasPriorDay: Boolean(previousRow),
            changeFromPreviousDay,
            changePercentFromPreviousDay: previousRow
                ? calculateGrowthPercent(row.totalNetSales, previousRow.totalNetSales)
                : null
        };
    });
}

function buildSalesTrendWeeklyRows(dailyRows = []) {
    const byWeek = new Map();

    (dailyRows || []).forEach(row => {
        const weekStartDate = startOfWeek(row.date);
        if (weekStartDate.getTime() <= 0) return;

        const weekKey = toDateInputValue(weekStartDate);

        if (!byWeek.has(weekKey)) {
            byWeek.set(weekKey, {
                weekKey,
                weekStartDate,
                firstDate: row.date,
                lastDate: row.date,
                totalNetSales: 0,
                directNetSales: 0,
                consignmentNetSales: 0,
                transactionCount: 0,
                averageDailySales: 0,
                activeDays: 0
            });
        }

        const bucket = byWeek.get(weekKey);
        bucket.firstDate = toDateValue(bucket.firstDate).getTime() <= row.date.getTime() ? bucket.firstDate : row.date;
        bucket.lastDate = toDateValue(bucket.lastDate).getTime() >= row.date.getTime() ? bucket.lastDate : row.date;
        bucket.totalNetSales = roundCurrency(bucket.totalNetSales + roundCurrency(row.totalNetSales));
        bucket.directNetSales = roundCurrency(bucket.directNetSales + roundCurrency(row.directNetSales));
        bucket.consignmentNetSales = roundCurrency(bucket.consignmentNetSales + roundCurrency(row.consignmentNetSales));
        bucket.transactionCount += Number(row.transactionCount) || 0;
        bucket.activeDays += 1;
    });

    const orderedRows = [...byWeek.values()].sort((left, right) => left.weekStartDate.getTime() - right.weekStartDate.getTime());

    return orderedRows.map((row, index) => {
        const previousRow = orderedRows[index - 1] || null;

        return {
            ...row,
            weekLabel: `${formatDateLabel(row.firstDate)} - ${formatDateLabel(row.lastDate)}`,
            averageDailySales: row.activeDays > 0 ? roundCurrency(row.totalNetSales / row.activeDays) : 0,
            hasPriorWeek: Boolean(previousRow),
            changeFromPreviousWeek: previousRow
                ? roundCurrency(row.totalNetSales - previousRow.totalNetSales)
                : 0,
            changePercentFromPreviousWeek: previousRow
                ? calculateGrowthPercent(row.totalNetSales, previousRow.totalNetSales)
                : null
        };
    });
}

function buildSalesTrendChannelRows(currentRows = [], previousRows = []) {
    const currentByChannel = new Map(buildSalesChannelRows(currentRows).map(row => [row.channel, row]));
    const previousByChannel = new Map(buildSalesChannelRows(previousRows).map(row => [row.channel, row]));

    return ["Tasty Treats", "Church Store", "Consignment"].map(channel => {
        const currentRow = currentByChannel.get(channel) || {};
        const previousRow = previousByChannel.get(channel) || {};
        const currentNetSales = roundCurrency(currentRow.netSales);
        const previousNetSales = roundCurrency(previousRow.netSales);

        return {
            channel,
            currentNetSales,
            previousNetSales,
            changeAmount: roundCurrency(currentNetSales - previousNetSales),
            changePercent: calculateGrowthPercent(currentNetSales, previousNetSales),
            transactionCount: Number(currentRow.transactionCount) || 0,
            previousTransactionCount: Number(previousRow.transactionCount) || 0,
            averageSale: roundCurrency(currentRow.averageSale),
            collections: roundCurrency(currentRow.collections),
            previousCollections: roundCurrency(previousRow.collections)
        };
    });
}

function buildProductPerformanceSalesRows({
    salesInvoices = [],
    consignmentOrders = []
}) {
    const rows = [];

    (salesInvoices || [])
        .filter(row => normalizeStatus(row.saleStatus, "Active") !== "Voided")
        .filter(row => normalizeStatus(row.saleType, "Revenue") !== "Sample")
        .forEach(row => {
            const transactionDate = resolveTransactionDate(row, ["saleDate"]);
            const channel = normalizeText(row.store) || "Other";
            const reference = normalizeText(row.saleId || row.manualVoucherNumber || row.id);
            const lineItems = Array.isArray(row.lineItems) ? row.lineItems : [];

            lineItems.forEach(item => {
                const productId = normalizeText(item.productId);
                const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
                if (!productId || quantity <= 0) return;

                rows.push({
                    productId,
                    productName: normalizeText(item.productName) || "Untitled Product",
                    categoryId: normalizeText(item.categoryId),
                    categoryName: normalizeText(item.categoryName) || "-",
                    channel,
                    transactionDate,
                    reference,
                    quantitySold: quantity,
                    netSales: roundCurrency(item.taxableAmount),
                    grossSales: roundCurrency(item.lineSubtotal),
                    taxAmount: roundCurrency(item.taxAmount),
                    transactionCount: 1,
                    source: "Retail"
                });
            });
        });

    (consignmentOrders || [])
        .filter(row => normalizeStatus(row.status, "Active") !== "Cancelled")
        .forEach(row => {
            const transactionDate = resolveTransactionDate(row, ["checkoutDate"]);
            const reference = normalizeText(row.consignmentId || row.manualVoucherNumber || row.id);
            const items = Array.isArray(row.items) ? row.items : [];

            items.forEach(item => {
                const productId = normalizeText(item.productId);
                const quantitySold = Math.max(0, Math.floor(Number(item.quantitySold) || 0));
                if (!productId || quantitySold <= 0) return;

                const sellingPrice = roundCurrency(item.sellingPrice);
                rows.push({
                    productId,
                    productName: normalizeText(item.productName) || "Untitled Product",
                    categoryId: normalizeText(item.categoryId),
                    categoryName: normalizeText(item.categoryName) || "-",
                    channel: "Consignment",
                    transactionDate,
                    reference,
                    quantitySold,
                    netSales: roundCurrency(quantitySold * sellingPrice),
                    grossSales: roundCurrency(quantitySold * sellingPrice),
                    taxAmount: 0,
                    transactionCount: 1,
                    source: "Consignment"
                });
            });
        });

    return rows;
}

function buildProductPerformanceRows({
    products = [],
    categories = [],
    salesInvoices = [],
    consignmentOrders = []
}) {
    const categoryNameMap = buildCategoryNameMap(categories);
    const productRows = buildProductPerformanceSalesRows({ salesInvoices, consignmentOrders });
    const productMap = new Map(
        (products || [])
            .filter(product => normalizeText(product.id))
            .map(product => [normalizeText(product.id), product])
    );
    const buckets = new Map();

    productRows.forEach(row => {
        if (!buckets.has(row.productId)) {
            const product = productMap.get(row.productId) || {};
            const unitsOnHand = Math.max(0, Number(product.inventoryCount) || 0);
            const unitSell = roundCurrency(product.sellingPrice);

            buckets.set(row.productId, {
                productId: row.productId,
                productName: row.productName || normalizeText(product.itemName) || "Untitled Product",
                categoryName: row.categoryName && row.categoryName !== "-"
                    ? row.categoryName
                    : (resolveInventoryCategoryName(product, categoryNameMap) || "-"),
                unitsSold: 0,
                retailUnitsSold: 0,
                tastyTreatsUnitsSold: 0,
                churchStoreUnitsSold: 0,
                consignmentUnitsSold: 0,
                revenue: 0,
                retailRevenue: 0,
                consignmentRevenue: 0,
                grossRevenue: 0,
                transactionCount: 0,
                lastSoldOn: null,
                unitsOnHand,
                stockStatus: resolveInventoryStatus(unitsOnHand),
                unitSell,
                stockExposureValue: roundCurrency(unitsOnHand * unitSell)
            });
        }

        const bucket = buckets.get(row.productId);
        bucket.unitsSold += row.quantitySold;
        bucket.revenue = roundCurrency(bucket.revenue + row.netSales);
        bucket.grossRevenue = roundCurrency(bucket.grossRevenue + row.grossSales);
        bucket.transactionCount += row.transactionCount;
        bucket.lastSoldOn = !bucket.lastSoldOn || toDateValue(row.transactionDate).getTime() > toDateValue(bucket.lastSoldOn).getTime()
            ? row.transactionDate
            : bucket.lastSoldOn;

        if (row.channel === "Consignment") {
            bucket.consignmentUnitsSold += row.quantitySold;
            bucket.consignmentRevenue = roundCurrency(bucket.consignmentRevenue + row.netSales);
        } else {
            bucket.retailUnitsSold += row.quantitySold;
            bucket.retailRevenue = roundCurrency(bucket.retailRevenue + row.netSales);

            const normalizedChannel = normalizeText(row.channel).toLowerCase();
            if (normalizedChannel === "tasty treats") {
                bucket.tastyTreatsUnitsSold += row.quantitySold;
            } else if (normalizedChannel === "church store") {
                bucket.churchStoreUnitsSold += row.quantitySold;
            }
        }
    });

    return [...buckets.values()]
        .map(row => ({
            ...row,
            averageUnitRevenue: row.unitsSold > 0 ? roundCurrency(row.revenue / row.unitsSold) : 0
        }))
        .sort((left, right) => right.revenue - left.revenue || right.unitsSold - left.unitsSold || left.productName.localeCompare(right.productName));
}

function buildProductPerformanceReportData({
    products = [],
    categories = [],
    salesInvoices = [],
    consignmentOrders = [],
    rangeSpec,
    durationMs = 0,
    truncatedSources = {}
}) {
    const detailRows = buildProductPerformanceRows({
        products,
        categories,
        salesInvoices,
        consignmentOrders
    });
    const totalUnitsSold = detailRows.reduce((sum, row) => sum + (row.unitsSold || 0), 0);
    const totalRevenue = sumMetric(detailRows, "revenue");
    const topByRevenue = detailRows[0] || null;
    const topByUnits = detailRows
        .slice()
        .sort((left, right) => right.unitsSold - left.unitsSold || right.revenue - left.revenue)[0] || null;
    const stockExposureRows = detailRows
        .filter(row => row.unitsOnHand > 0)
        .slice()
        .sort((left, right) => {
            if (left.unitsSold !== right.unitsSold) return left.unitsSold - right.unitsSold;
            if (left.unitsOnHand !== right.unitsOnHand) return right.unitsOnHand - left.unitsOnHand;
            return right.stockExposureValue - left.stockExposureValue;
        });

    return {
        rangeKey: rangeSpec.rangeKey,
        rangeLabel: rangeSpec.rangeLabel,
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate,
        generatedAt: Date.now(),
        durationMs,
        summary: {
            productCount: detailRows.length,
            totalUnitsSold,
            totalRevenue,
            topRevenueProductName: topByRevenue?.productName || "-",
            topRevenueProductRevenue: topByRevenue?.revenue || 0,
            topUnitProductName: topByUnits?.productName || "-",
            topUnitProductUnits: topByUnits?.unitsSold || 0,
            stockExposureUnits: detailRows.reduce((sum, row) => sum + (row.unitsOnHand || 0), 0)
        },
        topRows: detailRows.slice(0, 20),
        stockExposureRows: stockExposureRows.slice(0, 20),
        detailRows: detailRows.slice(0, 60),
        metadata: {
            truncatedSources,
            sourceCounts: {
                products: products.length,
                categories: categories.length,
                salesInvoices: salesInvoices.length,
                consignmentOrders: consignmentOrders.length
            }
        }
    };
}

function getWindowStartFromDays(days = 30, asOfDate = new Date()) {
    const end = toDateValue(asOfDate);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (Math.max(1, Number(days) || 1) - 1));
    start.setHours(0, 0, 0, 0);
    return start;
}

function buildSalesRowsByProductId(rows = []) {
    const buckets = new Map();

    (rows || []).forEach(row => {
        const productId = normalizeText(row.productId);
        if (!productId) return;

        if (!buckets.has(productId)) {
            buckets.set(productId, []);
        }

        buckets.get(productId).push(row);
    });

    return buckets;
}

function sumUnitsInWindow(rows = [], startDate = null, endDate = null) {
    if (!startDate || !endDate) return 0;

    return (rows || []).reduce((sum, row) => {
        const transactionDate = toDateValue(row.transactionDate);
        const time = transactionDate.getTime();
        if (time < startDate.getTime() || time > endDate.getTime()) {
            return sum;
        }

        return sum + Math.max(0, Number(row.quantitySold) || 0);
    }, 0);
}

function roundQuantity(value) {
    return Math.max(0, Math.ceil(Number(value) || 0));
}

function roundUpToPack(value, packSize = 1) {
    const safeValue = Math.max(0, Math.ceil(Number(value) || 0));
    const safePackSize = Math.max(1, Math.ceil(Number(packSize) || 1));
    return Math.ceil(safeValue / safePackSize) * safePackSize;
}

function buildAppliedReorderExplanation({
    policy = null,
    product = {},
    scopeSummary = "",
    avgDailyDemand = 0,
    onHand = 0,
    reorderPoint = 0,
    daysCover = null,
    recommendedQty = 0,
    shortWindowUnits = 0,
    longWindowUnits = 0,
    state = "",
    reasonCode = ""
} = {}) {
    if (!policy) {
        return `No active reorder policy matched ${product.itemName || "this product"}, so Moneta could not calculate a recommendation.`;
    }

    if (reasonCode === "zero-demand-suppress") {
        return `${scopeSummary} applies. ${product.itemName || "This product"} has no recent demand in the policy windows, so Moneta suppresses the reorder recommendation.`;
    }

    if (reasonCode === "zero-demand-review") {
        return `${scopeSummary} applies. ${product.itemName || "This product"} has no recent demand in the policy windows, so Moneta flags it for manual review instead of auto-reordering.`;
    }

    if (reasonCode === "low-history") {
        return `${scopeSummary} applies. ${product.itemName || "This product"} sold only ${longWindowUnits} units in the longer window, which is at or below the low-history threshold of ${policy.lowHistoryUnitThreshold}. Moneta shows the suggestion, but asks for manual review first.`;
    }

    if (reasonCode === "watch") {
        return `${scopeSummary} applies. On hand is ${onHand} units, which is close to the reorder point of ${reorderPoint}. Estimated cover is ${daysCover === null ? "-" : `${roundCurrency(daysCover)} days`}, so Moneta marks this item to watch.`;
    }

    return `${scopeSummary} applies. Estimated daily demand is ${roundCurrency(avgDailyDemand)} units using ${policy.shortWindowWeight}% of the last ${policy.shortWindowDays} days (${shortWindowUnits} units) and ${policy.longWindowWeight}% of the last ${policy.longWindowDays} days (${longWindowUnits} units). On hand ${onHand} is below the reorder point of ${reorderPoint}, so Moneta recommends ${recommendedQty} units and marks the item ${state.toLowerCase()}.`;
}

function buildReorderRecommendationRows({
    products = [],
    categories = [],
    activePolicies = [],
    salesInvoices = [],
    consignmentOrders = [],
    asOfDate = new Date()
}) {
    const categoryNameMap = buildCategoryNameMap(categories);
    const salesRows = buildProductPerformanceSalesRows({ salesInvoices, consignmentOrders });
    const salesRowsByProductId = buildSalesRowsByProductId(salesRows);
    const activeProductRows = (products || []).filter(product => product?.isActive !== false);
    const rows = [];

    activeProductRows.forEach(product => {
        const policy = resolvePolicyForProduct(product, activePolicies);
        if (!policy) return;

        const productSalesRows = salesRowsByProductId.get(product.id) || [];
        const shortWindowStart = getWindowStartFromDays(policy.shortWindowDays, asOfDate);
        const longWindowStart = getWindowStartFromDays(policy.longWindowDays, asOfDate);
        const asOfEnd = new Date(asOfDate);
        asOfEnd.setHours(23, 59, 59, 999);

        const shortWindowUnits = sumUnitsInWindow(productSalesRows, shortWindowStart, asOfEnd);
        const longWindowUnits = sumUnitsInWindow(productSalesRows, longWindowStart, asOfEnd);
        const weightedShortDemand = (shortWindowUnits * (Number(policy.shortWindowWeight) || 0)) / 100 / Math.max(1, Number(policy.shortWindowDays) || 1);
        const weightedLongDemand = (longWindowUnits * (Number(policy.longWindowWeight) || 0)) / 100 / Math.max(1, Number(policy.longWindowDays) || 1);
        const avgDailyDemand = roundCurrency(weightedShortDemand + weightedLongDemand);
        const onHand = Math.max(0, Math.floor(Number(product.inventoryCount) || 0));
        const reorderPoint = roundQuantity(avgDailyDemand * (Number(policy.leadTimeDays) + Number(policy.safetyDays)));
        const targetStock = roundQuantity(avgDailyDemand * Number(policy.targetCoverDays));
        let recommendedQty = Math.max(0, targetStock - onHand);
        const scopeSummary = buildReorderPolicyScopeSummary(policy, {
            categoryNameById: categoryNameMap,
            productNameById: new Map([[product.id, product.itemName || ""]])
        });
        const staticRuleExplanation = buildReorderPolicyExplanation(policy, {
            categoryNameById: categoryNameMap,
            productNameById: new Map([[product.id, product.itemName || ""]])
        });

        let state = "Healthy";
        let reasonCode = "healthy";

        if (avgDailyDemand <= 0) {
            state = policy.zeroDemandBehavior === "suppress" ? "Suppressed" : "Manual Review";
            reasonCode = policy.zeroDemandBehavior === "suppress" ? "zero-demand-suppress" : "zero-demand-review";
            recommendedQty = 0;
        } else {
            if (recommendedQty > 0) {
                recommendedQty = Math.max(recommendedQty, Number(policy.minimumOrderQty) || 0);
                recommendedQty = roundUpToPack(recommendedQty, policy.packSize);
            }

            const daysCover = onHand > 0 ? roundCurrency(onHand / avgDailyDemand) : 0;

            if (onHand <= 0 || daysCover <= 3) {
                state = "Critical";
                reasonCode = "critical";
            } else if (onHand <= reorderPoint) {
                state = "Reorder Now";
                reasonCode = "reorder-now";
            } else if (onHand <= Math.ceil(reorderPoint * 1.2)) {
                state = "Watch";
                reasonCode = "watch";
            }

            if (state !== "Healthy" && (Number(policy.lowHistoryUnitThreshold) || 0) > 0 && longWindowUnits <= Number(policy.lowHistoryUnitThreshold)) {
                state = "Manual Review";
                reasonCode = "low-history";
            }
        }

        const daysCover = avgDailyDemand > 0 ? roundCurrency(onHand / avgDailyDemand) : null;
        const appliedExplanation = buildAppliedReorderExplanation({
            policy,
            product,
            scopeSummary,
            avgDailyDemand,
            onHand,
            reorderPoint,
            daysCover,
            recommendedQty,
            shortWindowUnits,
            longWindowUnits,
            state,
            reasonCode
        });

        rows.push({
            productId: product.id,
            productName: normalizeText(product.itemName) || "Untitled Product",
            categoryName: categoryNameMap.get(product.categoryId) || "-",
            onHand,
            shortWindowUnits,
            longWindowUnits,
            avgDailyDemand,
            reorderPoint,
            targetStock,
            recommendedQty,
            daysCover,
            state,
            reasonCode,
            policyName: policy.policyName || "Unnamed Policy",
            policyScopeSummary: scopeSummary,
            policyExplanation: staticRuleExplanation,
            appliedExplanation,
            leadTimeDays: Number(policy.leadTimeDays) || 0,
            safetyDays: Number(policy.safetyDays) || 0,
            targetCoverDays: Number(policy.targetCoverDays) || 0,
            minimumOrderQty: Number(policy.minimumOrderQty) || 0,
            packSize: Number(policy.packSize) || 1,
            unitCost: roundCurrency(product.unitPrice),
            unitSell: roundCurrency(product.sellingPrice),
            stockValueAtCost: roundCurrency(onHand * roundCurrency(product.unitPrice)),
            stockValueAtRetail: roundCurrency(onHand * roundCurrency(product.sellingPrice))
        });
    });

    const severityRank = {
        "Critical": 1,
        "Reorder Now": 2,
        "Manual Review": 3,
        "Watch": 4,
        "Suppressed": 5,
        "Healthy": 6
    };

    return rows
        .filter(row => row.state !== "Healthy")
        .sort((left, right) => {
            const severityDiff = (severityRank[left.state] || 99) - (severityRank[right.state] || 99);
            if (severityDiff !== 0) return severityDiff;
            if ((left.recommendedQty || 0) !== (right.recommendedQty || 0)) {
                return (right.recommendedQty || 0) - (left.recommendedQty || 0);
            }

            return (left.productName || "").localeCompare(right.productName || "");
        });
}

function buildReorderRecommendationsReportData({
    products = [],
    categories = [],
    reorderPolicies = [],
    salesInvoices = [],
    consignmentOrders = [],
    asOfDate = new Date(),
    durationMs = 0,
    truncatedSources = {}
}) {
    const activePolicies = (reorderPolicies || []).filter(policy => policy?.isActive);
    const systemDefaultPolicy = resolveSystemDefaultPolicy(activePolicies, { activeOnly: true });
    const detailRows = buildReorderRecommendationRows({
        products,
        categories,
        activePolicies,
        salesInvoices,
        consignmentOrders,
        asOfDate
    });
    const criticalRows = detailRows.filter(row => row.state === "Critical");
    const reorderRows = detailRows.filter(row => row.state === "Reorder Now");
    const manualReviewRows = detailRows.filter(row => row.state === "Manual Review");
    const watchRows = detailRows.filter(row => row.state === "Watch");
    const suppressedRows = detailRows.filter(row => row.state === "Suppressed");

    return {
        asOfDate,
        generatedAt: Date.now(),
        durationMs,
        summary: {
            activePolicyCount: activePolicies.length,
            productsReviewed: (products || []).filter(product => product?.isActive !== false).length,
            actionableCount: criticalRows.length + reorderRows.length,
            criticalCount: criticalRows.length,
            reorderNowCount: reorderRows.length,
            manualReviewCount: manualReviewRows.length,
            watchCount: watchRows.length,
            suppressedCount: suppressedRows.length,
            totalRecommendedQty: detailRows.reduce((sum, row) => sum + (row.recommendedQty || 0), 0)
        },
        policyRows: activePolicies
            .map(policy => ({
                policyName: policy.policyName || "Unnamed Policy",
                scopeSummary: buildReorderPolicyScopeSummary(policy, {
                    categoryNameById: buildCategoryNameMap(categories),
                    productNameById: new Map((products || []).map(row => [row.id, row.itemName || ""]))
                }),
                ruleExplanation: buildReorderPolicyExplanation(policy, {
                    categoryNameById: buildCategoryNameMap(categories),
                    productNameById: new Map((products || []).map(row => [row.id, row.itemName || ""]))
                }),
                isActive: Boolean(policy.isActive),
                isSystemDefault: Boolean(policy.isSystemDefault) || policy.id === systemDefaultPolicy?.id
            }))
            .sort((left, right) => {
                if (Boolean(left.isSystemDefault) !== Boolean(right.isSystemDefault)) {
                    return left.isSystemDefault ? -1 : 1;
                }

                return left.scopeSummary.localeCompare(right.scopeSummary) || left.policyName.localeCompare(right.policyName);
            }),
        detailRows: detailRows.slice(0, 120),
        metadata: {
            truncatedSources,
            sourceCounts: {
                products: products.length,
                categories: categories.length,
                reorderPolicies: reorderPolicies.length,
                salesInvoices: salesInvoices.length,
                consignmentOrders: consignmentOrders.length
            },
            notes: [
                `Reorder Recommendations is an as-of report that uses the active reorder policy scope hierarchy: product, category, then global${systemDefaultPolicy ? ` (${systemDefaultPolicy.policyName || "Moneta Default"})` : ""}.`,
                "Demand is calculated only from the bounded lookback windows required by the active policies.",
                "Moneta reuses reorder policy master data already loaded in app state when available, then refreshes from Firestore only when needed."
            ]
        }
    };
}

function normalizeLeadConversionOutcomeStatus(lead = {}) {
    return normalizeText(lead.conversionOutcomeStatus || lead.conversionOutcome || lead.convertedSaleStatus).toLowerCase();
}

function hasLeadReadyQuote(lead = {}) {
    if (normalizeText(lead.acceptedQuoteId)) return true;

    const latestQuoteStatus = normalizeText(lead.latestQuoteStatus);
    return ["Draft", "Sent", "Accepted"].includes(latestQuoteStatus);
}

function resolveLeadConversionStage(lead = {}) {
    const leadStatus = normalizeText(lead.leadStatus || "New");
    const conversionOutcomeStatus = normalizeLeadConversionOutcomeStatus(lead);

    if (leadStatus === "Converted" && conversionOutcomeStatus === "voided") {
        return "Converted (Sale Voided)";
    }

    if (leadStatus === "Converted") {
        return "Converted";
    }

    if (leadStatus === "Lost") {
        return "Lost";
    }

    if (hasLeadReadyQuote(lead)) {
        return "Ready To Convert";
    }

    if (leadStatus === "Qualified") {
        return "Qualified";
    }

    return "Open";
}

function buildLeadRequestedMetrics(lead = {}) {
    const requestedProducts = Array.isArray(lead.requestedProducts) ? lead.requestedProducts : [];
    const requestedItemCount = requestedProducts.reduce((sum, item) => {
        return sum + Math.max(0, Number(item.requestedQty) || 0);
    }, 0);
    const fallbackRequestedValue = requestedProducts.reduce((sum, item) => {
        return sum + (Math.max(0, Number(item.requestedQty) || 0) * roundCurrency(item.sellingPrice));
    }, 0);

    return {
        requestedItemCount,
        requestedValue: roundCurrency((Number(lead.requestedValue) || fallbackRequestedValue))
    };
}

function buildLeadConversionSalesById(salesInvoices = []) {
    return new Map(
        (salesInvoices || [])
            .filter(row => normalizeText(row.id))
            .map(row => [normalizeText(row.id), row])
    );
}

function buildLeadConversionDetailRows({
    leads = [],
    salesInvoices = []
}) {
    const salesById = buildLeadConversionSalesById(salesInvoices);

    return (leads || [])
        .map(lead => {
            const stage = resolveLeadConversionStage(lead);
            const requestedMetrics = buildLeadRequestedMetrics(lead);
            const linkedSaleId = normalizeText(lead.convertedToSaleId || lead.linkedSaleId);
            const linkedSale = linkedSaleId ? salesById.get(linkedSaleId) || null : null;
            const saleValue = roundCurrency(linkedSale?.financials?.grandTotal);
            const latestQuoteStatus = normalizeText(lead.latestQuoteStatus);
            const latestQuoteLabel = latestQuoteStatus
                ? `${latestQuoteStatus}${normalizeText(lead.latestQuoteNumber) ? ` · ${lead.latestQuoteNumber}` : ""}`
                : (Number(lead.quoteCount) || 0) > 0
                    ? `${Number(lead.quoteCount)} quote${Number(lead.quoteCount) === 1 ? "" : "s"}`
                    : "-";

            return {
                id: lead.id,
                businessLeadId: normalizeText(lead.businessLeadId || lead.id),
                customerName: normalizeText(lead.customerName) || "Untitled Lead",
                leadSource: normalizeText(lead.leadSource) || "Other",
                assignedTo: normalizeText(lead.assignedTo) || "-",
                enquiryDate: lead.enquiryDate || null,
                expectedDeliveryDate: lead.expectedDeliveryDate || null,
                stage,
                leadStatus: normalizeText(lead.leadStatus || "New"),
                latestQuoteStatus,
                latestQuoteLabel,
                quoteCount: Number(lead.quoteCount) || 0,
                acceptedQuoteValue: roundCurrency(lead.acceptedQuoteTotal),
                requestedItemCount: requestedMetrics.requestedItemCount,
                requestedValue: requestedMetrics.requestedValue,
                convertedToSaleId: linkedSaleId,
                convertedToSaleNumber: normalizeText(lead.convertedToSaleNumber || linkedSale?.manualVoucherNumber || linkedSale?.saleId),
                convertedStore: normalizeText(lead.convertedStore || linkedSale?.store),
                convertedSaleStatus: normalizeText(linkedSale?.saleStatus || lead.convertedSaleStatus || lead.conversionOutcomeStatus || ""),
                saleValue,
                convertedOn: lead.convertedOn || linkedSale?.saleDate || null,
                conversionOutcomeStatus: normalizeLeadConversionOutcomeStatus(lead)
            };
        })
        .sort((left, right) => toDateValue(right.enquiryDate).getTime() - toDateValue(left.enquiryDate).getTime());
}

function buildLeadConversionStageRows(detailRows = []) {
    const stageOrder = ["Open", "Qualified", "Ready To Convert", "Converted", "Converted (Sale Voided)", "Lost"];
    const byStage = new Map(
        stageOrder.map(stage => [stage, {
            stage,
            count: 0,
            requestedValue: 0,
            acceptedQuoteValue: 0,
            averageRequestedValue: 0,
            sharePercent: 0
        }])
    );
    const totalCount = detailRows.length;

    detailRows.forEach(row => {
        const key = stageOrder.includes(row.stage) ? row.stage : "Open";
        const bucket = byStage.get(key);

        bucket.count += 1;
        bucket.requestedValue = roundCurrency(bucket.requestedValue + roundCurrency(row.requestedValue));
        bucket.acceptedQuoteValue = roundCurrency(bucket.acceptedQuoteValue + roundCurrency(row.acceptedQuoteValue));
    });

    return stageOrder.map(stage => {
        const bucket = byStage.get(stage);
        return {
            ...bucket,
            averageRequestedValue: bucket.count > 0 ? roundCurrency(bucket.requestedValue / bucket.count) : 0,
            sharePercent: totalCount > 0 ? roundCurrency((bucket.count / totalCount) * 100) : 0
        };
    });
}

function buildLeadConversionSourceRows(detailRows = []) {
    const bySource = new Map();

    detailRows.forEach(row => {
        const key = normalizeText(row.leadSource) || "Other";

        if (!bySource.has(key)) {
            bySource.set(key, {
                leadSource: key,
                leadCount: 0,
                readyCount: 0,
                convertedActiveCount: 0,
                convertedVoidedCount: 0,
                lostCount: 0,
                requestedValue: 0,
                acceptedQuoteValue: 0,
                conversionRate: 0
            });
        }

        const bucket = bySource.get(key);
        bucket.leadCount += 1;
        bucket.requestedValue = roundCurrency(bucket.requestedValue + roundCurrency(row.requestedValue));
        bucket.acceptedQuoteValue = roundCurrency(bucket.acceptedQuoteValue + roundCurrency(row.acceptedQuoteValue));

        if (row.stage === "Ready To Convert") {
            bucket.readyCount += 1;
        }
        if (row.stage === "Converted") {
            bucket.convertedActiveCount += 1;
        }
        if (row.stage === "Converted (Sale Voided)") {
            bucket.convertedVoidedCount += 1;
        }
        if (row.stage === "Lost") {
            bucket.lostCount += 1;
        }
    });

    return [...bySource.values()]
        .map(row => ({
            ...row,
            conversionRate: row.leadCount > 0 ? roundCurrency((row.convertedActiveCount / row.leadCount) * 100) : 0
        }))
        .sort((left, right) => right.convertedActiveCount - left.convertedActiveCount || right.leadCount - left.leadCount || left.leadSource.localeCompare(right.leadSource));
}

function buildLeadConversionStoreRows(salesInvoices = []) {
    const byStore = new Map(
        RETAIL_STORES.map(store => [store, {
            store,
            saleCount: 0,
            activeSales: 0,
            voidedSales: 0,
            salesValue: 0,
            averageSale: 0
        }])
    );

    (salesInvoices || [])
        .filter(row => normalizeText(row.sourceLeadId))
        .forEach(row => {
            const store = RETAIL_STORES.includes(normalizeText(row.store)) ? normalizeText(row.store) : "Other";

            if (!byStore.has(store)) {
                byStore.set(store, {
                    store,
                    saleCount: 0,
                    activeSales: 0,
                    voidedSales: 0,
                    salesValue: 0,
                    averageSale: 0
                });
            }

            const bucket = byStore.get(store);
            const saleStatus = normalizeStatus(row.saleStatus, "Active");
            const saleValue = roundCurrency(row.financials?.grandTotal);

            bucket.saleCount += 1;
            bucket.salesValue = roundCurrency(bucket.salesValue + saleValue);

            if (saleStatus === "Voided") {
                bucket.voidedSales += 1;
            } else {
                bucket.activeSales += 1;
            }
        });

    return [...byStore.values()]
        .map(row => ({
            ...row,
            averageSale: row.saleCount > 0 ? roundCurrency(row.salesValue / row.saleCount) : 0
        }))
        .filter(row => row.saleCount > 0 || row.store !== "Other")
        .sort((left, right) => right.salesValue - left.salesValue || right.saleCount - left.saleCount);
}

function buildLeadConversionReportData({
    leads = [],
    salesInvoices = [],
    rangeSpec,
    durationMs = 0,
    truncatedSources = {}
}) {
    const detailRows = buildLeadConversionDetailRows({
        leads,
        salesInvoices
    });
    const stageRows = buildLeadConversionStageRows(detailRows);
    const sourceRows = buildLeadConversionSourceRows(detailRows);
    const storeRows = buildLeadConversionStoreRows(salesInvoices);
    const openCount = stageRows.find(row => row.stage === "Open")?.count || 0;
    const qualifiedCount = stageRows.find(row => row.stage === "Qualified")?.count || 0;
    const readyToConvertCount = stageRows.find(row => row.stage === "Ready To Convert")?.count || 0;
    const convertedActiveCount = stageRows.find(row => row.stage === "Converted")?.count || 0;
    const convertedVoidedCount = stageRows.find(row => row.stage === "Converted (Sale Voided)")?.count || 0;
    const lostCount = stageRows.find(row => row.stage === "Lost")?.count || 0;
    const leadCount = detailRows.length;
    const convertedSalesCount = storeRows.reduce((sum, row) => sum + (row.saleCount || 0), 0);
    const convertedSalesValue = sumMetric(storeRows, "salesValue");
    const readyPipelineValue = detailRows
        .filter(row => row.stage === "Ready To Convert")
        .reduce((sum, row) => sum + roundCurrency(row.requestedValue), 0);
    const acceptedQuotePipelineValue = detailRows
        .filter(row => ["Ready To Convert", "Qualified", "Open"].includes(row.stage))
        .reduce((sum, row) => sum + roundCurrency(row.acceptedQuoteValue), 0);
    const topLeadSource = sourceRows[0] || null;

    return {
        rangeKey: rangeSpec.rangeKey,
        rangeLabel: rangeSpec.rangeLabel,
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate,
        generatedAt: Date.now(),
        durationMs,
        summary: {
            leadCount,
            openCount,
            qualifiedCount,
            readyToConvertCount,
            convertedActiveCount,
            convertedVoidedCount,
            lostCount,
            convertedSalesCount,
            convertedSalesValue,
            readyPipelineValue: roundCurrency(readyPipelineValue),
            acceptedQuotePipelineValue: roundCurrency(acceptedQuotePipelineValue),
            activeConversionRate: leadCount > 0 ? roundCurrency((convertedActiveCount / leadCount) * 100) : 0,
            resolvedOutcomeRate: leadCount > 0 ? roundCurrency(((convertedActiveCount + convertedVoidedCount + lostCount) / leadCount) * 100) : 0,
            topLeadSourceName: topLeadSource?.leadSource || "-",
            topLeadSourceConversions: topLeadSource?.convertedActiveCount || 0
        },
        stageRows,
        sourceRows,
        storeRows,
        detailRows: detailRows.slice(0, 60),
        metadata: {
            truncatedSources,
            sourceCounts: {
                leads: leads.length,
                salesInvoices: salesInvoices.length
            },
            notes: [
                "Enquiry funnel counts are based on leads with enquiry dates inside the selected report window.",
                "Ready To Convert means the enquiry is still active and has a live quote state of Draft, Sent, or Accepted, or an accepted quote on file.",
                "Closed retail value uses retail sales linked by sourceLeadId and dated inside the same report window."
            ]
        }
    };
}

function buildSalesSummaryReportData({
    salesInvoices = [],
    consignmentOrders = [],
    rangeSpec,
    durationMs = 0,
    truncatedSources = {}
}) {
    const retailRows = buildSalesInvoiceReportRows(salesInvoices);
    const consignmentRows = buildConsignmentSalesReportRows(consignmentOrders);
    const detailRows = [...retailRows, ...consignmentRows]
        .sort((left, right) => toDateValue(right.transactionDate).getTime() - toDateValue(left.transactionDate).getTime());
    const channelRows = buildSalesChannelRows(detailRows)
        .filter(row => ["Tasty Treats", "Church Store", "Consignment"].includes(row.channel));
    const directRows = channelRows.filter(row => row.channel !== "Consignment");

    const directNetSales = sumMetric(directRows, "netSales");
    const directCollections = sumMetric(directRows, "collections");
    const directDonations = sumMetric(directRows, "donations");
    const directExpenses = sumMetric(directRows, "expenses");
    const directBalanceDue = sumMetric(directRows, "balanceDue");

    const consignmentNetSales = sumMetric(consignmentRows, "netSales");
    const consignmentCollections = sumMetric(consignmentRows, "collections");
    const consignmentDonations = sumMetric(consignmentRows, "donations");
    const consignmentExpenses = sumMetric(consignmentRows, "expenses");
    const consignmentBalanceDue = sumMetric(consignmentRows, "balanceDue");

    const summary = {
        grossSales: sumMetric(detailRows, "grossSales"),
        discounts: sumMetric(detailRows, "discounts"),
        netSales: sumMetric(detailRows, "netSales"),
        tax: sumMetric(detailRows, "tax"),
        grossBilled: sumMetric(detailRows, "grossBilled"),
        collections: sumMetric(detailRows, "collections"),
        donations: sumMetric(detailRows, "donations"),
        expenses: sumMetric(detailRows, "expenses"),
        balanceDue: sumMetric(detailRows, "balanceDue"),
        transactionCount: detailRows.length,
        averageSale: detailRows.length > 0 ? roundCurrency(sumMetric(detailRows, "netSales") / detailRows.length) : 0,
        directNetSales,
        consignmentNetSales,
        directCollections,
        consignmentCollections
    };

    return {
        rangeKey: rangeSpec.rangeKey,
        rangeLabel: rangeSpec.rangeLabel,
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate,
        generatedAt: Date.now(),
        durationMs,
        summary,
        statementRows: [
            { section: "Revenue", label: "Tasty Treats Gross Sales", amount: channelRows.find(row => row.channel === "Tasty Treats")?.grossSales || 0 },
            { section: "Revenue", label: "Less Tasty Treats Discounts", amount: roundCurrency((channelRows.find(row => row.channel === "Tasty Treats")?.discounts || 0) * -1) },
            { section: "Revenue", label: "Tasty Treats Net Sales", amount: channelRows.find(row => row.channel === "Tasty Treats")?.netSales || 0 },
            { section: "Revenue", label: "Church Store Gross Sales", amount: channelRows.find(row => row.channel === "Church Store")?.grossSales || 0 },
            { section: "Revenue", label: "Less Church Store Discounts", amount: roundCurrency((channelRows.find(row => row.channel === "Church Store")?.discounts || 0) * -1) },
            { section: "Revenue", label: "Church Store Net Sales", amount: channelRows.find(row => row.channel === "Church Store")?.netSales || 0 },
            { section: "Revenue", label: "Total Direct Sales", amount: directNetSales, tone: "total" },
            { section: "Revenue", label: "Consignment Sales", amount: consignmentNetSales },
            { section: "Revenue", label: "Total Sales Revenue", amount: summary.netSales, tone: "total" },
            { section: "Revenue", label: "Output Tax", amount: summary.tax },
            { section: "Settlement", label: "Direct Collections", amount: directCollections },
            { section: "Settlement", label: "Consignment Collections", amount: consignmentCollections },
            { section: "Settlement", label: "Total Collections", amount: summary.collections, tone: "total" },
            { section: "Settlement", label: "Direct Donations", amount: directDonations },
            { section: "Settlement", label: "Consignment Donations", amount: consignmentDonations },
            { section: "Settlement", label: "Total Donations", amount: summary.donations, tone: "total" },
            { section: "Settlement", label: "Direct Expenses", amount: roundCurrency(directExpenses * -1) },
            { section: "Settlement", label: "Consignment Expenses", amount: roundCurrency(consignmentExpenses * -1) },
            { section: "Settlement", label: "Total Expenses", amount: roundCurrency(summary.expenses * -1), tone: "total" },
            { section: "Settlement", label: "Direct Outstanding Balance", amount: roundCurrency(directBalanceDue * -1) },
            { section: "Settlement", label: "Consignment Outstanding Balance", amount: roundCurrency(consignmentBalanceDue * -1) },
            { section: "Settlement", label: "Total Outstanding Balance", amount: roundCurrency(summary.balanceDue * -1), tone: "total" }
        ],
        channelRows,
        detailRows: detailRows.slice(0, 60),
        metadata: {
            truncatedSources,
            sourceCounts: {
                salesInvoices: salesInvoices.length,
                consignmentOrders: consignmentOrders.length
            }
        }
    };
}

function buildSalesTrendReportData({
    salesInvoices = [],
    consignmentOrders = [],
    comparisonSalesInvoices = [],
    comparisonConsignmentOrders = [],
    rangeSpec,
    compareRangeSpec = null,
    durationMs = 0,
    truncatedSources = {}
}) {
    const currentRows = [
        ...buildSalesInvoiceReportRows(salesInvoices),
        ...buildConsignmentSalesReportRows(consignmentOrders)
    ];
    const comparisonRows = [
        ...buildSalesInvoiceReportRows(comparisonSalesInvoices),
        ...buildConsignmentSalesReportRows(comparisonConsignmentOrders)
    ];
    const dailyRows = buildSalesTrendDailyRows(currentRows);
    const weeklyRows = buildSalesTrendWeeklyRows(dailyRows);
    const channelRows = buildSalesTrendChannelRows(currentRows, comparisonRows);
    const totalNetSales = sumMetric(currentRows, "netSales");
    const previousNetSales = sumMetric(comparisonRows, "netSales");
    const topDay = [...dailyRows].sort((left, right) => right.totalNetSales - left.totalNetSales)[0] || null;
    const slowestDay = [...dailyRows].sort((left, right) => left.totalNetSales - right.totalNetSales)[0] || null;
    const topWeek = [...weeklyRows].sort((left, right) => right.totalNetSales - left.totalNetSales)[0] || null;
    const strongestChannel = [...channelRows].sort((left, right) => right.currentNetSales - left.currentNetSales)[0] || null;
    const growthAmount = roundCurrency(totalNetSales - previousNetSales);
    const periodGrowthPercent = calculateGrowthPercent(totalNetSales, previousNetSales);

    return {
        rangeKey: rangeSpec.rangeKey,
        rangeLabel: rangeSpec.rangeLabel,
        compareRangeLabel: compareRangeSpec?.rangeLabel || "-",
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate,
        compareStartDate: compareRangeSpec?.startDate || null,
        compareEndDate: compareRangeSpec?.endDate || null,
        generatedAt: Date.now(),
        durationMs,
        summary: {
            totalNetSales,
            previousNetSales,
            growthAmount,
            periodGrowthPercent,
            transactionCount: currentRows.length,
            previousTransactionCount: comparisonRows.length,
            activeDays: dailyRows.length,
            averageDailySales: dailyRows.length > 0 ? roundCurrency(totalNetSales / dailyRows.length) : 0,
            averageTransactionsPerDay: dailyRows.length > 0 ? roundCurrency(currentRows.length / dailyRows.length) : 0,
            topDayLabel: topDay?.label || "-",
            topDayNetSales: topDay?.totalNetSales || 0,
            slowestDayLabel: slowestDay?.label || "-",
            slowestDayNetSales: slowestDay?.totalNetSales || 0,
            topWeekLabel: topWeek?.weekLabel || "-",
            topWeekNetSales: topWeek?.totalNetSales || 0,
            strongestChannelName: strongestChannel?.channel || "-",
            strongestChannelNetSales: strongestChannel?.currentNetSales || 0,
            strongestChannelGrowthPercent: strongestChannel?.changePercent ?? null
        },
        dailyRows,
        weeklyRows,
        channelRows,
        metadata: {
            truncatedSources,
            sourceCounts: {
                currentSalesInvoices: salesInvoices.length,
                currentConsignmentOrders: consignmentOrders.length,
                comparisonSalesInvoices: comparisonSalesInvoices.length,
                comparisonConsignmentOrders: comparisonConsignmentOrders.length
            },
            notes: [
                "Sales Trend compares the selected window against the immediately preceding window of the same length.",
                "Firestore reads stay bounded to the selected range plus one comparison window, then cache for 10 minutes."
            ]
        }
    };
}

function buildStorePerformanceReportData({
    salesInvoices = [],
    rangeSpec,
    durationMs = 0,
    truncatedSources = {}
}) {
    const invoiceRows = buildSalesInvoiceReportRows(salesInvoices);
    const storeRows = buildStoreSalesRows(invoiceRows)
        .filter(row => RETAIL_STORES.includes(row.store))
        .sort((left, right) => right.netSales - left.netSales);

    const totalNetSales = sumMetric(storeRows, "netSales");
    const totalCollections = sumMetric(storeRows, "collections");
    const totalDonations = sumMetric(storeRows, "donations");
    const totalExpenses = sumMetric(storeRows, "expenses");
    const totalBalanceDue = sumMetric(storeRows, "balanceDue");
    const totalNetContribution = sumMetric(storeRows, "netContribution");
    const topStore = storeRows[0] || null;

    return {
        rangeKey: rangeSpec.rangeKey,
        rangeLabel: rangeSpec.rangeLabel,
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate,
        generatedAt: Date.now(),
        durationMs,
        summary: {
            totalNetSales,
            totalCollections,
            totalDonations,
            totalExpenses,
            totalBalanceDue,
            totalNetContribution,
            totalTransactions: storeRows.reduce((sum, row) => sum + row.transactionCount, 0),
            topStoreName: topStore?.store || "-",
            topStoreNetSales: topStore?.netSales || 0
        },
        storeRows,
        metadata: {
            truncatedSources,
            sourceCounts: {
                salesInvoices: salesInvoices.length
            }
        }
    };
}

function buildConsignmentTeamRows(rows = []) {
    const byTeam = new Map();

    rows.forEach(row => {
        const teamName = normalizeText(row.teamName) || "Team";
        const memberName = normalizeText(row.teamMemberName) || "-";
        const key = `${teamName}::${memberName}`;

        if (!byTeam.has(key)) {
            byTeam.set(key, {
                teamName,
                memberName,
                orderCount: 0,
                quantityCheckedOut: 0,
                quantitySold: 0,
                quantityReturned: 0,
                quantityDamaged: 0,
                quantityGifted: 0,
                quantityOnHand: 0,
                soldValue: 0,
                collections: 0,
                donations: 0,
                expenses: 0,
                balanceDue: 0,
                sellThroughRate: 0,
                netContribution: 0
            });
        }

        const bucket = byTeam.get(key);
        bucket.orderCount += 1;
        bucket.quantityCheckedOut += row.quantityCheckedOut;
        bucket.quantitySold += row.quantitySold;
        bucket.quantityReturned += row.quantityReturned;
        bucket.quantityDamaged += row.quantityDamaged;
        bucket.quantityGifted += row.quantityGifted;
        bucket.quantityOnHand += row.quantityOnHand;
        bucket.soldValue = roundCurrency(bucket.soldValue + row.valueSold);
        bucket.collections = roundCurrency(bucket.collections + row.collections);
        bucket.donations = roundCurrency(bucket.donations + row.donations);
        bucket.expenses = roundCurrency(bucket.expenses + row.expenses);
        bucket.balanceDue = roundCurrency(bucket.balanceDue + row.balanceDue);
    });

    return [...byTeam.values()]
        .map(row => ({
            ...row,
            sellThroughRate: row.quantityCheckedOut > 0
                ? roundCurrency((row.quantitySold / row.quantityCheckedOut) * 100)
                : 0,
            netContribution: roundCurrency(row.collections + row.donations - row.expenses)
        }))
        .sort((left, right) => right.soldValue - left.soldValue);
}

function buildConsignmentPerformanceReportData({
    consignmentOrders = [],
    rangeSpec,
    durationMs = 0,
    truncatedSources = {}
}) {
    const orderRows = buildConsignmentSalesReportRows(consignmentOrders)
        .sort((left, right) => toDateValue(right.transactionDate).getTime() - toDateValue(left.transactionDate).getTime());
    const teamRows = buildConsignmentTeamRows(orderRows);
    const uniqueTeams = new Set(orderRows.map(row => normalizeText(row.teamName)).filter(Boolean));

    const summary = {
        orderCount: orderRows.length,
        teamCount: uniqueTeams.size,
        quantityCheckedOut: sumMetric(orderRows, "quantityCheckedOut"),
        quantitySold: sumMetric(orderRows, "quantitySold"),
        quantityReturned: sumMetric(orderRows, "quantityReturned"),
        quantityDamaged: sumMetric(orderRows, "quantityDamaged"),
        quantityGifted: sumMetric(orderRows, "quantityGifted"),
        quantityOnHand: sumMetric(orderRows, "quantityOnHand"),
        soldValue: sumMetric(orderRows, "valueSold"),
        collections: sumMetric(orderRows, "collections"),
        donations: sumMetric(orderRows, "donations"),
        expenses: sumMetric(orderRows, "expenses"),
        balanceDue: sumMetric(orderRows, "balanceDue"),
        netContribution: roundCurrency(sumMetric(orderRows, "collections") + sumMetric(orderRows, "donations") - sumMetric(orderRows, "expenses")),
        sellThroughRate: sumMetric(orderRows, "quantityCheckedOut") > 0
            ? roundCurrency((sumMetric(orderRows, "quantitySold") / sumMetric(orderRows, "quantityCheckedOut")) * 100)
            : 0
    };

    return {
        rangeKey: rangeSpec.rangeKey,
        rangeLabel: rangeSpec.rangeLabel,
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate,
        generatedAt: Date.now(),
        durationMs,
        summary,
        teamRows,
        detailRows: orderRows.slice(0, 60),
        metadata: {
            truncatedSources,
            sourceCounts: {
                consignmentOrders: consignmentOrders.length
            }
        }
    };
}

function buildCategoryNameMap(categories = []) {
    return new Map(
        (categories || []).map(category => [normalizeText(category.id), normalizeText(category.categoryName)]).filter(([id]) => id)
    );
}

function resolveInventoryCategoryName(product = {}, categoryNameMap = new Map()) {
    const categoryId = normalizeText(product.categoryId);
    return normalizeText(categoryNameMap.get(categoryId)) || categoryId || "-";
}

function resolveInventoryStatus(units = 0) {
    if (units <= 0) return "Out Of Stock";
    if (units <= LOW_STOCK_THRESHOLD) return "Low Stock";
    if (units <= MEDIUM_STOCK_THRESHOLD) return "Medium Stock";
    return "Healthy Stock";
}

function buildInventoryRows(products = [], categories = []) {
    const categoryNameMap = buildCategoryNameMap(categories);

    return (products || [])
        .filter(product => product.isActive !== false)
        .map(product => {
            const units = Math.max(0, Number(product.inventoryCount) || 0);
            const unitCost = roundCurrency(product.unitPrice);
            const unitSell = roundCurrency(product.sellingPrice);
            const costValue = roundCurrency(units * unitCost);
            const retailValue = roundCurrency(units * unitSell);

            return {
                id: product.id,
                productName: normalizeText(product.itemName) || "Untitled Product",
                categoryName: resolveInventoryCategoryName(product, categoryNameMap),
                units,
                unitCost,
                unitSell,
                costValue,
                retailValue,
                potentialMargin: roundCurrency(retailValue - costValue),
                stockStatus: resolveInventoryStatus(units),
                isReadyForSale: product.isReadyForSale !== false
            };
        })
        .sort((left, right) => left.units - right.units || left.productName.localeCompare(right.productName));
}

function buildInventoryBucketRows(rows = []) {
    const buckets = new Map([
        ["Out Of Stock", { label: "Out Of Stock", count: 0, units: 0 }],
        ["Low Stock", { label: "Low Stock", count: 0, units: 0 }],
        ["Medium Stock", { label: "Medium Stock", count: 0, units: 0 }],
        ["Healthy Stock", { label: "Healthy Stock", count: 0, units: 0 }]
    ]);

    rows.forEach(row => {
        const bucket = buckets.get(row.stockStatus);
        if (!bucket) return;
        bucket.count += 1;
        bucket.units += row.units;
    });

    return [...buckets.values()];
}

function buildInventoryStatusReportData({
    products = [],
    categories = [],
    asOfDate = new Date(),
    durationMs = 0,
    truncatedSources = {}
}) {
    const inventoryRows = buildInventoryRows(products, categories);
    const bucketRows = buildInventoryBucketRows(inventoryRows);
    const alertRows = inventoryRows.filter(row => ["Out Of Stock", "Low Stock"].includes(row.stockStatus));

    return {
        asOfDate,
        generatedAt: Date.now(),
        durationMs,
        summary: {
            productCount: inventoryRows.length,
            outOfStockCount: alertRows.filter(row => row.stockStatus === "Out Of Stock").length,
            lowStockCount: alertRows.filter(row => row.stockStatus === "Low Stock").length,
            totalUnits: inventoryRows.reduce((sum, row) => sum + row.units, 0)
        },
        bucketRows,
        alertRows,
        metadata: {
            truncatedSources,
            sourceCounts: {
                products: products.length,
                categories: categories.length
            }
        }
    };
}

function buildInventoryValuationCategoryRows(rows = []) {
    const byCategory = new Map();

    rows.forEach(row => {
        const key = row.categoryName || "-";
        if (!byCategory.has(key)) {
            byCategory.set(key, {
                categoryName: key,
                productCount: 0,
                totalUnits: 0,
                costValue: 0,
                retailValue: 0,
                potentialMargin: 0
            });
        }

        const bucket = byCategory.get(key);
        bucket.productCount += 1;
        bucket.totalUnits += row.units;
        bucket.costValue = roundCurrency(bucket.costValue + row.costValue);
        bucket.retailValue = roundCurrency(bucket.retailValue + row.retailValue);
        bucket.potentialMargin = roundCurrency(bucket.retailValue - bucket.costValue);
    });

    return [...byCategory.values()].sort((left, right) => right.costValue - left.costValue);
}

function buildInventoryValuationReportData({
    products = [],
    categories = [],
    purchaseInvoices = [],
    asOfDate = new Date(),
    durationMs = 0,
    truncatedSources = {}
}) {
    const fallbackCostMap = buildProductFallbackCostMap(products);
    const { weightedCostMap, costingSummary } = buildWeightedPurchaseCostMap(purchaseInvoices, fallbackCostMap);
    const categoryNameMap = buildCategoryNameMap(categories);

    const valuationRows = (products || [])
        .filter(product => product.isActive !== false)
        .map(product => {
            const units = Math.max(0, Number(product.inventoryCount) || 0);
            const productId = normalizeText(product.id);
            const unitCost = roundCurrency(weightedCostMap.get(productId) || 0);
            const unitSell = roundCurrency(product.sellingPrice);
            const costValue = roundCurrency(units * unitCost);
            const retailValue = roundCurrency(units * unitSell);

            return {
                id: productId,
                productName: normalizeText(product.itemName) || "Untitled Product",
                categoryName: resolveInventoryCategoryName(product, categoryNameMap),
                units,
                unitCost,
                unitSell,
                costValue,
                retailValue,
                potentialMargin: roundCurrency(retailValue - costValue)
            };
        })
        .sort((left, right) => right.costValue - left.costValue);

    return {
        asOfDate,
        generatedAt: Date.now(),
        durationMs,
        summary: {
            totalUnits: valuationRows.reduce((sum, row) => sum + row.units, 0),
            totalCostValue: sumMetric(valuationRows, "costValue"),
            totalRetailValue: sumMetric(valuationRows, "retailValue"),
            potentialMargin: sumMetric(valuationRows, "potentialMargin"),
            productCount: valuationRows.length,
            weightedCostingProducts: costingSummary.weightedProductCount,
            fallbackCostingProducts: costingSummary.fallbackProductCount
        },
        categoryRows: buildInventoryValuationCategoryRows(valuationRows),
        detailRows: valuationRows.slice(0, 60),
        metadata: {
            truncatedSources,
            sourceCounts: {
                products: products.length,
                categories: categories.length,
                purchaseInvoices: purchaseInvoices.length
            }
        }
    };
}

function buildProductFallbackCostMap(products = []) {
    return new Map(
        (products || []).map(product => [normalizeText(product.id), roundCurrency(product.unitPrice)])
    );
}

function buildWeightedPurchaseCostMap(purchaseInvoices = [], fallbackCostMap = new Map()) {
    const totalsByProduct = new Map();

    (purchaseInvoices || [])
        .filter(row => normalizeStatus(row.invoiceStatus || row.paymentStatus, "Unpaid") !== "Voided")
        .forEach(invoice => {
            const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
            const invoiceDiscountAmount = roundCurrency(invoice.invoiceDiscountAmount);
            const itemsSubtotal = roundCurrency(
                invoice.itemsSubtotal
                ?? items.reduce((sum, item) => sum + roundCurrency(item.netPrice), 0)
            );

            items.forEach(item => {
                const productId = normalizeText(item.masterProductId);
                const quantity = Number(item.quantity) || 0;
                if (!productId || quantity <= 0) return;

                const lineNetPrice = roundCurrency(item.netPrice);
                const allocationRatio = itemsSubtotal > 0 ? (lineNetPrice / itemsSubtotal) : 0;
                const allocatedInvoiceDiscount = roundCurrency(invoiceDiscountAmount * allocationRatio);
                const adjustedLineCost = roundCurrency(Math.max(0, lineNetPrice - allocatedInvoiceDiscount));

                if (!totalsByProduct.has(productId)) {
                    totalsByProduct.set(productId, {
                        totalQuantity: 0,
                        totalCost: 0
                    });
                }

                const bucket = totalsByProduct.get(productId);
                bucket.totalQuantity += quantity;
                bucket.totalCost = roundCurrency(bucket.totalCost + adjustedLineCost);
            });
        });

    const weightedCostMap = new Map();
    const productIds = new Set([
        ...totalsByProduct.keys(),
        ...fallbackCostMap.keys()
    ]);

    let weightedProductCount = 0;
    let fallbackProductCount = 0;

    productIds.forEach(productId => {
        const weighted = totalsByProduct.get(productId);
        if (weighted && weighted.totalQuantity > 0) {
            weightedCostMap.set(productId, roundCurrency(weighted.totalCost / weighted.totalQuantity));
            weightedProductCount += 1;
            return;
        }

        weightedCostMap.set(productId, roundCurrency(fallbackCostMap.get(productId) || 0));
        fallbackProductCount += 1;
    });

    return {
        weightedCostMap,
        costingSummary: {
            weightedProductCount,
            fallbackProductCount
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
                grossProfit: 0,
                expenses: 0,
                operatingProfit: 0
            });
        }

        const bucket = bySegment.get(key);
        bucket.grossSales = roundCurrency(bucket.grossSales + row.grossSales);
        bucket.discounts = roundCurrency(bucket.discounts + row.discounts);
        bucket.netSales = roundCurrency(bucket.netSales + row.netSales);
        bucket.cogs = roundCurrency(bucket.cogs + row.cogs);
        bucket.grossProfit = roundCurrency(bucket.netSales - bucket.cogs);
        bucket.expenses = roundCurrency(bucket.expenses + row.expenses);
        bucket.operatingProfit = roundCurrency(bucket.grossProfit - bucket.expenses);
    });

    return [...bySegment.values()].sort((left, right) => right.netSales - left.netSales);
}

function buildProfitAndLossReportData({
    salesInvoices = [],
    consignmentOrders = [],
    donations = [],
    purchaseInvoices = [],
    products = [],
    rangeSpec,
    durationMs = 0,
    truncatedSources = {}
}) {
    const fallbackCostMap = buildProductFallbackCostMap(products);
    const { weightedCostMap: productCostMap, costingSummary } = buildWeightedPurchaseCostMap(purchaseInvoices, fallbackCostMap);

    const retailRows = buildRetailProfitRows(salesInvoices, productCostMap);
    const consignmentRows = buildConsignmentProfitRows(consignmentOrders, productCostMap);
    const segmentSourceRows = [...retailRows, ...consignmentRows];

    const tastyTreatsRows = retailRows.filter(row => row.segment === "Tasty Treats");
    const churchStoreRows = retailRows.filter(row => row.segment === "Church Store");

    const retailGrossSales = sumMetric(retailRows, "grossSales");
    const retailDiscounts = sumMetric(retailRows, "discounts");
    const retailNetSales = sumMetric(retailRows, "netSales");
    const retailCogs = sumMetric(retailRows, "cogs");
    const retailExpenses = sumMetric(retailRows, "expenses");
    const retailTaxesCollected = sumMetric(retailRows, "taxCollected");

    const consignmentNetSales = sumMetric(consignmentRows, "netSales");
    const consignmentCogs = sumMetric(consignmentRows, "cogs");
    const consignmentExpenses = sumMetric(consignmentRows, "expenses");

    const tastyTreatsGrossSales = sumMetric(tastyTreatsRows, "grossSales");
    const tastyTreatsDiscounts = sumMetric(tastyTreatsRows, "discounts");
    const tastyTreatsNetSales = sumMetric(tastyTreatsRows, "netSales");
    const tastyTreatsCogs = sumMetric(tastyTreatsRows, "cogs");
    const tastyTreatsExpenses = sumMetric(tastyTreatsRows, "expenses");

    const churchStoreGrossSales = sumMetric(churchStoreRows, "grossSales");
    const churchStoreDiscounts = sumMetric(churchStoreRows, "discounts");
    const churchStoreNetSales = sumMetric(churchStoreRows, "netSales");
    const churchStoreCogs = sumMetric(churchStoreRows, "cogs");
    const churchStoreExpenses = sumMetric(churchStoreRows, "expenses");

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
            retailTaxesCollected,
            weightedCostingProducts: costingSummary.weightedProductCount,
            fallbackCostingProducts: costingSummary.fallbackProductCount
        },
        statementRows: [
            { section: "Revenue", label: "Tasty Treats Gross Sales", amount: tastyTreatsGrossSales },
            { section: "Revenue", label: "Less Tasty Treats Discounts", amount: roundCurrency(tastyTreatsDiscounts * -1) },
            { section: "Revenue", label: "Tasty Treats Net Sales", amount: tastyTreatsNetSales },
            { section: "Revenue", label: "Church Store Gross Sales", amount: churchStoreGrossSales },
            { section: "Revenue", label: "Less Church Store Discounts", amount: roundCurrency(churchStoreDiscounts * -1) },
            { section: "Revenue", label: "Church Store Net Sales", amount: churchStoreNetSales },
            { section: "Revenue", label: "Total Retail Net Sales", amount: retailNetSales, tone: "total" },
            { section: "Revenue", label: "Consignment Sales", amount: consignmentNetSales },
            { section: "Revenue", label: "Net Sales Revenue", amount: netSalesRevenue, tone: "total" },
            { section: "Cost Of Sales", label: "Tasty Treats Cost Of Goods Sold", amount: roundCurrency(tastyTreatsCogs * -1) },
            { section: "Cost Of Sales", label: "Church Store Cost Of Goods Sold", amount: roundCurrency(churchStoreCogs * -1) },
            { section: "Cost Of Sales", label: "Consignment Cost Of Goods Sold", amount: roundCurrency(consignmentCogs * -1) },
            { section: "Cost Of Sales", label: "Total Cost Of Goods Sold", amount: roundCurrency(totalCogs * -1), tone: "total" },
            { section: "Cost Of Sales", label: "Gross Profit", amount: grossProfit, tone: "total" },
            { section: "Operating Expenses", label: "Tasty Treats Expenses", amount: roundCurrency(tastyTreatsExpenses * -1) },
            { section: "Operating Expenses", label: "Church Store Expenses", amount: roundCurrency(churchStoreExpenses * -1) },
            { section: "Operating Expenses", label: "Consignment Operating Expenses", amount: roundCurrency(consignmentExpenses * -1) },
            { section: "Operating Expenses", label: "Total Operating Expenses", amount: roundCurrency(totalOperatingExpenses * -1), tone: "total" },
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
                purchaseInvoices: purchaseInvoices.length,
                products: products.length
            },
            notes: [
                "Retail revenue excludes output tax and uses final taxable sales value split by Tasty Treats and Church Store.",
                "Cost of goods sold uses weighted purchase-history cost from active purchase invoices up to the report end date.",
                "When a product has no purchase history, the current product master cost is used as fallback.",
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
    const [salesInvoicesResult, consignmentOrdersResult, donationsResult, purchaseInvoicesResult, productsResult] = await Promise.all([
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
        fetchReportWindowedRows(COLLECTIONS.purchaseInvoices, {
            dateField: "purchaseDate",
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.products)
    ]);

    const data = buildProfitAndLossReportData({
        salesInvoices: salesInvoicesResult.rows,
        consignmentOrders: consignmentOrdersResult.rows,
        donations: donationsResult.rows,
        purchaseInvoices: purchaseInvoicesResult.rows,
        products: productsResult.rows,
        rangeSpec,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            salesInvoices: salesInvoicesResult.truncated,
            consignmentOrders: consignmentOrdersResult.truncated,
            donations: donationsResult.truncated,
            purchaseInvoices: purchaseInvoicesResult.truncated,
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

export async function getSalesSummaryReport(user, rangeSpec, { forceRefresh = false } = {}) {
    if (!user || !["admin", "sales_staff", "finance"].includes(user.role)) {
        throw new Error("You do not have access to the sales summary report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "sales-summary", rangeSpec.rangeKey);
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
        fetchReportWindowedRows(COLLECTIONS.salesInvoices, {
            dateField: "saleDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.simpleConsignments, {
            dateField: "checkoutDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        })
    ]);

    const data = buildSalesSummaryReportData({
        salesInvoices: salesInvoicesResult.rows,
        consignmentOrders: consignmentOrdersResult.rows,
        rangeSpec,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            salesInvoices: salesInvoicesResult.truncated,
            consignmentOrders: consignmentOrdersResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "sales-summary", rangeSpec.rangeKey, data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getSalesTrendReport(user, rangeSpec, { forceRefresh = false } = {}) {
    if (!user || !["admin", "sales_staff", "finance"].includes(user.role)) {
        throw new Error("You do not have access to the sales trend report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "sales-trend", rangeSpec.rangeKey);
        if (cached?.data) {
            return {
                data: cached.data,
                source: "cache",
                loadedAt: Number(cached.loadedAt) || Date.now(),
                expiresAt: Number(cached.expiresAt) || (Date.now() + CACHE_TTL_MS)
            };
        }
    }

    const compareRangeSpec = buildComparableRangeSpec(rangeSpec);
    if (!compareRangeSpec) {
        throw new Error("Sales trend comparison window is invalid.");
    }
    const startedAt = performance.now();
    const [salesInvoicesResult, consignmentOrdersResult, comparisonSalesInvoicesResult, comparisonConsignmentOrdersResult] = await Promise.all([
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
        fetchReportWindowedRows(COLLECTIONS.salesInvoices, {
            dateField: "saleDate",
            startDate: compareRangeSpec?.startDate || null,
            endDate: compareRangeSpec?.endDate || null
        }),
        fetchReportWindowedRows(COLLECTIONS.simpleConsignments, {
            dateField: "checkoutDate",
            startDate: compareRangeSpec?.startDate || null,
            endDate: compareRangeSpec?.endDate || null
        })
    ]);

    const data = buildSalesTrendReportData({
        salesInvoices: salesInvoicesResult.rows,
        consignmentOrders: consignmentOrdersResult.rows,
        comparisonSalesInvoices: comparisonSalesInvoicesResult.rows,
        comparisonConsignmentOrders: comparisonConsignmentOrdersResult.rows,
        rangeSpec,
        compareRangeSpec,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            currentSalesInvoices: salesInvoicesResult.truncated,
            currentConsignmentOrders: consignmentOrdersResult.truncated,
            comparisonSalesInvoices: comparisonSalesInvoicesResult.truncated,
            comparisonConsignmentOrders: comparisonConsignmentOrdersResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "sales-trend", rangeSpec.rangeKey, data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getLeadConversionReport(user, rangeSpec, { forceRefresh = false } = {}) {
    if (!user || !["admin", "sales_staff", "team_lead"].includes(user.role)) {
        throw new Error("You do not have access to the lead conversion report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "lead-conversion", rangeSpec.rangeKey);
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
    const [leadsResult, salesInvoicesResult] = await Promise.all([
        fetchReportWindowedRows(COLLECTIONS.leads, {
            dateField: "enquiryDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.salesInvoices, {
            dateField: "saleDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        })
    ]);

    const data = buildLeadConversionReportData({
        leads: leadsResult.rows,
        salesInvoices: salesInvoicesResult.rows,
        rangeSpec,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            leads: leadsResult.truncated,
            salesInvoices: salesInvoicesResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "lead-conversion", rangeSpec.rangeKey, data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getStorePerformanceReport(user, rangeSpec, { forceRefresh = false } = {}) {
    if (!user || !["admin", "sales_staff", "finance"].includes(user.role)) {
        throw new Error("You do not have access to the store performance report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "store-performance", rangeSpec.rangeKey);
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
    const salesInvoicesResult = await fetchReportWindowedRows(COLLECTIONS.salesInvoices, {
        dateField: "saleDate",
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate
    });

    const data = buildStorePerformanceReportData({
        salesInvoices: salesInvoicesResult.rows,
        rangeSpec,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            salesInvoices: salesInvoicesResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "store-performance", rangeSpec.rangeKey, data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getConsignmentPerformanceReport(user, rangeSpec, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance", "sales_staff"].includes(user.role)) {
        throw new Error("You do not have access to the consignment performance report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "consignment-performance", rangeSpec.rangeKey);
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
    const consignmentOrdersResult = await fetchReportWindowedRows(COLLECTIONS.simpleConsignments, {
        dateField: "checkoutDate",
        startDate: rangeSpec.startDate,
        endDate: rangeSpec.endDate
    });

    const data = buildConsignmentPerformanceReportData({
        consignmentOrders: consignmentOrdersResult.rows,
        rangeSpec,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            consignmentOrders: consignmentOrdersResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "consignment-performance", rangeSpec.rangeKey, data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getInventoryStatusReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance"].includes(user.role)) {
        throw new Error("You do not have access to the inventory status report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "inventory-status", "as-of-today");
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
    const [productsResult, categoriesResult] = await Promise.all([
        fetchReportWindowedRows(COLLECTIONS.products),
        fetchReportWindowedRows(COLLECTIONS.categories)
    ]);

    const data = buildInventoryStatusReportData({
        products: productsResult.rows,
        categories: categoriesResult.rows,
        asOfDate: new Date(),
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            products: productsResult.truncated,
            categories: categoriesResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "inventory-status", "as-of-today", data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getInventoryValuationReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance"].includes(user.role)) {
        throw new Error("You do not have access to the inventory valuation report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "inventory-valuation", "as-of-today");
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
    const [productsResult, categoriesResult, purchaseInvoicesResult] = await Promise.all([
        fetchReportWindowedRows(COLLECTIONS.products),
        fetchReportWindowedRows(COLLECTIONS.categories),
        fetchReportWindowedRows(COLLECTIONS.purchaseInvoices, {
            dateField: "purchaseDate",
            endDate: new Date()
        })
    ]);

    const data = buildInventoryValuationReportData({
        products: productsResult.rows,
        categories: categoriesResult.rows,
        purchaseInvoices: purchaseInvoicesResult.rows,
        asOfDate: new Date(),
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            products: productsResult.truncated,
            categories: categoriesResult.truncated,
            purchaseInvoices: purchaseInvoicesResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "inventory-valuation", "as-of-today", data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getReorderRecommendationsReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance"].includes(user.role)) {
        throw new Error("You do not have access to the reorder recommendations report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "reorder-recommendations", "as-of-today");
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
    const masterDataPolicies = getState().masterData?.reorderPolicies || [];
    const shouldReuseMasterDataPolicies = masterDataPolicies.length > 0;
    const [productsResult, categoriesResult, reorderPoliciesResult] = await Promise.all([
        fetchReportWindowedRows(COLLECTIONS.products),
        fetchReportWindowedRows(COLLECTIONS.categories),
        shouldReuseMasterDataPolicies
            ? Promise.resolve({ rows: masterDataPolicies, truncated: false })
            : fetchReportWindowedRows(COLLECTIONS.reorderPolicies)
    ]);
    const activePolicies = (reorderPoliciesResult.rows || []).filter(policy => policy?.isActive);
    const systemDefaultPolicy = resolveSystemDefaultPolicy(activePolicies, { activeOnly: true });

    if (!systemDefaultPolicy) {
        throw new Error("Create the active Moneta default reorder rule in Admin Modules before using this report.");
    }

    const maxLookbackDays = getMaxReorderPolicyWindowDays(activePolicies);
    const startDate = getWindowStartFromDays(maxLookbackDays, new Date());
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const [salesInvoicesResult, consignmentOrdersResult] = await Promise.all([
        fetchReportWindowedRows(COLLECTIONS.salesInvoices, {
            dateField: "saleDate",
            startDate,
            endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.simpleConsignments, {
            dateField: "checkoutDate",
            startDate,
            endDate
        })
    ]);

    const data = buildReorderRecommendationsReportData({
        products: productsResult.rows,
        categories: categoriesResult.rows,
        reorderPolicies: reorderPoliciesResult.rows,
        salesInvoices: salesInvoicesResult.rows,
        consignmentOrders: consignmentOrdersResult.rows,
        asOfDate: new Date(),
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            products: productsResult.truncated,
            categories: categoriesResult.truncated,
            reorderPolicies: reorderPoliciesResult.truncated,
            salesInvoices: salesInvoicesResult.truncated,
            consignmentOrders: consignmentOrdersResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "reorder-recommendations", "as-of-today", data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}

export async function getProductPerformanceReport(user, rangeSpec, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance", "sales_staff"].includes(user.role)) {
        throw new Error("You do not have access to the product performance report.");
    }

    if (!forceRefresh) {
        const cached = readReportCache(user, "product-performance", rangeSpec.rangeKey);
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
    const [productsResult, categoriesResult, salesInvoicesResult, consignmentOrdersResult] = await Promise.all([
        fetchReportWindowedRows(COLLECTIONS.products),
        fetchReportWindowedRows(COLLECTIONS.categories),
        fetchReportWindowedRows(COLLECTIONS.salesInvoices, {
            dateField: "saleDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        }),
        fetchReportWindowedRows(COLLECTIONS.simpleConsignments, {
            dateField: "checkoutDate",
            startDate: rangeSpec.startDate,
            endDate: rangeSpec.endDate
        })
    ]);

    const data = buildProductPerformanceReportData({
        products: productsResult.rows,
        categories: categoriesResult.rows,
        salesInvoices: salesInvoicesResult.rows,
        consignmentOrders: consignmentOrdersResult.rows,
        rangeSpec,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        truncatedSources: {
            products: productsResult.truncated,
            categories: categoriesResult.truncated,
            salesInvoices: salesInvoicesResult.truncated,
            consignmentOrders: consignmentOrdersResult.truncated
        }
    });

    const loadedAt = Date.now();
    const expiresAt = writeReportCache(user, "product-performance", rangeSpec.rangeKey, data, loadedAt);

    return {
        data,
        source: "live",
        loadedAt,
        expiresAt
    };
}
