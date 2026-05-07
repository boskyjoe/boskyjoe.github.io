import { COLLECTIONS } from "../../config/collections.js";

const SALES_CATALOGUE_ITEMS_SUBCOLLECTION = "items";

function getDb() {
    return firebase.firestore();
}

function getNow() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

export function subscribeToPortalRequests(onData, onError) {
    return getDb()
        .collection(COLLECTIONS.portalOrderRequests)
        .orderBy("submittedAt", "desc")
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                onData(rows);
            },
            error => onError?.(error)
        );
}

export async function updatePortalRequestRecord(docId, patch, user) {
    if (!docId) {
        throw new Error("Portal request record was not found.");
    }

    return getDb()
        .collection(COLLECTIONS.portalOrderRequests)
        .doc(docId)
        .update({
            ...patch,
            updatedBy: user.email,
            updatedOn: getNow()
        });
}

export async function fetchSalesCatalogueItems(catalogueId) {
    if (!catalogueId) return [];

    const snapshot = await getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection(SALES_CATALOGUE_ITEMS_SUBCOLLECTION)
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
