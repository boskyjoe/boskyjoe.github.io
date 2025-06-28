import { auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe } from './main.js';
import { showModal, APP_SETTINGS_DOC_ID } from './utils.js';

import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variable to hold the Firestore DB instance, explicitly set by main.js
let firestoreDb = null;
let projectId = null; // Store projectId here
let domElementsInitialized = false; // Flag to ensure DOM elements are initialized only once

// EXPORTED: Setter function for the Firestore DB instance
export function setDbInstance(instance) {
    console.log("admin_data.js: setDbInstance received:", instance);
    firestoreDb = instance; // Directly assign for robust assignment
    if (firestoreDb) {
        // Ensure projectId is correctly derived from the FirebaseApp instance within Firestore
        // Use a defensive check for instance.app and instance.app.options
        if (firestoreDb.app && firestoreDb.app.options && firestoreDb.app.options.projectId) {
            projectId = firestoreDb.app.options.projectId;
            console.log("admin_data.js: Firestore DB instance successfully set. projectId:", projectId);
        } else {
            console.error("admin_data.js: Firestore DB instance set, but projectId could not be extracted from db.app.options.projectId. db object:", firestoreDb);
            projectId = null;
        }
    } else {
        console.error("admin_data.js: CRITICAL ERROR: Firestore DB instance is still null after direct assignment. This means the 'instance' passed was null/undefined.");
        projectId = null;
    }
}


// DOM elements for admin_data.js (Country Mapping)
let adminCountryMappingSection;
let adminCountriesInput;
let adminCountryStateMapInput;
let uploadAdminDataButton;
let fullLoadRadio;
let incrementalLoadRadio;
let adminMessageDiv;
let loadCountriesIcon;
let loadCountryStateMapIcon;


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
let loadCurrenciesIcon;


// Global data for Country/State (fetched from Firestore)
export let appCountries = [];
export let appCountryStateMap = {};

// Global data for Currencies (fetched from Firestore)
export let allCurrencies = []; // Export allCurrencies

/**
 * Initializes DOM element references and static event listeners for admin_data module.
 * This should be called once, defensively.
 */
function initializeAdminDomElements() {
    if (domElementsInitialized) return; // Already initialized

    adminCountryMappingSection = document.getElementById('admin-country-mapping-section');
    adminCountriesInput = document.getElementById('adminCountriesInput');
    adminCountryStateMapInput = document.getElementById('adminCountryStateMapInput');
    uploadAdminDataButton = document.getElementById('uploadAdminDataButton');
    fullLoadRadio = document.getElementById('fullLoad');
    incrementalLoadRadio = document.getElementById('incrementalLoad');
    adminMessageDiv = document.getElementById('adminMessage');
    loadCountriesIcon = document.getElementById('loadCountriesIcon');
    loadCountryStateMapIcon = document.getElementById('loadCountryStateMapIcon');

    currencyManagementSection = document.getElementById('currency-management-section');
    currencyForm = document.getElementById('currencyForm');
    currencyFormTitle = document.getElementById('currencyFormTitle');
    currencyCodeDisplayGroup = document.getElementById('currencyCodeDisplayGroup');
    currencyCodeDisplay = document.getElementById('currencyCodeDisplay');
    adminCurrenciesInput = document.getElementById('adminCurrenciesInput');
    submitCurrencyButton = document.getElementById('submitCurrencyButton');
    adminCurrencyMessageDiv = document.getElementById('adminCurrencyMessageDiv');
    currencyList = document.getElementById('currencyList');
    loadCurrenciesIcon = document.getElementById('loadCurrenciesIcon');

    // Add event listeners (only once, after elements are sure to exist)
    if (document.getElementById('countryMappingForm')) {
        document.getElementById('countryMappingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCountryData();
        });
    }
    if (loadCountriesIcon) {
        loadCountriesIcon.addEventListener('click', async () => {
            console.log("admin_data.js: Load Countries Icon clicked.");
            await loadAdminCountryData();
        });
    }
    if (loadCountryStateMapIcon) {
        loadCountryStateMapIcon.addEventListener('click', async () => {
            console.log("admin_data.js: Load Country State Map Icon clicked.");
            await loadAdminCountryData();
        });
    }

    if (currencyForm) {
        currencyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = currencyForm.dataset.editingId;
            await saveCurrency(editingId || null);
        });
    }
    document.getElementById('resetCurrencyFormButton')?.addEventListener('click', resetCurrencyForm);

    if (loadCurrenciesIcon) {
        loadCurrenciesIcon.addEventListener('click', async () => {
            console.log("admin_data.js: Load Currencies Icon clicked.");
            await fetchCurrencies();
            populateCurrencyInputForEdit();
        });
    }
    console.log("admin_data.js: DOM elements and static event listeners initialized.");
    domElementsInitialized = true; // Set flag to true
}


// Initialize Admin Data module elements and event listeners
export async function initAdminDataModule(type) {
    console.log(`admin_data.js: initAdminDataModule called for type: ${type}.`);
    // Ensure DOM elements are initialized first and only once.
    initializeAdminDomElements();

    console.log("admin_data.js: initAdminDataModule current state (after DOM init) - firestoreDb:", firestoreDb, "projectId:", projectId, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId, "isAdmin:", isAdmin);

    // Conditional logic based on type
    if (type === 'country_mapping') {
        // Enable/Disable buttons based on auth and admin status *and if firestoreDb is available*
        if (uploadAdminDataButton) {
            if (isAuthReady && isAdmin && firestoreDb && projectId) {
                uploadAdminDataButton.removeAttribute('disabled');
            } else {
                uploadAdminDataButton.setAttribute('disabled', 'disabled');
            }
        }
    } else if (type === 'currency_management') {
        // Listener for currency changes. This should also only be set if firestoreDb is ready.
        if (firestoreDb && projectId) { // CRITICAL: Only set up listener if DB and projectId are ready
             listenForCurrencies();
        } else {
            console.warn("admin_data.js: Firestore DB instance or Project ID is not set. Cannot set up currency listener.");
            if (currencyList) currencyList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Firestore not ready. Cannot display currencies.</p>';
        }
        resetCurrencyForm(); // Always reset form on module init
        if (submitCurrencyButton) {
            if (isAuthReady && isAdmin && firestoreDb && projectId) {
                submitCurrencyButton.removeAttribute('disabled');
            } else {
                submitCurrencyButton.setAttribute('disabled', 'disabled');
            }
        }
    }
}


/* --- COUNTRY & STATE MAPPING FUNCTIONS (updated for explicit load) --- */

// Function to fetch country and state data from Firestore for the CRM forms
export async function fetchCountryData() {
    console.log("admin_data.js: fetchCountryData called.");
    if (!firestoreDb || !projectId) { // Ensure db is initialized before attempting to use it
        console.error("admin_data.js: CRITICAL ERROR in fetchCountryData - 'firestoreDb' or 'projectId' is NOT valid. Current firestoreDb value:", firestoreDb, "projectId:", projectId);
        appCountries = [];
        appCountryStateMap = {};
        return;
    }
    // NEW: Log firestoreDb immediately before calling doc()
    console.log("admin_data.js: fetchCountryData: About to call doc(). firestoreDb value:", firestoreDb);
    try {
        const docRef = doc(firestoreDb, "app_metadata", "countries_states"); // Use firestoreDb
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

// Function to load existing data into the admin textareas (called by icon click)
async function loadAdminCountryData() {
    console.log("admin_data.js: loadAdminCountryData called by user action.");
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

    if (!firestoreDb || !projectId) { // CRITICAL: Check firestoreDb and projectId here again before fetching
        showModal("Error", "Firestore is not ready. Please try again in a moment.", () => {});
        if (adminMessageDiv) {
            adminMessageDiv.textContent = "Firestore not ready. Please try clicking the load icon again.";
            adminMessageDiv.className = 'message error';
            adminMessageDiv.classList.remove('hidden');
        }
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
        console.log("admin_data.js: Admin country data loaded into textareas via icon click.");
    } catch (error) {
        console.error("admin_data.js: Error in loadAdminCountryData (from icon click):", error);
        if (adminMessageDiv) {
            adminMessageDiv.textContent = `Error loading admin country data: ${error.message}`;
            adminMessageDiv.className = 'message error';
            adminMessageDiv.classList.remove('hidden');
        }
    }
}

async function saveCountryData() {
    console.log("admin_data.js: saveCountryData called.");
    if (!isAuthReady || !currentUserId || !isAdmin || !firestoreDb || !projectId) {
        showModal("Permission Denied", "Only administrators can upload country mapping data, or Firestore is not ready.", () => {});
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

    // If full load is selected and no data is provided, explicitly send empty arrays/objects
    if (isFullLoad) {
        if (!dataToUpload.countries) dataToUpload.countries = [];
        if (!dataToUpload.countryStateMap) dataToUpload.countryStateMap = {};
        hasValidDataForUpload = true; // Force upload if full load is intended, even if inputs are empty
    }


    if (!hasValidDataForUpload && !isFullLoad) {
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
        const docRef = doc(firestoreDb, "app_metadata", "countries_states"); // Use firestoreDb
        await setDoc(docRef, dataToUpload, { merge: !isFullLoad });

        if (adminMessageDiv) {
            adminMessageDiv.textContent = `Data uploaded successfully (${isFullLoad ? 'Full Load (Overwrite)' : 'Incremental Load (Merge)'})!`;
            adminMessageDiv.className = 'message success';
            adminMessageDiv.classList.remove('hidden');
        }
        console.log("admin_data.js: Admin data upload successful:", dataToUpload);

        await fetchCountryData(); // Re-fetch data to update global state for forms
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

/* --- CURRENCY MANAGEMENT FUNCTIONS (updated for explicit load) --- */

// Function to fetch currency data from Firestore
export async function fetchCurrencies() {
    console.log("admin_data.js: fetchCurrencies called.");
    if (!firestoreDb || !projectId) {
        console.error("admin_data.js: CRITICAL ERROR in fetchCurrencies - 'firestoreDb' or 'projectId' is NOT valid. Current firestoreDb value:", firestoreDb, "projectId:", projectId);
        allCurrencies = [];
        return;
    }
    // NEW: Log firestoreDb immediately before calling collection()
    console.log("admin_data.js: fetchCurrencies: About to call collection(). firestoreDb value:", firestoreDb);
    try {
        const collectionRef = collection(firestoreDb, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data"); // Use firestoreDb
        const querySnapshot = await getDocs(collectionRef);
        allCurrencies = []; // Clear existing data
        querySnapshot.forEach((docSnap) => {
            allCurrencies.push({ id: docSnap.id, ...docSnap.data() });
        });
        console.log("admin_data.js: Currency data loaded from Firestore. Total:", allCurrencies.length);
    } catch (error) {
        console.error("admin_data.js: Error fetching currency data from Firestore:", error);
        allCurrencies = [];
    }
}

// Function to populate the currency textarea for editing
function populateCurrencyInputForEdit() {
    if (!adminCurrenciesInput) return;
    if (allCurrencies.length === 0) {
        adminCurrenciesInput.value = '';
        if (adminCurrencyMessageDiv) {
            adminCurrencyMessageDiv.textContent = "No currencies found in Firestore. You can add new ones below.";
            adminCurrencyMessageDiv.className = 'message info';
            adminCurrencyMessageDiv.classList.remove('hidden');
        }
        return;
    }
    // Format all currencies into CSV string for the textarea
    const currenciesString = allCurrencies.map(c => `${c.id},${c.currencyName || ''},${c.symbol || ''},${c.symbol_native || ''}`).join('\n');
    adminCurrenciesInput.value = currenciesString;
    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden');
    console.log("admin_data.js: All currencies loaded into textarea for editing.");
}


// Helper function to get currency symbol by code
export function getCurrencySymbol(code) {
    const currency = allCurrencies.find(c => c.id === code);
    return currency ? currency.symbol : code;
}

// Helper function to get currency name by code
export function getCurrencyName(code) {
    const currency = allCurrencies.find(c => c.id === code);
    return currency ? currency.currencyName : code;
}

async function saveCurrency(existingCurrencyCode = null) {
    console.log("admin_data.js: saveCurrency called.");
    if (!isAuthReady || !currentUserId || !isAdmin || !firestoreDb || !projectId) { // Use imported isAdmin and check firestoreDb
        showModal("Permission Denied", "Only administrators can manage currencies, or Firestore is not ready.", () => {});
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

    const currenciesCollectionRef = collection(firestoreDb, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data"); // Use firestoreDb

    try {
        let updatesPerformed = 0;
        let errorsOccurred = 0;
        let totalProcessed = 0;

        const existingCurrencyDocs = await getDocs(currenciesCollectionRef);
        const existingCurrencyCodes = new Set(existingCurrencyDocs.docs.map(doc => doc.id));


        const newOrUpdatedCodes = new Set();

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
                showModal("Validation Error", `When editing a single currency, the currency code in the input CSV (${code}) must match the currency being edited (${existingCurrencyCode}). Please provide only one line for the edited currency.`, () => {});
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
            newOrUpdatedCodes.add(code);
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

        await fetchCurrencies();
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


export async function deleteCurrency(currencyCode) {
    console.log("admin_data.js: deleteCurrency called for code:", currencyCode);
    if (!isAuthReady || !currentUserId || !isAdmin || !firestoreDb || !projectId) {
        showModal("Permission Denied", "Only administrators can manage currencies, or Firestore is not ready.", () => {});
        return;
    }

    showModal(
        "Confirm Deletion",
        `Are you sure you want to delete the currency '${currencyCode}'? This action cannot be undone.`,
        async () => {
            try {
                const currencyDocRef = doc(firestoreDb, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data", currencyCode); // Use firestoreDb
                await deleteDoc(currencyDocRef);
                console.log("admin_data.js: Currency deleted:", currencyCode);
                showModal("Success", `Currency '${currencyCode}' deleted successfully!`, () => {});
                await fetchCurrencies();
            } catch (error) {
                console.error("admin_data.js: Error deleting currency:", error);
                showModal("Error", `Failed to delete currency: ${error.message}`, () => {});
            }
        }
    );
}


export function listenForCurrencies() {
    console.log("admin_data.js: listenForCurrencies called.");
    if (!isAuthReady || !currentUserId || !isAdmin || !firestoreDb || !projectId) {
        console.warn("admin_data.js: listenForCurrencies: Firestore DB instance, projectId, or user not authorized. Cannot set up listener.");
        if (currencyList) currencyList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Access Denied: Only administrators can view currencies, or Firestore is not ready.</p>';
        return;
    }

    const q = collection(firestoreDb, "app_metadata", APP_SETTINGS_DOC_ID, "currencies_data"); // Use firestoreDb

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (currencyList) currencyList.innerHTML = '';
        if (snapshot.empty) {
            if (currencyList) currencyList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No currencies found. Add them above!</p>';
            return;
        }
        allCurrencies.length = 0;
        snapshot.forEach((doc) => {
            const currency = { id: doc.id, ...doc.data() };
            allCurrencies.push(currency);
            displayCurrency(currency);
        });
        console.log("admin_data.js: Currencies data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("admin_data.js: Error listening to currencies:", error);
        if (currencyList) currencyList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading currencies: ${error.message}</p>`;
    });
    addUnsubscribe('currencies', unsubscribe);
}


function displayCurrency(currency) {
    if (!currencyList) return;
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

export function resetCurrencyForm() {
    if (currencyForm) currencyForm.reset();
    if (currencyForm) currencyForm.dataset.editingId = '';
    if (currencyFormTitle) currencyFormTitle.textContent = 'Add New Currency';
    if (submitCurrencyButton) submitCurrencyButton.textContent = 'Upload Currencies to Firestore';
    if (currencyCodeDisplayGroup) currencyCodeDisplayGroup.classList.add('hidden');
    if (currencyCodeDisplay) currencyCodeDisplay.textContent = '';
    if (adminCurrencyMessageDiv) adminCurrencyMessageDiv.classList.add('hidden');
}
