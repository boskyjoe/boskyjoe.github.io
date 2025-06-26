import { db, auth, currentUserId, isAuthReady, addUnsubscribe, removeUnsubscribe } from './main.js';
import { showModal, getCollectionPath } from './utils.js';
import { fetchCurrencies, allCurrencies, getCurrencySymbol } from './admin_data.js'; // Import currency data and functions
import { fetchCustomersForDropdown, allCustomers } from './customers.js'; // Import customer data for dropdown
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Import necessary Firestore functions

// Opportunity Module specific DOM elements
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

// Opportunity Contact Elements
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

// Opportunity Line Elements
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

// Quote Elements
let quoteForm;
let quoteIdDisplayGroup;
let quoteIdDisplay;
let quoteNameInput;
let quoteDescriptionInput;
let quoteCustomerSelect;
let quoteStartDateInput;
let quoteExpireDateInput; // Corrected: Removed extra 'document ='
let quoteStatusSelect;
let quoteNetListAmountInput;
let quoteNetDiscountInput;
let quoteNetAmountInput;
let quoteCurrencySelect;
let quoteIsFinalCheckbox;
let submitQuoteButton;
let quoteList;

let currentOpportunityId = null; // Stores the Firestore Doc ID of the currently selected/edited opportunity
let currentEditedOpportunity = null; // Stores the full opportunity object currently being edited

const currentOpportunityCollectionType = 'public'; // Fixed to public for opportunities

// Initialize Opportunity module elements and event listeners
export async function initOpportunitiesModule() {
    console.log("opportunities.js: initOpportunitiesModule called.");
    // Ensure DOM elements are initialized only once
    if (!opportunitiesSection) {
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
        quoteExpireDateInput = document.getElementById('quoteExpireDate'); // Corrected line
        quoteStatusSelect = document.getElementById('quoteStatus');
        quoteNetListAmountInput = document.getElementById('quoteNetListAmount');
        quoteNetDiscountInput = document.getElementById('quoteNetDiscount');
        quoteNetAmountInput = document.getElementById('quoteNetAmount');
        quoteCurrencySelect = document.getElementById('quoteCurrency');
        quoteIsFinalCheckbox = document.getElementById('quoteIsFinal');
        submitQuoteButton = document.getElementById('submitQuoteButton');
        quoteList = document.getElementById('quoteList');

        // Add event listeners
        if (opportunityForm) opportunityForm.addEventListener('submit', saveOpportunityHandler);
        if (opportunityCurrencySelect) opportunityCurrencySelect.addEventListener('change', updateCurrencySymbolDisplay);
        if (opportunityCustomerSelect) {
            opportunityCustomerSelect.addEventListener('change', (e) => {
                const isEditing = opportunityForm.dataset.editingId;
                if (!isEditing || opportunityServiceAddressInput.value.trim() === '') {
                    const selectedCustomerId = e.target.value;
                    const selectedCustomer = allCustomers.find(c => c.id === selectedCustomerId);
                    if (selectedCustomer) {
                        const customerAddress = `${selectedCustomer.address || ''}, ${selectedCustomer.city || ''}, ${selectedCustomer.state || ''}, ${selectedCustomer.zipCode || ''}, ${selectedCustomer.country || ''}`.trim();
                        opportunityServiceAddressInput.value = customerAddress.replace(/,(\s*,){1,}/g, ',').replace(/^,|,$/g, '').trim();
                    } else {
                        opportunityServiceAddressInput.value = '';
                    }
                }
            });
        }
        if (opportunityContactForm) opportunityContactForm.addEventListener('submit', saveOpportunityContactHandler);
        if (opportunityLineForm) opportunityLineForm.addEventListener('submit', saveOpportunityLineHandler);
        if (quoteForm) quoteForm.addEventListener('submit', saveQuoteHandler);

        document.getElementById('resetOpportunityFormButton')?.addEventListener('click', resetOpportunityForm);
        document.getElementById('resetOpportunityContactFormButton')?.addEventListener('click', resetOpportunityContactForm);
        document.getElementById('resetOpportunityLineFormButton')?.addEventListener('click', resetOpportunityLineForm);
        document.getElementById('resetQuoteFormButton')?.addEventListener('click', resetQuoteForm);

        // Accordion listeners
        if (contactsAccordionHeader) contactsAccordionHeader.addEventListener('click', () => toggleAccordion(contactsAccordionHeader, contactsAccordionContent));
        if (linesAccordionHeader) linesAccordionHeader.addEventListener('click', () => toggleAccordion(linesAccordionHeader, linesAccordionContent));
        if (quotesAccordionHeader) quotesAccordionHeader.addEventListener('click', () => toggleAccordion(quotesAccordionHeader, quotesAccordionContent));
    }

    // Ensure initial state and load data
    console.log("opportunities.js: Calling fetchCustomersForDropdown...");
    await fetchCustomersForDropdown();
    console.log("opportunities.js: Calling fetchCurrencies...");
    await fetchCurrencies();
    populateCurrencySelect();
    resetOpportunityForm();
    if (submitOpportunityButton) {
        if (isAuthReady && currentUserId) {
            submitOpportunityButton.removeAttribute('disabled');
        } else {
            submitOpportunityButton.setAttribute('disabled', 'disabled');
        }
    }
    console.log("opportunities.js: Calling listenForOpportunities...");
    listenForOpportunities();
}

// Function to control the layout of the opportunity section
export function setOpportunityLayout(layoutType) {
    if (!opportunityFullFormView || !opportunityExistingListView || !opportunityLeftPanel || !opportunityRightPanel) return;

    opportunityFullFormView.classList.add('hidden');
    opportunityExistingListView.classList.add('hidden');

    opportunityLeftPanel.classList.remove('md:w-full', 'md:w-7/10', 'md:w-3/10', 'shrink-left');
    opportunityRightPanel.classList.remove('hidden-panel', 'md:w-full', 'md:w-7/10', 'md:w-3/10', 'expand-right');

    switch (layoutType) {
        case 'full_form_and_list':
            opportunityFullFormView.classList.remove('hidden');
            opportunityExistingListView.classList.remove('hidden');
            opportunityLeftPanel.classList.add('md:w-full');
            opportunityRightPanel.classList.add('hidden-panel');
            break;
        case 'edit_split_70_30':
            opportunityFullFormView.classList.remove('hidden');
            opportunityExistingListView.classList.remove('hidden');
            opportunityLeftPanel.classList.add('md:w-7/10');
            opportunityRightPanel.classList.remove('hidden-panel');
            opportunityRightPanel.classList.add('md:w-3/10');
            break;
        case 'edit_split_30_70':
            opportunityFullFormView.classList.remove('hidden');
            opportunityExistingListView.classList.remove('hidden');
            opportunityLeftPanel.classList.add('shrink-left');
            opportunityRightPanel.classList.remove('hidden-panel');
            opportunityRightPanel.classList.add('expand-right');
            break;
        default:
            console.error("Unknown opportunity layout type:", layoutType);
            break;
    }
}

// Helper function to populate the currency select dropdown for opportunities
function populateCurrencySelect() {
    if (!opportunityCurrencySelect) return;
    opportunityCurrencySelect.innerHTML = '<option value="">Select Currency</option>';

    const sortedCurrencies = [...allCurrencies].sort((a, b) => a.id.localeCompare(b.id));

    sortedCurrencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency.id;
        option.textContent = `${currency.id} (${currency.symbol})`;
        opportunityCurrencySelect.appendChild(option);
    });

    if (allCurrencies.some(c => c.id === 'USD')) {
        opportunityCurrencySelect.value = 'USD';
    }
    updateCurrencySymbolDisplay();
}

// Helper function to update the currency symbol next to the amount input
function updateCurrencySymbolDisplay() {
    if (!currencySymbolDisplay || !opportunityCurrencySelect) return;
    const selectedCurrencyCode = opportunityCurrencySelect.value;
    currencySymbolDisplay.textContent = getCurrencySymbol(selectedCurrencyCode);
}

// Save (Add/Update) an Opportunity
async function saveOpportunityHandler(e) {
    e.preventDefault();

    if (!isAuthReady || !currentUserId) {
        showModal("Error", "Could not save opportunity. Authentication required.", () => {});
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot save opportunity.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const opportunityData = {
        customer: opportunityCustomerSelect.value,
        opportunityName: opportunityNameInput.value.trim(),
        amount: parseFloat(opportunityAmountInput.value),
        currency: opportunityCurrencySelect.value.trim(),
        stage: opportunityStageSelect.value.trim(),
        expectedStartDate: opportunityExpectedStartDateInput.value,
        expectedCloseDate: opportunityExpectedCloseDateInput.value,
        eventType: opportunityEventTypeSelect.value.trim(),
        eventLocationProposed: opportunityEventLocationProposedInput.value.trim(),
        serviceAddress: opportunityServiceAddressInput.value.trim(),
        description: opportunityDescriptionInput.value.trim(),
        opportunityData: opportunityDataInput.value.trim() !== '' ? JSON.parse(opportunityDataInput.value) : {}
    };

    const mandatoryFields = [
        { field: opportunityData.customer, name: "Customer" },
        { field: opportunityData.opportunityName, name: "Opportunity Name" },
        { field: opportunityData.amount, name: "Amount" },
        { field: opportunityData.currency, name: "Currency" },
        { field: opportunityData.stage, name: "Stage" },
        { field: opportunityData.expectedStartDate, name: "Expected Start Date" },
        { field: opportunityData.expectedCloseDate, name: "Expected Close Date" },
        { field: opportunityData.eventType, name: "Event Type" },
        { field: opportunityData.eventLocationProposed, name: "Proposed Event Location" },
        { field: opportunityData.serviceAddress, name: "Service Address" },
        { field: opportunityData.description, name: "Description" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field || (typeof item.field === 'string' && item.field === '') || (item.name === "Amount" && (isNaN(item.field) || item.field <= 0))) {
            missingFields.push(item.name);
        }
    });

    if (missingFields.length > 0) {
        showModal("Validation Error", `Please fill in all mandatory fields: ${[...new Set(missingFields)].join(', ')}.`, () => {});
        return;
    }

    const collectionPath = getCollectionPath(currentOpportunityCollectionType, 'opportunities');
    if (!collectionPath) {
        console.error("opportunities.js: Collection path is null. Cannot save opportunity.");
        return;
    }

    try {
        const editingId = opportunityForm.dataset.editingId;
        if (editingId) {
            // Use modular Firestore syntax: doc(db, collectionPath, editingId)
            const opportunityDocRef = doc(db, collectionPath, editingId);
            await setDoc(opportunityDocRef, opportunityData, { merge: true }); // Use setDoc for consistency
            console.log("Opportunity updated:", editingId);
            showModal("Success", "Opportunity updated successfully!", () => {});
        } else {
            // Use modular Firestore syntax: doc(collection(db, collectionPath))
            const newDocRef = doc(collection(db, collectionPath));
            const numericPart = Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const systemGeneratedOpportunityId = 'OPTY-' + numericPart;
            await setDoc(newDocRef, { ...opportunityData, opportunityId: systemGeneratedOpportunityId });
            console.log("Opportunity added with ID:", systemGeneratedOpportunityId);
            showModal("Success", "New opportunity created successfully!", () => {});
        }
        resetOpportunityForm();
    } catch (error) {
        console.error("Error saving opportunity:", error);
        showModal("Error", `Failed to save opportunity: ${error.message}`, () => {});
    }
}

// Delete an Opportunity
async function deleteOpportunity(firestoreDocId) {
    if (!isAuthReady || !currentUserId) {
        showModal("Error", "Could not delete opportunity. Authentication required.", () => {});
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot delete opportunity.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const collectionPath = getCollectionPath(currentOpportunityCollectionType, 'opportunities');
    if (!collectionPath) {
        console.error("opportunities.js: Collection path is null. Cannot delete opportunity.");
        return;
    }

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this opportunity? This action cannot be undone. All linked contacts, lines, and quotes will also be deleted.",
        async () => {
            try {
                // Use modular Firestore syntax: doc(db, collectionPath, firestoreDocId)
                const opportunityDocRef = doc(db, collectionPath, firestoreDocId);

                const subCollections = ['contacts', 'lines', 'quotes'];
                for (const subColl of subCollections) {
                    // Check if db is initialized again before subcollection calls
                    if (!db) {
                        console.error("opportunities.js: Firestore 'db' instance is not initialized for subcollection. Skipping subcollection deletion.");
                        continue; // Skip to next subcollection or main doc deletion
                    }
                    // Use modular Firestore syntax: collection(opportunityDocRef, subColl) and getDocs()
                    const subCollRef = collection(opportunityDocRef, subColl);
                    const subDocsSnapshot = await getDocs(subCollRef);
                    subDocsSnapshot.forEach(async (subDoc) => {
                        // Use modular Firestore syntax: deleteDoc(subDoc.ref)
                        await deleteDoc(subDoc.ref);
                    });
                }

                // Use modular Firestore syntax: deleteDoc(opportunityDocRef)
                await deleteDoc(opportunityDocRef);
                console.log("Opportunity and its subcollections deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "Opportunity and its linked data deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting opportunity:", error);
                showModal("Error", `Failed to delete opportunity: ${error.message}`, () => {});
            }
        }
    );
}

// Listen for real-time updates to Opportunities
function listenForOpportunities() {
    console.log("opportunities.js: listenForOpportunities called.");
    if (!isAuthReady || !currentUserId) {
        if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center col-span-full">Authentication required to load opportunities.</p>';
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot listen for opportunities.");
        if (opportunityList) opportunityList.innerHTML = '<p class="text-red-500 text-center col-span-full py-4">Firestore not ready to load opportunities.</p>';
        return;
    }

    const collectionPath = getCollectionPath(currentOpportunityCollectionType, 'opportunities');
    if (!collectionPath) {
        console.error("opportunities.js: Collection path is null. Cannot listen for opportunities.");
        return;
    }

    console.log("opportunities.js: Attempting to set up onSnapshot for path:", collectionPath);
    // Use modular Firestore syntax: collection(db, collectionPath)
    const q = collection(db, collectionPath);

    // Use modular Firestore syntax: onSnapshot()
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (opportunityList) opportunityList.innerHTML = '';
        if (snapshot.empty) {
            if (opportunityList) opportunityList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No opportunities found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const opportunity = { id: doc.id, ...doc.data() };
            displayOpportunity(opportunity);
        });
        console.log("opportunities.js: Opportunities data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to opportunities:", error);
        if (opportunityList) opportunityList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading opportunities: ${error.message}</p>`;
    });
    addUnsubscribe('opportunities', unsubscribe);
}

// Display a single opportunity in the UI
function displayOpportunity(opportunity) {
    if (!opportunityList) return;
    const opportunityRow = document.createElement('div');
    opportunityRow.className = 'data-grid-row';
    opportunityRow.dataset.id = opportunity.id;

    const customer = allCustomers.find(c => c.id === opportunity.customer);
    const customerDisplayName = customer ? (customer.companyName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()) : 'N/A';

    const currencySymbol = getCurrencySymbol(opportunity.currency);
    const formattedAmount = opportunity.amount ? `${currencySymbol}${parseFloat(opportunity.amount).toFixed(2)}` : 'N/A';

    opportunityRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${opportunity.opportunityId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${opportunity.opportunityName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${customerDisplayName}</div>
        <div class="px-2 py-1 truncate">${formattedAmount}</div>
        <div class="px-2 py-1 truncate">${opportunity.stage || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${opportunity.expectedStartDate || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${opportunity.expectedCloseDate || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden lg:block">${opportunity.eventType || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-center items-center space-x-2">
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
function editOpportunity(opportunity) {
    if (!isAuthReady || !currentUserId) {
        showModal("Permission Denied", "Authentication required to edit opportunities.", () => {});
        return;
    }

    currentEditedOpportunity = opportunity;
    setOpportunityLayout('edit_split_70_30');

    if (opportunityFormTitle) opportunityFormTitle.textContent = 'Edit Opportunity';
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Update Opportunity';

    if (opportunityIdDisplayGroup) opportunityIdDisplayGroup.classList.remove('hidden');
    if (opportunityIdDisplay) opportunityIdDisplay.textContent = opportunity.opportunityId || 'N/A';
    if (opportunityForm) opportunityForm.dataset.editingId = opportunity.id;
    currentOpportunityId = opportunity.id;

    if (opportunityCustomerSelect) opportunityCustomerSelect.value = opportunity.customer || '';
    if (opportunityNameInput) opportunityNameInput.value = opportunity.opportunityName || '';
    if (opportunityAmountInput) opportunityAmountInput.value = opportunity.amount || '';
    if (opportunityCurrencySelect) opportunityCurrencySelect.value = opportunity.currency || '';
    if (opportunityStageSelect) opportunityStageSelect.value = opportunity.stage || '';
    if (opportunityExpectedStartDateInput) opportunityExpectedStartDateInput.value = opportunity.expectedStartDate || '';
    if (opportunityExpectedCloseDateInput) opportunityExpectedCloseDateInput.value = opportunity.expectedCloseDate || '';
    if (opportunityEventTypeSelect) opportunityEventTypeSelect.value = opportunity.eventType || '';
    if (opportunityEventLocationProposedInput) opportunityEventLocationProposedInput.value = opportunity.eventLocationProposed || '';
    if (opportunityServiceAddressInput) opportunityServiceAddressInput.value = opportunity.serviceAddress || '';
    if (opportunityDescriptionInput) opportunityDescriptionInput.value = opportunity.description || '';
    if (opportunityDataInput) opportunityDataInput.value = opportunity.opportunityData ? (typeof opportunity.opportunityData === 'object' ? JSON.stringify(opportunity.opportunityData, null, 2) : opportunity.opportunityData) : '';

    updateCurrencySymbolDisplay();

    if (linkedObjectsAccordion) opportunityRightPanel.classList.remove('hidden-panel');
    if (linkedObjectsAccordion) linkedObjectsAccordion.classList.remove('hidden');

    resetOpportunityContactForm();
    listenForOpportunityContacts(currentOpportunityId);

    resetOpportunityLineForm();
    listenForOpportunityLines(currentOpportunityId);

    resetQuoteForm();
    listenForQuotes(currentOpportunityId);

    closeAllAccordions(); // Re-exported from main as well for convenience within module

    if (opportunityForm) opportunityForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Opportunity form function (exported for main.js to use)
export function resetOpportunityForm() {
    if (opportunityForm) opportunityForm.reset();
    if (opportunityForm) opportunityForm.dataset.editingId = '';
    if (opportunityFormTitle) opportunityFormTitle.textContent = 'Add New Opportunity';
    if (submitOpportunityButton) submitOpportunityButton.textContent = 'Add Opportunity';
    if (opportunityIdDisplayGroup) opportunityIdDisplayGroup.classList.add('hidden');
    if (opportunityIdDisplay) opportunityIdDisplay.textContent = '';
    if (opportunityDataInput) opportunityDataInput.value = '';
    if (opportunityServiceAddressInput) opportunityServiceAddressInput.value = '';
    currentOpportunityId = null;
    currentEditedOpportunity = null;

    if (linkedObjectsAccordion) linkedObjectsAccordion.classList.add('hidden');
    closeAllAccordions();

    fetchCustomersForDropdown();
    populateCurrencySelect();

    if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No contacts added for this opportunity.</p>';
    if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No opportunity lines added for this opportunity.</p>';
    if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No quotes added for this opportunity.</p>';

    removeUnsubscribe('opportunityContacts');
    removeUnsubscribe('opportunityLines');
    removeUnsubscribe('quotes');

    if (submitOpportunityContactButton) submitOpportunityContactButton.removeAttribute('disabled');
    if (submitOpportunityLineButton) submitOpportunityLineButton.removeAttribute('disabled');
    if (submitQuoteButton) submitQuoteButton.removeAttribute('disabled');

    if (quoteCustomerSelect) {
        quoteCustomerSelect.innerHTML = '<option value="">Auto-filled from Opportunity</option>';
        quoteCustomerSelect.setAttribute('disabled', 'disabled');
    }

    setOpportunityLayout('full_form_and_list');
}

/* --- OPPORTUNITY CONTACTS CRUD --- */
async function saveOpportunityContactHandler(e) {
    e.preventDefault();
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Please select an Opportunity first to add/edit contacts.", () => {});
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot save opportunity contact.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const contactData = {
        firstName: contactFirstNameInput.value.trim(),
        lastName: contactLastNameInput.value.trim(),
        email: contactEmailInput.value.trim(),
        phone: contactPhoneInput.value.trim(),
        role: contactRoleInput.value.trim()
    };

    const mandatoryFields = [
        { field: contactData.firstName, name: "First Name" },
        { field: contactData.lastName, name: "Last Name" },
        { field: contactData.email, name: "Email" },
        { field: contactData.phone, name: "Phone" },
        { field: contactData.role, name: "Role" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field) missingFields.push(item.name);
    });

    if (missingFields.length > 0) {
        showModal("Validation Error", `Please fill in all mandatory contact fields: ${[...new Set(missingFields)].join(', ')}.`, () => {});
        return;
    }

    const collectionPath = `${getCollectionPath(currentOpportunityCollectionType, 'opportunities')}/${currentOpportunityId}/contacts`;

    try {
        const editingId = opportunityContactForm.dataset.editingId;
        if (editingId) {
            // Use modular Firestore syntax: doc(db, collectionPath, editingId)
            const contactDocRef = doc(db, collectionPath, editingId);
            await setDoc(contactDocRef, contactData, { merge: true });
            console.log("Opportunity Contact updated:", editingId);
            showModal("Success", "Contact updated successfully!", () => {});
        } else {
            // Use modular Firestore syntax: doc(collection(db, collectionPath))
            const newDocRef = doc(collection(db, collectionPath));
            const numericPart = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
            const systemGeneratedContactId = 'CTCT-' + numericPart;
            await setDoc(newDocRef, { ...contactData, contactId: systemGeneratedContactId, opportunityId: currentOpportunityId });
            console.log("Opportunity Contact added with ID:", systemGeneratedContactId);
            showModal("Success", "New contact added successfully!", () => {});
        }
        resetOpportunityContactForm();
    } catch (error) {
        console.error("Error saving opportunity contact:", error);
        showModal("Error", `Failed to save contact: ${error.message}`, () => {});
    }
}

async function deleteOpportunityContact(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot delete opportunity contact.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }
    const collectionPath = `${getCollectionPath(currentOpportunityCollectionType, 'opportunities')}/${currentOpportunityId}/contacts`;

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this contact?",
        async () => {
            try {
                // Use modular Firestore syntax: deleteDoc(doc(db, collectionPath, firestoreDocId))
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("Opportunity Contact deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "Contact deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting contact:", error);
                showModal("Error", `Failed to delete contact: ${error.message}`, () => {});
            }
        }
    );
}

function listenForOpportunityContacts(opportunityId) {
    console.log("opportunities.js: listenForOpportunityContacts called for opportunityId:", opportunityId);
    if (!opportunityId || !isAuthReady || !currentUserId) {
        if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Select an Opportunity to view contacts.</p>';
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot listen for opportunity contacts.");
        if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-red-500 text-center col-span-full py-4">Firestore not ready to load contacts.</p>';
        return;
    }
    const collectionPath = `${getCollectionPath(currentOpportunityCollectionType, 'opportunities')}/${opportunityId}/contacts`;

    console.log("opportunities.js: Attempting to set up onSnapshot for contacts path:", collectionPath);
    // Use modular Firestore syntax: collection(db, collectionPath)
    const q = collection(db, collectionPath);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (opportunityContactList) opportunityContactList.innerHTML = '';
        if (snapshot.empty) {
            if (opportunityContactList) opportunityContactList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No contacts added for this opportunity.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const contact = { id: doc.id, ...doc.data() };
            displayOpportunityContact(contact);
        });
        console.log("opportunities.js: Opportunity contacts updated via onSnapshot. Total:", snapshot.size);
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
        <div class="px-2 py-1 truncate font-medium text-gray-800">${contact.contactId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${contact.firstName || ''} ${contact.lastName || ''}</div>
        <div class="px-2 py-1 truncate">${contact.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${contact.phone || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${contact.role || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-center items-center space-x-2">
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
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    if (opportunityContactForm) opportunityContactForm.dataset.editingId = contact.id;
    if (submitOpportunityContactButton) submitOpportunityContactButton.textContent = 'Update Contact';

    if (contactIdDisplayGroup) contactIdDisplayGroup.classList.remove('hidden');
    if (contactIdDisplay) contactIdDisplay.textContent = contact.contactId || 'N/A';

    if (contactFirstNameInput) contactFirstNameInput.value = contact.firstName || '';
    if (contactLastNameInput) contactLastNameInput.value = contact.lastName || '';
    if (contactEmailInput) contactEmailInput.value = contact.email || '';
    if (contactPhoneInput) contactPhoneInput.value = contact.phone || '';
    if (contactRoleInput) contactRoleInput.value = contact.role || '';

    closeAllAccordions();
    if (contactsAccordionHeader && contactsAccordionContent) toggleAccordion(contactsAccordionHeader, contactsAccordionContent);

    if (contactsAccordionHeader) contactsAccordionHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetOpportunityContactForm() {
    if (opportunityContactForm) opportunityContactForm.reset();
    if (opportunityContactForm) opportunityContactForm.dataset.editingId = '';
    if (submitOpportunityContactButton) submitOpportunityContactButton.textContent = 'Add Contact';
    if (contactIdDisplayGroup) contactIdDisplayGroup.classList.add('hidden');
    if (contactIdDisplay) contactIdDisplay.textContent = '';
}

/* --- OPPORTUNITY LINES CRUD --- */
async function saveOpportunityLineHandler(e) {
    e.preventDefault();
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Please select an Opportunity first to add/edit lines.", () => {});
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot save opportunity line.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const lineData = {
        serviceDescription: lineServiceDescriptionInput.value.trim(),
        unitPrice: parseFloat(lineUnitPriceInput.value),
        quantity: parseInt(lineQuantityInput.value),
        discount: parseFloat(lineDiscountInput.value) || 0,
        status: lineStatusSelect.value.trim()
    };

    const mandatoryFields = [
        { field: lineData.serviceDescription, name: "Service Description" },
        { field: lineData.unitPrice, name: "Unit Price" },
        { field: lineData.quantity, name: "Quantity" },
        { field: lineData.status, name: "Status" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field || (typeof item.field === 'string' && item.field === '') || (item.name === "Unit Price" && (isNaN(item.field) || item.field <= 0)) || (item.name === "Quantity" && (isNaN(item.field) || item.field <= 0))) {
            missingFields.push(item.name);
        }
    });

    if (missingFields.length > 0) {
        showModal("Validation Error", `Please fill in all mandatory opportunity line fields: ${[...new Set(missingFields)].join(', ')}.`, () => {});
        return;
    }

    lineData.netPrice = (lineData.unitPrice * lineData.quantity * (1 - lineData.discount / 100)).toFixed(2);

    const collectionPath = `${getCollectionPath(currentOpportunityCollectionType, 'opportunities')}/${currentOpportunityId}/lines`;

    try {
        const editingId = opportunityLineForm.dataset.editingId;
        if (editingId) {
            // Use modular Firestore syntax: doc(db, collectionPath, editingId)
            const lineDocRef = doc(db, collectionPath, editingId);
            await setDoc(lineDocRef, lineData, { merge: true });
            console.log("Opportunity Line updated:", editingId);
            showModal("Success", "Opportunity line updated successfully!", () => {});
        } else {
            // Use modular Firestore syntax: doc(collection(db, collectionPath))
            const newDocRef = doc(collection(db, collectionPath));
            const numericPart = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
            const systemGeneratedLineId = 'LINE-' + numericPart;
            await setDoc(newDocRef, { ...lineData, optyLineId: systemGeneratedLineId, opportunityId: currentOpportunityId });
            console.log("Opportunity Line added with ID:", systemGeneratedLineId);
            showModal("Success", "New opportunity line added successfully!", () => {});
        }
        resetOpportunityLineForm();
    } catch (error) {
        console.error("Error saving opportunity line:", error);
        showModal("Error", `Failed to save opportunity line: ${error.message}`, () => {});
    }
}

async function deleteOpportunityLine(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot delete opportunity line.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }
    const collectionPath = `${getCollectionPath(currentOpportunityCollectionType, 'opportunities')}/${currentOpportunityId}/lines`;

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this opportunity line?",
        async () => {
            try {
                // Use modular Firestore syntax: deleteDoc(doc(db, collectionPath, firestoreDocId))
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("Opportunity Line deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "Opportunity line deleted successfully!", () => {});
            }
            catch (error) {
                console.error("Error deleting opportunity line:", error);
                showModal("Error", `Failed to delete opportunity line: ${error.message}`, () => {});
            }
        }
    );
}

function listenForOpportunityLines(opportunityId) {
    console.log("opportunities.js: listenForOpportunityLines called for opportunityId:", opportunityId);
    if (!opportunityId || !isAuthReady || !currentUserId) {
        if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Select an Opportunity to view lines.</p>';
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot listen for opportunity lines.");
        if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-red-500 text-center col-span-full py-4">Firestore not ready to load lines.</p>';
        return;
    }

    const collectionPath = `${getCollectionPath(currentOpportunityCollectionType, 'opportunities')}/${opportunityId}/lines`;
    console.log("opportunities.js: Attempting to set up onSnapshot for lines path:", collectionPath);
    // Use modular Firestore syntax: collection(db, collectionPath)
    const q = collection(db, collectionPath);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (opportunityLineList) opportunityLineList.innerHTML = '';
        if (snapshot.empty) {
            if (opportunityLineList) opportunityLineList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No opportunity lines added for this opportunity.</p>';
        } else {
            snapshot.forEach((doc) => {
                const line = { id: doc.id, ...doc.data() };
                displayOpportunityLine(line);
            });
        }
        console.log("opportunities.js: Opportunity lines updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to opportunity lines:", error);
        if (opportunityLineList) opportunityLineList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading lines: ${error.message}</p>`;
    });
    addUnsubscribe('opportunityLines', unsubscribe);
}

function displayOpportunityLine(line) {
    if (!opportunityLineList) return;
    const lineRow = document.createElement('div');
    lineRow.className = 'data-grid-row';
    lineRow.dataset.id = line.id;

    lineRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${line.optyLineId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${line.serviceDescription || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${line.unitPrice ? line.unitPrice.toFixed(2) : 'N/A'}</div>
        <div class="px-2 py-1 truncate">${line.quantity || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${line.discount ? `${line.discount}%` : '0%'}</div>
        <div class="px-2 py-1 truncate">${line.netPrice ? line.netPrice : 'N/A'}</div>
        <div class="px-2 py-1 flex justify-center items-center space-x-2">
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
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    if (opportunityLineForm) opportunityLineForm.dataset.editingId = line.id;
    if (submitOpportunityLineButton) submitOpportunityLineButton.textContent = 'Update Line';

    if (optyLineIdDisplayGroup) optyLineIdDisplayGroup.classList.remove('hidden');
    if (optyLineIdDisplay) optyLineIdDisplay.textContent = line.optyLineId || 'N/A';

    if (lineServiceDescriptionInput) lineServiceDescriptionInput.value = line.serviceDescription || '';
    if (lineUnitPriceInput) lineUnitPriceInput.value = line.unitPrice || '';
    if (lineQuantityInput) lineQuantityInput.value = line.quantity || '';
    if (lineDiscountInput) lineDiscountInput.value = line.discount || '';
    if (lineNetPriceInput) lineNetPriceInput.value = line.netPrice || '';
    if (lineStatusSelect) lineStatusSelect.value = line.status || '';

    closeAllAccordions();
    if (linesAccordionHeader && linesAccordionContent) toggleAccordion(linesAccordionHeader, linesAccordionContent);

    if (linesAccordionHeader) linesAccordionHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetOpportunityLineForm() {
    if (opportunityLineForm) opportunityLineForm.reset();
    if (opportunityLineForm) opportunityLineForm.dataset.editingId = '';
    if (submitOpportunityLineButton) submitOpportunityLineButton.textContent = 'Add Line';
    if (optyLineIdDisplayGroup) optyLineIdDisplayGroup.classList.add('hidden');
    if (optyLineIdDisplay) optyLineIdDisplay.textContent = '';
    if (lineNetPriceInput) lineNetPriceInput.value = '';
}

/* --- QUOTES CRUD --- */
async function saveQuoteHandler(e) {
    e.preventDefault();
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Error", "Please select an Opportunity first to add/edit quotes.", () => {});
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot save quote.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const quoteData = {
        quoteName: quoteNameInput.value.trim(),
        quoteDescription: quoteDescriptionInput.value.trim(),
        customer: quoteCustomerSelect.value.trim(),
        startDate: quoteStartDateInput.value,
        expireDate: quoteExpireDateInput.value,
        quoteStatus: quoteStatusSelect.value.trim(),
        quoteNetListAmount: parseFloat(quoteNetListAmountInput.value) || 0,
        quoteNetDiscount: parseFloat(quoteNetDiscountInput.value) || 0,
        quoteCurrency: quoteCurrencySelect.value.trim(),
        isFinal: quoteIsFinalCheckbox.checked
    };

    const mandatoryFields = [
        { field: quoteData.quoteName, name: "Quote Name" },
        { field: quoteData.customer, name: "Customer" },
        { field: quoteData.startDate, name: "Start Date" },
        { field: quoteData.expireDate, name: "Expire Date" },
        { field: quoteData.quoteStatus, name: "Status" },
        { field: quoteData.quoteCurrency, name: "Currency" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field) missingFields.push(item.name);
    });

    if (missingFields.length > 0) {
        showModal("Validation Error", `Please fill in all mandatory quote fields: ${[...new Set(missingFields)].join(', ')}.`, () => {});
        return;
    }

    quoteData.quoteNetAmount = (quoteData.quoteNetListAmount - quoteData.quoteNetDiscount).toFixed(2);

    const collectionPath = `${getCollectionPath(currentOpportunityCollectionType, 'opportunities')}/${currentOpportunityId}/quotes`;

    try {
        const editingId = quoteForm.dataset.editingId;
        if (editingId) {
            // Use modular Firestore syntax: doc(db, collectionPath, editingId)
            const quoteDocRef = doc(db, collectionPath, editingId);
            await setDoc(quoteDocRef, quoteData, { merge: true });
            console.log("Quote updated:", editingId);
            showModal("Success", "Quote updated successfully!", () => {});
        } else {
            // Use modular Firestore syntax: doc(collection(db, collectionPath))
            const newDocRef = doc(collection(db, collectionPath));
            const numericPart = Date.now().toString().slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, '0');
            const systemGeneratedQuoteId = 'QTE-' + numericPart;
            await setDoc(newDocRef, { ...quoteData, quoteId: systemGeneratedQuoteId, opportunityId: currentOpportunityId });
            console.log("Quote added with ID:", systemGeneratedQuoteId);
            showModal("Success", "New quote added successfully!", () => {});
        }
        resetQuoteForm();
    } catch (error) {
        console.error("Error saving quote:", error);
        showModal("Error", `Failed to save quote: ${error.message}`, () => {});
    }
}

async function deleteQuote(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot delete quote.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }
    const collectionPath = `${getCollectionPath(currentOpportunityCollectionType, 'opportunities')}/${currentOpportunityId}/quotes`;

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this quote?",
        async () => {
            try {
                // Use modular Firestore syntax: deleteDoc(doc(db, collectionPath, firestoreDocId))
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("Quote deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "Quote deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting quote:", error);
                showModal("Error", `Failed to delete quote: ${error.message}`, () => {});
            }
        }
    );
}

function listenForQuotes(opportunityId) {
    console.log("opportunities.js: listenForQuotes called for opportunityId:", opportunityId);
    if (!opportunityId || !isAuthReady || !currentUserId) {
        if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Select an Opportunity to view quotes.</p>';
        return;
    }
    // Check if db is initialized
    if (!db) {
        console.error("opportunities.js: Firestore 'db' instance is not initialized. Cannot listen for quotes.");
        if (quoteList) quoteList.innerHTML = '<p class="text-red-500 text-center col-span-full py-4">Firestore not ready to load quotes.</p>';
        return;
    }

    const collectionPath = `${getCollectionPath(currentOpportunityCollectionType, 'opportunities')}/${opportunityId}/quotes`;
    console.log("opportunities.js: Attempting to set up onSnapshot for quotes path:", collectionPath);
    // Use modular Firestore syntax: collection(db, collectionPath)
    const q = collection(db, collectionPath);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (quoteList) quoteList.innerHTML = '';
        if (snapshot.empty) {
            if (quoteList) quoteList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No quotes added for this opportunity.</p>';
        } else {
            snapshot.forEach((doc) => {
                const quote = { id: doc.id, ...doc.data() };
                displayQuote(quote);
            });
        }
        console.log("opportunities.js: Quotes data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("opportunities.js: Error listening to quotes:", error);
        if (quoteList) quoteList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading quotes: ${error.message}</p>`;
    });
    addUnsubscribe('quotes', unsubscribe);
}

function displayQuote(quote) {
    if (!quoteList) return;
    const quoteRow = document.createElement('div');
    quoteRow.className = 'data-grid-row';
    quoteRow.dataset.id = quote.id;

    const currencySymbol = getCurrencySymbol(quote.quoteCurrency);

    quoteRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${quote.quoteId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${quote.quoteName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${quote.quoteStatus || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${quote.quoteNetAmount ? `${currencySymbol}${quote.quoteNetAmount}` : 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${quote.expireDate || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-center items-center space-x-2">
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
    if (!isAuthReady || !currentUserId || !currentOpportunityId) {
        showModal("Permission Denied", "Not authenticated or no opportunity selected.", () => {});
        return;
    }
    if (quoteForm) quoteForm.dataset.editingId = quote.id;
    if (submitQuoteButton) submitQuoteButton.textContent = 'Update Quote';

    if (quoteIdDisplayGroup) quoteIdDisplayGroup.classList.remove('hidden');
    if (quoteIdDisplay) quoteIdDisplay.textContent = quote.quoteId || 'N/A';

    if (quoteNameInput) quoteNameInput.value = quote.quoteName || '';
    if (quoteDescriptionInput) quoteDescriptionInput.value = quote.quoteDescription || '';

    const currentCustomer = allCustomers.find(c => c.id === (opportunityCustomerSelect ? opportunityCustomerSelect.value : null));
    if (currentCustomer) {
        if (quoteCustomerSelect) {
            quoteCustomerSelect.innerHTML = `<option value="${currentCustomer.id}">${currentCustomer.companyName || `${currentCustomer.firstName} ${currentCustomer.lastName}`.trim() || currentCustomer.email}</option>`;
            quoteCustomerSelect.value = currentCustomer.id;
        }
    } else {
        if (quoteCustomerSelect) {
            quoteCustomerSelect.innerHTML = '<option value="">Customer Not Found</option>';
            quoteCustomerSelect.value = '';
        }
    }
    if (quoteCustomerSelect) quoteCustomerSelect.setAttribute('disabled', 'disabled');

    if (quoteStartDateInput) quoteStartDateInput.value = quote.startDate || '';
    if (quoteExpireDateInput) quoteExpireDateInput.value = quote.expireDate || '';
    if (quoteStatusSelect) quoteStatusSelect.value = quote.quoteStatus || '';
    if (quoteNetListAmountInput) quoteNetListAmountInput.value = quote.quoteNetListAmount || '';
    if (quoteNetDiscountInput) quoteNetDiscountInput.value = quote.quoteNetDiscount || '';
    if (quoteNetAmountInput) quoteNetAmountInput.value = quote.quoteNetAmount || '';
    if (quoteCurrencySelect) quoteCurrencySelect.value = quote.quoteCurrency || '';
    if (quoteIsFinalCheckbox) quoteIsFinalCheckbox.checked = quote.isFinal === true;

    closeAllAccordions();
    if (quotesAccordionHeader && quotesAccordionContent) toggleAccordion(quotesAccordionHeader, quotesAccordionContent);

    if (quotesAccordionHeader) quotesAccordionHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetQuoteForm() {
    if (quoteForm) quoteForm.reset();
    if (quoteForm) quoteForm.dataset.editingId = '';
    if (submitQuoteButton) submitQuoteButton.textContent = 'Add Quote';
    if (quoteIdDisplayGroup) quoteIdDisplayGroup.classList.add('hidden');
    if (quoteIdDisplay) quoteIdDisplay.textContent = '';
    if (quoteNetAmountInput) quoteNetAmountInput.value = '';
    if (quoteIsFinalCheckbox) quoteIsFinalCheckbox.checked = false;

    if (quoteCustomerSelect) {
        quoteCustomerSelect.innerHTML = '<option value="">Auto-filled from Opportunity</option>';
        quoteCustomerSelect.setAttribute('disabled', 'disabled');
    }
}


// Accordion Logic (re-exported for main.js to use for global close)
function areAllAccordionsClosed() {
    const accordionContents = document.querySelectorAll('#linkedObjectsAccordion .accordion-content');
    for (const content of accordionContents) {
        if (content.classList.contains('open')) {
            return false;
        }
    }
    return true;
}

function toggleAccordion(header, content) {
    if (!content || !header) return;

    if (content.classList.contains('open')) {
        content.classList.remove('open');
        content.style.maxHeight = null;
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';
        header.classList.remove('active');

        if (areAllAccordionsClosed() && currentOpportunityId) {
            setOpportunityLayout('edit_split_70_30');
        }
    } else {
        closeAllAccordions();

        content.classList.add('open');
        content.style.maxHeight = '5000px';
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
        header.classList.add('active');

        if (currentOpportunityId && window.innerWidth >= 768) {
            setOpportunityLayout('edit_split_30_70');
        }
        header.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export function closeAllAccordions() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.classList.remove('active');
        const content = header.nextElementSibling;
        if (content) {
            content.classList.remove('open');
            content.style.maxHeight = null;
            content.style.opacity = '0';
            content.style.transform = 'translateY(-10px)';
        }
    });
}
