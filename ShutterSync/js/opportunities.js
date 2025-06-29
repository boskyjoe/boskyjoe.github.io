// js/opportunities.js

// Ensure Grid.js is loaded globally in index.html, not here.
// <link href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" />
// <script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The Opportunities object handles all functionality related to opportunity management.
 */
export const Opportunities = {
    db: null,       // Firestore database instance
    auth: null,     // Firebase Auth instance
    unsubscribe: null, // To store the unsubscribe function for real-time listener (main opportunities)
    selectedOpportunityId: null, // Stores the ID of the currently selected opportunity for detail view
    opportunitiesData: [], // Cache for main opportunities data
    grid: null, // Grid.js instance for main opportunities table
    currenciesMap: new Map(), // Cache for currency data (code -> {name, symbol_native})

    /**
     * Initializes the Opportunities module. This function is called by main.js.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;

        console.log("Opportunities module initialized.");

        this.renderOpportunitiesUI(); // Render the initial UI
        this.setupRealtimeListener(); // Set up real-time data listener
        this.attachEventListeners(); // Attach UI event listeners
    },

    /**
     * Renders the main UI for the Opportunities module.
     * This includes the Add New Opportunity button, data grid container, and detail view area.
     */
    renderOpportunitiesUI: function() {
        const opportunitiesModuleContent = document.getElementById('opportunities-module-content');
        if (opportunitiesModuleContent) {
            opportunitiesModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800">Opportunity List</h3>
                        <button id="add-opportunity-btn"
                            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            <i class="fas fa-plus mr-2"></i> Add New Opportunity
                        </button>
                    </div>
                    <div id="opportunity-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                </div>

                <div id="opportunity-detail-view" class="bg-white p-6 rounded-lg shadow-md mt-6 hidden">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4" id="detail-view-title">Opportunity Details</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div><strong class="text-gray-700">Name:</strong> <span id="detail-name"></span></div>
                        <div><strong class="text-gray-700">Customer:</strong> <span id="detail-customer"></span></div>
                        <div><strong class="text-gray-700">Status:</strong> <span id="detail-status"></span></div>
                        <div><strong class="text-gray-700">Value:</strong> <span id="detail-value"></span></div>
                        <div><strong class="text-gray-700">Currency:</strong> <span id="detail-currency"></span></div>
                        <div><strong class="text-gray-700">Event Type:</strong> <span id="detail-event-type"></span></div>
                        <div class="col-span-1 md:col-span-2"><strong class="text-gray-700">Location:</strong> <span id="detail-location"></span></div>
                        <div class="col-span-1 md:col-span-2"><strong class="text-gray-700">Description:</strong> <span id="detail-description"></span></div>
                        <div><strong class="text-gray-700">Active:</strong> <span id="detail-active"></span></div>
                        <div><strong class="text-gray-700">Close Date:</strong> <span id="detail-close-date"></span></div>
                        <div><strong class="text-gray-700">Created By:</strong> <span id="detail-created-by"></span></div>
                        <div><strong class="text-gray-700">Created At:</strong> <span id="detail-created-at"></span></div>
                        <div><strong class="text-gray-700">Updated At:</strong> <span id="detail-updated-at"></span></div>
                    </div>

                    <div class="mt-8 border-t pt-6 border-gray-200">
                        <h4 class="text-xl font-semibold text-gray-800 mb-4">Related Information</h4>

                        <div class="bg-gray-50 p-4 rounded-lg mb-4">
                            <div class="flex justify-between items-center mb-4">
                                <h5 class="text-lg font-semibold text-gray-700">Opportunity Lines</h5>
                                <button id="add-line-btn" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"><i class="fas fa-plus mr-1"></i> Add Line</button>
                            </div>
                            <div id="opportunity-lines-grid" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                        </div>

                        <div class="bg-gray-50 p-4 rounded-lg mb-4">
                            <div class="flex justify-between items-center mb-4">
                                <h5 class="text-lg font-semibold text-gray-700">Opportunity Contacts</h5>
                                <button id="add-contact-btn" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"><i class="fas fa-plus mr-1"></i> Add Contact</button>
                            </div>
                            <div id="opportunity-contacts-grid" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                        </div>

                        <div class="bg-gray-50 p-4 rounded-lg">
                            <div class="flex justify-between items-center mb-4">
                                <h5 class="text-lg font-semibold text-gray-700">Quotes</h5>
                                <button id="add-quote-btn" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md text-sm"><i class="fas fa-plus mr-1"></i> Add Quote</button>
                            </div>
                            <div id="opportunity-quotes-grid" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                        </div>
                    </div>

                    <div class="flex justify-end space-x-3 mt-6">
                        <button id="close-detail-btn"
                            class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                            Close Details
                        </button>
                    </div>
                </div>

                <!-- Opportunity Add/Edit Modal (initially hidden) -->
                <div id="opportunity-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-lg w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="opportunity-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Opportunity</h4>
                        <form id="opportunity-form">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label for="opportunity-name" class="block text-sm font-medium text-gray-700 mb-1">Opportunity Name</label>
                                    <input type="text" id="opportunity-name" name="name" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="opportunity-customer" class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                    <select id="opportunity-customer" name="customer" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <!-- Options will be dynamically loaded from customers collection -->
                                    </select>
                                </div>
                                <div>
                                    <label for="opportunity-status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select id="opportunity-status" name="status"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <option value="Prospecting">Prospecting</option>
                                        <option value="Qualification">Qualification</option>
                                        <option value="Proposal">Proposal</option>
                                        <option value="Negotiation">Negotiation</option>
                                        <option value="Closed Won">Closed Won</option>
                                        <option value="Closed Lost">Closed Lost</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="opportunity-close-date" class="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
                                    <input type="date" id="opportunity-close-date" name="closeDate"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>

                                <!-- NEW FIELD: Currency - Moved up -->
                                <div>
                                    <label for="opportunity-currency" class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <select id="opportunity-currency" name="currency" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <!-- Options will be dynamically loaded from currencies_data collection -->
                                    </select>
                                </div>
                                <!-- NEW FIELD: Value - Conditional visibility -->
                                <div id="opportunity-value-group" class="hidden">
                                    <label for="opportunity-value" class="block text-sm font-medium text-gray-700 mb-1">Value ($)</label>
                                    <input type="number" id="opportunity-value" name="value" step="0.01" min="0"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>

                                <div>
                                    <label for="opportunity-event-type" class="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                                    <select id="opportunity-event-type" name="eventType"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <option value="">Select Type</option>
                                        <option value="Save the Day">Save the Day</option>
                                        <option value="Pre-Wedding Photo Shoot">Pre-Wedding Photo Shoot</option>
                                        <option value="Wedding">Wedding</option>
                                        <option value="Post-Wedding Photo Shoot">Post-Wedding Photo Shoot</option>
                                        <option value="Baby Shower">Baby Shower</option>
                                        <option value="Corporate Event">Corporate Event</option>
                                        <option value="Product Launch">Product Launch</option>
                                        <option value="Political Meeting">Political Meeting</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="opportunity-active-status" class="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
                                    <select id="opportunity-active-status" name="active"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>

                                <div class="col-span-1 md:col-span-2">
                                    <label for="opportunity-location" class="block text-sm font-medium text-gray-700 mb-1">Proposed Event Location</label>
                                    <textarea id="opportunity-location" name="proposedEventLocation" rows="3"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                                </div>
                                <div class="col-span-1 md:col-span-2">
                                    <label for="opportunity-description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea id="opportunity-description" name="description" rows="3"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                                </div>
                            </div>
                            <div class="flex justify-end space-x-3 mt-6">
                                <button type="button" id="cancel-opportunity-btn"
                                    class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                    Cancel
                                </button>
                                <button type="submit" id="save-opportunity-btn"
                                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                    Save Opportunity
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Sets up the real-time listener for the 'opportunities' collection.
     * Filters opportunities based on creatorId for non-admin users.
     */
    setupRealtimeListener: function() {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        let q;
        if (this.Utils.isAdmin()) {
            // Admins can see all opportunities
            q = query(collection(this.db, "opportunities"));
            console.log("Admin user: Fetching all opportunities.");
        } else {
            // Non-admin users can only see opportunities they created
            const currentUserId = this.auth.currentUser ? this.auth.currentUser.uid : null;
            if (!currentUserId) {
                console.warn("User not logged in, cannot fetch opportunities.");
                this.Utils.showMessage("Please log in to view opportunities.", "info");
                return;
            }
            q = query(collection(this.db, "opportunities"), where("creatorId", "==", currentUserId));
            console.log("Standard user: Fetching opportunities created by:", currentUserId);
        }

        this.unsubscribe = onSnapshot(q, async (snapshot) => {
            const opportunities = [];
            // Renamed 'doc' to 'opportunityDoc' to avoid shadowing the imported 'doc' function
            for (const opportunityDoc of snapshot.docs) {
                const oppData = opportunityDoc.data();
                const oppId = opportunityDoc.id;

                // Fetch customer name for display
                let customerName = 'N/A';
                if (oppData.customerId) {
                    try {
                        const customerDoc = await getDoc(doc(this.db, 'customers', oppData.customerId));
                        if (customerDoc.exists()) {
                            customerName = customerDoc.data().name;
                        }
                    } catch (error) {
                        console.error("Error fetching customer name:", error);
                    }
                }

                // Fetch creator's display name
                let createdByDisplayName = 'Unknown User';
                if (oppData.creatorId) {
                    try {
                        const userDoc = await getDoc(doc(this.db, 'users_data', oppData.creatorId));
                        if (userDoc.exists()) {
                            createdByDisplayName = userDoc.data().displayName || userDoc.data().email || 'Unknown User';
                        }
                    } catch (error) {
                        console.error("Error fetching creator name:", error);
                    }
                }

                // Get currency symbol for display from cached map
                let currencySymbolNative = '';
                if (oppData.currency && this.currenciesMap.has(oppData.currency)) {
                    currencySymbolNative = this.currenciesMap.get(oppData.currency).symbol_native;
                }

                opportunities.push({
                    id: oppId,
                    name: oppData.name,
                    customerId: oppData.customerId, // Keep customer ID for reference
                    customerName: customerName, // Display customer name
                    status: oppData.status,
                    value: oppData.value,
                    currency: oppData.currency || '',
                    currencySymbolNative: currencySymbolNative, // Stored for grid display
                    eventType: oppData.eventType || '',
                    proposedEventLocation: oppData.proposedEventLocation || '',
                    description: oppData.description || '',
                    active: oppData.active || 'Active',
                    closeDate: oppData.closeDate,
                    creatorId: oppData.creatorId,
                    creatorName: createdByDisplayName,
                    createdAt: oppData.createdAt ? oppData.createdAt.toDate() : null,
                    updatedAt: oppData.updatedAt ? oppData.updatedAt.toDate() : null
                });
            }
            this.opportunitiesData = opportunities; // Cache the data
            console.log("Opportunities data updated:", opportunities);
            this.renderOpportunityGrid(opportunities);
        }, (error) => {
            this.Utils.handleError(error, "fetching opportunities data");
        });
    },

    /**
     * Renders or updates the Grid.js table with the provided opportunity data.
     * @param {Array<object>} opportunities - An array of opportunity objects.
     */
    renderOpportunityGrid: function(opportunities) {
        const gridContainer = document.getElementById('opportunity-grid-container');
        if (!gridContainer) {
            console.error("Opportunity grid container not found.");
            return;
        }

        // Define columns for Grid.js
        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'name', name: 'Opportunity Name', sort: true },
            { id: 'customerName', name: 'Customer', sort: true },
            { id: 'status', name: 'Status', sort: true },
            // UPDATED: Value formatter to include symbol_native
            {
                id: 'value',
                name: 'Value',
                sort: true,
                formatter: (cell, row) => {
                    const value = parseFloat(cell || 0).toFixed(2);
                    const currencyCode = row.cells[5].data; // Currency code from mappedData array
                    let symbolNative = '';
                    if (currencyCode && this.currenciesMap.has(currencyCode)) {
                        symbolNative = this.currenciesMap.get(currencyCode).symbol_native;
                    }

                    // Display symbol_native and currencyCode for clarity
                    return `${symbolNative}${value} (${currencyCode})`;
                }
            },
            { id: 'currency', name: 'Currency', sort: true },
            { id: 'eventType', name: 'Event Type', sort: true },
            { id: 'active', name: 'Active', sort: true },
            { id: 'closeDate', name: 'Close Date', sort: true },
            { id: 'creatorName', name: 'Created By', sort: true },
            {
                name: 'Actions',
                formatter: (cell, row) => {
                    const oppId = row.cells[0].data; // ID from the first mapped element
                    const oppName = row.cells[1].data; // Name from the second mapped element (Opportunity Name)

                    const opp = this.opportunitiesData.find(o => o.id === oppId);
                    const isCreator = opp && opp.creatorId === (this.auth.currentUser ? this.auth.currentUser.uid : null);
                    const isAdmin = this.Utils.isAdmin();

                    const canEditDelete = isCreator || isAdmin;

                    return gridjs.h('div', {
                        className: 'flex space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.viewOpportunityDetails(oppId)
                        }, 'View'),
                        canEditDelete ? gridjs.h('button', {
                            className: 'bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.editOpportunity(oppId)
                        }, 'Edit') : '',
                        canEditDelete ? gridjs.h('button', {
                            className: 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.deleteOpportunity(oppId, oppName)
                        }, 'Delete') : ''
                    ]);
                }
            }
        ];

        // Map data to an array of ARRAYS. Order must match the 'columns' array.
        const mappedData = opportunities.map(o => [
            o.id,                   // 0: ID (hidden)
            o.name,                 // 1: Opportunity Name
            o.customerName,         // 2: Customer
            o.status,               // 3: Status
            o.value,                // 4: Value
            o.currency,             // 5: Currency (code, e.g., "USD")
            o.eventType,            // 6: Event Type
            o.active,               // 7: Active
            o.closeDate,            // 8: Close Date
            o.creatorName           // 9: Created By
        ]);

        if (this.grid) {
            this.grid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
            this.grid = new gridjs.Grid({
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
     * Attaches event listeners for UI interactions (Add button, form submission, modal close, etc.).
     */
    attachEventListeners: function() {
        document.getElementById('add-opportunity-btn').addEventListener('click', () => this.openOpportunityModal('add'));

        const opportunityForm = document.getElementById('opportunity-form');
        if (opportunityForm) {
            opportunityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveOpportunity();
            });
        }

        document.getElementById('cancel-opportunity-btn').addEventListener('click', () => this.closeOpportunityModal());

        const opportunityModal = document.getElementById('opportunity-modal');
        if (opportunityModal) {
            opportunityModal.addEventListener('click', (e) => {
                if (e.target === opportunityModal) {
                    this.closeOpportunityModal();
                }
            });
        }

        // Event listener for closing the detail view
        document.getElementById('close-detail-btn').addEventListener('click', () => {
            document.getElementById('opportunity-detail-view').classList.add('hidden');
            this.selectedOpportunityId = null; // Clear selected ID
            // Optionally, re-render the main grid or ensure it's visible
        });

        // Event listener for Currency dropdown change
        const currencySelect = document.getElementById('opportunity-currency');
        if (currencySelect) {
            currencySelect.addEventListener('change', () => {
                const valueGroup = document.getElementById('opportunity-value-group');
                const valueInput = document.getElementById('opportunity-value');
                if (currencySelect.value) { // If a currency is selected
                    valueGroup.classList.remove('hidden');
                } else { // If no currency is selected
                    valueGroup.classList.add('hidden');
                    valueInput.value = ''; // Clear value if currency is deselected
                }
            });
        }

        // Attach listeners for related object buttons (these will trigger sub-modals/actions)
        document.getElementById('add-line-btn').addEventListener('click', () => this.Utils.showMessage('Add Opportunity Line functionality coming soon!', 'info'));
        document.getElementById('add-contact-btn').addEventListener('click', () => this.Utils.showMessage('Add Opportunity Contact functionality coming soon!', 'info'));
        document.getElementById('add-quote-btn').addEventListener('click', () => this.Utils.showMessage('Add Quote functionality coming soon!', 'info'));
    },

    /**
     * Populates the customer dropdown in the opportunity modal.
     */
    populateCustomerDropdown: async function() {
        const customerSelect = document.getElementById('opportunity-customer');
        customerSelect.innerHTML = '<option value="">Select a Customer</option>'; // Default empty option

        try {
            const customersCollection = collection(this.db, "customers");
            const q = query(customersCollection);
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const customer = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = customer.name;
                customerSelect.appendChild(option);
            });
        } catch (error) {
            this.Utils.handleError(error, "populating customer dropdown");
        }
    },

    /**
     * Populates the currency dropdown in the opportunity modal.
     * Caches currency data in `this.currenciesMap` for later use.
     */
    populateCurrencyDropdown: async function() {
        const currencySelect = document.getElementById('opportunity-currency');
        currencySelect.innerHTML = '<option value="">Select a Currency</option>'; // Default empty option
        this.currenciesMap.clear(); // Clear previous cache

        try {
            const currenciesCollection = collection(this.db, "app_metadata/app_settings/currencies_data");
            const q = query(currenciesCollection);
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const currency = doc.data();
                // Cache the full currency data by its code
                this.currenciesMap.set(currency.currencyCode, {
                    name: currency.currencyName,
                    symbol: currency.symbol, // Keeping 'symbol' for potential future use or if it's there
                    symbol_native: currency.symbol_native
                });

                const option = document.createElement('option');
                option.value = currency.currencyCode;
                option.textContent = `${currency.currencyName} (${currency.currencyCode}) - ${currency.symbol_native}`;
                currencySelect.appendChild(option);
            });
        } catch (error) {
            this.Utils.handleError(error, "populating currency dropdown");
        }
    },

    /**
     * Opens the opportunity add/edit modal.
     * @param {string} mode - 'add' or 'edit'.
     * @param {object} [opportunityData=null] - Data for the opportunity if in 'edit' mode.
     */
    openOpportunityModal: async function(mode, opportunityData = null) {
        const modal = document.getElementById('opportunity-modal');
        const title = document.getElementById('opportunity-modal-title');
        const form = document.getElementById('opportunity-form');
        const valueGroup = document.getElementById('opportunity-value-group');
        const valueInput = document.getElementById('opportunity-value');


        // Reset form fields
        form.reset();
        this.selectedOpportunityId = null; // Clear selected ID

        await this.populateCustomerDropdown(); // Populate customer dropdown first
        await this.populateCurrencyDropdown(); // Populate new currency dropdown and cache currencies

        if (mode === 'edit' && opportunityData) {
            title.textContent = 'Edit Opportunity';
            this.selectedOpportunityId = opportunityData.id;
            document.getElementById('opportunity-name').value = opportunityData.name || '';
            document.getElementById('opportunity-customer').value = opportunityData.customerId || '';
            document.getElementById('opportunity-status').value = opportunityData.status || 'Prospecting';
            document.getElementById('opportunity-value').value = opportunityData.value || '';
            document.getElementById('opportunity-close-date').value = opportunityData.closeDate || '';

            // Populate new fields
            document.getElementById('opportunity-currency').value = opportunityData.currency || '';
            document.getElementById('opportunity-event-type').value = opportunityData.eventType || '';
            document.getElementById('opportunity-location').value = opportunityData.proposedEventLocation || '';
            document.getElementById('opportunity-description').value = opportunityData.description || '';
            document.getElementById('opportunity-active-status').value = opportunityData.active || 'Active';

            // Show value field if currency is already selected in edit mode
            if (opportunityData.currency) {
                valueGroup.classList.remove('hidden');
            } else {
                valueGroup.classList.add('hidden');
            }

        } else {
            title.textContent = 'Add New Opportunity';
            // Set default status and active status for new opportunity
            document.getElementById('opportunity-status').value = 'Prospecting';
            document.getElementById('opportunity-active-status').value = 'Active'; // Default 'Active' for new opportunities
            valueGroup.classList.add('hidden'); // Hide value field for new opportunities initially
            valueInput.value = ''; // Ensure value is cleared
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('div').classList.remove('opacity-0', 'scale-95');
        }, 10);
    },

    /**
     * Closes the opportunity add/edit modal.
     */
    closeOpportunityModal: function() {
        const modal = document.getElementById('opportunity-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => {
            modal.classList.add('hidden');
        }, { once: true });
    },

    /**
     * Saves a new opportunity or updates an existing one to Firestore.
     */
    saveOpportunity: async function() {
        const name = document.getElementById('opportunity-name').value.trim();
        const customerId = document.getElementById('opportunity-customer').value;
        const status = document.getElementById('opportunity-status').value;
        const value = parseFloat(document.getElementById('opportunity-value').value) || 0;
        const closeDate = document.getElementById('opportunity-close-date').value; //YYYY-MM-DD string

        const currency = document.getElementById('opportunity-currency').value;
        const eventType = document.getElementById('opportunity-event-type').value;
        const proposedEventLocation = document.getElementById('opportunity-location').value.trim();
        const description = document.getElementById('opportunity-description').value.trim();
        const active = document.getElementById('opportunity-active-status').value;

        if (!name || !customerId) {
            this.Utils.showMessage('Opportunity Name and Customer are required.', 'warning');
            return;
        }
        if (!currency) {
            this.Utils.showMessage('Currency is required for the opportunity.', 'warning');
            return;
        }

        try {
            const opportunityData = {
                name,
                customerId,
                status,
                value,
                currency,
                eventType,
                proposedEventLocation,
                description,
                active,
                closeDate,
                updatedAt: new Date(),
                creatorId: this.auth.currentUser ? this.auth.currentUser.uid : null,
            };

            if (!opportunityData.creatorId) {
                this.Utils.showMessage('You must be logged in to create an opportunity.', 'error');
                return;
            }

            if (this.selectedOpportunityId) {
                await updateDoc(doc(this.db, "opportunities", this.selectedOpportunityId), opportunityData);
                this.Utils.showMessage('Opportunity updated successfully!', 'success');
            } else {
                opportunityData.createdAt = new Date();
                await addDoc(collection(this.db, "opportunities"), opportunityData);
                this.Utils.showMessage('Opportunity added successfully!', 'success');
            }
            this.closeOpportunityModal();
        } catch (error) {
            this.Utils.handleError(error, "saving opportunity");
        }
    },

    /**
     * Handles editing an opportunity. Fetches data and opens modal in edit mode.
     * @param {string} id - The document ID of the opportunity to edit.
     */
    editOpportunity: function(id) {
        const opportunityToEdit = this.opportunitiesData.find(o => o.id === id);
        if (opportunityToEdit) {
            this.openOpportunityModal('edit', opportunityToEdit);
        } else {
            this.Utils.showMessage('Opportunity not found for editing.', 'error');
        }
    },

    /**
     * Deletes an opportunity from Firestore after confirmation.
     * @param {string} id - The document ID of the opportunity to delete.
     * @param {string} name - The name of the opportunity for confirmation message.
     */
    deleteOpportunity: async function(id, name) {
        this.Utils.showMessage(`Are you sure you want to delete opportunity "${name}"? This will also delete all related Lines, Contacts, and Quotes.`, 'warning', 0);

        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('.p-6');
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete';
            confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2';
            confirmBtn.onclick = async () => {
                try {
                    await deleteDoc(doc(this.db, "opportunities", id));
                    this.Utils.showMessage('Opportunity and its related data (if any) deleted successfully!', 'success');
                    messageModalContainer.remove();
                } catch (error) {
                    this.Utils.handleError(error, "deleting opportunity");
                    messageModalContainer.remove();
                }
            };

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg mt-4';
            cancelBtn.onclick = () => {
                messageModalContainer.remove();
                this.Utils.showMessage('Deletion cancelled.', 'info');
            };

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
     * Displays the detailed view of a specific opportunity.
     * @param {string} id - The document ID of the opportunity to view.
     */
    viewOpportunityDetails: async function(id) {
        const opportunity = this.opportunitiesData.find(o => o.id === id);
        if (!opportunity) {
            this.Utils.showMessage('Opportunity details not found.', 'error');
            return;
        }

        this.selectedOpportunityId = opportunity.id;

        document.getElementById('detail-name').textContent = opportunity.name || 'N/A';
        document.getElementById('detail-customer').textContent = opportunity.customerName || 'N/A';
        document.getElementById('detail-status').textContent = opportunity.status || 'N/A';
        document.getElementById('detail-close-date').textContent = opportunity.closeDate || 'N/A';
        document.getElementById('detail-created-by').textContent = opportunity.creatorName || 'N/A';
        document.getElementById('detail-created-at').textContent = opportunity.createdAt ? opportunity.createdAt.toLocaleString() : 'N/A';
        document.getElementById('detail-updated-at').textContent = opportunity.updatedAt ? opportunity.updatedAt.toLocaleString() : 'N/A';

        // Display new fields in detail view, including formatted value
        const formattedValue = parseFloat(opportunity.value || 0).toFixed(2);
        const currencyInfo = this.currenciesMap.get(opportunity.currency);
        const valueWithSymbol = currencyInfo ? `${currencyInfo.symbol_native}${formattedValue} (${opportunity.currency})` : `${formattedValue} (${opportunity.currency || 'N/A'})`;

        document.getElementById('detail-value').textContent = valueWithSymbol;
        document.getElementById('detail-currency').textContent = opportunity.currency || 'N/A';
        document.getElementById('detail-event-type').textContent = opportunity.eventType || 'N/A';
        document.getElementById('detail-location').textContent = opportunity.proposedEventLocation || 'N/A';
        document.getElementById('detail-description').textContent = opportunity.description || 'N/A';
        document.getElementById('detail-active').textContent = opportunity.active || 'N/A';

        const detailView = document.getElementById('opportunity-detail-view');
        detailView.classList.remove('hidden');

        this.renderOpportunityLinesGrid(id);
        this.renderOpportunityContactsGrid(id);
        this.renderOpportunityQuotesGrid(id);
    },

    /**
     * Placeholder function to render Opportunity Lines grid.
     * @param {string} opportunityId
     */
    renderOpportunityLinesGrid: function(opportunityId) {
        const gridContainer = document.getElementById('opportunity-lines-grid');
        gridContainer.innerHTML = '<p class="text-gray-600 text-sm italic py-4">Loading opportunity lines...</p>';
        setTimeout(() => {
            const linesData = [
                // { id: 'l1', item: 'CRM License', quantity: 1, unitPrice: 500, total: 500 },
                // { id: 'l2', item: 'Onboarding Service', quantity: 1, unitPrice: 1000, total: 1000 },
            ];

            if (linesData.length === 0) {
                gridContainer.innerHTML = '<p class="text-gray-600 text-sm italic py-4">No opportunity lines found.</p>';
            } else {
                 new gridjs.Grid({
                    columns: ['Item', 'Quantity', 'Unit Price', 'Total'],
                    data: linesData.map(l => [l.item, l.quantity, `$${l.unitPrice}`, `$${l.total}`]),
                    className: {
                        container: 'shadow-none border border-gray-200 rounded-lg'
                    }
                }).render(gridContainer);
            }
        }, 500);
    },

    /**
     * Placeholder function to render Opportunity Contacts grid.
     * @param {string} opportunityId
     */
    renderOpportunityContactsGrid: function(opportunityId) {
        const gridContainer = document.getElementById('opportunity-contacts-grid');
        gridContainer.innerHTML = '<p class="text-gray-600 text-sm italic py-4">Loading opportunity contacts...</p>';
        setTimeout(() => {
            const contactsData = [
                // { id: 'c1', name: 'Jane Doe', email: 'jane@example.com', role: 'Decision Maker' },
            ];

            if (contactsData.length === 0) {
                gridContainer.innerHTML = '<p class="text-gray-600 text-sm italic py-4">No opportunity contacts found.</p>';
            } else {
                new gridjs.Grid({
                    columns: ['Name', 'Email', 'Role'],
                    data: contactsData.map(c => [c.name, c.email, c.role]),
                    className: {
                        container: 'shadow-none border border-gray-200 rounded-lg'
                    }
                }).render(gridContainer);
            }
        }, 500);
    },

    /**
     * Placeholder function to render Opportunity Quotes grid.
     * @param {string} opportunityId
     */
    renderOpportunityQuotesGrid: function(opportunityId) {
        const gridContainer = document.getElementById('opportunity-quotes-grid');
        gridContainer.innerHTML = '<p class="text-gray-600 text-sm italic py-4">Loading quotes...</p>';
        setTimeout(() => {
            const quotesData = [
                // { id: 'q1', quoteNumber: 'Q-001', amount: 2500, status: 'Draft', date: '2025-06-20' },
            ];

            if (quotesData.length === 0) {
                gridContainer.innerHTML = '<p class="text-gray-600 text-sm italic py-4">No quotes found.</p>';
            } else {
                new gridjs.Grid({
                    columns: ['Quote Number', 'Amount', 'Status', 'Date'],
                    data: quotesData.map(q => [q.quoteNumber, `$${q.amount}`, q.status, q.date]),
                    className: {
                        container: 'shadow-none border border-gray-200 rounded-lg'
                    }
                }).render(gridContainer);
            }
        }, 500);
    },

    /**
     * Detaches the main real-time listener when the module is no longer active.
     */
    destroy: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("Opportunities module listener unsubscribed.");
        }
        if (this.grid) {
            this.grid.destroy(); // Destroy Grid.js instance
            this.grid = null;
        }
        this.currenciesMap.clear(); // Clear cached currencies
    }
};
