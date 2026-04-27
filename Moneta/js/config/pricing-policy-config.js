export const DEFAULT_PRICING_POLICY_DOC_ID = "moneta-default-pricing-policy";

export const DEFAULT_PRICING_POLICY_SEED = {
    docId: DEFAULT_PRICING_POLICY_DOC_ID,
    policyName: "Moneta Default Pricing Policy",
    costingMethod: "weighted-average",
    sellingPriceBehavior: "suggest-from-margin",
    defaultTargetMarginPercentage: 35,
    costChangeAlertThresholdPercentage: 5,
    allowManualCostOverride: true,
    isSystemDefault: true,
    isActive: true
};
