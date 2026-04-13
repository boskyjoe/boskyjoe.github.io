import { getState } from "../../app/store.js";
import { icons } from "../../shared/icons.js";
import { showToast } from "../../shared/toast.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import {
    CASH_FLOW_RANGE_OPTIONS,
    formatAccountingCurrency,
    formatDateLabel,
    formatDateTime,
    formatSignedCurrency,
    formatUtcDateTime,
    getCashFlowSummaryReport,
    getDefaultCashFlowCustomRange,
    getOutstandingReceivablesReport,
    getProfitAndLossReport,
    getPurchasePayablesReport,
    resolveCashFlowRangeSpec
} from "./service.js";

const REPORT_GROUPS = [
    {
        key: "sales",
        title: "Sales Reports",
        description: "Commercial performance, collections, store comparison, and conversion tracking.",
        icon: icons.retail,
        badge: "Sales",
        reports: [
            {
                id: "sales-summary",
                title: "Sales Summary",
                description: "Period totals for sales, collections, donations, expenses, and outstanding balance due.",
                dataSource: "salesInvoices, salesPaymentsLedger, donations",
                roles: ["admin", "sales_staff", "finance"],
                status: "priority",
                implemented: false
            },
            {
                id: "store-performance",
                title: "Store Performance",
                description: "Church Store versus Tasty Treats comparison with revenue, transaction count, and average sale value.",
                dataSource: "salesInvoices, salesPaymentsLedger",
                roles: ["admin", "sales_staff", "finance"],
                status: "priority",
                implemented: false
            },
            {
                id: "sales-trend",
                title: "Sales Trend",
                description: "Daily and weekly movement view with period-over-period growth and slowdown indicators.",
                dataSource: "salesInvoices",
                roles: ["admin", "sales_staff", "finance"],
                status: "planned",
                implemented: false
            },
            {
                id: "lead-conversion",
                title: "Lead Conversion",
                description: "Open, qualified, ready-to-convert, converted, and sale-voided conversion outcome reporting.",
                dataSource: "leads, salesInvoices",
                roles: ["admin", "sales_staff", "team_lead"],
                status: "planned",
                implemented: false
            },
            {
                id: "consignment-performance",
                title: "Consignment Performance",
                description: "Checked out, sold, returned, damaged, gifted, collected, and balance-due insight for consignment activity.",
                dataSource: "consignmentOrdersV2, consignmentPaymentsLedger",
                roles: ["admin", "inventory_manager", "finance"],
                status: "planned",
                implemented: false
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
                implemented: false
            },
            {
                id: "inventory-valuation",
                title: "Inventory Valuation",
                description: "Inventory at cost, selling value, and potential gross margin using current stock on hand.",
                dataSource: "productCatalogue, purchaseInvoices",
                roles: ["admin", "inventory_manager", "finance"],
                status: "priority",
                implemented: false
            },
            {
                id: "product-performance",
                title: "Product Performance",
                description: "Top and slow-moving products by quantity sold, revenue contribution, and stock exposure.",
                dataSource: "productCatalogue, salesInvoices",
                roles: ["admin", "inventory_manager", "finance", "sales_staff"],
                status: "planned",
                implemented: false
            },
            {
                id: "reorder-recommendations",
                title: "Reorder Recommendations",
                description: "Suggested replenishment list based on threshold risk, stock depth, and operational urgency.",
                dataSource: "productCatalogue, purchaseInvoices",
                roles: ["admin", "inventory_manager"],
                status: "planned",
                implemented: false
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
    return ["cash-flow-summary", "profit-and-loss"].includes(reportId);
}

function buildReportWindowLabel(reportDef, reportData, rangeSpec) {
    if (reportDef?.id === "outstanding-receivables" || reportDef?.id === "purchase-payables") {
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
                    <span class="status-pill">Finance lane: 4 live reports</span>
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

function loadActiveReport(user, options = {}) {
    const reportId = featureState.activeReportId;

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
