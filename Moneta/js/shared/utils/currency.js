import { getLocalizationSettings } from "../system-settings.js";
import {
    findCountryCurrencyReferenceByCurrencyCode,
    getCountryCurrencyReferenceByCountryCode
} from "../country-currency-reference.js";

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizeUpperText(value) {
    return normalizeText(value).toUpperCase();
}

function normalizeMinorUnit(value, fallback = 2) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed)) return Math.max(0, fallback);
    return Math.max(0, parsed);
}

function isSnapshotObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function resolveCurrencySnapshot(snapshot = null) {
    const localization = getLocalizationSettings();
    const input = isSnapshotObject(snapshot) ? snapshot : {};
    const defaultCurrencyCode = normalizeUpperText(localization.defaultCurrencyCode) || "INR";
    const currencyCode = normalizeUpperText(
        input.currencyCode
        || input.currency
        || input.defaultCurrencyCode
    ) || defaultCurrencyCode;
    const countryCode = normalizeUpperText(input.countryCode || localization.defaultCountryCode || "IN");
    const countryReference = getCountryCurrencyReferenceByCountryCode(countryCode) || null;
    const currencyReference = countryReference && normalizeUpperText(countryReference.primaryCurrencyCode) === currencyCode
        ? countryReference
        : (findCountryCurrencyReferenceByCurrencyCode(currencyCode, null, { includeInactive: true }) || countryReference || null);
    const locale = normalizeText(input.locale || input.defaultLocale || localization.defaultLocale) || "en-IN";
    const minorUnit = normalizeMinorUnit(input.minorUnit, normalizeMinorUnit(localization.minorUnit, 2));
    const currencySymbolOverride = normalizeText(
        input.currencySymbolOverride
        || (currencyCode === defaultCurrencyCode ? localization.currencySymbolOverride : "")
    );
    const useCountryPrimaryCurrencyPresentation = Boolean(
        countryReference
        && normalizeUpperText(countryReference.primaryCurrencyCode) === currencyCode
        && !currencySymbolOverride
    );
    const currencySymbol = normalizeText(
        (useCountryPrimaryCurrencyPresentation ? countryReference?.primaryCurrencySymbol : "")
        || input.currencySymbol
        || input.defaultCurrencySymbol
        || currencyReference?.primaryCurrencySymbol
        || (currencyCode === defaultCurrencyCode ? localization.defaultCurrencySymbol : "")
    );
    const resolvedCurrencySymbol = currencySymbolOverride || currencySymbol || currencyCode;

    return {
        countryCode,
        countryName: normalizeText(input.countryName || countryReference?.countryName || localization.defaultCountryName || ""),
        currencyCode,
        currencyName: normalizeText(
            (useCountryPrimaryCurrencyPresentation ? countryReference?.primaryCurrencyName : "")
            || input.currencyName
            || input.defaultCurrencyName
            || currencyReference?.primaryCurrencyName
            || (currencyCode === defaultCurrencyCode ? localization.defaultCurrencyName : "")
            || currencyCode
        ),
        currencySymbol,
        currencySymbolOverride,
        resolvedCurrencySymbol,
        locale,
        minorUnit
    };
}

export function buildCurrencySnapshot(snapshot = null) {
    return resolveCurrencySnapshot(snapshot);
}

export function getResolvedCurrencyFormatContext(currency = "", locale = "") {
    if (isSnapshotObject(currency)) {
        const snapshot = resolveCurrencySnapshot({
            ...currency,
            locale: normalizeText(locale) || currency.locale || currency.defaultLocale || ""
        });

        return {
            currency: snapshot.currencyCode,
            locale: snapshot.locale,
            minorUnit: snapshot.minorUnit,
            currencySymbolOverride: snapshot.resolvedCurrencySymbol
        };
    }

    const localization = getLocalizationSettings();
    const resolvedCurrency = normalizeUpperText(currency) || localization.defaultCurrencyCode || "INR";
    const resolvedLocale = normalizeText(locale) || localization.defaultLocale || "en-IN";
    const useSymbolOverride = resolvedCurrency === localization.defaultCurrencyCode;
    const minorUnit = normalizeMinorUnit(localization.minorUnit, 2);

    return {
        currency: resolvedCurrency,
        locale: resolvedLocale,
        minorUnit,
        currencySymbolOverride: useSymbolOverride ? normalizeText(localization.currencySymbolOverride) : ""
    };
}

function buildCurrencyFormatter(context = {}) {
    return new Intl.NumberFormat(context.locale, {
        style: "currency",
        currency: context.currency,
        minimumFractionDigits: context.minorUnit,
        maximumFractionDigits: context.minorUnit
    });
}

export function formatCurrency(value, currency = "", locale = "") {
    const amount = Number(value) || 0;
    const context = getResolvedCurrencyFormatContext(currency, locale);
    const formatter = buildCurrencyFormatter(context);

    if (!context.currencySymbolOverride) {
        return formatter.format(amount);
    }

    return formatter.formatToParts(amount).map(part => (
        part.type === "currency" ? context.currencySymbolOverride : part.value
    )).join("");
}
