import { MONETA_STORE_CONFIG } from "../../config/store-config.js";
import {
    addRetailSaleReturnRecord,
    addRetailSaleExpenseRecord,
    createRetailSaleRecord,
    recordRetailSalePayment,
    updateRetailSaleRecord,
    voidRetailSaleRecord
} from "./repository.js";

export const RETAIL_STORES = ["Church Store", "Tasty Treats"];
export const RETAIL_SALE_TYPES = ["Revenue", "Sample"];
export const RETAIL_PAYMENT_TYPES = ["Pay Later", "Pay Now"];
export const RETAIL_DISCOUNT_TYPES = ["Percentage", "Fixed"];

export function getRetailStoreTaxDefaults(storeName = "") {
    const taxInfo = MONETA_STORE_CONFIG?.[storeName]?.taxInfo || null;

    return {
        cgstPercentage: Math.max(0, Number(taxInfo?.cgstRate) || 0),
        sgstPercentage: Math.max(0, Number(taxInfo?.sgstRate) || 0)
    };
}

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

export function resolveRetailSaleEditScope(sale = {}) {
    const saleStatus = normalizeText(sale.saleStatus || "Active");
    if (saleStatus === "Voided") {
        return "none";
    }

    const totalAmountPaid = roundCurrency(sale.totalAmountPaid);
    const paymentCount = Number(sale.financials?.paymentCount) || 0;
    const paymentStatus = normalizeText(sale.paymentStatus || "Unpaid");
    const totalExpenses = roundCurrency(sale.financials?.totalExpenses);
    const returnCount = Number(sale.returnCount) || 0;
    const returnStatus = normalizeText(sale.returnStatus || "Not Returned");
    const hasPayments = totalAmountPaid > 0 || paymentCount > 0 || ["Paid", "Partially Paid"].includes(paymentStatus);
    const hasExpenses = totalExpenses > 0;
    const hasReturns = returnCount > 0 || ["Partially Returned", "Fully Returned"].includes(returnStatus);

    return hasPayments || hasExpenses || hasReturns ? "limited" : "full";
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

function parsePositiveAmount(value, label) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`${label} must be greater than zero.`);
    }

    return roundCurrency(parsed);
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
            const cgstPercentage = Math.max(0, normalizeNumber(row.cgstPercentage));
            const sgstPercentage = Math.max(0, normalizeNumber(row.sgstPercentage));
            const lineSubtotal = roundCurrency(quantity * unitPrice);
            const lineDiscountAmount = roundCurrency(lineSubtotal * (lineDiscountPercentage / 100));
            const taxableAmount = roundCurrency(lineSubtotal - lineDiscountAmount);
            const cgstAmount = roundCurrency(taxableAmount * (cgstPercentage / 100));
            const sgstAmount = roundCurrency(taxableAmount * (sgstPercentage / 100));
            const taxAmount = roundCurrency(cgstAmount + sgstAmount);
            const lineTotal = roundCurrency(taxableAmount + taxAmount);

            return {
                productId: row.productId,
                productName: row.productName,
                categoryId: row.categoryId || catalogueItem.categoryId || "",
                categoryName: row.categoryName || catalogueItem.categoryName || "-",
                quantity,
                unitPrice,
                lineSubtotal,
                lineDiscountPercentage,
                lineDiscountAmount,
                taxableAmount,
                cgstPercentage,
                sgstPercentage,
                cgstAmount,
                sgstAmount,
                taxAmount,
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
    const totalCGST = roundCurrency(lineItems.reduce((sum, row) => {
        const gross = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
        const discount = gross * ((Number(row.lineDiscountPercentage) || 0) / 100);
        const taxableAmount = gross - discount;
        return sum + (taxableAmount * ((Number(row.cgstPercentage) || 0) / 100));
    }, 0));
    const totalSGST = roundCurrency(lineItems.reduce((sum, row) => {
        const gross = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
        const discount = gross * ((Number(row.lineDiscountPercentage) || 0) / 100);
        const taxableAmount = gross - discount;
        return sum + (taxableAmount * ((Number(row.sgstPercentage) || 0) / 100));
    }, 0));
    const totalItemLevelTax = roundCurrency(totalCGST + totalSGST);
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
    const finalTaxableAmount = roundCurrency(Math.max(0, subtotalAfterLineDiscounts - orderDiscountAmount));
    const orderLevelTaxAmount = roundCurrency(finalTaxableAmount * (orderTaxPercentage / 100));
    const totalTax = roundCurrency(totalItemLevelTax + orderLevelTaxAmount);
    const grandTotal = roundCurrency(finalTaxableAmount + totalTax);

    const amountReceived = Math.max(0, roundCurrency(normalizeNumber(paymentDraft.amountReceived)));
    const appliedPayment = roundCurrency(Math.min(amountReceived, grandTotal));
    const donationAmount = roundCurrency(Math.max(amountReceived - appliedPayment, 0));
    const balanceDue = roundCurrency(Math.max(0, grandTotal - appliedPayment));

    return {
        lineItems,
        itemCount: lineItems.length,
        totalQuantity: lineItems.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0),
        itemsSubtotal,
        totalLineDiscount,
        subtotalAfterLineDiscounts,
        totalCGST,
        totalSGST,
        totalItemLevelTax,
        orderDiscountType,
        orderDiscountAmount,
        orderTaxPercentage,
        finalTaxableAmount,
        orderLevelTaxAmount,
        totalTax,
        grandTotal,
        amountReceived,
        appliedPayment,
        donationAmount,
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
    const sourceLeadId = normalizeText(payload.sourceLeadId);
    const sourceLeadBusinessId = normalizeText(payload.sourceLeadBusinessId);
    const sourceLeadCustomerName = normalizeText(payload.sourceLeadCustomerName);
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

    if (!customerPhone) {
        throw new Error("Customer phone is required.");
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

        initialPayment = {
            paymentDate: saleDate,
            amountPaid: summary.appliedPayment,
            amountApplied: summary.appliedPayment,
            amountReceived: summary.amountReceived,
            donationAmount: summary.donationAmount,
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
            sourceLeadId,
            sourceLeadBusinessId,
            sourceLeadCustomerName: sourceLeadCustomerName || customerName,
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
                totalCGST: summary.totalCGST,
                totalSGST: summary.totalSGST,
                totalItemLevelTax: summary.totalItemLevelTax,
                orderDiscountType: summary.orderDiscountType,
                orderDiscountValue: summary.orderDiscountType === "Fixed"
                    ? normalizeNumber(payload.orderDiscountAmount)
                    : normalizeNumber(payload.orderDiscountPercentage),
                orderDiscountAmount: summary.orderDiscountAmount,
                finalTaxableAmount: summary.finalTaxableAmount,
                orderTaxPercentage: summary.orderTaxPercentage,
                orderLevelTaxAmount: summary.orderLevelTaxAmount,
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

function buildEditCatalogueItems(catalogueItems = [], lineItems = []) {
    const lookup = new Map();

    (catalogueItems || []).forEach(item => {
        const productId = normalizeText(item.productId);
        if (!productId) return;
        lookup.set(productId, item);
    });

    (lineItems || []).forEach(item => {
        const productId = normalizeText(item.productId);
        if (!productId || lookup.has(productId)) return;

        lookup.set(productId, {
            productId,
            productName: item.productName || "",
            categoryId: item.categoryId || "",
            categoryName: item.categoryName || "",
            sellingPrice: Number(item.unitPrice) || 0
        });
    });

    return [...lookup.values()];
}

function validateRetailSaleEditPayload(sale, payload, user, catalogueItems = []) {
    if (!user) {
        throw new Error("You must be logged in to update a retail sale.");
    }

    if (!sale?.id) {
        throw new Error("Select a retail sale before saving changes.");
    }

    const allowedScope = resolveRetailSaleEditScope(sale);
    if (allowedScope === "none") {
        throw new Error("Voided sales cannot be edited.");
    }

    const requestedScope = normalizeText(payload.editScope || allowedScope);
    const effectiveScope = requestedScope === "full" ? "full" : "limited";
    if (effectiveScope === "full" && allowedScope !== "full") {
        throw new Error("This sale has linked payments, expenses, or returns and only supports limited edits.");
    }

    const editReason = normalizeText(payload.editReason);
    if (!editReason) {
        throw new Error("Edit reason is required.");
    }

    const customerName = normalizeText(payload.customerName);
    const customerPhone = normalizeText(payload.customerPhone);
    const customerEmail = normalizeText(payload.customerEmail);
    const customerAddress = normalizeText(payload.customerAddress);
    const saleNotes = normalizeText(payload.saleNotes);

    if (!customerName) {
        throw new Error("Customer name is required.");
    }

    if (!customerPhone) {
        throw new Error("Customer phone is required.");
    }

    if (sale.store === "Tasty Treats" && !customerAddress) {
        throw new Error("Customer address is required for Tasty Treats orders.");
    }

    const baseUpdate = {
        editScope: effectiveScope,
        editReason,
        customerInfo: {
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            address: sale.store === "Tasty Treats" ? customerAddress : ""
        },
        saleNotes
    };

    if (effectiveScope !== "full") {
        return {
            updatePayload: baseUpdate,
            summary: {
                grandTotal: roundCurrency(sale.financials?.grandTotal),
                paymentStatus: sale.paymentStatus || "Unpaid",
                balanceDue: roundCurrency(sale.balanceDue)
            }
        };
    }

    const saleDate = parseRequiredDate(payload.saleDate, "Sale date");
    const manualVoucherNumber = normalizeText(payload.manualVoucherNumber);
    if (!manualVoucherNumber) {
        throw new Error("Manual voucher number is required.");
    }

    const draftSummary = calculateRetailDraftSummary(payload.lineItems, {
        orderDiscountType: payload.orderDiscountType,
        orderDiscountPercentage: payload.orderDiscountPercentage,
        orderDiscountAmount: payload.orderDiscountAmount,
        orderTaxPercentage: payload.orderTaxPercentage
    }, {
        amountReceived: 0
    });

    const normalizedLineItems = normalizeLineItems(
        draftSummary.lineItems,
        buildEditCatalogueItems(catalogueItems, payload.lineItems)
    );

    if (normalizedLineItems.length === 0) {
        throw new Error("Add at least one product with quantity greater than zero.");
    }

    const summary = calculateRetailDraftSummary(normalizedLineItems, {
        orderDiscountType: payload.orderDiscountType,
        orderDiscountPercentage: payload.orderDiscountPercentage,
        orderDiscountAmount: payload.orderDiscountAmount,
        orderTaxPercentage: payload.orderTaxPercentage
    }, {
        amountReceived: 0
    });

    if (sale.saleType === "Sample" && summary.grandTotal > 0) {
        throw new Error("Sample sales must net to zero after discounts.");
    }

    return {
        updatePayload: {
            ...baseUpdate,
            saleDate,
            manualVoucherNumber,
            lineItems: normalizedLineItems,
            financials: {
                itemsSubtotal: summary.itemsSubtotal,
                totalLineDiscount: summary.totalLineDiscount,
                subtotalAfterLineDiscounts: summary.subtotalAfterLineDiscounts,
                totalCGST: summary.totalCGST,
                totalSGST: summary.totalSGST,
                totalItemLevelTax: summary.totalItemLevelTax,
                orderDiscountType: summary.orderDiscountType,
                orderDiscountValue: summary.orderDiscountType === "Fixed"
                    ? normalizeNumber(payload.orderDiscountAmount)
                    : normalizeNumber(payload.orderDiscountPercentage),
                orderDiscountAmount: summary.orderDiscountAmount,
                finalTaxableAmount: summary.finalTaxableAmount,
                orderTaxPercentage: summary.orderTaxPercentage,
                orderLevelTaxAmount: summary.orderLevelTaxAmount,
                totalTax: summary.totalTax,
                grandTotal: summary.grandTotal
            }
        },
        summary
    };
}

export async function saveRetailSaleUpdate(sale, payload, user, catalogueItems = []) {
    const { updatePayload, summary } = validateRetailSaleEditPayload(sale, payload, user, catalogueItems);
    const result = await updateRetailSaleRecord(sale.id, updatePayload, user);

    return {
        updatePayload,
        summary: {
            ...(summary || {}),
            ...(result?.summary || {})
        }
    };
}

export function validateRetailSaleExpensePayload(sale, payload, user) {
    if (!user) {
        throw new Error("You must be logged in to add a retail expense.");
    }

    if (!sale?.id) {
        throw new Error("Select a retail sale before adding an expense.");
    }

    if (sale.saleStatus === "Voided") {
        throw new Error("Expenses cannot be added to a voided sale.");
    }

    const expenseDate = parseRequiredDate(payload.expenseDate, "Expense date");
    const justification = normalizeText(payload.justification);
    const amount = parsePositiveAmount(payload.amount, "Expense amount");

    if (!justification) {
        throw new Error("Expense justification is required.");
    }

    const currentBalanceDue = roundCurrency(Number(sale.balanceDue) || 0);
    if (currentBalanceDue <= 0) {
        throw new Error("This sale has no balance due left for expense adjustment.");
    }

    if (amount > currentBalanceDue) {
        throw new Error("Expense amount cannot exceed the current balance due.");
    }

    return {
        expenseDate,
        justification,
        amount
    };
}

export async function addRetailSaleExpense(sale, payload, user) {
    const normalizedExpense = validateRetailSaleExpensePayload(sale, payload, user);
    return addRetailSaleExpenseRecord(sale.id, normalizedExpense, user);
}

export function validateRetailSaleReturnPayload(sale, payload, user) {
    if (!user) {
        throw new Error("You must be logged in to process a retail return.");
    }

    if (!sale?.id) {
        throw new Error("Select a retail sale before processing a return.");
    }

    if (sale.saleStatus === "Voided") {
        throw new Error("Voided sales cannot accept returns.");
    }

    const returnDate = parseRequiredDate(payload.returnDate, "Return date");
    const reason = normalizeText(payload.reason);
    if (!reason) {
        throw new Error("Return reason is required.");
    }

    if (reason.length < 5) {
        throw new Error("Please enter a more descriptive return reason.");
    }

    const items = (payload.items || [])
        .map(item => ({
            productId: normalizeText(item.productId),
            productName: normalizeText(item.productName),
            quantity: Math.max(0, Math.floor(Number(item.quantity) || 0))
        }))
        .filter(item => item.productId && item.quantity > 0);

    if (!items.length) {
        throw new Error("Select at least one product quantity to return.");
    }

    return {
        returnDate,
        reason,
        items
    };
}

export async function addRetailSaleReturn(sale, payload, user) {
    const normalizedReturn = validateRetailSaleReturnPayload(sale, payload, user);
    return addRetailSaleReturnRecord(sale.id, normalizedReturn, user);
}

export function validateRetailSalePaymentPayload(payload, sale, masterData = {}) {
    if (!sale?.id) {
        throw new Error("Select a retail sale before recording payment.");
    }

    if (sale.saleStatus === "Voided") {
        throw new Error("Voided sales cannot accept payments.");
    }

    const paymentDate = parseRequiredDate(payload.paymentDate, "Payment date");
    const paymentMode = normalizeText(payload.paymentMode);
    const transactionRef = normalizeText(payload.transactionRef);
    const notes = normalizeText(payload.notes);
    const amountReceived = parsePositiveAmount(payload.amountPaid, "Payment amount");
    const balanceDue = roundCurrency(Number(sale.balanceDue) || 0);
    const activePaymentModes = (masterData.paymentModes || []).filter(mode => mode.isActive);

    if (balanceDue <= 0) {
        throw new Error("This sale has already been fully paid.");
    }

    if (!paymentMode) {
        throw new Error("Payment mode is required.");
    }

    if (activePaymentModes.length > 0 && !activePaymentModes.some(mode => normalizeText(mode.paymentMode) === paymentMode)) {
        throw new Error("The selected payment mode could not be found.");
    }

    if (!transactionRef) {
        throw new Error("Payment reference is required.");
    }

    const amountApplied = roundCurrency(Math.min(amountReceived, balanceDue));
    const donationAmount = roundCurrency(Math.max(amountReceived - amountApplied, 0));

    return {
        paymentDate,
        amountPaid: amountApplied,
        amountApplied,
        amountReceived,
        donationAmount,
        paymentMode,
        transactionRef,
        notes
    };
}

export async function saveRetailSalePayment(payload, sale, masterData, user) {
    if (!user) {
        throw new Error("You must be logged in to record a retail payment.");
    }

    const validatedPayment = validateRetailSalePaymentPayload(payload, sale, masterData);
    return recordRetailSalePayment(sale.id, validatedPayment, user);
}

export function validateRetailSaleVoidPayload(sale, payload = {}, user) {
    if (!user) {
        throw new Error("You must be logged in to void a retail sale.");
    }

    if (!sale?.id) {
        throw new Error("Select a retail sale before voiding.");
    }

    const saleStatus = normalizeText(sale.saleStatus || "Active").toLowerCase();
    if (saleStatus === "voided") {
        throw new Error("This retail sale has already been voided.");
    }

    const returnCount = Number(sale.returnCount) || 0;
    const returnStatus = normalizeText(sale.returnStatus || "Not Returned").toLowerCase();
    if (returnCount > 0 || returnStatus !== "not returned") {
        throw new Error("Sales with posted returns cannot be voided.");
    }

    const voidReason = normalizeText(payload.voidReason || payload.reason);
    if (!voidReason) {
        throw new Error("A void reason is required.");
    }

    if (voidReason.length < 8) {
        throw new Error("Please enter a more descriptive void reason.");
    }

    return {
        voidReason
    };
}

export async function voidRetailSale(sale, payload, user) {
    const validatedVoidPayload = validateRetailSaleVoidPayload(sale, payload, user);
    const result = await voidRetailSaleRecord(sale.id, validatedVoidPayload.voidReason, user);

    return {
        ...result,
        reason: validatedVoidPayload.voidReason
    };
}
