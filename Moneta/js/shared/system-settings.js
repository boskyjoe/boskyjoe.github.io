import {
    DEFAULT_SYSTEM_SETTINGS_DOC_ID,
    MONETA_SYSTEM_SETTINGS_SEED,
    SYSTEM_SETTINGS_DOC_IDS
} from "../config/system-settings-config.js";
import { getState } from "../app/store.js";

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizeInteger(value, fallback = 0, minimum = 0) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(minimum, parsed);
}

function cloneRow(row = {}) {
    return {
        ...row,
        leadWorkflow: {
            ...(row.leadWorkflow || {})
        }
    };
}

function getSeedRows() {
    return MONETA_SYSTEM_SETTINGS_SEED.map(cloneRow);
}

function getAvailableSettings(settings = null) {
    if (Array.isArray(settings) && settings.length) {
        return settings.map(cloneRow);
    }

    const stateRows = getState().masterData?.systemSettings || [];
    if (stateRows.length) {
        return stateRows.map(cloneRow);
    }

    return getSeedRows();
}

function getSortOrder(row = {}) {
    return Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 999;
}

export function getSystemSettings(settings = null, { includeInactive = true } = {}) {
    return getAvailableSettings(settings)
        .filter(row => includeInactive || row.isActive !== false)
        .sort((left, right) => {
            const sortDiff = getSortOrder(left) - getSortOrder(right);
            if (sortDiff !== 0) return sortDiff;
            return normalizeText(left.settingName).localeCompare(normalizeText(right.settingName));
        });
}

export function getSystemSettingByDocId(docId = "", settings = null) {
    const normalizedDocId = normalizeText(docId);
    if (!normalizedDocId) return null;

    return getSystemSettings(settings, { includeInactive: true })
        .find(row => normalizeText(row.id || row.docId) === normalizedDocId)
        || null;
}

export function getLeadWorkflowSettings(settings = null) {
    const seedDefaults = getSystemSettingByDocId(DEFAULT_SYSTEM_SETTINGS_DOC_ID, MONETA_SYSTEM_SETTINGS_SEED)?.leadWorkflow || {};
    const row = getSystemSettingByDocId(SYSTEM_SETTINGS_DOC_IDS.leadWorkflow, settings) || {};
    const leadWorkflow = row.leadWorkflow || {};

    return {
        quoteSentFollowUpDays: normalizeInteger(leadWorkflow.quoteSentFollowUpDays, normalizeInteger(seedDefaults.quoteSentFollowUpDays, 3, 0), 0),
        quoteAcceptedFollowUpDays: normalizeInteger(leadWorkflow.quoteAcceptedFollowUpDays, normalizeInteger(seedDefaults.quoteAcceptedFollowUpDays, 2, 0), 0),
        quoteDraftValidityDays: normalizeInteger(leadWorkflow.quoteDraftValidityDays, normalizeInteger(seedDefaults.quoteDraftValidityDays, 14, 1), 1),
        staleWarningDays: normalizeInteger(leadWorkflow.staleWarningDays, normalizeInteger(seedDefaults.staleWarningDays, 3, 1), 1),
        staleCriticalDays: normalizeInteger(leadWorkflow.staleCriticalDays, normalizeInteger(seedDefaults.staleCriticalDays, 7, 1), 1)
    };
}
