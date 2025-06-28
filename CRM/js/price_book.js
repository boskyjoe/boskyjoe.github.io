import { auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe, appId as mainAppId, allCurrencies } from './main.js';
import { showModal, showMessage, hideMessage, APP_SETTINGS_DOC_ID } from './utils.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variable to hold the Firestore DB instance, explicitly set by main.js
let firestoreDb = null;
// Use the projectId exported from main.js directly. This should be the most reliable source.
let projectId = mainAppId;
let priceBookDomElementsInitialized = false; // Flag to ensure DOM elements are initialized only once

// EXPORTED: Setter function for the Firestore DB instance
export function setDbInstance(instance) {
    console.log("price_book.js: setDbInstance received:", instance);
    firestoreDb = instance; // Directly assign for robust assignment
    if (firestoreDb) {
        console.log("price_book.js: Firestore DB instance successfully set. projectId:", projectId);
    } else {
        console.error("price_book.js: CRITICAL ERROR: Firestore DB instance is still null after direct assignment. This means the 'instance' passed was null/undefined.");
        projectId = null;
    }
}

// DOM elements for price_book.js
let priceBookManagementSection;
let priceBookForm;
let priceBookFormTitle;
let priceBookIdDisplayGroup;
let priceBookIdDisplay;
let priceBookNameInput;
let priceBookCurrencySelect;
let priceBookDescriptionInput;
let submitPriceBookButton;
let priceBookList;
let resetPriceBookFormButton;
let linkedPriceBookItemsAccordion;
let priceBookItemsAccordionHeader;
let priceBookItemsAccordionContent;

let priceBookItemForm;
let priceBookItemIdDisplayGroup;
let priceBookItemIdDisplay;
let priceBookItemNameInput;
let priceBookItemDescriptionInput;
let priceBookItemUnitPriceInput;
let priceBookItemCostInput;
let priceBookItemMarkupInput;
let priceBookItemSKUInput;
let submitPriceBookItemButton;
let priceBookItemList;
let resetPriceBookItemFormButton;


// State variables for currently selected price book and its items
let currentPriceBookId = null;
let currentPriceBook = null;

/**
 * Initializes DOM elements and static event listeners for price book module.
 * This should be called once, defensively.
 */
function initializePriceBookDomElements() {
    if (priceBookDomElementsInitialized) return;

    priceBookManagementSection = document.getElementById('price-book-management-section');
    priceBookForm = document.getElementById('priceBookForm');
    priceBookFormTitle = document.getElementById('priceBookFormTitle');
    priceBookIdDisplayGroup = document.getElementById('priceBookIdDisplayGroup');
    priceBookIdDisplay = document.getElementById('priceBookIdDisplay');
    priceBookNameInput = document.getElementById('priceBookName');
    priceBookCurrencySelect = document.getElementById('priceBookCurrency');
    priceBookDescriptionInput = document.getElementById('priceBookDescription');
    submitPriceBookButton = document.getElementById('submitPriceBookButton');
    priceBookList = document.getElementById('priceBookList');
    resetPriceBookFormButton = document.getElementById('resetPriceBookFormButton');
    linkedPriceBookItemsAccordion = document.getElementById('linkedPriceBookItemsAccordion');
    priceBookItemsAccordionHeader = document.getElementById('priceBookItemsAccordionHeader');
    priceBookItemsAccordionContent = priceBookItemsAccordionHeader ? priceBookItemsAccordionHeader.nextElementSibling : null;

    priceBookItemForm = document.getElementById('priceBookItemForm');
    priceBookItemIdDisplayGroup = document.getElementById('priceBookItemIdDisplayGroup');
    priceBookItemIdDisplay = document.getElementById('priceBookItemIdDisplay');
    priceBookItemNameInput = document.getElementById('priceBookItemName');
    priceBookItemDescriptionInput = document.getElementById('priceBookItemDescription');
    priceBookItemUnitPriceInput = document.getElementById('priceBookItemUnitPrice');
    priceBookItemCostInput = document.getElementById('priceBookItemCost');
    priceBookItemMarkupInput = document.getElementById('priceBookItemMarkup');
    priceBookItemSKUInput = document.getElementById('priceBookItemSKU');
    submitPriceBookItemButton = document.getElementById('submitPriceBookItemButton');
    priceBookItemList = document.getElementById('priceBookItemList');
    resetPriceBookItemFormButton = document.getElementById('resetPriceBookItemFormButton');

    // Add static event listeners
    if (priceBookForm) {
        priceBookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = priceBookForm.dataset.editingId;
            await savePriceBook(editingId || null);
        });
    }
    if (resetPriceBookFormButton) {
        resetPriceBookFormButton.addEventListener('click', resetPriceBookForm);
    }
    if (priceBookItemsAccordionHeader) {
        priceBookItemsAccordionHeader.addEventListener('click', () => toggleAccordion(priceBookItemsAccordionHeader, priceBookItemsAccordionContent));
    }

    // Price Book Item Form Listeners
    if (priceBookItemForm) {
        priceBookItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = priceBookItemForm.dataset.editingId;
            await savePriceBookItem(editingId || null);
        });
    }
    if (priceBookItemUnitPriceInput && priceBookItemCostInput && priceBookItemMarkupInput) {
        priceBookItemUnitPriceInput.addEventListener('input', calculateMarkup);
        priceBookItemCostInput.addEventListener('input', calculateMarkup);
        priceBookItemMarkupInput.addEventListener('input', calculateUnitPrice);
    }
    if (resetPriceBookItemFormButton) {
        resetPriceBookItemFormButton.addEventListener('click', resetPriceBookItemForm);
    }

    priceBookDomElementsInitialized = true;
    console.log("price_book.js: DOM elements and static event listeners initialized.");
}


/**
 * Main initialization function for the Price Book module.
 */
export async function initPriceBookModule() {
    console.log("price_book.js: initPriceBookModule called.");
    initializePriceBookDomElements();

    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        console.warn("price_book.js: Firestore DB, Project ID, Auth, or Admin status is not ready. Cannot initialize Price Book module fully.");
        if (priceBookList) priceBookList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing... Waiting for database connection and admin authentication.</p>';
        disablePriceBookForm();
        return;
    }
    enablePriceBookForm();

    populateCurrencyDropdown(); // Populate currency for Price Book form

    listenForPriceBooks(); // Start listening for main price book list changes
    resetPriceBookForm();
    resetPriceBookItemForm();
}

function disablePriceBookForm() {
    priceBookForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    if (submitPriceBookButton) submitPriceBookButton.textContent = 'Auth/DB Not Ready';
}

function enablePriceBookForm() {
    priceBookForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    if (submitPriceBookButton) submitPriceBookButton.textContent = 'Add Price Book';
}


function populateCurrencyDropdown() {
    if (!priceBookCurrencySelect) return;
    priceBookCurrencySelect.innerHTML = '<option value="">Select Currency</option>';

    if (allCurrencies && allCurrencies.length > 0) {
        allCurrencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency.id;
            option.textContent = `${currency.currencyName} (${currency.symbol})`;
            priceBookCurrencySelect.appendChild(option);
        });
    }
    if (priceBookCurrencySelect.querySelector('option[value="USD"]')) {
        priceBookCurrencySelect.value = 'USD';
    }
}

// Helper for accordion toggle
function toggleAccordion(header, content) {
    if (!header || !content) return;
    header.classList.toggle('active');
    if (content.style.maxHeight) {
        content.style.maxHeight = null;
    } else {
        content.style.maxHeight = content.scrollHeight + "px";
    }
}

function calculateMarkup() {
    if (!priceBookItemUnitPriceInput || !priceBookItemCostInput || !priceBookItemMarkupInput) return;
    const unitPrice = parseFloat(priceBookItemUnitPriceInput.value) || 0;
    const cost = parseFloat(priceBookItemCostInput.value) || 0;

    if (cost > 0) {
        const markup = ((unitPrice - cost) / cost) * 100;
        priceBookItemMarkupInput.value = markup.toFixed(2);
    } else {
        priceBookItemMarkupInput.value = '0.00';
    }
}

function calculateUnitPrice() {
    if (!priceBookItemUnitPriceInput || !priceBookItemCostInput || !priceBookItemMarkupInput) return;
    const cost = parseFloat(priceBookItemCostInput.value) || 0;
    const markup = parseFloat(priceBookItemMarkupInput.value) || 0;

    if (cost > 0 && markup > -100) { // Avoid division by zero or negative net cost
        const unitPrice = cost * (1 + (markup / 100));
        priceBookItemUnitPriceInput.value = unitPrice.toFixed(2);
    } else {
        priceBookItemUnitPriceInput.value = '0.00';
    }
}


/* --- PRICE BOOK CRUD OPERATIONS --- */
async function savePriceBook(priceBookId = null) {
    console.log("price_book.js: savePriceBook called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Error", "Authentication, Database, or Admin status not ready. Please sign in as an admin.", () => {});
        return;
    }

    if (!priceBookNameInput?.value || !priceBookCurrencySelect?.value) {
        showMessage('Please fill in all required price book fields.', 'error', priceBookForm);
        return;
    }

    submitPriceBookButton.disabled = true;
    submitPriceBookButton.textContent = 'Saving...';
    hideMessage(priceBookForm);

    const isEditing = !!priceBookId;
    let docId = priceBookId;

    const priceBookData = {
        name: priceBookNameInput.value,
        currency: priceBookCurrencySelect.value,
        description: priceBookDescriptionInput.value,
        lastModified: new Date().toISOString(),
        createdBy: currentUserId,
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        const collectionRef = collection(firestoreDb, `app_metadata`, APP_SETTINGS_DOC_ID, `price_books`); // Subcollection under app_metadata
        if (isEditing) {
            const docRef = doc(collectionRef, docId);
            await setDoc(docRef, priceBookData, { merge: true });
            showMessage('Price Book updated successfully!', 'success', priceBookForm);
            console.log("price_book.js: Price Book updated:", docId, priceBookData);
        } else {
            const newDocRef = await addDoc(collectionRef, priceBookData);
            docId = newDocRef.id;
            showMessage('Price Book added successfully!', 'success', priceBookForm);
            console.log("price_book.js: Price Book added with ID:", docId, priceBookData);
        }
        resetPriceBookForm();
        // If editing, keep linked items accordion visible
        if (isEditing) {
            currentPriceBookId = docId;
            currentPriceBook = priceBookData; // Update current price book object
            linkedPriceBookItemsAccordion.classList.remove('hidden');
            listenForPriceBookItems(currentPriceBookId);
        }
    } catch (error) {
        console.error("price_book.js: Error saving price book:", error);
        showMessage(`Error saving price book: ${error.message}`, 'error', priceBookForm);
    } finally {
        submitPriceBookButton.disabled = false;
        submitPriceBookButton.textContent = isEditing ? 'Update Price Book' : 'Add Price Book';
    }
}

async function editPriceBook(priceBookId) {
    console.log("price_book.js: editPriceBook called for ID:", priceBookId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Error", "Authentication, Database, or Admin status not ready. Please sign in as an admin.", () => {});
        return;
    }

    hideMessage(priceBookForm);
    priceBookFormTitle.textContent = "Edit Price Book";
    submitPriceBookButton.textContent = "Update Price Book";
    priceBookIdDisplayGroup.classList.remove('hidden');
    priceBookIdDisplay.textContent = priceBookId;
    priceBookForm.dataset.editingId = priceBookId;

    const docRef = doc(firestoreDb, `app_metadata`, APP_SETTINGS_DOC_ID, `price_books`, priceBookId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentPriceBookId = priceBookId;
            currentPriceBook = data; // Store the full price book data

            priceBookNameInput.value = data.name || '';
            priceBookCurrencySelect.value = data.currency || '';
            priceBookDescriptionInput.value = data.description || '';

            // Show linked items accordion and load items
            linkedPriceBookItemsAccordion.classList.remove('hidden');
            listenForPriceBookItems(priceBookId);

            priceBookForm.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } else {
            showMessage('Price Book not found.', 'error', priceBookForm);
            resetPriceBookForm();
        }
    } catch (error) {
        console.error("price_book.js: Error loading price book for edit:", error);
        showMessage(`Error loading price book: ${error.message}`, 'error', priceBookForm);
    }
}

async function deletePriceBook(priceBookId) {
    console.log("price_book.js: deletePriceBook called for ID:", priceBookId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Error", "Authentication, Database, or Admin status not ready. Please sign in as an admin.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this price book and ALL its associated items? This action cannot be undone.",
        async () => {
            try {
                // Delete subcollection items first
                const itemsRef = collection(firestoreDb, `app_metadata/${APP_SETTINGS_DOC_ID}/price_books/${priceBookId}/items`);
                const itemsSnapshot = await getDocs(itemsRef);
                const deleteItemPromises = itemsSnapshot.docs.map(d => deleteDoc(d.ref));
                await Promise.all(deleteItemPromises);

                // Then delete the main price book document
                const docRef = doc(firestoreDb, `app_metadata`, APP_SETTINGS_DOC_ID, `price_books`, priceBookId);
                await deleteDoc(docRef);
                showMessage('Price Book and its items deleted successfully!', 'success', priceBookForm);
                resetPriceBookForm();
                console.log("price_book.js: Price Book deleted:", priceBookId);
            } catch (error) {
                console.error("price_book.js: Error deleting price book:", error);
                showModal("Error", `Error deleting price book: ${error.message}`, () => {});
            }
        }
    );
}

function resetPriceBookForm() {
    if (!priceBookForm) return;
    priceBookForm.reset();
    priceBookFormTitle.textContent = "Add New Price Book";
    submitPriceBookButton.textContent = "Add Price Book";
    priceBookIdDisplayGroup.classList.add('hidden');
    priceBookIdDisplay.textContent = '';
    priceBookForm.dataset.editingId = '';
    hideMessage(priceBookForm);
    linkedPriceBookItemsAccordion.classList.add('hidden'); // Hide accordion on new/reset
    currentPriceBookId = null; // Clear context
    currentPriceBook = null;
    resetPriceBookItemForm(); // Reset child form as well
}

function listenForPriceBooks() {
    console.log("price_book.js: listenForPriceBooks called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        console.warn("price_book.js: listenForPriceBooks: Firestore DB, Project ID, Auth, or Admin status is not ready. Cannot set up listener.");
        if (priceBookList) priceBookList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Waiting for database connection and admin authentication...</p>';
        return;
    }

    const priceBooksColRef = collection(firestoreDb, `app_metadata`, APP_SETTINGS_DOC_ID, `price_books`);
    const q = query(priceBooksColRef);

    removeUnsubscribe('priceBooks');
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!priceBookList) return;
        priceBookList.innerHTML = '';
        if (snapshot.empty) {
            priceBookList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No price books found.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayPriceBook({ id: doc.id, ...doc.data() });
        });
        console.log("price_book.js: Price Books list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("price_book.js: Error listening to price books:", error);
        if (priceBookList) priceBookList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading price books: ${error.message}</p>`;
    });

    addUnsubscribe('priceBooks', unsubscribe);
}

function displayPriceBook(priceBook) {
    if (!priceBookList) return;
    const priceBookRow = document.createElement('div');
    priceBookRow.className = 'data-grid-row';
    priceBookRow.dataset.id = priceBook.id;

    const currencySymbol = allCurrencies.find(c => c.id === priceBook.currency)?.symbol || priceBook.currency;

    priceBookRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${priceBook.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${priceBook.name || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currencySymbol}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${priceBook.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${priceBook.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    priceBookList.appendChild(priceBookRow);

    priceBookRow.querySelector('.edit-btn').addEventListener('click', () => editPriceBook(priceBook.id));
    priceBookRow.querySelector('.delete-btn').addEventListener('click', () => deletePriceBook(priceBook.id));
}


/* --- PRICE BOOK ITEM CRUD OPERATIONS --- */
async function savePriceBookItem(itemId = null) {
    console.log("price_book.js: savePriceBookItem called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin || !currentPriceBookId) {
        showModal("Error", "Authentication, Database, Admin status, or Price Book not ready. Please sign in as an admin and select a price book.", () => {});
        return;
    }

    if (!priceBookItemNameInput?.value || !priceBookItemUnitPriceInput?.value || !priceBookItemCostInput?.value || !priceBookItemMarkupInput?.value || !priceBookItemSKUInput?.value) {
        showMessage('Please fill in all required price book item fields.', 'error', priceBookItemForm);
        return;
    }

    submitPriceBookItemButton.disabled = true;
    submitPriceBookItemButton.textContent = 'Saving...';
    hideMessage(priceBookItemForm);

    const isEditing = !!itemId;
    let docId = itemId;

    const itemData = {
        name: priceBookItemNameInput.value,
        description: priceBookItemDescriptionInput.value,
        unitPrice: parseFloat(priceBookItemUnitPriceInput.value),
        cost: parseFloat(priceBookItemCostInput.value),
        markup: parseFloat(priceBookItemMarkupInput.value),
        sku: priceBookItemSKUInput.value,
        priceBookId: currentPriceBookId, // Link to parent price book
        lastModified: new Date().toISOString(),
        createdBy: currentUserId,
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        const itemsCollectionRef = collection(firestoreDb, `app_metadata/${APP_SETTINGS_DOC_ID}/price_books/${currentPriceBookId}/items`);
        if (isEditing) {
            const docRef = doc(itemsCollectionRef, docId);
            await setDoc(docRef, itemData, { merge: true });
            showMessage('Price Book Item updated successfully!', 'success', priceBookItemForm);
            console.log("price_book.js: Price Book Item updated:", docId, itemData);
        } else {
            const newDocRef = await addDoc(itemsCollectionRef, itemData);
            docId = newDocRef.id;
            showMessage('Price Book Item added successfully!', 'success', priceBookItemForm);
            console.log("price_book.js: Price Book Item added with ID:", docId, itemData);
        }
        resetPriceBookItemForm();
    } catch (error) {
        console.error("price_book.js: Error saving price book item:", error);
        showMessage(`Error saving item: ${error.message}`, 'error', priceBookItemForm);
    } finally {
        submitPriceBookItemButton.disabled = false;
        submitPriceBookItemButton.textContent = isEditing ? 'Update Item' : 'Add Item';
    }
}

async function editPriceBookItem(itemId) {
    console.log("price_book.js: editPriceBookItem called for ID:", itemId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin || !currentPriceBookId) {
        showModal("Error", "Authentication, Database, Admin status, or Price Book not ready. Please sign in as an admin and select a price book.", () => {});
        return;
    }

    hideMessage(priceBookItemForm);
    priceBookItemForm.querySelector('h4').textContent = "Edit Price Book Item";
    submitPriceBookItemButton.textContent = "Update Item";
    priceBookItemIdDisplayGroup.classList.remove('hidden');
    priceBookItemIdDisplay.textContent = itemId;
    priceBookItemForm.dataset.editingId = itemId;

    const docRef = doc(firestoreDb, `app_metadata/${APP_SETTINGS_DOC_ID}/price_books/${currentPriceBookId}/items`, itemId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            priceBookItemNameInput.value = data.name || '';
            priceBookItemDescriptionInput.value = data.description || '';
            priceBookItemUnitPriceInput.value = data.unitPrice || '';
            priceBookItemCostInput.value = data.cost || '';
            priceBookItemMarkupInput.value = data.markup || '';
            priceBookItemSKUInput.value = data.sku || '';
            calculateMarkup(); // Ensure markup is calculated on load if fields are linked
        } else {
            showMessage('Price Book Item not found.', 'error', priceBookItemForm);
            resetPriceBookItemForm();
        }
    } catch (error) {
        console.error("price_book.js: Error loading price book item for edit:", error);
        showMessage(`Error loading item: ${error.message}`, 'error', priceBookItemForm);
    }
}

async function deletePriceBookItem(itemId) {
    console.log("price_book.js: deletePriceBookItem called for ID:", itemId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin || !currentPriceBookId) {
        showModal("Error", "Authentication, Database, Admin status, or Price Book not ready. Please sign in as an admin and select a price book.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this price book item? This action cannot be undone.",
        async () => {
            try {
                const docRef = doc(firestoreDb, `app_metadata/${APP_SETTINGS_DOC_ID}/price_books/${currentPriceBookId}/items`, itemId);
                await deleteDoc(docRef);
                showMessage('Price Book Item deleted successfully!', 'success', priceBookItemForm);
                resetPriceBookItemForm();
                console.log("price_book.js: Price Book Item deleted:", itemId);
            } catch (error) {
                console.error("price_book.js: Error deleting price book item:", error);
                showModal("Error", `Error deleting item: ${error.message}`, () => {});
            }
        }
    );
}

function resetPriceBookItemForm() {
    if (!priceBookItemForm) return;
    priceBookItemForm.reset();
    priceBookItemForm.querySelector('h4').textContent = "Add New Price Book Item";
    submitPriceBookItemButton.textContent = "Add Item";
    priceBookItemIdDisplayGroup.classList.add('hidden');
    priceBookItemIdDisplay.textContent = '';
    priceBookItemForm.dataset.editingId = '';
    hideMessage(priceBookItemForm);
    calculateMarkup(); // Reset calculations
}

function listenForPriceBookItems(priceBookId) {
    console.log("price_book.js: listenForPriceBookItems called for ID:", priceBookId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin || !priceBookId) {
        console.warn("price_book.js: listenForPriceBookItems: Firestore DB, Project ID, Auth, Admin status, or Price Book ID not ready. Cannot set up listener.");
        if (priceBookItemList) priceBookItemList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No items available for this price book.</p>';
        return;
    }

    const itemsColRef = collection(firestoreDb, `app_metadata/${APP_SETTINGS_DOC_ID}/price_books/${priceBookId}/items`);
    const q = query(itemsColRef);

    removeUnsubscribe('priceBookItems');
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!priceBookItemList) return;
        priceBookItemList.innerHTML = '';
        if (snapshot.empty) {
            priceBookItemList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No items found for this price book. Add them above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayPriceBookItem({ id: doc.id, ...doc.data() });
        });
        console.log("price_book.js: Price Book Items list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("price_book.js: Error listening to price book items:", error);
        if (priceBookItemList) priceBookItemList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading items: ${error.message}</p>`;
    });

    addUnsubscribe('priceBookItems', unsubscribe);
}

function displayPriceBookItem(item) {
    if (!priceBookItemList) return;
    const itemRow = document.createElement('div');
    itemRow.className = 'data-grid-row';
    itemRow.dataset.id = item.id;

    // Use currentPriceBook's currency for displaying item prices if available
    const currencySymbol = currentPriceBook ? (allCurrencies.find(c => c.id === currentPriceBook.currency)?.symbol || currentPriceBook.currency) : '';

    itemRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${item.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${item.name || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${item.sku || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currencySymbol} ${item.unitPrice ? item.unitPrice.toFixed(2) : '0.00'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${currencySymbol} ${item.cost ? item.cost.toFixed(2) : '0.00'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${item.markup ? item.markup.toFixed(2) : '0.00'}%</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${item.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${item.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    priceBookItemList.appendChild(itemRow);

    itemRow.querySelector('.edit-btn').addEventListener('click', () => editPriceBookItem(item.id));
    itemRow.querySelector('.delete-btn').addEventListener('click', () => deletePriceBookItem(item.id));
}
