// js/pdf-templates.js

import { formatCurrency,numberToWords } from './utils.js'; 

export function getTastyTreatsInvoiceHTML() {
    return `
        <div class="invoice-container">
        <!-- Header Section -->
        <div class="invoice-header">
            <div class="header-logo">
                <img src="{{logoUrl}}" alt="Logo" style="max-height: 40px;">
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

        <!-- Combined Details Section in a Single Row -->
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
                    <p><strong>{{shipToCustomerName}}</strong></p>
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

        <!-- ✅ NEW: Tax Summary and Amounts Side by Side -->
        <div class="tax-amounts-wrapper">
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
        </div>

        <!-- ✅ NEW: Amount in Words and Payment Info Side by Side -->
        <div class="words-payment-wrapper">
            <!-- Amount in Words -->
            <div class="amount-words">
                <h4>Invoice Amount In Words</h4>
                <p>{{amountInWords}}</p>
            </div>

            <!-- Payment Mode and Description -->
            <div class="payment-info-section">
                <div class="payment-mode-box">
                    <h4>Payment Mode</h4>
                    <p>{{paymentMode}}</p>
                </div>
                <div class="description-box">
                    <h4>Description</h4>
                    <p>{{description}}</p>
                </div>
            </div>
        </div>

        <!-- ✅ NEW: Bank Details, Terms and Signature Side by Side -->
        <div class="footer-wrapper">
            <!-- Bank Details -->
            <div class="bank-details">
                <h4>Bank Details</h4>
                <div class="bank-details-content">
                    <div class="bank-qr-code">
                        <img src="{{qrCodeUrl}}" alt="UPI QR Code">
                    </div>
                    <div class="bank-info">
                        <p><strong>Name:</strong> {{bankName}}</p>
                        <p>{{bankBranch}}</p>
                        <p><strong>Account No.:</strong> {{accountNumber}}</p>
                        <p><strong>IFSC code:</strong> {{ifscCode}}</p>
                        <p><strong>Account Holder's Name:</strong> {{accountHolderName}}</p>
                    </div>
                </div>
            </div>

            <!-- Terms and Conditions -->
            <div class="terms-section">
                <h4>Terms and conditions</h4>
                <p>{{termsAndConditions}}</p>
            </div>

            <!-- Signature -->
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
            font-family: Arial, sans-serif;
            font-size: 6px;
            line-height: 1.2;
            color: #333;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 8px;
        }
        
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
            border-bottom: 1px solid #333;
            padding-bottom: 6px;
        }
        
        .header-logo {
            flex: 0 0 auto;
        }
        
        .header-company-details {
            flex: 1;
            padding: 0 10px;
        }
        
        .header-company-details h2 {
            font-size: 9px;
            margin-bottom: 2px;
        }
        
        .header-company-details p {
            margin: 1px 0;
        }
        
        .header-title {
            flex: 0 0 auto;
            text-align: right;
        }
        
        .header-title h1 {
            font-size: 12px;
            margin-bottom: 2px;
        }
        
        .copy-type {
            font-weight: bold;
            color: #666;
        }
        
        .details-master-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        
        .details-cell {
            width: 25%;
            vertical-align: top;
            padding: 4px;
            border: 1px solid #ddd;
        }
        
        .details-cell h3 {
            font-size: 7px;
            margin-bottom: 3px;
            color: #555;
            border-bottom: 1px solid #eee;
            padding-bottom: 2px;
        }
        
        .details-cell p {
            margin: 1px 0;
            font-size: 6px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }
        
        .items-table th,
        .items-table td {
            border: 1px solid #ddd;
            padding: 3px 4px;
            text-align: left;
            font-size: 6px;
        }
        
        .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
            font-size: 7px;
            line-height: 1.1;
        }
        
        .items-table tbody td {
            text-align: center;
        }
        
        .items-table tbody td:nth-child(2) {
            text-align: left;
        }
        
        .total-row {
            background-color: #f9f9f9;
            font-weight: bold;
        }
        
        /* ✅ NEW: Side by Side Layout for Tax Summary and Amounts */
        .tax-amounts-wrapper {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .tax-summary-table {
            flex: 1;
            border-collapse: collapse;
        }
        
        .tax-summary-table th,
        .tax-summary-table td {
            border: 1px solid #ddd;
            padding: 3px 4px;
            text-align: center;
            font-size: 6px;
        }
        
        .tax-summary-table th {
            background-color: #f5f5f5;
            font-weight: bold;
            font-size: 7px;
            line-height: 1.1;
        }
        
        .amounts-section {
            flex: 0 0 200px;
        }
        
        .amounts-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .amounts-table td {
            border: 1px solid #ddd;
            padding: 3px 4px;
            font-size: 6px;
        }
        
        .amount-label {
            text-align: left;
            width: 60%;
        }
        
        .amount-value {
            text-align: right;
            width: 40%;
            font-weight: bold;
        }
        
        .received-row {
            background-color: #f0f8ff;
        }
        
        .balance-row {
            background-color: #fff3cd;
        }
        
        .current-balance-row {
            background-color: #d4edda;
        }
        
        /* ✅ NEW: Side by Side Layout for Amount Words and Payment Info */
        .words-payment-wrapper {
            display: flex;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .amount-words {
            flex: 1;
            border: 1px solid #ddd;
            padding: 4px;
        }
        
        .amount-words h4 {
            font-size: 7px;
            margin-bottom: 3px;
            color: #555;
        }
        
        .amount-words p {
            font-size: 6px;
        }
        
        .payment-info-section {
            flex: 0 0 40%;
            display: flex;
            flex-direction: column;
            gap: 0;
        }
        
        .payment-mode-box,
        .description-box {
            border: 1px solid #ddd;
            padding: 4px;
        }
        
        .payment-mode-box {
            border-bottom: none;
        }
        
        .payment-mode-box h4,
        .description-box h4 {
            font-size: 7px;
            margin-bottom: 3px;
            color: #555;
        }
        
        .payment-mode-box p,
        .description-box p {
            font-size: 6px;
        }
        
        /* ✅ NEW: Side by Side Layout for Bank, Terms, and Signature */
        .footer-wrapper {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }
        
        .bank-details {
            flex: 1;
            border: 1px solid #ddd;
            padding: 4px;
        }
        
        .bank-details h4 {
            font-size: 7px;
            margin-bottom: 3px;
            color: #555;
            border-bottom: 1px solid #eee;
            padding-bottom: 2px;
        }
        
        .bank-details-content {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .bank-qr-code {
            flex: 0 0 auto;
            text-align: center;
        }
        
        .bank-qr-code img {
            width: 60px;
            height: 60px;
            border: 1px solid #ddd;
        }
        
        .bank-info {
            flex: 1;
        }
        
        .bank-info p {
            margin: 1px 0;
            font-size: 6px;
        }
        
        .terms-section {
            flex: 1;
            border: 1px solid #ddd;
            padding: 4px;
        }
        
        .terms-section h4 {
            font-size: 7px;
            margin-bottom: 3px;
            color: #555;
            border-bottom: 1px solid #eee;
            padding-bottom: 2px;
        }
        
        .terms-section p {
            font-size: 6px;
        }
        
        .signature-section {
            flex: 0 0 150px;
            border: 1px solid #ddd;
            padding: 4px;
            text-align: center;
        }
        
        .signature-section p {
            margin: 2px 0;
            font-size: 6px;
        }
        
        .signature-line {
            height: 40px;
            border-bottom: 1px solid #333;
            margin: 10px 0 5px 0;
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
                    <div class="table-wrapper">
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>Product Name</th>
                                    <th>Qty Out</th>
                                    <!-- ✅ NEW COLUMNS ADDED -->
                                    <th>Qty Sold</th>
                                    <th>Qty Gift</th>
                                    <th>Qty Return</th>
                                    <th>Qty Damaged</th>
                                    <th>Price</th>
                                    <th>Total Sale</th>
                                </tr>
                            </thead>
                            <tbody>
                                {{lineItems}} <!-- This placeholder remains the same -->
                            </tbody>
                        </table>
                    </div>

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
        @page {
            margin: 8mm; /* You might want to reduce this to 5mm for more space */
            size: A4;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            /* ✅ THE FIX: Change the base font size */
            font-size: 7pt; /* Let's try 7pt first, 6pt can be very small */
            line-height: 1.3;
            color: #333;
        }
        .report-container { padding: 5mm; }
        header h1 { font-size: 14pt; } /* Reduce header sizes proportionally */
        header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 20px; margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; }
        h3 { font-size: 11pt; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7pt; /* Ensure table font size matches the body */
        }
        .items-table th, .items-table td {
            border: 1px solid #ddd;
            padding: 4px; /* Slightly smaller padding for a tighter look */
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
        .table-and-summary-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-start; /* Aligns items to the top */
            margin-top: 20px;
        }
        .table-wrapper {
            width: 100%; /* The table will take up all available space */
        }
        .summary-section {
            margin-top: 20px;   /* Add some space above it */
            margin-left: auto;  /* This is the magic trick */
            width: 50%;         /* Or whatever width you prefer, e.g., 300px */
        }
        .summary-grid { 
            display: grid; 
            grid-template-columns: auto auto; 
            gap: 5px; 
            padding: 10px;
            background-color: #f9f9f9;
            border: 1px solid #eee;
            border-radius: 5px;
        }
        .summary-grid .value { text-align: right; font-weight: bold; }
        .summary-grid .total-label, .summary-grid .total-value { 
            font-size: 10pt; 
            border-top: 1px solid #ccc; 
            padding-top: 5px; 
            margin-top: 5px;
        }
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
