// Firebase configuration: (from your input)
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebasestorage.app",
    messagingSenderId: "10782416018",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Firestore Collection References (matching your rules)
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
const customersTableBody = document.querySelector('#customersTable tbody');
const customerCountrySelect = document.getElementById('customerCountry');

// Opportunity Module Elements
const addOpportunityBtn = document.getElementById('addOpportunityBtn');
const opportunityForm = document.getElementById('opportunityForm');
const opportunityModalTitle = document.getElementById('opportunityModalTitle');
const opportunityIdInput = document.getElementById('opportunityId');
const opportunitiesTableBody = document.querySelector('#opportunitiesTable tbody');
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
const countriesStatesTableBody = document.querySelector('#countriesStatesTable tbody');

const currenciesSection = document.getElementById('currenciesSection');
const currencyForm = document.getElementById('currencyForm');
const currencyIdInput = document.getElementById('currencyId');
const currenciesTableBody = document.querySelector('#currenciesTable tbody');

const priceBooksSection = document.getElementById('priceBooksSection');
const priceBookForm = document.getElementById('priceBookForm');
const priceBookIdInput = document.getElementById('priceBookId');
const priceBooksTableBody = document.querySelector('#priceBooksTable tbody');

const settingsSection = document.getElementById('settingsSection');
const appSettingsForm = document.getElementById('appSettingsForm');
const settingsDocIdInput = document.getElementById('settingsDocId');


let currentUser = null; // Stores current authenticated user object
let currentUserRole = 'Guest'; // Stores current user's role

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

    // Load data specific to the module when it becomes active
    if (moduleName === 'customers') {
        loadCustomers();
    } else if (moduleName === 'opportunities') {
        loadOpportunities();
    } else if (moduleName === 'dashboard') {
        loadDashboardStats();
    } else if (moduleName === 'admin') {
        // By default, show countriesStatesSection in admin
        showAdminSubsection('countriesStates');
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
        loadCustomers(); // Reload list
        loadDashboardStats(); // Update dashboard
    } catch (error) {
        console.error('Error saving customer:', error);
        alert('Error saving customer: ' + error.message);
    }
});

async function loadCustomers() {
    if (!currentUser) return;
    customersTableBody.innerHTML = '<tr><td colspan="5">Loading customers...</td></tr>';

    try {
        let query = customersCollection;
        // Standard users only see customers they created (frontend filter based on rule)
        if (currentUserRole !== 'Admin') {
            query = query.where('creatorId', '==', currentUser.uid);
        }

        const snapshot = await query.orderBy('customerName').get();
        customersTableBody.innerHTML = ''; // Clear previous rows

        if (snapshot.empty) {
            customersTableBody.innerHTML = '<tr><td colspan="5">No customers found.</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const customer = doc.data();
            const row = customersTableBody.insertRow();
            row.insertCell(0).textContent = customer.customerName;
            row.insertCell(1).textContent = customer.email;
            row.insertCell(2).textContent = customer.phone;
            row.insertCell(3).textContent = customer.customerType;

            const actionsCell = row.insertCell(4);
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.classList.add('edit-btn');
            editBtn.addEventListener('click', () => editCustomer(doc.id, customer));

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', () => deleteCustomer(doc.id));

            actionsCell.classList.add('action-buttons');
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        });
    } catch (error) {
        console.error('Error loading customers:', error);
        customersTableBody.innerHTML = `<tr><td colspan="5">Error loading customers: ${error.message}</td></tr>`;
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
            loadCustomers(); // Reload list
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
        loadOpportunities(); // Reload list
        loadDashboardStats(); // Update dashboard
    } catch (error) {
        console.error('Error saving opportunity:', error);
        alert('Error saving opportunity: ' + error.message);
    }
});

async function loadOpportunities() {
    if (!currentUser) return;
    opportunitiesTableBody.innerHTML = '<tr><td colspan="5">Loading opportunities...</td></tr>';

    try {
        let query = opportunitiesCollection;
        // Standard users only see opportunities they created (frontend filter based on rule)
        if (currentUserRole !== 'Admin') {
            query = query.where('creatorId', '==', currentUser.uid);
        }

        const snapshot = await query.orderBy('expectedCloseDate').get();
        opportunitiesTableBody.innerHTML = ''; // Clear previous rows

        if (snapshot.empty) {
            opportunitiesTableBody.innerHTML = '<tr><td colspan="5">No opportunities found.</td></tr>';
            return;
        }

        // Fetch customer names for display
        const customerDocs = await customersCollection.get();
        const customersMap = new Map();
        customerDocs.forEach(doc => {
            customersMap.set(doc.id, doc.data().customerName);
        });

        snapshot.forEach(doc => {
            const opportunity = doc.data();
            const row = opportunitiesTableBody.insertRow();
            row.insertCell(0).textContent = opportunity.opportunityName;
            row.insertCell(1).textContent = customersMap.get(opportunity.customer) || 'N/A'; // Display customer name
            row.insertCell(2).textContent = opportunity.salesStage;
            row.insertCell(3).textContent = `$${opportunity.value}`; // Format value

            const actionsCell = row.insertCell(4);
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.classList.add('edit-btn');
            editBtn.addEventListener('click', () => editOpportunity(doc.id, opportunity));

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', () => deleteOpportunity(doc.id));

            actionsCell.classList.add('action-buttons');
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        });
    } catch (error) {
        console.error('Error loading opportunities:', error);
        opportunitiesTableBody.innerHTML = `<tr><td colspan="5">Error loading opportunities: ${error.message}</td></tr>`;
    }
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
async function loadCountriesStates() {
    if (currentUserRole !== 'Admin') return;
    countriesStatesTableBody.innerHTML = '<tr><td colspan="4">Loading countries...</td></tr>';
    try {
        const doc = await countriesStatesCollection.get();
        const countriesData = doc.data();
        countriesStatesTableBody.innerHTML = '';
        if (countriesData && countriesData.countries && countriesData.countries.length > 0) {
            countriesData.countries.forEach((country, index) => {
                const row = countriesStatesTableBody.insertRow();
                row.insertCell(0).textContent = country.name;
                row.insertCell(1).textContent = country.code;
                row.insertCell(2).textContent = country.states ? country.states.join(', ') : 'N/A';

                const actionsCell = row.insertCell(3);
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.classList.add('edit-btn');
                editBtn.addEventListener('click', () => editCountryState(index, country)); // Pass index and data

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.classList.add('delete-btn');
                deleteBtn.addEventListener('click', () => deleteCountryState(index));

                actionsCell.classList.add('action-buttons');
                actionsCell.appendChild(editBtn);
                actionsCell.appendChild(deleteBtn);
            });
        } else {
            countriesStatesTableBody.innerHTML = '<tr><td colspan="4">No countries and states found.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading countries and states:', error);
        countriesStatesTableBody.innerHTML = `<tr><td colspan="4">Error loading: ${error.message}</td></tr>`;
    }
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
        loadCountriesStates();
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
            loadCountriesStates();
            populateCountriesDropdown(); // Refresh customer country dropdown
        } catch (error) {
            console.error('Error deleting country/state:', error);
            alert('Error deleting country/state: ' + error.message);
        }
    }
}


// Currencies Management
async function loadCurrencies() {
    if (currentUserRole !== 'Admin') return;
    currenciesTableBody.innerHTML = '<tr><td colspan="3">Loading currencies...</td></tr>';
    try {
        const snapshot = await currenciesCollection.orderBy('name').get();
        currenciesTableBody.innerHTML = '';
        if (snapshot.empty) {
            currenciesTableBody.innerHTML = '<tr><td colspan="3">No currencies found.</td></tr>';
            return;
        }
        snapshot.forEach(doc => {
            const currency = doc.data();
            const row = currenciesTableBody.insertRow();
            row.insertCell(0).textContent = currency.name;
            row.insertCell(1).textContent = currency.symbol;
            const actionsCell = row.insertCell(2);
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.classList.add('edit-btn');
            editBtn.addEventListener('click', () => editCurrency(doc.id, currency));
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', () => deleteCurrency(doc.id));
            actionsCell.classList.add('action-buttons');
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        });
    } catch (error) {
        console.error('Error loading currencies:', error);
        currenciesTableBody.innerHTML = `<tr><td colspan="3">Error loading currencies: ${error.message}</td></tr>`;
    }
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
        loadCurrencies();
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
            loadCurrencies();
            populateCurrencyDropdown(); // Refresh opportunity currency dropdown
        } catch (error) {
            console.error('Error deleting currency:', error);
            alert('Error deleting currency: ' + error.message);
        }
    }
}

// Price Books Management
async function loadPriceBooks() {
    if (currentUserRole !== 'Admin') return;
    priceBooksTableBody.innerHTML = '<tr><td colspan="3">Loading price books...</td></tr>';
    try {
        const snapshot = await priceBooksCollection.orderBy('name').get();
        priceBooksTableBody.innerHTML = '';
        if (snapshot.empty) {
            priceBooksTableBody.innerHTML = '<tr><td colspan="3">No price books found.</td></tr>';
            return;
        }
        snapshot.forEach(doc => {
            const priceBook = doc.data();
            const row = priceBooksTableBody.insertRow();
            row.insertCell(0).textContent = priceBook.name;
            row.insertCell(1).textContent = priceBook.description || 'N/A';
            const actionsCell = row.insertCell(2);
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.classList.add('edit-btn');
            editBtn.addEventListener('click', () => editPriceBook(doc.id, priceBook));
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', () => deletePriceBook(doc.id));
            actionsCell.classList.add('action-buttons');
            actionsCell.appendChild(editBtn);
            actionsCell.appendChild(deleteBtn);
        });
    } catch (error) {
        console.error('Error loading price books:', error);
        priceBooksTableBody.innerHTML = `<tr><td colspan="3">Error loading price books: ${error.message}</td></tr>`;
    }
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
        loadPriceBooks();
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
            loadPriceBooks();
            populatePriceBookDropdown(); // Refresh opportunity price book dropdown
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
    const docId = settingsDocIdInput.value; // Will be empty if creating, ID if updating

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

// Initial load (if already authenticated)
// This will be handled by the auth.onAuthStateChanged listener,
// but for direct page load, we want to ensure basic UI is ready.
document.addEventListener('DOMContentLoaded', () => {
    // Hide all modules until authentication state is known
    modules.forEach(module => module.classList.remove('active'));
    userInfoDisplay.style.display = 'none'; // Hide user info until signed in
    adminOnlyElements.forEach(el => el.style.display = 'none'); // Hide admin elements initially
});
