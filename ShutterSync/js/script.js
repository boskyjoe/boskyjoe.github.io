// Part 1: Firebase Imports, Configuration, and Global Variables

// Firebase imports for ES Modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs, onSnapshot, FieldValue, writeBatch } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

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

// Use the appId directly from the provided firebaseConfig
const appId = firebaseConfig.appId;

// Environment variable for initial auth token (if available)
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase App and Services
let app;
let db;
let auth;
let userId = null; // Will be set after authentication
let userRole = 'guest'; // Default role
let currentOpportunityId = null; // To track the opportunity being edited

// DOM Elements - Main Sections
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const customersSection = document.getElementById('customers-section');
const leadsSection = document.getElementById('leads-section');
const opportunitiesSection = document.getElementById('opportunities-section');
const countriesSection = document.getElementById('countries-section');
const currenciesSection = document.getElementById('currencies-section');
const priceBooksSection = document.getElementById('price-books-section');

// Navigation Buttons
const navDashboard = document.getElementById('nav-dashboard');
const navCustomers = document.getElementById('nav-customers');
const navLeads = document.getElementById('nav-leads');
const navOpportunities = document.getElementById('nav-opportunities');
const navCountries = document.getElementById('nav-countries');
const navCurrencies = document.getElementById('nav-currencies');
const navPriceBooks = document.getElementById('nav-price-books');
const navLogout = document.getElementById('nav-logout');
const adminMenuItem = document.getElementById('admin-menu-item');

// Auth Elements
const googleSignInBtn = document.getElementById('google-signin-btn');
const authStatus = document.getElementById('auth-status');
const userDisplayName = document.getElementById('user-display-name');
const userIdDisplay = document.getElementById('user-id-display');
const userRoleDisplay = document.getElementById('user-role');
const authErrorMessage = document.getElementById('auth-error-message');

// Part 2: Dashboard Elements, Message Box, and Authentication Logic

// Dashboard Elements
const dashboardTotalCustomers = document.getElementById('dashboard-total-customers');
const dashboardTotalOpportunities = document.getElementById('dashboard-total-opportunities');
const dashboardOpenOpportunities = document.getElementById('dashboard-open-opportunities');
const dashboardWonOpportunities = document.getElementById('dashboard-won-opportunities');

// Custom Message Box Elements
const messageBox = document.getElementById('message-box');
const messageContent = document.getElementById('message-content');
const messageConfirmBtn = document.getElementById('message-confirm-btn');
const messageCancelBtn = document.getElementById('message-cancel-btn');

/**
 * Shows a custom message box (modal).
 * @param {string} message - The message to display.
 * @param {boolean} isConfirm - If true, shows Confirm/Cancel buttons. If false, shows only an OK button.
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled/OK.
 */
function showMessageBox(message, isConfirm = false) {
    return new Promise((resolve) => {
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
        opportunitiesSection, countriesSection, currenciesSection, priceBooksSection
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
            authErrorMessage.textContent = "Firebase is not configured. Please check your firebaseConfig.";
            authErrorMessage.classList.remove('hidden');
            return;
        }
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            console.log("Firebase initialized.");
        } catch (error) {
            console.error("Error initializing Firebase:", error);
            authErrorMessage.textContent = `Error initializing Firebase: ${error.message}`;
            authErrorMessage.classList.remove('hidden');
            return;
        }
    }

    // Sign in with custom token if available, otherwise anonymously
    if (initialAuthToken) {
        try {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("Signed in with custom token.");
        } catch (error) {
            console.error("Error signing in with custom token:", error);
            // Fallback to anonymous if custom token fails
            try {
                await signInAnonymously(auth);
                console.log("Signed in anonymously after custom token failure.");
            } catch (anonError) {
                console.error("Error signing in anonymously:", anonError);
                authErrorMessage.textContent = `Authentication failed: ${anonError.message}`;
                authErrorMessage.classList.remove('hidden');
                showSection(authSection);
                return;
            }
        }
    } else {
        try {
            await signInAnonymously(auth);
            console.log("Signed in anonymously.");
        } catch (error) {
            console.error("Error signing in anonymously:", error);
            authErrorMessage.textContent = `Authentication failed: ${error.message}`;
            authErrorMessage.classList.remove('hidden');
            showSection(authSection);
            return;
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            userDisplayName.textContent = user.displayName || 'Guest';
            userIdDisplay.textContent = `(ID: ${userId.substring(0, 8)}...)`; // Display first 8 chars of UID
            navLogout.classList.remove('hidden');
            authSection.classList.add('hidden');

            // Determine user role (e.g., based on a 'roles' collection or claims)
            // For simplicity, let's assume 'admin' if UID matches a predefined admin UID, otherwise 'user'
            // In a real app, you'd fetch this from Firestore or Firebase Auth custom claims
            const adminUids = ['YOUR_ADMIN_UID_1', 'YOUR_ADMIN_UID_2']; // Replace with actual admin UIDs
            userRole = adminUids.includes(userId) ? 'admin' : 'user';
            userRoleDisplay.textContent = `(${userRole})`;

            if (userRole === 'admin') {
                adminMenuItem.classList.remove('hidden');
            } else {
                adminMenuItem.classList.add('hidden');
            }

            console.log(`User ${user.uid} (${userRole}) is signed in.`);
            showSection(dashboardSection); // Show dashboard after successful login
            await updateDashboard();
        } else {
            userId = null;
            userRole = 'guest';
            userDisplayName.textContent = '';
            userIdDisplay.textContent = '';
            userRoleDisplay.textContent = '';
            navLogout.classList.add('hidden');
            adminMenuItem.classList.add('hidden');
            showSection(authSection);
            console.log("User is signed out.");
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
        authErrorMessage.textContent = `Google Sign-In failed: ${error.message}`;
        authErrorMessage.classList.remove('hidden');
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
        const customersRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);
        const opportunitiesRef = collection(db, `artifacts/${appId}/users/${userId}/opportunities`);

        const totalCustomersSnap = await getDocs(customersRef);
        if (dashboardTotalCustomers) dashboardTotalCustomers.textContent = totalCustomersSnap.size;

        const totalOpportunitiesSnap = await getDocs(opportunitiesRef);
        if (dashboardTotalOpportunities) dashboardTotalOpportunities.textContent = totalOpportunitiesSnap.size;

        const openOpportunitiesQuery = query(opportunitiesRef, where('salesStage', 'in', ['Prospect', 'Qualification', 'Proposal', 'Negotiation']));
        const openOpportunitiesSnap = await getDocs(openOpportunitiesQuery);
        if (dashboardOpenOpportunities) dashboardOpenOpportunities.textContent = openOpportunitiesSnap.size;

        const wonOpportunitiesQuery = query(opportunitiesRef, where('salesStage', '==', 'Won'));
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
        icon.style.transform = 'rotate(180deg)';
        header.classList.add('expanded');
    } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)';
        header.classList.remove('expanded');
    }
}

// --- Form Visibility Functions ---
function showCustomerForm() {
    customerFormContainer.classList.remove('hidden');
}

function hideCustomerForm() {
    customerFormContainer.classList.add('hidden');
    customerForm.reset(); // Clear form fields
    document.getElementById('customer-id').value = ''; // Clear hidden ID
    document.getElementById('customer-form-message').classList.add('hidden');
}

function showLeadForm() {
    leadFormContainer.classList.remove('hidden');
}

function hideLeadForm() {
    leadFormContainer.classList.add('hidden');
    leadForm.reset();
    document.getElementById('lead-id').value = '';
    document.getElementById('lead-form-message').classList.add('hidden');
}

function showOpportunityForm() {
    opportunityFormContainer.classList.remove('hidden');
    // Ensure all accordions are collapsed by default when form opens
    document.querySelectorAll('#opportunity-form .accordion-content').forEach(content => {
        content.classList.add('hidden');
        content.previousElementSibling.querySelector('.accordion-icon').style.transform = 'rotate(0deg)';
        content.previousElementSibling.classList.remove('expanded');
    });
    // Expand the first accordion (Main Details)
    const mainDetailsHeader = document.querySelector('#opportunity-form .accordion-item:first-child .accordion-header');
    if (mainDetailsHeader) {
        mainDetailsHeader.click(); // Simulate a click to expand
    }
}

function hideOpportunityForm() {
    opportunityFormContainer.classList.add('hidden');
    opportunityForm.reset();
    document.getElementById('opportunity-id').value = '';
    document.getElementById('opportunity-form-message').classList.add('hidden');
    currentOpportunityId = null; // Reset current opportunity being edited
    workLogsList.innerHTML = ''; // Clear work logs
    noWorkLogsMessage.classList.remove('hidden'); // Show no work logs message
    hideWorkLogForm(); // Hide work log entry form
}

function showWorkLogForm() {
    workLogFormContainer.classList.remove('hidden');
}

function hideWorkLogForm() {
    workLogFormContainer.classList.add('hidden');
    workLogForm.reset();
    document.getElementById('work-log-id').value = '';
    document.getElementById('work-log-opportunity-id').value = '';
    document.getElementById('work-log-form-message').classList.add('hidden');
}

function showCountryForm() {
    countryFormContainer.classList.remove('hidden');
}

function hideCountryForm() {
    countryFormContainer.classList.add('hidden');
    countryForm.reset();
    document.getElementById('country-id').value = '';
    document.getElementById('country-form-message').classList.add('hidden');
}

function showCurrencyForm() {
    currencyFormContainer.classList.remove('hidden');
}

function hideCurrencyForm() {
    currencyFormContainer.classList.add('hidden');
    currencyForm.reset();
    document.getElementById('currency-id').value = '';
    document.getElementById('currency-form-message').classList.add('hidden');
}

function showPriceBookForm() {
    priceBookFormContainer.classList.remove('hidden');
}

function hidePriceBookForm() {
    priceBookFormContainer.classList.add('hidden');
    priceBookForm.reset();
    document.getElementById('price-book-id').value = '';
    document.getElementById('price-book-form-message').classList.add('hidden');
}

// --- Data Loading Functions ---

/**
 * Fetches data from a Firestore collection.
 * @param {string} collectionPath - The path to the Firestore collection.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of documents.
 */
async function fetchData(collectionPath) {
    if (!db || !userId) {
        console.warn("Firestore or userId not available. Cannot fetch data from:", collectionPath);
        return [];
    }
    try {
        const q = query(collection(db, collectionPath));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return data;
    } catch (error) {
        console.error("Error fetching data from", collectionPath, ":", error);
        showMessageBox(`Error loading data from ${collectionPath}: ${error.message}`, false);
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
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        selectElement.appendChild(option);
    });
}

// Part 4: Customer and Lead DOM Elements

// Customer Elements
const addCustomerBtn = document.getElementById('add-customer-btn');
const customerFormContainer = document.getElementById('customer-form-container');
const customerForm = document.getElementById('customer-form');
const cancelCustomerBtn = document.getElementById('cancel-customer-btn');
const customersGridContainer = document.getElementById('customers-grid-container');
const noCustomersMessage = document.getElementById('no-customers-message');
const customerSearchInput = document.getElementById('customer-search');
let customersGrid; // Grid.js instance

// Lead Elements
const addLeadBtn = document.getElementById('add-lead-btn');
const leadFormContainer = document.getElementById('lead-form-container');
const leadForm = document.getElementById('lead-form');
const cancelLeadBtn = document.getElementById('cancel-lead-btn');
const leadsGridContainer = document.getElementById('leads-grid-container');
const noLeadsMessage = document.getElementById('no-leads-message');
const leadSearchInput = document.getElementById('lead-search');
let leadsGrid; // Grid.js instance

// Part 5: Customer and Lead Logic

// --- Customer Logic ---

async function setupCustomerForm(customer = null) {
    const countries = await fetchData(`artifacts/${appId}/public/data/countries`);
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
        customerForm.reset();
        document.getElementById('customer-id').value = '';
        document.getElementById('customer-active').checked = true; // Default to active for new customers
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
    messageElement.classList.add('hidden');

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
        updatedAt: FieldValue.serverTimestamp(),
        userId: userId // Store the user ID for ownership/security rules
    };

    try {
        const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);
        if (customerId) {
            await updateDoc(doc(collectionRef, customerId), customerData);
            showMessageBox("Customer updated successfully!", false);
        } else {
            customerData.createdAt = FieldValue.serverTimestamp();
            await addDoc(collectionRef, customerData);
            showMessageBox("Customer added successfully!", false);
        }
        hideCustomerForm();
        await loadCustomers(); // Reload grid
        await updateDashboard();
    } catch (error) {
        console.error("Error saving customer:", error);
        messageElement.textContent = `Error saving customer: ${error.message}`;
        messageElement.classList.remove('hidden');
    }
}

async function loadCustomers() {
    if (!db || !userId) {
        noCustomersMessage.classList.remove('hidden');
        if (customersGrid) customersGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    const customersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);

    // Setup real-time listener
    onSnapshot(customersCollectionRef, snapshot => {
        const customers = [];
        snapshot.forEach(doc => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        renderCustomersGrid(customers);
    }, error => {
        console.error("Error loading customers in real-time:", error);
        showMessageBox(`Error loading customers: ${error.message}`, false);
        noCustomersMessage.classList.remove('hidden');
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
                td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                footer: 'p-4',
                pagination: 'flex items-center justify-between',
                container: 'overflow-x-auto'
            }
        }).render(customersGridContainer);
        console.log('Grid.js is now available.'); // Log once when grid is initialized
    } else {
        customersGrid.updateConfig({ data: data }).forceRender();
    }

    if (customers.length === 0) {
        noCustomersMessage.classList.remove('hidden');
    } else {
        noCustomersMessage.classList.add('hidden');
    }
}

async function editCustomer(customerId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, customerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupCustomerForm(docSnap.data());
            document.getElementById('customer-id').value = customerId; // Ensure ID is set
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
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, customerId));
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
        { id: 'Photography', name: 'Photography' },
        { id: 'Videography', name: 'Videography' },
        { id: 'Both', name: 'Both' },
        { id: 'Other', name: 'Other' }
    ];
    populateSelect(document.getElementById('lead-services-interested'), services, 'id', 'name', 'Select Service');

    // Populate Source (example data, replace with Firestore if needed)
    const sources = [
        { id: 'Website', name: 'Website' },
        { id: 'Referral', name: 'Referral' },
        { id: 'Advertisement', name: 'Advertisement' },
        { id: 'Social Media', name: 'Social Media' },
        { id: 'Event', name: 'Event' },
        { id: 'Other', name: 'Other' }
    ];
    populateSelect(document.getElementById('lead-source'), sources, 'id', 'name', 'Select Source');

    if (lead) {
        document.getElementById('lead-id').value = lead.id;
        document.getElementById('lead-contact-name').value = lead.contactName || '';
        document.getElementById('lead-phone').value = lead.phone || '';
        document.getElementById('lead-email').value = lead.email || '';
        document.getElementById('lead-services-interested').value = lead.servicesInterested || '';
        document.getElementById('lead-event-date').value = lead.eventDate || '';
        document.getElementById('lead-source').value = lead.source || '';
        document.getElementById('lead-additional-details').value = lead.additionalDetails || '';
    } else {
        leadForm.reset();
        document.getElementById('lead-id').value = '';
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
    messageElement.classList.add('hidden');

    const leadData = {
        contactName: document.getElementById('lead-contact-name').value,
        phone: document.getElementById('lead-phone').value,
        email: document.getElementById('lead-email').value,
        servicesInterested: document.getElementById('lead-services-interested').value,
        eventDate: document.getElementById('lead-event-date').value,
        source: document.getElementById('lead-source').value,
        additionalDetails: document.getElementById('lead-additional-details').value,
        updatedAt: FieldValue.serverTimestamp(),
        userId: userId
    };

    try {
        const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/leads`);
        if (leadId) {
            await updateDoc(doc(collectionRef, leadId), leadData);
            showMessageBox("Lead updated successfully!", false);
        } else {
            leadData.createdAt = FieldValue.serverTimestamp();
            await addDoc(collectionRef, leadData);
            showMessageBox("Lead added successfully!", false);
        }
        hideLeadForm();
        await loadLeads(); // Reload grid
    } catch (error) {
        console.error("Error saving lead:", error);
        messageElement.textContent = `Error saving lead: ${error.message}`;
        messageElement.classList.remove('hidden');
    }
}

async function loadLeads() {
    if (!db || !userId) {
        noLeadsMessage.classList.remove('hidden');
        if (leadsGrid) leadsGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/leads`), snapshot => {
        const leads = [];
        snapshot.forEach(doc => {
            leads.push({ id: doc.id, ...doc.data() });
        });
        renderLeadsGrid(leads);
    }, error => {
        console.error("Error loading leads in real-time:", error);
        showMessageBox(`Error loading leads: ${error.message}`, false);
        noLeadsMessage.classList.remove('hidden');
        if (leadsGrid) leadsGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderLeadsGrid(leads) {
    const data = leads.map(lead => [
        lead.contactName,
        lead.email,
        lead.phone,
        lead.servicesInterested,
        lead.eventDate,
        lead.source,
        lead.id
    ]);

    if (!leadsGrid) {
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
                td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                footer: 'p-4',
                pagination: 'flex items-center justify-between',
                container: 'overflow-x-auto'
            }
        }).render(leadsGridContainer);
    } else {
        leadsGrid.updateConfig({ data: data }).forceRender();
    }

    if (leads.length === 0) {
        noLeadsMessage.classList.remove('hidden');
    } else {
        noLeadsMessage.classList.add('hidden');
    }
}

async function editLead(leadId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/leads`, leadId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupLeadForm(docSnap.data());
            document.getElementById('lead-id').value = leadId; // Ensure ID is set
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
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/leads`, leadId));
        showMessageBox("Lead deleted successfully!", false);
        await loadLeads(); // Reload grid
    } catch (error) {
        console.error("Error deleting lead:", error);
        showMessageBox(`Error deleting lead: ${error.message}`, false);
    }
}

// Part 6: Opportunity DOM Elements

// Opportunity Elements
const addOpportunityBtn = document.getElementById('add-opportunity-btn');
const opportunityFormContainer = document.getElementById('opportunity-form-container');
const opportunityForm = document.getElementById('opportunity-form'); // This is the element in question
const cancelOpportunityBtn = document.getElementById('cancel-opportunity-btn');
const opportunitiesGridContainer = document.getElementById('opportunities-grid-container');
const noOpportunitiesMessage = document.getElementById('no-opportunities-message');
const opportunitySearchInput = document.getElementById('opportunity-search');
let opportunitiesGrid; // Grid.js instance

// Work Log Elements (within Opportunity Form)
const addWorkLogEntryBtn = document.getElementById('add-work-log-entry-btn');
const workLogFormContainer = document.getElementById('work-log-form-container');
const workLogForm = document.getElementById('work-log-form');
const cancelWorkLogBtn = document.getElementById('cancel-work-log-btn');
const workLogsList = document.getElementById('work-logs-list');
const noWorkLogsMessage = document.getElementById('no-work-logs-message');

// Part 7: Opportunity Logic

// --- Opportunity Logic ---

async function setupOpportunityForm(opportunity = null) {
    const customers = await fetchData(`artifacts/${appId}/users/${userId}/customers`);
    populateSelect(document.getElementById('opportunity-customer'), customers, 'id', 'name', 'Select a Customer');

    const currencies = await fetchData(`artifacts/${appId}/public/data/currencies`);
    populateSelect(document.getElementById('opportunity-currency'), currencies, 'code', 'code', 'Select...');

    const priceBooks = await fetchData(`artifacts/${appId}/public/data/priceBooks`);
    populateSelect(document.getElementById('opportunity-price-book'), priceBooks, 'id', 'name', 'Select a Price Book');

    if (opportunity) {
        currentOpportunityId = opportunity.id;
        document.getElementById('opportunity-id').value = opportunity.id;
        document.getElementById('opportunity-name').value = opportunity.name || '';
        document.getElementById('opportunity-customer').value = opportunity.customerId || '';
        document.getElementById('opportunity-currency').value = opportunity.currency || '';
        document.getElementById('opportunity-price-book').value = opportunity.priceBookId || '';
        document.getElementById('opportunity-start-date').value = opportunity.expectedStartDate || '';
        document.getElementById('opportunity-close-date').value = opportunity.expectedCloseDate || '';
        document.getElementById('opportunity-sales-stage').value = opportunity.salesStage || 'Prospect';
        document.getElementById('opportunity-probability').value = opportunity.probability !== undefined ? opportunity.probability : '';
        document.getElementById('opportunity-value').value = opportunity.value !== undefined ? opportunity.value : '';
        document.getElementById('opportunity-notes').value = opportunity.notes || '';

        await loadWorkLogs(opportunity.id); // Load work logs for this opportunity
    } else {
        opportunityForm.reset();
        document.getElementById('opportunity-id').value = '';
        currentOpportunityId = null;
        workLogsList.innerHTML = ''; // Clear work logs for new opportunity
        noWorkLogsMessage.classList.remove('hidden');
    }
    showOpportunityForm();
    console.log('Add Opportunity form setup complete.');
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
    messageElement.classList.add('hidden');

    const opportunityData = {
        name: document.getElementById('opportunity-name').value,
        customerId: document.getElementById('opportunity-customer').value,
        currency: document.getElementById('opportunity-currency').value,
        priceBookId: document.getElementById('opportunity-price-book').value,
        expectedStartDate: document.getElementById('opportunity-start-date').value,
        expectedCloseDate: document.getElementById('opportunity-close-date').value,
        salesStage: document.getElementById('opportunity-sales-stage').value,
        probability: parseFloat(document.getElementById('opportunity-probability').value) || 0,
        value: parseFloat(document.getElementById('opportunity-value').value) || 0,
        notes: document.getElementById('opportunity-notes').value,
        updatedAt: FieldValue.serverTimestamp(),
        userId: userId
    };

    try {
        const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/opportunities`);
        if (opportunityId) {
            await updateDoc(doc(collectionRef, opportunityId), opportunityData);
            showMessageBox("Opportunity updated successfully!", false);
        } else {
            opportunityData.createdAt = FieldValue.serverTimestamp();
            const docRef = await addDoc(collectionRef, opportunityData);
            currentOpportunityId = docRef.id; // Set ID for new opportunity
            showMessageBox("Opportunity added successfully!", false);
        }
        hideOpportunityForm();
        await loadOpportunities(); // Reload grid
        await updateDashboard();
    } catch (error) {
        console.error("Error saving opportunity:", error);
        messageElement.textContent = `Error saving opportunity: ${error.message}`;
        messageElement.classList.remove('hidden');
    }
}

async function loadOpportunities() {
    if (!db || !userId) {
        noOpportunitiesMessage.classList.remove('hidden');
        if (opportunitiesGrid) opportunitiesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    onSnapshot(collection(db, `artifacts/${appId}/users/${userId}/opportunities`), async snapshot => {
        const opportunities = [];
        for (const docSnap of snapshot.docs) { // Renamed doc to docSnap to avoid conflict with import
            const opp = { id: docSnap.id, ...docSnap.data() };
            // Fetch customer name
            if (opp.customerId) {
                try {
                    const customerSnap = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/customers`, opp.customerId));
                    opp.customerName = customerSnap.exists() ? customerSnap.data().name : 'Unknown Customer';
                } catch (error) {
                    console.warn(`Could not fetch customer ${opp.customerId}:`, error);
                    opp.customerName = 'Error Loading Customer';
                }
            } else {
                opp.customerName = 'N/A';
            }
            opportunities.push(opp);
        }
        renderOpportunitiesGrid(opportunities);
    }, error => {
        console.error("Error loading opportunities in real-time:", error);
        showMessageBox(`Error loading opportunities: ${error.message}`, false);
        noOpportunitiesMessage.classList.remove('hidden');
        if (opportunitiesGrid) opportunitiesGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderOpportunitiesGrid(opportunities) {
    const data = opportunities.map(opportunity => [
        opportunity.name,
        opportunity.customerName, // Display fetched customer name
        `${opportunity.currency} ${opportunity.value.toFixed(2)}`,
        opportunity.salesStage,
        `${opportunity.probability}%`,
        opportunity.expectedCloseDate,
        opportunity.id
    ]);

    if (!opportunitiesGrid) {
        opportunitiesGrid = new gridjs.Grid({
            columns: [
                { name: 'Opportunity Name', width: '20%' },
                { name: 'Customer', width: '20%' },
                { name: 'Value', width: '15%' },
                { name: 'Stage', width: '15%' },
                { name: 'Probability', width: '10%' },
                { name: 'Close Date', width: '10%' },
                {
                    name: 'Actions',
                    width: '10%',
                    formatter: (cell, row) => {
                        return gridjs.h('div', { className: 'flex space-x-2' },
                            gridjs.h('button', {
                                className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                onclick: () => editOpportunity(row.cells[6].data)
                            }, 'Edit'),
                            gridjs.h('button', {
                                className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                onclick: () => deleteOpportunity(row.cells[6].data)
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
                td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                footer: 'p-4',
                pagination: 'flex items-center justify-between',
                container: 'overflow-x-auto'
            }
        }).render(opportunitiesGridContainer);
    } else {
        opportunitiesGrid.updateConfig({ data: data }).forceRender();
    }

    if (opportunities.length === 0) {
        noOpportunitiesMessage.classList.remove('hidden');
    } else {
        noOpportunitiesMessage.classList.add('hidden');
    }
}

async function editOpportunity(opportunityId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/opportunities`, opportunityId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupOpportunityForm(docSnap.data());
            // currentOpportunityId is already set in setupOpportunityForm
        } else {
            showMessageBox("Opportunity not found!", false);
        }
    } catch (error) {
        console.error("Error editing opportunity:", error);
        showMessageBox(`Error loading opportunity for edit: ${error.message}`, false);
    }
}

async function deleteOpportunity(opportunityId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this opportunity and all its work logs?", true);
    if (!confirmDelete) return;

    if (!db || !userId) return;
    try {
        // Delete associated work logs first
        const workLogsRef = collection(db, `artifacts/${appId}/users/${userId}/workLogs`);
        const workLogsQuery = query(workLogsRef, where('opportunityId', '==', opportunityId));
        const workLogsSnapshot = await getDocs(workLogsQuery);
        const batch = writeBatch(db);
        workLogsSnapshot.forEach(docSnap => { // Renamed doc to docSnap
            batch.delete(docSnap.ref);
        });
        await batch.commit();

        // Then delete the opportunity
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/opportunities`, opportunityId));
        showMessageBox("Opportunity and associated work logs deleted successfully!", false);
        await loadOpportunities(); // Reload grid
        await updateDashboard();
    } catch (error) {
        console.error("Error deleting opportunity:", error);
        showMessageBox(`Error deleting opportunity: ${error.message}`, false);
    }
}

// Part 8: Work Log Logic

// --- Work Log Logic ---

async function loadWorkLogs(opportunityId) {
    if (!db || !userId || !opportunityId) {
        workLogsList.innerHTML = '';
        noWorkLogsMessage.classList.remove('hidden');
        return;
    }

    onSnapshot(query(collection(db, `artifacts/${appId}/users/${userId}/workLogs`),
        where('opportunityId', '==', opportunityId),
        orderBy('date', 'desc')), // Order by date, newest first
        snapshot => {
            workLogsList.innerHTML = ''; // Clear existing logs
            if (snapshot.empty) {
                noWorkLogsMessage.classList.remove('hidden');
                return;
            }
            noWorkLogsMessage.classList.add('hidden');
            snapshot.forEach(docSnap => { // Renamed doc to docSnap
                const log = docSnap.data();
                const logId = docSnap.id;
                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-3 rounded-md shadow-sm border border-gray-200 flex justify-between items-center';
                li.innerHTML = `
                    <div>
                        <p class="text-sm font-semibold text-gray-700">${log.date} - ${log.type}</p>
                        <p class="text-gray-600 text-sm mt-1">${log.details}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button type="button" class="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-xs"
                            onclick="editWorkLog('${logId}')">Edit</button>
                        <button type="button" class="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-xs"
                            onclick="deleteWorkLog('${logId}', '${opportunityId}')">Delete</button>
                    </div>
                `;
                workLogsList.appendChild(li);
            });
        }, error => {
            console.error("Error loading work logs in real-time:", error);
            showMessageBox(`Error loading work logs: ${error.message}`, false);
            workLogsList.innerHTML = '';
            noWorkLogsMessage.classList.remove('hidden');
        });
}

async function handleSaveWorkLog(event) {
    event.preventDefault();
    if (!db || !userId || !currentOpportunityId) {
        showMessageBox("Authentication or selected opportunity required to save work log.", false);
        return;
    }

    const workLogId = document.getElementById('work-log-id').value;
    const messageElement = document.getElementById('work-log-form-message');
    messageElement.classList.add('hidden');

    const workLogData = {
        opportunityId: currentOpportunityId,
        date: document.getElementById('work-log-date').value,
        type: document.getElementById('work-log-type').value,
        details: document.getElementById('work-log-details').value,
        updatedAt: FieldValue.serverTimestamp(),
        userId: userId
    };

    try {
        const collectionRef = collection(db, `artifacts/${appId}/users/${userId}/workLogs`);
        if (workLogId) {
            await updateDoc(doc(collectionRef, workLogId), workLogData);
            showMessageBox("Work log updated successfully!", false);
        } else {
            workLogData.createdAt = FieldValue.serverTimestamp();
            await addDoc(collectionRef, workLogData);
            showMessageBox("Work log added successfully!", false);
        }
        hideWorkLogForm();
        // loadWorkLogs is already onSnapshot, so it will update automatically
    } catch (error) {
        console.error("Error saving work log:", error);
        messageElement.textContent = `Error saving work log: ${error.message}`;
        messageElement.classList.remove('hidden');
    }
}

async function editWorkLog(workLogId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, `artifacts/${appId}/users/${userId}/workLogs`, workLogId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const log = docSnap.data();
            document.getElementById('work-log-id').value = workLogId;
            document.getElementById('work-log-opportunity-id').value = log.opportunityId;
            document.getElementById('work-log-date').value = log.date;
            document.getElementById('work-log-type').value = log.type;
            document.getElementById('work-log-details').value = log.details;
            showWorkLogForm();
        } else {
            showMessageBox("Work log not found!", false);
        }
    } catch (error) {
        console.error("Error editing work log:", error);
        showMessageBox(`Error loading work log for edit: ${error.message}`, false);
    }
}

async function deleteWorkLog(workLogId, opportunityId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this work log entry?", true);
    if (!confirmDelete) return;

    if (!db || !userId) return;
    try {
        await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/workLogs`, workLogId));
        showMessageBox("Work log deleted successfully!", false);
        // loadWorkLogs is already onSnapshot, so it will update automatically
    } catch (error) {
        console.error("Error deleting work log:", error);
        showMessageBox(`Error deleting work log: ${error.message}`, false);
    }
}

// Part 9: Admin Data (Countries, Currencies, Price Books) DOM Elements

// Admin Elements
const addCountryBtn = document.getElementById('add-country-btn');
const countryFormContainer = document.getElementById('country-form-container');
const countryForm = document.getElementById('country-form');
const cancelCountryBtn = document.getElementById('cancel-country-btn');
const countriesGridContainer = document.getElementById('countries-grid-container');
const noCountriesMessage = document.getElementById('no-countries-message');
const countrySearchInput = document.getElementById('country-search');
let countriesGrid;

const addCurrencyBtn = document.getElementById('add-currency-btn');
const currencyFormContainer = document.getElementById('currency-form-container');
const currencyForm = document.getElementById('currency-form');
const cancelCurrencyBtn = document.getElementById('cancel-currency-btn');
const currenciesGridContainer = document.getElementById('currencies-grid-container');
const noCurrenciesMessage = document.getElementById('no-currencies-message');
const currencySearchInput = document.getElementById('currency-search');
let currenciesGrid;

const addPriceBookBtn = document.getElementById('add-price-book-btn');
const priceBookFormContainer = document.getElementById('price-book-form-container');
const priceBookForm = document.getElementById('price-book-form');
const cancelPriceBookBtn = document.getElementById('cancel-price-book-btn');
const priceBooksGridContainer = document.getElementById('price-books-grid-container');
const noPriceBooksMessage = document.getElementById('no-price-books-message');
const priceBookSearchInput = document.getElementById('price-book-search');
let priceBooksGrid;

// Part 10: Admin Logic - Countries

async function setupCountryForm(country = null) {
    if (country) {
        document.getElementById('country-id').value = country.id;
        document.getElementById('country-name').value = country.name || '';
        document.getElementById('country-code').value = country.code || '';
        document.getElementById('country-states').value = Array.isArray(country.states) ? country.states.join(', ') : '';
    } else {
        countryForm.reset();
        document.getElementById('country-id').value = '';
    }
    showCountryForm();
}

async function handleSaveCountry(event) {
    event.preventDefault();
    if (!db || userRole !== 'admin') {
        showMessageBox("Admin privileges required to save country.", false);
        return;
    }

    const countryId = document.getElementById('country-id').value;
    const messageElement = document.getElementById('country-form-message');
    messageElement.classList.add('hidden');

    const countryData = {
        name: document.getElementById('country-name').value,
        code: document.getElementById('country-code').value.toUpperCase(),
        states: document.getElementById('country-states').value.split(',').map(s => s.trim()).filter(s => s !== ''),
        updatedAt: FieldValue.serverTimestamp()
    };

    try {
        const collectionRef = collection(db, `artifacts/${appId}/public/data/countries`);
        if (countryId) {
            await updateDoc(doc(collectionRef, countryId), countryData);
            showMessageBox("Country updated successfully!", false);
        } else {
            countryData.createdAt = FieldValue.serverTimestamp();
            await addDoc(collectionRef, countryData);
            showMessageBox("Country added successfully!", false);
        }
        hideCountryForm();
        await loadCountries();
    } catch (error) {
        console.error("Error saving country:", error);
        messageElement.textContent = `Error saving country: ${error.message}`;
        messageElement.classList.remove('hidden');
    }
}

async function loadCountries() {
    if (!db || userRole !== 'admin') {
        noCountriesMessage.classList.remove('hidden');
        if (countriesGrid) countriesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    onSnapshot(collection(db, `artifacts/${appId}/public/data/countries`), snapshot => {
        const countries = [];
        snapshot.forEach(doc => {
            countries.push({ id: doc.id, ...doc.data() });
        });
        renderCountriesGrid(countries);
    }, error => {
        console.error("Error loading countries in real-time:", error);
        showMessageBox(`Error loading countries: ${error.message}`, false);
        noCountriesMessage.classList.remove('hidden');
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
                td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                footer: 'p-4',
                pagination: 'flex items-center justify-between',
                container: 'overflow-x-auto'
            }
        }).render(countriesGridContainer);
    } else {
        countriesGrid.updateConfig({ data: data }).forceRender();
    }

    if (countries.length === 0) {
        noCountriesMessage.classList.remove('hidden');
    } else {
        noCountriesMessage.classList.add('hidden');
    }
}

async function editCountry(countryId) {
    if (!db || userRole !== 'admin') return;
    try {
        const docRef = doc(db, `artifacts/${appId}/public/data/countries`, countryId);
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

    if (!db || userRole !== 'admin') return;
    try {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/countries`, countryId));
        showMessageBox("Country deleted successfully!", false);
        await loadCountries();
    } catch (error) {
        console.error("Error deleting country:", error);
        showMessageBox(`Error deleting country: ${error.message}`, false);
    }
}
