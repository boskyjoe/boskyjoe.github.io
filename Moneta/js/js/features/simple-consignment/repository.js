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

function buildDonationBusinessId() {
    return `DON-${Date.now()}`;
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
            totalDonation: 0,
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

export async function saveSimpleConsignmentSettlementRecord(orderId, items, contextPayload, user) {
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

        const removedExistingItems = existingItems.filter(item => !nextMap.has(item.productId));
        if (removedExistingItems.length > 0) {
            throw new Error("Removing checked-out products during settlement is not allowed.");
        }

        const totals = computeConsignmentTotals(nextItems, {
            totalAmountPaid: orderData.totalAmountPaid,
            totalExpenses: orderData.totalExpenses
        });

        const inventoryDeltas = [];
        const touchedProductIds = new Set([...existingMap.keys(), ...nextMap.keys()]);

        touchedProductIds.forEach(productId => {
            const existingItem = existingMap.get(productId) || {
                productId,
                productName: "",
                quantityCheckedOut: 0,
                quantityReturned: 0
            };
            const nextItem = nextMap.get(productId) || {
                productId,
                productName: "",
                quantityCheckedOut: 0,
                quantityReturned: 0
            };

            const previousCheckedOut = Math.max(0, Math.floor(Number(existingItem.quantityCheckedOut) || 0));
            const nextCheckedOut = Math.max(0, Math.floor(Number(nextItem.quantityCheckedOut) || 0));
            const previousReturned = Math.max(0, Math.floor(Number(existingItem.quantityReturned) || 0));
            const nextReturned = Math.max(0, Math.floor(Number(nextItem.quantityReturned) || 0));

            const checkoutDelta = nextCheckedOut - previousCheckedOut;
            if (checkoutDelta < 0) {
                throw new Error("Reducing checked-out quantity during settlement is not allowed.");
            }

            const returnedDelta = nextReturned - previousReturned;
            const netInventoryDelta = returnedDelta - checkoutDelta;
            if (netInventoryDelta !== 0) {
                inventoryDeltas.push({
                    productId,
                    productName: nextItem.productName || existingItem.productName || productId,
                    delta: netInventoryDelta
                });
            }
        });

        const productRefs = inventoryDeltas.map(entry => db.collection(COLLECTIONS.products).doc(entry.productId));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        productDocs.forEach((productDoc, index) => {
            const delta = inventoryDeltas[index].delta;
            if (!productDoc.exists) {
                throw new Error(`"${inventoryDeltas[index].productName}" is no longer available in inventory.`);
            }

            const currentStock = Math.floor(Number(productDoc.data().inventoryCount) || 0);
            if (currentStock + delta < 0) {
                throw new Error(`"${inventoryDeltas[index].productName}" only has ${currentStock} in stock for additional checkout.`);
            }
        });

        transaction.update(orderRef, {
            manualVoucherNumber: normalizeText(contextPayload?.manualVoucherNumber) || normalizeText(orderData.manualVoucherNumber),
            teamName: normalizeText(contextPayload?.teamName) || normalizeText(orderData.teamName),
            teamMemberName: normalizeText(contextPayload?.teamMemberName) || normalizeText(orderData.teamMemberName),
            memberPhone: normalizeText(contextPayload?.memberPhone) || normalizeText(orderData.memberPhone),
            memberEmail: normalizeText(contextPayload?.memberEmail),
            venue: normalizeText(contextPayload?.venue) || normalizeText(orderData.venue),
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
                inventoryCount: firebase.firestore.FieldValue.increment(inventoryDeltas[index].delta),
                updatedBy: user.email,
                updateDate: now
            });
        });

        return {
            summary: {
                totalQuantityCheckedOut: totals.totalQuantityCheckedOut,
                totalValueCheckedOut: totals.totalValueCheckedOut,
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

        const amountReceived = roundCurrency(transactionPayload.amountReceived ?? transactionPayload.amountApplied);
        const currentBalanceDue = roundCurrency(orderData.balanceDue);
        if (amountReceived <= 0) {
            throw new Error("Transaction amount must be greater than zero.");
        }

        const paymentType = transactionPayload.paymentType;
        const amountApplied = paymentType === "Expense"
            ? amountReceived
            : roundCurrency(Math.min(amountReceived, currentBalanceDue));
        const donationAmount = paymentType === "Payment"
            ? roundCurrency(Math.max(amountReceived - amountApplied, 0))
            : 0;
        const donationRef = donationAmount > 0
            ? db.collection(COLLECTIONS.donations).doc()
            : null;
        const nextTotalAmountPaid = paymentType === "Payment"
            ? roundCurrency(orderData.totalAmountPaid + amountApplied)
            : roundCurrency(orderData.totalAmountPaid);
        const nextTotalDonation = paymentType === "Payment"
            ? roundCurrency((Number(orderData.totalDonation) || 0) + donationAmount)
            : roundCurrency(orderData.totalDonation);
        const nextTotalExpenses = paymentType === "Expense"
            ? roundCurrency(orderData.totalExpenses + amountApplied)
            : roundCurrency(orderData.totalExpenses);
        const nextBalanceDue = roundCurrency(Math.max(currentBalanceDue - amountApplied, 0));
        const nextPaymentCount = paymentType === "Payment"
            ? (Math.max(0, Number(orderData.paymentCount) || 0) + 1)
            : Math.max(0, Number(orderData.paymentCount) || 0);

        if (paymentType === "Expense" && amountApplied > currentBalanceDue) {
            throw new Error(`Amount cannot exceed the balance due of ${currentBalanceDue.toFixed(2)}.`);
        }

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
            amountReceived,
            donationAmount,
            donationEntryId: donationRef?.id || "",
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
                amountApplied,
                amountReceived,
                donationAmount,
                donationEntryId: donationRef?.id || "",
                totalCollected: amountReceived,
                paymentMode: transactionPayload.paymentMode,
                transactionRef: transactionPayload.reference,
                notes: transactionPayload.notes || "",
                status: "Verified",
                recordedBy: user.email,
                createdBy: user.email,
                createdOn: now
            });
        }

        if (donationRef) {
            transaction.set(donationRef, {
                donationId: buildDonationBusinessId(),
                donationDate: transactionPayload.transactionDate,
                amount: donationAmount,
                status: "Active",
                moduleType: "Simple Consignment",
                sourceCollection: `${COLLECTIONS.simpleConsignments}/${orderId}/${CONSIGNMENT_PAYMENTS_SUBCOLLECTION}`,
                sourcePaymentDocId: transactionRef.id,
                sourceOrderId: orderId,
                sourceOrderNumber: orderData.consignmentId || "",
                teamName: orderData.teamName || "",
                paymentMode: transactionPayload.paymentMode || "",
                paymentReference: transactionPayload.reference || "",
                notes: transactionPayload.notes || "Auto-captured overpayment donation.",
                createdBy: user.email,
                createdOn: now,
                updatedBy: user.email,
                updatedOn: now
            });
        }

        transaction.update(orderRef, {
            totalAmountPaid: nextTotalAmountPaid,
            totalDonation: nextTotalDonation,
            totalExpenses: nextTotalExpenses,
            balanceDue: nextBalanceDue,
            paymentCount: nextPaymentCount,
            updatedBy: user.email,
            updatedOn: now
        });

        return {
            summary: {
                paymentType,
                amountReceived,
                amountApplied,
                donationAmount,
                nextTotalAmountPaid,
                nextTotalDonation,
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
        const amountReceived = roundCurrency(txn.amountReceived ?? txn.totalCollected ?? amountApplied);
        const donationAmount = roundCurrency(txn.donationAmount);
        if (amountApplied <= 0 && amountReceived <= 0 && donationAmount <= 0) {
            throw new Error("Only posted transactions can be voided.");
        }

        const paymentType = normalizeText(txn.paymentType) === "Expense" ? "Expense" : "Payment";
        const nextTotalAmountPaid = paymentType === "Payment"
            ? roundCurrency(Math.max(0, Number(orderData.totalAmountPaid) - amountApplied))
            : roundCurrency(orderData.totalAmountPaid);
        const nextTotalExpenses = paymentType === "Expense"
            ? roundCurrency(Math.max(0, Number(orderData.totalExpenses) - amountApplied))
            : roundCurrency(orderData.totalExpenses);
        const nextTotalDonation = paymentType === "Payment"
            ? roundCurrency(Math.max(0, Number(orderData.totalDonation) - donationAmount))
            : roundCurrency(orderData.totalDonation);
        const nextBalanceDue = roundCurrency(Number(orderData.balanceDue) + amountApplied);
        const nextPaymentCount = paymentType === "Payment"
            ? Math.max(0, (Number(orderData.paymentCount) || 0) - 1)
            : Math.max(0, Number(orderData.paymentCount) || 0);
        const donationEntryRef = donationAmount > 0
            ? (txn.donationEntryId
                ? db.collection(COLLECTIONS.donations).doc(txn.donationEntryId)
                : db.collection(COLLECTIONS.donations).doc())
            : null;
        const donationReversalRef = donationAmount > 0
            ? db.collection(COLLECTIONS.donations).doc()
            : null;

        tx.set(reversalRef, {
            ...txn,
            transactionId: buildSimpleConsignmentTransactionId(),
            amountApplied: -amountApplied,
            amountReceived: -amountReceived,
            donationAmount: -donationAmount,
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
            totalDonation: nextTotalDonation,
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
                amountApplied: -amountApplied,
                amountReceived: -amountReceived,
                donationAmount: -donationAmount,
                donationEntryId: donationReversalRef?.id || "",
                totalCollected: -amountReceived,
                paymentMode: txn.paymentMode || "",
                transactionRef: `REV-${txn.reference || transactionId}`,
                notes: `Reversal for ${txn.reference || transactionId}: ${voidReason}`,
                status: "Reversal",
                recordedBy: user.email,
                createdBy: user.email,
                createdOn: now
            });
        }

        if (donationEntryRef && donationReversalRef) {
            tx.set(donationEntryRef, {
                donationId: txn.donationId || buildDonationBusinessId(),
                donationDate: txn.transactionDate || now,
                amount: donationAmount,
                status: "Voided",
                moduleType: "Simple Consignment",
                sourceCollection: `${COLLECTIONS.simpleConsignments}/${orderId}/${CONSIGNMENT_PAYMENTS_SUBCOLLECTION}`,
                sourcePaymentDocId: transactionId,
                sourceOrderId: orderId,
                sourceOrderNumber: orderData.consignmentId || "",
                teamName: orderData.teamName || "",
                paymentMode: txn.paymentMode || "",
                paymentReference: txn.reference || "",
                notes: txn.notes || "",
                voidReason,
                voidedBy: user.email,
                voidedOn: now,
                updatedBy: user.email,
                updatedOn: now
            }, { merge: true });

            tx.set(donationReversalRef, {
                donationId: buildDonationBusinessId(),
                donationDate: now,
                amount: -donationAmount,
                status: "Void Reversal",
                moduleType: "Simple Consignment",
                sourceCollection: `${COLLECTIONS.simpleConsignments}/${orderId}/${CONSIGNMENT_PAYMENTS_SUBCOLLECTION}`,
                sourcePaymentDocId: reversalRef.id,
                sourceOrderId: orderId,
                sourceOrderNumber: orderData.consignmentId || "",
                originalDonationEntryId: donationEntryRef.id,
                originalPaymentDocId: transactionId,
                isReversalEntry: true,
                notes: `Donation reversal for consignment transaction ${txn.reference || transactionId}. Reason: ${voidReason}`,
                createdBy: user.email,
                createdOn: now,
                updatedBy: user.email,
                updatedOn: now
            });
        }

        return {
            summary: {
                paymentType,
                amountReceived,
                amountApplied,
                donationAmount,
                nextTotalAmountPaid,
                nextTotalDonation,
                nextTotalExpenses,
                nextBalanceDue
            }
        };
    });
}

export async function cancelSimpleConsignmentOrder(orderId, cancelReason, user) {
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
            throw new Error("Only active consignment orders can be cancelled.");
        }

        const existingItems = Array.isArray(orderData.items) ? orderData.items.map(sanitizeLineItem) : [];
        if (existingItems.length === 0) {
            throw new Error("No checked-out line items were found for this order.");
        }

        const hasLineActivity = existingItems.some(item => (
            item.quantitySold > 0
            || item.quantityReturned > 0
            || item.quantityDamaged > 0
            || item.quantityGifted > 0
        ));
        if (hasLineActivity) {
            throw new Error("This order already has product activity and cannot be cancelled.");
        }

        const totalAmountPaid = roundCurrency(orderData.totalAmountPaid);
        const totalDonation = roundCurrency(orderData.totalDonation);
        const totalExpenses = roundCurrency(orderData.totalExpenses);
        const paymentCount = Math.max(0, Number(orderData.paymentCount) || 0);
        if (totalAmountPaid > 0 || totalDonation > 0 || totalExpenses > 0 || paymentCount > 0) {
            throw new Error("This order has linked financial activity and cannot be cancelled.");
        }

        const linkedTransactionSnapshot = await orderRef
            .collection(CONSIGNMENT_PAYMENTS_SUBCOLLECTION)
            .limit(1)
            .get();
        const hasLinkedTransactions = !linkedTransactionSnapshot.empty;
        if (hasLinkedTransactions) {
            throw new Error("This order has linked payment or expense entries and cannot be cancelled.");
        }

        const inventoryRestores = existingItems
            .map(item => ({
                ...item,
                quantityRestore: Math.max(0, item.quantityCheckedOut)
            }))
            .filter(item => item.quantityRestore > 0);

        const productRefs = inventoryRestores.map(item => db.collection(COLLECTIONS.products).doc(item.productId));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        productDocs.forEach((productDoc, index) => {
            if (!productDoc.exists) {
                throw new Error(`"${inventoryRestores[index].productName}" is no longer available in inventory.`);
            }
        });

        const cancelledItems = existingItems.map(item => ({
            ...item,
            quantitySold: 0,
            quantityReturned: item.quantityCheckedOut,
            quantityDamaged: 0,
            quantityGifted: 0
        }));
        const totals = computeConsignmentTotals(cancelledItems, {
            totalAmountPaid: 0,
            totalExpenses: 0
        });

        transaction.update(orderRef, {
            status: "Cancelled",
            cancelReason: normalizeText(cancelReason),
            cancelledBy: user.email,
            cancelledOn: now,
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
            totalDonation: 0,
            totalExpenses: 0,
            balanceDue: 0,
            paymentCount: 0,
            updatedBy: user.email,
            updatedOn: now
        });

        productRefs.forEach((productRef, index) => {
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(inventoryRestores[index].quantityRestore),
                updatedBy: user.email,
                updateDate: now
            });
        });

        return {
            summary: {
                totalQuantityRestored: totals.totalQuantityCheckedOut,
                totalValueCheckedOut: totals.totalValueCheckedOut
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
