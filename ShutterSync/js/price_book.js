// js/price_book.js

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The PriceBook module handles the management of price book entries.
 * This module is only accessible to users with the 'Admin' role.
 */
export const PriceBook = {
    db: null,
    auth: null,
    Utils: null,
    unsubscribe: null, // Listener for price book data
    currentEditingItemId: null, // For editing price book items
    priceBookGrid: null, // Grid.js instance for price book

    /**
     * Initializes the PriceBook module.
     * This method should only initialize core dependencies, not interact with the DOM yet.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("PriceBook module initialized.");
        // No DOM interaction here, as renderPriceBookUI handles it.
    },

    /**
     * Renders the main UI for the Price Book module.
     * This is called by Main.js when the 'price-book' module is activated.
     */
    renderPriceBookUI: function() {
        const priceBookModuleContent = document.getElementById('price-book-module-content');
        if (!priceBookModuleContent) {
            console.error("Price Book module content area not found in DOM.");
            return;
        }

        if (this.Utils.isAdmin()) {
            priceBookModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800">Price Book Management</h3>
                        <button id="add-price-book-item-btn"
                            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200">
                            <i class="fas fa-plus mr-2"></i> Add Item
                        </button>
                    </div>
                    <p class="text-sm text-gray-600 mb-4">Define and manage products/services and their pricing.</p>
                    <div id="price-book-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                </div>

                <!-- Price Book Item Modal (Add/Edit Form) -->
                <div id="price-book-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="price-book-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Price Book Item</h4>
                        <form id="price-book-form">
                            <div class="grid grid-cols-1 gap-4 mb-4">
                                <div>
                                    <label for="item-name" class="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                    <input type="text" id="item-name" name="itemName" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="item-description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea id="item-description" name="itemDescription" rows="2"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                                </div>
                                <div>
                                    <label for="unit-price" class="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
                                    <input type="number" id="unit-price" name="unitPrice" min="0" step="0.01" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="is-active" class="block text-sm font-medium text-gray-700 mb-1">Is Active?</label>
                                    <input type="checkbox" id="is-active" name="isActive" class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                </div>
                            </div>
                            <div class="flex justify-end space-x-3 mt-6">
                                <button type="button" id="cancel-price-book-btn"
                                    class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                    Cancel
                                </button>
                                <button type="submit" id="save-price-book-btn"
                                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                    Save Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            // After rendering HTML, attach event listeners and setup the real-time listener
            this.attachEventListeners();
            this.setupRealtimeListener();
        } else {
            priceBookModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                    <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                </div>
            `;
            console.log("Not an admin, skipping Price Book UI.");
        }
    },

    /**
     * Sets up the real-time listener for the 'price_books_data' subcollection.
     * This path is defined in firebase-rules as /app_metadata/app_settings/price_books_data/{docId}
     */
    setupRealtimeListener: function() {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        if (this.Utils.isAdmin()) {
            const priceBookCollectionRef = collection(this.db, "app_metadata", "app_settings", "price_books_data");
            const q = query(priceBookCollectionRef);

            this.unsubscribe = onSnapshot(q, (snapshot) => {
                const items = [];
                snapshot.forEach((doc) => {
                    items.push({ id: doc.id, ...doc.data() });
                });
                console.log("Price Book data updated:", items);
                this.renderPriceBookGrid(items);
            }, (error) => {
                this.Utils.handleError(error, "fetching price book data");
            });
        } else {
            console.log("Not an admin, skipping price book data listener setup.");
            this.renderPriceBookGrid([]); // Ensure grid is empty or not rendered for non-admins
        }
    },

    /**
     * Renders or updates the Grid.js table for Price Book items.
     * @param {Array<object>} items - An array of price book item objects.
     */
    renderPriceBookGrid: function(items) {
        const gridContainer = document.getElementById('price-book-grid-container');
        if (!gridContainer) {
            console.error("Price Book grid container not found.");
            return;
        }

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'itemName', name: 'Item Name', sort: true, width: 'auto' },
            { id: 'itemDescription', name: 'Description', sort: false, width: 'auto' },
            { id: 'unitPrice', name: 'Unit Price ($)', sort: true, width: '150px', formatter: (cell) => cell ? `$${parseFloat(cell).toFixed(2)}` : '$0.00' },
            {
                id: 'isActive',
                name: 'Active',
                sort: true,
                width: '80px',
                formatter: (cell) => cell ? 'Yes' : 'No'
            },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const itemId = row.cells[0].data; // Get item ID
                    return gridjs.h('div', {
                        className: 'flex items-center justify-center space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-yellow-100 hover:text-yellow-600 transition-colors duration-200',
                            title: 'Edit Item',
                            onClick: () => this.openPriceBookModal('edit', itemId)
                        }, gridjs.h('i', { className: 'fas fa-edit text-lg' })),
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200',
                            title: 'Delete Item',
                            onClick: () => this.deletePriceBookItem(itemId, row.cells[1].data)
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = items.map(item => [
            item.id,
            item.itemName || '',
            item.itemDescription || '',
            item.unitPrice || 0,
            item.isActive || false
        ]);

        if (this.priceBookGrid) {
            this.priceBookGrid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
            this.priceBookGrid = new gridjs.Grid({
                columns: columns,
                data: mappedData,
                sort: true,
                search: true,
                pagination: { limit: 10 },
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
     * Attaches event listeners for UI interactions within the Price Book module.
     */
    attachEventListeners: function() {
        const addPriceBookItemBtn = document.getElementById('add-price-book-item-btn');
        if (addPriceBookItemBtn) addPriceBookItemBtn.addEventListener('click', () => this.openPriceBookModal('add'));

        const priceBookForm = document.getElementById('price-book-form');
        if (priceBookForm) priceBookForm.addEventListener('submit', (e) => { e.preventDefault(); this.savePriceBookItem(); });

        const cancelPriceBookBtn = document.getElementById('cancel-price-book-btn');
        if (cancelPriceBookBtn) cancelPriceBookBtn.addEventListener('click', () => this.closePriceBookModal());

        const priceBookModal = document.getElementById('price-book-modal');
        if (priceBookModal) priceBookModal.addEventListener('click', (e) => { if (e.target === priceBookModal) this.closePriceBookModal(); });
    },

    /**
     * Opens the price book item add/edit modal.
     * @param {string} mode - 'add' or 'edit'.
     * @param {string|null} itemId - The ID of the item to edit, if mode is 'edit'.
     */
    openPriceBookModal: async function(mode, itemId = null) {
        const modal = document.getElementById('price-book-modal');
        const title = document.getElementById('price-book-modal-title');
        const form = document.getElementById('price-book-form');

        form.reset(); // Clear previous form data
        document.getElementById('is-active').checked = true; // Default to active for new items
        this.currentEditingItemId = null; // Clear ID for add mode

        if (mode === 'edit' && itemId) {
            title.textContent = 'Edit Price Book Item';
            this.currentEditingItemId = itemId;
            try {
                // Fetch item data to pre-fill form
                const itemDoc = await getDoc(doc(this.db, 'app_metadata', 'app_settings', 'price_books_data', itemId));
                if (itemDoc.exists()) {
                    const data = itemDoc.data();
                    document.getElementById('item-name').value = data.itemName || '';
                    document.getElementById('item-description').value = data.itemDescription || '';
                    document.getElementById('unit-price').value = data.unitPrice || 0;
                    document.getElementById('is-active').checked = data.isActive || false;
                } else {
                    this.Utils.showMessage('Price Book Item not found for editing.', 'error');
                    this.closePriceBookModal();
                    return;
                }
            } catch (error) {
                this.Utils.handleError(error, "fetching price book item for edit");
                this.closePriceBookModal();
                return;
            }
        } else {
            title.textContent = 'Add New Price Book Item';
        }

        modal.classList.remove('hidden');
        setTimeout(() => { modal.querySelector('div').classList.remove('opacity-0', 'scale-95'); }, 10);
    },

    /**
     * Closes the price book modal.
     */
    closePriceBookModal: function() {
        const modal = document.getElementById('price-book-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => { modal.classList.add('hidden'); }, { once: true });
    },

    /**
     * Saves a new price book item or updates an existing one to Firestore.
     */
    savePriceBookItem: async function() {
        const itemName = document.getElementById('item-name').value.trim();
        const itemDescription = document.getElementById('item-description').value.trim();
        const unitPrice = parseFloat(document.getElementById('unit-price').value);
        const isActive = document.getElementById('is-active').checked;

        if (!itemName || isNaN(unitPrice) || unitPrice < 0) {
            this.Utils.showMessage('Item Name and a valid Unit Price are required.', 'warning');
            return;
        }

        const itemData = {
            itemName: itemName,
            itemDescription: itemDescription,
            unitPrice: unitPrice,
            isActive: isActive,
            updatedAt: new Date()
        };

        try {
            const collectionRef = collection(this.db, "app_metadata", "app_settings", "price_books_data");
            if (this.currentEditingItemId) {
                // Update existing item
                const itemRef = doc(collectionRef, this.currentEditingItemId);
                await this.Utils.updateDoc(itemRef, itemData); // Use Utils.updateDoc
                this.Utils.showMessage('Price Book Item updated successfully!', 'success');
            } else {
                // Add new item
                itemData.createdAt = new Date();
                await addDoc(collectionRef, itemData);
                this.Utils.showMessage('Price Book Item added successfully!', 'success');
            }
            this.closePriceBookModal();
        } catch (error) {
            // Error handling is centralized in Utils.updateDoc/addDoc, no need to duplicate here
            // this.Utils.handleError(error, "saving price book item"); // This line would be redundant
        }
    },

    /**
     * Deletes a price book item from Firestore.
     * @param {string} itemId - The ID of the item to delete.
     * @param {string} itemName - The name of the item for confirmation message.
     */
    deletePriceBookItem: async function(itemId, itemName) {
        this.Utils.showMessage(`Are you sure you want to delete price book item "${itemName}"?`, 'warning', 0); // 0 duration for persistent

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
                    await deleteDoc(doc(this.db, "app_metadata", "app_settings", "price_books_data", itemId));
                    this.Utils.showMessage('Price Book Item deleted successfully!', 'success');
                    messageModalContainer.classList.add('hidden'); // Hide modal explicitly after action
                } catch (error) {
                    this.Utils.handleError(error, "deleting price book item");
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
            console.log("PriceBook module listener unsubscribed.");
        }
        if (this.priceBookGrid) {
            this.priceBookGrid.destroy();
            this.priceBookGrid = null;
        }
        // Remove content from the DOM when destroying
        const priceBookModuleContent = document.getElementById('price-book-module-content');
        if (priceBookModuleContent) {
            priceBookModuleContent.innerHTML = '';
        }
    }
};
