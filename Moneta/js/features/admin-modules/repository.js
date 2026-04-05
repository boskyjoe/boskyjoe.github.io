import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
}

function getNow() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

function buildCategoryCode() {
    return `CAT-${Date.now()}`;
}

function buildPaymentModeCode() {
    return `PM-${Date.now()}`;
}

function buildSeasonCode() {
    return `SEASON-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
}

async function queryHasMatch(query) {
    const snapshot = await query.limit(1).get();
    return !snapshot.empty;
}

export async function createCategoryRecord(categoryData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.categories).add({
        ...categoryData,
        categoryId: buildCategoryCode(),
        isActive: true,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function updateCategoryRecord(docId, updatedData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.categories).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function setCategoryActiveStatus(docId, isActive, user) {
    return updateCategoryRecord(docId, { isActive }, user);
}

export async function getCategoryUsageStatus(categoryDocId) {
    if (!categoryDocId) {
        return { isUsed: false };
    }

    const db = getDb();

    if (await queryHasMatch(db.collection(COLLECTIONS.products).where("categoryId", "==", categoryDocId))) {
        return {
            isUsed: true,
            message: "This category is already linked to products and can only be activated or deactivated."
        };
    }

    if (await queryHasMatch(db.collectionGroup("items").where("categoryId", "==", categoryDocId))) {
        return {
            isUsed: true,
            message: "This category is already present in catalogue or item history and can only be activated or deactivated."
        };
    }

    return { isUsed: false };
}

export async function createPaymentModeRecord(paymentModeData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.paymentModes).add({
        ...paymentModeData,
        paymentTypeId: buildPaymentModeCode(),
        isActive: true,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function updatePaymentModeRecord(docId, updatedData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.paymentModes).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function setPaymentModeActiveStatus(docId, isActive, user) {
    return updatePaymentModeRecord(docId, { isActive }, user);
}

export async function getPaymentModeUsageStatus(paymentModeName) {
    if (!paymentModeName) {
        return { isUsed: false };
    }

    const db = getDb();

    if (await queryHasMatch(db.collection(COLLECTIONS.supplierPaymentsLedger).where("paymentMode", "==", paymentModeName))) {
        return {
            isUsed: true,
            message: "This payment mode is already used in supplier payments and can only be activated or deactivated."
        };
    }

    if (await queryHasMatch(db.collection(COLLECTIONS.salesPaymentsLedger).where("paymentMode", "==", paymentModeName))) {
        return {
            isUsed: true,
            message: "This payment mode is already used in sales payments and can only be activated or deactivated."
        };
    }

    if (await queryHasMatch(db.collection(COLLECTIONS.consignmentPaymentsLedger).where("paymentMode", "==", paymentModeName))) {
        return {
            isUsed: true,
            message: "This payment mode is already used in consignment payments and can only be activated or deactivated."
        };
    }

    if (await queryHasMatch(db.collectionGroup("payments").where("paymentMode", "==", paymentModeName))) {
        return {
            isUsed: true,
            message: "This payment mode is already used in payment history and can only be activated or deactivated."
        };
    }

    return { isUsed: false };
}

export async function createSeasonRecord(seasonData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.seasons).add({
        ...seasonData,
        seasonId: buildSeasonCode(),
        isActive: true,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function updateSeasonRecord(docId, updatedData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.seasons).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function setSeasonActiveStatus(docId, isActive, user) {
    return updateSeasonRecord(docId, { isActive }, user);
}

export async function getSeasonUsageStatus(seasonDocId) {
    if (!seasonDocId) {
        return { isUsed: false };
    }

    const db = getDb();

    if (await queryHasMatch(db.collection(COLLECTIONS.salesCatalogues).where("seasonId", "==", seasonDocId))) {
        return {
            isUsed: true,
            message: "This season is already linked to a sales catalogue and can only be activated or deactivated."
        };
    }

    return { isUsed: false };
}
