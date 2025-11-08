// js/modal.js

// Define icons and colors for different modal types
const iconMap = {
    info: `<svg class="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    success: `<svg class="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    error: `<svg class="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    confirm: `<svg class="h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    warning: `<svg class="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`
};

// Track if a modal is currently open to prevent conflicts
let isModalOpen = false;

/**
 * Enhanced modal dialog with improved accessibility and security.
 * @param {object|string} options - Either options object or legacy type string
 * @param {string} [title] - Legacy parameter for title
 * @param {string} [message] - Legacy parameter for message
 * @returns {Promise<boolean|string>} Result of user action
 */
export function showModal(options, title, message) {
    // Handle both legacy and new API styles
    let config;
    if (typeof options === 'string') {
        // Legacy API: showModal('confirm', 'Title', 'Message')
        config = { type: options, title, message };
    } else {
        // New API: showModal({ type: 'confirm', title: 'Title', message: 'Message', actions: [...] })
        config = options;
    }

    // Prevent overlapping modals
    if (isModalOpen) {
        console.warn('Modal already open, ignoring new modal request');
        return Promise.resolve(false);
    }

    const modalElement = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalIcon = document.getElementById('modal-icon');
    const modalButtons = document.getElementById('modal-buttons');

    // Fallback to native dialogs if modal HTML is missing
    if (!modalElement || !modalTitle || !modalMessage || !modalIcon || !modalButtons) {
        console.error("Modal elements not found! Falling back to native dialogs.");
        if (config.type === 'confirm') {
            return Promise.resolve(confirm(`${config.title}\n\n${config.message}`));
        } else {
            alert(`${config.title}\n\n${config.message}`);
            return Promise.resolve(true);
        }
    }

    // **NEW: Calculate and set z-index higher than all other elements**
    const highestZIndex = getHighestZIndex();
    console.log(`[model.js] highestZIndex:`,highestZIndex);
    modalElement.style.zIndex = highestZIndex + 1;

    isModalOpen = true;

    return new Promise((resolve) => {
        // Store the previously focused element to restore later
        const previousFocus = document.activeElement;

        // Populate modal content (using textContent for security)
        modalTitle.textContent = config.title || 'Notification';
        //modalMessage.textContent = config.message || ''; // SECURITY FIX: Use textContent instead of innerHTML
        if (config.message) {
            // Escape HTML but preserve line breaks
            const escapedMessage = config.message
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;')
                .replace(/\n/g, '<br>');
            modalMessage.innerHTML = escapedMessage;
        } else {
            modalMessage.textContent = '';
        }
        modalIcon.innerHTML = iconMap[config.type] || iconMap.info;
        modalButtons.innerHTML = '';

        // Add ARIA attributes for accessibility
        modalElement.setAttribute('role', 'dialog');
        modalElement.setAttribute('aria-modal', 'true');
        modalElement.setAttribute('aria-labelledby', 'modal-title');
        modalElement.setAttribute('aria-describedby', 'modal-message');

        // Handle keyboard events
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeModal(false);
            } else if (e.key === 'Enter' && (config.type === 'confirm' || config.type === 'error' || config.type === 'success' || config.type === 'info')) {
                // Enter triggers primary action
                const primaryValue = config.type === 'confirm' ? true : false;
                closeModal(primaryValue);
            }
            
            // Simple focus trap
            trapFocus(e);
        };

        // Simple focus trapping within the modal
        const trapFocus = (e) => {
            if (e.key !== 'Tab') return;
            
            const focusableElements = modalElement.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) { // Shift + Tab (backwards)
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    e.preventDefault();
                }
            } else { // Tab (forwards)
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    e.preventDefault();
                }
            }
        };

        // Clean up function
        const closeModal = (value) => {
            document.removeEventListener('keydown', handleKeydown);
            modalElement.classList.remove('visible');
            
            setTimeout(() => {
                modalElement.style.display = 'none';
                // Restore focus to the element that had it before the modal opened
                if (previousFocus && document.body.contains(previousFocus)) {
                    previousFocus.focus();
                }
                isModalOpen = false;
            }, 300); // Match CSS transition duration
            
            resolve(value);
        };

        // Create buttons based on type or custom actions
        if (config.actions && Array.isArray(config.actions)) {
            // Custom actions array: [{ label: 'Delete', primary: true, value: 'delete' }, ...]
            config.actions.forEach(action => {
                const button = createButton(action.label, action.primary, action.value);
                modalButtons.appendChild(button);
            });
        } else {
            // Default button configurations
            if (config.type === 'confirm') {
                modalButtons.appendChild(createButton('Cancel', false, false));
                modalButtons.appendChild(createButton('OK', true, true));
            } else {
                modalButtons.appendChild(createButton('OK', true, true));
            }
        }

        // Enhanced button creation with keyboard handling
        function createButton(text, primary = false, value = false) {
            const button = document.createElement('button');
            button.textContent = text;
            button.className = primary ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary';
            
            button.onclick = () => closeModal(value);
            
            return button;
        }

        // Attach keyboard event listener
        document.addEventListener('keydown', handleKeydown);

        // Show modal with animation
        modalElement.style.display = 'flex';
        setTimeout(() => {
            modalElement.classList.add('visible');
            
            // Focus management: Focus primary button for confirms, first button otherwise
            setTimeout(() => {
                let targetButton;
                if (config.type === 'confirm') {
                    targetButton = modalButtons.querySelector('.modal-btn-primary');
                } else {
                    targetButton = modalButtons.querySelector('button');
                }
                if (targetButton) targetButton.focus();
            }, 50); // Small delay to ensure animation starts
        }, 10);
    });
}

// **NEW: Helper function to find the highest z-index**
function getHighestZIndex() {
    const allElements = document.querySelectorAll('*');
    let highest = 0;

    allElements.forEach(element => {
        const zIndex = window.getComputedStyle(element).zIndex;
        
        // Check if z-index is a valid number (not 'auto')
        if (zIndex !== 'auto' && !isNaN(zIndex)) {
            const numericZIndex = parseInt(zIndex, 10);
            if (numericZIndex > highest) {
                highest = numericZIndex;
            }
        }
    });

    // Return at least 1000 to ensure it's above most content
    return Math.max(highest, 10000);
}
/**
 * Enhanced showModal with preset configurations for common use cases
 */
export const ModalPresets = {
    /**
     * Quick success notification with auto-dismiss
     */
    success: (message, autoDismiss = 3000) => {
        const promise = showModal('success', 'Success', message);
        if (autoDismiss > 0) {
            setTimeout(() => {
                const modal = document.getElementById('custom-modal');
                if (modal && modal.classList.contains('visible')) {
                    modal.classList.remove('visible');
                    setTimeout(() => modal.style.display = 'none', 300);
                }
            }, autoDismiss);
        }
        return promise;
    },

    /**
     * Error notification with retry option
     */
    error: (message, showRetry = false) => {
        if (showRetry) {
            return showModal({
                type: 'error',
                title: 'Error',
                message,
                actions: [
                    { label: 'Cancel', primary: false, value: false },
                    { label: 'Retry', primary: true, value: 'retry' }
                ]
            });
        }
        return showModal('error', 'Error', message);
    },

    /**
     * Confirmation with custom button labels
     */
    confirm: (message, confirmLabel = 'OK', cancelLabel = 'Cancel') => {
        return showModal({
            type: 'confirm',
            title: 'Confirm Action',
            message,
            actions: [
                { label: cancelLabel, primary: false, value: false },
                { label: confirmLabel, primary: true, value: true }
            ]
        });
    },

    /**
     * Delete confirmation with warning styling
     */
    deleteConfirm: (itemName) => {
        return showModal({
            type: 'warning',
            title: 'Delete Confirmation',
            message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
            actions: [
                { label: 'Cancel', primary: false, value: false },
                { label: 'Delete', primary: true, value: true }
            ]
        });
    }
};

/**
 * Utility to close any open modal programmatically
 */
export function closeModal() {
    const modal = document.getElementById('custom-modal');
    if (modal && modal.classList.contains('visible')) {
        modal.classList.remove('visible');
        setTimeout(() => {
            modal.style.display = 'none';
            isModalOpen = false;
        }, 300);
    }
}

/**
 * Check if a modal is currently open
 */
export function isModalCurrentlyOpen() {
    return isModalOpen;
}
