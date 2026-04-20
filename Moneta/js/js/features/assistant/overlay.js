import { getState, subscribe } from "../../app/store.js";
import { icons } from "../../shared/icons.js";
import { showToast } from "../../shared/toast.js";
import { askMonetaAssistant, buildAssistantWelcome, getAssistantCapabilities, getAssistantPromptSuggestions } from "./service.js";

const OVERLAY_ALLOWED_ROLES = new Set(["admin", "inventory_manager", "sales_staff", "finance", "team_lead"]);

const featureState = {
    isOpen: false,
    messages: [],
    promptValue: "",
    isLoading: false,
    activeUserKey: "",
    initialized: false
};

function normalizeText(value) {
    return String(value || "").trim();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function getUserKey(user) {
    return normalizeText(user?.uid || user?.email || "");
}

function canShowOverlay(snapshot = getState()) {
    const user = snapshot.currentUser;
    const route = snapshot.currentRoute;
    return Boolean(user && OVERLAY_ALLOWED_ROLES.has(user.role) && route !== "#/login");
}

function ensureConversationForUser(user) {
    const nextUserKey = getUserKey(user);
    if (featureState.activeUserKey !== nextUserKey) {
        featureState.activeUserKey = nextUserKey;
        featureState.messages = [];
        featureState.promptValue = "";
        featureState.isLoading = false;
        featureState.isOpen = false;
    }

    if (featureState.messages.length) return;

    featureState.messages = [
        {
            type: "assistant",
            reportLabel: "Moneta Assistant",
            ...buildAssistantWelcome(user),
            followUps: getAssistantPromptSuggestions(user).slice(0, 4)
        }
    ];
}

function renderCapabilities(user) {
    const capabilities = getAssistantCapabilities(user);

    if (!capabilities.length) {
        return `
            <div class="assistant-overlay-capabilities">
                <span class="status-pill">Role: ${escapeHtml(user?.role || "guest")}</span>
                <span class="status-pill">Mode: Guidance Only</span>
            </div>
        `;
    }

    return `
        <div class="assistant-overlay-capabilities">
            <span class="status-pill">Role: ${escapeHtml(user?.role || "guest")}</span>
            ${capabilities.map(item => `<span class="status-pill">${escapeHtml(item.label)}</span>`).join("")}
        </div>
    `;
}

function renderMessage(message = {}) {
    if (message.type === "user") {
        return `
            <article class="assistant-message assistant-message-user">
                <div class="assistant-message-bubble">
                    <p>${escapeHtml(message.text || "")}</p>
                </div>
            </article>
        `;
    }

    const sourceMeta = message.sourceMeta || {};
    return `
        <article class="assistant-message assistant-message-assistant">
            <div class="assistant-message-bubble">
                <div class="assistant-response-head">
                    <div>
                        <p class="assistant-response-kicker">${escapeHtml(message.reportLabel || "Moneta Assistant")}</p>
                        <h3>${escapeHtml(message.title || "Assistant Response")}</h3>
                    </div>
                    ${sourceMeta.sourceLabel ? `<span class="status-pill">${escapeHtml(sourceMeta.sourceLabel)}</span>` : ""}
                </div>
                <p class="assistant-response-summary">${escapeHtml(message.summary || "")}</p>
                ${message.metrics?.length ? `
                    <div class="assistant-metric-grid">
                        ${message.metrics.map(metric => `
                            <article class="assistant-metric-card tone-${escapeHtml(metric.tone || "neutral")}">
                                <p class="assistant-metric-label">${escapeHtml(metric.label)}</p>
                                <p class="assistant-metric-value">${escapeHtml(metric.value)}</p>
                            </article>
                        `).join("")}
                    </div>
                ` : ""}
                ${message.bullets?.length ? `
                    <div class="assistant-response-list">
                        ${message.bullets.map(item => `<p>${escapeHtml(item)}</p>`).join("")}
                    </div>
                ` : ""}
                ${(sourceMeta.windowLabel || sourceMeta.preparedAt) ? `
                    <div class="assistant-response-meta">
                        ${sourceMeta.windowLabel ? `<span>Window: <strong>${escapeHtml(sourceMeta.windowLabel)}</strong></span>` : ""}
                        ${sourceMeta.preparedAt ? `<span>Prepared: <strong>${escapeHtml(sourceMeta.preparedAt)}</strong></span>` : ""}
                    </div>
                ` : ""}
                ${message.followUps?.length ? `
                    <div class="assistant-followups">
                        ${message.followUps.map(prompt => `
                            <button class="button button-secondary assistant-prompt-chip" type="button" data-assistant-prompt="${escapeHtml(prompt)}">
                                ${escapeHtml(prompt)}
                            </button>
                        `).join("")}
                    </div>
                ` : ""}
            </div>
        </article>
    `;
}

function renderTranscript() {
    if (!featureState.messages.length) {
        return `<div class="assistant-empty-thread">Start with one of the suggested prompts below.</div>`;
    }

    return featureState.messages.map(renderMessage).join("");
}

function renderPromptSuggestions(user) {
    const prompts = getAssistantPromptSuggestions(user).slice(0, 6);

    return `
        <div class="assistant-overlay-suggestions">
            ${prompts.map(prompt => `
                <button class="button button-secondary assistant-prompt-chip" type="button" data-assistant-prompt="${escapeHtml(prompt)}">
                    ${escapeHtml(prompt)}
                </button>
            `).join("")}
        </div>
    `;
}

function renderLauncher(user) {
    return `
        <button class="assistant-launcher" type="button" data-assistant-toggle aria-label="Open Moneta Assistant" aria-expanded="${featureState.isOpen ? "true" : "false"}">
            <span class="assistant-launcher-icon">${icons.assistant}</span>
            <span class="assistant-launcher-label">AI</span>
            <span class="assistant-launcher-status">${escapeHtml(user?.role || "user")}</span>
        </button>
    `;
}

function renderOverlayPanel(user) {
    if (!featureState.isOpen) return "";

    return `
        <div class="assistant-overlay-backdrop" data-assistant-close></div>
        <section class="assistant-overlay-panel" aria-label="Moneta Assistant">
            <header class="assistant-overlay-header">
                <div class="assistant-overlay-title">
                    <p class="hero-kicker">Moneta Copilot</p>
                    <h2>Assistant</h2>
                    <p>Ask finance, sales, inventory, or consignment questions without leaving the page.</p>
                </div>
                <div class="assistant-overlay-actions">
                    <button class="button button-secondary" type="button" data-assistant-clear ${featureState.isLoading ? "disabled" : ""}>
                        <span class="button-icon">${icons.inactive}</span>
                        Clear
                    </button>
                    <button class="button button-secondary" type="button" data-assistant-close-button>
                        <span class="button-icon">${icons.close}</span>
                        Close
                    </button>
                </div>
                ${renderCapabilities(user)}
            </header>

            <div class="assistant-overlay-thread" id="assistant-overlay-thread">
                ${renderTranscript()}
                ${featureState.isLoading ? `
                    <article class="assistant-message assistant-message-assistant">
                        <div class="assistant-message-bubble assistant-message-loading">
                            <p>Working through Moneta's data services...</p>
                        </div>
                    </article>
                ` : ""}
            </div>

            <div class="assistant-overlay-footer">
                ${renderPromptSuggestions(user)}
                <form class="assistant-overlay-composer" id="assistant-overlay-form">
                    <label class="assistant-composer-field" for="assistant-overlay-input">
                        <span>Ask a question</span>
                        <textarea
                            id="assistant-overlay-input"
                            class="textarea"
                            rows="3"
                            placeholder="Example: Show cash flow for the last 30 days"
                            ${featureState.isLoading ? "disabled" : ""}>${escapeHtml(featureState.promptValue)}</textarea>
                    </label>
                    <div class="assistant-composer-actions">
                        <button class="button button-primary-alt" type="submit" ${featureState.isLoading ? "disabled" : ""}>
                            <span class="button-icon">${icons.search}</span>
                            ${featureState.isLoading ? "Thinking..." : "Ask Assistant"}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    `;
}

function renderAssistantOverlay(snapshot = getState()) {
    const root = document.getElementById("assistant-overlay-root");
    if (!root) return;

    if (!canShowOverlay(snapshot)) {
        featureState.isOpen = false;
        root.innerHTML = "";
        return;
    }

    const user = snapshot.currentUser;
    ensureConversationForUser(user);

    root.innerHTML = `
        <div class="assistant-overlay-shell ${featureState.isOpen ? "is-open" : ""}">
            ${renderLauncher(user)}
            ${renderOverlayPanel(user)}
        </div>
    `;

    const thread = document.getElementById("assistant-overlay-thread");
    if (thread) {
        thread.scrollTo({
            top: thread.scrollHeight || 0,
            behavior: "smooth"
        });
    }
}

async function submitPrompt(promptText) {
    const snapshot = getState();
    const user = snapshot.currentUser;
    const text = normalizeText(promptText);
    if (!text || featureState.isLoading || !user) return;

    featureState.messages = [
        ...featureState.messages,
        { type: "user", text }
    ];
    featureState.promptValue = "";
    featureState.isLoading = true;
    renderAssistantOverlay(snapshot);

    try {
        const response = await askMonetaAssistant(user, text);
        featureState.messages = [
            ...featureState.messages,
            response
        ];
    } catch (error) {
        console.error("[Moneta] Assistant overlay query failed:", error);
        showToast(error?.message || "Assistant could not answer that request.", "error", {
            title: "Moneta Assistant"
        });
        featureState.messages = [
            ...featureState.messages,
            {
                type: "assistant",
                title: "Assistant Error",
                reportLabel: "Moneta Assistant",
                summary: error?.message || "Assistant could not answer that request.",
                bullets: [
                    "Try a different prompt or a narrower report question.",
                    "Assistant V1 currently supports report-style questions only."
                ],
                followUps: getAssistantPromptSuggestions(user).slice(0, 4)
            }
        ];
    } finally {
        featureState.isLoading = false;
        renderAssistantOverlay(getState());
    }
}

function bindAssistantOverlayEvents() {
    const root = document.getElementById("assistant-overlay-root");
    if (!root || root.dataset.assistantOverlayBound === "true") return;

    root.addEventListener("input", event => {
        const input = event.target.closest("#assistant-overlay-input");
        if (!input) return;
        featureState.promptValue = input.value;
    });

    root.addEventListener("submit", event => {
        if (!event.target.closest("#assistant-overlay-form")) return;
        event.preventDefault();
        submitPrompt(featureState.promptValue);
    });

    root.addEventListener("click", event => {
        const toggleButton = event.target.closest("[data-assistant-toggle]");
        const closeButton = event.target.closest("[data-assistant-close], [data-assistant-close-button]");
        const clearButton = event.target.closest("[data-assistant-clear]");
        const promptButton = event.target.closest("[data-assistant-prompt]");

        if (toggleButton) {
            featureState.isOpen = !featureState.isOpen;
            renderAssistantOverlay(getState());
            return;
        }

        if (closeButton) {
            featureState.isOpen = false;
            renderAssistantOverlay(getState());
            return;
        }

        if (clearButton) {
            const user = getState().currentUser;
            featureState.messages = [];
            featureState.promptValue = "";
            ensureConversationForUser(user);
            renderAssistantOverlay(getState());
            return;
        }

        if (promptButton) {
            featureState.isOpen = true;
            submitPrompt(promptButton.dataset.assistantPrompt || "");
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape" || !featureState.isOpen) return;
        featureState.isOpen = false;
        renderAssistantOverlay(getState());
    });

    root.dataset.assistantOverlayBound = "true";
}

export function initializeAssistantOverlay() {
    if (featureState.initialized) return;
    featureState.initialized = true;
    bindAssistantOverlayEvents();
    subscribe(snapshot => {
        renderAssistantOverlay(snapshot);
    });
    renderAssistantOverlay(getState());
}
