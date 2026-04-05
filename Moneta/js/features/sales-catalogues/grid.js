import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

let availableProductsGridApi = null;
let availableProductsGridElement = null;
let catalogueItemsGridApi = null;
let catalogueItemsGridElement = null;
let existingCataloguesGridApi = null;
let existingCataloguesGridElement = null;
let itemPriceChangeHandler = null;

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

function statusMarkup(isActive) {
    return `
        <span class="grid-status-cell grid-status-pill ${isActive ? "status-active" : "status-inactive"}">
            <span class="inline-icon">${isActive ? icons.active : icons.inactive}</span>
            ${isActive ? "Active" : "Inactive"}
        </span>
    `;
}

function addProductActionMarkup(data, selectedProductIds) {
    const isAdded = selectedProductIds.has(data.id);

    if (isAdded) {
        return `<span class="grid-action-muted">Added</span>`;
    }

    return `
        <button class="button grid-action-button grid-action-button-primary sales-catalogue-add-product-button" type="button" data-product-id="${data.id}">
            <span class="button-icon">${icons.plus}</span>
            Add
        </button>
    `;
}

function removeItemActionMarkup(data) {
    return `
        <button class="button grid-action-button grid-action-button-danger sales-catalogue-remove-item-button" type="button" data-item-id="${data.id || data.tempId}">
            Remove
        </button>
    `;
}

function catalogueActionMarkup(data) {
    return `
        <div class="table-actions">
            <button class="button grid-action-button grid-action-button-secondary sales-catalogue-edit-button" type="button" data-catalogue-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
            <button class="button grid-action-button ${data.isActive ? "grid-action-button-danger" : "grid-action-button-primary"} sales-catalogue-status-button" type="button" data-catalogue-id="${data.id}" data-next-status="${data.isActive ? "false" : "true"}">
                <span class="button-icon">${data.isActive ? icons.inactive : icons.active}</span>
                ${data.isActive ? "Deactivate" : "Activate"}
            </button>
        </div>
    `;
}

function buildAvailableProductsColumnDefs(categories, selectedProductIds) {
    return [
        { field: "itemName", headerName: "Product", minWidth: 220, flex: 1.35 },
        {
            field: "categoryId",
            headerName: "Category",
            minWidth: 160,
            flex: 1,
            valueFormatter: params => categories.find(category => category.id === params.value)?.categoryName || "-"
        },
        {
            field: "inventoryCount",
            headerName: "Stock",
            minWidth: 110,
            flex: 0.7,
            ...rightAlignedNumberColumn
        },
        {
            field: "unitPrice",
            headerName: "Cost",
            minWidth: 130,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "sellingPrice",
            headerName: "Default Sell",
            minWidth: 145,
            flex: 0.9,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            headerName: "Add",
            minWidth: 120,
            flex: 0.75,
            sortable: false,
            filter: false,
            cellRenderer: params => addProductActionMarkup(params.data, selectedProductIds)
        }
    ];
}

function buildCatalogueItemsColumnDefs() {
    return [
        { field: "productName", headerName: "Product", minWidth: 220, flex: 1.3 },
        { field: "categoryName", headerName: "Category", minWidth: 150, flex: 0.9 },
        {
            field: "costPrice",
            headerName: "Cost",
            minWidth: 130,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "marginPercentage",
            headerName: "Margin %",
            minWidth: 130,
            flex: 0.75,
            ...rightAlignedNumberColumn,
            valueFormatter: params => `${Number(params.value || 0).toFixed(2)}%`
        },
        {
            field: "sellingPrice",
            headerName: "Selling Price",
            minWidth: 145,
            flex: 0.9,
            editable: true,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0),
            valueParser: params => {
                const parsed = Number(String(params.newValue || "").replace(/[^0-9.-]/g, ""));
                return Number.isFinite(parsed) ? parsed : params.oldValue;
            }
        },
        {
            field: "isOverridden",
            headerName: "Source",
            minWidth: 120,
            flex: 0.7,
            valueFormatter: params => params.value ? "Custom" : "Default"
        },
        {
            headerName: "Remove",
            minWidth: 120,
            flex: 0.75,
            sortable: false,
            filter: false,
            cellRenderer: params => removeItemActionMarkup(params.data)
        }
    ];
}

function buildExistingCataloguesColumnDefs() {
    return [
        { field: "catalogueId", headerName: "Catalogue ID", minWidth: 150, flex: 0.9 },
        { field: "catalogueName", headerName: "Catalogue", minWidth: 220, flex: 1.25 },
        { field: "seasonName", headerName: "Season", minWidth: 180, flex: 1 },
        {
            field: "isActive",
            headerName: "Status",
            minWidth: 150,
            flex: 0.8,
            cellRenderer: params => statusMarkup(Boolean(params.value))
        },
        {
            headerName: "Updated",
            minWidth: 145,
            flex: 0.9,
            valueGetter: params => params.data?.audit?.updatedOn || params.data?.audit?.createdOn,
            valueFormatter: params => formatDate(params.value)
        },
        {
            headerName: "Actions",
            minWidth: 280,
            flex: 1.3,
            sortable: false,
            filter: false,
            cellRenderer: params => catalogueActionMarkup(params.data)
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

export function initializeAvailableProductsGrid(gridElement, categories, selectedProductIds) {
    if (!gridElement) return availableProductsGridApi;

    if (availableProductsGridApi && availableProductsGridElement !== gridElement) {
        availableProductsGridApi.destroy();
        availableProductsGridApi = null;
        availableProductsGridElement = null;
    }

    if (availableProductsGridApi) return availableProductsGridApi;

    availableProductsGridApi = createGrid(gridElement, {
        columnDefs: buildAvailableProductsColumnDefs(categories, selectedProductIds),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: buildDefaultColDef()
    });

    availableProductsGridElement = gridElement;
    return availableProductsGridApi;
}

export function refreshAvailableProductsGrid(rows, categories, selectedProductIds) {
    if (!availableProductsGridApi) return;
    availableProductsGridApi.setGridOption("columnDefs", buildAvailableProductsColumnDefs(categories, selectedProductIds));
    availableProductsGridApi.setGridOption("rowData", rows);
}

export function updateAvailableProductsGridSearch(searchTerm) {
    availableProductsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializeCatalogueItemsGrid(gridElement, onPriceChange) {
    if (!gridElement) return catalogueItemsGridApi;

    if (catalogueItemsGridApi && catalogueItemsGridElement !== gridElement) {
        catalogueItemsGridApi.destroy();
        catalogueItemsGridApi = null;
        catalogueItemsGridElement = null;
    }

    itemPriceChangeHandler = onPriceChange || null;

    if (catalogueItemsGridApi) return catalogueItemsGridApi;

    catalogueItemsGridApi = createGrid(gridElement, {
        columnDefs: buildCatalogueItemsColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: buildDefaultColDef(),
        getRowId: params => params.data?.id || params.data?.tempId || params.data?.productId,
        onCellValueChanged: params => {
            if (params.colDef.field !== "sellingPrice" || params.oldValue === params.newValue) {
                return;
            }

            itemPriceChangeHandler?.(params);
        }
    });

    catalogueItemsGridElement = gridElement;
    return catalogueItemsGridApi;
}

export function refreshCatalogueItemsGrid(rows) {
    if (!catalogueItemsGridApi) return;
    catalogueItemsGridApi.setGridOption("rowData", rows);
}

export function updateCatalogueItemsGridSearch(searchTerm) {
    catalogueItemsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializeExistingCataloguesGrid(gridElement) {
    if (!gridElement) return existingCataloguesGridApi;

    if (existingCataloguesGridApi && existingCataloguesGridElement !== gridElement) {
        existingCataloguesGridApi.destroy();
        existingCataloguesGridApi = null;
        existingCataloguesGridElement = null;
    }

    if (existingCataloguesGridApi) return existingCataloguesGridApi;

    existingCataloguesGridApi = createGrid(gridElement, {
        columnDefs: buildExistingCataloguesColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: buildDefaultColDef()
    });

    existingCataloguesGridElement = gridElement;
    return existingCataloguesGridApi;
}

export function refreshExistingCataloguesGrid(rows) {
    if (!existingCataloguesGridApi) return;
    existingCataloguesGridApi.setGridOption("rowData", rows);
}

export function updateExistingCataloguesGridSearch(searchTerm) {
    existingCataloguesGridApi?.setGridOption("quickFilterText", searchTerm || "");
}
