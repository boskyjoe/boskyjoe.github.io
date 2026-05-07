import { initializePortalRequestsFeature, renderPortalRequestsView } from "./view.js";

export function initializePortalRequestsModule() {
    initializePortalRequestsFeature();
}

export function showPortalRequestsPage() {
    renderPortalRequestsView();
}
