import { createGrid } from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';


import { appState } from './state.js';
import { fetchProducts, fetchMemberConsignments } from './api.js';
import { handleLogout } from './main.js'; // Import the logout handler

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

// --- UI FUNCTIONS ---
export function initializeGrids() {
    // THE FIX: Call `createGrid` as a function, instead of `new Grid()`.
    if (memberGridDiv) {
        createGrid(memberGridDiv, memberGridOptions);
    }
    if (productsGridDiv) {
        createGrid(productsGridDiv, productsGridOptions);
    }
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
