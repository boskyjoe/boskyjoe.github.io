import { COLLECTIONS } from "../../config/collections.js";

const SALES_CATALOGUE_ITEMS_SUBCOLLECTION = "items";

function getDb() {
    return firebase.firestore();
}

function getNow() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

function buildSaleBusinessId(storeName = "") {
    const year = new Date().getFullYear();

    if (storeName === "Church Store") {
        return `CS-${year}-${Date.now().toString().slice(-6)}`;
    }

    if (storeName === "Tasty Treats") {
        return `TT-${year}-${Date.now().toString().slice(-6)}`;
    }

    return `SALE-${year}-${Date.now().toString().slice(-6)}`;
}

function buildSalesPaymentId() {
    return `SPAY-${Date.now()}`;
}

function sortByDateDesc(rows = []) {
    return [...rows].sort((left, right) => {
        const leftDate = left.saleDate?.toDate ? left.saleDate.toDate() : new Date(left.saleDate || 0);
        const rightDate = right.saleDate?.toDate ? right.saleDate.toDate() : new Date(right.saleDate || 0);

        return rightDate.getTime() - leftDate.getTime();
    });
}

export function subscribeToRetailSales(user, onData, onError) {
    if (!user) {
        onData([]);
        return () => {};
    }

    let query = getDb().collection(COLLECTIONS.salesInvoices);

    if (!["admin", "finance"].includes(user.role)) {
        query = query.where("createdBy", "==", user.email);
    }

    return query.onSnapshot(
        snapshot => {
            const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onData(sortByDateDesc(rows));
        },
        error => onError?.(error)
    );
}

export function subscribeToRetailCatalogueItems(catalogueId, onData, onError) {
    if (!catalogueId) {
        onData([]);
        return () => {};
    }

    return getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection(SALES_CATALOGUE_ITEMS_SUBCOLLECTION)
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((left, right) => (left.productName || "").localeCompare(right.productName || ""));

                onData(rows);
            },
            error => onError?.(error)
        );
}

export async function getRetailSalePayments(invoiceId) {
    if (!invoiceId) return [];

    const snapshot = await getDb()
        .collection(COLLECTIONS.salesPaymentsLedger)
        .where("invoiceId", "==", invoiceId)
        .get();

    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((left, right) => {
            const leftDate = left.paymentDate?.toDate ? left.paymentDate.toDate() : new Date(left.paymentDate || 0);
            const rightDate = right.paymentDate?.toDate ? right.paymentDate.toDate() : new Date(right.paymentDate || 0);
            return rightDate.getTime() - leftDate.getTime();
        });
}

export async function createRetailSaleRecord(payload, user) {
    const db = getDb();
    const now = getNow();
    const saleRef = db.collection(COLLECTIONS.salesInvoices).doc();
    const productRefs = payload.lineItems.map(item => db.collection(COLLECTIONS.products).doc(item.productId));

    return db.runTransaction(async transaction => {
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        payload.lineItems.forEach((item, index) => {
            const productDoc = productDocs[index];

            if (!productDoc.exists) {
                throw new Error(`The product "${item.productName}" is no longer available.`);
            }

            const currentStock = Number(productDoc.data().inventoryCount) || 0;
            if (currentStock < item.quantity) {
                throw new Error(`"${item.productName}" only has ${currentStock} units available.`);
            }
        });

        const totalAmountPaid = Number(payload.initialPayment?.amountPaid) || 0;
        const balanceDue = Number((payload.financials.grandTotal - totalAmountPaid).toFixed(2));
        const paymentStatus = balanceDue <= 0
            ? "Paid"
            : totalAmountPaid > 0
                ? "Partially Paid"
                : "Unpaid";

        transaction.set(saleRef, {
            saleId: buildSaleBusinessId(payload.store),
            saleStatus: "Active",
            saleDate: payload.saleDate,
            store: payload.store,
            saleType: payload.saleType,
            salesCatalogueId: payload.salesCatalogueId,
            salesCatalogueName: payload.salesCatalogueName,
            salesSeasonId: payload.salesSeasonId,
            salesSeasonName: payload.salesSeasonName,
            manualVoucherNumber: payload.manualVoucherNumber,
            customerInfo: payload.customerInfo,
            saleNotes: payload.saleNotes || "",
            lineItems: payload.lineItems,
            financials: {
                itemsSubtotal: payload.financials.itemsSubtotal,
                totalLineDiscount: payload.financials.totalLineDiscount,
                subtotalAfterLineDiscounts: payload.financials.subtotalAfterLineDiscounts,
                totalCGST: payload.financials.totalCGST,
                totalSGST: payload.financials.totalSGST,
                totalItemLevelTax: payload.financials.totalItemLevelTax,
                orderDiscountType: payload.financials.orderDiscountType,
                orderDiscountValue: payload.financials.orderDiscountValue,
                orderDiscountAmount: payload.financials.orderDiscountAmount,
                finalTaxableAmount: payload.financials.finalTaxableAmount,
                orderTaxPercentage: payload.financials.orderTaxPercentage,
                orderLevelTaxAmount: payload.financials.orderLevelTaxAmount,
                totalTax: payload.financials.totalTax,
                grandTotal: payload.financials.grandTotal,
                amountTendered: totalAmountPaid,
                paymentCount: payload.initialPayment ? 1 : 0
            },
            lineItemCount: payload.lineItems.length,
            totalQuantity: payload.lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
            totalAmountPaid,
            balanceDue,
            paymentStatus,
            createdBy: user.email,
            createdOn: now,
            updatedBy: user.email,
            updatedOn: now
        });

        if (payload.initialPayment) {
            const paymentRef = db.collection(COLLECTIONS.salesPaymentsLedger).doc();

            transaction.set(paymentRef, {
                paymentId: buildSalesPaymentId(),
                invoiceId: saleRef.id,
                relatedSaleId: saleRef.id,
                relatedSaleNumber: payload.manualVoucherNumber,
                paymentDate: payload.initialPayment.paymentDate,
                amountPaid: totalAmountPaid,
                totalCollected: totalAmountPaid,
                paymentMode: payload.initialPayment.paymentMode,
                transactionRef: payload.initialPayment.transactionRef,
                notes: payload.initialPayment.notes || "",
                status: "Verified",
                customerName: payload.customerInfo.name,
                store: payload.store,
                recordedBy: user.email,
                createdBy: user.email,
                createdOn: now
            });
        }

        productRefs.forEach((productRef, index) => {
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(-Number(payload.lineItems[index].quantity || 0)),
                updatedBy: user.email,
                updateDate: now
            });
        });

        return saleRef;
    });
}
