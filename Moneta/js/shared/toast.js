const SIMPLE_TOAST_TIMEOUT_MS = 3200;
const PROGRESS_HIDE_DELAY_MS = 1400;

const TOAST_LABELS = {
    info: "Working",
    success: "Completed",
    warning: "Attention",
    error: "Action Needed"
};

const TOAST_ICONS = {
    loading: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" opacity="0.22"></circle>
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"></path>
        </svg>
    `,
    success: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m5 13 4 4L19 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `,
    info: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle>
            <path d="M12 10v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
            <circle cx="12" cy="7.3" r="1.1" fill="currentColor"></circle>
        </svg>
    `,
    warning: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4 20 19H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"></path>
            <path d="M12 9v4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
            <circle cx="12" cy="16.8" r="1" fill="currentColor"></circle>
        </svg>
    `,
    error: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"></circle>
            <path d="M9 9l6 6M15 9l-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
        </svg>
    `,
    close: `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
        </svg>
    `
};

const progressState = {
    hideTimer: null
};

function ensureToastInfrastructure() {
    const root = document.getElementById("toast-root");
    if (!root) return null;

    if (root.dataset.enhancedToast === "true") {
        return {
            root,
            progressToast: document.getElementById("progress-toast"),
            toastStack: document.getElementById("toast-stack")
        };
    }

    root.innerHTML = `
        <div id="progress-toast" class="progress-toast" aria-live="polite" aria-hidden="true">
            <div id="progress-toast-card" class="progress-toast-card" data-theme="info">
                <div class="progress-toast-accent"></div>
                <button id="progress-toast-close" class="progress-toast-close" type="button" aria-label="Close notification">
                    ${TOAST_ICONS.close}
                </button>
                <div class="progress-toast-main">
                    <div id="progress-toast-icon-shell" class="progress-toast-icon-shell" data-theme="info">
                        <span id="progress-toast-icon" class="progress-toast-icon">${TOAST_ICONS.loading}</span>
                    </div>
                    <div class="progress-toast-content">
                        <div class="progress-toast-topline">
                            <h3 id="progress-toast-title" class="progress-toast-title">Working</h3>
                            <span id="progress-toast-percentage" class="progress-toast-percentage">0%</span>
                        </div>
                        <p id="progress-toast-message" class="progress-toast-message">Preparing the workspace...</p>
                        <div class="progress-toast-meta">
                            <span id="progress-toast-step" class="progress-toast-step">Initializing</span>
                            <span id="progress-toast-status" class="progress-toast-status">In progress</span>
                        </div>
                        <div class="progress-toast-track">
                            <div id="progress-toast-progress" class="progress-toast-progress"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="toast-stack" class="toast-stack" aria-live="polite" aria-atomic="true"></div>
    `;

    root.dataset.enhancedToast = "true";
    root.querySelector("#progress-toast-close")?.addEventListener("click", () => ProgressToast.hide(0));

    return {
        root,
        progressToast: document.getElementById("progress-toast"),
        toastStack: document.getElementById("toast-stack")
    };
}

function clampProgress(value) {
    return Math.max(0, Math.min(100, Number(value) || 0));
}

function getProgressElements() {
    ensureToastInfrastructure();

    return {
        toast: document.getElementById("progress-toast"),
        card: document.getElementById("progress-toast-card"),
        iconShell: document.getElementById("progress-toast-icon-shell"),
        icon: document.getElementById("progress-toast-icon"),
        title: document.getElementById("progress-toast-title"),
        message: document.getElementById("progress-toast-message"),
        step: document.getElementById("progress-toast-step"),
        status: document.getElementById("progress-toast-status"),
        progress: document.getElementById("progress-toast-progress"),
        percentage: document.getElementById("progress-toast-percentage")
    };
}

function clearProgressHideTimer() {
    if (progressState.hideTimer) {
        window.clearTimeout(progressState.hideTimer);
        progressState.hideTimer = null;
    }
}

function setProgressTheme(theme = "info") {
    const { card, iconShell } = getProgressElements();
    if (!card || !iconShell) return;

    card.dataset.theme = theme;
    iconShell.dataset.theme = theme;
}

function setProgressIcon(kind = "loading") {
    const { icon } = getProgressElements();
    if (!icon) return;
    icon.innerHTML = TOAST_ICONS[kind] || TOAST_ICONS.loading;
}

function setProgressVisibility(isVisible) {
    const { toast } = getProgressElements();
    if (!toast) return;

    toast.classList.toggle("visible", isVisible);
    toast.setAttribute("aria-hidden", isVisible ? "false" : "true");
}

function createStackToast(message, type, options = {}) {
    const title = options.title || TOAST_LABELS[type] || TOAST_LABELS.info;
    const iconMarkup = TOAST_ICONS[type] || TOAST_ICONS.info;
    const toast = document.createElement("article");

    toast.className = "toast";
    toast.dataset.theme = type;
    toast.innerHTML = `
        <div class="toast-accent"></div>
        <div class="toast-main">
            <div class="toast-icon-shell" data-theme="${type}">
                <span class="toast-icon">${iconMarkup}</span>
            </div>
            <div class="toast-copy">
                <p class="toast-title">${title}</p>
                <p class="toast-message">${message}</p>
            </div>
        </div>
    `;

    return toast;
}

export const ProgressToast = {
    show(title, theme = "info") {
        clearProgressHideTimer();

        const elements = getProgressElements();
        if (!elements.toast) return;

        setProgressTheme(theme);
        setProgressIcon(theme === "success" ? "success" : theme === "error" ? "error" : theme === "warning" ? "warning" : "loading");

        elements.title.textContent = title || TOAST_LABELS[theme] || "Working";
        elements.message.textContent = "Preparing the workspace...";
        elements.step.textContent = "Initializing";
        elements.status.textContent = theme === "error" ? "Needs attention" : "In progress";
        elements.percentage.textContent = "0%";
        elements.progress.style.width = "0%";

        setProgressVisibility(true);
    },

    updateProgress(message, percentage = 0, stepInfo = "") {
        const elements = getProgressElements();
        if (!elements.toast) return;

        const progressValue = clampProgress(percentage);
        elements.message.textContent = message || "Working...";
        elements.step.textContent = stepInfo || `${progressValue}% complete`;
        elements.status.textContent = progressValue >= 100 ? "Completed" : "In progress";
        elements.percentage.textContent = `${Math.round(progressValue)}%`;
        elements.progress.style.width = `${progressValue}%`;

        setProgressIcon(progressValue >= 100 ? "success" : "loading");
        setProgressVisibility(true);
    },

    showSuccess(message, title = "Completed") {
        const elements = getProgressElements();
        if (!elements.toast) return;

        clearProgressHideTimer();
        setProgressTheme("success");
        setProgressIcon("success");
        elements.title.textContent = title;
        elements.message.textContent = message;
        elements.step.textContent = "Completed successfully";
        elements.status.textContent = "Done";
        elements.percentage.textContent = "100%";
        elements.progress.style.width = "100%";
        setProgressVisibility(true);
    },

    showError(message, title = "Operation Failed") {
        const elements = getProgressElements();
        if (!elements.toast) return;

        clearProgressHideTimer();
        setProgressTheme("error");
        setProgressIcon("error");
        elements.title.textContent = title;
        elements.message.textContent = message;
        elements.step.textContent = "Please review and try again";
        elements.status.textContent = "Blocked";
        elements.percentage.textContent = "100%";
        elements.progress.style.width = "100%";
        setProgressVisibility(true);
    },

    hide(delay = PROGRESS_HIDE_DELAY_MS) {
        const { toast } = getProgressElements();
        if (!toast) return;

        clearProgressHideTimer();
        progressState.hideTimer = window.setTimeout(() => {
            setProgressVisibility(false);
        }, Math.max(0, delay));
    }
};

export function showToast(message, type = "info", options = {}) {
    const infrastructure = ensureToastInfrastructure();
    if (!infrastructure?.toastStack) return;

    const toast = createStackToast(message, type, options);
    infrastructure.toastStack.appendChild(toast);

    window.requestAnimationFrame(() => {
        toast.classList.add("visible");
    });

    window.setTimeout(() => {
        toast.classList.remove("visible");
        window.setTimeout(() => toast.remove(), 220);
    }, options.timeout ?? SIMPLE_TOAST_TIMEOUT_MS);
}

export async function runProgressToastFlow(config, worker) {
    const {
        title = "Working",
        theme = "info",
        initialMessage = "Preparing the workspace...",
        initialProgress = 12,
        initialStep = "Initializing",
        successTitle = "Completed",
        successMessage = "Operation completed successfully.",
        errorTitle = "Operation Failed",
        autoHideDelay = PROGRESS_HIDE_DELAY_MS
    } = config || {};

    ProgressToast.show(title, theme);
    ProgressToast.updateProgress(initialMessage, initialProgress, initialStep);

    try {
        const result = await worker({
            update(message, percentage, stepInfo) {
                ProgressToast.updateProgress(message, percentage, stepInfo);
            }
        });

        ProgressToast.showSuccess(successMessage, successTitle);
        ProgressToast.hide(autoHideDelay);
        return result;
    } catch (error) {
        ProgressToast.showError(error.message || "Something went wrong.", errorTitle);
        throw error;
    }
}
