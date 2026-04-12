import { renderReportsView } from "./view.js";

export function initializeReportsModule() {
    // Reports hub is render-only for now. Keep init for feature parity.
}

export function showReportsPage(user) {
    renderReportsView(user);
}
