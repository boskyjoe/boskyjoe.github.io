import { CONSIGNMENT_STORE_NAME } from "../../config/store-config.js";
import { amountToWords } from "../../shared/utils/amount-words.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import { getDefaultRetailStoreName, getStoreConfigInvoiceDetails, getStoreQuoteTheme } from "../../shared/store-config.js";

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

function formatDateTime(value) {
    const date = toDate(value);
    return date ? date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }) : "-";
}

function normalizeText(value) {
    return String(value || "").trim();
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function getStoreDetails(storeName = "") {
    if (storeName === CONSIGNMENT_STORE_NAME) {
        return getStoreConfigInvoiceDetails();
    }

    return getStoreConfigInvoiceDetails(storeName);
}

function getQuoteTheme(storeName = "") {
    return getStoreQuoteTheme(storeName);
}

function resolveQuoteDisplayStatus(quote = {}) {
    const quoteStatus = normalizeText(quote.quoteStatus || "Draft");
    if (quoteStatus === "Converted" && normalizeText(quote.convertedSaleStatus) === "Voided") {
        return "Converted (Sale Voided)";
    }
    return quoteStatus;
}

function resolveWatermarkLabel(quote = {}) {
    const quoteStatus = normalizeText(quote.quoteStatus || "Draft");
    if (quoteStatus === "Draft") return "DRAFT";
    if (quoteStatus === "Accepted") return "ACCEPTED";
    if (quoteStatus === "Rejected") return "REJECTED";
    if (quoteStatus === "Cancelled") return "CANCELLED";
    if (quoteStatus === "Expired") return "EXPIRED";
    if (quoteStatus === "Superseded") return "SUPERSEDED";
    if (quoteStatus === "Converted" && normalizeText(quote.convertedSaleStatus) === "Voided") return "SALE VOIDED";
    if (quoteStatus === "Converted") return "CONVERTED";
    return "";
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
        taxableAmount: roundCurrency(row.taxableAmount),
        taxAmount: roundCurrency(row.taxAmount)
    }));
}

function renderLineItems(lineItems = []) {
    return lineItems.map((item, index) => `
        <tr>
            <td class="align-center">${index + 1}</td>
            <td>${escapeHtml(item.productName || "-")}</td>
            <td>${escapeHtml(item.categoryName || "-")}</td>
            <td class="align-right">${escapeHtml(String(item.quotedQty || 0))}</td>
            <td class="align-right">${escapeHtml(formatCurrency(item.unitPrice || 0))}</td>
            <td class="align-right">${escapeHtml(formatCurrency(item.lineDiscountAmount || 0))}</td>
            <td class="align-right">${escapeHtml(formatCurrency(item.taxAmount || 0))}</td>
            <td class="align-right strong">${escapeHtml(formatCurrency(item.lineTotal || 0))}</td>
        </tr>
    `).join("");
}

function renderTaxRows(rows = []) {
    if (!rows.length) {
        return `
            <tr>
                <td colspan="4" class="empty-note">No GST applied on this quote.</td>
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

function getTemplateStyles(theme) {
    return `
        .quote-pdf-root {
            width: 210mm;
            padding: 5mm;
            background: #ffffff;
            color: #1f2933;
            font-family: "Segoe UI", Arial, sans-serif;
            font-size: 10px;
            line-height: 1.26;
        }
        .quote-pdf-shell {
            position: relative;
            border: 1px solid #dbe4ea;
            border-radius: 14px;
            overflow: hidden;
            background: #ffffff;
        }
        .quote-pdf-watermark {
            position: absolute;
            left: 50%;
            top: 49%;
            transform: translate(-50%, -50%) rotate(-24deg);
            font-size: 74px;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: rgba(120, 41, 14, 0.12);
            border: 7px solid rgba(120, 41, 14, 0.12);
            border-radius: 14px;
            padding: 16px 28px;
            pointer-events: none;
            z-index: 10;
            white-space: nowrap;
        }
        .quote-pdf-header {
            display: grid;
            grid-template-columns: 1.4fr 0.9fr;
            gap: 12px;
            padding: 14px 16px;
            background: linear-gradient(135deg, ${theme.gradientStart} 0%, ${theme.gradientEnd} 100%);
            border-bottom: 1px solid #dbe4ea;
        }
        .quote-pdf-brand h1 {
            margin: 0 0 4px;
            font-size: 20px;
            letter-spacing: 0.04em;
            color: ${theme.accentStrong};
        }
        .quote-pdf-brand p,
        .quote-pdf-meta p,
        .quote-pdf-block p,
        .quote-pdf-note p {
            margin: 2px 0;
        }
        .quote-pdf-brand-line {
            color: #516779;
            font-weight: 600;
        }
        .quote-pdf-kicker {
            display: inline-block;
            padding: 4px 9px;
            border-radius: 999px;
            background: ${theme.accentStrong};
            color: #ffffff;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        .quote-pdf-title-panel {
            padding: 12px 14px;
            border: 1px solid rgba(15, 53, 86, 0.14);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.9);
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            justify-content: center;
            text-align: right;
        }
        .quote-pdf-title-panel h2 {
            margin: 0;
            font-size: 22px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: ${theme.accentStrong};
        }
        .quote-pdf-title-panel .quote-pdf-kicker {
            margin: 6px 0 0;
        }
        .quote-pdf-grid-four {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
            padding: 10px 16px;
        }
        .quote-pdf-grid-three {
            display: grid;
            grid-template-columns: 1.05fr 0.95fr;
            gap: 10px;
            padding: 0 16px 10px;
        }
        .quote-pdf-footer-grid {
            display: grid;
            grid-template-columns: 1.05fr 0.95fr;
            gap: 10px;
            padding: 0 16px 14px;
        }
        .quote-pdf-block,
        .quote-pdf-note,
        .quote-pdf-summary,
        .quote-pdf-tax-box {
            border: 1px solid #dbe4ea;
            border-radius: 12px;
            background: #ffffff;
            padding: 10px 12px;
        }
        .quote-pdf-block h3,
        .quote-pdf-summary h3,
        .quote-pdf-tax-box h3,
        .quote-pdf-note h3 {
            margin: 0 0 5px;
            font-size: 10px;
            color: #35546f;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .quote-pdf-table-wrap {
            padding: 0 16px 10px;
        }
        .quote-pdf-table,
        .quote-pdf-tax-table,
        .quote-pdf-summary-table {
            width: 100%;
            border-collapse: collapse;
        }
        .quote-pdf-table th,
        .quote-pdf-table td,
        .quote-pdf-tax-table th,
        .quote-pdf-tax-table td,
        .quote-pdf-summary-table td {
            border: 1px solid #dbe4ea;
            padding: 6px 7px;
            vertical-align: top;
        }
        .quote-pdf-table th,
        .quote-pdf-tax-table th {
            background: ${theme.accentSoft};
            color: #48657f;
            font-size: 9px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }
        .quote-pdf-table tfoot td {
            background: #f8fbfd;
            font-weight: 700;
        }
        .quote-pdf-summary-table td:first-child {
            color: #5f7488;
        }
        .quote-pdf-summary-table td:last-child {
            text-align: right;
            font-weight: 700;
        }
        .quote-pdf-summary-table tr.total-row td {
            background: ${theme.accentSoft};
            color: ${theme.accentStrong};
            font-size: 11px;
        }
        .quote-pdf-footer-note {
            min-height: 108px;
        }
        .quote-pdf-signature {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            min-height: 108px;
        }
        .quote-pdf-sign-line {
            margin-top: 30px;
            border-top: 1px solid #7b8da0;
            padding-top: 6px;
            text-align: center;
            color: #52687d;
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
    `;
}

function buildQuotePdfData(lead = null, quoteInput = null) {
    if (!quoteInput) {
        throw new Error("Quote data is missing.");
    }

    const storeName = normalizeText(quoteInput.store || getDefaultRetailStoreName());
    const storeDetails = getStoreDetails(storeName);
    const theme = getQuoteTheme(storeName);
    const lineItems = Array.isArray(quoteInput.lineItems) ? quoteInput.lineItems : [];

    if (!lineItems.length) {
        throw new Error("Add at least one quoted product line before generating the PDF.");
    }

    const totals = quoteInput.totals || {};
    const taxSummary = buildTaxSummary(lineItems);
    const quoteStatus = normalizeText(quoteInput.quoteStatus || "Draft");
    const businessQuoteId = normalizeText(quoteInput.businessQuoteId || "");
    const versionNo = Number(quoteInput.versionNo) || 0;
    const validUntil = quoteInput.validUntil || null;
    const customerName = normalizeText(quoteInput.customerName || quoteInput.customerSnapshot?.customerName || lead?.customerName || "Customer");
    const customerPhone = normalizeText(quoteInput.customerPhone || quoteInput.customerSnapshot?.customerPhone || lead?.customerPhone || "-") || "-";
    const customerEmail = normalizeText(quoteInput.customerEmail || quoteInput.customerSnapshot?.customerEmail || lead?.customerEmail || "-") || "-";
    const customerAddress = normalizeText(quoteInput.customerAddress || quoteInput.customerSnapshot?.customerAddress || lead?.customerAddress || "-") || "-";
    const quoteDate = quoteInput.updatedOn || quoteInput.createdOn || new Date();
    const preparedBy = normalizeText(quoteInput.updatedBy || quoteInput.createdBy || lead?.assignedTo || "-") || "-";
    const assignedTo = normalizeText(lead?.assignedTo || quoteInput.leadSnapshot?.assignedTo || "-") || "-";
    const leadBusinessId = normalizeText(lead?.businessLeadId || quoteInput.businessLeadId || "-") || "-";
    const leadSource = normalizeText(lead?.leadSource || quoteInput.leadSnapshot?.leadSource || "-") || "-";
    const leadNotes = normalizeText(quoteInput.quoteNotes || lead?.leadNotes || "-") || "-";
    const terms = normalizeText(storeDetails.terms || "-") || "-";
    const watermark = resolveWatermarkLabel(quoteInput);
    const displayStatus = resolveQuoteDisplayStatus(quoteInput);
    const filenameBase = businessQuoteId || `quote-${Date.now()}`;
    const copyType = quoteStatus === "Draft"
        ? "Draft Preview"
        : quoteStatus === "Sent"
            ? "Customer Copy"
            : "Archived Copy";

    return {
        theme,
        watermark,
        copyType,
        title: theme.title,
        companyName: storeName === "Consignment" ? "Consignment Channel" : (storeDetails.companyName || theme.channelLabel),
        legalEntityName: storeDetails.companyName || theme.channelLabel,
        strapline: theme.strapline,
        addressLine1: storeDetails.addressLine1 || "-",
        addressLine2: storeDetails.addressLine2 || "-",
        email: storeDetails.email || "-",
        taxId: storeDetails.taxId || "-",
        channelLabel: theme.channelLabel,
        headerBadgeLabel: theme.badgeLabel,
        quoteNumber: businessQuoteId || "Draft Quote",
        versionLabel: versionNo > 0 ? `Version ${versionNo}` : "Draft Version",
        quoteDate: formatDate(quoteDate),
        quoteDateTime: formatDateTime(quoteDate),
        validUntil: formatDate(validUntil),
        status: displayStatus,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        leadBusinessId,
        leadSource,
        assignedTo,
        preparedBy,
        items: lineItems,
        totalQty: lineItems.reduce((sum, item) => sum + (Number(item.quotedQty) || 0), 0),
        totalTaxableAmount: lineItems.reduce((sum, item) => sum + (Number(item.taxableAmount) || 0), 0),
        totalTax: lineItems.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0),
        grandTotal: Number(totals.grandTotal) || 0,
        subTotal: Number(totals.subtotal) || 0,
        discountTotal: Number(totals.discountTotal) || 0,
        taxTotal: Number(totals.taxTotal) || 0,
        amountInWords: amountToWords(Number(totals.grandTotal) || 0, "INR"),
        taxSummary,
        notes: leadNotes,
        termsAndConditions: terms,
        documentNote: quoteStatus === "Draft"
            ? "This PDF is a draft preview generated from the current quote workspace values in Moneta."
            : "This quote is generated from Moneta using the saved quote snapshot for audit-safe reference.",
        bankName: storeDetails.paymentDetails?.bankName || "-",
        bankBranch: storeDetails.paymentDetails?.branch || "-",
        accountNumber: storeDetails.paymentDetails?.accountNumber || "-",
        ifscCode: storeDetails.paymentDetails?.ifscCode || "-",
        accountHolderName: storeDetails.paymentDetails?.accountHolderName || "-",
        acceptanceSummary: quoteStatus === "Accepted"
            ? `${normalizeText(quoteInput.acceptedByCustomerName || customerName) || customerName}${normalizeText(quoteInput.acceptedVia) ? ` via ${normalizeText(quoteInput.acceptedVia)}` : ""} on ${formatDate(quoteInput.acceptedOn)}`
            : "-",
        conversionSummary: quoteStatus === "Converted"
            ? `${normalizeText(quoteInput.convertedToSaleNumber || "-")} · ${normalizeText(quoteInput.conversionOutcome || "Sale Active")}`
            : "-",
        filename: `${String(filenameBase).replaceAll("/", "-")}.pdf`
    };
}

function buildQuoteHtml(data) {
    return `
        <div class="quote-pdf-root">
            <style>${getTemplateStyles(data.theme)}</style>
            <div class="quote-pdf-shell">
                ${data.watermark ? `<div class="quote-pdf-watermark">${escapeHtml(data.watermark)}</div>` : ""}
                <section class="quote-pdf-header">
                    <div class="quote-pdf-brand">
                        <span class="quote-pdf-kicker">${escapeHtml(data.headerBadgeLabel)}</span>
                        <h1>${escapeHtml(data.companyName)}</h1>
                        ${data.companyName !== data.legalEntityName ? `<p class="quote-pdf-brand-line">Prepared under ${escapeHtml(data.legalEntityName)}</p>` : ""}
                        <p class="quote-pdf-brand-line">${escapeHtml(data.strapline)}</p>
                        <p>${escapeHtml(data.addressLine1)}</p>
                        <p>${escapeHtml(data.addressLine2)}</p>
                        <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
                        <p><strong>GSTIN:</strong> ${escapeHtml(data.taxId)}</p>
                    </div>
                    <div class="quote-pdf-title-panel">
                        <h2>${escapeHtml(data.title)}</h2>
                        <span class="quote-pdf-kicker">${escapeHtml(data.copyType)}</span>
                    </div>
                </section>

                <section class="quote-pdf-grid-four">
                    <div class="quote-pdf-block">
                        <h3>Customer</h3>
                        <p><strong>${escapeHtml(data.customerName)}</strong></p>
                        <p>${escapeHtml(data.customerPhone)}</p>
                        <p>${escapeHtml(data.customerEmail)}</p>
                        <p>${escapeHtml(data.customerAddress)}</p>
                    </div>
                    <div class="quote-pdf-block">
                        <h3>Quote Details</h3>
                        <p><strong>Quote No:</strong> ${escapeHtml(data.quoteNumber)}</p>
                        <p><strong>${escapeHtml(data.versionLabel)}</strong></p>
                        <p><strong>Quote Date:</strong> ${escapeHtml(data.quoteDate)}</p>
                        <p><strong>Valid Until:</strong> ${escapeHtml(data.validUntil)}</p>
                    </div>
                    <div class="quote-pdf-block">
                        <h3>Commercial Context</h3>
                        <p><strong>Status:</strong> ${escapeHtml(data.status)}</p>
                        <p><strong>Prepared By:</strong> ${escapeHtml(data.preparedBy)}</p>
                        <p><strong>Assigned To:</strong> ${escapeHtml(data.assignedTo)}</p>
                        <p><strong>Generated:</strong> ${escapeHtml(data.quoteDateTime)}</p>
                    </div>
                    <div class="quote-pdf-block">
                        <h3>Lead Reference</h3>
                        <p><strong>Lead ID:</strong> ${escapeHtml(data.leadBusinessId)}</p>
                        <p><strong>Lead Source:</strong> ${escapeHtml(data.leadSource)}</p>
                        <p><strong>Channel:</strong> ${escapeHtml(data.channelLabel)}</p>
                    </div>
                </section>

                <section class="quote-pdf-table-wrap">
                    <table class="quote-pdf-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Item Name</th>
                                <th>Category</th>
                                <th>Qty</th>
                                <th>Rate</th>
                                <th>Discount</th>
                                <th>Tax</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>${renderLineItems(data.items)}</tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" class="align-right">Total</td>
                                <td class="align-right">${escapeHtml(String(data.totalQty || 0))}</td>
                                <td></td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.discountTotal || 0))}</td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.totalTax || 0))}</td>
                                <td class="align-right">${escapeHtml(formatCurrency(data.grandTotal || 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </section>

                <section class="quote-pdf-grid-three">
                    <div class="quote-pdf-tax-box">
                        <h3>Tax Summary</h3>
                        <table class="quote-pdf-tax-table">
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
                    <div class="quote-pdf-summary">
                        <h3>Quote Totals</h3>
                        <table class="quote-pdf-summary-table">
                            <tr><td>Items Subtotal</td><td>${escapeHtml(formatCurrency(data.subTotal || 0))}</td></tr>
                            <tr><td>Discount Total</td><td>${escapeHtml(formatCurrency(data.discountTotal || 0))}</td></tr>
                            <tr><td>Taxable Amount</td><td>${escapeHtml(formatCurrency(data.totalTaxableAmount || 0))}</td></tr>
                            <tr><td>Tax Total</td><td>${escapeHtml(formatCurrency(data.taxTotal || 0))}</td></tr>
                            <tr class="total-row"><td>Grand Total</td><td>${escapeHtml(formatCurrency(data.grandTotal || 0))}</td></tr>
                        </table>
                    </div>
                </section>

                <section class="quote-pdf-footer-grid">
                    <div class="quote-pdf-note quote-pdf-footer-note">
                        <h3>Customer Notes</h3>
                        <p>${escapeHtml(data.notes || "-")}</p>
                        <h3>Amount In Words</h3>
                        <p>${escapeHtml(data.amountInWords)}</p>
                    </div>
                    <div class="quote-pdf-note quote-pdf-footer-note">
                        <h3>Terms</h3>
                        <p>${escapeHtml(data.termsAndConditions)}</p>
                        <h3>Status Notes</h3>
                        <p><strong>Acceptance:</strong> ${escapeHtml(data.acceptanceSummary)}</p>
                        <p><strong>Conversion:</strong> ${escapeHtml(data.conversionSummary)}</p>
                    </div>
                </section>

                <section class="quote-pdf-footer-grid">
                    <div class="quote-pdf-note">
                        <h3>Payment Details</h3>
                        <p><strong>${escapeHtml(data.accountHolderName)}</strong></p>
                        <p>${escapeHtml(data.bankName)}</p>
                        <p>${escapeHtml(data.bankBranch)}</p>
                        <p><strong>A/C No:</strong> ${escapeHtml(data.accountNumber)}</p>
                        <p><strong>IFSC:</strong> ${escapeHtml(data.ifscCode)}</p>
                    </div>
                    <div class="quote-pdf-signature">
                        <div class="quote-pdf-note">
                            <h3>Document Note</h3>
                            <p>${escapeHtml(data.documentNote)}</p>
                        </div>
                        <div class="quote-pdf-sign-line">Authorized Signatory</div>
                    </div>
                </section>
            </div>
        </div>
    `;
}

export async function downloadLeadQuotePdf(lead, quoteInput) {
    if (!window.html2pdf) {
        throw new Error("PDF library is not available in this Moneta build.");
    }

    const data = buildQuotePdfData(lead, quoteInput);
    const host = document.createElement("div");
    host.style.position = "fixed";
    host.style.left = "-10000px";
    host.style.top = "0";
    host.style.zIndex = "-1";
    host.innerHTML = buildQuoteHtml(data);
    document.body.appendChild(host);

    try {
        const target = host.firstElementChild;
        await window.html2pdf().set({
            margin: 0,
            filename: data.filename,
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
