// js/customers.js

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, orderBy, startAfter, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';
import { Auth } from './auth.js';

/**
 * The CustomersModule object handles all functionality related to customer management.
 */
export const Customers = {
    db: null,
    auth: null,
    Utils: null,
    unsubscribe: null,
    currentEditingCustomerId: null,
    customersGrid: null,

    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("Customers module initialized.");
    },

    renderCustomersUI: function() {
        const customersModuleContent = document.getElementById('customers-module-content');
        if (!customersModuleContent) {
            console.error("Customers module content area not found in DOM.");
            return;
        }

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
            document.getElementById('go-to-login-btn')?.addEventListener('click', () => {
                window.Main.loadModule('home');
            });
            this.destroy();
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
                                <label for="customer-name-field" class="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input type="text" id="customer-name-field" name="name" required
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

                            <!-- Customer-Specific Fields based on Security Rules -->
                            <div>
                                <label for="customer-type" class="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                                <select id="customer-type" name="customerType" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    <option value="">Select Type</option>
                                    <option value="Individual">Individual</option>
                                    <option value="Business">Business</option>
                                    <option value="Non-Profit">Non-Profit</option>
                                    <option value="Company">Company</option> <!-- Ensure 'Company' is an option -->
                                </select>
                            </div>
                            <div>
                                <label for="contact-method" class="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
                                <select id="contact-method" name="preferredContactMethod"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    <option value="">Select Method</option>
                                    <option value="Email">Email</option>
                                    <option value="Phone">Phone</option>
                                    <option value="SMS">SMS</option>
                                </select>
                            </div>
                            <div>
                                <label for="industry" class="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                                <input type="text" id="industry" name="industry"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div>
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
                                <input type="checkbox" id="customer-active" name="active" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                <label for="customer-active" class="ml-2 block text-sm font-medium text-gray-700">Active Customer?</label>
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
            this.unsubscribe();
        }

        const userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
        if (!userId) {
            console.log("No user ID found, cannot set up customer listener. (User likely not logged in or session expired)");
            this.renderCustomersGrid([]);
            return;
        }

        const customersCollectionRef = collection(this.db, "customers");
        let q;
        if (this.Utils.isAdmin()) {
            q = query(customersCollectionRef);
            console.log("Admin user: Fetching all customers.");
        } else {
            q = query(customersCollectionRef, where("creatorId", "==", userId));
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
     * Updated columns to reflect new fields.
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
            { id: 'name', name: 'Company Name', sort: true, width: 'auto' },
            { id: 'contactPerson', name: 'Contact Person', sort: true, width: 'auto' },
            { id: 'email', name: 'Email', width: 'auto' },
            { id: 'phone', name: 'Phone', width: '150px' },
            { id: 'address', name: 'Address', width: 'auto' },
            { id: 'customerType', name: 'Type', width: '100px' },
            { id: 'industry', name: 'Industry', width: '120px' },
            { id: 'active', name: 'Active', width: '80px', formatter: (cell) => cell ? 'Yes' : 'No' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const customerId = row.cells[0].data;
                    const customerData = customers.find(c => c.id === customerId);
                    const creatorId = customerData?.creatorId;
                    const isCurrentUserCreator = this.auth.currentUser && creatorId === this.auth.currentUser.uid;
                    const canEditOrDelete = this.Utils.isAdmin() || isCurrentUserCreator;

                    if (!canEditOrDelete) {
                        return '';
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
            c.name || '',
            c.contactPerson || '',
            c.email || '',
            c.phone || '',
            c.address || '',
            c.customerType || '',
            c.industry || '',
            c.active || false
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

    attachEventListeners: function() {
        const addCustomerBtn = document.getElementById('add-customer-btn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => this.openCustomerModal('add'));
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

    openCustomerModal: async function(mode, customerId = null) {
        if (!Auth.isLoggedIn()) {
            this.Utils.showMessage('You must be logged in to add/edit customers.', 'error');
            return;
        }

        const modal = document.getElementById('customer-modal');
        const title = document.getElementById('customer-modal-title');
        const form = document.getElementById('customer-form');

        form.reset();
        this.currentEditingCustomerId = null;
        document.getElementById('customer-active').checked = true;

        if (mode === 'edit' && customerId) {
            title.textContent = 'Edit Customer';
            this.currentEditingCustomerId = customerId;
            try {
                const customerDoc = await getDoc(doc(this.db, 'customers', customerId));
                if (customerDoc.exists()) {
                    const data = customerDoc.data();
                    document.getElementById('customer-name-field').value = data.name || '';
                    document.getElementById('contact-person').value = data.contactPerson || '';
                    document.getElementById('customer-email').value = data.email || '';
                    document.getElementById('customer-phone').value = data.phone || '';
                    document.getElementById('customer-address').value = data.address || '';
                    document.getElementById('customer-type').value = data.customerType || '';
                    document.getElementById('contact-method').value = data.preferredContactMethod || '';
                    document.getElementById('industry').value = data.industry || '';
                    document.getElementById('customer-source').value = data.customerSource || '';
                    document.getElementById('additional-details').value = data.additionalDetails || '';
                    document.getElementById('customer-active').checked = data.active !== false;
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
            document.getElementById('customer-type').value = '';
            document.getElementById('contact-method').value = '';
            document.getElementById('industry').value = '';
            document.getElementById('customer-source').value = '';
            document.getElementById('additional-details').value = '';
            document.getElementById('customer-active').checked = true;
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('div').classList.remove('opacity-0', 'scale-95');
        }, 10);
    },

    closeCustomerModal: function() {
        const modal = document.getElementById('customer-modal');
        if (modal) {
            modal.querySelector('div').classList.add('opacity-0', 'scale-95');
            modal.addEventListener('transitionend', () => {
                modal.classList.add('hidden');
                modal.removeAttribute('dataset.editingCustomerId');
            }, { once: true });
        }
    },

    /**
     * Checks for customer uniqueness based on type (email for Individual, name+type for Company).
     * @param {string} customerId - The ID of the current customer being edited (null for new).
     * @param {string} customerType - The type of customer ('Individual' or 'Company').
     * @param {string} name - The company name.
     * @param {string} email - The customer email.
     * @returns {Promise<boolean>} True if unique, false if a duplicate is found.
     */
    checkCustomerUniqueness: async function(customerId, customerType, name, email) {
        const customersCollectionRef = collection(this.db, "customers");
        let q;

        if (customerType === 'Individual') {
            if (!email) {
                this.Utils.showMessage('Email is required for Individual customers.', 'warning');
                return false;
            }
            q = query(customersCollectionRef, where("email", "==", email));
        } else if (customerType === 'Company') {
            if (!name) {
                this.Utils.showMessage('Company Name is required for Company customers.', 'warning');
                return false;
            }
            // For composite index: name + customerType
            q = query(customersCollectionRef,
                      where("name", "==", name),
                      where("customerType", "==", customerType));
        } else {
            // For other types or if type is not selected, assume no specific uniqueness check or handle as needed
            // For now, we'll let it pass if not Individual or Company, but could add a generic name check if desired.
            return true;
        }

        try {
            const querySnapshot = await getDocs(q);
            let isUnique = true;
            querySnapshot.forEach(docSnap => {
                // If in edit mode, allow the current customer's own document to be matched
                if (docSnap.id !== customerId) {
                    isUnique = false;
                }
            });
            return isUnique;
        } catch (error) {
            this.Utils.handleError(error, "checking customer uniqueness");
            return false; // Assume not unique or error occurred
        }
    },


    saveCustomer: async function() {
        if (!Auth.isLoggedIn()) {
            this.Utils.showMessage('You must be logged in to add a new customer.', 'error');
            this.closeCustomerModal();
            return;
        }

        const name = document.getElementById('customer-name-field').value.trim();
        const contactPerson = document.getElementById('contact-person').value.trim();
        const email = document.getElementById('customer-email').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        const address = document.getElementById('customer-address').value.trim();
        const customerType = document.getElementById('customer-type').value || '';
        const preferredContactMethod = document.getElementById('contact-method').value || '';
        const industry = document.getElementById('industry').value.trim() || '';
        const customerSource = document.getElementById('customer-source').value.trim() || '';
        const additionalDetails = document.getElementById('additional-details').value.trim() || '';
        const active = document.getElementById('customer-active').checked;

        if (!name || !contactPerson || !customerType) { // customerType is now required for uniqueness logic
            this.Utils.showMessage('Company Name, Contact Person, and Customer Type are required.', 'warning');
            return;
        }

        // --- NEW: Perform uniqueness check before saving ---
        const isUnique = await this.checkCustomerUniqueness(
            this.currentEditingCustomerId,
            customerType,
            name,
            email
        );

        if (!isUnique) {
            let message = '';
            if (customerType === 'Individual') {
                message = `An Individual customer with email "${email}" already exists.`;
            } else if (customerType === 'Company') {
                message = `A Company customer with name "${name}" and type "${customerType}" already exists.`;
            } else {
                message = `A customer with the same unique identifier already exists.`;
            }
            this.Utils.showMessage(message, 'warning');
            return; // Stop saving if not unique
        }
        // --- END NEW ---

        const customerData = {
            name: name,
            contactPerson: contactPerson,
            email: email,
            phone: phone,
            address: address,
            customerType: customerType,
            preferredContactMethod: preferredContactMethod,
            industry: industry,
            additionalDetails: additionalDetails,
            customerSource: customerSource,
            active: active,
            updatedAt: new Date()
        };

        try {
            if (this.currentEditingCustomerId) {
                const customerRef = doc(this.db, "customers", this.currentEditingCustomerId);
                await this.Utils.updateDoc(customerRef, customerData);
                this.Utils.showMessage('Customer updated successfully!', 'success');
            } else {
                customerData.creatorId = this.auth.currentUser.uid;
                customerData.createdAt = new Date();
                await addDoc(collection(this.db, "customers"), customerData);
                this.Utils.showMessage('Customer added successfully!', 'success');
            }
            this.closeCustomerModal();
        } catch (error) {
            this.Utils.handleError(error, "saving customer");
        }
    },

    deleteCustomer: async function(customerId, customerName) {
        if (!Auth.isLoggedIn()) {
            this.Utils.showMessage('You must be logged in to delete customers.', 'error');
            return;
        }

        this.Utils.showMessage(`Are you sure you want to delete customer "${customerName}"?`, 'warning', 0);

        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('div');
            const existingButtons = messageBox.querySelectorAll('button:not(#message-close-btn)');
            existingButtons.forEach(btn => btn.remove());

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete';
            confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2 transition-colors duration-200';
            confirmBtn.onclick = async () => {
                try {
                    await deleteDoc(doc(this.db, "customers", customerId));
                    this.Utils.showMessage('Customer deleted successfully!', 'success');
                    messageModalContainer.classList.add('hidden');
                } catch (error) {
                    this.Utils.handleError(error, "deleting customer");
                    messageModalContainer.classList.add('hidden');
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
        const customersModuleContent = document.getElementById('customers-module-content');
        if (customersModuleContent) {
            customersModuleContent.innerHTML = '';
        }
    }
};
