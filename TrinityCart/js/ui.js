// js/ui.js
import { appState } from './state.js';
import { navConfig } from './config.js';

import { createGrid } from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';

import { getSuppliers } from './api.js';
import { getCategories } from './api.js';
import { getSaleTypes } from './api.js';


// --- DOM ELEMENT REFERENCES ---
const views = document.querySelectorAll('.view');
const sidebarNav = document.getElementById('sidebar-nav');
const authContainer = document.getElementById('auth-container');
const viewTitle = document.getElementById('view-title');


const suppliersGridDiv = document.getElementById('suppliers-grid');
const categoriesGridDiv = document.getElementById('categories-grid');
const saleTypesGridDiv = document.getElementById('sale-types-grid');



// --- A NEW VARIABLE TO HOLD THE GRID API ---
let suppliersGridApi = null;

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
        // We don't need to do anything here on initial load,
        // but this event guarantees that params.api is now available.
        try {
            suppliersGridApi.setGridOption('loading', true);
            const suppliers = await getSuppliers();
            suppliersGridApi.setGridOption('rowData', suppliers);
            suppliersGridApi.setGridOption('loading', false);
        } catch (error) {
            console.error("[ui.js] Could not load initial supplier data:", error);
            suppliersGridApi.setGridOption('loading', false);
            suppliersGridApi.showNoRowsOverlay();
        }
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


// --- A FLAG TO PREVENT RE-INITIALIZATION ---
let isSuppliersGridInitialized = false;


// --- THE NEW INITIALIZATION FUNCTION ---
export function initializeSuppliersGrid() {
    // This function will now only be called ONCE.
    if (isSuppliersGridInitialized) {
        return;
    }
    if (suppliersGridDiv) {
        console.log("[ui.js] Initializing Suppliers Grid for the first time.");
        createGrid(suppliersGridDiv, suppliersGridOptions);
        isSuppliersGridInitialized = true;
    }
}

export async function showSuppliersView() {
    console.log("[ui.js] showSuppliersView() called. Attempting to fetch data...");
    showView('suppliers-view');

    // 1. Initialize the grid if it's the first time viewing this page.
    initializeSuppliersGrid();
}

export async function refreshSuppliersGrid() {
    if (!suppliersGridApi) {
        console.error("Cannot refresh: Suppliers Grid API not available.");
        return;
    }
    try {
        suppliersGridApi.setGridOption('loading', true);
        const suppliers = await getSuppliers();
        suppliersGridApi.setGridOption('rowData', suppliers);
        suppliersGridApi.setGridOption('loading', false);
    } catch (error) {
        console.error("[ui.js] Could not refresh supplier data:", error);
        suppliersGridApi.setGridOption('loading', false);
        suppliersGridApi.showNoRowsOverlay();
    }
}


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
    defaultColDef: { resizable: true },
    rowData: [],
    onCellValueChanged: (params) => {
        document.dispatchEvent(new CustomEvent('updateCategory', { 
            detail: { docId: params.data.id, updatedData: { categoryName: params.newValue } } 
        }));
    }
};

let categoriesGridApi = null;
let isCategoriesGridInitialized = false;

export function initializeCategoriesGrid() {
    if (isCategoriesGridInitialized || !categoriesGridDiv) return;
    categoriesGridApi = createGrid(categoriesGridDiv, categoriesGridOptions);
    isCategoriesGridInitialized = true;
}

export async function showCategoriesView() {
    showView('categories-view');
    initializeCategoriesGrid();
    
    try {
        categoriesGridApi.setGridOption('loading', true);
        const categories = await getCategories();
        categoriesGridApi.setGridOption('rowData', categories);
        categoriesGridApi.setGridOption('loading', false);
    } catch (error) {
        console.error("Error loading categories:", error);
        categoriesGridApi.setGridOption('loading', false);
        categoriesGridApi.showNoRowsOverlay();
    }
}

export async function refreshCategoriesGrid() {
    if (!categoriesGridApi) return;
    try {
        categoriesGridApi.setGridOption('loading', true);
        const categories = await getCategories();
        categoriesGridApi.setGridOption('rowData', categories);
        categoriesGridApi.setGridOption('loading', false);
    } catch (error) { 
        console.error("Error refreshing categories:", error); 
        categoriesGridApi.setGridOption('loading', false);
        categoriesGridApi.showNoRowsOverlay();
    }
}


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
    defaultColDef: { resizable: true },
    onCellValueChanged: (params) => {
        document.dispatchEvent(new CustomEvent('updateSaleType', { 
            detail: { docId: params.data.id, updatedData: { saleTypeName: params.newValue } } 
        }));
    }
};

let saleTypesGridApi = null;
let isSaleTypesGridInitialized = false;

export function initializeSaleTypesGrid() {
    if (isSaleTypesGridInitialized || !saleTypesGridDiv) return;
    saleTypesGridApi = createGrid(saleTypesGridDiv, saleTypesGridOptions);
    isSaleTypesGridInitialized = true;
}

export async function showSaleTypesView() {
    showView('sale-types-view');
    initializeSaleTypesGrid();
    
    try {
        saleTypesGridApi.setGridOption('loading', true);
        const saleTypes = await getSaleTypes();
        saleTypesGridApi.setGridOption('rowData', saleTypes);
        saleTypesGridApi.setGridOption('loading', false);
    } catch (error) {
        console.error("Error loading sale types:", error);
        saleTypesGridApi.setGridOption('loading', false);
        saleTypesGridApi.showNoRowsOverlay();
    }
}


export async function refreshSaleTypesGrid() {
    if (!saleTypesGridApi) return;
    try {
        saleTypesGridApi.setGridOption('loading', true);
        const saleTypes = await getSaleTypes();
        saleTypesGridApi.setGridOption('rowData', saleTypes);
        saleTypesGridApi.setGridOption('loading', false);
    } catch (error) { 
        console.error("Error refreshing sale types:", error); 
        saleTypesGridApi.setGridOption('loading', false);
        saleTypesGridApi.showNoRowsOverlay();
    }
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
