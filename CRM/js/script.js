import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
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
let currentCollectionType = 'private'; // 'private' or 'public'
let unsubscribe = null; // To store the onSnapshot unsubscribe function

// Get references to DOM elements
const authSection = document.getElementById('auth-section');
const authForm = document.getElementById('authForm');
const authFormTitle = document.getElementById('authFormTitle');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authSubmitButton = document.getElementById('authSubmitButton');
const toggleAuthModeButton = document.getElementById('toggleAuthModeButton');
const authMessage = document.getElementById('authMessage');
const logoutButton = document.getElementById('logoutButton');
const mobileLogoutButton = document.getElementById('mobileLogoutButton');

// New registration fields
const registerFields = document.getElementById('registerFields');
const authUsername = document.getElementById('authUsername');
const authFirstName = document.getElementById('authFirstName');
const authLastName = document.getElementById('authLastName');
const authPhone = document.getElementById('authPhone');
const authRole = document.getElementById('authRole');
const authSkills = document.getElementById('authSkills');


const contactForm = document.getElementById('contactForm');
const contactList = document.getElementById('contactList');
const userIdDisplay = document.getElementById('userIdDisplay');
const collectionToggleButton = document.getElementById('collectionToggleButton');
const modalContainer = document.getElementById('modalContainer');
const mobileMenuButton = document.getElementById('mobileMenuButton');
const mobileMenu = document.getElementById('mobileMenu');
const mobileUserIdDisplay = document.getElementById('mobileUserIdDisplay');


// Select all main content sections
const homeSection = document.getElementById('home');
const crmSection = document.getElementById('crm-section');
const eventsSection = document.getElementById('events-section');
const allSections = [authSection, homeSection, crmSection, eventsSection];

let isLoginMode = true; // State for login/register form

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
}

// Initialize Firebase and set up authentication listener
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        getAnalytics(app); // Initialize Analytics
        db = getFirestore(app);
        auth = getAuth(app);

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                userIdDisplay.textContent = `User: ${user.email || 'N/A'}`;
                mobileUserIdDisplay.textContent = `User: ${user.email || 'N/A'}`;
                logoutButton.classList.remove('hidden');
                mobileLogoutButton.classList.remove('hidden');

                // If logged in, hide auth section and show main content (e.g., home)
                showSection('home');
                listenForContacts(); // Start listening for contacts once authenticated
            } else {
                currentUserId = null;
                userIdDisplay.textContent = 'Not Logged In';
                mobileUserIdDisplay.textContent = 'Not Logged In';
                logoutButton.classList.add('hidden');
                mobileLogoutButton.classList.add('hidden');
                // If logged out, show the auth section
                showSection('auth-section');
                if (unsubscribe) {
                    unsubscribe(); // Stop listening to contacts if logged out
                }
                contactList.innerHTML = '<p class="text-gray-500 text-center">Please log in to view contacts.</p>';
            }
        });
    } catch (error) {
        console.error("Error initializing Firebase:", error);
        authMessage.textContent = `Error: Firebase Init Failed. ${error.message}`;
    }
}

// User Registration
async function registerUser(email, password) {
    authMessage.textContent = '';
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Collect additional user profile data
        const profileData = {
            username: authUsername.value,
            firstName: authFirstName.value,
            lastName: authLastName.value,
            phone: authPhone.value,
            role: authRole.value,
            skills: authSkills.value.split(',').map(s => s.trim()).filter(s => s.length > 0), // Store skills as an array
            email: email, // Also store email in profile for easy access
            createdAt: new Date().toISOString()
        };

        // Save profile data to Firestore
        // Path: artifacts/{projectId}/users/{userId}/profile
        const userProfileRef = doc(db, `artifacts/${appId}/users/${user.uid}/profile`);
        await setDoc(userProfileRef, profileData, { merge: true }); // Use merge to avoid overwriting if doc already exists

        authMessage.textContent = 'Registration successful! You are now logged in.';
        authMessage.classList.remove('text-red-500');
        authMessage.classList.add('text-green-500');
        authForm.reset(); // Clear form fields
    } catch (error) {
        console.error("Registration error:", error);
        authMessage.textContent = `Registration failed: ${error.message}`;
        authMessage.classList.remove('text-green-500');
        authMessage.classList.add('text-red-500');
    }
}

// User Login
async function loginUser(email, password) {
    authMessage.textContent = '';
    try {
        await signInWithEmailAndPassword(auth, email, password);
        authMessage.textContent = 'Login successful!';
        authMessage.classList.remove('text-red-500');
        authMessage.classList.add('text-green-500');
        authForm.reset(); // Clear form fields
    } catch (error) {
        console.error("Login error:", error);
        authMessage.textContent = `Login failed: ${error.message}`;
        authMessage.classList.remove('text-green-500');
        authMessage.classList.add('text-red-500');
    }
}

// User Logout
async function logoutUser() {
    showModal(
        "Confirm Logout",
        "Are you sure you want to log out?",
        async () => {
            try {
                await signOut(auth);
                console.log("User logged out.");
                authMessage.textContent = 'You have been logged out.';
                authMessage.classList.remove('text-red-500');
                authMessage.classList.add('text-green-500');
            } catch (error) {
                console.error("Logout error:", error);
                authMessage.textContent = `Logout failed: ${error.message}`;
                authMessage.classList.remove('text-green-500');
                authMessage.classList.add('text-red-500');
            }
        }
    );
}

// Determine the Firestore collection path based on type and user ID
function getCollectionPath(type) {
    if (!currentUserId) {
        console.error("currentUserId is null, cannot determine collection path. Ensure user is authenticated.");
        return `artifacts/${appId}/public/data/contacts_fallback`; // Fallback for error state
    }
    if (type === 'public') {
        return `artifacts/${appId}/public/data/contacts`;
    } else { // 'private'
        // This path must match your security rules for private user data
        return `artifacts/${appId}/users/${currentUserId}/contacts`;
    }
}

// Add or update a contact in Firestore
async function saveContact(contactData, contactId = null) {
    if (!currentUserId) {
        console.error("User not authenticated. Cannot save contact.");
        showModal("Authentication Required", "Please log in to save contacts.", () => showSection('auth-section'));
        return;
    }

    const collectionPath = getCollectionPath(currentCollectionType);
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
        console.error("User not authenticated. Cannot delete contact.");
        showModal("Authentication Required", "Please log in to delete contacts.", () => showSection('auth-section'));
        return;
    }

    const collectionPath = getCollectionPath(currentCollectionType);
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
    if (unsubscribe) {
        unsubscribe(); // Unsubscribe from previous listener
    }

    if (!currentUserId) {
        console.error("User not authenticated. Cannot listen for contacts.");
        contactList.innerHTML = '<p class="text-gray-500 text-center">Please log in to view contacts.</p>';
        return;
    }

    const collectionPath = getCollectionPath(currentCollectionType);
    const q = collection(db, collectionPath);

    unsubscribe = onSnapshot(q, (snapshot) => {
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

// Event Listeners
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmail.value;
    const password = authPassword.value;
    if (isLoginMode) {
        await loginUser(email, password);
    } else {
        await registerUser(email, password);
    }
});

toggleAuthModeButton.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authFormTitle.textContent = isLoginMode ? 'Login' : 'Register';
    authSubmitButton.textContent = isLoginMode ? 'Login' : 'Register';
    toggleAuthModeButton.textContent = isLoginMode ? 'Register' : 'Login';
    authMessage.textContent = ''; // Clear previous messages

    // Toggle visibility of additional registration fields
    if (isLoginMode) {
        registerFields.classList.add('hidden');
    } else {
        registerFields.classList.remove('hidden');
    }
});

logoutButton.addEventListener('click', logoutUser);
mobileLogoutButton.addEventListener('click', logoutUser);

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

collectionToggleButton.addEventListener('click', () => {
    currentCollectionType = currentCollectionType === 'private' ? 'public' : 'private';
    collectionToggleButton.textContent = `Switch to ${currentCollectionType === 'private' ? 'Public' : 'Private'} Contacts`;
    listenForContacts(); // Reload contacts based on new collection type
});

mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

document.querySelectorAll('nav a').forEach(link => {
    if (link.dataset.section) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Only allow navigation to non-auth sections if user is logged in
            if (currentUserId || link.dataset.section === 'home' || link.dataset.section === 'auth-section') {
                showSection(link.dataset.section);
            } else {
                showModal("Access Denied", "Please log in to access this section.", () => showSection('auth-section'));
            }
        });
    }
});

// Initialize Firebase on window load
window.onload = initializeFirebase;
