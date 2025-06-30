// js/utils.js

import { doc, getDoc, setDoc, updateDoc as firestoreUpdateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * The Utils module provides common utility functions used across the application,
 * such as message display, error handling, and Firebase interactions.
 */
export const Utils = {
    db: null, // Firestore DB instance
    auth: null, // Firebase Auth instance
    appId: null, // The application ID provided by the Canvas environment
    _isAdmin: false, // Internal flag for admin status
    adminStatusCallbacks: [], // Callbacks to run when admin status changes

    // NEW: Store references to modal elements once they are created
    _messageModal: {
        container: null,
        contentBox: null,
        title: null,
        text: null,
        closeBtn: null,
        buttonsContainer: null
    },

    /**
     * Initializes the Utils module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {string} appId - The application ID.
     */
    init: function(firestoreDb, firebaseAuth, appId) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.appId = appId;
        console.log("Utils module initialized with App ID:", this.appId);

        // Create the message modal container if it doesn't exist
        this.createMessageModal();
    },

    /**
     * Creates the hidden modal for displaying messages (success, error, warning).
     * This function is called once during Utils.init().
     */
    createMessageModal: function() {
        if (!document.getElementById('message-modal-container')) { // Only create if it doesn't exist
            const modalHtml = `
                <div id="message-modal-container" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[1000] hidden">
                    <div class="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                        <div class="flex justify-between items-center mb-4">
                            <h4 id="message-title" class="text-xl font-bold text-gray-800"></h4>
                            <button id="message-close-btn" class="text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
                        </div>
                        <p id="message-text" class="text-gray-700 mb-4"></p>
                        <div id="message-buttons" class="flex justify-end">
                            <!-- Buttons for confirmation dialogs will be appended here -->
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Store references to the elements, now guaranteed to exist
        this._messageModal.container = document.getElementById('message-modal-container');
        this._messageModal.contentBox = this._messageModal.container?.querySelector('div'); // The inner div
        this._messageModal.title = document.getElementById('message-title');
        this._messageModal.text = document.getElementById('message-text');
        this._messageModal.closeBtn = document.getElementById('message-close-btn');
        this._messageModal.buttonsContainer = document.getElementById('message-buttons');

        // Attach event listeners for the modal
        this._messageModal.closeBtn?.addEventListener('click', () => this.hideMessage());
        this._messageModal.container?.addEventListener('click', (e) => {
            if (e.target === this._messageModal.container) { // Only close if clicked outside the content box
                this.hideMessage();
            }
        });
    },

    /**
     * Displays a message in a central modal.
     * @param {string} message - The message text.
     * @param {string} type - 'success', 'error', 'warning', or 'info'.
     * @param {number} duration - Duration in milliseconds before auto-hiding. 0 for persistent (requires manual close).
     */
    showMessage: function(message, type = 'info', duration = 3000) {
        const { container, contentBox, title, text, closeBtn, buttonsContainer } = this._messageModal;

        // Basic check if all essential modal elements are referenced
        if (!container || !title || !text || !closeBtn || !buttonsContainer) {
            console.error("Message modal elements are not fully initialized. Cannot show message.");
            // Fallback to console log if modal can't be shown
            console.log(`Message (${type}): ${message}`);
            return;
        }

        title.className = 'text-xl font-bold'; // Reset classes
        switch (type) {
            case 'success':
                title.textContent = 'Success!';
                title.classList.add('text-green-700');
                break;
            case 'error':
                title.textContent = 'Error!';
                title.classList.add('text-red-700');
                break;
            case 'warning':
                title.textContent = 'Warning!';
                title.classList.add('text-yellow-700');
                break;
            case 'info':
            default:
                title.textContent = 'Information';
                title.classList.add('text-blue-700');
                break;
        }

        text.textContent = message;
        // Clear any previous custom buttons (like confirm/cancel)
        buttonsContainer.innerHTML = ''; // This clears the container, including any custom buttons

        if (duration === 0) {
            closeBtn.classList.remove('hidden'); // Ensure close button is visible for persistent messages
        } else {
            closeBtn.classList.add('hidden'); // Hide close button for auto-hiding messages
            setTimeout(() => {
                this.hideMessage();
            }, duration);
        }

        container.classList.remove('hidden');
        // Add a small delay before showing the transition for smooth animation
        setTimeout(() => {
            contentBox.classList.remove('opacity-0', 'scale-95');
        }, 10);
    },

    /**
     * Hides the message modal.
     */
    hideMessage: function() {
        const { container, contentBox } = this._messageModal;
        if (container && contentBox) {
            contentBox.classList.add('opacity-0', 'scale-95');
            container.addEventListener('transitionend', () => {
                container.classList.add('hidden');
            }, { once: true });
        }
    },

    /**
     * Handles common error scenarios and displays a user-friendly message.
     * @param {Error} error - The error object.
     * @param {string} context - A string describing where the error occurred (e.g., "login", "saving data").
     */
    handleError: function(error, context = "an operation") {
        console.error(`Error during ${context}:`, error);
        let errorMessage = `An unexpected error occurred during ${context}.`;

        // More specific error messages for Firebase Auth
        if (error.code) {
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email already in use. Please use a different email or log in.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = 'Email/password accounts are not enabled.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Please use a stronger password.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'Your account has been disabled.';
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = 'Invalid login credentials.';
                    break;
                case 'auth/popup-closed-by-user':
                    errorMessage = 'Login cancelled by user.';
                    break;
                case 'auth/cancelled-popup-request':
                    errorMessage = 'Another login request is already in progress.';
                    break;
                case 'permission-denied': // Firestore permission error
                    errorMessage = 'Permission denied. You may not have access to perform this action.';
                    break;
                case 'unavailable': // Firestore unavailable
                    errorMessage = 'Service is temporarily unavailable. Please try again later.';
                    break;
                default:
                    errorMessage = `An error occurred: ${error.message || error.code}.`;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }

        this.showMessage(errorMessage, 'error', 5000);
    },

    /**
     * Gets a Firestore document using the stored db instance.
     * Includes default error handling.
     * @param {DocumentReference} docRef - The Firestore document reference.
     * @returns {Promise<DocumentSnapshot>} A promise that resolves with the DocumentSnapshot.
     */
    getDoc: async function(docRef) {
        try {
            return await getDoc(docRef);
        } catch (error) {
            this.handleError(error, `getting document ${docRef.path}`);
            throw error; // Re-throw to allow calling context to handle if needed
        }
    },

    /**
     * Sets a Firestore document using the stored db instance.
     * Includes default error handling.
     * @param {DocumentReference} docRef - The Firestore document reference.
     * @param {object} data - The data to set.
     * @param {SetOptions} options - Options for the set operation (e.g., { merge: true }).
     * @returns {Promise<void>}
     */
    setDoc: async function(docRef, data, options = {}) {
        try {
            await setDoc(docRef, data, options);
        } catch (error) {
            this.handleError(error, `setting document ${docRef.path}`);
            throw error;
        }
    },

    /**
     * Updates a Firestore document using the stored db instance.
     * Includes default error handling.
     * @param {DocumentReference} docRef - The Firestore document reference.
     * @param {object} data - The data to update.
     * @returns {Promise<void>}
     */
    updateDoc: async function(docRef, data) {
        try {
            await firestoreUpdateDoc(docRef, data); // Use aliased import name
        } catch (error) {
            this.handleError(error, `updating document ${docRef.path}`);
            throw error;
        }
    },

    /**
     * Updates the internal admin status and notifies any registered callbacks.
     * @param {string} role - The new role ('Admin' or 'Standard').
     */
    updateAdminStatus: function(role) {
        const newIsAdmin = (role === 'Admin');
        if (this._isAdmin !== newIsAdmin) {
            this._isAdmin = newIsAdmin;
            console.log("Admin status changed to:", this._isAdmin);
            this.adminStatusCallbacks.forEach(callback => callback(this._isAdmin));
        }
    },

    /**
     * Checks if the current user has an 'Admin' role.
     * This status is set and maintained by the Auth module.
     * @returns {boolean} True if the user is an admin, false otherwise.
     */
    isAdmin: function() {
        return this._isAdmin;
    },

    /**
     * Registers a callback function to be called when the admin status changes.
     * @param {function} callback - The function to call with the new admin status.
     */
    onAdminStatusChange: function(callback) {
        this.adminStatusCallbacks.push(callback);
    }
};
