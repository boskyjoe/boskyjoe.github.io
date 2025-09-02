import { appState } from './state.js';
import { fetchProducts, fetchMemberConsignments } from './api.js';

// --- DOM ELEMENT REFERENCES ---
const views = document.querySelectorAll('.view');
const authButton = document.getElementById('auth-button');
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

export function initializeGrids() {
    memberGridApi = new agGrid.Grid(memberGridDiv, memberGridOptions);
    productsGridApi = new agGrid.Grid(productsGridDiv, productsGridOptions);
}

export function showView(viewId) {
    views.forEach(view => view.classList.remove('active'));
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) {
        viewToShow.classList.add('active');
    }
}

export async function updateUI() {
    if (appState.currentUser) {
        // User is LOGGED IN
        authButton.textContent = 'Logout';
        dashboardLink.style.display = 'inline-block';

        if (appState.currentUser.role === 'admin') {
            showView('admin-dashboard-view');
        } else {
            showView('member-dashboard-view');
            // Load data for the member's grid
            const consignments = await fetchMemberConsignments();
            memberGridOptions.api.setRowData(consignments);
        }
    } else {
        // User is LOGGED OUT
        authButton.textContent = 'Login';
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
