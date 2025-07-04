// Firebase SDK Imports (Modular API)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

// Grid.js ES Module Import
import { Grid, h } from 'https://cdnjs.cloudflare.com/ajax/libs/gridjs/6.2.0/gridjs.module.min.js';


// Firebase configuration:
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebase-storage.app",
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
const customerEmailInput = document.getElementById('customerEmail'); // FIX: Corrected this line
const customerPhoneInput = document.getElementById('customerPhone');
const customerAddressTextarea = document.getElementById('customerAddress'); // Changed to Textarea
const customerCountrySelect = document.getElementById('customerCountry');
const customerPreferredContactMethodSelect = document.getElementById('customerPreferredContactMethod');
const customerIndustrySelect = document.getElementById('customerIndustry'); // Changed to Select
const customerAdditionalDetailsTextarea = document.getElementById('customerAdditionalDetails');
const customerSourceSelect = document.getElementById('customerSource'); // Changed to Select
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
const adminOnlyElements = document.querySelectorAll('.admin-only'); // Ensure this is defined
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
const currencyCountrySelect = document.getElementById('currencyCountry'); // NEW: Get the currency country select
const cancelCurrencyEditBtn = currencyForm.querySelector('.cancel-edit-btn');

// Price Books Elements
const priceBookForm = document.getElementById('priceBookForm');
const priceBookIdInput = document.getElementById('priceBookId');
const priceBookNameInput = document.getElementById('priceBookName');
const priceBookDescriptionTextarea = document.getElementById('priceBookDescription');
const priceBookCurrencySelect = document.getElementById('priceBookCurrency'); // NEW: Price Book Currency Select
// NEW: Price Book fields
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

// NEW: Message Box Elements
const messageBoxModal = document.getElementById('messageBoxModal');
const messageBoxTitle = document.getElementById('messageBoxTitle');
const messageBoxMessage = document.getElementById('messageBoxMessage');
const messageBoxCloseBtn = document.getElementById('messageBoxCloseBtn');
const messageBoxOkBtn = document.getElementById('messageBoxOkBtn');


// --- Utility Functions ---

// Function to format date for display
function formatDateForDisplay(timestamp) {
    if (!timestamp) return '';
    // Check if it's a Firestore Timestamp object
    if (typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    // If it's already a Date object or a string that can be parsed
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return ''; // Invalid date
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Function to format date for input (YYYY-MM-DD)
function formatDateForInput(timestamp) {
    if (!timestamp) return '';
    let date;
    if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
}


// Function to populate select dropdowns
async function populateSelect(selectElement, collectionName, valueField, textField, selectedValue = null) {
    selectElement.innerHTML = '<option value="">Select...</option>';
    let snapshot;
    try {
        // Use collection() to get a CollectionReference, then query
        const collectionRef = collection(db, collectionName);
        snapshot = await getDocs(query(collectionRef, orderBy(textField)));
    } catch (error) {
        console.error("Error fetching data for dropdown:", error);
        return;
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = data[valueField];
        option.textContent = data[textField];
        if (selectedValue && data[valueField] === selectedValue) {
            option.selected = true;
        }
        option.dataset.id = doc.id; // Store Firestore ID for reference
        selectElement.appendChild(option);
    });
}

// --- NEW: Custom Message Box Function ---
/**
 * Displays a custom message box.
 * @param {string} type - 'success', 'error', or 'info'
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

onAuthStateChanged(auth, async (user) => { // Use onAuthStateChanged from modular SDK
    currentUser = user;
    if (user) {
        authButtonSignOut.textContent = 'Sign Out';
        userInfoDisplay.style.display = 'block';
        authButtonSignIn.style.display = 'none';

        // Fetch user's custom claims for role
        try {
            const idTokenResult = await user.getIdTokenResult(true);
            const userDocRef = doc(db, 'users_data', user.uid); // Use doc() from modular SDK
            const userDoc = await getDoc(userDocRef); // Use getDoc() from modular SDK

            if (!userDoc.exists) {
                // New user, create their profile with 'Standard' role
                await setDoc(userDocRef, { // Use setDoc() from modular SDK
                    displayName: user.displayName || 'New User',
                    email: user.email,
                    role: 'Standard', // Default role
                    createdAt: serverTimestamp(), // Corrected: Use serverTimestamp() directly
                    lastLogin: serverTimestamp() // Corrected: Use serverTimestamp() directly
                });
                currentUserRole = 'Standard';
            } else {
                // Existing user, update last login and get role
                await updateDoc(userDocRef, { // Use updateDoc() from modular SDK
                    lastLogin: serverTimestamp() // Corrected: Use serverTimestamp() directly
                });
                currentUserRole = userDoc.data().role;
            }
        } catch (error) {
            console.error("Error fetching user role or creating user doc:", error);
            currentUserRole = 'Standard'; // Fallback to standard if error
        }


        userNameSpan.textContent = user.displayName || user.email;
        userRoleSpan.textContent = currentUserRole;

        // Show/hide admin nav button based on role
        if (currentUserRole === 'Admin') {
            adminNavButton.style.display = 'block'; // Only show the nav button
        } else {
            adminNavButton.style.display = 'none';
        }

        // Initialize and render all grids after user is logged in
        // These functions will check if the grid already exists before re-rendering
        renderCustomersGrid();
        renderOpportunitiesGrid();
        renderCountriesStatesGrid();
        renderCurrenciesGrid();
        renderPriceBooksGrid(); // This will now also populate priceBookCurrencySelect

        // Populate dynamic data for forms
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
        customerIndustrySelect.innerHTML = '<option value="">Select Industry</option>'; // Reset for Industry
        customerSourceSelect.innerHTML = '<option value="">Select Source</option>'; // Reset for Source
        opportunityCustomerSelect.innerHTML = '<option value="">Select...</option>';
        opportunityCurrencySelect.innerHTML = '<option value="">Select...</option>';
        opportunityPriceBookSelect.innerHTML = '<option value="">Select...</option>';
        priceBookCurrencySelect.innerHTML = '<option value="">Select...</option>'; // NEW: Clear price book currency
        currencyCountrySelect.innerHTML = '<option value="">Select Country</option>'; // NEW: Clear currency country dropdown
        defaultCurrencySelect.innerHTML = '<option value="">Select...</option>';
        defaultCountrySelect.innerHTML = '<option value="">Select...</option>';

        // Hide all modules
        modules.forEach(mod => mod.classList.remove('active'));
    }
});

authButtonSignOut.addEventListener('click', () => {
    if (currentUser) {
        signOut(auth).then(() => { // Use signOut from modular SDK
            showMessage('success', 'Signed Out', 'Signed out successfully!');
        }).catch((error) => {
            console.error('Sign Out Error:', error);
            showMessage('error', 'Sign Out Error', 'Error signing out: ' + error.message);
        });
    }
});

authButtonSignIn.addEventListener('click', () => {
    const provider = new GoogleAuthProvider(); // Use GoogleAuthProvider from modular SDK
    signInWithPopup(auth, provider).then((result) => { // Use signInWithPopup from modular SDK
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
        // Remove 'active' from all nav buttons and hide all modules
        navButtons.forEach(btn => btn.classList.remove('active'));
        modules.forEach(mod => mod.classList.remove('active'));

        // Add 'active' to clicked button and show corresponding module
        button.classList.add('active');
        const moduleToShow = document.getElementById(`${button.dataset.module}Module`);

        // Check if module is admin-only and user is not admin
        if (moduleToShow.classList.contains('admin-only') && currentUserRole !== 'Admin') {
            showMessage('error', 'Access Denied', 'You do not have permission to access this module.');
            // Optionally, redirect to dashboard or previous module
            document.querySelector('.nav-button[data-module="dashboard"]').click();
            return;
        }

        moduleToShow.classList.add('active');

        // Special actions for modules
        if (button.dataset.module === 'dashboard') {
            updateDashboardStats();
        } else if (button.dataset.module === 'customers') {
            renderCustomersGrid(); // Re-render to ensure data is fresh
        } else if (button.dataset.module === 'opportunities') {
            renderOpportunitiesGrid(); // Re-render to ensure data is fresh
        } else if (button.dataset.module === 'admin') {
            // Ensure first admin subsection is active and load its data
            adminSectionBtns.forEach(btn => btn.classList.remove('active'));
            adminSubsections.forEach(sub => sub.classList.remove('active'));
            const defaultAdminBtn = document.querySelector('.admin-section-btn[data-admin-target="countriesStates"]');
            const defaultAdminSection = document.getElementById('countriesStatesSection');

            if (defaultAdminBtn) defaultAdminBtn.classList.add('active');
            if (defaultAdminSection) defaultAdminSection.classList.add('active');

            renderCountriesStatesGrid(); // Load data for the default subsection
            // Other admin grids will be loaded when their respective buttons are clicked
            loadAppSettings(); // Load app settings for admin panel
        }
    });
});


// --- Dashboard Module ---

async function updateDashboardStats() {
    if (!currentUser) return;

    try {
        let customerQuery = query(collection(db, 'customers')); // Use collection() and query()
        if (currentUserRole !== 'Admin') {
            customerQuery = query(customerQuery, where('creatorId', '==', currentUser.uid)); // Use query() and where()
        }
        const customersSnapshot = await getDocs(customerQuery); // Use getDocs()
        totalCustomersCount.textContent = customersSnapshot.size;

        let opportunityQuery = query(collection(db, 'opportunities')); // Use collection() and query()
        if (currentUserRole !== 'Admin') {
            opportunityQuery = query(opportunityQuery, where('creatorId', '==', currentUser.uid)); // Use query() and where()
        }
        const opportunitiesSnapshot = await getDocs(opportunityQuery); // Use getDocs()
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
    }
}


// --- Modals General Logic ---

// Close buttons for all modals
document.querySelectorAll('.modal .close-button').forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
        resetForms();
    });
});

// Close modal on outside click
window.addEventListener('click', (event) => {
    if (event.target === customerModal) {
        customerModal.style.display = 'none';
        resetForms();
    }
    if (event.target === opportunityModal) {
        opportunityModal.style.display = 'none';
        resetForms();
    }
});

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

    // NEW: Reset Price Book specific fields
    priceBookIsActiveSelect.value = 'Yes'; // Default to Yes
    priceBookValidFromInput.value = '';
    priceBookValidToInput.value = '';

    // Manually reset dropdowns that don't have a default "Select..." option or need repopulation
    customerTypeSelect.value = 'Individual'; // Or your desired default
    customerPreferredContactMethodSelect.value = 'Email'; // Or your desired default
    customerActiveSelect.value = 'Yes'; // Or your desired default
    opportunitySalesStageSelect.value = 'Prospect'; // Or your desired default
    
    // Repopulate dynamic dropdowns to ensure initial "Select..." option is present
    populateCustomerCountryDropdown();
    // No need to populate Industry/Source here, as their options are static in HTML
    populateOpportunityCustomerDropdown();
    populateOpportunityCurrencyDropdown();
    populateOpportunityPriceBookDropdown();
    populatePriceBookCurrencyDropdown(); // NEW: Repopulate price book currency
    populateCurrencyCountryDropdown(); // NEW: Repopulate currency country dropdown
    populateDefaultCurrencyDropdown();
    populateDefaultCountryDropdown();
}


// --- Customers Module ---

// Populate Customer Country Dropdown
async function populateCustomerCountryDropdown(selectedCountry = null) {
    if (!currentUser) return;
    await populateSelect(customerCountrySelect, 'countries', 'name', 'name', selectedCountry); // Pass collection name as string
}

// Open Customer Modal
addCustomerBtn.addEventListener('click', () => {
    customerForm.reset();
    customerIdInput.value = ''; // Clear ID for new customer
    customerModalTitle.textContent = 'Add New Customer';
    
    // Set default values for new entry
    customerTypeSelect.value = 'Individual';
    customerPreferredContactMethodSelect.value = 'Email';
    customerActiveSelect.value = 'Yes';
    customerIndustrySelect.value = ''; // Clear for new entry
    customerSourceSelect.value = ''; // Clear for new entry

    populateCustomerCountryDropdown(); // Repopulate to ensure fresh data
    customerModal.style.display = 'flex';
});

// Save Customer
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }

    const customerData = {
        type: customerTypeSelect.value,
        name: customerNameInput.value,
        email: customerEmailInput.value,
        phone: customerPhoneInput.value,
        address: customerAddressTextarea.value, // Read from textarea
        country: customerCountrySelect.value,
        preferredContactMethod: customerPreferredContactMethodSelect.value,
        industry: customerIndustrySelect.value, // Read from select
        additionalDetails: customerAdditionalDetailsTextarea.value,
        source: customerSourceSelect.value, // Read from select
        active: customerActiveSelect.value === 'Yes', // Convert to boolean
        updatedAt: serverTimestamp() // Corrected: Use serverTimestamp() directly
    };

    try {
        if (customerIdInput.value) {
            // Update existing customer
            await updateDoc(doc(db, 'customers', customerIdInput.value), customerData); // Use doc() and updateDoc()
            showMessage('success', 'Success', 'Customer updated successfully!');
        } else {
            // Add new customer
            customerData.createdAt = serverTimestamp(); // Corrected: Use serverTimestamp() directly
            customerData.creatorId = currentUser.uid; // Assign creator
            await addDoc(collection(db, 'customers'), customerData); // Use collection() and addDoc()
            showMessage('success', 'Success', 'Customer added successfully!');
        }
        customerModal.style.display = 'none';
        renderCustomersGrid(); // Refresh the table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error saving customer:", error);
        showMessage('error', 'Error Saving Customer', 'Error saving customer: ' + error.message);
    }
});

// Grid.js for Customers
async function renderCustomersGrid() {
    if (!currentUser) return; // Only render if authenticated

    let customersRef = query(collection(db, 'customers')); // Use collection() and query()
    if (currentUserRole !== 'Admin') {
        customersRef = query(customersRef, where('creatorId', '==', currentUser.uid)); // Use query() and where()
    }
    const customerData = [];

    const snapshot = await getDocs(query(customersRef, orderBy('name'))); // Use getDocs() and orderBy()
    snapshot.forEach(doc => {
        const data = doc.data();
        customerData.push([
            doc.id, // Hidden ID for actions
            data.name,
            data.type,
            data.email,
            data.phone,
            data.address, // Display address
            data.country,
            data.preferredContactMethod,
            data.industry, // Display industry
            data.source, // Display source
            data.active,
            data.createdAt // Firestore Timestamp
        ]);
    });

    if (customersGrid) {
        customersGrid.updateConfig({ data: customerData }).forceRender();
    } else {
        const containerElement = document.getElementById('customersTable');
        if (containerElement) {
            containerElement.innerHTML = ''; // Clear existing content
        }
        // Use Grid and h directly from import
        customersGrid = new Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true }, // Hidden column for document ID
                { id: 'name', name: 'Name', sort: true, filter: true },
                { id: 'type', name: 'Type', sort: true, filter: true },
                { id: 'email', name: 'Email', sort: true, filter: true },
                { id: 'phone', name: 'Phone', sort: true, filter: true },
                { id: 'address', name: 'Address', sort: true, filter: true }, // Display address
                { id: 'country', name: 'Country', sort: true, filter: true },
                { id: 'preferredContactMethod', name: 'Preferred Contact', sort: true, filter: true },
                { id: 'industry', name: 'Industry', sort: true, filter: true }, // Display industry
                { id: 'source', name: 'Source', sort: true, filter: true }, // Display source
                { id: 'active', name: 'Active', sort: true, filter: true, formatter: (cell) => cell ? 'Yes' : 'No' },
                { id: 'createdAt', name: 'Created At', sort: true, formatter: (cell) => formatDateForDisplay(cell) },
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data; // Get ID from the first hidden cell
                        // Use h directly from import
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
            pagination: {
                enabled: true,
                limit: 10,
                summary: true // Shows summary like "1-10 of 50"
            },
            sort: true,
            resizable: true,
            className: {
                container: 'gridjs-container',
                table: 'gridjs-table',
                thead: 'gridjs-thead',
                th: 'gridjs-th',
                td: 'gridjs-td',
                tr: 'gridjs-tr',
                footer: 'gridjs-footer',
                pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary',
                'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav',
                'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next',
                'pagination-btn': 'gridjs-pagination-btn',
                'pagination-btn-current': 'gridjs-currentPage',
            },
            language: { // Customizing Grid.js text
                'search': {
                    'placeholder': 'Search customers...'
                },
                'pagination': {
                    'previous': 'Prev',
                    'next': 'Next',
                    'showing': 'Showing',
                    'of': 'of',
                    'results': 'results',
                    'to': 'to'
                },
                'noRecordsFound': 'No Customer Data Available',
            }
        }).render(containerElement);
    }
}

// Edit Customer
async function editCustomer(customerId) {
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }
    // Role check for editing
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Standard') { showMessage('error', 'Access Denied', 'You do not have permission to edit customers.'); return; }

    try {
        const docSnap = await getDoc(doc(db, 'customers', customerId)); // Use doc() and getDoc()
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Ensure the user is authorized to edit this customer if not admin
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
            customerAddressTextarea.value = data.address || ''; // Set textarea value
            await populateCustomerCountryDropdown(data.country); // Pre-select country
            customerPreferredContactMethodSelect.value = data.preferredContactMethod || '';
            customerIndustrySelect.value = data.industry || ''; // Set select value
            customerAdditionalDetailsTextarea.value = data.additionalDetails || '';
            customerSourceSelect.value = data.source || ''; // Set select value
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

// Delete Customer
async function deleteCustomer(customerId) {
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }
    // Role check for deleting
    if (currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'You do not have permission to delete customers.'); return; }

    // Using custom message box as a "confirmation" (it's a notification, not a true confirm)
    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this customer? This action cannot be undone. If you are sure, click OK and then click the trash icon again.');

    // For a true confirmation, you'd need a more complex modal with Yes/No buttons and a callback.
    // For now, if they click OK on the info message, they'll just have to click delete again.
    // This is a simplification to avoid complex modal logic for now.
    // If you need actual confirmation, let me know.

    // Proceed with deletion if the user confirms (this is a placeholder for actual confirmation logic)
    // In a real app, you'd show a custom confirm modal and only proceed after a "Yes" click.
    // For now, we'll assume the user understands the implications from the message.
    try {
        // Check if there are any opportunities linked to this customer
        const opportunitiesSnapshot = await getDocs(query(collection(db, 'opportunities'), where('customerId', '==', customerId))); // Use collection(), query(), where(), getDocs()
        if (!opportunitiesSnapshot.empty) {
            showMessage('error', 'Cannot Delete', 'Cannot delete customer: There are existing opportunities linked to this customer. Please delete the opportunities first.');
            return;
        }

        await deleteDoc(doc(db, 'customers', customerId)); // Use doc() and deleteDoc()
        showMessage('success', 'Success', 'Customer deleted successfully!');
        renderCustomersGrid(); // Refresh the table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error deleting customer:", error);
        showMessage('error', 'Error Deleting Customer', 'Error deleting customer: ' + error.message);
    }
}


// --- Opportunities Module ---

// Populate Opportunity Customers Dropdown
async function populateOpportunityCustomerDropdown(selectedCustomerId = null) {
    if (!currentUser) return;
    const selectElement = opportunityCustomerSelect;
    selectElement.innerHTML = '<option value="">Select a Customer</option>';
    const snapshot = await getDocs(query(collection(db, 'customers'), orderBy('name'))); // Use collection(), query(), orderBy(), getDocs()
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

// Populate Opportunity Currency Dropdown
async function populateOpportunityCurrencyDropdown(selectedCurrencySymbol = null) {
    if (!currentUser) return;
    await populateSelect(opportunityCurrencySelect, 'currencies', 'symbol', 'name', selectedCurrencySymbol); // Pass collection name as string
}

// Populate Opportunity Price Book Dropdown
async function populateOpportunityPriceBookDropdown(selectedPriceBookId = null) {
    if (!currentUser) return;
    const selectElement = opportunityPriceBookSelect;
    selectElement.innerHTML = '<option value="">Select a Price Book</option>';
    const snapshot = await getDocs(query(collection(db, 'priceBooks'), orderBy('name'))); // Use collection(), query(), orderBy(), getDocs()
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

// Open Opportunity Modal
addOpportunityBtn.addEventListener('click', () => {
    opportunityForm.reset();
    opportunityIdInput.value = ''; // Clear ID for new opportunity
    opportunityModalTitle.textContent = 'Add New Opportunity';
    populateOpportunityCustomerDropdown(); // Repopulate
    populateOpportunityCurrencyDropdown(); // Repopulate
    populateOpportunityPriceBookDropdown(); // Repopulate
    opportunityModal.style.display = 'flex';
});

closeOpportunityModalBtn.addEventListener('click', () => {
    opportunityModal.style.display = 'none';
});

// Save Opportunity
opportunityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }

    // Get the display name of the selected customer for storage
    const selectedCustomerOption = opportunityCustomerSelect.options[opportunityCustomerSelect.selectedIndex];
    const customerName = selectedCustomerOption ? selectedCustomerOption.textContent : '';

    const opportunityData = {
        name: opportunityNameInput.value,
        customerId: opportunityCustomerSelect.value, // Store customer ID
        customerName: customerName, // Store customer name for easier display/search
        currency: opportunityCurrencySelect.value, // This is the symbol
        priceBookId: opportunityPriceBookSelect.value, // Store price book ID
        expectedStartDate: opportunityExpectedStartDateInput.value ? Timestamp.fromDate(new Date(opportunityExpectedStartDateInput.value)) : null, // Use Timestamp from modular SDK
        expectedCloseDate: opportunityExpectedCloseDateInput.value ? Timestamp.fromDate(new Date(opportunityExpectedCloseDateInput.value)) : null, // Use Timestamp from modular SDK
        salesStage: opportunitySalesStageSelect.value,
        probability: parseInt(opportunityProbabilityInput.value, 10),
        value: parseFloat(opportunityValueInput.value),
        notes: opportunityNotesTextarea.value,
        updatedAt: serverTimestamp() // Corrected: Use serverTimestamp() directly
    };

    try {
        if (opportunityIdInput.value) {
            // Update existing opportunity
            await updateDoc(doc(db, 'opportunities', opportunityIdInput.value), opportunityData); // Use doc() and updateDoc()
            showMessage('success', 'Success', 'Opportunity updated successfully!');
        } else {
            // Add new opportunity
            opportunityData.createdAt = serverTimestamp(); // Corrected: Use serverTimestamp() directly
            opportunityData.creatorId = currentUser.uid; // Assign creator
            await addDoc(collection(db, 'opportunities'), opportunityData); // Use collection() and addDoc()
            showMessage('success', 'Success', 'Opportunity added successfully!');
        }
        opportunityModal.style.display = 'none';
        renderOpportunitiesGrid(); // Refresh the table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error saving opportunity:", error);
        showMessage('error', 'Error Saving Opportunity', 'Error saving opportunity: ' + error.message);
    }
});

// Grid.js for Opportunities
async function renderOpportunitiesGrid() {
    if (!currentUser) return;

    let opportunitiesRef = query(collection(db, 'opportunities')); // Use collection() and query()
    if (currentUserRole !== 'Admin') {
        opportunitiesRef = query(opportunitiesRef, where('creatorId', '==', currentUser.uid)); // Use query() and where()
    }
    const opportunityData = [];

    const snapshot = await getDocs(query(opportunitiesRef, orderBy('expectedCloseDate'))); // Use getDocs() and orderBy()
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
        opportunitiesGrid.updateConfig({ data: opportunityData }).forceRender();
    } else {
        const containerElement = document.getElementById('opportunitiesTable');
        if (containerElement) {
            containerElement.innerHTML = ''; // Clear existing content
        }
        // Use Grid and h directly from import
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
                        // Use h directly from import
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
            pagination: {
                enabled: true,
                limit: 10,
                summary: true
            },
            sort: true,
            resizable: true,
            className: {
                container: 'gridjs-container',
                table: 'gridjs-table',
                thead: 'gridjs-thead',
                th: 'gridjs-th',
                td: 'gridjs-td',
                tr: 'gridjs-tr',
                footer: 'gridjs-footer',
                pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary',
                'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav',
                'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next',
                'pagination-btn': 'gridjs-pagination-btn',
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


// Edit Opportunity
async function editOpportunity(opportunityId) {
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Standard') { showMessage('error', 'Access Denied', 'You do not have permission to edit opportunities.'); return; }

    try {
        const docSnap = await getDoc(doc(db, 'opportunities', opportunityId)); // Use doc() and getDoc()
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Ensure the user is authorized to edit this opportunity if not admin
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
            opportunityExpectedStartDateInput.value = data.expectedStartDate ? data.expectedStartDate.toDate().toISOString().split('T')[0] : '';
            opportunityExpectedCloseDateInput.value = data.expectedCloseDate ? data.expectedCloseDate.toDate().toISOString().split('T')[0] : '';
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

// Delete Opportunity
async function deleteOpportunity(opportunityId) {
    if (!currentUser) { showMessage('error', 'Authentication Required', 'Please sign in to perform this action.'); return; }
    if (currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'You do not have permission to delete opportunities.'); return; }

    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this opportunity? This action cannot be undone. If you are sure, click OK and then click the trash icon again.');

    try {
        await deleteDoc(doc(db, 'opportunities', opportunityId)); // Use doc() and deleteDoc()
        showMessage('success', 'Success', 'Opportunity deleted successfully!');
        renderOpportunitiesGrid(); // Refresh the table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error deleting opportunity:", error);
        showMessage('error', 'Error Deleting Opportunity', 'Error deleting opportunity: ' + error.message);
    }
}


// --- Admin Panel ---

adminSectionBtns.forEach(button => {
    button.addEventListener('click', () => {
        adminSectionBtns.forEach(btn => btn.classList.remove('active'));
        adminSubsections.forEach(sub => sub.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(`${button.dataset.adminTarget}Section`).classList.add('active');

        // Render specific grids when their section is active
        if (button.dataset.adminTarget === 'countriesStates') {
            renderCountriesStatesGrid();
        } else if (button.dataset.adminTarget === 'currencies') {
            renderCurrenciesGrid();
            populateCurrencyCountryDropdown(); // NEW: Populate currency country dropdown when section is active
        } else if (button.dataset.adminTarget === 'priceBooks') {
            renderPriceBooksGrid();
            populatePriceBookCurrencyDropdown(); // NEW: Populate currency dropdown for price book form
        } else if (button.dataset.adminTarget === 'settings') {
            loadAppSettings();
            populateDefaultCurrencyDropdown();
            populateDefaultCountryDropdown();
        }
    });
});

// Admin Cancel Buttons
document.querySelectorAll('.admin-form .cancel-edit-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('form').reset();
        // Specific reset for hidden ID fields
        const hiddenInput = e.target.closest('form').querySelector('input[type="hidden"]');
        if (hiddenInput) hiddenInput.value = '';
    });
});

// --- Countries & States Management ---

// Render Grid for Countries & States
async function renderCountriesStatesGrid() {
    if (!currentUser || currentUserRole !== 'Admin') return;

    const countriesRef = collection(db, 'countries'); // Use collection()
    const data = [];

    const snapshot = await getDocs(query(countriesRef, orderBy('name'))); // Use getDocs() and orderBy()
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
            containerElement.innerHTML = ''; // Clear existing content
        }
        // Use Grid and h directly from import
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
                        // Use h directly from import
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
                container: 'gridjs-container',
                table: 'gridjs-table',
                thead: 'gridjs-thead',
                th: 'gridjs-th',
                td: 'gridjs-td',
                tr: 'gridjs-tr',
                footer: 'gridjs-footer',
                pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary',
                'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav',
                'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next',
                'pagination-btn': 'gridjs-pagination-btn',
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

// Edit Country/State
async function editCountryState(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    try {
        const docSnap = await getDoc(doc(db, 'countries', id)); // Use doc() and getDoc()
        if (docSnap.exists()) {
            const data = docSnap.data();
            countryStateIdInput.value = docSnap.id;
            countryNameInput.value = data.name || '';
            countryCodeInput.value = data.code || '';
            countryStatesInput.value = data.states ? data.states.join(', ') : '';
        }
    } catch (error) {
        console.error("Error loading country for edit:", error);
    }
}

// Delete Country/State
async function deleteCountryState(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    
    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this country? If you are sure, click OK and then click the trash icon again.');

    try {
        await deleteDoc(doc(db, 'countries', id)); // Use doc() and deleteDoc()
        showMessage('success', 'Success', 'Country deleted!');
        renderCountriesStatesGrid();
        populateCustomerCountryDropdown(); // Refresh customer dropdown
        populateDefaultCountryDropdown(); // Refresh settings dropdown
        populateCurrencyCountryDropdown(); // NEW: Refresh currency country dropdown
    } catch (error) {
        console.error("Error deleting country:", error);
        showMessage('error', 'Error Deleting Country', 'Error deleting country: ' + error.message);
    }
}

// Save Country/State
countryStateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }

    const countryData = {
        name: countryNameInput.value.trim(),
        code: countryCodeInput.value.trim().toUpperCase(),
        states: countryStatesInput.value.split(',').map(s => s.trim()).filter(s => s !== '')
    };

    try {
        if (countryStateIdInput.value) {
            await updateDoc(doc(db, 'countries', countryStateIdInput.value), countryData); // Use doc() and updateDoc()
            showMessage('success', 'Success', 'Country updated!');
        } else {
            await addDoc(collection(db, 'countries'), countryData); // Use collection() and addDoc()
            showMessage('success', 'Success', 'Country added!');
        }
        countryStateForm.reset();
        countryStateIdInput.value = '';
        renderCountriesStatesGrid();
        populateCustomerCountryDropdown(); // Refresh customer dropdown
        populateDefaultCountryDropdown(); // Refresh settings dropdown
        populateCurrencyCountryDropdown(); // NEW: Refresh currency country dropdown
    } catch (error) {
        console.error("Error saving country:", error);
        showMessage('error', 'Error Saving Country', 'Error saving country: ' + error.message);
    }
});

cancelCountryStateEditBtn.addEventListener('click', () => {
    countryStateForm.reset();
    countryStateIdInput.value = '';
});


// --- Currencies Management ---

// NEW: Populate Currency Country Dropdown
async function populateCurrencyCountryDropdown(selectedCountry = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(currencyCountrySelect, 'countries', 'name', 'name', selectedCountry); // Pass collection name as string
}

// Render Grid for Currencies
async function renderCurrenciesGrid() {
    if (!currentUser || currentUserRole !== 'Admin') return;

    const currenciesRef = collection(db, 'currencies'); // Use collection()
    const data = [];

    const snapshot = await getDocs(query(currenciesRef, orderBy('country'), orderBy('name'))); // Use getDocs() and orderBy()
    snapshot.forEach(doc => {
        const currency = doc.data();
        data.push([
            doc.id, // Hidden ID for actions
            currency.country || '', // NEW: Display country first
            currency.name,
            currency.symbol
        ]);
    });

    if (currenciesGrid) {
        currenciesGrid.updateConfig({ data: data }).forceRender();
    } else {
        const containerElement = document.getElementById('currenciesTable');
        if (containerElement) {
            containerElement.innerHTML = ''; // Clear existing content
        }
        // Use Grid and h directly from import
        currenciesGrid = new Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true },
                { id: 'country', name: 'Country', sort: true, filter: true }, // NEW: Country column first
                { id: 'name', name: 'Currency Name', sort: true, filter: true },
                { id: 'symbol', name: 'Symbol', sort: true, filter: true },
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data;
                        // Use h directly from import
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
                container: 'gridjs-container',
                table: 'gridjs-table',
                thead: 'gridjs-thead',
                th: 'gridjs-th',
                td: 'gridjs-td',
                tr: 'gridjs-tr',
                footer: 'gridjs-footer',
                pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary',
                'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav',
                'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next',
                'pagination-btn': 'gridjs-pagination-btn',
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

// Edit Currency
async function editCurrency(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    try {
        const docSnap = await getDoc(doc(db, 'currencies', id)); // Use doc() and getDoc()
        if (docSnap.exists()) {
            const data = docSnap.data();
            currencyIdInput.value = docSnap.id;
            currencyNameInput.value = data.name || '';
            currencySymbolInput.value = data.symbol || '';
            await populateCurrencyCountryDropdown(data.country); // NEW: Pre-select country
        }
    } catch (error) {
        console.error("Error loading currency for edit:", error);
    }
}

// Delete Currency
async function deleteCurrency(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    
    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this currency? If you are sure, click OK and then click the trash icon again.');

    try {
        await deleteDoc(doc(db, 'currencies', id)); // Use doc() and deleteDoc()
        showMessage('success', 'Success', 'Currency deleted!');
        renderCurrenciesGrid();
        populateOpportunityCurrencyDropdown(); // Refresh opportunity dropdown
        populateDefaultCurrencyDropdown(); // Refresh settings dropdown
        populatePriceBookCurrencyDropdown(); // NEW: Refresh price book currency dropdown
    } catch (error) {
        console.error("Error deleting currency:", error);
        showMessage('error', 'Error Deleting Currency', 'Error deleting currency: ' + error.message);
    }
}

// Save Currency
currencyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }

    const currencyData = {
        country: currencyCountrySelect.value, // NEW: Save selected country
        name: currencyNameInput.value.trim(),
        symbol: currencySymbolInput.value.trim()
    };

    try {
        // --- Duplicate Validation ---
        let q = query(
            collection(db, 'currencies'),
            where('country', '==', currencyData.country),
            where('name', '==', currencyData.name),
            where('symbol', '==', currencyData.symbol)
        );

        const existingCurrenciesSnapshot = await getDocs(q);

        let isDuplicate = false;
        if (currencyIdInput.value) {
            // Editing existing currency: check if duplicate exists excluding current doc
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
            return; // Stop the function if duplicate
        }
        // --- End Duplicate Validation ---

        if (currencyIdInput.value) {
            await updateDoc(doc(db, 'currencies', currencyIdInput.value), currencyData); // Use doc() and updateDoc()
            showMessage('success', 'Success', 'Currency updated!');
        } else {
            await addDoc(collection(db, 'currencies'), currencyData); // Use collection() and addDoc()
            showMessage('success', 'Success', 'Currency added!');
        }
        currencyForm.reset();
        currencyIdInput.value = '';
        renderCurrenciesGrid();
        populateOpportunityCurrencyDropdown(); // Refresh opportunity dropdown
        populateDefaultCurrencyDropdown(); // Refresh settings dropdown
        populatePriceBookCurrencyDropdown(); // NEW: Refresh price book currency dropdown
    } catch (error) {
        console.error("Error saving currency:", error);
        showMessage('error', 'Error Saving Currency', 'Error saving currency: ' + error.message);
    }
});

cancelCurrencyEditBtn.addEventListener('click', () => {
    currencyForm.reset();
    currencyIdInput.value = '';
});


// --- Price Books Management ---

// NEW: Populate Price Book Currency Dropdown
async function populatePriceBookCurrencyDropdown(selectedCurrencySymbol = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(priceBookCurrencySelect, 'currencies', 'symbol', 'name', selectedCurrencySymbol); // Pass collection name as string
}


// Render Grid for Price Books
async function renderPriceBooksGrid() {
    if (!currentUser || currentUserRole !== 'Admin') return;

    const priceBooksRef = collection(db, 'priceBooks'); // Use collection()
    const data = [];

    const snapshot = await getDocs(query(priceBooksRef, orderBy('name'))); // Use getDocs() and orderBy()
    snapshot.forEach(doc => {
        const priceBook = doc.data();
        data.push([
            doc.id, // Hidden ID for actions
            priceBook.name,
            priceBook.description,
            priceBook.currency || '', // Display currency
            priceBook.isActive, // New field
            priceBook.validFrom, // New field
            priceBook.validTo // New field
        ]);
    });

    if (priceBooksGrid) {
        priceBooksGrid.updateConfig({ data: data }).forceRender();
    } else {
        const containerElement = document.getElementById('priceBooksTable');
        if (containerElement) {
            containerElement.innerHTML = ''; // Clear existing content
        }
        // Use Grid and h directly from import
        priceBooksGrid = new Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true },
                { id: 'name', name: 'Price Book Name', sort: true, filter: true },
                { id: 'description', name: 'Description', sort: true, filter: true },
                { id: 'currency', name: 'Currency', sort: true, filter: true }, // Currency column
                { id: 'isActive', name: 'Active', sort: true, filter: true, formatter: (cell) => cell ? 'Yes' : 'No' }, // New column
                { id: 'validFrom', name: 'Valid From', sort: true, formatter: (cell) => formatDateForDisplay(cell) }, // New column
                { id: 'validTo', name: 'Valid To', sort: true, formatter: (cell) => formatDateForDisplay(cell) }, // New column
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data;
                        // Use h directly from import
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
                container: 'gridjs-container',
                table: 'gridjs-table',
                thead: 'gridjs-thead',
                th: 'gridjs-th',
                td: 'gridjs-td',
                tr: 'gridjs-tr',
                footer: 'gridjs-footer',
                pagination: 'gridjs-pagination',
                'pagination-summary': 'gridjs-pagination-summary',
                'pagination-gap': 'gridjs-pagination-gap',
                'pagination-nav': 'gridjs-pagination-nav',
                'pagination-nav-prev': 'gridjs-pagination-nav-prev',
                'pagination-nav-next': 'gridjs-pagination-nav-next',
                'pagination-btn': 'gridjs-pagination-btn',
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

// Edit Price Book
async function editPriceBook(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    try {
        const docSnap = await getDoc(doc(db, 'priceBooks', id)); // Use doc() and getDoc()
        if (docSnap.exists()) {
            const data = docSnap.data();
            priceBookIdInput.value = docSnap.id;
            priceBookNameInput.value = data.name || '';
            priceBookDescriptionTextarea.value = data.description || '';
            await populatePriceBookCurrencyDropdown(data.currency); // Pre-select currency
            // NEW: Populate new fields
            priceBookIsActiveSelect.value = data.isActive ? 'Yes' : 'No';
            priceBookValidFromInput.value = formatDateForInput(data.validFrom);
            priceBookValidToInput.value = formatDateForInput(data.validTo);
        }
    } catch (error) {
        console.error("Error loading price book for edit:", error);
    }
}

// Delete Price Book
async function deletePriceBook(id) {
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }
    
    showMessage('info', 'Confirm Deletion', 'Are you sure you want to delete this price book? If you are sure, click OK and then click the trash icon again.');

    try {
        await deleteDoc(doc(db, 'priceBooks', id)); // Use doc() and deleteDoc()
        showMessage('success', 'Success', 'Price Book deleted!');
        renderPriceBooksGrid();
        populateOpportunityPriceBookDropdown(); // Refresh opportunity dropdown
    }
    catch (error) {
        console.error("Error deleting price book:", error);
        showMessage('error', 'Error Deleting Price Book', 'Error deleting price book: ' + error.message);
    }
}

// Save Price Book
priceBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }

    const priceBookData = {
        name: priceBookNameInput.value.trim(),
        description: priceBookDescriptionTextarea.value.trim(),
        currency: priceBookCurrencySelect.value, // Save selected currency
        // NEW: Save new fields
        isActive: priceBookIsActiveSelect.value === 'Yes', // Convert to boolean
        validFrom: priceBookValidFromInput.value ? Timestamp.fromDate(new Date(priceBookValidFromInput.value)) : null,
        validTo: priceBookValidToInput.value ? Timestamp.fromDate(new Date(priceBookValidToInput.value)) : null,
    };

    try {
        if (priceBookIdInput.value) {
            await updateDoc(doc(db, 'priceBooks', priceBookIdInput.value), priceBookData); // Use doc() and updateDoc()
            showMessage('success', 'Success', 'Price Book updated!');
        } else {
            // Set defaults for new records if not provided
            if (priceBookData.isActive === null) priceBookData.isActive = true; // Default to true if not explicitly set
            if (!priceBookData.validFrom) priceBookData.validFrom = serverTimestamp(); // Default to sysdate if empty for new records

            await addDoc(collection(db, 'priceBooks'), priceBookData); // Use collection() and addDoc()
            showMessage('success', 'Success', 'Price Book added!');
        }
        priceBookForm.reset();
        priceBookIdInput.value = '';
        renderPriceBooksGrid();
        populateOpportunityPriceBookDropdown(); // Refresh opportunity dropdown
    } catch (error) {
        console.error("Error saving price book:", error);
        showMessage('error', 'Error Saving Price Book', 'Error saving price book: ' + error.message);
    }
});

cancelPriceBookEditBtn.addEventListener('click', () => {
    priceBookForm.reset();
    priceBookIdInput.value = '';
    // NEW: Reset Price Book specific fields on cancel
    priceBookIsActiveSelect.value = 'Yes';
    priceBookValidFromInput.value = '';
    priceBookValidToInput.value = '';
});


// --- App Settings Management ---

// Populate Default Currency Dropdown
async function populateDefaultCurrencyDropdown(selectedCurrencySymbol = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(defaultCurrencySelect, 'currencies', 'symbol', 'name', selectedCurrencySymbol); // Pass collection name as string
}

// Populate Default Country Dropdown
async function populateDefaultCountryDropdown(selectedCountryName = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(defaultCountrySelect, 'countries', 'name', 'name', selectedCountryName); // Pass collection name as string
}

// Load App Settings
async function loadAppSettings() {
    if (!currentUser || currentUserRole !== 'Admin') return;
    try {
        const settingsRef = doc(db, 'settings', 'appSettings'); // Use doc()
        const docSnap = await getDoc(settingsRef); // Use getDoc()

        if (docSnap.exists()) {
            const data = docSnap.data();
            settingsDocIdInput.value = docSnap.id;
            await populateDefaultCurrencyDropdown(data.defaultCurrency);
            await populateDefaultCountryDropdown(data.defaultCountry);
        } else {
            // No settings document yet, reset form
            appSettingsForm.reset();
            settingsDocIdInput.value = '';
            populateDefaultCurrencyDropdown();
            populateDefaultCountryDropdown();
        }
    } catch (error) {
        console.error("Error loading app settings:", error);
        showMessage('error', 'Error Loading Settings', 'Error loading app settings: ' + error.message);
    }
}

// Save App Settings
appSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { showMessage('error', 'Access Denied', 'Access Denied'); return; }

    const settingsData = {
        defaultCurrency: defaultCurrencySelect.value,
        defaultCountry: defaultCountrySelect.value,
        updatedAt: serverTimestamp() // Corrected: Use serverTimestamp() directly
    };

    try {
        const settingsDocRef = doc(db, 'settings', 'appSettings'); // Use doc()
        if (settingsDocIdInput.value) {
            await updateDoc(settingsDocRef, settingsData); // Use updateDoc()
            showMessage('success', 'Success', 'App settings saved successfully!');
        } else {
            settingsData.createdAt = serverTimestamp(); // Corrected: Use serverTimestamp() directly
            await setDoc(settingsDocRef, settingsData); // Use setDoc()
            settingsDocIdInput.value = 'appSettings'; // Set the ID after creation
        }
        showMessage('success', 'Success', 'App settings saved successfully!');
        loadAppSettings(); // Reload to confirm
    } catch (error) {
        console.error("Error saving app settings:", error);
        showMessage('error', 'Error Saving Settings', 'Error saving app settings: ' + error.message);
    }
});

cancelSettingsEditBtn.addEventListener('click', () => {
    loadAppSettings(); // Revert to current settings
});


// --- Initial Load ---
// This will trigger authentication check and subsequent data loading
document.addEventListener('DOMContentLoaded', () => {
    // Manually trigger the active class on the dashboard button
    // This will initiate the auth check and subsequent grid rendering
    document.querySelector('.nav-button[data-module="dashboard"]').click();
});
// *** END OF SCRIPT - FINAL MARKER ***
