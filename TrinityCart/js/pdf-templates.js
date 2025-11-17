// js/pdf-templates.js

import { formatCurrency,numberToWords } from './utils.js'; 

export function getTastyTreatsInvoiceHTML() {
    return `
        <div class="invoice-container">
            <!-- Header Section -->
            <div class="invoice-header">
                <div class="header-logo">
                    <img src="{{logoUrl}}" alt="Logo" style="max-height: 60px;">
                </div>
                <div class="header-company-details">
                    <h2>{{companyName}}</h2>
                    <p>{{address1}}, {{address2}}</p>
                    <p>{{city}}, {{state}} - {{pincode}}</p>
                    <p><strong>Email:</strong> {{email}}</p>
                    <p><strong>GSTIN:</strong> {{gstin}}</p>
                </div>
                <div class="header-title">
                    <h1>Tax Invoice</h1>
                    <p class="copy-type">{{copyType}}</p>
                </div>
            </div>

            <!-- ✅ NEW: Combined Details Section in a Single Row -->
            <table class="details-master-table">
                <tr>
                    <!-- Bill To -->
                    <td class="details-cell">
                        <h3>Bill To</h3>
                        <p><strong>{{customerName}}</strong></p>
                        <p>{{customerAddress1}}</p>
                        <p><strong>GSTIN:</strong> {{customerGSTIN}}</p>
                        <p><strong>State:</strong> {{customerState}} ({{customerStateCode}})</p>
                    </td>
                    <!-- Ship To -->
                    <td class="details-cell">
                        <h3>Ship To</h3>
                        <p>{{shipToAddress1}}</p>
                        <p>{{shipToCity}}, {{shipToState}} - {{shipToPincode}}</p>
                    </td>
                    <!-- Transport Details -->
                    <td class="details-cell">
                        <h3>Transportation</h3>
                        <p><strong>Mode:</strong> {{transportName}}</p>
                        <p><strong>Vehicle:</strong> {{vehicleNumber}}</p>
                        <p><strong>Date:</strong> {{deliveryDate}}</p>
                    </td>
                    <!-- Invoice Details -->
                    <td class="details-cell">
                        <h3>Invoice Details</h3>
                        <p><strong>No.:</strong> {{invoiceNumber}}</p>
                        <p><strong>Date:</strong> {{invoiceDate}}</p>
                        <p><strong>Time:</strong> {{invoiceTime}}</p>
                    </td>
                </tr>
            </table>

            <!-- Line Items Table -->
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 35%;">Item Name</th>
                        <th style="width: 8%;">HSN/ SAC</th>
                        <th style="width: 8%;">Qty</th>
                        <th style="width: 10%;">Unit Price/ Unit</th>
                        <th style="width: 12%;">Taxable Amount</th>
                        <th style="width: 8%;">CGST</th>
                        <th style="width: 8%;">SGST</th>
                        <th style="width: 12%;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {{lineItems}}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="3" style="text-align: right;"><strong>Total</strong></td>
                        <td style="text-align: center;"><strong>{{totalQty}}</strong></td>
                        <td></td>
                        <td style="text-align: right;"><strong>{{totalTaxableAmount}}</strong></td>
                        <td style="text-align: right;"><strong>{{totalCGST}}</strong></td>
                        <td style="text-align: right;"><strong>{{totalSGST}}</strong></td>
                        <td style="text-align: right;"><strong>{{totalAmount}}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <!-- Tax Summary Table -->
            <table class="tax-summary-table">
                <thead>
                    <tr>
                        <th>Tax type</th>
                        <th>Taxable amount</th>
                        <th>Rate</th>
                        <th>Tax amount</th>
                    </tr>
                </thead>
                <tbody>
                    {{taxSummaryRows}}
                </tbody>
            </table>

            <!-- Amounts Section -->
            <div class="amounts-section">
                <table class="amounts-table">
                    <tr>
                        <td class="amount-label">Sub Total</td>
                        <td class="amount-value">{{subTotal}}</td>
                    </tr>
                    <tr>
                        <td class="amount-label">Total</td>
                        <td class="amount-value">{{grandTotal}}</td>
                    </tr>
                    <tr class="received-row">
                        <td class="amount-label">Received</td>
                        <td class="amount-value">{{receivedAmount}}</td>
                    </tr>
                    <tr class="balance-row">
                        <td class="amount-label">Balance</td>
                        <td class="amount-value">{{balanceAmount}}</td>
                    </tr>
                    <tr class="current-balance-row">
                        <td class="amount-label"><strong>Current Balance</strong></td>
                        <td class="amount-value"><strong>{{currentBalance}}</strong></td>
                    </tr>
                </table>
            </div>

            <!-- Amount in Words -->
            <div class="amount-words">
                <h4>Invoice Amount In Words</h4>
                <p>{{amountInWords}}</p>
            </div>

            <!-- Payment Mode and Description -->
            <table class="payment-info-table">
                <tr>
                    <td style="width: 50%;">
                        <h4>Payment Mode</h4>
                        <p>{{paymentMode}}</p>
                    </td>
                    <td style="width: 50%;">
                        <h4>Description</h4>
                        <p>{{description}}</p>
                    </td>
                </tr>
            </table>

            <!-- Bank Details -->
            <div class="bank-details">
                <h4>Bank Details</h4>
                <p><strong>Name:</strong> {{bankName}}</p>
                <p><strong>Account No.:</strong> {{accountNumber}}</p>
                <p><strong>IFSC code:</strong> {{ifscCode}}</p>
                <p><strong>Account Holder's Name:</strong> {{accountHolderName}}</p>
            </div>

            <!-- Terms and Signature -->
            <div class="footer-section">
                <div class="terms-section">
                    <h4>Terms and conditions</h4>
                    <p>{{termsAndConditions}}</p>
                </div>
                <div class="signature-section">
                    <p><strong>For: {{companyName}}</strong></p>
                    <div class="signature-line"></div>
                    <p>Authorized Signatory</p>
                </div>
            </div>
        </div>
    `;
}

export function getTastyTreatsInvoiceCSS() {
    return `
        @page {
            margin: 8mm;
            size: A4;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 8pt; /* Reduced base font size */
            line-height: 1.4;
            color: #333;
        }

        .invoice-container {
            width: 194mm;
            min-height: 277mm;
            margin: 0 auto;
            background: white;
        }

        /* ✅ NEW: Header with Logo, Company Details, and Title on one line */
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #000;
        }
        .header-logo {
            width: 25%;
            flex-shrink: 0;
        }
        .header-company-details {
            width: 50%;
            text-align: center;
        }
        .header-company-details h2 {
            font-size: 14pt;
            font-weight: bold;
            color: #000;
        }
        .header-title {
            width: 25%;
            text-align: right;
        }
        .header-title h1 {
            font-size: 16pt;
            font-weight: bold;
            color: #000;
        }
        .copy-type {
            font-size: 8pt;
            font-weight: bold;
        }

        /* ✅ NEW: Master Details Table for Bill To, Ship To, etc. */
        .details-master-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            border: 1px solid #000;
        }
        .details-master-table td.details-cell {
            width: 25%; /* Four equal columns */
            vertical-align: top;
            padding: 6px;
            border-right: 1px solid #000;
        }
        .details-master-table td.details-cell:last-child {
            border-right: none;
        }
        .details-master-table h3 {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 2px;
        }
        .details-master-table p {
            margin-bottom: 2px;
        }

        /* Items Table (Slightly more compact) */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
            font-size: 8pt; /* Smaller font for the table */
        }
        .items-table th {
            background-color: #e0e0e0;
            border: 1px solid #000;
            padding: 4px; /* Reduced padding */
            text-align: center;
            font-weight: bold;
        }
        .items-table td {
            border: 1px solid #000;
            padding: 4px;
            vertical-align: top;
        }
        .items-table tbody tr {
            page-break-inside: avoid;
        }
        .items-table tfoot .total-row {
            background-color: #f0f0f0;
            font-weight: bold;
        }

        /* Tax Summary Table */
        .tax-summary-table {
            width: 60%;
            margin-left: auto;
            margin-bottom: 10px;
            border-collapse: collapse;
            font-size: 8pt;
        }
        .tax-summary-table th, .tax-summary-table td {
            border: 1px solid #000;
            padding: 4px;
        }
        .tax-summary-table th {
            background-color: #e0e0e0;
            font-weight: bold;
        }

        /* Amounts & Words Section (Flexbox for side-by-side layout) */
        .summary-flex-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
            page-break-inside: avoid;
        }
        .amount-words-container {
            width: 58%;
        }
        .amounts-section {
            width: 40%;
        }

        /* Amounts Table */
        .amounts-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8.5pt;
        }
        .amounts-table td {
            padding: 4px 8px;
            border-bottom: 1px solid #eee;
        }
        .amount-label { text-align: right; }
        .amount-value { text-align: right; font-weight: bold; }
        .current-balance-row {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            font-size: 10pt;
        }

        /* Amount in Words */
        .amount-words {
            padding: 8px;
            border: 1px solid #000;
        }
        .amount-words h4 {
            font-size: 8.5pt;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .amount-words p {
            font-size: 9pt;
            font-weight: bold;
            text-transform: capitalize;
        }

        /* Bank Details & Terms (Flexbox for side-by-side layout) */
        .footer-container {
            display: flex;
            justify-content: space-between;
            align-items: stretch; /* Make columns equal height */
            page-break-inside: avoid;
            margin-top: 15px;
        }
        .bank-details {
            width: 58%;
            padding: 8px;
            border: 1px solid #000;
        }
        .signature-section-wrapper {
            width: 40%;
            border: 1px solid #000;
            border-left: none;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .bank-details h4 {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .signature-section {
            text-align: center;
            padding: 8px;
        }
        .signature-line {
            margin: 40px 20px 5px 20px;
            border-bottom: 1px solid #000;
        }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .invoice-container { padding: 0; }
        }
    `;
}

// Helper: Generate line items HTML
export function generateLineItemsHTML(items) {
    return items.map((item, index) => `
        <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${item.itemName}</td>
            <td style="text-align: center;">${item.hsnSac}</td>
            <td style="text-align: center;">${item.qty} ${item.unit}</td>
            <td style="text-align: right;">${item.unitPrice}</td>
            <td style="text-align: right;">${item.taxableAmount}</td>
            <td style="text-align: right;">${item.cgst}</td>
            <td style="text-align: right;">${item.sgst}</td>
            <td style="text-align: right;">${item.amount}</td>
        </tr>
    `).join('');
}

// Helper: Generate tax summary HTML
export function generateTaxSummaryHTML(taxRows) {
    return taxRows.map(tax => `
        <tr>
            <td>${tax.type}</td>
            <td style="text-align: right;">${tax.taxableAmount}</td>
            <td style="text-align: center;">${tax.rate}</td>
            <td style="text-align: right;">${tax.taxAmount}</td>
        </tr>
    `).join('');
}

// Main function to generate PDF
export function generateTastyTreatsInvoice(data) {
    let html = getTastyTreatsInvoiceHTML();
    
    // Replace all placeholders
    const replacements = {
        '{{copyType}}': data.copyType || 'ORIGINAL FOR RECIPIENT',
        '{{companyName}}': data.companyName || 'Tasty Treats',
        '{{address1}}': data.address1 || '',
        '{{address2}}': data.address2 || '',
        '{{city}}': data.city || '',
        '{{state}}': data.state || '',
        '{{pincode}}': data.pincode || '',
        '{{email}}': data.email || '',
        '{{gstin}}': data.gstin || '',
        '{{stateCode}}': data.stateCode || '',
        '{{customerName}}': data.customerName || '',
        '{{customerAddress1}}': data.customerAddress1 || '',
        '{{customerAddress2}}': data.customerAddress2 || '',
        '{{customerCity}}': data.customerCity || '',
        '{{customerState}}': data.customerState || '',
        '{{customerPincode}}': data.customerPincode || '',
        '{{customerGSTIN}}': data.customerGSTIN || '',
        '{{customerStateCode}}': data.customerStateCode || '',
        '{{shipToAddress1}}': data.shipToAddress1 || '',
        '{{shipToAddress2}}': data.shipToAddress2 || '',
        '{{shipToCity}}': data.shipToCity || '',
        '{{shipToState}}': data.shipToState || '',
        '{{shipToPincode}}': data.shipToPincode || '',
        '{{transportName}}': data.transportName || '',
        '{{vehicleNumber}}': data.vehicleNumber || '',
        '{{deliveryDate}}': data.deliveryDate || '',
        '{{deliveryLocation}}': data.deliveryLocation || '',
        '{{invoiceNumber}}': data.invoiceNumber || '',
        '{{invoiceDate}}': data.invoiceDate || '',
        '{{invoiceTime}}': data.invoiceTime || '',
        '{{placeOfSupply}}': data.placeOfSupply || '',
        '{{lineItems}}': generateLineItemsHTML(data.items || []),
        '{{totalQty}}': data.totalQty || '',
        '{{totalTaxableAmount}}': data.totalTaxableAmount || '',
        '{{totalCGST}}': data.totalCGST || '',
        '{{totalSGST}}': data.totalSGST || '',
        '{{totalAmount}}': data.totalAmount || '',
        '{{taxSummaryRows}}': generateTaxSummaryHTML(data.taxSummary || []),
        '{{subTotal}}': data.subTotal || '',
        '{{grandTotal}}': data.grandTotal || '',
        '{{receivedAmount}}': data.receivedAmount || '',
        '{{balanceAmount}}': data.balanceAmount || '',
        '{{currentBalance}}': data.currentBalance || '',
        '{{amountInWords}}': data.amountInWords || '',
        '{{paymentMode}}': data.paymentMode || '',
        '{{description}}': data.description || '',
        '{{bankName}}': data.bankName || '',
        '{{accountNumber}}': data.accountNumber || '',
        '{{ifscCode}}': data.ifscCode || '',
        '{{accountHolderName}}': data.accountHolderName || '',
        '{{termsAndConditions}}': data.termsAndConditions || ''
    };
    
    for (const [key, value] of Object.entries(replacements)) {
        html = html.replace(new RegExp(key, 'g'), value);
    }
    
    // Combine with CSS
    const fullHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>${getTastyTreatsInvoiceCSS()}</style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `;
    
    // html2pdf.js configuration
    const opt = {
        margin: 0,
        filename: `${data.invoiceNumber || 'invoice'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2,
            useCORS: true,
            letterRendering: true
        },
        jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait' 
        },
        pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'] 
        }
    };
    
    return html2pdf().set(opt).from(fullHTML).save();
}



// ✅ NEW: HTML template for the Consignment Detail Report
export function getConsignmentDetailHTML() {
    return `
        <div class="report-container">
            <header>
                <h1>Consignment Order Details</h1>
                <p>Order: <strong>{{consignmentId}}</strong> (Voucher: {{manualVoucherNumber}})</p>
            </header>
            <main>
                <section class="info-section">
                    <div><strong>Team:</strong> {{teamName}}</div>
                    <div><strong>Requested By:</strong> {{requestingMemberName}}</div>
                    <div><strong>Request Date:</strong> {{requestDate}}</div>
                    <div><strong>Status:</strong> {{status}}</div>
                </section>
                
                <h3>Items Summary</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Qty Checked Out</th>
                            <th>Qty Sold</th>
                            <th>Unit Price</th>
                            <th>Total Value Sold</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{lineItems}} <!-- Placeholder for item rows -->
                    </tbody>
                </table>

                <div class="summary-section">
                    <h3>Financial Summary</h3>
                    <div class="summary-grid">
                        <span>Total Value Checked Out:</span> <span class="value">{{totalValueCheckedOut}}</span>
                        <span>Total Value Sold:</span> <span class="value text-green">{{totalValueSold}}</span>
                        <span>Total Expenses:</span> <span class="value text-red">- {{totalExpenses}}</span>
                        <span>Total Amount Paid:</span> <span class="value text-green">{{totalAmountPaid}}</span>
                        <span class="total-label">Balance Due:</span> <span class="total-value text-red">{{balanceDue}}</span>
                    </div>
                </div>
            </main>
        </div>
    `;
}

// ✅ NEW: CSS for the Consignment Detail Report
export function getConsignmentDetailCSS() {
    return `
        body { font-family: Arial, sans-serif; font-size: 10pt; color: #333; }
        .report-container { padding: 40px; }
        header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 20px; margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; }
        h3 { font-size: 14pt; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt; /* Slightly smaller font to fit more columns */
        }
        .items-table th, .items-table td {
            border: 1px solid #ddd;
            padding: 6px; /* Adjust padding if needed */
            text-align: left;
        }
        .items-table td:not(:first-child) {
            text-align: center; /* Center-align all numeric columns */
        }
        .items-table td:last-child {
            text-align: right; /* Right-align the final currency column */
            font-weight: bold;
        }
        .items-table thead {
            background-color: #f2f2f2;
        }
        .summary-section { margin-top: 20px; float: right; width: 40%; }
        .summary-grid { display: grid; grid-template-columns: auto auto; gap: 5px; }
        .summary-grid .value { text-align: right; font-weight: bold; }
        .summary-grid .total-label, .summary-grid .total-value { font-size: 12pt; border-top: 1px solid #333; padding-top: 5px; }
        .text-green { color: #166534; }
        .text-red { color: #991b1b; }
    `;
}


export async function generateConsignmentDetailPDF(data) {
    let html = getConsignmentDetailHTML();
    const css = getConsignmentDetailCSS();

    // Replace placeholders
    for (const [key, value] of Object.entries(data)) {
        if (typeof value !== 'object') {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }
    }

    // Generate and replace line items
    const itemRows = data.items.map(item => {
        const quantitySold = item.quantitySold || 0;
        const sellingPrice = item.sellingPrice || 0;
        const totalSaleValue = quantitySold * sellingPrice;

        return `
            <tr>
                <td>${item.productName}</td>
                <td>${item.quantityCheckedOut || 0}</td>
                <td>${quantitySold}</td>
                <td>${item.quantityGifted || 0}</td>
                <td>${item.quantityReturned || 0}</td>
                <td>${item.quantityDamaged || 0}</td>
                <td>${formatCurrency(sellingPrice)}</td>
                <td>${formatCurrency(totalSaleValue)}</td>
            </tr>
        `;
    }).join('');
    html = html.replace('{{lineItems}}', itemRows);

    // Combine for final output
    const fullHTML = `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;

    // Configure and run html2pdf.js
    const opt = {
        margin: 0.5,
        filename: `Consignment-Detail-${data.consignmentId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    return html2pdf().from(fullHTML).set(opt).save();
}
