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
