import { getState, subscribe } from "../../app/store.js";
import { initializeAssistantUi, renderAssistantView } from "./view.js";

let isInitialized = false;

export function initializeAssistantModule() {
    if (isInitialized) return;

    isInitialized = true;
    initializeAssistantUi(getState().currentUser, getState().currentRoute);
    subscribe(snapshot => {
        initializeAssistantUi(snapshot.currentUser, snapshot.currentRoute);
    });
}

export function showAssistantPage(user) {
    renderAssistantView(user);
}
