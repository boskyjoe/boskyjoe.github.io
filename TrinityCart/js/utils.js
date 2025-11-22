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

/**
 * ✅ FINAL & CORRECT: Converts a number into Indian currency words.
 * Assumes the 'ToWords' library has been loaded via the <script defer> tag.
 * @param {number} num - The number to convert.
 * @returns {string} The amount in words (e.g., "Rupees One Thousand Two Hundred and Fifty Only").
 */
export function numberToWords(num) {
    // Safety check in case the library fails to load.
    if (typeof ToWords === 'undefined') {
        console.error("The 'ToWords' library is not available.");
        return "Conversion Error";
    }

    // ✅ 1. Create a new instance WITH the configuration object.
    const toWordsConverter = new ToWords({
        localeCode: 'en-IN', // This enables Lakhs and Crores
        converterOptions: {
            currency: true,          // This enables currency mode
            ignoreDecimal: false,    // Process numbers after the decimal
            currencyOptions: {       // Define the currency names
                name: 'Rupee',
                plural: 'Rupees',
                symbol: '₹',
                fractionalUnit: {
                    name: 'Paisa',
                    plural: 'Paise',
                    symbol: '',
                },
            }
        }
    });

    try {
        // ✅ 2. Call the .convert() method on the configured instance.
        return toWordsConverter.convert(num) + ' Only';
    } catch (error) {
        console.error("Failed to convert number to words:", num, error);
        return "Error in word conversion";
    }
}
