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
