// In js/invoice-templates.js

/**
 * Returns the HTML structure for the detailed invoice template.
 * Uses placeholders like {{invoiceId}} that will be replaced with real data.
 */
export function getInvoiceSample3HTML() {
    return `
        <div class="invoice-wrapper">
            {{paidStamp}}
            <div class="invoice-header">
                <div class="logo-area">
                    <img src="{{logoUrl}}">
                    <h2>{{companyName}}</h2>
                </div>
                <div class="invoice-info">
                    <h1>INVOICE</h1>
                    <p><span>ID:</span> {{invoiceId}}</p>
                    <p><span>Date:</span> {{invoiceDate}}</p>
                    <p><span>Voucher:</span> {{voucherNumber}}</p>
                </div>
            </div>
            <div class="invoice-parties">
                <div>
                    <h3>From</h3>
                    <!-- ✅ CORRECTED: Ensure email placeholder is present -->
                    <p>{{companyName}}<br>{{companyAddress}}<br>{{companyEmail}}<br><strong>Tax ID:</strong> {{companyTaxId}}</p>
                </div>
                <div>
                    <h3>To</h3>
                    <p>{{customerName}}<br>{{customerEmail}}</p>
                </div>
            </div>
            
            <!-- ✅ CHANGED: The main body now only contains the items table -->
            <div class="invoice-body">
                <table class="line-items-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Unit Price</th>
                            <th>Qty</th>
                            <th>Discount</th>
                            <th>Tax</th>
                            <th>Net Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{lineItems}}
                    </tbody>
                </table>
            </div>

            <!-- ✅ NEW: A new section specifically for the totals, placed AFTER the items -->
            <div class="invoice-summary-section">
                <div class="payment-sidebar">
                    <h4>Summary</h4>
                    <div class="summary-item"><span>Subtotal</span><span>{{subtotal}}</span></div>
                    <div class="summary-item"><span>Invoice Discount</span><span>-{{invoiceDiscount}}</span></div>
                    <div class="summary-item"><span>Total Tax</span><span>{{totalTax}}</span></div>
                    <hr>
                    <div class="summary-item grand-total"><span>Grand Total</span><span>{{grandTotal}}</span></div>
                    <hr>
                    <h4>Payment Status</h4>
                    <div class="summary-item"><span>Status</span><span class="status-badge {{paymentStatusClass}}">{{paymentStatus}}</span></div>
                    <div class="summary-item"><span>Amount Paid</span><span>{{amountPaid}}</span></div>
                    <div class="summary-item balance-due {{paymentStatusClass}}"><span>Balance Due</span><span>{{balanceDue}}</span></div>
                </div>
            </div>

            <!-- ✅ NEW: Signature Section -->
            <div class="signature-section">
                <div class="signature-line"></div>
                <p class="signatory-name">{{signatoryName}}</p>
                <p class="signatory-title">{{signatoryTitle}}</p>
            </div>

            <div class="invoice-footer">
                <p>Thank you for your business! All payments are final.</p>
            </div>
        </div>
    `;
}


/**
 * Returns the CSS styles for the detailed invoice template.
 */
export function getInvoiceSample3CSS() {
    return `
        /* --- General Invoice Styling --- */
        .invoice-wrapper {
            max-width: 800px;
            margin: auto;
            padding: 40px;
            background: #fff;
            font-family: 'Roboto', sans-serif;
            position: relative;
            overflow: hidden;
            color: #333;
            
            /* ✅ CHANGED: Set a smaller base font size and line height for the whole document */
            font-size: 14px;
            line-height: 20px;
        }

        /* --- Paid Stamp --- */
        .paid-stamp {
            position: absolute;
            top: 150px;
            left: -50px;
            transform: rotate(-30deg);
            border: 4px solid #22c55e; /* Thinner border */
            color: #22c55e;
            font-size: 48px; /* Smaller stamp text */
            font-weight: bold;
            padding: 8px 35px;
            opacity: 0.1;
            text-transform: uppercase;
            z-index: 0;
        }

        /* --- Header Section --- */
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px; /* Reduced margin */
        }
        .logo-area img { max-width: 110px; }
        .logo-area h2 { font-weight: bold; font-size: 20px; margin-top: 5px; }
        .invoice-info h1 {
            /* ✅ CHANGED: Reduced size for a more modern look */
            font-size: 32px; 
            font-weight: bold;
            color: #3b82f6;
        }
        .invoice-info p { text-align: right; font-size: 13px; } /* Slightly smaller */
        .invoice-info p span { color: #6b7280; }

        /* --- From/To Section --- */
        .invoice-parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            border-top: 1px solid #eee;
            border-bottom: 1px solid #eee;
            padding: 15px 0;
            font-size: 13px; /* Smaller text for addresses */
        }
        .invoice-parties h3 { font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }

        /* --- Main Body and Table --- */
        .invoice-body { display: block; margin-bottom: 20px; }
        .line-items-table { width: 100%; border-collapse: collapse; }
        .line-items-table th, .line-items-table td { padding: 8px; text-align: left; border-bottom: 1px solid #eee; font-size: 13px; }
        .line-items-table thead { background: #f8fafc; }
        .line-items-table th {
            font-weight: 600; /* Semibold instead of bold */
            font-size: 11px;
            text-transform: uppercase;
            color: #475569;
        }
        .line-items-table td:nth-child(n+2) { text-align: right; }

        /* --- Summary Section --- */
        .invoice-summary-section { display: flex; justify-content: flex-end; margin-top: 20px; }
        .payment-sidebar { width: 300px; flex-shrink: 0; background: #f8fafc; padding: 20px; border-radius: 8px; }
        .payment-sidebar h4 { font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 14px; }
        .payment-sidebar .summary-item { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
        .payment-sidebar .grand-total {
            /* ✅ CHANGED: Reduced size, but still larger than other totals */
            font-size: 16px;
            font-weight: bold;
            margin-top: 10px;
        }
        .payment-sidebar .balance-due span { font-weight: bold; }
        .payment-sidebar .balance-due.paid span { color: #16a34a; }
        .payment-sidebar .balance-due.unpaid span { color: #dc2626; }
        .payment-sidebar .balance-due.partially-paid span { color: #d97706; }
        .status-badge { font-size: 11px; font-weight: bold; padding: 2px 8px; border-radius: 9999px; }
        .status-badge.paid { background-color: #dcfce7; color: #166534; }
        .status-badge.unpaid { background-color: #fee2e2; color: #991b1b; }
        .status-badge.partially-paid { background-color: #fef3c7; color: #b45309; }

        /* --- Signature and Footer --- */
        .signature-section { margin-top: 60px; width: 220px; }
        .signature-line { border-top: 1px solid #333; margin-bottom: 5px; }
        .signatory-name { font-weight: bold; font-size: 13px; }
        .signatory-title { font-size: 12px; color: #6b7280; }
        .invoice-footer { margin-top: 30px; text-align: center; font-size: 11px; color: #9ca3b8; border-top: 1px solid #eee; padding-top: 15px; }
    `;
}

