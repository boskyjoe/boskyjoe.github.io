// js/admin_data.js

import { doc, getDoc, setDoc, updateDoc, collection, query, getCountFromServer, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The AdminData module handles displaying and managing application metadata.
 * This module is only accessible to users with the 'Admin' role.
 */
export const AdminData = {
    db: null,
    auth: null,
    Utils: null,

    /**
     * Initializes the AdminData module.
     * This method should only initialize core dependencies, not interact with the DOM yet.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("AdminData module initialized.");
    },

    /**
     * Renders the main UI for the Admin Data module.
     * This is called by Main.js when the 'admin-data' module is activated.
     */
    renderAdminDataUI: function() {
        const adminDataModuleContent = document.getElementById('admin-data-module-content');
        if (!adminDataModuleContent) {
            console.error("Admin Data module content area not found in DOM.");
            return;
        }

        if (this.Utils.isAdmin()) {
            adminDataModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-6">Application Metadata</h3>
                    <p class="text-sm text-gray-600 mb-4">View and manage application-wide settings and statistics.</p>

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                        <div class="bg-blue-50 p-4 rounded-lg shadow-sm">
                            <h4 class="text-lg font-medium text-blue-800 mb-2">Total Users</h4>
                            <p id="total-users" class="text-3xl font-bold text-blue-600">Loading...</p>
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg shadow-sm">
                            <h4 class="text-lg font-medium text-green-800 mb-2">Total Customers</h4>
                            <p id="total-customers" class="text-3xl font-bold text-green-600">Loading...</p>
                        </div>
                        <div class="bg-purple-50 p-4 rounded-lg shadow-sm">
                            <h4 class="text-lg font-medium text-purple-800 mb-2">Total Opportunities</h4>
                            <p id="total-opportunities" class="text-3xl font-bold text-purple-600">Loading...</p>
                        </div>
                    </div>

                    <div class="border-t border-gray-200 pt-6">
                        <h4 class="text-xl font-semibold text-gray-800 mb-4">App Settings</h4>
                        <form id="app-settings-form" class="space-y-4">
                            <div>
                                <label for="app-name" class="block text-sm font-medium text-gray-700 mb-1">Application Name</label>
                                <input type="text" id="app-name" name="appName"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div>
                                <label for="contact-email" class="block text-sm font-medium text-gray-700 mb-1">Support Contact Email</label>
                                <input type="email" id="contact-email" name="contactEmail"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="flex justify-end">
                                <button type="submit" id="save-settings-btn"
                                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                    Save Settings
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            // After rendering HTML, fetch data and attach event listeners
            this.fetchAppStatistics();
            this.fetchAppSettings();
            this.attachEventListeners();
        } else {
            adminDataModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                    <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                </div>
            `;
            console.log("Not an admin, skipping Admin Data UI.");
        }
    },

    /**
     * Fetches and displays application statistics (total users, customers, opportunities).
     */
    fetchAppStatistics: async function() {
        try {
            const usersCount = (await getCountFromServer(collection(this.db, 'users_data'))).data().count;
            const customersCount = (await getCountFromServer(collection(this.db, 'customers'))).data().count;
            const opportunitiesCount = (await getCountFromServer(collection(this.db, 'opportunities'))).data().count;

            document.getElementById('total-users').textContent = usersCount;
            document.getElementById('total-customers').textContent = customersCount;
            document.getElementById('total-opportunities').textContent = opportunitiesCount;

        } catch (error) {
            this.Utils.handleError(error, "fetching app statistics");
            document.getElementById('total-users').textContent = 'Error';
            document.getElementById('total-customers').textContent = 'Error';
            document.getElementById('total-opportunities').textContent = 'Error';
        }
    },

    /**
     * Fetches and pre-fills application settings from Firestore.
     */
    fetchAppSettings: async function() {
        try {
            const appSettingsDocRef = doc(this.db, 'app_metadata', 'settings');
            const docSnap = await getDoc(appSettingsDocRef);

            if (docSnap.exists()) {
                const settings = docSnap.data();
                document.getElementById('app-name').value = settings.appName || '';
                document.getElementById('contact-email').value = settings.contactEmail || '';
            } else {
                console.log("No app settings found, using defaults.");
                // Optionally set default values if no document exists
                document.getElementById('app-name').value = 'ShutterSync CRM';
                document.getElementById('contact-email').value = 'support@shuttersync.com';
            }
        } catch (error) {
            this.Utils.handleError(error, "fetching app settings");
        }
    },

    /**
     * Attaches event listeners for the Admin Data UI.
     */
    attachEventListeners: function() {
        const appSettingsForm = document.getElementById('app-settings-form');
        if (appSettingsForm) {
            appSettingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAppSettings();
            });
        }
    },

    /**
     * Saves application settings to Firestore.
     */
    saveAppSettings: async function() {
        const appName = document.getElementById('app-name').value.trim();
        const contactEmail = document.getElementById('contact-email').value.trim();

        if (!appName) {
            this.Utils.showMessage('Application Name is required.', 'warning');
            return;
        }

        const settingsData = {
            appName: appName,
            contactEmail: contactEmail,
            lastUpdated: new Date()
        };

        try {
            const appSettingsDocRef = doc(this.db, 'app_metadata', 'settings');
            await this.Utils.setDoc(appSettingsDocRef, settingsData, { merge: true }); // Use Utils.setDoc for error handling
            this.Utils.showMessage('Application settings saved successfully!', 'success');
        } catch (error) {
            // Error handled by Utils.setDoc, no need to duplicate here
        }
    },

    /**
     * Cleans up the AdminData module (though not strictly necessary for this module
     * as it doesn't have real-time listeners or Grid.js instances that need destroying,
     * it's good practice for consistency).
     */
    destroy: function() {
        // No specific listeners or Grid.js instances to unsubscribe/destroy in this module
        // But useful to have for consistency in Main.js's moduleDestroyers
        const adminDataModuleContent = document.getElementById('admin-data-module-content');
        if (adminDataModuleContent) {
            adminDataModuleContent.innerHTML = '';
        }
        console.log("AdminData module destroyed (UI cleared).");
    }
};
