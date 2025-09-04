// js/main.js
import { appState } from './state.js';
import { updateUI, showView } from './ui.js';
import { firebaseConfig, USERS_COLLECTION_PATH } from './config.js';


import { showSuppliersView } from './ui.js';
import { addSupplier, updateSupplier, setSupplierStatus } from './api.js';


// --- FIREBASE INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- AUTHENTICATION LOGIC ---

/**
 * Initiates the Google Sign-In popup flow.
 */
function handleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        console.error("Google Sign-In Error:", error);
        alert("Login failed. Please try again.");
    });
}

/**
 * Signs the user out of Firebase.
 */
function handleLogout() {
    auth.signOut();
}

/**
 * This is the main authentication listener.
 * It fires when the app loads and whenever the user's login state changes.
 */
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in. Now, let's get their role from Firestore.
        console.log("Firebase user signed in:", user.email);
        
        const userDocRef = db.collection(USERS_COLLECTION_PATH).doc(user.uid);
        const docSnap = await userDocRef.get();

        // THE FIX: Changed docSnap.exists() to docSnap.exists
        if (docSnap.exists && docSnap.data().isActive) {
            // User exists in our DB and is active.
            const userData = docSnap.data();
            appState.currentUser = {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                role: userData.role // The crucial role from Firestore!
            };
            console.log("User role set to:", appState.currentUser.role);
        } else {
            // User is not in our DB or is inactive. Treat as a guest.
            if (!docSnap.exists) {
                console.warn("User document not found in Firestore for UID:", user.uid);
            } else {
                console.warn("User is marked as inactive in Firestore.");
            }
            appState.currentUser = {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                role: 'guest' // Assign a non-privileged guest role
            };
            alert("Your account is not authorized for this application or has been deactivated. Please contact an administrator.");
        }
    } else {
        // User is signed out.
        console.log("User signed out.");
        appState.currentUser = null;
    }
    // Update the entire UI based on the new state (logged in or out).
    updateUI();
});


// --- EVENT LISTENER SETUP ---
function setupEventListeners() {

        // Add click handler for the "Supplier Management" nav link
        const sidebarNav = document.getElementById('sidebar-nav');
        sidebarNav.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link');
            if (link && link.dataset.viewId === 'suppliers-view') {
                e.preventDefault();
                showSuppliersView();
            }
        });

        // Add Supplier Form Submission
        const addSupplierForm = document.getElementById('add-supplier-form');
        if (addSupplierForm) {
            addSupplierForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = appState.currentUser;
                if (!user) return alert("You must be logged in.");

                const supplierData = {
                    supplierName: document.getElementById('supplierName-input').value,
                    address: document.getElementById('address-input').value,
                    contactNo: document.getElementById('contactNo-input').value,
                    contactEmail: document.getElementById('contactEmail-input').value,
                    creditTerm: document.getElementById('creditTerm-input').value,
                };

                try {
                    await addSupplier(supplierData, user);
                    alert('Supplier added successfully!');
                    addSupplierForm.reset();
                    showSuppliersView(); // Refresh the grid
                } catch (error) {
                    console.error("Error adding supplier:", error);
                    alert("Failed to add supplier.");
                }
            });
        }

        // In-Grid Update Event
        document.addEventListener('updateSupplier', async (e) => {
            const { docId, updatedData } = e.detail;
            const user = appState.currentUser;
            if (!user) return;
            try {
                await updateSupplier(docId, updatedData, user);
            } catch (error) {
                console.error("Error updating supplier:", error);
                alert("Failed to update supplier.");
                showSuppliersView(); // Refresh grid to revert failed change
            }
        });

        // Action Buttons (Activate/Deactivate) in Grid
        const suppliersGrid = document.getElementById('suppliers-grid');
        if (suppliersGrid) {
            suppliersGrid.addEventListener('click', async (e) => {
                const user = appState.currentUser;
                if (!user) return;

                const target = e.target;
                const docId = target.dataset.id;
                if (!docId) return;

                if (target.classList.contains('btn-deactivate')) {
                    if (confirm(`Are you sure you want to DEACTIVATE this supplier?`)) {
                        await setSupplierStatus(docId, false, user);
                        showSuppliersView();
                    }
                } else if (target.classList.contains('btn-activate')) {
                    if (confirm(`Are you sure you want to ACTIVATE this supplier?`)) {
                        await setSupplierStatus(docId, true, user);
                        showSuppliersView();
                    }
                }
            });
        }






        // Use event delegation for dynamically created elements
        document.addEventListener('click', (e) => {
            // Check if the clicked element or its parent is the login button
            if (e.target.closest('#login-button')) {
                handleLogin();
            }
            // Check if the clicked element or its parent is the logout button
            if (e.target.closest('#logout-button')) {
                handleLogout();
            }
    });

    // Sidebar navigation
    sidebarNav.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (link) {
            e.preventDefault();
            const viewId = link.dataset.viewId;
            showView(viewId);
        }
    });
    
    // Mobile menu toggle
    const sidebar = document.getElementById('sidebar');
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    mobileMenuButton.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

// --- APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Initializing...");
    setupEventListeners();
    // The initial UI update is now handled by the onAuthStateChanged listener
});
