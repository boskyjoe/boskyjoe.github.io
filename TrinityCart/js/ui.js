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
import { getPaymentsForInvoice,getAllSupplierPayments } from './api.js';
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

import { PURCHASE_INVOICES_COLLECTION_PATH, INVENTORY_LEDGER_COLLECTION_PATH, SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH   } from './config.js';
import { SALES_CATALOGUES_COLLECTION_PATH, CHURCH_TEAMS_COLLECTION_PATH } from './config.js';


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
    console.log("ui.js: initializePaymentModesGrid") ;
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
    if (isSeasonsGridInitialized) return ;
    const seasonsGridDiv = document.getElementById('seasons-grid');

    if (seasonsGridDiv) { 
        console.log("[ui.js] Initializing Seasons Grid for the first time.");
        createGrid(seasonsGridDiv, seasonsGridOptions);
        isSeasonsGridInitialized = true;
    }
   
}

export async function showSeasonsView() {
    console.log("ui.js: initializeSeasonsGrid") ;
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
    if (isSalesEventsGridInitialized) return ;
    const salesEventsGridDiv = document.getElementById('sales-events-grid');

    if(salesEventsGridDiv) {
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
    console.log("ui.js: initializeUsersGrid") ;
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
            cellRenderer: p => p.value ? 'Active' : 'Inactive'
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
                    <button class="action-btn-icon action-btn-edit-team" data-id="${docId}" title="Edit Team Name">${editIcon}</button>
                    <button class="action-btn-icon action-btn-toggle-team-status" data-id="${docId}" title="${params.data.isActive ? 'Deactivate' : 'Activate'}">${statusIcon}</button>
                `;
            }
        }
    ],
    rowSelection: 'single',
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
            valueFormatter: p => (typeof p.value === 'number') ? p.value.toFixed(2) : '',
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
        { field: "purchaseDate", headerName: "Date", valueFormatter: p => p.value ? p.value.toDate().toLocaleDateString() : '' ,width: 100},
        { field: "invoiceTotal", headerName: "Total", valueFormatter: p => `$${p.value.toFixed(2)}` },
        { field: "balanceDue", headerName: "Balance", valueFormatter: p => `$${p.value.toFixed(2)}` },
        { field: "paymentStatus", headerName: "Status", width: 100, cellRenderer: p => {
            const status = p.value;
            if (status === 'Paid') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">Paid</span>`;
            if (status === 'Partially Paid') return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">Partial</span>`;
            return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">Unpaid</span>`;
        }},
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
            valueFormatter: p => p.value ? `$${p.value.toFixed(2)}` : ''
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


export function getPaymentDataFromGridById(rowId) {
    if (!purchasePaymentsGridApi) {
        console.error("Cannot get row data: Purchase Payments Grid API not available.");
        return null;
    }
    const rowNode = purchasePaymentsGridApi.getRowNode(rowId);
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

    document.getElementById('purchase-subtotal').textContent = `$${itemsSubtotal.toFixed(2)}`;

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
    
    document.getElementById('purchase-grand-total').textContent = `$${grandTotal.toFixed(2)}`;
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
            // This now correctly closes EITHER modal
            if (e.target.closest('#record-payment-modal')) {
                closePaymentModal();
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
            valueFormatter: p => p.value ? `$${p.value.toFixed(2)}` : '',
            valueParser: p => parseFloat(p.newValue.replace('$', '')) // Clean up input
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
