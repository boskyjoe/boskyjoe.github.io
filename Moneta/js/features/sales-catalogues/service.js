import {
    addSalesCatalogueItem,
    createSalesCatalogueRecord,
    deleteSalesCatalogueItem,
    setSalesCatalogueStatus,
    updateSalesCatalogueItem,
    updateSalesCatalogueItemsBatch,
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

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function buildCatalogueItemFromProductSnapshot(product, categories = []) {
    const costPrice = roundCurrency(normalizeNumber(product.unitPrice, 0));
    const marginPercentage = normalizeNumber(product.unitMarginPercentage, 0);
    const sellingPrice = roundCurrency(normalizeNumber(product.sellingPrice, costPrice));
    const sourceProductPriceVersion = Math.max(0, normalizeNumber(product.pricingMeta?.priceVersion));

    return {
        productId: product.id,
        itemId: product.itemId || "",
        productName: product.itemName || "Untitled Product",
        categoryId: product.categoryId || "",
        categoryName: findCategoryName(product.categoryId, categories),
        inventoryCount: normalizeNumber(product.inventoryCount, 0),
        costPrice,
        marginPercentage,
        sellingPrice,
        sourceProductPriceVersion,
        sourceProductCostPrice: costPrice,
        sourceProductMarginPercentage: marginPercentage,
        sourceProductSellingPrice: sellingPrice,
        isOverridden: false
    };
}

export function buildSalesCatalogueItemFromProduct(product, categories = []) {
    if (!product?.id) {
        throw new Error("Product record could not be found.");
    }

    return {
        tempId: `draft-${product.id}`,
        ...buildCatalogueItemFromProductSnapshot(product, categories)
    };
}

function resolveProductForCatalogueItem(item, products = []) {
    return (products || []).find(product => product.id === item?.productId) || null;
}

function getSourceProductSnapshot(item = {}) {
    return {
        sourceProductPriceVersion: Math.max(0, normalizeNumber(item.sourceProductPriceVersion)),
        sourceProductCostPrice: roundCurrency(normalizeNumber(item.sourceProductCostPrice, item.costPrice)),
        sourceProductMarginPercentage: normalizeNumber(item.sourceProductMarginPercentage, item.marginPercentage),
        sourceProductSellingPrice: roundCurrency(normalizeNumber(item.sourceProductSellingPrice, item.sellingPrice))
    };
}

function buildPriceSyncState(item, product) {
    if (!product) {
        return {
            priceSyncState: "missing-product",
            priceSyncLabel: "Product Missing",
            canSync: false
        };
    }

    const currentCostPrice = roundCurrency(normalizeNumber(product.unitPrice, 0));
    const currentMarginPercentage = normalizeNumber(product.unitMarginPercentage, 0);
    const currentSellingPrice = roundCurrency(normalizeNumber(product.sellingPrice, currentCostPrice));
    const sourceSnapshot = getSourceProductSnapshot(item);
    const currentProductPriceVersion = Math.max(0, normalizeNumber(product.pricingMeta?.priceVersion));
    const productMoved = currentCostPrice !== sourceSnapshot.sourceProductCostPrice
        || currentMarginPercentage !== sourceSnapshot.sourceProductMarginPercentage
        || currentSellingPrice !== sourceSnapshot.sourceProductSellingPrice;
    const hasVersionDrift = currentProductPriceVersion > sourceSnapshot.sourceProductPriceVersion;

    if (Boolean(item.isOverridden)) {
        return {
            priceSyncState: hasVersionDrift ? "override-stale" : "override",
            priceSyncLabel: hasVersionDrift ? "Override + Product Changed" : "Manual Override",
            canSync: hasVersionDrift
        };
    }

    if (hasVersionDrift || (sourceSnapshot.sourceProductPriceVersion <= 0 && productMoved)) {
        return {
            priceSyncState: "stale",
            priceSyncLabel: "Product Price Changed",
            canSync: true
        };
    }

    return {
        priceSyncState: "in-sync",
        priceSyncLabel: "In Sync",
        canSync: false
    };
}

export function enrichSalesCatalogueItem(item, products = [], categories = []) {
    const product = resolveProductForCatalogueItem(item, products);
    const resolvedCategoryId = item.categoryId || product?.categoryId || "";
    const resolvedCategoryName = item.categoryName
        || findCategoryName(resolvedCategoryId, categories)
        || "-";
    const sourceSnapshot = getSourceProductSnapshot(item);
    const syncState = buildPriceSyncState({ ...item, ...sourceSnapshot }, product);

    return {
        ...item,
        categoryId: resolvedCategoryId,
        categoryName: resolvedCategoryName,
        currentProductCostPrice: roundCurrency(normalizeNumber(product?.unitPrice, sourceSnapshot.sourceProductCostPrice)),
        currentProductMarginPercentage: normalizeNumber(product?.unitMarginPercentage, sourceSnapshot.sourceProductMarginPercentage),
        currentProductSellingPrice: roundCurrency(normalizeNumber(product?.sellingPrice, sourceSnapshot.sourceProductSellingPrice)),
        currentProductPriceVersion: Math.max(0, normalizeNumber(product?.pricingMeta?.priceVersion)),
        ...sourceSnapshot,
        ...syncState
    };
}

export function countSyncableSalesCatalogueItems(items = [], products = [], categories = []) {
    return (items || [])
        .map(item => enrichSalesCatalogueItem(item, products, categories))
        .filter(item => item.canSync)
        .length;
}

function buildSyncedCatalogueItem(item, product, categories = []) {
    const snapshot = buildCatalogueItemFromProductSnapshot(product, categories);

    return {
        ...item,
        ...snapshot
    };
}

function buildSalesCataloguePriceHistoryEntry({
    actionType,
    note,
    previousItem = {},
    nextItem = {}
} = {}) {
    return {
        actionType: actionType || "price-change",
        previousSellingPrice: previousItem.sellingPrice ?? null,
        nextSellingPrice: nextItem.sellingPrice ?? null,
        previousCostPrice: previousItem.costPrice ?? null,
        nextCostPrice: nextItem.costPrice ?? null,
        previousMarginPercentage: previousItem.marginPercentage ?? null,
        nextMarginPercentage: nextItem.marginPercentage ?? null,
        sourceProductPriceVersion: nextItem.sourceProductPriceVersion ?? null,
        sourceProductSellingPrice: nextItem.sourceProductSellingPrice ?? nextItem.sellingPrice ?? null,
        sourceProductCostPrice: nextItem.sourceProductCostPrice ?? nextItem.costPrice ?? null,
        sourceProductMarginPercentage: nextItem.sourceProductMarginPercentage ?? nextItem.marginPercentage ?? null,
        note: note || ""
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
            sourceProductPriceVersion: normalizeNumber(item.sourceProductPriceVersion, 0),
            sourceProductCostPrice: normalizeNumber(item.sourceProductCostPrice, item.costPrice),
            sourceProductMarginPercentage: normalizeNumber(item.sourceProductMarginPercentage, item.marginPercentage),
            sourceProductSellingPrice: normalizeNumber(item.sourceProductSellingPrice, sellingPrice),
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

export async function updateSalesCatalogueItemPrice(catalogueId, itemId, sellingPrice, user, currentItem = null) {
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
    }, user, buildSalesCataloguePriceHistoryEntry({
        actionType: "manual-override",
        note: "Selling price updated manually from the catalogue worksheet.",
        previousItem: currentItem || {},
        nextItem: {
            ...(currentItem || {}),
            sellingPrice: normalizedPrice,
            isOverridden: true
        }
    }));
}

export async function syncSalesCatalogueItemToProduct(catalogueId, item, products = [], user, categories = []) {
    const product = resolveProductForCatalogueItem(item, products);

    if (!product) {
        throw new Error("The linked product could not be found.");
    }

    const syncedItem = buildSyncedCatalogueItem(item, product, categories);

    if (!catalogueId) {
        return syncedItem;
    }

    if (!user) {
        throw new Error("You must be logged in to sync catalogue pricing.");
    }

    await updateSalesCatalogueItem(catalogueId, item.id, {
        productName: syncedItem.productName,
        categoryId: syncedItem.categoryId,
        categoryName: syncedItem.categoryName,
        inventoryCount: syncedItem.inventoryCount,
        costPrice: syncedItem.costPrice,
        marginPercentage: syncedItem.marginPercentage,
        sellingPrice: syncedItem.sellingPrice,
        sourceProductPriceVersion: syncedItem.sourceProductPriceVersion,
        sourceProductCostPrice: syncedItem.sourceProductCostPrice,
        sourceProductMarginPercentage: syncedItem.sourceProductMarginPercentage,
        sourceProductSellingPrice: syncedItem.sourceProductSellingPrice,
        isOverridden: false
    }, user, buildSalesCataloguePriceHistoryEntry({
        actionType: "sync-to-product",
        note: "Catalogue item pricing synced to the current product master snapshot.",
        previousItem: item,
        nextItem: syncedItem
    }));

    return syncedItem;
}

export async function syncChangedSalesCatalogueItems(catalogueId, items = [], products = [], user, categories = []) {
    const syncableItems = (items || [])
        .map(item => enrichSalesCatalogueItem(item, products, categories))
        .filter(item => item.canSync);

    if (!syncableItems.length) {
        return { syncedCount: 0, syncedItems: [] };
    }

    const syncedItems = syncableItems.map(item => {
        const product = resolveProductForCatalogueItem(item, products);
        return buildSyncedCatalogueItem(item, product, categories);
    });

    if (!catalogueId) {
        return { syncedCount: syncedItems.length, syncedItems };
    }

    if (!user) {
        throw new Error("You must be logged in to sync catalogue pricing.");
    }

    await updateSalesCatalogueItemsBatch(
        catalogueId,
        syncedItems.map(item => ({
            itemId: item.id,
            updatedData: {
                productName: item.productName,
                categoryId: item.categoryId,
                categoryName: item.categoryName,
                inventoryCount: item.inventoryCount,
                costPrice: item.costPrice,
                marginPercentage: item.marginPercentage,
                sellingPrice: item.sellingPrice,
                sourceProductPriceVersion: item.sourceProductPriceVersion,
                sourceProductCostPrice: item.sourceProductCostPrice,
                sourceProductMarginPercentage: item.sourceProductMarginPercentage,
                sourceProductSellingPrice: item.sourceProductSellingPrice,
                isOverridden: false,
                historyEntry: buildSalesCataloguePriceHistoryEntry({
                    actionType: "sync-to-product",
                    note: "Catalogue item pricing synced to the current product master snapshot.",
                    previousItem: syncableItems.find(entry => entry.id === item.id),
                    nextItem: item
                })
            }
        })),
        user
    );

    return { syncedCount: syncedItems.length, syncedItems };
}

export async function removeSalesCatalogueItemRecord(catalogueId, itemId) {
    if (!catalogueId || !itemId) {
        throw new Error("Catalogue item could not be found.");
    }

    await deleteSalesCatalogueItem(catalogueId, itemId);
}
