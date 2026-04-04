import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

let productsGridApi = null;
let currentGridElement = null;

function getCategoryName(categoryId, categories) {
    const category = categories.find(item => item.id === categoryId);
    return category ? category.categoryName : "-";
}

function statusMarkup(isActive) {
    return `
        <span class="grid-status-cell ${isActive ? "status-active" : "status-inactive"}">
            <span class="inline-icon">${isActive ? icons.active : icons.inactive}</span>
            ${isActive ? "Active" : "Inactive"}
        </span>
    `;
}

function actionMarkup(data) {
    return `
        <div class="table-actions">
            <button class="button button-secondary product-edit-button" type="button" data-product-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
            <button
                class="button ${data.isActive ? "button-danger-soft" : "button-primary"} product-status-button"
                type="button"
                data-product-id="${data.id}"
                data-status-field="isActive"
                data-next-status="${data.isActive ? "false" : "true"}">
                <span class="button-icon">${data.isActive ? icons.inactive : icons.active}</span>
                ${data.isActive ? "Deactivate" : "Activate"}
            </button>
        </div>
    `;
}

function buildColumnDefs(categories) {
    return [
        { field: "itemId", headerName: "ID", minWidth: 140, flex: 0.9 },
        { field: "itemName", headerName: "Product", minWidth: 220, flex: 1.4 },
        {
            field: "categoryId",
            headerName: "Category",
            minWidth: 180,
            flex: 1.1,
            valueFormatter: params => getCategoryName(params.value, categories)
        },
        { field: "itemType", headerName: "Type", minWidth: 120, flex: 0.8 },
        { field: "inventoryCount", headerName: "Stock", minWidth: 110, flex: 0.7 },
        {
            field: "unitPrice",
            headerName: "Unit Price",
            minWidth: 135,
            flex: 0.9,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "sellingPrice",
            headerName: "Selling Price",
            minWidth: 150,
            flex: 1,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "isActive",
            headerName: "Status",
            minWidth: 150,
            flex: 0.95,
            cellRenderer: params => statusMarkup(Boolean(params.value))
        },
        {
            headerName: "Actions",
            minWidth: 280,
            flex: 1.6,
            sortable: false,
            filter: false,
            cellRenderer: params => actionMarkup(params.data)
        }
    ];
}

export function initializeProductsGrid(gridElement, categories) {
    if (!gridElement) return productsGridApi;

    if (productsGridApi && currentGridElement !== gridElement) {
        productsGridApi.destroy();
        productsGridApi = null;
        currentGridElement = null;
    }

    if (productsGridApi) return productsGridApi;

    productsGridApi = createGrid(gridElement, {
        columnDefs: buildColumnDefs(categories),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: {
            sortable: true,
            filter: true,
            resizable: true
        }
    });

    currentGridElement = gridElement;

    return productsGridApi;
}

export function refreshProductsGrid(rows, categories) {
    if (!productsGridApi) return;
    productsGridApi.setGridOption("columnDefs", buildColumnDefs(categories));
    productsGridApi.setGridOption("rowData", rows);
}

export function updateProductsGridSearch(searchTerm) {
    productsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}
