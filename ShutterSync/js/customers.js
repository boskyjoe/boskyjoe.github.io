// js/customers.js

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';
import { Auth } from './auth.js';

/**
 * The CustomersModule object handles all functionality related to customer management.
 */
export const Customers = {
    db: null,
    auth: null,
    Utils: null,
    unsubscribe: null, // To store the unsubscribe function for the real-time listener
    currentEditingCustomerId: null, // Stores the ID of the customer being edited
    customersGrid: null, // Grid.js instance for the customers table

    /**
     * Initializes the Customers module.
     * This method should only initialize core dependencies, not interact with the DOM yet.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("Customers module initialized.");
    },

    /**
     * Renders the main UI for the Customers module.
     * This is called by Main.js when the 'customers' module is activated.
     *
     * @param {HTMLElement} moduleContentElement - The DOM element where the Customers UI should be rendered.
     * @param {boolean} isLoggedIn - The current login status (true/false).
     * @param {boolean} isAdmin - The current admin status (true/false).
     * @param {object|null} currentUser - The current Firebase User object, or null if logged out.
     */
    renderCustomersUI: function(moduleContentElement, isLoggedIn, isAdmin, currentUser) {
        const customersModuleContent = moduleContentElement;

        if (!customersModuleContent) {
            console.error("Customers module: Target content element was not provided or is null.");
            this.Utils.showMessage("Error: Customers module could not find its content area.", "error");
            return;
        }

        // Use the passed isLoggedIn directly for module access check
        if (!isLoggedIn) {
            customersModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                    <p class="text-gray-600 mb-4">You must be logged in to view customer data.</p>
                    <button id="go-to-home-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                        Go to Home / Login
                    </button>
                </div>
            `;
            document.getElementById('go-to-home-btn')?.addEventListener('click', () => {
                window.Main.loadModule('home', isLoggedIn, isAdmin, currentUser); // Redirect to home page
            });
            this.destroy(); // Clean up any previous grid/listeners
            this.Utils.showMessage("Access Denied: Please log in to view Customers.", "error");
            return;
        }

        customersModuleContent.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-semibold text-gray-800">Customer Management</h3>
                    <button id="add-customer-btn"
                        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200">
                        <i class="fas fa-plus mr-2"></i> Add Customer
                    </button>
                </div>
                <p class="text-sm text-gray-600 mb-4">View and manage your customer accounts.</p>
                <div id="customer-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
            </div>

            <!-- Customer Modal (Add/Edit Form) -->
            <div id="customer-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                <div class="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95 opacity-0">
                    <h4 id="customer-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Customer</h4>
                    <form id="customer-form">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label for="customer-name" class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input type="text" id="customer-name" name="companyName" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div>
                                <label for="contact-person" class="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                <input type="text" id="contact-person" name="contactPerson" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="md:col-span-2">
                                <label for="customer-email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" id="customer-email" name="email"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="md:col-span-2">
                                <label for="customer-phone" class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input type="tel" id="customer-phone" name="phone"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="md:col-span-2">
                                <label for="customer-address" class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea id="customer-address" name="address" rows="2"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                            </div>
                            <!-- New Fields for strict rule validation -->
                            <div class="md:col-span-2">
                                <label for="customer-type" class="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                                <select id="customer-type" name="customerType"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                                    <option value="Individual">Individual</option>
                                    <option value="Business">Business</option>
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label for="preferred-contact-method" class="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
                                <select id="preferred-contact-method" name="preferredContactMethod"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                                    <option value="Email">Email</option>
                                    <option value="Phone">Phone</option>
                                    <option value="Mail">Mail</option>
                                </select>
                            </div>
                            <div class="md:col-span-2">
                                <label for="industry" class="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                                <input type="text" id="industry" name="industry"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                             <div class="md:col-span-2">
                                <label for="customer-source" class="block text-sm font-medium text-gray-700 mb-1">Customer Source</label>
                                <input type="text" id="customer-source" name="customerSource"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="md:col-span-2">
                                <label for="additional-details" class="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
                                <textarea id="additional-details" name="additionalDetails" rows="2"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                            </div>
                            <div class="md:col-span-2 flex items-center">
                                <input type="checkbox" id="customer-active" name="active" checked
                                    class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                                <label for="customer-active" class="ml-2 block text-sm font-medium text-gray-700">Active Customer</label>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-3 mt-6">
                            <button type="button" id="cancel-customer-btn"
                                class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                Cancel
                            </button>
                            <button type="submit" id="save-customer-btn"
                                class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                Save Customer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        this.attachEventListeners();
        // Setup listener after HTML is rendered AND we know the login state is good
        this.setupRealtimeListener(isLoggedIn, isAdmin, currentUser);
    },

    /**
     * Sets up the real-time listener for the 'customers' collection.
     * @param {boolean} isLoggedIn - The current login status.
     * @param {boolean} isAdmin - The current admin status.
     * @param {object|null} currentUser - The current Firebase User object.
     */
    setupRealtimeListener: function(isLoggedIn, isAdmin, currentUser) {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        const userId = currentUser ? currentUser.uid : null;
        if (!isLoggedIn || !userId) { // Rely on passed isLoggedIn
            console.log("Not logged in, cannot set up customer listener.");
            this.renderCustomersGrid([]); // Clear grid if not logged in
            return;
        }

        const customersCollectionRef = collection(this.db, "customers");
        let q;
        if (isAdmin) { // Rely on passed isAdmin
            q = query(customersCollectionRef); // Admins see all customers
            console.log("Admin user: Fetching all customers.");
        } else {
            q = query(customersCollectionRef, where("creatorId", "==", userId)); // Standard users see only their own
            console.log("Standard user: Fetching customers created by:", userId);
        }

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const customers = [];
            snapshot.forEach((doc) => {
                customers.push({ id: doc.id, ...doc.data() });
            });
            this.renderCustomersGrid(customers);
            console.log("Customers data updated:", customers);
        }, (error) => {
            this.Utils.handleError(error, "fetching customers data");
            this.renderCustomersGrid([]);
        });
    },

    /**
     * Renders or updates the Grid.js table with the provided customer data.
     * @param {Array<object>} customers - An array of customer objects.
     */
    renderCustomersGrid: function(customers) {
        const gridContainer = document.getElementById('customer-grid-container');
        if (!gridContainer) {
            console.error("Customer grid container not found.");
            return;
        }

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'name', name: 'Company Name', sort: true, width: 'auto' }, // Changed to 'name' for display consistency with data
            { id: 'contactPerson', name: 'Contact Person', sort: true, width: 'auto' },
            { id: 'email', name: 'Email', width: 'auto' },
            { id: 'phone', name: 'Phone', width: '150px' },
            { id: 'address', name: 'Address', width: 'auto' },
            // Display newly added fields if desired, otherwise they will just be in the Firestore data
            { id: 'customerType', name: 'Type', sort: true, width: 'auto' },
            { id: 'industry', name: 'Industry', sort: true, width: 'auto' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const customerId = row.cells[0].data; // Get customer ID
                    const customerData = customers.find(c => c.id === customerId); // Find full customer data
                    const creatorId = customerData?.creatorId; // Get creatorId from original data
                    // Use Auth.getCurrentUser() and Utils.isAdmin() for permission checks at time of rendering actions
                    const isCurrentUserCreator = Auth.getCurrentUser() && creatorId === Auth.getCurrentUser().uid;
                    const canEditOrDelete = Utils.isAdmin() || isCurrentUserCreator;

                    if (!canEditOrDelete) {
                        return ''; // No actions if not allowed
                    }

                    return gridjs.h('div', {
                        className: 'flex items-center justify-center space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-yellow-100 hover:text-yellow-600 transition-colors duration-200',
                            title: 'Edit Customer',
                            onClick: () => this.openCustomerModal('edit', customerId)
                        }, gridjs.h('i', { className: 'fas fa-edit text-lg' })),
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200',
                            title: 'Delete Customer',
                            onClick: () => this.deleteCustomer(customerId, customerData.name) // Use customerData.name
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = customers.map(c => [
            c.id,
            c.name || '', // Use 'name' from Firestore
            c.contactPerson || '',
            c.email || '',
            c.phone || '',
            c.address || '',
            c.customerType || '',
            c.industry || ''
        ]);

        if (this.customersGrid) {
            this.customersGrid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
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
            }).render(gridContainer);
        }
    },

    /**
     * Attaches event listeners for UI interactions within the Customers module.
     * This is called AFTER the HTML is rendered.
     */
    attachEventListeners: function() {
        const addCustomerBtn = document.getElementById('add-customer-btn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => this.openCustomerModal('add'));
        } else {
            console.error("Add customer button not found after rendering.");
        }

        const customerForm = document.getElementById('customer-form');
        if (customerForm) {
            customerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCustomer();
            });
        }

        const cancelCustomerBtn = document.getElementById('cancel-customer-btn');
        if (cancelCustomerBtn) {
            cancelCustomerBtn.addEventListener('click', () => this.closeCustomerModal());
        }

        const customerModal = document.getElementById('customer-modal');
        if (customerModal) {
            customerModal.addEventListener('click', (e) => {
                if (e.target === customerModal) {
                    this.closeCustomerModal();
                }
            });
        }
    },

    /**
     * Opens the customer add/edit modal.
     * @param {string} mode - 'add' or 'edit'.
     * @param {string|null} customerId - The ID of the customer to edit, if mode is 'edit'.
     */
    openCustomerModal: async function(mode, customerId = null) {
        // Use Auth.isLoggedIn() for real-time check when modal is opened
        if (!Auth.isLoggedIn()) {
            this.Utils.showMessage('You must be logged in to add/edit customers.', 'error');
            return;
        }

        const modal = document.getElementById('customer-modal');
        const title = document.getElementById('customer-modal-title');
        const form = document.getElementById('customer-form');

        form.reset(); // Clear previous form data
        this.currentEditingCustomerId = null; // Clear ID for add mode

        if (mode === 'edit' && customerId) {
            title.textContent = 'Edit Customer';
            this.currentEditingCustomerId = customerId;
            try {
                // Fetch customer data to pre-fill form
                const customerDoc = await getDoc(doc(this.db, 'customers', customerId));
                if (customerDoc.exists()) {
                    const data = customerDoc.data();
                    // Use Utils.isAdmin() for real-time admin check
                    const currentUserId = Auth.getCurrentUser() ? Auth.getCurrentUser().uid : null;
                    if (!Utils.isAdmin() && data.creatorId !== currentUserId) {
                        this.Utils.showMessage('You do not have permission to edit this customer.', 'error');
                        this.closeCustomerModal();
                        return;
                    }
                    document.getElementById('customer-name').value = data.name || ''; // Use 'name'
                    document.getElementById('contact-person').value = data.contactPerson || '';
                    document.getElementById('customer-email').value = data.email || '';
                    document.getElementById('customer-phone').value = data.phone || '';
                    document.getElementById('customer-address').value = data.address || '';
                    document.getElementById('customer-type').value = data.customerType || 'Individual';
                    document.getElementById('preferred-contact-method').value = data.preferredContactMethod || 'Email';
                    document.getElementById('industry').value = data.industry || '';
                    document.getElementById('customer-source').value = data.customerSource || '';
                    document.getElementById('additional-details').value = data.additionalDetails || '';
                    document.getElementById('customer-active').checked = data.active !== false; // Default to checked
                } else {
                    this.Utils.showMessage('Customer not found for editing.', 'error');
                    this.closeCustomerModal();
                    return;
                }
            } catch (error) {
                this.Utils.handleError(error, "fetching customer for edit");
                this.closeCustomerModal();
                return;
            }
        } else {
            title.textContent = 'Add New Customer';
            // Set defaults for new customer
            document.getElementById('customer-type').value = 'Individual';
            document.getElementById('preferred-contact-method').value = 'Email';
            document.getElementById('customer-active').checked = true;
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('div').classList.remove('opacity-0', 'scale-95');
        }, 10);
    },

    /**
     * Closes the customer modal.
     */
    closeCustomerModal: function() {
        const modal = document.getElementById('customer-modal');
        if (modal) {
            modal.querySelector('div').classList.add('opacity-0', 'scale-95');
            modal.addEventListener('transitionend', () => {
                modal.classList.add('hidden');
                this.currentEditingCustomerId = null; // Reset ID on close
            }, { once: true });
        }
    },

    /**
     * Saves a new customer or updates an existing one to Firestore.
     */
    saveCustomer: async function() {
        // Use Auth.isLoggedIn() for real-time check when saving
        if (!Auth.isLoggedIn()) {
            this.Utils.showMessage('You must be logged in to save customers.', 'error');
            this.closeCustomerModal();
            return;
        }

        const name = document.getElementById('customer-name').value.trim(); // Changed to 'name'
        const contactPerson = document.getElementById('contact-person').value.trim();
        const email = document.getElementById('customer-email').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        const address = document.getElementById('customer-address').value.trim();
        const customerType = document.getElementById('customer-type').value;
        const preferredContactMethod = document.getElementById('preferred-contact-method').value;
        const industry = document.getElementById('industry').value.trim();
        const customerSource = document.getElementById('customer-source').value.trim();
        const additionalDetails = document.getElementById('additional-details').value.trim();
        const active = document.getElementById('customer-active').checked;


        if (!name || !contactPerson) {
            this.Utils.showMessage('Company Name and Contact Person are required.', 'warning');
            return;
        }

        const customerData = {
            name: name, // Changed to 'name'
            contactPerson: contactPerson,
            email: email,
            phone: phone,
            address: address,
            customerType: customerType,
            preferredContactMethod: preferredContactMethod,
            industry: industry,
            customerSource: customerSource,
            additionalDetails: additionalDetails,
            active: active,
            updatedAt: new Date()
        };

        try {
            if (this.currentEditingCustomerId) {
                // Update existing customer
                const customerRef = doc(this.db, "customers", this.currentEditingCustomerId);
                // Use Utils.isAdmin() for real-time admin check
                const existingDoc = await getDoc(customerRef);
                if (existingDoc.exists()) {
                    const data = existingDoc.data();
                    const currentUserId = Auth.getCurrentUser() ? Auth.getCurrentUser().uid : null;
                    if (!Utils.isAdmin() && data.creatorId !== currentUserId) {
                        this.Utils.showMessage('You do not have permission to update this customer.', 'error');
                        this.closeCustomerModal();
                        return;
                    }
                }
                await this.Utils.updateDoc(customerRef, customerData);
                this.Utils.showMessage('Customer updated successfully!', 'success');
            } else {
                // Add new customer
                customerData.creatorId = Auth.getCurrentUser().uid; // Now guaranteed to be a logged-in user's UID
                customerData.createdAt = new Date();
                await addDoc(collection(this.db, "customers"), customerData);
                this.Utils.showMessage('Customer added successfully!', 'success');
            }
            this.closeCustomerModal();
        } catch (error) {
            this.Utils.handleError(error, "saving customer");
        }
    },

    /**
     * Deletes a customer from Firestore.
     * @param {string} customerId - The ID of the customer to delete.
     * @param {string} customerName - The name of the customer for confirmation message.
     */
    deleteCustomer: async function(customerId, customerName) {
        // Use Auth.isLoggedIn() for real-time check when deleting
        if (!Auth.isLoggedIn()) {
            this.Utils.showMessage('You must be logged in to delete customers.', 'error');
            return;
        }

        try {
            const customerRef = doc(this.db, "customers", customerId);
            const existingDoc = await getDoc(customerRef);
            if (existingDoc.exists()) {
                const data = existingDoc.data();
                // Use Utils.isAdmin() for real-time admin check
                const currentUserId = Auth.getCurrentUser() ? Auth.getCurrentUser().uid : null;
                if (!Utils.isAdmin() && data.creatorId !== currentUserId) {
                    this.Utils.showMessage('You do not have permission to delete this customer.', 'error');
                    return; // Prevent deletion
                }
            }
        } catch (error) {
            this.Utils.handleError(error, "checking delete permission for customer");
            return; // Prevent deletion
        }

        this.Utils.showMessage(`Are you sure you want to delete customer "${customerName}"?`, 'warning', 0); // 0 duration for persistent

        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('div');
            // Remove existing buttons to avoid duplicates
            const existingButtons = messageBox.querySelectorAll('button:not(#message-close-btn)');
            existingButtons.forEach(btn => btn.remove());

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete';
            confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2 transition-colors duration-200';
            confirmBtn.onclick = async () => {
                try {
                    await deleteDoc(doc(this.db, "customers", customerId));
                    this.Utils.showMessage('Customer deleted successfully!', 'success');
                    messageModalContainer.classList.add('hidden'); // Hide modal explicitly after action
                } catch (error) {
                    this.Utils.handleError(error, "deleting customer");
                    messageModalContainer.classList.add('hidden'); // Hide modal explicitly after action
                }
            };
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg mt-4 transition-colors duration-200';
            cancelBtn.onclick = () => {
                messageModalContainer.classList.add('hidden');
                this.Utils.showMessage('Deletion cancelled.', 'info');
            };

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex justify-end pt-4 border-t border-gray-200 mt-4';
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            messageBox.appendChild(buttonContainer);
        }
    },

    /**
     * Detaches the real-time listener when the module is no longer active.
     */
    destroy: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("Customers module listener unsubscribed.");
        }
        if (this.customersGrid) {
            this.customersGrid.destroy();
            this.customersGrid = null;
        }
        // Main.js now handles clearing the innerHTML of the content area for this module.
        console.log("Customers module destroyed.");
    }
};
