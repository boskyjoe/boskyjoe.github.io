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
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
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

// Grid.js instances
let customersGrid = null;
let opportunitiesGrid = null;
let countriesStatesGrid = null;
let currenciesGrid = null;
let priceBooksGrid = null;

// UI Elements (declared as const where they are immediately available)
const navDashboard = document.getElementById('nav-dashboard');
const navCustomers = document.getElementById('nav-customers');
const navOpportunities = document.getElementById('nav-opportunities');
const navCountries = document.getElementById('nav-countries');
const navCurrencies = document.getElementById('nav-currencies');
const navPriceBooks = document.getElementById('nav-price-books');
const navLogout = document.getElementById('nav-logout');
const adminMenuItem = document.getElementById('admin-menu-item'); // The parent li for admin dropdown

// No need for adminDropdownToggle and adminSubmenu variables as the dropdown is now CSS-driven.

const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const customersSection = document.getElementById('customers-section');
const opportunitiesSection = document.getElementById('opportunities-section');
const countriesSection = document.getElementById('countries-section');
const currenciesSection = document.getElementById('currencies-section');
const priceBooksSection = document.getElementById('price-books-section');

// Authentication elements (updated for Google Sign-In)
const googleSignInBtn = document.getElementById('google-signin-btn');
const authErrorMessage = document.getElementById('auth-error-message');

const userDisplayName = document.getElementById('user-display-name');
const userIdDisplay = document.getElementById('user-id-display');
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
// NEW: Grid.js container for customers
const customersGridContainer = document.getElementById('customers-grid-container');


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
// NEW: Grid.js container for opportunities
const opportunitiesGridContainer = document.getElementById('opportunities-grid-container');

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
const cancelCountryBtn = document.getElementById('cancel-country-btn');
const countryFormMessage = document.getElementById('country-form-message');
const countrySearchInput = document.getElementById('country-search');
const noCountriesMessage = document.getElementById('no-countries-message');
// NEW: Grid.js container for countries
const countriesGridContainer = document.getElementById('countries-grid-container');

// Currencies Elements
const addCurrencyBtn = document.getElementById('add-currency-btn');
const currencyFormContainer = document.getElementById('currency-form-container');
const currencyForm = document.getElementById('currency-form');
const currencyNameInput = document.getElementById('currency-name');
const currencyCodeInput = document.getElementById('currency-code');
const currencySymbolInput = document.getElementById('currency-symbol');
const cancelCurrencyBtn = document.getElementById('cancel-currency-btn');
const currencyFormMessage = document.getElementById('currency-form-message');
const currencySearchInput = document.getElementById('currency-search');
const noCurrenciesMessage = document.getElementById('no-currencies-message');
// NEW: Grid.js container for currencies
const currenciesGridContainer = document.getElementById('currencies-grid-container');

// Price Books Elements
const addPriceBookBtn = document.getElementById('add-price-book-btn');
const priceBookFormContainer = document.getElementById('price-book-form-container');
const priceBookForm = document.getElementById('price-book-form');
const priceBookNameInput = document.getElementById('price-book-name');
const priceBookDescriptionTextarea = document.getElementById('price-book-description');
const priceBookCountrySelect = document.getElementById('price-book-country');
const priceBookCurrencySelect = document.getElementById('price-book-currency');
const priceBookActiveCheckbox = document.getElementById('price-book-active'); // Changed to checkbox
const priceBookValidFromInput = document.getElementById('price-book-valid-from');
const priceBookValidToInput = document.getElementById('price-book-valid-to');
const cancelPriceBookBtn = document.getElementById('cancel-price-book-btn');
const priceBookFormMessage = document.getElementById('price-book-form-message');
const priceBookSearchInput = document.getElementById('price-book-search');
const noPriceBooksMessage = document.getElementById('no-price-books-message');
// NEW: Grid.js container for price books
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
 */
async function populateSelect(selectElement, collectionPath, valueField, textField, selectedValue = null) {
    if (!selectElement) {
        console.error(`populateSelect: selectElement is null for collection ${collectionPath}`);
        return;
    }
    selectElement.innerHTML = '<option value="">Select...</option>'; // Default empty option
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
            option.dataset.id = doc.id; // Store Firestore ID for reference if needed
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
        userIdDisplay.textContent = `ID: ${userId}`; // Display full user ID

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
        navOpportunities.classList.add('hidden');
        navCountries.classList.add('hidden'); // Hide admin sub-menu items too
        navCurrencies.classList.add('hidden');
        navPriceBooks.classList.add('hidden');

        // Clear grids if they exist
        if (customersGrid) { customersGrid.destroy(); customersGrid = null; }
        if (opportunitiesGrid) { opportunitiesGrid.destroy(); opportunitiesGrid = null; }
        if (countriesStatesGrid) { countriesStatesGrid.destroy(); countriesStatesGrid = null; }
        if (currenciesGrid) { currenciesGrid.destroy(); currenciesGrid = null; }
        if (priceBooksGrid) { priceBooksGrid.destroy(); priceBooksGrid = null; }

        // Clear grid containers
        if (customersGridContainer) customersGridContainer.innerHTML = '';
        if (opportunitiesGridContainer) opportunitiesGridContainer.innerHTML = '';
        if (countriesGridContainer) countriesGridContainer.innerHTML = '';
        if (currenciesGridContainer) currenciesGridContainer.innerHTML = '';
        if (priceBooksGridContainer) priceBooksGridContainer.innerHTML = '';


        // Clear dropdowns (ensure elements exist before trying to access them)
        if (customerCountrySelect) customerCountrySelect.innerHTML = '<option value="">Select...</option>';
        if (customerIndustrySelect) customerIndustrySelect.innerHTML = '<option value="">Select Industry</option>';
        if (customerSourceSelect) customerSourceSelect.innerHTML = '<option value="">Select Source</option>';
        if (opportunityCustomerSelect) opportunityCustomerSelect.innerHTML = '<option value="">Select a Customer</option>';
        if (opportunityCurrencySelect) opportunityCurrencySelect.innerHTML = '<option value="">Select...</option>';
        if (opportunityPriceBookSelect) opportunityPriceBookSelect.innerHTML = '<option value="">Select...</option>';
        if (priceBookCurrencySelect) priceBookCurrencySelect.innerHTML = '<option value="">Select...</option>';
        if (priceBookCountrySelect) priceBookCountrySelect.innerHTML = '<option value="">Select...</option>';
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
navOpportunities.addEventListener('click', () => { showSection(opportunitiesSection); renderOpportunitiesGrid(); populateOpportunityCustomerDropdown(); populateOpportunityCurrencyDropdown(); populateOpportunityPriceBookDropdown(); });

// No explicit JavaScript listener for Admin dropdown toggle needed here,
// as the dropdown is handled by CSS :hover on the parent li.

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
    } else {
        showMessageBox('Access Denied: You must be an Admin to access this feature.', false);
    }
});
navPriceBooks.addEventListener('click', () => {
    if (currentUserRole === 'Admin') {
        showSection(priceBooksSection);
        renderPriceBooksGrid();
        populatePriceBookCountryDropdown(); // Populate dropdown when section is active
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
    // Dynamically set the ID input value if it exists, otherwise ignore
    const idInput = formElement.querySelector('[id$="-id"]'); // Finds elements with ID ending in -id
    if (idInput) {
        idInput.value = idValue;
    }
    formContainer.classList.add('hidden');
    messageElement.classList.add('hidden');
    messageElement.textContent = '';
}

// Event listeners for cancel buttons on forms
// Note: We're passing an empty string for the ID value when resetting, as there's no hidden ID input in the HTML
cancelCustomerBtn.addEventListener('click', () => resetAndHideForm(customerForm, customerFormContainer, '', customerFormMessage));
cancelOpportunityBtn.addEventListener('click', () => resetAndHideForm(opportunityForm, opportunityFormContainer, '', opportunityFormMessage));
cancelCountryBtn.addEventListener('click', () => resetAndHideForm(countryForm, countryFormContainer, '', countryFormMessage));
cancelCurrencyBtn.addEventListener('click', () => resetAndHideForm(currencyForm, currencyFormContainer, '', currencyFormMessage));
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

    // Ensure window.gridjs is available before attempting to use it
    try {
        await waitForGridJs(); // Wait for Grid.js to be ready
    } catch (error) {
        // Error message already shown by waitForGridJs
        customersGridContainer.innerHTML = '<p class="text-center py-4 text-red-500">Error loading customer data.</p>';
        return;
    }

    // Show a loading indicator
    customersGridContainer.innerHTML = '<p class="text-center py-4 text-gray-500">Loading Customers...</p>';
    noCustomersMessage.classList.add('hidden');

    // FIX: Removed client-side filtering by creatorId for customers as per new Firestore rules.
    // Now all authenticated users can read all customers.
    let customersRef = collection(db, `customers`);
    let q = query(customersRef, orderBy('name'));
    const customerData = [];

    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            noCustomersMessage.classList.remove('hidden');
            customersGridContainer.innerHTML = ''; // Clear the container if no data
        } else {
            noCustomersMessage.classList.add('hidden');
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
        }

        // Initialize or update Grid.js
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
 * @param {string|null} selectedCurrencySymbol - The currency symbol to pre-select (optional).
 */
async function populateOpportunityCurrencyDropdown(selectedCurrencySymbol = null) {
    if (!currentUser) return;
    // Corrected path for public data
    await populateSelect(opportunityCurrencySelect, `currencies`, 'symbol', 'name', selectedCurrencySymbol);
}

/**
 * Populates the opportunity price book dropdown with data from the 'priceBooks' collection.
 * @param {string|null} selectedPriceBookId - The price book ID to pre-select (optional).
 */
async function populateOpportunityPriceBookDropdown(selectedPriceBookId = null) {
    if (!currentUser) return;
    const selectElement = opportunityPriceBookSelect;
    selectElement.innerHTML = '<option value="">Select a Price Book</option>';
    // Corrected path for public data
    const snapshot = await getDocs(query(collection(db, `priceBooks`), orderBy('name')));
    snapshot.forEach(doc => {
        const data = doc.data(); // Use doc.data() to get the object
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = data.name; // Access the name property
        if (selectedPriceBookId && doc.id === selectedPriceBookId) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

// Event listener to open the Opportunity Form for adding a new opportunity
addOpportunityBtn.addEventListener('click', () => {
    if (!currentUser) { showMessageBox('Please sign in to add opportunities.', false); return; }
    document.getElementById('opportunity-id').value = ''; // Clear ID for new opportunity
    resetAndHideForm(opportunityForm, opportunityFormContainer, '', opportunityFormMessage); // Clear and hide form
    opportunityFormContainer.classList.remove('hidden'); // Then show the container
    populateOpportunityCustomerDropdown();
    populateOpportunityCurrencyDropdown();
    populateOpportunityPriceBookDropdown();
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
        currency: opportunityCurrencySelect.value,
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
        if (snapshot.empty) {
            noOpportunitiesMessage.classList.remove('hidden');
            opportunitiesGridContainer.innerHTML = '';
        } else {
            noOpportunitiesMessage.classList.add('hidden');
            snapshot.forEach(doc => {
                const data = doc.data();
                opportunityData.push([
                    doc.id,
                    data.name,
                    data.customerName,
                    data.salesStage,
                    data.probability,
                    data.value,
                    data.currency,
                    data.expectedCloseDate,
                    data.createdAt,
                    data.creatorId // Added creatorId for rule check
                ]);
            });
        }

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
                            const currencySymbol = row.cells[6].data;
                            return cell.toLocaleString('en-US', { style: 'currency', currency: currencySymbol || 'USD' });
                        }
                    },
                    { id: 'currency', name: 'Currency', sort: true, filter: true },
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
                        // Search across name, customerName, salesStage
                        if (cellIndex === 1 || cellIndex === 2 || cellIndex === 3) {
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
                    'search': { 'placeholder': 'Search opportunities...' },
                    'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                    'noRecordsFound': 'No Opportunity Data Available',
                }
            }).render(opportunitiesGridContainer);
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

            opportunityFormContainer.classList.remove('hidden');
            opportunityFormMessage.classList.add('hidden');

            opportunityNameInput.value = data.name || '';
            await populateOpportunityCustomerDropdown(data.customerId);
            await populateOpportunityCurrencyDropdown(data.currency);
            await populateOpportunityPriceBookDropdown(data.priceBookId);
            opportunityExpectedStartDateInput.value = formatDateForInput(data.expectedStartDate);
            opportunityExpectedCloseDateInput.value = formatDateForInput(data.expectedCloseDate);
            opportunitySalesStageSelect.value = data.salesStage || '';
            opportunityProbabilityInput.value = data.probability || 0;
            opportunityValueInput.value = data.value || 0;
            opportunityNotesTextarea.value = data.notes || '';
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


// --- Countries Management (Admin Only) ---

// Event listener to open the Country Form for adding a new country
addCountryBtn.addEventListener('click', () => {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can add countries.', false); return; }
    document.getElementById('country-id').value = ''; // Clear ID for new country
    resetAndHideForm(countryForm, countryFormContainer, '', countryFormMessage); // Clear and hide form
    countryFormContainer.classList.remove('hidden'); // Then show the container
});

// Event listener to save (add or update) a country
countryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can save countries.', false); return; }

    const countryId = document.getElementById('country-id').value;

    const countryData = {
        name: countryNameInput.value.trim(),
        code: countryCodeInput.value.trim().toUpperCase(),
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
        renderCountriesStatesGrid();
        populateCustomerCountryDropdown(); // Refresh customer dropdown
        populatePriceBookCountryDropdown(); // Refresh price book dropdown
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
        if (snapshot.empty) {
            noCountriesMessage.classList.remove('hidden');
            countriesGridContainer.innerHTML = '';
        } else {
            noCountriesMessage.classList.add('hidden');
            snapshot.forEach(doc => {
                const country = doc.data();
                data.push([
                    doc.id,
                    country.name,
                    country.code
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
                        if (cellIndex === 1 || cellIndex === 2) {
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
        populatePriceBookCountryDropdown();
        populateOpportunityCustomerDropdown(); // Refresh opportunity customer dropdown (if it depends on countries)
    } catch (error) {
        console.error("Error deleting country:", error);
        showMessageBox('Error deleting country: ' + error.message, false);
    }
}


// --- Currencies Management (Admin Only) ---

// Event listener to open the Currency Form for adding a new currency
addCurrencyBtn.addEventListener('click', () => {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can add currencies.', false); return; }
    document.getElementById('currency-id').value = ''; // Clear ID for new currency
    resetAndHideForm(currencyForm, currencyFormContainer, '', currencyFormMessage); // Clear and hide form
    currencyFormContainer.classList.remove('hidden'); // Then show the container
});

// Event listener to save (add or update) a currency
currencyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can save currencies.', false); return; }

    const currencyId = document.getElementById('currency-id').value;

    const currencyData = {
        name: currencyNameInput.value.trim(),
        code: currencyCodeInput.value.trim().toUpperCase(),
        symbol: currencySymbolInput.value.trim()
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
        if (snapshot.empty) {
            noCurrenciesMessage.classList.remove('hidden');
            currenciesGridContainer.innerHTML = '';
        } else {
            noCurrenciesMessage.classList.add('hidden');
            snapshot.forEach(doc => {
                const currency = doc.data();
                data.push([
                    doc.id,
                    currency.name,
                    currency.code,
                    currency.symbol
                ]);
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
 * @param {string|null} selectedCurrencySymbol - The currency symbol to pre-select (optional).
 */
async function populatePriceBookCurrencyDropdown(selectedCurrencySymbol = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    // Corrected path for public data
    await populateSelect(priceBookCurrencySelect, `currencies`, 'symbol', 'name', selectedCurrencySymbol);
}

/**
 * Populates the price book country dropdown with data from the 'countries' collection.
 * @param {string|null} selectedCountryName - The country name to pre-select (optional).
 */
async function populatePriceBookCountryDropdown(selectedCountryName = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    // Corrected path for public data
    await populateSelect(priceBookCountrySelect, `countries`, 'name', 'name', selectedCountryName);
}

// Event listener to open the Price Book Form for adding a new price book
addPriceBookBtn.addEventListener('click', () => {
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can add price books.', false); return; }
    document.getElementById('price-book-id').value = ''; // Clear ID for new price book
    resetAndHideForm(priceBookForm, priceBookFormContainer, '', priceBookFormMessage); // Clear and hide form
    priceBookFormContainer.classList.remove('hidden'); // Then show the container
    priceBookActiveCheckbox.checked = true; // Default to active
    populatePriceBookCountryDropdown();
    populatePriceBookCurrencyDropdown();
});

// Event listener to save (add or update) a price book
priceBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') { showMessageBox('Access Denied: Only Admins can save price books.', false); return; }

    const normalizedName = priceBookNameInput.value.trim().toLowerCase().replace(/\s+/g, '');
    const normalizedCurrency = priceBookCurrencySelect.value.trim().toLowerCase().replace(/\s+/g, '');

    const priceBookId = document.getElementById('price-book-id').value;

    const priceBookData = {
        name: priceBookNameInput.value.trim(),
        normalizedName: normalizedName,
        description: priceBookDescriptionTextarea.value.trim(),
        country: priceBookCountrySelect.value,
        currency: priceBookCurrencySelect.value,
        normalizedCurrency: normalizedCurrency,
        isActive: priceBookActiveCheckbox.checked,
        validFrom: priceBookValidFromInput.value ? Timestamp.fromDate(new Date(priceBookValidFromInput.value)) : null,
        validTo: priceBookValidToInput.value ? Timestamp.fromDate(new Date(priceBookValidToInput.value)) : null,
    };

    const newIndexId = getPriceBookIndexId(priceBookData.name, priceBookData.currency);

    try {
        // Client-Side Uniqueness Validation for Price Book (Name, Currency)
        const existingIndexDoc = await getDoc(doc(db, `priceBookNameCurrencyIndexes`, newIndexId));

        if (existingIndexDoc.exists()) {
            if (existingIndexDoc.data().priceBookId !== priceBookId) {
                priceBookFormMessage.textContent = 'A price book with this Name and Currency already exists. Please choose a unique combination.';
                priceBookFormMessage.classList.remove('hidden');
                return;
            }
        }

        let docRef;
        if (priceBookId) {
            docRef = doc(db, `priceBooks`, priceBookId);
            await updateDoc(docRef, priceBookData);
            showMessageBox('Price Book updated successfully!', false);

            const oldPriceBookDoc = await getDoc(doc(db, `priceBooks`, priceBookId));
            const oldPriceBookData = oldPriceBookDoc.data();
            const oldIndexId = getPriceBookIndexId(oldPriceBookData.name, oldPriceBookData.currency);

            if (oldIndexId !== newIndexId) {
                await deleteDoc(doc(db, `priceBookNameCurrencyIndexes`, oldIndexId));
                await setDoc(doc(db, `priceBookNameCurrencyIndexes`, newIndexId), {
                    priceBookId: priceBookId,
                    priceBookName: priceBookData.normalizedName,
                    priceBookCurrency: priceBookData.normalizedCurrency
                });
            }
        } else {
            const newDocRef = await addDoc(collection(db, `priceBooks`), priceBookData);
            docRef = newDocRef;
            showMessageBox('Price Book added successfully!', false);

            await setDoc(doc(db, `priceBookNameCurrencyIndexes`, newIndexId), {
                priceBookId: docRef.id,
                priceBookName: priceBookData.normalizedName,
                priceBookCurrency: priceBookData.normalizedCurrency
            });
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
 * Renders or updates the Grid.js table for price books.
 * Fetches data from the 'priceBooks' collection.
 */
async function renderPriceBooksGrid() {
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
        if (snapshot.empty) {
            noPriceBooksMessage.classList.remove('hidden');
            priceBooksGridContainer.innerHTML = '';
        } else {
            noPriceBooksMessage.classList.add('hidden');
            snapshot.forEach(doc => {
                const priceBook = doc.data();
                data.push([
                    doc.id,
                    priceBook.name,
                    priceBook.description,
                    priceBook.country || '',
                    priceBook.currency || '',
                    priceBook.isActive,
                    priceBook.validFrom,
                    priceBook.validTo
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
                    { id: 'country', name: 'Country', sort: true, filter: true },
                    { id: 'currency', name: 'Currency', sort: true, filter: true },
                    { id: 'isActive', name: 'Active', sort: true, filter: true, formatter: (cell) => cell ? 'Yes' : 'No' },
                    { id: 'validFrom', name: 'Valid From', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
                    { id: 'validTo', name: 'Valid To', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
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
                        if (cellIndex === 1 || cellIndex === 2 || cellIndex === 3 || cellIndex === 4) {
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
            await populatePriceBookCountryDropdown(data.country);
            await populatePriceBookCurrencyDropdown(data.currency);
            priceBookActiveCheckbox.checked = data.isActive;
            priceBookValidFromInput.value = formatDateForInput(data.validFrom);
            priceBookValidToInput.value = formatDateForInput(data.validTo);

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
        const docSnap = await getDoc(doc(db, `priceBooks`, id));
        if (!docSnap.exists()) {
            showMessageBox('Price Book not found!', false);
            return;
        }
        const data = docSnap.data();
        const indexId = getPriceBookIndexId(data.name, data.currency);

        await deleteDoc(doc(db, `priceBooks`, id));
        // Also delete the corresponding index document
        await deleteDoc(doc(db, `priceBookNameCurrencyIndexes`, indexId));

        showMessageBox('Price Book deleted successfully!', false);
        renderPriceBooksGrid();
        populateOpportunityPriceBookDropdown();
    } catch (error) {
        console.error("Error deleting price book:", error);
        showMessageBox('Error deleting price book: ' + error.message, false);
    }
}

// --- Initial Load ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded fired.');

    // Attempt to sign in with custom token if available
    // This is for Canvas environment auto-login. If it fails, manual login is required.
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
    navOpportunities.classList.add('hidden');
    adminMenuItem.classList.add('hidden'); // Hide admin menu by default
    navLogout.classList.add('hidden');

    // Attach change listener for priceBookCountrySelect
    if (priceBookCountrySelect) {
        priceBookCountrySelect.addEventListener('change', async () => {
            const selectedCountry = priceBookCountrySelect.value;
            if (selectedCountry) {
                // In this version, we're not filtering currencies by country.
                // The dropdown will always show all available currencies.
                await populatePriceBookCurrencyDropdown(null);
            } else {
                await populatePriceBookCurrencyDropdown();
            }
        });
    }
});
