// js/customers.js

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, orderBy, startAfter, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';
import { Auth } from './auth.js'; // NEW: Import Auth to check login status

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
     */
    renderCustomersUI: function() {
        const customersModuleContent = document.getElementById('customers-module-content');
        if (!customersModuleContent) {
            console.error("Customers module content area not found in DOM.");
            return;
        }

        // --- NEW: Login Requirement Check ---
        if (!Auth.isLoggedIn()) {
            customersModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                    <p class="text-gray-600 mb-4">You must be logged in to view customer data.</p>
                    <button id="go-to-login-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                        Go to Home / Login
                    </button>
                </div>
            `;
            // Attach event listener for the new button
            document.getElementById('go-to-login-btn')?.addEventListener('click', () => {
                window.Main.loadModule('home'); // Redirect to home page
            });
            this.destroy(); // Clean up any previous grid/listeners
            this.Utils.showMessage("Access Denied: Please log in to view Customers.", "error");
            return; // Stop execution if not logged in
        }
        // --- END NEW ---

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
        this.setupRealtimeListener();
    },

    /**
     * Sets up the real-time listener for the 'customers' collection.
     */
    setupRealtimeListener: function() {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        const userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
        if (!userId) {
            console.log("No user ID found, cannot set up customer listener. (User likely not logged in or session expired)");
            this.renderCustomersGrid([]); // Clear grid if not logged in
            return;
        }

        const customersCollectionRef = collection(this.db, "customers");
        let q;
        if (this.Utils.isAdmin()) {
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
            { id: 'companyName', name: 'Company Name', sort: true, width: 'auto' },
            { id: 'contactPerson', name: 'Contact Person', sort: true, width: 'auto' },
            { id: 'email', name: 'Email', width: 'auto' },
            { id: 'phone', name: 'Phone', width: '150px' },
            { id: 'address', name: 'Address', width: 'auto' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const customerId = row.cells[0].data; // Get customer ID
                    const customerData = customers.find(c => c.id === customerId); // Find full customer data
                    const creatorId = customerData?.creatorId; // Get creatorId from original data
                    const isCurrentUserCreator = this.auth.currentUser && creatorId === this.auth.currentUser.uid;
                    const canEditOrDelete = this.Utils.isAdmin() || isCurrentUserCreator;

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
                            onClick: () => this.deleteCustomer(customerId, row.cells[1].data)
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = customers.map(c => [
            c.id,
            c.companyName || '',
            c.contactPerson || '',
            c.email || '',
            c.phone || '',
            c.address || ''
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
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-normal break-words',
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
                    document.getElementById('customer-name').value = data.companyName || '';
                    document.getElementById('contact-person').value = data.contactPerson || '';
                    document.getElementById('customer-email').value = data.email || '';
                    document.getElementById('customer-phone').value = data.phone || '';
                    document.getElementById('customer-address').value = data.address || '';
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
                modal.removeAttribute('dataset.editingCustomerId'); // Clean up
            }, { once: true });
        }
    },

    /**
     * Saves a new customer or updates an existing one to Firestore.
     */
    saveCustomer: async function() {
        const customerName = document.getElementById('customer-name').value.trim();
        const contactPerson = document.getElementById('contact-person').value.trim();
        const email = document.getElementById('customer-email').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        const address = document.getElementById('customer-address').value.trim();

        if (!customerName || !contactPerson) {
            this.Utils.showMessage('Company Name and Contact Person are required.', 'warning');
            return;
        }

        const customerData = {
            companyName: customerName,
            contactPerson: contactPerson,
            email: email,
            phone: phone,
            address: address,
            updatedAt: new Date()
        };

        try {
            if (this.currentEditingCustomerId) {
                // Update existing customer
                const customerRef = doc(this.db, "customers", this.currentEditingCustomerId);
                await this.Utils.updateDoc(customerRef, customerData);
                this.Utils.showMessage('Customer updated successfully!', 'success');
            } else {
                // Add new customer
                // Ensure creatorId is set ONLY if user is logged in
                if (!this.auth.currentUser) {
                    this.Utils.showMessage('You must be logged in to add a new customer.', 'error');
                    this.closeCustomerModal();
                    return;
                }
                customerData.creatorId = this.auth.currentUser.uid; // Now guaranteed to be a logged-in user's UID
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
        // Remove content from the DOM when destroying
        const customersModuleContent = document.getElementById('customers-module-content');
        if (customersModuleContent) {
            customersModuleContent.innerHTML = '';
        }
    }
};
