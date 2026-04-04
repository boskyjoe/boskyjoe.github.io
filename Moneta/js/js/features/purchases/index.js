import { initializePurchasesFeature, renderPurchasesView } from "./view.js";

export function initializePurchasesModule() {
    initializePurchasesFeature();
}

export function showPurchasesPage() {
    renderPurchasesView();
}
