import { getState } from "../../app/store.js";
import { icons } from "../../shared/icons.js";
import { showToast } from "../../shared/toast.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import {
    CASH_FLOW_RANGE_OPTIONS,
    getConsignmentPerformanceReport,
    formatAccountingCurrency,
    formatDateLabel,
    formatDateTime,
    formatSignedCurrency,
    formatUtcDateTime,
    getCashFlowSummaryReport,
    getDefaultCashFlowCustomRange,
    getInventoryStatusReport,
    getInventoryValuationReport,
    getLeadConversionReport,
    getProductPerformanceReport,
    getReorderRecommendationsReport,
    getOutstandingReceivablesReport,
    getProfitAndLossReport,
    getPurchasePayablesReport,
    getSalesTrendReport,
    getSalesSummaryReport,
    getStorePerformanceReport,
    resolveCashFlowRangeSpec
} from "./service.js";

const REPORT_GROUPS = [
    {
        key: "sales",
        title: "Sales Reports",
        description: "Commercial performance, channel collections, direct-store comparison, and conversion tracking.",
        icon: icons.retail,
        badge: "Sales",
        reports: [
            {
                id: "sales-summary",
                title: "Sales Summary",
                description: "Cross-channel sales summary for Tasty Treats, Church Store, and Consignment.",
                dataSource: "salesInvoices, consignmentOrdersV2",
                roles: ["admin", "sales_staff", "finance"],
                status: "priority",
                implemented: true
            },
            {
                id: "store-performance",
                title: "Direct Store Performance",
                description: "Direct-store comparison for Church Store versus Tasty Treats with revenue and collection performance.",
                dataSource: "salesInvoices",
                roles: ["admin", "sales_staff", "finance"],
                status: "priority",
                implemented: true
            },
            {
                id: "sales-trend",
                title: "Sales Trend",
                description: "Daily and weekly movement view with period-over-period growth and slowdown indicators.",
                dataSource: "salesInvoices, consignmentOrdersV2",
                roles: ["admin", "sales_staff", "finance"],
                status: "priority",
                implemented: true
            },
            {
                id: "lead-conversion",
                title: "Lead Conversion",
                description: "Open, qualified, ready-to-convert, converted, and sale-voided conversion outcome reporting.",
                dataSource: "leads, salesInvoices",
                roles: ["admin", "sales_staff", "team_lead"],
                status: "priority",
                implemented: true
            },
            {
                id: "consignment-performance",
                title: "Consignment Performance",
                description: "Distributor-channel view of checked out, sold, returned, damaged, gifted, collected, and balance-due activity.",
                dataSource: "consignmentOrdersV2",
                roles: ["admin", "inventory_manager", "finance", "sales_staff"],
                status: "priority",
                implemented: true
            }
        ]
    },
    {
        key: "inventory",
        title: "Inventory Reports",
        description: "Stock health, valuation, product movement, and reorder planning for inventory control.",
        icon: icons.products,
        badge: "Inventory",
        reports: [
            {
                id: "inventory-status",
                title: "Inventory Status",
                description: "Out-of-stock, low-stock, medium, and healthy stock analysis with alert detail.",
                dataSource: "productCatalogue, productCategories",
                roles: ["admin", "inventory_manager", "finance"],
                status: "priority",
                implemented: true
            },
            {
                id: "inventory-valuation",
                title: "Inventory Valuation",
                description: "Inventory at cost, selling value, and potential gross margin using current stock on hand.",
                dataSource: "productCatalogue, purchaseInvoices",
                roles: ["admin", "inventory_manager", "finance"],
                status: "priority",
                implemented: true
            },
            {
                id: "product-performance",
                title: "Product Performance",
                description: "Top and slow-moving products by quantity sold, revenue contribution, and stock exposure.",
                dataSource: "productCatalogue, salesInvoices, consignmentOrdersV2",
                roles: ["admin", "inventory_manager", "finance", "sales_staff"],
                status: "priority",
                implemented: true
            },
            {
                id: "reorder-recommendations",
                title: "Reorder Recommendations",
                description: "Suggested replenishment list based on threshold risk, stock depth, and operational urgency.",
                dataSource: "productCatalogue, salesInvoices, consignmentOrdersV2, reorderPolicies",
                roles: ["admin", "inventory_manager", "finance"],
                status: "priority",
                implemented: true
            }
        ]
    },
    {
        key: "finance",
        title: "Finance Reports",
        description: "Cash, receivables, supplier obligations, and profit reporting for controlled financial review.",
        icon: icons.payment,
        badge: "Finance",
        reports: [
            {
                id: "cash-flow-summary",
                title: "Cash Flow Summary",
                description: "Auditable net cash movement across retail receipts, consignment receipts, donations, and supplier payments.",
                dataSource: "salesPaymentsLedger, supplierPaymentsLedger, consignmentPaymentsLedger, donations",
                roles: ["admin", "finance"],
                status: "priority",
                implemented: true
            },
            {
                id: "outstanding-receivables",
                title: "Outstanding Receivables",
                description: "All unpaid direct-sales and consignment balances grouped by age and collection priority.",
                dataSource: "salesInvoices, consignmentOrdersV2",
                roles: ["admin", "finance"],
                status: "priority",
                implemented: true
            },
            {
                id: "purchase-payables",
                title: "Purchase Payables",
                description: "Supplier invoice totals, paid amount, overdue balances, and pending obligations by supplier.",
                dataSource: "purchaseInvoices, supplierPaymentsLedger, suppliers",
                roles: ["admin", "finance", "inventory_manager"],
                status: "priority",
                implemented: true
            },
            {
                id: "profit-and-loss",
                title: "Profit and Loss",
                description: "Professional statement-style P&L covering both retail sales and consignment sales.",
                dataSource: "salesInvoices, consignmentOrdersV2, purchaseInvoices, donations",
                roles: ["admin", "finance"],
                status: "priority",
                implemented: true
            }
        ]
    }
];

const featureState = {
    userKey: "",
    activeGroupKey: "",
    activeReportId: "",
    selectedRangeKey: "30d",
    customFrom: "",
    customTo: "",
    isLoading: false,
    source: "live",
    loadedAt: 0,
    expiresAt: 0,
    errorMessage: "",
    requestToken: 0,
    reportData: null,
    activitySearchTerm: "",
    activityGridApi: null,
    activityGridElement: null
};

function normalizeText(value) {
    return (value || "").trim();
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function formatRoleLabel(role) {
    const labels = {
        admin: "Admin",
        inventory_manager: "Inventory Manager",
        sales_staff: "Sales Staff",
        finance: "Finance",
        team_lead: "Team Lead",
        guest: "Guest"
    };

    return labels[role] || "User";
}

function canAccessReport(report, user) {
    return Boolean(user && report.roles.includes(user.role));
}

function getVisibleReportGroups(user) {
    return REPORT_GROUPS
        .map(group => ({
            ...group,
            reports: group.reports.filter(report => canAccessReport(report, user))
        }))
        .filter(group => group.reports.length > 0);
}

function findReportDefinition(reportId = "") {
    for (const group of REPORT_GROUPS) {
        const report = group.reports.find(entry => entry.id === reportId);
        if (report) {
            return {
                ...report,
                groupKey: group.key,
                groupTitle: group.title
            };
        }
    }

    return null;
}

function getStatusLabel(status) {
    return status === "priority" ? "Priority" : "Planned";
}

function resetReportsStateForUser(user) {
    const nextUserKey = normalizeText(user?.uid || user?.email || "");
    if (featureState.userKey === nextUserKey) return;

    destroyActivityGrid();

    const defaults = getDefaultCashFlowCustomRange();
    featureState.userKey = nextUserKey;
    featureState.activeGroupKey = "";
    featureState.activeReportId = "";
    featureState.selectedRangeKey = "30d";
    featureState.customFrom = defaults.from;
    featureState.customTo = defaults.to;
    featureState.isLoading = false;
    featureState.source = "live";
    featureState.loadedAt = 0;
    featureState.expiresAt = 0;
    featureState.errorMessage = "";
    featureState.requestToken = 0;
    featureState.reportData = null;
    featureState.activitySearchTerm = "";
}

function buildRangeButtonsMarkup() {
    return CASH_FLOW_RANGE_OPTIONS.map(option => {
        const isActive = featureState.selectedRangeKey === option.key;
        return `
            <button
                class="button dashboard-window-button ${isActive ? "is-active" : ""}"
                type="button"
                data-range-key="${option.key}"
                ${featureState.isLoading ? "disabled" : ""}>
                ${option.label}
            </button>
        `;
    }).join("");
}

function reportUsesRange(reportId = "") {
    return ["cash-flow-summary", "profit-and-loss", "sales-summary", "sales-trend", "lead-conversion", "store-performance", "consignment-performance", "product-performance"].includes(reportId);
}

function buildReportWindowLabel(reportDef, reportData, rangeSpec) {
    if (["outstanding-receivables", "purchase-payables", "inventory-status", "inventory-valuation", "reorder-recommendations"].includes(reportDef?.id)) {
        return reportData?.asOfDate ? `As Of ${formatDateLabel(reportData.asOfDate)}` : "As Of Today";
    }

    return reportData?.rangeLabel || (rangeSpec?.isValid ? rangeSpec.rangeLabel : "Invalid Range");
}

function renderReportCard(report) {
    const actionLabel = report.implemented ? "Open Report" : "Planned Next";

    return `
        <article class="report-definition-card ${report.implemented ? "is-actionable" : ""}">
            <div class="report-definition-head">
                <h4>${report.title}</h4>
                <span class="report-definition-status tone-${report.status}">${getStatusLabel(report.status)}</span>
            </div>
            <p>${report.description}</p>
            <div class="report-definition-meta">
                <span><strong>Data source:</strong> ${report.dataSource}</span>
                <span><strong>Access:</strong> ${report.roles.map(formatRoleLabel).join(", ")}</span>
            </div>
            <div class="report-definition-actions">
                <button
                    class="button ${report.implemented ? "button-primary-alt" : "button-secondary"} report-definition-button"
                    type="button"
                    data-report-open="${report.id}">
                    ${actionLabel}
                </button>
            </div>
        </article>
    `;
}

function renderReportGroup(group) {
    return `
        <section class="panel-card reports-group-card">
            <div class="reports-group-head">
                <div class="reports-group-title">
                    <span class="panel-icon panel-icon-alt">${group.icon}</span>
                    <div>
                        <h3>${group.title}</h3>
                        <p>${group.description}</p>
                    </div>
                </div>
                <span class="status-pill">${group.badge}: ${group.reports.length} report${group.reports.length === 1 ? "" : "s"}</span>
            </div>
            <div class="reports-group-grid">
                ${group.reports.map(renderReportCard).join("")}
            </div>
        </section>
    `;
}

function renderReportsHub(user) {
    const visibleGroups = getVisibleReportGroups(user);
    const groupNames = visibleGroups.map(group => group.badge);
    const liveReportCount = visibleGroups.reduce(
        (sum, group) => sum + group.reports.filter(report => report.implemented).length,
        0
    );

    return `
        <div class="reports-shell">
            <section class="panel-card reports-header-card">
                <div class="reports-header-copy">
                    <p class="hero-kicker">Reporting Hub</p>
                    <h2 class="hero-title">Reports</h2>
                    <p>Use this module to organize report access by business area. The grouped list below is role-aware so each user only sees the reporting lanes relevant to their work.</p>
                </div>
                <div class="reports-access-strip">
                    <span class="status-pill">Role: ${formatRoleLabel(user.role)}</span>
                    <span class="status-pill">Visible Groups: ${groupNames.join(", ") || "None"}</span>
                    <span class="status-pill">Live Reports: ${liveReportCount}</span>
                </div>
            </section>

            ${visibleGroups.length
                ? visibleGroups.map(renderReportGroup).join("")
                : `
                    <section class="panel-card reports-empty-card">
                        No report groups are available for your current role yet.
                    </section>
                `}
        </div>
    `;
}

function renderCashFlowSummaryCards(reportData = null) {
    const summary = reportData?.summary || {
        retailByStore: {
            tastyTreats: 0,
            churchStore: 0,
            other: 0
        },
        retailNet: 0,
        consignmentNet: 0,
        donationNet: 0,
        supplierNet: 0,
        netCashMovement: 0
    };

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Tasty Treats Net Cash</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.retailByStore.tastyTreats)}</p>
                <p class="dashboard-kpi-meta">Receipts less reversals for Tasty Treats</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Church Store Net Cash</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.retailByStore.churchStore)}</p>
                <p class="dashboard-kpi-meta">Receipts less reversals for Church Store</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Consignment Net Cash</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.consignmentNet)}</p>
                <p class="dashboard-kpi-meta">Settlements collected less reversals</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Donation Net Cash</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.donationNet)}</p>
                <p class="dashboard-kpi-meta">Donation inflows after reversals</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Supplier Cash Outflow</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.supplierNet)}</p>
                <p class="dashboard-kpi-meta">Supplier payments net of reversals</p>
            </article>
            <article class="dashboard-kpi-card ${summary.netCashMovement >= 0 ? "tone-success" : "tone-danger"}">
                <p class="dashboard-kpi-title">Net Cash Movement</p>
                <p class="dashboard-kpi-value">${formatSignedCurrency(summary.netCashMovement)}</p>
                <p class="dashboard-kpi-meta">Net inflow for the selected period</p>
            </article>
        </section>
    `;
}

function getAccountingAmountClass(value) {
    if ((Number(value) || 0) < 0) return "reports-amount-negative";
    if ((Number(value) || 0) > 0) return "reports-amount-positive";
    return "";
}

function formatPercent(value) {
    return `${roundCurrency(value)}%`;
}

function formatGrowthPercent(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return "New Activity";
    }

    const amount = roundCurrency(value);
    return `${amount > 0 ? "+" : ""}${amount}%`;
}

function renderSalesSummaryCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Total Sales Revenue</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.netSales || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.transactionCount || 0} direct and consignment transactions</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Direct Sales</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.directNetSales || 0)}</p>
                <p class="dashboard-kpi-meta">Tasty Treats plus Church Store net sales</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Consignment Sales</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.consignmentNetSales || 0)}</p>
                <p class="dashboard-kpi-meta">Distributor-channel sold value for the period</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Outstanding Balance</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.balanceDue || 0)}</p>
                <p class="dashboard-kpi-meta">Unsettled balance across all sales channels</p>
            </article>
        </section>
    `;
}

function renderSalesSummaryStatementSection(reportData = null) {
    const rows = reportData?.statementRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Sales Summary Statement</h3>
                    <p>Cross-channel revenue, settlement, and outstanding-balance view for direct stores and consignment.</p>
                </div>
                <span class="status-pill">${rows.length} line${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Line Item</th>
                            <th class="reports-align-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr class="${row.tone === "total" ? "reports-row-total" : ""}">
                                <td>${row.section}</td>
                                <td>${row.label}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.amount)}">${formatAccountingCurrency(row.amount)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="3" class="reports-table-empty">No sales summary rows are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderSalesSummaryStoreSection(reportData = null) {
    const rows = reportData?.channelRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Channel Summary</h3>
                    <p>Collections, donations, expenses, and balance due compared across direct stores and consignment.</p>
                </div>
                <span class="status-pill">${rows.length} channel${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Channel</th>
                            <th class="reports-align-right">Transactions</th>
                            <th class="reports-align-right">Net Sales</th>
                            <th class="reports-align-right">Collections</th>
                            <th class="reports-align-right">Donations</th>
                            <th class="reports-align-right">Expenses</th>
                            <th class="reports-align-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.channel}</td>
                                <td class="reports-align-right">${row.transactionCount}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.netSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.collections)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.donations)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency((Number(row.expenses) || 0) * -1)}</td>
                                <td class="reports-align-right reports-amount-negative">${formatAccountingCurrency((Number(row.balanceDue) || 0) * -1)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="7" class="reports-table-empty">No channel summary is available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderSalesSummaryDetailSection(reportData = null) {
    const rows = reportData?.detailRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Recent Sales Detail</h3>
                    <p>Latest in-range direct and consignment transactions for quick validation and follow-up.</p>
                </div>
                <span class="status-pill">${rows.length} row${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Channel</th>
                            <th>Reference</th>
                            <th>Counterparty</th>
                            <th class="reports-align-right">Qty</th>
                            <th class="reports-align-right">Net Sales</th>
                            <th class="reports-align-right">Paid</th>
                            <th class="reports-align-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${formatDateLabel(row.transactionDate)}</td>
                                <td>${row.channel || row.store || "-"}</td>
                                <td>${row.reference || "-"}</td>
                                <td>${row.customerName || "-"}</td>
                                <td class="reports-align-right">${row.totalQuantity || 0}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.netSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.collections)}</td>
                                <td class="reports-align-right reports-amount-negative">${formatAccountingCurrency((Number(row.balanceDue) || 0) * -1)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="8" class="reports-table-empty">No sales detail rows are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderSalesSummaryMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Sales summary combines direct retail invoices and consignment orders inside the selected report window.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">Prepared At</p>
                    <p class="report-audit-value">${reportData ? formatDateTime(reportData.generatedAt) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Window</p>
                    <p class="report-audit-value">${reportData?.rangeLabel || "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Transactions</p>
                    <p class="report-audit-value">${reportData?.summary?.transactionCount || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Sales invoices ${sourceCounts.salesInvoices || 0},
                Consignment orders ${sourceCounts.consignmentOrders || 0}.
            </div>
        </section>
    `;
}

function renderSalesTrendCards(reportData = null) {
    const summary = reportData?.summary || {};
    const growthTone = summary.growthAmount > 0
        ? "tone-success"
        : summary.growthAmount < 0
            ? "tone-danger"
            : "tone-primary";

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Net Sales</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.totalNetSales || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.transactionCount || 0} transactions in the active window</p>
            </article>
            <article class="dashboard-kpi-card ${growthTone}">
                <p class="dashboard-kpi-title">Vs Prior Window</p>
                <p class="dashboard-kpi-value">${formatGrowthPercent(summary.periodGrowthPercent)}</p>
                <p class="dashboard-kpi-meta">${formatSignedCurrency(summary.growthAmount || 0)} against ${formatCurrency(summary.previousNetSales || 0)}</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Average Daily Sales</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.averageDailySales || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.activeDays || 0} active day${summary.activeDays === 1 ? "" : "s"} in range</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Best Sales Day</p>
                <p class="dashboard-kpi-value">${summary.topDayLabel || "-"}</p>
                <p class="dashboard-kpi-meta">${formatCurrency(summary.topDayNetSales || 0)} net sales</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Strongest Channel</p>
                <p class="dashboard-kpi-value">${summary.strongestChannelName || "-"}</p>
                <p class="dashboard-kpi-meta">${formatCurrency(summary.strongestChannelNetSales || 0)} in the active window</p>
            </article>
        </section>
    `;
}

function renderSalesTrendDailySection(reportData = null) {
    const rows = reportData?.dailyRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Daily Movement</h3>
                    <p>Chronological daily sales movement across direct retail and consignment for the selected range.</p>
                </div>
                <span class="status-pill">${rows.length} day${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th class="reports-align-right">Transactions</th>
                            <th class="reports-align-right">Net Sales</th>
                            <th class="reports-align-right">Direct</th>
                            <th class="reports-align-right">Consignment</th>
                            <th class="reports-align-right">Average Sale</th>
                            <th class="reports-align-right">Vs Previous Day</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.label}</td>
                                <td>${row.dayName}</td>
                                <td class="reports-align-right">${row.transactionCount}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.totalNetSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.directNetSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.consignmentNetSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.averageSale)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.changeFromPreviousDay)}">${!row.hasPriorDay ? "Baseline" : `${formatSignedCurrency(row.changeFromPreviousDay)} (${formatGrowthPercent(row.changePercentFromPreviousDay)})`}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="8" class="reports-table-empty">No daily sales movement is available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderSalesTrendWeeklySection(reportData = null) {
    const rows = reportData?.weeklyRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Weekly Momentum</h3>
                    <p>Week-by-week rollup to spot acceleration, slowdown, and broader sales shape inside the current window.</p>
                </div>
                <span class="status-pill">${rows.length} week${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Week</th>
                            <th class="reports-align-right">Transactions</th>
                            <th class="reports-align-right">Net Sales</th>
                            <th class="reports-align-right">Direct</th>
                            <th class="reports-align-right">Consignment</th>
                            <th class="reports-align-right">Average Daily</th>
                            <th class="reports-align-right">Vs Previous Week</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.weekLabel}</td>
                                <td class="reports-align-right">${row.transactionCount}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.totalNetSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.directNetSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.consignmentNetSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.averageDailySales)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.changeFromPreviousWeek)}">${!row.hasPriorWeek ? "Baseline" : `${formatSignedCurrency(row.changeFromPreviousWeek)} (${formatGrowthPercent(row.changePercentFromPreviousWeek)})`}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="7" class="reports-table-empty">No weekly sales trend is available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderSalesTrendChannelSection(reportData = null) {
    const rows = reportData?.channelRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Channel Momentum</h3>
                    <p>Current-window performance compared with the immediately preceding window of the same length.</p>
                </div>
                <span class="status-pill">${rows.length} channel${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Channel</th>
                            <th class="reports-align-right">Current Window</th>
                            <th class="reports-align-right">Prior Window</th>
                            <th class="reports-align-right">Change</th>
                            <th class="reports-align-right">Growth</th>
                            <th class="reports-align-right">Transactions</th>
                            <th class="reports-align-right">Average Sale</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.channel}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.currentNetSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.previousNetSales)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.changeAmount)}">${formatSignedCurrency(row.changeAmount)}</td>
                                <td class="reports-align-right">${formatGrowthPercent(row.changePercent)}</td>
                                <td class="reports-align-right">${row.transactionCount}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.averageSale)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="7" class="reports-table-empty">No channel comparison is available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderSalesTrendMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Sales Trend uses the active reporting window plus the immediately preceding window of equal length for comparison.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">Prepared At</p>
                    <p class="report-audit-value">${reportData ? formatDateTime(reportData.generatedAt) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Window</p>
                    <p class="report-audit-value">${reportData?.rangeLabel || "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Compare Window</p>
                    <p class="report-audit-value">${reportData?.compareRangeLabel || "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Current retail sales ${sourceCounts.currentSalesInvoices || 0},
                Current consignment orders ${sourceCounts.currentConsignmentOrders || 0},
                Prior retail sales ${sourceCounts.comparisonSalesInvoices || 0},
                Prior consignment orders ${sourceCounts.comparisonConsignmentOrders || 0}.
            </div>
            ${(metadata.notes || []).length ? `
                <div class="reports-audit-note">
                    ${(metadata.notes || []).map(note => `- ${note}`).join("<br>")}
                </div>
            ` : ""}
        </section>
    `;
}

function renderLeadConversionCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Enquiries In Window</p>
                <p class="dashboard-kpi-value">${summary.leadCount || 0}</p>
                <p class="dashboard-kpi-meta">${formatCurrency(summary.readyPipelineValue || 0)} estimated ready pipeline value</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Ready To Convert</p>
                <p class="dashboard-kpi-value">${summary.readyToConvertCount || 0}</p>
                <p class="dashboard-kpi-meta">${formatCurrency(summary.acceptedQuotePipelineValue || 0)} accepted quote value still open</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Converted Active</p>
                <p class="dashboard-kpi-value">${summary.convertedActiveCount || 0}</p>
                <p class="dashboard-kpi-meta">${formatPercent(summary.activeConversionRate || 0)} active conversion rate</p>
            </article>
            <article class="dashboard-kpi-card tone-danger">
                <p class="dashboard-kpi-title">Sale Voided</p>
                <p class="dashboard-kpi-value">${summary.convertedVoidedCount || 0}</p>
                <p class="dashboard-kpi-meta">Converted leads whose linked sale was later voided</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Closed Retail Value</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.convertedSalesValue || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.convertedSalesCount || 0} linked retail sale${summary.convertedSalesCount === 1 ? "" : "s"} in this window</p>
            </article>
        </section>
    `;
}

function renderLeadConversionStageSection(reportData = null) {
    const rows = reportData?.stageRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Conversion Funnel</h3>
                    <p>Enquiries grouped into operational stages using current lead state, quote readiness, and converted-sale outcome.</p>
                </div>
                <span class="status-pill">${rows.length} stage${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Stage</th>
                            <th class="reports-align-right">Enquiries</th>
                            <th class="reports-align-right">Share</th>
                            <th class="reports-align-right">Est. Value</th>
                            <th class="reports-align-right">Accepted Quote Value</th>
                            <th class="reports-align-right">Average Est. Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.stage}</td>
                                <td class="reports-align-right">${row.count || 0}</td>
                                <td class="reports-align-right">${formatPercent(row.sharePercent || 0)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.requestedValue || 0)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.acceptedQuoteValue || 0)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.averageRequestedValue || 0)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="6" class="reports-table-empty">No lead conversion stages are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderLeadConversionSourceSection(reportData = null) {
    const rows = reportData?.sourceRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Lead Source Mix</h3>
                    <p>Lead source comparison for readiness, active conversions, sale-voided outcomes, and estimated enquiry value.</p>
                </div>
                <span class="status-pill">${rows.length} source${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Source</th>
                            <th class="reports-align-right">Enquiries</th>
                            <th class="reports-align-right">Ready</th>
                            <th class="reports-align-right">Converted</th>
                            <th class="reports-align-right">Sale Voided</th>
                            <th class="reports-align-right">Conversion Rate</th>
                            <th class="reports-align-right">Est. Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.leadSource}</td>
                                <td class="reports-align-right">${row.leadCount || 0}</td>
                                <td class="reports-align-right">${row.readyCount || 0}</td>
                                <td class="reports-align-right">${row.convertedActiveCount || 0}</td>
                                <td class="reports-align-right">${row.convertedVoidedCount || 0}</td>
                                <td class="reports-align-right">${formatPercent(row.conversionRate || 0)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.requestedValue || 0)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="7" class="reports-table-empty">No lead source rows are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderLeadConversionStoreSection(reportData = null) {
    const rows = reportData?.storeRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Retail Conversion Outcomes</h3>
                    <p>Retail sales linked from leads and closed in the selected window, grouped by store.</p>
                </div>
                <span class="status-pill">${rows.length} store${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Store</th>
                            <th class="reports-align-right">Sales</th>
                            <th class="reports-align-right">Active</th>
                            <th class="reports-align-right">Voided</th>
                            <th class="reports-align-right">Sales Value</th>
                            <th class="reports-align-right">Average Sale</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.store}</td>
                                <td class="reports-align-right">${row.saleCount || 0}</td>
                                <td class="reports-align-right">${row.activeSales || 0}</td>
                                <td class="reports-align-right">${row.voidedSales || 0}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.salesValue || 0)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.averageSale || 0)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="6" class="reports-table-empty">No linked retail conversions closed in this window.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderLeadConversionDetailSection(reportData = null) {
    const rows = reportData?.detailRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Recent Enquiry Detail</h3>
                    <p>Latest enquiries in range with source, stage, quote context, and linked retail conversion reference.</p>
                </div>
                <span class="status-pill">${rows.length} row${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Enquiry Date</th>
                            <th>Lead</th>
                            <th>Customer</th>
                            <th>Source</th>
                            <th>Stage</th>
                            <th>Latest Quote</th>
                            <th class="reports-align-right">Est. Value</th>
                            <th>Retail Sale</th>
                            <th>Store</th>
                            <th class="reports-align-right">Sale Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${formatDateLabel(row.enquiryDate)}</td>
                                <td>${row.businessLeadId || "-"}</td>
                                <td>${row.customerName || "-"}</td>
                                <td>${row.leadSource || "-"}</td>
                                <td>${row.stage || "-"}</td>
                                <td>${row.latestQuoteLabel || "-"}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.requestedValue || 0)}</td>
                                <td>${row.convertedToSaleNumber || "-"}</td>
                                <td>${row.convertedStore || "-"}</td>
                                <td class="reports-align-right">${row.saleValue ? formatAccountingCurrency(row.saleValue) : "-"}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="10" class="reports-table-empty">No enquiry detail rows are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderLeadConversionMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");
    const notes = metadata.notes || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Lead conversion combines enquiry funnel status with linked Retail Store conversion outcomes inside the selected window.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">Prepared At</p>
                    <p class="report-audit-value">${reportData ? formatDateTime(reportData.generatedAt) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Window</p>
                    <p class="report-audit-value">${reportData?.rangeLabel || "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Execution Time</p>
                    <p class="report-audit-value">${reportData ? `${reportData.durationMs} ms` : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            ${notes.length ? `
                <div class="reports-audit-note">
                    ${notes.map(note => `<div>${note}</div>`).join("")}
                </div>
            ` : ""}
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Leads ${sourceCounts.leads || 0},
                Sales invoices ${sourceCounts.salesInvoices || 0}.
            </div>
        </section>
    `;
}

function renderStorePerformanceCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Total Net Sales</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.totalNetSales || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.totalTransactions || 0} transactions across retail stores</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Collections</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.totalCollections || 0)}</p>
                <p class="dashboard-kpi-meta">Collected against retail store sales</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Outstanding Balance</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.totalBalanceDue || 0)}</p>
                <p class="dashboard-kpi-meta">Open retail balance across both stores</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Top Store</p>
                <p class="dashboard-kpi-value">${summary.topStoreName || "-"}</p>
                <p class="dashboard-kpi-meta">${formatCurrency(summary.topStoreNetSales || 0)} net sales</p>
            </article>
        </section>
    `;
}

function renderLeadConversionReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData, { showRangeControls: true })}
            ${renderLeadConversionCards(reportData)}
            ${renderLeadConversionStageSection(reportData)}
            ${renderLeadConversionSourceSection(reportData)}
            ${renderLeadConversionStoreSection(reportData)}
            ${renderLeadConversionDetailSection(reportData)}
            ${renderLeadConversionMetadataSection(reportData)}
        </div>
    `;
}

function renderStorePerformanceTable(reportData = null) {
    const rows = reportData?.storeRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Store Comparison</h3>
                    <p>Operational direct-store comparison for sales, collections, donation support, and open balances.</p>
                </div>
                <span class="status-pill">${rows.length} store${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Store</th>
                            <th class="reports-align-right">Transactions</th>
                            <th class="reports-align-right">Qty Sold</th>
                            <th class="reports-align-right">Net Sales</th>
                            <th class="reports-align-right">Average Sale</th>
                            <th class="reports-align-right">Collections</th>
                            <th class="reports-align-right">Donations</th>
                            <th class="reports-align-right">Expenses</th>
                            <th class="reports-align-right">Net Contribution</th>
                            <th class="reports-align-right">Collection Rate</th>
                            <th class="reports-align-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.store}</td>
                                <td class="reports-align-right">${row.transactionCount}</td>
                                <td class="reports-align-right">${row.totalQuantity || 0}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.netSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.averageSale)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.collections)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.donations)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency((Number(row.expenses) || 0) * -1)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.netContribution)}">${formatAccountingCurrency(row.netContribution)}</td>
                                <td class="reports-align-right">${formatPercent(row.collectionRate)}</td>
                                <td class="reports-align-right reports-amount-negative">${formatAccountingCurrency((Number(row.balanceDue) || 0) * -1)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="11" class="reports-table-empty">No store performance rows are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderStorePerformanceMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Store performance compares direct retail activity between Tasty Treats and Church Store for the selected range.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">Prepared At</p>
                    <p class="report-audit-value">${reportData ? formatDateTime(reportData.generatedAt) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Window</p>
                    <p class="report-audit-value">${reportData?.rangeLabel || "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Stores Compared</p>
                    <p class="report-audit-value">${reportData?.storeRows?.length || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Sales invoices ${sourceCounts.salesInvoices || 0}.
            </div>
        </section>
    `;
}

function renderConsignmentPerformanceCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Sold Value</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.soldValue || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.orderCount || 0} consignment order${summary.orderCount === 1 ? "" : "s"} in range</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Collections</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.collections || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.teamCount || 0} teams or members active in the channel</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Balance Due</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.balanceDue || 0)}</p>
                <p class="dashboard-kpi-meta">Open balance still due from consignment activity</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Sell Through</p>
                <p class="dashboard-kpi-value">${formatPercent(summary.sellThroughRate || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.quantitySold || 0} sold from ${summary.quantityCheckedOut || 0} checked out</p>
            </article>
        </section>
    `;
}

function renderConsignmentPerformanceTeamSection(reportData = null) {
    const rows = reportData?.teamRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Team Performance</h3>
                    <p>Consignment activity grouped by team and member for distributor-channel follow-up.</p>
                </div>
                <span class="status-pill">${rows.length} team row${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Team</th>
                            <th>Member</th>
                            <th class="reports-align-right">Orders</th>
                            <th class="reports-align-right">Checked Out</th>
                            <th class="reports-align-right">Sold</th>
                            <th class="reports-align-right">Sell Through</th>
                            <th class="reports-align-right">Sold Value</th>
                            <th class="reports-align-right">Collected</th>
                            <th class="reports-align-right">Donations</th>
                            <th class="reports-align-right">Expenses</th>
                            <th class="reports-align-right">Net Contribution</th>
                            <th class="reports-align-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.teamName}</td>
                                <td>${row.memberName}</td>
                                <td class="reports-align-right">${row.orderCount}</td>
                                <td class="reports-align-right">${row.quantityCheckedOut}</td>
                                <td class="reports-align-right">${row.quantitySold}</td>
                                <td class="reports-align-right">${formatPercent(row.sellThroughRate)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.soldValue)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.collections)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.donations)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency((Number(row.expenses) || 0) * -1)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.netContribution)}">${formatAccountingCurrency(row.netContribution)}</td>
                                <td class="reports-align-right reports-amount-negative">${formatAccountingCurrency((Number(row.balanceDue) || 0) * -1)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="12" class="reports-table-empty">No consignment performance rows are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderConsignmentPerformanceDetailSection(reportData = null) {
    const rows = reportData?.detailRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Consignment Order Detail</h3>
                    <p>Order-level settlement, outcome, and exposure detail for the consignment channel.</p>
                </div>
                <span class="status-pill">${rows.length} order${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Reference</th>
                            <th>Team</th>
                            <th>Member</th>
                            <th class="reports-align-right">Sold</th>
                            <th class="reports-align-right">Returned</th>
                            <th class="reports-align-right">Damaged</th>
                            <th class="reports-align-right">Gifted</th>
                            <th class="reports-align-right">Sold Value</th>
                            <th class="reports-align-right">Collected</th>
                            <th class="reports-align-right">Donations</th>
                            <th class="reports-align-right">Expenses</th>
                            <th class="reports-align-right">Net Contribution</th>
                            <th class="reports-align-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${formatDateLabel(row.transactionDate)}</td>
                                <td>${row.reference || "-"}</td>
                                <td>${row.teamName || "-"}</td>
                                <td>${row.teamMemberName || "-"}</td>
                                <td class="reports-align-right">${row.quantitySold || 0}</td>
                                <td class="reports-align-right">${row.quantityReturned || 0}</td>
                                <td class="reports-align-right">${row.quantityDamaged || 0}</td>
                                <td class="reports-align-right">${row.quantityGifted || 0}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.valueSold || 0)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.collections || 0)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.donations || 0)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency((Number(row.expenses) || 0) * -1)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass((Number(row.collections) || 0) + (Number(row.donations) || 0) - (Number(row.expenses) || 0))}">${formatAccountingCurrency((Number(row.collections) || 0) + (Number(row.donations) || 0) - (Number(row.expenses) || 0))}</td>
                                <td class="reports-align-right reports-amount-negative">${formatAccountingCurrency((Number(row.balanceDue) || 0) * -1)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="14" class="reports-table-empty">No consignment orders are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderConsignmentPerformanceMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Consignment performance treats the channel as a distributor sales lane using checked-out stock and sold-value settlement.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">Prepared At</p>
                    <p class="report-audit-value">${reportData ? formatDateTime(reportData.generatedAt) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Window</p>
                    <p class="report-audit-value">${reportData?.rangeLabel || "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Orders</p>
                    <p class="report-audit-value">${reportData?.summary?.orderCount || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Consignment orders ${sourceCounts.consignmentOrders || 0}.
            </div>
        </section>
    `;
}

function renderInventoryStatusCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Active Products</p>
                <p class="dashboard-kpi-value">${summary.productCount || 0}</p>
                <p class="dashboard-kpi-meta">Products included in the current stock snapshot</p>
            </article>
            <article class="dashboard-kpi-card tone-danger">
                <p class="dashboard-kpi-title">Out Of Stock</p>
                <p class="dashboard-kpi-value">${summary.outOfStockCount || 0}</p>
                <p class="dashboard-kpi-meta">Products that need immediate replenishment</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Low Stock</p>
                <p class="dashboard-kpi-value">${summary.lowStockCount || 0}</p>
                <p class="dashboard-kpi-meta">Products below the current low-stock threshold</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Units On Hand</p>
                <p class="dashboard-kpi-value">${summary.totalUnits || 0}</p>
                <p class="dashboard-kpi-meta">Total counted units across active products</p>
            </article>
        </section>
    `;
}

function renderInventoryBucketSection(reportData = null) {
    const rows = reportData?.bucketRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Stock Health Summary</h3>
                    <p>Bucketed product counts and units for immediate stock-health review.</p>
                </div>
                <span class="status-pill">${rows.length} bucket${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Stock Status</th>
                            <th class="reports-align-right">Products</th>
                            <th class="reports-align-right">Units</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.label}</td>
                                <td class="reports-align-right">${row.count}</td>
                                <td class="reports-align-right">${row.units}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="3" class="reports-table-empty">No inventory bucket rows are available.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderInventoryAlertSection(reportData = null) {
    const rows = reportData?.alertRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Stock Alerts</h3>
                    <p>Out-of-stock and low-stock products that should be reviewed for replenishment.</p>
                </div>
                <span class="status-pill">${rows.length} alert${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th class="reports-align-right">Units</th>
                            <th class="reports-align-right">Unit Cost</th>
                            <th class="reports-align-right">Unit Sell</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.productName}</td>
                                <td>${row.categoryName}</td>
                                <td>${row.stockStatus}</td>
                                <td class="reports-align-right">${row.units}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.unitCost)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.unitSell)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="6" class="reports-table-empty">No stock alerts are currently open.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderInventoryStatusMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Inventory status is an as-of stock snapshot built from the current active product catalogue.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">As Of</p>
                    <p class="report-audit-value">${reportData ? formatDateLabel(reportData.asOfDate) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Products</p>
                    <p class="report-audit-value">${reportData?.summary?.productCount || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Execution Time</p>
                    <p class="report-audit-value">${reportData ? `${reportData.durationMs} ms` : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Products ${sourceCounts.products || 0},
                Categories ${sourceCounts.categories || 0}.
            </div>
        </section>
    `;
}

function renderInventoryValuationCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Inventory At Cost</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.totalCostValue || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.productCount || 0} active products valued at weighted cost</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Inventory At Retail</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.totalRetailValue || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.totalUnits || 0} units on hand</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Potential Margin</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.potentialMargin || 0)}</p>
                <p class="dashboard-kpi-meta">Retail value less weighted inventory cost</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Weighted Cost Coverage</p>
                <p class="dashboard-kpi-value">${summary.weightedCostingProducts || 0}</p>
                <p class="dashboard-kpi-meta">${summary.fallbackCostingProducts || 0} products using fallback cost</p>
            </article>
        </section>
    `;
}

function renderInventoryValuationCategorySection(reportData = null) {
    const rows = reportData?.categoryRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Category Valuation</h3>
                    <p>Inventory valuation rolled up by category using weighted purchase-history cost.</p>
                </div>
                <span class="status-pill">${rows.length} category${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th class="reports-align-right">Products</th>
                            <th class="reports-align-right">Units</th>
                            <th class="reports-align-right">Cost Value</th>
                            <th class="reports-align-right">Retail Value</th>
                            <th class="reports-align-right">Potential Margin</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.categoryName}</td>
                                <td class="reports-align-right">${row.productCount}</td>
                                <td class="reports-align-right">${row.totalUnits}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.costValue)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.retailValue)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.potentialMargin)}">${formatAccountingCurrency(row.potentialMargin)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="6" class="reports-table-empty">No category valuation rows are available.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderInventoryValuationDetailSection(reportData = null) {
    const rows = reportData?.detailRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Valuation Detail</h3>
                    <p>Highest-value products on hand based on weighted purchase cost and current sell price.</p>
                </div>
                <span class="status-pill">${rows.length} row${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th class="reports-align-right">Units</th>
                            <th class="reports-align-right">Unit Cost</th>
                            <th class="reports-align-right">Unit Sell</th>
                            <th class="reports-align-right">Cost Value</th>
                            <th class="reports-align-right">Retail Value</th>
                            <th class="reports-align-right">Potential Margin</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.productName}</td>
                                <td>${row.categoryName}</td>
                                <td class="reports-align-right">${row.units}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.unitCost)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.unitSell)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.costValue)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.retailValue)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.potentialMargin)}">${formatAccountingCurrency(row.potentialMargin)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="8" class="reports-table-empty">No inventory valuation detail is available.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderInventoryValuationMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Inventory valuation applies weighted purchase-history cost up to the report date, with product master fallback where history is missing.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">As Of</p>
                    <p class="report-audit-value">${reportData ? formatDateLabel(reportData.asOfDate) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Weighted Cost Products</p>
                    <p class="report-audit-value">${reportData?.summary?.weightedCostingProducts || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Fallback Cost Products</p>
                    <p class="report-audit-value">${reportData?.summary?.fallbackCostingProducts || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Products ${sourceCounts.products || 0},
                Categories ${sourceCounts.categories || 0},
                Purchase invoices ${sourceCounts.purchaseInvoices || 0}.
            </div>
        </section>
    `;
}

function renderReorderRecommendationsCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Products Reviewed</p>
                <p class="dashboard-kpi-value">${summary.productsReviewed || 0}</p>
                <p class="dashboard-kpi-meta">${summary.activePolicyCount || 0} active reorder polic${summary.activePolicyCount === 1 ? "y" : "ies"}</p>
            </article>
            <article class="dashboard-kpi-card tone-danger">
                <p class="dashboard-kpi-title">Critical Items</p>
                <p class="dashboard-kpi-value">${summary.criticalCount || 0}</p>
                <p class="dashboard-kpi-meta">Products with near-zero stock cover</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Reorder Now</p>
                <p class="dashboard-kpi-value">${summary.reorderNowCount || 0}</p>
                <p class="dashboard-kpi-meta">${summary.manualReviewCount || 0} product${summary.manualReviewCount === 1 ? "" : "s"} also need manual review</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Suggested Units</p>
                <p class="dashboard-kpi-value">${summary.totalRecommendedQty || 0}</p>
                <p class="dashboard-kpi-meta">${summary.actionableCount || 0} immediately actionable recommendation${summary.actionableCount === 1 ? "" : "s"}</p>
            </article>
        </section>
    `;
}

function renderReorderPolicyOverviewSection(reportData = null) {
    const rows = reportData?.policyRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Active Policy Rules</h3>
                    <p>The report uses the most specific active policy first, so users can read the rule in plain English before acting on the recommendations.</p>
                </div>
                <span class="status-pill">${rows.length} active polic${rows.length === 1 ? "y" : "ies"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Policy</th>
                            <th>Scope</th>
                            <th>Plain-English Rule</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.policyName}${row.isSystemDefault ? `<br><span class="table-note">Moneta Default Rule</span>` : ""}</td>
                                <td>${row.scopeSummary}</td>
                                <td>${row.ruleExplanation}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="3" class="reports-table-empty">No active reorder policies are available.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderReorderRecommendationsDetailSection(reportData = null) {
    const rows = reportData?.detailRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Recommendation Queue</h3>
                    <p>Products that need action, attention, or manual review based on the active reorder policy rules.</p>
                </div>
                <span class="status-pill">${rows.length} row${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th class="reports-align-right">On Hand</th>
                            <th class="reports-align-right">Avg Daily Demand</th>
                            <th class="reports-align-right">Reorder Point</th>
                            <th class="reports-align-right">Suggested Qty</th>
                            <th>Policy</th>
                            <th>Why</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.productName}</td>
                                <td>${row.categoryName}</td>
                                <td>${row.state}</td>
                                <td class="reports-align-right">${row.onHand}</td>
                                <td class="reports-align-right">${row.avgDailyDemand}</td>
                                <td class="reports-align-right">${row.reorderPoint}</td>
                                <td class="reports-align-right">${row.recommendedQty}</td>
                                <td>${row.policyName}<br><span class="table-note">${row.policyScopeSummary}</span></td>
                                <td>${row.appliedExplanation}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="9" class="reports-table-empty">No reorder actions are currently open.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderReorderRecommendationsMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Reorder Recommendations is an as-of stock report that applies the active policy hierarchy and explains the matched rule in plain English.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">As Of</p>
                    <p class="report-audit-value">${reportData ? formatDateLabel(reportData.asOfDate) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Active Policies</p>
                    <p class="report-audit-value">${reportData?.summary?.activePolicyCount || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Products Reviewed</p>
                    <p class="report-audit-value">${reportData?.summary?.productsReviewed || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Products ${sourceCounts.products || 0},
                Categories ${sourceCounts.categories || 0},
                Reorder policies ${sourceCounts.reorderPolicies || 0},
                Retail sales ${sourceCounts.salesInvoices || 0},
                Consignment orders ${sourceCounts.consignmentOrders || 0}.
            </div>
            ${(metadata.notes || []).length ? `
                <div class="reports-audit-note">
                    ${(metadata.notes || []).map(note => `- ${note}`).join("<br>")}
                </div>
            ` : ""}
        </section>
    `;
}

function renderProductPerformanceCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Products Sold</p>
                <p class="dashboard-kpi-value">${summary.productCount || 0}</p>
                <p class="dashboard-kpi-meta">Distinct products sold in the selected window</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Units Sold</p>
                <p class="dashboard-kpi-value">${summary.totalUnitsSold || 0}</p>
                <p class="dashboard-kpi-meta">Retail and consignment units sold</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Top By Revenue</p>
                <p class="dashboard-kpi-value">${summary.topRevenueProductName || "-"}</p>
                <p class="dashboard-kpi-meta">${formatCurrency(summary.topRevenueProductRevenue || 0)} net sales</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Top By Units</p>
                <p class="dashboard-kpi-value">${summary.topUnitProductName || "-"}</p>
                <p class="dashboard-kpi-meta">${summary.topUnitProductUnits || 0} units sold</p>
            </article>
        </section>
    `;
}

function renderProductPerformanceTopSection(reportData = null) {
    const rows = reportData?.topRows || [];
    const totalRevenue = Number(reportData?.summary?.totalRevenue) || 0;

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Top Selling Products</h3>
                    <p>Products ranked by revenue and units sold across direct retail and consignment channels.</p>
                </div>
                <span class="status-pill">${rows.length} product${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th class="reports-align-right">Units Sold</th>
                            <th class="reports-align-right">Revenue</th>
                            <th class="reports-align-right">Retail Units</th>
                            <th class="reports-align-right">Consignment Units</th>
                            <th class="reports-align-right">Revenue Share</th>
                            <th>Last Sold</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.productName}</td>
                                <td>${row.categoryName}</td>
                                <td class="reports-align-right">${row.unitsSold}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.revenue)}</td>
                                <td class="reports-align-right">${row.retailUnitsSold}</td>
                                <td class="reports-align-right">${row.consignmentUnitsSold}</td>
                                <td class="reports-align-right">${formatPercent(totalRevenue > 0 ? ((Number(row.revenue) || 0) / totalRevenue) * 100 : 0)}</td>
                                <td>${row.lastSoldOn ? formatDateLabel(row.lastSoldOn) : "-"}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="8" class="reports-table-empty">No product sales are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderProductPerformanceExposureSection(reportData = null) {
    const rows = reportData?.stockExposureRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Slow-Moving Stock Exposure</h3>
                    <p>Products with low sold quantity but current stock still on hand, useful for stock-risk and merchandising review.</p>
                </div>
                <span class="status-pill">${rows.length} product${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th class="reports-align-right">Units Sold</th>
                            <th class="reports-align-right">On Hand</th>
                            <th class="reports-align-right">Stock Exposure</th>
                            <th class="reports-align-right">Average Unit Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.productName}</td>
                                <td>${row.categoryName}</td>
                                <td>${row.stockStatus}</td>
                                <td class="reports-align-right">${row.unitsSold}</td>
                                <td class="reports-align-right">${row.unitsOnHand}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.stockExposureValue)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.averageUnitRevenue)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="7" class="reports-table-empty">No stock exposure products are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderProductPerformanceMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Product performance is built from sold retail line items and consignment item settlements inside the selected reporting window.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">Prepared At</p>
                    <p class="report-audit-value">${reportData ? formatDateTime(reportData.generatedAt) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Window</p>
                    <p class="report-audit-value">${reportData?.rangeLabel || "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Products Sold</p>
                    <p class="report-audit-value">${reportData?.summary?.productCount || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Products ${sourceCounts.products || 0},
                Categories ${sourceCounts.categories || 0},
                Retail sales ${sourceCounts.salesInvoices || 0},
                Consignment orders ${sourceCounts.consignmentOrders || 0}.
            </div>
        </section>
    `;
}

function buildActivityGridColumnDefs() {
    return [
        {
            field: "transactionDate",
            headerName: "Transaction Date",
            minWidth: 155,
            flex: 0.95,
            valueFormatter: params => formatDateLabel(params.value)
        },
        {
            field: "recordedAt",
            headerName: "Recorded At (UTC)",
            minWidth: 200,
            flex: 1.05,
            valueFormatter: params => formatUtcDateTime(params.value)
        },
        {
            field: "sourceLabel",
            headerName: "Source",
            minWidth: 210,
            flex: 1.1
        },
        {
            field: "reference",
            headerName: "Reference",
            minWidth: 180,
            flex: 1,
            valueFormatter: params => params.value || "-"
        },
        {
            field: "counterparty",
            headerName: "Counterparty",
            minWidth: 210,
            flex: 1.1,
            valueFormatter: params => params.value || "-"
        },
        {
            field: "notes",
            headerName: "Notes",
            minWidth: 230,
            flex: 1.3,
            valueFormatter: params => params.value || "-"
        },
        {
            field: "amount",
            headerName: "Amount",
            minWidth: 140,
            flex: 0.85,
            cellClass: params => `ag-right-aligned-cell ${getAccountingAmountClass(params.value)}`.trim(),
            headerClass: "ag-right-aligned-header",
            valueFormatter: params => formatSignedCurrency(params.value || 0)
        }
    ];
}

function destroyActivityGrid() {
    if (featureState.activityGridApi) {
        featureState.activityGridApi.destroy();
    }

    featureState.activityGridApi = null;
    featureState.activityGridElement = null;
}

function initializeActivityGrid(rows = []) {
    const gridElement = document.getElementById("reports-cash-activity-grid");
    if (!gridElement) {
        destroyActivityGrid();
        return;
    }

    if (featureState.activityGridApi && featureState.activityGridElement !== gridElement) {
        destroyActivityGrid();
    }

    if (!featureState.activityGridApi) {
        featureState.activityGridApi = createGrid(gridElement, {
            columnDefs: buildActivityGridColumnDefs(),
            rowData: [],
            pagination: true,
            paginationPageSize: 25,
            paginationPageSizeSelector: [10, 25, 50, 100],
            animateRows: false,
            defaultColDef: {
                sortable: true,
                filter: true,
                resizable: true,
                wrapHeaderText: true,
                autoHeaderHeight: true,
                wrapText: true,
                autoHeight: true
            }
        });
        featureState.activityGridElement = gridElement;
    }

    featureState.activityGridApi.setGridOption("rowData", rows || []);
    featureState.activityGridApi.setGridOption("quickFilterText", featureState.activitySearchTerm || "");
}

function renderCashFlowStatementSection(reportData = null) {
    const rows = reportData?.statementRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Cash Flow Statement</h3>
                    <p>Structured movement summary prepared from recorded ledgers for the selected period.</p>
                </div>
                <span class="status-pill">Basis: Recorded Cash Movements</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Line Item</th>
                            <th class="reports-align-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr class="${row.tone === "total" ? "reports-row-total" : ""}">
                                <td>${row.section}</td>
                                <td>${row.label}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.amount)}">${formatAccountingCurrency(row.amount)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="3" class="reports-table-empty">No cash movement rows are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderActivitySection(reportData = null) {
    const rows = reportData?.activityRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Recent Cash Activity</h3>
                    <p>Ledger-backed transaction detail with pagination for audit follow-up and drilldown.</p>
                </div>
                <span class="status-pill">${rows.length} transaction${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="reports-grid-toolbar">
                <label class="reports-grid-search" for="reports-cash-activity-search">
                    <span>Search Transactions</span>
                    <input
                        id="reports-cash-activity-search"
                        class="input"
                        type="search"
                        placeholder="Search source, reference, counterparty, notes"
                        value="${featureState.activitySearchTerm}">
                </label>
            </div>
            <div id="reports-cash-activity-grid" class="ag-theme-alpine moneta-grid reports-activity-grid" style="height: 560px; width: 100%;" aria-label="Recent Cash Activity"></div>
        </section>
    `;
}

function renderCashFlowMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {
        salesPayments: 0,
        consignmentPayments: 0,
        supplierPayments: 0,
        donations: 0
    };
    const truncatedSources = metadata.truncatedSources || {};
    const truncatedLabels = Object.entries(truncatedSources)
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Report basis, source coverage, and generated metadata for finance review.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">Prepared At</p>
                    <p class="report-audit-value">${reportData ? formatDateTime(reportData.generatedAt) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Source Rows</p>
                    <p class="report-audit-value">${reportData?.summary?.movementCount || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Execution Time</p>
                    <p class="report-audit-value">${reportData ? `${reportData.durationMs} ms` : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Retail payments ${sourceCounts.salesPayments || 0},
                Consignment payments ${sourceCounts.consignmentPayments || 0},
                Supplier payments ${sourceCounts.supplierPayments || 0},
                Donations ${sourceCounts.donations || 0}.
            </div>
        </section>
    `;
}

function renderReportHeader(reportDef, reportData, { showRangeControls = false } = {}) {
    const rangeSpec = resolveCashFlowRangeSpec({
        rangeKey: featureState.selectedRangeKey,
        customFrom: featureState.customFrom,
        customTo: featureState.customTo
    });
    const loadedLabel = featureState.loadedAt ? formatDateTime(featureState.loadedAt) : "-";
    const expiryLabel = featureState.expiresAt ? formatDateTime(featureState.expiresAt) : "-";
    const sourceLabel = featureState.source === "cache" ? "Cached Snapshot" : "Live Data";
    const windowLabel = buildReportWindowLabel(reportDef, reportData, rangeSpec);

    return `
        <section class="panel-card reports-header-card">
            <div class="reports-toolbar">
                <div class="reports-header-copy">
                    <button class="button button-secondary reports-back-button" type="button" data-report-back>
                        <span class="button-icon">${icons.close}</span>
                        Back To Reports
                    </button>
                    <p class="hero-kicker">${reportDef.groupTitle}</p>
                    <h2 class="hero-title">${reportDef.title}</h2>
                    <p>${reportDef.description}</p>
                </div>
                <div class="reports-toolbar-actions">
                    ${showRangeControls ? `
                        <div class="dashboard-window-switcher">
                            ${buildRangeButtonsMarkup()}
                        </div>
                        <div class="dashboard-custom-range ${featureState.selectedRangeKey === "custom" ? "is-visible" : ""}">
                            <div class="dashboard-custom-field">
                                <label for="cash-flow-custom-from">From</label>
                                <input id="cash-flow-custom-from" class="input dashboard-date-input" type="date" value="${featureState.customFrom}" ${featureState.isLoading ? "disabled" : ""}>
                            </div>
                            <div class="dashboard-custom-field">
                                <label for="cash-flow-custom-to">To</label>
                                <input id="cash-flow-custom-to" class="input dashboard-date-input" type="date" value="${featureState.customTo}" ${featureState.isLoading ? "disabled" : ""}>
                            </div>
                            <button id="cash-flow-custom-apply" class="button button-secondary dashboard-custom-apply" type="button" ${featureState.isLoading ? "disabled" : ""}>
                                Apply
                            </button>
                        </div>
                    ` : ""}
                    <button id="cash-flow-refresh-button" class="button button-primary-alt" type="button" ${featureState.isLoading ? "disabled" : ""}>
                        <span class="button-icon">${icons.search}</span>
                        ${featureState.isLoading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </div>
            <div class="dashboard-cache-strip source-${featureState.source}">
                <span class="status-pill">${sourceLabel}</span>
                <span>Window: <strong>${windowLabel}</strong></span>
                <span>Loaded: <strong>${loadedLabel}</strong></span>
                <span>Cache Expires: <strong>${expiryLabel}</strong></span>
            </div>
            ${featureState.errorMessage ? `
                <div class="dashboard-error-strip">
                    <span class="button-icon">${icons.warning}</span>
                    ${featureState.errorMessage}
                </div>
            ` : ""}
        </section>
    `;
}

function renderAgingSection(title, rows = [], amountLabel = "Balance") {
    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>${title}</h3>
                    <p>Open exposure grouped by age bucket for collection and liability review.</p>
                </div>
                <span class="status-pill">${rows.length} bucket${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Bucket</th>
                            <th class="reports-align-right">Items</th>
                            <th class="reports-align-right">${amountLabel}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.label}</td>
                                <td class="reports-align-right">${row.count}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.amount)}">${formatAccountingCurrency(row.amount)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="3" class="reports-table-empty">No aged balances are available.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderOutstandingReceivablesCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-danger">
                <p class="dashboard-kpi-title">Open Receivables</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.openBalance || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.openItems || 0} open customer exposures</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Retail Balance</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.retailBalance || 0)}</p>
                <p class="dashboard-kpi-meta">Outstanding direct retail balances</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Consignment Balance</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.consignmentBalance || 0)}</p>
                <p class="dashboard-kpi-meta">Outstanding consignment settlements</p>
            </article>
            <article class="dashboard-kpi-card tone-danger">
                <p class="dashboard-kpi-title">Over 30 Days</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.overdueBalance || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.uniqueParties || 0} unique parties</p>
            </article>
        </section>
    `;
}

function renderOutstandingReceivablesDetail(reportData = null) {
    const rows = reportData?.detailRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Open Receivable Detail</h3>
                    <p>Retail and consignment balances still outstanding as of the current report date.</p>
                </div>
                <span class="status-pill">${rows.length} open item${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Source</th>
                            <th>Reference</th>
                            <th>Counterparty</th>
                            <th>Date</th>
                            <th class="reports-align-right">Age</th>
                            <th class="reports-align-right">Gross</th>
                            <th class="reports-align-right">Paid</th>
                            <th class="reports-align-right">Balance</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.sourceLabel}</td>
                                <td>${row.reference || "-"}</td>
                                <td>${row.counterparty || "-"}</td>
                                <td>${formatDateLabel(row.transactionDate)}</td>
                                <td class="reports-align-right">${row.ageDays}d</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.grossAmount)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.amountPaid)}</td>
                                <td class="reports-align-right reports-amount-negative">${formatAccountingCurrency(row.balanceDue)}</td>
                                <td>${row.status || "-"}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="9" class="reports-table-empty">No open receivables are currently outstanding.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderReceivablesMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Receivables are shown as an as-of report using current open balances and aging from the transaction date.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">As Of</p>
                    <p class="report-audit-value">${reportData ? formatDateLabel(reportData.asOfDate) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Open Items</p>
                    <p class="report-audit-value">${reportData?.summary?.openItems || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Execution Time</p>
                    <p class="report-audit-value">${reportData ? `${reportData.durationMs} ms` : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Retail sales ${sourceCounts.salesInvoices || 0},
                Consignment orders ${sourceCounts.consignmentOrders || 0}.
            </div>
        </section>
    `;
}

function renderPurchasePayablesCards(reportData = null) {
    const summary = reportData?.summary || {};

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-danger">
                <p class="dashboard-kpi-title">Open Payables</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.openBalance || 0)}</p>
                <p class="dashboard-kpi-meta">${summary.openInvoices || 0} open supplier invoices</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Over 30 Days</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.overdueBalance || 0)}</p>
                <p class="dashboard-kpi-meta">Invoices aged over 30 days</p>
            </article>
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Suppliers Exposed</p>
                <p class="dashboard-kpi-value">${summary.supplierCount || 0}</p>
                <p class="dashboard-kpi-meta">Suppliers with unpaid balance</p>
            </article>
        </section>
    `;
}

function renderSupplierSummarySection(reportData = null) {
    const rows = reportData?.supplierRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Supplier Exposure</h3>
                    <p>Grouped payable balance by supplier for prioritization and payment planning.</p>
                </div>
                <span class="status-pill">${rows.length} supplier${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Supplier</th>
                            <th class="reports-align-right">Invoices</th>
                            <th class="reports-align-right">Invoice Total</th>
                            <th class="reports-align-right">Paid</th>
                            <th class="reports-align-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.supplierName}</td>
                                <td class="reports-align-right">${row.invoiceCount}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.invoiceTotal)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.amountPaid)}</td>
                                <td class="reports-align-right reports-amount-negative">${formatAccountingCurrency(row.balanceDue)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="5" class="reports-table-empty">No supplier balances are currently outstanding.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderPurchasePayablesDetail(reportData = null) {
    const rows = reportData?.detailRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Open Invoice Detail</h3>
                    <p>Invoice-level unpaid balances with age and supplier context.</p>
                </div>
                <span class="status-pill">${rows.length} invoice${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Supplier</th>
                            <th>Reference</th>
                            <th>Invoice</th>
                            <th>Date</th>
                            <th class="reports-align-right">Age</th>
                            <th class="reports-align-right">Total</th>
                            <th class="reports-align-right">Paid</th>
                            <th class="reports-align-right">Balance</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.supplierName}</td>
                                <td>${row.reference || "-"}</td>
                                <td>${row.invoiceName || "-"}</td>
                                <td>${formatDateLabel(row.transactionDate)}</td>
                                <td class="reports-align-right">${row.ageDays}d</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.invoiceTotal)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.amountPaid)}</td>
                                <td class="reports-align-right reports-amount-negative">${formatAccountingCurrency(row.balanceDue)}</td>
                                <td>${row.status || "-"}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="9" class="reports-table-empty">No purchase payables are currently outstanding.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderPurchasePayablesMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Purchase payables are shown as current outstanding supplier obligations aged from invoice date.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">As Of</p>
                    <p class="report-audit-value">${reportData ? formatDateLabel(reportData.asOfDate) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Open Invoices</p>
                    <p class="report-audit-value">${reportData?.summary?.openInvoices || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Suppliers</p>
                    <p class="report-audit-value">${reportData?.summary?.supplierCount || 0}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Purchase invoices ${sourceCounts.purchaseInvoices || 0}.
            </div>
        </section>
    `;
}

function renderProfitAndLossCards(reportData = null) {
    const summary = reportData?.summary || {};
    const netProfitTone = (summary.netProfit || 0) >= 0 ? "tone-success" : "tone-danger";

    return `
        <section class="dashboard-kpi-grid">
            <article class="dashboard-kpi-card tone-primary">
                <p class="dashboard-kpi-title">Net Sales Revenue</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.netSalesRevenue || 0)}</p>
                <p class="dashboard-kpi-meta">Retail and consignment net sales</p>
            </article>
            <article class="dashboard-kpi-card tone-success">
                <p class="dashboard-kpi-title">Gross Profit</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.grossProfit || 0)}</p>
                <p class="dashboard-kpi-meta">After estimated cost of goods sold</p>
            </article>
            <article class="dashboard-kpi-card tone-warning">
                <p class="dashboard-kpi-title">Operating Profit</p>
                <p class="dashboard-kpi-value">${formatCurrency(summary.operatingProfit || 0)}</p>
                <p class="dashboard-kpi-meta">After retail and consignment expenses</p>
            </article>
            <article class="dashboard-kpi-card ${netProfitTone}">
                <p class="dashboard-kpi-title">Net Profit / Loss</p>
                <p class="dashboard-kpi-value">${formatSignedCurrency(summary.netProfit || 0)}</p>
                <p class="dashboard-kpi-meta">Including net donations</p>
            </article>
        </section>
    `;
}

function renderProfitAndLossStatementSection(reportData = null) {
    const rows = reportData?.statementRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Profit And Loss Statement</h3>
                    <p>Statement-style income view for the selected reporting window.</p>
                </div>
                <span class="status-pill">Basis: Accrual-style operational summary</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Line Item</th>
                            <th class="reports-align-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr class="${row.tone === "total" ? "reports-row-total" : ""}">
                                <td>${row.section}</td>
                                <td>${row.label}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.amount)}">${formatAccountingCurrency(row.amount)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="3" class="reports-table-empty">No profit and loss rows are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderProfitAndLossSegmentSection(reportData = null) {
    const rows = reportData?.segmentRows || [];

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Business Segment Support</h3>
                    <p>Supporting gross profit view by retail store and consignment segment.</p>
                </div>
                <span class="status-pill">${rows.length} segment${rows.length === 1 ? "" : "s"}</span>
            </div>
            <div class="table-wrap reports-table-wrap">
                <table class="data-table reports-data-table">
                    <thead>
                        <tr>
                            <th>Segment</th>
                            <th class="reports-align-right">Gross Sales</th>
                            <th class="reports-align-right">Discounts</th>
                            <th class="reports-align-right">Net Sales</th>
                            <th class="reports-align-right">COGS</th>
                            <th class="reports-align-right">Gross Profit</th>
                            <th class="reports-align-right">Expenses</th>
                            <th class="reports-align-right">Operating Profit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.length ? rows.map(row => `
                            <tr>
                                <td>${row.segment}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.grossSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency((Number(row.discounts) || 0) * -1)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency(row.netSales)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency((Number(row.cogs) || 0) * -1)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.grossProfit)}">${formatAccountingCurrency(row.grossProfit)}</td>
                                <td class="reports-align-right">${formatAccountingCurrency((Number(row.expenses) || 0) * -1)}</td>
                                <td class="reports-align-right ${getAccountingAmountClass(row.operatingProfit)}">${formatAccountingCurrency(row.operatingProfit)}</td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="8" class="reports-table-empty">No business segment support rows are available for this range.</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        </section>
    `;
}

function renderProfitAndLossMetadataSection(reportData = null) {
    const metadata = reportData?.metadata || {};
    const sourceCounts = metadata.sourceCounts || {};
    const truncatedLabels = Object.entries(metadata.truncatedSources || {})
        .filter(([, value]) => value)
        .map(([key]) => key)
        .join(", ");

    return `
        <section class="panel-card reports-detail-card">
            <div class="reports-detail-head">
                <div>
                    <h3>Audit Notes</h3>
                    <p>Statement assumptions and source coverage used for this P&amp;L build.</p>
                </div>
                <span class="status-pill">Prepared by MONETA</span>
            </div>
            <div class="reports-audit-grid">
                <article class="report-audit-card">
                    <p class="report-audit-label">Prepared At</p>
                    <p class="report-audit-value">${reportData ? formatDateTime(reportData.generatedAt) : "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Window</p>
                    <p class="report-audit-value">${reportData?.rangeLabel || "-"}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Retail Tax Excluded</p>
                    <p class="report-audit-value">${formatAccountingCurrency(reportData?.summary?.retailTaxesCollected || 0)}</p>
                </article>
                <article class="report-audit-card">
                    <p class="report-audit-label">Query Coverage</p>
                    <p class="report-audit-value">${truncatedLabels ? `Review limit hit: ${truncatedLabels}` : "Within current fetch limit"}</p>
                </article>
            </div>
            <div class="reports-audit-note">
                <strong>Source counts:</strong>
                Retail sales ${sourceCounts.salesInvoices || 0},
                Consignment orders ${sourceCounts.consignmentOrders || 0},
                Donations ${sourceCounts.donations || 0},
                Purchase invoices ${sourceCounts.purchaseInvoices || 0},
                Products ${sourceCounts.products || 0}.
            </div>
            <div class="reports-audit-note">
                <strong>COGS basis:</strong>
                Weighted-cost products ${reportData?.summary?.weightedCostingProducts || 0},
                Fallback-cost products ${reportData?.summary?.fallbackCostingProducts || 0}.
            </div>
            ${(metadata.notes || []).length ? `
                <div class="reports-audit-note">
                    ${(metadata.notes || []).map(note => `- ${note}`).join("<br>")}
                </div>
            ` : ""}
        </section>
    `;
}

function renderCashFlowReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData, { showRangeControls: true })}
            ${renderCashFlowSummaryCards(reportData)}
            ${renderCashFlowStatementSection(reportData)}
            ${renderActivitySection(reportData)}
            ${renderCashFlowMetadataSection(reportData)}
        </div>
    `;
}

function renderOutstandingReceivablesReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData)}
            ${renderOutstandingReceivablesCards(reportData)}
            ${renderAgingSection("Receivables Aging", reportData?.agingRows || [], "Balance")}
            ${renderOutstandingReceivablesDetail(reportData)}
            ${renderReceivablesMetadataSection(reportData)}
        </div>
    `;
}

function renderPurchasePayablesReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData)}
            ${renderPurchasePayablesCards(reportData)}
            ${renderAgingSection("Payables Aging", reportData?.agingRows || [], "Balance")}
            ${renderSupplierSummarySection(reportData)}
            ${renderPurchasePayablesDetail(reportData)}
            ${renderPurchasePayablesMetadataSection(reportData)}
        </div>
    `;
}

function renderProfitAndLossReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData, { showRangeControls: true })}
            ${renderProfitAndLossCards(reportData)}
            ${renderProfitAndLossStatementSection(reportData)}
            ${renderProfitAndLossSegmentSection(reportData)}
            ${renderProfitAndLossMetadataSection(reportData)}
        </div>
    `;
}

function renderSalesSummaryReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData, { showRangeControls: true })}
            ${renderSalesSummaryCards(reportData)}
            ${renderSalesSummaryStatementSection(reportData)}
            ${renderSalesSummaryStoreSection(reportData)}
            ${renderSalesSummaryDetailSection(reportData)}
            ${renderSalesSummaryMetadataSection(reportData)}
        </div>
    `;
}

function renderSalesTrendReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData, { showRangeControls: true })}
            ${renderSalesTrendCards(reportData)}
            ${renderSalesTrendDailySection(reportData)}
            ${renderSalesTrendWeeklySection(reportData)}
            ${renderSalesTrendChannelSection(reportData)}
            ${renderSalesTrendMetadataSection(reportData)}
        </div>
    `;
}

function renderStorePerformanceReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData, { showRangeControls: true })}
            ${renderStorePerformanceCards(reportData)}
            ${renderStorePerformanceTable(reportData)}
            ${renderStorePerformanceMetadataSection(reportData)}
        </div>
    `;
}

function renderInventoryStatusReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData)}
            ${renderInventoryStatusCards(reportData)}
            ${renderInventoryBucketSection(reportData)}
            ${renderInventoryAlertSection(reportData)}
            ${renderInventoryStatusMetadataSection(reportData)}
        </div>
    `;
}

function renderInventoryValuationReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData)}
            ${renderInventoryValuationCards(reportData)}
            ${renderInventoryValuationCategorySection(reportData)}
            ${renderInventoryValuationDetailSection(reportData)}
            ${renderInventoryValuationMetadataSection(reportData)}
        </div>
    `;
}

function renderReorderRecommendationsReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData)}
            ${renderReorderRecommendationsCards(reportData)}
            ${renderReorderPolicyOverviewSection(reportData)}
            ${renderReorderRecommendationsDetailSection(reportData)}
            ${renderReorderRecommendationsMetadataSection(reportData)}
        </div>
    `;
}

function renderConsignmentPerformanceReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData, { showRangeControls: true })}
            ${renderConsignmentPerformanceCards(reportData)}
            ${renderConsignmentPerformanceTeamSection(reportData)}
            ${renderConsignmentPerformanceDetailSection(reportData)}
            ${renderConsignmentPerformanceMetadataSection(reportData)}
        </div>
    `;
}

function renderProductPerformanceReportView(user, reportDef) {
    const reportData = featureState.reportData;

    return `
        <div class="reports-shell reports-workspace">
            ${renderReportHeader(reportDef, reportData, { showRangeControls: true })}
            ${renderProductPerformanceCards(reportData)}
            ${renderProductPerformanceTopSection(reportData)}
            ${renderProductPerformanceExposureSection(reportData)}
            ${renderProductPerformanceMetadataSection(reportData)}
        </div>
    `;
}

function bindReportsEvents(user) {
    const root = document.getElementById("reports-root");
    if (!root) return;

    root.querySelectorAll("[data-report-open]").forEach(button => {
        button.addEventListener("click", () => {
            const reportId = button.getAttribute("data-report-open");
            const reportDef = findReportDefinition(reportId);
            if (!reportDef || !canAccessReport(reportDef, user)) return;

            if (!reportDef.implemented) {
                showToast(`${reportDef.title} is queued next in the reporting backlog.`, "info");
                return;
            }

            featureState.activeGroupKey = reportDef.groupKey;
            featureState.activeReportId = reportDef.id;
            featureState.errorMessage = "";
            renderReportsView(user);
        });
    });

    root.querySelector("[data-report-back]")?.addEventListener("click", () => {
        featureState.activeGroupKey = "";
        featureState.activeReportId = "";
        featureState.errorMessage = "";
        renderReportsView(user);
    });

    root.querySelectorAll("[data-range-key]").forEach(button => {
        button.addEventListener("click", () => {
            const nextKey = button.getAttribute("data-range-key");
            if (!nextKey || nextKey === featureState.selectedRangeKey) return;

            featureState.selectedRangeKey = nextKey;
            featureState.reportData = null;
            featureState.errorMessage = "";
            renderReportsView(user);

            if (nextKey !== "custom") {
                void loadActiveReport(user, { forceRefresh: false });
            }
        });
    });

    root.querySelector("#cash-flow-custom-from")?.addEventListener("change", event => {
        featureState.customFrom = event.target.value || "";
    });

    root.querySelector("#cash-flow-custom-to")?.addEventListener("change", event => {
        featureState.customTo = event.target.value || "";
    });

    root.querySelector("#cash-flow-custom-apply")?.addEventListener("click", () => {
        featureState.selectedRangeKey = "custom";
        featureState.reportData = null;
        featureState.errorMessage = "";
        void loadActiveReport(user, { forceRefresh: false });
    });

    root.querySelector("#cash-flow-refresh-button")?.addEventListener("click", () => {
        void loadActiveReport(user, { forceRefresh: true });
    });

    root.querySelector("#reports-cash-activity-search")?.addEventListener("input", event => {
        featureState.activitySearchTerm = event.target.value || "";
        featureState.activityGridApi?.setGridOption("quickFilterText", featureState.activitySearchTerm);
    });
}

async function loadCashFlowReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "finance"].includes(user.role)) return;

    const rangeSpec = resolveCashFlowRangeSpec({
        rangeKey: featureState.selectedRangeKey,
        customFrom: featureState.customFrom,
        customTo: featureState.customTo
    });

    if (!rangeSpec.isValid) {
        featureState.reportData = null;
        featureState.isLoading = false;
        featureState.errorMessage = rangeSpec.error || "Cash flow range is invalid.";
        renderReportsView(user);
        return;
    }

    const hasFreshData = featureState.reportData
        && featureState.reportData.rangeKey === rangeSpec.rangeKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getCashFlowSummaryReport(user, rangeSpec, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "cash-flow-summary"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Cash flow report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the cash flow summary report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadOutstandingReceivablesReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "finance"].includes(user.role)) return;

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "outstanding-receivables"
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getOutstandingReceivablesReport(user, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "outstanding-receivables"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Outstanding receivables report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the outstanding receivables report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadPurchasePayablesReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "finance", "inventory_manager"].includes(user.role)) return;

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "purchase-payables"
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getPurchasePayablesReport(user, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "purchase-payables"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Purchase payables report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the purchase payables report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadProfitAndLossReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "finance"].includes(user.role)) return;

    const rangeSpec = resolveCashFlowRangeSpec({
        rangeKey: featureState.selectedRangeKey,
        customFrom: featureState.customFrom,
        customTo: featureState.customTo
    });

    if (!rangeSpec.isValid) {
        featureState.reportData = null;
        featureState.isLoading = false;
        featureState.errorMessage = rangeSpec.error || "Profit and loss range is invalid.";
        renderReportsView(user);
        return;
    }

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "profit-and-loss"
        && featureState.reportData.rangeKey === rangeSpec.rangeKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getProfitAndLossReport(user, rangeSpec, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "profit-and-loss"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Profit and loss report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the profit and loss report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadSalesSummaryReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "sales_staff", "finance"].includes(user.role)) return;

    const rangeSpec = resolveCashFlowRangeSpec({
        rangeKey: featureState.selectedRangeKey,
        customFrom: featureState.customFrom,
        customTo: featureState.customTo
    });

    if (!rangeSpec.isValid) {
        featureState.reportData = null;
        featureState.isLoading = false;
        featureState.errorMessage = rangeSpec.error || "Sales summary range is invalid.";
        renderReportsView(user);
        return;
    }

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "sales-summary"
        && featureState.reportData.rangeKey === rangeSpec.rangeKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getSalesSummaryReport(user, rangeSpec, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "sales-summary"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Sales summary report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the sales summary report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadSalesTrendReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "sales_staff", "finance"].includes(user.role)) return;

    const rangeSpec = resolveCashFlowRangeSpec({
        rangeKey: featureState.selectedRangeKey,
        customFrom: featureState.customFrom,
        customTo: featureState.customTo
    });

    if (!rangeSpec.isValid) {
        featureState.reportData = null;
        featureState.isLoading = false;
        featureState.errorMessage = rangeSpec.error || "Sales trend range is invalid.";
        renderReportsView(user);
        return;
    }

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "sales-trend"
        && featureState.reportData.rangeKey === rangeSpec.rangeKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getSalesTrendReport(user, rangeSpec, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "sales-trend"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Sales trend report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the sales trend report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadStorePerformanceReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "sales_staff", "finance"].includes(user.role)) return;

    const rangeSpec = resolveCashFlowRangeSpec({
        rangeKey: featureState.selectedRangeKey,
        customFrom: featureState.customFrom,
        customTo: featureState.customTo
    });

    if (!rangeSpec.isValid) {
        featureState.reportData = null;
        featureState.isLoading = false;
        featureState.errorMessage = rangeSpec.error || "Store performance range is invalid.";
        renderReportsView(user);
        return;
    }

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "store-performance"
        && featureState.reportData.rangeKey === rangeSpec.rangeKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getStorePerformanceReport(user, rangeSpec, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "store-performance"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Store performance report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the store performance report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadLeadConversionReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "sales_staff", "team_lead"].includes(user.role)) return;

    const rangeSpec = resolveCashFlowRangeSpec({
        rangeKey: featureState.selectedRangeKey,
        customFrom: featureState.customFrom,
        customTo: featureState.customTo
    });

    if (!rangeSpec.isValid) {
        featureState.reportData = null;
        featureState.isLoading = false;
        featureState.errorMessage = rangeSpec.error || "Lead conversion range is invalid.";
        renderReportsView(user);
        return;
    }

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "lead-conversion"
        && featureState.reportData.rangeKey === rangeSpec.rangeKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getLeadConversionReport(user, rangeSpec, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "lead-conversion"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Lead conversion report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the lead conversion report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadConsignmentPerformanceReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance", "sales_staff"].includes(user.role)) return;

    const rangeSpec = resolveCashFlowRangeSpec({
        rangeKey: featureState.selectedRangeKey,
        customFrom: featureState.customFrom,
        customTo: featureState.customTo
    });

    if (!rangeSpec.isValid) {
        featureState.reportData = null;
        featureState.isLoading = false;
        featureState.errorMessage = rangeSpec.error || "Consignment performance range is invalid.";
        renderReportsView(user);
        return;
    }

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "consignment-performance"
        && featureState.reportData.rangeKey === rangeSpec.rangeKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getConsignmentPerformanceReport(user, rangeSpec, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "consignment-performance"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Consignment performance report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the consignment performance report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadInventoryStatusReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance"].includes(user.role)) return;

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "inventory-status"
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getInventoryStatusReport(user, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "inventory-status"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Inventory status report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the inventory status report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadInventoryValuationReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance"].includes(user.role)) return;

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "inventory-valuation"
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getInventoryValuationReport(user, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "inventory-valuation"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Inventory valuation report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the inventory valuation report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadReorderRecommendationsReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance"].includes(user.role)) return;

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "reorder-recommendations"
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getReorderRecommendationsReport(user, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "reorder-recommendations"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Reorder recommendations report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the reorder recommendations report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

async function loadProductPerformanceReport(user, { forceRefresh = false } = {}) {
    if (!user || !["admin", "inventory_manager", "finance", "sales_staff"].includes(user.role)) return;

    const rangeSpec = resolveCashFlowRangeSpec({
        rangeKey: featureState.selectedRangeKey,
        customFrom: featureState.customFrom,
        customTo: featureState.customTo
    });

    if (!rangeSpec.isValid) {
        featureState.reportData = null;
        featureState.isLoading = false;
        featureState.errorMessage = rangeSpec.error || "Product performance range is invalid.";
        renderReportsView(user);
        return;
    }

    const hasFreshData = featureState.reportData
        && featureState.reportData.reportId === "product-performance"
        && featureState.reportData.rangeKey === rangeSpec.rangeKey
        && Date.now() <= featureState.expiresAt;

    if (!forceRefresh && hasFreshData) {
        return;
    }

    const token = ++featureState.requestToken;
    featureState.isLoading = true;
    featureState.errorMessage = "";
    renderReportsView(user);

    try {
        const result = await getProductPerformanceReport(user, rangeSpec, { forceRefresh });

        if (token !== featureState.requestToken) return;

        featureState.reportData = {
            ...result.data,
            reportId: "product-performance"
        };
        featureState.source = result.source;
        featureState.loadedAt = result.loadedAt;
        featureState.expiresAt = result.expiresAt;
        featureState.errorMessage = "";
    } catch (error) {
        if (token !== featureState.requestToken) return;
        console.error("[Moneta] Product performance report load failed:", error);
        featureState.errorMessage = error.message || "Could not load the product performance report.";
    } finally {
        if (token === featureState.requestToken) {
            featureState.isLoading = false;
            if (getState().currentRoute === "#/reports") {
                renderReportsView(user);
            }
        }
    }
}

function loadActiveReport(user, options = {}) {
    const reportId = featureState.activeReportId;

    if (reportId === "sales-summary") {
        return loadSalesSummaryReport(user, options);
    }
    if (reportId === "sales-trend") {
        return loadSalesTrendReport(user, options);
    }
    if (reportId === "lead-conversion") {
        return loadLeadConversionReport(user, options);
    }
    if (reportId === "store-performance") {
        return loadStorePerformanceReport(user, options);
    }
    if (reportId === "consignment-performance") {
        return loadConsignmentPerformanceReport(user, options);
    }
    if (reportId === "inventory-status") {
        return loadInventoryStatusReport(user, options);
    }
    if (reportId === "inventory-valuation") {
        return loadInventoryValuationReport(user, options);
    }
    if (reportId === "reorder-recommendations") {
        return loadReorderRecommendationsReport(user, options);
    }
    if (reportId === "product-performance") {
        return loadProductPerformanceReport(user, options);
    }
    if (reportId === "cash-flow-summary") {
        return loadCashFlowReport(user, options);
    }
    if (reportId === "outstanding-receivables") {
        return loadOutstandingReceivablesReport(user, options);
    }
    if (reportId === "purchase-payables") {
        return loadPurchasePayablesReport(user, options);
    }
    if (reportId === "profit-and-loss") {
        return loadProfitAndLossReport(user, options);
    }

    return Promise.resolve();
}

export function renderReportsView(user) {
    const root = document.getElementById("reports-root");
    if (!root) return;

    destroyActivityGrid();

    if (!user) {
        root.innerHTML = `
            <section class="panel-card reports-empty-card">
                <h2 class="hero-title">Reports</h2>
                <p class="hero-copy">Login to view role-based report groups and reporting access.</p>
            </section>
        `;
        return;
    }

    resetReportsStateForUser(user);

    const activeReport = featureState.activeReportId ? findReportDefinition(featureState.activeReportId) : null;
    root.innerHTML = activeReport
        ? (() => {
            if (activeReport.id === "sales-summary") return renderSalesSummaryReportView(user, activeReport);
            if (activeReport.id === "sales-trend") return renderSalesTrendReportView(user, activeReport);
            if (activeReport.id === "lead-conversion") return renderLeadConversionReportView(user, activeReport);
            if (activeReport.id === "store-performance") return renderStorePerformanceReportView(user, activeReport);
            if (activeReport.id === "consignment-performance") return renderConsignmentPerformanceReportView(user, activeReport);
            if (activeReport.id === "inventory-status") return renderInventoryStatusReportView(user, activeReport);
            if (activeReport.id === "inventory-valuation") return renderInventoryValuationReportView(user, activeReport);
            if (activeReport.id === "reorder-recommendations") return renderReorderRecommendationsReportView(user, activeReport);
            if (activeReport.id === "product-performance") return renderProductPerformanceReportView(user, activeReport);
            if (activeReport.id === "cash-flow-summary") return renderCashFlowReportView(user, activeReport);
            if (activeReport.id === "outstanding-receivables") return renderOutstandingReceivablesReportView(user, activeReport);
            if (activeReport.id === "purchase-payables") return renderPurchasePayablesReportView(user, activeReport);
            if (activeReport.id === "profit-and-loss") return renderProfitAndLossReportView(user, activeReport);
            return renderReportsHub(user);
        })()
        : renderReportsHub(user);

    bindReportsEvents(user);

    if (activeReport?.id === "cash-flow-summary") {
        initializeActivityGrid(featureState.reportData?.activityRows || []);
    }

    if (activeReport) {
        const rangeSpec = resolveCashFlowRangeSpec({
            rangeKey: featureState.selectedRangeKey,
            customFrom: featureState.customFrom,
            customTo: featureState.customTo
        });
        const rangeReady = !reportUsesRange(activeReport.id) || rangeSpec.isValid;
        const shouldLoad = rangeReady && !featureState.isLoading && (
            !featureState.reportData
            || featureState.reportData.reportId !== activeReport.id
            || (reportUsesRange(activeReport.id) && featureState.reportData.rangeKey !== rangeSpec.rangeKey)
            || Date.now() > featureState.expiresAt
        );

        if (shouldLoad) {
            void loadActiveReport(user, { forceRefresh: false });
        }
    }
}
