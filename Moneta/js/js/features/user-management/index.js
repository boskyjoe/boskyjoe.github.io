import { initializeUserManagementFeature, renderUserManagementView } from "./view.js";

export function initializeUserManagementModule() {
    initializeUserManagementFeature();
}

export function showUserManagementPage() {
    renderUserManagementView();
}
