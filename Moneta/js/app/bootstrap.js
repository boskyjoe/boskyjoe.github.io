import { firebaseConfig } from "../config/firebase-config.js";
import { initializeAuth, loginWithGoogle, logout } from "./auth.js";
import { initializeRouter } from "./router.js";
import { initializeShell } from "./shell.js";
import { detachMasterData, initializeMasterData } from "./master-data.js";
import { subscribe } from "./store.js";
import { initializeSuppliersModule } from "../features/suppliers/index.js";

function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}

function bindGlobalUiEvents() {
    document.addEventListener("click", async event => {
        const target = event.target;

        if (target.closest("#login-button")) {
            try {
                await loginWithGoogle();
            } catch (error) {
                console.error("[Moneta] Login failed:", error);
            }
        }

        if (target.closest("#logout-button")) {
            try {
                await logout();
            } catch (error) {
                console.error("[Moneta] Logout failed:", error);
            }
        }
    });
}

function initializeDebugSubscription() {
    subscribe(snapshot => {
        console.debug("[Moneta] State update:", snapshot);
    });
}

function initializeDataLifecycle() {
    let hasActiveSession = false;
    let isTransitioning = false;

    subscribe(snapshot => {
        if (isTransitioning) return;

        const isAuthenticated = Boolean(snapshot.currentUser);

        if (isAuthenticated && !hasActiveSession) {
            isTransitioning = true;
            hasActiveSession = true;
            initializeMasterData();
            isTransitioning = false;
        }

        if (!isAuthenticated && hasActiveSession) {
            isTransitioning = true;
            hasActiveSession = false;
            detachMasterData();
            isTransitioning = false;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeFirebase();
    initializeShell();
    initializeSuppliersModule();
    initializeRouter();
    initializeAuth();
    bindGlobalUiEvents();
    initializeDebugSubscription();
    initializeDataLifecycle();
});
