import { db, auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe } from './main.js';
import { showModal, showMessage, hideMessage } from './utils.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variable to hold the Firestore DB instance, explicitly set by main.js
let firestoreDb = null;
let usersDomElementsInitialized = false; // Flag to ensure DOM elements are initialized only once

// EXPORTED: Setter function for the Firestore DB instance
export function setDbInstance(instance) {
    console.log("users.js: setDbInstance received:", instance);
    firestoreDb = instance; // Directly assign for robust assignment
    if (firestoreDb) {
        console.log("users.js: Firestore DB instance successfully set.");
    } else {
        console.error("users.js: CRITICAL ERROR: Firestore DB instance is still null after direct assignment. This means the 'instance' passed was null/undefined.");
    }
}

// DOM elements for users.js
let usersManagementSection;
let userForm;
let userFormTitle;
let userIdDisplayGroup;
let userIdDisplayInput;
let userNameInput;
let userFirstNameInput;
let userLastNameInput;
let userEmailInput;
let userPhoneInput;
let userRoleSelect;
let userSkillsInput;
let submitUserButton;
let userList;
let resetUserFormButton;


/**
 * Initializes DOM elements and static event listeners for users module.
 * This should be called once, defensively.
 */
function initializeUsersDomElements() {
    if (usersDomElementsInitialized) return; // Already initialized

    usersManagementSection = document.getElementById('users-management-section');
    userForm = document.getElementById('userForm');
    userFormTitle = document.getElementById('userFormTitle');
    userIdDisplayGroup = document.getElementById('userIdDisplayGroup');
    userIdDisplayInput = document.getElementById('userIdDisplayInput');
    userNameInput = document.getElementById('userName');
    userFirstNameInput = document.getElementById('userFirstName');
    userLastNameInput = document.getElementById('userLastName');
    userEmailInput = document.getElementById('userEmail');
    userPhoneInput = document.getElementById('userPhone');
    userRoleSelect = document.getElementById('userRole');
    userSkillsInput = document.getElementById('userSkills');
    submitUserButton = document.getElementById('submitUserButton');
    userList = document.getElementById('userList');
    resetUserFormButton = document.getElementById('resetUserFormButton');

    // Add event listeners that don't depend on Firebase state
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveUserProfile();
        });
    }
    if (resetUserFormButton) {
        resetUserFormButton.addEventListener('click', resetUserForm);
    }

    usersDomElementsInitialized = true;
    console.log("users.js: DOM elements and static event listeners initialized.");
}


/**
 * Main initialization function for the Users module.
 */
export async function initUsersModule() {
    console.log("users.js: initUsersModule called.");
    initializeUsersDomElements(); // Ensure DOM elements are ready

    // CRITICAL: Ensure firestoreDb is available before proceeding
    if (!firestoreDb || !isAuthReady || !currentUserId || !isAdmin) {
        console.warn("users.js: Firestore DB or Auth is not ready, or user is not Admin. Cannot initialize Users module fully.");
        if (userList) userList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing... Waiting for database connection and admin authentication.</p>';
        disableUserForm(); // Disable form if not ready or not admin
        return;
    }
    enableUserForm(); // Enable form if ready and admin

    listenForUserProfiles(); // Start listening for user profile changes
    resetUserForm(); // Reset form to initial state
}

function disableUserForm() {
    userForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    if (submitUserButton) submitUserButton.textContent = 'Auth/DB/Admin Not Ready';
}

function enableUserForm() {
    userForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    if (submitUserButton) submitUserButton.textContent = 'Create User Profile';
}

/* --- USER PROFILE CRUD OPERATIONS --- */
async function saveUserProfile() {
    console.log("users.js: saveUserProfile called.");
    if (!firestoreDb || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage user profiles, or Firestore is not ready.", () => {});
        return;
    }
    if (!userIdDisplayInput?.value || !userNameInput?.value || !userFirstNameInput?.value || !userLastNameInput?.value ||
        !userEmailInput?.value || !userPhoneInput?.value || !userRoleSelect?.value || !userSkillsInput?.value) {
        showMessage('Please fill in all required user profile fields.', 'error', userForm);
        return;
    }

    submitUserButton.disabled = true;
    submitUserButton.textContent = 'Saving...';
    hideMessage(userForm);

    const userId = userIdDisplayInput.value.trim();
    const isEditing = userForm.dataset.editingId === userId; // Check if editing existing user

    const userProfileData = {
        userId: userId, // Document ID will be this
        userName: userNameInput.value, // This can be the login email
        firstName: userFirstNameInput.value,
        lastName: userLastNameInput.value,
        email: userEmailInput.value, // This can be a contact email
        phone: userPhoneInput.value,
        role: userRoleSelect.value,
        skills: userSkillsInput.value.split(',').map(s => s.trim()).filter(s => s !== ''),
        lastModified: new Date().toISOString(),
        createdBy: currentUserId, // Admin who created/last modified
        ...(isEditing ? {} : { creationDate: new Date().toISOString() }) // Only set on creation
    };

    try {
        const userDocRef = doc(firestoreDb, `users_data`, userId); // Collection is `users_data`
        await setDoc(userDocRef, userProfileData, { merge: true }); // Always merge for user profiles

        showMessage(`User profile for ${userId} saved successfully!`, 'success', userForm);
        console.log("users.js: User profile saved:", userId, userProfileData);
        resetUserForm();
    } catch (error) {
        console.error("users.js: Error saving user profile:", error);
        showMessage(`Error saving user profile: ${error.message}`, 'error', userForm);
    } finally {
        submitUserButton.disabled = false;
        submitUserButton.textContent = isEditing ? 'Update User Profile' : 'Create User Profile';
    }
}

async function editUserProfile(userId) {
    console.log("users.js: editUserProfile called for ID:", userId);
    if (!firestoreDb || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can edit user profiles, or Firestore is not ready.", () => {});
        return;
    }
    hideMessage(userForm);
    userFormTitle.textContent = "Edit User Profile";
    submitUserButton.textContent = "Update User Profile";
    userForm.dataset.editingId = userId; // Store for update

    userIdDisplayInput.value = userId;
    userIdDisplayInput.setAttribute('readonly', 'readonly'); // Make UID read-only when editing

    const docRef = doc(firestoreDb, `users_data`, userId);
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            userNameInput.value = data.userName || '';
            userFirstNameInput.value = data.firstName || '';
            userLastNameInput.value = data.lastName || '';
            userEmailInput.value = data.email || '';
            userPhoneInput.value = data.phone || '';
            userRoleSelect.value = data.role || 'User';
            userSkillsInput.value = (data.skills && Array.isArray(data.skills)) ? data.skills.join(', ') : '';
        } else {
            showMessage('User profile not found.', 'error', userForm);
            // Optionally reset form if user not found, or leave fields as-is
            resetUserForm();
        }
    } catch (error) {
        console.error("users.js: Error loading user profile for edit:", error);
        showMessage(`Error loading user profile: ${error.message}`, 'error', userForm);
    }
}

async function deleteUserProfile(userId) {
    console.log("users.js: deleteUserProfile called for ID:", userId);
    if (!firestoreDb || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can delete user profiles, or Firestore is not ready.", () => {});
        return;
    }

    showModal(
        "Confirm Deletion",
        `Are you sure you want to delete the user profile for '${userId}'? This action cannot be undone. Note: This deletes the *profile* data, not the Firebase Authentication user itself.`,
        async () => {
            try {
                const docRef = doc(firestoreDb, `users_data`, userId);
                await deleteDoc(docRef);
                showMessage('User profile deleted successfully!', 'success', userForm);
                resetUserForm();
                console.log("users.js: User profile deleted:", userId);
            } catch (error) {
                console.error("users.js: Error deleting user profile:", error);
                showModal("Error", `Error deleting user profile: ${error.message}`, () => {});
            }
        }
    );
}

function resetUserForm() {
    if (!userForm) return;
    userForm.reset();
    userFormTitle.textContent = "Add New User Profile";
    submitUserButton.textContent = "Create User Profile";
    userForm.dataset.editingId = ''; // Clear editing ID
    userIdDisplayInput.removeAttribute('readonly'); // Make UID editable for new user
    hideMessage(userForm);
}

function listenForUserProfiles() {
    console.log("users.js: listenForUserProfiles called.");
    if (!firestoreDb || !isAuthReady || !currentUserId || !isAdmin) {
        console.warn("users.js: listenForUserProfiles: Firestore DB, Auth, or Admin status not ready. Cannot set up listener.");
        if (userList) userList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Access Denied: Only administrators can view user profiles, or Firestore is not ready.</p>';
        return;
    }

    const usersColRef = collection(firestoreDb, `users_data`);
    const q = query(usersColRef);

    removeUnsubscribe('userProfiles'); // Remove previous listener if any
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!userList) return;
        userList.innerHTML = '';
        if (snapshot.empty) {
            userList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No user profiles found.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayUserProfile({ id: doc.id, ...doc.data() });
        });
        console.log("users.js: User profiles list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("users.js: Error listening to user profiles:", error);
        if (userList) userList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading user profiles: ${error.message}</p>`;
    });

    addUnsubscribe('userProfiles', unsubscribe);
}

function displayUserProfile(userProfile) {
    if (!userList) return;
    const userRow = document.createElement('div');
    userRow.className = 'data-grid-row';
    userRow.dataset.id = userProfile.id;

    userRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${userProfile.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${userProfile.userName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${userProfile.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${userProfile.role || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${userProfile.skills.join(', ') || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${userProfile.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${userProfile.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    userList.appendChild(userRow);

    userRow.querySelector('.edit-btn').addEventListener('click', () => editUserProfile(userProfile.id));
    userRow.querySelector('.delete-btn').addEventListener('click', () => deleteUserProfile(userProfile.id));
}
