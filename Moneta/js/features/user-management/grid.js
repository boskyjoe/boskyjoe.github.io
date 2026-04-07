import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";

let usersGridApi = null;
let currentUsersGridElement = null;

function formatRoleLabel(value) {
    return (value || "guest")
        .split("_")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
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

function statusMarkup(isActive) {
    return `
        <span class="grid-status-cell grid-status-pill ${isActive ? "status-active" : "status-inactive"}">
            <span class="inline-icon">${isActive ? icons.active : icons.inactive}</span>
            ${isActive ? "Active" : "Inactive"}
        </span>
    `;
}

function roleMarkup(role) {
    const normalized = (role || "guest").toLowerCase().replace(/_/g, "-");
    return `<span class="user-role-pill user-role-${normalized}">${formatRoleLabel(role)}</span>`;
}

function actionMarkup(data) {
    if (data.isCurrentSessionUser) {
        return `<span class="grid-action-muted">Current session</span>`;
    }

    return `
        <div class="table-actions grid-actions-inline">
            <button class="button grid-action-button grid-action-button-secondary user-edit-button" type="button" data-user-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
            <button class="button grid-action-button ${data.isActive ? "grid-action-button-danger" : "grid-action-button-primary"} user-status-button" type="button" data-user-id="${data.id}" data-next-status="${data.isActive ? "false" : "true"}">
                <span class="button-icon">${data.isActive ? icons.inactive : icons.active}</span>
                ${data.isActive ? "Deactivate" : "Activate"}
            </button>
        </div>
    `;
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

function buildUsersColumnDefs() {
    return [
        { field: "displayNameResolved", headerName: "User", minWidth: 220, flex: 1.2 },
        { field: "emailResolved", headerName: "Email", minWidth: 240, flex: 1.35 },
        {
            field: "role",
            headerName: "Role",
            minWidth: 160,
            flex: 0.95,
            cellRenderer: params => roleMarkup(params.value)
        },
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
            valueGetter: params => params.data?.updatedOn || params.data?.createdOn || null,
            valueFormatter: params => formatDate(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 280,
            flex: 1.3,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup(params.data)
        }
    ];
}

export function initializeUsersGrid(gridElement) {
    if (!gridElement) return usersGridApi;

    if (usersGridApi && currentUsersGridElement !== gridElement) {
        usersGridApi.destroy();
        usersGridApi = null;
        currentUsersGridElement = null;
    }

    if (usersGridApi) {
        return usersGridApi;
    }

    usersGridApi = createGrid(gridElement, {
        columnDefs: buildUsersColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: buildDefaultColDef()
    });

    currentUsersGridElement = gridElement;
    return usersGridApi;
}

export function refreshUsersGrid(rows) {
    usersGridApi?.setGridOption("rowData", rows);
}

export function updateUsersGridSearch(searchTerm) {
    usersGridApi?.setGridOption("quickFilterText", searchTerm || "");
}
