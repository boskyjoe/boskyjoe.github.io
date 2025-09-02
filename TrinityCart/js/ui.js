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
let memberGridApi;
const memberGridOptions = {
    columnDefs: [
        { field: "productName", headerName: "Item Name", flex: 2 },
        { field: "quantityHeld", headerName: "Quantity You Have", flex: 1 },
    ],
    rowData: [],
};

let productsGridApi;
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

export function renderAuthUI() {
    // Clear previous auth buttons
    authContainer.innerHTML = '';

    if (appState.currentUser) {
        // User is logged in, show a logout button
        const logoutButton = document.createElement('button');
        logoutButton.id = 'logout-button';
        logoutButton.className = 'bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors';
        logoutButton.textContent = 'Logout';
        logoutButton.onclick = handleLogout; // Attach the handler
        authContainer.appendChild(logoutButton);
    } else {
        // User is logged out, render the Google button
        google.accounts.id.renderButton(
            authContainer,
            { theme: "outline", size: "large" }  // Customization options
        );
    }
}

export function initializeGrids() {
    // THE FIX: Use window.agGrid to access the global library
    if (memberGridDiv) {
        new window.agGrid.Grid(memberGridDiv, memberGridOptions);
    }
    if (productsGridDiv) {
        new window.agGrid.Grid(productsGridDiv, productsGridOptions);
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
    renderAuthUI(); // Always update the auth button first

    if (appState.currentUser && appState.currentUser.role !== 'guest') {
        dashboardLink.style.display = 'inline-block';
        if (appState.currentUser.role === 'admin') {
            showView('admin-dashboard-view');
        } else {
            showView('member-dashboard-view');
            const consignments = await fetchMemberConsignments();
            memberGridOptions.api.setRowData(consignments);
        }
    } else {
        dashboardLink.style.display = 'none';
        showView('login-view');
    }
}


export async function showAdminProductsView() {
    showView('admin-manage-products-view');
    // Load data for the products grid
    const products = await fetchProducts();
    productsGridOptions.api.setRowData(products);
}
