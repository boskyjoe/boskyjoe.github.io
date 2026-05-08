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

function buildCustomerProfile(profile = {}) {
    return {
        displayName: normalizeText(profile.displayName || profile.customerName || profile.name),
        primaryPhone: normalizeText(profile.primaryPhone || profile.customerPhone || profile.phone),
        primaryEmail: normalizeText(profile.primaryEmail || profile.customerEmail || profile.email),
        primaryAddress: normalizeText(profile.primaryAddress || profile.customerAddress || profile.address)
    };
}

export async function ensureCustomerMasterRecord(profile = {}, options = {}) {
    const customerProfile = buildCustomerProfile(profile);
    const existingCustomerId = normalizeText(options.existingCustomerId || profile.customerId);
    const sourceType = normalizeSourceType(options.sourceType) || "manual";
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
        const baseCustomerPatch = {
            displayName: customerProfile.displayName || normalizeText(existingCustomerData.displayName) || "Customer",
            primaryPhone: customerProfile.primaryPhone || normalizeText(existingCustomerData.primaryPhone),
            primaryEmail: customerProfile.primaryEmail || normalizeText(existingCustomerData.primaryEmail),
            primaryAddress: customerProfile.primaryAddress || normalizeText(existingCustomerData.primaryAddress),
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
