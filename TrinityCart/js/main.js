import { ModuleRegistry, AllCommunityModule } from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';

import { appState } from './state.js';
import { updateUI, showView, initializeGrids, showAdminProductsView, renderAuthUI } from './ui.js';


import { showAdminVendorsView, populateVendorForm, clearVendorForm } from './ui.js';
import { setVendorStatus, addVendor, updateVendor } from './api.js'; // Update imports



// --- MOCK USER DATA ---
const authorizedUsers = {
    'stsebastianschurchupdates@gmail.com': { name: 'Amin Doe', role: 'admin' },
    'ciscoibmpoc@gmail.com': { name: 'Member Alice', role: 'member' }
};

// --- HELPER FUNCTION ---
/**
 * Decodes the JWT token from Google to get user info.
 * @param {string} token The credential token.
 * @returns {object} The decoded payload.
 */
function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

// --- GOOGLE SIGN-IN HANDLERS ---

/**
 * This function is called by the Google library after a successful sign-in.
 * It MUST be globally accessible, so we attach it to the window object.
 * @param {object} response The response object from Google.
 */
window.handleCredentialResponse = function(response) {
    const payload = parseJwt(response.credential);
    const userEmail = payload.email;
    const userName = payload.name;
    
    if (authorizedUsers[userEmail]) {
        appState.currentUser = { name: userName, email: userEmail, role: authorizedUsers[userEmail].role };
        console.log(`User ${userName} logged in with role: ${appState.currentUser.role}`);
    } else {
        appState.currentUser = { name: userName, email: userEmail, role: 'guest' };
        alert(`Welcome, ${userName}! Your email (${userEmail}) is not registered for a specific role.`);
    }
    updateUI();
}


/**
 * Handles user logout.
 */
function handleLogout() {
    appState.currentUser = null;
    google.accounts.id.disableAutoSelect();
    console.log("User logged out.");
    updateUI();
}


// --- EVENT LISTENER SETUP ---
function setupEventListeners() {
    const dashboardLink = document.getElementById('dashboard-link');
    dashboardLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser && appState.currentUser.role !== 'guest') {
            const viewId = appState.currentUser.role === 'admin' ? 'admin-dashboard-view' : 'member-dashboard-view';
            showView(viewId);
        }
    });

    // Admin dashboard cards
    document.getElementById('admin-manage-vendors').addEventListener('click', showAdminVendorsView);
    
    // Back links
    document.querySelector('#admin-manage-vendors-view .back-link').addEventListener('click', (e) => {
        e.preventDefault();
        showView('admin-dashboard-view');
    });

    // Vendor form submission
    document.getElementById('vendor-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const vendorId = document.getElementById('vendorId-input').value;
        
        // UPDATED: Collect data from all new form fields
        const vendorData = {
            vendorName: document.getElementById('vendorName-input').value,
            address: document.getElementById('address-input').value,
            contactNo: document.getElementById('contactNo-input').value,
            contactEmail: document.getElementById('contactEmail-input').value,
        };

        if (vendorId) {
            vendorData.vendorId = vendorId;
            await updateVendor(vendorData, userEmail); // Pass email
        } else {
            await addVendor(vendorData, userEmail); // Pass email
        }
        
        alert('Vendor saved successfully!');
        clearVendorForm();
        showAdminVendorsView();
    });


    // Vendor form clear button
    document.getElementById('vendor-form-clear').addEventListener('click', clearVendorForm);

    // Listener for Modify/Delete buttons in the vendors grid (Event Delegation)
    const vendorsGrid = document.getElementById('vendors-grid');

    vendorsGrid.addEventListener('click', async (e) => {
        const target = e.target;
        const vendorId = target.dataset.id;
        if (!vendorId) return; // Exit if the click wasn't on a button with a data-id

        const rowNode = vendorsGridOptions.api.getRowNode(vendorId);
        const userEmail = appState.currentUser.email;

        if (target.classList.contains('btn-modify')) {
            populateVendorForm(rowNode.data);
        }

        if (target.classList.contains('btn-deactivate')) {
            if (confirm(`Are you sure you want to DEACTIVATE vendor ${vendorId}?`)) {
                await setVendorStatus(vendorId, false, userEmail); // Set isActive to false
                showAdminVendorsView();
            }
        }

        if (target.classList.contains('btn-activate')) {
            if (confirm(`Are you sure you want to ACTIVATE vendor ${vendorId}?`)) {
                await setVendorStatus(vendorId, true, userEmail); // Set isActive to true
                showAdminVendorsView();
            }
        }
    });


    document.getElementById('admin-manage-products').addEventListener('click', showAdminProductsView);
    
    document.querySelector('#admin-manage-products-view .back-link').addEventListener('click', (e) => {
        e.preventDefault();
        showView('admin-dashboard-view');
    });
}

function initializeApp() {
    console.log("ag-Grid is ready. Initializing application...");
    
    // 1. Initialize Grids now that we know agGrid is available
    initializeGrids();
    
    // 2. Set up all our button clicks and navigation
    setupEventListeners();
    
    // 3. Render the initial UI state
    updateUI();
    
    // 4. Initialize the Google Sign-In button
    google.accounts.id.initialize({
        client_id: "713239097105-tpveo8brjt63epqodgm7pojvj5nadps9.apps.googleusercontent.com", // <-- PASTE YOUR CLIENT ID HERE
        callback: window.handleCredentialResponse
    });
    
    // 5. Render the Google button or the logout button
    renderAuthUI();
}


// --- APPLICATION ENTRY POINT ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Initializing...");

    // THE FIX: Register the ag-Grid Community modules to enable all features.
    ModuleRegistry.registerModules([AllCommunityModule]);

    // Initialize everything else in a clean order
    initializeGrids();
    setupEventListeners();
    
    // Initialize Google Sign-In
    google.accounts.id.initialize({
        client_id: "713239097105-tpveo8brjt63epqodgm7pojvj5nadps9.apps.googleusercontent.com", // <-- PASTE YOUR CLIENT ID HERE
        callback: window.handleCredentialResponse
    });

    // Render the initial UI (which includes the auth buttons)
    updateUI();
});

// We need to export handleLogout so ui.js can attach it to the button
export { handleLogout };
