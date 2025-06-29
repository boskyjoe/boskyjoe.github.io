// js/utils.js

import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * The Utils object provides common utility functions throughout the CRM application.
 */
export const Utils = {
    db: null,
    auth: null,
    appId: null,
    _isAdmin: false, // Internal flag for admin status
    adminStatusCallbacks: [], // Callbacks to run when admin status changes

    /**
     * Initializes the Utils module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {string} appId - The application ID from the environment.
     */
    init: function(firestoreDb, firebaseAuth, appId) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.appId = appId;
        console.log("Utils module initialized.");

        // Listen for auth state changes to update admin status automatically
        this.auth.onAuthStateChanged(user => {
            this.updateAdminStatus();
        });
    },

    /**
     * Displays a styled message to the user.
     * @param {string} message - The message content.
     * @param {string} type - 'success', 'error', 'warning', 'info'.
     * @param {number} [duration=3000] - How long the message is displayed in ms (0 for persistent).
     */
    showMessage: function(message, type = 'info', duration = 3000) {
        const modalContainer = document.getElementById('message-modal-container');
        const messageContent = document.getElementById('message-content');
        const closeButton = document.getElementById('message-close-btn');

        if (!modalContainer || !messageContent || !closeButton) {
            console.error('Message modal elements not found.');
            return;
        }

        messageContent.textContent = message;
        modalContainer.classList.remove('hidden');
        modalContainer.querySelector('div').classList.remove('opacity-0', 'scale-95');

        // Apply type-specific styling
        messageContent.className = 'text-lg font-semibold mb-4'; // Reset first
        switch (type) {
            case 'success':
                messageContent.classList.add('text-green-700');
                closeButton.classList.add('bg-green-600', 'hover:bg-green-700');
                closeButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-red-600', 'hover:bg-red-700', 'bg-yellow-600', 'hover:bg-yellow-700');
                break;
            case 'error':
                messageContent.classList.add('text-red-700');
                closeButton.classList.add('bg-red-600', 'hover:bg-red-700');
                closeButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-green-600', 'hover:bg-green-700', 'bg-yellow-600', 'hover:bg-yellow-700');
                break;
            case 'warning':
                messageContent.classList.add('text-yellow-700');
                closeButton.classList.add('bg-yellow-600', 'hover:bg-yellow-700');
                closeButton.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-green-600', 'hover:bg-green-700', 'bg-red-600', 'hover:bg-red-700');
                break;
            case 'info':
            default:
                messageContent.classList.add('text-blue-700'); // Default info color
                closeButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
                closeButton.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-red-600', 'hover:bg-red-700', 'bg-yellow-600', 'hover:bg-yellow-700');
                break;
        }

        // Handle close button click
        const closeHandler = () => {
            modalContainer.querySelector('div').classList.add('opacity-0', 'scale-95');
            modalContainer.addEventListener('transitionend', () => {
                modalContainer.classList.add('hidden');
                // Remove custom buttons if any were added by a persistent message
                const customButtons = modalContainer.querySelectorAll('button:not(#message-close-btn)');
                customButtons.forEach(btn => btn.remove());
                closeButton.onclick = null; // Clear handler to prevent multiple executions
            }, { once: true });
        };

        // If duration is 0, make it persistent and wait for explicit close
        if (duration === 0) {
            closeButton.textContent = 'Close'; // Change button text for persistent messages
            closeButton.onclick = closeHandler;
        } else {
            closeButton.textContent = 'OK'; // Default text
            closeButton.onclick = closeHandler;
            setTimeout(closeHandler, duration);
        }
    },

    /**
     * Centralized error handling.
     * @param {Error} error - The error object.
     * @param {string} context - A description of where the error occurred.
     */
    handleError: function(error, context = 'operation') {
        console.error(`Error during ${context}:`, error);
        this.showMessage(`An error occurred during ${context}. Please try again. ${error.message || ''}`, 'error');
    },

    /**
     * Checks if the currently logged-in user is an Admin.
     * This relies on the 'role' field in the 'users_data' collection.
     * @returns {boolean} True if the user is an admin, false otherwise.
     */
    isAdmin: function() {
        return this._isAdmin;
    },

    /**
     * Asynchronously updates the internal _isAdmin flag based on the current user's role.
     * Should be called after auth state changes or user data might have been updated.
     */
    updateAdminStatus: async function() {
        if (!this.auth.currentUser) {
            this._isAdmin = false;
            console.log("No user logged in, admin status set to false.");
            this.runAdminStatusCallbacks();
            return;
        }

        const userId = this.auth.currentUser.uid;
        try {
            const userDocRef = doc(this.db, "users_data", userId);
            const userDocSnap = await getDoc(userDocRef);

            let newAdminStatus = false;
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (userData.role === 'Admin') {
                    newAdminStatus = true;
                }
            }
            if (this._isAdmin !== newAdminStatus) {
                this._isAdmin = newAdminStatus;
                console.log("Admin status updated to:", this._isAdmin);
                this.runAdminStatusCallbacks(); // Run callbacks if status changed
            }
        } catch (error) {
            console.error("Error fetching user role for admin status:", error);
            this._isAdmin = false; // Default to false on error
            this.runAdminStatusCallbacks();
        }
    },

    /**
     * Registers a callback to be executed when the admin status changes.
     * @param {function} callback - The function to call when admin status updates.
     */
    onAdminStatusChange: function(callback) {
        this.adminStatusCallbacks.push(callback);
    },

    /**
     * Executes all registered admin status change callbacks.
     * Internal helper function.
     */
    runAdminStatusCallbacks: function() {
        this.adminStatusCallbacks.forEach(callback => callback(this._isAdmin));
    },

    // Centralized Firestore operations for consistency and potential logging/error handling
    setDoc: async function(docRef, data) {
        return setDoc(docRef, data);
    },
    updateDoc: async function(docRef, data) {
        return updateDoc(docRef, data);
    }
};
