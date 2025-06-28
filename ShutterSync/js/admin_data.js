// js/admin_data.js

// Ensure Grid.js is loaded for data grids
// <link href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" />
// <script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The AdminData object handles all functionality related to administrative master data
 * such as Country Mapping and Currencies.
 */
export const AdminData = {
    db: null,       // Firestore database instance
    auth: null,     // Firebase Auth instance
    Utils: null,    // Utility functions instance

    // Properties for Country Mapping
    countryUnsubscribe: null,
    currentCountryId: null,
    countriesData: [],
    countryGrid: null,

    // Properties for Currencies
    currencyUnsubscribe: null,
    currentCurrencyId: null,
    currenciesData: [],
    currencyGrid: null,

    /**
     * Common initialization function to set up Firebase and Utils.
     * @param {object} firestoreDb - The Firestore database instance.
     * @param {object} firebaseAuth - The Firebase Auth instance.
     * @param {object} utils - The Utils object for common functionalities.
     */
    commonInit: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;

        // Defensive check: this module should only be accessible by admins.
        if (!this.Utils.isAdmin()) {
            this.Utils.showMessage('Access Denied: Only Admin users can manage master data.', 'error');
            return false;
        }
        return true;
    },

    /**
     * Initializes the Country Mapping module. Called by main.js.
     */
    initCountryMapping: function(firestoreDb, firebaseAuth, utils) {
        if (!this.commonInit(firestoreDb, firebaseAuth, utils)) return;

        console.log("Admin: Country Mapping module initialized.");
        this.renderCountryMappingUI();
        this.setupCountryRealtimeListener();
        this.attachCountryEventListeners();
    },

    /**
     * Initializes the Currencies module. Called by main.js.
     */
    initCurrencies: function(firestoreDb, firebaseAuth, utils) {
        if (!this.commonInit(firestoreDb, firebaseAuth, utils)) return;

        console.log("Admin: Currencies module initialized.");
        this.renderCurrenciesUI();
        this.setupCurrencyRealtimeListener();
        this.attachCurrencyEventListeners();
    },

    /*
     * --- Country Mapping Functions ---
     */

    /**
     * Renders the UI for Country Mapping.
     */
    renderCountryMappingUI: function() {
        const adminCountryMappingContent = document.getElementById('admin-country-mapping-content');
        if (adminCountryMappingContent) {
            adminCountryMappingContent.innerHTML = `
                <!-- Grid.js CSS -->
                <link href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" />
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800">Country Mapping</h3>
                        <button id="add-country-btn"
                            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            <i class="fas fa-plus mr-2"></i> Add New Country
                        </button>
                    </div>
                    <div id="country-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                </div>

                <!-- Country Add/Edit Modal -->
                <div id="country-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="country-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Country</h4>
                        <form id="country-form">
                            <div class="mb-4">
                                <label for="country-name" class="block text-sm font-medium text-gray-700 mb-1">Country Name</label>
                                <input type="text" id="country-name" name="name" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="mb-4">
                                <label for="country-code" class="block text-sm font-medium text-gray-700 mb-1">Country Code (e.g., US, CA)</label>
                                <input type="text" id="country-code" name="code" required maxlength="2"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase">
                            </div>
                            <div class="flex justify-end space-x-3 mt-6">
                                <button type="button" id="cancel-country-btn"
                                    class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                    Cancel
                                </button>
                                <button type="submit" id="save-country-btn"
                                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                    Save Country
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                <!-- Grid.js JS -->
                <script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>
            `;
        }
    },

    /**
     * Sets up the real-time listener for the 'country_mapping' collection.
     */
    setupCountryRealtimeListener: function() {
        if (this.countryUnsubscribe) {
            this.countryUnsubscribe();
        }

        const q = query(collection(this.db, "country_mapping"));

        this.countryUnsubscribe = onSnapshot(q, (snapshot) => {
            const countries = [];
            snapshot.forEach((doc) => {
                countries.push({ id: doc.id, ...doc.data() });
            });
            this.countriesData = countries;
            console.log("Country data updated:", this.countriesData);
            this.renderCountryGrid(this.countriesData);
        }, (error) => {
            this.Utils.handleError(error, "fetching country data");
        });
    },

    /**
     * Renders or updates the Grid.js table for countries.
     */
    renderCountryGrid: function(countries) {
        const gridContainer = document.getElementById('country-grid-container');
        if (!gridContainer) return;

        const columns = [
            { id: 'name', name: 'Country Name', sort: true },
            { id: 'code', name: 'Code', sort: true },
            {
                name: 'Actions',
                formatter: (cell, row) => {
                    const countryId = row.cells[0].data; // Assuming ID is first data in row
                    const countryName = row.cells[1].data;

                    return gridjs.h('div', { className: 'flex space-x-2' }, [
                        gridjs.h('button', {
                            className: 'bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.editCountry(countryId)
                        }, 'Edit'),
                        gridjs.h('button', {
                            className: 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.deleteCountry(countryId, countryName)
                        }, 'Delete')
                    ]);
                }
            }
        ];

        if (typeof gridjs === 'undefined') {
            this.Utils.showMessage("Grid.js library not loaded. Please refresh the page.", "error");
            return;
        }

        if (this.countryGrid) {
            this.countryGrid.updateConfig({
                data: countries.map(c => [c.id, c.name, c.code])
            }).forceRender();
        } else {
            this.countryGrid = new gridjs.Grid({
                columns: columns,
                data: countries.map(c => [c.id, c.name, c.code]),
                sort: true, search: true, pagination: { limit: 10 },
                className: {
                    table: 'min-w-full divide-y divide-gray-200', th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900', footer: 'flex items-center justify-between px-6 py-3',
                    paginationButton: 'px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100',
                    paginationButtonCurrent: 'bg-blue-600 text-white hover:bg-blue-700', search: 'p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500',
                    container: 'shadow-md rounded-lg overflow-hidden'
                }
            }).render(gridContainer);
        }
    },

    /**
     * Attaches event listeners for Country Mapping UI.
     */
    attachCountryEventListeners: function() {
        document.getElementById('add-country-btn').addEventListener('click', () => this.openCountryModal('add'));
        document.getElementById('country-form').addEventListener('submit', (e) => { e.preventDefault(); this.saveCountry(); });
        document.getElementById('cancel-country-btn').addEventListener('click', () => this.closeCountryModal());
        document.getElementById('country-modal').addEventListener('click', (e) => { if (e.target === document.getElementById('country-modal')) { this.closeCountryModal(); } });
    },

    /**
     * Opens the country add/edit modal.
     */
    openCountryModal: function(mode, countryData = null) {
        const modal = document.getElementById('country-modal');
        const title = document.getElementById('country-modal-title');
        const form = document.getElementById('country-form');
        form.reset();
        this.currentCountryId = null;

        if (mode === 'edit' && countryData) {
            title.textContent = 'Edit Country';
            this.currentCountryId = countryData.id;
            document.getElementById('country-name').value = countryData.name || '';
            document.getElementById('country-code').value = countryData.code || '';
        } else {
            title.textContent = 'Add New Country';
        }
        modal.classList.remove('hidden');
        setTimeout(() => { modal.querySelector('div').classList.remove('opacity-0', 'scale-95'); }, 10);
    },

    /**
     * Closes the country add/edit modal.
     */
    closeCountryModal: function() {
        const modal = document.getElementById('country-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => { modal.classList.add('hidden'); }, { once: true });
    },

    /**
     * Saves a new country or updates an existing one.
     */
    saveCountry: async function() {
        const name = document.getElementById('country-name').value.trim();
        const code = document.getElementById('country-code').value.trim().toUpperCase();

        if (!name || !code) {
            this.Utils.showMessage('Country Name and Code are required.', 'warning');
            return;
        }

        try {
            const countryData = { name, code, updatedAt: new Date() };
            if (this.currentCountryId) {
                await updateDoc(doc(this.db, "country_mapping", this.currentCountryId), countryData);
                this.Utils.showMessage('Country updated successfully!', 'success');
            } else {
                countryData.createdAt = new Date();
                await addDoc(collection(this.db, "country_mapping"), countryData);
                this.Utils.showMessage('Country added successfully!', 'success');
            }
            this.closeCountryModal();
        } catch (error) {
            this.Utils.handleError(error, "saving country");
        }
    },

    /**
     * Handles editing a country.
     */
    editCountry: function(id) {
        const countryToEdit = this.countriesData.find(c => c.id === id);
        if (countryToEdit) {
            this.openCountryModal('edit', countryToEdit);
        } else {
            this.Utils.showMessage('Country not found for editing.', 'error');
        }
    },

    /**
     * Deletes a country.
     */
    deleteCountry: async function(id, name) {
        this.Utils.showMessage(`Are you sure you want to delete country "${name}"?`, 'warning', 0);
        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('.p-6');
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete'; confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2';
            confirmBtn.onclick = async () => { try { await deleteDoc(doc(this.db, "country_mapping", id)); this.Utils.showMessage('Country deleted successfully!', 'success'); messageModalContainer.remove(); } catch (error) { this.Utils.handleError(error, "deleting country"); messageModalContainer.remove(); } };
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel'; cancelBtn.className = 'bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg mt-4';
            cancelBtn.onclick = () => { messageModalContainer.remove(); this.Utils.showMessage('Deletion cancelled.', 'info'); };
            const existingButtons = messageBox.querySelectorAll('button:not(.absolute.top-2)'); existingButtons.forEach(btn => btn.remove());
            const buttonContainer = document.createElement('div'); buttonContainer.className = 'flex justify-end pt-4 border-t border-gray-200 mt-4';
            buttonContainer.appendChild(cancelBtn); buttonContainer.appendChild(confirmBtn); messageBox.appendChild(buttonContainer);
        }
    },

    /*
     * --- Currencies Functions ---
     */

    /**
     * Renders the UI for Currencies.
     */
    renderCurrenciesUI: function() {
        const adminCurrenciesContent = document.getElementById('admin-currencies-content');
        if (adminCurrenciesContent) {
            adminCurrenciesContent.innerHTML = `
                <!-- Grid.js CSS -->
                <link href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css" rel="stylesheet" />
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800">Currencies</h3>
                        <button id="add-currency-btn"
                            class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                            <i class="fas fa-plus mr-2"></i> Add New Currency
                        </button>
                    </div>
                    <div id="currency-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                </div>

                <!-- Currency Add/Edit Modal -->
                <div id="currency-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="currency-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Currency</h4>
                        <form id="currency-form">
                            <div class="mb-4">
                                <label for="currency-name" class="block text-sm font-medium text-gray-700 mb-1">Currency Name</label>
                                <input type="text" id="currency-name" name="name" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="mb-4">
                                <label for="currency-code" class="block text-sm font-medium text-gray-700 mb-1">Currency Code (e.g., USD, EUR)</label>
                                <input type="text" id="currency-code" name="code" required maxlength="3"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase">
                            </div>
                            <div class="mb-4">
                                <label for="currency-symbol" class="block text-sm font-medium text-gray-700 mb-1">Symbol (e.g., $, €)</label>
                                <input type="text" id="currency-symbol" name="symbol" maxlength="5"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="flex justify-end space-x-3 mt-6">
                                <button type="button" id="cancel-currency-btn"
                                    class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                    Cancel
                                </button>
                                <button type="submit" id="save-currency-btn"
                                    class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                    Save Currency
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                <!-- Grid.js JS -->
                <script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>
            `;
        }
    },

    /**
     * Sets up the real-time listener for the 'currencies' collection.
     */
    setupCurrencyRealtimeListener: function() {
        if (this.currencyUnsubscribe) {
            this.currencyUnsubscribe();
        }

        const q = query(collection(this.db, "currencies"));

        this.currencyUnsubscribe = onSnapshot(q, (snapshot) => {
            const currencies = [];
            snapshot.forEach((doc) => {
                currencies.push({ id: doc.id, ...doc.data() });
            });
            this.currenciesData = currencies;
            console.log("Currency data updated:", this.currenciesData);
            this.renderCurrencyGrid(this.currenciesData);
        }, (error) => {
            this.Utils.handleError(error, "fetching currency data");
        });
    },

    /**
     * Renders or updates the Grid.js table for currencies.
     */
    renderCurrencyGrid: function(currencies) {
        const gridContainer = document.getElementById('currency-grid-container');
        if (!gridContainer) return;

        const columns = [
            { id: 'name', name: 'Currency Name', sort: true },
            { id: 'code', name: 'Code', sort: true },
            { id: 'symbol', name: 'Symbol' },
            {
                name: 'Actions',
                formatter: (cell, row) => {
                    const currencyId = row.cells[0].data; // Assuming ID is first data in row
                    const currencyName = row.cells[1].data;

                    return gridjs.h('div', { className: 'flex space-x-2' }, [
                        gridjs.h('button', {
                            className: 'bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.editCurrency(currencyId)
                        }, 'Edit'),
                        gridjs.h('button', {
                            className: 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200',
                            onClick: () => this.deleteCurrency(currencyId, currencyName)
                        }, 'Delete')
                    ]);
                }
            }
        ];

        if (typeof gridjs === 'undefined') {
            this.Utils.showMessage("Grid.js library not loaded. Please refresh the page.", "error");
            return;
        }

        if (this.currencyGrid) {
            this.currencyGrid.updateConfig({
                data: currencies.map(c => [c.id, c.name, c.code, c.symbol])
            }).forceRender();
        } else {
            this.currencyGrid = new gridjs.Grid({
                columns: columns,
                data: currencies.map(c => [c.id, c.name, c.code, c.symbol]),
                sort: true, search: true, pagination: { limit: 10 },
                className: {
                    table: 'min-w-full divide-y divide-gray-200', th: 'px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    td: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900', footer: 'flex items-center justify-between px-6 py-3',
                    paginationButton: 'px-3 py-1 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100',
                    paginationButtonCurrent: 'bg-blue-600 text-white hover:bg-blue-700', search: 'p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500',
                    container: 'shadow-md rounded-lg overflow-hidden'
                }
            }).render(gridContainer);
        }
    },

    /**
     * Attaches event listeners for Currencies UI.
     */
    attachCurrencyEventListeners: function() {
        document.getElementById('add-currency-btn').addEventListener('click', () => this.openCurrencyModal('add'));
        document.getElementById('currency-form').addEventListener('submit', (e) => { e.preventDefault(); this.saveCurrency(); });
        document.getElementById('cancel-currency-btn').addEventListener('click', () => this.closeCurrencyModal());
        document.getElementById('currency-modal').addEventListener('click', (e) => { if (e.target === document.getElementById('currency-modal')) { this.closeCurrencyModal(); } });
    },

    /**
     * Opens the currency add/edit modal.
     */
    openCurrencyModal: function(mode, currencyData = null) {
        const modal = document.getElementById('currency-modal');
        const title = document.getElementById('currency-modal-title');
        const form = document.getElementById('currency-form');
        form.reset();
        this.currentCurrencyId = null;

        if (mode === 'edit' && currencyData) {
            title.textContent = 'Edit Currency';
            this.currentCurrencyId = currencyData.id;
            document.getElementById('currency-name').value = currencyData.name || '';
            document.getElementById('currency-code').value = currencyData.code || '';
            document.getElementById('currency-symbol').value = currencyData.symbol || '';
        } else {
            title.textContent = 'Add New Currency';
        }
        modal.classList.remove('hidden');
        setTimeout(() => { modal.querySelector('div').classList.remove('opacity-0', 'scale-95'); }, 10);
    },

    /**
     * Closes the currency add/edit modal.
     */
    closeCurrencyModal: function() {
        const modal = document.getElementById('currency-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => { modal.classList.add('hidden'); }, { once: true });
    },

    /**
     * Saves a new currency or updates an existing one.
     */
    saveCurrency: async function() {
        const name = document.getElementById('currency-name').value.trim();
        const code = document.getElementById('currency-code').value.trim().toUpperCase();
        const symbol = document.getElementById('currency-symbol').value.trim();

        if (!name || !code) {
            this.Utils.showMessage('Currency Name and Code are required.', 'warning');
            return;
        }

        try {
            const currencyData = { name, code, symbol, updatedAt: new Date() };
            if (this.currentCurrencyId) {
                await updateDoc(doc(this.db, "currencies", this.currentCurrencyId), currencyData);
                this.Utils.showMessage('Currency updated successfully!', 'success');
            } else {
                currencyData.createdAt = new Date();
                await addDoc(collection(this.db, "currencies"), currencyData);
                this.Utils.showMessage('Currency added successfully!', 'success');
            }
            this.closeCurrencyModal();
        } catch (error) {
            this.Utils.handleError(error, "saving currency");
        }
    },

    /**
     * Handles editing a currency.
     */
    editCurrency: function(id) {
        const currencyToEdit = this.currenciesData.find(c => c.id === id);
        if (currencyToEdit) {
            this.openCurrencyModal('edit', currencyToEdit);
        } else {
            this.Utils.showMessage('Currency not found for editing.', 'error');
        }
    },

    /**
     * Deletes a currency.
     */
    deleteCurrency: async function(id, name) {
        this.Utils.showMessage(`Are you sure you want to delete currency "${name}"?`, 'warning', 0);
        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('.p-6');
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete'; confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2';
            confirmBtn.onclick = async () => { try { await deleteDoc(doc(this.db, "currencies", id)); this.Utils.showMessage('Currency deleted successfully!', 'success'); messageModalContainer.remove(); } catch (error) { this.Utils.handleError(error, "deleting currency"); messageModalContainer.remove(); } };
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel'; cancelBtn.className = 'bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg mt-4';
            cancelBtn.onclick = () => { messageModalContainer.remove(); this.Utils.showMessage('Deletion cancelled.', 'info'); };
            const existingButtons = messageBox.querySelectorAll('button:not(.absolute.top-2)'); existingButtons.forEach(btn => btn.remove());
            const buttonContainer = document.createElement('div'); buttonContainer.className = 'flex justify-end pt-4 border-t border-gray-200 mt-4';
            buttonContainer.appendChild(cancelBtn); buttonContainer.appendChild(confirmBtn); messageBox.appendChild(buttonContainer);
        }
    },

    /**
     * Detaches all real-time listeners and destroys grids when the module is no longer active.
     */
    destroy: function() {
        if (this.countryUnsubscribe) {
            this.countryUnsubscribe();
            this.countryUnsubscribe = null;
            console.log("Country Mapping listener unsubscribed.");
        }
        if (this.countryGrid) {
            this.countryGrid.destroy();
            this.countryGrid = null;
        }
        if (this.currencyUnsubscribe) {
            this.currencyUnsubscribe();
            this.currencyUnsubscribe = null;
            console.log("Currencies listener unsubscribed.");
        }
        if (this.currencyGrid) {
            this.currencyGrid.destroy();
            this.currencyGrid = null;
        }
    }
};
