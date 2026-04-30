import {
    createPurchaseInvoiceRecord,
    recordPurchaseInvoicePayment,
    voidPurchaseInvoiceRecord,
    voidPurchaseInvoicePayment,
    updatePurchaseInvoiceRecord
} from "./repository.js";
import { getState } from "../../app/store.js";
import { syncProductPricingFromPurchases } from "../products/pricing-service.js";

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

function roundWeight(value) {
    return Number((Number(value) || 0).toFixed(3));
}

function normalizeDiscountType(value) {
    return normalizeText(value) === "Percentage" ? "Percentage" : "Fixed";
}

function calculateDiscountAmount(baseAmount, discountType, discountValue) {
    if (discountType === "Percentage") {
        return roundCurrency(baseAmount * (discountValue / 100));
    }

    return roundCurrency(discountValue);
}

function calculateLineItem(rawItem, product) {
    const quantity = normalizeNumber(rawItem.quantity);
    const unitPurchasePrice = normalizeNumber(rawItem.unitPurchasePrice);
    const discountType = normalizeDiscountType(rawItem.discountType);
    const discountValue = normalizeNumber(rawItem.discountValue);
    const taxPercentage = normalizeNumber(rawItem.taxPercentage);
    const grossPrice = roundCurrency(quantity * unitPurchasePrice);
    const discountAmount = calculateDiscountAmount(grossPrice, discountType, discountValue);
    const netPrice = roundCurrency(grossPrice - discountAmount);
    const taxAmount = roundCurrency(netPrice * (taxPercentage / 100));
    const lineItemTotal = roundCurrency(netPrice + taxAmount);
    const netWeightKg = roundWeight(product?.netWeightKg || rawItem.netWeightKg || 0);

    return {
        masterProductId: normalizeText(rawItem.masterProductId),
        productName: product?.itemName || normalizeText(rawItem.productName),
        quantity,
        unitPurchasePrice,
        discountType,
        discountValue,
        discountAmount,
        taxPercentage,
        grossPrice,
        netPrice,
        taxAmount,
        lineItemTotal,
        netWeightKg,
        totalWeightKg: roundWeight(netWeightKg * quantity)
    };
}

export function calculatePurchaseDraftSummary(payload, products = []) {
    const productMap = new Map(products.map(product => [product.id, product]));
    const lineItems = (payload.lineItems || []).map(item => {
        const product = productMap.get(normalizeText(item.masterProductId));
        return calculateLineItem(item, product);
    });
    const populatedLineItems = lineItems.filter(item => item.masterProductId);
    const itemsSubtotal = roundCurrency(populatedLineItems.reduce((sum, item) => sum + item.netPrice, 0));
    const totalItemLevelTax = roundCurrency(populatedLineItems.reduce((sum, item) => sum + item.taxAmount, 0));
    const invoiceDiscountType = normalizeDiscountType(payload.invoiceDiscountType);
    const invoiceDiscountValue = normalizeNumber(payload.invoiceDiscountValue);
    const invoiceDiscountAmount = calculateDiscountAmount(itemsSubtotal, invoiceDiscountType, invoiceDiscountValue);
    const taxableAmountForInvoice = roundCurrency(itemsSubtotal - invoiceDiscountAmount);
    const invoiceTaxPercentage = normalizeNumber(payload.invoiceTaxPercentage);
    const invoiceLevelTaxAmount = roundCurrency(taxableAmountForInvoice * (invoiceTaxPercentage / 100));
    const totalTaxAmount = roundCurrency(totalItemLevelTax + invoiceLevelTaxAmount);
    const invoiceTotal = roundCurrency(taxableAmountForInvoice + totalTaxAmount);

    return {
        lineItems,
        populatedLineItems,
        itemsSubtotal,
        invoiceDiscountType,
        invoiceDiscountValue,
        invoiceDiscountAmount,
        taxableAmountForInvoice,
        totalItemLevelTax,
        invoiceTaxPercentage,
        invoiceLevelTaxAmount,
        totalTaxAmount,
        invoiceTotal
    };
}

export function validatePurchaseInvoicePayload(payload, masterData) {
    const purchaseDateInput = normalizeText(payload.purchaseDate);
    const supplierId = normalizeText(payload.supplierId);
    const supplierInvoiceNo = normalizeText(payload.supplierInvoiceNo);
    const invoiceName = normalizeText(payload.invoiceName);
    const suppliers = masterData.suppliers || [];
    const products = masterData.products || [];
    const supplier = suppliers.find(item => item.id === supplierId);
    const summary = calculatePurchaseDraftSummary(payload, products);
    const lineItems = summary.populatedLineItems;
    const productIds = new Set();

    if (!purchaseDateInput) {
        throw new Error("Purchase date is required.");
    }

    if (!supplierId) {
        throw new Error("Supplier is required.");
    }

    if (!supplier) {
        throw new Error("The selected supplier could not be found.");
    }

    if (!invoiceName) {
        throw new Error("Invoice name is required.");
    }

    if (lineItems.length === 0) {
        throw new Error("Add at least one product to the invoice.");
    }

    lineItems.forEach(item => {
        const product = products.find(entry => entry.id === item.masterProductId);

        if (!product) {
            throw new Error("One of the selected products could not be found.");
        }

        if (productIds.has(item.masterProductId)) {
            throw new Error("Each product can only appear once in a purchase invoice.");
        }

        if (item.quantity <= 0) {
            throw new Error(`Quantity for ${item.productName || "a line item"} must be greater than zero.`);
        }

        if (item.unitPurchasePrice < 0) {
            throw new Error(`Unit purchase price for ${item.productName || "a line item"} cannot be negative.`);
        }

        if (item.discountValue < 0) {
            throw new Error(`Discount for ${item.productName || "a line item"} cannot be negative.`);
        }

        if (item.discountType === "Percentage" && item.discountValue > 100) {
            throw new Error(`Discount percentage for ${item.productName || "a line item"} cannot exceed 100%.`);
        }

        if (item.discountAmount > item.grossPrice) {
            throw new Error(`Discount for ${item.productName || "a line item"} cannot exceed the gross amount.`);
        }

        if (item.taxPercentage < 0) {
            throw new Error(`Tax percentage for ${item.productName || "a line item"} cannot be negative.`);
        }

        productIds.add(item.masterProductId);
    });

    if (summary.invoiceDiscountValue < 0) {
        throw new Error("Invoice discount cannot be negative.");
    }

    if (summary.invoiceDiscountType === "Percentage" && summary.invoiceDiscountValue > 100) {
        throw new Error("Invoice discount percentage cannot exceed 100%.");
    }

    if (summary.invoiceDiscountAmount > summary.itemsSubtotal) {
        throw new Error("Invoice discount cannot exceed the subtotal.");
    }

    if (summary.invoiceTaxPercentage < 0) {
        throw new Error("Invoice tax percentage cannot be negative.");
    }

    const purchaseDate = new Date(`${purchaseDateInput}T00:00:00`);
    if (Number.isNaN(purchaseDate.getTime())) {
        throw new Error("Purchase date is invalid.");
    }

    return {
        purchaseDate,
        supplierId,
        supplierName: supplier.supplierName,
        supplierInvoiceNo,
        invoiceName,
        lineItems,
        itemsSubtotal: summary.itemsSubtotal,
        invoiceDiscountType: summary.invoiceDiscountType,
        invoiceDiscountValue: summary.invoiceDiscountValue,
        invoiceDiscountAmount: summary.invoiceDiscountAmount,
        taxableAmountForInvoice: summary.taxableAmountForInvoice,
        totalItemLevelTax: summary.totalItemLevelTax,
        invoiceTaxPercentage: summary.invoiceTaxPercentage,
        invoiceLevelTaxAmount: summary.invoiceLevelTaxAmount,
        totalTaxAmount: summary.totalTaxAmount,
        invoiceTotal: summary.invoiceTotal,
        productIds: Array.from(productIds)
    };
}

export async function savePurchaseInvoice(payload, masterData, user) {
    if (!user) {
        throw new Error("You must be logged in to save a purchase invoice.");
    }

    const docId = normalizeText(payload.docId);
    const invoiceData = validatePurchaseInvoicePayload(payload, masterData);

    if (docId) {
        const result = await updatePurchaseInvoiceRecord(docId, invoiceData, user);

        try {
            await syncProductPricingFromPurchases(result.affectedProductIds, {
                products: masterData.products,
                pricingPolicies: masterData.pricingPolicies,
                salesCatalogues: masterData.salesCatalogues,
                user
            });
        } catch (error) {
            console.error("[Moneta] Purchase pricing sync failed after invoice update:", {
                affectedProductIds: result.affectedProductIds,
                userRole: user.role || "unknown",
                error
            });
            throw error;
        }

        return { mode: "update" };
    }

    const result = await createPurchaseInvoiceRecord(invoiceData, user);

    try {
        await syncProductPricingFromPurchases(result.affectedProductIds, {
            products: masterData.products,
            pricingPolicies: masterData.pricingPolicies,
            salesCatalogues: masterData.salesCatalogues,
            user
        });
    } catch (error) {
        console.error("[Moneta] Purchase pricing sync failed after invoice create:", {
            affectedProductIds: result.affectedProductIds,
            userRole: user.role || "unknown",
            error
        });
        throw error;
    }

    return { mode: "create" };
}

export function validatePurchasePaymentPayload(payload, invoice, masterData) {
    if (!invoice) {
        throw new Error("Choose a purchase invoice before recording payment.");
    }

    const paymentDateInput = normalizeText(payload.paymentDate);
    const paymentMode = normalizeText(payload.paymentMode);
    const transactionRef = normalizeText(payload.transactionRef);
    const notes = normalizeText(payload.notes);
    const amountPaid = roundCurrency(normalizeNumber(payload.amountPaid));
    const balanceDue = roundCurrency(normalizeNumber(invoice.balanceDue, normalizeNumber(invoice.invoiceTotal)));
    const paymentModes = (masterData.paymentModes || []).filter(mode => mode.isActive);
    const invoiceStatus = normalizeText(invoice.invoiceStatus || invoice.paymentStatus);

    if (!paymentDateInput) {
        throw new Error("Payment date is required.");
    }

    if (invoiceStatus === "Voided") {
        throw new Error("Voided purchase invoices cannot accept payments.");
    }

    if (Number.isNaN(new Date(`${paymentDateInput}T00:00:00`).getTime())) {
        throw new Error("Payment date is invalid.");
    }

    if (amountPaid <= 0) {
        throw new Error("Payment amount must be greater than zero.");
    }

    if (balanceDue <= 0) {
        throw new Error("This invoice has already been fully paid.");
    }

    if (amountPaid > balanceDue) {
        throw new Error("Payment amount cannot exceed the outstanding balance.");
    }

    if (!paymentMode) {
        throw new Error("Payment mode is required.");
    }

    if (paymentModes.length > 0 && !paymentModes.some(mode => normalizeText(mode.paymentMode) === paymentMode)) {
        throw new Error("The selected payment mode could not be found.");
    }

    return {
        relatedInvoiceId: invoice.id,
        relatedInvoiceNumber: invoice.invoiceId || "",
        invoiceName: invoice.invoiceName || "",
        supplierId: invoice.supplierId || "",
        supplierName: invoice.supplierName || "",
        paymentDate: new Date(`${paymentDateInput}T00:00:00`),
        amountPaid,
        paymentMode,
        transactionRef,
        notes
    };
}

export async function savePurchasePayment(payload, invoice, masterData, user) {
    if (!user) {
        throw new Error("You must be logged in to record a supplier payment.");
    }

    const paymentData = validatePurchasePaymentPayload(payload, invoice, masterData);
    await recordPurchaseInvoicePayment(invoice.id, paymentData, user);

    return paymentData;
}

export function validatePurchasePaymentVoidPayload(payment, reason) {
    if (!payment) {
        throw new Error("Choose a payment before trying to void it.");
    }

    const trimmedReason = normalizeText(reason);
    const paymentStatus = normalizeText(payment.paymentStatus || payment.status || "Verified");
    const amountPaid = roundCurrency(normalizeNumber(payment.amountPaid));

    if (payment.isReversalEntry) {
        throw new Error("Reversal entries cannot be voided.");
    }

    if (paymentStatus === "Voided") {
        throw new Error("This payment has already been voided.");
    }

    if (amountPaid <= 0) {
        throw new Error("Only posted supplier payments can be voided.");
    }

    if (!trimmedReason) {
        throw new Error("A void reason is required.");
    }

    if (trimmedReason.length < 8) {
        throw new Error("Please enter a more descriptive void reason.");
    }

    return trimmedReason;
}

export async function voidPurchasePayment(payment, reason, user) {
    if (!user) {
        throw new Error("You must be logged in to void a supplier payment.");
    }

    const validatedReason = validatePurchasePaymentVoidPayload(payment, reason);
    await voidPurchaseInvoicePayment(payment.id, validatedReason, user);

    return { reason: validatedReason };
}

export function validatePurchaseInvoiceVoidPayload(invoice, reason) {
    if (!invoice) {
        throw new Error("Choose a purchase invoice before trying to void it.");
    }

    const trimmedReason = normalizeText(reason);
    const invoiceStatus = normalizeText(invoice.invoiceStatus || invoice.paymentStatus || "Unpaid");

    if (invoiceStatus === "Voided") {
        throw new Error("This purchase invoice has already been voided.");
    }

    if (!trimmedReason) {
        throw new Error("A void reason is required.");
    }

    if (trimmedReason.length < 8) {
        throw new Error("Please enter a more descriptive void reason.");
    }

    return trimmedReason;
}

export async function voidPurchaseInvoice(invoice, reason, user) {
    if (!user) {
        throw new Error("You must be logged in to void a purchase invoice.");
    }

    const validatedReason = validatePurchaseInvoiceVoidPayload(invoice, reason);
    const result = await voidPurchaseInvoiceRecord(invoice.id, validatedReason, user);
    await syncProductPricingFromPurchases(result.affectedProductIds, {
        products: getState()?.masterData?.products || [],
        pricingPolicies: getState()?.masterData?.pricingPolicies || [],
        salesCatalogues: getState()?.masterData?.salesCatalogues || [],
        user
    });

    return {
        reason: validatedReason,
        ...result
    };
}
