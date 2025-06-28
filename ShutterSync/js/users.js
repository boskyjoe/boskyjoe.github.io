// js/users.js

// Ensure Grid.js is loaded for data grids
// <link href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" />
// <script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>

import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The UsersModule object handles all functionality related to user management (Admin only).
 */
export const UsersModule = {
    db: null,       // Firestore database instance
    auth: null,     // Firebase Auth instance
    unsubscribe: null, // To store the unsubscribe function for real-time listener
    currentUserIdToEdit: null, // Used for editing an existing user's role
    usersData: [], // Cache for users data
    grid: null, // Grid.js instance for the users table

    /**
     * Initializes the Users module. This function is called by main.js.
     * It's assumed that this `init` function will only be called if the user is an Admin.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils; // Make Utils available internally

        // Defensive check, though main.js should prevent non-admins from reaching here
        if (!this.Utils.isAdmin()) {
            this.Utils.showMessage('Access Denied: Only Admin users can manage users.', 'error');
            return;
        }

        console.log("Users module initialized.");
        this.renderUsersUI(); // Render the initial UI for users
        this.setupRealtimeListener(); // Set up real-time data listener
        this.attachEventListeners(); // Attach UI event listeners
    },

    /**
     * Renders the main UI for the Users module.
     * This includes the container for the data grid and the edit modal.
     */
    renderUsersUI: function() {
        const adminUsersContent = document.getElementById('admin-users-content');
        if (adminUsersContent) {
            adminUsersContent.innerHTML = `
                <!-- Grid.js CSS -->
                <link href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" />
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800">System Users</h3>
                        <!-- Add User button not strictly needed if users are created via Google sign-in.
                             Admins primarily modify roles or delete existing users.
                             If manual user creation is desired, it would involve Firebase Admin SDK or Cloud Functions.
                        -->
                        <p class="text-gray-600 text-sm">Manage user roles and accounts.</p>
                    </div>
                    <!-- Container for the User Data Grid -->
                    <div id="user-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                </div>

                <!-- User Edit Role Modal (initially hidden) -->
                <div id="user-role-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 class="text-2xl font-bold text-gray-800 mb-6">Edit User Role</h4>
                        <form id="user-role-form">
                            <div class="mb-4">
                                <label for="edit-user-email" class="block text-sm font-medium text-gray-700 mb-1">User Email</label>
                                <input type="text" id="edit-user-email" disabled
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100 cursor-not-allowed sm:text-sm">
                            </div>
                            <div class="mb-4">
                                <label for="edit-user-role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select id="edit-user-role" name="role"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    <option value="User">User</option>
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

                <!-- Grid.js JS -->
                <script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>
            `;
        }
    },

    /**
     * Sets up the real-time listener for the 'users_data' collection in Firestore.
     * Updates the Grid.js table whenever data changes.
     */
    setupRealtimeListener: function() {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        const q = query(collection(this.db, "users_data")); // No orderBy to avoid index issues

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const users = [];
            snapshot.forEach((doc) => {
                const userData = doc.data();
                users.push({ id: doc.id, ...userData });
            });
            // Sort in memory to avoid Firestore index requirements for orderBy()
            this.usersData = users.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
            console.log("Users data updated:", this.usersData);
            this.renderUserGrid(this.usersData);
        }, (error) => {
            this.Utils.handleError(error, "fetching users data");
        });
    },

    /**
     * Renders or updates the Grid.js table with the provided user data.
     * @param {Array<object>} users - An array of user objects.
     */
    renderUserGrid: function(users) {
        const gridContainer = document.getElementById('user-grid-container');
        if (!gridContainer) {
            console.error("User grid container not found.");
            return;
        }

        // Define columns for Grid.js
        const columns = [
            // { id: 'id', name: 'User ID' }, // You can show this for debugging if needed
            { id: 'displayName', name: 'Display Name', sort: true, formatter: (cell, row) => cell || row.cells[2].data }, // Fallback to email if no display name
            { id: 'email', name: 'Email', sort: true },
            { id: 'role', name: 'Role', sort: true },
            {
                name: 'Actions',
                formatter: (cell, row) => {
                    const userId = row.cells[0].data; // User ID is the first data in the row (even if hidden)
                    const userEmail = row.cells[1].data; // Email is the second data for confirmation

                    // Prevent admin from editing/deleting their own role if they are the last admin
                    // (More robust check would involve fetching all admins and checking count)
                    const isCurrentUser = userId === this.auth.currentUser.uid;

                    return gridjs.h('div', {
                        className: 'flex space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: `bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200 ${isCurrentUser && this.usersData.filter(u => u.role === 'Admin').length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`,
                            disabled: isCurrentUser && this.usersData.filter(u => u.role === 'Admin').length === 1,
                            onClick: () => this.editUserRole(userId)
                        }, 'Edit Role'),
                        gridjs.h('button', {
                            className: `bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200 ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`, // Prevent self-deletion
                            disabled: isCurrentUser,
                            onClick: () => this.deleteUser(userId, userEmail)
                        }, 'Delete User')
                    ]);
                }
            }
        ];

        if (typeof gridjs === 'undefined') {
            console.warn("Grid.js not loaded. Cannot render grid.");
            this.Utils.showMessage("Grid.js library not loaded. Please refresh the page.", "error");
            return;
        }

        if (this.grid) {
            this.grid.updateConfig({
                // Grid.js data needs to be an array of arrays or objects with matching keys.
                // We map to [id, displayName, email, role] to match column order for action button logic.
                data: users.map(u => [u.id, u.displayName, u.email, u.role])
            }).forceRender();
        } else {
            this.grid = new gridjs.Grid({
                columns: columns,
                data: users.map(u => [u.id, u.displayName, u.email, u.role]),
                sort: true,
                search: true,
                pagination: {
                    limit: 10
                },
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
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
     * Attaches event listeners for UI interactions (modal close, form submission).
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
     * @param {string} userId - The document ID of the user whose role is to be edited.
     */
    editUserRole: function(userId) {
        const userToEdit = this.usersData.find(u => u.id === userId);
        if (!userToEdit) {
            this.Utils.showMessage('User not found for editing.', 'error');
            return;
        }

        // Prevent admin from demoting themselves if they are the last admin
        if (userToEdit.id === this.auth.currentUser.uid && userToEdit.role === 'Admin' && this.usersData.filter(u => u.role === 'Admin').length === 1) {
            this.Utils.showMessage('You cannot demote yourself as you are the only Admin user.', 'warning');
            return;
        }

        this.currentUserIdToEdit = userId;
        document.getElementById('edit-user-email').value = userToEdit.email || userToEdit.displayName || '';
        document.getElementById('edit-user-role').value = userToEdit.role || 'User';

        const modal = document.getElementById('user-role-modal');
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
        }, { once: true });
    },

    /**
     * Saves the updated user role to Firestore.
     */
    saveUserRole: async function() {
        if (!this.currentUserIdToEdit) {
            this.Utils.showMessage('No user selected for role update.', 'error');
            return;
        }

        const newRole = document.getElementById('edit-user-role').value;

        // Find the user object to check current role
        const userBeingEdited = this.usersData.find(u => u.id === this.currentUserIdToEdit);

        // Prevent admin from demoting themselves if they are the last admin
        if (userBeingEdited && userBeingEdited.id === this.auth.currentUser.uid && userBeingEdited.role === 'Admin' && newRole !== 'Admin' && this.usersData.filter(u => u.role === 'Admin').length === 1) {
            this.Utils.showMessage('You cannot demote yourself as you are the only Admin user. Please create another Admin first.', 'warning');
            return;
        }

        try {
            await updateDoc(doc(this.db, "users_data", this.currentUserIdToEdit), {
                role: newRole,
                updatedAt: new Date()
            });
            this.Utils.showMessage('User role updated successfully!', 'success');
            this.closeUserRoleModal();
        } catch (error) {
            this.Utils.handleError(error, "updating user role");
        }
    },

    /**
     * Deletes a user's profile from Firestore after confirmation.
     * Note: This only deletes the `users_data` document. It does NOT delete the Firebase Authentication user.
     * Deleting the Auth user requires Firebase Admin SDK or Cloud Functions.
     * @param {string} userId - The document ID of the user to delete.
     * @param {string} userEmail - The email of the user for confirmation message.
     */
    deleteUser: async function(userId, userEmail) {
        // Prevent admin from deleting themselves
        if (userId === this.auth.currentUser.uid) {
            this.Utils.showMessage('You cannot delete your own user profile.', 'warning');
            return;
        }
        // Prevent admin from deleting the last admin account
        if (this.usersData.find(u => u.id === userId && u.role === 'Admin') && this.usersData.filter(u => u.role === 'Admin').length === 1) {
             this.Utils.showMessage('Cannot delete the last Admin user. Please ensure there is at least one other Admin account.', 'warning');
             return;
        }

        this.Utils.showMessage(`Are you sure you want to delete the profile for user "${userEmail}"? This action is irreversible for their profile data.`, 'warning', 0);

        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('.p-6');
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete';
            confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2';
            confirmBtn.onclick = async () => {
                try {
                    await deleteDoc(doc(this.db, "users_data", userId));
                    this.Utils.showMessage('User profile deleted successfully!', 'success');
                    messageModalContainer.remove();
                } catch (error) {
                    this.Utils.handleError(error, "deleting user profile");
                    messageModalContainer.remove();
                }
            };

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg mt-4';
            cancelBtn.onclick = () => {
                messageModalContainer.remove();
                this.Utils.showMessage('Deletion cancelled.', 'info');
            };

            const existingButtons = messageBox.querySelectorAll('button:not(.absolute.top-2)');
            existingButtons.forEach(btn => btn.remove());

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex justify-end pt-4 border-t border-gray-200 mt-4';
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            messageBox.appendChild(buttonContainer);
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
            this.grid.destroy(); // Destroy Grid.js instance
            this.grid = null;
        }
    }
};
