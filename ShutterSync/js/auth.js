// js/auth.js

import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * The Auth module handles all Firebase Authentication related functionality.
 */
export const Auth = {
    db: null,
    auth: null,
    Utils: null,
    isAuthInitialized: false,
    authReadyCallbacks: [], // Callbacks to execute once authentication is ready

    /**
     * Initializes the Auth module with Firestore and Firebase Auth instances.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The global Utils object.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("Auth module initialized.");

        // Attach the Firebase Auth state change listener
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("User is logged in:", user.uid);
                // After user logs in, ensure their user_data entry exists/is updated
                await this.ensureUserData(user);
            } else {
                console.log("User is logged out.");
            }
            // Mark auth as initialized and run any pending callbacks
            if (!this.isAuthInitialized) {
                this.isAuthInitialized = true;
                this.authReadyCallbacks.forEach(callback => callback());
                this.authReadyCallbacks = []; // Clear callbacks after execution
            }
        });
    },

    /**
     * Attempts to sign in the user. If an initial token is provided (from Canvas),
     * it uses that. Otherwise, it signs in anonymously.
     * @param {string|null} initialAuthToken - Firebase custom auth token provided by the environment.
     */
    login: async function(initialAuthToken) {
        try {
            if (initialAuthToken) {
                await signInWithCustomToken(this.auth, initialAuthToken);
                console.log("Signed in with custom token.");
            } else {
                await signInAnonymously(this.auth);
                console.log("Signed in anonymously.");
            }
        } catch (error) {
            this.Utils.handleError(error, "signing in");
        }
    },

    /**
     * Ensures that a user_data document exists for the logged-in user.
     * If it doesn't exist, it creates a basic one.
     * Also updates the global Utils.isAdmin() status.
     * @param {object} user - The Firebase User object.
     */
    ensureUserData: async function(user) {
        if (!user || !user.uid) return;

        const userDocRef = doc(this.db, "users_data", user.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                console.log("User data does not exist, creating a new entry for:", user.uid);
                // Add new user data with a default role
                await this.Utils.setDoc(userDocRef, {
                    displayName: user.displayName || user.email || 'New User',
                    email: user.email || '',
                    role: 'Standard', // Default role
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                this.Utils.showMessage('Welcome! Your user profile has been created with a Standard role.','info');
            } else {
                console.log("User data exists for:", user.uid);
                // Update existing user data (e.g., last login time)
                // Also get the role for Utils.isAdmin()
                const userData = userDocSnap.data();
                await this.Utils.updateDoc(userDocRef, {
                    updatedAt: new Date()
                });
            }
            // Update the Utils module's isAdmin status based on the current user's role
            // This is crucial for enabling/disabling UI elements and listeners
            this.Utils.updateAdminStatus(); // Call a function in Utils to fetch and update admin status
        } catch (error) {
            this.Utils.handleError(error, "ensuring user data presence");
        }
    },

    /**
     * Signs out the current user.
     */
    logout: async function() {
        try {
            await signOut(this.auth);
            this.Utils.showMessage('You have been logged out successfully.', 'success');
            // Clear last active module and redirect to login or default
            localStorage.removeItem('lastActiveModule');
            window.location.reload(); // Simple reload to reset state and prompt re-login
        } catch (error) {
            this.Utils.handleError(error, "logging out");
        }
    },

    /**
     * Registers a callback to be executed once Firebase Auth is fully initialized
     * and the initial authentication state has been determined.
     * @param {function} callback - The function to call when auth is ready.
     */
    onAuthReady: function(callback) {
        if (this.isAuthInitialized) {
            callback();
        } else {
            this.authReadyCallbacks.push(callback);
        }
    }
};
