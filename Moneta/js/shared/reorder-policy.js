export const REORDER_POLICY_SCOPE_TYPES = ["global", "category", "product"];
export const ZERO_DEMAND_BEHAVIORS = ["manual-review", "suppress"];

export const DEFAULT_REORDER_POLICY = {
    scopeType: "global",
    shortWindowDays: 30,
    shortWindowWeight: 60,
    longWindowDays: 90,
    longWindowWeight: 40,
    leadTimeDays: 14,
    safetyDays: 7,
    targetCoverDays: 35,
    lowHistoryUnitThreshold: 3,
    zeroDemandBehavior: "manual-review",
    minimumOrderQty: 0,
    packSize: 1,
    isActive: true
};

function normalizeText(value) {
    return (value || "").trim();
}

function toInteger(value, fallback = 0, minimum = 0) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(minimum, parsed);
}

export function resolveReorderPolicyTargetLabel(policy = {}, {
    categoryNameById = new Map(),
    productNameById = new Map()
} = {}) {
    const scopeType = normalizeText(policy.scopeType || DEFAULT_REORDER_POLICY.scopeType);

    if (scopeType === "category") {
        return normalizeText(policy.categoryName)
            || normalizeText(categoryNameById.get(policy.categoryId))
            || "Selected Category";
    }

    if (scopeType === "product") {
        return normalizeText(policy.productName)
            || normalizeText(productNameById.get(policy.productId))
            || "Selected Product";
    }

    return "All Active Products";
}

export function buildReorderPolicyScopeSummary(policy = {}, options = {}) {
    const scopeType = normalizeText(policy.scopeType || DEFAULT_REORDER_POLICY.scopeType);
    const targetLabel = resolveReorderPolicyTargetLabel(policy, options);

    if (scopeType === "category") {
        return `Category: ${targetLabel}`;
    }

    if (scopeType === "product") {
        return `Product: ${targetLabel}`;
    }

    return "Global Default";
}

export function buildReorderPolicyExplanation(policy = {}, options = {}) {
    const scopeType = normalizeText(policy.scopeType || DEFAULT_REORDER_POLICY.scopeType);
    const targetLabel = resolveReorderPolicyTargetLabel(policy, options);
    const shortWindowDays = toInteger(policy.shortWindowDays, DEFAULT_REORDER_POLICY.shortWindowDays, 1);
    const shortWindowWeight = toInteger(policy.shortWindowWeight, DEFAULT_REORDER_POLICY.shortWindowWeight, 0);
    const longWindowDays = toInteger(policy.longWindowDays, DEFAULT_REORDER_POLICY.longWindowDays, 1);
    const longWindowWeight = toInteger(policy.longWindowWeight, DEFAULT_REORDER_POLICY.longWindowWeight, 0);
    const leadTimeDays = toInteger(policy.leadTimeDays, DEFAULT_REORDER_POLICY.leadTimeDays, 0);
    const safetyDays = toInteger(policy.safetyDays, DEFAULT_REORDER_POLICY.safetyDays, 0);
    const targetCoverDays = toInteger(policy.targetCoverDays, DEFAULT_REORDER_POLICY.targetCoverDays, 1);
    const lowHistoryUnitThreshold = toInteger(policy.lowHistoryUnitThreshold, DEFAULT_REORDER_POLICY.lowHistoryUnitThreshold, 0);
    const minimumOrderQty = toInteger(policy.minimumOrderQty, DEFAULT_REORDER_POLICY.minimumOrderQty, 0);
    const packSize = Math.max(1, toInteger(policy.packSize, DEFAULT_REORDER_POLICY.packSize, 1));
    const zeroDemandBehavior = ZERO_DEMAND_BEHAVIORS.includes(policy.zeroDemandBehavior)
        ? policy.zeroDemandBehavior
        : DEFAULT_REORDER_POLICY.zeroDemandBehavior;

    const scopeLine = scopeType === "category"
        ? `This policy applies to active products in the ${targetLabel} category.`
        : scopeType === "product"
            ? `This policy applies only to ${targetLabel}.`
            : "This policy applies to all active products that do not have a more specific reorder policy.";

    const demandLine = `Moneta estimates daily demand using ${shortWindowWeight}% of the last ${shortWindowDays} days and ${longWindowWeight}% of the last ${longWindowDays} days.`;
    const thresholdLine = `It recommends reorder when stock on hand falls below demand cover for ${leadTimeDays} lead-time days plus ${safetyDays} safety days.`;
    const targetLine = `When reorder is triggered, Moneta tops stock up to ${targetCoverDays} days of cover.`;
    const lowHistoryLine = lowHistoryUnitThreshold > 0
        ? `If a product sells ${lowHistoryUnitThreshold} units or less in the longer window, Moneta marks it for manual review instead of trusting the recommendation completely.`
        : "Low-history products follow the same demand rule as the rest of the policy.";
    const zeroDemandLine = zeroDemandBehavior === "suppress"
        ? "If a product has no recent demand, Moneta suppresses the reorder recommendation."
        : "If a product has no recent demand, Moneta flags it for manual review instead of auto-recommending a reorder.";
    const orderingLine = minimumOrderQty > 0 || packSize > 1
        ? `Order quantities are rounded to a minimum of ${minimumOrderQty || 0} units and then packed in multiples of ${packSize}.`
        : "Order quantities are recommended exactly from the stock-cover calculation.";

    return [scopeLine, demandLine, thresholdLine, targetLine, lowHistoryLine, zeroDemandLine, orderingLine].join(" ");
}

function getSpecificityRank(scopeType = "") {
    if (scopeType === "product") return 3;
    if (scopeType === "category") return 2;
    return 1;
}

function getUpdatedTime(policy = {}) {
    const candidates = [
        policy.updatedOn,
        policy.updateDate,
        policy.createdOn
    ];

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof candidate.toDate === "function") {
            return candidate.toDate().getTime();
        }

        const date = new Date(candidate);
        if (!Number.isNaN(date.getTime())) {
            return date.getTime();
        }
    }

    return 0;
}

function matchesPolicyScope(product = {}, policy = {}) {
    const scopeType = normalizeText(policy.scopeType || DEFAULT_REORDER_POLICY.scopeType);

    if (!policy.isActive) return false;
    if (scopeType === "product") return normalizeText(policy.productId) === normalizeText(product.id);
    if (scopeType === "category") return normalizeText(policy.categoryId) === normalizeText(product.categoryId);
    return scopeType === "global";
}

export function resolvePolicyForProduct(product = {}, policies = []) {
    const candidates = (policies || [])
        .filter(policy => matchesPolicyScope(product, policy))
        .sort((left, right) => {
            const specificityDiff = getSpecificityRank(right.scopeType) - getSpecificityRank(left.scopeType);
            if (specificityDiff !== 0) return specificityDiff;
            return getUpdatedTime(right) - getUpdatedTime(left);
        });

    return candidates[0] || null;
}

export function getMaxReorderPolicyWindowDays(policies = []) {
    const values = (policies || [])
        .filter(policy => policy?.isActive)
        .flatMap(policy => [
            toInteger(policy.shortWindowDays, DEFAULT_REORDER_POLICY.shortWindowDays, 1),
            toInteger(policy.longWindowDays, DEFAULT_REORDER_POLICY.longWindowDays, 1)
        ]);

    return values.length ? Math.max(...values) : DEFAULT_REORDER_POLICY.longWindowDays;
}
