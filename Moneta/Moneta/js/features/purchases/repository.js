import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
}

function buildInvoiceId() {
    return `PI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

function buildSupplierPaymentId() {
    return `SPAY-SUP-${Date.now()}`;
}

function buildVoidReversalPaymentId(originalPaymentId = "") {
    return `VOID-${originalPaymentId || Date.now()}`;
}

function normalizeTimestampValue(value) {
    if (!value) return 0;

    if (typeof value.toMillis === "function") {
        return value.toMillis();
    }

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 0;

    return date.getTime();
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

export function subscribeToPurchaseInvoices(onNext, onError) {
    return getDb()
        .collection(COLLECTIONS.purchaseInvoices)
        .orderBy("purchaseDate", "desc")
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                onNext(rows);
            },
            onError
        );
}

export function subscribeToInvoicePayments(invoiceDocId, onNext, onError) {
    return getDb()
        .collection(COLLECTIONS.supplierPaymentsLedger)
        .where("relatedInvoiceId", "==", invoiceDocId)
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((left, right) => normalizeTimestampValue(right.paymentDate) - normalizeTimestampValue(left.paymentDate));

                onNext(rows);
            },
            onError
        );
}

export async function createPurchaseInvoiceRecord(invoiceData, user) {
    const db = getDb();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const invoiceRef = db.collection(COLLECTIONS.purchaseInvoices).doc();

    return db.runTransaction(async transaction => {
        transaction.set(invoiceRef, {
            ...invoiceData,
            invoiceId: buildInvoiceId(),
            amountPaid: 0,
            balanceDue: invoiceData.invoiceTotal,
            paymentStatus: "Unpaid",
            audit: {
                createdBy: user.email,
                createdOn: now,
                updatedBy: user.email,
                updatedOn: now
            }
        });

        invoiceData.lineItems.forEach(item => {
            const productRef = db.collection(COLLECTIONS.products).doc(item.masterProductId);
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(Number(item.quantity) || 0)
            });
        });
    });
}

export async function updatePurchaseInvoiceRecord(docId, invoiceData, user) {
    const db = getDb();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const invoiceRef = db.collection(COLLECTIONS.purchaseInvoices).doc(docId);

    return db.runTransaction(async transaction => {
        const existingInvoiceDoc = await transaction.get(invoiceRef);

        if (!existingInvoiceDoc.exists) {
            throw new Error("The purchase invoice could not be found.");
        }

        const existingInvoice = existingInvoiceDoc.data();
        const existingStatus = existingInvoice.invoiceStatus || existingInvoice.paymentStatus || "Unpaid";

        if (existingStatus === "Voided") {
            throw new Error("Voided purchase invoices cannot be edited.");
        }

        const inventoryDelta = new Map();

        (existingInvoice.lineItems || []).forEach(item => {
            const productId = item.masterProductId;
            const currentDelta = inventoryDelta.get(productId) || 0;
            inventoryDelta.set(productId, currentDelta - (Number(item.quantity) || 0));
        });

        (invoiceData.lineItems || []).forEach(item => {
            const productId = item.masterProductId;
            const currentDelta = inventoryDelta.get(productId) || 0;
            inventoryDelta.set(productId, currentDelta + (Number(item.quantity) || 0));
        });

        for (const [productId, delta] of inventoryDelta.entries()) {
            if (!productId || delta === 0) continue;

            const productRef = db.collection(COLLECTIONS.products).doc(productId);
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(delta)
            });
        }

        const amountPaid = Number(existingInvoice.amountPaid) || 0;
        const balanceDue = Number((invoiceData.invoiceTotal - amountPaid).toFixed(2));
        let paymentStatus = "Unpaid";

        if (balanceDue <= 0) {
            paymentStatus = "Paid";
        } else if (amountPaid > 0) {
            paymentStatus = "Partially Paid";
        }

        transaction.update(invoiceRef, {
            ...invoiceData,
            balanceDue,
            paymentStatus,
            "audit.updatedBy": user.email,
            "audit.updatedOn": now
        });
    });
}

export async function recordPurchaseInvoicePayment(invoiceDocId, paymentData, user) {
    const db = getDb();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const invoiceRef = db.collection(COLLECTIONS.purchaseInvoices).doc(invoiceDocId);
    const paymentRef = db.collection(COLLECTIONS.supplierPaymentsLedger).doc();

    return db.runTransaction(async transaction => {
        const invoiceDoc = await transaction.get(invoiceRef);

        if (!invoiceDoc.exists) {
            throw new Error("The purchase invoice could not be found.");
        }

        const invoice = invoiceDoc.data();
        const invoiceTotal = roundCurrency(invoice.invoiceTotal);
        const currentAmountPaid = roundCurrency(invoice.amountPaid);
        const currentBalanceDue = roundCurrency(invoice.balanceDue ?? invoiceTotal);
        const paymentAmount = roundCurrency(paymentData.amountPaid);

        if (currentBalanceDue <= 0) {
            throw new Error("This invoice has already been fully paid.");
        }

        if (paymentAmount <= 0) {
            throw new Error("Payment amount must be greater than zero.");
        }

        if (paymentAmount > currentBalanceDue) {
            throw new Error("Payment amount cannot exceed the outstanding balance.");
        }

        const amountPaid = roundCurrency(currentAmountPaid + paymentAmount);
        const balanceDue = roundCurrency(Math.max(invoiceTotal - amountPaid, 0));
        let paymentStatus = "Unpaid";

        if (balanceDue <= 0) {
            paymentStatus = "Paid";
        } else if (amountPaid > 0) {
            paymentStatus = "Partially Paid";
        }

        transaction.update(invoiceRef, {
            amountPaid,
            balanceDue,
            paymentStatus,
            "audit.updatedBy": user.email,
            "audit.updatedOn": now
        });

        transaction.set(paymentRef, {
            ...paymentData,
            relatedInvoiceId: invoiceDocId,
            relatedInvoiceNumber: invoice.invoiceId || paymentData.relatedInvoiceNumber || "",
            invoiceName: invoice.invoiceName || paymentData.invoiceName || "",
            supplierId: invoice.supplierId || paymentData.supplierId || "",
            supplierName: invoice.supplierName || paymentData.supplierName || "",
            paymentId: buildSupplierPaymentId(),
            paymentStatus: "Verified",
            status: "Verified",
            requiresVerification: false,
            recordedBy: user.email,
            recordedOn: now,
            verifiedBy: user.email,
            verifiedOn: now,
            audit: {
                createdBy: user.email,
                createdOn: now,
                context: "Supplier payment with immediate processing (Moneta)"
            }
        });
    });
}

export async function voidPurchaseInvoicePayment(paymentId, voidReason, user) {
    const db = getDb();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentRef = db.collection(COLLECTIONS.supplierPaymentsLedger).doc(paymentId);
    const reversalPaymentRef = db.collection(COLLECTIONS.supplierPaymentsLedger).doc();

    return db.runTransaction(async transaction => {
        const paymentDoc = await transaction.get(paymentRef);

        if (!paymentDoc.exists) {
            throw new Error("The selected payment could not be found.");
        }

        const originalPayment = paymentDoc.data();
        const currentStatus = originalPayment.paymentStatus || originalPayment.status || "Verified";
        const voidedAmount = roundCurrency(originalPayment.amountPaid);

        if (originalPayment.isReversalEntry) {
            throw new Error("Reversal entries cannot be voided.");
        }

        if (currentStatus === "Voided") {
            throw new Error("This payment has already been voided.");
        }

        if (voidedAmount <= 0) {
            throw new Error("Only posted supplier payments can be voided.");
        }

        const invoiceRef = db.collection(COLLECTIONS.purchaseInvoices).doc(originalPayment.relatedInvoiceId);
        const invoiceDoc = await transaction.get(invoiceRef);

        if (!invoiceDoc.exists) {
            throw new Error("The related purchase invoice could not be found.");
        }

        const invoice = invoiceDoc.data();
        const invoiceTotal = roundCurrency(invoice.invoiceTotal);
        const currentAmountPaid = roundCurrency(invoice.amountPaid);
        const amountPaid = roundCurrency(Math.max(currentAmountPaid - voidedAmount, 0));
        const balanceDue = roundCurrency(Math.max(invoiceTotal - amountPaid, 0));
        let paymentStatus = "Unpaid";

        if (balanceDue <= 0) {
            paymentStatus = "Paid";
        } else if (amountPaid > 0) {
            paymentStatus = "Partially Paid";
        }

        transaction.update(paymentRef, {
            paymentStatus: "Voided",
            status: "Voided",
            voidedBy: user.email,
            voidedOn: now,
            voidReason,
            originalStatus: currentStatus,
            "audit.updatedBy": user.email,
            "audit.updatedOn": now
        });

        transaction.set(reversalPaymentRef, {
            paymentId: buildVoidReversalPaymentId(originalPayment.paymentId || paymentId),
            relatedInvoiceId: originalPayment.relatedInvoiceId,
            relatedInvoiceNumber: invoice.invoiceId || originalPayment.relatedInvoiceNumber || "",
            invoiceName: invoice.invoiceName || originalPayment.invoiceName || "",
            supplierId: originalPayment.supplierId || invoice.supplierId || "",
            supplierName: originalPayment.supplierName || invoice.supplierName || "",
            amountPaid: -voidedAmount,
            paymentDate: now,
            paymentMode: "VOID_REVERSAL",
            transactionRef: `Reversal of ${originalPayment.transactionRef || originalPayment.paymentId || paymentId}`,
            notes: `Reversed payment ${originalPayment.paymentId || paymentId}. Reason: ${voidReason}`,
            paymentStatus: "Void Reversal",
            status: "Void Reversal",
            originalPaymentId: paymentId,
            isReversalEntry: true,
            recordedBy: user.email,
            recordedOn: now,
            voidedBy: user.email,
            voidReason,
            audit: {
                createdBy: user.email,
                createdOn: now,
                context: "Supplier payment void reversal"
            }
        });

        transaction.update(invoiceRef, {
            amountPaid,
            balanceDue,
            paymentStatus,
            lastPaymentVoided: {
                paymentId,
                reversalPaymentId: reversalPaymentRef.id,
                voidedAmount,
                voidReason,
                voidedBy: user.email,
                voidedOn: now
            },
            "audit.updatedBy": user.email,
            "audit.updatedOn": now
        });
    });
}

export async function voidPurchaseInvoiceRecord(invoiceDocId, voidReason, user) {
    const db = getDb();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const invoiceRef = db.collection(COLLECTIONS.purchaseInvoices).doc(invoiceDocId);
    const paymentSnapshot = await db
        .collection(COLLECTIONS.supplierPaymentsLedger)
        .where("relatedInvoiceId", "==", invoiceDocId)
        .get();
    const relatedPaymentRefs = paymentSnapshot.docs.map(doc => doc.ref);

    return db.runTransaction(async transaction => {
        const invoiceDoc = await transaction.get(invoiceRef);

        if (!invoiceDoc.exists) {
            throw new Error("The purchase invoice could not be found.");
        }

        const invoice = invoiceDoc.data();
        const currentStatus = invoice.invoiceStatus || invoice.paymentStatus || "Unpaid";

        if (currentStatus === "Voided" || invoice.paymentStatus === "Voided") {
            throw new Error("This purchase invoice has already been voided.");
        }

        const relatedPaymentDocs = await Promise.all(
            relatedPaymentRefs.map(paymentRef => transaction.get(paymentRef))
        );
        const activePayments = relatedPaymentDocs.filter(doc => {
            if (!doc.exists) return false;

            const data = doc.data();
            const status = data.paymentStatus || data.status || "Verified";
            return !data.isReversalEntry && status !== "Voided" && roundCurrency(data.amountPaid) > 0;
        });

        let voidedPaymentCount = 0;
        let voidedPaymentAmount = 0;

        activePayments.forEach(paymentDoc => {
            const originalPayment = paymentDoc.data();
            const paymentStatus = originalPayment.paymentStatus || originalPayment.status || "Verified";
            const voidedAmount = roundCurrency(originalPayment.amountPaid);
            const reversalPaymentRef = db.collection(COLLECTIONS.supplierPaymentsLedger).doc();

            transaction.update(paymentDoc.ref, {
                paymentStatus: "Voided",
                status: "Voided",
                voidedBy: user.email,
                voidedOn: now,
                voidReason,
                voidContext: "Invoice Void",
                originalStatus: paymentStatus,
                "audit.updatedBy": user.email,
                "audit.updatedOn": now
            });

            transaction.set(reversalPaymentRef, {
                paymentId: buildVoidReversalPaymentId(originalPayment.paymentId || paymentDoc.id),
                relatedInvoiceId: invoiceDocId,
                relatedInvoiceNumber: invoice.invoiceId || originalPayment.relatedInvoiceNumber || "",
                invoiceName: invoice.invoiceName || originalPayment.invoiceName || "",
                supplierId: invoice.supplierId || originalPayment.supplierId || "",
                supplierName: invoice.supplierName || originalPayment.supplierName || "",
                amountPaid: -voidedAmount,
                paymentDate: now,
                paymentMode: "VOID_REVERSAL",
                transactionRef: `Invoice void reversal of ${originalPayment.transactionRef || originalPayment.paymentId || paymentDoc.id}`,
                notes: `Reversed during invoice void ${invoice.invoiceId || invoiceDocId}. Reason: ${voidReason}`,
                paymentStatus: "Void Reversal",
                status: "Void Reversal",
                originalPaymentId: paymentDoc.id,
                isReversalEntry: true,
                recordedBy: user.email,
                recordedOn: now,
                voidedBy: user.email,
                voidReason,
                audit: {
                    createdBy: user.email,
                    createdOn: now,
                    context: "Supplier payment reversal during invoice void"
                }
            });

            voidedPaymentCount += 1;
            voidedPaymentAmount += voidedAmount;
        });

        const lineItems = invoice.lineItems || [];
        let reversedQuantity = 0;

        lineItems.forEach(item => {
            const quantity = Number(item.quantity) || 0;
            reversedQuantity += quantity;

            if (!item.masterProductId || quantity === 0) return;

            const productRef = db.collection(COLLECTIONS.products).doc(item.masterProductId);
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(-quantity)
            });
        });

        transaction.update(invoiceRef, {
            invoiceStatus: "Voided",
            paymentStatus: "Voided",
            amountPaid: 0,
            balanceDue: 0,
            voidReason,
            voidedBy: user.email,
            voidedOn: now,
            voidedPaymentCount,
            voidedPaymentAmount: roundCurrency(voidedPaymentAmount),
            inventoryReversalSummary: {
                reversedProductCount: lineItems.length,
                reversedQuantity
            },
            "audit.updatedBy": user.email,
            "audit.updatedOn": now
        });

        return {
            voidedPaymentCount,
            voidedPaymentAmount: roundCurrency(voidedPaymentAmount),
            reversedProductCount: lineItems.length,
            reversedQuantity
        };
    });
}
