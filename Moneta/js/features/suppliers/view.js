import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { getState, subscribe } from "../../app/store.js";
import { saveSupplier, toggleSupplierStatus } from "./service.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import { initializeSuppliersGrid, refreshSuppliersGrid, updateSuppliersGridSearch } from "./grid.js";

const featureState = {
    searchTerm: "",
    editingSupplierId: null
};

function getEditingSupplier(snapshot) {
    if (!featureState.editingSupplierId) return null;
    return (snapshot.masterData.suppliers || []).find(
        supplier => supplier.id === featureState.editingSupplierId
    ) || null;
}

function renderForm(snapshot) {
    const editingSupplier = getEditingSupplier(snapshot);

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.suppliers}</span>
                    <div>
                        <h2>${editingSupplier ? "Edit Supplier" : "Add Supplier"}</h2>
                        <p class="panel-copy">
                        ${editingSupplier
                            ? "Update supplier details and keep the new app state in sync."
                            : "Start migrating operational data into the new Moneta feature model."}
                        </p>
                    </div>
                </div>
                <span class="status-pill">${editingSupplier ? "Editing" : "Create"}</span>
            </div>
            <div class="panel-body">
                <form id="supplier-form">
                    <input type="hidden" id="supplier-doc-id" value="${editingSupplier?.id || ""}">
                        <div class="form-grid">
                            <div class="field">
                                <label for="supplier-name">Supplier Name <span class="required-mark" aria-hidden="true">*</span></label>
                                <input id="supplier-name" class="input" type="text" value="${editingSupplier?.supplierName || ""}" required>
                            </div>
                            <div class="field">
                                <label for="supplier-contact-number">Contact Number <span class="required-mark" aria-hidden="true">*</span></label>
                                <input id="supplier-contact-number" class="input" type="tel" value="${editingSupplier?.contactNo || ""}" required>
                            </div>
                            <div class="field">
                                <label for="supplier-contact-email">Contact Email <span class="required-mark" aria-hidden="true">*</span></label>
                                <input id="supplier-contact-email" class="input" type="email" value="${editingSupplier?.contactEmail || ""}" required>
                            </div>
                            <div class="field field-wide">
                                <label for="supplier-address">Address <span class="required-mark" aria-hidden="true">*</span></label>
                                <textarea id="supplier-address" class="textarea" required>${editingSupplier?.address || ""}</textarea>
                            </div>
                        <div class="field">
                            <label for="supplier-credit-term">Credit Term</label>
                            <input id="supplier-credit-term" class="input" type="text" value="${editingSupplier?.creditTerm || ""}" placeholder="Net 30">
                        </div>
                    </div>
                    <div class="form-actions">
                        ${editingSupplier ? `
                            <button id="supplier-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary" type="submit">
                            <span class="button-icon">${editingSupplier ? icons.edit : icons.plus}</span>
                            ${editingSupplier ? "Update Supplier" : "Save Supplier"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderGridCard(snapshot) {
    const totalSuppliers = snapshot.masterData.suppliers?.length || 0;
    const activeSuppliers = snapshot.masterData.suppliers?.filter(supplier => supplier.isActive).length || 0;

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.catalogue}</span>
                    <div>
                        <h3>Supplier Directory</h3>
                        <p class="panel-copy">Supplier Management now uses AG Grid for faster search, scanning, and action handling.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${totalSuppliers} total</span>
                    <span class="status-pill">${activeSuppliers} active</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Suppliers</p>
                        <p class="panel-copy">Search, edit, and manage both active and inactive supplier records.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="supplier-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search by name, id, phone, email, or address"
                            value="${featureState.searchTerm}">
                    </div>
                </div>
                <div class="ag-shell">
                    <div id="suppliers-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function syncSuppliersGrid(snapshot) {
    const rows = (snapshot.masterData.suppliers || [])
        .slice()
        .sort((left, right) => (left.supplierName || "").localeCompare(right.supplierName || ""));

    initializeSuppliersGrid(document.getElementById("suppliers-grid"));
    refreshSuppliersGrid(rows);
    updateSuppliersGridSearch(featureState.searchTerm);
}

export function renderSuppliersView() {
    const root = document.getElementById("suppliers-root");
    if (!root) return;

    const snapshot = getState();
    root.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            ${renderForm(snapshot)}
            ${renderGridCard(snapshot)}
        </div>
    `;

    syncSuppliersGrid(snapshot);
}

async function handleSupplierFormSubmit(event) {
    event.preventDefault();

    const snapshot = getState();
    const user = snapshot.currentUser;

    try {
        const docId = document.getElementById("supplier-doc-id")?.value;
        const supplierName = document.getElementById("supplier-name")?.value || "-";
        const creditTerm = document.getElementById("supplier-credit-term")?.value || "-";
        const result = await runProgressToastFlow({
            title: docId ? "Updating Supplier" : "Adding Supplier",
            initialMessage: "Reading supplier form data...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Supplier Updated" : "Supplier Added",
            successMessage: docId ? "The supplier was updated successfully." : "The supplier was added successfully."
        }, async ({ update }) => {
            update("Validating supplier identity and contact details...", 36, "Step 2 of 5");

            update("Writing supplier changes to the database...", 72, "Step 3 of 5");

            const result = await saveSupplier({
                docId,
                supplierName: document.getElementById("supplier-name")?.value,
                contactNo: document.getElementById("supplier-contact-number")?.value,
                contactEmail: document.getElementById("supplier-contact-email")?.value,
                address: document.getElementById("supplier-address")?.value,
                creditTerm: document.getElementById("supplier-credit-term")?.value
            }, user);

            update("Refreshing supplier records...", 88, "Step 4 of 5");
            featureState.editingSupplierId = null;
            renderSuppliersView();
            update("Supplier directory is up to date.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Supplier created." : "Supplier updated.", "success", {
            title: "Supplier Management"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Supplier Added" : "Supplier Updated",
            message: "The supplier record has been saved successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Supplier", value: supplierName },
                { label: "Credit Term", value: creditTerm }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Supplier save failed:", error);
    }
}

function handleSearchInput(target) {
    featureState.searchTerm = target.value || "";
    updateSuppliersGridSearch(featureState.searchTerm);
}

function handleEditSupplier(target) {
    featureState.editingSupplierId = target.dataset.supplierId || null;
    renderSuppliersView();
    focusFormField({
        formId: "supplier-form",
        inputSelector: "#supplier-name"
    });
}

async function handleStatusToggle(target) {
    const supplierId = target.dataset.supplierId;
    const nextStatus = target.dataset.nextStatus === "active";
    const supplier = getState().masterData.suppliers.find(item => item.id === supplierId);

    if (!supplier) {
        showToast("Supplier record could not be found.", "error");
        return;
    }

    const confirmed = await showConfirmationModal({
        title: `${nextStatus ? "Activate" : "Deactivate"} Supplier`,
        message: `${nextStatus ? "Activate" : "Deactivate"} ${supplier.supplierName}?`,
        details: [
            { label: "Supplier", value: supplier.supplierName || "-" },
            { label: "Requested Action", value: nextStatus ? "Activate" : "Deactivate" }
        ],
        note: nextStatus
            ? "Please confirm this supplier status change before Moneta updates availability."
            : "This will remove the supplier from active purchase entry until it is activated again.",
        confirmText: nextStatus ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        tone: nextStatus ? "warning" : "danger"
    });

    if (!confirmed) return;

    try {
        await toggleSupplierStatus(supplierId, nextStatus, getState().currentUser);
        showToast(`Supplier ${nextStatus ? "activated" : "deactivated"}.`, "success");
        await showSummaryModal({
            title: `Supplier ${nextStatus ? "Activated" : "Deactivated"}`,
            message: "The supplier status was updated successfully.",
            details: [
                { label: "Supplier", value: supplier.supplierName || "-" },
                { label: "New Status", value: nextStatus ? "Active" : "Inactive" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Supplier status update failed:", error);
        showToast(error.message || "Could not update supplier status.", "error");
    }
}

function handleCancelEdit() {
    featureState.editingSupplierId = null;
    renderSuppliersView();
}

function bindSuppliersDomEvents() {
    const root = document.getElementById("suppliers-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("submit", event => {
        if (event.target.id === "supplier-form") {
            handleSupplierFormSubmit(event);
        }
    });

    root.addEventListener("input", event => {
        const target = event.target;
        if (target.id === "supplier-search") {
            handleSearchInput(target);
        }
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const editButton = target.closest(".supplier-edit-button");
        const statusButton = target.closest(".supplier-status-button");
        const cancelButton = target.closest("#supplier-cancel-button");

        if (editButton) {
            handleEditSupplier(editButton);
            return;
        }

        if (statusButton) {
            handleStatusToggle(statusButton);
            return;
        }

        if (cancelButton) {
            handleCancelEdit();
        }
    });

    root.dataset.bound = "true";
}

export function initializeSuppliersFeature() {
    bindSuppliersDomEvents();

    subscribe(snapshot => {
        if (snapshot.currentRoute === "#/suppliers") {
            renderSuppliersView();
        }
    });
}
