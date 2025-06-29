// js/price_book.js

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The PriceBookModule object handles all functionality related to price book management.
 * This module is exclusively for Admin users.
 */
export const PriceBook = {
    db: null,
    auth: null,
    Utils: null,
    unsubscribe: null, // Listener for price books
    currentPriceBookId: null, // For editing price books
    priceBooksGrid: null, // Grid.js instance for price books

    /**
     * Initializes the PriceBook module.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;

        console.log("PriceBook module initialized.");
        this.renderPriceBookUI();
        this.attachEventListeners();
        this.setupRealtimeListener();
    },

    /**
     * Renders the main UI for the PriceBook module.
     * Only displays content if the current user is an Admin.
     */
    renderPriceBookUI: function() {
        const priceBookModuleContent = document.getElementById('price-book-module-content');
        if (priceBookModuleContent) {
            if (this.Utils.isAdmin()) {
                priceBookModuleContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                        <div class="flex justify-between items-center mb-6">
                            <h3 class="text-2xl font-semibold text-gray-800">Price Books Management</h3>
                            <button id="add-price-book-btn"
                                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200">
                                <i class="fas fa-plus mr-2"></i> Add Price Book
                            </button>
                        </div>
                        <p class="text-sm text-gray-600 mb-4">Manage your product/service price books, which can be linked to opportunities.</p>
                        <div id="price-books-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                    </div>

                    <!-- Price Book Modal -->
                    <div id="price-book-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                        <div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                            <h4 id="price-book-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Price Book</h4>
                            <form id="price-book-form">
                                <div class="grid grid-cols-1 gap-4 mb-4">
                                    <div>
                                        <label for="price-book-name" class="block text-sm font-medium text-gray-700 mb-1">Price Book Name</label>
                                        <input type="text" id="price-book-name" name="name" required
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    </div>
                                    <div>
                                        <label for="price-book-currency" class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                                        <select id="price-book-currency" name="currency" required
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <!-- Options will be dynamically loaded from currencies_data collection -->
                                        </select>
                                    </div>
                                    <div>
                                        <label for="price-book-description" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea id="price-book-description" name="description" rows="3"
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                                    </div>
                                    <div>
                                        <label for="price-book-active-status" class="block text-sm font-medium text-gray-700 mb-1">Active Status</label>
                                        <select id="price-book-active-status" name="active"
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="flex justify-end space-x-3 mt-6">
                                    <button type="button" id="cancel-price-book-btn"
                                        class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                        Cancel
                                    </button>
                                    <button type="submit" id="save-price-book-btn"
                                        class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            } else {
                priceBookModuleContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-md text-center">
                        <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                        <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                    </div>
                `;
            }
        }
    },

    /**
     * Sets up the real-time listener for the 'price_books_data' collection.
     * Only runs if the current user is an Admin.
     */
    setupRealtimeListener: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        if (this.Utils.isAdmin()) {
            const q = query(collection(this.db, "app_metadata/app_settings/price_books_data"));
            this.unsubscribe = onSnapshot(q, (snapshot) => {
                const priceBooks = [];
                snapshot.forEach((doc) => {
                    priceBooks.push({ id: doc.id, ...doc.data() });
                });
                console.log("Price Books data updated:", priceBooks);
                this.renderPriceBooksGrid(priceBooks);
            }, (error) => {
                this.Utils.handleError(error, "fetching price books data");
            });
        } else {
            console.log("Not an admin, skipping price books data listener setup.");
            this.renderPriceBooksGrid([]);
        }
    },

    /**
     * Renders or updates the Grid.js table for Price Books.
     * @param {Array<object>} priceBooks - An array of price book objects.
     */
    renderPriceBooksGrid: function(priceBooks) {
        const gridContainer = document.getElementById('price-books-grid-container');
        if (!gridContainer) return;

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'name', name: 'Price Book Name', sort: true, width: 'auto' },
            { id: 'currency', name: 'Currency', sort: true, width: '100px' },
            { id: 'description', name: 'Description', width: 'auto' },
            { id: 'active', name: 'Active', sort: true, width: '80px' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const priceBookId = row.cells[0].data;
                    const priceBookName = row.cells[1].data;

                    return gridjs.h('div', {
                        className: 'flex items-center justify-center space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-yellow-100 hover:text-yellow-600 transition-colors duration-200',
                            title: 'Edit Price Book',
                            onClick: () => this.openPriceBookModal('edit', priceBookId)
                        }, gridjs.h('i', { className: 'fas fa-edit text-lg' })),
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200',
                            title: 'Delete Price Book',
                            onClick: () => this.deletePriceBook(priceBookId, priceBookName)
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = priceBooks.map(pb => [
            pb.id,
            pb.name || '',
            pb.currency || '',
            pb.description || '',
            pb.active || 'Active'
        ]);

        if (this.priceBooksGrid) {
            this.priceBooksGrid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
            this.priceBooksGrid = new gridjs.Grid({
                columns: columns,
                data: mappedData,
                sort: true,
                search: true,
                pagination: { limit: 5 }, // Smaller pagination for metadata tables
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
     * Populates the currency dropdown in the price book modal.
     * (Assumes currencies are read-accessible by admin, which they are now after last rules update)
     */
    populateCurrencyDropdown: async function() {
        const currencySelect = document.getElementById('price-book-currency');
        currencySelect.innerHTML = '<option value="">Select a Currency</option>';

        try {
            const currenciesCollection = collection(this.db, "app_metadata/app_settings/currencies_data");
            const q = query(currenciesCollection);
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                const currency = doc.data();
                const option = document.createElement('option');
                option.value = currency.currencyCode;
                option.textContent = `${currency.currencyName} (${currency.currencyCode})`;
                currencySelect.appendChild(option);
            });
        } catch (error) {
            this.Utils.handleError(error, "populating currency dropdown for price book");
        }
    },

    /**
     * Attaches event listeners for UI interactions.
     */
    attachEventListeners: function() {
        const addPriceBookBtn = document.getElementById('add-price-book-btn');
        if (addPriceBookBtn) addPriceBookBtn.addEventListener('click', () => this.openPriceBookModal('add'));

        const priceBookForm = document.getElementById('price-book-form');
        if (priceBookForm) priceBookForm.addEventListener('submit', (e) => { e.preventDefault(); this.savePriceBook(); });

        const cancelPriceBookBtn = document.getElementById('cancel-price-book-btn');
        if (cancelPriceBookBtn) cancelPriceBookBtn.addEventListener('click', () => this.closePriceBookModal());

        const priceBookModal = document.getElementById('price-book-modal');
        if (priceBookModal) priceBookModal.addEventListener('click', (e) => { if (e.target === priceBookModal) this.closePriceBookModal(); });
    },

    /**
     * Opens the price book add/edit modal.
     */
    openPriceBookModal: async function(mode, priceBookId = null) {
        const modal = document.getElementById('price-book-modal');
        const title = document.getElementById('price-book-modal-title');
        const form = document.getElementById('price-book-form');

        form.reset();
        this.currentPriceBookId = null;

        await this.populateCurrencyDropdown(); // Populate currency dropdown

        if (mode === 'edit' && priceBookId) {
            title.textContent = 'Edit Price Book';
            this.currentPriceBookId = priceBookId;
            // Fetch price book data to pre-fill form
            try {
                const priceBookDoc = await getDoc(doc(this.db, 'app_metadata/app_settings/price_books_data', priceBookId));
                if (priceBookDoc.exists()) {
                    const data = priceBookDoc.data();
                    document.getElementById('price-book-name').value = data.name || '';
                    document.getElementById('price-book-currency').value = data.currency || '';
                    document.getElementById('price-book-description').value = data.description || '';
                    document.getElementById('price-book-active-status').value = data.active || 'Active';
                } else {
                    this.Utils.showMessage('Price Book not found for editing.', 'error');
                    this.closePriceBookModal();
                    return;
                }
            } catch (error) {
                this.Utils.handleError(error, "fetching price book for edit");
                this.closePriceBookModal();
                return;
            }
        } else {
            title.textContent = 'Add New Price Book';
            document.getElementById('price-book-active-status').value = 'Active';
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
     * Saves a price book to Firestore.
     */
    savePriceBook: async function() {
        const name = document.getElementById('price-book-name').value.trim();
        const currency = document.getElementById('price-book-currency').value;
        const description = document.getElementById('price-book-description').value.trim();
        const active = document.getElementById('price-book-active-status').value;

        if (!name || !currency) {
            this.Utils.showMessage('Price Book Name and Currency are required.', 'warning');
            return;
        }

        try {
            const priceBookData = { name, currency, description, active };
            if (this.currentPriceBookId) {
                await updateDoc(doc(this.db, "app_metadata/app_settings/price_books_data", this.currentPriceBookId), priceBookData);
                this.Utils.showMessage('Price Book updated successfully!', 'success');
            } else {
                await addDoc(collection(this.db, "app_metadata/app_settings/price_books_data"), priceBookData);
                this.Utils.showMessage('Price Book added successfully!', 'success');
            }
            this.closePriceBookModal();
        } catch (error) {
            this.Utils.handleError(error, "saving price book");
        }
    },

    /**
     * Deletes a price book from Firestore.
     */
    deletePriceBook: async function(id, name) {
        this.Utils.showMessage(`Are you sure you want to delete price book "${name}"?`, 'warning', 0);

        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('.p-6');
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete';
            confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2';
            confirmBtn.onclick = async () => {
                try {
                    await deleteDoc(doc(this.db, "app_metadata/app_settings/price_books_data", id));
                    this.Utils.showMessage('Price Book deleted successfully!', 'success');
                    messageModalContainer.remove();
                } catch (error) {
                    this.Utils.handleError(error, "deleting price book");
                    messageModalContainer.remove();
                }
            };
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.className = 'bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg mt-4';
            cancelBtn.onclick = () => { messageModalContainer.remove(); this.Utils.showMessage('Deletion cancelled.', 'info'); };
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
     * Detaches all real-time listeners and destroys Grid.js instances.
     */
    destroy: function() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("PriceBook listener unsubscribed.");
        }
        if (this.priceBooksGrid) {
            this.priceBooksGrid.destroy();
            this.priceBooksGrid = null;
        }
        console.log("PriceBook module destroyed.");
    }
};
