import { createGrid } from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';


import { appState } from './state.js';
import { fetchProducts, fetchMemberConsignments } from './api.js';
import { handleLogout } from './main.js'; // Import the logout handler

import { getVendors } from './api.js';

// --- DOM ELEMENT REFERENCES ---
const views = document.querySelectorAll('.view');
const authContainer = document.getElementById('auth-container');
const dashboardLink = document.getElementById('dashboard-link');

// --- GRID ELEMENTS ---
const memberGridDiv = document.getElementById('member-consignment-grid');
const productsGridDiv = document.getElementById('products-grid');

// --- GRID DEFINITIONS ---
const memberGridOptions = {
    columnDefs: [
        { field: "productName", headerName: "Item Name", flex: 2 },
        { field: "quantityHeld", headerName: "Quantity You Have", flex: 1 },
    ],
    rowData: [],
};

const productsGridOptions = {
    columnDefs: [
        { field: "productName", headerName: "Product Name", flex: 2 },
        { field: "sellingPrice", headerName: "Price", flex: 1 },
        { field: "sourceItem", headerName: "Source Bulk Item", flex: 1 },
        { field: "conversion", headerName: "Conversion", flex: 1 },
    ],
    rowData: [],
};



const vendorsGridDiv = document.getElementById('vendors-grid');
const vendorsGridOptions = {
    columnDefs: [
        { field: "VendorID", headerName: "ID", width: 150 },
        { field: "VendorName", headerName: "Vendor Name", flex: 1, minWidth: 150 },
        { field: "Address", headerName: "Address", flex: 2, minWidth: 200 },
        { field: "ContactNo", headerName: "Contact No", flex: 1, minWidth: 120 },
        { field: "ContactEmail", headerName: "Email", flex: 1, minWidth: 150 },
        { field: "isActive", headerName: "Status", width: 100, cellRenderer: p => p.value ? 'Active' : 'Inactive' },
        {
            headerName: "Actions",
            width: 150,
            cellRenderer: (params) => {
                const id = params.data.VendorID;
                const isActive = params.data.isActive;
                const actionButton = isActive
                    ? `<button class='btn-deactivate' data-id='${id}'>Deactivate</button>`
                    : `<button class='btn-activate' data-id='${id}'>Activate</button>`;
                
                return `
                    <button class='btn-modify' data-id='${id}'>Modify</button>
                    ${actionButton}
                `;
            }
        },
        // Audit columns are useful for debugging but hidden by default
        { field: "createdBy", headerName: "Created By", hide: true },
        { field: "createdDate", headerName: "Created Date", hide: true },
        { field: "updatedBy", headerName: "Updated By", hide: true },
        { field: "updatedDate", headerName: "Updated Date", hide: true },
    ],
    rowData: [],
    getRowId: params => params.data.VendorID,
    // This rule will style the entire row if the vendor is inactive
    rowClassRules: {
        'opacity-50 line-through': params => params.data.isActive === false,
    }
};

// --- UI FUNCTIONS ---
export function initializeGrids() {
    // THE FIX: Call `createGrid` as a function, instead of `new Grid()`.
    if (memberGridDiv) {
        createGrid(memberGridDiv, memberGridOptions);
    }
    if (productsGridDiv) {
        createGrid(productsGridDiv, productsGridOptions);
    }
    if (vendorsGridDiv) {
        createGrid(vendorsGridDiv, vendorsGridOptions);
    }
}

export async function showAdminVendorsView() {
    showView('admin-manage-vendors-view');
    clearVendorForm();
    const vendors = await getVendors();
    if (vendorsGridOptions.api) {
        vendorsGridOptions.api.setRowData(vendors);
    }
}

export function populateVendorForm(vendorData) {
    document.getElementById('vendor-form-title').textContent = 'Edit Vendor';
    document.getElementById('vendorId-input').value = vendorData.VendorID;
    document.getElementById('vendorName-input').value = vendorData.VendorName;
    document.getElementById('address-input').value = vendorData.Address;
    document.getElementById('contactNo-input').value = vendorData.ContactNo;
    document.getElementById('contactEmail-input').value = vendorData.ContactEmail;
}


export function clearVendorForm() {
    document.getElementById('vendor-form-title').textContent = 'Add New Vendor';
    document.getElementById('vendor-form').reset();
    document.getElementById('vendorId-input').value = '';
}






export function renderAuthUI() {
    authContainer.innerHTML = '';
    if (appState.currentUser) {
        const logoutButton = document.createElement('button');
        logoutButton.id = 'logout-button';
        logoutButton.className = 'bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors';
        logoutButton.textContent = 'Logout';
        logoutButton.onclick = handleLogout;
        authContainer.appendChild(logoutButton);
    } else {
        google.accounts.id.renderButton(authContainer, { theme: "outline", size: "large" });
    }
}

export function showView(viewId) {
    views.forEach(view => view.classList.remove('active'));
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) {
        viewToShow.classList.add('active');
    }
}

export async function updateUI() {
    renderAuthUI();
    if (appState.currentUser && appState.currentUser.role !== 'guest') {
        dashboardLink.style.display = 'inline-block';
        if (appState.currentUser.role === 'admin') {
            showView('admin-dashboard-view');
        } else {
            showView('member-dashboard-view');
            const consignments = await fetchMemberConsignments();
            if (memberGridOptions.api) { // Check if grid is ready
                memberGridOptions.api.setRowData(consignments);
            }
        }
    } else {
        dashboardLink.style.display = 'none';
        showView('login-view');
    }
}



export async function showAdminProductsView() {
    showView('admin-manage-products-view');
    const products = await fetchProducts();
    if (productsGridOptions.api) { // Check if grid is ready
        productsGridOptions.api.setRowData(products);
    }
}
