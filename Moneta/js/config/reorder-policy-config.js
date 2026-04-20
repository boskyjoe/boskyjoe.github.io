export const DEFAULT_REORDER_POLICY_SEED = {
    policyName: "Moneta Default Rule",
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
    isActive: true,
    isSystemDefault: true
};
