// js/price_book.js

// Ensure Grid.js is loaded globally in index.html, not here.
// <link href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" />
// <script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The PriceBook object handles all functionality related to price book management (Admin only).
 */
export const PriceBook = {
    db: null,       // Firestore database instance
    auth: null,     // Firebase Auth instance
    Utils: null,    // Utility functions instance
    unsubscribe: null, // To store the unsubscribe function for real-time listener
    currentPriceBookId: null, // Used for editing an existing price book entry
    priceBookData: [], // Cache for price book data
    grid: null, // Grid.js instance for the price book table
    // REMOVED: gridJsLoaded: false, // Flag no longer needed as Grid.js is loaded globally

    /**
     * Initializes the Price Book module. This function is called by main.js.
     * It's assumed that this `init` function will only be called if the user is an Admin.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    init: function(firestoreDb, firebaseAuth, utils) { // REMOVED: async keyword
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;

        // Defensive check, though main.js should prevent non-admins from reaching here
        if (!this.Utils.isAdmin()) {
            this.Utils.showMessage('Access Denied: Only Admin users can manage the Price Book.', 'error');
            return;
        }

        console.log("Price Book module initialized.");
        // REMOVED: await this._loadGridJsAssets(); // Grid.js is now loaded globally
        this.renderPriceBookUI(); // Render the initial UI
        this.setupRealtimeListener(); // Set up real-time data listener
        this.attachEventListeners(); // Attach UI event listeners
    },

    // REMOVED: _loadGridJsAssets method

    /**
     * Renders the main UI for the Price Book module.
     */
    renderPriceBookUI: function() {
        const adminPriceBookContent = document.getElementById('admin-price-book-content');
        if (adminPriceBookContent) {
            adminPriceBookContent.innerHTML = `
                <!-- Grid.js CSS and JS are now loaded globally in index.html, removed from here -->
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800">Price Book</h3>
                        <button id="add-price-book-btn"
                            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            <i class="fas fa-plus mr-2"></i> Add New Price Entry
                        </button>
                    </div>
                    <!-- Container for the Price Book Data Grid -->
                    <div id="price-book-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                </div>

                <!-- Price Book Add/Edit Modal (initially hidden) -->
                <div id="price-book-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-lg w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="price-book-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Price Entry</h4>
                        <form id="price-book-form">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label for="item-name" class="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                    <input type="text" id="item-name" name="itemName" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="item-code" class="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                                    <input type="text" id="item-code" name="itemCode"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="unit-price" class="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
                                    <input type="number" id="unit-price" name="unitPrice" step="0.01" min="0" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="currency" class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <select id="currency" name="currency" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        <!-- Options loaded dynamically -->
                                    </select>
                                </div>
                                <div>
                                    <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea id="description" name="description" rows="3"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                                </div>
                            </div>
                            <div class="flex justify-end space-x-3 mt-6">
                                <button type="button" id="cancel-price-book-btn"
                                    class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                    Cancel
                                </button>
                                <button type="submit" id="save-price-book-btn"
                                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                    Save Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
        }
    },

    /**
     * Sets up the real-time listener for the 'price_books_data' collection.
     */
    setupRealtimeListener: function() {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        const q = query(collection(this.db, "app_metadata", "app_settings", "price_books_data"));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const priceBookEntries = [];
            snapshot.forEach((doc) => {
                priceBookEntries.push({ id: doc.id, ...doc.data() });
            });
            this.priceBookData = priceBookEntries;
            console.log("Price Book data updated:", this.priceBookData);
            this.renderPriceBookGrid(this.priceBookData);
        }, (error) => {
            this.Utils.handleError(error, "fetching price book data");
        });
    },

    /**
     * Renders or updates the Grid.js table for price book entries.
     * @param {Array<object>} priceBookEntries - An array of price book entry objects.
     */
    renderPriceBookGrid: function(priceBookEntries) {
        const gridContainer = document.getElementById('price-book-grid-container');
        if (!gridContainer) {
            console.error("Price book grid container not found.");
            return;
        }

        // Now, gridjs is guaranteed to be available globally.
        // REMOVED: if (typeof gridjs === 'undefined' || !this.gridJsLoaded) { ... }

        // Define columns for Grid.js
        const columns = [
            { id: 'itemName', name: 'Item Name', sort: true },
            { id: 'itemCode', name: 'Item Code', sort: true },
            { id: 'unitPrice', name: 'Unit Price', sort: true, formatter: (cell) => `$${parseFloat(cell || 0).toFixed(2)}` },
            { id: 'currency', name: 'Currency', sort: true },
            { id: 'description', name: 'Description', sort: false },
            {
                name: 'Actions',
                formatter: (cell, row) => {
                    const entryId = row.cells[0].data; // Assuming ID is the first cell data (hidden implicitly)
                    const itemName = row.cells[1].data;

                    return gridjs.h('div', {
                        className: 'flex space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.editPriceBookEntry(entryId)
                        }, 'Edit'),
                        gridjs.h('button', {
                            className: 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.deletePriceBookEntry(entryId, itemName)
                        }, 'Delete')
                    ]);
                }
            }
        ];

        if (this.grid) {
            this.grid.updateConfig({
                data: priceBookEntries.map(e => [e.id, e.itemName, e.itemCode, e.unitPrice, e.currency, e.description])
            }).forceRender();
        } else {
            this.grid = new gridjs.Grid({
                columns: columns,
                data: priceBookEntries.map(e => [e.id, e.itemName, e.itemCode, e.unitPrice, e.currency, e.description]),
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
     * Attaches event listeners for UI interactions (Add button, form submission, modal close).
     */
    attachEventListeners: function() {
        document.getElementById('add-price-book-btn').addEventListener('click', () => this.openPriceBookModal('add'));

        const priceBookForm = document.getElementById('price-book-form');
        if (priceBookForm) {
            priceBookForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.savePriceBookEntry();
            });
        }

        document.getElementById('cancel-price-book-btn').addEventListener('click', () => this.closePriceBookModal());

        const priceBookModal = document.getElementById('price-book-modal');
        if (priceBookModal) {
            priceBookModal.addEventListener('click', (e) => {
                if (e.target === priceBookModal) {
                    this.closePriceBookModal();
                }
            });
        }
    },

    /**
     * Populates the currency dropdown in the price book modal.
     */
    populateCurrencyDropdown: async function() {
        const currencySelect = document.getElementById('currency');
        currencySelect.innerHTML = '<option value="">Select Currency</option>'; // Default empty option

        try {
            // UPDATED: Path changed to /app_metadata/app_settings/currencies_data
            const currenciesCollection = collection(this.db, "app_metadata", "app_settings", "currencies_data");
            const q = query(currenciesCollection);
            // Corrected: Use getDocs directly from the 'firebase-firestore.js' import, not `this.db.getDocs`
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const currency = doc.data();
                const option = document.createElement('option');
                option.value = currency.code; // Store currency code
                option.textContent = `${currency.name} (${currency.symbol || currency.code})`;
                currencySelect.appendChild(option);
            });
        } catch (error) {
            this.Utils.handleError(error, "populating currency dropdown for price book");
        }
    },

    /**
     * Opens the price book add/edit modal.
     * @param {string} mode - 'add' or 'edit'.
     * @param {object} [entryData=null] - Data for the price book entry if in 'edit' mode.
     */
    openPriceBookModal: async function(mode, entryData = null) {
        const modal = document.getElementById('price-book-modal');
        const title = document.getElementById('price-book-modal-title');
        const form = document.getElementById('price-book-form');

        // Reset form fields
        form.reset();
        this.currentPriceBookId = null;

        await this.populateCurrencyDropdown(); // Populate currency dropdown first

        if (mode === 'edit' && entryData) {
            title.textContent = 'Edit Price Entry';
            this.currentPriceBookId = entryData.id;
            document.getElementById('item-name').value = entryData.itemName || '';
            document.getElementById('item-code').value = entryData.itemCode || '';
            document.getElementById('unit-price').value = entryData.unitPrice || '';
            document.getElementById('currency').value = entryData.currency || '';
            document.getElementById('description').value = entryData.description || '';
        } else {
            title.textContent = 'Add New Price Entry';
        }

        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('div').classList.remove('opacity-0', 'scale-95');
        }, 10);
    },

    /**
     * Closes the price book add/edit modal.
     */
    closePriceBookModal: function() {
        const modal = document.getElementById('price-book-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => {
            modal.classList.add('hidden');
        }, { once: true });
    },

    /**
     * Saves a new price book entry or updates an existing one to Firestore.
     */
    savePriceBookEntry: async function() {
        const itemName = document.getElementById('item-name').value.trim();
        const itemCode = document.getElementById('item-code').value.trim();
        const unitPrice = parseFloat(document.getElementById('unit-price').value);
        const currency = document.getElementById('currency').value;
        const description = document.getElementById('description').value.trim();

        if (!itemName || isNaN(unitPrice) || unitPrice < 0 || !currency) {
            this.Utils.showMessage('Item Name, valid Unit Price, and Currency are required.', 'warning');
            return;
        }

        try {
            const entryData = {
                itemName,
                itemCode,
                unitPrice,
                currency,
                description,
                updatedAt: new Date()
            };

            if (this.currentPriceBookId) {
                // Update existing entry
                await updateDoc(doc(this.db, "app_metadata", "app_settings", "price_books_data", this.currentPriceBookId), entryData);
                this.Utils.showMessage('Price book entry updated successfully!', 'success');
            } else {
                // Add new entry
                entryData.createdAt = new Date();
                await addDoc(collection(this.db, "app_metadata", "app_settings", "price_books_data"), entryData);
                this.Utils.showMessage('Price book entry added successfully!', 'success');
            }
            this.closePriceBookModal();
        } catch (error) {
            this.Utils.handleError(error, "saving price book entry");
        }
    },

    /**
     * Handles editing a price book entry.
     * @param {string} id - The document ID of the entry to edit.
     */
    editPriceBookEntry: function(id) {
        const entryToEdit = this.priceBookData.find(e => e.id === id);
        if (entryToEdit) {
            this.openPriceBookModal('edit', entryToEdit);
        } else {
            this.Utils.showMessage('Price book entry not found for editing.', 'error');
        }
    },

    /**
     * Deletes a price book entry from Firestore after confirmation.
     * @param {string} id - The document ID of the entry to delete.
     * @param {string} itemName - The name of the item for confirmation message.
     */
    deletePriceBookEntry: async function(id, itemName) {
        this.Utils.showMessage(`Are you sure you want to delete price entry for "${itemName}"?`, 'warning', 0);

        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('.p-6');
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete';
            confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2';
            confirmBtn.onclick = async () => {
                try {
                    await deleteDoc(doc(this.db, "app_metadata", "app_settings", "price_books_data", id));
                    this.Utils.showMessage('Price book entry deleted successfully!', 'success');
                    messageModalContainer.remove();
                } catch (error) {
                    this.Utils.handleError(error, "deleting price book entry");
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
     * Detaches the real-time listener and destroys the grid when the module is no longer active.
     */
    destroy: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("Price Book listener unsubscribed.");
        }
        if (this.grid) {
            this.grid.destroy(); // Destroy Grid.js instance
            this.grid = null;
        }
        // REMOVED: this.gridJsLoaded = false; // Flag not needed anymore
    }
};
