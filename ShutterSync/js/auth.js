// js/auth.js

import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * The Auth module handles all user authentication functionalities
 * using Firebase Authentication.
 */
export const Auth = {
    auth: null,
    db: null, // Firestore DB instance
    Utils: null, // Reference to the Utils module
    _authReadyResolver: null, // Function to resolve the _authReadyPromise
    _authReadyPromise: null, // Promise that resolves when auth state is determined
    _isAdmin: false, // Internal flag for admin status, synced with Utils.isAdmin

    /**
     * Initializes the Auth module with Firebase Auth and Firestore instances.
     * This method now returns a Promise that resolves when the initial authentication
     * state has been determined (onAuthStateChanged fires for the first time).
     *
     * @param {object} firebaseDb - The Firebase Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils module instance.
     * @returns {Promise<void>} A promise that resolves when the initial auth state is ready.
     */
    init: function(firebaseDb, firebaseAuth, utils) {
        this.db = firebaseDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("Auth module initialized.");

        // Create a new promise for auth readiness if it doesn't already exist.
        // This promise will be resolved by the onAuthStateChanged listener after its first run.
        if (!this._authReadyPromise) {
            this._authReadyPromise = new Promise(resolve => {
                this._authReadyResolver = resolve;
            });
        }

        this.setupAuthStateListener(); // Sets up the Firebase listener
        this.performInitialSignIn();   // Attempts token/anonymous sign-in

        // Return the promise. Main.js will await this.
        return this._authReadyPromise;
    },

    /**
     * Attempts to sign in with a custom token if available (for Canvas environment).
     * IMPORTANT: This function no longer falls back to anonymous sign-in.
     * If custom token sign-in fails or is not provided, the user will remain unauthenticated.
     */
    performInitialSignIn: async function() {
        // On GitHub, __initial_auth_token will be undefined, so this block will be skipped.
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try {
                await signInWithCustomToken(this.auth, __initial_auth_token);
                console.log("Signed in with custom token.");
            } catch (error) {
                console.warn("Error signing in with custom token. User will remain unauthenticated.", error);
            }
        } else {
            console.log("No custom auth token provided. User will start unauthenticated.");
        }
    },

    /**
     * Sets up the Firebase Auth state listener.
     * This listener updates the UI and user role whenever the authentication state changes.
     */
    setupAuthStateListener: function() {
        // This listener fires immediately upon registration with the current auth state,
        // and then again on any subsequent changes (login, logout, token refresh).
        onAuthStateChanged(this.auth, async (user) => {
            console.log("Auth state changed. Current user:", user ? user.uid : "No user");

            let currentIsAdmin = false; // Default to false
            if (user) {
                // User is signed in. Fetch or create user_data document.
                const userDocRef = doc(this.db, 'users_data', user.uid);
                try {
                    const docSnap = await this.Utils.getDoc(userDocRef); // Use Utils.getDoc

                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        currentIsAdmin = userData.role === 'Admin';
                        this.Utils.updateAdminStatus(userData.role); // Notify Utils of role
                        console.log(`User data loaded. Role: ${userData.role}, IsAdmin: ${currentIsAdmin}`);
                    } else {
                        // User's first Google login, create their user_data document.
                        const defaultUserData = {
                            email: user.email,
                            displayName: user.displayName,
                            role: 'Standard', // Default role for new Google-signed-in users
                            createdAt: new Date(),
                            lastLogin: new Date()
                        };
                        await this.Utils.setDoc(userDocRef, defaultUserData); // Use Utils.setDoc
                        currentIsAdmin = false; // Newly created user is Standard
                        this.Utils.updateAdminStatus('Standard'); // Notify Utils of default role
                        console.log("New user data created with Standard role for Google login.");
                    }
                } catch (error) {
                    this.Utils.handleError(error, "fetching/creating user data");
                    currentIsAdmin = false; // Default to non-admin on error if there's an issue
                    this.Utils.updateAdminStatus('Standard'); // Notify Utils of role
                }
            } else {
                // User is signed out or never authenticated.
                currentIsAdmin = false;
                this.Utils.updateAdminStatus('Standard'); // User is no longer admin (or never was)
            }

            // Update Auth module's internal _isAdmin flag
            this._isAdmin = currentIsAdmin;

            // If the _authReadyPromise has not been resolved yet, resolve it now.
            // This happens only once, on the very first auth state determination.
            if (this._authReadyResolver) {
                this._authReadyResolver(); // Resolve the promise (no value needed, just signal completion)
                this._authReadyResolver = null; // Clear the resolver to prevent multiple resolutions
            }
        });
    },

    /**
     * Adds a callback function to be executed when the initial authentication state
     * has been determined (user logged in/out, and their role fetched).
     * @param {function(boolean, boolean, object|null)} callback - The function to call with
     * isLoggedIn (boolean), isAdmin (boolean), and currentUser (object|null).
     */
    onAuthReady: function(callback) {
        // If the promise is already resolved, call the callback immediately.
        // This._authReadyResolver being null means the promise has already been resolved.
        if (this._authReadyPromise && this._authReadyResolver === null) {
            callback(!!this.auth.currentUser, this._isAdmin, this.auth.currentUser);
        } else {
            // Otherwise, wait for the promise to resolve, then call the callback.
            this._authReadyPromise.then(() => {
                callback(!!this.auth.currentUser, this._isAdmin, this.auth.currentUser);
            });
        }
    },

    /**
     * Logs the user in with Google.
     */
    loginWithGoogle: async function() {
        const provider = new GoogleAuthProvider();
        try {
            console.log("Attempting Google login popup...");
            await signInWithPopup(this.auth, provider);
            console.log("Google login successful!");
            this.Utils.showMessage('Successfully logged in with Google!', 'success');
            // onAuthStateChanged listener will handle subsequent UI updates and module loading.
        } catch (error) {
            console.error("Google login error details:", error); // Detailed error log
            this.Utils.handleError(error, "Google login");
            if (error.code === 'auth/popup-closed-by-user') {
                this.Utils.showMessage('Login cancelled by user.', 'info');
            } else if (error.code === 'auth/cancelled-popup-request') {
                this.Utils.showMessage('Another login request is already in progress.', 'warning');
            }
        }
    },

    /**
     * Logs the current user out.
     */
    logout: async function() {
        try {
            if (!this.auth) {
                console.error("Auth instance is null. Cannot log out.");
                this.Utils.showMessage('Logout failed: Authentication service not initialized.', 'error');
                return;
            }
            console.log("Attempting Firebase signOut...");
            await signOut(this.auth);
            console.log("Firebase signOut successful!");
            this.Utils.showMessage('Successfully logged out.', 'success');
            // onAuthStateChanged listener will handle subsequent UI updates and module loading.
        } catch (error) {
            console.error("Logout error details:", error); // Detailed error log for logout
            this.Utils.handleError(error, "logout");
        }
    },

    /**
     * Checks if a user is currently logged in.
     * @returns {boolean} True if a user is logged in, false otherwise.
     */
    isLoggedIn: function() {
        return !!this.auth.currentUser;
    },

    /**
     * Provides access to the Firebase Auth instance.
     * @returns {object} The Firebase Auth instance.
     */
    getAuthInstance: function() {
        return this.auth;
    },

    /**
     * Provides access to the current authenticated user object.
     * @returns {object|null} The Firebase User object or null.
     */
    getCurrentUser: function() {
        return this.auth.currentUser;
    }
};
