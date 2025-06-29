// js/utils.js

/**
 * The Utils module provides common utility functions for the application,
 * including message display, error handling, and user role management.
 */
export const Utils = {
    db: null,
    auth: null,
    appId: null,
    _isAdminStatus: false, // Stores the current admin status
    _adminStatusCallbacks: [], // Callbacks to run when admin status changes

    /**
     * Initializes the Utils module with Firebase instances and app ID.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {string} appId - The application ID.
     */
    init: function(firestoreDb, firebaseAuth, appId) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.appId = appId;
        console.log("Utils module initialized.");
    },

    /**
     * Displays a message to the user using a custom modal.
     * @param {string} message - The message content.
     * @param {string} type - Type of message ('success', 'error', 'warning', 'info').
     * @param {number} [duration=3000] - Duration in milliseconds for which the message is displayed. 0 for persistent.
     */
    showMessage: function(message, type = 'info', duration = 3000) {
        const modalContainer = document.getElementById('message-modal-container');
        const messageContent = document.getElementById('message-content');
        const closeBtn = document.getElementById('message-close-btn');

        if (!modalContainer || !messageContent || !closeBtn) {
            console.error("Message modal elements not found.");
            // Fallback to console log if UI elements are missing
            console.log(`Message (${type}): ${message}`);
            return;
        }

        // Apply type-specific styling for the message content and button
        messageContent.className = 'text-lg font-semibold mb-4'; // Reset classes
        closeBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200'; // Default close button style

        switch (type) {
            case 'success':
                messageContent.classList.add('text-green-700');
                closeBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                closeBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                break;
            case 'error':
                messageContent.classList.add('text-red-700');
                closeBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                closeBtn.classList.add('bg-red-600', 'hover:bg-red-700');
                break;
            case 'warning':
                messageContent.classList.add('text-yellow-700');
                closeBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                closeBtn.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
                break;
            case 'info':
            default:
                messageContent.classList.add('text-gray-800');
                // Default blue styles are already set
                break;
        }

        messageContent.textContent = message;
        modalContainer.classList.remove('hidden');

        // Show transition
        setTimeout(() => {
            modalContainer.querySelector('div').classList.remove('opacity-0', 'scale-95');
        }, 10);

        // Remove any dynamically added buttons from previous calls (e.g., delete confirmations)
        const messageBox = modalContainer.querySelector('div');
        const existingDynamicButtons = messageBox.querySelectorAll('button:not(#message-close-btn)');
        existingDynamicButtons.forEach(btn => btn.remove());
        // Re-add the default close button if it was removed
        if (!messageBox.contains(closeBtn)) {
            messageBox.appendChild(closeBtn);
        }


        // Hide after duration if not persistent
        if (duration > 0) {
            setTimeout(() => {
                this.hideMessage();
            }, duration);
        } else {
            // If duration is 0, make close button explicitly hide the modal
            closeBtn.onclick = () => {
                this.hideMessage();
            };
        }
    },

    /**
     * Hides the message modal.
     */
    hideMessage: function() {
        const modalContainer = document.getElementById('message-modal-container');
        if (modalContainer) {
            modalContainer.querySelector('div').classList.add('opacity-0', 'scale-95');
            modalContainer.addEventListener('transitionend', () => {
                modalContainer.classList.add('hidden');
                // Reset onclick for the close button to default behavior if needed
                document.getElementById('message-close-btn').onclick = null;
            }, { once: true });
        }
    },

    /**
     * Handles Firebase errors and displays a user-friendly message.
     * @param {object} error - The Firebase error object.
     * @param {string} context - A description of where the error occurred.
     */
    handleError: function(error, context = "an operation") {
        console.error(`Error during ${context}:`, error);
        let errorMessage = `An unexpected error occurred during ${context}.`;

        if (error.code) {
            switch (error.code) {
                case 'auth/invalid-api-key':
                    errorMessage = "Authentication failed: Invalid API key. Please check your Firebase configuration.";
                    break;
                case 'auth/network-request-failed':
                    errorMessage = "Authentication failed: Network error. Please check your internet connection.";
                    break;
                case 'permission-denied':
                    errorMessage = "Access Denied: You do not have permission to perform this action.";
                    break;
                case 'resource-exhausted':
                    errorMessage = "Operation failed: Quota exceeded. Please try again later or contact support.";
                    break;
                case 'unavailable':
                    errorMessage = "Service unavailable. Please try again later.";
                    break;
                default:
                    errorMessage = `An error occurred: ${error.message || error.code}.`;
            }
        }
        this.showMessage(errorMessage, 'error');
    },

    /**
     * Updates the internal admin status and triggers callbacks if status changes.
     * This method is called by Auth.js after determining the user's role.
     * @param {string|null} role - The role of the current user ('Admin', 'Standard', or null if logged out).
     */
    updateAdminStatus: function(role) {
        const newStatus = (role === 'Admin');
        if (this._isAdminStatus !== newStatus) {
            this._isAdminStatus = newStatus;
            console.log(`Admin status changed to: ${this._isAdminStatus}`);
            this._adminStatusCallbacks.forEach(cb => cb(this._isAdminStatus));
        }
    },

    /**
     * Returns whether the current user is an admin.
     * @returns {boolean} True if the current user has an 'Admin' role, false otherwise.
     */
    isAdmin: function() {
        return this._isAdminStatus;
    },

    /**
     * Registers a callback to be executed when the admin status changes.
     * @param {function(boolean)} callback - The function to call with the new admin status.
     */
    onAdminStatusChange: function(callback) {
        this._adminStatusCallbacks.push(callback);
    },

    /**
     * Generic wrapper for Firestore updateDoc to centralize error handling.
     * @param {DocumentReference} docRef - The document reference.
     * @param {object} data - The data to update.
     */
    updateDoc: async function(docRef, data) {
        try {
            await updateDoc(docRef, data);
            // Success message is handled by calling module
        } catch (error) {
            this.handleError(error, `updating document ${docRef.id}`);
            throw error; // Re-throw to allow calling module to handle UI specifics if needed
        }
    },

    /**
     * Generic wrapper for Firestore setDoc to centralize error handling.
     * @param {DocumentReference} docRef - The document reference.
     * @param {object} data - The data to set.
     * @param {object} options - Options for setDoc (e.g., { merge: true }).
     */
    setDoc: async function(docRef, data, options = {}) {
        try {
            await setDoc(docRef, data, options);
            // Success message is handled by calling module
        } catch (error) {
            this.handleError(error, `setting document ${docRef.id}`);
            throw error;
        }
    }
};
