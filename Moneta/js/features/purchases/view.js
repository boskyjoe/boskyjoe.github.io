import { getState, subscribe } from "../../app/store.js";
import { showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import { subscribeToPurchaseInvoices } from "./repository.js";
import { calculatePurchaseDraftSummary, savePurchaseInvoice } from "./service.js";

const featureState = {
    invoices: [],
    editingInvoiceId: null,
    searchTerm: "",
    unsubscribeInvoices: null
};

function normalizeText(value) {
    return (value || "").trim();
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

function toDateInputValue(value) {
    if (!value) return "";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function normalizeStoredDiscountType(value) {
    return normalizeText(value) === "Percentage" ? "Percentage" : "Fixed";
}

function getEditingInvoice() {
    if (!featureState.editingInvoiceId) return null;
    return featureState.invoices.find(invoice => invoice.id === featureState.editingInvoiceId) || null;
}

function getVisibleInvoices() {
    const searchTerm = featureState.searchTerm.toLowerCase();

    return featureState.invoices.filter(invoice => {
        if (!searchTerm) return true;

        const haystack = [
            invoice.invoiceId,
            invoice.invoiceName,
            invoice.supplierName,
            invoice.supplierInvoiceNo,
            invoice.paymentStatus
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return haystack.includes(searchTerm);
    });
}

function renderSupplierOptions(suppliers, currentValue) {
    return suppliers.map(supplier => `
        <option value="${supplier.id}" ${supplier.id === currentValue ? "selected" : ""}>
            ${supplier.supplierName}
        </option>
    `).join("");
}

function renderProductOptions(products, currentValue) {
    return products.map(product => `
        <option value="${product.id}" ${product.id === currentValue ? "selected" : ""}>
            ${product.itemName} (${product.itemId || "Pending ID"})
        </option>
    `).join("");
}

function getLineItemProductMeta(products, item) {
    const product = products.find(entry => entry.id === normalizeText(item.masterProductId));
    if (!product) return "Select a product to attach stock and weight context.";

    return `Stock ${product.inventoryCount || 0} units • Net wt ${Number(product.netWeightKg || 0).toFixed(3)} kg`;
}

function renderLineItemRow(item, index, products) {
    const lineItem = {
        masterProductId: normalizeText(item.masterProductId),
        quantity: Number(item.quantity) || 0,
        unitPurchasePrice: Number(item.unitPurchasePrice) || 0,
        discountType: normalizeStoredDiscountType(item.discountType),
        discountValue: Number(item.discountValue) || 0,
        taxPercentage: Number(item.taxPercentage) || 0,
        lineItemTotal: Number(item.lineItemTotal) || 0
    };

    return `
        <div class="line-item-row" data-line-item-row>
            <div class="line-item-grid">
                <div class="field field-full">
                    <label for="purchase-product-${index}">Product</label>
                    <select id="purchase-product-${index}" class="select line-item-product" data-field="masterProductId">
                        <option value="">Select product</option>
                        ${renderProductOptions(products, lineItem.masterProductId)}
                    </select>
                    <p class="line-item-note">${getLineItemProductMeta(products, lineItem)}</p>
                </div>
                <div class="field">
                    <label for="purchase-qty-${index}">Qty</label>
                    <input id="purchase-qty-${index}" class="input" type="number" min="0" step="1" value="${lineItem.quantity || ""}" data-field="quantity">
                </div>
                <div class="field">
                    <label for="purchase-price-${index}">Unit Price</label>
                    <input id="purchase-price-${index}" class="input" type="number" min="0" step="0.01" value="${lineItem.unitPurchasePrice || ""}" data-field="unitPurchasePrice">
                </div>
                <div class="field">
                    <label for="purchase-discount-type-${index}">Discount Type</label>
                    <select id="purchase-discount-type-${index}" class="select" data-field="discountType">
                        <option value="Percentage" ${lineItem.discountType === "Percentage" ? "selected" : ""}>Percentage</option>
                        <option value="Fixed" ${lineItem.discountType === "Fixed" ? "selected" : ""}>Fixed</option>
                    </select>
                </div>
                <div class="field">
                    <label for="purchase-discount-value-${index}">Discount</label>
                    <input id="purchase-discount-value-${index}" class="input" type="number" min="0" step="0.01" value="${lineItem.discountValue || ""}" data-field="discountValue">
                </div>
                <div class="field">
                    <label for="purchase-tax-${index}">Tax %</label>
                    <input id="purchase-tax-${index}" class="input" type="number" min="0" step="0.01" value="${lineItem.taxPercentage || ""}" data-field="taxPercentage">
                </div>
                <div class="field">
                    <label for="purchase-total-${index}">Line Total</label>
                    <input id="purchase-total-${index}" class="input line-item-total" type="text" value="${formatCurrency(lineItem.lineItemTotal || 0)}" readonly>
                </div>
            </div>
            <div class="line-item-actions">
                <button class="button button-ghost purchase-remove-line-item" type="button">
                    <span class="button-icon">${icons.inactive}</span>
                    Remove line
                </button>
            </div>
        </div>
    `;
}

function renderInvoicesTable(invoices) {
    if (invoices.length === 0) {
        return `
            <tr>
                <td colspan="7">
                    <div class="empty-state">No purchase invoices match the current search.</div>
                </td>
            </tr>
        `;
    }

    return invoices.map(invoice => `
        <tr>
            <td>
                <strong>${invoice.invoiceName || "Untitled Invoice"}</strong><br>
                <span class="panel-copy">${invoice.invoiceId || "Pending ID"}</span>
            </td>
            <td>${formatDate(invoice.purchaseDate)}</td>
            <td>
                ${invoice.supplierName || "-"}<br>
                <span class="panel-copy">${invoice.supplierInvoiceNo || "No supplier ref"}</span>
            </td>
            <td>${invoice.lineItems?.length || 0}</td>
            <td>${formatCurrency(invoice.invoiceTotal || 0)}</td>
            <td>${formatCurrency(invoice.balanceDue ?? invoice.invoiceTotal ?? 0)}</td>
            <td>
                <div class="table-actions">
                    <span class="status-pill">${invoice.paymentStatus || "Unpaid"}</span>
                    <button class="button button-secondary purchase-edit-button" type="button" data-invoice-id="${invoice.id}">
                        <span class="button-icon">${icons.edit}</span>
                        Edit
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
}

function renderPurchasesViewShell(snapshot) {
    const root = document.getElementById("purchases-root");
    if (!root) return;

    const editingInvoice = getEditingInvoice();
    const suppliers = snapshot.masterData.suppliers || [];
    const products = snapshot.masterData.products || [];
    const visibleInvoices = getVisibleInvoices();
    const draftLineItems = editingInvoice?.lineItems?.length
        ? editingInvoice.lineItems
        : [{ quantity: 1, discountType: "Percentage", taxPercentage: 0 }];
    const draftSummary = calculatePurchaseDraftSummary({
        lineItems: draftLineItems,
        invoiceDiscountType: editingInvoice?.invoiceDiscountType || "Percentage",
        invoiceDiscountValue: editingInvoice?.invoiceDiscountValue || 0,
        invoiceTaxPercentage: editingInvoice?.invoiceTaxPercentage || 0
    }, products);
    const canSaveInvoice = suppliers.length > 0 && products.length > 0;

    root.innerHTML = `
        <div class="section-stack">
            <div class="panel-card">
                <div class="panel-header panel-header-accent">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.purchases}</span>
                        <div>
                            <h2>${editingInvoice ? "Edit Purchase Invoice" : "Purchase Invoices"}</h2>
                            <p class="panel-copy">Capture supplier invoices and update inventory with transaction-safe stock movement.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span class="status-pill">${featureState.invoices.length} invoices</span>
                        <span class="status-pill">${products.length} active products</span>
                    </div>
                </div>
                <div class="panel-body">
                    <form id="purchase-invoice-form">
                        <input type="hidden" id="purchase-invoice-doc-id" value="${editingInvoice?.id || ""}">
                        <div class="form-grid">
                            <div class="field">
                                <label for="purchase-date">Purchase Date</label>
                                <input id="purchase-date" class="input" type="date" value="${toDateInputValue(editingInvoice?.purchaseDate) || toDateInputValue(new Date())}" required>
                            </div>
                            <div class="field">
                                <label for="purchase-supplier">Supplier</label>
                                <select id="purchase-supplier" class="select" required>
                                    <option value="">Select supplier</option>
                                    ${renderSupplierOptions(suppliers, editingInvoice?.supplierId)}
                                </select>
                            </div>
                            <div class="field">
                                <label for="supplier-invoice-no">Supplier Invoice Ref</label>
                                <input id="supplier-invoice-no" class="input" type="text" value="${editingInvoice?.supplierInvoiceNo || ""}" placeholder="Optional supplier invoice number">
                            </div>
                            <div class="field field-wide">
                                <label for="purchase-invoice-name">Invoice Name</label>
                                <input id="purchase-invoice-name" class="input" type="text" value="${editingInvoice?.invoiceName || ""}" placeholder="Stock Purchase - Apr 2026" required>
                            </div>
                            <div class="field">
                                <label for="invoice-discount-type">Invoice Discount Type</label>
                                <select id="invoice-discount-type" class="select">
                                    <option value="Percentage" ${normalizeStoredDiscountType(editingInvoice?.invoiceDiscountType) === "Percentage" ? "selected" : ""}>Percentage</option>
                                    <option value="Fixed" ${normalizeStoredDiscountType(editingInvoice?.invoiceDiscountType) === "Fixed" ? "selected" : ""}>Fixed</option>
                                </select>
                            </div>
                            <div class="field">
                                <label for="invoice-discount-value">Invoice Discount</label>
                                <input id="invoice-discount-value" class="input" type="number" min="0" step="0.01" value="${editingInvoice?.invoiceDiscountValue || ""}">
                            </div>
                            <div class="field">
                                <label for="invoice-tax-percentage">Invoice Tax %</label>
                                <input id="invoice-tax-percentage" class="input" type="number" min="0" step="0.01" value="${editingInvoice?.invoiceTaxPercentage || ""}">
                            </div>
                        </div>

                        <div class="toolbar" style="margin-top: 1.5rem;">
                            <div>
                                <p class="section-kicker" style="margin-bottom: 0.25rem;">Line Items</p>
                                <p class="panel-copy">Each line updates the matching product inventory when the invoice is saved.</p>
                            </div>
                            <button id="purchase-add-line-item" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.plus}</span>
                                Add Line Item
                            </button>
                        </div>

                        <div id="purchase-line-items-container" class="line-items-list">
                            ${draftLineItems.map((item, index) => renderLineItemRow(item, index, products)).join("")}
                        </div>

                        <div class="purchase-summary-grid">
                            <article class="summary-card">
                                <p class="summary-label">Items Subtotal</p>
                                <p id="purchase-summary-subtotal" class="summary-value">${formatCurrency(draftSummary.itemsSubtotal)}</p>
                            </article>
                            <article class="summary-card">
                                <p class="summary-label">Invoice Discount</p>
                                <p id="purchase-summary-discount" class="summary-value">${formatCurrency(draftSummary.invoiceDiscountAmount)}</p>
                            </article>
                            <article class="summary-card">
                                <p class="summary-label">Total Tax</p>
                                <p id="purchase-summary-tax" class="summary-value">${formatCurrency(draftSummary.totalTaxAmount)}</p>
                            </article>
                            <article class="summary-card">
                                <p class="summary-label">Invoice Total</p>
                                <p id="purchase-summary-total" class="summary-value">${formatCurrency(draftSummary.invoiceTotal)}</p>
                            </article>
                        </div>

                        ${canSaveInvoice ? "" : `
                            <p class="panel-copy" style="margin-top: 1rem;">
                                You need at least one active supplier and one active product before creating purchase invoices.
                            </p>
                        `}

                        <div class="form-actions">
                            ${editingInvoice ? `
                                <button id="purchase-cancel-button" class="button button-secondary" type="button">
                                    <span class="button-icon">${icons.inactive}</span>
                                    Cancel
                                </button>
                            ` : ""}
                            <button class="button button-primary-alt" type="submit" ${canSaveInvoice ? "" : "disabled"}>
                                <span class="button-icon">${editingInvoice ? icons.edit : icons.plus}</span>
                                ${editingInvoice ? "Update Invoice" : "Save Invoice"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div class="panel-card">
                <div class="panel-header">
                    <div class="panel-title-wrap">
                        <span class="panel-icon">${icons.catalogue}</span>
                        <div>
                            <h3>Invoice History</h3>
                            <p class="panel-copy">Live purchase invoice records from the shared Firestore purchase ledger.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta">
                        <span class="status-pill">${visibleInvoices.length} visible</span>
                        <div class="search-wrap">
                            <span class="search-icon">${icons.search}</span>
                            <input id="purchase-search" class="input toolbar-search" type="search" placeholder="Search by invoice, supplier, reference, or status" value="${featureState.searchTerm}">
                        </div>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="table-wrap">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice</th>
                                    <th>Date</th>
                                    <th>Supplier</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Balance</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderInvoicesTable(visibleInvoices)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getDraftLineItemsFromDom(root) {
    return Array.from(root.querySelectorAll("[data-line-item-row]")).map(row => ({
        masterProductId: row.querySelector('[data-field="masterProductId"]')?.value || "",
        quantity: row.querySelector('[data-field="quantity"]')?.value || 0,
        unitPurchasePrice: row.querySelector('[data-field="unitPurchasePrice"]')?.value || 0,
        discountType: row.querySelector('[data-field="discountType"]')?.value || "Percentage",
        discountValue: row.querySelector('[data-field="discountValue"]')?.value || 0,
        taxPercentage: row.querySelector('[data-field="taxPercentage"]')?.value || 0
    }));
}

function updatePurchaseDraftPreview() {
    const root = document.getElementById("purchases-root");
    if (!root) return;

    const snapshot = getState();
    const products = snapshot.masterData.products || [];
    const summary = calculatePurchaseDraftSummary({
        lineItems: getDraftLineItemsFromDom(root),
        invoiceDiscountType: document.getElementById("invoice-discount-type")?.value,
        invoiceDiscountValue: document.getElementById("invoice-discount-value")?.value,
        invoiceTaxPercentage: document.getElementById("invoice-tax-percentage")?.value
    }, products);

    root.querySelectorAll("[data-line-item-row]").forEach((row, index) => {
        const lineItem = summary.lineItems[index];
        const totalField = row.querySelector(".line-item-total");
        const noteField = row.querySelector(".line-item-note");

        if (totalField && lineItem) {
            totalField.value = formatCurrency(lineItem.lineItemTotal || 0);
        }

        if (noteField && lineItem) {
            noteField.textContent = getLineItemProductMeta(products, lineItem);
        }
    });

    const subtotalNode = document.getElementById("purchase-summary-subtotal");
    const discountNode = document.getElementById("purchase-summary-discount");
    const taxNode = document.getElementById("purchase-summary-tax");
    const totalNode = document.getElementById("purchase-summary-total");

    if (subtotalNode) subtotalNode.textContent = formatCurrency(summary.itemsSubtotal);
    if (discountNode) discountNode.textContent = formatCurrency(summary.invoiceDiscountAmount);
    if (taxNode) taxNode.textContent = formatCurrency(summary.totalTaxAmount);
    if (totalNode) totalNode.textContent = formatCurrency(summary.invoiceTotal);
}

function appendNewLineItemRow() {
    const root = document.getElementById("purchases-root");
    const container = document.getElementById("purchase-line-items-container");
    if (!root || !container) return;

    const products = getState().masterData.products || [];
    const rowCount = container.querySelectorAll("[data-line-item-row]").length;

    container.insertAdjacentHTML(
        "beforeend",
        renderLineItemRow(
            { quantity: 1, discountType: "Percentage", taxPercentage: 0 },
            rowCount,
            products
        )
    );

    updatePurchaseDraftPreview();
}

function removeLineItemRow(button) {
    const container = document.getElementById("purchase-line-items-container");
    const row = button.closest("[data-line-item-row]");
    if (!container || !row) return;

    row.remove();

    if (container.querySelectorAll("[data-line-item-row]").length === 0) {
        appendNewLineItemRow();
        return;
    }

    updatePurchaseDraftPreview();
}

async function handlePurchaseFormSubmit(event) {
    event.preventDefault();

    const root = document.getElementById("purchases-root");
    if (!root) return;

    try {
        const result = await savePurchaseInvoice({
            docId: document.getElementById("purchase-invoice-doc-id")?.value,
            purchaseDate: document.getElementById("purchase-date")?.value,
            supplierId: document.getElementById("purchase-supplier")?.value,
            supplierInvoiceNo: document.getElementById("supplier-invoice-no")?.value,
            invoiceName: document.getElementById("purchase-invoice-name")?.value,
            invoiceDiscountType: document.getElementById("invoice-discount-type")?.value,
            invoiceDiscountValue: document.getElementById("invoice-discount-value")?.value,
            invoiceTaxPercentage: document.getElementById("invoice-tax-percentage")?.value,
            lineItems: getDraftLineItemsFromDom(root)
        }, getState().masterData, getState().currentUser);

        featureState.editingInvoiceId = null;
        renderPurchasesView();
        showToast(result.mode === "create"
            ? "Purchase invoice saved and inventory updated."
            : "Purchase invoice updated and inventory reconciled.", "success");
    } catch (error) {
        console.error("[Moneta] Purchase invoice save failed:", error);
        showToast(error.message || "Could not save purchase invoice.", "error");
    }
}

function handleInvoiceSearch(target) {
    featureState.searchTerm = target.value || "";
    renderPurchasesView();

    const searchInput = document.getElementById("purchase-search");
    if (searchInput) {
        const cursorIndex = featureState.searchTerm.length;
        searchInput.focus();
        searchInput.setSelectionRange(cursorIndex, cursorIndex);
    }
}

function handleEditInvoice(button) {
    featureState.editingInvoiceId = button.dataset.invoiceId || null;
    renderPurchasesView();
    document.getElementById("purchase-invoice-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindPurchasesDomEvents() {
    const root = document.getElementById("purchases-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("submit", event => {
        if (event.target.id === "purchase-invoice-form") {
            handlePurchaseFormSubmit(event);
        }
    });

    root.addEventListener("input", event => {
        const target = event.target;

        if (target.id === "purchase-search") {
            handleInvoiceSearch(target);
            return;
        }

        if (
            target.id === "invoice-discount-value" ||
            target.id === "invoice-tax-percentage" ||
            target.matches("[data-field='quantity']") ||
            target.matches("[data-field='unitPurchasePrice']") ||
            target.matches("[data-field='discountValue']") ||
            target.matches("[data-field='taxPercentage']")
        ) {
            updatePurchaseDraftPreview();
        }
    });

    root.addEventListener("change", event => {
        const target = event.target;

        if (
            target.id === "purchase-supplier" ||
            target.id === "invoice-discount-type" ||
            target.matches("[data-field='masterProductId']") ||
            target.matches("[data-field='discountType']")
        ) {
            updatePurchaseDraftPreview();
        }
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const addButton = target.closest("#purchase-add-line-item");
        const removeButton = target.closest(".purchase-remove-line-item");
        const editButton = target.closest(".purchase-edit-button");
        const cancelButton = target.closest("#purchase-cancel-button");

        if (addButton) {
            appendNewLineItemRow();
            return;
        }

        if (removeButton) {
            removeLineItemRow(removeButton);
            return;
        }

        if (editButton) {
            handleEditInvoice(editButton);
            return;
        }

        if (cancelButton) {
            featureState.editingInvoiceId = null;
            renderPurchasesView();
        }
    });

    root.dataset.bound = "true";
}

function ensureInvoiceListener(snapshot) {
    const hasUser = Boolean(snapshot.currentUser);

    if (hasUser && !featureState.unsubscribeInvoices) {
        featureState.unsubscribeInvoices = subscribeToPurchaseInvoices(
            invoices => {
                featureState.invoices = invoices;

                if (featureState.editingInvoiceId && !invoices.some(invoice => invoice.id === featureState.editingInvoiceId)) {
                    featureState.editingInvoiceId = null;
                }

                if (getState().currentRoute === "#/purchases") {
                    renderPurchasesView();
                }
            },
            error => {
                console.error("[Moneta] Purchase invoice listener failed:", error);
                showToast("Could not load purchase invoices.", "error");
            }
        );
    }

    if (!hasUser && featureState.unsubscribeInvoices) {
        featureState.unsubscribeInvoices();
        featureState.unsubscribeInvoices = null;
        featureState.invoices = [];
        featureState.editingInvoiceId = null;
    }
}

export function renderPurchasesView() {
    const root = document.getElementById("purchases-root");
    if (!root) return;

    renderPurchasesViewShell(getState());
    bindPurchasesDomEvents();
    updatePurchaseDraftPreview();
}

export function initializePurchasesFeature() {
    subscribe(snapshot => {
        ensureInvoiceListener(snapshot);

        if (snapshot.currentRoute === "#/purchases") {
            renderPurchasesView();
        }
    });
}
