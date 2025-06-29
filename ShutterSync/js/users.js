// js/users.js

import { collection, onSnapshot, doc, updateDoc, query, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The Users module handles user management, primarily for Admin roles.
 */
export const Users = {
    db: null,
    auth: null,
    Utils: null,
    unsubscribe: null, // Listener for user data
    currentEditingUserId: null, // For editing user roles
    usersGrid: null, // Grid.js instance for users

    /**
     * Initializes the Users module.
     * This method should only initialize core dependencies, not interact with the DOM yet.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("Users module initialized.");

        // Do NOT call renderUsersUI or attachEventListeners here.
        // They depend on the module's HTML being loaded into the DOM by Main.loadModule.
    },

    /**
     * Renders the main UI for the Users module.
     * This is called by Main.js when the 'users' module is activated.
     */
    renderUsersUI: function() {
        const usersModuleContent = document.getElementById('users-module-content');
        if (!usersModuleContent) {
            console.error("Users module content area not found in DOM.");
            return;
        }

        if (this.Utils.isAdmin()) {
            usersModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-6">User Management</h3>
                    <p class="text-sm text-gray-600 mb-4">View and manage user roles in your application.</p>
                    <div id="users-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                </div>

                <!-- User Role Modal -->
                <div id="user-role-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="user-role-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Edit User Role</h4>
                        <form id="user-role-form">
                            <div class="mb-4">
                                <label for="user-display-name-modal" class="block text-sm font-medium text-gray-700 mb-1">User</label>
                                <input type="text" id="user-display-name-modal" readonly
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-600 cursor-not-allowed sm:text-sm">
                            </div>
                            <div class="mb-4">
                                <label for="user-role-select" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select id="user-role-select" name="role" required
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
            // After rendering HTML, attach event listeners and setup the real-time listener
            this.attachEventListeners();
            this.setupRealtimeListener();
        } else {
            usersModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                    <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                </div>
            `;
            console.log("Not an admin, skipping user management UI.");
            this.renderUsersGrid([]); // Render an empty grid if not admin, or ensure no grid is rendered
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

        if (this.Utils.isAdmin()) {
            const q = query(collection(this.db, "users_data"));
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                const users = [];
                snapshot.forEach((doc) => {
                    users.push({ id: doc.id, ...doc.data() });
                });
                console.log("Users data updated:", users);
                this.renderUsersGrid(users);
            }, (error) => {
                this.Utils.handleError(error, "fetching users data");
            });
        } else {
            console.log("Not an admin, skipping users data listener setup.");
            this.renderUsersGrid([]); // Ensure grid is empty or not rendered for non-admins
        }
    },

    /**
     * Renders or updates the Grid.js table for Users.
     * @param {Array<object>} users - An array of user objects.
     */
    renderUsersGrid: function(users) {
        const gridContainer = document.getElementById('users-grid-container');
        if (!gridContainer) {
            console.error("User grid container not found or user is not admin.");
            return;
        }

        const columns = [
            { id: 'id', name: 'User ID', hidden: false, width: 'auto' }, // Keep ID visible for admin for clarity
            { id: 'displayName', name: 'Display Name', sort: true, width: 'auto' },
            { id: 'email', name: 'Email', sort: true, width: 'auto' },
            { id: 'role', name: 'Role', sort: true, width: '120px' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const userId = row.cells[0].data;
                    const userName = row.cells[1].data;
                    const userEmail = row.cells[2].data; // Get email to pass to modal
                    const userRole = row.cells[3].data;

                    // Prevent editing of own role
                    if (this.auth.currentUser && userId === this.auth.currentUser.uid) {
                        return gridjs.h('span', {
                            className: 'text-gray-500 text-sm italic'
                        }, ' (Your Account)');
                    }

                    return gridjs.h('div', {
                        className: 'flex items-center justify-center space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-yellow-100 hover:text-yellow-600 transition-colors duration-200',
                            title: 'Edit User Role',
                            onClick: () => this.openUserRoleModal(userId, userName, userEmail, userRole)
                        }, gridjs.h('i', { className: 'fas fa-user-tag text-lg' })) // Icon for user role
                    ]);
                }
            }
        ];

        const mappedData = users.map(u => [
            u.id,
            u.displayName || u.email || 'N/A',
            u.email || 'N/A',
            u.role || 'Standard'
        ]);

        if (this.usersGrid) {
            this.usersGrid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
            this.usersGrid = new gridjs.Grid({
                columns: columns,
                data: mappedData,
                sort: true,
                search: true,
                pagination: { limit: 5 }, // Smaller pagination for admin tables
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
     * Attaches event listeners for UI interactions within the Users module.
     * This is called AFTER the HTML is rendered.
     */
    attachEventListeners: function() {
        const userRoleForm = document.getElementById('user-role-form');
        if (userRoleForm) userRoleForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveUserRole(); });

        const cancelUserRoleBtn = document.getElementById('cancel-user-role-btn');
        if (cancelUserRoleBtn) cancelUserRoleBtn.addEventListener('click', () => this.closeUserRoleModal());

        const userRoleModal = document.getElementById('user-role-modal');
        if (userRoleModal) userRoleModal.addEventListener('click', (e) => { if (e.target === userRoleModal) this.closeUserRoleModal(); });
    },

    /**
     * Opens the user role edit modal.
     */
    openUserRoleModal: function(userId, displayName, email, role) {
        const modal = document.getElementById('user-role-modal');
        const title = document.getElementById('user-role-modal-title');
        const form = document.getElementById('user-role-form');

        form.reset();
        this.currentEditingUserId = userId; // Store the user ID

        title.textContent = 'Edit User Role';
        document.getElementById('user-display-name-modal').value = displayName || email || 'N/A';
        document.getElementById('user-role-select').value = role;

        modal.classList.remove('hidden');
        setTimeout(() => { modal.querySelector('div').classList.remove('opacity-0', 'scale-95'); }, 10);
    },

    /**
     * Closes the user role modal.
     */
    closeUserRoleModal: function() {
        const modal = document.getElementById('user-role-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => { modal.classList.add('hidden'); }, { once: true });
    },

    /**
     * Saves the updated user role to Firestore.
     */
    saveUserRole: async function() {
        if (!this.currentEditingUserId) {
            this.Utils.showMessage('No user selected for role update.', 'warning');
            return;
        }

        const newRole = document.getElementById('user-role-select').value;
        const userDocRef = doc(this.db, "users_data", this.currentEditingUserId);

        try {
            await this.Utils.updateDoc(userDocRef, { role: newRole, updatedAt: new Date() });
            this.Utils.showMessage(`User role updated to "${newRole}" successfully!`, 'success');
            this.closeUserRoleModal();
            // Important: If the current user's role was changed, update isAdmin status in Utils
            if (this.currentEditingUserId === this.auth.currentUser.uid) {
                this.Utils.updateAdminStatus(newRole); // Explicitly pass the new role
            }
        } catch (error) {
            this.Utils.handleError(error, "updating user role");
        }
    },

    /**
     * Detaches all real-time listeners and destroys Grid.js instances.
     */
    destroy: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("Users module listener unsubscribed.");
        }
        if (this.usersGrid) {
            this.usersGrid.destroy();
            this.usersGrid = null;
        }
        // Remove content from the DOM when destroying
        const usersModuleContent = document.getElementById('users-module-content');
        if (usersModuleContent) {
            usersModuleContent.innerHTML = '';
        }
    }
};
