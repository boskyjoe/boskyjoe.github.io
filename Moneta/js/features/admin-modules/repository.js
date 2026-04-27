import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
}

function getNow() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

function normalizeText(value) {
    return (value || "").trim();
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

function buildReorderPolicyCode() {
    return `ROP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
}

function buildPricingPolicyCode() {
    return `PPP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
}

function buildStoreConfigCode(storeName = "") {
    const normalized = normalizeText(storeName).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return normalized || `STORE_${Date.now()}`;
}

async function queryHasMatch(query) {
    const snapshot = await query.limit(1).get();
    return !snapshot.empty;
}

function isActivePaymentEntry(entry = {}) {
    if (entry.isReversalEntry) return false;

    const status = normalizeText(entry.status || entry.paymentStatus).toLowerCase();
    if (["voided", "reversal", "void reversal"].includes(status)) {
        return false;
    }

    const amount = Number(entry.amountApplied ?? entry.amountPaid ?? entry.amountReceived ?? entry.totalCollected ?? 0) || 0;
    return amount > 0;
}

async function queryHasActivePaymentModeUsage(collectionRef, modeName) {
    const pageSize = 25;
    let query = collectionRef.where("paymentMode", "==", modeName).limit(pageSize);

    while (true) {
        const snapshot = await query.get();
        if (snapshot.empty) return false;

        if (snapshot.docs.some(doc => isActivePaymentEntry(doc.data() || {}))) {
            return true;
        }

        if (snapshot.docs.length < pageSize) {
            return false;
        }

        query = collectionRef
            .where("paymentMode", "==", modeName)
            .startAfter(snapshot.docs[snapshot.docs.length - 1])
            .limit(pageSize);
    }
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
            message: "This category is linked to one or more products and cannot be edited or deactivated."
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
    const modeName = normalizeText(paymentModeName);
    if (!modeName) {
        return { isUsed: false };
    }

    const db = getDb();

    const hasActiveRetailPayment = await queryHasActivePaymentModeUsage(
        db.collection(COLLECTIONS.salesPaymentsLedger),
        modeName
    );
    if (hasActiveRetailPayment) {
        return {
            isUsed: true,
            message: "This payment mode has active retail payments and cannot be edited or deactivated."
        };
    }

    const hasActiveConsignmentPayment = await queryHasActivePaymentModeUsage(
        db.collection(COLLECTIONS.consignmentPaymentsLedger),
        modeName
    );
    if (hasActiveConsignmentPayment) {
        return {
            isUsed: true,
            message: "This payment mode has active consignment payments and cannot be edited or deactivated."
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
            message: "This season is linked to one or more sales catalogues and cannot be edited or deactivated."
        };
    }

    if (await queryHasMatch(db.collection(COLLECTIONS.salesInvoices).where("salesSeasonId", "==", seasonDocId))) {
        return {
            isUsed: true,
            message: "This season already has retail orders and cannot be edited or deactivated."
        };
    }

    return { isUsed: false };
}

export async function createReorderPolicyRecord(policyData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.reorderPolicies).add({
        ...policyData,
        policyCode: buildReorderPolicyCode(),
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function updateReorderPolicyRecord(docId, updatedData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.reorderPolicies).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function setReorderPolicyActiveStatus(docId, isActive, user) {
    return updateReorderPolicyRecord(docId, { isActive }, user);
}

export async function seedPricingPolicyRecords(policies = [], user) {
    const now = getNow();
    const batch = getDb().batch();

    (policies || []).forEach(policy => {
        const docId = normalizeText(policy.docId);
        if (!docId) return;

        const docRef = getDb().collection(COLLECTIONS.pricingPolicies).doc(docId);
        batch.set(docRef, {
            ...policy,
            policyCode: policy.policyCode || buildPricingPolicyCode(),
            createdBy: user.email,
            createdOn: now,
            updatedBy: user.email,
            updatedOn: now
        });
    });

    return batch.commit();
}

export async function updatePricingPolicyRecord(docId, updatedData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.pricingPolicies).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function seedStoreConfigRecords(storeConfigs = [], user) {
    const now = getNow();
    const batch = getDb().batch();

    (storeConfigs || []).forEach(config => {
        const docId = normalizeText(config.docId);
        if (!docId) return;

        const docRef = getDb().collection(COLLECTIONS.storeConfigs).doc(docId);
        batch.set(docRef, {
            ...config,
            storeConfigId: config.storeConfigId || buildStoreConfigCode(config.storeName),
            createdBy: user.email,
            createdOn: now,
            updatedBy: user.email,
            updatedOn: now
        });
    });

    return batch.commit();
}

export async function updateStoreConfigRecord(docId, updatedData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.storeConfigs).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now
    });
}
