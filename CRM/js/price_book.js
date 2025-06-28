import { db, auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe, allCurrencies } from './main.js';
import { showModal, showMessage, hideMessage, APP_SETTINGS_DOC_ID } from './utils.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variable to hold the Firestore DB instance, explicitly set by main.js
let firestoreDb = null;
let priceBookDomElementsInitialized = false; // Flag to ensure DOM elements are initialized only once

// EXPORTED: Setter function for the Firestore DB instance
export function setDbInstance(instance) {
    console.log("price_book.js: setDbInstance received:", instance);
    firestoreDb = instance; // Directly assign for robust assignment
    if (firestoreDb) {
        console.log("price_book.js: Firestore DB instance successfully set.");
    } else {
        console.error("price_book.js: CRITICAL ERROR: Firestore DB instance is still null after direct assignment. This means the 'instance' passed was null/undefined.");
    }
}

// DOM elements for price_book.js
let priceBookForm;
let priceBookFormTitle;
let priceBookIdDisplayGroup;
let priceBookIdDisplay;
let priceBookNameInput;
let priceBookCurrencySelect;
let submitPriceBookButton;
let resetPriceBookFormButton;
let priceBookList;
let adminPriceBookMessageDiv;

/**
 * Initializes DOM elements and static event listeners for price_book module.
 * This should be called once, defensively.
 */
function initializePriceBookDomElements() {
    if (priceBookDomElementsInitialized) return; // Already initialized

    priceBookForm = document.getElementById('priceBookForm');
    priceBookFormTitle = document.getElementById('priceBookFormTitle');
    priceBookIdDisplayGroup = document.getElementById('priceBookIdDisplayGroup');
    priceBookIdDisplay = document.getElementById('priceBookIdDisplay');
    priceBookNameInput = document.getElementById('priceBookName');
    priceBookCurrencySelect = document.getElementById('priceBookCurrency');
    submitPriceBookButton = document.getElementById('submitPriceBookButton');
    resetPriceBookFormButton = document.getElementById('resetPriceBookFormButton');
    priceBookList = document.getElementById('priceBookList');
    adminPriceBookMessageDiv = document.getElementById('adminPriceBookMessageDiv');

    // Add event listeners that don't depend on Firebase state
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

    priceBookDomElementsInitialized = true;
    console.log("price_book.js: DOM elements and static event listeners initialized.");
}


/**
 * Main initialization function for the Price Book module.
 */
export async function initPriceBookModule() {
    console.log("price_book.js: initPriceBookModule called.");
    initializePriceBookDomElements(); // Ensure DOM elements are ready

    // CRITICAL: Ensure firestoreDb is available before proceeding
    if (!firestoreDb || !isAuthReady || !currentUserId) {
        console.warn("price_book.js: Firestore DB or Auth is not ready. Cannot initialize Price Book module fully.");
        if (priceBookList) priceBookList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing... Waiting for database connection and user authentication.</p>';
        disablePriceBookForm(); // Disable form if not ready
        return;
    }
    enablePriceBookForm(); // Enable form if ready

    populateCurrencyDropdown(); // Populate currencies for price book form
    listenForPriceBooks(); // Start listening for price book list changes
    resetPriceBookForm(); // Reset form to initial state
}

function disablePriceBookForm() {
    priceBookForm?.querySelectorAll('input, select, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    if (submitPriceBookButton) submitPriceBookButton.textContent = 'Auth/DB Not Ready';
}

function enablePriceBookForm() {
    priceBookForm?.querySelectorAll('input, select, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    if (submitPriceBookButton) submitPriceBookButton.textContent = 'Add Price Book';
}

function populateCurrencyDropdown() {
    if (!priceBookCurrencySelect) return;
    priceBookCurrencySelect.innerHTML = '<option value="">Select Currency</option>';
    if (allCurrencies && allCurrencies.length > 0) {
        allCurrencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency.id; // Currency code as value
            option.textContent = `${currency.currencyName} (${currency.symbol})`;
            priceBookCurrencySelect.appendChild(option);
        });
    }
}

/* --- PRICE BOOK CRUD OPERATIONS --- */
async function savePriceBook(priceBookId = null) {
    console.log("price_book.js: savePriceBook called.");
    if (!firestoreDb || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage price books, or Firestore is not ready.", () => {});
        return;
    }
    if (!priceBookNameInput?.value || !priceBookCurrencySelect?.value) {
        showMessage('Please fill in all required fields.', 'error', adminPriceBookMessageDiv);
        return;
    }

    submitPriceBookButton.disabled = true;
    submitPriceBookButton.textContent = 'Saving...';
    hideMessage(adminPriceBookMessageDiv);

    const isEditing = !!priceBookId;
    let docId = priceBookId;

    const priceBookData = {
        name: priceBookNameInput.value,
        currency: priceBookCurrencySelect.value,
        lastModified: new Date().toISOString(),
        createdBy: currentUserId,
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        const collectionRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/price_books`);
        if (isEditing) {
            const docRef = doc(collectionRef, docId);
            await setDoc(docRef, priceBookData, { merge: true });
            showMessage('Price Book updated successfully!', 'success', adminPriceBookMessageDiv);
            console.log("price_book.js: Price Book updated:", docId, priceBookData);
        } else {
            const newDocRef = await addDoc(collectionRef, priceBookData);
            docId = newDocRef.id;
            showMessage('Price Book added successfully!', 'success', adminPriceBookMessageDiv);
            console.log("price_book.js: Price Book added with ID:", docId, priceBookData);
        }
        resetPriceBookForm();
    } catch (error) {
        console.error("price_book.js: Error saving price book:", error);
        showMessage(`Error saving price book: ${error.message}`, 'error', adminPriceBookMessageDiv);
    } finally {
        submitPriceBookButton.disabled = false;
        submitPriceBookButton.textContent = isEditing ? 'Update Price Book' : 'Add Price Book';
    }
}

async function editPriceBook(priceBookId) {
    console.log("price_book.js: editPriceBook called for ID:", priceBookId);
    if (!firestoreDb || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can edit price books, or Firestore is not ready.", () => {});
        return;
    }
    hideMessage(adminPriceBookMessageDiv);
    priceBookFormTitle.textContent = "Edit Price Book";
    submitPriceBookButton.textContent = "Update Price Book";
    priceBookIdDisplayGroup.classList.remove('hidden');
    priceBookIdDisplay.value = priceBookId; // Use .value for input fields
    priceBookForm.dataset.editingId = priceBookId;

    const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/price_books`, priceBookId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            priceBookNameInput.value = data.name;
            priceBookCurrencySelect.value = data.currency;
        } else {
            showMessage('Price Book not found.', 'error', adminPriceBookMessageDiv);
            resetPriceBookForm();
        }
    } catch (error) {
        console.error("price_book.js: Error loading price book for edit:", error);
        showMessage(`Error loading price book: ${error.message}`, 'error', adminPriceBookMessageDiv);
    }
}

async function deletePriceBook(priceBookId) {
    console.log("price_book.js: deletePriceBook called for ID:", priceBookId);
    if (!firestoreDb || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can delete price books, or Firestore is not ready.", () => {});
        return;
    }
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this price book? This action cannot be undone.",
        async () => {
            try {
                const docRef = doc(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/price_books`, priceBookId);
                await deleteDoc(docRef);
                showMessage('Price Book deleted successfully!', 'success', adminPriceBookMessageDiv);
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
    priceBookIdDisplay.value = '';
    priceBookForm.dataset.editingId = ''; // Clear editing ID
    hideMessage(adminPriceBookMessageDiv);
    populateCurrencyDropdown(); // Re-populate to reset selection
}

function listenForPriceBooks() {
    console.log("price_book.js: listenForPriceBooks called.");
    if (!firestoreDb || !isAuthReady || !currentUserId || !isAdmin) {
        console.warn("price_book.js: listenForPriceBooks: Firestore DB, Auth, or Admin status not ready. Cannot set up listener.");
        if (priceBookList) priceBookList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Access Denied: Only administrators can view price books, or Firestore is not ready.</p>';
        return;
    }

    const priceBooksColRef = collection(firestoreDb, `artifacts/${db.app.options.projectId}/public/data/price_books`);
    const q = priceBooksColRef; // No specific query for now, just all price books

    removeUnsubscribe('priceBooks'); // Remove previous listener if any
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!priceBookList) return;
        priceBookList.innerHTML = '';
        if (snapshot.empty) {
            priceBookList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No price books found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayPriceBook({ id: doc.id, ...doc.data() });
        });
        console.log("price_book.js: Price books list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("price_book.js: Error listening to price books:", error);
        if (priceBookList) priceBookList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading price books: ${error.message}</p>`;
    });

    addUnsubscribe('priceBooks', unsubscribe);
}

function displayPriceBook(priceBook) {
    if (!priceBookList) return;
    const priceBookRow = document.createElement('div');
    priceBookRow.className = 'data-grid-row';
    priceBookRow.dataset.id = priceBook.id;

    const currencyName = allCurrencies.find(c => c.id === priceBook.currency)?.currencyName || priceBook.currency;

    priceBookRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${priceBook.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${priceBook.name || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${currencyName}</div>
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
