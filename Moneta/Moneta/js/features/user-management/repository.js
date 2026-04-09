import { COLLECTIONS } from "../../config/collections.js";

function getDb() {
    return firebase.firestore();
}

function getNow() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

export function subscribeToUsers(onData, onError) {
    return getDb().collection(COLLECTIONS.users).onSnapshot(
        snapshot => {
            const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            onData(rows);
        },
        error => {
            onError?.(error);
        }
    );
}

export async function updateUserAccessRecord(docId, accessData, adminUser) {
    const now = getNow();

    return getDb().collection(COLLECTIONS.users).doc(docId).set({
        role: accessData.role,
        isActive: accessData.isActive,
        updatedBy: adminUser.email,
        updatedOn: now
    }, { merge: true });
}
