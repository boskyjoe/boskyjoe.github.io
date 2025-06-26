import { db, auth, currentUserId, isAdmin, addUnsubscribe, removeUnsubscribe, isAuthReady } from './main.js'; // Ensure isAuthReady is explicitly imported
import { showModal, getCollectionPath, APP_SETTINGS_DOC_ID } from './utils.js';
import { fetchCurrencies, allCurrencies, getCurrencySymbol } from './admin_data.js'; // Import currency data and functions

import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Price Book Module specific DOM elements
let priceBookManagementSection;
let priceBookForm;
let priceBookFormTitle;
let priceBookIdDisplayGroup;
let priceBookIdDisplay;
let priceBookNameInput;
let priceBookCurrencySelect;
let submitPriceBookButton;
let adminPriceBookMessageDiv;
let priceBookList;

// Global data for Price Books (fetched from Firestore)
export let allPriceBooks = [];

// --- Debugging Logs (Added) ---
console.log("price_book.js: Module loaded.");
console.log("price_book.js: Initial imported state - db:", db, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId, "isAdmin:", isAdmin);
// --- End Debugging Logs ---

// Initialize Price Book module elements and event listeners
export async function initPriceBookModule() {
    console.log("price_book.js: initPriceBookModule called.");
    console.log("price_book.js: initPriceBookModule current state - db:", db, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId, "isAdmin:", isAdmin);

    // Ensure DOM elements are initialized only once
    if (!priceBookManagementSection) {
        priceBookManagementSection = document.getElementById('price-book-management-section');
        priceBookForm = document.getElementById('priceBookForm');
        priceBookFormTitle = document.getElementById('priceBookFormTitle');
        priceBookIdDisplayGroup = document.getElementById('priceBookIdDisplayGroup');
        priceBookIdDisplay = document.getElementById('priceBookIdDisplay');
        priceBookNameInput = document.getElementById('priceBookName');
        priceBookCurrencySelect = document.getElementById('priceBookCurrency');
        submitPriceBookButton = document.getElementById('submitPriceBookButton');
        adminPriceBookMessageDiv = document.getElementById('adminPriceBookMessageDiv');
        priceBookList = document.getElementById('priceBookList');

        // Add event listeners
        if (priceBookForm) {
            priceBookForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const priceBookData = {
                    priceBookName: priceBookNameInput.value.trim(),
                    currencyCode: priceBookCurrencySelect.value.trim()
                };
                const editingId = priceBookForm.dataset.editingId;
                await savePriceBook(priceBookData, editingId || null);
            });
        }
        document.getElementById('resetPriceBookFormButton')?.addEventListener('click', resetPriceBookForm);
    }

    // Ensure initial state and load data
    await fetchCurrencies(); // Ensure currency data is loaded for dropdown
    populateCurrencySelect();
    resetPriceBookForm();
    if (submitPriceBookButton) {
        if (isAuthReady && currentUserId && isAdmin) {
            submitPriceBookButton.removeAttribute('disabled');
        } else {
            submitPriceBookButton.setAttribute('disabled', 'disabled');
        }
    }
    listenForPriceBooks();
}

// Populate the currency dropdown for price book form
function populateCurrencySelect() {
    if (!priceBookCurrencySelect) return;
    priceBookCurrencySelect.innerHTML = '<option value="">Select Currency</option>';

    const sortedCurrencies = [...allCurrencies].sort((a, b) => a.id.localeCompare(b.id));

    sortedCurrencies.forEach(currency => {
        const option = document.createElement('option');
        option.value = currency.id; // currency code is the ID
        option.textContent = `${currency.id} (${currency.symbol}) - ${currency.currencyName}`;
        priceBookCurrencySelect.appendChild(option);
    });
}


// Save (Add/Update) a Price Book
async function savePriceBook(priceBookData, existingPriceBookDocId = null) {
    console.log("price_book.js: savePriceBook called.");
    console.log("price_book.js: savePriceBook current state - db:", db, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId, "isAdmin:", isAdmin);

    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage price books. Please ensure you are logged in as an Admin.", () => {});
        return;
    }
    if (!db) {
        console.error("price_book.js: Firestore 'db' instance is not initialized. Cannot save price book.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const mandatoryFields = [
        { field: priceBookData.priceBookName, name: "Price Book Name" },
        { field: priceBookData.currencyCode, name: "Currency" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field || (typeof item.field === 'string' && item.field === '')) {
            missingFields.push(item.name);
        }
    });

    if (missingFields.length > 0) {
        showModal("Validation Error", `Please fill in all mandatory fields: ${[...new Set(missingFields)].join(', ')}.`, () => {});
        return;
    }

    // Collection path: app_metadata / APP_SETTINGS_DOC_ID / price_books_data
    const collectionPath = `app_metadata/${APP_SETTINGS_DOC_ID}/price_books_data`;

    try {
        if (existingPriceBookDocId) {
            const priceBookDocRef = doc(db, collectionPath, existingPriceBookDocId);
            await setDoc(priceBookDocRef, priceBookData, { merge: true });
            console.log("Price Book updated:", existingPriceBookDocId);
            showModal("Success", "Price Book updated successfully!", () => {});
        } else {
            const newDocRef = doc(collection(db, collectionPath));
            const numericPart = Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const systemGeneratedId = 'PBK-' + numericPart;
            await setDoc(newDocRef, { ...priceBookData, priceBookId: systemGeneratedId });
            console.log("Price Book added with system-generated ID:", systemGeneratedId);
            showModal("Success", "New Price Book created successfully!", () => {});
        }
        resetPriceBookForm();
    } catch (error) {
        console.error("Error saving price book:", error);
        showModal("Error", `Failed to save price book: ${error.message}`, () => {});
    }
}

// Delete a Price Book
async function deletePriceBook(firestoreDocId) {
    console.log("price_book.js: deletePriceBook called.");
    console.log("price_book.js: deletePriceBook current state - db:", db, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId, "isAdmin:", isAdmin);

    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage price books. Please ensure you are logged in as an Admin.", () => {});
        return;
    }
    if (!db) {
        console.error("price_book.js: Firestore 'db' instance is not initialized. Cannot delete price book.");
        showModal("Error", "Firestore is not ready. Please try again.", () => {});
        return;
    }

    const collectionPath = `app_metadata/${APP_SETTINGS_DOC_ID}/price_books_data`;

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this price book? This action cannot be undone.",
        async () => {
            try {
                const priceBookDocRef = doc(db, collectionPath, firestoreDocId);
                await deleteDoc(priceBookDocRef);
                console.log("Price Book deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "Price Book deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting price book:", error);
                showModal("Error", `Failed to delete price book: ${error.message}`, () => {});
            }
        }
    );
}

// Listen for real-time updates to Price Books
function listenForPriceBooks() {
    console.log("price_book.js: listenForPriceBooks called.");
    console.log("price_book.js: listenForPriceBooks current state - db:", db, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId, "isAdmin:", isAdmin);

    if (!isAuthReady || !currentUserId || !isAdmin) {
        if (priceBookList) priceBookList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Access Denied: Only administrators can view price books.</p>';
        return;
    }
    if (!db) {
        console.error("price_book.js: Firestore 'db' instance is not initialized. Cannot listen for price books.");
        if (priceBookList) priceBookList.innerHTML = '<p class="text-red-500 text-center col-span-full py-4">Firestore not ready to load price books.</p>';
        return;
    }

    const collectionPath = `app_metadata/${APP_SETTINGS_DOC_ID}/price_books_data`;
    const q = collection(db, collectionPath);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (priceBookList) priceBookList.innerHTML = '';
        if (snapshot.empty) {
            if (priceBookList) priceBookList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No price books found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const priceBook = { id: doc.id, ...doc.data() };
            displayPriceBook(priceBook);
        });
        console.log("price_book.js: Price Books data updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("price_book.js: Error listening to price books:", error);
        if (priceBookList) priceBookList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading price books: ${error.message}</p>`;
    });
    addUnsubscribe('priceBooks', unsubscribe);
}

// Display a single price book in the UI as a grid row
function displayPriceBook(priceBook) {
    if (!priceBookList) return;
    const priceBookRow = document.createElement('div');
    priceBookRow.className = 'data-grid-row'; // Applies data grid styling
    priceBookRow.dataset.id = priceBook.id;

    // Use the getCurrencySymbol from admin_data.js to display the correct symbol
    const currencySymbol = getCurrencySymbol(priceBook.currencyCode);

    priceBookRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${priceBook.priceBookId || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${priceBook.priceBookName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${priceBook.currencyCode || 'N/A'} (${currencySymbol || ''})</div>
        <div class="px-2 py-1 flex justify-center items-center space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${priceBook.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${priceBook.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    priceBookList.appendChild(priceBookRow);

    // Attach event listeners to the new buttons
    priceBookRow.querySelector('.edit-btn').addEventListener('click', () => editPriceBook(priceBook));
    priceBookRow.querySelector('.delete-btn').addEventListener('click', () => deletePriceBook(priceBook.id));
}

// Populate form for editing a price book
function editPriceBook(priceBook) {
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can edit price books.", () => {});
        return;
    }
    if (priceBookFormTitle) priceBookFormTitle.textContent = `Edit Price Book: ${priceBook.priceBookName}`;
    if (submitPriceBookButton) submitPriceBookButton.textContent = 'Update Price Book';

    if (priceBookIdDisplayGroup) priceBookIdDisplayGroup.classList.remove('hidden');
    if (priceBookIdDisplay) priceBookIdDisplay.textContent = priceBook.priceBookId || 'N/A';
    if (priceBookForm) priceBookForm.dataset.editingId = priceBook.id;

    if (priceBookNameInput) priceBookNameInput.value = priceBook.priceBookName || '';
    if (priceBookCurrencySelect) priceBookCurrencySelect.value = priceBook.currencyCode || '';

    if (adminPriceBookMessageDiv) adminPriceBookMessageDiv.classList.add('hidden');
    if (priceBookForm) priceBookForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Price Book form function
export function resetPriceBookForm() {
    if (priceBookForm) priceBookForm.reset();
    if (priceBookForm) priceBookForm.dataset.editingId = '';
    if (priceBookFormTitle) priceBookFormTitle.textContent = 'Add New Price Book';
    if (submitPriceBookButton) submitPriceBookButton.textContent = 'Add Price Book';
    if (priceBookIdDisplayGroup) priceBookIdDisplayGroup.classList.add('hidden');
    if (priceBookIdDisplay) priceBookIdDisplay.textContent = '';
    if (adminPriceBookMessageDiv) adminPriceBookMessageDiv.classList.add('hidden');
    populateCurrencySelect(); // Repopulate to ensure correct selection state
}
