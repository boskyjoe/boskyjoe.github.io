import { updateUserAccessRecord } from "./repository.js";

export const USER_ROLES = ["admin", "inventory_manager", "sales_staff", "finance", "team_lead", "guest"];

function normalizeText(value) {
    return (value || "").trim();
}

function normalizeRole(value) {
    const role = normalizeText(value);
    return USER_ROLES.includes(role) ? role : "guest";
}

function normalizeStatus(value) {
    if (typeof value === "boolean") return value;
    return normalizeText(value).toLowerCase() !== "inactive";
}

function getUserRecord(docId, existingUsers = []) {
    return (existingUsers || []).find(user => user.id === docId) || null;
}

function ensureAccessChangeIsSafe(docId, nextRole, nextIsActive, currentUser, existingUsers = []) {
    const selectedUser = getUserRecord(docId, existingUsers);

    if (!selectedUser) {
        throw new Error("User record could not be found.");
    }

    if (currentUser?.uid === selectedUser.id) {
        throw new Error("You cannot change your own access settings from this screen.");
    }

    const currentRole = normalizeRole(selectedUser.role);
    const currentIsActive = selectedUser.isActive !== false;
    const isRemovingAdminAccess = currentRole === "admin" && currentIsActive && (nextRole !== "admin" || !nextIsActive);

    if (isRemovingAdminAccess) {
        const otherActiveAdmins = (existingUsers || []).filter(user =>
            user.id !== docId
            && normalizeRole(user.role) === "admin"
            && user.isActive !== false
        );

        if (otherActiveAdmins.length === 0) {
            throw new Error("Moneta must always have at least one active admin user.");
        }
    }

    return selectedUser;
}

export function validateUserAccessPayload(payload, currentUser, existingUsers = []) {
    const docId = normalizeText(payload.docId);
    const role = normalizeRole(payload.role);
    const isActive = normalizeStatus(payload.isActive);

    if (!docId) {
        throw new Error("Select a user before saving access changes.");
    }

    if (!USER_ROLES.includes(role)) {
        throw new Error("Select a valid user role.");
    }

    const selectedUser = ensureAccessChangeIsSafe(docId, role, isActive, currentUser, existingUsers);

    return {
        docId,
        role,
        isActive,
        selectedUser
    };
}

export async function saveUserAccess(payload, currentUser, existingUsers = []) {
    if (!currentUser) {
        throw new Error("You must be logged in to update user access.");
    }

    const { docId, role, isActive, selectedUser } = validateUserAccessPayload(payload, currentUser, existingUsers);

    await updateUserAccessRecord(docId, { role, isActive }, currentUser);

    return {
        mode: "update",
        selectedUser,
        role,
        isActive
    };
}
