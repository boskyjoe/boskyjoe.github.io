import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
}

function buildInvoiceId() {
    return `PI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
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
