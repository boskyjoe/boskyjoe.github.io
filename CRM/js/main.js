import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, collection, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Import utility functions
import { showModal } from './utils.js'; // Assuming utils.js is in the same directory

// Import module initialization functions
// These will be defined in separate files we'll create next
import { initCustomersModule, resetCustomerForm } from './customers.js';
import { initOpportunitiesModule, resetOpportunityForm, setOpportunityLayout, closeAllAccordions } from './opportunities.js';
import { initUsersModule, resetUserForm } from './users.js';
import { initAdminDataModule, resetCurrencyForm } from './admin_data.js';

// YOUR Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebaseapp.com",
    messagingSenderId: "10782416018",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

console.log("Using directly provided Firebase config:", firebaseConfig);

// Use __app_id for Firestore collection paths as per mandatory instructions.
// Fallback to projectId from firebaseConfig if __app_id is somehow not defined.
export const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId;

// Global Firebase instances and shared state
export let app;
export let db;
export let auth;
export let currentUserId = null;
export let isAuthReady = false;
export let isAdmin = false;

// Global DOM element references for main.js
let logoutButton;
let mobileLogoutButton;
let navGoogleLoginButton;
let googleLoginButtonHome;
let homeSignInMessage;
let userIdDisplay;
let mobileUserIdDisplay;
let desktopAdminMenu;
let mobileAdminMenu;
let desktopAdminMenuToggle;
let desktopAdminSubMenu;
let mobileAdminMenuToggle;
let mobileAdminSubMenu;
let mobileMenuButton;
let mobileMenu;

let allSections = []; // Will be populated with references to section elements

// Track the currently active listener unsubscribe functions
let currentUnsubscribeFunctions = {};

// Function to handle Google Login
async function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged listener will handle the rest (role check, redirect)
    } catch (error) {
        console.error("Error during Google login:", error);
        showModal("Login Error", `Failed to sign in with Google: ${error.message}`, () => {});
    }
}

// Function to control section visibility and initialize modules
export async function showSection(sectionId) {
    console.log(`main.js: showSection called with sectionId: "${sectionId}"`);

    // Check for admin section access
    if (['admin-country-mapping-section', 'users-management-section', 'currency-management-section'].includes(sectionId)) {
        if (!currentUserId) {
            console.log(`main.js: Access to ${sectionId} denied. No user logged in. Prompting Google login.`);
            await handleGoogleLogin();
            return;
        }
        if (!isAdmin) {
            showModal("Unauthorized Access", "You do not have administrative privileges to access this section.", () => {
                showSection('home-section'); // Redirect to home if unauthorized
            });
            return;
        }
    }

    // Hide all sections first
    allSections.forEach(section => {
        if (section) section.classList.add('hidden');
    });

    // Then show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        console.log(`main.js: Section "${sectionId}" found and displayed.`);
    } else {
        console.warn(`main.js: Target section with ID "${sectionId}" not found in the DOM.`);
    }


    // Close mobile menu and admin submenus when navigating
    if (mobileMenu) mobileMenu.classList.remove('open');
    if (desktopAdminSubMenu) desktopAdminMenu.classList.remove('active');
    if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden');

    // Stop all active Firestore listeners before starting new ones
    Object.values(currentUnsubscribeFunctions).forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
    });
    currentUnsubscribeFunctions = {}; // Clear the map

    // Reset forms and module-specific state when navigating away from them
    // Ensure these functions exist in the imported modules
    if (sectionId !== 'customers-section' && typeof resetCustomerForm === 'function') resetCustomerForm();
    if (sectionId !== 'opportunities-section' && typeof resetOpportunityForm === 'function') resetOpportunityForm();
    if (sectionId !== 'users-management-section' && typeof resetUserForm === 'function') resetUserForm();
    if (sectionId !== 'currency-management-section' && typeof resetCurrencyForm === 'function') resetCurrencyForm();


    // Dynamically initialize modules and start their listeners
    if (isAuthReady) {
        switch (sectionId) {
            case 'customers-section':
                if (typeof initCustomersModule === 'function') initCustomersModule();
                break;
            case 'opportunities-section':
                if (typeof initOpportunitiesModule === 'function') initOpportunitiesModule();
                break;
            case 'users-management-section':
                if (isAdmin && typeof initUsersModule === 'function') initUsersModule();
                break;
            case 'admin-country-mapping-section':
                if (isAdmin && typeof initAdminDataModule === 'function') {
                    initAdminDataModule('country_mapping');
                }
                break;
            case 'currency-management-section':
                if (isAdmin && typeof initAdminDataModule === 'function') {
                    initAdminDataModule('currency_management');
                }
                break;
            case 'home-section': // Corrected case to match HTML ID
            case 'events-section':
                // No specific module init needed for these static sections, or they will be added later
                break;
            default:
                console.warn(`main.js: No specific initialization logic for section: "${sectionId}"`);
        }
    } else {
        console.warn("main.js: Attempted to show section before Firebase Auth is ready:", sectionId);
        // Ensure form buttons are disabled if auth is not ready
        document.querySelectorAll('button[type="submit"]').forEach(btn => {
            btn.setAttribute('disabled', 'disabled');
        });
    }
}


// Initialize Firebase and set up authentication listener
async function initializeFirebase() {
    console.log("main.js: initializeFirebase called.");
    // Only initialize Firebase app and services if they haven't been initialized already
    if (!app) {
        try {
            app = initializeApp(firebaseConfig);
            getAnalytics(app); // Initialize Analytics
            db = getFirestore(app);
            auth = getAuth(app);
            console.log("main.js: Firebase app and services initialized.");
        } catch (error) {
            console.error("main.js: Error initializing Firebase services:", error);
            showModal("Firebase Service Error", `Failed to initialize Firebase services: ${error.message}`, () => {});
            return;
        }
    }

    // --- Initialize all core DOM element references ---
    logoutButton = document.getElementById('logoutButton');
    mobileLogoutButton = document.getElementById('mobileLogoutButton');
    navGoogleLoginButton = document.getElementById('navGoogleLoginButton');
    googleLoginButtonHome = document.getElementById('googleLoginButton');
    homeSignInMessage = document.getElementById('homeSignInMessage');
    userIdDisplay = document.getElementById('userIdDisplay');
    mobileUserIdDisplay = document.getElementById('mobileUserIdDisplay');
    desktopAdminMenu = document.getElementById('desktopAdminMenu');
    mobileAdminMenu = document.getElementById('mobileAdminMenu');
    desktopAdminMenuToggle = document.getElementById('desktopAdminMenuToggle');
    desktopAdminSubMenu = document.getElementById('desktopAdminSubMenu');
    mobileAdminMenuToggle = document.getElementById('mobileAdminMenuToggle');
    mobileAdminSubMenu = document.getElementById('mobileAdminSubMenu');
    mobileMenuButton = document.getElementById('mobileMenuButton');
    mobileMenu = document.getElementById('mobileMenu');

    // Populate allSections array
    allSections = [
        document.getElementById('home-section'),
        document.getElementById('customers-section'),
        document.getElementById('opportunities-section'),
        document.getElementById('events-section'),
        document.getElementById('admin-country-mapping-section'),
        document.getElementById('users-management-section'),
        document.getElementById('auth-section'),
        document.getElementById('currency-management-section')
    ].filter(section => section !== null); // Filter out any that might still be null if HTML is malformed
    console.log("main.js: allSections populated. Found:", allSections.map(s => s.id));


    // Add Event Listeners for main navigation
    document.querySelectorAll('nav a').forEach(link => {
        if (link.dataset.section) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showSection(link.dataset.section);
            });
        }
    });

    // Admin Submenu Toggle Listeners
    if (desktopAdminMenuToggle && desktopAdminMenu) {
        desktopAdminMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            desktopAdminMenu.classList.toggle('active');
        });
    }
    document.addEventListener('click', (e) => {
        if (desktopAdminMenu && !desktopAdminMenu.contains(e.target)) {
            desktopAdminMenu.classList.remove('active');
        }
    });
    if (mobileAdminMenuToggle && mobileAdminSubMenu) {
        mobileAdminMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            mobileAdminSubMenu.classList.toggle('hidden');
        });
    }

    // Mobile Menu Button Event Listener
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            if (mobileMenu) mobileMenu.classList.toggle('open');
            if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden');
        });
    }

    // Google Login and Logout Buttons
    if (navGoogleLoginButton) navGoogleLoginButton.addEventListener('click', handleGoogleLogin);
    if (googleLoginButtonHome) googleLoginButtonHome.addEventListener('click', handleGoogleLogin);
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("User signed out.");
            } catch (error) {
                console.error("Error signing out:", error);
                showModal("Logout Error", `Failed to sign out: ${error.message}`, () => {});
            }
        });
    }
    if (mobileLogoutButton) {
        mobileLogoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("User signed out.");
            } catch (error) {
                console.error("Error signing out:", error);
                showModal("Logout Error", `Failed to log out: ${error.message}`, () => {});
            }
        });
    }

    // Firebase Auth State Listener
    onAuthStateChanged(auth, async (user) => {
        isAuthReady = true;
        console.log("main.js: onAuthStateChanged: Auth state changed. User:", user ? user.email || user.uid : "null");

        if (user) {
            currentUserId = user.uid;
            if (userIdDisplay) userIdDisplay.textContent = `User ID: ${user.email || user.uid}`;
            if (mobileUserIdDisplay) mobileUserIdDisplay.textContent = `User ID: ${user.email || user.uid}`;
            if (userIdDisplay) userIdDisplay.classList.remove('hidden');
            if (mobileUserIdDisplay) mobileUserIdDisplay.classList.remove('hidden');
            if (navGoogleLoginButton) navGoogleLoginButton.classList.add('hidden');
            if (googleLoginButtonHome) googleLoginButtonHome.classList.add('hidden');
            if (logoutButton) logoutButton.classList.remove('hidden');
            if (mobileLogoutButton) mobileLogoutButton.classList.remove('hidden');
            if (homeSignInMessage) homeSignInMessage.classList.add('hidden');

            const userProfileRef = doc(db, 'users_data', user.uid);
            const userProfileSnap = await getDoc(userProfileRef);

            if (userProfileSnap.exists()) {
                const userData = userProfileSnap.data();
                isAdmin = (userData.role === 'Admin' && userData.profileAccess === true);
            } else {
                try {
                    await setDoc(userProfileRef, {
                        userId: user.uid,
                        userName: user.email || 'N/A',
                        firstName: user.displayName ? user.displayName.split(' ')[0] : '',
                        lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
                        email: user.email || 'N/A',
                        phone: '',
                        role: 'User',
                        profileAccess: true
                    });
                    console.log("Basic user profile created for:", user.uid);
                    isAdmin = false;
                } catch (profileError) {
                    console.error("Error creating basic user profile:", profileError);
                    showModal("Profile Error", `Failed to create user profile: ${profileError.message}. Access to some features may be limited.`, () => {});
                }
            }

            if (isAdmin) {
                if (desktopAdminMenu) desktopAdminMenu.classList.remove('hidden');
                if (mobileAdminMenu) mobileAdminMenu.classList.remove('hidden');
            } else {
                if (desktopAdminMenu) desktopAdminMenu.classList.add('hidden');
                if (mobileAdminMenu) mobileAdminMenu.classList.add('hidden');
            }

            // After auth is ready and admin status is known, show the home section
            showSection('home-section'); // CORRECTED: Use 'home-section' to match HTML ID

        } else { // No user is signed in.
            currentUserId = null;
            isAdmin = false;
            console.log("main.js: onAuthStateChanged: No user signed in. Showing home section by default.");

            if (userIdDisplay) userIdDisplay.classList.add('hidden');
            if (mobileUserIdDisplay) mobileUserIdDisplay.classList.add('hidden');
            if (desktopAdminMenu) desktopAdminMenu.classList.add('hidden');
            if (mobileAdminMenu) mobileAdminMenu.classList.add('hidden');
            if (logoutButton) logoutButton.classList.add('hidden');
            if (mobileLogoutButton) mobileLogoutButton.classList.add('hidden');

            if (desktopAdminSubMenu) desktopAdminMenu.classList.remove('active');
            if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden');

            if (navGoogleLoginButton) navGoogleLoginButton.classList.remove('hidden');
            if (googleLoginButtonHome) googleLoginButtonHome.classList.remove('hidden');
            if (homeSignInMessage) homeSignInMessage.classList.remove('hidden');

            // Disable all form submit buttons as a fallback, modules should handle
            // their own button states based on isAuthReady
            document.querySelectorAll('button[type="submit"]').forEach(btn => {
                btn.setAttribute('disabled', 'disabled');
            });

            showSection('home-section'); // CORRECTED: Use 'home-section' to match HTML ID
        }
    });
}

// Add/remove Firestore listener unsubscribe function
export function addUnsubscribe(key, unsubscribeFn) {
    if (currentUnsubscribeFunctions[key]) {
        currentUnsubscribeFunctions[key](); // Unsubscribe old one if it exists
    }
    currentUnsubscribeFunctions[key] = unsubscribeFn;
}

export function removeUnsubscribe(key) {
    if (currentUnsubscribeFunctions[key]) {
        currentUnsubscribeFunctions[key]();
        delete currentUnsubscribeFunctions[key];
    }
}


// Initialize Firebase on window load
window.onload = initializeFirebase;
