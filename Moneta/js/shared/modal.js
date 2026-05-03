import { icons } from "./icons.js";

let pendingResolver = null;

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderDetails(details = []) {
    if (!Array.isArray(details) || details.length === 0) return "";

    return `
        <ul class="modal-detail-list">
            ${details.map(item => `
                <li>
                    <span class="modal-detail-label">${escapeHtml(item.label || "Detail")}</span>
                    <span class="modal-detail-value">${escapeHtml(item.value || "-")}</span>
                </li>
            `).join("")}
        </ul>
    `;
}

function renderNote({ note = "", noteTone = "warning", noteIcon = "", noteTitle = "" } = {}) {
    if (!note) return "";

    const noteClasses = ["modal-note"];
    if (noteTone) {
        noteClasses.push(`tone-${escapeHtml(noteTone)}`);
    }

    return `
        <div class="${noteClasses.join(" ")}">
            ${noteIcon ? `<span class="modal-note-icon" aria-hidden="true">${noteIcon}</span>` : ""}
            <div class="modal-note-copy">
                ${noteTitle ? `<strong class="modal-note-title">${escapeHtml(noteTitle)}</strong>` : ""}
                <span>${escapeHtml(note)}</span>
            </div>
        </div>
    `;
}

function renderModal({
    title,
    message = "",
    details = [],
    note = "",
    noteTone = "warning",
    noteIcon = "",
    noteTitle = "",
    confirmText = "OK",
    cancelText = "Cancel",
    showCancel = false,
    tone = "default",
    confirmVariant = "primary",
    choices = []
}) {
    const root = document.getElementById("modal-root");
    if (!root) return;

    const confirmClass = confirmVariant === "danger"
        ? "button button-danger-soft"
        : confirmVariant === "secondary"
            ? "button button-secondary"
            : "button button-primary";

    root.innerHTML = `
        <div class="modal-card modal-card-${tone}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-header">
                <h2 id="modal-title">${escapeHtml(title)}</h2>
            </div>
            <div class="modal-body">
                ${message ? `<p class="modal-message">${escapeHtml(message)}</p>` : ""}
                ${renderDetails(details)}
                ${renderNote({ note, noteTone, noteIcon, noteTitle })}
            </div>
            <div class="modal-actions">
                ${choices.length
            ? choices.map((choice, index) => {
                const variantClass = choice.variant === "primary"
                    ? "button button-primary"
                    : choice.variant === "danger"
                        ? "button button-danger-soft"
                        : "button button-secondary";

                return `<button class="${variantClass}" type="button" data-modal-choice="${escapeHtml(choice.value)}">${escapeHtml(choice.label || `Choice ${index + 1}`)}</button>`;
            }).join("")
            : `
                    ${showCancel ? `<button id="modal-cancel" class="button button-secondary" type="button">${escapeHtml(cancelText)}</button>` : ""}
                    <button id="modal-confirm" class="${confirmClass}" type="button">${escapeHtml(confirmText)}</button>
                `}
            </div>
        </div>
    `;

    root.classList.add("visible");
    root.setAttribute("aria-hidden", "false");

    const confirmButton = document.getElementById("modal-confirm");
    const cancelButton = document.getElementById("modal-cancel");

    confirmButton?.addEventListener("click", () => closeModal(true), { once: true });
    cancelButton?.addEventListener("click", () => closeModal(false), { once: true });
    root.querySelectorAll("[data-modal-choice]").forEach(button => {
        button.addEventListener("click", () => closeModal(button.getAttribute("data-modal-choice") || ""), { once: true });
    });
}

export function closeModal(result = false) {
    const root = document.getElementById("modal-root");
    if (!root) return;

    root.classList.remove("visible");
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = "";

    if (pendingResolver) {
        pendingResolver(result);
        pendingResolver = null;
    }
}

export function showModal(options) {
    if (pendingResolver) {
        closeModal(false);
    }

    return new Promise(resolve => {
        pendingResolver = resolve;
        renderModal(options);
    });
}

export function showSummaryModal({
    title,
    message,
    details = [],
    note = "",
    noteTone = "warning",
    noteIcon = "",
    noteTitle = "",
    confirmText = "OK"
}) {
    return showModal({
        title,
        message,
        details,
        note,
        noteTone,
        noteIcon,
        noteTitle,
        confirmText,
        showCancel: false,
        tone: "success",
        confirmVariant: "primary"
    });
}

export function showConfirmationModal({
    title,
    message,
    details = [],
    note = "",
    noteTone = "warning",
    noteIcon = "",
    noteTitle = "",
    confirmText = "Confirm",
    cancelText = "Cancel",
    tone = "danger"
}) {
    return showModal({
        title,
        message,
        details,
        note,
        noteTone,
        noteIcon,
        noteTitle,
        confirmText,
        cancelText,
        showCancel: true,
        tone,
        confirmVariant: tone === "danger" ? "danger" : "primary"
    });
}

export function showChoiceModal({
    title,
    message = "",
    details = [],
    note = "",
    noteTone = "warning",
    noteIcon = "",
    noteTitle = "",
    choices = []
}) {
    return showModal({
        title,
        message,
        details,
        note,
        noteTone,
        noteIcon,
        noteTitle,
        choices,
        showCancel: false,
        tone: "default"
    });
}
