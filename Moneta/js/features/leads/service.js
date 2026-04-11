import {
    addLeadWorkLogRecord,
    createLeadRecord,
    deleteLeadRecord,
    fetchSalesCatalogueItems,
    getLeadDeleteRestriction,
    updateLeadRecord
} from "./repository.js";

export const LEAD_SOURCES = ["Walk-in", "Phone Call", "Website", "Referral", "Event", "Other"];
export const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Converted", "Lost"];
export const LEAD_LOG_TYPES = ["Phone Call", "Email Sent", "Meeting", "Quote Sent", "General Note"];

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
