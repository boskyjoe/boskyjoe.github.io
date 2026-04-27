const THEME_STORAGE_KEY = "moneta-theme-mode";
export const THEME_CHANGE_EVENT = "moneta-theme-change";

const THEME_MODE_LIGHT = "light";
const THEME_MODE_DARK = "dark";
const THEME_MODE_SYSTEM = "system";
const VALID_THEME_MODES = new Set([THEME_MODE_LIGHT, THEME_MODE_DARK, THEME_MODE_SYSTEM]);

let themeMediaQuery = null;
let themeMediaListenerBound = false;

function normalizeThemeMode(mode) {
    return VALID_THEME_MODES.has(mode) ? mode : THEME_MODE_SYSTEM;
}

function getThemeRoot() {
    return document.documentElement;
}

export function getThemeMode() {
    const rootMode = getThemeRoot().dataset.themeMode;
    if (VALID_THEME_MODES.has(rootMode)) {
        return rootMode;
    }

    try {
        return normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
    } catch (error) {
        return THEME_MODE_SYSTEM;
    }
}

export function getResolvedTheme(mode = getThemeMode()) {
    if (normalizeThemeMode(mode) === THEME_MODE_DARK) {
        return THEME_MODE_DARK;
    }

    if (normalizeThemeMode(mode) === THEME_MODE_LIGHT) {
        return THEME_MODE_LIGHT;
    }

    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    return mediaQuery?.matches ? THEME_MODE_DARK : THEME_MODE_LIGHT;
}

export function syncThemeControlState(root = document) {
    const activeMode = getThemeMode();
    const resolvedTheme = getResolvedTheme(activeMode);

    root.querySelectorAll("[data-theme-mode-control]").forEach(button => {
        const buttonMode = normalizeThemeMode(button.getAttribute("data-theme-mode-control"));
        const isActive = buttonMode === activeMode;

        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });

    root.querySelectorAll("[data-theme-mode-label]").forEach(node => {
        node.textContent = activeMode === THEME_MODE_SYSTEM
            ? `System (${resolvedTheme === THEME_MODE_DARK ? "Dark" : "Light"})`
            : activeMode === THEME_MODE_DARK
                ? "Dark"
                : "Light";
    });

    root.querySelectorAll("[data-theme-mode-copy]").forEach(node => {
        node.textContent = `Moneta is currently using ${resolvedTheme === THEME_MODE_DARK ? "dark" : "light"} surfaces.`;
    });
}

export function applyTheme(mode, { persist = true, emit = true } = {}) {
    const normalizedMode = normalizeThemeMode(mode);
    const resolvedTheme = getResolvedTheme(normalizedMode);
    const root = getThemeRoot();

    root.dataset.themeMode = normalizedMode;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;

    if (persist) {
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, normalizedMode);
        } catch (error) {
            console.warn("[Moneta] Could not persist theme mode:", error);
        }
    }

    syncThemeControlState(document);

    if (emit) {
        window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
            detail: {
                mode: normalizedMode,
                resolvedTheme
            }
        }));
    }
}

function bindSystemThemeListener() {
    if (themeMediaListenerBound || !window.matchMedia) return;

    themeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
        if (getThemeMode() === THEME_MODE_SYSTEM) {
            applyTheme(THEME_MODE_SYSTEM, { persist: false, emit: true });
        }
    };

    if (typeof themeMediaQuery.addEventListener === "function") {
        themeMediaQuery.addEventListener("change", handleSystemThemeChange);
    } else if (typeof themeMediaQuery.addListener === "function") {
        themeMediaQuery.addListener(handleSystemThemeChange);
    }

    themeMediaListenerBound = true;
}

export function initializeTheme() {
    applyTheme(getThemeMode(), { persist: false, emit: false });
    bindSystemThemeListener();
}
