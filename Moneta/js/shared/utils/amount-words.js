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

export function amountToWords(amount, currency = "INR") {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
        return "Invalid amount";
    }

    const [whole, fraction] = normalizedAmount.toFixed(2).split(".");
    const wholeNumber = Number(whole) || 0;
    const fractionNumber = Number(fraction) || 0;

    if (currency !== "INR") {
        return `${wholeNumber}`;
    }

    const wholeWords = convertIndianNumber(wholeNumber);
    const paisaWords = fractionNumber ? convertIndianNumber(fractionNumber) : "";

    return `${wholeWords} Rupees${paisaWords ? ` and ${paisaWords} Paisa` : ""} Only`;
}
