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

// Firestore Collection References
const usersCollection = db.collection('users_data');
const customersCollection = db.collection('customers');
const opportunitiesCollection = db.collection('opportunities');
const countriesStatesCollection = db.collection('app_metadata').doc('countries_states'); // This is a single document
const currenciesCollection = db.collection('app_metadata').doc('app_settings').collection('currencies_data');
const priceBooksCollection = db.collection('app_metadata').doc('app_settings').collection('price_books_data');
const appSettingsDoc = db.collection('app_metadata').doc('settings'); // Single settings document

// UI Elements
const authButton = document.getElementById('authButton');
const userInfoDisplay = document.getElementById('userInfoDisplay');
const userNameSpan = document.getElementById('userName');
const userRoleSpan = document.getElementById('userRole');
const navButtons = document.querySelectorAll('.nav-button');
const modules = document.querySelectorAll('.module');
const adminOnlyElements = document.querySelectorAll('.admin-only');

// Modals
const customerModal = document.getElementById('customerModal');
const opportunityModal = document.getElementById('opportunityModal');
const closeButtons = document.querySelectorAll('.close-button');

// Customer Module Elements
const addCustomerBtn = document.getElementById('addCustomerBtn');
const customerForm = document.getElementById('customerForm');
const customerModalTitle = document.getElementById('customerModalTitle');
const customerIdInput = document.getElementById('customerId');
const customerCountrySelect = document.getElementById('customerCountry');

// Opportunity Module Elements
const addOpportunityBtn = document.getElementById('addOpportunityBtn');
const opportunityForm = document.getElementById('opportunityForm');
const opportunityModalTitle = document.getElementById('opportunityModalTitle');
const opportunityIdInput = document.getElementById('opportunityId');
const opportunityCustomerSelect = document.getElementById('opportunityCustomer');
const opportunityCurrencySelect = document.getElementById('opportunityCurrency');
const opportunityPriceBookSelect = document.getElementById('opportunityPriceBook');

// Dashboard Elements
const totalCustomersCount = document.getElementById('totalCustomersCount');
const totalOpportunitiesCount = document.getElementById('totalOpportunitiesCount');
const openOpportunitiesCount = document.getElementById('openOpportunitiesCount');
const wonOpportunitiesCount = document.getElementById('wonOpportunitiesCount');

// Admin Module Elements
const adminSectionButtons = document.querySelectorAll('.admin-section-btn');
const adminSubsections = document.querySelectorAll('.admin-subsection');

const countriesStatesSection = document.getElementById('countriesStatesSection');
const countryStateForm = document.getElementById('countryStateForm');
const countryStateIdInput = document.getElementById('countryStateId');

const currenciesSection = document.getElementById('currenciesSection');
const currencyForm = document.getElementById('currencyForm');
const currencyIdInput = document.getElementById('currencyId');

const priceBooksSection = document.getElementById('priceBooksSection');
const priceBookForm = document.getElementById('priceBookForm');
const priceBookIdInput = document.getElementById('priceBookId');

const settingsSection = document.getElementById('settingsSection');
const appSettingsForm = document.getElementById('appSettingsForm');
const settingsDocIdInput = document.getElementById('settingsDocId');


let currentUser = null; // Stores current authenticated user object
let currentUserRole = 'Guest'; // Stores current user's role

// --- Grid.js Grid Instances ---
// Declare these globally, they will hold the Grid.js instances
let customersGrid;
let opportunitiesGrid; // Will be Grid.js instance later
let countriesStatesGrid; // Will be Grid.js instance later
let currenciesGrid; // Will be Grid.js instance later
let priceBooksGrid; // Will be Grid.js instance later


// --- Firebase Authentication ---
auth.onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
        authButton.textContent = 'Sign Out';
        authButton.classList.remove('sign-in');
        userInfoDisplay.style.display = 'block';

        // Check/Create user_data document and get role
        const userDocRef = usersCollection.doc(user.uid);
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

        userNameSpan.textContent = user.displayName || user.email;
        userRoleSpan.textContent = currentUserRole;

        // Show/hide admin specific elements
        adminOnlyElements.forEach(el => {
            if (currentUserRole === 'Admin') {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });

        // Initialize ALL Grids here
        initializeCustomersGrid(); // Initialize the Customers Grid.js table
        // initializeOpportunitiesGrid(); // Will be Grid.js instance later
        // initializeCountriesStatesGrid(); // Will be Grid.js instance later
        // initializeCurrenciesGrid(); // Will be Grid.js instance later
        // initializePriceBooksGrid(); // Will be Grid.js instance later

        // Load initial data for the default module (Dashboard)
        showModule('dashboard');
        loadDashboardStats();
        populateCustomerDropdown(); // Populate customer dropdown for opportunities
        populateCurrencyDropdown(); // Populate currency dropdown for opportunities
        populatePriceBookDropdown(); // Populate price book dropdown for opportunities
        populateCountriesDropdown(); // Populate countries dropdown for customers


    } else {
        // User is signed out
        authButton.textContent = 'Sign In with Google';
        authButton.classList.add('sign-in');
        userInfoDisplay.style.display = 'none';
        userNameSpan.textContent = 'Guest';
        userRoleSpan.textContent = 'N/A';
        currentUserRole = 'Guest';

        // Hide all modules and admin elements
        modules.forEach(module => module.classList.remove('active'));
        adminOnlyElements.forEach(el => el.style.display = 'none');
        // Optionally, show a "Please sign in" message or redirect to a login page
    }
});

authButton.addEventListener('click', () => {
    if (currentUser) {
        // Sign Out
        auth.signOut().then(() => {
            alert('Signed out successfully!');
        }).catch((error) => {
            console.error('Sign Out Error:', error);
            alert('Error signing out.');
        });
    } else {
        // Sign In with Google
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).then((result) => {
            // User signed in
            console.log('Signed in as:', result.user.displayName);
        }).catch((error) => {
            console.error('Sign In Error:', error);
            alert('Error signing in: ' + error.message);
        });
    }
});

// --- Navigation ---
navButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const moduleName = e.target.dataset.module;
        if (moduleName === 'admin' && currentUserRole !== 'Admin') {
            alert('Access Denied: You must be an Admin to access this section.');
            return;
        }
        showModule(moduleName);
    });
});

function showModule(moduleName) {
    navButtons.forEach(button => {
        if (button.dataset.module === moduleName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    modules.forEach(module => {
        if (module.id === `${moduleName}Module`) {
            module.classList.add('active');
        } else {
            module.classList.remove('active');
        }
    });

    // Load data specific to the module when it becomes active.
    // Grids are already initialized from onAuthStateChanged.
    if (moduleName === 'customers') {
        loadCustomers(); // This will now load data into customersGrid
    } else if (moduleName === 'opportunities') {
        loadOpportunities();
    } else if (moduleName === 'dashboard') {
        loadDashboardStats();
    } else if (moduleName === 'admin') {
        showAdminSubsection('countriesStates'); // Default admin subsection
        loadCountriesStates();
        loadCurrencies();
        loadPriceBooks();
        loadAppSettings();
    }
}

// --- Dashboard Module Functions ---
async function loadDashboardStats() {
    if (!currentUser) return;

    try {
        // Total Customers (filtered by creator for standard users, all for admin in frontend display)
        let customerQuery = customersCollection;
        if (currentUserRole !== 'Admin') {
            customerQuery = customerQuery.where('creatorId', '==', currentUser.uid);
        }
        const customersSnapshot = await customerQuery.get();
        totalCustomersCount.textContent = customersSnapshot.size;

        // Total Opportunities (filtered by creator for standard users, all for admin)
        let opportunityQuery = opportunitiesCollection;
        if (currentUserRole !== 'Admin') {
            opportunityQuery = opportunityQuery.where('creatorId', '==', currentUser.uid);
        }
        const opportunitiesSnapshot = await opportunityQuery.get();
        totalOpportunitiesCount.textContent = opportunitiesSnapshot.size;

        // Open Opportunities
        const openOpportunities = opportunitiesSnapshot.docs.filter(doc =>
            doc.data().salesStage !== 'Won' && doc.data().salesStage !== 'Lost'
        );
        openOpportunitiesCount.textContent = openOpportunities.length;

        // Won Opportunities
        const wonOpportunities = opportunitiesSnapshot.docs.filter(doc =>
            doc.data().salesStage === 'Won'
        );
        wonOpportunitiesCount.textContent = wonOpportunities.length;

    } catch (error) {
        console.error("Error loading dashboard stats:", error);
    }
}


// --- Modals General Logic ---
closeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('.modal').style.display = 'none';
        resetForms(); // Reset forms when closing modals
    });
});

window.addEventListener('click', (event) => {
    if (event.target == customerModal) {
        customerModal.style.display = 'none';
        resetForms();
    }
    if (event.target == opportunityModal) {
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
    settingsDocIdInput.value = ''; // Ensure this is cleared
}

// --- Customer Module Functions ---
addCustomerBtn.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please sign in to add customers.');
        return;
    }
    customerModalTitle.textContent = 'Add New Customer';
    customerIdInput.value = ''; // Clear ID for new
    customerForm.reset();
    customerModal.style.display = 'flex';
});

customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        alert('You must be signed in to perform this action.');
        return;
    }

    const customerData = {
        customerType: document.getElementById('customerType').value,
        customerName: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        address: document.getElementById('customerAddress').value,
        country: document.getElementById('customerCountry').value,
        preferredContactMethod: document.getElementById('customerPreferredContactMethod').value,
        industry: document.getElementById('customerIndustry').value,
        additionalDetails: document.getElementById('customerAdditionalDetails').value,
        customerSource: document.getElementById('customerSource').value,
        active: document.getElementById('customerActive').value,
    };

    const docId = customerIdInput.value;

    try {
        if (docId) {
            // Update existing customer
            await customersCollection.doc(docId).update({
                ...customerData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Customer updated successfully!');
        } else {
            // Add new customer
            await customersCollection.add({
                ...customerData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                creatorId: currentUser.uid // Set creator ID
            });
            alert('Customer added successfully!');
        }
        customerModal.style.display = 'none';
        loadCustomers(); // Reload list after save (will now update Grid.js)
        loadDashboardStats(); // Update dashboard
    } catch (error) {
        console.error('Error saving customer:', error);
        alert('Error saving customer: ' + error.message);
    }
});

/**
 * Initializes the Grid.js table for Customers.
 * This should be called once (e.g., onAuthStateChanged).
 */
function initializeCustomersGrid() {
    if (customersGrid) return; // Prevent re-initialization
    console.log("Initializing Customers Grid.js..."); // For debugging

    customersGrid = new gridjs.Grid({
        columns: [
            { id: 'customerName', name: 'Name', sort: true, filter: true },
            { id: 'email', name: 'Email', sort: true, filter: true },
            { id: 'phone', name: 'Phone', sort: true, filter: true },
            { id: 'customerType', name: 'Type', sort: true, filter: true },
            { 
                name: 'Actions',
                formatter: (cell, row) => {
                    const docId = row.cells[0].data; // Assuming 'id' is the first hidden column
                    const data = row.cells.reduce((obj, cell, index) => {
                        // Reconstruct the full data object from the row's cells for edit
                        // This assumes a consistent order with the data loaded by loadCustomers
                        // For a robust solution, you might store the full row object as a hidden column or in a map
                        const columnIds = ['id', 'customerName', 'email', 'phone', 'customerType', 'address', 'country', 'preferredContactMethod', 'industry', 'additionalDetails', 'customerSource', 'active']; // Adjust based on your actual data structure
                        obj[columnIds[index]] = cell.data;
                        return obj;
                    }, {});

                    return gridjs.h('div', { className: 'action-icons' },
                        gridjs.h('span', {
                            className: 'fa-solid fa-edit',
                            title: 'Edit',
                            onClick: () => editCustomer(docId, data)
                        }),
                        gridjs.h('span', {
                            className: 'fa-solid fa-trash',
                            title: 'Delete',
                            onClick: () => deleteCustomer(docId)
                        })
                    );
                },
                sort: false,
                filter: false
            }
        ],
        search: true, // Global search
        pagination: {
            enabled: true,
            limit: 10,
            summary: true // Shows summary like "1-10 of 50"
        },
        sort: true,
        data: [], // Initial empty data
        style: {
            table: {
                width: '100%',
                'min-width': '600px' // Ensure minimum width for responsiveness
            }
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
    }).render(document.getElementById('customersTable')); // Render into the container

    // Optional: Add a listener for when data is loaded, if needed, though loadCustomers directly updates it
    customersGrid.on('ready', () => {
        console.log('Customers Grid.js is ready.');
    });
}


async function loadCustomers() {
    // Robust check: Ensure currentUser exists and customersGrid is initialized.
    if (!currentUser || !customersGrid) {
        console.warn("Customers Grid.js not initialized or user not logged in. Skipping load.");
        return;
    }
    
    // Grid.js handles loading state internally if data is provided.
    // For manual loading indication or errors, you might need to show/hide a custom loader.

    try {
        let query = customersCollection;
        // Standard users only see customers they created (frontend filter based on rule)
        if (currentUserRole !== 'Admin') {
            query = query.where('creatorId', '==', currentUser.uid);
        }

        const snapshot = await query.orderBy('customerName').get();
        
        const customerData = [];
        snapshot.forEach(doc => {
            // Grid.js expects data as an array of arrays or array of objects.
            // Using array of arrays is often simpler for direct data.
            // Ensure the order matches your column definition.
            customerData.push([
                doc.id, // Keep ID as the first (potentially hidden) column for actions
                doc.data().customerName,
                doc.data().email,
                doc.data().phone,
                doc.data().customerType,
                doc.data().address, // Include all fields needed for editCustomer
                doc.data().country,
                doc.data().preferredContactMethod,
                doc.data().industry,
                doc.data().additionalDetails,
                doc.data().customerSource,
                doc.data().active
            ]);
        });

        // Update Grid.js data
        // Grid.js doesn't have a direct .setData() like Tabulator.
        // You update its config and then force a re-render.
        // For large datasets, consider server-side pagination/filtering or a more advanced approach.
        customersGrid.updateConfig({
            data: customerData
        }).forceRender();

    } catch (error) {
        console.error('Error loading customers:', error);
        // You can update the Grid.js config to show an error message or empty data
        customersGrid.updateConfig({
            data: [],
            // You might want a custom message or error indicator here
            noRecordsFound: 'Error loading data: ' + error.message
        }).forceRender();
    }
}

async function editCustomer(id, customer) {
    if (!currentUser) {
        alert('You must be signed in to perform this action.');
        return;
    }
    customerModalTitle.textContent = 'Edit Customer';
    customerIdInput.value = id;
    document.getElementById('customerType').value = customer.customerType;
    document.getElementById('customerName').value = customer.customerName;
    document.getElementById('customerEmail').value = customer.email;
    document.getElementById('customerPhone').value = customer.phone;
    document.getElementById('customerAddress').value = customer.address;
    document.getElementById('customerCountry').value = customer.country;
    document.getElementById('customerPreferredContactMethod').value = customer.preferredContactMethod;
    document.getElementById('customerIndustry').value = customer.industry;
    document.getElementById('customerAdditionalDetails').value = customer.additionalDetails;
    document.getElementById('customerSource').value = customer.customerSource;
    document.getElementById('customerActive').value = customer.active;
    customerModal.style.display = 'flex';
}

async function deleteCustomer(id) {
    if (!currentUser) {
        alert('You must be signed in to perform this action.');
        return;
    }
    if (confirm('Are you sure you want to delete this customer?')) {
        try {
            await customersCollection.doc(id).delete();
            alert('Customer deleted successfully!');
            loadCustomers(); // Reload list (will now update Grid.js)
            loadDashboardStats(); // Update dashboard
        } catch (error) {
            console.error('Error deleting customer:', error);
            alert('Error deleting customer: ' + error.message);
        }
    }
}

// --- Opportunity Module Functions ---
addOpportunityBtn.addEventListener('click', () => {
    if (!currentUser) {
        alert('Please sign in to add opportunities.');
        return;
    }
    opportunityModalTitle.textContent = 'Add New Opportunity';
    opportunityIdInput.value = ''; // Clear ID for new
    opportunityForm.reset();
    opportunityModal.style.display = 'flex';
});

opportunityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        alert('You must be signed in to perform this action.');
        return;
    }

    const opportunityData = {
        opportunityName: document.getElementById('opportunityName').value,
        customer: document.getElementById('opportunityCustomer').value, // This is the Customer Document ID
        currency: document.getElementById('opportunityCurrency').value, // This is the Currency Document ID
        priceBook: document.getElementById('opportunityPriceBook').value, // This is the Price Book Document ID
        expectedStartDate: document.getElementById('opportunityExpectedStartDate').value,
        expectedCloseDate: document.getElementById('opportunityExpectedCloseDate').value,
        salesStage: document.getElementById('opportunitySalesStage').value,
        probability: parseInt(document.getElementById('opportunityProbability').value, 10),
        value: parseInt(document.getElementById('opportunityValue').value, 10),
        notes: document.getElementById('opportunityNotes').value,
    };

    const docId = opportunityIdInput.value;

    try {
        if (docId) {
            // Update existing opportunity
            await opportunitiesCollection.doc(docId).update({
                ...opportunityData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Opportunity updated successfully!');
        } else {
            // Add new opportunity
            await opportunitiesCollection.add({
                ...opportunityData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                creatorId: currentUser.uid // Set creator ID
            });
            alert('Opportunity added successfully!');
        }
        opportunityModal.style.display = 'none';
        loadOpportunities(); // Reload list after save
        loadDashboardStats(); // Update dashboard
    } catch (error) {
        console.error('Error saving opportunity:', error);
        alert('Error saving opportunity: ' + error.message);
    }
});

// Placeholder for Opportunities Grid.js initialization
function initializeOpportunitiesGrid() {
    // This will be implemented in a future step.
    // For now, no grid is initialized for Opportunities.
    console.log("Opportunities Grid.js initialization placeholder.");
}

async function loadOpportunities() {
    // Current placeholder, will be updated to use Grid.js later
    console.warn("loadOpportunities function is a placeholder. Grid.js for Opportunities not yet implemented.");

    // Implement actual Grid.js loading here later
    // if (!currentUser || !opportunitiesGrid) { ... }
    // opportunitiesGrid.updateConfig({ data: [...] }).forceRender();
}


async function editOpportunity(id, opportunity) {
    if (!currentUser) {
        alert('You must be signed in to perform this action.');
        return;
    }
    opportunityModalTitle.textContent = 'Edit Opportunity';
    opportunityIdInput.value = id;
    document.getElementById('opportunityName').value = opportunity.opportunityName;
    document.getElementById('opportunityCustomer').value = opportunity.customer;
    document.getElementById('opportunityCurrency').value = opportunity.currency;
    document.getElementById('opportunityPriceBook').value = opportunity.priceBook;
    document.getElementById('opportunityExpectedStartDate').value = opportunity.expectedStartDate;
    document.getElementById('opportunityExpectedCloseDate').value = opportunity.expectedCloseDate;
    document.getElementById('opportunitySalesStage').value = opportunity.salesStage;
    document.getElementById('opportunityProbability').value = opportunity.probability;
    document.getElementById('opportunityValue').value = opportunity.value;
    document.getElementById('opportunityNotes').value = opportunity.notes;
    opportunityModal.style.display = 'flex';
}

async function deleteOpportunity(id) {
    if (!currentUser) {
        alert('You must be signed in to perform this action.');
        return;
    }
    if (confirm('Are you sure you want to delete this opportunity?')) {
        try {
            await opportunitiesCollection.doc(id).delete();
            alert('Opportunity deleted successfully!');
            loadOpportunities(); // Reload list
            loadDashboardStats(); // Update dashboard
        } catch (error) {
            console.error('Error deleting opportunity:', error);
            alert('Error deleting opportunity: ' + error.message);
        }
    }
}

// --- Dropdown Population Functions (for Modals) ---
async function populateCountriesDropdown() {
    try {
        const doc = await countriesStatesCollection.get();
        const countriesData = doc.data(); // Assuming it's a single doc with an object of countries
        customerCountrySelect.innerHTML = '<option value="">Select Country</option>';
        if (countriesData && countriesData.countries) {
            // Assuming countriesData.countries is an array of objects like { name: "USA", code: "US", states: [...] }
            countriesData.countries.sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically
            countriesData.countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.name; // Use country name as value
                option.textContent = country.name;
                customerCountrySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error populating countries dropdown:", error);
    }
}

async function populateCustomerDropdown() {
    try {
        // As per rules, any authenticated user can read all customers for selection purposes.
        const snapshot = await customersCollection.orderBy('customerName').get();
        opportunityCustomerSelect.innerHTML = '<option value="">Select Customer</option>';
        snapshot.forEach(doc => {
            const customer = doc.data();
            const option = document.createElement('option');
            option.value = doc.id; // Use customer document ID as value
            option.textContent = customer.customerName;
            opportunityCustomerSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating customer dropdown:", error);
    }
}

async function populateCurrencyDropdown() {
    try {
        const snapshot = await currenciesCollection.orderBy('name').get();
        opportunityCurrencySelect.innerHTML = '<option value="">Select Currency</option>';
        snapshot.forEach(doc => {
            const currency = doc.data();
            const option = document.createElement('option');
            option.value = doc.id; // Use currency document ID as value
            option.textContent = `${currency.name} (${currency.symbol})`;
            opportunityCurrencySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating currency dropdown:", error);
    }
}

async function populatePriceBookDropdown() {
    try {
        const snapshot = await priceBooksCollection.orderBy('name').get();
        opportunityPriceBookSelect.innerHTML = '<option value="">Select Price Book</option>';
        snapshot.forEach(doc => {
            const priceBook = doc.data();
            const option = document.createElement('option');
            option.value = doc.id; // Use price book document ID as value
            option.textContent = priceBook.name;
            opportunityPriceBookSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating price book dropdown:", error);
    }
}


// --- Admin Module Functions ---
adminSectionButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const target = e.target.dataset.adminTarget;
        showAdminSubsection(target);
    });
});

function showAdminSubsection(targetName) {
    adminSubsections.forEach(section => {
        if (section.id === `${targetName}Section`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    adminSectionButtons.forEach(button => {
        if (button.dataset.adminTarget === targetName) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    resetForms(); // Reset forms when switching admin sections
}

// Admin Cancel Buttons
document.querySelectorAll('.admin-form .cancel-edit-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('form').reset();
        e.target.closest('form').querySelector('input[type="hidden"]').value = '';
    });
});


// Countries & States Management
// Placeholder for Countries & States Grid.js initialization
function initializeCountriesStatesGrid() {
    // This will be implemented in a future step.
    console.log("Countries & States Grid.js initialization placeholder.");
}

async function loadCountriesStates() {
    // Current placeholder, will be updated to use Grid.js later
    console.warn("loadCountriesStates function is a placeholder. Grid.js for Countries & States not yet implemented.");

    // Implement actual Grid.js loading here later
    // if (currentUserRole !== 'Admin' || !countriesStatesGrid) { ... }
    // countriesStatesGrid.updateConfig({ data: [...] }).forceRender();
}

countryStateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') {
        alert('Access Denied: Only Admins can manage countries and states.');
        return;
    }

    const countryName = document.getElementById('countryName').value;
    const countryCode = document.getElementById('countryCode').value;
    const countryStates = document.getElementById('countryStates').value.split(',').map(s => s.trim()).filter(s => s);
    const editIndex = countryStateIdInput.value; // Re-using hidden input for array index

    try {
        const doc = await countriesStatesCollection.get();
        let countriesData = doc.data() || { countries: [] };
        let countriesArray = countriesData.countries || [];

        if (editIndex !== '') {
            // Update existing entry
            countriesArray[parseInt(editIndex, 10)] = { name: countryName, code: countryCode, states: countryStates };
            alert('Country updated successfully!');
        } else {
            // Add new entry
            countriesArray.push({ name: countryName, code: countryCode, states: countryStates });
            alert('Country added successfully!');
        }
        await countriesStatesCollection.set({ countries: countriesArray }); // Overwrite the entire array
        countryStateForm.reset();
        countryStateIdInput.value = '';
        loadCountriesStates(); // Reload list after save
        populateCountriesDropdown(); // Refresh customer country dropdown
    } catch (error) {
        console.error('Error saving country/state:', error);
        alert('Error saving country/state: ' + error.message);
    }
});

function editCountryState(index, country) {
    document.getElementById('countryName').value = country.name;
    document.getElementById('countryCode').value = country.code;
    document.getElementById('countryStates').value = country.states ? country.states.join(', ') : '';
    countryStateIdInput.value = index; // Store array index for update
}

async function deleteCountryState(index) {
    if (currentUserRole !== 'Admin') {
        alert('Access Denied: Only Admins can manage countries and states.');
        return;
    }
    if (confirm('Are you sure you want to delete this country?')) {
        try {
            const doc = await countriesStatesCollection.get();
            let countriesData = doc.data() || { countries: [] };
            let countriesArray = countriesData.countries || [];

            countriesArray.splice(index, 1); // Remove from array

            await countriesStatesCollection.set({ countries: countriesArray });
            alert('Country deleted successfully!');
            loadCountriesStates(); // Reload list after delete
            populateCountriesDropdown(); // Refresh customer country dropdown
        } catch (error) {
            console.error('Error deleting country/state:', error);
            alert('Error deleting country/state: ' + error.message);
        }
    }
}


// Currencies Management
// Placeholder for Currencies Grid.js initialization
function initializeCurrenciesGrid() {
    // This will be implemented in a future step.
    console.log("Currencies Grid.js initialization placeholder.");
}

async function loadCurrencies() {
    // Current placeholder, will be updated to use Grid.js later
    console.warn("loadCurrencies function is a placeholder. Grid.js for Currencies not yet implemented.");

    // Implement actual Grid.js loading here later
    // if (currentUserRole !== 'Admin' || !currenciesGrid) { ... }
    // currenciesGrid.updateConfig({ data: [...] }).forceRender();
}

currencyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') {
        alert('Access Denied: Only Admins can manage currencies.');
        return;
    }

    const name = document.getElementById('currencyName').value;
    const symbol = document.getElementById('currencySymbol').value;
    const docId = currencyIdInput.value;

    try {
        if (docId) {
            await currenciesCollection.doc(docId).update({ name, symbol });
            alert('Currency updated successfully!');
        } else {
            await currenciesCollection.add({ name, symbol });
            alert('Currency added successfully!');
        }
        currencyForm.reset();
        currencyIdInput.value = '';
        loadCurrencies(); // Reload list after save
        populateCurrencyDropdown(); // Refresh opportunity currency dropdown
    } catch (error) {
        console.error('Error saving currency:', error);
        alert('Error saving currency: ' + error.message);
    }
});

function editCurrency(id, currency) {
    document.getElementById('currencyName').value = currency.name;
    document.getElementById('currencySymbol').value = currency.symbol;
    currencyIdInput.value = id;
}

async function deleteCurrency(id) {
    if (currentUserRole !== 'Admin') {
        alert('Access Denied: Only Admins can manage currencies.');
        return;
    }
    if (confirm('Are you sure you want to delete this currency?')) {
        try {
            await currenciesCollection.doc(id).delete();
            alert('Currency deleted successfully!');
            loadCurrencies(); // Reload list after delete
            populateCurrencyDropdown();
        } catch (error) {
            console.error('Error deleting currency:', error);
            alert('Error deleting currency: ' + error.message);
        }
    }
}

// Price Books Management
// Placeholder for Price Books Grid.js initialization
function initializePriceBooksGrid() {
    // This will be implemented in a future step.
    console.log("Price Books Grid.js initialization placeholder.");
}

async function loadPriceBooks() {
    // Current placeholder, will be updated to use Grid.js later
    console.warn("loadPriceBooks function is a placeholder. Grid.js for Price Books not yet implemented.");

    // Implement actual Grid.js loading here later
    // if (currentUserRole !== 'Admin' || !priceBooksGrid) { ... }
    // priceBooksGrid.updateConfig({ data: [...] }).forceRender();
}

priceBookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') {
        alert('Access Denied: Only Admins can manage price books.');
        return;
    }

    const name = document.getElementById('priceBookName').value;
    const description = document.getElementById('priceBookDescription').value;
    const docId = priceBookIdInput.value;

    try {
        if (docId) {
            await priceBooksCollection.doc(docId).update({ name, description });
            alert('Price Book updated successfully!');
        } else {
            await priceBooksCollection.add({ name, description });
            alert('Price Book added successfully!');
        }
        priceBookForm.reset();
        priceBookIdInput.value = '';
        loadPriceBooks(); // Reload list after save
        populatePriceBookDropdown(); // Refresh opportunity price book dropdown
    } catch (error) {
        console.error('Error saving price book:', error);
        alert('Error saving price book: ' + error.message);
    }
});

function editPriceBook(id, priceBook) {
    document.getElementById('priceBookName').value = priceBook.name;
    document.getElementById('priceBookDescription').value = priceBook.description;
    priceBookIdInput.value = id;
}

async function deletePriceBook(id) {
    if (currentUserRole !== 'Admin') {
        alert('Access Denied: Only Admins can manage price books.');
        return;
    }
    if (confirm('Are you sure you want to delete this price book?')) {
        try {
            await priceBooksCollection.doc(id).delete();
            alert('Price Book deleted successfully!');
            loadPriceBooks(); // Reload list after delete
            populatePriceBookDropdown();
        } catch (error) {
            console.error('Error deleting price book:', error);
            alert('Error deleting price book: ' + error.message);
        }
    }
}

// App Settings Management (Single Document)
async function loadAppSettings() {
    if (currentUserRole !== 'Admin') return;
    try {
        const doc = await appSettingsDoc.get();
        if (doc.exists) {
            const settings = doc.data();
            settingsDocIdInput.value = doc.id; // Store the document ID
            document.getElementById('defaultCurrency').value = settings.defaultCurrency || '';
            document.getElementById('defaultCountry').value = settings.defaultCountry || '';
        } else {
            // If settings document doesn't exist, clear fields and indicate it's new
            settingsDocIdInput.value = '';
            appSettingsForm.reset();
        }
    } catch (error) {
        console.error('Error loading app settings:', error);
        alert('Error loading app settings: ' + error.message);
    }
}

appSettingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'Admin') {
        alert('Access Denied: Only Admins can manage app settings.');
        return;
    }

    const defaultCurrency = document.getElementById('defaultCurrency').value;
    const defaultCountry = document.getElementById('defaultCountry').value;
    const docId = settingsDocIdInput.value;

    try {
        if (docId) {
            // Update existing settings document
            await appSettingsDoc.update({
                defaultCurrency: defaultCurrency,
                defaultCountry: defaultCountry
            });
            alert('App Settings updated successfully!');
        } else {
            // Create new settings document (using set with merge: true for safety, or direct set)
            await appSettingsDoc.set({
                defaultCurrency: defaultCurrency,
                defaultCountry: defaultCountry
            }, { merge: true }); // Use merge:true to avoid overwriting other potential fields
            alert('App Settings saved successfully!');
            settingsDocIdInput.value = appSettingsDoc.id; // Store ID for future updates
        }
    } catch (error) {
        console.error('Error saving app settings:', error);
        alert('Error saving app settings: ' + error.message);
    }
});


// Initial load and DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', () => {
    // Hide all modules until authentication state is known
    modules.forEach(module => module.classList.remove('active'));
    userInfoDisplay.style.display = 'none'; // Hide user info until signed in
    adminOnlyElements.forEach(el => el.style.display = 'none'); // Hide admin elements initially
    
    // Grid.js initialization functions are now called in onAuthStateChanged
    // to ensure they are available as soon as a user logs in,
    // before any specific module is navigated to or form is submitted.
});
