// js/users.js

import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The UsersModule object handles all functionality related to user management.
 * This module is primarily for Admin users to manage user roles and data.
 */
export const Users = {
    db: null,       // Firestore database instance
    auth: null,     // Firebase Auth instance
    Utils: null,    // Utility functions instance
    unsubscribe: null, // To store the unsubscribe function for real-time listener
    currentUserData: null, // Cache for the currently logged-in user's data (e.g., for role check)
    grid: null, // Grid.js instance for the user table

    /**
     * Initializes the Users module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;

        console.log("Users module initialized.");

        // Ensure current user data (including role) is loaded
        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.loadCurrentUserData(user.uid);
            } else {
                this.currentUserData = null;
                this.renderUsersUI(); // Render UI, possibly restricted
                this.setupRealtimeListener(); // Set up listener (which will handle permissions)
            }
        });

        this.renderUsersUI(); // Initial UI render, might be empty until admin status is known
        this.setupRealtimeListener(); // Set up real-time data listener for users
        this.attachEventListeners(); // Attach UI event listeners
    },

    /**
     * Loads the current logged-in user's data to determine their role.
     * @param {string} uid - The User ID.
     */
    loadCurrentUserData: async function(uid) {
        try {
            const userDocRef = doc(this.db, "users_data", uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                this.currentUserData = { id: userDocSnap.id, ...userDocSnap.data() };
                console.log("Current user data loaded:", this.currentUserData);
                this.renderUsersUI(); // Re-render UI after role is known
                this.setupRealtimeListener(); // Re-run listener setup to apply admin filter if needed
            } else {
                console.warn("User data not found for current user:", uid);
                this.currentUserData = null;
            }
        } catch (error) {
            this.Utils.handleError(error, "loading current user data");
            this.currentUserData = null;
        }
    },

    /**
     * Renders the main UI for the Users module.
     * Only displays content if the current user is an Admin.
     */
    renderUsersUI: function() {
        const usersModuleContent = document.getElementById('users-module-content');
        if (usersModuleContent) {
            if (this.Utils.isAdmin()) { // Check using the global Utils function now
                usersModuleContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800 mb-6">User Management</h3>
                        <p class="text-sm text-gray-600 mb-4">Manage user roles and access within the application. Only admins can modify user roles.</p>
                        <div id="user-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                    </div>

                    <!-- User Edit Role Modal (initially hidden) -->
                    <div id="user-role-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                        <div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                            <h4 id="user-role-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Edit User Role</h4>
                            <form id="user-role-form">
                                <div class="mb-4">
                                    <label for="user-display-name" class="block text-sm font-medium text-gray-700 mb-1">User</label>
                                    <input type="text" id="user-display-name" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed" readonly>
                                </div>
                                <div class="mb-4">
                                    <label for="user-role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                    <select id="user-role" name="role" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <option value="Standard">Standard</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <div class="flex justify-end space-x-3 mt-6">
                                    <button type="button" id="cancel-user-role-btn"
                                        class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                        Cancel
                                    </button>
                                    <button type="submit" id="save-user-role-btn"
                                        class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                        Save Role
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            } else {
                usersModuleContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-md text-center">
                        <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                        <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                    </div>
                `;
            }
        }
    },

    /**
     * Sets up the real-time listener for the 'users_data' collection.
     * Only runs if the current user is an Admin.
     */
    setupRealtimeListener: function() {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        // Only set up listener if current user is an admin
        if (this.Utils.isAdmin()) {
            const q = query(collection(this.db, "users_data"));

            this.unsubscribe = onSnapshot(q, (snapshot) => {
                const users = [];
                snapshot.forEach((userDoc) => {
                    users.push({ id: userDoc.id, ...userDoc.data() });
                });
                this.renderUsersGrid(users);
                console.log("Users data updated:", users);
            }, (error) => {
                this.Utils.handleError(error, "fetching users data");
            });
        } else {
            console.log("Not an admin, skipping users data listener setup.");
            this.renderUsersGrid([]); // Render an empty grid or clear existing if not admin
        }
    },

    /**
     * Renders or updates the Grid.js table with the provided user data.
     * @param {Array<object>} users - An array of user objects.
     */
    renderUsersGrid: function(users) {
        const gridContainer = document.getElementById('user-grid-container');
        if (!gridContainer) {
            console.error("User grid container not found or user is not admin.");
            return;
        }

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'displayName', name: 'Display Name', sort: true, width: 'auto' },
            { id: 'email', name: 'Email', sort: true, width: 'auto' },
            { id: 'role', name: 'Role', sort: true, width: '120px' },
            {
                name: 'Actions',
                width: '100px', // Adjusted width for icons
                formatter: (cell, row) => {
                    const userId = row.cells[0].data; // Get ID
                    const userDisplayName = row.cells[1].data; // Get Display Name
                    const userRole = row.cells[3].data; // Get Role for comparison

                    // Prevent editing/deleting your own role, or if not admin
                    // Also prevent non-admin from seeing edit/delete buttons
                    const isCurrentUser = this.auth.currentUser && userId === this.auth.currentUser.uid;
                    const canEdit = this.Utils.isAdmin() && !isCurrentUser; // Admins can't edit their own role via this UI

                    return gridjs.h('div', {
                        className: 'flex items-center justify-center space-x-2'
                    }, [
                        canEdit ? gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-yellow-100 hover:text-yellow-600 transition-colors duration-200',
                            title: 'Edit User Role',
                            onClick: () => this.openUserRoleModal(userId, userDisplayName, userRole)
                        }, gridjs.h('i', { className: 'fas fa-user-edit text-lg' })) : '', // User Edit Icon
                        // Delete action for users is complex and usually requires careful consideration
                        // Disabled for now, but if implemented, should also check `canEdit` and be super cautious.
                        // canEdit ? gridjs.h('button', { ... }, gridjs.h('i', { className: 'fas fa-trash-alt' })) : ''
                    ]);
                }
            }
        ];

        const mappedData = users.map(u => [
            u.id,
            u.displayName || u.email || 'N/A', // Fallback for display name
            u.email || 'N/A',
            u.role || 'Standard' // Default role if missing
        ]);

        if (this.grid) {
            this.grid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
            this.grid = new gridjs.Grid({
                columns: columns,
                data: mappedData,
                sort: true,
                search: true,
                pagination: {
                    limit: 10
                },
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-normal break-words',
                    td: 'px-6 py-4 text-sm text-gray-900 whitespace-normal break-words',
                    footer: 'flex items-center justify-between px-6 py-3',
                    paginationButton: 'px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100',
                    paginationButtonCurrent: 'bg-blue-600 text-white hover:bg-blue-700',
                    search: 'p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500',
                    container: 'shadow-md rounded-lg overflow-hidden'
                }
            }).render(gridContainer);
        }
    },

    /**
     * Attaches event listeners for UI interactions.
     */
    attachEventListeners: function() {
        const userRoleForm = document.getElementById('user-role-form');
        if (userRoleForm) {
            userRoleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUserRole();
            });
        }

        document.getElementById('cancel-user-role-btn').addEventListener('click', () => this.closeUserRoleModal());

        const userRoleModal = document.getElementById('user-role-modal');
        if (userRoleModal) {
            userRoleModal.addEventListener('click', (e) => {
                if (e.target === userRoleModal) {
                    this.closeUserRoleModal();
                }
            });
        }
    },

    /**
     * Opens the user role edit modal.
     * @param {string} userId - The ID of the user to edit.
     * @param {string} displayName - The display name of the user.
     * @param {string} currentRole - The current role of the user.
     */
    openUserRoleModal: function(userId, displayName, currentRole) {
        // Prevent opening if the user tries to edit their own role
        if (this.auth.currentUser && userId === this.auth.currentUser.uid) {
            this.Utils.showMessage("You cannot modify your own role through this interface.", "warning");
            return;
        }

        const modal = document.getElementById('user-role-modal');
        const title = document.getElementById('user-role-modal-title');
        const displayNameInput = document.getElementById('user-display-name');
        const roleSelect = document.getElementById('user-role');

        title.textContent = `Edit Role for ${displayName}`;
        displayNameInput.value = displayName;
        roleSelect.value = currentRole;

        // Store the userId in a data attribute or global variable for save operation
        modal.dataset.editingUserId = userId;

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('div').classList.remove('opacity-0', 'scale-95');
        }, 10);
    },

    /**
     * Closes the user role edit modal.
     */
    closeUserRoleModal: function() {
        const modal = document.getElementById('user-role-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => {
            modal.classList.add('hidden');
            modal.removeAttribute('dataset.editingUserId'); // Clean up
        }, { once: true });
    },

    /**
     * Saves the updated user role to Firestore.
     */
    saveUserRole: async function() {
        const modal = document.getElementById('user-role-modal');
        const userId = modal.dataset.editingUserId;
        const newRole = document.getElementById('user-role').value;

        if (!userId) {
            this.Utils.showMessage("Error: User ID not found for role update.", "error");
            return;
        }

        try {
            const userRef = doc(this.db, "users_data", userId);
            await updateDoc(userRef, {
                role: newRole,
                updatedAt: new Date()
            });
            this.Utils.showMessage('User role updated successfully!', 'success');
            this.closeUserRoleModal();
        } catch (error) {
            this.Utils.handleError(error, "saving user role");
        }
    },

    /**
     * Detaches the real-time listener when the module is no longer active.
     */
    destroy: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("Users module listener unsubscribed.");
        }
        if (this.grid) {
            this.grid.destroy();
            this.grid = null;
        }
    }
};
