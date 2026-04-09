export function renderHomeView(user) {
    const root = document.getElementById("home-root");
    if (!root) return;

    const displayName = user?.displayName || "Team";

    root.innerHTML = `
        <section class="hero-card home-hero">
            <p class="hero-kicker">Welcome</p>
            <h2 class="hero-title">MONETA Home</h2>
            <p class="hero-copy">
                Hi ${displayName}. This is your landing workspace for MONETA with the core business workflow and module map.
            </p>
            <div class="hero-actions">
                <a class="button button-primary" href="#/dashboard">Open Dashboard</a>
            </div>
        </section>

        <section class="panel-card home-section" style="margin-top: 1rem;">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <div>
                        <h3>Core Workflow</h3>
                        <p class="panel-copy">From catalog setup to sales and analytics.</p>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                <div class="home-workflow-grid">
                    <article class="dashboard-card home-workflow-card">
                        <p class="dashboard-label">Step 1</p>
                        <p class="dashboard-value home-step-title">Create & Organize</p>
                        <p class="panel-copy">Build master products and curate sales catalogues for different seasons and campaigns.</p>
                    </article>
                    <article class="dashboard-card home-workflow-card">
                        <p class="dashboard-label">Step 2</p>
                        <p class="dashboard-value home-step-title">Procure & Stock</p>
                        <p class="panel-copy">Capture supplier purchases and keep inventory accurate with transaction-safe updates.</p>
                    </article>
                    <article class="dashboard-card home-workflow-card">
                        <p class="dashboard-label">Step 3</p>
                        <p class="dashboard-value home-step-title">Sell & Distribute</p>
                        <p class="panel-copy">Run retail sales and operational flows with structured controls and traceable actions.</p>
                    </article>
                    <article class="dashboard-card home-workflow-card">
                        <p class="dashboard-label">Step 4</p>
                        <p class="dashboard-value home-step-title">Analyze & Grow</p>
                        <p class="panel-copy">Use reporting and financial insights to improve turnover, margin, and execution quality.</p>
                    </article>
                </div>
            </div>
        </section>

        <section class="panel-card home-section" style="margin-top: 1rem;">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <div>
                        <h3>Module Overview</h3>
                        <p class="panel-copy">The same business areas from TrinityCart, now in Moneta's modular shell.</p>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                <div class="home-modules-grid">
                    <article class="dashboard-card"><p class="dashboard-label">Pre-Sales</p><p class="dashboard-value home-module-title">Enquiries</p></article>
                    <article class="dashboard-card"><p class="dashboard-label">Direct Sales</p><p class="dashboard-value home-module-title">Retail Store</p></article>
                    <article class="dashboard-card"><p class="dashboard-label">Inventory</p><p class="dashboard-value home-module-title">Stock Purchase</p></article>
                    <article class="dashboard-card"><p class="dashboard-label">Store Admin</p><p class="dashboard-value home-module-title">Products, Catalogues, Suppliers</p></article>
                    <article class="dashboard-card"><p class="dashboard-label">System</p><p class="dashboard-value home-module-title">Admin Modules</p></article>
                    <article class="dashboard-card"><p class="dashboard-label">Security</p><p class="dashboard-value home-module-title">User Management</p></article>
                </div>
            </div>
        </section>
    `;
}
