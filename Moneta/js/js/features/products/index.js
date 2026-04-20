import { initializeProductsFeature, renderProductsView } from "./view.js";

export function initializeProductsModule() {
    initializeProductsFeature();
}

export function showProductsPage() {
    renderProductsView();
}
