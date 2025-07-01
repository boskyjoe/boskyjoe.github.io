// js/customers.js

import { Utils } from './utils.js';
import { Auth } from './auth.js';

/**
 * The Customers module handles displaying and managing customer data.
 */
export const Customers = {
    db: null,
    auth: null,
    Utils: null,
    customersGrid: null, // Stores the Grid.js instance
    customersCollectionRef: null,
    unsubscribeCustomersSnapshot: null, // To store the unsubscribe function for real-time listener
    // Bound event handlers for grid buttons to allow proper removal
    handleEditButtonClickBound: null,
    handleDeleteButtonClickBound: null,
    countriesCache: new Map(), // Cache for countries from app_metadata

    /**
     * Initializes the Customers module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils module instance.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        this.customersCollectionRef = this.Utils.getCustomersCollectionRef();

        // Ensure grid and listener references are null on init for a clean slate
        this.customersGrid = null;
        this.unsubscribeCustomersSnapshot = null;
        this.countriesCache = new Map(); // Initialize countriesCache here
        console.log("Customers module initialized. customersGrid, unsubscribeCustomersSnapshot, and countriesCache reset.");
    },

    /**
     * Renders the Customers UI into the provided content area element.
     * @param {HTMLElement} moduleContentElement - The DOM element where the Customers UI should be rendered.
     * @param {boolean} isLoggedIn - The current login status.
     * @param {boolean} isAdmin - The current admin status.
     * @param {object|null} currentUser - The current Firebase User object, or null if logged out.
     */
    renderCustomersUI: async function(moduleContentElement, isLoggedIn, isAdmin, currentUser) { // Made async to await populateCountrySelect
        console.log("Customers: renderCustomersUI called. isLoggedIn:", isLoggedIn, "isAdmin:", isAdmin);
        if (!isLoggedIn) {
            moduleContentElement.innerHTML = this.Utils.getNotLoggedInHtml();
            return;
        }

        moduleContentElement.innerHTML = `
            <div class="p-6 bg-white rounded-lg shadow-md">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">Customer Management</h2>
                <div class="mb-6 flex justify-between items-center">
                    <button id="add-customer-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200 flex items-center">
                        <i class="fas fa-plus mr-2"></i> Add New Customer
                    </button>
                </div>
                <div id="customer-grid-container"></div>
            </div>
            <!-- Customer Modal -->
            <div id="customer-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center hidden z-50">
                <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                    <h3 id="customer-modal-title" class="text-xl font-bold mb-4">Add New Customer</h3>
                    <form id="customer-form">
                        <input type="hidden" id="customer-id">
                        <div class="mb-4">
                            <label for="customer-name" class="block text-gray-700 text-sm font-bold mb-2">Customer Name:</label>
                            <input type="text" id="customer-name" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                        </div>
                        <div class="mb-4">
                            <label for="contact-person" class="block text-gray-700 text-sm font-bold mb-2">Contact Person:</label>
                            <input type="text" id="contact-person" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                        </div>
                        <div class="mb-4">
                            <label for="email" class="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                            <input type="email" id="email" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                        </div>
                        <div class="mb-4">
                            <label for="phone" class="block text-gray-700 text-sm font-bold mb-2">Phone:</label>
                            <input type="tel" id="phone" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                        </div>
                        <div class="mb-4">
                            <label for="customer-type" class="block text-gray-700 text-sm font-bold mb-2">Customer Type:</label>
                            <select id="customer-type" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                                <option value="">Select Type</option>
                                <option value="Individual">Individual</option>
                                <option value="Company">Company</option>
                            </select>
                        </div>
                        <div class="mb-4">
                            <label for="preferred-contact-method" class="block text-gray-700 text-sm font-bold mb-2">Preferred Contact Method:</label>
                            <select id="preferred-contact-method" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                                <option value="">Select Method</option>
                                <option value="Email">Email</option>
                                <option value="Phone">Phone</option>
                            </select>
                        </div>
                        <div class="mb-4">
                            <label for="industry" class="block text-gray-700 text-sm font-bold mb-2">Industry:</label>
                            <select id="industry" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                                <option value="">Select Industry</option>
                                <option value="Technology">Technology</option>
                                <option value="Finance">Finance</option>
                                <option value="Healthcare">Healthcare</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                        <div class="mb-4">
                            <label for="address" class="block text-gray-700 text-sm font-bold mb-2">Address:</label>
                            <textarea id="address" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" rows="3"></textarea>
                        </div>
                        <div class="mb-4">
                            <label for="city" class="block text-gray-700 text-sm font-bold mb-2">City:</label>
                            <input type="text" id="city" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                        </div>
                        <div class="mb-4">
                            <label for="state" class="block text-gray-700 text-sm font-bold mb-2">State:</label>
                            <input type="text" id="state" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                        </div>
                        <div class="mb-4">
                            <label for="zip" class="block text-gray-700 text-sm font-bold mb-2">Zip Code:</label>
                            <input type="text" id="zip" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline">
                        </div>
                        <div class="mb-4">
                            <label for="country-select" class="block text-gray-700 text-sm font-bold mb-2">Country:</label>
                            <select id="country-select" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                                <option value="">Select Country</option>
                            </select>
                        </div>
                        <div class="mb-4">
                            <label for="additional-details" class="block text-gray-700 text-sm font-bold mb-2">Additional Details:</label>
                            <textarea id="additional-details" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" rows="3"></textarea>
                        </div>
                        <div class="mb-4">
                            <label for="customer-source" class="block text-gray-700 text-sm font-bold mb-2">Customer Source:</label>
                            <select id="customer-source" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                                <option value="">Select Source</option>
                                <option value="Website">Website</option>
                                <option value="Referral">Referral</option>
                                <option value="Social Media">Social Media</option>
                                <option value="Advertisement">Advertisement</option>
                                <option value="Event">Event</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>
                        <div class="mb-4">
                            <label for="active-status" class="block text-gray-700 text-sm font-bold mb-2">Active Status:</label>
                            <select id="active-status" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div class="flex items-center justify-between">
                            <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200">Save Customer</button>
                            <button type="button" id="cancel-customer-btn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
            <!-- Delete Confirmation Modal -->
            <div id="delete-confirmation-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center hidden z-50">
                <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
                    <h3 class="text-xl font-bold mb-4">Confirm Deletion</h3>
                    <p class="mb-4">Are you sure you want to delete this customer? This action cannot be undone.</p>
                    <div class="flex justify-end space-x-4">
                        <button id="confirm-delete-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200">Delete</button>
                        <button id="cancel-delete-btn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        await this.populateCountrySelect(); // Populate country dropdown
        this.attachEventListeners(isAdmin);
        this.setupRealtimeCustomersListener(isAdmin, currentUser); // Pass isAdmin and currentUser
    },

    /**
     * Populates the country select dropdown from Firestore.
     */
    populateCountrySelect: async function() {
        console.log("Customers: Populating country select dropdown.");
        const countrySelect = document.getElementById('country-select');
        if (!countrySelect) return;

        countrySelect.innerHTML = '<option value="">Select Country</option>'; // Clear existing options

        try {
            const appMetadataRef = this.Utils.getAppMetadataCollectionRef();
            const countriesStatesDocRef = this.Utils.doc(appMetadataRef, 'countries_states');
            const docSnap = await this.Utils.getDoc(countriesStatesDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data && data.countries && Array.isArray(data.countries)) {
                    this.countriesCache.clear(); // Clear cache before repopulating
                    data.countries.forEach(country => {
                        const option = document.createElement('option');
                        option.value = country;
                        option.textContent = country;
                        countrySelect.appendChild(option);
                        this.countriesCache.set(country, country); // Cache country name
                    });
                    console.log(`Customers: Populated country select with ${data.countries.length} countries.`);
                } else {
                    console.warn("Customers: 'countries' array not found in app_metadata/countries_states document.");
                }
            } else {
                console.warn("Customers: app_metadata/countries_states document not found. Cannot populate countries.");
                this.Utils.showMessage("Country data not available. Please ensure '/app_metadata/countries_states' exists in Firestore.", "warning");
            }
        } catch (error) {
            this.Utils.handleError(error, "populating country select");
        }
    },

    /**
     * Attaches event listeners for the Customers UI.
     * @param {boolean} isAdmin - Whether the current user is an admin.
     */
    attachEventListeners: function(isAdmin) {
        console.log("Customers: Attaching event listeners. IsAdmin:", isAdmin);
        document.getElementById('add-customer-btn')?.addEventListener('click', () => this.openCustomerModal());
        document.getElementById('cancel-customer-btn')?.addEventListener('click', () => this.closeCustomerModal());
        document.getElementById('customer-form')?.addEventListener('submit', (e) => this.handleCustomerFormSubmit(e));
        document.getElementById('cancel-delete-btn')?.addEventListener('click', () => this.closeDeleteConfirmationModal());
        document.getElementById('confirm-delete-btn')?.addEventListener('click', () => this.handleConfirmDelete());
    },

    /**
     * Sets up a real-time listener for customer data.
     * @param {boolean} isAdmin - Whether the current user is an admin.
     * @param {object|null} currentUser - The current Firebase User object.
     */
    setupRealtimeCustomersListener: function(isAdmin, currentUser) {
        console.log("Customers: Setting up real-time listener.");
        // Unsubscribe from previous listener if exists
        if (this.unsubscribeCustomersSnapshot) {
            this.unsubscribeCustomersSnapshot();
            console.log("Customers: Unsubscribed from previous real-time listener.");
        }

        let q;
        if (isAdmin) {
            console.log("Customers: Admin user - Fetching all customers.");
            q = this.Utils.query(this.customersCollectionRef, this.Utils.orderBy('customerName'));
        } else if (currentUser) {
            console.log(`Customers: Standard user - Fetching customers created by ${currentUser.uid}.`);
            q = this.Utils.query(this.customersCollectionRef,
                this.Utils.where('createdBy', '==', currentUser.uid),
                this.Utils.orderBy('customerName')
            );
        } else {
            console.log("Customers: No user authenticated. Not fetching customers.");
            this.renderCustomersGrid([]); // Render empty grid if no user
            return;
        }

        this.unsubscribeCustomersSnapshot = this.Utils.onSnapshot(q, (querySnapshot) => {
            console.log(`Customers: Real-time snapshot received. Number of documents: ${querySnapshot.size}`);
            const customers = [];
            querySnapshot.forEach(doc => {
                customers.push({ id: doc.id, ...doc.data() });
            });
            console.log(`Customers: Array populated with ${customers.length} items from snapshot.`);

            this.renderCustomersGrid(customers, isAdmin, currentUser); // Pass isAdmin and currentUser
        }, (error) => {
            this.Utils.handleError(error, "fetching real-time customers");
            this.Utils.showMessage("Error loading customer data.", "error");
        });
    },

    /**
     * Renders or updates the Grid.js table with the provided customer data.
     * @param {Array<object>} customers - An array of customer objects.
     * @param {boolean} isAdmin - Whether the current user is an admin.
     * @param {object|null} currentUser - The current Firebase User object.
     */
    renderCustomersGrid: function(customers, isAdmin, currentUser) {
        console.log(`Customers: Rendering grid with ${customers.length} customers. IsAdmin: ${isAdmin}, CurrentUser: ${currentUser ? currentUser.uid : 'null'}`);
        const gridContainer = document.getElementById('customer-grid-container');
        if (!gridContainer) {
            console.error("Customer grid container not found.");
            return;
        }

        const columns = [
            { id: 'customerName', name: 'Customer Name' },
            { id: 'contactPerson', name: 'Contact Person' },
            { id: 'email', name: 'Email' },
            { id: 'phone', name: 'Phone' },
            { id: 'customerType', name: 'Customer Type' },
            { id: 'preferredContactMethod', name: 'Preferred Contact Method' },
            { id: 'industry', name: 'Industry' },
            { id: 'address', name: 'Address' },
            { id: 'city', name: 'City' },
            { id: 'state', name: 'State' },
            { id: 'zip', name: 'Zip Code' },
            { id: 'country', name: 'Country' }, // New column
            { id: 'additionalDetails', name: 'Additional Details' },
            { id: 'customerSource', name: 'Customer Source' },
            { id: 'activeStatus', name: 'Active' },
            {
                name: 'Actions',
                formatter: (cell, row) => {
                    const customerId = row.cells[0].data; // Assuming ID is the first cell
                    // Adjust index for createdBy UID based on new columns
                    const createdById = row.cells[15].data; // Now at index 15 (0-indexed)

                    // Check if the current user created this customer or is an admin
                    const isCreatorOrAdmin = isAdmin || (currentUser && createdById === currentUser.uid);

                    if (isCreatorOrAdmin) {
                        return this.Utils.html(`
                            <button class="edit-customer-btn bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm mr-2" data-id="${customerId}">Edit</button>
                            <button class="delete-customer-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm" data-id="${customerId}">Delete</button>
                        `);
                    }
                    return this.Utils.html('<span></span>'); // Empty span if no actions
                }
            },
            { id: 'createdBy', name: 'Created By', hidden: true } // Hidden column for createdBy UID
        ];

        const mappedData = customers.map(c => [
            c.id,
            c.customerName,
            c.contactPerson,
            c.email,
            c.phone,
            c.customerType,
            c.preferredContactMethod,
            c.industry,
            c.address,
            c.city,
            c.state,
            c.zip,
            c.country, // New field
            c.additionalDetails,
            c.customerSource,
            c.activeStatus,
            c.createdBy // Pass createdBy UID here
        ]);

        if (this.customersGrid) {
            console.log("Customers: Updating existing Grid.js instance.");
            this.customersGrid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
            console.log("Customers: Creating new Grid.js instance. Clearing container first.");
            // Ensure the container is empty before rendering a new grid
            gridContainer.innerHTML = '';

            this.customersGrid = new gridjs.Grid({
                columns: columns,
                data: mappedData,
                sort: true,
                search: true,
                pagination: {
                    limit: 10
                },
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 text-sm text-gray-900 whitespace-normal break-words',
                    footer: 'flex items-center justify-between px-6 py-3',
                    paginationButton: 'px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100',
                    paginationButtonCurrent: 'bg-blue-600 text-white hover:bg-blue-700',
                    search: 'p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500',
                    container: 'shadow-md rounded-lg overflow-hidden'
                }
            });
            this.customersGrid.render(gridContainer);
            console.log("Customers: Grid.js instance rendered into container.");
        }

        this.attachGridButtonListeners();
    },

    /**
     * Attaches event listeners to the Edit and Delete buttons within the Grid.js table.
     */
    attachGridButtonListeners: function() {
        // We need to ensure we remove old listeners before adding new ones
        // to prevent multiple listeners on the same button.
        // Store bound functions to correctly remove them.
        if (!this.handleEditButtonClickBound) {
            this.handleEditButtonClickBound = this.handleEditButtonClick.bind(this);
        }
        if (!this.handleDeleteButtonClickBound) {
            this.handleDeleteButtonClickBound = this.handleDeleteButtonClick.bind(this);
        }

        document.querySelectorAll('.edit-customer-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleEditButtonClickBound); // Remove old
            btn.addEventListener('click', this.handleEditButtonClickBound); // Add new
        });
        document.querySelectorAll('.delete-customer-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleDeleteButtonClickBound); // Remove old
            btn.addEventListener('click', this.handleDeleteButtonClickBound); // Add new
        });
        console.log("Customers: Attached grid button listeners.");
    },

    /**
     * Handles the click event for the Edit button in the grid.
     * @param {Event} event - The click event.
     */
    handleEditButtonClick: async function(event) {
        const customerId = event.target.dataset.id;
        console.log(`Customers: Edit button clicked for ID: ${customerId}`);
        try {
            const docRef = this.Utils.doc(this.db, 'customers', customerId);
            const docSnap = await this.Utils.getDoc(docRef);
            if (docSnap.exists()) {
                const customerData = docSnap.data();
                this.openCustomerModal(customerId, customerData);
            } else {
                this.Utils.showMessage('Customer not found.', 'error');
            }
        } catch (error) {
            this.Utils.handleError(error, "fetching customer for edit");
        }
    },

    /**
     * Handles the click event for the Delete button in the grid.
     * @param {Event} event - The click event.
     */
    handleDeleteButtonClick: function(event) {
        const customerId = event.target.dataset.id;
        console.log(`Customers: Delete button clicked for ID: ${customerId}`);
        this.openDeleteConfirmationModal(customerId);
    },

    /**
     * Opens the customer modal for adding or editing.
     * @param {string} [id] - The ID of the customer if editing.
     * @param {object} [data] - The customer data if editing.
     */
    openCustomerModal: function(id = '', data = {}) {
        console.log(`Customers: Opening customer modal for ID: ${id}`);
        const modal = document.getElementById('customer-modal');
        const form = document.getElementById('customer-form');
        const title = document.getElementById('customer-modal-title');

        if (form && title && modal) {
            form.reset(); // Clear form fields
            document.getElementById('customer-id').value = id;
            title.textContent = id ? 'Edit Customer' : 'Add New Customer';

            if (id && data) {
                document.getElementById('customer-name').value = data.customerName || '';
                document.getElementById('contact-person').value = data.contactPerson || '';
                document.getElementById('email').value = data.email || '';
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('customer-type').value = data.customerType || '';
                document.getElementById('preferred-contact-method').value = data.preferredContactMethod || '';
                document.getElementById('industry').value = data.industry || '';
                document.getElementById('address').value = data.address || ''; // Now a textarea
                document.getElementById('city').value = data.city || '';
                document.getElementById('state').value = data.state || '';
                document.getElementById('zip').value = data.zip || '';
                document.getElementById('country-select').value = data.country || ''; // New field
                document.getElementById('additional-details').value = data.additionalDetails || '';
                document.getElementById('customer-source').value = data.customerSource || '';
                document.getElementById('active-status').value = data.activeStatus || 'Active';
            }
            modal.classList.remove('hidden');
        } else {
            console.error("Customers: Customer modal elements not found.");
        }
    },

    /**
     * Closes the customer modal.
     */
    closeCustomerModal: function() {
        console.log("Customers: Closing customer modal.");
        document.getElementById('customer-modal')?.classList.add('hidden');
        document.getElementById('customer-form')?.reset();
        document.getElementById('customer-id').value = ''; // Clear hidden ID
    },

    /**
     * Handles the submission of the customer form.
     * @param {Event} e - The form submit event.
     */
    handleCustomerFormSubmit: async function(e) {
        e.preventDefault();
        console.log("Customers: Customer form submitted.");

        const customerId = document.getElementById('customer-id').value;
        const customerName = document.getElementById('customer-name').value;
        const contactPerson = document.getElementById('contact-person').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const customerType = document.getElementById('customer-type').value;
        const preferredContactMethod = document.getElementById('preferred-contact-method').value;
        const industry = document.getElementById('industry').value;
        const address = document.getElementById('address').value; // Get value from textarea
        const city = document.getElementById('city').value;
        const state = document.getElementById('state').value;
        const zip = document.getElementById('zip').value;
        const country = document.getElementById('country-select').value; // New field
        const additionalDetails = document.getElementById('additional-details').value;
        const customerSource = document.getElementById('customer-source').value;
        const activeStatus = document.getElementById('active-status').value;
        const createdBy = Auth.getCurrentUser()?.uid; // Get current user's UID

        if (!createdBy) {
            this.Utils.showMessage('Error: User not authenticated. Cannot save customer.', 'error');
            return;
        }

        const customerData = {
            customerName,
            contactPerson,
            email,
            phone,
            customerType,
            preferredContactMethod,
            industry,
            address,
            city,
            state,
            zip,
            country, // New field
            additionalDetails,
            customerSource,
            activeStatus,
            createdBy,
            updatedAt: this.Utils.Timestamp.now()
        };

        try {
            if (customerId) {
                // Update existing customer
                const docRef = this.Utils.doc(this.db, 'customers', customerId);
                await this.Utils.updateDoc(docRef, customerData);
                this.Utils.showMessage('Customer updated successfully!', 'success');
                console.log(`Customers: Customer ${customerId} updated.`);
            } else {
                // Add new customer
                customerData.createdAt = this.Utils.Timestamp.now();
                await this.Utils.addDoc(this.customersCollectionRef, customerData);
                this.Utils.showMessage('Customer added successfully!', 'success');
                console.log("Customers: New customer added.");
            }
            this.closeCustomerModal();
        } catch (error) {
            this.Utils.handleError(error, customerId ? "updating customer" : "adding customer");
        }
    },

    /**
     * Opens the delete confirmation modal.
     * @param {string} customerId - The ID of the customer to delete.
     */
    openDeleteConfirmationModal: function(customerId) {
        console.log(`Customers: Opening delete confirmation modal for ID: ${customerId}`);
        const modal = document.getElementById('delete-confirmation-modal');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        if (modal && confirmBtn) {
            confirmBtn.dataset.id = customerId; // Store ID on the confirm button
            modal.classList.remove('hidden');
        } else {
            console.error("Customers: Delete confirmation modal elements not found.");
        }
    },

    /**
     * Closes the delete confirmation modal.
     */
    closeDeleteConfirmationModal: function() {
        console.log("Customers: Closing delete confirmation modal.");
        document.getElementById('delete-confirmation-modal')?.classList.add('hidden');
        document.getElementById('confirm-delete-btn')?.removeAttribute('data-id');
    },

    /**
     * Handles the confirmation of customer deletion.
     */
    handleConfirmDelete: async function() {
        const customerId = document.getElementById('confirm-delete-btn')?.dataset.id;
        if (!customerId) {
            this.Utils.showMessage('Error: No customer selected for deletion.', 'error');
            return;
        }
        console.log(`Customers: Confirming deletion for ID: ${customerId}`);
        try {
            const docRef = this.Utils.doc(this.db, 'customers', customerId);
            await this.Utils.deleteDoc(docRef);
            this.Utils.showMessage('Customer deleted successfully!', 'success');
            console.log(`Customers: Customer ${customerId} deleted.`);
            this.closeDeleteConfirmationModal();
        } catch (error) {
            this.Utils.handleError(error, "deleting customer");
        }
    },

    /**
     * Cleans up any resources used by the Customers module when it's unloaded.
     */
    destroy: function() {
        console.log("Customers: Destroy method called.");
        // Unsubscribe from the real-time listener if it exists
        if (this.unsubscribeCustomersSnapshot) {
            this.unsubscribeCustomersSnapshot();
            this.unsubscribeCustomersSnapshot = null;
            console.log("Customers: Real-time listener unsubscribed.");
        }

        // Destroy the Grid.js instance if it exists
        console.log("Customers: Checking customersGrid before destroy. Is it defined?", !!this.customersGrid);
        if (this.customersGrid) {
            this.customersGrid.destroy(); // Properly destroy the Grid.js instance
            this.customersGrid = null; // Nullify the reference so a new one is created next time
            console.log("Customers: Grid.js instance destroyed and reference nulled.");
        } else {
            console.log("Customers: No Grid.js instance to destroy.");
        }

        // Clear countries cache
        console.log("Customers: Checking countriesCache before clear. Is it defined?", !!this.countriesCache);
        if (this.countriesCache) {
            this.countriesCache.clear();
            console.log("Customers: Countries cache cleared.");
        } else {
            console.warn("Customers: countriesCache was undefined during destroy. Cannot clear.");
        }

        // Remove event listeners from static elements that might persist
        document.getElementById('add-customer-btn')?.removeEventListener('click', this.openCustomerModal);
        document.getElementById('cancel-customer-btn')?.removeEventListener('click', this.closeCustomerModal);
        document.getElementById('customer-form')?.removeEventListener('submit', this.handleCustomerFormSubmit);
        document.getElementById('confirm-delete-btn')?.removeEventListener('click', this.handleConfirmDelete);
        document.getElementById('cancel-delete-btn')?.removeEventListener('click', this.closeDeleteConfirmationModal);

        // Remove bound listeners for grid buttons if they exist
        document.querySelectorAll('.edit-customer-btn').forEach(btn => {
            if (this.handleEditButtonClickBound) {
                btn.removeEventListener('click', this.handleEditButtonClickBound);
            }
        });
        document.querySelectorAll('.delete-customer-btn').forEach(btn => {
            if (this.handleDeleteButtonClickBound) {
                btn.removeEventListener('click', this.handleDeleteButtonClickBound);
            }
        });

        console.log("Customers module destroyed.");
    }
};
