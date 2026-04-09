import { icons } from "../../shared/icons.js";

export function renderHomeView(user) {
    const root = document.getElementById("home-root");
    if (!root) return;

    const displayName = user?.displayName || "Team";

    root.innerHTML = `
        <section class="panel-card home-page-shell">
            <div class="home-page-hero">
                <h2>Welcome to <span>MONETA</span></h2>
                <p>Your all-in-one solution for Point of Sale, Inventory Management, and Financial Reporting.</p>
                <div class="home-hero-actions">
                    <a class="button button-primary home-cta-button" href="#/dashboard">Open Dashboard</a>
                </div>
            </div>

            <div class="home-page-section">
                <div class="home-page-section-head">
                    <h3>A Seamless Workflow</h3>
                    <p>From product creation to final sale, MONETA streamlines every step.</p>
                </div>
                <div class="home-workflow-grid">
                    <article class="home-workflow-step">
                        <div class="home-workflow-icon home-workflow-icon-blue">${icons.products}</div>
                        <h4>1. Create & Organize</h4>
                        <p>Define master products and group them into strategic sales catalogues.</p>
                    </article>
                    <article class="home-workflow-step">
                        <div class="home-workflow-icon home-workflow-icon-violet">${icons.purchases}</div>
                        <h4>2. Procure & Stock</h4>
                        <p>Manage suppliers and record purchase invoices to automatically update inventory levels.</p>
                    </article>
                    <article class="home-workflow-step">
                        <div class="home-workflow-icon home-workflow-icon-green">${icons.retail}</div>
                        <h4>3. Sell & Distribute</h4>
                        <p>Handle direct retail sales and distribution flows with controlled operational tracking.</p>
                    </article>
                    <article class="home-workflow-step">
                        <div class="home-workflow-icon home-workflow-icon-rose">${icons.dashboard}</div>
                        <h4>4. Analyze & Grow</h4>
                        <p>Track payments, manage finances, and generate reports to guide growth decisions.</p>
                    </article>
                </div>
            </div>

            <div class="home-page-section home-modules-section">
                <div class="home-page-section-head">
                    <h3>Explore the Modules</h3>
                    <p>A complete suite of tools to run your business efficiently.</p>
                </div>
                <div class="home-modules-grid">
                    <article class="home-module-card">
                        <div class="home-module-head">
                            <span class="home-module-icon nav-icon nav-icon-cyan">${icons.leads}</span>
                            <div>
                                <p class="home-module-label">Pre-Sales</p>
                                <h4>Enquiries</h4>
                            </div>
                        </div>
                        <p>Capture prospects, track context, and build qualified opportunities.</p>
                    </article>
                    <article class="home-module-card">
                        <div class="home-module-head">
                            <span class="home-module-icon nav-icon nav-icon-cyan">${icons.retail}</span>
                            <div>
                                <p class="home-module-label">Direct Sales</p>
                                <h4>Retail Store</h4>
                            </div>
                        </div>
                        <p>Execute store transactions, returns, expenses, and payments in one flow.</p>
                    </article>
                    <article class="home-module-card">
                        <div class="home-module-head">
                            <span class="home-module-icon nav-icon nav-icon-orange">${icons.purchases}</span>
                            <div>
                                <p class="home-module-label">Inventory</p>
                                <h4>Stock Purchase</h4>
                            </div>
                        </div>
                        <p>Post supplier invoices and keep stock movement and valuation synchronized.</p>
                    </article>
                    <article class="home-module-card">
                        <div class="home-module-head">
                            <span class="home-module-icon nav-icon nav-icon-violet">${icons.products}</span>
                            <div>
                                <p class="home-module-label">Store Admin</p>
                                <h4>Product Catalogue</h4>
                            </div>
                        </div>
                        <p>Manage product definitions, activation lifecycle, and pricing anchors.</p>
                    </article>
                    <article class="home-module-card">
                        <div class="home-module-head">
                            <span class="home-module-icon nav-icon nav-icon-cyan">${icons.catalogue}</span>
                            <div>
                                <p class="home-module-label">Store Admin</p>
                                <h4>Sales Catalogue</h4>
                            </div>
                        </div>
                        <p>Publish season-driven assortments for sales and operations teams.</p>
                    </article>
                    <article class="home-module-card">
                        <div class="home-module-head">
                            <span class="home-module-icon nav-icon nav-icon-amber">${icons.suppliers}</span>
                            <div>
                                <p class="home-module-label">Store Admin</p>
                                <h4>Supplier Management</h4>
                            </div>
                        </div>
                        <p>Maintain supplier records, lifecycle status, and business contact integrity.</p>
                    </article>
                    <article class="home-module-card">
                        <div class="home-module-head">
                            <span class="home-module-icon nav-icon nav-icon-cyan">${icons.settings}</span>
                            <div>
                                <p class="home-module-label">System</p>
                                <h4>Admin Modules</h4>
                            </div>
                        </div>
                        <p>Configure controlled master data and settings that drive downstream workflows.</p>
                    </article>
                    <article class="home-module-card">
                        <div class="home-module-head">
                            <span class="home-module-icon nav-icon nav-icon-amber">${icons.users}</span>
                            <div>
                                <p class="home-module-label">System</p>
                                <h4>User Management</h4>
                            </div>
                        </div>
                        <p>Assign access roles and keep multi-user permissions aligned with governance.</p>
                    </article>
                </div>
            </div>

            <div class="home-page-footer-note">
                Logged in as <strong>${displayName}</strong>
            </div>
        </section>
    `;
}
