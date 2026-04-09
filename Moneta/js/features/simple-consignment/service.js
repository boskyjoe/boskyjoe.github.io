import {
    cancelSimpleConsignmentOrder,
    closeSimpleConsignmentOrder,
    createSimpleConsignmentRecord,
    recordSimpleConsignmentTransaction,
    saveSimpleConsignmentSettlementRecord,
    voidSimpleConsignmentTransaction
} from "./repository.js";

export const CONSIGNMENT_TRANSACTION_TYPES = ["Payment", "Expense"];
export const CONSIGNMENT_STATUSES = ["Active", "Settled", "Cancelled"];

function normalizeText(value) {
    return (value || "").trim();
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

function parseRequiredAmount(value, label) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error(`${label} must be greater than zero.`);
    }

    return roundCurrency(amount);
}

function parseRequiredText(value, label) {
    const normalized = normalizeText(value);
    if (!normalized) {
        throw new Error(`${label} is required.`);
    }

    return normalized;
}

function normalizeCheckoutItems(rows = []) {
    const duplicateLookup = new Set();
    const items = [];

    (rows || []).forEach(row => {
        const productId = normalizeText(row.productId);
        if (!productId) return;

        if (duplicateLookup.has(productId)) {
            throw new Error(`"${row.productName || productId}" appears more than once.`);
        }
        duplicateLookup.add(productId);

        const quantityCheckedOut = Math.max(0, Math.floor(Number(row.quantityCheckedOut) || 0));
        if (quantityCheckedOut <= 0) return;

        const inventoryCount = Math.max(0, Math.floor(Number(row.inventoryCount) || 0));
        if (quantityCheckedOut > inventoryCount) {
            throw new Error(`"${row.productName || productId}" only has ${inventoryCount} in stock.`);
        }

        items.push({
            productId,
            productName: normalizeText(row.productName) || "Untitled Product",
            categoryId: normalizeText(row.categoryId),
            categoryName: normalizeText(row.categoryName) || "-",
            sellingPrice: roundCurrency(row.sellingPrice),
            quantityCheckedOut,
            quantitySold: 0,
            quantityReturned: 0,
            quantityDamaged: 0,
            quantityGifted: 0
        });
    });

    if (items.length === 0) {
        throw new Error("Add at least one product with checkout quantity greater than zero.");
    }

    return items;
}

function normalizeSettlementItems(rows = []) {
    const normalized = (rows || []).map(row => {
        const productId = normalizeText(row.productId);
        if (!productId) {
            throw new Error("One of the worksheet rows is missing product information.");
        }

        const quantityCheckedOut = Math.max(0, Math.floor(Number(row.quantityCheckedOut) || 0));
        const quantitySold = Math.max(0, Math.floor(Number(row.quantitySold) || 0));
        const quantityReturned = Math.max(0, Math.floor(Number(row.quantityReturned) || 0));
        const quantityDamaged = Math.max(0, Math.floor(Number(row.quantityDamaged) || 0));
        const quantityGifted = Math.max(0, Math.floor(Number(row.quantityGifted) || 0));
        const accountedQuantity = quantitySold + quantityReturned + quantityDamaged + quantityGifted;

        if (accountedQuantity > quantityCheckedOut) {
            throw new Error(`"${row.productName || productId}" exceeds checked-out quantity.`);
        }

        return {
            productId,
            productName: normalizeText(row.productName) || "Untitled Product",
            categoryId: normalizeText(row.categoryId),
            categoryName: normalizeText(row.categoryName) || "-",
            sellingPrice: roundCurrency(row.sellingPrice),
            quantityCheckedOut,
            quantitySold,
            quantityReturned,
            quantityDamaged,
            quantityGifted
        };
    }).filter(item => item.quantityCheckedOut > 0);

    if (normalized.length === 0) {
        throw new Error("At least one checked-out product is required.");
    }

    return normalized;
}

function normalizeSettlementContextPayload(payload = {}, order = {}) {
    return {
        manualVoucherNumber: parseRequiredText(payload.manualVoucherNumber ?? order.manualVoucherNumber, "Manual voucher number"),
        teamName: parseRequiredText(payload.teamName ?? order.teamName, "Team name"),
        teamMemberName: parseRequiredText(payload.teamMemberName ?? order.teamMemberName, "Team member name"),
        memberPhone: parseRequiredText(payload.memberPhone ?? order.memberPhone, "Team member phone"),
        memberEmail: normalizeText(payload.memberEmail ?? order.memberEmail),
        venue: parseRequiredText(payload.venue ?? order.venue, "Venue")
    };
}

function resolveCatalogue(catalogueId, salesCatalogues = []) {
    return (salesCatalogues || []).find(catalogue => catalogue.id === catalogueId) || null;
}

export function validateSimpleConsignmentCheckoutPayload(payload, user, salesCatalogues = []) {
    if (!user) {
        throw new Error("You must be logged in to create a consignment checkout.");
    }

    const checkoutDate = parseRequiredDate(payload.checkoutDate, "Checkout date");
    const manualVoucherNumber = normalizeText(payload.manualVoucherNumber);
    const teamName = normalizeText(payload.teamName);
    const teamMemberName = normalizeText(payload.teamMemberName);
    const memberPhone = normalizeText(payload.memberPhone);
    const memberEmail = normalizeText(payload.memberEmail);
    const venue = normalizeText(payload.venue);
    const salesCatalogueId = normalizeText(payload.salesCatalogueId);
    const items = normalizeCheckoutItems(payload.items || []);

    if (!manualVoucherNumber) {
        throw new Error("Manual voucher number is required.");
    }

    if (!teamName) {
        throw new Error("Team name is required.");
    }

    if (!teamMemberName) {
        throw new Error("Team member name is required.");
    }

    if (!memberPhone) {
        throw new Error("Team member phone is required.");
    }

    if (!venue) {
        throw new Error("Venue is required.");
    }

    if (!salesCatalogueId) {
        throw new Error("Sales catalogue is required.");
    }

    const catalogue = resolveCatalogue(salesCatalogueId, salesCatalogues);
    if (!catalogue) {
        throw new Error("The selected sales catalogue could not be found.");
    }

    if (!catalogue.isActive) {
        throw new Error("Only active sales catalogues can be used for consignment checkout.");
    }

    return {
        checkoutDate,
        manualVoucherNumber,
        teamName,
        teamMemberName,
        memberPhone,
        memberEmail,
        venue,
        salesCatalogueId,
        salesCatalogueName: catalogue.catalogueName || "-",
        items
    };
}

export async function saveSimpleConsignmentCheckout(payload, user, salesCatalogues = []) {
    const normalizedPayload = validateSimpleConsignmentCheckoutPayload(payload, user, salesCatalogues);
    const orderRef = await createSimpleConsignmentRecord(normalizedPayload, user);

    return {
        orderRef,
        payload: normalizedPayload
    };
}

export function validateSimpleConsignmentSettlementPayload(order, rows, contextPayload, user) {
    if (!user) {
        throw new Error("You must be logged in to save settlement progress.");
    }

    if (!order?.id) {
        throw new Error("Select an active consignment order before saving progress.");
    }

    if (normalizeText(order.status) !== "Active") {
        throw new Error("Only active consignment orders can be updated.");
    }

    return {
        items: normalizeSettlementItems(rows || []),
        context: normalizeSettlementContextPayload(contextPayload, order)
    };
}

export async function saveSimpleConsignmentSettlement(order, rows, contextPayload, user) {
    const validated = validateSimpleConsignmentSettlementPayload(order, rows, contextPayload, user);
    const result = await saveSimpleConsignmentSettlementRecord(order.id, validated.items, validated.context, user);

    return {
        ...result,
        items: validated.items,
        context: validated.context
    };
}

export function validateSimpleConsignmentTransactionPayload(order, payload, paymentModes = [], user) {
    if (!user) {
        throw new Error("You must be logged in to record transactions.");
    }

    if (!order?.id) {
        throw new Error("Select an active consignment order before recording transactions.");
    }

    if (normalizeText(order.status) !== "Active") {
        throw new Error("Transactions can only be recorded on active consignment orders.");
    }

    const paymentType = CONSIGNMENT_TRANSACTION_TYPES.includes(normalizeText(payload.paymentType))
        ? normalizeText(payload.paymentType)
        : "";
    const transactionDate = parseRequiredDate(payload.transactionDate, "Transaction date");
    const amountApplied = parseRequiredAmount(payload.amountApplied, "Transaction amount");
    const paymentMode = normalizeText(payload.paymentMode);
    const reference = normalizeText(payload.reference);
    const contact = normalizeText(payload.contact);
    const notes = normalizeText(payload.notes);
    const balanceDue = roundCurrency(order.balanceDue);

    if (!paymentType) {
        throw new Error("Select a transaction type.");
    }

    if (!paymentMode) {
        throw new Error("Payment mode is required.");
    }

    const activePaymentModes = (paymentModes || []).filter(mode => mode.isActive).map(mode => normalizeText(mode.paymentMode));
    if (activePaymentModes.length > 0 && !activePaymentModes.includes(paymentMode)) {
        throw new Error("The selected payment mode could not be found.");
    }

    if (!reference) {
        throw new Error("Reference number is required.");
    }

    if (balanceDue <= 0) {
        throw new Error("This order already has zero balance due.");
    }

    if (amountApplied > balanceDue) {
        throw new Error(`Amount cannot exceed the current balance due of ${balanceDue.toFixed(2)}.`);
    }

    return {
        paymentType,
        transactionDate,
        amountApplied,
        paymentMode,
        reference,
        contact,
        notes
    };
}

export async function addSimpleConsignmentTransaction(order, payload, paymentModes, user) {
    const validated = validateSimpleConsignmentTransactionPayload(order, payload, paymentModes, user);
    const result = await recordSimpleConsignmentTransaction(order.id, validated, user);

    return {
        ...result,
        transaction: validated
    };
}

export function validateSimpleConsignmentTransactionVoidPayload(order, transaction, payload, user) {
    if (!user) {
        throw new Error("You must be logged in to void transactions.");
    }

    if (!order?.id) {
        throw new Error("Select an active consignment order first.");
    }

    if (normalizeText(order.status) !== "Active") {
        throw new Error("Transactions can only be voided while the order is active.");
    }

    if (!transaction?.id) {
        throw new Error("The selected transaction could not be found.");
    }

    const voidReason = normalizeText(payload?.voidReason) || "Voided from Moneta Consignment workspace.";
    if (voidReason.length < 6) {
        throw new Error("Please provide a more descriptive void reason.");
    }

    return { voidReason };
}

export async function voidSimpleConsignmentTransactionEntry(order, transaction, payload, user) {
    const validated = validateSimpleConsignmentTransactionVoidPayload(order, transaction, payload, user);
    const result = await voidSimpleConsignmentTransaction(order.id, transaction.id, validated.voidReason, user);

    return {
        ...result,
        voidReason: validated.voidReason
    };
}

export function validateSimpleConsignmentCancelPayload(order, transactions = [], payload, user) {
    if (!user) {
        throw new Error("You must be logged in to cancel this consignment order.");
    }

    if (!order?.id) {
        throw new Error("Select an active consignment order before cancelling.");
    }

    if (normalizeText(order.status) !== "Active") {
        throw new Error("Only active consignment orders can be cancelled.");
    }

    const totalQuantitySold = Math.max(0, Number(order.totalQuantitySold) || 0);
    const totalQuantityReturned = Math.max(0, Number(order.totalQuantityReturned) || 0);
    const totalQuantityDamaged = Math.max(0, Number(order.totalQuantityDamaged) || 0);
    const totalQuantityGifted = Math.max(0, Number(order.totalQuantityGifted) || 0);
    if (totalQuantitySold > 0 || totalQuantityReturned > 0 || totalQuantityDamaged > 0 || totalQuantityGifted > 0) {
        throw new Error("This order already has product activity. Only untouched active orders can be cancelled.");
    }

    const totalAmountPaid = roundCurrency(order.totalAmountPaid);
    const totalExpenses = roundCurrency(order.totalExpenses);
    const paymentCount = Math.max(0, Number(order.paymentCount) || 0);
    if (totalAmountPaid > 0 || totalExpenses > 0 || paymentCount > 0 || (transactions || []).length > 0) {
        throw new Error("This order has linked financial activity and cannot be cancelled.");
    }

    const cancelReason = normalizeText(payload?.cancelReason);
    if (cancelReason.length < 6) {
        throw new Error("Please provide a clear cancellation reason.");
    }

    return { cancelReason };
}

export async function cancelSimpleConsignmentOrderEntry(order, transactions, payload, user) {
    const validated = validateSimpleConsignmentCancelPayload(order, transactions, payload, user);
    const result = await cancelSimpleConsignmentOrder(order.id, validated.cancelReason, user);

    return {
        ...result,
        cancelReason: validated.cancelReason
    };
}

export async function finalizeSimpleConsignmentOrder(order, user) {
    if (!user) {
        throw new Error("You must be logged in to close this consignment order.");
    }

    if (!order?.id) {
        throw new Error("Select an active consignment order before closing.");
    }

    if (normalizeText(order.status) !== "Active") {
        throw new Error("Only active consignment orders can be closed.");
    }

    return closeSimpleConsignmentOrder(order.id, user);
}
