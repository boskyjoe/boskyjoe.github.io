import { appId, auth, currentUserId, isAuthReady } from './main.js'; // Import global state and Firebase instances from main.js

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
    if (!auth || !auth.currentUser) { // Check if auth is initialized and user is authenticated
        console.warn("No authenticated user, cannot determine collection path securely.");
        // For public data, still provide the public path even if not logged in (e.g., for initial setup)
        if (type === 'public') {
            return `artifacts/${appId}/public/data/${dataArea}`;
        }
        // For private data, if no user is authenticated, it's an error scenario for data operations
        showModal("Authentication Error", "You must be logged in to access private data.", () => {});
        return null; // Return null to indicate path is not available
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
