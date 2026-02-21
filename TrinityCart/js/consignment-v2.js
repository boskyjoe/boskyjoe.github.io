// js/consignment-v2.js

import { masterData } from './masterData.js';
import { showModal } from './modal.js';
import { 
    showConsignmentModalV2, 
    updateConsignmentItemsGridV2,
    getConsignmentItemsV2 
} from './ui.js';

import { getItemsForCatalogue } from './api.js';

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
    document.getElementById('add-consignment-products-btn-v2').addEventListener('click', async () => {
        const catalogueId = document.getElementById('consignment-catalogue-select-v2').value;

        // 1. Validation: Ensure a catalogue is selected first
        if (!catalogueId) {
            showModal('error', 'No Catalogue Selected', 'Please select a Sales Catalogue before adding products.');
            return;
        }

        // 2. Fetch items for the selected catalogue
        const itemsFromCatalogue = await getItemsForCatalogue(catalogueId);
        if (!itemsFromCatalogue || itemsFromCatalogue.length === 0) {
            showModal('info', 'Empty Catalogue', 'This sales catalogue has no products in it.');
            return;
        }

        // 3. Update the items grid with the products from the selected catalogue
        // We will default the checkout quantity to 0. The admin will edit this.
        const gridItems = itemsFromCatalogue.map(item => ({
            productId: item.productId,
            productName: item.productName,
            sellingPrice: item.sellingPrice,
            quantityCheckedOut: 0, // Default to 0
            // Add other fields with default 0 values
            quantitySold: 0,
            quantityReturned: 0,
            quantityDamaged: 0,
            quantityGifted: 0
        }));

        updateConsignmentItemsGridV2(gridItems);
        showModal('success', 'Products Loaded', `${gridItems.length} products from the catalogue have been loaded into the grid. Please enter the quantities to check out.`);
    });
}
