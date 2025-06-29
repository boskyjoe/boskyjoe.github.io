// js/admin_data.js

import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The AdminData module handles application-wide configuration data,
 * such as countries/states and currencies.
 */
export const AdminData = {
    db: null,
    auth: null,
    Utils: null,
    countryUnsubscribe: null, // Listener for countries
    currencyUnsubscribe: null, // Listener for currencies
    currentEditingCountryId: null, // For editing countries/states
    currentEditingCurrencyId: null, // For editing currencies
    countriesGrid: null, // Grid.js instance for countries
    currenciesGrid: null, // Grid.js instance for currencies

    /**
     * Initializes the AdminData module.
     * This method should only initialize core dependencies, not interact with the DOM yet.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;
        console.log("AdminData module initialized.");

        // Do NOT call renderAdminDataUI or attachEventListeners here.
        // They depend on the module's HTML being loaded into the DOM by Main.loadModule.
    },

    /**
     * Renders the main UI for the AdminData module.
     * This is called by Main.js when the 'adminData' module is activated.
     * @param {HTMLElement} moduleContentElement - The DOM element where the AdminData UI should be rendered.
     */
    renderAdminDataUI: function(moduleContentElement) { // Added moduleContentElement parameter
        // CRITICAL FIX: Use the passed moduleContentElement directly
        const adminDataModuleContent = moduleContentElement;

        if (!adminDataModuleContent) {
            console.error("AdminData module: Target content element was not provided or is null.");
            this.Utils.showMessage("Error: Admin Data module could not find its content area.", "error");
            return;
        }

        if (this.Utils.isAdmin()) {
            adminDataModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-6">Application Metadata Management</h3>
                    <p class="text-sm text-gray-600 mb-4">Manage global data like countries, states, and currencies.</p>

                    <!-- Countries & States Section -->
                    <div class="mb-8">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-xl font-semibold text-gray-700">Countries & States</h4>
                            <button id="add-country-btn"
                                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200">
                                <i class="fas fa-plus mr-2"></i> Add Country
                            </button>
                        </div>
                        <div id="country-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                    </div>

                    <!-- Currencies Section -->
                    <div>
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-xl font-semibold text-gray-700">Currencies</h4>
                            <button id="add-currency-btn"
                                class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200">
                                <i class="fas fa-plus mr-2"></i> Add Currency
                            </button>
                        </div>
                        <div id="currency-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                    </div>
                </div>

                <!-- Country/State Modal (Add/Edit Form) -->
                <div id="country-state-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="country-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Country</h4>
                        <form id="country-state-form">
                            <div class="mb-4">
                                <label for="country-name" class="block text-sm font-medium text-gray-700 mb-1">Country Name</label>
                                <input type="text" id="country-name" name="name" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div class="mb-4">
                                <label for="country-states" class="block text-sm font-medium text-gray-700 mb-1">States (comma-separated)</label>
                                <textarea id="country-states" name="states" rows="3"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
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

                <!-- Currency Modal (Add/Edit Form) -->
                <div id="currency-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                    <div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                        <h4 id="currency-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Currency</h4>
                        <form id="currency-form">
                            <div class="mb-4">
                                <label for="currency-code" class="block text-sm font-medium text-gray-700 mb-1">Currency Code (e.g., USD, EUR)</label>
                                <input type="text" id="currency-code" name="code" required maxlength="3"
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm uppercase">
                            </div>
                            <div class="mb-4">
                                <label for="currency-name" class="block text-sm font-medium text-gray-700 mb-1">Currency Name (e.g., US Dollar)</label>
                                <input type="text" id="currency-name" name="name" required
                                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
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
            `;
            // After rendering HTML, attach event listeners and setup the real-time listeners
            this.attachEventListeners();
            this.setupRealtimeListeners();
        } else {
            adminDataModuleContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                    <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                </div>
            `;
            console.log("Not an admin, skipping Admin Data UI.");
            // Ensure no Grid.js instances are active if user is not admin
            if (this.countriesGrid) { this.countriesGrid.destroy(); this.countriesGrid = null; }
            if (this.currenciesGrid) { this.currenciesGrid.destroy(); this.currenciesGrid = null; }
        }
    },

    /**
     * Sets up real-time listeners for 'app_data/global/countries' and 'app_data/global/currencies'.
     * Only runs if the current user is an Admin.
     */
    setupRealtimeListeners: function() {
        if (!this.Utils.isAdmin()) {
            console.log("Not an admin, skipping real-time listeners for Admin Data.");
            return;
        }

        // Countries Listener
        if (this.countryUnsubscribe) { this.countryUnsubscribe(); }
        this.countryUnsubscribe = onSnapshot(collection(this.db, "app_data/global/countries"), (snapshot) => {
            const countries = [];
            snapshot.forEach((doc) => {
                countries.push({ id: doc.id, ...doc.data() });
            });
            console.log("Countries data updated:", countries);
            this.renderCountriesGrid(countries);
        }, (error) => {
            this.Utils.handleError(error, "fetching countries data");
            this.renderCountriesGrid([]);
        });

        // Currencies Listener
        if (this.currencyUnsubscribe) { this.currencyUnsubscribe(); }
        this.currencyUnsubscribe = onSnapshot(collection(this.db, "app_data/global/currencies"), (snapshot) => {
            const currencies = [];
            snapshot.forEach((doc) => {
                currencies.push({ id: doc.id, ...doc.data() });
            });
            console.log("Currencies data updated:", currencies);
            this.renderCurrenciesGrid(currencies);
        }, (error) => {
            this.Utils.handleError(error, "fetching currencies data");
            this.renderCurrenciesGrid([]);
        });
    },

    /**
     * Renders or updates the Grid.js table for Countries.
     * @param {Array<object>} countries - An array of country objects.
     */
    renderCountriesGrid: function(countries) {
        const gridContainer = document.getElementById('country-grid-container');
        if (!gridContainer) {
            console.error("Country grid container not found.");
            return;
        }

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'name', name: 'Country Name', sort: true, width: 'auto' },
            { id: 'states', name: 'States', sort: false, width: 'auto', formatter: (cell) => cell ? cell.join(', ') : 'N/A' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const countryId = row.cells[0].data;
                    const countryName = row.cells[1].data;
                    const states = countries.find(c => c.id === countryId)?.states || [];
                    return gridjs.h('div', {
                        className: 'flex items-center justify-center space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-yellow-100 hover:text-yellow-600 transition-colors duration-200',
                            title: 'Edit Country',
                            onClick: () => this.openCountryModal('edit', countryId, countryName, states)
                        }, gridjs.h('i', { className: 'fas fa-edit text-lg' })),
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200',
                            title: 'Delete Country',
                            onClick: () => this.deleteCountry(countryId, countryName)
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = countries.map(c => [c.id, c.name, c.states]);

        if (this.countriesGrid) {
            this.countriesGrid.updateConfig({ data: mappedData }).forceRender();
        } else {
            this.countriesGrid = new gridjs.Grid({
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
     * Renders or updates the Grid.js table for Currencies.
     * @param {Array<object>} currencies - An array of currency objects.
     */
    renderCurrenciesGrid: function(currencies) {
        const gridContainer = document.getElementById('currency-grid-container');
        if (!gridContainer) {
            console.error("Currency grid container not found.");
            return;
        }

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'code', name: 'Code', sort: true, width: '100px' },
            { id: 'name', name: 'Name', sort: true, width: 'auto' },
            { id: 'symbol', name: 'Symbol', sort: false, width: '80px' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const currencyId = row.cells[0].data;
                    const currencyData = currencies.find(c => c.id === currencyId);
                    return gridjs.h('div', {
                        className: 'flex items-center justify-center space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-yellow-100 hover:text-yellow-600 transition-colors duration-200',
                            title: 'Edit Currency',
                            onClick: () => this.openCurrencyModal('edit', currencyId, currencyData.code, currencyData.name, currencyData.symbol)
                        }, gridjs.h('i', { className: 'fas fa-edit text-lg' })),
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200',
                            title: 'Delete Currency',
                            onClick: () => this.deleteCurrency(currencyId, currencyData.code)
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = currencies.map(c => [c.id, c.code, c.name, c.symbol]);

        if (this.currenciesGrid) {
            this.currenciesGrid.updateConfig({ data: mappedData }).forceRender();
        } else {
            this.currenciesGrid = new gridjs.Grid({
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
     * Attaches event listeners for UI interactions within the AdminData module.
     */
    attachEventListeners: function() {
        // Country/State listeners
        document.getElementById('add-country-btn')?.addEventListener('click', () => this.openCountryModal('add'));
        document.getElementById('country-state-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveCountry(); });
        document.getElementById('cancel-country-btn')?.addEventListener('click', () => this.closeCountryModal());
        document.getElementById('country-state-modal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('country-state-modal')) this.closeCountryModal(); });

        // Currency listeners
        document.getElementById('add-currency-btn')?.addEventListener('click', () => this.openCurrencyModal('add'));
        document.getElementById('currency-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.saveCurrency(); });
        document.getElementById('cancel-currency-btn')?.addEventListener('click', () => this.closeCurrencyModal());
        document.getElementById('currency-modal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('currency-modal')) this.closeCurrencyModal(); });
    },

    /**
     * Opens the country add/edit modal.
     */
    openCountryModal: function(mode, id = null, name = '', states = []) {
        const modal = document.getElementById('country-state-modal');
        const title = document.getElementById('country-modal-title');
        const form = document.getElementById('country-state-form');
        form.reset();
        this.currentEditingCountryId = null;

        if (mode === 'edit' && id) {
            title.textContent = 'Edit Country';
            this.currentEditingCountryId = id;
            document.getElementById('country-name').value = name;
            document.getElementById('country-states').value = states.join(', ');
        } else {
            title.textContent = 'Add New Country';
        }
        modal.classList.remove('hidden');
        setTimeout(() => { modal.querySelector('div').classList.remove('opacity-0', 'scale-95'); }, 10);
    },

    /**
     * Closes the country modal.
     */
    closeCountryModal: function() {
        const modal = document.getElementById('country-state-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => { modal.classList.add('hidden'); }, { once: true });
    },

    /**
     * Saves a new country or updates an existing one.
     */
    saveCountry: async function() {
        const name = document.getElementById('country-name').value.trim();
        const statesString = document.getElementById('country-states').value.trim();
        const states = statesString ? statesString.split(',').map(s => s.trim()).filter(s => s) : [];

        if (!name) {
            this.Utils.showMessage('Country name is required.', 'warning');
            return;
        }

        const countryData = { name: name, states: states };

        try {
            if (this.currentEditingCountryId) {
                const countryRef = doc(this.db, "app_data/global/countries", this.currentEditingCountryId);
                await updateDoc(countryRef, countryData);
                this.Utils.showMessage('Country updated successfully!', 'success');
            } else {
                await addDoc(collection(this.db, "app_data/global/countries"), countryData);
                this.Utils.showMessage('Country added successfully!', 'success');
            }
            this.closeCountryModal();
        } catch (error) {
            this.Utils.handleError(error, "saving country");
        }
    },

    /**
     * Deletes a country from Firestore.
     */
    deleteCountry: async function(id, name) {
        this.Utils.showMessage(`Are you sure you want to delete country "${name}"?`, 'warning', 0);
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
                    await deleteDoc(doc(this.db, "app_data/global/countries", id));
                    this.Utils.showMessage('Country deleted successfully!', 'success');
                    messageModalContainer.classList.add('hidden');
                } catch (error) {
                    this.Utils.handleError(error, "deleting country");
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
     * Opens the currency add/edit modal.
     */
    openCurrencyModal: function(mode, id = null, code = '', name = '', symbol = '') {
        const modal = document.getElementById('currency-modal');
        const title = document.getElementById('currency-modal-title');
        const form = document.getElementById('currency-form');
        form.reset();
        this.currentEditingCurrencyId = null;

        if (mode === 'edit' && id) {
            title.textContent = 'Edit Currency';
            this.currentEditingCurrencyId = id;
            document.getElementById('currency-code').value = code;
            document.getElementById('currency-name').value = name;
            document.getElementById('currency-symbol').value = symbol;
        } else {
            title.textContent = 'Add New Currency';
        }
        modal.classList.remove('hidden');
        setTimeout(() => { modal.querySelector('div').classList.remove('opacity-0', 'scale-95'); }, 10);
    },

    /**
     * Closes the currency modal.
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
        const code = document.getElementById('currency-code').value.trim().toUpperCase();
        const name = document.getElementById('currency-name').value.trim();
        const symbol = document.getElementById('currency-symbol').value.trim();

        if (!code || !name) {
            this.Utils.showMessage('Currency Code and Name are required.', 'warning');
            return;
        }

        const currencyData = { code: code, name: name, symbol: symbol };

        try {
            if (this.currentEditingCurrencyId) {
                const currencyRef = doc(this.db, "app_data/global/currencies", this.currentEditingCurrencyId);
                await updateDoc(currencyRef, currencyData);
                this.Utils.showMessage('Currency updated successfully!', 'success');
            } else {
                await addDoc(collection(this.db, "app_data/global/currencies"), currencyData);
                this.Utils.showMessage('Currency added successfully!', 'success');
            }
            this.closeCurrencyModal();
        } catch (error) {
            this.Utils.handleError(error, "saving currency");
        }
    },

    /**
     * Deletes a currency from Firestore.
     */
    deleteCurrency: async function(id, code) {
        this.Utils.showMessage(`Are you sure you want to delete currency "${code}"?`, 'warning', 0);
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
                    await deleteDoc(doc(this.db, "app_data/global/currencies", id));
                    this.Utils.showMessage('Currency deleted successfully!', 'success');
                    messageModalContainer.classList.add('hidden');
                } catch (error) {
                    this.Utils.handleError(error, "deleting currency");
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
     * Detaches all real-time listeners and destroys Grid.js instances.
     */
    destroy: function() {
        if (this.countryUnsubscribe) {
            this.countryUnsubscribe();
            this.countryUnsubscribe = null;
            console.log("AdminData Countries listener unsubscribed.");
        }
        if (this.currencyUnsubscribe) {
            this.currencyUnsubscribe();
            this.currencyUnsubscribe = null;
            console.log("AdminData Currencies listener unsubscribed.");
        }
        if (this.countriesGrid) {
            this.countriesGrid.destroy();
            this.countriesGrid = null;
        }
        if (this.currenciesGrid) {
            this.currenciesGrid.destroy();
            this.currenciesGrid = null;
        }
        console.log("AdminData module destroyed.");
    }
};
