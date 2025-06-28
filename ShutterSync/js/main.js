// js/main.js

import { Utils } from './utils.js'; // Import utility functions

// Global references to Firebase services and current user info, populated from index.html
// These are available via window object due to how index.html sets them up.
const auth = window.firebaseAuth;
const db = window.firebaseDb;
let currentUserId = window.currentUserId; // Will be updated by onAuthStateChanged in index.html
let currentUserRole = window.currentUserRole; // Will be updated by onAuthStateChanged in index.html

/**
 * Global function to initialize application state when a user logs in.
 * This is called by the onAuthStateChanged listener in index.html.
 */
window.loggedInInit = async () => {
    currentUserId = window.currentUserId;
    currentUserRole = window.currentUserRole;
    console.log("main.js: User logged in. UID:", currentUserId, "Role:", currentUserRole);
    updateNavigationVisibility();
    // Load home content by default after login
    loadHomeContent();
};

/**
 * Global function to reset application state when a user logs out.
 * This is called by the onAuthStateChanged listener in index.html.
 */
window.loggedOutInit = () => {
    currentUserId = null;
    currentUserRole = 'Guest';
    console.log("main.js: User logged out.");
    updateNavigationVisibility();
    loadHomeContent(); // Show the default welcome message
};

/**
 * Dynamically loads an HTML template string for a given module.
 * In a real app, these would typically come from separate files or a templating system.
 * For now, we'll use simple string literals.
 * @param {string} moduleName - The name of the module to load.
 * @returns {string} HTML content for the module.
 */
function getModuleHtml(moduleName) {
    switch (moduleName) {
        case 'home':
            return `
                <div class="p-6">
                    <h2 class="text-3xl font-semibold text-gray-800 mb-6">Welcome to ShutterSync CRM!</h2>
                    <p class="text-gray-700 leading-relaxed mb-4">
                        This is your central hub for managing customers, opportunities, and essential business data.
                        Use the navigation bar above to explore different sections.
                    </p>
                    ${currentUserId ?
                        `<p class="text-gray-700 leading-relaxed mb-4">
                            You are currently logged in as <span class="font-bold">${window.firebaseAuth.currentUser.displayName || window.firebaseAuth.currentUser.email || 'User'}</span>
                            with role <span class="font-bold text-blue-600">${currentUserRole}</span>.
                        </p>` :
                        `<p class="text-gray-700 leading-relaxed mb-4">
                            Please sign in with your Google account to access all features.
                        </p>`
                    }
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        <div class="bg-blue-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                            <h3 class="text-xl font-bold text-blue-800 mb-2">Customers</h3>
                            <p class="text-gray-700">Manage all your client relationships and contact details.</p>
                        </div>
                        <div class="bg-green-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                            <h3 class="text-xl font-bold text-green-800 mb-2">Opportunities</h3>
                            <p class="text-gray-700">Track and manage your sales pipeline from lead to close.</p>
                        </div>
                        <div class="bg-purple-50 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                            <h3 class="text-xl font-bold text-purple-800 mb-2">Admin Tools</h3>
                            <p class="text-gray-700">Access master data settings and user management (Admin only).</p>
                        </div>
                    </div>
                </div>
            `;
        case 'customers':
            // This content will be replaced by actual Customers module UI later
            return `<div class="p-6">
                        <h2 class="text-3xl font-semibold text-gray-800 mb-6">Customers</h2>
                        <p class="text-gray-700">Module for managing customer data. Coming soon!</p>
                        <div id="customers-module-content"></div>
                    </div>`;
        case 'opportunities':
            // This content will be replaced by actual Opportunities module UI later
            return `<div class="p-6">
                        <h2 class="text-3xl font-semibold text-gray-800 mb-6">Opportunities</h2>
                        <p class="text-gray-700">Module for managing sales opportunities. Coming soon!</p>
                        <div id="opportunities-module-content"></div>
                    </div>`;
        case 'events':
            return `<div class="p-6">
                        <h2 class="text-3xl font-semibold text-gray-800 mb-6">Events</h2>
                        <p class="text-gray-700">Module for managing events. Coming soon!</p>
                    </div>`;
        case 'admin-country-mapping':
            return `<div class="p-6">
                        <h2 class="text-3xl font-semibold text-gray-800 mb-6">Admin: Country Mapping</h2>
                        <p class="text-gray-700">Manage country related master data. Coming soon!</p>
                        <div id="admin-country-mapping-content"></div>
                    </div>`;
        case 'admin-currencies':
            return `<div class="p-6">
                        <h2 class="text-3xl font-semibold text-gray-800 mb-6">Admin: Currencies</h2>
                        <p class="text-gray-700">Manage currency master data. Coming soon!</p>
                        <div id="admin-currencies-content"></div>
                    </div>`;
        case 'admin-users':
            return `<div class="p-6">
                        <h2 class="text-3xl font-semibold text-gray-800 mb-6">Admin: Users</h2>
                        <p class="text-gray-700">Manage user roles and accounts. Coming soon!</p>
                        <div id="admin-users-content"></div>
                    </div>`;
        case 'admin-price-book':
            return `<div class="p-6">
                        <h2 class="text-3xl font-semibold text-gray-800 mb-6">Admin: Price Book</h2>
                        <p class="text-gray-700">Manage product price books. Coming soon!</p>
                        <div id="admin-price-book-content"></div>
                    </div>`;
        default:
            return `<div class="p-6">
                        <h2 class="text-3xl font-semibold text-gray-800 mb-6">Page Not Found</h2>
                        <p class="text-gray-700">The requested page could not be found.</p>
                    </div>`;
    }
}

/**
 * Loads and displays the content for the Home page.
 */
async function loadHomeContent() {
    Utils.clearAndLoadContent(false); // Clear content, no loading spinner for home
    const html = getModuleHtml('home');
    Utils.renderContent(html);
}

/**
 * Handles navigation clicks. Loads content into the main area and initializes module-specific JS.
 * @param {string} moduleName - The identifier for the module (e.g., 'customers', 'admin-users').
 * @param {object} [moduleObject] - The module object itself (e.g., Customers, UsersModule).
 * Its 'init' method will be called.
 * @param {boolean} [requiresLogin=false] - True if this module requires the user to be logged in.
 * @param {boolean} [requiresAdmin=false] - True if this module requires the user to be an admin.
 */
async function navigateToModule(moduleName, moduleObject = null, requiresLogin = false, requiresAdmin = false) {
    if (requiresLogin && !Utils.isLoggedIn()) {
        Utils.showMessage('Please sign in to access this feature.', 'warning');
        loadHomeContent(); // Redirect to home if not logged in
        return;
    }
    if (requiresAdmin && !Utils.isAdmin()) {
        Utils.showMessage('You do not have permission to access this administrative section.', 'error');
        loadHomeContent(); // Redirect to home if not admin
        return;
    }

    Utils.clearAndLoadContent(true); // Clear content and show loading spinner

    // Simulate network delay for loading
    await new Promise(resolve => setTimeout(resolve, 300));

    const htmlContent = getModuleHtml(moduleName);
    Utils.renderContent(htmlContent);

    // Call the module's initialization function if provided
    // Changed this line: now we pass the module object and call its init method
    if (moduleObject && typeof moduleObject.init === 'function') {
        try {
            await moduleObject.init(db, auth, Utils); // Pass firebase, db, and Utils
            console.log(`main.js: Initialized ${moduleName} module.`);
        } catch (error) {
            Utils.handleError(error, `initializing ${moduleName} module`);
        }
    }
}

/**
 * Attaches event listeners to the navigation links.
 */
function attachNavListeners() {
    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        navigateToModule('home', null); // No specific module object needed for home
    });

    document.getElementById('nav-customers').addEventListener('click', (e) => {
        e.preventDefault();
        // Import Customers module dynamically and pass its *object*
        import('./customers.js').then(module => {
            navigateToModule('customers', module.Customers, true); // Pass module.Customers
        }).catch(error => {
            Utils.handleError(error, 'loading customers module');
        });
    });

    document.getElementById('nav-opportunities').addEventListener('click', (e) => {
        e.preventDefault();
        // Import Opportunities module dynamically and pass its *object*
        import('./opportunities.js').then(module => {
            navigateToModule('opportunities', module.Opportunities, true); // Pass module.Opportunities
        }).catch(error => {
            Utils.handleError(error, 'loading opportunities module');
        });
    });

    document.getElementById('nav-events').addEventListener('click', (e) => {
        e.preventDefault();
        navigateToModule('events', null, true); // Requires login, no specific init for now
    });

    // Admin submenu items
    document.getElementById('admin-country-mapping').addEventListener('click', (e) => {
        e.preventDefault();
        import('./admin_data.js').then(module => {
            // Pass module.AdminData and then specify which init function to call within navigateToModule
            // For now, moduleObject.init() will use the default. We need a way to specify initCountryMapping vs initCurrencies.
            // Let's modify navigateToModule or the init functions of AdminData.
            navigateToModule('admin-country-mapping', { init: module.AdminData.initCountryMapping }, true, true);
        }).catch(error => {
            Utils.handleError(error, 'loading admin_data module (country mapping)');
        });
    });

    document.getElementById('admin-currencies').addEventListener('click', (e) => {
        e.preventDefault();
        import('./admin_data.js').then(module => {
            navigateToModule('admin-currencies', { init: module.AdminData.initCurrencies }, true, true);
        }).catch(error => {
            Utils.handleError(error, 'loading admin_data module (currencies)');
        });
    });

    document.getElementById('admin-users').addEventListener('click', (e) => {
        e.preventDefault();
        import('./users.js').then(module => {
            navigateToModule('admin-users', module.UsersModule, true, true); // Pass module.UsersModule
        }).catch(error => {
            Utils.handleError(error, 'loading users module');
        });
    });

    document.getElementById('admin-price-book').addEventListener('click', (e) => {
        e.preventDefault();
        import('./price_book.js').then(module => {
            navigateToModule('admin-price-book', module.PriceBook, true, true); // Pass module.PriceBook
        }).catch(error => {
            Utils.handleError(error, 'loading price_book module');
        });
    });
}

/**
 * Updates the visibility of navigation elements based on login status and user role.
 */
function updateNavigationVisibility() {
    const navCustomers = document.getElementById('nav-customers');
    const navOpportunities = document.getElementById('nav-opportunities');
    const navEvents = document.getElementById('nav-events');
    const adminMenu = document.getElementById('admin-menu');

    if (Utils.isLoggedIn()) {
        navCustomers.classList.remove('hidden');
        navOpportunities.classList.remove('hidden');
        navEvents.classList.remove('hidden');
    } else {
        navCustomers.classList.add('hidden');
        navOpportunities.classList.add('hidden');
        navEvents.classList.add('hidden');
    }

    if (Utils.isAdmin()) {
        adminMenu.classList.remove('hidden');
    } else {
        adminMenu.classList.add('hidden');
    }
}

// Initial setup when main.js loads
document.addEventListener('DOMContentLoaded', () => {
    attachNavListeners();
    // Initially load home content. onAuthStateChanged in index.html will then call loggedInInit/loggedOutInit
    // which in turn will re-render home or adjust navigation.
    loadHomeContent();
    updateNavigationVisibility(); // Set initial visibility based on current auth state (might be 'Guest')
});

// Export functions that might be needed by other modules (though direct imports are preferred)
// For now, this is mainly for window.loggedInInit and window.loggedOutInit called by index.html
// but it's good practice to explicitly export if other modules might need to import main.js functions.
export { navigateToModule, Utils }; // Export Utils for convenience, though direct import is also done.
