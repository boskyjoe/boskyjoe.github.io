import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
}

export async function createSupplierRecord(supplierData, user) {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return getDb().collection(COLLECTIONS.suppliers).add({
        ...supplierData,
        supplierId: `SUP-${Date.now()}`,
        isActive: true,
        hasActivePurchases: false,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function updateSupplierRecord(docId, supplierData, user) {
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return getDb().collection(COLLECTIONS.suppliers).doc(docId).update({
        ...supplierData,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function setSupplierActiveStatus(docId, isActive, user) {
    return updateSupplierRecord(docId, { isActive }, user);
}
