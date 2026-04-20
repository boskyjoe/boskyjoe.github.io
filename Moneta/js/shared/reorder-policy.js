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

function roundUpToPack(quantity = 0, packSize = 1) {
    if (quantity <= 0) return 0;
    if (packSize <= 1) return quantity;
    return Math.ceil(quantity / packSize) * packSize;
}

function pluralize(value, singular, plural = `${singular}s`) {
    return value === 1 ? singular : plural;
}

function getNormalizedPolicySettings(policy = {}) {
    return {
        scopeType: normalizeText(policy.scopeType || DEFAULT_REORDER_POLICY.scopeType),
        shortWindowDays: toInteger(policy.shortWindowDays, DEFAULT_REORDER_POLICY.shortWindowDays, 1),
        shortWindowWeight: toInteger(policy.shortWindowWeight, DEFAULT_REORDER_POLICY.shortWindowWeight, 0),
        longWindowDays: toInteger(policy.longWindowDays, DEFAULT_REORDER_POLICY.longWindowDays, 1),
        longWindowWeight: toInteger(policy.longWindowWeight, DEFAULT_REORDER_POLICY.longWindowWeight, 0),
        leadTimeDays: toInteger(policy.leadTimeDays, DEFAULT_REORDER_POLICY.leadTimeDays, 0),
        safetyDays: toInteger(policy.safetyDays, DEFAULT_REORDER_POLICY.safetyDays, 0),
        targetCoverDays: toInteger(policy.targetCoverDays, DEFAULT_REORDER_POLICY.targetCoverDays, 1),
        lowHistoryUnitThreshold: toInteger(policy.lowHistoryUnitThreshold, DEFAULT_REORDER_POLICY.lowHistoryUnitThreshold, 0),
        minimumOrderQty: toInteger(policy.minimumOrderQty, DEFAULT_REORDER_POLICY.minimumOrderQty, 0),
        packSize: Math.max(1, toInteger(policy.packSize, DEFAULT_REORDER_POLICY.packSize, 1)),
        zeroDemandBehavior: ZERO_DEMAND_BEHAVIORS.includes(policy.zeroDemandBehavior)
            ? policy.zeroDemandBehavior
            : DEFAULT_REORDER_POLICY.zeroDemandBehavior
    };
}

function pickLatestPolicy(policies = [], predicate = () => true) {
    return (policies || [])
        .filter(policy => predicate(policy))
        .sort((left, right) => getUpdatedTime(right) - getUpdatedTime(left))[0] || null;
}

function getDefaultPriority(policy = {}) {
    return policy?.isSystemDefault ? 1 : 0;
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

export function isSystemDefaultReorderPolicy(policy = {}) {
    return Boolean(policy?.isSystemDefault) && normalizeText(policy.scopeType) === "global";
}

export function resolveSystemDefaultPolicy(policies = [], { activeOnly = true } = {}) {
    const globalPolicies = (policies || []).filter(policy =>
        normalizeText(policy?.scopeType) === "global"
        && (!activeOnly || policy?.isActive)
    );

    const explicitDefault = globalPolicies
        .filter(policy => isSystemDefaultReorderPolicy(policy))
        .sort((left, right) => getUpdatedTime(right) - getUpdatedTime(left))[0] || null;

    if (explicitDefault) {
        return explicitDefault;
    }

    return globalPolicies
        .slice()
        .sort((left, right) => getUpdatedTime(right) - getUpdatedTime(left))[0] || null;
}

export function buildReorderPolicySimpleExplanation(policy = {}, options = {}) {
    const targetLabel = resolveReorderPolicyTargetLabel(policy, options);
    const {
        scopeType,
        shortWindowDays,
        shortWindowWeight,
        longWindowDays,
        longWindowWeight,
        leadTimeDays,
        safetyDays,
        targetCoverDays,
        lowHistoryUnitThreshold,
        minimumOrderQty,
        packSize,
        zeroDemandBehavior
    } = getNormalizedPolicySettings(policy);
    const isSystemDefault = isSystemDefaultReorderPolicy(policy);

    const scopeLine = scopeType === "category"
        ? `Moneta uses this rule for active products in the ${targetLabel} category when there is no product-specific rule.`
        : scopeType === "product"
            ? `Moneta uses this rule only for ${targetLabel}.`
            : isSystemDefault
                ? "Moneta uses this as the default reorder rule unless a category or product rule takes over."
                : "This is a global-level rule draft. Moneta uses a global rule only when it is the active Moneta default rule.";

    const demandLine = `It blends demand using ${shortWindowWeight}% from the last ${shortWindowDays} days and ${longWindowWeight}% from the last ${longWindowDays} days.`;
    const thresholdLine = `It tells the team to reorder when stock drops below ${leadTimeDays + safetyDays} days of cover (${leadTimeDays} lead-time days and ${safetyDays} safety days).`;
    const targetLine = `When that happens, it aims to top stock back up to ${targetCoverDays} days of cover.`;
    const lowHistoryLine = lowHistoryUnitThreshold > 0
        ? `If an item sells ${lowHistoryUnitThreshold} ${pluralize(lowHistoryUnitThreshold, "unit")} or less across the ${longWindowDays}-day window, Moneta asks for manual review first.`
        : "Low-history items follow the same rule as the rest of this policy.";
    const zeroDemandLine = zeroDemandBehavior === "suppress"
        ? "If there is no recent demand, Moneta does not recommend a reorder."
        : "If there is no recent demand, Moneta shows manual review instead of auto-reordering.";
    const orderingLine = minimumOrderQty > 0 || packSize > 1
        ? `Suggested orders respect a minimum of ${minimumOrderQty || 0} ${pluralize(minimumOrderQty || 0, "unit")} and pack sizes of ${packSize}.`
        : "Suggested order quantity comes straight from the stock-cover calculation.";

    return [scopeLine, demandLine, thresholdLine, targetLine, lowHistoryLine, zeroDemandLine, orderingLine].join(" ");
}

export function buildReorderPolicyExplanation(policy = {}, options = {}) {
    return buildReorderPolicySimpleExplanation(policy, options);
}

export function buildReorderPolicyWorkedExample(policy = {}, options = {}) {
    const sampleDailyUnits = Math.max(1, toInteger(options.sampleDailyUnits, 2, 1));
    const {
        longWindowDays,
        leadTimeDays,
        safetyDays,
        targetCoverDays,
        lowHistoryUnitThreshold,
        minimumOrderQty,
        packSize,
        zeroDemandBehavior
    } = getNormalizedPolicySettings(policy);

    const reorderPoint = Math.ceil(sampleDailyUnits * (leadTimeDays + safetyDays));
    const targetStock = Math.ceil(sampleDailyUnits * targetCoverDays);
    const rawSuggestedQty = Math.max(0, targetStock - reorderPoint);
    const minimumAdjustedQty = minimumOrderQty > 0
        ? Math.max(rawSuggestedQty, minimumOrderQty)
        : rawSuggestedQty;
    const finalSuggestedQty = roundUpToPack(minimumAdjustedQty, packSize);

    const exampleLines = [
        `If an item sells about ${sampleDailyUnits} ${pluralize(sampleDailyUnits, "unit")} per day, Moneta will reorder when stock falls to ${reorderPoint} ${pluralize(reorderPoint, "unit")} or below.`,
        `It will then aim to bring stock back up to ${targetStock} ${pluralize(targetStock, "unit")} on hand.`
    ];

    if (rawSuggestedQty > 0) {
        if (finalSuggestedQty !== rawSuggestedQty) {
            exampleLines.push(`That starts as ${rawSuggestedQty} ${pluralize(rawSuggestedQty, "unit")}, then rounds to ${finalSuggestedQty} because of the minimum-order and pack rules.`);
        } else {
            exampleLines.push(`That means Moneta would suggest ordering ${finalSuggestedQty} ${pluralize(finalSuggestedQty, "unit")}.`);
        }
    } else {
        exampleLines.push("In this example, the reorder trigger and target stock do not create a separate order quantity.");
    }

    if (lowHistoryUnitThreshold > 0) {
        exampleLines.push(`If the item sells only ${lowHistoryUnitThreshold} ${pluralize(lowHistoryUnitThreshold, "unit")} or less in ${longWindowDays} days, Moneta will still ask for manual review.`);
    }

    exampleLines.push(zeroDemandBehavior === "suppress"
        ? "If there are no recent sales at all, Moneta will hide the recommendation."
        : "If there are no recent sales at all, Moneta will show manual review.");

    return exampleLines.join(" ");
}

export function buildReorderPolicyPrecedenceSummary(policy = {}, options = {}) {
    const targetLabel = resolveReorderPolicyTargetLabel(policy, options);
    const { scopeType } = getNormalizedPolicySettings(policy);
    const isSystemDefault = isSystemDefaultReorderPolicy(policy);

    if (scopeType === "product") {
        return `Moneta checks this product rule first for ${targetLabel}. If it cannot use it, Moneta falls back to the matching category rule, then the active global default.`;
    }

    if (scopeType === "category") {
        return `Moneta uses this category rule after checking for a product-specific rule. If no product rule applies, Moneta uses this category rule, then falls back to the active global default if needed.`;
    }

    return isSystemDefault
        ? "This is the global default. Moneta uses it only when there is no active product rule or category rule that is more specific."
        : "This is a global-level rule draft. Moneta will only use a global rule as the fallback when that rule is the active Moneta default.";
}

export function resolveReorderPolicyFallbackChain(policy = {}, policies = [], excludePolicyId = "") {
    const { scopeType } = getNormalizedPolicySettings(policy);
    const activePolicies = (policies || []).filter(candidate => candidate?.isActive && candidate.id !== excludePolicyId);
    const entries = [];

    if (scopeType === "product") {
        const categoryFallback = pickLatestPolicy(activePolicies, candidate =>
            normalizeText(candidate.scopeType) === "category"
            && normalizeText(candidate.categoryId) === normalizeText(policy.categoryId)
        );
        const globalFallback = resolveSystemDefaultPolicy(activePolicies, { activeOnly: true });

        if (categoryFallback) {
            entries.push({ key: "category", title: "Category Fallback", policy: categoryFallback });
        }

        if (globalFallback) {
            entries.push({ key: "global", title: "Global Default", policy: globalFallback });
        }

        return entries;
    }

    if (scopeType === "category") {
        const globalFallback = resolveSystemDefaultPolicy(activePolicies, { activeOnly: true });
        if (globalFallback) {
            entries.push({ key: "global", title: "Global Default", policy: globalFallback });
        }
    }

    return entries;
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
            const defaultDiff = getDefaultPriority(right) - getDefaultPriority(left);
            if (defaultDiff !== 0) return defaultDiff;
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
