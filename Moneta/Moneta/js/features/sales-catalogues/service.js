import {
    addSalesCatalogueItem,
    createSalesCatalogueRecord,
    deleteSalesCatalogueItem,
    setSalesCatalogueStatus,
    updateSalesCatalogueItem,
    updateSalesCatalogueRecord
} from "./repository.js";

function normalizeText(value) {
    return (value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function findCategoryName(categoryId, categories = []) {
    return categories.find(category => category.id === categoryId)?.categoryName || "-";
}

export function buildSalesCatalogueItemFromProduct(product, categories = []) {
    if (!product?.id) {
        throw new Error("Product record could not be found.");
    }

    const costPrice = normalizeNumber(product.unitPrice, 0);
    const marginPercentage = normalizeNumber(product.unitMarginPercentage, 0);
    const sellingPrice = normalizeNumber(product.sellingPrice, costPrice);

    return {
        tempId: `draft-${product.id}`,
        productId: product.id,
        itemId: product.itemId || "",
        productName: product.itemName || "Untitled Product",
        categoryId: product.categoryId || "",
        categoryName: findCategoryName(product.categoryId, categories),
        inventoryCount: normalizeNumber(product.inventoryCount, 0),
        costPrice,
        marginPercentage,
        sellingPrice,
        isOverridden: false
    };
}

function validateCatalogueHeader(payload) {
    const catalogueName = normalizeText(payload.catalogueName);
    const seasonId = normalizeText(payload.seasonId);
    const seasonName = normalizeText(payload.seasonName);

    if (!catalogueName) {
        throw new Error("Catalogue name is required.");
    }

    if (!seasonId) {
        throw new Error("Sales season is required.");
    }

    if (!seasonName) {
        throw new Error("Sales season could not be resolved.");
    }

    return {
        catalogueName,
        seasonId,
        seasonName
    };
}

function validateCatalogueItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("Add at least one product to the catalogue before saving.");
    }

    return items.map(item => {
        const sellingPrice = normalizeNumber(item.sellingPrice, 0);

        if (sellingPrice <= 0) {
            throw new Error(`Selling price for ${item.productName || "a catalogue item"} must be greater than zero.`);
        }

        return {
            productId: item.productId,
            itemId: item.itemId || "",
            productName: item.productName,
            categoryId: item.categoryId || "",
            categoryName: item.categoryName || "",
            inventoryCount: normalizeNumber(item.inventoryCount, 0),
            costPrice: normalizeNumber(item.costPrice, 0),
            marginPercentage: normalizeNumber(item.marginPercentage, 0),
            sellingPrice,
            isOverridden: Boolean(item.isOverridden)
        };
    });
}

export async function saveSalesCatalogue(payload, user) {
    if (!user) {
        throw new Error("You must be logged in to save a sales catalogue.");
    }

    const docId = normalizeText(payload.docId);
    const catalogueData = validateCatalogueHeader(payload);

    if (docId) {
        await updateSalesCatalogueRecord(docId, catalogueData, user);
        return { mode: "update" };
    }

    const items = validateCatalogueItems(payload.items);
    await createSalesCatalogueRecord(catalogueData, items, user);
    return { mode: "create" };
}

export async function toggleSalesCatalogueStatus(docId, nextValue, user) {
    if (!user) {
        throw new Error("You must be logged in to update catalogue status.");
    }

    if (!docId) {
        throw new Error("Sales catalogue record could not be found.");
    }

    await setSalesCatalogueStatus(docId, nextValue, user);
}

export async function addProductToSalesCatalogue(catalogueId, product, existingItems, user, categories = []) {
    const isDuplicate = (existingItems || []).some(item => item.productId === product?.id);

    if (isDuplicate) {
        throw new Error(`${product?.itemName || "This product"} is already in the catalogue.`);
    }

    const itemData = buildSalesCatalogueItemFromProduct(product, categories);

    if (!catalogueId) {
        return itemData;
    }

    if (!user) {
        throw new Error("You must be logged in to add products to a catalogue.");
    }

    const { tempId, ...persistedItem } = itemData;
    await addSalesCatalogueItem(catalogueId, persistedItem, user);
    return persistedItem;
}

export async function updateSalesCatalogueItemPrice(catalogueId, itemId, sellingPrice, user) {
    if (!user) {
        throw new Error("You must be logged in to update catalogue pricing.");
    }

    const normalizedPrice = normalizeNumber(sellingPrice, NaN);

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
        throw new Error("Selling price must be greater than zero.");
    }

    await updateSalesCatalogueItem(catalogueId, itemId, {
        sellingPrice: normalizedPrice,
        isOverridden: true
    }, user);
}

export async function removeSalesCatalogueItemRecord(catalogueId, itemId) {
    if (!catalogueId || !itemId) {
        throw new Error("Catalogue item could not be found.");
    }

    await deleteSalesCatalogueItem(catalogueId, itemId);
}
