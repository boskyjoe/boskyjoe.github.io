import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import {
    canPreparePortalRequestForRetail,
    getPortalRequestConversionStatusLabel,
    getPortalRequestStatusLabel
} from "./service.js";

let portalRequestsGridApi = null;
let currentPortalRequestsGridElement = null;
let portalRequestItemsGridApi = null;
let currentPortalRequestItemsGridElement = null;
let portalRequestsGridHandlers = {
    onRowClicked: null
};

const rightAlignedNumberColumn = {
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header"
};

function formatDateTime(value) {
    if (!value) return "-";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function normalizeStatusClass(value = "") {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function portalStatusMarkup(value) {
    const label = getPortalRequestStatusLabel(value);
    return `<span class="portal-request-status-pill portal-request-status-${normalizeStatusClass(label)}">${label}</span>`;
}

function portalConversionMarkup(value) {
    const label = getPortalRequestConversionStatusLabel(value);
    return `<span class="portal-request-conversion-pill portal-request-conversion-${normalizeStatusClass(label)}">${label}</span>`;
}

function escapeAttribute(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function portalActionMarkup(data) {
    const prepareGate = canPreparePortalRequestForRetail(data);
    const disabledAttrs = prepareGate.allowed
        ? ""
        : `disabled title="${escapeAttribute(prepareGate.reason)}" data-disabled-reason="${escapeAttribute(prepareGate.reason)}"`;

    return `
        <div class="table-actions grid-actions-inline">
            <button class="button grid-action-button grid-action-button-secondary portal-request-review-button" type="button" data-request-id="${data.id}">
                <span class="button-icon">${icons.search}</span>
                Review
            </button>
            <button class="button grid-action-button grid-action-button-primary portal-request-prepare-button" type="button" data-request-id="${data.id}" ${disabledAttrs}>
                <span class="button-icon">${icons.retail}</span>
                Prepare
            </button>
        </div>
    `;
}

function buildPortalRequestsColumnDefs() {
    return [
        { field: "requestId", headerName: "Request ID", minWidth: 180, flex: 1 },
        { field: "customerName", headerName: "Customer", minWidth: 220, flex: 1.15 },
        { field: "customerPhone", headerName: "Phone", minWidth: 160, flex: 0.9 },
        { field: "pickupDate", headerName: "Pickup Date", minWidth: 145, flex: 0.85 },
        { field: "pickupTime", headerName: "Pickup Time", minWidth: 140, flex: 0.8 },
        {
            field: "itemCount",
            headerName: "Items",
            minWidth: 110,
            flex: 0.7,
            ...rightAlignedNumberColumn
        },
        {
            field: "subtotal",
            headerName: "Submitted Total",
            minWidth: 160,
            flex: 0.9,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "status",
            headerName: "Status",
            minWidth: 145,
            flex: 0.8,
            cellRenderer: params => portalStatusMarkup(params.value)
        },
        {
            field: "conversionStatus",
            headerName: "Conversion",
            minWidth: 160,
            flex: 0.95,
            cellRenderer: params => portalConversionMarkup(params.value)
        },
        {
            field: "submittedAt",
            headerName: "Submitted On",
            minWidth: 185,
            flex: 1,
            valueFormatter: params => formatDateTime(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 300,
            flex: 1.2,
            sortable: false,
            filter: false,
            cellRenderer: params => portalActionMarkup(params.data)
        }
    ];
}

function buildPortalRequestItemsColumnDefs() {
    return [
        { field: "name", headerName: "Product", minWidth: 220, flex: 1.3 },
        { field: "categoryName", headerName: "Category", minWidth: 150, flex: 0.95 },
        {
            field: "quantity",
            headerName: "Qty",
            minWidth: 95,
            flex: 0.55,
            ...rightAlignedNumberColumn
        },
        {
            field: "price",
            headerName: "Snapshot Price",
            minWidth: 135,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "lineTotal",
            headerName: "Line Total",
            minWidth: 125,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        }
    ];
}

export function initializePortalRequestsGrid(gridElement, handlers = {}) {
    if (!gridElement) return portalRequestsGridApi;
    portalRequestsGridHandlers = {
        onRowClicked: handlers.onRowClicked || null
    };

    if (portalRequestsGridApi && currentPortalRequestsGridElement !== gridElement) {
        portalRequestsGridApi.destroy();
        portalRequestsGridApi = null;
        currentPortalRequestsGridElement = null;
    }

    if (portalRequestsGridApi) return portalRequestsGridApi;

    portalRequestsGridApi = createGrid(gridElement, {
        columnDefs: buildPortalRequestsColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        getRowId: params => params.data.id,
        onRowClicked: params => {
            portalRequestsGridHandlers.onRowClicked?.(params.data);
        },
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

    currentPortalRequestsGridElement = gridElement;
    return portalRequestsGridApi;
}

export function refreshPortalRequestsGrid(rows) {
    if (!portalRequestsGridApi) return;
    portalRequestsGridApi.setGridOption("rowData", rows);
}

export function updatePortalRequestsGridSearch(searchTerm) {
    portalRequestsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializePortalRequestItemsGrid(gridElement) {
    if (!gridElement) return portalRequestItemsGridApi;

    if (portalRequestItemsGridApi && currentPortalRequestItemsGridElement !== gridElement) {
        portalRequestItemsGridApi.destroy();
        portalRequestItemsGridApi = null;
        currentPortalRequestItemsGridElement = null;
    }

    if (portalRequestItemsGridApi) return portalRequestItemsGridApi;

    portalRequestItemsGridApi = createGrid(gridElement, {
        columnDefs: buildPortalRequestItemsColumnDefs(),
        rowData: [],
        pagination: false,
        domLayout: "autoHeight",
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

    currentPortalRequestItemsGridElement = gridElement;
    return portalRequestItemsGridApi;
}

export function refreshPortalRequestItemsGrid(rows) {
    if (!portalRequestItemsGridApi) return;
    portalRequestItemsGridApi.setGridOption("rowData", rows);
}
