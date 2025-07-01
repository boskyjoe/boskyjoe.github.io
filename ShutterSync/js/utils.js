// js/utils.js

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    orderBy,
    addDoc,
    getDocs,
    onSnapshot,
    Timestamp // Import Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * The Utils module provides common utility functions, Firebase Firestore operations,
 * and global state management (like admin status).
 */
export const Utils = {
    db: null,
    auth: null,
    appId: null,
    _isAdmin: false, // Internal state for admin status
    _adminStatusChangeCallbacks: [], // Callbacks for when admin status changes

    // Expose Firebase Firestore functions directly for convenience
    doc: doc,
    getDoc: getDoc,
    setDoc: setDoc,
    updateDoc: updateDoc,
    deleteDoc: deleteDoc,
    collection: collection,
    query: query,
    where: where,
    orderBy: orderBy,
    addDoc: addDoc,
    getDocs: getDocs,
    onSnapshot: onSnapshot,
    Timestamp: Timestamp, // Expose Timestamp

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
        console.log("Utils module initialized with App ID:", appId);
    },

    /**
     * Handles and logs errors, optionally displaying a user-friendly message.
     * @param {Error} error - The error object.
     * @param {string} context - A string describing where the error occurred.
     */
    handleError: function(error, context = "an unknown operation") {
        console.error(`Error during ${context}:`, error);
        this.showMessage(`An error occurred during ${context}. Please try again.`, 'error');
    },

    /**
     * Displays a temporary message to the user.
     * @param {string} message - The message to display.
     * @param {'success'|'error'|'info'|'warning'} type - The type of message.
     */
    showMessage: function(message, type = 'info') {
        const messageContainer = document.getElementById('message-container'); // Assuming a message container exists in index.html
        if (!messageContainer) {
            console.warn("Message container not found. Message:", message);
            // Fallback to alert for critical messages if container is missing
            if (type === 'error') {
                alert(`Error: ${message}`);
            } else {
                console.log(message);
            }
            return;
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg text-white z-50`;

        switch (type) {
            case 'success':
                alertDiv.classList.add('bg-green-500');
                break;
            case 'error':
                alertDiv.classList.add('bg-red-500');
                break;
            case 'info':
                alertDiv.classList.add('bg-blue-500');
                break;
            case 'warning':
                alertDiv.classList.add('bg-yellow-500');
                break;
            default:
                alertDiv.classList.add('bg-gray-500');
        }

        alertDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${this.getIconForMessageType(type)} mr-2"></i>
                <span>${message}</span>
                <button class="ml-auto -mr-1.5 -mt-1.5 p-1.5 rounded-md inline-flex items-center justify-center h-8 w-8 text-white hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                    <span class="sr-only">Dismiss</span>
                    <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;

        messageContainer.appendChild(alertDiv);

        // Add event listener to dismiss button
        alertDiv.querySelector('button')?.addEventListener('click', () => {
            alertDiv.remove();
        });

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    },

    /**
     * Returns a Font Awesome icon class based on message type.
     * @param {string} type - The message type.
     * @returns {string} Font Awesome icon class.
     */
    getIconForMessageType: function(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-times-circle';
            case 'info': return 'fa-info-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-bell';
        }
    },

    /**
     * Helper to create HTML elements from a string.
     * Used by Grid.js formatters.
     * @param {string} htmlString - The HTML string.
     * @returns {HTMLElement} The created HTML element.
     */
    html: function(htmlString) {
        const div = document.createElement('div');
        div.innerHTML = htmlString.trim();
        return div.firstChild;
    },

    /**
     * Updates the global admin status and notifies subscribers.
     * @param {string} role - The user's role ('Admin', 'Standard').
     */
    updateAdminStatus: function(role) {
        const newIsAdmin = role === 'Admin';
        if (this._isAdmin !== newIsAdmin) {
            this._isAdmin = newIsAdmin;
            console.log("Utils: Admin status changed to:", newIsAdmin);
            this._adminStatusChangeCallbacks.forEach(callback => callback(newIsAdmin));
        }
    },

    /**
     * Returns the current admin status.
     * @returns {boolean} True if the current user is an admin, false otherwise.
     */
    isAdmin: function() {
        return this._isAdmin;
    },

    /**
     * Registers a callback to be fired when the admin status changes.
     * @param {function(boolean)} callback - The callback function.
     */
    onAdminStatusChange: function(callback) {
        this._adminStatusChangeCallbacks.push(callback);
    },

    // --- Firestore Collection References ---
    // These functions provide consistent paths to Firestore collections.
    // They incorporate the appId for multi-app environments, if applicable.

    /**
     * Gets the Firestore collection reference for opportunities.
     * @returns {object} A Firestore CollectionReference.
     */
    getOpportunitiesCollectionRef: function() {
        // Using a fixed path for simplicity for GitHub Pages.
        // If multi-tenancy or app-specific data isolation is needed,
        // this would incorporate `this.appId`.
        // Example with appId: return this.collection(this.db, `artifacts/${this.appId}/public/data/opportunities`);
        return this.collection(this.db, 'opportunities');
    },

    /**
     * Gets the Firestore collection reference for customers.
     * @returns {object} A Firestore CollectionReference.
     */
    getCustomersCollectionRef: function() {
        return this.collection(this.db, 'customers');
    },

    /**
     * Gets the Firestore collection reference for users_data.
     * This collection stores user roles and profiles.
     * @returns {object} A Firestore CollectionReference.
     */
    getUsersDataCollectionRef: function() {
        return this.collection(this.db, 'users_data');
    },

    /**
     * Gets the Firestore collection reference for admin_data.
     * @returns {object} A Firestore CollectionReference.
     */
    getAdminDataCollectionRef: function() {
        return this.collection(this.db, 'admin_data');
    },

    /**
     * Gets the Firestore collection reference for price_book.
     * @returns {object} A Firestore CollectionReference.
     */
    getPriceBookCollectionRef: function() {
        return this.collection(this.db, 'price_book');
    }
};
