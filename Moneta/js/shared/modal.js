let pendingResolver = null;

function renderModal({ title, message, confirmText = "OK", cancelText = "Cancel", showCancel = false }) {
    const root = document.getElementById("modal-root");
    if (!root) return;

    root.innerHTML = `
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <h2 id="modal-title">${title}</h2>
            <p>${message}</p>
            <div class="modal-actions">
                ${showCancel ? `<button id="modal-cancel" class="button button-secondary" type="button">${cancelText}</button>` : ""}
                <button id="modal-confirm" class="button button-primary" type="button">${confirmText}</button>
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
