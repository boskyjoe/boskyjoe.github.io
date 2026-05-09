import { initializeCustomersFeature, renderCustomersView } from "./view.js";

export function initializeCustomersModule() {
    initializeCustomersFeature();
}

export function showCustomersPage() {
    renderCustomersView();
}
