import { db, auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe } from './main.js';
import { showModal, APP_SETTINGS_DOC_ID } from './utils.js';

import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// DOM elements for admin_data.js (Country Mapping)
let adminCountryMappingSection;
let adminCountriesInput;
let adminCountryStateMapInput;
let uploadAdminDataButton;
let fullLoadRadio;
let incrementalLoadRadio;
let adminMessageDiv;

// DOM elements for admin_data.js (Currency Management)
let currencyManagementSection;
let currencyForm;
let currencyFormTitle;
let currencyCodeDisplayGroup;
let currencyCodeDisplay;
let adminCurrenciesInput;
let submitCurrencyButton;
let adminCurrencyMessageDiv;
let currencyList;

// Global data for Country/State (fetched from Firestore)
export let appCountries = [];
export let appCountryStateMap = {};

// Global data for Currencies (fetched from Firestore)
export let allCurrencies = []; // Export allCurrencies

// Initialize Admin Data module elements and event listeners
export async function initAdminDataModule(type) {
    console.log(`admin_data.js: initAdminDataModule called for type: ${type}.`);
    console.log("admin_data.js: initAdminDataModule current state - db:", db, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId, "isAdmin:", isAdmin);

    // Initialize DOM elements if they haven't been already
    if (!adminCountryMappingSection) {
        adminCountryMappingSection = document.getElementById('admin-country-mapping-section');
        adminCountriesInput = document.getElementById('adminCountriesInput');
        adminCountryStateMapInput = document.getElementById('adminCountryStateMapInput');
        uploadAdminDataButton = document.getElementById('uploadAdminDataButton');
        fullLoadRadio = document.getElementById('fullLoad');
        incrementalLoadRadio = document.getElementById('incrementalLoad');
        adminMessageDiv = document.getElementById('adminMessage');

        // Add event listener for country mapping form
        if (document.getElementById('countryMappingForm')) {
            document.getElementById('countryMappingForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveCountryData();
            });
        }
    }

    // Initialize Currency Management DOM elements if they haven't been already
    if (!currencyManagementSection) {
        currencyManagementSection = document.getElementById('currency-management-section');
        currencyForm = document.getElementById('currencyForm');
        currencyFormTitle = document.getElementById('currencyFormTitle');
        currencyCodeDisplayGroup = document.getElementById('currencyCodeDisplayGroup');
        currencyCodeDisplay = document.getElementById('currencyCodeDisplay');
        adminCurrenciesInput = document.getElementById('adminCurrenciesInput');
        submitCurrencyButton = document.getElementById('submitCurrencyButton');
        adminCurrencyMessageDiv = document.getElementById('adminCurrencyMessageDiv');
        currencyList = document.getElementById('currencyList');

        // Add event listener for currency form
        if (currencyForm) {
            currencyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const editingId = currencyForm.dataset.editingId;
                await saveCurrency(null, editingId || null); // Pass null for currencyData as it's read from textarea
            });
        }
        document.getElementById('resetCurrencyFormButton')?.addEventListener('click', resetCurrencyForm);
    }

    // Load data based on the module type requested
    if (type === 'country_mapping') {
        loadAdminCountryData();
        if (uploadAdminDataButton) {
            if (isAuthReady && isAdmin) {
                uploadAdminDataButton.removeAttribute('disabled');
            } else {
                uploadAdminDataButton.setAttribute('disabled', 'disabled');
            }
        }
    } else if (type === 'currency_management') {
        listenForCurrencies();
        resetCurrencyForm();
        if (submitCurrencyButton) {
            if (isAuthReady && isAdmin) {
                submitCurrencyButton.removeAttribute('disabled');
            } else {
                submitCurrencyButton.setAttribute('disabled', 'disabled');
            }
        }
    }
}


/* --- COUNTRY & STATE MAPPING FUNCTIONS --- */

// Function to fetch country and state data from Firestore for the CRM forms
export async function fetchCountryData() {
    console.log("admin_data.js: fetchCountryData called.");
    try {
        const docRef = doc(db, "app_metadata", "countries_states");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            appCountries = data.countries || [];
            appCountryStateMap = data.countryStateMap || {};
            console.log("admin_data.js: Country and State data loaded from Firestore.");
        } else {
            console.warn("admin_data.js: No 'countries_states' document found in 'app_metadata' collection.");
            appCountries = [];
            appCountryStateMap = {};
        }
    } catch (error) {
        console.error("admin_data.js: Error fetching country data from Firestore:", error);
        appCountries = [];
        appCountryStateMap = {};
    }
}

// Function to load existing data into the admin textareas
async function loadAdminCountryData() {
    console.log("admin_data.js: loadAdminCountryData called.");
    if (!isAdmin) {
        if (adminMessageDiv) {
            adminMessageDiv.textContent = "You do not have administrative privileges to view country mapping data.";
            adminMessageDiv.className = 'message error';
            adminMessageDiv.classList.remove('hidden');
        }
        if (adminCountriesInput) adminCountriesInput.value = '';
        if (adminCountryStateMapInput) adminCountryStateMapInput.value = '';
        return;
    }

    try {
        await fetchCountryData(); // Ensure global appCountries and appCountryStateMap are updated

        const countriesString = appCountries.map(c => `${c.name},${c.code}`).join('\n');
        if (adminCountriesInput) adminCountriesInput.value = countriesString;

        const countryStateMapString = Object.entries(appCountryStateMap)
            .map(([code, states]) => `${code}:${states.join(',')}`)
            .join('\n');
        if (adminCountryStateMapInput) adminCountryStateMapInput.value = countryStateMapString;

        if (adminMessageDiv) adminMessageDiv.classList.add('hidden');
        console.log("admin_data.js: Admin country data loaded into textareas.");
    } catch (error) {
        console.error("admin_data.js: Error in loadAdminCountryData:", error);
        if (adminMessageDiv) {
            adminMessageDiv.textContent = `Error loading admin country data: ${error.message}`;
            adminMessageDiv.className = 'message error';
            adminMessageDiv.classList.remove('hidden');
        }
    }
}

async function saveCountryData() {
    console.log("admin_data.js: saveCountryData called.");
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can upload country mapping data.", () => {});
        return;
    }

    if (adminMessageDiv) adminMessageDiv.classList.add('hidden');
    if (uploadAdminDataButton) {
        uploadAdminDataButton.disabled = true;
        uploadAdminDataButton.textContent = 'Uploading...';
    }

    const countriesString = adminCountriesInput.value;
    const countryStateMapString = adminCountryStateMapInput.value;
    const isFullLoad = fullLoadRadio.checked;

    function parseCountries(countriesString) {
        const uniqueCodes = new Set();
        const parsedCountries = [];
        const duplicatesFound = [];

        if (!countriesString.trim()) return [];

        countriesString.split('\n').forEach(line => {
            const parts = line.split(',');
            if (parts.length === 2) {
                const name = parts[0].trim();
                const code = parts[1].trim();
                if (name !== '' && code !== '') {
                    if (uniqueCodes.has(code)) {
                        duplicatesFound.push(code);
                    } else {
                        uniqueCodes.add(code);
                        parsedCountries.push({ name, code });
                    }
                }
            }
        });

        if (duplicatesFound.length > 0) {
            const msg = `Warning: Duplicate country codes found and ignored: ${duplicatesFound.join(', ')}. Only the first occurrence was used.`;
            if (adminMessageDiv) {
                adminMessageDiv.textContent = msg;
                adminMessageDiv.className = 'message error';
                adminMessageDiv.classList.remove('hidden');
            }
            console.warn(msg);
        }
        return parsedCountries;
    }

    function parseCountryStateMap(mapString) {
        const map = {};
        if (!mapString.trim()) return map;
        mapString.split('\n').forEach(line => {
            const parts = line.split(':');
            if (parts.length === 2) {
                const countryCode = parts[0].trim();
                const states = parts[1].split(',').map(s => s.trim()).filter(s => s !== '');
                if (countryCode !== '') {
                    map[countryCode] = states;
                }
            }
        });
        return map;
    }

    const dataToUpload = {};
    let hasValidDataForUpload = false;

    const parsedCountries = parseCountries(countriesString);
    if (parsedCountries.length > 0) {
        dataToUpload.countries = parsedCountries;
        hasValidDataForUpload = true;
    }

    const parsedCountryStateMap = parseCountryStateMap(countryStateMapString);
    if (Object.keys(parsedCountryStateMap).length > 0) {
        dataToUpload.countryStateMap = parsedCountryStateMap;
        hasValidDataForUpload = true;
    }

    if (!hasValidDataForUpload && isFullLoad) {
        dataToUpload.countries = [];
        dataToUpload.countryStateMap = {};
        hasValidDataForUpload = true;
    } else if (!hasValidDataForUpload && !isFullLoad) {
        if (adminMessageDiv) {
            adminMessageDiv.textContent = 'No valid data provided for update.';
            adminMessageDiv.className = 'message error';
            adminMessageDiv.classList.remove('hidden');
        }
        if (uploadAdminDataButton) {
            uploadAdminDataButton.disabled = false;
            uploadAdminDataButton.textContent = 'Upload Data to Firestore';
        }
        return;
    }

    try {
        const docRef = doc(db, "app_metadata", "countries_states");
        await setDoc(docRef, dataToUpload, { merge: true });

        if (adminMessageDiv) {
            adminMessageDiv.textContent = `Data uploaded successfully (${isFullLoad ? 'Full Load (Merge)' : 'Incremental Load'})!`;
            adminMessageDiv.className = 'message success';
            adminMessageDiv.classList.remove('hidden');
        }
        console.log("admin_data.js: Admin data upload successful:", dataToUpload);

        await fetchCountryData(); // Re-fetch data to update global state
    } catch (error) {
        console.error("admin_data.js: Error uploading admin data:", error);
        if (adminMessageDiv) {
            adminMessageDiv.textContent = `Error uploading data: ${error.message}`;
            adminMessageDiv.className = 'message error';
            adminMessageDiv.classList.remove('hidden');
        }
    } finally {
        if (uploadAdminDataButton) {
            uploadAdminDataButton.disabled = false;
            uploadAdminDataButton.textContent = 'Upload Data to Firestore';
        }
    }
}

/* --- CURRENCY MANAGEMENT FUNCTIONS --- */

// Function to fetch currency data from Firestore
export async function fetchCurrencies() { // Export this function
    console.log("admin_data.js: fetchCurrencies called.");
    try {
        const collectionRef = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");
        const querySnapshot = await getDocs(collectionRef);
        allCurrencies = []; // Clear existing data
        querySnapshot.forEach((docSnap) => {
            allCurrencies.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log("admin_data.js: Currency data loaded from Firestore. Total:", allCurrencies.length);
    } catch (error) {
        console.error("admin_data.js: Error fetching currency data from Firestore:", error);
        allCurrencies = []; // Ensure it's empty on error
    }
}

// Helper function to get currency symbol by code
export function getCurrencySymbol(code) { // Export this function
    const currency = allCurrencies.find(c => c.id === code);
    return currency ? currency.symbol : code;
}

// Helper function to get currency name by code
export function getCurrencyName(code) { // Export this function
    const currency = allCurrencies.find(c => c.id === code);
    return currency ? currency.currencyName : code;
}

async function saveCurrency(currencyData, existingCurrencyCode = null) {
    console.log("admin_data.js: saveCurrency called.");
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage currencies.", () => {});
        return;
    }

    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden');
    if (submitCurrencyButton) {
        submitCurrencyButton.disabled = true;
        submitCurrencyButton.textContent = 'Uploading...';
    }

    const inputCsv = adminCurrenciesInput.value.trim();
    const currencyLines = inputCsv.split('\n').filter(line => line.trim() !== '');

    if (currencyLines.length === 0) {
        if (adminCurrencyMessageDiv) {
            adminCurrencyMessageDiv.textContent = "Please enter currency data in the specified CSV format.";
            adminCurrencyMessageDiv.className = 'message error';
            adminCurrencyMessageDiv.classList.remove('hidden');
        }
        if (submitCurrencyButton) {
            submitCurrencyButton.disabled = false;
            submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
        }
        return;
    }

    const currenciesCollectionRef = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");

    try {
        let updatesPerformed = 0;
        let errorsOccurred = 0;
        let totalProcessed = 0;

        for (const line of currencyLines) {
            totalProcessed++;
            const parts = line.split(',');

            const code = parts[0] ? parts[0].trim() : '';
            const currencyName = parts[1] ? parts[1].trim() : '';
            const symbol = parts[2] ? parts[2].trim() : '';
            const symbol_native = parts[3] ? parts[3].trim() : '';

            if (code === '' || currencyName === '' || symbol === '' || symbol_native === '') {
                console.error(`admin_data.js: Skipping invalid line (missing data for essential fields): '${line}'`);
                errorsOccurred++;
                continue;
            }

            if (existingCurrencyCode && code !== existingCurrencyCode) {
                showModal("Validation Error", `When editing, the currency code in the input CSV (${code}) must match the currency being edited (${existingCurrencyCode}). Please provide only one line for the edited currency.`, () => {});
                if (submitCurrencyButton) {
                    submitCurrencyButton.disabled = false;
                    submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
                }
                return;
            }

            const currencyDataToSave = {
                currencyCode: code,
                currencyName: currencyName,
                symbol: symbol,
                symbol_native: symbol_native
            };

            const currencyDocRef = doc(currenciesCollectionRef, code);
            await setDoc(currencyDocRef, currencyDataToSave, { merge: true });
            updatesPerformed++;
        }

        let message = `Upload complete. Total lines processed: ${totalProcessed}. Updated/Added currencies: ${updatesPerformed}. Errors/Skipped lines: ${errorsOccurred}.`;
        if (errorsOccurred > 0) {
            if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.className = 'message error';
            message += " Please check console for details on skipped lines.";
        } else {
            if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.className = 'message success';
        }
        if (adminCurrencyMessageDiv) {
            adminCurrencyMessageDiv.textContent = message;
            adminCurrencyMessageDiv.classList.remove('hidden');
        }
        console.log("admin_data.js: Admin currency data upload process finished.");

        await fetchCurrencies(); // Re-fetch all currencies to update the global array
        // We do not populate opportunityCurrencySelect here, as it's handled by price_book.js
        resetCurrencyForm();
    } catch (error) {
        console.error("admin_data.js: Error uploading currency data (caught in try-catch):", error);
        if (adminCurrencyMessageDiv) {
            adminCurrencyMessageDiv.textContent = `Error uploading currency data: ${error.message}`;
            adminCurrencyMessageDiv.className = 'message error';
            adminCurrencyMessageDiv.classList.remove('hidden');
        }
    } finally {
        if (submitCurrencyButton) {
            submitCurrencyButton.disabled = false;
            submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
        }
    }
}


export async function deleteCurrency(currencyCode) { // Export this function
    console.log("admin_data.js: deleteCurrency called for code:", currencyCode);
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage currencies.", () => {});
        return;
    }

    showModal(
        "Confirm Deletion",
        `Are you sure you want to delete the currency '${currencyCode}'? This action cannot be undone.`,
        async () => {
            try {
                const currencyDocRef = doc(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data", currencyCode);
                await deleteDoc(currencyDocRef);
                console.log("admin_data.js: Currency deleted:", currencyCode);
                showModal("Success", `Currency '${currencyCode}' deleted successfully!`, () => {});
                await fetchCurrencies(); // Re-fetch to update allCurrencies array
                // We do not populate opportunityCurrencySelect here, as it's handled by price_book.js
            } catch (error) {
                console.error("admin_data.js: Error deleting currency:", error);
                showModal("Error", `Failed to delete currency: ${error.message}`, () => {});
            }
        }
    );
}


export function listenForCurrencies() { // Export this function
    console.log("admin_data.js: listenForCurrencies called.");
    if (unsubscribeCurrencies) {
        unsubscribeCurrencies(); // Unsubscribe from previous listener
    }

    if (!isAuthReady || !currentUserId || !isAdmin) {
        if (currencyList) currencyList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Access Denied: Only administrators can view currencies.</p>';
        return;
    }

    const q = collection(db, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data");

    unsubscribeCurrencies = onSnapshot(q, (snapshot) => {
        if (currencyList) currencyList.innerHTML = '';
        if (snapshot.empty) {
            if (currencyList) currencyList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No currencies found. Add them above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const currency = { id: doc.id, ...doc.data() };
            displayCurrency(currency);
        });
        console.log("admin_data.js: Currencies data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("admin_data.js: Error listening to currencies:", error);
        if (currencyList) currencyList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading currencies: ${error.message}</p>`;
    });
    addUnsubscribe('currencies', unsubscribeCurrencies); // Add to main.js's unsubscribe tracker
}


function displayCurrency(currency) {
    if (!currencyList) return; // Defensive check
    const currencyRow = document.createElement('div');
    currencyRow.className = 'data-grid-row';
    currencyRow.dataset.id = currency.id;

    currencyRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${currency.id || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currency.currencyName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currency.symbol || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currency.symbol_native || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${currency.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${currency.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    currencyList.appendChild(currencyRow);

    currencyRow.querySelector('.edit-btn').addEventListener('click', () => editCurrency(currency));
    currencyRow.querySelector('.delete-btn').addEventListener('click', () => deleteCurrency(currency.id));
}

function editCurrency(currency) {
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can edit currencies.", () => {});
        return;
    }
    if (currencyFormTitle) currencyFormTitle.textContent = `Edit Currency: ${currency.id}`;
    if (submitCurrencyButton) submitCurrencyButton.textContent = 'Update Currency';

    if (currencyCodeDisplayGroup) currencyCodeDisplayGroup.classList.remove('hidden');
    if (currencyCodeDisplay) currencyCodeDisplay.textContent = currency.id;

    if (adminCurrenciesInput) adminCurrenciesInput.value = `${currency.id},${currency.currencyName || ''},${currency.symbol || ''},${currency.symbol_native || ''}`;

    if (currencyForm) currencyForm.dataset.editingId = currency.id;
    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden');
    if (currencyForm) currencyForm.scrollIntoView({ behavior: 'smooth' });
}

export function resetCurrencyForm() { // Export this function
    if (currencyForm) currencyForm.reset();
    if (currencyForm) currencyForm.dataset.editingId = '';
    if (currencyFormTitle) currencyFormTitle.textContent = 'Add New Currency';
    if (submitCurrencyButton) submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
    if (currencyCodeDisplayGroup) currencyCodeDisplayGroup.classList.add('hidden');
    if (currencyCodeDisplay) currencyCodeDisplay.textContent = '';
    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden');
}
