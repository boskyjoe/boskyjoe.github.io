import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
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

    return getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection("items")
        .add({
            ...itemData,
            catalogueId,
            audit: {
                createdBy: user.email,
                createdOn: now,
                updatedBy: user.email,
                updatedOn: now
            }
        });
}

export async function updateSalesCatalogueItem(catalogueId, itemId, updatedData, user) {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection("items")
        .doc(itemId)
        .update({
            ...updatedData,
            "audit.updatedBy": user.email,
            "audit.updatedOn": now
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
