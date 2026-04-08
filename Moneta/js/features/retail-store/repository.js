import { COLLECTIONS } from "../../config/collections.js";

const SALES_CATALOGUE_ITEMS_SUBCOLLECTION = "items";
const RETAIL_SALE_EXPENSES_SUBCOLLECTION = "expenses";
const RETAIL_SALE_RETURNS_SUBCOLLECTION = "returns";

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

function buildSalesExpenseId() {
    return `RSEXP-${Date.now()}`;
}

function buildSalesReturnId() {
    return `RSRET-${Date.now()}`;
}

function normalizeText(value) {
    return (value || "").trim();
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function clampPercentage(value) {
    return Math.min(Math.max(Number(value) || 0, 0), 100);
}

function calculateLineItemFromQuantity(item = {}, quantity = 0) {
    const normalizedQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    const unitPrice = roundCurrency(item.unitPrice);
    const lineDiscountPercentage = clampPercentage(item.lineDiscountPercentage);
    const cgstPercentage = Math.max(0, Number(item.cgstPercentage) || 0);
    const sgstPercentage = Math.max(0, Number(item.sgstPercentage) || 0);
    const lineSubtotal = roundCurrency(normalizedQuantity * unitPrice);
    const lineDiscountAmount = roundCurrency(lineSubtotal * (lineDiscountPercentage / 100));
    const taxableAmount = roundCurrency(Math.max(lineSubtotal - lineDiscountAmount, 0));
    const cgstAmount = roundCurrency(taxableAmount * (cgstPercentage / 100));
    const sgstAmount = roundCurrency(taxableAmount * (sgstPercentage / 100));
    const taxAmount = roundCurrency(cgstAmount + sgstAmount);
    const lineTotal = roundCurrency(taxableAmount + taxAmount);

    return {
        productId: item.productId || "",
        productName: item.productName || "",
        categoryId: item.categoryId || "",
        categoryName: item.categoryName || "-",
        quantity: normalizedQuantity,
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
}

function calculateRetailFinancialsFromLineItems(lineItems = [], previousFinancials = {}) {
    const itemsSubtotal = roundCurrency(lineItems.reduce((sum, item) => sum + (Number(item.lineSubtotal) || 0), 0));
    const totalLineDiscount = roundCurrency(lineItems.reduce((sum, item) => sum + (Number(item.lineDiscountAmount) || 0), 0));
    const subtotalAfterLineDiscounts = roundCurrency(Math.max(itemsSubtotal - totalLineDiscount, 0));
    const totalCGST = roundCurrency(lineItems.reduce((sum, item) => sum + (Number(item.cgstAmount) || 0), 0));
    const totalSGST = roundCurrency(lineItems.reduce((sum, item) => sum + (Number(item.sgstAmount) || 0), 0));
    const totalItemLevelTax = roundCurrency(totalCGST + totalSGST);
    const orderDiscountType = normalizeText(previousFinancials.orderDiscountType) === "Fixed" ? "Fixed" : "Percentage";
    const orderDiscountValue = roundCurrency(previousFinancials.orderDiscountValue);
    const orderDiscountAmount = orderDiscountType === "Fixed"
        ? roundCurrency(Math.min(Math.max(orderDiscountValue, 0), subtotalAfterLineDiscounts))
        : roundCurrency(subtotalAfterLineDiscounts * (clampPercentage(orderDiscountValue) / 100));
    const finalTaxableAmount = roundCurrency(Math.max(subtotalAfterLineDiscounts - orderDiscountAmount, 0));
    const orderTaxPercentage = Math.max(0, Number(previousFinancials.orderTaxPercentage) || 0);
    const orderLevelTaxAmount = roundCurrency(finalTaxableAmount * (orderTaxPercentage / 100));
    const totalTax = roundCurrency(totalItemLevelTax + orderLevelTaxAmount);
    const grandTotal = roundCurrency(finalTaxableAmount + totalTax);

    return {
        itemsSubtotal,
        totalLineDiscount,
        subtotalAfterLineDiscounts,
        totalCGST,
        totalSGST,
        totalItemLevelTax,
        orderDiscountType,
        orderDiscountValue,
        orderDiscountAmount,
        finalTaxableAmount,
        orderTaxPercentage,
        orderLevelTaxAmount,
        totalTax,
        grandTotal
    };
}

function resolveRetailSaleEditScope(sale = {}) {
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

function buildLineItemQuantityMap(lineItems = []) {
    const map = new Map();

    (lineItems || []).forEach(item => {
        const productId = normalizeText(item.productId);
        if (!productId) return;

        map.set(productId, (map.get(productId) || 0) + (Number(item.quantity) || 0));
    });

    return map;
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

export function subscribeToRetailSaleExpenses(saleId, onData, onError) {
    if (!saleId) {
        onData([]);
        return () => {};
    }

    return getDb()
        .collection(COLLECTIONS.salesInvoices)
        .doc(saleId)
        .collection(RETAIL_SALE_EXPENSES_SUBCOLLECTION)
        .orderBy("expenseDate", "desc")
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                onData(rows);
            },
            error => onError?.(error)
        );
}

export function subscribeToRetailSalePayments(saleId, onData, onError) {
    if (!saleId) {
        onData([]);
        return () => {};
    }

    return getDb()
        .collection(COLLECTIONS.salesPaymentsLedger)
        .where("invoiceId", "==", saleId)
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((left, right) => {
                        const leftDate = left.paymentDate?.toDate ? left.paymentDate.toDate() : new Date(left.paymentDate || 0);
                        const rightDate = right.paymentDate?.toDate ? right.paymentDate.toDate() : new Date(right.paymentDate || 0);
                        return rightDate.getTime() - leftDate.getTime();
                    });

                onData(rows);
            },
            error => onError?.(error)
        );
}

export function subscribeToRetailSaleReturns(saleId, onData, onError) {
    if (!saleId) {
        onData([]);
        return () => {};
    }

    return getDb()
        .collection(COLLECTIONS.salesInvoices)
        .doc(saleId)
        .collection(RETAIL_SALE_RETURNS_SUBCOLLECTION)
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((left, right) => {
                        const leftDate = left.returnDate?.toDate ? left.returnDate.toDate() : new Date(left.returnDate || 0);
                        const rightDate = right.returnDate?.toDate ? right.returnDate.toDate() : new Date(right.returnDate || 0);
                        return rightDate.getTime() - leftDate.getTime();
                    });

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

export async function getRetailSaleReturns(saleId) {
    if (!saleId) return [];

    const snapshot = await getDb()
        .collection(COLLECTIONS.salesInvoices)
        .doc(saleId)
        .collection(RETAIL_SALE_RETURNS_SUBCOLLECTION)
        .get();

    return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((left, right) => {
            const leftDate = left.returnDate?.toDate ? left.returnDate.toDate() : new Date(left.returnDate || 0);
            const rightDate = right.returnDate?.toDate ? right.returnDate.toDate() : new Date(right.returnDate || 0);
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
            returnStatus: "Not Returned",
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
                totalExpenses: 0,
                amountTendered: totalAmountPaid,
                paymentCount: payload.initialPayment ? 1 : 0
            },
            lineItemCount: payload.lineItems.length,
            totalQuantity: payload.lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
            totalAmountPaid,
            balanceDue,
            creditBalance: 0,
            returnCount: 0,
            totalReturnedQuantity: 0,
            totalReturnedAmount: 0,
            paymentStatus,
            latestPaymentMode: payload.initialPayment?.paymentMode || "",
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

export async function addRetailSaleReturnRecord(saleId, returnPayload, user) {
    if (!saleId) {
        throw new Error("Select a retail sale before recording a return.");
    }

    const db = getDb();
    const now = getNow();
    const saleRef = db.collection(COLLECTIONS.salesInvoices).doc(saleId);
    const returnRef = saleRef.collection(RETAIL_SALE_RETURNS_SUBCOLLECTION).doc();

    return db.runTransaction(async transaction => {
        const saleDoc = await transaction.get(saleRef);

        if (!saleDoc.exists) {
            throw new Error("This sale could not be found.");
        }

        const sale = saleDoc.data() || {};
        if (normalizeText(sale.saleStatus) === "Voided") {
            throw new Error("Voided sales cannot accept returns.");
        }

        const requestedQuantityMap = new Map();
        (returnPayload.items || []).forEach(item => {
            const productId = normalizeText(item.productId);
            const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
            if (!productId || quantity <= 0) return;
            requestedQuantityMap.set(productId, (requestedQuantityMap.get(productId) || 0) + quantity);
        });

        if (requestedQuantityMap.size === 0) {
            throw new Error("Select at least one product quantity to return.");
        }

        const currentLineItems = Array.isArray(sale.lineItems) ? sale.lineItems : [];
        const currentItemMap = new Map(
            currentLineItems.map(item => [normalizeText(item.productId), item]).filter(([productId]) => Boolean(productId))
        );

        const requestedProductIds = [...requestedQuantityMap.keys()];
        requestedProductIds.forEach(productId => {
            const saleItem = currentItemMap.get(productId);
            if (!saleItem) {
                throw new Error("One or more selected return products are no longer available on this sale.");
            }

            const availableQuantity = Math.max(0, Math.floor(Number(saleItem.quantity) || 0));
            const requestedQuantity = requestedQuantityMap.get(productId) || 0;
            if (requestedQuantity > availableQuantity) {
                throw new Error(`Return quantity for "${saleItem.productName || productId}" exceeds the remaining sold quantity.`);
            }
        });

        const productRefs = requestedProductIds.map(productId => db.collection(COLLECTIONS.products).doc(productId));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
        productDocs.forEach(doc => {
            if (!doc.exists) {
                throw new Error("One or more returned products are no longer available in inventory.");
            }
        });

        const remainingLineItems = [];
        const returnedLineItems = [];

        currentLineItems.forEach(item => {
            const productId = normalizeText(item.productId);
            const soldQuantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
            if (!productId || soldQuantity <= 0) return;

            const returnQuantity = requestedQuantityMap.get(productId) || 0;
            if (returnQuantity > 0) {
                const returnedLine = calculateLineItemFromQuantity(item, returnQuantity);
                returnedLineItems.push({
                    ...returnedLine,
                    quantityBeforeReturn: soldQuantity,
                    quantityAfterReturn: Math.max(soldQuantity - returnQuantity, 0)
                });
            }

            const remainingQuantity = soldQuantity - returnQuantity;
            if (remainingQuantity > 0) {
                remainingLineItems.push(calculateLineItemFromQuantity(item, remainingQuantity));
            }
        });

        if (returnedLineItems.length === 0) {
            throw new Error("No valid return quantities were found.");
        }

        const returnedQuantity = returnedLineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const returnedAmount = roundCurrency(returnedLineItems.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0));
        const nextFinancials = calculateRetailFinancialsFromLineItems(remainingLineItems, sale.financials || {});
        const totalAmountPaid = roundCurrency(sale.totalAmountPaid);
        const totalExpenses = roundCurrency(sale.financials?.totalExpenses);
        const nextBalanceDue = roundCurrency(Math.max(nextFinancials.grandTotal - totalAmountPaid - totalExpenses, 0));
        const creditBalance = roundCurrency(Math.max(totalAmountPaid + totalExpenses - nextFinancials.grandTotal, 0));
        const nextPaymentStatus = nextBalanceDue <= 0
            ? "Paid"
            : totalAmountPaid > 0
                ? "Partially Paid"
                : "Unpaid";
        const previousReturnCount = Number(sale.returnCount) || 0;
        const previousReturnedQuantity = Number(sale.totalReturnedQuantity) || 0;
        const previousReturnedAmount = roundCurrency(sale.totalReturnedAmount);
        const nextReturnStatus = remainingLineItems.length === 0 ? "Fully Returned" : "Partially Returned";

        transaction.set(returnRef, {
            returnId: buildSalesReturnId(),
            saleDocId: saleId,
            saleId: sale.saleId || "",
            manualVoucherNumber: sale.manualVoucherNumber || "",
            customerName: sale.customerInfo?.name || "",
            returnDate: returnPayload.returnDate,
            reason: returnPayload.reason,
            items: returnedLineItems,
            totalReturnedQuantity: returnedQuantity,
            totalReturnedAmount: returnedAmount,
            returnStatus: nextReturnStatus,
            createdBy: user.email,
            createdOn: now
        });

        transaction.update(saleRef, {
            lineItems: remainingLineItems,
            lineItemCount: remainingLineItems.length,
            totalQuantity: remainingLineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
            financials: {
                ...(sale.financials || {}),
                ...nextFinancials,
                totalExpenses,
                amountTendered: roundCurrency(sale.financials?.amountTendered),
                paymentCount: Number(sale.financials?.paymentCount) || 0
            },
            balanceDue: nextBalanceDue,
            paymentStatus: nextPaymentStatus,
            creditBalance,
            returnStatus: nextReturnStatus,
            returnCount: previousReturnCount + 1,
            totalReturnedQuantity: previousReturnedQuantity + returnedQuantity,
            totalReturnedAmount: roundCurrency(previousReturnedAmount + returnedAmount),
            latestReturnReason: returnPayload.reason,
            latestReturnOn: now,
            updatedBy: user.email,
            updatedOn: now
        });

        requestedProductIds.forEach((productId, index) => {
            const returnQuantity = requestedQuantityMap.get(productId) || 0;
            transaction.update(productRefs[index], {
                inventoryCount: firebase.firestore.FieldValue.increment(returnQuantity),
                updatedBy: user.email,
                updateDate: now
            });
        });

        return {
            returnRef,
            summary: {
                returnedQuantity,
                returnedAmount,
                nextReturnStatus,
                nextBalanceDue,
                nextPaymentStatus,
                nextGrandTotal: nextFinancials.grandTotal,
                creditBalance
            }
        };
    });
}

export async function addRetailSaleExpenseRecord(saleId, expensePayload, user) {
    if (!saleId) {
        throw new Error("Select a retail sale before logging an expense.");
    }

    const db = getDb();
    const now = getNow();
    const saleRef = db.collection(COLLECTIONS.salesInvoices).doc(saleId);
    const expenseRef = saleRef.collection(RETAIL_SALE_EXPENSES_SUBCOLLECTION).doc();

    return db.runTransaction(async transaction => {
        const saleDoc = await transaction.get(saleRef);

        if (!saleDoc.exists) {
            throw new Error("This sale could not be found.");
        }

        const saleData = saleDoc.data() || {};
        if (saleData.saleStatus === "Voided") {
            throw new Error("Voided sales cannot accept expenses.");
        }

        const currentBalanceDue = Number(saleData.balanceDue) || 0;
        if (currentBalanceDue <= 0) {
            throw new Error("This sale has no balance due left for expense adjustment.");
        }

        const expenseAmount = Number(expensePayload.amount) || 0;
        if (expenseAmount > currentBalanceDue) {
            throw new Error(`Expense cannot exceed the current balance due of ${currentBalanceDue.toFixed(2)}.`);
        }

        const currentTotalExpenses = Number(saleData.financials?.totalExpenses) || 0;
        const nextBalanceDue = Number((currentBalanceDue - expenseAmount).toFixed(2));
        const nextTotalExpenses = Number((currentTotalExpenses + expenseAmount).toFixed(2));

        transaction.set(expenseRef, {
            expenseId: buildSalesExpenseId(),
            expenseDate: expensePayload.expenseDate,
            justification: expensePayload.justification,
            amount: expenseAmount,
            addedBy: user.email,
            addedOn: now
        });

        transaction.update(saleRef, {
            "financials.totalExpenses": nextTotalExpenses,
            balanceDue: nextBalanceDue,
            updatedBy: user.email,
            updatedOn: now
        });

        return {
            expenseRef,
            summary: {
                expenseAmount,
                nextBalanceDue,
                nextTotalExpenses
            }
        };
    });
}

export async function recordRetailSalePayment(saleId, paymentPayload, user) {
    if (!saleId) {
        throw new Error("Select a retail sale before recording payment.");
    }

    const db = getDb();
    const now = getNow();
    const saleRef = db.collection(COLLECTIONS.salesInvoices).doc(saleId);
    const paymentRef = db.collection(COLLECTIONS.salesPaymentsLedger).doc();

    return db.runTransaction(async transaction => {
        const saleDoc = await transaction.get(saleRef);

        if (!saleDoc.exists) {
            throw new Error("This sale could not be found.");
        }

        const sale = saleDoc.data() || {};
        if (sale.saleStatus === "Voided") {
            throw new Error("Voided sales cannot accept payments.");
        }

        const invoiceTotal = Number(sale.financials?.grandTotal) || 0;
        const currentAmountPaid = Number(sale.totalAmountPaid) || 0;
        const currentBalanceDue = Number(sale.balanceDue ?? Math.max(invoiceTotal - currentAmountPaid, 0)) || 0;
        const paymentAmount = Number(paymentPayload.amountPaid) || 0;

        if (currentBalanceDue <= 0) {
            throw new Error("This sale has already been fully paid.");
        }

        if (paymentAmount <= 0) {
            throw new Error("Payment amount must be greater than zero.");
        }

        if (paymentAmount > currentBalanceDue) {
            throw new Error(`Payment cannot exceed the current balance due of ${currentBalanceDue.toFixed(2)}.`);
        }

        const nextTotalAmountPaid = Number((currentAmountPaid + paymentAmount).toFixed(2));
        const nextBalanceDue = Number(Math.max((invoiceTotal - nextTotalAmountPaid), 0).toFixed(2));
        const nextPaymentCount = (Number(sale.financials?.paymentCount) || 0) + 1;
        const nextAmountTendered = Number(((Number(sale.financials?.amountTendered) || 0) + paymentAmount).toFixed(2));
        const nextPaymentStatus = nextBalanceDue <= 0
            ? "Paid"
            : nextTotalAmountPaid > 0
                ? "Partially Paid"
                : "Unpaid";

        transaction.update(saleRef, {
            totalAmountPaid: nextTotalAmountPaid,
            balanceDue: nextBalanceDue,
            paymentStatus: nextPaymentStatus,
            latestPaymentMode: paymentPayload.paymentMode,
            "financials.amountTendered": nextAmountTendered,
            "financials.paymentCount": nextPaymentCount,
            updatedBy: user.email,
            updatedOn: now
        });

        transaction.set(paymentRef, {
            paymentId: buildSalesPaymentId(),
            invoiceId: saleId,
            relatedSaleId: saleId,
            relatedSaleNumber: sale.manualVoucherNumber || paymentPayload.relatedSaleNumber || "",
            paymentDate: paymentPayload.paymentDate,
            amountPaid: paymentAmount,
            totalCollected: paymentAmount,
            paymentMode: paymentPayload.paymentMode,
            transactionRef: paymentPayload.transactionRef || "",
            notes: paymentPayload.notes || "",
            status: "Verified",
            paymentStatus: "Verified",
            customerName: sale.customerInfo?.name || "",
            store: sale.store || "",
            recordedBy: user.email,
            recordedOn: now,
            createdBy: user.email,
            createdOn: now
        });

        return {
            paymentRef,
            summary: {
                paymentAmount,
                nextTotalAmountPaid,
                nextBalanceDue,
                nextPaymentStatus
            }
        };
    });
}

export async function updateRetailSaleRecord(saleId, updatePayload, user) {
    if (!saleId) {
        throw new Error("Select a retail sale before saving changes.");
    }

    const db = getDb();
    const now = getNow();
    const saleRef = db.collection(COLLECTIONS.salesInvoices).doc(saleId);

    return db.runTransaction(async transaction => {
        const saleDoc = await transaction.get(saleRef);

        if (!saleDoc.exists) {
            throw new Error("This sale could not be found.");
        }

        const sale = saleDoc.data() || {};
        const editScope = resolveRetailSaleEditScope(sale);

        if (editScope === "none") {
            throw new Error("Voided sales cannot be edited.");
        }

        const requestedScope = normalizeText(updatePayload.editScope || "limited");
        if (requestedScope === "full" && editScope !== "full") {
            throw new Error("This sale has linked payments, expenses, or returns and only supports limited edits.");
        }

        const baseUpdate = {
            customerInfo: {
                ...(sale.customerInfo || {}),
                ...(updatePayload.customerInfo || {})
            },
            saleNotes: updatePayload.saleNotes ?? sale.saleNotes ?? "",
            updatedBy: user.email,
            updatedOn: now,
            lastEditReason: normalizeText(updatePayload.editReason || ""),
            lastEditScope: requestedScope,
            lastEditedBy: user.email,
            lastEditedOn: now
        };

        if (requestedScope !== "full") {
            transaction.update(saleRef, baseUpdate);
            return {
                summary: {
                    editScope: "limited",
                    paymentStatus: sale.paymentStatus || "Unpaid",
                    balanceDue: roundCurrency(sale.balanceDue)
                }
            };
        }

        const oldLineItems = sale.lineItems || [];
        const newLineItems = updatePayload.lineItems || [];
        const oldQuantityMap = buildLineItemQuantityMap(oldLineItems);
        const newQuantityMap = buildLineItemQuantityMap(newLineItems);
        const productIds = new Set([...oldQuantityMap.keys(), ...newQuantityMap.keys()]);

        const stockAdjustments = [...productIds].map(productId => {
            const oldQty = Number(oldQuantityMap.get(productId) || 0);
            const newQty = Number(newQuantityMap.get(productId) || 0);
            return {
                productId,
                delta: newQty - oldQty
            };
        }).filter(item => item.delta !== 0);

        const productRefs = stockAdjustments.map(item => db.collection(COLLECTIONS.products).doc(item.productId));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        stockAdjustments.forEach((adjustment, index) => {
            const productDoc = productDocs[index];
            if (!productDoc.exists) {
                throw new Error("One or more products in this sale are no longer available.");
            }

            const currentStock = Number(productDoc.data().inventoryCount) || 0;
            if (adjustment.delta > 0 && currentStock < adjustment.delta) {
                const productName = newLineItems.find(item => item.productId === adjustment.productId)?.productName
                    || oldLineItems.find(item => item.productId === adjustment.productId)?.productName
                    || adjustment.productId;
                throw new Error(`"${productName}" only has ${currentStock} units available for this edit.`);
            }
        });

        stockAdjustments.forEach((adjustment, index) => {
            const productRef = productRefs[index];
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(-adjustment.delta),
                updatedBy: user.email,
                updateDate: now
            });
        });

        const financials = updatePayload.financials || {};
        const grandTotal = roundCurrency(financials.grandTotal);
        const totalAmountPaid = roundCurrency(sale.totalAmountPaid);
        const totalExpenses = roundCurrency(sale.financials?.totalExpenses);
        const balanceDue = roundCurrency(Math.max(grandTotal - totalAmountPaid - totalExpenses, 0));
        const paymentStatus = balanceDue <= 0
            ? "Paid"
            : totalAmountPaid > 0
                ? "Partially Paid"
                : "Unpaid";

        transaction.update(saleRef, {
            ...baseUpdate,
            saleDate: updatePayload.saleDate ?? sale.saleDate,
            manualVoucherNumber: updatePayload.manualVoucherNumber ?? sale.manualVoucherNumber ?? "",
            lineItems: newLineItems,
            lineItemCount: newLineItems.length,
            totalQuantity: newLineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
            financials: {
                ...(sale.financials || {}),
                ...financials
            },
            balanceDue,
            paymentStatus
        });

        return {
            summary: {
                editScope: "full",
                paymentStatus,
                balanceDue,
                grandTotal
            }
        };
    });
}
