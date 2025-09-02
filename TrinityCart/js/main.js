import { appState } from './state.js';
import { updateUI, showView, initializeGrids, showAdminProductsView } from './ui.js';

// --- MOCK USER DATA ---
const mockUsers = {
    member: { name: 'John Doe', email: 'john.doe@example.com', role: 'member' },
    admin: { name: 'Admin Alice', email: 'admin.alice@example.com', role: 'admin' }
};

// --- EVENT HANDLER FUNCTIONS ---
function handleLogin() {
    const role = prompt("Simulate login. Enter role: 'admin' or 'member'");
    if (role === 'admin') {
        appState.currentUser = mockUsers.admin;
    } else if (role === 'member') {
        appState.currentUser = mockUsers.member;
    } else {
        return; // Do nothing if prompt is cancelled or invalid
    }
    updateUI();
}

function handleLogout() {
    appState.currentUser = null;
    updateUI();
}

function setupEventListeners() {
    // Auth button
    const authButton = document.getElementById('auth-button');
    authButton.addEventListener('click', () => {
        appState.currentUser ? handleLogout() : handleLogin();
    });

    // Main dashboard link
    const dashboardLink = document.getElementById('dashboard-link');
    dashboardLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) {
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

// --- APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Application Initializing...");
    initializeGrids();
    setupEventListeners();
    updateUI(); // Set the initial view
});
