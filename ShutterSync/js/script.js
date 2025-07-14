// Firebase SDK Imports (Modular API)
// Using Firebase SDK version 10.0.0 for compatibility.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs, serverTimestamp, Timestamp, setDoc } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js';

// Grid.js is now loaded globally via a <script> tag in index.html.
// We access it via the global 'gridjs' object.
// No 'import' statement needed for Grid.js here anymore.


// Firebase configuration: Using the exact configuration provided by the user
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6tT1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebasestorage.app",
    messagingSenderId: "10782416018",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};
// Extract appId directly from the provided firebaseConfig
const appId = firebaseConfig.appId;

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Get Auth service
const db = getFirestore(app); // Get Firestore service

// Global variables
let currentUser = null;
let currentUserRole = 'Guest'; // Default role
let userId = null; // Will store authenticated user's UID or a random ID for unauthenticated
let currencySymbolsMap = {}; // Global map to store currency codes to symbols
let currentOpportunityId = null; // To keep track of the opportunity being edited for work logs

// Grid.js instances
let customersGrid = null;
let opportunitiesGrid = null;
let countriesStatesGrid = null;
let currenciesGrid = null;
let priceBooksGrid = null;
let leadsGrid = null;

// UI Elements (declared as const where they are immediately available)
const navDashboard = document.getElementById('nav-dashboard');
const navCustomers = document.getElementById('nav-customers');
const navLeads = document.getElementById('nav-leads');
const navOpportunities = document.getElementById('nav-opportunities');
const navCountries = document.getElementById('nav-countries');
const navCurrencies = document.getElementById('nav-currencies');
const navPriceBooks = document.getElementById('nav-price-books');
const navLogout = document.getElementById('nav-logout');
const adminMenuItem = document.getElementById('admin-menu-item');

const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const customersSection = document.getElementById('customers-section');
const leadsSection = document.getElementById('leads-section');
const opportunitiesSection = document.getElementById('opportunities-section');
const countriesSection = document.getElementById('countries-section');
const currenciesSection = document.getElementById('currencies-section');
const priceBooksSection = document.getElementById('price-books-section');

// Authentication elements
const googleSignInBtn = document.getElementById('google-signin-btn');
const authErrorMessage = document.getElementById('auth-error-message');

const userDisplayName = document.getElementById('user-display-name');
const userIdDisplay = document.getElementById('user-id-display'); // This element will now be cleared
const userRoleSpan = document.createElement('span'); // Create a span for user role
userRoleSpan.id = 'user-role';
userRoleSpan.className = 'text-sm text-blue-200 ml-2';
document.getElementById('auth-status').appendChild(userRoleSpan); // Append it to auth-status div

// Customer Form Elements
const addCustomerBtn = document.getElementById('add-customer-btn');
const customerFormContainer = document.getElementById('customer-form-container');
const customerForm = document.getElementById('customer-form');
const customerTypeSelect = document.getElementById('customer-type');
const customerNameInput = document.getElementById('customer-name');
const customerEmailInput = document.getElementById('customer-email');
const customerPhoneInput = document.getElementById('customer-phone');
const customerAddressTextarea = document.getElementById('customer-address');
const customerCountrySelect = document.getElementById('customer-country');
const customerPreferredContactMethodSelect = document.getElementById('customer-contact-method');
const customerIndustrySelect = document.getElementById('customer-industry');
const customerAdditionalDetailsTextarea = document.getElementById('customer-details');
const customerSourceSelect = document.getElementById('customer-source');
const customerActiveSelect = document.getElementById('customer-active');
const cancelCustomerBtn = document.getElementById('cancel-customer-btn');
const customerFormMessage = document.getElementById('customer-form-message');
const customerSearchInput = document.getElementById('customer-search');
const noCustomersMessage = document.getElementById('no-customers-message');
const customersGridContainer = document.getElementById('customers-grid-container');

// Leads Form Elements
const addLeadBtn = document.getElementById('add-lead-btn');
const leadFormContainer = document.getElementById('lead-form-container');
const leadForm = document.getElementById('lead-form');
const leadContactNameInput = document.getElementById('lead-contact-name');
const leadPhoneInput = document.getElementById('lead-phone');
const leadEmailInput = document.getElementById('lead-email');
const leadServicesInterestedSelect = document.getElementById('lead-services-interested');
const leadEventDateInput = document.getElementById('lead-event-date');
const leadSourceSelect = document.getElementById('lead-source');
const leadAdditionalDetailsTextarea = document.getElementById('lead-additional-details');
const cancelLeadBtn = document.getElementById('cancel-lead-btn');
const leadFormMessage = document.getElementById('lead-form-message');
const leadSearchInput = document.getElementById('lead-search');
const noLeadsMessage = document.getElementById('no-leads-message');
const leadsGridContainer = document.getElementById('leads-grid-container');


// Opportunity Form Elements
const addOpportunityBtn = document.getElementById('add-opportunity-btn');
const opportunityFormContainer = document.getElementById('opportunity-form-container');
const opportunityForm = document.getElementById('opportunity-form');
const opportunityNameInput = document.getElementById('opportunity-name');
const opportunityCustomerSelect = document.getElementById('opportunity-customer');
const opportunityCurrencySelect = document.getElementById('opportunity-currency');
const opportunityPriceBookSelect = document.getElementById('opportunity-price-book');
const opportunityExpectedStartDateInput = document.getElementById('opportunity-start-date');
const opportunityExpectedCloseDateInput = document.getElementById('opportunity-close-date');
const opportunitySalesStageSelect = document.getElementById('opportunity-sales-stage');
const opportunityProbabilityInput = document.getElementById('opportunity-probability');
const opportunityValueInput = document.getElementById('opportunity-value');
const opportunityNotesTextarea = document.getElementById('opportunity-notes');
const cancelOpportunityBtn = document.getElementById('cancel-opportunity-btn');
const opportunityFormMessage = document.getElementById('opportunity-form-message');
const opportunitySearchInput = document.getElementById('opportunity-search');
const noOpportunitiesMessage = document.getElementById('no-opportunities-message');
const opportunitiesGridContainer = document.getElementById('opportunities-grid-container');

// NEW: Work Log Elements
const workLogsListContainer = document.getElementById('work-logs-list-container');
const noWorkLogsMessage = document.getElementById('no-work-logs-message');
const workLogsList = document.getElementById('work-logs-list');
const addWorkLogEntryBtn = document.getElementById('add-work-log-entry-btn');
const workLogFormContainer = document.getElementById('work-log-form-container');
const workLogForm = document.getElementById('work-log-form'); // This is the element that was null
const workLogIdInput = document.getElementById('work-log-id');
const workLogOpportunityIdInput = document.getElementById('work-log-opportunity-id');
const workLogDateInput = document.getElementById('work-log-date');
const workLogTypeSelect = document.getElementById('work-log-type');
const workLogDetailsTextarea = document.getElementById('work-log-details');
const cancelWorkLogBtn = document.getElementById('cancel-work-log-btn');
const workLogFormMessage = document.getElementById('work-log-form-message');

// Flag to ensure workLogForm listener is added only once
let workLogFormListenerAdded = false;


// Dashboard Elements
const dashboardTotalCustomers = document.getElementById('dashboard-total-customers');
const dashboardTotalOpportunities = document.getElementById('dashboard-total-opportunities');
const dashboardOpenOpportunities = document.getElementById('dashboard-open-opportunities');
const dashboardWonOpportunities = document.getElementById('dashboard-won-opportunities');

// Countries Elements
const addCountryBtn = document.getElementById('add-country-btn');
const countryFormContainer = document.getElementById('country-form-container');
const countryForm = document.getElementById('country-form');
const countryNameInput = document.getElementById('country-name');
const countryCodeInput = document.getElementById('country-code');
const countryStatesTextarea = document.getElementById('country-states');
const cancelCountryBtn = document.getElementById('cancel-country-btn');
const countryFormMessage = document.getElementById('country-form-message');
const countrySearchInput = document.getElementById('country-search');
const noCountriesMessage = document.getElementById('no-countries-message');
const countriesGridContainer = document.getElementById('countries-grid-container');

// Currencies Elements
const addCurrencyBtn = document.getElementById('add-currency-btn');
const currencyFormContainer = document.getElementById('currency-form-container');
const currencyForm = document.getElementById('currency-form');
const currencyNameInput = document.getElementById('currency-name');
const currencyCodeInput = document.getElementById('currency-code');
const currencySymbolInput = document.getElementById('currency-symbol');
const currencyCountrySelect = document.getElementById('currency-country');
const cancelCurrencyBtn = document.getElementById('cancel-currency-btn');
const currencyFormMessage = document.getElementById('currency-form-message');
const currencySearchInput = document.getElementById('currency-search');
const noCurrenciesMessage = document.getElementById('no-currencies-message');
const currenciesGridContainer = document.getElementById('currencies-grid-container');

// Price Books Elements
const addPriceBookBtn = document.getElementById('add-price-book-btn');
const priceBookFormContainer = document.getElementById('price-book-form-container');
const priceBookForm = document.getElementById('price-book-form');
const priceBookNameInput = document.getElementById('price-book-name');
const priceBookDescriptionTextarea = document.getElementById('price-book-description');
const priceBookCurrencySelect = document.getElementById('price-book-currency'); // Corrected line
const priceBookActiveCheckbox = document.getElementById('price-book-active');
const cancelPriceBookBtn = document.getElementById('cancel-price-book-btn');
const priceBookFormMessage = document.getElementById('price-book-form-message');
const priceBookSearchInput = document.getElementById('price-book-search');
const noPriceBooksMessage = document.getElementById('no-price-books-message');
const priceBooksGridContainer = document.getElementById('price-books-grid-container');

// Custom Message Box Elements
const messageBox = document.getElementById('message-box');
const messageContent = document.getElementById('message-content');
const messageConfirmBtn = document.getElementById('message-confirm-btn');
const messageCancelBtn = document.getElementById('message-cancel-btn');

let confirmActionResolve = null; // To hold the resolve function for confirmation


// --- Utility Functions ---

/**
 * Displays a custom message box (modal).
 * @param {string} message - The message content.
 * @param {boolean} isConfirm - If true, shows Confirm/Cancel buttons. Otherwise, shows OK.
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled/OK.
 */
function showMessageBox(message, isConfirm = false) {
    messageContent.textContent = message;
    messageBox.classList.remove('hidden');

    messageConfirmBtn.classList.add('hidden');
    messageCancelBtn.textContent = 'OK'; // Default to OK button

    if (isConfirm) {
        messageConfirmBtn.classList.remove('hidden');
        messageCancelBtn.textContent = 'Cancel';
    }

    return new Promise(resolve => {
        confirmActionResolve = resolve;

        const handleConfirm = () => {
            messageBox.classList.add('hidden');
            messageConfirmBtn.removeEventListener('click', handleConfirm);
            messageCancelBtn.removeEventListener('click', handleCancel);
            resolve(true);
        };

        const handleCancel = () => {
            messageBox.classList.add('hidden');
            messageConfirmBtn.removeEventListener('click', handleConfirm);
            messageCancelBtn.removeEventListener('click', handleCancel);
            resolve(false);
        };

        messageConfirmBtn.addEventListener('click', handleConfirm);
        messageCancelBtn.addEventListener('click', handleCancel);

        // Close on outside click for message box
        const handleOutsideClick = (event) => {
            if (event.target === messageBox) {
                messageBox.classList.add('hidden');
                messageConfirmBtn.removeEventListener('click', handleConfirm);
                messageCancelBtn.removeEventListener('click', handleCancel);
                window.removeEventListener('click', handleOutsideClick);
                resolve(false); // Treat outside click as cancel
            }
        };
        window.addEventListener('click', handleOutsideClick);
    });
}


/**
 * Formats a Firestore Timestamp or Date object for display in a user-friendly format.
 * @param {firebase.firestore.Timestamp|Date|null} timestamp - The timestamp or date to format.
 * @returns {string} The formatted date string, or empty string if null/invalid.
 */
function formatDateForDisplay(timestamp) {
    if (!timestamp) return '';
    let date;
    if (typeof timestamp.toDate === 'function') { // Check if it's a Firestore Timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) { // Check if it's a native Date object
        date = timestamp;
    } else { // Attempt to parse if it's a string or other format
        date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return ''; // Invalid date
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Formats a Firestore Timestamp or Date object for use in an HTML date input (YYYY-MM-DD).
 * @param {firebase.firestore.Timestamp|Date|null} timestamp - The timestamp or date to format.
 * @returns {string} The formatted date string (YYYY-MM-DD), or empty string if null/invalid.
 */
function formatDateForInput(timestamp) {
    if (!timestamp) return '';
    let date;
    if (typeof timestamp.toDate === 'function') { // Check if it's a Firestore Timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) { // Check if it's a native Date object
        date = timestamp;
    } else { // Attempt to parse if it's a string or other format
        date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return ''; // Invalid date
    return date.toISOString().split('T')[0];
}

/**
 * Generates a consistent unique index ID for price books based on normalized name and currency.
 * This function MUST EXACTLY match the logic in Firestore Security Rules.
 * @param {string} name - The name of the price book.
 * @param {string} currency - The currency symbol of the price book.
 * @returns {string} The normalized unique index ID.
 */
function getPriceBookIndexId(name, currency) {
    // Normalize name and currency: convert to lowercase and remove all whitespace characters.
    // The regex /\s+/g matches one or more whitespace characters (space, tab, newline, etc.) globally.
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '');
    const normalizedCurrency = currency.trim().toLowerCase().replace(/\s+/g, '');
    return `${normalizedName}_${normalizedCurrency}`;
}

/**
 * Populates a <select> dropdown element with data from a Firestore collection.
 * @param {HTMLSelectElement} selectElement - The <select> element to populate.
 * @param {string} collectionPath - The path to the Firestore collection (e.g., 'artifacts/appId/public/data/countries').
 * @param {string} valueField - The field from the document to use as the <option> value.
 * @param {string} textField - The field from the document to use as the <option> text.
 * @param {string|null} selectedValue - The value to pre-select in the dropdown (optional).
 * @param {string|null} dataAttributeField - An optional field to store as a data attribute (e.g., 'defaultCurrencySymbol').
 * @param {Array<Object>|null} staticOptions - Optional: An array of objects {value: '...', text: '...'} for static options.
 */
async function populateSelect(selectElement, collectionPath, valueField, textField, selectedValue = null, dataAttributeField = null, staticOptions = null) {
    if (!selectElement) {
        console.error(`populateSelect: selectElement is null for collection ${collectionPath}`);
        return;
    }
    selectElement.innerHTML = '<option value="">Select...</option>'; // Default empty option

    if (staticOptions) {
        staticOptions.forEach(optionData => {
            const option = document.createElement('option');
            option.value = optionData.value;
            option.textContent = optionData.text;
            if (selectedValue !== null && optionData.value === selectedValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
        return; // Exit if static options are provided
    }

    try {
        const collectionRef = collection(db, collectionPath);
        const snapshot = await getDocs(query(collectionRef, orderBy(textField))); // Order by text field for display
        snapshot.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = data[valueField];
            option.textContent = data[textField];
            if (selectedValue !== null && data[valueField] === selectedValue) {
                option.selected = true;
            }
            // Store additional data as a data attribute if specified
            if (dataAttributeField && data[dataAttributeField]) {
                option.dataset[dataAttributeField] = data[dataAttributeField];
            }

            // NEW: If populating currencies, update the global currencySymbolsMap
            if (collectionPath === 'currencies' && data.code && data.symbol) {
                currencySymbolsMap[data.code] = data.symbol;
            }

            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error(`Error fetching data for dropdown ${collectionPath}:`, error);
        showMessageBox(`Could not load data for ${collectionPath}.`, false);
    }
}

/**
 * Hides all main content sections.
 */
function hideAllSections() {
    authSection.classList.add('hidden');
    dashboardSection.classList.add('hidden');
    customersSection.classList.add('hidden');
    leadsSection.classList.add('hidden');
    opportunitiesSection.classList.add('hidden');
    countriesSection.classList.add('hidden');
    currenciesSection.classList.add('hidden');
    priceBooksSection.classList.add('hidden');
}

/**
 * Shows a specific main content section and hides others.
 * @param {HTMLElement} sectionElement - The section to show.
 */
function showSection(sectionElement) {
    hideAllSections();
    sectionElement.classList.remove('hidden');

    // If the opportunities section is shown, set up accordions
    if (sectionElement === opportunitiesSection) {
        setupAccordions();
    }
}

/**
 * Waits for the Grid.js library to be loaded and available on the window object.
 * @returns {Promise<void>} A promise that resolves when window.gridjs is defined.
 */
async function waitForGridJs() {
    return new Promise((resolve, reject) => {
        const checkInterval = 100; // Check every 100ms
        const maxAttempts = 50; // Max 5 seconds
        let attempts = 0;

        const checkGridJs = () => {
            if (typeof window.gridjs !== 'undefined' && typeof window.gridjs.Grid !== 'undefined') {
                console.log('Grid.js is now available.');
                resolve();
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkGridJs, checkInterval);
            } else {
                const errorMessage = 'Grid.js library failed to load after multiple attempts.';
                console.error(errorMessage);
                // We show a message box here, but also reject the promise to propagate the error
                showMessageBox(errorMessage + ' Please refresh the page or check your internet connection.', false);
                reject(new Error(errorMessage));
            }
        };

        checkGridJs();
    });
}

/**
 * Toggles the visibility of an accordion content section.
 * @param {HTMLElement} header - The accordion header element.
 */
function toggleAccordion(header) {
    const content = header.nextElementSibling; // The content div is the next sibling
    const icon = header.querySelector('.accordion-icon');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        header.classList.add('expanded');
        if (icon) icon.style.transform = 'rotate(180deg)';
    } else {
        content.classList.add('hidden');
        header.classList.remove('expanded');
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

/**
 * Sets up event listeners for all accordion headers within the opportunity form.
 * Ensures initial state (Main Details expanded, others collapsed).
 */
function setupAccordions() {
    // Ensure the opportunity form container exists before querying its children
    const opportunityFormContainer = document.getElementById('opportunity-form-container');
    if (!opportunityFormContainer) {
        console.warn("setupAccordions: Opportunity form container not found. Cannot set up accordions.");
        return;
    }

    // Query for accordion headers specifically within the opportunity form container
    const accordionHeaders = opportunityFormContainer.querySelectorAll('.accordion-header');
    console.log(`setupAccordions: querySelectorAll found ${accordionHeaders.length} accordion headers.`);

    if (accordionHeaders.length === 0) {
        console.warn("setupAccordions: No accordion headers found. This might be a timing issue.");
    }

    accordionHeaders.forEach(header => {
        if (header) {
            // Remove existing listener to prevent duplicates if called multiple times
            header.removeEventListener('click', toggleAccordion);
            // Add new listener
            header.addEventListener('click', () => toggleAccordion(header));

            // Set initial state for accordions
            const content = header.nextElementSibling;
            const icon = header.querySelector('.accordion-icon');

            if (header.textContent.includes('Main Details')) {
                // Main Details accordion should be expanded by default
                content.classList.remove('hidden');
                header.classList.add('expanded');
                if (icon) icon.style.transform = 'rotate(180deg)';
            } else {
                // Other accordions should be collapsed by default
                content.classList.add('hidden');
                header.classList.remove('expanded');
                if (icon) icon.style.transform = 'rotate(0deg)';
            }
        } else {
            console.error("Null header element encountered during accordion setup within opportunity form container.");
        }
    });
}


// --- Authentication ---

// Listens for Firebase authentication state changes
onAuthStateChanged(auth, async (user) => {
    console.log('onAuthStateChanged fired. User:', user ? user.uid : 'null');
    currentUser = user;

    if (user) {
        // User is signed in
        userId = user.uid; // Set userId to authenticated UID
        navLogout.classList.remove('hidden');
        userDisplayName.textContent = user.displayName || user.email;
        userIdDisplay.textContent = ''; // REMOVED: Display full user ID - Now empty string

        try {
            // Fetch user's custom claims for role from Firestore
            // The users_data collection is now a top-level collection as per your request.
            const userDocRef = doc(db, 'users_data', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // New user, create their profile with 'Standard' role
                await setDoc(userDocRef, {
                    displayName: user.displayName || 'New User',
                    email: user.email,
                    role: 'Standard', // Default role for new users
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp()
                });
                currentUserRole = 'Standard';
            } else {
                // Existing user, update last login and get role
                await updateDoc(userDocRef, {
                    lastLogin: serverTimestamp()
                });
                currentUserRole = userDoc.data().role;
            }
        } catch (error) {
            console.error("Error fetching user role or creating user doc:", error);
            currentUserRole = 'Standard'; // Fallback to standard if error occurs
            showMessageBox('Could not load user profile. Defaulting to Standard role.', false);
        }

        userRoleSpan.textContent = `Role: ${currentUserRole}`; // Display user role

        // Show/hide admin navigation button based on role
        if (currentUserRole === 'Admin') {
            adminMenuItem.classList.remove('hidden');
        } else {
            adminMenuItem.classList.add('hidden');
        }

        // Show navigation items
        navDashboard.classList.remove('hidden');
        navCustomers.classList.remove('hidden');
        navLeads.classList.remove('hidden');
        navOpportunities.classList.remove('hidden');

        // Show dashboard as landing page after successful login
        showSection(dashboardSection);
        updateDashboardStats();

    } else {
        // User is signed out or not authenticated
        // For no anonymous access, we ensure userId is only set if authenticated for data access
        userId = null; // No authenticated user, so userId is null for data operations
        navLogout.classList.add('hidden');
        userDisplayName.textContent = 'Guest';
        userIdDisplay.textContent = ''; // Clear user ID display
        userRoleSpan.textContent = ''; // Clear user role display
        currentUserRole = 'Guest';
        adminMenuItem.classList.add('hidden'); // Hide admin menu

        // Hide all content sections and show only the authentication section
        hideAllSections();
        authSection.classList.remove('hidden');

        // Hide all navigation items
        navDashboard.classList.add('hidden');
        navCustomers.classList.add('hidden');
        navLeads.classList.add('hidden');
        navOpportunities.classList.add('hidden');
        navCountries.classList.add('hidden'); // Hide admin sub-menu items too
        navCurrencies.classList.add('hidden');
        navPriceBooks.classList.add('hidden');

        // Clear grids if they exist
        if (customersGrid) { customersGrid.destroy(); customersGrid = null; }
        if (leadsGrid) { leadsGrid.destroy(); leadsGrid = null; }
        if (opportunitiesGrid) { opportunitiesGrid.destroy(); opportunitiesGrid = null; }
        if (countriesStatesGrid) { countriesStatesGrid.destroy(); countriesStatesGrid = null; }
        if (currenciesGrid) { currenciesGrid.destroy(); currenciesGrid = null; }
        if (priceBooksGrid) { priceBooksGrid.destroy(); priceBooksGrid = null; }

        // Clear grid containers
        if (customersGridContainer) customersGridContainer.innerHTML = '';
        if (leadsGridContainer) leadsGridContainer.innerHTML = '';
        if (opportunitiesGridContainer) opportunitiesGridContainer.innerHTML = '';
        if (countriesGridContainer) countriesGridContainer.innerHTML = '';
        if (currenciesGridContainer) currenciesGridContainer.innerHTML = '';
        if (priceBooksGridContainer) priceBooksGridContainer.innerHTML = '';


        // Clear dropdowns (ensure elements exist before trying to access them)
        if (customerCountrySelect) customerCountrySelect.innerHTML = '<option value="">Select...</option>';
        if (customerIndustrySelect) customerIndustrySelect.innerHTML = '<option value="">Select Industry</option>';
        if (customerSourceSelect) customerSourceSelect.innerHTML = '<option value="">Select Source</option>';
        if (leadServicesInterestedSelect) leadServicesInterestedSelect.innerHTML = '<option value="">Select Service</option>';
        if (leadSourceSelect) leadSourceSelect.innerHTML = '<option value="">Select Source</option>';
        if (opportunityCustomerSelect) opportunityCustomerSelect.innerHTML = '<option value="">Select a Customer</option>';
        if (opportunityCurrencySelect) opportunityCurrencySelect.innerHTML = '<option value="">Select...</option>';
        if (opportunityPriceBookSelect) opportunityPriceBookSelect.innerHTML = '<option value="">Select a Price Book</option>';
        if (priceBookCurrencySelect) priceBookCurrencySelect.innerHTML = '<option value="">Select...</option>';
        if (currencyCountrySelect) currencyCountrySelect.innerHTML = '<option value="">Select...</option>';

        currencySymbolsMap = {}; // Clear the currency symbols map on logout
    }
});

// Event listener for Google Sign-In button
googleSignInBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        authErrorMessage.classList.add('hidden');
        showMessageBox('Logged in successfully with Google!', false);
    } catch (error) {
        console.error('Google Sign-In Error:', error);
        authErrorMessage.textContent = 'Google Sign-In failed: ' + error.message;
        authErrorMessage.classList.remove('hidden');
        showMessageBox('Google Sign-In failed: ' + error.message, false);
    }
});

// Event listener for Sign Out button
navLogout.addEventListener('click', () => {
    if (currentUser) {
        signOut(auth).then(() => {
            showMessageBox('Signed out successfully!', false);
        }).catch((error) => {
            console.error('Sign Out Error:', error);
            showMessageBox('Error signing out: ' + error.message, false);
        });
    }
});


// --- Navigation ---

// Event listeners for main navigation buttons
navDashboard.addEventListener('click', () => showSection(dashboardSection));
navCustomers.addEventListener('click', () => { showSection(customersSection); renderCustomersGrid(); populateCustomerCountryDropdown(); });
navLeads.addEventListener('click', () => { showSection(leadsSection); renderLeadsGrid(); });
navOpportunities.addEventListener('click', () => { showSection(opportunitiesSection); renderOpportunitiesGrid(); populateOpportunityCustomerDropdown(); populateOpportunityCurrencyDropdown(); populateOpportunityPriceBookDropdown(); });

// Event listeners for Admin sub-menu items
navCountries.addEventListener('click', () => {
    if (currentUserRole === 'Admin') {
        showSection(countriesSection);
        renderCountriesStatesGrid();
    } else {
        showMessageBox('Access Denied: You must be an Admin to access this feature.', false);
    }
});
navCurrencies.addEventListener('click', () => {
    if (currentUserRole === 'Admin') {
        showSection(currenciesSection);
        renderCurrenciesGrid();
        populateCurrencyCountryDropdown(); // Populate country dropdown for currencies
    } else {
        showMessageBox('Access Denied: You must be an Admin to access this feature.', false);
    }
});
navPriceBooks.addEventListener('click', () => {
    if (currentUserRole === 'Admin') {
        showSection(priceBooksSection);
        renderPriceBooksGrid();
        populatePriceBookCurrencyDropdown(); // Populate dropdown when section is active
    } else {
        showMessageBox('Access Denied: You must be an Admin to access this feature.', false);
    }
});


// --- Dashboard Module ---

/**
 * Updates the statistics displayed on the dashboard.
 * Fetches counts for total customers, total opportunities, open opportunities, and won opportunities.
 */
async function updateDashboardStats() {
    if (!currentUser) return; // Ensure user is authenticated

    try {
        // For customers, the security rule allows all authenticated users to read all customers.
        // So, we query all customers regardless of creatorId for dashboard stats.
        let customerQueryRef = collection(db, `customers`);
        let qCustomers = query(customerQueryRef);
        const customersSnapshot = await getDocs(qCustomers);
        dashboardTotalCustomers.textContent = customersSnapshot.size;

        let opportunityQueryRef = collection(db, `opportunities`);
        let qOpportunities = query(opportunityQueryRef);
        // Filter opportunities by creatorId if not an Admin, as per security rules
        if (currentUserRole !== 'Admin') {
            qOpportunities = query(opportunityQueryRef, where('creatorId', '==', currentUser.uid));
        }
        const opportunitiesSnapshot = await getDocs(qOpportunities);
        dashboardTotalOpportunities.textContent = opportunitiesSnapshot.size;

        const openOpportunities = opportunitiesSnapshot.docs.filter(doc =>
            doc.data().salesStage !== 'Won' && doc.data().salesStage !== 'Lost'
        );
        dashboardOpenOpportunities.textContent = openOpportunities.length;

        const wonOpportunities = opportunitiesSnapshot.docs.filter(doc =>
            doc.data().salesStage === 'Won'
        );
        dashboardWonOpportunities.textContent = wonOpportunities.length;

    } catch (error) {
        console.error("Error updating dashboard stats:", error);
        showMessageBox('Could not load dashboard statistics.', false);
    }
}


// --- Forms General Logic ---

/**
 * Resets a given form and hides its container.
 * @param {HTMLFormElement} formElement - The form to reset.
 * @param {HTMLElement} formContainer - The container element of the form.
 * @param {string} idValue - The ID value to set for the hidden ID input field.
 * @param {HTMLElement} messageElement - The message display element for the form.
 */
function resetAndHideForm(formElement, formContainer, idValue, messageElement) {
    formElement.reset();
    // Dynamically set the ID input value if it.exists, otherwise ignore
    const idInput = formElement.querySelector('[id$="-id"]'); // Finds elements with ID ending in -id
    if (idInput) {
        idInput.value = idValue;
    }
    formContainer.classList.add('hidden');
    messageElement.classList.add('hidden');
    messageElement.textContent = '';
}

// Event listeners for cancel buttons on forms
cancelCustomerBtn.addEventListener('click', () => resetAndHideForm(customerForm, customerFormContainer, '', customerFormMessage));
cancelLeadBtn.addEventListener('click', () => resetAndHideForm(leadForm, leadFormContainer, '', leadFormMessage));
cancelOpportunityBtn.addEventListener('click', () => {
    resetAndHideForm(opportunityForm, opportunityFormContainer, '', opportunityFormMessage);
    // Also reset and hide the work log form when opportunity form is cancelled
    resetAndHideForm(workLogForm, workLogFormContainer, '', workLogFormMessage);
    workLogsList.innerHTML = ''; // Clear work logs list
    noWorkLogsMessage.classList.remove('hidden'); // Show no work logs message
    currentOpportunityId = null; // Clear current opportunity ID
});
cancelCountryBtn.addEventListener('click', () => {
    resetAndHideForm(countryForm, countryFormContainer, '', countryFormMessage);
    countryStatesTextarea.value = ''; // Clear states textarea specifically
});
cancelCurrencyBtn.addEventListener('click', () => {
    resetAndHideForm(currencyForm, currencyFormContainer, '', currencyFormMessage);
    currencyCountrySelect.value = ''; // Clear currency country dropdown
});
cancelPriceBookBtn.addEventListener('click', () => resetAndHideForm(priceBookForm, priceBookFormContainer, '', priceBookFormMessage));


// --- Customers Module ---

/**
 * Populates the customer country dropdown with data from the 'countries' collection.
 * @param {string|null} selectedCountry - The country name to pre-select (optional).
 */
async function populateCustomerCountryDropdown(selectedCountry = null) {
    if (!currentUser) return;
    // Corrected path for public data
    await populateSelect(customerCountrySelect, `countries`, 'name', 'name', selectedCountry);
}

// Event listener to open the Customer Form for adding a new customer
addCustomerBtn.addEventListener('click', () => {
    if (!currentUser) { showMessageBox('Please sign in to add customers.', false); return; }
    customerForm.reset();
    // Assuming no hidden customer-id input for new forms, but setting it for consistency if it were added later
    document.getElementById('customer-id').value = ''; // Clear ID for new customer
    resetAndHideForm(customerForm, customerFormContainer, '', customerFormMessage); // Reset and hide first
    customerFormContainer.classList.remove('hidden'); // Then show the container
    // Set default values for new entry
    customerTypeSelect.value = 'Individual';
    customerPreferredContactMethodSelect.value = 'Email';
    customerActiveSelect.checked = true; // Use checked for checkbox
    customerIndustrySelect.value = '';
    customerSourceSelect.value = '';
    populateCustomerCountryDropdown();
});

// Event listener to save (add or update) a customer
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessageBox('Authentication required to save customer.', false); return; }

    const customerId = document.getElementById('customer-id').value;

    const customerData = {
        type: customerTypeSelect.value,
        name: customerNameInput.value.trim(),
        email: customerEmailInput.value.trim(),
        phone: customerPhoneInput.value.trim(),
        address: customerAddressTextarea.value.trim(),
        country: customerCountrySelect.value,
        preferredContactMethod: customerPreferredContactMethodSelect.value,
        industry: customerIndustrySelect.value,
        additionalDetails: customerAdditionalDetailsTextarea.value.trim(),
        source: customerSourceSelect.value,
        active: customerActiveSelect.checked, // Use checked for checkbox
        updatedAt: serverTimestamp()
    };

    try {
        if (customerId) {
            // Update existing customer
            await updateDoc(doc(db, `customers`, customerId), customerData);
            showMessageBox('Customer updated successfully!', false);
        } else {
            // Add new customer
            customerData.createdAt = serverTimestamp();
            customerData.creatorId = currentUser.uid;
            await addDoc(collection(db, `customers`), customerData);
            showMessageBox('Customer added successfully!', false);
        }
        resetAndHideForm(customerForm, customerFormContainer, '', customerFormMessage); // Clear and hide form
        renderCustomersGrid();
        updateDashboardStats();
    } catch (error) {
        console.error("Error saving customer:", error);
        customerFormMessage.textContent = 'Error saving customer: ' + error.message;
        customerFormMessage.classList.remove('hidden');
        showMessageBox('Error saving customer: ' + error.message, false);
    }
});

/**
 * Renders or updates the Grid.js table for customers.
 * Fetches customer data from Firestore and displays it.
 */
async function renderCustomersGrid() {
    if (!currentUser) {
        noCustomersMessage.classList.remove('hidden');
        if (customersGrid) {
            customersGrid.destroy(); // Destroy existing grid if user logs out
            customersGrid = null;
        }
        customersGridContainer.innerHTML = ''; // Clear the container
        return;
    }

    try {
        await waitForGridJs(); // Wait for Grid.js to be ready
    } catch (error) {
        // Error message already shown by waitForGridJs
        customersGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading customer data.</p>';
        return;
    }

    // Always clear the container and show loading message at the start
    customersGridContainer.innerHTML = '<p class="text-center py-4 text-gray-500">Loading Customers...</p>';
    noCustomersMessage.classList.add('hidden'); // Hide "No data" message initially

    let customersRef = collection(db, `customers`);
    let q = query(customersRef, orderBy('name'));
    const customerData = [];

    try {
        const snapshot = await getDocs(q);

        // Clear the loading message before rendering the actual grid or 'no data' message
        customersGridContainer.innerHTML = '';

        if (snapshot.empty) {
            noCustomersMessage.classList.remove('hidden');
        } else {
            noCustomersMessage.classList.add('hidden'); // Ensure it's hidden if data is present
            snapshot.forEach(doc => {
                const data = doc.data();
                customerData.push([
                    doc.id,
                    data.name,
                    data.email,
                    data.phone,
                    data.country,
                    data.active,
                    data.type,
                    data.preferredContactMethod,
                    data.industry,
                    data.additionalDetails,
                    data.source,
                    data.createdAt,
                    data.creatorId // Added creatorId for rule check
                ]);
            });

            // If a grid already exists, update its data.
            // Otherwise, create a new one.
            if (customersGrid) {
                customersGrid.updateConfig({ data: customerData }).forceRender();
            } else {
                customersGrid = new window.gridjs.Grid({
                    columns: [
                        { id: 'id', name: 'ID', hidden: true },
                        { id: 'name', name: 'Name', sort: true, filter: true },
                        { id: 'email', name: 'Email', sort: true, filter: true },
                        { id: 'phone', name: 'Phone', sort: true, filter: true },
                        { id: 'country', name: 'Country', sort: true, filter: true },
                        { id: 'active', name: 'Active', sort: true, filter: true, formatter: (cell) => cell ? 'Yes' : 'No' },
                        { id: 'type', name: 'Type', hidden: true },
                        { id: 'preferredContactMethod', name: 'Contact Method', hidden: true },
                        { id: 'industry', name: 'Industry', hidden: true },
                        { id: 'additionalDetails', name: 'Additional Details', hidden: true },
                        { id: 'source', name: 'Source', hidden: true },
                        { id: 'createdAt', name: 'Created At', hidden: true },
                        { id: 'creatorId', name: 'Creator ID', hidden: true }, // Keep creatorId hidden but accessible for actions
                        {
                            name: 'Actions',
                            sort: false,
                            formatter: (cell, row) => {
                                const docId = row.cells[0].data;
                                const creatorId = row.cells[12].data; // Get creatorId from the row data
                                const canEditDelete = (currentUserRole === 'Admin' || creatorId === currentUser.uid);

                                return window.gridjs.h('div', { className: 'flex space-x-2' },
                                    window.gridjs.h('button', {
                                        className: `px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm ${canEditDelete ? '' : 'opacity-50 cursor-not-allowed'}`,
                                        onClick: () => canEditDelete ? editCustomer(docId) : showMessageBox('You do not have permission to edit this customer.', false),
                                        disabled: !canEditDelete
                                    }, 'Edit'),
                                    window.gridjs.h('button', {
                                        className: `px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 text-sm ${canEditDelete ? '' : 'opacity-50 cursor-not-allowed'}`,
                                        onClick: () => canEditDelete ? deleteCustomer(docId) : showMessageBox('You do not have permission to delete this customer.', false),
                                        disabled: !canEditDelete
                                    }, 'Delete')
                                );
                            }
                        }
                    ],
                    data: customerData,
                    search: {
                        selector: (cell, rowIndex, cellIndex) => {
                            // Search across name, email, phone, country
                            if (cellIndex === 1 || cellIndex === 2 || cellIndex === 3 || cellIndex === 4) {
                                return cell;
                            }
                            return null;
                        }
                    },
                    pagination: { enabled: true, limit: 10, summary: true },
                    sort: true,
                    resizable: true,
                    className: {
                        container: 'gridjs-container', table: 'min-w-full bg-white shadow-md rounded-lg overflow-hidden',
                        thead: 'bg-gray-200', th: 'py-3 px-4 text-left text-sm font-medium text-gray-700',
                        td: 'py-3 px-4 text-left text-sm text-gray-800', tr: 'divide-y divide-gray-200',
                        footer: 'bg-gray-50 p-4 flex justify-between items-center',
                        pagination: 'flex items-center space-x-2',
                        'pagination-summary': 'text-sm text-gray-600', 'pagination-gap': 'text-sm text-gray-400',
                        'pagination-nav': 'flex space-x-1', 'pagination-nav-prev': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                        'pagination-nav-next': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                        'pagination-btn': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                        'pagination-btn-current': 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
                    },
                    language: {
                        'search': { 'placeholder': 'Search customers...' },
                        'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                        'noRecordsFound': 'No Customer Data Available',
                    }
                }).render(customersGridContainer); // Render into the new container
            }
        }
    } catch (error) {
        console.error("Error rendering customers grid:", error);
        showMessageBox('Could not load customer data: ' + error.message, false);
        customersGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading customer data.</p>';
    }
}

/**
 * Populates the customer form with existing data for editing.
 * @param {string} customerId - The ID of the customer document to edit.
 */
async function editCustomer(customerId) {
    if (!currentUser) { showMessageBox('Please sign in to edit customers.', false); return; }

    try {
        const docSnap = await getDoc(doc(db, `customers`, customerId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Check if current user is the creator or an Admin
            if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
                showMessageBox('You can only edit customers you have created.', false);
                return;
            }

            document.getElementById('customer-id').value = docSnap.id;

            customerFormContainer.classList.remove('hidden');
            customerFormMessage.classList.add('hidden');

            customerTypeSelect.value = data.type || '';
            customerNameInput.value = data.name || '';
            customerEmailInput.value = data.email || '';
            customerPhoneInput.value = data.phone || '';
            customerAddressTextarea.value = data.address || '';
            await populateCustomerCountryDropdown(data.country);
            customerPreferredContactMethodSelect.value = data.preferredContactMethod || '';
            customerIndustrySelect.value = data.industry || '';
            customerAdditionalDetailsTextarea.value = data.additionalDetails || '';
            customerSourceSelect.value = data.source || '';
            customerActiveSelect.checked = data.active; // Set checked for checkbox
        } else {
            showMessageBox('Customer not found!', false);
        }
    } catch (error) {
        console.error("Error editing customer:", error);
        showMessageBox('Error loading customer for edit: ' + error.message, false);
    }
}

/**
 * Deletes a customer document from Firestore.
 * Requires Admin role or creator.
 * @param {string} customerId - The ID of the customer document to delete.
 */
async function deleteCustomer(customerId) {
    if (!currentUser) { showMessageBox('Please sign in to delete customers.', false); return; }

    const confirmed = await showMessageBox('Are you sure you want to delete this customer? This action cannot be undone.', true);
    if (!confirmed) return;

    try {
        const docSnap = await getDoc(doc(db, `customers`, customerId));
        if (!docSnap.exists()) {
            showMessageBox('Customer not found!', false);
            return;
        }
        const data = docSnap.data();
        // Check if current user is the creator or an Admin
        if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
            showMessageBox('You can only delete customers you have created.', false);
            return;
        }

        // Check if there are any opportunities linked to this customer
        const opportunitiesSnapshot = await getDocs(query(collection(db, `opportunities`), where('customerId', '==', customerId)));
        if (!opportunitiesSnapshot.empty) {
            showMessageBox('Cannot delete customer: There are existing opportunities linked to this customer. Please delete the opportunities first.', false);
            return;
        }

        await deleteDoc(doc(db, `customers`, customerId));
        showMessageBox('Customer deleted successfully!', false);
        renderCustomersGrid();
        updateDashboardStats();
    } catch (error) {
        console.error("Error deleting customer:", error);
        showMessageBox('Error deleting customer: ' + error.message, false);
    }
}

// --- Leads Module ---

// Static options for leads dropdowns
const servicesInterestedOptions = [
    { value: "Save the Day", text: "Save the Day" },
    { value: "Pre-Wedding Photo Shoot", text: "Pre-Wedding Photo Shoot" },
    { value: "Wedding", text: "Wedding" },
    { value: "Post-Wedding Photo Shoot", text: "Post-Wedding Photo Shoot" },
    { value: "Baby Shower", text: "Baby Shower" },
    { value: "Corporate Event", text: "Corporate Event" },
    { value: "Product Launch", text: "Product Launch" },
    { value: "Political Meeting", text: "Political Meeting" },
    { value: "Others", text: "Others" },
];

const leadSourceOptions = [
    { value: "Website", text: "Website" },
    { value: "Referral", text: "Referral" },
    { value: "Social Media", text: "Social Media" },
    { value: "Advertisement", text: "Advertisement" },
    { value: "Event", text: "Event" },
    { value: "Others", text: "Others" },
];

/**
 * Populates the services interested dropdown for leads.
 * @param {string|null} selectedService - The service to pre-select.
 */
async function populateLeadServicesInterestedDropdown(selectedService = null) {
    await populateSelect(leadServicesInterestedSelect, null, 'value', 'text', selectedService, null, servicesInterestedOptions);
}

/**
 * Populates the lead source dropdown.
 * @param {string|null} selectedSource - The source to pre-select.
 */
async function populateLeadSourceDropdown(selectedSource = null) {
    await populateSelect(leadSourceSelect, null, 'value', 'text', selectedSource, null, leadSourceOptions);
}


// Event listener to open the Lead Form for adding a new lead
addLeadBtn.addEventListener('click', () => {
    if (!currentUser) { showMessageBox('Please sign in to add leads.', false); return; }
    leadForm.reset();
    document.getElementById('lead-id').value = ''; // Clear ID for new lead
    resetAndHideForm(leadForm, leadFormContainer, '', leadFormMessage); // Reset and hide first
    leadFormContainer.classList.remove('hidden'); // Then show the container
    populateLeadServicesInterestedDropdown();
    populateLeadSourceDropdown();
});

// Event listener to save (add or update) a lead
leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessageBox('Authentication required to save lead.', false); return; }

    const leadId = document.getElementById('lead-id').value;

    const leadData = {
        contactName: leadContactNameInput.value.trim(),
        phone: leadPhoneInput.value.trim(),
        email: leadEmailInput.value.trim(),
        servicesInterested: leadServicesInterestedSelect.value,
        eventDate: leadEventDateInput.value ? Timestamp.fromDate(new Date(leadEventDateInput.value)) : null,
        source: leadSourceSelect.value,
        additionalDetails: leadAdditionalDetailsTextarea.value.trim(),
        updatedAt: serverTimestamp()
    };

    try {
        if (leadId) {
            // Update existing lead
            await updateDoc(doc(db, `leads`, leadId), leadData);
            showMessageBox('Lead updated successfully!', false);
        } else {
            // Add new lead
            leadData.createdAt = serverTimestamp();
            leadData.creatorId = currentUser.uid;

            // --- DEBUGGING LOGS START ---
            console.log("--- Debugging Lead Create Attempt ---");
            console.log("currentUser (from global):", currentUser);
            console.log("currentUser.uid (from global):", currentUser ? currentUser.uid : "N/A");
            console.log("leadData (before addDoc):", JSON.stringify(leadData, null, 2)); // Stringify for full object view
            console.log("Is currentUser.uid === leadData.creatorId?", currentUser && leadData.creatorId && currentUser.uid === leadData.creatorId);
            console.log("-----------------------------------");
            // --- DEBUGGING LOGS END ---

            await addDoc(collection(db, `leads`), leadData);
            showMessageBox('Lead added successfully!', false);
        }
        resetAndHideForm(leadForm, leadFormContainer, '', leadFormMessage); // Clear and hide form
        renderLeadsGrid();
    } catch (error) {
        console.error("Error saving lead:", error);
        leadFormMessage.textContent = 'Error saving lead: ' + error.message;
        leadFormMessage.classList.remove('hidden');
        showMessageBox('Error saving lead: ' + error.message, false);
    }
});

/**
 * Renders or updates the Grid.js table for leads.
 * Fetches lead data from Firestore and displays it.
 */
async function renderLeadsGrid() {
    if (!currentUser) {
        noLeadsMessage.classList.remove('hidden');
        if (leadsGrid) {
            leadsGrid.destroy();
            leadsGrid = null;
        }
        leadsGridContainer.innerHTML = '';
        return;
    }

    try {
        await waitForGridJs();
    } catch (error) {
        leadsGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading lead data.</p>';
        return;
    }

    leadsGridContainer.innerHTML = '<p class="text-center py-4 text-gray-500">Loading Leads...</p>';
    noLeadsMessage.classList.add('hidden');

    let leadsRef = collection(db, `leads`);
    let q = query(leadsRef, orderBy('contactName'));
    // Apply creatorId filter for standard users
    if (currentUserRole !== 'Admin') {
        q = query(leadsRef, where('creatorId', '==', currentUser.uid), orderBy('contactName'));
    }
    const leadData = [];

    try {
        const snapshot = await getDocs(q);
        leadsGridContainer.innerHTML = ''; // Clear loading message

        if (snapshot.empty) {
            noLeadsMessage.classList.remove('hidden');
        } else {
            noLeadsMessage.classList.add('hidden');
            snapshot.forEach(doc => {
                const data = doc.data();
                leadData.push([
                    doc.id,
                    data.contactName,
                    data.phone,
                    data.email,
                    data.servicesInterested,
                    data.eventDate,
                    data.source,
                    data.additionalDetails,
                    data.createdAt,
                    data.creatorId // Include creatorId for permission checks
                ]);
            });

            if (leadsGrid) {
                leadsGrid.updateConfig({ data: leadData }).forceRender();
            } else {
                leadsGrid = new window.gridjs.Grid({
                    columns: [
                        { id: 'id', name: 'ID', hidden: true },
                        { id: 'contactName', name: 'Contact Name', sort: true, filter: true },
                        { id: 'phone', name: 'Phone', sort: true, filter: true },
                        { id: 'email', name: 'Email', sort: true, filter: true },
                        { id: 'servicesInterested', name: 'Services Interested', sort: true, filter: true },
                        { id: 'eventDate', name: 'Event Date', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
                        { id: 'source', name: 'Source', sort: true, filter: true },
                        { id: 'additionalDetails', name: 'Additional Details', hidden: true },
                        { id: 'createdAt', name: 'Created At', hidden: true },
                        { id: 'creatorId', name: 'Creator ID', hidden: true }, // Keep creatorId hidden but accessible for actions
                        {
                            name: 'Actions',
                            sort: false,
                            formatter: (cell, row) => {
                                const docId = row.cells[0].data;
                                const creatorId = row.cells[9].data; // Get creatorId from the row data
                                const canEditDelete = (currentUserRole === 'Admin' || creatorId === currentUser.uid);

                                return window.gridjs.h('div', { className: 'flex space-x-2' },
                                    window.gridjs.h('button', {
                                        className: `px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm ${canEditDelete ? '' : 'opacity-50 cursor-not-allowed'}`,
                                        onClick: () => canEditDelete ? editLead(docId) : showMessageBox('You do not have permission to edit this lead.', false),
                                        disabled: !canEditDelete
                                    }, 'Edit'),
                                    window.gridjs.h('button', {
                                        className: `px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 text-sm ${canEditDelete ? '' : 'opacity-50 cursor-not-allowed'}`,
                                        onClick: () => canEditDelete ? deleteLead(docId) : showMessageBox('You do not have permission to delete this lead.', false),
                                        disabled: !canEditDelete
                                    }, 'Delete')
                                );
                            }
                        }
                    ],
                    data: leadData,
                    search: {
                        selector: (cell, rowIndex, cellIndex) => {
                            // Search across contact name, phone, email, services, source
                            if (cellIndex === 1 || cellIndex === 2 || cellIndex === 3 || cellIndex === 4 || cellIndex === 6) {
                                return cell;
                            }
                            return null;
                        }
                    },
                    pagination: { enabled: true, limit: 10, summary: true },
                    sort: true,
                    resizable: true,
                    className: {
                        container: 'gridjs-container', table: 'min-w-full bg-white shadow-md rounded-lg overflow-hidden',
                        thead: 'bg-gray-200', th: 'py-3 px-4 text-left text-sm font-medium text-gray-700',
                        td: 'py-3 px-4 text-left text-sm text-gray-800', tr: 'divide-y divide-gray-200',
                        footer: 'bg-gray-50 p-4 flex justify-between items-center',
                        pagination: 'flex items-center space-x-2',
                        'pagination-summary': 'text-sm text-gray-600', 'pagination-gap': 'text-sm text-gray-400',
                        'pagination-nav': 'flex space-x-1', 'pagination-nav-prev': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                        'pagination-nav-next': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                        'pagination-btn': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                        'pagination-btn-current': 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
                    },
                    language: {
                        'search': { 'placeholder': 'Search leads...' },
                        'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                        'noRecordsFound': 'No Lead Data Available',
                    }
                }).render(leadsGridContainer);
            }
        }
    } catch (error) {
        console.error("Error rendering leads grid:", error);
        showMessageBox('Could not load lead data: ' + error.message, false);
        leadsGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading lead data.</p>';
    }
}

/**
 * Populates the lead form with existing data for editing.
 * @param {string} leadId - The ID of the lead document to edit.
 */
async function editLead(leadId) {
    if (!currentUser) { showMessageBox('Please sign in to edit leads.', false); return; }

    try {
        const docSnap = await getDoc(doc(db, `leads`, leadId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Check if current user is the creator or an Admin
            if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
                showMessageBox('You can only edit leads you have created.', false);
                return;
            }

            document.getElementById('lead-id').value = docSnap.id;

            leadFormContainer.classList.remove('hidden');
            leadFormMessage.classList.add('hidden');

            leadContactNameInput.value = data.contactName || '';
            leadPhoneInput.value = data.phone || '';
            leadEmailInput.value = data.email || '';
            await populateLeadServicesInterestedDropdown(data.servicesInterested);
            leadEventDateInput.value = formatDateForInput(data.eventDate);
            await populateLeadSourceDropdown(data.source);
            leadAdditionalDetailsTextarea.value = data.additionalDetails || '';
        } else {
            showMessageBox('Lead not found!', false);
        }
    } catch (error) {
        console.error("Error editing lead:", error);
        showMessageBox('Error loading lead for edit: ' + error.message, false);
    }
}

/**
 * Deletes a lead document from Firestore.
 * Requires Admin role or creator.
 * @param {string} leadId - The ID of the lead document to delete.
 */
async function deleteLead(leadId) {
    if (!currentUser) { showMessageBox('Please sign in to delete leads.', false); return; }

    const confirmed = await showMessageBox('Are you sure you want to delete this lead? This action cannot be undone.', true);
    if (!confirmed) return;

    try {
        const docSnap = await getDoc(doc(db, `leads`, leadId));
        if (!docSnap.exists()) {
            showMessageBox('Lead not found!', false);
            return;
        }
        const data = docSnap.data();
        // Check if current user is the creator or an Admin
        if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
            showMessageBox('You can only delete leads you have created.', false);
            return;
        }

        await deleteDoc(doc(db, `leads`, leadId));
        showMessageBox('Lead deleted successfully!', false);
        renderLeadsGrid();
    } catch (error) {
        console.error("Error deleting lead:", error);
        showMessageBox('Error deleting lead: ' + error.message, false);
    }
}


// --- Opportunities Module ---

/**
 * Populates the opportunity customer dropdown with data from the 'customers' collection.
 * @param {string|null} selectedCustomerId - The customer ID to pre-select (optional).
 */
async function populateOpportunityCustomerDropdown(selectedCustomerId = null) {
    if (!currentUser) return;
    const selectElement = opportunityCustomerSelect;
    selectElement.innerHTML = '<option value="">Select a Customer</option>';
    let customerQueryRef = collection(db, `customers`);
    // The security rule for customers allows all authenticated users to read all customers.
    // So, we don't need to filter by creatorId here.
    let q = query(customerQueryRef, orderBy('name'));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = data.name;
        if (selectedCustomerId && doc.id === selectedCustomerId) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

/**
 * Populates the opportunity currency dropdown with data from the 'currencies' collection.
 * @param {string|null} selectedCurrencyCode - The currency code to pre-select (optional).
 */
async function populateOpportunityCurrencyDropdown(selectedCurrencyCode = null) {
    if (!currentUser) return;
    // FIX: Change valueField from 'symbol' to 'code'
    await populateSelect(opportunityCurrencySelect, `currencies`, 'code', 'name', selectedCurrencyCode);
}

/**
 * Populates the opportunity price book dropdown with data from the 'priceBooks' collection.
 * @param {string|null} selectedPriceBookId - The price book ID to pre-select (optional).
 * @param {string|null} currencyCode - The currency code to filter price books by (optional).
 */
async function populateOpportunityPriceBookDropdown(selectedPriceBookId = null, currencyCode = null) {
    if (!currentUser) return;
    const selectElement = opportunityPriceBookSelect;
    selectElement.innerHTML = '<option value="">Select a Price Book</option>'; // Default empty option

    let priceBookQueryRef = collection(db, `priceBooks`);
    let q;

    if (currencyCode) {
        // Filter by currency code (now stored in 'currency' field) and ensure it's active
        q = query(priceBookQueryRef,
            where('currency', '==', currencyCode), // Filter by code
            where('isActive', '==', true),
            orderBy('name')
        );
    } else {
        // If no currency, still only show active ones
        q = query(priceBookQueryRef, where('isActive', '==', true), orderBy('name'));
    }

    try {
        const snapshot = await getDocs(q);
        let defaultSelected = false;

        snapshot.forEach(doc => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = data.name;

            // Prioritize explicit selection, then auto-select first active matching currency
            if (selectedPriceBookId && doc.id === selectedPriceBookId) {
                option.selected = true;
                defaultSelected = true;
            } else if (currencyCode && !defaultSelected && data.currency === currencyCode && data.isActive) {
                // If a currency is specified and no explicit price book is selected,
                // select the first active price book that matches the currency.
                // This logic might need refinement if you have multiple active price books for one currency.
                option.selected = true;
                defaultSelected = true;
            }
            selectElement.appendChild(option);
        });

        // If no price book was selected (either explicitly or by currency match),
        // and there are options, ensure the default "Select a Price Book" is shown.
        if (!defaultSelected && selectElement.options.length > 1) {
            selectElement.value = ''; // Ensure "Select a Price Book" is chosen
        }

    } catch (error) {
        console.error(`Error fetching price books for dropdown (currency: ${currencyCode}):`, error);
        showMessageBox(`Could not load price books for selected currency.`, false);
    }
}

// Event listener for currency selection change to update price book dropdown
opportunityCurrencySelect.addEventListener('change', () => {
    const selectedCurrencyCode = opportunityCurrencySelect.value; // Now gets the code
    populateOpportunityPriceBookDropdown(null, selectedCurrencyCode); // Pass null for selectedPriceBookId, let it auto-select
});


// Event listener to open the Opportunity Form for adding a new opportunity
addOpportunityBtn.addEventListener('click', async () => { // Made async to await dropdown populations
    if (!currentUser) { showMessageBox('Please sign in to add opportunities.', false); return; }
    document.getElementById('opportunity-id').value = ''; // Clear ID for new opportunity
    resetAndHideForm(opportunityForm, opportunityFormContainer, '', opportunityFormMessage); // Reset and hide first
    opportunityFormContainer.classList.remove('hidden'); // Then show the container

    // Reset and hide work log form and list when creating a new opportunity
    resetAndHideForm(workLogForm, workLogFormContainer, '', workLogFormMessage);
    workLogsList.innerHTML = '';
    noWorkLogsMessage.classList.remove('hidden');
    currentOpportunityId = null; // No opportunity selected yet

    // Populate dropdowns. Order matters: currency first, then price book.
    await populateOpportunityCustomerDropdown();
    await populateOpportunityCurrencyDropdown();
    await populateOpportunityPriceBookDropdown();

    // Setup accordions for the new form
    setupAccordions();
});

// Event listener to save (add or update) an opportunity
opportunityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessageBox('Authentication required to save opportunity.', false); return; }

    const opportunityId = document.getElementById('opportunity-id').value;

    const selectedCustomerOption = opportunityCustomerSelect.options[opportunityCustomerSelect.selectedIndex];
    const customerName = selectedCustomerOption ? selectedCustomerOption.textContent : '';

    const opportunityData = {
        name: opportunityNameInput.value.trim(),
        customerId: opportunityCustomerSelect.value,
        customerName: customerName,
        currency: opportunityCurrencySelect.value, // Now stores the currency CODE
        priceBookId: opportunityPriceBookSelect.value,
        expectedStartDate: opportunityExpectedStartDateInput.value ? Timestamp.fromDate(new Date(opportunityExpectedStartDateInput.value)) : null,
        expectedCloseDate: opportunityExpectedCloseDateInput.value ? Timestamp.fromDate(new Date(opportunityExpectedCloseDateInput.value)) : null,
        salesStage: opportunitySalesStageSelect.value,
        probability: parseInt(opportunityProbabilityInput.value, 10),
        value: parseFloat(opportunityValueInput.value),
        notes: opportunityNotesTextarea.value.trim(),
        updatedAt: serverTimestamp()
    };

    try {
        if (opportunityId) {
            await updateDoc(doc(db, `opportunities`, opportunityId), opportunityData);
            showMessageBox('Opportunity updated successfully!', false);
        } else {
            opportunityData.createdAt = serverTimestamp();
            opportunityData.creatorId = currentUser.uid;
            await addDoc(collection(db, `opportunities`), opportunityData);
            showMessageBox('Opportunity added successfully!', false);
        }
        resetAndHideForm(opportunityForm, opportunityFormContainer, '', opportunityFormMessage); // Clear and hide form
        renderOpportunitiesGrid();
        updateDashboardStats();
    } catch (error) {
        console.error("Error saving opportunity:", error);
        opportunityFormMessage.textContent = 'Error saving opportunity: ' + error.message;
        opportunityFormMessage.classList.remove('hidden');
        showMessageBox('Error saving opportunity: ' + error.message, false);
    }
});

/**
 * Renders or updates the Grid.js table for opportunities.
 * Fetches opportunity data from Firestore and displays it.
 */
async function renderOpportunitiesGrid() {
    if (!currentUser) {
        noOpportunitiesMessage.classList.remove('hidden');
        if (opportunitiesGrid) {
            opportunitiesGrid.destroy();
            opportunitiesGrid = null;
        }
        opportunitiesGridContainer.innerHTML = '';
        return;
    }

    // Ensure window.gridjs is available before attempting to use it
    try {
        await waitForGridJs();
    } catch (error) {
        // Error message already shown by waitForGridJs
        opportunitiesGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading opportunity data.</p>';
        return;
    }

    opportunitiesGridContainer.innerHTML = '<p class="text-center py-4 text-gray-500">Loading Opportunities...</p>';
    noOpportunitiesMessage.classList.add('hidden');

    let opportunitiesRef = collection(db, `opportunities`);
    let q = query(opportunitiesRef, orderBy('expectedCloseDate'));
    if (currentUserRole !== 'Admin') {
        q = query(opportunitiesRef, where('creatorId', '==', currentUser.uid), orderBy('expectedCloseDate'));
    }
    const opportunityData = [];

    try {
        const snapshot = await getDocs(q);
        opportunitiesGridContainer.innerHTML = ''; // Clear loading message

        if (snapshot.empty) {
            noOpportunitiesMessage.classList.remove('hidden');
        } else {
            noOpportunitiesMessage.classList.add('hidden'); // Ensure it's hidden if data is present
            snapshot.forEach(doc => {
                const data = doc.data();
                opportunityData.push([
                    doc.id,
                    data.name,
                    data.customerName,
                    data.salesStage,
                    data.probability,
                    data.value,
                    data.currency, // This is now the currency CODE
                    data.expectedCloseDate,
                    data.createdAt,
                    data.creatorId // Added creatorId for rule check
                ]);
            });

            if (opportunitiesGrid) {
                opportunitiesGrid.updateConfig({ data: opportunityData }).forceRender();
            } else {
                opportunitiesGrid = new window.gridjs.Grid({
                    columns: [
                        { id: 'id', name: 'ID', hidden: true },
                        { id: 'name', name: 'Opportunity Name', sort: true, filter: true },
                        { id: 'customerName', name: 'Customer', sort: true, filter: true },
                        { id: 'salesStage', name: 'Stage', sort: true, filter: true },
                        { id: 'probability', name: 'Probability (%)', sort: true, filter: true },
                        {
                            id: 'value',
                            name: 'Value',
                            sort: true,
                            filter: true,
                            formatter: (cell, row) => {
                                const currencyCode = row.cells[6].data; // Get currency CODE from the row
                                const currencySymbol = currencySymbolsMap[currencyCode] || currencyCode; // Look up symbol or fallback to code
                                return cell.toLocaleString('en-US', { style: 'currency', currency: currencyCode || 'USD' });
                            }
                        },
                        { id: 'currency', name: 'Currency Code', sort: true, filter: true }, // Changed column name
                        { id: 'expectedCloseDate', name: 'Close Date', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
                        { id: 'creatorId', name: 'Creator ID', hidden: true }, // Keep creatorId hidden but accessible for actions
                        {
                            name: 'Actions',
                            sort: false,
                            formatter: (cell, row) => {
                                const docId = row.cells[0].data;
                                const creatorId = row.cells[8].data; // Get creatorId from the row data
                                const canEditDelete = (currentUserRole === 'Admin' || creatorId === currentUser.uid);

                                return window.gridjs.h('div', { className: 'flex space-x-2' },
                                    window.gridjs.h('button', {
                                        className: `px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm ${canEditDelete ? '' : 'opacity-50 cursor-not-allowed'}`,
                                        onClick: () => canEditDelete ? editOpportunity(docId) : showMessageBox('You do not have permission to edit this opportunity.', false),
                                        disabled: !canEditDelete
                                    }, 'Edit'),
                                    window.gridjs.h('button', {
                                        className: `px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 text-sm ${canEditDelete ? '' : 'opacity-50 cursor-not-allowed'}`,
                                        onClick: () => canEditDelete ? deleteOpportunity(docId) : showMessageBox('You do not have permission to delete this opportunity.', false),
                                        disabled: !canEditDelete
                                    }, 'Delete')
                                );
                            }
                        }
                    ],
                    data: opportunityData,
                    search: {
                        selector: (cell, rowIndex, cellIndex) => {
                            // Search across name, customerName, salesStage, currency code
                            if (cellIndex === 1 || cellIndex === 2 || cellIndex === 3 || cellIndex === 6) {
                                return cell;
                            }
                            return null;
                        }
                    },
                    pagination: { enabled: true, limit: 10, summary: true },
                    sort: true,
                    resizable: true,
                    className: {
                        container: 'gridjs-container', table: 'min-w-full bg-white shadow-md rounded-lg overflow-hidden',
                        thead: 'bg-gray-200', th: 'py-3 px-4 text-left text-sm font-medium text-gray-700',
                        td: 'py-3 px-4 text-left text-sm text-gray-800', tr: 'divide-y divide-gray-200',
                        footer: 'bg-gray-50 p-4 flex justify-between items-center',
                        pagination: 'flex items-center space-x-2',
                        'pagination-summary': 'text-sm text-gray-600', 'pagination-gap': 'text-sm text-gray-400',
                        'pagination-nav': 'flex space-x-1', 'pagination-nav-prev': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                        'pagination-nav-next': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                        'pagination-btn': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-300',
                        'pagination-btn-current': 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
                    },
                    language: {
                        'search': { 'placeholder': 'Search opportunities...' },
                        'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                        'noRecordsFound': 'No Opportunity Data Available',
                    }
                }).render(opportunitiesGridContainer);
            }
        }
    } catch (error) {
        console.error("Error rendering opportunities grid:", error);
        showMessageBox('Could not load opportunity data: ' + error.message, false);
        opportunitiesGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading opportunity data.</p>';
    }
}

/**
 * Populates the opportunity form with existing data for editing.
 * @param {string} opportunityId - The ID of the opportunity document to edit.
 */
async function editOpportunity(opportunityId) {
    if (!currentUser) { showMessageBox('Please sign in to edit opportunities.', false); return; }

    try {
        const docSnap = await getDoc(doc(db, `opportunities`, opportunityId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Check if current user is the creator or an Admin
            if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
                showMessageBox('You can only edit opportunities you have created.', false);
                return;
            }

            document.getElementById('opportunity-id').value = docSnap.id;
            currentOpportunityId = docSnap.id; // Set the global currentOpportunityId

            opportunityFormContainer.classList.remove('hidden');
            opportunityFormMessage.classList.add('hidden');

            opportunityNameInput.value = data.name || '';
            await populateOpportunityCustomerDropdown(data.customerId);
            await populateOpportunityCurrencyDropdown(data.currency); // Pass currency CODE for pre-selection
            await populateOpportunityPriceBookDropdown(data.priceBookId, data.currency); // Pass currency CODE for edit
            opportunityExpectedStartDateInput.value = formatDateForInput(data.expectedStartDate);
            opportunityExpectedCloseDateInput.value = formatDateForInput(data.expectedCloseDate);
            opportunitySalesStageSelect.value = data.salesStage || '';
            opportunityProbabilityInput.value = data.probability || 0;
            opportunityValueInput.value = data.value || 0;
            opportunityNotesTextarea.value = data.notes || '';

            // Load and render work logs for this opportunity
            await renderWorkLogsList(currentOpportunityId);
            // Ensure work log form is hidden and reset
            resetAndHideForm(workLogForm, workLogFormContainer, '', workLogFormMessage);

            // Setup accordions for the loaded form
            setupAccordions();

        } else {
            showMessageBox('Opportunity not found!', false);
        }
    } catch (error) {
        console.error("Error editing opportunity:", error);
        showMessageBox('Error loading opportunity for edit: ' + error.message, false);
    }
}

/**
 * Deletes an opportunity document from Firestore.
 * Requires Admin role or creator.
 * @param {string} opportunityId - The ID of the opportunity document to delete.
 */
async function deleteOpportunity(opportunityId) {
    if (!currentUser) { showMessageBox('Please sign in to delete opportunities.', false); return; }

    const confirmed = await showMessageBox('Are you sure you want to delete this opportunity? This action cannot be undone.', true);
    if (!confirmed) return;

    try {
        const docSnap = await getDoc(doc(db, `opportunities`, opportunityId));
        if (!docSnap.exists()) {
            showMessageBox('Opportunity not found!', false);
            return;
        }
        const data = docSnap.data();
        // Check if current user is the creator or an Admin
        if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
            showMessageBox('You can only delete opportunities you have created.', false);
            return;
        }

        await deleteDoc(doc(db, `opportunities`, opportunityId));
        showMessageBox('Opportunity deleted successfully!', false);
        renderOpportunitiesGrid();
        updateDashboardStats();
    } catch (error) {
        console.error("Error deleting opportunity:", error);
        showMessageBox('Error deleting opportunity: ' + error.message, false);
    }
}

// --- Work Logs Module (NEW) ---

// Static options for work log types
const workLogTypeOptions = [
    { value: "Call", text: "Call" },
    { value: "Email", text: "Email" },
    { value: "Meeting", text: "Meeting" },
    { value: "Task", text: "Task" },
    { value: "Note", text: "Note" },
    { value: "Other", text: "Other" },
];

/**
 * Populates the work log type dropdown.
 * @param {string|null} selectedType - The type to pre-select.
 */
async function populateWorkLogTypeDropdown(selectedType = null) {
    await populateSelect(workLogTypeSelect, null, 'value', 'text', selectedType, null, workLogTypeOptions);
}

// Event listener to open the Work Log Entry Form
addWorkLogEntryBtn.addEventListener('click', () => {
    if (!currentOpportunityId) {
        showMessageBox('Please select or save an opportunity first to add work logs.', false);
        return;
    }
    workLogForm.reset();
    workLogIdInput.value = ''; // Clear ID for new entry
    workLogOpportunityIdInput.value = currentOpportunityId; // Link to current opportunity
    workLogDateInput.valueAsDate = new Date(); // Default to today's date
    resetAndHideForm(workLogForm, workLogFormContainer, '', workLogFormMessage); // Reset and hide first
    workLogFormContainer.classList.remove('hidden'); // Then show the container
    populateWorkLogTypeDropdown();

    // Attach workLogForm submit listener only once, now that the form is visible
    if (!workLogFormListenerAdded) {
        workLogForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser || !currentOpportunityId) {
                showMessageBox('Authentication required and an opportunity must be selected to save work logs.', false);
                return;
            }

            const workLogId = workLogIdInput.value;
            const opportunityId = workLogOpportunityIdInput.value; // Get parent opportunity ID

            const workLogData = {
                date: workLogDateInput.value ? Timestamp.fromDate(new Date(workLogDateInput.value)) : null,
                type: workLogTypeSelect.value,
                details: workLogDetailsTextarea.value.trim(),
                createdAt: serverTimestamp(), // Will only be set on creation
                updatedAt: serverTimestamp(),
                creatorId: currentUser.uid
            };

            try {
                if (workLogId) {
                    // Update existing work log
                    await updateDoc(doc(db, `opportunities/${opportunityId}/workLogs`, workLogId), {
                        date: workLogData.date,
                        type: workLogData.type,
                        details: workLogData.details,
                        updatedAt: workLogData.updatedAt // Only update these fields
                    });
                    showMessageBox('Work log updated successfully!', false);
                } else {
                    // Add new work log
                    await addDoc(collection(db, `opportunities/${opportunityId}/workLogs`), workLogData);
                    showMessageBox('Work log added successfully!', false);
                }
                resetAndHideForm(workLogForm, workLogFormContainer, '', workLogFormMessage);
                await renderWorkLogsList(opportunityId); // Re-render the list
            } catch (error) {
                console.error("Error saving work log:", error);
                workLogFormMessage.textContent = 'Error saving work log: ' + error.message;
                workLogFormMessage.classList.remove('hidden');
                showMessageBox('Error saving work log: ' + error.message, false);
            }
        });
        workLogFormListenerAdded = true; // Set flag to true after adding listener
    }
});

// Event listener for cancel work log button
cancelWorkLogBtn.addEventListener('click', () => {
    resetAndHideForm(workLogForm, workLogFormContainer, '', workLogFormMessage);
});


/**
 * Renders the list of work logs for a given opportunity.
 * @param {string} opportunityId - The ID of the opportunity.
 */
async function renderWorkLogsList(opportunityId) {
    if (!currentUser || !opportunityId) {
        workLogsList.innerHTML = '';
        noWorkLogsMessage.classList.remove('hidden');
        return;
    }

    workLogsList.innerHTML = '<li class="text-center text-gray-500">Loading work logs...</li>';
    noWorkLogsMessage.classList.add('hidden');

    try {
        const workLogsRef = collection(db, `opportunities/${opportunityId}/workLogs`);
        // Order by date, then by creation time for consistent display
        const q = query(workLogsRef, orderBy('date', 'desc'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        workLogsList.innerHTML = ''; // Clear loading message

        if (snapshot.empty) {
            noWorkLogsMessage.classList.remove('hidden');
        } else {
            noWorkLogsMessage.classList.add('hidden');
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const li = document.createElement('li');
                li.className = 'bg-gray-100 p-3 rounded-md shadow-sm flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 sm:space-x-4';
                li.innerHTML = `
                    <div class="flex-grow">
                        <p class="text-sm font-semibold text-gray-700">${formatDateForDisplay(data.date)} - ${data.type}</p>
                        <p class="text-gray-600 text-sm">${data.details}</p>
                        <p class="text-xs text-gray-500 mt-1">Logged by ${data.creatorId === currentUser.uid ? 'You' : data.creatorId} on ${formatDateForDisplay(data.createdAt)}</p>
                    </div>
                    <div class="flex space-x-2 mt-2 sm:mt-0">
                        <button type="button" class="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm edit-work-log-btn"
                            data-work-log-id="${docSnap.id}" data-opportunity-id="${opportunityId}">Edit</button>
                        <button type="button" class="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 text-sm delete-work-log-btn"
                            data-work-log-id="${docSnap.id}" data-opportunity-id="${opportunityId}">Delete</button>
                    </div>
                `;
                workLogsList.appendChild(li);
            });

            // Add event listeners for new buttons
            workLogsList.querySelectorAll('.edit-work-log-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const workLogId = e.target.dataset.workLogId;
                    const oppId = e.target.dataset.opportunityId;
                    editWorkLogEntry(oppId, workLogId);
                });
            });
            workLogsList.querySelectorAll('.delete-work-log-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const workLogId = e.target.dataset.workLogId;
                    const oppId = e.target.dataset.opportunityId;
                    deleteWorkLogEntry(oppId, workLogId);
                });
            });

        }
    } catch (error) {
        console.error("Error rendering work logs:", error);
        showMessageBox('Could not load work logs: ' + error.message, false);
        workLogsList.innerHTML = '<li class="text-center text-red-500">Error loading work logs.</li>';
    }
}

/**
 * Populates the work log form with existing data for editing.
 * @param {string} opportunityId - The ID of the parent opportunity.
 * @param {string} workLogId - The ID of the work log document to edit.
 */
async function editWorkLogEntry(opportunityId, workLogId) {
    if (!currentUser || !opportunityId || !workLogId) {
        showMessageBox('Invalid request to edit work log.', false);
        return;
    }

    try {
        const docSnap = await getDoc(doc(db, `opportunities/${opportunityId}/workLogs`, workLogId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Check if current user is the creator or an Admin
            if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
                showMessageBox('You can only edit work logs you have created.', false);
                return;
            }

            workLogIdInput.value = docSnap.id;
            workLogOpportunityIdInput.value = opportunityId;

            workLogFormContainer.classList.remove('hidden');
            workLogFormMessage.classList.add('hidden');

            workLogDateInput.value = formatDateForInput(data.date);
            await populateWorkLogTypeDropdown(data.type);
            workLogDetailsTextarea.value = data.details || '';

            // Attach workLogForm submit listener if not already added (for edit scenario)
            if (!workLogFormListenerAdded) {
                workLogForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    if (!currentUser || !currentOpportunityId) {
                        showMessageBox('Authentication required and an opportunity must be selected to save work logs.', false);
                        return;
                    }

                    const workLogId = workLogIdInput.value;
                    const opportunityId = workLogOpportunityIdInput.value; // Get parent opportunity ID

                    const workLogData = {
                        date: workLogDateInput.value ? Timestamp.fromDate(new Date(workLogDateInput.value)) : null,
                        type: workLogTypeSelect.value,
                        details: workLogDetailsTextarea.value.trim(),
                        createdAt: serverTimestamp(), // Will only be set on creation
                        updatedAt: serverTimestamp(),
                        creatorId: currentUser.uid
                    };

                    try {
                        if (workLogId) {
                            // Update existing work log
                            await updateDoc(doc(db, `opportunities/${opportunityId}/workLogs`, workLogId), {
                                date: workLogData.date,
                                type: workLogData.type,
                                details: workLogData.details,
                                updatedAt: workLogData.updatedAt // Only update these fields
                            });
                            showMessageBox('Work log updated successfully!', false);
                        } else {
                            // Add new work log
                            await addDoc(collection(db, `opportunities/${opportunityId}/workLogs`), workLogData);
                            showMessageBox('Work log added successfully!', false);
                        }
                        resetAndHideForm(workLogForm, workLogFormContainer, '', workLogFormMessage);
                        await renderWorkLogsList(opportunityId); // Re-render the list
                    } catch (error) {
                        console.error("Error saving work log:", error);
                        workLogFormMessage.textContent = 'Error saving work log: ' + error.message;
                        workLogFormMessage.classList.remove('hidden');
                        showMessageBox('Error saving work log: ' + error.message, false);
                    }
                });
                workLogFormListenerAdded = true;
            }

        } else {
            showMessageBox('Work log entry not found!', false);
        }
    } catch (error) {
        console.error("Error editing work log entry:", error);
        showMessageBox('Error loading work log entry for edit: ' + error.message, false);
    }
}

/**
 * Deletes a work log entry from Firestore.
 * @param {string} opportunityId - The ID of the parent opportunity.
 * @param {string} workLogId - The ID of the work log document to delete.
 */
async function deleteWorkLogEntry(opportunityId, workLogId) {
    if (!currentUser || !opportunityId || !workLogId) {
        showMessageBox('Invalid request to delete work log.', false);
        return;
    }

    const confirmed = await showMessageBox('Are you sure you want to delete this work log entry? This action cannot be undone.', true);
    if (!confirmed) return;

    try {
        const docSnap = await getDoc(doc(db, `opportunities/${opportunityId}/workLogs`, workLogId));
        if (!docSnap.exists()) {
            showMessageBox('Work log entry not found!', false);
            return;
        }
        const data = docSnap.data();
        // Check if current user is the creator or an Admin
        if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
            showMessageBox('You can only delete work logs you have created.', false);
            return;
        }

        await deleteDoc(doc(db, `opportunities/${opportunityId}/workLogs`, workLogId));
        showMessageBox('Work log entry deleted successfully!', false);
        await renderWorkLogsList(opportunityId); // Re-render the list
    } catch (error) {
        console.error("Error deleting work log entry:", error);
        showMessageBox('Error deleting work log entry: ' + error.message, false);
    }
}


// --- Countries Management (Admin Only) ---

// Event listener to open the Country Form for adding a new country
addCountryBtn.addEventListener('click', () => {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can add countries.', false); return; }
    document.getElementById('country-id').value = ''; // Clear ID for new country
    countryStatesTextarea.value = ''; // Clear states textarea for new entry
    resetAndHideForm(countryForm, countryFormContainer, '', countryFormMessage); // Clear and hide form
    countryFormContainer.classList.remove('hidden'); // Then show the container
});

// Event listener to save (add or update) a country
countryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can save countries.', false); return; }

    const countryId = document.getElementById('country-id').value;

    // Parse comma-separated states into an array
    const statesArray = countryStatesTextarea.value.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const countryData = {
        name: countryNameInput.value.trim(),
        code: countryCodeInput.value.trim().toUpperCase(),
        states: statesArray, // Store as an array
    };

    try {
        // Client-side validation for unique country code
        let q = query(collection(db, `countries`), where('code', '==', countryData.code));
        const existingCountriesSnapshot = await getDocs(q);

        let isDuplicate = false;
        if (countryId) { // Editing existing
            existingCountriesSnapshot.forEach(doc => {
                if (doc.id !== countryId) {
                    isDuplicate = true;
                }
            });
        } else { // Adding new
            if (!existingCountriesSnapshot.empty) {
                isDuplicate = true;
            }
        }

        if (isDuplicate) {
            countryFormMessage.textContent = 'A country with this code already exists. Please use a unique code.';
            countryFormMessage.classList.remove('hidden');
            return;
        }

        if (countryId) {
            await updateDoc(doc(db, `countries`, countryId), countryData);
            showMessageBox('Country updated successfully!', false);
        } else {
            await addDoc(collection(db, `countries`), countryData);
            showMessageBox('Country added successfully!', false);
        }
        resetAndHideForm(countryForm, countryFormContainer, '', countryFormMessage); // Clear and hide form
        countryStatesTextarea.value = ''; // Clear states textarea after successful save
        renderCountriesStatesGrid();
        populateCustomerCountryDropdown(); // Refresh customer dropdown
        populateOpportunityCustomerDropdown(); // Refresh opportunity customer dropdown (if it depends on countries)
    } catch (error) {
        console.error("Error saving country:", error);
        countryFormMessage.textContent = 'Error saving country: ' + error.message;
        countryFormMessage.classList.remove('hidden');
        showMessageBox('Error saving country: ' + error.message, false);
    }
});

/**
 * Renders or updates the Grid.js table for countries.
 * Fetches data from the 'countries' collection.
 */
async function renderCountriesStatesGrid() {
    if (!currentUser || currentUserRole !== 'Admin') {
        noCountriesMessage.classList.remove('hidden');
        if (countriesStatesGrid) {
            countriesStatesGrid.destroy();
            countriesStatesGrid = null;
        }
        countriesGridContainer.innerHTML = '';
        return;
    }

    // Ensure window.gridjs is available before attempting to use it
    try {
        await waitForGridJs();
    } catch (error) {
        // Error message already shown by waitForGridJs
        countriesGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading countries data.</p>';
        return;
    }

    countriesGridContainer.innerHTML = '<p class="text-center py-4 text-gray-500">Loading Countries...</p>';
    noCountriesMessage.classList.add('hidden');

    const countriesRef = collection(db, `countries`);
    const data = [];

    try {
        const snapshot = await getDocs(query(countriesRef, orderBy('name')));
        countriesGridContainer.innerHTML = ''; // Clear loading message

        if (snapshot.empty) {
            noCountriesMessage.classList.remove('hidden');
        } else {
            noCountriesMessage.classList.add('hidden'); // Ensure it's hidden if data is present
            snapshot.forEach(doc => {
                const country = doc.data();
                data.push([
                    doc.id,
                    country.name,
                    country.code,
                    country.states ? country.states.join(', ') : '' // Display states as comma-separated string
                ]);
            });
        }

        if (countriesStatesGrid) {
            countriesStatesGrid.updateConfig({ data: data }).forceRender();
        } else {
            countriesStatesGrid = new window.gridjs.Grid({
                columns: [
                    { id: 'id', name: 'ID', hidden: true },
                    { id: 'name', name: 'Country Name', sort: true, filter: true },
                    { id: 'code', name: 'Code', sort: true, filter: true },
                    { id: 'states', name: 'States', sort: true, filter: true }, // New column for states
                    {
                        name: 'Actions',
                        sort: false,
                        formatter: (cell, row) => {
                            const docId = row.cells[0].data;
                            return window.gridjs.h('div', { className: 'flex space-x-2' },
                                window.gridjs.h('button', {
                                    className: 'px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onClick: () => editCountryState(docId)
                                }, 'Edit'),
                                window.gridjs.h('button', {
                                    className: 'px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 text-sm',
                                    onClick: () => deleteCountryState(docId)
                                }, 'Delete')
                            );
                        }
                    }
                ],
                data: data,
                search: {
                    selector: (cell, rowIndex, cellIndex) => {
                        // Include states column in search
                        if (cellIndex === 1 || cellIndex === 2 || cellIndex === 3) {
                            return cell;
                        }
                        return null;
                    }
                },
                pagination: { enabled: true, limit: 5, summary: true },
                sort: true,
                resizable: true,
                className: {
                    container: 'gridjs-container', table: 'min-w-full bg-white shadow-md rounded-lg overflow-hidden',
                    thead: 'bg-gray-200', th: 'py-3 px-4 text-left text-sm font-medium text-gray-700',
                    td: 'py-3 px-4 text-left text-sm text-gray-800', tr: 'divide-y divide-gray-200',
                    footer: 'bg-gray-50 p-4 flex justify-between items-center',
                    pagination: 'flex items-center space-x-2',
                    'pagination-summary': 'text-sm text-gray-600', 'pagination-gap': 'text-sm text-gray-400',
                    'pagination-nav': 'flex space-x-1', 'pagination-nav-prev': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                    'pagination-nav-next': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                    'pagination-btn': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                    'pagination-btn-current': 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
                },
                language: {
                    'search': { 'placeholder': 'Search countries...' },
                    'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                    'noRecordsFound': 'No Countries Data Available',
                }
            }).render(countriesGridContainer);
        }
    } catch (error) {
        console.error("Error rendering countries grid:", error);
        showMessageBox('Could not load countries data: ' + error.message, false);
        countriesGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading countries data.</p>';
    }
}

/**
 * Populates the country form with existing data for editing.
 * @param {string} id - The ID of the country document to edit.
 */
async function editCountryState(id) {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can edit countries.', false); return; }
    try {
        const docSnap = await getDoc(doc(db, `countries`, id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('country-id').value = docSnap.id;

            countryNameInput.value = data.name || '';
            countryCodeInput.value = data.code || '';
            countryStatesTextarea.value = Array.isArray(data.states) ? data.states.join(', ') : ''; // Populate states
            countryFormContainer.classList.remove('hidden');
            countryFormMessage.classList.add('hidden');
        } else {
            showMessageBox('Country not found!', false);
        }
    } catch (error) {
        console.error("Error loading country for edit:", error);
        showMessageBox('Error loading country for edit: ' + error.message, false);
    }
}

/**
 * Deletes a country document from Firestore.
 * Requires Admin role.
 * @param {string} id - The ID of the country document to delete.
 */
async function deleteCountryState(id) {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can delete countries.', false); return; }

    const confirmed = await showMessageBox('Are you sure you want to delete this country? This action cannot be undone.', true);
    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, `countries`, id));
        showMessageBox('Country deleted successfully!', false);
        renderCountriesStatesGrid();
        populateCustomerCountryDropdown();
        populateOpportunityCustomerDropdown(); // Refresh opportunity customer dropdown (if it depends on countries)
    } catch (error) {
        console.error("Error deleting country:", error);
        showMessageBox('Error deleting country: ' + error.message, false);
    }
}


// --- Currencies Management (Admin Only) ---

/**
 * Populates the currency country dropdown with data from the 'countries' collection.
 * @param {string|null} selectedCountry - The country name to pre-select (optional).
 */
async function populateCurrencyCountryDropdown(selectedCountry = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(currencyCountrySelect, `countries`, 'name', 'name', selectedCountry);
}

// Event listener to open the Currency Form for adding a new currency
addCurrencyBtn.addEventListener('click', () => {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can add currencies.', false); return; }
    document.getElementById('currency-id').value = ''; // Clear ID for new currency
    resetAndHideForm(currencyForm, currencyFormContainer, '', currencyFormMessage); // Clear and hide form
    currencyFormContainer.classList.remove('hidden'); // Then show the container
    populateCurrencyCountryDropdown(); // Populate country dropdown for new currency
});

// Event listener to save (add or update) a currency
currencyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can save currencies.', false); return; }

    const currencyId = document.getElementById('currency-id').value;

    const currencyData = {
        name: currencyNameInput.value.trim(),
        code: currencyCodeInput.value.trim().toUpperCase(),
        symbol: currencySymbolInput.value.trim(),
        country: currencyCountrySelect.value, // NEW: Include country
    };

    try {
        // Client-Side Uniqueness Validation for Currency (Code)
        let q = query(collection(db, `currencies`), where('code', '==', currencyData.code));
        const existingCurrenciesSnapshot = await getDocs(q);

        let isDuplicate = false;
        if (currencyId) { // Editing existing
            existingCurrenciesSnapshot.forEach(doc => {
                if (doc.id !== currencyId) {
                    isDuplicate = true;
                }
            });
        } else { // Adding new
            if (!existingCurrenciesSnapshot.empty) {
                isDuplicate = true;
            }
        }

        if (isDuplicate) {
            currencyFormMessage.textContent = 'A currency with this code already exists. Please use a unique code.';
            currencyFormMessage.classList.remove('hidden');
            return;
        }

        if (currencyId) {
            await updateDoc(doc(db, `currencies`, currencyId), currencyData);
            showMessageBox('Currency updated successfully!', false);
        } else {
            await addDoc(collection(db, `currencies`), currencyData);
            showMessageBox('Currency added successfully!', false);
        }
        resetAndHideForm(currencyForm, currencyFormContainer, '', currencyFormMessage); // Clear and hide form
        renderCurrenciesGrid();
        populateOpportunityCurrencyDropdown(); // Refresh opportunity dropdown
        populatePriceBookCurrencyDropdown(); // Refresh price book dropdown
    } catch (error) {
        console.error("Error saving currency:", error);
        currencyFormMessage.textContent = 'Error saving currency: ' + error.message;
        currencyFormMessage.classList.remove('hidden');
        showMessageBox('Error saving currency: ' + error.message, false);
    }
});

/**
 * Renders or updates the Grid.js table for currencies.
 * Fetches data from the 'currencies' collection.
 */
async function renderCurrenciesGrid() {
    if (!currentUser || currentUserRole !== 'Admin') {
        noCurrenciesMessage.classList.remove('hidden');
        if (currenciesGrid) {
            currenciesGrid.destroy();
            currenciesGrid = null;
        }
        currenciesGridContainer.innerHTML = '';
        return;
    }

    // Ensure window.gridjs is available before attempting to use it
    try {
        await waitForGridJs();
    } catch (error) {
        // Error message already shown by waitForGridJs
        currenciesGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading currency data.</p>';
        return;
    }

    currenciesGridContainer.innerHTML = '<p class="text-center py-4 text-gray-500">Loading Currencies...</p>';
    noCurrenciesMessage.classList.add('hidden');

    const currenciesRef = collection(db, `currencies`);
    const data = [];

    try {
        const snapshot = await getDocs(query(currenciesRef, orderBy('name')));
        currenciesGridContainer.innerHTML = ''; // Clear loading message

        if (snapshot.empty) {
            noCurrenciesMessage.classList.remove('hidden');
        } else {
            noCurrenciesMessage.classList.add('hidden'); // Ensure it's hidden if data is present
            snapshot.forEach(doc => {
                const currency = doc.data();
                data.push([
                    doc.id,
                    currency.name,
                    currency.code,
                    currency.symbol,
                    currency.country || '' // NEW: Include country in data for grid
                ]);
                // NEW: Populate the global currencySymbolsMap
                currencySymbolsMap[currency.code] = currency.symbol;
            });
        }

        if (currenciesGrid) {
            currenciesGrid.updateConfig({ data: data }).forceRender();
        } else {
            currenciesGrid = new window.gridjs.Grid({
                columns: [
                    { id: 'id', name: 'ID', hidden: true },
                    { id: 'name', name: 'Currency Name', sort: true, filter: true },
                    { id: 'code', name: 'Code', sort: true, filter: true },
                    { id: 'symbol', name: 'Symbol', sort: true, filter: true },
                    { id: 'country', name: 'Country', sort: true, filter: true }, // NEW: Country column
                    {
                        name: 'Actions',
                        sort: false,
                        formatter: (cell, row) => {
                            const docId = row.cells[0].data;
                            return window.gridjs.h('div', { className: 'flex space-x-2' },
                                window.gridjs.h('button', {
                                    className: 'px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onClick: () => editCurrency(docId)
                                }, 'Edit'),
                                window.gridjs.h('button', {
                                    className: 'px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 text-sm',
                                    onClick: () => deleteCurrency(docId)
                                }, 'Delete')
                            );
                        }
                    }
                ],
                data: data,
                search: {
                    selector: (cell, rowIndex, cellIndex) => {
                        if (cellIndex === 1 || cellIndex === 2 || cellIndex === 3 || cellIndex === 4) { // Include country in search
                            return cell;
                        }
                        return null;
                    }
                },
                pagination: { enabled: true, limit: 5, summary: true },
                sort: true,
                resizable: true,
                className: {
                    container: 'gridjs-container', table: 'min-w-full bg-white shadow-md rounded-lg overflow-hidden',
                    thead: 'bg-gray-200', th: 'py-3 px-4 text-left text-sm font-medium text-gray-700',
                    td: 'py-3 px-4 text-left text-sm text-gray-800', tr: 'divide-y divide-gray-200',
                    footer: 'bg-gray-50 p-4 flex justify-between items-center',
                    pagination: 'flex items-center space-x-2',
                    'pagination-summary': 'text-sm text-gray-600', 'pagination-gap': 'text-sm text-gray-400',
                    'pagination-nav': 'flex space-x-1', 'pagination-nav-prev': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                    'pagination-nav-next': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                    'pagination-btn': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-300',
                    'pagination-btn-current': 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
                },
                language: {
                    'search': { 'placeholder': 'Search currencies...' },
                    'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                    'noRecordsFound': 'No Currencies Data Available',
                }
            }).render(currenciesGridContainer);
        }
    } catch (error) {
        console.error("Error rendering currencies grid:", error);
        showMessageBox('Could not load currency data: ' + error.message, false);
        currenciesGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading currency data.</p>';
    }
}

/**
 * Populates the currency form with existing data for editing.
 * @param {string} id - The ID of the currency document to edit.
 */
async function editCurrency(id) {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can edit currencies.', false); return; }
    try {
        const docSnap = await getDoc(doc(db, `currencies`, id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('currency-id').value = docSnap.id;

            currencyNameInput.value = data.name || '';
            currencyCodeInput.value = data.code || '';
            currencySymbolInput.value = data.symbol || '';
            await populateCurrencyCountryDropdown(data.country); // NEW: Populate country dropdown
            currencyFormContainer.classList.remove('hidden');
            currencyFormMessage.classList.add('hidden');
        } else {
            showMessageBox('Currency not found!', false);
        }
    } catch (error) {
        console.error("Error loading currency for edit:", error);
        showMessageBox('Error loading currency for edit: ' + error.message, false);
    }
}

/**
 * Deletes a currency document from Firestore.
 * Requires Admin role.
 * @param {string} id - The ID of the currency document to delete.
 */
async function deleteCurrency(id) {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can delete currencies.', false); return; }

    const confirmed = await showMessageBox('Are you sure you want to delete this currency? This action cannot be undone.', true);
    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, `currencies`, id));
        showMessageBox('Currency deleted successfully!', false);
        renderCurrenciesGrid();
        populateOpportunityCurrencyDropdown();
        populatePriceBookCurrencyDropdown();
    } catch (error) {
        console.error("Error deleting currency:", error);
        showMessageBox('Error deleting currency: ' + error.message, false);
    }
}


// --- Price Books Management (Admin Only) ---

/**
 * Populates the price book currency dropdown with data from the 'currencies' collection.
 * @param {string|null} selectedCurrencyCode - The currency code to pre-select (optional).
 */
async function populatePriceBookCurrencyDropdown(selectedCurrencyCode = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    // FIX: Change valueField from 'symbol' to 'code'
    await populateSelect(priceBookCurrencySelect, `currencies`, 'code', 'name', selectedCurrencyCode);
}

// Event listener to open the Price Book Form for adding a new price book
addPriceBookBtn.addEventListener('click', () => {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can add price books.', false); return; }
    document.getElementById('price-book-id').value = ''; // Clear ID for new price book
    resetAndHideForm(priceBookForm, priceBookFormContainer, '', priceBookFormMessage); // Clear and hide form
    priceBookFormContainer.classList.remove('hidden'); // Then show the container
    priceBookActiveCheckbox.checked = true; // Default to active
    populatePriceBookCurrencyDropdown();
});

// Event listener to save (add or update) a price book
priceBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessageBox('Authentication required to save price book.', false); return; }

    const normalizedName = priceBookNameInput.value.trim().toLowerCase().replace(/\s+/g, '');
    const normalizedCurrency = priceBookCurrencySelect.value.trim().toLowerCase().replace(/\s+/g, ''); // This will now be the code

    const priceBookId = document.getElementById('price-book-id').value;

    const priceBookData = {
        name: priceBookNameInput.value.trim(),
        normalizedName: normalizedName,
        description: priceBookDescriptionTextarea.value.trim(),
        currency: priceBookCurrencySelect.value, // Now stores the currency CODE
        normalizedCurrency: normalizedCurrency, // Now normalized currency CODE
        isActive: priceBookActiveCheckbox.checked,
        // Removed validFrom and validTo fields
    };

    // const newIndexId = getPriceBookIndexId(priceBookData.name, priceBookData.currency); // No longer needed for client-side check

    try {
        // // Client-Side Uniqueness Validation for Price Book (Name, Currency) - TEMPORARILY REMOVED FOR DEBUGGING
        // const existingIndexDoc = await getDoc(doc(db, `priceBookNameCurrencyIndexes`, newIndexId));

        // if (existingIndexDoc.exists()) {
        //     if (existingIndexDoc.data().priceBookId !== priceBookId) {
        //         priceBookFormMessage.textContent = 'A price book with this Name and Currency already exists. Please choose a unique combination.';
        //         priceBookFormMessage.classList.remove('hidden');
        //         return;
        //     }
        // }

        let docRef;
        if (priceBookId) {
            docRef = doc(db, `priceBooks`, priceBookId);
            await updateDoc(docRef, priceBookData);
            showMessageBox('Price Book updated successfully!', false);

            // // Remove old index and create new one if name/currency changed - TEMPORARILY REMOVED FOR DEBUGGING
            // const oldPriceBookDoc = await getDoc(doc(db, `priceBooks`, priceBookId));
            // const oldPriceBookData = oldPriceBookDoc.data();
            // const oldIndexId = getPriceBookIndexId(oldPriceBookData.name, oldPriceBookData.currency);

            // if (oldIndexId !== newIndexId) {
            //     await deleteDoc(doc(db, `priceBookNameCurrencyIndexes`, oldIndexId));
            //     await setDoc(doc(db, `priceBookNameCurrencyIndexes`, newIndexId), {
            //         priceBookId: priceBookId,
            //         priceBookName: priceBookData.normalizedName,
            //         priceBookCurrency: priceBookData.normalizedCurrency
            //     });
            // }
        } else {
            const newDocRef = await addDoc(collection(db, `priceBooks`), priceBookData);
            docRef = newDocRef;
            showMessageBox('Price Book added successfully!', false);

            // // Create new index - TEMPORARILY REMOVED FOR DEBUGGING
            // await setDoc(doc(db, `priceBookNameCurrencyIndexes`, newIndexId), {
            //     priceBookId: docRef.id,
            //     priceBookName: priceBookData.normalizedName,
            //     priceBookCurrency: priceBookData.normalizedCurrency
            // });
        }
        resetAndHideForm(priceBookForm, priceBookFormContainer, '', priceBookFormMessage); // Clear and hide form
        renderPriceBooksGrid();
        populateOpportunityPriceBookDropdown();
    } catch (error) {
        console.error("Error saving price book:", error);
        priceBookFormMessage.textContent = 'Error saving price book: ' + error.message;
        priceBookFormMessage.classList.remove('hidden');
        showMessageBox('Error saving price book: ' + error.message, false);
    }
});

/**
 * Populates the price book form with existing data for editing.
 * @param {string} id - The ID of the price book document to edit.
 */
async function editPriceBook(id) {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can edit price books.', false); return; }
    try {
        const docSnap = await getDoc(doc(db, `priceBooks`, id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('price-book-id').value = docSnap.id;

            priceBookNameInput.value = data.name || '';
            priceBookDescriptionTextarea.value = data.description || '';
            await populatePriceBookCurrencyDropdown(data.currency); // Populate currency dropdown with code
            priceBookActiveCheckbox.checked = data.isActive;
            // Removed validFrom and validTo
            // priceBookValidFromInput.value = formatDateForInput(data.validFrom);
            // priceBookValidToInput.value = formatDateForInput(data.validTo);

            priceBookFormContainer.classList.remove('hidden');
            priceBookFormMessage.classList.add('hidden');
        } else {
            showMessageBox('Price Book not found!', false);
        }
    } catch (error) {
        console.error("Error loading price book for edit:", error);
        showMessageBox('Error loading price book for edit: ' + error.message, false);
    }
}

/**
 * Deletes a price book document from Firestore.
 * Requires Admin role.
 * @param {string} id - The ID of the price book document to delete.
 */
async function deletePriceBook(id) {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can delete price books.', false); return; }

    const confirmed = await showMessageBox('Are you sure you want to delete this price book? This action cannot be undone.', true);
    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, `priceBooks`, id));
        showMessageBox('Price Book deleted successfully!', false);
        renderPriceBooksGrid();
        populateOpportunityPriceBookDropdown();
    } catch (error) {
        console.error("Error deleting price book:", error);
        showMessageBox('Error deleting price book: ' + error.message, false);
    }
}

/**
 * Renders or updates the Grid.js table for price books.
 * Fetches data from the 'priceBooks' collection.
 */
async function renderPriceBooksGrid() { // This is the function definition
    if (!currentUser || currentUserRole !== 'Admin') {
        noPriceBooksMessage.classList.remove('hidden');
        if (priceBooksGrid) {
            priceBooksGrid.destroy();
            priceBooksGrid = null;
        }
        priceBooksGridContainer.innerHTML = '';
        return;
    }

    // Ensure window.gridjs is available before attempting to use it
    try {
        await waitForGridJs();
    } catch (error) {
        // Error message already shown by waitForGridJs
        priceBooksGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading price book data.</p>';
        return;
    }

    priceBooksGridContainer.innerHTML = '<p class="text-center py-4 text-gray-500">Loading Price Books...</p>';
    noPriceBooksMessage.classList.add('hidden');

    const priceBooksRef = collection(db, `priceBooks`);
    const data = [];

    try {
        const snapshot = await getDocs(query(priceBooksRef, orderBy('name')));
        priceBooksGridContainer.innerHTML = ''; // Clear loading message

        if (snapshot.empty) {
            noPriceBooksMessage.classList.remove('hidden');
        } else {
            noPriceBooksMessage.classList.add('hidden'); // Ensure it's hidden if data is present
            snapshot.forEach(doc => {
                const priceBook = doc.data();
                data.push([
                    doc.id,
                    priceBook.name,
                    priceBook.description,
                    priceBook.currency || '', // This is now the currency CODE
                    priceBook.isActive,
                    // Removed validFrom and validTo
                ]);
            });
        }

        if (priceBooksGrid) {
            priceBooksGrid.updateConfig({ data: data }).forceRender();
        } else {
            priceBooksGrid = new window.gridjs.Grid({
                columns: [
                    { id: 'id', name: 'ID', hidden: true },
                    { id: 'name', name: 'Price Book Name', sort: true, filter: true },
                    { id: 'description', name: 'Description', sort: true, filter: true },
                    { id: 'currency', name: 'Currency Code', sort: true, filter: true }, // Changed column name
                    { id: 'isActive', name: 'Active', sort: true, filter: true, formatter: (cell) => cell ? 'Yes' : 'No' },
                    // Removed Valid From and Valid To columns
                    {
                        name: 'Actions',
                        sort: false,
                        formatter: (cell, row) => {
                            const docId = row.cells[0].data;
                            return window.gridjs.h('div', { className: 'flex space-x-2' },
                                window.gridjs.h('button', {
                                    className: 'px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onClick: () => editPriceBook(docId)
                                }, 'Edit'),
                                window.gridjs.h('button', {
                                    className: 'px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition duration-300 text-sm',
                                    onClick: () => deletePriceBook(docId)
                                }, 'Delete')
                            );
                        }
                    }
                ],
                data: data,
                search: {
                    selector: (cell, rowIndex, cellIndex) => {
                        // Updated search index for currency (was 4, now 3)
                        if (cellIndex === 1 || cellIndex === 2 || cellIndex === 3) {
                            return cell;
                        }
                        return null;
                    }
                },
                pagination: { enabled: true, limit: 5, summary: true },
                sort: true,
                resizable: true,
                className: {
                    container: 'gridjs-container', table: 'min-w-full bg-white shadow-md rounded-lg overflow-hidden',
                    thead: 'bg-gray-200', th: 'py-3 px-4 text-left text-sm font-medium text-gray-700',
                    td: 'py-3 px-4 text-left text-sm text-gray-800', tr: 'divide-y divide-gray-200',
                    footer: 'bg-gray-50 p-4 flex justify-between items-center',
                    pagination: 'flex items-center space-x-2',
                    'pagination-summary': 'text-sm text-gray-600', 'pagination-gap': 'text-sm text-gray-400',
                    'pagination-nav': 'flex space-x-1', 'pagination-nav-prev': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                    'pagination-nav-next': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-200',
                    'pagination-btn': 'px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-300',
                    'pagination-btn-current': 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700',
                },
                language: {
                    'search': { 'placeholder': 'Search price books...' },
                    'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                    'noRecordsFound': 'No Price Books Data Available',
                }
            }).render(priceBooksGridContainer);
        }
    } catch (error) {
        console.error("Error rendering price book grid:", error);
        showMessageBox('Could not load price book data: ' + error.message, false);
        priceBooksGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading price book data.</p>';
    }
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded fired.');

    // Attempt to sign in with custom token if available
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
    if (initialAuthToken) {
        try {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log('Signed in with custom token.');
        } catch (error) {
            console.error('Error signing in with custom token:', error);
            showMessageBox('Failed to auto-login. Please sign in manually.', false);
            // Fall through to show auth section if custom token fails
        }
    } else {
        console.log('No initial auth token found. User must sign in.');
    }

    // Initial state: Hide all content sections and show auth section
    hideAllSections();
    authSection.classList.remove('hidden'); // Ensure auth section is visible initially

    // Hide all navigation items initially until authenticated
    navDashboard.classList.add('hidden');
    navCustomers.classList.add('hidden');
    navLeads.classList.add('hidden');
    navOpportunities.classList.add('hidden');
    adminMenuItem.classList.add('hidden'); // Hide admin menu by default
    navLogout.classList.add('hidden');
});
