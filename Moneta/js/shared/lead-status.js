export const LEAD_STATUSES = ["New", "Working", "Quote Sent", "On Hold", "Converted", "Lost"];

const LEGACY_LEAD_STATUS_MAP = {
    Contacted: "Working",
    Qualified: "Working"
};

function normalizeText(value) {
    return (value || "").trim();
}

export function normalizeLeadStatusValue(value, fallback = "New") {
    const status = normalizeText(value);

    if (LEAD_STATUSES.includes(status)) {
        return status;
    }

    return LEGACY_LEAD_STATUS_MAP[status] || fallback;
}
