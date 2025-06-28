import { auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe, appCountries, appCountryStateMap, allCustomers, fetchCountryData, fetchCurrencies, allCurrencies, appId as mainAppId } from './main.js';
import { showModal, showMessage, hideMessage } from './utils.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variable to hold the Firestore DB instance, explicitly set by main.js
let firestoreDb = null;
// Use the projectId exported from main.js directly. This should be the most reliable source.
let projectId = mainAppId;
let customersDomElementsInitialized = false; // Flag to ensure DOM elements are initialized only once

// EXPORTED: Setter function for the Firestore DB instance
export function setDbInstance(instance) {
    console.log("customers.js: setDbInstance received:", instance);
    firestoreDb = instance; // Directly assign for robust assignment
    if (firestoreDb) {
        console.log("customers.js: Firestore DB instance successfully set. projectId:", projectId);
    } else {
        console.error("customers.js: CRITICAL ERROR: Firestore DB instance is still null after direct assignment. This means the 'instance' passed was null/undefined.");
        projectId = null;
    }
}

// DOM elements for customers.js
let customersSection;
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
let customerList;
let resetCustomerFormButton;

/**
 * Initializes DOM elements and static event listeners for customers module.
 * This should be called once, defensively.
 */
function initializeCustomersDomElements() {
    if (customersDomElementsInitialized) return; // Already initialized

    customersSection = document.getElementById('customers-section');
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
    resetCustomerFormButton = document.getElementById('resetCustomerFormButton');

    // Add static event listeners
    if (customerForm) {
        customerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCustomer();
        });
    }
    if (resetCustomerFormButton) {
        resetCustomerFormButton.addEventListener('click', resetCustomerForm);
    }
    if (customerTypeSelect) {
        customerTypeSelect.addEventListener('change', toggleCustomerTypeFields);
    }
    if (customerCountrySelect) {
        customerCountrySelect.addEventListener('change', populateStateDropdown);
    }

    customersDomElementsInitialized = true;
    console.log("customers.js: DOM elements and static event listeners initialized.");
}


/**
 * Main initialization function for the Customers module.
 */
export async function initCustomersModule() {
    console.log("customers.js: initCustomersModule called.");
    initializeCustomersDomElements(); // Ensure DOM elements are ready

    // CRITICAL: Ensure firestoreDb and projectId are available before proceeding
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        console.warn("customers.js: Firestore DB, Project ID, or Auth is not ready. Cannot initialize Customers module fully.");
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing... Waiting for database connection and user authentication.</p>';
        disableCustomerForm(); // Disable form if not ready
        return;
    }
    enableCustomerForm(); // Enable form if ready

    // Fetch country/currency data which is needed for dropdowns
    // These will update main.js's global arrays which this module uses.
    await fetchCountryData(); // This is a main.js export that calls admin_data.js's fetch
    await fetchCurrencies(); // This is a main.js export that calls admin_data.js's fetch

    populateCountryDropdown(); // Populate country dropdown
    populateStateDropdown(); // Populate state dropdown initially (will be empty without country selection)

    listenForCustomers(); // Start listening for customer list changes
    resetCustomerForm(); // Reset form to initial state
}

function disableCustomerForm() {
    customerForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    if (submitCustomerButton) submitCustomerButton.textContent = 'Auth/DB Not Ready';
}

function enableCustomerForm() {
    customerForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    if (submitCustomerButton) submitCustomerButton.textContent = 'Add Customer';
}

function toggleCustomerTypeFields() {
    if (customerTypeSelect?.value === 'Individual') {
        individualFieldsDiv?.classList.remove('hidden');
        companyNameFieldDiv?.classList.add('hidden');
        individualIndustryGroup?.classList.remove('hidden');
        companyIndustryGroup?.classList.add('hidden');
        customerFirstNameInput?.setAttribute('required', 'required');
        customerLastNameInput?.setAttribute('required', 'required');
        customerCompanyNameInput?.removeAttribute('required');
        customerIndustryInput?.setAttribute('required', 'required');
        customerIndustrySelect?.removeAttribute('required');
    } else {
        individualFieldsDiv?.classList.add('hidden');
        companyNameFieldDiv?.classList.remove('hidden');
        individualIndustryGroup?.classList.add('hidden');
        companyIndustryGroup?.classList.remove('hidden');
        customerFirstNameInput?.removeAttribute('required');
        customerLastNameInput?.removeAttribute('required');
        customerCompanyNameInput?.setAttribute('required', 'required');
        customerIndustryInput?.removeAttribute('required');
        customerIndustrySelect?.setAttribute('required', 'required');
    }
}

function populateCountryDropdown() {
    if (!customerCountrySelect) return;
    customerCountrySelect.innerHTML = '<option value="">Select Country</option>';
    if (appCountries && appCountries.length > 0) {
        appCountries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = country.name;
            customerCountrySelect.appendChild(option);
        });
    }
}

function populateStateDropdown() {
    if (!customerCountrySelect || !customerStateSelect) return;
    const selectedCountryCode = customerCountrySelect.value;
    customerStateSelect.innerHTML = '<option value="">Select State/Province</option>';
    customerStateSelect.disabled = true; // Disable by default

    if (selectedCountryCode && appCountryStateMap[selectedCountryCode] && appCountryStateMap[selectedCountryCode].length > 0) {
        appCountryStateMap[selectedCountryCode].forEach(state => {
            const option = document.createElement('option');
            option.value = state;
            option.textContent = state;
            customerStateSelect.appendChild(option);
        });
        customerStateSelect.disabled = false;
    }
}

/* --- CUSTOMER CRUD OPERATIONS --- */
async function saveCustomer() {
    console.log("customers.js: saveCustomer called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        showModal("Error", "Authentication or Database not ready. Please sign in or wait.", () => {});
        return;
    }

    // Basic validation
    if (!customerEmailInput?.value || !customerPhoneInput?.value ||
        !customerCountrySelect?.value || !customerAddressInput?.value ||
        !customerCityInput?.value || !customerStateSelect?.value || !customerZipCodeInput?.value ||
        !customerSinceInput?.value) {
        showMessage('Please fill in all required fields.', 'error', customerForm);
        return;
    }

    if (customerTypeSelect.value === 'Individual' && (!customerFirstNameInput?.value || !customerLastNameInput?.value || !customerIndustryInput?.value)) {
        showMessage('Please fill in all required fields for individual customer type.', 'error', customerForm);
        return;
    }
    if (customerTypeSelect.value === 'Company' && (!customerCompanyNameInput?.value || !customerIndustrySelect?.value)) {
        showMessage('Please fill in all required fields for company customer type.', 'error', customerForm);
        return;
    }

    submitCustomerButton.disabled = true;
    submitCustomerButton.textContent = 'Saving...';
    hideMessage(customerForm);

    const isEditing = !!customerForm.dataset.editingId;
    let customerDocId = customerForm.dataset.editingId;

    const customerData = {
        customerType: customerTypeSelect.value,
        firstName: customerTypeSelect.value === 'Individual' ? customerFirstNameInput.value : '',
        lastName: customerTypeSelect.value === 'Individual' ? customerLastNameInput.value : '',
        companyName: customerTypeSelect.value === 'Company' ? customerCompanyNameInput.value : '',
        email: customerEmailInput.value,
        phone: customerPhoneInput.value,
        country: customerCountrySelect.value,
        address: customerAddressInput.value,
        city: customerCityInput.value,
        state: customerStateSelect.value,
        zipCode: customerZipCodeInput.value,
        industry: customerTypeSelect.value === 'Individual' ? customerIndustryInput.value : customerIndustrySelect.value,
        customerSource: document.getElementById('customerSource').value, // NEW field
        active: document.getElementById('customerActive').value === 'Yes', // NEW field
        customerSince: customerSinceInput.value,
        description: customerDescriptionInput.value,
        lastModified: new Date().toISOString(),
        createdBy: currentUserId,
        // Only set creationDate on initial creation
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        const customerCollectionRef = collection(firestoreDb, `artifacts/${projectId}/public/data/customers`);
        if (isEditing) {
            const docRef = doc(customerCollectionRef, customerDocId);
            await setDoc(docRef, customerData, { merge: true });
            showMessage('Customer updated successfully!', 'success', customerForm);
            console.log("customers.js: Customer updated:", customerDocId, customerData);
        } else {
            const newDocRef = await addDoc(customerCollectionRef, customerData);
            customerDocId = newDocRef.id; // Get the ID of the newly added document
            showMessage('Customer added successfully!', 'success', customerForm);
            console.log("customers.js: Customer added with ID:", customerDocId, customerData);
        }
        resetCustomerForm();
    } catch (error) {
        console.error("customers.js: Error saving customer:", error);
        showMessage(`Error saving customer: ${error.message}`, 'error', customerForm);
    } finally {
        submitCustomerButton.disabled = false;
        submitCustomerButton.textContent = isEditing ? 'Update Customer' : 'Add Customer';
    }
}

async function editCustomer(customerId) {
    console.log("customers.js: editCustomer called for ID:", customerId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        showModal("Error", "Authentication or Database not ready. Please sign in or wait.", () => {});
        return;
    }

    hideMessage(customerForm); // Clear any previous form messages
    customerFormTitle.textContent = "Edit Customer";
    submitCustomerButton.textContent = "Update Customer";
    customerIdDisplayGroup.classList.remove('hidden');
    customerIdDisplay.textContent = customerId;
    customerForm.dataset.editingId = customerId; // Store the ID in the form for updates

    const docRef = doc(firestoreDb, `artifacts/${projectId}/public/data/customers`, customerId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            customerTypeSelect.value = data.customerType || 'Individual';
            toggleCustomerTypeFields(); // Adjust form fields based on type
            customerFirstNameInput.value = data.firstName || '';
            customerLastNameInput.value = data.lastName || '';
            customerCompanyNameInput.value = data.companyName || '';
            customerEmailInput.value = data.email || '';
            customerPhoneInput.value = data.phone || '';
            customerCountrySelect.value = data.country || '';
            populateStateDropdown(); // Repopulate states after country is set
            customerAddressInput.value = data.address || '';
            customerCityInput.value = data.city || '';
            customerStateSelect.value = data.state || ''; // Set state after it's populated
            customerZipCodeInput.value = data.zipCode || '';
            customerIndustryInput.value = data.customerType === 'Individual' ? data.industry : '';
            customerIndustrySelect.value = data.customerType === 'Company' ? data.industry : '';
            document.getElementById('customerSource').value = data.customerSource || '';
            document.getElementById('customerActive').value = data.active ? 'Yes' : 'No';
            customerSinceInput.value = data.customerSince || '';
            customerDescriptionInput.value = data.description || '';
        } else {
            showMessage('Customer not found.', 'error', customerForm);
            resetCustomerForm();
        }
    } catch (error) {
        console.error("customers.js: Error loading customer for edit:", error);
        showMessage(`Error loading customer: ${error.message}`, 'error', customerForm);
    }
}

async function deleteCustomer(customerId) {
    console.log("customers.js: deleteCustomer called for ID:", customerId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        showModal("Error", "Authentication or Database not ready. Please sign in or wait.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this customer? This action cannot be undone.",
        async () => {
            try {
                const docRef = doc(firestoreDb, `artifacts/${projectId}/public/data/customers`, customerId);
                await deleteDoc(docRef);
                showMessage('Customer deleted successfully!', 'success', customerForm);
                resetCustomerForm();
                console.log("customers.js: Customer deleted:", customerId);
            } catch (error) {
                console.error("customers.js: Error deleting customer:", error);
                showModal("Error", `Error deleting customer: ${error.message}`, () => {});
            }
        }
    );
}

function resetCustomerForm() {
    if (!customerForm) return; // Defensive check
    customerForm.reset();
    customerFormTitle.textContent = "Add New Customer";
    submitCustomerButton.textContent = "Add Customer";
    customerIdDisplayGroup.classList.add('hidden');
    customerIdDisplay.textContent = '';
    customerForm.dataset.editingId = ''; // Clear editing ID
    hideMessage(customerForm);
    toggleCustomerTypeFields(); // Reset to default (Individual) fields
    populateCountryDropdown(); // Re-populate to reset country selection
    populateStateDropdown(); // Reset state dropdown based on default country
}

function listenForCustomers() {
    console.log("customers.js: listenForCustomers called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        console.warn("customers.js: listenForCustomers: Firestore DB or Auth is not ready. Cannot set up listener.");
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Waiting for database connection and user authentication...</p>';
        return;
    }

    const customersColRef = collection(firestoreDb, `artifacts/${projectId}/public/data/customers`);
    const q = query(customersColRef);

    removeUnsubscribe('customers'); // Remove previous listener if any
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!customerList) return; // Defensive check
        customerList.innerHTML = ''; // Clear list before populating
        if (snapshot.empty) {
            customerList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No customers found.</p>';
            allCustomers.length = 0; // Ensure global array is empty
            return;
        }
        allCustomers.length = 0; // Clear existing data from global array
        snapshot.forEach((doc) => {
            const customer = { id: doc.id, ...doc.data() };
            allCustomers.push(customer); // Populate global array for other modules
            displayCustomer(customer);
        });
        console.log("customers.js: Customers list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("customers.js: Error listening to customers:", error);
        if (customerList) customerList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading customers: ${error.message}</p>`;
    });

    addUnsubscribe('customers', unsubscribe); // Add the new unsubscribe function
}

function displayCustomer(customer) {
    if (!customerList) return; // Defensive check
    const customerRow = document.createElement('div');
    customerRow.className = 'data-grid-row'; // Tailwind grid classes applied via CSS
    customerRow.dataset.id = customer.id; // Store Firestore document ID

    const customerName = customer.customerType === 'Individual' ? `${customer.firstName} ${customer.lastName}` : customer.companyName;
    const customerAddress = `${customer.address}, ${customer.city}, ${customer.state}`;

    customerRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${customer.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${customerName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${customer.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.phone || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${customerAddress || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${customer.industry || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${customer.customerSince || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${customer.customerSource || 'N/A'}</div>
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

    // Add event listeners for the buttons
    customerRow.querySelector('.edit-btn').addEventListener('click', () => editCustomer(customer.id));
    customerRow.querySelector('.delete-btn').addEventListener('click', () => deleteCustomer(customer.id));
}
