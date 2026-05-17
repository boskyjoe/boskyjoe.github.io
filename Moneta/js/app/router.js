import { DEFAULT_AUTH_ROUTE, LOGIN_ROUTE } from "../config/constants.js";
import { getState, setState } from "./store.js";
import { renderShell } from "./shell.js";
import { renderDashboardView } from "../features/dashboard/view.js";
import { showReportsPage } from "../features/reports/index.js";
import { findNavRouteItem } from "../config/nav-config.js";
import { showSuppliersPage } from "../features/suppliers/index.js";
import { showProductsPage } from "../features/products/index.js";
import { showSalesCataloguesPage } from "../features/sales-catalogues/index.js";
import { showAdminModulesPage } from "../features/admin-modules/index.js";
import { showPurchasesPage } from "../features/purchases/index.js";
import { showUserManagementPage } from "../features/user-management/index.js";
import { showLeadsPage } from "../features/leads/index.js";
import { showPortalRequestsPage } from "../features/portal-requests/index.js";
import { showCustomersPage } from "../features/customers/index.js";
import { showRetailStorePage } from "../features/retail-store/index.js";
import { showSimpleConsignmentPage } from "../features/simple-consignment/index.js";
import { showHomePage } from "../features/home/index.js";
import { showAssistantPage } from "../features/assistant/index.js";

const ROUTE_TO_VIEW = {
    "#/login": "login-view",
    "#/home": "home-view",
    "#/dashboard": "dashboard-view",
    "#/assistant": "assistant-view",
    "#/reports": "reports-view",
    "#/leads": "leads-view",
    "#/portal-requests": "portal-requests-view",
    "#/customers": "customers-view",
    "#/lead-quotes": "lead-quotes-view",
    "#/retail-store": "retail-store-view",
    "#/simple-consignment": "simple-consignment-view",
    "#/suppliers": "suppliers-view",
    "#/products": "products-view",
    "#/sales-catalogues": "sales-catalogues-view",
    "#/admin-modules": "admin-modules-view",
    "#/purchases": "purchases-view",
    "#/user-management": "user-management-view"
};

function canLeaveCurrentRoute(nextRoute) {
    const registry = window.__monetaRouteLeaveGuards;
    if (registry && typeof registry === "object") {
        const currentRoute = getState().currentRoute;
        const guards = Object.values(registry).filter(guard => typeof guard === "function");
        for (const guard of guards) {
            if (guard({ currentRoute, nextRoute }) === false) {
                return false;
            }
        }
    }

    const singleGuard = window.__monetaRouteLeaveGuard;
    if (typeof singleGuard === "function") {
        return singleGuard({
            currentRoute: getState().currentRoute,
            nextRoute
        }) !== false;
    }

    return true;
}

function normalizeRoute(route) {
    if (!route || route === "#") return DEFAULT_AUTH_ROUTE;
    const baseRoute = String(route).split("?")[0];
    if (baseRoute === "#/lead-quotes") {
        return "#/leads";
    }
    return ROUTE_TO_VIEW[baseRoute] ? baseRoute : DEFAULT_AUTH_ROUTE;
}

function hasRouteAccess(route, user) {
    if (route === LOGIN_ROUTE || route === DEFAULT_AUTH_ROUTE) return true;
    if (!user) return false;

    const navItem = findNavRouteItem(route);
    if (!navItem) return route === DEFAULT_AUTH_ROUTE;

    return navItem.roles.includes(user.role);
}

function setActiveView(viewId) {
    document.querySelectorAll(".view").forEach(view => {
        view.classList.toggle("active", view.id === viewId);
    });
}

function getViewTitle(route) {
    switch (route) {
        case "#/home":
            return "Home";
        case "#/dashboard":
            return "Dashboard";
        case "#/assistant":
            return "Assistant";
        case "#/reports":
            return "Reports";
        case "#/leads":
            return "Leads & Enquiries";
        case "#/portal-requests":
            return "Portal Requests";
        case "#/customers":
            return "Customer Master";
        case "#/retail-store":
            return "Retail Store";
        case "#/simple-consignment":
            return "Simple Consignment";
        case "#/suppliers":
            return "Supplier Management";
        case "#/products":
            return "Product Catalogue";
        case "#/sales-catalogues":
            return "Sales Catalogue";
        case "#/admin-modules":
            return "Admin Modules";
        case "#/purchases":
            return "Stock Purchase";
        case "#/user-management":
            return "User Management";
        default:
            return "Home";
    }
}

export function navigateTo(route) {
    const requestedRoute = String(route || "");
    const normalizedRoute = normalizeRoute(requestedRoute);
    const baseRoute = requestedRoute.split("?")[0];
    const resolvedHash = ROUTE_TO_VIEW[baseRoute]
        ? requestedRoute
        : normalizedRoute;

    if (normalizedRoute !== getState().currentRoute && !canLeaveCurrentRoute(normalizedRoute)) {
        return;
    }

    window.location.hash = resolvedHash;
}

export function resolveRoute() {
    const snapshot = getState();
    const requestedHash = window.location.hash || DEFAULT_AUTH_ROUTE;
    const incomingRoute = normalizeRoute(requestedHash);
    const user = snapshot.currentUser;

    let route = !user
        ? DEFAULT_AUTH_ROUTE
        : incomingRoute === LOGIN_ROUTE
            ? DEFAULT_AUTH_ROUTE
            : incomingRoute;

    if (!hasRouteAccess(requestedHash, user)) {
        route = DEFAULT_AUTH_ROUTE;
    }

    if (route !== snapshot.currentRoute && !canLeaveCurrentRoute(route)) {
        if ((window.location.hash || "") !== snapshot.currentRoute) {
            window.location.hash = snapshot.currentRoute;
        }
        return;
    }

    setState({ currentRoute: route });
    setActiveView(ROUTE_TO_VIEW[route]);
    renderShell({ title: getViewTitle(route) });

    if (route === "#/home") {
        showHomePage(snapshot.currentUser);
    }

    if (route === "#/dashboard") {
        renderDashboardView(snapshot.currentUser);
    }

    if (route === "#/assistant") {
        showAssistantPage(snapshot.currentUser);
    }

    if (route === "#/reports") {
        showReportsPage(snapshot.currentUser);
    }

    if (route === "#/suppliers") {
        showSuppliersPage();
    }

    if (route === "#/leads") {
        showLeadsPage();
    }

    if (route === "#/portal-requests") {
        showPortalRequestsPage();
    }

    if (route === "#/customers") {
        showCustomersPage();
    }

    if (route === "#/retail-store") {
        showRetailStorePage();
    }

    if (route === "#/simple-consignment") {
        showSimpleConsignmentPage();
    }

    if (route === "#/products") {
        showProductsPage();
    }

    if (route === "#/sales-catalogues") {
        showSalesCataloguesPage();
    }

    if (route === "#/admin-modules") {
        showAdminModulesPage();
    }

    if (route === "#/purchases") {
        showPurchasesPage();
    }

    if (route === "#/user-management") {
        showUserManagementPage();
    }
}

export function initializeRouter() {
    window.addEventListener("hashchange", resolveRoute);
    resolveRoute();
}
