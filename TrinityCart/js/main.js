import { appState } from './state.js';
import { updateUI, showView, initializeGrids, showAdminProductsView, renderAuthUI } from './ui.js';

// --- MOCK USER DATA ---
const authorizedUsers = {
    'stsebastianschurchupdates@gmail.com': { name: 'John Doe', role: 'member' },
    'ciscoibmpoc@gmail.com': { name: 'Admin Alice', role: 'admin' }
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
    console.log("Encoded JWT ID token: " + response.credential);
    const payload = parseJwt(response.credential);

    // Get user info from the token
    const userEmail = payload.email;
    const userName = payload.name;
    
    // --- BACKEND SIMULATION ---
    // Check if the logged-in user is authorized in our "database"
    if (authorizedUsers[userEmail]) {
        appState.currentUser = {
            name: userName,
            email: userEmail,
            role: authorizedUsers[userEmail].role // Assign role from our list
        };
        console.log(`User ${userName} logged in with role: ${appState.currentUser.role}`);
    } else {
        // This user is not in our system
        appState.currentUser = {
            name: userName,
            email: userEmail,
            role: 'guest' // Assign a default, non-privileged role
        };
        alert(`Welcome, ${userName}! Your email (${userEmail}) is not registered for a specific role.`);
    }

    updateUI();
}


/**
 * Handles user logout.
 */
function handleLogout() {
    // Clear our application's user state
    appState.currentUser = null;
    
    // Optional: Tell Google to not automatically select the previous account on next visit.
    google.accounts.id.disableAutoSelect();

    console.log("User logged out.");
    updateUI();
}


// --- EVENT LISTENER SETUP ---
function setupEventListeners() {
    // We now add the logout listener dynamically in ui.js
    // Main dashboard link
    const dashboardLink = document.getElementById('dashboard-link');
    dashboardLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser && appState.currentUser.role !== 'guest') {
            const viewId = appState.currentUser.role === 'admin' ? 'admin-dashboard-view' : 'member-dashboard-view';
            showView(viewId);
        }
    });

    // Admin dashboard cards
    document.getElementById('admin-manage-products').addEventListener('click', showAdminProductsView);
    
    // Back links
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

/**
 * This function waits for the ag-Grid library to be loaded before starting the app.
 */
function waitForAgGridAndInitialize() {
    // Check every 100ms
    const interval = setInterval(() => {
        // If the window.agGrid object exists, the library is loaded.
        if (window.agGrid) {
            // Stop checking
            clearInterval(interval);
            // Start the main application
            initializeApp();
        } else {
            console.log("Waiting for ag-Grid to load...");
        }
    }, 100);
}

// --- APPLICATION ENTRY POINT ---
document.addEventListener('DOMContentLoaded', () => {
    // Instead of starting the app directly, we start the waiting process.
    waitForAgGridAndInitialize();
});

// We need to export handleLogout so ui.js can attach it to the button
export { handleLogout };
