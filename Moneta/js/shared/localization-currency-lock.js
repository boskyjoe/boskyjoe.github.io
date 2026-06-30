import { COLLECTIONS } from "../config/collections.js";
import { SYSTEM_SETTINGS_DOC_IDS } from "../config/system-settings-config.js";
import {
    buildLockedLocalizationSystemSettingRow,
    getLocalizationCurrencyControl
} from "./system-settings.js";

function getNow() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

function normalizeText(value) {
    return String(value || "").trim();
}

function getDbInstance(db = null) {
    return db || firebase.firestore();
}

function getLocalizationSettingsRef(db) {
    return db.collection(COLLECTIONS.systemSettings).doc(SYSTEM_SETTINGS_DOC_IDS.localization);
}

function buildCurrencyLockSeedRow() {
    return {
        docId: SYSTEM_SETTINGS_DOC_IDS.localization,
        localization: {}
    };
}

export async function applyLocalizationCurrencyLockInTransaction({
    db = null,
    transaction,
    userEmail = "",
    documentType = "",
    documentId = "",
    businessId = "",
    currencySnapshot = null,
    lockReason = "first-priced-document"
} = {}) {
    if (!transaction) {
        throw new Error("A Firestore transaction is required before applying the localization currency lock.");
    }

    const resolvedDb = getDbInstance(db);
    const now = getNow();
    const localizationRef = getLocalizationSettingsRef(resolvedDb);
    const localizationDoc = await transaction.get(localizationRef);
    const existingRow = localizationDoc.exists
        ? { id: localizationDoc.id, ...localizationDoc.data() }
        : buildCurrencyLockSeedRow();
    const currentCurrencyControl = getLocalizationCurrencyControl([existingRow]);

    if (currentCurrencyControl.isLocked) {
        return currentCurrencyControl;
    }

    const lockedRow = buildLockedLocalizationSystemSettingRow(existingRow, {
        lockedOn: now,
        lockedBy: normalizeText(userEmail),
        lockReason,
        firstDocumentType: normalizeText(documentType),
        firstDocumentId: normalizeText(documentId),
        firstBusinessId: normalizeText(businessId),
        currencySnapshot
    });

    if (localizationDoc.exists) {
        transaction.update(localizationRef, {
            localization: lockedRow.localization,
            updatedBy: normalizeText(userEmail),
            updatedOn: now
        });
    } else {
        transaction.set(localizationRef, {
            ...lockedRow,
            createdBy: normalizeText(userEmail),
            createdOn: now,
            updatedBy: normalizeText(userEmail),
            updatedOn: now
        });
    }

    return lockedRow.localization.currencyControl;
}

export async function ensureLocalizationCurrencyLock({
    db = null,
    userEmail = "",
    documentType = "",
    documentId = "",
    businessId = "",
    currencySnapshot = null,
    lockReason = "first-priced-document"
} = {}) {
    const resolvedDb = getDbInstance(db);

    return resolvedDb.runTransaction(async transaction => {
        return applyLocalizationCurrencyLockInTransaction({
            db: resolvedDb,
            transaction,
            userEmail,
            documentType,
            documentId,
            businessId,
            currencySnapshot,
            lockReason
        });
    });
}
