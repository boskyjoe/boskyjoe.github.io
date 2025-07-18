// Part 1: Firebase Imports, Configuration, and Global Variable Declarations

// Firebase imports for ES Modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInWithCustomToken, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs, onSnapshot, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Firebase configuration: Using the exact configuration provided by the user
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebasestorage.app",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

// The appId from firebaseConfig is sufficient as collections are top-level, not nested under artifacts/appId/
const appId = firebaseConfig.appId;


// Environment variable for initial auth token (if available)
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase App and Services (initialized in setupAuth)
let app;
let db;
let auth;
let userId = null; // Will be set after authentication
let userRole = 'guest'; // Default role
let currentOpportunityId = null; // To track the opportunity being edited

// Global cache for price books to enable filtering without re-fetching
let allPriceBooks = [];

// Declare DOM elements globally, but assign them inside initializePage
// This ensures they are found after the DOM is fully loaded.
let authSection;
let dashboardSection;
let customersSection;
let leadsSection;
let opportunitiesSection;
let quotesSection; // NEW: Quotes Section
let countriesSection;
let currenciesSection;
let priceBooksSection;

let navDashboard;
let navCustomers;
let navLeads;
let navOpportunities;
let navQuotes; // NEW: Quotes Navigation
let navCountries;
let navCurrencies;
let navPriceBooks;
let navLogout;
let adminMenuItem;

let googleSignInBtn;
let authStatus;
let userDisplayName;
let userIdDisplay;
let userRoleDisplay;
let authErrorMessage;

let dashboardTotalCustomers;
let dashboardTotalOpportunities;
let dashboardOpenOpportunities;
let dashboardWonOpportunities;

let addCustomerBtn;
let customerFormContainer;
let customerForm;
let cancelCustomerBtn;
let customersGridContainer;
let noCustomersMessage;
let customerSearchInput;
let customersGrid; // Grid.js instance

let addLeadBtn;
let leadFormContainer;
let leadForm;
let cancelLeadBtn;
let leadsGridContainer;
let noLeadsMessage;
let leadSearchInput;
let leadsGrid; // Grid.js instance

let addOpportunityBtn;
let opportunityFormContainer;
let opportunityForm;
let cancelOpportunityBtn;
let opportunitiesGridContainer;
let noOpportunitiesMessage;
let opportunitySearchInput;
let opportunitiesGrid; // Grid.js instance

let workLogsSectionContainer; // New: Container for work logs list and add button
let addWorkLogEntryBtn;
let workLogFormContainer;
let workLogForm;
let cancelWorkLogBtn;
let workLogsList;
let noWorkLogsMessage;
let workLogTypeSelect; // Added for easy access

let addQuoteBtn; // NEW: Quotes
let quoteFormContainer; // NEW: Quotes
let quoteForm; // NEW: Quotes
let cancelQuoteBtn; // NEW: Quotes
let quotesGridContainer; // NEW: Quotes
let noQuotesMessage; // NEW: Quotes
let quoteSearchInput; // NEW: Quotes
let quotesGrid; // NEW: Quotes.js instance
let quoteOpportunitySelect; // NEW: Quotes - Opportunity dropdown
let customerContactNameInput; // NEW: Quotes - Auto-filled
let customerPhoneInput; // NEW: Quotes - Auto-filled
let customerEmailInput; // NEW: Quotes - Auto-filled
let customerAddressInput; // NEW: Quotes - Auto-filled
let quoteStatusSelect; // NEW: Quotes - Status dropdown


let addCountryBtn;
let countryFormContainer;
let countryForm;
let cancelCountryBtn;
let countriesGridContainer;
let noCountriesMessage;
let countrySearchInput;
let countriesGrid;

let addCurrencyBtn;
let currencyFormContainer;
let currencyForm;
let cancelCurrencyBtn;
let currenciesGridContainer;
let noCurrenciesMessage;
let currencySearchInput;
let currenciesGrid;

let addPriceBookBtn;
let priceBookFormContainer;
let priceBookForm;
let cancelPriceBookBtn;
let priceBooksGridContainer;
let noPriceBooksMessage;
let priceBookSearchInput;
let priceBooksGrid;

let messageBox;
let messageContent;
let messageConfirmBtn;
let messageCancelBtn;

let opportunityCurrencySelect; // Added for easy access
let opportunityPriceBookSelect; // Added for easy access
let opportunityServicesInterestedSelect; // For Opportunities: multi-select
let leadServicesInterestedSelect; // NEW: For Leads: multi-select

// Part 2: Message Box, Authentication, and Dashboard Logic

/**
 * Shows a custom message box (modal).
 * @param {string} message - The message to display.
 * @param {boolean} isConfirm - If true, shows Confirm/Cancel buttons. If false, shows only an OK button.
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled/OK.
 */
function showMessageBox(message, isConfirm = false) {
    return new Promise((resolve) => {
        // Ensure messageBox and its children are available
        if (!messageBox || !messageContent || !messageConfirmBtn || !messageCancelBtn) {
            console.error("Message box elements not found. Cannot display message.");
            // Fallback to console log if elements is missing
            console.log(`Message: ${message} (isConfirm: ${isConfirm})`);
            resolve(false); // Assume cancellation if message box can't be shown
            return;
        }

        messageContent.textContent = message;
        messageConfirmBtn.classList.toggle('hidden', !isConfirm);
        messageCancelBtn.textContent = isConfirm ? 'Cancel' : 'OK';

        messageBox.classList.remove('hidden');

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
    });
}

/**
 * Displays a specific section and hides all others.
 * @param {HTMLElement} sectionToShow - The section to make visible.
 */
function showSection(sectionToShow) {
    const sections = [
        authSection, dashboardSection, customersSection, leadsSection,
        opportunitiesSection, quotesSection, countriesSection, currenciesSection, priceBooksSection // NEW: quotesSection
    ];
    sections.forEach(section => {
        if (section) { // Ensure the section element exists
            section.classList.add('hidden');
        }
    });
    if (sectionToShow) {
        sectionToShow.classList.remove('hidden');
    }
}

/**
 * Sets up the authentication state listener and handles UI updates.
 */
async function setupAuth() {
    // Initialize Firebase if not already initialized
    if (!app) {
        // Use the hardcoded firebaseConfig directly
        if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.apiKey) {
            console.error("Firebase config is empty or invalid. Cannot initialize Firebase.");
            if (authErrorMessage) {
                authErrorMessage.textContent = "Firebase is not configured. Please check your firebaseConfig.";
                authErrorMessage.classList.remove('hidden');
            }
            return;
        }
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            console.log("Firebase initialized.");
        } catch (error) {
            console.error("Error initializing Firebase:", error);
            if (authErrorMessage) {
                authErrorMessage.textContent = `Error initializing Firebase: ${error.message}`;
                authErrorMessage.classList.remove('hidden');
            }
            return;
        }
    }

    // Check for existing auth state first
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            if (userDisplayName) userDisplayName.textContent = user.displayName || 'Guest';
            if (userIdDisplay) userIdDisplay.textContent = `(ID: ${userId.substring(0, 8)}...)`; // Display first 8 chars of UID
            if (navLogout) navLogout.classList.remove('hidden');
            if (authSection) authSection.classList.add('hidden');

            // Determine user role (e.g., based on a 'users_data' collection or claims)
            // Fetch user role from 'users_data' collection
            try {
                // User data is stored in a top-level collection, as per rules
                const userDocRef = doc(db, 'users_data', userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    userRole = userDocSnap.data().role || 'Standard';
                } else {
                    // If user data doesn't exist, create it (for new Google sign-ins)
                    // Default to 'Standard' role for new users
                    userRole = 'Standard';
                    await setDoc(userDocRef, {
                        displayName: user.displayName || 'New User',
                        email: user.email || '',
                        role: userRole,
                        createdAt: serverTimestamp(),
                        lastLogin: serverTimestamp()
                    }, { merge: true }); // Use merge to avoid overwriting existing fields if any
                    console.log(`New user data created for ${user.email} with role ${userRole}`);
                }
            } catch (error) {
                console.error("Error fetching/setting user role:", error);
                userRole = 'guest'; // Fallback to guest if there's an error
            }

            if (userRoleDisplay) userRoleDisplay.textContent = `(${userRole})`;

            if (adminMenuItem) {
                if (userRole === 'Admin') { // Check for 'Admin' role as per rules
                    adminMenuItem.classList.remove('hidden');
                } else {
                    adminMenuItem.classList.add('hidden');
                }
            }

            console.log(`User ${user.uid} (${userRole}) is signed in.`);
            showSection(dashboardSection); // Show dashboard after successful login
            await updateDashboard();
        } else {
            // No user is signed in. Attempt custom token login (for Canvas) or show Google Sign-In.
            userId = null;
            userRole = 'guest';
            if (userDisplayName) userDisplayName.textContent = 'Guest';
            if (userIdDisplay) userId.textContent = '';
            if (userRoleDisplay) userRoleDisplay.textContent = '';
            if (navLogout) navLogout.classList.add('hidden');
            if (adminMenuItem) adminMenuItem.classList.add('hidden');

            if (initialAuthToken) {
                try {
                    await signInWithCustomToken(auth, initialAuthToken);
                    console.log("Attempted sign-in with custom token.");
                    // onAuthStateChanged will be triggered again if successful
                } catch (error) {
                    console.error("Error signing in with custom token:", error);
                    if (authErrorMessage) {
                        authErrorMessage.textContent = `Authentication failed: ${error.message}. Please sign in with Google.`;
                        authErrorMessage.classList.remove('hidden');
                    }
                    showSection(authSection); // Show auth section if custom token fails
                }
            } else {
                // No custom token, show Google Sign-In
                console.log("No custom token, prompting Google Sign-In.");
                showSection(authSection);
            }
        }
    });
}

/**
 * Handles Google Sign-In.
 */
async function handleGoogleSignIn() {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error during Google Sign-In:", error);
        if (authErrorMessage) {
            authErrorMessage.textContent = `Google Sign-In failed: ${error.message}`;
            authErrorMessage.classList.remove('hidden');
        }
    }
}

/**
 * Handles user logout.
 */
async function handleLogout() {
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
        showMessageBox("You have been signed out.", false);
    } catch (error) {
        console.error("Error during logout:", error);
        showMessageBox(`Error signing out: ${error.message}`, false);
    }
}

/**
 * Updates dashboard statistics.
 */
async function updateDashboard() {
    if (!db || !userId) return;

    try {
        // Customers are top-level, filtered by creatorId
        const customersRef = collection(db, 'customers');
        // Opportunities are top-level, filtered by creatorId
        const opportunitiesRef = collection(db, 'opportunities');
        // Quotes are top-level, filtered by creatorId for standard users, all for admin (handled by rules)
        const quotesRef = collection(db, 'quotes');


        const totalCustomersQuery = query(customersRef, where('creatorId', '==', userId));
        const totalCustomersSnap = await getDocs(totalCustomersQuery);
        if (dashboardTotalCustomers) dashboardTotalCustomers.textContent = totalCustomersSnap.size;

        const totalOpportunitiesQuery = query(opportunitiesRef, where('creatorId', '==', userId));
        const totalOpportunitiesSnap = await getDocs(totalOpportunitiesQuery);
        if (dashboardTotalOpportunities) dashboardTotalOpportunities.textContent = totalOpportunitiesSnap.size;

        const openOpportunitiesQuery = query(opportunitiesRef,
            where('creatorId', '==', userId),
            where('salesStage', 'in', ['Prospect', 'Qualification', 'Proposal', 'Negotiation'])
        );
        const openOpportunitiesSnap = await getDocs(openOpportunitiesQuery);
        if (dashboardOpenOpportunities) dashboardOpenOpportunities.textContent = openOpportunitiesSnap.size;

        const wonOpportunitiesQuery = query(opportunitiesRef,
            where('creatorId', '==', userId),
            where('salesStage', '==', 'Won')
        );
        const wonOpportunitiesSnap = await getDocs(wonOpportunitiesQuery);
        if (dashboardWonOpportunities) dashboardWonOpportunities.textContent = wonOpportunitiesSnap.size;

    } catch (error) {
        console.error("Error updating dashboard:", error);
        showMessageBox(`Error loading dashboard data: ${error.message}`, false);
    }
}

// Part 3: Accordion Logic, Form Visibility Functions, and Data Helpers

// --- Accordion Logic ---
function setupAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    console.log('setupAccordions: querySelectorAll found', accordionHeaders.length, 'accordion headers.');
    accordionHeaders.forEach(header => {
        // Remove existing listener to prevent duplicates if called multiple times
        header.removeEventListener('click', toggleAccordion);
        header.addEventListener('click', toggleAccordion);
    });
}

function toggleAccordion(event) {
    const header = event.currentTarget;
    const content = header.nextElementSibling;
    const icon = header.querySelector('.accordion-icon');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        // Only apply transform for SVG icons, as per HTML structure
        if (icon && icon.tagName === 'SVG') {
            icon.style.transform = 'rotate(180deg)';
        }
        header.classList.add('expanded');
    } else {
        content.classList.add('hidden');
        // Only apply transform for SVG icons, as per HTML structure
        if (icon && icon.tagName === 'SVG') {
            icon.style.transform = 'rotate(0deg)';
        }
        header.classList.remove('expanded');
    }
}

// --- Form Visibility Functions ---
function showCustomerForm() {
    if (customerFormContainer) customerFormContainer.classList.remove('hidden');
}

function hideCustomerForm() {
    if (customerFormContainer) customerFormContainer.classList.add('hidden');
    if (customerForm) customerForm.reset(); // Clear form fields
    const customerIdInput = document.getElementById('customer-id');
    if (customerIdInput) customerIdInput.value = ''; // Clear hidden ID
    const customerFormMessage = document.getElementById('customer-form-message');
    if (customerFormMessage) customerFormMessage.classList.add('hidden');
}

function showLeadForm() {
    if (leadFormContainer) leadFormContainer.classList.remove('hidden');
}

function hideLeadForm() {
    if (leadFormContainer) leadFormContainer.classList.add('hidden');
    if (leadForm) leadForm.reset();
    const leadIdInput = document.getElementById('lead-id');
    if (leadIdInput) leadIdInput.value = '';
    const leadFormMessage = document.getElementById('lead-form-message');
    if (leadFormMessage) leadFormMessage.classList.add('hidden');
}

/**
 * Shows the Opportunity form and sets the initial state of its accordions.
 * This function should NOT manipulate the work logs section visibility directly.
 * That is handled by setupOpportunityForm based on whether it's a new or existing opportunity.
 */
function showOpportunityForm() {
    // Show the main opportunity form container
    if (opportunityFormContainer) opportunityFormContainer.classList.remove('hidden');

    console.log('showOpportunityForm: Setting initial accordion states for opportunity form.');

    // Get the Main Details accordion elements within the opportunity form
    const mainDetailsAccordionHeader = document.querySelector('#opportunity-form-container .accordion-item .accordion-header');
    const mainDetailsAccordionContent = mainDetailsAccordionHeader ? mainDetailsAccordionHeader.nextElementSibling : null;
    const mainDetailsIcon = mainDetailsAccordionHeader ? mainDetailsAccordionHeader.querySelector('.accordion-icon') : null;

    // Ensure Main Details accordion is OPEN
    if (mainDetailsAccordionContent) {
        mainDetailsAccordionContent.classList.remove('hidden');
        if (mainDetailsIcon) {
            mainDetailsIcon.style.transform = 'rotate(180deg)'; // Up arrow
        }
        if (mainDetailsAccordionHeader) {
            mainDetailsAccordionHeader.classList.add('expanded');
        }
        console.log('  Main Details Accordion: Opened.');
    } else {
        console.error('  Could not find Main Details accordion elements within opportunity form.');
    }

    // Note: This function no longer attempts to manipulate the work logs accordion.
    // The visibility and state of the work logs section are managed by setupOpportunityForm
    // and handleSaveOpportunity based on whether an opportunity is new or existing.
}

function hideOpportunityForm() {
    if (opportunityFormContainer) opportunityFormContainer.classList.add('hidden');
    if (opportunityForm) opportunityForm.reset();
    const opportunityIdInput = document.getElementById('opportunity-id');
    if (opportunityIdInput) opportunityIdInput.value = '';
    const opportunityFormMessage = document.getElementById('opportunity-form-message');
    if (opportunityFormMessage) opportunityFormMessage.classList.add('hidden');
    currentOpportunityId = null; // Reset current opportunity being edited
    if (workLogsList) workLogsList.innerHTML = ''; // Clear work logs
    if (noWorkLogsMessage) noWorkLogsMessage.classList.remove('hidden'); // Show no work logs message
    hideWorkLogForm(); // Hide work log entry form
    // Also hide the work logs section container when opportunity form is hidden
    if (workLogsSectionContainer) workLogsSectionContainer.classList.add('hidden');
}

/**
 * Sets up the Work Log form, populating the Type dropdown.
 * @param {Object|null} workLog - The work log data to pre-fill the form, or null for a new entry.
 */
async function setupWorkLogForm(workLog = null) {
    // Populate Work Log Type (hardcoded options for now)
    const workLogTypes = [
        { id: 'Call', name: 'Call' },
        { id: 'Email', name: 'Email' },
        { id: 'Meeting', name: 'Meeting' },
        { id: 'Site Visit', name: 'Site Visit' },
        { id: 'Proposal Sent', name: 'Proposal Sent' },
        { id: 'Follow-up', name: 'Follow-up' },
        { id: 'Other', name: 'Other' }
    ];
    populateSelect(workLogTypeSelect, workLogTypes, 'id', 'name', 'Select Type');

    if (workLog) {
        document.getElementById('work-log-id').value = workLog.id;
        document.getElementById('work-log-opportunity-id').value = workLog.opportunityId;
        const logDate = workLog.date ? new Date(workLog.date.seconds * 1000).toISOString().split('T')[0] : '';
        document.getElementById('work-log-date').value = logDate;
        workLogTypeSelect.value = workLog.type || '';
        document.getElementById('work-log-details').value = workLog.details || '';
    } else {
        if (workLogForm) workLogForm.reset();
        const workLogIdInput = document.getElementById('work-log-id');
        if (workLogIdInput) workLogIdInput.value = '';
        const workLogOpportunityIdInput = document.getElementById('work-log-opportunity-id');
        if (workLogOpportunityIdInput) workLogOpportunityIdInput.value = currentOpportunityId || ''; // Ensure opportunity ID is set for new logs
    }
    showWorkLogForm();
}

function showWorkLogForm() { // Made this function explicitly separate for clarity and global access
    if (workLogFormContainer) workLogFormContainer.classList.remove('hidden');
}

function hideWorkLogForm() {
    if (workLogFormContainer) workLogFormContainer.classList.add('hidden');
    if (workLogForm) workLogForm.reset();
    const workLogIdInput = document.getElementById('work-log-id');
    if (workLogIdInput) workLogIdInput.value = '';
    const workLogOpportunityIdInput = document.getElementById('work-log-opportunity-id');
    if (workLogOpportunityIdInput) workLogOpportunityIdInput.value = '';
    const workLogFormMessage = document.getElementById('work-log-form-message');
    if (workLogFormMessage) workLogFormMessage.classList.add('hidden');
}

// NEW: Quote Form Visibility Functions
function showQuoteForm() {
    if (quoteFormContainer) quoteFormContainer.classList.remove('hidden');
}

function hideQuoteForm() {
    if (quoteFormContainer) quoteFormContainer.classList.add('hidden');
    if (quoteForm) quoteForm.reset();
    const quoteIdInput = document.getElementById('quote-id');
    if (quoteIdInput) quoteIdInput.value = '';
    const quoteFormMessage = document.getElementById('quote-form-message');
    if (quoteFormMessage) quoteFormMessage.classList.add('hidden');
    // Clear auto-filled fields
    if (customerContactNameInput) customerContactNameInput.value = '';
    if (customerPhoneInput) customerPhoneInput.value = '';
    if (customerEmailInput) customerEmailInput.value = '';
    if (customerAddressInput) customerAddressInput.value = '';
}


function showCountryForm() {
    if (countryFormContainer) countryFormContainer.classList.remove('hidden');
}

function hideCountryForm() {
    if (countryFormContainer) countryFormContainer.classList.add('hidden');
    if (countryForm) countryForm.reset();
    const countryIdInput = document.getElementById('country-id');
    if (countryIdInput) countryIdInput.value = '';
    const countryFormMessage = document.getElementById('country-form-message');
    if (countryFormMessage) countryFormMessage.classList.add('hidden');
}

function showCurrencyForm() {
    if (currencyFormContainer) currencyFormContainer.classList.remove('hidden');
}

function hideCurrencyForm() {
    if (currencyFormContainer) currencyFormContainer.classList.add('hidden');
    if (currencyForm) currencyForm.reset();
    const currencyIdInput = document.getElementById('currency-id');
    if (currencyIdInput) currencyIdInput.value = '';
    const currencyFormMessage = document.getElementById('currency-form-message');
    if (currencyFormMessage) currencyFormMessage.classList.add('hidden');
}

function showPriceBookForm() {
    if (priceBookFormContainer) priceBookFormContainer.classList.remove('hidden');
}

function hidePriceBookForm() {
    if (priceBookFormContainer) priceBookFormContainer.classList.add('hidden');
    if (priceBookForm) priceBookForm.reset();
    const priceBookIdInput = document.getElementById('price-book-id');
    if (priceBookIdInput) priceBookIdInput.value = '';
    const priceBookFormMessage = document.getElementById('price-book-form-message');
    if (priceBookFormMessage) priceBookFormMessage.classList.add('hidden');
}

// --- Data Loading Functions ---

/**
 * Fetches data from a Firestore collection.
 * @param {string} collectionName - The name of the Firestore collection (e.g., 'customers').
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of documents.
 */
async function fetchData(collectionName) {
    if (!db || !userId) {
        console.warn("Firestore or userId not available. Cannot fetch data from:", collectionName);
        return [];
    }
    let collectionRef = collection(db, collectionName);

    try {
        let q;
        // Apply creatorId filter only for user-specific collections as per rules
        // Note: 'users_data' is also top-level but not filtered by creatorId in client-side fetches
        if (['customers', 'leads', 'opportunities'].includes(collectionName)) {
            q = query(collectionRef, where('creatorId', '==', userId));
        } else {
            // For public collections (countries, currencies, priceBooks), no creatorId filter
            q = query(collectionRef);
        }
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return data;
    } catch (error) {
        console.error(`Error fetching data from ${collectionName}:`, error);
        showMessageBox(`Error loading data from ${collectionName}: ${error.message}`, false);
        return [];
    }
}

/**
 * Populates a select element with options from Firestore.
 * @param {HTMLElement} selectElement - The select element to populate.
 * @param {Array<Object>} data - Array of objects with id and name properties.
 * @param {string} valueKey - The key to use for the option's value.
 * @param {string} textKey - The key to use for the option's text.
 * @param {string} defaultOptionText - Optional text for the default/placeholder option.
 */
function populateSelect(selectElement, data, valueKey, textKey, defaultOptionText = 'Select...') {
    if (!selectElement) {
        console.warn("populateSelect: selectElement is null.");
        return;
    }
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        selectElement.appendChild(option);
    });
}

/**
 * Populates a multi-select element with options.
 * @param {HTMLElement} selectElement - The multi-select element to populate.
 * @param {Array<Object>} data - Array of objects with id and name properties.
 * @param {string} valueKey - The key to use for the option's value.
 * @param {string} textKey - The key to use for the option's text.
 * @param {Array<string>} selectedValues - An array of values to pre-select.
 */
function populateMultiSelect(selectElement, data, valueKey, textKey, selectedValues = []) {
    if (!selectElement) {
        console.warn("populateMultiSelect: selectElement is null.");
        return;
    }
    selectElement.innerHTML = ''; // Clear existing options
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        if (selectedValues.includes(item[valueKey])) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

// Part 4: Customer and Lead Logic

// --- Customer Logic ---

async function setupCustomerForm(customer = null) {
    const countries = await fetchData('countries'); // Countries are top-level
    populateSelect(document.getElementById('customer-country'), countries, 'name', 'name', 'Select Country');

    if (customer) {
        document.getElementById('customer-id').value = customer.id;
        document.getElementById('customer-type').value = customer.type || 'Individual';
        document.getElementById('customer-name').value = customer.name || '';
        document.getElementById('customer-email').value = customer.email || '';
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-address').value = customer.address || '';
        document.getElementById('customer-country').value = customer.country || '';
        document.getElementById('customer-contact-method').value = customer.preferredContactMethod || 'Email';
        document.getElementById('customer-industry').value = customer.industry || '';
        document.getElementById('customer-details').value = customer.additionalDetails || '';
        document.getElementById('customer-source').value = customer.source || '';
        document.getElementById('customer-active').checked = customer.active !== undefined ? customer.active : true;
    } else {
        if (customerForm) customerForm.reset();
        const customerIdInput = document.getElementById('customer-id');
        if (customerIdInput) customerIdInput.value = '';
        const customerActiveCheckbox = document.getElementById('customer-active');
        if (customerActiveCheckbox) customerActiveCheckbox.checked = true; // Default to active for new customers
    }
    showCustomerForm();
}

async function handleSaveCustomer(event) {
    event.preventDefault(); // Prevent default form submission
    if (!db || !userId) {
        showMessageBox("Authentication required to save customer.", false);
        return;
    }

    const customerId = document.getElementById('customer-id').value;
    const messageElement = document.getElementById('customer-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    const customerData = {
        type: document.getElementById('customer-type').value,
        name: document.getElementById('customer-name').value,
        email: document.getElementById('customer-email').value,
        phone: document.getElementById('customer-phone').value,
        address: document.getElementById('customer-address').value,
        country: document.getElementById('customer-country').value,
        preferredContactMethod: document.getElementById('customer-contact-method').value,
        industry: document.getElementById('customer-industry').value,
        additionalDetails: document.getElementById('customer-details').value,
        source: document.getElementById('customer-source').value,
        active: document.getElementById('customer-active').checked,
        creatorId: userId, // Added creatorId as per rules
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        const collectionRef = collection(db, 'customers'); // Top-level collection
        if (customerId) {
            // For update, only update updatedAt, not createdAt
            delete customerData.createdAt;
            await updateDoc(doc(collectionRef, customerId), customerData);
            showMessageBox("Customer updated successfully!", false);
        } else {
            await addDoc(collectionRef, customerData);
            showMessageBox("Customer added successfully!", false);
        }
        hideCustomerForm();
        await loadCustomers(); // Reload grid
        await updateDashboard();
    } catch (error) {
        console.error("Error saving customer:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving customer: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}

async function loadCustomers() {
    if (!db || !userId) {
        if (noCustomersMessage) noCustomersMessage.classList.remove('hidden');
        if (customersGrid) customersGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    const customersCollectionRef = collection(db, 'customers'); // Top-level collection

    // Setup real-time listener, query only for current user's customers
    onSnapshot(query(customersCollectionRef, where('creatorId', '==', userId)), snapshot => {
        const customers = [];
        snapshot.forEach(doc => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        renderCustomersGrid(customers);
    }, error => {
        console.error("Error loading customers in real-time:", error);
        showMessageBox(`Error loading customers: ${error.message}`, false);
        if (noCustomersMessage) noCustomersMessage.classList.remove('hidden');
        if (customersGrid) customersGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderCustomersGrid(customers) {
    const data = customers.map(customer => [
        customer.name,
        customer.email,
        customer.phone,
        customer.country,
        customer.active ? 'Yes' : 'No',
        customer.id
    ]);

    if (!customersGrid) {
        if (customersGridContainer) {
            customersGrid = new gridjs.Grid({
                columns: [
                    { name: 'Name', width: '20%' },
                    { name: 'Email', width: '25%' },
                    { name: 'Phone', width: '15%' },
                    { name: 'Country', width: '15%' },
                    { name: 'Active', width: '10%' },
                    {
                        name: 'Actions',
                        width: '15%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editCustomer(row.cells[5].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteCustomer(row.cells[5].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    // MODIFIED: Removed whitespace-nowrap for text wrapping
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(customersGridContainer);
            console.log('Grid.js is now available for customers.'); // Log once when grid is initialized
        } else {
            console.error("customersGridContainer not found, cannot render customers grid.");
        }
    } else {
        customersGrid.updateConfig({ data: data }).forceRender();
    }

    if (noCustomersMessage) {
        if (customers.length === 0) {
            noCustomersMessage.classList.remove('hidden');
        } else {
            noCustomersMessage.classList.add('hidden');
        }
    }
}

async function editCustomer(customerId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, 'customers', customerId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupCustomerForm(docSnap.data());
            const customerIdInput = document.getElementById('customer-id');
            if (customerIdInput) customerIdInput.value = customerId; // Ensure ID is set
        } else {
            showMessageBox("Customer not found!", false);
        }
    } catch (error) {
        console.error("Error editing customer:", error);
        showMessageBox(`Error loading customer for edit: ${error.message}`, false);
    }
}

async function deleteCustomer(customerId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this customer?", true);
    if (!confirmDelete) return;

    if (!db || !userId) return;
    try {
        await deleteDoc(doc(db, 'customers', customerId)); // Top-level collection
        showMessageBox("Customer deleted successfully!", false);
        await loadCustomers(); // Reload grid
        await updateDashboard();
    }
    catch (error) {
        console.error("Error deleting customer:", error);
        showMessageBox(`Error deleting customer: ${error.message}`, false);
    }
}

// --- Lead Logic ---

async function setupLeadForm(lead = null) {
    // Populate Services Interested (example data, replace with Firestore if needed)
    const services = [
        { id: 'Save the Day', name: 'Save the Day' },
        { id: 'Pre-Wedding Photo Shoot', name: 'Pre-Wedding Photo Shoot' },
        { id: 'Wedding', name: 'Wedding' },
        { id: 'Post-Wedding Photo Shoot', name: 'Post-Wedding Photo Shoot' },
        { id: 'Baby Shower', name: 'Baby Shower' },
        { id: 'Corporate Event', name: 'Corporate Event' },
        { id: 'Product Launch', name: 'Product Launch' },
        { id: 'Political Meeting', name: 'Political Meeting' },
        { id: 'Others', name: 'Others' }
    ];

    // Populate Source (example data, replace with Firestore if needed)
    const sources = [
        { id: 'Website', name: 'Website' },
        { id: 'Referral', name: 'Referral' },
        { id: 'Advertisement', name: 'Advertisement' },
        { id: 'Social Media', name: 'Social Media' },
        { id: 'Event', name: 'Event' },
        { id: 'Others', name: 'Others' }
    ];
    populateSelect(document.getElementById('lead-source'), sources, 'id', 'name', 'Select Source');

    if (lead) {
        document.getElementById('lead-id').value = lead.id;
        document.getElementById('lead-contact-name').value = lead.contactName || '';
        document.getElementById('lead-phone').value = lead.phone || '';
        document.getElementById('lead-email').value = lead.email || '';
        // NEW: Populate multi-select for servicesInterested
        const currentServices = Array.isArray(lead.servicesInterested) ? lead.servicesInterested : [];
        populateMultiSelect(leadServicesInterestedSelect, services, 'id', 'name', currentServices);

        // Convert Firestore Timestamp to YYYY-MM-DD string for input type="date"
        const eventDate = lead.eventDate ? new Date(lead.eventDate.seconds * 1000).toISOString().split('T')[0] : '';
        document.getElementById('lead-event-date').value = eventDate;
        document.getElementById('lead-source').value = lead.source || '';
        document.getElementById('lead-additional-details').value = lead.additionalDetails || '';
    } else {
        if (leadForm) leadForm.reset();
        const leadIdInput = document.getElementById('lead-id');
        if (leadIdInput) leadIdInput.value = '';
        // NEW: For new leads, ensure multi-select is reset
        populateMultiSelect(leadServicesInterestedSelect, services, 'id', 'name', []);
    }
    showLeadForm();
}

async function handleSaveLead(event) {
    event.preventDefault(); // Prevent default form submission
    if (!db || !userId) {
        showMessageBox("Authentication required to save lead.", false);
        return;
    }

    const leadId = document.getElementById('lead-id').value;
    const messageElement = document.getElementById('lead-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    // --- Start Client-Side Validation ---
    const requiredFields = leadForm.querySelectorAll('[required]');
    let firstInvalidField = null;

    for (const field of requiredFields) {
        // Special handling for multi-select: check if at least one option is selected
        if (field.tagName === 'SELECT' && field.multiple) {
            const selectedOptions = Array.from(field.options).filter(option => option.selected);
            if (selectedOptions.length === 0) {
                firstInvalidField = field;
                break;
            }
        } else if (!field.value) {
            firstInvalidField = field;
            break;
        }
    }

    if (firstInvalidField) {
        console.warn('Validation failed: Required field is empty.', firstInvalidField);
        firstInvalidField.focus(); // Focus on the invalid field
        messageElement.textContent = `Please fill in the required field: ${firstInvalidField.labels ? firstInvalidField.labels[0].textContent : firstInvalidField.id.replace(/-/g, ' ')}.`;
        messageElement.classList.remove('hidden');
        return; // Stop form submission
    }
    // --- End Client-Side Validation ---

    const eventDateValue = document.getElementById('lead-event-date').value;
    const eventDateTimestamp = eventDateValue ? new Date(eventDateValue) : null;

    // NEW: Capture selected services from multi-select as an array
    const selectedServices = Array.from(leadServicesInterestedSelect.options)
                                .filter(option => option.selected)
                                .map(option => option.value);

    const leadData = {
        contactName: document.getElementById('lead-contact-name').value,
        phone: document.getElementById('lead-phone').value,
        email: document.getElementById('lead-email').value,
        servicesInterested: selectedServices, // NEW: Save as array
        eventDate: eventDateTimestamp, // Save as Date object (Firestore converts to Timestamp)
        source: document.getElementById('lead-source').value,
        additionalDetails: document.getElementById('lead-additional-details').value,
        creatorId: userId, // Added creatorId as per rules
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    // --- START DEBUG LOGGING ---
    console.log("Attempting to save lead with data:", JSON.stringify(leadData, null, 2));
    // --- END DEBUG LOGGING ---

    try {
        const collectionRef = collection(db, 'leads'); // Top-level collection
        if (leadId) {
            // For update, only update updatedAt, not createdAt
            delete leadData.createdAt; // Ensure createdAt is not sent on update
            await updateDoc(doc(collectionRef, leadId), leadData);
            showMessageBox("Lead updated successfully!", false);
        } else {
            await addDoc(collectionRef, leadData);
            showMessageBox("Lead added successfully!", false);
        }
        hideLeadForm();
        await loadLeads(); // Reload grid
    } catch (error) {
        console.error("Error saving lead:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving lead: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}

async function loadLeads() {
    if (!db || !userId) {
        if (noLeadsMessage) noLeadsMessage.classList.remove('hidden');
        if (leadsGrid) leadsGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Query only for current user's leads (top-level collection)
    onSnapshot(query(collection(db, 'leads'), where('creatorId', '==', userId)), snapshot => {
        const leads = [];
        snapshot.forEach(doc => {
            const leadData = doc.data();
            // Convert Firestore Timestamp to YYYY-MM-DD string for display
            const eventDateDisplay = leadData.eventDate && leadData.eventDate.toDate ? leadData.eventDate.toDate().toISOString().split('T')[0] : 'N/A';
            // Display services as a comma-separated string
            const servicesInterestedDisplay = Array.isArray(leadData.servicesInterested) ? leadData.servicesInterested.join(', ') : 'N/A';
            leads.push({ id: doc.id, ...leadData, eventDate: eventDateDisplay, servicesInterestedDisplay: servicesInterestedDisplay });
        });
        renderLeadsGrid(leads);
    }, error => {
        console.error("Error loading leads in real-time:", error);
        showMessageBox(`Error loading leads: ${error.message}`, false);
        if (noLeadsMessage) noLeadsMessage.classList.remove('hidden');
        if (leadsGrid) leadsGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderLeadsGrid(leads) {
    const data = leads.map(lead => [
        lead.contactName,
        lead.email,
        lead.phone,
        lead.servicesInterestedDisplay, // NEW: Display formatted services
        lead.eventDate, // Already formatted in loadLeads
        lead.source,
        lead.id
    ]);

    if (!leadsGrid) {
        if (leadsGridContainer) {
            leadsGrid = new gridjs.Grid({
                columns: [
                    { name: 'Contact Name', width: '20%' },
                    { name: 'Email', width: '20%' },
                    { name: 'Phone', width: '15%' },
                    { name: 'Service', width: '15%' },
                    { name: 'Event Date', width: '10%' },
                    { name: 'Source', width: '10%' },
                    {
                        name: 'Actions',
                        width: '10%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editLead(row.cells[6].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteLead(row.cells[6].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    // MODIFIED: Removed whitespace-nowrap for text wrapping
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(leadsGridContainer);
        } else {
            console.error("leadsGridContainer not found, cannot render leads grid.");
        }
    } else {
        leadsGrid.updateConfig({ data: data }).forceRender();
    }

    if (noLeadsMessage) {
        if (leads.length === 0) {
            noLeadsMessage.classList.remove('hidden');
        } else {
            noLeadsMessage.classList.add('hidden');
        }
    }
}

async function editLead(leadId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, 'leads', leadId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupLeadForm(docSnap.data());
            const leadIdInput = document.getElementById('lead-id');
            if (leadIdInput) leadIdInput.value = leadId; // Ensure ID is set
        } else {
            showMessageBox("Lead not found!", false);
        }
    } catch (error) {
        console.error("Error editing lead:", error);
        showMessageBox(`Error loading lead for edit: ${error.message}`, false);
    }
}

async function deleteLead(leadId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this lead?", true);
    if (!confirmDelete) return;

    if (!db || !userId) return;
    try {
        await deleteDoc(doc(db, 'leads', leadId)); // Top-level collection
        showMessageBox("Lead deleted successfully!", false);
        await loadLeads(); // Reload grid
    } catch (error) {
        console.error("Error deleting lead:", error);
        showMessageBox(`Error deleting lead: ${error.message}`, false);
    }
}

// Part 5: Opportunity Logic

// --- Opportunity Logic ---

/**
 * Filters price books based on the selected currency and populates the dropdown.
 * @param {string} selectedCurrencyCode - The currency code to filter by.
 * @param {string|null} currentPriceBookId - The ID of the price book to select after filtering, if any.
 */
function filterAndPopulatePriceBooks(selectedCurrencyCode, currentPriceBookId = null) {
    const filteredPriceBooks = selectedCurrencyCode
        ? allPriceBooks.filter(pb => pb.currency === selectedCurrencyCode && pb.isActive)
        : allPriceBooks.filter(pb => pb.isActive); // Show all active if no currency selected

    console.log(`  Filtering price books for currency: ${selectedCurrencyCode}. Found ${filteredPriceBooks.length} active price books.`);

    populateSelect(opportunityPriceBookSelect, filteredPriceBooks, 'id', 'name', 'Select a Price Book');

    // Auto-select if only one option is available
    if (filteredPriceBooks.length === 1) {
        opportunityPriceBookSelect.value = filteredPriceBooks[0].id;
        console.log(`  Auto-selected single price book: ${filteredPriceBooks[0].name} (ID: ${filteredPriceBooks[0].id})`);
    } else if (currentPriceBookId && filteredPriceBooks.some(pb => pb.id === currentPriceBookId)) {
        // Attempt to re-select the current price book if it's still in the filtered list
        opportunityPriceBookSelect.value = currentPriceBookId;
        console.log(`  Re-selected existing price book with ID: ${currentPriceBookId}`);
    } else {
        // If no auto-selection, or current price book is no longer valid, reset selection
        opportunityPriceBookSelect.value = "";
        console.log('  No auto-selection for price book, resetting dropdown.');
    }
}

// Hardcoded services options for the multi-select dropdown
const opportunityServicesOptions = [
    { id: 'Save the Day', name: 'Save the Day' },
    { id: 'Pre-Wedding Photo Shoot', name: 'Pre-Wedding Photo Shoot' },
    { id: 'Wedding', name: 'Wedding' },
    { id: 'Post-Wedding Photo Shoot', name: 'Post-Wedding Photo Shoot' },
    { id: 'Baby Shower', name: 'Baby Shower' },
    { id: 'Corporate Event', name: 'Corporate Event' },
    { id: 'Product Launch', name: 'Product Launch' },
    { id: 'Political Meeting', name: 'Political Meeting' },
    { id: 'Others', name: 'Others' }
];

async function setupOpportunityForm(opportunity = null) {
    let opportunityData = opportunity;
    if (typeof opportunity === 'string') { // If only an ID is passed
        console.log("setupOpportunityForm: Fetching opportunity data for ID:", opportunity);
        const docRef = doc(db, 'opportunities', opportunity);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            opportunityData = { id: docSnap.id, ...docSnap.data() };
        } else {
            console.error("setupOpportunityForm: Opportunity not found for ID:", opportunity);
            showMessageBox("Opportunity not found!", false);
            return;
        }
    }

    const customers = await fetchData('customers'); // Customers are top-level
    populateSelect(document.getElementById('opportunity-customer'), customers, 'id', 'name', 'Select a Customer');

    const currencies = await fetchData('currencies'); // Currencies are top-level
    // Populate currency dropdown with name, but value remains code
    populateSelect(opportunityCurrencySelect, currencies, 'code', 'code', 'Select...'); // Changed to 'code' for display as well

    // Fetch all price books once and store them
    allPriceBooks = await fetchData('priceBooks'); // Price books are top-level

    // Populate Services Interested multi-select
    // Ensure servicesInterested is an array for populateMultiSelect
    const currentServices = opportunityData && Array.isArray(opportunityData.servicesInterested)
        ? opportunityData.servicesInterested
        : [];
    populateMultiSelect(opportunityServicesInterestedSelect, opportunityServicesOptions, 'id', 'name', currentServices);


    if (opportunityData) { // Use opportunityData consistently
        currentOpportunityId = opportunityData.id;
        document.getElementById('opportunity-id').value = opportunityData.id;
        document.getElementById('opportunity-name').value = opportunityData.name || '';
        document.getElementById('opportunity-customer').value = opportunityData.customerId || '';
        opportunityCurrencySelect.value = opportunityData.currency || ''; // Set selected currency

        // Now filter and populate price books based on the opportunity's currency
        filterAndPopulatePriceBooks(opportunityData.currency, opportunityData.priceBookId);

        // Convert Firestore Timestamp to YYYY-MM-DD string for input type="date"
        const startDate = opportunityData.expectedStartDate ? new Date(opportunityData.expectedStartDate.seconds * 1000).toISOString().split('T')[0] : '';
        const closeDate = opportunityData.expectedCloseDate ? new Date(opportunityData.expectedCloseDate.seconds * 1000).toISOString().split('T')[0] : '';

        document.getElementById('opportunity-start-date').value = startDate;
        document.getElementById('opportunity-close-date').value = closeDate;
        document.getElementById('opportunity-sales-stage').value = opportunityData.salesStage || 'Prospect';
        document.getElementById('opportunity-probability').value = opportunityData.probability !== undefined ? opportunityData.probability : '';
        document.getElementById('opportunity-value').value = opportunityData.value !== undefined ? opportunityData.value : '';
        document.getElementById('opportunity-notes').value = opportunityData.notes || '';

        await loadWorkLogs(opportunityData.id); // Load work logs for this opportunity
        // Show work logs section when editing/viewing an opportunity
        if (workLogsSectionContainer) {
            workLogsSectionContainer.classList.remove('hidden');
            // Ensure Work Logs accordion is minimized when loading an existing opportunity
            const workLogsAccordionHeader = document.querySelector('#work-logs-section-container .accordion-item .accordion-header');
            const workLogsAccordionContent = workLogsAccordionHeader ? workLogsAccordionHeader.nextElementSibling : null;
            const workLogsIcon = workLogsAccordionHeader ? workLogsAccordionHeader.querySelector('.accordion-icon') : null;

            if (workLogsAccordionContent) {
                workLogsAccordionContent.classList.add('hidden');
                if (workLogsIcon) {
                    workLogsIcon.style.transform = 'rotate(0deg)'; // Down arrow
                }
                if (workLogsAccordionHeader) {
                    workLogsAccordionHeader.classList.remove('expanded');
                }
                console.log('  Work Logs Accordion: Minimized on existing opportunity load.');
            }
        }
    } else {
        // For a new opportunity
        if (opportunityForm) opportunityForm.reset();
        const opportunityIdInput = document.getElementById('opportunity-id');
        if (opportunityIdInput) opportunityIdInput.value = '';
        currentOpportunityId = null;
        if (workLogsList) workLogsList.innerHTML = ''; // Clear work logs for new opportunity
        if (noWorkLogsMessage) noWorkLogsMessage.classList.remove('hidden');
        hideWorkLogForm(); // Hide work log entry form
        // Hide work logs section when creating a brand new opportunity
        if (workLogsSectionContainer) workLogsSectionContainer.classList.add('hidden');
        // For new opportunities, populate price books with all active ones initially
        filterAndPopulatePriceBooks(''); // Pass empty string to show all active price books
    }
    showOpportunityForm(); // Call showOpportunityForm to handle main form visibility and its accordion
    console.log('Add/Edit Opportunity form setup complete. currentOpportunityId:', currentOpportunityId);
}

async function handleSaveOpportunity(event) {
    event.preventDefault(); // Prevent default form submission
    console.log('handleSaveOpportunity: Form submit event triggered.'); // Diagnostic log

    if (!db || !userId) {
        showMessageBox("Authentication required to save opportunity.", false);
        return;
    }

    const opportunityId = document.getElementById('opportunity-id').value;
    const messageElement = document.getElementById('opportunity-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    // --- Start Client-Side Validation ---
    const requiredFields = opportunityForm.querySelectorAll('[required]');
    let firstInvalidField = null;

    for (const field of requiredFields) {
        if (!field.value) {
            firstInvalidField = field;
            break;
        }
    }

    if (firstInvalidField) {
        console.warn('Validation failed: Required field is empty.', firstInvalidField);
        // Find the parent accordion of the invalid field
        let parentAccordionContent = firstInvalidField.closest('.accordion-content');
        if (parentAccordionContent && parentAccordionContent.classList.contains('hidden')) {
            const parentAccordionHeader = parentAccordionContent.previousElementSibling;
            if (parentAccordionHeader) {
                console.log('Opening parent accordion:', parentAccordionHeader.textContent.trim());
                parentAccordionHeader.click(); // Programmatically click to open
            }
        }
        firstInvalidField.focus(); // Focus on the invalid field
        messageElement.textContent = `Please fill in the required field: ${firstInvalidField.labels ? firstInvalidField.labels[0].textContent : firstInvalidField.id.replace(/-/g, ' ')}.`;
        messageElement.classList.remove('hidden');
        return; // Stop form submission
    }
    // --- End Client-Side Validation ---

    // Get selected services from multi-select
    const selectedServices = Array.from(opportunityServicesInterestedSelect.options)
                                .filter(option => option.selected)
                                .map(option => option.value);

    const customerId = document.getElementById('opportunity-customer').value;
    let customerName = '';
    if (customerId) {
        try {
            // Fetch customer name from the top-level customer collection
            const customerSnap = await getDoc(doc(db, 'customers', customerId));
            if (customerSnap.exists()) {
                customerName = customerSnap.data().name;
            }
        } catch (error) {
            console.error("Error fetching customer name for opportunity:", error);
            customerName = 'Unknown Customer'; // Fallback
        }
    }

    const expectedStartDateValue = document.getElementById('opportunity-start-date').value;
    const expectedStartDateTimestamp = expectedStartDateValue ? new Date(expectedStartDateValue) : null;

    const expectedCloseDateValue = document.getElementById('opportunity-close-date').value;
    const expectedCloseDateTimestamp = expectedCloseDateValue ? new Date(expectedCloseDateValue) : null;

    const opportunityData = {
        name: document.getElementById('opportunity-name').value,
        customerId: customerId,
        customerName: customerName, // Added customerName as per rules
        currency: opportunityCurrencySelect.value, // Get value from the select
        priceBookId: opportunityPriceBookSelect.value, // Get value from the select
        expectedStartDate: expectedStartDateTimestamp, // Save as Date object (Firestore converts to Timestamp)
        expectedCloseDate: expectedCloseDateTimestamp, // Save as Date object (Firestore converts to Timestamp)
        salesStage: document.getElementById('opportunity-sales-stage').value,
        probability: parseFloat(document.getElementById('opportunity-probability').value) || 0,
        value: parseFloat(document.getElementById('opportunity-value').value) || 0,
        notes: document.getElementById('opportunity-notes').value,
        servicesInterested: selectedServices, // NEW: Add selected services
        creatorId: userId, // Added creatorId as per rules
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        // Opportunities are top-level as per provided rules
        const collectionRef = collection(db, 'opportunities');
        let savedOpportunityId; // Variable to hold the ID of the saved/created opportunity

        if (opportunityId) {
            // Update existing opportunity
            delete opportunityData.createdAt;
            await updateDoc(doc(collectionRef, opportunityId), opportunityData);
            savedOpportunityId = opportunityId;
            showMessageBox("Opportunity updated successfully!", false);
            hideOpportunityForm(); // Hide form after update
        } else {
            // Create new opportunity
            const docRef = await addDoc(collectionRef, opportunityData);
            savedOpportunityId = docRef.id;
            showMessageBox("Opportunity added successfully! You can now add work logs.", false);

            // Instead of hiding, re-setup the form with the new ID to allow adding work logs
            // This will keep the form open and load work logs for the newly created opportunity
            // Fetch the full data of the newly created opportunity to pass to setupOpportunityForm
            const newOpportunitySnap = await getDoc(doc(collectionRef, savedOpportunityId));
            if (newOpportunitySnap.exists()) {
                await setupOpportunityForm({ id: newOpportunitySnap.id, ...newOpportunitySnap.data() });
            } else {
                console.error("Could not retrieve newly created opportunity data.");
                // Fallback: just set currentOpportunityId and hope for the best, or show error
                currentOpportunityId = savedOpportunityId;
                if (workLogsSectionContainer) workLogsSectionContainer.classList.remove('hidden');
            }
        }

        await loadOpportunities(); // Reload grid
        await updateDashboard();

    } catch (error) {
        console.error("Error saving opportunity:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving opportunity: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}

async function loadOpportunities() {
    if (!db || !userId) {
        if (noOpportunitiesMessage) noOpportunitiesMessage.classList.remove('hidden');
        if (opportunitiesGrid) opportunitiesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Query only for current user's opportunities (top-level collection)
    onSnapshot(query(collection(db, 'opportunities'), where('creatorId', '==', userId)), async snapshot => {
        const opportunities = [];
        for (const docSnap of snapshot.docs) { // Renamed doc to docSnap to avoid conflict with import
            const opp = { id: docSnap.id, ...docSnap.data() };
            // customerName is now stored directly in the opportunity document, no need to fetch
            // Convert Firestore Timestamps to YYYY-MM-DD string for display
            opp.expectedStartDate = opp.expectedStartDate && opp.expectedStartDate.toDate ? opp.expectedStartDate.toDate().toISOString().split('T')[0] : 'N/A';
            opp.expectedCloseDate = opp.expectedCloseDate && opp.expectedCloseDate.toDate ? opp.expectedCloseDate.toDate().toISOString().split('T')[0] : 'N/A';
            // Display services as a comma-separated string
            opp.servicesInterestedDisplay = Array.isArray(opp.servicesInterested) ? opp.servicesInterested.join(', ') : 'N/A';
            opportunities.push(opp);
        }
        renderOpportunitiesGrid(opportunities);
    }, error => {
        console.error("Error loading opportunities in real-time:", error);
        showMessageBox(`Error loading opportunities: ${error.message}`, false);
        if (noOpportunitiesMessage) noOpportunitiesMessage.classList.remove('hidden');
        if (opportunitiesGrid) opportunitiesGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderOpportunitiesGrid(opportunities) {
    const data = opportunities.map(opportunity => [
        opportunity.name,
        opportunity.customerName, // Display fetched customer name
        opportunity.servicesInterestedDisplay, // NEW: Column for services
        `${opportunity.currency} ${opportunity.value !== undefined ? opportunity.value.toFixed(2) : 'N/A'}`, // Handle undefined value
        opportunity.salesStage,
        `${opportunity.probability !== undefined ? opportunity.probability : 'N/A'}%`, // Handle undefined probability
        opportunity.expectedCloseDate,
        opportunity.id
    ]);

    if (!opportunitiesGrid) {
        if (opportunitiesGridContainer) {
            opportunitiesGrid = new gridjs.Grid({
                columns: [
                    { name: 'Opportunity Name', width: '15%' },
                    { name: 'Customer', width: '15%' },
                    { name: 'Services', width: '20%' }, // NEW: Column for services
                    { name: 'Value', width: '10%' },
                    { name: 'Stage', width: '10%' },
                    { name: 'Probability', width: '5%' },
                    { name: 'Close Date', width: '10%' },
                    {
                        name: 'Actions',
                        width: '15%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editOpportunity(row.cells[7].data) // Adjusted index for ID
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteOpportunity(row.cells[7].data) // Adjusted index for ID
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    // MODIFIED: Removed whitespace-nowrap for text wrapping
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(opportunitiesGridContainer);
            console.log('Grid.js is now available for opportunities.');
        } else {
            console.error("opportunitiesGridContainer not found, cannot render opportunities grid.");
        }
    } else {
        opportunitiesGrid.updateConfig({ data: data }).forceRender();
    }

    if (noOpportunitiesMessage) {
        if (opportunities.length === 0) {
            noOpportunitiesMessage.classList.remove('hidden');
        } else {
            noOpportunitiesMessage.classList.add('hidden');
        }
    }
}

async function editOpportunity(opportunityId) {
    if (!db || !userId) return;
    try {
        // setupOpportunityForm will now fetch the data if only an ID is passed
        await setupOpportunityForm(opportunityId);
    }
    catch (error) {
        console.error("Error editing opportunity:", error);
        showMessageBox(`Error loading opportunity for edit: ${error.message}`, false);
    }
}

async function deleteOpportunity(opportunityId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this opportunity and all its work logs?", true);
    if (!confirmDelete) return;

    if (!db || !userId) return;
    try {
        // Delete associated work logs first (subcollection of top-level opportunity)
        const workLogsRef = collection(db, `opportunities/${opportunityId}/workLogs`);
        const workLogsQuery = query(workLogsRef); // No need for where('opportunityId') as it's a subcollection
        const workLogsSnapshot = await getDocs(workLogsQuery);
        const batch = writeBatch(db);
        workLogsSnapshot.forEach(docSnap => { // Renamed doc to docSnap
            batch.delete(docSnap.ref);
        });
        await batch.commit();

        // Then delete the opportunity (top-level)
        await deleteDoc(doc(db, 'opportunities', opportunityId));
        showMessageBox("Opportunity and associated work logs deleted successfully!", false);
        await loadOpportunities(); // Reload grid
        await updateDashboard();
    } catch (error) {
        console.error("Error deleting opportunity:", error);
        showMessageBox(`Error deleting opportunity: ${error.message}`, false);
    }
}

// Part 6: Work Log Logic

// --- Work Log Logic ---

async function loadWorkLogs(opportunityId) {
    if (!db || !userId || !opportunityId) {
        if (workLogsList) workLogsList.innerHTML = '';
        if (noWorkLogsMessage) noWorkLogsMessage.classList.remove('hidden');
        return;
    }

    // Query work logs as a subcollection of the specific opportunity (top-level opportunity)
    onSnapshot(query(collection(db, `opportunities/${opportunityId}/workLogs`),
        where('creatorId', '==', userId), // Work logs are also user-specific
        orderBy('date', 'desc')), // Order by date, newest first
        snapshot => {
            if (workLogsList) workLogsList.innerHTML = ''; // Clear existing logs
            if (noWorkLogsMessage) {
                if (snapshot.empty) {
                    noWorkLogsMessage.classList.remove('hidden');
                    return;
                }
                noWorkLogsMessage.classList.add('hidden');
            }
            snapshot.forEach(docSnap => { // Renamed doc to docSnap
                const log = docSnap.data();
                const logId = docSnap.id;
                // Convert Firestore Timestamp to YYYY-MM-DD string for display
                const logDateDisplay = log.date && log.date.toDate ? log.date.toDate().toISOString().split('T')[0] : 'N/A';

                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-3 rounded-md shadow-sm border border-gray-200 flex justify-between items-center';
                li.innerHTML = `
                    <div>
                        <p class="text-sm font-semibold text-gray-700">${logDateDisplay} - ${log.type}</p>
                        <p class="text-gray-600 text-sm mt-1">${log.details}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button type="button" class="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-xs"
                            onclick="editWorkLog('${logId}', '${opportunityId}')">Edit</button>
                        <button type="button" class="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-xs"
                            onclick="deleteWorkLog('${logId}', '${opportunityId}')">Delete</button>
                    </div>
                `;
                if (workLogsList) workLogsList.appendChild(li);
            });
        }, error => {
            console.error("Error loading work logs in real-time:", error);
            showMessageBox(`Error loading work logs: ${error.message}`, false);
            if (workLogsList) workLogsList.innerHTML = '';
            if (noWorkLogsMessage) noWorkLogsMessage.classList.remove('hidden');
        });
}

async function handleSaveWorkLog(event) {
    event.preventDefault();
    console.log('handleSaveWorkLog: Form submit event triggered.'); // Diagnostic log
    if (!db || !userId || !currentOpportunityId) {
        showMessageBox("Authentication or selected opportunity required to save work log.", false);
        return;
    }

    const workLogId = document.getElementById('work-log-id').value;
    const messageElement = document.getElementById('work-log-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    // --- Start Client-Side Validation for Work Log ---
    const requiredFields = workLogForm.querySelectorAll('[required]');
    let firstInvalidField = null;

    for (const field of requiredFields) {
        if (!field.value) {
            firstInvalidField = field;
            break;
        }
    }

    if (firstInvalidField) {
        console.warn('Work Log Validation failed: Required field is empty.', firstInvalidField);
        firstInvalidField.focus(); // Focus on the invalid field
        messageElement.textContent = `Please fill in the required field: ${firstInvalidField.labels ? firstInvalidField.labels[0].textContent : firstInvalidField.id.replace(/-/g, ' ')}.`;
        messageElement.classList.remove('hidden');
        return; // Stop form submission
    }
    // --- End Client-Side Validation for Work Log ---

    const workLogDateValue = document.getElementById('work-log-date').value;
    const workLogDateTimestamp = workLogDateValue ? new Date(workLogDateValue) : null;

    const workLogData = {
        opportunityId: currentOpportunityId, // Stored for reference, but path is now subcollection
        date: workLogDateTimestamp, // Save as Date object (Firestore converts to Timestamp)
        type: workLogTypeSelect.value, // Get value from the select
        details: document.getElementById('work-log-details').value,
        creatorId: userId, // Added creatorId as per rules
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        // Work logs are a subcollection of top-level opportunities
        const collectionRef = collection(db, `opportunities/${currentOpportunityId}/workLogs`);
        if (workLogId) {
            // For update, only update updatedAt, not createdAt
            delete workLogData.createdAt;
            await updateDoc(doc(collectionRef, workLogId), workLogData);
            showMessageBox("Work log updated successfully!", false);
        } else {
            await addDoc(collectionRef, workLogData);
            showMessageBox("Work log added successfully!", false);
        }
        hideWorkLogForm();
        // loadWorkLogs is already onSnapshot, so it will update automatically
    } catch (error) {
        console.error("Error saving work log:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving work log: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}

async function editWorkLog(workLogId, opportunityId) { // Pass opportunityId to correctly build docRef
    if (!db || !userId || !opportunityId) return;
    try {
        // Work logs are a subcollection of top-level opportunities
        const docRef = doc(db, `opportunities/${opportunityId}/workLogs`, workLogId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const log = docSnap.data();
            await setupWorkLogForm(log); // Call setupWorkLogForm to pre-fill
            // Ensure the hidden ID and opportunity ID are correctly set after setupWorkLogForm
            document.getElementById('work-log-id').value = workLogId;
            document.getElementById('work-log-opportunity-id').value = opportunityId;
        } else {
            showMessageBox("Work log not found!", false);
        }
    } catch (error) {
        console.error("Error editing work log:", error);
        showMessageBox(`Error loading work log for edit: ${error.message}`, false);
    }
}

async function deleteWorkLog(workLogId, opportunityId) { // Pass opportunityId to correctly build docRef
    const confirmDelete = await showMessageBox("Are you sure you want to delete this work log entry?", true);
    if (!confirmDelete) return;

    if (!db || !userId || !opportunityId) return;
    try {
        // Work logs are a subcollection of top-level opportunities
        await deleteDoc(doc(db, `opportunities/${opportunityId}/workLogs`, workLogId));
        showMessageBox("Work log deleted successfully!", false);
        // loadWorkLogs is already onSnapshot, so it will update automatically
    } catch (error) {
        console.error("Error deleting work log:", error);
        showMessageBox(`Error deleting work log: ${error.message}`, false);
    }
}

// Part 7: Admin Logic - Countries

async function setupCountryForm(country = null) {
    const countries = await fetchData('countries'); // Countries are top-level
    populateSelect(document.getElementById('country-country'), countries, 'name', 'name', 'Select Country');

    if (country) {
        document.getElementById('country-id').value = country.id;
        document.getElementById('country-name').value = country.name || '';
        document.getElementById('country-code').value = country.code || '';
        document.getElementById('country-states').value = Array.isArray(country.states) ? country.states.join(', ') : '';
    } else {
        if (countryForm) countryForm.reset();
        const countryIdInput = document.getElementById('country-id');
        if (countryIdInput) countryIdInput.value = '';
    }
    showCountryForm();
}

async function handleSaveCountry(event) {
    event.preventDefault();
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        showMessageBox("Admin privileges required to save country.", false);
        return;
    }

    const countryId = document.getElementById('country-id').value;
    const messageElement = document.getElementById('country-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    const countryData = {
        name: document.getElementById('country-name').value,
        code: document.getElementById('country-code').value.toUpperCase(),
        states: document.getElementById('country-states').value.split(',').map(s => s.trim()).filter(s => s !== ''),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        const collectionRef = collection(db, 'countries'); // Top-level collection
        if (countryId) {
            // For update, only update updatedAt, not createdAt
            delete countryData.createdAt;
            await updateDoc(doc(collectionRef, countryId), countryData);
            showMessageBox("Country updated successfully!", false);
        } else {
            await addDoc(collectionRef, countryData);
            showMessageBox("Country added successfully!", false);
        }
        hideCountryForm();
        await loadCountries();
    } catch (error) {
        console.error("Error saving country:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving country: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}

async function loadCountries() {
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        if (noCountriesMessage) noCountriesMessage.classList.remove('hidden');
        if (countriesGrid) countriesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Countries are top-level public data, no creatorId filter needed
    onSnapshot(collection(db, 'countries'), snapshot => {
        const countries = [];
        snapshot.forEach(doc => {
            countries.push({ id: doc.id, ...doc.data() });
        });
        renderCountriesGrid(countries);
    }, error => {
        console.error("Error loading countries in real-time:", error);
        showMessageBox(`Error loading countries: ${error.message}`, false);
        if (noCountriesMessage) noCountriesMessage.classList.remove('hidden');
        if (countriesGrid) countriesGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderCountriesGrid(countries) {
    const data = countries.map(country => [
        country.name,
        country.code,
        country.states ? country.states.join(', ') : '',
        country.id
    ]);

    if (!countriesGrid) {
        if (countriesGridContainer) {
            countriesGrid = new gridjs.Grid({
                columns: [
                    { name: 'Country Name', width: '30%' },
                    { name: 'Code', width: '15%' },
                    { name: 'States/Provinces', width: '40%' },
                    {
                        name: 'Actions',
                        width: '15%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editCountry(row.cells[3].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteCountry(row.cells[3].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    // MODIFIED: Removed whitespace-nowrap for text wrapping
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(countriesGridContainer);
        } else {
            console.error("countriesGridContainer not found, cannot render countries grid.");
        }
    } else {
        countriesGrid.updateConfig({ data: data }).forceRender();
    }

    if (noCountriesMessage) {
        if (countries.length === 0) {
            noCountriesMessage.classList.remove('hidden');
        } else {
            noCountriesMessage.classList.add('hidden');
        }
    }
}

async function editCountry(countryId) {
    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        const docRef = doc(db, 'countries', countryId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupCountryForm(docSnap.data());
        } else {
            showMessageBox("Country not found!", false);
        }
    } catch (error) {
        console.error("Error editing country:", error);
        showMessageBox(`Error loading country for edit: ${error.message}`, false);
    }
}

async function deleteCountry(countryId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this country?", true);
    if (!confirmDelete) return;

    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        await deleteDoc(doc(db, 'countries', countryId)); // Top-level collection
        showMessageBox("Country deleted successfully!", false);
        await loadCountries();
    } catch (error) {
        console.error("Error deleting country:", error);
        showMessageBox(`Error deleting country: ${error.message}`, false);
    }
}

// Part 8: Admin Logic - Currencies

async function setupCurrencyForm(currency = null) {
    const countries = await fetchData('countries'); // Countries are top-level
    populateSelect(document.getElementById('currency-country'), countries, 'code', 'name', 'Select Country (Optional)');

    if (currency) {
        document.getElementById('currency-id').value = currency.id;
        document.getElementById('currency-name').value = currency.name || '';
        document.getElementById('currency-code').value = currency.code || '';
        document.getElementById('currency-symbol').value = currency.symbol || '';
        document.getElementById('currency-country').value = currency.countryCode || ''; // Assuming countryCode is stored
    } else {
        if (currencyForm) currencyForm.reset();
        const currencyIdInput = document.getElementById('currency-id');
        if (currencyIdInput) currencyIdInput.value = '';
    }
    showCurrencyForm();
}

async function handleSaveCurrency(event) {
    event.preventDefault();
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        showMessageBox("Admin privileges required to save currency.", false);
        return;
    }

    const currencyId = document.getElementById('currency-id').value;
    const messageElement = document.getElementById('currency-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    const currencyData = {
        name: document.getElementById('currency-name').value,
        code: document.getElementById('currency-code').value.toUpperCase(),
        symbol: document.getElementById('currency-symbol').value,
        countryCode: document.getElementById('currency-country').value || null, // Save country code
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        const collectionRef = collection(db, 'currencies'); // Top-level collection
        if (currencyId) {
            // For update, only update updatedAt, not createdAt
            delete currencyData.createdAt;
            await updateDoc(doc(collectionRef, currencyId), currencyData);
            showMessageBox("Currency updated successfully!", false);
        } else {
            await addDoc(collectionRef, currencyData);
            showMessageBox("Currency added successfully!", false);
        }
        hideCurrencyForm();
        await loadCurrencies();
    } catch (error) {
        console.error("Error saving currency:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving currency: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}

async function loadCurrencies() {
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        if (noCurrenciesMessage) noCurrenciesMessage.classList.remove('hidden');
        if (currenciesGrid) currenciesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Currencies are top-level public data, no creatorId filter needed
    onSnapshot(collection(db, 'currencies'), snapshot => {
        const currencies = [];
        snapshot.forEach(doc => {
            currencies.push({ id: doc.id, ...doc.data() });
        });
        renderCurrenciesGrid(currencies);
    }, error => {
        console.error("Error loading currencies in real-time:", error);
        showMessageBox(`Error loading currencies: ${error.message}`, false);
        if (noCurrenciesMessage) noCurrenciesMessage.classList.remove('hidden');
        if (currenciesGrid) currenciesGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderCurrenciesGrid(currencies) {
    const data = currencies.map(currency => [
        currency.name,
        currency.code,
        currency.symbol,
        currency.countryCode || 'N/A',
        currency.id
    ]);

    if (!currenciesGrid) {
        if (currenciesGridContainer) {
            currenciesGrid = new gridjs.Grid({
                columns: [
                    { name: 'Name', width: '25%' },
                    { name: 'Code', width: '15%' },
                    { name: 'Symbol', width: '15%' },
                    { name: 'Country', width: '30%' },
                    {
                        name: 'Actions',
                        width: '15%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editCurrency(row.cells[4].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteCurrency(row.cells[4].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    // MODIFIED: Removed whitespace-nowrap for text wrapping
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(currenciesGridContainer);
        } else {
            console.error("currenciesGridContainer not found, cannot render currencies grid.");
        }
    } else {
        currenciesGrid.updateConfig({ data: data }).forceRender();
    }

    if (noCurrenciesMessage) {
        if (currencies.length === 0) {
            noCurrenciesMessage.classList.remove('hidden');
        } else {
            noCurrenciesMessage.classList.add('hidden');
        }
    }
}

async function editCurrency(currencyId) {
    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        const docRef = doc(db, 'currencies', currencyId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupCurrencyForm(docSnap.data());
        } else {
            showMessageBox("Currency not found!", false);
        }
    } catch (error) {
        console.error("Error editing currency:", error);
        showMessageBox(`Error loading currency for edit: ${error.message}`, false);
    }
}

async function deleteCurrency(currencyId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this currency?", true);
    if (!confirmDelete) return;

    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        await deleteDoc(doc(db, 'currencies', currencyId)); // Top-level collection
        showMessageBox("Currency deleted successfully!", false);
        await loadCurrencies();
    }
    catch (error) {
        console.error("Error deleting currency:", error);
        showMessageBox(`Error deleting currency: ${error.message}`, false);
    }
}

// Part 9: Admin Logic - Price Books

async function setupPriceBookForm(priceBook = null) {
    const currencies = await fetchData('currencies'); // Currencies are top-level
    populateSelect(document.getElementById('price-book-currency'), currencies, 'code', 'code', 'Select Currency'); // Changed to 'code' for display as well

    if (priceBook) {
        document.getElementById('price-book-id').value = priceBook.id;
        document.getElementById('price-book-name').value = priceBook.name || '';
        document.getElementById('price-book-description').value = priceBook.description || '';
        document.getElementById('price-book-currency').value = priceBook.currency || '';
        document.getElementById('price-book-active').checked = priceBook.isActive !== undefined ? priceBook.isActive : true; // Use isActive
    } else {
        if (priceBookForm) priceBookForm.reset();
        const priceBookIdInput = document.getElementById('price-book-id');
        if (priceBookIdInput) priceBookIdInput.value = '';
        const priceBookActiveCheckbox = document.getElementById('price-book-active');
        if (priceBookActiveCheckbox) priceBookActiveCheckbox.checked = true; // Default to active for new price books
    }
    showPriceBookForm();
}

async function handleSavePriceBook(event) {
    event.preventDefault();
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        showMessageBox("Admin privileges required to save price book.", false);
        return;
    }

    const priceBookId = document.getElementById('price-book-id').value;
    const messageElement = document.getElementById('price-book-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    const name = document.getElementById('price-book-name').value;
    const currency = document.getElementById('price-book-currency').value;

    const priceBookData = {
        name: name,
        normalizedName: name.toLowerCase().replace(/\s/g, ''), // Add normalizedName
        description: document.getElementById('price-book-description').value,
        currency: currency,
        normalizedCurrency: currency.toLowerCase().replace(/\s/g, ''), // Add normalizedCurrency
        isActive: document.getElementById('price-book-active').checked, // Use isActive
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        const collectionRef = collection(db, 'priceBooks'); // Top-level collection
        if (priceBookId) {
            // For update, only update updatedAt, not createdAt
            delete priceBookData.createdAt;
            await updateDoc(doc(collectionRef, priceBookId), priceBookData);
            showMessageBox("Price Book updated successfully!", false);
        } else {
            await addDoc(collectionRef, priceBookData);
            showMessageBox("Price Book added successfully!", false);
        }
        hidePriceBookForm();
        await loadPriceBooks();
    } catch (error) {
        console.error("Error saving price book:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving price book: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}

async function loadPriceBooks() {
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        if (noPriceBooksMessage) noPriceBooksMessage.classList.remove('hidden');
        if (priceBooksGrid) priceBooksGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Price books are top-level public data, no creatorId filter needed
    onSnapshot(collection(db, 'priceBooks'), snapshot => {
        const priceBooks = [];
        snapshot.forEach(doc => {
            priceBooks.push({ id: doc.id, ...doc.data() });
        });
        renderPriceBooksGrid(priceBooks);
    }, error => {
        console.error("Error loading price books in real-time:", error);
        showMessageBox(`Error loading price books: ${error.message}`, false);
        if (noPriceBooksMessage) noPriceBooksMessage.classList.remove('hidden');
        if (priceBooksGrid) priceBooksGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderPriceBooksGrid(priceBooks) {
    const data = priceBooks.map(priceBook => [
        priceBook.name,
        priceBook.description,
        priceBook.currency,
        priceBook.isActive ? 'Yes' : 'No', // Use isActive
        priceBook.id
    ]);

    if (!priceBooksGrid) {
        if (priceBooksGridContainer) {
            priceBooksGrid = new gridjs.Grid({
                columns: [
                    { name: 'Name', width: '25%' },
                    { name: 'Description', width: '35%' },
                    { name: 'Currency', width: '15%' },
                    { name: 'Active', width: '10%' },
                    {
                        name: 'Actions',
                        width: '15%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editPriceBook(row.cells[4].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deletePriceBook(row.cells[4].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    // MODIFIED: Removed whitespace-nowrap for text wrapping
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(priceBooksGridContainer);
        } else {
            console.error("priceBooksGridContainer not found, cannot render price books grid.");
        }
    } else {
        priceBooksGrid.updateConfig({ data: data }).forceRender();
    }

    if (noPriceBooksMessage) {
        if (priceBooks.length === 0) {
            noPriceBooksMessage.classList.remove('hidden');
        } else {
            noPriceBooksMessage.classList.add('hidden');
        }
    }
}

async function editPriceBook(priceBookId) {
    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        const docRef = doc(db, 'priceBooks', priceBookId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupPriceBookForm(docSnap.data());
        } else {
            showMessageBox("Price Book not found!", false);
        }
    } catch (error) {
        console.error("Error editing price book:", error);
        showMessageBox(`Error loading price book for edit: ${error.message}`, false);
    }
}

async function deletePriceBook(priceBookId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this price book?", true);
    if (!confirmDelete) return;

    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        await deleteDoc(doc(db, 'priceBooks', priceBookId)); // Top-level collection
        showMessageBox("Price Book deleted successfully!", false);
        await loadPriceBooks();
    }
    catch (error) {
        console.error("Error deleting price book:", error);
        showMessageBox(`Error deleting price book: ${error.message}`, false);
    }
}

// Part 11: New Quote Logic

// --- Quote Logic ---

async function setupQuoteForm(quote = null) {
    if (!db || !userId) {
        showMessageBox("Authentication required to setup quote form.", false);
        return;
    }

    // Fetch only 'Won' opportunities created by the current user (if Standard) or all 'Won' (if Admin)
    let opportunitiesQuery;
    if (userRole === 'Admin') {
        opportunitiesQuery = query(collection(db, 'opportunities'), where('salesStage', '==', 'Won'));
    } else {
        // Standard users can only see their own 'Won' opportunities
        opportunitiesQuery = query(collection(db, 'opportunities'), where('creatorId', '==', userId), where('salesStage', '==', 'Won'));
    }

    try {
        const opportunitiesSnapshot = await getDocs(opportunitiesQuery);
        const wonOpportunities = opportunitiesSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            customerId: doc.data().customerId,
            customerName: doc.data().customerName,
            customerPhone: doc.data().phone, // Assuming phone is stored on opportunity or customer
            customerEmail: doc.data().email, // Assuming email is stored on opportunity or customer
            customerAddress: doc.data().address // Assuming address is stored on opportunity or customer
        }));

        // For each won opportunity, fetch its associated customer to get full contact details
        // This is necessary because opportunity might only store customerId, not all details
        const opportunitiesWithCustomerDetails = await Promise.all(wonOpportunities.map(async (opp) => {
            if (opp.customerId) {
                const customerDoc = await getDoc(doc(db, 'customers', opp.customerId));
                if (customerDoc.exists()) {
                    const customerData = customerDoc.data();
                    return {
                        ...opp,
                        customerContactName: customerData.name || '', // Use customer's name
                        customerPhone: customerData.phone || '',
                        customerEmail: customerData.email || '',
                        customerAddress: customerData.address || ''
                    };
                }
            }
            return opp; // Return opportunity as is if customer not found or no customerId
        }));

        populateSelect(quoteOpportunitySelect, opportunitiesWithCustomerDetails, 'id', 'name', 'Select Opportunity (Won)');

    } catch (error) {
        console.error("Error fetching 'Won' opportunities:", error);
        showMessageBox(`Error loading opportunities for quotes: ${error.message}`, false);
        // Ensure dropdown is empty on error
        populateSelect(quoteOpportunitySelect, [], 'id', 'name', 'Error loading opportunities');
    }

    // Populate Status dropdown
    const quoteStatuses = [
        { id: 'Draft', name: 'Draft' },
        { id: 'Review', name: 'Review' },
        { id: 'Finalized', name: 'Finalized' }
    ];
    populateSelect(quoteStatusSelect, quoteStatuses, 'id', 'name', 'Select Status');


    if (quote) {
        document.getElementById('quote-id').value = quote.id;
        document.getElementById('quote-name').value = quote.quoteName || '';
        quoteOpportunitySelect.value = quote.opportunityId || '';
        document.getElementById('event-name').value = quote.eventName || '';

        // Auto-fill customer details from quote data (these are read-only)
        customerContactNameInput.value = quote.customerContactName || '';
        customerPhoneInput.value = quote.phone || '';
        customerEmailInput.value = quote.email || '';
        customerAddressInput.value = quote.customerAddress || '';

        const eventDate = quote.eventDate ? new Date(quote.eventDate.seconds * 1000).toISOString().split('T')[0] : '';
        document.getElementById('quote-event-date').value = eventDate;
        document.getElementById('quote-additional-details').value = quote.additionalDetails || '';
        document.getElementById('quote-amount').value = quote.quoteAmount !== undefined ? quote.quoteAmount : '';
        quoteStatusSelect.value = quote.status || 'Draft';

    } else {
        // Reset form for new quote
        if (quoteForm) quoteForm.reset();
        document.getElementById('quote-id').value = '';
        // Clear auto-filled fields for new quote
        customerContactNameInput.value = '';
        customerPhoneInput.value = '';
        customerEmailInput.value = '';
        customerAddressInput.value = '';
        quoteStatusSelect.value = 'Draft'; // Default status for new quotes
    }
    showQuoteForm();
}

/**
 * Handles the change event on the Opportunity dropdown in the Quote form.
 * Auto-fills customer contact details based on the selected opportunity's customer.
 */
async function handleOpportunityChangeForQuote() {
    const selectedOpportunityId = quoteOpportunitySelect.value;
    if (!selectedOpportunityId) {
        // Clear fields if no opportunity is selected
        customerContactNameInput.value = '';
        customerPhoneInput.value = '';
        customerEmailInput.value = '';
        customerAddressInput.value = '';
        return;
    }

    try {
        const opportunityDoc = await getDoc(doc(db, 'opportunities', selectedOpportunityId));
        if (opportunityDoc.exists()) {
            const opportunityData = opportunityDoc.data();
            const customerId = opportunityData.customerId;

            if (customerId) {
                const customerDoc = await getDoc(doc(db, 'customers', customerId));
                if (customerDoc.exists()) {
                    const customerData = customerDoc.data();
                    customerContactNameInput.value = customerData.name || '';
                    customerPhoneInput.value = customerData.phone || '';
                    customerEmailInput.value = customerData.email || '';
                    customerAddressInput.value = customerData.address || '';
                } else {
                    console.warn("Customer not found for selected opportunity:", customerId);
                    showMessageBox("Customer details not found for the selected opportunity.", false);
                    // Clear fields if customer not found
                    customerContactNameInput.value = '';
                    customerPhoneInput.value = '';
                    customerEmailInput.value = '';
                    customerAddressInput.value = '';
                }
            } else {
                console.warn("Selected opportunity has no customerId.");
                // Clear fields if no customerId on opportunity
                customerContactNameInput.value = '';
                customerPhoneInput.value = '';
                customerEmailInput.value = '';
                customerAddressInput.value = '';
            }
        } else {
            console.warn("Selected opportunity does not exist:", selectedOpportunityId);
            showMessageBox("Selected opportunity does not exist.", false);
            // Clear fields if opportunity not found
            customerContactNameInput.value = '';
            customerPhoneInput.value = '';
            customerEmailInput.value = '';
            customerAddressInput.value = '';
        }
    } catch (error) {
        console.error("Error fetching customer details for opportunity:", error);
        showMessageBox(`Error fetching customer details: ${error.message}`, false);
        // Clear fields on error
        customerContactNameInput.value = '';
        customerPhoneInput.value = '';
        customerEmailInput.value = '';
        customerAddressInput.value = '';
    }
}


async function handleSaveQuote(event) {
    event.preventDefault();
    if (!db || userRole !== 'Admin') { // Only Admin can create/update quotes
        showMessageBox("Admin privileges required to save quote.", false);
        return;
    }

    const quoteId = document.getElementById('quote-id').value;
    const messageElement = document.getElementById('quote-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    // --- Client-Side Validation ---
    const requiredFields = quoteForm.querySelectorAll('[required]');
    let firstInvalidField = null;

    for (const field of requiredFields) {
        if (!field.value) {
            firstInvalidField = field;
            break;
        }
    }

    if (firstInvalidField) {
        console.warn('Validation failed: Required field is empty.', firstInvalidField);
        firstInvalidField.focus();
        messageElement.textContent = `Please fill in the required field: ${firstInvalidField.labels ? firstInvalidField.labels[0].textContent : firstInvalidField.id.replace(/-/g, ' ')}.`;
        messageElement.classList.remove('hidden');
        return;
    }
    // --- End Client-Side Validation ---

    const eventDateValue = document.getElementById('quote-event-date').value;
    const eventDateTimestamp = eventDateValue ? new Date(eventDateValue) : null;

    const quoteData = {
        quoteName: document.getElementById('quote-name').value,
        opportunityId: quoteOpportunitySelect.value,
        eventName: document.getElementById('event-name').value,
        customerContactName: customerContactNameInput.value, // Read-only, auto-filled
        phone: customerPhoneInput.value, // Read-only, auto-filled
        email: customerEmailInput.value, // Read-only, auto-filled
        customerAddress: customerAddressInput.value, // Read-only, auto-filled
        eventDate: eventDateTimestamp,
        additionalDetails: document.getElementById('quote-additional-details').value,
        quoteAmount: parseFloat(document.getElementById('quote-amount').value) || 0,
        status: quoteStatusSelect.value,
        creatorId: userId, // Set creatorId
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        const collectionRef = collection(db, 'quotes');
        if (quoteId) {
            // For update, only update updatedAt, not createdAt
            delete quoteData.createdAt;
            await updateDoc(doc(collectionRef, quoteId), quoteData);
            showMessageBox("Quote updated successfully!", false);
        } else {
            await addDoc(collectionRef, quoteData);
            showMessageBox("Quote added successfully!", false);
        }
        hideQuoteForm();
        await loadQuotes(); // Reload grid
    } catch (error) {
        console.error("Error saving quote:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving quote: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}

async function loadQuotes() {
    if (!db || !userId) {
        if (noQuotesMessage) noQuotesMessage.classList.remove('hidden');
        if (quotesGrid) quotesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    let quotesQuery;
    if (userRole === 'Admin') {
        // Admin can see all quotes
        quotesQuery = collection(db, 'quotes');
    } else {
        // Standard users can only see quotes tied to opportunities they created
        // This requires a more complex query or client-side filtering after fetching
        // For simplicity and to leverage security rules, we'll fetch all quotes
        // and let the security rules filter what the client is *allowed* to see.
        // The onSnapshot will only return documents that pass the read rule.
        quotesQuery = collection(db, 'quotes');
    }

    onSnapshot(quotesQuery, async snapshot => {
        const quotes = [];
        for (const docSnap of snapshot.docs) {
            const quoteData = docSnap.data();
            // Convert Firestore Timestamp to YYYY-MM-DD string for display
            const eventDateDisplay = quoteData.eventDate && quoteData.eventDate.toDate ? quoteData.eventDate.toDate().toISOString().split('T')[0] : 'N/A';
            quotes.push({ id: docSnap.id, ...quoteData, eventDate: eventDateDisplay });
        }
        renderQuotesGrid(quotes);
    }, error => {
        console.error("Error loading quotes in real-time:", error);
        showMessageBox(`Error loading quotes: ${error.message}`, false);
        if (noQuotesMessage) noQuotesMessage.classList.remove('hidden');
        if (quotesGrid) quotesGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderQuotesGrid(quotes) {
    const data = quotes.map(quote => [
        quote.quoteName,
        quote.eventName,
        quote.customerContactName,
        quote.phone,
        quote.email,
        `${quote.quoteAmount !== undefined ? quote.quoteAmount.toFixed(2) : 'N/A'}`,
        quote.status,
        quote.eventDate,
        quote.id
    ]);

    if (!quotesGrid) {
        if (quotesGridContainer) {
            quotesGrid = new gridjs.Grid({
                columns: [
                    { name: 'Quote Name', width: '15%' },
                    { name: 'Event Name', width: '15%' },
                    { name: 'Customer', width: '15%' },
                    { name: 'Phone', width: '10%' },
                    { name: 'Email', width: '15%' },
                    { name: 'Amount', width: '10%' },
                    { name: 'Status', width: '10%' },
                    { name: 'Event Date', width: '10%' },
                    {
                        name: 'Actions',
                        width: '10%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editQuote(row.cells[8].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteQuote(row.cells[8].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900', // Ensure text wrapping
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(quotesGridContainer);
        } else {
            console.error("quotesGridContainer not found, cannot render quotes grid.");
        }
    } else {
        quotesGrid.updateConfig({ data: data }).forceRender();
    }

    if (noQuotesMessage) {
        if (quotes.length === 0) {
            noQuotesMessage.classList.remove('hidden');
        } else {
            noQuotesMessage.classList.add('hidden');
        }
    }
}

async function editQuote(quoteId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, 'quotes', quoteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupQuoteForm(docSnap.data());
            document.getElementById('quote-id').value = quoteId;
        } else {
            showMessageBox("Quote not found!", false);
        }
    } catch (error) {
        console.error("Error editing quote:", error);
        showMessageBox(`Error loading quote for edit: ${error.message}`, false);
    }
}

async function deleteQuote(quoteId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this quote?", true);
    if (!confirmDelete) return;

    if (!db || !userId) return;
    try {
        await deleteDoc(doc(db, 'quotes', quoteId));
        showMessageBox("Quote deleted successfully!", false);
        await loadQuotes();
    } catch (error) {
        console.error("Error deleting quote:", error);
        showMessageBox(`Error deleting quote: ${error.message}`, false);
    }
}
