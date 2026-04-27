import { firebaseConfig } from "../config/firebase-config.js";
import { initializeAuth, loginWithGoogle, logout } from "./auth.js";
import { initializeRouter } from "./router.js";
import { initializeShell } from "./shell.js";
import { applyTheme, initializeTheme } from "./theme.js";
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
import { initializeReportsModule } from "../features/reports/index.js";
import { initializeAssistantModule } from "../features/assistant/index.js";
import { initializeDisabledActionTooltips } from "../shared/disabled-actions.js";
import { ensurePricingPolicySeed, ensureStoreConfigSeed, ensureSystemDefaultReorderPolicy } from "../features/admin-modules/service.js";
import { isSystemDefaultReorderPolicy } from "../shared/reorder-policy.js";
import { isSystemDefaultPricingPolicy } from "../shared/pricing-policy.js";

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

        const themeControl = target.closest("[data-theme-mode-control]");
        if (themeControl) {
            const mode = themeControl.getAttribute("data-theme-mode-control");
            applyTheme(mode, { persist: true, emit: true });
        }
    });

    document.addEventListener("change", event => {
        const target = event.target;
        if (!(target instanceof HTMLSelectElement)) return;

        if (target.matches("[data-theme-mode-select]")) {
            applyTheme(target.value, { persist: true, emit: true });
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

function initializeReorderPolicySeedLifecycle() {
    let isEnsuring = false;

    subscribe(async snapshot => {
        if (isEnsuring) return;

        const user = snapshot.currentUser;
        if (!user || user.role !== "admin" || !snapshot.isMasterDataReady) {
            return;
        }

        const hasSystemDefault = (snapshot.masterData.reorderPolicies || []).some(policy => isSystemDefaultReorderPolicy(policy));
        if (hasSystemDefault) {
            return;
        }

        isEnsuring = true;

        try {
            await ensureSystemDefaultReorderPolicy(
                user,
                snapshot.masterData.reorderPolicies,
                snapshot.masterData.categories,
                snapshot.masterData.products
            );
        } catch (error) {
            console.error("[Moneta] Failed to ensure the system default reorder policy:", error);
        } finally {
            isEnsuring = false;
        }
    });
}

function initializeStoreConfigSeedLifecycle() {
    let isEnsuring = false;

    subscribe(async snapshot => {
        if (isEnsuring) return;

        const user = snapshot.currentUser;
        if (!user || user.role !== "admin" || !snapshot.isMasterDataReady) {
            return;
        }

        if ((snapshot.masterData.storeConfigs || []).length > 0) {
            return;
        }

        isEnsuring = true;

        try {
            await ensureStoreConfigSeed(user, snapshot.masterData.storeConfigs);
        } catch (error) {
            console.error("[Moneta] Failed to ensure store configuration seed:", error);
        } finally {
            isEnsuring = false;
        }
    });
}

function initializePricingPolicySeedLifecycle() {
    let isEnsuring = false;

    subscribe(async snapshot => {
        if (isEnsuring) return;

        const user = snapshot.currentUser;
        if (!user || user.role !== "admin" || !snapshot.isMasterDataReady) {
            return;
        }

        const hasSystemDefault = (snapshot.masterData.pricingPolicies || []).some(policy => isSystemDefaultPricingPolicy(policy));
        if (hasSystemDefault) {
            return;
        }

        isEnsuring = true;

        try {
            await ensurePricingPolicySeed(user, snapshot.masterData.pricingPolicies);
        } catch (error) {
            console.error("[Moneta] Failed to ensure pricing policy seed:", error);
        } finally {
            isEnsuring = false;
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initializeFirebase();
    initializeTheme();
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
    initializeAssistantModule();
    initializeReportsModule();
    initializeRouter();
    initializeAuth();
    initializeDisabledActionTooltips();
    bindGlobalUiEvents();
    initializeDebugSubscription();
    initializeDataLifecycle();
    initializePricingPolicySeedLifecycle();
    initializeStoreConfigSeedLifecycle();
    initializeReorderPolicySeedLifecycle();
});
