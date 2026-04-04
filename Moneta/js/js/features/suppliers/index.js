import { initializeSuppliersFeature, renderSuppliersView } from "./view.js";

export function initializeSuppliersModule() {
    initializeSuppliersFeature();
}

export function showSuppliersPage() {
    renderSuppliersView();
}
