import { COLLECTIONS } from "../../config/collections.js";

const SALES_CATALOGUE_ITEMS_SUBCOLLECTION = "items";
const RETAIL_SALE_EXPENSES_SUBCOLLECTION = "expenses";
const RETAIL_SALE_RETURNS_SUBCOLLECTION = "returns";
const LEAD_QUOTES_SUBCOLLECTION = "quotes";

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

function buildDonationBusinessId() {
    return `DON-${Date.now()}`;
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
    const sourceLeadId = normalizeText(payload.sourceLeadId);
    const sourceQuoteId = normalizeText(payload.sourceQuoteId);
    const sourceLeadRef = sourceLeadId
        ? db.collection(COLLECTIONS.leads).doc(sourceLeadId)
        : null;
    const sourceQuoteRef = sourceLeadRef && sourceQuoteId
        ? sourceLeadRef.collection(LEAD_QUOTES_SUBCOLLECTION).doc(sourceQuoteId)
        : null;

    return db.runTransaction(async transaction => {
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
        const sourceLeadDoc = sourceLeadRef
            ? await transaction.get(sourceLeadRef)
            : null;
        const sourceQuoteDoc = sourceQuoteRef
            ? await transaction.get(sourceQuoteRef)
            : null;

        if (sourceLeadRef) {
            if (!sourceLeadDoc?.exists) {
                throw new Error("The source lead could not be found. Refresh and try conversion again.");
            }

            const leadData = sourceLeadDoc.data() || {};
            const leadStatus = normalizeText(leadData.leadStatus || "New");
            const linkedSaleId = normalizeText(leadData.convertedToSaleId || leadData.linkedSaleId);

            if (leadStatus === "Converted" && linkedSaleId && linkedSaleId !== saleRef.id) {
                throw new Error("This lead is already linked to another sale.");
            }
        }

        if (sourceQuoteRef) {
            if (!sourceQuoteDoc?.exists) {
                throw new Error("The source quote could not be found. Refresh and try conversion again.");
            }

            const quoteData = sourceQuoteDoc.data() || {};
            const linkedSaleId = normalizeText(quoteData.convertedToSaleId);

            if (normalizeText(quoteData.quoteStatus) === "Converted" && linkedSaleId && linkedSaleId !== saleRef.id) {
                throw new Error("This quote is already linked to another retail sale.");
            }
        }

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

        const totalAmountPaid = roundCurrency(
            payload.initialPayment?.amountApplied ?? payload.initialPayment?.amountPaid
        );
        const totalCollected = roundCurrency(
            payload.initialPayment?.amountReceived ?? payload.initialPayment?.amountApplied ?? payload.initialPayment?.amountPaid
        );
        const totalDonation = roundCurrency(
            payload.initialPayment?.donationAmount ?? Math.max(totalCollected - totalAmountPaid, 0)
        );
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
            sourceType: payload.sourceType || "",
            sourceLeadId: sourceLeadId || "",
            sourceLeadBusinessId: payload.sourceLeadBusinessId || "",
            sourceLeadCustomerName: payload.sourceLeadCustomerName || "",
            sourceQuoteId: payload.sourceQuoteId || "",
            sourceQuoteNumber: payload.sourceQuoteNumber || "",
            sourceQuoteStatus: payload.sourceQuoteStatus || "",
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
                amountTendered: totalCollected,
                paymentCount: payload.initialPayment ? 1 : 0
            },
            lineItemCount: payload.lineItems.length,
            totalQuantity: payload.lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
            totalAmountPaid,
            totalDonation,
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
            const donationRef = totalDonation > 0
                ? db.collection(COLLECTIONS.donations).doc()
                : null;

            transaction.set(paymentRef, {
                paymentId: buildSalesPaymentId(),
                invoiceId: saleRef.id,
                relatedSaleId: saleRef.id,
                relatedSaleNumber: payload.manualVoucherNumber,
                paymentDate: payload.initialPayment.paymentDate,
                amountPaid: totalAmountPaid,
                amountApplied: totalAmountPaid,
                amountReceived: totalCollected,
                donationAmount: totalDonation,
                totalCollected: totalCollected,
                paymentMode: payload.initialPayment.paymentMode,
                transactionRef: payload.initialPayment.transactionRef,
                notes: payload.initialPayment.notes || "",
                status: "Verified",
                paymentStatus: "Verified",
                donationEntryId: donationRef?.id || "",
                customerName: payload.customerInfo.name,
                store: payload.store,
                recordedBy: user.email,
                recordedOn: now,
                createdBy: user.email,
                createdOn: now
            });

            if (donationRef) {
                transaction.set(donationRef, {
                    donationId: buildDonationBusinessId(),
                    donationDate: payload.initialPayment.paymentDate,
                    amount: totalDonation,
                    status: "Active",
                    moduleType: "Retail Store",
                    sourceCollection: COLLECTIONS.salesPaymentsLedger,
                    sourcePaymentDocId: paymentRef.id,
                    sourceSaleId: saleRef.id,
                    sourceSaleNumber: payload.manualVoucherNumber || "",
                    customerName: payload.customerInfo.name || "",
                    paymentMode: payload.initialPayment.paymentMode || "",
                    paymentReference: payload.initialPayment.transactionRef || "",
                    notes: payload.initialPayment.notes || "Auto-captured overpayment donation.",
                    createdBy: user.email,
                    createdOn: now,
                    updatedBy: user.email,
                    updatedOn: now
                });
            }
        }

        productRefs.forEach((productRef, index) => {
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(-Number(payload.lineItems[index].quantity || 0)),
                updatedBy: user.email,
                updateDate: now
            });
        });

        if (sourceLeadRef) {
            transaction.update(sourceLeadRef, {
                leadStatus: "Converted",
                convertedToSaleId: saleRef.id,
                convertedToSaleNumber: payload.manualVoucherNumber || "",
                convertedStore: payload.store || "",
                convertedOn: now,
                convertedBy: user.email,
                updatedBy: user.email,
                updatedOn: now
            });
        }

        if (sourceQuoteRef) {
            transaction.update(sourceQuoteRef, {
                quoteStatus: "Converted",
                convertedToSaleId: saleRef.id,
                convertedToSaleNumber: payload.manualVoucherNumber || "",
                convertedStore: payload.store || "",
                convertedOn: now,
                convertedBy: user.email,
                conversionOutcome: "Sale Active",
                conversionOutcomeStatus: "Active",
                convertedSaleStatus: "Active",
                updatedBy: user.email,
                updatedOn: now
            });
        }

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
        const amountReceived = roundCurrency(paymentPayload.amountReceived ?? paymentPayload.amountPaid);
        const amountApplied = roundCurrency(Math.min(amountReceived, currentBalanceDue));
        const donationAmount = roundCurrency(Math.max(amountReceived - amountApplied, 0));
        const currentTotalDonation = roundCurrency(sale.totalDonation);
        const donationRef = donationAmount > 0
            ? db.collection(COLLECTIONS.donations).doc()
            : null;

        if (currentBalanceDue <= 0) {
            throw new Error("This sale has already been fully paid.");
        }

        if (amountReceived <= 0) {
            throw new Error("Payment amount must be greater than zero.");
        }

        const nextTotalAmountPaid = Number((currentAmountPaid + amountApplied).toFixed(2));
        const nextTotalDonation = Number((currentTotalDonation + donationAmount).toFixed(2));
        const nextBalanceDue = Number(Math.max((invoiceTotal - nextTotalAmountPaid), 0).toFixed(2));
        const nextPaymentCount = (Number(sale.financials?.paymentCount) || 0) + 1;
        const nextAmountTendered = Number(((Number(sale.financials?.amountTendered) || 0) + amountReceived).toFixed(2));
        const nextPaymentStatus = nextBalanceDue <= 0
            ? "Paid"
            : nextTotalAmountPaid > 0
                ? "Partially Paid"
                : "Unpaid";

        transaction.update(saleRef, {
            totalAmountPaid: nextTotalAmountPaid,
            totalDonation: nextTotalDonation,
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
            amountPaid: amountApplied,
            amountApplied,
            amountReceived,
            donationAmount,
            totalCollected: amountReceived,
            paymentMode: paymentPayload.paymentMode,
            transactionRef: paymentPayload.transactionRef || "",
            notes: paymentPayload.notes || "",
            status: "Verified",
            paymentStatus: "Verified",
            donationEntryId: donationRef?.id || "",
            customerName: sale.customerInfo?.name || "",
            store: sale.store || "",
            recordedBy: user.email,
            recordedOn: now,
            createdBy: user.email,
            createdOn: now
        });

        if (donationRef) {
            transaction.set(donationRef, {
                donationId: buildDonationBusinessId(),
                donationDate: paymentPayload.paymentDate,
                amount: donationAmount,
                status: "Active",
                moduleType: "Retail Store",
                sourceCollection: COLLECTIONS.salesPaymentsLedger,
                sourcePaymentDocId: paymentRef.id,
                sourceSaleId: saleId,
                sourceSaleNumber: sale.manualVoucherNumber || paymentPayload.relatedSaleNumber || "",
                customerName: sale.customerInfo?.name || "",
                paymentMode: paymentPayload.paymentMode || "",
                paymentReference: paymentPayload.transactionRef || "",
                notes: paymentPayload.notes || "Auto-captured overpayment donation.",
                createdBy: user.email,
                createdOn: now,
                updatedBy: user.email,
                updatedOn: now
            });
        }

        return {
            paymentRef,
            summary: {
                paymentAmount: amountReceived,
                appliedAmount: amountApplied,
                donationAmount,
                nextTotalAmountPaid,
                nextTotalDonation,
                nextBalanceDue,
                nextPaymentStatus
            }
        };
    });
}

export async function voidRetailSalePaymentRecord(paymentId, voidReason, user) {
    if (!paymentId) {
        throw new Error("Select a retail payment before voiding.");
    }

    const db = getDb();
    const now = getNow();
    const paymentRef = db.collection(COLLECTIONS.salesPaymentsLedger).doc(paymentId);

    return db.runTransaction(async transaction => {
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists) {
            throw new Error("This payment could not be found.");
        }

        const paymentData = paymentDoc.data() || {};
        const paymentStatus = normalizeText(paymentData.paymentStatus || paymentData.status || "Verified");
        const normalizedPaymentStatus = paymentStatus.toLowerCase();
        const amountApplied = roundCurrency(paymentData.amountApplied ?? paymentData.amountPaid);
        const amountReceived = roundCurrency(paymentData.amountReceived ?? paymentData.totalCollected ?? paymentData.amountPaid);
        const donationAmount = roundCurrency(paymentData.donationAmount);

        if (paymentData.isReversalEntry) {
            throw new Error("Reversal payment entries cannot be voided.");
        }

        if (normalizedPaymentStatus === "voided" || normalizedPaymentStatus === "void reversal") {
            throw new Error("This retail payment has already been voided.");
        }

        if (amountApplied <= 0 && amountReceived <= 0) {
            throw new Error("Only posted retail payments can be voided.");
        }

        const saleId = normalizeText(paymentData.invoiceId || paymentData.relatedSaleId);
        if (!saleId) {
            throw new Error("This payment is not linked to a retail sale.");
        }

        const saleRef = db.collection(COLLECTIONS.salesInvoices).doc(saleId);
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists) {
            throw new Error("The linked retail sale could not be found.");
        }

        const sale = saleDoc.data() || {};
        const saleStatus = normalizeText(sale.saleStatus || "Active").toLowerCase();
        if (saleStatus === "voided") {
            throw new Error("Payments for a voided sale cannot be voided separately.");
        }

        const donationEntryId = normalizeText(paymentData.donationEntryId);
        const donationEntryRef = donationAmount > 0 && donationEntryId
            ? db.collection(COLLECTIONS.donations).doc(donationEntryId)
            : null;
        const donationEntryDoc = donationEntryRef
            ? await transaction.get(donationEntryRef)
            : null;

        const currentTotalAmountPaid = roundCurrency(sale.totalAmountPaid);
        const currentTotalDonation = roundCurrency(sale.totalDonation);
        const currentBalanceDue = roundCurrency(sale.balanceDue);
        const currentPaymentCount = Math.max(0, Number(sale.financials?.paymentCount) || 0);
        const currentAmountTendered = roundCurrency(sale.financials?.amountTendered);

        const nextTotalAmountPaid = roundCurrency(Math.max(currentTotalAmountPaid - amountApplied, 0));
        const nextTotalDonation = roundCurrency(Math.max(currentTotalDonation - donationAmount, 0));
        const nextBalanceDue = roundCurrency(Math.max(currentBalanceDue + amountApplied, 0));
        const nextPaymentCount = Math.max(currentPaymentCount - 1, 0);
        const nextAmountTendered = roundCurrency(Math.max(currentAmountTendered - amountReceived, 0));
        const nextPaymentStatus = nextBalanceDue <= 0
            ? "Paid"
            : nextTotalAmountPaid > 0
                ? "Partially Paid"
                : "Unpaid";
        const reversalRef = db.collection(COLLECTIONS.salesPaymentsLedger).doc();
        const donationReversalRef = donationAmount > 0
            ? db.collection(COLLECTIONS.donations).doc()
            : null;

        transaction.update(paymentRef, {
            paymentStatus: "Voided",
            status: "Voided",
            voidedBy: user.email,
            voidedOn: now,
            voidReason,
            voidContext: "Payment Void",
            originalStatus: paymentStatus,
            updatedBy: user.email,
            updatedOn: now
        });

        transaction.set(reversalRef, {
            paymentId: buildSalesPaymentId(),
            invoiceId: saleId,
            relatedSaleId: saleId,
            relatedSaleNumber: sale.manualVoucherNumber || paymentData.relatedSaleNumber || "",
            paymentDate: now,
            amountPaid: -amountApplied,
            amountApplied: -amountApplied,
            amountReceived: -amountReceived,
            donationAmount: -donationAmount,
            totalCollected: -amountReceived,
            paymentMode: "VOID_REVERSAL",
            transactionRef: `Payment void reversal of ${paymentData.transactionRef || paymentData.paymentId || paymentDoc.id}`,
            notes: `Reversed payment ${paymentData.paymentId || paymentDoc.id}. Reason: ${voidReason}`,
            status: "Void Reversal",
            paymentStatus: "Void Reversal",
            originalPaymentId: paymentDoc.id,
            isReversalEntry: true,
            donationEntryId: donationReversalRef?.id || "",
            customerName: sale.customerInfo?.name || paymentData.customerName || "",
            store: sale.store || paymentData.store || "",
            recordedBy: user.email,
            recordedOn: now,
            createdBy: user.email,
            createdOn: now,
            voidedBy: user.email,
            voidReason
        });

        if (donationReversalRef) {
            if (donationEntryRef && donationEntryDoc?.exists) {
                transaction.set(donationEntryRef, {
                    status: "Voided",
                    voidReason,
                    voidedBy: user.email,
                    voidedOn: now,
                    updatedBy: user.email,
                    updatedOn: now
                }, { merge: true });
            }

            transaction.set(donationReversalRef, {
                donationId: buildDonationBusinessId(),
                donationDate: now,
                amount: -donationAmount,
                status: "Void Reversal",
                moduleType: "Retail Store",
                sourceCollection: COLLECTIONS.salesPaymentsLedger,
                sourcePaymentDocId: reversalRef.id,
                sourceSaleId: saleId,
                sourceSaleNumber: sale.manualVoucherNumber || paymentData.relatedSaleNumber || "",
                originalDonationEntryId: donationEntryRef?.id || "",
                originalPaymentDocId: paymentDoc.id,
                isReversalEntry: true,
                notes: `Donation reversal for payment void ${paymentData.paymentId || paymentDoc.id}. Reason: ${voidReason}`,
                createdBy: user.email,
                createdOn: now,
                updatedBy: user.email,
                updatedOn: now
            });
        }

        transaction.update(saleRef, {
            totalAmountPaid: nextTotalAmountPaid,
            totalDonation: nextTotalDonation,
            balanceDue: nextBalanceDue,
            paymentStatus: nextPaymentStatus,
            latestPaymentMode: nextPaymentCount > 0 ? (sale.latestPaymentMode || "") : "",
            "financials.amountTendered": nextAmountTendered,
            "financials.paymentCount": nextPaymentCount,
            lastPaymentVoided: {
                paymentId: paymentDoc.id,
                paymentBusinessId: paymentData.paymentId || "",
                reversalPaymentId: reversalRef.id,
                voidedAmount: amountApplied,
                voidedReceivedAmount: amountReceived,
                donationReversed: donationAmount,
                voidReason,
                voidedBy: user.email,
                voidedOn: now
            },
            updatedBy: user.email,
            updatedOn: now
        });

        return {
            summary: {
                paymentId: paymentData.paymentId || paymentDoc.id,
                amountApplied,
                amountReceived,
                donationAmount,
                nextBalanceDue,
                nextPaymentStatus
            }
        };
    });
}

export async function voidRetailSaleRecord(saleId, voidReason, user) {
    if (!saleId) {
        throw new Error("Select a retail sale before voiding.");
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
        const saleStatus = normalizeText(sale.saleStatus || "Active").toLowerCase();
        if (saleStatus === "voided") {
            throw new Error("This sale has already been voided.");
        }

        const returnCount = Number(sale.returnCount) || 0;
        const returnStatus = normalizeText(sale.returnStatus || "Not Returned").toLowerCase();
        if (returnCount > 0 || returnStatus !== "not returned") {
            throw new Error("Sales with posted returns cannot be voided. Use return and credit-note history for reversal tracking.");
        }

        const paymentSnapshot = await db
            .collection(COLLECTIONS.salesPaymentsLedger)
            .where("invoiceId", "==", saleId)
            .get();
        const relatedPaymentRefs = paymentSnapshot.docs.map(doc => doc.ref);
        const paymentDocs = await Promise.all(
            relatedPaymentRefs.map(paymentRef => transaction.get(paymentRef))
        );
        const activePayments = paymentDocs.filter(doc => {
            if (!doc.exists) return false;

            const data = doc.data() || {};
            const status = normalizeText(data.paymentStatus || data.status || "Verified").toLowerCase();
            const appliedAmount = roundCurrency(data.amountApplied ?? data.amountPaid);
            const receivedAmount = roundCurrency(data.amountReceived ?? data.totalCollected ?? data.amountPaid);
            return !data.isReversalEntry && status !== "voided" && (appliedAmount > 0 || receivedAmount > 0);
        });
        const expenseSnapshot = await saleRef.collection(RETAIL_SALE_EXPENSES_SUBCOLLECTION).get();
        const relatedExpenseRefs = expenseSnapshot.docs.map(doc => doc.ref);
        const expenseDocs = await Promise.all(
            relatedExpenseRefs.map(expenseRef => transaction.get(expenseRef))
        );
        const activeExpenses = expenseDocs.filter(doc => {
            if (!doc.exists) return false;

            const data = doc.data() || {};
            const status = normalizeText(data.status || "Active").toLowerCase();
            return !data.isReversalEntry && status !== "voided" && roundCurrency(data.amount) > 0;
        });
        const sourceLeadId = normalizeText(sale.sourceLeadId);
        const sourceQuoteId = normalizeText(sale.sourceQuoteId);
        const sourceLeadRef = sourceLeadId
            ? db.collection(COLLECTIONS.leads).doc(sourceLeadId)
            : null;
        const sourceQuoteRef = sourceLeadRef && sourceQuoteId
            ? sourceLeadRef.collection(LEAD_QUOTES_SUBCOLLECTION).doc(sourceQuoteId)
            : null;
        const sourceLeadDoc = sourceLeadRef
            ? await transaction.get(sourceLeadRef)
            : null;
        const sourceQuoteDoc = sourceQuoteRef
            ? await transaction.get(sourceQuoteRef)
            : null;

        let voidedPaymentCount = 0;
        let voidedPaymentAmount = 0;
        let voidedDonationCount = 0;
        let voidedDonationAmount = 0;

        activePayments.forEach(paymentDoc => {
            const paymentData = paymentDoc.data() || {};
            const paymentAmount = roundCurrency(paymentData.amountApplied ?? paymentData.amountPaid);
            const receivedAmount = roundCurrency(paymentData.amountReceived ?? paymentData.totalCollected ?? paymentAmount);
            const donationAmount = roundCurrency(paymentData.donationAmount);
            const paymentStatus = normalizeText(paymentData.paymentStatus || paymentData.status || "Verified");
            const reversalRef = db.collection(COLLECTIONS.salesPaymentsLedger).doc();
            const donationEntryRef = donationAmount > 0
                ? (paymentData.donationEntryId
                    ? db.collection(COLLECTIONS.donations).doc(paymentData.donationEntryId)
                    : db.collection(COLLECTIONS.donations).doc())
                : null;
            const donationReversalRef = donationAmount > 0
                ? db.collection(COLLECTIONS.donations).doc()
                : null;

            transaction.update(paymentDoc.ref, {
                paymentStatus: "Voided",
                status: "Voided",
                voidedBy: user.email,
                voidedOn: now,
                voidReason,
                voidContext: "Sale Void",
                originalStatus: paymentStatus,
                updatedBy: user.email,
                updatedOn: now
            });

            transaction.set(reversalRef, {
                paymentId: buildSalesPaymentId(),
                invoiceId: saleId,
                relatedSaleId: saleId,
                relatedSaleNumber: sale.manualVoucherNumber || paymentData.relatedSaleNumber || "",
                paymentDate: now,
                amountPaid: -paymentAmount,
                amountApplied: -paymentAmount,
                amountReceived: -receivedAmount,
                donationAmount: -donationAmount,
                totalCollected: -receivedAmount,
                paymentMode: "VOID_REVERSAL",
                transactionRef: `Sale void reversal of ${paymentData.transactionRef || paymentData.paymentId || paymentDoc.id}`,
                notes: `Reversed during sale void ${sale.saleId || sale.manualVoucherNumber || saleId}. Reason: ${voidReason}`,
                status: "Void Reversal",
                paymentStatus: "Void Reversal",
                originalPaymentId: paymentDoc.id,
                isReversalEntry: true,
                donationEntryId: donationReversalRef?.id || "",
                customerName: sale.customerInfo?.name || paymentData.customerName || "",
                store: sale.store || paymentData.store || "",
                recordedBy: user.email,
                recordedOn: now,
                createdBy: user.email,
                createdOn: now,
                voidedBy: user.email,
                voidReason
            });

            if (donationEntryRef && donationReversalRef) {
                transaction.set(donationEntryRef, {
                    donationId: paymentData.donationId || buildDonationBusinessId(),
                    donationDate: paymentData.paymentDate || now,
                    amount: donationAmount,
                    status: "Voided",
                    moduleType: "Retail Store",
                    sourceCollection: COLLECTIONS.salesPaymentsLedger,
                    sourcePaymentDocId: paymentDoc.id,
                    sourceSaleId: saleId,
                    sourceSaleNumber: sale.manualVoucherNumber || paymentData.relatedSaleNumber || "",
                    customerName: sale.customerInfo?.name || paymentData.customerName || "",
                    paymentMode: paymentData.paymentMode || "",
                    paymentReference: paymentData.transactionRef || paymentData.paymentId || paymentDoc.id,
                    notes: paymentData.notes || "",
                    voidReason,
                    voidedBy: user.email,
                    voidedOn: now,
                    updatedBy: user.email,
                    updatedOn: now
                }, { merge: true });

                transaction.set(donationReversalRef, {
                    donationId: buildDonationBusinessId(),
                    donationDate: now,
                    amount: -donationAmount,
                    status: "Void Reversal",
                    moduleType: "Retail Store",
                    sourceCollection: COLLECTIONS.salesPaymentsLedger,
                    sourcePaymentDocId: reversalRef.id,
                    sourceSaleId: saleId,
                    sourceSaleNumber: sale.manualVoucherNumber || paymentData.relatedSaleNumber || "",
                    originalDonationEntryId: donationEntryRef.id,
                    originalPaymentDocId: paymentDoc.id,
                    isReversalEntry: true,
                    notes: `Donation reversal for sale void ${sale.saleId || sale.manualVoucherNumber || saleId}. Reason: ${voidReason}`,
                    createdBy: user.email,
                    createdOn: now,
                    updatedBy: user.email,
                    updatedOn: now
                });

                voidedDonationCount += 1;
                voidedDonationAmount += donationAmount;
            }

            voidedPaymentCount += 1;
            voidedPaymentAmount += paymentAmount;
        });

        let voidedExpenseCount = 0;
        let voidedExpenseAmount = 0;

        activeExpenses.forEach(expenseDoc => {
            const expenseData = expenseDoc.data() || {};
            const expenseAmount = roundCurrency(expenseData.amount);
            const reversalExpenseRef = saleRef.collection(RETAIL_SALE_EXPENSES_SUBCOLLECTION).doc();

            transaction.update(expenseDoc.ref, {
                status: "Voided",
                voidedBy: user.email,
                voidedOn: now,
                voidReason,
                voidContext: "Sale Void",
                updatedBy: user.email,
                updatedOn: now
            });

            transaction.set(reversalExpenseRef, {
                expenseId: `${buildSalesExpenseId()}-VOID`,
                expenseDate: now,
                justification: `Void reversal of ${expenseData.expenseId || expenseDoc.id}. Reason: ${voidReason}`,
                amount: -expenseAmount,
                status: "Void Reversal",
                isReversalEntry: true,
                originalExpenseId: expenseDoc.id,
                addedBy: user.email,
                addedOn: now,
                voidReason
            });

            voidedExpenseCount += 1;
            voidedExpenseAmount += expenseAmount;
        });

        const lineItems = Array.isArray(sale.lineItems) ? sale.lineItems : [];
        let reversedProductCount = 0;
        let reversedQuantity = 0;

        lineItems.forEach(item => {
            const productId = normalizeText(item.productId);
            const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
            if (!productId || quantity <= 0) return;

            const productRef = db.collection(COLLECTIONS.products).doc(productId);
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(quantity),
                updatedBy: user.email,
                updateDate: now
            });

            reversedProductCount += 1;
            reversedQuantity += quantity;
        });

        transaction.update(saleRef, {
            saleStatus: "Voided",
            paymentStatus: "Voided",
            totalAmountPaid: 0,
            totalDonation: 0,
            balanceDue: 0,
            creditBalance: 0,
            latestPaymentMode: "",
            financials: {
                ...(sale.financials || {}),
                totalExpenses: 0,
                amountTendered: 0,
                paymentCount: 0
            },
            voidReason,
            voidedBy: user.email,
            voidedOn: now,
            voidedPaymentCount,
            voidedPaymentAmount: roundCurrency(voidedPaymentAmount),
            voidedDonationCount,
            voidedDonationAmount: roundCurrency(voidedDonationAmount),
            voidedExpenseCount,
            voidedExpenseAmount: roundCurrency(voidedExpenseAmount),
            inventoryReversalSummary: {
                reversedProductCount,
                reversedQuantity
            },
            updatedBy: user.email,
            updatedOn: now
        });

        if (sourceLeadRef && sourceLeadDoc?.exists) {
            transaction.update(sourceLeadRef, {
                leadStatus: "Converted",
                convertedToSaleId: saleId,
                convertedToSaleNumber: sale.manualVoucherNumber || "",
                convertedStore: sale.store || "",
                conversionOutcome: "Sale Voided",
                conversionOutcomeStatus: "Voided",
                convertedSaleStatus: "Voided",
                convertedSaleVoidedOn: now,
                convertedSaleVoidedBy: user.email,
                convertedSaleVoidReason: voidReason,
                updatedBy: user.email,
                updatedOn: now
            });
        }

        if (sourceQuoteRef && sourceQuoteDoc?.exists) {
            transaction.update(sourceQuoteRef, {
                quoteStatus: "Converted",
                convertedToSaleId: saleId,
                convertedToSaleNumber: sale.manualVoucherNumber || "",
                convertedStore: sale.store || "",
                conversionOutcome: "Sale Voided",
                conversionOutcomeStatus: "Voided",
                convertedSaleStatus: "Voided",
                convertedSaleVoidedOn: now,
                convertedSaleVoidedBy: user.email,
                convertedSaleVoidReason: voidReason,
                updatedBy: user.email,
                updatedOn: now
            });
        }

        return {
            voidedPaymentCount,
            voidedPaymentAmount: roundCurrency(voidedPaymentAmount),
            voidedDonationCount,
            voidedDonationAmount: roundCurrency(voidedDonationAmount),
            voidedExpenseCount,
            voidedExpenseAmount: roundCurrency(voidedExpenseAmount),
            reversedProductCount,
            reversedQuantity
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
