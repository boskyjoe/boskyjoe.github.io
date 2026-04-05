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
