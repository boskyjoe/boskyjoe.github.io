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

import { updateUI, showView, showSuppliersView, showLoader, hideLoader,  } from './ui.js';
import { showCategoriesView,ProgressToast } from './ui.js';
import { showModal } from './modal.js';


import { addSupplier, updateSupplier, setSupplierStatus,createUserRecord } from './api.js';
import { addCategory, updateCategory, setCategoryStatus } from './api.js';

import { showSaleTypesView } from './ui.js';
import { addSaleType, updateSaleType, setSaleTypeStatus } from './api.js';

import { showPaymentModesView } from './ui.js';
import { addPaymentMode, updatePaymentMode, setPaymentModeStatus } from './api.js';

import { showSeasonsView } from './ui.js';
import { addSeason, updateSeason, setSeasonStatus } from './api.js';

import { showSalesEventsView } from './ui.js';
import { addSalesEvent, updateSalesEvent, setSalesEventStatus } from './api.js';

import { formatCurrency,numberToWords } from './utils.js'; 

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
    getSalesPaymentDataFromGridById, getSelectedConsignmentOrderBalance,  hideConsignmentDetailPanel,
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
    refreshSalePaymentModal,loadApplicationDashboard,
    showBulkAddProductsModal,        
    closeBulkAddProductsModal,       
    getBulkSelectedProducts, addBulkLineItems, bulkSelectAllVisibleProducts, bulkClearAllSelections, bulkSelectProductsWithPrices,updateNoItemsMessageVisibility,
    showBulkPaymentModal, closeBulkPaymentModal,getSelectedPurchaseInvoices,
    deselectAllPurchaseInvoices,showViewCatalogueItemsModal,showSalesDetailModal
} from './ui.js';

import {
    getUserMembershipInfo,
    getMembersForTeam,
    createConsignmentRequest,
    fulfillConsignmentAndUpdateInventory,
    logActivityAndUpdateConsignment, getConsignmentOrderById,getItemsForConsignmentOrder,
    submitPaymentRecord, updatePaymentRecord,
    verifyConsignmentPayment, cancelPaymentRecord,rejectConsignmentRequest,
    createSaleAndUpdateInventory, recordSalePayment,
    voidSalePayment, getSalesInvoiceById,processBulkSupplierPayment
} from './api.js';


import { 
    showReportsHubView, 
    showSalesReportsView, 
    showInventoryReportsView, 
    showFinancialReportsView,
    showTeamReportsView, 
    showOperationsReportsView, 
    showExecutiveDashboardView,loadExecutiveDashboard,
    handleReportCardClick,
    showSalesTrendsDetailView,showCustomerInsightsDetailView,showPNLReportView
} from './ui.js';


import { 
    showPaymentManagementView,        
    switchPaymentMgmtTab,            
    clearPaymentMgmtCache,           
    refreshPaymentManagementDashboard,
    showSupplierInvoiceDetailsModal,  
    closeSupplierInvoiceDetailsModal,   
    handleSupplierPayOutstandingBalance,  
    getSupplierInvoiceFromMgmtGrid,
    showSupplierInvoicePaymentVerificationModal, 
    buildActionRequiredList,
    checkForPendingTeamPayments,              // For checking team payment status
    showTeamPaymentVerificationModal,        // For team payment verification modal

} from './payment-management.js';

import { getInvoiceSample3HTML, getInvoiceSample3CSS } from './invoice-templates.js'; 
import { storeConfig } from './config.js'; 

import { 
    showExpensesView, 
    getExpenseRowData, 
    removeExpenseRow,   
    addNewExpenseRow,exportConsignmentOrders,exportSalesOrderHistory,exportAllCataloguesToMultiSheetExcel
} from './ui.js';

import { addConsignmentExpense} from './api.js';
import { showLogExpenseModal, closeLogExpenseModal,showLogDirectSaleExpenseModal, closeLogDirectSaleExpenseModal,showViewConsignmentDetailsModal } from './ui.js';

import { addExpense, updateExpense, deleteExpense,replaceExpenseReceipt,processExpense , updateConsignmentExpense, addDirectSaleExpense} from './api.js';


import { generateTastyTreatsInvoice } from './pdf-templates.js';



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

    // ✅ THE FIX: Add a custom parameter to always prompt for account selection.
    provider.setCustomParameters({
        prompt: 'select_account'
    });

    auth.signInWithPopup(provider).catch(error => {
        console.error("Google Sign-In Error:", error);
        
        // Use your modal system for better error feedback
        showModal('error', 'Login Failed', 
            `Could not sign in with Google. Please try again.\n\nError: ${error.message}`
        );
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
        // --- USER IS LOGGED IN ---
        console.log("Firebase user signed in:", user.email);

        const userDocRef = db.collection(USERS_COLLECTION_PATH).doc(user.uid);
        const docSnap = await userDocRef.get();

        if (docSnap.exists) {
            // --- CASE 1: USER EXISTS IN FIRESTORE ---
            const userData = docSnap.data();

            if (userData.isActive) {
                // --- Sub-case 1a: User is Active ---
                console.log(`Existing, active user. Role: ${userData.role}`);
                appState.currentUser = {
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    role: userData.role,
                    teamId: userData.teamId || null
                };
                // Load the dashboard data in the background
                await loadApplicationDashboard();
            } else {
                // --- Sub-case 1b: User is Inactive ---
                console.warn("User is marked as inactive in Firestore.");
                appState.currentUser = null; // Treat as logged out
                await auth.signOut(); // Force sign out
                showModal('error', 'Account Deactivated', 'Your account has been deactivated. Please contact an administrator.');
            }
        } else {
            // --- CASE 2: NEW USER (Document does not exist) ---
            console.log(`New user detected: ${user.email}. Provisioning as 'guest'.`);
            
            try {
                // Create the user record in Firestore with the 'guest' role
                await createUserRecord(user, 'guest');

                // Set the current user state for this session
                appState.currentUser = {
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    role: 'guest' // Assign the default guest role
                };
                
                // Show a success message. The user will be redirected by updateUI().
                showModal('success', 'Account Created Successfully!', 
                    'Your account has been created with guest access. Please contact an administrator to have your role assigned.'
                );

            } catch (error) {
                console.error("Failed to create new user record:", error);
                appState.currentUser = null;
                await auth.signOut();
                showModal('error', 'Account Creation Failed', 'There was an error creating your user record. Please try again.');
            }
        }
    } else {
        // --- USER IS LOGGED OUT ---
        console.log("User signed out.");
        appState.currentUser = null;
    }

    // This is the final step that runs regardless of the outcome.
    // It will correctly show the dashboard for authorized users or the login page for guests/logged-out users.
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

        const invoiceName = document.getElementById('purchase-invoice-name').value;


        if (!purchaseDate || !supplierId || !invoiceName) { 
            ProgressToast.hide(0);
            await showModal('error', 'Missing Information', 'Please select a Purchase Date, a Supplier, and provide an Invoice Name.');
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
            purchaseDate: new Date(purchaseDate), supplierId, supplierName, supplierInvoiceNo,invoiceName: invoiceName,
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

// ✅ NEW: This function follows the same pattern as your fulfillment handler.
let isRejecting = false; // Prevents double-clicks
async function handleRejectConsignmentClick() {
    if (isRejecting) {
        console.warn("Rejection is already in progress.");
        return;
    }

    const user = appState.currentUser;
    if (!user || !['admin', 'inventory_manager'].includes(user.role)) {
        return showModal('error', 'Permission Denied', 'Only administrators or inventory managers can reject requests.');
    }

    const orderId = appState.selectedConsignmentId;
    if (!orderId) {
        return showModal('warning', 'No Order Selected', 'An order must be selected to reject it.');
    }

    // Use a prompt to get the reason for rejection first.
    const reason = prompt("Please provide a reason for rejecting this consignment request:");

    // If the user clicks "Cancel" on the prompt, `reason` will be null, and we stop.
    if (reason === null) {
        console.log("User cancelled rejection prompt.");
        return;
    }

    // If the user clicks "OK" but leaves the reason blank, show an error.
    if (reason.trim() === '') {
        return showModal('error', 'Reason Required', 'A reason is required to reject a consignment request.');
    }

    // Now, show the final confirmation modal.
    const confirmed = await showModal('confirm', 'Confirm Rejection', 
        `Are you sure you want to reject this order?\n\nReason: "${reason}"\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
        console.log("User cancelled final rejection confirmation.");
        return;
    }

    isRejecting = true;
    const rejectButton = document.getElementById('reject-consignment-btn');
    if (rejectButton) {
        rejectButton.disabled = true;
        rejectButton.textContent = 'Processing...';
    }

    ProgressToast.show('Rejecting Consignment Order', 'warning');

    try {
        ProgressToast.updateProgress('Updating order status...', 75, 'Step 1 of 2');
        
        // Call the simple API function we created
        await rejectConsignmentRequest(orderId, reason, user);

        ProgressToast.updateProgress('Rejection complete!', 100, 'Step 2 of 2');
        ProgressToast.showSuccess('Order has been rejected.');

        // Hide the detail panel since the order is no longer actionable
        hideConsignmentDetailPanel();

        setTimeout(() => {
            ProgressToast.hide(500);
            showModal('success', 'Order Rejected', 'The consignment request has been successfully marked as rejected.');
        }, 1200);

    } catch (error) {
        console.error("Error rejecting consignment order:", error);
        ProgressToast.showError(`Rejection failed: ${error.message}`);
        setTimeout(() => showModal('error', 'Rejection Failed', `The operation could not be completed. Please check the console for details.\n\nError: ${error.message}`), 2000);
    } finally {
        isRejecting = false;
        if (rejectButton) {
            rejectButton.disabled = false;
            rejectButton.textContent = 'Reject Order';
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
    if (user.role !== 'admin') {
        // Use your modal system for better feedback than an alert
        await showModal('error', 'Permission Denied', 'Only administrators can fulfill consignment orders.');
        return;
    }

    const orderId = appState.selectedConsignmentId;
    if (!orderId) {
        await showModal('warning', 'No Order Selected', 'Please select a consignment order from the grid to fulfill.');
        return;
    }

    // Use the promise-based modal for confirmation
    const confirmed = await showModal('confirm', 'Confirm Fulfillment', 
        'This will decrement main store inventory and activate the consignment order.\n\nThis action cannot be undone. Are you sure you want to proceed?'
    );

    if (!confirmed) {
        console.log("User cancelled fulfillment.");
        return;
    }

    isFulfilling = true;
    const fulfillButton = document.getElementById('fulfill-checkout-btn');
    if (fulfillButton) {
        fulfillButton.disabled = true;
        fulfillButton.textContent = 'Processing...';
    }

    // ✅ START: Show the progress toast
    ProgressToast.show('Fulfilling Consignment Order', 'info');

    try {
        // Step 1: Get data from the UI
        ProgressToast.updateProgress('Validating items to fulfill...', 20, 'Step 1 of 5');
        const finalItems = getFulfillmentItems();

        if (finalItems.length === 0) {
            // Use showError and hide the toast before showing the modal
            ProgressToast.showError('No items with a quantity greater than zero were found.');
            setTimeout(() => showModal('warning', 'No Items to Fulfill', 'There are no items with a quantity greater than zero in this order.'), 1000);
            throw new Error("Empty fulfillment list."); // Throw an error to go to the finally block
        }

        // Step 2: Main API call (the longest step)
        ProgressToast.updateProgress('Updating inventory & activating order...', 50, 'Step 2 of 5');
        await fulfillConsignmentAndUpdateInventory(orderId, finalItems, user);

        // Step 3: Fetch updated data for UI refresh
        ProgressToast.updateProgress('Retrieving updated order details...', 80, 'Step 3 of 5');
        const updatedOrderData = await getConsignmentOrderById(orderId);

        // Step 4: Final UI update
        ProgressToast.updateProgress('Rendering updated consignment details...', 95, 'Step 4 of 5');
        if (updatedOrderData) {
            renderConsignmentDetail(updatedOrderData);
        } else {
            // If fetching the updated data failed, hide the panel to prevent stale data
            hideConsignmentDetailPanel();
        }
        
        // Note: The call to refreshConsignmentDetailPanel(orderId) is redundant
        // because renderConsignmentDetail(updatedOrderData) already accomplishes the same goal
        // with fresher data. It has been safely removed.

        // Step 5: Show success state
        ProgressToast.showSuccess('Fulfillment complete! Consignment is now active.');

        // Hide the toast after a short delay and show a final confirmation modal
        setTimeout(() => {
            ProgressToast.hide(500); // Hide toast quickly
            showModal('success', 'Fulfillment Successful', 'The consignment order is now active and inventory has been updated.');
        }, 1500);

    } catch (error) {
        console.error("Fulfillment failed:", error);
        // Use the toast to show the error, then a modal for more detail
        ProgressToast.showError(`Fulfillment failed: ${error.message}`);
        setTimeout(() => showModal('error', 'Fulfillment Failed', `The operation could not be completed. Please check the console for details or try again.\n\nError: ${error.message}`), 2000);

    } finally {
        // This block will always run, whether the try block succeeded or failed
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
        'expenses-view': showExpensesView,
        'consignment-view': showConsignmentView,
        'sales-view': showSalesView,
        'pmt-mgmt-view': showPaymentManagementView, // ✅ FROM: payment-management.js
        // ADD THESE NEW REPORT VIEWS:
        'reports-hub-view': showReportsHubView,
        'sales-reports-view': showSalesReportsView,
        'inventory-reports-view': showInventoryReportsView,
        'financial-reports-view': showFinancialReportsView,
        'team-reports-view': showTeamReportsView,
        'operations-reports-view': showOperationsReportsView,
        //'executive-dashboard-view': showExecutiveDashboardView,
        'dashboard-view': async () => {
            showView('dashboard-view');
            await loadApplicationDashboard();
        },
        'executive-dashboard-view': async () => {
            showView('executive-dashboard-view');
            await loadExecutiveDashboard(); // ✅ Load dashboard data when view opens
        },
        'store-performance-detail-view': () => showStorePerformanceDetailView(),
        'sales-trends-detail-view': () => showSalesTrendsDetailView(),
        'customer-insights-detail-view': () => showCustomerInsightsDetailView(),
        'stock-status-detail-view': () => showStockStatusDetailView(),
        'inventory-valuation-detail-view': () => showInventoryValuationDetailView(),
        'pnl-report-view': () => showPNLReportView(),
        
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
        'products-catalogue-grid': handleProductsCatalogueGrid,
        'expenses-grid': handleExpensesGrid,
        'pmt-mgmt-supplier-grid': handlePmtMgmtSupplierGrid
    }
};

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

function setupEventListeners() {
    ProgressToast.updateProgress('Initializing all the UI Controllors....', 150);
    setupGlobalClickHandler();
    ProgressToast.updateProgress('Initializing all Controls....', 150);
    setupMobileSidebar();
    ProgressToast.updateProgress('Initializing all application forms....', 150);
    setupFormSubmissions();
    ProgressToast.updateProgress('Initializing all navigation controls....', 150);
    setupCustomEventListeners();
    ProgressToast.updateProgress('Initializing all the database connection and listeners....', 150);
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

        const alertButton = target.closest('.alert-action-button');
        if (alertButton && alertButton.dataset.actionView) {
            const viewId = alertButton.dataset.actionView;
            console.log(`Alert button clicked, navigating to: ${viewId}`);
            showView(viewId);
            return; // Action handled, stop further processing
        }

        const generateInvoiceButton = target.closest('.action-btn-generate-invoice');
        if (generateInvoiceButton) {
            const invoiceId = generateInvoiceButton.dataset.id;
            if (invoiceId) {
                await handleGenerateInvoice(invoiceId);
            }
            return; // Action handled
        }

        const logExpenseBtn = e.target.closest('.action-btn-log-expense');
        if (logExpenseBtn) {
            const orderId = logExpenseBtn.dataset.id;
            
            try {
                ProgressToast.show('Loading Order Details...', 'info');
                
                // ✅ THE FIX: Add the 'await' keyword here.
                const orderData = await getConsignmentOrderById(orderId); 
                
                ProgressToast.hide(0);

                if (orderData) {
                    appState.selectedConsignmentId = orderId;
                    // Now you are passing the actual data object, not the Promise.
                    showLogExpenseModal(orderData);
                } else {
                    showModal('error', 'Order Not Found', 'The selected consignment order could not be found.');
                }
            } catch (error) {
                ProgressToast.hide(0);
                showModal('error', 'Error Fetching Order', 'Could not retrieve order details.');
            }
            return; // Action handled
        }

        const logDirectExpenseBtn = e.target.closest('.action-btn-log-direct-expense');
        if (logDirectExpenseBtn) {
            const saleId = logDirectExpenseBtn.dataset.id;
            
            try {
                ProgressToast.show('Loading Sale Details...', 'info');
                // Use your existing function to get the sale data
                const saleData = await getSalesInvoiceById(saleId); 
                ProgressToast.hide(0);

                if (saleData) {
                    // Store the ID in appState so the form submission handler knows which sale to update
                    appState.selectedSaleId = saleId; 
                    showLogDirectSaleExpenseModal(saleData);
                } else {
                    showModal('error', 'Sale Not Found', 'The selected sale could not be found.');
                }
            } catch (error) {
                ProgressToast.hide(0);
                showModal('error', 'Error Fetching Sale', 'Could not retrieve sale details.');
            }
            return; // Action handled
        }

        // ✅ Handler for the "View Consignment" button
        const viewConsignmentBtn = e.target.closest('.action-btn-view-consignment');
        if (viewConsignmentBtn) {
            const orderId = viewConsignmentBtn.dataset.id;
            const orderData = await getConsignmentOrderById(orderId);
            if (orderData) {
                showViewConsignmentDetailsModal(orderData);
            }
            return;
        }

        //Add the handler for our new button
        const downloadBtn = e.target.closest('#download-consignment-detail-pdf');
        if (downloadBtn) {
            await handleDownloadConsignmentDetail();
            return;
        }

        // Authentication
        //if (target.closest('#login-button')) return EventHandlers.auth.login();
        if (target.closest('#login-button, #login-button-bottom')) return EventHandlers.auth.login();
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

    if (button.classList.contains('action-btn-view-items')) {
        // Handle the view button click
        const catalogueData = getCatalogueDataFromGridById(docId);
        if (catalogueData) {
            showViewCatalogueItemsModal(docId, catalogueData.catalogueName);
        }
    } else if (button.classList.contains('action-btn-edit-catalogue')) {
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

// Add new form submission handler
async function handleLogExpenseSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    const orderId = appState.selectedConsignmentId;

    if (!user || !orderId) {
        return showModal('error', 'Error', 'No user or order selected. Please close the modal and try again.');
    }

    const expenseData = {
        justification: document.getElementById('expense-justification').value.trim(),
        amount: document.getElementById('expense-amount').value,
        expenseDate: document.getElementById('expense-date').value // The value is a 'YYYY-MM-DD' string
    };

    if (!expenseData.justification || !expenseData.amount || !expenseData.expenseDate || Number(expenseData.amount) <= 0) {
        return showModal('error', 'Missing Fields', 'Please provide a valid date, justification, and a positive amount.');
    }

    try {
        ProgressToast.show('Logging Expense...', 'info');
        await addConsignmentExpense(orderId, expenseData, user);
        ProgressToast.showSuccess('Expense logged successfully!');
        
        // Reset the form for the next entry
        document.getElementById('log-expense-form').reset();
        ProgressToast.hide(10);

        // The modal will update automatically via its own real-time listener,
        // but we can also manually refresh the main grid's data if needed.
        // For now, we'll let the modal's listener handle the updates.

    } catch (error) {
        ProgressToast.showError('Failed to log expense.');
        showModal('error', 'Failed to Log Expense', error.message);
    }
}

/**
 * ✅ CORRECTED: This is now a pure controller function.
 * It receives plain data and orchestrates the update process.
 * @param {object} updateDetails - An object containing { expenseId, fieldToUpdate, newValue, oldValue }.
 */

async function handleExpenseUpdate(updateDetails) { // <-- The parameter is named 'updateDetails'
    const user = appState.currentUser;
    const orderId = appState.selectedConsignmentId;
    
    // ✅ THE FIX: Use the correct parameter name 'updateDetails' for destructuring.
    const { expenseId, fieldToUpdate, newValue, oldValue, gridNodeId, gridName } = updateDetails;

    if (!user || !orderId) {
        showModal('error', 'Session Error', 'Cannot update expense: user session or order context is missing.');
        return;
    }

    ProgressToast.show('Updating Expense...', 'info');

    try {
        // Calculate the change in amount
        const amountDelta = (fieldToUpdate === 'amount') ? (newValue - oldValue) : 0;

        // Prepare the data for the API
        const updatedData = {
            [fieldToUpdate]: (fieldToUpdate === 'expenseDate') ? new Date(newValue) : newValue
        };

        // Call the transactional API function
        await updateConsignmentExpense(orderId, expenseId, amountDelta, updatedData, user);

        ProgressToast.showSuccess('Expense updated successfully!');

    } catch (error) {
        console.error("Error updating expense in controller:", error);
        ProgressToast.showError(`Update Failed: ${error.message}`);
        
       document.dispatchEvent(new CustomEvent('revertGridCell', {
            detail: {
                gridName: gridName, // Use the gridName received from the event
                nodeId: gridNodeId,
                field: fieldToUpdate,
                value: oldValue
            }
        }));

    } finally {ProgressToast.hide(300);
        closeLogExpenseModal();
    }
}


//Add the new form submission handler
async function handleLogDirectSaleExpenseSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    // Get the active sale ID from the appState
    const saleId = appState.selectedSaleId; 

    if (!user || !saleId) {
        return showModal('error', 'Error', 'No user or sale selected. Please close the modal and try again.');
    }

    const expenseData = {
        justification: document.getElementById('direct-expense-justification').value.trim(),
        amount: document.getElementById('direct-expense-amount').value,
        expenseDate: document.getElementById('direct-expense-date').value
    };

    if (!expenseData.justification || !expenseData.amount || !expenseData.expenseDate || Number(expenseData.amount) <= 0) {
        return showModal('error', 'Invalid Input', 'Please provide a valid date, justification, and a positive amount.');
    }

    try {
        ProgressToast.show('Logging Expense...', 'info');
        // Call the new API function we created
        await addDirectSaleExpense(saleId, expenseData, user);
        ProgressToast.showSuccess('Expense logged successfully!');
        
        // Reset the form for the next entry, but keep the modal open
        document.getElementById('log-direct-expense-form').reset();
        // Set the date back to the default
        const expenseDateInput = document.getElementById('direct-expense-date');
        if (expenseDateInput) {
            const saleData = getSalesHistoryDataById(saleId); // Get fresh data to reset date
            const defaultDate = saleData.saleDate ? saleData.saleDate.toDate() : new Date();
            expenseDateInput.value = defaultDate.toISOString().split('T')[0];
        }

    } catch (error) {
        ProgressToast.showError('Failed to log expense.');
        showModal('error', 'Failed to Log Expense', error.message);
    } finally {
        ProgressToast.hide(50);
        closeLogDirectSaleExpenseModal () ;
    }
}







/**
 * Handles all CRUD actions triggered from within the expenses grid.
 */
async function handleExpensesGrid(button, docId, user) {
    // --- SAVE ACTION ---
    if (button.classList.contains('action-btn-save-expense')) {
        // Get the data for the row from our UI helper function
        const expenseData = getExpenseRowData(docId);
        if (!expenseData) return;

        // Validation remains the same
        if (!expenseData.seasonId || !expenseData.expenseType || !expenseData.expenseDate || !expenseData.description || !expenseData.amount) {
            return showModal('error', 'Missing Information', 'Please fill out all required fields before saving.');
        }
        if (expenseData.amount <= 0) {
            return showModal('error', 'Invalid Amount', 'The expense amount must be greater than zero.');
        }

        ProgressToast.show('Saving Expense...', 'info');
        try {
            delete expenseData.isNew; // Remove temporary flag
            await addExpense(expenseData, user);
            ProgressToast.showSuccess('Expense saved successfully!');
        } catch (error) {
            console.error("Error saving new expense:", error);
            ProgressToast.showError('Save failed. Please try again.');
        }
        ProgressToast.hide(300);
    } 
    else if (button.classList.contains('action-btn-upload-existing-receipt')) {
        // Create a temporary file input to trigger the browser's file selector
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,.pdf';
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                ProgressToast.show('Uploading Receipt...', 'info');
                try {
                    await uploadReceiptForExistingExpense(docId, file, user);
                    ProgressToast.showSuccess('Receipt uploaded and linked successfully!');
                    // The real-time listener will automatically update the grid.
                } catch (error) {
                    console.error("Error uploading existing receipt:", error);
                    ProgressToast.showError('Upload failed. Please try again.');
                }
            }
        };
        
        fileInput.click(); // Open the file selection dialog
    }
    // --- CANCEL ACTION ---
    else if (button.classList.contains('action-btn-cancel-expense')) {
        // Call the UI helper function to remove the row
        removeExpenseRow(docId);
    }
    // --- DELETE ACTION ---
    else if (button.classList.contains('action-btn-delete-expense')) {
        const expenseData = getExpenseRowData(docId); // Get data for the confirmation modal
        const confirmed = await showModal('confirm', 'Confirm Deletion', 
            `Are you sure you want to permanently delete this expense?\n\nDescription: "${expenseData.description}"`
        );
        if (confirmed) {
            ProgressToast.show('Deleting Expense...', 'warning');
            try {
                await deleteExpense(docId, expenseData.receiptFileId);
                ProgressToast.showSuccess('Expense deleted.');
            } catch (error) {
                console.error("Error deleting expense:", error);
                ProgressToast.showError('Deletion failed. Please try again.');
            } finally { ProgressToast.hide(300);}
        }
    }
    else if (button.classList.contains('action-btn-approve-expense')) {
        const confirmed = await showModal('confirm', 'Approve Expense', 'Are you sure you want to approve this expense?');
        if (confirmed) {
            ProgressToast.show('Approving Expense...', 'info');
            await processExpense(docId, 'Approved', 'Expense approved.', user);
            ProgressToast.showSuccess('Expense Approved!');
            ProgressToast.hide(300);
            
        }
    }
    else if (button.classList.contains('action-btn-reject-expense')) {
        // Use a prompt-style modal to get the justification
        const justification = prompt("Please provide a reason for rejecting this expense:");
        if (justification) { // Only proceed if the user provides a reason
            ProgressToast.show('Rejecting Expense...', 'warning');
            await processExpense(docId, 'Rejected', justification, user);
            ProgressToast.showSuccess('Expense Rejected.');
            ProgressToast.hide(300);
        }
    }
    else if (button.classList.contains('action-btn-change-receipt')) {
        const expenseData = getExpenseRowData(docId);
        if (!expenseData) return;

        // Create a temporary file input to trigger the browser's file selector
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,.pdf';
        
        fileInput.onchange = async (e) => {
            const newFile = e.target.files[0];
            if (newFile) {
                ProgressToast.show('Replacing Receipt...', 'info');
                try {
                    // Call our new API function to handle the replacement
                    await replaceExpenseReceipt(docId, expenseData, newFile, user);
                    ProgressToast.showSuccess('Receipt replaced successfully!');
                    ProgressToast.hide(300);
                } catch (error) {
                    console.error("Error replacing receipt:", error);
                    ProgressToast.showError('Replacement failed. Please try again.');
                    ProgressToast.hide(300);
                }
            }
        };
        
        fileInput.click(); // Open the file selection dialog
    }





}


async function handleSalesHistoryGrid(button, docId) {

    // --- Action 1: View Sale Details ---
    if (button.classList.contains('action-btn-view-sale')) {
        console.log("Opening view sale details modal for:", docId);
        const saleData = getSalesHistoryDataById(docId); // Assuming you have this helper

        if (saleData) {
            showSalesDetailModal(saleData);
        } else {
            showModal('error', 'Data Not Found', 'Could not find data for the selected sale.');
        }
        return; // Action handled, exit the function
    }

    // --- Action 2: Manage Payments ---
    if (button.classList.contains('action-btn-manage-payments')) {
        console.log("Opening manage payments modal for:", docId);
        const invoiceData = getSalesHistoryDataById(docId);

        if (invoiceData) {
            showRecordSalePaymentModal(invoiceData);
        } else {
            showModal('error', 'Data Not Found', 'Could not find data for the selected invoice.');
        }
        return; // Action handled, exit the function
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
    console.log('[DEBUG] handleStandaloneButtons called with:', {
        target: target,
        targetType: typeof target,
        targetTagName: target?.tagName,
        targetClasses: target?.className,
        eventType: event?.type
    });
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
        '#reject-consignment-btn': () => handleRejectConsignmentClick(),
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
        // ✅ ADD: Payment Management button handlers (following your pattern)
        '#pmt-mgmt-create-supplier-payment': async () => await handlePmtMgmtCreateSupplierPayment(),
        '#pmt-mgmt-pay-all-outstanding': async () => await handlePmtMgmtPayAllOutstanding(),
        '#pmt-mgmt-supplier-refresh': async () => await handlePmtMgmtSupplierRefresh(),
        '#pmt-mgmt-modal-pay-invoice': async () => await handleSupplierPayOutstandingBalanceFromModal(),
        
        // ✅ ADD: Payment Management action button classes
        '.pmt-mgmt-pay-supplier-invoice': async () => await handlePmtMgmtPaySupplierInvoice(target),
        '.pmt-mgmt-view-supplier-invoice': async () => await handlePmtMgmtViewSupplierInvoice(target),
        '.pmt-mgmt-view-payments-history': async () => await handlePmtMgmtViewPaymentHistory(target),

        '.pmt-mgmt-collect-customer-payment': async () => await handlePmtMgmtCollectCustomerPayment(target),
        '.pmt-mgmt-view-sales-invoice': async (target) => await handlePmtMgmtViewSalesInvoice(target),
        '.pmt-mgmt-manage-sales-payments': async (target) => await handlePmtMgmtManageSalesPayments(target),
        '.pmt-mgmt-void-sales-payment': async (target) => await handlePmtMgmtVoidSalesPayment(target),
        
        '.pmt-mgmt-verify-team-payments': async (target) => await handlePmtMgmtVerifyTeamPayments(target),
        '.pmt-mgmt-collect-team-settlement': async (target) => await handlePmtMgmtCollectTeamSettlement(target),
        '.pmt-mgmt-view-consignment-order': async (target) => await handlePmtMgmtViewConsignmentOrder(target),
        '.pmt-mgmt-view-settlement-history': async (target) => await handlePmtMgmtViewSettlementHistory(target),
        '#add-expense-row-btn': () => addNewExpenseRow(),
        '#bulk-purchase-payment-btn': () => handleBulkPaymentClick(),

        '#refresh-executive-dashboard': async () => {
            console.log('[main.js] Executive dashboard manual refresh');
            await loadExecutiveDashboard();
        },
        '#refresh-landing-dashboard': async () => {
            console.log('[main.js] Application dashboard refresh requested');
            await refreshApplicationDashboard(true); // Force refresh
        },

        '#add-expense-row-btn': () => addNewExpenseRow(),
        
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
        },
        '#pmt-mgmt-refresh-actions': async () => {
            console.log('[PmtMgmt] 🔄 Manual action items refresh requested');
            
            ProgressToast.show('Refreshing Action Items', 'info');
            
            try {
                await buildActionRequiredList({ forceRefresh: true });
                ProgressToast.showSuccess('Action items refreshed!');
                setTimeout(() => ProgressToast.hide(300), 800);
                
            } catch (error) {
                console.error('[PmtMgmt] Manual refresh failed:', error);
                ProgressToast.showError('Refresh failed - please try again');
            }
        },
        '.pmt-mgmt-verify-invoice-payments': async (target) => {
            const invoiceId = target.dataset.invoiceId;
            
            console.log(`[main.js] Opening verification modal for invoice: ${invoiceId}`);
            
            if (!invoiceId) {
                await showModal('error', 'Invoice ID Missing', 'Could not find invoice ID for verification.');
                return;
            }

            try {
                ProgressToast.show('Loading Verification Interface', 'info');
                
                // Open the verification modal
                await showSupplierInvoicePaymentVerificationModal(invoiceId);
                
                ProgressToast.hide(300);
                
            } catch (error) {
                console.error('[main.js] Error opening verification modal:', error);
                ProgressToast.showError('Could not open verification modal');
                
                setTimeout(() => {
                    showModal('error', 'Verification Modal Error', 
                        'Could not open payment verification interface. Please try again.'
                    );
                }, 1500);
            }
        },
        '.pmt-mgmt-verification-action': async (target) => {
            console.log('[DEBUG] Verification handler called');

            const actualTarget = arguments[0];

            console.log('[main.js] ✅ Using arguments[0] as target:', actualTarget);
    
            // ✅ NOW THIS WILL WORK:
            const verificationAction = actualTarget.dataset.verificationAction;
            const verificationType = actualTarget.dataset.verificationType;
            
            console.log(`[main.js] ✅ Verification action requested: ${verificationAction}`);
            console.log(`[main.js] ✅ Verification type: ${verificationType}`);
            
                        
            if (!verificationAction) {
                console.error('[main.js] No verification action found');
                await showModal('error', 'Configuration Error', 'Verification action is not configured.');
                return;
            }
            
            switch (verificationAction) {
                case 'verify-supplier-payments':
                    console.log('[main.js] Navigating to supplier payments for verification');
                    switchPaymentMgmtTab('pmt-mgmt-tab-suppliers', 'pmt-mgmt-suppliers-content');
                    
                    // Show helpful guidance
                    setTimeout(() => {
                        showModal('info', 'Supplier Payment Verification', 
                            'Switched to Supplier Payments tab.\n\n' +
                            'You can now:\n' +
                            '✅ Review pending supplier payments\n' +
                            '✅ Click verify buttons on individual payments\n' +
                            '✅ See updated invoice balances after verification'
                        );
                    }, 500);
                    break;
                    
                case 'verify-team-payments':
                    console.log('[main.js] Navigating to team payments for verification');
                    switchPaymentMgmtTab('pmt-mgmt-tab-teams', 'pmt-mgmt-teams-content');
                    
                    setTimeout(() => {
                        showModal('info', 'Team Payment Verification', 
                            'Switched to Team Payments tab.\n\n' +
                            'You can now:\n' +
                            '✅ Review pending team payments\n' +
                            '✅ Click verify buttons on individual payments\n' +
                            '✅ See updated consignment order balances'
                        );
                    }, 500);
                    break;
                    
                case 'review-void-requests':
                    console.log('[main.js] Navigating to sales payments for void review');
                    switchPaymentMgmtTab('pmt-mgmt-tab-sales', 'pmt-mgmt-sales-content');
                    break;
                    
                default:
                    console.warn(`[main.js] Unknown verification action: ${verificationAction}`);
                    showModal('error', 'Unknown Action', 'The requested verification action is not recognized.');
            }
        },
        // VERIFY INDIVIDUAL PAYMENT
        '.pmt-mgmt-verify-payment': async (target) => {
            const paymentId = target.dataset.paymentId;
            const originalInvoiceId = target.dataset.originalInvoiceId;
            
            console.log(`[main.js] Verifying payment: ${paymentId} for invoice: ${originalInvoiceId}`);

            const confirmed = await showModal('confirm', 'Verify Supplier Payment',
                'Are you sure you want to verify this payment?\n\n' +
                'This action will:\n' +
                '✓ Update the invoice balance\n' +  
                '✓ Record the verified payment\n' +  
                '✓ Update supplier account\n\n' +
                'This action cannot be undone.'
            );

            if (confirmed) {
                try {
                    ProgressToast.show('Verifying Payment...', 'info');
                    
                    const verificationModal = document.getElementById('pmt-mgmt-verify-invoice-payments-modal');
                    if (verificationModal) {
                        verificationModal.classList.remove('visible');
                        verificationModal.style.display = 'none';
                        console.log('[main.js] ✅ Closed verification modal');
                    }
                    await verifySupplierPayment(paymentId, appState.currentUser);
                    
                    ProgressToast.updateProgress('Payment verified! Updating displays...', 90);

                    
                    // Refresh verification modal and grids
                     setTimeout(async () => {
                        ProgressToast.showSuccess('Payment verified successfully!');
                        
                        setTimeout(async () => {
                            ProgressToast.hide(300);
                            
                            // ✅ STEP 4: Show success confirmation
                            await showModal('success', 'Payment Verified',
                                'Supplier payment has been verified successfully!\n\n' +
                                '✅ Invoice balance updated\n' +
                                '✅ Payment status changed to verified\n' +
                                '✅ Supplier account updated\n\n' +
                                'The verification interface will refresh with remaining payments.'
                            );
                            
                            // ✅ STEP 5: Refresh the verification modal with updated data
                            setTimeout(async () => {
                                if (originalInvoiceId) {
                                    console.log('[main.js] ✅ Reopening verification modal for invoice:', originalInvoiceId);
                                    
                                    try {
                                        await showSupplierInvoicePaymentVerificationModal(originalInvoiceId);
                                        console.log('[main.js] ✅ Verification modal reopened successfully');
                                    } catch (modalError) {
                                        console.error('[main.js] Error reopening verification modal:', modalError);
                                        
                                        // ✅ FALLBACK: If modal fails to reopen, just refresh the supplier grid
                                        await showModal('info', 'Verification Complete', 
                                            'Payment verified successfully!\n\n' +
                                            'The verification modal cannot be reopened, but the payment has been processed.\n\n' +
                                            'Check the Supplier Payments tab for updated invoice status.'
                                        );
                                    }
                                }
                                
                                // ✅ STEP 6: Always refresh the supplier grid
                                if (typeof loadSupplierInvoicesForMgmtTab === 'function') {
                                    console.log('[main.js] ✅ Refreshing supplier grid with updated data');
                                    await loadSupplierInvoicesForMgmtTab('outstanding', { forceRefresh: true });
                                }
                                
                                // ✅ STEP 7: Refresh dashboard action items
                                if (typeof buildActionRequiredList === 'function') {
                                    console.log('[main.js] ✅ Refreshing action items after verification');
                                    await buildActionRequiredList({ forceRefresh: true });
                                }
                                
                            }, 800);
                            
                        }, 1200);
                        
                    }, 600);

                } catch (error) {
                    console.error('[main.js] Error verifying payment:', error);
                    ProgressToast.showError(`Verification failed: ${error.message}`);
                    
                    setTimeout(async () => {
                        await showModal('error', 'Verification Failed',
                            `Payment verification failed.\n\n` +
                            `Error: ${error.message}\n\n` +
                            'Please try again or check the payment details.'
                        );
                    }, 2000);
                }
            }
        },

        // REJECT INDIVIDUAL PAYMENT
        '.pmt-mgmt-reject-payment': async (target) => {
            const paymentId = target.dataset.paymentId;
            
            console.log(`[main.js] Rejecting payment: ${paymentId}`);

            const confirmed = await showModal('confirm', 'Reject Supplier Payment',
                'Are you sure you want to reject this payment?\n\n' +
                'This action will:\n' +
                '❌ Mark the payment as rejected\n' +
                '❌ Notify the submitter\n' +
                '❌ Remove from pending verification\n\n' +
                'The payment can be resubmitted if needed.'
            );

            if (confirmed) {
                try {
                    ProgressToast.show('Rejecting Payment...', 'warning');
                    
                    await rejectSupplierPayment(paymentId, appState.currentUser);
                    
                    ProgressToast.showSuccess('Payment rejected');

                    // Refresh verification modal
                    setTimeout(() => {
                        document.getElementById('pmt-mgmt-verify-invoice-payments-modal').style.display = 'none';
                        
                        setTimeout(async () => {
                            const originalInvoiceId = target.dataset.originalInvoiceId;
                            if (originalInvoiceId) {
                                await showSupplierInvoicePaymentVerificationModal(originalInvoiceId);
                            }
                        }, 300);
                    }, 800);

                } catch (error) {
                    console.error('[main.js] Error rejecting payment:', error);
                    ProgressToast.showError(`Rejection failed: ${error.message}`);
                }
            }
        },

        // BULK VERIFY ALL SELECTED
        '#verify-all-payments-btn': async () => {
            console.log('[main.js] Bulk verifying payments...');
            
            const selectedPayments = [];
            
            if (pmtMgmtPendingPaymentsGridApi) {
                pmtMgmtPendingPaymentsGridApi.getSelectedNodes().forEach(node => {
                    if (node.data) {
                        selectedPayments.push(node.data);
                    }
                });
            }

            if (selectedPayments.length === 0) {
                await showModal('info', 'No Payments Selected', 
                    'Please select payments to verify using the checkboxes.');
                return;
            }

            const totalAmount = selectedPayments.reduce((sum, payment) => sum + (payment.paymentAmount || 0), 0);

            const confirmed = await showModal('confirm', 'Bulk Payment Verification',
                `Verify ${selectedPayments.length} selected payments?\n\n` +
                `Total amount: ${formatCurrency(totalAmount)}\n\n` +
                `This will:\n` +
                `✓ Update all related invoice balances\n` +
                `✓ Mark all payments as verified\n` +  
                `✓ Notify all submitters`
            );

            if (confirmed) {
                try {
                    ProgressToast.show('Bulk Verifying Payments...', 'info');

                    // Process each payment individually for safety
                    for (const payment of selectedPayments) {
                        await verifySupplierPayment(payment.id, appState.currentUser);
                    }

                    ProgressToast.showSuccess(`Bulk verification complete: ${selectedPayments.length} payments verified, ${formatCurrency(totalAmount)} processed`);

                    // Close modal and refresh
                    setTimeout(() => {
                        document.getElementById('pmt-mgmt-verify-invoice-payments-modal').style.display = 'none';
                        
                        setTimeout(async () => {
                            // Refresh action required and supplier grid
                            await buildActionRequiredList();
                            if (typeof loadSupplierInvoicesForMgmtTab === 'function') {
                                await loadSupplierInvoicesForMgmtTab('outstanding', { forceRefresh: true });
                            }
                        }, 300);
                    }, 1000);

                } catch (error) {
                    console.error('[main.js] Error in bulk verification:', error);
                    ProgressToast.showError(`Bulk verification failed: ${error.message}`);
                }
            }
        },
         // Dispatch a custom event. to export the consigment order grid to excel
        '#export-consignment-orders-excel': () => {
            console.log('[main.js] Export requested. Dispatching event: exportConsignmentGrid');
             exportConsignmentOrders();
        },
        '#export-sales-orders-excel-btn': () => {
            console.log('[main.js] Export requested. Dispatching event: exportSalesOrderHistory');
             exportSalesOrderHistory();
        },
        '#export-sales-catalogues-excel-btn': () => {
            console.log('[main.js] Export requested. Dispatching event: exportAllCataloguesToMultiSheetExcel();');
             exportAllCataloguesToMultiSheetExcel();
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

    if (target.closest('#financial-health-modal .modal-close-trigger')) {
        const modal = document.getElementById('financial-health-modal');
        if (modal) {
            modal.classList.remove('visible');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        return true;
    }

    // Check all button handlers
    /*for (const [selector, handler] of Object.entries(buttonHandlers)) {
        if (target.closest(selector)) {
            handler();
            return true;
        }
    }*/

    // ✅ CRITICAL FIX: Pass target parameter to all handlers
    for (const [selector, handler] of Object.entries(buttonHandlers)) {
        if (target.closest(selector)) {
            handler(target); // ✅ NOW PASSES TARGET TO ALL HANDLERS
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

   if (target.closest('#pmt-mgmt-supplier-invoice-modal .modal-close-trigger')) {
        closeSupplierInvoiceDetailsModal();
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


function handleAddToCartBKP(target) {
    console.log('[main.js] handleAddToCart called');
    
    // Find the button element (in case SVG was clicked)
    const buttonElement = target.closest('button[data-id]') || target;
    if (!buttonElement) {
        console.error('[main.js] Could not find product button with data.');
        return;
    }
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

function handleAddToCart(target) {
    console.log('[main.js] handleAddToCart called');
    
    // Find the button element that was clicked
    const buttonElement = target.closest('button[data-product]');
    if (!buttonElement) {
        console.error('[main.js] Could not find product button with data.');
        return;
    }

    try {
        // ✅ THE FIX:
        // 1. Get the JSON string from the 'data-product' attribute.
        const productDataString = buttonElement.dataset.product;
        
        // 2. Parse the JSON string back into a complete product object.
        //    This 'product' object now contains the CORRECT catalogue price.
        const product = JSON.parse(productDataString);
        console.log('[main.js] Found product from data attribute:', product);

        // 3. Check for stock (this is good practice).
        if ((product.inventoryCount || 0) <= 0) {
            showModal('error', 'Out of Stock', `"${product.itemName}" is currently out of stock.`);
            return; // Stay in the modal to let the user choose another item.
        }

        // 4. Create the new cart item using the CORRECT data from the parsed object.
        const newItem = {
            productId: product.id,
            productName: product.itemName,
            quantity: 1,
            // Use the correct sellingPrice from the parsed object
            unitPrice: product.sellingPrice || 0,
            costPrice: product.costPrice || 0, // Pass the cost price for P&L reporting
            discountPercentage: 0,
            taxPercentage: 0
        };
        
        console.log('[main.js] Adding item to cart:', newItem);
        addItemToCart(newItem); // Your existing function to add to the shopping cart grid
        
        // Give user feedback without closing the modal
        ProgressToast.show(`Added "${product.itemName}"`, 'success', 1500);
        

    } catch (error) {
        console.error('[main.js] Failed to parse product data from button:', error);
        showModal('error', 'Error', 'Could not add product due to a data error.');
        closeAddProductModal(); // Close modal on critical error
    } finally {ProgressToast.hide(300) ;}
    // Do not close the modal on success, so the user can add more items.
    // closeAddProductModal(); 
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
        { id: 'add-event-form', handler: handleEventSubmit },
        { id: 'bulk-supplier-payment-form', handler: handleBulkSupplierPaymentSubmit },
        { id: 'log-expense-form', handler: handleLogExpenseSubmit },
        { id: 'log-direct-expense-form', handler: handleLogDirectSaleExpenseSubmit }
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

            await refreshPaymentManagementAfterSupplierPayment();

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
 * ENHANCED: Refresh payment management after supplier payment operations
 */
async function refreshPaymentManagementAfterSupplierPayment() {
    try {
        // Check if payment management view is currently active
        const paymentMgmtView = document.getElementById('pmt-mgmt-view');
        const isPaymentMgmtActive = paymentMgmtView && paymentMgmtView.classList.contains('active');
        
        if (isPaymentMgmtActive) {
            console.log('[main.js] 🔄 Payment Management is active, refreshing after supplier payment...');
            
            // ✅ COMPREHENSIVE REFRESH: Clear cache and reload all data
            if (typeof clearPaymentMgmtCache === 'function') {
                clearPaymentMgmtCache();
                console.log('[main.js] Cleared payment management cache');
            }
            
            // ✅ DASHBOARD REFRESH: Update summary cards and action items
            if (typeof refreshPaymentManagementDashboard === 'function') {
                await refreshPaymentManagementDashboard();
                console.log('[main.js] Refreshed payment management dashboard');
            }
            
            // ✅ SUPPLIER TAB REFRESH: Reload supplier invoices grid
            const supplierTab = document.getElementById('pmt-mgmt-suppliers-content');
            if (supplierTab && supplierTab.classList.contains('active')) {
                console.log('[main.js] Supplier tab is active, refreshing supplier invoices...');
                
                // Force reload supplier invoices
                if (typeof loadSupplierInvoicesForMgmtTab === 'function') {
                    await loadSupplierInvoicesForMgmtTab('outstanding', { forceRefresh: true });
                }
            }
            
            // ✅ USER FEEDBACK: Let user know data was refreshed
            setTimeout(() => {
                ProgressToast.show('Payment Management Updated', 'success');
                ProgressToast.updateProgress('Dashboard and grids refreshed with latest data', 100);
                
                setTimeout(() => {
                    ProgressToast.hide(800);
                }, 1200);
            }, 1000);
            
        } else {
            console.log('[main.js] Payment Management not active, skipping refresh');
        }
        
    } catch (error) {
        console.error('[main.js] Error refreshing payment management:', error);
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
            creditTerm: document.getElementById('creditTerm-select').value,
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

        if (teamName.length > 500) {
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

        // Determine which dropdown to use based on the user's role
        const teamSelectId = (user.role === 'admin') ? 'admin-select-team' : 'user-select-team';
        const teamSelect = document.getElementById(teamSelectId);

        if (!teamSelect || !teamSelect.value) {
            ProgressToast.hide(0);
            return showModal('error', 'No Team Selected', 'Please select a team for this request.');
        }

        const teamId = teamSelect.value;
        const teamName = teamSelect.options[teamSelect.selectedIndex].text;

        // --- Step 2: Find the Authoritative Team Lead for the Selected Team ---
        ProgressToast.updateProgress('Identifying team lead...', 30, 'Step 2 of 7');

        // We need to fetch the members of this team to find the lead.
        // This requires an API call.
        const members = await getMembersForTeam(teamId);
        const teamLead = members.find(m => m.role === 'Team Lead');

        if (!teamLead) {
            ProgressToast.hide(0);
            return showModal('error', 'No Team Lead Found', `The selected team "${teamName}" does not have a designated Team Lead. Please assign one in the Team Management module.`);
        }

        const requestingMemberId = teamLead.id; // The member's document ID in the sub-collection
        const requestingMemberName = teamLead.name;
        const requestingMemberEmail = teamLead.email;

        console.log(`[main.js] Request will be created for Team: "${teamName}", authoritative Lead: "${requestingMemberName}"`);

        // --- Step 3: Validate Other Form Fields ---
        ProgressToast.updateProgress('Validating request details...', 45, 'Step 3 of 7');

        const catalogueSelect = document.getElementById('request-catalogue-select');
        const eventSelect = document.getElementById('request-event-select');

        const manualVoucherNumber = document.getElementById('consignment-voucher-number').value.trim();

        if (!catalogueSelect.value) {
            ProgressToast.hide(0);
            return showModal('error', 'No Catalogue Selected', 'Please select a sales catalogue for this consignment request.');
        }
        if (!manualVoucherNumber) {
            ProgressToast.hide(0);
            return showModal('error', 'Voucher Number Required', 'Please enter a manual voucher number for this request.');
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
            requestingMemberEmail,
            manualVoucherNumber: manualVoucherNumber
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
    if (!user) {
        // Use your modal system for better feedback
        return showModal('error', 'Not Logged In', 'You must be logged in to report activity.');
    }

    // --- Step 1: Gather and Validate Form Data ---
    const orderId = document.getElementById('activity-order-id').value;
    const productSelect = document.getElementById('activity-product-select');
    const productValue = productSelect.value;
    const activityType = document.getElementById('activity-type-select').value;
    const quantity = parseInt(document.getElementById('activity-quantity-input').value, 10);
    const notes = document.getElementById('activity-notes-input').value;
    const salesEventId = document.getElementById('activity-event-select').value || null;

    if (!orderId || !productValue) {
        return showModal('error', 'Missing Information', 'Missing order or product information. Please close the modal and try again.');
    }
    if (!activityType) {
        return showModal('error', 'Missing Information', 'Please select an activity type (Sale, Return, or Damage).');
    }
    if (!quantity || quantity <= 0) {
        return showModal('error', 'Invalid Quantity', 'Please enter a valid quantity greater than zero.');
    }

    // Safely parse the product data from the dropdown
    const { itemId, productId, sellingPrice } = JSON.parse(productValue);
    const productName = productSelect.options[productSelect.selectedIndex].text.split(' (')[0]; // Get clean product name

    // --- Step 2: Start the Operation with User Feedback ---
    ProgressToast.show('Logging Consignment Activity', 'info');

    try {
        ProgressToast.updateProgress('Preparing activity data...', 30, 'Step 1 of 3');

        // ✅ REFACTORED: Assemble the single activityData object for the new API signature
        const activityData = {
            orderId,
            itemId,
            productId,
            productName,
            activityType,
            quantityDelta: quantity, // The API expects the change amount
            sellingPrice,
            notes,
            salesEventId: activityType === 'Sale' ? salesEventId : null,
            correctionDetails: null // This is not a correction, so it's null
        };

        ProgressToast.updateProgress('Saving to database & updating totals...', 70, 'Step 2 of 3');

        // ✅ REFACTORED: Call the updated, single-argument API function
        await logActivityAndUpdateConsignment(activityData, user);

        ProgressToast.showSuccess('Activity logged successfully!');

        // --- Step 3: Final Confirmation ---
        setTimeout(() => {
            ProgressToast.hide(500); // Hide toast quickly
            closeReportActivityModal();
            showModal('success', 'Activity Logged', 
                `Successfully logged ${quantity} unit(s) of "${productName}" as a ${activityType}.\n\nThe consignment order's totals have been updated.`
            );
        }, 1200);

    } catch (error) {
        console.error("Error logging activity:", error);
        // Use the toast to show a concise error, then a modal for details
        ProgressToast.showError(`Failed to log activity: ${error.message}`);
        setTimeout(() => {
            showModal('error', 'Logging Failed', 
                `The activity could not be logged. Please check the details and try again.\n\n` +
                `Common Reason: The quantity reported may exceed the available items on hand for this consignment.\n\n` +
                `Error: ${error.message}`
            );
        }, 2000);
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
        const selectedSaleType = document.getElementById('sale-type-select').value;


        // Validate required customer fields
        if (!customerName) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Customer Name', 'Please enter the customer\'s name.');
            return;
        }

        

        if (!selectedStore) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Store', 'Please select which store location for this sale.');
            return;
        }

        if (!selectedSaleType) {
            ProgressToast.hide(0);
            await showModal('error', 'Missing Sales Type', 'Please enter the Sales type.');
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
                 ProgressToast.hide(500);
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
                ProgressToast.hide(500); 
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

         ProgressToast.show('Processing Sale Transaction', 'info');
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
            saleType:selectedSaleType,
            
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
    } finally {ProgressToast.hide(800);}
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

        let invoiceData = null;
        
        invoiceData = getSalesHistoryDataById(invoiceId);

        if (!invoiceData) {
            console.log('[main.js] 🔍 Invoice not found in Sales History grid, trying API...');
            
            // Method 2: Get directly from database (Payment Management module)
            try {
                invoiceData = await getSalesInvoiceById(invoiceId);
                console.log('[main.js] ✅ Invoice data retrieved from API:', invoiceData?.saleId);
            } catch (apiError) {
                console.error('[main.js] API call failed:', apiError);
            }
        } else {
            console.log('[main.js] ✅ Invoice data found in Sales History grid:', invoiceData.saleId);
        }

        // ✅ VALIDATION: Ensure we have invoice data from either source
        if (!invoiceData) {
            ProgressToast.hide(0);
            await showModal('error', 'Invoice Data Not Available', 
                `Cannot find invoice data for payment processing.\n\n` +
                `Invoice ID: ${invoiceId}\n\n` +
                `This can happen when:\n` +
                `• Invoice was opened from Payment Management (not Sales Management)\n` +
                `• Invoice was recently deleted or modified\n` +
                `• Network connectivity issues\n\n` +
                `Solutions:\n` +
                `1. Close this modal and try again\n` +
                `2. Use Sales Management → Manage Payments instead\n` +
                `3. Refresh the page and try again`
            );
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
            ProgressToast.hide(300);
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
            ProgressToast.show('Update Payments and Donation', 'info');
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

    document.addEventListener('expenseUpdated', e => {
        handleExpenseUpdate(e.detail);
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

    const executivePeriodSelector = document.getElementById('executive-dashboard-period');
    if (executivePeriodSelector) {
        executivePeriodSelector.addEventListener('change', async (e) => {
            const newPeriod = parseInt(e.target.value);
            console.log(`[main.js] Executive dashboard period changed to ${newPeriod} days`);
            await loadExecutiveDashboard();
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
 * ENHANCED: Handle view supplier invoice details
 */
async function handlePmtMgmtViewSupplierInvoice(target) {
    const invoiceId = target.dataset.id;
    
    console.log(`[main.js] View supplier invoice: ${invoiceId}`);

    if (!invoiceId) {
        await showModal('error', 'Invalid Invoice', 'Invoice ID not found. Please refresh and try again.');
        return;
    }
    
    /*const invoiceData = getSupplierInvoiceFromPmtMgmtGrid(invoiceId);
    
    if (invoiceData) {
        await showModal('info', 'Supplier Invoice Details', 
            `📋 SUPPLIER INVOICE DETAILS\n\n` +
            `INVOICE INFORMATION:\n` +
            `• System Invoice ID: ${invoiceData.invoiceId}\n` +
            `• Supplier Invoice #: ${invoiceData.supplierInvoiceNo || 'Not Provided'}\n` +
            `• Supplier: ${invoiceData.supplierName}\n` +
            `• Purchase Date: ${invoiceData.formattedDate || 'Unknown'}\n\n` +
            `FINANCIAL SUMMARY:\n` +
            `• Invoice Total: ${formatCurrency(invoiceData.invoiceTotal || 0)}\n` +
            `• Amount Paid: ${formatCurrency(invoiceData.amountPaid || 0)}\n` +
            `• Balance Due: ${formatCurrency(invoiceData.balanceDue || 0)}\n` +
            `• Payment Status: ${invoiceData.paymentStatus}\n\n` +
            `PAYMENT PRIORITY:\n` +
            `• Days Outstanding: ${invoiceData.daysOutstanding || 0} days\n` +
            `• Urgency Level: ${invoiceData.urgencyLevel || 'Normal'}\n` +
            `• Priority Reason: ${invoiceData.urgencyReason || 'Standard timeline'}`
        );
    } else {
        await showModal('error', 'Invoice Not Found', 'Invoice details are not available.');
    }*/

    try {
        // ✅ ENHANCED: Show detailed modal instead of simple text modal
        await showSupplierInvoiceDetailsModal(invoiceId);
        
    } catch (error) {
        console.error('[main.js] Error opening invoice details modal:', error);
        await showModal('error', 'Modal Error', 'Could not open invoice details. Please try again.');
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
 * Handle create supplier payment
 */
async function handlePmtMgmtCreateSupplierPayment() {
    console.log('[main.js] Create new supplier payment');
    
    // ✅ OPTIONS: Give user choice (following your pattern)
    const choice = await showModal('confirm', 'Create Supplier Payment', 
        'How would you like to create a supplier payment?\n\n' +
        '📋 PAY EXISTING INVOICE:\n' +
        'Select from outstanding invoices shown in the grid\n\n' +
        '💰 DIRECT PAYMENT:\n' +
        'Go to Purchase Management for full invoice selection\n\n' +
        'Which option would you prefer?',
        [
            { text: 'Use Grid Invoices', value: 'grid' },
            { text: 'Go to Purchase Mgmt', value: 'purchase' },
            { text: 'Cancel', value: 'cancel' }
        ]
    );
    
    if (choice === 'purchase') {
        // ✅ ROUTE: To existing purchase management (your proven workflow)
        showPurchasesView();
        await showModal('info', 'Navigation', 
            'Switched to Purchase Management where you can:\n\n' +
            '1. Select any supplier invoice\n' +
            '2. Click the payment button\n' +
            '3. Complete payment process\n\n' +
            'Return to Payment Management to see updated status.'
        );
    } else if (choice === 'grid') {
        await showModal('info', 'Grid-Based Payment', 
            'Use the PAY buttons in the Outstanding Invoices grid below.\n\n' +
            'Each PAY button will open the payment form for that specific invoice.'
        );
    }
}

/**
 * Handle pay all outstanding (future bulk feature)
 */
async function handlePmtMgmtPayAllOutstanding() {
    console.log('[main.js] Pay all outstanding invoices');
    
    await showModal('info', 'Bulk Payment Feature', 
        'Bulk payment processing will be implemented in a future update.\n\n' +
        'For now, please use individual PAY buttons for each invoice.'
    );
}

/**
 * Handle supplier tab refresh
 */

async function handlePmtMgmtSupplierRefresh() {
    console.log('[main.js] Refresh supplier payments tab');
    
    try {
        // ✅ CLEAR CACHE: Force fresh data
        if (typeof clearPaymentMgmtCache === 'function') {
            clearPaymentMgmtCache();
        }
        
        // ✅ RELOAD: Supplier tab data
        if (typeof refreshPaymentManagementDashboard === 'function') {
            await refreshPaymentManagementDashboard();
        }
        
        await showModal('success', 'Data Refreshed', 'Supplier payment data has been refreshed with the latest information.');
        
    } catch (error) {
        console.error('[main.js] Error refreshing supplier data:', error);
        await showModal('error', 'Refresh Failed', 'Could not refresh supplier data. Please try again.');
    }
}


// ===================================================================
// PAYMENT MANAGEMENT GRID HANDLERS (following your pattern)
// ===================================================================

/**
 * ENHANCED: Handle payment management supplier grid actions
 */
async function handlePmtMgmtSupplierGrid(button, docId, user) {
    console.log(`[main.js] Payment management supplier grid action:`, {
        action: button.className,
        invoiceId: docId,
        user: user.email
    });
    
    // ✅ ROUTE: Payment management actions to handlers
    if (button.classList.contains('pmt-mgmt-pay-supplier-invoice')) {
        await handlePmtMgmtPaySupplierInvoice(button);
    } else if (button.classList.contains('pmt-mgmt-view-supplier-invoice')) {
        await handlePmtMgmtViewSupplierInvoice(button);
    } else if (button.classList.contains('pmt-mgmt-view-payments-history')) {
        await handlePmtMgmtViewPaymentHistory(button);
    } else {
        console.warn('[main.js] Unknown payment management supplier action:', button.className);
    }
}

// ===================================================================
// PAYMENT MANAGEMENT: SUPPLIER ACTIONS
// ===================================================================

/**
 * Handle pay supplier invoice from payment management  
 */
async function handlePmtMgmtPaySupplierInvoice(target) {
    const invoiceId = target.dataset.id;
    const user = appState.currentUser;
    
    if (!user || !invoiceId) return;
    
    console.log(`[main.js] Pay supplier invoice: ${invoiceId}`);
    
    try {
        // ✅ GET INVOICE DATA: From payment management grid
        const invoiceData = getSupplierInvoiceFromPmtMgmtGrid(invoiceId);
        
        if (!invoiceData) {
            await showModal('error', 'Invoice Data Error', 'Could not find invoice data. Please refresh and try again.');
            return;
        }
        
        const balanceDue = invoiceData.balanceDue || 0;
        
        // ✅ CONFIRMATION: Following your pattern
        const confirmed = await showModal('confirm', 'Pay Supplier Invoice', 
            `Pay outstanding balance for this supplier invoice?\n\n` +
            `• Supplier: ${invoiceData.supplierName}\n` +
            `• Invoice: ${invoiceData.supplierInvoiceNo || invoiceData.invoiceId}\n` +
            `• Balance Due: ${formatCurrency(balanceDue)}\n\n` +
            `This will open the supplier payment form.`
        );
        
        if (confirmed) {
            // ✅ REUSE: Existing supplier payment modal (your proven code)
            showSupplierPaymentModal({
                id: invoiceId,
                invoiceId: invoiceData.invoiceId,
                supplierName: invoiceData.supplierName,
                balanceDue: balanceDue,
                invoiceTotal: invoiceData.invoiceTotal || 0,
                supplierId: invoiceData.supplierId
            });
        }
        
    } catch (error) {
        console.error('[main.js] Error paying supplier invoice:', error);
        await showModal('error', 'Payment Error', 'Failed to initiate supplier payment. Please try again.');
    }
}



// ===================================================================
// HELPER FUNCTIONS (following your pattern)
// ===================================================================

/**
 * Get supplier invoice data from payment management grid
 */
function getSupplierInvoiceFromPmtMgmtGrid(invoiceId) {
    // ✅ DELEGATE: Get data from payment management module
    return getSupplierInvoiceFromMgmtGrid ? getSupplierInvoiceFromMgmtGrid(invoiceId) : null;
}



/**
 * BUSINESS LOGIC: Handle pay outstanding balance from supplier invoice modal
 */
async function handleSupplierPayOutstandingBalanceFromModal() {
    console.log('[main.js] 💰 Pay outstanding balance with smooth transition');
    
    const payButton = document.getElementById('pmt-mgmt-modal-pay-invoice');
    const invoiceId = payButton?.dataset?.invoiceId;
    const balanceDue = parseFloat(payButton?.dataset?.balanceDue || 0);
    
    if (!invoiceId || balanceDue <= 0) {
        await showModal('error', 'Invalid Payment Data', 'Payment information is not available.');
        return;
    }

    try {
        // ✅ USER FEEDBACK: Show what's happening
        ProgressToast.show('Preparing Supplier Payment', 'info');
        ProgressToast.updateProgress('Closing invoice details and opening payment form...', 50);
        
        // ✅ SMOOTH TRANSITION: Close → Wait → Open → Update
        console.log('[main.js] Step 1: Closing invoice details modal...');
        closeSupplierInvoiceDetailsModal();
        
        // Wait for close animation
        setTimeout(() => {
            console.log('[main.js] Step 2: Invoice modal closed, opening payment modal...');
            ProgressToast.updateProgress('Opening supplier payment form...', 80);
            
            // Get invoice data before opening payment modal
            const invoiceData = getSupplierInvoiceFromMgmtGrid(invoiceId);
            
            if (invoiceData) {
                // Open payment modal with context
                const target = { 
                    dataset: { 
                        id: invoiceId,
                        supplierName: invoiceData.supplierName,
                        balanceDue: balanceDue.toFixed(2)
                    } 
                };
                
                handlePmtMgmtPaySupplierInvoice(target);
                
                ProgressToast.updateProgress('Payment form ready!', 100);
                
                setTimeout(() => {
                    ProgressToast.hide(300);
                }, 500);
                
            } else {
                ProgressToast.showError('Could not load invoice data for payment');
            }
            
        }, 400); // Match modal close animation duration

    } catch (error) {
        console.error('[main.js] Error in smooth payment transition:', error);
        ProgressToast.showError('Failed to open payment form');
    }
}


// ===================================================================
// SALES PAYMENT ACTION HANDLERS 
// ===================================================================

/**
 * ENHANCED: Handle collect customer payment action from Payment Management
 */
async function handlePmtMgmtCollectCustomerPayment(target) {
    console.log('[main.js] 💳 Collect customer payment handler called');
    
    // ✅ FIX: Find the actual button element (not the span inside it)
    const actualTarget = arguments[0];
    console.log('[main.js] 🔍 Raw target:', actualTarget);
    console.log('[main.js] 🔍 Raw target tagName:', actualTarget?.tagName);
    
    // ✅ CRITICAL: Find the button element that contains the data-id
    const buttonElement = actualTarget.closest('button') || actualTarget;
    console.log('[main.js] 🔍 Button element found:', buttonElement);
    console.log('[main.js] 🔍 Button tagName:', buttonElement?.tagName);
    console.log('[main.js] 🔍 Button classes:', buttonElement?.className);
    console.log('[main.js] 🔍 Button dataset:', buttonElement?.dataset);
    
    const invoiceId = buttonElement?.dataset?.id;
    const customerName = buttonElement?.dataset?.customerName;
    const balanceDue = buttonElement?.dataset?.balanceDue;
    const user = appState.currentUser;
    
    console.log('[main.js] 🔍 Extracted data from button:');
    console.log('  Invoice ID:', invoiceId);
    console.log('  Customer:', customerName);
    console.log('  Balance Due:', balanceDue);
    console.log('  User:', user?.email);
    
    if (!user) {
        await showModal('error', 'Authentication Required', 'You must be logged in to collect payments.');
        return;
    }
    
    if (!invoiceId) {
        console.error('[main.js] ❌ No invoice ID found in button dataset');
        console.log('[main.js] 🔍 Button HTML:', buttonElement?.outerHTML);
        
        await showModal('error', 'Invoice ID Missing', 
            'Could not find invoice ID in button data.\n\n' +
            `Button found: ${buttonElement?.tagName}\n` +
            `Dataset keys: ${Object.keys(buttonElement?.dataset || {}).join(', ')}\n\n` +
            'This is a grid configuration issue. Please refresh and try again.'
        );
        return;
    }
    
    console.log(`[main.js] ✅ Processing payment collection for invoice: ${invoiceId}`);
    
    try {
        ProgressToast.show('Loading Customer Invoice', 'info');
        ProgressToast.updateProgress('Retrieving invoice details...', 60);
        
        const invoiceData = await getSalesInvoiceById(invoiceId);
        
        if (!invoiceData) {
            ProgressToast.hide(0);
            await showModal('error', 'Invoice Not Found', `Could not find sales invoice: ${invoiceId}`);
            return;
        }
        
        const actualBalanceDue = invoiceData.balanceDue || 0;
        
        if (actualBalanceDue <= 0) {
            ProgressToast.hide(0);
            await showModal('info', 'Invoice Fully Paid', 
                `This invoice has already been paid in full!\n\n` +
                `• Customer: ${invoiceData.customerInfo?.name}\n` +
                `• Invoice: ${invoiceData.saleId}\n` +
                `• Status: ${invoiceData.paymentStatus}`
            );
            return;
        }
        
        ProgressToast.updateProgress('Opening payment collection modal...', 90);
        
        setTimeout(() => {
            ProgressToast.hide(300);
            
            // ✅ OPEN: Customer payment collection modal
            showRecordSalePaymentModal(invoiceData);
            
            console.log(`[main.js] ✅ Payment collection modal opened for ${invoiceData.customerInfo?.name} - ${formatCurrency(actualBalanceDue)}`);
        }, 500);
        
    } catch (error) {
        console.error('[main.js] Error in payment collection:', error);
        ProgressToast.showError(`Payment collection failed: ${error.message}`);
        
        setTimeout(() => {
            showModal('error', 'Payment Collection Error',
                `Failed to open payment collection interface.\n\n` +
                `Invoice ID: ${invoiceId}\n` +
                `Error: ${error.message}`
            );
        }, 2000);
    }
}

/**
 * ENHANCED: Handle view sales invoice details from Payment Management
 */
async function handlePmtMgmtViewSalesInvoice(target) {
    console.log('[main.js] 📋 View sales invoice handler called');
    
    // ✅ FIX: Find button element from any clicked child element
    const actualTarget = arguments[0];
    const buttonElement = actualTarget.closest('button') || actualTarget;
    
    console.log('[main.js] 🔍 Button element for view:', buttonElement);
    
    const invoiceId = buttonElement?.dataset?.id;
    
    if (!invoiceId) {
        await showModal('error', 'Invoice ID Missing', 'Could not find invoice ID for details view.');
        return;
    }
    
    console.log(`[main.js] 📋 Opening invoice details for: ${invoiceId}`);
    
    try {
        ProgressToast.show('Loading Invoice Details', 'info');
        
        const invoiceData = await getSalesInvoiceById(invoiceId);
        
        if (invoiceData) {
            ProgressToast.hide(300);
            
            showRecordSalePaymentModal(invoiceData);
            
            // ✅ SWITCH: To payment history for view mode
            setTimeout(() => {
                switchPaymentModalTab('tab-payment-history');
                console.log('[main.js] ✅ Switched to payment history view');
            }, 500);
            
        } else {
            ProgressToast.hide(0);
            await showModal('error', 'Invoice Not Found', 'Could not find the sales invoice details.');
        }
        
    } catch (error) {
        console.error('[main.js] Error viewing sales invoice:', error);
        ProgressToast.showError('Could not load invoice details');
    }
}

/**
 * ENHANCED: Handle manage sales payments (for paid invoices)
 */
async function handlePmtMgmtManageSalesPayments(target) {
    const invoiceId = target.dataset.id;
    
    console.log(`[main.js] 💰 Manage payments for sales invoice: ${invoiceId}`);
    
    try {
        const invoiceData = await getSalesInvoiceById(invoiceId);
        
        if (invoiceData) {
            // ✅ REUSE: Existing payment management modal
            showRecordSalePaymentModal(invoiceData);
            
            // ✅ DEFAULT: Switch to payment history for management
            setTimeout(() => {
                switchPaymentModalTab('tab-payment-history');
            }, 500);
        }
        
    } catch (error) {
        console.error('[main.js] Error managing sales payments:', error);
        await showModal('error', 'Payment Management Error', 'Could not open payment management interface.');
    }
}

/**
 * ENHANCED: Handle void sales payment (admin only)
 */
async function handlePmtMgmtVoidSalesPayment(target) {
    const paymentId = target.dataset.id;
    const user = appState.currentUser;
    
    if (!user || user.role !== 'admin') {
        await showModal('error', 'Permission Denied', 'Only administrators can void sales payments.');
        return;
    }
    
    console.log(`[main.js] ❌ Void sales payment: ${paymentId}`);
    
    try {
        // ✅ GET: Payment data for confirmation
        const paymentData = getSalesPaymentDataFromGridById(paymentId);
        
        if (!paymentData) {
            await showModal('error', 'Payment Not Found', 'Could not find payment data for void operation.');
            return;
        }
        
        const confirmed = await showModal('confirm', 'Void Customer Payment',
            `VOID this customer payment?\n\n` +
            `• Customer: ${paymentData.customerName || 'Unknown'}\n` +
            `• Amount: ${formatCurrency(paymentData.amountPaid || 0)}\n` +
            `• Payment Mode: ${paymentData.paymentMode || 'Unknown'}\n\n` +
            `This will:\n` +
            `❌ Create a reversal entry\n` +
            `❌ Update the invoice balance\n` +
            `❌ Cannot be undone\n\n` +
            `Are you sure you want to void this payment?`
        );

        if (confirmed) {
            ProgressToast.show('Voiding Customer Payment', 'warning');
            
            try {
                ProgressToast.updateProgress('Creating void entries and updating invoice...', 75);
                
                await voidSalePayment(paymentId, user);
                
                ProgressToast.showSuccess('Customer payment voided successfully!');
                
                setTimeout(async () => {
                    ProgressToast.hide(500);
                    
                    await showModal('success', 'Payment Voided', 
                        `Customer payment has been voided successfully!\n\n` +
                        `✓ Original payment marked as VOIDED\n` +
                        `✓ Reversal entry created for audit trail\n` +
                        `✓ Invoice balance updated accordingly\n\n` +
                        `The sales grids will refresh to show the changes.`
                    );
                    
                    // ✅ REFRESH: Sales payment grid to show void entries
                    setTimeout(() => {
                        loadSalesPaymentsForMgmtTab('payments', { forceRefresh: true });
                    }, 1000);
                    
                }, 1000);
                
            } catch (voidError) {
                ProgressToast.showError(`Void failed: ${voidError.message}`);
                setTimeout(() => {
                    showModal('error', 'Void Failed', `Could not void the payment: ${voidError.message}`);
                }, 2000);
            }
        }
        
    } catch (error) {
        console.error('[main.js] Error in void sales payment:', error);
        await showModal('error', 'Void Error', 'Could not process payment void request.');
    }
}


// ===================================================================
// TEAM PAYMENT ACTION HANDLERS (Add to main.js)
// ===================================================================

/**
 * ENHANCED: Handle team payment verification for consignment orders
 */
async function handlePmtMgmtVerifyTeamPayments(target) {
    console.log('[main.js] 👥 Team payment verification handler called');
    
    // ✅ FIX: Find the actual button element (not the span inside it)
    const actualTarget = arguments[0];
    const buttonElement = actualTarget.closest('button') || actualTarget;
    
    console.log('[main.js] 🔍 Button element found:', buttonElement);
    console.log('[main.js] 🔍 Button dataset:', buttonElement?.dataset);
    
    const orderId = buttonElement?.dataset?.orderId;
    const teamName = buttonElement?.dataset?.teamName;
    const user = appState.currentUser;
    
    console.log('[main.js] 🔍 Extracted data from button:');
    console.log('  Order ID:', orderId);
    console.log('  Team Name:', teamName);
    console.log('  User:', user?.email);
    
    if (!user || !['admin', 'finance'].includes(user.role)) {
        await showModal('error', 'Permission Denied', 'Only admin and finance users can verify team payments.');
        return;
    }
    
    if (!orderId) {
        console.error('[main.js] ❌ No order ID found in button dataset');
        console.log('[main.js] 🔍 Button HTML:', buttonElement?.outerHTML);
        
        await showModal('error', 'Order ID Missing', 
            'Could not find consignment order ID in button data.\n\n' +
            `Button found: ${buttonElement?.tagName}\n` +
            `Dataset keys: ${Object.keys(buttonElement?.dataset || {}).join(', ')}\n\n` +
            'This is a grid configuration issue. Please refresh and try again.'
        );
        return;
    }
    
    console.log(`[main.js] ✅ Processing team payment verification for order: ${orderId}`);
    
    try {
        ProgressToast.show('Loading Team Payment Verification', 'info');
        ProgressToast.updateProgress('Checking for pending team payments...', 60);
        
        // ✅ CHECK: Pending team payments for this order
        const pendingStatus = await checkForPendingTeamPayments(orderId);
        
        if (!pendingStatus.hasPendingPayments || pendingStatus.totalPendingCount === 0) {
            ProgressToast.hide(0);
            await showModal('info', 'No Pending Team Payments',
                `This consignment order has no team payments pending verification.\n\n` +
                `Order: ${orderId}\n` +
                `Team: ${teamName}\n\n` +
                `All payments for this order have been processed.`
            );
            return;
        }
        
        ProgressToast.updateProgress('Opening verification interface...', 90);
        
        setTimeout(() => {
            ProgressToast.hide(300);
            
            // ✅ OPEN: Team payment verification modal
            showTeamPaymentVerificationModal(orderId, teamName, pendingStatus);
            
            console.log(`[main.js] ✅ Team payment verification modal opened for ${teamName}`);
            
        }, 500);
        
    } catch (error) {
        console.error('[main.js] Error opening team payment verification:', error);
        ProgressToast.showError(`Verification failed: ${error.message}`);
        
        setTimeout(() => {
            showModal('error', 'Team Verification Error',
                `Could not open team payment verification.\n\n` +
                `Order: ${orderId}\n` +
                `Error: ${error.message}`
            );
        }, 2000);
    }
}


/**
 * ENHANCED: Handle team settlement follow-up
 */
async function handlePmtMgmtCollectTeamSettlement(target) {
    console.log('[main.js] 💰 Team settlement collection handler called');
    
    // ✅ FIX: Find button element from any clicked child
    const actualTarget = arguments[0];
    const buttonElement = actualTarget.closest('button') || actualTarget;
    
    const orderId = buttonElement?.dataset?.id;
    const teamName = buttonElement?.dataset?.teamName;
    const balanceDue = parseFloat(buttonElement?.dataset?.balanceDue || 0);
    
    console.log('[main.js] 🔍 Team settlement data:');
    console.log('  Order Document ID:', orderId);
    console.log('  Team Name:', teamName);
    console.log('  Balance Due:', formatCurrency(balanceDue));
    
    if (!orderId) {
        await showModal('error', 'Order ID Missing', 
            'Could not find consignment order ID for settlement follow-up.'
        );
        return;
    }
    
    try {
        // ✅ ENHANCEMENT: Get the user-friendly consignment ID
        console.log(`[main.js] 🔍 Getting consignment details for user-friendly display...`);
        
        const orderData = await getConsignmentOrderById(orderId);
        const consignmentId = orderData?.consignmentId || orderId; // Fallback to document ID if consignmentId missing
        const teamLeadName = orderData?.requestingMemberName || 'Unknown Lead';
        const totalSold = orderData?.totalValueSold || 0;
        const totalPaid = orderData?.totalAmountPaid || 0;
        
        console.log(`[main.js] ✅ Enhanced team settlement context:`, {
            consignmentId: consignmentId,
            teamLead: teamLeadName,
            totalSold: formatCurrency(totalSold),
            totalPaid: formatCurrency(totalPaid),
            balance: formatCurrency(balanceDue)
        });
        
        await showModal('info', 'Team Settlement Follow-up',
            `Team settlement follow-up for outstanding balance:\n\n` +
            `🏆 Team: ${teamName}\n` +
            `👤 Team Lead: ${teamLeadName}\n` +
            `📋 Consignment: ${consignmentId}\n` +
            `💰 Outstanding Balance: ${formatCurrency(balanceDue)}\n\n` +
            `📊 Financial Summary:\n` +
            `• Total Value Sold: ${formatCurrency(totalSold)}\n` +
            `• Amount Paid So Far: ${formatCurrency(totalPaid)}\n` +
            `• Remaining Balance: ${formatCurrency(balanceDue)}\n\n` +
            `Recommended actions:\n` +
            `📞 Contact ${teamLeadName} to discuss settlement timeline\n` +
            `📊 Review consignment order activity and sales performance\n` +
            `💰 Discuss payment plan or settlement schedule\n` +
            `📋 Use "View Order" to see detailed consignment activity\n\n` +
            `💡 Teams can submit settlement payments through the Consignment Management interface.`
        );
        
    } catch (error) {
        console.error('[main.js] Error getting consignment details:', error);
        
        // ✅ FALLBACK: Show dialog with basic information
        console.log(`[main.js] 💰 Fallback - team settlement follow-up with basic info`);
        
        await showModal('info', 'Team Settlement Follow-up',
            `Team settlement follow-up for outstanding balance:\n\n` +
            `• Team: ${teamName}\n` +
            `• Outstanding Balance: ${formatCurrency(balanceDue)}\n` +
            `• Order Reference: ${orderId}\n\n` +
            `Recommended actions:\n` +
            `📞 Contact team lead to discuss settlement\n` +
            `📊 Review consignment order activity\n` +
            `💰 Set up payment plan if needed\n` +
            `📋 Use "View Order" to see detailed information\n\n` +
            `Teams can submit payments through their Consignment interface.`
        );
    }
}

/**
 * ENHANCED: Handle view consignment order details
 */
async function handlePmtMgmtViewConsignmentOrder(target) {
    console.log('[main.js] 📋 View consignment order handler called');
    
    // ✅ FIX: Find button element from any clicked child  
    const actualTarget = arguments[0];
    const buttonElement = actualTarget.closest('button') || actualTarget;
    
    const orderId = buttonElement?.dataset?.id;
    
    console.log('[main.js] 🔍 Order ID for view:', orderId);
    
    if (!orderId) {
        await showModal('error', 'Order ID Missing', 'Could not find consignment order ID for details view.');
        return;
    }
    
    try {
        // ✅ ENHANCEMENT: Get order details for context in confirmation
        console.log('[main.js] 🔍 Getting order details for navigation confirmation...');
        
        const orderData = await getConsignmentOrderById(orderId);
        const consignmentId = orderData?.consignmentId || orderId;
        const teamName = orderData?.teamName || 'Unknown Team';
        const balanceDue = orderData?.balanceDue || 0;
        const totalSold = orderData?.totalValueSold || 0;
        
        // ✅ CONFIRM: Ask user before navigation
        const confirmed = await showModal('confirm', 'View Consignment Order Details',
            `Switch to Consignment Management to view order details?\n\n` +
            `🏆 Team: ${teamName}\n` +
            `📋 Consignment: ${consignmentId}\n` +
            `💰 Outstanding Balance: ${formatCurrency(balanceDue)}\n` +
            `📈 Total Value Sold: ${formatCurrency(totalSold)}\n\n` +
            `This will take you to Consignment Management where you can:\n` +
            `✅ View complete order details and timeline\n` +
            `✅ See team activity history and item sales\n` +
            `✅ Review settlement history and payment records\n` +
            `✅ Manage payments specific to this consignment\n\n` +
            `Continue to Consignment Management?`
        );
        
        if (confirmed) {
            console.log('[main.js] ✅ User confirmed navigation - switching to Consignment Management...');
            
            // ✅ SHOW: Loading progress during navigation
            ProgressToast.show('Opening Consignment Details', 'info');
            ProgressToast.updateProgress('Switching to Consignment Management...', 75, 'Navigation');
            
            // ✅ NAVIGATE: Set selected order and switch view
            appState.selectedConsignmentId = orderId;
            showConsignmentView();
            
            // ✅ SUCCESS: Show completion after view loads
            setTimeout(() => {
                ProgressToast.showSuccess('Consignment details loaded successfully!');
                
                setTimeout(() => {
                    ProgressToast.hide(500);
                    
                    // ✅ OPTIONAL: Brief success confirmation (non-blocking)
                    setTimeout(() => {
                        showModal('success', 'Navigation Complete',
                            `Successfully opened consignment order details!\n\n` +
                            `🏆 Team: ${teamName}\n` +
                            `📋 Consignment: ${consignmentId}\n\n` +
                            `You are now in Consignment Management where you can:\n` +
                            `• Review complete order activity\n` +
                            `• Monitor team sales performance\n` +
                            `• Manage settlement payments\n\n` +
                            `Use Payment Management tab to return to overview.`
                        );
                    }, 800);
                    
                }, 1000);
            }, 1200);
            
        } else {
            console.log('[main.js] ❌ User cancelled navigation to Consignment Management');
        }
        
    } catch (error) {
        console.error('[main.js] Error preparing consignment order navigation:', error);
        
        // ✅ FALLBACK: Show basic confirmation if order details fail
        const basicConfirmed = await showModal('confirm', 'View Consignment Order',
            `Switch to Consignment Management to view order details?\n\n` +
            `Order: ${orderId}\n\n` +
            `Note: Could not load order details for preview, but you can view them in Consignment Management.\n\n` +
            `Continue to Consignment Management?`
        );
        
        if (basicConfirmed) {
            appState.selectedConsignmentId = orderId;
            showConsignmentView();
            
            setTimeout(() => {
                showModal('info', 'Navigation Complete',
                    'Switched to Consignment Management.\n\n' +
                    'If order details don\'t load automatically, please select the order from the grid.'
                );
            }, 1000);
        }
    }
}

/**
 * ENHANCED: Handle view settlement history
 */

async function handlePmtMgmtViewSettlementHistory(target) {
    console.log('[main.js] 💰 Settlement history handler called');
    
    // ✅ FIX: Find button element properly
    const actualTarget = arguments[0];
    const buttonElement = actualTarget.closest('button') || actualTarget;
    
    const orderId = buttonElement?.dataset?.id;
    
    if (!orderId) {
        await showModal('error', 'Order ID Missing', 'Could not find order ID for settlement history.');
        return;
    }
    
    try {
        console.log(`[main.js] 💰 Loading settlement history for order: ${orderId}`);
        
        ProgressToast.show('Loading Settlement History', 'info');
        
        // ✅ GET: Settlement payment history for this order
        const db = firebase.firestore();
        const paymentsQuery = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('orderId', '==', orderId)
            .orderBy('paymentDate', 'desc');
        
        const paymentsSnapshot = await paymentsQuery.get();
        const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        ProgressToast.hide(300);
        
        if (payments.length === 0) {
            await showModal('info', 'No Payment History',
                `No settlement payments found for this consignment order.\n\n` +
                `Order: ${orderId}\n\n` +
                `This could mean:\n` +
                `• Team has not submitted any payments yet\n` +
                `• Payments are still in progress\n` +
                `• Settlement process hasn't started`
            );
            return;
        }
        
        // ✅ ANALYZE: Payment history
        const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const totalDonations = payments.reduce((sum, p) => sum + (p.donationAmount || 0), 0);
        const verifiedPayments = payments.filter(p => p.paymentStatus === 'Verified').length;
        const pendingPayments = payments.filter(p => p.paymentStatus === 'Pending Verification').length;
        
        await showModal('info', 'Settlement Payment History',
            `Complete settlement history for consignment order:\n\n` +
            `📋 Order ID: ${orderId}\n` +
            `📊 Total Payments: ${payments.length}\n` +
            `💰 Total Amount Paid: ${formatCurrency(totalPaid)}\n` +
            `🎁 Total Donations: ${formatCurrency(totalDonations)}\n` +
            `✅ Verified Payments: ${verifiedPayments}\n` +
            `⏳ Pending Verification: ${pendingPayments}\n\n` +
            `Recent Payment Details:\n` +
            `${payments.slice(0, 5).map((p, i) => 
                `${i + 1}. ${formatCurrency(p.amountPaid || 0)} on ${p.paymentDate?.toDate?.()?.toLocaleDateString() || 'Unknown'} (${p.paymentStatus})`
            ).join('\n')}` +
            `${payments.length > 5 ? `\n... and ${payments.length - 5} more payments` : ''}\n\n` +
            `Use "View Order" to see complete consignment details.`
        );
        
    } catch (error) {
        console.error('[main.js] Error loading settlement history:', error);
        ProgressToast.showError('Could not load settlement history');
        
        setTimeout(() => {
            showModal('error', 'Settlement History Error', 
                `Could not load settlement payment history.\n\n` +
                `Order: ${orderId}\n` +
                `Error: ${error.message}`
            );
        }, 2000);
    }
}

/**
 * GLOBAL: Refresh application dashboard (accessible from onclick handlers)
 */
window.refreshApplicationDashboard = async function(forceRefresh = false) {
    console.log(`[main.js] 🔄 Global dashboard refresh (force: ${forceRefresh})`);
    
    try {
        ProgressToast.show('Refreshing Dashboard', 'info');
        ProgressToast.updateProgress('Clearing cache and loading fresh data...', 50);
        
        await loadApplicationDashboard(forceRefresh);
        
        ProgressToast.updateProgress('Dashboard refreshed successfully!', 100);
        ProgressToast.showSuccess('Dashboard updated with latest data!');
        
        setTimeout(() => ProgressToast.hide(300), 800);
        
    } catch (error) {
        console.error('[main.js] Dashboard refresh failed:', error);
        ProgressToast.showError('Dashboard refresh failed - please try again');
        
        setTimeout(() => {
            showModal('error', 'Dashboard Refresh Failed', 
                `Could not refresh dashboard data.\n\n` +
                `Error: ${error.message}\n\n` +
                `Please check your connection and try again.`
            );
        }, 2000);
    }
};


/**
 * Generates a PDF invoice for a given sale ID and initiates download.
 * @param {string} invoiceId The document ID of the sales invoice.
 */

async function handleGenerateInvoice(invoiceId) {
    ProgressToast.show('Generating PDF Invoice...', 'info');
    
    try {
        // 1. FETCH DATA
        ProgressToast.updateProgress('Fetching invoice data...', 25);
        const invoiceData = await getSalesInvoiceById(invoiceId);
        if (!invoiceData) {
            throw new Error("Invoice data could not be found.");
        }

        // 2. PREPARE THE DATA OBJECT
        ProgressToast.updateProgress('Preparing invoice data...', 50);

        const storeDetails = storeConfig[invoiceData.store] || storeConfig['default'];

        // This object's structure MUST match the placeholders in your template
        const invoicePrintData = {
            copyType: 'ORIGINAL FOR RECIPIENT',
            
            // Company Details
            companyName: appState.ChurchName,
            address1: storeDetails.address,
            city: storeDetails.city,
            state: storeDetails.state,
            pincode: storeDetails.pincode,
            email: storeDetails.email,
            gstin: storeDetails.taxId,
            stateCode: storeDetails.stateCode,

            // Customer Details
            customerName: invoiceData.customerInfo.name,
            customerAddress1: invoiceData.customerInfo.address || '', // Assuming address is stored
            customerCity: invoiceData.customerInfo.city || '',
            customerState: invoiceData.customerInfo.state || '',
            customerPincode: invoiceData.customerInfo.pincode || '',
            customerGSTIN: invoiceData.customerInfo.gstin || 'N/A',
            customerStateCode: invoiceData.customerInfo.stateCode || '',

            // Shipping Details (can be same as billing or different)
            shipToAddress1: invoiceData.customerInfo.address || '',
            shipToCity: invoiceData.customerInfo.city || '',
            shipToState: invoiceData.customerInfo.state || '',
            shipToPincode: invoiceData.customerInfo.pincode || '',

            // Invoice Details
            invoiceNumber: invoiceData.saleId,
            invoiceDate: invoiceData.saleDate.toDate().toLocaleDateString(),
            invoiceTime: invoiceData.saleDate.toDate().toLocaleTimeString(),
            placeOfSupply: storeDetails.state,

            // Line Items (transformed to match the template helper)
            items: invoiceData.lineItems.map(item => ({
                itemName: item.productName,
                hsnSac: item.hsnCode || 'N/A', // Assuming HSN code is on the item
                qty: item.quantity,
                unit: 'pcs', // Assuming a default unit
                unitPrice: formatCurrency(item.unitPrice),
                taxableAmount: formatCurrency(item.lineTotal - (item.taxAmount || 0)),
                cgst: formatCurrency((item.taxAmount || 0) / 2),
                sgst: formatCurrency((item.taxAmount || 0) / 2),
                amount: formatCurrency(item.lineTotal)
            })),

            // Line Item Totals
            totalQty: invoiceData.lineItems.reduce((sum, item) => sum + item.quantity, 0),
            totalTaxableAmount: formatCurrency(invoiceData.financials.itemsSubtotal || 0),
            totalCGST: formatCurrency((invoiceData.financials.totalTax || 0) / 2),
            totalSGST: formatCurrency((invoiceData.financials.totalTax || 0) / 2),
            totalAmount: formatCurrency(invoiceData.financials.totalAmount || 0),

            // Tax Summary (requires more detailed data from line items if you have multiple tax rates)
            taxSummary: [], // Placeholder - needs more logic if you have complex taxes

            // Final Amounts
            subTotal: formatCurrency(invoiceData.financials.itemsSubtotal || 0),
            grandTotal: formatCurrency(invoiceData.financials.totalAmount || 0),
            receivedAmount: formatCurrency(invoiceData.totalAmountPaid || 0),
            balanceAmount: formatCurrency(invoiceData.balanceDue || 0),
            currentBalance: formatCurrency(invoiceData.balanceDue || 0), // Or a different calculation if needed

            // Amount in Words
            amountInWords: numberToWords(invoiceData.financials.totalAmount || 0),

            // Payment & Bank Details
            paymentMode: invoiceData.payments?.[0]?.paymentMode || 'N/A', // Get from first payment
            description: invoiceData.payments?.[0]?.notes || '',
            bankName: storeDetails.bankName,
            accountNumber: storeDetails.accountNumber,
            ifscCode: storeDetails.ifscCode,
            accountHolderName: storeDetails.accountHolderName,
            termsAndConditions: storeDetails.terms
        };

        // 3. CALL THE PDF GENERATOR
        ProgressToast.updateProgress('Rendering PDF...', 75);
        await generateTastyTreatsInvoice(invoicePrintData);

        ProgressToast.showSuccess('Invoice downloaded successfully!');
        setTimeout(() => ProgressToast.hide(500), 1200);

    } catch (error) {
        console.error("Error generating PDF:", error);
        ProgressToast.showError(`PDF Generation Failed: ${error.message}`);
    }
}

/**
 * ✅ NEW: Handles the click on the "Pay Selected Invoices" button.
 * Validates the selection and opens the bulk payment modal.
 */

async function handleBulkPaymentClick() {
    const selectedRows = getSelectedPurchaseInvoices();


    // 1. Validation: Ensure rows are selected
    if (selectedRows.length === 0) {
        return showModal('info', 'No Invoices Selected', 'Please select one or more invoices to pay.');
    }

    // 2. Validation: Ensure all selected invoices are for the SAME supplier
    const firstSupplierId = selectedRows[0].supplierId;
    const allSameSupplier = selectedRows.every(row => row.supplierId === firstSupplierId);

    if (!allSameSupplier) {
        return showModal('error', 'Multiple Suppliers Selected', 'You can only process a bulk payment for a single supplier at a time. Please select invoices from the same supplier.');
    }
    
    // 3. Validation: Ensure selected invoices actually have a balance due
    const payableInvoices = selectedRows.filter(row => (row.balanceDue || 0) > 0);
    if (payableInvoices.length === 0) {
        return showModal('info', 'No Balance Due', 'The selected invoices have already been fully paid.');
    }

    // 4. Calculate the total balance and prepare for the modal
    const totalBalanceDue = payableInvoices.reduce((sum, row) => sum + (row.balanceDue || 0), 0);

    // Store the actual invoices to be paid in the appState for the submission handler
    appState.invoicesToPayInBulk = payableInvoices;

    // 5. Call the UI function to show the modal
    showBulkPaymentModal(payableInvoices, totalBalanceDue);
}


/**
 * ✅ NEW: Handles the submission of the bulk supplier payment modal.
 */

async function handleBulkSupplierPaymentSubmit(e) {
    e.preventDefault();
    const user = appState.currentUser;
    if (!user) return;

    // Get the invoices we stored in the appState when the modal was opened
    const invoicesToPay = appState.invoicesToPayInBulk;
    if (!invoicesToPay || invoicesToPay.length === 0) {
        return showModal('error', 'Data Error', 'No invoices were selected for this bulk payment. Please close and try again.');
    }

    ProgressToast.show('Processing Bulk Payment...', 'info');

    try {
        // 1. Collect payment data from the modal form
        const paymentData = {
            supplierId: invoicesToPay[0].supplierId, // All invoices have the same supplier
            amountPaid: parseFloat(document.getElementById('bulk-payment-amount').value) || 0,
            paymentDate: new Date(document.getElementById('bulk-payment-date').value),
            paymentMode: document.getElementById('bulk-payment-mode').value,
            transactionRef: document.getElementById('bulk-payment-ref').value.trim(),
            notes: document.getElementById('bulk-payment-notes').value.trim()
        };

        // 2. Validation
        if (paymentData.amountPaid <= 0 || !paymentData.paymentMode || !paymentData.transactionRef) {
            ProgressToast.hide(0);
            return showModal('error', 'Missing Information', 'Please fill out Amount Paid, Payment Mode, and Reference #.');
        }

        console.log("[Main.js] Payment Data that we collected : ",paymentData)
        
        // 3. Call the new transactional API function
        ProgressToast.updateProgress('Saving payment and updating invoices...', 60);
        await processBulkSupplierPayment(paymentData, invoicesToPay, user);

       
        // 4. Success
        ProgressToast.showSuccess('Bulk payment processed successfully!');
        closeBulkPaymentModal();
        
        // Deselect rows in the grid for a clean state
        deselectAllPurchaseInvoices();
        

        setTimeout(() => {
            showModal('success', 'Bulk Payment Complete', 
                `The payment of ${formatCurrency(paymentData.amountPaid)} has been successfully allocated across ${invoicesToPay.length} invoices.`
            );
            ProgressToast.hide(0);
        }, 500);

        ProgressToast.hide(0);

    } catch (error) {
        console.error("Error processing bulk supplier payment:", error);
        ProgressToast.showError(`Processing Failed: ${error.message}`);
    }
}


/**
 * ✅ NEW: Handles the click on the "Download PDF" button inside the consignment detail modal.
 * It captures the modal's content and converts it to a PDF.
 */
async function handleDownloadConsignmentDetail() {
    // 1. Get the main content element of the modal.
    // We want the part with the white background and padding, not the overlay.
    const modalContentElement = document.querySelector('#view-consignment-details-modal .relative.bg-white');
    
    if (!modalContentElement) {
        showModal('error', 'Error', 'Could not find the modal content to print.');
        return;
    }

    // 2. Get the order ID from appState to use in the filename.
    const orderData = appState.activeConsignmentModalData;
    if (!orderData) {
        showModal('error', 'Data Error', 'Could not find data for the active modal.');
        return;
    }

    const fileName = `Consignment-Details-${orderData?.consignmentId || orderId}.pdf`;

    ProgressToast.show('Generating PDF...', 'info');

    // 3. Configure html2pdf.js
    const opt = {
        margin:       0.5,
        filename:     fileName,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
        // 4. Run the conversion and save the file.
        await html2pdf().from(modalContentElement).set(opt).save();
        ProgressToast.showSuccess('PDF Downloaded!');
    } catch (error) {
        console.error("PDF generation failed:", error);
        ProgressToast.showError('Failed to generate PDF.');
    }
}






// --- APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Initializing...");

    ProgressToast.show('Application Initializing.......', 'info');

    // Add the RowGroupingModule to the array of modules to be registered.
    ProgressToast.updateProgress('Activating the required modules ...', 100);
    ModuleRegistry.registerModules([
        AllCommunityModule
    ]);

    

    setupEventListeners();

    // 3. Initialize modals AFTER event listeners are set up

    initializeModals();

    // 4. Initialize master data listeners last
    //    These trigger UI updates that depend on event listeners being ready
    ProgressToast.updateProgress('Initializing all Master date...', 150);
    
    initializeMasterDataListeners();

    ProgressToast.showSuccess('Application Loaded successfully.. Welcome to MONETA');
    setTimeout(() => ProgressToast.hide(1500), 1500);

});
