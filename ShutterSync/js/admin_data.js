// js/admin_data.js

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Utils } from './utils.js';

/**
 * The AdminDataModule object handles all functionality related to app metadata management.
 * This module is exclusively for Admin users.
 */
export const AdminData = {
    db: null,
    auth: null,
    Utils: null,
    unsubscribeCountries: null, // Listener for countries
    unsubscribeCurrencies: null, // Listener for currencies
    currentCountryStateId: null, // For editing countries
    currentCurrencyId: null, // For editing currencies
    countriesGrid: null, // Grid.js instance for countries
    currenciesGrid: null, // Grid.js instance for currencies

    /**
     * Initializes the AdminData module.
     */
    init: function(firestoreDb, firebaseAuth, utils) {
        this.db = firestoreDb;
        this.auth = firebaseAuth;
        this.Utils = utils;

        console.log("AdminData module initialized.");
        this.renderAdminDataUI();
        this.attachEventListeners();
        this.setupRealtimeListeners(); // Setup listeners for both collections
    },

    /**
     * Renders the main UI for the AdminData module.
     * Only displays content if the current user is an Admin.
     */
    renderAdminDataUI: function() {
        const adminDataModuleContent = document.getElementById('admin-data-module-content');
        if (adminDataModuleContent) {
            if (this.Utils.isAdmin()) {
                adminDataModuleContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                        <h3 class="text-2xl font-semibold text-gray-800 mb-4">App Metadata Management</h3>
                        <p class="text-sm text-gray-600 mb-6">Manage global application data such as countries, states/provinces, and currencies.</p>

                        <!-- Countries & States Section -->
                        <div class="mb-8">
                            <div class="flex justify-between items-center mb-4">
                                <h4 class="text-xl font-semibold text-gray-700">Countries & States/Provinces</h4>
                                <button id="add-country-state-btn"
                                    class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200">
                                    <i class="fas fa-plus mr-2"></i> Add Country/State
                                </button>
                            </div>
                            <div id="countries-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
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
                            <div id="currencies-grid-container" class="border border-gray-200 rounded-lg overflow-hidden"></div>
                        </div>
                    </div>

                    <!-- Country/State Modal -->
                    <div id="country-state-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                        <div class="bg-white p-8 rounded-lg shadow-2xl max-w-lg w-full transform transition-all duration-300 scale-95 opacity-0">
                            <h4 id="country-state-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Country/State</h4>
                            <form id="country-state-form">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label for="country-name" class="block text-sm font-medium text-gray-700 mb-1">Country Name</label>
                                        <input type="text" id="country-name" name="countryName" required
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    </div>
                                    <div>
                                        <label for="country-code" class="block text-sm font-medium text-gray-700 mb-1">Country Code (e.g., US)</label>
                                        <input type="text" id="country-code" name="countryCode" required maxlength="2"
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    </div>
                                    <div class="md:col-span-2">
                                        <label for="states-provinces" class="block text-sm font-medium text-gray-700 mb-1">States/Provinces (comma-separated)</label>
                                        <textarea id="states-provinces" name="statesProvinces" rows="3"
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                                    </div>
                                </div>
                                <div class="flex justify-end space-x-3 mt-6">
                                    <button type="button" id="cancel-country-state-btn"
                                        class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                        Cancel
                                    </button>
                                    <button type="submit" id="save-country-state-btn"
                                        class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Currency Modal -->
                    <div id="currency-modal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[900] hidden">
                        <div class="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-95 opacity-0">
                            <h4 id="currency-modal-title" class="text-2xl font-bold text-gray-800 mb-6">Add New Currency</h4>
                            <form id="currency-form">
                                <div class="grid grid-cols-1 gap-4 mb-4">
                                    <div>
                                        <label for="currency-name" class="block text-sm font-medium text-gray-700 mb-1">Currency Name</label>
                                        <input type="text" id="currency-name" name="currencyName" required
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    </div>
                                    <div>
                                        <label for="currency-code" class="block text-sm font-medium text-gray-700 mb-1">Currency Code (e.g., USD)</label>
                                        <input type="text" id="currency-code" name="currencyCode" required maxlength="3"
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    </div>
                                    <div>
                                        <label for="currency-symbol" class="block text-sm font-medium text-gray-700 mb-1">Symbol (e.g., $)</label>
                                        <input type="text" id="currency-symbol" name="symbol"
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    </div>
                                    <div>
                                        <label for="currency-symbol-native" class="block text-sm font-medium text-gray-700 mb-1">Native Symbol (e.g., $)</label>
                                        <input type="text" id="currency-symbol-native" name="symbol_native"
                                            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                    </div>
                                </div>
                                <div class="flex justify-end space-x-3 mt-6">
                                    <button type="button" id="cancel-currency-btn"
                                        class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors duration-200">
                                        Cancel
                                    </button>
                                    <button type="submit" id="save-currency-btn"
                                        class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors duration-200">
                                        Save
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                `;
            } else {
                adminDataModuleContent.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-md text-center">
                        <h3 class="text-2xl font-semibold text-gray-800 mb-4">Access Denied</h3>
                        <p class="text-gray-600">You do not have administrative privileges to view this section.</p>
                    </div>
                `;
            }
        }
    },

    /**
     * Sets up real-time listeners for both countries_states and currencies_data collections.
     * Only runs if the current user is an Admin.
     */
    setupRealtimeListeners: function() {
        this.destroyListeners(); // Ensure old listeners are detached

        if (this.Utils.isAdmin()) {
            // Countries Listener
            const countriesQ = query(collection(this.db, "app_metadata/countries_states"));
            this.unsubscribeCountries = onSnapshot(countriesQ, (snapshot) => {
                const countries = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    countries.push({ id: doc.id, ...data, statesProvinces: data.statesProvinces ? data.statesProvinces.join(', ') : '' });
                });
                console.log("Countries data updated:", countries);
                this.renderCountriesGrid(countries);
            }, (error) => {
                this.Utils.handleError(error, "fetching countries data");
            });

            // Currencies Listener
            const currenciesQ = query(collection(this.db, "app_metadata/app_settings/currencies_data"));
            this.unsubscribeCurrencies = onSnapshot(currenciesQ, (snapshot) => {
                const currencies = [];
                snapshot.forEach((doc) => {
                    currencies.push({ id: doc.id, ...doc.data() });
                });
                console.log("Currencies data updated:", currencies);
                this.renderCurrenciesGrid(currencies);
            }, (error) => {
                this.Utils.handleError(error, "fetching currencies data");
            });
        } else {
            console.log("Not an admin, skipping admin data listeners setup.");
            this.renderCountriesGrid([]);
            this.renderCurrenciesGrid([]);
        }
    },

    /**
     * Renders or updates the Grid.js table for Countries & States.
     * @param {Array<object>} countries - An array of country objects.
     */
    renderCountriesGrid: function(countries) {
        const gridContainer = document.getElementById('countries-grid-container');
        if (!gridContainer) return;

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'countryName', name: 'Country Name', sort: true, width: 'auto' },
            { id: 'countryCode', name: 'Code', sort: true, width: '80px' },
            { id: 'statesProvinces', name: 'States/Provinces', width: 'auto' },
            {
                name: 'Actions',
                width: '100px',
                formatter: (cell, row) => {
                    const countryId = row.cells[0].data;
                    const countryData = countries.find(c => c.id === countryId); // Get full data for edit

                    return gridjs.h('div', {
                        className: 'flex items-center justify-center space-x-2'
                    }, [
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-yellow-100 hover:text-yellow-600 transition-colors duration-200',
                            title: 'Edit Country',
                            onClick: () => this.openCountryStateModal('edit', countryData)
                        }, gridjs.h('i', { className: 'fas fa-edit text-lg' })),
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200',
                            title: 'Delete Country',
                            onClick: () => this.deleteCountryState(countryId, countryData.countryName)
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = countries.map(c => [
            c.id,
            c.countryName || '',
            c.countryCode || '',
            c.statesProvinces || ''
        ]);

        if (this.countriesGrid) {
            this.countriesGrid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
            this.countriesGrid = new gridjs.Grid({
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
     * Renders or updates the Grid.js table for Currencies.
     * @param {Array<object>} currencies - An array of currency objects.
     */
    renderCurrenciesGrid: function(currencies) {
        const gridContainer = document.getElementById('currencies-grid-container');
        if (!gridContainer) return;

        const columns = [
            { id: 'id', name: 'ID', hidden: true },
            { id: 'currencyName', name: 'Name', sort: true, width: 'auto' },
            { id: 'currencyCode', name: 'Code', sort: true, width: '80px' },
            { id: 'symbol', name: 'Symbol', width: '80px' },
            { id: 'symbol_native', name: 'Native Symbol', width: '100px' },
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
                            onClick: () => this.openCurrencyModal('edit', currencyData)
                        }, gridjs.h('i', { className: 'fas fa-edit text-lg' })),
                        gridjs.h('button', {
                            className: 'p-1 rounded-md text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors duration-200',
                            title: 'Delete Currency',
                            onClick: () => this.deleteCurrency(currencyId, currencyData.currencyCode)
                        }, gridjs.h('i', { className: 'fas fa-trash-alt text-lg' }))
                    ]);
                }
            }
        ];

        const mappedData = currencies.map(c => [
            c.id,
            c.currencyName || '',
            c.currencyCode || '',
            c.symbol || '',
            c.symbol_native || ''
        ]);

        if (this.currenciesGrid) {
            this.currenciesGrid.updateConfig({
                data: mappedData
            }).forceRender();
        } else {
            this.currenciesGrid = new gridjs.Grid({
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
     * Attaches event listeners for UI interactions.
     */
    attachEventListeners: function() {
        // Country/State buttons
        const addCountryStateBtn = document.getElementById('add-country-state-btn');
        if (addCountryStateBtn) addCountryStateBtn.addEventListener('click', () => this.openCountryStateModal('add'));

        const countryStateForm = document.getElementById('country-state-form');
        if (countryStateForm) countryStateForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveCountryState(); });

        const cancelCountryStateBtn = document.getElementById('cancel-country-state-btn');
        if (cancelCountryStateBtn) cancelCountryStateBtn.addEventListener('click', () => this.closeCountryStateModal());

        const countryStateModal = document.getElementById('country-state-modal');
        if (countryStateModal) countryStateModal.addEventListener('click', (e) => { if (e.target === countryStateModal) this.closeCountryStateModal(); });

        // Currency buttons
        const addCurrencyBtn = document.getElementById('add-currency-btn');
        if (addCurrencyBtn) addCurrencyBtn.addEventListener('click', () => this.openCurrencyModal('add'));

        const currencyForm = document.getElementById('currency-form');
        if (currencyForm) currencyForm.addEventListener('submit', (e) => { e.preventDefault(); this.saveCurrency(); });

        const cancelCurrencyBtn = document.getElementById('cancel-currency-btn');
        if (cancelCurrencyBtn) cancelCurrencyBtn.addEventListener('click', () => this.closeCurrencyModal());

        const currencyModal = document.getElementById('currency-modal');
        if (currencyModal) currencyModal.addEventListener('click', (e) => { if (e.target === currencyModal) this.closeCurrencyModal(); });
    },

    /**
     * Opens the country/state add/edit modal.
     */
    openCountryStateModal: function(mode, data = null) {
        const modal = document.getElementById('country-state-modal');
        const title = document.getElementById('country-state-modal-title');
        const form = document.getElementById('country-state-form');

        form.reset();
        this.currentCountryStateId = null;

        if (mode === 'edit' && data) {
            title.textContent = 'Edit Country/State';
            this.currentCountryStateId = data.id;
            document.getElementById('country-name').value = data.countryName || '';
            document.getElementById('country-code').value = data.countryCode || '';
            document.getElementById('states-provinces').value = data.statesProvinces || ''; // Already joined in render
        } else {
            title.textContent = 'Add New Country/State';
        }

        modal.classList.remove('hidden');
        setTimeout(() => { modal.querySelector('div').classList.remove('opacity-0', 'scale-95'); }, 10);
    },

    /**
     * Closes the country/state modal.
     */
    closeCountryStateModal: function() {
        const modal = document.getElementById('country-state-modal');
        modal.querySelector('div').classList.add('opacity-0', 'scale-95');
        modal.addEventListener('transitionend', () => { modal.classList.add('hidden'); }, { once: true });
    },

    /**
     * Saves a country/state document to Firestore.
     */
    saveCountryState: async function() {
        const countryName = document.getElementById('country-name').value.trim();
        const countryCode = document.getElementById('country-code').value.trim().toUpperCase();
        const statesProvincesRaw = document.getElementById('states-provinces').value.trim();
        const statesProvinces = statesProvincesRaw ? statesProvincesRaw.split(',').map(s => s.trim()).filter(s => s) : [];

        if (!countryName || !countryCode) {
            this.Utils.showMessage('Country Name and Code are required.', 'warning');
            return;
        }

        try {
            const countryData = { countryName, countryCode, statesProvinces };
            if (this.currentCountryStateId) {
                await updateDoc(doc(this.db, "app_metadata/countries_states", this.currentCountryStateId), countryData);
                this.Utils.showMessage('Country/State updated successfully!', 'success');
            } else {
                await addDoc(collection(this.db, "app_metadata/countries_states"), countryData);
                this.Utils.showMessage('Country/State added successfully!', 'success');
            }
            this.closeCountryStateModal();
        } catch (error) {
            this.Utils.handleError(error, "saving country/state data");
        }
    },

    /**
     * Deletes a country/state document from Firestore.
     */
    deleteCountryState: async function(id, name) {
        this.Utils.showMessage(`Are you sure you want to delete "${name}"?`, 'warning', 0);

        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('.p-6');
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete';
            confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2';
            confirmBtn.onclick = async () => {
                try {
                    await deleteDoc(doc(this.db, "app_metadata/countries_states", id));
                    this.Utils.showMessage('Country/State deleted successfully!', 'success');
                    messageModalContainer.remove();
                } catch (error) {
                    this.Utils.handleError(error, "deleting country/state");
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
     * Opens the currency add/edit modal.
     */
    openCurrencyModal: function(mode, data = null) {
        const modal = document.getElementById('currency-modal');
        const title = document.getElementById('currency-modal-title');
        const form = document.getElementById('currency-form');

        form.reset();
        this.currentCurrencyId = null;

        if (mode === 'edit' && data) {
            title.textContent = 'Edit Currency';
            this.currentCurrencyId = data.id;
            document.getElementById('currency-name').value = data.currencyName || '';
            document.getElementById('currency-code').value = data.currencyCode || '';
            document.getElementById('currency-symbol').value = data.symbol || '';
            document.getElementById('currency-symbol-native').value = data.symbol_native || '';
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
     * Saves a currency document to Firestore.
     */
    saveCurrency: async function() {
        const currencyName = document.getElementById('currency-name').value.trim();
        const currencyCode = document.getElementById('currency-code').value.trim().toUpperCase();
        const symbol = document.getElementById('currency-symbol').value.trim();
        const symbol_native = document.getElementById('currency-symbol-native').value.trim();

        if (!currencyName || !currencyCode) {
            this.Utils.showMessage('Currency Name and Code are required.', 'warning');
            return;
        }

        try {
            const currencyData = { currencyName, currencyCode, symbol, symbol_native };
            if (this.currentCurrencyId) {
                await updateDoc(doc(this.db, "app_metadata/app_settings/currencies_data", this.currentCurrencyId), currencyData);
                this.Utils.showMessage('Currency updated successfully!', 'success');
            } else {
                await addDoc(collection(this.db, "app_metadata/app_settings/currencies_data"), currencyData);
                this.Utils.showMessage('Currency added successfully!', 'success');
            }
            this.closeCurrencyModal();
        } catch (error) {
            this.Utils.handleError(error, "saving currency data");
        }
    },

    /**
     * Deletes a currency document from Firestore.
     */
    deleteCurrency: async function(id, code) {
        this.Utils.showMessage(`Are you sure you want to delete currency "${code}"?`, 'warning', 0);

        const messageModalContainer = document.getElementById('message-modal-container');
        if (messageModalContainer) {
            const messageBox = messageModalContainer.querySelector('.p-6');
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = 'Confirm Delete';
            confirmBtn.className = 'bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg mt-4 mr-2';
            confirmBtn.onclick = async () => {
                try {
                    await deleteDoc(doc(this.db, "app_metadata/app_settings/currencies_data", id));
                    this.Utils.showMessage('Currency deleted successfully!', 'success');
                    messageModalContainer.remove();
                } catch (error) {
                    this.Utils.handleError(error, "deleting currency");
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
     * Detaches all real-time listeners when the module is no longer active.
     */
    destroyListeners: function() {
        if (this.unsubscribeCountries) {
            this.unsubscribeCountries();
            this.unsubscribeCountries = null;
            console.log("AdminData Countries listener unsubscribed.");
        }
        if (this.unsubscribeCurrencies) {
            this.unsubscribeCurrencies();
            this.unsubscribeCurrencies = null;
            console.log("AdminData Currencies listener unsubscribed.");
        }
    },

    /**
     * Destroys Grid.js instances and detaches listeners.
     */
    destroy: function() {
        this.destroyListeners();
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
