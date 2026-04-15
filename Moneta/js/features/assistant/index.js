import { renderAssistantView } from "./view.js";

export function initializeAssistantModule() {
    // Assistant is render-driven for now.
}

export function showAssistantPage(user) {
    renderAssistantView(user);
}
