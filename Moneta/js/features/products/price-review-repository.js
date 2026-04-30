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

function buildReviewCode() {
    const year = new Date().getFullYear();
    return `PPR-${year}-${Date.now().toString().slice(-6)}`;
}

export async function createProductPriceChangeReviewRecord(reviewData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.productPriceChangeReviews).add({
        ...reviewData,
        reviewCode: reviewData.reviewCode || buildReviewCode(),
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function updateProductPriceChangeReviewRecord(docId, updatedData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.productPriceChangeReviews).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function getProductPriceChangeReviewRecord(docId) {
    if (!normalizeText(docId)) return null;

    const snapshot = await getDb().collection(COLLECTIONS.productPriceChangeReviews).doc(docId).get();
    if (!snapshot.exists) return null;
    return { id: snapshot.id, ...snapshot.data() };
}

export async function getSalesCatalogueItemsForProduct(productId, activeCatalogueIds = []) {
    const normalizedProductId = normalizeText(productId);
    if (!normalizedProductId) return [];

    const snapshot = await getDb()
        .collectionGroup("items")
        .where("productId", "==", normalizedProductId)
        .get();

    const allowedCatalogueIds = new Set((activeCatalogueIds || []).map(id => normalizeText(id)).filter(Boolean));

    return snapshot.docs
        .map(doc => {
            const parentCatalogueId = doc.ref.parent.parent?.id || "";
            return {
                id: doc.id,
                catalogueId: parentCatalogueId,
                ...doc.data()
            };
        })
        .filter(row => row.catalogueId && (!allowedCatalogueIds.size || allowedCatalogueIds.has(normalizeText(row.catalogueId))));
}
