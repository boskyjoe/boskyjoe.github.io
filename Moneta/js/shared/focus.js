export function focusFormField({ formId, inputSelector, behavior = "smooth" }) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.scrollIntoView({ behavior, block: "start" });

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const target = form.querySelector(inputSelector);
            if (!target || typeof target.focus !== "function") return;

            target.focus({ preventScroll: true });

            if (typeof target.select === "function" && !["date", "select-one"].includes(target.type)) {
                target.select();
            }
        });
    });
}
