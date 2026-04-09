import { COLLECTIONS } from "../../config/collections.js";

const CONSIGNMENT_PAYMENTS_SUBCOLLECTION = "payments";
const SALES_CATALOGUE_ITEMS_SUBCOLLECTION = "items";

function getDb() {
    return firebase.firestore();
}

function getNow() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

function normalizeText(value) {
    return (value || "").trim();
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function toDateValue(value) {
    if (!value) return new Date(0);
    if (typeof value.toDate === "function") return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function buildSimpleConsignmentId() {
    return `SC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

function buildSimpleConsignmentTransactionId() {
    return `SCTX-${Date.now()}`;
}

function buildConsignmentLedgerPaymentId() {
    return `CPAY-${Date.now()}`;
}

function sanitizeLineItem(item = {}) {
    const quantityCheckedOut = Math.max(0, Math.floor(Number(item.quantityCheckedOut) || 0));
    const quantitySold = Math.max(0, Math.floor(Number(item.quantitySold) || 0));
    const quantityReturned = Math.max(0, Math.floor(Number(item.quantityReturned) || 0));
    const quantityDamaged = Math.max(0, Math.floor(Number(item.quantityDamaged) || 0));
    const quantityGifted = Math.max(0, Math.floor(Number(item.quantityGifted) || 0));
    const accountedQuantity = quantitySold + quantityReturned + quantityDamaged + quantityGifted;

    if (accountedQuantity > quantityCheckedOut) {
        throw new Error(`"${item.productName || item.productId || "Line Item"}" exceeds quantity checked out.`);
    }

    return {
        productId: normalizeText(item.productId),
        productName: normalizeText(item.productName),
        categoryId: normalizeText(item.categoryId),
        categoryName: normalizeText(item.categoryName) || "-",
        sellingPrice: roundCurrency(item.sellingPrice),
        quantityCheckedOut,
        quantitySold,
        quantityReturned,
        quantityDamaged,
        quantityGifted
    };
}

function computeConsignmentTotals(items = [], currentTotals = {}) {
    const normalizedItems = (items || []).map(sanitizeLineItem);

    const totalQuantityCheckedOut = normalizedItems.reduce((sum, item) => sum + item.quantityCheckedOut, 0);
    const totalQuantitySold = normalizedItems.reduce((sum, item) => sum + item.quantitySold, 0);
    const totalQuantityReturned = normalizedItems.reduce((sum, item) => sum + item.quantityReturned, 0);
    const totalQuantityDamaged = normalizedItems.reduce((sum, item) => sum + item.quantityDamaged, 0);
    const totalQuantityGifted = normalizedItems.reduce((sum, item) => sum + item.quantityGifted, 0);
    const totalOnHandQuantity = normalizedItems.reduce((sum, item) => {
        return sum + (item.quantityCheckedOut - (item.quantitySold + item.quantityReturned + item.quantityDamaged + item.quantityGifted));
    }, 0);

    const totalValueCheckedOut = roundCurrency(normalizedItems.reduce((sum, item) => {
        return sum + (item.quantityCheckedOut * item.sellingPrice);
    }, 0));

    const totalValueSold = roundCurrency(normalizedItems.reduce((sum, item) => {
        return sum + (item.quantitySold * item.sellingPrice);
    }, 0));

    const totalAmountPaid = roundCurrency(currentTotals.totalAmountPaid);
    const totalExpenses = roundCurrency(currentTotals.totalExpenses);
    const rawBalance = roundCurrency(totalValueSold - totalAmountPaid - totalExpenses);

    if (rawBalance < 0) {
        throw new Error("Sold value cannot be less than applied payments and expenses.");
    }

    return {
        items: normalizedItems,
        lineItemCount: normalizedItems.length,
        totalQuantityCheckedOut,
        totalQuantitySold,
        totalQuantityReturned,
        totalQuantityDamaged,
        totalQuantityGifted,
        totalOnHandQuantity,
        totalValueCheckedOut,
        totalValueSold,
        totalAmountPaid,
        totalExpenses,
        balanceDue: roundCurrency(rawBalance)
    };
}

function sortByDateDesc(rows = [], dateField = "checkoutDate") {
    return [...rows].sort((left, right) => toDateValue(right[dateField]).getTime() - toDateValue(left[dateField]).getTime());
}

export function subscribeToSimpleConsignmentOrders(onData, onError) {
    return getDb()
        .collection(COLLECTIONS.simpleConsignments)
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                onData(sortByDateDesc(rows, "checkoutDate"));
            },
            error => onError?.(error)
        );
}

export function subscribeToSimpleConsignmentTransactions(orderId, onData, onError) {
    if (!orderId) {
        onData([]);
        return () => {};
    }

    return getDb()
        .collection(COLLECTIONS.simpleConsignments)
        .doc(orderId)
        .collection(CONSIGNMENT_PAYMENTS_SUBCOLLECTION)
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                onData(sortByDateDesc(rows, "logDate"));
            },
            error => onError?.(error)
        );
}

export async function fetchSimpleConsignmentCatalogueItems(catalogueId) {
    if (!catalogueId) return [];

    const snapshot = await getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection(SALES_CATALOGUE_ITEMS_SUBCOLLECTION)
        .get();

    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((left, right) => (left.productName || "").localeCompare(right.productName || ""));
}

export async function getSimpleConsignmentOrderById(orderId) {
    if (!orderId) return null;

    const doc = await getDb()
        .collection(COLLECTIONS.simpleConsignments)
        .doc(orderId)
        .get();

    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
}

export async function createSimpleConsignmentRecord(orderPayload, user) {
    const db = getDb();
    const now = getNow();
    const orderRef = db.collection(COLLECTIONS.simpleConsignments).doc();
    const cleanItems = (orderPayload.items || []).map(sanitizeLineItem).filter(item => item.quantityCheckedOut > 0);
    const totals = computeConsignmentTotals(cleanItems, { totalAmountPaid: 0, totalExpenses: 0 });
    const productRefs = cleanItems.map(item => db.collection(COLLECTIONS.products).doc(item.productId));

    return db.runTransaction(async transaction => {
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        productDocs.forEach((productDoc, index) => {
            const item = cleanItems[index];
            if (!productDoc.exists) {
                throw new Error(`"${item.productName || item.productId}" is no longer available.`);
            }

            const inventoryCount = Math.max(0, Math.floor(Number(productDoc.data().inventoryCount) || 0));
            if (inventoryCount < item.quantityCheckedOut) {
                throw new Error(`"${item.productName}" only has ${inventoryCount} in stock.`);
            }
        });

        transaction.set(orderRef, {
            consignmentId: buildSimpleConsignmentId(),
            status: "Active",
            checkoutDate: orderPayload.checkoutDate,
            manualVoucherNumber: orderPayload.manualVoucherNumber,
            teamName: orderPayload.teamName,
            teamMemberName: orderPayload.teamMemberName,
            memberPhone: orderPayload.memberPhone,
            memberEmail: orderPayload.memberEmail || "",
            venue: orderPayload.venue,
            salesCatalogueId: orderPayload.salesCatalogueId,
            salesCatalogueName: orderPayload.salesCatalogueName,
            items: totals.items,
            lineItemCount: totals.lineItemCount,
            totalQuantityCheckedOut: totals.totalQuantityCheckedOut,
            totalQuantitySold: totals.totalQuantitySold,
            totalQuantityReturned: totals.totalQuantityReturned,
            totalQuantityDamaged: totals.totalQuantityDamaged,
            totalQuantityGifted: totals.totalQuantityGifted,
            totalOnHandQuantity: totals.totalOnHandQuantity,
            totalValueCheckedOut: totals.totalValueCheckedOut,
            totalValueSold: totals.totalValueSold,
            totalAmountPaid: 0,
            totalExpenses: 0,
            balanceDue: 0,
            paymentCount: 0,
            createdBy: user.email,
            createdOn: now,
            updatedBy: user.email,
            updatedOn: now
        });

        productRefs.forEach((productRef, index) => {
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(-cleanItems[index].quantityCheckedOut),
                updatedBy: user.email,
                updateDate: now
            });
        });

        return orderRef;
    });
}

export async function saveSimpleConsignmentSettlementRecord(orderId, items, user) {
    const db = getDb();
    const now = getNow();
    const orderRef = db.collection(COLLECTIONS.simpleConsignments).doc(orderId);

    return db.runTransaction(async transaction => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new Error("The selected consignment order could not be found.");
        }

        const orderData = orderDoc.data() || {};
        if (normalizeText(orderData.status).toLowerCase() !== "active") {
            throw new Error("Only active consignment orders can be updated.");
        }

        const existingItems = Array.isArray(orderData.items) ? orderData.items.map(sanitizeLineItem) : [];
        const existingMap = new Map(existingItems.map(item => [item.productId, item]));
        const nextItems = (items || []).map(sanitizeLineItem).filter(item => item.quantityCheckedOut > 0);
        const nextMap = new Map(nextItems.map(item => [item.productId, item]));

        if (nextItems.length === 0) {
            throw new Error("At least one checked-out product must remain on the consignment order.");
        }

        if (nextItems.some(item => !existingMap.has(item.productId))) {
            throw new Error("Adding new products during settlement is not enabled yet.");
        }

        const totals = computeConsignmentTotals(nextItems, {
            totalAmountPaid: orderData.totalAmountPaid,
            totalExpenses: orderData.totalExpenses
        });

        const returnDeltas = [];
        existingItems.forEach(existingItem => {
            const nextItem = nextMap.get(existingItem.productId);
            if (!nextItem) return;

            const delta = nextItem.quantityReturned - existingItem.quantityReturned;
            if (delta !== 0) {
                returnDeltas.push({
                    productId: existingItem.productId,
                    productName: existingItem.productName,
                    delta
                });
            }
        });

        const productRefs = returnDeltas.map(entry => db.collection(COLLECTIONS.products).doc(entry.productId));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        productDocs.forEach((productDoc, index) => {
            const delta = returnDeltas[index].delta;
            if (!productDoc.exists) {
                throw new Error(`"${returnDeltas[index].productName}" is no longer available in inventory.`);
            }

            const currentStock = Math.floor(Number(productDoc.data().inventoryCount) || 0);
            if (currentStock + delta < 0) {
                throw new Error(`Cannot reduce returned stock for "${returnDeltas[index].productName}" below zero.`);
            }
        });

        transaction.update(orderRef, {
            items: totals.items,
            lineItemCount: totals.lineItemCount,
            totalQuantityCheckedOut: totals.totalQuantityCheckedOut,
            totalQuantitySold: totals.totalQuantitySold,
            totalQuantityReturned: totals.totalQuantityReturned,
            totalQuantityDamaged: totals.totalQuantityDamaged,
            totalQuantityGifted: totals.totalQuantityGifted,
            totalOnHandQuantity: totals.totalOnHandQuantity,
            totalValueCheckedOut: totals.totalValueCheckedOut,
            totalValueSold: totals.totalValueSold,
            balanceDue: totals.balanceDue,
            updatedBy: user.email,
            updatedOn: now
        });

        productRefs.forEach((productRef, index) => {
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(returnDeltas[index].delta),
                updatedBy: user.email,
                updateDate: now
            });
        });

        return {
            summary: {
                totalValueSold: totals.totalValueSold,
                totalQuantitySold: totals.totalQuantitySold,
                totalQuantityReturned: totals.totalQuantityReturned,
                totalOnHandQuantity: totals.totalOnHandQuantity,
                balanceDue: totals.balanceDue
            }
        };
    });
}

export async function recordSimpleConsignmentTransaction(orderId, transactionPayload, user) {
    const db = getDb();
    const now = getNow();
    const orderRef = db.collection(COLLECTIONS.simpleConsignments).doc(orderId);
    const transactionRef = orderRef.collection(CONSIGNMENT_PAYMENTS_SUBCOLLECTION).doc();
    const consignmentLedgerRef = db.collection(COLLECTIONS.consignmentPaymentsLedger).doc();

    return db.runTransaction(async transaction => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new Error("The selected consignment order could not be found.");
        }

        const orderData = orderDoc.data() || {};
        if (normalizeText(orderData.status).toLowerCase() !== "active") {
            throw new Error("Only active consignment orders can accept transactions.");
        }

        const amountApplied = roundCurrency(transactionPayload.amountApplied);
        const currentBalanceDue = roundCurrency(orderData.balanceDue);
        if (amountApplied <= 0) {
            throw new Error("Transaction amount must be greater than zero.");
        }

        if (amountApplied > currentBalanceDue) {
            throw new Error(`Amount cannot exceed the balance due of ${currentBalanceDue.toFixed(2)}.`);
        }

        const paymentType = transactionPayload.paymentType;
        const nextTotalAmountPaid = paymentType === "Payment"
            ? roundCurrency(orderData.totalAmountPaid + amountApplied)
            : roundCurrency(orderData.totalAmountPaid);
        const nextTotalExpenses = paymentType === "Expense"
            ? roundCurrency(orderData.totalExpenses + amountApplied)
            : roundCurrency(orderData.totalExpenses);
        const nextBalanceDue = roundCurrency(Math.max(currentBalanceDue - amountApplied, 0));
        const nextPaymentCount = paymentType === "Payment"
            ? (Math.max(0, Number(orderData.paymentCount) || 0) + 1)
            : Math.max(0, Number(orderData.paymentCount) || 0);

        let ledgerEntryId = "";
        if (paymentType === "Payment") {
            ledgerEntryId = consignmentLedgerRef.id;
        }

        transaction.set(transactionRef, {
            transactionId: buildSimpleConsignmentTransactionId(),
            orderId,
            consignmentId: orderData.consignmentId || "",
            paymentType,
            transactionDate: transactionPayload.transactionDate,
            amountApplied,
            paymentMode: transactionPayload.paymentMode,
            reference: transactionPayload.reference,
            contact: transactionPayload.contact || "",
            notes: transactionPayload.notes || "",
            status: "Verified",
            isReversalEntry: false,
            ledgerEntryId,
            logDate: now,
            createdBy: user.email,
            createdOn: now
        });

        if (paymentType === "Payment") {
            transaction.set(consignmentLedgerRef, {
                paymentId: buildConsignmentLedgerPaymentId(),
                relatedOrderId: orderId,
                relatedConsignmentId: orderData.consignmentId || "",
                teamName: orderData.teamName || "",
                teamMemberName: orderData.teamMemberName || "",
                paymentDate: transactionPayload.transactionDate,
                amountPaid: amountApplied,
                totalCollected: amountApplied,
                paymentMode: transactionPayload.paymentMode,
                transactionRef: transactionPayload.reference,
                notes: transactionPayload.notes || "",
                status: "Verified",
                recordedBy: user.email,
                createdBy: user.email,
                createdOn: now
            });
        }

        transaction.update(orderRef, {
            totalAmountPaid: nextTotalAmountPaid,
            totalExpenses: nextTotalExpenses,
            balanceDue: nextBalanceDue,
            paymentCount: nextPaymentCount,
            updatedBy: user.email,
            updatedOn: now
        });

        return {
            summary: {
                paymentType,
                amountApplied,
                nextTotalAmountPaid,
                nextTotalExpenses,
                nextBalanceDue
            }
        };
    });
}

export async function voidSimpleConsignmentTransaction(orderId, transactionId, voidReason, user) {
    const db = getDb();
    const now = getNow();
    const orderRef = db.collection(COLLECTIONS.simpleConsignments).doc(orderId);
    const transactionRef = orderRef.collection(CONSIGNMENT_PAYMENTS_SUBCOLLECTION).doc(transactionId);
    const reversalRef = orderRef.collection(CONSIGNMENT_PAYMENTS_SUBCOLLECTION).doc();

    return db.runTransaction(async tx => {
        const [orderDoc, transactionDoc] = await Promise.all([
            tx.get(orderRef),
            tx.get(transactionRef)
        ]);

        if (!orderDoc.exists) {
            throw new Error("The selected consignment order could not be found.");
        }

        if (!transactionDoc.exists) {
            throw new Error("The selected transaction could not be found.");
        }

        const orderData = orderDoc.data() || {};
        if (normalizeText(orderData.status).toLowerCase() !== "active") {
            throw new Error("Transactions on settled consignment orders cannot be voided.");
        }

        const txn = transactionDoc.data() || {};
        if (txn.isReversalEntry || normalizeText(txn.status).toLowerCase() === "reversal") {
            throw new Error("Reversal entries cannot be voided.");
        }

        if (normalizeText(txn.status).toLowerCase() === "voided") {
            throw new Error("This transaction has already been voided.");
        }

        const amountApplied = roundCurrency(txn.amountApplied);
        if (amountApplied <= 0) {
            throw new Error("Only posted transactions can be voided.");
        }

        const paymentType = normalizeText(txn.paymentType) === "Expense" ? "Expense" : "Payment";
        const nextTotalAmountPaid = paymentType === "Payment"
            ? roundCurrency(Math.max(0, Number(orderData.totalAmountPaid) - amountApplied))
            : roundCurrency(orderData.totalAmountPaid);
        const nextTotalExpenses = paymentType === "Expense"
            ? roundCurrency(Math.max(0, Number(orderData.totalExpenses) - amountApplied))
            : roundCurrency(orderData.totalExpenses);
        const nextBalanceDue = roundCurrency(Number(orderData.balanceDue) + amountApplied);
        const nextPaymentCount = paymentType === "Payment"
            ? Math.max(0, (Number(orderData.paymentCount) || 0) - 1)
            : Math.max(0, Number(orderData.paymentCount) || 0);

        tx.set(reversalRef, {
            ...txn,
            transactionId: buildSimpleConsignmentTransactionId(),
            amountApplied: -amountApplied,
            status: "Reversal",
            isReversalEntry: true,
            reversedTransactionId: transactionId,
            notes: txn.notes
                ? `${txn.notes} | Reversal: ${voidReason}`
                : `Reversal: ${voidReason}`,
            logDate: now,
            createdBy: user.email,
            createdOn: now
        });

        tx.update(transactionRef, {
            status: "Voided",
            voidReason,
            voidedBy: user.email,
            voidedOn: now
        });

        tx.update(orderRef, {
            totalAmountPaid: nextTotalAmountPaid,
            totalExpenses: nextTotalExpenses,
            balanceDue: nextBalanceDue,
            paymentCount: nextPaymentCount,
            updatedBy: user.email,
            updatedOn: now
        });

        if (txn.ledgerEntryId && paymentType === "Payment") {
            const ledgerEntryRef = db.collection(COLLECTIONS.consignmentPaymentsLedger).doc(txn.ledgerEntryId);
            const ledgerReversalRef = db.collection(COLLECTIONS.consignmentPaymentsLedger).doc();

            tx.set(ledgerEntryRef, {
                status: "Voided",
                voidReason,
                voidedBy: user.email,
                voidedOn: now
            }, { merge: true });

            tx.set(ledgerReversalRef, {
                paymentId: buildConsignmentLedgerPaymentId(),
                relatedOrderId: orderId,
                relatedConsignmentId: orderData.consignmentId || "",
                teamName: orderData.teamName || "",
                teamMemberName: orderData.teamMemberName || "",
                paymentDate: txn.transactionDate || now,
                amountPaid: -amountApplied,
                totalCollected: -amountApplied,
                paymentMode: txn.paymentMode || "",
                transactionRef: `REV-${txn.reference || transactionId}`,
                notes: `Reversal for ${txn.reference || transactionId}: ${voidReason}`,
                status: "Reversal",
                recordedBy: user.email,
                createdBy: user.email,
                createdOn: now
            });
        }

        return {
            summary: {
                paymentType,
                amountApplied,
                nextTotalAmountPaid,
                nextTotalExpenses,
                nextBalanceDue
            }
        };
    });
}

export async function closeSimpleConsignmentOrder(orderId, user) {
    const db = getDb();
    const now = getNow();
    const orderRef = db.collection(COLLECTIONS.simpleConsignments).doc(orderId);

    return db.runTransaction(async transaction => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
            throw new Error("The selected consignment order could not be found.");
        }

        const orderData = orderDoc.data() || {};
        if (normalizeText(orderData.status).toLowerCase() === "settled") {
            throw new Error("This consignment order is already settled.");
        }

        const items = Array.isArray(orderData.items) ? orderData.items : [];
        const onHandQuantity = items.reduce((sum, item) => {
            const quantityCheckedOut = Math.max(0, Math.floor(Number(item.quantityCheckedOut) || 0));
            const quantitySold = Math.max(0, Math.floor(Number(item.quantitySold) || 0));
            const quantityReturned = Math.max(0, Math.floor(Number(item.quantityReturned) || 0));
            const quantityDamaged = Math.max(0, Math.floor(Number(item.quantityDamaged) || 0));
            const quantityGifted = Math.max(0, Math.floor(Number(item.quantityGifted) || 0));
            return sum + (quantityCheckedOut - (quantitySold + quantityReturned + quantityDamaged + quantityGifted));
        }, 0);

        const balanceDue = roundCurrency(orderData.balanceDue);

        if (onHandQuantity !== 0) {
            throw new Error("All checked-out items must be fully accounted for before closing.");
        }

        if (balanceDue > 0) {
            throw new Error("Balance due must be zero before closing this order.");
        }

        transaction.update(orderRef, {
            status: "Settled",
            settledDate: now,
            updatedBy: user.email,
            updatedOn: now
        });

        return {
            summary: {
                onHandQuantity,
                balanceDue
            }
        };
    });
}
