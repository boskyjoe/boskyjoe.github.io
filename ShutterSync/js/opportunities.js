// js/opportunities.js

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';
import { Auth } from './auth.js'; // NEW: Import Auth to check login status

/**
 * The Opportunities module handles all functionality related to opportunity management.
 */
export const Opportunities = {
    db: null,
    auth: null,
    Utils: null,
    unsubscribe: null, // To store the unsubscribe function for the real-time listener
    currentEditingOpportunityId: null, // Stores the ID of the opportunity being edited
    opportunitiesGrid: null, // Grid.js instance for the opportunities table
    _customerNamesMap: new Map(), // Map to store customer IDs to names for quick lookup

    /**
     * Initializes the Opportunities module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("Opportunities module initialized.");
    },

    /**
     * Renders the main UI for the Opportunities module.
     * This is called by Main.js when the 'opportunities' module is activated.
     */
    renderOpportunitiesUI: function() {
        const opportunitiesModuleContent = document.getElementById('opportunities-module-content');
        if (!opportunitiesModuleContent) {
            console.error("Opportunities module content area not found in DOM.");
            return;
        }

        // --- NEW: Login Requirement Check ---
        if (!Auth.isLoggedIn()) {
            opportunitiesModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                    <p class="text-gray-600 mb-4">You must be logged in to view opportunity data.</p>
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
            this.Utils.showMessage("Access Denied: Please log in to view Opportunities.", "error");
            return; // Stop execution if not logged in
        }
        // --- END NEW ---

        opportunitiesModuleContent.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-semibold text-gray-800">Opportunity Management</h3>
                    <button id="add-opportunity-btn"
                        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200">
                        <i class="fas fa-plus mr-2"></i> Add Opportunity
                    </button>
                </div>
                <p class="text-sm text-gray-600 mb-4">Track potential sales and their progress.</p>
                <div id="opportunity-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
            </div>

            <!-- Opportunity Modal (Add/Edit Form) -->
            <div id="opportunity-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                <div class="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95 opacity-0">
                    <h4 id="opportunity-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Opportunity</h4>
                    <form id="opportunity-form">
                        <div class="grid grid-cols-1 gap-4 mb-4">
                            <div>
                                <label for="opportunity-name" class="block text-sm font-medium text-gray-700 mb-1">Opportunity Name</label>
                                <input type="text" id="opportunity-name" name="opportunityName" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div>
                                <label for="customer-select" class="block text-sm font-medium text-gray-700 mb-1">Related Customer</label>
                                <select id="customer-select" name="customerId" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                                    <!-- Options will be populated dynamically -->
                                </select>
                            </div>
                            <div>
                                <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                <input type="number" id="amount" name="amount" step="0.01" min="0" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div>
                                <label for="stage-select" class="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                                <select id="stage-select" name="stage" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                                    <option value="Prospecting">Prospecting</option>
                                    <option value="Qualification">Qualification</option>
                                    <option value="Proposal">Proposal</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Closed Won">Closed Won</option>
                                    <option value="Closed Lost">Closed Lost</option>
                                </select>
                            </div>
                            <div>
                                <label for="close-date" class="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
                                <input type="date" id="close-date" name="expectedCloseDate"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
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
        this.attachEventListeners();
        this.fetchAndCacheCustomers().then(() => {
            this.setupRealtimeListener();
        });
    },

    /**
     * Fetches all customers and caches their names for quick lookup.
     * @returns {Promise<void>} A promise that resolves when customers are fetched and cached.
     */
    fetchAndCacheCustomers: async function() {
        this._customerNamesMap.clear(); // Clear existing map
        const userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
        if (!userId) {
            console.log("No user ID, cannot fetch customers for dropdown. (User likely not logged in or session expired)");
            return;
        }

        const customersCollectionRef = collection(this.db, "customers");
        let q;
        if (this.Utils.isAdmin()) {
            q = query(customersCollectionRef, orderBy('companyName'));
        } else {
            q = query(customersCollectionRef, where("creatorId", "==", userId), orderBy('companyName'));
        }

        try {
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((docSnap) => {
                const customerData = docSnap.data();
                this._customerNamesMap.set(docSnap.id, customerData.companyName || 'N/A');
            });
            console.log("Customers cached:", this._customerNamesMap);
            this.populateCustomerDropdown(); // Re-populate dropdown to ensure it's up-to-date
        } catch (error) {
            this.Utils.handleError(error, "fetching customers for opportunity dropdown");
        }
    },


    /**
     * Populates the customer dropdown in the opportunity modal.
     * @param {string|null} selectedCustomerId - The ID of the customer to pre-select.
     */
    populateCustomerDropdown: function(selectedCustomerId = null) {
        const customerSelect = document.getElementById('customer-select');
        if (!customerSelect) return;

        customerSelect.innerHTML = '<option value="">Select a Customer</option>'; // Default option

        const sortedCustomers = Array.from(this._customerNamesMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));

        sortedCustomers.forEach(([id, name]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            if (id === selectedCustomerId) {
                option.selected = true;
            }
            customerSelect.appendChild(option);
        });
    },

    /**
     * Sets up the real-time listener for the 'opportunities' collection.
     */
    setupRealtimeListener: function() {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        const userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
        if (!userId) {
            console.log("User not logged in, cannot set up opportunity listener. (User likely not logged in or session expired)");
            this.renderOpportunitiesGrid([]);
            return;
        }

        const opportunitiesCollectionRef = collection(this.db, "opportunities");
        let q;
        if (this.Utils.isAdmin()) {
            q = query(opportunitiesCollectionRef); // Admins see all opportunities
            console.log("Admin user: Fetching all opportunities.");
        } else {
            q = query(opportunitiesCollectionRef, where("creatorId", "==", userId)); // Standard users see only their own
            console.log("Standard user: Fetching opportunities created by:", userId);
        }

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const opportunities = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                const customerName = this._customerNamesMap.get(data.customerId) || 'Unknown Customer'; // Use cached map
                opportunities.push({ id: doc.id, customerName: customerName, ...data });
            });
            this.renderOpportunitiesGrid(opportunities);
            console.log("Opportunities data updated:", opportunities);
        }, (error) => {
            this.Utils.handleError(error, "fetching opportunities data");
            this.renderOpportunitiesGrid([]);
        });
    },

    /**
     * Renders or updates the Grid.js table with the provided opportunity data.
     * @param {Array<object>} opportunities - An array of opportunity objects.
     */
    renderOpportunitiesGrid: function(opportunities) {
        const gridContainer = document.getElementById('opportunity-grid-container');
        if (!gridContainer) {
            console.error("Opportunity grid container not found.");
            return;
        }

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'opportunityName', name: 'Opportunity Name', sort: true, width: 'auto' },
            { id: 'customerName', name: 'Customer', sort: true, width: 'auto' }, // Display customer name
            { id: 'amount', name: 'Amount', sort: true, width: '100px', formatter: (cell) => `$${parseFloat(cell).toLocaleString()}` },
            { id: 'stage', name: 'Stage', sort: true, width: '120px' },
            { id: 'expectedCloseDate', name: 'Close Date', sort: true, width: '120px', formatter: (cell) => cell ? new Date(cell.toDate()).toLocaleDateString() : 'N/A' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const opportunityId = row.cells[0].data; // Get opportunity ID
                    const opportunityData = opportunities.find(o => o.id === opportunityId);
                    const creatorId = opportunityData?.creatorId;
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
                            title: 'Edit Opportunity',
                            onClick: () => this.openOpportunityModal('edit', opportunityId)
                        }, gridjs.h('i', { className: 'fas fa-edit text-lg' })),
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200',
                            title: 'Delete Opportunity',
                            onClick: () => this.deleteOpportunity(opportunityId, row.cells[1].data)
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = opportunities.map(o => [
            o.id,
            o.opportunityName || '',
            o.customerName || '',
            o.amount || 0,
            o.stage || '',
            o.expectedCloseDate || ''
        ]);

        if (this.opportunitiesGrid) {
            this.opportunitiesGrid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
            this.opportunitiesGrid = new gridjs.Grid({
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
     * Attaches event listeners for UI interactions within the Opportunities module.
     */
    attachEventListeners: function() {
        const addOpportunityBtn = document.getElementById('add-opportunity-btn');
        if (addOpportunityBtn) {
            addOpportunityBtn.addEventListener('click', () => this.openOpportunityModal('add'));
        }

        const opportunityForm = document.getElementById('opportunity-form');
        if (opportunityForm) {
            opportunityForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveOpportunity();
            });
        }

        const cancelOpportunityBtn = document.getElementById('cancel-opportunity-btn');
        if (cancelOpportunityBtn) {
            cancelOpportunityBtn.addEventListener('click', () => this.closeOpportunityModal());
        }

        const opportunityModal = document.getElementById('opportunity-modal');
        if (opportunityModal) {
            opportunityModal.addEventListener('click', (e) => {
                if (e.target === opportunityModal) {
                    this.closeOpportunityModal();
                }
            });
        }
    },

    /**
     * Opens the opportunity add/edit modal.
     * @param {string} mode - 'add' or 'edit'.
     * @param {string|null} opportunityId - The ID of the opportunity to edit, if mode is 'edit'.
     */
    openOpportunityModal: async function(mode, opportunityId = null) {
        // --- NEW: Login Requirement Check for modals ---
        if (!Auth.isLoggedIn()) {
            this.Utils.showMessage('You must be logged in to add/edit opportunities.', 'error');
            return;
        }
        // --- END NEW ---

        const modal = document.getElementById('opportunity-modal');
        const title = document.getElementById('opportunity-modal-title');
        const form = document.getElementById('opportunity-form');

        form.reset();
        this.currentEditingOpportunityId = null;

        await this.fetchAndCacheCustomers(); // Re-fetch to ensure latest customers if needed
        this.populateCustomerDropdown();

        if (mode === 'edit' && opportunityId) {
            title.textContent = 'Edit Opportunity';
            this.currentEditingOpportunityId = opportunityId;
            try {
                const opportunityDoc = await getDoc(doc(this.db, 'opportunities', opportunityId));
                if (opportunityDoc.exists()) {
                    const data = opportunityDoc.data();
                    document.getElementById('opportunity-name').value = data.opportunityName || '';
                    document.getElementById('amount').value = data.amount || 0;
                    document.getElementById('stage-select').value = data.stage || 'Prospecting';
                    document.getElementById('close-date').value = data.expectedCloseDate ? new Date(data.expectedCloseDate.toDate()).toISOString().split('T')[0] : '';
                    this.populateCustomerDropdown(data.customerId); // Pre-select customer
                } else {
                    this.Utils.showMessage('Opportunity not found for editing.', 'error');
                    this.closeOpportunityModal();
                    return;
                }
            } catch (error) {
                this.Utils.handleError(error, "fetching opportunity for edit");
                this.closeOpportunityModal();
                return;
            }
        } else {
            title.textContent = 'Add New Opportunity';
            document.getElementById('stage-select').value = 'Prospecting'; // Default for new
            document.getElementById('close-date').valueAsDate = new Date(); // Default to today
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('div').classList.remove('opacity-0', 'scale-95');
        }, 10);
    },

    /**
     * Closes the opportunity modal.
     */
    closeOpportunityModal: function() {
        const modal = document.getElementById('opportunity-modal');
        if (modal) {
            modal.querySelector('div').classList.add('opacity-0', 'scale-95');
            modal.addEventListener('transitionend', () => {
                modal.classList.add('hidden');
                modal.removeAttribute('dataset.editingOpportunityId'); // Clean up
            }, { once: true });
        }
    },

    /**
     * Saves a new opportunity or updates an existing one to Firestore.
     */
    saveOpportunity: async function() {
        // --- NEW: Login Requirement Check for save ---
        if (!Auth.isLoggedIn()) {
            this.Utils.showMessage('You must be logged in to save opportunities.', 'error');
            this.closeOpportunityModal();
            return;
        }
        // --- END NEW ---

        const opportunityName = document.getElementById('opportunity-name').value.trim();
        const customerId = document.getElementById('customer-select').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const stage = document.getElementById('stage-select').value;
        const closeDate = document.getElementById('close-date').value;

        if (!opportunityName || !customerId || isNaN(amount) || amount < 0) { // Added amount < 0 validation
            this.Utils.showMessage('Opportunity Name, Customer, and a valid positive Amount are required.', 'warning');
            return;
        }

        const opportunityData = {
            opportunityName: opportunityName,
            customerId: customerId,
            amount: amount,
            stage: stage,
            expectedCloseDate: closeDate ? new Date(closeDate) : null,
            updatedAt: new Date()
        };

        try {
            if (this.currentEditingOpportunityId) {
                const opportunityRef = doc(this.db, "opportunities", this.currentEditingOpportunityId);
                await this.Utils.updateDoc(opportunityRef, opportunityData);
                this.Utils.showMessage('Opportunity updated successfully!', 'success');
            } else {
                opportunityData.creatorId = this.auth.currentUser.uid; // Now guaranteed to be a logged-in user's UID
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
     * Deletes an opportunity from Firestore.
     * @param {string} opportunityId - The ID of the opportunity to delete.
     * @param {string} opportunityName - The name of the opportunity for confirmation message.
     */
    deleteOpportunity: async function(opportunityId, opportunityName) {
        // --- NEW: Login Requirement Check for delete ---
        if (!Auth.isLoggedIn()) {
            this.Utils.showMessage('You must be logged in to delete opportunities.', 'error');
            return;
        }
        // --- END NEW ---

        this.Utils.showMessage(`Are you sure you want to delete opportunity "${opportunityName}"? This action cannot be undone.`, 'warning', 0);

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
                    await deleteDoc(doc(this.db, "opportunities", opportunityId));
                    this.Utils.showMessage('Opportunity deleted successfully!', 'success');
                    messageModalContainer.classList.add('hidden');
                } catch (error) {
                    this.Utils.handleError(error, "deleting opportunity");
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

    /**
     * Detaches the real-time listener when the module is no longer active.
     */
    destroy: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("Opportunities module listener unsubscribed.");
        }
        if (this.opportunitiesGrid) {
            this.opportunitiesGrid.destroy();
            this.opportunitiesGrid = null;
        }
        this._customerNamesMap.clear(); // Clear cached customer names
        const opportunitiesModuleContent = document.getElementById('opportunities-module-content');
        if (opportunitiesModuleContent) {
            opportunitiesModuleContent.innerHTML = '';
        }
    }
};
