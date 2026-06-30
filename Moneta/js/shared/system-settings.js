import {
    DEFAULT_SYSTEM_SETTINGS_DOC_ID,
    MONETA_SYSTEM_SETTINGS_SEED,
    SYSTEM_SETTINGS_DOC_IDS
} from "../config/system-settings-config.js";
import { getState } from "../app/store.js";
import {
    findCountryCurrencyReferenceByCurrencyCode,
    getCountryCurrencyReferenceByCountryCode
} from "./country-currency-reference.js";

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizeUpperText(value, fallback = "") {
    const normalized = normalizeText(value).toUpperCase();
    return normalized || fallback;
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
        },
        inventoryOperations: {
            ...(row.inventoryOperations || {})
        },
        localization: {
            ...(row.localization || {}),
            currencyControl: normalizeCurrencyControl(row.localization?.currencyControl || {})
        }
    };
}

function normalizeCurrencyControl(value = {}) {
    return {
        isLocked: Boolean(value.isLocked),
        lockedOn: value.lockedOn || null,
        lockedBy: normalizeText(value.lockedBy),
        lockReason: normalizeText(value.lockReason),
        firstDocumentType: normalizeText(value.firstDocumentType),
        firstDocumentId: normalizeText(value.firstDocumentId),
        firstBusinessId: normalizeText(value.firstBusinessId),
        lockedCountryCode: normalizeUpperText(value.lockedCountryCode),
        lockedCountryName: normalizeText(value.lockedCountryName),
        lockedCurrencyCode: normalizeUpperText(value.lockedCurrencyCode),
        lockedCurrencyName: normalizeText(value.lockedCurrencyName),
        lockedCurrencySymbol: normalizeText(value.lockedCurrencySymbol),
        lockedLocale: normalizeText(value.lockedLocale)
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

export function getInventoryOperationsSettings(settings = null) {
    const seedDefaults = getSystemSettingByDocId(SYSTEM_SETTINGS_DOC_IDS.inventoryOperations, MONETA_SYSTEM_SETTINGS_SEED)?.inventoryOperations || {};
    const row = getSystemSettingByDocId(SYSTEM_SETTINGS_DOC_IDS.inventoryOperations, settings) || {};
    const inventoryOperations = row.inventoryOperations || {};

    return {
        lowStockThreshold: normalizeInteger(inventoryOperations.lowStockThreshold, normalizeInteger(seedDefaults.lowStockThreshold, 5, 0), 0),
        mediumStockThreshold: normalizeInteger(inventoryOperations.mediumStockThreshold, normalizeInteger(seedDefaults.mediumStockThreshold, 20, 0), 0),
        inventoryTargetStock: normalizeInteger(inventoryOperations.inventoryTargetStock, normalizeInteger(seedDefaults.inventoryTargetStock, 24, 0), 0)
    };
}

export function getLocalizationSettings(settings = null, referenceRows = null) {
    const seedDefaults = getSystemSettingByDocId(SYSTEM_SETTINGS_DOC_IDS.localization, MONETA_SYSTEM_SETTINGS_SEED)?.localization || {};
    const row = getSystemSettingByDocId(SYSTEM_SETTINGS_DOC_IDS.localization, settings) || {};
    const localization = row.localization || {};
    const currencyControl = normalizeCurrencyControl(localization.currencyControl || seedDefaults.currencyControl || {});

    const defaultCountryCode = normalizeUpperText(localization.defaultCountryCode, normalizeUpperText(seedDefaults.defaultCountryCode, "IN"));
    const countryReference = getCountryCurrencyReferenceByCountryCode(defaultCountryCode, referenceRows) || null;
    const defaultCurrencyCode = normalizeUpperText(
        localization.defaultCurrencyCode,
        normalizeUpperText(seedDefaults.defaultCurrencyCode, normalizeUpperText(countryReference?.primaryCurrencyCode, "INR"))
    );
    const currencyReference = findCountryCurrencyReferenceByCurrencyCode(defaultCurrencyCode, referenceRows, { includeInactive: true })
        || countryReference
        || null;

    return {
        defaultCountryCode,
        defaultCountryName: normalizeText(countryReference?.countryName || ""),
        defaultCurrencyCode,
        defaultCurrencyName: normalizeText(currencyReference?.primaryCurrencyName || defaultCurrencyCode),
        defaultCurrencySymbol: normalizeText(currencyReference?.primaryCurrencySymbol || defaultCurrencyCode),
        defaultLocale: normalizeText(localization.defaultLocale || countryReference?.locale || seedDefaults.defaultLocale || "en-IN"),
        currencySymbolOverride: normalizeText(localization.currencySymbolOverride || ""),
        minorUnit: normalizeInteger(currencyReference?.minorUnit, 2, 0),
        currencyControl,
        isCurrencyLocked: currencyControl.isLocked
    };
}

export function getLocalizationCurrencyControl(settings = null) {
    const row = getSystemSettingByDocId(SYSTEM_SETTINGS_DOC_IDS.localization, settings) || {};
    return normalizeCurrencyControl(row.localization?.currencyControl || {});
}

export function buildLocalizationSystemSettingRow(row = null) {
    const seedRow = cloneRow(getSystemSettingByDocId(SYSTEM_SETTINGS_DOC_IDS.localization, MONETA_SYSTEM_SETTINGS_SEED) || {});
    const normalizedRow = cloneRow({
        ...(row || {}),
        docId: normalizeText(row?.docId || row?.id || SYSTEM_SETTINGS_DOC_IDS.localization) || SYSTEM_SETTINGS_DOC_IDS.localization
    });
    const localizationSettings = getLocalizationSettings([normalizedRow]);

    return {
        ...seedRow,
        ...normalizedRow,
        docId: SYSTEM_SETTINGS_DOC_IDS.localization,
        localization: {
            ...(seedRow.localization || {}),
            ...(normalizedRow.localization || {}),
            defaultCountryCode: localizationSettings.defaultCountryCode,
            defaultCurrencyCode: localizationSettings.defaultCurrencyCode,
            defaultLocale: localizationSettings.defaultLocale,
            currencySymbolOverride: normalizeText(normalizedRow.localization?.currencySymbolOverride || seedRow.localization?.currencySymbolOverride || ""),
            currencyControl: normalizeCurrencyControl(normalizedRow.localization?.currencyControl || seedRow.localization?.currencyControl || {})
        }
    };
}

export function buildLocalizationCurrencyLock(row = null, options = {}) {
    const {
        currencySnapshot = null,
        lockedOn = null,
        lockedBy = "",
        lockReason = "first-priced-document",
        firstDocumentType = "",
        firstDocumentId = "",
        firstBusinessId = ""
    } = options;
    const normalizedRow = buildLocalizationSystemSettingRow(row);
    const localizationSettings = getLocalizationSettings([normalizedRow]);
    const snapshot = currencySnapshot && typeof currencySnapshot === "object" ? currencySnapshot : {};
    const lockedCountryCode = normalizeUpperText(snapshot.countryCode, localizationSettings.defaultCountryCode || "IN");
    const lockedCurrencyCode = normalizeUpperText(
        snapshot.currencyCode || snapshot.currency || snapshot.defaultCurrencyCode,
        localizationSettings.defaultCurrencyCode || "INR"
    );
    const lockedLocale = normalizeText(snapshot.locale || snapshot.defaultLocale || localizationSettings.defaultLocale || "en-IN");
    const lockedCurrencySymbol = normalizeText(
        snapshot.resolvedCurrencySymbol
        || snapshot.currencySymbolOverride
        || snapshot.currencySymbol
        || snapshot.defaultCurrencySymbol
        || localizationSettings.currencySymbolOverride
        || localizationSettings.defaultCurrencySymbol
        || lockedCurrencyCode
    );

    return normalizeCurrencyControl({
        isLocked: true,
        lockedOn,
        lockedBy,
        lockReason,
        firstDocumentType,
        firstDocumentId,
        firstBusinessId,
        lockedCountryCode,
        lockedCountryName: normalizeText(snapshot.countryName || localizationSettings.defaultCountryName || ""),
        lockedCurrencyCode,
        lockedCurrencyName: normalizeText(snapshot.currencyName || snapshot.defaultCurrencyName || localizationSettings.defaultCurrencyName || lockedCurrencyCode),
        lockedCurrencySymbol,
        lockedLocale
    });
}

export function buildLockedLocalizationSystemSettingRow(row = null, options = {}) {
    const normalizedRow = buildLocalizationSystemSettingRow(row);
    const nextCurrencyControl = buildLocalizationCurrencyLock(normalizedRow, options);
    const snapshot = options.currencySnapshot && typeof options.currencySnapshot === "object"
        ? options.currencySnapshot
        : {};
    const nextSymbolOverride = normalizeText(snapshot.currencySymbolOverride || normalizedRow.localization?.currencySymbolOverride || "");

    return {
        ...normalizedRow,
        localization: {
            ...normalizedRow.localization,
            defaultCountryCode: nextCurrencyControl.lockedCountryCode || normalizedRow.localization.defaultCountryCode,
            defaultCurrencyCode: nextCurrencyControl.lockedCurrencyCode || normalizedRow.localization.defaultCurrencyCode,
            defaultLocale: nextCurrencyControl.lockedLocale || normalizedRow.localization.defaultLocale,
            currencySymbolOverride: nextSymbolOverride,
            currencyControl: nextCurrencyControl
        }
    };
}
