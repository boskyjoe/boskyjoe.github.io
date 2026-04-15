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

function formatPercent(value) {
    return `${Number(Number(value) || 0).toFixed(2)}%`;
}

function makeMetric(label, value, tone = "neutral") {
    return { label, value, tone };
}

function makeSourceMeta(result, reportData, windowLabelOverride = "") {
    return {
        sourceLabel: result?.source === "cache" ? "Cached Snapshot" : "Live Data",
        preparedAt: formatDateTime(reportData?.generatedAt || result?.loadedAt),
        windowLabel: windowLabelOverride || reportData?.rangeLabel || (reportData?.asOfDate ? `As of ${formatDateLabel(reportData.asOfDate)}` : "-")
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

function resolveRangeSpecFromQuery(query, defaultRangeKey = "30d") {
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

    return resolveCashFlowRangeSpec({ rangeKey: defaultRangeKey });
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
        async run(user, query) {
            const rangeSpec = resolveRangeSpecFromQuery(query, "30d");
            const result = await getCashFlowSummaryReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData, reportData.rangeLabel);

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
                    `Retail cash is split between Tasty Treats and Church Store.`,
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
        async run(user, query) {
            const rangeSpec = resolveRangeSpecFromQuery(query, "ytd");
            const result = await getProfitAndLossReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData, reportData.rangeLabel);

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
                    `This P&L includes both direct retail and consignment channels.`,
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
        async run(user, query) {
            const rangeSpec = resolveRangeSpecFromQuery(query, "30d");
            const result = await getSalesSummaryReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const meta = makeSourceMeta(result, reportData, reportData.rangeLabel);

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
                    `This is a cross-channel view covering Tasty Treats, Church Store, and Consignment.`,
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
        async run(user, query) {
            const rangeSpec = resolveRangeSpecFromQuery(query, "30d");
            const result = await getStorePerformanceReport(user, rangeSpec);
            const reportData = result.data;
            const summary = reportData.summary || {};
            const topRow = (reportData.storeRows || [])[0] || null;
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
        async run(user, query) {
            const rangeSpec = resolveRangeSpecFromQuery(query, "30d");
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
                    `${summary.teamCount || 0} teams or members were active in the selected window.`
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
    }
};

const ROLE_VISIBLE_INTENTS = {
    admin: ["cashFlow", "receivables", "payables", "profitAndLoss", "salesSummary", "storePerformance", "consignmentPerformance", "inventoryStatus", "inventoryValuation"],
    finance: ["cashFlow", "receivables", "payables", "profitAndLoss", "salesSummary", "storePerformance", "consignmentPerformance", "inventoryStatus", "inventoryValuation"],
    sales_staff: ["salesSummary", "storePerformance", "consignmentPerformance"],
    inventory_manager: ["payables", "consignmentPerformance", "inventoryStatus", "inventoryValuation"],
    team_lead: [],
    guest: []
};

function getAllowedIntentKeys(user) {
    return ROLE_VISIBLE_INTENTS[user?.role] || [];
}

function getIntentByQuery(query = "") {
    const normalized = normalizeQuery(query);

    if (!normalized || /\bhelp\b|\bwhat can you do\b|\bcapabilit(y|ies)\b|\bavailable\b/.test(normalized)) {
        return ASSISTANT_INTENTS.help;
    }

    if (/\bcash ?flow\b|\bcash movement\b|\bnet cash\b|\bdonation cash\b|\bsupplier cash\b/.test(normalized)) {
        return ASSISTANT_INTENTS.cashFlow;
    }

    if (/\breceivable\b|\boutstanding receivable\b|\bcustomer balance\b|\bopen receivable\b/.test(normalized)) {
        return ASSISTANT_INTENTS.receivables;
    }

    if (/\bpayable\b|\bpurchase payable\b|\bsupplier balance\b|\bowe suppliers\b|\bopen payables\b|\bsupplier exposure\b/.test(normalized)) {
        return ASSISTANT_INTENTS.payables;
    }

    if (/\bp&l\b|\bp and l\b|\bprofit and loss\b|\bnet profit\b|\bgross profit\b|\boperating profit\b/.test(normalized)) {
        return ASSISTANT_INTENTS.profitAndLoss;
    }

    if (/\binventory valuation\b|\bvaluation\b|\bpotential margin\b|\binventory at cost\b|\binventory at retail\b|\bweighted cost\b/.test(normalized)) {
        return ASSISTANT_INTENTS.inventoryValuation;
    }

    if (/\binventory status\b|\blow stock\b|\bout of stock\b|\bstock health\b|\bstock alerts?\b/.test(normalized)) {
        return ASSISTANT_INTENTS.inventoryStatus;
    }

    if (/\bconsignment\b/.test(normalized)) {
        return ASSISTANT_INTENTS.consignmentPerformance;
    }

    if (/\bdirect store\b|\bstore performance\b|\btasty treats\b|\bchurch store\b|\btop store\b/.test(normalized)) {
        return ASSISTANT_INTENTS.storePerformance;
    }

    if (/\bsales\b|\brevenue\b|\bdirect sales\b/.test(normalized)) {
        return ASSISTANT_INTENTS.salesSummary;
    }

    return null;
}

export function getAssistantCapabilities(user) {
    const allowedKeys = getAllowedIntentKeys(user);
    return allowedKeys.map(key => ASSISTANT_INTENTS[key]).filter(Boolean);
}

export function getAssistantPromptSuggestions(user) {
    const role = user?.role || "guest";
    const helpPrompts = ASSISTANT_INTENTS.help.defaultPrompts[role] || ASSISTANT_INTENTS.help.defaultPrompts.guest;
    const intentPrompts = getAllowedIntentKeys(user)
        .flatMap(key => ASSISTANT_INTENTS[key]?.prompts || [])
        .slice(0, 6);

    return [...helpPrompts, ...intentPrompts].filter(Boolean).slice(0, 8);
}

export function buildAssistantWelcome(user) {
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
        summary: `You are signed in as ${user.role}. I can answer role-safe questions using Moneta's existing report logic.`,
        bullets: [
            `Available data lanes: ${capabilityLabels.join(", ")}.`,
            "Try natural prompts like “Show cash flow for the last 30 days” or “What products are low stock?”."
        ]
    };
}

export async function askMonetaAssistant(user, query) {
    const trimmedQuery = normalizeText(query);

    if (!trimmedQuery) {
        throw new Error("Enter a question for the assistant.");
    }

    const intent = getIntentByQuery(trimmedQuery);

    if (!intent) {
        return {
            type: "assistant",
            title: "I Need A More Specific Question",
            summary: "I can answer report-style questions about finance, sales, inventory, and consignment, but I couldn't map that request safely.",
            bullets: [
                "Try naming the business area you want, like cash flow, sales summary, direct store performance, inventory status, or P&L.",
                "You can also include a window like last 30 days, last 90 days, YTD, or exact dates like 2026-01-01 to 2026-03-31."
            ],
            followUps: getAssistantPromptSuggestions(user).slice(0, 4)
        };
    }

    if (intent.id === "help") {
        const welcome = buildAssistantWelcome(user);
        return {
            type: "assistant",
            ...welcome,
            followUps: getAssistantPromptSuggestions(user).slice(0, 4)
        };
    }

    const allowedKeys = new Set(getAllowedIntentKeys(user));
    const intentKey = Object.entries(ASSISTANT_INTENTS).find(([, value]) => value.id === intent.id)?.[0] || "";

    if (!allowedKeys.has(intentKey)) {
        return {
            type: "assistant",
            title: "Access Restricted",
            summary: `Your role does not currently allow ${intent.label.toLowerCase()} in Moneta Assistant.`,
            bullets: [
                "The assistant inherits Moneta role restrictions instead of bypassing them.",
                "Try one of the allowed report areas listed below."
            ],
            followUps: getAssistantPromptSuggestions(user).slice(0, 4)
        };
    }

    return {
        type: "assistant",
        ...(await intent.run(user, trimmedQuery))
    };
}
