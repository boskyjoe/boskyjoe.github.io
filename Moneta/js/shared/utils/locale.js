import { getLocalizationSettings } from "../system-settings.js";

function normalizeText(value) {
    return String(value || "").trim();
}

function resolveLocale(locale = "") {
    return normalizeText(locale) || normalizeText(getLocalizationSettings().defaultLocale) || "en-IN";
}

function toDate(value) {
    if (!value) return null;
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalizedDate(value, options = {}, locale = "") {
    const date = toDate(value);
    if (!date) return "-";

    return date.toLocaleDateString(resolveLocale(locale), {
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...options
    });
}

export function formatLocalizedDateTime(value, options = {}, locale = "") {
    const date = toDate(value);
    if (!date) return "-";

    return date.toLocaleString(resolveLocale(locale), {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...options
    });
}

export function formatLocalizedTime(value, options = {}, locale = "") {
    const date = toDate(value);
    if (!date) return "-";

    return date.toLocaleTimeString(resolveLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
        ...options
    });
}

export function getResolvedLocale(locale = "") {
    return resolveLocale(locale);
}
