import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
}

function sortRowsByDateDesc(rows = [], field) {
    return [...rows].sort((left, right) => {
        const leftDate = left?.[field]?.toDate ? left[field].toDate() : new Date(left?.[field] || 0);
        const rightDate = right?.[field]?.toDate ? right[field].toDate() : new Date(right?.[field] || 0);
        return rightDate.getTime() - leftDate.getTime();
    });
}

export function subscribeToCustomers(onData, onError) {
    return getDb()
        .collection(COLLECTIONS.customers)
        .orderBy("lastSeenAt", "desc")
        .onSnapshot(
            snapshot => {
                const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                onData(rows);
            },
            error => onError?.(error)
        );
}

export async function fetchCustomerProfileActivity(customerId) {
    if (!customerId) {
        return {
            leads: [],
            portalRequests: [],
            retailSales: []
        };
    }

    const db = getDb();
    const [leadsSnapshot, portalSnapshot, retailSnapshot] = await Promise.all([
        db.collection(COLLECTIONS.leads).where("customerId", "==", customerId).get(),
        db.collection(COLLECTIONS.portalOrderRequests).where("customerId", "==", customerId).get(),
        db.collection(COLLECTIONS.salesInvoices).where("customerId", "==", customerId).get()
    ]);

    return {
        leads: sortRowsByDateDesc(
            leadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            "enquiryDate"
        ),
        portalRequests: sortRowsByDateDesc(
            portalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            "submittedAt"
        ),
        retailSales: sortRowsByDateDesc(
            retailSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
            "saleDate"
        )
    };
}
