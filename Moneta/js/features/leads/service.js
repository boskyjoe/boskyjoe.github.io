import {
    createLeadQuoteRecord,
    addLeadWorkLogRecord,
    createLeadRecord,
    deleteLeadRecord,
    fetchLeadQuoteRecord,
    fetchSalesCatalogueItems,
    getLeadDeleteRestriction,
    updateLeadQuoteRecord,
    updateLeadQuoteStatusRecord,
    updateLeadRecord
} from "./repository.js";
import { getRetailStoreTaxDefaults, RETAIL_STORES } from "../retail-store/service.js";

export const LEAD_SOURCES = ["Walk-in", "Phone Call", "Website", "Referral", "Event", "Other"];
export const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Converted", "Lost"];
export const LEAD_LOG_TYPES = ["Phone Call", "Email Sent", "Meeting", "Quote Sent", "Quote Accepted", "Quote Revised", "General Note"];
export const LEAD_QUOTE_STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Expired", "Superseded", "Cancelled"];
export const LEAD_QUOTE_STORES = [...RETAIL_STORES, "Consignment"];
export const LEAD_QUOTE_MANUAL_STATUSES = ["Draft", "Sent", "Expired", "Cancelled"];

function normalizeText(value) {
    return (value || "").trim();
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

function parseOptionalDate(value, label) {
    const input = normalizeText(value);
    if (!input) return null;

    const date = new Date(`${input}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`${label} is invalid.`);
    }

    return date;
}

function normalizeRequestedProducts(rows = []) {
    return (rows || [])
        .filter(row => (Number(row.requestedQty) || 0) > 0)
        .map(row => ({
            productId: row.productId,
            productName: row.productName,
            categoryName: row.categoryName || "-",
            sellingPrice: Number(row.sellingPrice) || 0,
            requestedQty: Number(row.requestedQty) || 0
        }));
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function normalizeQuoteStore(value) {
    const text = normalizeText(value);
    return LEAD_QUOTE_STORES.includes(text) ? text : "Church Store";
}

function buildQuoteTaxDefaults(storeName = "") {
    const normalizedStore = normalizeQuoteStore(storeName);

    if (normalizedStore === "Consignment") {
        return {
            cgstPercentage: 0,
            sgstPercentage: 0
        };
    }

    return getRetailStoreTaxDefaults(normalizedStore);
}

function normalizeQuoteLineItems(rows = [], storeName = "") {
    const taxDefaults = buildQuoteTaxDefaults(storeName);

    return (rows || [])
        .filter(row => (Number(row.quotedQty) || Number(row.requestedQty) || 0) > 0)
        .map(row => {
            const quotedQty = Math.max(0, Math.floor(Number(row.quotedQty ?? row.requestedQty) || 0));
            const unitPrice = roundCurrency(row.unitPrice ?? row.sellingPrice);
            const lineDiscountPercentage = Math.max(0, Math.min(100, Number(row.lineDiscountPercentage) || 0));
            const cgstPercentage = Math.max(0, Number(row.cgstPercentage ?? taxDefaults.cgstPercentage) || 0);
            const sgstPercentage = Math.max(0, Number(row.sgstPercentage ?? taxDefaults.sgstPercentage) || 0);
            const lineSubtotal = roundCurrency(quotedQty * unitPrice);
            const lineDiscountAmount = roundCurrency(lineSubtotal * (lineDiscountPercentage / 100));
            const taxableAmount = roundCurrency(lineSubtotal - lineDiscountAmount);
            const cgstAmount = roundCurrency(taxableAmount * (cgstPercentage / 100));
            const sgstAmount = roundCurrency(taxableAmount * (sgstPercentage / 100));
            const taxAmount = roundCurrency(cgstAmount + sgstAmount);
            const lineTotal = roundCurrency(taxableAmount + taxAmount);

            return {
                productId: normalizeText(row.productId),
                productName: normalizeText(row.productName) || "Untitled Product",
                categoryId: normalizeText(row.categoryId),
                categoryName: normalizeText(row.categoryName) || "-",
                quotedQty,
                unitPrice,
                lineDiscountPercentage,
                lineSubtotal,
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
        .filter(item => item.quotedQty > 0);
}

export function calculateLeadQuoteTotals(lineItems = []) {
    const subtotal = roundCurrency((lineItems || []).reduce((sum, item) => sum + roundCurrency(item.lineSubtotal), 0));
    const discountTotal = roundCurrency((lineItems || []).reduce((sum, item) => sum + roundCurrency(item.lineDiscountAmount), 0));
    const taxableAmount = roundCurrency((lineItems || []).reduce((sum, item) => sum + roundCurrency(item.taxableAmount), 0));
    const taxTotal = roundCurrency((lineItems || []).reduce((sum, item) => sum + roundCurrency(item.taxAmount), 0));
    const grandTotal = roundCurrency(taxableAmount + taxTotal);

    return {
        subtotal,
        discountTotal,
        taxableAmount,
        taxTotal,
        grandTotal
    };
}

export function buildLeadQuoteDraft(lead, sourceQuote = null) {
    if (!lead?.id) {
        throw new Error("Select and save a lead before preparing a quote.");
    }

    const store = normalizeQuoteStore(sourceQuote?.store || "Church Store");
    const seedItems = sourceQuote?.lineItems?.length
        ? sourceQuote.lineItems
        : normalizeRequestedProducts(lead.requestedProducts || []);
    const lineItems = normalizeQuoteLineItems(seedItems, store);

    return {
        docId: "",
        sourceQuoteId: sourceQuote?.id || "",
        quoteStatus: "Draft",
        persistedQuoteStatus: "Draft",
        store,
        validUntil: sourceQuote?.validUntil ? formatDateOutput(sourceQuote.validUntil) : formatDateOutput(addDays(new Date(), 14)),
        customerName: normalizeText(sourceQuote?.customerSnapshot?.customerName) || normalizeText(lead.customerName),
        customerPhone: normalizeText(sourceQuote?.customerSnapshot?.customerPhone) || normalizeText(lead.customerPhone),
        customerEmail: normalizeText(sourceQuote?.customerSnapshot?.customerEmail) || normalizeText(lead.customerEmail),
        customerAddress: normalizeText(sourceQuote?.customerSnapshot?.customerAddress) || normalizeText(lead.customerAddress),
        quoteNotes: normalizeText(sourceQuote?.quoteNotes) || normalizeText(lead.leadNotes),
        internalNotes: normalizeText(sourceQuote?.internalNotes),
        acceptanceNotes: "",
        acceptedByCustomerName: "",
        acceptedVia: "",
        lineItems,
        totals: calculateLeadQuoteTotals(lineItems)
    };
}

function addDays(date, days) {
    const value = new Date(date);
    value.setDate(value.getDate() + days);
    return value;
}

function formatDateOutput(value) {
    if (!value) return "";
    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function buildLeadQuotePayload(payload, lead, user, options = {}) {
    const { submitStatus = "Draft", sourceQuote = null } = options;
    const docId = normalizeText(payload.docId);
    const store = normalizeQuoteStore(payload.store);
    const customerName = normalizeText(payload.customerName || lead?.customerName);
    const customerPhone = normalizeText(payload.customerPhone || "");
    const customerEmail = normalizeText(payload.customerEmail || "");
    const customerAddress = normalizeText(payload.customerAddress || "");
    const validUntil = parseOptionalDate(payload.validUntil, "Quote validity date");
    const lineItems = normalizeQuoteLineItems(payload.lineItems || [], store);

    if (!lead?.id) {
        throw new Error("Select and save a lead before creating quotes.");
    }

    if (!lineItems.length) {
        throw new Error("Add at least one quoted product line before saving the quote.");
    }

    if (!LEAD_QUOTE_STATUSES.includes(submitStatus)) {
        throw new Error("Select a valid quote status.");
    }

    if (!customerName) {
        throw new Error("Customer name is required before saving the quote.");
    }

    if (!customerPhone && !customerEmail) {
        throw new Error("Provide at least a phone number or email address before saving the quote.");
    }

    if (submitStatus === "Sent" && !customerEmail) {
        throw new Error("Customer email is required before sending the quote.");
    }

    const totals = calculateLeadQuoteTotals(lineItems);

    return {
        docId,
        quoteData: {
            leadId: lead.id,
            businessLeadId: lead.businessLeadId || "",
            quoteStatus: submitStatus,
            store,
            validUntil,
            quoteNotes: normalizeText(payload.quoteNotes),
            internalNotes: normalizeText(payload.internalNotes),
            customerSnapshot: {
                customerName,
                customerPhone,
                customerEmail,
                customerAddress
            },
            leadSnapshot: {
                leadStatus: normalizeText(lead.leadStatus || "New"),
                enquiryDate: lead.enquiryDate || null,
                expectedDeliveryDate: lead.expectedDeliveryDate || null,
                assignedTo: normalizeText(lead.assignedTo),
                leadSource: normalizeText(lead.leadSource),
                leadNotes: normalizeText(lead.leadNotes)
            },
            catalogueSnapshot: {
                catalogueId: normalizeText(lead.catalogueId),
                catalogueName: normalizeText(lead.catalogueName) || "-",
                seasonName: normalizeText(lead.seasonName) || "-"
            },
            pricingContext: {
                currency: "INR",
                taxMode: store === "Consignment" ? "non-taxable" : "store-default-tax"
            },
            lineItems,
            totals,
            sourceQuoteId: normalizeText(payload.sourceQuoteId || sourceQuote?.id),
            sentOn: submitStatus === "Sent" ? new Date() : null,
            sentBy: submitStatus === "Sent" ? user.email : "",
            expiredOn: submitStatus === "Expired" ? new Date() : null,
            acceptedOn: null,
            acceptedByCustomerName: "",
            acceptedVia: "",
            acceptanceNotes: "",
            rejectedOn: null,
            rejectionReason: "",
            cancelledOn: submitStatus === "Cancelled" ? new Date() : null,
            cancellationReason: ""
        }
    };
}

function buildRequestedMetrics(requestedProducts = []) {
    const requestedItemCount = requestedProducts.reduce((sum, item) => sum + (Number(item.requestedQty) || 0), 0);
    const requestedValue = requestedProducts.reduce((sum, item) => {
        return sum + ((Number(item.requestedQty) || 0) * (Number(item.sellingPrice) || 0));
    }, 0);

    return {
        requestedItemCount,
        requestedValue: Number(requestedValue.toFixed(2))
    };
}

function findCatalogue(catalogueId, salesCatalogues = []) {
    return (salesCatalogues || []).find(catalogue => catalogue.id === catalogueId) || null;
}

function resolveSeasonName(seasonId, seasons = []) {
    return (seasons || []).find(season => season.id === seasonId)?.seasonName || "-";
}

export function validateLeadPayload(payload, salesCatalogues = [], seasons = []) {
    const docId = normalizeText(payload.docId);
    const customerName = normalizeText(payload.customerName);
    const customerPhone = normalizeText(payload.customerPhone);
    const customerEmail = normalizeText(payload.customerEmail);
    const customerAddress = normalizeText(payload.customerAddress);
    const assignedTo = normalizeText(payload.assignedTo);
    const catalogueId = normalizeText(payload.catalogueId);
    const leadSource = LEAD_SOURCES.includes(normalizeText(payload.leadSource))
        ? normalizeText(payload.leadSource)
        : "";
    const leadStatus = LEAD_STATUSES.includes(normalizeText(payload.leadStatus))
        ? normalizeText(payload.leadStatus)
        : "New";
    const leadNotes = normalizeText(payload.leadNotes);
    const enquiryDate = parseRequiredDate(payload.enquiryDate, "Enquiry date");
    const expectedDeliveryDate = parseOptionalDate(payload.expectedDeliveryDate, "Expected delivery date");
    const requestedProducts = normalizeRequestedProducts(payload.requestedProducts);

    if (!customerName) {
        throw new Error("Customer name is required.");
    }

    if (!customerPhone && !customerEmail) {
        throw new Error("Provide at least a phone number or email address.");
    }

    if (!catalogueId) {
        throw new Error("Select a sales catalogue for this enquiry.");
    }

    if (!leadSource) {
        throw new Error("Lead source is required.");
    }

    if (expectedDeliveryDate && expectedDeliveryDate.getTime() < enquiryDate.getTime()) {
        throw new Error("Expected delivery date cannot be earlier than the enquiry date.");
    }

    if (requestedProducts.length === 0) {
        throw new Error("Add at least one requested product with quantity greater than zero.");
    }

    const catalogue = findCatalogue(catalogueId, salesCatalogues);
    if (!catalogue) {
        throw new Error("The selected sales catalogue could not be found.");
    }

    const metrics = buildRequestedMetrics(requestedProducts);

    return {
        docId,
        leadData: {
            customerName,
            customerPhone,
            customerEmail,
            customerAddress,
            assignedTo,
            catalogueId,
            catalogueName: catalogue.catalogueName || "-",
            seasonId: catalogue.seasonId || "",
            seasonName: resolveSeasonName(catalogue.seasonId, seasons),
            leadSource,
            leadStatus,
            leadNotes,
            enquiryDate,
            expectedDeliveryDate,
            requestedProducts,
            ...metrics
        }
    };
}

export async function saveLead(payload, user, salesCatalogues = [], seasons = []) {
    if (!user) {
        throw new Error("You must be logged in to save an enquiry.");
    }

    const { docId, leadData } = validateLeadPayload(payload, salesCatalogues, seasons);

    if (docId) {
        await updateLeadRecord(docId, leadData, user);
        return { mode: "update", leadData };
    }

    await createLeadRecord(leadData, user);
    return { mode: "create", leadData };
}

export async function saveLeadQuote(payload, lead, user, options = {}) {
    if (!user) {
        throw new Error("You must be logged in to save a quote.");
    }

    const { submitStatus = "Draft", sourceQuote = null, supersedeQuoteId = "" } = options;
    const { docId, quoteData } = buildLeadQuotePayload(payload, lead, user, { submitStatus, sourceQuote });
    const supersededQuoteId = normalizeText(supersedeQuoteId || quoteData.sourceQuoteId);
    const sourceQuoteLabel = normalizeText(sourceQuote?.businessQuoteId) || supersededQuoteId;
    const isRevisionCreate = !docId && Boolean(supersededQuoteId);
    const nextCustomerName = normalizeText(quoteData.customerSnapshot?.customerName);
    const nextCustomerPhone = normalizeText(quoteData.customerSnapshot?.customerPhone);
    const nextCustomerEmail = normalizeText(quoteData.customerSnapshot?.customerEmail);
    const nextCustomerAddress = normalizeText(quoteData.customerSnapshot?.customerAddress);
    const customerLabel = nextCustomerName || lead?.customerName || "the customer";
    const shouldSyncLeadCustomer = nextCustomerName !== normalizeText(lead?.customerName)
        || nextCustomerPhone !== normalizeText(lead?.customerPhone)
        || nextCustomerEmail !== normalizeText(lead?.customerEmail)
        || nextCustomerAddress !== normalizeText(lead?.customerAddress);
    const buildQuoteWorkLogEntry = () => {
        if (submitStatus === "Sent") {
            return {
                logType: "Quote Sent",
                notes: docId
                    ? `Quote ${payload.businessQuoteId || docId} was sent to ${customerLabel}.`
                    : (isRevisionCreate
                        ? `A revised quote for ${sourceQuoteLabel || "the previous version"} was sent to ${customerLabel}.`
                        : `A new quote was sent to ${customerLabel}.`)
            };
        }

        if (submitStatus === "Cancelled") {
            return {
                logType: "General Note",
                notes: docId
                    ? `Quote ${payload.businessQuoteId || docId} was saved with status Cancelled.`
                    : `A quote was saved with status Cancelled.`
            };
        }

        if (submitStatus === "Expired") {
            return {
                logType: "General Note",
                notes: docId
                    ? `Quote ${payload.businessQuoteId || docId} was saved with status Expired.`
                    : `A quote was saved with status Expired.`
            };
        }

        if (isRevisionCreate) {
            return {
                logType: "Quote Revised",
                notes: `Quote ${sourceQuoteLabel || "the previous version"} was revised and saved as a new draft version.`
            };
        }

        return null;
    };

    if (docId) {
        await updateLeadQuoteRecord(lead.id, docId, quoteData, user, {
            workLogEntry: buildQuoteWorkLogEntry()
        });

        if (shouldSyncLeadCustomer) {
            await updateLeadRecord(lead.id, {
                customerName: nextCustomerName,
                customerPhone: nextCustomerPhone,
                customerEmail: nextCustomerEmail,
                customerAddress: nextCustomerAddress
            }, user);
        }
        return { mode: "update", quoteId: docId, quoteData };
    }

    const createdQuote = await createLeadQuoteRecord(lead.id, quoteData, user, {
        supersedeQuoteId: supersededQuoteId,
        workLogEntry: buildQuoteWorkLogEntry()
    });

    if (shouldSyncLeadCustomer) {
        await updateLeadRecord(lead.id, {
            customerName: nextCustomerName,
            customerPhone: nextCustomerPhone,
            customerEmail: nextCustomerEmail,
            customerAddress: nextCustomerAddress
        }, user);
    }

    return { mode: "create", quoteId: createdQuote?.id || "", quoteData };
}

export async function acceptLeadQuote(lead, quote, acceptancePayload, user) {
    if (!user) {
        throw new Error("You must be logged in to accept a quote.");
    }

    if (!lead?.id || !quote?.id) {
        throw new Error("Lead and quote context are required before accepting.");
    }

    const acceptedByCustomerName = normalizeText(acceptancePayload.acceptedByCustomerName);
    const acceptedVia = normalizeText(acceptancePayload.acceptedVia);
    const acceptanceNotes = normalizeText(acceptancePayload.acceptanceNotes);

    if (!acceptedByCustomerName) {
        throw new Error("Accepted by is required before marking a quote as accepted.");
    }

    await updateLeadQuoteStatusRecord(lead.id, quote.id, {
        quoteStatus: "Accepted",
        acceptedOn: new Date(),
        acceptedByCustomerName,
        acceptedVia,
        acceptanceNotes
    }, user, {
        supersedeOtherAccepted: true,
        workLogEntry: {
            logType: "Quote Accepted",
            notes: `Quote ${quote.businessQuoteId || quote.id} was accepted by ${acceptedByCustomerName}${acceptedVia ? ` via ${acceptedVia}` : ""}.`
        }
    });
}

export async function rejectLeadQuote(lead, quote, reason, user) {
    if (!user) {
        throw new Error("You must be logged in to reject a quote.");
    }

    if (!lead?.id || !quote?.id) {
        throw new Error("Lead and quote context are required before rejecting.");
    }

    const rejectionReason = normalizeText(reason);

    await updateLeadQuoteStatusRecord(lead.id, quote.id, {
        quoteStatus: "Rejected",
        rejectedOn: new Date(),
        rejectionReason
    }, user, {
        workLogEntry: {
            logType: "General Note",
            notes: `Quote ${quote.businessQuoteId || quote.id} was marked rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`
        }
    });
}

export async function cancelLeadQuote(lead, quote, reason, user) {
    if (!user) {
        throw new Error("You must be logged in to cancel a quote.");
    }

    if (!lead?.id || !quote?.id) {
        throw new Error("Lead and quote context are required before cancelling.");
    }

    const cancellationReason = normalizeText(reason);

    await updateLeadQuoteStatusRecord(lead.id, quote.id, {
        quoteStatus: "Cancelled",
        cancelledOn: new Date(),
        cancellationReason
    }, user, {
        workLogEntry: {
            logType: "General Note",
            notes: `Quote ${quote.businessQuoteId || quote.id} was cancelled.${cancellationReason ? ` Reason: ${cancellationReason}` : ""}`
        }
    });
}

export async function deleteLead(lead) {
    const restriction = await getLeadDeleteRestriction(lead);

    if (restriction.isLocked) {
        throw new Error(restriction.message);
    }

    await deleteLeadRecord(lead.id);
}

export function validateLeadWorkLogPayload(payload) {
    const leadId = normalizeText(payload.leadId);
    const logType = LEAD_LOG_TYPES.includes(normalizeText(payload.logType))
        ? normalizeText(payload.logType)
        : "";
    const notes = normalizeText(payload.notes);

    if (!leadId) {
        throw new Error("Select a lead record first.");
    }

    if (!logType) {
        throw new Error("Select a valid work log type.");
    }

    if (!notes) {
        throw new Error("Work log notes are required.");
    }

    return { leadId, logData: { logType, notes } };
}

export async function saveLeadWorkLog(payload, user) {
    if (!user) {
        throw new Error("You must be logged in to add work log entries.");
    }

    const { leadId, logData } = validateLeadWorkLogPayload(payload);
    await addLeadWorkLogRecord(leadId, logData, user);
}

export async function buildLeadToRetailConversionDraft(lead, masterData = {}) {
    if (!lead?.id) {
        throw new Error("Lead record could not be found.");
    }

    const leadStatus = normalizeText(lead.leadStatus || "New");
    if (leadStatus === "Converted") {
        throw new Error("This lead is already converted.");
    }

    if (leadStatus === "Lost") {
        throw new Error("Lost leads cannot be converted to retail sales.");
    }

    const catalogueId = normalizeText(lead.catalogueId);
    if (!catalogueId) {
        throw new Error("This lead does not have a sales catalogue selected.");
    }

    const requestedProducts = normalizeRequestedProducts(lead.requestedProducts || []);
    if (!requestedProducts.length) {
        throw new Error("No requested products are available to convert.");
    }

    const catalogueItems = await fetchSalesCatalogueItems(catalogueId);
    const catalogueItemMap = new Map((catalogueItems || []).map(item => [item.productId, item]));
    const productMap = new Map((masterData.products || []).map(product => [product.id, product]));
    const catalogueHeaders = masterData.salesCatalogues || [];
    const selectedCatalogue = catalogueHeaders.find(catalogue => catalogue.id === catalogueId) || null;

    const warnings = [];
    const items = [];

    requestedProducts.forEach(requestedItem => {
        const productId = normalizeText(requestedItem.productId);
        if (!productId) return;

        const catalogueItem = catalogueItemMap.get(productId);
        if (!catalogueItem) {
            warnings.push(`${requestedItem.productName || productId}: not found in the selected sales catalogue.`);
            return;
        }

        const quantity = Math.max(0, Math.floor(Number(requestedItem.requestedQty) || 0));
        if (quantity <= 0) return;

        const product = productMap.get(productId) || null;
        const unitPrice = Number(catalogueItem.sellingPrice) || Number(requestedItem.sellingPrice) || 0;
        const previousPrice = Number(requestedItem.sellingPrice) || 0;

        if (previousPrice > 0 && Number(previousPrice.toFixed(2)) !== Number(unitPrice.toFixed(2))) {
            warnings.push(`${requestedItem.productName || productId}: price refreshed from ${previousPrice.toFixed(2)} to ${unitPrice.toFixed(2)}.`);
        }

        if (!product) {
            warnings.push(`${requestedItem.productName || productId}: product is not currently active in the product catalogue.`);
        } else {
            const currentStock = Number(product.inventoryCount) || 0;
            if (currentStock < quantity) {
                warnings.push(`${requestedItem.productName || productId}: requested ${quantity}, available stock is ${currentStock}.`);
            }
        }

        items.push({
            productId,
            productName: catalogueItem.productName || requestedItem.productName || product?.itemName || "Untitled Product",
            categoryId: catalogueItem.categoryId || product?.categoryId || "",
            categoryName: catalogueItem.categoryName || requestedItem.categoryName || "-",
            quantity,
            unitPrice,
            lineDiscountPercentage: 0,
            cgstPercentage: 0,
            sgstPercentage: 0
        });
    });

    if (!items.length) {
        throw new Error("No valid product lines could be prepared for this conversion.");
    }

    if (!selectedCatalogue) {
        warnings.push("The selected sales catalogue header could not be resolved. Review before saving.");
    } else if (!selectedCatalogue.isActive) {
        warnings.push("This sales catalogue is inactive. Activate it or choose another catalogue before saving.");
    }

    return {
        leadId: lead.id,
        businessLeadId: lead.businessLeadId || "",
        customerName: normalizeText(lead.customerName),
        customerPhone: normalizeText(lead.customerPhone),
        customerEmail: normalizeText(lead.customerEmail),
        customerAddress: normalizeText(lead.customerAddress),
        catalogueId,
        catalogueName: selectedCatalogue?.catalogueName || lead.catalogueName || "-",
        leadNotes: normalizeText(lead.leadNotes),
        items,
        warnings
    };
}

export async function getLeadQuote(leadId, quoteId) {
    return fetchLeadQuoteRecord(leadId, quoteId);
}
