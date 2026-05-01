import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
}

function getCatalogueItemRef(catalogueId, itemId) {
    return getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection("items")
        .doc(itemId);
}

function buildCatalogueCode() {
    const year = new Date().getFullYear();
    return `SC-${year}-${Date.now().toString().slice(-6)}`;
}

export async function createSalesCatalogueRecord(catalogueData, itemsData, user) {
    const db = getDb();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();
    const catalogueRef = db.collection(COLLECTIONS.salesCatalogues).doc();

    batch.set(catalogueRef, {
        ...catalogueData,
        catalogueId: buildCatalogueCode(),
        isActive: true,
        audit: {
            createdBy: user.email,
            createdOn: now,
            updatedBy: user.email,
            updatedOn: now
        }
    });

    itemsData.forEach(item => {
        const itemRef = catalogueRef.collection("items").doc();
        batch.set(itemRef, {
            ...item,
            catalogueId: catalogueRef.id,
            audit: {
                createdBy: user.email,
                createdOn: now,
                updatedBy: user.email,
                updatedOn: now
            }
        });
        batch.set(itemRef.collection("priceHistory").doc(), {
            actionType: "catalogue-created",
            previousSellingPrice: null,
            nextSellingPrice: item.sellingPrice,
            previousCostPrice: null,
            nextCostPrice: item.costPrice,
            previousMarginPercentage: null,
            nextMarginPercentage: item.marginPercentage,
            sourceProductPriceVersion: item.sourceProductPriceVersion ?? 0,
            sourceProductSellingPrice: item.sourceProductSellingPrice ?? item.sellingPrice,
            sourceProductCostPrice: item.sourceProductCostPrice ?? item.costPrice,
            sourceProductMarginPercentage: item.sourceProductMarginPercentage ?? item.marginPercentage,
            note: "Initial catalogue item price snapshot.",
            changedBy: user.email,
            changedOn: now
        });
    });

    await batch.commit();
    return catalogueRef;
}

export async function updateSalesCatalogueRecord(docId, updatedData, user) {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return getDb().collection(COLLECTIONS.salesCatalogues).doc(docId).update({
        ...updatedData,
        "audit.updatedBy": user.email,
        "audit.updatedOn": now
    });
}

export async function setSalesCatalogueStatus(docId, isActive, user) {
    return updateSalesCatalogueRecord(docId, { isActive }, user);
}

export async function addSalesCatalogueItem(catalogueId, itemData, user) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const itemRef = getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection("items")
        .doc();
    const batch = getDb().batch();

    batch.set(itemRef, {
        ...itemData,
        catalogueId,
        audit: {
            createdBy: user.email,
            createdOn: now,
            updatedBy: user.email,
            updatedOn: now
        }
    });
    batch.set(itemRef.collection("priceHistory").doc(), {
        actionType: "item-added",
        previousSellingPrice: null,
        nextSellingPrice: itemData.sellingPrice,
        previousCostPrice: null,
        nextCostPrice: itemData.costPrice,
        previousMarginPercentage: null,
        nextMarginPercentage: itemData.marginPercentage,
        sourceProductPriceVersion: itemData.sourceProductPriceVersion ?? 0,
        sourceProductSellingPrice: itemData.sourceProductSellingPrice ?? itemData.sellingPrice,
        sourceProductCostPrice: itemData.sourceProductCostPrice ?? itemData.costPrice,
        sourceProductMarginPercentage: itemData.sourceProductMarginPercentage ?? itemData.marginPercentage,
        note: "Product added to live sales catalogue.",
        changedBy: user.email,
        changedOn: now
    });
    await batch.commit();
    return itemRef;
}

export async function updateSalesCatalogueItem(catalogueId, itemId, updatedData, user, historyEntry = null) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const itemRef = getCatalogueItemRef(catalogueId, itemId);
    const batch = getDb().batch();

    batch.update(itemRef, {
        ...updatedData,
        "audit.updatedBy": user.email,
        "audit.updatedOn": now
    });

    if (historyEntry) {
        batch.set(itemRef.collection("priceHistory").doc(), {
            ...historyEntry,
            changedBy: user.email,
            changedOn: now
        });
    }

    await batch.commit();
}

export async function updateSalesCatalogueItemsBatch(catalogueId, updates = [], user) {
    if (!catalogueId || !Array.isArray(updates) || updates.length === 0) {
        return;
    }

    const db = getDb();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    updates.forEach(({ itemId, updatedData }) => {
        if (!itemId || !updatedData) return;

        const docRef = db
            .collection(COLLECTIONS.salesCatalogues)
            .doc(catalogueId)
            .collection("items")
            .doc(itemId);
        const { historyEntry, ...itemUpdate } = updatedData;

        batch.update(docRef, {
            ...itemUpdate,
            "audit.updatedBy": user.email,
            "audit.updatedOn": now
        });

        if (historyEntry) {
            batch.set(docRef.collection("priceHistory").doc(), {
                ...historyEntry,
                changedBy: user.email,
                changedOn: now
            });
        }
    });

    await batch.commit();
}

export async function getSalesCatalogueItemPriceHistory(catalogueId, itemId) {
    const snapshot = await getCatalogueItemRef(catalogueId, itemId)
        .collection("priceHistory")
        .orderBy("changedOn", "desc")
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getSalesCatalogueItemsByProduct(productId, activeCatalogueIds = []) {
    const normalizedProductId = String(productId || "").trim();
    if (!normalizedProductId) return [];
    const catalogueIds = [...new Set((activeCatalogueIds || []).map(id => String(id || "").trim()).filter(Boolean))];
    if (!catalogueIds.length) return [];

    const snapshots = await Promise.all(
        catalogueIds.map(catalogueId => {
            return getDb()
                .collection(COLLECTIONS.salesCatalogues)
                .doc(catalogueId)
                .collection("items")
                .where("productId", "==", normalizedProductId)
                .get();
        })
    );

    return snapshots.flatMap((snapshot, index) => {
        const catalogueId = catalogueIds[index] || "";

        return snapshot.docs.map(doc => ({
            id: doc.id,
            catalogueId,
            ...doc.data()
        }));
    });
}

export async function deleteSalesCatalogueItem(catalogueId, itemId) {
    return getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection("items")
        .doc(itemId)
        .delete();
}

export function subscribeToSalesCatalogueItems(catalogueId, onValue, onError) {
    return getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection("items")
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((left, right) => (left.productName || "").localeCompare(right.productName || ""));

                onValue(rows);
            },
            error => onError?.(error)
        );
}
