import { getState, subscribe } from "../../app/store.js";
import { showModal } from "../../shared/modal.js";
import { runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import {
    initializeCategoriesGrid,
    initializePaymentModesGrid,
    initializeSeasonsGrid,
    refreshCategoriesGrid,
    refreshPaymentModesGrid,
    refreshSeasonsGrid,
    updateCategoriesGridSearch,
    updatePaymentModesGridSearch,
    updateSeasonsGridSearch
} from "./grid.js";
import {
    getAdminEditRestriction,
    saveCategory,
    savePaymentMode,
    saveSeason,
    toggleCategoryStatus,
    togglePaymentModeStatus,
    toggleSeasonStatus
} from "./service.js";

const ADMIN_SECTIONS = {
    categories: {
        label: "Product Categories",
        entityLabel: "Category",
        icon: icons.products,
        description: "Control the product classification layer used by catalogue management and reporting."
    },
    seasons: {
        label: "Sales Seasons",
        entityLabel: "Season",
        icon: icons.catalogue,
        description: "Define seasonal windows that sales catalogues and campaigns can anchor to."
    },
    paymentModes: {
        label: "Payment Modes",
        entityLabel: "Payment Mode",
        icon: icons.payment,
        description: "Manage the transaction methods available across supplier and sales workflows."
    }
};

const SEASON_STATUS_OPTIONS = ["Upcoming", "Active", "Archived"];

const featureState = {
    activeSection: "categories",
    searchTerms: {
        categories: "",
        seasons: "",
        paymentModes: ""
    },
    editingIds: {
        categories: null,
        seasons: null,
        paymentModes: null
    }
};

function toDateInputValue(value) {
    if (!value) return "";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getActiveSectionConfig() {
    return ADMIN_SECTIONS[featureState.activeSection];
}

function clearEditingState(section = featureState.activeSection) {
    featureState.editingIds[section] = null;
}

function setActiveSection(section) {
    if (!ADMIN_SECTIONS[section]) return;
    featureState.activeSection = section;
}

function getEditingRecord(snapshot, section = featureState.activeSection) {
    const recordId = featureState.editingIds[section];
    if (!recordId) return null;

    if (section === "categories") {
        return (snapshot.masterData.categories || []).find(record => record.id === recordId) || null;
    }

    if (section === "seasons") {
        return (snapshot.masterData.seasons || []).find(record => record.id === recordId) || null;
    }

    return (snapshot.masterData.paymentModes || []).find(record => record.id === recordId) || null;
}

function getSectionRows(snapshot, section = featureState.activeSection) {
    if (section === "categories") {
        return (snapshot.masterData.categories || []).slice().sort((left, right) => (left.categoryName || "").localeCompare(right.categoryName || ""));
    }

    if (section === "seasons") {
        return (snapshot.masterData.seasons || []).slice().sort((left, right) => {
            const leftDate = left.startDate?.toDate ? left.startDate.toDate() : new Date(left.startDate || 0);
            const rightDate = right.startDate?.toDate ? right.startDate.toDate() : new Date(right.startDate || 0);
            return rightDate - leftDate;
        });
    }

    return (snapshot.masterData.paymentModes || []).slice().sort((left, right) => (left.paymentMode || "").localeCompare(right.paymentMode || ""));
}

function renderSectionTabs(snapshot) {
    const categories = snapshot.masterData.categories || [];
    const seasons = snapshot.masterData.seasons || [];
    const paymentModes = snapshot.masterData.paymentModes || [];

    const counts = {
        categories: categories.length,
        seasons: seasons.length,
        paymentModes: paymentModes.length
    };

    return `
        <div class="admin-module-switcher" role="tablist" aria-label="Admin modules">
            ${Object.entries(ADMIN_SECTIONS).map(([key, config]) => `
                <button
                    class="admin-module-tab${featureState.activeSection === key ? " active" : ""}"
                    type="button"
                    role="tab"
                    aria-selected="${featureState.activeSection === key ? "true" : "false"}"
                    data-admin-section="${key}">
                    <span class="button-icon">${config.icon}</span>
                    <span>${config.label}</span>
                    <span class="admin-module-tab-count">${counts[key]}</span>
                </button>
            `).join("")}
        </div>
    `;
}

function renderHeader(snapshot) {
    const config = getActiveSectionConfig();
    const rows = getSectionRows(snapshot);
    const activeCount = rows.filter(row => row.isActive).length;

    return `
        <div class="panel-card">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.settings}</span>
                    <div>
                        <h2>Admin Modules</h2>
                        <p class="panel-copy">${config.description}</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${rows.length} records</span>
                    <span class="status-pill">${activeCount} active</span>
                </div>
            </div>
            <div class="panel-body">
                ${renderSectionTabs(snapshot)}
            </div>
        </div>
    `;
}

function renderCategoryForm(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "categories");

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.products}</span>
                    <div>
                        <h3>${editingRecord ? "Edit Product Category" : "Add Product Category"}</h3>
                        <p class="panel-copy">Keep product classification clean so catalogue, search, and reporting stay consistent.</p>
                    </div>
                </div>
                <span class="status-pill">${editingRecord ? "Editing" : "Create"}</span>
            </div>
            <div class="panel-body">
                <form id="admin-category-form">
                    <input id="admin-category-doc-id" type="hidden" value="${editingRecord?.id || ""}">
                    <div class="form-grid">
                        <div class="field field-wide">
                            <label for="admin-category-name">Category Name</label>
                            <input id="admin-category-name" class="input" type="text" value="${editingRecord?.categoryName || ""}" placeholder="Breads, Cakes, Seasonal Packs" required>
                        </div>
                    </div>
                    <div class="form-actions">
                        ${editingRecord ? `
                            <button id="admin-category-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${editingRecord ? icons.edit : icons.plus}</span>
                            ${editingRecord ? "Update Category" : "Save Category"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderSeasonForm(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "seasons");

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.catalogue}</span>
                    <div>
                        <h3>${editingRecord ? "Edit Sales Season" : "Add Sales Season"}</h3>
                        <p class="panel-copy">Define the seasonal windows that sales catalogues and campaigns will live inside.</p>
                    </div>
                </div>
                <span class="status-pill">${editingRecord ? "Editing" : "Create"}</span>
            </div>
            <div class="panel-body">
                <form id="admin-season-form">
                    <input id="admin-season-doc-id" type="hidden" value="${editingRecord?.id || ""}">
                    <div class="form-grid">
                        <div class="field field-wide">
                            <label for="admin-season-name">Season Name</label>
                            <input id="admin-season-name" class="input" type="text" value="${editingRecord?.seasonName || ""}" placeholder="Easter 2026, Christmas 2026" required>
                        </div>
                        <div class="field">
                            <label for="admin-season-start-date">Start Date</label>
                            <input id="admin-season-start-date" class="input" type="date" value="${toDateInputValue(editingRecord?.startDate)}" required>
                        </div>
                        <div class="field">
                            <label for="admin-season-end-date">End Date</label>
                            <input id="admin-season-end-date" class="input" type="date" value="${toDateInputValue(editingRecord?.endDate)}" required>
                        </div>
                        <div class="field">
                            <label for="admin-season-status">Workflow Status</label>
                            <select id="admin-season-status" class="select">
                                ${SEASON_STATUS_OPTIONS.map(option => `
                                    <option value="${option}" ${option === (editingRecord?.status || "Upcoming") ? "selected" : ""}>${option}</option>
                                `).join("")}
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        ${editingRecord ? `
                            <button id="admin-season-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${editingRecord ? icons.edit : icons.plus}</span>
                            ${editingRecord ? "Update Season" : "Save Season"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderPaymentModeForm(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "paymentModes");

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.payment}</span>
                    <div>
                        <h3>${editingRecord ? "Edit Payment Mode" : "Add Payment Mode"}</h3>
                        <p class="panel-copy">Maintain the payment methods used across purchasing and the future sales layer.</p>
                    </div>
                </div>
                <span class="status-pill">${editingRecord ? "Editing" : "Create"}</span>
            </div>
            <div class="panel-body">
                <form id="admin-payment-mode-form">
                    <input id="admin-payment-mode-doc-id" type="hidden" value="${editingRecord?.id || ""}">
                    <div class="form-grid">
                        <div class="field field-wide">
                            <label for="admin-payment-mode-name">Payment Mode</label>
                            <input id="admin-payment-mode-name" class="input" type="text" value="${editingRecord?.paymentMode || ""}" placeholder="Cash, UPI, Bank Transfer" required>
                        </div>
                    </div>
                    <div class="form-actions">
                        ${editingRecord ? `
                            <button id="admin-payment-mode-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${editingRecord ? icons.edit : icons.plus}</span>
                            ${editingRecord ? "Update Payment Mode" : "Save Payment Mode"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderCurrentForm(snapshot) {
    if (featureState.activeSection === "categories") {
        return renderCategoryForm(snapshot);
    }

    if (featureState.activeSection === "seasons") {
        return renderSeasonForm(snapshot);
    }

    return renderPaymentModeForm(snapshot);
}

function getGridMeta(snapshot) {
    if (featureState.activeSection === "categories") {
        const rows = snapshot.masterData.categories || [];
        return {
            title: "Category Directory",
            copy: "Review active and inactive category records, then reopen any row for editing.",
            count: rows.length,
            countLabel: "categories"
        };
    }

    if (featureState.activeSection === "seasons") {
        const rows = snapshot.masterData.seasons || [];
        return {
            title: "Season Directory",
            copy: "Track the full sales season history, including inactive or archived seasonal windows.",
            count: rows.length,
            countLabel: "seasons"
        };
    }

    const rows = snapshot.masterData.paymentModes || [];
    return {
        title: "Payment Mode Directory",
        copy: "Keep transaction methods tidy so operational screens only offer the modes your team wants to use.",
        count: rows.length,
        countLabel: "payment modes"
    };
}

function renderCurrentGridCard(snapshot) {
    const meta = getGridMeta(snapshot);

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${getActiveSectionConfig().icon}</span>
                    <div>
                        <h3>${meta.title}</h3>
                        <p class="panel-copy">${meta.copy}</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${meta.count} ${meta.countLabel}</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Directory</p>
                        <p class="panel-copy">Search records, open one for editing, or change active status without leaving the admin workspace.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="admin-module-grid-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search ${meta.countLabel}"
                            value="${featureState.searchTerms[featureState.activeSection]}">
                    </div>
                </div>
                <div class="ag-shell">
                    <div id="admin-module-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function syncCurrentGrid(snapshot) {
    const gridElement = document.getElementById("admin-module-grid");
    const rows = getSectionRows(snapshot);

    if (featureState.activeSection === "categories") {
        initializeCategoriesGrid(gridElement);
        refreshCategoriesGrid(rows);
        updateCategoriesGridSearch(featureState.searchTerms.categories);
        return;
    }

    if (featureState.activeSection === "seasons") {
        initializeSeasonsGrid(gridElement);
        refreshSeasonsGrid(rows);
        updateSeasonsGridSearch(featureState.searchTerms.seasons);
        return;
    }

    initializePaymentModesGrid(gridElement);
    refreshPaymentModesGrid(rows);
    updatePaymentModesGridSearch(featureState.searchTerms.paymentModes);
}

export function renderAdminModulesView() {
    const root = document.getElementById("admin-modules-root");
    if (!root) return;

    const snapshot = getState();
    root.innerHTML = `
        <div class="admin-module-shell">
            ${renderHeader(snapshot)}
            ${renderCurrentForm(snapshot)}
            ${renderCurrentGridCard(snapshot)}
        </div>
    `;

    syncCurrentGrid(snapshot);
}

async function handleCategorySubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("admin-category-doc-id")?.value;
        const result = await runProgressToastFlow({
            title: docId ? "Updating Product Category" : "Adding Product Category",
            initialMessage: "Reading the current category records...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Product Category Updated" : "Product Category Added",
            successMessage: docId ? "The category was updated successfully." : "The category was added successfully."
        }, async ({ update }) => {
            update("Running validation and usage checks...", 38, "Step 2 of 5");

            update("Writing category changes to the database...", 72, "Step 3 of 5");

            const result = await saveCategory({
                docId,
                categoryName: document.getElementById("admin-category-name")?.value
            }, getState().currentUser, getState().masterData.categories);

            update("Refreshing the admin workspace...", 88, "Step 4 of 5");
            clearEditingState("categories");
            renderAdminModulesView();
            update("Category ready for use across Moneta.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Category created." : "Category updated.", "success", {
            title: "Admin Modules"
        });
    } catch (error) {
        console.error("[Moneta] Category save failed:", error);
    }
}

async function handleSeasonSubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("admin-season-doc-id")?.value;
        const result = await runProgressToastFlow({
            title: docId ? "Updating Sales Season" : "Adding Sales Season",
            initialMessage: "Reading season records and date inputs...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Sales Season Updated" : "Sales Season Added",
            successMessage: docId ? "The season was updated successfully." : "The season was created successfully."
        }, async ({ update }) => {
            update("Validating dates, workflow status, and duplicates...", 38, "Step 2 of 5");

            update("Writing season changes to the database...", 72, "Step 3 of 5");

            const result = await saveSeason({
                docId,
                seasonName: document.getElementById("admin-season-name")?.value,
                startDate: document.getElementById("admin-season-start-date")?.value,
                endDate: document.getElementById("admin-season-end-date")?.value,
                status: document.getElementById("admin-season-status")?.value
            }, getState().currentUser, getState().masterData.seasons);

            update("Refreshing the admin workspace...", 88, "Step 4 of 5");
            clearEditingState("seasons");
            renderAdminModulesView();
            update("Season timeline is now ready for catalogue planning.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Season created." : "Season updated.", "success", {
            title: "Admin Modules"
        });
    } catch (error) {
        console.error("[Moneta] Season save failed:", error);
    }
}

async function handlePaymentModeSubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("admin-payment-mode-doc-id")?.value;
        const result = await runProgressToastFlow({
            title: docId ? "Updating Payment Mode" : "Adding Payment Mode",
            initialMessage: "Reading payment mode records...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Payment Mode Updated" : "Payment Mode Added",
            successMessage: docId ? "The payment mode was updated successfully." : "The payment mode was created successfully."
        }, async ({ update }) => {
            update("Validating duplicates and usage restrictions...", 40, "Step 2 of 5");

            update("Writing payment mode changes to the database...", 72, "Step 3 of 5");

            const result = await savePaymentMode({
                docId,
                paymentMode: document.getElementById("admin-payment-mode-name")?.value
            }, getState().currentUser, getState().masterData.paymentModes);

            update("Refreshing the payment mode directory...", 88, "Step 4 of 5");
            clearEditingState("paymentModes");
            renderAdminModulesView();
            update("Payment mode is available for downstream workflows.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Payment mode created." : "Payment mode updated.", "success", {
            title: "Admin Modules"
        });
    } catch (error) {
        console.error("[Moneta] Payment mode save failed:", error);
    }
}

function handleSearchInput(target) {
    if (target.id !== "admin-module-grid-search") return;

    featureState.searchTerms[featureState.activeSection] = target.value || "";

    if (featureState.activeSection === "categories") {
        updateCategoriesGridSearch(featureState.searchTerms.categories);
        return;
    }

    if (featureState.activeSection === "seasons") {
        updateSeasonsGridSearch(featureState.searchTerms.seasons);
        return;
    }

    updatePaymentModesGridSearch(featureState.searchTerms.paymentModes);
}

async function handleEditRecord(button) {
    const entity = button.dataset.entity;
    const recordId = button.dataset.recordId || null;
    const snapshot = getState();
    const rows = getSectionRows(snapshot, entity);
    const record = rows.find(row => row.id === recordId) || null;

    if (!recordId || !ADMIN_SECTIONS[entity] || !record) return;

    button.disabled = true;

    try {
        const restriction = await getAdminEditRestriction(entity, record);

        if (restriction.isLocked) {
            showToast(restriction.message || "This record can only be activated or deactivated.", "error");
            return;
        }

        setActiveSection(entity);
        featureState.editingIds[entity] = recordId;
        renderAdminModulesView();
    } catch (error) {
        console.error("[Moneta] Admin edit check failed:", error);
        showToast(error.message || "Could not open this record for editing.", "error");
    } finally {
        button.disabled = false;
    }
}

async function handleStatusToggle(button) {
    const entity = button.dataset.entity;
    const recordId = button.dataset.recordId;
    const nextValue = button.dataset.nextStatus === "true";
    const snapshot = getState();
    const rows = getSectionRows(snapshot, entity);
    const record = rows.find(row => row.id === recordId);

    if (!record || !recordId) {
        showToast("Admin record could not be found.", "error");
        return;
    }

    const confirmed = await showModal({
        title: `${nextValue ? "Activate" : "Deactivate"} ${ADMIN_SECTIONS[entity].entityLabel}`,
        message: `${nextValue ? "Activate" : "Deactivate"} ${record.categoryName || record.seasonName || record.paymentMode}?`,
        confirmText: nextValue ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        showCancel: true
    });

    if (!confirmed) return;

    try {
        if (entity === "categories") {
            await toggleCategoryStatus(recordId, nextValue, snapshot.currentUser);
        } else if (entity === "seasons") {
            await toggleSeasonStatus(recordId, nextValue, snapshot.currentUser);
        } else {
            await togglePaymentModeStatus(recordId, nextValue, snapshot.currentUser);
        }

        showToast(`${ADMIN_SECTIONS[entity].entityLabel} ${nextValue ? "activated" : "deactivated"}.`, "success");
    } catch (error) {
        console.error("[Moneta] Admin status update failed:", error);
        showToast(error.message || "Could not update status.", "error");
    }
}

function handleCancelEdit(section) {
    clearEditingState(section);
    renderAdminModulesView();
}

function bindAdminModulesDomEvents() {
    const root = document.getElementById("admin-modules-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("submit", event => {
        if (event.target.id === "admin-category-form") {
            handleCategorySubmit(event);
            return;
        }

        if (event.target.id === "admin-season-form") {
            handleSeasonSubmit(event);
            return;
        }

        if (event.target.id === "admin-payment-mode-form") {
            handlePaymentModeSubmit(event);
        }
    });

    root.addEventListener("input", event => {
        handleSearchInput(event.target);
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const sectionButton = target.closest("[data-admin-section]");
        const editButton = target.closest(".admin-module-edit-button");
        const statusButton = target.closest(".admin-module-status-button");
        const categoryCancelButton = target.closest("#admin-category-cancel-button");
        const seasonCancelButton = target.closest("#admin-season-cancel-button");
        const paymentModeCancelButton = target.closest("#admin-payment-mode-cancel-button");

        if (sectionButton) {
            setActiveSection(sectionButton.dataset.adminSection);
            renderAdminModulesView();
            return;
        }

        if (editButton) {
            handleEditRecord(editButton);
            return;
        }

        if (statusButton) {
            handleStatusToggle(statusButton);
            return;
        }

        if (categoryCancelButton) {
            handleCancelEdit("categories");
            return;
        }

        if (seasonCancelButton) {
            handleCancelEdit("seasons");
            return;
        }

        if (paymentModeCancelButton) {
            handleCancelEdit("paymentModes");
        }
    });

    root.dataset.bound = "true";
}

export function initializeAdminModulesFeature() {
    bindAdminModulesDomEvents();

    subscribe(snapshot => {
        if (snapshot.currentRoute === "#/admin-modules") {
            renderAdminModulesView();
        }
    });
}
