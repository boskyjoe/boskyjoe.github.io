// js/main.js

// Import all modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { Auth } from './auth.js';
import { Utils } from './utils.js';
import { Home } from './home.js';
import { Customers } from './customers.js';
import { Opportunities } from './opportunities.js';
import { Users } from './users.js';
import { AdminData } from './admin_data.js';
import { PriceBook } from './price_book.js';

/**
 * The main application controller.
 * Handles Firebase initialization, module loading, and global UI updates.
 */
window.Main = {
    firebaseApp: null,
    db: null,
    auth: null,
    currentModule: null,
    moduleInstances: {}, // Store initialized module instances
    moduleDestroyers: {}, // Store module destroy functions for cleanup

    /**
     * Initializes Firebase and all application modules.
     * This is the entry point of the application.
     */
    init: function() {
        // Firebase configuration (replace with your actual config)
        const firebaseConfig = {
            apiKey: "YOUR_FIREBASE_API_KEY", // Make sure this is replaced with your actual key
            authDomain: "shuttersync-96971.firebaseapp.com",
            projectId: "shuttersync-96971",
            storageBucket: "shuttersync-96971.appspot.com",
            messagingSenderId: "305141201552",
            appId: "1:305141201552:web:127d14d23580a568218d6e",
            measurementId: "G-G998B500C5"
        };

        this.firebaseApp = initializeApp(firebaseConfig);
        this.db = getFirestore(this.firebaseApp);
        this.auth = getAuth(this.firebaseApp);

        // Initialize Utils module first, as others depend on it for error handling etc.
        Utils.init(this.db, this.auth);

        // Initialize Auth module
        Auth.init(this.db, this.auth, Utils);

        // Initialize other modules
        this.moduleInstances.home = Home;
        Home.init(this.db, this.auth, Utils);
        Home.loadModuleCallback = this.loadModule.bind(this); // Pass loadModule to Home module

        this.moduleInstances.customers = Customers;
        Customers.init(this.db, this.auth, Utils);
        this.moduleDestroyers.customers = Customers.destroy.bind(Customers);

        this.moduleInstances.opportunities = Opportunities;
        Opportunities.init(this.db, this.auth, Utils);
        this.moduleDestroyers.opportunities = Opportunities.destroy.bind(Opportunities);

        this.moduleInstances.users = Users;
        Users.init(this.db, this.auth, Utils);
        this.moduleDestroyers.users = Users.destroy.bind(Users);

        this.moduleInstances.adminData = AdminData;
        AdminData.init(this.db, this.auth, Utils);
        this.moduleDestroyers.adminData = AdminData.destroy.bind(AdminData);

        this.moduleInstances.priceBook = PriceBook;
        PriceBook.init(this.db, this.auth, Utils);
        this.moduleDestroyers.priceBook = PriceBook.destroy.bind(PriceBook);

        // Attach global event listeners
        this.attachGlobalEventListeners();

        // Initial UI update based on auth state
        Auth.onAuthReady(() => {
            this.updateUIForAuthStatus();
            // Load the last active module or default to home
            const lastActiveModule = localStorage.getItem('lastActiveModule');
            if (Auth.isLoggedIn() && lastActiveModule && lastActiveModule !== 'home') {
                 // Try to load it, but if access is denied, it will redirect to home
                this.loadModule(lastActiveModule);
            } else {
                this.loadModule('home');
            }
        });

        // Listen for admin status changes from Utils to re-render UI
        Utils.onAdminStatusChange(() => {
            this.updateUIForAuthStatus();
            // If the current module is admin-gated and status changed, re-render it
            if (this.currentModule && ['users', 'adminData', 'priceBook'].includes(this.currentModule)) {
                this.loadModule(this.currentModule);
            }
        });
    },

    /**
     * Loads a specified application module.
     * @param {string} moduleName - The name of the module to load ('home', 'customers', etc.).
     */
    loadModule: function(moduleName) {
        // Cleanup the previously loaded module if any
        if (this.currentModule && this.moduleDestroyers[this.currentModule]) {
            this.moduleDestroyers[this.currentModule]();
        }

        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.innerHTML = ''; // Clear previous content
        }

        // Deactivate all nav links first
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('bg-gray-700', 'text-white');
            link.classList.add('text-gray-300', 'hover:bg-gray-700', 'hover:text-white');
        });

        // Activate the current nav link
        const activeLink = document.querySelector(`nav a[data-module="${moduleName}"]`);
        if (activeLink) {
            activeLink.classList.add('bg-gray-700', 'text-white');
            activeLink.classList.remove('text-gray-300', 'hover:bg-gray-700', 'hover:text-white');
        }

        // Load the new module
        if (this.moduleInstances[moduleName]) {
            this.currentModule = moduleName;
            localStorage.setItem('lastActiveModule', moduleName); // Remember for next session
            console.log(`Loading module: ${moduleName}`);
            // All modules now have a render*UI method (e.g., renderHomeUI)
            const renderMethodName = `render${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}UI`;
            if (typeof this.moduleInstances[moduleName][renderMethodName] === 'function') {
                this.moduleInstances[moduleName][renderMethodName]();
            } else {
                console.error(`Render method "${renderMethodName}" not found for module "${moduleName}".`);
                // Fallback to home if render method is missing
                this.loadModule('home');
                Utils.showMessage("Error loading module. Redirected to Home.", "error");
            }
        } else {
            console.error(`Module "${moduleName}" not found.`);
            this.loadModule('home'); // Fallback to home if module doesn't exist
            Utils.showMessage("Module not found. Redirected to Home.", "error");
        }
    },

    /**
     * Updates the global UI elements based on authentication status and user role.
     */
    updateUIForAuthStatus: function() {
        const isLoggedIn = Auth.isLoggedIn();
        const isAdmin = Utils.isAdmin();
        const currentUser = this.auth.currentUser;

        // User Info in Navbar
        const userInfoSpan = document.getElementById('user-info-span');
        const logoutBtn = document.getElementById('logout-btn');
        const loginRegisterPlaceholder = document.getElementById('login-register-placeholder');

        if (userInfoSpan) {
            if (isLoggedIn && currentUser) {
                userInfoSpan.textContent = currentUser.displayName || currentUser.email || 'Logged In';
                userInfoSpan.classList.remove('hidden');
                if (logoutBtn) logoutBtn.classList.remove('hidden');
                if (loginRegisterPlaceholder) loginRegisterPlaceholder.classList.add('hidden');
            } else {
                userInfoSpan.textContent = '';
                userInfoSpan.classList.add('hidden');
                if (logoutBtn) logoutBtn.classList.add('hidden');
                if (loginRegisterPlaceholder) loginRegisterPlaceholder.classList.remove('hidden');
            }
        }

        // --- FIX FOR ADMIN NAV DROPDOWN ---
        const adminNavDropdown = document.getElementById('nav-admin-dropdown');
        if (adminNavDropdown) {
            if (isAdmin) {
                adminNavDropdown.classList.remove('hidden');
            } else {
                adminNavDropdown.classList.add('hidden');
            }
        } else {
            console.warn("Admin navigation dropdown element not found: #nav-admin-dropdown");
        }
        // --- END FIX ---

        // Control visibility of other nav links if needed (currently all visible if logged in)
        // For example, if you want only specific links for logged-in users:
        // const protectedLinks = document.querySelectorAll('nav a[data-module]:not([data-module="home"])');
        // protectedLinks.forEach(link => {
        //     if (isLoggedIn) {
        //         link.classList.remove('hidden');
        //     } else {
        //         link.classList.add('hidden');
        //     }
        // });
    },

    /**
     * Attaches global event listeners to the navigation bar and logout button.
     */
    attachGlobalEventListeners: function() {
        // Navigation links
        document.querySelectorAll('nav a[data-module]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const moduleName = e.target.dataset.module;
                this.loadModule(moduleName);
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await Auth.logout();
                this.updateUIForAuthStatus(); // Update UI after logout
                this.loadModule('home'); // Always redirect to home after logout
            });
        }
    }
};

// Initialize the Main application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.Main.init();
});
