// js/home.js

import { Auth } from './auth.js'; // Import Auth to check login status and trigger login
import { Utils } from './utils.js'; // Import Utils to check admin status and show messages

/**
 * The Home module handles rendering the application's home/dashboard page.
 */
export const Home = {
    db: null,
    auth: null,
    Utils: null,
    loadModuleCallback: null, // Callback to Main.loadModule for internal navigation buttons

    /**
     * Initializes the Home module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("Home module initialized.");

        // Listen for admin status changes to potentially re-render the admin card
        // This ensures the admin card appears immediately if role changes while on home page
        this.Utils.onAdminStatusChange(() => {
            // Re-render only the dynamic parts or the whole module if simpler
            if (document.getElementById('home-module-content')) {
                console.log("Admin status changed, re-rendering Home UI.");
                this.renderHomeUI();
            }
        });
    },

    /**
     * Renders the main UI for the Home module.
     * This is called by Main.js when the 'home' module is activated.
     */
    renderHomeUI: function() {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) {
            console.error("Content area not found for Home module.");
            return;
        }

        const isLoggedIn = Auth.isLoggedIn(); // Check current login status
        const isAdmin = Utils.isAdmin(); // Check current admin status

        // Dynamic login prompt content
        const loginPromptHtml = !isLoggedIn ? `
            <div class="bg-yellow-50 p-6 rounded-lg shadow-sm border border-yellow-200 text-center mb-8 animate-fade-in">
                <p class="text-yellow-800 text-xl font-semibold mb-4">
                    <i class="fas fa-exclamation-triangle mr-2"></i> You are not logged in.
                </p>
                <p class="text-yellow-700 mb-6">
                    Click the button below to log in and access all features.
                </p>
                <button id="google-login-btn"
                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 inline-flex items-center text-lg">
                    <i class="fab fa-google mr-3 text-xl"></i> Login with Google
                </button>
            </div>
        ` : '';

        // Admin card content (conditionally rendered)
        const adminCardHtml = isAdmin ? `
            <div class="bg-red-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                <i class="fas fa-user-shield text-red-600 text-3xl mb-3"></i>
                <h4 class="text-xl font-semibold text-gray-800 mb-2">Admin Tools</h4>
                <p class="text-gray-600 text-sm">Manage users, app settings, and price books.</p>
                <button data-module="users" class="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center">
                    Go to Admin <i class="fas fa-arrow-right ml-2"></i>
                </button>
            </div>
        ` : '';

        contentArea.innerHTML = `
            <div id="home-module-content" class="max-w-4xl mx-auto mt-10">
                <div class="bg-white p-8 rounded-lg shadow-md text-center mb-8">
                    <h2 class="text-4xl font-extrabold text-gray-800 mb-6">Welcome to ShutterSync CRM!</h2>
                    <p class="text-lg text-gray-600 leading-relaxed mb-8">
                        Your central hub for managing customer relationships and sales opportunities.
                        Effortlessly track interactions, manage leads, and streamline your workflow.
                    </p>
                </div>

                ${loginPromptHtml}

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                    <div class="bg-blue-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                        <i class="fas fa-users text-blue-600 text-3xl mb-3"></i>
                        <h4 class="text-xl font-semibold text-gray-800 mb-2">Manage Customers</h4>
                        <p class="text-gray-600 text-sm">Keep track of all your client details in one place.</p>
                        <button data-module="customers" class="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center">
                            Go to Customers <i class="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                    <div class="bg-green-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                        <i class="fas fa-handshake text-green-600 text-3xl mb-3"></i>
                        <h4 class="text-xl font-semibold text-gray-800 mb-2">Track Opportunities</h4>
                        <p class="text-gray-600 text-sm">Monitor your sales pipeline and close more deals.</p>
                        <button data-module="opportunities" class="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center">
                            Go to Opportunities <i class="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                    <div class="bg-purple-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                        <i class="fas fa-calendar-alt text-purple-600 text-3xl mb-3"></i>
                        <h4 class="text-xl font-semibold text-gray-800 mb-2">Upcoming Events</h4>
                        <p class="text-gray-600 text-sm">Schedule and manage your important events.</p>
                        <button data-module="events" class="mt-4 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 inline-flex items-center">
                            Go to Events <i class="fas fa-arrow-right ml-2"></i>
                        </button>
                    </div>
                    ${adminCardHtml}
                </div>
                <p class="text-sm text-gray-500 mt-10">
                    <i class="fas fa-info-circle mr-1"></i> Use the navigation bar above to explore different sections of the CRM.
                </p>
            </div>
        `;
        this.attachEventListeners();
    },

    /**
     * Attaches event listeners for UI interactions within the Home module.
     */
    attachEventListeners: function() {
        // Event listeners for the "Go to" buttons on the cards
        document.querySelectorAll('#home-module-content button[data-module]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const moduleName = e.target.dataset.module;
                if (moduleName && this.loadModuleCallback) {
                    this.loadModuleCallback(moduleName); // Use the callback provided by Main
                } else {
                    console.error("loadModuleCallback not set or module name missing.");
                }
            });
        });

        // Event listener for the Google Login button
        const googleLoginBtn = document.getElementById('google-login-btn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', async () => {
                // Here, you would typically trigger Google Sign-In.
                // For now, we'll trigger the anonymous login as set up in Auth.js.
                // If you want actual Google login, we'd need to add that to Auth.js.
                this.Utils.showMessage("Attempting login...", "info", 2000);
                await Auth.login(); // Triggers the general login flow (anonymous or custom token)
            });
        }
    },

    /**
     * Cleans up the Home module when it's no longer active.
     */
    destroy: function() {
        const homeModuleContent = document.getElementById('home-module-content');
        if (homeModuleContent) {
            homeModuleContent.innerHTML = '';
        }
        this.loadModuleCallback = null; // Clear the callback
        console.log("Home module destroyed (UI cleared).");
    }
};
