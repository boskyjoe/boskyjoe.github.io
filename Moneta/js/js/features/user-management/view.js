import { getState, subscribe } from "../../app/store.js";
import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import { initializeUsersGrid, refreshUsersGrid, updateUsersGridSearch } from "./grid.js";
import { subscribeToUsers } from "./repository.js";
import { saveUserAccess, USER_ROLES } from "./service.js";

const featureState = {
    searchTerm: "",
    users: [],
    editingUserId: null,
    unsubscribeUsers: null
};

function normalizeText(value) {
    return (value || "").trim();
}

function formatRoleLabel(value) {
    return (value || "guest")
        .split("_")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function getUserDisplayName(user) {
    return normalizeText(user?.displayName)
        || normalizeText(user?.email)
        || normalizeText(user?.UID)
        || "Unknown User";
}

function getEditingUser() {
    if (!featureState.editingUserId) return null;
    return featureState.users.find(user => user.id === featureState.editingUserId) || null;
}

function sortUsers(rows) {
    return (rows || []).slice().sort((left, right) => {
        const leftLabel = `${getUserDisplayName(left)} ${normalizeText(left.email)}`.toLowerCase();
        const rightLabel = `${getUserDisplayName(right)} ${normalizeText(right.email)}`.toLowerCase();
        return leftLabel.localeCompare(rightLabel);
    });
}

function buildGridRows(snapshot) {
    return sortUsers(featureState.users).map(user => ({
        ...user,
        displayNameResolved: getUserDisplayName(user),
        emailResolved: normalizeText(user.email) || "-",
        isCurrentSessionUser: user.id === snapshot.currentUser?.uid,
        isActive: user.isActive !== false
    }));
}

function renderRoleOptions(currentValue) {
    return USER_ROLES.map(role => `
        <option value="${role}" ${role === currentValue ? "selected" : ""}>
            ${formatRoleLabel(role)}
        </option>
    `).join("");
}

function renderAccessForm(snapshot) {
    const editingUser = getEditingUser();
    const totalUsers = featureState.users.length;
    const activeUsers = featureState.users.filter(user => user.isActive !== false).length;
    const isEditing = Boolean(editingUser);

    return `
        <div class="panel-card">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.users}</span>
                    <div>
                        <h2>${isEditing ? "Edit User Access" : "User Management"}</h2>
                        <p class="panel-copy">Manage roles and account access for existing Google sign-in users.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${totalUsers} users</span>
                    <span class="status-pill">${activeUsers} active</span>
                </div>
            </div>
            <div class="panel-body">
                <form id="user-access-form">
                    <input id="user-access-doc-id" type="hidden" value="${editingUser?.id || ""}">
                    <div class="form-grid">
                        <div class="field">
                            <label for="user-access-display-name">Display Name</label>
                            <input id="user-access-display-name" class="input" type="text" value="${editingUser ? getUserDisplayName(editingUser) : ""}" placeholder="Select a user from the grid" readonly>
                        </div>
                        <div class="field">
                            <label for="user-access-email">Email</label>
                            <input id="user-access-email" class="input" type="email" value="${editingUser?.email || ""}" placeholder="User email will appear here" readonly>
                        </div>
                        <div class="field">
                            <label for="user-access-uid">Firebase UID</label>
                            <input id="user-access-uid" class="input" type="text" value="${editingUser?.id || ""}" placeholder="User id" readonly>
                        </div>
                        <div class="field">
                            <label for="user-access-role">Role <span class="required-mark" aria-hidden="true">*</span></label>
                            <select id="user-access-role" class="select" ${isEditing ? "" : "disabled"}>
                                ${renderRoleOptions(editingUser?.role || "guest")}
                            </select>
                        </div>
                        <div class="field">
                            <label for="user-access-status">Account Status <span class="required-mark" aria-hidden="true">*</span></label>
                            <select id="user-access-status" class="select" ${isEditing ? "" : "disabled"}>
                                <option value="active" ${(editingUser?.isActive !== false) ? "selected" : ""}>Active</option>
                                <option value="inactive" ${editingUser?.isActive === false ? "selected" : ""}>Inactive</option>
                            </select>
                        </div>
                    </div>
                    <p class="user-access-note">
                        <strong>${isEditing ? "Access control is live." : "No user selected yet."}</strong>
                        ${isEditing
                            ? " Changes here update the shared users collection used by both TrinityCart and Moneta. Self-access changes are intentionally blocked for safety."
                            : " Click Edit on a user in the directory below to review their role and account status."}
                    </p>
                    <div class="form-actions">
                        ${isEditing ? `
                            <button id="user-access-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                            <button class="button button-primary-alt" type="submit">
                                <span class="button-icon">${icons.edit}</span>
                                Update Access
                            </button>
                        ` : ""}
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderGridCard() {
    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.users}</span>
                    <div>
                        <h3>User Directory</h3>
                        <p class="panel-copy">Review user access, open records for editing, and activate or deactivate accounts safely.</p>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Directory</p>
                        <p class="panel-copy">Search by user, email, role, or status.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="users-grid-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search users, email, role, or status"
                            value="${featureState.searchTerm}">
                    </div>
                </div>
                <div class="ag-shell">
                    <div id="users-grid" class="ag-theme-alpine moneta-grid" style="height: 600px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function detachUsersListener(options = {}) {
    const { clearRows = false } = options;

    featureState.unsubscribeUsers?.();
    featureState.unsubscribeUsers = null;

    if (clearRows) {
        featureState.users = [];
        featureState.editingUserId = null;
    }
}

function ensureUsersListener(snapshot) {
    const shouldListen = snapshot.currentRoute === "#/user-management" && snapshot.currentUser?.role === "admin";

    if (!shouldListen) {
        detachUsersListener();
        return;
    }

    if (featureState.unsubscribeUsers) return;

    featureState.unsubscribeUsers = subscribeToUsers(
        rows => {
            featureState.users = rows;

            if (featureState.editingUserId && !rows.some(user => user.id === featureState.editingUserId)) {
                featureState.editingUserId = null;
            }

            if (getState().currentRoute === "#/user-management") {
                renderUserManagementView();
            }
        },
        error => {
            console.error("[Moneta] Failed to load users:", error);
            showToast("Could not load the user directory.", "error", {
                title: "User Management"
            });
        }
    );
}

function syncUsersGrid(snapshot) {
    initializeUsersGrid(document.getElementById("users-grid"));
    refreshUsersGrid(buildGridRows(snapshot));
    updateUsersGridSearch(featureState.searchTerm);
}

export function renderUserManagementView() {
    const root = document.getElementById("user-management-root");
    if (!root) return;

    const snapshot = getState();
    root.innerHTML = `
        <div style="display:grid; gap:1rem;">
            ${renderAccessForm(snapshot)}
            ${renderGridCard()}
        </div>
    `;

    syncUsersGrid(snapshot);
}

function handleSearchInput(target) {
    featureState.searchTerm = target.value || "";
    updateUsersGridSearch(featureState.searchTerm);
}

function handleEditUser(button) {
    featureState.editingUserId = button.dataset.userId || null;
    renderUserManagementView();
    focusFormField({
        formId: "user-access-form",
        inputSelector: "#user-access-role"
    });
}

function handleCancelEdit() {
    featureState.editingUserId = null;
    renderUserManagementView();
}

async function handleUserAccessSubmit(event) {
    event.preventDefault();

    const snapshot = getState();
    const currentUser = snapshot.currentUser;
    const docId = document.getElementById("user-access-doc-id")?.value || "";
    const selectedUser = featureState.users.find(user => user.id === docId);

    if (!selectedUser) {
        showToast("Select a user before saving access changes.", "error", {
            title: "User Management"
        });
        return;
    }

    const nextRole = document.getElementById("user-access-role")?.value || selectedUser.role || "guest";
    const nextIsActive = (document.getElementById("user-access-status")?.value || "active") === "active";
    const currentRole = selectedUser.role || "guest";
    const currentIsActive = selectedUser.isActive !== false;
    const isDeactivating = selectedUser.isActive !== false && !nextIsActive;

    if (currentRole === nextRole && currentIsActive === nextIsActive) {
        showToast("No access changes to save.", "warning", {
            title: "User Management"
        });
        return;
    }

    if (isDeactivating) {
        const confirmed = await showConfirmationModal({
            title: "Deactivate User",
            message: `Deactivate ${getUserDisplayName(selectedUser)}?`,
            details: [
                { label: "User", value: getUserDisplayName(selectedUser) },
                { label: "Email", value: selectedUser.email || "-" },
                { label: "Requested Status", value: "Inactive" }
            ],
            note: "This user will no longer be able to access TrinityCart or Moneta until an admin activates the account again.",
            confirmText: "Deactivate",
            cancelText: "Cancel",
            tone: "danger"
        });

        if (!confirmed) return;
    }

    try {
        const result = await runProgressToastFlow({
            title: "Updating User Access",
            initialMessage: "Reading selected user access settings...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: "User Access Updated",
            successMessage: "The user's access settings were updated successfully."
        }, async ({ update }) => {
            update("Validating role, status, and admin safety rules...", 36, "Step 2 of 5");

            update("Writing access changes to the users collection...", 72, "Step 3 of 5");
            const result = await saveUserAccess({
                docId,
                role: nextRole,
                isActive: nextIsActive
            }, currentUser, featureState.users);

            update("Refreshing the user directory...", 88, "Step 4 of 5");
            featureState.editingUserId = null;
            renderUserManagementView();
            update("User access controls are up to date.", 96, "Step 5 of 5");
            return result;
        });

        showToast("User access updated.", "success", {
            title: "User Management"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "User Access Updated",
            message: "The user access record has been saved successfully.",
            details: [
                { label: "User", value: getUserDisplayName(selectedUser) },
                { label: "Email", value: selectedUser.email || "-" },
                { label: "Role", value: formatRoleLabel(result.role) },
                { label: "Status", value: result.isActive ? "Active" : "Inactive" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] User access update failed:", error);
    }
}

async function handleStatusToggle(button) {
    const userId = button.dataset.userId || null;
    const nextIsActive = button.dataset.nextStatus === "true";
    const selectedUser = featureState.users.find(user => user.id === userId);

    if (!selectedUser) {
        showToast("User record could not be found.", "error", {
            title: "User Management"
        });
        return;
    }

    const confirmed = await showConfirmationModal({
        title: `${nextIsActive ? "Activate" : "Deactivate"} User`,
        message: `${nextIsActive ? "Activate" : "Deactivate"} ${getUserDisplayName(selectedUser)}?`,
        details: [
            { label: "User", value: getUserDisplayName(selectedUser) },
            { label: "Email", value: selectedUser.email || "-" },
            { label: "Requested Status", value: nextIsActive ? "Active" : "Inactive" }
        ],
        note: nextIsActive
            ? "This user will regain access to the shared TrinityCart and Moneta workspace."
            : "This action removes the user's app access until an admin activates the account again.",
        confirmText: nextIsActive ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        tone: nextIsActive ? "warning" : "danger"
    });

    if (!confirmed) return;

    try {
        await runProgressToastFlow({
            title: `${nextIsActive ? "Activating" : "Deactivating"} User`,
            initialMessage: "Reading the selected user record...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: `User ${nextIsActive ? "Activated" : "Deactivated"}`,
            successMessage: `The user account was ${nextIsActive ? "activated" : "deactivated"} successfully.`
        }, async ({ update }) => {
            update("Validating role and admin safety rules...", 36, "Step 2 of 5");

            update("Writing user status to the database...", 72, "Step 3 of 5");
            await saveUserAccess({
                docId: userId,
                role: selectedUser.role || "guest",
                isActive: nextIsActive
            }, getState().currentUser, featureState.users);

            update("Refreshing the user directory...", 88, "Step 4 of 5");
            if (featureState.editingUserId === userId) {
                featureState.editingUserId = null;
            }
            renderUserManagementView();
            update("User directory status is up to date.", 96, "Step 5 of 5");
        });

        showToast(`User ${nextIsActive ? "activated" : "deactivated"}.`, "success", {
            title: "User Management"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: `User ${nextIsActive ? "Activated" : "Deactivated"}`,
            message: "The user account status was updated successfully.",
            details: [
                { label: "User", value: getUserDisplayName(selectedUser) },
                { label: "Email", value: selectedUser.email || "-" },
                { label: "Status", value: nextIsActive ? "Active" : "Inactive" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] User status update failed:", error);
    }
}

function bindUserManagementDomEvents() {
    const root = document.getElementById("user-management-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("input", event => {
        const searchInput = event.target.closest("#users-grid-search");
        if (searchInput) {
            handleSearchInput(searchInput);
        }
    });

    root.addEventListener("submit", event => {
        if (event.target.closest("#user-access-form")) {
            handleUserAccessSubmit(event);
        }
    });

    root.addEventListener("click", event => {
        const editButton = event.target.closest(".user-edit-button");
        const statusButton = event.target.closest(".user-status-button");
        const cancelButton = event.target.closest("#user-access-cancel-button");

        if (editButton) {
            handleEditUser(editButton);
            return;
        }

        if (statusButton) {
            handleStatusToggle(statusButton);
            return;
        }

        if (cancelButton) {
            handleCancelEdit();
        }
    });

    root.dataset.bound = "true";
}

export function initializeUserManagementFeature() {
    bindUserManagementDomEvents();

    subscribe(snapshot => {
        ensureUsersListener(snapshot);

        if (snapshot.currentRoute === "#/user-management") {
            renderUserManagementView();
        }
    });
}
