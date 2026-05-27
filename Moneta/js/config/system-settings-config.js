export const SYSTEM_SETTINGS_DOC_IDS = {
    leadWorkflow: "leadWorkflow",
    inventoryOperations: "inventoryOperations"
};

export const DEFAULT_SYSTEM_SETTINGS_DOC_ID = SYSTEM_SETTINGS_DOC_IDS.leadWorkflow;

export const MONETA_SYSTEM_SETTINGS_SEED = [
    {
        docId: SYSTEM_SETTINGS_DOC_IDS.leadWorkflow,
        settingName: "Lead Workflow",
        settingGroup: "Pre-Sales",
        description: "Controls quote follow-up defaults, default quote validity, and enquiry stale-attention thresholds.",
        isActive: true,
        sortOrder: 1,
        leadWorkflow: {
            quoteSentFollowUpDays: 3,
            quoteAcceptedFollowUpDays: 2,
            quoteDraftValidityDays: 14,
            staleWarningDays: 3,
            staleCriticalDays: 7
        }
    },
    {
        docId: SYSTEM_SETTINGS_DOC_IDS.inventoryOperations,
        settingName: "Inventory Operations",
        settingGroup: "Inventory",
        description: "Controls app-wide inventory health thresholds used by alerts, dashboard stock signals, and reports.",
        isActive: true,
        sortOrder: 2,
        inventoryOperations: {
            lowStockThreshold: 5,
            mediumStockThreshold: 20,
            inventoryTargetStock: 24
        }
    }
];
