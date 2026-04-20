import { initializeLeadsFeature, renderLeadsView } from "./view.js";

export function initializeLeadsModule() {
    initializeLeadsFeature();
}

export function showLeadsPage() {
    renderLeadsView();
}
