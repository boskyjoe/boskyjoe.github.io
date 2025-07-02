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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let currentUserRole = 'Guest'; // Default role
let customersGrid = null; // To hold the Grid.js instance for customers
let opportunitiesGrid = null; // To hold the Grid.js instance for opportunities
let countriesStatesGrid = null; // To hold the Grid.js instance for countries & states
let currenciesGrid = null; // To hold the Grid.js instance for currencies
let priceBooksGrid = null; // To hold the Grid.js instance for price books

// UI Elements
const navButtons = document.querySelectorAll('.nav-button');
const modules = document.querySelectorAll('.module');
const authButtonSignOut = document.getElementById('authButton'); // For the "Sign Out" button inside user-info
const authButtonSignIn = document.getElementById('authButtonAnon'); // For the "Sign In with Google" button
const userInfoDisplay = document.getElementById('userInfoDisplay');
const userNameSpan = document.getElementById('userName');
const userRoleSpan = document.getElementById('userRole');

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
const cancelCurrencyEditBtn = currencyForm.querySelector('.cancel-edit-btn');

// Price Books Elements
const priceBookForm = document.getElementById('priceBookForm');
const priceBookIdInput = document.getElementById('priceBookId');
const priceBookNameInput = document.getElementById('priceBookName');
const priceBookDescriptionTextarea = document.getElementById('priceBookDescription');
const cancelPriceBookEditBtn = priceBookForm.querySelector('.cancel-edit-btn');

// App Settings Elements
const appSettingsForm = document.getElementById('appSettingsForm');
const settingsDocIdInput = document.getElementById('settingsDocId');
const defaultCurrencySelect = document.getElementById('defaultCurrency');
const defaultCountrySelect = document.getElementById('defaultCountry');
const cancelSettingsEditBtn = appSettingsForm.querySelector('.cancel-edit-btn');


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

// Function to populate select dropdowns
async function populateSelect(selectElement, collectionRef, valueField, textField, selectedValue = null) {
    selectElement.innerHTML = '<option value="">Select...</option>';
    let snapshot;
    try {
        if (typeof collectionRef === 'string') {
            // If a string is passed, assume it's a collection name
            snapshot = await db.collection(collectionRef).orderBy(textField).get();
        } else if (collectionRef.get) {
            // If a Firestore CollectionReference or Query is passed
            snapshot = await collectionRef.orderBy(textField).get();
        } else {
            console.error("Invalid collectionRef provided to populateSelect:", collectionRef);
            return;
        }
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

// --- Authentication ---

auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        authButtonSignOut.textContent = 'Sign Out';
        userInfoDisplay.style.display = 'block';
        authButtonSignIn.style.display = 'none';

        // Fetch user's custom claims for role
        try {
            const idTokenResult = await user.getIdTokenResult(true);
            const userDocRef = db.collection('users_data').doc(user.uid);
            const userDoc = await userDocRef.get();

            if (!userDoc.exists) {
                // New user, create their profile with 'Standard' role
                await userDocRef.set({
                    displayName: user.displayName || 'New User',
                    email: user.email,
                    role: 'Standard', // Default role
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentUserRole = 'Standard';
            } else {
                // Existing user, update last login and get role
                await userDocRef.update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentUserRole = userDoc.data().role;
            }
        } catch (error) {
            console.error("Error fetching user role or creating user doc:", error);
            currentUserRole = 'Standard'; // Fallback to standard if error
        }


        userNameSpan.textContent = user.displayName || user.email;
        userRoleSpan.textContent = currentUserRole;

        // Show/hide admin module based on role
        if (currentUserRole === 'Admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        } else {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }

        // Initialize and render all grids after user is logged in
        // These functions will check if the grid already exists before re-rendering
        renderCustomersGrid();
        renderOpportunitiesGrid();
        renderCountriesStatesGrid();
        renderCurrenciesGrid();
        renderPriceBooksGrid();

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

        // Hide admin module if user signs out
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');

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
        defaultCurrencySelect.innerHTML = '<option value="">Select...</option>';
        defaultCountrySelect.innerHTML = '<option value="">Select...</option>';

        // Hide all modules
        modules.forEach(mod => mod.classList.remove('active'));
    }
});

authButtonSignOut.addEventListener('click', () => {
    if (currentUser) {
        // Sign Out
        auth.signOut().then(() => {
            alert('Signed out successfully!');
        }).catch((error) => {
            console.error('Sign Out Error:', error);
            alert('Error signing out.');
        });
    }
});

authButtonSignIn.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((result) => {
        console.log('Signed in as:', result.user.displayName);
    }).catch((error) => {
        console.error('Sign In Error:', error);
        alert('Error signing in: ' + error.message);
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
            alert('You do not have permission to access this module.');
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
        let customerQuery = db.collection('customers');
        if (currentUserRole !== 'Admin') {
            customerQuery = customerQuery.where('creatorId', '==', currentUser.uid);
        }
        const customersSnapshot = await customerQuery.get();
        totalCustomersCount.textContent = customersSnapshot.size;

        let opportunityQuery = db.collection('opportunities');
        if (currentUserRole !== 'Admin') {
            opportunityQuery = opportunityQuery.where('creatorId', '==', currentUser.uid);
        }
        const opportunitiesSnapshot = await opportunityQuery.get();
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

    // Manually reset dropdowns that don't have a default "Select..." option or need repopulation
    customerTypeSelect.value = 'Individual'; // Or your desired default
    customerPreferredContactMethodSelect.value = 'Email'; // Or your desired default
    customerActiveSelect.value = 'Yes'; // Or your desired default
    opportunitySalesStageSelect.value = 'Prospect'; // Or your desired default
    
    // Repopulate dynamic dropdowns to ensure initial "Select..." option is present
    populateCustomerCountryDropdown();
    populateOpportunityCustomerDropdown();
    populateOpportunityCurrencyDropdown();
    populateOpportunityPriceBookDropdown();
    populateDefaultCurrencyDropdown();
    populateDefaultCountryDropdown();
}


// --- Customers Module ---

// Populate Customer Country Dropdown
async function populateCustomerCountryDropdown(selectedCountry = null) {
    if (!currentUser) return;
    await populateSelect(customerCountrySelect, db.collection('countries'), 'name', 'name', selectedCountry);
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
    if (!currentUser) { alert('Please sign in to perform this action.'); return; }

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
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (customerIdInput.value) {
            // Update existing customer
            await db.collection('customers').doc(customerIdInput.value).update(customerData);
            alert('Customer updated successfully!');
        } else {
            // Add new customer
            customerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            customerData.creatorId = currentUser.uid; // Assign creator
            await db.collection('customers').add(customerData);
            alert('Customer added successfully!');
        }
        customerModal.style.display = 'none';
        renderCustomersGrid(); // Refresh the table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error saving customer:", error);
        alert('Error saving customer: ' + error.message);
    }
});

// Grid.js for Customers
async function renderCustomersGrid() {
    if (!currentUser) return; // Only render if authenticated

    let customersRef = db.collection('customers');
    if (currentUserRole !== 'Admin') {
        customersRef = customersRef.where('creatorId', '==', currentUser.uid);
    }
    const customerData = [];

    const snapshot = await customersRef.orderBy('name').get();
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
        customersGrid = new gridjs.Grid({
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
                        return gridjs.h('div', { className: 'action-icons' },
                            gridjs.h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Customer',
                                onClick: () => editCustomer(docId)
                            }),
                            gridjs.h('span', {
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
        }).render(document.getElementById('customersTable'));
    }
}

// Edit Customer
async function editCustomer(customerId) {
    if (!currentUser) { alert('Please sign in to perform this action.'); return; }
    // Role check for editing
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Standard') { alert('You do not have permission to edit customers.'); return; }

    try {
        const doc = await db.collection('customers').doc(customerId).get();
        if (doc.exists) {
            const data = doc.data();
            // Ensure the user is authorized to edit this customer if not admin
            if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
                alert('You can only edit customers you have created.');
                return;
            }

            customerIdInput.value = doc.id;
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
            alert('Customer not found!');
        }
    } catch (error) {
        console.error("Error editing customer:", error);
        alert('Error loading customer for edit: ' + error.message);
    }
}

// Delete Customer
async function deleteCustomer(customerId) {
    if (!currentUser) { alert('Please sign in to perform this action.'); return; }
    // Role check for deleting
    if (currentUserRole !== 'Admin') { alert('You do not have permission to delete customers.'); return; }

    if (confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        try {
            // Check if there are any opportunities linked to this customer
            const opportunitiesSnapshot = await db.collection('opportunities').where('customerId', '==', customerId).get();
            if (!opportunitiesSnapshot.empty) {
                alert('Cannot delete customer: There are existing opportunities linked to this customer. Please delete the opportunities first.');
                return;
            }

            await db.collection('customers').doc(customerId).delete();
            alert('Customer deleted successfully!');
            renderCustomersGrid(); // Refresh the table
            updateDashboardStats(); // Update dashboard counts
        } catch (error) {
            console.error("Error deleting customer:", error);
            alert('Error deleting customer: ' + error.message);
        }
    }
}


// --- Opportunities Module ---

// Populate Opportunity Customers Dropdown
async function populateOpportunityCustomerDropdown(selectedCustomerId = null) {
    if (!currentUser) return;
    const selectElement = opportunityCustomerSelect;
    selectElement.innerHTML = '<option value="">Select a Customer</option>';
    const snapshot = await db.collection('customers').orderBy('name').get();
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
    await populateSelect(opportunityCurrencySelect, db.collection('currencies'), 'symbol', 'name', selectedCurrencySymbol);
}

// Populate Opportunity Price Book Dropdown
async function populateOpportunityPriceBookDropdown(selectedPriceBookId = null) {
    if (!currentUser) return;
    const selectElement = opportunityPriceBookSelect;
    selectElement.innerHTML = '<option value="">Select a Price Book</option>';
    const snapshot = await db.collection('priceBooks').orderBy('name').get();
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
    if (!currentUser) { alert('Please sign in to perform this action.'); return; }

    // Get the display name of the selected customer for storage
    const selectedCustomerOption = opportunityCustomerSelect.options[opportunityCustomerSelect.selectedIndex];
    const customerName = selectedCustomerOption ? selectedCustomerOption.textContent : '';

    const opportunityData = {
        name: opportunityNameInput.value,
        customerId: opportunityCustomerSelect.value, // Store customer ID
        customerName: customerName, // Store customer name for easier display/search
        currency: opportunityCurrencySelect.value, // This is the symbol
        priceBookId: opportunityPriceBookSelect.value, // Store price book ID
        expectedStartDate: opportunityExpectedStartDateInput.value ? firebase.firestore.Timestamp.fromDate(new Date(opportunityExpectedStartDateInput.value)) : null,
        expectedCloseDate: opportunityExpectedCloseDateInput.value ? firebase.firestore.Timestamp.fromDate(new Date(opportunityExpectedCloseDateInput.value)) : null,
        salesStage: opportunitySalesStageSelect.value,
        probability: parseInt(opportunityProbabilityInput.value, 10),
        value: parseFloat(opportunityValueInput.value),
        notes: opportunityNotesTextarea.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (opportunityIdInput.value) {
            // Update existing opportunity
            await db.collection('opportunities').doc(opportunityIdInput.value).update(opportunityData);
            alert('Opportunity updated successfully!');
        } else {
            // Add new opportunity
            opportunityData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            opportunityData.creatorId = currentUser.uid; // Assign creator
            await db.collection('opportunities').add(opportunityData);
            alert('Opportunity added successfully!');
        }
        opportunityModal.style.display = 'none';
        renderOpportunitiesGrid(); // Refresh the table
        updateDashboardStats(); // Update dashboard counts
    } catch (error) {
        console.error("Error saving opportunity:", error);
        alert('Error saving opportunity: ' + error.message);
    }
});

// Grid.js for Opportunities
async function renderOpportunitiesGrid() {
    if (!currentUser) return;

    let opportunitiesRef = db.collection('opportunities');
    if (currentUserRole !== 'Admin') {
        opportunitiesRef = opportunitiesRef.where('creatorId', '==', currentUser.uid);
    }
    const opportunityData = [];

    const snapshot = await opportunitiesRef.orderBy('expectedCloseDate').get();
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
        opportunitiesGrid = new gridjs.Grid({
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
                        return gridjs.h('div', { className: 'action-icons' },
                            gridjs.h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Opportunity',
                                onClick: () => editOpportunity(docId)
                            }),
                            gridjs.h('span', {
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
        }).render(document.getElementById('opportunitiesTable'));
    }
}


// Edit Opportunity
async function editOpportunity(opportunityId) {
    if (!currentUser) { alert('Please sign in to perform this action.'); return; }
    if (currentUserRole !== 'Admin' && currentUserRole !== 'Standard') { alert('You do not have permission to edit opportunities.'); return; }

    try {
        const doc = await db.collection('opportunities').doc(opportunityId).get();
        if (doc.exists) {
            const data = doc.data();
            // Ensure the user is authorized to edit this opportunity if not admin
            if (currentUserRole !== 'Admin' && data.creatorId !== currentUser.uid) {
                alert('You can only edit opportunities you have created.');
                return;
            }

            opportunityIdInput.value = doc.id;
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
            alert('Opportunity not found!');
        }
    } catch (error) {
        console.error("Error editing opportunity:", error);
        alert('Error loading opportunity for edit: ' + error.message);
    }
}

// Delete Opportunity
async function deleteOpportunity(opportunityId) {
    if (!currentUser) { alert('Please sign in to perform this action.'); return; }
    if (currentUserRole !== 'Admin') { alert('You do not have permission to delete opportunities.'); return; }

    if (confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) {
        try {
            await db.collection('opportunities').doc(opportunityId).delete();
            alert('Opportunity deleted successfully!');
            renderOpportunitiesGrid(); // Refresh the table
            updateDashboardStats(); // Update dashboard counts
        } catch (error) {
            console.error("Error deleting opportunity:", error);
            alert('Error deleting opportunity: ' + error.message);
        }
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
        } else if (button.dataset.adminTarget === 'priceBooks') {
            renderPriceBooksGrid();
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

    const countriesRef = db.collection('countries');
    const data = [];

    const snapshot = await countriesRef.orderBy('name').get();
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
        countriesStatesGrid = new gridjs.Grid({
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
                        return gridjs.h('div', { className: 'action-icons' },
                            gridjs.h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Country',
                                onClick: () => editCountryState(docId)
                            }),
                            gridjs.h('span', {
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
        }).render(document.getElementById('countriesStatesTable'));
    }
}

// Edit Country/State
async function editCountryState(id) {
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }
    try {
        const doc = await db.collection('countries').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            countryStateIdInput.value = doc.id;
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
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }
    if (confirm('Are you sure you want to delete this country?')) {
        try {
            await db.collection('countries').doc(id).delete();
            alert('Country deleted!');
            renderCountriesStatesGrid();
            populateCustomerCountryDropdown(); // Refresh customer dropdown
            populateDefaultCountryDropdown(); // Refresh settings dropdown
        } catch (error) {
            console.error("Error deleting country:", error);
            alert('Error deleting country: ' + error.message);
        }
    }
}

// Save Country/State
countryStateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }

    const countryData = {
        name: countryNameInput.value.trim(),
        code: countryCodeInput.value.trim().toUpperCase(),
        states: countryStatesInput.value.split(',').map(s => s.trim()).filter(s => s !== '')
    };

    try {
        if (countryStateIdInput.value) {
            await db.collection('countries').doc(countryStateIdInput.value).update(countryData);
            alert('Country updated!');
        } else {
            await db.collection('countries').add(countryData);
            alert('Country added!');
        }
        countryStateForm.reset();
        countryStateIdInput.value = '';
        renderCountriesStatesGrid();
        populateCustomerCountryDropdown(); // Refresh customer dropdown
        populateDefaultCountryDropdown(); // Refresh settings dropdown
    } catch (error) {
        console.error("Error saving country:", error);
        alert('Error saving country: ' + error.message);
    }
});

cancelCountryStateEditBtn.addEventListener('click', () => {
    countryStateForm.reset();
    countryStateIdInput.value = '';
});


// --- Currencies Management ---

// Render Grid for Currencies
async function renderCurrenciesGrid() {
    if (!currentUser || currentUserRole !== 'Admin') return;

    const currenciesRef = db.collection('currencies');
    const data = [];

    const snapshot = await currenciesRef.orderBy('name').get();
    snapshot.forEach(doc => {
        const currency = doc.data();
        data.push([
            doc.id, // Hidden ID for actions
            currency.name,
            currency.symbol
        ]);
    });

    if (currenciesGrid) {
        currenciesGrid.updateConfig({ data: data }).forceRender();
    } else {
        currenciesGrid = new gridjs.Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true },
                { id: 'name', name: 'Currency Name', sort: true, filter: true },
                { id: 'symbol', name: 'Symbol', sort: true, filter: true },
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data;
                        return gridjs.h('div', { className: 'action-icons' },
                            gridjs.h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Currency',
                                onClick: () => editCurrency(docId)
                            }),
                            gridjs.h('span', {
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
        }).render(document.getElementById('currenciesTable'));
    }
}

// Edit Currency
async function editCurrency(id) {
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }
    try {
        const doc = await db.collection('currencies').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            currencyIdInput.value = doc.id;
            currencyNameInput.value = data.name || '';
            currencySymbolInput.value = data.symbol || '';
        }
    } catch (error) {
        console.error("Error loading currency for edit:", error);
    }
}

// Delete Currency
async function deleteCurrency(id) {
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }
    if (confirm('Are you sure you want to delete this currency?')) {
        try {
            await db.collection('currencies').doc(id).delete();
            alert('Currency deleted!');
            renderCurrenciesGrid();
            populateOpportunityCurrencyDropdown(); // Refresh opportunity dropdown
            populateDefaultCurrencyDropdown(); // Refresh settings dropdown
        } catch (error) {
            console.error("Error deleting currency:", error);
            alert('Error deleting currency: ' + error.message);
        }
    }
}

// Save Currency
currencyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }

    const currencyData = {
        name: currencyNameInput.value.trim(),
        symbol: currencySymbolInput.value.trim()
    };

    try {
        if (currencyIdInput.value) {
            await db.collection('currencies').doc(currencyIdInput.value).update(currencyData);
            alert('Currency updated!');
        } else {
            await db.collection('currencies').add(currencyData);
            alert('Currency added!');
        }
        currencyForm.reset();
        currencyIdInput.value = '';
        renderCurrenciesGrid();
        populateOpportunityCurrencyDropdown(); // Refresh opportunity dropdown
        populateDefaultCurrencyDropdown(); // Refresh settings dropdown
    } catch (error) {
        console.error("Error saving currency:", error);
        alert('Error saving currency: ' + error.message);
    }
});

cancelCurrencyEditBtn.addEventListener('click', () => {
    currencyForm.reset();
    currencyIdInput.value = '';
});


// --- Price Books Management ---

// Render Grid for Price Books
async function renderPriceBooksGrid() {
    if (!currentUser || currentUserRole !== 'Admin') return;

    const priceBooksRef = db.collection('priceBooks');
    const data = [];

    const snapshot = await priceBooksRef.orderBy('name').get();
    snapshot.forEach(doc => {
        const priceBook = doc.data();
        data.push([
            doc.id, // Hidden ID for actions
            priceBook.name,
            priceBook.description
        ]);
    });

    if (priceBooksGrid) {
        priceBooksGrid.updateConfig({ data: data }).forceRender();
    } else {
        priceBooksGrid = new gridjs.Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true },
                { id: 'name', name: 'Price Book Name', sort: true, filter: true },
                { id: 'description', name: 'Description', sort: true, filter: true },
                {
                    name: 'Actions',
                    sort: false,
                    filter: false,
                    formatter: (cell, row) => {
                        const docId = row.cells[0].data;
                        return gridjs.h('div', { className: 'action-icons' },
                            gridjs.h('span', {
                                className: 'fa-solid fa-edit',
                                title: 'Edit Price Book',
                                onClick: () => editPriceBook(docId)
                            }),
                            gridjs.h('span', {
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
        }).render(document.getElementById('priceBooksTable'));
    }
}

// Edit Price Book
async function editPriceBook(id) {
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }
    try {
        const doc = await db.collection('priceBooks').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            priceBookIdInput.value = doc.id;
            priceBookNameInput.value = data.name || '';
            priceBookDescriptionTextarea.value = data.description || '';
        }
    } catch (error) {
        console.error("Error loading price book for edit:", error);
    }
}

// Delete Price Book
async function deletePriceBook(id) {
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }
    if (confirm('Are you sure you want to delete this price book?')) {
        try {
            await db.collection('priceBooks').doc(id).delete();
            alert('Price Book deleted!');
            renderPriceBooksGrid();
            populateOpportunityPriceBookDropdown(); // Refresh opportunity dropdown
        } catch (error) {
            console.error("Error deleting price book:", error);
            alert('Error deleting price book: ' + error.message);
        }
    }
}

// Save Price Book
priceBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }

    const priceBookData = {
        name: priceBookNameInput.value.trim(),
        description: priceBookDescriptionTextarea.value.trim()
    };

    try {
        if (priceBookIdInput.value) {
            await db.collection('priceBooks').doc(priceBookIdInput.value).update(priceBookData);
            alert('Price Book updated!');
        } else {
            await db.collection('priceBooks').add(priceBookData);
            alert('Price Book added!');
        }
        priceBookForm.reset();
        priceBookIdInput.value = '';
        renderPriceBooksGrid();
        populateOpportunityPriceBookDropdown(); // Refresh opportunity dropdown
    } catch (error) {
        console.error("Error saving price book:", error);
        alert('Error saving price book: ' + error.message);
    }
});

cancelPriceBookEditBtn.addEventListener('click', () => {
    priceBookForm.reset();
    priceBookIdInput.value = '';
});


// --- App Settings Management ---

// Populate Default Currency Dropdown
async function populateDefaultCurrencyDropdown(selectedCurrencySymbol = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(defaultCurrencySelect, db.collection('currencies'), 'symbol', 'name', selectedCurrencySymbol);
}

// Populate Default Country Dropdown
async function populateDefaultCountryDropdown(selectedCountryName = null) {
    if (!currentUser || currentUserRole !== 'Admin') return;
    await populateSelect(defaultCountrySelect, db.collection('countries'), 'name', 'name', selectedCountryName);
}

// Load App Settings
async function loadAppSettings() {
    if (!currentUser || currentUserRole !== 'Admin') return;
    try {
        const settingsRef = db.collection('settings').doc('appSettings'); // Assuming a single settings document
        const doc = await settingsRef.get();

        if (doc.exists) {
            const data = doc.data();
            settingsDocIdInput.value = doc.id;
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
        alert('Error loading app settings: ' + error.message);
    }
}

// Save App Settings
appSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || currentUserRole !== 'Admin') { alert('Access Denied'); return; }

    const settingsData = {
        defaultCurrency: defaultCurrencySelect.value,
        defaultCountry: defaultCountrySelect.value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        const settingsDocRef = db.collection('settings').doc('appSettings');
        if (settingsDocIdInput.value) {
            await settingsDocRef.update(settingsData);
        } else {
            settingsData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await settingsDocRef.set(settingsData);
            settingsDocIdInput.value = 'appSettings'; // Set the ID after creation
        }
        alert('App settings saved successfully!');
        loadAppSettings(); // Reload to confirm
    } catch (error) {
        console.error("Error saving app settings:", error);
        alert('Error saving app settings: ' + error.message);
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
