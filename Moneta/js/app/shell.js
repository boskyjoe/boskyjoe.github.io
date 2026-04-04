import { navConfig } from "../config/nav-config.js";
import { navigateTo } from "./router.js";
import { getState } from "./store.js";
import { icons } from "../shared/icons.js";

function renderSidebarLinks(user) {
    const nav = document.createElement("nav");
    nav.className = "sidebar-nav";

    navConfig
        .filter(item => !user || item.roles.includes(user.role))
        .forEach(item => {
            const link = document.createElement("a");
            link.href = item.route;
            link.className = `sidebar-link${window.location.hash === item.route ? " active" : ""}`;
            link.innerHTML = `
                <span class="nav-icon">${item.icon || icons.dashboard}</span>
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
    if (!user) return;

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
            <span class="brand-mark">${icons.catalogue}</span>
            <h1>MONETA</h1>
            <p>Modular GitHub-hosted rebuild</p>
        `;

        sidebar.append(brand, renderSidebarLinks(currentUser));
    }

    if (titleNode) {
        titleNode.textContent = title;
    }

    renderAuthSlot(currentUser);
}

export function initializeShell() {
    document.getElementById("mobile-nav-toggle")?.addEventListener("click", () => {
        document.getElementById("app-sidebar")?.classList.toggle("open");
    });
}
