// Change: Use named imports for specific global states and the Firestore DB instance
import { appId, auth, currentUserId, isAuthReady, isDbReady } from './main.js'; // Added isDbReady, and specific imports
import { collection, doc } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js"; // Import necessary Firestore functions

/**
 * Displays a custom modal for confirmations or important messages.
 * @param {string} title - The title of the modal.
 * @param {string} message - The message content of the modal.
 * @param {function} onConfirm - Callback function to execute when 'Confirm' is clicked.
 * @param {function} [onCancel] - Optional callback function to execute when 'Cancel' is clicked.
 */
export function showModal(title, message, onConfirm, onCancel) {
    const modalContainer = document.getElementById('modalContainer');
    if (!modalContainer) {
        console.error("utils.js: Modal container not found!");
        // As per instructions, avoid alert(). Log error and return.
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

/**
 * Displays a message in a designated message container within a section.
 * @param {string} type - Type of message ('success', 'error', 'info').
 * @param {string} message - The message text.
 * @param {string} containerId - The ID of the HTML element where the message should be displayed.
 * This element should have classes for message styling (e.g., 'message', 'success', 'error', 'info').
 */
export function showMessage(type, message, containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.textContent = message;
        container.className = `message ${type} mt-4 mb-4`; // Reset classes and apply new ones
        container.classList.remove('hidden'); // Ensure it's visible
    } else {
        console.warn(`utils.js: Message container with ID '${containerId}' not found.`);
    }
}

/**
 * Generates a simple unique ID (for client-side use before Firestore ID is available).
 * @returns {string} A unique ID string.
 */
export function generateUniqueId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Formats a Firebase Timestamp object or a Date object into a 'YYYY-MM-DD' string.
 * @param {firebase.firestore.Timestamp|Date} timestamp - The timestamp or Date object to format.
 * @returns {string} The formatted date string (YYYY-MM-DD).
 */
export function formatDate(timestamp) {
    let date;
    if (timestamp && typeof timestamp.toDate === 'function') {
        // It's a Firebase Timestamp
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        // It's a JavaScript Date object
        date = timestamp;
    } else if (typeof timestamp === 'string' && !isNaN(new Date(timestamp))) {
        // It's a date string that can be parsed
        date = new Date(timestamp);
    }
    else {
        return ''; // Return empty if invalid input
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Implements a debounce function to limit how often a function can be called.
 * Useful for events that fire rapidly (e.g., input, resize).
 * @param {function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {function} The debounced function.
 */
export function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}


/**
 * Determines the Firestore collection path based on authentication status and data area.
 * This is crucial for adhering to Firebase Security Rules.
 *
 * For 'public' data: artifacts/{appId}/public/data/{dataArea}
 * For 'private' data: artifacts/{appId}/users/{userId}/{dataArea}
 * For top-level shared collections (like 'opportunities_data', 'users_data'): just the collection name
 *
 * @param {string} dataArea - The specific data collection name (e.g., 'customers', 'opportunities_data', 'users_data').
 * @param {string} [type='private'] - The type of data: 'public', 'private', or 'top_level_shared'. Defaults to 'private'.
 * @returns {string|null} The full Firestore collection path, or null if authentication is required for private data but not available.
 */
export function getCollectionPath(dataArea, type = 'private') {
    // Debugging: Log appId visible within utils.js
    console.log("utils.js: DEBUG - appId visible in getCollectionPath:", appId);

    if (!appId) { // Access appId directly as it's imported
        console.error("utils.js: appId is not defined. Cannot construct collection path.");
        showMessage('error', 'Application ID missing. CRM features may not function correctly.', 'modalContainer');
        return null;
    }

    let path = null;
    // Handle new top-level collections explicitly
    if (dataArea === 'opportunities_data' || dataArea === 'users_data') {
        path = dataArea; // Return just the collection name for top-level collections
    } else if (type === 'public') {
        path = `artifacts/${appId}/public/data/${dataArea}`; // Access appId directly
    } else { // 'private'
        // isAuthReady, currentUserId, and isDbReady are imported from main.js
        if (!isAuthReady || !currentUserId || !isDbReady) { // Access directly
            console.warn(`utils.js: Attempted to access private data area '${dataArea}' before authentication/DB is ready or without a logged-in user.`);
            return null; // Critical: Do not return a path if auth/DB is missing for private data
        }
        path = `artifacts/${appId}/users/${currentUserId}/${dataArea}`; // Access directly
    }

    console.log(`utils.js: DEBUG - getCollectionPath returning: ${path} for dataArea: ${dataArea}, type: ${type}`);
    return path;
}

// Ensure the APP_SETTINGS_DOC_ID is consistent. It's better to manage it centrally in main.js.
// For now, mirroring it here as it was directly used in the original script.
// If it's used in main.js, it should be imported from main.js if needed.
// If it's used only here, then it can be defined here. Given its usage, it's global and should be in main.js.
// For now, keeping this local export to satisfy the current module's needs.
export const APP_SETTINGS_DOC_ID = "app_settings";
