import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

let leadsGridApi = null;
let currentLeadsGridElement = null;
let leadRequestedProductsGridApi = null;
let currentLeadRequestedProductsGridElement = null;
let leadWorkLogGridApi = null;
let currentLeadWorkLogGridElement = null;
let leadQuotesGridApi = null;
let currentLeadQuotesGridElement = null;

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
    const convertDisabled = data?.canConvertToRetail === false;
    const convertReason = data?.convertDisabledReason || "This enquiry cannot be converted right now.";
    const safeReason = String(convertReason)
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    const convertDisabledAttrs = convertDisabled
        ? `disabled title="${safeReason}" data-disabled-reason="${safeReason}"`
        : "";

    return `
        <div class="table-actions grid-actions-inline">
            <button class="button grid-action-button grid-action-button-secondary lead-edit-button" type="button" data-lead-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
            <button class="button grid-action-button grid-action-button-primary lead-convert-button" type="button" data-lead-id="${data.id}" ${convertDisabledAttrs}>
                <span class="button-icon">${icons.retail}</span>
                Convert
            </button>
            <button class="button grid-action-button grid-action-button-secondary lead-worklog-button" type="button" data-lead-id="${data.id}">
                <span class="button-icon">${icons.leads}</span>
                Work Log
            </button>
            <button class="button grid-action-button grid-action-button-danger lead-delete-button" type="button" data-lead-id="${data.id}">
                <span class="button-icon">${icons.inactive}</span>
                Delete
            </button>
        </div>
    `;
}

function quoteStatusMarkup(value) {
    const status = value || "No Quotes";
    const normalized = status.toLowerCase().replace(/\s+/g, "-");
    return `<span class="quote-status-pill quote-status-${normalized}">${status}</span>`;
}

function leadQuotesMarkup(data) {
    const quoteCount = Number(data?.quoteCount) || 0;
    const latestStatus = data?.latestQuoteStatus || "";
    const acceptedQuoteNumber = data?.acceptedQuoteNumber || "";

    return `
        <button class="button grid-action-button grid-action-button-secondary lead-quotes-button" type="button" data-lead-id="${data.id}">
            <span class="button-icon">${icons.catalogue}</span>
            ${quoteCount > 0 ? `${quoteCount} Quote${quoteCount === 1 ? "" : "s"}` : "Quotes"}
        </button>
        <div class="lead-quotes-cell-meta">
            ${latestStatus ? quoteStatusMarkup(latestStatus) : `<span class="quote-status-pill quote-status-empty">No Quotes</span>`}
            ${acceptedQuoteNumber ? `<span class="quote-status-pill quote-status-accepted-flag">Accepted: ${acceptedQuoteNumber}</span>` : ""}
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
            cellRenderer: params => statusMarkup(params.data?.displayLeadStatus || params.value)
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
            headerName: "No. Of Products",
            minWidth: 150,
            flex: 0.9,
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
        {
            headerName: "Quotes",
            minWidth: 230,
            flex: 1.05,
            sortable: false,
            filter: false,
            cellRenderer: params => leadQuotesMarkup(params.data)
        },
        { field: "assignedTo", headerName: "Assigned To", minWidth: 160, flex: 0.95 },
        {
            headerName: "Actions",
            minWidth: 450,
            flex: 1.6,
            sortable: false,
            filter: false,
            cellRenderer: params => leadActionMarkup(params.data)
        }
    ];
}

function buildLeadWorkLogColumnDefs() {
    return [
        {
            field: "logDate",
            headerName: "Date",
            minWidth: 190,
            flex: 0.85,
            sort: "desc",
            valueFormatter: params => formatDateTime(params.value)
        },
        {
            field: "logType",
            headerName: "Type",
            minWidth: 180,
            flex: 0.8
        },
        {
            field: "notes",
            headerName: "Notes",
            minWidth: 360,
            flex: 1.8
        },
        {
            field: "loggedBy",
            headerName: "Logged By",
            minWidth: 210,
            flex: 1
        }
    ];
}

function quoteGridActionMarkup(data) {
    const status = String(data?.quoteStatus || "").trim();

    return `
        <div class="table-actions grid-actions-inline">
            <button class="button grid-action-button grid-action-button-secondary" type="button" data-action="quote-select" data-quote-id="${data.id}">
                <span class="button-icon">${icons.search}</span>
                Open
            </button>
            <button class="button grid-action-button grid-action-button-secondary" type="button" data-action="quote-revise" data-quote-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Revise
            </button>
            ${status === "Sent" ? `
                <button class="button grid-action-button grid-action-button-primary" type="button" data-action="quote-accept" data-quote-id="${data.id}">
                    <span class="button-icon">${icons.active}</span>
                    Accept
                </button>
                <button class="button grid-action-button grid-action-button-secondary" type="button" data-action="quote-reject" data-quote-id="${data.id}">
                    <span class="button-icon">${icons.warning}</span>
                    Reject
                </button>
            ` : ""}
            ${["Draft", "Sent"].includes(status) ? `
                <button class="button grid-action-button grid-action-button-secondary" type="button" data-action="quote-cancel" data-quote-id="${data.id}">
                    <span class="button-icon">${icons.inactive}</span>
                    Cancel
                </button>
            ` : ""}
        </div>
    `;
}

function buildLeadQuotesColumnDefs() {
    return [
        { field: "businessQuoteId", headerName: "Quote No", minWidth: 170, flex: 1.05 },
        {
            field: "versionNo",
            headerName: "Ver",
            minWidth: 90,
            maxWidth: 110,
            ...rightAlignedNumberColumn
        },
        {
            field: "quoteStatus",
            headerName: "Status",
            minWidth: 130,
            flex: 0.85,
            cellRenderer: params => quoteStatusMarkup(params.value)
        },
        { field: "store", headerName: "Channel", minWidth: 150, flex: 0.95 },
        {
            field: "validUntil",
            headerName: "Valid Until",
            minWidth: 135,
            flex: 0.85,
            valueFormatter: params => formatDate(params.value)
        },
        {
            headerName: "Total",
            minWidth: 130,
            flex: 0.9,
            ...rightAlignedNumberColumn,
            valueGetter: params => Number(params.data?.totals?.grandTotal) || 0,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "sentOn",
            headerName: "Sent On",
            minWidth: 145,
            flex: 0.9,
            valueFormatter: params => formatDate(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 310,
            flex: 1.7,
            sortable: false,
            filter: false,
            cellRenderer: params => quoteGridActionMarkup(params.data)
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
            editable: params => !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("requestedQty", 0),
            ...rightAlignedNumberColumn
        },
        {
            field: "productName",
            headerName: "Product",
            minWidth: 240,
            flex: 1.35
        },
        { field: "categoryName", headerName: "Category", minWidth: 150, flex: 0.9 },
        {
            field: "sellingPrice",
            headerName: "Selling Price",
            minWidth: 140,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueFormatter: params => (params.node?.rowPinned ? "" : formatCurrency(params.value || 0))
        },
        {
            headerName: "Est. Value",
            minWidth: 140,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueGetter: params => {
                if (params.node?.rowPinned) {
                    return params.data?.estimatedValue || 0;
                }

                return (Number(params.data?.requestedQty) || 0) * (Number(params.data?.sellingPrice) || 0);
            },
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            headerName: "Request State",
            minWidth: 130,
            flex: 0.8,
            sortable: false,
            filter: false,
            valueGetter: params => Number(params.data?.requestedQty) || 0,
            cellRenderer: params => (params.node?.rowPinned ? "" : requestedItemStatusMarkup(Number(params.value) || 0))
        }
    ];
}

function getVisibleRows(api) {
    const rows = [];

    api?.forEachNodeAfterFilterAndSort(node => {
        if (!node.rowPinned) {
            rows.push(node.data);
        }
    });

    return rows;
}

function buildRequestedProductsPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totals = rows.reduce((summary, row) => {
        const requestedQty = Number(row?.requestedQty) || 0;
        const estimatedValue = requestedQty * (Number(row?.sellingPrice) || 0);

        summary.requestedQty += requestedQty;
        summary.estimatedValue += estimatedValue;
        return summary;
    }, {
        requestedQty: 0,
        estimatedValue: 0
    });

    return [{
        productName: "Totals",
        requestedQty: totals.requestedQty,
        estimatedValue: Number(totals.estimatedValue.toFixed(2))
    }];
}

function refreshLeadRequestedProductsPinnedBottomRow(api) {
    if (!api) return;

    api.setGridOption("pinnedBottomRowData", buildRequestedProductsPinnedBottomRow(getVisibleRows(api)));
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
        pinnedBottomRowData: [],
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
            refreshLeadRequestedProductsPinnedBottomRow(params.api);
            onRowsChanged?.();
        },
        onFilterChanged: event => {
            refreshLeadRequestedProductsPinnedBottomRow(event.api);
        }
    });

    currentLeadRequestedProductsGridElement = gridElement;
    return leadRequestedProductsGridApi;
}

export function refreshLeadRequestedProductsGrid(rows) {
    if (!leadRequestedProductsGridApi) return;

    leadRequestedProductsGridApi.setGridOption("rowData", rows);
    refreshLeadRequestedProductsPinnedBottomRow(leadRequestedProductsGridApi);
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

export function initializeLeadWorkLogGrid(gridElement) {
    if (!gridElement) return leadWorkLogGridApi;

    if (leadWorkLogGridApi && currentLeadWorkLogGridElement !== gridElement) {
        leadWorkLogGridApi.destroy();
        leadWorkLogGridApi = null;
        currentLeadWorkLogGridElement = null;
    }

    if (leadWorkLogGridApi) return leadWorkLogGridApi;

    leadWorkLogGridApi = createGrid(gridElement, {
        columnDefs: buildLeadWorkLogColumnDefs(),
        rowData: [],
        defaultColDef: buildDefaultColDef(),
        pagination: true,
        paginationPageSize: 20,
        paginationPageSizeSelector: [10, 20, 50, 100]
    });

    currentLeadWorkLogGridElement = gridElement;
    return leadWorkLogGridApi;
}

export function refreshLeadWorkLogGrid(rows) {
    leadWorkLogGridApi?.setGridOption("rowData", rows || []);
}

export function updateLeadWorkLogGridSearch(searchTerm) {
    leadWorkLogGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializeLeadQuotesGrid(gridElement, onQuoteSelected) {
    if (!gridElement) return leadQuotesGridApi;

    if (leadQuotesGridApi && currentLeadQuotesGridElement !== gridElement) {
        leadQuotesGridApi.destroy();
        leadQuotesGridApi = null;
        currentLeadQuotesGridElement = null;
    }

    if (leadQuotesGridApi) return leadQuotesGridApi;

    leadQuotesGridApi = createGrid(gridElement, {
        columnDefs: buildLeadQuotesColumnDefs(),
        rowData: [],
        defaultColDef: buildDefaultColDef(),
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizeSelector: [10, 20, 50],
        rowSelection: {
            mode: "singleRow",
            enableClickSelection: true
        },
        getRowId: params => params.data.id,
        onRowClicked: event => {
            if (event.event?.target?.closest("button")) {
                return;
            }
            onQuoteSelected?.(event.data);
        }
    });

    currentLeadQuotesGridElement = gridElement;
    return leadQuotesGridApi;
}

export function refreshLeadQuotesGrid(rows, selectedQuoteId = "") {
    if (!leadQuotesGridApi) return;

    leadQuotesGridApi.setGridOption("rowData", rows || []);

    if (!selectedQuoteId) return;

    leadQuotesGridApi.forEachNode(node => {
        node.setSelected(node.data?.id === selectedQuoteId);
    });
}

export function updateLeadQuotesGridSearch(searchTerm) {
    leadQuotesGridApi?.setGridOption("quickFilterText", searchTerm || "");
}
