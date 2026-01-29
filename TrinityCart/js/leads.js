// js/leads.js

import { masterData } from './masterData.js';
import { showView } from './ui.js';
import { showModal } from './modal.js';

// --- DOM Element References ---
const leadModal = document.getElementById('lead-modal');
const leadModalTitle = document.getElementById('lead-modal-title');
const leadForm = document.getElementById('lead-form');
const leadIdInput = document.getElementById('lead-id-input');
const saveLeadBtn = document.getElementById('save-lead-btn');

/**
 * Opens the lead modal for adding or editing.
 * @param {object | null} leadData - The data of the lead to edit.
 */
function openLeadModal(leadData = null) {
    leadForm.reset();
    
    if (leadData) {
        // --- EDIT MODE ---
        leadModalTitle.textContent = 'Edit Lead';
        leadIdInput.value = leadData.id;
        document.getElementById('customerName').value = leadData.customerName || '';
        document.getElementById('customerPhone').value = leadData.customerPhone || '';
        document.getElementById('customerEmail').value = leadData.customerEmail || '';
        document.getElementById('enquiryDate').valueAsDate = leadData.enquiryDate ? new Date(leadData.enquiryDate.seconds * 1000) : new Date();
        document.getElementById('leadSource').value = leadData.source || '';
        document.getElementById('leadStatus').value = leadData.status || 'New';
        document.getElementById('leadNotes').value = leadData.notes || '';
    } else {
        // --- ADD NEW MODE ---
        leadModalTitle.textContent = 'Add New Lead';
        leadIdInput.value = '';
        document.getElementById('enquiryDate').valueAsDate = new Date();
        document.getElementById('leadStatus').value = 'New';
    }
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

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
 * Initializes all event listeners for the Leads module.
 */
export function initializeLeadsModule() {
    console.log('[leads.js] Initializing Leads module event listeners.');

    document.getElementById('create-new-lead-btn').addEventListener('click', () => openLeadModal());

    // The save button now just submits the form, which main.js will handle.
    saveLeadBtn.addEventListener('click', () => leadForm.requestSubmit());

    document.addEventListener('click', (event) => {
        const editBtn = event.target.closest('.edit-lead-btn');
        if (editBtn) {
            const leadId = editBtn.dataset.id;
            const leadData = masterData.leads.find(l => l.id === leadId);
            if (leadData) openLeadModal(leadData);
        }

        const convertBtn = event.target.closest('.convert-lead-btn');
        if (convertBtn) {
            const leadId = convertBtn.dataset.id;
            convertLeadToSale(leadId);
        }
    });
}
