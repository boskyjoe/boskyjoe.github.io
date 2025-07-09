import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, addDoc, getDocs, serverTimestamp, Timestamp, onSnapshot, runTransaction, orderBy } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { html as h } from 'https://unpkg.com/gridjs?module';

// --- Firebase Configuration (FOR GITHUB PAGES) ---
// IMPORTANT: This configuration is specific to your Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
  authDomain: "shuttersync-96971.firebaseapp.com",
  projectId: "shuttersync-96971",
  storageBucket: "shuttersync-96971.appspot.com",
  messagingSenderId: "10782416018",
  appId: "1:10782416018:web:361db5572882a62f291a4b",
  measurementId: "G-T0W9CES4D3" // Included as provided
};

// For GitHub Pages, we'll use a fixed application ID.
// This is used for structuring your Firestore data paths (e.g., /artifacts/{appId}/...)
const appId = 'shutter-sync-crm'; // You can change this string to anything unique for your app

// Global Firebase variables
let app;
let db;
let auth;
let userId;
let currentUserRole = 'Standard'; // Default role

// Global UI elements
const loadingOverlay = document.getElementById('loadingOverlay');
const messageBoxModal = document.getElementById('messageBoxModal');
const messageBoxTitle = document.getElementById('messageBoxTitle');
const messageBoxContent = document.getElementById('messageBoxContent');
const messageBoxConfirmBtn = document.getElementById('messageBoxConfirmBtn');
const messageBoxCancelBtn = document.getElementById('messageBoxCancelBtn');

// Sidebar and Module elements
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const navButtons = document.querySelectorAll('.nav-button');
const modules = document.querySelectorAll('.module');
const currentModuleTitle = document.getElementById('currentModuleTitle');

// Auth elements
const authButton = document.getElementById('authButton');
const authButtonAnon = document.getElementById('authButtonAnon');
const userInfoDisplay = document.getElementById('userInfoDisplay');
const userEmailSpan = document.getElementById('userEmail');
const userRoleSpan = document.getElementById('userRole');
const userDropdownBtn = document.getElementById('userDropdownBtn');
const userDropdownMenu = document.getElementById('userDropdownMenu');
const signOutBtn = document.getElementById('signOutBtn');

// Auth Modal elements
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const signInBtn = document.getElementById('signInBtn');
const signUpBtn = document.getElementById('signUpBtn');
const authEmailError = document.getElementById('authEmailError');
const authPasswordError = document.getElementById('authPasswordError');

// Customer Module elements
const addCustomerBtn = document.getElementById('addCustomerBtn');
const customerModal = document.getElementById('customerModal');
const customerModalTitle = document.getElementById('customerModalTitle');
const customerForm = document.getElementById('customerForm');
const customerIdInput = document.getElementById('customerId');
const customerNameInput = document.getElementById('customerName');
const customerEmailInput = document.getElementById('customerEmail');
const customerPhoneInput = document.getElementById('customerPhone');
const customerAddressInput = document.getElementById('customerAddress');
const customerTypeSelect = document.getElementById('customerType');
const customerPreferredContactMethodSelect = document.getElementById('customerPreferredContactMethod');
const customerNameError = document.getElementById('customerNameError');
const customerEmailError = document.getElementById('customerEmailError');
const customerPhoneError = document.getElementById('customerPhoneError');

// Opportunity Module elements
const addOpportunityBtn = document.getElementById('addOpportunityBtn');
const opportunityModal = document.getElementById('opportunityModal');
const opportunityModalTitle = document.getElementById('opportunityModalTitle');
const opportunityForm = document.getElementById('opportunityForm');
const opportunityIdInput = document.getElementById('opportunityId');
const opportunityCustomerSelect = document.getElementById('opportunityCustomer');
const opportunityNameInput = document.getElementById('opportunityName');
const opportunityDescriptionInput = document.getElementById('opportunityDescription');
const opportunityValueInput = document.getElementById('opportunityValue');
const opportunitySalesStageSelect = document.getElementById('opportunitySalesStage');
const opportunityCloseDateInput = document.getElementById('opportunityCloseDate');
const opportunityCustomerError = document.getElementById('opportunityCustomerError');
const opportunityNameError = document.getElementById('opportunityNameError');
const opportunityValueError = document.getElementById('opportunityValueError');
const opportunityCloseDateError = document.getElementById('opportunityCloseDateError');

// Price Book Module elements
const addPriceBookBtn = document.getElementById('addPriceBookBtn');
const priceBookModal = document.getElementById('priceBookModal');
const priceBookModalTitle = document.getElementById('priceBookModalTitle');
const priceBookForm = document.getElementById('priceBookForm');
const priceBookIdInput = document.getElementById('priceBookId');
const priceBookNameInput = document.getElementById('priceBookName');
const priceBookCountrySelect = document.getElementById('priceBookCountrySelect');
const priceBookCurrencySelect = document.getElementById('priceBookCurrencySelect');
const priceBookIsActiveCheckbox = document.getElementById('priceBookIsActive');
const priceBookValidFromInput = document.getElementById('priceBookValidFromInput');
const priceBookValidToInput = document.getElementById('priceBookValidToInput');
const priceBookNameError = document.getElementById('priceBookNameError');
const priceBookCountryError = document.getElementById('priceBookCountryError');
const priceBookCurrencyError = document.getElementById('priceBookCurrencyError');
const priceBookValidFromError = document.getElementById('priceBookValidFromError');
const priceBookValidToError = document.getElementById('priceBookValidToError');

// Admin Panel elements
const addUserBtn = document.getElementById('addUserBtn');
const adminUserModal = document.getElementById('adminUserModal');
const adminUserModalTitle = document.getElementById('adminUserModalTitle');
const adminUserForm = document.getElementById('adminUserForm');
const adminUserIdInput = document.getElementById('adminUserId');
const adminUserEmailInput = document.getElementById('adminUserEmail');
const adminUserRoleSelect = document.getElementById('adminUserRole');
const adminUserEmailError = document.getElementById('adminUserEmailError');
const adminUserRoleError = document.getElementById('adminUserRoleError');

const addCountryBtn = document.getElementById('addCountryBtn');
const countryModal = document.getElementById('countryModal');
const countryModalTitle = document = document.getElementById('countryModalTitle');
const countryForm = document.getElementById('countryForm');
const countryIdInput = document.getElementById('countryId');
const countryNameInput = document.getElementById('countryName');
const countryCodeInput = document.getElementById('countryCode');
const countryNameError = document.getElementById('countryNameError');
const countryCodeError = document.getElementById('countryCodeError');

const addCurrencyBtn = document.getElementById('addCurrencyBtn');
const currencyModal = document.getElementById('currencyModal');
const currencyModalTitle = document.getElementById('currencyModalTitle');
const currencyForm = document.getElementById('currencyForm');
const currencyIdInput = document.getElementById('currencyId');
const currencyNameInput = document.getElementById('currencyName');
const currencyCodeInput = document.getElementById('currencyCode');
const currencySymbolInput = document.getElementById('currencySymbol');
const currencyNameError = document.getElementById('currencyNameError');
const currencyCodeError = document.getElementById('currencyCodeError');

// App Settings elements
const appSettingsForm = document.getElementById('appSettingsForm');
const defaultCurrencySelect = document.getElementById('defaultCurrency');
const defaultCountrySelect = document.getElementById('defaultCountry');

// Global Grid instances (to allow for updates)
let customersGrid;
let opportunitiesGrid;
let usersGrid;
let countriesGrid;
let currenciesGrid;
let priceBooksGrid;

// --- Utility Functions ---

/**
 * Shows or hides the global loading overlay.
 * @param {boolean} show - True to show, false to hide.
 */
function showLoadingOverlay(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
        // Trigger reflow to ensure transition plays
        loadingOverlay.offsetHeight;
        loadingOverlay.classList.remove('opacity-0');
        loadingOverlay.classList.add('opacity-100');
    } else {
        loadingOverlay.classList.remove('opacity-100');
        loadingOverlay.classList.add('opacity-0');
        loadingOverlay.addEventListener('transitionend', function handler() {
            loadingOverlay.classList.add('hidden');
            loadingOverlay.removeEventListener('transitionend', handler);
        });
    }
}

/**
 * Displays a custom message box modal.
 * @param {string} type - 'info', 'success', 'error', or 'confirm'.
 * @param {string} title - The title of the message box.
 * @param {string} message - The message content.
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled (for 'confirm' type).
 */
function showMessage(type, title, message) {
    return new Promise((resolve) => {
        messageBoxTitle.textContent = title;
        messageBoxContent.textContent = message;

        // Reset button visibility
        messageBoxConfirmBtn.classList.add('hidden');
        messageBoxCancelBtn.classList.add('hidden');
        messageBoxConfirmBtn.onclick = null;
        messageBoxCancelBtn.onclick = null;

        if (type === 'confirm') {
            messageBoxConfirmBtn.classList.remove('hidden');
            messageBoxCancelBtn.classList.remove('hidden');
            messageBoxConfirmBtn.textContent = 'Confirm';
            messageBoxCancelBtn.textContent = 'Cancel';
            messageBoxConfirmBtn.onclick = () => {
                messageBoxModal.classList.add('hidden');
                messageBoxModal.querySelector('.modal-content').classList.remove('scale-100', 'opacity-100');
                messageBoxModal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
                resolve(true);
            };
            messageBoxCancelBtn.onclick = () => {
                messageBoxModal.classList.add('hidden');
                messageBoxModal.querySelector('.modal-content').classList.remove('scale-100', 'opacity-100');
                messageBoxModal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
                resolve(false);
            };
        } else {
            messageBoxConfirmBtn.classList.remove('hidden');
            messageBoxConfirmBtn.textContent = 'OK';
            messageBoxConfirmBtn.onclick = () => {
                messageBoxModal.classList.add('hidden');
                messageBoxModal.querySelector('.modal-content').classList.remove('scale-100', 'opacity-100');
                messageBoxModal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
                resolve(true); // Always resolve true for info/error/success
            };
        }

        messageBoxModal.classList.remove('hidden');
        // Trigger reflow to ensure transition plays
        messageBoxModal.querySelector('.modal-content').offsetHeight;
        messageBoxModal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
        messageBoxModal.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
    });
}

/**
 * Formats a Firestore Timestamp or Date object for display (e.g., "YYYY-MM-DD").
 * @param {firebase.firestore.Timestamp | Date | null} timestamp - The timestamp or date object.
 * @returns {string} Formatted date string or empty string if null/invalid.
 */
function formatDateForDisplay(timestamp) {
    if (!timestamp) return '';
    let date;
    if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return '';
    }
    return date.toISOString().split('T')[0];
}

/**
 * Formats a Firestore Timestamp or Date object for input (e.g., "YYYY-MM-DD").
 * @param {firebase.firestore.Timestamp | Date | null} timestamp - The timestamp or date object.
 * @returns {string} Formatted date string or empty string if null/invalid.
 */
function formatDateForInput(timestamp) {
    if (!timestamp) return '';
    let date;
    if (timestamp instanceof Timestamp) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return '';
    }
    return date.toISOString().split('T')[0];
}

/**
 * Populates a select element with options from a Firestore collection.
 * @param {HTMLSelectElement} selectElement - The select element to populate.
 * @param {string} collectionName - The name of the Firestore collection.
 * @param {string} valueField - The field to use for the option's value.
 * @param {string} textField - The field to use for the option's text.
 * @param {string} defaultOptionText - Text for the default "Select..." option.
 * @param {string} [selectedValue] - The value of the option to pre-select.
 * @returns {Promise<Array<Object>>} A promise that resolves with the fetched data.
 */
async function populateSelect(selectElement, collectionName, valueField, textField, defaultOptionText, selectedValue = '') {
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
    try {
        const q = query(collection(db, `artifacts/${appId}/public/data/${collectionName}`));
        const querySnapshot = await getDocs(q);
        const data = [];
        querySnapshot.forEach((doc) => {
            const item = { id: doc.id, ...doc.data() };
            data.push(item);
            const option = document.createElement('option');
            option.value = item[valueField];
            option.textContent = item[textField];
            if (item[valueField] === selectedValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
        return data;
    } catch (error) {
        console.error(`Error populating ${collectionName} select:`, error);
        showMessage('error', 'Data Load Error', `Failed to load ${collectionName} options. Please try again.`);
        return [];
    }
}

/**
 * Resets all form fields and error messages.
 */
function resetForms() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.reset();
        const hiddenInputs = form.querySelectorAll('input[type="hidden"]');
        hiddenInputs.forEach(input => input.value = ''); // Clear hidden IDs
        const errorMessages = form.querySelectorAll('.error-message');
        errorMessages.forEach(span => {
            span.textContent = '';
            span.classList.add('hidden');
        });
        const invalidInputs = form.querySelectorAll('.is-invalid');
        invalidInputs.forEach(input => {
            input.classList.remove('is-invalid');
            if (input.hasAttribute('aria-invalid')) {
                input.setAttribute('aria-invalid', 'false');
            }
        });
        // Re-enable disabled inputs (e.g., adminUserEmailInput)
        const disabledInputs = form.querySelectorAll('[disabled]');
        disabledInputs.forEach(input => input.removeAttribute('disabled'));
    });
    // Specific resets for checkboxes/selects if needed
    priceBookIsActiveCheckbox.checked = false; // Default to inactive
}

/**
 * Shows a modal.
 * @param {HTMLElement} modalElement - The modal element to show.
 */
function showModal(modalElement) {
    modalElement.classList.remove('hidden');
    // Trigger reflow to ensure transition plays
    modalElement.querySelector('.modal-content').offsetHeight;
    modalElement.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
    modalElement.querySelector('.modal-content').classList.add('scale-100', 'opacity-100');
}

/**
 * Hides a modal.
 * @param {HTMLElement} modalElement - The modal element to hide.
 */
function hideModal(modalElement) {
    modalElement.querySelector('.modal-content').classList.remove('scale-100', 'opacity-100');
    modalElement.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
    modalElement.addEventListener('transitionend', function handler() {
        modalElement.classList.add('hidden');
        modalElement.removeEventListener('transitionend', handler);
    });
    resetForms();
}

/**
 * Validates a form field and displays an error message.
 * @param {HTMLElement} inputElement - The input element to validate.
 * @param {HTMLElement} errorElement - The span element to display the error.
 * @param {string} errorMessage - The error message to display.
 * @returns {boolean} True if valid, false otherwise.
 */
function validateField(inputElement, errorElement, errorMessage) {
    if (!inputElement.value.trim()) {
        inputElement.classList.add('is-invalid');
        errorElement.textContent = errorMessage;
        errorElement.classList.remove('hidden');
        if (inputElement.hasAttribute('aria-invalid')) {
            inputElement.setAttribute('aria-invalid', 'true');
        }
        return false;
    }
    inputElement.classList.remove('is-invalid');
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
    if (inputElement.hasAttribute('aria-invalid')) {
        inputElement.setAttribute('aria-invalid', 'false');
    }
    return true;
}

/**
 * Validates an email field.
 * @param {HTMLElement} inputElement
 * @param {HTMLElement} errorElement
 * @returns {boolean}
 */
function validateEmail(inputElement, errorElement) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inputElement.value.trim()) {
        return validateField(inputElement, errorElement, 'Email is required.');
    }
    if (!emailRegex.test(inputElement.value.trim())) {
        inputElement.classList.add('is-invalid');
        errorElement.textContent = 'Invalid email format.';
        errorElement.classList.remove('hidden');
        inputElement.setAttribute('aria-invalid', 'true');
        return false;
    }
    inputElement.classList.remove('is-invalid');
    errorElement.textContent = '';
    errorElement.classList.add('hidden');
    inputElement.setAttribute('aria-invalid', 'false');
    return true;
}

/**
 * Validates a date range.
 * @param {HTMLInputElement} fromInput
 * @param {HTMLSpanElement} fromError
 * @param {HTMLInputElement} toInput
 * @param {HTMLSpanElement} toError
 * @returns {boolean} True if valid, false otherwise.
 */
function validateDateRange(fromInput, fromError, toInput, toError) {
    let isValid = true;
    const fromDate = fromInput.value ? new Date(fromInput.value) : null;
    const toDate = toInput.value ? new Date(toInput.value) : null;

    // Clear previous errors
    fromInput.classList.remove('is-invalid');
    fromError.textContent = '';
    fromError.classList.add('hidden');
    if (fromInput.hasAttribute('aria-invalid')) fromInput.setAttribute('aria-invalid', 'false');

    toInput.classList.remove('is-invalid');
    toError.textContent = '';
    toError.classList.add('hidden');
    if (toInput.hasAttribute('aria-invalid')) toInput.setAttribute('aria-invalid', 'false');

    if (fromDate && toDate && fromDate > toDate) {
        toInput.classList.add('is-invalid');
        toError.textContent = 'Valid To date cannot be before Valid From date.';
        toError.classList.remove('hidden');
        if (toInput.hasAttribute('aria-invalid')) toInput.setAttribute('aria-invalid', 'true');
        isValid = false;
    }
    return isValid;
}


// --- Firebase Initialization ---
/**
 * Initializes Firebase and sets up authentication listener.
 */
async function initializeFirebase() {
    showLoadingOverlay(true);
    try {
        // Initialize Firebase with the hardcoded config
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // For GitHub Pages, we will always attempt anonymous sign-in first if no user is logged in.
        // Custom tokens are typically for server-side authentication.
        if (!auth.currentUser) {
             await signInAnonymously(auth);
        }

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                userEmailSpan.textContent = user.email || 'Anonymous User';
                authButton.textContent = 'Sign Out';
                authButtonAnon.classList.add('hidden');
                userInfoDisplay.classList.remove('hidden'); // Show user info
                userDropdownBtn.classList.remove('hidden'); // Show user dropdown

                // Get user role from Firestore
                // Note: 'users_data' is assumed to be in the public/data path for roles.
                const userDocRef = doc(db, `artifacts/${appId}/public/data/users_data`, userId);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    currentUserRole = userDocSnap.data().role || 'Standard';
                    userRoleSpan.textContent = `Role: ${currentUserRole}`;
                } else {
                    // Create a new user profile if it doesn't exist (e.g., for anonymous sign-in or first time email sign-up)
                    // Default to Standard role for new users
                    await setDoc(userDocRef, {
                        email: user.email || 'anonymous',
                        role: 'Standard',
                        createdAt: serverTimestamp(),
                        lastLogin: serverTimestamp()
                    }, { merge: true });
                    currentUserRole = 'Standard';
                    userRoleSpan.textContent = `Role: Standard`;
                }

                // Update last login
                await updateDoc(userDocRef, { lastLogin: serverTimestamp() });

                // Initialize UI based on role
                updateUIForRole();
                // Activate dashboard by default
                activateModule('dashboard');
                await loadDashboardData();

            } else {
                userId = null;
                currentUserRole = 'Standard'; // Reset role on sign out
                userEmailSpan.textContent = 'Not Signed In';
                userRoleSpan.textContent = '';
                authButton.textContent = 'Sign In';
                authButtonAnon.classList.remove('hidden'); // Keep anonymous sign-in option visible if no user
                userInfoDisplay.classList.add('hidden'); // Hide user info
                userDropdownBtn.classList.add('hidden'); // Hide user dropdown
                updateUIForRole(); // Reset UI for unauthenticated state
                activateModule('dashboard'); // Show dashboard for anonymous users
                await loadDashboardData(); // Load dashboard data for anonymous users
            }
            showLoadingOverlay(false);
        });

    } catch (error) {
        console.error("Error initializing Firebase or signing in:", error);
        showMessage('error', 'Initialization Error', `Failed to initialize application: ${error.message}`);
        showLoadingOverlay(false);
    }
}

/**
 * Updates UI elements based on the current user's role.
 */
function updateUIForRole() {
    const adminSections = document.querySelectorAll('.admin-section');
    const adminNavBtn = document.getElementById('adminNavBtn');
    const appSettingsNavBtn = document.getElementById('appSettingsNavBtn');

    if (currentUserRole === 'Admin') {
        adminNavBtn.classList.remove('hidden');
        appSettingsNavBtn.classList.remove('hidden');
        adminSections.forEach(section => section.classList.remove('hidden'));
    } else {
        adminNavBtn.classList.add('hidden');
        appSettingsNavBtn.classList.add('hidden');
        adminSections.forEach(section => section.classList.add('hidden'));
        // If current module is admin, switch to dashboard
        if (document.getElementById('adminModule').classList.contains('active') || document.getElementById('appSettingsModule').classList.contains('active')) {
            activateModule('dashboard');
        }
    }
}

// --- Dashboard Functions ---

/**
 * Loads and displays data for the dashboard.
 */
async function loadDashboardData() {
    showLoadingOverlay(true);
    try {
        // Total Customers
        let qCustomers;
        if (currentUserRole === 'Admin') {
            qCustomers = collection(db, `artifacts/${appId}/public/data/customers`);
        } else if (userId) { // For standard authenticated users
            qCustomers = query(collection(db, `artifacts/${appId}/users/${userId}/customers`), where('creatorId', '==', userId));
        } else { // For anonymous users
            qCustomers = collection(db, `artifacts/${appId}/users/anonymous/customers`); // Or handle as no data
        }
        const customersSnapshot = await getDocs(qCustomers);
        document.getElementById('totalCustomersCount').textContent = customersSnapshot.size;

        // Open Opportunities
        let qOpportunities;
        if (currentUserRole === 'Admin') {
            qOpportunities = query(collection(db, `artifacts/${appId}/public/data/opportunities`), where('salesStage', 'in', ['Prospecting', 'Qualification', 'Proposal', 'Negotiation']));
        } else if (userId) { // For standard authenticated users
            qOpportunities = query(collection(db, `artifacts/${appId}/users/${userId}/opportunities`), where('creatorId', '==', userId), where('salesStage', 'in', ['Prospecting', 'Qualification', 'Proposal', 'Negotiation']));
        } else { // For anonymous users
            qOpportunities = query(collection(db, `artifacts/${appId}/users/anonymous/opportunities`), where('salesStage', 'in', ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'])); // Or handle as no data
        }
        const opportunitiesSnapshot = await getDocs(qOpportunities);
        document.getElementById('openOpportunitiesCount').textContent = opportunitiesSnapshot.size;

        // Estimated Revenue
        let estimatedRevenue = 0;
        opportunitiesSnapshot.forEach(doc => {
            const data = doc.data();
            if (typeof data.value === 'number') {
                estimatedRevenue += data.value;
            }
        });
        document.getElementById('estimatedRevenue').textContent = `$${estimatedRevenue.toFixed(2)}`;

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showMessage('error', 'Dashboard Load Error', `Failed to load dashboard data: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

// --- Module Activation ---

/**
 * Activates a specific module and updates the navigation.
 * @param {string} moduleId - The ID of the module to activate (e.g., 'dashboard', 'customers').
 */
async function activateModule(moduleId) {
    modules.forEach(module => {
        module.classList.add('hidden');
        module.classList.remove('active');
    });
    navButtons.forEach(button => {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
    });

    const activeModule = document.getElementById(`${moduleId}Module`);
    const activeButton = document.getElementById(`${moduleId}NavBtn`);

    if (activeModule && activeButton) {
        activeModule.classList.remove('hidden');
        activeModule.classList.add('active');
        activeButton.classList.add('active');
        activeButton.setAttribute('aria-selected', 'true');
        currentModuleTitle.textContent = activeButton.textContent.trim();

        // Specific actions for each module
        showLoadingOverlay(true);
        try {
            if (moduleId === 'customers') {
                await renderCustomersGrid();
            } else if (moduleId === 'opportunities') {
                await renderOpportunitiesGrid();
                await populateSelect(opportunityCustomerSelect, 'customers', 'id', 'name', 'Select Customer');
            } else if (moduleId === 'admin') {
                if (currentUserRole === 'Admin') {
                    await renderUsersGrid();
                    await renderCountriesGrid();
                    await renderCurrenciesGrid();
                } else {
                    // If not admin, redirect to dashboard or show access denied
                    showMessage('error', 'Access Denied', 'You do not have permission to access the Admin Panel.');
                    activateModule('dashboard');
                }
            } else if (moduleId === 'priceBooks') {
                await renderPriceBooksGrid();
                await populateSelect(priceBookCountrySelect, 'countries', 'name', 'name', 'Select Country');
                await populateSelect(priceBookCurrencySelect, 'currencies', 'code', 'code', 'Select Currency');
            } else if (moduleId === 'appSettings') {
                if (currentUserRole === 'Admin') {
                    await loadAppSettings();
                    await populateSelect(defaultCurrencySelect, 'currencies', 'code', 'code', 'Select Default Currency');
                    await populateSelect(defaultCountrySelect, 'countries', 'name', 'name', 'Select Default Country');
                } else {
                    // If not admin, redirect to dashboard or show access denied
                    showMessage('error', 'Access Denied', 'You do not have permission to access App Settings.');
                    activateModule('dashboard');
                }
            } else if (moduleId === 'dashboard') {
                await loadDashboardData();
            }
        } catch (error) {
            console.error(`Error activating module ${moduleId}:`, error);
            showMessage('error', 'Module Error', `Failed to load ${moduleId} module: ${error.message}`);
        } finally {
            showLoadingOverlay(false);
        }
    }
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) {
        sidebar.classList.add('-translate-x-full');
    }
}

// --- Customer Functions ---

/**
 * Renders the customers data grid.
 */
async function renderCustomersGrid() {
    showLoadingOverlay(true);
    try {
        let customersCollectionRef;
        if (currentUserRole === 'Admin') {
            customersCollectionRef = collection(db, `artifacts/${appId}/public/data/customers`);
        } else {
            customersCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);
        }
        const q = query(customersCollectionRef, orderBy('createdAt', 'desc')); // Order by creation date
        const querySnapshot = await getDocs(q);
        const customers = [];
        querySnapshot.forEach((doc) => {
            customers.push({ id: doc.id, ...doc.data() });
        });

        if (customersGrid) {
            customersGrid.updateConfig({
                data: customers.map(c => [
                    c.name,
                    c.email,
                    c.phone,
                    c.type,
                    formatDateForDisplay(c.createdAt),
                    c.id, // Keep ID for actions
                    c.creatorId // Keep creatorId for client-side permission checks
                ])
            }).forceRender();
        } else {
            customersGrid = new gridjs.Grid({
                columns: [
                    { id: 'name', name: 'Name' },
                    { id: 'email', name: 'Email' },
                    { id: 'phone', name: 'Phone' },
                    { id: 'type', name: 'Type' },
                    { id: 'createdAt', name: 'Created At' },
                    {
                        name: 'Actions',
                        formatter: (cell, row) => {
                            const customerId = row.cells[5].data; // Assuming ID is the 6th cell (index 5)
                            const customerCreatorId = row.cells[6].data; // Assuming creatorId is the 7th cell (index 6)
                            return h('div', { className: 'flex space-x-2' },
                                h('button', {
                                    className: 'px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200',
                                    onClick: () => editCustomer(customerId)
                                }, 'Edit'),
                                h('button', {
                                    className: `px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 ${currentUserRole !== 'Admin' && customerCreatorId !== userId ? 'opacity-50 cursor-not-allowed' : ''}`,
                                    onClick: () => deleteCustomer(customerId, row.cells[0].data, customerCreatorId)
                                }, 'Delete')
                            );
                        }
                    }
                ],
                data: customers.map(c => [
                    c.name,
                    c.email,
                    c.phone,
                    c.type,
                    formatDateForDisplay(c.createdAt),
                    c.id,
                    c.creatorId
                ]),
                search: true,
                pagination: {
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                    container: 'overflow-x-auto'
                }
            }).render(document.getElementById('customersTable'));
        }
    } catch (error) {
        console.error("Error rendering customers grid:", error);
        showMessage('error', 'Customer Load Error', `Failed to load customers: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Opens the customer modal for adding a new customer.
 */
function addCustomer() {
    customerModalTitle.textContent = 'Add Customer';
    customerIdInput.value = '';
    resetForms();
    showModal(customerModal);
}

/**
 * Opens the customer modal for editing an existing customer.
 * @param {string} id - The ID of the customer to edit.
 */
async function editCustomer(id) {
    showLoadingOverlay(true);
    try {
        let customerDocRef;
        if (currentUserRole === 'Admin') {
            customerDocRef = doc(db, `artifacts/${appId}/public/data/customers`, id);
        } else {
            customerDocRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, id);
        }
        const docSnap = await getDoc(customerDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Client-side permission check for editing
            if (currentUserRole !== 'Admin' && data.creatorId !== userId) {
                showMessage('error', 'Access Denied', 'You do not have permission to edit this customer.');
                showLoadingOverlay(false);
                return;
            }

            customerIdInput.value = id;
            customerNameInput.value = data.name || '';
            customerEmailInput.value = data.email || '';
            customerPhoneInput.value = data.phone || '';
            customerAddressInput.value = data.address || '';
            customerTypeSelect.value = data.type || '';
            customerPreferredContactMethodSelect.value = data.preferredContactMethod || '';

            customerModalTitle.textContent = 'Edit Customer';
            showModal(customerModal);
        } else {
            showMessage('error', 'Not Found', 'Customer not found.');
        }
    } catch (error) {
        console.error("Error fetching customer for edit:", error);
        showMessage('error', 'Edit Error', `Failed to load customer data: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Handles the submission of the customer form (add/edit).
 * @param {Event} event - The form submission event.
 */
customerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showLoadingOverlay(true);

    // Client-side validation
    let isValid = true;
    isValid = validateField(customerNameInput, customerNameError, 'Customer Name is required.') && isValid;
    if (customerEmailInput.value.trim()) {
        isValid = validateEmail(customerEmailInput, customerEmailError) && isValid;
    } else {
        // If email is optional, clear error if empty
        customerEmailInput.classList.remove('is-invalid');
        customerEmailError.textContent = '';
        customerEmailError.classList.add('hidden');
        customerEmailInput.setAttribute('aria-invalid', 'false');
    }
    // Add more specific validation for phone if needed

    if (!isValid) {
        showMessage('error', 'Validation Error', 'Please correct the highlighted fields.');
        showLoadingOverlay(false);
        return;
    }

    const id = customerIdInput.value;
    const customerData = {
        name: customerNameInput.value.trim(),
        email: customerEmailInput.value.trim(),
        phone: customerPhoneInput.value.trim(),
        address: customerAddressInput.value.trim(),
        type: customerTypeSelect.value,
        preferredContactMethod: customerPreferredContactMethodSelect.value,
        updatedAt: serverTimestamp(),
    };

    try {
        let customerCollectionRef;
        if (currentUserRole === 'Admin') {
            customerCollectionRef = collection(db, `artifacts/${appId}/public/data/customers`);
        } else {
            customerCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/customers`);
        }

        if (id) {
            // Edit existing customer
            const customerDocRef = doc(customerCollectionRef, id);
            // Re-fetch to check creatorId before update if not admin
            if (currentUserRole !== 'Admin') {
                const docSnap = await getDoc(customerDocRef);
                if (docSnap.exists() && docSnap.data().creatorId !== userId) {
                    showMessage('error', 'Access Denied', 'You do not have permission to update this customer.');
                    showLoadingOverlay(false);
                    return;
                }
            }
            await updateDoc(customerDocRef, customerData);
            showMessage('success', 'Success', 'Customer updated successfully!');
        } else {
            // Add new customer
            customerData.createdAt = serverTimestamp();
            customerData.creatorId = userId; // Set creator ID for new customers
            await addDoc(customerCollectionRef, customerData);
            showMessage('success', 'Success', 'Customer added successfully!');
        }
        hideModal(customerModal);
        await renderCustomersGrid(); // Re-render grid after save
        await populateSelect(opportunityCustomerSelect, 'customers', 'id', 'name', 'Select Customer'); // Update opportunity customer list
    } catch (error) {
        console.error("Error saving customer:", error);
        showMessage('error', 'Save Error', `Failed to save customer: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
});

/**
 * Deletes a customer.
 * @param {string} id - The ID of the customer to delete.
 * @param {string} name - The name of the customer (for confirmation message).
 * @param {string} customerCreatorId - The creatorId of the customer.
 */
async function deleteCustomer(id, name, customerCreatorId) {
    // Client-side permission check for deleting
    if (currentUserRole !== 'Admin' && customerCreatorId !== userId) {
        showMessage('error', 'Access Denied', 'You do not have permission to delete this customer.');
        return;
    }

    const confirmed = await showMessage('confirm', 'Confirm Deletion', `Are you sure you want to delete customer "${name}"? This action cannot be undone.`);
    if (!confirmed) return;

    showLoadingOverlay(true);
    try {
        let customerDocRef;
        if (currentUserRole === 'Admin') {
            customerDocRef = doc(db, `artifacts/${appId}/public/data/customers`, id);
        } else {
            customerDocRef = doc(db, `artifacts/${appId}/users/${userId}/customers`, id);
        }

        await deleteDoc(customerDocRef);
        showMessage('success', 'Success', 'Customer deleted successfully!');
        await renderCustomersGrid(); // Re-render grid after delete
        await populateSelect(opportunityCustomerSelect, 'customers', 'id', 'name', 'Select Customer'); // Update opportunity customer list
    } catch (error) {
        console.error("Error deleting customer:", error);
        showMessage('error', 'Deletion Error', `Failed to delete customer: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

// --- Opportunity Functions ---

/**
 * Renders the opportunities data grid.
 */
async function renderOpportunitiesGrid() {
    showLoadingOverlay(true);
    try {
        let opportunitiesCollectionRef;
        if (currentUserRole === 'Admin') {
            opportunitiesCollectionRef = collection(db, `artifacts/${appId}/public/data/opportunities`);
        } else {
            opportunitiesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/opportunities`);
        }
        const q = query(opportunitiesCollectionRef, orderBy('createdAt', 'desc')); // Order by creation date
        const querySnapshot = await getDocs(q);
        const opportunities = [];
        querySnapshot.forEach((doc) => {
            opportunities.push({ id: doc.id, ...doc.data() });
        });

        // Fetch customer names for display
        const customerNames = {};
        const customersQuery = query(collection(db, `artifacts/${appId}/public/data/customers`)); // Always fetch from public for display
        const customersSnapshot = await getDocs(customersQuery);
        customersSnapshot.forEach(doc => {
            customerNames[doc.id] = doc.data().name;
        });

        if (opportunitiesGrid) {
            opportunitiesGrid.updateConfig({
                data: opportunities.map(o => [
                    customerNames[o.customerId] || 'N/A',
                    o.name,
                    o.value ? `$${o.value.toFixed(2)}` : '',
                    o.salesStage,
                    formatDateForDisplay(o.closeDate),
                    formatDateForDisplay(o.createdAt),
                    o.id, // Keep ID for actions
                    o.creatorId // Keep creatorId for client-side permission checks
                ])
            }).forceRender();
        } else {
            opportunitiesGrid = new gridjs.Grid({
                columns: [
                    { id: 'customerName', name: 'Customer' },
                    { id: 'name', name: 'Name' },
                    { id: 'value', name: 'Value' },
                    { id: 'salesStage', name: 'Stage' },
                    { id: 'closeDate', name: 'Close Date' },
                    { id: 'createdAt', name: 'Created At' },
                    {
                        name: 'Actions',
                        formatter: (cell, row) => {
                            const opportunityId = row.cells[6].data;
                            const opportunityCreatorId = row.cells[7].data;
                            return h('div', { className: 'flex space-x-2' },
                                h('button', {
                                    className: 'px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200',
                                    onClick: () => editOpportunity(opportunityId)
                                }, 'Edit'),
                                h('button', {
                                    className: `px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 ${currentUserRole !== 'Admin' && opportunityCreatorId !== userId ? 'opacity-50 cursor-not-allowed' : ''}`,
                                    onClick: () => deleteOpportunity(opportunityId, row.cells[1].data, opportunityCreatorId)
                                }, 'Delete')
                            );
                        }
                    }
                ],
                data: opportunities.map(o => [
                    customerNames[o.customerId] || 'N/A',
                    o.name,
                    o.value ? `$${o.value.toFixed(2)}` : '',
                    o.salesStage,
                    formatDateForDisplay(o.closeDate),
                    formatDateForDisplay(o.createdAt),
                    o.id,
                    o.creatorId
                ]),
                search: true,
                pagination: {
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                    container: 'overflow-x-auto'
                }
            }).render(document.getElementById('opportunitiesTable'));
        }
    } catch (error) {
        console.error("Error rendering opportunities grid:", error);
        showMessage('error', 'Opportunity Load Error', `Failed to load opportunities: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Opens the opportunity modal for adding a new opportunity.
 */
async function addOpportunity() {
    opportunityModalTitle.textContent = 'Add Opportunity';
    opportunityIdInput.value = '';
    resetForms();
    await populateSelect(opportunityCustomerSelect, 'customers', 'id', 'name', 'Select Customer');
    showModal(opportunityModal);
}

/**
 * Opens the opportunity modal for editing an existing opportunity.
 * @param {string} id - The ID of the opportunity to edit.
 */
async function editOpportunity(id) {
    showLoadingOverlay(true);
    try {
        let opportunityDocRef;
        if (currentUserRole === 'Admin') {
            opportunityDocRef = doc(db, `artifacts/${appId}/public/data/opportunities`, id);
        } else {
            opportunityDocRef = doc(db, `artifacts/${appId}/users/${userId}/opportunities`, id);
        }
        const docSnap = await getDoc(opportunityDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            // Client-side permission check for editing
            if (currentUserRole !== 'Admin' && data.creatorId !== userId) {
                showMessage('error', 'Access Denied', 'You do not have permission to edit this opportunity.');
                showLoadingOverlay(false);
                return;
            }

            opportunityIdInput.value = id;
            opportunityNameInput.value = data.name || '';
            opportunityDescriptionInput.value = data.description || '';
            opportunityValueInput.value = data.value || '';
            opportunitySalesStageSelect.value = data.salesStage || '';
            opportunityCloseDateInput.value = formatDateForInput(data.closeDate);

            await populateSelect(opportunityCustomerSelect, 'customers', 'id', 'name', 'Select Customer', data.customerId);

            opportunityModalTitle.textContent = 'Edit Opportunity';
            showModal(opportunityModal);
        } else {
            showMessage('error', 'Not Found', 'Opportunity not found.');
        }
    } catch (error) {
        console.error("Error fetching opportunity for edit:", error);
        showMessage('error', 'Edit Error', `Failed to load opportunity data: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Handles the submission of the opportunity form (add/edit).
 * @param {Event} event - The form submission event.
 */
opportunityForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showLoadingOverlay(true);

    // Client-side validation
    let isValid = true;
    isValid = validateField(opportunityCustomerSelect, opportunityCustomerError, 'Customer is required.') && isValid;
    isValid = validateField(opportunityNameInput, opportunityNameError, 'Opportunity Name is required.') && isValid;
    if (opportunityValueInput.value.trim() && isNaN(parseFloat(opportunityValueInput.value))) {
        opportunityValueInput.classList.add('is-invalid');
        opportunityValueError.textContent = 'Value must be a number.';
        opportunityValueError.classList.remove('hidden');
        opportunityValueInput.setAttribute('aria-invalid', 'true');
        isValid = false;
    } else {
        opportunityValueInput.classList.remove('is-invalid');
        opportunityValueError.textContent = '';
        opportunityValueError.classList.add('hidden');
        opportunityValueInput.setAttribute('aria-invalid', 'false');
    }
    // No specific date validation needed beyond format as per current rules, but validateDateRange could be added if needed

    if (!isValid) {
        showMessage('error', 'Validation Error', 'Please correct the highlighted fields.');
        showLoadingOverlay(false);
        return;
    }

    const id = opportunityIdInput.value;
    const opportunityData = {
        customerId: opportunityCustomerSelect.value,
        name: opportunityNameInput.value.trim(),
        description: opportunityDescriptionInput.value.trim(),
        value: opportunityValueInput.value ? parseFloat(opportunityValueInput.value) : null,
        salesStage: opportunitySalesStageSelect.value,
        closeDate: opportunityCloseDateInput.value ? Timestamp.fromDate(new Date(opportunityCloseDateInput.value)) : null,
        updatedAt: serverTimestamp(),
    };

    try {
        let opportunityCollectionRef;
        if (currentUserRole === 'Admin') {
            opportunityCollectionRef = collection(db, `artifacts/${appId}/public/data/opportunities`);
        } else {
            opportunityCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/opportunities`);
        }

        if (id) {
            // Edit existing opportunity
            const opportunityDocRef = doc(opportunityCollectionRef, id);
            // Re-fetch to check creatorId before update if not admin
            if (currentUserRole !== 'Admin') {
                const docSnap = await getDoc(opportunityDocRef);
                if (docSnap.exists() && docSnap.data().creatorId !== userId) {
                    showMessage('error', 'Access Denied', 'You do not have permission to update this opportunity.');
                    showLoadingOverlay(false);
                    return;
                }
            }
            await updateDoc(opportunityDocRef, opportunityData);
            showMessage('success', 'Success', 'Opportunity updated successfully!');
        } else {
            // Add new opportunity
            opportunityData.createdAt = serverTimestamp();
            opportunityData.creatorId = userId; // Set creator ID for new opportunities
            await addDoc(opportunityCollectionRef, opportunityData);
            showMessage('success', 'Success', 'Opportunity added successfully!');
        }
        hideModal(opportunityModal);
        await renderOpportunitiesGrid(); // Re-render grid after save
    } catch (error) {
        console.error("Error saving opportunity:", error);
        showMessage('error', 'Save Error', `Failed to save opportunity: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
});

/**
 * Deletes an opportunity.
 * @param {string} id - The ID of the opportunity to delete.
 * @param {string} name - The name of the opportunity (for confirmation message).
 * @param {string} opportunityCreatorId - The creatorId of the opportunity.
 */
async function deleteOpportunity(id, name, opportunityCreatorId) {
    // Client-side permission check for deleting
    if (currentUserRole !== 'Admin' && opportunityCreatorId !== userId) {
        showMessage('error', 'Access Denied', 'You do not have permission to delete this opportunity.');
        return;
    }
    const confirmed = await showMessage('confirm', 'Confirm Deletion', `Are you sure you want to delete opportunity "${name}"? This action cannot be undone.`);
    if (!confirmed) return;

    showLoadingOverlay(true);
    try {
        let opportunityDocRef;
        if (currentUserRole === 'Admin') {
            opportunityDocRef = doc(db, `artifacts/${appId}/public/data/opportunities`, id);
        } else {
            opportunityDocRef = doc(db, `artifacts/${appId}/users/${userId}/opportunities`, id);
        }

        await deleteDoc(opportunityDocRef);
        showMessage('success', 'Success', 'Opportunity deleted successfully!');
        await renderOpportunitiesGrid(); // Re-render grid after delete
    } catch (error) {
        console.error("Error deleting opportunity:", error);
        showMessage('error', 'Deletion Error', `Failed to delete opportunity: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

// --- Price Book Functions ---

/**
 * Generates a normalized index ID for a price book based on its name and currency.
 * This is used for uniqueness checks in Firestore rules.
 * @param {string} name - The original name of the price book.
 * @param {string} currency - The original currency code.
 * @returns {string} The combined and normalized index ID.
 */
function getPriceBookIndexId(name, currency) {
    const normalizedName = name.trim().toLowerCase().replace(/\s+/g, '');
    const normalizedCurrency = currency.trim().toLowerCase().replace(/\s+/g, '');
    return `${normalizedName}_${normalizedCurrency}`;
}

/**
 * Renders the price books data grid.
 */
async function renderPriceBooksGrid() {
    showLoadingOverlay(true);
    try {
        let priceBooksCollectionRef = collection(db, `artifacts/${appId}/public/data/priceBooks`);
        const q = query(priceBooksCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const priceBooks = [];
        querySnapshot.forEach((doc) => {
            priceBooks.push({ id: doc.id, ...doc.data() });
        });

        if (priceBooksGrid) {
            priceBooksGrid.updateConfig({
                data: priceBooks.map(pb => [
                    pb.name,
                    pb.country,
                    pb.currency,
                    pb.isActive ? 'Yes' : 'No',
                    formatDateForDisplay(pb.validFrom),
                    formatDateForDisplay(pb.validTo),
                    pb.id
                ])
            }).forceRender();
        } else {
            priceBooksGrid = new gridjs.Grid({
                columns: [
                    { id: 'name', name: 'Name' },
                    { id: 'country', name: 'Country' },
                    { id: 'currency', name: 'Currency' },
                    { id: 'isActive', name: 'Active' },
                    { id: 'validFrom', name: 'Valid From' },
                    { id: 'validTo', name: 'Valid To' },
                    {
                        name: 'Actions',
                        formatter: (cell, row) => {
                            const priceBookId = row.cells[6].data;
                            return h('div', { className: 'flex space-x-2' },
                                h('button', {
                                    className: `px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200 ${currentUserRole !== 'Admin' ? 'opacity-50 cursor-not-allowed' : ''}`,
                                    onClick: () => editPriceBook(priceBookId)
                                }, 'Edit'),
                                h('button', {
                                    className: `px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 ${currentUserRole !== 'Admin' ? 'opacity-50 cursor-not-allowed' : ''}`,
                                    onClick: () => deletePriceBook(priceBookId, row.cells[0].data)
                                }, 'Delete')
                            );
                        }
                    }
                ],
                data: priceBooks.map(pb => [
                    pb.name,
                    pb.country,
                    pb.currency,
                    pb.isActive ? 'Yes' : 'No',
                    formatDateForDisplay(pb.validFrom),
                    formatDateForDisplay(pb.validTo),
                    pb.id
                ]),
                search: true,
                pagination: {
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                    container: 'overflow-x-auto'
                }
            }).render(document.getElementById('priceBooksTable'));
        }
    } catch (error) {
        console.error("Error rendering price books grid:", error);
        showMessage('error', 'Price Book Load Error', `Failed to load price books: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Opens the price book modal for adding a new price book.
 */
async function addPriceBook() {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to add price books.');
        return;
    }
    priceBookModalTitle.textContent = 'Add Price Book';
    priceBookIdInput.value = '';
    resetForms();
    priceBookIsActiveCheckbox.checked = true; // Default to active for new
    await populateSelect(priceBookCountrySelect, 'countries', 'name', 'name', 'Select Country');
    await populateSelect(priceBookCurrencySelect, 'currencies', 'code', 'code', 'Select Currency');
    showModal(priceBookModal);
}

/**
 * Opens the price book modal for editing an existing price book.
 * @param {string} id - The ID of the price book to edit.
 */
async function editPriceBook(id) {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to edit price books.');
        return;
    }
    showLoadingOverlay(true);
    try {
        const priceBookDocRef = doc(db, `artifacts/${appId}/public/data/priceBooks`, id);
        const docSnap = await getDoc(priceBookDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            priceBookIdInput.value = id;
            priceBookNameInput.value = data.name || '';
            priceBookIsActiveCheckbox.checked = data.isActive || false;
            priceBookValidFromInput.value = formatDateForInput(data.validFrom);
            priceBookValidToInput.value = formatDateForInput(data.validTo);

            await populateSelect(priceBookCountrySelect, 'countries', 'name', 'name', 'Select Country', data.country);
            await populateSelect(priceBookCurrencySelect, 'currencies', 'code', 'code', 'Select Currency', data.currency);

            priceBookModalTitle.textContent = 'Edit Price Book';
            showModal(priceBookModal);
        } else {
            showMessage('error', 'Not Found', 'Price Book not found.');
        }
    } catch (error) {
        console.error("Error fetching price book for edit:", error);
        showMessage('error', 'Edit Error', `Failed to load price book data: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Handles the submission of the price book form (add/edit).
 * @param {Event} event - The form submission event.
 */
priceBookForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showLoadingOverlay(true);

    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to save price books.');
        showLoadingOverlay(false);
        return;
    }

    // Client-side validation
    let isValid = true;
    isValid = validateField(priceBookNameInput, priceBookNameError, 'Price Book Name is required.') && isValid;
    isValid = validateField(priceBookCountrySelect, priceBookCountryError, 'Country is required.') && isValid;
    isValid = validateField(priceBookCurrencySelect, priceBookCurrencyError, 'Currency is required.') && isValid;
    isValid = validateDateRange(priceBookValidFromInput, priceBookValidFromError, priceBookValidToInput, priceBookValidToError) && isValid;

    if (!isValid) {
        showMessage('error', 'Validation Error', 'Please correct the highlighted fields.');
        showLoadingOverlay(false);
        return;
    }

    const id = priceBookIdInput.value;
    const name = priceBookNameInput.value.trim();
    const country = priceBookCountrySelect.value;
    const currency = priceBookCurrencySelect.value;
    const isActive = priceBookIsActiveCheckbox.checked;
    const validFrom = priceBookValidFromInput.value ? Timestamp.fromDate(new Date(priceBookValidFromInput.value)) : null;
    const validTo = priceBookValidToInput.value ? Timestamp.fromDate(new Date(priceBookValidToInput.value)) : null;

    // Normalize name and currency for uniqueness index
    const newIndexId = getPriceBookIndexId(name, currency);

    try {
        await runTransaction(db, async (transaction) => {
            if (id) {
                // Edit existing price book
                const priceBookDocRef = doc(db, `artifacts/${appId}/public/data/priceBooks`, id);
                const oldPriceBookSnap = await transaction.get(priceBookDocRef);
                if (!oldPriceBookSnap.exists()) {
                    throw new Error("Price Book not found for update.");
                }
                const oldData = oldPriceBookSnap.data();
                const oldIndexId = getPriceBookIndexId(oldData.name, oldData.currency);

                // Check for uniqueness only if name or currency has changed
                if (oldIndexId !== newIndexId) {
                    const existingIndexDocRef = doc(db, `artifacts/${appId}/public/data/priceBookNameCurrencyIndexes`, newIndexId);
                    const existingIndexSnap = await transaction.get(existingIndexDocRef);
                    if (existingIndexSnap.exists() && existingIndexSnap.data().priceBookId !== id) {
                        throw new Error("A price book with this name and currency already exists.");
                    }
                    // Delete old index if name/currency changed
                    if (oldIndexId) {
                        transaction.delete(doc(db, `artifacts/${appId}/public/data/priceBookNameCurrencyIndexes`, oldIndexId));
                    }
                    // Create new index
                    transaction.set(existingIndexDocRef, { priceBookId: id, priceBookName: name, priceBookCurrency: currency, normalizedName, normalizedCurrency });
                }

                transaction.update(priceBookDocRef, {
                    name,
                    country,
                    currency,
                    isActive,
                    validFrom,
                    validTo,
                    normalizedName, // Store normalized values for rules
                    normalizedCurrency, // Store normalized values for rules
                    updatedAt: serverTimestamp()
                });
                showMessage('success', 'Success', 'Price Book updated successfully!');
            } else {
                // Add new price book
                const existingIndexDocRef = doc(db, `artifacts/${appId}/public/data/priceBookNameCurrencyIndexes`, newIndexId);
                const existingIndexSnap = await transaction.get(existingIndexDocRef);
                if (existingIndexSnap.exists()) {
                    throw new Error("A price book with this name and currency already exists.");
                }

                const newPriceBookRef = doc(collection(db, `artifacts/${appId}/public/data/priceBooks`));
                transaction.set(newPriceBookRef, {
                    name,
                    country,
                    currency,
                    isActive,
                    validFrom,
                    validTo,
                    normalizedName, // Store normalized values for rules
                    normalizedCurrency, // Store normalized values for rules
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                // Create the uniqueness index document
                transaction.set(existingIndexDocRef, { priceBookId: newPriceBookRef.id, priceBookName: name, priceBookCurrency: currency, normalizedName, normalizedCurrency });
                showMessage('success', 'Success', 'Price Book added successfully!');
            }
        });
        hideModal(priceBookModal);
        await renderPriceBooksGrid();
    } catch (error) {
        console.error("Error saving price book:", error);
        showMessage('error', 'Save Error', `Failed to save price book: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
});

/**
 * Deletes a price book.
 * @param {string} id - The ID of the price book to delete.
 * @param {string} name - The name of the price book (for confirmation message).
 */
async function deletePriceBook(id, name) {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to delete price books.');
        return;
    }
    const confirmed = await showMessage('confirm', 'Confirm Deletion', `Are you sure you want to delete price book "${name}"? This action cannot be undone.`);
    if (!confirmed) return;

    showLoadingOverlay(true);
    try {
        await runTransaction(db, async (transaction) => {
            const priceBookDocRef = doc(db, `artifacts/${appId}/public/data/priceBooks`, id);
            const priceBookSnap = await transaction.get(priceBookDocRef);

            if (!priceBookSnap.exists()) {
                throw new Error("Price Book not found for deletion.");
            }

            const data = priceBookSnap.data();
            const indexId = getPriceBookIndexId(data.name, data.currency);
            const indexDocRef = doc(db, `artifacts/${appId}/public/data/priceBookNameCurrencyIndexes`, indexId);

            transaction.delete(priceBookDocRef);
            transaction.delete(indexDocRef); // Delete the associated index document

            showMessage('success', 'Success', 'Price Book deleted successfully!');
        });
        await renderPriceBooksGrid();
    } catch (error) {
        console.error("Error deleting price book:", error);
        showMessage('error', 'Deletion Error', `Failed to delete price book: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

// --- Admin User Functions ---

/**
 * Renders the users data grid.
 */
async function renderUsersGrid() {
    showLoadingOverlay(true);
    try {
        const usersCollectionRef = collection(db, `artifacts/${appId}/public/data/users_data`);
        const q = query(usersCollectionRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });

        if (usersGrid) {
            usersGrid.updateConfig({
                data: users.map(u => [
                    u.email,
                    u.role,
                    formatDateForDisplay(u.createdAt),
                    formatDateForDisplay(u.lastLogin),
                    u.id
                ])
            }).forceRender();
        } else {
            usersGrid = new gridjs.Grid({
                columns: [
                    { id: 'email', name: 'Email' },
                    { id: 'role', name: 'Role' },
                    { id: 'createdAt', name: 'Created At' },
                    { id: 'lastLogin', name: 'Last Login' },
                    {
                        name: 'Actions',
                        formatter: (cell, row) => {
                            const userId = row.cells[4].data;
                            return h('div', { className: 'flex space-x-2' },
                                h('button', {
                                    className: `px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200 ${currentUserRole !== 'Admin' ? 'opacity-50 cursor-not-allowed' : ''}`,
                                    onClick: () => editUser(userId)
                                }, 'Edit'),
                                h('button', {
                                    className: `px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 ${currentUserRole !== 'Admin' || userId === auth.currentUser.uid ? 'opacity-50 cursor-not-allowed' : ''}`, // Cannot delete self
                                    onClick: () => deleteUser(userId, row.cells[0].data)
                                }, 'Delete')
                            );
                        }
                    }
                ],
                data: users.map(u => [
                    u.email,
                    u.role,
                    formatDateForDisplay(u.createdAt),
                    formatDateForDisplay(u.lastLogin),
                    u.id
                ]),
                search: true,
                pagination: {
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                    container: 'overflow-x-auto'
                }
            }).render(document.getElementById('usersTable'));
        }
    } catch (error) {
        console.error("Error rendering users grid:", error);
        showMessage('error', 'User Load Error', `Failed to load users: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Opens the admin user modal for adding a new user.
 */
function addUser() {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to add users.');
        return;
    }
    adminUserModalTitle.textContent = 'Add User';
    adminUserIdInput.value = '';
    resetForms();
    adminUserEmailInput.disabled = false; // Enable email for new user
    showModal(adminUserModal);
}

/**
 * Opens the admin user modal for editing an existing user.
 * @param {string} id - The ID of the user to edit.
 */
async function editUser(id) {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to edit users.');
        return;
    }
    showLoadingOverlay(true);
    try {
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users_data`, id);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            adminUserIdInput.value = id;
            adminUserEmailInput.value = data.email || '';
            adminUserRoleSelect.value = data.role || 'Standard';
            adminUserEmailInput.disabled = true; // Prevent changing email for existing users

            adminUserModalTitle.textContent = 'Edit User';
            showModal(adminUserModal);
        } else {
            showMessage('error', 'Not Found', 'User not found.');
        }
    } catch (error) {
        console.error("Error fetching user for edit:", error);
        showMessage('error', 'Edit Error', `Failed to load user data: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Handles the submission of the admin user form (add/edit).
 * @param {Event} event - The form submission event.
 */
adminUserForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showLoadingOverlay(true);

    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to save users.');
        showLoadingOverlay(false);
        return;
    }

    // Client-side validation
    let isValid = true;
    isValid = validateEmail(adminUserEmailInput, adminUserEmailError) && isValid;
    isValid = validateField(adminUserRoleSelect, adminUserRoleError, 'Role is required.') && isValid;

    if (!isValid) {
        showMessage('error', 'Validation Error', 'Please correct the highlighted fields.');
        showLoadingOverlay(false);
        return;
    }

    const id = adminUserIdInput.value;
    const userData = {
        email: adminUserEmailInput.value.trim(),
        role: adminUserRoleSelect.value,
        updatedAt: serverTimestamp(),
    };

    try {
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users_data`, id || adminUserEmailInput.value.trim()); // Use email as ID for new users, existing ID for updates

        if (id) {
            // Edit existing user
            await updateDoc(userDocRef, userData);
            showMessage('success', 'Success', 'User updated successfully!');
        } else {
            // Add new user (only updates role for existing auth user, or creates a new user_data entry)
            // Note: This does NOT create a Firebase Authentication user. That would require Admin SDK.
            // This assumes the user will sign up via auth modal, and then admin assigns role.
            userData.createdAt = serverTimestamp();
            userData.lastLogin = serverTimestamp(); // Initialize lastLogin
            await setDoc(userDocRef, userData, { merge: true }); // Use setDoc with merge to create if not exists
            showMessage('success', 'Success', 'User added/updated successfully!');
        }
        hideModal(adminUserModal);
        await renderUsersGrid(); // Re-render grid after save
    } catch (error) {
        console.error("Error saving user:", error);
        showMessage('error', 'Save Error', `Failed to save user: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
});

/**
 * Deletes a user.
 * @param {string} id - The ID of the user to delete.
 * @param {string} email - The email of the user (for confirmation message).
 */
async function deleteUser(id, email) {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to delete users.');
        return;
    }
    if (id === auth.currentUser.uid) {
        showMessage('error', 'Action Not Allowed', 'You cannot delete your own user account from here.');
        return;
    }
    const confirmed = await showMessage('confirm', 'Confirm Deletion', `Are you sure you want to delete user "${email}"? This action cannot be undone.`);
    if (!confirmed) return;

    showLoadingOverlay(true);
    try {
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users_data`, id);
        await deleteDoc(userDocRef);
        showMessage('success', 'Success', 'User deleted successfully!');
        await renderUsersGrid(); // Re-render grid after delete
    } catch (error) {
        console.error("Error deleting user:", error);
        showMessage('error', 'Deletion Error', `Failed to delete user: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

// --- Country Functions ---

/**
 * Renders the countries data grid.
 */
async function renderCountriesGrid() {
    showLoadingOverlay(true);
    try {
        const countriesCollectionRef = collection(db, `artifacts/${appId}/public/data/countries`);
        const q = query(countriesCollectionRef, orderBy('name', 'asc')); // Order by name
        const querySnapshot = await getDocs(q);
        const countries = [];
        querySnapshot.forEach((doc) => {
            countries.push({ id: doc.id, ...doc.data() });
        });

        if (countriesGrid) {
            countriesGrid.updateConfig({
                data: countries.map(c => [
                    c.name,
                    c.code,
                    c.id
                ])
            }).forceRender();
        } else {
            countriesGrid = new gridjs.Grid({
                columns: [
                    { id: 'name', name: 'Name' },
                    { id: 'code', name: 'Code' },
                    {
                        name: 'Actions',
                        formatter: (cell, row) => {
                            const countryId = row.cells[2].data;
                            return h('div', { className: 'flex space-x-2' },
                                h('button', {
                                    className: `px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200 ${currentUserRole !== 'Admin' ? 'opacity-50 cursor-not-allowed' : ''}`,
                                    onClick: () => editCountry(countryId)
                                }, 'Edit'),
                                h('button', {
                                    className: `px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 ${currentUserRole !== 'Admin' ? 'opacity-50 cursor-not-allowed' : ''}`,
                                    onClick: () => deleteCountry(countryId, row.cells[0].data)
                                }, 'Delete')
                            );
                        }
                    }
                ],
                data: countries.map(c => [
                    c.name,
                    c.code,
                    c.id
                ]),
                search: true,
                pagination: {
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                    container: 'overflow-x-auto'
                }
            }).render(document.getElementById('countriesTable'));
        }
    } catch (error) {
        console.error("Error rendering countries grid:", error);
        showMessage('error', 'Country Load Error', `Failed to load countries: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Opens the country modal for adding a new country.
 */
function addCountry() {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to add countries.');
        return;
    }
    countryModalTitle.textContent = 'Add Country';
    countryIdInput.value = '';
    resetForms();
    showModal(countryModal);
}

/**
 * Opens the country modal for editing an existing country.
 * @param {string} id - The ID of the country to edit.
 */
async function editCountry(id) {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to edit countries.');
        return;
    }
    showLoadingOverlay(true);
    try {
        const countryDocRef = doc(db, `artifacts/${appId}/public/data/countries`, id);
        const docSnap = await getDoc(countryDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            countryIdInput.value = id;
            countryNameInput.value = data.name || '';
            countryCodeInput.value = data.code || '';

            countryModalTitle.textContent = 'Edit Country';
            showModal(countryModal);
        } else {
            showMessage('error', 'Not Found', 'Country not found.');
        }
    } catch (error) {
        console.error("Error fetching country for edit:", error);
        showMessage('error', 'Edit Error', `Failed to load country data: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Handles the submission of the country form (add/edit).
 * @param {Event} event - The form submission event.
 */
countryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showLoadingOverlay(true);

    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to save countries.');
        showLoadingOverlay(false);
        return;
    }

    // Client-side validation
    let isValid = true;
    isValid = validateField(countryNameInput, countryNameError, 'Country Name is required.') && isValid;
    isValid = validateField(countryCodeInput, countryCodeError, 'Country Code is required.') && isValid;
    if (countryCodeInput.value.trim().length !== 2) {
        countryCodeInput.classList.add('is-invalid');
        countryCodeError.textContent = 'Country Code must be 2 characters.';
        countryCodeError.classList.remove('hidden');
        countryCodeInput.setAttribute('aria-invalid', 'true');
        isValid = false;
    } else {
        countryCodeInput.classList.remove('is-invalid');
        countryCodeError.textContent = '';
        countryCodeError.classList.add('hidden');
        countryCodeInput.setAttribute('aria-invalid', 'false');
    }

    if (!isValid) {
        showMessage('error', 'Validation Error', 'Please correct the highlighted fields.');
        showLoadingOverlay(false);
        return;
    }

    const id = countryIdInput.value;
    const countryData = {
        name: countryNameInput.value.trim(),
        code: countryCodeInput.value.trim().toUpperCase(),
        updatedAt: serverTimestamp(),
    };

    try {
        const countryCollectionRef = collection(db, `artifacts/${appId}/public/data/countries`);
        if (id) {
            // Edit existing country
            const countryDocRef = doc(countryCollectionRef, id);
            await updateDoc(countryDocRef, countryData);
            showMessage('success', 'Success', 'Country updated successfully!');
        } else {
            // Add new country
            countryData.createdAt = serverTimestamp();
            await addDoc(countryCollectionRef, countryData);
            showMessage('success', 'Success', 'Country added successfully!');
        }
        hideModal(countryModal);
        await renderCountriesGrid(); // Re-render grid after save
        await populateSelect(priceBookCountrySelect, 'countries', 'name', 'name', 'Select Country'); // Update price book country list
        await populateSelect(defaultCountrySelect, 'countries', 'name', 'name', 'Select Default Country'); // Update app settings country list
    } catch (error) {
        console.error("Error saving country:", error);
        showMessage('error', 'Save Error', `Failed to save country: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
});

/**
 * Deletes a country.
 * @param {string} id - The ID of the country to delete.
 * @param {string} name - The name of the country (for confirmation message).
 */
async function deleteCountry(id, name) {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to delete countries.');
        return;
    }
    const confirmed = await showMessage('confirm', 'Confirm Deletion', `Are you sure you want to delete country "${name}"? This action cannot be undone.`);
    if (!confirmed) return;

    showLoadingOverlay(true);
    try {
        const countryDocRef = doc(db, `artifacts/${appId}/public/data/countries`, id);
        await deleteDoc(countryDocRef);
        showMessage('success', 'Success', 'Country deleted successfully!');
        await renderCountriesGrid(); // Re-render grid after delete
        await populateSelect(priceBookCountrySelect, 'countries', 'name', 'name', 'Select Country'); // Update price book country list
        await populateSelect(defaultCountrySelect, 'countries', 'name', 'name', 'Select Default Country'); // Update app settings country list
    } catch (error) {
        console.error("Error deleting country:", error);
        showMessage('error', 'Deletion Error', `Failed to delete country: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

// --- Currency Functions ---

/**
 * Renders the currencies data grid.
 */
async function renderCurrenciesGrid() {
    showLoadingOverlay(true);
    try {
        const currenciesCollectionRef = collection(db, `artifacts/${appId}/public/data/currencies`);
        const q = query(currenciesCollectionRef, orderBy('name', 'asc')); // Order by name
        const querySnapshot = await getDocs(q);
        const currencies = [];
        querySnapshot.forEach((doc) => {
            currencies.push({ id: doc.id, ...doc.data() });
        });

        if (currenciesGrid) {
            currenciesGrid.updateConfig({
                data: currencies.map(c => [
                    c.name,
                    c.code,
                    c.symbol,
                    c.id
                ])
            }).forceRender();
        } else {
            currenciesGrid = new gridjs.Grid({
                columns: [
                    { id: 'name', name: 'Name' },
                    { id: 'code', name: 'Code' },
                    { id: 'symbol', name: 'Symbol' },
                    {
                        name: 'Actions',
                        formatter: (cell, row) => {
                            const currencyId = row.cells[3].data;
                            return h('div', { className: 'flex space-x-2' },
                                h('button', {
                                    className: `px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200 ${currentUserRole !== 'Admin' ? 'opacity-50 cursor-not-allowed' : ''}`,
                                    onClick: () => editCurrency(currencyId)
                                }, 'Edit'),
                                h('button', {
                                    className: `px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 ${currentUserRole !== 'Admin' ? 'opacity-50 cursor-not-allowed' : ''}`,
                                    onClick: () => deleteCurrency(currencyId, row.cells[0].data)
                                }, 'Delete')
                            );
                        }
                    }
                ],
                data: currencies.map(c => [
                    c.name,
                    c.code,
                    c.symbol,
                    c.id
                ]),
                search: true,
                pagination: {
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                    container: 'overflow-x-auto'
                }
            }).render(document.getElementById('currenciesTable'));
        }
    } catch (error) {
        console.error("Error rendering currencies grid:", error);
        showMessage('error', 'Currency Load Error', `Failed to load currencies: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Opens the currency modal for adding a new currency.
 */
function addCurrency() {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to add currencies.');
        return;
    }
    currencyModalTitle.textContent = 'Add Currency';
    currencyIdInput.value = '';
    resetForms();
    showModal(currencyModal);
}

/**
 * Opens the currency modal for editing an existing currency.
 * @param {string} id - The ID of the currency to edit.
 */
async function editCurrency(id) {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to edit currencies.');
        return;
    }
    showLoadingOverlay(true);
    try {
        const currencyDocRef = doc(db, `artifacts/${appId}/public/data/currencies`, id);
        const docSnap = await getDoc(currencyDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            currencyIdInput.value = id;
            currencyNameInput.value = data.name || '';
            currencyCodeInput.value = data.code || '';
            currencySymbolInput.value = data.symbol || '';

            currencyModalTitle.textContent = 'Edit Currency';
            showModal(currencyModal);
        } else {
            showMessage('error', 'Not Found', 'Currency not found.');
        }
    } catch (error) {
        console.error("Error fetching currency for edit:", error);
        showMessage('error', 'Edit Error', `Failed to load currency data: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Handles the submission of the currency form (add/edit).
 * @param {Event} event - The form submission event.
 */
currencyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showLoadingOverlay(true);

    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to save currencies.');
        showLoadingOverlay(false);
        return;
    }

    // Client-side validation
    let isValid = true;
    isValid = validateField(currencyNameInput, currencyNameError, 'Currency Name is required.') && isValid;
    isValid = validateField(currencyCodeInput, currencyCodeError, 'Currency Code is required.') && isValid;
    if (currencyCodeInput.value.trim().length !== 3) {
        currencyCodeInput.classList.add('is-invalid');
        currencyCodeError.textContent = 'Currency Code must be 3 characters.';
        currencyCodeError.classList.remove('hidden');
        currencyCodeInput.setAttribute('aria-invalid', 'true');
        isValid = false;
    } else {
        currencyCodeInput.classList.remove('is-invalid');
        currencyCodeError.textContent = '';
        currencyCodeError.classList.add('hidden');
        currencyCodeInput.setAttribute('aria-invalid', 'false');
    }

    if (!isValid) {
        showMessage('error', 'Validation Error', 'Please correct the highlighted fields.');
        showLoadingOverlay(false);
        return;
    }

    const id = currencyIdInput.value;
    const currencyData = {
        name: currencyNameInput.value.trim(),
        code: currencyCodeInput.value.trim().toUpperCase(),
        symbol: currencySymbolInput.value.trim(),
        updatedAt: serverTimestamp(),
    };

    try {
        const currencyCollectionRef = collection(db, `artifacts/${appId}/public/data/currencies`);
        if (id) {
            // Edit existing currency
            const currencyDocRef = doc(currencyCollectionRef, id);
            await updateDoc(currencyDocRef, currencyData);
            showMessage('success', 'Success', 'Currency updated successfully!');
        } else {
            // Add new currency
            currencyData.createdAt = serverTimestamp();
            await addDoc(currencyCollectionRef, currencyData);
            showMessage('success', 'Success', 'Currency added successfully!');
        }
        hideModal(currencyModal);
        await renderCurrenciesGrid(); // Re-render grid after save
        await populateSelect(priceBookCurrencySelect, 'currencies', 'code', 'code', 'Select Currency'); // Update price book currency list
        await populateSelect(defaultCurrencySelect, 'currencies', 'code', 'code', 'Select Default Currency'); // Update app settings currency list
    } catch (error) {
        console.error("Error saving currency:", error);
        showMessage('error', 'Save Error', `Failed to save currency: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
});

/**
 * Deletes a currency.
 * @param {string} id - The ID of the currency to delete.
 * @param {string} name - The name of the currency (for confirmation message).
 */
async function deleteCurrency(id, name) {
    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to delete currencies.');
        return;
    }
    const confirmed = await showMessage('confirm', 'Confirm Deletion', `Are you sure you want to delete currency "${name}"? This action cannot be undone.`);
    if (!confirmed) return;

    showLoadingOverlay(true);
    try {
        const currencyDocRef = doc(db, `artifacts/${appId}/public/data/currencies`, id);
        await deleteDoc(currencyDocRef);
        showMessage('success', 'Success', 'Currency deleted successfully!');
        await renderCurrenciesGrid(); // Re-render grid after delete
        await populateSelect(priceBookCurrencySelect, 'currencies', 'code', 'code', 'Select Currency'); // Update price book currency list
        await populateSelect(defaultCurrencySelect, 'currencies', 'code', 'code', 'Select Default Currency'); // Update app settings currency list
    } catch (error) {
        console.error("Error deleting currency:", error);
        showMessage('error', 'Deletion Error', `Failed to delete currency: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

// --- App Settings Functions ---

/**
 * Loads and populates app settings.
 */
async function loadAppSettings() {
    showLoadingOverlay(true);
    try {
        const settingsDocRef = doc(db, `artifacts/${appId}/public/data/settings`, 'appSettings');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            await populateSelect(defaultCurrencySelect, 'currencies', 'code', 'code', 'Select Default Currency', data.defaultCurrency);
            await populateSelect(defaultCountrySelect, 'countries', 'name', 'name', 'Select Default Country', data.defaultCountry);
        } else {
            // Default values if settings document doesn't exist
            await populateSelect(defaultCurrencySelect, 'currencies', 'code', 'code', 'Select Default Currency');
            await populateSelect(defaultCountrySelect, 'countries', 'name', 'name', 'Select Default Country');
        }
    } catch (error) {
        console.error("Error loading app settings:", error);
        showMessage('error', 'Settings Load Error', `Failed to load app settings: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
}

/**
 * Handles the submission of the app settings form.
 * @param {Event} event - The form submission event.
 */
appSettingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showLoadingOverlay(true);

    if (currentUserRole !== 'Admin') {
        showMessage('error', 'Access Denied', 'You do not have permission to save app settings.');
        showLoadingOverlay(false);
        return;
    }

    const settingsData = {
        defaultCurrency: defaultCurrencySelect.value,
        defaultCountry: defaultCountrySelect.value,
        updatedAt: serverTimestamp(),
    };

    try {
        const settingsDocRef = doc(db, `artifacts/${appId}/public/data/settings`, 'appSettings');
        await setDoc(settingsDocRef, settingsData, { merge: true });
        showMessage('success', 'Success', 'App settings saved successfully!');
    } catch (error) {
        console.error("Error saving app settings:", error);
        showMessage('error', 'Save Error', `Failed to save app settings: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
});

// --- Event Listeners ---

// Sidebar toggle
openSidebarBtn.addEventListener('click', () => {
    sidebar.classList.remove('-translate-x-full');
});

closeSidebarBtn.addEventListener('click', () => {
    sidebar.classList.add('-translate-x-full');
});

// Navigation
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const moduleId = button.id.replace('NavBtn', '');
        activateModule(moduleId);
    });
});

// Auth button (Sign In / Sign Out)
authButton.addEventListener('click', () => {
    if (auth.currentUser) {
        signOut(auth);
        showMessage('info', 'Signed Out', 'You have been signed out.');
    } else {
        showModal(authModal);
    }
});

// Anonymous Sign In button
authButtonAnon.addEventListener('click', async () => {
    try {
        showLoadingOverlay(true);
        await signInAnonymously(auth);
        showMessage('success', 'Signed In', 'You are now signed in anonymously.');
        hideModal(authModal);
    } catch (error) {
        console.error("Error signing in anonymously:", error);
        showMessage('error', 'Sign In Error', `Failed to sign in anonymously: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
});

// User dropdown menu
userDropdownBtn.addEventListener('click', () => {
    userDropdownMenu.classList.toggle('hidden');
});

signOutBtn.addEventListener('click', async (event) => {
    event.preventDefault();
    if (auth.currentUser) {
        await signOut(auth);
        showMessage('info', 'Signed Out', 'You have been signed out.');
    }
    userDropdownMenu.classList.add('hidden');
});

// Close modals when clicking outside or on close button
document.querySelectorAll('.modal .close-button').forEach(button => {
    button.addEventListener('click', (event) => {
        hideModal(event.target.closest('.modal'));
    });
});

window.addEventListener('click', (event) => {
    if (event.target.classList.contains('modal')) {
        hideModal(event.target);
    }
    // Close user dropdown if clicked outside
    if (!userDropdownBtn.contains(event.target) && !userDropdownMenu.contains(event.target)) {
        userDropdownMenu.classList.add('hidden');
    }
});

// Auth Form Submission
authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    showLoadingOverlay(true);

    let isValid = true;
    isValid = validateEmail(authEmailInput, authEmailError) && isValid;
    isValid = validateField(authPasswordInput, authPasswordError, 'Password is required.') && isValid;

    if (!isValid) {
        showMessage('error', 'Validation Error', 'Please correct the highlighted fields.');
        showLoadingOverlay(false);
        return;
    }

    const email = authEmailInput.value;
    const password = authPasswordInput.value;

    try {
        if (event.submitter === signInBtn) {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('success', 'Signed In', 'Successfully signed in!');
        } else if (event.submitter === signUpBtn) {
            await createUserWithEmailAndPassword(auth, email, password);
            showMessage('success', 'Signed Up', 'Account created and signed in successfully!');
        }
        hideModal(authModal);
    } catch (error) {
        console.error("Auth error:", error);
        showMessage('error', 'Authentication Error', `Failed to authenticate: ${error.message}`);
    } finally {
        showLoadingOverlay(false);
    }
});

// Add/Edit buttons
addCustomerBtn.addEventListener('click', addCustomer);
addOpportunityBtn.addEventListener('click', addOpportunity);
addPriceBookBtn.addEventListener('click', addPriceBook);
addUserBtn.addEventListener('click', addUser);
addCountryBtn.addEventListener('click', addCountry);
addCurrencyBtn.addEventListener('click', addCurrency);

// Price Book Country/Currency Select Change Listener (for potential future linked logic)
priceBookCountrySelect.addEventListener('change', async () => {
    // No specific action needed here for now, as currency is independent.
    // If currencies were country-specific, this is where you'd filter.
});

// Initial load
document.addEventListener('DOMContentLoaded', initializeFirebase);
