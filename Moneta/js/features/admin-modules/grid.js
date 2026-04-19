import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";

let categoriesGridApi = null;
let categoriesGridElement = null;
let paymentModesGridApi = null;
let paymentModesGridElement = null;
let seasonsGridApi = null;
let seasonsGridElement = null;
let reorderPoliciesGridApi = null;
let reorderPoliciesGridElement = null;

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
    return `
        <div class="table-actions grid-actions-inline">
            <button class="button grid-action-button grid-action-button-secondary admin-module-edit-button" type="button" data-entity="${entity}" data-record-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
            <button class="button grid-action-button ${data.isActive ? "grid-action-button-danger" : "grid-action-button-primary"} admin-module-status-button" type="button" data-entity="${entity}" data-record-id="${data.id}" data-next-status="${data.isActive ? "false" : "true"}">
                <span class="button-icon">${data.isActive ? icons.inactive : icons.active}</span>
                ${data.isActive ? "Deactivate" : "Activate"}
            </button>
        </div>
    `;
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
