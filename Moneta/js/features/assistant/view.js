import { getAssistantCapabilities, getAssistantPromptSuggestions, askMonetaAssistant, buildAssistantWelcome } from "./service.js";
import { icons } from "../../shared/icons.js";
import { showToast } from "../../shared/toast.js";

const featureState = {
    messages: [],
    promptValue: "",
    isLoading: false,
    bound: false
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

function renderPromptSuggestions(user) {
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
            <div class="assistant-prompt-grid">
                ${prompts.map(prompt => `
                    <button class="button button-secondary assistant-prompt-chip" type="button" data-assistant-prompt="${escapeHtml(prompt)}">
                        ${escapeHtml(prompt)}
                    </button>
                `).join("")}
            </div>
        </section>
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

function renderAssistantShell(user) {
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
                <div class="assistant-thread" id="assistant-thread">
                    ${renderTranscript()}
                    ${featureState.isLoading ? `
                        <article class="assistant-message assistant-message-assistant">
                            <div class="assistant-message-bubble assistant-message-loading">
                                <p>Working through Moneta's data services...</p>
                            </div>
                        </article>
                    ` : ""}
                </div>
                <form id="assistant-form" class="assistant-composer">
                    <label class="assistant-composer-field" for="assistant-prompt-input">
                        <span>Ask a question</span>
                        <textarea
                            id="assistant-prompt-input"
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
            </section>

            ${renderPromptSuggestions(user)}
        </div>
    `;

    document.getElementById("assistant-thread")?.scrollTo({
        top: document.getElementById("assistant-thread")?.scrollHeight || 0,
        behavior: "smooth"
    });
}

async function submitPrompt(user, promptText) {
    const text = normalizeText(promptText);
    if (!text || featureState.isLoading) return;

    featureState.messages = [
        ...featureState.messages,
        { type: "user", text }
    ];
    featureState.promptValue = "";
    featureState.isLoading = true;
    renderAssistantShell(user);

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
        renderAssistantShell(user);
    }
}

function bindAssistantEvents(user) {
    const root = document.getElementById("assistant-root");
    if (!root || root.dataset.assistantBound === "true") return;

    root.addEventListener("input", event => {
        const input = event.target.closest("#assistant-prompt-input");
        if (!input) return;
        featureState.promptValue = input.value;
    });

    root.addEventListener("submit", event => {
        if (!event.target.closest("#assistant-form")) return;
        event.preventDefault();
        submitPrompt(user, featureState.promptValue);
    });

    root.addEventListener("click", event => {
        const promptButton = event.target.closest("[data-assistant-prompt]");
        const clearButton = event.target.closest("[data-assistant-clear]");

        if (clearButton) {
            featureState.messages = [];
            featureState.promptValue = "";
            renderAssistantShell(user);
            return;
        }

        if (promptButton) {
            submitPrompt(user, promptButton.dataset.assistantPrompt || "");
        }
    });

    root.dataset.assistantBound = "true";
}

export function renderAssistantView(user) {
    renderAssistantShell(user);
    bindAssistantEvents(user);
}
