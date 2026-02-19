// js/consignment-v2.js

import { masterData } from './masterData.js';
import { showModal } from './modal.js';
import { 
    showConsignmentModalV2, 
    updateConsignmentItemsGridV2,
    getConsignmentItemsV2 
} from './ui.js';

/**
 * Main initialization function for the Simple Consignment module.
 * This is called once from main.js.
 */
export function initializeConsignmentV2Module() {
    console.log('[consignment-v2.js] Initializing Simple Consignment module...');

    // Main button to open the modal for a new checkout
    document.getElementById('new-consignment-checkout-btn-v2').addEventListener('click', () => {
        // Calling with no data opens the modal in "New Checkout" mode
        showConsignmentModalV2(null);
    });

    // Event delegation to handle clicks on the "Settle" buttons in the main grid
    document.addEventListener('click', (event) => {
        const settleButton = event.target.closest('.settle-consignment-btn-v2');
        if (settleButton) {
            const orderId = settleButton.dataset.id;
            const orderData = masterData.simpleConsignments.find(o => o.id === orderId);
            if (orderData) {
                // Calling with data opens the modal in "Settle" mode
                showConsignmentModalV2(orderData);
            } else {
                showModal('error', 'Order Not Found', 'Could not find the data for the selected order.');
            }
        }
    });

    // Button inside the modal to add products
    document.getElementById('add-consignment-products-btn-v2').addEventListener('click', () => {
        // This can reuse your existing product selection modal logic
        // For now, we'll simulate adding an item.
        const currentItems = getConsignmentItemsV2();
        const product = masterData.products[0]; // Just an example
        
        if (product && !currentItems.some(item => item.productId === product.id)) {
            const newItem = {
                productId: product.id,
                productName: product.itemName,
                sellingPrice: product.sellingPrice,
                quantityCheckedOut: 10, // Default checkout quantity
                quantitySold: 0,
                quantityReturned: 0,
                quantityDamaged: 0,
                quantityGifted: 0
            };
            updateConsignmentItemsGridV2([...currentItems, newItem]);
        }
    });
}
