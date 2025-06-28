// js/customers.js

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The CustomersModule object handles all functionality related to customer management.
 */
export const Customers = {
    db: null,       // Firestore database instance
    auth: null,     // Firebase Auth instance
    Utils: null,    // Utility functions instance
    unsubscribe: null, // To store the unsubscribe function for real-time listener
    currentCustomerId: null, // Used for editing an existing customer
    currentCustomerData: null, // Used for editing an existing customer
    grid: null, // Grid.js instance for the customer table

    /**
     * Initializes the Customers module. This function is called by main.js.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;

        console.log("Customers module initialized.");

        this.renderCustomersUI(); // Render the initial UI for customers
        this.setupRealtimeListener(); // Set up real-time data listener
        this.attachEventListeners(); // Attach UI event listeners
    },

    /**
     * Renders the main UI for the Customers module.
     * This includes the Add New Customer button and the container for the data grid.
     */
    renderCustomersUI: function() {
        const customerModuleContent = document.getElementById('customers-module-content');
        if (customerModuleContent) {
            customerModuleContent.innerHTML = `
                <!-- Grid.js CSS and JS are now loaded globally in index.html, removed from here -->
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800">Customer List</h3>
                        <button id="add-customer-btn"
                            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            <i class="fas fa-plus mr-2"></i> Add New Customer
                        </button>
                    </div>
                    <!-- Container for the Customer Data Grid -->
                    <div id="customer-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                </div>

                <!-- Customer Add/Edit Modal (initially hidden) -->
                <div id="customer-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-lg w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="customer-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Customer</h4>
                        <form id="customer-form">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label for="customer-name" class="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                                    <input type="text" id="customer-name" name="name" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="customer-email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" id="customer-email" name="email"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="customer-phone" class="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input type="tel" id="customer-phone" name="phone"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <!-- Address changed to textarea -->
                                <div>
                                    <label for="customer-address" class="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea id="customer-address" name="address" rows="3"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                                </div>

                                <!-- Existing New Fields -->
                                <div>
                                    <label for="customer-type" class="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                                    <select id="customer-type" name="customerType"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <option value="">Select Type</option>
                                        <option value="Individual">Individual</option>
                                        <option value="Company">Company</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="preferred-contact-method" class="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
                                    <select id="preferred-contact-method" name="preferredContactMethod"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <option value="">Select Method</option>
                                        <option value="Email">Email</option>
                                        <option value="Phone">Phone</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="industry" class="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                                    <select id="industry" name="industry"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <option value="">Select Industry</option>
                                        <option value="Technology">Technology</option>
                                        <option value="Finance">Finance</option>
                                        <option value="Healthcare">Healthcare</option>
                                        <option value="Retail">Retail</option>
                                        <option value="Education">Education</option>
                                        <option value="Manufacturing">Manufacturing</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <!-- Latest New Fields -->
                                <div>
                                    <label for="customer-source" class="block text-sm font-medium text-gray-700 mb-1">Customer Source</label>
                                    <select id="customer-source" name="customerSource"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <option value="">Select Source</option>
                                        <option value="Website">Website</option>
                                        <option value="Referral">Referral</option>
                                        <option value="Social Media">Social Media</option>
                                        <option value="Advertisement">Advertisement</option>
                                        <option value="Event">Event</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="active-status" class="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
                                    <select id="active-status" name="active"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                                <div class="col-span-1 md:col-span-2"> <!-- This textarea spans both columns on medium screens and up -->
                                    <label for="additional-details" class="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
                                    <textarea id="additional-details" name="additionalDetails" rows="3"
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
        }
    },

    /**
     * Sets up the real-time listener for the 'customers' collection in Firestore.
     * Updates the Grid.js table whenever data changes.
     */
    setupRealtimeListener: function() {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        const q = query(collection(this.db, "customers"));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const customers = [];
            snapshot.forEach((customerDoc) => {
                customers.push({ id: customerDoc.id, ...customerDoc.data() });
            });
            this.customersData = customers; // Cache for easy access in edit/delete
            console.log("Customers data updated:", customers);
            this.renderCustomerGrid(customers);
        }, (error) => {
            this.Utils.handleError(error, "fetching customers data");
        });
    },

    /**
     * Renders or updates the Grid.js table with the provided customer data.
     * @param {Array<object>} customers - An array of customer objects.
     */
    renderCustomerGrid: function(customers) {
        const gridContainer = document.getElementById('customer-grid-container');
        if (!gridContainer) {
            console.error("Customer grid container not found.");
            return;
        }

        // Define columns for Grid.js - These reference the object properties directly by 'id'
        const columns = [
            // The 'id' property here refers to the key in the data object, not an array index.
            // We are NOT adding a column for `id` itself in the visual grid.
            { id: 'name', name: 'Customer Name', sort: true },
            { id: 'email', name: 'Email', sort: true },
            { id: 'phone', name: 'Phone' },
            { id: 'customerType', name: 'Type' },
            { id: 'industry', name: 'Industry' },
            { id: 'customerSource', name: 'Source' },
            { id: 'active', name: 'Active' },
            {
                name: 'Actions',
                formatter: (cell, row) => {
                    // Access original data object for the row directly
                    const customerId = row.original.id;
                    const customerName = row.original.name;

                    return gridjs.h('div', {
                        className: 'flex space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.editCustomer(customerId)
                        }, 'Edit'),
                        gridjs.h('button', {
                            className: 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.deleteCustomer(customerId, customerName)
                        }, 'Delete')
                    ]);
                }
            }
        ];

        // CRITICAL FIX: Map data to an array of OBJECTS, not arrays of arrays.
        // The keys of these objects should match the 'id' properties in the 'columns' array.
        const mappedData = customers.map(c => ({
            id: c.id, // Keep ID as a property for internal use by actions formatter
            name: c.name || '',
            email: c.email || '',
            phone: c.phone || '',
            customerType: c.customerType || '',
            industry: c.industry || '',
            customerSource: c.customerSource || '',
            active: c.active || 'Active', // Default 'Active' if missing
            // Other fields (address, additionalDetails, etc.) are part of the object
            // but not explicitly listed as columns, which is fine.
        }));

        if (this.grid) {
            this.grid.updateConfig({
                data: mappedData // Pass array of objects
            }).forceRender();
        } else {
            this.grid = new gridjs.Grid({
                columns: columns,
                data: mappedData, // Pass array of objects
                sort: true,
                search: true,
                pagination: {
                    limit: 10 // Items per page
                },
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
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
     * Attaches event listeners for UI interactions (Add button, form submission, modal close).
     */
    attachEventListeners: function() {
        document.getElementById('add-customer-btn').addEventListener('click', () => this.openCustomerModal('add'));

        const customerForm = document.getElementById('customer-form');
        if (customerForm) {
            customerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCustomer();
            });
        }

        document.getElementById('cancel-customer-btn').addEventListener('click', () => this.closeCustomerModal());

        // Close modal when clicking outside of it
        const customerModal = document.getElementById('customer-modal');
        if (customerModal) {
            customerModal.addEventListener('click', (e) => {
                if (e.target === customerModal) { // Only close if click is directly on the overlay
                    this.closeCustomerModal();
                }
            });
        }
    },

    /**
     * Opens the customer add/edit modal.
     * @param {string} mode - 'add' or 'edit'.
     * @param {object} [customerData=null] - Data for the customer if in 'edit' mode.
     */
    openCustomerModal: function(mode, customerData = null) {
        const modal = document.getElementById('customer-modal');
        const title = document.getElementById('customer-modal-title');
        const form = document.getElementById('customer-form');

        // Reset form fields
        form.reset();
        this.currentCustomerId = null; // Clear current ID
        this.currentCustomerData = null; // Clear current data

        if (mode === 'edit' && customerData) {
            title.textContent = 'Edit Customer';
            this.currentCustomerId = customerData.id;
            this.currentCustomerData = customerData;
            document.getElementById('customer-name').value = customerData.name || '';
            document.getElementById('customer-email').value = customerData.email || '';
            document.getElementById('customer-phone').value = customerData.phone || '';
            document.getElementById('customer-address').value = customerData.address || '';
            document.getElementById('customer-type').value = customerData.customerType || '';
            document.getElementById('preferred-contact-method').value = customerData.preferredContactMethod || '';
            document.getElementById('industry').value = customerData.industry || '';
            document.getElementById('additional-details').value = customerData.additionalDetails || '';
            document.getElementById('customer-source').value = customerData.customerSource || '';
            document.getElementById('active-status').value = customerData.active || 'Active';
        } else {
            title.textContent = 'Add New Customer';
            // Set default values for new entries
            document.getElementById('customer-type').value = '';
            document.getElementById('preferred-contact-method').value = '';
            document.getElementById('industry').value = '';
            document.getElementById('customer-source').value = '';
            document.getElementById('active-status').value = 'Active'; // Default 'Active' for new customers
        }

        // Show the modal with animation
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('div').classList.remove('opacity-0', 'scale-95');
        }, 10);
    },

    /**
     * Closes the customer add/edit modal.
     */
    closeCustomerModal: function() {
        const modal = document.getElementById('customer-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => {
            modal.classList.add('hidden');
        }, { once: true });
    },

    /**
     * Saves a new customer or updates an existing one to Firestore.
     */
    saveCustomer: async function() {
        const name = document.getElementById('customer-name').value.trim();
        const email = document.getElementById('customer-email').value.trim();
        const phone = document.getElementById('customer-phone').value.trim();
        const address = document.getElementById('customer-address').value.trim();
        const customerType = document.getElementById('customer-type').value;
        const preferredContactMethod = document.getElementById('preferred-contact-method').value;
        const industry = document.getElementById('industry').value;
        const additionalDetails = document.getElementById('additional-details').value.trim();
        const customerSource = document.getElementById('customer-source').value;
        const active = document.getElementById('active-status').value;


        if (!name) {
            this.Utils.showMessage('Customer Name is required.', 'warning');
            return;
        }

        // --- DUPLICATE CHECK LOGIC START ---
        if (!this.currentCustomerId) { // Only perform duplicate check when adding a new customer
            const customersRef = collection(this.db, "customers");
            let q;
            let errorMessage = '';

            if (customerType === 'Individual' && email) {
                // For individuals, unique on email
                q = query(customersRef, where("email", "==", email));
                errorMessage = `A customer with the email "${email}" already exists.`;
            } else if (customerType === 'Company' && name) {
                // For companies, unique on name AND customerType
                q = query(customersRef, where("name", "==", name), where("customerType", "==", "Company"));
                errorMessage = `A company with the name "${name}" already exists.`;
            } else {
                // Fallback or if required fields are missing for uniqueness check
                if (!email && !name) {
                     this.Utils.showMessage('For new customers, please provide at least an Email (for individuals) or Customer Name (for companies) for uniqueness check.', 'warning');
                     return;
                }
                // Default to a simple name check if type is not selected or for mixed cases
                q = query(customersRef, where("name", "==", name));
                errorMessage = `A customer with the name "${name}" already exists. Please provide more unique details like email or verify customer type.`;
            }

            if (q) { // Only execute query if 'q' was successfully defined
                try {
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        this.Utils.showMessage(errorMessage, 'error');
                        return; // Stop execution if duplicate found
                    }
                } catch (error) {
                    this.Utils.handleError(error, "checking for duplicate customer");
                    return; // Stop if there's an error during the check
                }
            }
        }
        // --- DUPLICATE CHECK LOGIC END ---


        try {
            const customerData = {
                name,
                email,
                phone,
                address,
                customerType: customerType,
                preferredContactMethod: preferredContactMethod,
                industry: industry,
                additionalDetails: additionalDetails,
                customerSource: customerSource,
                active: active,
                updatedAt: new Date(),
            };

            if (this.currentCustomerId) {
                // Update existing customer
                await updateDoc(doc(this.db, "customers", this.currentCustomerId), customerData);
                this.Utils.showMessage('Customer updated successfully!', 'success');
            } else {
                // Add new customer
                customerData.createdAt = new Date();
                customerData.creatorId = this.auth.currentUser ? this.auth.currentUser.uid : null; // Ensure creatorId is set for new customers
                if (!customerData.creatorId) {
                    this.Utils.showMessage('You must be logged in to create a customer.', 'error');
                    return;
                }
                await addDoc(collection(this.db, "customers"), customerData);
                this.Utils.showMessage('Customer added successfully!', 'success');
            }
            this.closeCustomerModal();
        } catch (error) {
            this.Utils.handleError(error, "saving customer");
        }
    },

    /**
     * Handles editing a customer. Fetches data and opens modal in edit mode.
     * @param {string} id - The document ID of the customer to edit.
     */
    editCustomer: function(id) {
        // Find the customer data from the currently loaded customers array
        // (assuming this.customersData contains the latest data from onSnapshot)
        const customerToEdit = this.customersData.find(c => c.id === id);
        if (customerToEdit) {
            this.openCustomerModal('edit', customerToEdit);
        } else {
            this.Utils.showMessage('Customer not found for editing.', 'error');
        }
    },

    /**
     * Deletes a customer from Firestore after confirmation.
     * @param {string} id - The document ID of the customer to delete.
     * @param {string} name - The name of the customer for confirmation message.
     */
    deleteCustomer: async function(id, name) {
        // Implement a custom confirmation modal instead of browser's confirm()
        this.Utils.showMessage(`Are you sure you want to delete "${name}"?`, 'warning', 0); // 0 duration for persistent message

        // Add confirmation buttons to the message modal
        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('.p-6'); // Find the message box element
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete';
            confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2';
            confirmBtn.onclick = async () => {
                try {
                    await deleteDoc(doc(this.db, "customers", id));
                    this.Utils.showMessage('Customer deleted successfully!', 'success');
                    messageModalContainer.remove(); // Close confirmation modal
                } catch (error) {
                    this.Utils.handleError(error, "deleting customer");
                    messageModalContainer.remove(); // Close confirmation modal on error too
                }
            };

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg mt-4';
            cancelBtn.onclick = () => {
                messageModalContainer.remove(); // Close confirmation modal
                this.Utils.showMessage('Deletion cancelled.', 'info');
            };

            // Remove existing buttons if any and append new ones
            const existingButtons = messageBox.querySelectorAll('button:not(.absolute.top-2)');
            existingButtons.forEach(btn => btn.remove());

            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'flex justify-end pt-4 border-t border-gray-200 mt-4';
            buttonContainer.appendChild(cancelBtn);
            buttonContainer.appendChild(confirmBtn);
            messageBox.appendChild(buttonContainer);
        }
    },

    /**
     * Detaches the real-time listener when the module is no longer active.
     * (Currently not explicitly called, but good practice for cleanup when navigating away
     * if the UI is completely replaced.)
     */
    destroy: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("Customers module listener unsubscribed.");
        }
        if (this.grid) {
            this.grid.destroy(); // Destroy Grid.js instance
            this.grid = null;
        }
    }
};

// This array will hold the current customer data for easy access during edit operations
Customers.customersData = [];
