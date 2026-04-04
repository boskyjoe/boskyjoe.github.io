import { DEFAULT_AUTH_ROUTE, LOGIN_ROUTE } from "../config/constants.js";
import { getState, setState } from "./store.js";
import { renderShell } from "./shell.js";
import { renderDashboardView } from "../features/dashboard/view.js";
import { navConfig } from "../config/nav-config.js";
import { showSuppliersPage } from "../features/suppliers/index.js";

const ROUTE_TO_VIEW = {
    "#/login": "login-view",
    "#/dashboard": "dashboard-view",
    "#/suppliers": "suppliers-view",
    "#/products": "products-view",
    "#/purchases": "purchases-view"
};

function normalizeRoute(route) {
    if (!route || route === "#") return LOGIN_ROUTE;
    return ROUTE_TO_VIEW[route] ? route : LOGIN_ROUTE;
}

function hasRouteAccess(route, user) {
    if (route === LOGIN_ROUTE) return true;
    if (!user) return false;

    const navItem = navConfig.find(item => item.route === route);
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
        case "#/dashboard":
            return "Dashboard";
        case "#/suppliers":
            return "Suppliers";
        case "#/products":
            return "Products";
        case "#/purchases":
            return "Purchases";
        default:
            return "Login";
    }
}

export function navigateTo(route) {
    window.location.hash = route;
}

export function resolveRoute() {
    const snapshot = getState();
    const incomingRoute = normalizeRoute(window.location.hash);
    const user = snapshot.currentUser;

    let route = user && user.role !== "guest" && incomingRoute === LOGIN_ROUTE
        ? DEFAULT_AUTH_ROUTE
        : !user
            ? LOGIN_ROUTE
            : incomingRoute;

    if (!hasRouteAccess(route, user)) {
        route = user ? DEFAULT_AUTH_ROUTE : LOGIN_ROUTE;
    }

    setState({ currentRoute: route });
    setActiveView(ROUTE_TO_VIEW[route]);
    renderShell({ title: getViewTitle(route) });

    if (route === "#/dashboard") {
        renderDashboardView(snapshot.currentUser);
    }

    if (route === "#/suppliers") {
        showSuppliersPage();
    }
}

export function initializeRouter() {
    window.addEventListener("hashchange", resolveRoute);
    resolveRoute();
}
