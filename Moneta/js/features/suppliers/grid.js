import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";

let suppliersGridApi = null;
let currentGridElement = null;

function statusMarkup(isActive) {
    return `
        <span class="grid-status-cell grid-status-pill ${isActive ? "status-active" : "status-inactive"}">
            <span class="inline-icon">${isActive ? icons.active : icons.inactive}</span>
            ${isActive ? "Active" : "Inactive"}
        </span>
    `;
}

function actionMarkup(data) {
    return `
        <div class="table-actions">
            <button class="button grid-action-button grid-action-button-secondary supplier-edit-button" type="button" data-supplier-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
            <button class="button grid-action-button ${data.isActive ? "grid-action-button-danger" : "grid-action-button-primary"} supplier-status-button" type="button" data-supplier-id="${data.id}" data-next-status="${data.isActive ? "inactive" : "active"}">
                <span class="button-icon">${data.isActive ? icons.inactive : icons.active}</span>
                ${data.isActive ? "Deactivate" : "Activate"}
            </button>
        </div>
    `;
}

function buildColumnDefs() {
    return [
        { field: "supplierId", headerName: "Supplier ID", minWidth: 150, flex: 0.85 },
        { field: "supplierName", headerName: "Supplier", minWidth: 220, flex: 1.2 },
        { field: "contactNo", headerName: "Phone", minWidth: 150, flex: 0.9 },
        { field: "contactEmail", headerName: "Email", minWidth: 220, flex: 1.1 },
        { field: "creditTerm", headerName: "Credit Term", minWidth: 140, flex: 0.8 },
        { field: "address", headerName: "Address", minWidth: 240, flex: 1.25 },
        {
            field: "isActive",
            headerName: "Status",
            minWidth: 150,
            flex: 0.8,
            cellRenderer: params => statusMarkup(Boolean(params.value))
        },
        {
            headerName: "Actions",
            minWidth: 280,
            flex: 1.35,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup(params.data)
        }
    ];
}

export function initializeSuppliersGrid(gridElement) {
    if (!gridElement) return suppliersGridApi;

    if (suppliersGridApi && currentGridElement !== gridElement) {
        suppliersGridApi.destroy();
        suppliersGridApi = null;
        currentGridElement = null;
    }

    if (suppliersGridApi) return suppliersGridApi;

    suppliersGridApi = createGrid(gridElement, {
        columnDefs: buildColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true,
            wrapHeaderText: true,
            autoHeaderHeight: true,
            wrapText: true,
            autoHeight: true
        }
    });

    currentGridElement = gridElement;
    return suppliersGridApi;
}

export function refreshSuppliersGrid(rows) {
    if (!suppliersGridApi) return;
    suppliersGridApi.setGridOption("rowData", rows);
}

export function updateSuppliersGridSearch(searchTerm) {
    suppliersGridApi?.setGridOption("quickFilterText", searchTerm || "");
}
