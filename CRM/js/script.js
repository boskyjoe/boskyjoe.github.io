import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, setDoc, getDoc, where, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// YOUR Firebase Configuration - Provided by the user and directly embedded.
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebaseapp.com",
    messagingSenderId: "10782416018",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

console.log("Using directly provided Firebase config:", firebaseConfig);


// Use __app_id for Firestore collection paths as per mandatory instructions.
// Fallback to projectId from firebaseConfig if __app_id is somehow not defined.
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId;

let app;
let db;
let auth;
let currentUserId = null; // Will be set by Firebase Auth onAuthStateChanged
let isAuthReady = false; // Set to false initially, true when Firebase Auth confirms a user
const currentCustomerCollectionType = 'public'; // Fixed to public as per requirement
let unsubscribeCustomers = null; // To store the onSnapshot unsubscribe function for customers
let unsubscribeUsers = null; // To store the onSnapshot unsubscribe function for users
let unsubscribeOpportunities = null; // NEW
let unsubscribeOpportunityContacts = null; // NEW
let unsubscribeOpportunityLines = null; // NEW
let unsubscribeQuotes = null; // NEW
let unsubscribeCurrencies = null; // NEW: For currency listener

let isAdmin = false; // Flag to control admin specific UI/features
let currentOpportunityId = null; // NEW: Stores the Firestore Doc ID of the currently selected/edited opportunity
let currentEditedOpportunity = null; // Stores the full opportunity object currently being edited

// Data for Countries and States (Now fetched from Firestore)
let appCountries = [];
let appCountryStateMap = {};

// Data for Currencies (NEW: Now fetched from Firestore)
let allCurrencies = []; // Will store currency data from Firestore

// Data for Customers (to populate Opportunity Customer dropdown)
let allCustomers = [];

// NEW: Constant for the global app settings document ID
const APP_SETTINGS_DOC_ID = "app_settings";


// Declare DOM element variables at a higher scope (or globally with 'let')
// but assign them only once inside initializeFirebase to avoid issues.
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


// Function to show a custom confirmation modal
function showModal(title, message, onConfirm, onCancel) {
    const modalContainer = document.getElementById('modalContainer'); // Ensure this is also initialized when used
    if (!modalContainer) {
        console.error("Modal container not found!");
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
            console.error("Unknown opportunity layout type:", layoutType);
            break;
    }
}


// Function to show a specific section and hide others
async function showSection(sectionId) {
    // Check for admin section access only if the section is admin-specific
    if (['admin-country-mapping-section', 'users-management-section', 'currency-management-section'].includes(sectionId)) { // UPDATED for currency section
        if (!currentUserId) { // If not logged in at all
            console.log(`Access to ${sectionId} denied. No user logged in. Prompting Google login.`);
            await handleGoogleLogin(); // Force Google login if not authenticated
            // After handleGoogleLogin, onAuthStateChanged will fire and re-evaluate isAdmin.
            // We'll rely on the onAuthStateChanged to call showSection again if successful.
            return; // Exit early, let onAuthStateChanged handle redirect
        }

        if (!isAdmin) { // Logged in but not an admin
            showModal("Unauthorized Access", "You do not have administrative privileges to access this section.", () => {
                showSection('home'); // Redirect non-admins to home
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
    if (unsubscribeCustomers) { unsubscribeCustomers(); }
    if (unsubscribeUsers) { unsubscribeUsers(); }
    if (unsubscribeOpportunities) { unsubscribeOpportunities(); } // NEW
    if (unsubscribeOpportunityContacts) { unsubscribeOpportunityContacts(); } // NEW
    if (unsubscribeOpportunityLines) { unsubscribeOpportunityLines(); } // NEW
    if (unsubscribeQuotes) { unsubscribeQuotes(); } // NEW
    if (unsubscribeCurrencies) { unsubscribeCurrencies(); } // NEW


    // Reset currentOpportunityId and layout when navigating away from opportunities
    if (sectionId !== 'opportunities-section') {
        currentOpportunityId = null;
        currentEditedOpportunity = null; // Clear the edited opportunity
        if (linkedObjectsAccordion) linkedObjectsAccordion.classList.add('hidden'); // Hide linked objects if not in opportunity section
    }

    // Start specific listener for the active section, but only if auth is ready
    if (isAuthReady) { // Ensure auth is ready before starting listeners
        if (sectionId === 'customers-section') {
            listenForCustomers();
            resetCustomerForm(); // Reset form and apply initial validation state
            if (submitCustomerButton) submitCustomerButton.removeAttribute('disabled'); // Customers form always enabled for authenticated users
        } else if (sectionId === 'opportunities-section') { // NEW
            await fetchCustomersForDropdown(); // Fetch customers to populate dropdown
            listenForOpportunities();
            resetOpportunityForm(); // This will also hide linked object sections initially and set layout
            if (submitOpportunityButton) submitOpportunityButton.removeAttribute('disabled');
            populateCurrencySelect(); // Populate currency dropdown for opportunities form
            updateCurrencySymbolDisplay(); // Set initial currency symbol
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
                listenForCurrencies(); // Start listening for currencies
                resetCurrencyForm(); // Reset currency form
                if (submitCurrencyButton) submitCurrencyButton.removeAttribute('disabled');
            } else {
                if (submitCurrencyButton) submitCurrencyButton.setAttribute('disabled', 'disabled');
            }
        }
        else if (sectionId === 'users-management-section') {
            if (isAdmin) { // Double check admin status for safety
                listenForUsers(); // Start listening for users data
                resetUserForm(); // Reset user form
                if (submitUserButton) submitUserButton.removeAttribute('disabled'); // Enable user form button for admin
            } else {
                if (submitUserButton) submitUserButton.setAttribute('disabled', 'disabled');
            }
        }
    } else {
        console.warn("Attempted to show section before Firebase Auth is ready:", sectionId);
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
        console.error("Error during Google login:", error);
        showModal("Login Error", `Failed to sign in with Google: ${error.message}`, () => {
            showSection('home'); // Redirect to home if Google login fails
        });
    }
}

// Function to fetch country and state data from Firestore for the CRM forms
async function fetchCountryData() {
    try {
        const docRef = doc(db, "app_metadata", "countries_states");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            appCountries = data.countries || [];
            appCountryStateMap = data.countryStateMap || {};
            console.log("Country and State data loaded from Firestore.");
        } else {
            console.warn("No 'countries_states' document found in 'app_metadata' collection.");
            // No modal here, as it might be first load and admin can upload it.
            appCountries = [];
            appCountryStateMap = {};
        }
    } catch (error) {
        console.error("Error fetching country data from Firestore:", error);
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
        console.log("Admin country data loaded into textareas.");
    }
    catch (error) {
        console.error("Error in loadAdminCountryData:", error); // Log for debugging
    }
}

// NEW: Function to fetch currency data from Firestore
async function fetchCurrencies() {
    try {
        // CHANGED: Corrected collection reference to include a document ID for `app_settings`
        const collectionRef = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");
        const querySnapshot = await getDocs(collectionRef);
        allCurrencies = []; // Clear existing data
        querySnapshot.forEach((docSnap) => {
            allCurrencies.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log("Currency data loaded from Firestore.");
    } catch (error) {
        console.error("Error fetching currency data from Firestore:", error);
        allCurrencies = []; // Ensure it's empty on error
    }
}

// NEW: Helper function to get currency symbol by code
function getCurrencySymbol(code) {
    const currency = allCurrencies.find(c => c.id === code); // Find by doc.id (which is currencyCode)
    return currency ? currency.symbol : code; // Fallback to code if symbol not found
}

// NEW: Helper function to get currency name by code
function getCurrencyName(code) {
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
        } catch (error) {
            console.error("Error initializing Firebase services:", error);
            showModal("Firebase Service Error", `Failed to initialize Firebase services: ${error.message}`, () => {});
            return; // Exit if core services fail to initialize
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

    // Opportunity Section Elements (NEW - and now restructured)
    opportunitiesSection = document.getElementById('opportunities-section');
    opportunityViewContainer = document.getElementById('opportunity-view-container'); // NEW main flex container
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
    opportunityServiceAddressInput = document.getElementById('opportunityServiceAddress'); // NEW Field
    opportunityDescriptionInput = document.getElementById('opportunityDescription');
    opportunityDataInput = document.getElementById('opportunityData');
    submitOpportunityButton = document.getElementById('submitOpportunityButton');
    opportunityList = document.getElementById('opportunityList'); // Reference to the div for opportunity rows

    linkedObjectsAccordion = document.getElementById('linkedObjectsAccordion');
    contactsAccordionHeader = document.getElementById('contactsAccordionHeader');
    contactsAccordionContent = contactsAccordionHeader ? contactsAccordionHeader.nextElementSibling : null;
    linesAccordionHeader = document.getElementById('linesAccordionHeader');
    linesAccordionContent = linesAccordionHeader ? linesAccordionHeader.nextElementSibling : null;
    quotesAccordionHeader = document.getElementById('quotesAccordionHeader');
    quotesAccordionContent = quotesAccordionHeader ? quotesAccordionHeader.nextElementSibling : null;

    // Opportunity Contact Elements (NEW)
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

    // Opportunity Line Elements (NEW - Stubs)
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

    // Quote Elements (NEW - Stubs)
    quoteForm = document.getElementById('quoteForm');
    quoteIdDisplayGroup = document.getElementById('quoteIdDisplayGroup');
    quoteIdDisplay = document.getElementById('quoteIdDisplay');
    quoteNameInput = document.getElementById('quoteName');
    quoteDescriptionInput = document.getElementById('quoteDescription');
    quoteCustomerSelect = document.getElementById('quoteCustomer'); // Auto-filled from opportunity
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

    // Admin Currency Management Section elements (NEW)
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
    userIdDisplayInput = document.getElementById('userIdDisplayInput'); // Changed to an input element
    userNameInput = document.getElementById('userName');
    userFirstNameInput = document.getElementById('userFirstName');
    userLastNameInput = document.getElementById('userLastName');
    userEmailInput = document.getElementById('userEmail');
    userPhoneInput = document.getElementById('userPhone');
    userRoleSelect = document.getElementById('userRole'); // Changed to select
    userSkillsInput = document.getElementById('userSkills');
    submitUserButton = document.getElementById('submitUserButton');
    userList = document.getElementById('userList');

    // References to logout buttons and the new nav Google Login button
    logoutButton = document.getElementById('logoutButton');
    mobileLogoutButton = document.getElementById('mobileLogoutButton');
    navGoogleLoginButton = document.getElementById('navGoogleLoginButton'); // Top right Google Sign In button

    // Home section Google login button (for visual hint on home page)
    googleLoginButtonHome = document.getElementById('googleLoginButton');
    homeSignInMessage = document.getElementById('homeSignInMessage'); // NEW: For the sign-in prompt message

    // Explicitly define userIdDisplay and mobileUserIdDisplay here
    userIdDisplay = document.getElementById('userIdDisplay');
    mobileUserIdDisplay = document.getElementById('mobileUserIdDisplay');

    // Admin menu elements (added IDs in HTML)
    desktopAdminMenu = document.getElementById('desktopAdminMenu');
    mobileAdminMenu = document.getElementById('mobileAdminMenu');

    // NEW: Admin Menu Toggle elements
    desktopAdminMenuToggle = document.getElementById('desktopAdminMenuToggle');
    desktopAdminSubMenu = document.getElementById('desktopAdminSubMenu');
    mobileAdminMenuToggle = document.getElementById('mobileAdminMenuToggle');
    mobileAdminSubMenu = document.getElementById('mobileAdminSubMenu');


    // Reference to auth-section (for standard Google/email login) - This section is mostly decorative now
    authSection = document.getElementById('auth-section');

    // Mobile Menu Button and Container
    mobileMenuButton = document.getElementById('mobileMenuButton');
    mobileMenu = document.getElementById('mobileMenu');


    // Re-populate allSections array now that elements are initialized
    allSections = [
        homeSection,
        customersSection,
        opportunitiesSection,
        eventsSection,
        adminCountryMappingSection,
        usersManagementSection,
        authSection,
        currencyManagementSection
    ].filter(section => section !== null); // Filter out any that might still be null if HTML is malformed


    // Add Event Listeners for accordions AFTER they are initialized
    if (contactsAccordionHeader) contactsAccordionHeader.addEventListener('click', () => toggleAccordion(contactsAccordionHeader, contactsAccordionContent));
    if (linesAccordionHeader) linesAccordionHeader.addEventListener('click', () => toggleAccordion(linesAccordionHeader, linesAccordionContent));
    if (quotesAccordionHeader) quotesAccordionHeader.addEventListener('click', () => toggleAccordion(quotesAccordionHeader, quotesAccordionContent));
    // REMOVED: Event listener for the summary card

    // --- NEW: Admin Submenu Toggle Listeners ---
    if (desktopAdminMenuToggle && desktopAdminMenu) { // Ensure desktopAdminMenu is parent of toggle
        desktopAdminMenuToggle.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            // Toggle 'active' class on desktopAdminMenu (the <li> parent)
            desktopAdminMenu.classList.toggle('active');
        });
    }
    // Listener for clicks *outside* the desktop admin menu to close it
    document.addEventListener('click', (e) => {
        if (desktopAdminMenu && !desktopAdminMenu.contains(e.target)) {
            // If the click is outside the desktop admin menu, close it
            desktopAdminMenu.classList.remove('active');
        }
    });


    if (mobileAdminMenuToggle && mobileAdminSubMenu) {
        mobileAdminMenuToggle.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            // Toggle 'hidden' class on the submenu directly, as per CSS for mobile submenu
            mobileAdminSubMenu.classList.toggle('hidden');
        });
    }


    // Listen for auth state changes
    onAuthStateChanged(auth, async (user) => {
        isAuthReady = true; // Mark auth as ready as soon as state is known
        console.log("onAuthStateChanged: Auth state changed. User:", user ? user.email || user.uid : "null");

        if (user) {
            currentUserId = user.uid;
            // Ensure userIdDisplay and mobileUserIdDisplay are not null before setting textContent
            if (userIdDisplay) userIdDisplay.textContent = `User ID: ${user.email || user.uid}`;
            if (mobileUserIdDisplay) mobileUserIdDisplay.textContent = `User ID: ${user.email || user.uid}`;

            // Show User ID and Logout buttons
            if (userIdDisplay) userIdDisplay.classList.remove('hidden');
            if (mobileUserIdDisplay) mobileUserIdDisplay.classList.remove('hidden');
            if (navGoogleLoginButton) navGoogleLoginButton.classList.add('hidden');
            if (googleLoginButtonHome) googleLoginButtonHome.classList.add('hidden'); // Also hide the home page login button
            if (logoutButton) logoutButton.classList.remove('hidden');
            if (mobileLogoutButton) mobileLogoutButton.classList.remove('hidden');
            if (homeSignInMessage) homeSignInMessage.classList.add('hidden'); // Hide sign-in message

            console.log("onAuthStateChanged: Current Firebase UID:", currentUserId);

            // Fetch the user's profile document from Firestore
            const userProfileRef = doc(db, 'users_data', user.uid);
            const userProfileSnap = await getDoc(userProfileRef);

            // MOVED THESE FETCHES HERE - AFTER AUTH STATE IS CONFIRMED
            await Promise.all([
                fetchCurrencies(),
                fetchCountryData()
            ]);


            if (userProfileSnap.exists()) {
                // Profile exists, set isAdmin based on the 'role' and `profileAccess` field
                const userData = userProfileSnap.data();

                // --- ADDED DEBUG LOGGING HERE ---
                console.log("DEBUG: User data from Firestore - Role:", userData.role, " (Type:", typeof userData.role, ")");
                console.log("DEBUG: User data from Firestore - Profile Access:", userData.profileAccess, " (Type:", typeof userData.profileAccess, ")");

                // Ensure profileAccess is strictly boolean true
                isAdmin = (userData.role === 'Admin' && userData.profileAccess === true);
                console.log("onAuthStateChanged: User profile exists. Admin status:", isAdmin);
            } else {
                // Profile does NOT exist (first login for this user)
                // Create a basic profile with default 'User' role
                try {
                    await setDoc(userProfileRef, {
                        userId: user.uid, // Store the Firebase Auth UID as the userId field
                        userName: user.email || 'N/A',
                        firstName: user.displayName ? user.displayName.split(' ')[0] : '',
                        lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
                        email: user.email || 'N/A',
                        phone: '', // Default empty
                        role: 'User', // Default role for all new users on first login
                        profileAccess: true // For a new user profile created on first login, allow access by default.
                    });
                    console.log("Basic user profile created for:", user.uid);
                    isAdmin = false; // Explicitly set to false for newly created default 'User' profile.
                } catch (profileError) {
                    console.error("Error creating basic user profile:", profileError);
                    showModal("Profile Error", `Failed to create user profile: ${profileError.message}. Access to some features may be limited.`, () => {});
                }
            }

            // Show/Hide Admin menus based on isAdmin flag
            if (isAdmin) {
                if (desktopAdminMenu) desktopAdminMenu.classList.remove('hidden');
                if (mobileAdminMenu) mobileAdminMenu.classList.remove('hidden');
            } else {
                if (desktopAdminMenu) desktopAdminMenu.classList.add('hidden');
                if (mobileAdminMenu) mobileAdminMenu.classList.add('hidden');
            }

            // Populate dropdowns for customer form (always needed)
            populateCountries();

            // Always redirect to home after successful authentication
            showSection('home');


        } else { // No user is signed in.
            currentUserId = null;
            isAdmin = false; // Ensure isAdmin is false when no user
            console.log("onAuthStateChanged: No user signed in. Showing home section by default.");

            // Clear loaded app-wide data when logged out
            appCountries = [];
            appCountryStateMap = {};
            allCurrencies = [];

            // Hide admin menus and logout buttons
            if (userIdDisplay) userIdDisplay.classList.add('hidden'); // Hide desktop user ID
            if (mobileUserIdDisplay) mobileUserIdDisplay.classList.add('hidden'); // Hide mobile user ID
            if (desktopAdminMenu) desktopAdminMenu.classList.add('hidden');
            if (mobileAdminMenu) mobileMobileMenu.classList.add('hidden'); // Corrected typo here
            if (logoutButton) logoutButton.classList.add('hidden');
            if (mobileLogoutButton) mobileLogoutButton.classList.add('hidden');

            // Hide admin submenus explicitly on logout
            if (desktopAdminSubMenu) desktopAdminMenu.classList.remove('active'); // Ensure desktop dropdown is closed
            if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden'); // Ensure mobile dropdown is closed


            // Show Google Login buttons
            if (navGoogleLoginButton) navGoogleLoginButton.classList.remove('hidden');
            if (googleLoginButtonHome) googleLoginButtonHome.classList.remove('hidden'); // Show home page login button
            if (homeSignInMessage) homeSignInMessage.classList.remove('hidden'); // Show sign-in message

            // Disable all form submit buttons by default when not logged in
            if (submitCustomerButton) submitCustomerButton.setAttribute('disabled', 'disabled');
            if (submitOpportunityButton) submitOpportunityButton.setAttribute('disabled', 'disabled'); // NEW
            if (submitOpportunityContactButton) submitOpportunityContactButton.setAttribute('disabled', 'disabled'); // NEW
            if (submitOpportunityLineButton) submitOpportunityLineButton.setAttribute('disabled', 'disabled'); // NEW
            if (submitQuoteButton) submitQuoteButton.setAttribute('disabled', 'disabled'); // NEW
            if (uploadAdminDataButton) uploadAdminDataButton.setAttribute('disabled', 'disabled');
            if (submitUserButton) submitUserButton.setAttribute('disabled', 'disabled');
            if (submitCurrencyButton) submitCurrencyButton.setAttribute('disabled', 'disabled'); // NEW

            // Always show the home section initially
            showSection('home');
            // The auth-section itself is hidden, login happens via header button
        }
    });

    // --- Event Listeners ---
    // Customer Form Event Listener (Renamed and Updated for validation)
    if (customerForm) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Collect data from all fields, regardless of visibility, as values will be empty if hidden/optional
            const customerData = {
                customerType: customerTypeSelect.value.trim(),
                firstName: customerFirstNameInput.value.trim(),
                lastName: customerLastNameInput.value.trim(),
                companyName: customerCompanyNameInput.value.trim(), // Use .value.trim() for company name
                email: customerEmailInput.value.trim(),
                phone: customerPhoneInput.value.trim(),
                // Address fields are now explicitly collected from their respective inputs
                country: customerCountrySelect.value.trim(),
                address: customerAddressInput.value.trim(),
                city: customerCityInput.value.trim(),
                state: customerStateSelect.value.trim(),
                zipCode: customerZipCodeInput.value.trim(),
                industry: '', // Will be set conditionally below
                customerSince: customerSinceInput.value, // Date input value is already string inYYYY-MM-DD
                description: customerDescriptionInput.value.trim()
                // customerId field will be added/updated by saveCustomer function
            };

            // Set the correct industry value based on customer type
            if (customerTypeSelect.value === 'Individual') {
                customerData.industry = customerIndustryInput.value.trim();
            } else if (customerTypeSelect.value === 'Company') {
                customerData.industry = customerIndustrySelect.value.trim();
            }

            const editingId = customerForm.dataset.editingId; // This is the Firestore auto-generated doc ID

            await saveCustomer(customerData, editingId || null);
        });
    }
    // Opportunity Form Event Listener (NEW and UPDATED for currency symbol)
    if (opportunityForm) {
        opportunityForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const opportunityData = {
                customer: opportunityCustomerSelect.value, // This is the Firestore customer document ID
                opportunityName: opportunityNameInput.value,
                amount: opportunityAmountInput.value, // Will be parsed to float in saveOpportunity
                currency: opportunityCurrencySelect.value,
                stage: opportunityStageSelect.value,
                expectedStartDate: opportunityExpectedStartDateInput.value,
                expectedCloseDate: opportunityExpectedCloseDateInput.value,
                eventType: opportunityEventTypeSelect.value,
                eventLocationProposed: opportunityEventLocationProposedInput.value,
                serviceAddress: opportunityServiceAddressInput.value, // NEW Field
                description: opportunityDescriptionInput.value,
                opportunityData: opportunityDataInput.value, // Can be JSON string or plain text, will be parsed if possible
            };

            const editingId = opportunityForm.dataset.editingId;
            await saveOpportunity(opportunityData, editingId || null);
        });
    }

    // Event listener for currency select change to update the symbol display
    if (opportunityCurrencySelect) {
        opportunityCurrencySelect.addEventListener('change', updateCurrencySymbolDisplay);
    }


    // Opportunity Contact Form Event Listener (NEW)
    if (opportunityContactForm) {
        opportunityContactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contactData = {
                firstName: contactFirstNameInput.value,
                lastName: contactLastNameInput.value,
                email: contactEmailInput.value,
                phone: contactPhoneInput.value,
                role: contactRoleInput.value
            };
            const editingId = opportunityContactForm.dataset.editingId;
            await saveOpportunityContact(contactData, editingId || null);
        });
    }

    // Opportunity Line Form Event Listener (NEW - Stubs)
    if (opportunityLineForm) {
        opportunityLineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const lineData = {
                serviceDescription: lineServiceDescriptionInput.value,
                unitPrice: lineUnitPriceInput.value,
                quantity: lineQuantityInput.value,
                discount: lineDiscountInput.value,
                netPrice: lineNetPriceInput.value, // This will be calculated in saveOpportunityLine
                status: lineStatusSelect.value
            };
            const editingId = opportunityLineForm.dataset.editingId;
            await saveOpportunityLine(lineData, editingId || null);
        });
    }

    // Quote Form Event Listener (NEW - Stubs)
    if (quoteForm) {
        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const quoteData = {
                quoteName: quoteNameInput.value,
                quoteDescription: quoteDescriptionInput.value,
                customer: quoteCustomerSelect.value, // This is linked to the opportunity's customer
                startDate: quoteStartDateInput.value,
                expireDate: quoteExpireDateInput.value,
                quoteStatus: quoteStatusSelect.value,
                quoteNetListAmount: quoteNetListAmountInput.value,
                quoteNetDiscount: quoteNetDiscountInput.value,
                quoteNetAmount: quoteNetAmountInput.value, // This will be calculated in saveQuote
                quoteCurrency: quoteCurrencySelect.value,
                isFinal: quoteIsFinalCheckbox.checked
            };
            const editingId = quoteForm.dataset.editingId;
            await saveQuote(quoteData, editingId || null);
        });
    }


    // Mobile Menu Button Event Listener
    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', () => {
            if (mobileMenu) mobileMenu.classList.toggle('open'); // Toggle 'open' class for max-height transition
            // Close admin submenus if mobile menu is closed or being opened/closed
            if (mobileAdminSubMenu) mobileAdminSubMenu.classList.add('hidden');
        });
    }


    // Navigation Links Event Listeners
    document.querySelectorAll('nav a').forEach(link => {
        // Only add listener if the link has a data-section attribute
        if (link.dataset.section) {
            link.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default link behavior
                showSection(link.dataset.section); // Call showSection with the target section ID
            });
        }
    });


    // Event listener for the Google Login Button in the header (nav bar)
    if (navGoogleLoginButton) {
        navGoogleLoginButton.addEventListener('click', handleGoogleLogin);
    }

    // Event listener for the Google Login button on the Home section
    if (googleLoginButtonHome) {
        googleLoginButtonHome.addEventListener('click', handleGoogleLogin);
    }

    // Add event listeners for logout buttons
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("User signed out.");
                // onAuthStateChanged will handle UI updates
            } catch (error) {
                console.error("Error signing out:", error);
                showModal("Logout Error", `Failed to log out: ${error.message}`, () => {});
            }
        });
    }

    if (mobileLogoutButton) {
        mobileLogoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log("User signed out.");
                // onAuthStateChanged will handle UI updates
            }
            catch (error) {
                console.error("Error signing out:", error);
                showModal("Logout Error", `Failed to log out: ${error.message}`, () => {});
            }
        });
    }

    // Admin Country Mapping Form Event Listener
    if (document.getElementById('countryMappingForm')) {
        document.getElementById('countryMappingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (adminMessageDiv) adminMessageDiv.classList.add('hidden'); // Clear previous messages
            if (uploadAdminDataButton) {
                uploadAdminDataButton.disabled = true;
                uploadAdminDataButton.textContent = 'Uploading...';
            }


            const countriesString = adminCountriesInput.value;
            const countryStateMapString = adminCountryStateMapInput.value;
            const isFullLoad = fullLoadRadio.checked;

            // Parse countries string into array of objects (newline-separated, filter unique codes)
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
                        adminMessageDiv.className = 'message error'; // Use error styling for warnings too
                        adminMessageDiv.classList.remove('hidden');
                    }
                    console.warn(msg);
                }
                return parsedCountries;
            }

            // Parse countryStateMap string into an object (newline-separated)
            function parseCountryStateMap(mapString) {
                const map = {};
                if (!mapString.trim()) return map;
                mapString.split('\n').forEach(line => { // Changed split delimiter to newline
                    const parts = line.split(':');
                    if (parts.length === 2) {
                        const countryCode = parts[0].trim();
                        const states = parts[1].split(',').map(s => s.trim()).filter(s => s !== ''); // Filter empty states
                        if (countryCode !== '') { // Only add if country code is not empty
                            map[countryCode] = states;
                        }
                    }
                });
                return map;
            }

            const dataToUpload = {};
            let hasValidDataForUpload = false;

            // Process countries data
            const parsedCountries = parseCountries(countriesString);
            if (parsedCountries.length > 0) {
                dataToUpload.countries = parsedCountries;
                hasValidDataForUpload = true;
            }

            // Process countryStateMap data
            const parsedCountryStateMap = parseCountryStateMap(countryStateMapString);
            if (Object.keys(parsedCountryStateMap).length > 0) {
                dataToUpload.countryStateMap = parsedCountryStateMap;
                hasValidDataForUpload = true;
            }

            // Special case: If full load is selected and BOTH textareas are empty, this means clearing the document.
            // Otherwise, if a textarea is empty, its corresponding field will not be included in dataToUpload
            // and thus not affected by merge:true.
            if (!hasValidDataForUpload && isFullLoad) {
                // If full load is selected AND no valid data was parsed from EITHER textarea,
                // it implies the user wants to completely clear both fields.
                dataToUpload.countries = [];
                dataToUpload.countryStateMap = {};
                hasValidDataForUpload = true; // Mark as having intent to update (with empty data)
            } else if (!hasValidDataForUpload && !isFullLoad) {
                // If incremental load is selected AND no valid data was parsed,
                // there's nothing to update.
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
                // Always use merge: true to avoid deleting unspecified fields.
                // If the user wants to empty a field, they have to ensure the parsed array/object is empty.
                await setDoc(docRef, dataToUpload, { merge: true });

                if (adminMessageDiv) {
                    adminMessageDiv.textContent = `Data uploaded successfully (${isFullLoad ? 'Full Load (Merge)' : 'Incremental Load'})!`;
                    adminMessageDiv.className = 'message success';
                    adminMessageDiv.classList.remove('hidden');
                }
                console.log("Admin data upload successful:", dataToUpload);

                // Re-fetch data for CRM forms and populate dropdowns after successful admin update
                await fetchCountryData();
                populateCountries();

            } catch (error) {
                console.error("Error uploading admin data:", error);
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

    // Admin Currency Form Event Listener (NEW)
    if (currencyForm) {
        currencyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = currencyForm.dataset.editingId;
            // For CSV, currencyData parameter is not directly used, as the function reads from the textarea.
            await saveCurrency(null, editingId || null);
        });
    }


    // User Form Event Listener
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userData = {
                userName: userNameInput.value.trim(),
                firstName: userFirstNameInput.value.trim(),
                lastName: userLastNameInput.value.trim(),
                email: userEmailInput.value.trim(),
                phone: userPhoneInput.value.trim(),
                role: userRoleSelect.value.trim(), // Get value from select
                skills: userSkillsInput.value.trim(), // Will be parsed to array in saveUser
            };
            const editingId = userForm.dataset.editingId; // This is the Firestore document ID if editing
            await saveUser(userData, editingId || null);
        });
    }


    // Reset Form Buttons - add event listeners
    document.getElementById('resetCustomerFormButton')?.addEventListener('click', resetCustomerForm);
    document.getElementById('resetOpportunityFormButton')?.addEventListener('click', resetOpportunityForm);
    document.getElementById('resetOpportunityContactFormButton')?.addEventListener('click', resetOpportunityContactForm);
    document.getElementById('resetOpportunityLineFormButton')?.addEventListener('click', resetOpportunityLineForm);
    document.getElementById('resetQuoteFormButton')?.addEventListener('click', resetQuoteForm);
    document.getElementById('resetUserFormButton')?.addEventListener('click', resetUserForm);
    document.getElementById('resetCurrencyFormButton')?.addEventListener('click', resetCurrencyForm); // NEW


}

// Determine the Firestore collection path based on type and user ID
function getCollectionPath(type, dataArea = 'customers') {
    if (!auth.currentUser) { // Use auth.currentUser to determine actual user state
        console.warn("No authenticated user, cannot determine collection path securely.");
        // For public data, still provide the public path even if not logged in
        if (type === 'public') {
            return `artifacts/${appId}/public/data/${dataArea}`;
        }
        // For private data, if no user is authenticated, it's an error scenario for data operations
        showModal("Authentication Error", "You must be logged in to access private data.", () => {});
        return null; // Return null to indicate path is not available
    }
    const userId = auth.currentUser.uid;
    if (type === 'public') {
        return `artifacts/${appId}/public/data/${dataArea}`;
    } else { // 'private'
        return `artifacts/${appId}/users/${userId}/${dataArea}`;
    }
}


/* --- CUSTOMERS CRUD OPERATIONS --- */

// Function to populate the country dropdown
function populateCountries() {
    if (!customerCountrySelect) {
        console.warn("customerCountrySelect not found, cannot populate countries.");
        return;
    }
    customerCountrySelect.innerHTML = '<option value="">Select Country</option>'; // Clear existing and add default
    appCountries.forEach(country => { // Use appCountries
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        customerCountrySelect.appendChild(option);
    });
}

// Function to populate the state/province dropdown based on selected country
function populateStates(countryCode) {
    if (!customerStateSelect) {
        console.warn("customerStateSelect not found, cannot populate states.");
        return;
    }
    customerStateSelect.innerHTML = '<option value="">Select State/Province</option>'; // Clear existing and add default
    const states = appCountryStateMap[countryCode] || []; // Use appCountryStateMap
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        customerStateSelect.appendChild(option);
    });
    // If no states available, potentially disable the dropdown or show a message
    customerStateSelect.disabled = states.length === 0;
}

// Placeholder for address validation (requires external API for real validation)
function validateAddress(address, city, state, zipCode, country) {
    // This is a basic client-side check. A real-world application would use a service like:
    // Google Maps Platform Address Validation API, USPS API, etc.
    // Example: fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=...&key=YOUR_API_KEY`)
    // For now, we'll just check if the fields are not empty.
    const isValid = address.trim() !== '' && city.trim() !== '' && state.trim() !== '' && zipCode.trim() !== '' && country.trim() !== '';

    if (!isValid) {
        if (addressValidationMessage) {
            addressValidationMessage.classList.remove('hidden');
            addressValidationMessage.textContent = "Please fill in all address fields.";
        }
    } else {
        if (addressValidationMessage) {
            addressValidationMessage.classList.add('hidden');
            addressValidationMessage.textContent = "";
        }
    }
    return isValid;
}


// Function to apply validation rules based on customer type
function applyCustomerTypeValidation() {
    if (!customerTypeSelect) return; // Defensive check

    const customerType = customerTypeSelect.value;

    // Hide all conditional groups first
    if (individualFieldsDiv) individualFieldsDiv.classList.add('hidden');
    if (customerLastNameInput && customerLastNameInput.closest('div')) customerLastNameInput.closest('div').classList.add('hidden');
    if (companyNameFieldDiv) companyNameFieldDiv.classList.add('hidden');
    if (individualIndustryGroup) individualIndustryGroup.classList.add('hidden');
    if (companyIndustryGroup) companyIndustryGroup.classList.add('hidden');

    // Remove required attributes from all conditional inputs
    if (customerFirstNameInput) customerFirstNameInput.removeAttribute('required');
    if (customerLastNameInput) customerLastNameInput.removeAttribute('required');
    if (customerCompanyNameInput) customerCompanyNameInput.removeAttribute('required');
    if (customerIndustryInput) customerIndustryInput.removeAttribute('required');
    if (customerIndustrySelect) customerIndustrySelect.removeAttribute('required');

    if (customerType === 'Individual') {
        if (individualFieldsDiv) individualFieldsDiv.classList.remove('hidden');
        if (customerLastNameInput && customerLastNameInput.closest('div')) customerLastNameInput.closest('div').classList.remove('hidden');
        if (customerFirstNameInput) customerFirstNameInput.setAttribute('required', 'required');
        if (customerLastNameInput) customerLastNameInput.setAttribute('required', 'required');

        if (individualIndustryGroup) individualIndustryGroup.classList.remove('hidden');
        if (customerIndustryInput) customerIndustryInput.setAttribute('required', 'required');
    } else if (customerType === 'Company') {
        if (companyNameFieldDiv) companyNameFieldDiv.classList.add('hidden');
        if (customerCompanyNameInput) customerCompanyNameInput.setAttribute('required', 'required');

        if (companyIndustryGroup) companyIndustryGroup.classList.remove('hidden');
        if (customerIndustrySelect) customerIndustrySelect.setAttribute('required', 'required');
    }
}

// Add event listener for customer type change
// These event listeners should also be added inside initializeFirebase or after elements are surely present
// customerTypeSelect.addEventListener('change', applyCustomerTypeValidation); // Moved to initializeFirebase

// Add event listener for country change to populate states
// customerCountrySelect.addEventListener('change', (e) => { // Moved to initializeFirebase
//     populateStates(e.target.value);
// });


// Add or update a customer in Firestore
async function saveCustomer(customerData, existingCustomerDocId = null) {
    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated or session not established. Cannot save customer.");
        showModal("Error", "Could not save customer. Authentication required.", () => {});
        return;
    }

    // Perform client-side validation based on customer type
    const customerType = customerTypeSelect.value;
    if (!customerType) {
        showModal("Validation Error", "Please select a Customer Type.", () => {});
        return;
    }

    if (customerType === 'Individual') {
        if (!customerFirstNameInput.value.trim() || !customerLastNameInput.value.trim()) {
            showModal("Validation Error", "For Individual customers, First Name and Last Name are mandatory.", () => {});
            return;
        }
        customerData.companyName = ""; // Clear company name for individuals
    } else if (customerType === 'Company') {
        if (!customerCompanyNameInput.value.trim()) {
            showModal("Validation Error", "For Company customers, Company Name is mandatory.", () => {});
            return;
        }
        customerData.firstName = ""; // Clear first/last name for companies
        customerData.lastName = "";
    }

    // Collect the correct industry value based on type
    customerData.industry = customerType === 'Individual' ? customerIndustryInput.value.trim() : customerIndustrySelect.value.trim();

    // All other common fields are universally mandatory by HTML 'required' attribute, but a final check here is good
    if (!customerEmailInput.value.trim() || !customerPhoneInput.value.trim() ||
        !customerData.industry || !customerSinceInput.value.trim()) {
        showModal("Validation Error", "Please fill in all mandatory fields.", () => {});
        return;
    }

    // Perform address validation
    const addressValid = validateAddress(
        customerAddressInput.value,
        customerCityInput.value,
        customerStateSelect.value, // Now a select
        customerZipCodeInput.value,
        customerCountrySelect.value // NEW country field
    );

    if (!addressValid) {
        showModal("Validation Error", "Please provide a complete and valid address.", () => {});
        return;
    }


    // Always use the public collection for customers
    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers'); // dataArea is 'customers'
    if (!collectionPath) return; // Exit if path is not available due to auth error


    try {
        if (existingCustomerDocId) {
            // Editing an existing customer: simply update the document
            const customerDocRef = doc(db, collectionPath, existingCustomerDocId);
            await updateDoc(customerDocRef, customerData);
            console.log("Customer updated:", existingCustomerDocId);
        } else {
            // Adding a NEW customer:
            const newDocRef = doc(collection(db, collectionPath)); // Get a reference with a new auto-generated ID

            // Generate numeric part for customerId
            // Using a combination of timestamp and a small random number to increase uniqueness
            // and ensure it's numeric.
            const numericPart = Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const systemGeneratedCustomerId = 'COM-' + numericPart;

            // Add address fields to customerData
            customerData.country = customerCountrySelect.value.trim(); // NEW
            customerData.address = customerAddressInput.value.trim();
            customerData.city = customerCityInput.value.trim();
            customerData.state = customerStateSelect.value.trim(); // Now a select
            customerData.zipCode = customerZipCodeInput.value.trim();


            // Set the document with the full data including the custom customerId
            await setDoc(newDocRef, { ...customerData, customerId: systemGeneratedCustomerId });
            console.log("Customer added with system-generated ID:", systemGeneratedCustomerId);
        }
        // Reset form and UI state after successful save/update
        resetCustomerForm(); // Use the new reset function
    } catch (error) {
        console.error("Error saving customer:", error);
        showModal("Error", "Failed to save customer. Please try again. " + error.message, () => {});
    }
}

// Delete a customer from Firestore
async function deleteCustomer(firestoreDocId) {
    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated or session not established. Cannot delete customer.");
        showModal("Error", "Could not delete customer. Authentication required.", () => {});
        return;
    }

    // Always use the public collection for customers
    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers'); // dataArea is 'customers'
    if (!collectionPath) return; // Exit if path is not available due to auth error

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this customer? This action cannot be undone.",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("Customer deleted Firestore Doc ID:", firestoreDocId);
            } catch (error) {
                console.error("Error deleting customer:", error);
                showModal("Error", "Failed to delete customer. Please try again. " + error.message, () => {});
            }
        
        }
    );
}

// Listen for real-time updates to customers
function listenForCustomers() {
    if (unsubscribeCustomers) {
        unsubscribeCustomers(); // Unsubscribe from previous listener
    }

    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated or session not established. Cannot listen for customers.");
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center col-span-full">Authentication required to load customers.</p>';
        return;
    }

    // Always listen to the public collection for customers
    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers'); // dataArea is 'customers'
    if (!collectionPath) return; // Exit if path is not available due to auth error

    const q = collection(db, collectionPath);

    unsubscribeCustomers = onSnapshot(q, (snapshot) => {
        if (customerList) customerList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No customers found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const customer = { id: doc.id, ...doc.data() }; // doc.id is Firestore's internal ID
            displayCustomer(customer);
        });
    }, (error) => {
        console.error("Error listening to customers:", error);
        if (customerList) customerList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading customers: ${error.message}</p>`;
    });
}

// Display a single customer in the UI as a grid row
function displayCustomer(customer) {
    if (!customerList) return; // Defensive check
    const customerRow = document.createElement('div');
    // Use data-grid-row class
    customerRow.className = 'data-grid-row'; // Removed grid-cols, CSS handles this now
    customerRow.dataset.id = customer.id; // Store Firestore document ID for edit/delete actions

    // Determine the main display name based on customer type
    let displayName = 'N/A';
    if (customer.customerType === 'Company' && customer.companyName) {
        displayName = customer.companyName;
    } else if (customer.customerType === 'Individual' && (customer.firstName || customer.lastName)) {
        displayName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    }

    customerRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${customer.customerId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${displayName}</div>
        <div class="px-2 py-1 truncate">${customer.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.phone || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${customer.address || 'N/A'}, ${customer.city || 'N/A'}, ${customer.state || 'N/A'}, ${customer.zipCode || 'N/A'}, ${customer.country || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${customer.industry || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${customer.customerSince || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${customer.id}">Edit</button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${customer.id}">Delete</button>
        </div>
    `;
    customerList.appendChild(customerRow);

    customerRow.querySelector('.edit-btn').addEventListener('click', () => editCustomer(customer));
    customerRow.querySelector('.delete-btn').addEventListener('click', () => deleteCustomer(customer.id));
}


// Populate form for editing a customer
function editCustomer(customer) {
    if (!isAuthReady || !currentUserId) { // Add auth check
        showModal("Permission Denied", "Authentication required to edit customers.", () => {});
        return;
    }
    // No isAdmin check here, as customer data is public access for all authenticated users
    if (customerFormTitle) customerFormTitle.textContent = 'Edit Customer';
    if (submitCustomerButton) submitCustomerButton.textContent = 'Update Customer';

    // Display the system-generated Customer ID
    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.remove('hidden');
    if (customerIdDisplay) customerIdDisplay.textContent = customer.customerId || 'N/A';

    // Populate common fields
    if (customerTypeSelect) customerTypeSelect.value = customer.customerType || '';
    if (customerEmailInput) customerEmailInput.value = customer.email || '';
    if (customerPhoneInput) customerPhoneInput.value = customer.phone || '';
    if (customerSinceInput) customerSinceInput.value = customer.customerSince || '';
    if (customerDescriptionInput) customerDescriptionInput.value = customer.description || '';
    if (customerForm) customerForm.dataset.editingId = customer.id;

    // Populate Address fields
    if (customerCountrySelect) customerCountrySelect.value = customer.country || ''; // NEW
    populateStates(customer.country); // Populate states based on loaded country
    if (customerAddressInput) customerAddressInput.value = customer.address || '';
    if (customerCityInput) customerCityInput.value = customer.city || '';
    // Set state value after population, ensuring it exists in the new options
    if (customer.state && customerStateSelect && Array.from(customerStateSelect.options).some(option => option.value === customer.state)) {
        customerStateSelect.value = customer.state;
    } else {
        if (customerStateSelect) customerStateSelect.value = ''; // Reset if not found
    }
    if (customerZipCodeInput) customerZipCodeInput.value = customer.zipCode || '';


    // Call applyCustomerTypeValidation BEFORE populating conditional fields
    // This ensures the correct fields are visible and required attributes are set
    // before we attempt to set their values.
    applyCustomerTypeValidation(); // This will show/hide fields based on typeSelect.value

    // Populate conditional fields AFTER applyCustomerTypeValidation has set visibility
    if (customerFirstNameInput) customerFirstNameInput.value = customer.firstName || '';
    if (customerLastNameInput) customerLastNameInput.value = customer.lastName || '';
    if (customerCompanyNameInput) customerCompanyNameInput.value = customer.companyName || '';

    // Set correct industry field value
    if (customer.customerType === 'Individual') {
        if (customerIndustryInput) customerIndustryInput.value = customer.industry || '';
    } else if (customer.customerType === 'Company') {
        if (customerIndustrySelect) customerIndustrySelect.value = customer.industry || '';
    }

    if (addressValidationMessage) addressValidationMessage.classList.add('hidden'); // Hide validation message on edit start

    if (customerForm) customerForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Customer form function
function resetCustomerForm() {
    if (customerForm) customerForm.reset();
    if (customerForm) customerForm.dataset.editingId = '';
    if (customerFormTitle) customerFormTitle.textContent = 'Add New Customer';
    if (submitCustomerButton) submitCustomerButton.textContent = 'Add Customer';
    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.add('hidden'); // Hide ID display group
    if (customerIdDisplay) customerIdDisplay.textContent = ''; // Clear displayed ID

    // Reset address fields and states
    if (customerCountrySelect) customerCountrySelect.value = '';
    populateStates(''); // Clear states
    if (addressValidationMessage) addressValidationMessage.classList.add('hidden'); // Hide validation message


    // Set customer type to Individual by default and apply validation
    if (customerTypeSelect) customerTypeSelect.value = 'Individual';
    applyCustomerTypeValidation(); // Re-apply validation to hide/show fields correctly for a new entry
}

/* --- OPPORTUNITY CRUD OPERATIONS (UPDATED FOR NEW UI AND CURRENCY SYMBOLS) --- */

// NEW: Function to populate the currency select dropdown for opportunities
function populateCurrencySelect() {
    if (!opportunityCurrencySelect) {
        console.warn("opportunityCurrencySelect not found, cannot populate currencies.");
        return;
    }
    opportunityCurrencySelect.innerHTML = '<option value="">Select Currency</option>'; // Clear existing options and add default

    // Sort currencies by currencyCode (id) for consistent display
    const sortedCurrencies = [...allCurrencies].sort((a, b) => a.id.localeCompare(b.id));

    sortedCurrencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency.id; // currencyCode is the doc.id
        option.textContent = `${currency.id} (${currency.symbol})`; // e.g., "USD ($)"
        opportunityCurrencySelect.appendChild(option);
    });

    // Set default value if available, e.g., USD
    if (allCurrencies.some(c => c.id === 'USD')) {
        opportunityCurrencySelect.value = 'USD';
    }
    updateCurrencySymbolDisplay(); // Update symbol when options are populated
}

// NEW: Function to update the currency symbol next to the amount input
function updateCurrencySymbolDisplay() {
    // Add defensive check for currencySymbolDisplay
    if (!currencySymbolDisplay) {
        console.error("updateCurrencySymbolDisplay: currencySymbolDisplay element is null. Cannot update symbol.");
        return; // Exit if element is not available
    }

    const selectedCurrencyCode = opportunityCurrencySelect.value;
    const symbolToAssign = getCurrencySymbol(selectedCurrencyCode);

    try {
        currencySymbolDisplay.textContent = symbolToAssign;
    } catch (error) {
        console.error("ERROR: Failed to set currency symbol textContent:", error);
    }
}

// Function to fetch customers and populate the dropdown for opportunities
async function fetchCustomersForDropdown() {
    if (!isAuthReady || !currentUserId) {
        console.warn("User not authenticated, cannot fetch customers for dropdown.");
        return;
    }
    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers');
    if (!collectionPath) return;

    try {
        const querySnapshot = await getDocs(collection(db, collectionPath));
        allCustomers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        if (!opportunityCustomerSelect) {
            console.warn("opportunityCustomerSelect not found, skipping customer dropdown population.");
            return;
        }

        opportunityCustomerSelect.innerHTML = '<option value="">Select Customer</option>'; // Clear existing and add default
        allCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id; // Store Firestore doc ID
            // Display name based on customer type
            let displayName = customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
            option.textContent = displayName || customer.email; // Fallback to email
            opportunityCustomerSelect.appendChild(option);
        });
        console.log("Customers loaded for Opportunity dropdown.");
    } catch (error) {
        console.error("Error fetching customers for opportunity dropdown:", error);
        showModal("Error", "Failed to load customers for opportunity dropdown. " + error.message, () => {});
    }
}

// Event listener for customer selection to auto-populate service address
// This needs to be moved inside initializeFirebase
// opportunityCustomerSelect.addEventListener('change', (e) => {
//     // Only auto-fill if the service address is currently empty OR if a new opportunity is being created (no editingId)
//     // This prevents overwriting user-edited address when an opportunity is loaded for editing.
//     const isEditing = opportunityForm.dataset.editingId;
//     if (!isEditing || opportunityServiceAddressInput.value.trim() === '') {
//         const selectedCustomerId = e.target.value;
//         const selectedCustomer = allCustomers.find(c => c.id === selectedCustomerId);

//         if (selectedCustomer) {
//             const customerAddress = `${selectedCustomer.address || '', ${selectedCustomer.city || ''}, ${selectedCustomer.state || ''}, ${selectedCustomer.zipCode || ''}, ${selectedCustomer.country || ''}`.trim();
//             opportunityServiceAddressInput.value = customerAddress.replace(/,(\s*,){1,}/g, ',').replace(/^,|,$/g, '').trim(); // Clean up multiple commas
//         } else {
//             opportunityServiceAddressInput.value = '';
//         }
//     }
// });


// Save (Add/Update) an Opportunity
async function saveOpportunity(opportunityData, existingOpportunityDocId = null) {
    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated. Cannot save opportunity.");
        showModal("Error", "Could not save opportunity. Authentication required.", () => {});
        return;
    }

    // Client-side validation for mandatory fields (updated to include serviceAddress)
    const mandatoryFields = [
        { field: opportunityData.customer, name: "Customer" },
        { field: opportunityData.opportunityName.trim(), name: "Opportunity Name" },
        { field: opportunityData.amount, name: "Amount" },
        { field: opportunityData.currency.trim(), name: "Currency" },
        { field: opportunityData.stage.trim(), name: "Stage" },
        { field: opportunityData.expectedStartDate.trim(), name: "Expected Start Date" },
        { field: opportunityData.expectedCloseDate.trim(), name: "Expected Close Date" },
        { field: opportunityData.eventType.trim(), name: "Event Type" },
        { field: opportunityData.eventLocationProposed.trim(), name: "Proposed Event Location" },
        { field: opportunityData.serviceAddress.trim(), name: "Service Address" }, // NEW MANDATORY FIELD
        { field: opportunityData.description.trim(), name: "Description" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field || (typeof item.field === 'string' && item.field === '') || (item.name === "Amount" && (isNaN(item.field) || item.field <= 0))) {
            missingFields.push(item.name);
        }
    });

    if (missingFields.length > 0) {
        const message = `Please fill in all mandatory fields: ${[...new Set(missingFields)].join(', ')}.`;
        showModal("Validation Error", message, () => {});
        return;
    }

    // Ensure amount is stored as a number
    opportunityData.amount = parseFloat(opportunityData.amount);

    // Parse opportunityDataInput if it's meant to be a JSON object
    if (opportunityDataInput && opportunityData.opportunityData.trim() !== '') {
        try {
            opportunityData.opportunityData = JSON.parse(opportunityData.opportunityData);
        } catch (e) {
            showModal("Validation Error", "Additional Opportunity Data must be valid JSON if provided.", () => {});
            return;
        }
    } else {
        opportunityData.opportunityData = {}; // Store as empty object if input is empty
    }


    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'opportunities'); // Using public for opportunities
    if (!collectionPath) return;

    try {
        if (existingOpportunityDocId) {
            // Update existing opportunity
            const opportunityDocRef = doc(db, collectionPath, existingOpportunityDocId);
            await updateDoc(opportunityDocRef, opportunityData);
            console.log("Opportunity updated:", existingOpportunityDocId);
            showModal("Success", "Opportunity updated successfully!", () => {});
        } else {
            // Add new opportunity
            const newDocRef = doc(collection(db, collectionPath));
            const numericPart = Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const systemGeneratedOpportunityId = 'OPTY-' + numericPart;

            await setDoc(newDocRef, { ...opportunityData, opportunityId: systemGeneratedOpportunityId });
            console.log("Opportunity added with ID:", systemGeneratedOpportunityId);
            showModal("Success", "New opportunity created successfully!", () => {});
        }
        resetOpportunityForm();
    } catch (error) {
        console.error("Error saving opportunity:", error);
        showModal("Error", `Failed to save opportunity: ${error.message}`, () => {});
    }
}

// Delete an Opportunity
async function deleteOpportunity(firestoreDocId) {
    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated. Cannot delete opportunity.");
        showModal("Error", "Could not delete opportunity. Authentication required.", () => {});
        return;
    }

    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'opportunities');
    if (!collectionPath) return;

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this opportunity? This action cannot be undone. All linked contacts, lines, and quotes will also be deleted.",
        async () => {
            try {
                const opportunityDocRef = doc(db, collectionPath, firestoreDocId);

                // Delete subcollections first (contacts, lines, quotes)
                // Note: Firestore doesn't have native cascade delete. You must manually delete subcollections.
                // This is a simplified example; for large subcollections, you'd use batch writes or Cloud Functions.
                const subCollections = ['contacts', 'lines', 'quotes'];
                for (const subColl of subCollections) {
                    const subCollRef = collection(opportunityDocRef, subColl);
                    const subDocsSnapshot = await getDocs(subCollRef);
                    subDocsSnapshot.forEach(async (subDoc) => {
                        await deleteDoc(subDoc.ref);
                    });
                }

                await deleteDoc(opportunityDocRef);
                console.log("Opportunity and its subcollections deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "Opportunity and its linked data deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting opportunity:", error);
                showModal("Error", `Failed to delete opportunity: ${error.message}`, () => {});
            }
        }
    );
}

// Listen for real-time updates to Opportunities
function listenForOpportunities() {
    if (unsubscribeOpportunities) {
        unsubscribeOpportunities();
    }

    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated. Cannot listen for opportunities.");
        if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center col-span-full">Authentication required to load opportunities.</p>';
        return;
    }

    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'opportunities');
    if (!collectionPath) return;

    const q = collection(db, collectionPath);

    unsubscribeOpportunities = onSnapshot(q, (snapshot) => {
        if (opportunityList) opportunityList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No opportunities found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const opportunity = { id: doc.id, ...doc.data() };
            displayOpportunity(opportunity);
        });
    }, (error) => {
        console.error("Error listening to opportunities:", error);
        if (opportunityList) opportunityList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading opportunities: ${error.message}</p>`;
    });
}

// Display a single opportunity in the UI (UPDATED for currency symbol)
function displayOpportunity(opportunity) {
    if (!opportunityList) return; // Defensive check
    const opportunityRow = document.createElement('div');
    // Use data-grid-row class, and ensure its specific grid columns match the CSS
    opportunityRow.className = 'data-grid-row'; // Removed grid-cols, CSS handles this now
    opportunityRow.dataset.id = opportunity.id; // Store Firestore document ID

    // Find customer name using customerId
    const customer = allCustomers.find(c => c.id === opportunity.customer);
    const customerDisplayName = customer ? (customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()) : 'N/A';

    // Get currency symbol
    const currencySymbol = getCurrencySymbol(opportunity.currency);
    const formattedAmount = opportunity.amount ? `${currencySymbol}${parseFloat(opportunity.amount).toFixed(2)}` : 'N/A';


    opportunityRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${opportunity.opportunityId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${opportunity.opportunityName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${customerDisplayName}</div>
        <div class="px-2 py-1 truncate">${formattedAmount}</div>
        <div class="px-2 py-1 truncate">${opportunity.stage || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${opportunity.expectedStartDate || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${opportunity.expectedCloseDate || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${opportunity.eventType || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${opportunity.id}">Edit</button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${opportunity.id}">Delete</button>
        </div>
    `;
    opportunityList.appendChild(opportunityRow);

    opportunityRow.querySelector('.edit-btn').addEventListener('click', () => editOpportunity(opportunity));
    opportunityRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunity(opportunity.id));
}

// Populate form for editing an opportunity (UPDATED FOR NEW UI AND CURRENCY SYMBOL)
function editOpportunity(opportunity) {
    if (!isAuthReady || !currentUserId) {
        showModal("Permission Denied", "Authentication required to edit opportunities.", () => {});
        return;
    }

    currentEditedOpportunity = opportunity; // Store the full opportunity object globally

    // Set layout to 70:30 split view initially
    setOpportunityLayout('edit_split_70_30');

    if (opportunityFormTitle) opportunityFormTitle.textContent = 'Edit Opportunity';
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Update Opportunity';

    if (opportunityIdDisplayGroup) opportunityIdDisplayGroup.classList.remove('hidden');
    if (opportunityIdDisplay) opportunityIdDisplay.textContent = opportunity.opportunityId || 'N/A';
    if (opportunityForm) opportunityForm.dataset.editingId = opportunity.id; // Store Firestore document ID
    currentOpportunityId = opportunity.id; // Set the globally tracked current opportunity ID

    // Populate fields
    if (opportunityCustomerSelect) opportunityCustomerSelect.value = opportunity.customer || ''; // customerId (Firestore doc ID)
    if (opportunityNameInput) opportunityNameInput.value = opportunity.opportunityName || '';
    if (opportunityAmountInput) opportunityAmountInput.value = opportunity.amount || '';
    if (opportunityCurrencySelect) opportunityCurrencySelect.value = opportunity.currency || '';
    if (opportunityStageSelect) opportunityStageSelect.value = opportunity.stage || '';
    if (opportunityExpectedStartDateInput) opportunityExpectedStartDateInput.value = opportunity.expectedStartDate || '';
    if (opportunityExpectedCloseDateInput) opportunityExpectedCloseDateInput.value = opportunity.expectedCloseDate || '';
    if (opportunityEventTypeSelect) opportunityEventTypeSelect.value = opportunity.eventType || '';
    if (opportunityEventLocationProposedInput) opportunityEventLocationProposedInput.value = opportunity.eventLocationProposed || '';
    if (opportunityServiceAddressInput) opportunityServiceAddressInput.value = opportunity.serviceAddress || '';
    if (opportunityDescriptionInput) opportunityDescriptionInput.value = opportunity.description || '';
    // Handle JSON or plain text for additional data
    if (opportunityDataInput) opportunityDataInput.value = opportunity.opportunityData ? (typeof opportunity.opportunityData === 'object' ? JSON.stringify(opportunity.opportunityData, null, 2) : opportunity.opportunityData) : '';

    updateCurrencySymbolDisplay(); // Update symbol for the input field

    if (linkedObjectsAccordion) opportunityRightPanel.classList.remove('hidden-panel'); // Ensure right panel is visible
    if (linkedObjectsAccordion) linkedObjectsAccordion.classList.remove('hidden'); // Show linked objects accordion

    // Always reset and then listen for sub-collections when editing an opportunity
    resetOpportunityContactForm(); // Clear contact form for new entry
    listenForOpportunityContacts(currentOpportunityId); // Start listening for contacts of this opportunity

    resetOpportunityLineForm(); // Clear line form
    listenForOpportunityLines(currentOpportunityId); // Start listening for lines (stub)

    resetQuoteForm(); // Clear quote form
    listenForQuotes(currentOpportunityId); // Start listening for quotes (stub)

    // Close all accordions by default when opening an opportunity
    closeAllAccordions();


    if (opportunityForm) opportunityForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Opportunity form function (UPDATED FOR NEW UI AND CURRENCY SYMBOLS)
function resetOpportunityForm() {
    if (opportunityForm) opportunityForm.reset();
    if (opportunityForm) opportunityForm.dataset.editingId = '';
    if (opportunityFormTitle) opportunityFormTitle.textContent = 'Add New Opportunity';
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Add Opportunity';
    if (opportunityIdDisplayGroup) opportunityIdDisplayGroup.classList.add('hidden');
    if (opportunityIdDisplay) opportunityIdDisplay.textContent = '';
    if (opportunityDataInput) opportunityDataInput.value = ''; // Ensure additional data is cleared
    if (opportunityServiceAddressInput) opportunityServiceAddressInput.value = ''; // NEW: Clear service address
    currentOpportunityId = null; // Clear the globally tracked current opportunity ID
    currentEditedOpportunity = null; // Clear the edited opportunity

    if (linkedObjectsAccordion) linkedObjectsAccordion.classList.add('hidden'); // Hide linked objects accordion again
    closeAllAccordions(); // Ensure all accordions are closed

    // Re-populate customers dropdown to ensure it's fresh
    fetchCustomersForDropdown();
    populateCurrencySelect(); // Reset currency dropdown to default and update symbol display

    // Clear any existing sub-document lists
    if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No contacts added for this opportunity.</p>';
    if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No opportunity lines added for this opportunity.</p>';
    if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No quotes added for this opportunity.</p>';

    // Unsubscribe from any previous sub-document lists
    if (unsubscribeOpportunityContacts) { unsubscribeOpportunityContacts(); }
    if (unsubscribeOpportunityLines) { unsubscribeOpportunityLines(); }
    if (unsubscribeQuotes) { unsubscribeQuotes(); }

    // Re-enable all sub-form buttons if they were disabled
    if (submitOpportunityContactButton) submitOpportunityContactButton.removeAttribute('disabled');
    if (submitOpportunityLineButton) submitOpportunityLineButton.removeAttribute('disabled');
    if (submitQuoteButton) submitQuoteButton.removeAttribute('disabled');

    // Ensure initial state for quote customer dropdown
    if (quoteCustomerSelect) {
        quoteCustomerSelect.innerHTML = '<option value="">Auto-filled from Opportunity</option>';
        quoteCustomerSelect.setAttribute('disabled', 'disabled');
    }

    // Revert layout to full form and list view for new opportunity creation
    setOpportunityLayout('full_form_and_list');
}

/* --- OPPORTUNITY CONTACTS CRUD (Fully Implemented Example) --- */

async function saveOpportunityContact(contactData, existingContactDocId = null) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Please select an Opportunity first to add/edit contacts.", () => {});
        return;
    }

    const mandatoryFields = [
        { field: contactData.firstName.trim(), name: "First Name" },
        { field: contactData.lastName.trim(), name: "Last Name" },
        { field: contactData.email.trim(), name: "Email" },
        { field: contactData.phone.trim(), name: "Phone" },
        { field: contactData.role.trim(), name: "Role" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field) {
            missingFields.push(item.name);
        }
    });

    if (missingFields.length > 0) {
        const message = `Please fill in all mandatory contact fields: ${[...new Set(missingFields)].join(', ')}.`;
        showModal("Validation Error", message, () => {});
        return;
    }

    const collectionPath = `${getCollectionPath(currentCustomerCollectionType, 'opportunities')}/${currentOpportunityId}/contacts`;

    try {
        if (existingContactDocId) {
            // Update existing contact
            const contactDocRef = doc(db, collectionPath, existingContactDocId);
            await updateDoc(contactDocRef, contactData);
            console.log("Opportunity Contact updated:", existingContactDocId);
            showModal("Success", "Contact updated successfully!", () => {});
        } else {
            // Add new contact
            const newDocRef = doc(collection(db, collectionPath));
            // Generate a simple contact ID
            const numericPart = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
            const systemGeneratedContactId = 'CTCT-' + numericPart;
            await setDoc(newDocRef, { ...contactData, contactId: systemGeneratedContactId, opportunityId: currentOpportunityId });
            console.log("Opportunity Contact added with ID:", systemGeneratedContactId);
            showModal("Success", "New contact added successfully!", () => {});
        }
        resetOpportunityContactForm();
    } catch (error) {
        console.error("Error saving opportunity contact:", error);
        showModal("Error", `Failed to save contact: ${error.message}`, () => {});
    }
}

async function deleteOpportunityContact(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    const collectionPath = `${getCollectionPath(currentCustomerCollectionType, 'opportunities')}/${currentOpportunityId}/contacts`;

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this contact?",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("Opportunity Contact deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "Contact deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting contact:", error);
                showModal("Error", `Failed to delete contact: ${error.message}`, () => {});
            }
        }
    );
}

function listenForOpportunityContacts(opportunityId) {
    if (unsubscribeOpportunityContacts) {
        unsubscribeOpportunityContacts();
    }
    if (!opportunityId) {
        if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Select an Opportunity to view contacts.</p>';
        return;
    }

    const collectionPath = `${getCollectionPath(currentCustomerCollectionType, 'opportunities')}/${opportunityId}/contacts`;
    const q = collection(db, collectionPath);

    unsubscribeOpportunityContacts = onSnapshot(q, (snapshot) => {
        if (opportunityContactList) opportunityContactList.innerHTML = '';
        if (snapshot.empty) {
            if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No contacts added for this opportunity.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const contact = { id: doc.id, ...doc.data() };
            displayOpportunityContact(contact);
        });
    }, (error) => {
        console.error("Error listening to opportunity contacts:", error);
        if (opportunityContactList) opportunityContactList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading contacts: ${error.message}</p>`;
    });
}

function displayOpportunityContact(contact) {
    if (!opportunityContactList) return; // Defensive check
    const contactRow = document.createElement('div');
    // Use data-grid-row class, and ensure its specific grid columns match the CSS
    contactRow.className = 'data-grid-row'; // Removed grid-cols, CSS handles this now
    contactRow.dataset.id = contact.id;

    contactRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${contact.contactId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${contact.firstName || ''} ${contact.lastName || ''}</div>
        <div class="px-2 py-1 truncate">${contact.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${contact.phone || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${contact.role || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${contact.id}">Edit</button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${contact.id}">Delete</button>
        </div>
    `;
    opportunityContactList.appendChild(contactRow);

    contactRow.querySelector('.edit-btn').addEventListener('click', () => editOpportunityContact(contact));
    contactRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunityContact(contact.id));
}

function editOpportunityContact(contact) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    if (opportunityContactForm) opportunityContactForm.dataset.editingId = contact.id;
    if (submitOpportunityContactButton) submitOpportunityContactButton.textContent = 'Update Contact';

    if (contactIdDisplayGroup) contactIdDisplayGroup.classList.remove('hidden');
    if (contactIdDisplay) contactIdDisplay.textContent = contact.contactId || 'N/A';

    if (contactFirstNameInput) contactFirstNameInput.value = contact.firstName || '';
    if (contactLastNameInput) contactLastNameInput.value = contact.lastName || '';
    if (contactEmailInput) contactEmailInput.value = contact.email || '';
    if (contactPhoneInput) contactPhoneInput.value = contact.phone || '';
    if (contactRoleInput) contactRoleInput.value = contact.role || '';

    // Ensure the related section expands and this accordion opens
    closeAllAccordions(); // Close others first
    // No longer using `recalculateAccordionHeight` for this simple accordion
    if (contactsAccordionHeader && contactsAccordionContent) toggleAccordion(contactsAccordionHeader, contactsAccordionContent); // Open this one

    if (contactsAccordionHeader) contactsAccordionHeader.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to header
}

function resetOpportunityContactForm() {
    if (opportunityContactForm) opportunityContactForm.reset();
    if (opportunityContactForm) opportunityContactForm.dataset.editingId = '';
    if (submitOpportunityContactButton) submitOpportunityContactButton.textContent = 'Add Contact';
    if (contactIdDisplayGroup) contactIdDisplayGroup.classList.add('hidden');
    if (contactIdDisplay) contactIdDisplay.textContent = '';
}


/* --- OPPORTUNITY LINES CRUD (STUBS) --- */

async function saveOpportunityLine(lineData, existingLineDocId = null) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Please select an Opportunity first to add/edit lines.", () => {});
        return;
    }
    // Placeholder for validation
    const mandatoryFields = [
        { field: lineData.serviceDescription.trim(), name: "Service Description" },
        { field: lineData.unitPrice, name: "Unit Price" },
        { field: lineData.quantity, name: "Quantity" },
        { field: lineData.status.trim(), name: "Status" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field || (typeof item.field === 'string' && item.field === '') || (item.name === "Unit Price" && (isNaN(item.field) || item.field <= 0)) || (item.name === "Quantity" && (isNaN(item.field) || item.field <= 0))) {
            missingFields.push(item.name);
        }
    });

    if (missingFields.length > 0) {
        const message = `Please fill in all mandatory opportunity line fields: ${[...new Set(missingFields)].join(', ')}.`;
        showModal("Validation Error", message, () => {});
        return;
    }

    // Calculate Net Price: (UnitPrice * Quantity) * (1 - Discount/100)
    const unitPrice = parseFloat(lineData.unitPrice);
    const quantity = parseInt(lineData.quantity);
    const discount = parseFloat(lineData.discount) || 0; // Default to 0 if not provided
    lineData.netPrice = (unitPrice * quantity * (1 - discount / 100)).toFixed(2); // Round to 2 decimal places

    lineData.unitPrice = unitPrice; // Ensure these are numbers for Firestore
    lineData.quantity = quantity;
    lineData.discount = discount;


    const collectionPath = `${getCollectionPath(currentCustomerCollectionType, 'opportunities')}/${currentOpportunityId}/lines`;

    try {
        if (existingLineDocId) {
            // Update existing line
            const lineDocRef = doc(db, collectionPath, existingLineDocId);
            await updateDoc(lineDocRef, lineData);
            console.log("Opportunity Line updated:", existingLineDocId);
            showModal("Success", "Opportunity line updated successfully!", () => {});
        } else {
            // Add new line
            const newDocRef = doc(collection(db, collectionPath));
            const numericPart = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
            const systemGeneratedLineId = 'LINE-' + numericPart;
            await setDoc(newDocRef, { ...lineData, optyLineId: systemGeneratedLineId, opportunityId: currentOpportunityId });
            console.log("Opportunity Line added with ID:", systemGeneratedLineId);
            showModal("Success", "New opportunity line added successfully!", () => {});
        }
        resetOpportunityLineForm();
    } catch (error) {
        console.error("Error saving opportunity line:", error);
        showModal("Error", `Failed to save opportunity line: ${error.message}`, () => {});
    }
}

async function deleteOpportunityLine(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    const collectionPath = `${getCollectionPath(currentCustomerCollectionType, 'opportunities')}/${currentOpportunityId}/lines`;

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this opportunity line?",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("Opportunity Line deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "Opportunity line deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting opportunity line:", error);
                showModal("Error", `Failed to delete opportunity line: ${error.message}`, () => {});
            }
        }
    );
}

// Stub: Listen for real-time updates to Opportunity Lines
function listenForOpportunityLines(opportunityId) {
    if (unsubscribeOpportunityLines) {
        unsubscribeOpportunityLines();
    }
    if (!opportunityId) {
        if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Select an Opportunity to view lines.</p>';
        return;
    }

    const collectionPath = `${getCollectionPath(currentCustomerCollectionType, 'opportunities')}/${opportunityId}/lines`;
    const q = collection(db, collectionPath);

    // This is a basic listener for demonstration, replace with full CRUD display
    unsubscribeOpportunityLines = onSnapshot(q, (snapshot) => {
        if (opportunityLineList) opportunityLineList.innerHTML = '';
        if (snapshot.empty) {
            if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No opportunity lines added for this opportunity.</p>';
        } else {
            snapshot.forEach((doc) => {
                const line = { id: doc.id, ...doc.data() };
                displayOpportunityLine(line); // Call a display function
            });
        }
    }, (error) => {
        console.error("Error listening to opportunity lines:", error);
        if (opportunityLineList) opportunityLineList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading lines: ${error.message}</p>`;
    });

}

function displayOpportunityLine(line) {
    if (!opportunityLineList) return; // Defensive check
    const lineRow = document.createElement('div');
    // Use data-grid-row class, and ensure its specific grid columns match the CSS
    lineRow.className = 'data-grid-row'; // Removed grid-cols, CSS handles this now
    lineRow.dataset.id = line.id; // Firestore doc ID

    lineRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${line.optyLineId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${line.serviceDescription || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${line.unitPrice ? line.unitPrice.toFixed(2) : 'N/A'}</div>
        <div class="px-2 py-1 truncate">${line.quantity || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${line.discount ? `${line.discount}%` : '0%'}</div>
        <div class="px-2 py-1 truncate">${line.netPrice ? line.netPrice : 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${line.id}">Edit</button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${line.id}">Delete</button>
        </div>
    `;
    opportunityLineList.appendChild(lineRow);

    lineRow.querySelector('.edit-btn').addEventListener('click', () => editOpportunityLine(line));
    lineRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunityLine(line.id));
}


function editOpportunityLine(line) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    if (opportunityLineForm) opportunityLineForm.dataset.editingId = line.id;
    if (submitOpportunityLineButton) submitOpportunityLineButton.textContent = 'Update Line';

    if (optyLineIdDisplayGroup) optyLineIdDisplayGroup.classList.remove('hidden');
    if (optyLineIdDisplay) optyLineIdDisplay.textContent = line.optyLineId || 'N/A';

    if (lineServiceDescriptionInput) lineServiceDescriptionInput.value = line.serviceDescription || '';
    if (lineUnitPriceInput) lineUnitPriceInput.value = line.unitPrice || '';
    if (lineQuantityInput) lineQuantityInput.value = line.quantity || '';
    if (lineDiscountInput) lineDiscountInput.value = line.discount || '';
    if (lineNetPriceInput) lineNetPriceInput.value = line.netPrice || '';
    if (lineStatusSelect) lineStatusSelect.value = line.status || '';

    // Ensure the related section expands and this accordion opens
    closeAllAccordions(); // Close others first
    // No longer using `recalculateAccordionHeight` for this simple accordion
    if (linesAccordionHeader && linesAccordionContent) toggleAccordion(linesAccordionHeader, linesAccordionContent); // Open this one

    if (linesAccordionHeader) linesAccordionHeader.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to header
}

function resetOpportunityLineForm() {
    if (opportunityLineForm) opportunityLineForm.reset();
    if (opportunityLineForm) opportunityLineForm.dataset.editingId = '';
    if (submitOpportunityLineButton) submitOpportunityLineButton.textContent = 'Add Line';
    if (optyLineIdDisplayGroup) optyLineIdDisplayGroup.classList.add('hidden');
    if (optyLineIdDisplay) optyLineIdDisplay.textContent = '';
    if (lineNetPriceInput) lineNetPriceInput.value = ''; // Clear calculated net price
}


/* --- QUOTES CRUD (STUBS) --- */

async function saveQuote(quoteData, existingQuoteDocId = null) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Please select an Opportunity first to add/edit quotes.", () => {});
        return;
    }
    // Placeholder for validation
    const mandatoryFields = [
        { field: quoteData.quoteName.trim(), name: "Quote Name" },
        { field: quoteData.customer.trim(), name: "Customer" },
        { field: quoteData.startDate.trim(), name: "Start Date" },
        { field: quoteData.expireDate.trim(), name: "Expire Date" },
        { field: quoteData.quoteStatus.trim(), name: "Status" },
        { field: quoteData.quoteCurrency.trim(), name: "Currency" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field) {
            missingFields.push(item.name);
        }
    });

    if (missingFields.length > 0) {
        const message = `Please fill in all mandatory quote fields: ${[...new Set(missingFields)].join(', ')}.`;
        showModal("Validation Error", message, () => {});
        return;
    }

    // Ensure amounts are numbers
    quoteData.quoteNetListAmount = parseFloat(quoteData.quoteNetListAmount) || 0;
    quoteData.quoteNetDiscount = parseFloat(quoteData.quoteNetDiscount) || 0;
    // Calculate Net Amount: NetListAmount - NetDiscount
    quoteData.quoteNetAmount = (quoteData.quoteNetListAmount - quoteData.quoteNetDiscount).toFixed(2);
    quoteData.isFinal = quoteData.isFinal === true; // Ensure boolean

    const collectionPath = `${getCollectionPath(currentCustomerCollectionType, 'opportunities')}/${currentOpportunityId}/quotes`;

    try {
        if (existingQuoteDocId) {
            // Update existing quote
            const quoteDocRef = doc(db, collectionPath, existingQuoteDocId);
            await updateDoc(quoteDocRef, quoteData);
            console.log("Quote updated:", existingQuoteDocId);
            showModal("Success", "Quote updated successfully!", () => {});
        } else {
            // Add new quote
            const newDocRef = doc(collection(db, collectionPath));
            const numericPart = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
            const systemGeneratedQuoteId = 'QTE-' + numericPart;
            await setDoc(newDocRef, { ...quoteData, quoteId: systemGeneratedQuoteId, opportunityId: currentOpportunityId });
            console.log("Quote added with ID:", systemGeneratedQuoteId);
            showModal("Success", "New quote added successfully!", () => {});
        }
        resetQuoteForm();
    } catch (error) {
        console.error("Error saving quote:", error);
        showModal("Error", `Failed to save quote: ${error.message}`, () => {});
    }
}

async function deleteQuote(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    const collectionPath = `${getCollectionPath(currentCustomerCollectionType, 'opportunities')}/${currentOpportunityId}/quotes`;

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this quote?",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("Quote deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "Quote deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting quote:", error);
                showModal("Error", `Failed to delete quote: ${error.message}`, () => {});
            }
        }
    );
}

// Stub: Listen for real-time updates to Quotes
function listenForQuotes(opportunityId) {
    if (unsubscribeQuotes) {
        unsubscribeQuotes();
    }
    if (!opportunityId) {
        if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Select an Opportunity to view quotes.</p>';
        return;
    }

    const collectionPath = `${getCollectionPath(currentCustomerCollectionType, 'opportunities')}/${opportunityId}/quotes`;
    const q = collection(db, collectionPath);

    unsubscribeQuotes = onSnapshot(q, (snapshot) => {
        if (quoteList) quoteList.innerHTML = '';
        if (snapshot.empty) {
            if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No quotes added for this opportunity.</p>';
        } else {
            snapshot.forEach((doc) => {
                const quote = { id: doc.id, ...doc.data() };
                displayQuote(quote); // Call a display function
            });
        }
    }, (error) => {
        console.error("Error listening to quotes:", error);
        if (quoteList) quoteList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading quotes: ${error.message}</p>`;
    });
}

function displayQuote(quote) {
    if (!quoteList) return; // Defensive check
    const quoteRow = document.createElement('div');
    // Use data-grid-row class, and ensure its specific grid columns match the CSS
    quoteRow.className = 'data-grid-row'; // Removed grid-cols, CSS handles this now
    quoteRow.dataset.id = quote.id; // Firestore doc ID

    const currencySymbol = getCurrencySymbol(quote.quoteCurrency);

    quoteRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${quote.quoteId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${quote.quoteName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${quote.quoteStatus || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${quote.quoteNetAmount ? `${currencySymbol}${quote.quoteNetAmount}` : 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${quote.expireDate || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${quote.id}">Edit</button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${quote.id}">Delete</button>
        </div>
    `;
    quoteList.appendChild(quoteRow);

    quoteRow.querySelector('.edit-btn').addEventListener('click', () => editQuote(quote));
    quoteRow.querySelector('.delete-btn').addEventListener('click', () => deleteQuote(quote.id));
}

function editQuote(quote) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    if (quoteForm) quoteForm.dataset.editingId = quote.id;
    if (submitQuoteButton) submitQuoteButton.textContent = 'Update Quote';

    if (quoteIdDisplayGroup) quoteIdDisplayGroup.classList.remove('hidden');
    if (quoteIdDisplay) quoteIdDisplay.textContent = quote.quoteId || 'N/A';

    if (quoteNameInput) quoteNameInput.value = quote.quoteName || '';
    if (quoteDescriptionInput) quoteDescriptionInput.value = quote.quoteDescription || '';

    // Auto-fill customer from current opportunity
    const currentCustomer = allCustomers.find(c => c.id === (opportunityCustomerSelect ? opportunityCustomerSelect.value : null));
    if (currentCustomer) {
        if (quoteCustomerSelect) {
            quoteCustomerSelect.innerHTML = `<option value="${currentCustomer.id}">${currentCustomer.companyName || `${currentCustomer.firstName} ${currentCustomer.lastName}`.trim() || currentCustomer.email}</option>`;
            quoteCustomerSelect.value = currentCustomer.id;
        }
    } else {
        if (quoteCustomerSelect) {
            quoteCustomerSelect.innerHTML = '<option value="">Customer Not Found</option>';
            quoteCustomerSelect.value = '';
        }
    }
    if (quoteCustomerSelect) quoteCustomerSelect.setAttribute('disabled', 'disabled'); // Always disabled as it's linked to opportunity

    if (quoteStartDateInput) quoteStartDateInput.value = quote.startDate || '';
    if (quoteExpireDateInput) quoteExpireDateInput.value = quote.expireDate || '';
    if (quoteStatusSelect) quoteStatusSelect.value = quote.quoteStatus || '';
    if (quoteNetListAmountInput) quoteNetListAmountInput.value = quote.quoteNetListAmount || '';
    if (quoteNetDiscountInput) quoteNetDiscountInput.value = quote.quoteNetDiscount || '';
    if (quoteNetAmountInput) quoteNetAmountInput.value = quote.quoteNetAmount || ''; // This is calculated
    if (quoteCurrencySelect) quoteCurrencySelect.value = quote.quoteCurrency || '';
    if (quoteIsFinalCheckbox) quoteIsFinalCheckbox.checked = quote.isFinal === true;

    // Ensure the related section expands and this accordion opens
    closeAllAccordions(); // Close others first
    // No longer using `recalculateAccordionHeight` for this simple accordion
    if (quotesAccordionHeader && quotesAccordionContent) toggleAccordion(quotesAccordionHeader, quotesAccordionContent); // Open this one

    if (quotesAccordionHeader) quotesAccordionHeader.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Scroll to header
}

function resetQuoteForm() {
    if (quoteForm) quoteForm.reset();
    if (quoteForm) quoteForm.dataset.editingId = '';
    if (submitQuoteButton) submitQuoteButton.textContent = 'Add Quote';
    if (quoteIdDisplayGroup) quoteIdDisplayGroup.classList.add('hidden');
    if (quoteIdDisplay) quoteIdDisplay.textContent = '';
    if (quoteNetAmountInput) quoteNetAmountInput.value = ''; // Clear calculated net amount
    if (quoteIsFinalCheckbox) quoteIsFinalCheckbox.checked = false;

    // Reset customer dropdown for quote form (auto-filled from opportunity, so just show placeholder)
    if (quoteCustomerSelect) {
        quoteCustomerSelect.innerHTML = '<option value="">Auto-filled from Opportunity</option>';
        quoteCustomerSelect.setAttribute('disabled', 'disabled');
    }
}


/* --- USERS CRUD OPERATIONS --- */

// Save (Add/Update) a User
// This function now enforces Firestore document IDs to match Firebase Auth UIDs for user profiles.
async function saveUser(userData, existingFirestoreDocId = null) {
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage users.", () => {});
        return;
    }

    // Gmail email validation for userName (which is the email they log in with)
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(userData.userName)) {
        showModal("Validation Error", "User Name (Email) must be a valid Gmail email address.", () => {});
        return;
    }

    // Explicit validation for all mandatory fields
    const mandatoryFields = [
        { field: userData.firstName.trim(), name: "First Name" },
        { field: userData.lastName.trim(), name: "Last Name" },
        { field: userData.email.trim(), name: "Contact Email" },
        { field: userData.phone.trim(), name: "Phone" },
        { field: userData.role.trim(), name: "Role" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field) {
            missingFields.push(item.name);
        }
    });

    // Skills field check (after trimming and filtering empty strings from comma-separated input)
    // The skills input value is `userData.skills` (a string), which is converted to an array inside this function.
    // So, we need to check if the *resultant array* has any valid skills.
    const processedSkills = userData.skills.split(',').map(s => s.trim()).filter(s => s !== '');
    if (processedSkills.length === 0) {
        missingFields.push("Skills");
    }
    userData.skills = processedSkills; // Update userData.skills to the processed array for saving


    if (missingFields.length > 0) {
        const message = `Please fill in all mandatory fields: ${[...new Set(missingFields)].join(', ')}.`; // Use Set to remove duplicates
        showModal("Validation Error", message, () => {});
        return;
    }

    // --- NEW LOGIC FOR profileAccess BASED ON ROLE ---
    userData.profileAccess = (userData.role === 'Admin'); // Set to true if Admin, false otherwise

    const collectionPath = `users_data`; // Dedicated collection for users

    try {
        let targetDocRef;
        let targetUid;

        if (existingFirestoreDocId) {
            // CASE 1: EDITING AN EXISTING USER
            // The Firestore document ID is already known and provided (it should be the user's UID).
            targetDocRef = doc(db, collectionPath, existingFirestoreDocId);
            await updateDoc(targetDocRef, userData);
            console.log("User updated:", existingFirestoreDocId);
            showModal("Success", "User profile updated successfully!", () => {});
        } else {
            // CASE 2: ADDING A NEW USER PROFILE
            // For new user profiles, the admin MUST provide the Firebase Auth UID.
            // This assumes the user has been created in Firebase Auth already.
            if (!userIdDisplayInput) {
                 showModal("Internal Error", "User ID input field not found for new user creation.", () => {});
                 return;
            }
            targetUid = userIdDisplayInput.value.trim();


            if (!targetUid) {
                showModal("Validation Error", "For new user profiles, you must provide the Firebase User ID (UID). This user should first be created in Firebase Authentication.", () => {});
                if (userIdDisplayInput) userIdDisplayInput.focus();
                return;
            }

            // Check if a user profile with this UID already exists
            const existingProfileSnap = await getDoc(doc(db, collectionPath, targetUid));
            if (existingProfileSnap.exists()) {
                showModal("Creation Error", "A user profile with this UID already exists. Please edit the existing profile or provide a unique UID for a new user.", () => {});
                return;
            }

            // You might want to add more robust UID format validation here if needed
            // e.g., if (targetUid.length < 28 || !/^[a-zA-Z0-9]+$/.test(targetUid)) { ... }

            targetDocRef = doc(db, collectionPath, targetUid); // Use the provided UID as the document ID
            await setDoc(targetDocRef, { ...userData, userId: targetUid }); // Store UID also as userId field
            console.log("New user profile created. Doc ID is provided UID:", targetUid);
            showModal("Success", "New user profile created successfully!", () => {});
        }

        resetUserForm(); // Reset form after successful operation
    } catch (error) {
        console.error("Error saving user:", error);
        showModal("Error", `Failed to save user: ${error.message}`, () => {});
    }
}

// Delete a User
async function deleteUser(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage users.", () => {});
        return;
    }

    const collectionPath = `users_data`;
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this user? This action cannot be undone.",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("User deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "User profile deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting user:", error);
                showModal("Error", `Failed to delete user: ${error.message}`, () => {});
            }
        }
    );
}

// Listen for real-time updates to Users
function listenForUsers() {
    if (!isAuthReady || !currentUserId || !isAdmin) {
        if (userList) userList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Access Denied: Only administrators can view users.</p>';
        return;
    }

    if (unsubscribeUsers) {
        unsubscribeUsers(); // Unsubscribe from previous listener
    }

    const collectionPath = `users_data`;
    const q = collection(db, collectionPath);

    unsubscribeUsers = onSnapshot(q, (snapshot) => {
        if (userList) userList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            if (userList) userList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No users found. Add one above by providing their Firebase UID after creating them in Firebase Authentication!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const user = { id: doc.id, ...doc.data() }; // doc.id is Firestore's internal ID
            displayUser(user);
        });
    }, (error) => {
        console.error("Error listening to users:", error);
        if (userList) userList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading users: ${error.message}</p>`;
    });
}

// Display a single user in the UI as a grid row
function displayUser(user) {
    if (!userList) return; // Defensive check
    const userRow = document.createElement('div');
    userRow.className = 'data-grid-row'; // Removed grid-cols, CSS handles this now
    userRow.dataset.id = user.id; // Store Firestore document ID for edit/delete actions

    const displayUid = user.id || 'N/A'; // Use Firestore doc ID for display, which should be the UID

    userRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${displayUid}</div>
        <div class="px-2 py-1 truncate">${user.userName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${user.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${user.role || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${Array.isArray(user.skills) ? user.skills.join(', ') : user.skills || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${user.id}">Edit</button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${user.id}">Delete</button>
        </div>
    `;
    userList.appendChild(userRow);

    // Add event listeners for edit and delete buttons
    userRow.querySelector('.edit-btn').addEventListener('click', () => editUser(user));
    userRow.querySelector('.delete-btn').addEventListener('click', () => deleteUser(user.id));
}

// Populate form for editing a user
function editUser(user) {
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can edit users.", () => {});
        return;
    }
    if (userFormTitle) userFormTitle.textContent = 'Edit User Profile'; // Clarified title
    if (submitUserButton) submitUserButton.textContent = 'Update User Profile'; // Clarified button text

    if (userIdDisplayGroup) userIdDisplayGroup.classList.remove('hidden'); // Show UID group
    if (userIdDisplayInput) {
        userIdDisplayInput.value = user.id || 'N/A'; // Display the Firestore Doc ID (which is the UID)
        userIdDisplayInput.setAttribute('readonly', 'readonly'); // Make it read-only when editing
        userIdDisplayInput.classList.add('bg-gray-100'); // Add a class for visual indication of readonly
    }

    if (userNameInput) userNameInput.value = user.userName || '';
    if (userFirstNameInput) userFirstNameInput.value = user.firstName || '';
    if (userLastNameInput) userLastNameInput.value = user.lastName || '';
    if (userEmailInput) userEmailInput.value = user.email || '';
    if (userPhoneInput) userPhoneInput.value = user.phone || '';
    if (userRoleSelect) userRoleSelect.value = user.role || ''; // Set value for select
    if (userSkillsInput) userSkillsInput.value = Array.isArray(user.skills) ? user.skills.join(', ') : user.skills || ''; // Convert array back to string

    if (userForm) userForm.dataset.editingId = user.id; // Store Firestore document ID for update
    if (userForm) userForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset User form function
function resetUserForm() {
    if (userForm) userForm.reset();
    if (userForm) userForm.dataset.editingId = '';
    if (userFormTitle) userFormTitle.textContent = 'Add New User Profile';
    if (submitUserButton) submitUserButton.textContent = 'Create User Profile';

    if (userIdDisplayGroup) userIdDisplayGroup.classList.remove('hidden'); // Show UID group when adding new
    if (userIdDisplayInput) {
        userIdDisplayInput.value = ''; // Clear UID input
        userIdDisplayInput.removeAttribute('readonly'); // Make it editable for new user profile
        userIdDisplayInput.classList.remove('bg-gray-100'); // Remove readonly visual class
        userIdDisplayInput.focus(); // Focus on the UID input for new user profile
    }
    if (userRoleSelect) userRoleSelect.value = 'User'; // Default role for new user profiles
}

// --- Accordion Logic (UPDATED for dynamic panel sizing) ---
function areAllAccordionsClosed() {
    // Select all accordion content elements within the linkedObjectsAccordion
    const accordionContents = document.querySelectorAll('#linkedObjectsAccordion .accordion-content');
    for (const content of accordionContents) {
        if (content.classList.contains('open')) {
            return false; // Found an open accordion
        }
    }
    return true; // All accordions are closed
}

function toggleAccordion(header, content) {
    if (!content || !header) return; // Defensive check

    // If the clicked accordion is already open, close it
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        content.style.maxHeight = null; // Clear maxHeight
        content.style.opacity = '0'; // Fade out
        content.style.transform = 'translateY(-10px)'; // Move up as it hides
        header.classList.remove('active');

        // After closing, check if ALL accordions are now closed. If so, revert layout.
        if (areAllAccordionsClosed() && currentOpportunityId) { // Only revert if an opportunity is being edited
            setOpportunityLayout('edit_split_70_30');
        }
    } else {
        // Close all other accordions first
        closeAllAccordions();

        // Open the clicked accordion
        content.classList.add('open');
        // Instantly set height to auto (or a very large max-height) to show all content
        content.style.maxHeight = '5000px'; // Use a large fixed max-height to ensure content is visible
        content.style.opacity = '1'; // Fade in
        content.style.transform = 'translateY(0)'; // Move to normal position

        header.classList.add('active');

        // When any accordion opens, set the layout to shrink the left panel and expand the right
        if (currentOpportunityId && window.innerWidth >= 768) { // Only change layout on desktop and if editing
            setOpportunityLayout('edit_split_30_70');
        }
        // Scroll the accordion header into view, considering the new layout
        header.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function closeAllAccordions() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.classList.remove('active');
        const content = header.nextElementSibling;
        if (content) {
            content.classList.remove('open');
            content.style.maxHeight = null; // Clear maxHeight
            content.style.opacity = '0'; // Fade out
            content.style.transform = 'translateY(-10px)'; // Move up as it hides
        }
    });
}

/* --- ADMIN CURRENCY MANAGEMENT (NEW) --- */

async function saveCurrency(currencyData, existingCurrencyCode = null) {
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage currencies.", () => {});
        return;
    }

    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden'); // Hide previous messages
    if (submitCurrencyButton) {
        submitCurrencyButton.disabled = true;
        submitCurrencyButton.textContent = 'Uploading...';
    }


    const inputCsv = adminCurrenciesInput.value.trim();
    const currencyLines = inputCsv.split('\n').filter(line => line.trim() !== ''); // Filter out empty lines

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

    // Corrected collection reference for currencies data
    const currenciesCollectionRef = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");

    try {
        let updatesPerformed = 0;
        let errorsOccurred = 0;
        let totalProcessed = 0;

        for (const line of currencyLines) {
            totalProcessed++;
            const parts = line.split(',');

            // Explicitly get each part and ensure it's a string, defaulting to empty if not present.
            // This prevents `undefined` values from reaching Firestore functions expecting strings.
            const code = parts[0] ? parts[0].trim() : '';
            const currencyName = parts[1] ? parts[1].trim() : '';
            const symbol = parts[2] ? parts[2].trim() : '';
            const symbol_native = parts[3] ? parts[3].trim() : '';

            // Now, check for mandatory fields being empty after trimming
            if (code === '' || currencyName === '' || symbol === '' || symbol_native === '') {
                console.error(`Skipping invalid line (missing data for essential fields): '${line}'`);
                errorsOccurred++;
                continue;
            }

            // If editing a specific currency, ensure the code matches
            if (existingCurrencyCode && code !== existingCurrencyCode) {
                showModal("Validation Error", `When editing, the currency code in the input CSV (${code}) must match the currency being edited (${existingCurrencyCode}). Please provide only one line for the edited currency.`, () => {});
                if (submitCurrencyButton) {
                    submitCurrencyButton.disabled = false;
                    submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
                }
                return; // Stop processing and exit
            }


            const currencyDataToSave = {
                currencyCode: code, // Storing code inside the document too, though doc ID is also the code
                currencyName: currencyName,
                symbol: symbol,
                symbol_native: symbol_native
            };

            // CORRECTED: Use doc(collectionRef, documentId)
            const currencyDocRef = doc(currenciesCollectionRef, code); // Pass the collection reference directly

            await setDoc(currencyDocRef, currencyDataToSave, { merge: true }); // Use setDoc with merge to create or update
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
        console.log("Admin currency data upload process finished.");

        await fetchCurrencies(); // Re-fetch all currencies to update the global array
        populateCurrencySelect(); // Update opportunity form dropdown
        resetCurrencyForm();
    } catch (error) {
        console.error("Error uploading currency data (caught in try-catch):", error);
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


async function deleteCurrency(currencyCode) {
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage currencies.", () => {});
        return;
    }

    showModal(
        "Confirm Deletion",
        `Are you sure you want to delete the currency '${currencyCode}'? This action cannot be undone.`,
        async () => {
            try {
                // Corrected doc reference for `app_settings`
                const currencyDocRef = doc(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data", currencyCode);
                await deleteDoc(currencyDocRef);
                console.log("Currency deleted:", currencyCode);
                showModal("Success", `Currency '${currencyCode}' deleted successfully!`, () => {});
                await fetchCurrencies(); // Re-fetch to update allCurrencies array
                populateCurrencySelect(); // Update opportunity form dropdown
            } catch (error) {
                console.error("Error deleting currency:", error);
                showModal("Error", `Failed to delete currency: ${error.message}`, () => {});
            }
        }
    );
}

function listenForCurrencies() {
    if (unsubscribeCurrencies) {
        unsubscribeCurrencies(); // Unsubscribe from previous listener
    }

    if (!isAuthReady || !currentUserId || !isAdmin) {
        if (currencyList) currencyList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Access Denied: Only administrators can view currencies.</p>';
        return;
    }

    // Corrected collection reference to include a document ID for `app_settings`
    const q = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");

    unsubscribeCurrencies = onSnapshot(q, (snapshot) => {
        if (currencyList) currencyList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            if (currencyList) currencyList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No currencies found. Add them above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const currency = { id: doc.id, ...doc.data() }; // doc.id is the currencyCode
            displayCurrency(currency);
        });
    }, (error) => {
        console.error("Error listening to currencies:", error);
        if (currencyList) currencyList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading currencies: ${error.message}</p>`;
    });
}

function displayCurrency(currency) {
    if (!currencyList) return; // Defensive check
    const currencyRow = document.createElement('div');
    currencyRow.className = 'data-grid-row'; // Removed grid-cols, CSS handles this now
    currencyRow.dataset.id = currency.id; // currency code is the Firestore doc ID

    currencyRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${currency.id || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currency.currencyName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currency.symbol || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currency.symbol_native || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${currency.id}">Edit</button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${currency.id}">Delete</button>
        </div>
    `;
    currencyList.appendChild(currencyRow);

    currencyRow.querySelector('.edit-btn').addEventListener('click', () => editCurrency(currency));
    currencyRow.querySelector('.delete-btn').addEventListener('click', () => deleteCurrency(currency.id));
}

function editCurrency(currency) {
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can edit currencies.", () => {});
        return;
    }
    if (currencyFormTitle) currencyFormTitle.textContent = `Edit Currency: ${currency.id}`;
    if (submitCurrencyButton) submitCurrencyButton.textContent = 'Update Currency';

    if (currencyCodeDisplayGroup) currencyCodeDisplayGroup.classList.remove('hidden');
    if (currencyCodeDisplay) currencyCodeDisplay.textContent = currency.id; // Display the code

    // Pre-fill the textarea with the CSV for this specific currency
    if (adminCurrenciesInput) adminCurrenciesInput.value = `${currency.id},${currency.currencyName || ''},${currency.symbol || ''},${currency.symbol_native || ''}`;

    if (currencyForm) currencyForm.dataset.editingId = currency.id; // Store the currency code for updating
    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden'); // Clear any previous messages
    if (currencyForm) currencyForm.scrollIntoView({ behavior: 'smooth' });
}

function resetCurrencyForm() {
    if (currencyForm) currencyForm.reset();
    if (currencyForm) currencyForm.dataset.editingId = '';
    if (currencyFormTitle) currencyFormTitle.textContent = 'Add New Currency';
    if (submitCurrencyButton) submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
    if (currencyCodeDisplayGroup) currencyCodeDisplayGroup.classList.add('hidden');
    if (currencyCodeDisplay) currencyCodeDisplay.textContent = '';
    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden'); // Clear messages
}


// Initialize Firebase on window load
window.onload = initializeFirebase;
