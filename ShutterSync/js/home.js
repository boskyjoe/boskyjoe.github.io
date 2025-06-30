// js/home.js

import { Auth } from './auth.js';
import { Utils } from './utils.js';

/**
 * The Home module handles the rendering of the main dashboard/home page.
 */
export const Home = {
    db: null,
    auth: null,
    Utils: null,
    loadModuleCallback: null, // Callback to load other modules via Main

    /**
     * Initializes the Home module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils module instance.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("Home module initialized.");
    },

    /**
     * Renders the Home UI into the provided content area element.
     * This function now receives the specific DOM element to render into,
     * AND the explicit authentication state.
     *
     * @param {HTMLElement} moduleContentElement - The DOM element where the Home UI should be rendered.
     * @param {boolean} isLoggedIn - The current login status (true/false).
     * @param {boolean} isAdmin - The current admin status (true/false).
     * @param {object|null} currentUser - The current Firebase User object, or null if logged out.
     */
    renderHomeUI: function(moduleContentElement, isLoggedIn, isAdmin, currentUser) {
        const homeModuleContent = moduleContentElement;

        // *** DIAGNOSTIC LOGS START ***
        console.log("Home.renderHomeUI called:");
        console.log("  isLoggedIn:", isLoggedIn);
        console.log("  isAdmin:", isAdmin);
        console.log("  currentUser:", currentUser ? currentUser.uid : "null");
        // *** DIAGNOSTIC LOGS END ***

        if (!homeModuleContent) {
            console.error("Home module: Target content element was not provided or is null.");
            this.Utils.showMessage("Error: Home module could not find its content area.", "error");
            return;
        }

        let welcomeMessage = "Welcome to ShutterSync CRM!";
        let actionCards = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Login / Register Card -->
                <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105">
                    <h4 class="text-xl font-semibold text-gray-800 mb-3"><i class="fas fa-sign-in-alt text-blue-500 mr-2"></i> Get Started</h4>
                    <p class="text-gray-600 mb-4">Log in to access your CRM features.</p>
                    <button id="login-button" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 w-full">
                        Login with Google
                    </button>
                </div>
            </div>
        `;

        if (isLoggedIn) { // Use the passed isLoggedIn
            welcomeMessage = `Welcome, ${currentUser ? (currentUser.displayName || currentUser.email) : 'Authenticated User'}!`;
            actionCards = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <!-- Manage Customers Card -->
                    <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105 cursor-pointer" data-action="customers">
                        <h4 class="text-xl font-semibold text-gray-800 mb-3"><i class="fas fa-users text-green-500 mr-2"></i> Manage Customers</h4>
                        <p class="text-gray-600">View, add, and update your customer records.</p>
                    </div>
                    <!-- Manage Opportunities Card -->
                    <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105 cursor-pointer" data-action="opportunities">
                        <h4 class="text-xl font-semibold text-gray-800 mb-3"><i class="fas fa-handshake text-purple-500 mr-2"></i> Track Opportunities</h4>
                        <p class="text-gray-600">Monitor your sales pipeline and potential deals.</p>
                    </div>
                    <!-- My Profile Card -->
                    <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105 cursor-pointer" data-action="users">
                        <h4 class="text-xl font-semibold text-gray-800 mb-3"><i class="fas fa-user-circle text-yellow-500 mr-2"></i> My Profile</h4>
                        <p class="text-gray-600">View and update your personal information.</p>
                    </div>
                </div>
            `;
            if (isAdmin) { // Use the passed isAdmin
                // Admin Tools card
                actionCards += `
                    <div class="mt-6">
                        <h3 class="text-2xl font-semibold text-gray-800 mb-4">Admin Tools</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <!-- User Management Card -->
                            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105 cursor-pointer" data-action="users">
                                <h4 class="text-xl font-semibold text-gray-800 mb-3"><i class="fas fa-users-cog text-red-500 mr-2"></i> User Management</h4>
                                <p class="text-gray-600">Manage user roles and permissions.</p>
                            </div>
                            <!-- App Metadata Card -->
                            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105 cursor-pointer" data-action="adminData">
                                <h4 class="text-xl font-semibold text-gray-800 mb-3"><i class="fas fa-cogs text-orange-500 mr-2"></i> App Metadata</h4>
                                <p class="text-gray-600">Configure application-wide settings.</p>
                            </div>
                            <!-- Price Book Card -->
                            <div class="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 transform hover:scale-105 cursor-pointer" data-action="priceBook">
                                <h4 class="text-xl font-semibold text-gray-800 mb-3"><i class="fas fa-dollar-sign text-blue-500 mr-2"></i> Price Book</h4>
                                <p class="text-gray-600">Manage product and service pricing.</p>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        homeModuleContent.innerHTML = `
            <div class="p-6">
                <h2 class="text-3xl font-bold text-gray-900 mb-6">${welcomeMessage}</h2>
                ${actionCards}
            </div>
        `;

        // Attach event listeners for dynamic cards
        this.attachEventListeners(homeModuleContent, isLoggedIn);
    },

    /**
     * Attaches event listeners for dynamically created elements within the home module.
     * @param {HTMLElement} parentElement - The element containing the dynamic cards.
     * @param {boolean} isLoggedIn - Whether the user is currently logged in.
     */
    attachEventListeners: function(parentElement, isLoggedIn) {
        if (!isLoggedIn) {
            const loginButton = parentElement.querySelector('#login-button');
            if (loginButton) {
                loginButton.addEventListener('click', () => {
                    Auth.loginWithGoogle();
                });
            }
        } else {
            // Event listeners for logged-in user cards
            parentElement.querySelectorAll('[data-action]').forEach(card => {
                card.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    if (this.loadModuleCallback) {
                        // When clicking a card, re-call loadModule with the current confirmed state
                        // Retrieve the latest state from Auth and Utils before passing it
                        this.loadModuleCallback(action, Auth.isLoggedIn(), Utils.isAdmin(), Auth.getCurrentUser());
                    }
                });
            });
        }
    },

    /**
     * Cleans up any resources used by the Home module when it's unloaded.
     */
    destroy: function() {
        console.log("Home module destroyed.");
    }
};
