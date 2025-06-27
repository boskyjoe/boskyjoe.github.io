// UPDATED IMPORT: Import main.js as a whole module
import * as main from './main.js';
import { showModal, getCollectionPath } from './utils.js';
import { fetchCustomersForDropdown, allCustomers } from './customers.js'; // Keep importing from customers.js for customer list logic

import { collection, doc, setDoc, deleteDoc, onSnapshot, query, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// DOM elements for Opportunity Management Section
let opportunitiesManagementSection;
let opportunityForm;
let opportunityFormTitle;
let opportunityIdDisplayGroup;
let opportunityIdDisplay;
let opportunityCustomerSelect; // Reference to the customer dropdown
let opportunityNameInput;
let opportunityAmountInput;
let currencySymbolDisplay;
let opportunityCurrencySelect;
let opportunityStageSelect;
let opportunityExpectedStartDateInput;
let opportunityExpectedCloseDateInput;
let opportunityEventTypeSelect;
let opportunityEventLocationProposedInput;
let opportunityServiceAddressInput;
let opportunityDescriptionInput;
let opportunityDataTextarea;
let submitOpportunityButton; // Main opportunity form submit button
let opportunityList;
let opportunityRightPanel; // The right panel for linked objects
let linkedObjectsAccordion; // The accordion container

// Opportunity Contacts
let opportunityContactForm;
let contactIdDisplayGroup;
let contactIdDisplay;
let contactFirstNameInput;
let contactLastNameInput;
let contactEmailInput;
let contactPhoneInput;
let contactRoleInput;
let submitOpportunityContactButton;
let opportunityContactList;

// Opportunity Lines
let opportunityLineForm;
let optyLineIdDisplayGroup;
let optyLineIdDisplay;
let lineServiceDescriptionInput;
let lineUnitPriceInput;
let lineQuantityInput;
let lineDiscountInput;
let lineNetPriceInput;
let lineStatusSelect;
let submitOpportunityLineButton;
let opportunityLineList;

// Quotes
let quoteForm;
let quoteIdDisplayGroup;
let quoteIdDisplay;
let quoteNameInput;
let quoteCustomerSelect; // For quote form, should be auto-filled from opportunity
let quoteDescriptionInput;
let quoteStartDateInput;
let quoteExpireDateInput;
let quoteStatusSelect;
let quoteCurrencySelect;
let quoteNetListAmountInput;
let quoteNetDiscountInput;
let quoteNetAmountInput;
let quoteIsFinalCheckbox;
let submitQuoteButton; // Quote form submit button
let quoteList;


let unsubscribeOpportunities = null;
let unsubscribeContacts = null;
let unsubscribeLines = null;
let unsubscribeQuotes = null;

// Use main.currentOpportunityId from the imported main module
let currentOpportunityId = null; // Still use local variable here and assign from main.js if needed.

// Initialize Opportunities Module
export async function initOpportunitiesModule() {
    console.log("opportunities.js: initOpportunitiesModule called.");
    // Now access main's properties via the 'main' object
    console.log("opportunities.js: initOpportunitiesModule current state - db:", main.db, "isAuthReady:", main.isAuthReady, "currentUserId:", main.currentUserId);

    // Initialize DOM elements if they haven't been already
    if (!opportunitiesManagementSection) {
        opportunitiesManagementSection = document.getElementById('opportunities-section');
        opportunityForm = document.getElementById('opportunityForm');
        opportunityFormTitle = document.getElementById('opportunityFormTitle');
        opportunityIdDisplayGroup = document.getElementById('opportunityIdDisplayGroup');
        opportunityIdDisplay = document.getElementById('opportunityIdDisplay');
        opportunityCustomerSelect = document.getElementById('opportunityCustomer'); // Get reference
        opportunityNameInput = document.getElementById('opportunityName');
        opportunityAmountInput = document.getElementById('opportunityAmount');
        currencySymbolDisplay = document.getElementById('currencySymbolDisplay');
        opportunityCurrencySelect = document.getElementById('opportunityCurrency');
        opportunityStageSelect = document.getElementById('opportunityStage');
        opportunityExpectedStartDateInput = document.getElementById('opportunityExpectedStartDate');
        opportunityExpectedCloseDateInput = document.getElementById('opportunityExpectedCloseDate');
        opportunityEventTypeSelect = document.getElementById('opportunityEventType');
        opportunityEventLocationProposedInput = document.getElementById('opportunityEventLocationProposed');
        opportunityServiceAddressInput = document.getElementById('opportunityServiceAddress');
        opportunityDescriptionInput = document.getElementById('opportunityDescription');
        opportunityDataTextarea = document.getElementById('opportunityData');
        submitOpportunityButton = document.getElementById('submitOpportunityButton');
        opportunityList = document.getElementById('opportunityList');
        opportunityRightPanel = document.getElementById('opportunity-right-panel');
        linkedObjectsAccordion = document.getElementById('linkedObjectsAccordion');

        // Related objects DOM elements
        opportunityContactForm = document.getElementById('opportunityContactForm');
        contactIdDisplayGroup = document.getElementById('contactIdDisplayGroup');
        contactIdDisplay = document.getElementById('contactIdDisplay');
        contactFirstNameInput = document.getElementById('contactFirstName');
        contactLastNameInput = document.getElementById('contactLastName');
        contactEmailInput = document.getElementById('contactEmail');
        contactPhoneInput = document.getElementById('contactPhone');
        contactRoleInput = document.getElementById('contactRole');
        submitOpportunityContactButton = document.getElementById('submitOpportunityContactButton');
        opportunityContactList = document.getElementById('opportunityContactList');

        opportunityLineForm = document.getElementById('opportunityLineForm');
        optyLineIdDisplayGroup = document.getElementById('optyLineIdDisplayGroup');
        optyLineIdDisplay = document.getElementById('optyLineIdDisplay');
        lineServiceDescriptionInput = document.getElementById('lineServiceDescription');
        lineUnitPriceInput = document.getElementById('lineUnitPrice');
        lineQuantityInput = document.getElementById('lineQuantity');
        lineDiscountInput = document.getElementById('lineDiscount');
        lineNetPriceInput = document.getElementById('lineNetPrice');
        lineStatusSelect = document.getElementById('lineStatus');
        submitOpportunityLineButton = document.getElementById('submitOpportunityLineButton');
        opportunityLineList = document.getElementById('opportunityLineList');

        quoteForm = document.getElementById('quoteForm');
        quoteIdDisplayGroup = document.getElementById('quoteIdDisplayGroup');
        quoteIdDisplay = document.getElementById('quoteIdDisplay');
        quoteNameInput = document.getElementById('quoteName');
        quoteCustomerSelect = document.getElementById('quoteCustomer');
        quoteDescriptionInput = document.getElementById('quoteDescription');
        quoteStartDateInput = document.getElementById('quoteStartDate');
        quoteExpireDateInput = document.getElementById('quoteExpireDate');
        quoteStatusSelect = document.getElementById('quoteStatus');
        quoteCurrencySelect = document.getElementById('quoteCurrency');
        quoteNetListAmountInput = document.getElementById('quoteNetListAmount');
        quoteNetDiscountInput = document.getElementById('quoteNetDiscount');
        quoteNetAmountInput = document.getElementById('quoteNetAmount');
        quoteIsFinalCheckbox = document.getElementById('quoteIsFinal');
        submitQuoteButton = document.getElementById('submitQuoteButton');
        quoteList = document.getElementById('quoteList');

        // --- DEBUG: Check button elements immediately after assignment ---
        console.log("opportunities.js: submitOpportunityButton after getElementById:", submitOpportunityButton);
        console.log("opportunities.js: submitQuoteButton after getElementById:", submitQuoteButton);


        // Add event listeners for main Opportunity form
        if (opportunityForm) {
            opportunityForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveOpportunity();
            });
        }
        document.getElementById('resetOpportunityFormButton')?.addEventListener('click', resetOpportunityForm);
        if (opportunityAmountInput && opportunityCurrencySelect) {
            opportunityAmountInput.addEventListener('input', updateCurrencySymbol);
            opportunityCurrencySelect.addEventListener('change', updateCurrencySymbol);
        }

        // Add event listeners for nested forms
        if (opportunityContactForm) opportunityContactForm.addEventListener('submit', handleContactFormSubmit);
        document.getElementById('resetOpportunityContactFormButton')?.addEventListener('click', resetOpportunityContactForm);

        if (opportunityLineForm) {
            opportunityLineForm.addEventListener('submit', handleLineFormSubmit);
            lineUnitPriceInput.addEventListener('input', calculateNetPrice);
            lineQuantityInput.addEventListener('input', calculateNetPrice);
            lineDiscountInput.addEventListener('input', calculateNetPrice);
        }
        document.getElementById('resetOpportunityLineFormButton')?.addEventListener('click', resetOpportunityLineForm);

        if (quoteForm) {
            quoteForm.addEventListener('submit', handleQuoteFormSubmit);
            quoteNetListAmountInput.addEventListener('input', calculateQuoteNetAmount);
            quoteNetDiscountInput.addEventListener('input', calculateQuoteNetAmount);
        }
        document.getElementById('resetQuoteFormButton')?.addEventListener('click', resetQuoteForm);


        // Accordion functionality for related objects
        document.getElementById('contactsAccordionHeader')?.addEventListener('click', toggleAccordion);
        document.getElementById('linesAccordionHeader')?.addEventListener('click', toggleAccordion);
        document.getElementById('quotesAccordionHeader')?.addEventListener('click', toggleAccordion);
    }

    // Load data specific to this module
    if (main.isAuthReady && main.currentUserId) { // Use main.isAuthReady, main.currentUserId
        if (submitOpportunityButton) submitOpportunityButton.removeAttribute('disabled');
        // Populate dropdowns and start listeners
        await populateCustomersForOpportunityDropdown(); // NEW: Populate customer dropdown
        
        // --- ADDED DEBUG LOGS FOR CURRENCY FETCHING/POPULATION ---
        console.log("opportunities.js: Before fetching currencies. main.allCurrencies (initial):", main.allCurrencies);
        await main.fetchCurrencies(); // Ensure currencies are loaded (from main.js)
        console.log("opportunities.js: After fetching currencies. main.allCurrencies (after fetch):", main.allCurrencies);
        console.log("opportunities.js: main.getCurrencySymbol reference:", main.getCurrencySymbol); // Debug main.getCurrencySymbol reference
        
        populateCurrenciesForOpportunityAndQuoteForms(); // Populate currency dropdowns
        listenForOpportunities();
        resetOpportunityForm();
    } else {
        if (submitOpportunityButton) submitOpportunityButton.setAttribute('disabled', 'disabled');
        if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Please sign in to view opportunities.</p>';
        hideLinkedObjectsPanel(); // Hide the right panel if not signed in
    }
}

// Function to handle accordion toggling
function toggleAccordion(event) {
    const header = event.currentTarget;
    const content = header.nextElementSibling;
    header.classList.toggle('active');
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

// Determines the Firestore collection path for opportunities
function getOpportunitiesCollectionPath() {
    // Opportunities are now in a top-level collection called 'opportunities_data'
    // This removes them from the '/artifacts/{appId}/public/data/' path.
    return 'opportunities_data';
}

// Determines the Firestore sub-collection path for related objects
function getOpportunitySubCollectionPath(subCollectionName) {
    // Access currentOpportunityId from the main module if it's there, otherwise local
    const idToUse = main.currentOpportunityId || currentOpportunityId;
    if (!idToUse) {
        console.error(`opportunities.js: Cannot get subcollection path for ${subCollectionName}: no currentOpportunityId set.`);
        return null;
    }
    // Subcollections now also live under the new top-level opportunities_data
    return `${getOpportunitiesCollectionPath()}/${idToUse}/${subCollectionName}`;
}


/* --- CUSTOMER DROPDOWN POPULATION --- */
async function populateCustomersForOpportunityDropdown() {
    if (!opportunityCustomerSelect) {
        console.warn("opportunities.js: opportunityCustomerSelect element not found.");
        return;
    }

    opportunityCustomerSelect.innerHTML = '<option value="">Select Customer</option>'; // Clear existing options

    // Use the exported fetchCustomersForDropdown function
    const customers = await fetchCustomersForDropdown();

    if (customers.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No customers found. Please add one in the Customers section.';
        opportunityCustomerSelect.appendChild(option);
        opportunityCustomerSelect.disabled = true;
        return;
    }
    opportunityCustomerSelect.disabled = false;

    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id; // Store Firestore Document ID
        // Display name based on customer type
        option.textContent = customer.customerType === 'Individual'
            ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.customerId
            : customer.companyName || customer.customerId;
        opportunityCustomerSelect.appendChild(option);
    });

    console.log("opportunities.js: Customer dropdown populated.");
}


/* --- CURRENCY DROPDOWN POPULATION --- */
function populateCurrenciesForOpportunityAndQuoteForms() {
    if (!opportunityCurrencySelect || !quoteCurrencySelect) return;

    opportunityCurrencySelect.innerHTML = '<option value="">Select Currency</option>';
    quoteCurrencySelect.innerHTML = '<option value="">Select Currency</option>';

    // --- ADDED DEBUG LOGS ---
    console.log("opportunities.js: populateCurrenciesForOpportunityAndQuoteForms called. main.allCurrencies:", main.allCurrencies);


    if (main.allCurrencies && main.allCurrencies.length > 0) { // Use main.allCurrencies
        main.allCurrencies.forEach(currency => { // Use main.allCurrencies
            const optionOpty = document.createElement('option');
            optionOpty.value = currency.id; // Use currency.id (which is the code)
            optionOpty.textContent = `${currency.id} - ${currency.currencyName} (${currency.symbol})`; // Use currency.currencyName
            opportunityCurrencySelect.appendChild(optionOpty);

            const optionQuote = document.createElement('option');
            optionQuote.value = currency.id; // Use currency.id (which is the code)
            optionQuote.textContent = `${currency.id} - ${currency.currencyName} (${currency.symbol})`; // Use currency.currencyName
            quoteCurrencySelect.appendChild(optionQuote);
        });
        // Set default currency if USD exists
        if (opportunityCurrencySelect.querySelector('option[value="USD"]')) {
            opportunityCurrencySelect.value = 'USD';
            quoteCurrencySelect.value = 'USD';
            updateCurrencySymbol(); // Update symbol for default USD
        }
    } else {
        console.warn("opportunities.js: No currencies available to populate dropdowns.");
        const optionOpty = document.createElement('option');
        optionOpty.value = '';
        optionOpty.textContent = 'No currencies available';
        opportunityCurrencySelect.appendChild(optionOpty);
        opportunityCurrencySelect.disabled = true;

        const optionQuote = document.createElement('option');
        optionQuote.value = '';
        optionQuote.textContent = 'No currencies available';
        quoteCurrencySelect.appendChild(optionQuote);
        quoteCurrencySelect.disabled = true;
    }
}

// Update the currency symbol next to the amount input
function updateCurrencySymbol() {
    if (!currencySymbolDisplay || !opportunityCurrencySelect) return;
    const selectedCurrencyCode = opportunityCurrencySelect.value;

    // --- ADDED DEBUG LOG ---
    console.log("opportunities.js: updateCurrencySymbol called. selectedCurrencyCode:", selectedCurrencyCode);
    console.log("opportunities.js: main.getCurrencySymbol in updateCurrencySymbol is:", main.getCurrencySymbol);

    // Call the function via the imported 'main' object
    const symbolToAssign = main.getCurrencySymbol(selectedCurrencyCode);
    
    if (currencySymbolDisplay) { // Defensive check
        currencySymbolDisplay.textContent = symbolToAssign;
    }
}


/* --- OPPORTUNITY CRUD OPERATIONS --- */

async function saveOpportunity() {
    // Use main.isAuthReady, main.currentUserId, main.db
    if (!main.isAuthReady || !main.currentUserId) {
        showModal("Permission Denied", "Please sign in to manage opportunities.", () => {});
        return;
    }
    if (!main.db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot save opportunity.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    // Basic validation
    const mandatoryFields = [
        { field: opportunityCustomerSelect.value, name: "Customer" },
        { field: opportunityNameInput.value.trim(), name: "Opportunity Name" },
        { field: opportunityAmountInput.value, name: "Amount" },
        { field: opportunityCurrencySelect.value, name: "Currency" },
        { field: opportunityStageSelect.value, name: "Stage" },
        { field: opportunityExpectedStartDateInput.value, name: "Expected Start Date" },
        { field: opportunityExpectedCloseDateInput.value, name: "Expected Close Date" },
        { field: opportunityEventTypeSelect.value, name: "Event Type" },
        { field: opportunityEventLocationProposedInput.value.trim(), name: "Proposed Event Location" },
        { field: opportunityServiceAddressInput.value.trim(), name: "Service Address" },
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field) {
            missingFields.push(item.name);
        }
    });

    if (missingFields.length > 0) {
        showModal("Validation Error", `Please fill in all mandatory fields: ${[...new Set(missingFields)].join(', ')}.`, () => {});
        return;
    }

    // Attempt to parse additionalData as JSON, otherwise store as string
    let additionalData = opportunityDataTextarea.value.trim();
    try {
        if (additionalData) {
            additionalData = JSON.parse(additionalData);
        } else {
            additionalData = {}; // Default to empty object if empty
        }
    } catch (e) {
        console.warn("opportunities.js: Additional Opportunity Data is not valid JSON, saving as plain text.");
        // Keep additionalData as string if invalid JSON
    }


    const opportunityData = {
        customerId: opportunityCustomerSelect.value, // Save the customer's Firestore Doc ID
        opportunityName: opportunityNameInput.value.trim(),
        amount: parseFloat(opportunityAmountInput.value),
        currency: opportunityCurrencySelect.value,
        stage: opportunityStageSelect.value,
        expectedStartDate: opportunityExpectedStartDateInput.value,
        expectedCloseDate: opportunityExpectedCloseDateInput.value,
        eventType: opportunityEventTypeSelect.value,
        eventLocationProposed: opportunityEventLocationProposedInput.value.trim(),
        serviceAddress: opportunityServiceAddressInput.value.trim(),
        description: opportunityDescriptionInput.value.trim(),
        additionalData: additionalData,
        ownerId: main.currentUserId, // Link opportunity to the current logged-in user
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const editingId = opportunityForm.dataset.editingId;
    const collectionPath = getOpportunitiesCollectionPath();

    try {
        if (editingId) {
            // Update existing opportunity
            const opportunityDocRef = doc(main.db, collectionPath, editingId); // Use main.db
            await setDoc(opportunityDocRef, opportunityData, { merge: true });
            showModal("Success", "Opportunity updated successfully!", () => {});
            console.log("opportunities.js: Opportunity updated:", editingId);
        } else {
            // Add new opportunity
            const newDocRef = doc(collection(main.db, collectionPath)); // Use main.db
            const systemGeneratedId = `OPP-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            await setDoc(newDocRef, { ...opportunityData, opportunityId: systemGeneratedId });
            showModal("Success", "New Opportunity added successfully!", () => {});
            console.log("opportunities.js: New Opportunity added with system-generated ID:", systemGeneratedId);
        }
        resetOpportunityForm();
    } catch (error) {
        console.error("opportunities.js: Error saving opportunity:", error);
        showModal("Error", `Failed to save opportunity: ${error.message}`, () => {});
    }
}

// Delete an Opportunity
async function deleteOpportunity(firestoreDocId) {
    // Use main.isAuthReady, main.currentUserId, main.db
    if (!main.isAuthReady || !main.currentUserId) {
        showModal("Permission Denied", "Please sign in to manage opportunities.", () => {});
        return;
    }
    if (!main.db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot delete opportunity.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const collectionPath = getOpportunitiesCollectionPath();

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this opportunity and all its associated contacts, lines, and quotes? This action cannot be undone.",
        async () => {
            try {
                // Delete the main opportunity document
                await deleteDoc(doc(main.db, collectionPath, firestoreDocId)); // Use main.db

                // --- IMPORTANT: Delete subcollections (contacts, lines, quotes) ---
                // Firestore does not automatically delete subcollections when a document is deleted.
                // You must manually delete documents within subcollections.
                const subCollections = ['contacts', 'lines', 'quotes'];
                for (const subColName of subCollections) {
                    const subColRef = collection(main.db, `${collectionPath}/${firestoreDocId}/${subColName}`); // Use main.db
                    const subColSnapshot = await getDocs(subColRef);
                    const deletePromises = [];
                    subColSnapshot.forEach((subDoc) => {
                        deletePromises.push(deleteDoc(doc(subColRef, subDoc.id)));
                    });
                    await Promise.all(deletePromises);
                    console.log(`opportunities.js: Deleted all documents in ${subColName} subcollection for opportunity ${firestoreDocId}.`);
                }

                showModal("Success", "Opportunity and all related data deleted successfully!", () => {});
                console.log("opportunities.js: Opportunity deleted Firestore Doc ID:", firestoreDocId);
            } catch (error) {
                console.error("opportunities.js: Error deleting opportunity:", error);
                showModal("Error", `Failed to delete opportunity: ${error.message}`, () => {});
            }
        }
    );
}

// Listen for real-time updates to Opportunities
export function listenForOpportunities() {
    if (unsubscribeOpportunities) {
        unsubscribeOpportunities(); // Unsubscribe from previous listener
    }

    // Use main.isAuthReady, main.currentUserId, main.db
    if (!main.isAuthReady || !main.currentUserId) {
        if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Please sign in to view opportunities.</p>';
        return;
    }
    if (!main.db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot listen for opportunities.");
        if (opportunityList) opportunityList.innerHTML = '<p class="text-red-500 text-center py-4 col-span-full">Firestore not ready to load opportunities.</p>';
        return;
    }

    const collectionPath = getOpportunitiesCollectionPath();
    const q = collection(main.db, collectionPath); // Use main.db

    unsubscribeOpportunities = onSnapshot(q, (snapshot) => {
        if (opportunityList) opportunityList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No opportunities found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const opportunity = { id: doc.id, ...doc.data() };
            displayOpportunity(opportunity);
        });
        console.log("opportunities.js: Opportunities data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to opportunities:", error);
        if (opportunityList) opportunityList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading opportunities: ${error.message}</p>`;
    });

    main.addUnsubscribe('opportunities', unsubscribeOpportunities); // Register with main.js's central tracker
}

// Display a single opportunity in the UI as a grid row
function displayOpportunity(opportunity) {
    if (!opportunityList) return; // Defensive check

    const opportunityRow = document.createElement('div');
    opportunityRow.className = 'data-grid-row';
    opportunityRow.dataset.id = opportunity.id;

    // Find the customer name based on customerId
    const customer = allCustomers.find(c => c.id === opportunity.customerId);
    const customerName = customer ? (customer.customerType === 'Individual' ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : customer.companyName || 'N/A') : 'Unknown Customer';

    opportunityRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${opportunity.opportunityId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${opportunity.opportunityName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${customerName}</div>
        <div class="px-2 py-1 truncate">${opportunity.amount ? `${opportunity.amount.toFixed(2)} ${opportunity.currency || ''}` : 'N/A'}</div>
        <div class="px-2 py-1 truncate">${opportunity.stage || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${opportunity.expectedStartDate || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${opportunity.expectedCloseDate || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${opportunity.eventType || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${opportunity.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${opportunity.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    opportunityList.appendChild(opportunityRow);

    opportunityRow.querySelector('.edit-btn').addEventListener('click', () => editOpportunity(opportunity));
    opportunityRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunity(opportunity.id));
}

// Populate form for editing an opportunity
async function editOpportunity(opportunity) {
    // Use main.isAuthReady, main.currentUserId
    if (!main.isAuthReady || !main.currentUserId) {
        showModal("Permission Denied", "Please sign in to edit opportunities.", () => {});
        return;
    }
    currentOpportunityId = opportunity.id; // Set the local current opportunity ID
    main.currentOpportunityId = opportunity.id; // Also update the main module's variable

    if (opportunityFormTitle) opportunityFormTitle.textContent = 'Edit Opportunity';
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Update Opportunity';

    if (opportunityForm) opportunityForm.dataset.editingId = opportunity.id;

    if (opportunityIdDisplayGroup) opportunityIdDisplayGroup.classList.remove('hidden');
    if (opportunityIdDisplay) opportunityIdDisplay.textContent = opportunity.opportunityId || 'N/A';

    // Populate customer dropdown and select the correct customer
    await populateCustomersForOpportunityDropdown(); // Ensure dropdown is populated
    if (opportunityCustomerSelect) opportunityCustomerSelect.value = opportunity.customerId || '';


    if (opportunityNameInput) opportunityNameInput.value = opportunity.opportunityName || '';
    if (opportunityAmountInput) opportunityAmountInput.value = opportunity.amount || '';
    if (opportunityCurrencySelect) opportunityCurrencySelect.value = opportunity.currency || '';
    updateCurrencySymbol(); // Update symbol based on selected currency
    if (opportunityStageSelect) opportunityStageSelect.value = opportunity.stage || '';
    if (opportunityExpectedStartDateInput) opportunityExpectedStartDateInput.value = opportunity.expectedStartDate || '';
    if (opportunityExpectedCloseDateInput) opportunityExpectedCloseDateInput.value = opportunity.expectedCloseDate || '';
    if (opportunityEventTypeSelect) opportunityEventTypeSelect.value = opportunity.eventType || '';
    if (opportunityEventLocationProposedInput) opportunityEventLocationProposedInput.value = opportunity.eventLocationProposed || '';
    if (opportunityServiceAddressInput) opportunityServiceAddressInput.value = opportunity.serviceAddress || '';
    if (opportunityDescriptionInput) opportunityDescriptionInput.value = opportunity.description || '';
    
    // Handle additionalData (JSON or string)
    if (opportunityDataTextarea) {
        if (typeof opportunity.additionalData === 'object' && opportunity.additionalData !== null) {
            opportunityDataTextarea.value = JSON.stringify(opportunity.additionalData, null, 2);
        } else {
            opportunityDataTextarea.value = opportunity.additionalData || '';
        }
    }


    showLinkedObjectsPanel(); // Show the right panel
    listenForOpportunityContacts(); // Start listening for related contacts
    listenForOpportunityLines(); // Start listening for related lines
    listenForQuotes(); // Start listening for related quotes

    if (opportunityForm) opportunityForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Opportunity form function
export function resetOpportunityForm() {
    if (opportunityForm) opportunityForm.reset();
    if (opportunityForm) opportunityForm.dataset.editingId = ''; // Clear editing ID
    if (opportunityFormTitle) opportunityFormTitle.textContent = 'Add New Opportunity';
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Add Opportunity';

    if (opportunityIdDisplayGroup) opportunityIdDisplayGroup.classList.add('hidden'); // Hide ID display
    if (opportunityIdDisplay) opportunityIdDisplay.textContent = '';

    if (opportunityCustomerSelect) opportunityCustomerSelect.value = ''; // Reset customer dropdown
    if (opportunityStageSelect) opportunityStageSelect.value = ''; // Reset stage dropdown
    if (opportunityEventTypeSelect) opportunityEventTypeSelect.value = ''; // Reset event type dropdown

    // Reset dates to empty
    if (opportunityExpectedStartDateInput) opportunityExpectedStartDateInput.value = '';
    if (opportunityExpectedCloseDateInput) opportunityExpectedCloseDateInput.value = '';

    if (opportunityDataTextarea) opportunityDataTextarea.value = ''; // Clear additional data

    // Reset currency to default (USD if available)
    if (opportunityCurrencySelect) {
        // --- ADDED DEBUG LOG ---
        console.log("opportunities.js: resetOpportunityForm. main.allCurrencies:", main.allCurrencies); // Use main.allCurrencies
        opportunityCurrencySelect.value = main.allCurrencies.find(c => c.id === 'USD') ? 'USD' : ''; // Use main.allCurrencies, c.id for currency code
        updateCurrencySymbol();
    }

    currentOpportunityId = null; // Clear local current opportunity ID
    main.currentOpportunityId = null; // Also clear the main module's variable

    // Reset and hide linked object forms and lists
    resetOpportunityContactForm();
    resetOpportunityLineForm();
    resetQuoteForm();
    hideLinkedObjectsPanel();

    // Clear existing related lists
    if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No contacts added for this opportunity.</p>';
    if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No opportunity lines added for this opportunity.</p>';
    if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No quotes added for this opportunity.</p>';

    // Unsubscribe from related listeners
    if (unsubscribeContacts) unsubscribeContacts();
    if (unsubscribeLines) unsubscribeLines();
    if (unsubscribeQuotes) unsubscribeQuotes();
    main.removeUnsubscribe('opportunityContacts'); // Use main.removeUnsubscribe
    main.removeUnsubscribe('opportunityLines'); // Use main.removeUnsubscribe
    main.removeUnsubscribe('opportunityQuotes'); // Use main.removeUnsubscribe

    // Ensure submit button is enabled if auth is ready
    if (main.isAuthReady && main.currentUserId) { // Use main.isAuthReady, main.currentUserId
        if (submitOpportunityButton) submitOpportunityButton.removeAttribute('disabled');
    } else {
        if (submitOpportunityButton) submitOpportunityButton.setAttribute('disabled', 'disabled');
    }
}

// Show/Hide Right Panel Logic
function showLinkedObjectsPanel() {
    if (opportunityRightPanel) opportunityRightPanel.classList.remove('hidden-panel');
    if (linkedObjectsAccordion) linkedObjectsAccordion.classList.remove('hidden');
    // Adjust main content width if needed - this might be handled by Tailwind responsive classes
}

function hideLinkedObjectsPanel() {
    if (opportunityRightPanel) opportunityRightPanel.classList.add('hidden-panel');
    if (linkedObjectsAccordion) linkedObjectsAccordion.classList.add('hidden');
    // Adjust main content width if needed
}


/* --- OPPORTUNITY CONTACTS CRUD --- */
async function handleContactFormSubmit(e) {
    e.preventDefault();
    if (!main.currentOpportunityId) { // Use main.currentOpportunityId
        showModal("Error", "Please select or create an opportunity first.", () => {});
        return;
    }

    const contactData = {
        firstName: contactFirstNameInput.value.trim(),
        lastName: contactLastNameInput.value.trim(),
        email: contactEmailInput.value.trim(),
        phone: contactPhoneInput.value.trim(),
        role: contactRoleInput.value.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: main.currentUserId // Use main.currentUserId
    };

    const editingId = opportunityContactForm.dataset.editingId;
    const collectionPath = getOpportunitySubCollectionPath('contacts');

    if (!collectionPath) return; // Defensive check

    try {
        if (editingId) {
            await setDoc(doc(main.db, collectionPath, editingId), contactData, { merge: true }); // Use main.db
            showModal("Success", "Contact updated successfully!", () => {});
        } else {
            await setDoc(doc(collection(main.db, collectionPath)), contactData); // Use main.db
            showModal("Success", "Contact added successfully!", () => {});
        }
        resetOpportunityContactForm();
    } catch (error) {
        console.error("opportunities.js: Error saving contact:", error);
        showModal("Error", `Failed to save contact: ${error.message}`, () => {});
    }
}

async function deleteOpportunityContact(contactDocId) {
    if (!main.currentOpportunityId) return; // Use main.currentOpportunityId
    const collectionPath = getOpportunitySubCollectionPath('contacts');
    if (!collectionPath) return;

    showModal("Confirm Deletion", "Are you sure you want to delete this contact?", async () => {
        try {
            await deleteDoc(doc(main.db, collectionPath, contactDocId)); // Use main.db
            showModal("Success", "Contact deleted successfully!", () => {});
        } catch (error) {
            console.error("opportunities.js: Error deleting contact:", error);
            showModal("Error", `Failed to delete contact: ${error.message}`, () => {});
        }
    });
}

function listenForOpportunityContacts() {
    if (unsubscribeContacts) unsubscribeContacts();
    if (!main.currentOpportunityId || !main.db) { // Use main.currentOpportunityId, main.db
        if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Select an opportunity to view contacts.</p>';
        return;
    }

    const collectionPath = getOpportunitySubCollectionPath('contacts');
    if (!collectionPath) return;

    const q = collection(main.db, collectionPath); // Use main.db
    unsubscribeContacts = onSnapshot(q, (snapshot) => {
        if (opportunityContactList) opportunityContactList.innerHTML = '';
        if (snapshot.empty) {
            if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No contacts added for this opportunity.</p>';
            return;
        }
        snapshot.forEach(doc => displayOpportunityContact({ id: doc.id, ...doc.data() }));
    }, (error) => {
        console.error("opportunities.js: Error listening to contacts:", error);
        if (opportunityContactList) opportunityContactList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading contacts: ${error.message}</p>`;
    });
    main.addUnsubscribe('opportunityContacts', unsubscribeContacts); // Use main.addUnsubscribe
}

function displayOpportunityContact(contact) {
    if (!opportunityContactList) return;
    const contactRow = document.createElement('div');
    contactRow.className = 'data-grid-row';
    contactRow.dataset.id = contact.id;
    contactRow.innerHTML = `
        <div class="px-2 py-1 truncate">${contact.id}</div>
        <div class="px-2 py-1 truncate">${contact.firstName} ${contact.lastName}</div>
        <div class="px-2 py-1 truncate">${contact.email}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${contact.phone}</div>
        <div class="px-2 py-1 truncate hidden md:block">${contact.role}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${contact.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${contact.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    opportunityContactList.appendChild(contactRow);

    contactRow.querySelector('.edit-btn').addEventListener('click', () => editOpportunityContact(contact));
    contactRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunityContact(contact.id));
}

function editOpportunityContact(contact) {
    if (!contact) return;
    if (contactIdDisplayGroup) contactIdDisplayGroup.classList.remove('hidden');
    if (contactIdDisplay) contactIdDisplay.textContent = contact.id;
    if (contactFirstNameInput) contactFirstNameInput.value = contact.firstName || '';
    if (contactLastNameInput) contactLastNameInput.value = contact.lastName || '';
    if (contactEmailInput) contactEmailInput.value = contact.email || '';
    if (contactPhoneInput) contactPhoneInput.value = contact.phone || '';
    if (contactRoleInput) contactRoleInput.value = contact.role || '';
    if (opportunityContactForm) opportunityContactForm.dataset.editingId = contact.id;
    if (submitOpportunityContactButton) submitOpportunityContactButton.textContent = 'Update Contact';
    document.getElementById('contactsAccordionHeader')?.classList.add('active');
    document.getElementById('contactsAccordionHeader')?.nextElementSibling.style.maxHeight = document.getElementById('contactsAccordionHeader')?.nextElementSibling.scrollHeight + "px";
}

function resetOpportunityContactForm() {
    if (opportunityContactForm) opportunityContactForm.reset();
    if (opportunityContactForm) opportunityContactForm.dataset.editingId = '';
    if (contactIdDisplayGroup) contactIdDisplayGroup.classList.add('hidden');
    if (contactIdDisplay) contactIdDisplay.textContent = '';
    if (submitOpportunityContactButton) submitOpportunityContactButton.textContent = 'Add Contact';
}

/* --- OPPORTUNITY LINES CRUD --- */
function calculateNetPrice() {
    const unitPrice = parseFloat(lineUnitPriceInput.value) || 0;
    const quantity = parseFloat(lineQuantityInput.value) || 0;
    const discount = parseFloat(lineDiscountInput.value) || 0;

    const rawTotal = unitPrice * quantity;
    const netPrice = rawTotal * (1 - discount / 100);

    if (lineNetPriceInput) {
        lineNetPriceInput.value = netPrice.toFixed(2);
    }
}

async function handleLineFormSubmit(e) {
    e.preventDefault();
    if (!main.currentOpportunityId) { // Use main.currentOpportunityId
        showModal("Error", "Please select or create an opportunity first.", () => {});
        return;
    }

    const lineData = {
        serviceDescription: lineServiceDescriptionInput.value.trim(),
        unitPrice: parseFloat(lineUnitPriceInput.value) || 0,
        quantity: parseInt(lineQuantityInput.value) || 0,
        discount: parseFloat(lineDiscountInput.value) || 0,
        netPrice: parseFloat(lineNetPriceInput.value) || 0, // Capture calculated net price
        status: lineStatusSelect.value,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: main.currentUserId // Use main.currentUserId
    };

    const editingId = opportunityLineForm.dataset.editingId;
    const collectionPath = getOpportunitySubCollectionPath('lines');
    if (!collectionPath) return;

    try {
        if (editingId) {
            await setDoc(doc(main.db, collectionPath, editingId), lineData, { merge: true }); // Use main.db
            showModal("Success", "Line item updated successfully!", () => {});
        } else {
            await setDoc(doc(collection(main.db, collectionPath)), lineData); // Use main.db
            showModal("Success", "Line item added successfully!", () => {});
        }
        resetOpportunityLineForm();
    } catch (error) {
        console.error("opportunities.js: Error saving line item:", error);
        showModal("Error", `Failed to save line item: ${error.message}`, () => {});
    }
}

async function deleteOpportunityLine(lineDocId) {
    if (!main.currentOpportunityId) return; // Use main.currentOpportunityId
    const collectionPath = getOpportunitySubCollectionPath('lines');
    if (!collectionPath) return;

    showModal("Confirm Deletion", "Are you sure you want to delete this line item?", async () => {
        try {
            await deleteDoc(doc(main.db, collectionPath, lineDocId)); // Use main.db
            showModal("Success", "Line item deleted successfully!", () => {});
        } catch (error) {
            console.error("opportunities.js: Error deleting line item:", error);
            showModal("Error", `Failed to delete line item: ${error.message}`, () => {});
        }
    });
}

function listenForOpportunityLines() {
    if (unsubscribeLines) unsubscribeLines();
    if (!main.currentOpportunityId || !main.db) { // Use main.currentOpportunityId, main.db
        if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Select an opportunity to view lines.</p>';
        return;
    }

    const collectionPath = getOpportunitySubCollectionPath('lines');
    if (!collectionPath) return;

    const q = collection(main.db, collectionPath); // Use main.db
    unsubscribeLines = onSnapshot(q, (snapshot) => {
        if (opportunityLineList) opportunityLineList.innerHTML = '';
        if (snapshot.empty) {
            if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No opportunity lines added for this opportunity.</p>';
            return;
        }
        snapshot.forEach(doc => displayOpportunityLine({ id: doc.id, ...doc.data() }));
    }, (error) => {
        console.error("opportunities.js: Error listening to lines:", error);
        if (opportunityLineList) opportunityLineList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading lines: ${error.message}</p>`;
    });
    main.addUnsubscribe('opportunityLines', unsubscribeLines); // Use main.addUnsubscribe
}

function displayOpportunityLine(line) {
    if (!opportunityLineList) return;
    const lineRow = document.createElement('div');
    lineRow.className = 'data-grid-row';
    lineRow.dataset.id = line.id;
    lineRow.innerHTML = `
        <div class="px-2 py-1 truncate">${line.id}</div>
        <div class="px-2 py-1 truncate">${line.serviceDescription}</div>
        <div class="px-2 py-1 truncate">${line.unitPrice.toFixed(2)}</div>
        <div class="px-2 py-1 truncate">${line.quantity}</div>
        <div class="px-2 py-1 truncate">${line.discount.toFixed(2)}%</div>
        <div class="px-2 py-1 truncate font-semibold">${line.netPrice.toFixed(2)}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${line.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${line.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    opportunityLineList.appendChild(lineRow);

    lineRow.querySelector('.edit-btn').addEventListener('click', () => editOpportunityLine(line));
    lineRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunityLine(line.id));
}

function editOpportunityLine(line) {
    if (!line) return;
    if (optyLineIdDisplayGroup) optyLineIdDisplayGroup.classList.remove('hidden');
    if (optyLineIdDisplay) optyLineIdDisplay.textContent = line.id;
    if (lineServiceDescriptionInput) lineServiceDescriptionInput.value = line.serviceDescription || '';
    if (lineUnitPriceInput) lineUnitPriceInput.value = line.unitPrice || 0;
    if (lineQuantityInput) lineQuantityInput.value = line.quantity || 0;
    if (lineDiscountInput) lineDiscountInput.value = line.discount || 0;
    if (lineStatusSelect) lineStatusSelect.value = line.status || 'Proposed';
    calculateNetPrice(); // Recalculate net price based on loaded values
    if (opportunityLineForm) opportunityLineForm.dataset.editingId = line.id;
    if (submitOpportunityLineButton) submitOpportunityLineButton.textContent = 'Update Line';
    document.getElementById('linesAccordionHeader')?.classList.add('active');
    document.getElementById('linesAccordionHeader')?.nextElementSibling.style.maxHeight = document.getElementById('linesAccordionHeader')?.nextElementSibling.scrollHeight + "px";
}

function resetOpportunityLineForm() {
    if (opportunityLineForm) opportunityLineForm.reset();
    if (opportunityLineForm) opportunityLineForm.dataset.editingId = '';
    if (optyLineIdDisplayGroup) optyLineIdDisplayGroup.classList.add('hidden');
    if (optyLineIdDisplay) optyLineIdDisplay.textContent = '';
    if (lineNetPriceInput) lineNetPriceInput.value = '0.00'; // Reset calculated field
    if (submitOpportunityLineButton) submitOpportunityLineButton.textContent = 'Add Line';
}

/* --- QUOTES CRUD --- */
function calculateQuoteNetAmount() {
    const netList = parseFloat(quoteNetListAmountInput.value) || 0;
    const netDiscount = parseFloat(quoteNetDiscountInput.value) || 0;
    const netAmount = netList - netDiscount;
    if (quoteNetAmountInput) {
        quoteNetAmountInput.value = netAmount.toFixed(2);
    }
}

async function handleQuoteFormSubmit(e) {
    e.preventDefault();
    if (!main.currentOpportunityId) { // Use main.currentOpportunityId
        showModal("Error", "Please select or create an opportunity first.", () => {});
        return;
    }

    const quoteData = {
        name: quoteNameInput.value.trim(),
        customerId: opportunityCustomerSelect.value, // Link to the same customer as the opportunity
        opportunityId: main.currentOpportunityId, // Link to the current opportunity (from main)
        description: quoteDescriptionInput.value.trim(),
        startDate: quoteStartDateInput.value,
        expireDate: quoteExpireDateInput.value,
        status: quoteStatusSelect.value,
        currency: quoteCurrencySelect.value,
        netListAmount: parseFloat(quoteNetListAmountInput.value) || 0,
        netDiscount: parseFloat(quoteNetDiscountInput.value) || 0,
        netAmount: parseFloat(quoteNetAmountInput.value) || 0, // Capture calculated net amount
        isFinal: quoteIsFinalCheckbox.checked,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: main.currentUserId // Use main.currentUserId
    };

    const editingId = quoteForm.dataset.editingId;
    const collectionPath = getOpportunitySubCollectionPath('quotes');
    if (!collectionPath) return;

    try {
        if (editingId) {
            await setDoc(doc(main.db, collectionPath, editingId), quoteData, { merge: true }); // Use main.db
            showModal("Success", "Quote updated successfully!", () => {});
        } else {
            await setDoc(doc(collection(main.db, collectionPath)), quoteData); // Use main.db
            showModal("Success", "Quote added successfully!", () => {});
        }
        resetQuoteForm();
    } catch (error) {
        console.error("opportunities.js: Error saving quote:", error);
        showModal("Error", `Failed to save quote: ${error.message}`, () => {});
    }
}

async function deleteQuote(quoteDocId) {
    if (!main.currentOpportunityId) return; // Use main.currentOpportunityId
    const collectionPath = getOpportunitySubCollectionPath('quotes');
    if (!collectionPath) return;

    showModal("Confirm Deletion", "Are you sure you want to delete this quote?", async () => {
        try {
            await deleteDoc(doc(main.db, collectionPath, quoteDocId)); // Use main.db
            showModal("Success", "Quote deleted successfully!", () => {});
        } catch (error) {
            console.error("opportunities.js: Error deleting quote:", error);
            showModal("Error", `Failed to delete quote: ${error.message}`, () => {});
        }
    });
}

function listenForQuotes() {
    if (unsubscribeQuotes) unsubscribeQuotes();
    if (!main.currentOpportunityId || !main.db) { // Use main.currentOpportunityId, main.db
        if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Select an opportunity to view quotes.</p>';
        return;
    }

    const collectionPath = getOpportunitySubCollectionPath('quotes');
    if (!collectionPath) return;

    const q = collection(main.db, collectionPath); // Use main.db
    unsubscribeQuotes = onSnapshot(q, (snapshot) => {
        if (quoteList) quoteList.innerHTML = '';
        if (snapshot.empty) {
            if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No quotes added for this opportunity.</p>';
            return;
        }
        snapshot.forEach(doc => displayQuote({ id: doc.id, ...doc.data() }));
    }, (error) => {
        console.error("opportunities.js: Error listening to quotes:", error);
        if (quoteList) quoteList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading quotes: ${error.message}</p>`;
    });
    main.addUnsubscribe('opportunityQuotes', unsubscribeQuotes); // Use main.addUnsubscribe
}

function displayQuote(quote) {
    if (!quoteList) return;
    const quoteRow = document.createElement('div');
    quoteRow.className = 'data-grid-row';
    quoteRow.dataset.id = quote.id;

    // Find the currency symbol using the imported helper
    // --- ADDED DEBUG LOGS ---
    console.log("opportunities.js: displayQuote called. quote.currency:", quote.currency);
    console.log("opportunities.js: main.getCurrencySymbol in displayQuote is:", main.getCurrencySymbol);

    // This is the line that was reported to have the error (or similar assignment)
    const currencySymbol = main.getCurrencySymbol(quote.currency); // Use main.getCurrencySymbol

    quoteRow.innerHTML = `
        <div class="px-2 py-1 truncate">${quote.id}</div>
        <div class="px-2 py-1 truncate">${quote.name}</div>
        <div class="px-2 py-1 truncate">${quote.status}</div>
        <div class="px-2 py-1 truncate font-semibold">${quote.netAmount ? `${quote.netAmount.toFixed(2)} ${currencySymbol}` : 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${quote.expireDate || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${quote.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${quote.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    quoteList.appendChild(quoteRow);

    quoteRow.querySelector('.edit-btn').addEventListener('click', () => editQuote(quote));
    quoteRow.querySelector('.delete-btn').addEventListener('click', () => deleteQuote(quote.id));
}

function editQuote(quote) {
    if (!quote) return;
    if (quoteIdDisplayGroup) quoteIdDisplayGroup.classList.remove('hidden');
    if (quoteIdDisplay) quoteIdDisplay.textContent = quote.id;
    if (quoteNameInput) quoteNameInput.value = quote.name || '';
    // Set customer dropdown (should match opportunity's customer)
    if (quoteCustomerSelect) {
        const customer = allCustomers.find(c => c.id === quote.customerId);
        if (customer) {
            quoteCustomerSelect.innerHTML = `<option value="${customer.id}">${customer.customerType === 'Individual' ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : customer.companyName || 'N/A'}</option>`;
            quoteCustomerSelect.value = customer.id;
        }
    }
    if (quoteDescriptionInput) quoteDescriptionInput.value = quote.description || '';
    if (quoteStartDateInput) quoteStartDateInput.value = quote.startDate || '';
    if (quoteExpireDateInput) quoteExpireDateInput.value = quote.expireDate || '';
    if (quoteStatusSelect) quoteStatusSelect.value = quote.status || 'Draft';
    if (quoteCurrencySelect) quoteCurrencySelect.value = quote.currency || '';
    if (quoteNetListAmountInput) quoteNetListAmountInput.value = quote.netListAmount || 0;
    if (quoteNetDiscountInput) quoteNetDiscountInput.value = quote.netDiscount || 0;
    calculateQuoteNetAmount(); // Recalculate net amount
    if (quoteIsFinalCheckbox) quoteIsFinalCheckbox.checked = quote.isFinal || false;
    if (quoteForm) quoteForm.dataset.editingId = quote.id;
    if (submitQuoteButton) submitQuoteButton.textContent = 'Update Quote';
    document.getElementById('quotesAccordionHeader')?.classList.add('active');
    document.getElementById('quotesAccordionHeader')?.nextElementSibling.style.maxHeight = document.getElementById('quotesAccordionHeader')?.nextElementSibling.scrollHeight + "px";
}

function resetQuoteForm() {
    if (quoteForm) quoteForm.reset();
    if (quoteForm) quoteForm.dataset.editingId = '';
    if (quoteIdDisplayGroup) quoteIdDisplayGroup.classList.add('hidden');
    if (quoteIdDisplay) quoteIdDisplay.textContent = '';
    if (quoteNetAmountInput) quoteNetAmountInput.value = '0.00';
    if (submitQuoteButton) submitQuoteButton.textContent = 'Add Quote';
    if (quoteIsFinalCheckbox) quoteIsFinalCheckbox.checked = false;

    // Reset customer dropdown for quote to match the current opportunity's customer
    if (quoteCustomerSelect && main.currentOpportunityId) { // Use main.currentOpportunityId
        const currentOpportunityCustomer = allCustomers.find(c => c.id === opportunityCustomerSelect.value);
        if (currentOpportunityCustomer) {
            quoteCustomerSelect.innerHTML = `<option value="${currentOpportunityCustomer.id}">${currentOpportunityCustomer.customerType === 'Individual' ? `${currentOpportunityCustomer.firstName || ''} ${currentOpportunityCustomer.lastName || ''}`.trim() : currentOpportunityCustomer.companyName || 'N/A'}</option>`;
            quoteCustomerSelect.value = currentOpportunityCustomer.id;
        } else {
            quoteCustomerSelect.innerHTML = '<option value="">Auto-filled from Opportunity</option>';
            quoteCustomerSelect.value = '';
        }
    } else if (quoteCustomerSelect) {
        quoteCustomerSelect.innerHTML = '<option value="">Auto-filled from Opportunity</option>';
        quoteCustomerSelect.value = '';
    }

    // Reset currency for quote to match the current opportunity's currency
    if (quoteCurrencySelect && opportunityCurrencySelect) {
        quoteCurrencySelect.value = opportunityCurrencySelect.value;
    }
}
