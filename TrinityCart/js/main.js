// js/main.js
import { ModuleRegistry, AllCommunityModule } from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';
import { appState } from './state.js';
import { firebaseConfig, USERS_COLLECTION_PATH } from './config.js';

import { updateUI, showView, showSuppliersView } from './ui.js';
import { showCategoriesView } from './ui.js';
import { showModal } from './modal.js';


import { addSupplier, updateSupplier, setSupplierStatus } from './api.js';
import { addCategory, updateCategory, setCategoryStatus } from './api.js';

import { showSaleTypesView } from './ui.js';
import { addSaleType, updateSaleType, setSaleTypeStatus } from './api.js';

import { showPaymentModesView } from './ui.js';
import { addPaymentMode, updatePaymentMode, setPaymentModeStatus } from './api.js';

import { showSeasonsView } from './ui.js';
import { addSeason, updateSeason, setSeasonStatus } from './api.js';

import { showSalesEventsView } from './ui.js';
import { addSalesEvent, updateSalesEvent, setSalesEventStatus } from './api.js';


import { showProductsView } from './ui.js';
import { addProduct, updateProduct, setProductStatus } from './api.js';

import { showUsersView, refreshUsersGrid } from './ui.js';
import { updateUserRole, setUserActiveStatus } from './api.js';


import { initializeMasterDataListeners } from './masterData.js';


import { addPurchaseInvoice } from './api.js';
import { addLineItem, calculateAllTotals, showPurchasesView,switchPurchaseTab, loadPaymentsForSelectedInvoice } from './ui.js';


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



async function handleSavePurchaseInvoice() {
    const user = appState.currentUser;
    if (!user) return showModal('error', 'Not Logged In', 'You must be logged in to save a purchase.');

    // 1. Collect Header Data
    const purchaseDate = document.getElementById('purchase-date').value;
    const supplierSelect = document.getElementById('purchase-supplier');
    const supplierId = supplierSelect.value;
    const supplierName = supplierSelect.options[supplierSelect.selectedIndex].text;
    const supplierInvoiceNo = document.getElementById('supplier-invoice-no').value;

    if (!purchaseDate || !supplierId) {
        return showModal('error', 'Missing Information', 'Please select a Purchase Date and a Supplier.');
    }

    // 2. Collect Line Item Data
    const lineItemRows = document.querySelectorAll('#purchase-line-items-container > div');
    const lineItems = [];
    for (const row of lineItemRows) {
        const masterProductId = row.querySelector('[data-field="masterProductId"]').value;
        if (!masterProductId) continue;

        const productSelect = row.querySelector('.line-item-product');
        const productName = productSelect.options[productSelect.selectedIndex].text;

        lineItems.push({
            masterProductId: masterProductId,
            productName: productName,
            quantity: parseFloat(row.querySelector('[data-field="quantity"]').value) || 0,
            unitPurchasePrice: parseFloat(row.querySelector('[data-field="unitPurchasePrice"]').value) || 0,
            discountType: row.querySelector('[data-field="discountType"]').value,
            discountValue: parseFloat(row.querySelector('[data-field="discountValue"]').value) || 0,
            taxPercentage: parseFloat(row.querySelector('[data-field="taxPercentage"]').value) || 0,
        });
    }

    if (lineItems.length === 0) {
        return showModal('error', 'No Items', 'Please add at least one product to the invoice.');
    }

    // 3. Perform Final Calculations
    let itemsSubtotal = 0, totalItemLevelTax = 0;
    lineItems.forEach(item => {
        item.grossPrice = item.quantity * item.unitPurchasePrice;
        item.discountAmount = item.discountType === 'Percentage' ? item.grossPrice * (item.discountValue / 100) : item.discountValue;
        item.netPrice = item.grossPrice - item.discountAmount;
        item.taxAmount = item.netPrice * (item.taxPercentage / 100);
        item.lineItemTotal = item.netPrice + item.taxAmount;
        itemsSubtotal += item.netPrice;
        totalItemLevelTax += item.taxAmount;
    });

    const invoiceDiscountType = document.getElementById('invoice-discount-type').value;
    const invoiceDiscountValue = parseFloat(document.getElementById('invoice-discount-value').value) || 0;
    const invoiceDiscountAmount = invoiceDiscountType === 'Percentage' ? itemsSubtotal * (invoiceDiscountValue / 100) : invoiceDiscountValue;
    const taxableAmountForInvoice = itemsSubtotal - invoiceDiscountAmount;
    const invoiceTaxPercentage = parseFloat(document.getElementById('invoice-tax-percentage').value) || 0;
    const invoiceLevelTaxAmount = taxableAmountForInvoice * (invoiceTaxPercentage / 100);
    const totalTaxAmount = totalItemLevelTax + invoiceLevelTaxAmount;
    const invoiceTotal = taxableAmountForInvoice + totalTaxAmount;

    // 4. Assemble the final invoice object
    const invoiceData = {
        purchaseDate: new Date(purchaseDate), supplierId, supplierName, supplierInvoiceNo,
        lineItems, itemsSubtotal, invoiceDiscountType, invoiceDiscountValue, invoiceDiscountAmount,
        taxableAmountForInvoice, totalItemLevelTax, invoiceTaxPercentage, invoiceLevelTaxAmount,
        totalTaxAmount, invoiceTotal
    };

    // 5. Save to Firestore
    try {
        await addPurchaseInvoice(invoiceData, user);
        await showModal('success', 'Success', `Purchase Invoice has been saved.`);
        document.getElementById('purchase-invoice-form').reset();
        document.getElementById('purchase-line-items-container').innerHTML = '';
        addLineItem();
        calculateAllTotals();
    } catch (error) {
        console.error("Error saving purchase invoice:", error);
        await showModal('error', 'Save Failed', 'There was an error saving the invoice.');
    }
}







function setupEventListeners() {
    // --- GLOBAL CLICK HANDLER (for dynamic elements) ---
    document.addEventListener('click', (e) => {
        const target = e.target;

        // Handle Login/Logout
        if (target.closest('#login-button')) {
            handleLogin();
        }
        if (target.closest('#logout-button')) {
            handleLogout();
        }

        // Handle Sidebar Navigation
        const navLink = target.closest('.nav-link');
        if (navLink) {
            e.preventDefault();
            const viewId = navLink.dataset.viewId;
            console.log(`[main.js] Navigating to view: ${viewId}`);

            // Call the appropriate function for the view
            switch (viewId) {
                case 'suppliers-view':
                    showSuppliersView();
                    break;
                case 'products-view':
                    showProductsView();
                    break;
                case 'categories-view':
                    showCategoriesView();
                    break;
                case 'payment-modes-view':
                    showPaymentModesView();
                    break;
                case 'sale-types-view':
                    showSaleTypesView();
                    break;
                case 'seasons-view':
                    showSeasonsView();
                    break;
                case 'sales-events-view':
                    showSalesEventsView();
                    break;
                case 'users-view':
                    showUsersView();
                    break;
                case 'purchases-view':
                    showPurchasesView();
                    break;
                default:
                    showView(viewId); // For simple views without special logic
            }
        }

        // Handle "Back to Admin" links
        const backLink = target.closest('.back-link');
        if (backLink) {
            e.preventDefault();
            const viewId = backLink.dataset.viewId;
            if (viewId) {
                showView(viewId);
            }
        }

        // Handle "Add Line Item" button in Purchase form
        if (target.closest('#add-line-item-btn')) {
            addLineItem();
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
                }
            } else if (target.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this supplier?`);
                if (confirmed) {
                    await setSupplierStatus(docId, true, user);
                }
            }
        });
    }


    // --- PURCHASE MANAGEMENT LISTENERS ---

    // --- FORM SUBMISSION HANDLERS ---
    const purchaseInvoiceForm = document.getElementById('purchase-invoice-form');
    if (purchaseInvoiceForm) {

         purchaseInvoiceForm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                // Check if the event target is a textarea, which should allow Enter.
                if (e.target.tagName.toLowerCase() !== 'textarea') {
                    e.preventDefault(); // Stop the form from submitting.
                }
            }
        });

        purchaseInvoiceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSavePurchaseInvoice(); 
        });
    }


    // --- OTHER LISTENERS ---
    const purchaseFormContainer = document.getElementById('purchases-view');
    if (purchaseFormContainer) {
        purchaseFormContainer.addEventListener('input', (e) => {
            if (e.target.matches('.line-item-qty, .line-item-price, .line-item-tax, .line-item-discount-type, .line-item-discount-value, #invoice-discount-type, #invoice-discount-value, #invoice-tax-percentage')) {
                calculateAllTotals();
            }
        });
        purchaseFormContainer.addEventListener('click', (e) => {
            if (e.target.closest('.remove-line-item-btn')) {
                e.target.closest('.grid').remove();
                calculateAllTotals();
            }
        });
        // Auto-fill price listener
        const lineItemsContainer = document.getElementById('purchase-line-items-container');
        lineItemsContainer.addEventListener('change', (e) => {
            if (e.target.matches('.line-item-product')) {
                const selectedOption = e.target.options[e.target.selectedIndex];
                const price = selectedOption.dataset.unitPrice || 0;
                const priceInput = e.target.closest('.grid').querySelector('.line-item-price');
                priceInput.value = price;
                calculateAllTotals();
            }
        });
    }


    // Handle Tab Clicks
    const invoiceTab = document.getElementById('tab-invoices');
    if (invoiceTab) {
        invoiceTab.addEventListener('click', (e) => {
            e.preventDefault();
            switchPurchaseTab('invoices');
        });
    }
    const paymentsTab = document.getElementById('tab-payments');
    if (paymentsTab) {
        paymentsTab.addEventListener('click', (e) => {
            e.preventDefault();
            if (!paymentsTab.classList.contains('tab-disabled')) {
                // THE FIX: Switch the tab AND load the data.
                switchPurchaseTab('payments');
                loadPaymentsForSelectedInvoice();
            }
        });
    }

    // Handle Row Selection to show payments
    document.addEventListener('invoiceRowSelected', async (e) => {
        const { invoiceId } = e.detail;
        switchPurchaseTab('payments'); // Switch to the payments tab
        
        purchasePaymentsGridApi.setGridOption('loading', true);
        const payments = await getPaymentsForInvoice(invoiceId);
        purchasePaymentsGridApi.setGridOption('rowData', payments);
        purchasePaymentsGridApi.setGridOption('loading', false);
    });


    // Handle Action Button Clicks in the Invoices Grid
    const invoicesGrid = document.getElementById('purchase-invoices-grid');
    if (invoicesGrid) {
        invoicesGrid.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            const invoiceId = button.dataset.id;
            
            if (button.classList.contains('action-btn-edit')) {
                // ... logic to load invoice into form ...
            }
            
            // THE FIX: Specific logic for the payment button
            if (button.classList.contains('action-btn-payment')) {
                console.log(`Record payment for invoice: ${invoiceId}`);
                // Here you would open a payment modal.
                // For now, we can make it switch to the payments tab as a placeholder.
                appState.selectedPurchaseInvoiceId = invoiceId; // Make sure it's selected
                switchPurchaseTab('payments');
                loadPaymentsForSelectedInvoice();
            }
        });
    }


    // --- PURCHASE MANAGEMENT LISTENERS end---



    // Handler for the Admin Modules hub page and back links
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.master-data-card, .back-link');

        if (card) {
            e.preventDefault();
            const viewId = card.dataset.viewId;
            console.log(`[main.js] Nav link clicked. View ID: ${viewId}`);
            if (viewId === 'categories-view') {
                showCategoriesView();
            } else if (viewId === 'sale-types-view') {
                showSaleTypesView();
            } else if (viewId === 'payment-modes-view') {
                showPaymentModesView();
            } else if (viewId === 'seasons-view') {
                showSeasonsView();
            } else if (viewId === 'users-view') {
                showUsersView();
            } else if (viewId === 'sales-events-view') {
                showSalesEventsView();
            } else if (viewId) {
                showView(viewId);
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
                }
            } else if (button.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this product category?`);
                if (confirmed) {
                    await setCategoryStatus(docId, true, user);
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
                }
            } else if (button.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this sales type?`);
                if (confirmed) {
                    await setSaleTypeStatus(docId, true, user);
                }
            }
        });
    }

    // Add Payment mode Form
    const addPaymentModeForm = document.getElementById('add-payment-mode-form');
    if (addPaymentModeForm) {
        addPaymentModeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            const paymentMode = document.getElementById('paymentModeName-input').value.trim();
            if (!user || !paymentMode) return;

            try {
                await addPaymentMode(paymentMode, user);
                await showModal('success', 'Success', 'Payment Mode has been added successfully.');
                addPaymentModeForm.reset();
            } catch (error) {
                console.error("Error adding payment mode:", error);
                await showModal('error', 'Error', 'Failed to add the Payment Mode. Please try again.');

            }
        });
    }


    // In-Grid Update for payment  mode
    document.addEventListener('updatePaymentMode', async (e) => {
        const { docId, updatedData } = e.detail;
        try {
            await updatePaymentMode(docId, updatedData, appState.currentUser);
        } catch (error) {
            console.error("Error updating payment mode:", error);
            await showModal('error', 'Error', 'Failed to update the payment mode. Please try again.');
        }
    });

    // Action Buttons for payment mode Grid
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
                }
            } else if (button.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this sales type?`);
                if (confirmed) {
                    await setPaymentModeStatus(docId, true, user);
                }
            }
        });
    }


    // Add Season Form
    const addSeasonForm = document.getElementById('add-season-form');
    if (addSeasonForm) {
        addSeasonForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            const seasonName = document.getElementById('seasonName-input').value.trim();
            const startDate = document.getElementById('startDate-input').value;
            const endDate = document.getElementById('endDate-input').value;
            if (!user || !seasonName || !startDate || !endDate) return;

            const seasonData = {
                seasonName: seasonName,
                startDate: new Date(startDate), // Convert string to Date object
                endDate: new Date(endDate)
            };

            try {
                await addSeason(seasonData, user);
                await showModal('success', 'Success', 'Season has been added successfully.');
                addSeasonForm.reset();
            } catch (error) {
                console.error("Error adding season:", error);
                await showModal('error', 'Error', 'Failed to add the Season. Please try again.');
            }
        });
    }

    // In-Grid Update for Seasons
    document.addEventListener('updateSeason', async (e) => {
        const { docId, updatedData } = e.detail;

        try {
            await updateSeason(docId, updatedData, appState.currentUser);
        } catch (error) {
            console.error("Error updating season:", error);
            await showModal('error', 'Error', 'Failed to update the season. Please try again.');
            refreshSeasonsGrid(); // Refresh grid to revert failed change
        }
    });

    // Action Buttons for Seasons Grid
    const seasonsGrid = document.getElementById('seasons-grid');
    if (seasonsGrid) {
        seasonsGrid.addEventListener('click', async (e) => {
            const user = appState.currentUser;
            if (!user) return;

            const button = e.target.closest('button');
            if (!button) return;
            const docId = button.dataset.id;
            if (!docId) return;

            if (button.classList.contains('btn-deactivate')) {
                const confirmed = await showModal('confirm', 'Confirm Deactivation ', `Are you sure you want to DeActivate this Season?`);
                if (confirmed) {
                    await setSeasonStatus(docId, false, user);
                }
            } else if (button.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this Season?`);
                if (confirmed) {
                    await setSeasonStatus(docId, true, user);
                }
            }
        });
    }

    // Add Sales Event Form
    const addEventForm = document.getElementById('add-event-form');
    if (addEventForm) {
        addEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            const eventName = document.getElementById('eventName-input').value.trim();
            const parentSeasonData = JSON.parse(document.getElementById('parentSeason-select').value);
            const startDate = document.getElementById('eventStartDate-input').value;
            const endDate = document.getElementById('eventEndDate-input').value;

            if (!user || !eventName || !parentSeasonData || !startDate || !endDate) return;

            const eventData = {
                eventName: eventName,
                seasonId: parentSeasonData.seasonId,
                seasonName: parentSeasonData.seasonName, // Denormalized name
                eventStartDate: new Date(startDate),
                eventEndDate: new Date(endDate)
            };

            try {
                await addSalesEvent(eventData, user);
                await showModal('success', 'Success', 'Sales Event has been added successfully.');
                addEventForm.reset();
            } catch (error) {
                console.error("Error adding event:", error);
                await showModal('error', 'Error', 'Failed to add the Sales Event. Please try again.');
            }
        });
    }



    // In-Grid Update for Sales Events
    document.addEventListener('updateSalesEvent', async (e) => {
        const { docId, updatedData } = e.detail;

        try {
            await updateSalesEvent(docId, updatedData, appState.currentUser);
        } catch (error) {
            console.error("Error updating Sales Event:", error);
            await showModal('error', 'Error', 'Failed to update the Sales Event. Please try again.');
        }

    });

    // Action Buttons for Sales Events Grid
    const salesEventsGrid = document.getElementById('sales-events-grid');
    if (salesEventsGrid) {
        salesEventsGrid.addEventListener('click', async (e) => {
            const user = appState.currentUser;
            if (!user) return;

            const button = e.target.closest('button');
            if (!button) return;
            const docId = button.dataset.id;
            if (!docId) return;

            if (button.classList.contains('btn-deactivate')) {
                const confirmed = await showModal('confirm', 'Confirm Deactivation ', `Are you sure you want to DeActivate this Sales Event?`);
                if (confirmed) {
                    await setSalesEventStatus(docId, false, user);
                }
            } else if (button.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this Sales Event?`);
                if (confirmed) {
                    await setSalesEventStatus(docId, true, user);
                }
            }

        });
    }






    // In-Grid Update for User Roles
    document.addEventListener('updateUserRole', async (e) => {
        const { uid, newRole } = e.detail;
        const adminUser = appState.currentUser;
        try {
            await updateUserRole(uid, newRole, adminUser);
            await showModal('success', 'Role Updated', `User role has been changed to ${newRole}.`);
            refreshUsersGrid();
        } catch (error) {
            console.error("Error updating user role:", error);
            await showModal('error', 'Update Failed', 'Could not update the user role.');
        }
    });


    // Action Buttons for Users Grid
    const usersGrid = document.getElementById('users-grid');
    if (usersGrid) {
        usersGrid.addEventListener('click', async (e) => {
            const user = appState.currentUser;
            if (!user) return;

            const button = e.target.closest('button');
            if (!button) return;
            const uid = button.dataset.id;
            if (!uid) return;

            if (button.classList.contains('btn-deactivate')) {
                const confirmed = await showModal('confirm', 'Confirm Deactivation ', `Are you sure you want to DeActivate this User?`);
                if (confirmed) {
                    await setUserActiveStatus(uid, false, user);
                }
            } else if (button.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this User?`);
                if (confirmed) {
                    await setUserActiveStatus(uid, true, user);
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

            if (isNaN(unitPrice) || isNaN(unitMarginPercentage)) {
                return showModal('error', 'Invalid Input', 'Unit Price and Unit Margin must be valid numbers.');
            }

            const sellingPrice = unitPrice * (1 + unitMarginPercentage / 100);

            const productData = {
                itemName: document.getElementById('itemName-input').value,
                categoryId: document.getElementById('itemCategory-select').value,
                unitPrice: unitPrice,
                unitMarginPercentage: unitMarginPercentage,
                sellingPrice: sellingPrice,
            };

            if (!productData.categoryId) {
                return showModal('error', 'Invalid Input', 'Please select a product category.');
            }
            try {
                await addProduct(productData, user);
                await showModal('success', 'Success', 'Product has been added successfully.');
                addProductForm.reset();
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
                }
            } else if (target.classList.contains('btn-activate')) {
                const confirmed = await showModal('confirm', 'Confirm Activation', `Are you sure you want to Activate this Product?`);
                if (confirmed) {
                    await setProductStatus(docId, true, user);
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

    initializeMasterDataListeners();

    setupEventListeners();
    // The initial UI update is now handled by the onAuthStateChanged listener
});
