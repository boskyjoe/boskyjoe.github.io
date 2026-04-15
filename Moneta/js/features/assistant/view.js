import { getState } from "../../app/store.js";
import { getAssistantCapabilities, getAssistantPromptSuggestions, askMonetaAssistant, buildAssistantWelcome } from "./service.js";
import { icons } from "../../shared/icons.js";
import { showToast } from "../../shared/toast.js";

const ASSISTANT_ROLES = new Set(["admin", "inventory_manager", "sales_staff", "finance", "team_lead"]);

const featureState = {
    messages: [],
    promptValue: "",
    isLoading: false,
    overlayOpen: false
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

function canUseAssistant(user) {
    return Boolean(user?.role && ASSISTANT_ROLES.has(user.role));
}

function getCurrentSnapshot() {
    return getState();
}

function getCurrentUser() {
    return getCurrentSnapshot().currentUser;
}

function renderCapabilities(user) {
    const capabilities = getAssistantCapabilities(user);

    if (!capabilities.length) {
        return `
            <div class="assistant-capability-strip">
                <span class="status-pill">Role: ${escapeHtml(user?.role || "guest")}</span>
                <span class="status-pill">Mode: Guidance Only</span>
            </div>
        `;
    }

    return `
        <div class="assistant-capability-strip">
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

function renderLoadingMessage() {
    if (!featureState.isLoading) return "";

    return `
        <article class="assistant-message assistant-message-assistant">
            <div class="assistant-message-bubble assistant-message-loading">
                <p>Working through Moneta's data services...</p>
            </div>
        </article>
    `;
}

function renderPromptChipGrid(user) {
    const prompts = getAssistantPromptSuggestions(user);

    return `
        <div class="assistant-prompt-grid">
            ${prompts.map(prompt => `
                <button class="button button-secondary assistant-prompt-chip" type="button" data-assistant-prompt="${escapeHtml(prompt)}">
                    ${escapeHtml(prompt)}
                </button>
            `).join("")}
        </div>
    `;
}

function renderPromptSuggestionsCard(user) {
    const prompts = getAssistantPromptSuggestions(user);

    return `
        <section class="panel-card assistant-suggestions-card">
            <div class="assistant-suggestions-head">
                <div>
                    <p class="hero-kicker">Suggested Prompts</p>
                    <h3>Try Asking</h3>
                </div>
                <span class="status-pill">${prompts.length} prompt${prompts.length === 1 ? "" : "s"}</span>
            </div>
            ${renderPromptChipGrid(user)}
        </section>
    `;
}

function renderComposer({ formId, inputId, label = "Ask a question", placeholder, rows = 3, compact = false }) {
    return `
        <form id="${formId}" class="assistant-composer${compact ? " assistant-overlay-composer" : ""}" data-assistant-form>
            <label class="assistant-composer-field" for="${inputId}">
                <span>${escapeHtml(label)}</span>
                <textarea
                    id="${inputId}"
                    class="textarea"
                    rows="${rows}"
                    data-assistant-input
                    placeholder="${escapeHtml(placeholder)}"
                    ${featureState.isLoading ? "disabled" : ""}>${escapeHtml(featureState.promptValue)}</textarea>
            </label>
            <div class="assistant-composer-actions">
                <button class="button button-primary-alt" type="submit" ${featureState.isLoading ? "disabled" : ""}>
                    <span class="button-icon">${icons.search}</span>
                    ${featureState.isLoading ? "Thinking..." : "Ask Assistant"}
                </button>
            </div>
        </form>
    `;
}

function ensureWelcomeMessage(user) {
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

function scrollThread(rootId, selector) {
    const root = document.getElementById(rootId);
    const thread = root?.querySelector(selector);
    if (!thread) return;

    thread.scrollTo({
        top: thread.scrollHeight || 0,
        behavior: "smooth"
    });
}

function renderAssistantPage(user) {
    const root = document.getElementById("assistant-root");
    if (!root) return;

    ensureWelcomeMessage(user);

    root.innerHTML = `
        <div class="assistant-shell">
            <section class="panel-card assistant-header-card">
                <div class="assistant-header-copy">
                    <p class="hero-kicker">Role-Aware Data Assistant</p>
                    <h2 class="hero-title">Moneta Assistant</h2>
                    <p>Ask report-style questions in plain language. Assistant V1 is read-only and answers using Moneta's existing reporting logic, so it follows the same role restrictions as the rest of the app.</p>
                </div>
                <div class="assistant-header-actions">
                    <button class="button button-secondary" type="button" data-assistant-clear ${featureState.isLoading ? "disabled" : ""}>
                        <span class="button-icon">${icons.inactive}</span>
                        Clear Chat
                    </button>
                </div>
                ${renderCapabilities(user)}
            </section>

            <section class="panel-card assistant-chat-card">
                <div class="assistant-thread" data-assistant-thread>
                    ${renderTranscript()}
                    ${renderLoadingMessage()}
                </div>
                ${renderComposer({
                    formId: "assistant-form",
                    inputId: "assistant-prompt-input",
                    placeholder: "Example: Show cash flow for the last 30 days"
                })}
            </section>

            ${renderPromptSuggestionsCard(user)}
        </div>
    `;

    scrollThread("assistant-root", "[data-assistant-thread]");
}

function renderAssistantOverlay(user, route) {
    const root = document.getElementById("assistant-overlay-root");
    if (!root) return;

    if (!user || route === "#/login") {
        featureState.overlayOpen = false;
    }

    if (!canUseAssistant(user) || route === "#/assistant") {
        root.innerHTML = "";
        return;
    }

    ensureWelcomeMessage(user);

    root.innerHTML = `
        <div class="assistant-overlay-shell${featureState.overlayOpen ? " is-open" : ""}">
            ${featureState.overlayOpen ? `
                <aside class="assistant-overlay-panel" aria-label="Moneta Assistant">
                    <div class="assistant-overlay-head">
                        <div class="assistant-overlay-head-copy">
                            <p class="assistant-overlay-kicker">Role-Aware AI</p>
                            <h2>Moneta Assistant</h2>
                            <p>Ask for report-style insight without leaving your current workspace.</p>
                        </div>
                        <div class="assistant-overlay-head-actions">
                            <button class="button button-secondary" type="button" data-assistant-clear ${featureState.isLoading ? "disabled" : ""}>
                                <span class="button-icon">${icons.inactive}</span>
                                Clear
                            </button>
                            <button class="assistant-overlay-icon-button" type="button" aria-label="Close assistant" data-assistant-close>
                                <span>${icons.close}</span>
                            </button>
                        </div>
                    </div>

                    <div class="assistant-overlay-capabilities">
                        ${renderCapabilities(user)}
                    </div>

                    <div class="assistant-thread assistant-overlay-thread" data-assistant-thread>
                        ${renderTranscript()}
                        ${renderLoadingMessage()}
                    </div>

                    ${renderComposer({
                        formId: "assistant-overlay-form",
                        inputId: "assistant-overlay-prompt-input",
                        label: "Ask Moneta AI",
                        placeholder: "Example: Compare Church Store and Tasty Treats for 90 days",
                        rows: 2,
                        compact: true
                    })}

                    <section class="assistant-overlay-suggestions">
                        <div class="assistant-overlay-suggestions-head">
                            <div>
                                <p class="hero-kicker">Suggested Prompts</p>
                                <h3>Quick Start</h3>
                            </div>
                            <span class="status-pill">Read Only</span>
                        </div>
                        ${renderPromptChipGrid(user)}
                    </section>
                </aside>
            ` : ""}

            <button
                class="assistant-overlay-launcher"
                type="button"
                aria-label="${featureState.overlayOpen ? "Close Moneta Assistant" : "Open Moneta Assistant"}"
                aria-expanded="${featureState.overlayOpen ? "true" : "false"}"
                data-assistant-toggle>
                <span class="assistant-overlay-launcher-icon">${icons.assistant}</span>
                <span class="assistant-overlay-launcher-copy">
                    <strong>Moneta AI</strong>
                    <small>${featureState.overlayOpen ? "Close assistant" : "Ask about reports, sales, and inventory"}</small>
                </span>
            </button>
        </div>
    `;

    scrollThread("assistant-overlay-root", "[data-assistant-thread]");
}

function renderAssistantUi(user = getCurrentUser(), route = getCurrentSnapshot().currentRoute) {
    renderAssistantPage(user);
    renderAssistantOverlay(user, route);
}

async function submitPrompt(promptText) {
    const user = getCurrentUser();
    const text = normalizeText(promptText);
    if (!user || !text || featureState.isLoading) return;

    featureState.messages = [
        ...featureState.messages,
        { type: "user", text }
    ];
    featureState.promptValue = "";
    featureState.isLoading = true;
    renderAssistantUi(user);

    try {
        const response = await askMonetaAssistant(user, text);
        featureState.messages = [
            ...featureState.messages,
            response
        ];
    } catch (error) {
        console.error("[Moneta] Assistant query failed:", error);
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
        renderAssistantUi(user);
    }
}

function bindAssistantRoot(rootId) {
    const root = document.getElementById(rootId);
    if (!root || root.dataset.assistantBound === "true") return;

    root.addEventListener("input", event => {
        const input = event.target.closest("[data-assistant-input]");
        if (!input) return;
        featureState.promptValue = input.value;
    });

    root.addEventListener("submit", event => {
        if (!event.target.closest("[data-assistant-form]")) return;
        event.preventDefault();
        submitPrompt(featureState.promptValue);
    });

    root.addEventListener("click", event => {
        const promptButton = event.target.closest("[data-assistant-prompt]");
        const clearButton = event.target.closest("[data-assistant-clear]");
        const toggleButton = event.target.closest("[data-assistant-toggle]");
        const closeButton = event.target.closest("[data-assistant-close]");

        if (clearButton) {
            featureState.messages = [];
            featureState.promptValue = "";
            renderAssistantUi();
            return;
        }

        if (toggleButton) {
            featureState.overlayOpen = !featureState.overlayOpen;
            renderAssistantUi();
            return;
        }

        if (closeButton) {
            featureState.overlayOpen = false;
            renderAssistantUi();
            return;
        }

        if (promptButton) {
            if (!featureState.overlayOpen && rootId === "assistant-overlay-root") {
                featureState.overlayOpen = true;
            }
            submitPrompt(promptButton.dataset.assistantPrompt || "");
        }
    });

    root.dataset.assistantBound = "true";
}

export function initializeAssistantUi(user, route) {
    bindAssistantRoot("assistant-root");
    bindAssistantRoot("assistant-overlay-root");
    renderAssistantUi(user, route);
}

export function renderAssistantView(user) {
    bindAssistantRoot("assistant-root");
    renderAssistantUi(user, getCurrentSnapshot().currentRoute);
}
