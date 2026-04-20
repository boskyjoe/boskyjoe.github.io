import {
    createProductRecord,
    setProductFieldStatus,
    updateProductRecord
} from "./repository.js";

function normalizeText(value) {
    return (value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateSellingPrice(unitPrice, unitMarginPercentage) {
    const price = normalizeNumber(unitPrice);
    const margin = normalizeNumber(unitMarginPercentage);
    return Number((price * (1 + margin / 100)).toFixed(2));
}

export function validateProductPayload(payload) {
    const itemName = normalizeText(payload.itemName);
    const categoryId = normalizeText(payload.categoryId);
    const itemType = normalizeText(payload.itemType) || "Standard";
    const unitPrice = normalizeNumber(payload.unitPrice);
    const unitMarginPercentage = normalizeNumber(payload.unitMarginPercentage);
    const inventoryCount = normalizeNumber(payload.inventoryCount);
    const netWeightKg = normalizeNumber(payload.netWeightKg);

    if (!itemName) throw new Error("Product name is required.");
    if (!categoryId) throw new Error("Category is required.");
    if (unitPrice < 0) throw new Error("Unit price cannot be negative.");
    if (unitMarginPercentage < 0) throw new Error("Margin cannot be negative.");

    return {
        itemName,
        categoryId,
        itemType,
        unitPrice,
        unitMarginPercentage,
        sellingPrice: calculateSellingPrice(unitPrice, unitMarginPercentage),
        inventoryCount,
        netWeightKg
    };
}

export async function saveProduct(payload, user) {
    if (!user) {
        throw new Error("You must be logged in to save a product.");
    }

    const productData = validateProductPayload(payload);
    const docId = normalizeText(payload.docId);

    if (docId) {
        await updateProductRecord(docId, productData, user);
        return { mode: "update" };
    }

    await createProductRecord(productData, user);
    return { mode: "create" };
}

export async function toggleProductStatus(docId, field, nextValue, user) {
    if (!user) {
        throw new Error("You must be logged in to update product status.");
    }

    if (!docId) {
        throw new Error("Product record could not be found.");
    }

    await setProductFieldStatus(docId, field, nextValue, user);
}
