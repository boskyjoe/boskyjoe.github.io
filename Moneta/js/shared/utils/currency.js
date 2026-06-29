import { getLocalizationSettings } from "../system-settings.js";

function normalizeText(value) {
    return String(value || "").trim();
}

export function getResolvedCurrencyFormatContext(currency = "", locale = "") {
    const localization = getLocalizationSettings();
    const resolvedCurrency = normalizeText(currency).toUpperCase() || localization.defaultCurrencyCode || "INR";
    const resolvedLocale = normalizeText(locale) || localization.defaultLocale || "en-IN";
    const useSymbolOverride = resolvedCurrency === localization.defaultCurrencyCode;
    const minorUnit = Math.max(0, Number(localization.minorUnit ?? 2) || 0);

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
