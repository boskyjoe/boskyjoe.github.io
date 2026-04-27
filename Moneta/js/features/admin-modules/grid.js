import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";

let categoriesGridApi = null;
let categoriesGridElement = null;
let paymentModesGridApi = null;
let paymentModesGridElement = null;
let seasonsGridApi = null;
let seasonsGridElement = null;
let pricingPoliciesGridApi = null;
let pricingPoliciesGridElement = null;
let reorderPoliciesGridApi = null;
let reorderPoliciesGridElement = null;
let storeConfigsGridApi = null;
let storeConfigsGridElement = null;

function statusMarkup(isActive) {
    return `
        <span class="grid-status-cell grid-status-pill ${isActive ? "status-active" : "status-inactive"}">
            <span class="inline-icon">${isActive ? icons.active : icons.inactive}</span>
            ${isActive ? "Active" : "Inactive"}
        </span>
    `;
}

function seasonWorkflowMarkup(value) {
    const label = value || "Upcoming";
    const normalized = label.toLowerCase().replace(/\s+/g, "-");
    return `<span class="admin-lifecycle-pill admin-lifecycle-${normalized}">${label}</span>`;
}

function actionMarkup(entity, data) {
    if (entity === "storeConfigs" || entity === "pricingPolicies") {
        return `
            <div class="table-actions grid-actions-inline">
                <button class="button grid-action-button grid-action-button-secondary admin-module-edit-button" type="button" data-entity="${entity}" data-record-id="${data.id}">
                    <span class="button-icon">${icons.edit}</span>
                    Edit
                </button>
            </div>
        `;
    }

    const isProtectedDefault = entity === "reorderPolicies" && data?.isSystemDefault && data?.isActive;
    const statusClasses = data.isActive ? "grid-action-button-danger" : "grid-action-button-primary";

    return `
        <div class="table-actions grid-actions-inline">
            <button class="button grid-action-button grid-action-button-secondary admin-module-edit-button" type="button" data-entity="${entity}" data-record-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
            <button
                class="button grid-action-button ${statusClasses} admin-module-status-button"
                type="button"
                data-entity="${entity}"
                data-record-id="${data.id}"
                data-next-status="${data.isActive ? "false" : "true"}"
                ${isProtectedDefault ? "disabled data-disabled-reason=\"The Moneta default rule can be updated, but it cannot be deactivated.\"" : ""}>
                <span class="button-icon">${data.isActive ? icons.inactive : icons.active}</span>
                ${data.isActive ? "Deactivate" : "Activate"}
            </button>
        </div>
    `;
}

function buildPricingPoliciesColumnDefs() {
    return [
        { field: "policyName", headerName: "Policy", minWidth: 220, flex: 1.2 },
        { field: "costingMethod", headerName: "Costing Method", minWidth: 170, flex: 0.95 },
        { field: "sellingPriceBehavior", headerName: "Selling Price Behavior", minWidth: 210, flex: 1.15 },
        {
            field: "defaultTargetMarginPercentage",
            headerName: "Default Margin",
            minWidth: 140,
            flex: 0.8,
            valueFormatter: params => `${Number(params.value) || 0}%`
        },
        {
            field: "costChangeAlertThresholdPercentage",
            headerName: "Review Threshold",
            minWidth: 155,
            flex: 0.9,
            valueFormatter: params => `${Number(params.value) || 0}%`
        },
        {
            field: "allowManualCostOverride",
            headerName: "Manual Override",
            minWidth: 150,
            flex: 0.85,
            valueFormatter: params => params.value ? "Allowed" : "Locked"
        },
        {
            headerName: "Updated",
            minWidth: 150,
            flex: 0.9,
            valueGetter: params => getUpdatedDate(params.data),
            valueFormatter: params => formatDate(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 150,
            flex: 0.8,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup("pricingPolicies", params.data)
        }
    ];
}

function formatDate(value) {
    if (!value) return "-";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getUpdatedDate(row) {
    return row.updatedOn || row.audit?.updatedOn || row.createdOn || row.audit?.createdOn || null;
}

function buildDefaultColDef() {
    return {
        sortable: true,
        filter: true,
        resizable: true,
        wrapHeaderText: true,
        autoHeaderHeight: true,
        wrapText: true,
        autoHeight: true
    };
}

function buildCategoriesColumnDefs() {
    return [
        { field: "categoryId", headerName: "Category ID", minWidth: 150, flex: 0.85 },
        { field: "categoryName", headerName: "Category Name", minWidth: 240, flex: 1.3 },
        {
            field: "isActive",
            headerName: "Status",
            minWidth: 150,
            flex: 0.85,
            cellRenderer: params => statusMarkup(Boolean(params.value))
        },
        {
            headerName: "Updated",
            minWidth: 150,
            flex: 0.9,
            valueGetter: params => getUpdatedDate(params.data),
            valueFormatter: params => formatDate(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 280,
            flex: 1.35,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup("categories", params.data)
        }
    ];
}

function buildPaymentModesColumnDefs() {
    return [
        { field: "paymentTypeId", headerName: "Payment ID", minWidth: 150, flex: 0.85 },
        { field: "paymentMode", headerName: "Payment Mode", minWidth: 220, flex: 1.25 },
        {
            field: "isActive",
            headerName: "Status",
            minWidth: 150,
            flex: 0.85,
            cellRenderer: params => statusMarkup(Boolean(params.value))
        },
        {
            headerName: "Updated",
            minWidth: 150,
            flex: 0.9,
            valueGetter: params => getUpdatedDate(params.data),
            valueFormatter: params => formatDate(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 280,
            flex: 1.35,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup("paymentModes", params.data)
        }
    ];
}

function buildSeasonsColumnDefs() {
    return [
        { field: "seasonId", headerName: "Season ID", minWidth: 170, flex: 0.95 },
        { field: "seasonName", headerName: "Season Name", minWidth: 220, flex: 1.2 },
        {
            field: "startDate",
            headerName: "Start Date",
            minWidth: 140,
            flex: 0.9,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "endDate",
            headerName: "End Date",
            minWidth: 140,
            flex: 0.9,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "status",
            headerName: "Workflow",
            minWidth: 150,
            flex: 0.95,
            cellRenderer: params => seasonWorkflowMarkup(params.value)
        },
        {
            field: "isActive",
            headerName: "Active",
            minWidth: 140,
            flex: 0.8,
            cellRenderer: params => statusMarkup(Boolean(params.value))
        },
        {
            headerName: "Actions",
            minWidth: 280,
            flex: 1.35,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup("seasons", params.data)
        }
    ];
}

function buildReorderPoliciesColumnDefs() {
    return [
        { field: "policyCode", headerName: "Policy ID", minWidth: 150, flex: 0.85 },
        { field: "policyName", headerName: "Policy Name", minWidth: 220, flex: 1.15 },
        {
            field: "isSystemDefault",
            headerName: "Default",
            minWidth: 130,
            flex: 0.75,
            cellRenderer: params => params.value
                ? `<span class="grid-status-cell grid-status-pill status-active"><span class="inline-icon">${icons.active}</span>Moneta Default</span>`
                : `<span class="table-note">-</span>`
        },
        { field: "scopeSummary", headerName: "Scope", minWidth: 180, flex: 1 },
        {
            field: "leadTimeDays",
            headerName: "Lead Time",
            minWidth: 120,
            flex: 0.7,
            valueFormatter: params => `${params.value || 0}d`
        },
        {
            field: "targetCoverDays",
            headerName: "Target Cover",
            minWidth: 130,
            flex: 0.8,
            valueFormatter: params => `${params.value || 0}d`
        },
        {
            field: "isActive",
            headerName: "Status",
            minWidth: 140,
            flex: 0.8,
            cellRenderer: params => statusMarkup(Boolean(params.value))
        },
        {
            field: "ruleExplanation",
            headerName: "Rule Summary",
            minWidth: 360,
            flex: 1.9
        },
        {
            headerName: "Actions",
            minWidth: 280,
            flex: 1.35,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup("reorderPolicies", params.data)
        }
    ];
}

function buildStoreConfigsColumnDefs() {
    return [
        { field: "storeName", headerName: "Store", minWidth: 180, flex: 1 },
        { field: "companyName", headerName: "Company Name", minWidth: 220, flex: 1.2 },
        {
            field: "isDefault",
            headerName: "Default",
            minWidth: 120,
            flex: 0.75,
            cellRenderer: params => params.value
                ? `<span class="grid-status-cell grid-status-pill status-active"><span class="inline-icon">${icons.active}</span>Default</span>`
                : `<span class="table-note">-</span>`
        },
        { field: "salePrefix", headerName: "Sale Prefix", minWidth: 120, flex: 0.75 },
        {
            field: "requiresCustomerAddress",
            headerName: "Address Rule",
            minWidth: 160,
            flex: 0.95,
            valueFormatter: params => params.value ? "Address Required" : "Address Optional"
        },
        { field: "email", headerName: "Email", minWidth: 220, flex: 1.1 },
        {
            headerName: "Updated",
            minWidth: 150,
            flex: 0.9,
            valueGetter: params => getUpdatedDate(params.data),
            valueFormatter: params => formatDate(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 150,
            flex: 0.85,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup("storeConfigs", params.data)
        }
    ];
}

function initializeGrid(gridElement, currentApi, currentElement, columnDefs) {
    if (!gridElement) return currentApi;

    if (currentApi && currentElement !== gridElement) {
        currentApi.destroy();
        currentApi = null;
        currentElement = null;
    }

    if (currentApi) {
        return currentApi;
    }

    currentApi = createGrid(gridElement, {
        columnDefs,
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: buildDefaultColDef()
    });

    return currentApi;
}

export function initializeCategoriesGrid(gridElement) {
    categoriesGridApi = initializeGrid(gridElement, categoriesGridApi, categoriesGridElement, buildCategoriesColumnDefs());
    categoriesGridElement = gridElement;
    return categoriesGridApi;
}

export function refreshCategoriesGrid(rows) {
    categoriesGridApi?.setGridOption("rowData", rows);
}

export function updateCategoriesGridSearch(searchTerm) {
    categoriesGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializePaymentModesGrid(gridElement) {
    paymentModesGridApi = initializeGrid(gridElement, paymentModesGridApi, paymentModesGridElement, buildPaymentModesColumnDefs());
    paymentModesGridElement = gridElement;
    return paymentModesGridApi;
}

export function refreshPaymentModesGrid(rows) {
    paymentModesGridApi?.setGridOption("rowData", rows);
}

export function updatePaymentModesGridSearch(searchTerm) {
    paymentModesGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializeSeasonsGrid(gridElement) {
    seasonsGridApi = initializeGrid(gridElement, seasonsGridApi, seasonsGridElement, buildSeasonsColumnDefs());
    seasonsGridElement = gridElement;
    return seasonsGridApi;
}

export function refreshSeasonsGrid(rows) {
    seasonsGridApi?.setGridOption("rowData", rows);
}

export function updateSeasonsGridSearch(searchTerm) {
    seasonsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializeReorderPoliciesGrid(gridElement) {
    reorderPoliciesGridApi = initializeGrid(gridElement, reorderPoliciesGridApi, reorderPoliciesGridElement, buildReorderPoliciesColumnDefs());
    reorderPoliciesGridElement = gridElement;
    return reorderPoliciesGridApi;
}

export function refreshReorderPoliciesGrid(rows) {
    reorderPoliciesGridApi?.setGridOption("rowData", rows);
}

export function updateReorderPoliciesGridSearch(searchTerm) {
    reorderPoliciesGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializePricingPoliciesGrid(gridElement) {
    pricingPoliciesGridApi = initializeGrid(gridElement, pricingPoliciesGridApi, pricingPoliciesGridElement, buildPricingPoliciesColumnDefs());
    pricingPoliciesGridElement = gridElement;
    return pricingPoliciesGridApi;
}

export function refreshPricingPoliciesGrid(rows) {
    pricingPoliciesGridApi?.setGridOption("rowData", rows);
}

export function updatePricingPoliciesGridSearch(searchTerm) {
    pricingPoliciesGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializeStoreConfigsGrid(gridElement) {
    storeConfigsGridApi = initializeGrid(gridElement, storeConfigsGridApi, storeConfigsGridElement, buildStoreConfigsColumnDefs());
    storeConfigsGridElement = gridElement;
    return storeConfigsGridApi;
}

export function refreshStoreConfigsGrid(rows) {
    storeConfigsGridApi?.setGridOption("rowData", rows);
}

export function updateStoreConfigsGridSearch(searchTerm) {
    storeConfigsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}
