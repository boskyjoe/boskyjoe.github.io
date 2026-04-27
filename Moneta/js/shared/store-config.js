import {
    CONSIGNMENT_STORE_NAME,
    DEFAULT_STORE_CONFIG_DOC_ID,
    DEFAULT_STORE_NAME,
    MONETA_STORE_CONFIG_SEED
} from "../config/store-config.js";
import { getState } from "../app/store.js";

function normalizeText(value) {
    return String(value || "").trim();
}

function cloneRow(row = {}) {
    return {
        ...row,
        taxInfo: {
            ...(row.taxInfo || {})
        },
        paymentDetails: {
            ...(row.paymentDetails || {})
        },
        quoteTheme: {
            ...(row.quoteTheme || {})
        }
    };
}

function getSeedRows() {
    return MONETA_STORE_CONFIG_SEED.map(cloneRow);
}

function getAvailableConfigs(configs = null) {
    if (Array.isArray(configs) && configs.length) {
        return configs.map(cloneRow);
    }

    const stateConfigs = getState().masterData?.storeConfigs || [];
    if (stateConfigs.length) {
        return stateConfigs.map(cloneRow);
    }

    return getSeedRows();
}

function getSortOrder(row = {}) {
    return Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 999;
}

export function getStoreConfigs(configs = null, { includeInactive = true } = {}) {
    return getAvailableConfigs(configs)
        .filter(row => includeInactive || row.isActive !== false)
        .sort((left, right) => {
            const sortDiff = getSortOrder(left) - getSortOrder(right);
            if (sortDiff !== 0) return sortDiff;
            return normalizeText(left.storeName).localeCompare(normalizeText(right.storeName));
        });
}

export function resolveDefaultStoreConfig(configs = null, { includeInactive = true } = {}) {
    const rows = getStoreConfigs(configs, { includeInactive });
    return rows.find(row => Boolean(row.isDefault) || row.docId === DEFAULT_STORE_CONFIG_DOC_ID)
        || rows.find(row => normalizeText(row.storeName) === DEFAULT_STORE_NAME)
        || rows[0]
        || null;
}

export function getStoreConfigByName(storeName = "", configs = null, { includeInactive = true } = {}) {
    const rows = getStoreConfigs(configs, { includeInactive });
    const normalizedName = normalizeText(storeName);

    if (!normalizedName) {
        return resolveDefaultStoreConfig(rows, { includeInactive: true });
    }

    return rows.find(row => normalizeText(row.storeName) === normalizedName)
        || resolveDefaultStoreConfig(rows, { includeInactive: true });
}

export function getStoreConfigByDocId(docId = "", configs = null) {
    const normalizedDocId = normalizeText(docId);
    if (!normalizedDocId) return null;

    return getStoreConfigs(configs, { includeInactive: true })
        .find(row => normalizeText(row.id || row.docId) === normalizedDocId)
        || null;
}

export function getRetailStoreNames(configs = null, { includeInactive = false, includeValue = "" } = {}) {
    const currentValue = normalizeText(includeValue);
    return getStoreConfigs(configs, { includeInactive: true })
        .filter(row => currentValue
            ? (normalizeText(row.storeName) === currentValue || includeInactive || row.isActive !== false)
            : (includeInactive || row.isActive !== false))
        .map(row => normalizeText(row.storeName))
        .filter(Boolean);
}

export function isRetailStoreName(storeName = "", configs = null) {
    const normalizedName = normalizeText(storeName);
    if (!normalizedName) return false;

    return getStoreConfigs(configs, { includeInactive: true })
        .some(row => normalizeText(row.storeName) === normalizedName);
}

export function getDefaultRetailStoreName(configs = null) {
    return normalizeText(resolveDefaultStoreConfig(configs)?.storeName) || DEFAULT_STORE_NAME;
}

export function getRetailStoreTaxDefaults(storeName = "", configs = null) {
    const config = getStoreConfigByName(storeName, configs, { includeInactive: true }) || {};
    const taxInfo = config.taxInfo || {};

    return {
        cgstPercentage: Math.max(0, Number(taxInfo.cgstRate) || 0),
        sgstPercentage: Math.max(0, Number(taxInfo.sgstRate) || 0)
    };
}

export function getRetailStoreSalePrefix(storeName = "", configs = null) {
    return normalizeText(getStoreConfigByName(storeName, configs, { includeInactive: true })?.salePrefix) || "SALE";
}

export function doesRetailStoreRequireCustomerAddress(storeName = "", configs = null) {
    return Boolean(getStoreConfigByName(storeName, configs, { includeInactive: true })?.requiresCustomerAddress);
}

export function getStoreQuoteTheme(storeName = "", configs = null) {
    const normalizedName = normalizeText(storeName);

    if (normalizedName === CONSIGNMENT_STORE_NAME) {
        return {
            accent: "#7c5a12",
            accentSoft: "#fff9e6",
            accentStrong: "#5f460d",
            gradientStart: "#fffdf2",
            gradientEnd: "#fef3c7",
            badgeLabel: "Distributor Channel",
            channelLabel: CONSIGNMENT_STORE_NAME,
            title: "Consignment Quote",
            strapline: "Distributor / reseller channel quote"
        };
    }

    const storeConfig = getStoreConfigByName(normalizedName, configs, { includeInactive: true }) || {};
    return {
        accent: storeConfig.quoteTheme?.accent || "#143f66",
        accentSoft: storeConfig.quoteTheme?.accentSoft || "#edf4fb",
        accentStrong: storeConfig.quoteTheme?.accentStrong || "#0f3556",
        gradientStart: storeConfig.quoteTheme?.gradientStart || "#f7fafc",
        gradientEnd: storeConfig.quoteTheme?.gradientEnd || "#e6eff8",
        badgeLabel: storeConfig.quoteTheme?.badgeLabel || "Store Quote",
        channelLabel: storeConfig.quoteTheme?.channelLabel || normalizeText(storeConfig.storeName) || DEFAULT_STORE_NAME,
        title: storeConfig.quoteTheme?.title || "Customer Quote",
        strapline: storeConfig.quoteTheme?.strapline || "Prepared for direct store fulfilment"
    };
}

export function getStoreConfigInvoiceDetails(storeName = "", configs = null) {
    return getStoreConfigByName(storeName, configs, { includeInactive: true }) || resolveDefaultStoreConfig(configs, { includeInactive: true }) || {};
}
