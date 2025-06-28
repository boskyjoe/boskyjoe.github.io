import { auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe, appId as mainAppId } from './main.js';
import { showModal, showMessage, hideMessage } from './utils.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Global variable to hold the Firestore DB instance, explicitly set by main.js
let firestoreDb = null;
// Use the projectId exported from main.js directly. This should be the most reliable source.
let projectId = mainAppId;
let usersDomElementsInitialized = false; // Flag to ensure DOM elements are initialized only once

// EXPORTED: Setter function for the Firestore DB instance
export function setDbInstance(instance) {
    console.log("users.js: setDbInstance received:", instance);
    firestoreDb = instance; // Directly assign for robust assignment
    if (firestoreDb) {
        console.log("users.js: Firestore DB instance successfully set. projectId:", projectId);
    } else {
        console.error("users.js: CRITICAL ERROR: Firestore DB instance is still null after direct assignment. This means the 'instance' passed was null/undefined.");
        projectId = null;
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

    // Add static event listeners
    if (userForm) {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editingId = userForm.dataset.editingId;
            await saveUser(editingId || null);
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

    // CRITICAL: Ensure firestoreDb and projectId are available before proceeding
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        console.warn("users.js: Firestore DB, Project ID, Auth, or Admin status is not ready. Cannot initialize Users module fully.");
        if (userList) userList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Initializing... Waiting for database connection and admin authentication.</p>';
        disableUserForm(); // Disable form if not ready
        return;
    }
    enableUserForm(); // Enable form if ready

    listenForUsers(); // Start listening for user list changes
    resetUserForm(); // Reset form to initial state
}

function disableUserForm() {
    userForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.setAttribute('disabled', 'disabled'));
    if (submitUserButton) submitUserButton.textContent = 'Auth/DB Not Ready';
}

function enableUserForm() {
    userForm?.querySelectorAll('input, select, textarea, button[type="submit"], button[type="button"]').forEach(el => el.removeAttribute('disabled'));
    if (submitUserButton) submitUserButton.textContent = 'Add User';
}


/* --- USER CRUD OPERATIONS --- */
async function saveUser(userId = null) {
    console.log("users.js: saveUser called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Error", "Authentication, Database, or Admin status not ready. Please sign in as an admin.", () => {});
        return;
    }

    // Basic validation
    if (!userNameInput?.value || !userFirstNameInput?.value || !userLastNameInput?.value ||
        !userEmailInput?.value || !userPhoneInput?.value || !userRoleSelect?.value) {
        showMessage('Please fill in all required user fields.', 'error', userForm);
        return;
    }

    submitUserButton.disabled = true;
    submitUserButton.textContent = 'Saving...';
    hideMessage(userForm);

    const isEditing = !!userId;
    let docId = userId; // For new users, this will be null and Firestore will auto-generate

    const userData = {
        userName: userNameInput.value,
        firstName: userFirstNameInput.value,
        lastName: userLastNameInput.value,
        email: userEmailInput.value,
        phone: userPhoneInput.value,
        role: userRoleSelect.value,
        skills: userSkillsInput.value.split(',').map(s => s.trim()).filter(s => s !== ''),
        profileAccess: true, // All managed users will have profile access
        lastModified: new Date().toISOString(),
        modifiedBy: currentUserId,
        ...(isEditing ? {} : { creationDate: new Date().toISOString() })
    };

    try {
        const usersColRef = collection(firestoreDb, `users_data`);
        if (isEditing) {
            const docRef = doc(usersColRef, docId);
            // Ensure an admin doesn't accidentally change their own role here
            if (docId === currentUserId && userData.role !== userRoleSelect.originalValue) {
                // If the current user is trying to change their own role, prevent it.
                // The originalValue needs to be stored when editing, or fetch it again.
                const originalUserDoc = await getDoc(docRef);
                if (originalUserDoc.exists() && originalUserDoc.data().role !== userData.role) {
                     showModal("Permission Denied", "You cannot change your own role. Another administrator must do this.", () => {});
                     submitUserButton.disabled = false;
                     submitUserButton.textContent = 'Update User';
                     return;
                }
            }

            await setDoc(docRef, userData, { merge: true });
            showMessage('User updated successfully!', 'success', userForm);
            console.log("users.js: User updated:", docId, userData);
        } else {
            // For new users, Firestore rules require 'role' to be 'User' for non-admin creation via client SDK.
            // If an admin is creating a user with a non-default role, this might require a Cloud Function.
            // For now, assuming admins can set any role directly.
            // The Firebase rules for `/users_data/{userId}` allow `create` only if `request.resource.data.role == 'User'`.
            // This means for admins to create other admins or roles, it would need to be via a Cloud Function or
            // the admin first creates them as 'User' and then edits their role.
            // Given the current rules, let's make sure creating new users adheres to the 'User' role,
            // or warn the admin about the limitation.
            if (userData.role !== 'User') {
                 showModal("Warning", "New users can only be created with the 'User' role directly. To assign an 'Admin' role, create the user as 'User' first, then edit their profile.", () => {});
                 // Force role to 'User' for creation if rules are strict
                 userData.role = 'User';
            }
            const newDocRef = doc(usersColRef, userIdDisplayInput.value); // Use specified ID for new user
            await setDoc(newDocRef, userData); // Use setDoc for specified ID
            docId = userIdDisplayInput.value;
            showMessage('User added successfully!', 'success', userForm);
            console.log("users.js: User added with ID:", docId, userData);
        }
        resetUserForm();
    } catch (error) {
        console.error("users.js: Error saving user:", error);
        showMessage(`Error saving user: ${error.message}`, 'error', userForm);
    } finally {
        submitUserButton.disabled = false;
        submitUserButton.textContent = isEditing ? 'Update User' : 'Add User';
    }
}

async function editUser(userId) {
    console.log("users.js: editUser called for ID:", userId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Error", "Authentication, Database, or Admin status not ready. Please sign in as an admin.", () => {});
        return;
    }

    hideMessage(userForm);
    userFormTitle.textContent = "Edit User";
    submitUserButton.textContent = "Update User";
    userIdDisplayGroup.classList.remove('hidden');
    userIdDisplayInput.value = userId; // Show the UID, but make it read-only for editing
    userNameInput.readOnly = true; // User Name (UID/Email) should not be editable
    userForm.dataset.editingId = userId; // Store the ID for updates

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
            userRoleSelect.originalValue = data.role || 'User'; // Store original role for self-edit check
            userSkillsInput.value = Array.isArray(data.skills) ? data.skills.join(', ') : '';
        } else {
            showMessage('User not found.', 'error', userForm);
            resetUserForm();
        }
    } catch (error) {
        console.error("users.js: Error loading user for edit:", error);
        showMessage(`Error loading user: ${error.message}`, 'error', userForm);
    }
}

async function deleteUser(userId) {
    console.log("users.js: deleteUser called for ID:", userId);
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        showModal("Error", "Authentication, Database, or Admin status not ready. Please sign in as an admin.", () => {});
        return;
    }

    if (userId === currentUserId) {
        showModal("Permission Denied", "You cannot delete your own user account.", () => {});
        return;
    }

    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this user? This action cannot be undone.",
        async () => {
            try {
                const docRef = doc(firestoreDb, `users_data`, userId);
                await deleteDoc(docRef);
                showMessage('User deleted successfully!', 'success', userForm);
                resetUserForm();
                console.log("users.js: User deleted:", userId);
            } catch (error) {
                console.error("users.js: Error deleting user:", error);
                showModal("Error", `Error deleting user: ${error.message}`, () => {});
            }
        }
    );
}

function resetUserForm() {
    if (!userForm) return; // Defensive check
    userForm.reset();
    userFormTitle.textContent = "Add New User";
    submitUserButton.textContent = "Add User";
    userIdDisplayGroup.classList.remove('hidden'); // Show for new user ID entry
    userIdDisplayInput.value = ''; // Clear ID input
    userIdDisplayInput.readOnly = false; // Make ID editable for new users
    userNameInput.readOnly = false; // Make User Name editable for new users
    userForm.dataset.editingId = ''; // Clear editing ID
    hideMessage(userForm);
}

function listenForUsers() {
    console.log("users.js: listenForUsers called.");
    if (!firestoreDb || !projectId || !isAuthReady || !currentUserId || !isAdmin) {
        console.warn("users.js: listenForUsers: Firestore DB, Project ID, Auth, or Admin status is not ready. Cannot set up listener.");
        if (userList) userList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">Waiting for database connection and admin authentication...</p>';
        return;
    }

    const usersColRef = collection(firestoreDb, `users_data`);
    const q = query(usersColRef);

    removeUnsubscribe('users'); // Remove previous listener if any
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!userList) return; // Defensive check
        userList.innerHTML = ''; // Clear list before populating
        if (snapshot.empty) {
            userList.innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">No users found.</p>';
            return;
        }
        snapshot.forEach((doc) => {
            displayUser({ id: doc.id, ...doc.data() });
        });
        console.log("users.js: Users list updated via onSnapshot. Total:", snapshot.size);
    }, (error) => {
        console.error("users.js: Error listening to users:", error);
        if (userList) userList.innerHTML = `<p class="text-red-500 text-center py-4 col-span-full">Error loading users: ${error.message}</p>`;
    });

    addUnsubscribe('users', unsubscribe); // Add the new unsubscribe function
}

function displayUser(user) {
    if (!userList) return; // Defensive check
    const userRow = document.createElement('div');
    userRow.className = 'data-grid-row'; // Tailwind grid classes applied via CSS
    userRow.dataset.id = user.id; // Store Firestore document ID

    const userFullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    userRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${user.id.substring(0, 7)}...</div>
        <div class="px-2 py-1 truncate">${userFullName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${user.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${user.phone || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${user.role || 'N/A'}</div>
        <div class="px-2 py-1 flex justify-end space-x-2">
            <button class="edit-btn text-blue-600 hover:text-blue-800 font-semibold text-xs" data-id="${user.id}" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button class="delete-btn text-red-600 hover:text-red-800 font-semibold text-xs" data-id="${user.id}" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash-2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
        </div>
    `;
    userList.appendChild(userRow);

    // Add event listeners for the buttons
    userRow.querySelector('.edit-btn').addEventListener('click', () => editUser(user.id));
    userRow.querySelector('.delete-btn').addEventListener('click', () => deleteUser(user.id));
}
