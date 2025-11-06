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

import { PURCHASE_INVOICES_COLLECTION_PATH, INVENTORY_LEDGER_COLLECTION_PATH, SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH } from './config.js';
import { SALES_CATALOGUES_COLLECTION_PATH, CHURCH_TEAMS_COLLECTION_PATH } from './config.js';

import {
    CONSIGNMENT_ORDERS_COLLECTION_PATH, CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH, SALES_COLLECTION_PATH,SALES_PAYMENTS_LEDGER_COLLECTION_PATH,EXPENSES_COLLECTION_PATH
} from './config.js';

import { 
    calculateDirectSalesMetricsOptimized, 
    calculateConsignmentMetricsOptimized, 
    generateBusinessSummaryOptimized,
    getDailyDashboardOptimized,
    createDateRange,
    getStoreTransactionDetails,        
    generateStoreComparisonReport,     
    refreshStorePerformanceData,       
    calculateSalesTrends,
    calculateCustomerInsights,
    calculateInventoryAnalysis,generateExecutiveDashboardData,calculateTrueBusinessRevenue,calculateFinancialHealthScore,
    REPORT_CONFIGS 
} from './reports.js';

import {detachPaymentManagementRealtimeSync,buildActionRequiredList} from './payment-management.js'
import { expenseTypes } from './config.js';



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


// ===================================================================
// APPLICATION DASHBOARD CACHING SYSTEM
// ===================================================================

const DASHBOARD_CACHE_CONFIG = {
    CACHE_DURATION_MINUTES: 10,        // 10-minute cache for financial accuracy
    CACHE_KEY_PREFIX: 'app_dashboard_',
    VISUAL_INDICATORS: true
};


/**
 * ENHANCED: Get cached dashboard data with timestamp tracking
 */
function getCachedDashboardData(cacheKey) {
    try {
        const fullKey = DASHBOARD_CACHE_CONFIG.CACHE_KEY_PREFIX + cacheKey;
        const cached = localStorage.getItem(fullKey);
        
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
        
        console.log(`[Dashboard Cache] Checking cache age: ${ageMinutes.toFixed(1)} minutes old`);
        
        if (ageMinutes > DASHBOARD_CACHE_CONFIG.CACHE_DURATION_MINUTES) {
            console.log(`[Dashboard Cache] Cache expired, removing...`);
            localStorage.removeItem(fullKey);
            return null;
        }
        
        console.log(`[Dashboard Cache] Using cached data (${ageMinutes.toFixed(1)} minutes old)`);
        return { data, timestamp, ageMinutes };
        
    } catch (error) {
        console.warn(`[Dashboard Cache] Error reading cache:`, error);
        return null;
    }
}

/**
 * ENHANCED: Store dashboard data with timestamp
 */
function setCachedDashboardData(cacheKey, data) {
    try {
        const fullKey = DASHBOARD_CACHE_CONFIG.CACHE_KEY_PREFIX + cacheKey;
        const cacheObject = {
            data,
            timestamp: Date.now(),
            cacheKey: cacheKey
        };
        
        localStorage.setItem(fullKey, JSON.stringify(cacheObject));
        console.log(`[Dashboard Cache] Data cached for ${DASHBOARD_CACHE_CONFIG.CACHE_DURATION_MINUTES} minutes`);
        
    } catch (error) {
        console.warn(`[Dashboard Cache] Error storing cache:`, error);
    }
}

/**
 * ENHANCED: Clear dashboard cache (for refresh button)
 */
function clearDashboardCache() {
    try {
        const keys = Object.keys(localStorage);
        const dashboardKeys = keys.filter(key => key.startsWith(DASHBOARD_CACHE_CONFIG.CACHE_KEY_PREFIX));
        
        dashboardKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`[Dashboard Cache] Cleared cache: ${key}`);
        });
        
        console.log(`[Dashboard Cache] ✅ All dashboard cache cleared (${dashboardKeys.length} entries)`);
        
    } catch (error) {
        console.warn('[Dashboard Cache] Error clearing cache:', error);
    }
}


/**
 * Forces all select dropdowns on the page to close their option lists.
 * 
 * Solves the "stuck dropdown overlay" issue that blocks interactions.
 * This can happen when DOM changes while a select is open.
 * 
 * @since 1.0.0
 */
function forceCloseAllDropdowns() {
    // Method 1: Blur all select elements
    document.querySelectorAll('select').forEach(select => {
        if (select === document.activeElement) {
            select.blur();
        }
    });
    
    // Method 2: Click elsewhere to force close
    const body = document.body;
    const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: 1,
        clientY: 1
    });
    body.dispatchEvent(clickEvent);
    
    // Method 3: Focus a dummy element (most reliable)
    const dummy = document.createElement('input');
    dummy.style.position = 'absolute';
    dummy.style.left = '-9999px';
    dummy.style.opacity = '0';
    document.body.appendChild(dummy);
    dummy.focus();
    dummy.blur();
    document.body.removeChild(dummy);
    
    console.log('[ui.js] Forced all dropdowns to close');
}


/**
 * Debug function to identify what element is blocking clicks
 */
function debugClickBlocking(x, y) {
    const elementAtPoint = document.elementFromPoint(x, y);
    console.log('Element at click point:', elementAtPoint);
    console.log('Element computed z-index:', window.getComputedStyle(elementAtPoint).zIndex);
    console.log('Element pointer-events:', window.getComputedStyle(elementAtPoint).pointerEvents);
}


/**
 * [NEW] Displays the global loading spinner overlay.
 */
export function showLoader() {
    const loader = document.getElementById('loading-overlay');
    if (!loader) return;
    
    // Check if any modal is currently open
    const openModals = document.querySelectorAll('.modal-container.visible');
    
    if (openModals.length > 0) {
        // If modals are open, show loader INSIDE the modal instead of globally
        openModals.forEach(modal => {
            // Create or show a modal-specific loader
            let modalLoader = modal.querySelector('.modal-loader');
            if (!modalLoader) {
                modalLoader = document.createElement('div');
                modalLoader.className = 'modal-loader absolute inset-0 flex items-center justify-center bg-white bg-opacity-90';
                modalLoader.style.zIndex = '100'; // Above modal content
                modalLoader.innerHTML = '<div class="w-8 h-8 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>';
                
                const modalPanel = modal.querySelector('.modal-panel');
                if (modalPanel) {
                    modalPanel.style.position = 'relative'; // Ensure it's positioned
                    modalPanel.appendChild(modalLoader);
                }
            }
            modalLoader.classList.remove('hidden');
        });
    } else {
        // No modals open, use global loader
        loader.classList.remove('hidden');
    }
}


/**
 * [NEW] Hides the global loading spinner overlay.
 */
export function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.classList.add('hidden');
    
    // Also hide any modal-specific loaders
    const modalLoaders = document.querySelectorAll('.modal-loader');
    modalLoaders.forEach(ml => ml.classList.add('hidden'));
}

// --- UPDATE THE GLOBAL EVENT LISTENER ---
document.addEventListener('masterDataUpdated', (e) => {
    const { type } = e.detail;

    if (type === 'categories') {
        // ... (existing logic for categories) ...
    }

    if (type === 'products') {
        setTimeout(() => {
            updateInventoryLegendCounts();
        }, 200);
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
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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

                const deactivateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-red-600">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" />
                            </svg>`;
                const activateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-green-600">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" />
                                </svg>`;

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
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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
        console.log("[ui.js] Detaching team members listener in resetTeamDetailView");
        unsubscribeTeamMembersListener();
        unsubscribeTeamMembersListener = null;
    }
}


// 2. Define the AG-Grid options for the MASTER grid (All Teams)
const churchTeamsGridOptions = {
    getRowId: params => params.data.id,
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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
                const isActive = params.data.isActive;

                // Standard deactivate icon (minus in circle)
                const deactivateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" /></svg>`;
                
                // Standard activate icon (plus in circle)
                const activateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" /></svg>`;

                // Determine which icon, class, and tooltip to use
                let icon, buttonClass, tooltip;

                if (isActive) {
                    icon = deactivateIcon;
                    buttonClass = 'btn-deactivate';
                    tooltip = 'Deactivate Team';
                } else {
                    icon = activateIcon;
                    buttonClass = 'btn-activate';
                    tooltip = 'Activate Team';
                }

                return `<button 
                            class="action-btn-icon ${buttonClass} action-btn-toggle-team-status" 
                            data-id="${docId}" 
                            title="${tooltip}">
                                ${icon}
                        </button>`;
            }
        }
    ],
    rowSelection: {
        mode: 'singleRow',
        enableSelectionWithoutKeys: true,
        headerCheckbox: false
    },
    onGridReady: params => { 
        churchTeamsGridApi = params.api;
        console.log('[churchTeamsGrid] Grid ready');
    },
    onCellValueChanged: params => {
        // Handle inline editing of the team name
        document.dispatchEvent(new CustomEvent('updateChurchTeam', {
            detail: { teamId: params.data.id, updatedData: { teamName: params.newValue } }
        }));
    },
    onSelectionChanged: (event) => {
        console.log('[churchTeamsGrid] Selection changed');
        
        const selectedRows = event.api.getSelectedRows();
        console.log('[churchTeamsGrid] Selected teams:', selectedRows.length);
        
        if (selectedRows.length > 0) {
            // Team is selected
            const teamData = selectedRows[0];
            console.log('[churchTeamsGrid] ✅ Team selected:', teamData.teamName);
            
            selectedTeamId = teamData.id;
            document.getElementById('selected-team-name').textContent = teamData.teamName;
            document.getElementById('add-member-btn').disabled = false;
            
            // Clean up previous member listener before loading new team
            if (unsubscribeTeamMembersListener) {
                console.log('[churchTeamsGrid] Cleaning up previous member listener');
                unsubscribeTeamMembersListener();
                unsubscribeTeamMembersListener = null;
            }
            
            // Load members for the selected team
            loadMembersForTeam(teamData.id);
        } else {
            // No team selected (user unchecked)
            console.log('[churchTeamsGrid] ❌ No team selected - resetting detail view');
            resetTeamDetailView();
        }
    }
};

// 3. Define the AG-Grid options for the DETAIL grid (Team Members)
const teamMembersGridOptions = {
    getRowId: params => params.data.id,
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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
    //document.getElementById('selected-team-name').textContent = '...';
    //document.getElementById('add-member-btn').disabled = true;
    //if (teamMembersGridApi) teamMembersGridApi.setGridOption('rowData', []);
    //selectedTeamId = null;

    // Reset detail view ONCE when entering the view
    resetTeamDetailView();

    // Attach the real-time listener for the master grid
    // Attach the real-time listener for the master grid
    const db = firebase.firestore();
    unsubscribeChurchTeamsListener = db.collection(CHURCH_TEAMS_COLLECTION_PATH)
        .orderBy('teamName')
        .onSnapshot(snapshot => {
            const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    theme: 'legacy',
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
            filter: 'agTextColumnFilter',
            // This tells the filter to use category names instead of IDs
            
            filterValueGetter: params => {
                const category = masterData.categories.find(c => c.id === params.data.categoryId);
                return category ? category.categoryName : '';
            },
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
            editable: true, // Allow manual editing
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
                min: 0,
                precision: 0
            },
            valueParser: p => parseInt(p.newValue) || 0, 
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
            field: "sellingPrice",
            headerName: "Selling Price",
            flex: 1,
            editable: false,
            valueFormatter: p => (typeof p.value === 'number') ? formatCurrency(p.value) : '',
            valueParser: p => parseFloat(p.newValue) // Ensure the edited value is a number
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
        sortable: true, filter: true, resizable: true, wrapText: true, autoHeight: true,
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



/**
 * Shows the Add Product to Catalogue modal (different from sales add-product-modal)
 */
export function showAddProductToCatalogueModal() {
    const modal = document.getElementById('add-product-to-catalogue-modal');
    if (!modal) {
        console.error('Add product to catalogue modal not found');
        return;
    }

    // Reset the form
    const form = document.getElementById('add-product-to-catalogue-form');
    if (form) form.reset();

    // Clear calculated selling price
    const sellingPriceDisplay = document.getElementById('catalogue-sellingPrice-display');
    if (sellingPriceDisplay) sellingPriceDisplay.value = '';

    // Populate category dropdown using masterData cache
    const categorySelect = document.getElementById('catalogue-itemCategory-select');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Select a category...</option>';
        masterData.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.categoryName;
            categorySelect.appendChild(option);
        });
    }

    // Show modal with animation
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('visible');
        
        // Focus the first input for better UX
        setTimeout(() => {
            const firstInput = document.getElementById('catalogue-itemName-input');
            if (firstInput) firstInput.focus();
        }, 50);
    }, 10);

    console.log('[ui.js] Add Product to Catalogue modal opened');
}

/**
 * Closes the Add Product to Catalogue modal
 */
export function closeAddProductToCatalogueModal() {
    const modal = document.getElementById('add-product-to-catalogue-modal');
    if (!modal) return;

    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
        console.log('[ui.js] Add Product to Catalogue modal closed');
    }, 300); // Match CSS transition duration
}

// Keep existing showProductsView unchanged - just remove the form listeners
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

    

    // No longer setup form calculation listeners here - they're in the modal
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
    theme: 'legacy',
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    columnDefs: [
        { field: "invoiceId", headerName: "Invoice ID", width: 150 },
        { field: "supplierInvoiceNo", headerName: "Supplier Invoice #", width: 150 },
        { field: "supplierName", headerName: "Supplier", flex: 1, width: 150 },
        { field: "purchaseDate", headerName: "Purchase Date", valueFormatter: p => p.value ? p.value.toDate().toLocaleDateString() : '', width: 150 },
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
                const paymentIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-green-600">
                        <path d="M12 7.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
                        <path fill-rule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.625v-9.75ZM8.25 9.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM18.75 9a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008ZM4.5 9.75A.75.75 0 0 1 5.25 9h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75V9.75Z" clip-rule="evenodd" />
                        <path d="M2.25 18a.75.75 0 0 0 0 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 0 0-.75-.75H2.25Z" />
                        </svg>`;
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
    theme: 'legacy',
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    columnDefs: [
        {
            headerName: "Supplier Invoice #",
            width: 150,
            pinned: 'left',
            valueGetter: params => {
                if (!params.data || !purchaseInvoicesGridApi) {
                    return '';
                }
                const parentInvoiceDocId = params.data.relatedInvoiceId;
                const invoiceNode = purchaseInvoicesGridApi.getRowNode(parentInvoiceDocId);
                return invoiceNode ? invoiceNode.data.supplierInvoiceNo : parentInvoiceDocId;
            }
        },
        {
            headerName: "Supplier",
            width: 200,
            pinned: 'left',
            valueGetter: params => {
                if (!params.data) return '';
                const supplier = masterData.suppliers.find(s => s.id === params.data.supplierId);
                return supplier ? supplier.supplierName : 'Unknown Supplier';
            }
        },
        { 
            field: "paymentDate", 
            headerName: "Payment Date", 
            width: 120,
            valueFormatter: p => p.value.toDate().toLocaleDateString() 
        },
        {
            field: "amountPaid",
            headerName: "Amount Paid",
            width: 120,
            valueFormatter: p => p.value ? formatCurrency(p.value) : '',
            cellClass: 'text-right font-semibold'
        },
        { 
            field: "paymentMode", 
            headerName: "Mode", 
            width: 100
        },
        { 
            field: "transactionRef", 
            headerName: "Reference #", 
            width: 140
        },
        {
            field: "notes", 
            headerName: "Notes", 
            width: 200,
            cellRenderer: params => {
                const notes = params.value || '';
                
                if (!notes.trim()) {
                    return '<span class="text-gray-400 italic text-sm">No notes</span>';
                }
                
                const maxLength = 50;
                const displayText = notes.length > maxLength 
                    ? notes.substring(0, maxLength) + '...'
                    : notes;
                
                return `<span class="text-sm text-gray-700" title="${notes.replace(/"/g, '&quot;')}">${displayText}</span>`;
            },
            tooltipField: 'notes',
            cellStyle: { 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }
        },
        {
            field: "paymentStatus",
            headerName: "Status",
            width: 120,
            cellRenderer: params => {
                const status = params.value || 'Verified';
                if (status === 'Verified') {
                    return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">Verified</span>`;
                } else if (status === 'Pending Verification') {
                    return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-yellow-600 bg-yellow-200">Pending</span>`;
                } else if (status === 'Voided') {
                    return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-gray-600 bg-gray-200">Voided</span>`;
                } else if (status === 'Void_Reversal') {
                    return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-600 bg-red-200">Reversal</span>`;
                }
                return `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">${status}</span>`;
            }
        },
        {
            headerName: "Actions",
            width: 150,
            cellClass: 'flex items-center justify-center space-x-1',
            suppressSizeToFit: true,
            cellRenderer: params => {
                const paymentStatus = params.data.paymentStatus || 'Verified';
                const submittedBy = params.data.submittedBy;
                const currentUser = appState.currentUser;
                
                // ✅ CORRECTED: Check for admin OR finance roles
                const hasFinancialPermissions = currentUser && (
                    currentUser.role === 'admin' || 
                    currentUser.role === 'finance'
                );
                
                let buttons = '';
                
                // ✅ VERIFY BUTTON: Admin or Finance only, pending payments only
                if (paymentStatus === 'Pending Verification' && hasFinancialPermissions) {
                    const verifyIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4-5.5Z" clip-rule="evenodd" />
                    </svg>`;
                    
                    buttons += `<button class="action-btn-icon action-btn-verify-supplier-payment text-green-600 hover:text-green-700 hover:bg-green-100" 
                                      data-id="${params.data.id}" 
                                      title="Verify Payment (${currentUser.role === 'admin' ? 'Admin' : 'Finance'})">
                                  ${verifyIcon}
                              </button>`;
                }
                
                // ✅ VOID BUTTON: Admin or Finance only, verified payments only
                if ((paymentStatus === 'Verified' || !paymentStatus) && hasFinancialPermissions) {
                    const voidIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                        <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clip-rule="evenodd" />
                    </svg>`;
                    
                    buttons += `<button class="action-btn-icon action-btn-void-supplier-payment action-btn-delete text-red-500 hover:text-red-700 hover:bg-red-100" 
                                      data-id="${params.data.id}" 
                                      title="Void Payment (${currentUser.role === 'admin' ? 'Admin' : 'Finance'})">
                                  ${voidIcon}
                              </button>`;
                }
                
                // ✅ CANCEL BUTTON: Submitter can cancel their own pending payments
                if (paymentStatus === 'Pending Verification' && submittedBy === currentUser?.email) {
                    const cancelIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                        <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clip-rule="evenodd" />
                    </svg>`;
                    
                    buttons += `<button class="action-btn-icon action-btn-cancel-supplier-payment action-btn-delete text-red-500 hover:text-red-700 hover:bg-red-100" 
                                      data-id="${params.data.id}" 
                                      title="Cancel Your Pending Payment">
                                  ${cancelIcon}
                              </button>`;
                }

                return buttons;
            }
        }
    ],
    
    defaultColDef: { 
        resizable: true, 
        sortable: true, 
        filter: true, 
        wrapText: false,
        suppressSizeToFit: false
    },
    
    onGridReady: (params) => {
        console.log("[ui.js] Purchase Payments Grid ready with role-based permissions.");
        purchasePaymentsGridApi = params.api;
        
        setTimeout(() => {
            params.api.sizeColumnsToFit();
        }, 100);
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


/**
 * Gets payment data from the consignment payments grid
 */
export function getConsignmentPaymentDataFromGridById(paymentId) {
    if (!consignmentPaymentsGridApi) {
        console.error("Cannot get consignment payment data: Grid API not available.");
        return null;
    }
    const rowNode = consignmentPaymentsGridApi.getRowNode(paymentId);
    return rowNode ? rowNode.data : null;
}

/**
 * Gets payment data from the purchase payments grid (supplier payments)
 */
export function getSupplierPaymentDataFromGridById(paymentId) {
    if (!purchasePaymentsGridApi) {
        console.error("Cannot get supplier payment data: Purchase Payments Grid API not available.");
        return null;
    }
    const rowNode = purchasePaymentsGridApi.getRowNode(paymentId);
    return rowNode ? rowNode.data : null;
}

/**
 * Gets payment data from the sales payment history grid
 */
export function getSalesPaymentDataFromGridById(paymentId) {
    if (!salePaymentHistoryGridApi) {
        console.error("Cannot get sales payment data: Sale Payment History Grid API not available.");
        return null;
    }
    const rowNode = salePaymentHistoryGridApi.getRowNode(paymentId);
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

    console.log('[ui.js] Refreshing supplier payments grid...');
    
    // Get the currently selected rows from the invoices grid
    const selectedInvoiceNodes = purchaseInvoicesGridApi.getSelectedNodes();

    purchasePaymentsGridApi.setGridOption('loading', true);
    let paymentsToShow = [];

    try {
        if (selectedInvoiceNodes.length > 0) {
            // FILTERED MODE: Load payments for selected invoice(s)
            console.log(`[ui.js] Loading payments for ${selectedInvoiceNodes.length} selected invoice(s)`);

            const fetchPromises = selectedInvoiceNodes.map(node => getPaymentsForInvoice(node.data.id));
            const paymentGroups = await Promise.all(fetchPromises);
            paymentsToShow = paymentGroups.flat();

        } else {
            // GLOBAL MODE: Load all payments
            console.log("[ui.js] Loading all supplier payments (no specific invoice selected)");
            paymentsToShow = await getAllSupplierPayments();
        }

        // ✅ ENHANCED: Sort payments by date (newest first) and show voided entries
        paymentsToShow.sort((a, b) => {
            const dateA = a.paymentDate?.toDate ? a.paymentDate.toDate() : new Date(a.paymentDate);
            const dateB = b.paymentDate?.toDate ? b.paymentDate.toDate() : new Date(b.paymentDate);
            return dateB - dateA; // Newest first
        });

        // Update the payments grid
        purchasePaymentsGridApi.setGridOption('rowData', paymentsToShow);
        purchasePaymentsGridApi.setGridOption('loading', false);

        console.log(`[ui.js] ✅ Loaded ${paymentsToShow.length} supplier payment records`);
        
        // ✅ LOG: Show breakdown of payment statuses
        const statusBreakdown = {};
        paymentsToShow.forEach(payment => {
            const status = payment.paymentStatus || payment.status || 'Unknown';
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
        });
        
        console.log('[ui.js] Payment status breakdown:', statusBreakdown);

        // ✅ AUTO-SIZE: Adjust columns after data load
        setTimeout(() => {
            if (purchasePaymentsGridApi) {
                purchasePaymentsGridApi.sizeColumnsToFit();
            }
        }, 200);

    } catch (error) {
        console.error("Error loading payments:", error);
        purchasePaymentsGridApi.setGridOption('loading', false);
        purchasePaymentsGridApi.showNoRowsOverlay();
    }
}




let bulkAddProductsGridApi = null;


const bulkAddProductsGridOptions = {
    theme: 'alpine',
    pagination: true,
    paginationPageSize: 100, // Show more products per page
    paginationPageSizeSelector: [50, 100, 200],
    
    // ✨ KEY: Enable multi-row selection with checkboxes
    rowSelection: {
        mode: 'multiRow',
        enableSelectionWithoutKeys: true,
        headerCheckbox: true,
        checkboxes: true,
        enableClickSelection: true
    },
    
    columnDefs: [
        {
            field: "categoryId",
            headerName: "Category",
            flex: 1,
            filter: 'agTextColumnFilter',
            floatingFilter: true, // Enable floating filter
            suppressMenu: true,
            suppressHeaderFilterButton: true,
            pinned: 'left', // Keep product name visible when scrolling
            filterValueGetter: params => {
                const category = masterData.categories.find(c => c.id === params.data.categoryId);
                return category ? category.categoryName : 'Unknown';
            },
            valueFormatter: params => {
                const category = masterData.categories.find(c => c.id === params.value);
                return category ? category.categoryName : 'Unknown';
            }
        },
        {
            field: "itemName",
            headerName: "Product Name",
            flex: 2,
            filter: 'agTextColumnFilter',
            floatingFilter: true, // Enable floating filter
            suppressMenu: true, // Hide the menu icon
            suppressHeaderFilterButton: true,
            cellStyle: { fontWeight: 'bold' },
        },
        {
            field: "inventoryCount",
            headerName: "Current Stock",
            width: 120,
            cellClass: 'text-center font-bold',
            filter: 'agNumberColumnFilter',
            floatingFilter: true, // Enable floating filter
            suppressMenu: true, // Hide the menu icon
            suppressHeaderFilterButton: true,
            cellStyle: params => {
                const stock = params.value || 0;
                if (stock === 0) return { backgroundColor: '#fee2e2', color: '#dc2626' };
                if (stock < 10) return { backgroundColor: '#fef3c7', color: '#d97706' };
                return { backgroundColor: '#f0fdf4', color: '#166534' };
            }
        },
        {
            field: "unitPrice",
            headerName: "Last Purchase Price",
            width: 140,
            filter: 'agNumberColumnFilter',
            floatingFilter: true, // Enable floating filter
            suppressMenu: true,
            suppressHeaderFilterButton: true,
            valueFormatter: p => p.value ? formatCurrency(p.value) : 'Not set',
            cellStyle: params => {
                return params.value ? { fontWeight: 'bold' } : { fontStyle: 'italic', color: '#9ca3af' };
            }
        },
        {
            field: "defaultQty", // This field stores the edited value
            headerName: "Qty to Purchase",
            width: 130,
            editable: true,
            filter: false, // No filter needed for this column
            floatingFilter: false,
            // ✅ CORRECTED: Initialize with default value
            cellDataType: 'number',
            valueGetter: params => params.data.defaultQty || 1, // Get from data
            valueSetter: params => {
                // ✅ CORRECTED: Set value back to data
                params.data.defaultQty = params.newValue;
                return true; // Indicate successful set
            },
            
            cellEditor: 'agNumberCellEditor',
            cellEditorParams: {
                min: 1,
                max: 1000,
                precision: 0
            },
            cellStyle: { 
                backgroundColor: '#f0f9ff', 
                textAlign: 'center', 
                fontWeight: 'bold',
                border: '1px solid #bfdbfe'
            }
        }
    ],
    
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        floatingFilter: true, // Enable floating filters by default
        suppressHeaderMenuButton: true, // Hide menu button (3-dot icon) by default
        suppressHeaderFilterButton: true // CRITICAL: Hide the filter funnel icon
    },
    
    onGridReady: params => {
        console.log('[DEBUG] Bulk grid ready');
        bulkAddProductsGridApi = params.api;
    },
    
    onSelectionChanged: (event) => {
        updateBulkSelectionDisplay();
        console.log(`[ui.js] Selection changed: ${event.api.getSelectedRows().length} products selected`);
    },
    
    // Pre-select products that have purchase prices
    onFirstDataRendered: (params) => {
        console.log('[DEBUG] First data rendered - rows visible:', params.api.getDisplayedRowCount());
        params.api.redrawRows();
        
        // Uncomment if you want to auto-select products with prices:
        // const nodesToSelect = [];
        // params.api.forEachNode(node => {
        //     if (node.data.unitPrice && node.data.unitPrice > 0) {
        //         nodesToSelect.push(node);
        //     }
        // });
        // if (nodesToSelect.length > 0) {
        //     params.api.setNodesSelected(nodesToSelect.slice(0, 5), true);
        // }
    }
};



/**
 * Loads products data into the bulk add grid
 */
function loadBulkProductsData() {
    if (!bulkAddProductsGridApi) {
        console.warn('[ui.js] Bulk grid API not ready');
        return;
    }

    try {
        // Get active products and load into grid
        const activeProducts = masterData.products.filter(p => p.isActive);
        console.log(`[ui.js] Loading ${activeProducts.length} products:`, activeProducts.slice(0, 2));
        console.log('Active products count:', activeProducts.length);
        console.log('Products in stock:', activeProducts.filter(p => (p.inventoryCount || 0) > 0).length);
        
        bulkAddProductsGridApi.setGridOption('loading', true);
        bulkAddProductsGridApi.setGridOption('rowData', activeProducts);
        bulkAddProductsGridApi.setGridOption('loading', false);
        
        // ✅ CORRECTED: Use proper method to get row count
        setTimeout(() => {
            if (bulkAddProductsGridApi) {
                bulkAddProductsGridApi.sizeColumnsToFit();
                
                // ✅ CORRECTED: Use getDisplayedRowCount() instead of getModel().getRowCount()
                const displayedRowCount = bulkAddProductsGridApi.getDisplayedRowCount();
                console.log(`[ui.js] ✅ Grid refreshed - Displayed rows: ${displayedRowCount}`);
                
                // Alternative method to count total rows:
                let totalRows = 0;
                bulkAddProductsGridApi.forEachNode(() => totalRows++);
                console.log(`[ui.js] ✅ Total rows in grid: ${totalRows}`);
            }
        }, 200);
        
        console.log(`[ui.js] Loaded ${activeProducts.length} products into bulk grid`);
        
    } catch (error) {
        console.error('[ui.js] Error loading bulk products data:', error);
        if (bulkAddProductsGridApi) {
            bulkAddProductsGridApi.setGridOption('loading', false);
            bulkAddProductsGridApi.showNoRowsOverlay();
        }
    }
}

/**
 * Updates the total products count display
 */
function updateBulkProductsTotalCount(totalCount) {
    // Update any count displays in the modal
    const countElements = document.querySelectorAll('#bulk-add-products-modal .text-gray-600');
    countElements.forEach(element => {
        if (element.textContent.includes('products')) {
            element.innerHTML = `<span class="font-semibold" id="bulk-selection-count">0</span> selected of ${totalCount} products`;
        }
    });
}



/**
 * Shows the bulk add products modal and initializes grid
 */

export function showBulkAddProductsModal() {
    const modal = document.getElementById('bulk-add-products-modal');
    if (!modal) {
        console.error('Bulk add products modal not found');
        return;
    }

    console.log('[ui.js] Opening bulk add products modal');

    // Initialize grid if first time
    initializeBulkAddProductsGrid();
    
    // Reset selection state
    resetBulkSelectionState();

    // Show modal first
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('visible');
        
        // Wait for grid to be ready
        const waitForBulkGrid = setInterval(() => {
            if (bulkAddProductsGridApi) {
                clearInterval(waitForBulkGrid);
                
                console.log('[ui.js] Bulk grid is ready, loading data');
                
                // Load data
                const activeProducts = masterData.products.filter(p => p.isActive);
                bulkAddProductsGridApi.setGridOption('rowData', activeProducts);
                
                setTimeout(() => {
                    addInventoryLegendToGrid('bulk-add-products-grid', bulkAddProductsGridApi, {
                        title: '📦 Stock for Purchase',
                        className: 'border-green-200 bg-green-50'
                    });
                    
                    // ✅ SETUP: Auto-update for bulk grid
                    setupInventoryLegendAutoUpdate('bulk-add-products-grid', bulkAddProductsGridApi);
                    
                }, 300);

                // Verify data loaded using correct method
                setTimeout(() => {
                    const displayedRows = bulkAddProductsGridApi.getDisplayedRowCount();
                    console.log(`[ui.js] ✅ Grid shows ${displayedRows} rows`);
                }, 100);
            }
        }, 50);
        
    }, 10);
}



/**
 * Closes the bulk add products modal
 */
export function closeBulkAddProductsModal() {
    const modal = document.getElementById('bulk-add-products-modal');
    if (!modal) return;

    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
        resetBulkSelectionState();
    }, 300);
}



/**
 * Initializes the bulk add products grid (follows existing pattern)
 */
function initializeBulkAddProductsGrid() {
    const gridDiv = document.getElementById('bulk-add-products-grid');
    if (!gridDiv || bulkAddProductsGridApi) return; // Already initialized

    console.log('[ui.js] Initializing bulk add products grid');
    bulkAddProductsGridApi = createGrid(gridDiv, bulkAddProductsGridOptions);
}

/**
 * Gets selected products with quantities (CORRECTED: All grid access in ui.js)
 */
export function getBulkSelectedProducts() {
    if (!bulkAddProductsGridApi) {
        console.error('[ui.js] Bulk grid API not available');
        return [];
    }

    console.log('🔍 [DEBUG] Getting bulk selected products...');

    try {
        // Debug both methods
        const selectedRows = bulkAddProductsGridApi.getSelectedRows();
        const selectedNodes = bulkAddProductsGridApi.getSelectedNodes();
        
        console.log('🔍 [DEBUG] Selected rows count:', selectedRows.length);
        console.log('🔍 [DEBUG] Selected nodes count:', selectedNodes.length);
        console.log('🔍 [DEBUG] First selected row:', selectedRows[0]);
        console.log('🔍 [DEBUG] First selected node data:', selectedNodes[0]?.data);

        // Use the row data method (simpler)
        const selectedProducts = selectedRows.map((product, index) => {
            console.log(`🔍 [DEBUG] Product ${index + 1}:`, {
                id: product.id,
                name: product.itemName,
                defaultQty: product.defaultQty,
                unitPrice: product.unitPrice
            });
            
            return {
                masterProductId: product.id,
                productName: product.itemName,
                quantity: product.defaultQty || 1,
                unitPurchasePrice: product.unitPrice || 0,
                discountType: 'Percentage',
                discountValue: 0,
                taxPercentage: 0
            };
        });

        console.log(`🔍 [DEBUG] Final products array:`, selectedProducts);
        return selectedProducts;
        
    } catch (error) {
        console.error('❌ [DEBUG] Error in getBulkSelectedProducts:', error);
        return [];
    }
}



/**
 * Adds bulk line items to the purchase form (CORRECTED: DOM manipulation in ui.js)
 */
export function addBulkLineItems(productsArray) {
    if (!Array.isArray(productsArray) || productsArray.length === 0) {
        console.warn('[ui.js] No products to add as bulk line items');
        return;
    }

    console.log(`[ui.js] Adding ${productsArray.length} bulk line items`);

    // Hide the "no items" message if visible
    const noItemsMessage = document.getElementById('no-line-items-message');
    if (noItemsMessage) {
        noItemsMessage.style.display = 'none';
    }

    // Add each product as a line item using existing function
    productsArray.forEach((productData, index) => {
        console.log(`[ui.js] Adding bulk item ${index + 1}: ${productData.productName}`);
        
        // Use existing addLineItem function to create the row
        addLineItem();
        
        // Get the newly created row and populate it
        const lineItemsContainer = document.getElementById('purchase-line-items-container');
        const newRow = lineItemsContainer.lastElementChild;
        
        if (newRow) {
            // Populate the row with bulk data
            newRow.querySelector('[data-field="masterProductId"]').value = productData.masterProductId;
            newRow.querySelector('[data-field="quantity"]').value = productData.quantity;
            newRow.querySelector('[data-field="unitPurchasePrice"]').value = productData.unitPurchasePrice;
            newRow.querySelector('[data-field="discountType"]').value = productData.discountType;
            newRow.querySelector('[data-field="discountValue"]').value = productData.discountValue;
            newRow.querySelector('[data-field="taxPercentage"]').value = productData.taxPercentage;
            
            console.log(`[ui.js] ✅ Populated bulk line item for ${productData.productName}`);
        }
    });

    // Scroll to line items section for user feedback
    setTimeout(() => {
        const lineItemsContainer = document.getElementById('purchase-line-items-container');
        if (lineItemsContainer) {
            lineItemsContainer.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }
    }, 100);
}

/**
 * Shows or hides the no-items message based on current line items
 * Called after line items are added or removed
 */
export function updateNoItemsMessageVisibility() {
    const lineItemsContainer = document.getElementById('purchase-line-items-container');
    const noItemsMessage = document.getElementById('no-line-items-message');
    
    if (!lineItemsContainer || !noItemsMessage) {
        console.warn('[ui.js] Line items container or no-items message not found');
        return;
    }
    
    const hasLineItems = lineItemsContainer.children.length > 0;
    
    if (hasLineItems) {
        noItemsMessage.style.display = 'none';
        console.log('[ui.js] Hidden no-items message - line items present');
    } else {
        noItemsMessage.style.display = 'block';
        console.log('[ui.js] Showing no-items message - no line items');
    }
}



/**
 * Bulk selection operations (CORRECTED: All in ui.js)
 */
export function bulkSelectAllVisibleProducts() {
    if (!bulkAddProductsGridApi) return;
    
    try {
        // ✅ CORRECTED: New v33+ syntax
        bulkAddProductsGridApi.selectAll('filtered');
        console.log('[ui.js] Selected all visible products using v33+ API');
    } catch (error) {
        console.error('[ui.js] Error selecting all visible products:', error);
        
        // Fallback for older versions
        try {
            bulkAddProductsGridApi.selectAllFiltered();
            console.log('[ui.js] Selected all using fallback method');
        } catch (fallbackError) {
            console.error('[ui.js] Both selection methods failed:', fallbackError);
        }
    }
}

export function bulkClearAllSelections() {
    if (!bulkAddProductsGridApi) {
        console.error('[ui.js] Bulk grid API not available for clear selection');
        return;
    }
    
    bulkAddProductsGridApi.deselectAll();
    console.log('[ui.js] Cleared all product selections');
}


export function bulkSelectProductsWithPrices() {
    if (!bulkAddProductsGridApi) {
        console.error('[ui.js] Grid API not available');
        return;
    }

    try {
        console.log('[ui.js] 🔍 Starting selection of products with prices');
        
        // ✅ CORRECTED: Use getDisplayedRowAtIndex() method (safer)
        const rowsToSelect = [];
        
        for (let i = 0; i < bulkAddProductsGridApi.getDisplayedRowCount(); i++) {
            const rowNode = bulkAddProductsGridApi.getDisplayedRowAtIndex(i);
            
            if (rowNode && rowNode.data && rowNode.data.unitPrice && rowNode.data.unitPrice > 0) {
                rowsToSelect.push(rowNode);
                console.log(`[ui.js] 🎯 Will select: ${rowNode.data.itemName} (Price: ${rowNode.data.unitPrice})`);
            }
        }
        
        console.log(`[ui.js] Found ${rowsToSelect.length} products with prices`);
        
        if (rowsToSelect.length > 0) {
            // Clear existing selection first
            bulkAddProductsGridApi.deselectAll();
            
            // Select the rows with prices
            bulkAddProductsGridApi.setNodesSelected(rowsToSelect, true);
            
            console.log(`[ui.js] ✅ Selected ${rowsToSelect.length} products with purchase prices`);
        } else {
            console.log('[ui.js] ℹ️ No products with prices found');
        }
        
    } catch (error) {
        console.error('[ui.js] Error selecting products with prices:', error);
    }
}

/**
 * Updates the selection display and button state
 */
function updateBulkSelectionDisplay() {
    if (!bulkAddProductsGridApi) return;

    const selectedRows = bulkAddProductsGridApi.getSelectedRows();
    const count = selectedRows.length;
    
    // Update selection count
    const countElement = document.getElementById('bulk-selection-count');
    if (countElement) countElement.textContent = count;
    
    // Update selection details
    const detailsElement = document.getElementById('bulk-selection-details');
    if (detailsElement) {
        if (count === 0) {
            detailsElement.textContent = '';
        } else {
            const totalEstimatedValue = selectedRows.reduce((sum, row) => {
                const price = row.unitPrice || 0;
                const qty = 1; // Default qty, you might need to get this from the row
                return sum + (price * qty);
            }, 0);
            
            detailsElement.textContent = `(Est. value: ${formatCurrency(totalEstimatedValue)})`;
        }
    }
    
    // Enable/disable add button
    const addButton = document.getElementById('bulk-add-to-invoice-btn');
    if (addButton) {
        addButton.disabled = count === 0;
        addButton.innerHTML = count === 0 
            ? 'Add Selected to Invoice'
            : `<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>Add ${count} Product${count > 1 ? 's' : ''} to Invoice`;
    }
}

/**
 * Resets the bulk selection state
 */
function resetBulkSelectionState() {
    updateBulkSelectionDisplay();
    
    // Clear search
    const searchInput = document.getElementById('bulk-product-search');
    if (searchInput) searchInput.value = '';
    
    const categoryFilter = document.getElementById('bulk-category-filter');
    if (categoryFilter) categoryFilter.value = '';
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

    // HIDE: No-items message when adding line items
    const noItemsMessage = document.getElementById('no-line-items-message');
    if (noItemsMessage) {
        noItemsMessage.style.display = 'none';
        console.log('[ui.js] Hidden no-items message - adding line items');
    }

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

    document.getElementById('purchase-date').valueAsDate = new Date();

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

    // SHOW: No-items message for create mode
    const noItemsMessage = document.getElementById('no-line-items-message');
    if (noItemsMessage) {
        noItemsMessage.style.display = 'block';
        console.log('[ui.js] Showing no-items message for create mode');
    }

    //addLineItem();
    calculateAllTotals();
}

// NEW: Function to load invoice data into the form for editing
export async function loadInvoiceDataIntoForm(invoiceData) {
    // Switch to Edit Mode
    document.getElementById('purchase-invoice-doc-id').value = invoiceData.id;
    document.getElementById('purchase-form-title').textContent = `Editing Invoice: ${invoiceData.invoiceId}`;
    document.getElementById('purchase-form-submit-btn').textContent = 'Update Invoice';
    document.getElementById('cancel-edit-btn').style.display = 'block';

    // HIDE: No-items message during edit mode
    const noItemsMessage = document.getElementById('no-line-items-message');
    if (noItemsMessage) {
        noItemsMessage.style.display = 'none';
        console.log('[ui.js] Hidden no-items message for edit mode');
    }


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


// --- supplier RECORD PAYMENT MODAL UI ---

/**
 * [REFACTORED] Opens and populates the modal for recording a payment to a SUPPLIER.
 * @param {object} invoice - The purchase invoice data.
 */
export function showSupplierPaymentModal(invoice) {

    const allModals = document.querySelectorAll('.modal-container');

    // Force close ALL other modals first
    allModals.forEach(modal => {
        if (modal.id !== 'supplier-payment-modal') {
            modal.classList.remove('visible');
            modal.style.display = 'none';
            console.log(`Force closed modal: ${modal.id}`);
        }
    });


    const paymentModal = document.getElementById('supplier-payment-modal');
    if (!paymentModal) {
        console.error('supplier-payment-modal not found!');
        return;
    }

    const form = document.getElementById('supplier-record-payment-form');
    const title = document.getElementById('supplier-payment-modal-title');
    const invoiceIdInput = document.getElementById('supplier-payment-invoice-id');
    const supplierIdInput = document.getElementById('supplier-payment-supplier-id');
    const dateInput = document.getElementById('supplier-payment-date-input');
    const amountInput = document.getElementById('supplier-payment-amount-input');
    const currencySymbolSpan = document.getElementById('supplier-payment-amount-currency-symbol');
    const modeSelect = document.getElementById('supplier-payment-mode-select');

    // Reset form and populate data
    form.reset();
    invoiceIdInput.value = invoice.id;
    supplierIdInput.value = invoice.supplierId;
    title.textContent = `Record Payment for Supplier Invoice: ${invoice.invoiceId}`;
    dateInput.valueAsDate = new Date();
    amountInput.value = (invoice.balanceDue || 0).toFixed(2);

    // Set currency symbol
    const currencySymbol = masterData.systemSetups?.systemCurrency || '$';
    if (currencySymbolSpan) currencySymbolSpan.textContent = currencySymbol;

    // Populate payment modes
    modeSelect.innerHTML = '<option value="">Select a mode...</option>';
    masterData.paymentModes.forEach(mode => {
        if (mode.isActive) {
            const option = document.createElement('option');
            option.value = mode.paymentMode;
            option.textContent = mode.paymentMode;
            modeSelect.appendChild(option);
        }
    });

    // Show modal with animation
    paymentModal.style.display = 'flex';
    setTimeout(() => {
        paymentModal.classList.add('visible');
        
        // Focus first input for accessibility
        setTimeout(() => {
            const focusTarget = document.getElementById('supplier-payment-amount-input');
            if (focusTarget) focusTarget.focus();
        }, 50);
    }, 10);
}


/**
 * [RENAMED] Closes the supplier payment modal.
 */
export function closeSupplierPaymentModal() {
    const paymentModal = document.getElementById('supplier-payment-modal'); // correct ID
    if (!paymentModal) return;

    paymentModal.classList.remove('visible');
    setTimeout(() => {
        paymentModal.style.display = 'none';
    }, 300);
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

            console.log("Close button ; InitialzieModels:", modalToClose.id);
            // This now correctly closes EITHER modal
            if (modalToClose.id === 'add-product-to-catalogue-modal') {
                closeAddProductToCatalogueModal();
            } else if (modalToClose.id === 'supplier-payment-modal') {
                closeSupplierPaymentModal();
            } else if (modalToClose.id === 'member-modal') {
                closeMemberModal();
            } else if (modalToClose.id === 'consignment-request-modal') {
                closeConsignmentRequestModal();
            } else if (modalToClose.id === 'report-activity-modal') {
                closeReportActivityModal();
            }
            else if (modalToClose.id === 'record-sale-payment-modal') {
                closeRecordSalePaymentModal();
            } else if (modalToClose.id === 'bulk-add-products-modal') {
                closeBulkAddProductsModal();
            } else if (modalToClose.id === 'supplier-payment-modal') {
                closeSupplierPaymentModal();
            }
            // Add similar logic for other modals if needed
        }
    });

    // --- ESCAPE KEY HANDLER ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // When Escape is pressed, try to close ALL possible modals.

            // 1. Close the Payment Modal
            closeAddProductToCatalogueModal();
            closeSupplierPaymentModal();
            closePaymentModal();
            closeMemberModal();
            closeConsignmentRequestModal();
            closeReportActivityModal();
            closeRecordSalePaymentModal();
            closeBulkAddProductsModal();

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
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    context: {
        currentCatalogueItemIds: currentCatalogueItemIds // Initialize with the empty Set
    },
    columnDefs: [
        { field: "itemName", headerName: "Product Name", flex: 1, filter: 'agTextColumnFilter' },
        {
            field: "categoryId",
            headerName: "Category",
            flex: 1,
            filter: 'agTextColumnFilter', // ← Enable filtering
            // 🎯 KEY CHANGE: Make filter search category NAMES not IDs
            filterValueGetter: params => {
                const category = masterData.categories.find(c => c.id === params.data.categoryId);
                return category ? category.categoryName : 'Unknown';
            },
            valueFormatter: params => {
                const category = masterData.categories.find(c => c.id === params.value);
                return category ? category.categoryName : 'Unknown';
            }
        },
        {
            field: "inventoryCount",
            headerName: "Stock",
            width: 80,
            cellClass: 'text-center font-bold',
            cellStyle: params => {
                const stock = params.value || 0;
                if (stock === 0) return { backgroundColor: '#fee2e2', color: '#dc2626' };
                if (stock < 10) return { backgroundColor: '#fef3c7', color: '#d97706' };
                return { backgroundColor: '#f0fdf4', color: '#166534' };
            },
            valueFormatter: params => {
                const stock = params.value || 0;
                return stock === 0 ? 'OUT' : stock.toString();
            }
        },
        {
            headerName: "Add",
            width: 80,
            cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const productId = params.data.id;
                const inventoryCount = params.data.inventoryCount || 0;
                const productName = params.data.itemName || 'Unknown Product';
                const isDuplicate = params.context.currentCatalogueItemIds.has(productId);
                //const isOutOfStock = inventoryCount === 0;
                const isLowStock = inventoryCount >= 0 && inventoryCount < 10;

                // 🎯 SINGLE ICON LOGIC - Show what the user CAN do
                let icon, tooltip, buttonClass, clickable;

                if (isDuplicate) {
                    // ✅ ALREADY ADDED: Show checkmark (non-clickable)
                    icon = `<svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.06 0l4-5.5z" clip-rule="evenodd"/>
                    </svg>`;
                    
                    tooltip = `✅ ALREADY IN CATALOGUE\n"${productName}" is already added\nStock Available: ${inventoryCount} units`;
                    buttonClass = 'cursor-help';
                    clickable = false;
                    
                } else {
                    // ➕ CAN ADD: Show add icon (clickable)
                    icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 text-blue-600">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
                    </svg>`;
                    
                    if (isLowStock) {
                        tooltip = `⚠️ LOW STOCK - ADD NOW?\n"${productName}"\nOnly ${inventoryCount} units remaining\nClick to add to catalogue`;
                        buttonClass = 'hover:bg-yellow-100 hover:text-yellow-700';
                    } else {
                        tooltip = `✅ ADD TO CATALOGUE\n"${productName}"\n${inventoryCount} units in stock\nClick to add to catalogue`;
                        buttonClass = 'hover:bg-blue-100 hover:text-blue-700';
                    }
                    clickable = true;
                }

                // Build the final button
                const dataAttribute = clickable ? `data-id="${productId}"` : '';
                const disabledAttribute = clickable ? '' : 'disabled';

                return `<button 
                            class="action-btn-icon action-btn-add-item p-2 rounded-full transition-colors ${buttonClass}" 
                            title="${tooltip}"
                            ${dataAttribute}
                            ${disabledAttribute}>
                                ${icon}
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
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
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
    theme: 'legacy',
    getRowId: params => params.data.id,
    columnDefs: [
        { field: "catalogueName", headerName: "Catalogue Name", flex: 1 },
        { field: "seasonName", headerName: "Season", flex: 1 },
        { 
            field: "isActive", 
            headerName: "Status", 
            width: 120, 
            cellRenderer: p => p.value ? 
                '<span class="text-green-600 font-semibold">Active</span>' : 
                '<span class="text-red-600 font-semibold">Inactive</span>'
        },
        {
            headerName: "Actions", 
            width: 150, // ✅ INCREASED width to accommodate two buttons
            cellClass: 'flex items-center justify-center space-x-2', // ✅ ADD space between buttons
            cellRenderer: params => {
                const docId = params.data.id;
                const isActive = params.data.isActive;
                
                // Edit icon (existing)
                const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                    <path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343z" />
                </svg>`;
                
                // ✅ NEW: Activate/Deactivate icons
                const deactivateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-red-600">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-6-8a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clip-rule="evenodd" />
                </svg>`;
                
                const activateIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5 text-green-600">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clip-rule="evenodd" />
                </svg>`;

                // ✅ ENHANCED: Determine status button attributes
                let statusIcon, statusButtonClass, statusTooltip;

                if (isActive) {
                    statusIcon = deactivateIcon;
                    statusButtonClass = 'btn-deactivate-catalogue';
                    statusTooltip = 'Deactivate Catalogue';
                } else {
                    statusIcon = activateIcon;
                    statusButtonClass = 'btn-activate-catalogue';
                    statusTooltip = 'Activate Catalogue';
                }

                // ✅ RETURN: Both edit and status buttons
                return `
                    <button class="action-btn-icon action-btn-edit-catalogue" 
                            data-id="${docId}" 
                            title="Edit Catalogue">
                        ${editIcon}
                    </button>
                    <button class="action-btn-icon ${statusButtonClass}" 
                            data-id="${docId}" 
                            title="${statusTooltip}">
                        ${statusIcon}
                    </button>
                `;
            }
        }
    ],
    
    // ✅ ENHANCED: Add row styling for inactive catalogues
    rowClassRules: {
        'opacity-50': params => !params.data.isActive, // Dim inactive catalogues
    },
    
    onGridReady: params => { 
        existingCataloguesGridApi = params.api;
        console.log('[ui.js] Existing catalogues grid ready with activate/deactivate functionality');
    }
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

            // ✅ ADD LEGEND: Using generic function
            setTimeout(() => {
                addInventoryLegendToGrid('available-products-grid', availableProductsGridApi);
                
                // ✅ SETUP: Auto-update for this grid
                setupInventoryLegendAutoUpdate('available-products-grid', availableProductsGridApi);
                
            }, 500);

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


/**
 * Generic function to add inventory status legend to any product grid.
 * 
 * Creates a professional card-style legend explaining inventory color coding
 * and shows live counts of products in each stock category. Updates automatically
 * when grid data or filters change.
 * 
 * @param {string} gridId - The ID of the grid element (e.g., 'available-products-grid')
 * @param {object} gridApi - The AG-Grid API object for the grid
 * @param {object} [options={}] - Customization options
 * @param {string} [options.position='above'] - Position: 'above' or 'below' grid
 * @param {string} [options.title='📦 Stock Status'] - Legend title
 * @param {boolean} [options.showCounts=true] - Whether to show live counts
 * @param {string} [options.className=''] - Additional CSS classes
 * 
 * @returns {boolean} Success status
 * 
 * @example
 * // Add legend to available products grid
 * addInventoryLegendToGrid('available-products-grid', availableProductsGridApi);
 * 
 * // Add legend to bulk add products grid
 * addInventoryLegendToGrid('bulk-add-products-grid', bulkAddProductsGridApi, {
 *   title: '📦 Product Inventory Status',
 *   position: 'below'
 * });
 * 
 * @since 1.0.0
 */
export function addInventoryLegendToGrid(gridId, gridApi, options = {}) {
    const {
        position = 'above',
        title = '📦 Stock Status',
        showCounts = true,
        className = ''
    } = options;
    
    console.log(`[ui.js] Adding inventory legend to grid: ${gridId}`);
    
    // Find grid elements
    const gridElement = document.getElementById(gridId);
    if (!gridElement) {
        console.error(`[ui.js] Grid element not found: ${gridId}`);
        return false;
    }
    
    const gridContainer = gridElement.parentElement;
    if (!gridContainer) {
        console.error(`[ui.js] Grid container not found for: ${gridId}`);
        return false;
    }
    
    // Create unique legend ID for this grid
    const legendId = `inventory-legend-${gridId}`;
    
    // Remove existing legend
    const existingLegend = document.getElementById(legendId);
    if (existingLegend) {
        existingLegend.remove();
        console.log(`[ui.js] Removed existing legend for grid: ${gridId}`);
    }

    // ✅ GENERIC: Create legend with customizable options
    const legendContainer = document.createElement('div');
    legendContainer.id = legendId;
    legendContainer.className = `inventory-legend ${className} bg-gray-50 border border-gray-200 rounded-lg p-3 ${position === 'above' ? 'mb-3' : 'mt-3'}`;
    
    const countsSection = showCounts ? `
        <div class="flex items-center space-x-3 text-xs">
            <span class="text-green-600 font-medium"><span id="good-stock-count-${gridId}">0</span> good</span>
            <span class="text-yellow-600 font-medium"><span id="low-stock-count-${gridId}">0</span> low</span>  
            <span class="text-red-600 font-medium"><span id="out-stock-count-${gridId}">0</span> out</span>
        </div>
    ` : '';
    
    legendContainer.innerHTML = `
        <div class="space-y-2">
            <!-- Title Row -->
            <div class="flex items-center justify-between">
                <h6 class="text-xs font-medium text-gray-600 uppercase tracking-wide">${title}</h6>
                ${showCounts ? `<div class="text-xs text-gray-500 italic" id="total-products-shown-${gridId}">0 products</div>` : ''}
            </div>
            
            <!-- Legend Items Row -->
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-1.5">
                        <div class="w-3 h-3 bg-green-500 rounded-sm"></div>
                        <span class="text-xs text-gray-600 italic">Good (10+)</span>
                    </div>
                    <div class="flex items-center space-x-1.5">
                        <div class="w-3 h-3 bg-yellow-500 rounded-sm"></div>
                        <span class="text-xs text-gray-600 italic">Low (1-9)</span>
                    </div>
                    <div class="flex items-center space-x-1.5">
                        <div class="w-3 h-3 bg-red-500 rounded-sm"></div>
                        <span class="text-xs text-gray-600 italic">Out of Stock</span>
                    </div>
                </div>
                ${countsSection}
            </div>
        </div>
    `;

    // ✅ GENERIC: Insert based on position preference
    try {
        if (position === 'above') {
            gridContainer.insertBefore(legendContainer, gridElement);
        } else {
            gridContainer.appendChild(legendContainer);
        }
        
        console.log(`[ui.js] ✅ Legend added ${position} grid: ${gridId}`);
        
        // ✅ UPDATE: Counts for this specific grid
        if (showCounts) {
            setTimeout(() => {
                updateInventoryLegendCountsForGrid(gridId, gridApi);
            }, 300);
        }
        
        return true;
        
    } catch (insertError) {
        console.error(`[ui.js] Error inserting legend for ${gridId}:`, insertError);
        return false;
    }
}

/**
 * ✅ GENERIC: Update inventory legend counts for specific grid
 * 
 * @param {string} gridId - The grid ID to update counts for
 * @param {object} gridApi - The AG-Grid API object
 */
export function updateInventoryLegendCountsForGrid(gridId, gridApi) {
    if (!gridApi) {
        console.log(`[ui.js] Grid API not ready for counts update: ${gridId}`);
        return;
    }

    let goodStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let totalShown = 0;

    try {
        // ✅ SAFE: Count with error handling
        gridApi.forEachNode(node => {
            if (node && node.data && typeof node.data.inventoryCount !== 'undefined') {
                const stock = node.data.inventoryCount || 0;
                totalShown++;
                
                if (stock === 0) {
                    outOfStock++;
                } else if (stock < 10) {
                    lowStock++;
                } else {
                    goodStock++;
                }
            }
        });

        // ✅ GENERIC: Update counts with grid-specific IDs
        const elements = {
            total: document.getElementById(`total-products-shown-${gridId}`),
            good: document.getElementById(`good-stock-count-${gridId}`),
            low: document.getElementById(`low-stock-count-${gridId}`),
            out: document.getElementById(`out-stock-count-${gridId}`)
        };

        if (elements.total) {
            elements.total.textContent = `${totalShown} product${totalShown !== 1 ? 's' : ''} shown`;
        }
        if (elements.good) elements.good.textContent = goodStock;
        if (elements.low) elements.low.textContent = lowStock;
        if (elements.out) elements.out.textContent = outOfStock;
        
        console.log(`[ui.js] ✅ ${gridId} legend updated: ${goodStock} good, ${lowStock} low, ${outOfStock} out of ${totalShown}`);
        
    } catch (countError) {
        console.error(`[ui.js] Error updating counts for ${gridId}:`, countError);
    }
}

/**
 * ✅ GENERIC: Setup legend auto-update for any grid
 * 
 * @param {string} gridId - Grid ID to setup auto-update for
 * @param {object} gridApi - Grid API object
 */
export function setupInventoryLegendAutoUpdate(gridId, gridApi) {
    if (!gridApi) return;
    
    console.log(`[ui.js] Setting up auto-update for legend: ${gridId}`);
    
    // Update legend when filters change
    const updateLegendForThisGrid = () => {
        setTimeout(() => {
            updateInventoryLegendCountsForGrid(gridId, gridApi);
        }, 150);
    };
    
    try {
        // Listen for grid events that affect displayed data
        gridApi.addEventListener('filterChanged', updateLegendForThisGrid);
        gridApi.addEventListener('sortChanged', updateLegendForThisGrid);
        gridApi.addEventListener('modelUpdated', updateLegendForThisGrid);
        
        console.log(`[ui.js] ✅ Auto-update listeners added for ${gridId} legend`);
        
    } catch (listenerError) {
        console.warn(`[ui.js] Could not add legend auto-update listeners for ${gridId}:`, listenerError);
    }
}



//✅ LEGACY: Keep existing function for backward compatibility
function addInventoryLegendToAvailableProducts() {
    return addInventoryLegendToGrid('available-products-grid', availableProductsGridApi);
}

function updateInventoryLegendCounts() {
    return updateInventoryLegendCountsForGrid('available-products-grid', availableProductsGridApi);
}

// =======================================================
// --- CONSIGNMENT MANAGEMENT UI ---
// =======================================================


/**
 * Gets the balance due for the currently selected consignment order
 * @returns {number} Balance due amount or 0 if not found
 */
export function getSelectedConsignmentOrderBalance() {
    if (!consignmentOrdersGridApi || !appState.selectedConsignmentId) {
        console.error('[ui.js] Cannot get order balance - grid API or selected ID not available');
        return 0;
    }

    try {
        const orderNode = consignmentOrdersGridApi.getRowNode(appState.selectedConsignmentId);
        const orderData = orderNode?.data;
        
        if (!orderData) {
            console.error('[ui.js] Could not find order data for selected consignment');
            return 0;
        }

        console.log(`[ui.js] Retrieved balance for order ${orderData.consignmentId}: ${formatCurrency(orderData.balanceDue || 0)}`);
        return orderData.balanceDue || 0;
        
    } catch (error) {
        console.error('[ui.js] Error getting consignment order balance:', error);
        return 0;
    }
}

/**
 * Gets complete data for the currently selected consignment order
 * @returns {object|null} Order data object or null if not found
 */
export function getSelectedConsignmentOrderData() {
    if (!consignmentOrdersGridApi || !appState.selectedConsignmentId) {
        console.error('[ui.js] Cannot get order data - grid API or selected ID not available');
        return null;
    }

    try {
        const orderNode = consignmentOrdersGridApi.getRowNode(appState.selectedConsignmentId);
        const orderData = orderNode?.data;
        
        if (!orderData) {
            console.error('[ui.js] Could not find order data for selected consignment');
            return null;
        }

        console.log(`[ui.js] Retrieved order data for ${orderData.consignmentId}:`, {
            teamName: orderData.teamName,
            balanceDue: formatCurrency(orderData.balanceDue || 0),
            status: orderData.status
        });
        
        return orderData;
        
    } catch (error) {
        console.error('[ui.js] Error getting consignment order data:', error);
        return null;
    }
}

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
    theme: 'legacy',
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
    rowSelection: { 
        mode: 'singleRow',
        enableSelectionWithoutKeys: true, // Allow click-to-select
        headerCheckbox: false // No header checkbox for single row mode
    },
    onGridReady: params => { 
        consignmentOrdersGridApi = params.api;
        console.log('[consignmentGrid] Grid ready, selection mode:', params.api.getGridOption('rowSelection'));
    },
    onRowSelected: event => {
        console.log('[consignmentGrid] onRowSelected fired');
        console.log('[consignmentGrid] Event details:', event);
        console.log('[consignmentGrid] Node:', event.node);
        console.log('[consignmentGrid] Is selected:', event.node?.isSelected());
        console.log('[consignmentGrid] Node data:', event.node?.data);
        const selectedNode = event.node;
        
        // IMPROVED LOGIC: Only handle selection events, ignore deselection
        if (selectedNode && selectedNode.isSelected()) {
            console.log('[consignmentGrid] ✅ Order SELECTED:', selectedNode.data.consignmentId);
            
            // Set the selected consignment ID
            appState.selectedConsignmentId = selectedNode.data.id;
            
            // Clean up any existing detail listeners before loading new order
            console.log('[consignmentOrdersGrid] Cleaning up previous detail listeners');
            unsubscribeConsignmentDetailsListeners.forEach(unsub => unsub());
            unsubscribeConsignmentDetailsListeners = [];
            
            // Render the details for the newly selected order
            renderConsignmentDetail(selectedNode.data);
        } else {
            console.log('[consignmentGrid] ❌ Order DESELECTED or invalid node');
            appState.selectedConsignmentId = null;
            hideConsignmentDetailPanel();
        }
        // REMOVED: The else clause that called hideConsignmentDetailPanel()
        // This was causing interference when switching between orders
    },
    // ADD: Listen to selection changes as alternative
    onSelectionChanged: (event) => {
        console.log('[consignmentGrid] onSelectionChanged fired');
        const selectedRows = event.api.getSelectedRows();
        console.log('[consignmentGrid] Selected rows count:', selectedRows.length);
        console.log('[consignmentGrid] Selected rows:', selectedRows);
        
        if (selectedRows.length === 0) {
            console.log('[consignmentGrid] No rows selected - hiding details');
            hideConsignmentDetailPanel();
        }
    }
};

// DETAIL GRID 1: Fulfillment (for Pending orders)
const fulfillmentItemsGridOptions = {
    getRowId: params => params.data.id,
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 100, // You can adjust this default value if you like
    paginationPageSizeSelector: [25, 50, 100],
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
    theme: 'legacy',
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
 * Manually refreshes the consignment payments grid for the selected order
 */
export async function refreshConsignmentPaymentsGrid() {
    if (!consignmentPaymentsGridApi || !appState.selectedConsignmentId) {
        console.error('[ui.js] Cannot refresh - grid API or selected order not available');
        return;
    }

    try {
        console.log(`[ui.js] Manually refreshing payment history for order: ${appState.selectedConsignmentId}`);
        
        consignmentPaymentsGridApi.setGridOption('loading', true);

        const db = firebase.firestore();
        const paymentsQuery = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('orderId', '==', appState.selectedConsignmentId)
            .orderBy('paymentDate', 'desc');
        
        const snapshot = await paymentsQuery.get();
        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        consignmentPaymentsGridApi.setGridOption('rowData', payments);
        consignmentPaymentsGridApi.setGridOption('loading', false);
        
        console.log(`[ui.js] ✅ Payment history manually refreshed: ${payments.length} payments`);
        
    } catch (error) {
        console.error('[ui.js] Error manually refreshing payment history:', error);
        if (consignmentPaymentsGridApi) {
            consignmentPaymentsGridApi.setGridOption('loading', false);
        }
    }
}


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
            .where('orderId', '==', orderData.id) // Make sure this matches your payment records
            .orderBy('paymentDate', 'desc')
            .onSnapshot(snapshot => {
                console.log(`[ui.js] Payment history update for order ${orderData.id}: ${snapshot.size} payments`);
                
                const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Debug each payment
                payments.forEach((payment, index) => {
                    console.log(`[ui.js] Payment ${index + 1}:`, {
                        id: payment.id,
                        teamName: payment.teamName,
                        amount: formatCurrency(payment.amountPaid || 0),
                        status: payment.paymentStatus,
                        date: payment.paymentDate?.toDate?.()?.toLocaleDateString()
                    });
                });
                
                if (consignmentPaymentsGridApi) {
                    consignmentPaymentsGridApi.setGridOption('rowData', payments);
                    console.log(`[ui.js] ✅ Payment history grid updated with ${payments.length} records`);
                } else {
                    console.error('[ui.js] ❌ consignmentPaymentsGridApi not available for payment update');
                }
                
            }, error => {
                console.error("[Firestore] Error listening to payments:", error);
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
    theme: 'legacy',
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
    theme: 'legacy',
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
    theme: 'legacy',
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
            headerName: "Amount Paid", 
            width: 120, 
            valueFormatter: p => formatCurrency(p.value)
        },
        { 
            field: "donationAmount", 
            headerName: "Donation", 
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
                if (!data || !appState.currentUser) return '';

                const currentUser = appState.currentUser;
                const userRole = currentUser.role;

                // Check if user has admin or finance permissions
                const hasAdminAccess = ['admin', 'finance'].includes(userRole);

                // Define the icons
                const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="m2.695 14.763-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.5a2.121 2.121 0 0 0-3-3L3.58 13.42a4 4 0 0 0-.885 1.343Z" /></svg>`;
                const cancelIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
                const verifyIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4-5.5Z" clip-rule="evenodd" /></svg>`;

                let buttons = '';
                // Show Edit/Cancel for pending payments, if the user is the one who submitted it
                if (data.paymentStatus === 'Pending Verification' && data.submittedBy === appState.currentUser.email) {
                    buttons += `<button class="action-btn-icon action-btn-edit-payment" data-id="${data.id}" title="Edit Payment Record">${editIcon}</button>`;
                }

               // ADMIN/FINANCE PERMISSIONS for Pending Payments
                if (data.paymentStatus === 'Pending Verification' && hasAdminAccess) {
                    // Admin/Finance can verify payments
                    buttons += `<button class="action-btn-icon action-btn-verify-payment" data-id="${data.id}" title="Verify Payment">${verifyIcon}</button>`;
                    
                    // Admin/Finance can also cancel any pending payment (not just their own)
                    buttons += `<button class="action-btn-icon action-btn-delete action-btn-cancel-payment text-red-500 hover:text-red-700 hover:bg-red-100" data-id="${data.id}" title="Cancel Payment Record">${cancelIcon}</button>`;
                }

                // ADMIN/FINANCE PERMISSIONS for Verified Payments (Future enhancement)
                if (data.paymentStatus === 'Verified' && hasAdminAccess) {
                    // Future: Add ability to void verified payments
                    // const voidIcon = `<svg>...</svg>`;
                    // buttons += `<button class="action-btn-icon action-btn-void-payment" data-id="${data.id}" title="Void Payment">${voidIcon}</button>`;
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
    //document.getElementById('payment-amount-currency-symbol').textContent = currencySymbol;
    document.getElementById('consignment-payment-amount-currency-symbol').textContent = currencySymbol;

    

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

    document.getElementById('consignment-payment-amount-currency-symbol').textContent = currencySymbol;
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
    theme: 'legacy',
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

/**
 * Grid configuration for the Add Product modal with quantity selection.
 * 
 * Allows users to select products and specify quantities before adding to cart.
 * Includes stock validation to prevent over-ordering and immediate visual feedback.
 * 
 * @since 1.0.0
 */



const addProductModalGridOptions = {
    getRowId: params => params.data.id,
    theme: 'legacy',
    columnDefs: [
        { field: "itemName", 
            headerName: "Product Name", 
            flex: 1, 
            filter: 'agTextColumnFilter', 
            floatingFilter: true, // Enable floating filter
            suppressMenu: true,
            suppressHeaderFilterButton: true
        },
        { field: "inventoryCount", headerName: "Stock", width: 100,filter:false,floatingFilter: true, // Enable floating filter
            suppressMenu: true },
        {
            headerName: "Add",
            width: 80,
            cellClass: 'flex items-center justify-center',
            floatingFilter: true,
            suppressMenu: true,
            filter:false,
            cellRenderer: params => {
                const addIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" /></svg>`;
                return `<button class="action-btn-icon action-btn-add-to-cart" data-id="${params.data.id}" title="Add to Cart">${addIcon}</button>`;
            }
        }
    ],
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        floatingFilter: true,
        suppressMenu: true // Add to defaultColDef too
    },
    onGridReady: params => { addProductModalGridApi = params.api; }
};

// Grid for the "Sales History"
const salesHistoryGridOptions = {
    getRowId: params => params.data.id,
    theme: 'legacy',
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
            width: 120,
            cellClass: 'flex items-center justify-center',
            cellRenderer: params => {
                const paymentIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-green-600">
                        <path d="M12 7.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
                        <path fill-rule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.625v-9.75ZM8.25 9.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM18.75 9a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008ZM4.5 9.75A.75.75 0 0 1 5.25 9h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H5.25a.75.75 0 0 1-.75-.75V9.75Z" clip-rule="evenodd" />
                        <path d="M2.25 18a.75.75 0 0 0 0 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 0 0-.75-.75H2.25Z" />
                        </svg>`;
                const pdfIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v4.59L7.3 8.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V5z" clip-rule="evenodd" /></svg>`;


                return `<button class="action-btn-icon hover:text-green-700 hover:bg-green-50 action-btn-manage-payments" data-id="${params.data.id}" title="View Details & Manage Payments">${paymentIcon}</button>
                <button class="action-btn-icon hover:text-red-700 hover:bg-red-50 action-btn-generate-invoice" data-id="${params.data.id}" title="Download PDF Invoice">${pdfIcon}</button>
                `;
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
    //document.getElementById('sale-tax').textContent = `$${finalTotalTax.toFixed(2)}`;
    document.getElementById('sale-tax').textContent = formatCurrency(finalTotalTax);
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

/**
 * ENHANCED: Shows add product modal with catalogue-specific products and inventory legend.
 * 
 * Validates sales catalogue selection, loads products from the selected catalogue
 * with proper pricing, and displays inventory status legend for user guidance.
 * 
 * @since 1.0.0 Enhanced with catalogue validation and inventory legend
 */
export function showAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (!modal) return;

    console.log('[ui.js] Opening add product modal with catalogue validation');

    // ✅ ENHANCED: Check if sales catalogue is selected
    const selectedCatalogueId = document.getElementById('sale-catalogue-select')?.value;
    
    if (!selectedCatalogueId) {
        showModal('error', 'No Sales Catalogue Selected', 
            'Please select a sales catalogue first before adding products.\n\n' +
            'The sales catalogue determines which products are available and their current selling prices.'
        );
        return;
    }

    // Get catalogue information for context
    const selectedCatalogue = masterData.salesCatalogues.find(cat => cat.id === selectedCatalogueId);
    const catalogueName = selectedCatalogue ? selectedCatalogue.catalogueName : 'Selected Catalogue';

    console.log(`[ui.js] Loading products from catalogue: ${catalogueName}`);

    const modalTitle = modal.querySelector('h3');
    if (modalTitle) {
        modalTitle.textContent = `Add Product from ${catalogueName}`;
        console.log(`[ui.js] Updated modal title for catalogue: ${catalogueName}`);
    }

    // Show modal first
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('visible');
        
        // ✅ ENHANCED: Load catalogue-specific products and add legend
        setTimeout(() => {
            loadProductsForSelectedCatalogue(selectedCatalogueId);
            
            // ✅ ADD: Inventory legend after products are loaded
            setTimeout(() => {
                const legendAdded = addInventoryLegendToGrid('add-product-modal-grid', addProductModalGridApi, {
                    title: `🛒 ${catalogueName} Stock`,
                    position: 'above',
                    showCounts: true,
                    className: 'border-blue-200 bg-blue-50' // Blue theme for sales modal
                });
                
                if (legendAdded) {
                    console.log('[ui.js] ✅ Inventory legend added to sales add product modal');
                    
                    // ✅ SETUP: Auto-update legend when modal grid changes
                    setupInventoryLegendAutoUpdate('add-product-modal-grid', addProductModalGridApi);
                } else {
                    console.warn('[ui.js] Could not add legend to add product modal');
                }
                
            }, 400); // Wait for catalogue products to load
            
        }, 200); // Wait for modal to be fully visible
        
    }, 10);
}


/**
 * ENHANCED: Load products from specific ACTIVE sales catalogue with legend update
 */
async function loadProductsForSelectedCatalogue(catalogueId) {
    if (!addProductModalGridApi) {
        console.error('[ui.js] Add product modal grid not ready');
        return;
    }

    try {
        console.log(`[ui.js] Loading catalogue products: ${catalogueId}`);
        
        addProductModalGridApi.setGridOption('loading', true);

        // Validate catalogue is active
        const selectedCatalogue = masterData.salesCatalogues.find(cat => cat.id === catalogueId);
        
        if (!selectedCatalogue || !selectedCatalogue.isActive) {
            addProductModalGridApi.setGridOption('loading', false);
            addProductModalGridApi.showNoRowsOverlay();
            await showModal('error', 'Catalogue Not Available', 
                'The selected sales catalogue is not currently active or was not found.'
            );
            return;
        }

        // Get catalogue items
        const db = firebase.firestore();
        const catalogueItemsQuery = db.collection(SALES_CATALOGUES_COLLECTION_PATH)
            .doc(catalogueId)
            .collection('items');
        
        const catalogueItemsSnapshot = await catalogueItemsQuery.get();
        const catalogueItems = catalogueItemsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
        }));

        console.log(`[ui.js] Found ${catalogueItems.length} items in catalogue "${selectedCatalogue.catalogueName}"`);

        // Process catalogue items with master product data
        const availableProductsWithPrices = catalogueItems.map(catalogueItem => {
            const masterProduct = masterData.products.find(p => p.id === catalogueItem.productId);
            
            if (!masterProduct || !masterProduct.isActive) {
                return null; // Skip inactive or missing products
            }
            
            return {
                id: catalogueItem.productId,
                itemName: catalogueItem.productName || masterProduct.itemName,
                categoryId: masterProduct.categoryId || 'unknown',
                inventoryCount: masterProduct.inventoryCount || 0, // ✅ CRITICAL: For legend counts
                
                // Catalogue pricing
                sellingPrice: catalogueItem.sellingPrice,
                unitPrice: catalogueItem.sellingPrice,
                
                // Context
                catalogueId: catalogueId,
                catalogueName: selectedCatalogue.catalogueName,
                catalogueItemId: catalogueItem.id,
                isInCatalogue: true,
                priceSource: `Catalogue: ${selectedCatalogue.catalogueName}`
            };
        })
        .filter(product => product !== null && product.inventoryCount >= 0); // Include all stock levels

        // Load into grid
        addProductModalGridApi.setGridOption('rowData', availableProductsWithPrices);
        addProductModalGridApi.setGridOption('loading', false);

        console.log(`[ui.js] ✅ Loaded ${availableProductsWithPrices.length} catalogue products`);

        // ✅ UPDATE: Legend counts after data is loaded
        setTimeout(() => {
            updateInventoryLegendCountsForGrid('add-product-modal-grid', addProductModalGridApi);
        }, 200);

    } catch (error) {
        console.error('[ui.js] Error loading catalogue products:', error);
        if (addProductModalGridApi) {
            addProductModalGridApi.setGridOption('loading', false);
            addProductModalGridApi.showNoRowsOverlay();
        }
        
        await showModal('error', 'Catalogue Loading Failed', 
            'Could not load products from the selected catalogue. Please try again.'
        );
    }
}

/**
 * ✅ ENHANCED: Populate sales catalogue dropdown with ACTIVE catalogues only
 */
export function populateSalesCatalogueDropdown() {
    const catalogueSelect = document.getElementById('sale-catalogue-select');
    if (!catalogueSelect) return;

    catalogueSelect.innerHTML = '<option value="">Select a Catalogue...</option>';
    
    // ✅ CRITICAL: Only show ACTIVE sales catalogues
    const activeCatalogues = masterData.salesCatalogues.filter(cat => cat.isActive);
    
    if (activeCatalogues.length === 0) {
        catalogueSelect.innerHTML = '<option value="">No active catalogues available</option>';
        catalogueSelect.disabled = true;
        console.warn('[ui.js] No active sales catalogues found');
        return;
    }
    
    activeCatalogues.forEach(catalogue => {
        const option = document.createElement('option');
        option.value = catalogue.id;
        option.textContent = `${catalogue.catalogueName} (${catalogue.seasonName})`;
        catalogueSelect.appendChild(option);
    });

    catalogueSelect.disabled = false;
    console.log(`[ui.js] ✅ Populated ${activeCatalogues.length} ACTIVE sales catalogues for sales form`);
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
        const form = document.getElementById('new-sale-form');
        if (form) {
            form.reset();
        }

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

         // ✅ ENHANCED: Populate sales catalogue dropdown
        populateSalesCatalogueDropdown();

        // ✅ ADD: Sales catalogue change listener
        const catalogueSelect = document.getElementById('sale-catalogue-select');
        if (catalogueSelect) {
            catalogueSelect.addEventListener('change', (e) => {
                console.log(`[ui.js] Sales catalogue changed to: ${e.target.value}`);
                // Could refresh available products or show catalogue info
            });
        }

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
    theme: 'legacy',
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

    console.log('[ui.js] Opening manage payments modal for invoice:', invoiceData.saleId);

    // ✅ ENHANCED: Clear existing grids and reset APIs
    const existingGrids = modal.querySelectorAll('.ag-root-wrapper');
    if (existingGrids.length > 0) {
        console.log(`[ui.js] Removing ${existingGrids.length} existing grid instances`);
        existingGrids.forEach(grid => grid.remove());
    }

    // ✅ RESET: Clear grid API references to force reinitialization
    salePaymentItemsGridApi = null;
    salePaymentHistoryGridApi = null;

    const form = document.getElementById('record-sale-payment-form');
    if (form) form.reset();

    // Populate modal data
    document.getElementById('record-sale-invoice-id').value = invoiceData.id;
    document.getElementById('sale-payment-modal-title').textContent = `Manage Payments for Invoice #${invoiceData.saleId}`;
    document.getElementById('payment-modal-customer').textContent = invoiceData.customerInfo.name;
    document.getElementById('payment-modal-date').textContent = invoiceData.saleDate.toDate().toLocaleDateString();
    document.getElementById('payment-modal-store').textContent = invoiceData.store;

    // Populate financial summary
    document.getElementById('payment-modal-total').textContent = formatCurrency(invoiceData.financials.totalAmount);
    document.getElementById('payment-modal-paid').textContent = formatCurrency(invoiceData.totalAmountPaid || 0);
    document.getElementById('payment-modal-balance').textContent = formatCurrency(invoiceData.balanceDue || 0);
    
    // Default payment amount
    document.getElementById('record-sale-amount').value = (invoiceData.balanceDue || 0).toFixed(2);

    // Populate Payment Mode dropdown
    const paymentModeSelect = document.getElementById('record-sale-mode');
    paymentModeSelect.innerHTML = '<option value="">Select mode...</option>';
    masterData.paymentModes.forEach(mode => {
        if (mode.isActive) {
            const option = document.createElement('option');
            option.value = mode.paymentMode;
            option.textContent = mode.paymentMode;
            paymentModeSelect.appendChild(option);
        }
    });

    // Show modal first, then initialize grids
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('visible');
        
        // ✅ CORRECTED: Initialize grids after modal is visible
        setTimeout(() => {
            initializePaymentModalGrids(invoiceData);
        }, 100);
        
    }, 10);
}

/**
 * ✅ NEW: Separate function to initialize payment modal grids
 */
function initializePaymentModalGrids(invoiceData) {
    const itemsGridDiv = document.getElementById('sale-payment-items-grid');
    const historyGridDiv = document.getElementById('sale-payment-history-grid');

    if (!itemsGridDiv || !historyGridDiv) {
        console.error('[ui.js] Payment modal grid containers not found');
        return;
    }

    console.log('[ui.js] Initializing payment modal grids');

    // Ensure grid containers are empty
    itemsGridDiv.innerHTML = '';
    historyGridDiv.innerHTML = '';

    // Create grids
    console.log('[ui.js] Creating sale payment items grid');
    salePaymentItemsGridApi = createGrid(itemsGridDiv, salePaymentItemsGridOptions);
    
    console.log('[ui.js] Creating sale payment history grid');
    salePaymentHistoryGridApi = createGrid(historyGridDiv, salePaymentHistoryGridOptions);

    // Wait for grids to be ready, then load data
    const waitForPaymentGrids = setInterval(() => {
        if (salePaymentItemsGridApi && salePaymentHistoryGridApi) {
            clearInterval(waitForPaymentGrids);
            
            console.log('[ui.js] Payment modal grids ready, loading data');
            
            // Load invoice items into items grid
            salePaymentItemsGridApi.setGridOption('rowData', invoiceData.lineItems || []);
            console.log(`[ui.js] ✅ Loaded ${(invoiceData.lineItems || []).length} invoice line items`);

            // Set up real-time payment history listener
            setupPaymentHistoryListener(invoiceData);
            
            // Switch to default tab
            switchPaymentModalTab('tab-new-payment');
        }
    }, 50);
}


/**
 * ✅ NEW: Separate function to setup payment history listener
 */
function setupPaymentHistoryListener(invoiceData) {
    const modal = document.getElementById('record-sale-payment-modal');
    if (!modal || !salePaymentHistoryGridApi) return;

    console.log('[ui.js] Setting up payment history listener');

    const db = firebase.firestore();
    const paymentsQuery = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH)
        .where('invoiceId', '==', invoiceData.id)
        .orderBy('paymentDate', 'desc');
    
    salePaymentHistoryGridApi.setGridOption('loading', true);
    
    // Store the unsubscribe function on the modal element
    modal.unsubscribeListener = paymentsQuery.onSnapshot(snapshot => {
        const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`[ui.js] Payment history updated: ${payments.length} payments`);
        
        if (salePaymentHistoryGridApi) {
            salePaymentHistoryGridApi.setGridOption('rowData', payments);
            salePaymentHistoryGridApi.setGridOption('loading', false);
        }
    }, error => {
        console.error('[ui.js] Payment history listener error:', error);
        if (salePaymentHistoryGridApi) {
            salePaymentHistoryGridApi.setGridOption('loading', false);
            salePaymentHistoryGridApi.showNoRowsOverlay();
        }
    });
}


/**
 * [REFACTORED] Closes the record sale payment modal and cleans up its listener.
 */
export function closeRecordSalePaymentModal() {
    const modal = document.getElementById('record-sale-payment-modal');
    if (!modal) return;
    
    console.log('[ui.js] Closing sale payment modal with enhanced cleanup');
    
    // Clean up the listener
    if (modal.unsubscribeListener && typeof modal.unsubscribeListener === 'function') {
        console.log('[ui.js] Detaching payment history listener');
        modal.unsubscribeListener();
        delete modal.unsubscribeListener;
    }

    // ✅ ENHANCED: Clear grid data to prevent stale data
    if (salePaymentItemsGridApi) {
        salePaymentItemsGridApi.setGridOption('rowData', []);
    }
    
    if (salePaymentHistoryGridApi) {
        salePaymentHistoryGridApi.setGridOption('rowData', []);
    }

    modal.classList.remove('visible');
    setTimeout(() => { 
        modal.style.display = 'none';
        console.log('[ui.js] Sale payment modal closed and cleaned up');
    }, 300);
}


let salePaymentHistoryGridApi = null;

// [NEW] Grid for the payment history inside the "Manage Sale Payments" modal
const salePaymentHistoryGridOptions = {
    getRowId: params => params.data.id,
    theme: 'legacy',
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
                    const voidIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clip-rule="evenodd" /></svg>`;
                    return `<button class="action-btn-icon action-btn-delete text-red-500 action-btn-void-sale-payment" data-id="${params.data.id}" title="Void Payment">${voidIcon}</button>`;
                }
                return '';
            }
        }
    ],
    onGridReady: params => { salePaymentHistoryGridApi = params.api; }
};

/**
 * [CORRECTED] Gets the data for a specific payment row from the
 * sales payment HISTORY grid (the one inside the modal).
 * @param {string} paymentId - The document ID of the payment.
 * @returns {object|null} The payment's data object or null if not found.
 */
export function getSalePaymentDataFromGridById(paymentId) {
    // --- THIS IS THE FIX ---
    // Use the correct grid API variable for the payment history grid.
    if (!salePaymentHistoryGridApi) {
        console.error("Cannot get payment data: salePaymentHistoryGridApi is not ready.");
        return null;
    }
    const rowNode = salePaymentHistoryGridApi.getRowNode(paymentId);
    // -----------------------
    
    return rowNode ? rowNode.data : null;
}


/**
 * [NEW] Handles switching between the tabs inside the payment management modal.
 * @param {string} tabId - The ID of the tab that was clicked.
 */
export function switchPaymentModalTab(tabId) {
    // 1. Handle the visual state of the tab links
    document.querySelectorAll('.payment-modal-tab').forEach(tab => {
        tab.classList.toggle('tab-active', tab.id === tabId);
    });

    // 2. Handle the visibility of the tab panels
    document.querySelectorAll('.payment-modal-tab-panel').forEach(panel => {
        const shouldBeActive = panel.id.includes(tabId.replace('tab-', ''));
        panel.classList.toggle('active', shouldBeActive);
    });
}

/**
 * [NEW] Refreshes the financial summary panel within the payment modal
 * with new data after a payment has been made.
 * @param {object} updatedInvoiceData - The fresh data for the sales invoice.
 */
export function refreshSalePaymentModal(updatedInvoiceData) {
    // Update the summary panel with the new totals.
    document.getElementById('payment-modal-total').textContent = formatCurrency(updatedInvoiceData.financials.totalAmount);
    document.getElementById('payment-modal-paid').textContent = formatCurrency(updatedInvoiceData.totalAmountPaid);
    document.getElementById('payment-modal-balance').textContent = formatCurrency(updatedInvoiceData.balanceDue);

    // Also, reset the default amount in the payment form to the new balance due.
    document.getElementById('record-sale-amount').value = (updatedInvoiceData.balanceDue || 0).toFixed(2);
}

// We also need a simple reset function for the form
export function resetSalePaymentForm() {
    const form = document.getElementById('record-sale-payment-form');
    if (form) form.reset();
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

    // Force hide ALL modals when navigating to any view
    const allModals = document.querySelectorAll('.modal-container');
    allModals.forEach(modal => {
        modal.classList.remove('visible');
        modal.style.display = 'none';
        console.log(`[ui.js] Force hiding modal: ${modal.id}`);
    });

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

    // ✅ NEW: Cleanup Payment Management listeners when leaving
    if (appState.activeView === 'pmt-mgmt-view' && viewId !== 'pmt-mgmt-view') {
        console.log('[ui.js] Leaving Payment Management - cleaning up real-time listeners');
        if (typeof detachPaymentManagementRealtimeSync === 'function') {
            detachPaymentManagementRealtimeSync();
        }
    }

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



//Add these report view functions
/**
 * Displays the main Reports Hub view with categorized report cards.
 * 
 * Shows the central navigation page for all reporting functionality,
 * organized by business domain (sales, inventory, financial, etc.).
 * This view serves as the entry point to all reporting capabilities.
 * 
 * @since 1.0.0
 */
export function showReportsHubView() {
    console.log("[ui.js] Displaying Reports Hub view");
    showView('reports-hub-view');
    
    // No grid initialization needed - just static navigation cards
    // All report cards use click handlers in main.js handleStandaloneButtons
}

/**
 * Displays the Sales Performance Reports view with interactive report cards.
 * 
 * Shows sales-focused reports including direct sales analysis, consignment
 * performance, store comparisons, and customer insights. Uses optimized
 * data loading to minimize Firestore usage.
 * 
 * @since 1.0.0
 */
export function showSalesReportsView() {
    console.log("[ui.js] Displaying Sales Reports view");
    showView('sales-reports-view');
    
    // Pre-load today's metrics for immediate display (uses cache when possible)
    console.log("[ui.js] About to call loadTodaysMetricsForCards");
    loadTodaysMetricsForCards();
}

/**
 * Displays the Financial Reports view with cash flow and profitability analysis.
 * 
 * Shows financial-focused reports including outstanding balances, profit analysis,
 * cash flow summaries, and payment collection efficiency metrics.
 * 
 * @since 1.0.0
 */
export function showFinancialReportsView() {
    console.log("[ui.js] Displaying Financial Reports view");
    showView('financial-reports-view');
    
    // Load essential financial metrics with caching
    loadFinancialSummary();
}

/**
 * Displays the Team Performance Reports view for consignment analytics.
 * 
 * Shows team-focused reports including consignment performance, settlement
 * analysis, team rankings, and product suitability for consignment sales.
 * 
 * @since 1.0.0
 */
export function showTeamReportsView() {
    console.log("[ui.js] Displaying Team Performance Reports view");
    showView('team-reports-view');
    
    // Use masterData.teams cache for immediate team list (no reads)
    displayTeamPerformancePreview();
}

/**
 * Displays the Operations Reports view with efficiency and process metrics.
 * 
 * Shows operational reports including user activity, process efficiency,
 * peak hour analysis, and system utilization metrics.
 * 
 * @since 1.0.0
 */
export function showOperationsReportsView() {
    console.log("[ui.js] Displaying Operations Reports view");
    showView('operations-reports-view');
    
    // Generate operational insights from existing state and masterData
    displayOperationalInsights();
}

/**
 * Displays the Executive Dashboard with high-level KPIs and business overview.
 * 
 * Shows executive-level dashboard with key performance indicators, business
 * health metrics, trend analysis, and strategic insights. Optimized for
 * minimal data reads with maximum business value.
 * 
 * @since 1.0.0
 */
export function showExecutiveDashboardView() {
    console.log("[ui.js] Displaying Executive Dashboard view");
    showView('executive-dashboard-view');
    
    // Load comprehensive business summary with intelligent caching
    loadExecutiveDashboard();
}

/**
 * Pre-loads and displays today's key metrics in the sales report cards.
 * 
 * Updates the preview values shown on sales report cards with real data
 * from today's transactions. Uses caching to minimize Firestore reads
 * and provides immediate visual feedback to users.
 * 
 * OPTIMIZATION: Uses cached daily dashboard data when available
 * FALLBACK: Shows placeholder values if data unavailable
 * 
 * @private
 * @since 1.0.0
 */
async function loadTodaysMetricsForCards() {
    try {
        console.log("[ui.js] === LOADING TODAY'S METRICS FOR CARDS ===");
        
        // Use the ultra-optimized daily dashboard function
        const todayData = await getDailyDashboardOptimized();
        console.log("[ui.js] Today's data received:", todayData);
        
        // Also get 7-day data for store performance preview
        const sevenDaysData = await calculateDirectSalesMetricsOptimized(
            createDateRange(7).startDate, 
            createDateRange(7).endDate, 
            true
        );

        // Also get 14-day data for trend comparison
        const fourteenDaysData = await calculateDirectSalesMetricsOptimized(
            createDateRange(14).startDate,
            createDateRange(7).endDate, // Previous 7 days (8-14 days ago)
            true
        );
        

        console.log("[ui.js] 7-day sales data:", sevenDaysData);
        console.log("[ui.js] Store breakdown:", sevenDaysData.storeBreakdown);
        
        // Update store performance card with 7-day data
        const storeCard = document.querySelector('[data-report-id="store-performance"]');
        console.log("[ui.js] Store performance card found:", storeCard);
        
        if (storeCard) {
            const valueElement = storeCard.querySelector('.text-xl.font-bold');
            const subtitleElement = storeCard.querySelector('.text-sm.text-gray-500');
            
            console.log("[ui.js] Value element:", valueElement);
            console.log("[ui.js] Subtitle element:", subtitleElement);
            
            if (valueElement && sevenDaysData.summary) {
                const displayValue = sevenDaysData.summary.formattedTotalRevenue || '₹0.00';
                console.log("[ui.js] Setting store card value to:", displayValue);
                valueElement.textContent = displayValue;
            }
            
            if (subtitleElement && sevenDaysData.storeBreakdown && sevenDaysData.storeBreakdown.length > 0) {
                const churchStore = sevenDaysData.storeBreakdown.find(s => s.storeName === 'Church Store');
                const tastyTreats = sevenDaysData.storeBreakdown.find(s => s.storeName === 'Tasty Treats');
                
                console.log("[ui.js] Church Store data:", churchStore);
                console.log("[ui.js] Tasty Treats data:", tastyTreats);
                
                let breakdownText = '';
                if (churchStore && tastyTreats) {
                    breakdownText = `Church: ${churchStore.formattedRevenue} | TT: ${tastyTreats.formattedRevenue}`;
                } else if (churchStore) {
                    breakdownText = `Church Store: ${churchStore.formattedRevenue}`;
                } else if (tastyTreats) {
                    breakdownText = `Tasty Treats: ${tastyTreats.formattedRevenue}`;
                } else {
                    breakdownText = `${sevenDaysData.summary.totalTransactions} transactions`;
                }
                
                console.log("[ui.js] Setting subtitle to:", breakdownText);
                subtitleElement.textContent = breakdownText;
            }
        } else {
            console.error("[ui.js] Store performance card not found in DOM!");
        }

        // UPDATE SALES TRENDS CARD (NEW)
        const trendsCard = document.querySelector('[data-report-id="direct-sales-trends"]');
        if (trendsCard) {
            const growthElement = trendsCard.querySelector('#trends-growth-preview');
            const directionElement = trendsCard.querySelector('#trends-direction-preview');
            
            // Calculate simple growth rate (current 7 days vs previous 7 days)
            const currentRevenue = sevenDaysData.summary.totalRevenue;
            const previousRevenue = fourteenDaysData.summary.totalRevenue;
            
            let growthRate = 0;
            if (previousRevenue > 0) {
                growthRate = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
            }
            
            console.log("[ui.js] Trends calculation: Current:", formatCurrency(currentRevenue), "Previous:", formatCurrency(previousRevenue), "Growth:", growthRate.toFixed(1) + '%');
            
            if (growthElement) {
                const growthText = growthRate >= 0 ? `+${growthRate.toFixed(1)}%` : `${growthRate.toFixed(1)}%`;
                growthElement.textContent = growthText;
                
                // Color coding based on growth
                if (growthRate > 10) {
                    growthElement.className = 'text-xl font-bold text-green-600';
                } else if (growthRate > 0) {
                    growthElement.className = 'text-xl font-bold text-green-500';
                } else if (growthRate > -10) {
                    growthElement.className = 'text-xl font-bold text-yellow-600';
                } else {
                    growthElement.className = 'text-xl font-bold text-red-600';
                }
            }
            
            if (directionElement) {
                let trendIcon, trendText, trendColor;
                
                if (growthRate > 5) {
                    trendIcon = '📈';
                    trendText = 'Strong upward trend';
                    trendColor = 'text-green-600';
                } else if (growthRate > 0) {
                    trendIcon = '📊';
                    trendText = 'Positive growth';
                    trendColor = 'text-green-500';
                } else if (growthRate > -5) {
                    trendIcon = '➡️';
                    trendText = 'Stable performance';
                    trendColor = 'text-gray-600';
                } else {
                    trendIcon = '📉';
                    trendText = 'Declining trend';
                    trendColor = 'text-red-600';
                }
                
                directionElement.innerHTML = `<span class="${trendColor}">${trendIcon} ${trendText}</span>`;
            }
        }
        

        // Update customer analytics card  
        const customerCard = document.querySelector('[data-report-id="direct-customer-analytics"]');
        if (customerCard) {
            const valueElement = customerCard.querySelector('.text-xl.font-bold');
            if (valueElement && sevenDaysData.summary) {
                console.log("[ui.js] Setting customer count to:", sevenDaysData.summary.uniqueCustomers);
                valueElement.textContent = sevenDaysData.summary.uniqueCustomers?.toString() || '0';
            }
        }






        
        console.log(`[ui.js] Sales cards update completed`);
        
    } catch (error) {
        console.error('[ui.js] Error loading today\'s metrics for cards:', error);
        console.error('[ui.js] Error details:', error.message);
        console.error('[ui.js] Error stack:', error.stack);
        
        // Show placeholder values on error
        const storeCard = document.querySelector('[data-report-id="store-performance"]');
        if (storeCard) {
            const valueElement = storeCard.querySelector('.text-xl.font-bold');
            if (valueElement) {
                valueElement.textContent = 'No Data';
            }
        }
    }
}

/**
 * Displays inventory insights using masterData cache (zero additional reads).
 * 
 * Leverages the existing masterData.products cache to generate immediate
 * inventory insights without any Firestore queries. Perfect for free tier
 * optimization while still providing valuable business intelligence.
 * 
 * @private
 * @since 1.0.0
 */
function displayInventoryInsights() {
    try {
        console.log("[ui.js] Generating inventory insights from masterData cache");
        
        if (!masterData.products || masterData.products.length === 0) {
            console.warn("[ui.js] No product data available in masterData cache");
            return;
        }
        
        // CLIENT-SIDE INVENTORY ANALYSIS using cached data (0 Firestore reads)
        let totalInventoryValue = 0;
        let lowStockItems = 0;
        let outOfStockItems = 0;
        let totalItems = masterData.products.length;
        
        masterData.products.forEach(product => {
            const stock = product.inventoryCount || 0;
            const unitPrice = product.unitPrice || 0;
            
            totalInventoryValue += stock * unitPrice;
            
            if (stock === 0) {
                outOfStockItems++;
            } else if (stock < REPORT_CONFIGS.PERFORMANCE_THRESHOLDS.LOW_STOCK_THRESHOLD) {
                lowStockItems++;
            }
        });
        
        // Update inventory report cards with calculated values
        const stockCard = document.querySelector('[data-report-id="stock-status"]');
        if (stockCard) {
            const valueElement = stockCard.querySelector('.text-2xl.font-bold');
            const subtitleElement = stockCard.querySelector('.text-sm.text-gray-500');
            
            if (valueElement) {
                valueElement.textContent = lowStockItems.toString();
            }
            if (subtitleElement) {
                subtitleElement.textContent = `${outOfStockItems} out of stock`;
            }
        }
        
        console.log(`[ui.js] Inventory insights updated: ${totalItems} products, ${lowStockItems} low stock, ${formatCurrency(totalInventoryValue)} total value`);
        
    } catch (error) {
        console.warn('[ui.js] Error displaying inventory insights:', error);
    }
}

/**
 * Loads and displays financial summary with outstanding balance analysis.
 * 
 * Combines recent transaction data with cached insights to provide financial
 * overview. Uses intelligent sampling to minimize reads while maximizing
 * the accuracy of financial reporting.
 * 
 * @private
 * @since 1.0.0
 */
async function loadFinancialSummary() {
    try {
        console.log("[ui.js] Loading financial summary with optimization");
        
        // Use business summary with minimal detail to reduce reads
        const financialData = await generateBusinessSummaryOptimized(7, { 
            useCache: true, 
            detailedAnalysis: false 
        });
        
        // Update outstanding balances card
        const balancesCard = document.querySelector('[data-report-id="outstanding-balances"]');
        if (balancesCard) {
            const valueElement = balancesCard.querySelector('.text-2xl.font-bold');
            const subtitleElement = balancesCard.querySelector('.text-xs');
            
            if (valueElement) {
                valueElement.textContent = financialData.executiveSummary.formattedOutstanding;
            }
            
            // Add insight about collection urgency
            if (subtitleElement && financialData.executiveSummary.totalOutstanding > 0) {
                const urgencyLevel = financialData.executiveSummary.totalOutstanding > 2000 
                    ? 'High priority collections needed' 
                    : 'Normal collection activity';
                subtitleElement.textContent = urgencyLevel;
            }
        }
        
        console.log(`[ui.js] Financial summary loaded (${financialData.metadata.totalFirestoreReads} reads)`);
        
    } catch (error) {
        console.warn('[ui.js] Error loading financial summary:', error);
        // Show placeholder values in case of error
    }
}

/**
 * Displays team performance preview using masterData teams cache.
 * 
 * Provides immediate team insights using the cached team data without
 * additional Firestore queries. Shows active team count and basic
 * team information for quick reference.
 * 
 * @private
 * @since 1.0.0
 */
function displayTeamPerformancePreview() {
    try {
        if (!masterData.teams || masterData.teams.length === 0) {
            console.warn("[ui.js] No team data available in masterData cache");
            return;
        }
        
        // Analyze team data from cache (0 additional reads)
        const activeTeams = masterData.teams.filter(team => team.isActive);
        const teamsWithLeads = activeTeams.filter(team => team.teamLeadName && team.teamLeadName !== 'Not Assigned');
        
        console.log(`[ui.js] Team analysis: ${activeTeams.length} active teams, ${teamsWithLeads.length} with assigned leads`);
        
        // Update team performance preview displays
        // This would update any team-related preview cards in the UI
        
    } catch (error) {
        console.warn('[ui.js] Error displaying team performance preview:', error);
    }
}

/**
 * Displays operational insights derived from current app state and masterData.
 * 
 * Generates operational metrics using data already available in memory,
 * including user activity patterns, system utilization, and process
 * efficiency indicators without requiring additional database queries.
 * 
 * @private
 * @since 1.0.0
 */
function displayOperationalInsights() {
    try {
        console.log("[ui.js] Generating operational insights from cached data");
        
        // Use current app state and masterData for immediate insights
        const insights = {
            totalProductsCatalogued: masterData.products?.length || 0,
            totalSuppliers: masterData.suppliers?.length || 0,
            totalCategories: masterData.categories?.length || 0,
            totalActiveTeams: masterData.teams?.filter(t => t.isActive).length || 0,
            currentUser: appState.currentUser?.role || 'Unknown',
            lastDataUpdate: masterData.lastUpdated || 'Unknown'
        };
        
        console.log("[ui.js] Operational insights generated:", insights);
        
        // Update operational report cards with these insights
        // This provides immediate value without any database calls
        
    } catch (error) {
        console.warn('[ui.js] Error generating operational insights:', error);
    }
}

/**
 * SIMPLIFIED: Load executive dashboard (UI coordination only)
 * 
 * This function only handles UI coordination - all business logic is in reports.js
 */
export async function loadExecutiveDashboard() {
    console.log('[ui.js] 📊 Loading executive dashboard UI...');
    
    try {
        showExecutiveDashboardLoading();
        
        const periodSelector = document.getElementById('executive-dashboard-period');
        const daysBack = parseInt(periodSelector?.value || '30');
        
        // ✅ PROPER SEPARATION: Call reports.js for all business logic
        const dashboardData = await generateExecutiveDashboardData(daysBack);
        
        // ✅ UI ONLY: Update DOM elements
        updateExecutiveDashboardDisplay(dashboardData);
        
        console.log(`[ui.js] ✅ Executive dashboard updated`);
        
    } catch (error) {
        console.error('[ui.js] Error loading executive dashboard:', error);
        showExecutiveDashboardError(error);
    }
}




function showExecutiveDashboardError(error) {
    console.error('[ui.js] Displaying executive dashboard error state:', error);
    
    // ===================================================================
    // UPDATE SUMMARY CARDS WITH ERROR STATE
    // ===================================================================
    
    const errorElements = [
        'executive-total-revenue',
        'executive-outstanding-total', 
        'executive-performance-rating'
    ];
    
    errorElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = 'Error';
            element.className = element.className.replace(/text-\w+-\d+/, 'text-red-600');
        }
    });
    
    // ===================================================================
    // UPDATE CHANNEL BREAKDOWN WITH ERROR STATE
    // ===================================================================
    
    const channelElements = [
        'executive-direct-percentage',
        'executive-consignment-percentage',
        'church-store-executive-revenue',
        'tasty-treats-executive-revenue',
        'executive-consignment-total'
    ];
    
    channelElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = 'Error';
        }
    });
    
    // ===================================================================
    // SHOW COMPREHENSIVE ERROR IN INSIGHTS SECTION
    // ===================================================================
    
    const insightsContainer = document.getElementById('executive-business-insights');
    if (insightsContainer) {
        insightsContainer.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-6">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                    </div>
                    <div>
                        <h4 class="text-lg font-semibold text-red-800">Executive Dashboard Error</h4>
                        <p class="text-sm text-red-600">Could not load business intelligence data</p>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg p-4 border border-red-200">
                    <h5 class="font-semibold text-red-800 mb-2">Error Details:</h5>
                    <p class="text-sm text-red-700 mb-4">${error.message || 'Unknown error occurred'}</p>
                    
                    <h5 class="font-semibold text-red-800 mb-2">Possible Causes:</h5>
                    <ul class="text-sm text-red-700 space-y-1 mb-4">
                        <li>• Network connectivity issues</li>
                        <li>• Firestore quota limits reached</li>
                        <li>• Insufficient data for analysis period</li>
                        <li>• Database permission restrictions</li>
                        <li>• Missing sales or consignment data</li>
                    </ul>
                    
                    <h5 class="font-semibold text-red-800 mb-2">Recommended Actions:</h5>
                    <div class="flex flex-wrap gap-2">
                        <button onclick="loadExecutiveDashboard()" 
                               class="bg-red-600 text-white px-3 py-2 text-sm rounded hover:bg-red-700 flex items-center space-x-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                            <span>Retry Dashboard</span>
                        </button>
                        
                        <button onclick="document.getElementById('executive-dashboard-period').value = '7'; loadExecutiveDashboard();" 
                               class="bg-blue-600 text-white px-3 py-2 text-sm rounded hover:bg-blue-700">
                            Try Shorter Period (7 days)
                        </button>
                        
                        <button onclick="showView('reports-hub-view')" 
                               class="bg-gray-600 text-white px-3 py-2 text-sm rounded hover:bg-gray-700">
                            Back to Reports
                        </button>
                    </div>
                </div>
                
                <!-- Technical Details for Debugging -->
                <div class="mt-4 p-3 bg-red-100 rounded border border-red-200">
                    <details class="text-xs text-red-800">
                        <summary class="cursor-pointer font-medium">Technical Details (for support)</summary>
                        <div class="mt-2 space-y-1">
                            <div><strong>Error Type:</strong> ${error.constructor.name}</div>
                            <div><strong>Error Message:</strong> ${error.message}</div>
                            <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
                            <div><strong>User Agent:</strong> ${navigator.userAgent}</div>
                            <div><strong>Current View:</strong> executive-dashboard-view</div>
                            ${error.stack ? `<div><strong>Stack Trace:</strong><br><pre class="text-xs mt-1 whitespace-pre-wrap">${error.stack}</pre></div>` : ''}
                        </div>
                    </details>
                </div>
            </div>
        `;
    }
    
    // ===================================================================
    // UPDATE METADATA WITH ERROR INFO
    // ===================================================================
    
    const metadataElements = {
        'executive-generated-time': new Date().toLocaleTimeString(),
        'executive-firestore-reads': 'Error',
        'executive-execution-time': 'N/A',
        'executive-cache-status': '❌ Error',
        'executive-next-refresh': 'Manual retry needed'
    };
    
    Object.entries(metadataElements).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            if (elementId === 'executive-cache-status') {
                element.className = 'text-red-600 font-medium';
            }
        }
    });
    
    // ===================================================================
    // SHOW MAIN ERROR MODAL FOR IMMEDIATE USER FEEDBACK
    // ===================================================================
    
    setTimeout(() => {
        showModal('error', 'Executive Dashboard Error',
            `Failed to load executive dashboard data.\n\n` +
            `Error: ${error.message}\n\n` +
            `This could be due to:\n` +
            `• Network connectivity issues\n` +
            `• Insufficient data for the selected period\n` +
            `• Firestore quota or permission limits\n` +
            `• Database query complexity\n\n` +
            `Recommended solutions:\n` +
            `1. Check your internet connection\n` +
            `2. Try a shorter analysis period (7 days)\n` +
            `3. Wait a few minutes and retry\n` +
            `4. Contact support if the issue persists\n\n` +
            `The dashboard shows detailed troubleshooting options.`
        );
    }, 1000);
    
    console.error('[ui.js] ✅ Executive dashboard error state displayed with troubleshooting options');
}

/**
 * UI ONLY: Show loading state
 */
function showExecutiveDashboardLoading() {
    document.getElementById('executive-total-revenue').textContent = 'Loading...';
    document.getElementById('executive-outstanding-total').textContent = 'Loading...';
    document.getElementById('executive-performance-rating').textContent = 'Loading...';
    
    const insightsContainer = document.getElementById('executive-business-insights');
    if (insightsContainer) {
        insightsContainer.innerHTML = `
            <div class="text-center py-8">
                <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p class="text-gray-500">Analyzing business data...</p>
            </div>
        `;
    }
}


/**
 * HELPER: Update executive summary cards
 */
function updateExecutiveSummaryCards(businessSummary) {
    const executiveSummary = businessSummary.executiveSummary;
    
    // Total Revenue
    const totalRevenueElement = document.getElementById('executive-total-revenue');
    if (totalRevenueElement) {
        totalRevenueElement.textContent = executiveSummary.formattedTotalRevenue;
    }
    
    // Channel Percentages
    const directPercentElement = document.getElementById('executive-direct-percentage');
    const consignmentPercentElement = document.getElementById('executive-consignment-percentage');
    
    if (directPercentElement) {
        directPercentElement.textContent = `${executiveSummary.channelMix.directPercentage}%`;
    }
    if (consignmentPercentElement) {
        consignmentPercentElement.textContent = `${executiveSummary.channelMix.consignmentPercentage}%`;
    }
    
    // Outstanding Balances
    const outstandingElement = document.getElementById('executive-outstanding-total');
    if (outstandingElement) {
        outstandingElement.textContent = executiveSummary.formattedOutstanding;
    }
    
    // Performance Rating (calculated)
    const performanceElement = document.getElementById('executive-performance-rating');
    if (performanceElement) {
        const rating = calculateOverallPerformanceRating(businessSummary);
        performanceElement.textContent = rating.rating;
        
        const trendElement = document.getElementById('executive-performance-trend');
        if (trendElement) {
            trendElement.textContent = rating.description;
        }
    }
}


/**
 * UI ONLY: Update dashboard display with data from reports.js
 */

function updateExecutiveDashboardDisplay(dashboardData) {
    console.log('[ui.js] 🎨 Updating executive dashboard display...');
    console.log('[ui.js] 🔍 FULL Dashboard data debug:');
    console.log('  dashboardData keys:', Object.keys(dashboardData));
    console.log('  dashboardData.detailedBreakdown:', dashboardData.detailedBreakdown);
    
    if (dashboardData.detailedBreakdown) {
        console.log('  detailedBreakdown keys:', Object.keys(dashboardData.detailedBreakdown));
        console.log('  directSalesData:', dashboardData.detailedBreakdown.directSalesData);
        
        if (dashboardData.detailedBreakdown.directSalesData) {
            console.log('  directSalesData keys:', Object.keys(dashboardData.detailedBreakdown.directSalesData));
            console.log('  productPerformance:', dashboardData.detailedBreakdown.directSalesData.productPerformance);
            
            if (dashboardData.detailedBreakdown.directSalesData.productPerformance) {
                console.log('  productPerformance length:', dashboardData.detailedBreakdown.directSalesData.productPerformance.length);
                console.log('  First product:', dashboardData.detailedBreakdown.directSalesData.productPerformance[0]);
            }
        }
    }
    
    
    // ✅ EXECUTIVE SUMMARY CARDS
    const executiveSummary = dashboardData.executiveSummary;
    
    document.getElementById('executive-total-revenue').textContent = executiveSummary.formattedTotalRevenue;
    document.getElementById('executive-outstanding-total').textContent = executiveSummary.formattedOutstanding;
    
    // Performance rating from executive intelligence
    const performanceRating = dashboardData.executiveIntelligence.overallPerformanceRating;
    document.getElementById('executive-performance-rating').textContent = performanceRating.rating;
    document.getElementById('executive-performance-trend').textContent = performanceRating.description;
    
    // ✅ CHANNEL BREAKDOWN  
    document.getElementById('executive-direct-percentage').textContent = `${executiveSummary.channelMix.directPercentage}%`;
    document.getElementById('executive-consignment-percentage').textContent = `${executiveSummary.channelMix.consignmentPercentage}%`;
    
    // ✅ PERFORMANCE HIGHLIGHTS
    const highlights = dashboardData.performanceHighlights;
    document.getElementById('executive-top-store').textContent = highlights.topStore;
    document.getElementById('executive-top-store-revenue').textContent = highlights.topStoreRevenue;
    document.getElementById('executive-top-team').textContent = highlights.topTeam;
    document.getElementById('executive-top-team-revenue').textContent = highlights.topTeamRevenue;
    document.getElementById('executive-best-product').textContent = highlights.bestProduct;
    const productPerformanceElement = document.getElementById('executive-product-performance');
    if (productPerformanceElement) {
        console.log('[ui.js] 🔍 Looking for product performance data...');
        console.log('[ui.js] 🔍 dashboardData.detailedBreakdown:', !!dashboardData.detailedBreakdown);
        console.log('[ui.js] 🔍 directSalesData:', !!dashboardData.detailedBreakdown?.directSalesData);
        console.log('[ui.js] 🔍 productPerformance:', dashboardData.detailedBreakdown?.directSalesData?.productPerformance);
        
        // ✅ CORRECTED: Use the exact path from your debug
        const topProduct = dashboardData.detailedBreakdown?.directSalesData?.productPerformance?.[0];
        
        console.log('[ui.js] 🔍 Top product found:', topProduct);
        
        if (topProduct) {
            // ✅ CREATE: Comprehensive performance text using available data
            const performanceText = `${topProduct.formattedRevenue} revenue • ${topProduct.totalQuantity} units • ${topProduct.transactionCount} transaction${topProduct.transactionCount > 1 ? 's' : ''}`;
            
            productPerformanceElement.textContent = performanceText;
            
            console.log('[ui.js] ✅ Top product performance updated:', {
                product: topProduct.productName,
                revenue: topProduct.formattedRevenue,
                quantity: topProduct.totalQuantity,
                transactions: topProduct.transactionCount,
                displayText: performanceText
            });
        } else {
            productPerformanceElement.textContent = 'Product performance data not accessible';
            console.error('[ui.js] ❌ Could not access product performance data even though it exists');
        }
    }
    
    // ✅ BUSINESS INSIGHTS
    updateExecutiveInsightsDisplay(dashboardData.businessInsights || []);



    // ✅ DIRECT SALES CHANNEL
    const channelAnalysis = dashboardData.channelAnalysis;
    const directSalesChannel = channelAnalysis?.directSalesChannel;
    
    if (directSalesChannel) {
        // Direct sales contribution percentage
        const directContributionElement = document.getElementById('direct-sales-contribution');
        if (directContributionElement) {
            directContributionElement.textContent = `${directSalesChannel.percentage}%`;
        }
        
        // Store breakdown within direct sales
        const storeBreakdown = directSalesChannel.storeBreakdown || [];
        
        // Church Store
        const churchStore = storeBreakdown.find(store => store.storeName === 'Church Store');
        if (churchStore) {
            const churchRevenueElement = document.getElementById('church-store-executive-revenue');
            const churchTransactionsElement = document.getElementById('church-store-executive-transactions');
            
            if (churchRevenueElement) {
                churchRevenueElement.textContent = churchStore.formattedRevenue || formatCurrency(churchStore.revenue || 0);
            }
            if (churchTransactionsElement) {
                churchTransactionsElement.textContent = `${churchStore.transactions || 0} transactions`;
            }
        } else {
            // Fallback if no church store data
            const churchRevenueElement = document.getElementById('church-store-executive-revenue');
            const churchTransactionsElement = document.getElementById('church-store-executive-transactions');
            
            if (churchRevenueElement) churchRevenueElement.textContent = formatCurrency(directSalesChannel.revenue * 0.6); // Estimate
            if (churchTransactionsElement) churchTransactionsElement.textContent = 'Data unavailable:Number is a projection which is 60% of the Store Revenue';
        }
        
        // Tasty Treats
        const tastyTreats = storeBreakdown.find(store => store.storeName === 'Tasty Treats');
        if (tastyTreats) {
            const tastyRevenueElement = document.getElementById('tasty-treats-executive-revenue');
            const tastyTransactionsElement = document.getElementById('tasty-treats-executive-transactions');
            
            if (tastyRevenueElement) {
                tastyRevenueElement.textContent = tastyTreats.formattedRevenue || formatCurrency(tastyTreats.revenue || 0);
            }
            if (tastyTransactionsElement) {
                tastyTransactionsElement.textContent = `${tastyTreats.transactions || 0} transactions`;
            }
        } else {
            // Fallback if no tasty treats data
            const tastyRevenueElement = document.getElementById('tasty-treats-executive-revenue');
            const tastyTransactionsElement = document.getElementById('tasty-treats-executive-transactions');
            
            if (tastyRevenueElement) tastyRevenueElement.textContent = formatCurrency(directSalesChannel.revenue * 0.4); // Estimate
            if (tastyTransactionsElement) tastyTransactionsElement.textContent = 'Data unavailable:Number is a projection which is 40% of the Church Store Revenue';
        }
        
        console.log('[ui.js] ✅ Direct sales channel updated:', {
            percentage: directSalesChannel.percentage + '%',
            revenue: directSalesChannel.formattedRevenue,
            storeCount: storeBreakdown.length
        });
    }
    
    // ✅ CONSIGNMENT CHANNEL
    const consignmentChannel = channelAnalysis?.consignmentChannel;
    
    if (consignmentChannel) {
        // Consignment contribution percentage
        const consignmentContributionElement = document.getElementById('consignment-contribution');
        if (consignmentContributionElement) {
            consignmentContributionElement.textContent = `${consignmentChannel.percentage}%`;
        }
        
        // Consignment metrics
        const activeOrdersElement = document.getElementById('executive-active-orders');
        const activeTeamsElement = document.getElementById('executive-active-teams');
        const avgOrderValueElement = document.getElementById('executive-avg-order-value');
        const consignmentTotalElement = document.getElementById('executive-consignment-total');
        
        if (activeOrdersElement) {
            activeOrdersElement.textContent = consignmentChannel.activeOrders?.toString() || '0';
        }
        if (activeTeamsElement) {
            activeTeamsElement.textContent = consignmentChannel.teamBreakdown?.length?.toString() || '0';
        }
        if (avgOrderValueElement) {
            avgOrderValueElement.textContent = consignmentChannel.averageOrderValue || '₹0';
        }
        if (consignmentTotalElement) {
            consignmentTotalElement.textContent = consignmentChannel.formattedRevenue;
        }
        
        console.log('[ui.js] ✅ Consignment channel updated:', {
            percentage: consignmentChannel.percentage + '%',
            revenue: consignmentChannel.formattedRevenue,
            activeOrders: consignmentChannel.activeOrders,
            teams: consignmentChannel.teamBreakdown?.length || 0
        });
    }


    // ✅ NEW: KEY BUSINESS METRICS (Collection Rate and Growth Trend)
    updateKeyBusinessMetrics(dashboardData.executiveIntelligence);
    
    // ✅ METADATA
    updateExecutiveMetadataDisplay(dashboardData.metadata);
    
    console.log('[ui.js] ✅ Executive dashboard display updated');
}


/**
 * UI ONLY: Update key business metrics section
 */
function updateKeyBusinessMetrics(executiveIntelligence) {
    console.log('[ui.js] 📈 Updating key business metrics...');
    console.log('[ui.js] 🔍 executiveIntelligence full object:', executiveIntelligence);
    
    // ✅ COLLECTION RATE DETAILED DEBUG
    console.log('[ui.js] 🔍 Collection efficiency object:', executiveIntelligence.collectionEfficiency);
    
    if (executiveIntelligence.collectionEfficiency) {
        console.log('[ui.js] 🔍 Collection efficiency keys:', Object.keys(executiveIntelligence.collectionEfficiency));
        console.log('[ui.js] 🔍 formattedRate value:', executiveIntelligence.collectionEfficiency.formattedRate);
    } else {
        console.error('[ui.js] ❌ collectionEfficiency is null/undefined');
    }
    
    // ✅ GROWTH TREND DETAILED DEBUG
    console.log('[ui.js] 🔍 Growth trend analysis object:', executiveIntelligence.growthTrendAnalysis);
    
    if (executiveIntelligence.growthTrendAnalysis) {
        console.log('[ui.js] 🔍 Growth trend keys:', Object.keys(executiveIntelligence.growthTrendAnalysis));
        console.log('[ui.js] 🔍 trend value:', executiveIntelligence.growthTrendAnalysis.trend);
        console.log('[ui.js] 🔍 direction value:', executiveIntelligence.growthTrendAnalysis.direction);
    } else {
        console.error('[ui.js] ❌ growthTrendAnalysis is null/undefined');
    }
    
    // ✅ FINANCIAL HEALTH
    const financialHealth = executiveIntelligence.financialHealthScore;
    console.log('[ui.js] 🔍 financialHealth object:', financialHealth);

    const financialHealthElement = document.getElementById('executive-financial-health');
    const healthDetailsElement = document.getElementById('executive-health-details');
    
    if (financialHealthElement) {
        console.log('[ui.js] 🔍 Setting dashboard card to:', financialHealth.status);
        financialHealthElement.textContent = financialHealth.status;
        
        // Color coding based on health
        const healthColorClasses = {
            'Excellent': 'text-green-900',
            'Good': 'text-blue-900',
            'Fair': 'text-yellow-900',
            'Needs Attention': 'text-red-900'
        };
        
        financialHealthElement.className = `text-2xl font-bold ${healthColorClasses[financialHealth.status] || 'text-gray-900'}`;
    }
    
    if (healthDetailsElement) {
        console.log('[ui.js] 🔍 Setting health details to:', `${financialHealth.score}% health score`);
        healthDetailsElement.textContent = `${financialHealth.score}% health score`;
    }
    
    // ✅ COLLECTION RATE
    const collectionMetrics = executiveIntelligence.collectionEfficiency;
    const collectionRateElement = document.getElementById('executive-collection-rate');
    const collectionDetailsElement = document.getElementById('executive-collection-details');
    
    if (collectionRateElement) {
        collectionRateElement.textContent = collectionMetrics.formattedRate;
        
        // Color coding based on efficiency
        const collectionColorClasses = {
            'Excellent': 'text-green-900',
            'Good': 'text-blue-900', 
            'Fair': 'text-yellow-900',
            'Needs Improvement': 'text-red-900'
        };
        
        collectionRateElement.className = `text-2xl font-bold ${collectionColorClasses[collectionMetrics.efficiency] || 'text-gray-900'}`;
    }
    
    if (collectionDetailsElement) {
        collectionDetailsElement.textContent = collectionMetrics.details || 'Payment efficiency';
    }
    
    // ✅ GROWTH TREND
    const growthTrend = executiveIntelligence.growthTrendAnalysis;
    const growthTrendElement = document.getElementById('executive-growth-trend');
    const growthDetailsElement = document.getElementById('executive-growth-details');
    
    if (growthTrendElement) {
        growthTrendElement.textContent = `${growthTrend.direction} ${growthTrend.trend}`;
        
        // Color coding based on trend
        const trendColorClasses = {
            'Strong Growth': 'text-green-900',
            'Steady Growth': 'text-blue-900',
            'Moderate Growth': 'text-indigo-900', 
            'Early Development': 'text-yellow-900',
            'Startup Phase': 'text-orange-900'
        };
        
        growthTrendElement.className = `text-2xl font-bold ${trendColorClasses[growthTrend.trend] || 'text-gray-900'}`;
    }
    
    if (growthDetailsElement) {
        growthDetailsElement.textContent = growthTrend.trendDescription || 'Trend analysis';
    }
    
    console.log('[ui.js] ✅ Key business metrics updated:', {
        financialHealth: financialHealth.status,
        collectionRate: collectionMetrics.formattedRate,
        growthTrend: growthTrend.trend
    });
}

/**
 * UI ONLY: Update insights display
 */
function updateExecutiveInsightsDisplay(insights) {
    const container = document.getElementById('executive-business-insights');
    if (!container) return;
    
    if (insights.length === 0) {
        container.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <h4 class="text-lg font-semibold text-green-800 mb-3">✅ Operations Running Smoothly</h4>
                <p class="text-green-700">No critical issues detected in business operations</p>
            </div>
        `;
    } else {
        const insightsHTML = insights.map(insight => `
            <div class="border rounded-lg p-4 bg-${insight.priority === 'high' ? 'red' : insight.priority === 'medium' ? 'yellow' : 'blue'}-50">
                <div class="flex items-start space-x-3">
                    <div class="text-2xl">${insight.priority === 'high' ? '🚨' : insight.priority === 'medium' ? '⚠️' : 'ℹ️'}</div>
                    <div class="flex-1">
                        <h5 class="font-semibold text-sm">${insight.type.replace('-', ' ').toUpperCase()}</h5>
                        <p class="text-sm">${insight.message}</p>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = insightsHTML;
    }
}

/**
 * UI ONLY: Update metadata display
 */
function updateExecutiveMetadataDisplay(metadata) {
    document.getElementById('executive-generated-time').textContent = new Date(metadata.generatedAt).toLocaleTimeString();
    document.getElementById('executive-firestore-reads').textContent = metadata.totalFirestoreReads.toString();
    document.getElementById('executive-execution-time').textContent = `${metadata.executionTimeMs}ms`;
    
    const cacheStatus = metadata.totalFirestoreReads === 0 ? '✅ Cached' : '🔄 Fresh';
    document.getElementById('executive-cache-status').textContent = cacheStatus;
}



/**
 * Fallback function to display basic executive metrics from cached data only.
 * 
 * Used when optimized data loading fails - provides essential business metrics
 * using only masterData cache and current app state. Zero Firestore reads.
 * 
 * @private
 * @since 1.0.0
 */
function displayBasicExecutiveMetrics() {
    console.log("[ui.js] Displaying basic executive metrics from cache only");
    
    try {
        // Generate basic insights from masterData (0 Firestore reads)
        const basicMetrics = {
            totalProducts: masterData.products?.length || 0,
            activeProducts: masterData.products?.filter(p => p.isActive).length || 0,
            totalSuppliers: masterData.suppliers?.length || 0,
            activeTeams: masterData.teams?.filter(t => t.isActive).length || 0,
            currentUser: appState.currentUser?.displayName || 'Unknown User',
            currentRole: appState.currentUser?.role || 'Unknown Role'
        };
        
        // Calculate total inventory value from cached product data
        let totalInventoryValue = 0;
        if (masterData.products) {
            masterData.products.forEach(product => {
                totalInventoryValue += (product.inventoryCount || 0) * (product.unitPrice || 0);
            });
        }
        
        // Update executive dashboard with basic metrics
        const basicMetricsElement = document.querySelector('#executive-basic-metrics');
        if (basicMetricsElement) {
            basicMetricsElement.innerHTML = `
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center p-4 bg-blue-50 rounded">
                        <div class="text-2xl font-bold text-blue-600">${basicMetrics.activeProducts}</div>
                        <div class="text-sm text-gray-600">Active Products</div>
                    </div>
                    <div class="text-center p-4 bg-green-50 rounded">
                        <div class="text-2xl font-bold text-green-600">${basicMetrics.totalSuppliers}</div>
                        <div class="text-sm text-gray-600">Suppliers</div>
                    </div>
                    <div class="text-center p-4 bg-orange-50 rounded">
                        <div class="text-2xl font-bold text-orange-600">${basicMetrics.activeTeams}</div>
                        <div class="text-sm text-gray-600">Active Teams</div>
                    </div>
                    <div class="text-center p-4 bg-purple-50 rounded">
                        <div class="text-2xl font-bold text-purple-600">${formatCurrency(totalInventoryValue)}</div>
                        <div class="text-sm text-gray-600">Inventory Value</div>
                    </div>
                </div>
                
                <div class="mt-6 p-4 bg-gray-50 rounded">
                    <h4 class="font-semibold mb-2">System Status</h4>
                    <div class="text-sm space-y-1">
                        <div>Current User: <span class="font-medium">${basicMetrics.currentUser}</span> (${basicMetrics.currentRole})</div>
                        <div>Data Source: <span class="font-medium">Cached Data Only</span> - No database reads used</div>
                        <div>Last Updated: <span class="font-medium">${new Date().toLocaleTimeString()}</span></div>
                    </div>
                </div>
            `;
        }
        
        console.log(`[ui.js] Basic executive metrics displayed (0 Firestore reads used)`);
        
    } catch (error) {
        console.error('[ui.js] Error displaying basic executive metrics:', error);
    }
}

/**
 * Handles individual report card clicks and loads detailed report data.
 * 
 * When users click on specific report cards, this function determines the
 * appropriate data loading strategy, manages caching, and displays detailed
 * report results. Updated to navigate to dedicated grid views instead of modals.
 * 
 * @param {string} reportId - Unique identifier of the clicked report
 * @param {HTMLElement} cardElement - DOM element of the clicked report card
 * 
 * @since 1.0.0
 */
export async function handleReportCardClick(reportId, cardElement) {
    try {
        console.log(`[ui.js] Loading detailed report: ${reportId}`);
        
        // Show loading state on the card
        showReportCardLoading(cardElement);
        
        let firestoreReadsUsed = 0;
        
        switch (reportId) {
            case 'store-performance':
                console.log('[ui.js] Navigating to store performance detail grid');
                // Navigate to detailed grid view instead of modal
                showStorePerformanceDetailView(7); // 7 days default
                firestoreReadsUsed = 0; // Navigation doesn't use reads
                break;
                
            case 'daily-sales':
                const reportData = await getDailyDashboardOptimized();
                firestoreReadsUsed = reportData.metadata.firestoreReadsUsed;
                displayDailySalesReport(reportData);
                break;
                
            case 'stock-status':
                // Use masterData only (0 reads)
                displayInventoryInsights();
                firestoreReadsUsed = 0;
                break;
                
            case 'outstanding-balances':
                const financialData = await generateBusinessSummaryOptimized(30, { useCache: true });
                firestoreReadsUsed = financialData.metadata.totalFirestoreReads;
                displayOutstandingBalancesReport(financialData);
                break;

            case 'direct-sales-trends':
                console.log('[ui.js] Navigating to sales trends detail view');
                showSalesTrendsDetailView(30); // Default 30 days
                firestoreReadsUsed = 0; // Navigation doesn't use reads
                break;

            case 'direct-customer-analytics':
                showCustomerInsightsDetailView(90); // 90 days for customer patterns
                break;

            case 'stock-status':
                console.log('[ui.js] Navigating to stock status detail view');
                showStockStatusDetailView();
                firestoreReadsUsed = 0;
                break;

            case 'inventory-valuation':
                console.log('[ui.js] Showing inventory valuation analysis');
                showInventoryValuationAnalysis();
                firestoreReadsUsed = 0;
                break;

            case 'product-performance':
                console.log('[ui.js] Showing product performance analysis');
                showProductPerformanceAnalysis();
                firestoreReadsUsed = 0;
                break;

            case 'reorder-recommendations':
                console.log('[ui.js] Showing reorder recommendations');
                showReorderRecommendations();
                firestoreReadsUsed = 0;
                break;

            case 'inventory-turnover':
                showInventoryTurnoverAnalysis();
                firestoreReadsUsed = 0;
                break;
            case 'abc-analysis':
                showABCAnalysis();
                firestoreReadsUsed = 0;
                break;
                
            default:
                console.log(`[ui.js] Report ${reportId} not yet implemented`);
                showModal('info', 'Coming Soon', `The ${reportId} report is being developed and will be available in the next update.`);
                firestoreReadsUsed = 0;
        }
        
        // Hide loading state
        hideReportCardLoading(cardElement);
        
        console.log(`[ui.js] Report ${reportId} processed using ${firestoreReadsUsed} Firestore reads`);
        
    } catch (error) {
        console.error(`[ui.js] Error loading report ${reportId}:`, error);
        hideReportCardLoading(cardElement);
        showModal('error', 'Report Error', `Could not load the ${reportId} report. Please try again later.`);
    }
}

/**
 * Shows loading indicator on report card while data is being fetched.
 * 
 * @param {HTMLElement} cardElement - Report card DOM element
 * @private
 * @since 1.0.0
 */
function showReportCardLoading(cardElement) {
    if (!cardElement) return;
    
    const spinner = document.createElement('div');
    spinner.className = 'report-loading absolute inset-0 flex items-center justify-center bg-white bg-opacity-90';
    spinner.innerHTML = '<div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>';
    
    cardElement.style.position = 'relative';
    cardElement.appendChild(spinner);
}

/**
 * Removes loading indicator from report card.
 * 
 * @param {HTMLElement} cardElement - Report card DOM element  
 * @private
 * @since 1.0.0
 */
function hideReportCardLoading(cardElement) {
    if (!cardElement) return;
    
    const spinner = cardElement.querySelector('.report-loading');
    if (spinner) {
        spinner.remove();
    }
}

/**
 * Displays detailed daily sales report in a modal or dedicated view.
 * 
 * @param {Object} reportData - Daily sales data from getDailyDashboardOptimized
 * @private
 * @since 1.0.0
 */
function displayDailySalesReport(reportData) {
    // Implementation will show detailed breakdown of today's sales
    // This could be a modal with charts or a full-page detailed view
    showModal('info', 'Daily Sales Report', 
        `Today's Revenue: ${reportData.todayRevenue}\n` +
        `Transactions: ${reportData.todayTransactions}\n` +
        `Customers: ${reportData.todayCustomers}\n` +
        `Top Store: ${reportData.topPerformingStore}`
    );
}

/**
 * Displays store performance comparison report.
 * 
 * @param {Object} storeData - Store performance data 
 * @private
 * @since 1.0.0
 */
function displayStorePerformanceReport(storeData) {
    console.log('[ui.js] Navigating to store performance detail grid view');
    
    // Navigate to the detailed grid view
    showStorePerformanceDetailView(7); // Use 7 days to match the data
}

/**
 * Displays outstanding balances report with aging analysis.
 * 
 * @param {Object} financialData - Financial summary data
 * @private  
 * @since 1.0.0
 */
function displayOutstandingBalancesReport(financialData) {
    showModal('info', 'Outstanding Balances', 
        `Total Outstanding: ${financialData.executiveSummary.formattedOutstanding}\n` +
        `Requires immediate attention for cash flow management.`
    );
}


/**
 * Community-compatible grid configuration for store performance analysis.
 * 
 * Removed Enterprise-only features (range selection, charts, status bar, set filters)
 * and optimized for ag-Grid Community edition capabilities.
 * 
 * @since 1.0.0
 */
let storePerformanceDetailGridApi = null;
let isStorePerformanceDetailGridInitialized = false;

const storePerformanceDetailGridOptions = {
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        wrapText: true,        // Enable text wrapping for all columns
        autoHeight: true,      // Auto-adjust row height for wrapped content
        cellStyle: { lineHeight: '1.4' } // Better readability with line spacing
    },
    
    columnDefs: [
        { 
            field: "saleDate", 
            headerName: "Date", 
            width: 120,
            valueFormatter: params => {
                const value = params.value;
                if (!value) return '';
                
                // Handle different date formats
                let date;
                if (value.toDate && typeof value.toDate === 'function') {
                    // Firestore Timestamp
                    date = value.toDate();
                } else if (value instanceof Date) {
                    // JavaScript Date
                    date = value;
                } else if (typeof value === 'string') {
                    // Date string
                    date = new Date(value);
                } else {
                    console.warn('[Grid] Invalid date value:', value);
                    return 'Invalid Date';
                }
                
                // Validate the date is valid
                if (isNaN(date.getTime())) {
                    console.warn('[Grid] Invalid date object:', value);
                    return 'Invalid Date';
                }
                
                return date.toLocaleDateString();
            },
            filter: 'agDateColumnFilter', // Community filter
            sort: 'desc'
        },
        { 
            field: "saleId", 
            headerName: "Invoice ID", 
            width: 180,
            filter: 'agTextColumnFilter', // Community filter
            pinned: 'left',
            wrapText: false
        },
        { 
            field: "store", 
            headerName: "Store", 
            width: 150,
            filter: 'agTextColumnFilter', // Changed from agSetColumnFilter (Enterprise)
            cellRenderer: params => {
                const store = params.value;
                if (store === 'Church Store') {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">${store}</span>`;
                } else if (store === 'Tasty Treats') {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">${store}</span>`;
                }
                return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">${store}</span>`;
            }
        },
        {
            // COMBINED CUSTOMER COLUMN with name, email, and phone
            headerName: "Customer Details", 
            flex: 2,
            minWidth: 200,
            filter: 'agTextColumnFilter',
            wrapText: true, // Enable wrapping for multi-line customer info
            autoHeight: true,
            cellRenderer: params => {
                const customer = params.data.customerInfo || {};
                const name = customer.name || 'Unknown Customer';
                const email = customer.email || 'No email';
                const phone = customer.phone || 'No phone';
                
                return `
                    <div class="py-1">
                        <div class="font-semibold text-gray-900">${name}</div>
                        <div class="text-sm text-gray-600">${email}</div>
                        <div class="text-xs text-gray-500">${phone}</div>
                    </div>
                `;
            },
            // Use customer name for sorting and filtering
            valueGetter: params => params.data.customerInfo?.name || 'Unknown'
        },
        { 
            field: "financials.totalAmount", 
            headerName: "Invoice Amount", 
            width: 120,
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter', // Community filter
            cellClass: 'text-right font-semibold',
            wrapText: false, // Currency amounts don't need wrapping
            autoHeight: false,
            cellStyle: params => {
                const amount = params.value || 0;
                if (amount > 200) return { backgroundColor: '#f0f9ff', fontWeight: 'bold' };
                if (amount < 20) return { backgroundColor: '#fef3c7' };
                return null;
            }
        },
        { 
            field: "formattedAmountReceived", // Use the pre-formatted field
            headerName: "Amount Received", 
            width: 140,
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right font-bold',
            wrapText: false,
            autoHeight: false,
            cellStyle: params => {
                if (params.data.isOverpaid) return { backgroundColor: '#f0fdf4', color: '#166534' }; // Green for overpayment
                if (params.data.isFullyPaid) return { backgroundColor: '#f0fdf4', color: '#166534' }; // Green for full payment
                if (params.data.paymentCompletionPercentage > 0) return { backgroundColor: '#fefce8', color: '#ca8a04' }; // Yellow for partial
                return { backgroundColor: '#fef2f2', color: '#dc2626' }; // Red for no payment
            }
        },
        { 
            field: "paymentStatus", 
            headerName: "Payment Status", 
            width: 140,
            filter: 'agTextColumnFilter', // Changed from agSetColumnFilter
            wrapText: false,
            autoHeight: false,
            cellRenderer: params => {
                const status = params.value;
                let colorClass, bgClass;
                
                switch (status) {
                    case 'Paid':
                        colorClass = 'text-green-700';
                        bgClass = 'bg-green-100';
                        break;
                    case 'Partially Paid':
                        colorClass = 'text-yellow-700';
                        bgClass = 'bg-yellow-100';
                        break;
                    default:
                        colorClass = 'text-red-700';
                        bgClass = 'bg-red-100';
                }
                
                return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${bgClass} ${colorClass}">${status}</span>`;
            }
        },
        { 
            field: "balanceDue", 
            headerName: "Balance Due", 
            width: 120,
            wrapText: false,
            autoHeight: false,
            valueFormatter: p => p.value > 0 ? formatCurrency(p.value) : '',
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right',
            cellStyle: params => params.value > 0 ? { color: '#dc2626', fontWeight: 'bold' } : null
        },
        {
            field: "audit.createdBy",
            headerName: "Created By", 
            width: 150,
            wrapText: true, // Allow wrapping for long names
            autoHeight: true,
            filter: 'agTextColumnFilter'
        },
        {
            headerName: "Items Count",
            width: 120,
            valueGetter: params => params.data.lineItems?.length || 0,
            filter: 'agNumberColumnFilter',
            cellClass: 'text-center',
            wrapText: true, // Allow wrapping for long names
            autoHeight: true
        }
    ],
    
    // Community-compatible features only:
    rowSelection: { mode: 'multiRow' }, // ✅ Community feature for export selection
    
    onGridReady: params => {
        console.log("[ui.js] Store Performance Detail Grid ready (Community version)");
        storePerformanceDetailGridApi = params.api;
        
        // Auto-resize columns
        setTimeout(() => {
            params.api.sizeColumnsToFit();
        }, 100);
        
        // Enable CSV export (Community feature)
        params.api.setGridOption('suppressCsvExport', false);
        // Note: Excel export may not be available in Community - we'll handle this gracefully
    },
    
    // Selection handler for export functionality
    onSelectionChanged: (event) => {
        const selectedRows = event.api.getSelectedRows();
        console.log(`[Store Report] ${selectedRows.length} rows selected for export`);
        updateExportButtonState(selectedRows.length);
    }
};

/**
 * Initializes the store performance detail grid.
 * 
 * Sets up the detailed transaction grid for store performance analysis
 * with all necessary event handlers and optimization features.
 * 
 * @since 1.0.0
 */
export function initializeStorePerformanceDetailGrid() {
    if (isStorePerformanceDetailGridInitialized) {
        console.log("[ui.js] Store performance detail grid already initialized");
        return;
    }
    
    const gridDiv = document.getElementById('store-performance-detail-grid');
    if (gridDiv) {
        console.log("[ui.js] Initializing Store Performance Detail Grid");
        createGrid(gridDiv, storePerformanceDetailGridOptions);
        isStorePerformanceDetailGridInitialized = true;
    } else {
        console.error("[ui.js] Could not find store-performance-detail-grid element");
    }
}

/**
 * Displays the store performance detail view with comprehensive transaction analysis.
 * 
 * Loads detailed transaction data for both Church Store and Tasty Treats,
 * providing summary statistics, filtering capabilities, and export options.
 * Uses optimized queries and caching to minimize Firestore usage.
 * 
 * @param {number} [daysBack=30] - Number of days to analyze (default: 30 days)
 * 
 * @since 1.0.0
 */
export async function showStorePerformanceDetailView(daysBack = 30) {
    try {
        console.log(`[ui.js] Displaying Store Performance Detail view for ${daysBack} days`);
        
        // Navigate to the detail view first
        showView('store-performance-detail-view');
        
        // Initialize the grid
        initializeStorePerformanceDetailGrid();
        
        // Set the period selector to match
        const periodSelector = document.getElementById('store-report-period');
        if (periodSelector) {
            periodSelector.value = daysBack.toString();
        }
        
        // WAIT FOR GRID TO BE READY before loading data
        const waitForGrid = setInterval(() => {
            if (storePerformanceDetailGridApi) {
                clearInterval(waitForGrid);
                console.log('[ui.js] Grid is ready, now loading data');
                
                // Now it's safe to load data
                loadStorePerformanceDetailData(daysBack);
            } else {
                console.log('[ui.js] Waiting for store performance grid to initialize...');
            }
        }, 50); // Check every 50ms
        
        // Fallback: If grid doesn't initialize within 5 seconds, show error
        setTimeout(() => {
            if (!storePerformanceDetailGridApi) {
                clearInterval(waitForGrid);
                console.error('[ui.js] Store performance grid failed to initialize within 5 seconds');
                showModal('error', 'Grid Initialization Failed', 
                    'The report grid could not be initialized. Please try refreshing the page.'
                );
            }
        }, 5000);
        
    } catch (error) {
        console.error('[ui.js] Error showing store performance detail view:', error);
        showModal('error', 'View Error', 'Could not load store performance detail view.');
    }
}


/**
 * Updates the summary cards above the store performance grid with calculated metrics.
 * 
 * @param {Object} salesData - Processed sales data from reports module
 * @private
 */
function updateStorePerformanceSummaryCards(salesData) {
    console.log('[ui.js] Updating summary cards with revenue vs collected analysis');
    console.log('[ui.js] Sales data received:', salesData);
    
    // Calculate ACTUAL revenue metrics (invoiced vs collected)
    const totalInvoiced = salesData.summary.totalRevenue;
    const totalOutstanding = salesData.paymentAnalysis?.totalOutstanding || 0;
    const totalCollected = totalInvoiced - totalOutstanding;
    const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0;
    
    console.log('[ui.js] Enhanced revenue analysis:');
    console.log('  - Total Invoiced (Potential):', formatCurrency(totalInvoiced));
    console.log('  - Total Collected (Actual):', formatCurrency(totalCollected));
    console.log('  - Outstanding:', formatCurrency(totalOutstanding));
    console.log('  - Collection Rate:', collectionRate.toFixed(1) + '%');
    
    // Update Total Invoiced card
    const totalInvoicedElement = document.getElementById('total-invoiced-display');
    if (totalInvoicedElement) {
        totalInvoicedElement.textContent = formatCurrency(totalInvoiced);
    }
    
    // Update Revenue Collected card (ACTUAL money received)
    const revenueCollectedElement = document.getElementById('revenue-collected-display');
    if (revenueCollectedElement) {
        revenueCollectedElement.textContent = formatCurrency(totalCollected);
    }
    
    // Update collection rate display
    const collectionRateElement = document.getElementById('collection-rate-display');
    if (collectionRateElement) {
        const rateColor = collectionRate >= 90 ? 'text-green-600' : 
                         collectionRate >= 70 ? 'text-yellow-600' : 'text-red-600';
        collectionRateElement.innerHTML = `<span class="${rateColor}">${collectionRate.toFixed(1)}% collected</span>`;
    }
    
    // Store-specific analysis with ACTUAL collected amounts
    const churchStoreData = salesData.storeBreakdown.find(store => store.storeName === 'Church Store');
    const tastyTreatsData = salesData.storeBreakdown.find(store => store.storeName === 'Tasty Treats');
    
    if (churchStoreData) {
        console.log('[ui.js] Church Store data:', churchStoreData);
        
        // Calculate actual collected amount for Church Store
        const churchInvoiced = churchStoreData.revenue;
        const churchOutstanding = calculateStoreOutstanding(salesData, 'Church Store');
        const churchCollected = churchInvoiced - churchOutstanding;
        
        console.log('[ui.js] Church Store: Invoiced:', formatCurrency(churchInvoiced), 'Collected:', formatCurrency(churchCollected));
        
        const churchRevenueElement = document.getElementById('church-store-revenue');
        const churchBreakdownElement = document.getElementById('church-store-breakdown');
        
        if (churchRevenueElement) {
            // Show collected amount as the main number (actual revenue)
            churchRevenueElement.textContent = formatCurrency(churchCollected);
        }
        if (churchBreakdownElement) {
            churchBreakdownElement.textContent = `${formatCurrency(churchInvoiced)} invoiced | ${formatCurrency(churchCollected)} collected`;
        }
    }
    
    if (tastyTreatsData) {
        console.log('[ui.js] Tasty Treats data:', tastyTreatsData);
        
        // Calculate actual collected amount for Tasty Treats
        const tastyInvoiced = tastyTreatsData.revenue;
        const tastyOutstanding = calculateStoreOutstanding(salesData, 'Tasty Treats');
        const tastyCollected = tastyInvoiced - tastyOutstanding;
        
        console.log('[ui.js] Tasty Treats: Invoiced:', formatCurrency(tastyInvoiced), 'Collected:', formatCurrency(tastyCollected));
        
        const tastyRevenueElement = document.getElementById('tasty-treats-revenue');
        const tastyBreakdownElement = document.getElementById('tasty-treats-breakdown');
        
        if (tastyRevenueElement) {
            // Show collected amount as the main number (actual revenue)
            tastyRevenueElement.textContent = formatCurrency(tastyCollected);
        }
        if (tastyBreakdownElement) {
            tastyBreakdownElement.textContent = `${formatCurrency(tastyInvoiced)} invoiced | ${formatCurrency(tastyCollected)} collected`;
        }
    }
    
    updateSummaryCardsLoading(false);
}

/**
 * Helper function to calculate outstanding amount for a specific store.
 * 
 * @param {Object} salesData - Complete sales data
 * @param {string} storeName - Name of store to calculate for
 * @returns {number} Outstanding amount for the store
 * @private
 */
function calculateStoreOutstanding(salesData, storeName) {
    // This would need to be calculated from the transaction details
    // For now, we'll distribute the total outstanding proportionally
    const storeData = salesData.storeBreakdown.find(s => s.storeName === storeName);
    if (!storeData) return 0;
    
    const totalRevenue = salesData.summary.totalRevenue;
    const totalOutstanding = salesData.paymentAnalysis?.totalOutstanding || 0;
    
    if (totalRevenue === 0) return 0;
    
    // Proportional distribution of outstanding amount
    const storePercentage = storeData.revenue / totalRevenue;
    return totalOutstanding * storePercentage;
}


/**
 * Shows/hides loading state on summary cards.
 * 
 * @param {boolean} isLoading - Whether to show loading state
 * @private
 */
function updateSummaryCardsLoading(isLoading) {
    const elements = [
        'total-revenue-display',
        'total-transactions-display', 
        'church-store-revenue',
        'tasty-treats-revenue'
    ];
    
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = isLoading ? 'Loading...' : element.textContent;
        }
    });
}

/**
 * Updates the Firestore usage display to help users monitor free tier usage.
 * 
 * @param {number} readsUsed - Number of document reads consumed
 * @param {string} cacheStatus - Cache hit status ('Cached', 'Fresh', 'Expired')
 * @private
 */
function updateFirestoreUsageDisplay(readsUsed, cacheStatus) {
    const readsElement = document.getElementById('reads-count');
    const cacheElement = document.getElementById('cache-status');
    
    if (readsElement) {
        readsElement.textContent = readsUsed.toString();
        // Add visual indicator for high usage
        if (readsUsed > 50) {
            readsElement.className = 'text-red-600 font-bold';
        } else if (readsUsed > 20) {
            readsElement.className = 'text-yellow-600 font-semibold';
        } else {
            readsElement.className = 'text-green-600';
        }
    }
    
    if (cacheElement) {
        cacheElement.textContent = cacheStatus;
        cacheElement.className = cacheStatus === 'Cached' ? 'text-green-600' : 'text-blue-600';
    }
}

/**
 * Updates export button states based on data availability and selection.
 * 
 * @param {number} selectedRowCount - Number of currently selected rows
 * @private
 */
function updateExportButtonState(selectedRowCount) {
    const exportButtons = document.querySelectorAll('#export-store-csv, #export-store-excel');
    
    exportButtons.forEach(button => {
        if (selectedRowCount > 0) {
            button.textContent = button.textContent.replace('Export', `Export ${selectedRowCount} Selected`);
        } else {
            button.textContent = button.textContent.replace(/Export \d+ Selected/, 'Export All');
        }
    });
}


/**
 * Exports store performance data to CSV format.
 * 
 * Generates a CSV file with current grid data including applied filters
 * and user selections. Includes summary information in the file header.
 * 
 * @since 1.0.0
 */
export function exportStorePerformanceCsv() {
    if (!storePerformanceDetailGridApi) {
        console.error('[ui.js] Cannot export: Store performance grid not available');
        return;
    }
    
    try {
        const selectedRows = storePerformanceDetailGridApi.getSelectedRows();
        const exportAll = selectedRows.length === 0;
        
        const fileName = `Store_Performance_${new Date().toISOString().split('T')[0]}`;
        
        storePerformanceDetailGridApi.exportDataAsCsv({
            fileName: fileName + '.csv',
            onlySelected: !exportAll,
            columnSeparator: ',',
            suppressQuotes: false,
            customHeader: `Store Performance Report - Generated ${new Date().toLocaleString()}\n` +
                         `Report Period: ${document.getElementById('store-report-period').selectedOptions[0].text}\n` +
                         `Records: ${exportAll ? 'All' : selectedRows.length + ' Selected'}\n\n`
        });
        
        console.log(`[ui.js] Exported store performance data: ${exportAll ? 'all rows' : selectedRows.length + ' selected rows'}`);
        
        // Show success feedback
        showModal('success', 'Export Successful', 
            `Store performance data exported to ${fileName}.csv\n\n` +
            `Records exported: ${exportAll ? 'All filtered data' : selectedRows.length + ' selected rows'}`
        );
        
    } catch (error) {
        console.error('[ui.js] Error exporting store performance CSV:', error);
        showModal('error', 'Export Failed', 'Could not export the data. Please try again.');
    }
}

/**
 * Exports store performance data to Excel format with enhanced formatting.
 * 
 * @since 1.0.0
 */
export function exportStorePerformanceExcel() {
    if (!storePerformanceDetailGridApi) {
        console.error('[ui.js] Cannot export: Store performance grid not available');
        return;
    }
    
    try {
        // Check if Excel export is available in Community version
        const hasExcelExport = typeof storePerformanceDetailGridApi.exportDataAsExcel === 'function';
        
        if (!hasExcelExport) {
            showModal('info', 'Excel Export Not Available', 
                'Excel export requires ag-Grid Enterprise. Please use CSV export instead.'
            );
            return;
        }
        
        const selectedRows = storePerformanceDetailGridApi.getSelectedRows();
        const exportAll = selectedRows.length === 0;
        const fileName = `Store_Performance_${new Date().toISOString().split('T')[0]}`;
        
        storePerformanceDetailGridApi.exportDataAsExcel({
            fileName: fileName + '.xlsx',
            sheetName: 'Store Performance',
            onlySelected: !exportAll
        });
        
        showModal('success', 'Excel Export Successful', 
            `Store performance data exported to ${fileName}.xlsx`
        );
        
    } catch (error) {
        console.error('[ui.js] Excel export failed, falling back to CSV:', error);
        showModal('info', 'Using CSV Export', 
            'Excel export is not available in Community version. Exporting as CSV instead.'
        );
        exportStorePerformanceCsv(); // Fallback to CSV
    }
}


/**
 * Loads comprehensive store performance data and populates both summary cards and detail grid.
 * 
 * Executes optimized queries to fetch store performance metrics and individual
 * transaction details. Updates all UI elements including summary cards, grid data,
 * and usage tracking displays. Designed for minimal Firestore consumption.
 * 
 * @param {number} daysBack - Number of days to analyze
 * 
 * @since 1.0.0
 */
async function loadStorePerformanceDetailData(daysBack) {
    if (!storePerformanceDetailGridApi) {
        console.error("[ui.js] Store performance detail grid not ready");
        return;
    }
    
    try {
        console.log(`[ui.js] Loading comprehensive store performance data for ${daysBack} days`);
        
        // Show loading states across all UI elements
        storePerformanceDetailGridApi.setGridOption('loading', true);
        updateSummaryCardsLoading(true);
        
        const startTime = Date.now();
        
        // Get both summary metrics and detailed transaction data
        const dateRange = createDateRange(daysBack);
        
        // Execute optimized data loading in parallel
        const [salesMetrics, transactionDetails] = await Promise.all([
            calculateDirectSalesMetricsOptimized(dateRange.startDate, dateRange.endDate, true),
            getStoreTransactionDetails(dateRange.startDate, dateRange.endDate, true)
        ]);
        
        const loadTime = Date.now() - startTime;
        
        // Update summary cards with aggregated metrics
        updateStorePerformanceSummaryCards(salesMetrics);
        
        // Populate the detail grid with transaction data
        storePerformanceDetailGridApi.setGridOption('rowData', transactionDetails.transactions);
        storePerformanceDetailGridApi.setGridOption('loading', false);
        
        // Auto-resize columns for optimal display
        setTimeout(() => {
            storePerformanceDetailGridApi.sizeColumnsToFit();
        }, 100);
        
        // Update Firestore usage tracking display
        const totalReads = salesMetrics.metadata.firestoreReadsUsed + transactionDetails.metadata.firestoreReadsUsed;
        updateFirestoreUsageDisplay(
            totalReads,
            totalReads === 0 ? 'Cached' : 'Fresh'
        );
        
        // Log successful completion with performance metrics
        console.log(`[ui.js] Store performance data loaded successfully:`);
        console.log(`  - Total Firestore reads: ${totalReads}`);
        console.log(`  - Transactions loaded: ${transactionDetails.transactions.length}`);
        console.log(`  - Load time: ${loadTime}ms`);
        console.log(`  - Total revenue: ${salesMetrics.summary.formattedTotalRevenue}`);
        
        // Show data freshness indicator to user
        const dataFreshnessElement = document.getElementById('data-freshness-indicator');
        if (dataFreshnessElement) {
            const freshnessText = totalReads === 0 
                ? `📊 Cached data (updated within ${REPORT_CONFIGS.CACHE_SETTINGS.CACHE_DURATION_MINUTES} minutes)` 
                : `🔄 Fresh data (just loaded)`;
            dataFreshnessElement.textContent = freshnessText;
        }
        
    } catch (error) {
        console.error('[ui.js] Error loading store performance detail data:', error);
        
        // Clean up loading states
        if (storePerformanceDetailGridApi) {
            storePerformanceDetailGridApi.setGridOption('loading', false);
            storePerformanceDetailGridApi.showNoRowsOverlay();
        }
        updateSummaryCardsLoading(false);
        
        // Show user-friendly error message
        showModal('error', 'Data Loading Failed', 
            `Could not load store performance data.\n\n` +
            `This might be due to:\n` +
            `• Network connectivity issues\n` +
            `• Temporary database unavailability\n` +
            `• Free tier quota exceeded\n\n` +
            `Please try again in a few minutes.`
        );
    }
}



/**
 * Displays the sales trends analysis view with comprehensive trend data.
 * 
 * Shows revenue patterns, growth analysis, period comparisons, and visual
 * charts for sales performance over time. Uses optimized data loading
 * with intelligent caching to minimize Firestore usage.
 * 
 * @param {number} [daysBack=30] - Number of days to analyze
 * @since 1.0.0
 */
export async function showSalesTrendsDetailView(daysBack = 30) {
    try {
        console.log(`[ui.js] Displaying Sales Trends Detail view for ${daysBack} days`);
        
        // Navigate to trends view
        showView('sales-trends-detail-view');
        
        // Set period selector
        const periodSelector = document.getElementById('trends-period-selector');
        if (periodSelector) {
            periodSelector.value = daysBack.toString();
        }
        
        // Load trends data
        await loadSalesTrendsData(daysBack);
        
    } catch (error) {
        console.error('[ui.js] Error showing sales trends view:', error);
        showModal('error', 'View Error', 'Could not load sales trends analysis.');
    }
}

/**
 * Loads and displays sales trends data with charts and analysis.
 * 
 * @param {number} daysBack - Number of days to analyze
 * @private
 * @since 1.0.0
 */
async function loadSalesTrendsData(daysBack) {
    try {
        console.log(`[ui.js] Loading sales trends data for ${daysBack} days`);
        
        // Show loading states
        updateTrendsSummaryCardsLoading(true);
        
        // Get comprehensive trends analysis
        const trendsData = await calculateSalesTrends(daysBack, true, true);
        
        console.log('[ui.js] Trends data loaded:', trendsData);
        
        // Update summary cards
        updateTrendsSummaryCards(trendsData);
        
        // Update comparison table
        updatePeriodComparisonTable(trendsData);
        
        // Update charts (placeholder for now)
        updateTrendsCharts(trendsData);
        
        // Update export info
        const dataPointsElement = document.getElementById('trends-data-points');
        if (dataPointsElement) {
            dataPointsElement.textContent = trendsData.dailyBreakdown?.length || 0;
        }
        
        const cacheStatusElement = document.getElementById('trends-cache-status');
        if (cacheStatusElement) {
            cacheStatusElement.textContent = trendsData.metadata.totalFirestoreReads === 0 ? 'Cached' : 'Fresh';
        }
        
        console.log(`[ui.js] Sales trends loaded using ${trendsData.metadata.totalFirestoreReads} Firestore reads`);
        
    } catch (error) {
        console.error('[ui.js] Error loading sales trends data:', error);
        updateTrendsSummaryCardsLoading(false);
        showModal('error', 'Data Loading Error', 'Could not load sales trends data. Please try again.');
    }
}

/**
 * Updates trend summary cards with calculated metrics.
 * 
 * @param {Object} trendsData - Processed trends data from reports module
 * @private
 * @since 1.0.0
 */
function updateTrendsSummaryCards(trendsData) {
    console.log('[ui.js] Updating trends summary cards');
    
    // Revenue Growth Card
    const growthElement = document.getElementById('revenue-growth-display');
    const growthComparisonElement = document.getElementById('growth-comparison');
    
    if (growthElement && trendsData.trendAnalysis) {
        const growth = trendsData.trendAnalysis.revenueGrowthRate;
        const growthText = growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
        const growthColor = growth > 0 ? 'text-green-700' : growth < 0 ? 'text-red-700' : 'text-gray-700';
        
        growthElement.textContent = growthText;
        growthElement.className = `text-2xl font-bold ${growthColor}`;
        
        if (growthComparisonElement) {
            growthComparisonElement.textContent = `vs previous ${trendsData.currentPeriod.dateRange.dayCount} days`;
        }
    }
    
    // Daily Average Card
    const dailyAvgElement = document.getElementById('daily-average-display');
    const dailyTrendElement = document.getElementById('daily-trend');
    
    if (dailyAvgElement && trendsData.currentPeriod) {
        const dailyAvg = trendsData.currentPeriod.summary.dailyAverages?.formattedRevenue || '₹0.00';
        dailyAvgElement.textContent = dailyAvg;
        
        if (dailyTrendElement) {
            dailyTrendElement.textContent = `${trendsData.currentPeriod.summary.dailyAverages?.transactions || 0} transactions/day`;
        }
    }
    
    // Peak Day Card
    const peakDayElement = document.getElementById('peak-day-display');
    const peakAmountElement = document.getElementById('peak-day-amount');
    
    if (peakDayElement && trendsData.peakPerformance?.bestDay) {
        const bestDay = trendsData.peakPerformance.bestDay;
        peakDayElement.textContent = new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'short' });
        
        if (peakAmountElement) {
            peakAmountElement.textContent = bestDay.formattedRevenue;
        }
    }
    
    // Trend Direction Card
    const trendDirectionElement = document.getElementById('trend-direction-display');
    const trendIndicatorElement = document.getElementById('trend-indicator');
    
    if (trendDirectionElement && trendsData.trendAnalysis) {
        const direction = trendsData.trendAnalysis.direction;
        let directionIcon, directionColor;
        
        switch (direction) {
            case 'up':
                directionIcon = '📈';
                directionColor = 'text-green-700';
                break;
            case 'down':
                directionIcon = '📉';
                directionColor = 'text-red-700';
                break;
            default:
                directionIcon = '➡️';
                directionColor = 'text-gray-700';
        }
        
        trendDirectionElement.textContent = directionIcon;
        trendDirectionElement.className = `text-2xl font-bold ${directionColor}`;
        
        if (trendIndicatorElement) {
            trendIndicatorElement.textContent = `${direction} trend (${trendsData.trendAnalysis.significance} significance)`;
        }
    }
    
    updateTrendsSummaryCardsLoading(false);
}

/**
 * Updates the period comparison table with current vs previous metrics.
 * 
 * @param {Object} trendsData - Trends analysis data
 * @private
 * @since 1.0.0
 */
function updatePeriodComparisonTable(trendsData) {
    const tableBody = document.getElementById('comparison-table-body');
    if (!tableBody) return;
    
    const current = trendsData.currentPeriod.summary;
    const previous = trendsData.previousPeriod?.summary;
    
    if (!previous) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No comparison data available</td></tr>';
        return;
    }
    
    const comparisons = [
        {
            metric: 'Total Revenue',
            current: current.formattedTotalRevenue,
            previous: previous.formattedTotalRevenue,
            change: trendsData.trendAnalysis.revenueGrowthRate
        },
        {
            metric: 'Transactions',
            current: current.totalTransactions.toString(),
            previous: previous.totalTransactions.toString(),
            change: trendsData.trendAnalysis.transactionGrowthRate
        },
        {
            metric: 'Unique Customers',
            current: current.uniqueCustomers.toString(),
            previous: previous.uniqueCustomers.toString(),
            change: trendsData.trendAnalysis.customerGrowthRate
        },
        {
            metric: 'Avg Transaction',
            current: current.formattedAverageTransaction,
            previous: previous.formattedAverageTransaction,
            change: previous.averageTransactionValue > 0 
                ? ((current.averageTransactionValue - previous.averageTransactionValue) / previous.averageTransactionValue) * 100 
                : 0
        }
    ];
    
    const tableHTML = comparisons.map(comp => {
        const changeClass = comp.change > 0 ? 'text-green-600' : comp.change < 0 ? 'text-red-600' : 'text-gray-600';
        const changeIcon = comp.change > 0 ? '↗️' : comp.change < 0 ? '↘️' : '➡️';
        const changeText = `${changeIcon} ${comp.change >= 0 ? '+' : ''}${comp.change.toFixed(1)}%`;
        
        return `
            <tr class="border-b border-gray-100">
                <td class="py-3 px-4 font-medium">${comp.metric}</td>
                <td class="py-3 px-4 text-right font-semibold">${comp.current}</td>
                <td class="py-3 px-4 text-right">${comp.previous}</td>
                <td class="py-3 px-4 text-right ${changeClass} font-semibold">${changeText}</td>
            </tr>
        `;
    }).join('');
    
    tableBody.innerHTML = tableHTML;
}

/**
 * Updates chart placeholders with trend visualization data.
 * 
 * @param {Object} trendsData - Chart data from trends analysis
 * @private
 * @since 1.0.0
 */
function updateTrendsCharts(trendsData) {
    // For now, show simple text-based charts
    // Later we can integrate Chart.js or similar library
    
    const revenueChartElement = document.getElementById('revenue-trend-chart');
    if (revenueChartElement && trendsData.dailyBreakdown) {
        revenueChartElement.innerHTML = `
            <div class="space-y-2">
                <h4 class="font-semibold">Daily Revenue Pattern (Last ${trendsData.dailyBreakdown.length} Days)</h4>
                ${trendsData.dailyBreakdown.slice(-7).map(day => `
                    <div class="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                        <span class="text-sm">${day.date}</span>
                        <span class="font-semibold">${formatCurrency(day.revenue)}</span>
                        <span class="text-xs text-gray-500">${day.transactions} txn</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    const storeChartElement = document.getElementById('store-comparison-chart');
    if (storeChartElement && trendsData.currentPeriod.storeBreakdown) {
        const stores = trendsData.currentPeriod.storeBreakdown;
        storeChartElement.innerHTML = `
            <div class="space-y-4">
                ${stores.map(store => `
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="font-semibold">${store.storeName}</span>
                            <span>${store.formattedRevenue}</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-3">
                            <div class="h-3 rounded-full ${store.storeName === 'Church Store' ? 'bg-purple-500' : 'bg-orange-500'}" 
                                 style="width: ${store.revenuePercentage}%"></div>
                        </div>
                        <div class="text-xs text-gray-500">${store.revenuePercentage}% of total | ${store.transactions} transactions</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

/**
 * Shows/hides loading state on trends summary cards.
 * 
 * @param {boolean} isLoading - Whether to show loading state
 * @private
 * @since 1.0.0
 */
function updateTrendsSummaryCardsLoading(isLoading) {
    const elements = [
        'revenue-growth-display',
        'daily-average-display',
        'peak-day-display',
        'trend-direction-display'
    ];
    
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = isLoading ? 'Loading...' : element.textContent;
        }
    });
}


/**
 * Grid configuration for customer insights analysis display.
 * 
 * Shows detailed customer information including spending patterns, loyalty
 * segments, store preferences, and purchase history for comprehensive
 * customer relationship management insights.
 * 
 * @since 1.0.0
 */
let customerInsightsGridApi = null;
let isCustomerInsightsGridInitialized = false;

const customerInsightsGridOptions = {
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 25,
    paginationPageSizeSelector: [25, 50, 100],
    
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        wrapText: true,
        autoHeight: true
    },
    
    columnDefs: [
        {
            field: "name",
            headerName: "Customer Name", 
            flex: 1,
            minWidth: 150,
            filter: 'agTextColumnFilter',
            pinned: 'left',
            cellStyle: { fontWeight: 'bold' }
        },
        {
            headerName: "Contact Information",
            flex: 1,
            minWidth: 200,
            filter: 'agTextColumnFilter',
            cellRenderer: params => {
                const email = params.data.email || 'No email';
                const phone = params.data.phone || 'No phone';
                
                return `
                    <div class="py-1">
                        <div class="text-sm text-gray-900">${email}</div>
                        <div class="text-xs text-gray-500">${phone}</div>
                    </div>
                `;
            },
            valueGetter: params => params.data.email // For filtering and sorting
        },
        {
            field: "totalSpent",
            headerName: "Total Spent",
            width: 130,
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right font-bold',
            sort: 'desc' // Sort by highest spenders first
        },
        {
            field: "totalOrders",
            headerName: "Orders",
            width: 90,
            filter: 'agNumberColumnFilter',
            cellClass: 'text-center font-semibold'
        },
        {
            field: "averageOrderValue",
            headerName: "Avg Order",
            width: 120,
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right'
        },
        {
            field: "loyaltySegment",
            headerName: "Segment",
            width: 100,
            filter: 'agTextColumnFilter',
            cellRenderer: params => {
                const segment = params.value;
                let bgColor, textColor;
                
                switch (segment) {
                    case 'VIP':
                        bgColor = 'bg-yellow-100';
                        textColor = 'text-yellow-800';
                        break;
                    case 'Regular':
                        bgColor = 'bg-blue-100';
                        textColor = 'text-blue-800';
                        break;
                    default:
                        bgColor = 'bg-gray-100';
                        textColor = 'text-gray-800';
                }
                
                return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full ${bgColor} ${textColor}">${segment}</span>`;
            }
        },
        {
            field: "preferredStore",
            headerName: "Preferred Store",
            width: 130,
            filter: 'agTextColumnFilter',
            cellRenderer: params => {
                const store = params.value;
                if (store === 'Church Store') {
                    return `<span class="text-purple-700 font-semibold">Church Store</span>`;
                } else if (store === 'Tasty Treats') {
                    return `<span class="text-orange-700 font-semibold">Tasty Treats</span>`;
                }
                return `<span class="text-gray-500">Mixed</span>`;
            }
        },
        {
            field: "daysSinceLastPurchase",
            headerName: "Last Purchase",
            width: 120,
            valueFormatter: params => {
                const days = params.value || 0;
                if (days === 0) return 'Today';
                if (days === 1) return 'Yesterday';
                return `${days} days ago`;
            },
            filter: 'agNumberColumnFilter',
            cellClass: 'text-center',
            cellStyle: params => {
                const days = params.value || 0;
                if (days > 60) return { color: '#dc2626' }; // Red for long absence
                if (days > 30) return { color: '#d97706' }; // Yellow for moderate absence
                return { color: '#059669' }; // Green for recent customers
            }
        }
    ],
    
    onGridReady: params => {
        console.log("[ui.js] Customer Insights Grid ready");
        customerInsightsGridApi = params.api;
        
        // Enable CSV export
        params.api.setGridOption('suppressCsvExport', false);
    }
};

/**
 * Initializes the customer insights analysis grid.
 * 
 * @since 1.0.0
 */
export function initializeCustomerInsightsGrid() {
    if (isCustomerInsightsGridInitialized) return;
    
    const gridDiv = document.getElementById('customer-insights-grid');
    if (gridDiv) {
        console.log("[ui.js] Initializing Customer Insights Grid");
        createGrid(gridDiv, customerInsightsGridOptions);
        isCustomerInsightsGridInitialized = true;
    }
}

/**
 * Displays the customer insights analysis view.
 * 
 * @param {number} [daysBack=90] - Analysis period (longer for customer patterns)
 * @since 1.0.0
 */
export async function showCustomerInsightsDetailView(daysBack = 90) {
    try {
        console.log(`[ui.js] Displaying Customer Insights view for ${daysBack} days`);
        
        showView('customer-insights-detail-view');
        initializeCustomerInsightsGrid();
        
        // Set period selector
        const periodSelector = document.getElementById('customer-analysis-period');
        if (periodSelector) {
            periodSelector.value = daysBack.toString();
        }
        
        // Wait for grid to be ready before loading data
        const waitForGrid = setInterval(() => {
            if (customerInsightsGridApi) {
                clearInterval(waitForGrid);
                loadCustomerInsightsData(daysBack);
            }
        }, 50);
        
    } catch (error) {
        console.error('[ui.js] Error showing customer insights view:', error);
        showModal('error', 'View Error', 'Could not load customer insights analysis.');
    }
}

/**
 * Loads and displays comprehensive customer insights data.
 * 
 * Fetches customer analytics, populates summary cards, loyalty segments,
 * store preference analysis, and the top customers grid with detailed metrics.
 * 
 * @param {number} daysBack - Number of days to analyze
 * @private
 * @since 1.0.0
 */
async function loadCustomerInsightsData(daysBack) {
    try {
        console.log(`[ui.js] Loading customer insights data for ${daysBack} days`);
        
        // Show loading states
        updateCustomerInsightsSummaryCardsLoading(true);
        if (customerInsightsGridApi) {
            customerInsightsGridApi.setGridOption('loading', true);
        }
        
        // Get comprehensive customer analytics
        const customerData = await calculateCustomerInsights(daysBack, true, true);
        
        console.log('[ui.js] Customer insights data loaded:', customerData);
        
        // Update summary cards
        updateCustomerInsightsSummaryCards(customerData);
        
        // Update loyalty segments display
        updateLoyaltySegmentsDisplay(customerData);
        
        // Update store preference charts
        updateStorePreferenceDisplay(customerData);
        
        // Populate top customers grid
        if (customerInsightsGridApi) {
            customerInsightsGridApi.setGridOption('rowData', customerData.topCustomers);
            customerInsightsGridApi.setGridOption('loading', false);
        }
        
        // Update purchase patterns
        updatePurchasePatternsDisplay(customerData);
        
        console.log(`[ui.js] Customer insights loaded using ${customerData.metadata.firestoreReadsUsed} Firestore reads`);
        
    } catch (error) {
        console.error('[ui.js] Error loading customer insights data:', error);
        updateCustomerInsightsSummaryCardsLoading(false);
        if (customerInsightsGridApi) {
            customerInsightsGridApi.setGridOption('loading', false);
            customerInsightsGridApi.showNoRowsOverlay();
        }
        showModal('error', 'Data Loading Error', 'Could not load customer insights. Please try again.');
    }
}

/**
 * Updates customer insights summary cards with analytics data.
 * 
 * @param {Object} customerData - Customer analytics from reports module
 * @private
 * @since 1.0.0
 */
function updateCustomerInsightsSummaryCards(customerData) {
    console.log('[ui.js] Updating customer insights summary cards');
    
    // Total Customers Card
    const totalCustomersElement = document.getElementById('total-customers-display');
    if (totalCustomersElement) {
        totalCustomersElement.textContent = customerData.customerSummary.totalUniqueCustomers.toString();
    }
    
    const customersGrowthElement = document.getElementById('customers-growth');
    if (customersGrowthElement) {
        customersGrowthElement.textContent = `${customerData.customerSummary.totalOrders} total orders`;
    }
    
    // Repeat Customers Card
    const repeatCustomersElement = document.getElementById('repeat-customers-display');
    if (repeatCustomersElement) {
        const repeatCount = customerData.loyaltySegments.vip.count + customerData.loyaltySegments.regular.count;
        repeatCustomersElement.textContent = repeatCount.toString();
    }
    
    const loyaltyRateElement = document.getElementById('loyalty-rate');
    if (loyaltyRateElement) {
        const retentionRate = customerData.customerSummary.customerRetentionRate.toFixed(1);
        loyaltyRateElement.textContent = `${retentionRate}% retention rate`;
    }
    
    // Average Customer Value Card
    const avgValueElement = document.getElementById('avg-customer-value-display');
    if (avgValueElement) {
        avgValueElement.textContent = customerData.customerSummary.formattedAverageCustomerValue;
    }
    
    const valueTrendElement = document.getElementById('customer-value-trend');
    if (valueTrendElement) {
        valueTrendElement.textContent = `${customerData.customerSummary.averageOrdersPerCustomer.toFixed(1)} orders/customer`;
    }
    
    // Store Preference Card
    const preferredStoreElement = document.getElementById('preferred-store-display');
    if (preferredStoreElement) {
        preferredStoreElement.textContent = customerData.storePreferences.mostPopularStore;
    }
    
    const storeBreakdownElement = document.getElementById('store-preference-breakdown');
    if (storeBreakdownElement) {
        const bothStoresPercentage = customerData.storePreferences.bothStores.percentage.toFixed(0);
        storeBreakdownElement.textContent = `${bothStoresPercentage}% shop at both stores`;
    }
    
    updateCustomerInsightsSummaryCardsLoading(false);
}

/**
 * Updates loyalty segments display with customer counts and revenue.
 * 
 * @param {Object} customerData - Customer analytics data
 * @private
 * @since 1.0.0
 */
function updateLoyaltySegmentsDisplay(customerData) {
    // VIP Customers
    const vipCountElement = document.getElementById('vip-customers-count');
    const vipRevenueElement = document.getElementById('vip-revenue-contribution');
    
    if (vipCountElement) vipCountElement.textContent = customerData.loyaltySegments.vip.count.toString();
    if (vipRevenueElement) {
        vipRevenueElement.textContent = `${customerData.loyaltySegments.vip.formattedRevenue} (${customerData.loyaltySegments.vip.revenueContribution.toFixed(0)}%)`;
    }
    
    // Regular Customers
    const regularCountElement = document.getElementById('regular-customers-count');
    const regularRevenueElement = document.getElementById('regular-revenue-contribution');
    
    if (regularCountElement) regularCountElement.textContent = customerData.loyaltySegments.regular.count.toString();
    if (regularRevenueElement) {
        regularRevenueElement.textContent = `${customerData.loyaltySegments.regular.formattedRevenue} (${customerData.loyaltySegments.regular.revenueContribution.toFixed(0)}%)`;
    }
    
    // New Customers
    const newCountElement = document.getElementById('new-customers-count');
    const newRevenueElement = document.getElementById('new-revenue-contribution');
    
    if (newCountElement) newCountElement.textContent = customerData.loyaltySegments.new.count.toString();
    if (newRevenueElement) {
        newRevenueElement.textContent = `${customerData.loyaltySegments.new.formattedRevenue} (${customerData.loyaltySegments.new.revenueContribution.toFixed(0)}%)`;
    }
}

/**
 * Updates store preference visual charts.
 * 
 * @param {Object} customerData - Customer analytics data
 * @private
 * @since 1.0.0
 */
function updateStorePreferenceDisplay(customerData) {
    const preferences = customerData.storePreferences;
    
    // Church Store Only
    const churchBarElement = document.getElementById('church-only-bar');
    const churchPercentageElement = document.getElementById('church-only-percentage');
    
    if (churchBarElement) churchBarElement.style.width = `${preferences.churchStoreOnly.percentage}%`;
    if (churchPercentageElement) churchPercentageElement.textContent = `${preferences.churchStoreOnly.percentage.toFixed(0)}%`;
    
    // Tasty Treats Only
    const tastyBarElement = document.getElementById('tasty-only-bar');
    const tastyPercentageElement = document.getElementById('tasty-only-percentage');
    
    if (tastyBarElement) tastyBarElement.style.width = `${preferences.tastyTreatsOnly.percentage}%`;
    if (tastyPercentageElement) tastyPercentageElement.textContent = `${preferences.tastyTreatsOnly.percentage.toFixed(0)}%`;
    
    // Both Stores
    const bothBarElement = document.getElementById('both-stores-bar');
    const bothPercentageElement = document.getElementById('both-stores-percentage');
    
    if (bothBarElement) bothBarElement.style.width = `${preferences.bothStores.percentage}%`;
    if (bothPercentageElement) bothPercentageElement.textContent = `${preferences.bothStores.percentage.toFixed(0)}%`;
}

/**
 * Updates purchase patterns analysis display.
 * 
 * @param {Object} customerData - Customer analytics data
 * @private
 * @since 1.0.0
 */
function updatePurchasePatternsDisplay(customerData) {
    const avgOrdersElement = document.getElementById('avg-orders-per-customer');
    if (avgOrdersElement) {
        avgOrdersElement.textContent = customerData.purchasePatterns.averageOrdersPerCustomer.toFixed(1);
    }
    
    const avgDaysElement = document.getElementById('avg-days-between-purchases');
    if (avgDaysElement) {
        avgDaysElement.textContent = customerData.purchasePatterns.averageDaysBetweenPurchases.toString();
    }
    
    const lifetimeValueElement = document.getElementById('customer-lifetime-value');
    if (lifetimeValueElement) {
        lifetimeValueElement.textContent = customerData.customerSummary.formattedAverageCustomerValue;
    }
}

/**
 * Shows/hides loading state on customer insights summary cards.
 * 
 * @param {boolean} isLoading - Whether to show loading state
 * @private
 * @since 1.0.0
 */
function updateCustomerInsightsSummaryCardsLoading(isLoading) {
    const elements = [
        'total-customers-display',
        'repeat-customers-display',
        'avg-customer-value-display',
        'preferred-store-display'
    ];
    
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = isLoading ? 'Loading...' : element.textContent;
        }
    });
}

/**
 * Displays the inventory reports hub with category navigation.
 * 
 * Shows inventory-focused report categories including stock status,
 * valuation analysis, performance metrics, and reorder recommendations.
 * 
 * @since 1.0.0
 */
export function showInventoryReportsView() {
    console.log("[ui.js] Displaying Inventory Reports view");
    showView('inventory-reports-view');
    
    // Pre-load inventory insights from masterData cache (0 reads)
    loadInventoryReportPreviews();
}

/**
 * Displays the detailed stock status analysis view.
 * 
 * Shows comprehensive inventory grid with stock levels, reorder alerts,
 * valuation metrics, and export capabilities for inventory management.
 * 
 * @since 1.0.0
 */
export async function showStockStatusDetailView() {
    try {
        console.log("[ui.js] Displaying Stock Status Detail view");
        
        // Navigate to stock status view
        showView('stock-status-detail-view');
        
        // Initialize the stock status grid
        initializeStockStatusGrid();
        
        // Wait for grid to be ready before loading data
        const waitForGrid = setInterval(() => {
            if (stockStatusGridApi) {
                clearInterval(waitForGrid);
                loadStockStatusData();
            }
        }, 50);
        
    } catch (error) {
        console.error('[ui.js] Error showing stock status detail view:', error);
        showModal('error', 'View Error', 'Could not load stock status analysis.');
    }
}

/**
 * Pre-loads inventory report preview data using masterData cache.
 * 
 * Updates inventory report cards with immediate insights from cached
 * product data without requiring additional Firestore queries.
 * 
 * @private
 * @since 1.0.0
 */
function loadInventoryReportPreviews() {
    try {
        console.log("[ui.js] Loading inventory report previews from masterData cache");
        
        if (!masterData.products || masterData.products.length === 0) {
            console.warn("[ui.js] No product data available in masterData cache");
            return;
        }
        
        // Calculate inventory insights from cached data (0 Firestore reads)
        let totalProducts = masterData.products.length;
        let lowStockItems = 0;
        let outOfStockItems = 0;
        let totalInventoryValue = 0;
        let highestValueProduct = null;
        let highestValue = 0;
        
        masterData.products.forEach(product => {
            const stock = product.inventoryCount || 0;
            const unitCost = product.unitPrice || 0;
            const itemValue = stock * unitCost;
            
            totalInventoryValue += itemValue;
            
            // Track highest value product
            if (itemValue > highestValue) {
                highestValue = itemValue;
                highestValueProduct = product.itemName;
            }
            
            // Stock level analysis
            if (stock === 0) {
                outOfStockItems++;
            } else if (stock < REPORT_CONFIGS.PERFORMANCE_THRESHOLDS.LOW_STOCK_THRESHOLD) {
                lowStockItems++;
            }
        });
        
        // Update Stock Status card
        const stockCard = document.querySelector('[data-report-id="stock-status"]');
        if (stockCard) {
            const valueElement = stockCard.querySelector('#low-stock-count-preview');
            const indicatorElement = stockCard.querySelector('#stock-status-indicator');
            
            if (valueElement) {
                valueElement.textContent = lowStockItems.toString();
                
                // Color coding based on urgency
                if (lowStockItems > 10) {
                    valueElement.className = 'text-2xl font-bold text-red-600';
                } else if (lowStockItems > 5) {
                    valueElement.className = 'text-2xl font-bold text-yellow-600';
                } else {
                    valueElement.className = 'text-2xl font-bold text-blue-600';
                }
            }
            
            if (indicatorElement) {
                if (outOfStockItems > 0) {
                    indicatorElement.innerHTML = `<span class="text-red-600">⚠️ ${outOfStockItems} out of stock</span>`;
                } else if (lowStockItems > 5) {
                    indicatorElement.innerHTML = `<span class="text-yellow-600">⚠️ Reorder needed</span>`;
                } else {
                    indicatorElement.innerHTML = `<span class="text-green-600">✅ Stock levels good</span>`;
                }
            }
        }
        
        // Update Inventory Valuation card
        const valuationCard = document.querySelector('[data-report-id="inventory-valuation"]');
        if (valuationCard) {
            const valueElement = valuationCard.querySelector('#inventory-value-preview');
            const profitElement = valuationCard.querySelector('#inventory-profit-potential');
            
            if (valueElement) {
                valueElement.textContent = formatCurrency(totalInventoryValue);
            }
            
            if (profitElement) {
                const sellingValue = masterData.products.reduce((sum, product) => {
                    const stock = product.inventoryCount || 0;
                    const sellingPrice = product.sellingPrice || (product.unitPrice * 1.2);
                    return sum + (stock * sellingPrice);
                }, 0);
                
                const potentialProfit = sellingValue - totalInventoryValue;
                profitElement.innerHTML = `<span class="text-green-600">💰 ${formatCurrency(potentialProfit)} potential profit</span>`;
            }
        }
        
        // Update Product Performance card
        const productCard = document.querySelector('[data-report-id="product-performance"]');
        if (productCard) {
            const valueElement = productCard.querySelector('#top-product-preview');
            const indicatorElement = productCard.querySelector('#product-performance-indicator');
            
            if (valueElement && highestValueProduct) {
                valueElement.textContent = highestValueProduct;
            }
            
            if (indicatorElement) {
                indicatorElement.innerHTML = `<span class="text-green-600">📊 ${totalProducts} products analyzed</span>`;
            }
        }
        
        // Update Reorder Recommendations card
        const reorderCard = document.querySelector('[data-report-id="reorder-recommendations"]');
        if (reorderCard) {
            const countElement = reorderCard.querySelector('#reorder-needed-count');
            const urgencyElement = reorderCard.querySelector('#reorder-urgency');
            
            const urgentReorders = outOfStockItems + lowStockItems;
            
            if (countElement) {
                countElement.textContent = urgentReorders.toString();
                
                // Color based on urgency
                if (urgentReorders > 10) {
                    countElement.className = 'text-2xl font-bold text-red-600';
                } else if (urgentReorders > 5) {
                    countElement.className = 'text-2xl font-bold text-yellow-600';
                } else {
                    countElement.className = 'text-2xl font-bold text-green-600';
                }
            }
            
            if (urgencyElement) {
                if (outOfStockItems > 0) {
                    urgencyElement.innerHTML = `<span class="text-red-600">⚠️ ${outOfStockItems} critical alerts</span>`;
                } else if (urgentReorders > 0) {
                    urgencyElement.innerHTML = `<span class="text-yellow-600">⚠️ Monitoring needed</span>`;
                } else {
                    urgencyElement.innerHTML = `<span class="text-green-600">✅ All stock levels good</span>`;
                }
            }
        }
        
        console.log(`[ui.js] Inventory previews updated: ${totalProducts} products, ${lowStockItems} low stock, ${formatCurrency(totalInventoryValue)} total value`);
        
    } catch (error) {
        console.error('[ui.js] Error loading inventory report previews:', error);
    }
}

/**
 * Stock Status Grid configuration for detailed inventory analysis.
 * 
 * Shows all products with current stock levels, valuation, reorder recommendations,
 * and integrated sales performance data when available.
 * 
 * @since 1.0.0
 */
let stockStatusGridApi = null;
let isStockStatusGridInitialized = false;

const stockStatusGridOptions = {
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        wrapText: true,
        autoHeight: true
    },
    
    columnDefs: [
        {
            field: "itemName",
            headerName: "Product Name",
            flex: 2,
            minWidth: 200,
            filter: 'agTextColumnFilter',
            pinned: 'left',
            cellStyle: { fontWeight: 'bold' }
        },
        {
            field: "categoryName",
            headerName: "Category",
            width: 120,
            filter: 'agTextColumnFilter',
            valueGetter: params => {
                // Lookup category name from masterData
                const categoryId = params.data.categoryId;
                const category = masterData.categories.find(cat => cat.id === categoryId);
                return category ? category.categoryName : 'Unknown';
            }
        },
        {
            field: "inventoryCount",
            headerName: "Current Stock",
            width: 120,
            filter: 'agNumberColumnFilter',
            cellClass: 'text-center font-bold',
            cellStyle: params => {
                const stock = params.value || 0;
                if (stock === 0) return { backgroundColor: '#fee2e2', color: '#dc2626' }; // Red for out of stock
                if (stock < 10) return { backgroundColor: '#fef3c7', color: '#d97706' }; // Yellow for low stock
                if (stock < 25) return { backgroundColor: '#f0f9ff', color: '#1e40af' }; // Blue for moderate stock
                return { backgroundColor: '#f0fdf4', color: '#166534' }; // Green for good stock
            },
            sort: 'asc' // Show lowest stock first
        },
        {
            headerName: "Stock Status",
            width: 120,
            cellRenderer: params => {
                const stock = params.data.inventoryCount || 0;
                
                if (stock === 0) {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">OUT OF STOCK</span>`;
                } else if (stock < 5) {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">CRITICAL</span>`;
                } else if (stock < 10) {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">LOW</span>`;
                } else if (stock < 25) {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">MODERATE</span>`;
                } else {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">GOOD</span>`;
                }
            },
            filter: 'agTextColumnFilter'
        },
        {
            field: "unitPrice",
            headerName: "Unit Cost",
            width: 120,
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right'
        },
        {
            headerName: "Inventory Value",
            width: 140,
            valueGetter: params => (params.data.inventoryCount || 0) * (params.data.unitPrice || 0),
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right font-semibold',
            cellStyle: { backgroundColor: '#f8fafc' }
        },
        {
            field: "sellingPrice",
            headerName: "Selling Price",
            width: 120,
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right'
        },
        {
            headerName: "Potential Value",
            width: 140,
            valueGetter: params => (params.data.inventoryCount || 0) * (params.data.sellingPrice || 0),
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right font-bold',
            cellStyle: { backgroundColor: '#f0f9ff', color: '#1e40af' }
        },
        {
            headerName: "Margin %",
            width: 100,
            valueGetter: params => {
                const cost = params.data.unitPrice || 0;
                const selling = params.data.sellingPrice || 0;
                return cost > 0 ? ((selling - cost) / cost) * 100 : 0;
            },
            valueFormatter: p => `${p.value.toFixed(1)}%`,
            filter: 'agNumberColumnFilter',
            cellClass: 'text-center font-semibold',
            cellStyle: params => {
                const margin = params.value;
                if (margin > 30) return { color: '#166534' }; // Green for high margin
                if (margin > 15) return { color: '#059669' }; // Medium green
                if (margin > 5) return { color: '#d97706' };  // Yellow for low margin
                return { color: '#dc2626' }; // Red for very low/negative margin
            }
        },
        {
            headerName: "Reorder Action",
            width: 140,
            cellRenderer: params => {
                const stock = params.data.inventoryCount || 0;
                
                if (stock === 0) {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">URGENT REORDER</span>`;
                } else if (stock < 5) {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700">REORDER SOON</span>`;
                } else if (stock < 10) {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">MONITOR</span>`;
                } else {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">SUFFICIENT</span>`;
                }
            }
        }
    ],
    
    // Row styling based on stock levels
    rowClassRules: {
        'bg-red-50': params => (params.data.inventoryCount || 0) === 0,          // Out of stock
        'bg-yellow-50': params => (params.data.inventoryCount || 0) < 5,         // Critical low
        'bg-orange-50': params => (params.data.inventoryCount || 0) < 10,        // Low stock
    },
    
    onGridReady: params => {
        console.log("[ui.js] Stock Status Grid ready");
        stockStatusGridApi = params.api;
        
        // Enable CSV export
        params.api.setGridOption('suppressCsvExport', false);
        
        // Auto-size columns
        setTimeout(() => {
            params.api.sizeColumnsToFit();
        }, 100);
    }
};

/**
 * Initializes the stock status analysis grid.
 * 
 * @since 1.0.0
 */
export function initializeStockStatusGrid() {
    if (isStockStatusGridInitialized) return;
    
    const gridDiv = document.getElementById('stock-status-grid');
    if (gridDiv) {
        console.log("[ui.js] Initializing Stock Status Grid");
        createGrid(gridDiv, stockStatusGridOptions);
        isStockStatusGridInitialized = true;
    }
}

/**
 * Displays comprehensive inventory valuation analysis page.
 * 
 * Shows detailed financial analysis with charts, category breakdowns,
 * and professional visualization instead of simple modal popup.
 * 
 * @since 1.0.0
 */
export async function showInventoryValuationAnalysis() {
    console.log("[ui.js] Navigating to comprehensive inventory valuation analysis");
    showInventoryValuationDetailView();
}

/**
 * Updates inventory summary cards with calculated metrics.
 * 
 * @param {Object} inventoryData - Inventory analysis from reports module
 * @private
 * @since 1.0.0
 */
function updateInventorySummaryCards(inventoryData) {
    console.log('[ui.js] Updating inventory summary cards');
    
    // Total Products
    const totalProductsElement = document.getElementById('total-products-count');
    if (totalProductsElement) {
        totalProductsElement.textContent = inventoryData.inventorySummary.totalProducts.toString();
    }
    
    const productsBreakdownElement = document.getElementById('products-breakdown');
    if (productsBreakdownElement) {
        productsBreakdownElement.textContent = `${inventoryData.inventorySummary.activeProducts} active products`;
    }
    
    // Low Stock Alert
    const lowStockElement = document.getElementById('low-stock-count');
    if (lowStockElement) {
        lowStockElement.textContent = inventoryData.inventorySummary.lowStockCount.toString();
    }
    
    const lowStockUrgencyElement = document.getElementById('low-stock-urgency');
    if (lowStockUrgencyElement) {
        const outOfStock = inventoryData.inventorySummary.outOfStockCount;
        if (outOfStock > 0) {
            lowStockUrgencyElement.innerHTML = `<span class="text-red-600">${outOfStock} out of stock</span>`;
        } else {
            lowStockUrgencyElement.textContent = 'items below threshold';
        }
    }
    
    // Out of Stock
    const outOfStockElement = document.getElementById('out-of-stock-count');
    if (outOfStockElement) {
        outOfStockElement.textContent = inventoryData.inventorySummary.outOfStockCount.toString();
    }
    
    // Total Value
    const totalValueElement = document.getElementById('total-inventory-value');
    if (totalValueElement) {
        totalValueElement.textContent = inventoryData.inventoryValuation.formattedCostValue;
    }
    
    const valueBreakdownElement = document.getElementById('inventory-value-breakdown');
    if (valueBreakdownElement) {
        valueBreakdownElement.textContent = `${inventoryData.inventoryValuation.formattedSellingValue} potential selling value`;
    }
    
    updateInventorySummaryCardsLoading(false);
}



/**
 * Updates detailed data source attribution and cache information display.
 * 
 * Shows users exactly what data sources were used, when the report was generated,
 * cache status, and data freshness indicators for transparency and reliability.
 * 
 * @param {Object} valuationData - Complete valuation analysis with metadata
 * @private
 * @since 1.0.0
 */
function updateDataSourceAttribution(valuationData) {
    try {
        console.log('[ui.js] Updating data source attribution and cache information');
        
        const metadata = valuationData.metadata || {};
        const financialAnalysis = valuationData.comprehensiveFinancialAnalysis || {};
        const actualRevenueData = valuationData.actualRevenueInsights || {};
        
        // Update main data sources breakdown
        const dataSourcesElement = document.getElementById('data-sources-breakdown');
        if (dataSourcesElement) {
            const purchaseInvoices = metadata.purchaseInvoicesAnalyzed || 0;
            const directPayments = actualRevenueData.metadata?.directPaymentsAnalyzed || 0;
            const consignmentPayments = actualRevenueData.metadata?.consignmentPaymentsAnalyzed || 0;
            const donations = actualRevenueData.metadata?.donationRecordsAnalyzed || 0;
            
            dataSourcesElement.innerHTML = `
                <div>📋 ${purchaseInvoices} Purchase Invoices</div>
                <div>🏪 ${directPayments} Direct Sales Payments</div>
                <div>👥 ${consignmentPayments} Consignment Payments</div>
                <div>🎁 ${donations} Donation Records</div>
            `;
        }
        
        // Update report timestamp
        const reportTimestamp = new Date(metadata.calculatedAt || Date.now());
        const timestampElements = [
            'report-timestamp',
            'detailed-report-timestamp'
        ];
        
        timestampElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = reportTimestamp.toLocaleString();
            }
        });
        
        // Update cache status and timing
        const cacheTimestampElement = document.getElementById('cache-timestamp');
        const lastCacheUpdateElement = document.getElementById('last-cache-update');
        const cacheExpiryElement = document.getElementById('cache-expiry-display');
        
        const cacheAge = metadata.firestoreReadsUsed === 0 ? 'CACHED' : 'FRESH';
        const cacheExpiryTime = new Date(reportTimestamp.getTime() + (REPORT_CONFIGS.CACHE_SETTINGS.CACHE_DURATION_MINUTES * 60 * 1000));
        
        if (cacheTimestampElement) {
            if (cacheAge === 'CACHED') {
                cacheTimestampElement.textContent = `Cache: Using cached data (${REPORT_CONFIGS.CACHE_SETTINGS.CACHE_DURATION_MINUTES} min cache)`;
                cacheTimestampElement.className = 'text-xs text-green-600';
            } else {
                cacheTimestampElement.textContent = `Cache: Fresh data loaded`;
                cacheTimestampElement.className = 'text-xs text-blue-600';
            }
        }
        
        if (lastCacheUpdateElement) {
            lastCacheUpdateElement.textContent = reportTimestamp.toLocaleTimeString();
        }
        
        if (cacheExpiryElement) {
            cacheExpiryElement.textContent = cacheExpiryTime.toLocaleTimeString();
        }
        
        // Update investment data sources
        const investmentSourcesElement = document.getElementById('investment-data-sources');
        if (investmentSourcesElement) {
            const pricingInsights = valuationData.pricingSystemInsights || {};
            
            investmentSourcesElement.innerHTML = `
                <div>• <strong>Purchase History:</strong> Latest costs from ${purchaseInvoices} purchase invoices</div>
                <div>• <strong>Current Stock Levels:</strong> Real-time from product inventory</div>
                <div>• <strong>Cost Accuracy:</strong> ${metadata.dataAccuracy || 'Standard'}</div>
                <div>• <strong>Supplier Coverage:</strong> ${financialAnalysis.supplierFinancialAnalysis?.totalSuppliersUsed || 0} suppliers analyzed</div>
            `;
        }
        
        // Update revenue data sources
        const revenueSourcesElement = document.getElementById('revenue-data-sources');
        if (revenueSourcesElement) {
            const priceHistory = pricingInsights.priceHistoryUsage || 0;
            const fallback = pricingInsights.fallbackPriceUsage || 0;
            
            revenueSourcesElement.innerHTML = `
                <div>• <strong>Price History:</strong> ${priceHistory} products from active catalogues</div>
                <div>• <strong>Fallback Pricing:</strong> ${fallback} products from product master</div>
                <div>• <strong>Actual Sales Revenue:</strong> Verified payments from all channels</div>
                <div>• <strong>Revenue Accuracy:</strong> ${pricingInsights.dataAccuracyLevel || 'Medium'} (${pricingInsights.pricingCoverage?.toFixed(1) || 0}% coverage)</div>
            `;
        }
        
        // Update data freshness score
        const dataFreshnessElement = document.getElementById('data-freshness-score');
        if (dataFreshnessElement) {
            const freshnessScore = cacheAge === 'FRESH' ? 100 : Math.max(0, 100 - ((Date.now() - reportTimestamp.getTime()) / (1000 * 60 * REPORT_CONFIGS.CACHE_SETTINGS.CACHE_DURATION_MINUTES)) * 100);
            dataFreshnessElement.textContent = `${freshnessScore.toFixed(0)}%`;
            
            // Color coding
            if (freshnessScore > 80) {
                dataFreshnessElement.className = 'text-2xl font-bold text-green-700';
            } else if (freshnessScore > 50) {
                dataFreshnessElement.className = 'text-2xl font-bold text-yellow-700';
            } else {
                dataFreshnessElement.className = 'text-2xl font-bold text-red-700';
            }
        }
        
        // Update cache efficiency display
        const cacheEfficiencyElement = document.getElementById('cache-efficiency-display');
        if (cacheEfficiencyElement) {
            const efficiency = metadata.firestoreReadsUsed === 0 ? 'Optimal (0 reads)' : `${metadata.firestoreReadsUsed} reads used`;
            cacheEfficiencyElement.textContent = efficiency;
        }
        
        // Update analysis scope
        const analysisScopeElement = document.getElementById('analysis-scope-display');
        if (analysisScopeElement) {
            analysisScopeElement.textContent = metadata.analysisScope || 'Full inventory analysis with actual revenue';
        }
        
        console.log('[ui.js] ✅ Data source attribution and cache information updated');
        
    } catch (error) {
        console.error('[ui.js] Error updating data source attribution:', error);
    }
}





/**
 * Shows/hides loading state on inventory summary cards.
 * 
 * @param {boolean} isLoading - Whether to show loading state
 * @private
 * @since 1.0.0
 */
function updateInventorySummaryCardsLoading(isLoading) {
    const elements = [
        'total-products-count',
        'low-stock-count', 
        'out-of-stock-count',
        'total-inventory-value'
    ];
    
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = isLoading ? 'Loading...' : element.textContent;
        }
    });
}

/**
 * Export inventory data to CSV format with reorder recommendations.
 * 
 * @since 1.0.0
 */
export function exportInventoryCSV() {
    if (!stockStatusGridApi) {
        console.error('[ui.js] Cannot export: Stock status grid not available');
        return;
    }
    
    try {
        const fileName = `Inventory_Analysis_${new Date().toISOString().split('T')[0]}`;
        
        stockStatusGridApi.exportDataAsCsv({
            fileName: fileName + '.csv',
            columnSeparator: ',',
            suppressQuotes: false,
            customHeader: `TrinityCart Inventory Analysis Report - Generated ${new Date().toLocaleString()}\n` +
                         `Report includes current stock levels, valuations, and reorder recommendations\n\n`
        });
        
        showModal('success', 'Inventory Export Successful', 
            `Inventory analysis exported to ${fileName}.csv with reorder recommendations.`
        );
        
    } catch (error) {
        console.error('[ui.js] Error exporting inventory CSV:', error);
        showModal('error', 'Export Failed', 'Could not export inventory data. Please try again.');
    }
}

/**
 * Export critical reorder list for immediate action.
 * 
 * @since 1.0.0
 */
export function exportReorderList() {
    if (!stockStatusGridApi) {
        console.error('[ui.js] Cannot export: Stock status grid not available');
        return;
    }
    
    try {
        // Filter to show only items needing reorder
        stockStatusGridApi.setFilterModel({
            inventoryCount: {
                type: 'lessThan',
                filter: 10,
                filterTo: null
            }
        });
        
        const fileName = `Reorder_List_${new Date().toISOString().split('T')[0]}`;
        
        stockStatusGridApi.exportDataAsCsv({
            fileName: fileName + '.csv',
            columnSeparator: ',',
            customHeader: `URGENT: TrinityCart Reorder List - Generated ${new Date().toLocaleString()}\n` +
                         `Items below minimum stock threshold requiring immediate attention\n\n`
        });
        
        // Reset filter after export
        stockStatusGridApi.setFilterModel(null);
        
        showModal('success', 'Reorder List Exported', 
            `Critical reorder list exported to ${fileName}.csv. Please review immediately for stock replenishment.`
        );
        
    } catch (error) {
        console.error('[ui.js] Error exporting reorder list:', error);
        showModal('error', 'Export Failed', 'Could not export reorder list. Please try again.');
    }
}


/**
 * Displays product performance analysis integrated with inventory data.
 * 
 * Shows which products are performing well in sales relative to their
 * inventory levels, identifying fast-moving vs slow-moving products.
 * 
 * @since 1.0.0
 */
export async function showProductPerformanceAnalysis() {
    try {
        console.log("[ui.js] Displaying product performance analysis");
        
        // Get inventory analysis with sales performance integration
        const inventoryData = await calculateInventoryAnalysis(true, 30, true); // Include performance data
        
        if (!inventoryData.productPerformanceInsights || inventoryData.productPerformanceInsights.length === 0) {
            showModal('info', 'Product Performance Analysis', 
                'No sales performance data available for the analysis period.\n\n' +
                'This report requires recent sales transactions to analyze product velocity and turnover rates.\n\n' +
                'Please create some sales transactions first, then try this report again.'
            );
            return;
        }
        
        // Show top performing products
        const topPerformers = inventoryData.productPerformanceInsights
            .filter(product => product.salesQuantity > 0)
            .sort((a, b) => b.turnoverRate - a.turnoverRate)
            .slice(0, 10);
        
        const performanceBreakdown = `
            🏆 TOP PERFORMING PRODUCTS (Last 30 Days)
            
            ${topPerformers.map((product, index) => 
                `${index + 1}. ${product.itemName}
                   • Current Stock: ${product.inventoryCount}
                   • Sold: ${product.salesQuantity} units  
                   • Turnover Rate: ${(product.turnoverRate * 100).toFixed(1)}%
                   • Days of Stock: ${product.daysOfStock} days
                   • Velocity: ${product.velocityCategory.toUpperCase()}
                `
            ).join('\n')}
            
            📊 Performance Categories:
            • Fast Moving: ${topPerformers.filter(p => p.velocityCategory === 'fast').length} products
            • Medium Moving: ${topPerformers.filter(p => p.velocityCategory === 'medium').length} products  
            • Slow Moving: ${topPerformers.filter(p => p.velocityCategory === 'slow').length} products
            
            Firestore Reads: ${inventoryData.metadata.firestoreReadsUsed}
        `;
        
        showModal('info', 'Product Performance Analysis', performanceBreakdown);
        
    } catch (error) {
        console.error('[ui.js] Error showing product performance analysis:', error);
        showModal('error', 'Analysis Error', 'Could not load product performance analysis.');
    }
}

/**
 * Displays reorder recommendations with urgency levels and cost estimates.
 * 
 * Shows products that need immediate reordering based on current stock levels
 * and sales velocity, with estimated costs and supplier information.
 * 
 * @since 1.0.0
 */
export async function showReorderRecommendations() {
    try {
        console.log("[ui.js] Displaying reorder recommendations");
        
        // Get inventory analysis focused on reorder needs
        const inventoryData = await calculateInventoryAnalysis(true, 30, true);
        
        const reorderList = inventoryData.reorderRecommendations;
        
        if (reorderList.length === 0) {
            showModal('success', 'No Reorders Needed', 
                '✅ Congratulations! All products have adequate stock levels.\n\n' +
                'No immediate reorder actions are required at this time.\n\n' +
                'Continue monitoring stock levels regularly for optimal inventory management.'
            );
            return;
        }
        
        // Categorize by urgency
        const criticalItems = reorderList.filter(item => item.urgencyLevel === 'critical');
        const highUrgencyItems = reorderList.filter(item => item.urgencyLevel === 'high');
        const mediumUrgencyItems = reorderList.filter(item => item.urgencyLevel === 'medium');
        
        const totalEstimatedCost = reorderList.reduce((sum, item) => {
            // Extract numeric value from formatted cost
            const costValue = parseFloat(item.estimatedCost.replace(/[₹$,]/g, '')) || 0;
            return sum + costValue;
        }, 0);
        
        const reorderBreakdown = `
            ⚠️ REORDER RECOMMENDATIONS
            
            🚨 CRITICAL (Out of Stock): ${criticalItems.length} items
            ${criticalItems.map(item => `• ${item.productName} - URGENT REORDER`).join('\n')}
            
            ⚡ HIGH PRIORITY (Very Low Stock): ${highUrgencyItems.length} items  
            ${highUrgencyItems.map(item => `• ${item.productName} - ${item.currentStock} remaining`).join('\n')}
            
            📋 MONITOR (Low Stock): ${mediumUrgencyItems.length} items
            ${mediumUrgencyItems.slice(0, 5).map(item => `• ${item.productName} - ${item.currentStock} remaining`).join('\n')}
            ${mediumUrgencyItems.length > 5 ? `   ... and ${mediumUrgencyItems.length - 5} more items` : ''}
            
            💰 Estimated Reorder Cost: ${formatCurrency(totalEstimatedCost)}
            
            📤 Use "Export Reorder List" button for complete details with supplier information.
            
            Firestore Reads: ${inventoryData.metadata.firestoreReadsUsed}
        `;
        
        showModal('warning', 'Inventory Reorder Alert', reorderBreakdown);
        
    } catch (error) {
        console.error('[ui.js] Error showing reorder recommendations:', error);
        showModal('error', 'Analysis Error', 'Could not load reorder recommendations.');
    }
}


/**
 * Placeholder function for inventory turnover analysis.
 * 
 * @since 1.0.0
 */
export async function showInventoryTurnoverAnalysis() {
    showModal('info', 'Inventory Turnover Analysis', 
        'This report will show how quickly inventory moves and identify fast vs slow-moving products.\n\n' +
        'Coming in the next update with enhanced sales velocity integration.'
    );
}

/**
 * Placeholder function for ABC analysis.
 * 
 * @since 1.0.0
 */
export async function showABCAnalysis() {
    showModal('info', 'ABC Classification Analysis', 
        'This report will classify products by revenue contribution:\n\n' +
        '• A-Items: High revenue contributors (80% of revenue)\n' +
        '• B-Items: Medium revenue contributors (15% of revenue)\n' +
        '• C-Items: Low revenue contributors (5% of revenue)\n\n' +
        'Coming in the next update with advanced product classification.'
    );
}

/**
 * Grid configuration for detailed inventory valuation analysis.
 * 
 * Shows individual product valuations with purchase costs, selling prices,
 * profit margins, and investment analysis for comprehensive financial planning.
 * 
 * @since 1.0.0
 */
let inventoryValuationGridApi = null;
let isInventoryValuationGridInitialized = false;

const inventoryValuationGridOptions = {
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        wrapText: true,
        autoHeight: true
    },
    
    columnDefs: [
        {
            field: "itemName",
            headerName: "Product Name",
            flex: 2,
            minWidth: 200,
            filter: 'agTextColumnFilter',
            pinned: 'left',
            cellStyle: { fontWeight: 'bold' }
        },
        {
            field: "categoryName",
            headerName: "Category",
            width: 120,
            filter: 'agTextColumnFilter',
            valueGetter: params => {
                const categoryId = params.data.categoryId;
                const category = masterData.categories.find(cat => cat.id === categoryId);
                return category ? category.categoryName : 'Unknown';
            }
        },
        {
            field: "inventoryCount",
            headerName: "Stock Qty",
            width: 100,
            filter: 'agNumberColumnFilter',
            cellClass: 'text-center font-bold',
            cellStyle: params => {
                const stock = params.value || 0;
                if (stock === 0) return { backgroundColor: '#fee2e2', color: '#dc2626' };
                if (stock < 10) return { backgroundColor: '#fef3c7', color: '#d97706' };
                return { backgroundColor: '#f0fdf4', color: '#166534' };
            }
        },
        {
            field: "unitPrice",
            headerName: "Unit Cost",
            width: 110,
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right font-medium',
            cellStyle: { backgroundColor: '#fef2f2' } // Light red background for costs
        },
        {
            field: "sellingPrice", 
            headerName: "Selling Price",
            width: 120,
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right font-medium',
            cellStyle: { backgroundColor: '#f0fdf4' } // Light green background for selling prices
        },
        {
            headerName: "Unit Margin",
            width: 110,
            valueGetter: params => {
                const cost = params.data.unitPrice || 0;
                const selling = params.data.sellingPrice || 0;
                return cost > 0 ? ((selling - cost) / cost) * 100 : 0;
            },
            valueFormatter: p => `${p.value.toFixed(1)}%`,
            filter: 'agNumberColumnFilter',
            cellClass: 'text-center font-bold',
            cellStyle: params => {
                const margin = params.value;
                if (margin > 40) return { backgroundColor: '#dcfce7', color: '#166534' }; // Dark green for high margin
                if (margin > 25) return { backgroundColor: '#f0fdf4', color: '#059669' }; // Light green for good margin
                if (margin > 10) return { backgroundColor: '#fefce8', color: '#d97706' }; // Yellow for low margin
                return { backgroundColor: '#fee2e2', color: '#dc2626' }; // Red for very low/negative margin
            }
        },
        {
            headerName: "Total Investment",
            width: 140,
            valueGetter: params => (params.data.inventoryCount || 0) * (params.data.unitPrice || 0),
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right font-bold',
            cellStyle: { backgroundColor: '#fef2f2', fontWeight: 'bold' }
        },
        {
            headerName: "Potential Revenue", 
            width: 150,
            valueGetter: params => (params.data.inventoryCount || 0) * (params.data.sellingPrice || 0),
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right font-bold',
            cellStyle: { backgroundColor: '#f0fdf4', fontWeight: 'bold' }
        },
        {
            headerName: "Potential Profit",
            width: 140,
            valueGetter: params => {
                const stock = params.data.inventoryCount || 0;
                const cost = params.data.unitPrice || 0;
                const selling = params.data.sellingPrice || 0;
                return stock * (selling - cost);
            },
            valueFormatter: p => formatCurrency(p.value || 0),
            filter: 'agNumberColumnFilter',
            cellClass: 'text-right font-bold',
            cellStyle: params => {
                const profit = params.value || 0;
                if (profit > 1000) return { backgroundColor: '#dcfce7', color: '#166534', fontWeight: 'bold' }; // High profit
                if (profit > 500) return { backgroundColor: '#f0fdf4', color: '#059669' }; // Good profit
                if (profit > 0) return { backgroundColor: '#fefce8', color: '#d97706' }; // Low profit
                return { backgroundColor: '#fee2e2', color: '#dc2626' }; // Loss/no profit
            }
        },
        {
            headerName: "Data Quality",
            width: 120,
            cellRenderer: params => {
                const hasCost = (params.data.unitPrice || 0) > 0;
                const hasSelling = (params.data.sellingPrice || 0) > 0;
                const hasStock = (params.data.inventoryCount || 0) > 0;
                
                if (hasCost && hasSelling && hasStock) {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">COMPLETE</span>`;
                } else if (hasCost && hasSelling) {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">NO STOCK</span>`;
                } else {
                    return `<span class="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">INCOMPLETE</span>`;
                }
            }
        }
    ],
    
    // Sort by potential profit (highest first) to show most valuable inventory
    sortingOrder: ['desc'],
    
    onGridReady: params => {
        console.log("[ui.js] Inventory Valuation Grid ready");
        inventoryValuationGridApi = params.api;
        
        // Enable CSV export
        params.api.setGridOption('suppressCsvExport', false);
        
        // Auto-size columns
        setTimeout(() => {
            params.api.sizeColumnsToFit();
        }, 100);
    }
};

/**
 * Initializes the inventory valuation analysis grid.
 * 
 * @since 1.0.0
 */
export function initializeInventoryValuationGrid() {
    if (isInventoryValuationGridInitialized) return;
    
    const gridDiv = document.getElementById('inventory-valuation-grid');
    if (gridDiv) {
        console.log("[ui.js] Initializing Inventory Valuation Grid");
        createGrid(gridDiv, inventoryValuationGridOptions);
        isInventoryValuationGridInitialized = true;
    }
}

/**
 * Displays the comprehensive inventory valuation analysis view.
 * 
 * Shows detailed financial analysis with charts, category breakdowns,
 * and actionable insights for inventory investment optimization.
 * 
 * @since 1.0.0
 */
export async function showInventoryValuationDetailView() {
    try {
        console.log("[ui.js] Displaying Inventory Valuation Detail view with professional visualization");
        
        // Navigate to valuation detail view
        showView('inventory-valuation-detail-view');
        
        // Initialize the valuation grid
        initializeInventoryValuationGrid();
        
        // Wait for grid to be ready before loading data
        const waitForGrid = setInterval(() => {
            if (inventoryValuationGridApi) {
                clearInterval(waitForGrid);
                loadInventoryValuationData();
            }
        }, 50);
        
    } catch (error) {
        console.error('[ui.js] Error showing inventory valuation detail view:', error);
        showModal('error', 'View Error', 'Could not load inventory valuation analysis.');
    }
}


/**
 * Updates valuation summary cards with comprehensive financial metrics.
 * 
 * Maps the four business metrics to your existing HTML elements:
 * - Total Spending -> total-cost-value-display
 * - Current Investment -> total-selling-value-display  
 * - Revenue Potential -> potential-profit-display
 * - Inventory Turnover -> roi-percentage-display
 * 
 * @param {Object} valuationData - Enhanced valuation data from reports module
 * @private
 * @since 1.0.0
 */
function updateValuationSummaryCards(valuationData) {
    console.log('[ui.js] Updating comprehensive financial summary cards');
    console.log('[ui.js] Received data keys:', Object.keys(valuationData));
    
    // Try to find the financial data in any of the possible structures
    const financialAnalysis = valuationData.comprehensiveFinancialAnalysis || 
                            valuationData.accurateInventoryValuation ||
                            valuationData.inventoryValuation ||
                            null;
    
    if (!financialAnalysis) {
        console.error('[ui.js] No financial analysis data found in any expected structure');
        console.error('[ui.js] Available data:', valuationData);
        updateValuationSummaryCardsLoading(false);
        return;
    }
    
    console.log('[ui.js] Using financial analysis:', financialAnalysis);
    console.log('[ui.js] Available financial properties:', Object.keys(financialAnalysis));
    
    // METRIC 1: Total Historical Spending -> total-cost-value-display
    const totalSpendingElement = document.getElementById('total-cost-value-display');
    if (totalSpendingElement) {
        const totalSpending = financialAnalysis.formattedTotalSpending || 
                            financialAnalysis.formattedInvestmentValue || 
                            formatCurrency(financialAnalysis.totalHistoricalSpending || 0);
        totalSpendingElement.textContent = totalSpending;
        console.log('[ui.js] ✅ METRIC 1 - Total Spending:', totalSpending);
    }
    
    // Update investment breakdown subtitle
    const investmentBreakdownElement = document.getElementById('investment-breakdown');
    if (investmentBreakdownElement) {
        const invoiceCount = valuationData.metadata?.purchaseInvoicesAnalyzed || 'unknown';
        investmentBreakdownElement.textContent = `All purchase invoices (${invoiceCount} invoices analyzed)`;
    }
    
    // METRIC 2: Current Investment -> total-selling-value-display  
    const currentInvestmentElement = document.getElementById('total-selling-value-display');
    if (currentInvestmentElement) {
        const currentInvestment = financialAnalysis.formattedCurrentInvestment ||
                                 formatCurrency(financialAnalysis.currentInventoryInvestment || 0);
        currentInvestmentElement.textContent = currentInvestment;
        console.log('[ui.js] ✅ METRIC 2 - Current Investment:', currentInvestment);
    }
    
    // Update current investment subtitle
    const revenueNoteElement = document.getElementById('revenue-potential-note');
    if (revenueNoteElement) {
        const productsIncluded = financialAnalysis.productsIncludedInValuation || 0;
        revenueNoteElement.textContent = `Value of current stock (${productsIncluded} products)`;
    }
    
    // METRIC 3: Revenue Potential -> potential-profit-display
    const revenuePotentialElement = document.getElementById('potential-profit-display');
    if (revenuePotentialElement) {
        const revenuePotential = financialAnalysis.formattedRevenuePotential ||
                               formatCurrency(financialAnalysis.totalRevenuePotential || 0);
        revenuePotentialElement.textContent = revenuePotential;
        console.log('[ui.js] ✅ METRIC 3 - Revenue Potential:', revenuePotential);
    }
    
    // Update revenue potential subtitle
    const profitMarginElement = document.getElementById('profit-margin-display');
    if (profitMarginElement) {
        const margin = financialAnalysis.currentStockMargin || 0;
        profitMarginElement.textContent = `${margin.toFixed(2)}% potential margin on current stock`;
    }
    
    // METRIC 4: Inventory Turnover -> roi-percentage-display
    const turnoverElement = document.getElementById('roi-percentage-display');
    if (turnoverElement) {
        // Show turnover VALUE (₹amount) not percentage for clarity
        const turnoverValue = financialAnalysis.formattedTurnoverValue ||
                            formatCurrency(financialAnalysis.inventoryTurnoverValue || 0);
        turnoverElement.textContent = turnoverValue;
        console.log('[ui.js] ✅ METRIC 4 - Inventory Turnover Value:', turnoverValue);
    }
    
    // Update turnover explanation with proper formatting
    const roiExplanationElement = document.getElementById('roi-explanation');
    if (roiExplanationElement) {
        const turnoverPercentage = financialAnalysis.inventoryTurnoverPercentage || 0;
        const formattedPercentage = Math.abs(turnoverPercentage).toFixed(2); // Remove negative sign, 2 decimals
        
        if (turnoverPercentage >= 0) {
            roiExplanationElement.textContent = `${formattedPercentage}% successfully converted to sales`;
            roiExplanationElement.className = 'mt-2 text-sm text-green-600'; // Green for positive
        } else {
            roiExplanationElement.textContent = `Current stock value higher than historical average`;
            roiExplanationElement.className = 'mt-2 text-sm text-blue-600'; // Blue for info
        }
    }
    
    updateValuationSummaryCardsLoading(false);
    console.log('[ui.js] ✅ All four comprehensive financial metrics updated successfully');
}


/**
 * Loads comprehensive inventory valuation data with enhanced error handling.
 * 
 * @private
 * @since 1.0.0
 */
async function loadInventoryValuationData() {
    try {
        console.log("[ui.js] Loading comprehensive inventory valuation data");
        
        // Show loading states
        updateValuationSummaryCardsLoading(true);
        if (inventoryValuationGridApi) {
            inventoryValuationGridApi.setGridOption('loading', true);
        }
        
        // Get comprehensive inventory analysis
        console.log("[ui.js] Calling calculateInventoryAnalysis...");
        const valuationData = await calculateInventoryAnalysis(false, 30, true);
        
        console.log('[ui.js] ===== VALUATION DATA RECEIVED =====');
        console.log('Type:', typeof valuationData);
        console.log('Is null/undefined:', valuationData == null);
        console.log('Keys:', valuationData ? Object.keys(valuationData) : 'NO KEYS');
        
        if (valuationData?.inventorySummary) {
            console.log('inventorySummary keys:', Object.keys(valuationData.inventorySummary));
        }
        
        if (valuationData?.accurateInventoryValuation) {
            console.log('accurateInventoryValuation keys:', Object.keys(valuationData.accurateInventoryValuation));
        }
        console.log('===== END VALUATION DATA DEBUG =====');
        
        // Validate data structure before proceeding
        if (!valuationData) {
            throw new Error('No valuation data returned from calculateInventoryAnalysis');
        }
        
        // Update components with error handling
        try {
            updateValuationSummaryCards(valuationData);
        } catch (cardError) {
            console.error('[ui.js] Error updating summary cards:', cardError);
        }
        
        try {
            updateValuationCharts(valuationData);
        } catch (chartError) {
            console.error('[ui.js] Error updating charts:', chartError);
        }
        
        try {
            updateCategoryValuationTable(valuationData);
        } catch (tableError) {
            console.error('[ui.js] Error updating category table:', tableError);
        }
        
        // Populate grid with basic product data (safest approach)
        if (inventoryValuationGridApi) {
            try {
                // Use masterData.products as fallback if enhanced data not available
                const gridData = valuationData.enhancedProductDetails || masterData.products;
                inventoryValuationGridApi.setGridOption('rowData', gridData);
                inventoryValuationGridApi.setGridOption('loading', false);
                console.log('[ui.js] Grid populated with', gridData.length, 'products');
            } catch (gridError) {
                console.error('[ui.js] Error populating grid:', gridError);
                inventoryValuationGridApi.setGridOption('loading', false);
            }
        }
        
        // Update data quality display with error handling
        try {
            updateDataQualityDisplay(valuationData);
        } catch (qualityError) {
            console.error('[ui.js] Error updating data quality display:', qualityError);
        }

        // ADD THIS: Update data source attribution and cache information
        try {
            updateDataSourceAttribution(valuationData);
        } catch (attributionError) {
            console.error('[ui.js] Error updating data source attribution:', attributionError);
        }
        
        const readsUsed = valuationData?.metadata?.firestoreReadsUsed || 0;
        console.log(`[ui.js] Inventory valuation loaded using ${readsUsed} Firestore reads`);
        
    } catch (error) {
        console.error('[ui.js] Error loading inventory valuation data:', error);
        console.error('[ui.js] Error stack:', error.stack);
        
        // Clean up loading states
        updateValuationSummaryCardsLoading(false);
        if (inventoryValuationGridApi) {
            inventoryValuationGridApi.setGridOption('loading', false);
            inventoryValuationGridApi.showNoRowsOverlay();
        }
        
        showModal('error', 'Data Loading Error', 
            `Could not load inventory valuation data.\n\n` +
            `Error: ${error.message}\n\n` +
            `This might be due to:\n` +
            `• No purchase invoice data available\n` +
            `• No active sales catalogues found\n` +
            `• Network connectivity issues\n\n` +
            `Please ensure you have:\n` +
            `1. Created some purchase invoices\n` +
            `2. Created at least one active sales catalogue\n` +
            `3. Added products to the sales catalogue`
        );
    }
}

/**
 * Updates charts and visual elements for inventory valuation.
 * 
 * @param {Object} valuationData - Enhanced valuation analysis data with comprehensive metrics
 * @private
 * @since 1.0.0
 */
function updateValuationCharts(valuationData) {
    console.log('[ui.js] Updating valuation charts and visualizations');
    console.log('[ui.js] Available data keys:', Object.keys(valuationData));
    
    // Try to find financial data in the new comprehensive structure
    const financialAnalysis = valuationData.comprehensiveFinancialAnalysis || 
                            valuationData.accurateInventoryValuation ||
                            valuationData.inventoryValuation ||
                            null;
    
    if (!financialAnalysis) {
        console.error('[ui.js] No financial analysis data available for charts');
        console.error('[ui.js] Available data structure:', valuationData);
        
        // Set error placeholders
        const investmentCircle = document.getElementById('investment-circle');
        const revenueCircle = document.getElementById('revenue-circle');
        const profitDifference = document.getElementById('profit-difference');
        
        if (investmentCircle) investmentCircle.textContent = 'Error';
        if (revenueCircle) revenueCircle.textContent = 'Error';
        if (profitDifference) profitDifference.textContent = 'Data Error - Check Console';
        
        return;
    }
    
    console.log('[ui.js] Using financial analysis for charts:', financialAnalysis);
    
    // Update investment vs revenue visualization circles
    const investmentCircle = document.getElementById('investment-circle');
    const revenueCircle = document.getElementById('revenue-circle');
    const profitDifference = document.getElementById('profit-difference');
    
    if (investmentCircle) {
        // Use current investment (stock on hand) for the investment circle
        const currentInvestment = financialAnalysis.currentInventoryInvestment || 
                                 financialAnalysis.totalInvestmentValue || 0;
        investmentCircle.textContent = formatCurrency(currentInvestment).replace(/[₹$]/g, '').trim();
        console.log('[ui.js] Investment circle set to:', formatCurrency(currentInvestment));
    }
    
    if (revenueCircle) {
        // Use revenue potential for the revenue circle
        const revenuePotential = financialAnalysis.totalRevenuePotential || 
                               financialAnalysis.totalRevenueValue || 
                               financialAnalysis.totalSellingValue || 0;
        revenueCircle.textContent = formatCurrency(revenuePotential).replace(/[₹$]/g, '').trim();
        console.log('[ui.js] Revenue circle set to:', formatCurrency(revenuePotential));
    }
    
    if (profitDifference) {
        // Calculate potential profit from current stock
        const currentInvestment = financialAnalysis.currentInventoryInvestment || 0;
        const revenuePotential = financialAnalysis.totalRevenuePotential || 0;
        const potentialProfit = revenuePotential - currentInvestment;
        
        profitDifference.textContent = `${formatCurrency(potentialProfit)} Potential Profit`;
        console.log('[ui.js] Profit difference set to:', formatCurrency(potentialProfit));
    }
    
    // Update category breakdown visualization using the new structure
    const categoryData = valuationData.categoryBreakdown || [];
    console.log('[ui.js] Category data for visualization:', categoryData);
    
    if (categoryData && categoryData.length > 0) {
        updateCategoryBreakdownVisualization(categoryData);
    } else {
        console.warn('[ui.js] No category breakdown data available for visualization');
        
        // Show placeholder in category list
        const categoryListElement = document.getElementById('category-breakdown-list');
        if (categoryListElement) {
            categoryListElement.innerHTML = '<div class="text-center text-gray-500 py-8">No category data available for visualization</div>';
        }
    }
    
    console.log('[ui.js] Charts and visualizations updated successfully');
}




/**
 * Updates category breakdown with visual bars and percentages.
 * 
 * @param {Array} categoryBreakdown - Category analysis data
 * @private
 * @since 1.0.0
 */
function updateCategoryBreakdownVisualization(categoryBreakdown) {
    const categoryListElement = document.getElementById('category-breakdown-list');
    if (!categoryListElement) {
        console.error('[ui.js] Category breakdown list element not found');
        return;
    }
    
    console.log('[ui.js] ===== CATEGORY BREAKDOWN VISUALIZATION DEBUG =====');
    console.log('categoryBreakdown type:', typeof categoryBreakdown);
    console.log('categoryBreakdown is array:', Array.isArray(categoryBreakdown));
    console.log('categoryBreakdown length:', categoryBreakdown?.length);
    
    if (categoryBreakdown && categoryBreakdown.length > 0) {
        console.log('First category structure:', categoryBreakdown[0]);
        console.log('First category keys:', Object.keys(categoryBreakdown[0]));
        console.log('Property values check:');
        console.log('  - totalInvestment:', categoryBreakdown[0].totalInvestment);
        console.log('  - totalCostValue:', categoryBreakdown[0].totalCostValue);
        console.log('  - formattedInvestment:', categoryBreakdown[0].formattedInvestment);
    }
    console.log('===== END CATEGORY DEBUG =====');
    
    if (!categoryBreakdown || !Array.isArray(categoryBreakdown) || categoryBreakdown.length === 0) {
        categoryListElement.innerHTML = '<div class="text-center text-gray-500 py-8">No category data available</div>';
        return;
    }
    
    // Find total value for percentage calculations - USE CORRECT PROPERTY
    const totalValue = categoryBreakdown.reduce((sum, cat) => {
        // Use the property that actually exists in the enhanced structure
        const categoryValue = cat.totalInvestment || cat.totalCostValue || 0;
        console.log(`[ui.js] Category ${cat.categoryName}: adding ${formatCurrency(categoryValue)} to total`);
        return sum + categoryValue;
    }, 0);
    
    console.log(`[ui.js] Total value for percentage calculation: ${formatCurrency(totalValue)}`);
    
    if (totalValue === 0) {
        categoryListElement.innerHTML = '<div class="text-center text-gray-500 py-8">No category investment data available</div>';
        return;
    }
    
    const categoryHTML = categoryBreakdown.map(category => {
        // Use the correct property name from enhanced structure
        const categoryValue = category.totalInvestment || category.totalCostValue || 0;
        const percentage = totalValue > 0 ? (categoryValue / totalValue) * 100 : 0;
        
        console.log(`[ui.js] Rendering category ${category.categoryName}:`);
        console.log(`  - Value: ${formatCurrency(categoryValue)}`);
        console.log(`  - Percentage: ${percentage.toFixed(1)}%`);
        console.log(`  - Formatted: ${category.formattedInvestment || 'Not available'}`);
        
        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div class="flex-1">
                    <div class="font-semibold text-gray-800">${category.categoryName || 'Unknown Category'}</div>
                    <div class="text-sm text-gray-600">${category.productCount || 0} products</div>
                </div>
                <div class="flex items-center space-x-3 flex-shrink-0">
                    <div class="text-right">
                        <div class="font-bold text-blue-600">${category.formattedInvestment || formatCurrency(categoryValue)}</div>
                        <div class="text-xs text-gray-500">${percentage.toFixed(1)}% of total</div>
                    </div>
                    <div class="w-16 bg-gray-200 rounded-full h-2">
                        <div class="bg-blue-500 h-2 rounded-full" style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    categoryListElement.innerHTML = categoryHTML;
    console.log(`[ui.js] Category breakdown visualization updated with ${categoryBreakdown.length} categories`);
}



/**
 * Updates category valuation table with safe error handling.
 * 
 * @param {Object} valuationData - Complete valuation analysis
 * @private
 * @since 1.0.0
 */
function updateCategoryValuationTable(valuationData) {
    const tableBody = document.getElementById('category-valuation-table');
    if (!tableBody) {
        console.warn('[ui.js] Category valuation table element not found');
        return;
    }
    
    try {
        console.log('[ui.js] ===== CATEGORY TABLE DEBUG =====');
        console.log('valuationData keys:', Object.keys(valuationData));
        console.log('categoryBreakdown:', valuationData?.categoryBreakdown);
        console.log('===== END CATEGORY TABLE DEBUG =====');
        
        const categoryBreakdown = valuationData?.categoryBreakdown;
        
        if (!categoryBreakdown || categoryBreakdown.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No category data available</td></tr>';
            return;
        }
        
        const tableHTML = categoryBreakdown.map(category => {
            // Use flexible property access for backward compatibility
            const investment = category.totalInvestment || category.totalCostValue || 0;
            const revenue = category.totalRevenuePotential || category.totalSellingValue || 0;
            const profit = revenue - investment;
            const profitClass = profit > 0 ? 'text-green-600' : profit < 0 ? 'text-red-600' : 'text-gray-600';
            const margin = category.categoryMargin || 0;
            
            console.log(`[ui.js] Table row for ${category.categoryName}: Investment=${formatCurrency(investment)}, Revenue=${formatCurrency(revenue)}`);
            
            return `
                <tr class="border-b border-gray-100 hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium">${category.categoryName || 'Unknown'}</td>
                    <td class="py-3 px-4 text-right">${category.productCount || 0}</td>
                    <td class="py-3 px-4 text-right font-medium">${category.totalStock || 0}</td>
                    <td class="py-3 px-4 text-right font-bold text-red-600">${category.formattedInvestment || formatCurrency(investment)}</td>
                    <td class="py-3 px-4 text-right font-bold text-green-600">${category.formattedRevenuePotential || formatCurrency(revenue)}</td>
                    <td class="py-3 px-4 text-right font-bold ${profitClass}">${formatCurrency(profit)}</td>
                    <td class="py-3 px-4 text-right font-semibold">${margin.toFixed(1)}%</td>
                </tr>
            `;
        }).join('');
        
        tableBody.innerHTML = tableHTML;
        console.log('[ui.js] Category table updated with', categoryBreakdown.length, 'categories');
        
    } catch (error) {
        console.error('[ui.js] Error updating category valuation table:', error);
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-red-500">Error loading category data</td></tr>';
    }
}


/**
 * Updates data quality and coverage information display with error handling.
 * 
 * @param {Object} valuationData - Valuation analysis with metadata
 * @private
 * @since 1.0.0
 */
function updateDataQualityDisplay(valuationData) {
    try {
        console.log('[ui.js] Updating data quality display');
        
        const summary = valuationData?.inventorySummary;
        const valuation = valuationData?.accurateInventoryValuation || valuationData?.inventoryValuation;
        const metadata = valuationData?.metadata;
        
        // Products with complete pricing (safe access)
        const withPricingElement = document.getElementById('products-with-pricing');
        if (withPricingElement) {
            const withPricingCount = summary?.productsWithCompleteData || summary?.productsWithCompletePricing || 0;
            withPricingElement.textContent = withPricingCount.toString();
        }
        
        const completenessElement = document.getElementById('pricing-completeness-percentage');
        if (completenessElement) {
            const totalProducts = summary?.totalProducts || 1;
            const completeData = summary?.productsWithCompleteData || summary?.productsWithCompletePricing || 0;
            const coverage = (completeData / totalProducts) * 100;
            completenessElement.textContent = `${coverage.toFixed(1)}% coverage`;
        }
        
        // Products missing pricing (safe access)
        const missingPricingElement = document.getElementById('products-missing-pricing');
        if (missingPricingElement) {
            const totalProducts = summary?.totalProducts || 0;
            const completeData = summary?.productsWithCompleteData || 0;
            const missingData = Math.max(0, totalProducts - completeData);
            missingPricingElement.textContent = missingData.toString();
        }
        
        // Firestore usage (safe access)
        const readsElement = document.getElementById('firestore-reads-used');
        if (readsElement) {
            const readsUsed = metadata?.firestoreReadsUsed || 0;
            readsElement.textContent = readsUsed.toString();
            
            // Color coding based on read usage
            if (readsUsed > 100) {
                readsElement.className = 'text-2xl font-bold text-red-700';
            } else if (readsUsed > 50) {
                readsElement.className = 'text-2xl font-bold text-yellow-700';
            } else {
                readsElement.className = 'text-2xl font-bold text-blue-700';
            }
        }
        
        console.log('[ui.js] Data quality display updated successfully');
        
    } catch (error) {
        console.error('[ui.js] Error updating data quality display:', error);
        
        // Set safe fallback values
        const elements = [
            { id: 'products-with-pricing', value: '0' },
            { id: 'pricing-completeness-percentage', value: '0% coverage' },
            { id: 'products-missing-pricing', value: 'Unknown' },
            { id: 'firestore-reads-used', value: '0' }
        ];
        
        elements.forEach(({ id, value }) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }
}


/**
 * Shows/hides loading state on valuation summary cards.
 * 
 * @param {boolean} isLoading - Whether to show loading state
 * @private
 * @since 1.0.0
 */
function updateValuationSummaryCardsLoading(isLoading) {
    const elements = [
        'total-cost-value-display',
        'total-selling-value-display',
        'potential-profit-display',
        'roi-percentage-display'
    ];
    
    elements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = isLoading ? 'Loading...' : element.textContent;
        }
    });
}












/**
 * Generic Progress Toast System - Reusable across all operations
 */
export class ProgressToast {
    
    static THEMES = {
        success: {
            borderColor: 'border-green-500',
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            progressColor: 'bg-green-500'
        },
        info: {
            borderColor: 'border-blue-500',
            iconBg: 'bg-blue-100', 
            iconColor: 'text-blue-600',
            progressColor: 'bg-blue-500'
        },
        warning: {
            borderColor: 'border-yellow-500',
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-600', 
            progressColor: 'bg-yellow-500'
        },
        error: {
            borderColor: 'border-red-500',
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            progressColor: 'bg-red-500'
        }
    };

    static ICONS = {
        loading: `<svg class="animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>`,
        
        success: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>`,
        
        error: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>`,
        
        warning: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>`,
        
        save: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
        </svg>`
    };

    /**
     * Shows the progress toast with theme
     * @param {string} title - Toast title
     * @param {string} theme - Theme: 'success', 'info', 'warning', 'error'  
     */
    static show(title, theme = 'info') {
        const toast = document.getElementById('progress-toast');
        const container = document.getElementById('toast-container');
        const iconContainer = document.getElementById('toast-icon-container');
        const backdrop = document.getElementById('toast-backdrop');
        const titleElement = document.getElementById('toast-title');
        
        if (!toast || !container) {
            console.error('[Toast] Toast elements not found');
            return;
        }

        console.log(`[Toast] Showing ${theme} toast: ${title}`);

        // Show backdrop
        if (backdrop) {
            backdrop.classList.remove('hidden');
            setTimeout(() => {
                backdrop.style.opacity = '1';
            }, 50);
        }

        // Apply theme
        this.applyTheme(theme);
        
        // Set title
        if (titleElement) titleElement.textContent = title;
        
        // Reset content
        this.reset();

        // Show and animate in
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        }, 50);
    }

    /**
     * Updates progress with message and percentage
     * @param {string} message - Progress message
     * @param {number} percentage - Progress 0-100
     * @param {string} stepInfo - Optional step information
     */
    static updateProgress(message, percentage = 0, stepInfo = '') {
        const messageElement = document.getElementById('toast-message');
        const progressElement = document.getElementById('toast-progress');
        const percentageElement = document.getElementById('toast-percentage');
        const stepElement = document.getElementById('toast-step');
        const iconElement = document.getElementById('toast-icon');
        
        // Update content
        if (messageElement) messageElement.textContent = message;
        if (percentageElement) percentageElement.textContent = Math.round(percentage);
        if (stepElement) stepElement.textContent = stepInfo || `${Math.round(percentage)}% complete`;
        
        // Update progress bar
        if (progressElement) {
            progressElement.style.width = `${Math.min(percentage, 100)}%`;
        }
        
        // Update icon based on progress
        if (iconElement) {
            if (percentage >= 100) {
                iconElement.innerHTML = this.ICONS.success;
            } else {
                iconElement.innerHTML = this.ICONS.loading;
            }
        }
        
        console.log(`[Toast] Progress: ${percentage}% - ${message}`);
    }

    /**
     * Shows error state
     * @param {string} errorMessage - Error message to display
     * @param {boolean} autoHide - Whether to auto-hide the toast
     */
    static showError(errorMessage, autoHide = true) {
        this.applyTheme('error');
        
        const titleElement = document.getElementById('toast-title');
        const messageElement = document.getElementById('toast-message');
        const progressElement = document.getElementById('toast-progress');
        const iconElement = document.getElementById('toast-icon');
        const closeBtn = document.getElementById('toast-close-btn');
        
        if (titleElement) titleElement.textContent = 'Operation Failed';
        if (messageElement) messageElement.textContent = errorMessage;
        if (iconElement) iconElement.innerHTML = this.ICONS.error;
        
        // Full red progress bar
        if (progressElement) {
            progressElement.style.width = '100%';
        }
        
        // Show close button
        if (closeBtn) {
            closeBtn.classList.remove('hidden');
            closeBtn.onclick = () => this.hide(0);
        }
        
        if (autoHide) {
            this.hide(5000); // Auto-hide after 5 seconds
        }
    }

    /**
     * Shows success completion state
     * @param {string} successMessage - Success message
     */
    static showSuccess(successMessage) {
        this.applyTheme('success');
        this.updateProgress(successMessage, 100, 'Completed successfully');
        
        const iconElement = document.getElementById('toast-icon');
        if (iconElement) {
            iconElement.innerHTML = this.ICONS.success;
        }
    }

    
    /**
     * Hides the toast with animation
     * @param {number} delay - Delay before hiding (ms)
     */
    static hide(delay = 1500) {
        const toast = document.getElementById('progress-toast');
        const backdrop = document.getElementById('toast-backdrop');
        if (!toast) return;

        setTimeout(() => {
            console.log('[Toast] Hiding progress toast');
            
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';

            // Hide backdrop
            if (backdrop) {
                backdrop.style.opacity = '0';
            }
            
            setTimeout(() => {
                toast.classList.add('hidden');
                if (backdrop) backdrop.classList.add('hidden');
                this.reset(); // Reset for next use
            }, 300);
        }, delay);
    }

    /**
     * Applies visual theme to toast
     * @param {string} theme - Theme name
     */
    static applyTheme(theme) {
        const container = document.getElementById('toast-container');
        const iconContainer = document.getElementById('toast-icon-container');
        const progressBar = document.getElementById('toast-progress');
        
        if (!container || !iconContainer || !progressBar) return;

        const themeConfig = this.THEMES[theme] || this.THEMES.info;
        
        // Reset all theme classes
        const allBorderClasses = Object.values(this.THEMES).map(t => t.borderColor);
        const allIconBgClasses = Object.values(this.THEMES).map(t => t.iconBg);  
        const allIconColorClasses = Object.values(this.THEMES).map(t => t.iconColor);
        const allProgressClasses = Object.values(this.THEMES).map(t => t.progressColor);
        
        container.classList.remove(...allBorderClasses);
        iconContainer.classList.remove(...allIconBgClasses, ...allIconColorClasses);
        progressBar.classList.remove(...allProgressClasses);
        
        // Apply new theme
        container.classList.add(themeConfig.borderColor);
        iconContainer.classList.add(themeConfig.iconBg, themeConfig.iconColor);
        progressBar.classList.add(themeConfig.progressColor);
    }

    /**
     * Resets toast to initial state
     */
    static reset() {
        const elements = {
            title: document.getElementById('toast-title'),
            message: document.getElementById('toast-message'),
            progress: document.getElementById('toast-progress'),
            percentage: document.getElementById('toast-percentage'),
            step: document.getElementById('toast-step'),
            icon: document.getElementById('toast-icon'),
            closeBtn: document.getElementById('toast-close-btn')
        };
        
        if (elements.progress) elements.progress.style.width = '0%';
        if (elements.percentage) elements.percentage.textContent = '0';
        if (elements.step) elements.step.textContent = 'Initializing...';
        if (elements.icon) elements.icon.innerHTML = this.ICONS.loading;
        if (elements.closeBtn) elements.closeBtn.classList.add('hidden');
    }
}


/**
 * UI FUNCTION: Show financial health breakdown modal with detailed analysis
 */
window.showFinancialHealthBreakdownModal = async function() {
    console.log('[ui.js] 💊 Opening financial health breakdown modal...');
    
    const modal = document.getElementById('financial-health-modal');
    if (!modal) {
        console.error('[ui.js] Financial health modal not found');
        return;
    }
    
    try {
        // Show modal immediately
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('visible'), 10);
        
        // ✅ GET: Detailed revenue analysis
        const periodSelector = document.getElementById('executive-dashboard-period');
        const daysBack = parseInt(periodSelector?.value || '30');
        
        // Load true revenue analysis
        const businessSummary = await generateBusinessSummaryOptimized(daysBack, { detailedAnalysis: true });
        const trueRevenueAnalysis = await calculateTrueBusinessRevenue(businessSummary);
        
        // ✅ UPDATE: Modal with detailed breakdown
        updateFinancialHealthModalContent(trueRevenueAnalysis, businessSummary);
        
    } catch (error) {
        console.error('[ui.js] Error loading financial health breakdown:', error);
        
        // Show error in modal
        document.getElementById('modal-health-factors').innerHTML = `
            <div class="text-red-600 text-center py-4">
                <p class="font-semibold">Error loading financial analysis</p>
                <p class="text-sm">${error.message}</p>
            </div>
        `;
    }
};


/**
 * UI FUNCTION: Update financial health modal content with detailed breakdown
 */
function updateFinancialHealthModalContent(trueRevenueAnalysis, businessSummary) {

    console.log('[ui.js] 💊 Updating financial health modal content...');
    console.log('[ui.js] 🔍 MODAL DEBUG - Full businessSummary structure:');
    console.log('  businessSummary keys:', Object.keys(businessSummary));
    console.log('  businessSummary.executiveIntelligence:', businessSummary.executiveIntelligence);
    
    if (businessSummary.executiveIntelligence) {
        console.log('  executiveIntelligence keys:', Object.keys(businessSummary.executiveIntelligence));
        console.log('  financialHealthScore:', businessSummary.executiveIntelligence.financialHealthScore);
    }
    
    // ===================================================================
    // EXECUTIVE SUMMARY SECTION
    // ===================================================================
    
    // Health score
    const healthScoreElement = document.getElementById('modal-health-score');

    
    if (healthScoreElement) {
        const financialHealth = businessSummary.executiveIntelligence?.financialHealthScore || { score: 0, status: 'Unknown' };
        console.log('[ui.js] 🔍 Modal health score data:', financialHealth);
        console.log('[ui.js] 🔍 Setting modal score to:', `${financialHealth.score}/100`);
        
        healthScoreElement.textContent = `${financialHealth.score}/100`;
    }
    
    // Actual revenue
    const actualRevenueElement = document.getElementById('modal-actual-revenue');
    if (actualRevenueElement) {
        actualRevenueElement.textContent = trueRevenueAnalysis.formattedTrueTotalRevenue;
    }
    
    // Revenue efficiency
    const revenueEfficiencyElement = document.getElementById('modal-revenue-efficiency');
    if (revenueEfficiencyElement) {
        revenueEfficiencyElement.textContent = trueRevenueAnalysis.revenueEfficiency.toFixed(1) + '%';
    }
    
    // ===================================================================
    // DIRECT SALES BREAKDOWN
    // ===================================================================
    
    const directBreakdown = trueRevenueAnalysis.breakdown.directSales;
    
    document.getElementById('modal-church-cash').textContent = directBreakdown.churchStore.formatted;
    document.getElementById('modal-tasty-cash').textContent = directBreakdown.tastyTreats.formatted;
    document.getElementById('modal-direct-total').textContent = directBreakdown.total.formatted;
    
    // ===================================================================
    // CONSIGNMENT BREAKDOWN
    // ===================================================================
    
    const consignmentBreakdown = trueRevenueAnalysis.breakdown.consignment;
    
    document.getElementById('modal-consignment-theoretical').textContent = consignmentBreakdown.theoretical.formatted;
    document.getElementById('modal-consignment-actual').textContent = consignmentBreakdown.actualCash.formatted;
    document.getElementById('modal-consignment-losses').textContent = consignmentBreakdown.losses.formatted;
    document.getElementById('modal-consignment-efficiency').textContent = consignmentBreakdown.efficiency;
    
    // ===================================================================
    // DONATION ANALYSIS
    // ===================================================================
    
    const donationBreakdown = trueRevenueAnalysis.breakdown.donations;
    
    document.getElementById('modal-total-donations').textContent = donationBreakdown.total.formatted;
    document.getElementById('modal-donation-percentage').textContent = donationBreakdown.percentage;
    
    // Donation sources count (approximate)
    const donationSources = ['Store Overpayments', 'Team Donations', 'Direct Contributions'].length;
    document.getElementById('modal-donation-sources').textContent = donationSources.toString();
    
    // ===================================================================
    // FINANCIAL HEALTH FACTORS
    // ===================================================================
    
    const healthFactorsElement = document.getElementById('modal-health-factors');
    if (healthFactorsElement) {
        let financialHealth = null;

        if (businessSummary.executiveIntelligence?.financialHealthScore) {
            financialHealth = businessSummary.executiveIntelligence.financialHealthScore;
            console.log('[ui.js] ✅ Found financial health in executiveIntelligence:', financialHealth);
        }
        // ✅ TRY: Alternative path
        else if (businessSummary.financialHealthScore) {
            financialHealth = businessSummary.financialHealthScore;
            console.log('[ui.js] ✅ Found financial health in root:', financialHealth);
        }
        // ✅ TRY: Direct calculation if not found
        else {
            console.log('[ui.js] ⚠️ Financial health not found in data, calculating directly...');
            
            try {
                // ✅ FALLBACK: Calculate directly for modal
                financialHealth = calculateFinancialHealthScore(businessSummary);
                console.log('[ui.js] ✅ Calculated financial health directly:', financialHealth);
            } catch (calcError) {
                console.error('[ui.js] ❌ Direct calculation failed:', calcError);
                financialHealth = { score: 0, status: 'Error' };
            }
        }

        // ✅ UPDATE: Modal with found/calculated data
        if (financialHealth) {
            console.log('[ui.js] ✅ Setting modal health score to:', `${financialHealth.score}/100`);
            healthScoreElement.textContent = `${financialHealth.score}/100`;
            
            // Color coding based on score
            const scoreColorClasses = {
                'Excellent': 'text-green-700',
                'Good': 'text-blue-700',
                'Fair': 'text-yellow-700',
                'Poor': 'text-orange-700',
                'Critical': 'text-red-700'
            };
            
            healthScoreElement.className = `text-2xl font-bold ${scoreColorClasses[financialHealth.status] || 'text-gray-700'}`;
        } else {
            console.error('[ui.js] ❌ Could not get financial health data for modal');
            healthScoreElement.textContent = 'Error/100';
            healthScoreElement.className = 'text-2xl font-bold text-red-700';
        }


        const outstandingRatio = trueRevenueAnalysis.breakdown.consignment.losses.amount > 0 ? 
            ((businessSummary.executiveSummary.totalOutstanding / trueRevenueAnalysis.trueTotalRevenue) * 100).toFixed(1) : 0;
        
        const factors = [
            {
                factor: 'Revenue Scale',
                value: trueRevenueAnalysis.trueTotalRevenue > 50000 ? 'Strong' : 
                       trueRevenueAnalysis.trueTotalRevenue > 20000 ? 'Good' : 'Developing',
                impact: trueRevenueAnalysis.trueTotalRevenue > 50000 ? 'positive' : 
                       trueRevenueAnalysis.trueTotalRevenue > 20000 ? 'neutral' : 'negative'
            },
            {
                factor: 'Outstanding Balances',
                value: `${outstandingRatio}% of revenue`,
                impact: outstandingRatio < 10 ? 'positive' : outstandingRatio < 20 ? 'neutral' : 'negative'
            },
            {
                factor: 'Channel Diversification', 
                value: Math.abs(businessSummary.executiveSummary.channelMix.directPercentage - 50) < 30 ? 'Balanced' : 'Concentrated',
                impact: Math.abs(businessSummary.executiveSummary.channelMix.directPercentage - 50) < 30 ? 'positive' : 'neutral'
            },
            {
                factor: 'Consignment Efficiency',
                value: trueRevenueAnalysis.revenueEfficiency.toFixed(1) + '%',
                impact: trueRevenueAnalysis.revenueEfficiency > 80 ? 'positive' : 
                       trueRevenueAnalysis.revenueEfficiency > 60 ? 'neutral' : 'negative'
            },
            {
                factor: 'Donation Generation',
                value: donationBreakdown.percentage,
                impact: parseFloat(donationBreakdown.percentage) > 5 ? 'positive' : 'neutral'
            }
        ];
        
        const factorsHTML = factors.map(factor => {
            const impactColors = {
                'positive': 'text-green-600 bg-green-50',
                'neutral': 'text-blue-600 bg-blue-50', 
                'negative': 'text-red-600 bg-red-50'
            };
            
            const impactIcons = {
                'positive': '✅',
                'neutral': '➖',
                'negative': '⚠️'
            };
            
            return `
                <div class="flex justify-between items-center p-2 rounded ${impactColors[factor.impact]}">
                    <span class="flex items-center space-x-2">
                        <span>${impactIcons[factor.impact]}</span>
                        <span class="font-medium">${factor.factor}</span>
                    </span>
                    <span class="font-semibold">${factor.value}</span>
                </div>
            `;
        }).join('');
        
        healthFactorsElement.innerHTML = factorsHTML;
    }
    
    // ===================================================================
    // ANALYSIS PERIOD
    // ===================================================================
    
    const analysisPeriodElement = document.getElementById('modal-analysis-period');
    if (analysisPeriodElement) {
        analysisPeriodElement.textContent = businessSummary.executiveSummary.reportPeriod || 'Unknown period';
    }
    
    console.log('[ui.js] ✅ Financial health modal content updated with true revenue analysis');
}



/**
 * APPLICATION LANDING DASHBOARD: Role-based transactional landing page
 * 
 * This is the main application landing page that users see when they log in.
 * Shows today's key metrics, pending actions, and role-appropriate quick actions.
 * Different from Executive Dashboard - this is operational/transactional focused.
 * 
 * @returns {Promise<void>}
 */
export async function loadApplicationDashboard(forceRefresh = false)  {
    console.log('[ui.js] 🏠 Loading application landing dashboard...');
    
    const currentUser = appState.currentUser;
    if (!currentUser) {
        console.log('[ui.js] No user logged in - showing login prompt');
        return;
    }
    
    try {

        if (forceRefresh) {
            console.log('[ui.js] 🗑️ Force refresh - clearing dashboard cache...');
            clearDashboardCache();
        }


        // Show loading state for all cards
        showApplicationDashboardLoading();
        
        // ✅ ROLE-BASED: Load different dashboard content based on user role
        console.log(`[ui.js] Loading dashboard for role: ${currentUser.role}`);
        
        // Update welcome message
        document.getElementById('dashboard-welcome-title').textContent = `Welcome, ${currentUser.displayName}`;
        
        if (currentUser.role === 'admin' || currentUser.role === 'finance') {
            await loadAdminLandingDashboard(currentUser);
        } else if (currentUser.role === 'team_lead') {
            await loadTeamLeadLandingDashboard(currentUser);
        } else if (currentUser.role === 'sales_staff') {
            await loadSalesStaffLandingDashboard(currentUser);
        } else if (currentUser.role === 'inventory_manager') {
            await loadInventoryManagerLandingDashboard(currentUser);
        } else {
            await loadLimitedAccessDashboard(currentUser);
        }
        
        // Update refresh timestamp
        document.getElementById('dashboard-last-refresh').textContent = new Date().toLocaleTimeString();
        
        console.log(`[ui.js] ✅ Application landing dashboard loaded for ${currentUser.role}`);
        
    } catch (error) {
        console.error('[ui.js] Error loading application dashboard:', error);
        showApplicationDashboardError(error);
    }
}

/**
 * ADMIN LANDING DASHBOARD: Complete system metrics and financial overview
 */

async function loadAdminLandingDashboard(user, forceRefresh = false) {
    console.log('[ui.js] 👑 Loading admin landing dashboard with expanded metrics...');
    
    document.getElementById('dashboard-welcome-subtitle').textContent = 'Administrator Dashboard - System Operations Overview';
    
    try {
        // ===================================================================
        // ✅ SINGLE CALL: Get outstanding metrics once with proper cache handling
        // ===================================================================
        const outstandingMetrics = await getOutstandingBalancesForDashboard(forceRefresh);

        // ===================================================================
        // ROW 1: CORE DAILY METRICS
        // ===================================================================
        
        // Today's sales
        const todayMetrics = await getDailyDashboardOptimized();
        document.getElementById('dashboard-today-sales').textContent = todayMetrics.todayRevenue;
        document.getElementById('dashboard-today-transactions').textContent = `${todayMetrics.todayTransactions} transactions`;
        
        // This week's sales
        const weekMetrics = await generateBusinessSummaryOptimized(7, { useCache: true });
        document.getElementById('dashboard-week-sales').textContent = formatCurrency(weekMetrics.executiveSummary.totalBusinessRevenue);
        document.getElementById('dashboard-week-details').textContent = 'All channels combined';
        
        // Pending actions
        const pendingActions = await getAdminPendingActions();
        document.getElementById('dashboard-pending-actions').textContent = pendingActions.total.toString();
        document.getElementById('dashboard-actions-details').textContent = pendingActions.description;
        
        // Low stock alert
        const inventoryAlerts = getEnhancedInventoryAlerts();
        document.getElementById('dashboard-low-stock').textContent = inventoryAlerts.lowStockCount.toString();
        document.getElementById('dashboard-low-stock-details').textContent = inventoryAlerts.description;
        
        // Active teams
        const teamsActive = masterData.teams.filter(team => team.isActive).length;
        document.getElementById('dashboard-active-teams').textContent = teamsActive.toString();
        document.getElementById('dashboard-teams-details').textContent = `${teamsActive} teams participating`;
        
        // Total products
        const activeProducts = masterData.products.filter(p => p.isActive);
        const totalProducts = activeProducts.length;
        const productsInStock = activeProducts.filter(p => (p.inventoryCount || 0) > 0).length;
        
        document.getElementById('dashboard-total-products').textContent = totalProducts.toString();
        document.getElementById('dashboard-products-details').textContent = `${productsInStock} in stock, ${totalProducts - productsInStock} out of stock`;
        
        // System health
        const systemHealth = calculateSystemHealth(todayMetrics, pendingActions, inventoryAlerts);
        document.getElementById('dashboard-performance-value').textContent = systemHealth.rating;
        document.getElementById('dashboard-performance-details').textContent = systemHealth.description;

        // ===================================================================
        // ROW 2: FINANCIAL METRICS (Using the single outstandingMetrics call)
        // ===================================================================
        
        // Show financial section for admin
        const financialSection = document.getElementById('dashboard-financial-section');
        if (financialSection) {
            financialSection.style.display = 'grid';
        }
        
        // ✅ CUSTOMER RECEIVABLES: Complete three-channel breakdown
        document.getElementById('dashboard-customer-receivables').textContent = outstandingMetrics.formattedTotalReceivables;
        
        // ✅ ENHANCED DETAILS: Show breakdown by channel
        const receivablesDetails = document.getElementById('dashboard-receivables-details');
        if (receivablesDetails) {
            const breakdown = outstandingMetrics.receivablesBreakdown;
            receivablesDetails.innerHTML = `
                <div class="text-xs space-y-1">
                    <div>🏛️ Church: ${breakdown.churchStore.formatted}</div>
                    <div>🍰 Tasty: ${breakdown.tastyTreats.formatted}</div>
                    <div>👥 Teams: ${breakdown.consignment.formatted}</div>
                </div>
            `;
        }
        
        // Supplier payables  
        document.getElementById('dashboard-supplier-payables').textContent = outstandingMetrics.formattedTotalPayables;
        document.getElementById('dashboard-payables-details').textContent = `${outstandingMetrics.payablesCount} supplier invoices`;
        
        // Net cash position
        const netPosition = outstandingMetrics.totalReceivables - outstandingMetrics.totalPayables;
        document.getElementById('dashboard-net-position').textContent = formatCurrency(netPosition);
        document.getElementById('dashboard-net-details').textContent = netPosition >= 0 ? 'Positive position' : 'Monitor cash flow';
        
        // Color coding for net position
        const netPositionCard = document.getElementById('dashboard-net-position');
        if (netPosition > 10000) {
            netPositionCard.className = 'text-2xl font-bold text-green-900';
        } else if (netPosition >= 0) {
            netPositionCard.className = 'text-2xl font-bold text-teal-900';
        } else if (netPosition > -10000) {
            netPositionCard.className = 'text-2xl font-bold text-yellow-900';
        } else {
            netPositionCard.className = 'text-2xl font-bold text-red-900';
        }
        
        // Inventory value
        const inventoryValue = calculateCurrentInventoryValue();
        document.getElementById('dashboard-inventory-value').textContent = formatCurrency(inventoryValue.totalValue);
        document.getElementById('dashboard-inventory-details').textContent = `${inventoryValue.productCount} products valued`;

        console.log('[ui.js] ✅ Admin dashboard with complete financial overview:', {
            todaySales: todayMetrics.todayRevenue,
            weekSales: formatCurrency(weekMetrics.executiveSummary.totalBusinessRevenue),
            pendingActions: pendingActions.total,
            totalProducts: totalProducts,
            totalReceivables: outstandingMetrics.formattedTotalReceivables,
            totalPayables: outstandingMetrics.formattedTotalPayables,
            netPosition: formatCurrency(netPosition),
            inventoryValue: formatCurrency(inventoryValue.totalValue),
            cacheStatus: outstandingMetrics.metadata?.dataAccuracy || 'Unknown'
        });
        
        // ===================================================================
        // ADMIN ACTIVITY & ALERTS  
        // ===================================================================
        
        await updateRecentActivity('admin', user);
        await updateSystemAlerts('admin', user, { pendingActions, inventoryAlerts, systemHealth, outstandingMetrics });
        
    } catch (error) {
        console.error('[ui.js] Error loading admin landing dashboard:', error);
        throw error;
    }
}


// ===================================================================
// ENHANCED HELPER FUNCTIONS  
// ===================================================================

/**
 * HELPER: Enhanced inventory alerts with more intelligence
 */
function getEnhancedInventoryAlerts() {
    const lowThreshold = 10;
    const criticalThreshold = 0;
    
    const activeProducts = masterData.products.filter(p => p.isActive);
    const criticalStock = activeProducts.filter(p => (p.inventoryCount || 0) === criticalThreshold);
    const lowStock = activeProducts.filter(p => {
        const count = p.inventoryCount || 0;
        return count > criticalThreshold && count <= lowThreshold;
    });
    
    const totalAlert = criticalStock.length + lowStock.length;
    
    return {
        lowStockCount: totalAlert,
        criticalCount: criticalStock.length,
        lowCount: lowStock.length,
        healthRating: criticalStock.length > 0 ? 'Critical' : 
                     totalAlert > 15 ? 'Poor' : 
                     totalAlert > 5 ? 'Fair' : 'Good',
        description: totalAlert > 0 ? 
            `${totalAlert} product${totalAlert > 1 ? 's' : ''} need attention` :
            'All inventory levels healthy'
    };
}

/**
 * HELPER: Get outstanding balances for dashboard (simplified version)
 */

async function getOutstandingBalancesForDashboard(forceRefresh = false) {
    const cacheKey = 'complete_outstanding_balances';
    
    // ✅ CACHE CHECK: 10-minute cache for financial data
    if (!forceRefresh) {
        const cached = getCachedDashboardData(cacheKey);
        if (cached) {
            console.log('[ui.js] ✅ Using cached outstanding balances - 0 Firestore reads');
            
            // Update cache indicators with cached data
            updateDashboardCacheIndicators(cached);
            
            return cached.data;
        }
    }
    
    try {
        console.log('[ui.js] 💰 Loading COMPLETE outstanding balances (NO LIMITS)...');
        
        const startTime = Date.now();
        const db = firebase.firestore();
        
        // ===================================================================
        // ✅ CRITICAL: NO LIMITS - Get ALL outstanding records for accuracy
        // ===================================================================
        
        const [directSalesInvoices, consignmentOrders, supplierInvoices] = await Promise.all([
            // ✅ ALL direct sales outstanding (Church Store + Tasty Treats)
            db.collection(SALES_COLLECTION_PATH)
                .where('paymentStatus', 'in', ['Unpaid', 'Partially Paid'])
                .get(), // ✅ NO LIMIT: Complete accuracy required
                
            // ✅ ALL consignment team settlements outstanding
            db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH)
                .where('status', '==', 'Active')
                .where('balanceDue', '>', 0)
                .get(), // ✅ NO LIMIT: Complete accuracy required
                
            // ✅ ALL supplier payables outstanding
            db.collection(PURCHASE_INVOICES_COLLECTION_PATH)
                .where('paymentStatus', 'in', ['Unpaid', 'Partially Paid'])
                .get()  // ✅ NO LIMIT: Complete accuracy required
        ]);
        
        const executionTime = Date.now() - startTime;
        const totalReads = directSalesInvoices.size + consignmentOrders.size + supplierInvoices.size;
        
        console.log(`[ui.js] 📊 COMPLETE FINANCIAL DATA RETRIEVED (${executionTime}ms):`);
        console.log(`  📋 Direct Sales Outstanding: ${directSalesInvoices.size} invoices`);
        console.log(`  👥 Consignment Outstanding: ${consignmentOrders.size} orders`);
        console.log(`  📤 Supplier Outstanding: ${supplierInvoices.size} invoices`);
        console.log(`  🔥 Total Firestore Reads: ${totalReads} (complete dataset)`);
        
        // ===================================================================
        // ACCURATE CALCULATIONS (All data included)
        // ===================================================================
        
        // Direct sales breakdown by store
        let churchStoreReceivables = 0;
        let tastyTreatsReceivables = 0;
        let churchStoreCount = 0;
        let tastyTreatsCount = 0;
        
        directSalesInvoices.docs.forEach(doc => {
            const invoice = doc.data();
            const balanceDue = invoice.balanceDue || 0;
            const store = invoice.store || 'Unknown Store';
            
            if (store === 'Church Store') {
                churchStoreReceivables += balanceDue;
                churchStoreCount++;
            } else if (store === 'Tasty Treats') {
                tastyTreatsReceivables += balanceDue;
                tastyTreatsCount++;
            }
        });
        
        // Consignment receivables with team analysis
        let consignmentReceivables = 0;
        const uniqueTeams = new Set();
        
        consignmentOrders.docs.forEach(doc => {
            const order = doc.data();
            const balanceDue = order.balanceDue || 0;
            const teamName = order.teamName || 'Unknown Team';
            
            consignmentReceivables += balanceDue;
            uniqueTeams.add(teamName);
        });
        
        // ===================================================================
        // ✅ ENHANCED SUPPLIER PAYABLES CALCULATION
        // ===================================================================
        const processedPayables = supplierInvoices.docs.map(doc => {
            const data = doc.data();
            const daysOutstanding = calculateDaysOutstandingSupplierInvoice(data.purchaseDate);
            return {
                balanceDue: data.balanceDue || 0,
                isOverdue: daysOutstanding > 30,
                isCritical: daysOutstanding > 45 || (data.balanceDue || 0) > 15000
            };
        });

        const totalPayables = processedPayables.reduce((sum, inv) => sum + inv.balanceDue, 0);
        const overdueCount = processedPayables.filter(inv => inv.isOverdue).length;
        const overdueAmount = processedPayables.filter(inv => inv.isOverdue).reduce((sum, inv) => sum + inv.balanceDue, 0);
        const criticalCount = processedPayables.filter(inv => inv.isCritical).length;
        // ===================================================================

        
        // Calculate totals
        const totalReceivables = churchStoreReceivables + tastyTreatsReceivables + consignmentReceivables;
        const netPosition = totalReceivables - totalPayables;
        
        const completeResult = {
            // ✅ ACCURATE TOTALS
            totalReceivables,
            formattedTotalReceivables: formatCurrency(totalReceivables),
            totalPayables,
            formattedTotalPayables: formatCurrency(totalPayables),
            netPosition,
            formattedNetPosition: formatCurrency(netPosition),

            payablesCount: supplierInvoices.size,

            // ✅ NEW: Structured supplierPayables object
            supplierPayables: {
                invoiceCount: supplierInvoices.size,
                totalOutstanding: totalPayables,
                overdueCount: overdueCount,
                overdueAmount: overdueAmount,
                criticalCount: criticalCount
            },
            
            // ✅ COMPLETE BREAKDOWN
            receivablesBreakdown: {
                churchStore: {
                    amount: churchStoreReceivables,
                    formatted: formatCurrency(churchStoreReceivables),
                    percentage: totalReceivables > 0 ? (churchStoreReceivables / totalReceivables * 100).toFixed(1) + '%' : '0%',
                    invoiceCount: churchStoreCount
                },
                tastyTreats: {
                    amount: tastyTreatsReceivables,
                    formatted: formatCurrency(tastyTreatsReceivables),
                    percentage: totalReceivables > 0 ? (tastyTreatsReceivables / totalReceivables * 100).toFixed(1) + '%' : '0%',
                    invoiceCount: tastyTreatsCount
                },
                consignment: {
                    amount: consignmentReceivables,
                    formatted: formatCurrency(consignmentReceivables),
                    percentage: totalReceivables > 0 ? (consignmentReceivables / totalReceivables * 100).toFixed(1) + '%' : '0%',
                    orderCount: consignmentOrders.size,
                    teamCount: uniqueTeams.size
                }
            },
            
            // ✅ METADATA: Complete transparency
            metadata: {
                calculatedAt: new Date().toISOString(),
                loadedAt: new Date().toLocaleTimeString(),
                executionTimeMs: executionTime,
                totalFirestoreReads: totalReads,
                dataAccuracy: '100% - Complete dataset (no limits)',
                cacheKey: cacheKey,
                cacheDurationMinutes: DASHBOARD_CACHE_CONFIG.CACHE_DURATION_MINUTES
            }
        };
        
        // ✅ CACHE: Store complete result for 10 minutes
        setCachedDashboardData(cacheKey, completeResult);
        
        // Update cache indicators with fresh data
        updateDashboardCacheIndicators({
            timestamp: Date.now(),
            ageMinutes: 0,
            data: completeResult
        });
        
        return completeResult;
        
    } catch (error) {
        console.error('[ui.js] Error calculating complete outstanding balances:', error);
        throw error;
    }
}


/**
 * HELPER: Calculates days outstanding for a supplier invoice purchase date.
 * Safely handles Firestore Timestamps, JS Dates, and strings.
 * @param {firebase.firestore.Timestamp | Date | string} purchaseDate - The date of the purchase.
 * @returns {number} The number of days outstanding.
 */
function calculateDaysOutstandingSupplierInvoice(purchaseDate) {
    if (!purchaseDate) return 0;

    try {
        // Safely convert Firestore Timestamp or string to a JS Date object
        const invoiceDate = purchaseDate.toDate ? purchaseDate.toDate() : new Date(purchaseDate);
        
        // Ensure the date is valid before proceeding
        if (isNaN(invoiceDate.getTime())) {
            console.warn("Invalid date provided to calculateDaysOutstandingSupplierInvoice:", purchaseDate);
            return 0;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today to the start of the day for accurate comparison

        const diffTime = today - invoiceDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return Math.max(0, diffDays); // Return 0 if the date is in the future
    } catch (error) {
        console.error("Error in calculateDaysOutstandingSupplierInvoice:", error);
        return 0; // Return 0 on any error
    }
}


/**
 * ENHANCED: Update dashboard cache indicators with visual status
 */

function updateDashboardCacheIndicators(cacheInfo) {
    console.log('[ui.js] 🎨 Updating dashboard cache indicators...');
    
    if (!DASHBOARD_CACHE_CONFIG.VISUAL_INDICATORS) return;
    
    const ageMinutes = cacheInfo.ageMinutes || 0;
    const loadedTime = cacheInfo.data?.metadata?.loadedAt || new Date().toLocaleTimeString();
    const cacheDuration = DASHBOARD_CACHE_CONFIG.CACHE_DURATION_MINUTES;
    
    // ===================================================================
    // ADD CACHE INDICATOR TO WELCOME HEADER
    // ===================================================================
    
    const welcomeHeader = document.querySelector('#dashboard-view .bg-white.rounded-lg.shadow-lg.p-6.mb-8');
    if (welcomeHeader) {
        // Remove existing indicator
        const existingIndicator = welcomeHeader.querySelector('.cache-status-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'cache-status-indicator mt-4 p-3 rounded-lg border text-sm';
        
        // ✅ VISUAL STATUS: Determine cache health and styling
        let statusClass, statusIcon, statusText, countdownClass;
        
        if (ageMinutes === 0) {
            // Fresh data
            statusClass = 'bg-green-50 border-green-200 text-green-800';
            statusIcon = '✅';
            statusText = 'Fresh Data';
            countdownClass = 'text-green-600';
        } else if (ageMinutes < cacheDuration * 0.5) {
            // Good cache (less than 50% of duration)
            statusClass = 'bg-blue-50 border-blue-200 text-blue-800';
            statusIcon = '🔵';
            statusText = 'Good Cache';
            countdownClass = 'text-blue-600';
        } else if (ageMinutes < cacheDuration * 0.8) {
            // Aging cache (50-80% of duration)
            statusClass = 'bg-yellow-50 border-yellow-200 text-yellow-800';
            statusIcon = '🟡';
            statusText = 'Aging Cache';
            countdownClass = 'text-yellow-600';
        } else if (ageMinutes < cacheDuration) {
            // Expires soon (80-100% of duration)
            statusClass = 'bg-orange-50 border-orange-200 text-orange-800';
            statusIcon = '🟠';
            statusText = 'Expires Soon';
            countdownClass = 'text-orange-600 animate-pulse';
        } else {
            // Expired
            statusClass = 'bg-red-50 border-red-200 text-red-800';
            statusIcon = '🔴';
            statusText = 'Cache Expired';
            countdownClass = 'text-red-600 animate-pulse';
        }
        
        indicator.className += ` ${statusClass}`;
        
        const expiryTime = new Date(cacheInfo.timestamp + (cacheDuration * 60 * 1000));
        
        indicator.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                        <span class="text-lg">${statusIcon}</span>
                        <span class="font-semibold">${statusText}</span>
                    </div>
                    <div class="text-xs space-x-3">
                        <span><strong>Loaded:</strong> ${loadedTime}</span>
                        <span><strong>Duration:</strong> ${cacheDuration} min</span>
                        <span><strong>Expires:</strong> <span id="cache-expiry-countdown" class="${countdownClass}">${expiryTime.toLocaleTimeString()}</span></span>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <div class="text-xs ${countdownClass}">
                        <span id="cache-time-remaining">Calculating...</span>
                    </div>
                    <button onclick="refreshApplicationDashboard(true)" 
                           class="px-3 py-1 bg-white bg-opacity-50 hover:bg-opacity-75 rounded text-xs font-medium transition-colors">
                        🔄 Refresh Now
                    </button>
                </div>
            </div>
        `;
        
        // Insert cache indicator
        welcomeHeader.appendChild(indicator);
        
        // Start countdown timer
        startDashboardCacheCountdown(cacheInfo.timestamp, cacheDuration);
    }
    
    console.log('[ui.js] ✅ Cache indicators updated with visual status');
}


/**
 * ENHANCED: Cache countdown with real-time updates
 */
function startDashboardCacheCountdown(cacheTimestamp, durationMinutes) {
    const countdownElement = document.getElementById('cache-time-remaining');
    const expiryCountdownElement = document.getElementById('cache-expiry-countdown');
    
    if (!countdownElement) return;
    
    const countdown = setInterval(() => {
        const now = Date.now();
        const ageMs = now - cacheTimestamp;
        const ageMinutes = ageMs / (1000 * 60);
        const remainingMinutes = durationMinutes - ageMinutes;
        
        if (remainingMinutes <= 0) {
            // Cache expired
            countdownElement.textContent = '⚠️ Cache Expired';
            countdownElement.className = 'text-xs text-red-600 font-semibold animate-pulse';
            
            if (expiryCountdownElement) {
                expiryCountdownElement.textContent = 'Expired - Refresh Recommended';
                expiryCountdownElement.className = 'text-red-600 font-semibold animate-pulse';
            }
            
            clearInterval(countdown);
            
        } else {
            // Show remaining time
            const minutes = Math.floor(remainingMinutes);
            const seconds = Math.floor((remainingMinutes - minutes) * 60);
            
            countdownElement.textContent = `${minutes}m ${seconds}s remaining`;
            
            // Visual feedback based on time remaining
            if (remainingMinutes <= 2) {
                countdownElement.className = 'text-xs text-red-600 font-semibold animate-pulse';
            } else if (remainingMinutes <= 4) {
                countdownElement.className = 'text-xs text-orange-600 font-medium';
            } else if (remainingMinutes <= 7) {
                countdownElement.className = 'text-xs text-yellow-600';
            } else {
                countdownElement.className = 'text-xs text-green-600';
            }
        }
    }, 1000); // Update every second
}


/**
 * HELPER: Calculate current inventory value
 */
function calculateCurrentInventoryValue() {
    const activeProducts = masterData.products.filter(p => p.isActive);
    
    let totalValue = 0;
    let productCount = 0;
    
    activeProducts.forEach(product => {
        const stock = product.inventoryCount || 0;
        const unitPrice = product.unitPrice || 0;
        
        if (stock > 0 && unitPrice > 0) {
            totalValue += stock * unitPrice;
            productCount++;
        }
    });
    
    return {
        totalValue,
        productCount,
        averageValue: productCount > 0 ? totalValue / productCount : 0
    };
}






/**
 * TEAM LEAD DASHBOARD: Team-focused metrics (hide financial details)
 */
async function loadTeamLeadLandingDashboard(user) {
    console.log('[ui.js] 👥 Loading team lead dashboard...');
    
    document.getElementById('dashboard-welcome-subtitle').textContent = 'Team Lead Dashboard - Your Team Operations';
    
    // Hide financial section for team leads
    const financialSection = document.getElementById('dashboard-financial-section');
    if (financialSection) {
        financialSection.style.display = 'none';
    }
    
    try {
        const todayMetrics = await getDailyDashboardOptimized();
        const teamMetrics = await getTeamLeadMetrics(user.email);
        
        // Update cards with team context
        document.getElementById('dashboard-today-sales').textContent = formatCurrency(teamMetrics.teamContribution || 0);
        document.getElementById('dashboard-today-transactions').textContent = `Team contribution today`;
        
        document.getElementById('dashboard-week-sales').textContent = formatCurrency(teamMetrics.weeklyTeamSales || 0);
        document.getElementById('dashboard-week-details').textContent = 'Team sales this week';
        
        document.getElementById('dashboard-actions-title').textContent = 'Team Actions';
        document.getElementById('dashboard-pending-actions').textContent = teamMetrics.pendingTeamActions?.toString() || '0';
        document.getElementById('dashboard-actions-details').textContent = 'Consignment activities';
        
        document.getElementById('dashboard-low-stock').textContent = teamMetrics.consignmentItemsLow?.toString() || '0';
        document.getElementById('dashboard-low-stock-details').textContent = 'Consignment items low';
        
        document.getElementById('dashboard-active-teams').textContent = '1';
        document.getElementById('dashboard-teams-details').textContent = 'Your team';
        
        document.getElementById('dashboard-performance-title').textContent = 'Team Performance';
        document.getElementById('dashboard-performance-value').textContent = teamMetrics.performanceRating || 'Active';
        document.getElementById('dashboard-performance-details').textContent = teamMetrics.performanceDetails || 'Team operations';
        
        await updateRecentActivity('team_lead', user);
        await updateSystemAlerts('team_lead', user, { teamMetrics });
        
    } catch (error) {
        console.error('[ui.js] Team lead dashboard error:', error);
        throw error;
    }
}




/**
 * SALES STAFF LANDING DASHBOARD: Sales-focused metrics and actions
 */
async function loadSalesStaffLandingDashboard(user) {
    console.log('[ui.js] 🏪 Loading sales staff landing dashboard...');
    
    document.getElementById('dashboard-welcome-subtitle').textContent = 'Sales Staff Dashboard - Today\'s Sales Operations';
    
    try {
        // Get today's sales metrics
        const todayMetrics = await getDailyDashboardOptimized();
        
        // Sales-focused metrics
        document.getElementById('dashboard-today-sales').textContent = todayMetrics.todayRevenue;
        document.getElementById('dashboard-today-transactions').textContent = `${todayMetrics.todayTransactions} sales today`;
        
        // Sales actions (outstanding collections)
        document.getElementById('dashboard-actions-title').textContent = 'Collections Due';
        document.getElementById('dashboard-pending-actions').textContent = '0'; // Could calculate outstanding sales
        document.getElementById('dashboard-actions-details').textContent = 'Outstanding customer payments';
        
        // Inventory relevant to sales
        const inventoryAlerts = getInventoryAlerts();
        document.getElementById('dashboard-low-stock').textContent = inventoryAlerts.lowStockCount.toString();
        document.getElementById('dashboard-low-stock-details').textContent = 'Products need restock';
        
        // Sales performance
        document.getElementById('dashboard-performance-title').textContent = 'Sales Performance';
        document.getElementById('dashboard-performance-value').textContent = todayMetrics.todayTransactions > 5 ? 'Excellent' : 'Good';
        document.getElementById('dashboard-performance-details').textContent = `${todayMetrics.todayTransactions} transactions today`;
        
        // Sales-specific actions
        updateQuickActions([
            { icon: '🏪', title: 'New Sale', action: 'showSalesView()', color: 'green', description: 'Process sale' },
            { icon: '💳', title: 'Collect Payment', action: 'showSalesView()', color: 'blue', description: 'Customer payment' },
            { icon: '📊', title: 'Sales Reports', action: 'showSalesReportsView()', color: 'purple', description: 'Performance data' },
            { icon: '👥', title: 'Customers', action: 'showSalesView()', color: 'teal', description: 'Customer management' }
        ]);
        
        await updateRecentActivity('sales_staff', user);
        await updateSystemAlerts('sales_staff', user);
        
    } catch (error) {
        console.error('[ui.js] Error loading sales staff dashboard:', error);
        throw error;
    }
}

/**
 * INVENTORY MANAGER DASHBOARD: Inventory-focused metrics and actions
 */
async function loadInventoryManagerLandingDashboard(user) {
    console.log('[ui.js] 📦 Loading inventory manager dashboard...');
    
    document.getElementById('dashboard-welcome-subtitle').textContent = 'Inventory Manager Dashboard - Stock & Purchase Operations';
    
    try {
        const todayMetrics = await getDailyDashboardOptimized();
        const inventoryAlerts = getInventoryAlerts();
        
        // Inventory-focused metrics
        document.getElementById('dashboard-today-sales').textContent = todayMetrics.todayRevenue;
        document.getElementById('dashboard-today-transactions').textContent = `${todayMetrics.todayTransactions} sales (inventory impact)`;
        
        // Inventory actions
        document.getElementById('dashboard-actions-title').textContent = 'Reorder Actions';
        document.getElementById('dashboard-pending-actions').textContent = inventoryAlerts.reorderNeeded?.toString() || '0';
        document.getElementById('dashboard-actions-details').textContent = 'Products need purchase orders';
        
        // Stock alerts (main focus)
        document.getElementById('dashboard-low-stock').textContent = inventoryAlerts.lowStockCount.toString();
        document.getElementById('dashboard-low-stock-details').textContent = inventoryAlerts.criticalCount > 0 ? 
            `${inventoryAlerts.criticalCount} critical, ${inventoryAlerts.lowStockCount - inventoryAlerts.criticalCount} low` :
            `${inventoryAlerts.lowStockCount} products need attention`;
        
        // Inventory performance
        document.getElementById('dashboard-performance-title').textContent = 'Inventory Health';
        document.getElementById('dashboard-performance-value').textContent = inventoryAlerts.healthRating;
        document.getElementById('dashboard-performance-details').textContent = inventoryAlerts.healthDescription;
        
        // Inventory-specific actions
        updateQuickActions([
            { icon: '📦', title: 'Manage Products', action: 'showProductsView()', color: 'orange', description: 'Product catalog' },
            { icon: '🛒', title: 'Purchase Orders', action: 'showPurchasesView()', color: 'red', description: 'Supplier orders' },
            { icon: '📋', title: 'Stock Reports', action: 'showInventoryReportsView()', color: 'blue', description: 'Inventory analytics' },
            { icon: '🏭', title: 'Suppliers', action: 'showSuppliersView()', color: 'gray', description: 'Supplier management' }
        ]);
        
        await updateRecentActivity('inventory_manager', user);
        await updateSystemAlerts('inventory_manager', user, { inventoryAlerts });
        
    } catch (error) {
        console.error('[ui.js] Error loading inventory manager dashboard:', error);
        throw error;
    }
}


// ===================================================================
// HELPER FUNCTIONS FOR DASHBOARD DATA
// ===================================================================

/**
 * HELPER: Show loading state for all dashboard elements
 */
function showApplicationDashboardLoading() {
    // Row 1: Core metrics
    document.getElementById('dashboard-today-sales').textContent = 'Loading...';
    document.getElementById('dashboard-week-sales').textContent = 'Loading...';
    document.getElementById('dashboard-pending-actions').textContent = 'Loading...';
    document.getElementById('dashboard-low-stock').textContent = 'Loading...';
    document.getElementById('dashboard-active-teams').textContent = 'Loading...';
    document.getElementById('dashboard-total-products').textContent = 'Loading...'; // ✅ ADD: This was missing
    document.getElementById('dashboard-performance-value').textContent = 'Loading...';
    
    // Row 2: Financial metrics (if visible)
    document.getElementById('dashboard-customer-receivables').textContent = 'Loading...';
    document.getElementById('dashboard-supplier-payables').textContent = 'Loading...';
    document.getElementById('dashboard-net-position').textContent = 'Loading...';
    document.getElementById('dashboard-inventory-value').textContent = 'Loading...';
    
    // Details
    document.getElementById('dashboard-today-transactions').textContent = 'Loading...';
    document.getElementById('dashboard-week-details').textContent = 'Loading...';
    document.getElementById('dashboard-actions-details').textContent = 'Checking actions...';
    document.getElementById('dashboard-low-stock-details').textContent = 'Checking inventory...';
    document.getElementById('dashboard-teams-details').textContent = 'Loading...';
    document.getElementById('dashboard-products-details').textContent = 'Loading...'; // ✅ ADD: This was missing
    document.getElementById('dashboard-performance-details').textContent = 'Analyzing...';
}

/**
 * HELPER: Get admin pending actions (reuse payment management logic)
 */
async function getAdminPendingActions() {
    try {
        // ✅ REUSE: Your existing payment management action logic
        const actionSummary = await buildActionRequiredList({ forceRefresh: false });
        
        let urgencyLevel = 'normal';
        if (actionSummary.totalActionItems > 10) urgencyLevel = 'high';
        else if (actionSummary.totalActionItems > 5) urgencyLevel = 'medium';
        
        return {
            total: actionSummary.totalActionItems || 0,
            urgency: urgencyLevel,
            description: actionSummary.totalActionItems > 0 ? 
                `${actionSummary.totalActionItems} verification${actionSummary.totalActionItems > 1 ? 's' : ''} needed` :
                'All actions completed ✅'
        };
    } catch (error) {
        console.warn('[ui.js] Could not get admin actions:', error);
        return { total: 0, urgency: 'normal', description: 'Could not load actions' };
    }
}

/**
 * HELPER: Get inventory alerts from master data (ENHANCED)
 */
function getInventoryAlerts() {
    const lowStockThreshold = 10;
    const criticalStockThreshold = 0;
    
    const allProducts = masterData.products.filter(p => p.isActive);
    const criticalStock = allProducts.filter(p => (p.inventoryCount || 0) === criticalStockThreshold);
    const lowStock = allProducts.filter(p => (p.inventoryCount || 0) > criticalStockThreshold && (p.inventoryCount || 0) <= lowStockThreshold);
    
    let healthRating, healthDescription;
    const totalLowStock = criticalStock.length + lowStock.length;
    
    if (criticalStock.length > 0) {
        healthRating = 'Critical';
        healthDescription = `${criticalStock.length} out of stock`;
    } else if (totalLowStock > 20) {
        healthRating = 'Poor';
        healthDescription = `${totalLowStock} products need restock`;
    } else if (totalLowStock > 5) {
        healthRating = 'Fair';
        healthDescription = `${totalLowStock} products getting low`;
    } else {
        healthRating = 'Excellent';
        healthDescription = 'Inventory levels healthy';
    }
    
    return {
        lowStockCount: totalLowStock,
        criticalCount: criticalStock.length,
        reorderNeeded: totalLowStock,
        healthRating,
        healthDescription,
        description: totalLowStock > 0 ? 
            `${totalLowStock} product${totalLowStock > 1 ? 's' : ''} need reorder` :
            'Inventory levels healthy'
    };
}

/**
 * HELPER: Calculate overall system health  
 */
function calculateSystemHealth(todayMetrics, pendingActions, inventoryAlerts) {
    let healthScore = 100;
    
    // Factor in pending actions
    if (pendingActions.total > 10) healthScore -= 20;
    else if (pendingActions.total > 5) healthScore -= 10;
    else if (pendingActions.total > 0) healthScore -= 5;
    
    // Factor in inventory health
    if (inventoryAlerts.criticalCount > 0) healthScore -= 25;
    else if (inventoryAlerts.lowStockCount > 20) healthScore -= 15;
    else if (inventoryAlerts.lowStockCount > 10) healthScore -= 10;
    
    // Factor in today's sales activity
    if (todayMetrics.todayTransactions === 0) healthScore -= 15;
    else if (todayMetrics.todayTransactions > 10) healthScore += 5;
    
    let rating, description;
    
    if (healthScore >= 90) {
        rating = 'Excellent';
        description = 'All systems operating optimally';
    } else if (healthScore >= 75) {
        rating = 'Good';
        description = 'Systems operating well';
    } else if (healthScore >= 60) {
        rating = 'Fair';
        description = 'Some attention needed';
    } else {
        rating = 'Attention Needed';
        description = 'Multiple issues require attention';
    }
    
    return { rating, description, score: healthScore };
}

/**
 * HELPER: Update quick actions grid
 */
function updateQuickActions(actions) {
    const container = document.getElementById('dashboard-quick-actions');
    if (!container) return;
    
    const actionsHTML = actions.map(action => `
        <button onclick="${action.action}" 
               class="bg-${action.color}-500 hover:bg-${action.color}-600 text-white p-4 rounded-lg shadow-md transition-all hover:scale-105 text-center group">
            <div class="text-2xl mb-2">${action.icon}</div>
            <div class="text-sm font-semibold">${action.title}</div>
            <div class="text-xs opacity-75 mt-1 group-hover:opacity-100">${action.description}</div>
        </button>
    `).join('');
    
    container.innerHTML = actionsHTML;
    
    console.log(`[ui.js] ✅ Quick actions updated: ${actions.length} actions`);
}

/**
 * HELPER: Update recent activity section
 */
async function updateRecentActivity(roleType, user) {
    const container = document.getElementById('dashboard-recent-activity');
    if (!container) return;
    
    // ✅ ROLE-BASED: Different activity feeds
    let activities = [];
    
    if (roleType === 'admin') {
        activities = [
            { icon: '👑', text: 'Accessed administrator dashboard', time: 'Just now', color: 'blue' },
            { icon: '💳', text: 'Payment management available', time: '2 min ago', color: 'green' },
            { icon: '📊', text: 'System reports updated', time: '5 min ago', color: 'purple' }
        ];
    } else if (roleType === 'team_lead') {
        activities = [
            { icon: '👥', text: 'Accessed team dashboard', time: 'Just now', color: 'green' },
            { icon: '📋', text: 'Consignment requests available', time: '1 min ago', color: 'blue' },
            { icon: '💰', text: 'Settlement options ready', time: '3 min ago', color: 'purple' }
        ];
    } else {
        activities = [
            { icon: '🏪', text: 'Accessed sales dashboard', time: 'Just now', color: 'green' },
            { icon: '📦', text: 'Inventory system available', time: '1 min ago', color: 'orange' }
        ];
    }
    
    const activitiesHTML = activities.map(activity => `
        <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div class="w-8 h-8 bg-${activity.color}-100 rounded-full flex items-center justify-center text-${activity.color}-600">
                ${activity.icon}
            </div>
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-800">${activity.text}</p>
                <p class="text-xs text-gray-500">${activity.time}</p>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = activitiesHTML;
    
    const scopeElement = document.getElementById('dashboard-activity-scope');
    if (scopeElement) {
        scopeElement.textContent = roleType === 'admin' ? 'System activity' : 'Your activity';
    }
}

/**
 * HELPER: Update alerts section  
 */

async function updateSystemAlerts(roleType, user, contextData = {}) {
    const container = document.getElementById('dashboard-alerts');
    if (!container) return;
    
    const alerts = [];
    
    // ✅ ROLE-BASED ALERTS
    if (roleType === 'admin' || roleType === 'finance') { // Combine admin and finance logic
        // Alert 1: Pending Payment Verifications
        if (contextData.pendingActions?.total > 0) {
            alerts.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Payment Verifications Needed',
                message: `${contextData.pendingActions.total} payments are awaiting your approval`,
                action: 'pmt-mgmt-view', // Use showView for SPA navigation
                actionText: 'Verify Now'
            });
        }
        
        // Alert 2: Critical Stock Levels
        if (contextData.inventoryAlerts?.criticalCount > 0) {
            alerts.push({
                type: 'error', 
                icon: '🚨',
                title: 'Critical Stock Alert',
                message: `${contextData.inventoryAlerts.criticalCount} product(s) are out of stock`,
                action: 'products-view',
                actionText: 'Manage Inventory'
            });
        }

        // ✅ NEW: Alert 3 - Overdue Supplier Invoices

        console.log('[Debug Alert] Checking for overdue supplier payables...');
        const supplierPayables = contextData.outstandingMetrics?.supplierPayables;

        console.log('[Debug Alert] supplierPayables object received:', supplierPayables);

        if (supplierPayables) {
            console.log('[Debug Alert] Overdue Count:', supplierPayables.overdueCount);
        }




        if (supplierPayables && supplierPayables.overdueCount >= 0) {
            let alertType = 'warning';
            let alertIcon = '🧾';
            let alertTitle = `${supplierPayables.overdueCount} Supplier Invoice(s) Overdue`;
            let alertMessage = `Totaling ${formatCurrency(supplierPayables.overdueAmount)}. Pay soon to maintain good supplier relations.`;

            // Make the alert more urgent if there are critical invoices
            if (supplierPayables.criticalCount > 0) {
                alertType = 'error';
                alertIcon = '🔥';
                alertTitle = `${supplierPayables.criticalCount} Critical Invoice(s) Need Immediate Payment`;
                alertMessage = `${supplierPayables.overdueCount} total invoices are overdue, with some requiring urgent attention.`;
            }

            alerts.push({
                type: alertType,
                icon: alertIcon,
                title: alertTitle,
                message: alertMessage,
                action: 'pmt-mgmt-view',
                actionText: 'Manage Payables'
            });
        }

    } else if (roleType === 'team_lead') {
        alerts.push({
            type: 'info',
            icon: '💡',
            title: 'Team Leadership Tip',
            message: 'Regular consignment requests help maintain team engagement',
            action: 'showConsignmentView()',
            actionText: 'Create Request'
        });
    }
    
    // Default state if no alerts
    if (alerts.length === 0) {
        alerts.push({
            type: 'success',
            icon: '✅',
            title: 'All Systems Operational',
            message: 'No critical alerts at this time.',
            action: null,
            actionText: null
        });
    }
    
    // Sort alerts by severity: error > warning > info > success
    const severityOrder = { 'error': 1, 'warning': 2, 'info': 3, 'success': 4 };
    alerts.sort((a, b) => (severityOrder[a.type] || 5) - (severityOrder[b.type] || 5));
    
    const alertsHTML = alerts.map(alert => {
        const alertStyles = {
            'success': 'bg-green-50 border-green-200 text-green-800',
            'info': 'bg-blue-50 border-blue-200 text-blue-800',
            'warning': 'bg-yellow-50 border-yellow-200 text-yellow-800',
            'error': 'bg-red-50 border-red-200 text-red-800'
        };
        
        const style = alertStyles[alert.type] || alertStyles['info'];
        
        // Use a unique ID for each button if you plan to add more specific event listeners
        const buttonId = `alert-action-${alert.action?.replace(/['()]/g, '')}`;

        return `
            <div class="border rounded-lg p-4 ${style}">
                <div class="flex items-start justify-between">
                    <div class="flex items-start space-x-3">
                        <div class="text-xl">${alert.icon}</div>
                        <div class="flex-1">
                            <h5 class="font-semibold text-sm">${alert.title}</h5>
                            <p class="text-sm mt-1">${alert.message}</p>
                        </div>
                    </div>
                    ${alert.action ? 
                        // ✅ CORRECTED: Use a proper onclick attribute that calls a global function
                        `<button data-action-view="${alert.action}" class="alert-action-button text-xs px-3 py-1 rounded bg-white bg-opacity-50 hover:bg-opacity-75 font-medium">
                            ${alert.actionText}
                        </button>` : ''
                    }
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = alertsHTML;
}



// ✅ NEW: Add this global helper function to your ui.js file
// This makes the onclick attribute in the HTML work correctly.
window.handleAlertAction = function(actionString) {
    try {
        // A safe way to execute the string function
        eval(actionString);
    } catch (e) {
        console.error("Error executing alert action:", e);
    }
}

/**
 * HELPER: Get team lead specific metrics (placeholder)
 */
async function getTeamLeadMetrics(userEmail) {
    // ✅ PLACEHOLDER: Could be enhanced to get actual team data
    return {
        teamSalesToday: 0,
        teamActivitiesToday: 0,
        pendingTeamActions: 0,
        teamActionsDescription: 'No team actions pending',
        lowConsignmentItems: 0,
        performanceRating: 'Active',
        performanceDetails: 'Team member in good standing'
    };
}

/**
 * HELPER: Show error state for application dashboard
 */
function showApplicationDashboardError(error) {
    console.error('[ui.js] Application dashboard error:', error);
    
    // Set error states on cards
    document.getElementById('dashboard-today-sales').textContent = 'Error';
    document.getElementById('dashboard-pending-actions').textContent = 'Error';
    document.getElementById('dashboard-low-stock').textContent = 'Error';
    document.getElementById('dashboard-performance-value').textContent = 'Error';
    
    // Show error in quick actions
    const container = document.getElementById('dashboard-quick-actions');
    if (container) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 bg-red-50 rounded-lg border border-red-200">
                <div class="text-red-600 text-2xl mb-2">⚠️</div>
                <p class="text-red-700 font-semibold">Dashboard Loading Error</p>
                <p class="text-red-600 text-sm mt-1">${error.message}</p>
                <button onclick="loadApplicationDashboard()" class="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700">
                    Retry Dashboard
                </button>
            </div>
        `;
    }
    
    // Show error modal
    setTimeout(() => {
        showModal('error', 'Dashboard Error',
            `Could not load application dashboard.\n\n` +
            `Error: ${error.message}\n\n` +
            `Please refresh the page or try again.`
        );
    }, 1000);
}

//Expense module 

let expensesGridApi = null;
let isExpensesGridInitialized = false;
let unsubscribeExpensesListener = null;

// This counter is used to give new, unsaved rows a temporary unique ID
let newExpenseCounter = 0;

// ✅ NEW: The complete grid options for the Expense Ledger
const expensesGridOptions = {
    // Use the row's 'id' field as its unique identifier
    getRowId: params => params.data.id,
    theme: 'legacy',
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
    onRowDataUpdated: (params) => {
        // Check if a "new item" row already exists
        let hasNewRow = false;
        params.api.forEachNode(node => {
            if (node.data && node.data.isNew) {
                hasNewRow = true;
            }
        });

        // If no new row exists, add one to the top.
        if (!hasNewRow) {
            newExpenseCounter++;
            const newRow = {
                id: `new_${newExpenseCounter}`,
                isNew: true,
                expenseDate: new Date(),
                status: 'Draft'
            };
            params.api.applyTransaction({
                add: [newRow],
                addIndex: 0
            });
        }
    },

    
    columnDefs: [
        // Column 1: Expense ID (Read-only)
        { 
            field: "expenseId", 
            headerName: "Expense ID", 
            width: 180, 
            editable: false, 
            cellStyle: { fontFamily: 'monospace', color: '#6b7280' } 
        },
        // Column 2: Sales Season (Editable Dropdown)
        {
            field: "seasonId",
            headerName: "Sales Season",
            flex: 1,
            minWidth: 200,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: (params) => {
                // This function runs at the moment the user clicks the cell.
                // By this time, masterData.seasons is fully loaded.
                const seasonIds = masterData.seasons.map(s => s.id);
                
                // We return an object containing the actual array of values.
                return {
                    values: seasonIds,
                    cellRenderer: (cellParams) => {
                        const season = masterData.seasons.find(s => s.id === cellParams.value);
                        return season ? season.seasonName : cellParams.value;
                    }
                };
            },
            // (The valueFormatter remains the same and is correct)
            valueFormatter: params => {
                const season = masterData.seasons.find(s => s.id === params.value);
                return season ? season.seasonName : 'Select Season';
            }
        },
        // Column 3: Expense Type (Editable Dropdown)
        {
            field: "expenseType",
            headerName: "Type",
            width: 150,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            // Get values from our new config object
            cellEditorParams: { values: expenseTypes } 
        },
        // Column 4: Date (Editable Date Picker)
        {
            field: "expenseDate",
            headerName: "Date",
            width: 130,
            editable: true,
            cellEditor: 'agDateCellEditor',
            // Display date in a readable format
            valueFormatter: p => p.value ? (p.value.toDate ? p.value.toDate() : new Date(p.value)).toLocaleDateString() : ''
        },
        // Column 5: Description (Editable Text)
        { 
            field: "description", 
            headerName: "Description", 
            flex: 2, 
            minWidth: 250,
            editable: true 
        },
        // Column 6: Amount (Editable Number)
        {
            field: "amount",
            headerName: "Amount",
            width: 130,
            editable: true,
            type: 'rightAligned',
            cellEditor: 'agNumberCellEditor',
            valueParser: p => parseFloat(p.newValue) || 0,
            valueFormatter: p => formatCurrency(p.value || 0),
            cellStyle: { fontWeight: 'bold' }
        },
        // Column 7: Voucher Number (Editable Text)
        { 
            field: "voucherNumber", 
            headerName: "Voucher #", 
            width: 150, 
            editable: true 
        },
        // Column 8: Status (Read-only)
        { 
            field: "status", 
            headerName: "Status", 
            width: 120, 
            editable: false,
            cellRenderer: p => p.value ? `<span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">${p.value}</span>` : 'Draft'
        },
        // Column 9: Actions (Save, Cancel, Delete)
        {
            headerName: "Actions",
            width: 120,
            editable: false,
            cellClass: 'flex items-center justify-center space-x-2',
            cellRenderer: params => {
                // For new, unsaved rows, always show Save and Cancel
                if (params.data.isNew) {
                    const saveIcon = `<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>`;
                    const cancelIcon = `<svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" /></svg>`;
                    return `
                        <button class="action-btn-icon action-btn-save-expense" data-id="${params.data.id}" title="Save New Expense">${saveIcon}</button>
                        <button class="action-btn-icon action-btn-cancel-expense" data-id="${params.data.id}" title="Cancel">${cancelIcon}</button>
                    `;
                }
                // For existing, saved rows, apply the new security logic
                else {
                    // ✅ 1. Get the current user's role and email from the global appState
                    const currentUser = appState.currentUser;
                    const userRole = currentUser?.role;
                    const userEmail = currentUser?.email;

                    // ✅ 2. Get the email of the user who created this specific expense row
                    const createdByEmail = params.data.createdBy;

                    // ✅ 3. Determine if the current user has permission to delete this row
                    const canDelete = (userRole === 'admin') || (userEmail === createdByEmail);

                    // ✅ 4. Only render the delete button if the user has permission
                    if (canDelete) {
                        const deleteIcon = `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clip-rule="evenodd" /></svg>`;
                        return `<button class="action-btn-icon action-btn-delete action-btn-delete-expense" data-id="${params.data.id}" title="Delete Expense">${deleteIcon}</button>`;
                    }

                    // ✅ 5. If the user does not have permission, render an empty cell
                    return ''; 
                }
            }
        }
    ],
    defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true
    },
    // This event is triggered after a user edits a cell in an *existing* row
    onCellValueChanged: (params) => {
        // Do not trigger update for new, unsaved rows
        if (params.data.isNew) {
            return;
        }
        const docId = params.data.id;
        const field = params.colDef.field;
        const newValue = params.newValue;
        
        // Dispatch a custom event for main.js to handle the API call
        document.dispatchEvent(new CustomEvent('updateExpense', {
            detail: { docId, updatedData: { [field]: newValue } }
        }));
    },
    onGridReady: (params) => {
        expensesGridApi = params.api;
        console.log("[ui.js] Expenses Grid is ready.");
    }
};

/**
 * Retrieves the data for a specific row from the expenses grid.
 * @param {string} rowId The unique ID of the row.
 * @returns {object|null} The row's data object, or null if not found.
 */
export function getExpenseRowData(rowId) {
    if (!expensesGridApi) {
        console.error("Expenses grid is not initialized.");
        return null;
    }
    const rowNode = expensesGridApi.getRowNode(rowId);
    return rowNode ? rowNode.data : null;
}

/**
 * Removes a specific row from the expenses grid.
 * Used for canceling a new, unsaved expense.
 * @param {string} rowId The unique ID of the row to remove.
 */
export function removeExpenseRow(rowId) {
    if (!expensesGridApi) return;
    const rowNode = expensesGridApi.getRowNode(rowId);
    if (rowNode) {
        expensesGridApi.applyTransaction({ remove: [rowNode.data] });
    }
}

/**
 * Adds a new, blank row to the top of the expenses grid for data entry.
 */
export function addNewExpenseRow() {
    if (!expensesGridApi) return;
    
    newExpenseCounter++;
    const newRow = {
        id: `new_${newExpenseCounter}`, 
        isNew: true,
        expenseDate: new Date(),
        status: 'Draft'
    };
    
    expensesGridApi.applyTransaction({
        add: [newRow],
        addIndex: 0 
    });

    // Automatically start editing the first editable cell of the new row
    expensesGridApi.startEditingCell({
        rowIndex: 0,
        colKey: 'seasonId', // The first editable column
    });
}

// Standard initialization and view functions
export function initializeExpensesGrid() {
    if (isExpensesGridInitialized) return;
    const gridDiv = document.getElementById('expenses-grid');
    if (gridDiv) {
        createGrid(gridDiv, expensesGridOptions);
        isExpensesGridInitialized = true;
    }
}

export function showExpensesView() {
    showView('expenses-view');
    initializeExpensesGrid();

    // Attach a real-time listener to the expenses collection
    const waitForGrid = setInterval(() => {
        if (expensesGridApi) {
            clearInterval(waitForGrid);
            const db = firebase.firestore();
            expensesGridApi.setGridOption('loading', true);

            unsubscribeExpensesListener = db.collection(EXPENSES_COLLECTION_PATH)
                .orderBy('expenseDate', 'desc')
                .onSnapshot(snapshot => {
                    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    expensesGridApi.setGridOption('rowData', expenses);
                    expensesGridApi.setGridOption('loading', false);
                }, error => {
                    console.error("Error listening to expenses:", error);
                    expensesGridApi.setGridOption('loading', false);
                });
        }
    }, 50);
}
