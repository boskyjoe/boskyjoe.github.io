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

function numberToWords(num) {
    // 1. Check for the correct global object and simplify access
    if (typeof ToWords === 'undefined' && typeof window.ToWords === 'undefined') {
        console.error("The 'ToWords' library is not available. Ensure the script is loaded.");
        return "Conversion Error";
    }

    // Assuming global exposure from CDN
    const ToWordsClass = window.ToWords || ToWords;

    // 2. Pass 'currencyOptions' directly to the constructor
    const toWordsConverter = new ToWordsClass({
        localeCode: 'en-IN',
        currencyOptions: {
            name: 'Rupee',
            plural: 'Rupees',
            symbol: '₹',
            fractionalUnit: {
                name: 'Paisa',
                plural: 'Paise',
                symbol: '',
            },
        }
    });

    try {
        // 3. Pass conversion behavior options to the .convert() method
        return toWordsConverter.convert(num, {
            currency: true,
            ignoreDecimal: false,
        });
    } catch (error) {
        console.error("Failed to convert number to words:", num, error);
        return "Error in word conversion";
    }
}
