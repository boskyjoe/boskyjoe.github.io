// js/opportunities.js

import { Utils } from './utils.js'; // Assuming Utils is imported
import { Auth } from './auth.js'; // Assuming Auth is imported

/**
 * The Opportunities module handles displaying and managing sales opportunities.
 */
export const Opportunities = {
    db: null,
    auth: null,
    Utils: null,
    opportunitiesGrid: null, // Stores the Grid.js instance for opportunities
    opportunitiesCollectionRef: null,
    unsubscribeOpportunitiesSnapshot: null, // To store the unsubscribe function for real-time listener
    // customersCache: new Map(), // REMOVED from top-level, will be initialized in init()

    /**
     * Initializes the Opportunities module.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils module instance.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        this.opportunitiesCollectionRef = this.Utils.getOpportunitiesCollectionRef();
        this.customersCache = new Map(); // *** CRITICAL FIX: Initialize customersCache here ***
        console.log("Opportunities module initialized. customersCache is now a Map:", this.customersCache instanceof Map);
    },

    /**
     * Renders the Opportunities UI into the provided content area element.
     * @param {HTMLElement} moduleContentElement - The DOM element where the Opportunities UI should be rendered.
     * @param {boolean} isLoggedIn - The current login status.
     * @param {boolean} isAdmin - The current admin status.
     * @param {object|null} currentUser - The current Firebase User object, or null if logged out.
     */
    renderOpportunitiesUI: async function(moduleContentElement, isLoggedIn, isAdmin, currentUser) {
        console.log("Opportunities: renderOpportunitiesUI called.");
        if (!isLoggedIn) {
            moduleContentElement.innerHTML = this.Utils.getNotLoggedInHtml();
            return;
        }

        moduleContentElement.innerHTML = `
            <div class="p-6 bg-white rounded-lg shadow-md">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">Sales Opportunities</h2>
                <div class="mb-6 flex justify-between items-center">
                    <button id="add-opportunity-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200 flex items-center">
                        <i class="fas fa-plus mr-2"></i> Add New Opportunity
                    </button>
                </div>
                <div id="opportunity-grid-container"></div>
            </div>
            <!-- Opportunity Modal -->
            <div id="opportunity-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center hidden z-50">
                <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                    <h3 id="opportunity-modal-title" class="text-xl font-bold mb-4">Add New Opportunity</h3>
                    <form id="opportunity-form">
                        <input type="hidden" id="opportunity-id">
                        <div class="mb-4">
                            <label for="opportunity-name" class="block text-gray-700 text-sm font-bold mb-2">Opportunity Name:</label>
                            <input type="text" id="opportunity-name" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                        </div>
                        <div class="mb-4">
                            <label for="customer-select" class="block text-gray-700 text-sm font-bold mb-2">Customer:</label>
                            <select id="customer-select" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                                <option value="">Select a Customer</option>
                            </select>
                        </div>
                        <div class="mb-4">
                            <label for="stage" class="block text-gray-700 text-sm font-bold mb-2">Stage:</label>
                            <select id="stage" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                                <option value="Prospecting">Prospecting</option>
                                <option value="Qualification">Qualification</option>
                                <option value="Proposal">Proposal</option>
                                <option value="Negotiation">Negotiation</option>
                                <option value="Closed Won">Closed Won</option>
                                <option value="Closed Lost">Closed Lost</option>
                            </select>
                        </div>
                        <div class="mb-4">
                            <label for="value" class="block text-gray-700 text-sm font-bold mb-2">Value ($):</label>
                            <input type="number" id="value" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" min="0" required>
                        </div>
                        <div class="mb-4">
                            <label for="close-date" class="block text-gray-700 text-sm font-bold mb-2">Expected Close Date:</label>
                            <input type="date" id="close-date" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required>
                        </div>
                        <div class="flex items-center justify-between">
                            <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200">Save Opportunity</button>
                            <button type="button" id="cancel-opportunity-btn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
            <!-- Delete Confirmation Modal -->
            <div id="delete-confirmation-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center hidden z-50">
                <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-sm">
                    <h3 class="text-xl font-bold mb-4">Confirm Deletion</h3>
                    <p class="mb-4">Are you sure you want to delete this opportunity? This action cannot be undone.</p>
                    <div class="flex justify-end space-x-4">
                        <button id="confirm-delete-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200">Delete</button>
                        <button id="cancel-delete-btn" class="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md shadow-md transition-colors duration-200">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        await this.populateCustomerSelect(); // Populate customer dropdown
        this.attachEventListeners(isAdmin); // Attach event listeners
        this.setupRealtimeOpportunitiesListener(isAdmin, currentUser); // Set up real-time listener
    },

    /**
     * Populates the customer select dropdown in the opportunity form.
     */
    populateCustomerSelect: async function() {
        console.log("Opportunities: Populating customer select dropdown.");
        const customerSelect = document.getElementById('customer-select');
        if (!customerSelect) return;

        // Clear existing options except the default
        customerSelect.innerHTML = '<option value="">Select a Customer</option>';

        try {
            const customersCollectionRef = this.Utils.getCustomersCollectionRef();
            // Use Utils.query, Utils.orderBy, Utils.getDocs
            const q = this.Utils.query(customersCollectionRef, this.Utils.orderBy('customerName'));
            const querySnapshot = await this.Utils.getDocs(q);

            this.customersCache.clear(); // Clear cache before repopulating
            querySnapshot.forEach(doc => {
                const customer = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = customer.customerName;
                customerSelect.appendChild(option);
                this.customersCache.set(doc.id, customer.customerName); // Cache customer name
            });
            console.log(`Opportunities: Populated customer select with ${querySnapshot.size} customers.`);
            console.log("Opportunities: customersCache size after populating:", this.customersCache.size);

        } catch (error) {
            this.Utils.handleError(error, "populating customer select");
        }
    },

    /**
     * Attaches event listeners for the Opportunities UI.
     * @param {boolean} isAdmin - Whether the current user is an admin.
     */
    attachEventListeners: function(isAdmin) {
        console.log("Opportunities: Attaching event listeners.");
        document.getElementById('add-opportunity-btn')?.addEventListener('click', () => this.openOpportunityModal());
        document.getElementById('cancel-opportunity-btn')?.addEventListener('click', () => this.closeOpportunityModal());
        document.getElementById('opportunity-form')?.addEventListener('submit', (e) => this.handleOpportunityFormSubmit(e));
        document.getElementById('cancel-delete-btn')?.addEventListener('click', () => this.closeDeleteConfirmationModal());
        document.getElementById('confirm-delete-btn')?.addEventListener('click', () => this.handleConfirmDelete()); // Ensure this is attached
    },

    /**
     * Sets up a real-time listener for opportunities data.
     * @param {boolean} isAdmin - Whether the current user is an admin.
     * @param {object|null} currentUser - The current Firebase User object.
     */
    setupRealtimeOpportunitiesListener: function(isAdmin, currentUser) {
        console.log("Opportunities: Setting up real-time listener.");
        // Unsubscribe from previous listener if exists
        if (this.unsubscribeOpportunitiesSnapshot) {
            this.unsubscribeOpportunitiesSnapshot();
            console.log("Opportunities: Unsubscribed from previous real-time listener.");
        }

        let q;
        if (isAdmin) {
            console.log("Admin user: Fetching all opportunities.");
            q = this.Utils.query(this.opportunitiesCollectionRef, this.Utils.orderBy('closeDate', 'desc'));
        } else if (currentUser) {
            console.log(`Standard user: Fetching opportunities for user ${currentUser.uid}.`);
            q = this.Utils.query(this.opportunitiesCollectionRef,
                this.Utils.where('createdBy', '==', currentUser.uid),
                this.Utils.orderBy('closeDate', 'desc')
            );
        } else {
            console.log("No user authenticated. Not fetching opportunities.");
            this.renderOpportunitiesGrid([]); // Render empty grid if no user
            return;
        }

        this.unsubscribeOpportunitiesSnapshot = this.Utils.onSnapshot(q, (querySnapshot) => {
            console.log("Opportunities: Real-time snapshot received.");
            const opportunities = [];
            querySnapshot.forEach(doc => {
                opportunities.push({ id: doc.id, ...doc.data() });
            });
            this.renderOpportunitiesGrid(opportunities, isAdmin);
        }, (error) => {
            this.Utils.handleError(error, "fetching real-time opportunities");
            this.Utils.showMessage("Error loading opportunities data.", "error");
        });
    },

    /**
     * Renders or updates the Grid.js table with the provided opportunities data.
     * @param {Array<object>} opportunities - An array of opportunity objects.
     * @param {boolean} isAdmin - Whether the current user is an admin.
     */
    renderOpportunitiesGrid: function(opportunities, isAdmin) {
        console.log(`Opportunities: Rendering grid with ${opportunities.length} opportunities. IsAdmin: ${isAdmin}`);
        const gridContainer = document.getElementById('opportunity-grid-container');
        if (!gridContainer) {
            console.error("Opportunity grid container not found.");
            return;
        }

        const columns = [
            { id: 'opportunityName', name: 'Opportunity Name' },
            {
                id: 'customerName',
                name: 'Customer',
                formatter: (cell, row) => {
                    // Use cached customer name or fallback to ID
                    const customerId = row.cells[2].data; // Assuming Customer ID is at index 2
                    return this.customersCache.get(customerId) || `ID: ${customerId}`;
                }
            },
            { id: 'customerId', name: 'Customer ID', hidden: true }, // Hidden column for customer ID
            { id: 'stage', name: 'Stage' },
            {
                id: 'value',
                name: 'Value ($)',
                formatter: (cell) => `$${cell.toLocaleString()}`
            },
            {
                id: 'closeDate',
                name: 'Expected Close Date',
                formatter: (cell) => {
                    if (cell instanceof this.Utils.Timestamp) {
                        return cell.toDate().toLocaleDateString();
                    }
                    return cell; // Already a string or other format
                }
            },
            {
                name: 'Actions',
                formatter: (cell, row) => {
                    const opportunityId = row.cells[0].data; // Assuming ID is the first cell
                    const createdById = row.cells[6].data; // Assuming createdBy UID is at index 6
                    // Check if the current user created this opportunity or is an admin
                    const isCreatorOrAdmin = isAdmin || (Auth.getCurrentUser() && createdById === Auth.getCurrentUser().uid);

                    if (isCreatorOrAdmin) {
                        return this.Utils.html(`
                            <button class="edit-opportunity-btn bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm mr-2" data-id="${opportunityId}">Edit</button>
                            <button class="delete-opportunity-btn bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm" data-id="${opportunityId}">Delete</button>
                        `);
                    }
                    return this.Utils.html('<span></span>'); // Empty span if no actions
                }
            },
            { id: 'createdBy', name: 'Created By', hidden: true } // Hidden column for createdBy UID
        ];

        const mappedData = opportunities.map(opp => [
            opp.id,
            opp.opportunityName,
            opp.customerId, // Pass customerId here
            opp.stage,
            opp.value,
            opp.closeDate,
            opp.createdBy // Pass createdBy UID here
        ]);

        if (this.opportunitiesGrid) {
            this.opportunitiesGrid.updateConfig({
                data: mappedData
            }).forceRender();
            console.log("Opportunities: Grid.js instance updated and re-rendered.");
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
                    th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 text-sm text-gray-900 whitespace-normal break-words',
                    footer: 'flex items-center justify-between px-6 py-3',
                    paginationButton: 'px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100',
                    paginationButtonCurrent: 'bg-blue-600 text-white hover:bg-blue-700',
                    search: 'p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500',
                    container: 'shadow-md rounded-lg overflow-hidden'
                }
            });
            this.opportunitiesGrid.render(gridContainer);
            console.log("Opportunities: Grid.js instance created and rendered.");
        }

        // Attach event listeners to dynamically created grid buttons
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

        document.querySelectorAll('.edit-opportunity-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleEditButtonClickBound); // Remove old
            btn.addEventListener('click', this.handleEditButtonClickBound); // Add new
        });
        document.querySelectorAll('.delete-opportunity-btn').forEach(btn => {
            btn.removeEventListener('click', this.handleDeleteButtonClickBound); // Remove old
            btn.addEventListener('click', this.handleDeleteButtonClickBound); // Add new
        });
        console.log("Opportunities: Attached grid button listeners.");
    },

    /**
     * Handles the click event for the Edit button in the grid.
     * @param {Event} event - The click event.
     */
    handleEditButtonClick: async function(event) {
        const opportunityId = event.target.dataset.id;
        console.log(`Opportunities: Edit button clicked for ID: ${opportunityId}`);
        try {
            const docRef = this.Utils.doc(this.db, 'opportunities', opportunityId);
            const docSnap = await this.Utils.getDoc(docRef);
            if (docSnap.exists()) {
                const opportunityData = docSnap.data();
                this.openOpportunityModal(opportunityId, opportunityData);
            } else {
                this.Utils.showMessage('Opportunity not found.', 'error');
            }
        } catch (error) {
            this.Utils.handleError(error, "fetching opportunity for edit");
        }
    },

    /**
     * Handles the click event for the Delete button in the grid.
     * @param {Event} event - The click event.
     */
    handleDeleteButtonClick: function(event) {
        const opportunityId = event.target.dataset.id;
        console.log(`Opportunities: Delete button clicked for ID: ${opportunityId}`);
        this.openDeleteConfirmationModal(opportunityId);
    },

    /**
     * Opens the opportunity modal for adding or editing.
     * @param {string} [id] - The ID of the opportunity if editing.
     * @param {object} [data] - The opportunity data if editing.
     */
    openOpportunityModal: function(id = '', data = {}) {
        console.log(`Opportunities: Opening opportunity modal for ID: ${id}`);
        const modal = document.getElementById('opportunity-modal');
        const form = document.getElementById('opportunity-form');
        const title = document.getElementById('opportunity-modal-title');

        if (form && title && modal) {
            form.reset(); // Clear form fields
            document.getElementById('opportunity-id').value = id;
            title.textContent = id ? 'Edit Opportunity' : 'Add New Opportunity';

            if (id && data) {
                document.getElementById('opportunity-name').value = data.opportunityName || '';
                document.getElementById('customer-select').value = data.customerId || '';
                document.getElementById('stage').value = data.stage || 'Prospecting';
                document.getElementById('value').value = data.value || '';
                document.getElementById('close-date').value = data.closeDate instanceof this.Utils.Timestamp ? data.closeDate.toDate().toISOString().split('T')[0] : data.closeDate || '';
            }
            modal.classList.remove('hidden');
        } else {
            console.error("Opportunities: Opportunity modal elements not found.");
        }
    },

    /**
     * Closes the opportunity modal.
     */
    closeOpportunityModal: function() {
        console.log("Opportunities: Closing opportunity modal.");
        document.getElementById('opportunity-modal')?.classList.add('hidden');
        document.getElementById('opportunity-form')?.reset();
        document.getElementById('opportunity-id').value = ''; // Clear hidden ID
    },

    /**
     * Handles the submission of the opportunity form.
     * @param {Event} e - The form submit event.
     */
    handleOpportunityFormSubmit: async function(e) {
        e.preventDefault();
        console.log("Opportunities: Opportunity form submitted.");

        const opportunityId = document.getElementById('opportunity-id').value;
        const opportunityName = document.getElementById('opportunity-name').value;
        const customerId = document.getElementById('customer-select').value;
        const stage = document.getElementById('stage').value;
        const value = parseFloat(document.getElementById('value').value);
        const closeDate = document.getElementById('close-date').value;
        const createdBy = Auth.getCurrentUser()?.uid; // Get current user's UID

        if (!createdBy) {
            this.Utils.showMessage('Error: User not authenticated. Cannot save opportunity.', 'error');
            return;
        }

        const opportunityData = {
            opportunityName,
            customerId,
            stage,
            value,
            closeDate: this.Utils.Timestamp.fromDate(new Date(closeDate)), // Convert date string to Timestamp
            createdBy,
            updatedAt: this.Utils.Timestamp.now()
        };

        try {
            if (opportunityId) {
                // Update existing opportunity
                const docRef = this.Utils.doc(this.db, 'opportunities', opportunityId);
                await this.Utils.updateDoc(docRef, opportunityData);
                this.Utils.showMessage('Opportunity updated successfully!', 'success');
                console.log(`Opportunities: Opportunity ${opportunityId} updated.`);
            } else {
                // Add new opportunity
                opportunityData.createdAt = this.Utils.Timestamp.now();
                await this.Utils.addDoc(this.opportunitiesCollectionRef, opportunityData);
                this.Utils.showMessage('Opportunity added successfully!', 'success');
                console.log("Opportunities: New opportunity added.");
            }
            this.closeOpportunityModal();
        } catch (error) {
            this.Utils.handleError(error, opportunityId ? "updating opportunity" : "adding opportunity");
        }
    },

    /**
     * Opens the delete confirmation modal.
     * @param {string} opportunityId - The ID of the opportunity to delete.
     */
    openDeleteConfirmationModal: function(opportunityId) {
        console.log(`Opportunities: Opening delete confirmation modal for ID: ${opportunityId}`);
        const modal = document.getElementById('delete-confirmation-modal');
        const confirmBtn = document.getElementById('confirm-delete-btn');
        if (modal && confirmBtn) {
            confirmBtn.dataset.id = opportunityId; // Store ID on the confirm button
            modal.classList.remove('hidden');
        } else {
            console.error("Opportunities: Delete confirmation modal elements not found.");
        }
    },

    /**
     * Closes the delete confirmation modal.
     */
    closeDeleteConfirmationModal: function() {
        console.log("Opportunities: Closing delete confirmation modal.");
        document.getElementById('delete-confirmation-modal')?.classList.add('hidden');
        document.getElementById('confirm-delete-btn')?.removeAttribute('data-id');
    },

    /**
     * Handles the confirmation of opportunity deletion.
     */
    handleConfirmDelete: async function() {
        const opportunityId = document.getElementById('confirm-delete-btn')?.dataset.id;
        if (!opportunityId) {
            this.Utils.showMessage('Error: No opportunity selected for deletion.', 'error');
            return;
        }
        console.log(`Opportunities: Confirming deletion for ID: ${opportunityId}`);
        try {
            const docRef = this.Utils.doc(this.db, 'opportunities', opportunityId);
            await this.Utils.deleteDoc(docRef);
            this.Utils.showMessage('Opportunity deleted successfully!', 'success');
            console.log(`Opportunities: Opportunity ${opportunityId} deleted.`);
            this.closeDeleteConfirmationModal();
        } catch (error) {
            this.Utils.handleError(error, "deleting opportunity");
        }
    },

    /**
     * Cleans up any resources used by the Opportunities module when it's unloaded.
     */
    destroy: function() {
        console.log("Opportunities: Destroy method called.");
        // Unsubscribe from the real-time listener if it exists
        if (this.unsubscribeOpportunitiesSnapshot) {
            this.unsubscribeOpportunitiesSnapshot();
            this.unsubscribeOpportunitiesSnapshot = null;
            console.log("Opportunities: Real-time listener unsubscribed.");
        }

        // Destroy the Grid.js instance if it exists
        console.log("Opportunities: Checking opportunitiesGrid before destroy. Is it defined?", !!this.opportunitiesGrid);
        if (this.opportunitiesGrid) {
            this.opportunitiesGrid.destroy(); // Properly destroy the Grid.js instance
            this.opportunitiesGrid = null; // *** CRITICAL FIX: Nullify the reference ***
            console.log("Opportunities: Grid.js instance destroyed and reference nulled.");
        } else {
            console.log("Opportunities: No Grid.js instance to destroy.");
        }

        // Clear customers cache
        console.log("Opportunities: Checking customersCache before clear. Is it defined?", !!this.customersCache);
        if (this.customersCache) { // This check is now mostly for safety, as init() will re-create it.
            this.customersCache.clear();
            console.log("Opportunities: Customers cache cleared.");
        } else {
            console.warn("Opportunities: customersCache was undefined during destroy. Cannot clear.");
        }

        // Remove event listeners from static elements if necessary (though often not needed for full module re-render)
        document.getElementById('add-opportunity-btn')?.removeEventListener('click', this.openOpportunityModal);
        document.getElementById('cancel-opportunity-btn')?.removeEventListener('click', this.closeOpportunityModal);
        document.getElementById('opportunity-form')?.removeEventListener('submit', this.handleOpportunityFormSubmit);
        document.getElementById('confirm-delete-btn')?.removeEventListener('click', this.handleConfirmDelete);
        document.getElementById('cancel-delete-btn')?.removeEventListener('click', this.closeDeleteConfirmationModal);

        // Also remove the bound event listeners for grid buttons
        document.querySelectorAll('.edit-opportunity-btn').forEach(btn => {
            if (this.handleEditButtonClickBound) {
                btn.removeEventListener('click', this.handleEditButtonClickBound);
            }
        });
        document.querySelectorAll('.delete-opportunity-btn').forEach(btn => {
            if (this.handleDeleteButtonClickBound) {
                btn.removeEventListener('click', this.handleDeleteButtonClickBound);
            }
        });

        console.log("Opportunities module destroyed.");
    }
};
