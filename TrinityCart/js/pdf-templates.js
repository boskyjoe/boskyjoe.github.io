// js/pdf-templates.js


export function getTastyTreatsInvoiceHTML() {
    return `
        <div class="invoice-container">
            <!-- Header Section -->
            <div class="invoice-header">
                <div class="header-title">
                    <h1>Tax Invoice</h1>
                    <p class="copy-type">{{copyType}}</p>
                </div>
            </div>

            <!-- Company Info Section -->
            <div class="company-section">
                <div class="company-info">
                    <h2>{{companyName}}</h2>
                    <p><strong>Registered Address.</strong></p>
                    <p>{{address1}}</p>
                    <p>{{address2}}</p>
                    <p>{{city}}, {{state}} - {{pincode}}</p>
                    <p><strong>Email:</strong> {{email}}</p>
                    <p><strong>GSTIN:</strong> {{gstin}}, <strong>State:</strong> {{stateCode}}</p>
                </div>
            </div>

            <!-- Bill To / Ship To Section -->
            <table class="parties-table">
                <tr>
                    <td class="bill-to-cell">
                        <h3>Bill To</h3>
                        <p><strong>{{customerName}}</strong></p>
                        <p>{{customerAddress1}}</p>
                        <p>{{customerAddress2}}</p>
                        <p>{{customerCity}}, {{customerState}} {{customerPincode}}</p>
                        <p><strong>GSTIN Number:</strong> {{customerGSTIN}}</p>
                        <p><strong>State:</strong> {{customerStateCode}}</p>
                    </td>
                    <td class="ship-to-cell">
                        <h3>Ship To</h3>
                        <p>{{shipToAddress1}}</p>
                        <p>{{shipToAddress2}}</p>
                        <p>{{shipToCity}}, {{shipToState}} {{shipToPincode}}</p>
                    </td>
                </tr>
            </table>

            <!-- Transportation & Invoice Details -->
            <table class="details-table">
                <tr>
                    <td class="transport-cell">
                        <h3>Transportation Details</h3>
                        <p><strong>Transport Name:</strong> {{transportName}}</p>
                        <p><strong>Vehicle Number:</strong> {{vehicleNumber}}</p>
                        <p><strong>Delivery Date:</strong> {{deliveryDate}}</p>
                        <p><strong>Delivery location:</strong> {{deliveryLocation}}</p>
                    </td>
                    <td class="invoice-cell">
                        <h3>Invoice Details</h3>
                        <p><strong>Invoice No.:</strong> {{invoiceNumber}}</p>
                        <p><strong>Date:</strong> {{invoiceDate}}</p>
                        <p><strong>Time:</strong> {{invoiceTime}}</p>
                        <p><strong>Place of Supply:</strong> {{placeOfSupply}}</p>
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
            margin: 10mm;
            size: A4;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
            color: #000;
        }

        .invoice-container {
            width: 210mm;
            min-height: 297mm;
            padding: 8mm;
            margin: 0 auto;
            background: white;
        }

        /* Header */
        .invoice-header {
            text-align: center;
            margin-bottom: 10px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
        }

        .invoice-header h1 {
            font-size: 18pt;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .copy-type {
            font-size: 9pt;
            font-weight: bold;
        }

        /* Company Section */
        .company-section {
            margin-bottom: 12px;
            padding: 8px;
            border: 1px solid #000;
            background-color: #f5f5f5;
        }

        .company-info h2 {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .company-info p {
            font-size: 8.5pt;
            line-height: 1.4;
            margin-bottom: 2px;
        }

        /* Parties Table */
        .parties-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        .parties-table td {
            width: 50%;
            vertical-align: top;
            padding: 8px;
            border: 1px solid #000;
        }

        .parties-table h3 {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 6px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }

        .parties-table p {
            font-size: 8.5pt;
            line-height: 1.4;
            margin-bottom: 2px;
        }

        /* Details Table */
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        .details-table td {
            width: 50%;
            vertical-align: top;
            padding: 8px;
            border: 1px solid #000;
        }

        .details-table h3 {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 6px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }

        .details-table p {
            font-size: 8.5pt;
            line-height: 1.5;
            margin-bottom: 2px;
        }

        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            font-size: 8.5pt;
        }

        .items-table th {
            background-color: #e0e0e0;
            border: 1px solid #000;
            padding: 6px 4px;
            text-align: left;
            font-weight: bold;
            font-size: 8pt;
        }

        .items-table td {
            border: 1px solid #000;
            padding: 5px 4px;
            vertical-align: top;
        }

        .items-table tbody tr {
            page-break-inside: avoid;
        }

        .items-table .total-row {
            background-color: #f0f0f0;
            font-weight: bold;
        }

        /* Tax Summary Table */
        .tax-summary-table {
            width: 60%;
            margin-left: auto;
            margin-bottom: 12px;
            border-collapse: collapse;
            font-size: 8.5pt;
        }

        .tax-summary-table th {
            background-color: #e0e0e0;
            border: 1px solid #000;
            padding: 5px;
            text-align: left;
            font-weight: bold;
        }

        .tax-summary-table td {
            border: 1px solid #000;
            padding: 5px;
        }

        /* Amounts Section */
        .amounts-section {
            margin-bottom: 12px;
        }

        .amounts-table {
            width: 50%;
            margin-left: auto;
            border-collapse: collapse;
            font-size: 9pt;
        }

        .amounts-table tr {
            border-bottom: 1px solid #ccc;
        }

        .amounts-table td {
            padding: 5px 10px;
        }

        .amount-label {
            text-align: right;
            width: 60%;
        }

        .amount-value {
            text-align: right;
            width: 40%;
            font-weight: bold;
        }

        .received-row {
            background-color: #e8f5e9;
        }

        .balance-row {
            background-color: #ffebee;
        }

        .current-balance-row {
            background-color: #fff3e0;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
        }

        .current-balance-row td {
            padding: 8px 10px;
            font-size: 10pt;
        }

        /* Amount in Words */
        .amount-words {
            margin-bottom: 12px;
            padding: 8px;
            border: 1px solid #000;
            background-color: #f9f9f9;
        }

        .amount-words h4 {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4px;
        }

        .amount-words p {
            font-size: 10pt;
            font-weight: bold;
        }

        /* Payment Info Table */
        .payment-info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        .payment-info-table td {
            vertical-align: top;
            padding: 8px;
            border: 1px solid #000;
        }

        .payment-info-table h4 {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 4px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }

        .payment-info-table p {
            font-size: 8.5pt;
            line-height: 1.4;
        }

        /* Bank Details */
        .bank-details {
            margin-bottom: 12px;
            padding: 8px;
            border: 1px solid #000;
            background-color: #f5f5f5;
        }

        .bank-details h4 {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 6px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
        }

        .bank-details p {
            font-size: 8.5pt;
            line-height: 1.5;
            margin-bottom: 2px;
        }

        /* Footer Section */
        .footer-section {
            display: table;
            width: 100%;
            page-break-inside: avoid;
        }

        .terms-section {
            display: table-cell;
            width: 60%;
            vertical-align: top;
            padding: 8px;
            border: 1px solid #000;
        }

        .terms-section h4 {
            font-size: 9pt;
            font-weight: bold;
            margin-bottom: 6px;
        }

        .terms-section p {
            font-size: 8pt;
            line-height: 1.4;
        }

        .signature-section {
            display: table-cell;
            width: 40%;
            vertical-align: top;
            padding: 8px;
            border: 1px solid #000;
            border-left: none;
            text-align: center;
        }

        .signature-section p {
            font-size: 8.5pt;
            margin-bottom: 4px;
        }

        .signature-line {
            margin: 40px 20px 10px 20px;
            border-bottom: 1px solid #000;
        }

        @media print {
            .invoice-container {
                padding: 5mm;
            }
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
