import { renderHomeView } from "./view.js";

export function initializeHomeModule() {
    // Home view is render-only for now. Keep module init for feature parity.
}

export function showHomePage(user) {
    renderHomeView(user);
}
