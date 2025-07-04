// Firebase SDK Imports (Modular API)
// Using Firebase SDK version 10.0.0 for compatibility.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs, serverTimestamp, Timestamp, setDoc } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js';

// Grid.js ES Module Import
import { Grid, h } from 'https://cdnjs.cloudflare.com/ajax/libs/gridjs/6.2.0/gridjs.module.min.js';


// Firebase configuration:
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo", // Your actual API Key - PRESERVED
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.appspot.com", // Corrected storageBucket
    messagingSenderId: "10782416018",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Get Auth service
const db = getFirestore(app); // Get Firestore service

// Global variables
let currentUser = null;
let currentUserRole = 'Guest'; // Default role
// Grid.js instances - now directly accessible without window.
let customersGrid = null;
let opportunitiesGrid = null;
let countriesStatesGrid = null;
let currenciesGrid = null;
let priceBooksGrid = null;

// UI Elements
const navButtons = document.querySelectorAll('.nav-button');
const modules = document.querySelectorAll('.module');
const authButtonSignOut = document.getElementById('authButton'); // For the "Sign Out" button inside user-info
const authButtonSignIn = document.getElementById('authButtonAnon'); // For the "Sign In with Google" button
const userInfoDisplay = document.getElementById('userInfoDisplay');
const userNameSpan = document.getElementById('userName');
const userRoleSpan = document.getElementById('userRole');
const adminNavButton = document.querySelector('.nav-button[data-module="admin"]'); // Get the Admin nav button


// Customer Modal Elements
const addCustomerBtn = document.getElementById('addCustomerBtn');
const customerModal = document.getElementById('customerModal');
const customerModalTitle = document.getElementById('customerModalTitle');
const closeCustomerModalBtn = customerModal.querySelector('.close-button');
const customerForm = document.getElementById('customerForm');
const customerIdInput = document.getElementById('customerId');
const customerTypeSelect = document.getElementById('customerType');
const customerNameInput = document.getElementById('customerName');
const customerEmailInput = document.getElementById('customerEmail');
const customerPhoneInput = document.getElementById('customerPhone');
const customerAddressTextarea = document.getElementById('customerAddress');
const customerCountrySelect = document.getElementById('customerCountry');
// FIX: Corrected typo - removed 'document ='
const customerPreferredContactMethodSelect = document.getElementById('customerPreferredContactMethod');
const customerIndustrySelect = document.getElementById('customerIndustry');
const customerAdditionalDetailsTextarea = document.getElementById('customerAdditionalDetails');
const customerSourceSelect = document.getElementById('customerSource');
const customerActiveSelect = document.getElementById('customerActive');

// Opportunity Modal Elements
const addOpportunityBtn = document.getElementById('addOpportunityBtn');
const opportunityModal = document.getElementById('opportunityModal');
const opportunityModalTitle = document.getElementById('opportunityModalTitle');
const closeOpportunityModalBtn = opportunityModal.querySelector('.close-button');
const opportunityForm = document.getElementById('opportunityForm');
const opportunityIdInput = document.getElementById('opportunityId');
const opportunityNameInput = document.getElementById('opportunityName');
const opportunityCustomerSelect = document.getElementById('opportunityCustomer');
const opportunityCurrencySelect = document.getElementById('opportunityCurrency');
const opportunityPriceBookSelect = document.getElementById('opportunityPriceBook');
const opportunityExpectedStartDateInput = document.getElementById('opportunityExpectedStartDate');
const opportunityExpectedCloseDateInput = document.getElementById('opportunityExpectedCloseDate');
const opportunitySalesStageSelect = document.getElementById('opportunitySalesStage');
const opportunityProbabilityInput = document.getElementById('opportunityProbability');
const opportunityValueInput = document.getElementById('opportunityValue');
const opportunityNotesTextarea = document.getElementById('opportunityNotes');

// Dashboard Elements
const totalCustomersCount = document.getElementById('totalCustomersCount');
const totalOpportunitiesCount = document.getElementById('totalOpportunitiesCount');
const openOpportunitiesCount = document.getElementById('openOpportunitiesCount');
const wonOpportunitiesCount = document.getElementById('wonOpportunitiesCount');

// Admin Panel Elements
const adminOnlyElements = document.querySelectorAll('.admin-only');
const adminSectionBtns = document.querySelectorAll('.admin-section-btn');
const adminSubsections = document.querySelectorAll('.admin-subsection');

// Countries & States Elements
const countryStateForm = document.getElementById('countryStateForm');
const countryStateIdInput = document.getElementById('countryStateId');
const countryNameInput = document.getElementById('countryName');
const countryCodeInput = document.getElementById('countryCode');
const countryStatesInput = document.getElementById('countryStates');
const cancelCountryStateEditBtn = countryStateForm.querySelector('.cancel-edit-btn');

// Currencies Elements
const currencyForm = document.getElementById('currencyForm');
const currencyIdInput = document.getElementById('currencyId');
const currencyNameInput = document.getElementById('currencyName');
const currencySymbolInput = document.getElementById('currencySymbol');
const currencyCountrySelect = document.getElementById('currencyCountry');
const cancelCurrencyEditBtn = currencyForm.querySelector('.cancel-edit-btn');

// Price Books Elements
const priceBookForm = document.getElementById('priceBookForm');
const priceBookIdInput = document.getElementById('priceBookId');
const priceBookNameInput = document.getElementById('priceBookName');
const priceBookDescriptionTextarea = document.getElementById('priceBookDescription');
const priceBookCurrencySelect = document.getElementById('priceBookCurrency');
const priceBookIsActiveSelect = document.getElementById('priceBookIsActive');
const priceBookValidFromInput = document.getElementById('priceBookValidFrom');
const priceBookValidToInput = document.getElementById('priceBookValidTo');
const cancelPriceBookEditBtn = priceBookForm.querySelector('.cancel-edit-btn');

// App Settings Elements
const appSettingsForm = document.getElementById('appSettingsForm');
const settingsDocIdInput = document.getElementById('settingsDocId');
const defaultCurrencySelect = document.getElementById('defaultCurrency');
const defaultCountrySelect = document.getElementById('defaultCountry');
const cancelSettingsEditBtn = appSettingsForm.querySelector('.cancel-edit-btn');

// Custom Message Box Elements
const messageBoxModal = document.getElementById('messageBoxModal');
const messageBoxTitle = document.getElementById('messageBoxTitle');
const messageBoxMessage = document.getElementById('messageBoxMessage');
const messageBoxCloseBtn = document.getElementById('messageBoxCloseBtn');
const messageBoxOkBtn = document.getElementById('messageBoxOkBtn');


// --- Utility Functions ---

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
 * @param {string} collectionName - The name of the Firestore collection.
 * @param {string} valueField - The field from the document to use as the <option> value.
 * @param {string} textField - The field from the document to use as the <option> text.
 * @param {string|null} selectedValue - The value to pre-select in the dropdown (optional).
 */
async function populateSelect(selectElement, collectionName, valueField, textField, selectedValue = null) {
    selectElement.innerHTML = '<option value="">Select...</option>'; // Default empty option
    try {
        const collectionRef = collection(db, collectionName);
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
        console.error(`Error fetching data for dropdown ${collectionName}:`, error);
        // showMessage('error', 'Dropdown Error', `Could not load data for ${collectionName}.`);
    }
}

/**
 * Displays a custom message box.
 * @param {'success'|'error'|'info'} type - The type of message ('success', 'error', or 'info').
 * @param {string} title - The title of the message box.
 * @param {string} message - The message content.
 */
function showMessage(type, title, message) {
    messageBoxTitle.textContent = title;
    messageBoxMessage.textContent = message;

    // Remove existing type classes
    messageBoxModal.classList.remove('success', 'error', 'info');

    // Add new type class
    messageBoxModal.classList.add(type);

    messageBoxModal.style.display = 'flex'; // Show the modal
}

// Event listeners for message box close buttons
messageBoxCloseBtn.addEventListener('click', () => {
    messageBoxModal.style.display = 'none';
});

messageBoxOkBtn.addEventListener('click', () => {
    messageBoxModal.style.display = 'none';
});

// Close message box on outside click
window.addEventListener('click', (event) => {
    if (event.target === messageBoxModal) {
        messageBoxModal.style.display = 'none';
    }
});


// --- Authentication ---

// Listens for Firebase authentication state changes
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        // User is signed in
        authButtonSignOut.textContent = 'Sign Out';
        userInfoDisplay.style.display = 'block';
        authButtonSignIn.style.display = 'none';

        try {
            // Fetch user's custom claims for role from Firestore
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
            showMessage('error', 'Profile Error', 'Could not load user profile. Defaulting to Standard role.');
        }

        userNameSpan.textContent = user.displayName || user.email;
        userRoleSpan.textContent = currentUserRole;

        // Show/hide admin navigation button based on role
        if (currentUserRole === 'Admin') {
            adminNavButton.style.display = 'block';
        } else {
            adminNavButton.style.display = 'none';
        }

        // Initialize and render all grids after user is logged in
        // These functions will check if the grid already exists before re-rendering
        renderCustomersGrid();
        renderOpportunitiesGrid();
        renderCountriesStatesGrid();
        renderCurrenciesGrid();
        renderPriceBooksGrid();

        // Populate dynamic data for forms (e.g., dropdowns)
        populateCustomerCountryDropdown();
        populateOpportunityCustomerDropdown();
        populateOpportunityCurrencyDropdown();
        populateOpportunityPriceBookDropdown();
        populateDefaultCurrencyDropdown();
        populateDefaultCountryDropdown();
        loadAppSettings(); // Load app settings for admin panel

        // Set initial module to dashboard
        document.querySelector('.nav-button[data-module="dashboard"]').click();

    } else {
        // User is signed out
        authButtonSignIn.textContent = 'Sign In with Google';
        authButtonSignIn.classList.add('sign-in');
        authButtonSignIn.style.display = 'block';
        userInfoDisplay.style.display = 'none';
        userNameSpan.textContent = 'Guest';
        userRoleSpan.textContent = 'N/A';
        currentUserRole = 'Guest';

        // Hide admin nav button if user signs out
        adminNavButton.style.display = 'none';

        // Clear grids or show empty state if not logged in
        if (customersGrid) customersGrid.updateConfig({ data: [] }).forceRender();
        if (opportunitiesGrid) opportunitiesGrid.updateConfig({ data: [] }).forceRender();
        if (countriesStatesGrid) countriesStatesGrid.updateConfig({ data: [] }).forceRender();
        if (currenciesGrid) currenciesGrid.updateConfig({ data: [] }).forceRender();
        if (priceBooksGrid) priceBooksGrid.updateConfig({ data: [] }).forceRender();

        // Clear dropdowns
        customerCountrySelect.innerHTML = '<option value="">Select...</option>';
        customerIndustrySelect.innerHTML = '<option value="">Select Industry</option>';
        customerSourceSelect.innerHTML = '<option value="">Select Source</option>';
        opportunityCustomerSelect.innerHTML = '<option value="">Select...</option>';
        opportunityCurrencySelect.innerHTML = '<option value="">Select...</option>';
        opportunityPriceBookSelect.innerHTML = '<option value="">Select...</option>';
        priceBookCurrencySelect.innerHTML = '<option value="">Select...</option>';
        currencyCountrySelect.innerHTML = '<option value="">Select Country</option>';
        defaultCurrencySelect.innerHTML = '<option value="">Select...</option>';
        defaultCountrySelect.innerHTML = '<option value="">Select...</option>';

        // Hide all modules
        modules.forEach(mod => mod.classList.remove('active'));
    }
});

// Event listener for Sign Out button
authButtonSignOut.addEventListener('click', () => {
    if (currentUser) {
        signOut(auth).then(() => {
            showMessage('success', 'Signed Out', 'Signed out successfully!');
        }).catch((error) => {
            console.error('Sign Out Error:', error);
            showMessage('error', 'Sign Out Error', 'Error signing out: ' + error.message);
        });
    }
});

// Event listener for Sign In with Google button
authButtonSignIn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).then((result) => {
        console.log('Signed in as:', result.user.displayName);
        showMessage('success', 'Signed In', `Welcome, ${result.user.displayName || result.user.email}!`);
    }).catch((error) => {
        console.error('Sign In Error:', error);
        showMessage('error', 'Sign In Error', 'Error signing in: ' + error.message);
    });
});


// --- Navigation ---

navButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove 'active' class from all nav buttons and hide all modules
        navButtons.forEach(btn => btn.classList.remove('active'));
        modules.forEach(mod => mod.classList.remove('active'));

        // Add 'active' class to clicked button and show corresponding module
        button.classList.add('active');
        const moduleToShow = document.getElementById(`${button.dataset.module}Module`);

        // Check if module is admin-only and current user is not an admin
        if (moduleToShow.classList.contains('admin-only') && currentUserRole !== 'Admin') {
            showMessage('error', 'Access Denied', 'You do not have permission to access this module.');
            // Redirect to dashboard or previous module if access is denied
            document.querySelector('.nav-button[data-module="dashboard"]').click();
            return;
        }

        moduleToShow.classList.add('active');

        // Perform specific actions when a module is activated
        if (button.dataset.module === 'dashboard') {
            updateDashboardStats();
        } else if (button.dataset.module === 'customers') {
            renderCustomersGrid(); // Re-render to ensure data is fresh
        } else if (button.dataset.module === 'opportunities') {
            renderOpportunitiesGrid(); // Re-render to ensure data is fresh
        } else if (button.dataset.module === 'admin') {
            // Ensure the first admin subsection is active and load its data
            adminSectionBtns.forEach(btn => btn.classList.remove('active'));
            adminSubsections.forEach(sub => sub.classList.remove('active'));
            const defaultAdminBtn = document.querySelector('.admin-section-btn[data-admin-target="countriesStates"]');
            const defaultAdminSection = document.getElementById('countriesStatesSection');

            if (defaultAdminBtn) defaultAdminBtn.classList.add('active');
            if (defaultAdminSection) defaultAdminSection.classList.add('active');

            renderCountriesStatesGrid(); // Load data for the default subsection
            loadAppSettings(); // Load app settings for admin panel
        }
    });
});


// --- Dashboard Module ---

/**
 * Updates the statistics displayed on the dashboard.
 * Fetches counts for total customers, total opportunities, open opportunities, and won opportunities.
 */
async function updateDashboardStats() {
    if (!currentUser) return; // Ensure user is authenticated

    try {
        let customerQuery = query(collection(db, 'customers'));
        // Filter customers by creatorId if not an Admin
        if (currentUserRole !== 'Admin') {
            customerQuery = query(customerQuery, where('creatorId', '==', currentUser.uid));
        }
        const customersSnapshot = await getDocs(customerQuery);
        totalCustomersCount.textContent = customersSnapshot.size;

        let opportunityQuery = query(collection(db, 'opportunities'));
        // Filter opportunities by creatorId if not an Admin
        if (currentUserRole !== 'Admin') {
            opportunityQuery = query(opportunityQuery, where('creatorId', '==', currentUser.uid));
        }
        const opportunitiesSnapshot = await getDocs(opportunityQuery);
        totalOpportunitiesCount.textContent = opportunitiesSnapshot.size;

        const openOpportunities = opportunitiesSnapshot.docs.filter(doc =>
            doc.data().salesStage !== 'Won' && doc.data().salesStage !== 'Lost'
        );
        openOpportunitiesCount.textContent = openOpportunities.length;

        const wonOpportunities = opportunitiesSnapshot.docs.filter(doc =>
            doc.data().salesStage === 'Won'
        );
        wonOpportunitiesCount.textContent = wonOpportunities.length;

    } catch (error) {
        console.error("Error updating dashboard stats:", error);
        showMessage('error', 'Dashboard Error', 'Could not load dashboard statistics.');
    }
}


// --- Modals General Logic ---

// Event listeners for closing all modals using the close button
document.querySelectorAll('.modal .close-button').forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
        resetForms(); // Reset forms when modal is closed
    });
});

// Event listener for closing modals by clicking outside the modal content
window.addEventListener('click', (event) => {
    if (event.target === customerModal) {
        customerModal.style.display = 'none';
        resetForms();
    }
    if (event.target === opportunityModal) {
        opportunityModal.style.display = 'none';
        resetForms();
    }
    // Add other modals here if they are not children of the main window click listener
});

/**
 * Resets all form fields and hidden IDs in the application.
 * Also repopulates dynamic dropdowns to their default state.
 */
function resetForms() {
    customerForm.reset();
    customerIdInput.value = '';
    opportunityForm.reset();
    opportunityIdInput.value = '';
    countryStateForm.reset();
    countryStateIdInput.value = '';
    currencyForm.reset();
    currencyIdInput.value = '';
    priceBookForm.reset();
    priceBookIdInput.value = '';
    appSettingsForm.reset();
    settingsDocIdInput.value = '';

    // Reset Price Book specific fields to their default values
    priceBookIsActiveSelect.value = 'Yes'; // Default to Yes
    priceBookValidFromInput.value = '';
    priceBookValidToInput.value = '';

    // Manually reset other dropdowns to their initial "Select..." or default option
    customerTypeSelect.value = 'Individual';
    customerPreferredContactMethodSelect.value = 'Email';
    customerActiveSelect.value = 'Yes';
    customerIndustrySelect.value = ''; // Clear for new entry
    customerSourceSelect.value = ''; // Clear for new entry
    opportunitySalesStageSelect.value = 'Prospect';
    
    // Repopulate dynamic dropdowns to ensure initial "Select..." option is present and data is fresh
    populateCustomerCountryDropdown();
    populateOpportunityCustomerDropdown();
    populateOpportunityCurrencyDropdown();
    populateOpportunityPriceBookDropdown();
    populatePriceBookCurrencyDropdown();
    populateCurrencyCountryDropdown();
    populateDefaultCurrencyDropdown();
    populateDefaultCountryDropdown();
}


// --- Customers Module ---

/**
 * Populates the customer country dropdown with data from the 'countries' collection.
 * @param {string|null} selectedCountry - The country name to pre-select (optional).
 */
async function populateCustomerCountryDropdown(selectedCountry = null) {
    if (!currentUser) return;
    await populateSelect(customerCountrySelect, 'countries', 'name', 'name', selectedCountry);
}

// Event listener to open the Customer Modal for adding a new customer
addCustomerBtn.addEventListener('click', () => {
    customerForm.reset();
    customerIdInput.value = ''; // Clear ID for new customer
    customerModalTitle.textContent = 'Add New Customer';
    
    // Set default values for new entry
    customerTypeSelect.value = 'Individual';
    customerPreferredContactMethodSelect.value = 'Email';
    customerActiveSelect.value = 'Yes';
    customerIndustrySelect.value = '';
    customerSourceSelect.value = '';

    populateCustomerCountryDropdown(); // Repopulate to ensure fresh data
    customerModal.style.display = 'flex';
});

// Event listener to save (add or update) a customer
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }

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
        active: customerActiveSelect.value === 'Yes', // Convert string 'Yes'/'No' to boolean
        updatedAt: serverTimestamp() // Set or update timestamp
    };

    try {
        if (customerIdInput.value) {
            // Update existing customer
            await updateDoc(doc(db, 'customers', customerIdInput.value), customerData);
            showMessage('success', 'Success', 'Customer updated successfully!');
        } else {
            // Add new customer
            customerData.createdAt = serverTimestamp(); // Set creation timestamp for new record
            customerData.creatorId = currentUser.uid; // Assign current user as creator
            await addDoc(collection(db, 'customers'), customerData);
            showMessage('success', 'Success', 'Customer added successfully!');
        }
        customerModal.style.display = 'none';
        renderCustomersGrid(); // Refresh the customers table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error saving customer:", error);
        showMessage('error', 'Error Saving Customer', 'Error saving customer: ' + error.message);
    }
});

/**
 * Renders or updates the Grid.js table for customers.
 * Fetches customer data from Firestore and displays it.
 */
async function renderCustomersGrid() {
    if (!currentUser) return;

    let customersRef = query(collection(db, 'customers'));
    // Filter customers by creatorId if not an Admin
    if (currentUserRole !== 'Admin') {
        customersRef = query(customersRef, where('creatorId', '==', currentUser.uid));
    }
    const customerData = [];

    const snapshot = await getDocs(query(customersRef, orderBy('name'))); // Order by name for consistent display
    snapshot.forEach(doc => {
        const data = doc.data();
        customerData.push([
            doc.id, // Hidden ID for actions
            data.name,
            data.type,
            data.email,
            data.phone,
            data.address,
            data.country,
            data.preferredContactMethod,
            data.industry,
            data.source,
            data.active,
            data.createdAt // Firestore Timestamp
        ]);
    });

    if (customersGrid) {
        customersGrid.updateConfig({ data: customerData }).forceRender(); // Update existing grid
    } else {
        const containerElement = document.getElementById('customersTable');
        if (containerElement) {
            containerElement.innerHTML = ''; // Clear existing content before rendering new grid
        }
        customersGrid = new Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true },
                { id: 'name', name: 'Name', sort: true, filter: true },
                { id: 'type', name: 'Type', sort: true, filter: true },
                { id: 'email', name: 'Email', sort: true, filter: true },
                { id: 'phone', name: 'Phone', sort: true, filter: true },
                { id: 'address', name: 'Address', sort: true, filter: true },
                { id: 'country', name: 'Country', sort: true, filter: true },
                { id: 'preferredContactMethod', name: 'Preferred Contact', sort: true, filter: true },
                { id: 'industry', name: 'Industry', sort: true, filter: true },
                { id: 'source', name: 'Source', sort: true, filter: true },
                { id: 'active', name: 'Active', sort: true, filter: true, formatter: (cell) => cell ? 'Yes' : 'No' },
                { id: 'createdAt', name: 'Created At', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data; // Get document ID from the first hidden cell
                        return h('div', { className: 'action-icons' },
                            h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Customer',
                                onClick: () => editCustomer(docId)
                            }),
                            h('span', {
                                className: 'fa-solid fa-trash',
                                title: 'Delete Customer',
                                onClick: () => deleteCustomer(docId)
                            })
                        );
                    }
                }
            ],
            data: customerData,
            search: true, // Global search
            pagination: { enabled: true, limit: 10, summary: true },
            sort: true,
            resizable: true,
            className: { // Custom CSS classes for Grid.js elements
                container: 'gridjs-container', table: 'gridjs-table', thead: 'gridjs-thead', th: 'gridjs-th',
                td: 'gridjs-td', tr: 'gridjs-tr', footer: 'gridjs-footer', pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary', 'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav', 'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next', 'pagination-btn': 'gridjs-pagination-btn',
                'pagination-btn-current': 'gridjs-currentPage',
            },
            language: { // Customizing Grid.js text
                'search': { 'placeholder': 'Search customers...' },
                'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                'noRecordsFound': 'No Customer Data Available',
            }
        }).render(containerElement);
    }
}

/**
 * Populates the customer modal with existing data for editing.
 * @param {string} customerId - The ID of the customer document to edit.
 */
async function editCustomer(customerId) {
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }
    // Role check for editing - only Admin or creator can edit
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Standard') { showMessage('error', 'Access Denied', 'You do not have permission to edit customers.'); return; }

    try {
        const docSnap = await getDoc(doc(db, 'customers', customerId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Further check if the current user is the creator (if not admin)
            if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
                showMessage('error', 'Access Denied', 'You can only edit customers you have created.');
                return;
            }

            customerIdInput.value = docSnap.id;
            customerModalTitle.textContent = 'Edit Customer';

            customerTypeSelect.value = data.type || '';
            customerNameInput.value = data.name || '';
            customerEmailInput.value = data.email || '';
            customerPhoneInput.value = data.phone || '';
            customerAddressTextarea.value = data.address || '';
            await populateCustomerCountryDropdown(data.country); // Pre-select country
            customerPreferredContactMethodSelect.value = data.preferredContactMethod || '';
            customerIndustrySelect.value = data.industry || '';
            customerAdditionalDetailsTextarea.value = data.additionalDetails || '';
            customerSourceSelect.value = data.source || '';
            customerActiveSelect.value = data.active ? 'Yes' : 'No';

            customerModal.style.display = 'flex';
        } else {
            showMessage('error', 'Not Found', 'Customer not found!');
        }
    } catch (error) {
        console.error("Error editing customer:", error);
        showMessage('error', 'Error Loading Customer', 'Error loading customer for edit: ' + error.message);
    }
}

/**
 * Deletes a customer document from Firestore.
 * Requires Admin role. Includes a check for linked opportunities.
 * @param {string} customerId - The ID of the customer document to delete.
 */
async function deleteCustomer(customerId) {
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }
    if (currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'You do not have permission to delete customers.'); return; }

    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this customer? This action cannot be undone. If you are sure, click OK and then click the trash icon again.');

    try {
        // Check if there are any opportunities linked to this customer
        const opportunitiesSnapshot = await getDocs(query(collection(db, 'opportunities'), where('customerId', '==', customerId)));
        if (!opportunitiesSnapshot.empty) {
            showMessage('error', 'Cannot Delete', 'Cannot delete customer: There are existing opportunities linked to this customer. Please delete the opportunities first.');
            return;
        }

        await deleteDoc(doc(db, 'customers', customerId));
        showMessage('success', 'Success', 'Customer deleted successfully!');
        renderCustomersGrid(); // Refresh the table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error deleting customer:", error);
        showMessage('error', 'Error Deleting Customer', 'Error deleting customer: ' + error.message);
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
    let customerQuery = query(collection(db, 'customers'), orderBy('name'));
    // Filter customers by creatorId if not an Admin, so users only see their own customers
    if (currentUserRole !== 'Admin') {
        customerQuery = query(customerQuery, where('creatorId', '==', currentUser.uid));
    }
    const snapshot = await getDocs(customerQuery);
    snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = doc.id; // Use Firestore doc ID as value
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
    await populateSelect(opportunityCurrencySelect, 'currencies', 'symbol', 'name', selectedCurrencySymbol);
}

/**
 * Populates the opportunity price book dropdown with data from the 'priceBooks' collection.
 * @param {string|null} selectedPriceBookId - The price book ID to pre-select (optional).
 */
async function populateOpportunityPriceBookDropdown(selectedPriceBookId = null) {
    if (!currentUser) return;
    const selectElement = opportunityPriceBookSelect;
    selectElement.innerHTML = '<option value="">Select a Price Book</option>';
    const snapshot = await getDocs(query(collection(db, 'priceBooks'), orderBy('name')));
    snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = doc.id; // Use Firestore doc ID as value
        option.textContent = data.name;
        if (selectedPriceBookId && doc.id === selectedPriceBookId) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

// Event listener to open the Opportunity Modal for adding a new opportunity
addOpportunityBtn.addEventListener('click', () => {
    opportunityForm.reset();
    opportunityIdInput.value = ''; // Clear ID for new opportunity
    opportunityModalTitle.textContent = 'Add New Opportunity';
    populateOpportunityCustomerDropdown(); // Repopulate customer dropdown
    populateOpportunityCurrencyDropdown(); // Repopulate currency dropdown
    populateOpportunityPriceBookDropdown(); // Repopulate price book dropdown
    opportunityModal.style.display = 'flex';
});

// Event listener to close the Opportunity Modal
closeOpportunityModalBtn.addEventListener('click', () => {
    opportunityModal.style.display = 'none';
});

// Event listener to save (add or update) an opportunity
opportunityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }

    // Get the display name of the selected customer for storage (denormalization)
    const selectedCustomerOption = opportunityCustomerSelect.options[opportunityCustomerSelect.selectedIndex];
    const customerName = selectedCustomerOption ? selectedCustomerOption.textContent : '';

    const opportunityData = {
        name: opportunityNameInput.value.trim(),
        customerId: opportunityCustomerSelect.value, // Store customer ID
        customerName: customerName, // Store customer name for easier display/search
        currency: opportunityCurrencySelect.value, // This is the symbol
        priceBookId: opportunityPriceBookSelect.value, // Store price book ID
        expectedStartDate: opportunityExpectedStartDateInput.value ? Timestamp.fromDate(new Date(opportunityExpectedStartDateInput.value)) : null,
        expectedCloseDate: opportunityExpectedCloseDateInput.value ? Timestamp.fromDate(new Date(opportunityExpectedCloseDateInput.value)) : null,
        salesStage: opportunitySalesStageSelect.value,
        probability: parseInt(opportunityProbabilityInput.value, 10), // Ensure it's an integer
        value: parseFloat(opportunityValueInput.value), // Ensure it's a float
        notes: opportunityNotesTextarea.value.trim(),
        updatedAt: serverTimestamp()
    };

    try {
        if (opportunityIdInput.value) {
            // Update existing opportunity
            await updateDoc(doc(db, 'opportunities', opportunityIdInput.value), opportunityData);
            showMessage('success', 'Success', 'Opportunity updated successfully!');
        } else {
            // Add new opportunity
            opportunityData.createdAt = serverTimestamp();
            opportunityData.creatorId = currentUser.uid; // Assign current user as creator
            await addDoc(collection(db, 'opportunities'), opportunityData);
            showMessage('success', 'Success', 'Opportunity added successfully!');
        }
        opportunityModal.style.display = 'none';
        renderOpportunitiesGrid(); // Refresh the opportunities table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error saving opportunity:", error);
        showMessage('error', 'Error Saving Opportunity', 'Error saving opportunity: ' + error.message);
    }
});

/**
 * Renders or updates the Grid.js table for opportunities.
 * Fetches opportunity data from Firestore and displays it.
 */
async function renderOpportunitiesGrid() {
    if (!currentUser) return;

    let opportunitiesRef = query(collection(db, 'opportunities'));
    // Filter opportunities by creatorId if not an Admin
    if (currentUserRole !== 'Admin') {
        opportunitiesRef = query(opportunitiesRef, where('creatorId', '==', currentUser.uid));
    }
    const opportunityData = [];

    const snapshot = await getDocs(query(opportunitiesRef, orderBy('expectedCloseDate'))); // Order by expected close date
    snapshot.forEach(doc => {
        const data = doc.data();
        opportunityData.push([
            doc.id, // Hidden ID
            data.name,
            data.customerName, // Display customer name
            data.salesStage,
            data.probability,
            data.value,
            data.currency, // Currency symbol
            data.expectedCloseDate,
            data.createdAt
        ]);
    });

    if (opportunitiesGrid) {
        opportunitiesGrid.updateConfig({ data: opportunityData }).forceRender(); // Update existing grid
    } else {
        const containerElement = document.getElementById('opportunitiesTable');
        if (containerElement) {
            containerElement.innerHTML = '';
        }
        opportunitiesGrid = new Grid({
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
                        const currencySymbol = row.cells[6].data; // Assuming currency symbol is at index 6
                        return cell.toLocaleString('en-US', { style: 'currency', currency: currencySymbol || 'USD' });
                    }
                },
                { id: 'currency', name: 'Currency', sort: true, filter: true },
                { id: 'expectedCloseDate', name: 'Close Date', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
                { id: 'createdAt', name: 'Created At', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data;
                        return h('div', { className: 'action-icons' },
                            h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Opportunity',
                                onClick: () => editOpportunity(docId)
                            }),
                            h('span', {
                                className: 'fa-solid fa-trash',
                                title: 'Delete Opportunity',
                                onClick: () => deleteOpportunity(docId)
                            })
                        );
                    }
                }
            ],
            data: opportunityData,
            search: true,
            pagination: { enabled: true, limit: 10, summary: true },
            sort: true,
            resizable: true,
            className: {
                container: 'gridjs-container', table: 'gridjs-table', thead: 'gridjs-thead', th: 'gridjs-th',
                td: 'gridjs-td', tr: 'gridjs-tr', footer: 'gridjs-footer', pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary', 'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav', 'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next', 'pagination-btn': 'gridjs-pagination-btn',
                'pagination-btn-current': 'gridjs-currentPage',
            },
            language: {
                'search': { 'placeholder': 'Search opportunities...' },
                'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                'noRecordsFound': 'No Opportunity Data Available',
            }
        }).render(containerElement);
    }
}

/**
 * Populates the opportunity modal with existing data for editing.
 * @param {string} opportunityId - The ID of the opportunity document to edit.
 */
async function editOpportunity(opportunityId) {
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Standard') { showMessage('error', 'Access Denied', 'You do not have permission to edit opportunities.'); return; }

    try {
        const docSnap = await getDoc(doc(db, 'opportunities', opportunityId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Further check if the current user is the creator (if not admin)
            if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
                showMessage('error', 'Access Denied', 'You can only edit opportunities you have created.');
                return;
            }

            opportunityIdInput.value = docSnap.id;
            opportunityModalTitle.textContent = 'Edit Opportunity';

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

            opportunityModal.style.display = 'flex';
        } else {
            showMessage('error', 'Not Found', 'Opportunity not found!');
        }
    } catch (error) {
        console.error("Error editing opportunity:", error);
        showMessage('error', 'Error Loading Opportunity', 'Error loading opportunity for edit: ' + error.message);
    }
}

/**
 * Deletes an opportunity document from Firestore.
 * Requires Admin role or creator.
 * @param {string} opportunityId - The ID of the opportunity document to delete.

 */
async function deleteOpportunity(opportunityId) {
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }
    if (currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'You do not have permission to delete opportunities.'); return; }

    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this opportunity? This action cannot be undone. If you are sure, click OK and then click the trash icon again.');

    try {
        await deleteDoc(doc(db, 'opportunities', opportunityId));
        showMessage('success', 'Success', 'Opportunity deleted successfully!');
        renderOpportunitiesGrid(); // Refresh the table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error deleting opportunity:", error);
        showMessage('error', 'Error Deleting Opportunity', 'Error deleting opportunity: ' + error.message);
    }
}


// --- Admin Panel ---

// Event listeners for switching between admin subsections
adminSectionBtns.forEach(button => {
    button.addEventListener('click', () => {
        adminSectionBtns.forEach(btn => btn.classList.remove('active'));
        adminSubsections.forEach(sub => sub.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(`${button.dataset.adminTarget}Section`).classList.add('active');

        // Render specific grids and populate dropdowns when their section is active
        if (button.dataset.adminTarget === 'countriesStates') {
            renderCountriesStatesGrid();
        } else if (button.dataset.adminTarget === 'currencies') {
            renderCurrenciesGrid();
            populateCurrencyCountryDropdown();
        } else if (button.dataset.adminTarget === 'priceBooks') {
            renderPriceBooksGrid();
            populatePriceBookCurrencyDropdown();
        } else if (button.dataset.adminTarget === 'settings') {
            loadAppSettings();
            populateDefaultCurrencyDropdown();
            populateDefaultCountryDropdown();
        }
    });
});

// Event listeners for admin form cancel buttons to reset forms
document.querySelectorAll('.admin-form .cancel-edit-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('form').reset();
        const hiddenInput = e.target.closest('form').querySelector('input[type="hidden"]');
        if (hiddenInput) hiddenInput.value = '';
    });
});


// --- Countries & States Management ---

/**
 * Renders or updates the Grid.js table for countries and their states.
 * Fetches data from the 'countries' collection.
 */
async function renderCountriesStatesGrid() {
    if (!currentUser || currentUserRole !== 'Admin') return; // Only Admins can view/manage

    const countriesRef = collection(db, 'countries');
    const data = [];

    const snapshot = await getDocs(query(countriesRef, orderBy('name')));
    snapshot.forEach(doc => {
        const country = doc.data();
        data.push([
            doc.id, // Hidden ID for actions
            country.name,
            country.code,
            country.states ? country.states.join(', ') : ''
        ]);
    });

    if (countriesStatesGrid) {
        countriesStatesGrid.updateConfig({ data: data }).forceRender();
    } else {
        const containerElement = document.getElementById('countriesStatesTable');
        if (containerElement) {
            containerElement.innerHTML = '';
        }
        countriesStatesGrid = new Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true },
                { id: 'name', name: 'Country Name', sort: true, filter: true },
                { id: 'code', name: 'Code', sort: true, filter: true },
                { id: 'states', name: 'States', sort: false, filter: false },
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data;
                        return h('div', { className: 'action-icons' },
                            h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Country',
                                onClick: () => editCountryState(docId)
                            }),
                            h('span', {
                                className: 'fa-solid fa-trash',
                                title: 'Delete Country',
                                onClick: () => deleteCountryState(docId)
                            })
                        );
                    }
                }
            ],
            data: data,
            search: true,
            pagination: { enabled: true, limit: 5, summary: true },
            sort: true,
            resizable: true,
            className: {
                container: 'gridjs-container', table: 'gridjs-table', thead: 'gridjs-thead', th: 'gridjs-th',
                td: 'gridjs-td', tr: 'gridjs-tr', footer: 'gridjs-footer', pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary', 'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav', 'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next', 'pagination-btn': 'gridjs-pagination-btn',
                'pagination-btn-current': 'gridjs-currentPage',
            },
            language: {
                'search': { 'placeholder': 'Search countries...' },
                'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                'noRecordsFound': 'No Countries & States Data Available',
            }
        }).render(containerElement);
    }
}

/**
 * Populates the country/state form with existing data for editing.
 * @param {string} id - The ID of the country document to edit.
 */
async function editCountryState(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    try {
        const docSnap = await getDoc(doc(db, 'countries', id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            countryStateIdInput.value = docSnap.id;
            countryNameInput.value = data.name || '';
            countryCodeInput.value = data.code || '';
            countryStatesInput.value = data.states ? data.states.join(', ') : '';
        } else {
            showMessage('error', 'Not Found', 'Country not found!');
        }
    } catch (error) {
        console.error("Error loading country for edit:", error);
        showMessage('error', 'Error Loading Country', 'Error loading country for edit: ' + error.message);
    }
}

/**
 * Deletes a country document from Firestore.
 * Requires Admin role.
 * @param {string} id - The ID of the country document to delete.
 */
async function deleteCountryState(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    
    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this country? This action cannot be undone. If you are sure, click OK and then click the trash icon again.');

    try {
        await deleteDoc(doc(db, 'countries', id));
        showMessage('success', 'Success', 'Country deleted!');
        renderCountriesStatesGrid(); // Refresh grid
        populateCustomerCountryDropdown(); // Refresh customer dropdown
        populateDefaultCountryDropdown(); // Refresh settings dropdown
        populateCurrencyCountryDropdown(); // Refresh currency country dropdown
    } catch (error) {
        console.error("Error deleting country:", error);
        showMessage('error', 'Error Deleting Country', 'Error deleting country: ' + error.message);
    }
}

// Event listener to save (add or update) a country/state
countryStateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }

    const countryData = {
        name: countryNameInput.value.trim(),
        code: countryCodeInput.value.trim().toUpperCase(),
        states: countryStatesInput.value.split(',').map(s => s.trim()).filter(s => s !== '') // Split by comma, trim, filter empty strings
    };

    try {
        if (countryStateIdInput.value) {
            await updateDoc(doc(db, 'countries', countryStateIdInput.value), countryData);
            showMessage('success', 'Success', 'Country updated!');
        } else {
            await addDoc(collection(db, 'countries'), countryData);
            showMessage('success', 'Success', 'Country added!');
        }
        countryStateForm.reset();
        countryStateIdInput.value = '';
        renderCountriesStatesGrid(); // Refresh grid
        populateCustomerCountryDropdown(); // Refresh customer dropdown
        populateDefaultCountryDropdown(); // Refresh settings dropdown
        populateCurrencyCountryDropdown(); // Refresh currency country dropdown
    } catch (error) {
        console.error("Error saving country:", error);
        showMessage('error', 'Error Saving Country', 'Error saving country: ' + error.message);
    }
});

// Event listener for the cancel button on the country/state form
cancelCountryStateEditBtn.addEventListener('click', () => {
    countryStateForm.reset();
    countryStateIdInput.value = '';
});


// --- Currencies Management ---

/**
 * Populates the currency country dropdown with data from the 'countries' collection.
 * @param {string|null} selectedCountry - The country name to pre-select (optional).
 */
async function populateCurrencyCountryDropdown(selectedCountry = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(currencyCountrySelect, 'currencies', 'symbol', 'name', selectedCountry);
}

/**
 * Renders or updates the Grid.js table for currencies.
 * Fetches data from the 'currencies' collection.
 */
async function renderCurrenciesGrid() {
    if (!currentUser || currentUserRole !== 'Admin') return;

    const currenciesRef = collection(db, 'currencies');
    const data = [];

    const snapshot = await getDocs(query(currenciesRef, orderBy('country'), orderBy('name'))); // Order by country then name
    snapshot.forEach(doc => {
        const currency = doc.data();
        data.push([
            doc.id, // Hidden ID for actions
            currency.country || '',
            currency.name,
            currency.symbol
        ]);
    });

    if (currenciesGrid) {
        currenciesGrid.updateConfig({ data: data }).forceRender();
    } else {
        const containerElement = document.getElementById('currenciesTable');
        if (containerElement) {
            containerElement.innerHTML = '';
        }
        currenciesGrid = new Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true },
                { id: 'country', name: 'Country', sort: true, filter: true },
                { id: 'name', name: 'Currency Name', sort: true, filter: true },
                { id: 'symbol', name: 'Symbol', sort: true, filter: true },
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data;
                        return h('div', { className: 'action-icons' },
                            h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Currency',
                                onClick: () => editCurrency(docId)
                            }),
                            h('span', {
                                className: 'fa-solid fa-trash',
                                title: 'Delete Currency',
                                onClick: () => deleteCurrency(docId)
                            })
                        );
                    }
                }
            ],
            data: data,
            search: true,
            pagination: { enabled: true, limit: 5, summary: true },
            sort: true,
            resizable: true,
            className: {
                container: 'gridjs-container', table: 'gridjs-table', thead: 'gridjs-thead', th: 'gridjs-th',
                td: 'gridjs-td', tr: 'gridjs-tr', footer: 'gridjs-footer', pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary', 'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav', 'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next', 'pagination-btn': 'gridjs-pagination-btn',
                'pagination-btn-current': 'gridjs-currentPage',
            },
            language: {
                'search': { 'placeholder': 'Search currencies...' },
                'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                'noRecordsFound': 'No Currencies Data Available',
            }
        }).render(containerElement);
    }
}

/**
 * Populates the currency form with existing data for editing.
 * @param {string} id - The ID of the currency document to edit.
 */
async function editCurrency(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    try {
        const docSnap = await getDoc(doc(db, 'currencies', id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            currencyIdInput.value = docSnap.id;
            currencyNameInput.value = data.name || '';
            currencySymbolInput.value = data.symbol || '';
            await populateCurrencyCountryDropdown(data.country); // Pre-select country
        } else {
            showMessage('error', 'Not Found', 'Currency not found!');
        }
    } catch (error) {
        console.error("Error loading currency for edit:", error);
        showMessage('error', 'Error Loading Currency', 'Error loading currency for edit: ' + error.message);
    }
}

/**
 * Deletes a currency document from Firestore.
 * Requires Admin role.
 * @param {string} id - The ID of the currency document to delete.
 */
async function deleteCurrency(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    
    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this currency? This action cannot be undone. If you are sure, click OK and then click the trash icon again.');

    try {
        await deleteDoc(doc(db, 'currencies', id));
        showMessage('success', 'Success', 'Currency deleted!');
        renderCurrenciesGrid(); // Refresh grid
        populateOpportunityCurrencyDropdown(); // Refresh opportunity dropdown
        populateDefaultCurrencyDropdown(); // Refresh settings dropdown
        populatePriceBookCurrencyDropdown(); // Refresh price book currency dropdown
    } catch (error) {
        console.error("Error deleting currency:", error);
        showMessage('error', 'Error Deleting Currency', 'Error deleting currency: ' + error.message);
    }
}

// Event listener to save (add or update) a currency
currencyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }

    const currencyData = {
        country: currencyCountrySelect.value,
        name: currencyNameInput.value.trim(),
        symbol: currencySymbolInput.value.trim()
    };

    try {
        // --- Client-Side Uniqueness Validation for Currency (Country, Name, Symbol) ---
        let q = query(
            collection(db, 'currencies'),
            where('country', '==', currencyData.country),
            where('name', '==', currencyData.name),
            where('symbol', '==', currencyData.symbol)
        );

        const existingCurrenciesSnapshot = await getDocs(q);

        let isDuplicate = false;
        if (currencyIdInput.value) {
            // Editing existing currency: check if duplicate exists excluding the current document being edited
            existingCurrenciesSnapshot.forEach(doc => {
                if (doc.id !== currencyIdInput.value) {
                    isDuplicate = true;
                }
            });
        } else {
            // Adding new currency: check for any duplicate
            if (!existingCurrenciesSnapshot.empty) {
                isDuplicate = true;
            }
        }

        if (isDuplicate) {
            showMessage('error', 'Duplicate Entry', 'A currency with this Country, Name, and Symbol already exists. Please ensure the combination is unique.');
            return; // Stop the function if duplicate is found
        }
        // --- End Duplicate Validation ---

        if (currencyIdInput.value) {
            await updateDoc(doc(db, 'currencies', currencyIdInput.value), currencyData);
            showMessage('success', 'Success', 'Currency updated!');
        } else {
            await addDoc(collection(db, 'currencies'), currencyData);
            showMessage('success', 'Success', 'Currency added!');
        }
        currencyForm.reset();
        currencyIdInput.value = '';
        renderCurrenciesGrid(); // Refresh grid
        populateOpportunityCurrencyDropdown(); // Refresh opportunity dropdown
        populateDefaultCurrencyDropdown(); // Refresh settings dropdown
        populatePriceBookCurrencyDropdown(); // Refresh price book currency dropdown
    } catch (error) {
        console.error("Error saving currency:", error);
        showMessage('error', 'Error Saving Currency', 'Error saving currency: ' + error.message);
    }
});

// Event listener for the cancel button on the currency form
cancelCurrencyEditBtn.addEventListener('click', () => {
    currencyForm.reset();
    currencyIdInput.value = '';
});


// --- Price Books Management ---

/**
 * Populates the price book currency dropdown with data from the 'currencies' collection.
 * @param {string|null} selectedCurrencySymbol - The currency symbol to pre-select (optional).
 */
async function populatePriceBookCurrencyDropdown(selectedCurrencySymbol = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(priceBookCurrencySelect, 'currencies', 'symbol', 'name', selectedCurrencySymbol);
}


/**
 * Renders or updates the Grid.js table for price books.
 * Fetches data from the 'priceBooks' collection.
 */
async function renderPriceBooksGrid() {
    if (!currentUser || currentUserRole !== 'Admin') return;

    const priceBooksRef = collection(db, 'priceBooks');
    const data = [];

    const snapshot = await getDocs(query(priceBooksRef, orderBy('name'))); // Order by name
    snapshot.forEach(doc => {
        const priceBook = doc.data();
        data.push([
            doc.id, // Hidden ID for actions
            priceBook.name,
            priceBook.description,
            priceBook.currency || '',
            priceBook.isActive,
            priceBook.validFrom,
            priceBook.validTo
        ]);
    });

    if (priceBooksGrid) {
        priceBooksGrid.updateConfig({ data: data }).forceRender();
    } else {
        const containerElement = document.getElementById('priceBooksTable');
        if (containerElement) {
            containerElement.innerHTML = '';
        }
        priceBooksGrid = new Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true },
                { id: 'name', name: 'Price Book Name', sort: true, filter: true },
                { id: 'description', name: 'Description', sort: true, filter: true },
                { id: 'currency', name: 'Currency', sort: true, filter: true },
                { id: 'isActive', name: 'Active', sort: true, filter: true, formatter: (cell) => cell ? 'Yes' : 'No' },
                { id: 'validFrom', name: 'Valid From', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
                { id: 'validTo', name: 'Valid To', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data;
                        return h('div', { className: 'action-icons' },
                            h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Price Book',
                                onClick: () => editPriceBook(docId)
                            }),
                            h('span', {
                                className: 'fa-solid fa-trash',
                                title: 'Delete Price Book',
                                onClick: () => deletePriceBook(docId)
                            })
                        );
                    }
                }
            ],
            data: data,
            search: true,
            pagination: { enabled: true, limit: 5, summary: true },
            sort: true,
            resizable: true,
            className: {
                container: 'gridjs-container', table: 'gridjs-table', thead: 'gridjs-thead', th: 'gridjs-th',
                td: 'gridjs-td', tr: 'gridjs-tr', footer: 'gridjs-footer', pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary', 'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav', 'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next', 'pagination-btn': 'gridjs-pagination-btn',
                'pagination-btn-current': 'gridjs-currentPage',
            },
            language: {
                'search': { 'placeholder': 'Search price books...' },
                'pagination': { 'previous': 'Prev', 'next': 'Next', 'showing': 'Showing', 'of': 'of', 'results': 'results', 'to': 'to' },
                'noRecordsFound': 'No Price Books Data Available',
            }
        }).render(containerElement);
    }
}

/**
 * Populates the price book form with existing data for editing.
 * @param {string} id - The ID of the price book document to edit.
 */
async function editPriceBook(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    try {
        const docSnap = await getDoc(doc(db, 'priceBooks', id));
        if (docSnap.exists()) {
            const data = docSnap.data();
            priceBookIdInput.value = docSnap.id;
            priceBookNameInput.value = data.name || '';
            priceBookDescriptionTextarea.value = data.description || '';
            await populatePriceBookCurrencyDropdown(data.currency); // Pre-select currency
            priceBookIsActiveSelect.value = data.isActive ? 'Yes' : 'No';
            priceBookValidFromInput.value = formatDateForInput(data.validFrom);
            priceBookValidToInput.value = formatDateForInput(data.validTo);
        } else {
            showMessage('error', 'Not Found', 'Price Book not found!');
        }
    } catch (error) {
        console.error("Error loading price book for edit:", error);
        showMessage('error', 'Error Loading Price Book', 'Error loading price book for edit: ' + error.message);
    }
}

/**
 * Deletes a price book document and its corresponding uniqueness index document.
 * Requires Admin role.
 * @param {string} id - The ID of the price book document to delete.
 */
async function deletePriceBook(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }
    
    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this price book? This action cannot be undone. If you are sure, click OK and then click the trash icon again.');

    try {
        // First, retrieve the price book data to get name and currency for the index ID
        const priceBookDoc = await getDoc(doc(db, 'priceBooks', id));
        let indexIdToDelete = null;
        if (priceBookDoc.exists()) {
            const data = priceBookDoc.data();
            // Use the stored normalized values for index ID derivation
            // Ensure data.normalizedName and data.normalizedCurrency exist and are used
            if (data.normalizedName && data.normalizedCurrency) {
                 indexIdToDelete = getPriceBookIndexId(data.normalizedName, data.normalizedCurrency);
            } else {
                // Fallback if old data doesn't have normalized fields (shouldn't happen with new script)
                indexIdToDelete = getPriceBookIndexId(data.name, data.currency);
            }
        }

        // Delete the main price book document
        await deleteDoc(doc(db, 'priceBooks', id));

        // If an index ID was successfully derived, delete the corresponding index document
        if (indexIdToDelete) {
            await deleteDoc(doc(db, 'priceBookNameCurrencyIndexes', indexIdToDelete));
        }

        showMessage('success', 'Success', 'Price Book deleted!');
        renderPriceBooksGrid(); // Refresh the grid
        populateOpportunityPriceBookDropdown(); // Refresh opportunity dropdown
    }
    catch (error) {
        console.error("Error deleting price book:", error);
        showMessage('error', 'Error Deleting Price Book', 'Error deleting price book: ' + error.message);
    }
}

// Event listener to save (add or update) a price book
priceBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }

    // Normalize name and currency for storage and index ID
    const normalizedName = priceBookNameInput.value.trim().toLowerCase().replace(/\s+/g, '');
    const normalizedCurrency = priceBookCurrencySelect.value.trim().toLowerCase().replace(/\s+/g, '');

    const priceBookData = {
        name: priceBookNameInput.value.trim(), // Keep original name for display
        normalizedName: normalizedName, // Store normalized name for rules validation
        description: priceBookDescriptionTextarea.value.trim(),
        currency: priceBookCurrencySelect.value, // Keep original currency for display
        normalizedCurrency: normalizedCurrency, // Store normalized currency for rules validation
        isActive: priceBookIsActiveSelect.value === 'Yes', // Convert to boolean
        validFrom: priceBookValidFromInput.value ? Timestamp.fromDate(new Date(priceBookValidFromInput.value)) : null,
        validTo: priceBookValidToInput.value ? Timestamp.fromDate(new Date(priceBookValidToInput.value)) : null,
    };

    const currentPriceBookId = priceBookIdInput.value;
    // Use the newly created normalized values for the index ID
    const newIndexId = getPriceBookIndexId(priceBookData.name, priceBookData.currency); // This function uses the original (but trimmed) name/currency to derive the ID

    console.log('Price Book Data being sent:', JSON.stringify(priceBookData, null, 2));
    console.log('Generated Index ID (client-side):', newIndexId);

    try {
        // --- Client-Side Uniqueness Validation for Price Book (Name, Currency) ---
        const existingIndexDoc = await getDoc(doc(db, 'priceBookNameCurrencyIndexes', newIndexId));

        if (existingIndexDoc.exists()) {
            // If an index exists, it means a price book with this name/currency already exists.
            // Check if it's the *same* document being edited.
            if (existingIndexDoc.data().priceBookId !== currentPriceBookId) {
                showMessage('error', 'Duplicate Entry', 'A price book with this Name and Currency already exists. Please choose a unique combination.');
                return; // Stop the function if duplicate is found
            }
        }
        // --- End Client-Side Uniqueness Validation ---

        let docRef;
        if (currentPriceBookId) {
            // Update existing price book
            docRef = doc(db, 'priceBooks', currentPriceBookId);
            await updateDoc(docRef, priceBookData);
            showMessage('success', 'Success', 'Price Book updated!');

            // Update the index document:
            // If normalized name/currency changed, delete old index and create new one.
            const oldPriceBookDoc = await getDoc(doc(db, 'priceBooks', currentPriceBookId));
            const oldPriceBookData = oldPriceBookDoc.data();
            // Derive old index ID using the *old* normalized values from the database
            const oldIndexId = getPriceBookIndexId(oldPriceBookData.name, oldPriceBookData.currency); // Use original name/currency from stored doc

            if (oldIndexId !== newIndexId) {
                // Name or currency changed, delete old index
                await deleteDoc(doc(db, 'priceBookNameCurrencyIndexes', oldIndexId));
                // Create new index with the new combination
                await setDoc(doc(db, 'priceBookNameCurrencyIndexes', newIndexId), {
                    priceBookId: currentPriceBookId, // Still points to the same main price book document
                    priceBookName: priceBookData.normalizedName, // Use normalized name for index
                    priceBookCurrency: priceBookData.normalizedCurrency // Use normalized currency for index
                });
            }
        } else {
            // Add new price book
            // Set defaults for new records if not provided
            if (priceBookData.isActive === null) priceBookData.isActive = true; // Default to true if not explicitly set
            if (!priceBookData.validFrom) priceBookData.validFrom = serverTimestamp(); // Default to server timestamp if empty for new records

            const newDocRef = await addDoc(collection(db, 'priceBooks'), priceBookData);
            docRef = newDocRef; // Assign to docRef for index creation
            showMessage('success', 'Success', 'Price Book added!');

            // Create corresponding index document
            await setDoc(doc(db, 'priceBookNameCurrencyIndexes', newIndexId), {
                priceBookId: docRef.id, // Use the ID of the newly created price book
                priceBookName: priceBookData.normalizedName, // Use normalized name for index
                priceBookCurrency: priceBookData.normalizedCurrency // Use normalized currency for index
            });
        }
        priceBookForm.reset();
        priceBookIdInput.value = '';
        renderPriceBooksGrid(); // Refresh grid
        populateOpportunityPriceBookDropdown(); // Refresh opportunity dropdown
    } catch (error) {
        console.error("Error saving price book:", error);
        showMessage('error', 'Error Saving Price Book', 'Error saving price book: ' + error.message);
    }
});

// Event listener for the cancel button on the price book form
cancelPriceBookEditBtn.addEventListener('click', () => {
    priceBookForm.reset();
    priceBookIdInput.value = '';
    // Reset Price Book specific fields to their defaults on cancel
    priceBookIsActiveSelect.value = 'Yes';
    priceBookValidFromInput.value = '';
    priceBookValidToInput.value = '';
});


// --- App Settings Management ---

/**
 * Populates the default currency dropdown with data from the 'currencies' collection.
 * @param {string|null} selectedCurrencySymbol - The currency symbol to pre-select (optional).
 */
async function populateDefaultCurrencyDropdown(selectedCurrencySymbol = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(defaultCurrencySelect, 'currencies', 'symbol', 'name', selectedCurrencySymbol);
}

/**
 * Populates the default country dropdown with data from the 'countries' collection.
 * @param {string|null} selectedCountryName - The country name to pre-select (optional).
 */
async function populateDefaultCountryDropdown(selectedCountryName = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(defaultCountrySelect, 'countries', 'name', 'name', selectedCountryName);
}

/**
 * Loads and displays the application settings from Firestore.
 * Requires Admin role.
 */
async function loadAppSettings() {
    if (!currentUser || currentUserRole !== 'Admin') return;
    try {
        const settingsRef = doc(db, 'settings', 'appSettings'); // Assuming a single document for app settings
        const docSnap = await getDoc(settingsRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            settingsDocIdInput.value = docSnap.id;
            await populateDefaultCurrencyDropdown(data.defaultCurrency);
            await populateDefaultCountryDropdown(data.defaultCountry);
        } else {
            // No settings document yet, reset form and dropdowns to default "Select..."
            appSettingsForm.reset();
            settingsDocIdInput.value = '';
            populateDefaultCurrencyDropdown();
            populateDefaultCountryDropdown();
        }
    } catch (error) {
        console.error("Error loading app settings:", error);
        showMessage('error', 'Error Loading Settings', 'Error loading app settings: ' + error.message);
    }
});

// Event listener to save application settings
appSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }

    const settingsData = {
        defaultCurrency: defaultCurrencySelect.value,
        defaultCountry: defaultCountrySelect.value,
        updatedAt: serverTimestamp() // Set or update timestamp
    };

    try {
        const settingsDocRef = doc(db, 'settings', 'appSettings'); // Reference to the specific settings document
        if (settingsDocIdInput.value) {
            // Update existing settings document
            await updateDoc(settingsDocRef, settingsData);
        } else {
            // Create new settings document (if it doesn't exist)
            settingsData.createdAt = serverTimestamp(); // Set creation timestamp for new record
            await setDoc(settingsDocRef, settingsData); // Use setDoc to create with a specific ID
            settingsDocIdInput.value = 'appSettings'; // Set the ID after creation
        }
        showMessage('success', 'Success', 'App settings saved successfully!');
        loadAppSettings(); // Reload to confirm changes
    } catch (error) {
        console.error("Error saving app settings:", error);
        showMessage('error', 'Error Saving Settings', 'Error saving app settings: ' + error.message);
    }
});

// Event listener for the cancel button on the app settings form
cancelSettingsEditBtn.addEventListener('click', () => {
    loadAppSettings(); // Revert to current settings by reloading them
});


// --- Initial Load ---
// This will trigger the authentication check and subsequent data loading and UI rendering.
// It ensures that the app initializes correctly after the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    // Manually trigger the active class on the dashboard button
    // This will initiate the auth check and subsequent grid rendering
    document.querySelector('.nav-button[data-module="dashboard"]').click();
});
// *** END OF SCRIPT - FINAL MARKER ***
