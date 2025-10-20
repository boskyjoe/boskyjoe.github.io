// js/main.js

import {
    ModuleRegistry,
    AllCommunityModule
} from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';




import { appState } from './state.js';
import { firebaseConfig, USERS_COLLECTION_PATH } from './config.js';

import { updateUI, showView, showSuppliersView, showLoader, hideLoader, formatCurrency } from './ui.js';
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
import { masterData } from './masterData.js';


import { getPurchaseInvoiceById, } from './api.js';
import { addLineItem, calculateAllTotals, showPurchasesView, switchPurchaseTab, loadPaymentsForSelectedInvoice, resetPurchaseForm, loadInvoiceDataIntoForm } from './ui.js';
import { addSupplierPayment } from './api.js';
import { recordPaymentAndUpdateInvoice } from './api.js';
import { deletePaymentAndUpdateInvoice } from './api.js';
import { getPaymentDataFromGridById } from './ui.js';

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
        return; // This is correct.
    }

    // 1. Collect Header Data
    const purchaseDate = document.getElementById('purchase-date').value;
    const supplierSelect = document.getElementById('purchase-supplier');
    const supplierId = supplierSelect.value;
    const supplierName = supplierSelect.options[supplierSelect.selectedIndex].text;
    const supplierInvoiceNo = document.getElementById('supplier-invoice-no').value;

    if (!purchaseDate || !supplierId) {
        await showModal('error', 'Missing Information', 'Please select a Purchase Date and a Supplier.');
        return;
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
        await showModal('error', 'No Items', 'Please add at least one product to the invoice.');
        return;
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

    const productIds = lineItems.map(item => item.masterProductId);

    // 4. Assemble the final invoice object
    const invoiceData = {
        purchaseDate: new Date(purchaseDate), supplierId, supplierName, supplierInvoiceNo,
        lineItems, itemsSubtotal, invoiceDiscountType, invoiceDiscountValue, invoiceDiscountAmount,
        taxableAmountForInvoice, totalItemLevelTax, invoiceTaxPercentage, invoiceLevelTaxAmount,
        totalTaxAmount, invoiceTotal,
        productIds: productIds
    };


    const docId = document.getElementById('purchase-invoice-doc-id').value;
    const isEditMode = !!docId;

    let success = false;
    let successMessage = '';


    // 5. Save to Firestore
    try {
        appState.isLocalUpdateInProgress = true;
        if (isEditMode) {
            // UPDATE existing invoice
            await updatePurchaseInvoiceAndInventory(docId, invoiceData, user);
            successMessage = 'Purchase Invoice has been updated and inventory is now correct.';
        } else {
            console.log("Simulating add new invoice.");
            await createPurchaseInvoiceAndUpdateInventory(invoiceData, user);
            document.getElementById('purchase-invoice-form').reset();
            document.getElementById('purchase-line-items-container').innerHTML = '';
            addLineItem();
            calculateAllTotals();
            successMessage = 'Purchase Invoice has been saved successfully. and inventory is now correct.';
        }
        console.log("Database call skipped. Attempting to show modal...");
        success = true;
    } catch (error) {
        console.error("Error saving purchase invoice:", error);
        await showModal('error', 'Save Failed', 'There was an error saving the invoice.');
        success = false;
    } finally {
        if (success) {
            // We are using .then() to ensure these UI updates run in a new, clean "tick"
            // of the event loop, completely separate from the database promise chain.
            console.log("[handleSavePurchaseInvoice]: In Finally");
            alert(successMessage)
            resetPurchaseForm();
        }
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


        // Authentication
        if (target.closest('#login-button')) return EventHandlers.auth.login();
        if (target.closest('#logout-button')) return EventHandlers.auth.logout();

        // Navigation
        const navTrigger = target.closest('.nav-link, .back-link, .master-data-card');
        if (navTrigger && handleNavigation(navTrigger)) return;

        // Grid actions
        if (await handleGridAction(target, user)) return;

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

    console.log('[Grid action]:', grid.id);

    const handler = EventHandlers.grids[grid.id];
    if (handler) {
        await handler(gridButton, docId, user);
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
    if (!button.classList.contains('action-btn-delete-payment')) return;

    console.log("[main.js] Delete payment for docId:", docId);
    const paymentData = getPaymentDataFromGridById(docId);

    if (!paymentData) {
        alert('Error: Could not find payment data in the grid.');
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete the payment of $${paymentData.amountPaid.toFixed(2)}? This will update the invoice balance and cannot be undone.`
    );

    if (confirmed) {
        try {
            await deletePaymentAndUpdateInvoice(docId, user);
            alert('Success: The payment has been deleted and the invoice balance has been updated.');
        } catch (error) {
            console.error("Error deleting payment:", error);
            alert(`Delete Failed: The payment could not be deleted. Reason: ${error.message}`);
        }
    }
}

async function handleExistingCataloguesGrid(button, docId) {
    if (button.classList.contains('action-btn-edit-catalogue')) {
        const catalogueData = getCatalogueDataFromGridById(docId);
        if (catalogueData) loadCatalogueForEditing(catalogueData);
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

async function handleConsignmentPaymentsGrid(button, docId, user) {
    const paymentData = getPaymentDataFromGridById(docId);
    if (!paymentData) return;

    if (button.classList.contains('action-btn-edit-payment')) {
        loadPaymentRecordForEditing(paymentData);
    } else if (button.classList.contains('action-btn-cancel-payment')) {
        if (confirm("Are you sure you want to cancel and delete this pending payment record? This action cannot be undone.")) {
            try {
                await cancelPaymentRecord(docId);
                alert("Payment record has been cancelled.");
            } catch (error) {
                console.error("Error cancelling payment record:", error);
                alert(`Failed to cancel payment record: ${error.message}`);
            }
        }
    } else if (button.classList.contains('action-btn-verify-payment')) {
        if (confirm(`Are you sure you want to verify this payment of $${paymentData.amountPaid.toFixed(2)}? This will update the order balance.`)) {
            try {
                await verifyConsignmentPayment(docId, user);
                alert("Payment successfully verified!");
            } catch (error) {
                console.error("Error verifying payment:", error);
                alert(`Payment verification failed: ${error.message}`);
            }
        }
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

    const paymentData = getSalePaymentDataFromGridById(docId);
    if (!paymentData) return;

    if (confirm(`Are you sure you want to VOID this payment of ${formatCurrency(paymentData.amountPaid)}? This will reverse the transaction and cannot be undone.`)) {
        showLoader();
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
            hideLoader();
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


// NEW: dedicated handler for the Supplier Payment modal form
async function handleSupplierPaymentSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) {
        await showModal('error', 'Not Logged In', 'You must be logged in to record a payment.');
        return;
    }

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');

    // Build payment data from the supplier-prefixed inputs
    const paymentData = {
        relatedInvoiceId: document.getElementById('supplier-payment-invoice-id').value,
        supplierId: document.getElementById('supplier-payment-supplier-id').value,
        paymentDate: new Date(document.getElementById('supplier-payment-date-input').value),
        amountPaid: parseFloat(document.getElementById('supplier-payment-amount-input').value),
        paymentMode: document.getElementById('supplier-payment-mode-select').value,
        transactionRef: document.getElementById('supplier-payment-ref-input').value,
        notes: document.getElementById('supplier-payment-notes-input').value
    };

    // Validation
    if (!paymentData.relatedInvoiceId || !paymentData.supplierId) {
        await showModal('error', 'Missing Data', 'Invoice or supplier information is missing.');
        return;
    }

    if (isNaN(paymentData.amountPaid) || paymentData.amountPaid <= 0) {
        await showModal('error', 'Invalid Amount', 'Payment amount must be greater than zero.');
        return;
    }

    if (!paymentData.paymentMode) {
        await showModal('error', 'Missing Payment Mode', 'Please select a payment mode.');
        return;
    }

    // Disable submit button during save
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    try {
        // This calls the transactional API function
        await recordPaymentAndUpdateInvoice(paymentData, user);
        await showModal('success', 'Payment Recorded', 'Supplier payment has been recorded successfully.');
        closeSupplierPaymentModal();

        // Refresh payments grid if it's visible
        if (typeof loadPaymentsForSelectedInvoice === 'function') {
            await loadPaymentsForSelectedInvoice();
        }
    } catch (error) {
        console.error('Error recording supplier payment:', error);
        await showModal('error', 'Save Failed', error.message || 'Failed to record the payment.');
    } finally {
        // Always re-enable the button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Payment';
        }
    }
}


// Form submission handlers
async function handleSupplierSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return alert("You must be logged in.");

    const supplierData = {
        supplierName: document.getElementById('supplierName-input').value,
        address: document.getElementById('address-input').value,
        contactNo: document.getElementById('contactNo-input').value,
        contactEmail: document.getElementById('contactEmail-input').value,
        creditTerm: document.getElementById('creditTerm-input').value
    };

    try {
        await addSupplier(supplierData, user);
        await showModal('success', 'Success', 'Supplier has been added successfully.');
        e.target.reset();
    } catch (error) {
        console.error("Error adding supplier:", error);
        await showModal('error', 'Error', 'Failed to add the supplier. Please try again.');
    }
}

async function handleProductSubmit(e) {
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
        unitPrice,
        unitMarginPercentage,
        sellingPrice,
        inventoryCount: parseInt(document.getElementById('initialStock-input').value, 10) || 0
    };

    if (!productData.categoryId) {
        return showModal('error', 'Invalid Input', 'Please select a product category.');
    }

    try {
        await addProduct(productData, user);
        await showModal('success', 'Success', 'Product has been added successfully.');
        e.target.reset();
    } catch (error) {
        console.error("Error adding product:", error);
        await showModal('error', 'Error', 'Failed to add the Product. Please try again.');
    }
}

function handlePurchaseInvoiceSubmit(e) {
    e.preventDefault();
    handleSavePurchaseInvoice();
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    const paymentData = {
        paymentDate: new Date(document.getElementById('payment-date-input').value),
        amountPaid: parseFloat(document.getElementById('payment-amount-input').value),
        paymentMode: document.getElementById('payment-mode-select').value,
        transactionRef: document.getElementById('payment-ref-input').value,
        notes: document.getElementById('payment-notes-input').value,
        relatedInvoiceId: document.getElementById('payment-invoice-id').value,
        supplierId: document.getElementById('payment-supplier-id').value
    };

    if (isNaN(paymentData.amountPaid) || paymentData.amountPaid <= 0) {
        return showModal('error', 'Invalid Amount', 'Payment amount must be greater than zero.');
    }

    try {
        await recordPaymentAndUpdateInvoice(paymentData, user);
        await showModal('success', 'Success', 'Payment has been recorded successfully.');
        closePaymentModal();
    } catch (error) {
        console.error("Error recording payment:", error);
        await showModal('error', 'Save Failed', 'There was an error recording the payment.');
    }
}

async function handleTeamSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    const teamData = {
        teamName: document.getElementById('team-name-input').value,
        churchName: appState.ChurchName
    };

    try {
        await addChurchTeam(teamData, user);
        alert('New team created successfully.');
        e.target.reset();
    } catch (error) {
        console.error("Error creating team:", error);
        alert('Failed to create team.');
    }
}

async function handleMemberSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    const teamId = document.getElementById('member-team-id').value;
    const memberId = document.getElementById('member-doc-id').value;
    const isEditMode = !!memberId;

    const teamData = getTeamDataFromGridById(teamId);
    if (!teamData) return alert("Error: Could not find parent team data.");

    const memberData = {
        name: document.getElementById('member-name-input').value,
        email: document.getElementById('member-email-input').value,
        phone: document.getElementById('member-phone-input').value,
        role: document.getElementById('member-role-select').value
    };

    try {
        if (isEditMode) {
            await updateTeamMember(teamId, memberId, memberData);
            alert('Member details updated successfully.');
        } else {
            await addTeamMember(teamId, teamData.teamName, memberData, user);
            alert('New member added successfully.');
        }

        if (memberData.role === 'Team Lead') {
            await updateChurchTeam(teamId, {
                teamLeadId: memberId,
                teamLeadName: memberData.name
            }, user);
        }

        closeMemberModal();
    } catch (error) {
        console.error("Error saving member:", error);
        alert('Failed to save member details.');
    }
}

async function handleCatalogueSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    const docId = document.getElementById('sales-catalogue-doc-id').value;
    const isEditMode = !!docId;
    const seasonSelect = document.getElementById('catalogue-season-select');

    const catalogueData = {
        catalogueName: document.getElementById('catalogue-name-input').value,
        seasonId: seasonSelect.value,
        seasonName: seasonSelect.options[seasonSelect.selectedIndex].text
    };

    try {
        if (isEditMode) {
            await updateSalesCatalogue(docId, catalogueData, user);
            alert('Catalogue details have been updated.');
            resetCatalogueForm();
        } else {
            if (appState.draftCatalogueItems.length === 0) {
                return alert('Please add at least one item to the catalogue before saving.');
            }
            const itemsToSave = appState.draftCatalogueItems.map(({ tempId, ...rest }) => rest);
            await createCatalogueWithItems(catalogueData, itemsToSave, user);
            alert('New sales catalogue and its items have been saved successfully.');
            resetCatalogueForm();
        }
        e.target.reset();
    } catch (error) {
        console.error("Error saving sales catalogue:", error);
        alert('There was an error saving the catalogue.');
    }
}

async function handleConsignmentRequestSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    const teamSelect = document.getElementById(user.role === 'admin' ? 'admin-select-team' : 'user-select-team');
    const catalogueSelect = document.getElementById('request-catalogue-select');
    const eventSelect = document.getElementById('request-event-select');

    let requestingMemberId, requestingMemberName, requestingMemberEmail;

    if (user.role === 'admin') {
        const memberSelect = document.getElementById('admin-select-member');
        if (!memberSelect.value) return alert("Please select a Team Lead.");

        const selectedLead = JSON.parse(memberSelect.value);
        requestingMemberId = selectedLead.id;
        requestingMemberName = selectedLead.name;
        requestingMemberEmail = selectedLead.email;
    } else {
        requestingMemberId = user.uid;
        requestingMemberName = user.displayName;
        requestingMemberEmail = user.email;
    }

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

    const requestedItems = getRequestedConsignmentItems();
    if (requestedItems.length === 0) {
        return alert("Please request a quantity of at least one item.");
    }

    try {
        await createConsignmentRequest(requestData, requestedItems, user);
        alert("Consignment request submitted successfully!");
        closeConsignmentRequestModal();
    } catch (error) {
        console.error("Error creating consignment request:", error);
        alert(`Failed to submit request: ${error.message}`);
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

async function handleMakePaymentSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    const docId = document.getElementById('payment-ledger-doc-id').value;
    const isEditMode = !!docId;

    const paymentData = {
        orderId: appState.selectedConsignmentId,
        teamLeadId: user.uid,
        teamLeadName: user.displayName,
        amountPaid: parseFloat(document.getElementById('payment-amount-input').value),
        paymentDate: new Date(document.getElementById('payment-date-input').value),
        paymentMode: document.getElementById('payment-mode-select').value,
        transactionRef: document.getElementById('payment-ref-input').value,
        notes: document.getElementById('payment-notes-input').value,
        paymentReason: document.getElementById('payment-reason-select').value
    };

    if (!paymentData.transactionRef) {
        return alert("Please enter a Reference # for this payment.");
    }

    if (isNaN(paymentData.amountPaid) || paymentData.amountPaid <= 0) {
        return alert("Amount paid must be a number greater than zero.");
    }

    try {
        if (isEditMode) {
            await updatePaymentRecord(docId, paymentData, user);
            alert("Pending payment record updated successfully.");
        } else {
            await submitPaymentRecord(paymentData, user);
            alert("Payment record submitted for verification.");
        }
        resetPaymentForm();
    } catch (error) {
        console.error("Error submitting payment record:", error);
        alert(`Failed to submit payment record: ${error.message}`);
    }
}

async function handleNewSaleSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    const rawCartItems = getSalesCartItems();
    if (rawCartItems.length === 0) {
        return alert("Please add at least one product to the cart.");
    }

    // Calculate line items
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

    // Calculate order totals
    const orderDiscPercent = parseFloat(document.getElementById('sale-order-discount').value) || 0;
    const orderTaxPercent = parseFloat(document.getElementById('sale-order-tax').value) || 0;
    const orderDiscountAmount = itemsSubtotal * (orderDiscPercent / 100);
    const finalTaxableAmount = itemsSubtotal - orderDiscountAmount;
    const orderLevelTaxAmount = finalTaxableAmount * (orderTaxPercent / 100);
    const finalTotalTax = totalItemLevelTax + orderLevelTaxAmount;
    const grandTotal = finalTaxableAmount + finalTotalTax;

    // Handle payment
    let initialPaymentData = null;
    let donationAmount = 0;
    let amountReceived = 0;

    if (document.getElementById('sale-payment-type').value === 'Pay Now') {
        amountReceived = parseFloat(document.getElementById('sale-amount-received').value) || 0;

        if (amountReceived < grandTotal) {
            if (!confirm("The amount received is less than the total. This will create a partially paid invoice. Do you want to continue?")) {
                return;
            }
        }

        if (!document.getElementById('sale-payment-ref').value) {
            return alert("Please enter a Reference # for the payment.");
        }

        if (amountReceived > grandTotal) {
            donationAmount = amountReceived - grandTotal;
        }

        const amountToApplyToInvoice = Math.min(amountReceived, grandTotal);

        initialPaymentData = {
            amountPaid: amountToApplyToInvoice,
            paymentMode: document.getElementById('sale-payment-mode').value,
            transactionRef: document.getElementById('sale-payment-ref').value,
            notes: document.getElementById('sale-payment-notes').value
        };
    }

    // Assemble sale data
    const saleData = {
        saleDate: new Date(document.getElementById('sale-date').value),
        store: document.getElementById('sale-store-select').value,
        customerInfo: {
            name: document.getElementById('sale-customer-name').value,
            email: document.getElementById('sale-customer-email').value,
            phone: document.getElementById('sale-customer-phone').value,
            address: document.getElementById('sale-store-select').value === 'Tasty Treats'
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
            changeDue: 0
        }
    };

    try {
        await createSaleAndUpdateInventory(saleData, initialPaymentData, donationAmount, user.email);
        alert("Sale completed successfully!");
        showSalesView();
    } catch (error) {
        console.error("Error completing sale:", error);
        alert(`Sale failed: ${error.message}`);
    }
}

async function handleRecordSalePaymentSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    const invoiceId = document.getElementById('record-sale-invoice-id').value;
    const invoiceData = getSalesHistoryDataById(invoiceId);

    if (!invoiceData) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Payment';
        return alert("Error: Cannot find parent invoice data.");
    }

    const amountPaidInput = parseFloat(document.getElementById('record-sale-amount').value);
    const balanceDue = invoiceData.balanceDue;

    let donationAmount = 0;
    if (amountPaidInput > balanceDue) {
        donationAmount = amountPaidInput - balanceDue;
    }

    const amountToApplyToInvoice = Math.min(amountPaidInput, balanceDue);

    const paymentData = {
        invoiceId,
        amountPaid: amountToApplyToInvoice,
        donationAmount,
        customerName: invoiceData.customerInfo.name,
        paymentMode: document.getElementById('record-sale-mode').value,
        transactionRef: document.getElementById('record-sale-ref').value,
        notes: ''
    };

    if (isNaN(paymentData.amountPaid) || paymentData.amountPaid <= 0) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Payment';
        return alert("Amount paid must be a number greater than zero.");
    }

    if (!paymentData.transactionRef) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Payment';
        return alert("Please enter a Reference # for the payment.");
    }

    showLoader();

    try {
        await recordSalePayment(paymentData, user);
        resetSalePaymentForm();

        const updatedInvoiceData = await getSalesInvoiceById(invoiceId);
        if (updatedInvoiceData) {
            refreshSalePaymentModal(updatedInvoiceData);
        } else {
            closeRecordSalePaymentModal();
        }
    } catch (error) {
        console.error("Error recording sale payment:", error);
        alert(`Failed to record payment: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Payment';
        hideLoader();
    }
}

async function handleCategorySubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    const categoryName = document.getElementById('categoryName-input').value.trim();

    if (!user || !categoryName) return;

    try {
        await addCategory(categoryName, user);
        await showModal('success', 'Success', 'Category has been added successfully.');
        e.target.reset();
    } catch (error) {
        console.error("Error adding category:", error);
        await showModal('error', 'Error', 'Failed to add the category. Please try again.');
    }
}

async function handlePaymentModeSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    const paymentMode = document.getElementById('paymentModeName-input').value.trim();

    if (!user || !paymentMode) return;

    try {
        await addPaymentMode(paymentMode, user);
        await showModal('success', 'Success', 'Payment Mode has been added successfully.');
        e.target.reset();
    } catch (error) {
        console.error("Error adding payment mode:", error);
        await showModal('error', 'Error', 'Failed to add the Payment Mode. Please try again.');
    }
}

async function handleSaleTypeSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    const saleTypeName = document.getElementById('saleTypeName-input').value.trim();

    if (!user || !saleTypeName) return;

    try {
        await addSaleType(saleTypeName, user);
        await showModal('success', 'Success', 'Sales Type has been added successfully.');
        e.target.reset();
    } catch (error) {
        console.error("Error adding sale type:", error);
        await showModal('error', 'Error', 'Failed to add the Sales Type. Please try again.');
    }
}

async function handleSeasonSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    const seasonName = document.getElementById('seasonName-input').value.trim();
    const startDate = document.getElementById('startDate-input').value;
    const endDate = document.getElementById('endDate-input').value;

    if (!user || !seasonName || !startDate || !endDate) return;

    const seasonData = {
        seasonName,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
    };

    try {
        await addSeason(seasonData, user);
        await showModal('success', 'Success', 'Season has been added successfully.');
        e.target.reset();
    } catch (error) {
        console.error("Error adding season:", error);
        await showModal('error', 'Error', 'Failed to add the Season. Please try again.');
    }
}

async function handleEventSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    const eventName = document.getElementById('eventName-input').value.trim();
    const parentSeasonData = JSON.parse(document.getElementById('parentSeason-select').value);
    const startDate = document.getElementById('eventStartDate-input').value;
    const endDate = document.getElementById('eventEndDate-input').value;

    if (!user || !eventName || !parentSeasonData || !startDate || !endDate) return;

    const eventData = {
        eventName,
        seasonId: parentSeasonData.seasonId,
        seasonName: parentSeasonData.seasonName,
        eventStartDate: new Date(startDate),
        eventEndDate: new Date(endDate)
    };

    try {
        await addSalesEvent(eventData, user);
        await showModal('success', 'Success', 'Sales Event has been added successfully.');
        e.target.reset();
    } catch (error) {
        console.error("Error adding event:", error);
        await showModal('error', 'Error', 'Failed to add the Sales Event. Please try again.');
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

function setupSalePaymentTypeListener() {
    const salePaymentTypeSelect = document.getElementById('sale-payment-type');
    if (!salePaymentTypeSelect) return;

    salePaymentTypeSelect.addEventListener('change', (e) => {
        const payNowContainer = document.getElementById('sale-pay-now-container');
        const showPayNow = e.target.value === 'Pay Now';
        payNowContainer.classList.toggle('hidden', !showPayNow);
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
