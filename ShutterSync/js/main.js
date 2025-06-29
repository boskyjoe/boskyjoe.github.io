// js/main.js

// Using export default for consistency with index.html import
export default {
    db: null,
    auth: null,
    appId: null,
    initialAuthToken: null,
    moduleDestroyers: {}, // Stores functions to destroy/unsubscribe modules

    /**
     * Initializes the Main application module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {string} appId - The application ID.
     * @param {string|null} initialAuthToken - Firebase custom auth token.
     */
    init: function(firestoreDb, firebaseAuth, appId, initialAuthToken) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.appId = appId;
        this.initialAuthToken = initialAuthToken;
        console.log("Main module initialized.");

        // Attach an Auth state change listener to update UI on login/logout
        this.auth.onAuthStateChanged(user => {
            if (user) {
                // User is signed in.
                this.updateUserHeaderUI(user);
            } else {
                // User is signed out.
                this.updateUserHeaderUI(null);
            }
        });
    },

    /**
     * Loads a specific module's UI into the content area.
     * @param {string} moduleName - The name of the module to load (e.g., 'customers', 'opportunities').
     */
    loadModule: async function(moduleName) {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) {
            console.error("Content area not found.");
            return;
        }

        // Destroy previous module's listeners/instances if any
        const lastActiveModule = localStorage.getItem('lastActiveModule');
        if (lastActiveModule && this.moduleDestroyers[lastActiveModule]) {
            console.log(`Destroying ${lastActiveModule} module.`);
            this.moduleDestroyers[lastActiveModule]();
        }

        contentArea.innerHTML = '<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i><p class="mt-4 text-gray-700">Loading module...</p></div>';

        try {
            switch (moduleName) {
                case 'customers':
                    // Customers module is already imported and initialized in index.html
                    // Just clear the content and let its renderCustomersUI take over
                    contentArea.innerHTML = '<div id="customers-module-content"></div>';
                    // Re-initialize or ensure re-render (it auto-renders via listener)
                    Customers.renderCustomersUI();
                    Customers.setupRealtimeListener();
                    break;
                case 'opportunities':
                    contentArea.innerHTML = '<div id="opportunities-module-content"></div>';
                    Opportunities.renderOpportunitiesUI();
                    Opportunities.setupRealtimeListener();
                    break;
                case 'users':
                    // Check if current user is admin before rendering for users module
                    if (!Utils.isAdmin()) {
                         contentArea.innerHTML = `
                            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                                <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                                <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                            </div>
                        `;
                        localStorage.setItem('lastActiveModule', 'customers'); // Redirect to default if access denied
                        Utils.showMessage("Access Denied: You must be an Admin to view User Management.", "error");
                        return; // Stop execution
                    }
                    contentArea.innerHTML = '<div id="users-module-content"></div>';
                    Users.renderUsersUI(); // This will render based on isAdmin status inside its own logic
                    Users.setupRealtimeListener(); // This will also only run if isAdmin
                    break;
                case 'admin-data':
                    if (!Utils.isAdmin()) {
                        contentArea.innerHTML = `
                            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                                <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                                <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                            </div>
                        `;
                        localStorage.setItem('lastActiveModule', 'customers');
                        Utils.showMessage("Access Denied: You must be an Admin to view App Metadata.", "error");
                        return;
                    }
                    contentArea.innerHTML = '<div id="admin-data-module-content"></div>';
                    AdminData.renderAdminDataUI();
                    AdminData.setupRealtimeListeners();
                    break;
                case 'price-book':
                    if (!Utils.isAdmin()) {
                        contentArea.innerHTML = `
                            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                                <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                                <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                            </div>
                        `;
                        localStorage.setItem('lastActiveModule', 'customers');
                        Utils.showMessage("Access Denied: You must be an Admin to view Price Books.", "error");
                        return;
                    }
                    contentArea.innerHTML = '<div id="price-book-module-content"></div>';
                    PriceBook.renderPriceBookUI();
                    PriceBook.setupRealtimeListener();
                    break;
                default:
                    contentArea.innerHTML = `<p class="text-red-500">Module "${moduleName}" not found.</p>`;
                    return;
            }
            localStorage.setItem('lastActiveModule', moduleName);
            console.log(`Module "${moduleName}" loaded.`);

            // Ensure Admin status changes trigger UI updates (e.g., hiding/showing admin links)
            // This listener is crucial for dynamic access control display
            Utils.onAdminStatusChange(() => {
                this.updateAdminLinksVisibility();
            });

        } catch (error) {
            console.error(`Failed to load module ${moduleName}:`, error);
            contentArea.innerHTML = `<p class="text-red-500">Error loading module: ${error.message}</p>`;
            Utils.showMessage(`Error loading ${moduleName} module.`, 'error');
        }
    },

    /**
     * Sets the module destroy functions. Called by index.html script.
     * @param {object} destroyers - An object mapping module names to their destroy functions.
     */
    setModuleDestroyers: function(destroyers) {
        this.moduleDestroyers = destroyers;
    },

    /**
     * Updates the user information display in the navigation bar.
     * @param {object|null} user - The Firebase User object or null if logged out.
     */
    updateUserHeaderUI: function(user) {
        const userDisplayNameElem = document.getElementById('user-display-name');
        const userIconContainer = document.getElementById('user-icon-container');
        const logoutBtn = document.getElementById('logout-btn');

        if (userDisplayNameElem && userIconContainer && logoutBtn) {
            if (user) {
                const displayName = user.displayName || user.email || 'Guest';
                userDisplayNameElem.textContent = displayName;
                userIconContainer.innerHTML = `<i class="fas fa-user-circle text-2xl"></i>`; // User icon
                userDisplayNameElem.classList.remove('hidden');
                userIconContainer.classList.remove('hidden');
                logoutBtn.classList.remove('hidden');
            } else {
                userDisplayNameElem.textContent = '';
                userIconContainer.innerHTML = ''; // Clear icon
                userDisplayNameElem.classList.add('hidden');
                userIconContainer.classList.add('hidden');
                logoutBtn.classList.add('hidden'); // Hide logout button
            }
        }
        // Always update visibility of Admin links based on current status
        this.updateAdminLinksVisibility();
    },

    /**
     * Updates the visibility of Admin-related navigation links based on user role.
     */
    updateAdminLinksVisibility: function() {
        const adminDropdown = document.querySelector('.group .relative'); // The div containing the Admin button and dropdown
        if (adminDropdown) {
            if (Utils.isAdmin()) {
                adminDropdown.classList.remove('hidden');
            } else {
                adminDropdown.classList.add('hidden');
            }
        }
    }
};
