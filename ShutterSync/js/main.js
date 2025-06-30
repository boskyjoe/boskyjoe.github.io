// js/main.js

// Import all application modules.
// These modules should be designed with named exports (e.g., export const Auth = { ... })
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
 * This module orchestrates Firebase setup (receiving initialized instances),
 * module loading, and global UI updates.
 * It is designed to be imported as a default ES module by index.html.
 */
const Main = {
    firebaseApp: null,
    db: null,
    auth: null,
    currentModule: null,
    moduleInstances: {}, // Stores initialized module instances
    moduleDestroyers: {}, // Stores module destroy functions for cleanup
    _isInitialAuthReady: false, // Flag to ensure initial module load only happens once via onAuthReady

    /**
     * Initializes the Main application controller.
     * This method is called by the inline script in index.html,
     * passing the initialized Firebase instances and application ID.
     *
     * @param {object} firebaseApp - The Firebase App instance.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {string} appId - The application ID.
     */
    init: function(firebaseApp, firestoreDb, firebaseAuth, appId) {
        this.firebaseApp = firebaseApp;
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        console.log("Main module initialized with Firebase instances.");

        // Initialize Utils first as it's a core dependency and needs db/auth
        Utils.init(this.db, this.auth, appId);

        // Initialize Auth module. It sets up onAuthStateChanged listener
        Auth.init(this.db, this.auth, Utils);

        // Initialize other modules, passing their dependencies
        this.moduleInstances.home = Home;
        Home.init(this.db, this.auth, Utils);
        // Home module needs a way to trigger Main's loadModule
        Home.loadModuleCallback = this.loadModule.bind(this);

        this.moduleInstances.customers = Customers;
        Customers.init(this.db, this.auth, Utils);

        this.moduleInstances.opportunities = Opportunities;
        Opportunities.init(this.db, this.auth, Utils);

        this.moduleInstances.users = Users;
        Users.init(this.db, this.auth, Utils);

        this.moduleInstances.adminData = AdminData;
        AdminData.init(this.db, this.auth, Utils);

        this.moduleInstances.priceBook = PriceBook;
        PriceBook.init(this.db, this.auth, Utils);

        // Ensure global UI elements are updated when auth status or admin status changes
        // Auth.onAuthReady ensures initial setup after Firebase Auth has determined user state
        Auth.onAuthReady(() => {
            // This callback fires ONLY after the initial authentication state (logged in/out, role) is determined.
            if (!this._isInitialAuthReady) {
                this._isInitialAuthReady = true; // Mark as done for first load

                this.updateUserHeaderUI(this.auth.currentUser);
                this.updateNavAdminDropdown();

                // This is the SOLE place for the initial module load.
                const lastActiveModule = localStorage.getItem('lastActiveModule');
                if (Auth.isLoggedIn() && lastActiveModule && lastActiveModule !== 'home') {
                     // Try to load it. If access is denied by module's own check, it will redirect to home.
                    this.loadModule(lastActiveModule);
                } else {
                    this.loadModule('home');
                }
            } else {
                // For subsequent auth state changes (e.g., after login/logout), just update UI
                this.updateUserHeaderUI(this.auth.currentUser);
                this.updateNavAdminDropdown();
            }
        });

        // Utils.onAdminStatusChange updates UI elements that depend on admin role
        Utils.onAdminStatusChange(() => {
            this.updateNavAdminDropdown();
            // If the current module is admin-gated and role changed, re-render it
            // This ensures if an admin demotes themselves or is demoted by another admin,
            // they are kicked out of admin modules.
            if (this.currentModule && ['users', 'adminData', 'priceBook'].includes(this.currentModule) && !Utils.isAdmin()) {
                this.loadModule('home'); // Redirect to home if admin privilege is lost
            } else if (this.currentModule && ['users', 'adminData', 'priceBook'].includes(this.currentModule)) {
                 // Re-render admin page if admin status changes (e.g. from standard to admin by another admin)
                 this.loadModule(this.currentModule);
            }
        });
        // Important: No direct loadModule call here, must wait for Auth.onAuthReady.
    },

    /**
     * Sets the module destroyer functions. Called once by the inline script in index.html.
     * @param {object} destroyersMap - An object mapping module names to their destroy functions.
     */
    setModuleDestroyers: function(destroyersMap) {
        this.moduleDestroyers = destroyersMap;
    },

    /**
     * Loads a specified application module into the content area.
     * @param {string} moduleName - The name of the module to load ('home', 'customers', etc.).
     */
    loadModule: function(moduleName) {
        // Cleanup the previously loaded module if any
        if (this.currentModule && this.moduleDestroyers[this.currentModule]) {
            this.moduleDestroyers[this.currentModule]();
        }

        // Hide all module content areas first
        document.querySelectorAll('.module-content-area').forEach(div => {
            div.classList.add('hidden'); // Hide all module divs
            // IMPORTANT: Do NOT clear innerHTML of ALL divs here.
            // Only the *currently active* module's div will be cleared below.
        });

        // Deactivate all nav links first (removes active styling)
        document.querySelectorAll('nav a[data-module]').forEach(link => {
            link.classList.remove('bg-gray-700', 'text-white');
            link.classList.add('text-gray-300', 'hover:bg-gray-700', 'hover:text-white');
        });
        const adminDropdownButton = document.querySelector('#nav-admin-dropdown > button');
        if (adminDropdownButton) {
            adminDropdownButton.classList.remove('bg-gray-700', 'text-white');
            adminDropdownButton.classList.add('text-gray-300', 'hover:bg-gray-700', 'hover:text-white');
        }


        // Activate the current nav link (if it's a direct nav link)
        const activeLink = document.querySelector(`nav a[data-module="${moduleName}"]`);
        if (activeLink) {
            activeLink.classList.add('bg-gray-700', 'text-white');
            activeLink.classList.remove('text-gray-300', 'hover:bg-gray-700', 'hover:text-white');
        } else {
            // If it's an admin module accessed via dropdown, activate the dropdown button itself
            if (['users', 'adminData', 'priceBook'].includes(moduleName)) {
                 if (adminDropdownButton) {
                    adminDropdownButton.classList.add('bg-gray-700', 'text-white');
                    adminDropdownButton.classList.remove('text-gray-300', 'hover:bg-gray-700', 'hover:text-white');
                }
            }
        }


        // Load the new module
        if (this.moduleInstances[moduleName]) {
            this.currentModule = moduleName;
            localStorage.setItem('lastActiveModule', moduleName); // Remember for next session
            console.log(`Loading module: ${moduleName}`);

            // Get the specific module's content div
            const moduleContentDiv = document.getElementById(`${moduleName}-module-content`);
            if (moduleContentDiv) {
                moduleContentDiv.classList.remove('hidden'); // Make the active module's div visible
                moduleContentDiv.innerHTML = ''; // IMPORTANT: Clear only THIS specific div's content
            } else {
                console.error(`Specific content div '${moduleName}-module-content' not found.`);
                Utils.showMessage("Internal error: Module content area missing. Redirected to Home.", "error");
                this.loadModule('home');
                return;
            }

            // Construct the render method name (e.g., renderHomeUI, renderAdminDataUI)
            // Special handling for 'admin-data' to remove hyphen for method name
            const renderMethodName = `render${moduleName.charAt(0).toUpperCase() + moduleName.slice(1).replace('-', '')}UI`;

            if (typeof this.moduleInstances[moduleName][renderMethodName] === 'function') {
                // Pass the moduleContentDiv element directly to the render function
                this.moduleInstances[moduleName][renderMethodName](moduleContentDiv);
            } else {
                console.error(`Render method "${renderMethodName}" not found for module "${moduleName}".`);
                this.loadModule('home'); // Fallback to home if render method is missing
                Utils.showMessage("Error loading module. Redirected to Home.", "error");
            }
        } else {
            console.error(`Module "${moduleName}" not found.`);
            this.loadModule('home'); // Fallback to home if module doesn't exist
            Utils.showMessage("Module not found. Redirected to Home.", "error");
        }
    },

    /**
     * Updates the user info in the header (display name/email and logout button).
     * This is called by Auth.onAuthReady and by Main's init.
     * @param {object|null} currentUser - The Firebase User object or null.
     */
    updateUserHeaderUI: function(currentUser) {
        const userInfoSpan = document.getElementById('user-info-span');
        const loginRegisterPlaceholder = document.getElementById('login-register-placeholder');
        const logoutBtn = document.getElementById('logout-btn');

        if (userInfoSpan && loginRegisterPlaceholder && logoutBtn) {
            if (currentUser) {
                userInfoSpan.textContent = currentUser.displayName || currentUser.email || 'Logged In';
                userInfoSpan.classList.remove('hidden');
                loginRegisterPlaceholder.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
            } else {
                userInfoSpan.textContent = '';
                userInfoSpan.classList.add('hidden');
                loginRegisterPlaceholder.classList.remove('hidden');
                logoutBtn.classList.add('hidden');
            }
        }
    },

    /**
     * Updates the visibility of the Admin navigation dropdown based on user role.
     * This is called by Auth.onAuthReady and by Utils.onAdminStatusChange.
     */
    updateNavAdminDropdown: function() {
        const adminNavDropdown = document.getElementById('nav-admin-dropdown');
        if (adminNavDropdown) {
            if (Utils.isAdmin()) {
                adminNavDropdown.classList.remove('hidden');
            } else {
                adminNavDropdown.classList.add('hidden');
            }
        } else {
            console.warn("Admin navigation dropdown element not found: #nav-admin-dropdown");
        }
    }
};

export default Main;
