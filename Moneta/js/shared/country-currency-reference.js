import { MONETA_COUNTRY_CURRENCY_REFERENCE_SEED } from "../config/country-currency-reference-config.js";
import { getState } from "../app/store.js";

function normalizeText(value) {
    return String(value || "").trim();
}

function cloneRow(row = {}) {
    return {
        ...row,
        alternateCurrencyCodes: Array.isArray(row.alternateCurrencyCodes)
            ? [...row.alternateCurrencyCodes]
            : []
    };
}

function getSeedRows() {
    return MONETA_COUNTRY_CURRENCY_REFERENCE_SEED.map(cloneRow);
}

function getAvailableRows(rows = null) {
    if (Array.isArray(rows) && rows.length) {
        return rows.map(cloneRow);
    }

    const stateRows = getState().masterData?.countryCurrencyReference || [];
    if (stateRows.length) {
        return stateRows.map(cloneRow);
    }

    return getSeedRows();
}

function getSortOrder(row = {}) {
    return Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 9999;
}

export function getCountryCurrencyReferenceRows(rows = null, { includeInactive = true } = {}) {
    return getAvailableRows(rows)
        .filter(row => includeInactive || row.isActive !== false)
        .sort((left, right) => {
            const sortDiff = getSortOrder(left) - getSortOrder(right);
            if (sortDiff !== 0) return sortDiff;
            return normalizeText(left.countryName).localeCompare(normalizeText(right.countryName));
        });
}

export function getCountryCurrencyReferenceByDocId(docId = "", rows = null) {
    const normalizedDocId = normalizeText(docId).toUpperCase();
    if (!normalizedDocId) return null;

    return getCountryCurrencyReferenceRows(rows, { includeInactive: true })
        .find(row => normalizeText(row.id || row.docId).toUpperCase() === normalizedDocId)
        || null;
}

export function getCountryCurrencyReferenceByCountryCode(countryCode = "", rows = null) {
    const normalizedCountryCode = normalizeText(countryCode).toUpperCase();
    if (!normalizedCountryCode) return null;

    return getCountryCurrencyReferenceRows(rows, { includeInactive: true })
        .find(row => normalizeText(row.countryCode).toUpperCase() === normalizedCountryCode)
        || null;
}

export function findCountryCurrencyReferenceByCurrencyCode(currencyCode = "", rows = null, { includeInactive = true } = {}) {
    const normalizedCurrencyCode = normalizeText(currencyCode).toUpperCase();
    if (!normalizedCurrencyCode) return null;

    return getCountryCurrencyReferenceRows(rows, { includeInactive })
        .find(row => normalizeText(row.primaryCurrencyCode).toUpperCase() === normalizedCurrencyCode
            || (row.alternateCurrencyCodes || []).some(code => normalizeText(code).toUpperCase() === normalizedCurrencyCode))
        || null;
}
