const TOAST_TIMEOUT_MS = 2800;

function createToastElement(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    return toast;
}

export function showToast(message, type = "info") {
    const root = document.getElementById("toast-root");
    if (!root) return;

    const toast = createToastElement(message, type);
    root.appendChild(toast);

    window.setTimeout(() => {
        toast.remove();
    }, TOAST_TIMEOUT_MS);
}
