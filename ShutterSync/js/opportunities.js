// js/opportunities.js

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The OpportunitiesModule object handles all functionality related to opportunity management.
 */
export const Opportunities = {
    db: null,
    auth: null,
    Utils: null,
    unsubscribe: null, // To store the unsubscribe function for the real-time listener
    currentEditingOpportunityId: null, // Stores the ID of the opportunity being edited
    opportunitiesGrid: null, // Grid.js instance for the opportunities table

    /**
     * Initializes the Opportunities module.
     * This method should only initialize core dependencies, not interact with the DOM yet.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("Opportunities module initialized.");

        // Do NOT call renderOpportunitiesUI or attachEventListeners here.
        // They depend on the module's HTML being loaded into the DOM by Main.loadModule.
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

        opportunitiesModuleContent.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-2xl font-semibold text-gray-800">Opportunity Management</h3>
                    <button id="add-opportunity-btn"
                        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200">
                        <i class="fas fa-plus mr-2"></i> Add Opportunity
                    </button>
                </div>
                <p class="text-sm text-gray-600 mb-4">Track and manage your sales opportunities.</p>
                <div id="opportunities-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
            </div>

            <!-- Opportunity Modal (Add/Edit Form) -->
            <div id="opportunity-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                <div class="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95 opacity-0">
                    <h4 id="opportunity-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Opportunity</h4>
                    <form id="opportunity-form">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label for="opportunity-name" class="block text-sm font-medium text-gray-700 mb-1">Opportunity Name</label>
                                <input type="text" id="opportunity-name" name="name" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div>
                                <label for="customer-select" class="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <select id="customer-select" name="customerId" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    <option value="">Select Customer</option>
                                </select>
                            </div>
                            <div>
                                <label for="stage-select" class="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                                <select id="stage-select" name="stage" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    <option value="New">New</option>
                                    <option value="Qualification">Qualification</option>
                                    <option value="Proposal">Proposal</option>
                                    <option value="Negotiation">Negotiation</option>
                                    <option value="Closed Won">Closed Won</option>
                                    <option value="Closed Lost">Closed Lost</option>
                                </select>
                            </div>
                            <div>
                                <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                                <input type="number" id="amount" name="amount" min="0" step="0.01"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="md:col-span-2">
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
        // After rendering HTML, attach event listeners and setup the real-time listener
        this.attachEventListeners();
        this.setupRealtimeListener();
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
            console.log("User not logged in, cannot set up opportunity listener.");
            // Render an empty grid or display a message
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

        this.unsubscribe = onSnapshot(q, async (snapshot) => {
            const opportunities = [];
            const customerNamesMap = new Map(); // Cache for customer names

            for (const docSnapshot of snapshot.docs) {
                const data = docSnapshot.data();
                let customerName = 'Unknown Customer';

                // Fetch customer name if not already cached
                if (data.customerId && !customerNamesMap.has(data.customerId)) {
                    try {
                        const customerDoc = await getDoc(doc(this.db, "customers", data.customerId));
                        if (customerDoc.exists()) {
                            customerNamesMap.set(data.customerId, customerDoc.data().companyName);
                        } else {
                            customerNamesMap.set(data.customerId, 'Customer Deleted');
                        }
                    } catch (error) {
                        console.error("Error fetching customer name for opportunity:", error);
                        customerNamesMap.set(data.customerId, 'Error Fetching Customer');
                    }
                }
                customerName = customerNamesMap.get(data.customerId) || customerName;

                opportunities.push({
                    id: docSnapshot.id,
                    customerName: customerName,
                    ...data
                });
            }
            this.renderOpportunitiesGrid(opportunities);
            console.log("Opportunities data updated:", opportunities);
        }, (error) => {
            this.Utils.handleError(error, "fetching opportunities data");
            // Render an empty grid or display an error message
            this.renderOpportunitiesGrid([]);
        });
    },

    /**
     * Renders or updates the Grid.js table with the provided opportunity data.
     * @param {Array<object>} opportunities - An array of opportunity objects.
     */
    renderOpportunitiesGrid: function(opportunities) {
        const gridContainer = document.getElementById('opportunities-grid-container');
        if (!gridContainer) {
            console.error("Opportunities grid container not found.");
            return;
        }

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'name', name: 'Opportunity Name', sort: true, width: 'auto' },
            { id: 'customerName', name: 'Customer', sort: true, width: 'auto' }, // Display name, not ID
            { id: 'stage', name: 'Stage', sort: true, width: '120px' },
            { id: 'amount', name: 'Amount ($)', sort: true, width: '120px', formatter: (cell) => cell ? `$${parseFloat(cell).toFixed(2)}` : '$0.00' },
            { id: 'expectedCloseDate', name: 'Close Date', sort: true, width: '150px', formatter: (cell) => cell ? new Date(cell).toLocaleDateString() : '' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const opportunityId = row.cells[0].data;
                    const opportunityData = opportunities.find(o => o.id === opportunityId);
                    const isCurrentUserCreator = this.auth.currentUser && opportunityData?.creatorId === this.auth.currentUser.uid;
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
            o.name || '',
            o.customerName || '',
            o.stage || '',
            o.amount || 0,
            o.expectedCloseDate ? new Date(o.expectedCloseDate.toDate ? o.expectedCloseDate.toDate() : o.expectedCloseDate).toISOString().split('T')[0] : ''
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
     * Populates the customer dropdown in the opportunity modal.
     */
    populateCustomerDropdown: async function() {
        const customerSelect = document.getElementById('customer-select');
        customerSelect.innerHTML = '<option value="">Select Customer</option>';

        const userId = this.auth.currentUser ? this.auth.currentUser.uid : null;
        if (!userId) {
            console.log("No user ID found, cannot populate customer dropdown.");
            return;
        }

        const customersCollectionRef = collection(this.db, "customers");
        let q;
        if (this.Utils.isAdmin()) {
            q = query(customersCollectionRef); // Admins can link to any customer
        } else {
            q = query(customersCollectionRef, where("creatorId", "==", userId)); // Standard users can only link to their own customers
        }

        try {
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const customer = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = customer.companyName;
                customerSelect.appendChild(option);
            });
        } catch (error) {
            this.Utils.handleError(error, "populating customer dropdown");
        }
    },

    /**
     * Attaches event listeners for UI interactions within the Opportunities module.
     * This is called AFTER the HTML is rendered.
     */
    attachEventListeners: function() {
        const addOpportunityBtn = document.getElementById('add-opportunity-btn');
        if (addOpportunityBtn) {
            addOpportunityBtn.addEventListener('click', () => this.openOpportunityModal('add'));
        } else {
            console.error("Add opportunity button not found after rendering.");
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
        const modal = document.getElementById('opportunity-modal');
        const title = document.getElementById('opportunity-modal-title');
        const form = document.getElementById('opportunity-form');

        form.reset(); // Clear previous form data
        this.currentEditingOpportunityId = null; // Clear ID for add mode

        await this.populateCustomerDropdown(); // Populate customer dropdown first

        if (mode === 'edit' && opportunityId) {
            title.textContent = 'Edit Opportunity';
            this.currentEditingOpportunityId = opportunityId;
            try {
                // Fetch opportunity data to pre-fill form
                const opportunityDoc = await getDoc(doc(this.db, 'opportunities', opportunityId));
                if (opportunityDoc.exists()) {
                    const data = opportunityDoc.data();
                    document.getElementById('opportunity-name').value = data.name || '';
                    document.getElementById('customer-select').value = data.customerId || '';
                    document.getElementById('stage-select').value = data.stage || 'New';
                    document.getElementById('amount').value = data.amount || '';
                    document.getElementById('close-date').value = data.expectedCloseDate ? new Date(data.expectedCloseDate.toDate ? data.expectedCloseDate.toDate() : data.expectedCloseDate).toISOString().split('T')[0] : '';
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
            document.getElementById('stage-select').value = 'New'; // Default for new
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
            }, { once: true });
        }
    },

    /**
     * Saves a new opportunity or updates an existing one to Firestore.
     */
    saveOpportunity: async function() {
        const name = document.getElementById('opportunity-name').value.trim();
        const customerId = document.getElementById('customer-select').value;
        const stage = document.getElementById('stage-select').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const expectedCloseDate = document.getElementById('close-date').value;

        if (!name || !customerId || !stage) {
            this.Utils.showMessage('Opportunity Name, Customer, and Stage are required.', 'warning');
            return;
        }
        if (isNaN(amount) || amount < 0) {
            this.Utils.showMessage('Amount must be a valid positive number.', 'warning');
            return;
        }

        const opportunityData = {
            name: name,
            customerId: customerId,
            stage: stage,
            amount: amount,
            expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
            updatedAt: new Date()
        };

        try {
            if (this.currentEditingOpportunityId) {
                // Update existing opportunity
                const opportunityRef = doc(this.db, "opportunities", this.currentEditingOpportunityId);
                await this.Utils.updateDoc(opportunityRef, opportunityData);
                this.Utils.showMessage('Opportunity updated successfully!', 'success');
            } else {
                // Add new opportunity
                opportunityData.creatorId = this.auth.currentUser ? this.auth.currentUser.uid : 'anonymous';
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
        this.Utils.showMessage(`Are you sure you want to delete opportunity "${opportunityName}"?`, 'warning', 0); // 0 duration for persistent

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
                    await deleteDoc(doc(this.db, "opportunities", opportunityId));
                    this.Utils.showMessage('Opportunity deleted successfully!', 'success');
                    messageModalContainer.classList.add('hidden'); // Hide modal explicitly after action
                } catch (error) {
                    this.Utils.handleError(error, "deleting opportunity");
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
            console.log("Opportunities module listener unsubscribed.");
        }
        if (this.opportunitiesGrid) {
            this.opportunitiesGrid.destroy();
            this.opportunitiesGrid = null;
        }
        // Remove content from the DOM when destroying
        const opportunitiesModuleContent = document.getElementById('opportunities-module-content');
        if (opportunitiesModuleContent) {
            opportunitiesModuleContent.innerHTML = '';
        }
    }
};
