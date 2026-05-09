import { COLLECTIONS } from "../config/collections.js";

function getDb() {
    return firebase.firestore();
}

function getFieldValue() {
    return firebase.firestore.FieldValue;
}

function getNow() {
    return getFieldValue().serverTimestamp();
}

function normalizeText(value) {
    return String(value || "").trim();
}

function normalizeSourceType(value) {
    return normalizeText(value).toLowerCase();
}

export function normalizeCustomerEmail(value) {
    return normalizeText(value).toLowerCase();
}

export function normalizeCustomerPhone(value) {
    const digitsOnly = normalizeText(value).replace(/\D+/g, "");
    return digitsOnly;
}

function buildIdentifierDocId(type, normalizedValue) {
    return `${type}__${encodeURIComponent(normalizedValue)}`;
}

function buildCustomerMasterId() {
    const stamp = Date.now();
    const suffix = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0");

    return `CUST-${stamp}-${suffix}`;
}

const MAX_CUSTOMER_ADDRESS_HISTORY_ENTRIES = 12;

function buildCustomerProfile(profile = {}) {
    return {
        displayName: normalizeText(profile.displayName || profile.customerName || profile.name),
        primaryPhone: normalizeText(profile.primaryPhone || profile.customerPhone || profile.phone),
        primaryEmail: normalizeText(profile.primaryEmail || profile.customerEmail || profile.email),
        primaryAddress: normalizeText(profile.primaryAddress || profile.customerAddress || profile.address)
    };
}

function normalizeCustomerAddressHistoryEntry(entry = {}) {
    return {
        address: normalizeText(entry.address),
        sourceType: normalizeText(entry.sourceType),
        sourceId: normalizeText(entry.sourceId),
        archivedOn: entry.archivedOn || null
    };
}

function normalizeCustomerAddressHistory(entries = []) {
    return Array.isArray(entries)
        ? entries
            .map(normalizeCustomerAddressHistoryEntry)
            .filter(entry => entry.address)
        : [];
}

function dedupeCustomerAddressHistory(entries = []) {
    const seenAddresses = new Set();

    return normalizeCustomerAddressHistory(entries)
        .filter(entry => {
            const normalizedAddress = entry.address.toLowerCase();
            if (seenAddresses.has(normalizedAddress)) return false;
            seenAddresses.add(normalizedAddress);
            return true;
        })
        .slice(0, MAX_CUSTOMER_ADDRESS_HISTORY_ENTRIES);
}

function buildCustomerAddressState(existingCustomerData = {}, incomingAddress = "", sourceType = "", sourceId = "") {
    const nextAddress = normalizeText(incomingAddress);
    const currentPrimaryAddress = normalizeText(existingCustomerData.primaryAddress);
    const currentPrimarySourceType = normalizeText(
        existingCustomerData.primaryAddressSourceType
        || existingCustomerData.lastActivitySource
        || existingCustomerData.firstSeenSource
    );
    const currentPrimarySourceId = normalizeText(existingCustomerData.primaryAddressSourceId);
    const existingHistory = normalizeCustomerAddressHistory(existingCustomerData.addressHistory);
    const now = new Date();

    if (!nextAddress) {
        return {
            primaryAddress: currentPrimaryAddress,
            primaryAddressSourceType: currentPrimarySourceType,
            primaryAddressSourceId: currentPrimarySourceId,
            primaryAddressUpdatedOn: existingCustomerData.primaryAddressUpdatedOn || null,
            addressHistory: existingHistory,
            persistAddressHistory: Array.isArray(existingCustomerData.addressHistory)
        };
    }

    if (!currentPrimaryAddress) {
        return {
            primaryAddress: nextAddress,
            primaryAddressSourceType: sourceType,
            primaryAddressSourceId: sourceId,
            primaryAddressUpdatedOn: now,
            addressHistory: existingHistory.filter(entry => entry.address.toLowerCase() !== nextAddress.toLowerCase()),
            persistAddressHistory: Array.isArray(existingCustomerData.addressHistory)
        };
    }

    if (nextAddress.toLowerCase() === currentPrimaryAddress.toLowerCase()) {
        return {
            primaryAddress: currentPrimaryAddress,
            primaryAddressSourceType: sourceType || currentPrimarySourceType,
            primaryAddressSourceId: sourceId || currentPrimarySourceId,
            primaryAddressUpdatedOn: now,
            addressHistory: existingHistory.filter(entry => entry.address.toLowerCase() !== currentPrimaryAddress.toLowerCase()),
            persistAddressHistory: true
        };
    }

    const filteredHistory = existingHistory.filter(entry => {
        const normalizedAddress = entry.address.toLowerCase();
        return normalizedAddress !== currentPrimaryAddress.toLowerCase()
            && normalizedAddress !== nextAddress.toLowerCase();
    });

    filteredHistory.unshift({
        address: currentPrimaryAddress,
        sourceType: currentPrimarySourceType,
        sourceId: currentPrimarySourceId,
        archivedOn: now
    });

    return {
        primaryAddress: nextAddress,
        primaryAddressSourceType: sourceType,
        primaryAddressSourceId: sourceId,
        primaryAddressUpdatedOn: now,
        addressHistory: dedupeCustomerAddressHistory(filteredHistory),
        persistAddressHistory: true
    };
}

export async function ensureCustomerMasterRecord(profile = {}, options = {}) {
    const customerProfile = buildCustomerProfile(profile);
    const existingCustomerId = normalizeText(options.existingCustomerId || profile.customerId);
    const sourceType = normalizeSourceType(options.sourceType) || "manual";
    const sourceId = normalizeText(options.sourceId || profile.sourceId);
    const userEmail = normalizeText(options.userEmail || options.updatedBy || options.createdBy);
    const activityDate = options.activityDate || null;
    const normalizedPhone = normalizeCustomerPhone(customerProfile.primaryPhone);
    const normalizedEmail = normalizeCustomerEmail(customerProfile.primaryEmail);
    const db = getDb();
    const fieldValue = getFieldValue();
    const customersCollection = db.collection(COLLECTIONS.customers);
    const existingCustomerRef = existingCustomerId
        ? customersCollection.doc(existingCustomerId)
        : null;
    const phoneIdentifierRef = normalizedPhone
        ? db.collection(COLLECTIONS.customerIdentifiers).doc(buildIdentifierDocId("phone", normalizedPhone))
        : null;
    const emailIdentifierRef = normalizedEmail
        ? db.collection(COLLECTIONS.customerIdentifiers).doc(buildIdentifierDocId("email", normalizedEmail))
        : null;

    return db.runTransaction(async transaction => {
        const [existingCustomerDoc, phoneIdentifierDoc, emailIdentifierDoc] = await Promise.all([
            existingCustomerRef ? transaction.get(existingCustomerRef) : Promise.resolve(null),
            phoneIdentifierRef ? transaction.get(phoneIdentifierRef) : Promise.resolve(null),
            emailIdentifierRef ? transaction.get(emailIdentifierRef) : Promise.resolve(null)
        ]);

        const matchedCustomerIds = new Set([
            existingCustomerId,
            phoneIdentifierDoc?.exists ? normalizeText(phoneIdentifierDoc.data()?.customerId) : "",
            emailIdentifierDoc?.exists ? normalizeText(emailIdentifierDoc.data()?.customerId) : ""
        ].filter(Boolean));

        if (matchedCustomerIds.size > 1) {
            throw new Error("This customer matches multiple customer master records. Standardize the phone/email before saving.");
        }

        const targetCustomerId = [...matchedCustomerIds][0] || buildCustomerMasterId();
        const targetCustomerRef = customersCollection.doc(targetCustomerId);
        const targetCustomerDoc = existingCustomerRef?.id === targetCustomerId
            ? existingCustomerDoc
            : await transaction.get(targetCustomerRef);
        const existingCustomerData = targetCustomerDoc?.exists ? (targetCustomerDoc.data() || {}) : {};
        const isNewCustomer = !targetCustomerDoc?.exists;
        const addressState = buildCustomerAddressState(
            existingCustomerData,
            customerProfile.primaryAddress,
            sourceType,
            sourceId
        );
        const baseCustomerPatch = {
            displayName: customerProfile.displayName || normalizeText(existingCustomerData.displayName) || "Customer",
            primaryPhone: customerProfile.primaryPhone || normalizeText(existingCustomerData.primaryPhone),
            primaryEmail: customerProfile.primaryEmail || normalizeText(existingCustomerData.primaryEmail),
            normalizedPrimaryPhone: normalizedPhone || normalizeText(existingCustomerData.normalizedPrimaryPhone),
            normalizedPrimaryEmail: normalizedEmail || normalizeText(existingCustomerData.normalizedPrimaryEmail),
            status: "active",
            lastSeenAt: getNow(),
            lastActivitySource: sourceType,
            updatedOn: getNow()
        };

        if (sourceType) {
            baseCustomerPatch.sourceChannels = fieldValue.arrayUnion(sourceType);
        }

        if (activityDate && sourceType === "retail-sale") {
            baseCustomerPatch.lastPurchaseOn = activityDate;
        }

        if (userEmail) {
            baseCustomerPatch.updatedBy = userEmail;
        }

        if (isNewCustomer) {
            baseCustomerPatch.firstSeenAt = getNow();
            baseCustomerPatch.firstSeenSource = sourceType;
            if (userEmail) {
                baseCustomerPatch.createdBy = userEmail;
            }
            baseCustomerPatch.createdOn = getNow();
        }

        if (addressState.primaryAddress) {
            baseCustomerPatch.primaryAddress = addressState.primaryAddress;
        }

        if (addressState.primaryAddressSourceType) {
            baseCustomerPatch.primaryAddressSourceType = addressState.primaryAddressSourceType;
        }

        if (addressState.primaryAddressSourceId) {
            baseCustomerPatch.primaryAddressSourceId = addressState.primaryAddressSourceId;
        }

        if (addressState.primaryAddressUpdatedOn) {
            baseCustomerPatch.primaryAddressUpdatedOn = addressState.primaryAddressUpdatedOn;
        }

        if (addressState.persistAddressHistory) {
            baseCustomerPatch.addressHistory = addressState.addressHistory;
        }

        transaction.set(targetCustomerRef, baseCustomerPatch, { merge: true });

        if (phoneIdentifierRef) {
            const phonePatch = {
                customerId: targetCustomerId,
                identifierType: "phone",
                rawValue: customerProfile.primaryPhone,
                normalizedValue: normalizedPhone,
                status: "active",
                lastSeenAt: getNow(),
                updatedOn: getNow()
            };

            if (userEmail) {
                phonePatch.updatedBy = userEmail;
            }

            if (!phoneIdentifierDoc?.exists) {
                phonePatch.createdOn = getNow();
                if (userEmail) {
                    phonePatch.createdBy = userEmail;
                }
            }

            transaction.set(phoneIdentifierRef, phonePatch, { merge: true });
        }

        if (emailIdentifierRef) {
            const emailPatch = {
                customerId: targetCustomerId,
                identifierType: "email",
                rawValue: customerProfile.primaryEmail,
                normalizedValue: normalizedEmail,
                status: "active",
                lastSeenAt: getNow(),
                updatedOn: getNow()
            };

            if (userEmail) {
                emailPatch.updatedBy = userEmail;
            }

            if (!emailIdentifierDoc?.exists) {
                emailPatch.createdOn = getNow();
                if (userEmail) {
                    emailPatch.createdBy = userEmail;
                }
            }

            transaction.set(emailIdentifierRef, emailPatch, { merge: true });
        }

        return {
            customerId: targetCustomerId,
            profile: {
                ...customerProfile,
                normalizedPhone,
                normalizedEmail
            }
        };
    });
}
