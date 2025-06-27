import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, setDoc, getDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// YOUR Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebasestorage.app",
    messagingSenderId: "10782416018",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

console.log("main.js: Using directly provided Firebase config:", firebaseConfig);


// Use __app_id for Firestore collection paths as per mandatory instructions.
// Fallback to projectId from firebaseConfig if __app_id is somehow not defined.
export const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId; // Export appId

export let app; // Export app instance
export let db; // Export db instance (will be assigned later in initializeFirebase)
export let auth; // Export auth instance (will be assigned later)
export let currentUserId = null; // Will be set by Firebase Auth onAuthStateChanged
export let isAuthReady = false; // Set to false initially, true when Firebase Auth confirms a user
export let isDbReady = false; // NEW: Flag to indicate if Firestore DB instance is ready

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


/**
 * Shows a custom confirmation modal.
 * This is duplicated in utils.js, but also kept here for direct use within main.js if needed.
 * It's recommended to import showModal from utils.js where possible.
 */
export function showModal(title, message, onConfirm, onCancel) {
    const modalContainer = document.getElementById('modalContainer'); // Ensure this is also initialized when used
    if (!modalContainer) {
        console.error("main.js: Modal container not found!");
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
            if (opportunityFullFormView) opportunityFullFormView.classList.add('hidden');
            if (opportunityExistingListView) opportunityExistingListView.classList.add('hidden');
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


// Helper to toggle disabled state for all relevant buttons
function toggleButtonsDisabled(disabled) {
    const buttons = [
        submitCustomerButton, submitOpportunityButton, submitOpportunityContactButton,
        submitOpportunityLineButton, submitQuoteButton, uploadAdminDataButton,
        submitUserButton, submitCurrencyButton
    ];
    buttons.forEach(btn => {
        if (btn) {
            if (disabled) {
                btn.setAttribute('disabled', 'disabled');
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                btn.removeAttribute('disabled');
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    });
    console.log(`main.js: All relevant buttons ${disabled ? 'disabled' : 'enabled'}.`);
}


// Function to show a specific section and hide others
export async function showSection(sectionId) {
    // Check for admin section access only if the section is admin-specific
    if (['admin-country-mapping-section', 'users-management-section', 'currency-management-section', 'price-book-management-section'].includes(sectionId)) {
        if (!currentUserId) {
            console.log(`main.js: Access to ${sectionId} denied. No user logged in. Prompting Google login.`);
            await handleGoogleLogin();
            return;
        }

        if (!isAdmin) {
            showModal("Unauthorized Access", "You do not have administrative privileges to access this section.", () => {
                showSection('home-section');
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
    if (desktopAdminSubMenu) desktopAdminMenu.classList.remove('active');
    if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden');

    // Stop all listeners first to prevent redundant updates
    unsubscribeAll();

    // Reset currentOpportunityId and layout when navigating away from opportunities
    if (sectionId !== 'opportunities-section') {
        currentOpportunityId = null;
        currentEditedOpportunity = null;
        if (linkedObjectsAccordion) linkedObjectsAccordion.classList.add('hidden');
    }

    // IMPORTANT: Wait for DB to be ready before calling module-specific init functions
    if (!db || !isDbReady) {
        console.warn(`main.js: Attempted to show section ${sectionId} but Firestore DB is not ready. Waiting for DB initialization.`);
        toggleButtonsDisabled(true); // Disable all buttons
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing application. Please wait...</p>';
        
        // Polling or a more sophisticated ready-event system could be used here.
        // For simplicity, we will re-attempt after a short delay if not ready.
        // The onAuthStateChanged listener handles re-calling showSection('home-section')
        // once auth and db are ready. For other sections, user must click again.
        // Or, we can just return and let user retry.
        return;
    } else {
        toggleButtonsDisabled(false); // Enable buttons once DB is ready
    }

    // Start specific listener for the active section, only if auth and DB are ready
    if (isAuthReady && db && isDbReady) {
        if (sectionId === 'customers-section') {
            await Promise.resolve().then(async () => {
                const customersModule = await import('./customers.js');
                customersModule.setDbInstance(db); // Call the new setter
                customersModule.initCustomersModule();
            }).catch(error => console.error("main.js: Failed to load customers module or set DB instance:", error));
        } else if (sectionId === 'opportunities-section') {
            import('./opportunities.js').then(module => {
                module.initOpportunitiesModule();
            }).catch(error => console.error("main.js: Failed to load opportunities module:", error));
        } else if (sectionId === 'admin-country-mapping-section') {
            if (isAdmin) {
                await Promise.resolve().then(async () => {
                    const adminDataModule = await import('./admin_data.js');
                    adminDataModule.setDbInstance(db); // Set DB instance for admin_data
                    adminDataModule.initAdminDataModule('country_mapping');
                }).catch(error => console.error("main.js: Failed to load admin_data module for country mapping or set DB instance:", error));
            }
        } else if (sectionId === 'currency-management-section') {
            if (isAdmin) {
                await Promise.resolve().then(async () => {
                    const adminDataModule = await import('./admin_data.js');
                    adminDataModule.setDbInstance(db); // Set DB instance for admin_data
                    adminDataModule.initAdminDataModule('currency_management');
                }).catch(error => console.error("main.js: Failed to load admin_data module for currency management or set DB instance:", error));
            }
        } else if (sectionId === 'users-management-section') {
            if (isAdmin) {
                import('./users.js').then(module => {
                    module.initUsersModule();
                }).catch(error => console.error("main.js: Failed to load users module:", error));
            }
        } else if (sectionId === 'price-book-management-section') {
            if (isAdmin) {
                import('./price_book.js').then(module => {
                    module.initPriceBookModule();
                }).catch(error => console.error("main.js: Failed to load price book module:", error));
            }
        }
    } else {
        console.warn("main.js: Auth state or DB not fully ready for section initialization, even after initial check. This should not happen consistently.");
        toggleButtonsDisabled(true); // Re-disable if somehow state changed negatively
    }
}


// Handle Google Login
async function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("main.js: Error during Google login:", error);
        showModal("Login Error", `Failed to sign in with Google: ${error.message}`, () => {
            showSection('home-section');
        });
    }
}

// Function to fetch country and state data from Firestore for the CRM forms
export async function fetchCountryData() {
    console.log("main.js: fetchCountryData called. Current db:", db, "isDbReady:", isDbReady);
    // Explicitly check db instance here as well
    if (!db || !isDbReady || typeof db.collection !== 'function' || db.type !== 'firestore') {
        console.error("main.js: CRITICAL ERROR in fetchCountryData - 'db' is NOT a valid Firestore instance. Current db value:", db);
        appCountries = [];
        appCountryStateMap = {};
        return;
    }

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
            appCountries = [];
                            appCountryStateMap = {};
        }
    } catch (error) {
        console.error("main.js: Error fetching country data from Firestore:", error);
        appCountries = [];
        appCountryStateMap = {};
    }
}

// Function to load existing data into the admin textareas (this is called from admin_data.js now)
async function loadAdminCountryData() {
    try {
        await fetchCountryData(); // Use the local (exported) fetchCountryData

        const countriesString = appCountries.map(c => `${c.name},${c.code}`).join('\n');
        if (adminCountriesInput) adminCountriesInput.value = countriesString;

        const countryStateMapString = Object.entries(appCountryStateMap)
            .map(([code, states]) => `${code}:${states.join(',')}`)
            .join('\n');
        if (adminCountryStateMapInput) adminCountryStateMapInput.value = countryStateMapString;

        if (adminMessageDiv) adminMessageDiv.classList.add('hidden');
        console.log("main.js: Admin country data loaded into textareas.");
    }
    catch (error) {
        console.error("main.js: Error in loadAdminCountryData:", error);
    }
}

// NEW: Function to fetch currency data from Firestore
export async function fetchCurrencies() {
    console.log("main.js: fetchCurrencies called. Current db:", db, "isDbReady:", isDbReady);
    // Explicitly check db instance here as well
    if (!db || !isDbReady || typeof db.collection !== 'function' || db.type !== 'firestore') {
        console.error("main.js: CRITICAL ERROR in fetchCurrencies - 'db' is NOT a valid Firestore instance. Current db value:", db);
        allCurrencies = [];
        return;
    }

    try {
        const currenciesCollectionRef = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");
        const querySnapshot = await getDocs(query(currenciesCollectionRef));
        allCurrencies = [];
        querySnapshot.forEach((docSnap) => {
            allCurrencies.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log("main.js: Currency data loaded from Firestore. Total:", allCurrencies.length, "allCurrencies array:", allCurrencies);
    } catch (error) {
        console.error("main.js: Error fetching currency data from Firestore:", error);
        allCurrencies = [];
    }
}

// NEW: Helper function to get currency symbol by code
export function getCurrencySymbol(code) {
    console.log("main.js: getCurrencySymbol called for code:", code);
    console.log("main.js: allCurrencies state inside getCurrencySymbol:", allCurrencies);

    const currency = allCurrencies.find(c => c.id === code);
    if (currency) {
        console.log("main.js: Found currency:", currency.symbol);
        return currency.symbol;
    } else {
        console.warn(`main.js: Currency symbol not found for code: ${code}. Returning code as fallback.`);
        return code;
    }
}

// NEW: Helper function to get currency name by code
export function getCurrencyName(code) {
    const currency = allCurrencies.find(c => c.id === code);
    return currency ? currency.currencyName : code;
}


// Initialize Firebase and set up authentication listener
async function initializeFirebase() {
    if (!app) {
        try {
            app = initializeApp(firebaseConfig);
            getAnalytics(app);
            db = getFirestore(app); // Assign db here
            isDbReady = true; // Set to true immediately after db is assigned
            auth = getAuth(app); // Assign auth here
            console.log("main.js: Firebase app and services initialized. DB Ready:", isDbReady);
        } catch (error) {
            console.error("main.js: Error initializing Firebase services:", error);
            showModal("Firebase Service Error", `Failed to initialize Firebase services: ${error.message}`, () => {});
            return;
        }
    }

    // --- IMPORTANT: Initialize all DOM element references here AFTER app initialization ---
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
    customerList = document.getElementById('customerList');

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

    adminCountryMappingSection = document.getElementById('admin-country-mapping-section');
    adminCountriesInput = document.getElementById('adminCountriesInput');
    adminCountryStateMapInput = document.getElementById('adminCountryStateMapInput');
    uploadAdminDataButton = document.getElementById('uploadAdminDataButton');
    fullLoadRadio = document.getElementById('fullLoad');
    incrementalLoadRadio = document.getElementById('incrementalLoad');
    adminMessageDiv = document.getElementById('adminMessage');

    currencyManagementSection = document.getElementById('currency-management-section');
    currencyForm = document.getElementById('currencyForm');
    currencyFormTitle = document.getElementById('currencyFormTitle');
    currencyCodeDisplayGroup = document.getElementById('currencyCodeDisplayGroup');
    currencyCodeDisplay = document.getElementById('currencyCodeDisplay');
    adminCurrenciesInput = document.getElementById('adminCurrenciesInput');
    submitCurrencyButton = document.getElementById('submitCurrencyButton');
    adminCurrencyMessageDiv = document.getElementById('adminCurrencyMessageDiv');
    currencyList = document.getElementById('currencyList');


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

    logoutButton = document.getElementById('logoutButton');
    mobileLogoutButton = document.getElementById('mobileLogoutButton');
    navGoogleLoginButton = document.getElementById('navGoogleLoginButton');

    googleLoginButtonHome = document.getElementById('googleLoginButton');
    homeSignInMessage = document.getElementById('homeSignInMessage');

    userIdDisplay = document.getElementById('userIdDisplay');
    mobileUserIdDisplay = document.getElementById('mobileUserIdDisplay');

    desktopAdminMenu = document.getElementById('desktopAdminMenu');
    mobileAdminMenu = document.getElementById('mobileAdminMenu');

    desktopAdminMenuToggle = document.getElementById('desktopAdminMenuToggle');
    desktopAdminSubMenu = document.getElementById('desktopAdminSubMenu');
    mobileAdminMenuToggle = document.getElementById('mobileAdminMenuToggle');
    mobileAdminSubMenu = document.getElementById('mobileAdminSubMenu');

    authSection = document.getElementById('auth-section');

    mobileMenuButton = document.getElementById('mobileMenuButton');
    mobileMenu = document.getElementById('mobileMenu');

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

    if (contactsAccordionHeader) contactsAccordionHeader.addEventListener('click', () => toggleAccordion(contactsAccordionHeader, contactsAccordionContent));
    if (linesAccordionHeader) linesAccordionHeader.addEventListener('click', () => toggleAccordion(linesAccordionHeader, linesAccordionContent));
    if (quotesAccordionHeader) quotesAccordionHeader.addEventListener('click', () => toggleAccordion(quotesAccordionHeader, quotesAccordionContent));

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

        // Now, perform actions only if both Auth and DB are confirmed ready
        if (!isDbReady) {
            console.warn("main.js: DB is not yet ready in onAuthStateChanged. Retrying auth-dependent initializations shortly.");
            // A small delay to allow DB init to complete, then re-trigger
            setTimeout(() => onAuthStateChanged(auth, user), 100); // Re-run this same callback
            return;
        }

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

            await Promise.all([
                fetchCurrencies(),
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
                    }, { merge: true });
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

            showSection('home-section');

        } else {
            currentUserId = null;
            isAdmin = false;
            console.log("main.js: onAuthStateChanged: No user signed in. Showing home section by default.");

            appCountries = [];
            appCountryStateMap = {};
            allCurrencies = [];

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

            toggleButtonsDisabled(true); // Ensure buttons are disabled if not signed in

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

    if (currencyForm) {
        currencyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = currencyForm.dataset.editingId;
            import('./admin_data.js').then(module => {
                module.saveCurrency(null, editingId || null);
            }).catch(error => console.error("main.js: Failed to call saveCurrency from admin_data module:", error));
        });
    }
}

window.onload = initializeFirebase;
