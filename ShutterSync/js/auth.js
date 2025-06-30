// js/auth.js

// Import all necessary Firebase Auth functions.
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
    authReadyCallbacks: [], // Callbacks to run when auth state is first determined
    _isAdmin: false, // Internal flag for admin status (redundant, but kept for clarity with Utils.isAdmin)

    /**
     * Initializes the Auth module with Firebase Auth and Firestore instances.
     * @param {object} firebaseDb - The Firebase Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils module instance.
     */
    init: function(firebaseDb, firebaseAuth, utils) {
        this.db = firebaseDb;
        this.auth = firebaseAuth;
        this.Utils = utils; // Store reference to Utils

        console.log("Auth module initialized.");
        this.setupAuthStateListener();
        this.performInitialSignIn();
    },

    /**
     * Attempts to sign in with a custom token if available (for Canvas environment).
     * IMPORTANT: This function no longer falls back to anonymous sign-in.
     * If custom token sign-in fails or is not provided, the user will remain unauthenticated.
     */
    performInitialSignIn: async function() {
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
        onAuthStateChanged(this.auth, async (user) => {
            console.log("Auth state changed. Current user:", user ? user.uid : "No user");

            let currentIsAdmin = false; // Default
            if (user) {
                // User is signed in. Fetch or create user_data document.
                const userDocRef = doc(this.db, 'users_data', user.uid);
                try {
                    const docSnap = await this.Utils.getDoc(userDocRef);

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
                        await this.Utils.setDoc(userDocRef, defaultUserData);
                        currentIsAdmin = false;
                        this.Utils.updateAdminStatus('Standard'); // Notify Utils of default role
                        console.log("New user data created with Standard role for Google login.");
                    }
                } catch (error) {
                    this.Utils.handleError(error, "fetching/creating user data");
                    currentIsAdmin = false; // Default to non-admin on error
                    this.Utils.updateAdminStatus('Standard'); // Notify Utils of role
                }
            } else {
                // User is signed out or never authenticated.
                currentIsAdmin = false;
                this.Utils.updateAdminStatus('Standard'); // User is no longer admin (or never was)
            }

            // Store the resolved isAdmin status internally
            this._isAdmin = currentIsAdmin;

            // Run any callbacks that were waiting for auth to be ready,
            // passing the definitive isLoggedIn, isAdmin, and currentUser.
            const isLoggedIn = !!user;
            this.authReadyCallbacks.forEach(callback => callback(isLoggedIn, currentIsAdmin, user));
            this.authReadyCallbacks = []; // Clear callbacks after running them once
        });
    },

    /**
     * Adds a callback function to be executed when the initial authentication state
     * has been determined (user logged in/out, and their role fetched).
     * @param {function(boolean, boolean, object|null)} callback - The function to call with
     * isLoggedIn (boolean), isAdmin (boolean), and currentUser (object|null).
     */
    onAuthReady: function(callback) {
        // If auth state has already been determined, run callback immediately
        // `this.auth.currentUser !== undefined` means `onAuthStateChanged` has fired at least once.
        if (this.auth.currentUser !== undefined) {
             callback(!!this.auth.currentUser, this._isAdmin, this.auth.currentUser);
        } else {
            this.authReadyCallbacks.push(callback);
        }
    },

    /**
     * Logs the user in with Google.
     */
    loginWithGoogle: async function() {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(this.auth, provider);
            this.Utils.showMessage('Successfully logged in with Google!', 'success');
            // onAuthStateChanged listener will handle subsequent UI updates and module loading.
        } catch (error) {
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
            await signOut(this.auth);
            this.Utils.showMessage('Successfully logged out.', 'success');
            // onAuthStateChanged listener will handle subsequent UI updates and module loading.
        } catch (error) {
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
