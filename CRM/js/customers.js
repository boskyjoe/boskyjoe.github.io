import { appId, currentUserId } from './main.js'; // Ensure appId and currentUserId are imported

export const APP_SETTINGS_DOC_ID = "app_settings"; // Document ID for app-wide settings within app_metadata

// Generic modal functions
export function showModal(title, message, onCloseCallback) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error("Modal container not found!");
        alert(`${title}\n\n${message}`); // Fallback to alert if container is missing
        if (onCloseCallback) onCloseCallback();
        return;
    }

    // Remove any existing modal to ensure only one is active
    let existingModal = modalContainer.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
    modalOverlay.innerHTML = `
        <div class="modal-content bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4 relative">
            <button class="modal-close-btn absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl font-bold leading-none">&times;</button>
            <h3 class="text-xl font-bold mb-4 text-gray-800">${title}</h3>
            <p class="text-gray-700 mb-6">${message}</p>
            <div class="flex justify-end space-x-3">
                <button class="modal-ok-btn btn-primary">OK</button>
            </div>
        </div>
    `;

    modalContainer.appendChild(modalOverlay);

    const closeButton = modalOverlay.querySelector('.modal-close-btn');
    const okButton = modalOverlay.querySelector('.modal-ok-btn');

    const closeModal = () => {
        modalOverlay.remove();
        if (onCloseCallback) {
            onCloseCallback();
        }
    };

    closeButton.addEventListener('click', closeModal);
    okButton.addEventListener('click', closeModal);

    // Close modal if clicking outside the content
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
}

/**
 * Constructs a Firestore collection path based on visibility (private/public) and collection name.
 * @param {string} visibility 'private' or 'public'.
 * @param {string} collectionName The name of the collection (e.g., 'customers', 'opportunities').
 * @returns {string} The full Firestore collection path.
 */
export function getCollectionPath(visibility, collectionName) {
    if (visibility === 'private') {
        // Private user data: artifacts/{appId}/users/{userId}/{collectionName}
        if (!currentUserId) {
            console.error("Attempted to get private collection path without a currentUserId.");
            throw new Error("User not authenticated for private data access.");
        }
        return `artifacts/${appId}/users/${currentUserId}/${collectionName}`;
    } else if (visibility === 'public') {
        // Public app-wide data: artifacts/{appId}/public/data/{collectionName}
        return `artifacts/${appId}/public/data/${collectionName}`;
    } else {
        console.error(`Invalid visibility type: ${visibility}`);
        throw new Error("Invalid visibility type for collection path.");
    }
}
