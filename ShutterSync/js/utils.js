// js/utils.js

/**
 * Utility functions for the ShutterSync CRM application.
 * These functions provide common functionalities like displaying messages,
 * loading dynamic content, and handling UI elements.
 */

// Define a global object for utility functions to be easily accessible.
// This is an alternative to directly attaching to window, allowing for better organization.
export const Utils = {
    /**
     * Displays a custom modal message to the user instead of native browser alerts.
     * This ensures a consistent UI and avoids blocking the main thread.
     * @param {string} message - The message to be displayed.
     * @param {string} [type='info'] - The type of message ('info', 'success', 'warning', 'error').
     * @param {number} [duration=3000] - Duration in milliseconds for auto-hide (0 for permanent).
     */
    showMessage: function(message, type = 'info', duration = 3000) {
        // Create modal container if it doesn't exist
        let modalContainer = document.getElementById('message-modal-container');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'message-modal-container';
            modalContainer.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[1000] p-4';
            document.body.appendChild(modalContainer);
        }

        // Create the message box element
        const messageBox = document.createElement('div');
        messageBox.className = `relative p-6 rounded-lg shadow-xl text-white max-w-sm w-full mx-auto transform transition-all duration-300 scale-95 opacity-0`;
        messageBox.style.backgroundColor = this._getMessageColor(type);

        messageBox.innerHTML = `
            <div class="flex items-center">
                <i class="${this._getMessageIcon(type)} text-2xl mr-3"></i>
                <p class="flex-grow font-semibold text-lg">${message}</p>
                <button class="absolute top-2 right-2 text-white hover:text-gray-200 focus:outline-none" onclick="this.closest('#message-modal-container').remove()">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
        `;

        modalContainer.innerHTML = ''; // Clear previous messages
        modalContainer.appendChild(messageBox);

        // Animate in
        setTimeout(() => {
            messageBox.classList.remove('opacity-0', 'scale-95');
        }, 10); // Small delay to allow CSS transition

        // Auto-hide if duration is set
        if (duration > 0) {
            setTimeout(() => {
                messageBox.classList.add('opacity-0', 'scale-95');
                messageBox.addEventListener('transitionend', () => {
                    modalContainer.remove(); // Remove container after animation
                }, { once: true });
            }, duration);
        }
    },

    /**
     * Helper to get color based on message type.
     * @param {string} type - The message type.
     * @returns {string} - Hex color code.
     * @private
     */
    _getMessageColor: function(type) {
        switch (type) {
            case 'success': return '#10b981'; // Tailwind green-500
            case 'error': return '#ef4444';   // Tailwind red-500
            case 'warning': return '#f59e0b'; // Tailwind yellow-500
            case 'info':
            default: return '#3b82f6';        // Tailwind blue-500
        }
    },

    /**
     * Helper to get icon based on message type.
     * @param {string} type - The message type.
     * @returns {string} - Font Awesome class.
     * @private
     */
    _getMessageIcon: function(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'error': return 'fas fa-times-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'info':
            default: return 'fas fa-info-circle';
        }
    },

    /**
     * Clears the main content area and optionally displays a loading spinner.
     * @param {boolean} showLoading - If true, displays a loading spinner.
     */
    clearAndLoadContent: function(showLoading = false) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = ''; // Clear existing content
            if (showLoading) {
                // Add a simple loading spinner
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'loading-spinner';
                loadingDiv.className = 'flex items-center justify-center h-full min-h-[200px] text-blue-600';
                loadingDiv.innerHTML = `
                    <svg class="animate-spin -ml-1 mr-3 h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="text-xl font-semibold">Loading...</span>
                `;
                mainContent.appendChild(loadingDiv);
            }
        }
    },

    /**
     * Renders HTML content into the main content area.
     * @param {string} htmlContent - The HTML string to render.
     */
    renderContent: function(htmlContent) {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = htmlContent;
        }
    },

    /**
     * Helper function to handle errors consistently.
     * @param {Error} error - The error object.
     * @param {string} context - A string describing where the error occurred.
     */
    handleError: function(error, context = 'An unexpected error occurred') {
        console.error(`Error in ${context}:`, error);
        this.showMessage(`Error: ${error.message || context}`, 'error', 5000);
    },

    /**
     * Checks if the current user has the 'Admin' role.
     * Requires window.currentUserRole to be set by main.js
     * @returns {boolean} True if the user is an Admin, false otherwise.
     */
    isAdmin: function() {
        return window.currentUserRole === 'Admin';
    },

    /**
     * Checks if the user is logged in (authenticated).
     * Requires window.currentUserId to be set by main.js
     * @returns {boolean} True if the user is logged in, false otherwise.
     */
    isLoggedIn: function() {
        return window.currentUserId !== null;
    }
};
