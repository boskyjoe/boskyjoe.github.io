import { navConfig } from "../config/nav-config.js";
import { navigateTo } from "./router.js";
import { getState } from "./store.js";
import { getThemeMode, syncThemeControlState, THEME_CHANGE_EVENT } from "./theme.js";
import { icons } from "../shared/icons.js";

function renderSidebarLinks(user) {
    const nav = document.createElement("nav");
    nav.className = "sidebar-nav";
    const { currentRoute } = getState();

    const visibleNavItems = user
        ? navConfig.filter(item => {
            if (item.type === "heading") {
                return !item.roles || item.roles.includes(user.role);
            }

            return item.enabled !== false && (!item.roles || item.roles.includes(user.role));
        })
        : navConfig.filter(item => item.type === "link" && item.route === "#/home" && item.enabled !== false);

    visibleNavItems.forEach(item => {
        if (item.type === "heading") {
            const heading = document.createElement("div");
            heading.className = "sidebar-heading";
            heading.textContent = item.label;
            nav.appendChild(heading);
            return;
        }

        const link = document.createElement("a");
        link.href = item.route;
        link.className = `sidebar-link${currentRoute === item.route ? " active" : ""}`;
        link.innerHTML = `
            <span class="nav-icon ${item.iconClass || ""}">${item.icon || icons.dashboard}</span>
            <span class="nav-label">${item.label}</span>
        `;
        link.addEventListener("click", event => {
            event.preventDefault();
            navigateTo(item.route);
            document.getElementById("app-sidebar")?.classList.remove("open");
        });
        nav.appendChild(link);
    });

    return nav;
}

function renderAuthSlot(user) {
    const authSlot = document.getElementById("auth-slot");
    if (!authSlot) return;

    authSlot.innerHTML = "";

    const themeSwitcher = document.createElement("div");
    themeSwitcher.className = "theme-switch";
    themeSwitcher.innerHTML = `
        <div class="theme-switch-row">
            <div class="theme-switch-label">
                <span class="theme-switch-label-icon">${icons.settings}</span>
                <span class="theme-switch-label-text">Theme</span>
            </div>
            <div class="theme-switch-segmented" role="group" aria-label="Choose Moneta theme">
                <button
                    class="theme-switch-button"
                    type="button"
                    data-theme-mode-control="light"
                    aria-label="Use light theme"
                    title="Light theme">
                    <span class="theme-switch-button-icon">${icons.sun}</span>
                </button>
                <button
                    class="theme-switch-button"
                    type="button"
                    data-theme-mode-control="dark"
                    aria-label="Use dark theme"
                    title="Dark theme">
                    <span class="theme-switch-button-icon">${icons.moon}</span>
                </button>
                <button
                    class="theme-switch-button"
                    type="button"
                    data-theme-mode-control="system"
                    aria-label="Follow system theme"
                    title="System theme">
                    <span class="theme-switch-button-icon">${icons.settings}</span>
                </button>
            </div>
        </div>
    `;
    authSlot.appendChild(themeSwitcher);

    if (!user) {
        syncThemeControlState(authSlot);
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "auth-card";

    const meta = document.createElement("div");
    meta.className = "auth-meta";
    meta.innerHTML = `
        <span class="auth-name">${user.displayName || "Unknown User"}</span>
        <span class="auth-role">${user.role || "guest"}</span>
    `;

    const avatar = document.createElement("img");
    avatar.className = "auth-avatar";
    avatar.src = user.photoURL || "https://placehold.co/64x64";
    avatar.alt = "User avatar";

    const logoutButton = document.createElement("button");
    logoutButton.className = "button button-secondary";
    logoutButton.id = "logout-button";
    logoutButton.type = "button";
    logoutButton.textContent = "Logout";

    wrapper.append(meta, avatar, logoutButton);
    authSlot.appendChild(wrapper);
    syncThemeControlState(authSlot);
}

function renderFooter() {
    const footer = document.getElementById("app-footer");
    if (!footer) return;

    const currentYear = new Date().getFullYear();

    footer.innerHTML = `
        <div class="app-footer-accent"></div>
        <div class="app-footer-inner">
            <div class="app-footer-main">
                <div class="app-footer-brand">
                    <span class="app-footer-brand-mark">${icons.monetaBrand}</span>
                    <div>
                        <p class="app-footer-brand-title">MONETA</p>
                        <p class="app-footer-brand-copy">Smart POS Solutions</p>
                    </div>
                </div>

                <div class="app-footer-center">
                    <p class="app-footer-copy">Copyright &copy; ${currentYear} <a class="app-footer-link" href="https://strategictattva.com" target="_blank" rel="noopener noreferrer">strategiccattva.com</a></p>
                    <p class="app-footer-subcopy">All Rights Reserved</p>
                </div>

                <div class="app-footer-powered">
                    <span class="app-footer-powered-label">Powered by</span>
                    <strong>DataWings Solution</strong>
                </div>
            </div>

            <div class="app-footer-meta">
                <span>Version 1.0.0</span>
                <span>Built with care for business excellence</span>
                <span>Last updated: ${currentYear}</span>
            </div>
        </div>
    `;
}

export function renderShell({ title }) {
    const sidebar = document.getElementById("app-sidebar");
    const titleNode = document.getElementById("view-title");
    const { currentUser } = getState();

    if (sidebar) {
        sidebar.innerHTML = "";

        const brand = document.createElement("div");
        brand.className = "sidebar-brand";
        brand.innerHTML = `
            <span class="brand-mark">${icons.monetaBrand}</span>
            <h1>MONETA</h1>
            <p>Smart POS Solutions</p>
        `;

        sidebar.append(brand, renderSidebarLinks(currentUser));
    }

    if (titleNode) {
        titleNode.textContent = title;
    }

    renderAuthSlot(currentUser);
    renderFooter();
}

export function initializeShell() {
    document.getElementById("mobile-nav-toggle")?.addEventListener("click", () => {
        document.getElementById("app-sidebar")?.classList.toggle("open");
    });

    window.addEventListener(THEME_CHANGE_EVENT, () => {
        syncThemeControlState(document.getElementById("auth-slot") || document);
    });
}
