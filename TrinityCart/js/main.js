// js/ui.js
import { appState } from './state.js';
import { navConfig } from './config.js';

import { createGrid } from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';

import { getSuppliers } from './api.js';
import { getSaleTypes } from './api.js';
import { getPaymentModes } from './api.js';

import { getProducts, getCategories } from './api.js';
import { getUsersWithRoles } from './api.js';
import { getSalesEvents, getSeasons } from './api.js';
import { getPaymentsForInvoice } from './api.js';
import { showModal } from './modal.js';





// Import the new masterData object at the top
import { masterData } from './masterData.js';
// We no longer need to import getCategories or getSeasons here for the dropdowns.
// import { getProducts, getCategories, getSeasons, ... } from './api.js';


import { SUPPLIERS_COLLECTION_PATH } from './config.js';
import { CATEGORIES_COLLECTION_PATH } from './config.js';
import { PAYMENT_MODES_COLLECTION_PATH } from './config.js';
import { SALE_TYPES_COLLECTION_PATH } from './config.js';
import { SEASONS_COLLECTION_PATH } from './config.js';
import { EVENTS_COLLECTION_PATH } from './config.js';
import { PRODUCTS_CATALOGUE_COLLECTION_PATH } from './config.js';

import { PURCHASE_INVOICES_COLLECTION_PATH, INVENTORY_LEDGER_COLLECTION_PATH, SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH } from './config.js';
import { SALES_CATALOGUES_COLLECTION_PATH, CHURCH_TEAMS_COLLECTION_PATH } from './config.js';

import {
    CONSIGNMENT_ORDERS_COLLECTION_PATH, CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH, SALES_COLLECTION_PATH,SALES_PAYMENTS_LEDGER_COLLECTION_PATH
} from './config.js';


// --- DOM ELEMENT REFERENCES ---
const views = document.querySelectorAll('.view');
const authContainer = document.getElementById('auth-container');
const viewTitle = document.getElementById('view-title');





const productsGridDiv = document.getElementById('products-catalogue-grid');

const itemCategorySelect = document.getElementById('itemCategory-select');
const unitPriceInput = document.getElementById('unitPrice-input');
const unitMarginInput = document.getElementById('unitMargin-input');
const sellingPriceDisplay = document.getElementById('sellingPrice-display');

// --- GRID DEFINITIONS ---
const rolesList = ['admin', 'sales_staff', 'inventory_manager', 'finance', 'team_lead', 'guest'];





// --- UPDATE THE GLOBAL EVENT LISTENER ---
document.addEventListener('masterDataUpdated', (e) => {
    const { type } = e.detail;

    if (type === 'categories') {
        // ... (existing logic for categories) ...
    }

    if (type === 'seasons') {
        // THE FIX: We no longer need to update the columns. We just need to
        // refresh the cells to make sure the valueFormatter runs again.
        if (salesEventsGridApi) {
            salesEventsGridApi.refreshCells({ force: true });
        }

        // This part for the form is still correct
        const parentSeasonSelect = document.getElementById('parentSeason-select');
        if (parentSeasonSelect) {
            // ... (logic to populate the form dropdown) ...
        }
    }


    if (type === 'paymentModes') {
        const paymentModeSelect = document.getElementById('payment-mode-select');
        if (paymentModeSelect) {
            paymentModeSelect.innerHTML = '<option value="">Select a mode...</option>';
            masterData.paymentModes.forEach(mode => {
                const option = document.createElement('option');
                option.value = mode.paymentMode;
                option.textContent = mode.paymentMode;
                paymentModeSelect.appendChild(option);
            });
        }
    }

});





// --- A NEW VARIABLE TO HOLD THE GRID API ---
let suppliersGridApi = null;
let isSuppliersGridInitialized = false;
let unsubscribeSuppliersListener = null;

const suppliersGridOptions = {
    columnDefs: [
        { field: "supplierId", headerName: "ID", width: 150 },
        { field: "supplierName", headerName: "Name", flex: 2, editable: true, minWidth: 150 },
        { field: "address", headerName: "Address", flex: 3, editable: true, minWidth: 200 },
        { field: "contactNo", headerName: "Contact No", flex: 1, editable: true, minWidth: 120 },
        { field: "contactEmail", headerName: "Email", flex: 1, editable: true, minWidth: 150 },
        { field: "creditTerm", headerName: "Credit Term", flex: 1, editable: true, minWidth: 100 },
        {
            field: "isActive",
            headerName: "Status",
            width: 120,
            cellRenderer: params => params.value ?
                '<span class="text-green-600 font-semibold">Active</span>' :
                '<span class="text-red-600 font-semibold">Inactive</span>'
        },
        {
            headerName: "Actions",
            width: 120,
            cellClass: 'flex items-center justify-center space-x-2',
            cellRenderer: (params) => {
                if (!params.data) return '';
                const docId = params.data.id;
                const isActive = params.data.isActive;
                const hasActivePurchases = params.data.hasActivePurchases;

                const deactivateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`;
                const activateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;

                let icon, buttonClass, tooltip, isDisabled = false;

                if (isActive) {
                    icon = deactivateIcon;
                    buttonClass = 'btn-deactivate';
                    tooltip = 'Deactivate Supplier';
                    // Check if the button should be disabled
                    if (hasActivePurchases) {
                        isDisabled = true;
                        tooltip = 'Cannot deactivate supplier with active purchases';
                    }
                } else {
                    icon = activateIcon;
                    buttonClass = 'btn-activate';
                    tooltip = 'Activate Supplier';
                }
                // Build the final button HTML using the variables
                const disabledAttribute = isDisabled ? 'disabled' : '';
                const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : '';

                return `<button 
                            class="action-btn-icon ${buttonClass} ${disabledClasses}" 
                            data-id="${docId}" 
                            title="${tooltip}" 
                            ${disabledAttribute}>
                                ${icon}
                        </button>`;

            },
            editable: false, sortable: false, filter: false,
        }
    ],
    defaultColDef: {
        sortable: true, filter: true, resizable: true,
    },
    rowData: [],
    rowClassRules: {
        'opacity-50': params => !params.data.isActive,
    },
    onGridReady: async (params) => {
        console.log("[ui.js] Suppliers Grid is ready!");
        suppliersGridApi = params.api;
    },
    onCellValueChanged: (params) => {
        const docId = params.data.id;
        const field = params.colDef.field;
        const newValue = params.newValue;
        document.dispatchEvent(new CustomEvent('updateSupplier', {
            detail: { docId, updatedData: { [field]: newValue } }
        }));
    }
};




// --- THE NEW INITIALIZATION FUNCTION ---
export function initializeSuppliersGrid() {
    // This function will now only be called ONCE.
    if (isSuppliersGridInitialized) {
        return;
    }
    const suppliersGridDiv = document.getElementById('suppliers-grid');
    if (suppliersGridDiv) {
        console.log("[ui.js] Initializing Suppliers Grid for the first time.");
        createGrid(suppliersGridDiv, suppliersGridOptions);
        isSuppliersGridInitialized = true;
    }
}

// This is our new central function to clean up ALL listeners.
export function detachAllRealtimeListeners() {
    if (unsubscribeSuppliersListener) {
        console.log("[ui.js] Detaching real-time suppliers listener.");
        unsubscribeSuppliersListener(); // This is the function Firestore gives us to stop listening.
        unsubscribeSuppliersListener = null;
    }
    if (unsubscribeProductsListener) {
        console.log("[ui.js] Detaching real-time products listener.");
        unsubscribeProductsListener();
        unsubscribeProductsListener = null;
    }
    // As we add more real-time grids, we'll add their unsubscribe calls here.
    // if (unsubscribeProductsListener) { unsubscribeProductsListener(); }
    if (unsubscribeCategoriesListener) {
        console.log("[ui.js] Detaching real-time categories listener.");
        unsubscribeCategoriesListener();
        unsubscribeCategoriesListener = null;
    }

    if (unsubscribePaymentModesListener) {
        console.log("[ui.js] Detaching real-time payment modes listener.");
        unsubscribePaymentModesListener();
        unsubscribePaymentModesListener = null;
    }
    if (unsubscribeSaleTypesListener) {
        console.log("[ui.js] Detaching real-time sale types listener.");
        unsubscribeSaleTypesListener();
        unsubscribeSaleTypesListener = null;
    }
    if (unsubscribeSeasonsListener) {
        console.log("[ui.js] Detaching real-time seasons listener.");
        unsubscribeSeasonsListener();
        unsubscribeSeasonsListener = null;
    }
    if (unsubscribeSalesEventsListener) {
        console.log("[ui.js] Detaching real-time sales events listener.");
        unsubscribeSalesEventsListener();
        unsubscribeSalesEventsListener = null;
    }

    if (unsubscribeInvoicesListener) {
        console.log("[ui.js] Detaching real-time invoices listener.");
        unsubscribeInvoicesListener();
        unsubscribeInvoicesListener = null;
    }
    if (unsubscribePaymentsListener) {
        console.log("[ui.js] Detaching real-time payments listener.");
        unsubscribePaymentsListener();
        unsubscribePaymentsListener = null;
    }

    if (unsubscribeExistingCataloguesListener) {
        console.log("[ui.js] Detaching real-time existing catalogues listener.");
        unsubscribeExistingCataloguesListener();
        unsubscribeExistingCataloguesListener = null;
    }

    if (unsubscribeCatalogueItemsListener) {
        console.log("[ui.js] Detaching real-time catalogue items listener.");
        unsubscribeCatalogueItemsListener();
        unsubscribeCatalogueItemsListener = null;
    }

    if (unsubscribeChurchTeamsListener) {
        console.log("[ui.js] Detaching real-time church teams listener.");
        unsubscribeChurchTeamsListener();
        unsubscribeChurchTeamsListener = null;
    }
    if (unsubscribeTeamMembersListener) {
        console.log("[ui.js] Detaching real-time team members listener.");
        unsubscribeTeamMembersListener();
        unsubscribeTeamMembersListener = null;
    }

    if (unsubscribeConsignmentOrdersListener) {
        console.log("[ui.js] Detaching real-time consignment orders listener.");
        unsubscribeConsignmentOrdersListener();
        unsubscribeConsignmentOrdersListener = null;
    }

    if (unsubscribeSalesHistoryListener) {
        console.log("[ui.js] Detaching real-time sales history listener.");
        unsubscribeSalesHistoryListener();
        unsubscribeSalesHistoryListener = null;
    }

    unsubscribeConsignmentDetailsListeners.forEach(unsub => unsub());
    unsubscribeConsignmentDetailsListeners = [];

}

/**
 * [NEW] Formats a number as a currency string using the system-defined currency symbol.
 * @param {number} value - The number to format.
 * @returns {string} The formatted currency string (e.g., "₹1,250.00").
 */
export function formatCurrency(value) {
    // Get the currency symbol from the cached master data, defaulting to '$' if not found.
    const currencySymbol = masterData.systemSetups?.systemCurrency || '$';
    
    // Ensure we are working with a valid number.
    const numberValue = Number(value) || 0;

    // Use Intl.NumberFormat for proper formatting, including commas.
    // This is more robust than just toFixed(2).
    const formatter = new Intl.NumberFormat('en-IN', { // 'en-IN' is good for Indian numbering system
        style: 'currency',
        currency: 'INR', // Use 'INR' for Rupee, 'USD' for Dollar, etc.
        currencyDisplay: 'symbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    // The formatter will produce "₹1,250.00". We can use a regex to replace
    // the standard symbol with our custom one if needed, but for INR it's usually correct.
    // For now, let's stick to the standard formatter's output.
    return formatter.format(numberValue).replace('₹', currencySymbol);
}


export async function showSuppliersView() {
    console.log("[ui.js] showSuppliersView() called. Attempting to fetch data...");
    showView('suppliers-view');

    // 1. Initialize the grid if it's the first time viewing this page.
    initializeSuppliersGrid();

    const waitForGrid = setInterval(() => {
        if (suppliersGridApi) {
            clearInterval(waitForGrid); // Stop checking once the grid is ready.

            console.log("[ui.js] Grid is ready. Attaching real-time suppliers listener.");
            const db = firebase.firestore();
            suppliersGridApi.setGridOption('loading', true);

            // Attach the real-time listener and store the "unsubscribe" function it returns.
            unsubscribeSuppliersListener = db.collection(SUPPLIERS_COLLECTION_PATH)
                .orderBy('supplierName')
                .onSnapshot(snapshot => {
                    console.log("[Firestore] Received real-time update for suppliers.");
                    const suppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    suppliersGridApi.setGridOption('rowData', suppliers);
                    suppliersGridApi.setGridOption('loading', false);
                }, error => {
                    console.error("Error with suppliers real-time listener:", error);
                    suppliersGridApi.setGridOption('loading', false);
                    suppliersGridApi.showNoRowsOverlay();
                });
        }
    }, 50); // Check every 50ms

}



let categoriesGridApi = null;
let isCategoriesGridInitialized = false;
let unsubscribeCategoriesListener = null;

const categoriesGridOptions = {
    columnDefs: [
        { field: "categoryId", headerName: "ID", width: 150 },
        { field: "categoryName", headerName: "Category Name", flex: 1, editable: true },
        {
            field: "isActive", headerName: "Status", width: 120,
            cellRenderer: p => p.value ?
                '<span class="text-green-600 font-semibold">Active</span>' :
                '<span class="text-red-600 font-semibold">Inactive</span>'
        },
        {
            headerName: "Actions", width: 120,
            cellClass: 'flex items-center justify-center space-x-2',
            cellRenderer: params => {
                if (!params.data) return '';
                const docId = params.data.id;
                const isActive = params.data.isActive;

                const deactivateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`;
                const activateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;

                // Determine which icon, class, and tooltip to use
                let icon, buttonClass, tooltip;

                if (isActive) {
                    icon = deactivateIcon;
                    buttonClass = 'btn-deactivate';
                    tooltip = 'Deactivate Category';
                } else {
                    icon = activateIcon;
                    buttonClass = 'btn-activate';
                    tooltip = 'Activate Category';
                }
                return `<button 
                            class="action-btn-icon ${buttonClass}" 
                            data-id="${docId}" 
                            title="${tooltip}">
                                ${icon}
                        </button>`;
            },
            editable: false, sortable: false, filter: false,
        }
    ],
    defaultColDef: { resizable: true, sortable: true, filter: true },
    rowData: [],
    onCellValueChanged: (params) => {
        document.dispatchEvent(new CustomEvent('updateCategory', {
            detail: { docId: params.data.id, updatedData: { categoryName: params.newValue } }
        }));
    },
    onGridReady: async (params) => {
        console.log("[ui.js] categoriesGridOptions is now ready.");
        categoriesGridApi = params.api;
    }
};

export function initializeCategoriesGrid() {
    // THE FIX: Only check the flag and get the correct div element.
    if (isCategoriesGridInitialized) return;
    const categoriesGridDiv = document.getElementById('categories-grid');
    if (categoriesGridDiv) {
        console.log("[ui.js] Initializing Category Grid for the first time.");
        createGrid(categoriesGridDiv, categoriesGridOptions);
        isCategoriesGridInitialized = true;
    }
}

export async function showCategoriesView() {

    console.log("[ui.js] showCategoriesView called.");

    showView('categories-view');
    initializeCategoriesGrid();

    const waitForGrid = setInterval(() => {
        if (categoriesGridApi) {
            clearInterval(waitForGrid);

            console.log("[ui.js] Grid is ready. Attaching real-time categories listener.");
            const db = firebase.firestore();
            categoriesGridApi.setGridOption('loading', true);

            console.log('[categories-grid is action] app state:', appState.isLocalUpdateInProgress);

            unsubscribeCategoriesListener = db.collection(CATEGORIES_COLLECTION_PATH)
                .orderBy('categoryName')
                .onSnapshot(snapshot => {
                    console.log("[Firestore] Received real-time update for categories.");
                    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    categoriesGridApi.setGridOption('rowData', categories);
                    categoriesGridApi.setGridOption('loading', false);
                }, error => {
                    console.error("Error with categories real-time listener:", error);
                    categoriesGridApi.setGridOption('loading', false);
                    categoriesGridApi.showNoRowsOverlay();
                });
        }
    }, 50);
}


let saleTypesGridApi = null;
let isSaleTypesGridInitialized = false;
let unsubscribeSaleTypesListener = null;

const saleTypesGridOptions = {
    columnDefs: [
        { field: "saleTypeId", headerName: "ID", width: 150 },
        { field: "saleTypeName", headerName: "Sale Type Name", flex: 1, editable: true },
        {
            field: "isActive", headerName: "Status", width: 120,
            cellRenderer: p => p.value ?
                '<span class="text-green-600 font-semibold">Active</span>' :
                '<span class="text-red-600 font-semibold">Inactive</span>'
        },
        {
            headerName: "Actions", width: 120, cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const icon = params.data.isActive
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;
                const buttonClass = params.data.isActive ? 'btn-deactivate' : 'btn-activate';
                const tooltip = params.data.isActive ? 'Deactivate Sale Type' : 'Activate Sale Type';
                return `<button class="${buttonClass}" data-id="${params.data.id}" title="${tooltip}">${icon}</button>`;
            }
        }
    ],
    defaultColDef: { resizable: true, sortable: true, filter: true },
    onCellValueChanged: (params) => {
        document.dispatchEvent(new CustomEvent('updateSaleType', {
            detail: { docId: params.data.id, updatedData: { saleTypeName: params.newValue } }
        }));
    },
    onGridReady: async (params) => {
        console.log("[ui.js] Sales Type Grid is now ready.");
        saleTypesGridApi = params.api;
    }
};



export function initializeSaleTypesGrid() {
    if (isSaleTypesGridInitialized) return;
    const saleTypesGridDiv = document.getElementById('sale-types-grid');
    if (saleTypesGridDiv) {
        console.log("[ui.js] Initializing Sales Type Grid for the first time.");
        createGrid(saleTypesGridDiv, saleTypesGridOptions);
        isSaleTypesGridInitialized = true;
    }
}

export async function showSaleTypesView() {
    console.log("[ui.js] showSaleTypesView called.");
    showView('sale-types-view');
    initializeSaleTypesGrid();

    const waitForGrid = setInterval(() => {
        if (saleTypesGridApi) {
            clearInterval(waitForGrid);

            console.log("[ui.js] Grid is ready. Attaching real-time sale types listener.");
            const db = firebase.firestore();
            saleTypesGridApi.setGridOption('loading', true);

            unsubscribeSaleTypesListener = db.collection(SALE_TYPES_COLLECTION_PATH)
                .orderBy('saleTypeName')
                .onSnapshot(snapshot => {
                    console.log("[Firestore] Received real-time update for sale types.");
                    const saleTypes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    saleTypesGridApi.setGridOption('rowData', saleTypes);
                    saleTypesGridApi.setGridOption('loading', false);
                }, error => {
                    console.error("Error with sale types real-time listener:", error);
                    saleTypesGridApi.setGridOption('loading', false);
                    saleTypesGridApi.showNoRowsOverlay();
                });
        }
    }, 50);

}



let paymentModesGridApi = null;
let isPaymentModesGridInitialized = false;
let unsubscribePaymentModesListener = null;


const paymentModesGridOptions = {
    columnDefs: [
        { field: "paymentTypeId", headerName: "ID", width: 150 },
        { field: "paymentMode", headerName: "Payment Mode", flex: 1, editable: true },
        {
            field: "isActive", headerName: "Status", width: 120,
            cellRenderer: p => p.value ?
                '<span class="text-green-600 font-semibold">Active</span>' :
                '<span class="text-red-600 font-semibold">Inactive</span>'
        },
        {
            headerName: "Actions", width: 120, cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const icon = params.data.isActive
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;
                const buttonClass = params.data.isActive ? 'btn-deactivate' : 'btn-activate';
                const tooltip = params.data.isActive ? 'Deactivate Sale Type' : 'Activate Sale Type';
                return `<button class="${buttonClass}" data-id="${params.data.id}" title="${tooltip}">${icon}</button>`;
            }
        }
    ],
    defaultColDef: { resizable: true, sortable: true, filter: true },
    onCellValueChanged: (params) => {
        document.dispatchEvent(new CustomEvent('updatePaymentMode', {
            detail: { docId: params.data.id, updatedData: { paymentMode: params.newValue } }
        }));
    },
    onGridReady: async (params) => {
        console.log("[ui.js] Payment Modes Grid is now ready.");
        paymentModesGridApi = params.api;
    }

}

export function initializePaymentModesGrid() {
    // THE FIX: Only check the flag and get the correct div element.
    if (isPaymentModesGridInitialized) return;
    const paymentModesGridDiv = document.getElementById('payment-modes-grid');
    if (paymentModesGridDiv) {
        console.log("[ui.js] Initializing Payment Modes Grid for the first time.");
        createGrid(paymentModesGridDiv, paymentModesGridOptions);
        isPaymentModesGridInitialized = true;
    }
}

export async function showPaymentModesView() {
    console.log("ui.js: initializePaymentModesGrid");
    showView('payment-modes-view');
    initializePaymentModesGrid();
    const waitForGrid = setInterval(() => {
        if (paymentModesGridApi) {
            clearInterval(waitForGrid);

            console.log("[ui.js] Grid is ready. Attaching real-time payment modes listener.");
            const db = firebase.firestore();
            paymentModesGridApi.setGridOption('loading', true);

            unsubscribePaymentModesListener = db.collection(PAYMENT_MODES_COLLECTION_PATH)
                .orderBy('paymentMode')
                .onSnapshot(snapshot => {
                    console.log("[Firestore] Received real-time update for payment modes.");
                    const paymentModes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    paymentModesGridApi.setGridOption('rowData', paymentModes);
                    paymentModesGridApi.setGridOption('loading', false);
                }, error => {
                    console.error("Error with payment modes real-time listener:", error);
                    paymentModesGridApi.setGridOption('loading', false);
                    paymentModesGridApi.showNoRowsOverlay();
                });
        }
    }, 50);
}


let seasonsGridApi = null;
let isSeasonsGridInitialized = false;
let unsubscribeSeasonsListener = null;


const seasonsGridOptions = {
    columnDefs: [
        { field: "seasonId", headerName: "ID", width: 180 },
        { field: "seasonName", headerName: "Season Name", flex: 2, editable: true },
        {
            field: "startDate", headerName: "Start Date", flex: 1,
            valueFormatter: p => p.value ? p.value.toDate().toLocaleDateString() : ''
        },
        {
            field: "endDate", headerName: "End Date", flex: 1,
            valueFormatter: p => p.value ? p.value.toDate().toLocaleDateString() : ''
        },
        {
            field: "status", headerName: "Status", flex: 1, editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: { values: ['Upcoming', 'Active', 'Archived'] }
        },
        {
            field: "isActive", headerName: "Active", width: 120,
            cellRenderer: p => p.value ?
                '<span class="text-green-600 font-semibold">Active</span>' :
                '<span class="text-red-600 font-semibold">Inactive</span>'
        },
        {
            headerName: "Actions", width: 120, cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const icon = params.data.isActive
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;
                const buttonClass = params.data.isActive ? 'btn-deactivate' : 'btn-activate';
                const tooltip = params.data.isActive ? 'Deactivate Sale Type' : 'Activate Sale Type';
                return `<button class="${buttonClass}" data-id="${params.data.id}" title="${tooltip}">${icon}</button>`;
            }
        }
    ],
    defaultColDef: { resizable: true, sortable: true, filter: true },
    onCellValueChanged: (params) => {
        const { id } = params.data;
        const field = params.colDef.field;
        const newValue = params.newValue;
        document.dispatchEvent(new CustomEvent('updateSeason', {
            detail: { docId: id, updatedData: { [field]: newValue } }
        }));
    },
    onGridReady: async (params) => {
        console.log("[ui.js] Seasons Grid is now ready.");
        seasonsGridApi = params.api;
    }
};

export function initializeSeasonsGrid() {
    if (isSeasonsGridInitialized) return;
    const seasonsGridDiv = document.getElementById('seasons-grid');

    if (seasonsGridDiv) {
        console.log("[ui.js] Initializing Seasons Grid for the first time.");
        createGrid(seasonsGridDiv, seasonsGridOptions);
        isSeasonsGridInitialized = true;
    }

}

export async function showSeasonsView() {
    console.log("ui.js: initializeSeasonsGrid");
    showView('seasons-view');
    initializeSeasonsGrid();

    const waitForGrid = setInterval(() => {
        if (seasonsGridApi) {
            clearInterval(waitForGrid);

            console.log("[ui.js] Grid is ready. Attaching real-time seasons listener.");
            const db = firebase.firestore();
            seasonsGridApi.setGridOption('loading', true);

            unsubscribeSeasonsListener = db.collection(SEASONS_COLLECTION_PATH)
                .orderBy('startDate', 'desc')
                .onSnapshot(snapshot => {
                    console.log("[Firestore] Received real-time update for seasons.");
                    const seasons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    seasonsGridApi.setGridOption('rowData', seasons);
                    seasonsGridApi.setGridOption('loading', false);
                }, error => {
                    console.error("Error with seasons real-time listener:", error);
                    seasonsGridApi.setGridOption('loading', false);
                    seasonsGridApi.showNoRowsOverlay();
                });
        }
    }, 50);

}



let salesEventsGridApi = null;
let isSalesEventsGridInitialized = false;
let unsubscribeSalesEventsListener = null;



const salesEventsGridOptions = {
    columnDefs: [
        { field: "eventId", headerName: "ID", width: 180 },
        { field: "eventName", headerName: "Event Name", flex: 2, editable: true },
        {
            field: "seasonId", // The field in our data is the ID
            headerName: "Parent Season",
            flex: 1,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: (params) => {
                const seasonIds = masterData.seasons.map(s => s.id);
                return {
                    values: seasonIds,
                    // This renderer is still needed to show names in the dropdown list
                    cellRenderer: (cellParams) => {
                        const season = masterData.seasons.find(s => s.id === cellParams.value);
                        return season ? season.seasonName : cellParams.value;
                    }
                };
            },
            // This formatter converts the ID to a Name for display in the grid cell
            valueFormatter: params => {
                const season = masterData.seasons.find(s => s.id === params.value);
                return season ? season.seasonName : params.value;
            }
        },
        {
            field: "eventStartDate", headerName: "Start Date", flex: 1,
            valueFormatter: p => p.value ? p.value.toDate().toLocaleDateString() : ''
        },
        {
            field: "eventEndDate", headerName: "End Date", flex: 1,
            valueFormatter: p => p.value ? p.value.toDate().toLocaleDateString() : ''
        },
        {
            field: "isActive", headerName: "Active", width: 120,
            cellRenderer: p => p.value ?
                '<span class="text-green-600 font-semibold">Active</span>' :
                '<span class="text-red-600 font-semibold">Inactive</span>'
        },
        {
            headerName: "Actions", width: 120, cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const icon = params.data.isActive
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;
                const buttonClass = params.data.isActive ? 'btn-deactivate' : 'btn-activate';
                const tooltip = params.data.isActive ? 'Deactivate Sale Type' : 'Activate Sale Type';
                return `<button class="${buttonClass}" data-id="${params.data.id}" title="${tooltip}">${icon}</button>`;
            }
        }
    ],
    defaultColDef: { resizable: true, sortable: true, filter: true },
    onCellValueChanged: (params) => {
        const docId = params.data.id;
        const field = params.colDef.field;
        const newValue = params.newValue;

        let updatedData = { [field]: newValue };
        // If the season was changed, we also need to update the denormalized seasonName
        if (field === 'seasonId') {
            const season = masterData.seasons.find(s => s.id === newValue);
            if (season) {
                updatedData.seasonName = season.seasonName;
            }
        }
        document.dispatchEvent(new CustomEvent('updateSalesEvent', {
            detail: { docId, updatedData }
        }));
    },
    onGridReady: async (params) => {
        console.log("[ui.js] Sales Event Grid is now ready.");
        salesEventsGridApi = params.api;
    }
};

// --- UI FUNCTIONS ---
export function initializeSalesEventsGrid() {
    if (isSalesEventsGridInitialized) return;
    const salesEventsGridDiv = document.getElementById('sales-events-grid');

    if (salesEventsGridDiv) {
        console.log("[ui.js] Initializing Sales Events Grid for the first time.");
        createGrid(salesEventsGridDiv, salesEventsGridOptions);
        isSalesEventsGridInitialized = true;
    }
}


export async function showSalesEventsView() {
    showView('sales-events-view');
    initializeSalesEventsGrid();

    const parentSeasonSelect = document.getElementById('parentSeason-select');
    parentSeasonSelect.innerHTML = '<option value="">Select a parent season...</option>';
    masterData.seasons.forEach(season => {
        const option = document.createElement('option');
        option.value = JSON.stringify({ seasonId: season.id, seasonName: season.seasonName });
        option.textContent = season.seasonName;
        parentSeasonSelect.appendChild(option);
    });


    const waitForGrid = setInterval(() => {
        if (salesEventsGridApi) {
            clearInterval(waitForGrid);

            console.log("[ui.js] Grid is ready. Attaching real-time sales events listener.");
            const db = firebase.firestore();
            salesEventsGridApi.setGridOption('loading', true);

            // Attach the real-time listener
            unsubscribeSalesEventsListener = db.collection(EVENTS_COLLECTION_PATH)
                .orderBy('eventStartDate', 'desc')
                .onSnapshot(snapshot => {
                    console.log("[Firestore] Received real-time update for sales events.");
                    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    salesEventsGridApi.setGridOption('rowData', events);
                    salesEventsGridApi.setGridOption('loading', false);
                }, error => {
                    console.error("Error with sales events real-time listener:", error);
                    salesEventsGridApi.setGridOption('loading', false);
                    salesEventsGridApi.showNoRowsOverlay();
                });
        }
    }, 50);


}









const usersGridOptions = {
    columnDefs: [
        { field: "displayName", headerName: "Name", flex: 2 },
        { field: "email", headerName: "Email", flex: 2 },
        {
            field: "role",
            headerName: "Role",
            flex: 1,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: { values: rolesList }
        },
        {
            field: "isActive", headerName: "Status", width: 120,
            cellRenderer: p => p.value ? 'Active' : 'Inactive'
        },
        {
            headerName: "Actions", width: 120, cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const actionText = params.data.isActive ? 'Deactivate' : 'Activate';
                const buttonClass = params.data.isActive ? 'btn-deactivate' : 'btn-activate';
                return `<button class="${buttonClass}" data-id="${params.data.id}">${actionText}</button>`;
            }
        }
    ],
    defaultColDef: { resizable: true, sortable: true, filter: true },
    onCellValueChanged: (params) => {
        // This event handles role changes from the dropdown
        document.dispatchEvent(new CustomEvent('updateUserRole', {
            detail: { uid: params.data.id, newRole: params.newValue }
        }));
    },
    onGridReady: async (params) => {
        console.log("[ui.js] User Grid is now ready.");
        usersGridApi = params.api;

        try {
            usersGridApi.setGridOption('loading', true);
            const users = await getUsersWithRoles();
            usersGridApi.setGridOption('rowData', users);
            usersGridApi.setGridOption('loading', false);
        } catch (error) {
            console.error("Error loading users:", error);
            usersGridApi.setGridOption('loading', false);
            usersGridApi.showNoRowsOverlay();
        }
    }
};


let usersGridApi = null;
let isUsersGridInitialized = false;


export function initializeUsersGrid() {
    if (isUsersGridInitialized) return;

    const usersGridDiv = document.getElementById('users-grid');

    if (usersGridDiv) {
        console.log("[ui.js] Initializing User Grid for the first time.");
        usersGridApi = createGrid(usersGridDiv, usersGridOptions);
        isUsersGridInitialized = true;
    }
}

export async function showUsersView() {
    console.log("ui.js: initializeUsersGrid");
    showView('users-view');
    initializeUsersGrid();
}


export async function refreshUsersGrid() {
    if (!usersGridApi) return;
    try {
        usersGridApi.setGridOption('loading', true);
        const users = await getUsersWithRoles();
        usersGridApi.setGridOption('rowData', users);
        usersGridApi.setGridOption('loading', false);
    } catch (error) {
        console.error("Error refreshing users:", error);
        usersGridApi.setGridOption('loading', false);
        usersGridApi.showNoRowsOverlay();
    }
}



// =======================================================
// --- CHURCH TEAM MANAGEMENT UI ---
// =======================================================

// 1. Define variables for the new grid APIs and state
let churchTeamsGridApi = null;
let teamMembersGridApi = null;
let isChurchTeamsGridsInitialized = false;
let unsubscribeChurchTeamsListener = null;
let unsubscribeTeamMembersListener = null;
let selectedTeamId = null; // To track the currently selected team

/**
 * Resets the team detail panel to its initial, empty state.
 */
function resetTeamDetailView() {
    console.log("[ui.js] Resetting team detail view.");

    // 1. Clear the selected team ID from the state.
    selectedTeamId = null;

    // 2. Reset the UI elements.
    document.getElementById('selected-team-name').textContent = '...';
    document.getElementById('add-member-btn').disabled = true;

    // 3. Clear the members grid.
    if (teamMembersGridApi) {
        teamMembersGridApi.setGridOption('rowData', []);
    }

    // 4. Detach the listener for the members sub-collection to prevent memory leaks.
    if (unsubscribeTeamMembersListener) {
        unsubscribeTeamMembersListener();
        unsubscribeTeamMembersListener = null;
    }
}


// 2. Define the AG-Grid options for the MASTER grid (All Teams)
const churchTeamsGridOptions = {
    getRowId: params => params.data.id,
    columnDefs: [
        { field: "teamName", headerName: "Team Name", flex: 1, editable: true },
        {
            headerName: "Team Lead",
            flex: 1,
            // This will be populated later once we can identify the lead
            valueGetter: params => params.data.teamLeadName || 'Not Assigned'
        },
        {
            field: "isActive",
            headerName: "Status",
            width: 120,
            cellRenderer: p => p.value ?
                '<span class="text-green-600 font-semibold">Active</span>' :
                '<span class="text-red-600 font-semibold">Inactive</span>'
        },
        {
            headerName: "Actions", width: 120, cellClass: 'flex items-center justify-center space-x-2',
            cellRenderer: params => {
                const docId = params.data.id;
                const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" /></svg>`; // Your edit icon SVG
                const statusIcon = params.data.isActive
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;
                return `
                    <button class="action-btn-icon action-btn-toggle-team-status" data-id="${docId}" title="${params.data.isActive ? 'Deactivate' : 'Activate'}">${statusIcon}</button>
                `;
            }
        }
    ],
    rowSelection: {
        mode: 'singleRow'
    },
    onGridReady: params => { churchTeamsGridApi = params.api; },
    onCellValueChanged: params => {
        // Handle inline editing of the team name
        document.dispatchEvent(new CustomEvent('updateChurchTeam', {
            detail: { teamId: params.data.id, updatedData: { teamName: params.newValue } }
        }));
    },
    onRowSelected: event => {
        const selectedNode = event.node;
        if (selectedNode.isSelected()) {
            // A team has been selected in the master grid
            const teamData = selectedNode.data;
            selectedTeamId = teamData.id;
            document.getElementById('selected-team-name').textContent = teamData.teamName;
            document.getElementById('add-member-btn').disabled = false; // Enable the "Add Member" button
            loadMembersForTeam(teamData.id); // Load the members for this team
        } else {
            // --- A ROW WAS UNCHECKED (DESELECTED) ---
            // This is the new logic that fixes the bug.
            // We will call a helper function to reset the detail panel.
            resetTeamDetailView();
        }
    }
};

// 3. Define the AG-Grid options for the DETAIL grid (Team Members)
const teamMembersGridOptions = {
    getRowId: params => params.data.id,
    columnDefs: [
        { field: "name", headerName: "Name", flex: 1 },
        { field: "email", headerName: "Email", flex: 1 },
        { field: "phone", headerName: "Phone", flex: 1 },
        { field: "role", headerName: "Role", width: 150 },
        {
            headerName: "Actions", width: 120, cellClass: 'flex items-center justify-center space-x-2',
            cellRenderer: params => {
                const docId = params.data.id;

                const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" /></svg>`; // Your edit icon SVG            
                const removeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
                return `
                    <button class="action-btn-icon action-btn-edit-member" data-id="${docId}" title="Edit Member">${editIcon}</button>
                    <button class="action-btn-icon action-btn-delete action-btn-remove-member" data-id="${docId}" title="Remove Member">${removeIcon}</button>
                `;
            }
        }
    ],
    onGridReady: params => { teamMembersGridApi = params.api; }
};

/**
 * [NEW] Gets the data for a specific member row from the team members grid.
 * @param {string} memberId - The document ID of the member.
 * @returns {object|null} The member's data object or null if not found.
 */
export function getMemberDataFromGridById(memberId) {
    if (!teamMembersGridApi) {
        console.error("Cannot get member data: teamMembersGridApi is not ready.");
        return null;
    }
    const rowNode = teamMembersGridApi.getRowNode(memberId);
    return rowNode ? rowNode.data : null;
}

export function getTeamDataFromGridById(teamId) {
    if (!churchTeamsGridApi) return null;
    const rowNode = churchTeamsGridApi.getRowNode(teamId);
    return rowNode ? rowNode.data : null;
}

// 4. Create the initialization function
export function initializeChurchTeamsGrids() {
    if (isChurchTeamsGridsInitialized) return;

    const teamsGridDiv = document.getElementById('church-teams-grid');
    const membersGridDiv = document.getElementById('team-members-grid');

    if (teamsGridDiv && membersGridDiv) {
        createGrid(teamsGridDiv, churchTeamsGridOptions);
        createGrid(membersGridDiv, teamMembersGridOptions);
        isChurchTeamsGridsInitialized = true;
    }
}

// 5. Create the function to load members for a selected team
function loadMembersForTeam(teamId) {
    if (unsubscribeTeamMembersListener) {
        unsubscribeTeamMembersListener(); // Detach listener from any previously selected team
    }
    if (!teamMembersGridApi) return;

    const db = firebase.firestore();
    teamMembersGridApi.setGridOption('loading', true);

    unsubscribeTeamMembersListener = db.collection(CHURCH_TEAMS_COLLECTION_PATH).doc(teamId).collection('members')
        .orderBy('name')
        .onSnapshot(snapshot => {
            const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            teamMembersGridApi.setGridOption('rowData', members);
            teamMembersGridApi.setGridOption('loading', false);
        }, error => {
            console.error(`Error listening to members for team ${teamId}:`, error);
            teamMembersGridApi.setGridOption('loading', false);
        });
}

// 6. Create the main view function
export function showChurchTeamsView() {
    showView('church-teams-view');
    initializeChurchTeamsGrids();

    // Populate the read-only church name field from the app state
    document.getElementById('team-churchName-input').value = appState.ChurchName;

    // Reset detail view
    document.getElementById('selected-team-name').textContent = '...';
    document.getElementById('add-member-btn').disabled = true;
    if (teamMembersGridApi) teamMembersGridApi.setGridOption('rowData', []);
    selectedTeamId = null;

    // Attach the real-time listener for the master grid
    const db = firebase.firestore();
    unsubscribeChurchTeamsListener = db.collection(CHURCH_TEAMS_COLLECTION_PATH)
        .orderBy('teamName')
        .onSnapshot(snapshot => {
            const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // We can add logic here to find the team lead name and count members later
            if (churchTeamsGridApi) {
                churchTeamsGridApi.setGridOption('rowData', teams);
            }
        });
}


// 8. Create functions to manage the Add/Edit Member modal
export function showMemberModal(memberData = null) {
    const modal = document.getElementById('member-modal');
    const form = document.getElementById('member-form');
    const title = document.getElementById('member-modal-title');
    const submitBtn = document.getElementById('member-form-submit-btn');

    form.reset();
    document.getElementById('member-team-id').value = selectedTeamId;

    if (memberData) { // Editing existing member
        title.textContent = 'Edit Team Member';
        submitBtn.textContent = 'Update Member';
        document.getElementById('member-doc-id').value = memberData.id;
        document.getElementById('member-name-input').value = memberData.name;
        document.getElementById('member-email-input').value = memberData.email;
        document.getElementById('member-phone-input').value = memberData.phone;
        document.getElementById('member-role-select').value = memberData.role;
    } else { // Adding new member
        title.textContent = 'Add New Member';
        submitBtn.textContent = 'Add Member';
        document.getElementById('member-doc-id').value = '';
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

export function closeMemberModal() {
    const modal = document.getElementById('member-modal');
    modal.classList.remove('visible');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

/**
 * [SIMPLIFIED] Handles switching between the tabs in the consignment detail view.
 * @param {string} tabId - The ID of the tab that was clicked.
 */
export function switchConsignmentTab_bk(tabId) {
    // --- 1. Handle Tab Visuals ---
    document.querySelectorAll('.consignment-tab').forEach(tab => {
        tab.classList.toggle('tab-active', tab.id === tabId);
    });

    // --- 2. Handle Panel Visibility ---
    document.querySelectorAll('.consignment-tab-panel').forEach(panel => {
        const shouldBeActive = panel.id.includes(tabId.replace('tab-', ''));
        panel.classList.toggle('active', shouldBeActive);
    });

    const orderId = appState.selectedConsignmentId;
    if (!orderId) return;

    const db = firebase.firestore();
    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(orderId);

    // 3. If the "Payments" tab was just made active, attach its listeners.
    if (tabId === 'tab-consignment-payments') {
        // A. Listener for the "Payment History" grid (bottom grid)
        if (consignmentPaymentsGridApi) consignmentPaymentsGridApi.setGridOption('loading', true);
        const paymentsUnsub = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('orderId', '==', orderId)
            .orderBy('paymentDate', 'desc')
            .onSnapshot(snapshot => {
                const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (consignmentPaymentsGridApi) {
                    consignmentPaymentsGridApi.setGridOption('rowData', payments);
                    consignmentPaymentsGridApi.setGridOption('loading', false);
                }
            });

        // Store these listeners so they can be cleaned up later.
        unsubscribeConsignmentDetailsListeners.push(paymentsUnsub);
    }

}

/**
 * [CORRECTED & SIMPLIFIED] Handles switching the visual state of tabs and panels.
 * It no longer loads data, as that is handled by renderConsignmentDetail.
 */
export function switchConsignmentTab(tabId) {
    // 1. Handle Tab Visuals
    document.querySelectorAll('.consignment-tab').forEach(tab => {
        tab.classList.toggle('tab-active', tab.id === tabId);
    });

    // 2. Handle Panel Visibility
    document.querySelectorAll('.consignment-tab-panel').forEach(panel => {
        const shouldBeActive = panel.id.includes(tabId.replace('tab-', ''));
        panel.classList.toggle('active', shouldBeActive);
    });
}











///above is the admin modules 









let productsGridApi = null;
let isProductsGridInitialized = false;
let unsubscribeProductsListener = null;

const productsGridOptions = {
    getRowId: params => params.data.id,
    columnDefs: [
        { field: "itemId", headerName: "ID", width: 150 },
        { field: "itemName", headerName: "Item Name", flex: 2, editable: true },
        {
            field: "categoryId",
            headerName: "Category",
            flex: 1,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: (params) => {
                const categoryIds = masterData.categories.map(c => c.id);
                return {
                    values: categoryIds,
                    cellRenderer: (cellParams) => {
                        const category = masterData.categories.find(c => c.id === cellParams.value);
                        return category ? category.categoryName : cellParams.value;
                    }
                };
            },
            editable: true,
            // This formatter converts the ID to a Name for display in the grid
            valueFormatter: params => {
                const category = masterData.categories.find(c => c.id === params.value);
                return category ? category.categoryName : params.value;
            }
        },
        {
            field: "inventoryCount",
            headerName: "Stock On Hand",
            width: 150,
            editable: false, // This field is system-managed
            // Style it to look read-only and important
            cellStyle: { 'background-color': '#f3f4f6', 'font-weight': 'bold', 'text-align': 'center' }
        },
        {
            field: "unitPrice",
            headerName: "Unit Price",
            flex: 1,
            editable: true,
            valueFormatter: p => (typeof p.value === 'number') ? formatCurrency(p.value) : '',
            valueParser: p => parseFloat(p.newValue) // Ensure the edited value is a number
        },
        {
            field: "unitMarginPercentage",
            headerName: "Margin %",
            flex: 1,
            editable: true,
            valueParser: p => parseFloat(p.newValue)
        },
        {
            field: "isActive", headerName: "Status", width: 120,
            cellRenderer: p => p.value ?
                '<span class="text-green-600 font-semibold">Active</span>' :
                '<span class="text-red-600 font-semibold">Inactive</span>'
        },
        {
            headerName: "Actions", width: 120, cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const icon = params.data.isActive
                    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;
                const buttonClass = params.data.isActive ? 'btn-deactivate' : 'btn-activate';
                const tooltip = params.data.isActive ? 'Deactivate Product' : 'Activate Product';
                return `<button class="${buttonClass}" data-id="${params.data.id}" title="${tooltip}">${icon}</button>`;

            }
        }
    ],
    defaultColDef: {
        sortable: true, filter: true, resizable: true,
    },
    rowData: [],
    rowClassRules: {
        'opacity-50': params => !params.data.isActive,
    },
    onGridReady: (params) => {
        console.log("[ui.js] Products Grid is now ready.");
        productsGridApi = params.api;
    },
    onCellValueChanged: (params) => {
        const docId = params.data.id;
        const field = params.colDef.field;
        const newValue = params.newValue;
        const node = params.node;
        let updatedData = { [field]: newValue };

        if (field === 'unitPrice' || field === 'unitMarginPercentage') {
            const cost = parseFloat(node.data.unitPrice) || 0;
            const margin = parseFloat(node.data.unitMarginPercentage) || 0;
            if (cost > 0) {
                const newSellingPrice = cost * (1 + margin / 100);
                node.setDataValue('sellingPrice', newSellingPrice);
                updatedData.sellingPrice = newSellingPrice;
            }
        }
        document.dispatchEvent(new CustomEvent('updateProduct', { detail: { docId, updatedData } }));
    }
};



// --- UI FUNCTIONS ---

function calculateSellingPrice() {
    const cost = parseFloat(unitPriceInput.value) || 0;
    const margin = parseFloat(unitMarginInput.value) || 0;
    if (cost > 0 && margin > 0) {
        const sellingPrice = cost * (1 + margin / 100);
        sellingPriceDisplay.value = sellingPrice.toFixed(2);
    } else {
        sellingPriceDisplay.value = '';
    }
}

export function initializeProductsGrid() {
    if (isProductsGridInitialized) return;
    const productsGridDiv = document.getElementById('products-catalogue-grid');
    if (productsGridDiv) {
        createGrid(productsGridDiv, productsGridOptions);
        isProductsGridInitialized = true;
    }
}





export function showProductsView() {
    showView('products-view');
    initializeProductsGrid();

    const waitForGrid = setInterval(() => {
        if (productsGridApi) {
            clearInterval(waitForGrid);

            console.log("[ui.js] Grid is ready. Attaching real-time products listener.");
            const db = firebase.firestore();
            productsGridApi.setGridOption('loading', true);

            unsubscribeProductsListener = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH)
                .orderBy('itemName')
                .onSnapshot(snapshot => {
                    console.log("[Firestore] Received real-time update for products.");
                    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    productsGridApi.setGridOption('rowData', products);
                    productsGridApi.setGridOption('loading', false);
                }, error => {
                    console.error("Error with products real-time listener:", error);
                    productsGridApi.setGridOption('loading', false);
                    productsGridApi.showNoRowsOverlay();
                });
        }
    }, 50);

    // This part for the form uses the masterData store.
    const itemCategorySelect = document.getElementById('itemCategory-select');
    itemCategorySelect.innerHTML = '<option value="">Select a category...</option>';
    masterData.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.categoryName;
        itemCategorySelect.appendChild(option);
    });

    // Setup form calculation listeners
    const unitPriceInput = document.getElementById('unitPrice-input');
    const unitMarginInput = document.getElementById('unitMargin-input');
    unitPriceInput.addEventListener('input', calculateSellingPrice);
    unitMarginInput.addEventListener('input', calculateSellingPrice);
}




// --- PURCHASE MANAGEMENT UI ---

let lineItemCounter = 0;

let purchaseInvoicesGridApi = null;
let purchasePaymentsGridApi = null;
let isPurchaseGridsInitialized = false;
let unsubscribeInvoicesListener = null; // The "off switch" for the invoices listener
let unsubscribePaymentsListener = null;




// Grid for the main list of invoices
const purchaseInvoicesGridOptions = {
    getRowId: params => params.data.id,
    columnDefs: [
        { field: "invoiceId", headerName: "Invoice ID", width: 150 },
        { field: "supplierInvoiceNo", headerName: "Supplier Invoice #", width: 150 },
        { field: "supplierName", headerName: "Supplier", flex: 1, width: 150 },
        { field: "purchaseDate", headerName: "Date", valueFormatter: p => p.value ? p.value.toDate().toLocaleDateString() : '', width: 100 },
        { field: "invoiceTotal", headerName: "Total", valueFormatter: p => formatCurrency(p.value)  },
        { field: "balanceDue", headerName: "Balance", valueFormatter: p => formatCurrency(p.value) },
        {
            field: "paymentStatus", headerName: "Status", width: 100, cellRenderer: p => {
                const status = p.value;
                if (status === 'Paid') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">Paid</span>`;
                if (status === 'Partially Paid') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">Partial</span>`;
                return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">Unpaid</span>`;
            }
        },
        {
            headerName: "Actions",
            width: 150,
            cellClass: 'flex items-center justify-center space-x-2', // Added space-x-2 for spacing
            cellRenderer: params => {
                const docId = params.data.id;

                // Define the SVG icons
                const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343z" /></svg>`;
                const paymentIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M10 3.75a.75.75 0 0 1 .75.75v3.5h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5h-3.5a.75.75 0 0 1 0-1.5h3.5v-3.5a.75.75 0 0 1 .75-.75z" /><path fill-rule="evenodd" d="M1.5 5.25a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3v9.5a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-9.5zM3 6.75a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-11a1.5 1.5 0 0 1-1.5-1.5v-8z" clip-rule="evenodd" /></svg>`;
                const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;

                // Return the three icon buttons, each with a tooltip
                return `
                    <button class="action-btn-icon action-btn-edit" data-id="${docId}" title="View / Edit Invoice">${editIcon}</button>
                    <button class="action-btn-icon action-btn-payment" data-id="${docId}" title="Record Payment">${paymentIcon}</button>
                    <button class="action-btn-icon action-btn-delete" data-id="${docId}" title="Delete Invoice">${deleteIcon}</button>
                `;
            }
        }
    ],
    defaultColDef: { resizable: true, sortable: true, filter: true, wrapText: true, autoHeight: true, },
    rowSelection: {
        mode: 'multiRow',
        enableSelectionWithoutKeys: true
    },
    rowClassRules: {
        'ag-row-selected-custom': params => params.data && params.data.id === appState.selectedPurchaseInvoiceId,
    },
    onRowSelected: (event) => {
        const paymentsTab = document.getElementById('tab-payments');
        if (paymentsTab.classList.contains('tab-disabled')) {
            paymentsTab.classList.remove('tab-disabled');
        }

        // If we are currently viewing the payments tab, refresh its data.
        if (document.getElementById('panel-payments').classList.contains('active')) {
            loadPaymentsForSelectedInvoice();
        }
    },
    onGridReady: (params) => {
        console.log("[ui.js] Purchase Invoices Grid is now ready.");
        purchaseInvoicesGridApi = params.api;
    }
};

// Grid for the payments of a selected invoice
const purchasePaymentsGridOptions = {

    getRowId: params => params.data.id,
    columnDefs: [
        {
            headerName: "Supplier Invoice #",
            width: 150,
            pinned: 'left', // This "freezes" the column to the left
            // This valueGetter now uses the correct fields.
            valueGetter: params => {
                // Safety check: ensure the payment data and the invoices grid API are available.
                if (!params.data || !purchaseInvoicesGridApi) {
                    return '';
                }

                // 1. Get the ID of the parent invoice from the current payment row's data.
                const parentInvoiceDocId = params.data.relatedInvoiceId;

                // 2. Use that ID to look up the corresponding row node in the top grid.
                const invoiceNode = purchaseInvoicesGridApi.getRowNode(parentInvoiceDocId);

                // 3. If the invoice row is found, return its 'supplierInvoiceNo' property.
                //    If not found, show the raw ID as a fallback so data is never lost.
                return invoiceNode ? invoiceNode.data.supplierInvoiceNo : parentInvoiceDocId;
            }
        },
        {
            headerName: "Supplier",
            width: 200,
            pinned: 'left', // This also freezes the column
            // Use a valueGetter to look up the supplier name from masterData
            valueGetter: params => {
                if (!params.data) return '';
                const supplier = masterData.suppliers.find(s => s.id === params.data.supplierId);
                return supplier ? supplier.supplierName : 'Unknown Supplier';
            }
        },
        { field: "paymentDate", headerName: "Payment Date", flex: 1, valueFormatter: p => p.value.toDate().toLocaleDateString() },
        {
            field: "amountPaid",
            headerName: "Amount Paid",
            flex: 1,
            valueFormatter: p => p.value ? formatCurrency(p.value) : ''
        },
        { field: "paymentMode", headerName: "Mode", flex: 1 },
        { field: "transactionRef", headerName: "Reference #", flex: 2 },
        {
            headerName: "Actions", width: 80, cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                // Re-use the same trash can icon from other grids for consistency
                const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;

                // Apply standard classes for styling and a specific class for event handling
                return `<button 
                            class="action-btn-icon action-btn-delete action-btn-delete-payment" 
                            data-id="${params.data.id}" 
                            title="Delete Payment">
                                ${deleteIcon}
                        </button>`;
            }
        }
    ],
    defaultColDef: { resizable: true, sortable: true, filter: true, wrapText: true, autoHeight: true, },
    onGridReady: (params) => {
        console.log("[ui.js] Purchase Payments Grid is now ready.");
        purchasePaymentsGridApi = params.api;
    }
};


export function getPaymentDataFromGridById(paymentId) {
    // --- THIS IS THE FIX ---
    // Use the correct grid API variable for the consignment payments grid.
    if (!consignmentPaymentsGridApi) {
        console.error("Cannot get row data: Consignment Payments Grid API not available.");
        return null;
    }
    const rowNode = consignmentPaymentsGridApi.getRowNode(paymentId);
    // -----------------------

    return rowNode ? rowNode.data : null;
}

export function initializePurchaseGrids() {
    if (isPurchaseGridsInitialized) return;
    const invoicesGridDiv = document.getElementById('purchase-invoices-grid');
    const paymentsGridDiv = document.getElementById('purchase-payments-grid');
    if (invoicesGridDiv && paymentsGridDiv) {
        console.log("[ui.js] Initializing Purchase Grids for the first time.");
        purchaseInvoicesGridApi = createGrid(invoicesGridDiv, purchaseInvoicesGridOptions);
        purchasePaymentsGridApi = createGrid(paymentsGridDiv, purchasePaymentsGridOptions);
        isPurchaseGridsInitialized = true;
    }
}


// NEW FUNCTION: This function will be called when the payments tab is clicked.
export async function loadPaymentsForSelectedInvoice() {

    if (!purchasePaymentsGridApi || !purchaseInvoicesGridApi) {
        console.error("Cannot load payments: One or more grid APIs are not ready.");
        return;
    }

    // 1. Get the currently selected rows from the top grid.
    const selectedInvoiceNodes = purchaseInvoicesGridApi.getSelectedNodes();

    purchasePaymentsGridApi.setGridOption('loading', true);
    let paymentsToShow = [];

    try {
        if (selectedInvoiceNodes.length > 0) {
            // --- FILTERED MODE ---
            console.log(`[ui.js] Filtered Mode: Loading payments for ${selectedInvoiceNodes.length} selected invoice(s).`);

            // Create an array of promises, one for each selected invoice.
            const fetchPromises = selectedInvoiceNodes.map(node => getPaymentsForInvoice(node.data.id));

            // Wait for all fetch operations to complete.
            const paymentGroups = await Promise.all(fetchPromises);

            // Flatten the array of arrays into a single list of payments.
            paymentsToShow = paymentGroups.flat();

        } else {
            // --- GLOBAL MODE ---
            console.log("[ui.js] Global Mode: No invoices selected. Loading all payments.");

            // Call our new API function to get all payments.
            paymentsToShow = await getAllSupplierPayments();
        }

        // 2. Update the payments grid with the final list of payments.
        purchasePaymentsGridApi.setGridOption('rowData', paymentsToShow);
        purchasePaymentsGridApi.setGridOption('loading', false);

    } catch (error) {
        console.error("Error loading payments:", error);
        purchasePaymentsGridApi.setGridOption('loading', false);
        purchasePaymentsGridApi.showNoRowsOverlay();
    }
}


// Function to switch between tabs
export function switchPurchaseTab(tabName) {
    const invoiceTab = document.getElementById('tab-invoices');
    const paymentsTab = document.getElementById('tab-payments');
    const invoicePanel = document.getElementById('panel-invoices');
    const paymentsPanel = document.getElementById('panel-payments');

    if (!invoiceTab || !paymentsTab || !invoicePanel || !paymentsPanel) return;

    if (tabName === 'invoices') {
        invoiceTab.classList.add('tab-active');
        paymentsTab.classList.remove('tab-active');
        invoicePanel.classList.add('active');
        paymentsPanel.classList.remove('active');
    } else if (tabName === 'payments') {
        invoiceTab.classList.remove('tab-active');
        paymentsTab.classList.add('tab-active');
        // We still want to enable it in case it was disabled
        paymentsTab.classList.remove('tab-disabled');
        invoicePanel.classList.remove('active');
        paymentsPanel.classList.add('active');
    }
}


// This is a private helper function within ui.js
function createLineItemRow(id) {
    const row = document.createElement('div');
    row.id = `line-item-${id}`;
    row.className = 'grid grid-cols-12 gap-x-2 gap-y-2 items-end p-3 border-b';

    row.innerHTML = `
        <div class="col-span-12 md:col-span-4">
            <label class="form-label text-xs">Product</label>
            <select data-field="masterProductId" class="line-item-product form-input w-full" required>
                <option value="">Select product...</option>
            </select>
        </div>
        <div class="col-span-2 md:col-span-1">
            <label class="form-label text-xs">Qty</label>
            <input type="number" data-field="quantity" class="line-item-qty form-input w-full" required value="1" step="any">
        </div>
        <div class="col-span-3 md:col-span-2">
            <label class="form-label text-xs">Unit Price</label>
            <input type="number" data-field="unitPurchasePrice" class="line-item-price form-input w-full" required step="0.01">
        </div>
        <div class="col-span-4 md:col-span-2 flex items-end space-x-1">
            <div class="flex-shrink-0 w-24">
                <label class="form-label text-xs">Disc. Type</label>
                <select data-field="discountType" class="line-item-discount-type form-input w-full">
                    <option value="Percentage">Percent</option>
                    <option value="Amount">Amount</option>
                </select>
            </div>
            <div class="flex-grow">
                <label class="form-label text-xs">Disc. Value</label>
                <input type="number" data-field="discountValue" class="line-item-discount-value form-input w-full" value="0" step="any">
            </div>
        </div>
        <div class="col-span-2 md:col-span-1">
            <label class="form-label text-xs">Tax %</label>
            <input type="number" data-field="taxPercentage" class="line-item-tax form-input w-full" value="0" step="any">
        </div>
        <div class="col-span-3 md:col-span-1">
            <label class="form-label text-xs">Net Price</label>
            <input type="text" class="line-item-net-price form-input w-full bg-gray-100" readonly>
        </div>
        <div class="col-span-1 flex justify-end">
            <button type="button" class="remove-line-item-btn p-2 text-red-500 hover:text-red-700">&times;</button>
        </div>
    `;
    return row;
}

// This function is exported so main.js can call it.
export function addLineItem() {
    lineItemCounter++;
    const lineItemsContainer = document.getElementById('purchase-line-items-container');
    if (!lineItemsContainer) return;

    const newRow = createLineItemRow(lineItemCounter);
    lineItemsContainer.appendChild(newRow);

    const productSelect = newRow.querySelector('.line-item-product');
    productSelect.innerHTML = '<option value="">Select product...</option>';

    masterData.products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.id;
        option.textContent = p.itemName;
        option.dataset.unitPrice = p.defaultUnitPrice || 0;
        productSelect.appendChild(option);
    });
}


// This function is also exported so main.js can call it.
export function calculateAllTotals() {
    const lineItemRows = document.querySelectorAll('#purchase-line-items-container > div');
    let itemsSubtotal = 0;
    let totalItemLevelTax = 0;

    lineItemRows.forEach(row => {
        const qty = parseFloat(row.querySelector('[data-field="quantity"]').value) || 0;
        const price = parseFloat(row.querySelector('[data-field="unitPurchasePrice"]').value) || 0;
        const discountType = row.querySelector('[data-field="discountType"]').value;
        const discountValue = parseFloat(row.querySelector('[data-field="discountValue"]').value) || 0;
        const taxPercentage = parseFloat(row.querySelector('[data-field="taxPercentage"]').value) || 0;

        const grossPrice = qty * price;
        let discountAmount = 0;
        if (discountType === 'Percentage') { discountAmount = grossPrice * (discountValue / 100); }
        else { discountAmount = discountValue; }

        const netPrice = grossPrice - discountAmount;
        const taxAmount = netPrice * (taxPercentage / 100);

        row.querySelector('.line-item-net-price').value = netPrice.toFixed(2);

        itemsSubtotal += netPrice;
        totalItemLevelTax += taxAmount;
    });

    document.getElementById('purchase-subtotal').textContent = formatCurrency(itemsSubtotal);

    const invoiceDiscountType = document.getElementById('invoice-discount-type').value;
    const invoiceDiscountValue = parseFloat(document.getElementById('invoice-discount-value').value) || 0;
    let invoiceDiscountAmount = 0;
    if (invoiceDiscountType === 'Percentage') { invoiceDiscountAmount = itemsSubtotal * (invoiceDiscountValue / 100); }
    else { invoiceDiscountAmount = invoiceDiscountValue; }

    const taxableAmountForInvoice = itemsSubtotal - invoiceDiscountAmount;
    const invoiceTaxPercentage = parseFloat(document.getElementById('invoice-tax-percentage').value) || 0;
    const invoiceLevelTaxAmount = taxableAmountForInvoice * (invoiceTaxPercentage / 100);

    const totalTax = totalItemLevelTax + invoiceLevelTaxAmount;
    const grandTotal = taxableAmountForInvoice + totalTax;

    document.getElementById('purchase-grand-total').textContent = formatCurrency(grandTotal);
}


export function showPurchasesView() {
    showView('purchases-view');
    initializePurchaseGrids();
    switchPurchaseTab('invoices');

    document.getElementById('tab-payments').classList.add('tab-disabled'); // Start with payments tab disabled
    appState.selectedPurchaseInvoiceId = null; // Clear any previous selection

    // Clear any existing line items and add the first one
    document.getElementById('purchase-line-items-container').innerHTML = '';
    addLineItem();

    // Populate supplier dropdown
    const supplierSelect = document.getElementById('purchase-supplier');
    supplierSelect.innerHTML = '<option value="">Select a supplier...</option>';
    masterData.suppliers.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.supplierName;
        supplierSelect.appendChild(option);
    });

    document.getElementById('purchase-line-items-container').innerHTML = '';
    addLineItem();
    calculateAllTotals();

    const waitForGrid = setInterval(() => {
        if (purchaseInvoicesGridApi) {
            clearInterval(waitForGrid);

            console.log("[ui.js] Invoices grid is ready. Attaching real-time listener.");
            const db = firebase.firestore();
            purchaseInvoicesGridApi.setGridOption('loading', true);

            unsubscribeInvoicesListener = db.collection(PURCHASE_INVOICES_COLLECTION_PATH)
                .orderBy('purchaseDate', 'desc')
                .onSnapshot(snapshot => {
                    // This was an update from another user. Just update the grid silently.
                    console.log("[Firestore] Received real-time update for purchase invoices.");
                    const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    purchaseInvoicesGridApi.setGridOption('rowData', invoices);
                    purchaseInvoicesGridApi.setGridOption('loading', false);

                }, error => {
                    console.error("Error with invoices real-time listener:", error);
                    purchaseInvoicesGridApi.setGridOption('loading', false);
                    purchaseInvoicesGridApi.showNoRowsOverlay();
                });
        }
    }, 50);
}

// NEW: Function to reset the form to "Create New" mode
export function resetPurchaseForm() {
    const form = document.getElementById('purchase-invoice-form');
    if (!form) return;

    form.reset(); // Resets all input values
    document.getElementById('purchase-invoice-doc-id').value = ''; // Clear the hidden ID
    document.getElementById('purchase-form-title').textContent = 'Create New Purchase Invoice';
    document.getElementById('purchase-form-submit-btn').textContent = 'Save New Invoice';
    document.getElementById('cancel-edit-btn').style.display = 'none';

    // Reset line items to a single blank row
    const lineItemsContainer = document.getElementById('purchase-line-items-container');
    lineItemsContainer.innerHTML = '';
    addLineItem();
    calculateAllTotals();
}

// NEW: Function to load invoice data into the form for editing
export async function loadInvoiceDataIntoForm(invoiceData) {
    // Switch to Edit Mode
    document.getElementById('purchase-invoice-doc-id').value = invoiceData.id;
    document.getElementById('purchase-form-title').textContent = `Editing Invoice: ${invoiceData.invoiceId}`;
    document.getElementById('purchase-form-submit-btn').textContent = 'Update Invoice';
    document.getElementById('cancel-edit-btn').style.display = 'block';

    // Populate Header Fields
    document.getElementById('purchase-date').valueAsDate = invoiceData.purchaseDate.toDate();
    document.getElementById('purchase-supplier').value = invoiceData.supplierId;
    document.getElementById('supplier-invoice-no').value = invoiceData.supplierInvoiceNo;

    // Populate Line Items
    const lineItemsContainer = document.getElementById('purchase-line-items-container');
    lineItemsContainer.innerHTML = ''; // Clear existing rows
    lineItemCounter = 0; // Reset counter

    invoiceData.lineItems.forEach(item => {
        addLineItem(); // Creates a new blank row
        const newRow = document.getElementById(`line-item-${lineItemCounter}`);

        // Populate the fields in the new row
        newRow.querySelector('[data-field="masterProductId"]').value = item.masterProductId;
        newRow.querySelector('[data-field="quantity"]').value = item.quantity;
        newRow.querySelector('[data-field="unitPurchasePrice"]').value = item.unitPurchasePrice;
        newRow.querySelector('[data-field="discountType"]').value = item.discountType || 'Percentage';
        newRow.querySelector('[data-field="discountValue"]').value = item.discountValue || 0;
        newRow.querySelector('[data-field="taxPercentage"]').value = item.taxPercentage || 0;
    });

    // Populate Invoice-level totals/discounts
    document.getElementById('invoice-discount-type').value = invoiceData.invoiceDiscountType || 'Percentage';
    document.getElementById('invoice-discount-value').value = invoiceData.invoiceDiscountValue || 0;
    document.getElementById('invoice-tax-percentage').value = invoiceData.invoiceLevelTaxPercentage || 0;

    // Recalculate all totals to ensure UI is consistent
    setTimeout(() => {
        calculateAllTotals();
        console.log("Totals recalculated after DOM update."); // For debugging
    }, 0);

    // Scroll the form into view for a better user experience
    document.getElementById('purchase-invoice-form').scrollIntoView({ behavior: 'smooth' });
}


// --- RECORD PAYMENT MODAL UI ---

const paymentModal = document.getElementById('record-payment-modal');
const paymentModalTitle = document.getElementById('payment-modal-title');
const paymentForm = document.getElementById('record-payment-form');
const paymentInvoiceIdInput = document.getElementById('payment-invoice-id');
const paymentSupplierIdInput = document.getElementById('payment-supplier-id');
const paymentModeSelect = document.getElementById('payment-mode-select');

export function showPaymentModal(invoice) {
    const paymentModal = document.getElementById('record-payment-modal');
    if (!paymentModal) return;

    // Populate hidden fields
    paymentInvoiceIdInput.value = invoice.id;
    paymentSupplierIdInput.value = invoice.supplierId;

    // Set title and default values
    paymentModalTitle.textContent = `Record Payment for Invoice: ${invoice.invoiceId}`;
    paymentForm.reset(); // Clear previous entries
    document.getElementById('payment-date-input').valueAsDate = new Date(); // Default to today
    document.getElementById('payment-amount-input').value = invoice.balanceDue.toFixed(2); // Default to paying the balance

    // Populate payment modes dropdown from masterData
    paymentModeSelect.innerHTML = '<option value="">Select a mode...</option>';
    masterData.paymentModes.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode.paymentMode;
        option.textContent = mode.paymentMode;
        paymentModeSelect.appendChild(option);
    });

    // Show the modal
    paymentModal.style.display = 'flex'; // Make it take up space
    setTimeout(() => { // Allow the browser to render the display change
        paymentModal.classList.add('visible');
    }, 10); // A tiny delay is all that's needed

    // Find the first input in the form and give it focus.
    const firstInput = paymentModal.querySelector('input, select');
    if (firstInput) {
        firstInput.focus();
    }
}

export function closePaymentModal() {
    const paymentModal = document.getElementById('record-payment-modal');
    if (!paymentModal) return;

    paymentModal.classList.remove('visible');
    setTimeout(() => {
        paymentModal.style.display = 'none';
    }, 300);
}

// --- NEW EXPORTED HELPER FUNCTION ---
export function getInvoiceDataFromGridById(rowId) {
    if (!purchaseInvoicesGridApi) {
        console.error("Cannot get row data: Purchase Invoices Grid API not available.");
        return null;
    }
    const rowNode = purchaseInvoicesGridApi.getRowNode(rowId);
    return rowNode ? rowNode.data : null;
}

export function initializeModals() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('.modal-close-trigger')) {
            const modalToClose = e.target.closest('.modal-container');
            if (!modalToClose) return;

            // This now correctly closes EITHER modal
            if (e.target.closest('#record-payment-modal')) {
                closePaymentModal();
            } else if (modalToClose.id === 'member-modal') {
                closeMemberModal();
            } else if (modalToClose.id === 'consignment-request-modal') {
                closeConsignmentRequestModal();
            } else if (modalToClose.id === 'report-activity-modal') {
                closeReportActivityModal();
            }
            else if (modalToClose.id === 'record-sale-payment-modal') {
                closeRecordSalePaymentModal();
            }
            // Add similar logic for other modals if needed
        }
    });

    // --- ESCAPE KEY HANDLER ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // When Escape is pressed, try to close ALL possible modals.

            // 1. Close the Payment Modal
            closePaymentModal(); // This function already has the correct logic.

            // 2. Also close the Custom Modal (for success/error/confirm)
            const customModal = document.getElementById('custom-modal');
            if (customModal && customModal.classList.contains('visible')) {
                customModal.classList.remove('visible');
                // Wait for the animation to finish before hiding it completely
                setTimeout(() => {
                    customModal.style.display = 'none';
                }, 300); // 300ms matches the CSS transition time
            }
        }
    });
}



// =======================================================
// --- SALES CATALOGUE MANAGEMENT UI ---
// =======================================================

function syncAvailableProductsGrid() {
    if (!catalogueItemsGridApi || !availableProductsGridApi) {
        console.warn("Sync called, but one or more grid APIs are not ready.");
        return;
    }
    console.log("--- SYNCING GRIDS (Both APIs are ready) ---");

    const currentItems = [];
    catalogueItemsGridApi.forEachNode(node => currentItems.push(node.data));
    console.log(`Found ${currentItems.length} items in the right-side grid.`);

    // 1. Clear the contents of the *original* Set.
    currentCatalogueItemIds.clear();

    // 2. Get the new IDs.
    const newProductIds = currentItems.map(item => item.productId);

    // 3. Add the new IDs one by one into the *original* Set.
    newProductIds.forEach(id => currentCatalogueItemIds.add(id));
    // -----------------------

    console.log("MUTATED Set of current product IDs:", currentCatalogueItemIds);

    // 1. Update the grid's internal context with the new Set.
    availableProductsGridApi.setGridOption('context', {
        currentCatalogueItemIds: currentCatalogueItemIds
    });

    console.log("Calling refreshCells() on the left-side grid to update buttons...");
    availableProductsGridApi.refreshCells({ force: true });
    console.log("--- SYNC COMPLETE ---");
}

/**
 * [NEW] Takes the current draft items from the appState and updates the UI.
 * This includes setting the grid data and re-syncing the "Add" buttons.
 */
export function updateDraftItemsGrid() {
    if (!catalogueItemsGridApi) {
        console.error("Cannot update draft grid: catalogueItemsGridApi is not ready.");
        return;
    }

    // 1. Set the right-side grid's data from the draft state.
    catalogueItemsGridApi.setGridOption('rowData', appState.draftCatalogueItems);

    // 2. Re-sync the left-side grid to disable the correct "Add" buttons.
    syncAvailableProductsGrid();
}


// 1. Define variables for the new grid APIs and initialization flags
let availableProductsGridApi = null;
let catalogueItemsGridApi = null;
let isSalesCatalogueGridsInitialized = false;
let unsubscribeCatalogueItemsListener = null; // For the right-side grid
let unsubscribeExistingCataloguesListener = null;

let currentCatalogueItemIds = new Set(); // Using a Set for very fast lookups

// 2. Define the AG-Grid options for the LEFT grid (Available Products)
const availableProductsGridOptions = {
    context: {
        currentCatalogueItemIds: currentCatalogueItemIds // Initialize with the empty Set
    },
    columnDefs: [
        { field: "itemName", headerName: "Product Name", flex: 1, filter: 'agTextColumnFilter' },
        {
            field: "categoryId",
            headerName: "Category",
            flex: 1,
            valueFormatter: params => {
                const category = masterData.categories.find(c => c.id === params.value);
                return category ? category.categoryName : 'Unknown';
            }
        },
        {
            headerName: "Add",
            width: 80,
            cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const productId = params.data.id;
                const addIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" /></svg>`;

                const isDuplicate = params.context.currentCatalogueItemIds.has(productId);

                console.log(`Rendering 'Add' button for product ${productId}. Is it a duplicate? ${isDuplicate}`);

                const isDisabled = isDuplicate;

                const disabledClass = isDisabled ? 'opacity-50 cursor-not-allowed' : '';
                const disabledAttribute = isDisabled ? 'disabled' : '';
                const tooltip = isDisabled ? 'Item is already in this catalogue' : 'Add to Catalogue';

                return `<button 
                            class="action-btn-icon action-btn-add-item ${disabledClass}" 
                            data-id="${productId}" 
                            title="${tooltip}"
                            ${disabledAttribute}>
                                ${addIcon}
                        </button>`;
            }
        }
    ],
    defaultColDef: { resizable: true, sortable: true },
    onGridReady: (params) => {
        availableProductsGridApi = params.api;
    }
};


// 3. Define the AG-Grid options for the RIGHT grid (Catalogue Items)
const catalogueItemsGridOptions = {
    getRowId: params => params.data.id || params.data.tempId, // Crucial for finding and updating rows

    columnDefs: [
        { field: "productName", headerName: "Product Name", flex: 1 },
        { field: "costPrice", headerName: "Cost Price", width: 120, valueFormatter: p => p.value ? `$${p.value.toFixed(2)}` : '' },
        { field: "marginPercentage", headerName: "Margin %", width: 110, valueFormatter: p => p.value ? `${p.value}%` : '' },
        {
            field: "sellingPrice",
            headerName: "Selling Price",
            width: 130,
            editable: true, // This makes the cell editable!
            valueFormatter: p => p.value ? formatCurrency(p.value) : '',
            valueParser: params => {
                // Get the currency symbol from master data, defaulting to '$'
                const currencySymbol = masterData.systemSetups?.systemCurrency || '$';
                
                // Ensure the newValue is a string before trying to replace
                const valueAsString = params.newValue ? String(params.newValue) : '';
                
                // Remove the currency symbol and any commas before parsing
                const cleanedValue = valueAsString.replace(currencySymbol, '').replace(/,/g, '');
                
                return parseFloat(cleanedValue) || 0;
            }
        },
        {
            headerName: "Remove",
            width: 80,
            cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const itemId = params.data.id;
                const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
                return `<button class="action-btn-icon action-btn-delete action-btn-remove-item" data-id="${itemId}" title="Remove from Catalogue">${deleteIcon}</button>`;
            }
        }
    ],
    defaultColDef: { resizable: true, sortable: true },
    onCellValueChanged: (params) => {
        // This event fires when the user edits the selling price.
        // We dispatch a custom event for main.js to handle.
        document.dispatchEvent(new CustomEvent('updateCatalogueItemPrice', {
            detail: {
                catalogueId: params.data.catalogueId, // The parent catalogue's ID
                itemId: params.data.id,              // The item's own ID
                newPrice: params.newValue
            }
        }));
    },
    onGridReady: (params) => {
        catalogueItemsGridApi = params.api;
    }
};

// Add a variable for the new grid
let existingCataloguesGridApi = null;

export function getCatalogueDataFromGridById(rowId) {
    if (!existingCataloguesGridApi) return null;
    const rowNode = existingCataloguesGridApi.getRowNode(rowId);
    return rowNode ? rowNode.data : null;
}


// [NEW] This function will handle loading the selected catalogue for editing
export function loadCatalogueForEditing(catalogueData) {
    console.log('[ui.js]loadCatalogueForEditing:', catalogueData);
    if (!catalogueData) return;

    // 1. Populate the form fields
    document.getElementById('sales-catalogue-doc-id').value = catalogueData.id;
    document.getElementById('catalogue-name-input').value = catalogueData.catalogueName;
    document.getElementById('catalogue-season-select').value = catalogueData.seasonId;

    // 2. Change form to "Edit Mode"
    document.getElementById('catalogue-form-title').textContent = `Editing: ${catalogueData.catalogueName}`;
    document.getElementById('catalogue-form-submit-btn').textContent = 'Update Details';
    document.getElementById('catalogue-form-cancel-btn').style.display = 'inline-block';

    // 3. Detach any previous item listener to prevent leaks
    if (unsubscribeCatalogueItemsListener) {
        unsubscribeCatalogueItemsListener();
    }

    // 4. Attach a new real-time listener for the items in THIS catalogue
    const db = firebase.firestore();
    catalogueItemsGridApi.setGridOption('loading', true);

    unsubscribeCatalogueItemsListener = db.collection(SALES_CATALOGUES_COLLECTION_PATH)
        .doc(catalogueData.id)
        .collection('items')
        .onSnapshot(snapshot => {
            console.log(`[Firestore] Received update for items in catalogue ${catalogueData.id}`);
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Populate the draft state AND the grid
            appState.draftCatalogueItems = items;

            catalogueItemsGridApi.setGridOption('rowData', items);
            catalogueItemsGridApi.setGridOption('loading', false);

            syncAvailableProductsGrid();
        }, error => {
            console.error("Error listening to catalogue items:", error);
            catalogueItemsGridApi.setGridOption('loading', false);
        });

    // 5. Scroll the form into view
    document.getElementById('sales-catalogue-form').scrollIntoView({ behavior: 'smooth' });
}

// [NEW] Function to reset the form back to "Create New" mode
export function resetCatalogueForm() {
    document.getElementById('sales-catalogue-form').reset();
    document.getElementById('sales-catalogue-doc-id').value = '';
    document.getElementById('catalogue-form-title').textContent = 'Create New Sales Catalogue';
    document.getElementById('catalogue-form-submit-btn').textContent = 'Save Catalogue';
    document.getElementById('catalogue-form-cancel-btn').style.display = 'none';

    // Also clear the draft state in memory
    appState.draftCatalogueItems = [];

    // Clear the items grid and detach the listener
    if (catalogueItemsGridApi) {
        catalogueItemsGridApi.setGridOption('rowData', []);
    }
    currentCatalogueItemIds.clear();

    if (unsubscribeCatalogueItemsListener) {
        unsubscribeCatalogueItemsListener();
        unsubscribeCatalogueItemsListener = null;
    }
}


// Define its options
const existingCataloguesGridOptions = {
    getRowId: params => params.data.id,
    columnDefs: [
        { field: "catalogueName", headerName: "Catalogue Name", flex: 1 },
        { field: "seasonName", headerName: "Season", flex: 1 },
        { field: "isActive", headerName: "Status", width: 100, cellRenderer: p => p.value ? 'Active' : 'Inactive' },
        {
            headerName: "Actions", width: 100, cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343z" /></svg>`;
                return `<button class="action-btn-icon action-btn-edit-catalogue" data-id="${params.data.id}" title="Edit Catalogue">${editIcon}</button>`;
            }
        }
    ],
    onGridReady: params => { existingCataloguesGridApi = params.api; }
};


// 4. Create the initialization function
export function initializeSalesCatalogueGrids() {
    if (isSalesCatalogueGridsInitialized) return;

    const availableGridDiv = document.getElementById('available-products-grid');
    const itemsGridDiv = document.getElementById('catalogue-items-grid');
    const existingGridDiv = document.getElementById('existing-catalogues-grid'); // Get the new grid

    if (availableGridDiv && itemsGridDiv && existingGridDiv) { // Check for all three
        console.log("[ui.js] Initializing Sales Catalogue grids for the first time.");
        createGrid(availableGridDiv, availableProductsGridOptions);
        createGrid(itemsGridDiv, catalogueItemsGridOptions);
        createGrid(existingGridDiv, existingCataloguesGridOptions); // Create the new grid
        isSalesCatalogueGridsInitialized = true;
    }
}


// 5. Create the main view function
export function showSalesCatalogueView() {
    // Standard view setup
    showView('sales-catalogue-view');
    initializeSalesCatalogueGrids();

    // Populate the Sales Season dropdown from our master data cache
    const seasonSelect = document.getElementById('catalogue-season-select');
    seasonSelect.innerHTML = '<option value="">Select a season...</option>';
    masterData.seasons.forEach(season => {
        const option = document.createElement('option');
        option.value = season.id;
        option.textContent = season.seasonName;
        seasonSelect.appendChild(option);
    });

    // Wait for the grids to be ready before populating them
    const waitForGrids = setInterval(() => {
        if (availableProductsGridApi && catalogueItemsGridApi) {
            clearInterval(waitForGrids);

            // Populate the LEFT grid with all active products from the master data cache
            // This is very fast as it uses data already in memory.
            const activeProducts = masterData.products.filter(p => p.isActive);
            availableProductsGridApi.setGridOption('rowData', activeProducts);

            // The RIGHT grid will be populated when a user selects a catalogue to edit.
            // For now, we ensure it's empty.
            catalogueItemsGridApi.setGridOption('rowData', []);

            console.log("[ui.js] Attaching real-time listener for existing catalogues.");
            const db = firebase.firestore();
            existingCataloguesGridApi.setGridOption('loading', true); // Show loading overlay

            // Attach the listener
            unsubscribeExistingCataloguesListener = db.collection(SALES_CATALOGUES_COLLECTION_PATH)
                .orderBy('audit.createdOn', 'desc')
                .onSnapshot(snapshot => {
                    console.log("[Firestore] Received real-time update for existing sales catalogues.");
                    const catalogues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                    // Feed the data to the grid
                    existingCataloguesGridApi.setGridOption('rowData', catalogues);

                    // IMPORTANT: Hide the loading overlay
                    existingCataloguesGridApi.setGridOption('loading', false);
                }, error => {
                    console.error("Error with existing catalogues listener:", error);
                    // Also hide the overlay on error
                    existingCataloguesGridApi.setGridOption('loading', false);
                });
        }
    }, 50);
}



// =======================================================
// --- CONSIGNMENT MANAGEMENT UI ---
// =======================================================

// 1. Define variables for all the new grid APIs and state
let consignmentOrdersGridApi = null;
let fulfillmentItemsGridApi = null;
let consignmentItemsGridApi = null;
let consignmentActivityGridApi = null;
let consignmentPaymentsGridApi = null;
let requestProductsGridApi = null;
let isConsignmentGridsInitialized = false;


let unsubscribeConsignmentOrdersListener = null;
let unsubscribeConsignmentDetailsListeners = []; // Array to hold multiple detail listeners


// 2. Define AG-Grid Options for each grid

// MASTER GRID: All Consignment Orders
const consignmentOrdersGridOptions = {
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 100, // You can adjust this default value if you like
    paginationPageSizeSelector: [25, 50, 100],
    columnDefs: [
        { field: "consignmentId", headerName: "Order ID", width: 180, filter: 'agTextColumnFilter' },
        { field: "requestDate", headerName: "Request Date", filter: 'agDateColumnFilter', width: 140, valueFormatter: p => p.value ? p.value.toDate().toLocaleDateString() : '' },
        { field: "teamName", headerName: "Team", flex: 1, filter: 'agTextColumnFilter' },
        { field: "requestingMemberName", headerName: "Requested By", flex: 1, filter: 'agTextColumnFilter' },
        {
            field: "status", headerName: "Status", filter: 'agTextColumnFilter', width: 120, cellRenderer: p => {
                const status = p.value;
                if (status === 'Active') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">${status}</span>`;
                if (status === 'Pending') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">${status}</span>`;
                if (status === 'Settled') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-gray-600 bg-gray-200">${status}</span>`;
                return status;
            }
        },
        { 
            field: "balanceDue", 
            headerName: "Balance Due", 
            width: 140, 
            // The valueFormatter is now correctly inside its parent column definition object.
            valueFormatter: p => formatCurrency(p.value || 0)
        }
    ],
    rowSelection: { mode: 'singleRow' },
    onGridReady: params => { consignmentOrdersGridApi = params.api; },
    onRowSelected: event => {
        const selectedNode = event.node;
        if (selectedNode && selectedNode.isSelected()) {
            appState.selectedConsignmentId = selectedNode.data.id;
            renderConsignmentDetail(selectedNode ? selectedNode.data : null);
        } else {
            hideConsignmentDetailPanel();
        }
    }
};

// DETAIL GRID 1: Fulfillment (for Pending orders)
const fulfillmentItemsGridOptions = {
    getRowId: params => params.data.id,
    columnDefs: [
        { field: "productName", headerName: "Product", flex: 1, filter: 'agDateColumnFilter' },
        { field: "quantityRequested", headerName: "Qty Requested", width: 150 },
        {
            field: "quantityCheckedOut",
            headerName: "Qty to Fulfill",
            width: 150,
            editable: true, // Admin can edit this
            valueParser: p => parseInt(p.newValue, 10) || 0
        }
    ],
    onGridReady: params => { fulfillmentItemsGridApi = params.api; }
};

// DETAIL GRID 2: Items on Hand (for Active orders)
const consignmentItemsGridOptions = {
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 100,
    paginationPageSizeSelector: [10, 50, 100, 200],
    columnDefs: [
        { field: "productName", headerName: "Product", flex: 1, filter: 'agTextColumnFilter', suppressMovable: true },
        { field: "quantityCheckedOut", headerName: "Checked Out", width: 120, suppressMovable: true },
        {
            field: "quantitySold",
            headerName: "Sold Qty",
            width: 100,
            editable: true, // Make this column editable
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: { min: 0, precision: 0 }
        },
        {
            field: "quantityReturned",
            headerName: "Returned Qty",
            width: 100,
            editable: true, // Make this column editable
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: { min: 0, precision: 0 }
        },
        {
            field: "quantityDamaged",
            headerName: "Damaged Qty",
            width: 100,
            editable: true, // Make this column editable
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: { min: 0, precision: 0 }
        },
        {
            headerName: "On Hand Qty",
            width: 100,
            cellStyle: { 'font-weight': 'bold' },
            // The valueGetter remains the same and will auto-recalculate
            valueGetter: p => p.data.quantityCheckedOut - (p.data.quantitySold + p.data.quantityReturned + p.data.quantityDamaged)
        }
    ],
    onGridReady: params => { consignmentItemsGridApi = params.api; },
    onCellEditingStopped: (params) => {
        const colId = params.column.getColId();
        const oldValue = Number(params.oldValue) || 0;
        const newValue = Number(params.newValue) || 0;

        if (oldValue === newValue) {
            return; // No change, nothing to validate.
        }

        const data = params.node.data;
        let otherFieldsTotal = 0;
        if (colId !== 'quantitySold') otherFieldsTotal += (data.quantitySold || 0);
        if (colId !== 'quantityReturned') otherFieldsTotal += (data.quantityReturned || 0);
        if (colId !== 'quantityDamaged') otherFieldsTotal += (data.quantityDamaged || 0);

        const newTotalAccountedFor = otherFieldsTotal + newValue;

        if (newTotalAccountedFor > data.quantityCheckedOut) {
            // 1. Inform the user of the error.
            alert(`Error: Invalid quantity. The total accounted for (${newTotalAccountedFor}) cannot exceed the Checked Out quantity of ${data.quantityCheckedOut}.`);

            // 2. Manually revert the data in the grid's model. This is the crucial step.
            params.node.setDataValue(colId, oldValue);

            // 3. Stop the editing process.
            params.api.stopEditing(true); // Cancel any remaining edit state.

            return; // Stop further processing.
        }
    },
    // --- This onCellValueChanged handler is now only called for VALID changes ---
    onCellValueChanged: (params) => {
        // This guard prevents the revert action from causing a dispatch.
        if (params.oldValue === params.newValue) return;

        const colId = params.column.getColId();
        const oldValue = Number(params.oldValue) || 0;
        const newValue = Number(params.newValue) || 0;
        const delta = newValue - oldValue;

        if (delta === 0) return;

        let activityType = '';
        if (colId === 'quantitySold') activityType = 'Sale';
        else if (colId === 'quantityReturned') activityType = 'Return';
        else if (colId === 'quantityDamaged') activityType = 'Damage';
        else return;

        const isCorrection = delta < 0;
        const finalActivityType = isCorrection ? 'Correction' : activityType;

        document.dispatchEvent(new CustomEvent('logConsignmentActivity', {
            detail: {
                orderId: appState.selectedConsignmentId,
                itemId: params.data.id,
                productId: params.data.productId,
                productName: params.data.productName,
                activityType: finalActivityType,
                quantityDelta: delta,
                sellingPrice: params.data.sellingPrice,
                correctionDetails: isCorrection ? {
                    correctedField: colId,
                    from: oldValue,
                    to: newValue
                } : null
            }
        }));
    }

};

// ... We will define the options for activity and payment grids later ...

// 3. Create Initialization and Helper Functions

export function initializeConsignmentGrids() {
    if (isConsignmentGridsInitialized) return;

    const orderGridDiv = document.getElementById('consignment-orders-grid');
    const fulfillGridDiv = document.getElementById('fulfillment-items-grid');
    const itemsGridDiv = document.getElementById('consignment-items-grid');
    const activityGridDiv = document.getElementById('consignment-activity-grid');
    const paymentsGridDiv = document.getElementById('consignment-payments-grid');
    const requestGridDiv = document.getElementById('request-products-grid');
    // ... get other grid divs ...

    if (orderGridDiv && fulfillGridDiv && itemsGridDiv && requestGridDiv && activityGridDiv && paymentsGridDiv) {
        createGrid(orderGridDiv, consignmentOrdersGridOptions);
        createGrid(fulfillGridDiv, fulfillmentItemsGridOptions);
        createGrid(itemsGridDiv, consignmentItemsGridOptions);
        createGrid(requestGridDiv, requestProductsGridOptions);
        createGrid(activityGridDiv, consignmentActivityGridOptions);
        createGrid(paymentsGridDiv, consignmentPaymentsGridOptions);
        isConsignmentGridsInitialized = true;
    }
}

function hideConsignmentDetailPanel() {
    document.getElementById('consignment-detail-panel').classList.add('hidden');
    appState.selectedConsignmentId = null;
    // Detach all detail listeners
    unsubscribeConsignmentDetailsListeners.forEach(unsub => unsub());
    unsubscribeConsignmentDetailsListeners = [];
}

//function showConsignmentDetailPanel(orderData) {


/**
 * [NEW & SUPERIOR] The single authoritative function for rendering the detail panel.
 * If orderData is provided, it shows and populates the panel.
 * If orderData is null, it hides the panel.
 * @param {object|null} orderData - The data for the order to display, or null to hide.
 */
export function renderConsignmentDetail(orderData) {
    // If no data is provided, hide the panel and stop.
    if (!orderData) {
        hideConsignmentDetailPanel();
        return;
    }

    // Set the global state for other parts of the app to use
    appState.selectedConsignmentId = orderData.id;

    const detailPanel = document.getElementById('consignment-detail-panel');
    const fulfillmentView = document.getElementById('fulfillment-view');
    const activeOrderView = document.getElementById('active-order-view');


    // --- [NEW] Populate the Financial Summary panel every time ---
    document.getElementById('summary-total-sold').textContent = `$${(orderData.totalValueSold || 0).toFixed(2)}`;
    document.getElementById('summary-total-paid').textContent = `$${(orderData.totalAmountPaid || 0).toFixed(2)}`;
    document.getElementById('summary-balance-due').textContent = `$${(orderData.balanceDue || 0).toFixed(2)}`;

    // Populate header with the new order's data
    document.getElementById('selected-consignment-id').textContent = orderData.consignmentId;
    document.getElementById('selected-consignment-member').textContent = orderData.requestingMemberName;
    document.getElementById('selected-consignment-team').textContent = orderData.teamName;

    // Detach any listeners from a previously selected order to prevent memory leaks
    unsubscribeConsignmentDetailsListeners.forEach(unsub => unsub());
    unsubscribeConsignmentDetailsListeners = [];

    const db = firebase.firestore();
    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(orderData.id);

    if (orderData.status === 'Pending') {
        // --- HANDLE "PENDING" STATE ---
        fulfillmentView.classList.remove('hidden');
        activeOrderView.classList.add('hidden');

        // Perform a one-time fetch to populate the fulfillment grid
        if (fulfillmentItemsGridApi) fulfillmentItemsGridApi.setGridOption('loading', true);
        orderRef.collection('items').get().then(snapshot => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const itemsToFulfill = items.map(item => ({ ...item, quantityCheckedOut: item.quantityRequested }));

            if (fulfillmentItemsGridApi) {
                fulfillmentItemsGridApi.setGridOption('rowData', itemsToFulfill);
                fulfillmentItemsGridApi.setGridOption('loading', false);
            }
        });

    } else if (orderData.status === 'Active') {
        // --- HANDLE "ACTIVE" STATE ---
        fulfillmentView.classList.add('hidden');
        activeOrderView.classList.remove('hidden');

        // Default to the first tab
        switchConsignmentTab('tab-items-on-hand');

        // --- [NEW] We need a listener on the main order document itself ---
        // This will keep the financial summary panel updated in real-time.
        const orderUnsub = orderRef.onSnapshot(doc => {
            console.log("[Firestore] Received update for main consignment order document.");
            const updatedOrderData = doc.data();
            if (updatedOrderData) {
                document.getElementById('summary-total-sold').textContent = `$${(updatedOrderData.totalValueSold || 0).toFixed(2)}`;
                document.getElementById('summary-total-paid').textContent = `$${(updatedOrderData.totalAmountPaid || 0).toFixed(2)}`;
                document.getElementById('summary-balance-due').textContent = `$${(updatedOrderData.balanceDue || 0).toFixed(2)}`;
            }
        });

        let isFirstItemsLoad = true;

        // 1. Set up the real-time listener for the "Items on Hand" grid
        const itemsUnsub = orderRef.collection('items').orderBy('productName').onSnapshot(snapshot => {
            console.log("[Firestore] Received update for consignment items.");
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (consignmentItemsGridApi) {
                if (isFirstItemsLoad) {
                    // --- ON FIRST LOAD ---
                    // Use setGridOption to safely populate the initially empty grid.
                    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    consignmentItemsGridApi.setGridOption('rowData', items);
                    isFirstItemsLoad = false; // Set the flag so we don't do this again.
                    console.log("Performed initial grid load with setGridOption.");
                } else {
                    // --- ON ALL SUBSEQUENT UPDATES ---
                    // Process only the documents that have changed.
                    const updates = [];
                    snapshot.docChanges().forEach(change => {
                        if (change.type === 'modified') {
                            updates.push({ id: change.doc.id, ...change.doc.data() });
                        }
                    });

                    if (updates.length > 0) {
                        // Use applyTransaction for efficient, in-place updates.
                        consignmentItemsGridApi.applyTransaction({ update: updates });
                        // Force a refresh to recalculate the "On Hand" column.
                        consignmentItemsGridApi.refreshCells({ force: true });
                        console.log(`Applied ${updates.length} updates and refreshed cells.`);
                    }
                }
            }
        });

        // 2. Set up the real-time listener for the "Activity Log" grid
        const activityUnsub = orderRef.collection('activityLog').orderBy('activityDate', 'desc').onSnapshot(snapshot => {
            console.log("[Firestore] Received update for activity log.");
            const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (consignmentActivityGridApi) {
                consignmentActivityGridApi.setGridOption('rowData', activities);
            }
        });

        // 3. Set up the real-time listener for the "Payments" grid
        const paymentsUnsub = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('orderId', '==', orderData.id) // We should link payments directly to the order
            .onSnapshot(snapshot => {
                console.log("[Firestore] Received update for payments.");
                const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (consignmentPaymentsGridApi) {
                    consignmentPaymentsGridApi.setGridOption('rowData', payments);
                }
            });


        // Store all FOUR unsubscribe functions for later cleanup
        unsubscribeConsignmentDetailsListeners.push(orderUnsub, itemsUnsub, activityUnsub, paymentsUnsub);

    }

    // Finally, make the entire detail panel visible
    detailPanel.classList.remove('hidden');
}

// 5. Add new listeners to the main cleanup function
//detachAllRealtimeListeners() 

// 6. Create functions to manage the Request Modal
export async function showConsignmentRequestModal() {
    // This function will contain the complex role-based logic we designed.
    // For now, it just shows the modal.
    const modal = document.getElementById('consignment-request-modal');

    if (!modal) return;

    resetConsignmentRequestModal();

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

export function closeConsignmentRequestModal() {
    const modal = document.getElementById('consignment-request-modal');
    if (!modal) return;

    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';

        // Also reset its internal state when closing.
        resetConsignmentRequestModal();
    }, 300);
}

/**
 * [NEW] Retrieves the items with requested quantities from the product request grid.
 * @returns {Array<object>} An array of item objects where quantity > 0.
 */
export function getRequestedConsignmentItems() {
    if (!requestProductsGridApi) {
        console.error("Cannot get requested items: requestProductsGridApi is not ready.");
        return [];
    }

    const requestedItems = [];
    // Use the grid's own API to iterate through the rows.
    requestProductsGridApi.forEachNode(node => {
        // Only include items where the user has requested a quantity greater than 0.
        // 1. Explicitly read the quantity and default it to 0 if it's undefined or invalid.
        const quantity = parseInt(node.data.quantityRequested, 10) || 0;
        // 2. Only include items where the user has requested a quantity greater than 0.
        if (quantity > 0) {
            // 3. Build a brand new, clean object with only the fields we need.
            requestedItems.push({
                productId: node.data.productId,
                productName: node.data.productName,
                sellingPrice: node.data.sellingPrice,
                quantityRequested: quantity // Use the sanitized quantity
            });
        }
    });

    console.log("Cleaned items to be saved:", requestedItems);
    return requestedItems;
}

/**
 * [NEW] Hides Step 1 and shows Step 2 of the consignment request modal.
 * Populates the product selection grid.
 * @param {string} catalogueId - The ID of the selected sales catalogue.
 */
export function showConsignmentRequestStep2(catalogueId) {
    // 1. Switch visibility of the steps and buttons
    document.getElementById('consignment-step-1').classList.add('hidden');
    document.getElementById('consignment-step-2').classList.remove('hidden');
    document.getElementById('consignment-next-btn').classList.add('hidden');
    document.getElementById('consignment-submit-request-btn').classList.remove('hidden');

    // 2. Fetch the items for the selected catalogue
    // We need a new API function for this. For now, we'll assume it exists.
    // Let's call it getItemsForCatalogue(catalogueId)
    const db = firebase.firestore();
    const itemsRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(catalogueId).collection('items');

    if (requestProductsGridApi) {
        requestProductsGridApi.setGridOption('loading', true);
        itemsRef.get().then(snapshot => {
            const catalogueItems = snapshot.docs.map(doc => ({ ...doc.data(), quantityRequested: 0 })); // Default qty to 0
            requestProductsGridApi.setGridOption('rowData', catalogueItems);
            requestProductsGridApi.setGridOption('loading', false);
        });
    }
}

/**
 * [NEW] Resets the multi-step consignment request modal to its initial state (Step 1).
 */
export function resetConsignmentRequestModal() {
    const form = document.getElementById('consignment-request-form');
    if (!form) return;

    // 1. Reset the entire form, which clears all dropdowns and inputs.
    form.reset();

    // 2. Explicitly show Step 1 and hide Step 2.
    document.getElementById('consignment-step-1').classList.remove('hidden');
    document.getElementById('consignment-step-2').classList.add('hidden');

    // 3. Explicitly show the "Next" button and hide the "Submit" button.
    document.getElementById('consignment-next-btn').classList.remove('hidden');
    document.getElementById('consignment-submit-request-btn').classList.add('hidden');

    // 4. Clear any data in the product request grid.
    if (requestProductsGridApi) {
        requestProductsGridApi.setGridOption('rowData', []);
    }

    const nextButton = document.getElementById('consignment-next-btn');
    if (nextButton) {
        nextButton.disabled = true;
    }

}

// [NEW] Grid for the Product Selection step in the Request Modal
const requestProductsGridOptions = {
    getRowId: params => params.data.productId,
    columnDefs: [
        { field: "productName", headerName: "Product", flex: 1, filter: 'agDateColumnFilter' },
        {
            field: "inventoryCount",
            headerName: "Qty Available",
            width: 140,
            // We'll look this up from the master product list
            valueGetter: params => {
                const product = masterData.products.find(p => p.id === params.data.productId);
                return product ? product.inventoryCount : 'N/A';
            }
        },
        {
            field: "sellingPrice",
            headerName: "Selling Price",
            width: 140,
            valueFormatter: p => p.value ? formatCurrency(p.value)  : ''
        },
        {
            field: "quantityRequested",
            headerName: "Qty to Request",
            width: 150,
            editable: true,
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
                min: 0,
                precision: 0 // Only whole numbers
            }
        }
    ],
    onGridReady: params => { requestProductsGridApi = params.api; }
};

/**
 * [NEW] Retrieves the final list of items and their fulfillment quantities
 * from the fulfillment grid.
 * @returns {Array<object>} An array of item objects with their final quantities.
 */
export function getFulfillmentItems() {
    if (!fulfillmentItemsGridApi) {
        console.error("Cannot get fulfillment items: fulfillmentItemsGridApi is not ready.");
        return [];
    }
    const finalItems = [];
    fulfillmentItemsGridApi.forEachNode(node => {
        if (node.data && node.data.quantityCheckedOut > 0) {
            finalItems.push(node.data);
        }
    });
    return finalItems;
}

/**
 * [NEW] Refreshes the consignment detail panel for a given order ID.
 * It finds the latest data from the master grid and re-renders the panel.
 * @param {string} orderId - The ID of the order to refresh.
 */
export function refreshConsignmentDetailPanel(orderId) {
    if (!consignmentOrdersGridApi) {
        console.error("Cannot refresh detail panel: master grid API not ready.");
        hideConsignmentDetailPanel();
        return;
    }

    const updatedOrderNode = consignmentOrdersGridApi.getRowNode(orderId);
    if (updatedOrderNode) {
        // This re-runs the logic to show either the "Fulfillment" or "Active" view
        // based on the new, updated status of the order.
        renderConsignmentDetail(updatedOrderNode.data);
    } else {
        // If the order somehow disappeared, hide the panel.
        hideConsignmentDetailPanel();
    }
}


/**
 * [NEW] The main function to display the Consignment Management view.
 */
export function showConsignmentView() {
    // 1. Standard view setup
    showView('consignment-view');
    initializeConsignmentGrids();
    hideConsignmentDetailPanel(); // Ensure a clean state on view load

    const db = firebase.firestore();
    const user = appState.currentUser;

    // Safety check in case the view is accessed before user state is ready
    if (!user) {
        console.error("Cannot show consignment view: no user is logged in.");
        // Optionally, clear the grid if it had old data
        if (consignmentOrdersGridApi) {
            consignmentOrdersGridApi.setGridOption('rowData', []);
        }
        return;
    }

    // 2. Clean up any previous listener before attaching a new one
    if (unsubscribeConsignmentOrdersListener) {
        unsubscribeConsignmentOrdersListener();
    }

    // --- THIS IS THE NEW, ROLE-BASED LOGIC ---

    // 3. Start with a base query reference.
    let ordersQuery = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH);

    // 4. If the user is NOT an admin, add a 'where' clause to filter the query.
    if (user.role !== 'admin') {
        // This filters the documents to only those where the 'requestingMemberId'
        // field matches the logged-in user's unique ID.
        ordersQuery = ordersQuery.where('requestingMemberId', '==', user.uid);
    }

    // 5. Apply the ordering to the final query and attach the listener.
    if (consignmentOrdersGridApi) {
        consignmentOrdersGridApi.setGridOption('loading', true);
    }

    unsubscribeConsignmentOrdersListener = ordersQuery.orderBy('requestDate', 'desc')
        .onSnapshot(snapshot => {
            console.log("[Firestore] Received update for master consignment orders list.");
            const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (consignmentOrdersGridApi) {
                consignmentOrdersGridApi.setGridOption('rowData', orders);
                consignmentOrdersGridApi.setGridOption('loading', false);
            }
        }, error => {
            console.error("Error listening to consignment orders:", error);
            // IMPORTANT: Check the console for an indexing error message!
            if (consignmentOrdersGridApi) {
                consignmentOrdersGridApi.setGridOption('loading', false);
            }
        });
}






/**
 * [NEW] Opens the modal for reporting activity on a consignment.
 * It intelligently populates the product list with only items that are on hand. -- [NEED TO DELETE THIS]
 */
export function showReportActivityModal() {
    const modal = document.getElementById('report-activity-modal');
    if (!modal) return;

    const form = document.getElementById('report-activity-form');
    form.reset();

    document.getElementById('activity-event-container').classList.add('hidden');

    // Store the current order ID in a hidden field for the form submission
    document.getElementById('activity-order-id').value = appState.selectedConsignmentId;

    const productSelect = document.getElementById('activity-product-select');
    productSelect.innerHTML = '<option value="">Select a product...</option>';

    // Iterate through the "Items on Hand" grid to find available products
    consignmentItemsGridApi.forEachNode(node => {
        const item = node.data;
        const onHand = item.quantityCheckedOut - (item.quantitySold + item.quantityReturned + item.quantityDamaged);

        // Only add products to the dropdown if the team lead has one or more on hand
        if (onHand > 0) {
            const option = document.createElement('option');
            // We need to store multiple pieces of data, so we'll use a JSON string
            option.value = JSON.stringify({
                itemId: item.id,
                productId: item.productId,
                sellingPrice: item.sellingPrice // <-- Add this
            });
            option.textContent = `${item.productName} (${onHand} on hand)`;
            productSelect.appendChild(option);
        }
    });

    const eventContainer = document.getElementById('activity-event-container');
    const eventSelect = document.getElementById('activity-event-select');
    eventContainer.classList.add('hidden'); // Hide it by default
    eventSelect.innerHTML = '<option value="">None</option>';

    // 1. Find the full data for the currently selected consignment order from the master grid.
    const orderNode = consignmentOrdersGridApi.getRowNode(appState.selectedConsignmentId);
    if (orderNode && orderNode.data) {
        const orderData = orderNode.data;

        // 2. Find the catalogue and its seasonId from the order data.
        const catalogue = masterData.salesCatalogues.find(sc => sc.id === orderData.salesCatalogueId);
        if (catalogue) {
            const parentSeasonId = catalogue.seasonId;

            // 3. Filter all master sales events to find ones matching that season.
            const relevantEvents = masterData.salesEvents.filter(event => event.seasonId === parentSeasonId);

            // 4. Populate the dropdown with the found events.
            if (relevantEvents.length > 0) {
                relevantEvents.forEach(event => {
                    const option = document.createElement('option');
                    option.value = event.id;
                    option.textContent = event.eventName;
                    eventSelect.appendChild(option);
                });
            }
        }
    }


    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

/**
 * [NEW] Closes the report activity modal. [NEED TO DELETE THIS]
 */
export function closeReportActivityModal() {
    const modal = document.getElementById('report-activity-modal');
    if (!modal) return;
    modal.classList.remove('visible');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}






// 2. Add the new grid options object
const consignmentActivityGridOptions = {
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 100,
    paginationPageSizeSelector: [10, 50, 100, 200],
    defaultColDef: {
        resizable: true,
        sortable: true,
        wrapText: true,      // Wrap cell content
        autoHeight: true,    // Adjust row height automatically
        wrapHeaderText: true, // Wrap header text
        autoHeaderHeight: true // Adjust header height automatically
    },
    columnDefs: [
        {
            field: "activityDate",
            headerName: "Date",
            width: 200,
            filter: 'agDateColumnFilter',
            valueFormatter: p => p.value ? p.value.toDate().toLocaleString() : ''
        },
        {
            field: "activityType",
            headerName: "Activity",
            width: 120,
            filter: 'agTextColumnFilter',
            cellRenderer: p => {
                const type = p.value;
                if (type === 'Sale') return `<span class="font-semibold text-green-700">${type}</span>`;
                if (type === 'Return') return `<span class="font-semibold text-blue-700">${type}</span>`;
                if (type === 'Damage') return `<span class="font-semibold text-orange-700">${type}</span>`;
                if (type === 'Correction') return `<span class="font-semibold text-gray-700">${type}</span>`;
                return type;
            }
        },
        {
            field: "productName",
            headerName: "Product",
            filter: 'agTextColumnFilter',
            width: 200,
            flex: 1
        },
        {
            field: "quantity",
            headerName: "Qty Change",
            width: 120,
            cellStyle: params => {
                return params.value > 0 ? { color: 'green' } : { color: 'red' };
            },
            valueFormatter: p => {
                return p.value > 0 ? `+${p.value}` : p.value;
            }
        },
        {
            field: "unitSellingPrice",
            headerName: "Unit Price",
            width: 110,
            // --- THIS IS THE FIX ---
            valueFormatter: p => (p.value && p.value !== 0) ? formatCurrency(p.value) : ''
        },
        {
            field: "totalSaleValue",
            headerName: "Sale Value",
            width: 130,
            // --- THIS IS THE FIX ---
            valueFormatter: p => (p.value && p.value !== 0) ? formatCurrency(p.value) : '',
            cellStyle: { 'font-weight': 'bold' }
        },
        { field: "recordedBy", headerName: "Recorded By", flex: 1 }
    ],
    defaultColDef: { resizable: true, sortable: true },
    onGridReady: params => { consignmentActivityGridApi = params.api; }
};



// [NEW] Grid for the "Payment History" panel
const consignmentPaymentsGridOptions = {
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 100,
    paginationPageSizeSelector: [10, 50, 100, 200],
    defaultColDef: {
        resizable: true,
        sortable: true,
        wrapText: true,      // Wrap cell content
        autoHeight: true,    // Adjust row height automatically
        wrapHeaderText: true, // Wrap header text
        autoHeaderHeight: true // Adjust header height automatically
    },
    columnDefs: [
        { field: "paymentDate", headerName: "Payment Date", width: 140, valueFormatter: p => p.value.toDate().toLocaleDateString() },
        { 
            field: "amountPaid", 
            headerName: "Amount", 
            width: 120, 
            valueFormatter: p => formatCurrency(p.value)
        },
        { field: "paymentMode", headerName: "Mode", flex: 1 },
        { field: "transactionRef", headerName: "Reference #", flex: 1 },
        {
            field: "paymentStatus", headerName: "Status", width: 180, cellRenderer: p => {
                const status = p.value;
                if (status === 'Verified') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">${status}</span>`;
                if (status === 'Pending Verification') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">${status}</span>`;
                if (status === 'Rejected') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">${status}</span>`;
                return status;
            }
        },
        {
            headerName: "Actions", width: 120, cellClass: 'flex items-center justify-center space-x-2',
            cellRenderer: params => {
                const data = params.data;
                if (!data) return '';

                // Define the icons
                const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" /></svg>`;
                const cancelIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
                const verifyIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4-5.5Z" clip-rule="evenodd" /></svg>`;

                let buttons = '';
                // Show Edit/Cancel for pending payments, if the user is the one who submitted it
                if (data.paymentStatus === 'Pending Verification' && data.submittedBy === appState.currentUser.email) {
                    buttons += `<button class="action-btn-icon action-btn-edit-payment" data-id="${data.id}" title="Edit Payment Record">${editIcon}</button>`;
                    buttons += `<button class="action-btn-icon action-btn-delete action-btn-cancel-payment" data-id="${data.id}" title="Cancel Payment Record">${cancelIcon}</button>`;
                }

                if (data.paymentStatus === 'Pending Verification' && appState.currentUser.role === 'admin') {
                    buttons += `<button class="action-btn-icon action-btn-verify-payment" data-id="${data.id}" title="Verify Payment">${verifyIcon}</button>`;
                }
                return buttons;
            }
        }
    ],
    onGridReady: params => { consignmentPaymentsGridApi = params.api; }
};



/**
 * [NEW] Resets the payment reconciliation form to its default "create" state.
 */
export function resetPaymentForm() {

    const form = document.getElementById('make-payment-form');
    if (!form) return;

    // 1. Reset the form fields and buttons to their default "Create" state.
    form.reset();

    const currencySymbol = masterData.systemSetups?.systemCurrency || '$';
    document.getElementById('payment-amount-currency-symbol').textContent = currencySymbol;

    document.getElementById('payment-ledger-doc-id').value = '';
    document.getElementById('payment-form-title').textContent = "Make a Payment"; // Or "2. Record Your Payment"
    document.getElementById('submit-payment-record-btn').textContent = 'Submit Payment Record';
    document.getElementById('cancel-payment-edit-btn').classList.add('hidden');


    if (consignmentPaymentsGridApi) {
        consignmentPaymentsGridApi.deselectAll();
    }
}


/**
 * [CORRECTED & SIMPLIFIED] Loads an existing pending payment record into the form for editing.
 */
export function loadPaymentRecordForEditing(paymentData) {
    const form = document.getElementById('make-payment-form');
    if (!form) return;

    // 1. Switch the form to "Edit Mode"
    document.getElementById('payment-ledger-doc-id').value = paymentData.id;
    document.getElementById('payment-form-title').textContent = "Edit Pending Payment";
    document.getElementById('submit-payment-record-btn').textContent = 'Update Payment Record';
    document.getElementById('cancel-payment-edit-btn').classList.remove('hidden');

    // 2. Populate the form fields with the data from the selected payment.
    const currencySymbol = masterData.systemSetups?.systemCurrency || '$';

    document.getElementById('payment-amount-currency-symbol').textContent = currencySymbol;
    document.getElementById('payment-amount-input').value = paymentData.amountPaid.toFixed(2);
    
    document.getElementById('payment-date-input').valueAsDate = paymentData.paymentDate.toDate();
    document.getElementById('payment-mode-select').value = paymentData.paymentMode;
    document.getElementById('payment-reason-select').value = paymentData.paymentReason;
    document.getElementById('payment-ref-input').value = paymentData.transactionRef;
    document.getElementById('payment-notes-input').value = paymentData.notes || '';

    // The 'notes' field might not exist on your form, but if it does, this is correct.
    // If you removed it, you can remove this line.
    const notesInput = document.getElementById('payment-notes-input');
    if (notesInput) {
        notesInput.value = paymentData.notes || '';
    }


}


// =======================================================
// --- SALES MANAGEMENT UI ---
// =======================================================

// 1. Define variables for the new grids and modals
let salesCartGridApi = null;
let salesHistoryGridApi = null;
let addProductModalGridApi = null; // For the grid inside the modal
let isSalesGridsInitialized = false;
let unsubscribeSalesHistoryListener = null;

// 2. Define AG-Grid Options

// Grid for the "Shopping Cart"
const salesCartGridOptions = {
    getRowId: params => params.data.productId,
    columnDefs: [
        { field: "productName", headerName: "Product", flex: 1 },
        {
            field: "quantity",
            headerName: "Qty",
            width: 100,
            editable: true,
            valueParser: p => parseInt(p.newValue, 10) || 0
        },
        {
            field: "unitPrice",
            headerName: "Unit Price",
            width: 120,
            editable: false, // This is correct, the price is not editable here.

            valueFormatter: p => formatCurrency(p.value),
        },
        {
            field: "discountPercentage",
            headerName: "Disc. %",
            width: 90,
            editable: true,
            valueParser: p => parseFloat(p.newValue) || 0,
            // [SIMPLIFIED] Formatter to always show a percentage
            valueFormatter: p => `${p.value || 0}%`
        },
        // --- [NEW] Line Item Tax Column ---
        {
            field: "taxPercentage",
            headerName: "Tax %",
            width: 90,
            editable: true,
            valueParser: p => parseFloat(p.newValue) || 0,
            // [SIMPLIFIED] Formatter to always show a percentage
            valueFormatter: p => `${p.value || 0}%`
        },
        // --- [NEW] Calculated Line Total Column ---
        {
            headerName: "Line Total",
            width: 120,
            editable: false,
            cellStyle: { 'font-weight': 'bold' },
            // The valueGetter is correct and remains unchanged.
            valueGetter: params => {
                const qty = params.data.quantity || 0;
                const price = params.data.unitPrice || 0;
                const disc = params.data.discountPercentage || 0;
                const tax = params.data.taxPercentage || 0;
                const lineSubtotal = (qty * price) * (1 - disc / 100);
                const lineTotal = lineSubtotal * (1 + tax / 100);
                return lineTotal;
            },
            // --- THIS IS THE FIX ---
            // Use the centralized formatCurrency helper.
            valueFormatter: p => formatCurrency(p.value)
        },
        {
            headerName: "Remove",
            width: 90,
            cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const removeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
                return `<button class="action-btn-icon action-btn-delete action-btn-remove-from-cart" data-id="${params.data.productId}" title="Remove Item">${removeIcon}</button>`;
            }
        }
    ],
    onCellValueChanged: () => {
        // Recalculate totals whenever a cell in the cart is edited
        calculateSalesTotals();
    },
    onGridReady: (params) => {
        console.log("[ui.js] Sales Cart Grid is now ready.");
        salesCartGridApi = params.api;
    }
};

// Grid for the "Add Product" modal
const addProductModalGridOptions = {
    getRowId: params => params.data.id,
    columnDefs: [
        { field: "itemName", headerName: "Product Name", flex: 1, filter: 'agTextColumnFilter' },
        { field: "inventoryCount", headerName: "Stock", width: 100 },
        {
            headerName: "Add",
            width: 80,
            cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const addIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" /></svg>`;
                return `<button class="action-btn-icon action-btn-add-to-cart" data-id="${params.data.id}" title="Add to Cart">${addIcon}</button>`;
            }
        }
    ],
    onGridReady: params => { addProductModalGridApi = params.api; }
};

// Grid for the "Sales History"
const salesHistoryGridOptions = {
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 50, // A reasonable default for a history grid
    paginationPageSizeSelector: [25, 50, 100],

    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
    },

    columnDefs: [
        {
            headerName: "Actions",
            width: 100,
            cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const paymentIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M2.25 8.25h15.5a2.25 2.25 0 0 1 2.25 2.25v6a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 16.5v-6a2.25 2.25 0 0 1 2.25-2.25Z" /><path d="M1.5 8.25a.75.75 0 0 1 .75-.75h15.5a.75.75 0 0 1 .75.75v.5a.75.75 0 0 1-.75.75H2.25a.75.75 0 0 1-.75-.75v-.5ZM16 12.5a.75.75 0 0 0 0-1.5h-1a.75.75 0 0 0 0 1.5h1Z" /></svg>`;
                return `<button class="action-btn-icon hover:text-blue-600 action-btn-manage-payments" data-id="${params.data.id}" title="View Details & Manage Payments">${paymentIcon}</button>`;
            }
        },
        { field: "saleId", headerName: "Invoice ID", width: 180, filter: 'agTextColumnFilter' },
        {
            field: "saleDate",
            headerName: "Date",
            width: 140,
            valueFormatter: p => p.value.toDate().toLocaleDateString(),
            filter: 'agDateColumnFilter'
        },
        { field: "customerInfo.name", headerName: "Customer", width: 150, flex: 1, filter: 'agTextColumnFilter' },
        { field: "store", headerName: "Store", width: 150, filter: 'agTextColumnFilter' },
        {
            field: "financials.totalAmount",
            headerName: "Total",
            width: 120,
            valueFormatter: p => formatCurrency(p.value)
        },
        {
            field: "balanceDue",
            headerName: "Balance Due",
            width: 120,
            valueFormatter: p => formatCurrency(p.value)
        },
        {
            field: "paymentStatus",
            headerName: "Status",
            width: 140,
            filter: 'agTextColumnFilter',
            cellRenderer: p => {
                const status = p.value;
                if (status === 'Paid') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">${status}</span>`;
                if (status === 'Partially Paid') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">${status}</span>`;
                return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">${status}</span>`;
            }
        },
        { field: "audit.createdBy", headerName: "Created By", flex: 1, filter: 'agTextColumnFilter' }
    ],
    onGridReady: (params) => {
        console.log("[ui.js] Sales History Grid is now ready. Attaching listener.");
        salesHistoryGridApi = params.api;

        const db = firebase.firestore();
        const user = appState.currentUser;
        if (!user) return;

        // Clean up any old listener from a previous grid instance.
        if (unsubscribeSalesHistoryListener) {
            unsubscribeSalesHistoryListener();
        }

        let salesQuery = db.collection(SALES_COLLECTION_PATH);
        if (user.role !== 'admin') {
            console.log(`Querying for sales where 'audit.createdBy' is EXACTLY: "${user.email}"`);
            salesQuery = salesQuery.where('audit.createdBy', '==', user.email);
        }

        salesHistoryGridApi.setGridOption('loading', true);
        
        unsubscribeSalesHistoryListener = salesQuery.orderBy('saleDate', 'desc')
            .onSnapshot(snapshot => {
                console.log(`[Firestore] Sales history update. Found ${snapshot.size} documents.`);
                const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                salesHistoryGridApi.setGridOption('rowData', sales);

                // Also use setGridOption to hide the overlay for consistency.
                salesHistoryGridApi.setGridOption('loading', false);
                
            }, error => {
                console.error("Error with sales history listener:", error);
                // Check console for index error URL!
                if (salesHistoryGridApi) salesHistoryGridApi.setGridOption('loading', false);
            });
    }
};

// 3. Create Initialization and Helper Functions

export function initializeSalesGrids() {

    const cartGridDiv = document.getElementById('sales-cart-grid');
    const historyGridDiv = document.getElementById('sales-history-grid');
    const addProductModalGridDiv = document.getElementById('add-product-modal-grid'); // We need to add this ID to the modal in index.html
    const salePaymentItemsGridDiv = document.getElementById('sale-payment-items-grid');

    const salePaymentHistoryGridDiv = document.getElementById('sale-payment-history-grid'); 

    // Destroy old grids before creating new ones to prevent memory leaks
    if (cartGridDiv) cartGridDiv.innerHTML = '';
    if (historyGridDiv) historyGridDiv.innerHTML = '';
    if (addProductModalGridDiv) addProductModalGridDiv.innerHTML = '';

    if (cartGridDiv && historyGridDiv && addProductModalGridDiv && salePaymentItemsGridDiv && salePaymentHistoryGridDiv) {
        console.log("[ui.js] Initializing (or re-initializing) Sales grids.");
        salesCartGridApi = createGrid(cartGridDiv, salesCartGridOptions);
        salesHistoryGridApi = createGrid(historyGridDiv, salesHistoryGridOptions);
        addProductModalGridApi = createGrid(addProductModalGridDiv, addProductModalGridOptions);
        salePaymentItemsGridApi = createGrid(salePaymentItemsGridDiv, salePaymentItemsGridOptions);
        salePaymentHistoryGridApi = createGrid(salePaymentHistoryGridDiv, salePaymentHistoryGridOptions);
    }
}

// The crucial function for real-time calculations
export function calculateSalesTotals() {

    if (!salesCartGridApi) return;

    let itemsSubtotal = 0;
    let totalItemLevelTax = 0;

    // 1. Calculate totals from the grid rows
    salesCartGridApi.forEachNode(node => {
        const item = node.data;
        const qty = item.quantity || 0;
        const price = item.unitPrice || 0;
        const lineDiscPercent = item.discountPercentage || 0;
        const lineTaxPercent = item.taxPercentage || 0;

        // --- SIMPLIFIED LOGIC ---
        // We only need to calculate the values for display in the summary.
        // We no longer save them back to the grid here.
        const discountedLinePrice = (qty * price) * (1 - lineDiscPercent / 100);
        const lineTax = discountedLinePrice * (lineTaxPercent / 100);
        
        itemsSubtotal += discountedLinePrice;
        totalItemLevelTax += lineTax;
    });

    // 2. Get order-level adjustments (This part is correct)
    const orderDiscPercent = parseFloat(document.getElementById('sale-order-discount').value) || 0;
    const orderTaxPercent = parseFloat(document.getElementById('sale-order-tax').value) || 0;

    // 3. Calculate final totals (This part is correct)
    const orderDiscountAmount = itemsSubtotal * (orderDiscPercent / 100);
    const finalTaxableAmount = itemsSubtotal - orderDiscountAmount;
    const orderLevelTaxAmount = finalTaxableAmount * (orderTaxPercent / 100);
    
    const finalTotalTax = totalItemLevelTax + orderLevelTaxAmount;
    const grandTotal = finalTaxableAmount + finalTotalTax;

    // 4. Update the UI (This part is correct)
    document.getElementById('sale-subtotal').textContent = formatCurrency(itemsSubtotal);
    document.getElementById('sale-tax').textContent = `$${finalTotalTax.toFixed(2)}`;
    document.getElementById('sale-grand-total').textContent = formatCurrency(grandTotal);

    // 5. Update change/balance due display (This part is correct)
    const amountReceived = parseFloat(document.getElementById('sale-amount-received').value) || 0;
    const paymentStatusDisplay = document.getElementById('payment-status-display');

    // --- [NEW] DYNAMIC STATUS LOGIC ---
    if (document.getElementById('sale-payment-type').value === 'Pay Later (Invoice)') {
        // If it's an invoice, the balance due is the full amount.
        paymentStatusDisplay.innerHTML = `Balance Due: <span class="text-red-600">${formatCurrency(grandTotal)}</span>`;
    } else if (amountReceived === 0) {
        // If paying now, but no amount entered yet, show nothing.
        paymentStatusDisplay.innerHTML = '';
    } else if (amountReceived > grandTotal) {
        // Overpayment / Donation scenario
        const overpayment = amountReceived - grandTotal;
        paymentStatusDisplay.innerHTML = `Change/Donation: <span class="text-green-600">${formatCurrency(overpayment)}</span>`;
    } else if (amountReceived < grandTotal) {
        // Partial payment / Underpayment scenario
        const balanceRemaining = grandTotal - amountReceived;
        paymentStatusDisplay.innerHTML = `Balance Due: <span class="text-red-600">${formatCurrency(balanceRemaining)}</span>`;
    } else {
        // Exact payment
        paymentStatusDisplay.innerHTML = `Change Due: <span class="text-green-600">${formatCurrency(0)}</span>`;
    }


}

// Functions to manage the "Add Product" modal
export function showAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (!modal) return;

    // Populate the grid inside the modal with available products
    if (addProductModalGridApi) {
        const availableProducts = masterData.products.filter(p => p.isActive && p.inventoryCount > 0);
        addProductModalGridApi.setGridOption('rowData', availableProducts);
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

export function closeAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (!modal) return;
    modal.classList.remove('visible');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}

// 4. Create the main view function
export function showSalesView() {
    
    // 1. Show the main view container and initialize all its grids.
    showView('sales-view');
    initializeSalesGrids(); // This will create the grid and trigger its onGridReady event.


    setTimeout(() => {

        // 2. Reset the "New Sale" form to its default state.
        document.getElementById('new-sale-form').reset();

        // Default the sale date to today. This will now work.
        document.getElementById('sale-date').valueAsDate = new Date();

        if (salesCartGridApi) salesCartGridApi.setGridOption('rowData', []);
        calculateSalesTotals();
        //document.getElementById('sale-pay-now-container').classList.add('hidden');

        // 3. Populate the dropdowns on the form.
        const storeSelect = document.getElementById('sale-store-select');
        storeSelect.innerHTML = '<option value="">Select a store...</option>';
        if (masterData.systemSetups && masterData.systemSetups.Stores) {
            masterData.systemSetups.Stores.forEach(store => {
                const option = document.createElement('option');
                option.value = store;
                option.textContent = store;
                storeSelect.appendChild(option);
            });
        }

        const paymentModeSelect = document.getElementById('sale-payment-mode');
        paymentModeSelect.innerHTML = '<option value="">Select mode...</option>';
        masterData.paymentModes.forEach(mode => {
            if (mode.isActive) {
                const option = document.createElement('option');
                option.value = mode.paymentMode;
                option.textContent = mode.paymentMode;
                paymentModeSelect.appendChild(option);
            }
        });

    }, 0); 
    

}

/**
 * [NEW] Adds a single product item to the sales cart grid.
 * @param {object} itemData - The product item to add.
 */
export function addItemToCart(itemData) {
    if (!salesCartGridApi) {
        console.error("Cannot add item to cart: salesCartGridApi is not ready.");
        return;
    }
    // Use applyTransaction to add the new row.
    salesCartGridApi.applyTransaction({ add: [itemData] });

    // After adding, immediately recalculate the totals.
    calculateSalesTotals();
}


/**
 * [NEW] Retrieves all items currently in the sales cart grid.
 * @returns {Array<object>} An array of all item objects in the cart.
 */
export function getSalesCartItems() {
    if (!salesCartGridApi) {
        console.error("Cannot get cart items: salesCartGridApi is not ready.");
        return [];
    }
    const items = [];
    salesCartGridApi.forEachNode(node => items.push(node.data));
    return items;
}


/**
 * [REFACTORED] Removes an item from the sales cart grid by its product ID.
 * @param {string} productId - The ID of the product to remove.
 */
export function removeItemFromCart(productId) {
    if (!salesCartGridApi) return;
    const rowNode = salesCartGridApi.getRowNode(productId);
    if (rowNode) {
        salesCartGridApi.applyTransaction({ remove: [rowNode.data] });
        // After removing, immediately recalculate the totals.
        calculateSalesTotals();
    }
}

let salePaymentItemsGridApi = null;


// [NEW] Grid for the items inside the "Record Sale Payment" modal
const salePaymentItemsGridOptions = {
    // No getRowId needed as we won't be updating rows directly
    columnDefs: [
        { field: "productName", headerName: "Product", flex: 1 },
        { field: "quantity", headerName: "Qty", width: 80 },
        { 
            field: "unitPrice", 
            headerName: "Unit Price", 
            width: 120, 
            // --- THIS IS THE FIX ---
            valueFormatter: p => formatCurrency(p.value) 
        },
        { 
            field: "lineTotal", 
            headerName: "Line Total", 
            width: 120, 
            valueFormatter: p => formatCurrency(p.value) 
        }
    ],
    defaultColDef: { resizable: true, sortable: true },
    onGridReady: params => { salePaymentItemsGridApi = params.api; }
};


/**
 * [REFACTORED] Opens and populates the modal for managing payments for a sales invoice.
 * @param {object} invoiceData - The data for the selected sales invoice.
 */
export function showRecordSalePaymentModal(invoiceData) {
    const modal = document.getElementById('record-sale-payment-modal');
    if (!modal) return;

    const form = document.getElementById('record-sale-payment-form');
    form.reset();

    // 1. Populate hidden input and header (Your existing code is correct)
    document.getElementById('record-sale-invoice-id').value = invoiceData.id;
    document.getElementById('sale-payment-modal-title').textContent = `Manage Payments for Invoice #${invoiceData.saleId}`;
    document.getElementById('payment-modal-customer').textContent = invoiceData.customerInfo.name;
    document.getElementById('payment-modal-date').textContent = invoiceData.saleDate.toDate().toLocaleDateString();
    document.getElementById('payment-modal-store').textContent = invoiceData.store;

    // 2. Populate financial summary (Your existing code is correct)
    document.getElementById('payment-modal-total').textContent = formatCurrency(invoiceData.financials.totalAmount);
    document.getElementById('payment-modal-paid').textContent = formatCurrency(invoiceData.totalAmountPaid);
    document.getElementById('payment-modal-balance').textContent = formatCurrency(invoiceData.balanceDue);
    
    // 3. Default payment amount (Your existing code is correct)
    document.getElementById('record-sale-amount').value = (invoiceData.balanceDue || 0).toFixed(2);

    // 4. Populate the line items grid (Your existing code is correct)
    if (salePaymentItemsGridApi) {
        salePaymentItemsGridApi.setGridOption('rowData', invoiceData.lineItems);
    }

    // 5. Populate Payment Mode dropdown (Your existing code is correct)
    const paymentModeSelect = document.getElementById('record-sale-mode');
    // ...

    // --- [NEW] 6. Attach a real-time listener for this invoice's payment history ---
    const db = firebase.firestore();
    const paymentsQuery = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH)
        .where('invoiceId', '==', invoiceData.id)
        .orderBy('paymentDate', 'desc');
    
    if (salePaymentHistoryGridApi) {
        salePaymentHistoryGridApi.setGridOption('loading', true);
    }
    
    // Store the unsubscribe function on the modal element itself so we can find it later.
    modal.unsubscribeListener = paymentsQuery.onSnapshot(snapshot => {
        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (salePaymentHistoryGridApi) {
            salePaymentHistoryGridApi.setGridOption('rowData', payments);
            salePaymentHistoryGridApi.setGridOption('loading', false);
        }
    });
    // ---------------------------------------------------------------------------------

    // 7. Show the modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

/**
 * [REFACTORED] Closes the record sale payment modal and cleans up its listener.
 */
export function closeRecordSalePaymentModal() {
    const modal = document.getElementById('record-sale-payment-modal');
    if (!modal) return;
    
    // --- [NEW] Clean up the listener when the modal closes ---
    if (modal.unsubscribeListener && typeof modal.unsubscribeListener === 'function') {
        console.log("Detaching payment history listener.");
        modal.unsubscribeListener();
        delete modal.unsubscribeListener; // Clean up the property from the DOM element
    }
    // --------------------------------------------------------

    modal.classList.remove('visible');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
}



let salePaymentHistoryGridApi = null;

// [NEW] Grid for the payment history inside the "Manage Sale Payments" modal
const salePaymentHistoryGridOptions = {
    getRowId: params => params.data.id,
    columnDefs: [
        { field: "paymentDate", headerName: "Payment Date", width: 140, valueFormatter: p => p.value ? p.value.toDate().toLocaleDateString() : '' },
        { 
            field: "amountPaid", 
            headerName: "Amount Paid", 
            width: 120, 
            valueFormatter: p => formatCurrency(p.value),
            cellStyle: params => params.value < 0 ? { color: 'red' } : {}
        },
        { 
            field: "donationAmount", 
            headerName: "Donation", 
            width: 120,
            valueFormatter: p => (p.value && p.value !== 0) ? formatCurrency(p.value) : '',
            cellStyle: params => params.value < 0 ? { color: 'red' } : { 'font-weight': 'bold', color: 'purple' }
        },
        { field: "paymentMode", headerName: "Mode", flex: 1 },
        { 
            field: "status", 
            headerName: "Status", 
            width: 120, 
            cellRenderer: p => {
                if (p.value === 'Voided' || p.value === 'Void Reversal') return `<span class="text-xs font-semibold ... text-gray-600 bg-gray-200">${p.value}</span>`;
                return `<span class="text-xs font-semibold ... text-green-600 bg-green-200">${p.value}</span>`;
            }
        },
        {
            headerName: "Actions",
            width: 80,
            cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                // Only show the Void button for verified, non-voided payments
                if (params.data && params.data.status === 'Verified' && appState.currentUser.role === 'admin') {
                    const voidIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M15.312 1.312a2.25 2.25 0 0 0-3.182 0l-10 10a2.25 2.25 0 0 0 0 3.182l10 10a2.25 2.25 0 0 0 3.182-3.182L6.818 11.25h10.432a.75.75 0 0 0 0-1.5H6.818l8.494-8.494a2.25 2.25 0 0 0 0-3.182Z" clip-rule="evenodd" /></svg>`;
                    return `<button class="action-btn-icon action-btn-delete action-btn-void-sale-payment" data-id="${params.data.id}" title="Void Payment">${voidIcon}</button>`;
                }
                return '';
            }
        }
    ],
    onGridReady: params => { salePaymentHistoryGridApi = params.api; }
};

export function getSalePaymentDataFromGridById(paymentId) {
    if (!salesPaymentsGridApi) return null; // Assuming you create this API variable
    const rowNode = salesPaymentsGridApi.getRowNode(paymentId);
    return rowNode ? rowNode.data : null;
}









// --- RENDER FUNCTIONS ---

export function renderSidebar(role) {
    const sidebarNav = document.getElementById('sidebar-nav');
    sidebarNav.innerHTML = ''; // Clear existing links
    if (!role) return; // Don't render if no role

    navConfig.forEach(item => {
        // Check if the user's role is allowed to see this item
        if (item.roles.includes(role)) {

            const li = document.createElement('li');

            if (item.type === 'heading') {
                li.className = 'nav-heading';
                li.textContent = item.label;
            }
            else if (item.type === 'link') {
                const link = document.createElement('a');
                link.href = '#';
                link.className = 'nav-link';
                link.dataset.viewId = item.viewId;
                link.innerHTML = `${item.icon}<span>${item.label}</span>`;
                li.appendChild(link);
            }
            sidebarNav.appendChild(li);
        }
    });


}



export function showView(viewId) {


    // =================================================================
    // --- Close any open modals on navigation ---
    // =================================================================
    const customModal = document.getElementById('custom-modal');
    const paymentModal = document.getElementById('record-payment-modal');

    if (customModal && customModal.classList.contains('visible')) {
        console.log("[ui.js] Force-closing custom modal during navigation.");
        customModal.classList.remove('visible');
        customModal.style.display = 'none';
    }
    if (paymentModal && paymentModal.classList.contains('visible')) {
        console.log("[ui.js] Force-closing payment modal during navigation.");
        paymentModal.classList.remove('visible');
        paymentModal.style.display = 'none';
    }



    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.add('hidden');
    }

    detachAllRealtimeListeners();

    appState.activeView = viewId;
    views.forEach(view => {
        view.classList.toggle('active', view.id === viewId);
    });

    // Update the header title
    const navItem = navConfig.find(item => item.viewId === viewId);
    viewTitle.textContent = navItem ? navItem.label : 'Dashboard';

    // Update active link in sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.viewId === viewId);
    });


}

export function renderUserProfile(user) {
    authContainer.innerHTML = ''; // Clear previous content

    if (user) {
        // User is logged in
        const profileDiv = document.createElement('div');
        profileDiv.className = 'flex items-center space-x-3';
        profileDiv.innerHTML = `
            <span class="text-right">
                <span class="font-semibold text-gray-700">${user.displayName}</span>
                <span class="block text-xs text-gray-500">${user.role.replace('_', ' ')}</span>
            </span>
            <img class="h-10 w-10 rounded-full" src="${user.photoURL || 'https://placehold.co/40x40'}" alt="User Avatar">
            <button id="logout-button" class="p-2 rounded-full hover:bg-gray-200">
                <svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </button>
        `;
        authContainer.appendChild(profileDiv);
    } else {
        // User is logged out
        const loginButton = document.createElement('button');
        loginButton.id = 'login-button';
        loginButton.className = 'bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors';
        loginButton.textContent = 'Login with Google';
        authContainer.appendChild(loginButton);
    }
}

export function updateUI() {
    const user = appState.currentUser;
    renderUserProfile(user);
    renderSidebar(user ? user.role : null);

    if (user && user.role !== 'guest') {
        // If the user is logged in with a valid role, show their default view
        showView(appState.activeView || 'dashboard-view');
    } else {
        // If logged out or a guest, show the login view
        showView('login-view');
    }
}


/**
 * [NEW] Gets the data for a specific sales invoice row from the history grid.
 * @param {string} invoiceId - The document ID of the invoice.
 * @returns {object|null} The invoice's data object or null if not found.
 */
export function getSalesHistoryDataById(invoiceId) {
    if (!salesHistoryGridApi) {
        console.error("Cannot get invoice data: salesHistoryGridApi is not ready.");
        return null;
    }
    const rowNode = salesHistoryGridApi.getRowNode(invoiceId);
    return rowNode ? rowNode.data : null;
}
