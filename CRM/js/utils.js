import { appId, auth, currentUserId, isAuthReady } from './main.js'; // Import global state and Firebase instances from main.js
import { collection, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js"; // Import necessary Firestore functions

// Function to show a custom confirmation modal
export function showModal(title, message, onConfirm, onCancel) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error("Modal container not found!");
        // Fallback to alert if modal container doesn't exist, though it should always be present in the HTML.
        alert(`${title}\n${message}`); 
        return;
    }
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

// Determine the Firestore collection path based on type and data area
// Exported so other modules can use it
export function getCollectionPath(type, dataArea) {
    // Note: The `auth` object might not be fully ready immediately on module load.
    // Ensure `currentUserId` is properly populated via `onAuthStateChanged` in main.js
    // before attempting Firestore operations that depend on `userId`.
    // The main.js `showSection` function already has checks for `isAuthReady` and `currentUserId`.
    if (!isAuthReady || !auth || !auth.currentUser) {
        console.warn("Authentication not ready or no user logged in. Cannot determine collection path securely for private data.");
        if (type === 'public') {
            // For public data, we can still provide the path even if user is not logged in.
            // This assumes public data does not require a `userId` in its path.
            return `artifacts/${appId}/public/data/${dataArea}`;
        }
        showModal("Authentication Required", "You must be logged in to access or modify this data.", () => {});
        return null; // Return null to indicate path is not available for private data without auth
    }

    const userId = auth.currentUser.uid;
    if (type === 'public') {
        return `artifacts/${appId}/public/data/${dataArea}`;
    } else { // 'private'
        return `artifacts/${appId}/users/${userId}/${dataArea}`;
    }
}

// Placeholder for APP_SETTINGS_DOC_ID as it's a global constant
// It's better to manage these central constants in main.js or a dedicated config.js
// For now, mirroring it here as it was directly used in the original script.
export const APP_SETTINGS_DOC_ID = "app_settings";
