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


// (This is a simplified version. For production, a more robust library might be better)
export function numberToWords(num) {
    // This is a complex function. For now, we'll return a placeholder.
    // You can find many JavaScript libraries online to do this conversion accurately.
    // For example, using a library like 'to-words'.
    if (num === 0) return 'Zero';
    // A full implementation is very long. Let's just return the number as a string for now.
    return `${num.toFixed(2)} in words (placeholder)`; 
}

/**
 * ✅ NEW: Converts a number into Indian currency words (Rupees and Paise).
 * Uses the 'to-words' library.
 * @param {number} num - The number to convert.
 * @returns {string} The amount in words (e.g., "Rupees One Thousand Two Hundred and Fifty Only").
 */
export function numberToWords(num) {
    if (typeof toWords === 'undefined') {
        console.error("The 'to-words' library is not loaded.");
        return "Number to words conversion unavailable.";
    }

    const toWordsConverter = new ToWords({
        localeCode: 'en-IN', // Use Indian English numbering (Lakhs, Crores)
        converterOptions: {
            currency: true,          // Enable currency mode
            ignoreDecimal: false,    // Include the decimal part
            ignoreZeroCurrency: false,
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
        return toWordsConverter.convert(num) + ' Only';
    } catch (error) {
        console.error("Failed to convert number to words:", error);
        return "Error in conversion";
    }
}
