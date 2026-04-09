export function annotateDisabledActionButtons(root = document) {
    if (!root?.querySelectorAll) return;

    root.querySelectorAll("button.button:disabled").forEach(button => {
        const reason = button.title
            || button.dataset?.disabledReason
            || button.dataset?.disabledDefaultReason
            || "This action is currently unavailable.";

        if (button.title !== reason) {
            button.title = reason;
        }
    });
}

export function initializeDisabledActionTooltips() {
    const root = document.body;
    if (!root || root.dataset.disabledActionTooltipsBound === "true") return;

    const observer = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === "childList") {
                record.addedNodes.forEach(node => {
                    if (node instanceof Element) {
                        annotateDisabledActionButtons(node);
                    }
                });
                continue;
            }

            if (record.type === "attributes" && record.target instanceof HTMLButtonElement) {
                annotateDisabledActionButtons(record.target.parentElement || document);
            }
        }
    });

    observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["disabled"]
    });

    annotateDisabledActionButtons(document);
    root.dataset.disabledActionTooltipsBound = "true";
}
