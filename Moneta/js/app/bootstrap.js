import { firebaseConfig } from "../config/firebase-config.js";
import { initializeAuth, loginWithGoogle, logout } from "./auth.js";
import { initializeRouter } from "./router.js";
import { initializeShell } from "./shell.js";
import { detachMasterData, initializeMasterData } from "./master-data.js";
import { subscribe } from "./store.js";
import { initializeSuppliersModule } from "../features/suppliers/index.js";
import { initializeProductsModule } from "../features/products/index.js";
import { initializeSalesCataloguesModule } from "../features/sales-catalogues/index.js";
import { initializeAdminModulesModule } from "../features/admin-modules/index.js";
import { initializePurchasesModule } from "../features/purchases/index.js";
import { initializeUserManagementModule } from "../features/user-management/index.js";
import { initializeLeadsModule } from "../features/leads/index.js";
import { initializeRetailStoreModule } from "../features/retail-store/index.js";
import { initializeSimpleConsignmentModule } from "../features/simple-consignment/index.js";
import { initializeHomeModule } from "../features/home/index.js";
import { initializeDisabledActionTooltips } from "../shared/disabled-actions.js";

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
    initializeProductsModule();
    initializeSalesCataloguesModule();
    initializeAdminModulesModule();
    initializePurchasesModule();
    initializeUserManagementModule();
    initializeLeadsModule();
    initializeRetailStoreModule();
    initializeSimpleConsignmentModule();
    initializeHomeModule();
    initializeRouter();
    initializeAuth();
    initializeDisabledActionTooltips();
    bindGlobalUiEvents();
    initializeDebugSubscription();
    initializeDataLifecycle();
});
