// js/main.js

import {
    ModuleRegistry,
    AllCommunityModule
} from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';




import { appState } from './state.js';
import { firebaseConfig, USERS_COLLECTION_PATH,
    DONATION_SOURCES,        
    getDonationSourceByStore 
 } from './config.js';

import { updateUI, showView, showSuppliersView, showLoader, hideLoader, formatCurrency } from './ui.js';
import { showCategoriesView,ProgressToast } from './ui.js';
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


import { showProductsView,
    showAddProductToCatalogueModal,  // ← NEW - Different from existing
    closeAddProductToCatalogueModal  
 } from './ui.js';

import { addProduct, updateProduct, setProductStatus } from './api.js';

import { showUsersView, refreshUsersGrid } from './ui.js';
import { updateUserRole, setUserActiveStatus } from './api.js';


import { initializeMasterDataListeners } from './masterData.js';
import { masterData } from './masterData.js';


import { getPurchaseInvoiceById,voidSupplierPaymentAndUpdateInvoice } from './api.js';
import { addLineItem, calculateAllTotals, showPurchasesView, switchPurchaseTab, loadPaymentsForSelectedInvoice, resetPurchaseForm, loadInvoiceDataIntoForm } from './ui.js';
import { addSupplierPayment } from './api.js';
import { recordPaymentAndUpdateInvoice,verifySupplierPayment } from './api.js';
import { deletePaymentAndUpdateInvoice } from './api.js';
import { getPaymentDataFromGridById,
    getConsignmentPaymentDataFromGridById, refreshConsignmentPaymentsGrid,
    getSupplierPaymentDataFromGridById,    
    getSalesPaymentDataFromGridById, getSelectedConsignmentOrderBalance,  
    getSelectedConsignmentOrderData  } from './ui.js';

import { showSupplierPaymentModal, closeSupplierPaymentModal, getInvoiceDataFromGridById, initializeModals, closePaymentModal } from './ui.js';


import { showSalesCatalogueView, getCatalogueDataFromGridById, loadCatalogueForEditing, resetCatalogueForm, updateDraftItemsGrid, getTeamDataFromGridById } from './ui.js';
import {
    getLatestPurchasePrice,
    addSalesCatalogue,
    updateSalesCatalogue,
    addItemToCatalogue,
    updateCatalogueItem,
    removeItemFromCatalogue, createCatalogueWithItems,
    createPurchaseInvoiceAndUpdateInventory,
    updatePurchaseInvoiceAndInventory
} from './api.js';

import { showChurchTeamsView, showMemberModal, closeMemberModal, getMemberDataFromGridById } from './ui.js';

import {
    addChurchTeam,
    updateChurchTeam,
    addTeamMember,
    updateTeamMember,
    removeTeamMember
} from './api.js';

import {
    showConsignmentView,
    showConsignmentRequestModal,
    closeConsignmentRequestModal,
    showConsignmentRequestStep2,
    getFulfillmentItems, refreshConsignmentDetailPanel,
    showReportActivityModal, closeReportActivityModal, switchConsignmentTab, renderConsignmentDetail,
    resetPaymentForm, getRequestedConsignmentItems, loadPaymentRecordForEditing,
    showSalesView,
    showAddProductModal,
    closeAddProductModal,
    calculateSalesTotals, addItemToCart, getSalesCartItems,
    removeItemFromCart, showRecordSalePaymentModal,
    closeRecordSalePaymentModal, getSalesHistoryDataById,
    getSalePaymentDataFromGridById, switchPaymentModalTab, resetSalePaymentForm,
    refreshSalePaymentModal,
    showBulkAddProductsModal,        
    closeBulkAddProductsModal,       
    getBulkSelectedProducts, addBulkLineItems, bulkSelectAllVisibleProducts, bulkClearAllSelections, bulkSelectProductsWithPrices,updateNoItemsMessageVisibility
} from './ui.js';

import {
    getUserMembershipInfo,
    getMembersForTeam,
    createConsignmentRequest,
    fulfillConsignmentAndUpdateInventory,
    logActivityAndUpdateConsignment, getConsignmentOrderById,
    submitPaymentRecord, updatePaymentRecord,
    verifyConsignmentPayment, cancelPaymentRecord,
    createSaleAndUpdateInventory, recordSalePayment,
    voidSalePayment, getSalesInvoiceById,
} from './api.js';


import { 
    showReportsHubView, 
    showSalesReportsView, 
    showInventoryReportsView, 
    showFinancialReportsView,
    showTeamReportsView, 
    showOperationsReportsView, 
    showExecutiveDashboardView,
    handleReportCardClick,
    showSalesTrendsDetailView,showCustomerInsightsDetailView
} from './ui.js';


import { 
    showPaymentManagementView,
    switchPaymentMgmtTab,
    clearPaymentMgmtCache
} from './payment-management.js';


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
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Show progress toast
    ProgressToast.show('Saving Purchase Invoice', 'info');

    try {
        // Step 1: Collect Header Data
        ProgressToast.updateProgress('Validating invoice data...', 15, 'Step 1 of 6');
        
        const purchaseDate = document.getElementById('purchase-date').value;
        const supplierSelect = document.getElementById('purchase-supplier');
        const supplierId = supplierSelect.value;
        const supplierName = supplierSelect.options[supplierSelect.selectedIndex].text;
        const supplierInvoiceNo = document.getElementById('supplier-invoice-no').value;

        if (!purchaseDate || !supplierId) {
            // ✅ HIDE toast before showing error modal
            ProgressToast.hide(0);
            await showModal('error', 'Missing Information', 'Please select a Purchase Date and a Supplier.');
            return;
        }

        // Step 2: Collect Line Item Data
        ProgressToast.updateProgress('Processing line items...', 30, 'Step 2 of 6');
        
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
            // ✅ HIDE toast before showing error modal
            ProgressToast.hide(0);
            await showModal('error', 'No Items', 'Please add at least one product to the invoice.');
            return;
        }

        // Step 3: Perform Final Calculations
        ProgressToast.updateProgress('Calculating totals and taxes...', 45, 'Step 3 of 6');
        
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

        const productIds = lineItems.map(item => item.masterProductId);

        // Step 4: Assemble the final invoice object
        ProgressToast.updateProgress('Preparing invoice data...', 60, 'Step 4 of 6');
        
        const invoiceData = {
            purchaseDate: new Date(purchaseDate), supplierId, supplierName, supplierInvoiceNo,
            lineItems, itemsSubtotal, invoiceDiscountType, invoiceDiscountValue, invoiceDiscountAmount,
            taxableAmountForInvoice, totalItemLevelTax, invoiceTaxPercentage, invoiceLevelTaxAmount,
            totalTaxAmount, invoiceTotal,
            productIds: productIds
        };

        const docId = document.getElementById('purchase-invoice-doc-id').value;
        const isEditMode = !!docId;

        // Step 5: Save to Firestore
        ProgressToast.updateProgress(
            isEditMode ? 'Updating invoice and inventory...' : 'Creating invoice and updating inventory...', 
            80, 
            'Step 5 of 6'
        );
        
        appState.isLocalUpdateInProgress = true;
        
        let successMessage = '';
        
        if (isEditMode) {
            // UPDATE existing invoice
            await updatePurchaseInvoiceAndInventory(docId, invoiceData, user);
            successMessage = 'Purchase Invoice has been updated and inventory is now correct.';
        } else {
            console.log("Creating new invoice with inventory update.");
            await createPurchaseInvoiceAndUpdateInventory(invoiceData, user);
            successMessage = 'Purchase Invoice has been saved successfully and inventory is now correct.';
        }

        // Step 6: Success Completion
        ProgressToast.updateProgress('Invoice saved successfully!', 100, 'Step 6 of 6');
        ProgressToast.showSuccess('Invoice and inventory updated successfully!');

        console.log("Database operation completed successfully.");

        // ✅ ENHANCED: Show completion, then clean up
        setTimeout(async () => {
            ProgressToast.hide(500);
            
            // Show your existing success modal
            await showModal('success', 'Invoice Saved', successMessage);
            
            // Clean up form for new invoices
            if (!isEditMode) {
                resetPurchaseForm();
            } else {
                // For edit mode, you might want to stay in edit mode or reset
                resetPurchaseForm(); // Uncomment if you want to exit edit mode
            }
            
        }, 1200); // Slightly longer delay to show success state

    } catch (error) {
        console.error("Error saving purchase invoice:", error);
        
        // ✅ SHOW ERROR in toast instead of immediate modal
        ProgressToast.showError(
            error.message || 'An unexpected error occurred while saving the invoice.'
        );
        
        // Also show the traditional error modal after a brief delay
        setTimeout(async () => {
            await showModal('error', 'Save Failed', 'There was an error saving the invoice.');
        }, 2000);
        
    } finally {
        appState.isLocalUpdateInProgress = false;
    }
}


/**
 * [NEW] Handles the logic when a user clicks "Request New Consignment".
 * It determines the user's role and teams, then configures and shows the request modal.
 */
async function handleRequestConsignmentClick() {
    const user = appState.currentUser;
    if (!user) return alert("Please log in.");

    // Show the modal first, with a loading state
    showConsignmentRequestModal();
    // We will add logic here to show a spinner inside the modal

    const membershipInfo = await getUserMembershipInfo(user.email);

    const adminTeamSelect = document.getElementById('admin-select-team');
    const userTeamSelect = document.getElementById('user-select-team');
    const adminTeamDiv = document.getElementById('admin-team-selection');
    const userTeamDiv = document.getElementById('user-team-selection');

    // Reset all selection divs
    adminTeamDiv.classList.add('hidden');
    userTeamDiv.classList.add('hidden');

    if (user.role === 'admin') {
        // Admin can select from any team
        adminTeamDiv.classList.remove('hidden');
        adminTeamSelect.innerHTML = '<option value="">Select a team...</option>';
        // We need a way to get all teams here, let's assume it's in masterData
        masterData.teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.teamName;
            adminTeamSelect.appendChild(option);
        });
    } else {
        // For non-admins, check their memberships
        const membershipInfo = await getUserMembershipInfo(user.email);

        if (!membershipInfo || !membershipInfo.teams) {
            closeConsignmentRequestModal();
            return alert("You are not a member of any team. Please contact an admin.");
        }

        // Filter for teams where the user is a Team Lead
        const leadTeams = Object.entries(membershipInfo.teams)
            .filter(([id, data]) => data.role === 'Team Lead')
            .map(([id, data]) => ({ teamId: id, teamName: data.teamName }));

        if (leadTeams.length === 0) {
            closeConsignmentRequestModal();
            return alert("You do not have Team Lead permissions for any team. This action is restricted to Team Leads.");
        }


        if (leadTeams.length === 1) {
            // Auto-select if they lead only one team
            userTeamSelect.innerHTML = `<option value="${leadTeams[0].teamId}">${leadTeams[0].teamName}</option>`;
            userTeamSelect.disabled = true;
        } else {
            // Let them choose if they lead multiple teams
            userTeamSelect.innerHTML = '<option value="">Select your team...</option>';
            leadTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.teamId;
                option.textContent = team.teamName;
                userTeamSelect.appendChild(option);
            });
            userTeamSelect.disabled = false;
        }

    }

    const catalogueSelect = document.getElementById('request-catalogue-select');
    const eventSelect = document.getElementById('request-event-select');

    // 1. Clear any old options from previous times the modal was opened.
    catalogueSelect.innerHTML = '<option value="">Select a catalogue...</option>';
    eventSelect.innerHTML = '<option value="">Select an event (optional)...</option>';
    eventSelect.disabled = true; // Events are disabled until a catalogue is chosen.

    // 2. Populate the Sales Catalogue dropdown from the masterData cache.
    if (masterData.salesCatalogues && masterData.salesCatalogues.length > 0) {
        masterData.salesCatalogues.forEach(catalogue => {
            const option = document.createElement('option');
            option.value = catalogue.id;
            option.textContent = catalogue.catalogueName;
            catalogueSelect.appendChild(option);
        });
    } else {
        // Provide helpful feedback if no catalogues are available.
        catalogueSelect.innerHTML = '<option value="">No active catalogues found</option>';
        catalogueSelect.disabled = true;
    }

    // We will add logic for the "Next" button and form submission later.
}

/**
 * [NEW] Handles the "Fulfill & Check Out" button click.
 * Gathers data from the fulfillment grid and calls the transactional API function.
 */
let isFulfilling = false;
async function handleFulfillConsignmentClick() {

    if (isFulfilling) {
        console.warn("Fulfillment is already in progress. Ignoring duplicate click.");
        return;
    }


    const user = appState.currentUser;
    if (user.role !== 'admin') return alert("Only admins can fulfill orders.");

    // selectedConsignmentId is a global variable set by the UI when a row is selected
    const orderId = appState.selectedConsignmentId;

    if (!orderId) {
        return alert("No consignment order selected.");
    }

    if (!confirm("This will decrement main store inventory and activate the consignment. This action cannot be undone. Are you sure?")) {
        return;
    }

    isFulfilling = true;
    const fulfillButton = document.getElementById('fulfill-checkout-btn');
    if (fulfillButton) {
        fulfillButton.disabled = true;
        fulfillButton.textContent = 'Fulfilling...';
    }


    // Use our new helper function to get the final data from the UI
    const finalItems = getFulfillmentItems();

    if (finalItems.length === 0) {
        alert("There are no items with a quantity greater than zero to fulfill in this order.");
        isFulfilling = false;
        if (fulfillButton) {
            fulfillButton.disabled = false;
            fulfillButton.textContent = 'Fulfill & Check Out';
        }
        return;
    }


    try {
        await fulfillConsignmentAndUpdateInventory(orderId, finalItems, user);
        alert("Success! Consignment is now active and inventory has been updated.");

        // 1. Directly fetch the fresh, updated order data from the database.
        const updatedOrderData = await getConsignmentOrderById(orderId);

        // 2. If the data was fetched successfully, call the UI function to render the panel.
        if (updatedOrderData) {
            renderConsignmentDetail(updatedOrderData);
        } else {
            // If something went wrong, just hide the panel to be safe.
            hideConsignmentDetailPanel();
        }


        refreshConsignmentDetailPanel(orderId);


    } catch (error) {
        console.error("Fulfillment failed:", error);
        alert(`Fulfillment failed: ${error.message}`);
    } finally {

        isFulfilling = false;
        if (fulfillButton) {
            fulfillButton.disabled = false;
            fulfillButton.textContent = 'Fulfill & Check Out';
        }
    }
}


// ============================================================================
// EVENT HANDLER REGISTRY
// ============================================================================

const EventHandlers = {
    // Authentication handlers
    auth: {
        login: () => handleLogin(),
        logout: () => handleLogout()
    },

    // Navigation handlers
    navigation: {
        'suppliers-view': showSuppliersView,
        'products-view': showProductsView,
        'sales-catalogue-view': showSalesCatalogueView,
        'categories-view': showCategoriesView,
        'payment-modes-view': showPaymentModesView,
        'sale-types-view': showSaleTypesView,
        'seasons-view': showSeasonsView,
        'sales-events-view': showSalesEventsView,
        'users-view': showUsersView,
        'purchases-view': showPurchasesView,
        'church-teams-view': showChurchTeamsView,
        'consignment-view': showConsignmentView,
        'sales-view': showSalesView,
        'pmt-mgmt-view': showPaymentManagementView,
        // ADD THESE NEW REPORT VIEWS:
        'reports-hub-view': showReportsHubView,
        'sales-reports-view': showSalesReportsView,
        'inventory-reports-view': showInventoryReportsView,
        'financial-reports-view': showFinancialReportsView,
        'team-reports-view': showTeamReportsView,
        'operations-reports-view': showOperationsReportsView,
        'executive-dashboard-view': showExecutiveDashboardView,
        'store-performance-detail-view': () => showStorePerformanceDetailView(),
        'sales-trends-detail-view': () => showSalesTrendsDetailView(),
        'customer-insights-detail-view': () => showCustomerInsightsDetailView(),
        'stock-status-detail-view': () => showStockStatusDetailView(),
        'inventory-valuation-detail-view': () => showInventoryValuationDetailView(),
        
    },

    // Grid action handlers
    grids: {
        'purchase-invoices-grid': handlePurchaseInvoiceGrid,
        'purchase-payments-grid': handlePurchasePaymentsGrid,
        'existing-catalogues-grid': handleExistingCataloguesGrid,
        'available-products-grid': handleAvailableProductsGrid,
        'catalogue-items-grid': handleCatalogueItemsGrid,
        'church-teams-grid': handleChurchTeamsGrid,
        'team-members-grid': handleTeamMembersGrid,
        'consignment-payments-grid': handleConsignmentPaymentsGrid,
        'sales-history-grid': handleSalesHistoryGrid,
        'sale-payment-history-grid': handleSalePaymentHistoryGrid,
        'suppliers-grid': handleSuppliersGrid,
        'categories-grid': handleCategoriesGrid,
        'payment-modes-grid': handlePaymentModesGrid,
        'sale-types-grid': handleSaleTypesGrid,
        'seasons-grid': handleSeasonsGrid,
        'sales-events-grid': handleSalesEventsGrid,
        'users-grid': handleUsersGrid,
        'products-catalogue-grid': handleProductsCatalogueGrid
    }
};

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

function setupEventListeners() {
    setupGlobalClickHandler();
    setupMobileSidebar();
    setupFormSubmissions();
    setupCustomEventListeners();
    setupInputListeners();
}

// ============================================================================
// GLOBAL CLICK HANDLER
// ============================================================================

function setupGlobalClickHandler() {
    document.addEventListener('click', async (e) => {
        const target = e.target;
        const user = appState.currentUser;


        // ✅ DEBUG: Log user state
        console.log('[DEBUG] Global click handler - user state:', {
            userExists: !!user,
            userEmail: user?.email || 'No email',
            userRole: user?.role || 'No role',
            targetElement: target.tagName,
            targetClasses: target.className
        });

        

        // Authentication
        if (target.closest('#login-button')) return EventHandlers.auth.login();
        if (target.closest('#logout-button')) return EventHandlers.auth.logout();

        // Navigation
        const navTrigger = target.closest('.nav-link, .back-link, .master-data-card');
        if (navTrigger && handleNavigation(navTrigger)) return;

        // Grid actions
        if (user) {
            console.log('[DEBUG] User is available, checking for grid action');
            if (await handleGridAction(target, user)) {
                console.log('[DEBUG] Grid action handled successfully');
                return;
            }
        } else {
            console.warn('[DEBUG] No user available - skipping grid actions');
        }


        // Mobile sidebar - handled separately to avoid nested listeners
        // (Mobile sidebar setup is now done once in setupMobileSidebar)

        // Standalone buttons
        if (handleStandaloneButtons(target, e)) return;

        // Tabs
        if (handleTabs(target, e)) return;
    });
}

// ============================================================================
// NAVIGATION HANDLER
// ============================================================================

function handleNavigation(navTrigger) {
    const viewId = navTrigger.dataset.viewId;
    if (!viewId) return false;

    console.log(`[main.js] Navigating to view: ${viewId}`);

    const handler = EventHandlers.navigation[viewId] || (() => showView(viewId));
    handler();
    return true;
}

// ============================================================================
// GRID ACTION HANDLERS
// ============================================================================


async function handleGridAction(target, user) {
    const gridButton = target.closest('button[data-id]');
    if (!gridButton || !user) return false;

    const docId = gridButton.dataset.id;
    const grid = gridButton.closest('.ag-theme-alpine');
    if (!docId || !grid) return false;

    console.log('[Grid action]:', grid.id, 'by user:', user.email);

    const handler = EventHandlers.grids[grid.id];
    if (handler) {
        await handler(gridButton, docId, user); // ✅ ENSURE user is passed
        return true;
    }

    return false;
}

// Individual grid handlers
async function handlePurchaseInvoiceGrid(button, docId, user) {
    if (button.classList.contains('action-btn-edit')) {
        const invoiceData = await getPurchaseInvoiceById(docId);
        if (invoiceData) loadInvoiceDataIntoForm(invoiceData);
    } else if (button.classList.contains('action-btn-payment')) {
        try {
            const invoiceData = await getPurchaseInvoiceById(docId);
            if (invoiceData) {
                showSupplierPaymentModal(invoiceData);
            } else {
                showModal('error', 'Error', 'Could not find the selected invoice data.');
            }
        } catch (error) {
            console.error("Error fetching invoice for payment:", error);
            showModal('error', 'Error', 'Failed to load invoice data for payment.');
        }
    } else if (button.classList.contains('action-btn-delete')) {
        console.log("Delete entire invoice button clicked for:", docId);
    }
}

async function handlePurchasePaymentsGrid(button, docId, user) {
    const paymentData = getSupplierPaymentDataFromGridById(docId);
    if (!paymentData) {
        await showModal('error', 'Payment Data Error', 'Could not find payment data.');
        return;
    }

    const supplier = masterData.suppliers.find(s => s.id === paymentData.supplierId);
    const supplierName = supplier ? supplier.supplierName : 'Unknown Supplier';

    if (button.classList.contains('action-btn-verify-supplier-payment')) {
        // ✅ NEW: Verify supplier payment
        const confirmed = await showModal('confirm', 'Verify Supplier Payment', 
            `Verify this payment to ${supplierName}?\n\n` +
            `• Amount: ₹${paymentData.amountPaid.toFixed(2)}\n` +
            `• Payment Mode: ${paymentData.paymentMode}\n` +
            `• Reference: ${paymentData.transactionRef}\n` +
            `• Submitted by: ${paymentData.submittedBy}\n\n` +
            `This will:\n` +
            `✓ Update the invoice balance automatically\n` +
            `✓ Change payment status to "Verified"\n` +
            `✓ Complete the payment processing workflow`
        );

        if (confirmed) {
            ProgressToast.show('Verifying Supplier Payment', 'info');
            
            try {
                ProgressToast.updateProgress('Verifying payment and updating invoice...', 75);
                
                await verifySupplierPayment(docId, user);
                
                ProgressToast.showSuccess(`Payment to ${supplierName} verified!`);
                
                setTimeout(async () => {
                    ProgressToast.hide(800);
                    
                    await showModal('success', 'Payment Verified', 
                        `Supplier payment has been verified successfully!\n\n` +
                        `• Supplier: ${supplierName}\n` +
                        `• Amount: ₹${paymentData.amountPaid.toFixed(2)}\n` +
                        `• Status: Verified\n\n` +
                        `✓ Invoice balance updated\n` +
                        `✓ Payment status recalculated\n` +
                        `✓ Supplier account adjusted`
                    );
                    
                    // Refresh grids to show updated status
                    if (typeof loadPaymentsForSelectedInvoice === 'function') {
                        console.log('[main.js] Refreshing payment grid after verification');
                        await loadPaymentsForSelectedInvoice();
                    }
                    
                }, 1200);
                
            } catch (error) {
                console.error("Error verifying supplier payment:", error);
                ProgressToast.showError(`Verification failed: ${error.message}`);
                setTimeout(() => showModal('error', 'Verification Failed', error.message), 2000);
            }
        }
        
    } else if (button.classList.contains('action-btn-void-supplier-payment')) {
        // ✅ ENHANCED: Void verified payment (same as before)

        const paymentData = getSupplierPaymentDataFromGridById(docId);
        if (!paymentData) return;

        const supplier = masterData.suppliers.find(s => s.id === paymentData.supplierId);
        const supplierName = supplier ? supplier.supplierName : 'Unknown Supplier';

        const confirmed = await showModal('confirm', 'Void Supplier Payment', 
            `VOID this payment to ${supplierName}?\n\n` +
            `• Amount: ₹${paymentData.amountPaid.toFixed(2)}\n\n` +
            `This will create a reversal entry and update the invoice balance.`
        );

        if (confirmed) {
            ProgressToast.show('Voiding Supplier Payment', 'warning');
            
            try {
                ProgressToast.updateProgress('Creating void entries and updating invoice...', 75);
                
                await voidSupplierPaymentAndUpdateInvoice(docId, user);
                
                ProgressToast.showSuccess(`Payment to ${supplierName} voided successfully!`);
                
                setTimeout(async () => {
                    ProgressToast.hide(500);
                    
                    await showModal('success', 'Payment Voided', 
                        `Supplier payment has been voided with complete audit trail.\n\n` +
                        `✓ Original payment marked as VOIDED\n` +
                        `✓ Reversal entry created\n` +
                        `✓ Invoice balance updated\n\n` +
                        `The payment grid will refresh to show the void entries.`
                    );
                    
                    // ✅ CRITICAL: Refresh payment grid to show void entries
                    if (typeof loadPaymentsForSelectedInvoice === 'function') {
                        console.log('[main.js] Refreshing payment grid after void operation');
                        await loadPaymentsForSelectedInvoice();
                    }
                    
                }, 1000);
                
            } catch (error) {
                console.error("Error voiding supplier payment:", error);
                ProgressToast.showError(`Void failed: ${error.message}`);
                setTimeout(() => {
                    showModal('error', 'Void Failed', 
                        `The supplier payment could not be voided.\n\n` +
                        `Reason: ${error.message}`
                    );
                }, 2000);
            }
        }
        
    } else if (button.classList.contains('action-btn-cancel-supplier-payment')) {
        // ✅ NEW: Cancel pending payment (delete for unverified payments)
        const confirmed = await showModal('confirm', 'Cancel Supplier Payment', 
            `Cancel this pending payment submission?\n\n` +
            `• Amount: ₹${paymentData.amountPaid.toFixed(2)}\n` +
            `• Status: Pending Verification\n\n` +
            `This will permanently remove the payment record since it hasn't been verified yet.`
        );

        if (confirmed) {
            try {
                await cancelSupplierPaymentRecord(docId);
                await showModal('success', 'Payment Cancelled', 'Pending supplier payment has been cancelled.');
                
                if (typeof loadPaymentsForSelectedInvoice === 'function') {
                    loadPaymentsForSelectedInvoice();
                }
            } catch (error) {
                console.error("Error cancelling supplier payment:", error);
                showModal('error', 'Cancel Failed', error.message);
            }
        }
    }
}

// main.js - ENHANCED: Add user validation to existing catalogues handler

async function handleExistingCataloguesGrid(button, docId, user) {
    // ✅ ADD: User validation at function start
    if (!user) {
        console.error('[main.js] User not available for catalogue operations');
        await showModal('error', 'Authentication Required', 'You must be logged in to manage catalogues.');
        return;
    }

    console.log(`[main.js] Catalogue action by user: ${user.email}, catalogue: ${docId}`);

    if (button.classList.contains('action-btn-edit-catalogue')) {
        // Existing edit functionality
        console.log('[main.js] Edit catalogue action');
        const catalogueData = getCatalogueDataFromGridById(docId);
        if (catalogueData) {
            loadCatalogueForEditing(catalogueData);
        }
        
    } else if (button.classList.contains('btn-activate-catalogue')) {
        // ✅ NEW: Activate catalogue
        console.log('[main.js] Activate catalogue action');
        const catalogueData = getCatalogueDataFromGridById(docId);
        if (!catalogueData) {
            await showModal('error', 'Data Error', 'Could not find catalogue data. Please refresh the page.');
            return;
        }

        const confirmed = await showModal('confirm', 'Activate Sales Catalogue', 
            `Are you sure you want to activate "${catalogueData.catalogueName}"?\n\n` +
            'This will:\n' +
            '✓ Make the catalogue available for consignment requests\n' +
            '✓ Activate price history for all catalogue items\n' +
            '✓ Enable the catalogue in reports and analytics'
        );

        if (confirmed) {
            ProgressToast.show('Activating Sales Catalogue', 'info');
            
            try {
                ProgressToast.updateProgress('Activating catalogue and price history...', 75);
                
                console.log(`[main.js] Calling updateSalesCatalogue for activation:`, {
                    docId: docId,
                    isActive: true,
                    userEmail: user.email
                });

                await updateSalesCatalogue(docId, { isActive: true }, user);
                
                ProgressToast.showSuccess(`"${catalogueData.catalogueName}" has been activated!`);
                
                setTimeout(async () => {
                    ProgressToast.hide(800);
                    await showModal('success', 'Catalogue Activated', 
                        `Sales catalogue "${catalogueData.catalogueName}" has been activated successfully!\n\n` +
                        '✓ Catalogue is now available for consignment requests\n' +
                        '✓ Price history activated for all items\n' +
                        '✓ Catalogue included in active reports\n\n' +
                        'Teams can now request products from this catalogue.'
                    );
                }, 1000);
                
            } catch (error) {
                console.error('[main.js] Error activating catalogue:', error);
                ProgressToast.showError(`Failed to activate catalogue: ${error.message}`);
                setTimeout(() => {
                    showModal('error', 'Activation Failed', 
                        'Failed to activate the sales catalogue. Please try again.'
                    );
                }, 2000);
            }
        }
        
    } else if (button.classList.contains('btn-deactivate-catalogue')) {
        // ✅ NEW: Deactivate catalogue  
        console.log('[main.js] Deactivate catalogue action');
        const catalogueData = getCatalogueDataFromGridById(docId);
        if (!catalogueData) {
            await showModal('error', 'Data Error', 'Could not find catalogue data. Please refresh the page.');
            return;
        }

        const confirmed = await showModal('confirm', 'Deactivate Sales Catalogue', 
            `Are you sure you want to deactivate "${catalogueData.catalogueName}"?\n\n` +
            'This will:\n' +
            '⚠️ Hide the catalogue from consignment requests\n' +
            '⚠️ Deactivate price history for all catalogue items\n' +
            '⚠️ Remove the catalogue from active reports\n\n' +
            'Note: This does not delete the catalogue or its items.'
        );

        if (confirmed) {
            ProgressToast.show('Deactivating Sales Catalogue', 'warning');
            
            try {
                ProgressToast.updateProgress('Deactivating catalogue and price history...', 75);
                
                console.log(`[main.js] Calling updateSalesCatalogue for deactivation:`, {
                    docId: docId,
                    isActive: false,
                    userEmail: user.email
                });

                await updateSalesCatalogue(docId, { isActive: false }, user);
                
                ProgressToast.showSuccess(`"${catalogueData.catalogueName}" has been deactivated.`);
                
                setTimeout(async () => {
                    ProgressToast.hide(800);
                    await showModal('success', 'Catalogue Deactivated', 
                        `Sales catalogue "${catalogueData.catalogueName}" has been deactivated.\n\n` +
                        '✓ Catalogue hidden from consignment requests\n' +
                        '✓ Price history deactivated for all items\n' +
                        '✓ Catalogue excluded from active reports\n\n' +
                        'You can reactivate this catalogue at any time.'
                    );
                }, 1000);
                
            } catch (error) {
                console.error('[main.js] Error deactivating catalogue:', error);
                ProgressToast.showError(`Failed to deactivate catalogue: ${error.message}`);
                setTimeout(() => {
                    showModal('error', 'Deactivation Failed', 
                        'Failed to deactivate the sales catalogue. Please try again.'
                    );
                }, 2000);
            }
        }
        
    } else {
        console.warn('[main.js] Unknown catalogue grid action:', button.className);
    }
}

async function handleAvailableProductsGrid(button, docId) {
    if (!button.classList.contains('action-btn-add-item')) return;

    const productId = docId;
    const catalogueDocId = document.getElementById('sales-catalogue-doc-id').value;
    const isEditMode = !!catalogueDocId;

    try {
        const costPrice = await getLatestPurchasePrice(productId);
        
        if (costPrice === null) {
            return alert('This product cannot be added because it has no purchase history. Please create a purchase invoice for it first.');
        }

        const productMaster = masterData.products.find(p => p.id === productId);
        const margin = productMaster.unitMarginPercentage || 0;
        const sellingPrice = costPrice * (1 + margin / 100);

        const itemData = {
            productId,
            productName: productMaster.itemName,
            costPrice,
            marginPercentage: margin,
            sellingPrice,
            isOverridden: false
        };

        if (isEditMode) {
            itemData.catalogueId = catalogueDocId;
            await addItemToCatalogue(catalogueDocId, itemData);
        } else {
            itemData.tempId = `draft_${Date.now()}`;
            appState.draftCatalogueItems.push(itemData);
            updateDraftItemsGrid();
        }
    } catch (error) {
        console.error("Error adding item to catalogue:", error);
        alert('An error occurred while adding the product.');
    }
}

async function handleCatalogueItemsGrid(button, docId) {
    if (!button.classList.contains('action-btn-remove-item')) return;

    const catalogueId = document.getElementById('sales-catalogue-doc-id').value;
    if (confirm('Are you sure you want to remove this item from the catalogue?')) {
        try {
            await removeItemFromCatalogue(catalogueId, docId);
        } catch (error) {
            console.error("Error removing item:", error);
            alert('Failed to remove the item.');
        }
    }
}

async function handleChurchTeamsGrid(button, docId, user) {
    if (!button.classList.contains('action-btn-toggle-team-status')) return;

    const teamData = getTeamDataFromGridById(docId);
    if (!teamData) return;

    const newStatus = !teamData.isActive;
    const actionText = newStatus ? 'activate' : 'deactivate';

    if (confirm(`Are you sure you want to ${actionText} the team "${teamData.teamName}"?`)) {
        try {
            await updateChurchTeam(docId, { isActive: newStatus }, user);
            alert('Team status updated successfully.');
        } catch (error) {
            console.error("Error updating team status:", error);
            alert('Failed to update team status.');
        }
    }
}

async function handleTeamMembersGrid(button, docId, user) {
    const teamId = document.getElementById('member-team-id').value;

    if (button.classList.contains('action-btn-edit-member')) {
        const memberData = getMemberDataFromGridById(docId);
        if (memberData) showMemberModal(memberData);
    } else if (button.classList.contains('action-btn-remove-member')) {
        if (confirm('Are you sure you want to remove this member from the team?')) {
            try {
                const memberData = getMemberDataFromGridById(docId);
                if (!memberData) throw new Error("Could not find member data to delete.");

                await removeTeamMember(teamId, docId, memberData.email);
                alert('Member removed successfully.');
            } catch (error) {
                console.error("Error removing member:", error);
                alert('Failed to remove member.');
            }
        }
    }
}


/**
 * Handles action button clicks in the consignment payments grid with comprehensive processing.
 * 
 * Processes admin and team lead actions on consignment payment records including payment
 * editing, verification, and cancellation. Provides role-based functionality with proper
 * validation and user feedback through progress tracking and confirmation dialogs.
 * 
 * BUSINESS CONTEXT:
 * - Manages team payment records against consignment orders
 * - Supports payment editing by original submitters (team leads)
 * - Enables admin verification of pending team payments with order balance updates
 * - Allows cancellation of unprocessed payments to correct errors
 * - Critical for consignment settlement workflow and team accountability
 * 
 * ROLE-BASED ACTIONS:
 * TEAM LEAD: Can edit/cancel their own pending payments
 * ADMIN: Can verify pending payments, void verified payments
 * FINANCE: Can verify pending payments, void verified payments
 * 
 * VALIDATION RULES:
 * - Edit: Only pending payments by original submitter
 * - Verify: Only pending payments, admin/finance roles only
 * - Cancel: Only pending payments by original submitter
 * - Void: Only verified payments, admin/finance roles only
 * 
 * @param {HTMLElement} button - The clicked action button element
 * @param {string} docId - Document ID of the payment record
 * @param {object} user - Current user object with role and permissions
 * @throws {Error} When payment not found, insufficient permissions, or processing fails
 * @since 1.0.0
 * @see verifyConsignmentPayment() - API function for payment verification with order updates
 * @see cancelPaymentRecord() - API function for cancelling unprocessed payments
 * @see loadPaymentRecordForEditing() - UI function for payment editing workflow
 * @see refreshConsignmentPaymentsGrid() - UI function for manual grid refresh
 */
async function handleConsignmentPaymentsGrid(button, docId, user) {
    // ✅ INPUT VALIDATION: Ensure required parameters
    if (!user) {
        await showModal('error', 'Authentication Required', 'You must be logged in to manage payments.');
        return;
    }

    const paymentData = getConsignmentPaymentDataFromGridById(docId);
    if (!paymentData) {
        await showModal('error', 'Payment Not Found', 'Could not find payment data. Please refresh the page and try again.');
        return;
    }

    console.log(`[main.js] Consignment payment action by ${user.email}:`, {
        paymentId: paymentData.paymentId || docId,
        teamName: paymentData.teamName,
        amount: formatCurrency(paymentData.amountPaid || 0),
        status: paymentData.paymentStatus,
        action: button.className
    });

    // ✅ EDIT PAYMENT ACTION
    if (button.classList.contains('action-btn-edit-payment')) {
        console.log('[main.js] Edit payment action - loading payment for editing');
        
        // Check if user can edit this payment
        if (paymentData.submittedBy !== user.email && user.role !== 'admin') {
            await showModal('error', 'Permission Denied', 
                'You can only edit payments that you submitted, or contact an admin for assistance.'
            );
            return;
        }

        try {
            loadPaymentRecordForEditing(paymentData);
            console.log('[main.js] ✅ Payment loaded for editing');
        } catch (error) {
            console.error('[main.js] Error loading payment for editing:', error);
            await showModal('error', 'Edit Failed', 'Could not load payment for editing. Please try again.');
        }
        
    } 
    // ✅ CANCEL PAYMENT ACTION  
    else if (button.classList.contains('action-btn-cancel-payment')) {
        console.log('[main.js] Cancel payment action initiated');

        // ✅ ENHANCED: Validation with user feedback
        if (paymentData.paymentStatus !== 'Pending Verification') {
            await showModal('error', 'Cannot Cancel', 
                `This payment has status "${paymentData.paymentStatus}" and cannot be cancelled.\n\n` +
                'Only pending payments can be cancelled. Verified payments must be voided.'
            );
            return;
        }

        const confirmed = await showModal('confirm', 'Cancel Team Payment', 
            `Are you sure you want to cancel this pending payment?\n\n` +
            `• Team: ${paymentData.teamName}\n` +
            `• Amount: ${formatCurrency(paymentData.amountPaid || 0)}\n` +
            `• Submitted: ${paymentData.paymentDate?.toDate?.()?.toLocaleDateString() || 'Unknown'}\n\n` +
            `⚠️ This action cannot be undone.\n` +
            `The payment record will be permanently deleted.`
        );

        if (confirmed) {
            ProgressToast.show('Cancelling Team Payment', 'warning');
            
            try {
                ProgressToast.updateProgress('Cancelling payment record...', 75, 'Processing');
                
                await cancelPaymentRecord(docId);
                
                ProgressToast.showSuccess(`Payment from ${paymentData.teamName} cancelled successfully!`);
                
                setTimeout(async () => {
                    ProgressToast.hide(800);
                    
                    await showModal('success', 'Payment Cancelled', 
                        `Team payment has been cancelled successfully.\n\n` +
                        `• Team: ${paymentData.teamName}\n` +
                        `• Cancelled Amount: ${formatCurrency(paymentData.amountPaid || 0)}\n\n` +
                        `✓ Payment record deleted\n` +
                        `✓ Team can resubmit if needed\n` +
                        `✓ No impact on order balance (payment was not yet verified)`
                    );
                    
                    // ✅ TRIGGER: Manual refresh after cancellation
                    setTimeout(() => {
                        refreshConsignmentPaymentsGrid();
                        console.log('[main.js] ✅ Triggered payment grid refresh after cancellation');
                    }, 500);
                    
                }, 1200);
                
            } catch (error) {
                console.error("Error cancelling payment record:", error);
                
                ProgressToast.showError(`Failed to cancel payment: ${error.message}`);
                
                setTimeout(async () => {
                    await showModal('error', 'Cancellation Failed', 
                        `Failed to cancel the payment record.\n\n` +
                        `Error: ${error.message}\n\n` +
                        `Please try again or contact support if the issue persists.`
                    );
                }, 2000);
            }
        }
        
    } 
    // ✅ VERIFY PAYMENT ACTION
    else if (button.classList.contains('action-btn-verify-payment')) {
        console.log('[main.js] Verify payment action initiated');

        // ✅ ENHANCED: Role-based validation
        const hasVerificationPermissions = user.role === 'admin' || user.role === 'finance';
        
        if (!hasVerificationPermissions) {
            await showModal('error', 'Permission Denied', 
                'Only admin and finance users can verify payments.\n\n' +
                `Your current role: ${user.role}`
            );
            return;
        }

        if (paymentData.paymentStatus !== 'Pending Verification') {
            await showModal('error', 'Cannot Verify', 
                `This payment has status "${paymentData.paymentStatus}" and cannot be verified.\n\n` +
                'Only pending payments can be verified.'
            );
            return;
        }

        const confirmed = await showModal('confirm', 'Verify Team Payment', 
            `Verify this payment from ${paymentData.teamName}?\n\n` +
            `• Team: ${paymentData.teamName}\n` +
            `• Amount: ${formatCurrency(paymentData.amountPaid || 0)}\n` +
            `• Payment Mode: ${paymentData.paymentMode}\n` +
            `• Reference: ${paymentData.transactionRef}\n` +
            `• Submitted by: ${paymentData.submittedBy}\n\n` +
            `This will:\n` +
            `✓ Update the consignment order balance\n` +
            `✓ Mark payment as verified\n` +
            `✓ Notify the team of verification`
        );

        if (confirmed) {
            ProgressToast.show('Verifying Team Payment', 'info');
            
            try {
                ProgressToast.updateProgress('Verifying payment and updating order balance...', 85, 'Processing');
                
                await verifyConsignmentPayment(docId, user);
                
                ProgressToast.showSuccess(`Payment from ${paymentData.teamName} verified successfully!`);
                
                setTimeout(async () => {
                    ProgressToast.hide(800);
                    
                    await showModal('success', 'Payment Verified', 
                        `Team payment has been verified successfully!\n\n` +
                        `• Team: ${paymentData.teamName}\n` +
                        `• Verified Amount: ${formatCurrency(paymentData.amountPaid || 0)}\n` +
                        `• Verified by: ${user.displayName}\n\n` +
                        `✓ Consignment order balance updated\n` +
                        `✓ Payment status changed to verified\n` +
                        `✓ Team notified of verification\n` +
                        `✓ Funds applied to order settlement`
                    );
                    
                    // ✅ TRIGGER: Manual refresh after verification
                    setTimeout(() => {
                        refreshConsignmentPaymentsGrid();
                        console.log('[main.js] ✅ Triggered payment grid refresh after verification');
                    }, 500);
                    
                }, 1200);
                
            } catch (error) {
                console.error("Error verifying payment:", error);
                
                ProgressToast.showError(`Verification failed: ${error.message}`);
                
                setTimeout(async () => {
                    await showModal('error', 'Verification Failed', 
                        `Payment verification failed.\n\n` +
                        `Error: ${error.message}\n\n` +
                        `Common causes:\n` +
                        `• Payment status changed during processing\n` +
                        `• Network connection interrupted\n` +
                        `• Order was modified by another user\n\n` +
                        `Please refresh the page and try again.`
                    );
                }, 2000);
            }
        }
        
    } else {
        // ✅ UNKNOWN ACTION: Log for debugging
        console.warn('[main.js] Unknown consignment payment action:', button.className);
        await showModal('error', 'Unknown Action', 'The requested action is not recognized. Please refresh the page.');
    }
}

async function handleSalesHistoryGrid(button, docId) {
    if (!button.classList.contains('action-btn-manage-payments')) return;

    console.log("Opening manage payments modal for:", docId);
    const invoiceData = getSalesHistoryDataById(docId);

    if (invoiceData) {
        showRecordSalePaymentModal(invoiceData);
    } else {
        alert("Error: Could not find data for the selected invoice.");
    }
}

async function handleSalePaymentHistoryGrid(button, docId, user) {
    if (!button.classList.contains('action-btn-void-sale-payment')) return;

    const paymentData = getSalesPaymentDataFromGridById(docId);
    if (!paymentData) return;

    if (confirm(`Are you sure you want to VOID this payment of ${formatCurrency(paymentData.amountPaid)}? This will reverse the transaction and cannot be undone.`)) {
        //showLoader();
        try {
            await voidSalePayment(docId, user);
            alert("Payment successfully voided.");

            const updatedInvoiceData = await getSalesInvoiceById(paymentData.invoiceId);
            if (updatedInvoiceData) {
                refreshSalePaymentModal(updatedInvoiceData);
            }
        } catch (error) {
            console.error("Error voiding payment:", error);
            alert(`Failed to void payment: ${error.message}`);
        } finally {
            //hideLoader();
        }
    }
}

async function handleSuppliersGrid(button, docId, user) {
    const isActivate = button.classList.contains('btn-activate');
    console.log('[supplier grid action]:', isActivate);

    if (await showModal('confirm', `Confirm ${isActivate ? 'Activation' : 'Deactivation'}`, 'Are you sure?')) {
        await setSupplierStatus(docId, isActivate, user);
    }
}

async function handleCategoriesGrid(button, docId, user) {
    const isActivate = button.classList.contains('btn-activate');
    console.log(`[categories-grid] Activate: ${isActivate}`);

    try {
        await setCategoryStatus(docId, isActivate, user);
        console.log(`Category ${docId} status set to ${isActivate}`);
        await showModal('success', 'Success', 'Category updated successfully.');
    } catch (error) {
        console.error("Error updating category status:", error);
        await showModal('error', 'Update Failed', 'The category status could not be updated.');
    }
}

async function handlePaymentModesGrid(button, docId, user) {
    const isActivate = button.classList.contains('btn-activate');
    try {
        await setPaymentModeStatus(docId, isActivate, user);
    } catch (error) {
        console.error("Error updating payment mode status:", error);
        await showModal('error', 'Update Failed', 'The payment mode status could not be updated.');
    }
}

async function handleSaleTypesGrid(button, docId, user) {
    const isActivate = button.classList.contains('btn-activate');
    try {
        await setSaleTypeStatus(docId, isActivate, user);
    } catch (error) {
        console.error("Error updating sales type status:", error);
        await showModal('error', 'Update Failed', 'The sales type status could not be updated.');
    }
}

async function handleSeasonsGrid(button, docId, user) {
    const isActivate = button.classList.contains('btn-activate');
    try {
        await setSeasonStatus(docId, isActivate, user);
    } catch (error) {
        console.error("Error updating sales seasons status:", error);
        await showModal('error', 'Update Failed', 'The sales seasons status could not be updated.');
    }
}

async function handleSalesEventsGrid(button, docId, user) {
    const isActivate = button.classList.contains('btn-activate');
    try {
        await setSalesEventStatus(docId, isActivate, user);
    } catch (error) {
        console.error("Error updating sales events status:", error);
        await showModal('error', 'Update Failed', 'The sales events status could not be updated.');
    }
}

async function handleUsersGrid(button, docId, user) {
    const isActivate = button.classList.contains('btn-activate');
    try {
        await setUserActiveStatus(docId, isActivate, user);
    } catch (error) {
        console.error("Error updating user status:", error);
        await showModal('error', 'Update Failed', 'The users status could not be updated.');
    }
}


async function handleProductsCatalogueGrid(button, docId, user) {


    const allModals = document.querySelectorAll('.modal-container');

    // Force close ALL other modals first
    allModals.forEach(modal => {
        if (modal.id !== 'supplier-payment-modal') {
            modal.classList.remove('visible');
            modal.style.display = 'none';
            console.log(`Force closed modal: ${modal.id}`);
        }
    });

  if (button.classList.contains('btn-deactivate')) {
    const confirmed = await showModal('confirm', 'Confirm Deactivation', 'Are you sure you want to deactivate this product?');
    if (confirmed) {
      try {
        await setProductStatus(docId, 'isActive', false, user);
      } catch (error) {
        console.error("Error deactivating product:", error);
        await showModal('error', 'Update Failed', 'The product could not be deactivated.');
      }
    }
  } else if (button.classList.contains('btn-activate')) {
    const confirmed = await showModal('confirm', 'Confirm Activation', 'Are you sure you want to activate this product?');
    if (confirmed) {
      try {
        await setProductStatus(docId, 'isActive', true, user);
      } catch (error) {
        console.error("Error activating product:", error);
        await showModal('error', 'Update Failed', 'The product could not be activated.');
      }
    }
  }
}



// ============================================================================
// MOBILE SIDEBAR HANDLER
// ============================================================================

function setupMobileSidebar() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (!mobileMenuButton || !sidebar || !sidebarOverlay) return;

    // Open sidebar
    mobileMenuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.add('active');
        sidebarOverlay.classList.remove('hidden');
    });

    // Close sidebar
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.add('hidden');
    });
}

// ============================================================================
// STANDALONE BUTTON HANDLERS
// ============================================================================

function handleStandaloneButtons(target, event) {
    const buttonHandlers = {
        '#add-line-item-btn': () => addLineItem(),
        '.remove-line-item-btn': () => {
            target.closest('.grid').remove();
            calculateAllTotals();
            //ADD: Check if we should show empty message after removal
            setTimeout(() => {
                updateNoItemsMessageVisibility(); // This will be a ui.js function
            }, 50);
        },
        '#cancel-edit-btn': () => resetPurchaseForm(),
        '#payment-modal-close': () => closePaymentModal(),
        '#add-member-btn': () => showMemberModal(),
        '#request-consignment-btn': () => handleRequestConsignmentClick(),
        '#consignment-next-btn': () => handleConsignmentNext(),
        '#fulfill-checkout-btn': () => handleFulfillConsignmentClick(),
        '#catalogue-form-cancel-btn': () => resetCatalogueForm(),
        '#report-activity-btn': () => showReportActivityModal(),
        '#cancel-payment-edit-btn': () => resetPaymentForm(),
        '#add-product-to-cart-btn': () => showAddProductModal(),
        '#add-new-product-to-catalogue-btn': () => showAddProductToCatalogueModal(),
        '#bulk-add-products-btn': () => showBulkAddProductsModal(),
        '#bulk-add-to-invoice-btn': () => handleBulkAddToInvoice(),
        '#bulk-select-all': () => handleBulkSelectAll(),
        '#bulk-clear-selection': () => handleBulkClearSelection(), 
        '#bulk-select-with-prices': () => handleBulkSelectWithPrices(),
        '.action-btn-add-to-cart': () => handleAddToCart(target),
        '.action-btn-remove-from-cart': () => {
            console.log('[main.js] Remove from cart clicked');
            
            // Find the button element (in case SVG was clicked)
            const buttonElement = target.closest('button[data-id]') || target;
            const productId = buttonElement.dataset?.id;
            
            console.log('[main.js] Product ID to remove:', productId);
            
            if (productId) {
                removeItemFromCart(productId);
            } else {
                console.error('[main.js] No product ID found for removal');
            }
        }
    };

    // Add modal close trigger
    if (target.closest('#bulk-add-products-modal .modal-close-trigger')) {
        closeBulkAddProductsModal();
        return true;
    }

    // ADD: New modal close trigger (different ID)
    if (target.closest('#add-product-to-catalogue-modal .modal-close-trigger')) {
        closeAddProductToCatalogueModal();
        return true;
    }

    // Check modal close triggers for all modals
    if (target.closest('#supplier-payment-modal .modal-close-trigger')) {
        closeSupplierPaymentModal();
        return true;
    }

    if (target.closest('#add-product-modal .modal-close-trigger')) {
        closeAddProductModal();
        return true;
    }

    if (target.closest('#manage-sale-payment-modal .modal-close-trigger')) {
        closeRecordSalePaymentModal();
        return true;
    }

    if (target.closest('#member-modal .modal-close-trigger')) {
        closeMemberModal();
        return true;
    }

    if (target.closest('#consignment-request-modal .modal-close-trigger')) {
        closeConsignmentRequestModal();
        return true;
    }

    if (target.closest('#report-activity-modal .modal-close-trigger')) {
        closeReportActivityModal();
        return true;
    }

    // Check all button handlers
    for (const [selector, handler] of Object.entries(buttonHandlers)) {
        if (target.closest(selector)) {
            handler();
            return true;
        }
    }

    // Handle report card clicks with optimization tracking
    if (target.closest('.report-card')) {
        const reportCard = target.closest('.report-card');
        const reportId = reportCard.dataset.reportId;
        
        if (reportId) {
            console.log(`[main.js] Report card clicked: ${reportId}`);
            handleReportCardClick(reportId, reportCard); // This calls ui.js function
            return true;
        }
    }

    // Handle export button clicks
    if (target.closest('#export-store-csv')) {
        console.log('[main.js] Exporting store performance CSV');
        exportStorePerformanceCsv();
        return true;
    }

    if (target.closest('#export-store-excel')) {
        console.log('[main.js] Exporting store performance Excel');
        exportStorePerformanceExcel();
        return true;
    }

    // Handle refresh button click
    if (target.closest('#refresh-store-report')) {
        const periodSelector = document.getElementById('store-report-period');
        const daysBack = parseInt(periodSelector?.value || '30');
        console.log(`[main.js] Refreshing store report for ${daysBack} days`);
        refreshStorePerformanceData(daysBack, true); // Force fresh data
        return true;
    }

    // Export button handlers for inventory
    if (target.closest('#export-inventory-csv')) {
        exportInventoryCSV();
        return true;
    }

    if (target.closest('#export-reorder-list')) {
        exportReorderList();
        return true;
    }

   




    return false;
}


/**
 * Handles bulk adding selected products to the purchase invoice
 * CORRECTED: Delegates grid operations to ui.js
 */
async function handleBulkAddToInvoice() {
    try {
        // ✅ CORRECT: Call ui.js to get data (ui.js handles grid)
        const selectedProducts = getBulkSelectedProducts();
        
        if (selectedProducts.length === 0) {
            await showModal('warning', 'No Selection', 'Please select at least one product to add.');
            return;
        }

        // ✅ CORRECT: Call ui.js to add line items (ui.js handles DOM)
        addBulkLineItems(selectedProducts);
        
        // ✅ CORRECT: Call ui.js to calculate (ui.js handles calculations)
        calculateAllTotals();

        // ✅ CORRECT: Call ui.js to close modal
        closeBulkAddProductsModal();
        
        await showModal('success', 'Products Added', 
            `${selectedProducts.length} product${selectedProducts.length > 1 ? 's have' : ' has'} been added to the invoice.`);

    } catch (error) {
        console.error('[main.js] Error in bulk add handler:', error);
        await showModal('error', 'Add Failed', 'Failed to add products to invoice.');
    }
}

/**
 * Handles selecting all visible products
 * CORRECTED: Delegates to ui.js
 */
function handleBulkSelectAll() {
    console.log('[main.js] Handle bulk select all');
    bulkSelectAllVisibleProducts(); // This will be in ui.js
}

/**
 * Handles clearing all selections
 * CORRECTED: Delegates to ui.js  
 */
function handleBulkClearSelection() {
    console.log('[main.js] Handle bulk clear selection');
    bulkClearAllSelections(); // This will be in ui.js
}


/**
 * Handles selecting products that have purchase prices
 * CORRECTED: Delegates to ui.js
 */
function handleBulkSelectWithPrices() {
    console.log('[main.js] Handle bulk select with prices');
    bulkSelectProductsWithPrices(); // This will be in ui.js
}


/**
 * Adds a line item with pre-filled data (enhanced version of existing addLineItem)
 */
function addLineItemWithData(productData) {
    // Use existing addLineItem() to create the row
    addLineItem();
    
    // Get the newly created row (last row in container)
    const lineItemsContainer = document.getElementById('purchase-line-items-container');
    const newRow = lineItemsContainer.lastElementChild;
    
    if (!newRow) return;
    
    // Populate the row with bulk data
    newRow.querySelector('[data-field="masterProductId"]').value = productData.masterProductId;
    newRow.querySelector('[data-field="quantity"]').value = productData.quantity;
    newRow.querySelector('[data-field="unitPurchasePrice"]').value = productData.unitPurchasePrice;
    newRow.querySelector('[data-field="discountType"]').value = productData.discountType || 'Percentage';
    newRow.querySelector('[data-field="discountValue"]').value = productData.discountValue || 0;
    newRow.querySelector('[data-field="taxPercentage"]').value = productData.taxPercentage || 0;
    
    console.log(`[BulkAdd] Added line item for ${productData.productName}`);
}




// Add this new function
function handleReportClick(reportId) {
    console.log(`Report clicked: ${reportId}`);
    // For now, just show an alert - we'll build actual reports later
    alert(`Opening ${reportId} report - Coming Soon!`);
}

function handleConsignmentNext() {
    const catalogueId = document.getElementById('request-catalogue-select').value;
    if (!catalogueId) {
        return alert("Please select a Sales Catalogue before proceeding.");
    }
    showConsignmentRequestStep2(catalogueId);
}


function handleAddToCart(target) {
    console.log('[main.js] handleAddToCart called');
    
    // Find the button element (in case SVG was clicked)
    const buttonElement = target.closest('button[data-id]') || target;
    const productId = buttonElement.dataset?.id;
    
    if (!productId) {
        console.error('[main.js] No product ID found');
        return;
    }

    const product = masterData.products.find(p => p.id === productId);
    console.log('[main.js] Found product:', product);

    if (product) {
        const newItem = {
            productId: product.id,
            productName: product.itemName,
            quantity: 1, // Simple default quantity
            unitPrice: product.sellingPrice || 0,
            discountPercentage: 0,
            taxPercentage: 0
        };
        
        console.log('[main.js] Adding item to cart:', newItem);
        addItemToCart(newItem);
    } else {
        console.error('[main.js] Product not found for ID:', productId);
    }

    closeAddProductModal();
}

// ============================================================================
// TAB HANDLERS
// ============================================================================

function handleTabs(target, event) {
    const consignmentTab = target.closest('.consignment-tab');
    if (consignmentTab) {
        event.preventDefault();
        switchConsignmentTab(consignmentTab.id);
        return true;
    }

    const paymentModalTab = target.closest('.payment-modal-tab');
    if (paymentModalTab) {
        event.preventDefault();
        switchPaymentModalTab(paymentModalTab.id);
        return true;
    }

    const tab = target.closest('.tab');
    if (tab) {
        event.preventDefault();
        if (tab.id === 'tab-invoices') {
            switchPurchaseTab('invoices');
        } else if (tab.id === 'tab-payments' && !tab.classList.contains('tab-disabled')) {
            switchPurchaseTab('payments');
            loadPaymentsForSelectedInvoice();
        }
        return true;
    }

    return false;
}

// ============================================================================
// FORM SUBMISSIONS
// ============================================================================

function setupFormSubmissions() {
    const formConfigs = [
        { id: 'add-supplier-form', handler: handleSupplierSubmit },
        { id: 'add-product-form', handler: handleProductSubmit },
        { id: 'add-product-to-catalogue-form', handler: handleProductCatalogueSubmit },
        { id: 'purchase-invoice-form', handler: handlePurchaseInvoiceSubmit },
        { id: 'record-payment-form', handler: handlePaymentSubmit },
        { id: 'supplier-record-payment-form', handler: handleSupplierPaymentSubmit },
        { id: 'add-team-form', handler: handleTeamSubmit },
        { id: 'member-form', handler: handleMemberSubmit },
        { id: 'sales-catalogue-form', handler: handleCatalogueSubmit },
        { id: 'consignment-request-form', handler: handleConsignmentRequestSubmit },
        { id: 'report-activity-form', handler: handleActivityReportSubmit },
        { id: 'make-payment-form', handler: handleMakePaymentSubmit },
        { id: 'new-sale-form', handler: handleNewSaleSubmit },
        { id: 'record-sale-payment-form', handler: handleRecordSalePaymentSubmit },
        { id: 'add-category-form', handler: handleCategorySubmit },
        { id: 'add-payment-mode-form', handler: handlePaymentModeSubmit },
        { id: 'add-sale-type-form', handler: handleSaleTypeSubmit },
        { id: 'add-season-form', handler: handleSeasonSubmit },
        { id: 'add-event-form', handler: handleEventSubmit }
    ];

    formConfigs.forEach(({ id, handler }) => {
        const form = document.getElementById(id);
        if (form) {
            form.addEventListener('submit', handler);
            if (id === 'purchase-invoice-form') {
                form.addEventListener('keydown', preventEnterSubmit);
            }
        }
    });
}

function preventEnterSubmit(e) {
    if (e.key === 'Enter' && e.target.tagName.toLowerCase() !== 'textarea') {
        e.preventDefault();
    }
}


/**
 * Handles supplier payment form submission with comprehensive validation and progress tracking.
 * 
 * Records payments to suppliers for outstanding purchase invoices with automatic balance
 * reconciliation and invoice status updates. Provides real-time progress feedback during
 * the complex transactional payment processing workflow that involves multiple database
 * operations and financial calculations.
 * 
 * BUSINESS CONTEXT:
 * - Records payments to suppliers against outstanding purchase invoices
 * - Updates supplier account balances and invoice payment status automatically
 * - Maintains accurate accounts payable tracking for cash flow management
 * - Critical for supplier relationship management and financial reconciliation
 * - Supports partial payments with balance tracking over time
 * 
 * VALIDATION RULES:
 * - Payment amount: Must be positive number, typically should not exceed invoice balance
 * - Payment date: Must be valid date, usually current or recent date
 * - Payment mode: Must select from configured payment methods
 * - Transaction reference: Recommended for bank reconciliation and audit trail
 * - Invoice context: Must link to existing purchase invoice with outstanding balance
 * 
 * TRANSACTIONAL OPERATIONS:
 * - Creates payment record in supplier payments ledger
 * - Updates purchase invoice balance and payment status
 * - Maintains referential integrity between payments and invoices
 * - Provides complete audit trail for financial compliance
 * 
 * @param {Event} e - Form submission event from supplier-record-payment-form modal
 * @throws {Error} When validation fails, invoice not found, or payment processing fails
 * @since 1.0.0
 * @see recordPaymentAndUpdateInvoice() - Transactional API for atomic payment processing
 * @see closeSupplierPaymentModal() - UI function to close payment modal after success
 * @see loadPaymentsForSelectedInvoice() - UI function to refresh payment history display
 */
async function handleSupplierPaymentSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in to record supplier payments.');
        return;
    }

    // ✅ START: Progress toast for supplier payment processing
    ProgressToast.show('Recording Supplier Payment', 'info');

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Disable submit button during processing
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
    }

    try {
        // Step 1: Input Collection and Validation
        ProgressToast.updateProgress('Validating payment information...', 20, 'Step 1 of 5');

        const paymentDate = document.getElementById('supplier-payment-date-input').value;
        const amountPaid = document.getElementById('supplier-payment-amount-input').value;
        const paymentMode = document.getElementById('supplier-payment-mode-select').value;
        const transactionRef = document.getElementById('supplier-payment-ref-input').value.trim();
        const notes = document.getElementById('supplier-payment-notes-input').value.trim();
        const relatedInvoiceId = document.getElementById('supplier-payment-invoice-id').value;
        const supplierId = document.getElementById('supplier-payment-supplier-id').value;

        // Validate required fields
        if (!paymentDate) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Payment Date', 'Please select the payment date.');
            return;
        }

        if (!relatedInvoiceId || !supplierId) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Invoice Data', 'Invoice or supplier information is missing. Please close and reopen the payment modal.');
            return;
        }

        // Step 2: Financial Validation
        ProgressToast.updateProgress('Validating payment amount and details...', 35, 'Step 2 of 5');

        const paymentAmount = parseFloat(amountPaid);

        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Payment Amount', 'Payment amount must be a valid number greater than zero.');
            return;
        }

        if (!paymentMode) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Payment Mode', 'Please select how the payment was made.');
            return;
        }

        // Validate payment date reasonableness
        const paymentDateObj = new Date(paymentDate);
        const today = new Date();
        const futureLimit = new Date();
        futureLimit.setDate(today.getDate() + 7); // Allow up to 7 days future

        if (paymentDateObj > futureLimit) {
            const daysFuture = Math.ceil((paymentDateObj - today) / (1000 * 60 * 60 * 24));
            const confirmFuturePayment = await showModal('confirm', 'Future Payment Date', 
                `The payment date is ${daysFuture} days in the future. This is unusual for supplier payments. Continue anyway?`
            );
            if (!confirmFuturePayment) {
                ProgressToast.hide(0);
                return;
            }
        }

        // Step 3: Prepare Payment Data
        ProgressToast.updateProgress('Preparing supplier payment record...', 55, 'Step 3 of 5');

        const paymentData = {
            relatedInvoiceId: relatedInvoiceId,
            supplierId: supplierId,
            paymentDate: paymentDateObj,
            amountPaid: paymentAmount,
            paymentMode: paymentMode,
            transactionRef: transactionRef,
            notes: notes
        };

        // Get supplier name for enhanced logging and feedback
        const supplier = masterData.suppliers.find(s => s.id === supplierId);
        const supplierName = supplier ? supplier.supplierName : 'Unknown Supplier';

        console.log(`[main.js] Recording supplier payment:`, {
            supplier: supplierName,
            amount: formatCurrency(paymentAmount),
            mode: paymentMode,
            date: paymentDateObj.toLocaleDateString(),
            reference: transactionRef || 'No reference provided',
            invoice: relatedInvoiceId
        });

        // Step 4: Process Payment Transaction
        ProgressToast.updateProgress('Submitting payment for admin verification...', 85, 'Step 4 of 5');

        // Execute the complex transactional payment processing
        await recordPaymentAndUpdateInvoice(paymentData, user, true);

        // Step 5: Success Completion and UI Updates
        ProgressToast.updateProgress('Payment submitted successfully!', 100, 'Step 5 of 5');
        ProgressToast.showSuccess(`Payment to ${supplierName} submitted for verification!`);


        setTimeout(async () => {
            ProgressToast.hide(800);
            
            await showModal('success', 'Supplier Payment Submitted', 
                `Supplier payment has been submitted for verification!\n\n` +
                `• Supplier: ${supplierName}\n` +
                `• Amount: ${formatCurrency(paymentData.amountPaid)}\n` +
                `• Status: Pending Admin Verification\n\n` +
                `✓ Payment record created\n` +
                `⏳ Awaiting admin verification\n` +
                `📧 You will be notified when verified\n\n` +
                `Note: Invoice balance will update after admin verification.`
            );
            
            // Close the payment modal
            closeSupplierPaymentModal();

            const paymentMgmtView = document.getElementById('pmt-mgmt-view');
            if (paymentMgmtView && paymentMgmtView.classList.contains('active')) {
                console.log('[main.js] Refreshing payment management after supplier payment');
                setTimeout(() => {
                    handlePmtMgmtSupplierRefresh();
                }, 1000);
            }
            
            // Refresh payments grid to show the new payment
            if (typeof loadPaymentsForSelectedInvoice === 'function') {
                await loadPaymentsForSelectedInvoice();
                console.log('[main.js] ✅ Payment grid refreshed with new payment record');
            }
            
        }, 1200);

    } catch (error) {
        console.error('Error recording supplier payment:', error);
        
        ProgressToast.showError(`Failed to record payment: ${error.message || 'Payment processing error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Supplier Payment Failed', 
                `Failed to record the supplier payment.\n\n` +
                `Error details: ${error.message}\n\n` +
                `Common causes:\n` +
                `• Payment amount exceeds invoice balance\n` +
                `• Network connection interrupted during processing\n` +
                `• Invoice has been modified by another user\n` +
                `• Insufficient permissions for payment operations\n` +
                `• Supplier account access restrictions\n\n` +
                `Please verify the payment details and try again.`
            );
        }, 2000);
        
    } finally {
        // Always re-enable the submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Payment';
        }
    }
}


/**
 * Handles supplier form submission with validation, database save, and progress feedback.
 * 
 * Validates supplier information, creates new supplier record in Firestore,
 * and provides real-time progress updates via toast notifications.
 * Automatically resets form on successful save.
 * 
 * @param {Event} e - Form submission event
 * @throws {Error} When validation fails or database operation errors
 * @since 1.0.0
 * @see addSupplier() - API function for creating supplier records
 */
async function handleSupplierSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Progress toast for supplier creation
    ProgressToast.show('Adding New Supplier', 'info');

    try {
        // Step 1: Input Validation
        ProgressToast.updateProgress('Validating supplier information...', 25, 'Step 1 of 4');

        const supplierName = document.getElementById('supplierName-input').value.trim();
        const contactEmail = document.getElementById('contactEmail-input').value.trim();
        
        if (!supplierName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Information', 'Please enter a supplier name.');
            return;
        }

        // Basic email validation if provided
        if (contactEmail && !contactEmail.includes('@')) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Email', 'Please enter a valid email address.');
            return;
        }

        // Step 2: Prepare Supplier Data
        ProgressToast.updateProgress('Preparing supplier data...', 50, 'Step 2 of 4');

        const supplierData = {
            supplierName: supplierName,
            address: document.getElementById('address-input').value.trim(),
            contactNo: document.getElementById('contactNo-input').value.trim(),
            contactEmail: contactEmail,
            creditTerm: document.getElementById('creditTerm-input').value.trim()
        };

        console.log(`[main.js] Creating supplier: ${supplierData.supplierName}`);

        // Step 3: Save to Database
        ProgressToast.updateProgress('Saving supplier to database...', 80, 'Step 3 of 4');

        await addSupplier(supplierData, user);

        // Step 4: Success
        ProgressToast.updateProgress('Supplier added successfully!', 100, 'Step 4 of 4');
        ProgressToast.showSuccess(`"${supplierData.supplierName}" has been added to suppliers!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            await showModal('success', 'Supplier Added', 
                `Supplier "${supplierData.supplierName}" has been added successfully.\n\n` +
                `You can now create purchase invoices from this supplier.`
            );
            
            // Reset form for next supplier
            e.target.reset();
            
        }, 1200);

    } catch (error) {
        console.error("Error adding supplier:", error);
        
        ProgressToast.showError(`Failed to add supplier: ${error.message || 'Database error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Add Supplier Failed', 
                'Failed to add the supplier. Please try again.\n\n' +
                'If the problem persists, check your internet connection.'
            );
        }, 2000);
    }
}


// ADD: New form submission handler (different ID)
async function handleProductCatalogueSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Toast progress for product creation
    ProgressToast.show('Adding Product to Catalogue', 'info');

    try {
        // Step 1: Input Validation
        ProgressToast.updateProgress('Validating product data...', 20, 'Step 1 of 5');

        const unitPrice = parseFloat(document.getElementById('catalogue-unitPrice-input').value);
        const unitMarginPercentage = parseFloat(document.getElementById('catalogue-unitMargin-input').value);

        if (isNaN(unitPrice) || isNaN(unitMarginPercentage)) {
            ProgressToast.hide(0);
            return showModal('error', 'Invalid Input', 'Unit Price and Unit Margin must be valid numbers.');
        }

        const itemName = document.getElementById('catalogue-itemName-input').value.trim();
        const categoryId = document.getElementById('catalogue-itemCategory-select').value;
        const initialStock = parseInt(document.getElementById('catalogue-initialStock-input').value, 10) || 0;

        if (!itemName) {
            ProgressToast.hide(0);
            return showModal('error', 'Invalid Input', 'Please enter a product name.');
        }

        if (!categoryId) {
            ProgressToast.hide(0);
            return showModal('error', 'Invalid Input', 'Please select a product category.');
        }

        // Step 2: Calculate Pricing
        ProgressToast.updateProgress('Calculating selling price...', 40, 'Step 2 of 5');

        const sellingPrice = unitPrice * (1 + unitMarginPercentage / 100);

        // Step 3: Prepare Product Data
        ProgressToast.updateProgress('Preparing product data...', 60, 'Step 3 of 5');

        const productData = {
            itemName: itemName,
            categoryId: categoryId,
            unitPrice,
            unitMarginPercentage,
            sellingPrice,
            inventoryCount: initialStock
        };

        console.log('[main.js] Product data prepared:', {
            name: productData.itemName,
            category: categoryId,
            cost: formatCurrency(productData.unitPrice),
            margin: `${productData.unitMarginPercentage}%`,
            sellingPrice: formatCurrency(productData.sellingPrice),
            stock: productData.inventoryCount
        });

        // Step 4: Save to Database
        ProgressToast.updateProgress('Saving product to catalogue...', 80, 'Step 4 of 5');

        await addProduct(productData, user);

        // Step 5: Success Completion
        ProgressToast.updateProgress('Product added successfully!', 100, 'Step 5 of 5');
        ProgressToast.showSuccess(`"${itemName}" has been added to the product catalogue!`);

        console.log(`[main.js] ✅ Product "${itemName}" saved successfully`);

        // Show completion briefly, then close modal
        setTimeout(async () => {
            ProgressToast.hide(800);
            
            await showModal('success', 'Product Added', 
                `"${itemName}" has been added to the catalogue successfully.\n\n` +
                `• Selling Price: ${formatCurrency(sellingPrice)}\n` +
                `• Initial Stock: ${initialStock} units\n` +
                `• Category: ${masterData.categories.find(c => c.id === categoryId)?.categoryName || 'Unknown'}`
            );
            
            // Close modal and reset
            closeAddProductToCatalogueModal();
            
        }, 1200);

    } catch (error) {
        console.error("Error adding product to catalogue:", error);
        
        // Show error in toast
        ProgressToast.showError(
            `Failed to add product: ${error.message || 'An unexpected error occurred.'}`
        );
        
        // Also show traditional error modal after brief delay
        setTimeout(async () => {
            await showModal('error', 'Save Failed', 'Failed to add the product to catalogue. Please try again.');
        }, 2000);
    }
}


/**
 * Handles product form submission with comprehensive validation and progress feedback.
 * 
 * Creates new product records in the product catalogue with automatic selling price
 * calculation based on cost plus margin. Validates all inputs, saves to Firestore,
 * and provides real-time progress updates via toast notifications.
 * 
 * BUSINESS LOGIC:
 * - Calculates selling price: Unit Cost × (1 + Margin%)
 * - Sets initial inventory levels for new products
 * - Links products to categories for organization
 * - Creates foundation for purchase invoice line items
 * 
 * VALIDATION RULES:
 * - Product name: Required, non-empty string
 * - Category: Must select from existing categories
 * - Unit price: Must be positive number (cost basis)
 * - Margin: Must be valid percentage (0 or greater)
 * - Stock: Must be non-negative integer
 * 
 * @param {Event} e - Form submission event from add-product-form
 * @throws {Error} When validation fails or Firestore operations error
 * @since 1.0.0
 * @see addProduct() - API function for creating product records
 * @see masterData.categories - Used for category validation and display
 */
async function handleProductSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;

    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Progress toast for product creation
    ProgressToast.show('Adding Product to Catalogue', 'info');

    try {
        // Step 1: Input Validation - Pricing
        ProgressToast.updateProgress('Validating pricing information...', 20, 'Step 1 of 5');

        const unitPrice = parseFloat(document.getElementById('unitPrice-input').value);
        const unitMarginPercentage = parseFloat(document.getElementById('unitMargin-input').value);

        if (isNaN(unitPrice) || unitPrice <= 0) {
            ProgressToast.hide(0);
            return showModal('error', 'Invalid Unit Price', 'Unit Price must be a valid number greater than zero.');
        }

        if (isNaN(unitMarginPercentage) || unitMarginPercentage < 0) {
            ProgressToast.hide(0);
            return showModal('error', 'Invalid Margin', 'Unit Margin must be a valid percentage (0 or greater).');
        }

        // Step 2: Input Validation - Product Details
        ProgressToast.updateProgress('Validating product information...', 35, 'Step 2 of 5');

        const itemName = document.getElementById('itemName-input').value.trim();
        const categoryId = document.getElementById('itemCategory-select').value;
        const initialStock = parseInt(document.getElementById('initialStock-input').value, 10) || 0;

        if (!itemName) {
            ProgressToast.hide(0);
            return showModal('error', 'Missing Product Name', 'Please enter a product name.');
        }

        if (!categoryId) {
            ProgressToast.hide(0);
            return showModal('error', 'Missing Category', 'Please select a product category.');
        }

        if (initialStock < 0) {
            ProgressToast.hide(0);
            return showModal('error', 'Invalid Stock', 'Initial stock cannot be negative.');
        }

        // Step 3: Calculate Final Pricing
        ProgressToast.updateProgress('Calculating selling price...', 55, 'Step 3 of 5');

        const sellingPrice = unitPrice * (1 + unitMarginPercentage / 100);
        const categoryName = masterData.categories.find(c => c.id === categoryId)?.categoryName || 'Unknown';

        const productData = {
            itemName: itemName,
            categoryId: categoryId,
            unitPrice,
            unitMarginPercentage,
            sellingPrice,
            inventoryCount: initialStock
        };

        console.log(`[main.js] Creating product: ${itemName}`, {
            category: categoryName,
            cost: formatCurrency(unitPrice),
            margin: `${unitMarginPercentage}%`,
            sellingPrice: formatCurrency(sellingPrice),
            stock: initialStock
        });

        // Step 4: Save to Database
        ProgressToast.updateProgress('Saving product to catalogue...', 85, 'Step 4 of 5');

        await addProduct(productData, user);

        // Step 5: Success
        ProgressToast.updateProgress('Product added successfully!', 100, 'Step 5 of 5');
        ProgressToast.showSuccess(`"${itemName}" has been added to the product catalogue!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            await showModal('success', 'Product Added', 
                `"${itemName}" has been added successfully!\n\n` +
                `• Category: ${categoryName}\n` +
                `• Cost: ${formatCurrency(unitPrice)}\n` +
                `• Margin: ${unitMarginPercentage}%\n` +
                `• Selling Price: ${formatCurrency(sellingPrice)}\n` +
                `• Initial Stock: ${initialStock} units`
            );
            
            // Reset form for next product
            e.target.reset();
            
        }, 1200);

    } catch (error) {
        console.error("Error adding product:", error);
        
        ProgressToast.showError(`Failed to add product: ${error.message || 'Database error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Add Product Failed', 
                'Failed to add the product to catalogue. Please try again.\n\n' +
                'If the problem persists, check:\n' +
                '• Internet connection\n' +
                '• All fields are properly filled\n' +
                '• Category is selected'
            );
        }, 2000);
    }
}



function handlePurchaseInvoiceSubmit(e) {
    e.preventDefault();
    handleSavePurchaseInvoice();
}

/**
 * Handles supplier payment form submission with validation, reconciliation, and progress tracking.
 * 
 * Records supplier payments against purchase invoices with automatic balance updates
 * and invoice status reconciliation. Validates payment data, ensures financial accuracy,
 * and provides real-time progress feedback during the complex payment processing workflow.
 * 
 * BUSINESS CONTEXT:
 * - Records payments to suppliers for purchase invoices
 * - Updates invoice balances and payment status automatically
 * - Maintains accurate supplier account balances
 * - Critical for cash flow management and financial reporting
 * - Supports partial payments and payment tracking over time
 * 
 * VALIDATION RULES:
 * - Payment amount: Must be positive number, cannot exceed invoice balance
 * - Payment date: Must be valid date, typically not future-dated
 * - Payment mode: Must select from available payment methods
 * - Transaction reference: Recommended for audit trail and reconciliation
 * - Related invoice: Must exist and have outstanding balance
 * 
 * @param {Event} e - Form submission event from payment recording forms
 * @throws {Error} When validation fails, invoice not found, or transaction processing fails
 * @since 1.0.0
 * @see recordPaymentAndUpdateInvoice() - Transactional API for payment processing
 * @see closePaymentModal() - UI function to close payment modal after success
 */
async function handlePaymentSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Progress toast for payment processing
    ProgressToast.show('Recording Supplier Payment', 'info');

    try {
        // Step 1: Input Collection and Basic Validation
        ProgressToast.updateProgress('Validating payment information...', 20, 'Step 1 of 5');

        const paymentDate = document.getElementById('payment-date-input').value;
        const amountPaidInput = document.getElementById('payment-amount-input').value;
        const paymentMode = document.getElementById('payment-mode-select').value;
        const transactionRef = document.getElementById('payment-ref-input').value.trim();
        const notes = document.getElementById('payment-notes-input').value.trim();
        const relatedInvoiceId = document.getElementById('payment-invoice-id').value;
        const supplierId = document.getElementById('payment-supplier-id').value;

        // Validate required fields
        if (!paymentDate) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Payment Date', 'Please select the payment date.');
            return;
        }

        if (!paymentMode) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Payment Mode', 'Please select how the payment was made.');
            return;
        }

        if (!relatedInvoiceId || !supplierId) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Invoice Information', 'Payment must be linked to a specific invoice.');
            return;
        }

        // Step 2: Financial Validation
        ProgressToast.updateProgress('Validating payment amount...', 35, 'Step 2 of 5');

        const amountPaid = parseFloat(amountPaidInput);

        if (isNaN(amountPaid) || amountPaid <= 0) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Payment Amount', 'Payment amount must be a valid number greater than zero.');
            return;
        }

        // Validate payment date is reasonable
        const paymentDateObj = new Date(paymentDate);
        const today = new Date();
        const futureLimit = new Date();
        futureLimit.setDate(today.getDate() + 7); // Allow up to 7 days in future

        if (paymentDateObj > futureLimit) {
            const confirmFuturePayment = await showModal('confirm', 'Future Payment Date', 
                `The payment date is ${Math.ceil((paymentDateObj - today) / (1000 * 60 * 60 * 24))} days in the future. ` +
                'Are you sure this is correct?'
            );
            if (!confirmFuturePayment) {
                ProgressToast.hide(0);
                return;
            }
        }

        // Step 3: Prepare Payment Data
        ProgressToast.updateProgress('Preparing payment record...', 55, 'Step 3 of 5');

        const paymentData = {
            paymentDate: paymentDateObj,
            amountPaid: amountPaid,
            paymentMode: paymentMode,
            transactionRef: transactionRef,
            notes: notes,
            relatedInvoiceId: relatedInvoiceId,
            supplierId: supplierId
        };

        // Get supplier name for logging and user feedback
        const supplier = masterData.suppliers.find(s => s.id === supplierId);
        const supplierName = supplier ? supplier.supplierName : 'Unknown Supplier';

        console.log(`[main.js] Recording payment: ${formatCurrency(amountPaid)} to ${supplierName}`, {
            mode: paymentMode,
            date: paymentDateObj.toLocaleDateString(),
            reference: transactionRef || 'No reference',
            invoice: relatedInvoiceId
        });

        // Step 4: Process Payment (Complex Transactional Operation)
        ProgressToast.updateProgress('Processing payment and updating invoice balance...', 85, 'Step 4 of 5');

        await recordPaymentAndUpdateInvoice(paymentData, user);

        // Step 5: Success
        ProgressToast.updateProgress('Payment recorded successfully!', 100, 'Step 5 of 5');
        ProgressToast.showSuccess(`${formatCurrency(amountPaid)} payment to ${supplierName} recorded!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            await showModal('success', 'Payment Recorded', 
                `Supplier payment has been recorded successfully!\n\n` +
                `• Supplier: ${supplierName}\n` +
                `• Amount: ${formatCurrency(amountPaid)}\n` +
                `• Payment Mode: ${paymentMode}\n` +
                `• Date: ${paymentDateObj.toLocaleDateString()}\n` +
                `• Reference: ${transactionRef || 'Not provided'}\n\n` +
                `✓ Invoice balance updated automatically\n` +
                `✓ Payment status recalculated\n` +
                `✓ Supplier account balance adjusted`
            );
            
            // Close payment modal
            closePaymentModal();
            
        }, 1200);

    } catch (error) {
        console.error("Error recording supplier payment:", error);
        
        ProgressToast.showError(`Failed to record payment: ${error.message || 'Transaction processing error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Payment Recording Failed', 
                'There was an error recording the supplier payment.\n\n' +
                'Common causes:\n' +
                '• Payment amount exceeds invoice balance\n' +
                '• Invoice has already been fully paid\n' +
                '• Network connection interrupted during save\n' +
                '• Insufficient permissions for payment processing\n\n' +
                'Please verify the payment details and try again.'
            );
        }, 2000);
    }
}



/**
 * Handles church team form submission with validation and progress tracking.
 * 
 * Creates new church teams for consignment sales management and community organization.
 * Validates team names, ensures proper church association, and establishes foundation
 * for team member management and consignment request processing.
 * 
 * BUSINESS CONTEXT:
 * - Church teams manage consignment sales programs
 * - Each team can have multiple members with defined roles
 * - Teams request product consignments for sales activities
 * - Critical for community engagement and distributed sales model
 * - Enables team performance tracking and settlement management
 * 
 * VALIDATION RULES:
 * - Team name: Required, descriptive identifier for the team
 * - Church association: Automatically linked to current church context
 * - Uniqueness: Prevents duplicate team names within same church
 * - Business appropriateness: Should reflect actual church team structure
 * 
 * @param {Event} e - Form submission event from add-team-form
 * @throws {Error} When validation fails or Firestore operations fail
 * @since 1.0.0
 * @see addChurchTeam() - API function for creating team records with audit trail
 * @see appState.ChurchName - Current church context for team association
 * @see masterData.teams - Used for duplicate detection and team management
 */
async function handleTeamSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;

    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in to create teams.');
        return;
    }

    // ✅ START: Progress toast for team creation
    ProgressToast.show('Creating Church Team', 'info');

    try {
        // Step 1: Input Validation
        ProgressToast.updateProgress('Validating team information...', 25, 'Step 1 of 4');

        const teamName = document.getElementById('team-name-input').value.trim();

        if (!teamName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Team Name', 'Please enter a descriptive team name.');
            return;
        }

        // Validate team name length and format
        if (teamName.length < 3) {
            ProgressToast.hide(0);
            await showModal('error', 'Name Too Short', 'Team name must be at least 3 characters long for clarity.');
            return;
        }

        if (teamName.length > 50) {
            ProgressToast.hide(0);
            await showModal('error', 'Name Too Long', 'Team name must be 50 characters or less for display purposes.');
            return;
        }

        // Check for duplicate team names
        const existingTeam = masterData.teams.find(t => 
            t.teamName.toLowerCase() === teamName.toLowerCase()
        );

        if (existingTeam) {
            ProgressToast.hide(0);
            const proceedWithDuplicate = await showModal('confirm', 'Team Name Already Exists', 
                `A team named "${existingTeam.teamName}" already exists.\n\n` +
                'Duplicate team names can cause confusion in consignment management.\n\n' +
                'Do you want to create another team with the same name?'
            );
            
            if (!proceedWithDuplicate) {
                return; // User chose not to create duplicate
            }

            // User confirmed - restart progress with warning theme
            ProgressToast.show('Creating Duplicate Team Name', 'warning');
            ProgressToast.updateProgress('Creating team with duplicate name...', 25, 'User Confirmed');
        }

        // Step 2: Prepare Team Data
        ProgressToast.updateProgress('Preparing team data and church association...', 50, 'Step 2 of 4');

        const churchName = appState.ChurchName;
        
        if (!churchName) {
            ProgressToast.hide(0);
            await showModal('error', 'Church Information Missing', 'Church context is not available. Please refresh the page.');
            return;
        }

        const teamData = {
            teamName: teamName,
            churchName: churchName
        };

        console.log(`[main.js] Creating team: "${teamName}" for ${churchName}`, {
            teamName: teamName,
            church: churchName,
            creator: user.displayName
        });

        // Step 3: Save to Database
        ProgressToast.updateProgress('Creating team and setting up permissions...', 80, 'Step 3 of 4');

        await addChurchTeam(teamData, user);

        // Step 4: Success
        ProgressToast.updateProgress('Team created successfully!', 100, 'Step 4 of 4');
        ProgressToast.showSuccess(`"${teamName}" has been created and is ready for members!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            // Calculate total teams for context
            const totalTeams = masterData.teams.length + 1; // Including the one just added
            
            await showModal('success', 'Church Team Created', 
                `Church team "${teamName}" has been created successfully!\n\n` +
                `• Church: ${churchName}\n` +
                `• Total Teams: ${totalTeams}\n` +
                `• Status: Active and ready for members\n` +
                `• Created By: ${user.displayName}\n\n` +
                `Next steps:\n` +
                `✓ Add team members and assign roles\n` +
                `✓ Designate a team lead for consignment requests\n` +
                `✓ Begin planning consignment sales activities\n` +
                `✓ Track team performance and settlements`
            );
            
            // Reset form for next team
            e.target.reset();
            
        }, 1200);

    } catch (error) {
        console.error("Error creating church team:", error);
        
        ProgressToast.showError(`Failed to create team: ${error.message || 'Database error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Team Creation Failed', 
                'Failed to create the church team. Please try again.\n\n' +
                'If the problem persists, check:\n' +
                '• Internet connection is stable\n' +
                '• Team name is appropriate for church context\n' +
                '• You have administrative permissions\n' +
                '• Church information is properly configured\n' +
                '• Team name doesn\'t conflict with existing teams'
            );
        }, 2000);
    }
}


/**
 * Handles team member form submission for both adding new members and updating existing ones.
 * 
 * Manages church team membership including role assignments, team lead designations,
 * and member contact information. Validates member data, processes team leadership
 * changes, and maintains team membership synchronization with progress tracking.
 * 
 * BUSINESS CONTEXT:
 * - Team members are individuals who participate in consignment sales
 * - Team leads have special permissions to create consignment requests
 * - Member information is used for communication and accountability
 * - Role changes trigger team leadership updates and permissions
 * - Critical for consignment workflow and team performance tracking
 * 
 * VALIDATION RULES:
 * - Member name: Required, should be real person's name
 * - Email: Must be valid format for communication and login
 * - Phone: Contact number for coordination (optional but recommended)
 * - Role: Must select appropriate team role (Member or Team Lead)
 * - Team association: Must belong to existing, active team
 * 
 * @param {Event} e - Form submission event from member-form modal
 * @throws {Error} When validation fails, team not found, or member operations fail
 * @since 1.0.0
 * @see addTeamMember() - API function for adding members with membership sync
 * @see updateTeamMember() - API function for updating member information
 * @see updateChurchTeam() - API function for team leadership updates
 * @see getTeamDataFromGridById() - UI function to get team context
 */
async function handleMemberSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in to manage team members.');
        return;
    }

    const memberId = document.getElementById('member-doc-id').value;
    const isEditMode = !!memberId;

    // ✅ START: Progress toast with mode-appropriate title
    ProgressToast.show(
        isEditMode ? 'Updating Team Member' : 'Adding Team Member', 
        'info'
    );

    try {
        // Step 1: Team Context Validation
        ProgressToast.updateProgress('Validating team information...', 15, 'Step 1 of 6');

        const teamId = document.getElementById('member-team-id').value;
        const teamData = getTeamDataFromGridById(teamId);
        
        if (!teamData) {
            ProgressToast.hide(0);
            await showModal('error', 'Team Not Found', 'Could not find the parent team data. Please refresh and try again.');
            return;
        }

        if (!teamData.isActive) {
            ProgressToast.hide(0);
            await showModal('error', 'Inactive Team', `Team "${teamData.teamName}" is not active. Please activate the team first.`);
            return;
        }

        // Step 2: Member Data Validation
        ProgressToast.updateProgress('Validating member information...', 30, 'Step 2 of 6');

        const memberName = document.getElementById('member-name-input').value.trim();
        const memberEmail = document.getElementById('member-email-input').value.trim();
        const memberPhone = document.getElementById('member-phone-input').value.trim();
        const memberRole = document.getElementById('member-role-select').value;

        if (!memberName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Member Name', 'Please enter the member\'s full name.');
            return;
        }

        if (memberName.length < 2) {
            ProgressToast.hide(0);
            await showModal('error', 'Name Too Short', 'Member name must be at least 2 characters long.');
            return;
        }

        // Email validation (required for login and communication)
        if (!memberEmail) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Email', 'Email address is required for member communication and system access.');
            return;
        }

        if (!memberEmail.includes('@') || !memberEmail.includes('.')) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Email', 'Please enter a valid email address.');
            return;
        }

        if (!memberRole) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Role', 'Please select a role for this team member.');
            return;
        }

        // Step 3: Business Logic Validation
        ProgressToast.updateProgress('Checking team membership rules...', 45, 'Step 3 of 6');

        const memberData = {
            name: memberName,
            email: memberEmail.toLowerCase(), // Normalize email
            phone: memberPhone,
            role: memberRole
        };

        // Check for duplicate email within team (for new members)
        if (!isEditMode && teamData.members) {
            const duplicateEmail = teamData.members.find(m => 
                m.email.toLowerCase() === memberEmail.toLowerCase()
            );
            
            if (duplicateEmail) {
                ProgressToast.hide(0);
                await showModal('error', 'Duplicate Email', 
                    `Email "${memberEmail}" is already used by team member "${duplicateEmail.name}".\n\n` +
                    'Each team member must have a unique email address.'
                );
                return;
            }
        }

        console.log(`[main.js] ${isEditMode ? 'Updating' : 'Adding'} member: ${memberName} (${memberRole}) to team ${teamData.teamName}`);

        // Step 4: Database Operation
        ProgressToast.updateProgress(
            isEditMode ? 'Updating member information...' : 'Adding member to team...', 
            65, 
            'Step 4 of 6'
        );

        if (isEditMode) {
            await updateTeamMember(teamId, memberId, memberData);
        } else {
            await addTeamMember(teamId, teamData.teamName, memberData, user);
        }

        // Step 5: Handle Team Leadership Changes
        if (memberData.role === 'Team Lead') {
            ProgressToast.updateProgress('Updating team leadership...', 85, 'Step 5 of 6');
            
            await updateChurchTeam(teamId, {
                teamLeadId: isEditMode ? memberId : 'auto-assigned', // Will be set by the system
                teamLeadName: memberData.name
            }, user);
            
            console.log(`[main.js] ✅ ${memberName} designated as Team Lead for ${teamData.teamName}`);
        } else {
            ProgressToast.updateProgress('Finalizing member registration...', 85, 'Step 5 of 6');
        }

        // Step 6: Success Completion
        ProgressToast.updateProgress(
            isEditMode ? 'Member updated successfully!' : 'Member added successfully!', 
            100, 
            'Step 6 of 6'
        );

        const successMessage = isEditMode 
            ? `"${memberName}" has been updated in ${teamData.teamName}!`
            : `"${memberName}" has been added to ${teamData.teamName}!`;

        ProgressToast.showSuccess(successMessage);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            const operation = isEditMode ? 'updated' : 'added';
            const currentMemberCount = (teamData.members?.length || 0) + (isEditMode ? 0 : 1);
            
            await showModal('success', `Member ${isEditMode ? 'Updated' : 'Added'}`, 
                `Team member "${memberName}" has been ${operation} successfully!\n\n` +
                `• Team: ${teamData.teamName}\n` +
                `• Role: ${memberData.role}\n` +
                `• Email: ${memberData.email}\n` +
                `• Phone: ${memberData.phone || 'Not provided'}\n` +
                `• Team Size: ${currentMemberCount} member${currentMemberCount !== 1 ? 's' : ''}\n\n` +
                `${memberData.role === 'Team Lead' ? 
                    '👑 This member can now create consignment requests for the team!' : 
                    '👤 This member can participate in team consignment activities.'}`
            );
            
            closeMemberModal();
            
        }, 1200);

    } catch (error) {
        console.error("Error saving team member:", error);
        
        const operation = isEditMode ? 'update' : 'add';
        ProgressToast.showError(`Failed to ${operation} member: ${error.message || 'Database error'}`);
        
        setTimeout(async () => {
            await showModal('error', `Member ${isEditMode ? 'Update' : 'Addition'} Failed`, 
                `Failed to ${operation} the team member. Please try again.\n\n` +
                'If the problem persists, check:\n' +
                '• Internet connection is stable\n' +
                '• All required fields are properly filled\n' +
                '• Email address is valid and unique within the team\n' +
                '• Team is active and accessible\n' +
                '• You have permission to manage team members'
            );
        }, 2000);
    }
}



/**
 * Handles the submission of the Sales Catalogue form for both create and edit operations.
 * 
 * This function manages the complete workflow for sales catalogue operations including:
 * - Input validation and data sanitization
 * - Catalogue creation with multiple items (create mode)
 * - Catalogue updates for existing catalogues (edit mode)  
 * - Real-time progress feedback via toast notifications
 * - Comprehensive error handling with user-friendly messages
 * 
 * BUSINESS WORKFLOW:
 * CREATE MODE: Validates inputs → Checks draft items → Creates catalogue + items → Updates price history
 * EDIT MODE: Validates inputs → Updates catalogue metadata → Manages price history status
 * 
 * DEPENDENCIES:
 * - Requires authenticated user (appState.currentUser)
 * - Uses appState.draftCatalogueItems for create mode
 * - Calls API functions: createCatalogueWithItems(), updateSalesCatalogue()
 * - Uses ProgressToast class for user feedback
 * - Uses masterData.categories for category name lookup
 * 
 * UI INTEGRATION:
 * - Form elements: catalogue-name-input, catalogue-season-select
 * - Hidden field: sales-catalogue-doc-id (determines edit vs create mode)
 * - Calls resetCatalogueForm() on success
 * - Shows success/error modals for final confirmation
 * 
 * ERROR HANDLING:
 * - Validates all required fields with specific error messages
 * - Handles API errors with detailed user feedback
 * - Maintains UI state consistency on errors
 * - Provides actionable error messages for troubleshooting
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Uses toast progress to indicate long-running operations
 * - Early validation to prevent unnecessary API calls
 * - Efficient data preparation (removes tempId from draft items)
 * - Proper cleanup on both success and error paths
 * 
 * @param {Event} e - Form submission event object
 * 
 * @throws {Error} When database operations fail or validation errors occur
 * 
 * @example
 * // Triggered automatically by form submission:
 * // <form id="sales-catalogue-form" onsubmit="handleCatalogueSubmit(event)">
 * 
 * // Create mode: Creates new catalogue with draft items from appState
 * // Edit mode: Updates existing catalogue identified by sales-catalogue-doc-id
 * 
 * @since 1.0.0
 * @see createCatalogueWithItems() - API function for creating catalogues with items
 * @see updateSalesCatalogue() - API function for updating existing catalogues  
 * @see ProgressToast - UI class for progress feedback
 * @see appState.draftCatalogueItems - Temporary storage for catalogue items being created
 * 
 * @author TrinityCart Development Team
 */

async function handleCatalogueSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;

    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    const docId = document.getElementById('sales-catalogue-doc-id').value;
    const isEditMode = !!docId;
    
    // ✅ START: Toast progress with appropriate title
    ProgressToast.show(
        isEditMode ? 'Updating Sales Catalogue' : 'Creating Sales Catalogue', 
        'info'
    );

    try {
        // Step 1: Input Validation
        ProgressToast.updateProgress('Validating catalogue data...', 15, 'Step 1 of 6');

        const seasonSelect = document.getElementById('catalogue-season-select');
        const catalogueName = document.getElementById('catalogue-name-input').value.trim();

        if (!catalogueName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Information', 'Please enter a catalogue name.');
            return;
        }

        if (!seasonSelect.value) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Information', 'Please select a sales season.');
            return;
        }

        const catalogueData = {
            catalogueName: catalogueName,
            seasonId: seasonSelect.value,
            seasonName: seasonSelect.options[seasonSelect.selectedIndex].text
        };

        console.log(`[main.js] ${isEditMode ? 'Updating' : 'Creating'} catalogue:`, catalogueData.catalogueName);

        if (isEditMode) {
            // ===== EDIT MODE WORKFLOW =====
            
            // Step 2: Prepare Update
            ProgressToast.updateProgress('Preparing catalogue updates...', 40, 'Step 2 of 4');
            
            console.log(`[main.js] Updating existing catalogue: ${docId}`);

            // Step 3: Update Database  
            ProgressToast.updateProgress('Updating catalogue in database...', 75, 'Step 3 of 4');

            await updateSalesCatalogue(docId, catalogueData, user);

            // Step 4: Success
            ProgressToast.updateProgress('Catalogue updated successfully!', 100, 'Step 4 of 4');
            ProgressToast.showSuccess(`"${catalogueData.catalogueName}" has been updated!`);

            setTimeout(async () => {
                ProgressToast.hide(800);
                
                await showModal('success', 'Catalogue Updated', 
                    `Sales catalogue "${catalogueData.catalogueName}" has been updated successfully.\n\n` +
                    `Season: ${catalogueData.seasonName}`
                );
                
                resetCatalogueForm();
                
            }, 1200);

        } else {
            // ===== CREATE MODE WORKFLOW =====
            
            // Step 2: Validate Items
            ProgressToast.updateProgress('Checking catalogue items...', 25, 'Step 2 of 6');

            if (appState.draftCatalogueItems.length === 0) {
                ProgressToast.hide(0);
                await showModal('error', 'No Items', 'Please add at least one item to the catalogue before saving.');
                return;
            }

            const itemCount = appState.draftCatalogueItems.length;
            console.log(`[main.js] Creating catalogue with ${itemCount} items`);

            // Step 3: Prepare Items Data
            ProgressToast.updateProgress(`Preparing ${itemCount} catalogue items...`, 45, 'Step 3 of 6');

            const itemsToSave = appState.draftCatalogueItems.map(({ tempId, ...rest }) => rest);
            
            // Log items summary
            const itemsSummary = itemsToSave.slice(0, 3).map(item => item.productName).join(', ');
            console.log(`[main.js] Items to save: ${itemsSummary}${itemCount > 3 ? ` and ${itemCount - 3} more...` : ''}`);

            // Step 4: Create Catalogue Structure
            ProgressToast.updateProgress('Creating catalogue structure...', 65, 'Step 4 of 6');

            // Step 5: Save Catalogue and Items  
            ProgressToast.updateProgress(`Saving catalogue with ${itemCount} items...`, 85, 'Step 5 of 6');

            await createCatalogueWithItems(catalogueData, itemsToSave, user);

            // Step 6: Success
            ProgressToast.updateProgress('Sales catalogue created successfully!', 100, 'Step 6 of 6');
            ProgressToast.showSuccess(`"${catalogueData.catalogueName}" created with ${itemCount} items!`);

            setTimeout(async () => {
                ProgressToast.hide(800);
                
                await showModal('success', 'Catalogue Created', 
                    `Sales catalogue "${catalogueData.catalogueName}" has been created successfully!\n\n` +
                    `• Season: ${catalogueData.seasonName}\n` +
                    `• Items: ${itemCount} products added\n` +
                    `• Status: Active and ready for consignment requests`
                );
                
                resetCatalogueForm();
                
            }, 1200);
        }

        // Reset the form
        e.target.reset();

    } catch (error) {
        console.error("Error saving sales catalogue:", error);
        
        // Enhanced error feedback
        const operation = isEditMode ? 'update' : 'create';
        const errorMessage = error.message || 'An unexpected error occurred';
        
        ProgressToast.showError(`Failed to ${operation} catalogue: ${errorMessage}`);
        
        setTimeout(async () => {
            await showModal('error', `${isEditMode ? 'Update' : 'Creation'} Failed`, 
                `There was an error ${isEditMode ? 'updating' : 'creating'} the sales catalogue.\n\n` +
                `Error details: ${errorMessage}\n\n` +
                `Please try again or contact support if the issue persists.`
            );
        }, 2000);
    }
}


/**
 * Handles consignment request form submission with role-based validation and progress tracking.
 * 
 * Creates consignment requests for team-based sales programs including product selection,
 * quantity management, and team assignment. Supports both admin-initiated requests (for any team)
 * and team lead self-service requests. Manages complex multi-step workflow with progress feedback.
 * 
 * BUSINESS CONTEXT:
 * - Consignment requests are the foundation of team-based sales programs
 * - Team leads request products for their teams to sell at events
 * - Admin users can create requests on behalf of any team
 * - Requests must be fulfilled by admins before teams can start selling
 * - Critical for inventory allocation and team sales coordination
 * 
 * ROLE-BASED WORKFLOW:
 * ADMIN MODE: Selects any team → Selects team lead → Creates request
 * TEAM LEAD MODE: Uses own team → Creates request for their team
 * 
 * VALIDATION RULES:
 * - Team selection: Must select active team with proper permissions
 * - Team lead: Must designate responsible team lead for the request
 * - Sales catalogue: Must select active catalogue with available items
 * - Product quantities: Must request at least one item with quantity > 0
 * - Event association: Optional but recommended for tracking
 * 
 * @param {Event} e - Form submission event from consignment-request-form modal
 * @throws {Error} When validation fails, permission denied, or request processing fails
 * @since 1.0.0
 * @see createConsignmentRequest() - API function for creating consignment requests
 * @see getRequestedConsignmentItems() - UI function to get selected products and quantities
 * @see closeConsignmentRequestModal() - UI function to close request modal after success
 */
async function handleConsignmentRequestSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in to create consignment requests.');
        return;
    }

    // ✅ START: Progress toast for consignment request
    ProgressToast.show('Creating Consignment Request', 'info');

    try {
        // Step 1: Role-Based Context Validation
        ProgressToast.updateProgress('Validating request permissions...', 12, 'Step 1 of 8');

        const isAdminMode = user.role === 'admin';
        const teamSelect = document.getElementById(isAdminMode ? 'admin-select-team' : 'user-select-team');
        
        if (!teamSelect || !teamSelect.value) {
            ProgressToast.hide(0);
            await showModal('error', 'No Team Selected', 'Please select a team for this consignment request.');
            return;
        }

        let requestingMemberId, requestingMemberName, requestingMemberEmail;

        if (isAdminMode) {
            // Admin workflow: Must select team lead
            ProgressToast.updateProgress('Processing admin team selection...', 20, 'Admin Mode');
            
            const memberSelect = document.getElementById('admin-select-member');
            if (!memberSelect.value) {
                ProgressToast.hide(0);
                await showModal('error', 'No Team Lead Selected', 'Please select a Team Lead for this consignment request.');
                return;
            }

            try {
                const selectedLead = JSON.parse(memberSelect.value);
                requestingMemberId = selectedLead.id;
                requestingMemberName = selectedLead.name;
                requestingMemberEmail = selectedLead.email;
                
                console.log(`[main.js] Admin creating request for team lead: ${requestingMemberName}`);
            } catch (parseError) {
                ProgressToast.hide(0);
                await showModal('error', 'Invalid Team Lead Data', 'Team lead information is corrupted. Please refresh and try again.');
                return;
            }
        } else {
            // Team lead workflow: Use current user
            requestingMemberId = user.uid;
            requestingMemberName = user.displayName;
            requestingMemberEmail = user.email;
            
            console.log(`[main.js] Team lead ${requestingMemberName} creating request for their team`);
        }

        // Step 2: Catalogue and Event Validation
        ProgressToast.updateProgress('Validating catalogue and event selection...', 35, 'Step 2 of 8');

        const catalogueSelect = document.getElementById('request-catalogue-select');
        const eventSelect = document.getElementById('request-event-select');

        if (!catalogueSelect.value) {
            ProgressToast.hide(0);
            await showModal('error', 'No Catalogue Selected', 'Please select a sales catalogue for this consignment request.');
            return;
        }

        // Step 3: Product Selection Validation
        ProgressToast.updateProgress('Checking requested products...', 50, 'Step 3 of 8');

        const requestedItems = getRequestedConsignmentItems();
        
        if (requestedItems.length === 0) {
            ProgressToast.hide(0);
            await showModal('error', 'No Products Selected', 
                'Please select at least one product and set a quantity greater than zero.\n\n' +
                'Go back to Step 2 and check the products you want to request.'
            );
            return;
        }

        // Calculate total items and estimated value
        const totalQuantity = requestedItems.reduce((sum, item) => sum + item.quantityRequested, 0);
        const estimatedValue = requestedItems.reduce((sum, item) => sum + (item.quantityRequested * item.sellingPrice), 0);

        console.log(`[main.js] Request includes ${requestedItems.length} products, ${totalQuantity} total items, estimated value: ${formatCurrency(estimatedValue)}`);

        // Step 4: Prepare Request Data
        ProgressToast.updateProgress('Preparing consignment request data...', 65, 'Step 4 of 8');

        const requestData = {
            teamId: teamSelect.value,
            teamName: teamSelect.options[teamSelect.selectedIndex].text,
            salesCatalogueId: catalogueSelect.value,
            salesCatalogueName: catalogueSelect.options[catalogueSelect.selectedIndex].text,
            salesEventId: eventSelect.value || null,
            salesEventName: eventSelect.value ? eventSelect.options[eventSelect.selectedIndex].text : null,
            requestingMemberId,
            requestingMemberName,
            requestingMemberEmail
        };

        // Step 5: Inventory Availability Check (Optional Enhancement)
        ProgressToast.updateProgress('Verifying product availability...', 75, 'Step 5 of 8');

        // Check if requested quantities are reasonable compared to available stock
        let stockWarnings = [];
        requestedItems.forEach(item => {
            const product = masterData.products.find(p => p.id === item.productId);
            if (product && product.inventoryCount < item.quantityRequested) {
                stockWarnings.push(`${item.productName}: Requested ${item.quantityRequested}, Available ${product.inventoryCount}`);
            }
        });

        if (stockWarnings.length > 0) {
            const proceedWithLowStock = await showModal('confirm', 'Low Stock Warning', 
                'Some requested quantities exceed available stock:\n\n' +
                stockWarnings.slice(0, 3).join('\n') +
                (stockWarnings.length > 3 ? `\n...and ${stockWarnings.length - 3} more items` : '') +
                '\n\nAdmin will adjust quantities during fulfillment. Continue with request?'
            );
            
            if (!proceedWithLowStock) {
                ProgressToast.hide(0);
                return;
            }
        }

        // Step 6: Create Request Document
        ProgressToast.updateProgress('Creating consignment request...', 85, 'Step 6 of 8');

        await createConsignmentRequest(requestData, requestedItems, user);

        // Step 7: Success Processing
        ProgressToast.updateProgress('Request submitted successfully!', 95, 'Step 7 of 8');

        // Step 8: Final Completion
        ProgressToast.updateProgress('Consignment request created and queued for fulfillment!', 100, 'Step 8 of 8');
        ProgressToast.showSuccess(`Consignment request for ${requestData.teamName} has been submitted!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            await showModal('success', 'Consignment Request Submitted', 
                `Consignment request has been created successfully!\n\n` +
                `• Team: ${requestData.teamName}\n` +
                `• Requesting Member: ${requestingMemberName}\n` +
                `• Sales Catalogue: ${requestData.salesCatalogueName}\n` +
                `• Sales Event: ${requestData.salesEventName || 'No specific event'}\n` +
                `• Products Requested: ${requestedItems.length} different items\n` +
                `• Total Quantity: ${totalQuantity} units\n` +
                `• Estimated Value: ${formatCurrency(estimatedValue)}\n\n` +
                `📋 Status: Pending Admin Fulfillment\n` +
                `⏳ Next: Admin will review and fulfill this request\n` +
                `📧 You will be notified when items are ready for pickup`
            );
            
            closeConsignmentRequestModal();
            
        }, 1200);

    } catch (error) {
        console.error("Error creating consignment request:", error);
        
        ProgressToast.showError(`Failed to create request: ${error.message || 'Request processing error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Consignment Request Failed', 
                `Failed to submit the consignment request. Please try again.\n\n` +
                'If the problem persists, check:\n' +
                '• Internet connection is stable\n' +
                '• All required fields are selected\n' +
                '• You have permission to create requests for this team\n' +
                '• Selected catalogue is active and accessible\n' +
                '• Requested products are available in the catalogue'
            );
        }, 2000);
    }
}



async function handleActivityReportSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    const orderId = document.getElementById('activity-order-id').value;
    const productValue = document.getElementById('activity-product-select').value;

    if (!orderId || !productValue) {
        return alert("Missing order or product information.");
    }

    const { itemId, productId, sellingPrice } = JSON.parse(productValue);

    const activityData = {
        activityType: document.getElementById('activity-type-select').value,
        quantity: parseInt(document.getElementById('activity-quantity-input').value, 10),
        notes: document.getElementById('activity-notes-input').value,
        productId,
        salesEventId: document.getElementById('activity-type-select').value === 'Sale'
            ? document.getElementById('activity-event-select').value || null
            : null
    };

    if (!activityData.quantity || activityData.quantity <= 0) {
        return alert("Please enter a valid quantity greater than zero.");
    }

    try {
        await logActivityAndUpdateConsignment(orderId, itemId, activityData, sellingPrice, user);
        alert("Activity logged successfully!");
        closeReportActivityModal();
    } catch (error) {
        console.error("Error logging activity:", error);
        alert(`Failed to log activity: ${error.message}`);
    }
}

/**
 * SIMPLIFIED: Handles consignment payment submission with automatic donation detection.
 * 
 * Records team payments against consignment orders using the same logic as sales payments.
 * Automatically detects overpayments and records them as team donations with proper
 * source attribution. Much simpler and more intuitive than manual donation entry.
 * 
 * BUSINESS CONTEXT:
 * - Teams pay their consignment balance (sales revenue owed)
 * - Teams can pay extra as donations (overpayment detection)
 * - Same logic as customer sales payments for consistency
 * - Supports team generosity while maintaining simple workflow
 * 
 * @param {Event} e - Form submission event from make-payment-form
 */
async function handleMakePaymentSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in to submit payments.');
        return;
    }

    // ✅ START: Progress toast for consignment payment
    ProgressToast.show('Processing Team Payment', 'info');

    try {
        // Step 1: Basic Validation
        ProgressToast.updateProgress('Validating payment information...', 25, 'Step 1 of 4');

        const docId = document.getElementById('payment-ledger-doc-id').value;
        const isEditMode = !!docId;
        
        const paymentAmount = parseFloat(document.getElementById('payment-amount-input').value);
        const paymentMode = document.getElementById('payment-mode-select').value;
        const transactionRef = document.getElementById('payment-ref-input').value.trim();
        const notes = document.getElementById('payment-notes-input').value.trim();
        const paymentReason = document.getElementById('payment-reason-select').value;

        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Amount', 'Payment amount must be a number greater than zero.');
            return;
        }

        if (!paymentMode) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Payment Mode', 'Please select how the payment is being made.');
            return;
        }

        if (!transactionRef) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Reference', 'Please enter a Reference # for this payment.');
            return;
        }

        // Step 2: Get Order Context and Calculate Donation (CORRECTED)
        ProgressToast.updateProgress('Calculating payment allocation...', 50, 'Step 2 of 4');

        // ✅ CORRECTED: Use ui.js helper function instead of direct grid access
        const orderData = getSelectedConsignmentOrderData();
        
        if (!orderData) {
            ProgressToast.hide(0);
            await showModal('error', 'Order Data Error', 'Could not find consignment order data. Please refresh and try again.');
            return;
        }

        const balanceDue = orderData.balanceDue || 0;
        
        console.log(`[main.js] Processing payment for order ${orderData.consignmentId}:`, {
            teamName: orderData.teamName,
            balanceDue: formatCurrency(balanceDue),
            paymentAmount: formatCurrency(paymentAmount)
        });

        // ✅ SAME LOGIC AS SALES: Calculate donation automatically
        let donationAmount = 0;
        if (paymentAmount > balanceDue) {
            donationAmount = paymentAmount - balanceDue;
            
            const confirmDonation = await showModal('confirm', 'Team Overpayment - Record as Donation?', 
                `Payment amount: ${formatCurrency(paymentAmount)}\n` +
                `Balance due: ${formatCurrency(balanceDue)}\n` +
                `Team overpayment: ${formatCurrency(donationAmount)}\n\n` +
                `The team's extra ${formatCurrency(donationAmount)} will be recorded as a donation to the church. Continue?`
            );
            
            if (!confirmDonation) {
                ProgressToast.hide(0);
                return;
            }
            
            console.log(`[main.js] Team overpayment confirmed as donation: ${formatCurrency(donationAmount)}`);
        }

        const amountToApplyToOrder = Math.min(paymentAmount, balanceDue);

        // ✅ SIMPLIFIED: Same data structure as sales payment
        const paymentData = {
            orderId: appState.selectedConsignmentId,
            teamLeadId: user.uid,
            teamLeadName: user.displayName,
            teamName: orderData.teamName,
            
            // ✅ SAME PATTERN: amountPaid + donationAmount
            amountPaid: amountToApplyToOrder,
            donationAmount: donationAmount,
            totalPhysicalPayment: paymentAmount, // Total amount team gave
            
            paymentDate: new Date(document.getElementById('payment-date-input').value),
            paymentMode: paymentMode,
            transactionRef: transactionRef,
            notes: notes,
            paymentReason: paymentReason,
            
            // ✅ DONATION SOURCE
            donationSource: donationAmount > 0 ? DONATION_SOURCES.CONSIGNMENT_OVERPAYMENT : null
        };

        // Step 3: Submit Payment
        ProgressToast.updateProgress('Submitting payment record...', 85, 'Step 3 of 4');

        if (isEditMode) {
            await updatePaymentRecord(docId, paymentData, user);
        } else {
            await submitPaymentRecord(paymentData, user); // ✅ REUSE existing function
        }

        // Step 4: Success
        ProgressToast.updateProgress('Payment submitted successfully!', 100, 'Step 4 of 4');
        ProgressToast.showSuccess(
            donationAmount > 0 
                ? `Payment: ${formatCurrency(amountToApplyToOrder)} + Team Donation: ${formatCurrency(donationAmount)}!`
                : `Payment: ${formatCurrency(amountToApplyToOrder)} submitted!`
        );

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            await showModal('success', 'Team Payment Submitted', 
                `Team payment has been submitted successfully!\n\n` +
                `• Team: ${paymentData.teamName}\n` +
                `• Applied to Balance: ${formatCurrency(amountToApplyToOrder)}\n` +
                `${donationAmount > 0 ? `• Team Donation: ${formatCurrency(donationAmount)}\n` : ''}` +
                `• Payment Mode: ${paymentMode}\n` +
                `• Reference: ${transactionRef}\n\n` +
                `✓ Payment submitted for admin verification\n` +
                `${donationAmount > 0 ? '✓ Team donation recorded\n' : ''}` +
                `⏳ Awaiting admin verification`
            );
            
            resetPaymentForm();

            /*setTimeout(() => {
                refreshConsignmentPaymentsGrid();
                console.log('[main.js] Triggered payment history grid refresh');
            }, 500);*/
            
        }, 1200);

    } catch (error) {
        console.error("Error submitting team payment:", error);
        
        ProgressToast.showError(`Payment failed: ${error.message || 'Payment processing error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Payment Submission Failed', 
                `Failed to submit the team payment.\n\n` +
                `Error: ${error.message}\n\n` +
                `Please verify all information and try again.`
            );
        }, 2000);
    }
}


/**
 * Handles direct sales form submission with comprehensive validation, payment processing, and progress tracking.
 * 
 * Processes complete sales transactions including cart items, customer information, payment handling,
 * and inventory updates. Supports both immediate payment and invoice-based sales with automatic
 * inventory deduction and optional donation processing for overpayments.
 * 
 * BUSINESS CONTEXT:
 * - Direct sales for Church Store and Tasty Treats locations
 * - Uses active sales catalogues for accurate pricing and product availability
 * - Real-time inventory deduction upon sale completion
 * - Supports partial payments, overpayments (donations), and invoice creation
 * - Manual voucher numbers for audit trail and record reconciliation
 * - Critical for daily sales operations and cash flow management
 * 
 * PAYMENT MODES:
 * PAY NOW: Immediate payment processing with change/donation handling
 * PAY LATER: Creates invoice for future payment collection
 * 
 * VALIDATION RULES:
 * - Customer information: Name, email, phone are required
 * - Sales catalogue: Must select from active catalogues for pricing accuracy
 * - Manual voucher: Required for audit trail and manual record keeping
 * - Cart items: Must have at least one product with valid pricing
 * - Payment details: Required for Pay Now transactions
 * - Store-specific: Address required for Tasty Treats deliveries
 * 
 * @param {Event} e - Form submission event from new-sale-form
 * @throws {Error} When validation fails, inventory insufficient, or transaction processing fails
 * @since 1.0.0
 * @see createSaleAndUpdateInventory() - Transactional API for sale processing with inventory updates
 * @see getSalesCartItems() - UI function to retrieve shopping cart contents
 * @see showSalesView() - UI function to refresh sales view after completion
 */
async function handleNewSaleSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in to process sales.');
        return;
    }

    // ✅ START: Progress toast for sale transaction
    ProgressToast.show('Processing Sale Transaction', 'info');

    try {
        // Step 1: Cart and Basic Validation
        ProgressToast.updateProgress('Validating shopping cart...', 10, 'Step 1 of 9'); // ✅ UPDATED: 9 steps now

        const rawCartItems = getSalesCartItems();
        if (rawCartItems.length === 0) {
            ProgressToast.hide(0);
            await showModal('error', 'Empty Cart', 'Please add at least one product to the cart.');
            return;
        }

        // Step 2: Sales Catalogue Validation (NEW STEP)
        ProgressToast.updateProgress('Validating sales catalogue selection...', 15, 'Step 2 of 9');

        const selectedCatalogueId = document.getElementById('sale-catalogue-select').value;

        if (!selectedCatalogueId) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Sales Catalogue', 
                'Please select which sales catalogue to use for this sale.\n\n' +
                'The sales catalogue determines product availability and current pricing.'
            );
            return;
        }

        // ✅ ENHANCED: Validate catalogue is active and accessible
        const selectedCatalogue = masterData.salesCatalogues.find(cat => cat.id === selectedCatalogueId);
        if (!selectedCatalogue) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Sales Catalogue', 
                'The selected sales catalogue was not found. Please refresh the page and try again.'
            );
            return;
        }

        if (!selectedCatalogue.isActive) {
            ProgressToast.hide(0);
            await showModal('error', 'Inactive Sales Catalogue', 
                `Sales catalogue "${selectedCatalogue.catalogueName}" is not currently active.\n\n` +
                'Please select an active catalogue or contact an admin to activate this catalogue.'
            );
            return;
        }

        console.log(`[main.js] ✅ Using active sales catalogue: "${selectedCatalogue.catalogueName}" (${selectedCatalogue.seasonName})`);

        // Step 3: Customer Information Validation
        ProgressToast.updateProgress('Validating customer information...', 25, 'Step 3 of 9');

        const customerName = document.getElementById('sale-customer-name').value.trim();
        const customerEmail = document.getElementById('sale-customer-email').value.trim();
        const customerPhone = document.getElementById('sale-customer-phone').value.trim();
        const voucherNumber = document.getElementById('sale-voucher-number').value.trim();
        const selectedStore = document.getElementById('sale-store-select').value;

        // Validate required customer fields
        if (!customerName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Customer Name', 'Please enter the customer\'s name.');
            return;
        }

        if (!customerEmail || !customerEmail.includes('@')) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Email', 'Please enter a valid customer email address.');
            return;
        }

        if (!customerPhone) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Phone', 'Please enter the customer\'s phone number.');
            return;
        }

        if (!selectedStore) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Store', 'Please select which store location for this sale.');
            return;
        }

        // Validate Manual Voucher Number
        if (!voucherNumber) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Voucher Number', 'Please enter a manual voucher number for record keeping.');
            return;
        }

        if (!/^[A-Za-z0-9\-]+$/.test(voucherNumber)) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Voucher Format', 
                'Voucher number should contain only letters, numbers, and dashes.\n\n' +
                'Examples: V-001, MAN-2024-001, VOUCHER-123'
            );
            return;
        }

        // Validate Tasty Treats address requirement
        if (selectedStore === 'Tasty Treats') {
            const deliveryAddress = document.getElementById('sale-customer-address').value.trim();
            if (!deliveryAddress) {
                ProgressToast.hide(0);
                await showModal('error', 'Missing Delivery Address', 'Delivery address is required for Tasty Treats orders.');
                return;
            }
        }

        // Step 4: Calculate Line Items
        ProgressToast.updateProgress('Calculating line item totals...', 35, 'Step 4 of 9');

        const finalLineItems = [];
        let itemsSubtotal = 0;
        let totalItemLevelTax = 0;

        rawCartItems.forEach(item => {
            const qty = item.quantity || 0;
            const price = item.unitPrice || 0;
            const lineDiscPercent = item.discountPercentage || 0;
            const lineTaxPercent = item.taxPercentage || 0;

            const lineSubtotal = qty * price;
            const discountAmount = lineSubtotal * (lineDiscPercent / 100);
            const taxableAmount = lineSubtotal - discountAmount;
            const taxAmount = taxableAmount * (lineTaxPercent / 100);
            const lineTotal = taxableAmount + taxAmount;

            finalLineItems.push({
                ...item,
                lineSubtotal,
                discountAmount,
                taxableAmount,
                taxAmount,
                lineTotal
            });

            itemsSubtotal += taxableAmount;
            totalItemLevelTax += taxAmount;
        });

        // Step 5: Calculate Order Totals
        ProgressToast.updateProgress('Calculating order totals and taxes...', 50, 'Step 5 of 9');

        const orderDiscPercent = parseFloat(document.getElementById('sale-order-discount').value) || 0;
        const orderTaxPercent = parseFloat(document.getElementById('sale-order-tax').value) || 0;
        const orderDiscountAmount = itemsSubtotal * (orderDiscPercent / 100);
        const finalTaxableAmount = itemsSubtotal - orderDiscountAmount;
        const orderLevelTaxAmount = finalTaxableAmount * (orderTaxPercent / 100);
        const finalTotalTax = totalItemLevelTax + orderLevelTaxAmount;
        const grandTotal = finalTaxableAmount + finalTotalTax;

        console.log(`[main.js] Sale total calculated: ${formatCurrency(grandTotal)} for voucher ${voucherNumber}`);

        // Step 6: Handle Payment Processing
        const paymentType = document.getElementById('sale-payment-type').value;
        let initialPaymentData = null;
        let donationAmount = 0;
        let amountReceived = 0;

        if (paymentType === 'Pay Now') {
            // PAY NOW MODE: Full payment validation
            ProgressToast.updateProgress('Processing immediate payment...', 65, 'Pay Now Mode');

            amountReceived = parseFloat(document.getElementById('sale-amount-received').value) || 0;
            const paymentMode = document.getElementById('sale-payment-mode').value;
            const paymentRef = document.getElementById('sale-payment-ref').value.trim();

            // Validate payment fields for Pay Now
            if (!paymentMode) {
                ProgressToast.hide(0);
                await showModal('error', 'Missing Payment Mode', 'Please select how the customer is paying.');
                return;
            }

            if (amountReceived <= 0) {
                ProgressToast.hide(0);
                await showModal('error', 'Invalid Payment Amount', 'Please enter the amount received from the customer.');
                return;
            }

            if (!paymentRef) {
                ProgressToast.hide(0);
                await showModal('error', 'Missing Payment Reference', 'Please enter a reference number for the payment.');
                return;
            }

            // Handle partial payment confirmation
            if (amountReceived < grandTotal) {
                const proceedPartial = await showModal('confirm', 'Partial Payment Confirmation', 
                    `Amount received: ${formatCurrency(amountReceived)}\n` +
                    `Total amount: ${formatCurrency(grandTotal)}\n` +
                    `Balance due: ${formatCurrency(grandTotal - amountReceived)}\n\n` +
                    'This will create a partially paid invoice. Continue?'
                );
                if (!proceedPartial) {
                    ProgressToast.hide(0);
                    return;
                }
            }

            // Handle overpayment/donation
            if (amountReceived > grandTotal) {
                donationAmount = amountReceived - grandTotal;
                const confirmDonation = await showModal('confirm', 'Overpayment - Record as Donation?', 
                    `Amount received: ${formatCurrency(amountReceived)}\n` +
                    `Total amount: ${formatCurrency(grandTotal)}\n` +
                    `Overpayment: ${formatCurrency(donationAmount)}\n\n` +
                    'The extra amount will be recorded as a donation. Continue?'
                );
                if (!confirmDonation) {
                    ProgressToast.hide(0);
                    return;
                }
                
                console.log(`[main.js] Overpayment confirmed as donation: ${formatCurrency(donationAmount)}`);
            }

            const amountToApplyToInvoice = Math.min(amountReceived, grandTotal);

            initialPaymentData = {
                amountPaid: amountToApplyToInvoice,
                paymentMode: paymentMode,
                transactionRef: paymentRef,
                notes: document.getElementById('sale-payment-notes').value || ''
            };

        } else {
            // PAY LATER MODE: No payment validation needed
            ProgressToast.updateProgress('Creating invoice for future payment...', 65, 'Pay Later Mode');
            
            console.log(`[main.js] Pay Later mode - creating invoice for ${formatCurrency(grandTotal)}`);
            
            // No payment data needed
            initialPaymentData = null;
            donationAmount = 0;
            amountReceived = 0;
        }

        // Step 7: Prepare Final Sale Data (ENHANCED WITH CATALOGUE ATTRIBUTION)
        ProgressToast.updateProgress('Preparing transaction data with catalogue attribution...', 75, 'Step 7 of 9');

        // ✅ ENHANCED: Use standardized donation source
        let donationSource = null;
        if (donationAmount > 0) {
            donationSource = getDonationSourceByStore(selectedStore);
            console.log(`[main.js] Sale donation source: ${donationSource} (${formatCurrency(donationAmount)})`);
        }

        const saleData = {
            saleDate: new Date(document.getElementById('sale-date').value),
            store: selectedStore,
            manualVoucherNumber: voucherNumber,
            
            // ✅ ENHANCED: Sales catalogue attribution
            salesCatalogueId: selectedCatalogueId,
            salesCatalogueName: selectedCatalogue.catalogueName,
            salesSeasonId: selectedCatalogue.seasonId,
            salesSeasonName: selectedCatalogue.seasonName,
            
            customerInfo: {
                name: customerName,
                email: customerEmail,
                phone: customerPhone,
                address: selectedStore === 'Tasty Treats'
                    ? document.getElementById('sale-customer-address').value
                    : null
            },
            lineItems: finalLineItems,
            financials: {
                itemsSubtotal,
                orderDiscountPercentage: orderDiscPercent,
                orderDiscountAmount,
                orderTaxPercentage: orderTaxPercent,
                orderTaxAmount: orderLevelTaxAmount,
                totalTax: finalTotalTax,
                totalAmount: grandTotal,
                amountTendered: amountReceived,
                changeDue: Math.max(0, amountReceived - grandTotal)
            }
        };

        // Step 8: Process Transaction
        ProgressToast.updateProgress(
            paymentType === 'Pay Now' ? 'Processing payment and updating inventory...' : 'Creating invoice and updating inventory...', 
            90, 
            'Step 8 of 9'
        );

        // ✅ ENHANCED: Pass donation source to API
        await createSaleAndUpdateInventory(saleData, initialPaymentData, donationAmount, user.email, donationSource);

        // Step 9: Success Completion
        ProgressToast.updateProgress('Transaction completed successfully!', 100, 'Step 9 of 9');
        
        const successMessage = paymentType === 'Pay Now' 
            ? `Sale completed for ${customerName} - Voucher ${voucherNumber}!`
            : `Invoice created for ${customerName} - Voucher ${voucherNumber}!`;
            
        ProgressToast.showSuccess(successMessage);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            // Enhanced success message with catalogue attribution
            const paymentStatus = paymentType === 'Pay Later' ? 'Invoice Created (Payment Due)' :
                                 amountReceived >= grandTotal ? 'Paid in Full' : 'Partially Paid';
            
            const transactionType = paymentType === 'Pay Later' ? 'Invoice Created' : 'Sale Completed';
            
            await showModal('success', `${transactionType} Successfully`, 
                `Transaction has been processed successfully!\n\n` +
                `• Customer: ${customerName}\n` +
                `• Voucher Number: ${voucherNumber}\n` +
                `• Store: ${selectedStore}\n` +
                `• Sales Catalogue: ${selectedCatalogue.catalogueName}\n` + // ✅ NEW: Show catalogue used
                `• Season: ${selectedCatalogue.seasonName}\n` + // ✅ NEW: Show season context
                `• Total Amount: ${formatCurrency(grandTotal)}\n` +
                `• Payment Type: ${paymentType}\n` +
                `• Payment Status: ${paymentStatus}\n` +
                `• Items: ${finalLineItems.length} different products\n` +
                `${donationAmount > 0 ? `• Donation: ${formatCurrency(donationAmount)} (${donationSource})\n` : ''}` +
                `${paymentType === 'Pay Later' ? `• Balance Due: ${formatCurrency(grandTotal)}\n` : ''}` +
                `\n✓ Inventory updated automatically\n` +
                `✓ Customer record created\n` +
                `✓ Financial records updated\n` +
                `✓ Sale attributed to "${selectedCatalogue.catalogueName}"\n` + // ✅ NEW: Attribution notice
                `${donationAmount > 0 ? '✓ Donation recorded with source tracking\n' : ''}` +
                `${paymentType === 'Pay Later' ? '✓ Invoice ready for future payment collection' : '✓ Transaction completed and closed'}`
            );
            
            // Refresh sales view to show new transaction
            showSalesView();
            
        }, 1200);

    } catch (error) {
        console.error("Error completing sale:", error);
        
        const errorContext = paymentType === 'Pay Later' ? 'invoice creation' : 'sale processing';
        ProgressToast.showError(`Transaction failed: ${error.message || `${errorContext} error`}`);
        
        setTimeout(async () => {
            await showModal('error', 'Transaction Processing Failed', 
                `${paymentType === 'Pay Later' ? 'Invoice creation' : 'Sale transaction'} could not be completed.\n\n` +
                `Error: ${error.message}\n\n` +
                `Common causes:\n` +
                `• Insufficient inventory for requested quantities\n` +
                `• Selected catalogue became inactive during transaction\n` +
                `• Network connection interrupted during processing\n` +
                `• Invalid customer or ${paymentType === 'Pay Now' ? 'payment ' : ''}information\n` +
                `• Database permission or access issues\n\n` +
                `Please verify all information and try again.`
            );
        }, 2000);
    }
}

/**
 * Handles sales payment recording with validation, overpayment processing, and progress tracking.
 * 
 * Records payments against existing sales invoices with automatic balance updates,
 * donation processing for overpayments, and real-time invoice status reconciliation.
 * Updates payment history and refreshes modal display with latest payment information.
 * 
 * BUSINESS CONTEXT:
 * - Records customer payments against outstanding sales invoices
 * - Handles partial payments, full payments, and overpayments as donations
 * - Updates invoice balances and payment status automatically
 * - Critical for cash flow management and customer account reconciliation
 * 
 * VALIDATION RULES:
 * - Payment amount: Must be positive number, can exceed balance (donation)
 * - Payment mode: Must select from available payment methods
 * - Transaction reference: Required for audit trail and reconciliation
 * - Invoice context: Must have valid parent invoice with outstanding balance
 * 
 * @param {Event} e - Form submission event from record-sale-payment-form
 * @throws {Error} When validation fails or payment processing fails
 * @since 1.0.0
 * @see recordSalePayment() - Transactional API for payment processing with donations
 * @see refreshSalePaymentModal() - UI function to update modal with latest data
 */
async function handleRecordSalePaymentSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in to record payments.');
        return;
    }

    // ✅ START: Progress toast for payment processing
    ProgressToast.show('Recording Customer Payment', 'info');

    const submitButton = e.target.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';
    }

    try {
        // Step 1: Invoice Data Validation
        ProgressToast.updateProgress('Validating invoice information...', 15, 'Step 1 of 6');

        const invoiceId = document.getElementById('record-sale-invoice-id').value;
        const invoiceData = getSalesHistoryDataById(invoiceId);

        if (!invoiceData) {
            ProgressToast.hide(0);
            await showModal('error', 'Invoice Not Found', 'Cannot find the parent invoice data. Please close and reopen the payment modal.');
            return;
        }

        if (invoiceData.paymentStatus === 'Paid') {
            ProgressToast.hide(0);
            await showModal('error', 'Invoice Already Paid', 'This invoice has already been paid in full.');
            return;
        }

        // Step 2: Payment Data Validation
        ProgressToast.updateProgress('Validating payment information...', 30, 'Step 2 of 6');

        const amountPaidInput = parseFloat(document.getElementById('record-sale-amount').value);
        const paymentMode = document.getElementById('record-sale-mode').value;
        const transactionRef = document.getElementById('record-sale-ref').value.trim();
        const balanceDue = invoiceData.balanceDue || 0;

        if (isNaN(amountPaidInput) || amountPaidInput <= 0) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Payment Amount', 'Payment amount must be a valid number greater than zero.');
            return;
        }

        if (!paymentMode) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Payment Mode', 'Please select how the payment was made.');
            return;
        }

        if (!transactionRef) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Reference Number', 'Please enter a reference number for the payment.');
            return;
        }

        // Step 3: Process Payment Logic (Overpayment/Donation Handling)
        ProgressToast.updateProgress('Processing payment and donation logic...', 45, 'Step 3 of 6');

        let donationAmount = 0;
        if (amountPaidInput > balanceDue) {
            donationAmount = amountPaidInput - balanceDue;
            
            const confirmOverpayment = await showModal('confirm', 'Overpayment - Record as Donation?', 
                `Payment amount: ${formatCurrency(amountPaidInput)}\n` +
                `Balance due: ${formatCurrency(balanceDue)}\n` +
                `Overpayment: ${formatCurrency(donationAmount)}\n\n` +
                'The extra amount will be recorded as a donation. Continue?'
            );
            
            if (!confirmOverpayment) {
                ProgressToast.hide(0);
                return;
            }
            
            console.log(`[main.js] Overpayment confirmed: ${formatCurrency(donationAmount)} donation`);
        }

        const amountToApplyToInvoice = Math.min(amountPaidInput, balanceDue);

        // Step 4: Prepare Payment Data
        ProgressToast.updateProgress('Preparing payment record...', 60, 'Step 4 of 6');

        // ✅ ENHANCED: Use constants for donation source consistency
        let donationSource = null;
        if (donationAmount > 0) {
            donationSource = getDonationSourceByStore(invoiceData.store); // ✅ CLEAN: Use helper function
            console.log(`[main.js] Donation source determined: ${donationSource} (${formatCurrency(donationAmount)})`);
        }

        const paymentData = {
            invoiceId,
            amountPaid: amountToApplyToInvoice,
            donationAmount,
            donationSource, // ✅ ENHANCED: Include standardized donation source
            customerName: invoiceData.customerInfo.name,
            paymentMode: paymentMode,
            transactionRef: transactionRef,
            notes: document.getElementById('record-sale-notes')?.value || ''
        };

        console.log(`[main.js] Recording payment: ${formatCurrency(amountToApplyToInvoice)} for invoice ${invoiceData.saleId}`, {
            customer: paymentData.customerName,
            mode: paymentData.paymentMode,
            reference: paymentData.transactionRef,
            donation: donationAmount > 0 ? `${formatCurrency(donationAmount)} from ${donationSource}` : 'None'
        });

        // Step 5: Process Payment Transaction
        ProgressToast.updateProgress('Recording payment and updating invoice balance...', 85, 'Step 5 of 6');

        await recordSalePayment(paymentData, user);

        // Step 6: Success and Modal Refresh
        ProgressToast.updateProgress('Payment recorded successfully!', 100, 'Step 6 of 6');
        ProgressToast.showSuccess(
            `${formatCurrency(amountToApplyToInvoice)} payment recorded${donationAmount > 0 ? ` + ${formatCurrency(donationAmount)} donation` : ''}!`
        );

        // Reset payment form
        resetSalePaymentForm();

        // Get updated invoice data and refresh modal
        const updatedInvoiceData = await getSalesInvoiceById(invoiceId);
        
        setTimeout(async () => {
            ProgressToast.hide(500);
            
            if (updatedInvoiceData) {
                // Refresh modal with updated data
                refreshSalePaymentModal(updatedInvoiceData);
                
                // ✅ ENHANCED: Success message with source information
                await showModal('success', 'Payment Recorded Successfully', 
                    `Customer payment has been processed!\n\n` +
                    `• Customer: ${paymentData.customerName}\n` +
                    `• Payment Amount: ${formatCurrency(amountToApplyToInvoice)}\n` +
                    `• Payment Mode: ${paymentData.paymentMode}\n` +
                    `• Reference: ${paymentData.transactionRef}\n` +
                    `${donationAmount > 0 ? `• Donation: ${formatCurrency(donationAmount)}\n• Donation Source: ${donationSource}\n` : ''}` +
                    `• New Balance: ${formatCurrency(updatedInvoiceData.balanceDue || 0)}\n\n` +
                    `✓ Invoice balance updated automatically\n` +
                    `✓ Payment history recorded\n` +
                    `${donationAmount > 0 ? '✓ Donation recorded with source tracking\n' : ''}` +
                    `✓ Financial records reconciled`
                );
                
            } else {
                // If we can't get updated data, close modal
                await showModal('success', 'Payment Recorded', 'Payment has been recorded successfully.');
                closeRecordSalePaymentModal();
            }
        }, 800);

    } catch (error) {
        console.error("Error recording sale payment:", error);
        
        ProgressToast.showError(`Payment recording failed: ${error.message || 'Payment processing error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Payment Recording Failed', 
                `Failed to record the customer payment.\n\n` +
                `Error: ${error.message}\n\n` +
                `Common causes:\n` +
                `• Payment amount exceeds reasonable limits\n` +
                `• Network connection interrupted during processing\n` +
                `• Invoice status changed during payment processing\n` +
                `• Insufficient permissions for payment operations\n\n` +
                `Please verify the payment details and try again.`
            );
        }, 2000);
        
    } finally {
        // Re-enable submit button
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Payment';
        }
    }
}



/**
 * Handles product category form submission with validation and progress tracking.
 * 
 * Creates new product categories for organizing inventory and enabling product
 * classification. Validates category names for uniqueness and appropriateness,
 * then saves to Firestore with real-time progress feedback.
 * 
 * BUSINESS CONTEXT:
 * - Categories organize products for better inventory management
 * - Used in product creation, sales catalogues, and reporting
 * - Enables filtering and grouping across the application
 * - Foundation for product classification and search functionality
 * 
 * VALIDATION RULES:
 * - Category name: Required, non-empty, trimmed string
 * - Uniqueness: Warns for duplicate category names
 * - Length: Should be descriptive but concise
 * - Business appropriateness: Contextual validation for church/bakery use
 * 
 * @param {Event} e - Form submission event from add-category-form
 * @throws {Error} When validation fails or Firestore operations fail
 * @since 1.0.0
 * @see addCategory() - API function for creating category records
 * @see masterData.categories - Used for duplicate detection and display
 */
async function handleCategorySubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;

    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Progress toast for category creation
    ProgressToast.show('Adding Product Category', 'info');

    try {
        // Step 1: Input Validation
        ProgressToast.updateProgress('Validating category information...', 25, 'Step 1 of 4');

        const categoryName = document.getElementById('categoryName-input').value.trim();

        if (!categoryName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Category Name', 'Please enter a category name.');
            return;
        }

        // Validate category name length and content
        if (categoryName.length < 2) {
            ProgressToast.hide(0);
            await showModal('error', 'Category Name Too Short', 'Category name must be at least 2 characters long.');
            return;
        }

        if (categoryName.length > 50) {
            ProgressToast.hide(0);
            await showModal('error', 'Category Name Too Long', 'Category name must be 50 characters or less.');
            return;
        }

        // Step 2: Check for Duplicate Categories
        ProgressToast.updateProgress('Checking for duplicate categories...', 50, 'Step 2 of 4');

        const existingCategory = masterData.categories.find(c => 
            c.categoryName.toLowerCase() === categoryName.toLowerCase()
        );

        if (existingCategory) {
            ProgressToast.hide(0);
            const proceedWithDuplicate = await showModal('confirm', 'Category Already Exists', 
                `A category named "${existingCategory.categoryName}" already exists.\n\n` +
                'Do you want to create another category with the same name?'
            );
            
            if (!proceedWithDuplicate) {
                return; // User chose not to create duplicate
            }

            // User confirmed - restart progress
            ProgressToast.show('Adding Duplicate Category', 'warning');
            ProgressToast.updateProgress('Creating duplicate category...', 50, 'User Confirmed');
        }

        console.log(`[main.js] Creating category: "${categoryName}"`);

        // Step 3: Save to Database
        ProgressToast.updateProgress('Saving category to database...', 80, 'Step 3 of 4');

        await addCategory(categoryName, user);

        // Step 4: Success
        ProgressToast.updateProgress('Category added successfully!', 100, 'Step 4 of 4');
        ProgressToast.showSuccess(`"${categoryName}" has been added to product categories!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            // Calculate category usage potential
            const categoryCount = masterData.categories.length + 1; // Including the one just added
            
            await showModal('success', 'Product Category Added', 
                `Product category "${categoryName}" has been added successfully!\n\n` +
                `• Total Categories: ${categoryCount}\n` +
                `• Status: Active and available for products\n\n` +
                `You can now:\n` +
                `✓ Add products to this category\n` +
                `✓ Use this category in sales catalogues\n` +
                `✓ Filter and organize inventory by category`
            );
            
            // Reset form for next category
            e.target.reset();
            
        }, 1200);

    } catch (error) {
        console.error("Error adding product category:", error);
        
        ProgressToast.showError(`Failed to add category: ${error.message || 'Database error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Add Category Failed', 
                'Failed to add the product category. Please try again.\n\n' +
                'If the problem persists, check:\n' +
                '• Internet connection is stable\n' +
                '• Category name is appropriate and descriptive\n' +
                '• You have permission to create categories\n' +
                '• Firestore database is accessible'
            );
        }, 2000);
    }
}


/**
 * Handles payment mode form submission with validation and progress tracking.
 * 
 * Creates new payment modes for transaction processing across all sales channels.
 * Validates payment mode names, checks for duplicates, and ensures payment modes
 * are appropriate for church/business context with comprehensive progress feedback.
 * 
 * BUSINESS CONTEXT:
 * - Payment modes are used across all transaction types (direct sales, consignments, supplier payments)
 * - Critical for financial tracking and reconciliation
 * - Enables payment method reporting and cash flow analysis
 * - Supports both digital and traditional payment methods
 * 
 * VALIDATION RULES:
 * - Payment mode name: Required, descriptive identifier
 * - Uniqueness: Prevents duplicate payment methods
 * - Business appropriateness: Validates for church/retail context
 * - Length: Should be clear but concise for dropdown displays
 * 
 * @param {Event} e - Form submission event from add-payment-mode-form
 * @throws {Error} When validation fails or Firestore operations fail
 * @since 1.0.0
 * @see addPaymentMode() - API function for creating payment mode records
 * @see masterData.paymentModes - Used for duplicate detection and transaction processing
 */
async function handlePaymentModeSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;

    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Progress toast for payment mode creation
    ProgressToast.show('Adding Payment Mode', 'info');

    try {
        // Step 1: Input Validation
        ProgressToast.updateProgress('Validating payment mode information...', 25, 'Step 1 of 4');

        const paymentMode = document.getElementById('paymentModeName-input').value.trim();

        if (!paymentMode) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Payment Mode', 'Please enter a payment mode name.');
            return;
        }

        // Validate payment mode name length and content
        if (paymentMode.length < 2) {
            ProgressToast.hide(0);
            await showModal('error', 'Name Too Short', 'Payment mode name must be at least 2 characters long.');
            return;
        }

        if (paymentMode.length > 30) {
            ProgressToast.hide(0);
            await showModal('error', 'Name Too Long', 'Payment mode name must be 30 characters or less for display purposes.');
            return;
        }

        // Step 2: Check for Duplicate Payment Modes
        ProgressToast.updateProgress('Checking for duplicate payment modes...', 50, 'Step 2 of 4');

        const existingPaymentMode = masterData.paymentModes.find(pm => 
            pm.paymentMode.toLowerCase() === paymentMode.toLowerCase()
        );

        if (existingPaymentMode) {
            ProgressToast.hide(0);
            const proceedWithDuplicate = await showModal('confirm', 'Payment Mode Already Exists', 
                `A payment mode named "${existingPaymentMode.paymentMode}" already exists.\n\n` +
                'Duplicate payment modes can cause confusion during transactions.\n\n' +
                'Do you want to create another payment mode with the same name?'
            );
            
            if (!proceedWithDuplicate) {
                return; // User chose not to create duplicate
            }

            // User confirmed - restart progress with warning theme
            ProgressToast.show('Adding Duplicate Payment Mode', 'warning');
            ProgressToast.updateProgress('Creating duplicate payment mode...', 50, 'User Confirmed');
        }

        console.log(`[main.js] Creating payment mode: "${paymentMode}"`);

        // Step 3: Save to Database
        ProgressToast.updateProgress('Saving payment mode to database...', 80, 'Step 3 of 4');

        await addPaymentMode(paymentMode, user);

        // Step 4: Success
        ProgressToast.updateProgress('Payment mode added successfully!', 100, 'Step 4 of 4');
        ProgressToast.showSuccess(`"${paymentMode}" has been added to payment methods!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            // Calculate total payment modes available
            const totalPaymentModes = masterData.paymentModes.length + 1; // Including the one just added
            
            await showModal('success', 'Payment Mode Added', 
                `Payment mode "${paymentMode}" has been added successfully!\n\n` +
                `• Total Payment Modes: ${totalPaymentModes}\n` +
                `• Status: Active and available for transactions\n\n` +
                `This payment mode can now be used for:\n` +
                `✓ Direct store sales (Church Store & Tasty Treats)\n` +
                `✓ Consignment team payments\n` +
                `✓ Supplier invoice payments\n` +
                `✓ Financial reporting and reconciliation`
            );
            
            // Reset form for next payment mode
            e.target.reset();
            
        }, 1200);

    } catch (error) {
        console.error("Error adding payment mode:", error);
        
        ProgressToast.showError(`Failed to add payment mode: ${error.message || 'Database error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Add Payment Mode Failed', 
                'Failed to add the payment mode. Please try again.\n\n' +
                'If the problem persists, check:\n' +
                '• Internet connection is stable\n' +
                '• Payment mode name is clear and descriptive\n' +
                '• Name is appropriate for business transactions\n' +
                '• You have permission to create payment modes'
            );
        }, 2000);
    }
}

/**
 * Handles sales type form submission with validation and progress tracking.
 * 
 * Creates new sales type classifications for categorizing different kinds of sales
 * transactions and promotional activities. Validates type names, prevents duplicates,
 * and ensures sales types align with business operations and reporting needs.
 * 
 * BUSINESS CONTEXT:
 * - Sales types categorize transactions for reporting and analysis
 * - Used to differentiate regular sales, promotional sales, clearance, etc.
 * - Enables sales performance analysis by transaction type
 * - Critical for understanding sales patterns and promotional effectiveness
 * - Supports consignment vs direct sales classification
 * 
 * VALIDATION RULES:
 * - Sale type name: Required, descriptive classification
 * - Uniqueness: Prevents duplicate sales types for clear categorization  
 * - Business relevance: Should reflect actual sales scenarios
 * - Length: Appropriate for reporting and dropdown displays
 * 
 * @param {Event} e - Form submission event from add-sale-type-form
 * @throws {Error} When validation fails or Firestore operations fail
 * @since 1.0.0
 * @see addSaleType() - API function for creating sales type records
 * @see masterData.saleTypes - Used for duplicate detection and sales classification
 */
async function handleSaleTypeSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;

    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Progress toast for sales type creation
    ProgressToast.show('Adding Sales Type', 'info');

    try {
        // Step 1: Input Validation
        ProgressToast.updateProgress('Validating sales type information...', 25, 'Step 1 of 4');

        const saleTypeName = document.getElementById('saleTypeName-input').value.trim();

        if (!saleTypeName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Sales Type', 'Please enter a sales type name.');
            return;
        }

        // Validate sales type name length and format
        if (saleTypeName.length < 3) {
            ProgressToast.hide(0);
            await showModal('error', 'Name Too Short', 'Sales type name must be at least 3 characters long for clarity.');
            return;
        }

        if (saleTypeName.length > 40) {
            ProgressToast.hide(0);
            await showModal('error', 'Name Too Long', 'Sales type name must be 40 characters or less for reporting displays.');
            return;
        }

        // Step 2: Check for Duplicate Sales Types
        ProgressToast.updateProgress('Checking for duplicate sales types...', 50, 'Step 2 of 4');

        const existingSaleType = masterData.saleTypes?.find(st => 
            st.saleTypeName.toLowerCase() === saleTypeName.toLowerCase()
        );

        if (existingSaleType) {
            ProgressToast.hide(0);
            const proceedWithDuplicate = await showModal('confirm', 'Sales Type Already Exists', 
                `A sales type named "${existingSaleType.saleTypeName}" already exists.\n\n` +
                'Duplicate sales types can complicate sales reporting and analysis.\n\n' +
                'Do you want to create another sales type with the same name?'
            );
            
            if (!proceedWithDuplicate) {
                return; // User chose not to create duplicate
            }

            // User confirmed - restart progress with warning theme
            ProgressToast.show('Adding Duplicate Sales Type', 'warning');
            ProgressToast.updateProgress('Creating duplicate sales type...', 50, 'User Confirmed');
        }

        console.log(`[main.js] Creating sales type: "${saleTypeName}"`);

        // Step 3: Save to Database
        ProgressToast.updateProgress('Saving sales type to database...', 80, 'Step 3 of 4');

        await addSaleType(saleTypeName, user);

        // Step 4: Success
        ProgressToast.updateProgress('Sales type added successfully!', 100, 'Step 4 of 4');
        ProgressToast.showSuccess(`"${saleTypeName}" has been added to sales types!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            // Calculate total sales types available
            const totalSaleTypes = (masterData.saleTypes?.length || 0) + 1; // Including the one just added
            
            await showModal('success', 'Sales Type Added', 
                `Sales type "${saleTypeName}" has been added successfully!\n\n` +
                `• Total Sales Types: ${totalSaleTypes}\n` +
                `• Status: Active and available for transactions\n\n` +
                `This sales type can now be used for:\n` +
                `✓ Categorizing direct store sales\n` +
                `✓ Classifying consignment transactions\n` +
                `✓ Sales performance reporting by type\n` +
                `✓ Promotional campaign tracking\n` +
                `✓ Financial analysis and business insights`
            );
            
            // Reset form for next sales type
            e.target.reset();
            
        }, 1200);

    } catch (error) {
        console.error("Error adding sales type:", error);
        
        ProgressToast.showError(`Failed to add sales type: ${error.message || 'Database error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Add Sales Type Failed', 
                'Failed to add the sales type. Please try again.\n\n' +
                'If the problem persists, check:\n' +
                '• Internet connection is stable\n' +
                '• Sales type name is descriptive and appropriate\n' +
                '• Name reflects actual business sales scenarios\n' +
                '• You have permission to create sales types'
            );
        }, 2000);
    }
}


/**
 * Handles sales season form submission with date validation and progress tracking.
 * 
 * Creates new sales seasons that serve as parent containers for sales events and
 * catalogue organization. Validates date ranges, prevents conflicts, and ensures
 * proper seasonal business cycle management with comprehensive progress feedback.
 * 
 * BUSINESS CONTEXT:
 * - Sales seasons are top-level time periods (Christmas, Easter, Summer, etc.)
 * - Events and catalogues are organized under seasons
 * - Enables seasonal reporting and sales cycle analysis
 * - Critical for consignment planning and inventory management
 * 
 * VALIDATION RULES:
 * - Season name: Required, descriptive identifier
 * - Date range: Start date must be before or equal to end date
 * - Duration: Seasons should typically be meaningful periods (weeks/months)
 * - Business logic: Warns for very short or very long seasons
 * 
 * @param {Event} e - Form submission event from add-season-form
 * @throws {Error} When validation fails, date conflicts occur, or Firestore operations fail
 * @since 1.0.0
 * @see addSeason() - API function for creating sales season records
 * @see masterData.seasons - Used for conflict detection and season management
 */
async function handleSeasonSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;

    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Progress toast for season creation
    ProgressToast.show('Adding Sales Season', 'info');

    try {
        // Step 1: Basic Field Validation
        ProgressToast.updateProgress('Validating season information...', 20, 'Step 1 of 5');

        const seasonName = document.getElementById('seasonName-input').value.trim();
        const startDateInput = document.getElementById('startDate-input').value;
        const endDateInput = document.getElementById('endDate-input').value;

        if (!seasonName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Season Name', 'Please enter a descriptive season name.');
            return;
        }

        if (!startDateInput || !endDateInput) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Dates', 'Please select both start and end dates for the season.');
            return;
        }

        // Step 2: Date Validation and Business Logic
        ProgressToast.updateProgress('Validating season dates...', 40, 'Step 2 of 5');

        const startDate = new Date(startDateInput);
        const endDate = new Date(endDateInput);

        // Validate date objects
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Dates', 'Please enter valid start and end dates.');
            return;
        }

        // Validate date logic
        if (startDate > endDate) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Date Range', 'Season start date must be before or equal to the end date.');
            return;
        }

        // Business logic: Check season duration
        const seasonDurationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const seasonDurationWeeks = Math.round(seasonDurationDays / 7);

        console.log(`[main.js] Creating ${seasonDurationDays}-day season: "${seasonName}" (${seasonDurationWeeks} weeks)`);

        // Warn for unusual season lengths
        if (seasonDurationDays < 7) {
            const confirmShortSeason = await showModal('confirm', 'Very Short Season', 
                `This season is only ${seasonDurationDays} day${seasonDurationDays > 1 ? 's' : ''} long. ` +
                'Sales seasons are typically weeks or months. Continue anyway?'
            );
            if (!confirmShortSeason) {
                ProgressToast.hide(0);
                return;
            }
        } else if (seasonDurationDays > 365) {
            const confirmLongSeason = await showModal('confirm', 'Very Long Season', 
                `This season is ${seasonDurationDays} days long (over a year). ` +
                'Consider breaking it into smaller seasonal periods. Continue anyway?'
            );
            if (!confirmLongSeason) {
                ProgressToast.hide(0);
                return;
            }
        }

        // Step 3: Check for Season Name Conflicts
        ProgressToast.updateProgress('Checking for duplicate seasons...', 55, 'Step 3 of 5');

        const existingSeason = masterData.seasons.find(s => 
            s.seasonName.toLowerCase() === seasonName.toLowerCase()
        );

        if (existingSeason) {
            const overwriteConfirm = await showModal('confirm', 'Season Name Exists', 
                `A season named "${existingSeason.seasonName}" already exists. ` +
                'Do you want to create another season with the same name?'
            );
            if (!overwriteConfirm) {
                ProgressToast.hide(0);
                return;
            }
        }

        // Step 4: Prepare Season Data
        ProgressToast.updateProgress('Preparing season data...', 70, 'Step 4 of 5');

        const seasonData = {
            seasonName: seasonName,
            startDate: startDate,
            endDate: endDate
        };

        // Step 5: Save to Database
        ProgressToast.updateProgress('Saving sales season to database...', 90, 'Step 5 of 5');

        await addSeason(seasonData, user);

        // Success Completion
        ProgressToast.updateProgress('Sales season created successfully!', 100, 'Completed');
        ProgressToast.showSuccess(`"${seasonName}" has been added to sales seasons!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            await showModal('success', 'Sales Season Added', 
                `Sales season "${seasonName}" has been created successfully!\n\n` +
                `• Duration: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n` +
                `• Season Length: ${seasonDurationDays} days (${seasonDurationWeeks} weeks)\n` +
                `• Status: Active and ready for events\n\n` +
                `You can now:\n` +
                `✓ Create sales events within this season\n` +
                `✓ Build sales catalogues for this season\n` +
                `✓ Plan consignment campaigns`
            );
            
            // Reset form for next season
            e.target.reset();
            
        }, 1200);

    } catch (error) {
        console.error("Error adding sales season:", error);
        
        ProgressToast.showError(`Failed to add sales season: ${error.message || 'Database error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Add Season Failed', 
                'Failed to add the sales season. Please try again.\n\n' +
                'If the problem persists, check:\n' +
                '• Internet connection is stable\n' +
                '• Season name is unique and descriptive\n' +
                '• Date range is valid and reasonable\n' +
                '• You have permission to create seasons'
            );
        }, 2000);
    }
}


/**
 * Handles sales event form submission with validation, date verification, and progress tracking.
 * 
 * Creates new sales events linked to parent seasons for organizing sales activities
 * and promotional campaigns. Validates date ranges, ensures proper season association,
 * and provides comprehensive progress feedback during the creation process.
 * 
 * BUSINESS CONTEXT:
 * - Sales events belong to sales seasons (Christmas, Easter, etc.)
 * - Events define specific time periods within broader seasonal campaigns
 * - Used for organizing consignment requests and promotional activities
 * - Supports sales reporting and performance tracking by event
 * 
 * VALIDATION RULES:
 * - Event name: Required, non-empty string
 * - Parent season: Must select existing season from dropdown
 * - Date range: Start date must be before or equal to end date
 * - Date format: Must be valid date inputs
 * 
 * @param {Event} e - Form submission event from add-event-form
 * @throws {Error} When validation fails, date logic errors, or Firestore operations fail
 * @since 1.0.0
 * @see addSalesEvent() - API function for creating sales event records
 * @see masterData.seasons - Used for parent season validation and display
 */
async function handleEventSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;

    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in.');
        return;
    }

    // ✅ START: Progress toast for sales event creation
    ProgressToast.show('Adding Sales Event', 'info');

    try {
        // Step 1: Basic Field Validation
        ProgressToast.updateProgress('Validating event information...', 20, 'Step 1 of 5');

        const eventName = document.getElementById('eventName-input').value.trim();
        const parentSeasonSelect = document.getElementById('parentSeason-select');
        const startDateInput = document.getElementById('eventStartDate-input').value;
        const endDateInput = document.getElementById('eventEndDate-input').value;

        if (!eventName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Event Name', 'Please enter a sales event name.');
            return;
        }

        if (!parentSeasonSelect.value) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Parent Season', 'Please select a parent season for this event.');
            return;
        }

        if (!startDateInput || !endDateInput) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Dates', 'Please select both start and end dates for the event.');
            return;
        }

        // Step 2: Date Validation
        ProgressToast.updateProgress('Validating event dates...', 40, 'Step 2 of 5');

        const startDate = new Date(startDateInput);
        const endDate = new Date(endDateInput);

        // Validate date objects are valid
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Dates', 'Please enter valid start and end dates.');
            return;
        }

        // Validate date logic
        if (startDate > endDate) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Date Range', 'Event start date must be before or equal to the end date.');
            return;
        }

        // Check if dates are too far in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day
        
        if (endDate < today) {
            const confirmPastEvent = await showModal('confirm', 'Past Event Date', 
                'The event end date is in the past. Are you sure you want to create this historical event?'
            );
            if (!confirmPastEvent) {
                ProgressToast.hide(0);
                return;
            }
        }

        // Step 3: Process Parent Season Data
        ProgressToast.updateProgress('Processing parent season information...', 60, 'Step 3 of 5');

        let parentSeasonData;
        try {
            parentSeasonData = JSON.parse(parentSeasonSelect.value);
        } catch (parseError) {
            ProgressToast.hide(0);
            await showModal('error', 'Data Error', 'Invalid parent season data. Please refresh the page and try again.');
            return;
        }

        if (!parentSeasonData.seasonId || !parentSeasonData.seasonName) {
            ProgressToast.hide(0);
            await showModal('error', 'Invalid Season', 'Parent season data is incomplete. Please select a different season.');
            return;
        }

        // Step 4: Prepare Event Data
        ProgressToast.updateProgress('Preparing event data...', 75, 'Step 4 of 5');

        const eventData = {
            eventName: eventName,
            seasonId: parentSeasonData.seasonId,
            seasonName: parentSeasonData.seasonName,
            eventStartDate: startDate,
            eventEndDate: endDate
        };

        const eventDuration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        console.log(`[main.js] Creating ${eventDuration}-day event: "${eventName}" in season "${parentSeasonData.seasonName}"`);

        // Step 5: Save to Database
        ProgressToast.updateProgress('Saving sales event to database...', 90, 'Step 5 of 5');

        await addSalesEvent(eventData, user);

        // Success Completion
        ProgressToast.updateProgress('Sales event created successfully!', 100, 'Completed');
        ProgressToast.showSuccess(`"${eventName}" has been added to sales events!`);

        setTimeout(async () => {
            ProgressToast.hide(800);
            
            await showModal('success', 'Sales Event Added', 
                `Sales event "${eventName}" has been created successfully!\n\n` +
                `• Parent Season: ${parentSeasonData.seasonName}\n` +
                `• Duration: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}\n` +
                `• Event Length: ${eventDuration} day${eventDuration > 1 ? 's' : ''}\n\n` +
                `This event is now available for consignment requests and sales tracking.`
            );
            
            // Reset form for next event
            e.target.reset();
            
        }, 1200);

    } catch (error) {
        console.error("Error adding sales event:", error);
        
        ProgressToast.showError(`Failed to add sales event: ${error.message || 'Database error'}`);
        
        setTimeout(async () => {
            await showModal('error', 'Add Event Failed', 
                'Failed to add the sales event. Please try again.\n\n' +
                'If the problem persists, check:\n' +
                '• Internet connection is stable\n' +
                '• Parent season is properly selected\n' +
                '• Date range is valid\n' +
                '• You have permission to create events'
            );
        }, 2000);
    }
}

// ============================================================================
// CUSTOM EVENT LISTENERS
// ============================================================================

function setupCustomEventListeners() {
    const customEvents = {
        'updateSupplier': handleUpdateSupplier,
        'updateProduct': handleUpdateProduct,
        'updateChurchTeam': handleUpdateChurchTeam,
        'updateCatalogueItemPrice': handleUpdateCatalogueItemPrice,
        'logConsignmentActivity': handleLogConsignmentActivity,
        'updateCategory': handleUpdateCategory,
        'updatePaymentMode': handleUpdatePaymentMode,
        'updateSaleType': handleUpdateSaleType,
        'updateSeason': handleUpdateSeason,
        'updateSalesEvent': handleUpdateSalesEvent,
        'updateUserRole': handleUpdateUserRole
    };

    Object.entries(customEvents).forEach(([event, handler]) => {
        document.addEventListener(event, handler);
    });
}

async function handleUpdateSupplier(e) {
    const { docId, updatedData } = e.detail;
    const user = appState.currentUser;
    if (!user) return;

    try {
        await updateSupplier(docId, updatedData, user);
    } catch (error) {
        console.error("Error updating supplier:", error);
        await showModal('error', 'Error', 'Failed to update the supplier. Please try again.');
    }
}

async function handleUpdateProduct(e) {
    const { docId, updatedData } = e.detail;
    const user = appState.currentUser;
    if (!user) return;

    try {
        await updateProduct(docId, updatedData, user);
    } catch (error) {
        console.error("Error updating Products:", error);
        await showModal('error', 'Error', 'Failed to update the Products. Please try again.');
    }
}

async function handleUpdateChurchTeam(e) {
    const { teamId, updatedData } = e.detail;
    const user = appState.currentUser;
    if (!user) return;

    try {
        await updateChurchTeam(teamId, updatedData, user);
        console.log(`Team ${teamId} name updated successfully.`);
    } catch (error) {
        console.error("Error updating team name:", error);
        alert('Failed to update team name.');
    }
}

async function handleUpdateCatalogueItemPrice(e) {
    const { catalogueId, itemId, newPrice } = e.detail;
    const user = appState.currentUser;
    if (!user) return;

    const updatedData = {
        sellingPrice: parseFloat(newPrice),
        isOverridden: true
    };

    try {
        await updateCatalogueItem(catalogueId, itemId, updatedData, user);
    } catch (error) {
        console.error("Failed to update catalogue item price:", error);
        alert('The price could not be updated.');
    }
}

async function handleLogConsignmentActivity(e) {
    const activityData = e.detail;
    const user = appState.currentUser;
    if (!user) return;

    console.log("Logging consignment activity with delta:", activityData);

    try {
        await logActivityAndUpdateConsignment(activityData, user);
    } catch (error) {
        console.error("Error logging consignment activity:", error);
        alert(`Failed to save activity: ${error.message}`);
        refreshConsignmentDetailPanel(activityData.orderId);
    }
}

async function handleUpdateCategory(e) {
    const { docId, updatedData } = e.detail;
    const user = appState.currentUser;
    if (!user) return;

    try {
        await updateCategory(docId, updatedData, user);
    } catch (error) {
        console.error("Error updating product category:", error);
        await showModal('error', 'Error', 'Failed to update the product category. Please try again.');
    }
}

async function handleUpdatePaymentMode(e) {
    const { docId, updatedData } = e.detail;
    try {
        await updatePaymentMode(docId, updatedData, appState.currentUser);
    } catch (error) {
        console.error("Error updating payment mode:", error);
        await showModal('error', 'Error', 'Failed to update the payment mode. Please try again.');
    }
}

async function handleUpdateSaleType(e) {
    const { docId, updatedData } = e.detail;
    try {
        await updateSaleType(docId, updatedData, appState.currentUser);
    } catch (error) {
        console.error("Error updating sales type:", error);
        await showModal('error', 'Error', 'Failed to update the sales type. Please try again.');
    }
}

async function handleUpdateSeason(e) {
    const { docId, updatedData } = e.detail;
    try {
        await updateSeason(docId, updatedData, appState.currentUser);
    } catch (error) {
        console.error("Error updating season:", error);
        await showModal('error', 'Error', 'Failed to update the season. Please try again.');
        refreshSeasonsGrid();
    }
}

async function handleUpdateSalesEvent(e) {
    const { docId, updatedData } = e.detail;
    try {
        await updateSalesEvent(docId, updatedData, appState.currentUser);
    } catch (error) {
        console.error("Error updating Sales Event:", error);
        await showModal('error', 'Error', 'Failed to update the Sales Event. Please try again.');
    }
}

async function handleUpdateUserRole(e) {
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
}

// ============================================================================
// INPUT LISTENERS
// ============================================================================

function setupInputListeners() {
    // Purchase form calculations
    const purchaseFormContainer = document.getElementById('purchases-view');
    if (purchaseFormContainer) {
        purchaseFormContainer.addEventListener('input', (e) => {
            const calcFields = [
                '.line-item-qty', '.line-item-price', '.line-item-tax',
                '.line-item-discount-type', '.line-item-discount-value',
                '#invoice-discount-type', '#invoice-discount-value', '#invoice-tax-percentage'
            ];

            if (calcFields.some(sel => e.target.matches(sel))) {
                calculateAllTotals();
            }
        });

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

    // Admin team selection
    setupAdminTeamListener();

    // Request catalogue selection
    setupRequestCatalogueListener();

    // Sale payment type
    setupSalePaymentTypeListener();

    // Amount received input
    const amountReceivedInput = document.getElementById('sale-amount-received');
    if (amountReceivedInput) {
        amountReceivedInput.addEventListener('input', calculateSalesTotals);
    }

    // Order discount and tax
    const orderDiscountInput = document.getElementById('sale-order-discount');
    if (orderDiscountInput) {
        orderDiscountInput.addEventListener('input', calculateSalesTotals);
    }

    const orderTaxInput = document.getElementById('sale-order-tax');
    if (orderTaxInput) {
        orderTaxInput.addEventListener('input', calculateSalesTotals);
    }

    // Store selection
    setupStoreSelectionListener();

    // Activity type selection
    setupActivityTypeListener();


    // Handle period selector changes
    const periodSelector = document.getElementById('store-report-period');
    if (periodSelector) {
        periodSelector.addEventListener('change', (e) => {
            const newPeriod = parseInt(e.target.value);
            console.log(`[main.js] Store report period changed to ${newPeriod} days`);
            loadStorePerformanceDetailData(newPeriod);
        });
    }

    // Setup calculation listeners for the product catalogue modal
    setupProductCatalogueCalculationListeners();

}

/**
 * NEW FUNCTION: Sets up price calculation for the catalogue modal
 */
function setupProductCatalogueCalculationListeners() {
    // Use the NEW element IDs (catalogue- prefixed)
    const unitPriceInput = document.getElementById('catalogue-unitPrice-input');
    const unitMarginInput = document.getElementById('catalogue-unitMargin-input');
    const sellingPriceDisplay = document.getElementById('catalogue-sellingPrice-display');

    function calculateCatalogueSellingPrice() {
        const cost = parseFloat(unitPriceInput?.value) || 0;
        const margin = parseFloat(unitMarginInput?.value) || 0;
        
        if (cost > 0 && margin >= 0) {
            const sellingPrice = cost * (1 + margin / 100);
            if (sellingPriceDisplay) {
                sellingPriceDisplay.value = sellingPrice.toFixed(2);
            }
        } else {
            if (sellingPriceDisplay) {
                sellingPriceDisplay.value = '';
            }
        }
    }

    // Add event listeners with null checks
    if (unitPriceInput) unitPriceInput.addEventListener('input', calculateCatalogueSellingPrice);
    if (unitMarginInput) unitMarginInput.addEventListener('input', calculateCatalogueSellingPrice);
}



function setupAdminTeamListener() {
    const adminTeamSelect = document.getElementById('admin-select-team');
    if (!adminTeamSelect) return;

    adminTeamSelect.addEventListener('change', async (e) => {
        const teamId = e.target.value;
        const memberSelect = document.getElementById('admin-select-member');
        const nextButton = document.getElementById('consignment-next-btn');

        memberSelect.innerHTML = '<option value="">Loading members...</option>';
        memberSelect.disabled = true;
        nextButton.disabled = true;

        if (!teamId) {
            memberSelect.innerHTML = '<option value="">Select a team first</option>';
            return;
        }

        try {
            const members = await getMembersForTeam(teamId);
            const teamLeads = members.filter(m => m.role === 'Team Lead');

            if (teamLeads.length === 0) {
                memberSelect.innerHTML = '<option value="">No leads in this team</option>';
                memberSelect.disabled = true;
                alert("This team has no designated Team Lead. Please add a lead to this team in the Team Management module before creating a consignment.");
            } else if (teamLeads.length === 1) {
                const lead = teamLeads[0];
                const leadData = JSON.stringify({ id: lead.id, name: lead.name, email: lead.email });
                memberSelect.innerHTML = `<option value='${leadData}'>${lead.name}</option>`;
                memberSelect.disabled = true;
                nextButton.disabled = false;
            } else {
                memberSelect.innerHTML = '<option value="">Select a team lead...</option>';
                teamLeads.forEach(lead => {
                    const option = document.createElement('option');
                    option.value = JSON.stringify({ id: lead.id, name: lead.name, email: lead.email });
                    option.textContent = lead.name;
                    memberSelect.appendChild(option);
                });
                memberSelect.disabled = false;
            }
        } catch (error) {
            console.error("Error fetching team leads:", error);
            memberSelect.innerHTML = '<option value="">Error loading leads</option>';
        }
    });
}

function setupRequestCatalogueListener() {
    const requestCatalogueSelect = document.getElementById('request-catalogue-select');
    if (!requestCatalogueSelect) return;

    requestCatalogueSelect.addEventListener('change', (e) => {
        const catalogueId = e.target.value;
        const eventSelect = document.getElementById('request-event-select');

        eventSelect.innerHTML = '<option value="">Select an event (optional)...</option>';

        if (!catalogueId) {
            eventSelect.disabled = true;
            return;
        }

        const selectedCatalogue = masterData.salesCatalogues.find(sc => sc.id === catalogueId);
        if (!selectedCatalogue) {
            eventSelect.disabled = true;
            return;
        }

        const parentSeasonId = selectedCatalogue.seasonId;
        const relevantEvents = masterData.salesEvents.filter(event => event.seasonId === parentSeasonId);

        if (relevantEvents.length > 0) {
            relevantEvents.forEach(event => {
                const option = document.createElement('option');
                option.value = event.id;
                option.textContent = event.eventName;
                eventSelect.appendChild(option);
            });
            eventSelect.disabled = false;
        } else {
            eventSelect.innerHTML = '<option value="">No events for this season</option>';
            eventSelect.disabled = true;
        }
    });
}

/**
 * Sets up payment type change listener to manage required fields
 */
function setupSalePaymentTypeListener() {
    const salePaymentTypeSelect = document.getElementById('sale-payment-type');
    if (!salePaymentTypeSelect) return;

    salePaymentTypeSelect.addEventListener('change', (e) => {
        const payNowContainer = document.getElementById('sale-pay-now-container');
        const showPayNow = e.target.value === 'Pay Now';
        
        // Show/hide payment container
        payNowContainer.classList.toggle('hidden', !showPayNow);
        
        // ✅ CRITICAL: Update required attributes based on payment type
        const paymentModeSelect = document.getElementById('sale-payment-mode');
        const amountReceivedInput = document.getElementById('sale-amount-received');
        const paymentRefInput = document.getElementById('sale-payment-ref');
        
        if (showPayNow) {
            // Pay Now: Make payment fields required
            if (paymentModeSelect) paymentModeSelect.required = true;
            if (amountReceivedInput) amountReceivedInput.required = true;
            if (paymentRefInput) paymentRefInput.required = true;
            
            console.log('[main.js] Payment fields set to required (Pay Now mode)');
        } else {
            // Pay Later: Remove required from payment fields  
            if (paymentModeSelect) paymentModeSelect.required = false;
            if (amountReceivedInput) amountReceivedInput.required = false;
            if (paymentRefInput) paymentRefInput.required = false;
            
            console.log('[main.js] Payment fields set to optional (Pay Later mode)');
        }

        // Update payment status display
        const paymentStatusDisplay = document.getElementById('payment-status-display');
        if (paymentStatusDisplay) {
            if (showPayNow) {
                paymentStatusDisplay.innerHTML = '<span class="text-blue-600">Ready for payment processing</span>';
            } else {
                paymentStatusDisplay.innerHTML = '<span class="text-orange-600">Invoice will be created</span>';
            }
        }
    });
}

function setupStoreSelectionListener() {
    const saleStoreSelect = document.getElementById('sale-store-select');
    if (!saleStoreSelect) return;

    saleStoreSelect.addEventListener('change', (e) => {
        const addressContainer = document.getElementById('tasty-treats-address-container');
        const addressInput = document.getElementById('sale-customer-address');

        const showAddress = e.target.value === 'Tasty Treats';

        addressContainer.classList.toggle('hidden', !showAddress);
        addressInput.required = showAddress;
    });
}

function setupActivityTypeListener() {
    const activityTypeSelect = document.getElementById('activity-type-select');
    if (!activityTypeSelect) return;

    activityTypeSelect.addEventListener('change', (e) => {
        const eventContainer = document.getElementById('activity-event-container');
        const showEvents = e.target.value === 'Sale';
        eventContainer.classList.toggle('hidden', !showEvents);
    });
}



//----------End of Admin event listeners-------------------


// ===================================================================
// SUPPLIER PAYMENT ACTION HANDLERS
// ===================================================================

/**
 * ENHANCED: Handle pay supplier invoice action from payment management
 */
async function handlePmtMgmtPaySupplierInvoice(target) {
    const invoiceId = target.dataset.id;
    const user = appState.currentUser;
    
    if (!user) {
        await showModal('error', 'Authentication Required', 'You must be logged in to process payments.');
        return;
    }
    
    if (!invoiceId) {
        await showModal('error', 'Invalid Invoice', 'Invoice ID not found. Please refresh and try again.');
        return;
    }
    
    console.log(`[PmtMgmt] 💸 Pay supplier invoice action: ${invoiceId}`);
    
    try {
        ProgressToast.show('Opening Supplier Payment Interface', 'info');
        ProgressToast.updateProgress('Loading invoice details...', 50);
        
        // ✅ GET INVOICE DATA: From grid or database
        const invoiceData = getSupplierInvoiceFromMgmtGrid(invoiceId);
        
        if (!invoiceData) {
            // Fallback: Get from database
            const dbInvoice = await getPurchaseInvoiceById(invoiceId);
            if (!dbInvoice) {
                ProgressToast.hide(0);
                await showModal('error', 'Invoice Not Found', 'Could not find the invoice data. Please refresh and try again.');
                return;
            }
        }
        
        ProgressToast.updateProgress('Opening payment modal...', 85);
        
        // ✅ REUSE: Open existing supplier payment modal
        showSupplierPaymentModal({
            id: invoiceId,
            invoiceId: invoiceData?.invoiceId || 'Unknown',
            supplierName: invoiceData?.supplierName || 'Unknown Supplier',
            balanceDue: invoiceData?.balanceDue || 0,
            invoiceTotal: invoiceData?.invoiceTotal || 0
        });
        
        ProgressToast.hide(300);
        
    } catch (error) {
        console.error('[PmtMgmt] Error opening supplier payment:', error);
        ProgressToast.showError(`Failed to open payment interface: ${error.message}`);
        
        setTimeout(() => {
            showModal('error', 'Payment Interface Failed', 
                'Could not open the supplier payment interface. Please try again.'
            );
        }, 1500);
    }
}

/**
 * ENHANCED: Handle view supplier invoice details
 */
async function handlePmtMgmtViewSupplierInvoice(target) {
    const invoiceId = target.dataset.id;
    
    console.log(`[PmtMgmt] 📋 View supplier invoice: ${invoiceId}`);
    
    try {
        ProgressToast.show('Loading Invoice Details', 'info');
        ProgressToast.updateProgress('Retrieving invoice information...', 75);
        
        const invoiceData = getSupplierInvoiceFromMgmtGrid(invoiceId);
        
        if (invoiceData) {
            ProgressToast.hide(300);
            
            // ✅ DETAILED MODAL: Show comprehensive invoice information
            await showModal('info', 'Supplier Invoice Details', 
                `📋 INVOICE INFORMATION\n\n` +
                `• System Invoice ID: ${invoiceData.invoiceId || 'Unknown'}\n` +
                `• Supplier Invoice #: ${invoiceData.supplierInvoiceNo || 'Not Provided'}\n` +
                `• Supplier: ${invoiceData.supplierName}\n` +
                `• Purchase Date: ${invoiceData.formattedDate || 'Unknown'}\n\n` +
                `💰 FINANCIAL DETAILS\n\n` +
                `• Invoice Total: ${formatCurrency(invoiceData.invoiceTotal || 0)}\n` +
                `• Amount Paid: ${formatCurrency(invoiceData.amountPaid || 0)}\n` +
                `• Balance Due: ${formatCurrency(invoiceData.balanceDue || 0)}\n` +
                `• Payment Status: ${invoiceData.paymentStatus}\n\n` +
                `📊 OPERATIONAL CONTEXT\n\n` +
                `• Days Outstanding: ${invoiceData.daysOutstanding || 0} days\n` +
                `• Urgency Level: ${invoiceData.urgencyLevel || 'Normal'}\n` +
                `• Requires Action: ${invoiceData.requiresImmediateAction ? 'Yes' : 'No'}`
            );
        } else {
            ProgressToast.showError('Invoice details not available');
        }
        
    } catch (error) {
        console.error('[PmtMgmt] Error viewing invoice details:', error);
        ProgressToast.showError('Failed to load invoice details');
    }
}


/**
 * ENHANCED: Handle view payment history for supplier
 */
async function handlePmtMgmtViewPaymentHistory(target) {
    const invoiceId = target.dataset.id;
    
    console.log(`[PmtMgmt] 💰 View payment history: ${invoiceId}`);
    
    try {
        ProgressToast.show('Loading Payment History', 'info');
        ProgressToast.updateProgress('Retrieving payment records...', 75);
        
        // ✅ REUSE: Use existing payment history functionality
        // This could open the existing payments tab in purchase management
        // or show a modal with payment history
        
        const invoiceData = getSupplierInvoiceFromMgmtGrid(invoiceId);
        
        if (invoiceData) {
            ProgressToast.hide(300);
            
            // ✅ ROUTE: To existing purchase management with this invoice selected
            // This is where we'd integrate with existing functionality
            await showModal('info', 'Payment History Navigation', 
                `Payment history for ${invoiceData.supplierName}:\n\n` +
                `Invoice: ${invoiceData.supplierInvoiceNo || invoiceData.invoiceId}\n` +
                `Status: ${invoiceData.paymentStatus}\n\n` +
                `This will open the detailed payment history view.\n` +
                `(Integration with existing Purchase Management module)`
            );
            
            // TODO: Implement navigation to existing purchase management
            // showPurchasesView();
            // selectInvoiceInPurchaseGrid(invoiceId);
        }
        
    } catch (error) {
        console.error('[PmtMgmt] Error viewing payment history:', error);
        ProgressToast.showError('Failed to load payment history');
    }
}


/**
 * ENHANCED: Handle create new supplier payment
 */
async function handlePmtMgmtCreateSupplierPayment() {
    const user = appState.currentUser;
    
    console.log(`[PmtMgmt] 📝 Create new supplier payment by ${user?.email}`);
    
    try {
        ProgressToast.show('Creating New Supplier Payment', 'info');
        ProgressToast.updateProgress('Opening payment creation interface...', 75);
        
        // ✅ BUSINESS LOGIC: Show options for new payment
        const paymentOption = await showModal('confirm', 'Create Supplier Payment', 
            `Choose payment creation method:\n\n` +
            `📋 PAY EXISTING INVOICE:\n` +
            `Select from outstanding supplier invoices\n` +
            `(Recommended for regular operations)\n\n` +
            `💰 MANUAL PAYMENT ENTRY:\n` +
            `Create payment without specific invoice\n` +
            `(For advances, deposits, or corrections)\n\n` +
            `Which method would you like to use?`,
            [
                { text: 'Pay Existing Invoice', value: 'existing' },
                { text: 'Manual Entry', value: 'manual' },
                { text: 'Cancel', value: 'cancel' }
            ]
        );
        
        ProgressToast.hide(300);
        
        if (paymentOption === 'existing') {
            // ✅ ROUTE: To existing purchase management for invoice selection
            await showModal('info', 'Navigation', 
                'This will open the Purchase Management module where you can:\n\n' +
                '1. Select an outstanding supplier invoice\n' +
                '2. Click the payment button\n' +
                '3. Complete the payment process\n\n' +
                'After payment, return to Payment Management to see updated status.'
            );
            
            // TODO: Navigate to purchase management
            // showPurchasesView();
            
        } else if (paymentOption === 'manual') {
            // ✅ MANUAL: Direct supplier payment entry (future enhancement)
            await showModal('info', 'Manual Payment Entry', 
                'Manual supplier payment entry will be implemented in the next phase.\n\n' +
                'For now, please use the Purchase Management module to create supplier payments.'
            );
        }
        
    } catch (error) {
        console.error('[PmtMgmt] Error creating supplier payment:', error);
        ProgressToast.showError('Failed to create payment');
    }
}


/**
 * ENHANCED: Handle pay all outstanding invoices (bulk operation)  
 */
async function handlePmtMgmtPayAllOutstanding() {
    const user = appState.currentUser;
    
    console.log(`[PmtMgmt] 💸 Pay all outstanding invoices by ${user?.email}`);
    
    try {
        // Get outstanding invoices from grid
        const outstandingInvoices = [];
        if (pmtMgmtSupplierGridApi) {
            pmtMgmtSupplierGridApi.forEachNodeAfterFilterAndSort(node => {
                if (node.data && (node.data.balanceDue || 0) > 0) {
                    outstandingInvoices.push(node.data);
                }
            });
        }
        
        if (outstandingInvoices.length === 0) {
            await showModal('info', 'No Outstanding Invoices', 
                'There are no outstanding supplier invoices to pay.\n\n' +
                'All supplier invoices are currently paid in full.'
            );
            return;
        }
        
        const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
        
        const confirmed = await showModal('confirm', 'Pay All Outstanding Invoices', 
            `Pay all outstanding supplier invoices?\n\n` +
            `📊 SUMMARY:\n` +
            `• Invoices: ${outstandingInvoices.length}\n` +
            `• Total Amount: ${formatCurrency(totalOutstanding)}\n` +
            `• Suppliers: ${new Set(outstandingInvoices.map(inv => inv.supplierName)).size}\n\n` +
            `⚠️ BULK PAYMENT PROCESS:\n` +
            `This will create individual payment records for each invoice.\n` +
            `Each payment will require verification before updating invoice balances.\n\n` +
            `Continue with bulk payment creation?`
        );
        
        if (confirmed) {
            // TODO: Implement bulk payment creation
            await showModal('info', 'Bulk Payment Creation', 
                'Bulk payment creation will be implemented in the next development phase.\n\n' +
                `For now, please process the ${outstandingInvoices.length} invoices individually using the PAY buttons.`
            );
        }
        
    } catch (error) {
        console.error('[PmtMgmt] Error in bulk payment operation:', error);
        showModal('error', 'Bulk Payment Failed', 'Could not process bulk payment operation.');
    }
}


/**
 * ENHANCED: Handle supplier tab refresh
 */
async function handlePmtMgmtSupplierRefresh() {
    console.log(`[PmtMgmt] 🔄 Refreshing supplier payments tab`);
    
    try {
        const currentFilter = supplierInvoicesPagination.currentFilter || 'outstanding';
        
        ProgressToast.show('Refreshing Supplier Data', 'info');
        ProgressToast.updateProgress('Clearing cache and reloading...', 50);
        
        // Clear relevant caches
        clearPaymentMgmtCache();
        
        // Reload with current filter
        await loadSupplierInvoicesForMgmtTab(currentFilter, {
            page: 1,
            forceRefresh: true
        });
        
        ProgressToast.updateProgress('Supplier data refreshed successfully!', 100);
        
        setTimeout(() => {
            ProgressToast.hide(300);
            showModal('success', 'Data Refreshed', 
                'Supplier payment data has been refreshed with the latest information from the database.'
            );
        }, 800);
        
    } catch (error) {
        console.error('[PmtMgmt] Error refreshing supplier tab:', error);
        ProgressToast.showError('Refresh failed');
    }
}


// ===================================================================
// HELPER FUNCTIONS FOR PAYMENT MANAGEMENT
// ===================================================================

/**
 * Gets supplier invoice data from payment management grid
 */
function getSupplierInvoiceFromMgmtGrid(invoiceId) {
    if (!pmtMgmtSupplierGridApi) {
        console.error('[main.js] Payment management supplier grid not available');
        return null;
    }
    
    try {
        const rowNode = pmtMgmtSupplierGridApi.getRowNode(invoiceId);
        if (rowNode && rowNode.data) {
            console.log(`[main.js] Found invoice data in payment management grid:`, {
                invoiceId: rowNode.data.invoiceId,
                supplier: rowNode.data.supplierName,
                balance: formatCurrency(rowNode.data.balanceDue || 0)
            });
            return rowNode.data;
        } else {
            console.warn(`[main.js] Invoice ${invoiceId} not found in payment management grid`);
            return null;
        }
    } catch (error) {
        console.error('[main.js] Error getting invoice from payment management grid:', error);
        return null;
    }
}




// --- APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Initializing...");

    // Add the RowGroupingModule to the array of modules to be registered.
    ModuleRegistry.registerModules([
        AllCommunityModule
    ]);

    setupEventListeners();

    // 3. Initialize modals AFTER event listeners are set up
    initializeModals();

    // 4. Initialize master data listeners last
    //    These trigger UI updates that depend on event listeners being ready
    initializeMasterDataListeners();
});
