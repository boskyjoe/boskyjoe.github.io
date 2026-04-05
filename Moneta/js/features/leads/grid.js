import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

let leadsGridApi = null;
let currentLeadsGridElement = null;
let leadRequestedProductsGridApi = null;
let currentLeadRequestedProductsGridElement = null;

const rightAlignedNumberColumn = {
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header"
};

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

function statusMarkup(value) {
    const status = value || "New";
    const normalized = status.toLowerCase().replace(/\s+/g, "-");
    return `<span class="lead-status-pill lead-status-${normalized}">${status}</span>`;
}

function requestedItemStatusMarkup(quantity) {
    return quantity > 0
        ? `<span class="purchase-status-pill purchase-status-paid">Included</span>`
        : `<span class="purchase-status-pill purchase-status-unpaid">Not Included</span>`;
}

function buildNumberSetter(field, decimals = 0) {
    return params => {
        const parsed = Number(params.newValue);
        const normalized = Number.isFinite(parsed) && parsed > 0
            ? Number(parsed.toFixed(decimals))
            : 0;
        const changed = params.data[field] !== normalized;

        params.data[field] = normalized;
        return changed;
    };
}

function leadActionMarkup(data) {
    return `
        <div class="table-actions">
            <button class="button grid-action-button grid-action-button-secondary lead-edit-button" type="button" data-lead-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
            <button class="button grid-action-button grid-action-button-danger lead-delete-button" type="button" data-lead-id="${data.id}">
                <span class="button-icon">${icons.inactive}</span>
                Delete
            </button>
        </div>
    `;
}

function buildLeadColumnDefs() {
    return [
        { field: "businessLeadId", headerName: "Lead ID", minWidth: 150, flex: 0.9 },
        { field: "customerName", headerName: "Customer", minWidth: 220, flex: 1.2 },
        { field: "customerPhone", headerName: "Phone", minWidth: 160, flex: 0.95 },
        { field: "leadSource", headerName: "Source", minWidth: 130, flex: 0.8 },
        {
            field: "leadStatus",
            headerName: "Status",
            minWidth: 150,
            flex: 0.85,
            cellRenderer: params => statusMarkup(params.value)
        },
        {
            field: "enquiryDate",
            headerName: "Enquiry Date",
            minWidth: 140,
            flex: 0.9,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "expectedDeliveryDate",
            headerName: "Exp. Delivery",
            minWidth: 150,
            flex: 0.95,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "requestedItemCount",
            headerName: "Items",
            minWidth: 100,
            flex: 0.7,
            ...rightAlignedNumberColumn
        },
        {
            field: "requestedValue",
            headerName: "Est. Value",
            minWidth: 140,
            flex: 0.9,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        { field: "assignedTo", headerName: "Assigned To", minWidth: 160, flex: 0.95 },
        {
            headerName: "Actions",
            minWidth: 240,
            flex: 1.2,
            sortable: false,
            filter: false,
            cellRenderer: params => leadActionMarkup(params.data)
        }
    ];
}

function buildRequestedProductsColumnDefs(onRowsChanged) {
    return [
        {
            field: "requestedQty",
            headerName: "Qty",
            minWidth: 95,
            maxWidth: 110,
            editable: true,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("requestedQty", 0),
            ...rightAlignedNumberColumn
        },
        { field: "productName", headerName: "Product", minWidth: 240, flex: 1.35 },
        { field: "categoryName", headerName: "Category", minWidth: 150, flex: 0.9 },
        {
            field: "sellingPrice",
            headerName: "Selling Price",
            minWidth: 140,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            headerName: "Est. Value",
            minWidth: 140,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueGetter: params => (Number(params.data?.requestedQty) || 0) * (Number(params.data?.sellingPrice) || 0),
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            headerName: "Request State",
            minWidth: 130,
            flex: 0.8,
            sortable: false,
            filter: false,
            valueGetter: params => Number(params.data?.requestedQty) || 0,
            cellRenderer: params => requestedItemStatusMarkup(Number(params.value) || 0)
        }
    ];
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

export function initializeLeadsGrid(gridElement) {
    if (!gridElement) return leadsGridApi;

    if (leadsGridApi && currentLeadsGridElement !== gridElement) {
        leadsGridApi.destroy();
        leadsGridApi = null;
        currentLeadsGridElement = null;
    }

    if (leadsGridApi) return leadsGridApi;

    leadsGridApi = createGrid(gridElement, {
        columnDefs: buildLeadColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: buildDefaultColDef()
    });

    currentLeadsGridElement = gridElement;
    return leadsGridApi;
}

export function refreshLeadsGrid(rows) {
    leadsGridApi?.setGridOption("rowData", rows);
}

export function updateLeadsGridSearch(searchTerm) {
    leadsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializeLeadRequestedProductsGrid(gridElement, onRowsChanged) {
    if (!gridElement) return leadRequestedProductsGridApi;

    if (leadRequestedProductsGridApi && currentLeadRequestedProductsGridElement !== gridElement) {
        leadRequestedProductsGridApi.destroy();
        leadRequestedProductsGridApi = null;
        currentLeadRequestedProductsGridElement = null;
    }

    if (leadRequestedProductsGridApi) return leadRequestedProductsGridApi;

    leadRequestedProductsGridApi = createGrid(gridElement, {
        columnDefs: buildRequestedProductsColumnDefs(onRowsChanged),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: buildDefaultColDef(),
        getRowId: params => params.data.productId,
        singleClickEdit: true,
        stopEditingWhenCellsLoseFocus: true,
        rowClassRules: {
            "purchase-line-item-active": params => (Number(params.data?.requestedQty) || 0) > 0
        },
        onCellValueChanged: params => {
            params.api.refreshCells({ rowNodes: [params.node], force: true });
            onRowsChanged?.();
        }
    });

    currentLeadRequestedProductsGridElement = gridElement;
    return leadRequestedProductsGridApi;
}

export function refreshLeadRequestedProductsGrid(rows) {
    leadRequestedProductsGridApi?.setGridOption("rowData", rows);
}

export function updateLeadRequestedProductsGridSearch(searchTerm) {
    leadRequestedProductsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function getLeadRequestedProductsGridRows() {
    if (!leadRequestedProductsGridApi) return [];

    const rows = [];
    leadRequestedProductsGridApi.forEachNode(node => {
        rows.push(node.data);
    });
    return rows;
}
