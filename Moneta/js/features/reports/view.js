import { icons } from "../../shared/icons.js";

const REPORT_GROUPS = [
    {
        key: "sales",
        title: "Sales Reports",
        description: "Commercial performance, collections, store comparison, and conversion tracking.",
        icon: icons.retail,
        badge: "Sales",
        reports: [
            {
                title: "Sales Summary",
                description: "Period totals for sales, collections, donations, expenses, and outstanding balance due.",
                dataSource: "salesInvoices, salesPaymentsLedger, donations",
                roles: ["admin", "sales_staff", "finance"],
                status: "priority"
            },
            {
                title: "Store Performance",
                description: "Church Store versus Tasty Treats comparison with revenue, transaction count, and average sale value.",
                dataSource: "salesInvoices, salesPaymentsLedger",
                roles: ["admin", "sales_staff", "finance"],
                status: "priority"
            },
            {
                title: "Sales Trend",
                description: "Daily and weekly movement view with period-over-period growth and slowdown indicators.",
                dataSource: "salesInvoices",
                roles: ["admin", "sales_staff", "finance"],
                status: "planned"
            },
            {
                title: "Lead Conversion",
                description: "Open, qualified, ready-to-convert, converted, and sale-voided conversion outcome reporting.",
                dataSource: "leads, salesInvoices",
                roles: ["admin", "sales_staff", "team_lead"],
                status: "planned"
            },
            {
                title: "Consignment Performance",
                description: "Checked out, sold, returned, damaged, gifted, collected, and balance-due insight for consignment activity.",
                dataSource: "consignmentOrdersV2, consignmentPaymentsLedger",
                roles: ["admin", "inventory_manager", "finance"],
                status: "planned"
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
                title: "Inventory Status",
                description: "Out-of-stock, low-stock, medium, and healthy stock analysis with alert detail.",
                dataSource: "productCatalogue, productCategories",
                roles: ["admin", "inventory_manager", "finance"],
                status: "priority"
            },
            {
                title: "Inventory Valuation",
                description: "Inventory at cost, selling value, and potential gross margin using current stock on hand.",
                dataSource: "productCatalogue, purchaseInvoices",
                roles: ["admin", "inventory_manager", "finance"],
                status: "priority"
            },
            {
                title: "Product Performance",
                description: "Top and slow-moving products by quantity sold, revenue contribution, and stock exposure.",
                dataSource: "productCatalogue, salesInvoices",
                roles: ["admin", "inventory_manager", "finance", "sales_staff"],
                status: "planned"
            },
            {
                title: "Reorder Recommendations",
                description: "Suggested replenishment list based on threshold risk, stock depth, and operational urgency.",
                dataSource: "productCatalogue, purchaseInvoices",
                roles: ["admin", "inventory_manager"],
                status: "planned"
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
                title: "Cash Flow Summary",
                description: "Retail inflow, consignment inflow, donation inflow, supplier outflow, and net cash movement.",
                dataSource: "salesPaymentsLedger, supplierPaymentsLedger, consignmentPaymentsLedger, donations",
                roles: ["admin", "finance"],
                status: "priority"
            },
            {
                title: "Outstanding Receivables",
                description: "All unpaid direct-sales and consignment balances grouped by age and collection priority.",
                dataSource: "salesInvoices, consignmentOrdersV2",
                roles: ["admin", "finance"],
                status: "priority"
            },
            {
                title: "Purchase Payables",
                description: "Supplier invoice totals, paid amount, overdue balances, and pending obligations by supplier.",
                dataSource: "purchaseInvoices, supplierPaymentsLedger, suppliers",
                roles: ["admin", "finance", "inventory_manager"],
                status: "planned"
            },
            {
                title: "Profit and Loss",
                description: "Period profitability summary across sales, donations, expenses, and supplier-side cost activity.",
                dataSource: "salesInvoices, purchaseInvoices, donations",
                roles: ["admin", "finance"],
                status: "planned"
            }
        ]
    }
];

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

function getStatusLabel(status) {
    return status === "priority" ? "Priority" : "Planned";
}

function renderReportCard(report) {
    return `
        <article class="report-definition-card">
            <div class="report-definition-head">
                <h4>${report.title}</h4>
                <span class="report-definition-status tone-${report.status}">${getStatusLabel(report.status)}</span>
            </div>
            <p>${report.description}</p>
            <div class="report-definition-meta">
                <span><strong>Data source:</strong> ${report.dataSource}</span>
                <span><strong>Access:</strong> ${report.roles.map(formatRoleLabel).join(", ")}</span>
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

export function renderReportsView(user) {
    const root = document.getElementById("reports-root");
    if (!root) return;

    if (!user) {
        root.innerHTML = `
            <section class="panel-card reports-empty-card">
                <h2 class="hero-title">Reports</h2>
                <p class="hero-copy">Login to view role-based report groups and reporting access.</p>
            </section>
        `;
        return;
    }

    const visibleGroups = getVisibleReportGroups(user);
    const groupNames = visibleGroups.map(group => group.badge);

    root.innerHTML = `
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
                    <span class="status-pill">Next Step: Wire detail pages and exports</span>
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
