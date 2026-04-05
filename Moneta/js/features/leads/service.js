import {
    createLeadRecord,
    deleteLeadRecord,
    getLeadDeleteRestriction,
    updateLeadRecord
} from "./repository.js";

export const LEAD_SOURCES = ["Walk-in", "Phone Call", "Website", "Referral", "Event", "Other"];
export const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Converted", "Lost"];

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
