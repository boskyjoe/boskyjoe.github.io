import { db, auth, currentUserId, isAdmin, isAuthReady, currentOpportunityId, currentEditedOpportunity, addUnsubscribe, removeUnsubscribe, allCustomers, appCountries, appCountryStateMap, allCurrencies, getCurrencySymbol, getCurrencyName, currentCustomerCollectionType } from './main.js';
import { showModal, showMessage, hideMessage, APP_SETTINGS_DOC_ID } from './utils.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, getDoc, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variable to hold the Firestore DB instance, explicitly set by main.js
let firestoreDb = null;
let opportunitiesDomElementsInitialized = false; // Flag to ensure DOM elements are initialized only once

// EXPORTED: Setter function for the Firestore DB instance
export function setDbInstance(instance) {
    console.log("opportunities.js: setDbInstance received:", instance);
    firestoreDb = instance; // Directly assign for robust assignment
    if (firestoreDb) {
        console.log("opportunities.js: Firestore DB instance successfully set.");
    } else {
        console.error("opportunities.js: CRITICAL ERROR: Firestore DB instance is still null after direct assignment. This means the 'instance' passed was null/undefined.");
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

let quoteForm;
let quoteIdDisplayGroup;
let quoteIdDisplay;
let quoteNameInput;
let quoteDescriptionInput;
let quoteCustomerSelect;
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
    opportunityDataInput = document.getElementById('opportunityData');
    submitOpportunityButton = document.getElementById('submitOpportunityButton');
    opportunityList = document.getElementById('opportunityList');
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
    quoteDescriptionInput = document.getElementById('quoteDescription');
    quoteCustomerSelect = document.getElementById('quoteCustomer');
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

    // Add event listeners that don't depend on Firebase state
    if (opportunityForm) {
        opportunityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveOpportunity();
        });
        document.getElementById('resetOpportunityFormButton')?.addEventListener('click', resetOpportunityForm);
        opportunityAmountInput?.addEventListener('input', updateCurrencySymbol);
        opportunityCurrencySelect?.addEventListener('change', updateCurrencySymbol);
    }
    if (opportunityContactForm) {
        opportunityContactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const contactId = opportunityContactForm.dataset.editingId;
            await saveOpportunityContact(contactId);
        });
        document.getElementById('resetOpportunityContactFormButton')?.addEventListener('click', resetOpportunityContactForm);
    }
    if (opportunityLineForm) {
        opportunityLineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const lineId = opportunityLineForm.dataset.editingId;
            await saveOpportunityLine(lineId);
        });
        document.getElementById('resetOpportunityLineFormButton')?.addEventListener('click', resetOpportunityLineForm);
        lineUnitPriceInput?.addEventListener('input', calculateNetPrice);
        lineQuantityInput?.addEventListener('input', calculateNetPrice);
        lineDiscountInput?.addEventListener('input', calculateNetPrice);
    }
    if (quoteForm) {
        quoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const quoteId = quoteForm.dataset.editingId;
            await saveQuote(quoteId);
        });
        document.getElementById('resetQuoteFormButton')?.addEventListener('click', resetQuoteForm);
        quoteNetListAmountInput?.addEventListener('input', calculateQuoteNetAmount);
        quoteNetDiscountInput?.addEventListener('input', calculateQuoteNetAmount);
    }

    if (contactsAccordionHeader) contactsAccordionHeader.addEventListener('click', () => toggleAccordion(contactsAccordionHeader, contactsAccordionContent));
    if (linesAccordionHeader) linesAccordionHeader.addEventListener('click', () => toggleAccordion(linesAccordionHeader, linesAccordionContent));
    if (quotesAccordionHeader) quotesAccordionHeader.addEventListener('click', () => toggleAccordion(quotesAccordionHeader, quotesAccordionContent));

    opportunitiesDomElementsInitialized = true;
    console.log("opportunities.js: DOM elements and static event listeners initialized.");
}


/**
 * Main initialization function for the Opportunities module.
 */
export async function initOpportunitiesModule() {
    console.log("opportunities.js: initOpportunitiesModule called.");
    initializeOpportunitiesDomElements(); // Ensure DOM elements are ready

    // CRITICAL: Ensure firestoreDb is available before proceeding
    if (!firestoreDb || !isAuthReady || !currentUserId) {
        console.warn("opportunities.js: Firestore DB or Auth is not ready. Cannot initialize Opportunities module fully.");
        if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing... Waiting for database connection and user authentication.</p>';
        disableOpportunityForms(); // Disable all forms if not ready
        return;
    }
    enableOpportunityForms(); // Enable forms if ready

    // Populate dropdowns with data from main.js (which should have fetched it)
    populateCustomerDropdown();
    populateCurrencyDropdown();

    listenForOpportunities(); // Start listening for opportunities list changes

    resetOpportunityForm(); // Reset forms to initial state
    resetOpportunityContactForm();
    resetOpportunityLineForm();
    resetQuoteForm();

    // Set initial layout
    setOpportunityLayout('full_form_and_list');
}

function disableOpportunityForms() {
    opportunityForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    opportunityContactForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    opportunityLineForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    quoteForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Auth/DB Not Ready';
    if (submitOpportunityContactButton) submitOpportunityContactButton.textContent = 'Auth/DB Not Ready';
    if (submitOpportunityLineButton) submitOpportunityLineButton.textContent = 'Auth/DB Not Ready';
    if (submitQuoteButton) submitQuoteButton.textContent = 'Auth/DB Not Ready';
}

function enableOpportunityForms() {
    opportunityForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    opportunityContactForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    opportunityLineForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    quoteForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Add Opportunity';
    if (submitOpportunityContactButton) submitOpportunityContactButton.textContent = 'Add Contact';
    if (submitOpportunityLineButton) submitOpportunityLineButton.textContent = 'Add Line';
    if (submitQuoteButton) submitQuoteButton.textContent = 'Add Quote';
}


function populateCustomerDropdown() {
    if (!opportunityCustomerSelect) return;
    opportunityCustomerSelect.innerHTML = '<option value="">Select Customer</option>';
    if (allCustomers && allCustomers.length > 0) {
        allCustomers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customer.customerType === 'Individual' ? `${customer.firstName} ${customer.lastName}` : customer.companyName;
            opportunityCustomerSelect.appendChild(option);
        });
    }
}

function populateCurrencyDropdown() {
    if (!opportunityCurrencySelect || !quoteCurrencySelect) return;
    const initialOpportunityCurrencyValue = opportunityCurrencySelect.value;
    const initialQuoteCurrencyValue = quoteCurrencySelect.value;

    opportunityCurrencySelect.innerHTML = '<option value="">Select Currency</option>';
    quoteCurrencySelect.innerHTML = '<option value="">Select Currency</option>';

    if (allCurrencies && allCurrencies.length > 0) {
        allCurrencies.forEach(currency => {
            const opt1 = document.createElement('option');
            opt1.value = currency.id; // Currency code as value
            opt1.textContent = `${currency.currencyName} (${currency.symbol})`;
            opportunityCurrencySelect.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = currency.id;
            opt2.textContent = `${currency.currencyName} (${currency.symbol})`;
            quoteCurrencySelect.appendChild(opt2);
        });
    }
    // Restore selection if value existed
    if (initialOpportunityCurrencyValue && opportunityCurrencySelect.querySelector(`option[value="${initialOpportunityCurrencyValue}"]`)) {
        opportunityCurrencySelect.value = initialOpportunityCurrencyValue;
    }
    if (initialQuoteCurrencyValue && quoteCurrencySelect.querySelector(`option[value="${initialQuoteCurrencyValue}"]`)) {
        quoteCurrencySelect.value = initialQuoteCurrencyValue;
    }
    updateCurrencySymbol(); // Update symbol based on current selection
}

function updateCurrencySymbol() {
    if (!currencySymbolDisplay || !opportunityCurrencySelect) return;
    const selectedCurrencyCode = opportunityCurrencySelect.value;
    const symbol = getCurrencySymbol(selectedCurrencyCode);
    currencySymbolDisplay.textContent = symbol;
}


function toggleAccordion(header, content) {
    if (!header || !content) return;
    header.classList.toggle('active');
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

// Function to control the layout of the opportunity section (re-exported for direct use in this module if needed)
export function setOpportunityLayout(layoutType) {
    // This function is already defined in main.js, we re-export it here
    // for internal consistency. Ensure the original in main.js is robust.
    if (!opportunityFullFormView || !opportunityExistingListView || !opportunityLeftPanel || !opportunityRightPanel) {
        console.warn("opportunities.js: Opportunity layout elements not found. Cannot set layout.");
        return;
    }

    opportunityFullFormView.classList.add('hidden');
    opportunityExistingListView.classList.add('hidden');
    opportunityLeftPanel.classList.remove('md:w-full', 'md:w-7/10', 'md:w-3/10', 'shrink-left');
    opportunityRightPanel.classList.remove('md:w-full', 'md:w-7/10', 'md:w-3/10', 'expand-right', 'hidden-panel');

    switch (layoutType) {
        case 'full_form_and_list':
            opportunityFullFormView.classList.remove('hidden');
            opportunityExistingListView.classList.remove('hidden');
            opportunityLeftPanel.classList.add('md:w-full');
            opportunityRightPanel.classList.add('hidden-panel');
            if (linkedObjectsAccordion) linkedObjectsAccordion.classList.add('hidden');
            break;
        case 'edit_split_70_30':
            opportunityFullFormView.classList.remove('hidden');
            opportunityExistingListView.classList.remove('hidden');
            opportunityLeftPanel.classList.add('md:w-7/10');
            opportunityRightPanel.classList.remove('hidden-panel');
            opportunityRightPanel.classList.add('md:w-3/10');
            if (linkedObjectsAccordion) linkedObjectsAccordion.classList.remove('hidden');
            break;
        case 'edit_split_30_70':
            opportunityFullFormView.classList.remove('hidden');
            opportunityExistingListView.classList.remove('hidden');
            opportunityLeftPanel.classList.add('shrink-left');
            opportunityRightPanel.classList.remove('hidden-panel');
            opportunityRightPanel.classList.add('expand-right');
            if (linkedObjectsAccordion) linkedObjectsAccordion.classList.remove('hidden');
            break;
        default:
            console.error("opportunities.js: Unknown opportunity layout type:", layoutType);
            break;
    }
}


/* --- OPPORTUNITY CRUD OPERATIONS --- */
async function saveOpportunity() {
    if (!firestoreDb || !isAuthReady || !currentUserId) {
        showModal("Error", "Authentication or Database not ready. Please sign in or wait.", () => {});
        return;
    }
    if (!opportunityCustomerSelect?.value || !opportunityNameInput?.value || !opportunityAmountInput?.value ||
        !opportunityCurrencySelect?.value || !opportunityStageSelect?.value || !opportunityExpectedStartDateInput?.value ||
        !opportunityExpectedCloseDateInput?.value || !opportunityEventTypeSelect?.value || !opportunityEventLocationProposedInput?.value || !opportunityServiceAddressInput?.value) {
        showMessage('Please fill in all required opportunity fields.', 'error', opportunityForm);
        return;
    }

    submitOpportunityButton.disabled = true;
    submitOpportunityButton.textContent = 'Saving...';
    hideMessage(opportunityForm);

    const isEditing = !!currentOpportunityId;
    let opportunityDocId = currentOpportunityId;

    let parsedOpportunityData = opportunityDataInput.value.trim();
    try {
        if (parsedOpportunityData) {
            parsedOpportunityData = JSON.parse(parsedOpportunityData);
        } else {
            parsedOpportunityData = {}; // Default to empty object if nothing entered
        }
    } catch (e) {
        console.warn("opportunities.js: Invalid JSON in 'Additional Opportunity Data'. Saving as plain text.", e);
        // Keep parsedOpportunityData as the original string if it's invalid JSON
    }

    const opportunityData = {
        customerId: opportunityCustomerSelect.value,
        opportunityName: opportunityNameInput.value,
        amount: parseFloat(opportunityAmountInput.value),
        currency: opportunityCurrencySelect.value,
        stage: opportunityStageSelect.value,
        expectedStartDate: opportunityExpectedStartDateInput.value,
        expectedCloseDate: opportunityExpectedCloseDateInput.value,
        eventType: opportunityEventTypeSelect.value,
        eventLocationProposed: opportunityEventLocationProposed.value,
        serviceAddress: opportunityServiceAddressInput.value,
        description: opportunityDescriptionInput.value,
        additionalData: parsedOpportunityData, // Saved as object or string
        lastModified: new Date().toISOString(),
        createdBy: currentUserId,
        // Ensure creationDate is only set on initial creation
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        if (isEditing) {
            const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunities`, opportunityDocId); // Use firestoreDb
            await setDoc(docRef, opportunityData, { merge: true });
            showMessage('Opportunity updated successfully!', 'success', opportunityForm);
            console.log("opportunities.js: Opportunity updated:", opportunityDocId, opportunityData);
        } else {
            const docRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunities`); // Use firestoreDb
            const newDocRef = await addDoc(docRef, opportunityData);
            opportunityDocId = newDocRef.id; // Get the ID of the newly added document
            showMessage('Opportunity added successfully!', 'success', opportunityForm);
            console.log("opportunities.js: Opportunity added with ID:", opportunityDocId, opportunityData);
        }
        resetOpportunityForm();
        // After saving/updating, switch to split view and load related objects
        loadOpportunityForEdit(opportunityDocId);

    } catch (error) {
        console.error("opportunities.js: Error saving opportunity:", error);
        showMessage(`Error saving opportunity: ${error.message}`, 'error', opportunityForm);
    } finally {
        submitOpportunityButton.disabled = false;
        submitOpportunityButton.textContent = isEditing ? 'Update Opportunity' : 'Add Opportunity';
    }
}

async function loadOpportunityForEdit(opportunityId) {
    if (!firestoreDb || !isAuthReady || !currentUserId) {
        showModal("Error", "Authentication or Database not ready. Please sign in or wait.", () => {});
        return;
    }
    if (!opportunityId) return;

    hideMessage(opportunityForm); // Clear any previous form messages
    opportunityFormTitle.textContent = "Edit Opportunity";
    submitOpportunityButton.textContent = "Update Opportunity";
    currentOpportunityId = opportunityId; // Set the global editing ID

    const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunities`, opportunityId); // Use firestoreDb
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            currentEditedOpportunity = { id: docSnap.id, ...docSnap.data() };
            // Populate form fields
            opportunityIdDisplayGroup.classList.remove('hidden');
            opportunityIdDisplay.textContent = currentEditedOpportunity.id;
            opportunityCustomerSelect.value = currentEditedOpportunity.customerId;
            opportunityNameInput.value = currentEditedOpportunity.opportunityName;
            opportunityAmountInput.value = currentEditedOpportunity.amount;
            opportunityCurrencySelect.value = currentEditedOpportunity.currency;
            opportunityStageSelect.value = currentEditedOpportunity.stage;
            opportunityExpectedStartDateInput.value = currentEditedOpportunity.expectedStartDate;
            opportunityExpectedCloseDateInput.value = currentEditedOpportunity.expectedCloseDate;
            opportunityEventTypeSelect.value = currentEditedOpportunity.eventType;
            opportunityEventLocationProposedInput.value = currentEditedOpportunity.eventLocationProposed;
            opportunityServiceAddressInput.value = currentEditedOpportunity.serviceAddress;
            opportunityDescriptionInput.value = currentEditedOpportunity.description;

            // Handle additionalData - convert object back to JSON string for textarea
            if (typeof currentEditedOpportunity.additionalData === 'object' && currentEditedOpportunity.additionalData !== null) {
                opportunityDataInput.value = JSON.stringify(currentEditedOpportunity.additionalData, null, 2);
            } else {
                opportunityDataInput.value = currentEditedOpportunity.additionalData || ''; // Keep as string if not an object
            }

            updateCurrencySymbol(); // Update symbol for the loaded currency
            setOpportunityLayout('edit_split_70_30'); // Switch to split view

            // Load related data for contacts, lines, quotes
            listenForOpportunityContacts(opportunityId);
            listenForOpportunityLines(opportunityId);
            listenForQuotes(opportunityId);
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
    if (!firestoreDb || !isAuthReady || !currentUserId) {
        showModal("Error", "Authentication or Database not ready. Please sign in or wait.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this opportunity? This will also delete all associated contacts, lines, and quotes.",
        async () => {
            try {
                // Delete main opportunity document
                const opportunityDocRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunities`, opportunityId); // Use firestoreDb
                await deleteDoc(opportunityDocRef);

                // Delete associated subcollections (contacts, lines, quotes)
                const deleteSubcollection = async (collectionPath) => {
                    const q = query(collection(firestoreDb, collectionPath), where("opportunityId", "==", opportunityId)); // Use firestoreDb
                    const snapshot = await getDocs(q);
                    const deletePromises = snapshot.docs.map(d => deleteDoc(doc(firestoreDb, collectionPath, d.id))); // Use firestoreDb
                    await Promise.all(deletePromises);
                    console.log(`opportunities.js: Deleted ${snapshot.size} documents from ${collectionPath} for opportunity ${opportunityId}`);
                };

                await deleteSubcollection(`artifacts/${db.app.options.projectId}/public/data/opportunity_contacts`);
                await deleteSubcollection(`artifacts/${db.app.options.projectId}/public/data/opportunity_lines`);
                await deleteSubcollection(`artifacts/${db.app.options.projectId}/public/data/quotes`);

                showMessage('Opportunity and all related data deleted successfully!', 'success', opportunityForm);
                resetOpportunityForm();
                console.log("opportunities.js: Opportunity and subcollections deleted:", opportunityId);
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
    currentOpportunityId = null;
    currentEditedOpportunity = null; // Clear edited opportunity object
    hideMessage(opportunityForm);
    if (linkedObjectsAccordion) linkedObjectsAccordion.classList.add('hidden'); // Hide related objects accordion
    resetOpportunityContactForm(); // Also reset sub-forms
    resetOpportunityLineForm();
    resetQuoteForm();
    setOpportunityLayout('full_form_and_list'); // Reset layout to full form/list
}

function listenForOpportunities() {
    if (!firestoreDb || !isAuthReady || !currentUserId) {
        console.warn("opportunities.js: listenForOpportunities: Firestore DB or Auth is not ready. Cannot set up listener.");
        if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Waiting for database connection and user authentication...</p>';
        return;
    }

    const opportunitiesColRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunities`); // Use firestoreDb
    const q = query(opportunitiesColRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!opportunityList) return; // Defensive check
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
    opportunityRow.className = 'data-grid-row'; // Tailwind grid classes applied via CSS
    opportunityRow.dataset.id = opportunity.id;

    const customer = allCustomers.find(c => c.id === opportunity.customerId);
    const customerName = customer ? (customer.customerType === 'Individual' ? `${customer.firstName} ${customer.lastName}` : customer.companyName) : 'N/A';
    const currencySymbol = getCurrencySymbol(opportunity.currency);

    opportunityRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${opportunity.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${opportunity.opportunityName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${customerName}</div>
        <div class="px-2 py-1 truncate">${currencySymbol} ${opportunity.amount ? opportunity.amount.toFixed(2) : '0.00'}</div>
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

    opportunityRow.querySelector('.edit-btn').addEventListener('click', () => loadOpportunityForEdit(opportunity.id));
    opportunityRow.querySelector('.delete-btn').addEventListener('click', () => deleteOpportunity(opportunity.id));
}

/* --- OPPORTUNITY CONTACTS CRUD OPERATIONS (SUB-COLLECTION) --- */

async function saveOpportunityContact(contactId = null) {
    if (!firestoreDb || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Parent Opportunity not ready.", () => {});
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
    let contactDocId = contactId;

    const contactData = {
        opportunityId: currentOpportunityId,
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
        const contactsColRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunity_contacts`);
        if (isEditing) {
            const docRef = doc(contactsColRef, contactDocId);
            await setDoc(docRef, contactData, { merge: true });
            showMessage('Contact updated successfully!', 'success', opportunityContactForm);
            console.log("opportunities.js: Contact updated:", contactDocId, contactData);
        } else {
            const newDocRef = await addDoc(contactsColRef, contactData);
            contactDocId = newDocRef.id;
            showMessage('Contact added successfully!', 'success', opportunityContactForm);
            console.log("opportunities.js: Contact added with ID:", contactDocId, contactData);
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
    if (!firestoreDb || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Parent Opportunity not ready.", () => {});
        return;
    }
    hideMessage(opportunityContactForm);
    contactIdDisplayGroup.classList.remove('hidden');
    contactIdDisplay.textContent = contactId;
    opportunityContactForm.dataset.editingId = contactId; // Store for update
    submitOpportunityContactButton.textContent = 'Update Contact';

    const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunity_contacts`, contactId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            contactFirstNameInput.value = data.firstName;
            contactLastNameInput.value = data.lastName;
            contactEmailInput.value = data.email;
            contactPhoneInput.value = data.phone;
            contactRoleInput.value = data.role;
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
    if (!firestoreDb || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Parent Opportunity not ready.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this contact?",
        async () => {
            try {
                const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunity_contacts`, contactId);
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
    contactIdDisplayGroup.classList.add('hidden');
    contactIdDisplay.textContent = '';
    opportunityContactForm.dataset.editingId = '';
    submitOpportunityContactButton.textContent = 'Add Contact';
    hideMessage(opportunityContactForm);
}

function listenForOpportunityContacts(opportunityId) {
    if (!firestoreDb || !isAuthReady || !currentUserId || !opportunityId) {
        console.warn("opportunities.js: listenForOpportunityContacts: Firestore DB, Auth, or Opportunity ID not ready. Cannot set up listener.");
        if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Waiting for database connection, user authentication, and opportunity selection...</p>';
        return;
    }

    const contactsColRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunity_contacts`);
    const q = query(contactsColRef, where("opportunityId", "==", opportunityId));

    removeUnsubscribe('opportunityContacts'); // Remove previous listener if any
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!opportunityContactList) return;
        opportunityContactList.innerHTML = '';
        if (snapshot.empty) {
            opportunityContactList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No contacts for this opportunity.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayOpportunityContact({ id: doc.id, ...doc.data() });
        });
        console.log("opportunities.js: Opportunity contacts list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to opportunity contacts:", error);
        if (opportunityContactList) opportunityContactList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading contacts: ${error.message}</p>`;
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
        <div class="px-2 py-1 truncate">${contact.firstName || ''} ${contact.lastName || ''}</div>
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

/* --- OPPORTUNITY LINES CRUD OPERATIONS (SUB-COLLECTION) --- */

function calculateNetPrice() {
    if (!lineUnitPriceInput || !lineQuantityInput || !lineDiscountInput || !lineNetPriceInput) return;
    const unitPrice = parseFloat(lineUnitPriceInput.value) || 0;
    const quantity = parseInt(lineQuantityInput.value) || 0;
    const discount = parseFloat(lineDiscountInput.value) || 0;

    if (unitPrice > 0 && quantity > 0) {
        const grossPrice = unitPrice * quantity;
        const netPrice = grossPrice * (1 - (discount / 100));
        lineNetPriceInput.value = netPrice.toFixed(2);
    } else {
        lineNetPriceInput.value = '0.00';
    }
}

async function saveOpportunityLine(lineId = null) {
    if (!firestoreDb || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Parent Opportunity not ready.", () => {});
        return;
    }
    if (!lineServiceDescriptionInput?.value || !lineUnitPriceInput?.value || !lineQuantityInput?.value || !lineStatusSelect?.value) {
        showMessage('Please fill in all required line item fields.', 'error', opportunityLineForm);
        return;
    }

    submitOpportunityLineButton.disabled = true;
    submitOpportunityLineButton.textContent = 'Saving...';
    hideMessage(opportunityLineForm);

    const isEditing = !!lineId;
    let lineDocId = lineId;

    const lineData = {
        opportunityId: currentOpportunityId,
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
        const linesColRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunity_lines`);
        if (isEditing) {
            const docRef = doc(linesColRef, lineDocId);
            await setDoc(docRef, lineData, { merge: true });
            showMessage('Line item updated successfully!', 'success', opportunityLineForm);
            console.log("opportunities.js: Line item updated:", lineDocId, lineData);
        } else {
            const newDocRef = await addDoc(linesColRef, lineData);
            lineDocId = newDocRef.id;
            showMessage('Line item added successfully!', 'success', opportunityLineForm);
            console.log("opportunities.js: Line item added with ID:", lineDocId, lineData);
        }
        resetOpportunityLineForm();
    } catch (error) {
        console.error("opportunities.js: Error saving opportunity line:", error);
        showMessage(`Error saving line item: ${error.message}`, 'error', opportunityLineForm);
    } finally {
        submitOpportunityLineButton.disabled = false;
        submitOpportunityLineButton.textContent = isEditing ? 'Update Line' : 'Add Line';
    }
}

async function editOpportunityLine(lineId) {
    if (!firestoreDb || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Parent Opportunity not ready.", () => {});
        return;
    }
    hideMessage(opportunityLineForm);
    optyLineIdDisplayGroup.classList.remove('hidden');
    optyLineIdDisplay.textContent = lineId;
    opportunityLineForm.dataset.editingId = lineId; // Store for update
    submitOpportunityLineButton.textContent = 'Update Line';

    const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunity_lines`, lineId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            lineServiceDescriptionInput.value = data.serviceDescription;
            lineUnitPriceInput.value = data.unitPrice;
            lineQuantityInput.value = data.quantity;
            lineDiscountInput.value = data.discount;
            lineNetPriceInput.value = data.netPrice.toFixed(2); // Ensure 2 decimal places for display
            lineStatusSelect.value = data.status;
        } else {
            showMessage('Line item not found.', 'error', opportunityLineForm);
            resetOpportunityLineForm();
        }
    } catch (error) {
        console.error("opportunities.js: Error loading line for edit:", error);
        showMessage(`Error loading line item: ${error.message}`, 'error', opportunityLineForm);
    }
}

async function deleteOpportunityLine(lineId) {
    if (!firestoreDb || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Parent Opportunity not ready.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this line item?",
        async () => {
            try {
                const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunity_lines`, lineId);
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
    optyLineIdDisplayGroup.classList.add('hidden');
    optyLineIdDisplay.textContent = '';
    opportunityLineForm.dataset.editingId = '';
    submitOpportunityLineButton.textContent = 'Add Line';
    hideMessage(opportunityLineForm);
    calculateNetPrice(); // Recalculate net price to show default 0.00
}

function listenForOpportunityLines(opportunityId) {
    if (!firestoreDb || !isAuthReady || !currentUserId || !opportunityId) {
        console.warn("opportunities.js: listenForOpportunityLines: Firestore DB, Auth, or Opportunity ID not ready. Cannot set up listener.");
        if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Waiting for database connection, user authentication, and opportunity selection...</p>';
        return;
    }

    const linesColRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/opportunity_lines`);
    const q = query(linesColRef, where("opportunityId", "==", opportunityId));

    removeUnsubscribe('opportunityLines'); // Remove previous listener if any
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!opportunityLineList) return;
        opportunityLineList.innerHTML = '';
        if (snapshot.empty) {
            opportunityLineList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No line items for this opportunity.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayOpportunityLine({ id: doc.id, ...doc.data() });
        });
        console.log("opportunities.js: Opportunity lines list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to opportunity lines:", error);
        if (opportunityLineList) opportunityLineList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading line items: ${error.message}</p>`;
    });

    addUnsubscribe('opportunityLines', unsubscribe);
}

function displayOpportunityLine(line) {
    if (!opportunityLineList) return;
    const lineRow = document.createElement('div');
    lineRow.className = 'data-grid-row';
    lineRow.dataset.id = line.id;

    const currencySymbol = getCurrencySymbol(currentEditedOpportunity.currency); // Use opportunity's currency

    lineRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${line.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${line.serviceDescription || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currencySymbol} ${line.unitPrice ? line.unitPrice.toFixed(2) : '0.00'}</div>
        <div class="px-2 py-1 truncate">${line.quantity || '0'}</div>
        <div class="px-2 py-1 truncate">${line.discount ? line.discount.toFixed(2) : '0.00'}%</div>
        <div class="px-2 py-1 truncate">${currencySymbol} ${line.netPrice ? line.netPrice.toFixed(2) : '0.00'}</div>
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

/* --- QUOTES CRUD OPERATIONS (SUB-COLLECTION) --- */

function calculateQuoteNetAmount() {
    if (!quoteNetListAmountInput || !quoteNetDiscountInput || !quoteNetAmountInput) return;
    const netListAmount = parseFloat(quoteNetListAmountInput.value) || 0;
    const netDiscount = parseFloat(quoteNetDiscountInput.value) || 0;
    const netAmount = netListAmount - netDiscount;
    quoteNetAmountInput.value = netAmount.toFixed(2);
}

async function saveQuote(quoteId = null) {
    if (!firestoreDb || !isAuthReady || !currentUserId || !currentOpportunityId || !currentEditedOpportunity) {
        showModal("Error", "Authentication, Database, or Parent Opportunity not ready.", () => {});
        return;
    }
    if (!quoteNameInput?.value || !quoteDescriptionInput?.value || !quoteStartDateInput?.value || !quoteExpireDateInput?.value ||
        !quoteStatusSelect?.value || !quoteNetListAmountInput?.value || !quoteNetDiscountInput?.value || !quoteCurrencySelect?.value) {
        showMessage('Please fill in all required quote fields.', 'error', quoteForm);
        return;
    }

    submitQuoteButton.disabled = true;
    submitQuoteButton.textContent = 'Saving...';
    hideMessage(quoteForm);

    const isEditing = !!quoteId;
    let quoteDocId = quoteId;

    const quoteData = {
        opportunityId: currentOpportunityId,
        customerId: currentEditedOpportunity.customerId, // Inherit customer from opportunity
        quoteName: quoteNameInput.value,
        description: quoteDescriptionInput.value,
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
        const quotesColRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/quotes`);
        if (isEditing) {
            const docRef = doc(quotesColRef, quoteDocId);
            await setDoc(docRef, quoteData, { merge: true });
            showMessage('Quote updated successfully!', 'success', quoteForm);
            console.log("opportunities.js: Quote updated:", quoteDocId, quoteData);
        } else {
            const newDocRef = await addDoc(quotesColRef, quoteData);
            quoteDocId = newDocRef.id;
            showMessage('Quote added successfully!', 'success', quoteForm);
            console.log("opportunities.js: Quote added with ID:", quoteDocId, quoteData);
        }
        resetQuoteForm();
    } catch (error) {
        console.error("opportunities.js: Error saving quote:", error);
        showMessage(`Error saving quote: ${error.message}`, 'error', quoteForm);
    } finally {
        submitQuoteButton.disabled = false;
        submitQuoteButton.textContent = isEditing ? 'Update Quote' : 'Add Quote';
    }
}

async function editQuote(quoteId) {
    if (!firestoreDb || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Parent Opportunity not ready.", () => {});
        return;
    }
    hideMessage(quoteForm);
    quoteIdDisplayGroup.classList.remove('hidden');
    quoteIdDisplay.textContent = quoteId;
    quoteForm.dataset.editingId = quoteId; // Store for update
    submitQuoteButton.textContent = 'Update Quote';

    const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/quotes`, quoteId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            quoteNameInput.value = data.quoteName;
            quoteDescriptionInput.value = data.description;
            // Set customer select (read-only for quotes)
            if (currentEditedOpportunity) { // Pre-populate if current edited opportunity exists
                const customer = allCustomers.find(c => c.id === currentEditedOpportunity.customerId);
                if (customer) {
                    const option = new Option(customer.customerType === 'Individual' ? `${customer.firstName} ${customer.lastName}` : customer.companyName, customer.id, true, true);
                    quoteCustomerSelect.add(option);
                    quoteCustomerSelect.value = customer.id;
                }
            } else {
                 // Fallback if currentEditedOpportunity is somehow not set (shouldn't happen in proper flow)
                 const customer = allCustomers.find(c => c.id === data.customerId);
                 if (customer) {
                    const option = new Option(customer.customerType === 'Individual' ? `${customer.firstName} ${customer.lastName}` : customer.companyName, customer.id, true, true);
                    quoteCustomerSelect.add(option);
                    quoteCustomerSelect.value = customer.id;
                 }
            }

            quoteStartDateInput.value = data.startDate;
            quoteExpireDateInput.value = data.expireDate;
            quoteStatusSelect.value = data.status;
            quoteNetListAmountInput.value = data.netListAmount;
            quoteNetDiscountInput.value = data.netDiscount;
            quoteNetAmountInput.value = data.netAmount.toFixed(2);
            quoteCurrencySelect.value = data.currency;
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
    if (!firestoreDb || !isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Authentication, Database, or Parent Opportunity not ready.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this quote?",
        async () => {
            try {
                const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/quotes`, quoteId);
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
    quoteIdDisplayGroup.classList.add('hidden');
    quoteIdDisplay.textContent = '';
    quoteForm.dataset.editingId = '';
    submitQuoteButton.textContent = 'Add Quote';
    hideMessage(quoteForm);
    calculateQuoteNetAmount(); // Recalculate to show default 0.00
    // Re-populate customer dropdown with current opportunity's customer if in edit mode
    if (currentOpportunityId && currentEditedOpportunity) {
        const customer = allCustomers.find(c => c.id === currentEditedOpportunity.customerId);
        if (customer) {
            quoteCustomerSelect.innerHTML = ''; // Clear previous options
            const option = new Option(customer.customerType === 'Individual' ? `${customer.firstName} ${customer.lastName}` : customer.companyName, customer.id, true, true);
            quoteCustomerSelect.add(option);
            quoteCustomerSelect.value = customer.id;
        }
    } else {
        quoteCustomerSelect.innerHTML = '<option value="">Auto-filled from Opportunity</option>';
    }
}

function listenForQuotes(opportunityId) {
    if (!firestoreDb || !isAuthReady || !currentUserId || !opportunityId) {
        console.warn("opportunities.js: listenForQuotes: Firestore DB, Auth, or Opportunity ID not ready. Cannot set up listener.");
        if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Waiting for database connection, user authentication, and opportunity selection...</p>';
        return;
    }

    const quotesColRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/quotes`);
    const q = query(quotesColRef, where("opportunityId", "==", opportunityId));

    removeUnsubscribe('quotes'); // Remove previous listener if any
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!quoteList) return;
        quoteList.innerHTML = '';
        if (snapshot.empty) {
            quoteList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No quotes for this opportunity.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayQuote({ id: doc.id, ...doc.data() });
        });
        console.log("opportunities.js: Quotes list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to quotes:", error);
        if (quoteList) quoteList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading quotes: ${error.message}</p>`;
    });

    addUnsubscribe('quotes', unsubscribe);
}

function displayQuote(quote) {
    if (!quoteList) return;
    const quoteRow = document.createElement('div');
    quoteRow.className = 'data-grid-row';
    quoteRow.dataset.id = quote.id;

    const currencySymbol = getCurrencySymbol(quote.currency); // Use quote's own currency

    quoteRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${quote.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${quote.quoteName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${quote.status || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currencySymbol} ${quote.netAmount ? quote.netAmount.toFixed(2) : '0.00'}</div>
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

    quoteRow.querySelector('.edit-btn').addEventListener('click', () => editQuote(quote.id));
    quoteRow.querySelector('.delete-btn').addEventListener('click', () => deleteQuote(quote.id));
}
