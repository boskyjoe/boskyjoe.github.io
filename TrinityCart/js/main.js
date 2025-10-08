// js/main.js

import { 
    ModuleRegistry, 
    AllCommunityModule 
} from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';




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
import { masterData } from './masterData.js';


import {  getPurchaseInvoiceById, } from './api.js';
import { addLineItem, calculateAllTotals, showPurchasesView,switchPurchaseTab, loadPaymentsForSelectedInvoice,resetPurchaseForm, loadInvoiceDataIntoForm } from './ui.js';
import { addSupplierPayment } from './api.js';
import { recordPaymentAndUpdateInvoice } from './api.js';
import { deletePaymentAndUpdateInvoice } from './api.js';
import { getPaymentDataFromGridById } from './ui.js';

import { showPaymentModal, closePaymentModal,getInvoiceDataFromGridById, initializeModals } from './ui.js';


import { showSalesCatalogueView,getCatalogueDataFromGridById,loadCatalogueForEditing,resetCatalogueForm, updateDraftItemsGrid, getTeamDataFromGridById } from './ui.js';
import { 
    getLatestPurchasePrice,
    addSalesCatalogue,
    updateSalesCatalogue,
    addItemToCatalogue,
    updateCatalogueItem,
    removeItemFromCatalogue,createCatalogueWithItems,
    createPurchaseInvoiceAndUpdateInventory,
    updatePurchaseInvoiceAndInventory
} from './api.js';

import { showChurchTeamsView, showMemberModal, closeMemberModal,getMemberDataFromGridById } from './ui.js';

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
    getFulfillmentItems,refreshConsignmentDetailPanel,
    showReportActivityModal, closeReportActivityModal,switchConsignmentTab,renderConsignmentDetail,
    resetPaymentForm,getRequestedConsignmentItems,loadPaymentRecordForEditing,
    showSalesView,
    showAddProductModal,
    closeAddProductModal,
    calculateSalesTotals,addItemToCart,
} from './ui.js';

import { 
    getUserMembershipInfo,
    getMembersForTeam,
    createConsignmentRequest,
    fulfillConsignmentAndUpdateInventory,
    logActivityAndUpdateConsignment,getConsignmentOrderById,
    submitPaymentRecord,updatePaymentRecord,
    verifyConsignmentPayment,cancelPaymentRecord,
    createSaleAndUpdateInventory
} from './api.js';




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
        return ;
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
        return ;
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
        return ;
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




function setupEventListeners() {
    
    // ==================================================================
    // --- 1. SINGLE, GLOBAL CLICK HANDLER for all click events ---
    // ==================================================================
    document.addEventListener('click', async (e) => {
        const target = e.target;
        const user = appState.currentUser;

        // --- Handle Login/Logout ---
        if (target.closest('#login-button')) { handleLogin(); return; }
        if (target.closest('#logout-button')) { handleLogout(); return; }

        // --- Handle Sidebar Navigation & Back Links ---
        const navTrigger = target.closest('.nav-link, .back-link, .master-data-card');
        if (navTrigger) {
            e.preventDefault();
            const viewId = navTrigger.dataset.viewId;
            if (!viewId) return;

            console.log(`[main.js] Navigating to view: ${viewId}`);

            // The switch statement now handles all navigation triggers
            switch (viewId) {
                case 'suppliers-view': showSuppliersView(); break;
                case 'products-view': showProductsView(); break;
                case 'sales-catalogue-view': showSalesCatalogueView(); break;
                case 'categories-view': showCategoriesView(); break;
                case 'payment-modes-view': showPaymentModesView(); break;
                case 'sale-types-view': showSaleTypesView(); break;
                case 'seasons-view': showSeasonsView(); break;
                case 'sales-events-view': showSalesEventsView(); break;
                case 'users-view': showUsersView(); break;
                case 'purchases-view': showPurchasesView(); break;
                case 'church-teams-view': showChurchTeamsView(); break;
                case 'consignment-view': showConsignmentView(); break;
                case 'sales-view': showSalesView(); break;
                default: showView(viewId);
            }
            return; // Stop processing after handling navigation
        }

        // --- Handle ALL Grid Action Buttons ---
        const gridButton = target.closest('button[data-id]');
        if (gridButton) {
            if (!user) return;
            const docId = gridButton.dataset.id;
            const grid = gridButton.closest('.ag-theme-alpine');
            if (!docId || !grid) return;

            console.log('[what is the grid]:', grid.id);
            // Logic for Purchase Invoices Grid
            if (grid.id === 'purchase-invoices-grid') {
                if (gridButton.classList.contains('action-btn-edit')) {
                    const invoiceData = await getPurchaseInvoiceById(docId);
                    if (invoiceData) loadInvoiceDataIntoForm(invoiceData);
                } else if (gridButton.classList.contains('action-btn-payment')) {
                    try {
                        const invoiceData = await getPurchaseInvoiceById(docId);
                        if (invoiceData) {
                            showPaymentModal(invoiceData);
                        } else {
                            showModal('error', 'Error', 'Could not find the selected invoice data.');
                        }
                    } catch (error) {
                        console.error("Error fetching invoice for payment:", error);
                        showModal('error', 'Error', 'Failed to load invoice data for payment.');
                    }
                } else if (gridButton.classList.contains('action-btn-delete')) {
                    // This is for deleting the ENTIRE invoice, which we can add later
                    console.log("Delete entire invoice button clicked for:", docId);
                }
            } // --- Logic for Purchase Payments Grid ---
            else if (grid.id === 'purchase-payments-grid') {
                if (gridButton.classList.contains('action-btn-delete-payment')) {
                    console.log("[main.js] Correctly detected click on action-btn-delete-payment for docId:", docId);
                    const paymentData = getPaymentDataFromGridById(docId);
                    console.log("[main.js] paymentData", paymentData);
                    if (!paymentData) {
                        //return showModal('error', 'Error', 'Could not find payment data in the grid.');
                        alert('Error: Could not find payment data in the grid.');
                        return; 
                    }

        
                    const confirmed = confirm(
                        `Are you sure you want to delete the payment of $${paymentData.amountPaid.toFixed(2)}? This will update the invoice balance and cannot be undone.`
                    );
                    if (confirmed) {
                        try {
                            await deletePaymentAndUpdateInvoice(docId, user);
                            
                            // CHANGED: Replaced showModal with standard alert()
                            alert('Success: The payment has been deleted and the invoice balance has been updated.');

                        } catch (error) {
                            console.error("Error deleting payment:", error);
                            
                            // CHANGED: Replaced showModal with standard alert()
                            alert(`Delete Failed: The payment could not be deleted. Reason: ${error.message}`);
                        }
                    }

                }
            } // --- Logic for Sales Catalogue Grids ---
            else if (grid.id === 'existing-catalogues-grid') {
                if (gridButton.classList.contains('action-btn-edit-catalogue')) {
                    const catalogueData = getCatalogueDataFromGridById(docId);
                    if (catalogueData) {
                        loadCatalogueForEditing(catalogueData);
                    }
                }
            }
            else if (grid.id === 'available-products-grid') {
                if (gridButton.classList.contains('action-btn-add-item')) {
                    const productId = gridButton.dataset.id;
                    const catalogueId = document.getElementById('sales-catalogue-doc-id').value;

                    const docId = document.getElementById('sales-catalogue-doc-id').value;
                    const isEditMode = !!docId;

                    

                    try {
                        const costPrice = await getLatestPurchasePrice(productId);
                        if (costPrice === null) {
                            return alert('This product cannot be added because it has no purchase history. Please create a purchase invoice for it first.');
                        }

                        const productMaster = masterData.products.find(p => p.id === productId);
                        const margin = productMaster.unitMarginPercentage || 0;
                        const sellingPrice = costPrice * (1 + margin / 100);

                        const itemData = {
                            productId: productId,
                            productName: productMaster.itemName,
                            costPrice: costPrice,
                            marginPercentage: margin,
                            sellingPrice: sellingPrice,
                            isOverridden: false
                        };

                        if (isEditMode) {
                            // In Edit Mode, save the item directly to the database.
                            // The real-time listener will then update the UI.
                            itemData.catalogueId = docId; // Add the parent ID
                            await addItemToCatalogue(docId, itemData);
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
            }
            else if (grid.id === 'catalogue-items-grid') {
                if (gridButton.classList.contains('action-btn-remove-item')) {
                    const itemId = gridButton.dataset.id;
                    const catalogueId = document.getElementById('sales-catalogue-doc-id').value;

                    if (confirm('Are you sure you want to remove this item from the catalogue?')) {
                        try {
                            await removeItemFromCatalogue(catalogueId, itemId);
                        } catch (error) {
                            console.error("Error removing item:", error);
                            alert('Failed to remove the item.');
                        }
                    }
                }
            }
            else if (grid.id === 'church-teams-grid') {
                if (gridButton.classList.contains('action-btn-toggle-team-status')) {
                    // We need to know the current status to toggle it.
                    // We can get this by looking up the row data in the grid.
                    const teamData = getTeamDataFromGridById(docId);
                    if (teamData) {
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
                    
                }
            }
            else if (grid.id === 'team-members-grid') {
                const teamId = document.getElementById('member-team-id').value; // Get the parent team ID
                if (gridButton.classList.contains('action-btn-edit-member')) {
                    // We need to get the member data to pre-fill the form
                    const memberData = getMemberDataFromGridById(docId);
                    if (memberData) {
                        showMemberModal(memberData);
                    }
                } else if (gridButton.classList.contains('action-btn-remove-member')) {
                    if (confirm('Are you sure you want to remove this member from the team?')) {
                        try {
                            // We need the member's email to find their membership record.
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
            else if (grid.id === 'consignment-payments-grid') {
                const paymentData = getPaymentDataFromGridById(docId);
                if (!paymentData) return;

                if (gridButton.classList.contains('action-btn-edit-payment')) {
                    // Delegate the UI work to the 'loadPaymentRecordForEditing' function in ui.js
                    loadPaymentRecordForEditing(paymentData);
                } 
                else if (gridButton.classList.contains('action-btn-cancel-payment')) {
                    if (confirm("Are you sure you want to cancel and delete this pending payment record? This action cannot be undone.")) {
                        try {
                            await cancelPaymentRecord(docId);
                            alert("Payment record has been cancelled.");
                            // The real-time listener on the grid will automatically remove the row.
                        } catch (error) {
                            console.error("Error cancelling payment record:", error);
                            alert(`Failed to cancel payment record: ${error.message}`);
                        }
                    }
                }  
                else if (gridButton.classList.contains('action-btn-verify-payment')) {
                    if (confirm(`Are you sure you want to verify this payment of $${paymentData.amountPaid.toFixed(2)}? This will update the order balance.`)) {
                        try {
                            await verifyConsignmentPayment(docId, user);
                            alert("Payment successfully verified!");
                            // The real-time listeners will automatically update the order summary and this grid.
                        } catch (error) {
                            console.error("Error verifying payment:", error);
                            alert(`Payment verification failed: ${error.message}`);
                        }
                    }
                }
            }









            // Logic for ALL other master data grids (Suppliers, Categories, etc.)
        

            // --- Logic for Suppliers Grid ---
            if (grid.id === 'suppliers-grid') {
                const isActivate = gridButton.classList.contains('btn-activate');
                console.log('[supplier grid is action]:', isActivate);
                if (await showModal('confirm', `Confirm ${isActivate ? 'Activation' : 'Deactivation'}`, 'Are you sure?')) {
                    await setSupplierStatus(docId, isActivate, user);
                }

                return; // Stop after handling
            }

            // --- Logic for Categories Grid ---
            if (grid.id === 'categories-grid') {
                const isActivate = gridButton.classList.contains('btn-activate');
                console.log(`[categories-grid] Button clicked. User wants to activate: ${isActivate}`);

                try {
                    await setCategoryStatus(docId, isActivate, user);
                    console.log(`Category ${docId} status set to ${isActivate}`);
                    await showModal('success', 'Success', 'Category updated successfully.');
                } catch (error) {
                    console.error("Error updating category status:", error);
                    await showModal('error', 'Update Failed', 'The category status could not be updated.');
                }
            }

            // --- Logic for Payment Modes Grid ---
            if (grid.id === 'payment-modes-grid') {
                const isActivate = gridButton.classList.contains('btn-activate');

                try {
                    await setPaymentModeStatus(docId, isActivate, user);
                } catch (error) {
                    console.error("Error updating payment mode status:", error);
                    await showModal('error', 'Update Failed', 'The payment mode status could not be updated.');
                }
            }

            // --- Logic for Sale Types Grid ---
            if (grid.id === 'sale-types-grid') {
                const isActivate = gridButton.classList.contains('btn-activate');
                try {
                    await setSaleTypeStatus(docId, isActivate, user);
                } catch (error) {
                    console.error("Error updating sales type status:", error);
                    await showModal('error', 'Update Failed', 'The sales type status could not be updated.');
                }
            }

            // --- Logic for seasons Grid ---
            if(grid.id === 'seasons-grid') {
                const isActivate = gridButton.classList.contains('btn-activate');
                try {
                    await setSeasonStatus(docId, isActivate, user);
                } catch (error) {
                    console.error("Error updating sales seasons status:", error);
                    await showModal('error', 'Update Failed', 'The sales seasons status could not be updated.');
                }
            }
            
            // --- Logic for sales events Grid ---
            if(grid.id === 'sales-events-grid') {
                const isActivate = gridButton.classList.contains('btn-activate');
                try {
                    await setSalesEventStatus(docId, isActivate, user);
                } catch (error) {
                    console.error("Error updating sales events status:", error);
                    await showModal('error', 'Update Failed', 'The sales events status could not be updated.');
                }
            }

            // --- Logic for users Grid ---
            if(grid.id === 'users-grid') {
                const isActivate = gridButton.classList.contains('btn-activate');
                const uid = docId; 
                try {
                    await setUserActiveStatus(uid, isActivate, user);
                } catch (error) {
                    console.error("Error updating user status:", error);
                    await showModal('error', 'Update Failed', 'The users status could not be updated.');
                }
            }


        }


        // ==========================================================
        // --- [NEW] MOBILE SIDEBAR LOGIC ---
        // ==========================================================
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        if (mobileMenuButton && sidebar && sidebarOverlay) {
            // Logic to open the sidebar
            mobileMenuButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent click from bubbling up
                sidebar.classList.add('active');
                sidebarOverlay.classList.remove('hidden');
            });

            // Logic to close the sidebar by clicking the overlay
            sidebarOverlay.addEventListener('click', () => {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.add('hidden');
            });
        }



        // --- Handle Other Standalone Buttons ---
            
        if (target.closest('#add-line-item-btn')) { addLineItem(); return; }
        if (target.closest('.remove-line-item-btn')) { target.closest('.grid').remove(); calculateAllTotals(); return; }
        if (target.closest('#cancel-edit-btn')) { resetPurchaseForm(); return; }
        if (target.closest('#payment-modal-close')) { closePaymentModal(); return; }
        if (target.closest('#add-member-btn')) {
            showMemberModal(); // Call with no data to open in "Add New" mode
            return;
        }

        const requestBtn = target.closest('#request-consignment-btn');
        if (requestBtn) {
            handleRequestConsignmentClick(); // Call a dedicated handler function
            return;
        }

    
        const consignmentNextBtn = target.closest('#consignment-next-btn');
        if (consignmentNextBtn) {
            const catalogueId = document.getElementById('request-catalogue-select').value;
            if (!catalogueId) {
                return alert("Please select a Sales Catalogue before proceeding.");
            }
            
            // Call a new UI function to handle showing the next step
            showConsignmentRequestStep2(catalogueId);
            return;
        }


        
        const fulfillBtn = target.closest('#fulfill-checkout-btn');
        if (fulfillBtn) {
            handleFulfillConsignmentClick(); // Call a dedicated handler function
            return;
        }

        if (target.closest('#catalogue-form-cancel-btn')) {
            resetCatalogueForm();
            return;
        }


        // --- Handler for Consignment Detail Tabs ---
        const consignmentTab = target.closest('.consignment-tab');
        if (consignmentTab) {
            e.preventDefault();
            
            // Call a new UI helper function to handle the switching logic
            switchConsignmentTab(consignmentTab.id);
            return;
        }


        // --- [NEW] Listener for the Store selection dropdown ---
        const saleStoreSelect = document.getElementById('sale-store-select');
        if (saleStoreSelect) {
            saleStoreSelect.addEventListener('change', (e) => {
                const addressContainer = document.getElementById('tasty-treats-address-container');
                const addressInput = document.getElementById('sale-customer-address');
                
                // Show the address field only if "Tasty Treats" is selected
                const showAddress = e.target.value === 'Tasty Treats';
                
                addressContainer.classList.toggle('hidden', !showAddress);
                // Also make the address input required only when it's visible
                addressInput.required = showAddress;
            });
        }

        if (target.closest('#report-activity-btn')) {
            showReportActivityModal();
            return;
        }

        // --- [NEW] Handler for the "Cancel Edit" button on the payment form ---
        document.addEventListener('click', (e) => {
            if (e.target.closest('#cancel-payment-edit-btn')) {
                resetPaymentForm();
            }
        });

        // Handler for "+ Add Product" button on the main form
        if (target.closest('#add-product-to-cart-btn')) {
            showAddProductModal();
        }

        // Handler for closing modals
        if (target.closest('#add-product-modal .modal-close-trigger')) {
            closeAddProductModal();
        }


        // Handler for the "Add" button INSIDE the product modal
        if (target.closest('.action-btn-add-to-cart')) {
            const productId = target.closest('.action-btn-add-to-cart').dataset.id;
            const product = masterData.products.find(p => p.id === productId);
            if (product) {
                const newItem = {
                    productId: product.id,
                    productName: product.itemName,
                    quantity: 1, // Default to 1
                    unitPrice: product.sellingPrice || 0, // Use default selling price
                };
                // Add the new item to the cart grid
                addItemToCart(newItem);
            }
            closeAddProductModal();
        }

        // Handler for the "Remove" button in the shopping cart grid
        if (target.closest('.action-btn-remove-from-cart')) {
            const productId = target.closest('.action-btn-remove-from-cart').dataset.id;
            const rowNode = salesCartGridApi.getRowNode(productId);
            if (rowNode) {
                removeItemFromCart(productId);
            }
        }










        const tab = target.closest('.tab');
        if (tab) {
            e.preventDefault();
            
            if (tab.id === 'tab-invoices') {
                switchPurchaseTab('invoices');
            } 
            else if (tab.id === 'tab-payments') {
                if (!tab.classList.contains('tab-disabled')) {
                    switchPurchaseTab('payments');
                    loadPaymentsForSelectedInvoice();
                }
            }
            return; // Stop processing after handling a tab click
        }





    });




    
     // ==================================================================
    // --- 2. ISOLATED FORM SUBMISSION & OTHER EVENT HANDLERS ---
    // ==================================================================

    // --- Form Submissions ---
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
                inventoryCount: parseInt(document.getElementById('initialStock-input').value, 10) || 0
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

    const purchaseInvoiceForm = document.getElementById('purchase-invoice-form');
    if (purchaseInvoiceForm) {
        purchaseInvoiceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSavePurchaseInvoice(); 
        });
        purchaseInvoiceForm.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName.toLowerCase() !== 'textarea') e.preventDefault();
        });
    }

     // --- NEW: LISTENERS FOR THE PAYMENT MODAL ---
    const paymentForm = document.getElementById('record-payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            if (!user) return;

            // Collect data from the payment form
            const paymentData = {
                paymentDate: new Date(document.getElementById('payment-date-input').value),
                amountPaid: parseFloat(document.getElementById('payment-amount-input').value),
                paymentMode: document.getElementById('payment-mode-select').value,
                transactionRef: document.getElementById('payment-ref-input').value,
                notes: document.getElementById('payment-notes-input').value,
                // Get related IDs from hidden inputs
                relatedInvoiceId: document.getElementById('payment-invoice-id').value,
                supplierId: document.getElementById('payment-supplier-id').value,
            };
            
            if (isNaN(paymentData.amountPaid) || paymentData.amountPaid <= 0) {
                return showModal('error', 'Invalid Amount', 'Payment amount must be greater than zero.');
            }

            try {
                //await addSupplierPayment(paymentData, user);
                await recordPaymentAndUpdateInvoice(paymentData, user);
                await showModal('success', 'Success', 'Payment has been recorded successfully.');
                closePaymentModal();
                // The real-time listener will automatically update the grid!
            } catch (error) {
                console.error("Error recording payment:", error);
                await showModal('error', 'Save Failed', 'There was an error recording the payment.');
            }
        });
    }


    // --- Form Submission for "Create New Team" ---
    const addTeamForm = document.getElementById('add-team-form');
    if (addTeamForm) {
        addTeamForm.addEventListener('submit', async (e) => {
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
                addTeamForm.reset();
            } catch (error) {
                console.error("Error creating team:", error);
                alert('Failed to create team.');
            }
        });
    }



    // --- Form Submission for "Add/Edit Member" Modal ---
    const memberForm = document.getElementById('member-form');
    if (memberForm) {
        memberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            if (!user) return;

            const teamId = document.getElementById('member-team-id').value;
            const memberId = document.getElementById('member-doc-id').value;
            const isEditMode = !!memberId;


            // We need the team name to denormalize it.
            const teamData = getTeamDataFromGridById(teamId);
            if (!teamData) return alert("Error: Could not find parent team data.");
            const teamName = teamData.teamName;


            const memberData = {
                name: document.getElementById('member-name-input').value,
                email: document.getElementById('member-email-input').value,
                phone: document.getElementById('member-phone-input').value,
                role: document.getElementById('member-role-select').value,
            };

            try {
                if (isEditMode) {
                    await updateTeamMember(teamId, memberId, memberData);
                    alert('Member details updated successfully.');
                } else {
                    await addTeamMember(teamId, teamName, memberData, user);
                    alert('New member added successfully.');
                }
                // After saving the member, check if they are the new Team Lead.
                if (memberData.role === 'Team Lead') {
                    // If so, update the parent team document with their name and ID.
                    const parentTeamUpdateData = {
                        teamLeadId: memberId, // The ID of the member document
                        teamLeadName: memberData.name
                    };
                    await updateChurchTeam(teamId, parentTeamUpdateData, user);
                    console.log(`Parent team ${teamId} updated with new lead: ${memberData.name}`);
                }
                
                closeMemberModal();
            } catch (error) {
                console.error("Error saving member:", error);
                alert('Failed to save member details.');
            }
        });
    }



    // --- [NEW] Listener for Admin's Team Selection in Consignment Modal ---
    const adminTeamSelect = document.getElementById('admin-select-team');
    if (adminTeamSelect) {
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
                    return ;
                } else if (teamLeads.length === 1) {
                    // --- AUTO-SELECTION FIX ---
                    const lead = teamLeads[0];
                    // Store a JSON string with id, name, AND email.
                    const leadData = JSON.stringify({ id: lead.id, name: lead.name, email: lead.email });
                    memberSelect.innerHTML = `<option value='${leadData}'>${lead.name}</option>`;
                    memberSelect.disabled = true; // Correctly disabled as there's only one choice.
                    nextButton.disabled = false;
                } else {
                    // --- MULTIPLE CHOICE FIX ---
                    memberSelect.innerHTML = '<option value="">Select a team lead...</option>';
                    teamLeads.forEach(lead => {
                        const option = document.createElement('option');
                        // Store a JSON string with id, name, AND email.
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





    

    // --- In-Grid Update Custom Event Listeners ---

    // In-Grid Update Event updateSupplier
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

    // In-Grid Update Event updateProduct
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

    // --- In-Grid Update for Church Team Name ---
    document.addEventListener('updateChurchTeam', async (e) => {
        const { teamId, updatedData } = e.detail;
        const user = appState.currentUser;
        if (!user) return;

        try {
            await updateChurchTeam(teamId, updatedData, user);
            // Optionally, show a temporary success message, though the real-time
            // listener already confirms the change visually.
            console.log(`Team ${teamId} name updated successfully.`);
        } catch (error) {
            console.error("Error updating team name:", error);
            alert('Failed to update team name.');
            // We should add logic here to refresh the grid to revert the failed change.
        }
    });

    // --- Other Listeners ---
    const purchaseFormContainer = document.getElementById('purchases-view');
    if (purchaseFormContainer) {
        purchaseFormContainer.addEventListener('input', (e) => {
            if (e.target.matches('.line-item-qty, .line-item-price, .line-item-tax, .line-item-discount-type, .line-item-discount-value, #invoice-discount-type, #invoice-discount-value, #invoice-tax-percentage')) {
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



    // ==========================================================
    // --- EVENT LISTENERS FOR SALES CATALOGUE MODULE ---
    // ==========================================================

    // --- Form Submission (Create/Update Catalogue) ---
    const salesCatalogueForm = document.getElementById('sales-catalogue-form');
    if (salesCatalogueForm) {
        salesCatalogueForm.addEventListener('submit', async (e) => {
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
                    // 1. Create a "clean" version of the items without the tempId.
                    const itemsToSave = appState.draftCatalogueItems.map(({ tempId, ...rest }) => rest);

                    // 2. Pass the clean data to the API function.
                    await createCatalogueWithItems(catalogueData, itemsToSave, user);
                    alert('New sales catalogue and its items have been saved successfully.');
                    resetCatalogueForm();
                }
                // We will add logic to refresh the "Existing Catalogues" grid here later.
                salesCatalogueForm.reset();
            } catch (error) {
                console.error("Error saving sales catalogue:", error);
                alert('There was an error saving the catalogue.');
            }
        });
    }

    // --- Custom Event for Price Override ---
    document.addEventListener('updateCatalogueItemPrice', async (e) => {
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
    });


    // --- [NEW] Listener for Catalogue Selection in Consignment Modal ---
    const requestCatalogueSelect = document.getElementById('request-catalogue-select');
    if (requestCatalogueSelect) {
        requestCatalogueSelect.addEventListener('change', (e) => {
            const catalogueId = e.target.value;
            const eventSelect = document.getElementById('request-event-select');

            // Reset the event dropdown
            eventSelect.innerHTML = '<option value="">Select an event (optional)...</option>';
            
            if (!catalogueId) {
                eventSelect.disabled = true;
                return;
            }

            // Find the selected catalogue from masterData to get its seasonId
            const selectedCatalogue = masterData.salesCatalogues.find(sc => sc.id === catalogueId);
            if (!selectedCatalogue) {
                eventSelect.disabled = true;
                return;
            }
            const parentSeasonId = selectedCatalogue.seasonId;

            // Filter the master list of all events to find ones matching the season
            const relevantEvents = masterData.salesEvents.filter(event => event.seasonId === parentSeasonId);

            if (relevantEvents.length > 0) {
                relevantEvents.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event.id;
                    option.textContent = event.eventName;
                    eventSelect.appendChild(option);
                });
                eventSelect.disabled = false; // Enable the dropdown
            } else {
                eventSelect.innerHTML = '<option value="">No events for this season</option>';
                eventSelect.disabled = true; // Keep it disabled
            }
        });
    }


    // --- Form Submission for the Request Modal ---
    const consignmentRequestForm = document.getElementById('consignment-request-form');
    if (consignmentRequestForm) {
        consignmentRequestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;

            if (!user) return;
            
            // 1. Get the common form elements
            const teamSelect = document.getElementById(user.role === 'admin' ? 'admin-select-team' : 'user-select-team');
            const catalogueSelect = document.getElementById('request-catalogue-select');
            const eventSelect = document.getElementById('request-event-select');


            // 2. Determine the "requesting member" based on user role
            let requestingMemberId;
            let requestingMemberName;
            let requestingMemberEmail;

            if (user.role === 'admin') {
                const memberSelect = document.getElementById('admin-select-member');
                if (!memberSelect.value) {
                    return alert("Please select a Team Lead.");
                }
                // Parse the complete lead object from the dropdown's value
                const selectedLead = JSON.parse(memberSelect.value);
                requestingMemberId = selectedLead.id; // This is the member's document ID from the sub-collection
                requestingMemberName = selectedLead.name;
                requestingMemberEmail = selectedLead.email;
            } else {
                // For non-admins (team leads), the request is always for themselves.
                requestingMemberId = user.uid; // Their main user auth ID
                requestingMemberName = user.displayName;
                requestingMemberEmail = user.email;
            }

            // 3. Assemble the final requestData object
            const requestData = {
                teamId: teamSelect.value,
                teamName: teamSelect.options[teamSelect.selectedIndex].text,
                salesCatalogueId: catalogueSelect.value,
                salesCatalogueName: catalogueSelect.options[catalogueSelect.selectedIndex].text,
                salesEventId: eventSelect.value || null,
                salesEventName: eventSelect.value ? eventSelect.options[eventSelect.selectedIndex].text : null,
                
                // Add the correctly determined member info
                requestingMemberId: requestingMemberId,
                requestingMemberName: requestingMemberName,
                requestingMemberEmail: requestingMemberEmail,
            };

            // 4. Get items and submit
            const requestedItems = getRequestedConsignmentItems();

            if (requestedItems.length === 0) {
                return alert("Please request a quantity of at least one item.");
            }

            try {
                // The API function now receives the correct data
                await createConsignmentRequest(requestData, requestedItems, user);
                alert("Consignment request submitted successfully!");
                closeConsignmentRequestModal();
            } catch (error) {
                console.error("Error creating consignment request:", error);
                alert(`Failed to submit request: ${error.message}`);
            }
        });
    }



    // --- Add this new form submission handler ---
    const reportActivityForm = document.getElementById('report-activity-form');
    if (reportActivityForm) {
        reportActivityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            if (!user) return;

            const orderId = document.getElementById('activity-order-id').value;
            const productValue = document.getElementById('activity-product-select').value;
            
            if (!orderId || !productValue) {
                return alert("Missing order or product information.");
            }

            
            // Parse the complex value from the dropdown
            const { itemId, productId, sellingPrice } = JSON.parse(productValue); // <-- Get sellingPrice here

            const activityData = {
                activityType: document.getElementById('activity-type-select').value,
                quantity: parseInt(document.getElementById('activity-quantity-input').value, 10),
                notes: document.getElementById('activity-notes-input').value,
                productId: productId,// Pass the master product ID for the log
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
        });
    }

    // --- [NEW] Listener for Activity Type change in Report Modal ---
    const activityTypeSelect = document.getElementById('activity-type-select');
    if (activityTypeSelect) {
        activityTypeSelect.addEventListener('change', (e) => {
            const eventContainer = document.getElementById('activity-event-container');
            // Show the event dropdown only if the selected activity is "Sale"
            const showEvents = (e.target.value === 'Sale');
            eventContainer.classList.toggle('hidden', !showEvents);
        });
    }
    

    // --- [NEW] Form Submission for "Make Payment" Form ---
    const makePaymentForm = document.getElementById('make-payment-form');
    if (makePaymentForm) {
        makePaymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            if (!user) return;

            const docId = document.getElementById('payment-ledger-doc-id').value;
            const isEditMode = !!docId;

            // --- NEW, SIMPLIFIED DATA GATHERING ---
            const paymentData = {
                orderId: appState.selectedConsignmentId,
                teamLeadId: user.uid, // This assumes the team lead is submitting.
                teamLeadName: user.displayName,
                amountPaid: parseFloat(document.getElementById('payment-amount-input').value),
                paymentDate: new Date(document.getElementById('payment-date-input').value),
                paymentMode: document.getElementById('payment-mode-select').value,
                transactionRef: document.getElementById('payment-ref-input').value,
                notes: document.getElementById('payment-notes-input').value,
                paymentReason: document.getElementById('payment-reason-select').value,
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
                    resetPaymentForm(); 
                    alert("Pending payment record updated successfully.");
                } else {
                    await submitPaymentRecord(paymentData, user);
                    resetPaymentForm(); 
                    alert("Payment record submitted for verification.");
                }
            } catch (error) {
                console.error("Error submitting payment record:", error);
                alert(`Failed to submit payment record: ${error.message}`);
            }
        });
    }

    

    // ==========================================================
    // --- IN-GRID UPDATE & CUSTOM EVENT LISTENERS ---
    // ==========================================================

    // --- [NEW] Listener for In-Grid Consignment Activity Logging ---
    document.addEventListener('logConsignmentActivity', async (e) => {
        const activityData = e.detail;
        const user = appState.currentUser;
        if (!user) return;

        console.log("Logging consignment activity with delta:", activityData);

        try {
            // Call the new, powerful transactional API function
            await logActivityAndUpdateConsignment(activityData, user);
            
            // The UI will update automatically via the onSnapshot listener.
            // We don't need to show a success alert here as it would be annoying
            // for every single cell change. The UI updating is the confirmation.

        } catch (error) {
            console.error("Error logging consignment activity:", error);
            alert(`Failed to save activity: ${error.message}`);
            // Here, we should ideally refresh the grid to revert the user's failed edit.
            refreshConsignmentDetailPanel(activityData.orderId);
        }
    });
    

    // --- Form and Input Listeners ---

    // Listener for the "Payment Type" dropdown
    const salePaymentTypeSelect = document.getElementById('sale-payment-type');
    if (salePaymentTypeSelect) {
        salePaymentTypeSelect.addEventListener('change', (e) => {
            const payNowContainer = document.getElementById('sale-pay-now-container');
            const showPayNow = e.target.value === 'Pay Now';
            payNowContainer.classList.toggle('hidden', !showPayNow);
        });
    }

    // Listener to recalculate change due when amount received is typed
    const amountReceivedInput = document.getElementById('sale-amount-received');
    if (amountReceivedInput) {
        amountReceivedInput.addEventListener('input', calculateSalesTotals);
    }

    // --- Main Form Submission Handler ---
    const newSaleForm = document.getElementById('new-sale-form');
    if (newSaleForm) {
        newSaleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = appState.currentUser;
            
            const cartItems = [];
            salesCartGridApi.forEachNode(node => {
                // [NEW] We need to capture all the fields for a complete record
                cartItems.push({
                    productId: node.data.productId,
                    productName: node.data.productName,
                    quantity: node.data.quantity || 0,
                    unitPrice: node.data.unitPrice || 0,
                    discountPercentage: node.data.discountPercentage || 0,
                    taxPercentage: node.data.taxPercentage || 0,
                });
            });

            if (cartItems.length === 0) {
                return alert("Please add at least one product to the cart.");
            }

        
        

            const store = document.getElementById('sale-store-select').value;
            
            const saleData = {
                store: store,
                customerInfo: {
                    name: document.getElementById('sale-customer-name').value,
                    email: document.getElementById('sale-customer-email').value,
                    phone: document.getElementById('sale-customer-phone').value,
                    // Only include the address if the store is Tasty Treats
                    address: store === 'Tasty Treats' ? document.getElementById('sale-customer-address').value : null
                },
                lineItems: cartItems,
                financials: {
                    subtotal: parseFloat(document.getElementById('sale-subtotal').textContent.replace('$', '')),
                    // [SIMPLIFIED] Save the discount as a percentage
                    orderDiscountPercentage: parseFloat(document.getElementById('sale-order-discount').value) || 0,
                    tax: parseFloat(document.getElementById('sale-tax').textContent.replace('$', '')),
                    totalAmount: totalAmount,
                }
            };

            let initialPaymentData = null;
            if (document.getElementById('sale-payment-type').value === 'Pay Now') {
                const amountReceived = parseFloat(document.getElementById('sale-amount-received').value) || 0;
                if (amountReceived < totalAmount) {
                    if (!confirm("The amount received is less than the total. Do you want to create a partially paid invoice?")) {
                        return;
                    }
                }
                initialPaymentData = {
                    amountPaid: amountReceived > totalAmount ? totalAmount : amountReceived,
                    paymentMode: document.getElementById('sale-payment-mode').value,
                };
                saleData.financials.amountTendered = amountReceived;
                saleData.financials.changeDue = amountReceived - totalAmount > 0 ? amountReceived - totalAmount : 0;
            }

            try {
                await createSaleAndUpdateInventory(saleData, initialPaymentData, user);
                alert("Sale completed successfully!");
                // Reset the form for the next sale
                showSalesView();
            } catch (error) {
                console.error("Error completing sale:", error);
                alert(`Sale failed: ${error.message}`);
            }
        });
    }








    ////--------------------------------------------*******************************

    //Admin Adds

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



    // --- In-Grid Update Custom Event Listeners ---

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
}






    //----------End of Admin event listeners-------------------






// --- APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Initializing...");
   
    // Add the RowGroupingModule to the array of modules to be registered.
    ModuleRegistry.registerModules([
        AllCommunityModule
    ]);


    initializeMasterDataListeners();

    initializeModals(); 

    setupEventListeners();
    // The initial UI update is now handled by the onAuthStateChanged listener
});
