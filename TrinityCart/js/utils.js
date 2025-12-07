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


// In js/utils.js

/**
 * Generates a dynamic, plausible Gmail address from a base string.
 * It cleans the string, converts it to lowercase, removes invalid characters,
 * truncates it, and appends a random 4-digit number to ensure uniqueness.
 *
 * @param {string} baseString - The string to use as the base for the email (e.g., a name, company, or venue).
 * @returns {string} A dynamically generated Gmail address.
 */
export function generateDynamicEmail(baseString) {
    // 1. Handle invalid or empty input gracefully
    if (!baseString || typeof baseString !== 'string' || baseString.trim() === '') {
        // If the input is bad, return a unique temporary email
        const timestamp = Date.now().toString().slice(-6);
        return `temp.user.${timestamp}@gmail.com`;
    }

    // 2. Sanitize the string:
    //    a. Convert to lowercase.
    //    b. Remove all characters that are not letters or numbers.
    const sanitizedBase = baseString
        .toLowerCase()
        .replace(/\s+/g, '.') // Replace spaces with periods for readability
        .replace(/[^a-z0-9.]/g, ''); // Remove any remaining special characters

    // 3. Truncate to a reasonable length to avoid overly long emails
    const truncatedBase = sanitizedBase.substring(0, 30);

    // 4. Generate a random 4-digit number to ensure uniqueness
    const randomNumber = Math.floor(1000 + Math.random() * 9000);

    // 5. Combine the parts to form the final email address
    return `${truncatedBase}${randomNumber}@gmail.com`;
}


/**
 * Converts a numeric amount to words based on currency
 * Supports USD, EUR, GBP, INR, and other currencies
 * 
 * @param {number} amount - The numeric amount to convert
 * @param {string} currency - Currency code (USD, EUR, GBP, INR, etc.)
 * @returns {string} - Amount in words
 */
export function amountToWords(amount, currency = 'USD') {
    if (isNaN(amount) || amount < 0) {
        return 'Invalid amount';
    }

    // Split amount into integer and decimal parts
    const parts = amount.toFixed(2).split('.');
    const integerPart = parseInt(parts[0]);
    const decimalPart = parseInt(parts[1]);

    // Get currency configuration
    const currencyConfig = getCurrencyConfig(currency);

    // Convert integer part to words
    let words = '';
    
    if (integerPart === 0) {
        words = 'Zero';
    } else {
        if (currency === 'INR') {
            words = convertToIndianWords(integerPart);
        } else {
            words = convertToInternationalWords(integerPart);
        }
    }

    // Add major currency unit
    words += ' ' + currencyConfig.major;
    if (integerPart !== 1) {
        words += currencyConfig.majorPlural || 's';
    }

    // Add decimal part if exists
    if (decimalPart > 0) {
        words += ' and ';
        words += convertToInternationalWords(decimalPart);
        words += ' ' + currencyConfig.minor;
        if (decimalPart !== 1) {
            words += currencyConfig.minorPlural || 's';
        }
    }

    return words.trim();
}

/**
 * Get currency configuration
 */
function getCurrencyConfig(currency) {
    const configs = {
        'USD': { major: 'Dollar', majorPlural: 's', minor: 'Cent', minorPlural: 's' },
        'EUR': { major: 'Euro', majorPlural: 's', minor: 'Cent', minorPlural: 's' },
        'GBP': { major: 'Pound', majorPlural: 's', minor: 'Pence', minorPlural: '' },
        'INR': { major: 'Rupee', majorPlural: 's', minor: 'Paisa', minorPlural: '' },
        'AUD': { major: 'Dollar', majorPlural: 's', minor: 'Cent', minorPlural: 's' },
        'CAD': { major: 'Dollar', majorPlural: 's', minor: 'Cent', minorPlural: 's' },
        'JPY': { major: 'Yen', majorPlural: '', minor: 'Sen', minorPlural: '' },
        'CNY': { major: 'Yuan', majorPlural: '', minor: 'Fen', minorPlural: '' },
        'AED': { major: 'Dirham', majorPlural: 's', minor: 'Fil', minorPlural: 's' },
        'SAR': { major: 'Riyal', majorPlural: 's', minor: 'Halala', minorPlural: 's' }
    };
    
    return configs[currency.toUpperCase()] || { major: currency, majorPlural: 's', minor: 'Cent', minorPlural: 's' };
}

/**
 * Convert number to words (International system: thousands, millions, billions)
 */
function convertToInternationalWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
        return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    }
    if (num < 1000) {
        return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertToInternationalWords(num % 100) : '');
    }
    if (num < 1000000) {
        return convertToInternationalWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convertToInternationalWords(num % 1000) : '');
    }
    if (num < 1000000000) {
        return convertToInternationalWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 !== 0 ? ' ' + convertToInternationalWords(num % 1000000) : '');
    }
    if (num < 1000000000000) {
        return convertToInternationalWords(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 !== 0 ? ' ' + convertToInternationalWords(num % 1000000000) : '');
    }
    
    return convertToInternationalWords(Math.floor(num / 1000000000000)) + ' Trillion' + (num % 1000000000000 !== 0 ? ' ' + convertToInternationalWords(num % 1000000000000) : '');
}

/**
 * Convert number to words (Indian system: thousands, lakhs, crores)
 */
function convertToIndianWords(num) {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    function convertUpTo99(n) {
        if (n === 0) return '';
        if (n < 10) return ones[n];
        if (n < 20) return teens[n - 10];
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    }

    if (num === 0) return '';
    if (num < 100) return convertUpTo99(num);
    if (num < 1000) {
        return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertUpTo99(num % 100) : '');
    }
    if (num < 100000) {
        return convertToIndianWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convertToIndianWords(num % 1000) : '');
    }
    if (num < 10000000) {
        return convertToIndianWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convertToIndianWords(num % 100000) : '');
    }
    if (num < 1000000000) {
        return convertToIndianWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convertToIndianWords(num % 10000000) : '');
    }
    
    return convertToIndianWords(Math.floor(num / 1000000000)) + ' Arab' + (num % 1000000000 !== 0 ? ' ' + convertToIndianWords(num % 1000000000) : '');
}

