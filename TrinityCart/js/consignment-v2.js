// js/consignment-v2.js

import { masterData } from './masterData.js';
import { showModal } from './modal.js';
import { 
    showConsignmentModalV2, 
    updateConsignmentItemsGridV2,
    getConsignmentItemsV2 ,ProgressToast
} from './ui.js';

import { getItemsForCatalogue ,recordSimpleConsignmentPayment } from './api.js';
import { appState } from './state.js';

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

    document.getElementById('consignment-record-payment-btn-v2').addEventListener('click', async () => {
        const user = appState.currentUser;
        const orderId = document.getElementById('consignment-order-id-v2').value;

        if (!user || !orderId) {
            return showModal('error', 'Error', 'Cannot record payment without a selected order.');
        }

        const paymentData = {
            amount: parseFloat(document.getElementById('consignment-amount-paid-v2').value) || 0,
            date: new Date(document.getElementById('consignment-payment-date-v2').value),
            mode: document.getElementById('consignment-payment-mode-v2').value,
            reference: document.getElementById('consignment-payment-ref-v2').value.trim(),
            contact: document.getElementById('consignment-payment-contact-v2').value.trim(),
            notes: document.getElementById('consignment-payment-notes-v2').value.trim()
        };

        // Validation
        if (paymentData.amount <= 0 || !paymentData.date || !paymentData.mode || !paymentData.reference) {
            return showModal('error', 'Missing Information', 'Please fill out all mandatory (*) payment fields.');
        }

        ProgressToast.show('Recording Payment...', 'info');
        try {
            await recordSimpleConsignmentPayment(orderId, paymentData, user);
            ProgressToast.showSuccess('Payment recorded successfully!');
            // The real-time listener on the order will automatically update the UI.
            // We just need to clear the payment form fields.
            document.getElementById('consignment-amount-paid-v2').value = '';
            document.getElementById('consignment-payment-ref-v2').value = '';
            document.getElementById('consignment-payment-contact-v2').value = '';
            document.getElementById('consignment-payment-notes-v2').value = '';
        } catch (error) {
            ProgressToast.showError('Failed to record payment.');
            console.error(error);
        }
        setTimeout(() => ProgressToast.hide(500), 1200);
    });
    
    // Button inside the modal to add products
    document.getElementById('add-consignment-products-btn-v2').addEventListener('click', async () => {
        const catalogueId = document.getElementById('consignment-catalogue-select-v2').value;

        if (!catalogueId) {
            showModal('error', 'No Catalogue Selected', 'Please select a Sales Catalogue before adding products.');
            return;
        }

        const itemsFromCatalogue = await getItemsForCatalogue(catalogueId);
        if (!itemsFromCatalogue || itemsFromCatalogue.length === 0) {
            showModal('info', 'Empty Catalogue', 'This sales catalogue has no products in it.');
            return;
        }

        // --- THIS IS THE NEW LOGIC ---
        // Cross-reference with masterData to get the current inventory count
        const gridItems = itemsFromCatalogue.map(item => {
            const masterProduct = masterData.products.find(p => p.id === item.productId);
            const inventoryCount = masterProduct ? masterProduct.inventoryCount : 0;

            return {
                productId: item.productId,
                productName: item.productName,
                sellingPrice: item.sellingPrice,
                inventoryCount: inventoryCount, // <-- ADDED: The current stock level
                quantityCheckedOut: 0,
                // Add other fields with default 0 values
                quantitySold: 0,
                quantityReturned: 0,
                quantityDamaged: 0,
                quantityGifted: 0
            };
        });
        
        // --- END OF NEW LOGIC ---

        updateConsignmentItemsGridV2(gridItems);
        showModal('success', 'Products Loaded', `${gridItems.length} products from the catalogue have been loaded. You can now enter the quantities to check out.`);
    });
}
