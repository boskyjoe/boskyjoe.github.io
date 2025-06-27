import { db, auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe, appCountries, appCountryStateMap, fetchCountryData } from './main.js'; // Import necessary exports from main.js
import { showModal, getCollectionPath } from './utils.js'; // Import utility functions

import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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

export let allCustomers = []; // Exported to be used by other modules like opportunities.js

let unsubscribeCustomers = null; // To store the onSnapshot unsubscribe function

/**
 * Initializes the Customers module, setting up DOM references, event listeners,
 * and starting data listeners if authentication is ready.
 */
export async function initCustomersModule() {
    console.log("customers.js: initCustomersModule called.");
    console.log("customers.js: initCustomersModule current state - db:", db, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId);

    // Initialize DOM elements if they haven't been already
    // This ensures elements are available before listeners or data operations
    if (!customersManagementSection) {
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
        customerZipCodeInput = document.getElementById('customerZipCode');
        addressValidationMessage = document.getElementById('addressValidationMessage');

        individualIndustryGroup = document.getElementById('individualIndustryGroup');
        customerIndustryInput = document.getElementById('customerIndustryInput');
        companyIndustryGroup = document.getElementById('companyIndustryGroup');
        customerIndustrySelect = document.getElementById('customerIndustrySelect');

        customerSinceInput = document.getElementById('customerSince');
        customerDescriptionInput = document.getElementById('customerDescription');
        submitCustomerButton = document.getElementById('submitCustomerButton');
        customerList = document.getElementById('customerList');

        // Add event listeners once
        if (customerForm) {
            customerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveCustomer(); // Call saveCustomer with current form data
            });
        }
        document.getElementById('resetCustomerFormButton')?.addEventListener('click', resetCustomerForm);

        if (customerTypeSelect) {
            customerTypeSelect.addEventListener('change', applyCustomerTypeValidation);
            // Initial call to set up fields based on default/pre-selected type
            applyCustomerTypeValidation();
        }

        if (customerCountrySelect) {
            customerCountrySelect.addEventListener('change', (e) => populateStates(e.target.value));
        }
    }

    // Load data specific to this module ONLY if auth and DB are ready
    if (isAuthReady && currentUserId && db) { // Ensure db is also checked here
        if (submitCustomerButton) submitCustomerButton.removeAttribute('disabled');
        await fetchCountryData(); // Load country data before populating dropdowns
        populateCountries();
        listenForCustomers();
        resetCustomerForm();
    } else {
        if (submitCustomerButton) submitCustomerButton.setAttribute('disabled', 'disabled');
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Please sign in to view customers.</p>';
        console.warn("customers.js: Authentication or Firestore DB not ready. Customers module not fully initialized.");
    }
}

/**
 * Determines the Firestore collection path for customers.
 * Customers are currently set to 'public' as per requirements.
 */
function getCustomerCollectionPath() {
    // Uses the getCollectionPath from utils.js, passing main's currentCustomerCollectionType
    return getCollectionPath('public', 'customers');
}


/* --- CUSTOMERS CRUD OPERATIONS --- */

/**
 * Populates the country dropdown select element from the globally available `appCountries` array.
 */
function populateCountries() {
    if (!customerCountrySelect) return;
    customerCountrySelect.innerHTML = '<option value="">Select Country</option>';
    appCountries.forEach(country => {
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
    const states = appCountryStateMap[countryCode] || [];
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        customerStateSelect.appendChild(option);
    });
    // If no states, disable the dropdown
    customerStateSelect.disabled = states.length === 0;
    console.log(`customers.js: States populated for ${countryCode}.`);
}

/**
 * Placeholder for address validation. In a real app, this would call an external API.
 * @param {string} address
 * @param {string} city
 * @param {string} state
 * @param {string} zipCode
 * @param {string} country
 * @returns {boolean} True if address is considered valid (currently always true).
 */
function validateAddress(address, city, state, zipCode, country) {
    // In a real application, you would integrate with a geo-coding or address validation API here.
    // For now, we'll consider it valid if basic fields are not empty.
    const isValid = address.trim() !== '' && city.trim() !== '' && country.trim() !== '';

    if (!isValid && addressValidationMessage) {
        addressValidationMessage.textContent = 'Please enter a valid address, city, and select a country.';
        addressValidationMessage.classList.remove('hidden');
        return false;
    } else if (addressValidationMessage) {
        addressValidationMessage.classList.add('hidden');
    }
    return true;
}

/**
 * Applies validation rules and shows/hides fields based on the selected customer type.
 */
function applyCustomerTypeValidation() {
    if (!customerTypeSelect || !individualFieldsDiv || !companyNameFieldDiv) return;

    const customerType = customerTypeSelect.value;

    if (customerType === 'Individual') {
        individualFieldsDiv.classList.remove('hidden');
        companyNameFieldDiv.classList.add('hidden');
        individualIndustryGroup.classList.remove('hidden'); // Show individual industry
        companyIndustryGroup.classList.add('hidden'); // Hide company industry

        customerFirstNameInput.setAttribute('required', 'required');
        customerLastNameInput.setAttribute('required', 'required');
        customerCompanyNameInput.removeAttribute('required');

    } else if (customerType === 'Company') {
        individualFieldsDiv.classList.add('hidden');
        companyNameFieldDiv.classList.remove('hidden');
        individualIndustryGroup.classList.add('hidden'); // Hide individual industry
        companyIndustryGroup.classList.remove('hidden'); // Show company industry

        customerFirstNameInput.removeAttribute('required');
        customerLastNameInput.removeAttribute('required');
        customerCompanyNameInput.setAttribute('required', 'required');
    } else { // "Select Type" or other invalid selection
        individualFieldsDiv.classList.add('hidden');
        companyNameFieldDiv.classList.add('hidden');
        individualIndustryGroup.classList.add('hidden');
        companyIndustryGroup.classList.add('hidden');

        customerFirstNameInput.removeAttribute('required');
        customerLastNameInput.removeAttribute('required');
        customerCompanyNameInput.removeAttribute('required');
    }
    console.log(`customers.js: Customer type validation applied for: ${customerType}.`);
}

/**
 * Saves (adds or updates) a customer record in Firestore.
 * @param {Object} customerData - The data for the customer to save. If not provided, reads from form.
 * @param {string} [existingCustomerDocId=null] - The Firestore document ID if updating an existing customer.
 */
async function saveCustomer(customerData, existingCustomerDocId = null) {
    if (!isAuthReady || !currentUserId || !db) { // Ensure db is ready
        showModal("Permission Denied", "Please sign in to manage customers, or Firestore is not ready.", () => {});
        return;
    }

    let customerToSave;
    if (customerData) {
        customerToSave = customerData;
    } else {
        // Read from form if no data provided (e.g., from direct form submission)
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
        const zipCode = customerZipCodeInput.value.trim();
        const industry = customerType === 'Individual' ? customerIndustryInput.value.trim() : customerIndustrySelect.value;
        const customerSince = customerSinceInput.value;
        const description = customerDescriptionInput.value.trim();


        // Basic client-side validation for mandatory fields
        const mandatoryFields = [
            { field: customerType, name: "Customer Type" },
            { field: email, name: "Email" },
            { field: phone, name: "Phone" }
        ];

        if (customerType === 'Individual') {
            mandatoryFields.push({ field: firstName, name: "First Name" });
            mandatoryFields.push({ field: lastName, name: "Last Name" });
        } else if (customerType === 'Company') {
            mandatoryFields.push({ field: companyName, name: "Company Name" });
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

        if (!validateAddress(address, city, state, zipCode, country)) {
            return; // Validation message already shown by validateAddress
        }


        customerToSave = {
            customerType,
            firstName: customerType === 'Individual' ? firstName : '', // Only save if individual
            lastName: customerType === 'Individual' ? lastName : '',   // Only save if individual
            companyName: customerType === 'Company' ? companyName : '', // Only save if company
            email,
            phone,
            address,
            city,
            state,
            zipCode,
            country,
            industry,
            customerSince,
            description,
            ownerId: currentUserId, // Link customer to the current logged-in user
            createdAt: new Date(),
            updatedAt: new Date()
        };
        existingCustomerDocId = customerForm.dataset.editingId; // Get ID from form if editing
    }


    const collectionPath = getCustomerCollectionPath();

    try {
        if (existingCustomerDocId) {
            // Update existing customer
            const customerDocRef = doc(db, collectionPath, existingCustomerDocId);
            await setDoc(customerDocRef, customerToSave, { merge: true }); // Use setDoc with merge to avoid overwriting entire document
            showModal("Success", "Customer updated successfully!", () => { });
            console.log("customers.js: Customer updated:", existingCustomerDocId);
        } else {
            // Add new customer
            const newDocRef = doc(collection(db, collectionPath)); // Let Firestore generate ID
            // Generate a simple customer ID for display/search
            const customerId = `CUST-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            await setDoc(newDocRef, { ...customerToSave, customerId: customerId });
            showModal("Success", "New Customer added successfully!", () => { });
            console.log("customers.js: New Customer added with ID:", customerId);
        }
        resetCustomerForm();
    } catch (error) {
        console.error("customers.js: Error saving customer:", error);
        showModal("Error", `Failed to save customer: ${error.message}`, () => { });
    }
}

/**
 * Deletes a customer record from Firestore.
 * @param {string} firestoreDocId - The Firestore document ID of the customer to delete.
 */
async function deleteCustomer(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !db) { // Ensure db is ready
        showModal("Permission Denied", "Please sign in to delete customers, or Firestore is not ready.", () => {});
        return;
    }

    const collectionPath = getCustomerCollectionPath();

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this customer? This action cannot be undone.",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                showModal("Success", "Customer deleted successfully!", () => {});
                console.log("customers.js: Customer deleted Firestore Doc ID:", firestoreDocId);
            } catch (error) {
                console.error("customers.js: Error deleting customer:", error);
                showModal("Error", `Failed to delete customer: ${error.message}`, () => {});
            }
        }
    );
}

/**
 * Sets up a real-time listener for customer data from Firestore.
 * Updates the UI whenever there are changes.
 */
export function listenForCustomers() {
    if (unsubscribeCustomers) {
        removeUnsubscribe('customers'); // Use centralized remove function from main.js
    }

    if (!isAuthReady || !currentUserId || !db) { // Ensure db is ready
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Please sign in to view customers.</p>';
        return;
    }

    const collectionPath = getCustomerCollectionPath();
    const q = collection(db, collectionPath); // Reference to the collection

    unsubscribeCustomers = onSnapshot(q, (snapshot) => {
        if (customerList) customerList.innerHTML = ''; // Clear current list
        allCustomers = []; // Clear the global array
        if (snapshot.empty) {
            if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No customers found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const customer = { id: doc.id, ...doc.data() };
            allCustomers.push(customer); // Populate the global array
            displayCustomer(customer);
        });
        console.log("customers.js: Customers data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("customers.js: Error listening to customers:", error);
        if (customerList) customerList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading customers: ${error.message}</p>`;
    });

    addUnsubscribe('customers', unsubscribeCustomers); // Register with main.js's central tracker
}

/**
 * Fetches all customer data once. Used for populating dropdowns in other modules (e.g., opportunities).
 * @returns {Array<Object>} An array of customer objects.
 */
export async function fetchCustomersForDropdown() {
    if (!isAuthReady || !currentUserId || !db) { // Ensure db is ready
        console.warn("customers.js: Authentication or Firestore DB not ready. Cannot fetch customers for dropdown.");
        return [];
    }

    const collectionPath = getCustomerCollectionPath();
    const customersCollectionRef = collection(db, collectionPath);

    try {
        const querySnapshot = await getDocs(customersCollectionRef);
        allCustomers = []; // Clear existing data
        querySnapshot.forEach((docSnap) => {
            allCustomers.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log("customers.js: Customers data fetched for dropdown. Total:", allCustomers.length);
        return allCustomers;
    } catch (error) {
        console.error("customers.js: Error fetching customers for dropdown:", error);
        return [];
    }
}


/**
 * Displays a single customer record as a row in the UI grid.
 * @param {Object} customer - The customer object to display.
 */
function displayCustomer(customer) {
    if (!customerList) return; // Defensive check

    const customerRow = document.createElement('div');
    customerRow.className = 'data-grid-row'; // Tailwind grid classes applied by parent
    customerRow.dataset.id = customer.id; // Store Firestore Document ID

    // Determine name to display
    let displayName;
    if (customer.customerType === 'Individual') {
        displayName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    } else if (customer.customerType === 'Company') {
        displayName = customer.companyName || '';
    } else {
        displayName = 'N/A';
    }
    if (!displayName) displayName = customer.customerId; // Fallback if name fields are empty

    customerRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${customer.customerId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${displayName}</div>
        <div class="px-2 py-1 truncate">${customer.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${customer.phone || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.customerType || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${customer.city || 'N/A'}, ${customer.country || 'N/A'}</div>
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

    // Add event listeners to the new buttons
    customerRow.querySelector('.edit-btn').addEventListener('click', () => editCustomer(customer));
    customerRow.querySelector('.delete-btn').addEventListener('click', () => deleteCustomer(customer.id));
}

/**
 * Populates the customer form with data from an existing customer object for editing.
 * @param {Object} customer - The customer object to load into the form.
 */
function editCustomer(customer) {
    if (!isAdmin && customer.ownerId !== currentUserId) { // Only owner or admin can edit
        showModal("Permission Denied", "You do not have permission to edit this customer.", () => {});
        return;
    }

    if (customerFormTitle) customerFormTitle.textContent = `Edit Customer: ${customer.customerId}`;
    if (submitCustomerButton) submitCustomerButton.textContent = 'Update Customer';

    // Store the Firestore document ID in a data attribute on the form itself
    if (customerForm) customerForm.dataset.editingId = customer.id;

    // Show Customer ID display group
    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.remove('hidden');
    if (customerIdDisplay) customerIdDisplay.textContent = customer.customerId || 'N/A';

    // Populate form fields
    if (customerTypeSelect) customerTypeSelect.value = customer.customerType || '';
    applyCustomerTypeValidation(); // Re-apply validation based on selected type

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
    if (customerSinceInput) customerSinceInput.value = customer.customerSince || ''; // Date input value needs YYYY-MM-DD

    // For country and state, populate countries first, then set selected country, then populate states
    if (customerCountrySelect) {
        customerCountrySelect.value = customer.country || '';
        // Manually trigger change event to populate states
        const event = new Event('change');
        customerCountrySelect.dispatchEvent(event);
    }
    if (customerStateSelect) customerStateSelect.value = customer.state || '';


    // Scroll to the form
    if (customerForm) customerForm.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Resets the customer form to its initial state (for adding a new customer).
 */
export function resetCustomerForm() {
    if (customerForm) customerForm.reset();
    if (customerForm) customerForm.dataset.editingId = ''; // Clear editing ID
    if (customerFormTitle) customerFormTitle.textContent = 'Add New Customer';
    if (submitCustomerButton) submitCustomerButton.textContent = 'Add Customer';

    // Hide Customer ID display group
    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.add('hidden');
    if (customerIdDisplay) customerIdDisplay.textContent = '';

    // Reset customer type and re-apply validation to hide fields
    if (customerTypeSelect) customerTypeSelect.value = ''; // Reset to default 'Select Type'
    applyCustomerTypeValidation();

    // Reset country and state dropdowns manually
    if (customerCountrySelect) customerCountrySelect.value = '';
    if (customerStateSelect) customerStateSelect.innerHTML = '<option value="">Select State/Province</option>';
    if (customerStateSelect) customerStateSelect.disabled = true;

    // Hide any address validation message
    if (addressValidationMessage) addressValidationMessage.classList.add('hidden');

    // Ensure submit button is enabled if auth is ready
    if (isAuthReady && currentUserId) {
        if (submitCustomerButton) submitCustomerButton.removeAttribute('disabled');
    } else {
        if (submitCustomerButton) submitCustomerButton.setAttribute('disabled', 'disabled');
    }
}
