// js/price_book.js

import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';
import { Auth } from './auth.js';

/**
 * The PriceBook module handles the management of products/services and their pricing.
 */
export const PriceBook = {
    db: null,
    auth: null,
    Utils: null,
    unsubscribe: null, // Listener for price book items
    currentEditingItemId: null, // For editing price book items
    priceBookGrid: null, // Grid.js instance for the price book table

    /**
     * Initializes the PriceBook module.
     * This method should only initialize core dependencies, not interact with the DOM yet.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("PriceBook module initialized.");
    },

    /**
     * Renders the main UI for the PriceBook module.
     * This is called by Main.js when the 'priceBook' module is activated.
     *
     * @param {HTMLElement} moduleContentElement - The DOM element where the PriceBook UI should be rendered.
     * @param {boolean} isLoggedIn - The current login status (true/false).
     * @param {boolean} isAdmin - The current admin status (true/false).
     * @param {object|null} currentUser - The current Firebase User object, or null if logged out.
     */
    renderPriceBookUI: function(moduleContentElement, isLoggedIn, isAdmin, currentUser) {
        const priceBookModuleContent = moduleContentElement;

        if (!priceBookModuleContent) {
            console.error("PriceBook module: Target content element was not provided or is null.");
            this.Utils.showMessage("Error: Price Book module could not find its content area.", "error");
            return;
        }

        // Use the passed isLoggedIn directly for module access check
        if (!isLoggedIn) {
            priceBookModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                    <p class="text-gray-600 mb-4">You must be logged in to view price book data.</p>
                    <button id="go-to-home-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                        Go to Home / Login
                    </button>
                </div>
            `;
            document.getElementById('go-to-home-btn')?.addEventListener('click', () => {
                window.Main.loadModule('home', isLoggedIn, isAdmin, currentUser); // Redirect to home page
            });
            this.destroy(); // Clean up any previous grid/listeners
            this.Utils.showMessage("Access Denied: Please log in to view Price Book.", "error");
            return;
        }

        // Use the passed isAdmin directly for UI rendering
        if (isAdmin) {
            priceBookModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800">Price Book Management</h3>
                        <button id="add-price-book-item-btn"
                            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200">
                            <i class="fas fa-plus mr-2"></i> Add Item
                        </button>
                    </div>
                    <p class="text-sm text-gray-600 mb-4">Manage products and services offered, including their prices.</p>
                    <div id="price-book-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                </div>

                <!-- Price Book Item Modal (Add/Edit Form) -->
                <div id="price-book-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="price-book-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Price Book Item</h4>
                        <form id="price-book-form">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label for="item-name" class="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                                    <input type="text" id="item-name" name="itemName" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="item-type" class="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select id="item-type" name="itemType" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                                        <option value="Product">Product</option>
                                        <option value="Service">Service</option>
                                    </select>
                                </div>
                                <div class="md:col-span-2">
                                    <label for="item-description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea id="item-description" name="description" rows="2"
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                                </div>
                                <div>
                                    <label for="unit-price" class="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                                    <input type="number" id="unit-price" name="unitPrice" step="0.01" min="0" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                </div>
                                <div>
                                    <label for="currency" class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                    <select id="currency" name="currency" required
                                        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white">
                                        <!-- Currencies will be loaded here dynamically -->
                                    </select>
                                </div>
                            </div>
                            <div class="flex justify-end space-x-3 mt-6">
                                <button type="button" id="cancel-price-book-item-btn"
                                    class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                    Cancel
                                </button>
                                <button type="submit" id="save-price-book-item-btn"
                                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                    Save Item
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;
            this.attachEventListeners();
            // Pass resolved auth state to listener setup
            this.setupRealtimeListener(isLoggedIn, isAdmin, currentUser);
        } else {
            // If logged in but not admin
            priceBookModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                    <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                    <button id="go-to-home-btn" class="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                        Go to Home
                    </button>
                </div>
            `;
            document.getElementById('go-to-home-btn')?.addEventListener('click', () => {
                window.Main.loadModule('home', isLoggedIn, isAdmin, currentUser); // Redirect to home page
            });
            console.log("Not an admin, skipping Price Book UI.");
            if (this.priceBookGrid) { this.priceBookGrid.destroy(); this.priceBookGrid = null; }
            this.Utils.showMessage("Access Denied: You must be an Admin to view Price Book.", "error");
        }
    },

    /**
     * Sets up the real-time listener for the 'price_book' collection.
     * @param {boolean} isLoggedIn - The current login status.
     * @param {boolean} isAdmin - The current admin status.
     * @param {object|null} currentUser - The current Firebase User object.
     * Only runs if the current user is an Admin.
     */
    setupRealtimeListener: function(isLoggedIn, isAdmin, currentUser) {
        if (this.unsubscribe) {
            this.unsubscribe(); // Detach existing listener if any
        }

        const userId = currentUser ? currentUser.uid : null;
        if (!isLoggedIn || !isAdmin || !userId) { // Rely on passed flags
            console.log("Not logged in or not an admin, skipping price book listener setup.");
            this.renderPriceBookGrid([]); // Clear grid if not authorized
            return;
        }

        // Path changed to app_metadata/app_settings/price_books_data
        const q = query(collection(this.db, "app_metadata/app_settings/price_books_data"));
        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const items = [];
            snapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            console.log("Price Book data updated:", items);
            this.renderPriceBookGrid(items);
        }, (error) => {
            this.Utils.handleError(error, "fetching price book data");
            this.renderPriceBookGrid([]);
        });
    },

    /**
     * Renders or updates the Grid.js table for Price Book items.
     * @param {Array<object>} items - An array of price book item objects.
     */
    renderPriceBookGrid: function(items) {
        const gridContainer = document.getElementById('price-book-grid-container');
        if (!gridContainer) {
            console.error("Price book grid container not found.");
            return;
        }

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'itemName', name: 'Item Name', sort: true, width: 'auto' },
            { id: 'itemType', name: 'Type', sort: true, width: '100px' },
            { id: 'description', name: 'Description', sort: false, width: 'auto' },
            { id: 'unitPrice', name: 'Unit Price', sort: true, width: '120px', formatter: (cell, row) => {
                // Find the item data from the original 'items' array based on the row ID
                const item = items.find(i => i.id === row.cells[0].data);
                const currency = item ? (item.currency || '') : '';
                return `${currency} ${parseFloat(cell).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }},
            { id: 'currency', name: 'Currency', sort: true, width: '100px' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const itemId = row.cells[0].data;
                    const itemData = items.find(i => i.id === itemId);
                    return gridjs.h('div', {
                        className: 'flex items-center justify-center space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-yellow-100 hover:text-yellow-600 transition-colors duration-200',
                            title: 'Edit Item',
                            onClick: () => this.openPriceBookModal('edit', itemId, itemData)
                        }, gridjs.h('i', { className: 'fas fa-edit text-lg' })),
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200',
                            title: 'Delete Item',
                            onClick: () => this.deletePriceBookItem(itemId, itemData.itemName)
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = items.map(i => [i.id, i.itemName, i.itemType, i.description, i.unitPrice, i.currency]);

        if (this.priceBookGrid) {
            this.priceBookGrid.updateConfig({ data: mappedData }).forceRender();
        } else {
            this.priceBookGrid = new gridjs.Grid({
                columns: columns,
                data: mappedData,
                sort: true,
                search: true,
                pagination: { limit: 5 },
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
     * Fetches currencies from Firestore to populate the currency dropdown.
     */
    fetchCurrenciesForDropdown: async function(selectedCurrency = null) {
        const currencySelect = document.getElementById('currency');
        if (!currencySelect) return;

        // Use Auth.isLoggedIn() and Utils.isAdmin() for real-time check when fetching
        if (!Auth.isLoggedIn() || !Utils.isAdmin()) {
            console.log('Not authorized to fetch currencies for dropdown.');
            currencySelect.innerHTML = '<option value="">(Login as Admin)</option>';
            return;
        }

        currencySelect.innerHTML = '<option value="">Select Currency</option>';
        try {
            // Path changed to app_metadata/app_settings/currencies_data
            const q = query(collection(this.db, "app_metadata/app_settings/currencies_data"));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((docSnap) => {
                const currencyData = docSnap.data();
                const option = document.createElement('option');
                option.value = currencyData.code;
                option.textContent = `${currencyData.code} (${currencyData.symbol})`;
                if (currencyData.code === selectedCurrency) {
                    option.selected = true;
                }
                currencySelect.appendChild(option);
            });
        } catch (error) {
            this.Utils.handleError(error, "fetching currencies for dropdown");
        }
    },

    /**
     * Attaches event listeners for UI interactions within the PriceBook module.
     */
    attachEventListeners: function() {
        document.getElementById('add-price-book-item-btn')?.addEventListener('click', () => this.openPriceBookModal('add'));
        document.getElementById('price-book-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.savePriceBookItem(); });
        document.getElementById('cancel-price-book-item-btn')?.addEventListener('click', () => this.closePriceBookModal());
        document.getElementById('price-book-modal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('price-book-modal')) this.closePriceBookModal(); });
    },

    /**
     * Opens the price book item add/edit modal.
     */
    openPriceBookModal: async function(mode, id = null, itemData = {}) {
        // Use Auth.isLoggedIn() and Utils.isAdmin() for real-time check when modal is opened
        if (!Auth.isLoggedIn() || !Utils.isAdmin()) {
            this.Utils.showMessage('You do not have permission to add/edit price book items.', 'error');
            return;
        }

        const modal = document.getElementById('price-book-modal');
        const title = document.getElementById('price-book-modal-title');
        const form = document.getElementById('price-book-form');
        form.reset();
        this.currentEditingItemId = null;

        // Fetch currencies first so dropdown is populated (it uses Auth.isLoggedIn/Utils.isAdmin internally)
        await this.fetchCurrenciesForDropdown(itemData.currency);

        if (mode === 'edit' && id && itemData) {
            title.textContent = 'Edit Price Book Item';
            this.currentEditingItemId = id;
            document.getElementById('item-name').value = itemData.itemName || '';
            document.getElementById('item-type').value = itemData.itemType || 'Product';
            document.getElementById('item-description').value = itemData.description || '';
            document.getElementById('unit-price').value = itemData.unitPrice || 0;
            document.getElementById('currency').value = itemData.currency || ''; // Set currency from fetched data
        } else {
            title.textContent = 'Add New Price Book Item';
            document.getElementById('item-type').value = 'Product'; // Default for new
            document.getElementById('unit-price').value = 0; // Default for new
        }
        modal.classList.remove('hidden');
        setTimeout(() => { modal.querySelector('div').classList.remove('opacity-0', 'scale-95'); }, 10);
    },

    /**
     * Closes the price book item modal.
     */
    closePriceBookModal: function() {
        const modal = document.getElementById('price-book-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => { modal.classList.add('hidden'); }, { once: true });
    },

    /**
     * Saves a new price book item or updates an existing one.
     */
    savePriceBookItem: async function() {
        // Use Auth.isLoggedIn() and Utils.isAdmin() for real-time check when saving
        if (!Auth.isLoggedIn() || !Utils.isAdmin()) {
            this.Utils.showMessage('You do not have permission to save price book items.', 'error');
            this.closePriceBookModal();
            return;
        }

        const itemName = document.getElementById('item-name').value.trim();
        const itemType = document.getElementById('item-type').value;
        const description = document.getElementById('item-description').value.trim();
        const unitPrice = parseFloat(document.getElementById('unit-price').value);
        const currency = document.getElementById('currency').value;

        if (!itemName || !itemType || isNaN(unitPrice) || unitPrice < 0 || !currency) {
            this.Utils.showMessage('All fields are required (Item Name, Type, Unit Price, Currency) and Unit Price must be a positive number.', 'warning');
            return;
        }

        const itemData = {
            itemName: itemName,
            itemType: itemType,
            description: description,
            unitPrice: unitPrice,
            currency: currency
        };

        try {
            // Path changed to app_metadata/app_settings/price_books_data
            const collectionRef = collection(this.db, "app_metadata/app_settings/price_books_data");
            if (this.currentEditingItemId) {
                const itemRef = doc(collectionRef, this.currentEditingItemId);
                await this.Utils.updateDoc(itemRef, itemData); // Using Utils.updateDoc
                this.Utils.showMessage('Price Book Item updated successfully!', 'success');
            } else {
                itemData.createdAt = new Date(); // Add creation timestamp
                await addDoc(collectionRef, itemData);
                this.Utils.showMessage('Price Book Item added successfully!', 'success');
            }
            this.closePriceBookModal();
        } catch (error) {
            this.Utils.handleError(error, "saving price book item");
        }
    },

    /**
     * Deletes a price book item from Firestore.
     */
    deletePriceBookItem: async function(id, itemName) {
        // Use Auth.isLoggedIn() and Utils.isAdmin() for real-time check when deleting
        if (!Auth.isLoggedIn() || !Utils.isAdmin()) {
            this.Utils.showMessage('You do not have permission to delete price book items.', 'error');
            return;
        }

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
                    // Path changed to app_metadata/app_settings/price_books_data
                    await deleteDoc(doc(this.db, "app_metadata/app_settings/price_books_data", id));
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
     * Detaches all real-time listeners and destroys Grid.js instances.
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
        console.log("PriceBook module destroyed.");
    }
};
