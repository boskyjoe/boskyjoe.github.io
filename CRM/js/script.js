import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, setDoc, getDoc, where, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// YOUR Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebasestorage.app",
    messagingSenderId: "10782416018",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

// Use projectId as appId for Firestore collection paths for consistency and stability
const appId = firebaseConfig.projectId;

let app;
let db;
let auth;
let currentUserId = null; // Will be set by Firebase Auth onAuthStateChanged
let isAuthReady = false; // Set to false initially, true when Firebase Auth confirms a user
const currentCustomerCollectionType = 'public'; // Fixed to public as per requirement
let unsubscribeCustomers = null; // To store the onSnapshot unsubscribe function for customers
let unsubscribeUsers = null; // To store the onSnapshot unsubscribe function for users

// Hardcoded Firebase UID for the 'admin' user (admin@shuttersync.com).
// THIS HAS BEEN UPDATED WITH THE CORRECT UID YOU PROVIDED.
const ADMIN_FIREBASE_UID = 'CpW5XxAaDxbd3C7eCVVgGvmJrOI2';
let isAdmin = false; // Flag to control admin specific UI/features

// Data for Countries and States (Now fetched from Firestore)
let appCountries = [];
let appCountryStateMap = {};

// New global state for bootstrap admin login
let hasFirestoreAdmins = false; // Will be true if any user in 'users_data' has role 'Admin'
const BOOTSTRAP_ADMIN_EMAIL = "admin@shuttersync.com";
const BOOTSTRAP_ADMIN_PASSWORD = "ShutterSync@123";

// Get references to DOM elements for Customers
const customersSection = document.getElementById('customers-section');
const customerForm = document.getElementById('customerForm');
const customerFormTitle = document.getElementById('customerFormTitle');
const customerIdDisplayGroup = document.getElementById('customerIdDisplayGroup');
const customerIdDisplay = document.getElementById('customerIdDisplay');

const customerTypeSelect = document.getElementById('customerType');
const individualFieldsDiv = document.getElementById('individualFields');
const customerFirstNameInput = document.getElementById('customerFirstName');
const customerLastNameInput = document.getElementById('customerLastName');
const companyNameFieldDiv = document.getElementById('companyNameField');
const customerCompanyNameInput = document.getElementById('customerCompanyName');

const customerEmailInput = document.getElementById('customerEmail');
const customerPhoneInput = document.getElementById('customerPhone');

// Address fields
const customerCountrySelect = document.getElementById('customerCountry');
const customerAddressInput = document.getElementById('customerAddress');
const customerCityInput = document.getElementById('customerCity');
const customerStateSelect = document.getElementById('customerState');
const customerZipCodeInput = document.getElementById('customerZipCode');
const addressValidationMessage = document.getElementById('addressValidationMessage');

const individualIndustryGroup = document.getElementById('individualIndustryGroup');
const customerIndustryInput = document.getElementById('customerIndustryInput');
const companyIndustryGroup = document.getElementById('companyIndustryGroup');
const customerIndustrySelect = document.getElementById('customerIndustrySelect');

const customerSinceInput = document.getElementById('customerSince');
const customerDescriptionInput = document.getElementById('customerDescription');
const submitCustomerButton = document.getElementById('submitCustomerButton');
const customerList = document.getElementById('customerList'); // Reference to the div for customer rows

// Admin Country Mapping Section elements
const adminCountryMappingSection = document.getElementById('admin-country-mapping-section');
const adminCountriesInput = document.getElementById('adminCountriesInput');
const adminCountryStateMapInput = document.getElementById('adminCountryStateMapInput');
const uploadAdminDataButton = document.getElementById('uploadAdminDataButton');
const fullLoadRadio = document.getElementById('fullLoad');
const incrementalLoadRadio = document.getElementById('incrementalLoad');
const adminMessageDiv = document.getElementById('adminMessage');

// Users Management Section elements
const usersManagementSection = document.getElementById('users-management-section');
const userForm = document.getElementById('userForm');
const userFormTitle = document.getElementById('userFormTitle');
const userIdDisplayGroup = document.getElementById('userIdDisplayGroup');
const userIdDisplayInput = document.getElementById('userIdDisplayInput');
const userNameInput = document.getElementById('userName');
const userFirstNameInput = document.getElementById('userFirstName');
const userLastNameInput = document.getElementById('userLastName');
const userEmailInput = document.getElementById('userEmail');
const userPhoneInput = document.getElementById('userPhone');
const userRoleSelect = document.getElementById('userRole'); // Changed to select
const userSkillsInput = document.getElementById('userSkills');
const submitUserButton = document.getElementById('submitUserButton');
const userList = document.getElementById('userList');

// Bootstrap Admin Login Section elements
const bootstrapAdminLoginSection = document.getElementById('bootstrap-admin-login-section');
const bootstrapAdminLoginForm = document.getElementById('bootstrapAdminLoginForm');
const bootstrapAdminEmailInput = document.getElementById('bootstrapAdminEmail');
const bootstrapAdminPasswordInput = document.getElementById('bootstrapAdminPassword');
const bootstrapAdminLoginButton = document.getElementById('bootstrapAdminLoginButton');
const bootstrapAdminMessage = document.getElementById('bootstrapAdminMessage');


// References to logout buttons and the new nav Google Login button
const logoutButton = document.getElementById('logoutButton');
const mobileLogoutButton = document.getElementById('mobileLogoutButton');
const navGoogleLoginButton = document.getElementById('navGoogleLoginButton');

// Admin menu elements (added IDs in HTML)
const desktopAdminMenu = document.getElementById('desktopAdminMenu');
const mobileAdminMenu = document.getElementById('mobileAdminMenu');

// Reference to auth-section (for standard Google/email login)
const authSection = document.getElementById('auth-section');


// Select all main content sections (crm-section removed, customers-section used instead for general management)
const homeSection = document.getElementById('home');
const eventsSection = document.getElementById('events-section');
// Include new admin sections in allSections
const allSections = [homeSection, customersSection, eventsSection, adminCountryMappingSection, usersManagementSection, authSection, bootstrapAdminLoginSection];


// Function to show a custom confirmation modal
function showModal(title, message, onConfirm, onCancel) {
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

// Function to show a specific section and hide others
async function showSection(sectionId, forceLoginCheck = false) {
    // If attempting to access an admin section
    if (['admin-country-mapping-section', 'users-management-section'].includes(sectionId)) {
        if (!isAuthReady) {
            console.log("Auth not ready, waiting for authentication before checking admin sections.");
            // This scenario is handled by onAuthStateChanged after init.
            return;
        }

        if (!currentUserId || !isAdmin) { // Not logged in or not admin
            if (!currentUserId) { // Not logged in at all
                console.log(`Access to ${sectionId} denied. No user logged in.`);
                await checkIfAnyFirestoreAdminExists(); // Re-check if this is a bootstrap scenario
                if (!hasFirestoreAdmins) {
                    console.log("No Firestore Admins found. Showing bootstrap login.");
                    bootstrapAdminLoginSection.classList.remove('hidden');
                    authSection.classList.add('hidden');
                    navGoogleLoginButton.classList.add('hidden');
                    bootstrapAdminMessage.textContent = 'Please use the default admin login to set up the first administrator to access admin features.';
                    bootstrapAdminMessage.classList.remove('hidden');
                    // Hide all other sections and explicitly show bootstrap login
                    allSections.forEach(section => {
                        if (section.id !== 'bootstrap-admin-login-section') {
                            section.classList.add('hidden');
                        }
                    });
                    bootstrapAdminLoginSection.classList.remove('hidden');
                    return; // Stop execution, show bootstrap login
                } else {
                    console.log("Firestore Admins exist. Redirecting to standard login for admin section access.");
                    // Regular user needs to log in, or current user isn't admin
                    showModal("Access Denied", "You must be logged in as an administrator to access this section.", () => {
                        showSection('home'); // Redirect non-admins to home
                    });
                    // Hide all sections except for home/auth for clarity
                    allSections.forEach(section => {
                        if (section.id !== 'auth-section' && section.id !== 'home') {
                            section.classList.add('hidden');
                        }
                    });
                    authSection.classList.remove('hidden'); // Show standard login
                    bootstrapAdminLoginSection.classList.add('hidden'); // Ensure bootstrap is hidden
                    navGoogleLoginButton.classList.remove('hidden'); // Show Google Login button
                    return; // Stop execution
                }
            } else if (!isAdmin) { // Logged in but not admin
                console.log(`Access to ${sectionId} denied. User is not an admin.`);
                showModal("Access Denied", "You do not have permission to access this section. Administrator privileges required.", () => {
                    showSection('home'); // Redirect non-admins to home
                });
                return; // Stop execution
            }
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
    mobileMenu.classList.add('hidden'); // Close mobile menu when navigating

    // Stop all listeners first to prevent redundant updates
    if (unsubscribeCustomers) { unsubscribeCustomers(); }
    if (unsubscribeUsers) { unsubscribeUsers(); }

    // Start specific listener for the active section, but only if auth is ready
    if (isAuthReady) { // Ensure auth is ready before starting listeners
        if (sectionId === 'customers-section') {
            listenForCustomers();
            resetCustomerForm(); // Reset form and apply initial validation state
            submitCustomerButton.removeAttribute('disabled'); // Customers form always enabled for authenticated users
        } else if (sectionId === 'admin-country-mapping-section') {
            if (isAdmin) { // Double check admin status for safety
                loadAdminCountryData(); // Load existing data into admin textareas
                uploadAdminDataButton.removeAttribute('disabled');
            } else {
                uploadAdminDataButton.setAttribute('disabled', 'disabled');
            }
        } else if (sectionId === 'users-management-section') {
            if (isAdmin) { // Double check admin status for safety
                listenForUsers(); // Start listening for users data
                resetUserForm(); // Reset user form
                submitUserButton.removeAttribute('disabled'); // Enable user form button for admin
            } else {
                submitUserButton.setAttribute('disabled', 'disabled');
            }
        }
    } else {
        console.warn("Attempted to show section before Firebase Auth is ready:", sectionId);
        // Ensure buttons are disabled if auth is not ready
        submitCustomerButton.setAttribute('disabled', 'disabled');
        uploadAdminDataButton.setAttribute('disabled', 'disabled');
        submitUserButton.setAttribute('disabled', 'disabled');
    }
}


// Handle Google Login
async function handleGoogleLogin() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        // onAuthStateChanged listener will handle the rest
    } catch (error) {
        console.error("Error during Google login:", error);
        showModal("Login Error", `Failed to sign in with Google: ${error.message}`, () => {});
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
            showModal("Data Error", "Country and State data could not be loaded. Please ensure 'app_metadata/countries_states' document exists in Firestore.", () => {});
            // Fallback: If no data, populate with an empty list to avoid errors
            appCountries = [];
            appCountryStateMap = {};
        }
    } catch (error) {
        console.error("Error fetching country data from Firestore:", error);
        showModal("Data Error", `Failed to load country data: ${error.message}`, () => {});
        appCountries = [];
        appCountryStateMap = {};
    }
}

// Function to load existing data into the admin textareas
async function loadAdminCountryData() {
    try {
        await fetchCountryData(); // Ensure global appCountries and appCountryStateMap are updated

        // Convert appCountries array to semicolon-separated string
        const countriesString = appCountries.map(c => `${c.name},${c.code}`).join(';');
        adminCountriesInput.value = countriesString;

        // Convert appCountryStateMap object to semicolon-separated string
        const countryStateMapString = Object.entries(appCountryStateMap)
            .map(([code, states]) => `${code}:${states.join(',')}`)
            .join(';');
        adminCountryStateMapInput.value = countryStateMapString;

        adminMessageDiv.classList.add('hidden'); // Clear any previous messages
        console.log("Admin country data loaded into textareas.");
    }
    // No specific catch here as fetchCountryData already handles errors and shows modals
    catch (error) {
        console.error("Error in loadAdminCountryData:", error); // Log for debugging
    }
}

// NEW FUNCTION: Updates the hasAdmins status in app_metadata/admin_status
async function updateFirestoreAdminStatus() {
    if (!db || !auth.currentUser) {
        console.warn("Firestore or authenticated user not available. Cannot update admin status.");
        return;
    }

    try {
        // First, check how many 'Admin' role users exist in 'users_data'
        const q = query(collection(db, 'users_data'), where("role", "==", "Admin"));
        const querySnapshot = await getDocs(q);
        const currentHasAdmins = !querySnapshot.empty;

        const adminStatusDocRef = doc(db, "app_metadata", "admin_status");
        await setDoc(adminStatusDocRef, { hasAdmins: currentHasAdmins }, { merge: false }); // Overwrite the field
        console.log("Firestore admin status updated to:", currentHasAdmins);

        // Also update the global hasFirestoreAdmins flag
        hasFirestoreAdmins = currentHasAdmins;
    } catch (error) {
        console.error("Error updating Firestore admin status:", error);
        // Do not show modal here, as this runs in background after user operations
    }
}


// MODIFIED checkIfAnyFirestoreAdminExists to read from app_metadata/admin_status
async function checkIfAnyFirestoreAdminExists() {
    try {
        const adminStatusDocRef = doc(db, 'app_metadata', 'admin_status');
        const docSnap = await getDoc(adminStatusDocRef);

        if (docSnap.exists()) {
            hasFirestoreAdmins = docSnap.data().hasAdmins || false; // Default to false if field is missing
            console.log("checkIfAnyFirestoreAdminExists: Read from app_metadata/admin_status. Found existing Firestore Admins:", hasFirestoreAdmins);
        } else {
            // If the document doesn't exist, assume no admins yet (initial state)
            hasFirestoreAdmins = false;
            console.log("checkIfAnyFirestoreAdminExists: app_metadata/admin_status document does not exist. Assuming no admins.");
            // Optionally, create it immediately so future reads don't fail, but let the first admin write it.
        }
    } catch (error) {
        console.error("Error checking for existing Firestore admins via app_metadata/admin_status:", error);
        // This is a critical error, but we'll allow the app to proceed potentially without admin access
        hasFirestoreAdmins = false; // Assume no admins if there's an error due to permission or other issues
        // The modal for this specific error is now handled by the calling `initializeFirebase` or `showSection` if needed.
    }
}


// Initialize Firebase and set up authentication listener
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        getAnalytics(app); // Initialize Analytics
        db = getFirestore(app);
        auth = getAuth(app);

        console.log("initializeFirebase: Calling checkIfAnyFirestoreAdminExists...");
        // First, check if any 'Admin' role users exist in Firestore (from app_metadata/admin_status)
        await checkIfAnyFirestoreAdminExists();
        console.log("initializeFirebase: hasFirestoreAdmins after initial check:", hasFirestoreAdmins);

        // Listen for auth state changes
        onAuthStateChanged(auth, async (user) => {
            isAuthReady = true; // Mark auth as ready as soon as state is known
            console.log("onAuthStateChanged: Auth state changed. User:", user ? user.email || user.uid : "null", "hasFirestoreAdmins (global):", hasFirestoreAdmins);

            if (user) {
                currentUserId = user.uid;
                userIdDisplay.textContent = `User ID: ${user.email || user.uid}`;
                mobileUserIdDisplay.textContent = `User ID: ${user.email || user.uid}`;
                console.log("onAuthStateChanged: Current Firebase UID:", currentUserId);

                let isCurrentSessionBootstrapAdmin = false;

                // Determine if this is the bootstrap admin scenario
                // This condition relies on the global hasFirestoreAdmins flag correctly reflecting the *actual* admin count
                if (!hasFirestoreAdmins && user.email === BOOTSTRAP_ADMIN_EMAIL && user.uid === ADMIN_FIREBASE_UID) {
                    isAdmin = true; // Grant admin access for bootstrap user
                    isCurrentSessionBootstrapAdmin = true;
                    console.log("onAuthStateChanged: Bootstrap Admin detected. Admin access granted for setup.");
                } else if (user.email === BOOTSTRAP_ADMIN_EMAIL && hasFirestoreAdmins) {
                    // If bootstrap admin email logs in but permanent admins exist, they are NOT admin
                    isAdmin = false;
                    console.log("onAuthStateChanged: Bootstrap Admin email logged in, but permanent admins exist. Access restricted.");
                } else {
                    // For all other users (including Google users), check their role in Firestore
                    const userProfileRef = doc(db, 'users_data', user.uid); // Assuming user's profile doc ID is their Firebase UID
                    const userProfileSnap = await getDoc(userProfileRef);

                    if (userProfileSnap.exists() && userProfileSnap.data().role === 'Admin') {
                        isAdmin = true;
                        console.log("onAuthStateChanged: User profile has 'Admin' role. Admin access granted.");
                    } else {
                        isAdmin = false;
                        console.log("onAuthStateChanged: User is not admin (role not 'Admin' or profile not found).");
                    }
                }

                // UI updates based on authentication status and role
                navGoogleLoginButton.classList.add('hidden'); // Hide Google login button if logged in
                logoutButton.classList.remove('hidden');
                mobileLogoutButton.classList.remove('hidden');

                if (isAdmin) {
                    desktopAdminMenu.classList.remove('hidden');
                    mobileAdminMenu.classList.remove('hidden');
                } else {
                    desktopAdminMenu.classList.add('hidden');
                    mobileAdminMenu.classList.add('hidden');
                }

                // Fetch country data and populate dropdowns regardless of admin status for customer form
                await fetchCountryData();
                populateCountries();

                // If coming from a login attempt, or initial load, redirect to home or admin setup
                if (isCurrentSessionBootstrapAdmin) {
                    console.log("onAuthStateChanged: Redirecting to users-management-section for bootstrap admin.");
                    showSection('users-management-section'); // Redirect to user management for initial admin setup
                    showModal("Bootstrap Admin", "You are logged in as the bootstrap admin. Please navigate to 'Admin > Users' to create your permanent administrator account.", () => {});
                } else {
                    // If regular login or non-admin, go to home
                    console.log("onAuthStateChanged: Redirecting to home section.");
                    showSection('home');
                }

            } else { // No user is signed in.
                currentUserId = null;
                isAdmin = false; // Ensure isAdmin is false when no user
                console.log("onAuthStateChanged: No user signed in. hasFirestoreAdmins (global):", hasFirestoreAdmins);

                // Hide admin menus and logout buttons
                desktopAdminMenu.classList.add('hidden');
                mobileAdminMenu.classList.add('hidden');
                logoutButton.classList.add('hidden');
                mobileLogoutButton.classList.add('hidden');

                // Disable all form submit buttons by default when not logged in
                submitCustomerButton.setAttribute('disabled', 'disabled');
                uploadAdminDataButton.setAttribute('disabled', 'disabled');
                submitUserButton.setAttribute('disabled', 'disabled');

                // Determine which login screen to show
                if (!hasFirestoreAdmins) {
                    console.log("onAuthStateChanged: No Firestore Admins. Showing bootstrap admin login section.");
                    bootstrapAdminLoginSection.classList.remove('hidden');
                    authSection.classList.add('hidden');
                    navGoogleLoginButton.classList.add('hidden');
                    bootstrapAdminMessage.textContent = 'Please use the default admin login to set up the first administrator.';
                    bootstrapAdminMessage.classList.remove('hidden');
                    showSection('bootstrap-admin-login-section'); // Explicitly show this section
                } else {
                    console.log("onAuthStateChanged: Firestore Admins exist. Showing standard auth section.");
                    authSection.classList.remove('hidden');
                    bootstrapAdminLoginSection.classList.add('hidden');
                    navGoogleLoginButton.classList.remove('hidden'); // Show Google Login button
                    showSection('auth-section'); // Explicitly show this section
                }
            }
        });

    } catch (error) {
        console.error("Error initializing Firebase application:", error);
        showModal("Firebase Initialization Error", `Initialization failed: ${error.message}`, () => {});
    }
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


/* --- CUSTOMERS CRUD OPERATIONS (UPDATED) --- */

// Function to populate the country dropdown
function populateCountries() {
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
        addressValidationMessage.classList.remove('hidden');
        addressValidationMessage.textContent = "Please fill in all address fields.";
    } else {
        addressValidationMessage.classList.add('hidden');
        addressValidationMessage.textContent = "";
    }
    return isValid;
}


// Function to apply validation rules based on customer type
function applyCustomerTypeValidation() {
    const customerType = customerTypeSelect.value;

    // Hide all conditional groups first
    individualFieldsDiv.classList.add('hidden');
    customerLastNameInput.closest('div').classList.add('hidden');
    companyNameFieldDiv.classList.add('hidden');
    individualIndustryGroup.classList.add('hidden');
    companyIndustryGroup.classList.add('hidden');

    // Remove required attributes from all conditional inputs
    customerFirstNameInput.removeAttribute('required');
    customerLastNameInput.removeAttribute('required');
    customerCompanyNameInput.removeAttribute('required');
    customerIndustryInput.removeAttribute('required');
    customerIndustrySelect.removeAttribute('required');

    if (customerType === 'Individual') {
        individualFieldsDiv.classList.remove('hidden');
        customerLastNameInput.closest('div').classList.remove('hidden');
        customerFirstNameInput.setAttribute('required', 'required');
        customerLastNameInput.setAttribute('required', 'required');

        individualIndustryGroup.classList.remove('hidden');
        customerIndustryInput.setAttribute('required', 'required');
    } else if (customerType === 'Company') {
        companyNameFieldDiv.classList.remove('hidden');
        customerCompanyNameInput.setAttribute('required', 'required');

        companyIndustryGroup.classList.remove('hidden');
        customerIndustrySelect.setAttribute('required', 'required');
    }
}

// Add event listener for customer type change
customerTypeSelect.addEventListener('change', applyCustomerTypeValidation);

// Add event listener for country change to populate states
customerCountrySelect.addEventListener('change', (e) => {
    populateStates(e.target.value);
});


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
        customerList.innerHTML = '<p class="text-gray-500 text-center col-span-full">Authentication required to load customers.</p>';
        return;
    }

    // Always listen to the public collection for customers
    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers'); // dataArea is 'customers'
    if (!collectionPath) return; // Exit if path is not available due to auth error

    const q = collection(db, collectionPath);

    unsubscribeCustomers = onSnapshot(q, (snapshot) => {
        customerList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            customerList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No customers found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const customer = { id: doc.id, ...doc.data() }; // doc.id is Firestore's internal ID
            displayCustomer(customer);
        });
    }, (error) => {
        console.error("Error listening to customers:", error);
        customerList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading customers: ${error.message}</p>`;
    });
}

// Display a single customer in the UI as a grid row
function displayCustomer(customer) {
    const customerRow = document.createElement('div');
    customerRow.className = 'grid grid-cols-[100px_minmax(150px,_1.5fr)_1.5fr_1fr_1.5fr_1fr_0.8fr_1.5fr] gap-x-4 py-3 items-center text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50';
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
        <div class="px-2 py-1 truncate hidden lg:block">${customer.address || 'N/A'}, ${customer.city || 'N/A'}, ${customer.state || 'N/A'}, ${customer.country || 'N/A'}</div>
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
    customerFormTitle.textContent = 'Edit Customer';
    submitCustomerButton.textContent = 'Update Customer';

    // Display the system-generated Customer ID
    customerIdDisplayGroup.classList.remove('hidden');
    customerIdDisplay.textContent = customer.customerId || 'N/A';

    // Populate common fields
    customerTypeSelect.value = customer.customerType || '';
    customerEmailInput.value = customer.email || '';
    customerPhoneInput.value = customer.phone || '';
    customerSinceInput.value = customer.customerSince || '';
    customerDescriptionInput.value = customer.description || '';
    customerForm.dataset.editingId = customer.id;

    // Populate Address fields
    customerCountrySelect.value = customer.country || ''; // NEW
    populateStates(customer.country); // Populate states based on loaded country
    customerAddressInput.value = customer.address || '';
    customerCityInput.value = customer.city || '';
    // Set state value after population, ensuring it exists in the new options
    if (customer.state && Array.from(customerStateSelect.options).some(option => option.value === customer.state)) {
        customerStateSelect.value = customer.state;
    } else {
        customerStateSelect.value = ''; // Reset if not found
    }
    customerZipCodeInput.value = customer.zipCode || '';


    // Call applyCustomerTypeValidation BEFORE populating conditional fields
    // This ensures the correct fields are visible and required attributes are set
    // before we attempt to set their values.
    applyCustomerTypeValidation(); // This will show/hide fields based on typeSelect.value

    // Populate conditional fields AFTER applyCustomerTypeValidation has set visibility
    customerFirstNameInput.value = customer.firstName || '';
    customerLastNameInput.value = customer.lastName || '';
    customerCompanyNameInput.value = customer.companyName || '';

    // Set correct industry field value
    if (customer.customerType === 'Individual') {
        customerIndustryInput.value = customer.industry || '';
    } else if (customer.customerType === 'Company') {
        customerIndustrySelect.value = customer.industry || '';
    }

    addressValidationMessage.classList.add('hidden'); // Hide validation message on edit start

    customerForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Customer form function
function resetCustomerForm() {
    customerForm.reset();
    customerForm.dataset.editingId = '';
    customerFormTitle.textContent = 'Add New Customer';
    submitCustomerButton.textContent = 'Add Customer';
    customerIdDisplayGroup.classList.add('hidden'); // Hide ID display group
    customerIdDisplay.textContent = ''; // Clear displayed ID

    // Reset address fields and states
    customerCountrySelect.value = '';
    populateStates(''); // Clear states
    addressValidationMessage.classList.add('hidden'); // Hide validation message


    // Set customer type to Individual by default and apply validation
    customerTypeSelect.value = 'Individual';
    applyCustomerTypeValidation(); // Re-apply validation to hide/show fields correctly for a new entry
}

/* --- USERS CRUD OPERATIONS (NEW) --- */

// Save (Add/Update) a User
// This function now correctly handles Firestore document IDs to match Firebase Auth UIDs.
async function saveUser(userData, existingFirestoreDocId = null) { // Renamed parameter for clarity
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage users.", () => {});
        return;
    }

    // Gmail email validation for Username (which is the email they log in with)
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(userData.userName)) {
        showModal("Validation Error", "Username must be a valid Gmail email address.", () => {});
        return;
    }

    // Basic validation for other required fields
    if (!userData.firstName.trim() || !userData.lastName.trim() || !userData.email.trim() || !userData.role.trim()) {
        showModal("Validation Error", "First Name, Last Name, Email, and Role are mandatory.", () => {});
        return;
    }

    // Ensure skills is stored as an array
    userData.skills = userData.skills.split(',').map(s => s.trim()).filter(s => s !== '');

    const collectionPath = `users_data`; // Dedicated collection for users

    try {
        let targetDocRef; // This will be the Firestore DocumentReference

        if (existingFirestoreDocId) {
            // CASE 1: EDITING AN EXISTING USER
            // The Firestore document ID is already known and provided.
            targetDocRef = doc(db, collectionPath, existingFirestoreDocId);
            await updateDoc(targetDocRef, userData);
            console.log("User updated:", existingFirestoreDocId);
        } else {
            // CASE 2: ADDING A NEW USER
            // This is the critical part to ensure the Firestore document ID matches the Auth UID.
            // When an admin adds a new user, that user might not have logged in yet,
            // so we don't have their UID client-side.
            // The Firebase Auth UID is only known after a user logs in for the first time.

            // The simplest and most secure pattern for client-side applications:
            // User profiles (in users_data) are created *only when the user logs in for the first time*,
            // or when an admin edits an *existing* user's profile.
            // This means an admin cannot create a profile for a user who has never logged in.
            // Instead, if a user logs in for the first time, a basic profile could be created.
            // Then, an admin could edit that profile to assign a role.

            // For the purpose of getting your "Admin" menu to show:
            // The user who is currently logged in (bootstrap admin or new admin)
            // will have their `auth.currentUser.uid` available.
            // If they are setting up their OWN profile, we MUST use their `uid` as the doc ID.

            // Check if the userName (email) being saved matches the currently logged-in user's email
            if (auth.currentUser && userData.userName === auth.currentUser.email) {
                targetDocRef = doc(db, collectionPath, auth.currentUser.uid); // Use current user's UID as doc ID
                console.log("Saving profile for current user. Using UID as doc ID:", auth.currentUser.uid);
            } else {
                // If the admin is trying to save a *new* user whose email does NOT match the current admin's email,
                // and if this user has never logged in before, we don't know their UID client-side.
                // We'll prevent this operation and inform the admin.
                showModal("Cannot Add New User Directly",
                          "To add a new user profile, the user must first log into ShutterSync at least once with their Gmail account. After their initial login, you can edit their profile and assign a role.",
                          () => {});
                console.error("Attempted to add new user whose UID is unknown client-side.");
                return; // Prevent the save operation
            }

            // Generate a system-generated user ID to be STORED *within* the document's content
            // This is separate from the Firestore document ID.
            const systemGeneratedUserId = 'USR-' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            await setDoc(targetDocRef, { ...userData, userId: systemGeneratedUserId });
            console.log("New user saved with UID as doc ID:", targetDocRef.id);
        }

        resetUserForm(); // Reset form after successful operation
        await updateFirestoreAdminStatus(); // Update admin status in app_metadata after user save
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
                await updateFirestoreAdminStatus(); // Update admin status after user delete
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
        userList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Access Denied: Only administrators can view users.</p>';
        return;
    }

    if (unsubscribeUsers) {
        unsubscribeUsers(); // Unsubscribe from previous listener
    }

    const collectionPath = `users_data`;
    // Changed query to filter by 'role' and sort, if needed, not by UID directly in query
    // The previous 'where' was unnecessary, we just need all users_data to display.
    const q = collection(db, collectionPath);

    unsubscribeUsers = onSnapshot(q, (snapshot) => {
        userList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            userList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No users found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const user = { id: doc.id, ...doc.data() }; // doc.id is Firestore's internal ID
            displayUser(user);
        });
    }, (error) => {
        console.error("Error listening to users:", error);
        userList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading users: ${error.message}</p>`;
    });
}

// Display a single user in the UI as a grid row
function displayUser(user) {
    const userRow = document.createElement('div');
    userRow.className = 'grid grid-cols-[100px_minmax(120px,_1.2fr)_1.5fr_1fr_1fr_1.5fr] gap-x-4 py-3 items-center text-sm border-b border-gray-100 last:border-b-0 hover:bg-gray-50';
    userRow.dataset.id = user.id; // Store Firestore document ID for edit/delete actions

    userRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${user.userId || 'N/A'}</div>
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
    userFormTitle.textContent = 'Edit User';
    submitUserButton.textContent = 'Update User';
    userIdDisplayGroup.classList.remove('hidden');
    userIdDisplayInput.textContent = user.userId || 'N/A'; // Display the system-generated User ID

    userNameInput.value = user.userName || '';
    userFirstNameInput.value = user.firstName || '';
    userLastNameInput.value = user.lastName || '';
    userEmailInput.value = user.email || '';
    userPhoneInput.value = user.phone || '';
    userRoleSelect.value = user.role || ''; // Set value for select
    userSkillsInput.value = Array.isArray(user.skills) ? user.skills.join(', ') : user.skills || ''; // Convert array back to string

    userForm.dataset.editingId = user.id; // Store Firestore document ID
    userForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset User form function
function resetUserForm() {
    userForm.reset();
    userForm.dataset.editingId = '';
    userFormTitle.textContent = 'Add New User';
    submitUserButton.textContent = 'Add User';
    userIdDisplayGroup.classList.add('hidden'); // Hide ID display
    userIdDisplayInput.textContent = ''; // Clear displayed ID
    userRoleSelect.value = ''; // Reset select to default option
}

// --- Event Listeners ---

// Customer Form Event Listener (Renamed and Updated for validation)
customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect data from all fields, regardless of visibility, as values will be empty if hidden/optional
    const customerData = {
        customerType: customerTypeSelect.value.trim(),
        firstName: customerFirstNameInput.value.trim(),
        lastName: customerLastNameInput.value.trim(),
        companyName: customerCompanyNameInput.value.trim(),
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

// Mobile Menu Button Event Listener
mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Navigation Links Event Listeners
document.querySelectorAll('nav a').forEach(link => {
    if (link.dataset.section) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Force a login check for admin sections
            showSection(link.dataset.section, ['admin-country-mapping-section', 'users-management-section'].includes(link.dataset.section));
        });
    }
});

// Add event listener for the Google Login Button in the nav bar
if (navGoogleLoginButton) { // Ensure the element exists before adding listener
    navGoogleLoginButton.addEventListener('click', handleGoogleLogin);
}

// Add event listeners for logout buttons
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

// Admin Country Mapping Form Event Listener
document.getElementById('countryMappingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    adminMessageDiv.classList.add('hidden'); // Clear previous messages
    uploadAdminDataButton.disabled = true;
    uploadAdminDataButton.textContent = 'Uploading...';

    const countriesString = adminCountriesInput.value;
    const countryStateMapString = adminCountryStateMapInput.value;
    const isFullLoad = fullLoadRadio.checked;

    // Parse countries string into array of objects
    function parseCountries(countriesString) {
        if (!countriesString.trim()) return [];
        return countriesString.split(';').map(item => {
            const parts = item.split(',');
            if (parts.length === 2) {
                return { name: parts[0].trim(), code: parts[1].trim() };
            }
            return null;
        }).filter(item => item !== null);
    }

    // Parse countryStateMap string into an object
    function parseCountryStateMap(mapString) {
        const map = {};
        if (!mapString.trim()) return map;
        mapString.split(';').forEach(item => {
            const parts = item.split(':');
            if (parts.length === 2) {
                const countryCode = parts[0].trim();
                const states = parts[1].split(',').map(s => s.trim());
                map[countryCode] = states;
            }
        });
        return map;
    }

    const dataToUpload = {};
    let hasData = false;

    if (countriesString.trim() !== '') {
        dataToUpload.countries = parseCountries(countriesString);
        hasData = true;
    }
    if (countryStateMapString.trim() !== '') {
        dataToUpload.countryStateMap = parseCountryStateMap(countryStateMapString);
        hasData = true;
    }

    if (!hasData && isFullLoad) {
        // If full load is selected and both textareas are empty, clear the document
        dataToUpload.countries = [];
        dataToUpload.countryStateMap = {};
        hasData = true; // Still consider it having data to upload (empty arrays)
    } else if (!hasData && !isFullLoad) {
        adminMessageDiv.textContent = 'No data provided for incremental update.';
        adminMessageDiv.className = 'message error';
        adminMessageDiv.classList.remove('hidden');
        uploadAdminDataButton.disabled = false;
        uploadAdminDataButton.textContent = 'Upload Data to Firestore';
        return;
    }


    try {
        const docRef = doc(db, "app_metadata", "countries_states");
        if (isFullLoad) {
            // Full Load: Overwrite the document completely with only the provided fields
            await setDoc(docRef, dataToUpload, { merge: false });
            adminMessageDiv.textContent = 'Data uploaded successfully (Full Load)!';
            adminMessageDiv.className = 'message success';
        } else {
            // Incremental Load: Merge the provided fields into the existing document
            // Note: For arrays and objects, `merge: true` replaces the *entire* field,
            // it does not merge individual array elements or nested object properties.
            await setDoc(docRef, dataToUpload, { merge: true });
            adminMessageDiv.textContent = 'Data uploaded successfully (Incremental Load)!';
            adminMessageDiv.className = 'message success';
        }
        adminMessageDiv.classList.remove('hidden');
        console.log("Admin data upload successful:", dataToUpload);

        // Re-fetch data for CRM forms and populate dropdowns after successful admin update
        await fetchCountryData();
        populateCountries();

    } catch (error) {
        console.error("Error uploading admin data:", error);
        adminMessageDiv.textContent = `Error uploading data: ${error.message}`;
        adminMessageDiv.className = 'message error';
        adminMessageDiv.classList.remove('hidden');
    } finally {
        uploadAdminDataButton.disabled = false;
        uploadAdminDataButton.textContent = 'Upload Data to Firestore';
    }
});

// User Form Event Listener
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

// Bootstrap Admin Login Form Event Listener
bootstrapAdminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    bootstrapAdminMessage.classList.add('hidden'); // Clear previous messages
    bootstrapAdminLoginButton.disabled = true;
    bootstrapAdminLoginButton.textContent = 'Logging In...';

    const email = bootstrapAdminEmailInput.value;
    const password = bootstrapAdminPasswordInput.value;

    try {
        // Attempt to sign in
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle UI updates on successful login
        console.log("Bootstrap admin signed in successfully.");
    } catch (error) {
        // If sign-in fails, try to create the user (only if 'auth/user-not-found')
        if (error.code === 'auth/user-not-found') {
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                console.log("Bootstrap admin user created and signed in successfully.");
                // onAuthStateChanged will handle UI updates on successful creation/login
            } catch (createError) {
                console.error("Error creating bootstrap admin user:", createError);
                bootstrapAdminMessage.textContent = `Error: ${createError.message}`;
                bootstrapAdminMessage.classList.remove('hidden');
            }
        } else {
            console.error("Error signing in bootstrap admin:", error);
            bootstrapAdminMessage.textContent = `Login failed: ${error.message}`;
            bootstrapAdminMessage.classList.remove('hidden');
        }
    } finally {
        bootstrapAdminLoginButton.disabled = false;
        bootstrapAdminLoginButton.textContent = 'Login as Bootstrap Admin';
    }
});


// Initialize Firebase on window load
window.onload = initializeFirebase;
