import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, setDoc, getDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// YOUR Firebase Configuration - Provided by the user and directly embedded.
// Make sure this matches your project's configuration
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebaseapp.com",
    messagingSenderId: "10782416018",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

console.log("main.js: Using directly provided Firebase config:", firebaseConfig);


// Use __app_id for Firestore collection paths as per mandatory instructions.
// Fallback to projectId from firebaseConfig if __app_id is somehow not defined.
export const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId; // Export appId

export let app; // Export app instance
export let db; // Export db instance
export let auth; // Export auth instance
export let currentUserId = null; // Will be set by Firebase Auth onAuthStateChanged
export let isAuthReady = false; // Set to false initially, true when Firebase Auth confirms a user
export const currentCustomerCollectionType = 'public'; // Fixed to public as per requirement
export let unsubscribeCustomers = null; // To store the onSnapshot unsubscribe function for customers
export let unsubscribeUsers = null; // To store the onSnapshot unsubscribe function for users
export let unsubscribeOpportunities = null; // NEW
export let unsubscribeOpportunityContacts = null; // NEW
export let unsubscribeOpportunityLines = null; // NEW
export let unsubscribeQuotes = null; // NEW
export let unsubscribeCurrencies = null; // NEW: For currency listener

export let isAdmin = false; // Flag to control admin specific UI/features
export let currentOpportunityId = null; // NEW: Stores the ID of the opportunity currently being edited
export let currentEditedOpportunity = null; // Stores the full opportunity object currently being edited

// Data for Countries and States (Now fetched from Firestore)
export let appCountries = []; // Export appCountries
export let appCountryStateMap = {}; // Export appCountryStateMap

// Data for Currencies (NEW: Now fetched from Firestore)
export let allCurrencies = []; // Will store currency data from Firestore

// Data for Customers (to populate Opportunity Customer dropdown)
export let allCustomers = []; // Export allCustomers (populated by customers.js and used here)

// NEW: Constant for the global app settings document ID
export const APP_SETTINGS_DOC_ID = "app_settings"; // Export APP_SETTINGS_DOC_ID


// Declare DOM element variables at a higher scope (or globally with 'let')
// but assign them only once inside initializeFirebase to avoid issues.
// These are not exported as they are internal to main.js's DOM handling
let customersSection;
let customerForm;
let customerFormTitle;
let customerIdDisplayGroup;
let customerIdDisplay;

let customerTypeSelect;
let individualFieldsDiv;
let customerFirstNameInput;
let customerLastNameInput;
let companyNameFieldDiv;
let customerCompanyNameInput;

let customerEmailInput;
let customerPhoneInput;

// Address fields
let customerCountrySelect;
let customerAddressInput;
let customerCityInput;
let customerStateSelect;
let customerZipCodeInput;
let addressValidationMessage;

let individualIndustryGroup;
let customerIndustryInput;
let companyIndustryGroup;
let customerIndustrySelect;

let customerSinceInput;
let customerDescriptionInput;
let submitCustomerButton;
let customerList; // Reference to the div for customer rows

// Opportunity Section Elements (NEW - and now restructured)
let opportunitiesSection;
let opportunityViewContainer; // NEW main flex container
let opportunityLeftPanel;
let opportunityRightPanel;
let opportunityFullFormView;
let opportunityExistingListView;

let opportunityForm;
let opportunityFormTitle;
let opportunityIdDisplayGroup;
let opportunityIdDisplay;
let opportunityCustomerSelect;
let opportunityNameInput;
let opportunityAmountInput;
let currencySymbolDisplay;
let opportunityCurrencySelect;
let opportunityStageSelect;
let opportunityExpectedStartDateInput;
let opportunityExpectedCloseDateInput;
let opportunityEventTypeSelect;
let opportunityEventLocationProposedInput;
let opportunityServiceAddressInput; // NEW Field
let opportunityDescriptionInput;
let opportunityDataInput;
let submitOpportunityButton;
let opportunityList; // Reference to the div for opportunity rows

let linkedObjectsAccordion;
let contactsAccordionHeader;
let contactsAccordionContent;
let linesAccordionHeader;
let linesAccordionContent;
let quotesAccordionHeader;
let quotesAccordionContent;


// Opportunity Contact Elements (NEW)
let opportunityContactForm;
let contactIdDisplayGroup;
let contactIdDisplay;
let contactFirstNameInput;
let contactLastNameInput;
let contactEmailInput;
let contactPhoneInput;
let contactRoleInput;
let submitOpportunityContactButton;
let opportunityContactList;

// Opportunity Line Elements (NEW - Stubs)
let opportunityLineForm;
let optyLineIdDisplayGroup;
let optyLineIdDisplay;
let lineServiceDescriptionInput;
let lineUnitPriceInput;
let lineQuantityInput;
let lineDiscountInput;
let lineNetPriceInput;
let lineStatusSelect;
let submitOpportunityLineButton;
let opportunityLineList;

// Quote Elements (NEW - Stubs)
let quoteForm;
let quoteIdDisplayGroup;
let quoteIdDisplay;
let quoteNameInput;
let quoteDescriptionInput;
let quoteCustomerSelect; // Auto-filled from opportunity
let quoteStartDateInput;
let quoteExpireDateInput;
let quoteStatusSelect;
let quoteNetListAmountInput;
let quoteNetDiscountInput;
let quoteNetAmountInput;
let quoteCurrencySelect;
let quoteIsFinalCheckbox;
let submitQuoteButton;
let quoteList;


// Admin Country Mapping Section elements
let adminCountryMappingSection;
let adminCountriesInput;
let adminCountryStateMapInput;
let uploadAdminDataButton;
let fullLoadRadio;
let incrementalLoadRadio;
let adminMessageDiv;

// Admin Currency Management Section elements (NEW)
let currencyManagementSection;
let currencyForm;
let currencyFormTitle;
let currencyCodeDisplayGroup;
let currencyCodeDisplay;
let adminCurrenciesInput;
let submitCurrencyButton;
let adminCurrencyMessageDiv;
let currencyList;


// Users Management Section elements
let usersManagementSection;
let userForm;
let userFormTitle;
let userIdDisplayGroup;
let userIdDisplayInput; // Changed to an input element
let userNameInput;
let userFirstNameInput;
let userLastNameInput;
let userEmailInput;
let userPhoneInput;
let userRoleSelect; // Changed to select
let userSkillsInput;
let submitUserButton;
let userList;

// References to logout buttons and the new nav Google Login button
let logoutButton;
let mobileLogoutButton;
let navGoogleLoginButton; // Top right Google Sign In button

// Home section Google login button (for visual hint on home page)
let googleLoginButtonHome;
let homeSignInMessage; // NEW: For the sign-in prompt message

let userIdDisplay; // Global variable for desktop user ID display
let mobileUserIdDisplay; // Global variable for mobile user ID display


// Admin menu elements (added IDs in HTML)
let desktopAdminMenu;
let mobileAdminMenu;

// NEW: Admin Menu Toggle elements
let desktopAdminMenuToggle;
let desktopAdminSubMenu;
let mobileAdminMenuToggle;
let mobileAdminSubMenu;


// Reference to auth-section (for standard Google/email login) - This section is mostly decorative now
let authSection;

// Mobile Menu Button and Container
let mobileMenuButton;
let mobileMenu;


// Select all main content sections (Initialize these later or ensure they are found)
let homeSection;
let eventsSection;
let allSections = []; // Will be populated in initializeFirebase

// Centralized unsubscribe array for all Firestore listeners
const activeUnsubscribes = {};

/**
 * Adds an unsubscribe function to the central tracker.
 * @param {string} key - A unique key for the listener (e.g., 'customers', 'opportunities').
 * @param {function} unsubscribeFn - The function returned by onSnapshot.
 */
export function addUnsubscribe(key, unsubscribeFn) {
    activeUnsubscribes[key] = unsubscribeFn;
    console.log(`main.js: Unsubscribe function added for key: ${key}`);
}

/**
 * Removes and calls an unsubscribe function from the central tracker.
 * @param {string} key - The unique key of the listener.
 */
export function removeUnsubscribe(key) {
    if (activeUnsubscribes[key]) {
        activeUnsubscribes[key](); // Call the unsubscribe function
        delete activeUnsubscribes[key]; // Remove it from the tracker
        console.log(`main.js: Unsubscribe function called and removed for key: ${key}`);
    }
}

/**
 * Calls all active unsubscribe functions.
 */
function unsubscribeAll() {
    for (const key in activeUnsubscribes) {
        if (activeUnsubscribes.hasOwnProperty(key)) {
            activeUnsubscribes[key]();
            delete activeUnsubscribes[key];
        }
    }
    console.log("main.js: All Firestore listeners unsubscribed.");
}


// Function to show a custom confirmation modal
export function showModal(title, message, onConfirm, onCancel) {
    const modalContainer = document.getElementById('modalContainer'); // Ensure this is also initialized when used
    if (!modalContainer) {
        console.error("main.js: Modal container not found!");
        alert(`${title}\n${message}`); // Fallback to alert if modal container doesn't exist
        return;
    }
    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button id="modalConfirmBtn" class="primary">Confirm</button>
                    <button id="modalCancelBtn" class="secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    modalConfirmBtn.onclick = () => {
        onConfirm();
        modalContainer.innerHTML = ''; // Close modal
    };
    modalCancelBtn.onclick = () => {
        if (onCancel) onCancel();
        modalContainer.innerHTML = ''; // Close modal
    };
}

// Function to control the layout of the opportunity section
function setOpportunityLayout(layoutType) {
    // Hide all internal opportunity views first
    if (opportunityFullFormView) opportunityFullFormView.classList.add('hidden');
    if (opportunityExistingListView) opportunityExistingListView.classList.add('hidden');

    // Remove all dynamic width classes from panels first
    if (opportunityLeftPanel) {
        // Remove Tailwind's default md:w-X/10 classes
        opportunityLeftPanel.classList.remove('md:w-full', 'md:w-7/10', 'md:w-3/10');
        // Remove custom dynamic classes
        opportunityLeftPanel.classList.remove('shrink-left');
    }
    if (opportunityRightPanel) {
        opportunityRightPanel.classList.remove('hidden-panel');
        // Remove Tailwind's default md:w-X/10 classes
        opportunityRightPanel.classList.remove('md:w-full', 'md:w-7/10', 'md:w-3/10');
        // Remove custom dynamic classes
        opportunityRightPanel.classList.remove('expand-right');
    }

    switch (layoutType) {
        case 'full_form_and_list': // Default view for adding new, or after resetting edit form
            if (opportunityFullFormView) opportunityFullFormView.classList.remove('hidden');
            if (opportunityExistingListView) opportunityExistingListView.classList.remove('hidden');
            if (opportunityLeftPanel) opportunityLeftPanel.classList.add('md:w-full'); // Take full width
            if (opportunityRightPanel) opportunityRightPanel.classList.add('hidden-panel'); // Hide right panel completely
            break;
        case 'edit_split_70_30': // Initial edit view: form + list (70) and accordions (30)
            if (opportunityFullFormView) opportunityFullFormView.classList.remove('hidden');
            if (opportunityExistingListView) opportunityExistingListView.classList.remove('hidden');
            if (opportunityLeftPanel) opportunityLeftPanel.classList.add('md:w-7/10');
            if (opportunityRightPanel) opportunityRightPanel.classList.remove('hidden-panel');
            if (opportunityRightPanel) opportunityRightPanel.classList.add('md:w-3/10');
            break;
        case 'edit_split_30_70': // Accordion open view: form + list (30) and accordions (70)
            if (opportunityFullFormView) opportunityFullFormView.classList.remove('hidden');
            if (opportunityExistingListView) opportunityExistingListView.classList.remove('hidden');
            if (opportunityLeftPanel) opportunityLeftPanel.classList.add('shrink-left'); // Custom class for shrinking
            if (opportunityRightPanel) opportunityRightPanel.classList.remove('hidden-panel');
            if (opportunityRightPanel) opportunityRightPanel.classList.add('expand-right'); // Custom class for expanding
            break;
        default:
            console.error("main.js: Unknown opportunity layout type:", layoutType);
            break;
    }
}


// Function to show a specific section and hide others
export async function showSection(sectionId) {
    // Check for admin section access only if the section is admin-specific
    if (['admin-country-mapping-section', 'users-management-section', 'currency-management-section', 'price-book-management-section'].includes(sectionId)) { // UPDATED for currency and price book section
        if (!currentUserId) { // If not logged in at all
            console.log(`main.js: Access to ${sectionId} denied. No user logged in. Prompting Google login.`);
            await handleGoogleLogin(); // Force Google login if not authenticated
            // After handleGoogleLogin, onAuthStateChanged will fire and re-evaluate isAdmin.
            // We'll rely on the onAuthStateChanged to call showSection again if successful.
            return; // Exit early, let onAuthStateChanged handle redirect
        }

        if (!isAdmin) { // Logged in but not an admin
            showModal("Unauthorized Access", "You do not have administrative privileges to access this section.", () => {
                showSection('home-section'); // Redirect non-admins to home-section
            });
            return;
        }
    }

    // Hide all sections first
    allSections.forEach(section => {
        if (section) {
            section.classList.add('hidden');
        }
    });

    // Then show the target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Close mobile menu AND admin submenus when navigating (if open)
    if (mobileMenu) mobileMenu.classList.remove('open');
    if (desktopAdminSubMenu) desktopAdminMenu.classList.remove('active'); // Close desktop admin dropdown
    if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden'); // Close mobile admin dropdown

    // Stop all listeners first to prevent redundant updates
    unsubscribeAll(); // Use the new centralized function

    // Reset currentOpportunityId and layout when navigating away from opportunities
    if (sectionId !== 'opportunities-section') {
        currentOpportunityId = null;
        currentEditedOpportunity = null; // Clear the edited opportunity
        if (linkedObjectsAccordion) linkedObjectsAccordion.classList.add('hidden'); // Hide linked objects if not in opportunity section
    }

    // Start specific listener for the active section, but only if auth is ready
    if (isAuthReady) { // Ensure auth is ready before starting listeners
        if (sectionId === 'customers-section') {
            // Import and call initCustomersModule only when needed
            import('./customers.js').then(module => {
                module.initCustomersModule();
            }).catch(error => console.error("main.js: Failed to load customers module:", error));
            if (submitCustomerButton) submitCustomerButton.removeAttribute('disabled'); // Customers form always enabled for authenticated users
        } else if (sectionId === 'opportunities-section') { // NEW
            import('./opportunities.js').then(module => {
                module.initOpportunitiesModule();
            }).catch(error => console.error("main.js: Failed to load opportunities module:", error));
            if (submitOpportunityButton) submitOpportunityButton.removeAttribute('disabled');
        }
        else if (sectionId === 'admin-country-mapping-section') {
            if (isAdmin) { // Double check admin status for safety
                loadAdminCountryData(); // Load existing data into admin textareas
                if (uploadAdminDataButton) uploadAdminDataButton.removeAttribute('disabled');
            } else {
                if (uploadAdminDataButton) uploadAdminDataButton.setAttribute('disabled', 'disabled');
            }
        } else if (sectionId === 'currency-management-section') { // NEW
            if (isAdmin) {
                // Now directly using functions from main.js, no separate module init
                listenForCurrencies(); // Start listening for currencies
                resetCurrencyForm(); // Reset currency form
                if (submitCurrencyButton) submitCurrencyButton.removeAttribute('disabled');
            } else {
                if (submitCurrencyButton) submitCurrencyButton.setAttribute('disabled', 'disabled');
            }
        }
        else if (sectionId === 'users-management-section') {
            if (isAdmin) { // Double check admin status for safety
                // Import and call initUsersModule
                import('./users.js').then(module => {
                    module.initUsersModule();
                }).catch(error => console.error("main.js: Failed to load users module:", error));
                if (submitUserButton) submitUserButton.removeAttribute('disabled'); // Enable user form button for admin
            } else {
                if (submitUserButton) submitUserButton.setAttribute('disabled', 'disabled');
            }
        }
        else if (sectionId === 'price-book-management-section') { // NEW for Price Book
            if (isAdmin) {
                // Import and call initPriceBookModule
                import('./price_book_management.js').then(module => {
                    module.initPriceBookModule();
                }).catch(error => console.error("main.js: Failed to load price book module:", error));
            } else {
                // Disable if not admin
            }
        }
    } else {
        console.warn("main.js: Attempted to show section before Firebase Auth is ready:", sectionId);
        // Ensure buttons are disabled if auth is not ready
        if (submitCustomerButton) submitCustomerButton.setAttribute('disabled', 'disabled');
        if (submitOpportunityButton) submitOpportunityButton.setAttribute('disabled', 'disabled'); // NEW
        if (submitOpportunityContactButton) submitOpportunityContactButton.setAttribute('disabled', 'disabled'); // NEW
        if (submitOpportunityLineButton) submitOpportunityLineButton.setAttribute('disabled', 'disabled'); // NEW
        if (submitQuoteButton) submitQuoteButton.setAttribute('disabled', 'disabled'); // NEW
        if (uploadAdminDataButton) uploadAdminDataButton.setAttribute('disabled', 'disabled');
        if (submitUserButton) submitUserButton.setAttribute('disabled', 'disabled');
        if (submitCurrencyButton) submitCurrencyButton.setAttribute('disabled', 'disabled'); // NEW
    }
}


// Handle Google Login
async function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged listener will handle the rest (role check, redirect)
    } catch (error) {
        console.error("main.js: Error during Google login:", error);
        showModal("Login Error", `Failed to sign in with Google: ${error.message}`, () => {
            showSection('home-section'); // Redirect to home if Google login fails
        });
    }
}

// Function to fetch country and state data from Firestore for the CRM forms
export async function fetchCountryData() { // Export this for admin_data.js
    try {
        const docRef = doc(db, "app_metadata", "countries_states");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            appCountries = data.countries || [];
            appCountryStateMap = data.countryStateMap || {};
            console.log("main.js: Country and State data loaded from Firestore.");
        } else {
            console.warn("main.js: No 'countries_states' document found in 'app_metadata' collection.");
            // No modal here, as it might be first load and admin can upload it.
            appCountries = [];
            appCountryStateMap = {};
        }
    } catch (error) {
        console.error("main.js: Error fetching country data from Firestore:", error);
        // No modal here.
        appCountries = [];
        appCountryStateMap = {};
    }
}

// Function to load existing data into the admin textareas
async function loadAdminCountryData() {
    try {
        await fetchCountryData(); // Ensure global appCountries and appCountryStateMap are updated

        // Convert appCountries array to NEWLINE-separated string for display
        const countriesString = appCountries.map(c => `${c.name},${c.code}`).join('\n');
        if (adminCountriesInput) adminCountriesInput.value = countriesString;

        // Convert appCountryStateMap object to NEWLINE-separated string for display
        const countryStateMapString = Object.entries(appCountryStateMap)
            .map(([code, states]) => `${code}:${states.join(',')}`)
            .join('\n'); // Changed join delimiter to newline
        if (adminCountryStateMapInput) adminCountryStateMapInput.value = countryStateMapString;

        if (adminMessageDiv) adminMessageDiv.classList.add('hidden'); // Clear any previous messages
        console.log("main.js: Admin country data loaded into textareas.");
    }
    catch (error) {
        console.error("main.js: Error in loadAdminCountryData:", error); // Log for debugging
    }
}

// NEW: Function to fetch currency data from Firestore
export async function fetchCurrencies() { // Export this
    console.log("main.js: fetchCurrencies called. Current db:", db); // Added debug log
    try {
        if (!db) {
            console.error("main.js: Firestore 'db' instance is not initialized in fetchCurrencies.");
            allCurrencies = [];
            return;
        }
        // Corrected collection reference to include a document ID for `app_settings`
        const collectionRef = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");
        const querySnapshot = await getDocs(query(collectionRef)); // Use query to ensure it's a valid Query object
        allCurrencies = []; // Clear existing data
        querySnapshot.forEach((docSnap) => {
            allCurrencies.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log("main.js: Currency data loaded from Firestore. Total:", allCurrencies.length, "allCurrencies array:", allCurrencies); // Added debug log
    } catch (error) {
        console.error("main.js: Error fetching currency data from Firestore:", error);
        allCurrencies = []; // Ensure it's empty on error
    }
}

// NEW: Helper function to get currency symbol by code
export function getCurrencySymbol(code) { // Export this
    // ADDED DEBUG LOGS
    console.log("main.js: getCurrencySymbol called for code:", code);
    console.log("main.js: allCurrencies state inside getCurrencySymbol:", allCurrencies);

    const currency = allCurrencies.find(c => c.id === code); // Find by doc.id (which is currencyCode)
    if (currency) {
        console.log("main.js: Found currency:", currency.symbol);
        return currency.symbol;
    } else {
        console.warn(`main.js: Currency symbol not found for code: ${code}. Returning code as fallback.`);
        return code; // Fallback to code if symbol not found
    }
}

// NEW: Helper function to get currency name by code
export function getCurrencyName(code) { // Export this
    const currency = allCurrencies.find(c => c.id === code);
    return currency ? currency.currencyName : code; // Fallback to code if name not found
}


// Initialize Firebase and set up authentication listener
async function initializeFirebase() {
    // Only initialize Firebase app and services if they haven't been initialized already
    if (!app) {
        try {
            app = initializeApp(firebaseConfig);
            getAnalytics(app); // Initialize Analytics
            db = getFirestore(app);
            auth = getAuth(app);
            console.log("main.js: Firebase app and services initialized.");
        } catch (error) {
            console.error("main.js: Error initializing Firebase services:", error);
            showModal("Firebase Service Error", `Failed to initialize Firebase services: ${error.message}`, () => {});
            return; // Exit if core services fail to initialize
        }
    }


    // --- IMPORTANT: Initialize all DOM element references here AFTER app initialization ---
    // Ensure all these elements are present in index.html with the correct IDs
    customersSection = document.getElementById('customers-section');
    customerForm = document.getElementById('customerForm');
    customerFormTitle = document.getElementById('customerFormTitle');
    customerIdDisplayGroup = document.getElementById('customerIdDisplayGroup');
    customerIdDisplay = document.getElementById('customerIdDisplay');

    customerTypeSelect = document.getElementById('customerType');
    individualFieldsDiv = document.getElementById('individualFields');
    customerFirstNameInput = document.getElementById('customerFirstName');
    customerLastNameInput = document.getElementById('customerLastName');
    companyNameFieldDiv = document.getElementById('companyNameField');
    customerCompanyNameInput = document.getElementById('customerCompanyName');

    customerEmailInput = document.getElementById('customerEmail');
    customerPhoneInput = document.getElementById('customerPhone');

    // Address fields
    customerCountrySelect = document.getElementById('customerCountry');
    customerAddressInput = document.getElementById('customerAddress');
    customerCityInput = document.getElementById('customerCity');
    customerStateSelect = document.getElementById('customerState');
    customerZipCodeInput = document.getElementById('customerZipCode');
    addressValidationMessage = document.getElementById('addressValidationMessage');

    individualIndustryGroup = document.getElementById('individualIndustryGroup');
    customerIndustryInput = document.getElementById('customerIndustryInput');
    companyIndustryGroup = document.getElementById('companyIndustryGroup');
    customerIndustrySelect = document.getElementById('customerIndustrySelect');

    customerSinceInput = document.getElementById('customerSince');
    customerDescriptionInput = document.getElementById('customerDescription');
    submitCustomerButton = document.getElementById('submitCustomerButton');
    customerList = document.getElementById('customerList'); // Reference to the div for customer rows

    // Opportunity Section Elements
    opportunitiesSection = document.getElementById('opportunities-section');
    opportunityViewContainer = document.getElementById('opportunity-view-container');
    opportunityLeftPanel = document.getElementById('opportunity-left-panel');
    opportunityRightPanel = document.getElementById('opportunity-right-panel');
    opportunityFullFormView = document.getElementById('opportunity-full-form-view');
    opportunityExistingListView = document.getElementById('opportunity-existing-list-view');

    opportunityForm = document.getElementById('opportunityForm');
    opportunityFormTitle = document.getElementById('opportunityFormTitle');
    opportunityIdDisplayGroup = document.getElementById('opportunityIdDisplayGroup');
    opportunityIdDisplay = document.getElementById('opportunityIdDisplay');
    opportunityCustomerSelect = document.getElementById('opportunityCustomer');
    opportunityNameInput = document.getElementById('opportunityName');
    opportunityAmountInput = document.getElementById('opportunityAmount');
    currencySymbolDisplay = document.getElementById('currencySymbolDisplay');
    opportunityCurrencySelect = document.getElementById('opportunityCurrency');
    opportunityStageSelect = document.getElementById('opportunityStage');
    opportunityExpectedStartDateInput = document.getElementById('opportunityExpectedStartDate');
    opportunityExpectedCloseDateInput = document.getElementById('opportunityExpectedCloseDate');
    opportunityEventTypeSelect = document.getElementById('opportunityEventType');
    opportunityEventLocationProposedInput = document.getElementById('opportunityEventLocationProposed');
    opportunityServiceAddressInput = document.getElementById('opportunityServiceAddress');
    opportunityDescriptionInput = document.getElementById('opportunityDescription');
    opportunityDataInput = document.getElementById('opportunityData');
    submitOpportunityButton = document.getElementById('submitOpportunityButton');
    opportunityList = document.getElementById('opportunityList');

    linkedObjectsAccordion = document.getElementById('linkedObjectsAccordion');
    contactsAccordionHeader = document.getElementById('contactsAccordionHeader');
    contactsAccordionContent = contactsAccordionHeader ? contactsAccordionHeader.nextElementSibling : null;
    linesAccordionHeader = document.getElementById('linesAccordionHeader');
    linesAccordionContent = linesAccordionHeader ? linesAccordionHeader.nextElementSibling : null;
    quotesAccordionHeader = document.getElementById('quotesAccordionHeader');
    quotesAccordionContent = quotesAccordionHeader ? quotesAccordionHeader.nextElementSibling : null;

    // Opportunity Contact Elements
    opportunityContactForm = document.getElementById('opportunityContactForm');
    contactIdDisplayGroup = document.getElementById('contactIdDisplayGroup');
    contactIdDisplay = document.getElementById('contactIdDisplay');
    contactFirstNameInput = document.getElementById('contactFirstName');
    contactLastNameInput = document.getElementById('contactLastName');
    contactEmailInput = document.getElementById('contactEmail');
    contactPhoneInput = document.getElementById('contactPhone');
    contactRoleInput = document.getElementById('contactRole');
    submitOpportunityContactButton = document.getElementById('submitOpportunityContactButton');
    opportunityContactList = document.getElementById('opportunityContactList');

    // Opportunity Line Elements
    opportunityLineForm = document.getElementById('opportunityLineForm');
    optyLineIdDisplayGroup = document.getElementById('optyLineIdDisplayGroup');
    optyLineIdDisplay = document.getElementById('optyLineIdDisplay');
    lineServiceDescriptionInput = document.getElementById('lineServiceDescription');
    lineUnitPriceInput = document.getElementById('lineUnitPrice');
    lineQuantityInput = document.getElementById('lineQuantity');
    lineDiscountInput = document.getElementById('lineDiscount');
    lineNetPriceInput = document.getElementById('lineNetPrice');
    lineStatusSelect = document.getElementById('lineStatus');
    submitOpportunityLineButton = document.getElementById('submitOpportunityLineButton');
    opportunityLineList = document.getElementById('opportunityLineList');

    // Quote Elements
    quoteForm = document.getElementById('quoteForm');
    quoteIdDisplayGroup = document.getElementById('quoteIdDisplayGroup');
    quoteIdDisplay = document.getElementById('quoteIdDisplay');
    quoteNameInput = document.getElementById('quoteName');
    quoteDescriptionInput = document.getElementById('quoteDescription');
    quoteCustomerSelect = document.getElementById('quoteCustomer');
    quoteStartDateInput = document.getElementById('quoteStartDate');
    quoteExpireDateInput = document.getElementById('quoteExpireDate');
    quoteStatusSelect = document.getElementById('quoteStatus');
    quoteNetListAmountInput = document.getElementById('quoteNetListAmount');
    quoteNetDiscountInput = document.getElementById('quoteNetDiscount');
    quoteNetAmountInput = document.getElementById('quoteNetAmount');
    quoteCurrencySelect = document.getElementById('quoteCurrency');
    quoteIsFinalCheckbox = document.getElementById('quoteIsFinal');
    submitQuoteButton = document.getElementById('submitQuoteButton');
    quoteList = document.getElementById('quoteList');

    // Admin Country Mapping Section elements
    adminCountryMappingSection = document.getElementById('admin-country-mapping-section');
    adminCountriesInput = document.getElementById('adminCountriesInput');
    adminCountryStateMapInput = document.getElementById('adminCountryStateMapInput');
    uploadAdminDataButton = document.getElementById('uploadAdminDataButton');
    fullLoadRadio = document.getElementById('fullLoad');
    incrementalLoadRadio = document.getElementById('incrementalLoad');
    adminMessageDiv = document.getElementById('adminMessage');

    // Admin Currency Management Section elements
    currencyManagementSection = document.getElementById('currency-management-section');
    currencyForm = document.getElementById('currencyForm');
    currencyFormTitle = document.getElementById('currencyFormTitle');
    currencyCodeDisplayGroup = document.getElementById('currencyCodeDisplayGroup');
    currencyCodeDisplay = document.getElementById('currencyCodeDisplay');
    adminCurrenciesInput = document.getElementById('adminCurrenciesInput');
    submitCurrencyButton = document.getElementById('submitCurrencyButton');
    adminCurrencyMessageDiv = document.getElementById('adminCurrencyMessageDiv');
    currencyList = document.getElementById('currencyList');

    // Users Management Section elements
    usersManagementSection = document.getElementById('users-management-section');
    userForm = document.getElementById('userForm');
    userFormTitle = document.getElementById('userFormTitle');
    userIdDisplayGroup = document.getElementById('userIdDisplayGroup');
    userIdDisplayInput = document.getElementById('userIdDisplayInput');
    userNameInput = document.getElementById('userName');
    userFirstNameInput = document.getElementById('userFirstName');
    userLastNameInput = document.getElementById('userLastName');
    userEmailInput = document.getElementById('userEmail');
    userPhoneInput = document.getElementById('userPhone');
    userRoleSelect = document.getElementById('userRole');
    userSkillsInput = document.getElementById('userSkills');
    submitUserButton = document.getElementById('submitUserButton');
    userList = document.getElementById('userList');

    // References to logout buttons and the new nav Google Login button
    logoutButton = document.getElementById('logoutButton');
    mobileLogoutButton = document.getElementById('mobileLogoutButton');
    navGoogleLoginButton = document.getElementById('navGoogleLoginButton');

    // Home section Google login button
    googleLoginButtonHome = document.getElementById('googleLoginButton');
    homeSignInMessage = document.getElementById('homeSignInMessage');

    // Explicitly define userIdDisplay and mobileUserIdDisplay here
    userIdDisplay = document.getElementById('userIdDisplay');
    mobileUserIdDisplay = document.getElementById('mobileUserIdDisplay');

    // Admin menu elements
    desktopAdminMenu = document.getElementById('desktopAdminMenu');
    mobileAdminMenu = document.getElementById('mobileAdminMenu');

    // Admin Menu Toggle elements
    desktopAdminMenuToggle = document.getElementById('desktopAdminMenuToggle');
    desktopAdminSubMenu = document.getElementById('desktopAdminSubMenu');
    mobileAdminMenuToggle = document.getElementById('mobileAdminMenuToggle');
    mobileAdminSubMenu = document.getElementById('mobileAdminSubMenu');

    // Reference to auth-section
    authSection = document.getElementById('auth-section');

    // Mobile Menu Button and Container
    mobileMenuButton = document.getElementById('mobileMenuButton');
    mobileMenu = document.getElementById('mobileMenu');

    // Re-populate allSections array now that elements are initialized
    homeSection = document.getElementById('home-section');
    eventsSection = document.getElementById('events-section');
    allSections = [
        homeSection,
        customersSection,
        opportunitiesSection,
        eventsSection,
        adminCountryMappingSection,
        usersManagementSection,
        authSection,
        currencyManagementSection,
        document.getElementById('price-book-management-section')
    ].filter(section => section !== null);

    // Add Event Listeners for accordions AFTER they are initialized
    if (contactsAccordionHeader) contactsAccordionHeader.addEventListener('click', () => toggleAccordion(contactsAccordionHeader, contactsAccordionContent));
    if (linesAccordionHeader) linesAccordionHeader.addEventListener('click', () => toggleAccordion(linesAccordionHeader, linesAccordionContent));
    if (quotesAccordionHeader) quotesAccordionHeader.addEventListener('click', () => toggleAccordion(quotesAccordionHeader, quotesAccordionContent));

    // --- NEW: Admin Submenu Toggle Listeners ---
    if (desktopAdminMenuToggle && desktopAdminMenu) {
        desktopAdminMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            desktopAdminMenu.classList.toggle('active');
        });
    }
    document.addEventListener('click', (e) => {
        if (desktopAdminMenu && !desktopAdminMenu.contains(e.target)) {
            desktopAdminMenu.classList.remove('active');
        }
    });

    if (mobileAdminMenuToggle && mobileAdminSubMenu) {
        mobileAdminMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            mobileAdminSubMenu.classList.toggle('hidden');
        });
    }

    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
        isAuthReady = true;
        console.log("main.js: onAuthStateChanged: Auth state changed. User:", user ? user.email || user.uid : "null");

        if (user) {
            currentUserId = user.uid;
            if (userIdDisplay) userIdDisplay.textContent = `User ID: ${user.email || user.uid}`;
            if (mobileUserIdDisplay) mobileUserIdDisplay.textContent = `User ID: ${user.email || user.uid}`;

            if (userIdDisplay) userIdDisplay.classList.remove('hidden');
            if (mobileUserIdDisplay) mobileUserIdDisplay.classList.remove('hidden');
            if (navGoogleLoginButton) navGoogleLoginButton.classList.add('hidden');
            if (googleLoginButtonHome) googleLoginButtonHome.classList.add('hidden');
            if (logoutButton) logoutButton.classList.remove('hidden');
            if (mobileLogoutButton) mobileLogoutButton.classList.remove('hidden');
            if (homeSignInMessage) homeSignInMessage.classList.add('hidden');

            console.log("main.js: onAuthStateChanged: Current Firebase UID:", currentUserId);

            const userProfileRef = doc(db, 'users_data', user.uid);
            const userProfileSnap = await getDoc(userProfileRef);

            // Fetch currencies and country data early after auth, so they are available
            await Promise.all([
                fetchCurrencies(), // Ensure currencies are fetched BEFORE modules that use them are initialized
                fetchCountryData()
            ]);


            if (userProfileSnap.exists()) {
                const userData = userProfileSnap.data();
                console.log("main.js: DEBUG: User data from Firestore - Role:", userData.role, " (Type:", typeof userData.role, ")");
                console.log("main.js: DEBUG: User data from Firestore - Profile Access:", userData.profileAccess, " (Type:", typeof userData.profileAccess, ")");

                isAdmin = (userData.role === 'Admin' && userData.profileAccess === true);
                console.log("main.js: onAuthStateChanged: User profile exists. Admin status:", isAdmin);
            } else {
                try {
                    await setDoc(userProfileRef, {
                        userId: user.uid,
                        userName: user.email || 'N/A',
                        firstName: user.displayName ? user.displayName.split(' ')[0] : '',
                        lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
                        email: user.email || 'N/A',
                        phone: '',
                        role: 'User',
                        profileAccess: true
                    });
                    console.log("main.js: Basic user profile created for:", user.uid);
                    isAdmin = false;
                } catch (profileError) {
                    console.error("main.js: Error creating basic user profile:", profileError);
                    showModal("Profile Error", `Failed to create user profile: ${profileError.message}. Access to some features may be limited.`, () => {});
                }
            }

            if (isAdmin) {
                if (desktopAdminMenu) desktopAdminMenu.classList.remove('hidden');
                if (mobileAdminMenu) mobileAdminMenu.classList.remove('hidden');
            } else {
                if (desktopAdminMenu) desktopAdminMenu.classList.add('hidden');
                if (mobileAdminMenu) mobileAdminMenu.classList.add('hidden');
            }

            showSection('home-section'); // Initially show home, modules will be initialized on navigation

        } else {
            currentUserId = null;
            isAdmin = false;
            console.log("main.js: onAuthStateChanged: No user signed in. Showing home section by default.");

            appCountries = [];
            appCountryStateMap = {};
            allCurrencies = []; // Clear currencies when logged out

            if (userIdDisplay) userIdDisplay.classList.add('hidden');
            if (mobileUserIdDisplay) mobileUserIdDisplay.classList.add('hidden');
            if (desktopAdminMenu) desktopAdminMenu.classList.add('hidden');
            if (mobileAdminMenu) mobileAdminMenu.classList.add('hidden');
            if (logoutButton) logoutButton.classList.add('hidden');
            if (mobileLogoutButton) mobileLogoutButton.classList.add('hidden');

            if (desktopAdminSubMenu) desktopAdminMenu.classList.remove('active');
            if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden');

            if (navGoogleLoginButton) navGoogleLoginButton.classList.remove('hidden');
            if (googleLoginButtonHome) googleLoginButtonHome.classList.remove('hidden');
            if (homeSignInMessage) homeSignInMessage.classList.remove('hidden');

            if (submitCustomerButton) submitCustomerButton.setAttribute('disabled', 'disabled');
            if (submitOpportunityButton) submitOpportunityButton.setAttribute('disabled', 'disabled');
            if (submitOpportunityContactButton) submitOpportunityContactButton.setAttribute('disabled', 'disabled');
            if (submitOpportunityLineButton) submitOpportunityLineButton.setAttribute('disabled', 'disabled');
            if (submitQuoteButton) submitQuoteButton.setAttribute('disabled', 'disabled');
            if (uploadAdminDataButton) uploadAdminDataButton.setAttribute('disabled', 'disabled');
            if (submitUserButton) submitUserButton.setAttribute('disabled', 'disabled');
            if (submitCurrencyButton) submitCurrencyButton.setAttribute('disabled', 'disabled');

            showSection('home-section');
        }
    });

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            if (mobileMenu) mobileMenu.classList.toggle('open');
            if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden');
        });
    }

    document.querySelectorAll('nav a').forEach(link => {
        if (link.dataset.section) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showSection(link.dataset.section);
            });
        }
    });

    if (navGoogleLoginButton) {
        navGoogleLoginButton.addEventListener('click', handleGoogleLogin);
    }

    if (googleLoginButtonHome) {
        googleLoginButtonHome.addEventListener('click', handleGoogleLogin);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("main.js: User signed out.");
            } catch (error) {
                console.error("main.js: Error signing out:", error);
                showModal("Logout Error", `Failed to log out: ${error.message}`, () => {});
            }
        });
    }

    if (mobileLogoutButton) {
        mobileLogoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("main.js: User signed out.");
            }
            catch (error) {
                console.error("main.js: Error signing out:", error);
                showModal("Logout Error", `Failed to log out: ${error.message}`, () => {});
            }
        });
    }

    if (document.getElementById('countryMappingForm')) {
        document.getElementById('countryMappingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminMessageDiv) adminMessageDiv.classList.add('hidden');
            if (uploadAdminDataButton) {
                uploadAdminDataButton.disabled = true;
                uploadAdminDataButton.textContent = 'Uploading...';
            }


            const countriesString = adminCountriesInput.value;
            const countryStateMapString = adminCountryStateMapInput.value;
            const isFullLoad = fullLoadRadio.checked;

            function parseCountries(countriesString) {
                const uniqueCodes = new Set();
                const parsedCountries = [];
                const duplicatesFound = [];

                if (!countriesString.trim()) return [];

                countriesString.split('\n').forEach(line => {
                    const parts = line.split(',');
                    if (parts.length === 2) {
                        const name = parts[0].trim();
                        const code = parts[1].trim();
                        if (name !== '' && code !== '') {
                            if (uniqueCodes.has(code)) {
                                duplicatesFound.push(code);
                            } else {
                                uniqueCodes.add(code);
                                parsedCountries.push({ name, code });
                            }
                        }
                    }
                });

                if (duplicatesFound.length > 0) {
                    const msg = `Warning: Duplicate country codes found and ignored: ${duplicatesFound.join(', ')}. Only the first occurrence was used.`;
                    if (adminMessageDiv) {
                        adminMessageDiv.textContent = msg;
                        adminMessageDiv.className = 'message error';
                        adminMessageDiv.classList.remove('hidden');
                    }
                    console.warn(msg);
                }
                return parsedCountries;
            }

            function parseCountryStateMap(mapString) {
                const map = {};
                if (!mapString.trim()) return map;
                mapString.split('\n').forEach(line => {
                    const parts = line.split(':');
                    if (parts.length === 2) {
                        const countryCode = parts[0].trim();
                        const states = parts[1].split(',').map(s => s.trim()).filter(s => s !== '');
                        if (countryCode !== '') {
                            map[countryCode] = states;
                        }
                    }
                });
                return map;
            }

            const dataToUpload = {};
            let hasValidDataForUpload = false;

            const parsedCountries = parseCountries(countriesString);
            if (parsedCountries.length > 0) {
                dataToUpload.countries = parsedCountries;
                hasValidDataForUpload = true;
            }

            const parsedCountryStateMap = parseCountryStateMap(countryStateMapString);
            if (Object.keys(parsedCountryStateMap).length > 0) {
                dataToUpload.countryStateMap = parsedCountryStateMap;
                hasValidDataForUpload = true;
            }

            if (!hasValidDataForUpload && isFullLoad) {
                dataToUpload.countries = [];
                dataToUpload.countryStateMap = {};
                hasValidDataForUpload = true;
            } else if (!hasValidDataForUpload && !isFullLoad) {
                if (adminMessageDiv) {
                    adminMessageDiv.textContent = 'No valid data provided for update.';
                    adminMessageDiv.className = 'message error';
                    adminMessageDiv.classList.remove('hidden');
                }
                if (uploadAdminDataButton) {
                    uploadAdminDataButton.disabled = false;
                    uploadAdminDataButton.textContent = 'Upload Data to Firestore';
                }
                return;
            }

            try {
                const docRef = doc(db, "app_metadata", "countries_states");
                await setDoc(docRef, dataToUpload, { merge: true });

                if (adminMessageDiv) {
                    adminMessageDiv.textContent = `Data uploaded successfully (${isFullLoad ? 'Full Load (Merge)' : 'Incremental Load'})!`;
                    adminMessageDiv.className = 'message success';
                    adminMessageDiv.classList.remove('hidden');
                }
                console.log("main.js: Admin data upload successful:", dataToUpload);

                await fetchCountryData();

            } catch (error) {
                console.error("main.js: Error uploading admin data:", error);
                if (adminMessageDiv) {
                    adminMessageDiv.textContent = `Error uploading data: ${error.message}`;
                    adminMessageDiv.className = 'message error';
                    adminMessageDiv.classList.remove('hidden');
                }
            } finally {
                if (uploadAdminDataButton) {
                    uploadAdminDataButton.disabled = false;
                    uploadAdminDataButton.textContent = 'Upload Data to Firestore';
                }
            }
        });
    }

    // Admin Currency Form Event Listener
    if (currencyForm) {
        currencyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = currencyForm.dataset.editingId;
            await saveCurrency(null, editingId || null); // Pass null for currencyData to indicate reading from textarea
        });
    }
}

export async function saveCurrency(currencyData, existingCurrencyCode = null) {
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage currencies.", () => {});
        return;
    }

    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden');
    if (submitCurrencyButton) {
        submitCurrencyButton.disabled = true;
        submitCurrencyButton.textContent = 'Uploading...';
    }


    const inputCsv = adminCurrenciesInput.value.trim();
    const currencyLines = inputCsv.split('\n').filter(line => line.trim() !== '');

    if (currencyLines.length === 0) {
        if (adminCurrencyMessageDiv) {
            adminCurrencyMessageDiv.textContent = "Please enter currency data in the specified CSV format.";
            adminCurrencyMessageDiv.className = 'message error';
            adminCurrencyMessageDiv.classList.remove('hidden');
        }
        if (submitCurrencyButton) {
            submitCurrencyButton.disabled = false;
            submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
        }
        return;
    }

    const currenciesCollectionRef = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");

    try {
        let updatesPerformed = 0;
        let errorsOccurred = 0;
        let totalProcessed = 0;

        for (const line of currencyLines) {
            totalProcessed++;
            const parts = line.split(',');

            const code = parts[0] ? parts[0].trim() : '';
            const currencyName = parts[1] ? parts[1].trim() : '';
            const symbol = parts[2] ? parts[2].trim() : '';
            const symbol_native = parts[3] ? parts[3].trim() : '';

            if (code === '' || currencyName === '' || symbol === '' || symbol_native === '') {
                console.error(`main.js: Skipping invalid line (missing data for essential fields): '${line}'`);
                errorsOccurred++;
                continue;
            }

            if (existingCurrencyCode && code !== existingCurrencyCode) {
                showModal("Validation Error", `When editing, the currency code in the input CSV (${code}) must match the currency being edited (${existingCurrencyCode}). Please provide only one line for the edited currency.`, () => {});
                if (submitCurrencyButton) {
                    submitCurrencyButton.disabled = false;
                    submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
                }
                return;
            }


            const currencyDataToSave = {
                currencyCode: code,
                currencyName: currencyName,
                symbol: symbol,
                symbol_native: symbol_native
            };

            const currencyDocRef = doc(currenciesCollectionRef, code);

            await setDoc(currencyDocRef, currencyDataToSave, { merge: true });
            updatesPerformed++;
        }

        let message = `Upload complete. Total lines processed: ${totalProcessed}. Updated/Added currencies: ${updatesPerformed}. Errors/Skipped lines: ${errorsOccurred}.`;
        if (errorsOccurred > 0) {
            if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.className = 'message error';
            message += " Please check console for details on skipped lines.";
        } else {
            if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.className = 'message success';
        }
        if (adminCurrencyMessageDiv) {
            adminCurrencyMessageDiv.textContent = message;
            adminCurrencyMessageDiv.classList.remove('hidden');
        }
        console.log("main.js: Admin currency data upload process finished.");

        await fetchCurrencies();
        resetCurrencyForm();
    } catch (error) {
        console.error("main.js: Error uploading currency data (caught in try-catch):", error);
        if (adminCurrencyMessageDiv) {
            adminCurrencyMessageDiv.textContent = `Error uploading currency data: ${error.message}`;
            adminCurrencyMessageDiv.className = 'message error';
            adminCurrencyMessageDiv.classList.remove('hidden');
        }
    } finally {
        if (submitCurrencyButton) {
            submitCurrencyButton.disabled = false;
            submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
        }
    }
}


export async function deleteCurrency(currencyCode) {
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage currencies.", () => {});
        return;
    }

    showModal(
        "Confirm Deletion",
        `Are you sure you want to delete the currency '${currencyCode}'? This action cannot be undone.`,
        async () => {
            try {
                const currencyDocRef = doc(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data", currencyCode);
                await deleteDoc(currencyDocRef);
                console.log("main.js: Currency deleted:", currencyCode);
                showModal("Success", `Currency '${currencyCode}' deleted successfully!`, () => {});
                await fetchCurrencies();
            } catch (error) {
                console.error("main.js: Error deleting currency:", error);
                showModal("Error", `Failed to delete currency: ${error.message}`, () => {});
            }
        }
    );
}

export function listenForCurrencies() {
    if (unsubscribeCurrencies) {
        removeUnsubscribe('currencies');
    }

    if (!isAuthReady || !currentUserId || !isAdmin) {
        if (currencyList) currencyList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Access Denied: Only administrators can view currencies.</p>';
        return;
    }

    const q = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");

    unsubscribeCurrencies = onSnapshot(q, (snapshot) => {
        if (currencyList) currencyList.innerHTML = '';
        if (snapshot.empty) {
            if (currencyList) currencyList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No currencies found. Add them above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const currency = { id: doc.id, ...doc.data() };
            displayCurrency(currency);
        });
        console.log("main.js: Currencies data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("main.js: Error listening to currencies:", error);
        if (currencyList) currencyList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading currencies: ${error.message}</p>`;
    });
    addUnsubscribe('currencies', unsubscribeCurrencies);
}

export function displayCurrency(currency) {
    if (!currencyList) return;
    const currencyRow = document.createElement('div');
    currencyRow.className = 'data-grid-row';
    currencyRow.dataset.id = currency.id;

    currencyRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${currency.id || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currency.currencyName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currency.symbol || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currency.symbol_native || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${currency.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${currency.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    currencyList.appendChild(currencyRow);

    currencyRow.querySelector('.edit-btn').addEventListener('click', () => editCurrency(currency));
    currencyRow.querySelector('.delete-btn').addEventListener('click', () => deleteCurrency(currency.id));
}

export function editCurrency(currency) {
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can edit currencies.", () => {});
        return;
    }
    if (currencyFormTitle) currencyFormTitle.textContent = `Edit Currency: ${currency.id}`;
    if (submitCurrencyButton) submitCurrencyButton.textContent = 'Update Currency';

    if (currencyCodeDisplayGroup) currencyCodeDisplayGroup.classList.remove('hidden');
    if (currencyCodeDisplay) currencyCodeDisplay.textContent = currency.id;

    if (adminCurrenciesInput) adminCurrenciesInput.value = `${currency.id},${currency.currencyName || ''},${currency.symbol || ''},${currency.symbol_native || ''}`;

    if (currencyForm) currencyForm.dataset.editingId = currency.id;
    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden');
    if (currencyForm) currencyForm.scrollIntoView({ behavior: 'smooth' });
}

export function resetCurrencyForm() {
    if (currencyForm) currencyForm.reset();
    if (currencyForm) currencyForm.dataset.editingId = '';
    if (currencyFormTitle) currencyFormTitle.textContent = 'Add New Currency';
    if (submitCurrencyButton) submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
    if (currencyCodeDisplayGroup) currencyCodeDisplayGroup.classList.add('hidden');
    if (currencyCodeDisplay) currencyCodeDisplay.textContent = '';
    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden');
}


// Initialize Firebase on window load
window.onload = initializeFirebase;
