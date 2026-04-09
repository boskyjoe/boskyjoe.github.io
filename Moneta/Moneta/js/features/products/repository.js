import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
}

export async function createProductRecord(productData, user) {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return getDb().collection(COLLECTIONS.products).add({
        ...productData,
        itemId: `ITEM-${Date.now()}`,
        isActive: true,
        isReadyForSale: true,
        inventoryCount: Number(productData.inventoryCount) || 0,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updateDate: now
    });
}

export async function updateProductRecord(docId, updatedData, user) {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return getDb().collection(COLLECTIONS.products).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updateDate: now
    });
}

export async function setProductFieldStatus(docId, field, nextValue, user) {
    return updateProductRecord(docId, { [field]: nextValue }, user);
}
