import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

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
let currentCollectionType = 'private'; // 'private' or 'public' for contacts
const currentCustomerCollectionType = 'public'; // Fixed to public as per requirement
let unsubscribeContacts = null; // To store the onSnapshot unsubscribe function for contacts
let unsubscribeCustomers = null; // To store the onSnapshot unsubscribe function for customers

// Hardcoded Firebase UID for the 'admin' user (boskyjoe@gmail.com).
// YOU NEED TO REPLACE 'YOUR_ACTUAL_FIREBASE_UID_FOR_BOSKYJOE_ANONYMOUS_SESSION'
// To get this: Run the app once, open developer console (F12), and look for
// "Current Firebase UID:" log. Copy that UID and paste it here.
const ADMIN_FIREBASE_UID = 'YOUR_ACTUAL_FIREBASE_UID_FOR_BOSKYJOE_ANONYMOUS_SESSION'; // Placeholder
let isAdmin = false; // Flag to control admin specific UI/features

// Get references to DOM elements for Contacts
const contactForm = document.getElementById('contactForm');
const contactList = document.getElementById('contactList');
const userIdDisplay = document.getElementById('userIdDisplay');
const collectionToggleButton = document.getElementById('collectionToggleButton');
const modalContainer = document.getElementById('modalContainer');
const mobileMenuButton = document.getElementById('mobileMenuButton');
const mobileMenu = document.getElementById('mobileMenu');
const mobileUserIdDisplay = document.getElementById('mobileUserIdDisplay');
const submitContactButton = document.getElementById('submitButton');

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
const customerAddressInput = document.getElementById('customerAddress');
const customerCityInput = document.getElementById('customerCity');
const customerStateInput = document.getElementById('customerState');
const customerZipCodeInput = document.getElementById('customerZipCode');

const individualIndustryGroup = document.getElementById('individualIndustryGroup');
const customerIndustryInput = document.getElementById('customerIndustryInput');
const companyIndustryGroup = document.getElementById('companyIndustryGroup');
const customerIndustrySelect = document.getElementById('customerIndustrySelect');

const customerSinceInput = document.getElementById('customerSince');
const customerDescriptionInput = document.getElementById('customerDescription');
const submitCustomerButton = document.getElementById('submitCustomerButton');
const customerList = document.getElementById('customerList');

// References to logout buttons
const logoutButton = document.getElementById('logoutButton');
const mobileLogoutButton = document.getElementById('mobileLogoutButton');
const googleLoginButton = document.getElementById('googleLoginButton'); // NEW: Reference to Google Login Button


// Select all main content sections
const homeSection = document.getElementById('home');
const crmSection = document.getElementById('crm-section');
const eventsSection = document.getElementById('events-section');
const allSections = [homeSection, crmSection, customersSection, eventsSection];


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
function showSection(sectionId) {
    allSections.forEach(section => {
        if (section) {
            section.classList.add('hidden');
        }
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    mobileMenu.classList.add('hidden'); // Close mobile menu when navigating

    // Stop all listeners first to prevent redundant updates
    if (unsubscribeContacts) { unsubscribeContacts(); }
    if (unsubscribeCustomers) { unsubscribeCustomers(); }

    // Start specific listener for the active section, but only if auth is ready
    if (isAuthReady) {
        if (sectionId === 'crm-section') {
            listenForContacts();
            // Enable/disable Add Contact button based on admin status
            if (isAdmin) {
                submitContactButton.removeAttribute('disabled');
            } else {
                submitContactButton.setAttribute('disabled', 'disabled');
            }
        } else if (sectionId === 'customers-section') {
            listenForCustomers();
            resetCustomerForm(); // Reset form and apply initial validation state
            // The Add Customer button is always enabled as per previous logic (public data)
            submitCustomerButton.removeAttribute('disabled');
        }
    } else {
        console.warn("Attempted to show section before Firebase Auth is ready:", sectionId);
        // Ensure buttons are disabled if auth is not ready
        submitContactButton.setAttribute('disabled', 'disabled');
        submitCustomerButton.setAttribute('disabled', 'disabled');
        collectionToggleButton.setAttribute('disabled', 'disabled');
        // You might want to display a loading or "authentication required" message here
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

// Initialize Firebase and set up authentication listener
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        getAnalytics(app); // Initialize Analytics
        db = getFirestore(app);
        auth = getAuth(app);

        // Listen for auth state changes
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                // Display user's email if available, otherwise fallback to UID
                userIdDisplay.textContent = `User ID: ${user.email || user.uid}`;
                mobileUserIdDisplay.textContent = `User ID: ${user.email || user.uid}`;

                console.log("Current Firebase UID:", currentUserId); // Log the actual UID for user to copy

                // Determine if the current user is an admin
                isAdmin = (currentUserId === ADMIN_FIREBASE_UID);
                console.log("Is Admin:", isAdmin);

                if (!isAuthReady) { // Only run this block once after initial auth
                    isAuthReady = true;
                    // Enable/disable UI elements based on isAdmin status and general auth readiness
                    submitCustomerButton.removeAttribute('disabled'); // Customer button always enabled (public data)
                    collectionToggleButton.removeAttribute('disabled'); // Contacts toggle always enabled

                    // Contacts submit button is conditional on admin role
                    if (isAdmin) {
                        submitContactButton.removeAttribute('disabled');
                    } else {
                        submitContactButton.setAttribute('disabled', 'disabled');
                    }

                    // Show logout buttons and hide Google login button if logged in
                    logoutButton.classList.remove('hidden');
                    mobileLogoutButton.classList.remove('hidden');
                    if (googleLoginButton) {
                        googleLoginButton.classList.add('hidden');
                    }

                    showSection('home'); // Show initial content (home page)
                }
            } else {
                // No user is signed in. Attempt anonymous login if not already authenticated.
                // If the user logs out, or if this is initial load and no session, attempt anonymous sign-in.
                if (!isAuthReady) { // Prevent re-triggering if already authenticated or processing
                    try {
                        console.log("No user found, attempting anonymous sign-in...");
                        await signInAnonymously(auth);
                        // onAuthStateChanged will fire again with the new anonymous user
                    } catch (anonError) {
                        console.error("Error during anonymous sign-in:", anonError);
                        showModal("Authentication Error", `Failed to sign in anonymously: ${anonError.message}. Please refresh the page to try again.`, () => {});
                        // Ensure UI is disabled if authentication fails
                        submitContactButton.setAttribute('disabled', 'disabled');
                        submitCustomerButton.setAttribute('disabled', 'disabled');
                        collectionToggleButton.setAttribute('disabled', 'disabled');
                        allSections.forEach(section => { if(section) section.classList.add('hidden'); }); // Keep all content hidden
                        isAuthReady = false;
                        isAdmin = false;
                    }
                }
                // Hide logout buttons and show Google login button if not logged in
                logoutButton.classList.add('hidden');
                mobileLogoutButton.classList.add('hidden');
                if (googleLoginButton) {
                    googleLoginButton.classList.remove('hidden');
                }
            }
        });

        // Trigger initial auth state check. If no current user, onAuthStateChanged will attempt anonymous sign-in.
        // No explicit signInAnonymously call needed here anymore, onAuthStateChanged handles it.

    } catch (error) {
        console.error("Error initializing Firebase application:", error);
        showModal("Firebase Initialization Error", `Initialization failed: ${error.message}`, () => {});
    }
}

// Determine the Firestore collection path based on type and user ID
function getCollectionPath(type, dataArea = 'contacts') {
    if (!currentUserId) {
        console.error("currentUserId is null, cannot determine collection path. Authentication not established.");
        return `artifacts/${appId}/public/data/${dataArea}_fallback`;
    }
    if (type === 'public') {
        return `artifacts/${appId}/public/data/${dataArea}`;
    } else { // 'private'
        return `artifacts/${appId}/users/${currentUserId}/${dataArea}`;
    }
}

/* --- CONTACTS CRUD OPERATIONS --- */

// Add or update a contact in Firestore
async function saveContact(contactData, contactId = null) {
    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated or session not established. Cannot save contact.");
        showModal("Error", "Could not save contact. Authentication required.", () => {});
        return;
    }
    // Client-side admin check for adding contacts
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can add or modify employee contacts.", () => {});
        return;
    }

    const collectionPath = getCollectionPath(currentCollectionType, 'contacts'); // Specify dataArea
    try {
        if (contactId) {
            const contactDocRef = doc(db, collectionPath, contactId);
            await updateDoc(contactDocRef, contactData);
            console.log("Contact updated:", contactId);
        } else {
            await addDoc(collection(db, collectionPath), contactData);
            console.log("Contact added.");
        }
        contactForm.reset();
        contactForm.dataset.editingId = '';
        document.getElementById('contactFormTitle').textContent = 'Add New Contact';
        submitContactButton.textContent = 'Add Contact';
    } catch (error) {
        console.error("Error saving contact:", error);
        showModal("Error", "Failed to save contact. Please try again. " + error.message, () => {});
    }
}

// Delete a contact from Firestore
async function deleteContact(contactId) {
    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated or session not established. Cannot delete contact.");
        showModal("Error", "Could not delete contact. Authentication required.", () => {});
        return;
    }
    // Client-side admin check for deleting contacts
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can delete employee contacts.", () => {});
        return;
    }

    const collectionPath = getCollectionPath(currentCollectionType, 'contacts'); // Specify dataArea
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this contact? This action cannot be undone.",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, contactId));
                console.log("Contact deleted:", contactId);
            } catch (error) {
                console.error("Error deleting contact:", error);
                showModal("Error", "Failed to delete contact. Please try again. " + error.message, () => {});
            }
        }
    );
}

// Listen for real-time updates to contacts
function listenForContacts() {
    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated or session not established. Cannot listen for contacts.");
        contactList.innerHTML = '<p class="text-gray-500 text-center">Authentication required to load contacts.</p>';
        return;
    }

    if (unsubscribeContacts) {
        unsubscribeContacts(); // Unsubscribe from previous listener
    }

    const collectionPath = getCollectionPath(currentCollectionType, 'contacts'); // Specify dataArea
    const q = collection(db, collectionPath);

    unsubscribeContacts = onSnapshot(q, (snapshot) => {
        contactList.innerHTML = '';
        if (snapshot.empty) {
            contactList.innerHTML = '<p class="text-gray-500 text-center">No contacts found in this collection.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const contact = { id: doc.id, ...doc.data() };
            displayContact(contact);
        });
    }, (error) => {
        console.error("Error listening to contacts:", error);
        contactList.innerHTML = `<p class="text-red-500 text-center">Error loading contacts: ${error.message}</p>`;
    });
}

// Display a single contact in the UI
function displayContact(contact) {
    const contactCard = document.createElement('div');
    contactCard.className = 'contact-card';
    contactCard.dataset.id = contact.id;
    contactCard.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-900">${contact.name || 'N/A'}</h3>
        <p class="text-sm text-gray-600">Email: ${contact.email || 'N/A'}</p>
        <p class="text-sm text-gray-600">Phone: ${contact.phone || 'N/A'}</p>
        <p class="text-sm text-gray-600">Notes: ${contact.notes || 'N/A'}</p>
        <div class="actions">
            <button class="edit-btn secondary" data-id="${contact.id}" ${isAdmin ? '' : 'disabled'}>Edit</button>
            <button class="delete-btn danger" data-id="${contact.id}" ${isAdmin ? '' : 'disabled'}>Delete</button>
        </div>
    `;
    contactList.appendChild(contactCard);

    // Add event listeners only if the buttons are enabled
    if (isAdmin) {
        contactCard.querySelector('.edit-btn').addEventListener('click', () => editContact(contact));
        contactCard.querySelector('.delete-btn').addEventListener('click', () => deleteContact(contact.id));
    }
}

// Populate form for editing a contact
function editContact(contact) {
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can edit employee contacts.", () => {});
        return;
    }
    document.getElementById('contactName').value = contact.name || '';
    document.getElementById('contactEmail').value = contact.email || '';
    document.getElementById('contactPhone').value = contact.phone || '';
    document.getElementById('contactNotes').value = contact.notes || '';
    contactForm.dataset.editingId = contact.id;
    document.getElementById('contactFormTitle').textContent = 'Edit Contact';
    submitContactButton.textContent = 'Update Contact';
    contactForm.scrollIntoView({ behavior: 'smooth' });
}

/* --- CUSTOMERS CRUD OPERATIONS (UPDATED) --- */

// Function to apply validation rules based on customer type
function applyCustomerTypeValidation() {
    const customerType = customerTypeSelect.value;

    // Hide all conditional groups first
    individualFieldsDiv.classList.add('hidden');
    lastNameField.classList.add('hidden');
    companyNameFieldDiv.classList.add('hidden');
    individualIndustryGroup.classList.add('hidden');
    companyIndustryGroup.classList.add('hidden');

    // Remove required attributes from all conditional inputs
    customerFirstNameInput.removeAttribute('required');
    customerLastNameInput.removeAttribute('required');
    customerCompanyNameInput.removeAttribute('required');
    customerIndustryInput.removeAttribute('required');
    customerIndustrySelect.removeAttribute('required');

    // Clear values of conditional inputs to prevent stale data submission
    customerFirstNameInput.value = '';
    customerLastNameInput.value = '';
    customerCompanyNameInput.value = '';
    customerIndustryInput.value = '';
    customerIndustrySelect.value = ''; // Reset select to default option


    if (customerType === 'Individual') {
        individualFieldsDiv.classList.remove('hidden');
        lastNameField.classList.remove('hidden');
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
        !customerAddressInput.value.trim() || !customerCityInput.value.trim() ||
        !customerStateInput.value.trim() || !customerZipCodeInput.value.trim() ||
        !customerData.industry || !customerSinceInput.value.trim()) {
        showModal("Validation Error", "Please fill in all mandatory fields.", () => {});
        return;
    }


    // Always use the public collection for customers
    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers'); // dataArea is 'customers'

    try {
        if (existingCustomerDocId) {
            // Editing an existing customer: simply update the document
            const customerDocRef = doc(db, collectionPath, existingCustomerDocId);
            await updateDoc(customerDocRef, customerData);
            console.log("Customer updated:", existingCustomerDocId);
        } else {
            // Adding a NEW customer: let Firestore generate a document ID, then store custom CustomerID as a field
            const newDocRef = doc(collection(db, collectionPath)); // Get a reference with a new auto-generated ID
            const systemGeneratedCustomerId = 'CUS-' + newDocRef.id; // Create custom CustomerID

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
    if (!isAuthReady || !currentUserId) {
        console.error("User not authenticated or session not established. Cannot listen for customers.");
        customerList.innerHTML = '<p class="text-gray-500 text-center col-span-full">Authentication required to load customers.</p>';
        return;
    }

    if (unsubscribeCustomers) {
        unsubscribeCustomers(); // Unsubscribe from previous listener
    }

    // Always listen to the public collection for customers
    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers'); // dataArea is 'customers'
    const q = collection(db, collectionPath);

    unsubscribeCustomers = onSnapshot(q, (snapshot) => {
        customerList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            customerList.innerHTML = '<p class="text-gray-500 text-center col-span-full">No customers found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const customer = { id: doc.id, ...doc.data() }; // doc.id is Firestore's internal ID
            displayCustomer(customer);
        });
    }, (error) => {
        console.error("Error listening to customers:", error);
        customerList.innerHTML = `<p class="text-red-500 text-center col-span-full">Error loading customers: ${error.message}</p>`;
    });
}

// Display a single customer in the UI
function displayCustomer(customer) {
    const customerCard = document.createElement('div');
    customerCard.className = 'bg-white p-6 rounded-lg shadow-md border border-gray-100 flex flex-col space-y-2';
    customerCard.dataset.id = customer.id; // Store Firestore document ID for edit/delete actions

    // Determine the main heading based on customer type
    let mainHeading = 'N/A';
    if (customer.customerType === 'Company' && customer.companyName) {
        mainHeading = customer.companyName;
    } else if (customer.customerType === 'Individual' && (customer.firstName || customer.lastName)) {
        mainHeading = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    }

    customerCard.innerHTML = `
        <h3 class="text-xl font-bold text-blue-700 mb-2">${mainHeading}</h3>
        <p class="text-sm text-gray-700"><strong>ID:</strong> ${customer.customerId || 'N/A'}</p>
        <p class="text-sm text-gray-600"><strong>Type:</strong> ${customer.customerType || 'N/A'}</p>
        ${customer.customerType === 'Individual' && (customer.firstName || customer.lastName) ? `<p class="text-sm text-gray-600"><strong>Name:</strong> ${customer.firstName || 'N/A'} ${customer.lastName || 'N/A'}</p>` : ''}
        ${customer.customerType === 'Company' && customer.companyName ? `<p class="text-sm text-gray-600"><strong>Company:</strong> ${customer.companyName || 'N/A'}</p>` : ''}
        <p class="text-sm text-gray-600"><strong>Email:</strong> ${customer.email || 'N/A'}</p>
        <p class="text-sm text-gray-600"><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
        <p class="text-sm text-gray-600"><strong>Address:</strong> ${customer.address || 'N/A'}, ${customer.city || 'N/A'}, ${customer.state || 'N/A'} ${customer.zipCode || 'N/A'}</p>
        <p class="text-sm text-gray-600"><strong>Industry:</strong> ${customer.industry || 'N/A'}</p>
        <p class="text-sm text-gray-600"><strong>Since:</strong> ${customer.customerSince || 'N/A'}</p>
        <p class="text-sm text-gray-600 flex-grow"><strong>Description:</strong> ${customer.description || 'N/A'}</p>
        <div class="actions flex justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
            <button class="edit-btn secondary px-4 py-2 text-sm" data-id="${customer.id}" ${isAdmin ? '' : 'disabled'}>Edit</button>
            <button class="delete-btn danger px-4 py-2 text-sm" data-id="${customer.id}" ${isAdmin ? '' : 'disabled'}>Delete</button>
        </div>
    `;
    customerList.appendChild(customerCard);

    // Add event listeners only if the buttons are enabled
    if (isAdmin) {
        customerCard.querySelector('.edit-btn').addEventListener('click', () => editCustomer(customer));
        customerCard.querySelector('.delete-btn').addEventListener('click', () => deleteCustomer(customer.id));
    }
}

// Populate form for editing a customer
function editCustomer(customer) {
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can edit employee contacts.", () => {});
        return;
    }
    customerFormTitle.textContent = 'Edit Customer';
    submitCustomerButton.textContent = 'Update Customer';

    // Display the system-generated Customer ID
    customerIdDisplayGroup.classList.remove('hidden');
    customerIdDisplay.textContent = customer.customerId || 'N/A';

    // Populate common fields
    customerTypeSelect.value = customer.customerType || '';
    customerEmailInput.value = customer.email || '';
    customerPhoneInput.value = customer.phone || '';
    customerAddressInput.value = customer.address || '';
    customerCityInput.value = customer.city || '';
    customerStateInput.value = customer.state || '';
    customerZipCodeInput.value = customer.zipCode || '';
    customerSinceInput.value = customer.customerSince || '';
    customerDescriptionInput.value = customer.description || '';
    customerForm.dataset.editingId = customer.id;

    // Populate conditional fields and apply validation rules
    customerFirstNameInput.value = customer.firstName || '';
    customerLastNameInput.value = customer.lastName || '';
    customerCompanyNameInput.value = customer.companyName || '';

    // Set correct industry field value
    if (customer.customerType === 'Individual') {
        customerIndustryInput.value = customer.industry || '';
    } else if (customer.customerType === 'Company') {
        customerIndustrySelect.value = customer.industry || '';
    }

    applyCustomerTypeValidation(); // This will show/hide fields based on typeSelect.value

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

    // Set customer type to Individual by default and apply validation
    customerTypeSelect.value = 'Individual';
    applyCustomerTypeValidation(); // Re-apply validation to hide/show fields correctly for a new entry
}

// --- Event Listeners ---

// Contact Form Event Listener
contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const contactData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        phone: document.getElementById('contactPhone').value,
        notes: document.getElementById('contactNotes').value
    };
    const editingId = contactForm.dataset.editingId;
    saveContact(contactData, editingId || null);
});

// Contact Collection Toggle Button Event Listener
collectionToggleButton.addEventListener('click', () => {
    currentCollectionType = currentCollectionType === 'private' ? 'public' : 'private';
    collectionToggleButton.textContent = `Switch to ${currentCollectionType === 'private' ? 'Public' : 'Private'} Contacts`;
    listenForContacts(); // Reload contacts based on new collection type
});

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
        address: customerAddressInput.value.trim(),
        city: customerCityInput.value.trim(),
        state: customerStateInput.value.trim(),
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
            showSection(link.dataset.section);
        });
    }
});

// Add event listener for the Google Login Button
if (googleLoginButton) {
    googleLoginButton.addEventListener('click', handleGoogleLogin);
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
    } catch (error) {
        console.error("Error signing out:", error);
        showModal("Logout Error", `Failed to log out: ${error.message}`, () => {});
    }
});


// Initialize Firebase on window load
window.onload = initializeFirebase;
