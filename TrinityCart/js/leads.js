// js/leads.js

import { db, firebase } from './firebase-init.js';
import { LEADS_COLLECTION_PATH, masterData } from './config.js';
import { showView } from './ui.js';
import { showModal } from './modal.js';

// --- DOM Element References ---
const leadModal = document.getElementById('lead-modal');
const leadModalTitle = document.getElementById('lead-modal-title');
const leadForm = document.getElementById('lead-form');
const leadIdInput = document.getElementById('lead-id-input');
const saveLeadBtn = document.getElementById('save-lead-btn');
const cancelLeadBtn = document.getElementById('cancel-lead-btn');

/**
 * Opens the lead modal.
 * If leadData is provided, it populates the form for editing.
 * Otherwise, it clears the form for a new entry.
 * @param {object | null} leadData - The data of the lead to edit.
 */
function openLeadModal(leadData = null) {
    leadForm.reset(); // Clear previous entries
    
    if (leadData) {
        // --- EDIT MODE ---
        leadModalTitle.textContent = 'Edit Lead';
        leadIdInput.value = leadData.id;
        
        // Populate form fields from the leadData object
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
        document.getElementById('enquiryDate').valueAsDate = new Date(); // Default to today
        document.getElementById('leadStatus').value = 'New';
    }
    
    // Show the modal
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('visible'), 10);
}

/**
 * Saves or updates a lead document in Firestore by calling the API.
 */
async function saveLead() {
    const leadId = leadIdInput.value;
    const isEditMode = !!leadId;
    const formData = new FormData(leadForm);

    const leadObject = {
        customerName: formData.get('customerName'),
        customerPhone: formData.get('customerPhone'),
        customerEmail: formData.get('customerEmail'),
        source: formData.get('leadSource'),
        status: formData.get('leadStatus'),
        notes: formData.get('leadNotes'),
        enquiryDate: new Date(formData.get('enquiryDate')),
    };

    // Dispatch a custom event for main.js to handle the API call
    const eventName = isEditMode ? 'updateLead' : 'addLead';
    document.dispatchEvent(new CustomEvent(eventName, {
        detail: {
            docId: leadId, // Will be null for new leads
            data: leadObject
        }
    }));
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
    
    // --- WORKFLOW ---
    // 1. Store lead details in sessionStorage to pass to the sales view.
    sessionStorage.setItem('leadConversionData', JSON.stringify(lead));
    
    // 2. Switch to the sales view.
    showView('sales-view');
    
    // 3. The sales view logic (in ui.js) will need to be updated to check 
    //    for this sessionStorage item and pre-populate the form.
    showModal('info', 'Lead Loaded', `Lead for "${lead.customerName}" has been loaded into the New Sale form.`);
}


/**
 * Initializes all event listeners for the Leads module.
 * This is the single entry point called from main.js.
 */
export function initializeLeadsModule() {
    console.log('[leads.js] Initializing Leads module event listeners.');

    const createNewLeadBtn = document.getElementById('create-new-lead-btn');
    
    // Open modal for a new lead
    createNewLeadBtn.addEventListener('click', () => openLeadModal());

    // Save button inside the modal
    saveLeadBtn.addEventListener('click', saveLead);

    // Use event delegation for buttons inside the dynamic AG-Grid
    document.addEventListener('click', (event) => {
        const editBtn = event.target.closest('.edit-lead-btn');
        const convertBtn = event.target.closest('.convert-lead-btn');

        if (editBtn) {
            const leadId = editBtn.dataset.id;
            const leadData = masterData.leads.find(l => l.id === leadId);
            if (leadData) {
                openLeadModal(leadData);
            }
        }

        if (convertBtn) {
            const leadId = convertBtn.dataset.id;
            convertLeadToSale(leadId);
        }
    });
}
