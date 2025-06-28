import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, setDoc, getDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// YOUR Firebase Configuration
// NOTE: In a real production app, keep this config secure (e.g., environment variables).
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
// Fallback to projectId from firebaseConfig if __app_id is somehow not defined (e.g., on GitHub Pages).
export const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId; // Export appId

export let app; // Export app instance
export let db; // Export db instance (will be assigned later in initializeFirebase)
export let auth; // Export auth instance (will be assigned later)
export let currentUserId = null; // Will be set by Firebase Auth onAuthStateChanged
export let isAuthReady = false; // Set to false initially, true when Firebase Auth confirms a user
export let isDbReady = false; // Flag to indicate if Firestore DB instance is ready

export const currentCustomerCollectionType = 'public'; // Fixed to public as per requirement

// Centralized unsubscribe array for all Firestore listeners
// This is now the ONLY place these unsubscribe functions are managed.
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

// Data for Countries and States (Now fetched from Firestore via admin_data.js)
export let appCountries = [];
export let appCountryStateMap = {};

// Data for Currencies (Now fetched from Firestore via admin_data.js)
export let allCurrencies = [];

// Data for Customers (to populate Opportunity Customer dropdown - populated by customers.js)
export let allCustomers = [];

export let isAdmin = false; // Flag to control admin specific UI/features
export let currentOpportunityId = null; // Stores the ID of the opportunity currently being edited
export let currentEditedOpportunity = null; // Stores the full opportunity object currently being edited

// NEW: Constant for the global app settings document ID
export const APP_SETTINGS_DOC_ID = "app_settings";

// --- DOM Element References ---
// Declare DOM element variables globally for main.js access.
// These will be assigned within initializeFirebase.
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
let customerList;

let opportunitiesSection;
let opportunityViewContainer;
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
let opportunityServiceAddressInput;
let opportunityDescriptionInput;
let opportunityDataInput;
let submitOpportunityButton;
let opportunityList;
let linkedObjectsAccordion;
let contactsAccordionHeader;
let contactsAccordionContent;
let linesAccordionHeader;
let linesAccordionContent;
let quotesAccordionHeader;
let quotesAccordionContent;

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

let quoteForm;
let quoteIdDisplayGroup;
let quoteIdDisplay;
let quoteNameInput;
let quoteDescriptionInput;
let quoteCustomerSelect;
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

let adminCountryMappingSection;
let currencyManagementSection;
let priceBookManagementSection;

let usersManagementSection;
let userForm;
let userFormTitle;
let userIdDisplayGroup;
let userIdDisplayInput;
let userNameInput;
let userFirstNameInput;
let userLastNameInput;
let userEmailInput;
let userPhoneInput;
let userRoleSelect;
let userSkillsInput;
let submitUserButton;
let userList;

let logoutButton;
let mobileLogoutButton;
let navGoogleLoginButton;

let googleLoginButtonHome;
let homeSignInMessage;

let userIdDisplay;
let mobileUserIdDisplay;

let desktopAdminMenu;
let mobileAdminMenu;
let desktopAdminMenuToggle;
let desktopAdminSubMenu;
let mobileAdminMenuToggle;
let mobileAdminSubMenu;

let authSection;
let mobileMenuButton;
let mobileMenu;
let homeSection;
let eventsSection;
let allSections = [];

/**
 * Common modal function, now strictly for main.js's internal use.
 * Other modules should import from utils.js.
 */
function showModal(title, message, onConfirm, onCancel) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error("main.js: Modal container not found for showModal!");
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
    // Defensive check: ensure elements exist before manipulating them
    if (!opportunityFullFormView || !opportunityExistingListView || !opportunityLeftPanel || !opportunityRightPanel) {
        console.warn("main.js: Opportunity layout elements not found. Cannot set layout.");
        return;
    }

    // Hide all internal opportunity views first
    opportunityFullFormView.classList.add('hidden');
    opportunityExistingListView.classList.add('hidden');

    // Remove all dynamic width classes from panels first
    opportunityLeftPanel.classList.remove('md:w-full', 'md:w-7/10', 'md:w-3/10', 'shrink-left');
    opportunityRightPanel.classList.remove('md:w-full', 'md:w-7/10', 'md:w-3/10', 'expand-right', 'hidden-panel');

    switch (layoutType) {
        case 'full_form_and_list':
            opportunityFullFormView.classList.remove('hidden');
            opportunityExistingListView.classList.remove('hidden');
            opportunityLeftPanel.classList.add('md:w-full');
            opportunityRightPanel.classList.add('hidden-panel');
            break;
        case 'edit_split_70_30':
            opportunityFullFormView.classList.remove('hidden');
            opportunityExistingListView.classList.remove('hidden');
            opportunityLeftPanel.classList.add('md:w-7/10');
            opportunityRightPanel.classList.remove('hidden-panel');
            opportunityRightPanel.classList.add('md:w-3/10');
            break;
        case 'edit_split_30_70':
            opportunityFullFormView.classList.remove('hidden');
            opportunityExistingListView.classList.remove('hidden');
            opportunityLeftPanel.classList.add('shrink-left');
            opportunityRightPanel.classList.remove('hidden-panel');
            opportunityRightPanel.classList.add('expand-right');
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
        submitOpportunityLineButton, submitQuoteButton, submitUserButton
    ];
    buttons.forEach(btn => {
        if (btn) { // Ensure button element exists before trying to manipulate it
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

/**
 * Shows a specific section and hides others.
 * Imports and initializes modules for the active section.
 * @param {string} sectionId - The ID of the section to show.
 */
export async function showSection(sectionId) {
    // Check for admin section access only if the section is admin-specific
    const adminSections = ['admin-country-mapping-section', 'users-management-section', 'currency-management-section', 'price-book-management-section'];
    if (adminSections.includes(sectionId)) {
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
        if (section) { // Defensive check: ensure section exists
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
    if (desktopAdminSubMenu && desktopAdminMenu) desktopAdminMenu.classList.remove('active'); // Defensive check for desktopAdminMenu
    if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden');

    // Stop all listeners first to prevent redundant updates
    unsubscribeAll();

    // Reset currentOpportunityId and layout when navigating away from opportunities
    if (sectionId !== 'opportunities-section') {
        currentOpportunityId = null;
        currentEditedOpportunity = null;
        if (linkedObjectsAccordion) linkedObjectsAccordion.classList.add('hidden');
        setOpportunityLayout('full_form_and_list'); // Reset opportunity layout
    } else {
        // When navigating TO opportunities section, ensure default layout is applied
        setOpportunityLayout('full_form_and_list');
    }

    // CRITICAL: Ensure db and auth are initialized and ready before proceeding
    // This check is very important before importing and initializing modules.
    if (!db || !auth || !isDbReady || !isAuthReady) {
        console.warn(`main.js: Attempted to show section ${sectionId} but Firebase/Firestore is not fully ready. Modules will not initialize.`);
        toggleButtonsDisabled(true); // Disable all buttons
        // Inform user that app is initializing
        // Using defensive checks for customerList before accessing innerHTML
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing application. Please wait...</p>';
        return; // Exit, as we cannot proceed with module initialization
    } else {
        toggleButtonsDisabled(false); // Enable buttons once DB is ready and auth confirmed
    }

    // Dynamically import and initialize modules for the active section
    // Pass the 'db' instance to each module's 'setDbInstance' function
    if (sectionId === 'customers-section') {
        try {
            const customersModule = await import('./customers.js');
            customersModule.setDbInstance(db); // Pass the live db instance
            customersModule.initCustomersModule();
        } catch (error) {
            console.error("main.js: Failed to load customers module or set DB instance:", error);
        }
    } else if (sectionId === 'opportunities-section') {
        try {
            const opportunitiesModule = await import('./opportunities.js');
            if (opportunitiesModule.setDbInstance) {
                opportunitiesModule.setDbInstance(db);
            }
            opportunitiesModule.initOpportunitiesModule();
        } catch (error) {
            console.error("main.js: Failed to load opportunities module:", error);
        }
    } else if (sectionId === 'admin-country-mapping-section') {
        if (isAdmin) {
            try {
                // Import adminDataModule dynamically
                const adminDataModule = await import('./admin_data.js');
                adminDataModule.setDbInstance(db); // Pass the live db instance
                adminDataModule.initAdminDataModule('country_mapping');
            } catch (error) {
                console.error("main.js: Failed to load admin_data module for country mapping or set DB instance:", error);
            }
        }
    } else if (sectionId === 'currency-management-section') {
        if (isAdmin) {
            try {
                // Import adminDataModule dynamically
                const adminDataModule = await import('./admin_data.js');
                adminDataModule.setDbInstance(db); // Pass the live db instance
                adminDataModule.initAdminDataModule('currency_management');
            } catch (error) {
                console.error("main.js: Failed to load admin_data module for currency management or set DB instance:", error);
            }
        }
    } else if (sectionId === 'users-management-section') {
        if (isAdmin) {
            try {
                const usersModule = await import('./users.js');
                usersModule.setDbInstance(db); // Pass the live db instance
                usersModule.initUsersModule();
            } catch (error) {
                console.error("main.js: Failed to load users module:", error);
            }
        }
    } else if (sectionId === 'price-book-management-section') {
        if (isAdmin) {
            try {
                const priceBookModule = await import('./price_book.js');
                priceBookModule.setDbInstance(db); // Pass the live db instance
                priceBookModule.initPriceBookModule();
            } catch (error) {
                console.error("main.js: Failed to load price book module:", error);
            }
        }
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

// These functions (`fetchCountryData`, `fetchCurrencies`, `getCurrencySymbol`, `getCurrencyName`)
// are now wrappers that call the functions from admin_data.js after dynamic import.
// This ensures admin_data.js has its 'firestoreDb' set before its functions are invoked.

// Dynamic import for admin_dataModule to ensure its functions are available
// This is typically handled by `showSection` on demand, but if these are called globally
// before a section is loaded, we need to ensure admin_dataModule is loaded.
// For now, let's assume these are called after showSection has handled the import for relevant section.
// If needed, we might need a global `ensureAdminDataModuleLoaded` function.
let adminDataModule = {}; // Placeholder to be populated after dynamic import if needed globally

export async function fetchCountryData() {
    console.log("main.js: fetchCountryData called (wrapper).");
    if (!db || !isDbReady) {
        console.warn("main.js: Cannot fetch country data, DB not ready.");
        return;
    }
    try {
        // Ensure the module is loaded and its setDbInstance has been called if not already.
        // This is a safety measure if this function is called directly outside of showSection.
        if (!adminDataModule.fetchCountryData) {
            adminDataModule = await import('./admin_data.js');
            adminDataModule.setDbInstance(db); // Ensure its DB instance is set
        }
        await adminDataModule.fetchCountryData();
        appCountries = adminDataModule.appCountries; // Update main's global array
        appCountryStateMap = adminDataModule.appCountryStateMap; // Update main's global map
    } catch (error) {
        console.error("main.js: Error in fetchCountryData wrapper:", error);
    }
}

export async function fetchCurrencies() {
    console.log("main.js: fetchCurrencies called (wrapper).");
    if (!db || !isDbReady) {
        console.warn("main.js: Cannot fetch currencies, DB not ready.");
        return;
    }
    try {
        if (!adminDataModule.fetchCurrencies) {
            adminDataModule = await import('./admin_data.js');
            adminDataModule.setDbInstance(db);
        }
        await adminDataModule.fetchCurrencies();
        allCurrencies = adminDataModule.allCurrencies; // Update main's global array
    } catch (error) {
        console.error("main.js: Error in fetchCurrencies wrapper:", error);
    }
}


export function getCurrencySymbol(code) {
    if (adminDataModule.getCurrencySymbol) {
        return adminDataModule.getCurrencySymbol(code);
    }
    console.warn("main.js: adminDataModule not loaded, cannot get currency symbol.");
    return code; // Fallback
}

export function getCurrencyName(code) {
    if (adminDataModule.getCurrencyName) {
        return adminDataModule.getCurrencyName(code);
    }
    console.warn("main.js: adminDataModule not loaded, cannot get currency name.");
    return code; // Fallback
}


// Initialize Firebase and set up authentication listener
async function initializeFirebase() {
    if (!app) {
        try {
            app = initializeApp(firebaseConfig);
            getAnalytics(app);
            auth = getAuth(app); // Initialize auth first
            db = getFirestore(app); // Then initialize db
            isDbReady = true; // Set db ready flag AFTER db is assigned
            console.log("main.js: Firebase app and services initialized. DB Ready:", isDbReady, "Actual db instance:", db); // NEW: Log db instance
        } catch (error) {
            console.error("main.js: Error initializing Firebase services:", error);
            showModal("Firebase Service Error", `Failed to initialize Firebase services: ${error.message}`, () => {});
            isDbReady = false; // Ensure flag is false on error
            return;
        }
    }

    // --- IMPORTANT: Initialize all DOM element references here BEFORE setting up onAuthStateChanged ---
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
    currencyManagementSection = document.getElementById('currency-management-section');
    priceBookManagementSection = document.getElementById('price-book-management-section');

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
    // Populate allSections AFTER all individual elements have been assigned
    allSections = [
        homeSection,
        customersSection,
        opportunitiesSection,
        eventsSection,
        adminCountryMappingSection,
        usersManagementSection,
        authSection,
        currencyManagementSection,
        priceBookManagementSection
    ].filter(section => section !== null); // Filter out any that might still be null if ID not found


    // Accordion toggles for Opportunity related objects
    function toggleAccordion(header, content) {
        if (!header || !content) return; // Defensive check
        header.classList.toggle('active');
        if (content.style.maxHeight) {
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        }
    }
    if (contactsAccordionHeader) contactsAccordionHeader.addEventListener('click', () => toggleAccordion(contactsAccordionHeader, contactsAccordionContent));
    if (linesAccordionHeader) linesAccordionHeader.addEventListener('click', () => toggleAccordion(linesAccordionHeader, linesAccordionContent));
    if (quotesAccordionHeader) quotesAccordionHeader.addEventListener('click', () => toggleAccordion(quotesAccordionHeader, quotesAccordionContent));

    if (desktopAdminMenuToggle && desktopAdminMenu) { // Defensive check for desktopAdminMenu
        desktopAdminMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            desktopAdminMenu.classList.toggle('active');
        });
    }
    document.addEventListener('click', (e) => {
        // More robust check to close dropdown only if click is outside the toggle and the menu itself
        if (desktopAdminMenu && !desktopAdminMenu.contains(e.target) && !e.target.closest('#desktopAdminMenuToggle')) {
            desktopAdminMenu.classList.remove('active');
        }
    });

    if (mobileAdminMenuToggle && mobileAdminSubMenu) { // Defensive check for mobileAdminSubMenu
        mobileAdminMenuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            mobileAdminSubMenu.classList.toggle('hidden');
        });
    }

    // --- IMPORTANT: onAuthStateChanged listener is set up LAST, after all DOM elements are referenced ---
    onAuthStateChanged(auth, async (user) => {
        isAuthReady = true; // Auth is ready as soon as this listener fires once
        console.log("main.js: onAuthStateChanged: Auth state changed. User:", user ? user.email || user.uid : "null");

        // Ensure DB is ready before proceeding with auth-dependent operations
        if (!isDbReady) {
            console.warn("main.js: DB is not yet ready in onAuthStateChanged. Firebase will retry auth state check after DB initialization.");
            return; // Exit and let the system retry when DB is ready
        }

        if (user) {
            currentUserId = user.uid;
            // Defensive checks before accessing DOM elements
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
            try {
                const userProfileSnap = await getDoc(userProfileRef);

                if (userProfileSnap.exists()) {
                    const userData = userProfileSnap.data();
                    console.log("main.js: DEBUG: User data from Firestore - Role:", userData.role, " (Type:", typeof userData.role, ")");
                    isAdmin = (userData.role === 'Admin' && userData.profileAccess === true);
                    console.log("main.js: onAuthStateChanged: User profile exists. Admin status:", isAdmin);
                } else {
                    // Create basic user profile if it doesn't exist
                    await setDoc(userProfileRef, {
                        userId: user.uid,
                        userName: user.email || 'N/A',
                        firstName: user.displayName ? user.displayName.split(' ')[0] : '',
                        lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
                        email: user.email || 'N/A',
                        phone: '',
                        role: 'User', // Default role
                        profileAccess: true // Default access
                    }, { merge: true });
                    console.log("main.js: Basic user profile created for:", user.uid);
                    isAdmin = false; // New users are not admins by default
                }
            } catch (profileError) {
                console.error("main.js: Error fetching or creating user profile:", profileError);
                showModal("Profile Error", `Failed to get/create user profile: ${profileError.message}. Access to some features may be limited.`, () => {});
                isAdmin = false; // Ensure isAdmin is false on error
            }

            // Show/hide admin menus based on isAdmin status
            if (desktopAdminMenu) { // Defensive check
                if (isAdmin) {
                    desktopAdminMenu.classList.remove('hidden');
                } else {
                    desktopAdminMenu.classList.add('hidden');
                }
            }
            if (mobileAdminMenu) { // Defensive check
                if (isAdmin) {
                    mobileAdminMenu.classList.remove('hidden');
                } else {
                    mobileAdminMenu.classList.add('hidden');
                }
            }

            // Show the home section (now guaranteed to have DOM elements ready)
            showSection('home-section');

        } else {
            // No user signed in
            currentUserId = null;
            isAdmin = false;
            console.log("main.js: onAuthStateChanged: No user signed in. Showing home section by default.");

            // Clear global data arrays when user logs out
            appCountries = [];
            appCountryStateMap = {};
            allCurrencies = [];
            allCustomers = []; // Also clear customers data

            if (userIdDisplay) userIdDisplay.classList.add('hidden');
            if (mobileUserIdDisplay) mobileUserIdDisplay.classList.add('hidden');
            if (desktopAdminMenu) desktopAdminMenu.classList.add('hidden');
            if (mobileAdminMenu) mobileAdminMenu.classList.add('hidden');
            if (logoutButton) logoutButton.classList.add('hidden');
            if (mobileLogoutButton) mobileLogoutButton.classList.add('hidden');

            if (desktopAdminSubMenu) desktopAdminMenu.classList.remove('active'); // Close admin dropdown
            if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden'); // Hide mobile admin submenu

            if (navGoogleLoginButton) navGoogleLoginButton.classList.remove('hidden');
            if (googleLoginButtonHome) googleLoginButtonHome.classList.remove('hidden');
            if (homeSignInMessage) homeSignInMessage.classList.remove('hidden');

            toggleButtonsDisabled(true); // Ensure buttons are disabled if not signed in

            showSection('home-section');
        }
    });

    // Event listeners for navigation and auth buttons (can be set up here as they don't depend on auth state to exist)
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            if (mobileMenu) mobileMenu.classList.toggle('open');
            if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden'); // Close admin submenu if mobile menu toggles
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

    // Set footer year
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear().toString();
    }
}

window.onload = initializeFirebase;
