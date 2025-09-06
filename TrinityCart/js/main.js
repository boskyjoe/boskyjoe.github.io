// js/main.js
import { ModuleRegistry, AllCommunityModule } from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';
import { appState } from './state.js';
import { firebaseConfig, USERS_COLLECTION_PATH } from './config.js';

import { updateUI, showView, showSuppliersView } from './ui.js';
import { showCategoriesView,refreshSuppliersGrid,refreshCategoriesGrid} from './ui.js';
import { showModal } from './modal.js';


import { addSupplier, updateSupplier, setSupplierStatus } from './api.js';
import { addCategory, updateCategory, setCategoryStatus } from './api.js';

import { showSaleTypesView, refreshSaleTypesGrid } from './ui.js';
import { addSaleType, updateSaleType, setSaleTypeStatus } from './api.js';

import { showPaymentModesView, refreshPaymentModesGrid } from './ui.js';
import { addPaymentMode, updatePaymentMode, setPaymentModeStatus } from './api.js';


import { showProductsView, refreshProductsGrid } from './ui.js';
import { addProduct, updateProduct, setProductStatus } from './api.js';

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


function setupEventListeners() {
    // Use event delegation for dynamically created elements
    document.addEventListener('click', (e) => {
        if (e.target.closest('#login-button')) {
            handleLogin();
        }
        if (e.target.closest('#logout-button')) {
            handleLogout();
        }
    });

    // --- NEW, SMARTER SIDEBAR NAVIGATION HANDLER ---
    const sidebarNav = document.getElementById('sidebar-nav');
    sidebarNav.addEventListener('click', (e) => {
        const link = e.target.closest('.nav-link');
        if (link) {
            e.preventDefault();
            const viewId = link.dataset.viewId;
            console.log(`[main.js] Nav link clicked. View ID: ${viewId}`);
            // First, always show the correct view div
            showView(viewId);

            // Second, if this view needs special data, call its function
            if (viewId === 'suppliers-view') {
                showSuppliersView();
            }

            if (viewId === 'products-view') {
                showProductsView();
            }
            // We will add more 'if' statements here for other modules
            // else if (viewId === 'products-view') { showProductsView(); }
        }
    });
    
    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    mobileMenuButton.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('active');
    });

    // --- ALL THE SUPPLIER FORM AND GRID LISTENERS ---
    // (This part remains the same as before)

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
                await showModal('success', 'Success', 'Supplier has been added successfully.');
                addSupplierForm.reset();
                refreshSuppliersGrid(); // Refresh the grid
            } catch (error) {
                console.error("Error adding supplier:", error);
                await showModal('error', 'Error', 'Failed to add the supplier. Please try again.');
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
            await showModal('error', 'Error', 'Failed to update the supplier. Please try again.');
            refreshSuppliersGrid(); // Refresh grid to revert failed change
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
                const confirmed = await showModal('confirm', 'Confirm Deactivation', `Are you sure you want to Deactivate  this supplier?`);
                if (confirmed) {
                    await setSupplierStatus(docId, false, user);
                    refreshSuppliersGrid();
                }
            } else if (target.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this supplier?`);
                if (confirmed) {
                    await setSupplierStatus(docId, true, user);
                    refreshSuppliersGrid();
                }
            }
        });
    }

    // Handler for the Admin Modules hub page and back links
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.master-data-card, .back-link');
        console.log(`[main.js] Nav link clicked. View ID: ${viewId}`);
        if (card) {
            e.preventDefault();
            const viewId = card.dataset.viewId;
            if (viewId === 'categories-view') {
                showCategoriesView();
            } else if (viewId === 'sale-types-view') { 
                showSaleTypesView();
            } else if (viewId) {
                showView(viewId);
            } else if (viewId === 'payment-modes-view') {
                showPaymentModesView();
            }
        }
    });

    // Add Category Form
    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            const categoryName = document.getElementById('categoryName-input').value.trim();
            if (!user || !categoryName) return;

            try {
                await addCategory(categoryName, user);
                await showModal('success', 'Success', 'Category has been added successfully.');
                addCategoryForm.reset();
                refreshCategoriesGrid();
            } catch (error) { 
                console.error("Error adding category:", error); 
                await showModal('error', 'Error', 'Failed to add the category. Please try again.');
            }
        });
    }


    // In-Grid Update for Categories
    document.addEventListener('updateCategory', async (e) => {
        const { docId, updatedData } = e.detail;
        const user = appState.currentUser;
        if (!user) return;
        try {
            await updateCategory(docId, updatedData, appState.currentUser);
        } catch (error) {
            console.error("Error updating product category:", error);
            await showModal('error', 'Error', 'Failed to update the product category. Please try again.');
            refreshCategoriesGrid(); // Refresh grid to revert failed change
        }
        
    });

    // Action Buttons for Categories Grid
    const categoriesGrid = document.getElementById('categories-grid');
    if (categoriesGrid) {
        categoriesGrid.addEventListener('click', async (e) => {
            const user = appState.currentUser;
            if (!user) return;

            const button = e.target.closest('button');
            if (!button) return;

            const docId = target.dataset.id;
            if (!docId) return;

            if (button.classList.contains('btn-deactivate')) {
                const confirmed = await showModal('confirm', 'Confirm Deactivation ', `Are you sure you want to DeActivate this product category?`);
                if (confirmed) {
                    await setCategoryStatus(docId, false, user);
                    refreshCategoriesGrid();
                }
            } else if (button.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this product category?`);
                if (confirmed) {
                    await setCategoryStatus(docId, true, user);
                    refreshCategoriesGrid();
                }
            }
        });
    }

     // Add Sale Type Form
    const addSaleTypeForm = document.getElementById('add-sale-type-form');
    if (addSaleTypeForm) {
        addSaleTypeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            const saleTypeName = document.getElementById('saleTypeName-input').value.trim();
            if (!user || !saleTypeName) return;

            try {
                await addSaleType(saleTypeName, user);
                await showModal('success', 'Success', 'Sales Type has been added successfully.');
                addSaleTypeForm.reset();
                refreshSaleTypesGrid();
            } catch (error) { 
                console.error("Error adding sale type:", error); 
                await showModal('error', 'Error', 'Failed to add the Sales Type. Please try again.');

            }
        });
    }

    
    // In-Grid Update for Sale Types
    document.addEventListener('updateSaleType', async (e) => {
        const { docId, updatedData } = e.detail;
        try {
            await updateSaleType(docId, updatedData, appState.currentUser);
        } catch (error) {
            console.error("Error updating sales type:", error);
            await showModal('error', 'Error', 'Failed to update the sales type. Please try again.');
            refreshSaleTypesGrid(); // Refresh grid to revert failed change
        }
    });

    // Action Buttons for Sale Types Grid
    const saleTypesGrid = document.getElementById('sale-types-grid');
    if (saleTypesGrid) {
        saleTypesGrid.addEventListener('click', async (e) => {
            const user = appState.currentUser;
            if (!user) return;

            const button = e.target.closest('button');
            if (!button) return;
            const docId = button.dataset.id;
            if (!docId) return;

            if (button.classList.contains('btn-deactivate')) {
                const confirmed = await showModal('confirm', 'Confirm Deactivation ', `Are you sure you want to DeActivate this sales type?`);
                if (confirmed) {
                    await setSaleTypeStatus(docId, false, user);
                    refreshSaleTypesGrid();
                }
            } else if (button.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this sales type?`);
                if (confirmed) {
                    await setSaleTypeStatus(docId, true, user);
                    refreshSaleTypesGrid();
                }
            }
        });
    }









     // Add Payment type Form
    const addPaymentTypeForm = document.getElementById('add-payment-mode-form');
    if (addPaymentTypeForm) {
        addPaymentTypeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            const paymentMode = document.getElementById('paymentModeName-input').value.trim();
            if (!user || !paymentMode) return;

            try {
                await addPaymentMode(paymentMode, user);
                await showModal('success', 'Success', 'Payment Mode has been added successfully.');
                addPaymentTypeForm.reset();
                refreshPaymentModesGrid();
            } catch (error) { 
                console.error("Error adding payment mode:", error); 
                await showModal('error', 'Error', 'Failed to add the Payment Mode. Please try again.');

            }
        });
    }

    
    // In-Grid Update for Sale Types
    document.addEventListener('updatePaymentMode', async (e) => {
        const { docId, updatedData } = e.detail;
        try {
            await updatePaymentMode(docId, updatedData, appState.currentUser);
        } catch (error) {
            console.error("Error updating payment mode:", error);
            await showModal('error', 'Error', 'Failed to update the payment mode. Please try again.');
            refreshPaymentModesGrid(); // Refresh grid to revert failed change
        }
    });

    // Action Buttons for Sale Types Grid
    const paymentModeGrid = document.getElementById('payment-modes-grid');
    if (paymentModeGrid) {
        paymentModeGrid.addEventListener('click', async (e) => {
            const user = appState.currentUser;
            if (!user) return;

            const button = e.target.closest('button');
            if (!button) return;
            const docId = button.dataset.id;
            if (!docId) return;

            if (button.classList.contains('btn-deactivate')) {
                const confirmed = await showModal('confirm', 'Confirm Deactivation ', `Are you sure you want to DeActivate this sales type?`);
                if (confirmed) {
                    await setPaymentModeStatus(docId, false, user);
                    refreshPaymentModesGrid();
                }
            } else if (button.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this sales type?`);
                if (confirmed) {
                    await setPaymentModeStatus(docId, true, user);
                    refreshPaymentModesGrid();
                }
            }
        });
    }












    
    // Add Product Form
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            const unitPrice = parseFloat(document.getElementById('unitPrice-input').value);
            const unitMarginPercentage = parseFloat(document.getElementById('unitMargin-input').value);
            const sellingPrice = unitPrice * (1 + unitMarginPercentage / 100);

            const productData = {
                itemName: document.getElementById('itemName-input').value,
                category: document.getElementById('itemCategory-select').value,
                unitPrice: unitPrice,
                unitMarginPercentage: unitMarginPercentage,
                sellingPrice: sellingPrice,
            };

            try { 
                await addProduct(productData, user);
                await showModal('success', 'Success', 'Product has been added successfully.');
                addProductForm.reset();
                refreshProductsGrid();
            } catch (error) {
                console.error("Error adding sale type:", error); 
                await showModal('error', 'Error', 'Failed to add the Product. Please try again.');
            }

        });
    }
    

    // In-Grid Update Event
    document.addEventListener('updateProduct', async (e) => {
        const { docId, updatedData } = e.detail;
        const user = appState.currentUser;
        if (!user) return;
        try {
            await updateProduct(docId, updatedData, user);
        } catch (error) {
            console.error("Error updating Products:", error);
            await showModal('error', 'Error', 'Failed to update the Products. Please try again.');
            refreshProductsGrid(); // Refresh grid to revert failed change
        }
    });

    // Action Buttons (Activate/Deactivate) in Grid
    const productGrid = document.getElementById('products-catalogue-grid');
    if (productGrid) {
        productGrid.addEventListener('click', async (e) => {
            const user = appState.currentUser;
            if (!user) return;

            const target = e.target;
            const docId = target.dataset.id;
            if (!docId) return;

            if (target.classList.contains('btn-deactivate')) {
                const confirmed = await showModal('confirm', 'Confirm Deactivation', `Are you sure you want to Deactivate  this Product?`);
                if (confirmed) {
                    await setProductStatus(docId, false, user);
                    refreshSuppliersGrid();
                }
            } else if (target.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this Product?`);
                if (confirmed) {
                    await setProductStatus(docId, true, user);
                    refreshSuppliersGrid();
                }
            }
        });
    }

    







    


}


// --- APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Initializing...");
    // This MUST be done once at the start of the application.
    ModuleRegistry.registerModules([AllCommunityModule]);

    setupEventListeners();
    // The initial UI update is now handled by the onAuthStateChanged listener
});
