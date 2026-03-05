// js/consignment-v2.js

import { masterData } from './masterData.js';
import { showModal } from './modal.js';
import { 
    showConsignmentModalV2, 
    updateConsignmentItemsGridV2,
    getConsignmentItemsV2 ,ProgressToast,closeConsignmentModalV2
} from './ui.js';

import { getItemsForCatalogue ,recordSimpleConsignmentPayment,voidSimpleConsignmentPayment,closeSimpleConsignment } from './api.js';
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

    document.addEventListener('click', async (event) => {
        const voidBtn = event.target.closest('.void-payment-btn-v2');
        if (voidBtn) {
            const paymentId = voidBtn.dataset.id;
            const orderId = document.getElementById('consignment-order-id-v2').value;
            const user = appState.currentUser;

            const confirmed = await showModal('confirm', 'Void Payment', 
                'Are you sure you want to void this payment? This will create a reversal entry and increase the balance due.');

            if (confirmed) {
                ProgressToast.show('Voiding Payment...', 'info');
                try {
                    await voidSimpleConsignmentPayment(orderId, paymentId, user);
                    ProgressToast.showSuccess('Payment voided and balance adjusted.');
                } catch (error) {
                    console.error("Void failed:", error);
                    showModal('error', 'Void Failed', error.message);
                }
                setTimeout(() => ProgressToast.hide(500), 1200);
            }
        }
    });

    document.getElementById('consignment-record-payment-btn-v2').addEventListener('click', async () => {
        const user = appState.currentUser;
        const orderId = document.getElementById('consignment-order-id-v2').value;

        if (!user || !orderId) {
            return showModal('error', 'Error', 'Cannot record payment without a selected order.');
        }

        // 1. Capture the values
        const amountVal = document.getElementById('consignment-amount-paid-v2').value;
        const dateVal = document.getElementById('consignment-payment-date-v2').value;
        const modeVal = document.getElementById('consignment-payment-mode-v2').value;
        const refVal = document.getElementById('consignment-payment-ref-v2').value.trim();
        const paymentType = document.getElementById('consignment-transaction-type-v2').value ;

        const paymentData = {
            paymentType:paymentType,
            amount: parseFloat(amountVal) || 0,
            date: new Date(dateVal),
            mode: modeVal,
            reference: refVal,
            contact: document.getElementById('consignment-payment-contact-v2').value.trim(),
            notes: document.getElementById('consignment-payment-notes-v2').value.trim()
        };

        // --- DEBUG LOGS: Open your console (F12) to see these ---
        console.log("Checking Payment Validation:");
        console.log("- Amount:", paymentData.amount, (paymentData.amount <= 0 ? "❌ INVALID" : "✅ OK"));
        console.log("- Date String:", dateVal, (dateVal === "" ? "❌ EMPTY" : "✅ OK"));
        console.log("- Date Object:", paymentData.date, (isNaN(paymentData.date.getTime()) ? "❌ INVALID DATE" : "✅ OK"));
        console.log("- Mode:", paymentData.mode, (paymentData.mode === "" ? "❌ EMPTY" : "✅ OK"));
        console.log("- Reference:", paymentData.reference, (paymentData.reference === "" ? "❌ EMPTY" : "✅ OK"));

        // 2. IMPROVED VALIDATION
        // We check if the amount is > 0, if the date is valid, and if mode/ref are not empty strings
        const isDateInvalid = isNaN(paymentData.date.getTime());
        
        if (paymentData.amount <= 0 || isDateInvalid || !paymentData.mode || !paymentData.reference) {
            return showModal('error', 'Missing Information', 'Please fill out all mandatory (*) payment fields with valid data.');
        }

        // 3. Proceed to save if valid
        ProgressToast.show('Recording Payment...', 'info');
        try {
            await recordSimpleConsignmentPayment(orderId, paymentData, user);
            ProgressToast.showSuccess('Payment recorded successfully!');
            
            // Clear fields
            document.getElementById('consignment-amount-paid-v2').value = '';
            document.getElementById('consignment-payment-ref-v2').value = '';
            document.getElementById('consignment-payment-contact-v2').value = '';
            document.getElementById('consignment-payment-notes-v2').value = '';
        } catch (error) {
            console.error("Record Payment Error:", error);
            ProgressToast.showError('Failed to record payment.');
        }
        setTimeout(() => ProgressToast.hide(500), 1200);
    });
    

    const finalizeBtn = document.getElementById('consignment-finalize-btn-v2');
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', async () => {
            const orderId = document.getElementById('consignment-order-id-v2').value;
            const user = appState.currentUser;

            const confirmed = await showModal('confirm', 'Finalize & Close Order', 
                'Are you sure? This will lock the order and all quantities from further changes.');

            if (confirmed) {
                ProgressToast.show('Closing Order...', 'info');
                try {
                    await closeSimpleConsignment(orderId, user);
                    ProgressToast.showSuccess('Order finalized and locked.');
                    // The real-time listener in ui.js will automatically 
                    // refresh the modal to its read-only state.
                } catch (error) {
                    showModal('error', 'Closure Failed', error.message);
                }
                setTimeout(() => ProgressToast.hide(500), 1200);
            }
        });
    }




    // Button inside the modal to add products
    document.getElementById('add-consignment-products-btn-v2').addEventListener('click', async () => {
        // 1. Determine Mode and Get Catalogue ID
        const orderId = document.getElementById('consignment-order-id-v2').value;
        const isEditMode = !!orderId;
        let catalogueId;

        if (isEditMode) {
            // In Settle Mode, find the order in masterData to get its catalogueId
            const order = masterData.simpleConsignments.find(o => o.id === orderId);
            catalogueId = order ? order.salesCatalogueId : null;
        } else {
            // In New Checkout Mode, get it from the dropdown
            catalogueId = document.getElementById('consignment-catalogue-select-v2').value;
        }

        // 2. Validation: Ensure we have a catalogue ID
        if (!catalogueId) {
            showModal('error', 'No Catalogue Selected', 'Please select a Sales Catalogue before adding products.');
            return;
        }

        // 3. Fetch items from the catalogue
        const itemsFromCatalogue = await getItemsForCatalogue(catalogueId);
        if (!itemsFromCatalogue || itemsFromCatalogue.length === 0) {
            showModal('info', 'Empty Catalogue', 'This sales catalogue has no products in it.');
            return;
        }

        // 4. Filter out products already present in the current grid
        const currentGridItems = getConsignmentItemsV2();
        const existingProductIds = new Set(currentGridItems.map(item => item.productId));

        const itemsToAdd = itemsFromCatalogue.filter(item => !existingProductIds.has(item.productId));

        if (itemsToAdd.length === 0) {
            showModal('info', 'No New Products', 'All products from this catalogue are already in the order.');
            return;
        }

        // 5. Map new items to the required structure
        const processedNewItems = itemsToAdd.map(item => {
            const masterProduct = masterData.products.find(p => p.id === item.productId);
            const inventoryCount = masterProduct ? masterProduct.inventoryCount : 0;

            return {
                productId: item.productId,
                productName: item.productName,
                sellingPrice: item.sellingPrice,
                inventoryCount: inventoryCount,
                quantityCheckedOut: 0,
                quantitySold: 0,
                quantityReturned: 0,
                quantityDamaged: 0,
                quantityGifted: 0
            };
        });

        // 6. Combine existing items with the new ones and update the grid
        const finalGridData = [...currentGridItems, ...processedNewItems];
        updateConsignmentItemsGridV2(finalGridData);

        showModal('success', 'Products Added', `${processedNewItems.length} new products from the catalogue have been added to the list.`);
    });
}
