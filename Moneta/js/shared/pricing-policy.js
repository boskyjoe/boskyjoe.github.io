import { DEFAULT_PRICING_POLICY_DOC_ID } from "../config/pricing-policy-config.js";

export const COSTING_METHODS = ["manual-standard-cost", "latest-purchase", "weighted-average"];
export const SELLING_PRICE_BEHAVIORS = ["manual", "suggest-from-margin", "auto-update-from-margin"];

export const DEFAULT_PRICING_POLICY = {
    costingMethod: "weighted-average",
    sellingPriceBehavior: "suggest-from-margin",
    defaultTargetMarginPercentage: 35,
    costChangeAlertThresholdPercentage: 5,
    allowManualCostOverride: true,
    isActive: true
};

function normalizeText(value) {
    return (value || "").trim();
}

function normalizeNumber(value, fallback = 0, minimum = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(minimum, parsed);
}

export function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function getUpdatedTime(row = {}) {
    const candidate = row.updatedOn || row.updatedAt || row.createdOn || row.createdAt || 0;
    if (typeof candidate?.toMillis === "function") return candidate.toMillis();
    if (candidate?.toDate) return candidate.toDate().getTime();
    const date = new Date(candidate);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function getNormalizedPricingPolicySettings(policy = {}) {
    return {
        costingMethod: COSTING_METHODS.includes(policy.costingMethod)
            ? policy.costingMethod
            : DEFAULT_PRICING_POLICY.costingMethod,
        sellingPriceBehavior: SELLING_PRICE_BEHAVIORS.includes(policy.sellingPriceBehavior)
            ? policy.sellingPriceBehavior
            : DEFAULT_PRICING_POLICY.sellingPriceBehavior,
        defaultTargetMarginPercentage: normalizeNumber(
            policy.defaultTargetMarginPercentage,
            DEFAULT_PRICING_POLICY.defaultTargetMarginPercentage,
            0
        ),
        costChangeAlertThresholdPercentage: normalizeNumber(
            policy.costChangeAlertThresholdPercentage,
            DEFAULT_PRICING_POLICY.costChangeAlertThresholdPercentage,
            0
        ),
        allowManualCostOverride: policy.allowManualCostOverride !== undefined
            ? Boolean(policy.allowManualCostOverride)
            : DEFAULT_PRICING_POLICY.allowManualCostOverride
    };
}

export function isSystemDefaultPricingPolicy(policy = {}) {
    return Boolean(policy?.isSystemDefault);
}

export function resolveSystemDefaultPricingPolicy(policies = [], { activeOnly = true } = {}) {
    const rows = (policies || []).filter(policy => !activeOnly || policy?.isActive !== false);
    const explicit = rows
        .filter(policy => isSystemDefaultPricingPolicy(policy) || normalizeText(policy.id || policy.docId) === DEFAULT_PRICING_POLICY_DOC_ID)
        .sort((left, right) => getUpdatedTime(right) - getUpdatedTime(left))[0] || null;

    return explicit
        || rows.slice().sort((left, right) => getUpdatedTime(right) - getUpdatedTime(left))[0]
        || null;
}

export function calculateSellingPriceFromMargin(standardCost = 0, marginPercentage = 0) {
    const cost = roundCurrency(standardCost);
    const margin = normalizeNumber(marginPercentage, 0, 0);
    return roundCurrency(cost * (1 + (margin / 100)));
}

export function calculateCostChangePercent(nextCost = 0, previousCost = 0) {
    const current = roundCurrency(nextCost);
    const previous = roundCurrency(previousCost);

    if (previous <= 0) {
        return current <= 0 ? 0 : null;
    }

    return roundCurrency(((current - previous) / previous) * 100);
}

export function buildPricingPolicyExplanation(policy = {}) {
    const {
        costingMethod,
        sellingPriceBehavior,
        defaultTargetMarginPercentage,
        costChangeAlertThresholdPercentage,
        allowManualCostOverride
    } = getNormalizedPricingPolicySettings(policy);

    const costingLine = costingMethod === "weighted-average"
        ? "Moneta calculates standard cost using the weighted average of active purchase history."
        : costingMethod === "latest-purchase"
            ? "Moneta uses the latest active purchase price as the standard cost."
            : "Moneta keeps the product's current standard cost unless a user changes it manually.";

    const sellingLine = sellingPriceBehavior === "auto-update-from-margin"
        ? `Moneta automatically recalculates selling price from standard cost using a ${defaultTargetMarginPercentage}% target margin.`
        : sellingPriceBehavior === "suggest-from-margin"
            ? `Moneta suggests a selling price from standard cost using a ${defaultTargetMarginPercentage}% target margin, but it does not overwrite the live selling price.`
            : "Moneta leaves selling price fully manual even when standard cost changes.";

    const alertLine = costChangeAlertThresholdPercentage > 0
        ? `Moneta flags products for price review when standard cost moves by ${costChangeAlertThresholdPercentage}% or more.`
        : "Moneta does not raise a separate cost-change review threshold.";

    const overrideLine = allowManualCostOverride
        ? "Manual standard-cost overrides are allowed when the team needs an exception."
        : "Manual standard-cost overrides are blocked so purchase history stays in control.";

    return [costingLine, sellingLine, alertLine, overrideLine].join(" ");
}
