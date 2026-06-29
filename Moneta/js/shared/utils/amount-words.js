import { getLocalizationSettings } from "../system-settings.js";
import { resolveCurrencySnapshot } from "./currency.js";

function convertBelowHundred(num) {
    const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];

    const ten = Math.floor(num / 10);
    const one = num % 10;
    return `${tens[ten]}${one ? ` ${ones[one]}` : ""}`.trim();
}

function convertBelowThousand(num) {
    if (num < 100) return convertBelowHundred(num);

    const hundreds = Math.floor(num / 100);
    const remainder = num % 100;

    return `${convertBelowHundred(hundreds)} Hundred${remainder ? ` ${convertBelowHundred(remainder)}` : ""}`.trim();
}

function convertIndianNumber(num) {
    if (num === 0) return "Zero";

    const parts = [];
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const hundred = num % 1000;

    if (crore) parts.push(`${convertBelowHundred(crore)} Crore`);
    if (lakh) parts.push(`${convertBelowHundred(lakh)} Lakh`);
    if (thousand) parts.push(`${convertBelowHundred(thousand)} Thousand`);
    if (hundred) parts.push(convertBelowThousand(hundred));

    return parts.join(" ").trim();
}

function convertWesternNumber(num) {
    if (num === 0) return "Zero";

    const scales = [
        [1000000000000, "Trillion"],
        [1000000000, "Billion"],
        [1000000, "Million"],
        [1000, "Thousand"]
    ];

    let remaining = num;
    const parts = [];

    scales.forEach(([divisor, label]) => {
        const chunk = Math.floor(remaining / divisor);
        if (chunk > 0) {
            parts.push(`${convertBelowThousand(chunk)} ${label}`);
            remaining %= divisor;
        }
    });

    if (remaining > 0) {
        parts.push(convertBelowThousand(remaining));
    }

    return parts.join(" ").trim();
}

export function amountToWords(amount, currency = "") {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
        return "Invalid amount";
    }

    const localization = getLocalizationSettings();
    const snapshot = typeof currency === "object" && currency
        ? resolveCurrencySnapshot(currency)
        : null;
    const resolvedCurrency = String(snapshot?.currencyCode || currency || localization.defaultCurrencyCode || "INR").trim().toUpperCase();
    const minorUnit = Math.max(0, Number(snapshot?.minorUnit ?? localization.minorUnit ?? 2) || 0);
    const [whole, fraction = ""] = normalizedAmount.toFixed(minorUnit).split(".");
    const wholeNumber = Number(whole) || 0;
    const fractionNumber = Number(fraction || 0) || 0;

    if (resolvedCurrency === "INR") {
        const wholeWords = convertIndianNumber(wholeNumber);
        const paisaWords = fractionNumber ? convertIndianNumber(fractionNumber) : "";

        return `${wholeWords} Rupees${paisaWords ? ` and ${paisaWords} Paisa` : ""} Only`;
    }

    const wholeWords = convertWesternNumber(wholeNumber);
    const defaultCurrencyCode = String(localization.defaultCurrencyCode || "").trim().toUpperCase();
    const currencyLabel = resolvedCurrency === defaultCurrencyCode
        ? (snapshot?.currencyName || localization.defaultCurrencyName || resolvedCurrency)
        : (snapshot?.currencyName || resolvedCurrency);
    const fractionLabel = minorUnit === 0 ? "" : "Cents";
    const fractionWords = fractionNumber ? convertWesternNumber(fractionNumber) : "";

    return `${wholeWords} ${currencyLabel}${fractionWords && fractionLabel ? ` and ${fractionWords} ${fractionLabel}` : ""} Only`;
}
