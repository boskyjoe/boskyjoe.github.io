import { COLLECTIONS } from "../../config/collections.js";

const LEAD_ITEMS_SUBCOLLECTION = "items";
const LEAD_WORK_LOG_SUBCOLLECTION = "workLog";
const LEAD_QUOTES_SUBCOLLECTION = "quotes";

function getDb() {
    return firebase.firestore();
}

function getNow() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

function buildBusinessLeadId() {
    return `LEAD-${Date.now()}`;
}

function buildBusinessQuoteId() {
    return `QT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
}

function normalizeText(value) {
    return (value || "").trim();
}

function toNumber(value) {
    return Number(value) || 0;
}

function resolveQuoteSummary(rows = []) {
    const normalizedRows = [...(rows || [])].sort((left, right) => {
        const leftVersion = Number(left.versionNo) || 0;
        const rightVersion = Number(right.versionNo) || 0;
        return rightVersion - leftVersion;
    });
    const latestQuote = normalizedRows[0] || null;
    const acceptedQuote = normalizedRows.find(row => normalizeText(row.quoteStatus) === "Accepted") || null;

    return {
        quoteCount: normalizedRows.length,
        latestQuoteId: latestQuote?.id || "",
        latestQuoteNumber: latestQuote?.businessQuoteId || "",
        latestQuoteStatus: latestQuote?.quoteStatus || "",
        latestQuoteSentOn: latestQuote?.sentOn || null,
        acceptedQuoteId: acceptedQuote?.id || "",
        acceptedQuoteNumber: acceptedQuote?.businessQuoteId || "",
        acceptedQuoteOn: acceptedQuote?.acceptedOn || null,
        acceptedQuoteTotal: toNumber(acceptedQuote?.totals?.grandTotal)
    };
}

async function refreshLeadQuoteSummary(leadId) {
    if (!leadId) return;

    const quotesSnapshot = await getDb()
        .collection(COLLECTIONS.leads)
        .doc(leadId)
        .collection(LEAD_QUOTES_SUBCOLLECTION)
        .get();

    const rows = quotesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const summary = resolveQuoteSummary(rows);

    await getDb().collection(COLLECTIONS.leads).doc(leadId).update({
        quoteCount: summary.quoteCount,
        latestQuoteId: summary.latestQuoteId,
        latestQuoteNumber: summary.latestQuoteNumber,
        latestQuoteStatus: summary.latestQuoteStatus,
        latestQuoteSentOn: summary.latestQuoteSentOn,
        acceptedQuoteId: summary.acceptedQuoteId,
        acceptedQuoteNumber: summary.acceptedQuoteNumber,
        acceptedQuoteOn: summary.acceptedQuoteOn,
        acceptedQuoteTotal: summary.acceptedQuoteTotal,
        updatedOn: getNow()
    });

    return summary;
}

async function getNextQuoteVersion(leadId) {
    const snapshot = await getDb()
        .collection(COLLECTIONS.leads)
        .doc(leadId)
        .collection(LEAD_QUOTES_SUBCOLLECTION)
        .orderBy("versionNo", "desc")
        .limit(1)
        .get();

    if (snapshot.empty) return 1;
    return (Number(snapshot.docs[0]?.data()?.versionNo) || 0) + 1;
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

export function subscribeToLeadQuotes(leadId, onData, onError) {
    if (!leadId) return () => {};

    return getDb()
        .collection(COLLECTIONS.leads)
        .doc(leadId)
        .collection(LEAD_QUOTES_SUBCOLLECTION)
        .orderBy("versionNo", "desc")
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                onData(rows);
            },
            error => onError?.(error)
        );
}

export async function fetchLeadQuoteRecord(leadId, quoteId) {
    if (!leadId || !quoteId) return null;

    const snapshot = await getDb()
        .collection(COLLECTIONS.leads)
        .doc(leadId)
        .collection(LEAD_QUOTES_SUBCOLLECTION)
        .doc(quoteId)
        .get();

    if (!snapshot.exists) return null;
    return { id: snapshot.id, ...snapshot.data() };
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
        quoteCount: 0,
        latestQuoteId: "",
        latestQuoteNumber: "",
        latestQuoteStatus: "",
        latestQuoteSentOn: null,
        acceptedQuoteId: "",
        acceptedQuoteNumber: "",
        acceptedQuoteOn: null,
        acceptedQuoteTotal: 0,
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

export async function createLeadQuoteRecord(leadId, quoteData, user, options = {}) {
    if (!leadId) {
        throw new Error("Lead id is required before creating a quote.");
    }

    const { supersedeQuoteId = "", workLogEntry = null, supersedeOtherAccepted = false } = options;
    const db = getDb();
    const now = getNow();
    const versionNo = await getNextQuoteVersion(leadId);
    const leadRef = db.collection(COLLECTIONS.leads).doc(leadId);
    const quoteRef = leadRef.collection(LEAD_QUOTES_SUBCOLLECTION).doc();
    const batch = db.batch();

    if (supersedeQuoteId) {
        batch.update(leadRef.collection(LEAD_QUOTES_SUBCOLLECTION).doc(supersedeQuoteId), {
            quoteStatus: "Superseded",
            supersededOn: now,
            updatedBy: user.email,
            updatedOn: now
        });
    }

    if (supersedeOtherAccepted) {
        const snapshot = await leadRef.collection(LEAD_QUOTES_SUBCOLLECTION).get();
        snapshot.docs.forEach(doc => {
            if (doc.id === supersedeQuoteId) return;
            if (normalizeText(doc.data()?.quoteStatus) !== "Accepted") return;

            batch.update(doc.ref, {
                quoteStatus: "Superseded",
                supersededOn: now,
                updatedBy: user.email,
                updatedOn: now
            });
        });
    }

    batch.set(quoteRef, {
        ...quoteData,
        businessQuoteId: buildBusinessQuoteId(),
        versionNo,
        supersedesQuoteId: supersedeQuoteId || quoteData.supersedesQuoteId || "",
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });

    if (workLogEntry) {
        const workLogRef = leadRef.collection(LEAD_WORK_LOG_SUBCOLLECTION).doc();
        batch.set(workLogRef, {
            ...workLogEntry,
            logDate: now,
            loggedBy: user.email,
            createdBy: user.email,
            createdOn: now
        });
    }

    await batch.commit();
    await refreshLeadQuoteSummary(leadId);

    return {
        id: quoteRef.id,
        versionNo
    };
}

export async function updateLeadQuoteRecord(leadId, quoteId, quoteData, user, options = {}) {
    if (!leadId || !quoteId) {
        throw new Error("Lead id and quote id are required before updating a quote.");
    }

    const { workLogEntry = null, supersedeOtherAccepted = false } = options;
    const db = getDb();
    const now = getNow();
    const leadRef = db.collection(COLLECTIONS.leads).doc(leadId);
    const quoteRef = leadRef.collection(LEAD_QUOTES_SUBCOLLECTION).doc(quoteId);
    const batch = db.batch();

    if (supersedeOtherAccepted) {
        const snapshot = await leadRef.collection(LEAD_QUOTES_SUBCOLLECTION).get();
        snapshot.docs.forEach(doc => {
            if (doc.id === quoteId) return;
            if (normalizeText(doc.data()?.quoteStatus) !== "Accepted") return;

            batch.update(doc.ref, {
                quoteStatus: "Superseded",
                supersededOn: now,
                updatedBy: user.email,
                updatedOn: now
            });
        });
    }

    batch.update(quoteRef, {
        ...quoteData,
        updatedBy: user.email,
        updatedOn: now
    });

    if (workLogEntry) {
        const workLogRef = leadRef.collection(LEAD_WORK_LOG_SUBCOLLECTION).doc();
        batch.set(workLogRef, {
            ...workLogEntry,
            logDate: now,
            loggedBy: user.email,
            createdBy: user.email,
            createdOn: now
        });
    }

    await batch.commit();
    await refreshLeadQuoteSummary(leadId);
}

export async function updateLeadQuoteStatusRecord(leadId, quoteId, statusData, user, options = {}) {
    if (!leadId || !quoteId) {
        throw new Error("Lead id and quote id are required before updating quote status.");
    }

    const { workLogEntry = null, supersedeOtherAccepted = false } = options;
    const db = getDb();
    const now = getNow();
    const leadRef = db.collection(COLLECTIONS.leads).doc(leadId);
    const quotesRef = leadRef.collection(LEAD_QUOTES_SUBCOLLECTION);
    const batch = db.batch();

    if (supersedeOtherAccepted) {
        const snapshot = await quotesRef.get();
        snapshot.docs.forEach(doc => {
            if (doc.id === quoteId) return;
            if (normalizeText(doc.data()?.quoteStatus) !== "Accepted") return;

            batch.update(doc.ref, {
                quoteStatus: "Superseded",
                supersededOn: now,
                updatedBy: user.email,
                updatedOn: now
            });
        });
    }

    batch.update(quotesRef.doc(quoteId), {
        ...statusData,
        updatedBy: user.email,
        updatedOn: now
    });

    if (workLogEntry) {
        const workLogRef = leadRef.collection(LEAD_WORK_LOG_SUBCOLLECTION).doc();
        batch.set(workLogRef, {
            ...workLogEntry,
            logDate: now,
            loggedBy: user.email,
            createdBy: user.email,
            createdOn: now
        });
    }

    await batch.commit();
    await refreshLeadQuoteSummary(leadId);
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

    if ((Number(lead.quoteCount) || 0) > 0) {
        return {
            isLocked: true,
            message: "Leads with quote history cannot be deleted."
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
