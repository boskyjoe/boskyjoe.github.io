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


export function numberToWords(num, ToWordsClass) {
    if (typeof ToWordsClass === 'undefined') {
        console.error("The ToWords library class must be passed as the second argument.");
        return "Conversion Error";
    }

    // Use the passed class directly
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
        return toWordsConverter.convert(num, {
            currency: true,
            ignoreDecimal: false,
        });
    } catch (error) {
        console.error("Failed to convert number to words:", num, error);
        return "Error in word conversion";
    }
}

/**
 * Converts a number to words in a specific currency format using the native Intl API.
 * @param {number} num - The number to convert.
 * @param {string} locale - The target locale (e.g., 'en-IN').
 * @param {string} currencyCode - The ISO currency code (e.g., 'INR').
 * @returns {string} The number in words.
 */
export function nativeNumberToWords(num, locale = 'en-IN', currencyCode = 'INR') {
    if (isNaN(num)) {
        return "Invalid Number";
    }

    try {
        const formatter = new Intl.NumberFormat(locale, {
            // Key 1: Set style to currency
            style: 'currency',
            currency: currencyCode,
            
            // Key 2: The magic option that converts the number to words
            notation: 'long',
            
            // Optional: Controls minimum/maximum fractional digits
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2
        });

        // The result will include the currency name in the specified language/locale.
        return formatter.format(num);

    } catch (e) {
        console.error("Intl.NumberFormat error:", e);
        return "Conversion Error";
    }
}


export function numberToWords(num, ToWordsClass) {
    // Check if the library class was successfully passed from main.js
    if (typeof ToWordsClass === 'undefined') {
        console.error("The ToWords library class must be passed as the second argument.");
        return "Conversion Error: Library Class Missing";
    }

    if (isNaN(num)) {
        return "Invalid Number";
    }

    try {
        // Instantiate ToWords with the Indian locale (en-IN)
        const toWordsConverter = new ToWordsClass({
            localeCode: 'en-IN',
            currencyOptions: {
                // Custom names for Rupee/Paisa
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

        // Perform the conversion with currency options
        return toWordsConverter.convert(num, {
            currency: true,
            ignoreDecimal: false,
        });
        
    } catch (error) {
        // This will log the detailed error from the ToWords library
        console.error("Failed to convert number to words:", error);
        return "Conversion Error: Check Console";
    }
}
