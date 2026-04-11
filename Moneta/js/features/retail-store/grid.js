import { createGrid } from "https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/+esm";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";

let retailWorksheetGridApi = null;
let retailWorksheetGridElement = null;
let retailSalesGridApi = null;
let retailSalesGridElement = null;
let retailExpenseHistoryGridApi = null;
let retailExpenseHistoryGridElement = null;
let retailPaymentHistoryGridApi = null;
let retailPaymentHistoryGridElement = null;
let retailReturnHistoryGridApi = null;
let retailReturnHistoryGridElement = null;
let retailWorksheetReadOnly = false;
let retailWorksheetMode = "standard";

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

function statusMarkup(value, defaultStatus = "Unpaid") {
    const status = value || defaultStatus;
    const normalized = status.toLowerCase().replace(/\s+/g, "-");
    return `<span class="purchase-status-pill purchase-status-${normalized}">${status}</span>`;
}

function requestStateMarkup(quantity) {
    return quantity > 0
        ? `<span class="purchase-status-pill purchase-status-paid">Included</span>`
        : `<span class="purchase-status-pill purchase-status-unpaid">Not Included</span>`;
}

function escapeHtmlAttr(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function retailPaymentActionMarkup(payment = {}) {
    const status = String(payment.paymentStatus || payment.status || "Verified").trim().toLowerCase();
    const amountApplied = Number(payment.amountApplied ?? payment.amountPaid) || 0;
    const amountReceived = Number(payment.amountReceived ?? payment.totalCollected ?? payment.amountPaid) || 0;

    let disabledReason = "";
    if (payment.isReversalEntry) {
        disabledReason = "Reversal entries cannot be voided.";
    } else if (status === "voided" || status === "void reversal") {
        disabledReason = "This payment is already voided.";
    } else if (amountApplied <= 0 && amountReceived <= 0) {
        disabledReason = "Only posted payment entries can be voided.";
    }

    const disabledAttrs = disabledReason
        ? `disabled title="${escapeHtmlAttr(disabledReason)}"`
        : "";

    return `
        <button class="button grid-action-button grid-action-button-danger retail-payment-void-button" type="button" data-payment-id="${payment.id || ""}" ${disabledAttrs}>
            <span class="button-icon">${icons.warning}</span>
            Void Payment
        </button>
    `;
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

function buildReturnQuantitySetter() {
    return params => {
        const parsed = Number(params.newValue);
        const normalized = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
        const maxAllowed = Math.max(0, Math.floor(Number(params.data?.quantity) || 0));
        const nextValue = Math.min(normalized, maxAllowed);
        const changed = Number(params.data?.returnQuantity || 0) !== nextValue;

        params.data.returnQuantity = nextValue;
        return changed;
    };
}

function retailSalesActionMarkup(data) {
    return `
        <div class="table-actions grid-actions-inline">
            <button class="button grid-action-button grid-action-button-secondary retail-sale-view-button" type="button" data-sale-id="${data.id}">
                <span class="button-icon">${icons.search}</span>
                View
            </button>
            <button class="button grid-action-button grid-action-button-primary retail-sale-payments-button" type="button" data-sale-id="${data.id}">
                <span class="button-icon">${icons.payment}</span>
                Payments
            </button>
            <button class="button grid-action-button grid-action-button-secondary retail-sale-more-button" type="button" data-sale-id="${data.id}">
                <span class="button-icon">${icons.settings}</span>
                More
            </button>
        </div>
    `;
}

function buildWorksheetColumnDefs() {
    return [
        {
            field: "returnQuantity",
            headerName: "Return Qty",
            minWidth: 120,
            maxWidth: 130,
            hide: retailWorksheetMode !== "return",
            editable: params => !retailWorksheetReadOnly && retailWorksheetMode === "return" && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildReturnQuantitySetter(),
            ...rightAlignedNumberColumn
        },
        {
            field: "quantity",
            headerName: retailWorksheetMode === "return" ? "Sold Qty" : "Qty",
            minWidth: 95,
            maxWidth: 110,
            editable: params => !retailWorksheetReadOnly && retailWorksheetMode !== "return" && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("quantity", 0),
            ...rightAlignedNumberColumn
        },
        { field: "productName", headerName: "Product", minWidth: 240, flex: 1.35 },
        { field: "categoryName", headerName: "Category", minWidth: 150, flex: 0.85 },
        {
            field: "inventoryCount",
            headerName: "Stock",
            minWidth: 110,
            flex: 0.65,
            ...rightAlignedNumberColumn
        },
        {
            field: "unitPrice",
            headerName: "Unit Price",
            minWidth: 135,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => (params.node?.rowPinned ? "" : formatCurrency(params.value || 0))
        },
        {
            field: "lineDiscountPercentage",
            headerName: "Line Disc. %",
            minWidth: 130,
            flex: 0.8,
            editable: params => !retailWorksheetReadOnly && retailWorksheetMode !== "return" && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("lineDiscountPercentage", 2),
            ...rightAlignedNumberColumn,
            valueFormatter: params => (params.node?.rowPinned ? "" : `${Number(params.value || 0).toFixed(2)}%`)
        },
        {
            field: "cgstPercentage",
            headerName: "CGST %",
            minWidth: 120,
            flex: 0.75,
            editable: params => !retailWorksheetReadOnly && retailWorksheetMode !== "return" && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("cgstPercentage", 2),
            ...rightAlignedNumberColumn,
            valueFormatter: params => (params.node?.rowPinned ? "" : `${Number(params.value || 0).toFixed(2)}%`)
        },
        {
            field: "sgstPercentage",
            headerName: "SGST %",
            minWidth: 120,
            flex: 0.75,
            editable: params => !retailWorksheetReadOnly && retailWorksheetMode !== "return" && !params.node?.rowPinned,
            cellEditor: "agNumberCellEditor",
            valueSetter: buildNumberSetter("sgstPercentage", 2),
            ...rightAlignedNumberColumn,
            valueFormatter: params => (params.node?.rowPinned ? "" : `${Number(params.value || 0).toFixed(2)}%`)
        },
        {
            headerName: "Tax",
            minWidth: 130,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueGetter: params => {
                if (params.node?.rowPinned) {
                    return params.data?.taxAmount || 0;
                }

                const quantity = Number(params.data?.quantity) || 0;
                const unitPrice = Number(params.data?.unitPrice) || 0;
                const lineDiscountPercentage = Number(params.data?.lineDiscountPercentage) || 0;
                const cgstPercentage = Number(params.data?.cgstPercentage) || 0;
                const sgstPercentage = Number(params.data?.sgstPercentage) || 0;
                const gross = quantity * unitPrice;
                const discount = gross * (lineDiscountPercentage / 100);
                const taxableAmount = gross - discount;
                const cgstAmount = taxableAmount * (cgstPercentage / 100);
                const sgstAmount = taxableAmount * (sgstPercentage / 100);
                return Number((cgstAmount + sgstAmount).toFixed(2));
            },
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            headerName: "Line Total",
            minWidth: 140,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueGetter: params => {
                if (params.node?.rowPinned) {
                    return params.data?.lineTotal || 0;
                }

                const quantity = Number(params.data?.quantity) || 0;
                const unitPrice = Number(params.data?.unitPrice) || 0;
                const lineDiscountPercentage = Number(params.data?.lineDiscountPercentage) || 0;
                const cgstPercentage = Number(params.data?.cgstPercentage) || 0;
                const sgstPercentage = Number(params.data?.sgstPercentage) || 0;
                const gross = quantity * unitPrice;
                const discount = gross * (lineDiscountPercentage / 100);
                const taxableAmount = gross - discount;
                const cgstAmount = taxableAmount * (cgstPercentage / 100);
                const sgstAmount = taxableAmount * (sgstPercentage / 100);
                return Number((taxableAmount + cgstAmount + sgstAmount).toFixed(2));
            },
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            headerName: "Request State",
            minWidth: 130,
            flex: 0.8,
            sortable: false,
            filter: false,
            valueGetter: params => Number(params.data?.quantity) || 0,
            cellRenderer: params => (params.node?.rowPinned ? "" : requestStateMarkup(Number(params.value) || 0))
        }
    ];
}

function buildSalesColumnDefs() {
    return [
        { field: "manualVoucherNumber", headerName: "Voucher #", minWidth: 170, flex: 0.95 },
        { field: "saleId", headerName: "Sale ID", minWidth: 165, flex: 0.95 },
        {
            field: "saleDate",
            headerName: "Sale Date",
            minWidth: 135,
            flex: 0.8,
            valueFormatter: params => formatDate(params.value)
        },
        { field: "customerName", headerName: "Customer", minWidth: 210, flex: 1.2 },
        { field: "store", headerName: "Store", minWidth: 150, flex: 0.85 },
        { field: "saleType", headerName: "Sale Type", minWidth: 130, flex: 0.75 },
        {
            field: "lineItemCount",
            headerName: "No. Of Products",
            minWidth: 145,
            flex: 0.85,
            ...rightAlignedNumberColumn
        },
        {
            field: "returnCount",
            headerName: "Returns",
            minWidth: 110,
            flex: 0.7,
            ...rightAlignedNumberColumn
        },
        {
            field: "invoiceTotal",
            headerName: "Invoice Total",
            minWidth: 140,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "amountPaid",
            headerName: "Amount Paid",
            minWidth: 140,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "totalDonation",
            headerName: "Donations",
            minWidth: 130,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "totalExpenses",
            headerName: "Expenses",
            minWidth: 130,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "balanceDue",
            headerName: "Balance Due",
            minWidth: 140,
            flex: 0.85,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "orderStatus",
            headerName: "Order Status",
            minWidth: 150,
            flex: 0.85,
            cellRenderer: params => (params.node?.rowPinned ? "" : statusMarkup(params.value, "Active"))
        },
        {
            field: "paymentStatus",
            headerName: "Payment Status",
            minWidth: 160,
            flex: 0.9,
            cellRenderer: params => (params.node?.rowPinned ? "" : statusMarkup(params.value, "Unpaid"))
        },
        {
            headerName: "Actions",
            minWidth: 360,
            flex: 1.05,
            sortable: false,
            filter: false,
            cellRenderer: params => (params.node?.rowPinned ? "" : retailSalesActionMarkup(params.data))
        }
    ];
}

function buildPaymentHistoryColumnDefs() {
    return [
        {
            field: "paymentDate",
            headerName: "Date",
            minWidth: 130,
            flex: 0.8,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "amountPaid",
            headerName: "Applied",
            minWidth: 130,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "donationAmount",
            headerName: "Donation",
            minWidth: 130,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "amountReceived",
            headerName: "Received",
            minWidth: 130,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || params.data?.totalCollected || params.data?.amountPaid || 0)
        },
        {
            field: "paymentMode",
            headerName: "Mode",
            minWidth: 140,
            flex: 0.85,
            valueFormatter: params => params.value || "-"
        },
        {
            field: "transactionRef",
            headerName: "Reference",
            minWidth: 170,
            flex: 1.05,
            valueFormatter: params => params.value || "-"
        },
        {
            field: "status",
            headerName: "Status",
            minWidth: 140,
            flex: 0.85,
            cellRenderer: params => (params.node?.rowPinned ? "" : statusMarkup(params.value || params.data?.paymentStatus, "Verified"))
        },
        {
            field: "recordedBy",
            headerName: "Recorded By",
            minWidth: 190,
            flex: 1.05,
            valueFormatter: params => params.value || params.data?.createdBy || "-"
        },
        {
            headerName: "Actions",
            minWidth: 165,
            flex: 0.9,
            sortable: false,
            filter: false,
            cellRenderer: params => (params.node?.rowPinned ? "" : retailPaymentActionMarkup(params.data || {}))
        }
    ];
}

function buildExpenseHistoryColumnDefs() {
    return [
        {
            field: "expenseDate",
            headerName: "Date",
            minWidth: 130,
            flex: 0.8,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "justification",
            headerName: "Justification",
            minWidth: 280,
            flex: 1.8
        },
        {
            field: "amount",
            headerName: "Amount",
            minWidth: 140,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => (params.node?.rowPinned ? formatCurrency(params.value || 0) : formatCurrency(params.value || 0))
        },
        {
            field: "addedBy",
            headerName: "Added By",
            minWidth: 180,
            flex: 1
        }
    ];
}

function buildReturnHistoryColumnDefs() {
    return [
        {
            field: "returnDate",
            headerName: "Return Date",
            minWidth: 130,
            flex: 0.8,
            valueFormatter: params => formatDate(params.value)
        },
        {
            field: "returnId",
            headerName: "Return ID",
            minWidth: 150,
            flex: 0.9,
            valueFormatter: params => params.value || "-"
        },
        {
            field: "returnStatus",
            headerName: "Status",
            minWidth: 140,
            flex: 0.8,
            cellRenderer: params => (params.node?.rowPinned ? "" : statusMarkup(params.value, "Returned"))
        },
        {
            field: "totalReturnedQuantity",
            headerName: "Qty",
            minWidth: 110,
            flex: 0.65,
            ...rightAlignedNumberColumn
        },
        {
            field: "totalReturnedAmount",
            headerName: "Amount",
            minWidth: 130,
            flex: 0.8,
            ...rightAlignedNumberColumn,
            valueFormatter: params => formatCurrency(params.value || 0)
        },
        {
            field: "reason",
            headerName: "Reason",
            minWidth: 260,
            flex: 1.45,
            valueFormatter: params => params.value || "-"
        },
        {
            headerName: "Items",
            minWidth: 260,
            flex: 1.4,
            sortable: false,
            filter: false,
            valueGetter: params => {
                if (params.node?.rowPinned) return "";
                const items = Array.isArray(params.data?.items) ? params.data.items : [];
                if (!items.length) return "-";

                const preview = items
                    .slice(0, 3)
                    .map(item => `${item.productName || item.productId || "Item"} x${Number(item.quantity) || 0}`)
                    .join(", ");
                const moreCount = Math.max(items.length - 3, 0);
                return moreCount > 0 ? `${preview} +${moreCount} more` : preview;
            }
        },
        {
            field: "createdBy",
            headerName: "Recorded By",
            minWidth: 180,
            flex: 1,
            valueFormatter: params => params.value || "-"
        },
        {
            headerName: "Actions",
            minWidth: 120,
            flex: 0.72,
            sortable: false,
            filter: false,
            cellRenderer: params => (
                params.node?.rowPinned
                    ? ""
                    : `<button class="button grid-action-button grid-action-button-secondary retail-return-note-pdf-button" type="button" data-return-row-id="${params.data?.id || ""}">
                        <span class="button-icon">${icons.download}</span>
                        PDF
                    </button>`
            )
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

function buildWorksheetPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totals = rows.reduce((summary, row) => {
        const quantity = Number(row?.quantity) || 0;
        const returnQuantity = Number(row?.returnQuantity) || 0;
        const unitPrice = Number(row?.unitPrice) || 0;
        const lineDiscountPercentage = Number(row?.lineDiscountPercentage) || 0;
        const cgstPercentage = Number(row?.cgstPercentage) || 0;
        const sgstPercentage = Number(row?.sgstPercentage) || 0;
        const gross = quantity * unitPrice;
        const discount = gross * (lineDiscountPercentage / 100);
        const taxableAmount = gross - discount;
        const cgstAmount = taxableAmount * (cgstPercentage / 100);
        const sgstAmount = taxableAmount * (sgstPercentage / 100);

        summary.quantity += quantity;
        summary.returnQuantity += returnQuantity;
        summary.taxAmount += cgstAmount + sgstAmount;
        summary.lineTotal += taxableAmount + cgstAmount + sgstAmount;
        return summary;
    }, {
        quantity: 0,
        returnQuantity: 0,
        taxAmount: 0,
        lineTotal: 0
    });

    return [{
        productName: "Totals",
        quantity: totals.quantity,
        returnQuantity: totals.returnQuantity,
        taxAmount: Number(totals.taxAmount.toFixed(2)),
        lineTotal: Number(totals.lineTotal.toFixed(2))
    }];
}

function buildSalesPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totals = rows.reduce((summary, row) => {
        summary.lineItemCount += Number(row?.lineItemCount) || 0;
        summary.returnCount += Number(row?.returnCount) || 0;
        summary.invoiceTotal += Number(row?.invoiceTotal) || 0;
        summary.amountPaid += Number(row?.amountPaid) || 0;
        summary.totalDonation += Number(row?.totalDonation) || 0;
        summary.totalExpenses += Number(row?.totalExpenses) || 0;
        summary.balanceDue += Number(row?.balanceDue) || 0;
        return summary;
    }, {
        lineItemCount: 0,
        returnCount: 0,
        invoiceTotal: 0,
        amountPaid: 0,
        totalDonation: 0,
        totalExpenses: 0,
        balanceDue: 0
    });

    return [{
        manualVoucherNumber: "Totals",
        lineItemCount: totals.lineItemCount,
        returnCount: totals.returnCount,
        invoiceTotal: Number(totals.invoiceTotal.toFixed(2)),
        amountPaid: Number(totals.amountPaid.toFixed(2)),
        totalDonation: Number(totals.totalDonation.toFixed(2)),
        totalExpenses: Number(totals.totalExpenses.toFixed(2)),
        balanceDue: Number(totals.balanceDue.toFixed(2))
    }];
}

function buildExpenseHistoryPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totalAmount = rows.reduce((sum, row) => sum + (Number(row?.amount) || 0), 0);
    return [{
        justification: "Totals",
        amount: Number(totalAmount.toFixed(2))
    }];
}

function buildPaymentHistoryPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totals = rows.reduce((summary, row) => {
        summary.amountPaid += Number(row?.amountPaid) || 0;
        summary.donationAmount += Number(row?.donationAmount) || 0;
        summary.amountReceived += Number(row?.amountReceived ?? row?.totalCollected ?? row?.amountPaid) || 0;
        return summary;
    }, {
        amountPaid: 0,
        donationAmount: 0,
        amountReceived: 0
    });

    return [{
        paymentMode: "Totals",
        amountPaid: Number(totals.amountPaid.toFixed(2)),
        donationAmount: Number(totals.donationAmount.toFixed(2)),
        amountReceived: Number(totals.amountReceived.toFixed(2))
    }];
}

function buildReturnHistoryPinnedBottomRow(rows) {
    if (!rows?.length) return [];

    const totals = rows.reduce((summary, row) => {
        summary.totalReturnedQuantity += Number(row?.totalReturnedQuantity) || 0;
        summary.totalReturnedAmount += Number(row?.totalReturnedAmount) || 0;
        return summary;
    }, {
        totalReturnedQuantity: 0,
        totalReturnedAmount: 0
    });

    return [{
        returnId: "Totals",
        totalReturnedQuantity: totals.totalReturnedQuantity,
        totalReturnedAmount: Number(totals.totalReturnedAmount.toFixed(2))
    }];
}

function refreshWorksheetPinnedBottomRow(api) {
    api?.setGridOption("pinnedBottomRowData", buildWorksheetPinnedBottomRow(getVisibleRows(api)));
}

function refreshSalesPinnedBottomRow(api) {
    api?.setGridOption("pinnedBottomRowData", buildSalesPinnedBottomRow(getVisibleRows(api)));
}

function refreshExpenseHistoryPinnedBottomRow(api) {
    api?.setGridOption("pinnedBottomRowData", buildExpenseHistoryPinnedBottomRow(getVisibleRows(api)));
}

function refreshPaymentHistoryPinnedBottomRow(api) {
    api?.setGridOption("pinnedBottomRowData", buildPaymentHistoryPinnedBottomRow(getVisibleRows(api)));
}

function refreshReturnHistoryPinnedBottomRow(api) {
    api?.setGridOption("pinnedBottomRowData", buildReturnHistoryPinnedBottomRow(getVisibleRows(api)));
}

export function initializeRetailWorksheetGrid(gridElement, onRowsChanged) {
    if (!gridElement) return retailWorksheetGridApi;

    if (retailWorksheetGridApi && retailWorksheetGridElement !== gridElement) {
        retailWorksheetGridApi.destroy();
        retailWorksheetGridApi = null;
        retailWorksheetGridElement = null;
    }

    if (retailWorksheetGridApi) return retailWorksheetGridApi;

    retailWorksheetGridApi = createGrid(gridElement, {
        columnDefs: buildWorksheetColumnDefs(),
        rowData: [],
        defaultColDef: buildDefaultColDef(),
        onCellValueChanged: () => {
            refreshWorksheetPinnedBottomRow(retailWorksheetGridApi);
            onRowsChanged?.(getRetailWorksheetGridRows());
        },
        onFilterChanged: () => refreshWorksheetPinnedBottomRow(retailWorksheetGridApi)
    });

    retailWorksheetGridElement = gridElement;
    return retailWorksheetGridApi;
}

export function setRetailWorksheetReadOnly(isReadOnly) {
    retailWorksheetReadOnly = Boolean(isReadOnly);

    if (retailWorksheetGridApi) {
        retailWorksheetGridApi.refreshCells({ force: true });
        retailWorksheetGridApi.setGridOption("suppressCellFocus", retailWorksheetReadOnly);
    }
}

export function setRetailWorksheetMode(mode = "standard") {
    const normalizedMode = mode === "return" ? "return" : "standard";
    if (retailWorksheetMode === normalizedMode) return;

    retailWorksheetMode = normalizedMode;
    if (retailWorksheetGridApi) {
        retailWorksheetGridApi.setGridOption("columnDefs", buildWorksheetColumnDefs());
        retailWorksheetGridApi.refreshHeader();
        retailWorksheetGridApi.refreshCells({ force: true });
    }
}

export function refreshRetailWorksheetGrid(rows) {
    if (!retailWorksheetGridApi) return;
    retailWorksheetGridApi.setGridOption("rowData", rows);
    refreshWorksheetPinnedBottomRow(retailWorksheetGridApi);
}

export function updateRetailWorksheetGridSearch(searchTerm) {
    retailWorksheetGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function getRetailWorksheetGridRows() {
    if (!retailWorksheetGridApi) return [];

    const rows = [];
    retailWorksheetGridApi.forEachNode(node => {
        if (!node.rowPinned) {
            rows.push(node.data);
        }
    });

    return rows;
}

export function initializeRetailSalesGrid(gridElement, onFilteredCountChange) {
    if (!gridElement) return retailSalesGridApi;

    if (retailSalesGridApi && retailSalesGridElement !== gridElement) {
        retailSalesGridApi.destroy();
        retailSalesGridApi = null;
        retailSalesGridElement = null;
    }

    if (retailSalesGridApi) return retailSalesGridApi;

    retailSalesGridApi = createGrid(gridElement, {
        columnDefs: buildSalesColumnDefs(),
        rowData: [],
        pagination: true,
        paginationPageSize: 25,
        paginationPageSizeSelector: [10, 25, 50, 100],
        defaultColDef: buildDefaultColDef(),
        onFilterChanged: () => {
            refreshSalesPinnedBottomRow(retailSalesGridApi);

            let count = 0;
            retailSalesGridApi.forEachNodeAfterFilter(node => {
                if (!node.rowPinned) {
                    count += 1;
                }
            });

            onFilteredCountChange?.(count);
        }
    });

    retailSalesGridElement = gridElement;
    return retailSalesGridApi;
}

export function refreshRetailSalesGrid(rows) {
    if (!retailSalesGridApi) return;
    retailSalesGridApi.setGridOption("rowData", rows);
    refreshSalesPinnedBottomRow(retailSalesGridApi);
}

export function updateRetailSalesGridSearch(searchTerm) {
    retailSalesGridApi?.setGridOption("quickFilterText", searchTerm || "");
}

export function initializeRetailExpenseHistoryGrid(gridElement) {
    if (!gridElement) return retailExpenseHistoryGridApi;

    if (retailExpenseHistoryGridApi && retailExpenseHistoryGridElement !== gridElement) {
        retailExpenseHistoryGridApi.destroy();
        retailExpenseHistoryGridApi = null;
        retailExpenseHistoryGridElement = null;
    }

    if (retailExpenseHistoryGridApi) return retailExpenseHistoryGridApi;

    retailExpenseHistoryGridApi = createGrid(gridElement, {
        columnDefs: buildExpenseHistoryColumnDefs(),
        rowData: [],
        defaultColDef: buildDefaultColDef(),
        onFilterChanged: () => refreshExpenseHistoryPinnedBottomRow(retailExpenseHistoryGridApi)
    });

    retailExpenseHistoryGridElement = gridElement;
    return retailExpenseHistoryGridApi;
}

export function refreshRetailExpenseHistoryGrid(rows) {
    if (!retailExpenseHistoryGridApi) return;
    retailExpenseHistoryGridApi.setGridOption("rowData", rows || []);
    refreshExpenseHistoryPinnedBottomRow(retailExpenseHistoryGridApi);
}

export function initializeRetailPaymentHistoryGrid(gridElement) {
    if (!gridElement) return retailPaymentHistoryGridApi;

    if (retailPaymentHistoryGridApi && retailPaymentHistoryGridElement !== gridElement) {
        retailPaymentHistoryGridApi.destroy();
        retailPaymentHistoryGridApi = null;
        retailPaymentHistoryGridElement = null;
    }

    if (retailPaymentHistoryGridApi) return retailPaymentHistoryGridApi;

    retailPaymentHistoryGridApi = createGrid(gridElement, {
        columnDefs: buildPaymentHistoryColumnDefs(),
        rowData: [],
        defaultColDef: buildDefaultColDef(),
        onFilterChanged: () => refreshPaymentHistoryPinnedBottomRow(retailPaymentHistoryGridApi)
    });

    retailPaymentHistoryGridElement = gridElement;
    return retailPaymentHistoryGridApi;
}

export function refreshRetailPaymentHistoryGrid(rows) {
    if (!retailPaymentHistoryGridApi) return;
    retailPaymentHistoryGridApi.setGridOption("rowData", rows || []);
    refreshPaymentHistoryPinnedBottomRow(retailPaymentHistoryGridApi);
}

export function initializeRetailReturnHistoryGrid(gridElement) {
    if (!gridElement) return retailReturnHistoryGridApi;

    if (retailReturnHistoryGridApi && retailReturnHistoryGridElement !== gridElement) {
        retailReturnHistoryGridApi.destroy();
        retailReturnHistoryGridApi = null;
        retailReturnHistoryGridElement = null;
    }

    if (retailReturnHistoryGridApi) return retailReturnHistoryGridApi;

    retailReturnHistoryGridApi = createGrid(gridElement, {
        columnDefs: buildReturnHistoryColumnDefs(),
        rowData: [],
        defaultColDef: buildDefaultColDef(),
        onFilterChanged: () => refreshReturnHistoryPinnedBottomRow(retailReturnHistoryGridApi)
    });

    retailReturnHistoryGridElement = gridElement;
    return retailReturnHistoryGridApi;
}

export function refreshRetailReturnHistoryGrid(rows) {
    if (!retailReturnHistoryGridApi) return;
    retailReturnHistoryGridApi.setGridOption("rowData", rows || []);
    refreshReturnHistoryPinnedBottomRow(retailReturnHistoryGridApi);
}
