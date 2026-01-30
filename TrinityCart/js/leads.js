// js/leads.js

import { masterData } from './masterData.js';
import { showView } from './ui.js';
import { openLeadModal } from './ui.js';
import { showModal } from './modal.js';




/**
 * Handles the logic for converting a lead into a sale.
 * @param {string} leadId - The ID of the lead to convert.
 */
function convertLeadToSale(leadId) {
    const lead = masterData.leads.find(l => l.id === leadId);
    if (!lead) {
        return showModal('error', 'Lead Not Found', 'Could not find the selected lead to convert.');
    }

    console.log("Converting lead to sale:", lead);
    
    sessionStorage.setItem('leadConversionData', JSON.stringify(lead));
    showView('sales-view');
    showModal('info', 'Lead Loaded', `Lead for "${lead.customerName}" has been loaded into the New Sale form.`);
}

/**
 * Initializes event listeners for the Leads module grid actions.
 */
export function initializeLeadsModule() {
    console.log('[leads.js] Initializing Leads module event listeners.');

    // The 'Add New Lead' button is now handled by main.js's handleStandaloneButtons.
    // The form submission is handled by main.js's setupFormSubmissions.
    // This module only needs to listen for clicks inside the grid.

    document.addEventListener('click', (event) => {
        const editBtn = event.target.closest('.edit-lead-btn');
        if (editBtn) {
            const leadId = editBtn.dataset.id;
            const leadData = masterData.leads.find(l => l.id === leadId);
            if (leadData) {
                openLeadModal(leadData); // Call the function from ui.js
            }
        }

        const convertBtn = event.target.closest('.convert-lead-btn');
        if (convertBtn) {
            const leadId = convertBtn.dataset.id;
            convertLeadToSale(leadId);
        }
    });

    // We also need to trigger the form submission from the modal's save button.
    const saveLeadBtn = document.getElementById('save-lead-btn');
    const leadForm = document.getElementById('lead-form');
    if (saveLeadBtn && leadForm) {
        saveLeadBtn.addEventListener('click', () => {
            // --- ADD THIS LINE FOR DEBUGGING ---
            console.log('✅ STEP 1: "Save Lead" button in leads.js was clicked!'); 
            // ------------------------------------
            leadForm.requestSubmit();
        });
    }
}
