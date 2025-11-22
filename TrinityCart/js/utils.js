// utils.js


// This file will hold common, shared utility functions.

// We need to get the currency symbol from masterData here.
import { masterData } from './masterData.js';

/**
 * Formats a number as a currency string using the system-defined currency symbol.
 * @param {number} value - The number to format.
 * @returns {string} The formatted currency string (e.g., "₹1,250.00").
 */

export function formatCurrency(value) {
    // Get the currency symbol from the cached master data, defaulting to '$' if not found.
    const currencySymbol = masterData.systemSetups?.systemCurrency || '$';
    
    // Ensure we are working with a valid number.
    const numberValue = Number(value) || 0;

    // Use Intl.NumberFormat for proper formatting, including commas.
    // This is more robust than just toFixed(2).
    const formatter = new Intl.NumberFormat('en-IN', { // 'en-IN' is good for Indian numbering system
        style: 'currency',
        currency: 'INR', // Use 'INR' for Rupee, 'USD' for Dollar, etc.
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // The formatter will produce "₹1,250.00". We can use a regex to replace
    // the standard symbol with our custom one if needed, but for INR it's usually correct.
    // For now, let's stick to the standard formatter's output.
    return formatter.format(numberValue).replace('₹', currencySymbol);
}

let ToWordsLibrary = null;
/**
 * ✅ NEW & ROBUST: Dynamically imports the 'to-words' library on demand.
 * This is the most reliable way to load an external script in a module.
 * @returns {Promise<object>} A promise that resolves with the ToWords class.
 */
async function getToWords() {
    // If we have already loaded the library, return it immediately.
    if (ToWordsLibrary) {
        return ToWordsLibrary;
    }

    try {
        console.log("[Utils] Dynamically importing 'to-words' library for the first time...");
        // The import() function returns a promise that resolves with the module's exports.
        // For this library, the main export is on the 'default' property.
        const module = await import('https://cdn.jsdelivr.net/npm/to-words@3.2.0/dist/to-words.mjs');
        ToWordsLibrary = module.default; // Cache the loaded class
        console.log("[Utils] 'to-words' library successfully imported.");
        return ToWordsLibrary;
    } catch (error) {
        console.error("Fatal: Could not load the 'to-words' library from CDN.", error);
        throw new Error("Number to words conversion service is unavailable.");
    }
}


/**
 * ✅ CORRECTED: Converts a number into Indian currency words.
 * It now uses the dynamic loader function to ensure the library is available.
 * @param {number} num - The number to convert.
 * @returns {Promise<string>} A promise that resolves with the amount in words.
 */
export async function numberToWords(num) {
    // 1. Get the library, which will either be loaded from cache or fetched from the network.
    const ToWords = await getToWords();

    // 2. The rest of your logic is now guaranteed to work.
    const toWordsConverter = new ToWords({
        localeCode: 'en-IN',
        converterOptions: {
            currency: true,
            currencyOptions: {
                name: 'Rupee',
                plural: 'Rupees',
                symbol: '₹',
                fractionalUnit: { name: 'Paisa', plural: 'Paise', symbol: '' },
            }
        }
    });

    try {
        return toWordsConverter.convert(num) + ' Only';
    } catch (error) {
        console.error("Failed to convert number to words:", error);
        return "Error in conversion";
    }
}
