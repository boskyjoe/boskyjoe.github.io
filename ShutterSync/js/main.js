// js/main.js

import { Auth } from './auth.js';
import { Utils } from './utils.js';
import { Customers } from './customers.js';
import { Opportunities } from './opportunities.js';
import { Users } from './users.js';
import { AdminData } from './admin_data.js';
import { PriceBook } from './price_book.js';
import { Home } from './home.js'; // NEW: Import the Home module

export default {
    db: null,
    auth: null,
    appId: null,
    initialAuthToken: null,
    moduleDestroyers: {},

    init: function(firestoreDb, firebaseAuth, appId, initialAuthToken) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.appId = appId;
        this.initialAuthToken = initialAuthToken;
        console.log("Main module initialized.");

        this.auth.onAuthStateChanged(user => {
            if (user) {
                this.updateUserHeaderUI(user);
            } else {
                this.updateUserHeaderUI(null);
            }
        });
    },

    loadModule: async function(moduleName) {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) {
            console.error("Content area not found.");
            return;
        }

        const lastActiveModule = localStorage.getItem('lastActiveModule');
        if (lastActiveModule && this.moduleDestroyers[lastActiveModule]) {
            console.log(`Destroying ${lastActiveModule} module.`);
            this.moduleDestroyers[lastActiveModule]();
        }

        contentArea.innerHTML = '<div class="text-center p-8"><i class="fas fa-spinner fa-spin text-4xl text-blue-500"></i><p class="mt-4 text-gray-700">Loading module...</p></div>';

        try {
            switch (moduleName) {
                case 'home': // NEW: Case for Home module
                    contentArea.innerHTML = '<div id="home-module-content"></div>';
                    Home.renderHomeUI();
                    break;
                case 'customers':
                    contentArea.innerHTML = '<div id="customers-module-content"></div>';
                    Customers.renderCustomersUI();
                    break;
                case 'opportunities':
                    contentArea.innerHTML = '<div id="opportunities-module-content"></div>';
                    Opportunities.renderOpportunitiesUI();
                    break;
                case 'users':
                    if (!Utils.isAdmin()) {
                         contentArea.innerHTML = `
                            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                                <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                                <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                            </div>
                        `;
                        localStorage.setItem('lastActiveModule', 'home'); // Redirect to home if access denied
                        Utils.showMessage("Access Denied: You must be an Admin to view User Management.", "error");
                        return;
                    }
                    contentArea.innerHTML = '<div id="users-module-content"></div>';
                    Users.renderUsersUI();
                    break;
                case 'admin-data':
                    if (!Utils.isAdmin()) {
                        contentArea.innerHTML = `
                            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                                <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                                <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                            </div>
                        `;
                        localStorage.setItem('lastActiveModule', 'home'); // Redirect to home if access denied
                        Utils.showMessage("Access Denied: You must be an Admin to view App Metadata.", "error");
                        return;
                    }
                    contentArea.innerHTML = '<div id="admin-data-module-content"></div>';
                    AdminData.renderAdminDataUI();
                    break;
                case 'price-book':
                    if (!Utils.isAdmin()) {
                        contentArea.innerHTML = `
                            <div class="bg-white p-6 rounded-lg shadow-md text-center">
                                <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                                <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                            </div>
                        `;
                        localStorage.setItem('lastActiveModule', 'home'); // Redirect to home if access denied
                        Utils.showMessage("Access Denied: You must be an Admin to view Price Books.", "error");
                        return;
                    }
                    contentArea.innerHTML = '<div id="price-book-module-content"></div>';
                    PriceBook.renderPriceBookUI();
                    break;
                case 'events':
                    contentArea.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center">
                                                <h3 class="text-2xl font-semibold text-gray-800 mb-4">Events</h3>
                                                <p class="text-gray-600">Events module is not yet implemented.</p>
                                            </div>`;
                    localStorage.setItem('lastActiveModule', moduleName);
                    break;
                default:
                    contentArea.innerHTML = `<p class="text-red-500">Module "${moduleName}" not found.</p>`;
                    return;
            }
            localStorage.setItem('lastActiveModule', moduleName);
            console.log(`Module "${moduleName}" loaded.`);

            // Pass Main.loadModule to Home if Home needs to call it (for internal buttons)
            // This is a more robust way to allow sub-modules to trigger navigation.
            if (moduleName === 'home') {
                Home.loadModuleCallback = this.loadModule.bind(this);
            }

            Utils.onAdminStatusChange(() => {
                this.updateAdminLinksVisibility();
            });

        } catch (error) {
            console.error(`Failed to load module ${moduleName}:`, error);
            contentArea.innerHTML = `<p class="text-red-500">Error loading module: ${error.message}</p>`;
            Utils.showMessage(`Error loading ${moduleName} module.`, 'error');
        }
    },

    setModuleDestroyers: function(destroyers) {
        this.moduleDestroyers = destroyers;
    },

    updateUserHeaderUI: function(user) {
        const userDisplayNameElem = document.getElementById('user-display-name');
        const userIconContainer = document.getElementById('user-icon-container');
        const logoutBtn = document.getElementById('logout-btn');

        if (userDisplayNameElem && userIconContainer && logoutBtn) {
            if (user) {
                const displayName = user.displayName || user.email || 'Guest';
                userDisplayNameElem.textContent = displayName;
                userIconContainer.innerHTML = `<i class="fas fa-user-circle text-2xl"></i>`;
                userDisplayNameElem.classList.remove('hidden');
                userIconContainer.classList.remove('hidden');
                logoutBtn.classList.remove('hidden');
            } else {
                userDisplayNameElem.textContent = '';
                userIconContainer.innerHTML = '';
                userDisplayNameElem.classList.add('hidden');
                userIconContainer.classList.add('hidden');
                logoutBtn.classList.add('hidden');
            }
        }
        this.updateAdminLinksVisibility();
    },

    updateAdminLinksVisibility: function() {
        const adminDropdown = document.querySelector('.group .relative');
        if (adminDropdown) {
            if (Utils.isAdmin()) {
                adminDropdown.classList.remove('hidden');
            } else {
                adminDropdown.classList.add('hidden');
            }
        }
    }
};
