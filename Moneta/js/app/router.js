import { DEFAULT_AUTH_ROUTE, LOGIN_ROUTE } from "../config/constants.js";
import { getState, setState } from "./store.js";
import { renderShell } from "./shell.js";
import { renderDashboardView } from "../features/dashboard/view.js";
import { navConfig } from "../config/nav-config.js";
import { showSuppliersPage } from "../features/suppliers/index.js";
import { showProductsPage } from "../features/products/index.js";
import { showSalesCataloguesPage } from "../features/sales-catalogues/index.js";
import { showAdminModulesPage } from "../features/admin-modules/index.js";
import { showPurchasesPage } from "../features/purchases/index.js";
import { showUserManagementPage } from "../features/user-management/index.js";
import { showLeadsPage } from "../features/leads/index.js";
import { showRetailStorePage } from "../features/retail-store/index.js";
import { showHomePage } from "../features/home/index.js";

const ROUTE_TO_VIEW = {
    "#/login": "login-view",
    "#/home": "home-view",
    "#/dashboard": "dashboard-view",
    "#/leads": "leads-view",
    "#/retail-store": "retail-store-view",
    "#/suppliers": "suppliers-view",
    "#/products": "products-view",
    "#/sales-catalogues": "sales-catalogues-view",
    "#/admin-modules": "admin-modules-view",
    "#/purchases": "purchases-view",
    "#/user-management": "user-management-view"
};

function normalizeRoute(route) {
    if (!route || route === "#") return DEFAULT_AUTH_ROUTE;
    return ROUTE_TO_VIEW[route] ? route : DEFAULT_AUTH_ROUTE;
}

function hasRouteAccess(route, user) {
    if (route === LOGIN_ROUTE || route === DEFAULT_AUTH_ROUTE) return true;
    if (!user) return false;

    const navItem = navConfig.find(item => item.type !== "heading" && item.route === route);
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
        case "#/leads":
            return "Leads & Enquiries";
        case "#/retail-store":
            return "Retail Store";
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
    window.location.hash = route;
}

export function resolveRoute() {
    const snapshot = getState();
    const incomingRoute = normalizeRoute(window.location.hash);
    const user = snapshot.currentUser;

    let route = !user
        ? DEFAULT_AUTH_ROUTE
        : incomingRoute === LOGIN_ROUTE
            ? DEFAULT_AUTH_ROUTE
            : incomingRoute;

    if (!hasRouteAccess(route, user)) {
        route = DEFAULT_AUTH_ROUTE;
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

    if (route === "#/suppliers") {
        showSuppliersPage();
    }

    if (route === "#/leads") {
        showLeadsPage();
    }

    if (route === "#/retail-store") {
        showRetailStorePage();
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
