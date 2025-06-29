// js/auth.js

// Import necessary Firebase Auth functions, including GoogleAuthProvider
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js'; // Ensure Utils is imported

/**
 * The Auth module handles all Firebase Authentication related functionalities.
 */
export const Auth = {
    db: null,
    auth: null,
    Utils: null, // Store Utils reference
    _authReadyCallbacks: [], // Callbacks to run when auth state is first determined
    _isAuthInitialCheckComplete: false, // Flag to ensure onAuthReady callbacks run only once

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
        onAuthStateChanged(this.auth, async (user) => {
            console.log("Auth state changed. User:", user ? user.uid : "null");
            if (user) {
                // User is signed in. Ensure their user document exists and update their role.
                await this.ensureUserDocumentAndSetRole(user);
            } else {
                // User is signed out. Clear admin status.
                this.Utils.updateAdminStatus(null);
            }

            // Mark initial check complete and run callbacks if not already done
            if (!this._isAuthInitialCheckComplete) {
                this._isAuthInitialCheckComplete = true;
                this._authReadyCallbacks.forEach(cb => cb());
                this._authReadyCallbacks = []; // Clear callbacks after execution
            }
        });
    },

    /**
     * Ensures a user document exists in 'users_data' and updates their role in Utils.
     * If the user document doesn't exist, it creates one with a default 'Standard' role.
     * Also updates lastLogin timestamp.
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
                userRole = userData.role || 'Standard'; // Use existing role or default
                console.log(`User document exists for ${user.uid}, role: ${userRole}`);
                // Update lastLogin timestamp
                await updateDoc(userDocRef, { lastLogin: new Date() });
            } else {
                // Document does not exist, create it with default 'Standard' role
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email || null,
                    displayName: user.displayName || 'Unnamed User', // Google users will have displayName
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
     * Initiates the Google Sign-in process.
     * The initialAuthToken (custom token) flow is removed as we only support Google Sign-in.
     */
    login: async function() {
        const provider = new GoogleAuthProvider();
        try {
            // Force account selection to allow user to switch Google accounts if desired
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            await signInWithPopup(this.auth, provider);
            console.log("Logged in with Google.");
            // onAuthStateChanged listener will handle ensureUserDocumentAndSetRole and UI updates
        } catch (error) {
            // Handle specific Google Auth errors
            if (error.code === 'auth/popup-closed-by-user') {
                console.log("Google sign-in popup closed by user.");
                this.Utils.showMessage("Login cancelled.", "info");
            } else if (error.code === 'auth/cancelled-popup-request') {
                console.log("Another popup request already in progress.");
                this.Utils.showMessage("Login request already in progress. Please wait.", "warning");
            } else {
                this.Utils.handleError(error, "Google login");
                this.Utils.showMessage("Google login failed. Please try again.", "error");
            }
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
     * This is useful for delaying UI rendering until the user's login status and role are known.
     * @param {function} callback - The function to call.
     */
    onAuthReady: function(callback) {
        if (this._isAuthInitialCheckComplete) {
            // If auth state has already been determined and processed, call immediately
            callback();
        } else {
            // Otherwise, queue the callback
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
