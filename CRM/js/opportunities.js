import { auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe, allCustomers, fetchCountryData, fetchCurrencies, allCurrencies, appId as mainAppId, currentOpportunityId, currentEditedOpportunity, setOpportunityLayout } from './main.js';
import { showModal, showMessage, hideMessage } from './utils.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, getDoc, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variable to hold the Firestore DB instance, explicitly set by main.js
let firestoreDb = null;
// Use the projectId exported from main.js directly. This should be the most reliable source.
let projectId = mainAppId;
let opportunitiesDomElementsInitialized = false; // Flag to ensure DOM elements are initialized only once

// EXPORTED: Setter function for the Firestore DB instance
export function setDbInstance(instance) {
    console.log("opportunities.js: setDbInstance received:", instance);
    firestoreDb = instance; // Directly assign for robust assignment
    if (firestoreDb) {
        console.log("opportunities.js: Firestore DB instance successfully set. projectId:", projectId);
    } else {
        console.error("opportunities.js: CRITICAL ERROR: Firestore DB instance is still null after direct assignment. This means the 'instance' passed was null/undefined.");
        projectId = null;
    }
}

// DOM elements for opportunities.js
let opportunitiesSection;
let opportunityViewContainer;
let opportunityLeftPanel;
let opportunityRightPanel;
let opportunityFullFormView;
let opportunityExistingListView;
let opportunityForm;
let opportunityFormTitle;
let opportunityIdDisplayGroup;
let opportunityIdDisplay;
let opportunityCustomerSelect;
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
let opportunityDataInput;
let submitOpportunityButton;
let opportunityList;
let resetOpportunityFormButton;
let linkedObjectsAccordion;
let contactsAccordionHeader;
let contactsAccordionContent;
let linesAccordionHeader;
let linesAccordionContent;
let quotesAccordionHeader;
let quotesAccordionContent;

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
let resetOpportunityContactFormButton;

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
let resetOpportunityLineFormButton;

let quoteForm;
let quoteIdDisplayGroup;
let quoteIdDisplay;
let quoteNameInput;
let quoteDescriptionInput;
let quoteCustomerSelect; // This should be pre-filled to the parent opportunity's customer
let quoteStartDateInput;
let quoteExpireDateInput;
let quoteStatusSelect;
let quoteNetListAmountInput;
let quoteNetDiscountInput;
let quoteNetAmountInput;
let quoteCurrencySelect;
let quoteIsFinalCheckbox;
let submitQuoteButton;
let quoteList;
let resetQuoteFormButton;


/**
 * Initializes DOM elements and static event listeners for opportunities module.
 * This should be called once, defensively.
 */
function initializeOpportunitiesDomElements() {
    if (opportunitiesDomElementsInitialized) return; // Already initialized

    opportunitiesSection = document.getElementById('opportunities-section');
    opportunityViewContainer = document.getElementById('opportunity-view-container');
    opportunityLeftPanel = document.getElementById('opportunity-left-panel');
    opportunityRightPanel = document.getElementById('opportunity-right-panel');
    opportunityFullFormView = document.getElementById('opportunity-full-form-view');
    opportunityExistingListView = document.getElementById('opportunity-existing-list-view');

    opportunityForm = document.getElementById('opportunityForm');
    opportunityFormTitle = document.getElementById('opportunityFormTitle');
    opportunityIdDisplayGroup = document.getElementById('opportunityIdDisplayGroup');
    opportunityIdDisplay = document.getElementById('opportunityIdDisplay');
    opportunityCustomerSelect = document.getElementById('opportunityCustomer');
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
    opportunityDataInput = document.getElementById('opportunityData'); // For JSON data
    submitOpportunityButton = document.getElementById('submitOpportunityButton');
    opportunityList = document.getElementById('opportunityList');
    resetOpportunityFormButton = document.getElementById('resetOpportunityFormButton');
    linkedObjectsAccordion = document.getElementById('linkedObjectsAccordion');
    contactsAccordionHeader = document.getElementById('contactsAccordionHeader');
    contactsAccordionContent = contactsAccordionHeader ? contactsAccordionHeader.nextElementSibling : null;
    linesAccordionHeader = document.getElementById('linesAccordionHeader');
    linesAccordionContent = linesAccordionHeader ? linesAccordionHeader.nextElementSibling : null;
    quotesAccordionHeader = document.getElementById('quotesAccordionHeader');
    quotesAccordionContent = quotesAccordionHeader ? quotesAccordionHeader.nextElementSibling : null;

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
    resetOpportunityContactFormButton = document.getElementById('resetOpportunityContactFormButton');

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
    resetOpportunityLineFormButton = document.getElementById('resetOpportunityLineFormButton');

    quoteForm = document.getElementById('quoteForm');
    quoteIdDisplayGroup = document.getElementById('quoteIdDisplayGroup');
    quoteIdDisplay = document.getElementById('quoteIdDisplay');
    quoteNameInput = document.getElementById('quoteName');
    quoteDescriptionInput = document.getElementById('quoteDescription');
    quoteCustomerSelect = document.getElementById('quoteCustomer'); // This is the new customer select
    quoteStartDateInput = document.getElementById('quoteStartDate');
    quoteExpireDateInput = document.getElementById('quoteExpireDate');
    quoteStatusSelect = document.getElementById('quoteStatus');
    quoteNetListAmountInput = document.getElementById('quoteNetListAmount');
    quoteNetDiscountInput = document.getElementById('quoteNetDiscount');
    quoteNetAmountInput = document.getElementById('quoteNetAmount');
    quoteCurrencySelect = document.getElementById('quoteCurrency');
    quoteIsFinalCheckbox = document.getElementById('quoteIsFinal');
    submitQuoteButton = document.getElementById('submitQuoteButton');
    quoteList = document.getElementById('quoteList');
    resetQuoteFormButton = document.getElementById('resetQuoteFormButton');


    // Add static event listeners
    if (opportunityForm) {
        opportunityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = opportunityForm.dataset.editingId;
            await saveOpportunity(editingId || null);
        });
    }
    if (resetOpportunityFormButton) {
        resetOpportunityFormButton.addEventListener('click', resetOpportunityForm);
    }
    if (opportunityAmountInput && opportunityCurrencySelect) {
        opportunityAmountInput.addEventListener('input', updateCurrencySymbolDisplay);
        opportunityCurrencySelect.addEventListener('change', updateCurrencySymbolDisplay);
    }

    // Opportunity Contact Form Listeners
    if (opportunityContactForm) {
        opportunityContactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = opportunityContactForm.dataset.editingId;
            await saveOpportunityContact(editingId || null);
        });
    }
    if (resetOpportunityContactFormButton) {
        resetOpportunityContactFormButton.addEventListener('click', resetOpportunityContactForm);
    }

    // Opportunity Line Form Listeners
    if (opportunityLineForm) {
        opportunityLineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = opportunityLineForm.dataset.editingId;
            await saveOpportunityLine(editingId || null);
        });
    }
    if (lineUnitPriceInput && lineQuantityInput && lineDiscountInput && lineNetPriceInput) {
        lineUnitPriceInput.addEventListener('input', calculateNetPrice);
        lineQuantityInput.addEventListener('input', calculateNetPrice);
        lineDiscountInput.addEventListener('input', calculateNetPrice);
    }
    if (resetOpportunityLineFormButton) {
        resetOpportunityLineFormButton.addEventListener('click', resetOpportunityLineForm);
    }

    // Quote Form Listeners
    if (quoteForm) {
        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = quoteForm.dataset.editingId;
            await saveQuote(editingId || null);
        });
    }
    if (quoteNetListAmountInput && quoteNetDiscountInput && quoteNetAmountInput) {
        quoteNetListAmountInput.addEventListener('input', calculateQuoteNetAmount);
        quoteNetDiscountInput.addEventListener('input', calculateQuoteNetAmount);
    }
    if (resetQuoteFormButton) {
        resetQuoteFormButton.addEventListener('click', resetQuoteForm);
    }

    opportunitiesDomElementsInitialized = true;
    console.log("opportunities.js: DOM elements and static event listeners initialized.");
}


/**
 * Main initialization function for the Opportunities module.
 */
export async function initOpportunitiesModule() {
    console.log("opportunities.js: initOpportunitiesModule called.");
    initializeOpportunitiesDomElements(); // Ensure DOM elements are ready

    // CRITICAL: Ensure firestoreDb and projectId are available before proceeding
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        console.warn("opportunities.js: Firestore DB, Project ID, or Auth is not ready. Cannot initialize Opportunities module fully.");
        if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing... Waiting for database connection and user authentication.</p>';
        disableOpportunityForm(); // Disable form if not ready
        return;
    }
    enableOpportunityForm(); // Enable form if ready

    // Populate dropdowns that depend on global data
    populateCustomerDropdown();
    populateCurrencyDropdown();

    // Start listening for main opportunity list changes
    listenForOpportunities();
    resetOpportunityForm();
    resetOpportunityContactForm();
    resetOpportunityLineForm();
    resetQuoteForm();
}

function disableOpportunityForm() {
    opportunityForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Auth/DB Not Ready';
}

function enableOpportunityForm() {
    opportunityForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Add Opportunity';
}

function populateCustomerDropdown() {
    if (!opportunityCustomerSelect) return;
    opportunityCustomerSelect.innerHTML = '<option value="">Select Customer</option>';
    if (allCustomers && allCustomers.length > 0) {
        allCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            const customerName = customer.customerType === 'Individual' ? `${customer.firstName} ${customer.lastName}` : customer.companyName;
            option.textContent = customerName;
            opportunityCustomerSelect.appendChild(option);
        });
    }
}

function populateCurrencyDropdown() {
    if (!opportunityCurrencySelect || !quoteCurrencySelect) return;
    opportunityCurrencySelect.innerHTML = '<option value="">Select Currency</option>';
    quoteCurrencySelect.innerHTML = '<option value="">Select Currency</option>';

    if (allCurrencies && allCurrencies.length > 0) {
        allCurrencies.forEach(currency => {
            const opt1 = document.createElement('option');
            opt1.value = currency.id;
            opt1.textContent = `${currency.currencyName} (${currency.symbol})`;
            opportunityCurrencySelect.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = currency.id;
            opt2.textContent = `${currency.currencyName} (${currency.symbol})`;
            quoteCurrencySelect.appendChild(opt2);
        });
    }
    // Set a default currency if available (e.g., USD)
    if (opportunityCurrencySelect.querySelector('option[value="USD"]')) {
        opportunityCurrencySelect.value = 'USD';
        quoteCurrencySelect.value = 'USD';
    }
    updateCurrencySymbolDisplay();
    calculateNetPrice(); // Recalculate line item net price
    calculateQuoteNetAmount(); // Recalculate quote net amount
}

function updateCurrencySymbolDisplay() {
    if (!currencySymbolDisplay || !opportunityCurrencySelect || !allCurrencies) return;
    const selectedCurrencyCode = opportunityCurrencySelect.value;
    const selectedCurrency = allCurrencies.find(c => c.id === selectedCurrencyCode);
    currencySymbolDisplay.textContent = selectedCurrency ? selectedCurrency.symbol : '';
}

function calculateNetPrice() {
    if (!lineUnitPriceInput || !lineQuantityInput || !lineDiscountInput || !lineNetPriceInput) return;
    const unitPrice = parseFloat(lineUnitPriceInput.value) || 0;
    const quantity = parseFloat(lineQuantityInput.value) || 0;
    const discount = parseFloat(lineDiscountInput.value) || 0;

    const listPrice = unitPrice * quantity;
    const netPrice = listPrice - discount;
    lineNetPriceInput.value = netPrice.toFixed(2); // Display with 2 decimal places
}

function calculateQuoteNetAmount() {
    if (!quoteNetListAmountInput || !quoteNetDiscountInput || !quoteNetAmountInput) return;
    const listAmount = parseFloat(quoteNetListAmountInput.value) || 0;
    const discount = parseFloat(quoteNetDiscountInput.value) || 0;
    const netAmount = listAmount - discount;
    quoteNetAmountInput.value = netAmount.toFixed(2);
}

/* --- OPPORTUNITY CRUD OPERATIONS --- */
async function saveOpportunity(opportunityId = null) {
    console.log("opportunities.js: saveOpportunity called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        showModal("Error", "Authentication or Database not ready. Please sign in or wait.", () => {});
        return;
    }

    if (!opportunityCustomerSelect?.value || !opportunityNameInput?.value || !opportunityAmountInput?.value ||
        !opportunityCurrencySelect?.value || !opportunityStageSelect?.value ||
        !opportunityExpectedStartDateInput?.value || !opportunityExpectedCloseDateInput?.value) {
        showMessage('Please fill in all required opportunity fields.', 'error', opportunityForm);
        return;
    }

    submitOpportunityButton.disabled = true;
    submitOpportunityButton.textContent = 'Saving...';
    hideMessage(opportunityForm);

    const isEditing = !!opportunityId;
    let docId = opportunityId;

    const opportunityData = {
        customerId: opportunityCustomerSelect.value,
        name: opportunityNameInput.value,
        amount: parseFloat(opportunityAmountInput.value),
        currency: opportunityCurrencySelect.value,
        stage: opportunityStageSelect.value,
        expectedStartDate: opportunityExpectedStartDateInput.value,
        expectedCloseDate: opportunityExpectedCloseDateInput.value,
        eventType: opportunityEventTypeSelect.value,
        eventLocationProposed: opportunityEventLocationProposedInput.value,
        serviceAddress: opportunityServiceAddressInput.value,
        description: opportunityDescriptionInput.value,
        // Attempt to parse JSON data, fallback to empty object if invalid
        data: (() => {
            try {
                return JSON.parse(opportunityDataInput.value || '{}');
            } catch (e) {
                console.error("opportunities.js: Invalid JSON in opportunityDataInput:", e);
                showMessage('Invalid JSON in "Additional Data" field. Please correct it.', 'error', opportunityForm);
                return {};
            }
        })(),
        lastModified: new Date().toISOString(),
        ownerId: currentUserId, // Set ownerId on creation/update
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        const collectionRef = collection(firestoreDb, `opportunities_data`); // Top-level collection
        if (isEditing) {
            const docRef = doc(collectionRef, docId);
            await setDoc(docRef, opportunityData, { merge: true });
            showMessage('Opportunity updated successfully!', 'success', opportunityForm);
            console.log("opportunities.js: Opportunity updated:", docId, opportunityData);
        } else {
            const newDocRef = await addDoc(collectionRef, opportunityData);
            docId = newDocRef.id;
            showMessage('Opportunity added successfully!', 'success', opportunityForm);
            console.log("opportunities.js: Opportunity added with ID:", docId, opportunityData);
        }
        // If it's a new opportunity or a saved update, reset and potentially re-select
        resetOpportunityForm();
        // If editing, keep the linked objects accordion visible and re-fetch child data
        if (isEditing) {
            currentOpportunityId = docId;
            currentEditedOpportunity = opportunityData;
            linkedObjectsAccordion.classList.remove('hidden');
            setOpportunityLayout('edit_split_70_30'); // Keep split view
            listenForOpportunityContacts(currentOpportunityId);
            listenForOpportunityLines(currentOpportunityId);
            listenForOpportunityQuotes(currentOpportunityId);
        }
    } catch (error) {
        console.error("opportunities.js: Error saving opportunity:", error);
        showMessage(`Error saving opportunity: ${error.message}`, 'error', opportunityForm);
    } finally {
        submitOpportunityButton.disabled = false;
        submitOpportunityButton.textContent = isEditing ? 'Update Opportunity' : 'Add Opportunity';
    }
}

async function editOpportunity(opportunityId) {
    console.log("opportunities.js: editOpportunity called for ID:", opportunityId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        showModal("Error", "Authentication or Database not ready. Please sign in or wait.", () => {});
        return;
    }

    hideMessage(opportunityForm);
    opportunityFormTitle.textContent = "Edit Opportunity";
    submitOpportunityButton.textContent = "Update Opportunity";
    opportunityIdDisplayGroup.classList.remove('hidden');
    opportunityIdDisplay.textContent = opportunityId;
    opportunityForm.dataset.editingId = opportunityId;

    const docRef = doc(firestoreDb, `opportunities_data`, opportunityId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentEditedOpportunity = { id: opportunityId, ...data }; // Store for linked objects
            currentOpportunityId = opportunityId; // Set current opportunity ID

            opportunityCustomerSelect.value = data.customerId || '';
            opportunityNameInput.value = data.name || '';
            opportunityAmountInput.value = data.amount || '';
            opportunityCurrencySelect.value = data.currency || '';
            opportunityStageSelect.value = data.stage || '';
            opportunityExpectedStartDateInput.value = data.expectedStartDate || '';
            opportunityExpectedCloseDateInput.value = data.expectedCloseDate || '';
            opportunityEventTypeSelect.value = data.eventType || '';
            opportunityEventLocationProposedInput.value = data.eventLocationProposed || '';
            opportunityServiceAddressInput.value = data.serviceAddress || '';
            opportunityDescriptionInput.value = data.description || '';
            opportunityDataInput.value = JSON.stringify(data.data || {}, null, 2); // Pretty print JSON

            // Update currency symbol display
            updateCurrencySymbolDisplay();
            // Show linked objects accordion and set layout
            linkedObjectsAccordion.classList.remove('hidden');
            setOpportunityLayout('edit_split_70_30'); // Show split view for editing

            // Load child data (Contacts, Lines, Quotes)
            listenForOpportunityContacts(opportunityId);
            listenForOpportunityLines(opportunityId);
            listenForOpportunityQuotes(opportunityId);

            // Scroll to the top of the form
            opportunityForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } else {
            showMessage('Opportunity not found.', 'error', opportunityForm);
            resetOpportunityForm();
        }
    } catch (error) {
        console.error("opportunities.js: Error loading opportunity for edit:", error);
        showMessage(`Error loading opportunity: ${error.message}`, 'error', opportunityForm);
    }
}

async function deleteOpportunity(opportunityId) {
    console.log("opportunities.js: deleteOpportunity called for ID:", opportunityId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        showModal("Error", "Authentication or Database not ready. Please sign in or wait.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this opportunity and ALL its associated contacts, lines, and quotes? This action cannot be undone.",
        async () => {
            try {
                // Delete subcollections first (Firebase security rules prevent direct cascade delete)
                // This is a simplified client-side cascade. For true production, use Cloud Functions.
                const contactsRef = collection(firestoreDb, `opportunities_data/${opportunityId}/contacts`);
                const contactsSnapshot = await getDocs(contactsRef);
                const deleteContactPromises = contactsSnapshot.docs.map(d => deleteDoc(d.ref));
                await Promise.all(deleteContactPromises);

                const linesRef = collection(firestoreDb, `opportunities_data/${opportunityId}/lines`);
                const linesSnapshot = await getDocs(linesRef);
                const deleteLinePromises = linesSnapshot.docs.map(d => deleteDoc(d.ref));
                await Promise.all(deleteLinePromises);

                const quotesRef = collection(firestoreDb, `opportunities_data/${opportunityId}/quotes`);
                const quotesSnapshot = await getDocs(quotesRef);
                const deleteQuotePromises = quotesSnapshot.docs.map(d => deleteDoc(d.ref));
                await Promise.all(deleteQuotePromises);

                // Then delete the main opportunity document
                const docRef = doc(firestoreDb, `opportunities_data`, opportunityId);
                await deleteDoc(docRef);
                showMessage('Opportunity and its sub-objects deleted successfully!', 'success', opportunityForm);
                resetOpportunityForm();
                console.log("opportunities.js: Opportunity deleted:", opportunityId);
            } catch (error) {
                console.error("opportunities.js: Error deleting opportunity:", error);
                showModal("Error", `Error deleting opportunity: ${error.message}`, () => {});
            }
        }
    );
}

function resetOpportunityForm() {
    if (!opportunityForm) return;
    opportunityForm.reset();
    opportunityFormTitle.textContent = "Add New Opportunity";
    submitOpportunityButton.textContent = "Add Opportunity";
    opportunityIdDisplayGroup.classList.add('hidden');
    opportunityIdDisplay.textContent = '';
    opportunityForm.dataset.editingId = ''; // Clear editing ID
    hideMessage(opportunityForm);
    updateCurrencySymbolDisplay(); // Reset currency symbol display
    linkedObjectsAccordion.classList.add('hidden'); // Hide accordion on new/reset form
    setOpportunityLayout('full_form_and_list'); // Reset layout to full form/list view
    currentOpportunityId = null; // Clear current opportunity context
    currentEditedOpportunity = null; // Clear current opportunity object
    // Also reset child forms and lists
    resetOpportunityContactForm();
    resetOpportunityLineForm();
    resetQuoteForm();
}

function listenForOpportunities() {
    console.log("opportunities.js: listenForOpportunities called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId) {
        console.warn("opportunities.js: listenForOpportunities: Firestore DB or Auth is not ready. Cannot set up listener.");
        if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Waiting for database connection and user authentication...</p>';
        return;
    }

    const opportunitiesColRef = collection(firestoreDb, `opportunities_data`); // Top-level collection
    const q = query(opportunitiesColRef);

    removeUnsubscribe('opportunities'); // Remove previous listener if any
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!opportunityList) return;
        opportunityList.innerHTML = '';
        if (snapshot.empty) {
            opportunityList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No opportunities found.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayOpportunity({ id: doc.id, ...doc.data() });
        });
        console.log("opportunities.js: Opportunities list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to opportunities:", error);
        if (opportunityList) opportunityList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading opportunities: ${error.message}</p>`;
    });

    addUnsubscribe('opportunities', unsubscribe);
}

function displayOpportunity(opportunity) {
    if (!opportunityList) return;
    const opportunityRow = document.createElement('div');
    opportunityRow.className = 'data-grid-row';
    opportunityRow.dataset.id = opportunity.id;

    const customer = allCustomers.find(c => c.id === opportunity.customerId);
    const customerName = customer ? (customer.customerType === 'Individual' ? `${customer.firstName} ${customer.lastName}` : customer.companyName) : 'N/A';
    const currencySymbol = allCurrencies.find(c => c.id === opportunity.currency)?.symbol || opportunity.currency;

    opportunityRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${opportunity.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${opportunity.name || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${customerName || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${currencySymbol} ${opportunity.amount ? opportunity.amount.toFixed(2) : '0.00'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${opportunity.stage || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${opportunity.expectedStartDate || 'N/A'}</div>
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

    opportunityRow.querySelector('.edit-btn').addEventListener('click', () => editOpportunity(opportunity.id));
    opportunityRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunity(opportunity.id));
}


/* --- OPPORTUNITY CONTACT CRUD OPERATIONS --- */
async function saveOpportunityContact(contactId = null) {
    console.log("opportunities.js: saveOpportunityContact called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Opportunity not ready. Please sign in or select an opportunity.", () => {});
        return;
    }

    if (!contactFirstNameInput?.value || !contactLastNameInput?.value || !contactEmailInput?.value || !contactPhoneInput?.value || !contactRoleInput?.value) {
        showMessage('Please fill in all required contact fields.', 'error', opportunityContactForm);
        return;
    }

    submitOpportunityContactButton.disabled = true;
    submitOpportunityContactButton.textContent = 'Saving...';
    hideMessage(opportunityContactForm);

    const isEditing = !!contactId;
    let docId = contactId;

    const contactData = {
        firstName: contactFirstNameInput.value,
        lastName: contactLastNameInput.value,
        email: contactEmailInput.value,
        phone: contactPhoneInput.value,
        role: contactRoleInput.value,
        lastModified: new Date().toISOString(),
        createdBy: currentUserId,
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        const contactsCollectionRef = collection(firestoreDb, `opportunities_data/${currentOpportunityId}/contacts`);
        if (isEditing) {
            const docRef = doc(contactsCollectionRef, docId);
            await setDoc(docRef, contactData, { merge: true });
            showMessage('Contact updated successfully!', 'success', opportunityContactForm);
            console.log("opportunities.js: Opportunity Contact updated:", docId, contactData);
        } else {
            const newDocRef = await addDoc(contactsCollectionRef, contactData);
            docId = newDocRef.id;
            showMessage('Contact added successfully!', 'success', opportunityContactForm);
            console.log("opportunities.js: Opportunity Contact added with ID:", docId, contactData);
        }
        resetOpportunityContactForm();
    } catch (error) {
        console.error("opportunities.js: Error saving opportunity contact:", error);
        showMessage(`Error saving contact: ${error.message}`, 'error', opportunityContactForm);
    } finally {
        submitOpportunityContactButton.disabled = false;
        submitOpportunityContactButton.textContent = isEditing ? 'Update Contact' : 'Add Contact';
    }
}

async function editOpportunityContact(contactId) {
    console.log("opportunities.js: editOpportunityContact called for ID:", contactId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Opportunity not ready. Please sign in or select an opportunity.", () => {});
        return;
    }

    hideMessage(opportunityContactForm);
    opportunityContactForm.querySelector('h4').textContent = "Edit Contact"; // Update title
    submitOpportunityContactButton.textContent = "Update Contact";
    contactIdDisplayGroup.classList.remove('hidden');
    contactIdDisplay.textContent = contactId;
    opportunityContactForm.dataset.editingId = contactId;

    const docRef = doc(firestoreDb, `opportunities_data/${currentOpportunityId}/contacts`, contactId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            contactFirstNameInput.value = data.firstName || '';
            contactLastNameInput.value = data.lastName || '';
            contactEmailInput.value = data.email || '';
            contactPhoneInput.value = data.phone || '';
            contactRoleInput.value = data.role || '';
        } else {
            showMessage('Contact not found.', 'error', opportunityContactForm);
            resetOpportunityContactForm();
        }
    } catch (error) {
        console.error("opportunities.js: Error loading contact for edit:", error);
        showMessage(`Error loading contact: ${error.message}`, 'error', opportunityContactForm);
    }
}

async function deleteOpportunityContact(contactId) {
    console.log("opportunities.js: deleteOpportunityContact called for ID:", contactId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Opportunity not ready. Please sign in or select an opportunity.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this contact? This action cannot be undone.",
        async () => {
            try {
                const docRef = doc(firestoreDb, `opportunities_data/${currentOpportunityId}/contacts`, contactId);
                await deleteDoc(docRef);
                showMessage('Contact deleted successfully!', 'success', opportunityContactForm);
                resetOpportunityContactForm();
                console.log("opportunities.js: Contact deleted:", contactId);
            } catch (error) {
                console.error("opportunities.js: Error deleting contact:", error);
                showModal("Error", `Error deleting contact: ${error.message}`, () => {});
            }
        }
    );
}

function resetOpportunityContactForm() {
    if (!opportunityContactForm) return;
    opportunityContactForm.reset();
    opportunityContactForm.querySelector('h4').textContent = "Add New Contact";
    submitOpportunityContactButton.textContent = "Add Contact";
    contactIdDisplayGroup.classList.add('hidden');
    contactIdDisplay.textContent = '';
    opportunityContactForm.dataset.editingId = '';
    hideMessage(opportunityContactForm);
}

function listenForOpportunityContacts(opportunityId) {
    console.log("opportunities.js: listenForOpportunityContacts called for ID:", opportunityId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !opportunityId) {
        console.warn("opportunities.js: listenForOpportunityContacts: Firestore DB, Project ID, or Opportunity ID not ready. Cannot set up listener.");
        if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No contacts available.</p>';
        return;
    }

    const contactsColRef = collection(firestoreDb, `opportunities_data/${opportunityId}/contacts`);
    const q = query(contactsColRef);

    removeUnsubscribe('opportunityContacts'); // Unsubscribe previous listener for this specific opportunity
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!opportunityContactList) return;
        opportunityContactList.innerHTML = '';
        if (snapshot.empty) {
            opportunityContactList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No contacts found for this opportunity.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayOpportunityContact({ id: doc.id, ...doc.data() });
        });
        console.log("opportunities.js: Opportunity Contacts list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to opportunity contacts:", error);
        if (opportunityContactList) opportunityContactList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading contacts: ${error.message}</p>`;
    });

    addUnsubscribe('opportunityContacts', unsubscribe);
}

function displayOpportunityContact(contact) {
    if (!opportunityContactList) return;
    const contactRow = document.createElement('div');
    contactRow.className = 'data-grid-row';
    contactRow.dataset.id = contact.id;

    contactRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${contact.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${contact.firstName || 'N/A'} ${contact.lastName || ''}</div>
        <div class="px-2 py-1 truncate">${contact.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${contact.phone || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${contact.role || 'N/A'}</div>
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

    contactRow.querySelector('.edit-btn').addEventListener('click', () => editOpportunityContact(contact.id));
    contactRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunityContact(contact.id));
}


/* --- OPPORTUNITY LINE ITEM CRUD OPERATIONS --- */
async function saveOpportunityLine(lineId = null) {
    console.log("opportunities.js: saveOpportunityLine called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Opportunity not ready. Please sign in or select an opportunity.", () => {});
        return;
    }

    if (!lineServiceDescriptionInput?.value || !lineUnitPriceInput?.value || !lineQuantityInput?.value || !lineDiscountInput?.value || !lineNetPriceInput?.value || !lineStatusSelect?.value) {
        showMessage('Please fill in all required line item fields.', 'error', opportunityLineForm);
        return;
    }

    submitOpportunityLineButton.disabled = true;
    submitOpportunityLineButton.textContent = 'Saving...';
    hideMessage(opportunityLineForm);

    const isEditing = !!lineId;
    let docId = lineId;

    const lineData = {
        serviceDescription: lineServiceDescriptionInput.value,
        unitPrice: parseFloat(lineUnitPriceInput.value),
        quantity: parseInt(lineQuantityInput.value),
        discount: parseFloat(lineDiscountInput.value),
        netPrice: parseFloat(lineNetPriceInput.value),
        status: lineStatusSelect.value,
        lastModified: new Date().toISOString(),
        createdBy: currentUserId,
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        const linesCollectionRef = collection(firestoreDb, `opportunities_data/${currentOpportunityId}/lines`);
        if (isEditing) {
            const docRef = doc(linesCollectionRef, docId);
            await setDoc(docRef, lineData, { merge: true });
            showMessage('Line item updated successfully!', 'success', opportunityLineForm);
            console.log("opportunities.js: Opportunity Line updated:", docId, lineData);
        } else {
            const newDocRef = await addDoc(linesCollectionRef, lineData);
            docId = newDocRef.id;
            showMessage('Line item added successfully!', 'success', opportunityLineForm);
            console.log("opportunities.js: Opportunity Line added with ID:", docId, lineData);
        }
        resetOpportunityLineForm();
    } catch (error) {
        console.error("opportunities.js: Error saving opportunity line item:", error);
        showMessage(`Error saving line item: ${error.message}`, 'error', opportunityLineForm);
    } finally {
        submitOpportunityLineButton.disabled = false;
        submitOpportunityLineButton.textContent = isEditing ? 'Update Line Item' : 'Add Line Item';
    }
}

async function editOpportunityLine(lineId) {
    console.log("opportunities.js: editOpportunityLine called for ID:", lineId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Opportunity not ready. Please sign in or select an opportunity.", () => {});
        return;
    }

    hideMessage(opportunityLineForm);
    opportunityLineForm.querySelector('h4').textContent = "Edit Line Item";
    submitOpportunityLineButton.textContent = "Update Line Item";
    optyLineIdDisplayGroup.classList.remove('hidden');
    optyLineIdDisplay.textContent = lineId;
    opportunityLineForm.dataset.editingId = lineId;

    const docRef = doc(firestoreDb, `opportunities_data/${currentOpportunityId}/lines`, lineId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            lineServiceDescriptionInput.value = data.serviceDescription || '';
            lineUnitPriceInput.value = data.unitPrice || '';
            lineQuantityInput.value = data.quantity || '';
            lineDiscountInput.value = data.discount || '';
            lineNetPriceInput.value = data.netPrice || '';
            lineStatusSelect.value = data.status || '';
            calculateNetPrice(); // Recalculate just in case fields were manually edited
        } else {
            showMessage('Line item not found.', 'error', opportunityLineForm);
            resetOpportunityLineForm();
        }
    } catch (error) {
        console.error("opportunities.js: Error loading line item for edit:", error);
        showMessage(`Error loading line item: ${error.message}`, 'error', opportunityLineForm);
    }
}

async function deleteOpportunityLine(lineId) {
    console.log("opportunities.js: deleteOpportunityLine called for ID:", lineId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Opportunity not ready. Please sign in or select an opportunity.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this line item? This action cannot be undone.",
        async () => {
            try {
                const docRef = doc(firestoreDb, `opportunities_data/${currentOpportunityId}/lines`, lineId);
                await deleteDoc(docRef);
                showMessage('Line item deleted successfully!', 'success', opportunityLineForm);
                resetOpportunityLineForm();
                console.log("opportunities.js: Line item deleted:", lineId);
            } catch (error) {
                console.error("opportunities.js: Error deleting line item:", error);
                showModal("Error", `Error deleting line item: ${error.message}`, () => {});
            }
        }
    );
}

function resetOpportunityLineForm() {
    if (!opportunityLineForm) return;
    opportunityLineForm.reset();
    opportunityLineForm.querySelector('h4').textContent = "Add New Line Item";
    submitOpportunityLineButton.textContent = "Add Line Item";
    optyLineIdDisplayGroup.classList.add('hidden');
    optyLineIdDisplay.textContent = '';
    opportunityLineForm.dataset.editingId = '';
    hideMessage(opportunityLineForm);
    calculateNetPrice(); // Ensure net price calculation is triggered on reset
}

function listenForOpportunityLines(opportunityId) {
    console.log("opportunities.js: listenForOpportunityLines called for ID:", opportunityId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !opportunityId) {
        console.warn("opportunities.js: listenForOpportunityLines: Firestore DB, Project ID, or Opportunity ID not ready. Cannot set up listener.");
        if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No line items available.</p>';
        return;
    }

    const linesColRef = collection(firestoreDb, `opportunities_data/${opportunityId}/lines`);
    const q = query(linesColRef);

    removeUnsubscribe('opportunityLines');
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!opportunityLineList) return;
        opportunityLineList.innerHTML = '';
        if (snapshot.empty) {
            opportunityLineList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No line items found for this opportunity.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayOpportunityLine({ id: doc.id, ...doc.data() });
        });
        console.log("opportunities.js: Opportunity Lines list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to opportunity lines:", error);
        if (opportunityLineList) opportunityLineList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading line items: ${error.message}</p>`;
    });

    addUnsubscribe('opportunityLines', unsubscribe);
}

function displayOpportunityLine(line) {
    if (!opportunityLineList) return;
    const lineRow = document.createElement('div');
    lineRow.className = 'data-grid-row';
    lineRow.dataset.id = line.id;

    lineRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${line.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${line.serviceDescription || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${line.unitPrice ? line.unitPrice.toFixed(2) : '0.00'}</div>
        <div class="px-2 py-1 truncate">${line.quantity || '0'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${line.discount ? line.discount.toFixed(2) : '0.00'}</div>
        <div class="px-2 py-1 truncate">${line.netPrice ? line.netPrice.toFixed(2) : '0.00'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${line.status || 'N/A'}</div>
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

    lineRow.querySelector('.edit-btn').addEventListener('click', () => editOpportunityLine(line.id));
    lineRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunityLine(line.id));
}


/* --- QUOTE CRUD OPERATIONS --- */
async function saveQuote(quoteId = null) {
    console.log("opportunities.js: saveQuote called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !currentOpportunityId || !currentEditedOpportunity) {
        showModal("Error", "Authentication, Database, or Opportunity not ready. Please sign in or select an opportunity.", () => {});
        return;
    }

    if (!quoteNameInput?.value || !quoteDescriptionInput?.value || !quoteStartDateInput?.value ||
        !quoteExpireDateInput?.value || !quoteStatusSelect?.value ||
        !quoteNetListAmountInput?.value || !quoteNetDiscountInput?.value || !quoteNetAmountInput?.value || !quoteCurrencySelect?.value) {
        showMessage('Please fill in all required quote fields.', 'error', quoteForm);
        return;
    }

    submitQuoteButton.disabled = true;
    submitQuoteButton.textContent = 'Saving...';
    hideMessage(quoteForm);

    const isEditing = !!quoteId;
    let docId = quoteId;

    const quoteData = {
        name: quoteNameInput.value,
        description: quoteDescriptionInput.value,
        // Quote customer should inherit from the parent opportunity's customer
        customerId: currentEditedOpportunity.customerId,
        opportunityId: currentOpportunityId,
        startDate: quoteStartDateInput.value,
        expireDate: quoteExpireDateInput.value,
        status: quoteStatusSelect.value,
        netListAmount: parseFloat(quoteNetListAmountInput.value),
        netDiscount: parseFloat(quoteNetDiscountInput.value),
        netAmount: parseFloat(quoteNetAmountInput.value),
        currency: quoteCurrencySelect.value,
        isFinal: quoteIsFinalCheckbox.checked,
        lastModified: new Date().toISOString(),
        createdBy: currentUserId,
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        const quotesCollectionRef = collection(firestoreDb, `opportunities_data/${currentOpportunityId}/quotes`);
        if (isEditing) {
            const docRef = doc(quotesCollectionRef, docId);
            await setDoc(docRef, quoteData, { merge: true });
            showMessage('Quote updated successfully!', 'success', quoteForm);
            console.log("opportunities.js: Opportunity Quote updated:", docId, quoteData);
        } else {
            const newDocRef = await addDoc(quotesCollectionRef, quoteData);
            docId = newDocRef.id;
            showMessage('Quote added successfully!', 'success', quoteForm);
            console.log("opportunities.js: Opportunity Quote added with ID:", docId, quoteData);
        }
        resetQuoteForm();
    } catch (error) {
        console.error("opportunities.js: Error saving opportunity quote:", error);
        showMessage(`Error saving quote: ${error.message}`, 'error', quoteForm);
    } finally {
        submitQuoteButton.disabled = false;
        submitQuoteButton.textContent = isEditing ? 'Update Quote' : 'Add Quote';
    }
}

async function editQuote(quoteId) {
    console.log("opportunities.js: editQuote called for ID:", quoteId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !currentOpportunityId || !currentEditedOpportunity) {
        showModal("Error", "Authentication, Database, or Opportunity not ready. Please sign in or select an opportunity.", () => {});
        return;
    }

    hideMessage(quoteForm);
    quoteForm.querySelector('h4').textContent = "Edit Quote";
    submitQuoteButton.textContent = "Update Quote";
    quoteIdDisplayGroup.classList.remove('hidden');
    quoteIdDisplay.textContent = quoteId;
    quoteForm.dataset.editingId = quoteId;

    const docRef = doc(firestoreDb, `opportunities_data/${currentOpportunityId}/quotes`, quoteId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            quoteNameInput.value = data.name || '';
            quoteDescriptionInput.value = data.description || '';
            // For quoteCustomerSelect, pre-select the opportunity's customer.
            // This dropdown should be disabled if it's tied to an opportunity.
            // Assuming it's already populated by populateCustomerDropdown at opportunity module init.
            quoteCustomerSelect.value = data.customerId || '';
            quoteStartDateInput.value = data.startDate || '';
            quoteExpireDateInput.value = data.expireDate || '';
            quoteStatusSelect.value = data.status || '';
            quoteNetListAmountInput.value = data.netListAmount || '';
            quoteNetDiscountInput.value = data.netDiscount || '';
            quoteNetAmountInput.value = data.netAmount || '';
            quoteCurrencySelect.value = data.currency || '';
            quoteIsFinalCheckbox.checked = data.isFinal || false;
            calculateQuoteNetAmount(); // Recalculate just in case
        } else {
            showMessage('Quote not found.', 'error', quoteForm);
            resetQuoteForm();
        }
    } catch (error) {
        console.error("opportunities.js: Error loading quote for edit:", error);
        showMessage(`Error loading quote: ${error.message}`, 'error', quoteForm);
    }
}

async function deleteQuote(quoteId) {
    console.log("opportunities.js: deleteQuote called for ID:", quoteId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Opportunity not ready. Please sign in or select an opportunity.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this quote? This action cannot be undone.",
        async () => {
            try {
                const docRef = doc(firestoreDb, `opportunities_data/${currentOpportunityId}/quotes`, quoteId);
                await deleteDoc(docRef);
                showMessage('Quote deleted successfully!', 'success', quoteForm);
                resetQuoteForm();
                console.log("opportunities.js: Quote deleted:", quoteId);
            } catch (error) {
                console.error("opportunities.js: Error deleting quote:", error);
                showModal("Error", `Error deleting quote: ${error.message}`, () => {});
            }
        }
    );
}

function resetQuoteForm() {
    if (!quoteForm) return;
    quoteForm.reset();
    quoteForm.querySelector('h4').textContent = "Add New Quote";
    submitQuoteButton.textContent = "Add Quote";
    quoteIdDisplayGroup.classList.add('hidden');
    quoteIdDisplay.textContent = '';
    quoteForm.dataset.editingId = '';
    hideMessage(quoteForm);
    calculateQuoteNetAmount(); // Ensure calculation is triggered
    if (currentEditedOpportunity) {
        // Pre-fill customer dropdown if an opportunity is currently selected
        quoteCustomerSelect.value = currentEditedOpportunity.customerId || '';
    }
}

function listenForOpportunityQuotes(opportunityId) {
    console.log("opportunities.js: listenForOpportunityQuotes called for ID:", opportunityId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !opportunityId) {
        console.warn("opportunities.js: listenForOpportunityQuotes: Firestore DB, Project ID, or Opportunity ID not ready. Cannot set up listener.");
        if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No quotes available.</p>';
        return;
    }

    const quotesColRef = collection(firestoreDb, `opportunities_data/${opportunityId}/quotes`);
    const q = query(quotesColRef);

    removeUnsubscribe('opportunityQuotes');
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!quoteList) return;
        quoteList.innerHTML = '';
        if (snapshot.empty) {
            quoteList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No quotes found for this opportunity.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayQuote({ id: doc.id, ...doc.data() });
        });
        console.log("opportunities.js: Opportunity Quotes list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to opportunity quotes:", error);
        if (quoteList) quoteList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading quotes: ${error.message}</p>`;
    });

    addUnsubscribe('opportunityQuotes', unsubscribe);
}

function displayQuote(quote) {
    if (!quoteList) return;
    const quoteRow = document.createElement('div');
    quoteRow.className = 'data-grid-row';
    quoteRow.dataset.id = quote.id;

    // Get customer name for display
    const customer = allCustomers.find(c => c.id === quote.customerId);
    const customerName = customer ? (customer.customerType === 'Individual' ? `${customer.firstName} ${customer.lastName}` : customer.companyName) : 'N/A';
    const currencySymbol = allCurrencies.find(c => c.id === quote.currency)?.symbol || quote.currency;

    quoteRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${quote.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${quote.name || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${customerName || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${quote.status || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${currencySymbol} ${quote.netAmount ? quote.netAmount.toFixed(2) : '0.00'}</div>
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

    quoteRow.querySelector('.edit-btn').addEventListener('click', () => editQuote(quote.id));
    quoteRow.querySelector('.delete-btn').addEventListener('click', () => deleteQuote(quote.id));
}
