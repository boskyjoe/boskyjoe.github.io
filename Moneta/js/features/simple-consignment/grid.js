import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

let simpleConsignmentOrdersGridApi = null;
let simpleConsignmentOrdersGridElement = null;
let simpleConsignmentWorksheetGridApi = null;
let simpleConsignmentWorksheetGridElement = null;
let simpleConsignmentTransactionsGridApi = null;
let simpleConsignmentTransactionsGridElement = null;
let worksheetMode = "checkout";
let worksheetReadOnly = false;
let transactionsVoidEnabled = false;

const rightAlignedNumberColumn = {
    cellClass: "ag-right-aligned-cell",
    headerClass: "ag-right-aligned-header"
};

function normalizeText(value) {
    return (value || "").trim();
}

function buildDisabledActionAttrs(disabled, reason) {
    if (!disabled) return "";

    const safeReason = String(reason || "This action is currently unavailable.")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    return `disabled title="${safeReason}"`;
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

function statusMarkup(value = "Active") {
    const normalized = normalizeText(value).toLowerCase();
    if (normalized === "settled") {
        return `<span class="purchase-status-pill purchase-status-paid">Settled</span>`;
    }

    if (normalized === "voided") {
        return `<span class="purchase-status-pill purchase-status-voided">Voided</span>`;
    }

    return `<span class="purchase-status-pill purchase-status-recorded">Active</span>`;
}

function transactionStatusMarkup(value = "Verified") {
    const normalized = normalizeText(value).toLowerCase();

    if (normalized === "voided") {
        return `<span class="purchase-status-pill purchase-status-unpaid">Voided</span>`;
    }

    if (normalized === "reversal") {
        return `<span class="purchase-status-pill purchase-status-void-reversal">Reversal</span>`;
    }

    return `<span class="purchase-status-pill purchase-status-recorded">Verified</span>`;
}

function transactionTypeMarkup(value = "Payment") {
    const normalized = normalizeText(value).toLowerCase();
    if (normalized === "expense") {
        return `<span class="purchase-status-pill purchase-status-partially-paid">Expense</span>`;
    }

    return `<span class="purchase-status-pill purchase-status-paid">Payment</span>`;
}

function requestStateMarkup(quantity) {
    return quantity > 0
        ? `<span class="purchase-status-pill purchase-status-paid">Included</span>`
        : `<span class="purchase-status-pill purchase-status-unpaid">Not Included</span>`;
}

function buildCheckoutQuantitySetter() {
    return params => {
        const parsed = Number(params.newValue);
        const available = Math.max(0, Math.floor(Number(params.data?.inventoryCount) || 0));
        const normalized = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
        const bounded = Math.min(normalized, available);
        const previous = Number(params.data?.quantityCheckedOut || 0);

        params.data.quantityCheckedOut = bounded;
        return previous !== bounded;
    };
}

function buildSettlementQuantitySetter(field) {
    return params => {
        const parsed = Number(params.newValue);
        const normalized = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
        const checkedOut = Math.max(0, Math.floor(Number(params.data?.quantityCheckedOut) || 0));
        const quantitySold = field === "quantitySold"
            ? normalized
            : Math.max(0, Math.floor(Number(params.data?.quantitySold) || 0));
        const quantityReturned = field === "quantityReturned"
            ? normalized
            : Math.max(0, Math.floor(Number(params.data?.quantityReturned) || 0));
        const quantityDamaged = field === "quantityDamaged"
            ? normalized
            : Math.max(0, Math.floor(Number(params.data?.quantityDamaged) || 0));
        const quantityGifted = field === "quantityGifted"
            ? normalized
            : Math.max(0, Math.floor(Number(params.data?.quantityGifted) || 0));

        const accounted = quantitySold + quantityReturned + quantityDamaged + quantityGifted;
        if (accounted > checkedOut) {
            return false;
        }

        const previous = Number(params.data?.[field] || 0);
        params.data[field] = normalized;
        return previous !== normalized;
    };
}

function buildOrdersActionMarkup(data) {
    const status = normalizeText(data?.status || "Active");
    const isSettled = status === "Settled";
    const label = isSettled ? "View" : "Open";
    const icon = isSettled ? icons.search : icons.edit;

    return `
        <button class="button grid-action-button grid-action-button-secondary simple-consignment-open-button" type="button" data-order-id="${data.id}">
            <span class="button-icon">${icon}</span>
            ${label}
        </button>
    `;
}

function buildTransactionActionMarkup(data) {
    const status = normalizeText(data?.status || "Verified");
    const isVoidable = !data?.isReversalEntry && status !== "Voided" && status !== "Reversal";
    if (!isVoidable) {
        return `<span class="grid-action-muted">-</span>`;
    }

    const disabledAttrs = buildDisabledActionAttrs(
        !transactionsVoidEnabled,
        "Open this order in active settlement mode to void transactions."
    );

    return `
        <button class="button grid-action-button grid-action-button-danger simple-consignment-void-transaction-button" type="button" data-transaction-id="${data.id}" ${disabledAttrs}>
            Void
        </button>
    `;
}

function buildOrdersColumnDefs() {
    return [
        { field: "consignmentId", headerName: "Order ID", minWidth: 170, flex: 0.95 },
        {
            field: "checkoutDate",
            headerName: "Checkout Date",
            minWidth: 140,
            flex: 0.8,
            valueFormatter: params => formatDate(params.value)
        },
        { field: "manualVoucherNumber", headerName: "Voucher #", minWidth: 160, flex: 0.9 },
        { field: "teamName", headerName: "Team", minWidth: 170, flex: 1 },
        { field: "teamMemberName", headerName: "Member", minWidth: 170, flex: 1 },
        {
            field: "status",
            headerName: "Status",
            minWidth: 130,
            flex: 0.75,
            cellRenderer: params => (params.node?.rowPinned ? "" : statusMarkup(params.value || "Active"))
        },
        {
            field: "lineItemCount",
            headerName: "Products",
            minWidth: 110,
            flex: 0.65,
            ...rightAlignedNumberColumn
        },
        {
            field: "totalValueCheckedOut",
            headerName: "Checked Out",
            minWidth: 145,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "totalValueSold",
            headerName: "Sold Value",
            minWidth: 145,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "totalAmountPaid",
            headerName: "Paid",
            minWidth: 120,
            flex: 0.75,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "totalExpenses",
            headerName: "Expenses",
            minWidth: 125,
            flex: 0.75,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "balanceDue",
            headerName: "Balance Due",
            minWidth: 140,
            flex: 0.82,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "totalOnHandQuantity",
            headerName: "On Hand",
            minWidth: 110,
            flex: 0.68,
            ...rightAlignedNumberColumn
        },
        {
            headerName: "Actions",
            minWidth: 140,
            flex: 0.74,
            sortable: false,
            filter: false,
            cellRenderer: params => (params.node?.rowPinned ? "" : buildOrdersActionMarkup(params.data))
        }
    ];
}

function buildCheckoutWorksheetColumnDefs() {
    return [
        {
            field: "quantityCheckedOut",
            headerName: "Qty Out",
            minWidth: 110,
            flex: 0.68,
            editable: params => !worksheetReadOnly && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildCheckoutQuantitySetter(),
            ...rightAlignedNumberColumn
        },
        { field: "productName", headerName: "Product", minWidth: 230, flex: 1.2 },
        { field: "categoryName", headerName: "Category", minWidth: 145, flex: 0.8 },
        {
            field: "inventoryCount",
            headerName: "Store Stock",
            minWidth: 120,
            flex: 0.7,
            ...rightAlignedNumberColumn
        },
        {
            field: "sellingPrice",
            headerName: "Selling Price",
            minWidth: 140,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => (params.node?.rowPinned ? "" : formatCurrency(params.value || 0))
        },
        {
            headerName: "Value Out",
            minWidth: 135,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueGetter: params => {
                if (params.node?.rowPinned) return params.data?.valueOut || 0;
                return (Number(params.data?.quantityCheckedOut) || 0) * (Number(params.data?.sellingPrice) || 0);
            },
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            headerName: "Request State",
            minWidth: 130,
            flex: 0.8,
            sortable: false,
            filter: false,
            valueGetter: params => Number(params.data?.quantityCheckedOut) || 0,
            cellRenderer: params => (params.node?.rowPinned ? "" : requestStateMarkup(Number(params.value) || 0))
        }
    ];
}

function buildSettlementWorksheetColumnDefs() {
    return [
        { field: "productName", headerName: "Product", minWidth: 230, flex: 1.15 },
        {
            field: "quantityCheckedOut",
            headerName: "Qty Out",
            minWidth: 110,
            flex: 0.65,
            ...rightAlignedNumberColumn
        },
        {
            field: "quantitySold",
            headerName: "Qty Sold",
            minWidth: 110,
            flex: 0.65,
            editable: params => !worksheetReadOnly && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildSettlementQuantitySetter("quantitySold"),
            ...rightAlignedNumberColumn
        },
        {
            field: "quantityReturned",
            headerName: "Qty Returned",
            minWidth: 125,
            flex: 0.7,
            editable: params => !worksheetReadOnly && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildSettlementQuantitySetter("quantityReturned"),
            ...rightAlignedNumberColumn
        },
        {
            field: "quantityDamaged",
            headerName: "Qty Damaged",
            minWidth: 125,
            flex: 0.72,
            editable: params => !worksheetReadOnly && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildSettlementQuantitySetter("quantityDamaged"),
            ...rightAlignedNumberColumn
        },
        {
            field: "quantityGifted",
            headerName: "Qty Gifted",
            minWidth: 120,
            flex: 0.7,
            editable: params => !worksheetReadOnly && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildSettlementQuantitySetter("quantityGifted"),
            ...rightAlignedNumberColumn
        },
        {
            headerName: "On Hand",
            minWidth: 110,
            flex: 0.66,
            ...rightAlignedNumberColumn,
            valueGetter: params => {
                if (params.node?.rowPinned) return params.data?.onHand || 0;
                const quantityCheckedOut = Number(params.data?.quantityCheckedOut) || 0;
                const quantitySold = Number(params.data?.quantitySold) || 0;
                const quantityReturned = Number(params.data?.quantityReturned) || 0;
                const quantityDamaged = Number(params.data?.quantityDamaged) || 0;
                const quantityGifted = Number(params.data?.quantityGifted) || 0;
                return quantityCheckedOut - (quantitySold + quantityReturned + quantityDamaged + quantityGifted);
            }
        },
        {
            field: "sellingPrice",
            headerName: "Price",
            minWidth: 120,
            flex: 0.72,
            ...rightAlignedNumberColumn,
            valueFormatter: params => (params.node?.rowPinned ? "" : formatCurrency(params.value || 0))
        },
        {
            headerName: "Sold Value",
            minWidth: 130,
            flex: 0.75,
            ...rightAlignedNumberColumn,
            valueGetter: params => {
                if (params.node?.rowPinned) return params.data?.valueSold || 0;
                return (Number(params.data?.quantitySold) || 0) * (Number(params.data?.sellingPrice) || 0);
            },
            valueFormatter: params => formatCurrency(params.value || 0)
        }
    ];
}

function buildTransactionsColumnDefs() {
    return [
        {
            field: "transactionDate",
            headerName: "Date",
            minWidth: 130,
            flex: 0.75,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "paymentType",
            headerName: "Type",
            minWidth: 120,
            flex: 0.7,
            cellRenderer: params => (params.node?.rowPinned ? "" : transactionTypeMarkup(params.value || "Payment"))
        },
        {
            field: "amountApplied",
            headerName: "Amount",
            minWidth: 130,
            flex: 0.74,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "paymentMode",
            headerName: "Mode",
            minWidth: 130,
            flex: 0.76,
            valueFormatter: params => params.value || "-"
        },
        {
            field: "reference",
            headerName: "Reference",
            minWidth: 160,
            flex: 1,
            valueFormatter: params => params.value || "-"
        },
        {
            field: "status",
            headerName: "Status",
            minWidth: 140,
            flex: 0.8,
            cellRenderer: params => (params.node?.rowPinned ? "" : transactionStatusMarkup(params.value || "Verified"))
        },
        {
            field: "createdBy",
            headerName: "Recorded By",
            minWidth: 180,
            flex: 0.95,
            valueFormatter: params => params.value || "-"
        },
        {
            headerName: "Action",
            minWidth: 120,
            flex: 0.66,
            sortable: false,
            filter: false,
            cellRenderer: params => (params.node?.rowPinned ? "" : buildTransactionActionMarkup(params.data))
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

function getVisibleRows(api) {
    const rows = [];

    api?.forEachNodeAfterFilterAndSort(node => {
        if (!node.rowPinned) {
            rows.push(node.data);
        }
    });

    return rows;
}

function buildOrdersPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totals = rows.reduce((summary, row) => {
        summary.lineItemCount += Number(row?.lineItemCount) || 0;
        summary.totalValueCheckedOut += Number(row?.totalValueCheckedOut) || 0;
        summary.totalValueSold += Number(row?.totalValueSold) || 0;
        summary.totalAmountPaid += Number(row?.totalAmountPaid) || 0;
        summary.totalExpenses += Number(row?.totalExpenses) || 0;
        summary.balanceDue += Number(row?.balanceDue) || 0;
        summary.totalOnHandQuantity += Number(row?.totalOnHandQuantity) || 0;
        return summary;
    }, {
        lineItemCount: 0,
        totalValueCheckedOut: 0,
        totalValueSold: 0,
        totalAmountPaid: 0,
        totalExpenses: 0,
        balanceDue: 0,
        totalOnHandQuantity: 0
    });

    return [{
        consignmentId: "Totals",
        lineItemCount: totals.lineItemCount,
        totalValueCheckedOut: Number(totals.totalValueCheckedOut.toFixed(2)),
        totalValueSold: Number(totals.totalValueSold.toFixed(2)),
        totalAmountPaid: Number(totals.totalAmountPaid.toFixed(2)),
        totalExpenses: Number(totals.totalExpenses.toFixed(2)),
        balanceDue: Number(totals.balanceDue.toFixed(2)),
        totalOnHandQuantity: totals.totalOnHandQuantity
    }];
}

function buildCheckoutWorksheetPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totals = rows.reduce((summary, row) => {
        const quantityCheckedOut = Number(row?.quantityCheckedOut) || 0;
        const valueOut = quantityCheckedOut * (Number(row?.sellingPrice) || 0);
        summary.quantityCheckedOut += quantityCheckedOut;
        summary.valueOut += valueOut;
        return summary;
    }, {
        quantityCheckedOut: 0,
        valueOut: 0
    });

    return [{
        productName: "Totals",
        quantityCheckedOut: totals.quantityCheckedOut,
        valueOut: Number(totals.valueOut.toFixed(2))
    }];
}

function buildSettlementWorksheetPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totals = rows.reduce((summary, row) => {
        const quantityCheckedOut = Number(row?.quantityCheckedOut) || 0;
        const quantitySold = Number(row?.quantitySold) || 0;
        const quantityReturned = Number(row?.quantityReturned) || 0;
        const quantityDamaged = Number(row?.quantityDamaged) || 0;
        const quantityGifted = Number(row?.quantityGifted) || 0;
        const onHand = quantityCheckedOut - (quantitySold + quantityReturned + quantityDamaged + quantityGifted);
        const valueSold = quantitySold * (Number(row?.sellingPrice) || 0);

        summary.quantityCheckedOut += quantityCheckedOut;
        summary.quantitySold += quantitySold;
        summary.quantityReturned += quantityReturned;
        summary.quantityDamaged += quantityDamaged;
        summary.quantityGifted += quantityGifted;
        summary.onHand += onHand;
        summary.valueSold += valueSold;
        return summary;
    }, {
        quantityCheckedOut: 0,
        quantitySold: 0,
        quantityReturned: 0,
        quantityDamaged: 0,
        quantityGifted: 0,
        onHand: 0,
        valueSold: 0
    });

    return [{
        productName: "Totals",
        quantityCheckedOut: totals.quantityCheckedOut,
        quantitySold: totals.quantitySold,
        quantityReturned: totals.quantityReturned,
        quantityDamaged: totals.quantityDamaged,
        quantityGifted: totals.quantityGifted,
        onHand: totals.onHand,
        valueSold: Number(totals.valueSold.toFixed(2))
    }];
}

function buildTransactionsPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totals = rows.reduce((summary, row) => {
        const amount = Number(row?.amountApplied) || 0;
        summary.amountApplied += amount;
        return summary;
    }, {
        amountApplied: 0
    });

    return [{
        paymentMode: "Totals",
        amountApplied: Number(totals.amountApplied.toFixed(2))
    }];
}

function refreshOrdersPinnedBottomRow(api) {
    api?.setGridOption("pinnedBottomRowData", buildOrdersPinnedBottomRow(getVisibleRows(api)));
}

function refreshWorksheetPinnedBottomRow(api) {
    if (!api) return;

    const rows = getVisibleRows(api);
    const pinnedRows = worksheetMode === "settlement"
        ? buildSettlementWorksheetPinnedBottomRow(rows)
        : buildCheckoutWorksheetPinnedBottomRow(rows);

    api.setGridOption("pinnedBottomRowData", pinnedRows);
}

function refreshTransactionsPinnedBottomRow(api) {
    api?.setGridOption("pinnedBottomRowData", buildTransactionsPinnedBottomRow(getVisibleRows(api)));
}

function getWorksheetColumnDefs() {
    return worksheetMode === "settlement"
        ? buildSettlementWorksheetColumnDefs()
        : buildCheckoutWorksheetColumnDefs();
}

export function initializeSimpleConsignmentOrdersGrid(gridElement, onFilteredCountChange) {
    if (!gridElement) return simpleConsignmentOrdersGridApi;

    if (simpleConsignmentOrdersGridApi && simpleConsignmentOrdersGridElement !== gridElement) {
        simpleConsignmentOrdersGridApi.destroy();
        simpleConsignmentOrdersGridApi = null;
        simpleConsignmentOrdersGridElement = null;
    }

    if (simpleConsignmentOrdersGridApi) return simpleConsignmentOrdersGridApi;

    simpleConsignmentOrdersGridApi = createGrid(gridElement, {
        columnDefs: buildOrdersColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: buildDefaultColDef(),
        onFilterChanged: () => {
            refreshOrdersPinnedBottomRow(simpleConsignmentOrdersGridApi);

            let count = 0;
            simpleConsignmentOrdersGridApi.forEachNodeAfterFilter(node => {
                if (!node.rowPinned) {
                    count += 1;
                }
            });

            onFilteredCountChange?.(count);
        }
    });

    simpleConsignmentOrdersGridElement = gridElement;
    return simpleConsignmentOrdersGridApi;
}

export function refreshSimpleConsignmentOrdersGrid(rows) {
    if (!simpleConsignmentOrdersGridApi) return;

    simpleConsignmentOrdersGridApi.setGridOption("rowData", rows || []);
    refreshOrdersPinnedBottomRow(simpleConsignmentOrdersGridApi);
}

export function updateSimpleConsignmentOrdersGridSearch(searchTerm) {
    simpleConsignmentOrdersGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializeSimpleConsignmentWorksheetGrid(gridElement, onRowsChanged) {
    if (!gridElement) return simpleConsignmentWorksheetGridApi;

    if (simpleConsignmentWorksheetGridApi && simpleConsignmentWorksheetGridElement !== gridElement) {
        simpleConsignmentWorksheetGridApi.destroy();
        simpleConsignmentWorksheetGridApi = null;
        simpleConsignmentWorksheetGridElement = null;
    }

    if (simpleConsignmentWorksheetGridApi) return simpleConsignmentWorksheetGridApi;

    simpleConsignmentWorksheetGridApi = createGrid(gridElement, {
        columnDefs: getWorksheetColumnDefs(),
        rowData: [],
        defaultColDef: buildDefaultColDef(),
        onCellValueChanged: params => {
            params.api.refreshCells({ rowNodes: [params.node], force: true });
            refreshWorksheetPinnedBottomRow(simpleConsignmentWorksheetGridApi);
            onRowsChanged?.(getSimpleConsignmentWorksheetRows());
        },
        onFilterChanged: () => refreshWorksheetPinnedBottomRow(simpleConsignmentWorksheetGridApi),
        rowClassRules: {
            "purchase-line-item-active": params => (Number(params.data?.quantityCheckedOut) || 0) > 0
        }
    });

    simpleConsignmentWorksheetGridElement = gridElement;
    return simpleConsignmentWorksheetGridApi;
}

export function setSimpleConsignmentWorksheetMode(mode = "checkout") {
    const normalizedMode = mode === "settlement" ? "settlement" : "checkout";
    if (worksheetMode === normalizedMode) return;

    worksheetMode = normalizedMode;
    if (simpleConsignmentWorksheetGridApi) {
        simpleConsignmentWorksheetGridApi.setGridOption("columnDefs", getWorksheetColumnDefs());
        simpleConsignmentWorksheetGridApi.refreshHeader();
        simpleConsignmentWorksheetGridApi.refreshCells({ force: true });
        refreshWorksheetPinnedBottomRow(simpleConsignmentWorksheetGridApi);
    }
}

export function setSimpleConsignmentWorksheetReadOnly(isReadOnly) {
    worksheetReadOnly = Boolean(isReadOnly);
    if (simpleConsignmentWorksheetGridApi) {
        simpleConsignmentWorksheetGridApi.setGridOption("suppressCellFocus", worksheetReadOnly);
        simpleConsignmentWorksheetGridApi.refreshCells({ force: true });
    }
}

export function refreshSimpleConsignmentWorksheetGrid(rows) {
    if (!simpleConsignmentWorksheetGridApi) return;

    simpleConsignmentWorksheetGridApi.setGridOption("rowData", rows || []);
    refreshWorksheetPinnedBottomRow(simpleConsignmentWorksheetGridApi);
}

export function updateSimpleConsignmentWorksheetGridSearch(searchTerm) {
    simpleConsignmentWorksheetGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function getSimpleConsignmentWorksheetRows() {
    if (!simpleConsignmentWorksheetGridApi) return [];

    const rows = [];
    simpleConsignmentWorksheetGridApi.forEachNode(node => {
        if (!node.rowPinned) {
            rows.push(node.data);
        }
    });

    return rows;
}

export function initializeSimpleConsignmentTransactionsGrid(gridElement) {
    if (!gridElement) return simpleConsignmentTransactionsGridApi;

    if (simpleConsignmentTransactionsGridApi && simpleConsignmentTransactionsGridElement !== gridElement) {
        simpleConsignmentTransactionsGridApi.destroy();
        simpleConsignmentTransactionsGridApi = null;
        simpleConsignmentTransactionsGridElement = null;
    }

    if (simpleConsignmentTransactionsGridApi) return simpleConsignmentTransactionsGridApi;

    simpleConsignmentTransactionsGridApi = createGrid(gridElement, {
        columnDefs: buildTransactionsColumnDefs(),
        rowData: [],
        defaultColDef: buildDefaultColDef(),
        onFilterChanged: () => refreshTransactionsPinnedBottomRow(simpleConsignmentTransactionsGridApi)
    });

    simpleConsignmentTransactionsGridElement = gridElement;
    return simpleConsignmentTransactionsGridApi;
}

export function refreshSimpleConsignmentTransactionsGrid(rows) {
    if (!simpleConsignmentTransactionsGridApi) return;

    simpleConsignmentTransactionsGridApi.setGridOption("rowData", rows || []);
    refreshTransactionsPinnedBottomRow(simpleConsignmentTransactionsGridApi);
}

export function updateSimpleConsignmentTransactionsGridSearch(searchTerm) {
    simpleConsignmentTransactionsGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function setSimpleConsignmentTransactionsVoidEnabled(enabled) {
    transactionsVoidEnabled = Boolean(enabled);

    if (simpleConsignmentTransactionsGridApi) {
        simpleConsignmentTransactionsGridApi.refreshCells({ force: true });
    }
}
