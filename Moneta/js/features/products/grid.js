import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

let productsGridApi = null;
let currentGridElement = null;

const rightAlignedNumberColumn = {
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header"
};

function getCategoryName(categoryId, categories) {
    const category = categories.find(item => item.id === categoryId);
    return category ? category.categoryName : "-";
}

function statusMarkup(isActive) {
    return `
        <span class="grid-status-cell grid-status-pill ${isActive ? "status-active" : "status-inactive"}">
            <span class="inline-icon">${isActive ? icons.active : icons.inactive}</span>
            ${isActive ? "Active" : "Inactive"}
        </span>
    `;
}

function priceReviewMarkup(data = {}) {
    const requiresReview = Boolean(data?.pricingMeta?.requiresPriceReview);

    return `
        <span class="grid-status-cell grid-status-pill ${requiresReview ? "status-inactive" : "status-active"}">
            <span class="inline-icon">${requiresReview ? icons.warning : icons.active}</span>
            ${requiresReview ? "Review Needed" : "Stable"}
        </span>
    `;
}

function actionMarkup(data) {
    return `
        <div class="table-actions grid-actions-inline">
            <button class="button grid-action-button grid-action-button-secondary product-edit-button" type="button" data-product-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
            <button
                class="button grid-action-button ${data.isActive ? "grid-action-button-danger" : "grid-action-button-primary"} product-status-button"
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
        { field: "inventoryCount", headerName: "Stock", minWidth: 110, flex: 0.7, ...rightAlignedNumberColumn },
        {
            field: "unitPrice",
            headerName: "Standard Cost",
            minWidth: 145,
            flex: 0.9,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "unitMarginPercentage",
            headerName: "Target Margin %",
            minWidth: 145,
            flex: 0.9,
            ...rightAlignedNumberColumn,
            valueFormatter: params => `${Number(params.value || 0).toFixed(2)}%`
        },
        {
            field: "sellingPrice",
            headerName: "Live Selling Price",
            minWidth: 150,
            flex: 1,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "pricingMeta.recommendedSellingPrice",
            headerName: "Recommended Price",
            minWidth: 155,
            flex: 1,
            ...rightAlignedNumberColumn,
            valueGetter: params => params.data?.pricingMeta?.recommendedSellingPrice ?? params.data?.sellingPrice ?? 0,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            headerName: "Price Review",
            minWidth: 150,
            flex: 1,
            sortable: false,
            filter: false,
            cellRenderer: params => priceReviewMarkup(params.data)
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
            resizable: true,
            wrapHeaderText: true,
            autoHeaderHeight: true,
            wrapText: true,
            autoHeight: true
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
