import { db, auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe } from './main.js';
import { showModal, getCollectionPath } from './utils.js';
import { appCountries, appCountryStateMap, fetchCountryData } from './admin_data.js';

// IMPORTANT: Ensure 'getDocs' is imported here for fetching data
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// DOM elements for Customer Management Section - Declared globally but assigned in init
let customerManagementSection;
let customerForm;
let customerFormTitle;
let customerTypeSelect;
let individualFieldsDiv;
let customerFirstNameInput;
let customerLastNameInput;
let companyNameFieldDiv;
let customerCompanyNameInput;
let customerEmailInput;
let customerPhoneInput;
let customerCountrySelect;
let customerAddressInput;
let customerCityInput;
let customerStateSelect;
let customerZipCodeInput;
let addressValidationMessageDiv;
let individualIndustryGroupDiv;
let customerIndustryInput;
let companyIndustryGroupDiv;
let customerIndustrySelect;
let customerSourceSelect;
let customerActiveSelect;
let customerSinceInput;
let customerDescriptionInput;
let customerIdDisplayGroup;
let customerIdDisplay;
let submitCustomerButton;
let customerList;

let unsubscribeCustomers = null; // To store the onSnapshot unsubscribe function

// IMPORTANT: This array MUST be exported for other modules (like opportunities.js) to import it
export let allCustomers = [];

// Initialize Customers module elements and event listeners
export async function initCustomersModule() {
    console.log("customers.js: initCustomersModule called.");
    console.log("customers.js: initCustomersModule current state - db:", db, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId);

    // --- IMPORTANT: Assign ALL DOM elements here within the init function ---
    // This ensures they are retrieved when the section is actually being initialized
    // and the HTML elements should be present in the DOM.
    customerManagementSection = document.getElementById('customers-section');
    customerForm = document.getElementById('customerForm');
    customerFormTitle = document.getElementById('customerFormTitle');
    customerTypeSelect = document.getElementById('customerType'); // This is the element we are debugging
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
    addressValidationMessageDiv = document.getElementById('addressValidationMessage');
    individualIndustryGroupDiv = document.getElementById('individualIndustryGroup');
    customerIndustryInput = document.getElementById('customerIndustryInput');
    companyIndustryGroupDiv = document.getElementById('companyIndustryGroup');
    customerIndustrySelect = document.getElementById('customerIndustrySelect');
    customerSourceSelect = document.getElementById('customerSource');
    customerActiveSelect = document.getElementById('customerActive');
    customerSinceInput = document.getElementById('customerSince');
    customerDescriptionInput = document.getElementById('customerDescription');
    customerIdDisplayGroup = document.getElementById('customerIdDisplayGroup');
    customerIdDisplay = document.getElementById('customerIdDisplay');
    submitCustomerButton = document.getElementById('submitCustomerButton');
    customerList = document.getElementById('customerList');

    // --- IMMEDIATE DEBUGGING LOG for customerTypeSelect ---
    console.log("customers.js: Value of customerTypeSelect immediately after getElementById:", customerTypeSelect);

    // Add event listeners - with null checks for robustness
    if (customerTypeSelect) {
        customerTypeSelect.addEventListener('change', toggleCustomerTypeFields);
    } else {
        console.error("customers.js: ERROR: customerTypeSelect is null. Cannot attach change listener. Check index.html for ID 'customerType' within 'customers-section'.");
    }
    if (customerCountrySelect) {
        customerCountrySelect.addEventListener('change', populateStates);
    }
    if (customerForm) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCustomer();
        });
    }
    document.getElementById('resetCustomerFormButton')?.addEventListener('click', resetCustomerForm);


    // Ensure initial state and load data
    await fetchCountryData(); // Load country and state data first
    populateCountries();
    
    // Call toggleCustomerTypeFields only if customerTypeSelect is available
    if (customerTypeSelect) { 
        toggleCustomerTypeFields(); // Set initial visibility based on default customer type
    } else {
        console.warn("customers.js: Skipping initial toggleCustomerTypeFields call as customerTypeSelect is null.");
    }
    
    resetCustomerForm(); // This will call toggleCustomerTypeFields again, so null check is important inside it

    // Enable/disable submit button based on auth state
    if (isAuthReady && currentUserId) {
        if (submitCustomerButton) submitCustomerButton.removeAttribute('disabled');
        listenForCustomers(); // Start listening for customer data
    } else {
        if (submitCustomerButton) submitCustomerButton.setAttribute('disabled', 'disabled');
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Please sign in to view customers.</p>';
    }
}

// Determine the Firestore collection path for customers - NOW PUBLIC
function getCustomersCollectionPath() {
    // This now uses 'public' visibility for master data
    const path = getCollectionPath('public', 'customers');
    console.log("customers.js: getCustomersCollectionPath returning (PUBLIC):", path);
    return path;
}

/* --- CUSTOMER FORM LOGIC --- */

// Toggles visibility of individual vs. company fields
function toggleCustomerTypeFields() {
    // Defensive check
    if (!customerTypeSelect) {
        console.error("customers.js: toggleCustomerTypeFields called but customerTypeSelect is null. Cannot proceed.");
        return;
    }
    const isIndividual = customerTypeSelect.value === 'Individual';
    if (individualFieldsDiv) individualFieldsDiv.classList.toggle('hidden', !isIndividual);
    if (companyNameFieldDiv) companyNameFieldDiv.classList.toggle('hidden', isIndividual);
    if (individualIndustryGroupDiv) individualIndustryGroupDiv.classList.toggle('hidden', !isIndividual);
    if (companyIndustryGroupDiv) companyIndustryGroupDiv.classList.toggle('hidden', isIndividual);

    // Set required attributes based on visibility
    if (customerFirstNameInput) customerFirstNameInput.required = isIndividual;
    if (customerLastNameInput) customerLastNameInput.required = isIndividual;
    if (customerCompanyNameInput) customerCompanyNameInput.required = !isIndividual;
}

// Populates the country dropdown
function populateCountries() {
    if (!customerCountrySelect) return;
    customerCountrySelect.innerHTML = '<option value="">Select Country</option>';
    appCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        customerCountrySelect.appendChild(option);
    });
    populateStates(); // Also populate states when countries are loaded
}

// Populates the state/province dropdown based on selected country
function populateStates() {
    if (!customerStateSelect || !customerCountrySelect) return;
    const selectedCountryCode = customerCountrySelect.value;
    const states = appCountryStateMap[selectedCountryCode] || [];

    customerStateSelect.innerHTML = '<option value="">Select State/Province</option>';
    if (states.length > 0) {
        customerStateSelect.removeAttribute('disabled');
        states.forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            customerStateSelect.appendChild(option);
        });
    } else {
        customerStateSelect.setAttribute('disabled', 'disabled');
    }
}

/* --- CUSTOMER CRUD OPERATIONS --- */

// Save (Add/Update) a Customer
async function saveCustomer() {
    if (!isAuthReady || !currentUserId) {
        showModal("Permission Denied", "Please sign in to manage customers.", () => {});
        return;
    }
    if (!db) {
        console.error("customers.js: Firestore 'db' instance is not initialized. Cannot save customer.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    // Defensive check for customerTypeSelect before use
    if (!customerTypeSelect) {
        console.error("customers.js: saveCustomer called but customerTypeSelect is null. Cannot save.");
        showModal("Error", "Customer form is not fully loaded. Please refresh the page.", () => {});
        return;
    }

    const customerType = customerTypeSelect.value;
    const isIndividual = customerType === 'Individual';

    // Basic validation
    const mandatoryFields = [
        { field: customerEmailInput.value.trim(), name: "Email" },
        { field: customerPhoneInput.value.trim(), name: "Phone" },
        { field: customerCountrySelect.value, name: "Country" },
        { field: customerAddressInput.value.trim(), name: "Address" },
        { field: customerCityInput.value.trim(), name: "City" },
        { field: customerStateSelect.value, name: "State/Province" },
        { field: customerZipCodeInput.value.trim(), name: "Zip Code" },
        { field: customerSinceInput.value.trim(), name: "Customer Since Date" },
    ];

    if (isIndividual) {
        mandatoryFields.push(
            { field: customerFirstNameInput.value.trim(), name: "First Name" },
            { field: customerLastNameInput.value.trim(), name: "Last Name" }
        );
    } else {
        mandatoryFields.push(
            { field: customerCompanyNameInput.value.trim(), name: "Company Name" }
        );
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

    const customerData = {
        customerType: customerType,
        firstName: isIndividual ? customerFirstNameInput.value.trim() : '',
        lastName: isIndividual ? customerLastNameInput.value.trim() : '',
        companyName: isIndividual ? '' : customerCompanyNameInput.value.trim(),
        email: customerEmailInput.value.trim(),
        phone: customerPhoneInput.value.trim(),
        country: customerCountrySelect.value,
        address: customerAddressInput.value.trim(),
        city: customerCityInput.value.trim(),
        state: customerStateSelect.value,
        zipCode: customerZipCodeInput.value.trim(),
        industry: isIndividual ? customerIndustryInput.value.trim() : customerIndustrySelect.value.trim(),
        customerSource: customerSourceSelect.value,
        isActive: customerActiveSelect.value === 'Yes',
        customerSince: customerSinceInput.value, // ISO-MM-DD
        description: customerDescriptionInput.value.trim(),
        ownerId: currentUserId, // Store the creator's UID
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const editingId = customerForm.dataset.editingId;
    const collectionPath = getCustomersCollectionPath();

    try {
        if (editingId) {
            // Update existing customer
            const customerDocRef = doc(db, collectionPath, editingId);
            await setDoc(customerDocRef, customerData, { merge: true });
            showModal("Success", "Customer updated successfully!", () => {});
            console.log("Customer updated:", editingId);
        } else {
            // Add new customer
            const newDocRef = doc(collection(db, collectionPath)); // Let Firestore generate ID
            const systemGeneratedId = `CUST-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            await setDoc(newDocRef, { ...customerData, customerId: systemGeneratedId });
            showModal("Success", "New Customer added successfully!", () => {});
            console.log("New Customer added with system-generated ID:", systemGeneratedId);
        }
        resetCustomerForm();
    } catch (error) {
        console.error("Error saving customer:", error);
        showModal("Error", `Failed to save customer: ${error.message}`, () => {});
    }
}

// Delete a Customer
async function deleteCustomer(firestoreDocId) {
    if (!isAuthReady || !currentUserId) {
        showModal("Permission Denied", "Please sign in to manage customers.", () => {});
        return;
    }
    if (!db) {
        console.error("customers.js: Firestore 'db' instance is not initialized. Cannot delete customer.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const collectionPath = getCustomersCollectionPath();

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this customer? This action cannot be undone.",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                showModal("Success", "Customer deleted successfully!", () => {});
                console.log("Customer deleted Firestore Doc ID:", firestoreDocId);
            } catch (error) {
                console.error("Error deleting customer:", error);
                showModal("Error", `Failed to delete customer: ${error.message}`, () => {});
            }
        }
    );
}

// Listen for real-time updates to Customers
export function listenForCustomers() {
    if (unsubscribeCustomers) {
        unsubscribeCustomers(); // Unsubscribe from previous listener
    }

    if (!isAuthReady || !currentUserId) {
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Please sign in to view customers.</p>';
        return;
    }
    if (!db) {
        console.error("customers.js: Firestore 'db' instance is not initialized. Cannot listen for customers.");
        if (customerList) customerList.innerHTML = '<p class="text-red-500 text-center py-4 col-span-full">Firestore not ready to load customers.</p>';
        return;
    }

    const collectionPath = getCustomersCollectionPath();
    const q = collection(db, collectionPath);

    unsubscribeCustomers = onSnapshot(q, (snapshot) => {
        if (customerList) customerList.innerHTML = ''; // Clear current list
        allCustomers = []; // Clear and repopulate allCustomers array
        if (snapshot.empty) {
            if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No customers found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const customer = { id: doc.id, ...doc.data() };
            allCustomers.push(customer); // Populate global allCustomers array
            displayCustomer(customer);
        });
        console.log("Customers data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("Error listening to customers:", error);
        if (customerList) customerList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading customers: ${error.message}</p>`;
    });

    addUnsubscribe('customers', unsubscribeCustomers); // Register with main.js's central tracker
}

// IMPORTANT: This function MUST be exported for other modules (e.g., opportunities.js) to import it
export async function fetchCustomersForDropdown() {
    // This function can be used by other modules to get a snapshot of customer data
    // It's not a real-time listener, just a one-time fetch.
    if (!db || !currentUserId) {
        console.warn("customers.js: Firestore 'db' instance or currentUserId not available for fetchCustomersForDropdown.");
        return [];
    }
    try {
        const collectionPath = getCustomersCollectionPath(); // Get the path again here
        console.log("customers.js: fetchCustomersForDropdown is querying path:", collectionPath);
        const querySnapshot = await getDocs(collection(db, collectionPath));
        const customers = [];
        querySnapshot.forEach((doc) => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        console.log("customers.js: Fetched customers for dropdown. Total:", customers.length);
        return customers;
    } catch (error) {
        console.error("customers.js: Error fetching customers for dropdown:", error);
        return [];
    }
}


// Display a single customer in the UI as a grid row
function displayCustomer(customer) {
    if (!customerList) return; // Defensive check

    const customerRow = document.createElement('div');
    customerRow.className = 'data-grid-row';
    customerRow.dataset.id = customer.id;

    // Determine name to display based on customer type
    const displayName = customer.customerType === 'Individual'
        ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
        : customer.companyName || 'N/A';

    // Construct full address for display
    const fullAddress = `${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''}, ${customer.zipCode || ''}, ${customer.country || ''}`.replace(/,(\s*,)+/g, ', ').trim();


    customerRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${customer.customerId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${displayName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${customer.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.phone || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${fullAddress || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${customer.industry || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${customer.customerSince || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.customerSource || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.isActive ? 'Yes' : 'No'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${customer.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
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

// Populate form for editing a customer
function editCustomer(customer) {
    if (!isAuthReady || !currentUserId) {
        showModal("Permission Denied", "Please sign in to edit customers.", () => {});
        return;
    }

    if (customerFormTitle) customerFormTitle.textContent = 'Edit Customer';
    if (submitCustomerButton) submitCustomerButton.textContent = 'Update Customer';

    // Set dataset.editingId to Firestore document ID
    if (customerForm) customerForm.dataset.editingId = customer.id;

    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.remove('hidden');
    if (customerIdDisplay) customerIdDisplay.textContent = customer.customerId || 'N/A'; // Use customerId field

    if (customerTypeSelect) customerTypeSelect.value = customer.customerType || 'Individual';
    toggleCustomerTypeFields(); // Adjust fields based on type

    if (customerFirstNameInput) customerFirstNameInput.value = customer.firstName || '';
    if (customerLastNameInput) customerLastNameInput.value = customer.lastName || '';
    if (customerCompanyNameInput) customerCompanyNameInput.value = customer.companyName || '';
    if (customerEmailInput) customerEmailInput.value = customer.email || '';
    if (customerPhoneInput) customerPhoneInput.value = customer.phone || '';
    if (customerAddressInput) customerAddressInput.value = customer.address || '';
    if (customerCityInput) customerCityInput.value = customer.city || '';
    if (customerZipCodeInput) customerZipCodeInput.value = customer.zipCode || '';
    if (customerSinceInput) customerSinceInput.value = customer.customerSince || '';
    if (customerDescriptionInput) customerDescriptionInput.value = customer.description || '';

    // Industry fields
    if (customer.customerType === 'Individual') {
        if (customerIndustryInput) customerIndustryInput.value = customer.industry || '';
    } else {
        if (customerIndustrySelect) customerIndustrySelect.value = customer.industry || '';
    }

    // Populate Customer Source and Active
    if (customerSourceSelect) customerSourceSelect.value = customer.customerSource || '';
    // isActive is a boolean, convert to 'Yes'/'No' for dropdown
    if (customerActiveSelect) customerActiveSelect.value = customer.isActive ? 'Yes' : 'No';

    // Populate country and state dropdowns
    if (customerCountrySelect) customerCountrySelect.value = customer.country || '';
    populateStates(); // This will enable/disable state select and fill options
    if (customerStateSelect) customerStateSelect.value = customer.state || '';

    if (customerForm) customerForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Customer form function
export function resetCustomerForm() {
    if (customerForm) customerForm.reset();
    if (customerForm) customerForm.dataset.editingId = ''; // Clear editing ID
    if (customerFormTitle) customerFormTitle.textContent = 'Add New Customer';
    if (submitCustomerButton) submitCustomerButton.textContent = 'Add Customer';

    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.add('hidden'); // Hide ID display
    if (customerIdDisplay) customerIdDisplay.textContent = '';

    // Defensive check before setting value
    if (customerTypeSelect) customerTypeSelect.value = 'Individual'; // Reset to default
    toggleCustomerTypeFields(); // Update field visibility

    // Reset specific fields to default or empty
    if (customerCountrySelect) customerCountrySelect.value = '';
    populateStates(); // Clear states and disable select
    if (customerStateSelect) customerStateSelect.value = '';

    // Reset Customer Source and Active
    if (customerSourceSelect) customerSourceSelect.value = ''; // Or a default like 'Website'
    if (customerActiveSelect) customerActiveSelect.value = 'Yes'; // Default to 'Yes'

    // Reset industry selects
    if (customerIndustryInput) customerIndustryInput.value = '';
    if (customerIndustrySelect) customerIndustrySelect.value = '';

    if (addressValidationMessageDiv) addressValidationMessageDiv.classList.add('hidden');

    // Ensure submit button is enabled if auth is ready (assuming it's checked in initCustomersModule)
    if (isAuthReady && currentUserId) {
        if (submitCustomerButton) submitCustomerButton.removeAttribute('disabled');
    } else {
        if (submitCustomerButton) submitCustomerButton.setAttribute('disabled', 'disabled');
    }
}
