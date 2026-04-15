import { formatCurrency } from "../../shared/utils/currency.js";
import {
    formatDateLabel,
    formatDateTime,
    getCashFlowSummaryReport,
    getConsignmentPerformanceReport,
    getInventoryStatusReport,
    getInventoryValuationReport,
    getOutstandingReceivablesReport,
    getProfitAndLossReport,
    getProductPerformanceReport,
    getPurchasePayablesReport,
    getSalesSummaryReport,
    getStorePerformanceReport,
    resolveCashFlowRangeSpec
} from "../reports/service.js";

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizeQuery(value) {
    return normalizeText(value).toLowerCase();
}

function dedupeStrings(values = []) {
    return [...new Set((values || []).map(value => normalizeText(value)).filter(Boolean))];
}

function formatPercent(value) {
    return `${Number(Number(value) || 0).toFixed(2)}%`;
}

function makeMetric(label, value, tone = "neutral") {
    return { label, value, tone };
}

function safePercent(numerator, denominator) {
    if (!denominator) return 0;
    return Number(((Number(numerator) || 0) / Number(denominator)) * 100);
}

function makeSourceMeta(result, reportData, windowLabelOverride = "") {
    return {
        sourceLabel: result?.source === "cache" ? "Cached Snapshot" : "Live Data",
        preparedAt: formatDateTime(reportData?.generatedAt || result?.loadedAt),
        windowLabel: windowLabelOverride || reportData?.rangeLabel || (reportData?.asOfDate ? `As of ${formatDateLabel(reportData.asOfDate)}` : "-")
    };
}

function cloneRangeSpec(rangeSpec) {
    if (!rangeSpec) return null;
    return {
        ...rangeSpec,
        startDate: rangeSpec.startDate ? new Date(rangeSpec.startDate) : null,
        endDate: rangeSpec.endDate ? new Date(rangeSpec.endDate) : null
    };
}

function buildCustomRangeSpec(label, startDate, endDate) {
    const safeStart = new Date(startDate);
    const safeEnd = new Date(endDate);
    safeStart.setHours(0, 0, 0, 0);
    safeEnd.setHours(23, 59, 59, 999);

    return {
        isValid: true,
        rangeKey: `custom:${safeStart.toISOString().slice(0, 10)}:${safeEnd.toISOString().slice(0, 10)}`,
        rangeLabel: label,
        startDate: safeStart,
        endDate: safeEnd
    };
}

function parseExplicitDate(text) {
    const value = new Date(`${text}T00:00:00`);
    return Number.isNaN(value.getTime()) ? null : value;
}

function startOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfQuarter(date = new Date()) {
    const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
    return new Date(date.getFullYear(), quarterStartMonth, 1);
}

function endOfQuarter(date = new Date()) {
    const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
    return new Date(date.getFullYear(), quarterStartMonth + 3, 0);
}

function startOfWeek(date = new Date()) {
    const value = new Date(date);
    const day = value.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    value.setDate(value.getDate() + diff);
    value.setHours(0, 0, 0, 0);
    return value;
}

function endOfWeek(date = new Date()) {
    const value = startOfWeek(date);
    value.setDate(value.getDate() + 6);
    value.setHours(23, 59, 59, 999);
    return value;
}

function normalizeRangeLabel(label) {
    return normalizeText(label) || "Custom Range";
}

function hasExplicitRangeTokens(query = "") {
    const normalized = normalizeQuery(query);
    return Boolean(
        /\b(\d{4}-\d{2}-\d{2})\b/.test(normalized)
        || /\btoday\b|\byesterday\b|\bytd\b|\byear to date\b|\bthis month\b|\blast month\b|\bthis quarter\b|\blast quarter\b|\bthis week\b|\blast week\b|\bthis year\b|\blast year\b|\blast\s+\d{1,3}\s+days?\b|\b30d\b|\b90d\b/.test(normalized)
    );
}

function shouldReusePriorRange(query = "") {
    const normalized = normalizeQuery(query);
    return /\bsame (window|range|period|dates?)\b|\bthat (window|range|period)\b|\buse the same (window|range|period)\b|\bfor the same (window|range|period)\b|\bsame timeframe\b/.test(normalized);
}

function isFollowUpQuery(query = "") {
    const normalized = normalizeQuery(query);
    return /^(and|also|now|then|what about|how about|okay what about|ok what about|show me|show|give me|tell me|compare|for the same)\b/.test(normalized)
        || shouldReusePriorRange(normalized);
}

function resolveRangeSpecFromQuery(query, defaultRangeKey = "30d", previousRangeSpec = null) {
    const normalized = normalizeQuery(query);
    const dateMatches = [...normalized.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)].map(match => match[1]);

    if (dateMatches.length >= 2) {
        const fromDate = parseExplicitDate(dateMatches[0]);
        const toDate = parseExplicitDate(dateMatches[1]);

        if (fromDate && toDate && fromDate.getTime() <= toDate.getTime()) {
            return buildCustomRangeSpec(`${formatDateLabel(fromDate)} - ${formatDateLabel(toDate)}`, fromDate, toDate);
        }
    }

    if (/\btoday\b/.test(normalized)) {
        const today = new Date();
        return buildCustomRangeSpec("Today", today, today);
    }

    if (/\byesterday\b/.test(normalized)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return buildCustomRangeSpec("Yesterday", yesterday, yesterday);
    }

    if (/\bytd\b|\byear to date\b/.test(normalized)) {
        return resolveCashFlowRangeSpec({ rangeKey: "ytd" });
    }

    if (/\bthis month\b/.test(normalized)) {
        const today = new Date();
        return buildCustomRangeSpec("This Month", startOfMonth(today), today);
    }

    if (/\blast month\b/.test(normalized)) {
        const today = new Date();
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return buildCustomRangeSpec("Last Month", startOfMonth(lastMonthDate), endOfMonth(lastMonthDate));
    }

    if (/\bthis quarter\b/.test(normalized)) {
        const today = new Date();
        return buildCustomRangeSpec("This Quarter", startOfQuarter(today), today);
    }

    if (/\blast quarter\b/.test(normalized)) {
        const today = new Date();
        const lastQuarterDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        return buildCustomRangeSpec("Last Quarter", startOfQuarter(lastQuarterDate), endOfQuarter(lastQuarterDate));
    }

    if (/\bthis week\b/.test(normalized)) {
        const today = new Date();
        return buildCustomRangeSpec("This Week", startOfWeek(today), today);
    }

    if (/\blast week\b/.test(normalized)) {
        const today = new Date();
        const priorWeek = new Date(today);
        priorWeek.setDate(priorWeek.getDate() - 7);
        return buildCustomRangeSpec("Last Week", startOfWeek(priorWeek), endOfWeek(priorWeek));
    }

    if (/\bthis year\b/.test(normalized)) {
        const today = new Date();
        return buildCustomRangeSpec("This Year", new Date(today.getFullYear(), 0, 1), today);
    }

    if (/\blast year\b/.test(normalized)) {
        const today = new Date();
        return buildCustomRangeSpec("Last Year", new Date(today.getFullYear() - 1, 0, 1), new Date(today.getFullYear() - 1, 11, 31));
    }

    const lastDaysMatch = normalized.match(/\blast\s+(\d{1,3})\s+days?\b/);
    if (lastDaysMatch) {
        const days = Math.max(1, Number(lastDaysMatch[1]) || 0);
        if (days === 30) return resolveCashFlowRangeSpec({ rangeKey: "30d" });
        if (days === 90) return resolveCashFlowRangeSpec({ rangeKey: "90d" });

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (days - 1));
        return buildCustomRangeSpec(`Last ${days} Days`, startDate, endDate);
    }

    if (/\b30d\b|\blast 30\b/.test(normalized)) {
        return resolveCashFlowRangeSpec({ rangeKey: "30d" });
    }

    if (/\b90d\b|\blast 90\b/.test(normalized)) {
        return resolveCashFlowRangeSpec({ rangeKey: "90d" });
    }

    if (previousRangeSpec && shouldReusePriorRange(normalized)) {
        return cloneRangeSpec(previousRangeSpec);
    }

    return resolveCashFlowRangeSpec({ rangeKey: defaultRangeKey });
}

const INTENT_MATCHERS = {
    cashFlow: [/\bcash ?flow\b/, /\bcash movement\b/, /\bnet cash\b/, /\bliquidity\b/, /\binflow\b/, /\boutflow\b/, /\bdonation cash\b/, /\bsupplier cash\b/],
    receivables: [/\breceivable\b/, /\boutstanding receivable\b/, /\bcustomer balance\b/, /\bopen receivable\b/, /\boverdue customer\b/, /\bwho owes us\b/, /\bunpaid customer\b/, /\baccounts receivable\b/],
    payables: [/\bpayable\b/, /\bpurchase payable\b/, /\bsupplier balance\b/, /\bvendor balance\b/, /\bowe suppliers\b/, /\bopen payables\b/, /\bsupplier exposure\b/, /\baccounts payable\b/, /\bopen supplier bills?\b/, /\bopen supplier invoices?\b/, /\bunpaid supplier bills?\b/, /\bsupplier bills?\b/],
    profitAndLoss: [/\bp&l\b/, /\bp and l\b/, /\bprofit and loss\b/, /\bincome statement\b/, /\bnet profit\b/, /\bgross profit\b/, /\boperating profit\b/, /\bprofitability\b/],
    salesSummary: [/\bsales\b/, /\brevenue\b/, /\bturnover\b/, /\bchannel performance\b/, /\bcommercial performance\b/, /\bdirect sales\b/],
    storePerformance: [/\bdirect store\b/, /\bstore performance\b/, /\bcompare stores?\b/, /\bwhich store\b/, /\btasty treats\b/, /\bchurch store\b/, /\btop store\b/],
    consignmentPerformance: [/\bconsignment\b/, /\bdistributor\b/, /\bsell[- ]through\b/, /\bchecked out\b/, /\bteam performance\b/, /\bbulk channel\b/],
    inventoryStatus: [/\binventory status\b/, /\blow stock\b/, /\bout of stock\b/, /\bstock health\b/, /\bstock alerts?\b/, /\breplenishment\b/, /\bstock level\b/, /\bhow is my inventory\b/, /\bhow's my inventory\b/, /\bhow is inventory\b/, /\binventory overview\b/, /\binventory snapshot\b/],
    inventoryValuation: [/\binventory valuation\b/, /\bvaluation\b/, /\bstock value\b/, /\binventory worth\b/, /\bpotential margin\b/, /\binventory at cost\b/, /\binventory at retail\b/, /\bweighted cost\b/],
    productPerformance: [/\bproduct performance\b/, /\btop selling product\b/, /\btop seller\b/, /\btop sellers\b/, /\bbest[- ]seller\b/, /\bbest selling\b/, /\bmost sold product\b/, /\bhighest selling product\b/, /\btop product\b/, /\bproduct ranking\b/, /\bslow moving\b/, /\bslow-moving\b/, /\bfast moving\b/, /\bfast-moving\b/, /\bwhich products\b/, /\btop selling\b/]
};

const RANGE_AWARE_INTENT_KEYS = new Set(["cashFlow", "profitAndLoss", "salesSummary", "storePerformance", "consignmentPerformance", "productPerformance"]);

function getIntentKeyFromId(intentId = "") {
    return Object.entries(ASSISTANT_INTENTS).find(([, value]) => value.id === intentId)?.[0] || "";
}

function pickIntentKeyFromQuery(query = "", context = {}) {
    const normalized = normalizeQuery(query);

    if (!normalized || /\bhelp\b|\bwhat can you do\b|\bcapabilit(y|ies)\b|\bavailable\b|\bhow do i use\b/.test(normalized)) {
        return "help";
    }

    let bestKey = "";
    let bestScore = 0;

    Object.entries(INTENT_MATCHERS).forEach(([intentKey, matchers]) => {
        const score = matchers.reduce((sum, matcher) => sum + (matcher.test(normalized) ? 1 : 0), 0);
        if (score > bestScore) {
            bestKey = intentKey;
            bestScore = score;
        }
    });

    if (!bestKey && isFollowUpQuery(normalized) && context.lastIntentKey) {
        return context.lastIntentKey;
    }

    return bestKey || "";
}

function resolveAssistantRequest(query = "", context = {}) {
    const intentKey = pickIntentKeyFromQuery(query, context);
    const intent = ASSISTANT_INTENTS[intentKey] || null;
    if (!intent) {
        return {
            intentKey: "",
            intent: null,
            rangeSpec: null,
            reusedPriorRange: false,
            reusedPriorIntent: false
        };
    }

    const reusedPriorIntent = Boolean(context.lastIntentKey && intentKey === context.lastIntentKey && isFollowUpQuery(query));
    const reusedPriorRange = Boolean(
        RANGE_AWARE_INTENT_KEYS.has(intentKey)
        && context.lastRangeSpec
        && ((reusedPriorIntent && !hasExplicitRangeTokens(query)) || shouldReusePriorRange(query))
    );

    const rangeSpec = RANGE_AWARE_INTENT_KEYS.has(intentKey)
        ? (reusedPriorRange
            ? cloneRangeSpec(context.lastRangeSpec)
            : resolveRangeSpecFromQuery(query, intent.defaultRangeKey || "30d", context.lastRangeSpec))
        : null;

    return {
        intentKey,
        intent,
        rangeSpec,
        reusedPriorRange,
        reusedPriorIntent
    };
}

function findLargestBucket(entries = []) {
    return entries.reduce((largest, current) => {
        if (!largest) return current;
        return (current?.value || 0) > (largest?.value || 0) ? current : largest;
    }, null);
}

function describeBalancePressure(overdueBalance = 0, openBalance = 0, label = "balance") {
    const share = safePercent(overdueBalance, openBalance);
    if (share >= 60) return `${formatPercent(share)} of ${label} is overdue beyond 30 days, so this needs close follow-up.`;
    if (share >= 30) return `${formatPercent(share)} of ${label} is already over 30 days old.`;
    return `${formatPercent(share)} of ${label} is over 30 days old.`;
}

const ASSISTANT_INTENTS = {
    help: {
        id: "help",
        label: "Assistant Help",
        requiresData: false,
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead", "guest"],
        defaultPrompts: {
            admin: [
                "Give me cash flow for the last 30 days",
                "Show inventory valuation as of today",
                "What can you do?"
            ],
            finance: [
                "Give me cash flow for the last 30 days",
                "Show P&L year to date",
                "Show outstanding receivables"
            ],
            sales_staff: [
                "Show sales summary for the last 30 days",
                "Compare Church Store and Tasty Treats for 90 days",
                "Show consignment performance for the last 30 days"
            ],
            inventory_manager: [
                "Show inventory status",
                "Show inventory valuation",
                "Show purchase payables"
            ],
            team_lead: [
                "What can you do?",
                "How do I use the assistant?",
                "What reports can my role access?"
            ],
            guest: [
                "What can you do?",
                "How do I get more access?",
                "Which modules are available?"
            ]
        }
    },
    cashFlow: {
        id: "cash-flow",
        label: "Cash Flow Summary",
        roles: ["admin", "finance"],
        defaultRangeKey: "30d",
        prompts: [
            "Give me cash flow for the last 30 days",
            "Show cash flow for the last 90 days",
            "What is donation net cash YTD?"
        ],
        async run(user, query, { rangeSpec } = {}) {
            const result = await getCashFlowSummaryReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData, reportData.rangeLabel);
            const topRetailStore = findLargestBucket([
                { label: "Tasty Treats", value: summary.retailByStore?.tastyTreats || 0 },
                { label: "Church Store", value: summary.retailByStore?.churchStore || 0 }
            ]);

            return {
                title: "Cash Flow Summary",
                reportLabel: "Finance",
                sourceMeta: meta,
                summary: `Net cash movement for ${meta.windowLabel} is ${formatCurrency(summary.netCashMovement || 0)}.`,
                metrics: [
                    makeMetric("Net Cash Movement", formatCurrency(summary.netCashMovement || 0), (summary.netCashMovement || 0) >= 0 ? "positive" : "negative"),
                    makeMetric("Tasty Treats Net Cash", formatCurrency(summary.retailByStore?.tastyTreats || 0), "positive"),
                    makeMetric("Church Store Net Cash", formatCurrency(summary.retailByStore?.churchStore || 0), "positive"),
                    makeMetric("Consignment Net Cash", formatCurrency(summary.consignmentNet || 0), "positive"),
                    makeMetric("Donation Net Cash", formatCurrency(summary.donationNet || 0), "positive"),
                    makeMetric("Supplier Cash Outflow", formatCurrency(summary.supplierNet || 0), "negative")
                ],
                bullets: [
                    topRetailStore ? `${topRetailStore.label} is the strongest direct-store cash contributor in this window at ${formatCurrency(topRetailStore.value || 0)}.` : `Retail cash is split between Tasty Treats and Church Store.`,
                    `Donation cash is shown net of reversals.`,
                    `Supplier outflow reflects payments net of reversals.`
                ],
                followUps: [
                    "Show outstanding receivables",
                    "Show P&L year to date",
                    "Show sales summary for the last 30 days"
                ]
            };
        }
    },
    receivables: {
        id: "receivables",
        label: "Outstanding Receivables",
        roles: ["admin", "finance"],
        prompts: [
            "Show outstanding receivables",
            "How much is overdue over 30 days in receivables?",
            "What is the retail versus consignment balance?"
        ],
        async run(user) {
            const result = await getOutstandingReceivablesReport(user);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData);

            return {
                title: "Outstanding Receivables",
                reportLabel: "Finance",
                sourceMeta: meta,
                summary: `Open receivables as of today are ${formatCurrency(summary.openBalance || 0)} across ${summary.openItems || 0} exposures.`,
                metrics: [
                    makeMetric("Open Receivables", formatCurrency(summary.openBalance || 0), "negative"),
                    makeMetric("Retail Balance", formatCurrency(summary.retailBalance || 0), "negative"),
                    makeMetric("Consignment Balance", formatCurrency(summary.consignmentBalance || 0), "negative"),
                    makeMetric("Over 30 Days", formatCurrency(summary.overdueBalance || 0), "negative")
                ],
                bullets: [
                    `${summary.uniqueParties || 0} unique parties currently have open exposure.`,
                    describeBalancePressure(summary.overdueBalance || 0, summary.openBalance || 0, "receivables"),
                    `This report is an as-of view based on current open balances and aging from transaction dates.`
                ],
                followUps: [
                    "Show cash flow for the last 30 days",
                    "Show purchase payables",
                    "Show sales summary for the last 30 days"
                ]
            };
        }
    },
    payables: {
        id: "payables",
        label: "Purchase Payables",
        roles: ["admin", "finance", "inventory_manager"],
        prompts: [
            "Show purchase payables",
            "How much do we owe suppliers?",
            "What supplier payables are overdue over 30 days?"
        ],
        async run(user) {
            const result = await getPurchasePayablesReport(user);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData);

            return {
                title: "Purchase Payables",
                reportLabel: "Finance / Inventory",
                sourceMeta: meta,
                summary: `Open supplier payables are ${formatCurrency(summary.openBalance || 0)} across ${summary.openInvoices || 0} invoices.`,
                metrics: [
                    makeMetric("Open Payables", formatCurrency(summary.openBalance || 0), "negative"),
                    makeMetric("Over 30 Days", formatCurrency(summary.overdueBalance || 0), "negative"),
                    makeMetric("Suppliers Exposed", `${summary.supplierCount || 0}`, "neutral")
                ],
                bullets: [
                    describeBalancePressure(summary.overdueBalance || 0, summary.openBalance || 0, "supplier payables"),
                    `This is an as-of supplier liability snapshot.`,
                    `Use it to review overdue purchase invoices and supplier exposure.`
                ],
                followUps: [
                    "Show inventory valuation",
                    "Show inventory status",
                    "Show cash flow for the last 30 days"
                ]
            };
        }
    },
    profitAndLoss: {
        id: "profit-and-loss",
        label: "Profit and Loss",
        roles: ["admin", "finance"],
        defaultRangeKey: "ytd",
        prompts: [
            "Show P&L year to date",
            "What is our net profit for the last 90 days?",
            "Show profit and loss for 2026-01-01 to 2026-03-31"
        ],
        async run(user, query, { rangeSpec } = {}) {
            const result = await getProfitAndLossReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData, reportData.rangeLabel);
            const netMargin = safePercent(summary.netProfit || 0, summary.netSalesRevenue || 0);
            const topSegment = (reportData.segmentRows || [])[0] || null;

            return {
                title: "Profit and Loss",
                reportLabel: "Finance",
                sourceMeta: meta,
                summary: `Net profit for ${meta.windowLabel} is ${formatCurrency(summary.netProfit || 0)}.`,
                metrics: [
                    makeMetric("Net Sales Revenue", formatCurrency(summary.netSalesRevenue || 0), "positive"),
                    makeMetric("Gross Profit", formatCurrency(summary.grossProfit || 0), (summary.grossProfit || 0) >= 0 ? "positive" : "negative"),
                    makeMetric("Operating Profit", formatCurrency(summary.operatingProfit || 0), (summary.operatingProfit || 0) >= 0 ? "positive" : "negative"),
                    makeMetric("Net Profit / Loss", formatCurrency(summary.netProfit || 0), (summary.netProfit || 0) >= 0 ? "positive" : "negative")
                ],
                bullets: [
                    `Net margin for the period is ${formatPercent(netMargin)}.`,
                    topSegment ? `${topSegment.segment} is currently the strongest revenue segment at ${formatCurrency(topSegment.netSales || 0)} net sales.` : `This P&L includes both direct retail and consignment channels.`,
                    `COGS uses weighted purchase-history cost with fallback to product master cost where history is missing.`
                ],
                followUps: [
                    "Show cash flow for the last 90 days",
                    "Show sales summary for the last 30 days",
                    "Show outstanding receivables"
                ]
            };
        }
    },
    salesSummary: {
        id: "sales-summary",
        label: "Sales Summary",
        roles: ["admin", "sales_staff", "finance"],
        defaultRangeKey: "30d",
        prompts: [
            "Show sales summary for the last 30 days",
            "What are total sales for 90 days?",
            "Compare direct sales and consignment YTD"
        ],
        async run(user, query, { rangeSpec } = {}) {
            const result = await getSalesSummaryReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData, reportData.rangeLabel);
            const topChannel = (reportData.channelRows || [])
                .slice()
                .sort((left, right) => (right.netSales || 0) - (left.netSales || 0))[0] || null;

            return {
                title: "Sales Summary",
                reportLabel: "Sales",
                sourceMeta: meta,
                summary: `Net sales for ${meta.windowLabel} are ${formatCurrency(summary.netSales || 0)} across ${summary.transactionCount || 0} transactions.`,
                metrics: [
                    makeMetric("Total Sales Revenue", formatCurrency(summary.netSales || 0), "positive"),
                    makeMetric("Direct Sales", formatCurrency(summary.directNetSales || 0), "positive"),
                    makeMetric("Consignment Sales", formatCurrency(summary.consignmentNetSales || 0), "positive"),
                    makeMetric("Outstanding Balance", formatCurrency(summary.balanceDue || 0), "negative")
                ],
                bullets: [
                    topChannel ? `${topChannel.channel} is leading the current sales mix at ${formatCurrency(topChannel.netSales || 0)} net sales.` : `This is a cross-channel view covering Tasty Treats, Church Store, and Consignment.`,
                    `Outstanding balance reflects unsettled exposure across all sales channels.`
                ],
                followUps: [
                    "Compare Church Store and Tasty Treats for the last 30 days",
                    "Show consignment performance for the last 30 days",
                    "Show cash flow for the last 30 days"
                ]
            };
        }
    },
    storePerformance: {
        id: "store-performance",
        label: "Direct Store Performance",
        roles: ["admin", "sales_staff", "finance"],
        defaultRangeKey: "30d",
        prompts: [
            "Compare Church Store and Tasty Treats for the last 30 days",
            "Show direct store performance for 90 days",
            "Which store is on top YTD?"
        ],
        async run(user, query, { rangeSpec } = {}) {
            const result = await getStorePerformanceReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const topRow = (reportData.storeRows || [])[0] || null;
            const runnerUp = (reportData.storeRows || [])[1] || null;
            const meta = makeSourceMeta(result, reportData, reportData.rangeLabel);

            return {
                title: "Direct Store Performance",
                reportLabel: "Sales",
                sourceMeta: meta,
                summary: `Top direct store for ${meta.windowLabel} is ${summary.topStoreName || "-"} with ${formatCurrency(summary.topStoreNetSales || 0)} in net sales.`,
                metrics: [
                    makeMetric("Total Net Sales", formatCurrency(summary.totalNetSales || 0), "positive"),
                    makeMetric("Collections", formatCurrency(summary.totalCollections || 0), "positive"),
                    makeMetric("Outstanding Balance", formatCurrency(summary.totalBalanceDue || 0), "negative"),
                    makeMetric("Top Store", summary.topStoreName || "-", "neutral")
                ],
                bullets: topRow ? [
                    `${topRow.store} currently shows ${formatCurrency(topRow.netSales || 0)} net sales and ${formatPercent(topRow.collectionRate || 0)} collection rate.`,
                    runnerUp ? `${topRow.store} is ahead of ${runnerUp.store} by ${formatCurrency((topRow.netSales || 0) - (runnerUp.netSales || 0))} in net sales.` : `Only one direct store had activity in this window.`,
                    `Donations, expenses, and net contribution are included in the direct-store comparison.`
                ] : [
                    `This report compares only direct stores: Tasty Treats and Church Store.`,
                    `Donations, expenses, and net contribution are included in the store comparison.`
                ],
                followUps: [
                    "Show sales summary for the last 30 days",
                    "Show consignment performance for the last 30 days",
                    "Show cash flow for the last 30 days"
                ]
            };
        }
    },
    consignmentPerformance: {
        id: "consignment-performance",
        label: "Consignment Performance",
        roles: ["admin", "inventory_manager", "finance", "sales_staff"],
        defaultRangeKey: "30d",
        prompts: [
            "Show consignment performance for the last 30 days",
            "What is consignment sell-through for 90 days?",
            "How much balance is due from consignment?"
        ],
        async run(user, query, { rangeSpec } = {}) {
            const result = await getConsignmentPerformanceReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData, reportData.rangeLabel);

            return {
                title: "Consignment Performance",
                reportLabel: "Sales / Inventory",
                sourceMeta: meta,
                summary: `Consignment sold value for ${meta.windowLabel} is ${formatCurrency(summary.soldValue || 0)} with sell-through at ${formatPercent(summary.sellThroughRate || 0)}.`,
                metrics: [
                    makeMetric("Sold Value", formatCurrency(summary.soldValue || 0), "positive"),
                    makeMetric("Collections", formatCurrency(summary.collections || 0), "positive"),
                    makeMetric("Balance Due", formatCurrency(summary.balanceDue || 0), "negative"),
                    makeMetric("Sell Through", formatPercent(summary.sellThroughRate || 0), "neutral")
                ],
                bullets: [
                    `${summary.quantitySold || 0} units sold from ${summary.quantityCheckedOut || 0} checked out.`,
                    `${summary.teamCount || 0} teams or members were active in the selected window.`,
                    `${summary.quantityOnHand || 0} units are still with consignment teams or members.`
                ],
                followUps: [
                    "Show sales summary for the last 30 days",
                    "Show inventory status",
                    "Show cash flow for the last 30 days"
                ]
            };
        }
    },
    inventoryStatus: {
        id: "inventory-status",
        label: "Inventory Status",
        roles: ["admin", "inventory_manager", "finance"],
        prompts: [
            "Show inventory status",
            "What products are low stock?",
            "How many items are out of stock?"
        ],
        async run(user) {
            const result = await getInventoryStatusReport(user);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const firstAlert = (reportData.alertRows || [])[0] || null;
            const meta = makeSourceMeta(result, reportData);
            const alertShare = safePercent((summary.outOfStockCount || 0) + (summary.lowStockCount || 0), summary.productCount || 0);

            return {
                title: "Inventory Status",
                reportLabel: "Inventory",
                sourceMeta: meta,
                summary: `Current inventory snapshot shows ${summary.productCount || 0} active products and ${summary.totalUnits || 0} units on hand.`,
                metrics: [
                    makeMetric("Active Products", `${summary.productCount || 0}`, "neutral"),
                    makeMetric("Out Of Stock", `${summary.outOfStockCount || 0}`, "negative"),
                    makeMetric("Low Stock", `${summary.lowStockCount || 0}`, "warning"),
                    makeMetric("Units On Hand", `${summary.totalUnits || 0}`, "positive")
                ],
                bullets: firstAlert ? [
                    `Top stock alert right now is ${firstAlert.productName} with ${firstAlert.units} units and status ${firstAlert.stockStatus}.`,
                    `${formatPercent(alertShare)} of active products are either low stock or out of stock.`,
                    `Use this as an as-of stock-health snapshot.`
                ] : [
                    `Use this as an as-of stock-health snapshot.`,
                    `It highlights out-of-stock and low-stock items for replenishment review.`
                ],
                followUps: [
                    "Show inventory valuation",
                    "Show purchase payables",
                    "What products are low stock?"
                ]
            };
        }
    },
    inventoryValuation: {
        id: "inventory-valuation",
        label: "Inventory Valuation",
        roles: ["admin", "inventory_manager", "finance"],
        prompts: [
            "Show inventory valuation",
            "What is inventory at cost and retail?",
            "What is the potential margin in inventory?"
        ],
        async run(user) {
            const result = await getInventoryValuationReport(user);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData);
            const topCategory = (reportData.categoryRows || [])[0] || null;

            return {
                title: "Inventory Valuation",
                reportLabel: "Inventory / Finance",
                sourceMeta: meta,
                summary: `Inventory is currently valued at ${formatCurrency(summary.totalCostValue || 0)} cost and ${formatCurrency(summary.totalRetailValue || 0)} retail.`,
                metrics: [
                    makeMetric("Inventory At Cost", formatCurrency(summary.totalCostValue || 0), "neutral"),
                    makeMetric("Inventory At Retail", formatCurrency(summary.totalRetailValue || 0), "positive"),
                    makeMetric("Potential Margin", formatCurrency(summary.potentialMargin || 0), (summary.potentialMargin || 0) >= 0 ? "positive" : "negative"),
                    makeMetric("Weighted Cost Coverage", `${summary.weightedCostingProducts || 0}`, "neutral")
                ],
                bullets: [
                    topCategory ? `${topCategory.categoryName} is the highest-value category at ${formatCurrency(topCategory.costValue || 0)} cost.` : `Inventory valuation is currently spread across ${summary.productCount || 0} active products.`,
                    `${summary.fallbackCostingProducts || 0} products are still using fallback master cost.`,
                    `Valuation uses weighted purchase-history cost up to the current report date where available.`
                ],
                followUps: [
                    "Show inventory status",
                    "Show purchase payables",
                    "Show P&L year to date"
                ]
            };
        }
    },
    productPerformance: {
        id: "product-performance",
        label: "Product Performance",
        roles: ["admin", "inventory_manager", "finance", "sales_staff"],
        defaultRangeKey: "30d",
        prompts: [
            "What is the top selling product?",
            "Show product performance for the last 30 days",
            "Which products are slow moving?"
        ],
        async run(user, query, { rangeSpec } = {}) {
            const result = await getProductPerformanceReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData, reportData.rangeLabel);
            const topRevenueProduct = (reportData.topRows || [])[0] || null;
            const topUnitProduct = (reportData.topRows || [])
                .slice()
                .sort((left, right) => (right.unitsSold || 0) - (left.unitsSold || 0))[0] || null;
            const slowMovingProduct = (reportData.stockExposureRows || [])[0] || null;
            const normalizedQuery = normalizeQuery(query);
            const wantsSlowMovingView = /\bslow moving\b|\bslow-moving\b|\bstock exposure\b|\boverstock\b/.test(normalizedQuery);

            return {
                title: "Product Performance",
                reportLabel: "Sales / Inventory",
                sourceMeta: meta,
                summary: wantsSlowMovingView
                    ? `Slow-moving stock exposure for ${meta.windowLabel} is led by ${slowMovingProduct?.productName || "-"} with ${slowMovingProduct?.unitsOnHand || 0} units still on hand.`
                    : `Top product performance for ${meta.windowLabel} is led by ${topRevenueProduct?.productName || "-"} at ${formatCurrency(topRevenueProduct?.revenue || 0)} in revenue.`,
                metrics: [
                    makeMetric("Products Sold", `${summary.productCount || 0}`, "neutral"),
                    makeMetric("Units Sold", `${summary.totalUnitsSold || 0}`, "positive"),
                    makeMetric("Top By Revenue", topRevenueProduct ? `${topRevenueProduct.productName} · ${formatCurrency(topRevenueProduct.revenue || 0)}` : "-", "positive"),
                    makeMetric("Top By Units", topUnitProduct ? `${topUnitProduct.productName} · ${topUnitProduct.unitsSold || 0}` : "-", "neutral")
                ],
                bullets: [
                    topRevenueProduct ? `${topRevenueProduct.productName} is the top revenue product at ${formatCurrency(topRevenueProduct.revenue || 0)} across ${topRevenueProduct.unitsSold || 0} units.` : `No product sales were found in the selected window.`,
                    topUnitProduct ? `${topUnitProduct.productName} leads by unit volume with ${topUnitProduct.unitsSold || 0} units sold.` : `Unit-volume ranking is only available when sold rows exist in the selected window.`,
                    slowMovingProduct ? `${slowMovingProduct.productName} is the biggest current slow-moving stock exposure at ${formatCurrency(slowMovingProduct.stockExposureValue || 0)} on hand.` : `No meaningful slow-moving stock exposure was found in the current window.`
                ],
                followUps: [
                    "Which products are slow moving?",
                    "Show sales summary for the last 30 days",
                    "How is my inventory?",
                    "Show inventory valuation"
                ]
            };
        }
    }
};

const ROLE_VISIBLE_INTENTS = {
    admin: ["cashFlow", "receivables", "payables", "profitAndLoss", "salesSummary", "storePerformance", "consignmentPerformance", "inventoryStatus", "inventoryValuation", "productPerformance"],
    finance: ["cashFlow", "receivables", "payables", "profitAndLoss", "salesSummary", "storePerformance", "consignmentPerformance", "inventoryStatus", "inventoryValuation", "productPerformance"],
    sales_staff: ["salesSummary", "storePerformance", "consignmentPerformance", "productPerformance"],
    inventory_manager: ["payables", "consignmentPerformance", "inventoryStatus", "inventoryValuation", "productPerformance"],
    team_lead: [],
    guest: []
};

function getAllowedIntentKeys(user) {
    return ROLE_VISIBLE_INTENTS[user?.role] || [];
}

export function getAssistantCapabilities(user) {
    const allowedKeys = getAllowedIntentKeys(user);
    return allowedKeys.map(key => ASSISTANT_INTENTS[key]).filter(Boolean);
}

export function getAssistantPromptSuggestions(user, context = {}) {
    const role = user?.role || "guest";
    const helpPrompts = ASSISTANT_INTENTS.help.defaultPrompts[role] || ASSISTANT_INTENTS.help.defaultPrompts.guest;
    const contextualPrompts = context.lastIntentKey && ASSISTANT_INTENTS[context.lastIntentKey]
        ? dedupeStrings([
            ...(context.lastFollowUps || []),
            ...((ASSISTANT_INTENTS[context.lastIntentKey]?.prompts || []).slice(0, 3))
        ])
        : [];
    const intentPrompts = getAllowedIntentKeys(user)
        .flatMap(key => ASSISTANT_INTENTS[key]?.prompts || [])
        .slice(0, 6);

    return dedupeStrings([...contextualPrompts, ...helpPrompts, ...intentPrompts]).slice(0, 8);
}

export function buildAssistantWelcome(user, context = {}) {
    const capabilities = getAssistantCapabilities(user);
    const capabilityLabels = capabilities.map(item => item.label);

    if (!user) {
        return {
            title: "Moneta Assistant",
            summary: "Sign in to use the assistant.",
            bullets: [
                "The assistant uses your Moneta role to decide what data it can show.",
                "After login, it can answer report-style questions in plain language."
            ]
        };
    }

    if (!capabilityLabels.length) {
        return {
            title: "Moneta Assistant",
            summary: `You are signed in as ${user.role}, so the assistant is currently limited to guidance and navigation help.`,
            bullets: [
                "Your role does not currently expose data-report tools in Assistant V1.",
                "Ask what the assistant can do or request a role upgrade if you need data access."
            ]
        };
    }

    return {
        title: "Moneta Assistant",
        summary: `You are signed in as ${user.role}. I can answer role-safe questions using Moneta's existing report logic${context.lastIntentKey ? `, and I can reuse your current conversation context for follow-up questions` : ""}.`,
        bullets: [
            `Available data lanes: ${capabilityLabels.join(", ")}.`,
            "Try natural prompts like “Show cash flow for the last 30 days”, “What about receivables?”, or “Use the same window for P&L”."
        ]
    };
}

export async function askMonetaAssistant(user, query, context = {}) {
    const trimmedQuery = normalizeText(query);

    if (!trimmedQuery) {
        throw new Error("Enter a question for the assistant.");
    }

    const request = resolveAssistantRequest(trimmedQuery, context);
    const intent = request.intent;

    if (!intent) {
        return {
            type: "assistant",
            title: "I Need A More Specific Question",
            summary: "I can answer report-style questions about finance, sales, inventory, and consignment, but I couldn't map that request safely.",
            bullets: [
                "Try naming the business area you want, like cash flow, sales summary, direct store performance, inventory status, or P&L.",
                "You can also include a window like last 30 days, this month, last quarter, YTD, or exact dates like 2026-01-01 to 2026-03-31."
            ],
            followUps: getAssistantPromptSuggestions(user, context).slice(0, 4)
        };
    }

    if (intent.id === "help") {
        const welcome = buildAssistantWelcome(user, context);
        return {
            type: "assistant",
            ...welcome,
            followUps: getAssistantPromptSuggestions(user, context).slice(0, 4),
            assistantContext: {
                ...context
            }
        };
    }

    const allowedKeys = new Set(getAllowedIntentKeys(user));
    const intentKey = request.intentKey || getIntentKeyFromId(intent.id);

    if (!allowedKeys.has(intentKey)) {
        return {
            type: "assistant",
            title: "Access Restricted",
            summary: `Your role does not currently allow ${intent.label.toLowerCase()} in Moneta Assistant.`,
            bullets: [
                "The assistant inherits Moneta role restrictions instead of bypassing them.",
                "Try one of the allowed report areas listed below."
            ],
            followUps: getAssistantPromptSuggestions(user, context).slice(0, 4),
            assistantContext: {
                ...context
            }
        };
    }

    const response = await intent.run(user, trimmedQuery, { rangeSpec: request.rangeSpec, context });
    const responseBullets = [...(response.bullets || [])];

    if (request.reusedPriorIntent) {
        responseBullets.unshift(`I treated this as a follow-up to ${intent.label}.`);
    }

    if (request.reusedPriorRange && request.rangeSpec?.rangeLabel) {
        responseBullets.unshift(`I reused your previous time window: ${normalizeRangeLabel(request.rangeSpec.rangeLabel)}.`);
    }

    const nextContext = {
        lastIntentKey: intentKey,
        lastIntentLabel: intent.label,
        lastRangeSpec: cloneRangeSpec(request.rangeSpec),
        lastFollowUps: dedupeStrings(response.followUps || [])
    };

    return {
        type: "assistant",
        ...response,
        bullets: responseBullets,
        followUps: dedupeStrings(response.followUps || getAssistantPromptSuggestions(user, nextContext)).slice(0, 4),
        assistantContext: nextContext
    };
}
