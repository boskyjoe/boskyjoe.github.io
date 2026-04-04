import { showModal } from "../../shared/modal.js";
import { showToast } from "../../shared/toast.js";
import { getState, subscribe } from "../../app/store.js";
import { saveSupplier, toggleSupplierStatus } from "./service.js";

const featureState = {
    searchTerm: "",
    editingSupplierId: null
};

function getVisibleSuppliers(snapshot) {
    const searchTerm = featureState.searchTerm.toLowerCase();
    const suppliers = snapshot.masterData.suppliers || [];

    return suppliers
        .filter(supplier => {
            if (!searchTerm) return true;
            const haystack = [
                supplier.supplierId,
                supplier.supplierName,
                supplier.contactNo,
                supplier.contactEmail,
                supplier.address
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return haystack.includes(searchTerm);
        })
        .sort((left, right) => (left.supplierName || "").localeCompare(right.supplierName || ""));
}

function renderSupplierRows(suppliers) {
    if (suppliers.length === 0) {
        return `
            <tr>
                <td colspan="6">
                    <div class="empty-state">No suppliers match the current search.</div>
                </td>
            </tr>
        `;
    }

    return suppliers.map(supplier => `
        <tr>
            <td>
                <strong>${supplier.supplierName || "Untitled Supplier"}</strong><br>
                <span class="panel-copy">${supplier.supplierId || "Pending ID"}</span>
            </td>
            <td>${supplier.contactNo || "-"}</td>
            <td>${supplier.contactEmail || "-"}</td>
            <td>${supplier.creditTerm || "-"}</td>
            <td>
                <span class="${supplier.isActive ? "status-active" : "status-inactive"}">
                    ${supplier.isActive ? "Active" : "Inactive"}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button class="button button-secondary supplier-edit-button" type="button" data-supplier-id="${supplier.id}">
                        Edit
                    </button>
                    <button
                        class="button ${supplier.isActive ? "button-danger-soft" : "button-primary"} supplier-status-button"
                        type="button"
                        data-supplier-id="${supplier.id}"
                        data-next-status="${supplier.isActive ? "inactive" : "active"}">
                        ${supplier.isActive ? "Deactivate" : "Activate"}
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

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
                <div>
                    <h2>${editingSupplier ? "Edit Supplier" : "Add Supplier"}</h2>
                    <p class="panel-copy">
                        ${editingSupplier
                            ? "Update supplier details and keep the new app state in sync."
                            : "Start migrating operational data into the new Moneta feature model."}
                    </p>
                </div>
                <span class="status-pill">${editingSupplier ? "Editing" : "Create"}</span>
            </div>
            <div class="panel-body">
                <form id="supplier-form">
                    <input type="hidden" id="supplier-doc-id" value="${editingSupplier?.id || ""}">
                    <div class="form-grid">
                        <div class="field">
                            <label for="supplier-name">Supplier Name</label>
                            <input id="supplier-name" class="input" type="text" value="${editingSupplier?.supplierName || ""}" required>
                        </div>
                        <div class="field">
                            <label for="supplier-contact-number">Contact Number</label>
                            <input id="supplier-contact-number" class="input" type="tel" value="${editingSupplier?.contactNo || ""}" required>
                        </div>
                        <div class="field">
                            <label for="supplier-contact-email">Contact Email</label>
                            <input id="supplier-contact-email" class="input" type="email" value="${editingSupplier?.contactEmail || ""}" required>
                        </div>
                        <div class="field field-wide">
                            <label for="supplier-address">Address</label>
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
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary" type="submit">
                            ${editingSupplier ? "Update Supplier" : "Save Supplier"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderTable(snapshot) {
    const suppliers = getVisibleSuppliers(snapshot);
    const totalSuppliers = snapshot.masterData.suppliers?.length || 0;

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div>
                    <h3>Supplier Directory</h3>
                    <p class="panel-copy">Live Firestore-backed supplier records from the new Moneta store.</p>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${suppliers.length} visible</span>
                    <span class="status-pill">${totalSuppliers} total</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Suppliers</p>
                        <p class="panel-copy">Search, edit, and manage active supplier records.</p>
                    </div>
                    <input
                        id="supplier-search"
                        class="input toolbar-search"
                        type="search"
                        placeholder="Search by name, id, phone, email, or address"
                        value="${featureState.searchTerm}">
                </div>
                <div class="table-wrap">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Supplier</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Credit Term</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${renderSupplierRows(suppliers)}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

export function renderSuppliersView() {
    const root = document.getElementById("suppliers-root");
    if (!root) return;

    const snapshot = getState();
    root.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            ${renderForm(snapshot)}
            ${renderTable(snapshot)}
        </div>
    `;
}

async function handleSupplierFormSubmit(event) {
    event.preventDefault();

    const snapshot = getState();
    const user = snapshot.currentUser;

    try {
        const result = await saveSupplier({
            docId: document.getElementById("supplier-doc-id")?.value,
            supplierName: document.getElementById("supplier-name")?.value,
            contactNo: document.getElementById("supplier-contact-number")?.value,
            contactEmail: document.getElementById("supplier-contact-email")?.value,
            address: document.getElementById("supplier-address")?.value,
            creditTerm: document.getElementById("supplier-credit-term")?.value
        }, user);

        featureState.editingSupplierId = null;
        renderSuppliersView();
        showToast(result.mode === "create" ? "Supplier created." : "Supplier updated.", "success");
    } catch (error) {
        console.error("[Moneta] Supplier save failed:", error);
        showToast(error.message || "Could not save supplier.", "error");
    }
}

function handleSearchInput(target) {
    featureState.searchTerm = target.value || "";
    renderSuppliersView();

    const searchInput = document.getElementById("supplier-search");
    if (searchInput) {
        const cursorIndex = featureState.searchTerm.length;
        searchInput.focus();
        searchInput.setSelectionRange(cursorIndex, cursorIndex);
    }
}

function handleEditSupplier(target) {
    featureState.editingSupplierId = target.dataset.supplierId || null;
    renderSuppliersView();
}

async function handleStatusToggle(target) {
    const supplierId = target.dataset.supplierId;
    const nextStatus = target.dataset.nextStatus === "active";
    const supplier = getState().masterData.suppliers.find(item => item.id === supplierId);

    if (!supplier) {
        showToast("Supplier record could not be found.", "error");
        return;
    }

    const confirmed = await showModal({
        title: `${nextStatus ? "Activate" : "Deactivate"} Supplier`,
        message: `${nextStatus ? "Activate" : "Deactivate"} ${supplier.supplierName}?`,
        confirmText: nextStatus ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        showCancel: true
    });

    if (!confirmed) return;

    try {
        await toggleSupplierStatus(supplierId, nextStatus, getState().currentUser);
        showToast(`Supplier ${nextStatus ? "activated" : "deactivated"}.`, "success");
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
