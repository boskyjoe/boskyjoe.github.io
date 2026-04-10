import { getState, subscribe } from "../../app/store.js";
import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import {
    initializeLeadWorkLogGrid,
    getLeadRequestedProductsGridRows,
    initializeLeadRequestedProductsGrid,
    initializeLeadsGrid,
    refreshLeadRequestedProductsGrid,
    refreshLeadWorkLogGrid,
    refreshLeadsGrid,
    updateLeadRequestedProductsGridSearch,
    updateLeadWorkLogGridSearch,
    updateLeadsGridSearch
} from "./grid.js";
import { fetchSalesCatalogueItems, subscribeToLeadWorkLog, subscribeToLeads } from "./repository.js";
import { deleteLead, LEAD_LOG_TYPES, LEAD_SOURCES, LEAD_STATUSES, saveLead, saveLeadWorkLog } from "./service.js";

const featureState = {
    leads: [],
    editingLeadId: null,
    searchTerm: "",
    itemSearchTerm: "",
    selectedCatalogueId: "",
    catalogueItemRows: [],
    unsubscribeLeads: null,
    activeWorkLogLeadId: null,
    unsubscribeWorkLog: null,
    workLogListenerLeadId: null,
    workLogEntries: [],
    workLogSearchTerm: ""
};

function normalizeText(value) {
    return (value || "").trim();
}

function formatDateInputValue(value) {
    if (!value) return "";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getEditingLead() {
    if (!featureState.editingLeadId) return null;
    return featureState.leads.find(lead => lead.id === featureState.editingLeadId) || null;
}

function getActiveWorkLogLead() {
    if (!featureState.activeWorkLogLeadId) return null;
    return featureState.leads.find(lead => lead.id === featureState.activeWorkLogLeadId) || null;
}

function resetLeadWorkspace() {
    featureState.editingLeadId = null;
    featureState.selectedCatalogueId = "";
    featureState.catalogueItemRows = [];
    featureState.itemSearchTerm = "";
}

function resetWorkLogWorkspace() {
    featureState.activeWorkLogLeadId = null;
    featureState.workLogEntries = [];
    featureState.workLogSearchTerm = "";
}

function sortLeads(rows = []) {
    return (rows || []).slice().sort((left, right) => {
        const leftDate = left.enquiryDate?.toDate ? left.enquiryDate.toDate() : new Date(left.enquiryDate || 0);
        const rightDate = right.enquiryDate?.toDate ? right.enquiryDate.toDate() : new Date(right.enquiryDate || 0);
        return rightDate - leftDate;
    });
}

function resolveSeasonName(seasonId, snapshot) {
    return (snapshot.masterData.seasons || []).find(season => season.id === seasonId)?.seasonName || "-";
}

function resolveCatalogueOptions(snapshot, currentValue) {
    return (snapshot.masterData.salesCatalogues || [])
        .filter(catalogue => catalogue.isActive || catalogue.id === currentValue)
        .map(catalogue => `
            <option value="${catalogue.id}" ${catalogue.id === currentValue ? "selected" : ""}>
                ${catalogue.catalogueName} (${catalogue.seasonName || resolveSeasonName(catalogue.seasonId, snapshot)})
            </option>
        `).join("");
}

function renderSourceOptions(currentValue) {
    return LEAD_SOURCES.map(source => `
        <option value="${source}" ${source === currentValue ? "selected" : ""}>
            ${source}
        </option>
    `).join("");
}

function renderStatusOptions(currentValue) {
    return LEAD_STATUSES.map(status => `
        <option value="${status}" ${status === currentValue ? "selected" : ""}>
            ${status}
        </option>
    `).join("");
}

function renderLogTypeOptions(currentValue = "General Note") {
    const selectedValue = normalizeText(currentValue) || "General Note";

    return LEAD_LOG_TYPES.map(type => `
        <option value="${type}" ${type === selectedValue ? "selected" : ""}>
            ${type}
        </option>
    `).join("");
}

function buildLeadGridRows() {
    return sortLeads(featureState.leads).map(lead => ({
        ...lead,
        requestedItemCount: (lead.requestedProducts || []).filter(item => (Number(item.requestedQty) || 0) > 0).length,
        requestedValue: Number(lead.requestedValue) || Number((lead.requestedProducts || []).reduce((sum, item) => {
            return sum + ((Number(item.requestedQty) || 0) * (Number(item.sellingPrice) || 0));
        }, 0).toFixed(2))
    }));
}

function getRequestedSummary() {
    const rows = getLeadRequestedProductsGridRows();
    const requestedProducts = rows.filter(row => (Number(row.requestedQty) || 0) > 0);
    const requestedValue = requestedProducts.reduce((sum, row) => {
        return sum + ((Number(row.requestedQty) || 0) * (Number(row.sellingPrice) || 0));
    }, 0);

    return {
        requestedProductCount: requestedProducts.length,
        requestedValue: Number(requestedValue.toFixed(2))
    };
}

function updateRequestedSummary() {
    const summary = getRequestedSummary();
    const countNode = document.getElementById("lead-requested-count");
    const valueNode = document.getElementById("lead-requested-value");

    if (countNode) {
        countNode.textContent = `Total Products: ${summary.requestedProductCount}`;
    }

    if (valueNode) {
        valueNode.textContent = `Total Value: ${formatCurrency(summary.requestedValue)}`;
    }
}

function enrichLeadCatalogueItems(snapshot, items = [], savedProducts = []) {
    const products = snapshot.masterData.products || [];
    const categories = snapshot.masterData.categories || [];

    return (items || []).map(item => {
        const product = products.find(entry => entry.id === item.productId) || null;
        const resolvedCategoryId = item.categoryId || product?.categoryId || "";
        const resolvedCategoryName = item.categoryName
            || (savedProducts || []).find(saved => saved.productId === item.productId)?.categoryName
            || categories.find(category => category.id === resolvedCategoryId)?.categoryName
            || "-";

        return {
            productId: item.productId,
            productName: item.productName || product?.itemName || "Untitled Product",
            categoryName: resolvedCategoryName,
            sellingPrice: Number(item.sellingPrice) || 0,
            requestedQty: Number((savedProducts || []).find(saved => saved.productId === item.productId)?.requestedQty) || 0
        };
    });
}

async function loadCatalogueItemsIntoWorkspace(catalogueId, savedProducts = []) {
    featureState.selectedCatalogueId = catalogueId || "";

    if (!catalogueId) {
        featureState.catalogueItemRows = [];
        refreshLeadRequestedProductsGrid([]);
        updateRequestedSummary();
        return;
    }

    try {
        const catalogueItems = await fetchSalesCatalogueItems(catalogueId);
        featureState.catalogueItemRows = enrichLeadCatalogueItems(getState(), catalogueItems, savedProducts);

        refreshLeadRequestedProductsGrid(featureState.catalogueItemRows);
        updateLeadRequestedProductsGridSearch(featureState.itemSearchTerm);
        updateRequestedSummary();
    } catch (error) {
        console.error("[Moneta] Failed to load lead catalogue items:", error);
        showToast("Could not load catalogue items for this enquiry.", "error", {
            title: "Leads & Enquiries"
        });
    }
}

function renderLeadForm(snapshot) {
    const editingLead = getEditingLead();
    const currentCatalogueId = featureState.selectedCatalogueId || editingLead?.catalogueId || "";
    const totalLeads = featureState.leads.length;
    const qualifiedCount = featureState.leads.filter(lead => lead.leadStatus === "Qualified").length;
    const convertedCount = featureState.leads.filter(lead => lead.leadStatus === "Converted").length;
    const requestedSummary = editingLead
        ? {
            requestedProductCount: (editingLead.requestedProducts || []).filter(item => (Number(item.requestedQty) || 0) > 0).length,
            requestedValue: Number(editingLead.requestedValue) || Number((editingLead.requestedProducts || []).reduce((sum, item) => {
                return sum + ((Number(item.requestedQty) || 0) * (Number(item.sellingPrice) || 0));
            }, 0).toFixed(2))
        }
        : { requestedProductCount: 0, requestedValue: 0 };

    return `
        <div class="panel-card">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.leads}</span>
                    <div>
                        <h2>${editingLead ? "Edit Enquiry" : "Leads & Enquiries"}</h2>
                        <p class="panel-copy">Capture enquiries now, then convert the qualified ones into sales once the sales workflow is rebuilt.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${totalLeads} leads</span>
                    <span class="status-pill">${qualifiedCount} qualified</span>
                    <span class="status-pill">${convertedCount} converted</span>
                </div>
            </div>
            <div class="panel-body">
                <form id="lead-form">
                    <input id="lead-doc-id" type="hidden" value="${editingLead?.id || ""}">
                    <div class="lead-form-sections">
                        <section class="lead-form-section">
                            <div class="lead-form-section-head">
                                <p class="lead-form-section-kicker">Customer Info</p>
                            </div>
                            <div class="lead-form-section-grid">
                                <div class="field field-full">
                                    <label for="lead-customer-name">Full Name <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="lead-customer-name" class="input" type="text" value="${editingLead?.customerName || ""}" required>
                                </div>
                                <div class="field">
                                    <label for="lead-customer-phone">Phone</label>
                                    <input id="lead-customer-phone" class="input" type="tel" value="${editingLead?.customerPhone || ""}" placeholder="+1 555 123 4567">
                                </div>
                                <div class="field">
                                    <label for="lead-customer-email">Email</label>
                                    <input id="lead-customer-email" class="input" type="email" value="${editingLead?.customerEmail || ""}" placeholder="customer@example.com">
                                </div>
                                <div class="field field-full">
                                    <label for="lead-customer-address">Customer Address</label>
                                    <textarea id="lead-customer-address" class="textarea" placeholder="Street, city, zip, and delivery notes">${editingLead?.customerAddress || ""}</textarea>
                                </div>
                            </div>
                        </section>

                        <section class="lead-form-section">
                            <div class="lead-form-section-head">
                                <p class="lead-form-section-kicker">Lead Context</p>
                            </div>
                            <div class="lead-form-section-grid">
                                <div class="field">
                                    <label for="lead-enquiry-date">Enquiry Date <span class="required-mark" aria-hidden="true">*</span></label>
                                    <input id="lead-enquiry-date" class="input" type="date" value="${formatDateInputValue(editingLead?.enquiryDate) || formatDateInputValue(new Date())}" required>
                                </div>
                                <div class="field">
                                    <label for="lead-expected-delivery-date">Expected Delivery</label>
                                    <input id="lead-expected-delivery-date" class="input" type="date" value="${formatDateInputValue(editingLead?.expectedDeliveryDate)}">
                                </div>
                                <div class="field field-full">
                                    <label for="lead-assigned-to">Assigned To</label>
                                    <input id="lead-assigned-to" class="input" type="text" value="${editingLead?.assignedTo || ""}" placeholder="Staff name or sales desk">
                                </div>
                                <div class="field">
                                    <label for="lead-source">Source <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="lead-source" class="select" required>
                                        <option value="">Select source</option>
                                        ${renderSourceOptions(editingLead?.leadSource || "")}
                                    </select>
                                </div>
                                <div class="field">
                                    <label for="lead-status">Status <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="lead-status" class="select" required>
                                        ${renderStatusOptions(editingLead?.leadStatus || "New")}
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section class="lead-form-section">
                            <div class="lead-form-section-head">
                                <p class="lead-form-section-kicker">Requirements</p>
                            </div>
                            <div class="lead-form-section-grid">
                                <div class="field field-full">
                                    <label for="lead-catalogue">Select Sales Catalogue <span class="required-mark" aria-hidden="true">*</span></label>
                                    <select id="lead-catalogue" class="select" required>
                                        <option value="">Select a catalogue...</option>
                                        ${resolveCatalogueOptions(snapshot, currentCatalogueId)}
                                    </select>
                                </div>
                                <div class="field field-full">
                                    <label for="lead-notes">General Notes</label>
                                    <textarea id="lead-notes" class="textarea" placeholder="Special requests, pricing notes, event context, or follow-up details">${editingLead?.leadNotes || ""}</textarea>
                                </div>
                            </div>
                        </section>
                    </div>
                </form>
                <div class="lead-product-list-shell">
                    <div class="lead-product-list-header">
                        <div>
                            <p class="lead-form-section-kicker lead-product-list-kicker">Product Inquiry List</p>
                            <p class="panel-copy">Only items with quantity greater than zero will be saved with this enquiry.</p>
                        </div>
                        <div class="lead-product-list-meta">
                            <span id="lead-requested-count" class="status-pill">Total Products: ${requestedSummary.requestedProductCount}</span>
                            <span id="lead-requested-value" class="status-pill">Total Value: ${formatCurrency(requestedSummary.requestedValue)}</span>
                        </div>
                    </div>
                    <div class="toolbar">
                        <div>
                            <p class="section-kicker" style="margin-bottom: 0.25rem;">Requested Products</p>
                            <p class="panel-copy">Search within the selected catalogue and capture the requested quantities directly in the worksheet.</p>
                        </div>
                        <div class="search-wrap">
                            <span class="search-icon">${icons.search}</span>
                            <input
                                id="lead-products-search"
                                class="input toolbar-search"
                                type="search"
                                placeholder="Search product or category"
                                value="${featureState.itemSearchTerm}">
                        </div>
                    </div>
                    <div class="ag-shell">
                        <div id="lead-products-grid" class="ag-theme-alpine moneta-grid" style="height: 520px; width: 100%;"></div>
                    </div>
                    <div class="form-actions">
                        ${editingLead ? `
                            <button class="button button-secondary lead-worklog-button" type="button" data-lead-id="${editingLead.id}">
                                <span class="button-icon">${icons.leads}</span>
                                Work Log
                            </button>
                            <button id="lead-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary-alt" type="submit" form="lead-form">
                            <span class="button-icon">${editingLead ? icons.edit : icons.plus}</span>
                            ${editingLead ? "Update Enquiry" : "Save Enquiry"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderLeadsHistoryPanel() {
    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.leads}</span>
                    <div>
                        <h3>Enquiry History</h3>
                        <p class="panel-copy">Review all enquiries, reopen them for editing, and delete only the records that are still safe to remove.</p>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">History</p>
                        <p class="panel-copy">Search by customer, source, status, assignee, or lead id.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="leads-grid-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search enquiry history"
                            value="${featureState.searchTerm}">
                    </div>
                </div>
                <div class="ag-shell">
                    <div id="leads-grid" class="ag-theme-alpine moneta-grid" style="height: 600px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function renderLeadWorkLogModal() {
    const activeLead = getActiveWorkLogLead();
    const entryCount = featureState.workLogEntries.length;

    return `
        <div id="lead-worklog-modal" class="purchase-payment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="lead-worklog-title" ${activeLead ? "" : "hidden"}>
            <div class="purchase-payment-modal-card lead-worklog-modal-card" style="max-width: 1080px;">
                <div class="panel-header panel-header-accent purchase-payment-modal-header">
                    <div class="purchase-payment-modal-title-row">
                        <div>
                            <h3 id="lead-worklog-title">Lead Work Log</h3>
                            <p class="panel-copy">Track every follow-up, call, quote, and action taken for this enquiry.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta purchase-payment-modal-meta">
                        <span class="status-pill">Lead: ${activeLead?.customerName || "-"}</span>
                        <span class="status-pill">${entryCount} entries</span>
                    </div>
                </div>
                <div class="panel-body purchase-payment-modal-body">
                    <div class="lead-worklog-shell">
                        <div class="panel-card lead-worklog-entry-card">
                            <div class="panel-header">
                                <div class="panel-title-wrap">
                                    <span class="panel-icon panel-icon-alt">${icons.plus}</span>
                                    <div>
                                        <h4>Add Work Log Entry</h4>
                                        <p class="panel-copy">Capture customer interaction notes in chronological order.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-body">
                                <form id="lead-worklog-entry-form">
                                    <input id="lead-worklog-lead-id" type="hidden" value="${activeLead?.id || ""}">
                                    <div class="lead-worklog-entry-grid">
                                        <div class="field">
                                            <label for="lead-worklog-type">Log Type <span class="required-mark" aria-hidden="true">*</span></label>
                                            <select id="lead-worklog-type" class="select" required>
                                                ${renderLogTypeOptions()}
                                            </select>
                                        </div>
                                        <div class="field field-full">
                                            <label for="lead-worklog-notes">Notes <span class="required-mark" aria-hidden="true">*</span></label>
                                            <textarea id="lead-worklog-notes" class="textarea" rows="3" placeholder="Document the interaction, follow-up outcome, or next action..." required></textarea>
                                        </div>
                                    </div>
                                    <div class="form-actions">
                                        <button id="lead-worklog-save-button" class="button button-primary-alt" type="submit">
                                            <span class="button-icon">${icons.plus}</span>
                                            Save Log Entry
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div class="panel-card lead-worklog-history-card">
                            <div class="panel-header">
                                <div class="panel-title-wrap">
                                    <span class="panel-icon">${icons.leads}</span>
                                    <div>
                                        <h4>History</h4>
                                        <p class="panel-copy">Search and review all logged activities for this enquiry.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-body">
                                <div class="toolbar">
                                    <div>
                                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Activity Timeline</p>
                                        <p class="panel-copy">Newest entries appear at the top.</p>
                                    </div>
                                    <div class="search-wrap">
                                        <span class="search-icon">${icons.search}</span>
                                        <input
                                            id="lead-worklog-search"
                                            class="input toolbar-search"
                                            type="search"
                                            placeholder="Search by type, notes, or user"
                                            value="${featureState.workLogSearchTerm}">
                                    </div>
                                </div>
                                <div class="ag-shell">
                                    <div id="lead-worklog-grid" class="ag-theme-alpine moneta-grid" style="height: 380px; width: 100%;"></div>
                                </div>
                                <div class="form-actions">
                                    <button id="lead-worklog-close-button" class="button button-secondary" type="button">
                                        <span class="button-icon">${icons.inactive}</span>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderLeadsViewShell(snapshot) {
    const root = document.getElementById("leads-root");
    if (!root) return;

    root.innerHTML = `
        <div style="display:grid; gap:1rem;">
            ${renderLeadForm(snapshot)}
            ${renderLeadsHistoryPanel()}
        </div>
        ${renderLeadWorkLogModal()}
    `;
}

function syncLeadProductsGrid() {
    initializeLeadRequestedProductsGrid(document.getElementById("lead-products-grid"), () => {
        updateRequestedSummary();
    });
    refreshLeadRequestedProductsGrid(featureState.catalogueItemRows);
    updateLeadRequestedProductsGridSearch(featureState.itemSearchTerm);
    updateRequestedSummary();
}

function syncLeadsGrid() {
    initializeLeadsGrid(document.getElementById("leads-grid"));
    refreshLeadsGrid(buildLeadGridRows());
    updateLeadsGridSearch(featureState.searchTerm);
}

function syncLeadWorkLogGrid() {
    if (!featureState.activeWorkLogLeadId) return;

    initializeLeadWorkLogGrid(document.getElementById("lead-worklog-grid"));
    refreshLeadWorkLogGrid(featureState.workLogEntries);
    updateLeadWorkLogGridSearch(featureState.workLogSearchTerm);
}

function detachWorkLogListener(options = {}) {
    const { reset = false } = options;

    featureState.unsubscribeWorkLog?.();
    featureState.unsubscribeWorkLog = null;
    featureState.workLogListenerLeadId = null;

    if (reset) {
        featureState.workLogEntries = [];
    }
}

function detachLeadsListener(options = {}) {
    const { clearRows = false } = options;

    featureState.unsubscribeLeads?.();
    featureState.unsubscribeLeads = null;

    if (clearRows) {
        featureState.leads = [];
        resetLeadWorkspace();
        detachWorkLogListener({ reset: true });
        resetWorkLogWorkspace();
    }
}

function ensureWorkLogListener(snapshot) {
    const shouldListen = snapshot.currentRoute === "#/leads"
        && Boolean(snapshot.currentUser)
        && Boolean(featureState.activeWorkLogLeadId);

    if (!shouldListen) {
        if (snapshot.currentRoute !== "#/leads" || !snapshot.currentUser) {
            const modal = document.getElementById("lead-worklog-modal");
            if (modal) {
                modal.hidden = true;
            }
            resetWorkLogWorkspace();
        }
        detachWorkLogListener({ reset: true });
        return;
    }

    if (
        featureState.unsubscribeWorkLog
        && featureState.workLogListenerLeadId === featureState.activeWorkLogLeadId
    ) {
        return;
    }

    detachWorkLogListener({ reset: true });
    featureState.workLogListenerLeadId = featureState.activeWorkLogLeadId;
    featureState.unsubscribeWorkLog = subscribeToLeadWorkLog(
        featureState.activeWorkLogLeadId,
        rows => {
            featureState.workLogEntries = rows || [];

            if (getState().currentRoute === "#/leads" && featureState.activeWorkLogLeadId) {
                syncLeadWorkLogGrid();
                const modal = document.getElementById("lead-worklog-modal");
                const entryCountPill = modal?.querySelector(".purchase-payment-modal-meta .status-pill:last-child");
                if (entryCountPill) {
                    entryCountPill.textContent = `${featureState.workLogEntries.length} entries`;
                }
            }
        },
        error => {
            console.error("[Moneta] Failed to load lead work log:", error);
            showToast("Could not load lead work log entries.", "error", {
                title: "Leads & Enquiries"
            });
        }
    );
}

function ensureLeadsListener(snapshot) {
    const shouldListen = snapshot.currentRoute === "#/leads" && Boolean(snapshot.currentUser);

    if (!shouldListen) {
        detachLeadsListener();
        detachWorkLogListener();
        return;
    }

    if (featureState.unsubscribeLeads) return;

    featureState.unsubscribeLeads = subscribeToLeads(
        rows => {
            featureState.leads = rows;

            if (featureState.editingLeadId && !rows.some(lead => lead.id === featureState.editingLeadId)) {
                resetLeadWorkspace();
            }

            if (featureState.activeWorkLogLeadId && !rows.some(lead => lead.id === featureState.activeWorkLogLeadId)) {
                closeLeadWorkLogModal();
            }

            if (getState().currentRoute === "#/leads") {
                renderLeadsView();
            }
        },
        error => {
            console.error("[Moneta] Failed to load leads:", error);
            showToast("Could not load the enquiries module.", "error", {
                title: "Leads & Enquiries"
            });
        }
    );
}

export function renderLeadsView() {
    const snapshot = getState();
    renderLeadsViewShell(snapshot);
    syncLeadProductsGrid();
    syncLeadsGrid();
    syncLeadWorkLogGrid();
}

function handleLeadSearchInput(target) {
    featureState.searchTerm = target.value || "";
    updateLeadsGridSearch(featureState.searchTerm);
}

function handleLeadProductsSearchInput(target) {
    featureState.itemSearchTerm = target.value || "";
    updateLeadRequestedProductsGridSearch(featureState.itemSearchTerm);
}

async function handleCatalogueChange(target) {
    const catalogueId = target.value || "";
    await loadCatalogueItemsIntoWorkspace(catalogueId, []);
}

async function handleLeadSubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("lead-doc-id")?.value || "";
        const customerName = document.getElementById("lead-customer-name")?.value || "-";
        const catalogueLabel = document.getElementById("lead-catalogue")?.selectedOptions?.[0]?.textContent || "-";
        const leadStatus = document.getElementById("lead-status")?.value || "New";

        const result = await runProgressToastFlow({
            title: docId ? "Updating Enquiry" : "Saving Enquiry",
            initialMessage: "Reading enquiry form inputs...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Enquiry Updated" : "Enquiry Saved",
            successMessage: docId ? "The enquiry was updated successfully." : "The enquiry was saved successfully."
        }, async ({ update }) => {
            update("Validating customer details, dates, and requested products...", 36, "Step 2 of 5");

            update("Writing enquiry details to the database...", 72, "Step 3 of 5");
            const result = await saveLead({
                docId,
                customerName: document.getElementById("lead-customer-name")?.value,
                customerPhone: document.getElementById("lead-customer-phone")?.value,
                customerEmail: document.getElementById("lead-customer-email")?.value,
                customerAddress: document.getElementById("lead-customer-address")?.value,
                assignedTo: document.getElementById("lead-assigned-to")?.value,
                enquiryDate: document.getElementById("lead-enquiry-date")?.value,
                expectedDeliveryDate: document.getElementById("lead-expected-delivery-date")?.value,
                leadSource: document.getElementById("lead-source")?.value,
                leadStatus: document.getElementById("lead-status")?.value,
                catalogueId: document.getElementById("lead-catalogue")?.value,
                leadNotes: document.getElementById("lead-notes")?.value,
                requestedProducts: getLeadRequestedProductsGridRows()
            }, getState().currentUser, getState().masterData.salesCatalogues, getState().masterData.seasons);

            update("Refreshing enquiry history...", 88, "Step 4 of 5");
            resetLeadWorkspace();
            renderLeadsView();
            update("Leads and enquiry history are up to date.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Enquiry created." : "Enquiry updated.", "success", {
            title: "Leads & Enquiries"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Enquiry Saved" : "Enquiry Updated",
            message: "The enquiry record has been saved successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Customer", value: customerName },
                { label: "Catalogue", value: catalogueLabel },
                { label: "Status", value: leadStatus }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Lead save failed:", error);
    }
}

async function handleLeadEdit(button) {
    const leadId = button.dataset.leadId || null;
    const lead = featureState.leads.find(entry => entry.id === leadId) || null;
    if (!lead) return;

    featureState.editingLeadId = leadId;
    featureState.selectedCatalogueId = lead.catalogueId || "";
    featureState.itemSearchTerm = "";
    renderLeadsView();
    focusFormField({
        formId: "lead-form",
        inputSelector: "#lead-customer-name"
    });
    await loadCatalogueItemsIntoWorkspace(lead.catalogueId || "", lead.requestedProducts || []);
}

async function handleLeadDelete(button) {
    const leadId = button.dataset.leadId || null;
    const lead = featureState.leads.find(entry => entry.id === leadId) || null;

    if (!lead) {
        showToast("Enquiry record could not be found.", "error", {
            title: "Leads & Enquiries"
        });
        return;
    }

    const confirmed = await showConfirmationModal({
        title: "Delete Enquiry",
        message: `Delete the enquiry for ${lead.customerName || "this customer"}?`,
        details: [
            { label: "Lead ID", value: lead.businessLeadId || "-" },
            { label: "Customer", value: lead.customerName || "-" },
            { label: "Status", value: lead.leadStatus || "New" }
        ],
        note: "This action cannot be undone. Converted enquiries or enquiries already linked to a sale are protected and will not be deleted.",
        confirmText: "Delete",
        cancelText: "Cancel",
        tone: "danger"
    });

    if (!confirmed) return;

    try {
        await runProgressToastFlow({
            title: "Deleting Enquiry",
            initialMessage: "Reading the selected enquiry record...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: "Enquiry Deleted",
            successMessage: "The enquiry record was deleted successfully."
        }, async ({ update }) => {
            update("Validating whether this enquiry can still be deleted...", 36, "Step 2 of 5");
            update("Removing the enquiry from the database...", 72, "Step 3 of 5");
            await deleteLead(lead);

            update("Refreshing enquiry history...", 88, "Step 4 of 5");
            if (featureState.editingLeadId === leadId) {
                resetLeadWorkspace();
            }
            renderLeadsView();
            update("Leads and enquiries are up to date.", 96, "Step 5 of 5");
        });

        showToast("Enquiry deleted.", "success", {
            title: "Leads & Enquiries"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Enquiry Deleted",
            message: "The enquiry record was removed successfully.",
            details: [
                { label: "Lead ID", value: lead.businessLeadId || "-" },
                { label: "Customer", value: lead.customerName || "-" },
                { label: "Status", value: lead.leadStatus || "New" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Lead delete failed:", error);
    }
}

function openLeadWorkLogModal(lead) {
    if (!lead?.id) return;

    featureState.activeWorkLogLeadId = lead.id;
    featureState.workLogSearchTerm = "";
    featureState.workLogEntries = [];

    const modal = document.getElementById("lead-worklog-modal");
    if (!modal) return;

    const leadIdInput = document.getElementById("lead-worklog-lead-id");
    const leadTypeSelect = document.getElementById("lead-worklog-type");
    const notesInput = document.getElementById("lead-worklog-notes");
    const searchInput = document.getElementById("lead-worklog-search");
    const leadPill = modal.querySelector(".purchase-payment-modal-meta .status-pill:first-child");
    const countPill = modal.querySelector(".purchase-payment-modal-meta .status-pill:last-child");

    if (leadIdInput) {
        leadIdInput.value = lead.id;
    }

    if (leadTypeSelect) {
        leadTypeSelect.value = "General Note";
    }

    if (notesInput) {
        notesInput.value = "";
    }

    if (searchInput) {
        searchInput.value = "";
    }

    if (leadPill) {
        leadPill.textContent = `Lead: ${lead.customerName || "-"}`;
    }

    if (countPill) {
        countPill.textContent = "0 entries";
    }

    modal.hidden = false;
    syncLeadWorkLogGrid();
    ensureWorkLogListener(getState());

    focusFormField({
        formId: "lead-worklog-entry-form",
        inputSelector: "#lead-worklog-notes"
    });
}

function closeLeadWorkLogModal() {
    const modal = document.getElementById("lead-worklog-modal");
    const form = document.getElementById("lead-worklog-entry-form");

    if (modal) {
        modal.hidden = true;
    }

    form?.reset();
    detachWorkLogListener({ reset: true });
    resetWorkLogWorkspace();
}

function handleLeadWorkLogSearchInput(target) {
    featureState.workLogSearchTerm = target.value || "";
    updateLeadWorkLogGridSearch(featureState.workLogSearchTerm);
}

async function handleLeadWorkLogOpen(button) {
    const leadId = button.dataset.leadId || null;
    const lead = featureState.leads.find(entry => entry.id === leadId) || null;

    if (!lead) {
        showToast("Lead record could not be found.", "error", {
            title: "Leads & Enquiries"
        });
        return;
    }

    openLeadWorkLogModal(lead);
}

async function handleLeadWorkLogSubmit(event) {
    event.preventDefault();

    const leadId = document.getElementById("lead-worklog-lead-id")?.value || "";
    const logType = document.getElementById("lead-worklog-type")?.value || "";
    const notes = document.getElementById("lead-worklog-notes")?.value || "";
    try {
        await runProgressToastFlow({
            title: "Saving Work Log Entry",
            initialMessage: "Reading lead activity inputs...",
            initialProgress: 24,
            initialStep: "Step 1 of 4",
            successTitle: "Work Log Saved",
            successMessage: "The lead work log entry was saved successfully."
        }, async ({ update }) => {
            update("Validating work log type and notes...", 48, "Step 2 of 4");
            update("Writing work log entry to the database...", 74, "Step 3 of 4");
            await saveLeadWorkLog({
                leadId,
                logType,
                notes
            }, getState().currentUser);
            update("Refreshing activity history...", 92, "Step 4 of 4");
        });

        showToast("Work log entry saved.", "success", {
            title: "Leads & Enquiries"
        });
        ProgressToast.hide(0);

        const form = document.getElementById("lead-worklog-entry-form");
        form?.reset();
        const typeSelect = document.getElementById("lead-worklog-type");
        if (typeSelect) {
            typeSelect.value = "General Note";
        }
    } catch (error) {
        console.error("[Moneta] Lead work log save failed:", error);
    }
}

function handleCancelEdit() {
    resetLeadWorkspace();
    renderLeadsView();
}

function bindLeadsDomEvents() {
    const root = document.getElementById("leads-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("input", event => {
        const leadsSearchInput = event.target.closest("#leads-grid-search");
        const productsSearchInput = event.target.closest("#lead-products-search");
        const workLogSearchInput = event.target.closest("#lead-worklog-search");

        if (leadsSearchInput) {
            handleLeadSearchInput(leadsSearchInput);
            return;
        }

        if (productsSearchInput) {
            handleLeadProductsSearchInput(productsSearchInput);
            return;
        }

        if (workLogSearchInput) {
            handleLeadWorkLogSearchInput(workLogSearchInput);
        }
    });

    root.addEventListener("change", event => {
        const catalogueSelect = event.target.closest("#lead-catalogue");
        if (catalogueSelect) {
            handleCatalogueChange(catalogueSelect);
        }
    });

    root.addEventListener("submit", event => {
        if (event.target.closest("#lead-form")) {
            handleLeadSubmit(event);
            return;
        }

        if (event.target.closest("#lead-worklog-entry-form")) {
            handleLeadWorkLogSubmit(event);
        }
    });

    root.addEventListener("click", event => {
        const editButton = event.target.closest(".lead-edit-button");
        const workLogButton = event.target.closest(".lead-worklog-button");
        const deleteButton = event.target.closest(".lead-delete-button");
        const cancelButton = event.target.closest("#lead-cancel-button");
        const closeWorkLogButton = event.target.closest("#lead-worklog-close-button");
        const workLogModalBackdrop = event.target.closest("#lead-worklog-modal");

        if (editButton) {
            handleLeadEdit(editButton);
            return;
        }

        if (workLogButton) {
            handleLeadWorkLogOpen(workLogButton);
            return;
        }

        if (deleteButton) {
            handleLeadDelete(deleteButton);
            return;
        }

        if (cancelButton) {
            handleCancelEdit();
            return;
        }

        if (closeWorkLogButton) {
            closeLeadWorkLogModal();
            return;
        }

        if (event.target.id === "lead-worklog-modal" && workLogModalBackdrop) {
            closeLeadWorkLogModal();
        }
    });

    root.dataset.bound = "true";
}

export function initializeLeadsFeature() {
    bindLeadsDomEvents();

    subscribe(snapshot => {
        ensureLeadsListener(snapshot);
        ensureWorkLogListener(snapshot);

        if (snapshot.currentRoute === "#/leads") {
            renderLeadsView();
        }
    });
}
