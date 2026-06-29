import { initializeAdminModulesFeature, renderAdminModulesView } from "./view.js?v=20260629-country-currency-admin-2";

export function initializeAdminModulesModule() {
    initializeAdminModulesFeature();
}

export function showAdminModulesPage() {
    renderAdminModulesView();
}
