import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, setDoc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// YOUR Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebasestorage.app",
    messagingSenderId: "10782416018",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

// Use projectId as appId for Firestore collection paths for consistency and stability
const appId = firebaseConfig.projectId;

let app;
let db;
let auth;
let currentUserId = null;
let currentCollectionType = 'private'; // 'private' or 'public' for contacts
// Company collection type is now fixed to 'public'
const currentCompanyCollectionType = 'public'; // Fixed to public as per requirement
let unsubscribeContacts = null; // To store the onSnapshot unsubscribe function for contacts
let unsubscribeCompanies = null; // To store the onSnapshot unsubscribe function for companies

// Get references to DOM elements for Contacts
const contactForm = document.getElementById('contactForm');
const contactList = document.getElementById('contactList');
const userIdDisplay = document.getElementById('userIdDisplay');
const collectionToggleButton = document.getElementById('collectionToggleButton');
const modalContainer = document.getElementById('modalContainer');
const mobileMenuButton = document.getElementById('mobileMenuButton');
const mobileMenu = document.getElementById('mobileMenu');
const mobileUserIdDisplay = document.getElementById('mobileUserIdDisplay');

// Get references to DOM elements for Companies (UPDATED)
const companiesSection = document.getElementById('companies-section');
const companyForm = document.getElementById('companyForm');
const companyFormTitle = document.getElementById('companyFormTitle');
const companyIdDisplayGroup = document.getElementById('companyIdDisplayGroup'); // New display group
const companyIdDisplay = document.getElementById('companyIdDisplay'); // New element to display ID
const companyNameInput = document.getElementById('companyName');
const companyWebsiteInput = document.getElementById('companyWebsite');
const companyIndustryInput = document.getElementById('companyIndustry');
const companyAddressInput = document.getElementById('companyAddress');
const companyCityInput = document.getElementById('companyCity');
const companyStateInput = document.getElementById('companyState');
const companyZipCodeInput = document.getElementById('companyZipCode');
const companyPhoneInput = document.getElementById('companyPhone');
const companyStatusSelect = document.getElementById('companyStatus');
const companyDescriptionInput = document.getElementById('companyDescription');
const submitCompanyButton = document.getElementById('submitCompanyButton');
const companyList = document.getElementById('companyList');
// Removed companyCollectionToggleButton as it's no longer needed


// Select all main content sections
const homeSection = document.getElementById('home');
const crmSection = document.getElementById('crm-section');
const eventsSection = document.getElementById('events-section');
const allSections = [homeSection, crmSection, companiesSection, eventsSection];


// Function to show a custom confirmation modal
function showModal(title, message, onConfirm, onCancel) {
    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button id="modalConfirmBtn" class="primary">Confirm</button>
                    <button id="modalCancelBtn" class="secondary">Cancel</button>
                </div>
            </div>
        </div>
    `;
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');

    modalConfirmBtn.onclick = () => {
        onConfirm();
        modalContainer.innerHTML = ''; // Close modal
    };
    modalCancelBtn.onclick = () => {
        if (onCancel) onCancel();
        modalContainer.innerHTML = ''; // Close modal
    };
}

// Function to show a specific section and hide others
function showSection(sectionId) {
    allSections.forEach(section => {
        if (section) {
            section.classList.add('hidden');
        }
    });
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    mobileMenu.classList.add('hidden'); // Close mobile menu when navigating

    // Special handling for starting/stopping listeners when entering/leaving a section
    // Stop all listeners first to prevent redundant updates
    if (unsubscribeContacts) { unsubscribeContacts(); }
    if (unsubscribeCompanies) { unsubscribeCompanies(); }

    // Start specific listener for the active section
    if (sectionId === 'crm-section') {
        listenForContacts();
    } else if (sectionId === 'companies-section') {
        listenForCompanies();
    }
}

// Initialize Firebase and set up authentication listener
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        getAnalytics(app); // Initialize Analytics
        db = getFirestore(app);
        auth = getAuth(app); // Still need auth for anonymous sign-in

        // Automatically sign in anonymously on load
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                userIdDisplay.textContent = `User ID: ${user.uid.substring(0, 8)}...`; // Display truncated ID
                mobileUserIdDisplay.textContent = `User ID: ${user.uid.substring(0, 8)}...`;
            } else {
                await signInAnonymously(auth);
            }
            // Once authenticated (or anonymously signed in), show the home section
            showSection('home');
        });

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        showModal("Firebase Error", `Initialization failed: ${error.message}`, () => {});
    }
}

// Determine the Firestore collection path based on type and user ID
function getCollectionPath(type, dataArea = 'contacts') { // dataArea added for flexibility
    if (!currentUserId) {
        console.error("currentUserId is null, cannot determine collection path. Anonymous sign-in failed.");
        return `artifacts/${appId}/public/data/${dataArea}_fallback`; // Fallback for critical error
    }
    // For companies, 'type' will always be 'public' based on the constant `currentCompanyCollectionType`
    // For contacts, it will use `currentCollectionType` which can be private/public
    if (type === 'public') {
        return `artifacts/${appId}/public/data/${dataArea}`;
    } else { // 'private'
        return `artifacts/${appId}/users/${currentUserId}/${dataArea}`;
    }
}

/* --- CONTACTS CRUD OPERATIONS --- */

// Add or update a contact in Firestore
async function saveContact(contactData, contactId = null) {
    if (!currentUserId) {
        console.error("User not authenticated. Cannot save contact. Anonymous sign-in issue.");
        showModal("Error", "Could not save contact. Anonymous session not established.", () => {});
        return;
    }

    const collectionPath = getCollectionPath(currentCollectionType, 'contacts'); // Specify dataArea
    try {
        if (contactId) {
            const contactDocRef = doc(db, collectionPath, contactId);
            await updateDoc(contactDocRef, contactData);
            console.log("Contact updated:", contactId);
        } else {
            await addDoc(collection(db, collectionPath), contactData);
            console.log("Contact added.");
        }
        contactForm.reset();
        contactForm.dataset.editingId = '';
        document.getElementById('contactFormTitle').textContent = 'Add New Contact';
        document.getElementById('submitButton').textContent = 'Add Contact';
    } catch (error) {
        console.error("Error saving contact:", error);
        showModal("Error", "Failed to save contact. Please try again. " + error.message, () => {});
    }
}

// Delete a contact from Firestore
async function deleteContact(contactId) {
    if (!currentUserId) {
        console.error("User not authenticated. Cannot delete contact. Anonymous sign-in issue.");
        showModal("Error", "Could not delete contact. Anonymous session not established.", () => {});
        return;
    }

    const collectionPath = getCollectionPath(currentCollectionType, 'contacts'); // Specify dataArea
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this contact? This action cannot be undone.",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, contactId));
                console.log("Contact deleted:", contactId);
            } catch (error) {
                console.error("Error deleting contact:", error);
                showModal("Error", "Failed to delete contact. Please try again. " + error.message, () => {});
            }
        }
    );
}

// Listen for real-time updates to contacts
function listenForContacts() {
    if (unsubscribeContacts) {
        unsubscribeContacts(); // Unsubscribe from previous listener
    }

    if (!currentUserId) {
        console.error("User not authenticated. Cannot listen for contacts. Anonymous sign-in issue.");
        contactList.innerHTML = '<p class="text-gray-500 text-center">Failed to load contacts. Please refresh.</p>';
        return;
    }

    const collectionPath = getCollectionPath(currentCollectionType, 'contacts'); // Specify dataArea
    const q = collection(db, collectionPath);

    unsubscribeContacts = onSnapshot(q, (snapshot) => {
        contactList.innerHTML = '';
        if (snapshot.empty) {
            contactList.innerHTML = '<p class="text-gray-500 text-center">No contacts found in this collection.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const contact = { id: doc.id, ...doc.data() };
            displayContact(contact);
        });
    }, (error) => {
        console.error("Error listening to contacts:", error);
        contactList.innerHTML = `<p class="text-red-500 text-center">Error loading contacts: ${error.message}</p>`;
    });
}

// Display a single contact in the UI
function displayContact(contact) {
    const contactCard = document.createElement('div');
    contactCard.className = 'contact-card';
    contactCard.dataset.id = contact.id;
    contactCard.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-900">${contact.name || 'N/A'}</h3>
        <p class="text-sm text-gray-600">Email: ${contact.email || 'N/A'}</p>
        <p class="text-sm text-gray-600">Phone: ${contact.phone || 'N/A'}</p>
        <p class="text-sm text-gray-600">Notes: ${contact.notes || 'N/A'}</p>
        <div class="actions">
            <button class="edit-btn secondary" data-id="${contact.id}">Edit</button>
            <button class="delete-btn danger" data-id="${contact.id}">Delete</button>
        </div>
    `;
    contactList.appendChild(contactCard);

    contactCard.querySelector('.edit-btn').addEventListener('click', () => editContact(contact));
    contactCard.querySelector('.delete-btn').addEventListener('click', () => deleteContact(contact.id));
}

// Populate form for editing a contact
function editContact(contact) {
    document.getElementById('contactName').value = contact.name || '';
    document.getElementById('contactEmail').value = contact.email || '';
    document.getElementById('contactPhone').value = contact.phone || '';
    document.getElementById('contactNotes').value = contact.notes || '';
    contactForm.dataset.editingId = contact.id;
    document.getElementById('contactFormTitle').textContent = 'Edit Contact';
    document.getElementById('submitButton').textContent = 'Update Contact';
    contactForm.scrollIntoView({ behavior: 'smooth' });
}

/* --- COMPANIES CRUD OPERATIONS (UPDATED) --- */

// Add or update a company in Firestore
async function saveCompany(companyData, existingCompanyDocId = null) { // existingCompanyDocId is Firestore's auto-generated doc ID
    if (!currentUserId) {
        console.error("User not authenticated. Cannot save company. Anonymous sign-in issue.");
        showModal("Error", "Could not save company. Anonymous session not established.", () => {});
        return;
    }

    // Always use the public collection for companies
    const collectionPath = getCollectionPath(currentCompanyCollectionType, 'companies');

    try {
        if (existingCompanyDocId) {
            // Editing an existing company: simply update the document
            const companyDocRef = doc(db, collectionPath, existingCompanyDocId);
            await updateDoc(companyDocRef, companyData);
            console.log("Company updated:", existingCompanyDocId);
        } else {
            // Adding a NEW company: let Firestore generate a document ID, then store custom CompanyID as a field
            // Use a temporary document reference to get a Firestore-generated ID
            const newDocRef = doc(collection(db, collectionPath)); // Get a reference with a new auto-generated ID
            const systemGeneratedCompanyId = 'COM-' + newDocRef.id; // Create custom CompanyID

            // Set the document with the full data including the custom companyId
            await setDoc(newDocRef, { ...companyData, companyId: systemGeneratedCompanyId });
            console.log("Company added with system-generated ID:", systemGeneratedCompanyId);
        }
        // Reset form and UI state after successful save/update
        resetCompanyForm(); // Use the new reset function
    } catch (error) {
        console.error("Error saving company:", error);
        showModal("Error", "Failed to save company. Please try again. " + error.message, () => {});
    }
}

// Delete a company from Firestore
async function deleteCompany(firestoreDocId) { // This is Firestore's auto-generated doc ID
    if (!currentUserId) {
        console.error("User not authenticated. Cannot delete company. Anonymous sign-in issue.");
        showModal("Error", "Could not delete company. Anonymous session not established.", () => {});
        return;
    }

    // Always use the public collection for companies
    const collectionPath = getCollectionPath(currentCompanyCollectionType, 'companies');
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this company? This action cannot be undone.",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("Company deleted Firestore Doc ID:", firestoreDocId);
            } catch (error) {
                console.error("Error deleting company:", error);
                showModal("Error", "Failed to delete company. Please try again. " + error.message, () => {});
            }
        }
    );
}

// Listen for real-time updates to companies
function listenForCompanies() {
    if (unsubscribeCompanies) {
        unsubscribeCompanies(); // Unsubscribe from previous listener
    }

    if (!currentUserId) {
        console.error("User not authenticated. Cannot listen for companies. Anonymous sign-in issue.");
        companyList.innerHTML = '<p class="text-gray-500 text-center col-span-full">Failed to load companies. Please refresh.</p>';
        return;
    }

    // Always listen to the public collection for companies
    const collectionPath = getCollectionPath(currentCompanyCollectionType, 'companies');
    const q = collection(db, collectionPath);

    unsubscribeCompanies = onSnapshot(q, (snapshot) => {
        companyList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            // Display empty grid message
            companyList.innerHTML = '<p class="text-gray-500 text-center col-span-full">No companies found. Add one above!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const company = { id: doc.id, ...doc.data() }; // doc.id is Firestore's internal ID
            displayCompany(company);
        });
    }, (error) => {
        console.error("Error listening to companies:", error);
        companyList.innerHTML = `<p class="text-red-500 text-center col-span-full">Error loading companies: ${error.message}</p>`;
    });
}

// Display a single company in the UI
function displayCompany(company) {
    const companyCard = document.createElement('div');
    // Enhanced card styling for a more professional look and grid item
    companyCard.className = 'bg-white p-6 rounded-lg shadow-md border border-gray-100 flex flex-col space-y-2';
    companyCard.dataset.id = company.id; // Store Firestore document ID for edit/delete actions
    companyCard.innerHTML = `
        <h3 class="text-xl font-bold text-blue-700 mb-2">${company.name || 'N/A'}</h3>
        <p class="text-sm text-gray-700"><strong>ID:</strong> ${company.companyId || 'N/A'}</p> <!-- Display the custom companyId field -->
        <p class="text-sm text-gray-600"><strong>Industry:</strong> ${company.industry || 'N/A'}</p>
        <p class="text-sm text-gray-600"><strong>Website:</strong> <a href="${company.website}" target="_blank" class="text-blue-600 hover:underline truncate block">${company.website || 'N/A'}</a></p>
        <p class="text-sm text-gray-600"><strong>Address:</strong> ${company.address || 'N/A'}, ${company.city || 'N/A'}, ${company.state || 'N/A'} ${company.zipCode || 'N/A'}</p>
        <p class="text-sm text-gray-600"><strong>Phone:</strong> ${company.phone || 'N/A'}</p>
        <p class="text-sm text-gray-600"><strong>Status:</strong> <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">${company.status || 'N/A'}</span></p>
        <p class="text-sm text-gray-600 flex-grow"><strong>Description:</strong> ${company.description || 'N/A'}</p>
        <div class="actions flex justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
            <button class="edit-btn secondary px-4 py-2 text-sm" data-id="${company.id}">Edit</button> <!-- Pass Firestore doc ID -->
            <button class="delete-btn danger px-4 py-2 text-sm" data-id="${company.id}">Delete</button> <!-- Pass Firestore doc ID -->
        </div>
    `;
    companyList.appendChild(companyCard);

    companyCard.querySelector('.edit-btn').addEventListener('click', () => editCompany(company));
    companyCard.querySelector('.delete-btn').addEventListener('click', () => deleteCompany(company.id));
}

// Populate form for editing a company
function editCompany(company) {
    companyFormTitle.textContent = 'Edit Company';
    submitCompanyButton.textContent = 'Update Company';

    // Display the system-generated Company ID
    companyIdDisplayGroup.classList.remove('hidden');
    companyIdDisplay.textContent = company.companyId || 'N/A';

    // Populate other fields
    companyNameInput.value = company.name || '';
    companyWebsiteInput.value = company.website || '';
    companyIndustryInput.value = company.industry || '';
    companyAddressInput.value = company.address || '';
    companyCityInput.value = company.city || '';
    companyStateInput.value = company.state || '';
    companyZipCodeInput.value = company.zipCode || '';
    companyPhoneInput.value = company.phone || '';
    companyStatusSelect.value = company.status || 'Other';
    companyDescriptionInput.value = company.description || '';
    companyForm.dataset.editingId = company.id; // Store Firestore doc ID for update
    companyForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset Company form function (NEW)
function resetCompanyForm() {
    companyForm.reset();
    companyForm.dataset.editingId = '';
    companyFormTitle.textContent = 'Add New Company';
    submitCompanyButton.textContent = 'Add Company';
    companyIdDisplayGroup.classList.add('hidden'); // Hide ID display group
    companyIdDisplay.textContent = ''; // Clear displayed ID
}

// --- Event Listeners ---

// Contact Form Event Listener
contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const contactData = {
        name: document.getElementById('contactName').value,
        email: document.getElementById('contactEmail').value,
        phone: document.getElementById('contactPhone').value,
        notes: document.getElementById('contactNotes').value
    };
    const editingId = contactForm.dataset.editingId;
    saveContact(contactData, editingId || null);
});

// Contact Collection Toggle Button Event Listener
collectionToggleButton.addEventListener('click', () => {
    currentCollectionType = currentCollectionType === 'private' ? 'public' : 'private';
    collectionToggleButton.textContent = `Switch to ${currentCollectionType === 'private' ? 'Public' : 'Private'} Contacts`;
    listenForContacts(); // Reload contacts based on new collection type
});

// Company Form Event Listener
companyForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const companyData = {
        name: companyNameInput.value.trim(),
        website: companyWebsiteInput.value.trim(),
        industry: companyIndustryInput.value.trim(),
        address: companyAddressInput.value.trim(),
        city: companyCityInput.value.trim(),
        state: companyStateInput.value.trim(),
        zipCode: companyZipCodeInput.value.trim(),
        phone: companyPhoneInput.value.trim(),
        status: companyStatusSelect.value,
        description: companyDescriptionInput.value.trim()
        // companyId field will be added/updated by saveCompany function
    };
    const editingId = companyForm.dataset.editingId; // This is the Firestore auto-generated doc ID

    await saveCompany(companyData, editingId || null);
});

// Mobile Menu Button Event Listener
mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Navigation Links Event Listeners
document.querySelectorAll('nav a').forEach(link => {
    if (link.dataset.section) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(link.dataset.section);
        });
    }
});

// Initialize Firebase on window load
window.onload = initializeFirebase;
