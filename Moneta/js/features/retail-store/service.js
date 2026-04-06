import { createRetailSaleRecord } from "./repository.js";

export const RETAIL_STORES = ["Church Store", "Tasty Treats"];
export const RETAIL_SALE_TYPES = ["Revenue", "Sample"];
export const RETAIL_PAYMENT_TYPES = ["Pay Later", "Pay Now"];
export const RETAIL_DISCOUNT_TYPES = ["Percentage", "Fixed"];

function normalizeText(value) {
    return (value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function parseRequiredDate(value, label) {
    const input = normalizeText(value);

    if (!input) {
        throw new Error(`${label} is required.`);
    }

    const date = new Date(`${input}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${label} is invalid.`);
    }

    return date;
}

function buildProductLookup(catalogueItems = []) {
    return new Map((catalogueItems || []).map(item => [item.productId, item]));
}

function normalizeLineItems(rows = [], catalogueItems = []) {
    const catalogueLookup = buildProductLookup(catalogueItems);

    return (rows || [])
        .filter(row => (Number(row.quantity) || 0) > 0)
        .map(row => {
            const catalogueItem = catalogueLookup.get(row.productId);

            if (!catalogueItem) {
                throw new Error(`"${row.productName}" is no longer part of the selected sales catalogue.`);
            }

            const quantity = Math.max(0, Math.floor(normalizeNumber(row.quantity)));
            const unitPrice = roundCurrency(normalizeNumber(catalogueItem.sellingPrice, row.unitPrice));
            const lineDiscountPercentage = Math.max(0, normalizeNumber(row.lineDiscountPercentage));
            const grossTotal = roundCurrency(quantity * unitPrice);
            const lineDiscountAmount = roundCurrency(grossTotal * (lineDiscountPercentage / 100));
            const lineTotal = roundCurrency(grossTotal - lineDiscountAmount);

            return {
                productId: row.productId,
                productName: row.productName,
                categoryId: row.categoryId || catalogueItem.categoryId || "",
                categoryName: row.categoryName || catalogueItem.categoryName || "-",
                quantity,
                unitPrice,
                lineDiscountPercentage,
                lineDiscountAmount,
                lineTotal
            };
        })
        .filter(item => item.quantity > 0);
}

function calculateOrderDiscountAmount(subtotalAfterLineDiscounts, discountType, percentageValue, fixedValue) {
    const normalizedType = RETAIL_DISCOUNT_TYPES.includes(discountType) ? discountType : "Percentage";

    if (normalizedType === "Fixed") {
        return roundCurrency(Math.min(Math.max(0, normalizeNumber(fixedValue)), subtotalAfterLineDiscounts));
    }

    const safePercentage = Math.min(Math.max(0, normalizeNumber(percentageValue)), 100);
    return roundCurrency(subtotalAfterLineDiscounts * (safePercentage / 100));
}

export function calculateRetailDraftSummary(rows = [], adjustments = {}, paymentDraft = {}) {
    const lineItems = (rows || []).filter(row => (Number(row.quantity) || 0) > 0);

    const itemsSubtotal = roundCurrency(lineItems.reduce((sum, row) => {
        return sum + ((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0));
    }, 0));

    const totalLineDiscount = roundCurrency(lineItems.reduce((sum, row) => {
        const gross = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
        return sum + (gross * ((Number(row.lineDiscountPercentage) || 0) / 100));
    }, 0));

    const subtotalAfterLineDiscounts = roundCurrency(itemsSubtotal - totalLineDiscount);
    const orderDiscountType = RETAIL_DISCOUNT_TYPES.includes(adjustments.orderDiscountType)
        ? adjustments.orderDiscountType
        : "Percentage";
    const orderDiscountAmount = calculateOrderDiscountAmount(
        subtotalAfterLineDiscounts,
        orderDiscountType,
        adjustments.orderDiscountPercentage,
        adjustments.orderDiscountAmount
    );
    const orderTaxPercentage = Math.max(0, normalizeNumber(adjustments.orderTaxPercentage));
    const taxableAmount = roundCurrency(Math.max(0, subtotalAfterLineDiscounts - orderDiscountAmount));
    const totalTax = roundCurrency(taxableAmount * (orderTaxPercentage / 100));
    const grandTotal = roundCurrency(taxableAmount + totalTax);

    const amountReceived = Math.max(0, roundCurrency(normalizeNumber(paymentDraft.amountReceived)));
    const appliedPayment = roundCurrency(Math.min(amountReceived, grandTotal));
    const balanceDue = roundCurrency(Math.max(0, grandTotal - appliedPayment));

    return {
        lineItems,
        itemCount: lineItems.length,
        totalQuantity: lineItems.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0),
        itemsSubtotal,
        totalLineDiscount,
        subtotalAfterLineDiscounts,
        orderDiscountType,
        orderDiscountAmount,
        orderTaxPercentage,
        totalTax,
        grandTotal,
        appliedPayment,
        balanceDue
    };
}

function resolvePaymentStatus(summary, paymentType) {
    if (summary.grandTotal <= 0) return "Paid";
    if (paymentType !== "Pay Now") return "Unpaid";
    if (summary.appliedPayment <= 0) return "Unpaid";
    if (summary.balanceDue <= 0) return "Paid";
    return "Partially Paid";
}

export function validateRetailSalePayload(payload, user, catalogueHeaders = [], catalogueItems = []) {
    if (!user) {
        throw new Error("You must be logged in to save a retail sale.");
    }

    const saleDate = parseRequiredDate(payload.saleDate, "Sale date");
    const store = RETAIL_STORES.includes(normalizeText(payload.store))
        ? normalizeText(payload.store)
        : "";
    const saleType = RETAIL_SALE_TYPES.includes(normalizeText(payload.saleType))
        ? normalizeText(payload.saleType)
        : "";
    const paymentType = RETAIL_PAYMENT_TYPES.includes(normalizeText(payload.paymentType))
        ? normalizeText(payload.paymentType)
        : "Pay Later";
    const salesCatalogueId = normalizeText(payload.salesCatalogueId);
    const manualVoucherNumber = normalizeText(payload.manualVoucherNumber);
    const customerName = normalizeText(payload.customerName);
    const customerPhone = normalizeText(payload.customerPhone);
    const customerEmail = normalizeText(payload.customerEmail);
    const customerAddress = normalizeText(payload.customerAddress);
    const saleNotes = normalizeText(payload.saleNotes);

    if (!store) {
        throw new Error("Store is required.");
    }

    if (!saleType) {
        throw new Error("Sale type is required.");
    }

    if (!salesCatalogueId) {
        throw new Error("Select a sales catalogue.");
    }

    if (!manualVoucherNumber) {
        throw new Error("Manual voucher number is required.");
    }

    if (!customerName) {
        throw new Error("Customer name is required.");
    }

    if (!customerPhone && !customerEmail) {
        throw new Error("Provide at least a customer phone number or email.");
    }

    if (store === "Tasty Treats" && !customerAddress) {
        throw new Error("Customer address is required for Tasty Treats orders.");
    }

    const catalogueHeader = (catalogueHeaders || []).find(catalogue => catalogue.id === salesCatalogueId);
    if (!catalogueHeader) {
        throw new Error("The selected sales catalogue could not be found.");
    }

    if (!catalogueHeader.isActive) {
        throw new Error("Only active sales catalogues can be used for retail sales.");
    }

    const draftSummary = calculateRetailDraftSummary(payload.lineItems, {
        orderDiscountType: payload.orderDiscountType,
        orderDiscountPercentage: payload.orderDiscountPercentage,
        orderDiscountAmount: payload.orderDiscountAmount,
        orderTaxPercentage: payload.orderTaxPercentage
    }, {
        amountReceived: payload.amountReceived
    });

    const normalizedLineItems = normalizeLineItems(draftSummary.lineItems, catalogueItems);
    if (normalizedLineItems.length === 0) {
        throw new Error("Add at least one product with quantity greater than zero.");
    }

    const summary = calculateRetailDraftSummary(normalizedLineItems, {
        orderDiscountType: payload.orderDiscountType,
        orderDiscountPercentage: payload.orderDiscountPercentage,
        orderDiscountAmount: payload.orderDiscountAmount,
        orderTaxPercentage: payload.orderTaxPercentage
    }, {
        amountReceived: payload.amountReceived
    });

    if (saleType === "Sample" && summary.grandTotal > 0) {
        throw new Error("Sample sales must net to zero after discounts.");
    }

    let initialPayment = null;
    if (paymentType === "Pay Now") {
        const paymentMode = normalizeText(payload.paymentMode);
        const transactionRef = normalizeText(payload.transactionRef);
        const notes = normalizeText(payload.paymentNotes);

        if (!paymentMode) {
            throw new Error("Payment mode is required for Pay Now sales.");
        }

        if (!transactionRef) {
            throw new Error("Payment reference is required for Pay Now sales.");
        }

        if (summary.appliedPayment <= 0) {
            throw new Error("Enter a payment amount greater than zero.");
        }

        if (normalizeNumber(payload.amountReceived) > summary.grandTotal) {
            throw new Error("Overpayments are not enabled yet in Moneta Retail.");
        }

        initialPayment = {
            paymentDate: saleDate,
            amountPaid: summary.appliedPayment,
            paymentMode,
            transactionRef,
            notes
        };
    }

    const paymentStatus = resolvePaymentStatus(summary, paymentType);

    return {
        salePayload: {
            saleDate,
            store,
            saleType,
            salesCatalogueId,
            salesCatalogueName: catalogueHeader.catalogueName || "-",
            salesSeasonId: catalogueHeader.seasonId || "",
            salesSeasonName: catalogueHeader.seasonName || "-",
            manualVoucherNumber,
            customerInfo: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                address: store === "Tasty Treats" ? customerAddress : ""
            },
            saleNotes,
            lineItems: normalizedLineItems,
            financials: {
                itemsSubtotal: summary.itemsSubtotal,
                totalLineDiscount: summary.totalLineDiscount,
                subtotalAfterLineDiscounts: summary.subtotalAfterLineDiscounts,
                orderDiscountType: summary.orderDiscountType,
                orderDiscountValue: summary.orderDiscountType === "Fixed"
                    ? normalizeNumber(payload.orderDiscountAmount)
                    : normalizeNumber(payload.orderDiscountPercentage),
                orderDiscountAmount: summary.orderDiscountAmount,
                orderTaxPercentage: summary.orderTaxPercentage,
                totalTax: summary.totalTax,
                grandTotal: summary.grandTotal
            },
            initialPayment
        },
        summary: {
            ...summary,
            paymentStatus
        }
    };
}

export async function saveRetailSale(payload, user, catalogueHeaders = [], catalogueItems = []) {
    const { salePayload, summary } = validateRetailSalePayload(payload, user, catalogueHeaders, catalogueItems);
    const docRef = await createRetailSaleRecord(salePayload, user);

    return {
        docRef,
        salePayload,
        summary
    };
}
