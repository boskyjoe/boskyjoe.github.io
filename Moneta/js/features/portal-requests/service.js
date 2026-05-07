import { fetchSalesCatalogueItems, updatePortalRequestRecord } from "./repository.js";

export const PORTAL_REQUEST_STATUSES = ["new", "accepted", "rejected", "converted", "fulfilled", "cancelled"];
export const PORTAL_REQUEST_CONVERSION_STATUSES = ["not_converted", "prepared", "converted"];

const STATUS_LABELS = {
    new: "New",
    accepted: "Accepted",
    rejected: "Rejected",
    converted: "Converted",
    fulfilled: "Fulfilled",
    cancelled: "Cancelled"
};

const CONVERSION_STATUS_LABELS = {
    not_converted: "Not Converted",
    prepared: "Prepared",
    converted: "Converted"
};

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function parseItemsJson(itemsJson) {
    try {
        const parsed = JSON.parse(itemsJson || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function mapStatusValue(value, allowedValues, fallback) {
    const normalized = normalizeText(value)
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
    return allowedValues.includes(normalized) ? normalized : fallback;
}

export function normalizePortalRequestStatus(value) {
    return mapStatusValue(value, PORTAL_REQUEST_STATUSES, "new");
}

export function normalizePortalRequestConversionStatus(value) {
    return mapStatusValue(value, PORTAL_REQUEST_CONVERSION_STATUSES, "not_converted");
}

export function getPortalRequestStatusLabel(value) {
    return STATUS_LABELS[normalizePortalRequestStatus(value)] || STATUS_LABELS.new;
}

export function getPortalRequestConversionStatusLabel(value) {
    return CONVERSION_STATUS_LABELS[normalizePortalRequestConversionStatus(value)] || CONVERSION_STATUS_LABELS.not_converted;
}

export function getPortalRequestItems(request = {}) {
    if (Array.isArray(request.items) && request.items.length > 0) {
        return request.items;
    }

    return parseItemsJson(request.itemsJson);
}

export function getPortalRequestAddress(request = {}) {
    return [normalizeText(request.addressLine1), normalizeText(request.addressLine2)]
        .filter(Boolean)
        .join(", ");
}

export function getPortalRequestRequestId(request = {}) {
    return normalizeText(request.requestId) || normalizeText(request.id);
}

export function canPreparePortalRequestForRetail(request = {}) {
    const status = normalizePortalRequestStatus(request.status);
    const conversionStatus = normalizePortalRequestConversionStatus(request.conversionStatus);
    const items = getPortalRequestItems(request);
    const catalogueId = normalizeText(request.catalogueId);

    if (!items.length) {
        return {
            allowed: false,
            reason: "This portal request does not have any product lines to convert."
        };
    }

    if (!catalogueId) {
        return {
            allowed: false,
            reason: "This portal request does not have a sales catalogue linked."
        };
    }

    if (conversionStatus === "converted") {
        return {
            allowed: false,
            reason: "This portal request is already converted into a retail flow."
        };
    }

    if (status === "rejected" || status === "cancelled") {
        return {
            allowed: false,
            reason: `This portal request is ${getPortalRequestStatusLabel(status).toLowerCase()} and cannot be prepared for retail.`
        };
    }

    if (status === "fulfilled") {
        return {
            allowed: false,
            reason: "This portal request is already fulfilled."
        };
    }

    return { allowed: true, reason: "" };
}

export async function savePortalRequestReview(payload, currentRequest, user) {
    if (!user) {
        throw new Error("You must be logged in to update a portal request.");
    }

    if (!currentRequest?.id) {
        throw new Error("Portal request record could not be found.");
    }

    const status = normalizePortalRequestStatus(payload.status || currentRequest.status);
    const previousStatus = normalizePortalRequestStatus(currentRequest.status);
    const internalReviewNote = normalizeText(payload.internalReviewNote);
    const actionNote = normalizeText(payload.actionNote);

    if ((status === "rejected" || status === "cancelled") && !actionNote) {
        throw new Error("Decision note is required when rejecting or cancelling a portal request.");
    }

    const patch = {
        status,
        internalReviewNote,
        actionNote,
        lastReviewedBy: user.email,
        lastReviewedOn: new Date()
    };

    if (status !== previousStatus) {
        if (status === "accepted") {
            patch.acceptedBy = user.email;
            patch.acceptedOn = new Date();
        }

        if (status === "rejected") {
            patch.rejectedBy = user.email;
            patch.rejectedOn = new Date();
        }

        if (status === "fulfilled") {
            patch.fulfilledBy = user.email;
            patch.fulfilledOn = new Date();
        }

        if (status === "cancelled") {
            patch.cancelledBy = user.email;
            patch.cancelledOn = new Date();
        }
    }

    await updatePortalRequestRecord(currentRequest.id, patch, user);
    return {
        status,
        statusLabel: getPortalRequestStatusLabel(status)
    };
}

export async function markPortalRequestPreparedForRetail(request, user) {
    if (!user) {
        throw new Error("You must be logged in to prepare a portal request for retail.");
    }

    if (!request?.id) {
        throw new Error("Portal request record could not be found.");
    }

    const gate = canPreparePortalRequestForRetail(request);
    if (!gate.allowed) {
        throw new Error(gate.reason);
    }

    const nextStatus = normalizePortalRequestStatus(request.status) === "new" ? "accepted" : normalizePortalRequestStatus(request.status);

    await updatePortalRequestRecord(request.id, {
        status: nextStatus,
        conversionStatus: "prepared",
        preparedForRetailBy: user.email,
        preparedForRetailOn: new Date(),
        lastReviewedBy: user.email,
        lastReviewedOn: new Date()
    }, user);

    return {
        status: nextStatus,
        conversionStatus: "prepared"
    };
}

export async function buildPortalRequestToRetailConversionDraft(request, masterData = {}) {
    if (!request?.id) {
        throw new Error("Portal request record could not be found.");
    }

    const gate = canPreparePortalRequestForRetail(request);
    if (!gate.allowed) {
        throw new Error(gate.reason);
    }

    const catalogueId = normalizeText(request.catalogueId);
    const requestItems = getPortalRequestItems(request);
    const catalogueItems = await fetchSalesCatalogueItems(catalogueId);
    const catalogueByProductId = new Map((catalogueItems || []).map(item => [normalizeText(item.productId), item]));
    const catalogueByItemId = new Map((catalogueItems || []).map(item => [normalizeText(item.id), item]));
    const productMap = new Map((masterData.products || []).map(product => [normalizeText(product.id), product]));
    const catalogueHeaders = masterData.salesCatalogues || [];
    const selectedCatalogue = catalogueHeaders.find(catalogue => catalogue.id === catalogueId) || null;

    const warnings = [];
    const items = [];

    requestItems.forEach(requestItem => {
        const productId = normalizeText(requestItem.productId);
        const catalogueItemId = normalizeText(requestItem.catalogueItemId);
        const catalogueItem = catalogueByProductId.get(productId) || catalogueByItemId.get(catalogueItemId) || null;

        if (!catalogueItem) {
            warnings.push(`${requestItem.name || productId || catalogueItemId || "Item"}: not found in the linked sales catalogue.`);
            return;
        }

        const quantity = Math.max(0, Math.floor(normalizeNumber(requestItem.quantity)));
        if (quantity <= 0) return;

        const product = productMap.get(productId) || null;
        const currentPrice = roundCurrency(catalogueItem.sellingPrice || requestItem.price || 0);
        const requestedPrice = roundCurrency(requestItem.price || 0);

        if (requestedPrice > 0 && currentPrice !== requestedPrice) {
            warnings.push(`${requestItem.name || catalogueItem.productName || productId}: price refreshed from ${requestedPrice.toFixed(2)} to ${currentPrice.toFixed(2)}.`);
        }

        if (product) {
            const currentStock = normalizeNumber(product.inventoryCount);
            if (currentStock < quantity) {
                warnings.push(`${requestItem.name || catalogueItem.productName || productId}: requested ${quantity}, available stock is ${currentStock}.`);
            }
        } else {
            warnings.push(`${requestItem.name || catalogueItem.productName || productId}: product is not currently active in Product Catalogue.`);
        }

        items.push({
            productId: productId || normalizeText(catalogueItem.productId),
            productName: catalogueItem.productName || requestItem.name || "Untitled Product",
            categoryId: catalogueItem.categoryId || normalizeText(requestItem.categoryId),
            categoryName: catalogueItem.categoryName || normalizeText(requestItem.categoryName) || "-",
            quantity,
            unitPrice: currentPrice,
            lineDiscountPercentage: 0,
            cgstPercentage: 0,
            sgstPercentage: 0
        });
    });

    if (!items.length) {
        throw new Error("No valid product lines could be prepared for this portal request.");
    }

    if (!selectedCatalogue) {
        warnings.push("The linked sales catalogue header could not be resolved. Review before saving.");
    } else if (!selectedCatalogue.isActive) {
        warnings.push("The linked sales catalogue is inactive. Activate it or choose another catalogue before saving.");
    }

    const pickupDate = normalizeText(request.pickupDate);
    const pickupTime = normalizeText(request.pickupTime);
    const pickupLocation = normalizeText(request.pickupLocation);
    const requestNotes = normalizeText(request.notes);
    const summaryNotes = [
        `Portal request ${getPortalRequestRequestId(request)}`,
        pickupDate || pickupTime ? `Requested pickup: ${[pickupDate, pickupTime].filter(Boolean).join(" ")}` : "",
        pickupLocation ? `Pickup location: ${pickupLocation}` : "",
        requestNotes ? `Customer notes: ${requestNotes}` : ""
    ].filter(Boolean).join("\n");

    return {
        sourceType: "portal-request",
        leadId: request.id,
        businessLeadId: getPortalRequestRequestId(request),
        customerName: normalizeText(request.customerName),
        customerPhone: normalizeText(request.customerPhone),
        customerEmail: normalizeText(request.customerEmail),
        customerAddress: getPortalRequestAddress(request),
        catalogueId,
        catalogueName: normalizeText(request.catalogueName) || selectedCatalogue?.catalogueName || "-",
        leadNotes: summaryNotes,
        items,
        warnings
    };
}
