import { MONETA_STORE_CONFIG } from "../../config/store-config.js";
import { amountToWords } from "../../shared/utils/amount-words.js";
import { formatCurrency } from "../../shared/utils/currency.js";

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function toDate(value) {
    if (!value) return null;
    const date = value.toDate ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
    const date = toDate(value);
    return date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

function formatTime(value) {
    const date = toDate(value);
    return date ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-";
}

function buildTaxSummary(lineItems = []) {
    const buckets = new Map();

    for (const item of lineItems) {
        const taxableAmount = Number(item.taxableAmount) || 0;
        const cgstPercentage = Number(item.cgstPercentage) || 0;
        const sgstPercentage = Number(item.sgstPercentage) || 0;
        const cgstAmount = Number(item.cgstAmount) || 0;
        const sgstAmount = Number(item.sgstAmount) || 0;

        if (cgstPercentage > 0) {
            const key = `CGST-${cgstPercentage}`;
            const current = buckets.get(key) || { type: "CGST", rate: cgstPercentage, taxableAmount: 0, taxAmount: 0 };
            current.taxableAmount += taxableAmount;
            current.taxAmount += cgstAmount;
            buckets.set(key, current);
        }

        if (sgstPercentage > 0) {
            const key = `SGST-${sgstPercentage}`;
            const current = buckets.get(key) || { type: "SGST", rate: sgstPercentage, taxableAmount: 0, taxAmount: 0 };
            current.taxableAmount += taxableAmount;
            current.taxAmount += sgstAmount;
            buckets.set(key, current);
        }
    }

    return [...buckets.values()].map(row => ({
        ...row,
        taxableAmount: Number(row.taxableAmount.toFixed(2)),
        taxAmount: Number(row.taxAmount.toFixed(2))
    }));
}

function renderLineItems(lineItems = []) {
    return lineItems.map((item, index) => `
        <tr>
            <td class="align-center">${index + 1}</td>
            <td>${escapeHtml(item.productName || "-")}</td>
            <td class="align-center">${escapeHtml(item.hsnCode || "-")}</td>
            <td class="align-right">${escapeHtml(item.quantity || 0)}</td>
            <td class="align-right">${escapeHtml(formatCurrency(item.unitPrice || 0))}</td>
            <td class="align-right">${escapeHtml(formatCurrency(item.taxableAmount || 0))}</td>
            <td class="align-right">${escapeHtml(formatCurrency(item.cgstAmount || 0))}</td>
            <td class="align-right">${escapeHtml(formatCurrency(item.sgstAmount || 0))}</td>
            <td class="align-right strong">${escapeHtml(formatCurrency(item.lineTotal || 0))}</td>
        </tr>
    `).join("");
}

function renderTaxRows(rows = []) {
    if (!rows.length) {
        return `
            <tr>
                <td colspan="4" class="empty-note">No GST applied on this invoice.</td>
            </tr>
        `;
    }

    return rows.map(row => `
        <tr>
            <td>${escapeHtml(row.type)}</td>
            <td class="align-right">${escapeHtml(formatCurrency(row.taxableAmount || 0))}</td>
            <td class="align-right">${escapeHtml(`${row.rate}%`)}</td>
            <td class="align-right">${escapeHtml(formatCurrency(row.taxAmount || 0))}</td>
        </tr>
    `).join("");
}

function getTemplateStyles() {
    return `
        .retail-pdf-root {
            width: 210mm;
            padding: 5mm;
            background: #ffffff;
            color: #1f2933;
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 10px;
            line-height: 1.24;
        }
        .retail-pdf-shell {
            position: relative;
            border: 1px solid #dbe4ea;
            border-radius: 10px;
            overflow: hidden;
        }
        .retail-pdf-watermark {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) rotate(-28deg);
            font-size: 86px;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: rgba(157, 23, 23, 0.16);
            border: 8px solid rgba(157, 23, 23, 0.16);
            border-radius: 14px;
            padding: 18px 30px;
            pointer-events: none;
            z-index: 10;
            white-space: nowrap;
        }
        .retail-pdf-header {
            display: grid;
            grid-template-columns: 1.3fr 0.8fr;
            gap: 10px;
            padding: 12px 14px;
            background: linear-gradient(135deg, #f7fafc 0%, #edf4fb 100%);
            border-bottom: 1px solid #dbe4ea;
        }
        .retail-pdf-brand h1 {
            margin: 0 0 4px;
            font-size: 18px;
            letter-spacing: 0.04em;
        }
        .retail-pdf-brand p,
        .retail-pdf-meta p,
        .retail-pdf-block p,
        .retail-pdf-note p {
            margin: 2px 0;
        }
        .retail-pdf-kicker {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 999px;
            background: #143f66;
            color: #ffffff;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        .retail-pdf-title-panel {
            padding: 10px 12px;
            border: 1px solid #cfdbe6;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.86);
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            justify-content: center;
            text-align: right;
        }
        .retail-pdf-title-panel h2 {
            margin: 0;
            font-size: 20px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #143f66;
        }
        .retail-pdf-title-panel .retail-pdf-kicker {
            margin: 6px 0 0;
        }
        .retail-pdf-grid-four {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
            padding: 10px 14px;
        }
        .retail-pdf-grid-three {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 10px;
            padding: 0 14px 10px;
        }
        .retail-pdf-block,
        .retail-pdf-note,
        .retail-pdf-summary,
        .retail-pdf-tax-box {
            border: 1px solid #dbe4ea;
            border-radius: 10px;
            background: #ffffff;
            padding: 10px 12px;
        }
        .retail-pdf-block h3,
        .retail-pdf-summary h3,
        .retail-pdf-tax-box h3,
        .retail-pdf-note h3 {
            margin: 0 0 5px;
            font-size: 10px;
            color: #35546f;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .retail-pdf-table-wrap {
            padding: 0 14px 10px;
        }
        .retail-pdf-table,
        .retail-pdf-tax-table,
        .retail-pdf-summary-table {
            width: 100%;
            border-collapse: collapse;
        }
        .retail-pdf-table th,
        .retail-pdf-table td,
        .retail-pdf-tax-table th,
        .retail-pdf-tax-table td,
        .retail-pdf-summary-table td {
            border: 1px solid #dbe4ea;
            padding: 5px 6px;
            vertical-align: top;
        }
        .retail-pdf-table th,
        .retail-pdf-tax-table th {
            background: #f5f8fb;
            color: #48657f;
            font-size: 9px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }
        .retail-pdf-table tfoot td {
            background: #f8fbfd;
            font-weight: 700;
        }
        .align-right {
            text-align: right;
        }
        .align-center {
            text-align: center;
        }
        .strong {
            font-weight: 700;
        }
        .empty-note {
            text-align: center;
            color: #66788a;
        }
        .retail-pdf-summary-table td:first-child {
            color: #5f7488;
        }
        .retail-pdf-summary-table td:last-child {
            text-align: right;
            font-weight: 700;
        }
        .retail-pdf-summary-table tr.total-row td {
            background: #edf6f2;
            color: #0f5132;
            font-size: 11px;
        }
        .retail-pdf-detail-footer {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 10px;
            padding: 0 14px 10px;
        }
        .retail-pdf-payment-box {
            display: grid;
            gap: 8px;
        }
        .retail-pdf-footer {
            display: grid;
            grid-template-columns: 1.1fr 0.9fr 0.7fr;
            gap: 10px;
            padding: 0 14px 12px;
        }
        .retail-pdf-qr {
            display: grid;
            grid-template-columns: 68px 1fr;
            gap: 8px;
            align-items: start;
        }
        .retail-pdf-qr img {
            width: 64px;
            height: 64px;
            object-fit: contain;
            border: 1px solid #dbe4ea;
            border-radius: 8px;
            background: #fff;
            padding: 3px;
        }
        .retail-pdf-signature {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            min-height: 108px;
        }
        .retail-pdf-sign-line {
            margin-top: 28px;
            border-top: 1px solid #7b8da0;
            padding-top: 6px;
            text-align: center;
            color: #52687d;
            font-weight: 700;
        }
    `;
}

function buildInvoiceHtml(data) {
    return `
        <div class="retail-pdf-root">
            <style>${getTemplateStyles()}</style>
            <div class="retail-pdf-shell">
                ${data.isVoidedSale ? `<div class="retail-pdf-watermark">VOIDED</div>` : ""}
                <section class="retail-pdf-header">
                    <div class="retail-pdf-brand">
                        <h1>${escapeHtml(data.companyName)}</h1>
                        <p>${escapeHtml(data.addressLine1)}</p>
                        <p>${escapeHtml(data.addressLine2)}</p>
                        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
                        <p><strong>GSTIN:</strong> ${escapeHtml(data.taxId)}</p>
                    </div>
                    <div class="retail-pdf-title-panel">
                        <h2>Tax Invoice</h2>
                        <span class="retail-pdf-kicker">${escapeHtml(data.copyType)}</span>
                    </div>
                </section>

                <section class="retail-pdf-grid-four">
                    <div class="retail-pdf-block">
                        <h3>Bill To</h3>
                        <p><strong>${escapeHtml(data.customerName)}</strong></p>
                        <p>${escapeHtml(data.customerPhone)}</p>
                        <p>${escapeHtml(data.customerEmail)}</p>
                        <p>${escapeHtml(data.customerAddress)}</p>
                    </div>
                    <div class="retail-pdf-block">
                        <h3>Ship To</h3>
                        <p><strong>${escapeHtml(data.customerName)}</strong></p>
                        <p>${escapeHtml(data.customerPhone)}</p>
                        <p>${escapeHtml(data.customerEmail)}</p>
                        <p>${escapeHtml(data.customerAddress)}</p>
                    </div>
                    <div class="retail-pdf-block">
                        <h3>Transportation</h3>
                        <p><strong>Mode:</strong> ${escapeHtml(data.transportMode)}</p>
                        <p><strong>Vehicle #:</strong> ${escapeHtml(data.vehicleNumber)}</p>
                        <p><strong>Date:</strong> ${escapeHtml(data.transportDate)}</p>
                    </div>
                    <div class="retail-pdf-block">
                        <h3>Invoice Details</h3>
                        <p><strong>No.:</strong> ${escapeHtml(data.invoiceNumber)}</p>
                        <p><strong>Date:</strong> ${escapeHtml(data.invoiceDate)}</p>
                        <p><strong>Time:</strong> ${escapeHtml(data.invoiceTime)}</p>
                    </div>
                </section>

                <section class="retail-pdf-table-wrap">
                    <table class="retail-pdf-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Item Name</th>
                                <th>HSN / SAC</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Taxable Amount</th>
                                <th>CGST</th>
                                <th>SGST</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>${renderLineItems(data.items)}</tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="align-right">Total</td>
                                <td class="align-right">${escapeHtml(String(data.totalQty))}</td>
                                <td></td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.totalTaxableAmount || 0))}</td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.totalCGST || 0))}</td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.totalSGST || 0))}</td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.totalAmount || 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </section>

                <section class="retail-pdf-grid-three">
                    <div class="retail-pdf-tax-box">
                        <h3>Tax Summary</h3>
                        <table class="retail-pdf-tax-table">
                            <thead>
                                <tr>
                                    <th>Tax Type</th>
                                    <th>Taxable Amount</th>
                                    <th>Rate</th>
                                    <th>Tax Amount</th>
                                </tr>
                            </thead>
                            <tbody>${renderTaxRows(data.taxSummary)}</tbody>
                        </table>
                    </div>
                    <div class="retail-pdf-summary">
                        <h3>Invoice Totals</h3>
                        <table class="retail-pdf-summary-table">
                            <tr><td>Items Subtotal</td><td>${escapeHtml(formatCurrency(data.subTotal || 0))}</td></tr>
                            <tr><td>Item Discount</td><td>${escapeHtml(formatCurrency(data.totalLineDiscount || 0))}</td></tr>
                            <tr><td>Item Tax</td><td>${escapeHtml(formatCurrency(data.itemTax || 0))}</td></tr>
                            <tr><td>Order Discount</td><td>${escapeHtml(formatCurrency(data.invoiceDiscount || 0))}</td></tr>
                            <tr><td>Order Tax</td><td>${escapeHtml(formatCurrency(data.orderTax || 0))}</td></tr>
                            <tr><td>Received</td><td>${escapeHtml(formatCurrency(data.receivedAmount || 0))}</td></tr>
                            <tr><td>Balance</td><td>${escapeHtml(formatCurrency(data.balanceAmount || 0))}</td></tr>
                            <tr class="total-row"><td>Grand Total</td><td>${escapeHtml(formatCurrency(data.grandTotal || 0))}</td></tr>
                        </table>
                    </div>
                </section>

                <section class="retail-pdf-detail-footer">
                    <div class="retail-pdf-note">
                        <h3>Amount In Words</h3>
                        <p>${escapeHtml(data.amountInWords)}</p>
                    </div>
                    <div class="retail-pdf-payment-box">
                        <div class="retail-pdf-note">
                            <h3>Payment Mode</h3>
                            <p>${escapeHtml(data.paymentMode)}</p>
                        </div>
                        <div class="retail-pdf-note">
                            <h3>Description</h3>
                            <p>${escapeHtml(data.description)}</p>
                        </div>
                    </div>
                </section>

                <section class="retail-pdf-footer">
                    <div class="retail-pdf-note">
                        <h3>Bank Details</h3>
                        <div class="retail-pdf-qr">
                            <img src="${escapeHtml(data.upiQRCodeUrl)}" alt="UPI QR Code">
                            <div>
                                <p><strong>${escapeHtml(data.bankName)}</strong></p>
                                <p>${escapeHtml(data.bankBranch)}</p>
                                <p><strong>A/C No:</strong> ${escapeHtml(data.accountNumber)}</p>
                                <p><strong>IFSC:</strong> ${escapeHtml(data.ifscCode)}</p>
                                <p><strong>Account Holder:</strong> ${escapeHtml(data.accountHolderName)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="retail-pdf-signature">
                        <div class="retail-pdf-note">
                            <h3>Terms</h3>
                            <p>${escapeHtml(data.termsAndConditions)}</p>
                        </div>
                        <div class="retail-pdf-sign-line">Authorized Signatory</div>
                    </div>
                </section>
            </div>
        </div>
    `;
}

function getStoreDetails(storeName) {
    return MONETA_STORE_CONFIG[storeName] || MONETA_STORE_CONFIG.default;
}

function buildPdfData(sale, paymentRecord = null) {
    const storeDetails = getStoreDetails(sale.store);
    const saleDate = toDate(sale.saleDate);
    const items = (sale.lineItems || []).map(item => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const lineDiscountPercentage = Number(item.lineDiscountPercentage) || 0;
        const gross = quantity * unitPrice;
        const lineDiscountAmount = Number(item.lineDiscountAmount) || (gross * (lineDiscountPercentage / 100));
        const taxableAmount = Number(item.taxableAmount) || (gross - lineDiscountAmount);
        const cgstPercentage = Number(item.cgstPercentage) || 0;
        const sgstPercentage = Number(item.sgstPercentage) || 0;
        const cgstAmount = Number(item.cgstAmount) || (taxableAmount * (cgstPercentage / 100));
        const sgstAmount = Number(item.sgstAmount) || (taxableAmount * (sgstPercentage / 100));
        const taxAmount = Number(item.taxAmount) || (cgstAmount + sgstAmount);
        const lineTotal = Number(item.lineTotal) || (taxableAmount + taxAmount);

        return {
            ...item,
            taxableAmount,
            cgstPercentage,
            sgstPercentage,
            cgstAmount,
            sgstAmount,
            taxAmount,
            lineTotal
        };
    });
    const taxSummary = buildTaxSummary(items);
    const isVoidedSale = String(sale.saleStatus || "").trim().toLowerCase() === "voided";

    return {
        copyType: "ORIGINAL FOR RECEIPT",
        companyName: storeDetails.companyName,
        addressLine1: storeDetails.addressLine1,
        addressLine2: storeDetails.addressLine2,
        email: storeDetails.email,
        taxId: storeDetails.taxId,
        storeName: sale.store || "-",
        saleType: sale.saleType || "-",
        invoiceNumber: sale.saleId || sale.manualVoucherNumber || "invoice",
        voucherNumber: sale.manualVoucherNumber || "-",
        invoiceDate: formatDate(saleDate),
        invoiceTime: formatTime(saleDate),
        customerName: sale.customerInfo?.name || "Walk-in Customer",
        customerPhone: sale.customerInfo?.phone || "-",
        customerEmail: sale.customerInfo?.email || "-",
        customerAddress: sale.customerInfo?.address || "-",
        salesCatalogueName: sale.salesCatalogueName || "-",
        salesSeasonName: sale.salesSeasonName || "-",
        paymentStatus: sale.paymentStatus || "Unpaid",
        saleStatus: sale.saleStatus || "Active",
        isVoidedSale,
        transportMode: "-",
        vehicleNumber: "-",
        transportDate: formatDate(saleDate),
        paymentMode: paymentRecord?.paymentMode || "Not captured",
        description: sale.saleNotes || paymentRecord?.notes || "-",
        items,
        totalQty: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        totalTaxableAmount: items.reduce((sum, item) => sum + (Number(item.taxableAmount) || 0), 0),
        totalCGST: items.reduce((sum, item) => sum + (Number(item.cgstAmount) || 0), 0),
        totalSGST: items.reduce((sum, item) => sum + (Number(item.sgstAmount) || 0), 0),
        totalAmount: Number(sale.financials?.grandTotal) || 0,
        taxSummary,
        subTotal: Number(sale.financials?.itemsSubtotal) || 0,
        totalLineDiscount: Number(sale.financials?.totalLineDiscount) || 0,
        invoiceDiscount: Number(sale.financials?.orderDiscountAmount) || 0,
        itemTax: Number(sale.financials?.totalItemLevelTax ?? sale.financials?.totalTax) || 0,
        orderTax: Number(sale.financials?.orderLevelTaxAmount) || 0,
        grandTotal: Number(sale.financials?.grandTotal) || 0,
        receivedAmount: Number(sale.totalAmountPaid) || 0,
        balanceAmount: Number(sale.balanceDue) || 0,
        amountInWords: amountToWords(Number(sale.financials?.grandTotal) || 0, "INR"),
        bankName: storeDetails.paymentDetails?.bankName || "-",
        bankBranch: storeDetails.paymentDetails?.branch || "-",
        accountNumber: storeDetails.paymentDetails?.accountNumber || "-",
        ifscCode: storeDetails.paymentDetails?.ifscCode || "-",
        accountHolderName: storeDetails.paymentDetails?.accountHolderName || "-",
        upiQRCodeUrl: storeDetails.paymentDetails?.upiQRCodeUrl || "",
        termsAndConditions: storeDetails.terms || "-"
    };
}

function buildCreditNoteData(sale, returnRecord) {
    const storeDetails = getStoreDetails(sale.store);
    const returnDate = toDate(returnRecord.returnDate || returnRecord.createdOn);
    const items = (returnRecord.items || []).map(item => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const lineDiscountPercentage = Number(item.lineDiscountPercentage) || 0;
        const gross = quantity * unitPrice;
        const lineDiscountAmount = Number(item.lineDiscountAmount) || (gross * (lineDiscountPercentage / 100));
        const taxableAmount = Number(item.taxableAmount) || (gross - lineDiscountAmount);
        const cgstAmount = Number(item.cgstAmount) || (taxableAmount * ((Number(item.cgstPercentage) || 0) / 100));
        const sgstAmount = Number(item.sgstAmount) || (taxableAmount * ((Number(item.sgstPercentage) || 0) / 100));
        const lineTotal = Number(item.lineTotal) || (taxableAmount + cgstAmount + sgstAmount);

        return {
            ...item,
            quantity,
            unitPrice,
            taxableAmount,
            cgstAmount,
            sgstAmount,
            lineTotal
        };
    });
    const taxSummary = buildTaxSummary(items);
    const returnedAmount = Number(returnRecord.totalReturnedAmount) || items.reduce((sum, item) => sum + (Number(item.lineTotal) || 0), 0);

    return {
        copyType: "CUSTOMER COPY",
        companyName: storeDetails.companyName,
        addressLine1: storeDetails.addressLine1,
        addressLine2: storeDetails.addressLine2,
        email: storeDetails.email,
        taxId: storeDetails.taxId,
        customerName: sale.customerInfo?.name || "Walk-in Customer",
        customerPhone: sale.customerInfo?.phone || "-",
        customerEmail: sale.customerInfo?.email || "-",
        customerAddress: sale.customerInfo?.address || "-",
        originalInvoiceNumber: sale.saleId || sale.manualVoucherNumber || "-",
        creditNoteNumber: returnRecord.returnId || returnRecord.id || `CRN-${Date.now()}`,
        creditNoteDate: formatDate(returnDate),
        creditNoteTime: formatTime(returnDate),
        returnReason: returnRecord.reason || "-",
        items,
        totalQty: Number(returnRecord.totalReturnedQuantity) || items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
        totalTaxableAmount: items.reduce((sum, item) => sum + (Number(item.taxableAmount) || 0), 0),
        totalCGST: items.reduce((sum, item) => sum + (Number(item.cgstAmount) || 0), 0),
        totalSGST: items.reduce((sum, item) => sum + (Number(item.sgstAmount) || 0), 0),
        totalAmount: returnedAmount,
        taxSummary,
        amountInWords: amountToWords(returnedAmount, "INR"),
        currentInvoiceGrandTotal: Number(sale.financials?.grandTotal) || 0,
        currentBalanceDue: Number(sale.balanceDue) || 0,
        currentCreditBalance: Number(sale.creditBalance) || 0,
        payableToCustomer: Number(sale.creditBalance) || 0
    };
}

function buildCreditNoteHtml(data) {
    return `
        <div class="retail-pdf-root">
            <style>${getTemplateStyles()}</style>
            <div class="retail-pdf-shell">
                <section class="retail-pdf-header">
                    <div class="retail-pdf-brand">
                        <h1>${escapeHtml(data.companyName)}</h1>
                        <p>${escapeHtml(data.addressLine1)}</p>
                        <p>${escapeHtml(data.addressLine2)}</p>
                        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
                        <p><strong>GSTIN:</strong> ${escapeHtml(data.taxId)}</p>
                    </div>
                    <div class="retail-pdf-title-panel">
                        <h2>Credit Note</h2>
                        <span class="retail-pdf-kicker">${escapeHtml(data.copyType)}</span>
                    </div>
                </section>

                <section class="retail-pdf-grid-four">
                    <div class="retail-pdf-block">
                        <h3>Customer</h3>
                        <p><strong>${escapeHtml(data.customerName)}</strong></p>
                        <p>${escapeHtml(data.customerPhone)}</p>
                        <p>${escapeHtml(data.customerEmail)}</p>
                        <p>${escapeHtml(data.customerAddress)}</p>
                    </div>
                    <div class="retail-pdf-block">
                        <h3>Reference</h3>
                        <p><strong>Original Invoice:</strong> ${escapeHtml(data.originalInvoiceNumber)}</p>
                        <p><strong>Credit Note No:</strong> ${escapeHtml(data.creditNoteNumber)}</p>
                        <p><strong>Date:</strong> ${escapeHtml(data.creditNoteDate)}</p>
                        <p><strong>Time:</strong> ${escapeHtml(data.creditNoteTime)}</p>
                    </div>
                    <div class="retail-pdf-block">
                        <h3>Return Summary</h3>
                        <p><strong>Returned Qty:</strong> ${escapeHtml(String(data.totalQty || 0))}</p>
                        <p><strong>Returned Amount:</strong> ${escapeHtml(formatCurrency(data.totalAmount || 0))}</p>
                        <p><strong>Current Balance Due:</strong> ${escapeHtml(formatCurrency(data.currentBalanceDue || 0))}</p>
                        <p><strong>Current Credit Balance:</strong> ${escapeHtml(formatCurrency(data.currentCreditBalance || 0))}</p>
                    </div>
                    <div class="retail-pdf-block">
                        <h3>Return Reason</h3>
                        <p>${escapeHtml(data.returnReason)}</p>
                    </div>
                </section>

                <section class="retail-pdf-table-wrap">
                    <table class="retail-pdf-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Item Name</th>
                                <th>HSN / SAC</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Taxable Amount</th>
                                <th>CGST</th>
                                <th>SGST</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>${renderLineItems(data.items)}</tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="align-right">Total</td>
                                <td class="align-right">${escapeHtml(String(data.totalQty || 0))}</td>
                                <td></td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.totalTaxableAmount || 0))}</td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.totalCGST || 0))}</td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.totalSGST || 0))}</td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.totalAmount || 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </section>

                <section class="retail-pdf-grid-three">
                    <div class="retail-pdf-tax-box">
                        <h3>Tax Summary</h3>
                        <table class="retail-pdf-tax-table">
                            <thead>
                                <tr>
                                    <th>Tax Type</th>
                                    <th>Taxable Amount</th>
                                    <th>Rate</th>
                                    <th>Tax Amount</th>
                                </tr>
                            </thead>
                            <tbody>${renderTaxRows(data.taxSummary)}</tbody>
                        </table>
                    </div>
                    <div class="retail-pdf-summary">
                        <h3>Credit Note Totals</h3>
                        <table class="retail-pdf-summary-table">
                            <tr><td>Credit Note Amount</td><td>${escapeHtml(formatCurrency(data.totalAmount || 0))}</td></tr>
                            <tr><td>Current Invoice Total</td><td>${escapeHtml(formatCurrency(data.currentInvoiceGrandTotal || 0))}</td></tr>
                            <tr><td>Current Balance Due</td><td>${escapeHtml(formatCurrency(data.currentBalanceDue || 0))}</td></tr>
                            <tr><td>Current Credit Balance</td><td>${escapeHtml(formatCurrency(data.currentCreditBalance || 0))}</td></tr>
                            <tr class="total-row"><td>Amount Payable To Customer</td><td>${escapeHtml(formatCurrency(data.payableToCustomer || 0))}</td></tr>
                        </table>
                    </div>
                </section>

                <section class="retail-pdf-detail-footer">
                    <div class="retail-pdf-note">
                        <h3>Amount In Words</h3>
                        <p>${escapeHtml(data.amountInWords)}</p>
                    </div>
                    <div class="retail-pdf-note">
                        <h3>Note</h3>
                        <p>This credit note documents returned items against the referenced invoice. Original invoice remains unchanged for audit integrity.</p>
                    </div>
                </section>
            </div>
        </div>
    `;
}

export async function downloadRetailSalePdf(sale, paymentRecord = null) {
    if (!window.html2pdf) {
        throw new Error("PDF library is not available in this Moneta build.");
    }

    if (!sale) {
        throw new Error("Retail sale data is missing.");
    }

    const data = buildPdfData(sale, paymentRecord);
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.zIndex = "-1";
    host.innerHTML = buildInvoiceHtml(data);
    document.body.appendChild(host);

    try {
        const target = host.firstElementChild;
        await window.html2pdf().set({
            margin: 0,
            filename: `${data.invoiceNumber}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait"
            },
            pagebreak: {
                mode: ["avoid-all", "css", "legacy"]
            }
        }).from(target).save();
    } finally {
        host.remove();
    }
}

export async function downloadRetailReturnCreditNotePdf(sale, returnRecord) {
    if (!window.html2pdf) {
        throw new Error("PDF library is not available in this Moneta build.");
    }

    if (!sale) {
        throw new Error("Retail sale data is missing.");
    }

    if (!returnRecord) {
        throw new Error("Return record is missing.");
    }

    const data = buildCreditNoteData(sale, returnRecord);
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.zIndex = "-1";
    host.innerHTML = buildCreditNoteHtml(data);
    document.body.appendChild(host);

    try {
        const target = host.firstElementChild;
        const safeInvoiceNo = String(data.originalInvoiceNumber || "invoice").replaceAll("/", "-");
        const safeNoteNo = String(data.creditNoteNumber || "credit-note").replaceAll("/", "-");
        await window.html2pdf().set({
            margin: 0,
            filename: `${safeInvoiceNo}-${safeNoteNo}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: {
                unit: "mm",
                format: "a4",
                orientation: "portrait"
            },
            pagebreak: {
                mode: ["avoid-all", "css", "legacy"]
            }
        }).from(target).save();
    } finally {
        host.remove();
    }
}
