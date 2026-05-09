import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";

let customersGridApi = null;
let currentCustomersGridElement = null;
let customersGridHandlers = {
    onRowClicked: null
};

function normalizeText(value) {
    return String(value || "").trim();
}

function escapeAttribute(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
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

function formatSourceChannelLabel(value) {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return "";

    if (normalized === "lead") return "Enquiry";
    if (normalized === "quote") return "Quote";
    if (normalized === "retail-sale") return "Retail Sale";
    if (normalized === "portal-request" || normalized === "moneta-pickup-portal") return "Portal Request";
    if (normalized === "manual") return "Manual";

    return value;
}

function formatSourceChannelsForGrid(sourceChannels = []) {
    const labels = Array.isArray(sourceChannels)
        ? sourceChannels.map(formatSourceChannelLabel).filter(Boolean)
        : [];

    return labels.length ? labels.join(", ") : "-";
}

function normalizeStatusClass(value = "") {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function customerStatusMarkup(value) {
    const label = normalizeText(value) || "active";
    const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);
    return `<span class="customer-master-status-pill customer-master-status-${normalizeStatusClass(displayLabel)}">${displayLabel}</span>`;
}

function customerActionMarkup(data) {
    return `
        <div class="table-actions grid-actions-inline">
            <button class="button grid-action-button grid-action-button-secondary customer-master-review-button" type="button" data-customer-id="${escapeAttribute(data.id)}">
                <span class="button-icon">${icons.search}</span>
                View Profile
            </button>
        </div>
    `;
}

function isCustomerGridActionClick(event) {
    const target = event?.target;
    if (!(target instanceof Element)) return false;

    return Boolean(
        target.closest(
            ".customer-master-review-button, .grid-action-button, .table-actions"
        )
    );
}

function buildCustomersColumnDefs() {
    return [
        { field: "id", headerName: "Customer ID", minWidth: 190, flex: 1, tooltipField: "id" },
        { field: "displayName", headerName: "Customer", minWidth: 220, flex: 1.2, tooltipField: "displayName" },
        { field: "primaryPhone", headerName: "Phone", minWidth: 160, flex: 0.9, tooltipField: "primaryPhone" },
        { field: "primaryEmail", headerName: "Email", minWidth: 220, flex: 1.2, tooltipField: "primaryEmail" },
        {
            field: "sourceChannels",
            headerName: "Linked Channels",
            minWidth: 210,
            flex: 1.15,
            valueGetter: params => formatSourceChannelsForGrid(params.data?.sourceChannels),
            tooltipValueGetter: params => params.value
        },
        {
            field: "lastSeenAt",
            headerName: "Last Seen",
            minWidth: 180,
            flex: 0.95,
            valueFormatter: params => formatDateTime(params.value)
        },
        {
            field: "lastPurchaseOn",
            headerName: "Last Purchase",
            minWidth: 160,
            flex: 0.9,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "status",
            headerName: "Status",
            minWidth: 120,
            flex: 0.7,
            cellRenderer: params => customerStatusMarkup(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 180,
            flex: 0.95,
            sortable: false,
            filter: false,
            cellRenderer: params => customerActionMarkup(params.data)
        }
    ];
}

export function initializeCustomersGrid(gridElement, handlers = {}) {
    if (!gridElement) return customersGridApi;

    customersGridHandlers = {
        onRowClicked: handlers.onRowClicked || null
    };

    if (customersGridApi && currentCustomersGridElement !== gridElement) {
        customersGridApi.destroy();
        customersGridApi = null;
        currentCustomersGridElement = null;
    }

    if (customersGridApi) return customersGridApi;

    customersGridApi = createGrid(gridElement, {
        columnDefs: buildCustomersColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        getRowId: params => params.data.id,
        onRowClicked: params => {
            if (isCustomerGridActionClick(params.event)) return;
            customersGridHandlers.onRowClicked?.(params.data);
        },
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true,
            wrapHeaderText: true,
            autoHeaderHeight: true
        }
    });

    currentCustomersGridElement = gridElement;
    return customersGridApi;
}

export function refreshCustomersGrid(rows) {
    if (!customersGridApi) return;
    customersGridApi.setGridOption("rowData", rows);
}

export function updateCustomersGridSearch(searchTerm) {
    customersGridApi?.setGridOption("quickFilterText", searchTerm || "");
}
