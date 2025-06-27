// users.js
import { db, auth, currentUserId, isAdmin, isAuthReady, addUnsubscribe, removeUnsubscribe } from './main.js';
import { showModal } from './utils.js';

import { collection, doc, setDoc, deleteDoc, onSnapshot, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// DOM elements for Users Management Section
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

let unsubscribeUsers = null; // To store the onSnapshot unsubscribe function for users

// Initialize Users Module elements and event listeners
export async function initUsersModule() {
    console.log("users.js: initUsersModule called.");
    console.log("users.js: initUsersModule current state - db:", db, "isAuthReady:", isAuthReady, "currentUserId:", currentUserId, "isAdmin:", isAdmin);

    // Initialize DOM elements if they haven't been already
    if (!usersManagementSection) { // Check if elements are already initialized
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

        // Add event listener for user form
        if (userForm) {
            userForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const userData = {
                    userName: userNameInput.value.trim(),
                    firstName: userFirstNameInput.value.trim(),
                    lastName: userLastNameInput.value.trim(),
                    email: userEmailInput.value.trim(),
                    phone: userPhoneInput.value.trim(),
                    role: userRoleSelect.value.trim(),
                    skills: userSkillsInput.value.trim(), // Will be parsed to array in saveUser
                };
                const editingId = userForm.dataset.editingId;
                await saveUser(userData, editingId || null);
            });
        }
        document.getElementById('resetUserFormButton')?.addEventListener('click', resetUserForm);
    }

    // Load data specific to this module
    if (isAuthReady && isAdmin) {
        listenForUsers(); // Start listening for users data
        resetUserForm(); // Reset user form
        if (submitUserButton) submitUserButton.removeAttribute('disabled');
    } else {
        if (submitUserButton) submitUserButton.setAttribute('disabled', 'disabled');
        if (userList) userList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Access Denied: Only administrators can view users.</p>';
    }
}

// Determine the Firestore collection path for users
function getUsersCollectionPath() {
    // Users data is not part of 'artifacts/{appId}/public/data' or 'artifacts/{appId}/users/{userId}'
    // It's a top-level collection for admin management of all user profiles.
    return `users_data`;
}

/* --- USERS CRUD OPERATIONS --- */

// Save (Add/Update) a User
async function saveUser(userData, existingFirestoreDocId = null) {
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage users.", () => {});
        return;
    }

    // Gmail email validation for userName (which is the email they log in with)
    const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!gmailRegex.test(userData.userName)) {
        showModal("Validation Error", "User Name (Email) must be a valid Gmail email address.", () => {});
        return;
    }

    // Explicit validation for all mandatory fields
    const mandatoryFields = [
        { field: userData.firstName.trim(), name: "First Name" },
        { field: userData.lastName.trim(), name: "Last Name" },
        { field: userData.email.trim(), name: "Contact Email" },
        { field: userData.phone.trim(), name: "Phone" },
        { field: userData.role.trim(), name: "Role" }
    ];

    let missingFields = [];
    mandatoryFields.forEach(item => {
        if (!item.field) {
            missingFields.push(item.name);
        }
    });

    // Skills field check (after trimming and filtering empty strings from comma-separated input)
    const processedSkills = userData.skills.split(',').map(s => s.trim()).filter(s => s !== '');
    if (processedSkills.length === 0) {
        missingFields.push("Skills");
    }
    userData.skills = processedSkills; // Update userData.skills to the processed array for saving


    if (missingFields.length > 0) {
        const message = `Please fill in all mandatory fields: ${[...new Set(missingFields)].join(', ')}.`;
        showModal("Validation Error", message, () => {});
        return;
    }

    // Set profileAccess based on role
    userData.profileAccess = (userData.role === 'Admin');

    const collectionPath = getUsersCollectionPath();

    try {
        let targetDocRef;
        let targetUid;

        if (existingFirestoreDocId) {
            // EDITING AN EXISTING USER
            targetDocRef = doc(db, collectionPath, existingFirestoreDocId);
            await setDoc(targetDocRef, userData, { merge: true }); // Use setDoc with merge for update
            console.log("User updated:", existingFirestoreDocId);
            showModal("Success", "User profile updated successfully!", () => {});
        } else {
            // ADDING A NEW USER PROFILE
            if (!userIdDisplayInput.value.trim()) {
                 showModal("Validation Error", "For new user profiles, you must provide the Firebase User ID (UID). This user should first be created in Firebase Authentication.", () => {});
                 return;
            }
            targetUid = userIdDisplayInput.value.trim();

            // Check if a user profile with this UID already exists
            const existingProfileSnap = await getDoc(doc(db, collectionPath, targetUid));
            if (existingProfileSnap.exists()) {
                showModal("Creation Error", "A user profile with this UID already exists. Please edit the existing profile or provide a unique UID for a new user.", () => {});
                return;
            }

            targetDocRef = doc(db, collectionPath, targetUid); // Use the provided UID as the document ID
            await setDoc(targetDocRef, { ...userData, userId: targetUid }); // Store UID also as userId field
            console.log("New user profile created. Doc ID is provided UID:", targetUid);
            showModal("Success", "New user profile created successfully!", () => {});
        }

        resetUserForm(); // Reset form after successful operation
    } catch (error) {
        console.error("Error saving user:", error);
        showModal("Error", `Failed to save user: ${error.message}`, () => {});
    }
}

// Delete a User
async function deleteUser(firestoreDocId) {
    if (!isAuthReady || !currentUserId || !isAdmin) {
        showModal("Permission Denied", "Only administrators can manage users.", () => {});
        return;
    }

    const collectionPath = getUsersCollectionPath();
    showModal(
        "Confirm Deletion",
        "Are you sure you want to delete this user? This action cannot be undone.",
        async () => {
            try {
                await deleteDoc(doc(db, collectionPath, firestoreDocId));
                console.log("User deleted Firestore Doc ID:", firestoreDocId);
                showModal("Success", "User profile deleted successfully!", () => {});
            } catch (error) {
                console.error("Error deleting user:", error);
                showModal("Error", `Failed to delete user: ${error.message}`, () => {});
            }
        }
    );
}

// Listen for real-time updates to Users
export function listenForUsers() {
    if (unsubscribeUsers) {
        unsubscribeUsers(); // Unsubscribe from previous listener
    }

    // Crucial check: ensure db is not null/undefined before creating collection reference
    if (!db || !isAuthReady || !currentUserId || !isAdmin) {
        if (userList) userList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">Access Denied: Only administrators can view users.</p>';
        console.warn("users.js: Cannot listen for users. DB not ready or user not authenticated/admin.");
        return;
    }

    const collectionPath = getUsersCollectionPath();
    const q = collection(db, collectionPath); // This is the line that was causing the error if db was not ready

    unsubscribeUsers = onSnapshot(q, (snapshot) => {
        if (userList) userList.innerHTML = ''; // Clear current list
        if (snapshot.empty) {
            if (userList) userList.innerHTML = '<p class="text-gray-500 text-center col-span-full py-4">No users found. Add one above by providing their Firebase UID after creating them in Firebase Authentication!</p>';
            return;
        }
        snapshot.forEach((doc) => {
            const user = { id: doc.id, ...doc.data() }; // doc.id is Firestore's internal ID (which should be the UID for users_data)
            displayUser(user);
        });
    }, (error) => {
        console.error("Error listening to users:", error);
        if (userList) userList.innerHTML = `<p class="text-red-500 text-center col-span-full py-4">Error loading users: ${error.message}</p>`;
    });

    addUnsubscribe('users', unsubscribeUsers); // Register with main.js's central tracker
}

// Display a single user in the UI as a grid row
function displayUser(user) {
    if (!userList) return; // Defensive check
    const userRow = document.createElement('div');
    userRow.className = 'data-grid-row';
    userRow.dataset.id = user.id; // Store Firestore document ID for edit/delete actions

    const displayUid = user.id || 'N/A'; // Use Firestore doc ID for display, which should be the UID

    userRow.innerHTML = `
        <div class="px-2 py-1 truncate font-medium text-gray-800">${displayUid}</div>
        <div class="px-2 py-1 truncate">${user.userName || 'N/A'}</div>
        <div class="px-2 py-1 truncate">${user.email || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden sm:block">${user.role || 'N/A'}</div>
        <div class="px-2 py-1 truncate hidden md:block">${Array.isArray(user.skills) ? user.skills.join(', ') : user.skills || 'N/A'}</div>
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

    userRow.querySelector('.edit-btn').addEventListener('click', () => editUser(user));
    userRow.querySelector('.delete-btn').addEventListener('click', () => deleteUser(user.id));
}

// Populate form for editing a user
function editUser(user) {
    if (!isAdmin) {
        showModal("Permission Denied", "Only administrators can edit users.", () => {});
        return;
    }
    if (userFormTitle) userFormTitle.textContent = 'Edit User Profile';
    if (submitUserButton) submitUserButton.textContent = 'Update User Profile';

    if (userIdDisplayGroup) userIdDisplayGroup.classList.remove('hidden');
    if (userIdDisplayInput) {
        userIdDisplayInput.value = user.id || 'N/A';
        userIdDisplayInput.setAttribute('readonly', 'readonly');
        userIdDisplayInput.classList.add('bg-gray-100');
    }

    if (userNameInput) userNameInput.value = user.userName || '';
    if (userFirstNameInput) userFirstNameInput.value = user.firstName || '';
    if (userLastNameInput) userLastNameInput.value = user.lastName || '';
    if (userEmailInput) userEmailInput.value = user.email || '';
    if (userPhoneInput) userPhoneInput.value = user.phone || '';
    if (userRoleSelect) userRoleSelect.value = user.role || '';
    if (userSkillsInput) userSkillsInput.value = Array.isArray(user.skills) ? user.skills.join(', ') : user.skills || '';

    if (userForm) userForm.dataset.editingId = user.id;
    if (userForm) userForm.scrollIntoView({ behavior: 'smooth' });
}

// Reset User form function
export function resetUserForm() { // Exported for main.js to use
    if (userForm) userForm.reset();
    if (userForm) userForm.dataset.editingId = '';
    if (userFormTitle) userFormTitle.textContent = 'Add New User Profile';
    if (submitUserButton) submitUserButton.textContent = 'Create User Profile';

    if (userIdDisplayGroup) userIdDisplayGroup.classList.remove('hidden');
    if (userIdDisplayInput) {
        userIdDisplayInput.value = '';
        userIdDisplayInput.removeAttribute('readonly');
        userIdDisplayInput.classList.remove('bg-gray-100');
        userIdDisplayInput.focus();
    }
    if (userRoleSelect) userRoleSelect.value = 'User';
}

