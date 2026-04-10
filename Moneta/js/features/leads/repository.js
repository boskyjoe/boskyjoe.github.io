import { COLLECTIONS } from "../../config/collections.js";

const LEAD_ITEMS_SUBCOLLECTION = "items";
const LEAD_WORK_LOG_SUBCOLLECTION = "workLog";

function getDb() {
    return firebase.firestore();
}

function getNow() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

function buildBusinessLeadId() {
    return `LEAD-${Date.now()}`;
}

async function queryHasMatch(query) {
    const snapshot = await query.limit(1).get();
    return !snapshot.empty;
}

export function subscribeToLeads(onData, onError) {
    return getDb().collection(COLLECTIONS.leads).onSnapshot(
        snapshot => {
            const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onData(rows);
        },
        error => {
            onError?.(error);
        }
    );
}

export function subscribeToLeadWorkLog(leadId, onData, onError) {
    if (!leadId) return () => {};

    return getDb()
        .collection(COLLECTIONS.leads)
        .doc(leadId)
        .collection(LEAD_WORK_LOG_SUBCOLLECTION)
        .orderBy("logDate", "desc")
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                onData(rows);
            },
            error => {
                onError?.(error);
            }
        );
}

export async function fetchSalesCatalogueItems(catalogueId) {
    if (!catalogueId) return [];

    const snapshot = await getDb()
        .collection(COLLECTIONS.salesCatalogues)
        .doc(catalogueId)
        .collection(LEAD_ITEMS_SUBCOLLECTION)
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createLeadRecord(leadData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.leads).add({
        ...leadData,
        businessLeadId: buildBusinessLeadId(),
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function addLeadWorkLogRecord(leadId, logData, user) {
    if (!leadId) {
        throw new Error("Lead id is required before adding a work log entry.");
    }

    const now = getNow();

    return getDb()
        .collection(COLLECTIONS.leads)
        .doc(leadId)
        .collection(LEAD_WORK_LOG_SUBCOLLECTION)
        .add({
            ...logData,
            logDate: now,
            loggedBy: user.email,
            createdBy: user.email,
            createdOn: now
        });
}

export async function updateLeadRecord(docId, leadData, user) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.leads).doc(docId).update({
        ...leadData,
        updatedBy: user.email,
        updatedOn: now
    });
}

export async function deleteLeadRecord(docId) {
    return getDb().collection(COLLECTIONS.leads).doc(docId).delete();
}

export async function getLeadDeleteRestriction(lead) {
    if (!lead?.id) {
        return { isLocked: true, message: "Lead record could not be found." };
    }

    if ((lead.leadStatus || "") === "Converted") {
        return {
            isLocked: true,
            message: "Converted leads cannot be deleted because they may already be linked to a sale."
        };
    }

    const linkedToSale = await queryHasMatch(
        getDb().collection(COLLECTIONS.salesInvoices).where("sourceLeadId", "==", lead.id)
    );

    if (linkedToSale) {
        return {
            isLocked: true,
            message: "This lead is already linked to a sale and cannot be deleted."
        };
    }

    return { isLocked: false };
}
