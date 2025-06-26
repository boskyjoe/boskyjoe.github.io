import { db, auth, currentUserId, isAuthReady, addUnsubscribe, removeUnsubscribe } from './main.js';
import { showModal, getCollectionPath } from './utils.js';
import { fetchCountryData, appCountries, appCountryStateMap } from './admin_data.js'; // Import data and fetch function
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Import necessary Firestore functions

// Customer module specific DOM elements
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

const currentCustomerCollectionType = 'public'; // Fixed to public as per requirement

// Global data for Customers (fetched from Firestore)
export let allCustomers = [];

// Initialize Customer module elements and event listeners
export async function initCustomersModule() {
    console.log("customers.js: initCustomersModule called.");
    // Ensure DOM elements are initialized only once
    if (!customersSection) { // Check if any key element is null
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

        // Add event listeners specific to customers module
        if (customerForm) {
            customerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const customerData = {
                    customerType: customerTypeSelect.value.trim(),
                    firstName: customerFirstNameInput.value.trim(),
                    lastName: customerLastNameInput.value.trim(),
                    companyName: customerCompanyNameInput.value.trim(),
                    email: customerEmailInput.value.trim(),
                    phone: customerPhoneInput.value.trim(),
                    country: customerCountrySelect.value.trim(),
                    address: customerAddressInput.value.trim(),
                    city: customerCityInput.value.trim(),
                    state: customerStateSelect.value.trim(),
                    zipCode: customerZipCodeInput.value.trim(),
                    industry: '',
                    customerSince: customerSinceInput.value,
                    description: customerDescriptionInput.value.trim()
                };

                if (customerTypeSelect.value === 'Individual') {
                    customerData.industry = customerIndustryInput.value.trim();
                } else if (customerTypeSelect.value === 'Company') {
                    customerData.industry = customerIndustrySelect.value.trim();
                }

                const editingId = customerForm.dataset.editingId;
                await saveCustomer(customerData, editingId || null);
            });
        }

        if (customerTypeSelect) customerTypeSelect.addEventListener('change', applyCustomerTypeValidation);
        if (customerCountrySelect) customerCountrySelect.addEventListener('change', (e) => populateStates(e.target.value));
        document.getElementById('resetCustomerFormButton')?.addEventListener('click', resetCustomerForm);
    }

    // Ensure initial state and load data
    await fetchCountryData(); // Ensure country data is loaded before populating dropdowns
    populateCountries();
    resetCustomerForm(); // Reset form and apply initial validation state
    if (submitCustomerButton) {
        if (isAuthReady && currentUserId) {
            submitCustomerButton.removeAttribute('disabled');
        } else {
            submitCustomerButton.setAttribute('disabled', 'disabled');
        }
    }
    listenForCustomers();
}

// Function to fetch customer data from Firestore for dropdowns in other modules (exported)
export async function fetchCustomersForDropdown() {
    console.log("customers.js: fetchCustomersForDropdown called.");
    if (!isAuthReady || !currentUserId) {
        console.warn("customers.js: Authentication required to fetch customers for dropdown.");
        allCustomers = []; // Clear previous data
        return;
    }
    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers');
    if (!collectionPath) {
        console.error("customers.js: Collection path is null. Cannot fetch customers for dropdown.");
        allCustomers = []; // Clear previous data
        return;
    }

    // Crucial check: Ensure db is initialized before using it
    if (!db) {
        console.error("customers.js: Firestore 'db' instance is not initialized. Cannot fetch customers for dropdown.");
        allCustomers = []; // Clear previous data
        // You might want to defer this call or show an error to the user
        // For now, we'll just log and return.
        return;
    }

    try {
        console.log("customers.js: Attempting to get customers from path:", collectionPath);
        // Use modular Firestore syntax: collection(db, collectionPath) and getDocs()
        const querySnapshot = await getDocs(collection(db, collectionPath));
        allCustomers = [];
        querySnapshot.forEach(doc => {
            allCustomers.push({ id: doc.id, ...doc.data() });
        });
        console.log("customers.js: Customer data loaded for dropdowns. Total customers:", allCustomers.length);

        // Populate customer dropdown in Opportunities module if it exists
        const opportunityCustomerSelect = document.getElementById('opportunityCustomer');
        if (opportunityCustomerSelect) {
            opportunityCustomerSelect.innerHTML = '<option value="">Select Customer</option>';
            allCustomers.forEach(customer => {
                const option = document.createElement('option');
                option.value = customer.id;
                option.textContent = customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                opportunityCustomerSelect.appendChild(option);
            });
            console.log("customers.js: Populated opportunity customer select.");
        }
    } catch (error) {
        console.error("customers.js: Error fetching customers for dropdown:", error);
        allCustomers = [];
    }
}


// Function to populate the country dropdown
function populateCountries() {
    if (!customerCountrySelect) return;
    customerCountrySelect.innerHTML = '<option value="">Select Country</option>';
    appCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = country.name;
        customerCountrySelect.appendChild(option);
    });
}

// Function to populate the state/province dropdown based on selected country
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
    customerStateSelect.disabled = states.length === 0;
}

// Placeholder for address validation
function validateAddress(address, city, state, zipCode, country) {
    const isValid = address.trim() !== '' && city.trim() !== '' && state.trim() !== '' && zipCode.trim() !== '' && country.trim() !== '';
    if (!isValid) {
        if (addressValidationMessage) {
            addressValidationMessage.classList.remove('hidden');
            addressValidationMessage.textContent = "Please fill in all address fields.";
        }
    } else {
        if (addressValidationMessage) {
            addressValidationMessage.classList.add('hidden');
            addressValidationMessage.textContent = "";
        }
    }
    return isValid;
}

// Function to apply validation rules based on customer type
function applyCustomerTypeValidation() {
    if (!customerTypeSelect) return;
    const customerType = customerTypeSelect.value;

    if (individualFieldsDiv) individualFieldsDiv.classList.add('hidden');
    if (customerLastNameInput && customerLastNameInput.closest('div')) customerLastNameInput.closest('div').classList.add('hidden');
    if (companyNameFieldDiv) companyNameFieldDiv.classList.add('hidden');
    if (individualIndustryGroup) individualIndustryGroup.classList.add('hidden');
    if (companyIndustryGroup) companyIndustryGroup.classList.add('hidden');

    if (customerFirstNameInput) customerFirstNameInput.removeAttribute('required');
    if (customerLastNameInput) customerLastNameInput.removeAttribute('required');
    if (customerCompanyNameInput) customerCompanyNameInput.removeAttribute('required');
    if (customerIndustryInput) customerIndustryInput.removeAttribute('required');
    if (customerIndustrySelect) customerIndustrySelect.removeAttribute('required');

    if (customerType === 'Individual') {
        if (individualFieldsDiv) individualFieldsDiv.classList.remove('hidden');
        if (customerLastNameInput && customerLastNameInput.closest('div')) customerLastNameInput.closest('div').classList.remove('hidden');
        if (customerFirstNameInput) customerFirstNameInput.setAttribute('required', 'required');
        if (customerLastNameInput) customerLastNameInput.setAttribute('required', 'required');
        if (individualIndustryGroup) individualIndustryGroup.classList.remove('hidden');
        if (customerIndustryInput) customerIndustryInput.setAttribute('required', 'required');
    } else if (customerType === 'Company') {
        if (companyNameFieldDiv) companyNameFieldDiv.classList.remove('hidden'); // Should be remove, not add
        if (customerCompanyNameInput) customerCompanyNameInput.setAttribute('required', 'required');
        if (companyIndustryGroup) companyIndustryGroup.classList.remove('hidden');
        if (customerIndustrySelect) customerIndustrySelect.setAttribute('required', 'required');
    }
}

// Add or update a customer in Firestore
async function saveCustomer(customerData, existingCustomerDocId = null) {
    if (!isAuthReady || !currentUserId) {
        showModal("Error", "Could not save customer. Authentication required.", () => {});
        return;
    }
    if (!db) {
        console.error("customers.js: Firestore 'db' instance is not initialized. Cannot save customer.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

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
        customerData.companyName = "";
    } else if (customerType === 'Company') {
        if (!customerCompanyNameInput.value.trim()) {
            showModal("Validation Error", "For Company customers, Company Name is mandatory.", () => {});
            return;
        }
        customerData.firstName = "";
        customerData.lastName = "";
    }

    customerData.industry = customerType === 'Individual' ? customerIndustryInput.value.trim() : customerIndustrySelect.value.trim();

    if (!customerEmailInput.value.trim() || !customerPhoneInput.value.trim() ||
        !customerData.industry || !customerSinceInput.value.trim()) {
        showModal("Validation Error", "Please fill in all mandatory fields.", () => {});
        return;
    }

    const addressValid = validateAddress(
        customerAddressInput.value,
        customerCityInput.value,
        customerStateSelect.value,
        customerZipCodeInput.value,
        customerCountrySelect.value
    );

    if (!addressValid) {
        showModal("Validation Error", "Please provide a complete and valid address.", () => {});
        return;
    }

    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers');
    if (!collectionPath) return;

    try {
        if (existingCustomerDocId) {
            // Use modular Firestore syntax: doc(db, collectionPath, existingCustomerDocId)
            const customerDocRef = doc(db, collectionPath, existingCustomerDocId);
            await setDoc(customerDocRef, customerData, { merge: true }); // Use setDoc with merge for consistency
            console.log("Customer updated:", existingCustomerDocId);
        } else {
            // Use modular Firestore syntax: doc(collection(db, collectionPath))
            const newDocRef = doc(collection(db, collectionPath));
            const numericPart = Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const systemGeneratedCustomerId = 'COM-' + numericPart;
            await setDoc(newDocRef, { ...customerData, customerId: systemGeneratedCustomerId });
            console.log("Customer added with system-generated ID:", systemGeneratedCustomerId);
        }
        resetCustomerForm();
    } catch (error) {
        console.error("Error saving customer:", error);
        showModal("Error", "Failed to save customer. Please try again. " + error.message, () => {});
    }
}

// Delete a customer from Firestore
async function deleteCustomer(firestoreDocId) {
    if (!isAuthReady || !currentUserId) {
        showModal("Error", "Could not delete customer. Authentication required.", () => {});
        return;
    }
    if (!db) {
        console.error("customers.js: Firestore 'db' instance is not initialized. Cannot delete customer.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers');
    if (!collectionPath) return;

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this customer? This action cannot be undone.",
        async () => {
            try {
                // Use modular Firestore syntax: deleteDoc(doc(db, collectionPath, firestoreDocId))
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
    console.log("customers.js: listenForCustomers called.");
    if (!isAuthReady || !currentUserId) {
        if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center col-span-full">Authentication required to load customers.</p>';
        return;
    }
    if (!db) {
        console.error("customers.js: Firestore 'db' instance is not initialized. Cannot listen for customers.");
        if (customerList) customerList.innerHTML = '<p class="text-red-500 text-center col-span-full py-4">Firestore not ready to load customers.</p>';
        return;
    }
    const collectionPath = getCollectionPath(currentCustomerCollectionType, 'customers');
    if (!collectionPath) {
        console.error("customers.js: Collection path is null. Cannot listen for customers.");
        return;
    }

    // Use modular Firestore syntax: collection(db, collectionPath) and onSnapshot()
    const q = collection(db, collectionPath);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (customerList) customerList.innerHTML = '';
        if (snapshot.empty) {
            if (customerList) customerList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No customers found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const customer = { id: doc.id, ...doc.data() };
            displayCustomer(customer);
        });
        console.log("customers.js: Customers data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("customers.js: Error listening to customers:", error);
        if (customerList) customerList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading customers: ${error.message}</p>`;
    });
    addUnsubscribe('customers', unsubscribe); // Store unsubscribe function
}

// Display a single customer in the UI as a grid row
function displayCustomer(customer) {
    if (!customerList) return;
    const customerRow = document.createElement('div');
    customerRow.className = 'data-grid-row';
    customerRow.dataset.id = customer.id;

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
        <div class="px-2 py-1 truncate hidden lg:block">${customer.address || 'N/A'}, ${customer.city || 'N/A'}, ${customer.state || 'N/A'}, ${customer.zipCode || 'N/A'}, ${customer.country || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${customer.industry || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${customer.customerSince || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-center items-center space-x-2">
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

// Populate form for editing a customer
function editCustomer(customer) {
    if (!isAuthReady || !currentUserId) {
        showModal("Permission Denied", "Authentication required to edit customers.", () => {});
        return;
    }
    if (customerFormTitle) customerFormTitle.textContent = 'Edit Customer';
    if (submitCustomerButton) submitCustomerButton.textContent = 'Update Customer';

    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.remove('hidden');
    if (customerIdDisplay) customerIdDisplay.textContent = customer.customerId || 'N/A';
    if (customerForm) customerForm.dataset.editingId = customer.id;

    if (customerTypeSelect) customerTypeSelect.value = customer.customerType || '';
    if (customerEmailInput) customerEmailInput.value = customer.email || '';
    if (customerPhoneInput) customerPhoneInput.value = customer.phone || '';
    if (customerSinceInput) customerSinceInput.value = customer.customerSince || '';
    if (customerDescriptionInput) customerDescriptionInput.value = customer.description || '';
    
    if (customerCountrySelect) customerCountrySelect.value = customer.country || '';
    populateStates(customer.country);
    if (customerAddressInput) customerAddressInput.value = customer.address || '';
    if (customerCityInput) customerCityInput.value = customer.city || '';
    if (customer.state && customerStateSelect && Array.from(customerStateSelect.options).some(option => option.value === customer.state)) {
        customerStateSelect.value = customer.state;
    } else {
        if (customerStateSelect) customerStateSelect.value = '';
    }
    if (customerZipCodeInput) customerZipCodeInput.value = customer.zipCode || '';

    applyCustomerTypeValidation();

    if (customerFirstNameInput) customerFirstNameInput.value = customer.firstName || '';
    if (customerLastNameInput) customerLastNameInput.value = customer.lastName || '';
    if (customerCompanyNameInput) customerCompanyNameInput.value = customer.companyName || '';

    if (customer.customerType === 'Individual') {
        if (customerIndustryInput) customerIndustryInput.value = customer.industry || '';
    } else if (customer.customerType === 'Company') {
        if (customerIndustrySelect) customerIndustrySelect.value = customer.industry || '';
    }

    if (addressValidationMessage) addressValidationMessage.classList.add('hidden');
    if (customerForm) customerForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Customer form function (exported for main.js to use)
export function resetCustomerForm() {
    if (customerForm) customerForm.reset();
    if (customerForm) customerForm.dataset.editingId = '';
    if (customerFormTitle) customerFormTitle.textContent = 'Add New Customer';
    if (submitCustomerButton) submitCustomerButton.textContent = 'Add Customer';
    if (customerIdDisplayGroup) customerIdDisplayGroup.classList.add('hidden');
    if (customerIdDisplay) customerIdDisplay.textContent = '';

    if (customerCountrySelect) customerCountrySelect.value = '';
    populateStates('');
    if (addressValidationMessage) addressValidationMessage.classList.add('hidden');

    if (customerTypeSelect) customerTypeSelect.value = 'Individual';
    applyCustomerTypeValidation();
}
