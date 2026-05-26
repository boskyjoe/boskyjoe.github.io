export const SYSTEM_SETTINGS_DOC_IDS = {
    leadWorkflow: "leadWorkflow"
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
    }
];
