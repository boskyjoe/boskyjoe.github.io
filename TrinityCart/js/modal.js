// js/modal.js

// Define icons and colors for different modal types
const iconMap = {
    info: `<svg class="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    success: `<svg class="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    error: `<svg class="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
    confirm: `<svg class="h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
};

/**
 * Displays a custom modal dialog.
 * Returns a Promise that resolves to true if the primary action is taken, and false otherwise.
 * @param {'info'|'success'|'error'|'confirm'} type - The type of modal to show.
 * @param {string} title - The title of the modal.
 * @param {string} message - The main message content.
 * @returns {Promise<boolean>}
 */
export function showModal(type, title, message) {
    // THE FIX: Get all elements inside the function, when we know the DOM is ready.
    const modalElement = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalIcon = document.getElementById('modal-icon');
    const modalButtons = document.getElementById('modal-buttons');

    // Safety check in case the modal HTML is missing from index.html
    if (!modalElement || !modalTitle || !modalMessage || !modalIcon || !modalButtons) {
        console.error("Modal elements not found in the DOM! Falling back to standard confirm/alert.");
        // Fallback to the browser's default for critical confirmations
        if (type === 'confirm') {
            return Promise.resolve(confirm(`${title}\n\n${message}`));
        } else {
            alert(`${title}\n\n${message}`);
            return Promise.resolve(true);
        }
    }

     console.log('[showModal]');

    return new Promise((resolve) => {
        modalTitle.textContent = title;
        modalMessage.innerHTML = message;
        modalIcon.innerHTML = iconMap[type] || iconMap.info;
        modalButtons.innerHTML = '';

        modalElement.style.display = 'flex';
        modalElement.classList.add('visible');

        const createButton = (text, primary = false, value = false) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.className = primary ? 'modal-btn modal-btn-primary' : 'modal-btn modal-btn-secondary';
            //button.onclick = () => {
              //  modalElement.classList.remove('visible');
               // resolve(value);
           // };

            button.onclick = () => {
                modalElement.classList.remove('visible');
                setTimeout(() => {
                    modalElement.style.display = 'none';
                }, 300); // Wait for fade transition
                resolve(value);
            };
            
            return button;
        };

        if (type === 'confirm') {
            modalButtons.appendChild(createButton('Cancel', false, false));
            modalButtons.appendChild(createButton('OK', true, true));
        } else {
            modalButtons.appendChild(createButton('OK', true, true));
        }

        modalElement.classList.add('visible');
        
        // Also, ensure the first button is focused for accessibility
        const firstButton = modalButtons.querySelector('button');
        if(firstButton) firstButton.focus();
    });
}
