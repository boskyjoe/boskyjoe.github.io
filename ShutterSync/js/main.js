// js/main.js

// Import all application modules.
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
 * This module orchestrates Firebase setup, module loading, and global UI updates.
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
     * This method is now asynchronous and waits for Auth to be ready.
     *
     * @param {object} firebaseApp - The Firebase App instance.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {string} appId - The application ID.
     */
    init: async function(firebaseApp, firestoreDb, firebaseAuth, appId) { // Make init async
        this.firebaseApp = firebaseApp;
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        console.log("Main module initialized with Firebase instances.");

        // Initialize Utils first as it's a core dependency and needs db/auth
        Utils.init(this.db, this.auth, appId);

        // Await Auth.init to ensure onAuthStateChanged has had a chance to fire at least once.
        // Auth.init now returns a promise that resolves when auth state is determined.
        await Auth.init(this.db, this.auth, Utils);
        console.log("Main: Auth module reports initial state ready. Proceeding with Main initialization.");

        // Initialize other modules, passing their dependencies
        this.moduleInstances.home = Home;
        Home.init(this.db, this.auth, Utils);
        Home.loadModuleCallback = this.loadModule.bind(this); // Pass loadModule for Home's internal navigation

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

        // This Auth.onAuthReady will now primarily handle the *initial* module load,
        // and subsequent auth state changes (login/logout).
        Auth.onAuthReady((isLoggedIn, isAdmin, currentUser) => {
            console.log("Main: onAuthReady callback triggered."); // Added log
            if (!this._isInitialAuthReady) {
                this._isInitialAuthReady = true; // Mark as done for first load
                console.log("Main: onAuthReady (initial load) - isLoggedIn:", isLoggedIn, "isAdmin:", isAdmin, "currentUser:", currentUser ? currentUser.uid : "null");

                // Update header UI based on the resolved user
                this.updateUserHeaderUI(currentUser);
                // Update nav dropdown based on resolved admin status
                this.updateNavAdminDropdown();

                const lastActiveModule = localStorage.getItem('lastActiveModule');
                if (isLoggedIn && lastActiveModule && lastActiveModule !== 'home') {
                    // If logged in and had a last module, try to load it.
                    // Pass the definitive state here.
                    this.loadModule(lastActiveModule, isLoggedIn, isAdmin, currentUser);
                } else {
                    // Otherwise, load the home module.
                    // Pass the definitive state here.
                    this.loadModule('home', isLoggedIn, isAdmin, currentUser);
                }
            } else {
                // For subsequent auth state changes (e.g., after user explicitly logs in/out),
                // we need to *force reload* the current module (usually home) to reflect the new state.
                console.log("Main: onAuthReady (subsequent change) - isLoggedIn:", isLoggedIn, "isAdmin:", isAdmin, "currentUser:", currentUser ? currentUser.uid : "null");
                this.updateUserHeaderUI(currentUser);
                this.updateNavAdminDropdown();

                // *** CRITICAL FIX: Reload the current module to reflect the new auth state ***
                // Ensure this is called with the LATEST determined state.
                this.loadModule(this.currentModule || 'home', isLoggedIn, isAdmin, currentUser);
                console.log(`Main: Reloaded module '${this.currentModule || 'home'}' due to auth state change.`);
            }
        });

        // Utils.onAdminStatusChange updates UI elements that depend on admin role
        // This is for dynamic changes *after* initial load (e.g., role change by another admin)
        Utils.onAdminStatusChange((isAdminStatus) => {
            console.log("Main: Utils.onAdminStatusChange - new isAdmin status:", isAdminStatus);
            this.updateNavAdminDropdown();
            // If the current module is admin-gated and role changed, re-render it
            if (this.currentModule && ['users', 'adminData', 'priceBook'].includes(this.currentModule)) {
                if (!isAdminStatus) { // No longer admin
                     // If user was in an admin module and is no longer admin, redirect to home
                    this.loadModule('home', Auth.isLoggedIn(), isAdminStatus, Auth.getCurrentUser());
                } else { // Became admin
                     // If user becomes admin while on an admin-related page, refresh it
                    this.loadModule(this.currentModule, Auth.isLoggedIn(), isAdminStatus, Auth.getCurrentUser());
                }
            }
        });
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
     *
     * @param {string} moduleName - The name of the module to load ('home', 'customers', etc.).
     * @param {boolean} [isLoggedIn] - Optional: The current login status. Defaults to Auth.isLoggedIn().
     * @param {boolean} [isAdmin] - Optional: The current admin status. Defaults to Utils.isAdmin().
     * @param {object|null} [currentUser] - Optional: The current Firebase User object. Defaults to Auth.getCurrentUser().
     * These optional parameters are primarily passed from Auth.onAuthReady for the initial load,
     * ensuring the module receives the definitive state. For subsequent calls, they will default to live Auth/Utils values.
     */
    loadModule: function(moduleName, isLoggedIn = Auth.isLoggedIn(), isAdmin = Utils.isAdmin(), currentUser = Auth.getCurrentUser()) {
        console.log(`Main: Attempting to load module: ${moduleName} with isLoggedIn: ${isLoggedIn}, isAdmin: ${isAdmin}`);

        // Cleanup the previously loaded module if any
        if (this.currentModule && this.moduleDestroyers[this.currentModule]) {
            this.moduleDestroyers[this.currentModule]();
        }

        // Hide all module content areas first
        document.querySelectorAll('.module-content-area').forEach(div => {
            div.classList.add('hidden'); // Hide all module divs
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
            console.log(`Main: Loading module: ${moduleName}`);

            // Get the specific module's content div
            const moduleContentDiv = document.getElementById(`${moduleName}-module-content`);
            if (moduleContentDiv) {
                moduleContentDiv.classList.remove('hidden'); // Make the active module's div visible
                moduleContentDiv.innerHTML = ''; // IMPORTANT: Clear only THIS specific div's content
            } else {
                console.error(`Main: Specific content div '${moduleName}-module-content' not found.`);
                Utils.showMessage("Internal error: Module content area missing. Redirected to Home.", "error");
                this.loadModule('home', isLoggedIn, isAdmin, currentUser); // Recurse with home module
                return;
            }

            // Construct the render method name (e.g., renderHomeUI, renderAdminDataUI)
            const renderMethodName = `render${moduleName.charAt(0).toUpperCase() + moduleName.slice(1).replace('-', '')}UI`;

            if (typeof this.moduleInstances[moduleName][renderMethodName] === 'function') {
                // Pass the moduleContentDiv, and the explicit Auth state to the module's render function
                this.moduleInstances[moduleName][renderMethodName](
                    moduleContentDiv,
                    isLoggedIn,
                    isAdmin,
                    currentUser
                );
            } else {
                console.error(`Main: Render method "${renderMethodName}" not found for module "${moduleName}".`);
                this.loadModule('home', isLoggedIn, isAdmin, currentUser); // Recurse with home module
                Utils.showMessage("Error loading module. Redirected to Home.", "error");
            }
        } else {
            console.error(`Main: Module "${moduleName}" not found.`);
            this.loadModule('home', isLoggedIn, isAdmin, currentUser); // Recurse with home module
            Utils.showMessage("Module not found. Redirected to Home.", "error");
        }
    },

    /**
     * Updates the user info in the header (display name/email and logout button).
     * @param {object|null} currentUser - The Firebase User object or null.
     */
    updateUserHeaderUI: function(currentUser) {
        const userInfoSpan = document.getElementById('user-info-span');
        const loginRegisterPlaceholder = document.getElementById('login-register-placeholder');
        const logoutBtn = document.getElementById('logout-btn');

        console.log("Main: updateUserHeaderUI called with currentUser:", currentUser ? currentUser.uid : "null");
        console.log("Main: userInfoSpan element EXISTS:", !!userInfoSpan);
        console.log("Main: loginRegisterPlaceholder element EXISTS:", !!loginRegisterPlaceholder);
        console.log("Main: logoutBtn element EXISTS:", !!logoutBtn);


        if (userInfoSpan && loginRegisterPlaceholder && logoutBtn) {
            if (currentUser) {
                const userName = currentUser.displayName || currentUser.email || 'Logged In';
                userInfoSpan.textContent = userName;
                userInfoSpan.classList.remove('hidden');
                loginRegisterPlaceholder.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
                console.log(`Main: Header UI updated: Displaying "${userName}", loginPlaceholder hidden: ${loginRegisterPlaceholder.classList.contains('hidden')}, logoutBtn hidden: ${logoutBtn.classList.contains('hidden')}.`);
            } else {
                userInfoSpan.textContent = '';
                userInfoSpan.classList.add('hidden'); // Ensure it's hidden if no user
                loginRegisterPlaceholder.classList.remove('hidden');
                logoutBtn.classList.add('hidden');
                console.log(`Main: Header UI updated: User logged out. loginRegisterPlaceholder hidden: ${loginRegisterPlaceholder.classList.contains('hidden')}, logoutBtn hidden: ${logoutBtn.classList.contains('hidden')}.`);
            }
        } else {
            console.error("Main: Header UI elements not found. Cannot update header.");
        }
    },

    /**
     * Updates the visibility of the Admin navigation dropdown based on user role.
     */
    updateNavAdminDropdown: function() {
        const adminNavDropdown = document.querySelector('#nav-admin-dropdown'); // Select the button itself
        const adminDropdownContent = adminNavDropdown ? adminNavDropdown.nextElementSibling : null; // The div containing admin links

        console.log("Main: updateNavAdminDropdown called. Utils.isAdmin():", Utils.isAdmin());
        console.log("Main: adminNavDropdown button element EXISTS:", !!adminNavDropdown);
        console.log("Main: adminDropdownContent element EXISTS:", !!adminDropdownContent);


        if (adminNavDropdown && adminDropdownContent) {
            if (Utils.isAdmin()) {
                adminNavDropdown.classList.remove('hidden');
                console.log("Main: Admin dropdown button shown. ClassList:", adminNavDropdown.classList.toString());
            } else {
                adminNavDropdown.classList.add('hidden');
                adminDropdownContent.classList.add('hidden'); // Ensure content is also hidden if button is hidden
                console.log("Main: Admin dropdown button hidden, content hidden. ClassList:", adminNavDropdown.classList.toString());
            }
        } else {
            console.warn("Main: Admin navigation dropdown button or content element not found.");
        }
    },

    /**
     * Public method for logging out, exposed globally via window.Main.logout.
     */
    logout: async function() {
        console.log("Main: logout method called via window.Main.");
        await Auth.logout(); // Call the Auth module's logout function
    }
};

export default Main;
