// js/home.js

/**
 * The Home module handles rendering the application's home/dashboard page.
 */
export const Home = {
    db: null,
    auth: null,
    Utils: null,

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
    },

    /**
     * Renders the main UI for the Home module.
     * This is called by Main.js when the 'home' module is activated.
     */
    renderHomeUI: function() {
        const contentArea = document.getElementById('content-area'); // Main content area from index.html
        if (!contentArea) {
            console.error("Content area not found for Home module.");
            return;
        }

        contentArea.innerHTML = `
            <div id="home-module-content" class="bg-white p-8 rounded-lg shadow-md text-center max-w-2xl mx-auto mt-10">
                <h2 class="text-4xl font-extrabold text-gray-800 mb-6">Welcome to ShutterSync CRM!</h2>
                <p class="text-lg text-gray-600 leading-relaxed mb-8">
                    Your central hub for managing customer relationships and sales opportunities.
                    Effortlessly track interactions, manage leads, and streamline your workflow.
                </p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
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
                </div>
                <p class="text-sm text-gray-500 mt-10">
                    <i class="fas fa-info-circle mr-1"></i> Use the navigation bar above to explore different sections of the CRM.
                </p>
            </div>
        `;
        // Attach listeners for the 'Go to' buttons within the Home UI itself
        this.attachEventListeners();
    },

    /**
     * Attaches event listeners for UI interactions within the Home module.
     */
    attachEventListeners: function() {
        // Delegate to Main.loadModule when "Go to" buttons are clicked
        document.querySelectorAll('#home-module-content button[data-module]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const moduleName = e.target.dataset.module;
                if (moduleName) {
                    // Assuming Main is accessible or we pass a callback for loadModule
                    // For simplicity, directly accessing Main.default from global scope if available,
                    // or ideally, Main passes itself to Home.init() if Home needs to call it.
                    // For now, let's assume Main.default is implicitly available or that Main exports it as default.
                    // A safer approach: Main could pass its loadModule function to Home.init.
                    // For this immediate fix, we'll keep it simple and rely on the global import from Main.js.
                    window.Main.loadModule(moduleName); // Access Main via global scope (from index.html script)
                }
            });
        });
    },

    /**
     * Cleans up the Home module when it's no longer active.
     */
    destroy: function() {
        const homeModuleContent = document.getElementById('home-module-content');
        if (homeModuleContent) {
            homeModuleContent.innerHTML = '';
        }
        console.log("Home module destroyed (UI cleared).");
    }
};

// Expose Home to window for Main.js to use in index.html, if necessary for direct calls
// Note: This is an alternative if direct import from Main is complicated for the 'Go to' buttons.
// The primary way Main loads Home is via import Home from './js/home.js';
// This 'window.Home' part might not be strictly needed if event delegation works correctly with Main.loadModule.
// For now, let's ensure the Main module itself is passed as 'window.Main' in index.html script.
// This allows Home to call `window.Main.loadModule`
window.Home = Home;
