import { formatCurrency } from "../../shared/utils/currency.js";

export function renderDashboardView(user) {
    const root = document.getElementById("dashboard-root");
    if (!root) return;

    const displayName = user?.displayName || "Guest";
    const role = user?.role || "guest";

    root.innerHTML = `
        <div class="hero-card">
            <p class="hero-kicker">Phase 1 Dashboard</p>
            <h2 class="hero-title">Welcome, ${displayName}</h2>
            <p class="hero-copy">
                This is the new MONETA shell running as a static GitHub-friendly Firebase app.
                The next steps are feature migration, beginning with suppliers, products, and purchases.
            </p>
            <div class="status-pill">Role: ${role}</div>
        </div>
        <div class="dashboard-grid" style="margin-top: 1rem;">
            <article class="dashboard-card">
                <p class="dashboard-label">Migration Scope</p>
                <p class="dashboard-value">Phase 1</p>
            </article>
            <article class="dashboard-card">
                <p class="dashboard-label">Current Focus</p>
                <p class="dashboard-value">Shell</p>
            </article>
            <article class="dashboard-card">
                <p class="dashboard-label">Currency Helper Check</p>
                <p class="dashboard-value">${formatCurrency(0)}</p>
            </article>
        </div>
    `;
}
