import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

let purchasesGridApi = null;
let currentPurchasesGridElement = null;
let purchaseLineItemsGridApi = null;
let currentPurchaseLineItemsGridElement = null;
let purchasePaymentHistoryGridApi = null;
let currentPurchasePaymentHistoryGridElement = null;

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

function paymentStatusMarkup(value) {
    const status = value || "Unpaid";
    const normalized = status.toLowerCase().replace(/\s+/g, "-");

    return `<span class="purchase-status-pill purchase-status-${normalized}">${status}</span>`;
}

function invoiceActionMarkup(data) {
    return `
        <div class="table-actions">
            <button class="button grid-action-button grid-action-button-primary purchase-payments-button" type="button" data-invoice-id="${data.id}">
                <span class="button-icon">${icons.payment}</span>
                Payments
            </button>
            <button class="button grid-action-button grid-action-button-secondary purchase-edit-button" type="button" data-invoice-id="${data.id}">
                <span class="button-icon">${icons.edit}</span>
                Edit
            </button>
        </div>
    `;
}

function paymentHistoryActionMarkup(data) {
    const paymentStatus = data?.paymentStatus || data?.status || "Verified";
    const isVoidable = !data?.isReversalEntry && paymentStatus !== "Voided" && (Number(data?.amountPaid) || 0) > 0;

    if (!isVoidable) {
        return `<span class="grid-action-muted">-</span>`;
    }

    return `
        <button class="button grid-action-button grid-action-button-danger purchase-payment-void-button" type="button" data-payment-id="${data.id}">
            Void
        </button>
    `;
}

function buildInvoiceColumnDefs() {
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
            ...rightAlignedNumberColumn,
            valueGetter: params => params.data?.lineItems?.length || 0
        },
        {
            field: "invoiceTotal",
            headerName: "Total",
            minWidth: 140,
            flex: 0.9,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "amountPaid",
            headerName: "Paid",
            minWidth: 140,
            flex: 0.9,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "balanceDue",
            headerName: "Balance",
            minWidth: 140,
            flex: 0.9,
            ...rightAlignedNumberColumn,
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
            cellRenderer: params => invoiceActionMarkup(params.data)
        }
    ];
}

function buildPaymentHistoryColumnDefs() {
    return [
        {
            field: "paymentDate",
            headerName: "Date",
            minWidth: 130,
            flex: 0.85,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "amountPaid",
            headerName: "Amount",
            minWidth: 130,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "paymentMode",
            headerName: "Mode",
            minWidth: 140,
            flex: 0.9
        },
        {
            field: "transactionRef",
            headerName: "Reference",
            minWidth: 170,
            flex: 1.05,
            valueFormatter: params => params.value || "-"
        },
        {
            field: "paymentStatus",
            headerName: "Status",
            minWidth: 140,
            flex: 0.85,
            cellRenderer: params => paymentStatusMarkup(params.value || params.data?.status || "Verified")
        },
        {
            field: "recordedBy",
            headerName: "Recorded By",
            minWidth: 190,
            flex: 1.05,
            valueGetter: params => params.data?.recordedBy || params.data?.audit?.createdBy || "-"
        },
        {
            headerName: "Actions",
            minWidth: 120,
            flex: 0.75,
            sortable: false,
            filter: false,
            cellRenderer: params => paymentHistoryActionMarkup(params.data)
        }
    ];
}

function normalizeNumber(value, decimals = 2) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
    }

    return Number(parsed.toFixed(decimals));
}

function buildNumberSetter(field, decimals = 2) {
    return params => {
        const normalized = normalizeNumber(params.newValue, decimals);
        const changed = params.data[field] !== normalized;

        params.data[field] = normalized;
        return changed;
    };
}

function discountTypeSetter(params) {
    const nextValue = params.newValue === "Percentage" ? "Percentage" : "Fixed";
    const changed = params.data.discountType !== nextValue;

    params.data.discountType = nextValue;
    return changed;
}

function getLineItemTotal(row) {
    const quantity = normalizeNumber(row.quantity, 0);
    const unitPurchasePrice = normalizeNumber(row.unitPurchasePrice, 2);
    const discountValue = normalizeNumber(row.discountValue, 2);
    const taxPercentage = normalizeNumber(row.taxPercentage, 2);
    const grossPrice = quantity * unitPurchasePrice;
    const discountAmount = row.discountType === "Percentage"
        ? grossPrice * (discountValue / 100)
        : discountValue;
    const netPrice = Math.max(grossPrice - discountAmount, 0);
    const taxAmount = netPrice * (taxPercentage / 100);

    return Number((netPrice + taxAmount).toFixed(2));
}

function lineItemStatusMarkup(quantity) {
    return quantity > 0
        ? `<span class="purchase-status-pill purchase-status-paid">Active</span>`
        : `<span class="purchase-status-pill purchase-status-unpaid">Idle</span>`;
}

function buildLineItemColumnDefs(onRowsChanged) {
    return [
        {
            field: "quantity",
            headerName: "Qty",
            minWidth: 95,
            maxWidth: 110,
            ...rightAlignedNumberColumn,
            editable: true,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("quantity", 0)
        },
        {
            field: "productName",
            headerName: "Product",
            minWidth: 240,
            flex: 1.5
        },
        {
            field: "inventoryCount",
            headerName: "Stock",
            minWidth: 100,
            maxWidth: 120,
            flex: 0.7,
            ...rightAlignedNumberColumn
        },
        {
            field: "unitPurchasePrice",
            headerName: "Unit Price",
            minWidth: 135,
            flex: 0.9,
            ...rightAlignedNumberColumn,
            editable: true,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("unitPurchasePrice", 2),
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "discountType",
            headerName: "Discount Type",
            minWidth: 150,
            flex: 0.95,
            editable: true,
            cellEditor: "agSelectCellEditor",
            cellEditorParams: { values: ["Percentage", "Fixed"] },
            valueSetter: discountTypeSetter
        },
        {
            field: "discountValue",
            headerName: "Discount",
            minWidth: 120,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            editable: true,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("discountValue", 2)
        },
        {
            field: "taxPercentage",
            headerName: "Tax %",
            minWidth: 110,
            flex: 0.75,
            ...rightAlignedNumberColumn,
            editable: true,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("taxPercentage", 2)
        },
        {
            headerName: "Line Total",
            minWidth: 150,
            flex: 0.95,
            ...rightAlignedNumberColumn,
            valueGetter: params => getLineItemTotal(params.data || {}),
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            headerName: "Status",
            minWidth: 120,
            flex: 0.8,
            sortable: false,
            filter: false,
            valueGetter: params => Number(params.data?.quantity) || 0,
            cellRenderer: params => lineItemStatusMarkup(Number(params.value) || 0)
        }
    ];
}

export function initializePurchasesGrid(gridElement, onFilteredCountChange) {
    if (!gridElement) return purchasesGridApi;

    if (purchasesGridApi && currentPurchasesGridElement !== gridElement) {
        purchasesGridApi.destroy();
        purchasesGridApi = null;
        currentPurchasesGridElement = null;
    }

    if (purchasesGridApi) return purchasesGridApi;

    purchasesGridApi = createGrid(gridElement, {
        columnDefs: buildInvoiceColumnDefs(),
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
        },
        onModelUpdated: event => {
            onFilteredCountChange?.(event.api.getDisplayedRowCount());
        }
    });

    currentPurchasesGridElement = gridElement;
    return purchasesGridApi;
}

export function refreshPurchasesGrid(rows) {
    if (!purchasesGridApi) return;
    purchasesGridApi.setGridOption("rowData", rows);
}

export function updatePurchasesGridSearch(searchTerm) {
    purchasesGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializePurchaseLineItemsGrid(gridElement, onRowsChanged) {
    if (!gridElement) return purchaseLineItemsGridApi;

    if (purchaseLineItemsGridApi && currentPurchaseLineItemsGridElement !== gridElement) {
        purchaseLineItemsGridApi.destroy();
        purchaseLineItemsGridApi = null;
        currentPurchaseLineItemsGridElement = null;
    }

    if (purchaseLineItemsGridApi) return purchaseLineItemsGridApi;

    purchaseLineItemsGridApi = createGrid(gridElement, {
        columnDefs: buildLineItemColumnDefs(onRowsChanged),
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
        },
        getRowId: params => params.data.masterProductId,
        singleClickEdit: true,
        stopEditingWhenCellsLoseFocus: true,
        rowClassRules: {
            "purchase-line-item-active": params => (Number(params.data?.quantity) || 0) > 0
        },
        onCellValueChanged: params => {
            params.api.refreshCells({ rowNodes: [params.node], force: true });
            onRowsChanged?.();
        }
    });

    currentPurchaseLineItemsGridElement = gridElement;
    return purchaseLineItemsGridApi;
}

export function refreshPurchaseLineItemsGrid(rows) {
    if (!purchaseLineItemsGridApi) return;
    purchaseLineItemsGridApi.setGridOption("rowData", rows);
}

export function updatePurchaseLineItemsGridSearch(searchTerm) {
    purchaseLineItemsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function getPurchaseLineItemsGridRows() {
    if (!purchaseLineItemsGridApi) return [];

    const rows = [];
    purchaseLineItemsGridApi.forEachNode(node => {
        rows.push(node.data);
    });

    return rows;
}

export function initializePurchasePaymentHistoryGrid(gridElement) {
    if (!gridElement) return purchasePaymentHistoryGridApi;

    if (purchasePaymentHistoryGridApi && currentPurchasePaymentHistoryGridElement !== gridElement) {
        purchasePaymentHistoryGridApi.destroy();
        purchasePaymentHistoryGridApi = null;
        currentPurchasePaymentHistoryGridElement = null;
    }

    if (purchasePaymentHistoryGridApi) return purchasePaymentHistoryGridApi;

    purchasePaymentHistoryGridApi = createGrid(gridElement, {
        columnDefs: buildPaymentHistoryColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 10,
        paginationPageSizeSelector: [10, 25, 50],
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

    currentPurchasePaymentHistoryGridElement = gridElement;
    return purchasePaymentHistoryGridApi;
}

export function refreshPurchasePaymentHistoryGrid(rows) {
    if (!purchasePaymentHistoryGridApi) return;
    purchasePaymentHistoryGridApi.setGridOption("rowData", rows);
}
