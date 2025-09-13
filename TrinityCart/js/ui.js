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
            cellRenderer: (params) => {
                const docId = params.data.id;
                const isActive = params.data.isActive;
                const hasActivePurchases = params.data.hasActivePurchases;

                if (isActive) {
                    // If supplier is active, show the "Deactivate" button
                    const isDisabled = hasActivePurchases;
                    const disabledClass = isDisabled ? 'opacity-50 cursor-not-allowed' : 'btn-deactivate';
                    const tooltip = isDisabled ? 'title="Cannot deactivate supplier with active purchases"' : '';
                    return `<button class="${disabledClass}" data-id="${docId}" ${tooltip} ${isDisabled ? 'disabled' : ''}>Deactivate</button>`;
                } else {
                    // If supplier is inactive, show the "Activate" button
                    return `<button class="btn-activate" data-id="${docId}">Activate</button>`;
                }
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
            cellRenderer: params => {
                const docId = params.data.id;
                const isActive = params.data.isActive;

                const deactivateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`;
                const activateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;

                // Determine which icon, class, and tooltip to use
                const icon = isActive ? deactivateIcon : activateIcon;
                const buttonClass = isActive ? 'btn-deactivate' : 'btn-activate';
                const tooltip = isActive ? 'Deactivate Category' : 'Activate Category';

                return `<button class="${buttonClass}" data-id="${docId}" title="${tooltip}">${icon}</button>`;
            },
            cellClass: 'flex items-center justify-center'
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
        console.log("[ui.js] Payment Modes Grid is now ready.");
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








///above is the admin modules 









let productsGridApi = null;
let isProductsGridInitialized = false;
let unsubscribeProductsListener = null;

const productsGridOptions = {
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
            field: "sellingPrice", 
            headerName: "Selling Price", 
            flex: 1, 
            editable: false,
            valueFormatter: p => (typeof p.value === 'number') ? p.value.toFixed(2) : '',
            cellStyle: { 'background-color': '#f3f4f6' }
        },
        { 
            field: "isReadyForSale", 
            headerName: "Ready for Sale?", 
            width: 150, 
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: [true, false] // Simple boolean options
            },
            // Custom renderer to make it look nice
            cellRenderer: p => {
                return p.value ? 
                    '<span class="text-green-600 font-semibold">Yes</span>' : 
                    '<span class="text-gray-500 font-semibold">No</span>';
            }
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

function calculateAllTotals() {
    const lineItemRows = document.querySelectorAll('#purchase-line-items-container > div');
    let itemsSubtotal = 0; // The sum of all line items AFTER their individual discounts
    let totalItemLevelTax = 0; // The sum of all tax calculated on each line item

    // --- Part 1: Calculate totals for each line item ---
    lineItemRows.forEach(row => {
        const qty = parseFloat(row.querySelector('[data-field="quantity"]').value) || 0;
        const price = parseFloat(row.querySelector('[data-field="unitPurchasePrice"]').value) || 0;
        const discountType = row.querySelector('[data-field="discountType"]').value;
        const discountValue = parseFloat(row.querySelector('[data-field="discountValue"]').value) || 0;
        const taxPercentage = parseFloat(row.querySelector('[data-field="taxPercentage"]').value) || 0;

        const grossPrice = qty * price;
        let discountAmount = 0;

        if (discountType === 'Percentage' && discountValue > 0) {
            discountAmount = grossPrice * (discountValue / 100);
        } else if (discountType === 'Amount' && discountValue > 0) {
            discountAmount = discountValue;
        }

        const netPrice = grossPrice - discountAmount; // Price after line-item discount
        const taxAmount = netPrice * (taxPercentage / 100);
        
        // This is not the final total, but the pre-tax total for this line
        row.querySelector('.line-item-net-price').value = netPrice.toFixed(2);

        // Add this line's totals to the invoice-level sums
        itemsSubtotal += netPrice;
        totalItemLevelTax += taxAmount;
    });

    // --- Part 2: Calculate overall invoice totals ---
    document.getElementById('purchase-subtotal').textContent = `$${itemsSubtotal.toFixed(2)}`;

    const invoiceDiscountType = document.getElementById('invoice-discount-type').value;
    const invoiceDiscountValue = parseFloat(document.getElementById('invoice-discount-value').value) || 0;
    let invoiceDiscountAmount = 0;

    if (invoiceDiscountType === 'Percentage' && invoiceDiscountValue > 0) {
        invoiceDiscountAmount = itemsSubtotal * (invoiceDiscountValue / 100);
    } else if (invoiceDiscountType === 'Amount' && invoiceDiscountValue > 0) {
        invoiceDiscountAmount = invoiceDiscountValue;
    }

    const taxableAmountForInvoice = itemsSubtotal - invoiceDiscountAmount;
    const invoiceTaxPercentage = parseFloat(document.getElementById('invoice-tax-percentage').value) || 0;
    const invoiceLevelTaxAmount = taxableAmountForInvoice * (invoiceTaxPercentage / 100);

    const totalTax = totalItemLevelTax + invoiceLevelTaxAmount;
    const grandTotal = taxableAmountForInvoice + totalTax;
    
    document.getElementById('purchase-grand-total').textContent = `$${grandTotal.toFixed(2)}`;
}

export function showPurchasesView() {
    showView('purchases-view');
    
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

    const purchaseInvoiceForm = document.getElementById('purchase-invoice-form');
    if (purchaseInvoiceForm) {
        purchaseInvoiceForm.addEventListener('input', (e) => {
            // Check if the changed input is one that affects totals
            if (e.target.matches('.line-item-qty, .line-item-price, .line-item-tax, .line-item-discount-type, .line-item-discount-value, #invoice-discount-type, #invoice-discount-value, #invoice-tax-percentage')) {
                calculateAllTotals();
            }
        });
    }

    // Initial calculation
    calculateAllTotals();
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
