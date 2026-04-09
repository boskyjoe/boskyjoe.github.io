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

function renderModal({
    title,
    message = "",
    details = [],
    note = "",
    confirmText = "OK",
    cancelText = "Cancel",
    showCancel = false,
    tone = "default",
    confirmVariant = "primary"
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
                ${note ? `<p class="modal-note">${escapeHtml(note)}</p>` : ""}
            </div>
            <div class="modal-actions">
                ${showCancel ? `<button id="modal-cancel" class="button button-secondary" type="button">${escapeHtml(cancelText)}</button>` : ""}
                <button id="modal-confirm" class="${confirmClass}" type="button">${escapeHtml(confirmText)}</button>
            </div>
        </div>
    `;

    root.classList.add("visible");
    root.setAttribute("aria-hidden", "false");

    const confirmButton = document.getElementById("modal-confirm");
    const cancelButton = document.getElementById("modal-cancel");

    confirmButton?.addEventListener("click", () => closeModal(true), { once: true });
    cancelButton?.addEventListener("click", () => closeModal(false), { once: true });
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

export function showSummaryModal({ title, message, details = [], note = "", confirmText = "OK" }) {
    return showModal({
        title,
        message,
        details,
        note,
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
    confirmText = "Confirm",
    cancelText = "Cancel",
    tone = "danger"
}) {
    return showModal({
        title,
        message,
        details,
        note,
        confirmText,
        cancelText,
        showCancel: true,
        tone,
        confirmVariant: tone === "danger" ? "danger" : "primary"
    });
}
