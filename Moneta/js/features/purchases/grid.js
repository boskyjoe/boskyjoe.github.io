import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

let purchasesGridApi = null;
let currentGridElement = null;

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

function paymentStatusMarkup(value) {
    const status = value || "Unpaid";
    const normalized = status.toLowerCase().replace(/\s+/g, "-");

    return `<span class="purchase-status-pill purchase-status-${normalized}">${status}</span>`;
}

function actionMarkup(data) {
    return `
        <div class="table-actions">
            <button class="button button-secondary purchase-edit-button" type="button" data-invoice-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
        </div>
    `;
}

function buildColumnDefs() {
    return [
        { field: "invoiceId", headerName: "Invoice ID", minWidth: 150, flex: 0.9 },
        { field: "invoiceName", headerName: "Invoice Name", minWidth: 220, flex: 1.4 },
        {
            field: "purchaseDate",
            headerName: "Date",
            minWidth: 140,
            flex: 0.9,
            valueFormatter: params => formatDate(params.value)
        },
        { field: "supplierName", headerName: "Supplier", minWidth: 220, flex: 1.2 },
        { field: "supplierInvoiceNo", headerName: "Supplier Ref", minWidth: 160, flex: 1 },
        {
            headerName: "Items",
            minWidth: 100,
            flex: 0.6,
            valueGetter: params => params.data?.lineItems?.length || 0
        },
        {
            field: "invoiceTotal",
            headerName: "Total",
            minWidth: 140,
            flex: 0.9,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "balanceDue",
            headerName: "Balance",
            minWidth: 140,
            flex: 0.9,
            valueFormatter: params => formatCurrency(params.value ?? params.data?.invoiceTotal ?? 0)
        },
        {
            field: "paymentStatus",
            headerName: "Status",
            minWidth: 150,
            flex: 0.95,
            cellRenderer: params => paymentStatusMarkup(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 160,
            flex: 1,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup(params.data)
        }
    ];
}

export function initializePurchasesGrid(gridElement, onFilteredCountChange) {
    if (!gridElement) return purchasesGridApi;

    if (purchasesGridApi && currentGridElement !== gridElement) {
        purchasesGridApi.destroy();
        purchasesGridApi = null;
        currentGridElement = null;
    }

    if (purchasesGridApi) return purchasesGridApi;

    purchasesGridApi = createGrid(gridElement, {
        columnDefs: buildColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true
        },
        onModelUpdated: event => {
            onFilteredCountChange?.(event.api.getDisplayedRowCount());
        }
    });

    currentGridElement = gridElement;

    return purchasesGridApi;
}

export function refreshPurchasesGrid(rows) {
    if (!purchasesGridApi) return;
    purchasesGridApi.setGridOption("rowData", rows);
}

export function updatePurchasesGridSearch(searchTerm) {
    purchasesGridApi?.setGridOption("quickFilterText", searchTerm || "");
}
