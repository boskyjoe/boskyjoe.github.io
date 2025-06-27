// Use named imports for specific global states (excluding 'db' here)
import { isAuthReady, currentUserId, isAdmin, addUnsubscribe, removeUnsubscribe, fetchCountryData, appCountries, appCountryStateMap, allCustomers, isDbReady } from './main.js';
import { showModal, getCollectionPath, formatDate } from './utils.js'; // Import utility functions

import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";


// Global variable to hold the Firestore DB instance, explicitly set by main.js
let firestoreDb = null;

// EXPORTED: Setter function for the Firestore DB instance
export function setDbInstance(instance) {
    if (instance && typeof instance.collection === 'function' && instance.type === 'firestore') {
        firestoreDb = instance;
        console.log("customers.js: Firestore DB instance successfully set via setDbInstance.");
    } else {
        console.error("customers.js: Attempted to set an invalid Firestore DB instance.");
        firestoreDb = null; // Ensure it's null if invalid
    }
}


// DOM elements for Customer Management Section
let customersManagementSection;
let customerForm;
let customerFormTitle;
let customerIdDisplayGroup;
let customerIdDisplay;

let customerTypeSelect;
let individualFieldsDiv;
let customerFirstNameInput;
let customerLastNameInput;
let companyNameFieldDiv;
let customerCompanyNameInput;

let customerEmailInput;
let customerPhoneInput;

// Address fields
let customerCountrySelect;
let customerAddressInput;
let customerCityInput;
let customerStateSelect;
let customerZipCodeInput;
let addressValidationMessage;

let individualIndustryGroup;
let customerIndustryInput;
let companyIndustryGroup;
let customerIndustrySelect;

let customerSinceInput;
let customerDescriptionInput;
let submitCustomerButton;
let customerList; // Reference to the div for customer rows
let customerSourceSelect; // NEW: Customer Source
let customerActiveSelect; // NEW: Customer Active

/**
 * Initializes the Customers module, setting up DOM references, event listeners,
 * and starting data listeners if authentication is ready.
 * No longer accepts dbInstance as it directly imports 'db'.
 */
export async function initCustomersModule() {
    console.log("customers.js: initCustomersModule called.");
    // Access imported properties directly
    console.log("customers.js: initCustomersModule current state - firestoreDb:", firestoreDb, "isAuthReady:", isAuthReady, "isDbReady:", isDbReady, "currentUserId:", currentUserId);


    // Initialize DOM elements if they haven't been already. This helps prevent null references.
    if (!customersManagementSection) { // Check for a key element to prevent re-initialization
        customersManagementSection = document.getElementById('customers-section');
        customerForm = document.getElementById('customerForm');
        customerFormTitle = document.getElementById('customerFormTitle');
        customerIdDisplayGroup = document.getElementById('customerIdDisplayGroup');
        customerIdDisplay = document.getElementById('customerIdDisplay');

        customerTypeSelect = document.getElementById('customerType');
        individualFieldsDiv = document.getElementById('individualFields');
        customerFirstNameInput = document.getElementById('customerFirstName');
        customerLastNameInput = document.getElementById('customerLastName');
        companyNameFieldDiv = document.getElementById('companyNameField');
        customerCompanyNameInput = document.getElementById('customerCompanyName');

        customerEmailInput = document.getElementById('customerEmail');
        customerPhoneInput = document.getElementById('customerPhone');

        customerCountrySelect = document.getElementById('customerCountry');
        customerAddressInput = document.getElementById('customerAddress');
        customerCityInput = document.getElementById('customerCity');
        customerStateSelect = document.getElementById('customerState');
        customerZipCodeInput = document.getElementById('customerZipCode'); // Correctly referencing the DOM element
        addressValidationMessage = document.getElementById('addressValidationMessage');

        individualIndustryGroup = document.getElementById('individualIndustryGroup');
        customerIndustryInput = document.getElementById('customerIndustryInput');
        companyIndustryGroup = document.getElementById('companyIndustryGroup');
        customerIndustrySelect = document.getElementById('customerIndustrySelect');

        customerSinceInput = document.getElementById('customerSince');
        customerDescriptionInput = document.getElementById('customerDescription');
        submitCustomerButton = document.getElementById('submitCustomerButton');
        customerList = document.getElementById('customerList');

        customerSourceSelect = document.getElementById('customerSource'); // NEW
        customerActiveSelect = document.getElementById('customerActive'); // NEW

        // Add event listeners once, using `dataset.listenerAdded` to prevent duplicates
        if (customerForm && !customerForm.dataset.listenerAdded) {
            customerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveCustomer();
            });
            customerForm.dataset.listenerAdded = 'true';
        }
        const resetBtn = document.getElementById('resetCustomerFormButton');
        if (resetBtn && !resetBtn.dataset.listenerAdded) {
            resetBtn.addEventListener('click', resetCustomerForm);
            resetBtn.dataset.listenerAdded = 'true';
        }

        if (customerTypeSelect && !customerTypeSelect.dataset.listenerAdded) {
            customerTypeSelect.addEventListener('change', applyCustomerTypeValidation);
            customerTypeSelect.dataset.listenerAdded = 'true';
            applyCustomerTypeValidation(); // Initial call
        }

        if (customerCountrySelect && !customerCountrySelect.dataset.listenerAdded) {
            customerCountrySelect.addEventListener('change', (e) => populateStates(e.target.value));
            customerCountrySelect.dataset.listenerAdded = 'true';
        }
    }

    // Load data specific to this module ONLY if auth and DB are ready AND firestoreDb is set
    if (isAuthReady && currentUserId && firestoreDb && isDbReady) {
        console.log("customers.js: Auth, User, and DB are ready. Initializing customer data.");
        if (submitCustomerButton) submitCustomerButton.removeAttribute('disabled');
        await fetchCountryData(); // Used directly imported function from main
        populateCountries();
        listenForCustomers(); // This will use the firestoreDb
        resetCustomerForm(); // Ensure the form is cleared and ready for new input
    } else {
        console.warn("customers.js: Authentication, User, or Firestore DB not ready (or firestoreDb not set). Customers module not fully initialized for data operations.");
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing customers. Please wait or sign in...</p>'; // Updated message
        if (submitCustomerButton) submitCustomerButton.setAttribute('disabled', 'disabled');
    }
}

/**
 * Gets the Firestore collection path for customers.
 * Customers are stored in a 'public' collection.
 * @returns {string} The full Firestore collection path.
 */
function getCustomerCollectionPath() {
    return getCollectionPath('customers', 'public'); // Data area 'customers', type 'public'
}


/* --- CUSTOMERS CRUD OPERATIONS --- */

/**
 * Populates the country dropdown select element from the globally available `appCountries` array.
 */
function populateCountries() {
    if (!customerCountrySelect) return;
    customerCountrySelect.innerHTML = '<option value="">Select Country</option>';
    appCountries.forEach(country => { // Used directly imported array
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        customerCountrySelect.appendChild(option);
    });
    console.log("customers.js: Country dropdown populated.");
}

/**
 * Populates the state/province dropdown based on the selected country code.
 * @param {string} countryCode - The two-letter code of the selected country.
 */
function populateStates(countryCode) {
    if (!customerStateSelect) return;
    customerStateSelect.innerHTML = '<option value="">Select State/Province</option>';
    const states = appCountryStateMap[countryCode] || []; // Used directly imported map
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        customerStateSelect.appendChild(option);
    });
    customerStateSelect.disabled = states.length === 0; // Disable if no states
    console.log(`customers.js: States populated for ${countryCode}.`);
}

/**
 * Placeholder for address validation. In a real app, this would call an external API.
 * For now, it performs basic checks for required address fields.
 * @param {string} address
 * @param {string} city
 * @param {string} country
 * @param {string} zipCode (now passed for specific validation)
 * @param {string} countryCode (now passed for specific validation)
 * @returns {boolean} True if address is considered valid based on non-empty values and basic zip.
 */
function validateAddress(address, city, country, zipCode, countryCode) {
    let isValid = true;
    let message = '';

    // Basic required fields check
    if (address.trim() === '' || city.trim() === '' || country.trim() === '') {
        message += 'Please enter a valid address, city, and select a country. ';
        isValid = false;
    }

    // Country-specific zip code validation
    if (zipCode && countryCode) {
        if (countryCode === 'US' && !/^\d{5}(-\d{4})?$/.test(zipCode)) {
            message += 'US zip code must be 5 digits (e.g., 90210) or 5+4 (e.g., 90210-1234). ';
            isValid = false;
        } else if (countryCode === 'CA' && !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(zipCode)) {
            message += 'Canadian postal code must be in A1A 1A1 format. ';
            isValid = false;
        }
        // Add more country-specific regex patterns here as needed
    }

    if (!isValid && addressValidationMessage) {
        addressValidationMessage.textContent = message.trim();
        addressValidationMessage.classList.remove('hidden');
    } else if (addressValidationMessage) {
        addressValidationMessage.classList.add('hidden');
    }
    return isValid;
}


/**
 * Applies validation rules and shows/hides fields based on the selected customer type.
 */
function applyCustomerTypeValidation() {
    if (!customerTypeSelect || !individualFieldsDiv || !companyNameFieldDiv || !individualIndustryGroup || !companyIndustryGroup) return;

    const customerType = customerTypeSelect.value;

    // Reset required attributes first to avoid conflicts
    customerFirstNameInput.removeAttribute('required');
    customerLastNameInput.removeAttribute('required');
    customerCompanyNameInput.removeAttribute('required');

    if (customerType === 'Individual') {
        individualFieldsDiv.classList.remove('hidden');
        companyNameFieldDiv.classList.add('hidden');
        individualIndustryGroup.classList.remove('hidden');
        companyIndustryGroup.classList.add('hidden');

        customerFirstNameInput.setAttribute('required', 'required');
        customerLastNameInput.setAttribute('required', 'required');

    } else if (customerType === 'Company') {
        individualFieldsDiv.classList.add('hidden');
        companyNameFieldDiv.classList.remove('hidden');
        individualIndustryGroup.classList.add('hidden');
        companyIndustryGroup.classList.add('hidden');

        customerCompanyNameInput.setAttribute('required', 'required');
    } else { // "Select Type" or other invalid selection
        individualFieldsDiv.classList.add('hidden');
        companyNameFieldDiv.classList.add('hidden');
        individualIndustryGroup.classList.add('hidden');
        companyIndustryGroup.classList.add('hidden');
    }
    console.log(`customers.js: Customer type validation applied for: ${customerType}.`);
}

/**
 * Saves (adds or updates) a customer record in Firestore.
 * Data is read from the form fields.
 */
async function saveCustomer() {
    if (!isAuthReady || !currentUserId || !firestoreDb || !isDbReady) { // Use firestoreDb
        showModal("Permission Denied", "Please sign in to manage customers, or Firestore is not ready.", () => {});
        return;
    }

    const customerType = customerTypeSelect.value;
    const firstName = customerFirstNameInput.value.trim();
    const lastName = customerLastNameInput.value.trim();
    const companyName = customerCompanyNameInput.value.trim();
    const email = customerEmailInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const country = customerCountrySelect.value;
    const address = customerAddressInput.value.trim();
    const city = customerCityInput.value.trim();
    const state = customerStateSelect.value;
    const zipCode = customerZipCodeInput.value.trim(); // Ensure this value is captured
    const industry = customerType === 'Individual' ? customerIndustryInput.value.trim() : customerIndustrySelect.value;
    const customerSince = customerSinceInput.value;
    const description = customerDescriptionInput.value.trim();
    const customerSource = customerSourceSelect.value; // NEW
    const customerActive = customerActiveSelect.value === 'Yes'; // NEW: Boolean

    // Basic client-side validation for mandatory fields
    const mandatoryFields = [
        { field: customerType, name: "Customer Type" },
        { field: email, name: "Email" },
        { field: phone, name: "Phone" },
        { field: customerSince, name: "Customer Since Date" }
    ];

    if (customerType === 'Individual') {
        mandatoryFields.push({ field: firstName, name: "First Name" });
        mandatoryFields.push({ field: lastName, name: "Last Name" });
    } else if (customerType === 'Company') {
        mandatoryFields.push({ field: companyName, name: "Company Name" });
    } else {
        showModal("Validation Error", "Please select a valid customer type.", () => {});
        return;
    }

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field) {
            missingFields.push(item.name);
        }
    });

    if (missingFields.length > 0) {
        showModal("Validation Error", `Please fill in all mandatory fields: ${[...new Set(missingFields)].join(', ')}.`, () => {});
        return;
    }

    // Call validateAddress with new zipCode and country parameters
    if (!validateAddress(address, city, country, zipCode, country)) {
        return; // Validation message already shown by validateAddress
    }

    const customerToSave = {
        customerType,
        firstName: customerType === 'Individual' ? firstName : '',
        lastName: customerType === 'Individual' ? lastName : '',
        companyName: customerType === 'Company' ? companyName : '',
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        country,
        industry,
        customerSince, // Stored asYYYY-MM-DD string from input type="date"
        description,
        source: customerSource, // NEW
        active: customerActive, // NEW
        ownerId: currentUserId, // Link customer to the current logged-in user (directly imported)
        updatedAt: new Date()
    };

    const existingCustomerDocId = customerForm.dataset.editingId;
    const collectionPath = getCustomerCollectionPath();

    try {
        if (existingCustomerDocId) {
            // Update existing customer
            const customerDocRef = doc(firestoreDb, collectionPath, existingCustomerDocId); // Use firestoreDb
            await setDoc(customerDocRef, { ...customerToSave, updatedAt: new Date() }, { merge: true }); // Ensure updatedAt is updated
            showModal("Success", "Customer updated successfully!", () => { });
            console.log("customers.js: Customer updated:", existingCustomerDocId);
        } else {
            // Add new customer
            // Let Firestore generate the document ID, and then add a human-readable customerId field
            const newDocRef = doc(collection(firestoreDb, collectionPath)); // Use firestoreDb
            const newCustomerId = `CUST-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            await setDoc(newDocRef, { ...customerToSave, customerId: newCustomerId, createdAt: new Date() });
            showModal("Success", `New Customer added successfully! ID: ${newCustomerId}`, () => { });
            console.log("customers.js: New Customer added with ID:", newCustomerId);
        }
        resetCustomerForm();
    }
    catch (error) {
        console.error("customers.js: Error saving customer:", error);
        showModal("Error", `Failed to save customer: ${error.message}`, () => { });
    }
}

/**
 * Deletes a customer record from Firestore.
 * @param {string} firestoreDocId - The Firestore document ID of the customer to delete.
 */
async function deleteCustomer(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !firestoreDb || !isDbReady) { // Use firestoreDb
        showModal("Permission Denied", "Please sign in to delete customers, or Firestore is not ready.", () => {});
        return;
    }

    const collectionPath = getCustomerCollectionPath();

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this customer? This action cannot be undone.",
        async () => {
            try {
                const customerDocRef = doc(firestoreDb, collectionPath, firestoreDocId); // Use firestoreDb
                await deleteDoc(customerDocRef);
                showModal("Success", "Customer deleted successfully!", () => {});
                console.log("customers.js: Customer deleted Firestore Doc ID:", firestoreDocId);
            }
            catch (error) {
                console.error("customers.js: Error deleting customer:", error);
                showModal("Error", `Failed to delete customer: ${error.message}`, () => {});
            }
        }
    );
}

/**
 * Sets up a real-time listener for customer data from Firestore.
 * Updates the UI and the `allCustomers` array whenever there are changes.
 */
export function listenForCustomers() {
    removeUnsubscribe('customers'); // Used directly imported function

    console.log("customers.js: listenForCustomers called.");
    console.log("customers.js: Current state for listener - isAuthReady:", isAuthReady, "currentUserId:", currentUserId, "firestoreDb:", firestoreDb, "isDbReady:", isDbReady);

    // --- IMPORTANT DEBUGGING CHECK ---
    // This check now uses the internal 'firestoreDb' variable
    if (!firestoreDb || typeof firestoreDb.collection !== 'function' || firestoreDb.type !== 'firestore') {
        console.error("customers.js: CRITICAL ERROR - 'firestoreDb' is NOT a valid Firestore instance at the point of calling collection(). Current firestoreDb value:", firestoreDb);
        if (customerList) customerList.innerHTML = '<p class="text-red-500 text-center py-4 col-span-full">Error: Firestore connection not ready. Please try refreshing.</p>';
        return;
    }
    // --- END IMPORTANT DEBUGGING CHECK ---

    if (!isAuthReady || !currentUserId || !firestoreDb || !isDbReady) { // Use firestoreDb
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing customers. Please wait or sign in...</p>';
        console.warn("customers.js: Customer listener skipped: Auth/DB not ready.");
        return;
    }

    const collectionPath = getCollectionPath('customers', 'public'); // Get path via utils.js
    
    // Defensive check to ensure collectionPath is valid
    if (typeof collectionPath !== 'string' || !collectionPath) { // Ensure it's a non-empty string
        console.error("customers.js: Collection path for customers is invalid (not a string or empty). Cannot set up listener. Path received:", collectionPath);
        if (customerList) customerList.innerHTML = '<p class="text-red-500 text-center py-4 col-span-full">Error: Could not determine customer data path.</p>';
        return;
    }

    // Add logging for collectionPath and firestoreDb right before the collection() call
    console.log("customers.js: DEBUG - collectionPath before collection():", collectionPath);
    console.log("customers.js: DEBUG - firestoreDb before collection():", firestoreDb);

    const q = collection(firestoreDb, collectionPath); // Use firestoreDb here

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (customerList) customerList.innerHTML = ''; // Clear current list
        // allCustomers is imported as a direct reference, so we push directly to it.
        allCustomers.length = 0; // Clear allCustomers array directly

        if (snapshot.empty) {
            if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No customers found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const customer = { id: doc.id, ...doc.data() };
            allCustomers.push(customer); // Populate the array for other modules
            displayCustomer(customer);
        });
        console.log("customers.js: Customers data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("customers.js: Error listening to customers:", error);
        if (customerList) customerList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading customers: ${error.message}</p>`;
    });

    addUnsubscribe('customers', unsubscribe); // Use directly imported function
}

/**
 * Fetches all customer data once. Used for populating dropdowns in other modules (e.g., opportunities).
 * This function is redundant if `listenForCustomers` is always active and populates `allCustomers`.
 * However, it's good to keep if a one-time fetch is needed without a listener.
 * In this setup, `allCustomers` is already kept up-to-date by the listener.
 * Re-directing to use the `allCustomers` array which is updated by the listener.
 */
export async function fetchCustomersForDropdown() {
    console.log("customers.js: fetchCustomersForDropdown called. Returning current allCustomers array.");
    return allCustomers; // Use allCustomers
}


/**
 * Displays a single customer record as a row in the UI grid.
 * @param {Object} customer - The customer object to display.
 */
function displayCustomer(customer) {
    if (!customerList) return;

    const customerRow = document.createElement('div');
    customerRow.className = 'data-grid-row';
    customerRow.dataset.id = customer.id;

    let displayName;
    if (customer.customerType === 'Individual') {
        displayName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    } else if (customer.customerType === 'Company') {
        displayName = customer.companyName || '';
    } else {
        displayName = 'N/A';
    }
    if (!displayName) displayName = customer.customerId;

    customerRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${customer.customerId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${displayName}</div>
        <div class="px-2 py-1 truncate">${customer.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.phone || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${customer.address || ''}, ${customer.city || ''}, ${customer.country || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${customer.industry || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${formatDate(customer.customerSince) || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.source || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.active ? 'Yes' : 'No'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${customer.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${customer.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    customerList.appendChild(customerRow);

    customerRow.querySelector('.edit-btn').addEventListener('click', () => editCustomer(customer));
    customerRow.querySelector('.delete-btn').addEventListener('click', () => deleteCustomer(customer.id));
}

/**
 * Populates the customer form with data from an existing customer object for editing.
 * @param {Object} customer - The customer object to load into the form.
 */
function editCustomer(customer) {
    // Permission check: Only owner or isAdmin can edit
    if (!isAdmin && customer.ownerId !== currentUserId) { // Used directly imported variables
        showModal("Permission Denied", "You do not have permission to edit this customer.", () => {});
        return;
    }

    if (customerFormTitle) customerFormTitle.textContent = `Edit Customer: ${customer.customerId}`;
    if (submitCustomerButton) submitCustomerButton.textContent = 'Update Customer';

    if (customerForm) customerForm.dataset.editingId = customer.id;

    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.remove('hidden');
    if (customerIdDisplay) customerIdDisplay.textContent = customer.customerId || 'N/A';

    if (customerTypeSelect) customerTypeSelect.value = customer.customerType || '';
    applyCustomerTypeValidation();

    if (customer.customerType === 'Individual') {
        if (customerFirstNameInput) customerFirstNameInput.value = customer.firstName || '';
        if (customerLastNameInput) customerLastNameInput.value = customer.lastName || '';
        if (customerIndustryInput) customerIndustryInput.value = customer.industry || '';
    } else if (customer.customerType === 'Company') {
        if (customerCompanyNameInput) customerCompanyNameInput.value = customer.companyName || '';
        if (customerIndustrySelect) customerIndustrySelect.value = customer.industry || '';
    }

    if (customerEmailInput) customerEmailInput.value = customer.email || '';
    if (customerPhoneInput) customerPhoneInput.value = customer.phone || '';
    if (customerAddressInput) customerAddressInput.value = customer.address || '';
    if (customerCityInput) customerCityInput.value = customer.city || '';
    if (customerZipCodeInput) customerZipCodeInput.value = customer.zipCode || '';
    if (customerDescriptionInput) customerDescriptionInput.value = customer.description || '';
    if (customerSinceInput) customerSinceInput.value = formatDate(customer.customerSince); // Format date for input type="date"

    if (customerSourceSelect) customerSourceSelect.value = customer.source || ''; // NEW
    if (customerActiveSelect) customerActiveSelect.value = customer.active ? 'Yes' : 'No'; // NEW

    // For country and state
    if (customerCountrySelect) {
        customerCountrySelect.value = customer.country || '';
        const event = new Event('change'); // Trigger change to populate states
        customerCountrySelect.dispatchEvent(event);
    }
    // Set state after states are populated by the above change event
    // Using a setTimeout to ensure states have time to populate (though usually not necessary with sync populateStates)
    setTimeout(() => {
        if (customerStateSelect) customerStateSelect.value = customer.state || '';
    }, 0);


    if (customerForm) customerForm.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Resets the customer form to its initial state (for adding a new customer).
 */
export function resetCustomerForm() {
    if (customerForm) customerForm.reset();
    if (customerForm) customerForm.dataset.editingId = '';

    if (customerFormTitle) customerFormTitle.textContent = 'Add New Customer';
    if (submitCustomerButton) submitCustomerButton.textContent = 'Add Customer';

    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.add('hidden');
    if (customerIdDisplay) customerIdDisplay.textContent = '';

    if (customerTypeSelect) customerTypeSelect.value = 'Individual'; // Default to Individual
    applyCustomerTypeValidation(); // Apply validation based on default type

    if (customerCountrySelect) customerCountrySelect.value = '';
    if (customerStateSelect) customerStateSelect.innerHTML = '<option value="">Select State/Province</option>';
    if (customerStateSelect) customerStateSelect.disabled = true;

    if (addressValidationMessage) addressValidationMessage.classList.add('hidden');

    // Enable submit button if auth is ready
    if (isAuthReady && currentUserId && firestoreDb && isDbReady) { // Use firestoreDb
        if (submitCustomerButton) submitCustomerButton.removeAttribute('disabled');
    } else {
        if (submitCustomerButton) submitCustomerButton.setAttribute('disabled', 'disabled');
    }
}
