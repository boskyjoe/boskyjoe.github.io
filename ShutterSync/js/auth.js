// js/auth.js

import { signInWithCustomToken, signInAnonymously, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js'; // Ensure Utils is imported

/**
 * The Auth module handles all Firebase Authentication related functionalities.
 */
export const Auth = {
    db: null,
    auth: null,
    Utils: null, // Store Utils reference
    _authReadyCallbacks: [], // Callbacks to run when auth state is first determined

    /**
     * Initializes the Auth module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils; // Assign Utils reference
        console.log("Auth module initialized.");

        // Listen for auth state changes
        this.auth.onAuthStateChanged(async (user) => {
            console.log("Auth state changed. User:", user ? user.uid : "null");
            if (user) {
                await this.ensureUserDocumentAndSetRole(user);
            } else {
                this.Utils.updateAdminStatus(null); // Clear admin status if no user
            }

            // Run onAuthReady callbacks only once after the initial state is processed
            if (this._authReadyCallbacks.length > 0) {
                this._authReadyCallbacks.forEach(cb => cb());
                this._authReadyCallbacks = []; // Clear callbacks after execution
            }
        });
    },

    /**
     * Ensures a user document exists in 'users_data' and updates their role in Utils.
     * If the user document doesn't exist, it creates one with a default 'Standard' role.
     * @param {object} user - The Firebase User object.
     */
    ensureUserDocumentAndSetRole: async function(user) {
        if (!user || !user.uid) {
            console.warn("Attempted to ensure user document with null/invalid user object.");
            this.Utils.updateAdminStatus(null);
            return;
        }

        const userDocRef = doc(this.db, 'users_data', user.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);
            let userRole = 'Standard'; // Default role

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                userRole = userData.role || 'Standard';
                console.log(`User document exists for ${user.uid}, role: ${userRole}`);
            } else {
                // Document does not exist, create it with default 'Standard' role
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email || null,
                    displayName: user.displayName || 'Anonymous User',
                    role: 'Standard',
                    createdAt: new Date(),
                    lastLogin: new Date()
                });
                console.log(`Created new user document for ${user.uid} with role: Standard`);
            }
            // Update the admin status in Utils after ensuring the user document
            this.Utils.updateAdminStatus(userRole);
        } catch (error) {
            this.Utils.handleError(error, "ensuring user document/setting role");
            // Fallback: If error, assume standard role or clear status
            this.Utils.updateAdminStatus(null);
        }
    },

    /**
     * Attempts to log in the user.
     * If initialAuthToken is provided, uses custom token. Otherwise, signs in anonymously.
     * @param {string|null} initialAuthToken - A custom Firebase Auth token.
     */
    login: async function(initialAuthToken) {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(this.auth, initialAuthToken);
                console.log("Logged in with custom token.");
            } else {
                await signInAnonymously(this.auth);
                console.log("Logged in anonymously.");
            }
            // The onAuthStateChanged listener will handle subsequent actions (user doc, role, UI update)
        } catch (error) {
            this.Utils.handleError(error, "login");
            this.Utils.showMessage("Login failed. Please try again.", "error");
        }
    },

    /**
     * Logs out the current user.
     */
    logout: async function() {
        try {
            await signOut(this.auth);
            console.log("User logged out.");
            this.Utils.showMessage("You have been logged out.", "info");
            localStorage.removeItem('lastActiveModule'); // Clear last active module on logout
            window.Main.loadModule('home'); // Redirect to home page
        } catch (error) {
            this.Utils.handleError(error, "logout");
            this.Utils.showMessage("Logout failed. Please try again.", "error");
        }
    },

    /**
     * Registers a callback to be executed once the initial authentication state is determined.
     * This is useful for delaying UI rendering until the user's login status is known.
     * @param {function} callback - The function to call.
     */
    onAuthReady: function(callback) {
        // If auth state has already been determined, call immediately
        if (this.auth.currentUser !== undefined) { // Check if initial state is processed
            callback();
        } else {
            this._authReadyCallbacks.push(callback);
        }
    },

    /**
     * Checks if a user is currently logged in.
     * @returns {boolean} True if a user is logged in, false otherwise.
     */
    isLoggedIn: function() {
        return this.auth.currentUser !== null;
    }
};
