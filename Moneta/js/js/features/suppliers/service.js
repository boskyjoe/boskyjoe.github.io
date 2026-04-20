import {
    createSupplierRecord,
    setSupplierActiveStatus,
    updateSupplierRecord
} from "./repository.js";

function normalizeText(value) {
    return (value || "").trim();
}

export function validateSupplierPayload(payload) {
    const supplierName = normalizeText(payload.supplierName);
    const contactNo = normalizeText(payload.contactNo);
    const contactEmail = normalizeText(payload.contactEmail);
    const address = normalizeText(payload.address);
    const creditTerm = normalizeText(payload.creditTerm);

    if (!supplierName) {
        throw new Error("Supplier name is required.");
    }

    if (!contactNo) {
        throw new Error("Contact number is required.");
    }

    if (!contactEmail) {
        throw new Error("Contact email is required.");
    }

    if (!address) {
        throw new Error("Address is required.");
    }

    return {
        supplierName,
        contactNo,
        contactEmail,
        address,
        creditTerm
    };
}

export async function saveSupplier(payload, user) {
    if (!user) {
        throw new Error("You must be logged in to save a supplier.");
    }

    const supplierData = validateSupplierPayload(payload);
    const docId = normalizeText(payload.docId);

    if (docId) {
        await updateSupplierRecord(docId, supplierData, user);
        return { mode: "update" };
    }

    await createSupplierRecord(supplierData, user);
    return { mode: "create" };
}

export async function toggleSupplierStatus(docId, nextStatus, user) {
    if (!user) {
        throw new Error("You must be logged in to update supplier status.");
    }

    if (!docId) {
        throw new Error("Supplier record was not found.");
    }

    await setSupplierActiveStatus(docId, nextStatus, user);
    return nextStatus;
}
