import { initializeLeadsFeature, renderLeadQuotesView, renderLeadsView } from "./view.js";

export function initializeLeadsModule() {
    initializeLeadsFeature();
}

export function showLeadsPage() {
    renderLeadsView();
}

export function showLeadQuotesPage() {
    renderLeadQuotesView();
}
