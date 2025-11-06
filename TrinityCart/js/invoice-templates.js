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
                    <p>{{companyName}}<br>{{companyAddress}}</p>
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
        .invoice-wrapper{max-width:800px;margin:auto;padding:40px;background:#fff;font-family:'Roboto', sans-serif;position:relative;overflow:hidden;color:#333;}
        .paid-stamp{position:absolute;top:150px;left:-50px;transform:rotate(-30deg);border:5px solid #22c55e;color:#22c55e;font-size:60px;font-weight:bold;padding:10px 40px;opacity:0.1;text-transform:uppercase;z-index:0;}
        .invoice-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:40px;}
        .logo-area img{max-width:120px;}
        .logo-area h2{font-weight:bold;font-size:22px;margin-top:5px;}
        .invoice-info h1{font-size:40px;font-weight:bold;color:#3b82f6;}
        .invoice-info p{text-align:right;font-size:14px;}
        .invoice-info p span{color:#6b7280;}
        .invoice-parties{display:flex;justify-content:space-between;margin-bottom:40px;border-top:1px solid #eee;border-bottom:1px solid #eee;padding:20px 0;}
        .invoice-parties h3{font-size:12px;color:#6b7280;text-transform:uppercase;margin-bottom:5px;}
        .invoice-body{display:flex;justify-content:space-between;gap:30px;}
        .line-items-table{width:100%;flex-grow:1;border-collapse:collapse;}
        .line-items-table th, .line-items-table td{padding:10px;text-align:left;border-bottom:1px solid #eee;}
        .line-items-table thead{background:#f8fafc;}
        .line-items-table th{font-weight:bold;font-size:12px;text-transform:uppercase;}
        .line-items-table td:nth-child(n+2){text-align:right;}
        .payment-sidebar{width:280px;flex-shrink:0;background:#f8fafc;padding:20px;border-radius:8px;}
        .payment-sidebar h4{font-weight:bold;margin-bottom:10px;border-bottom:1px solid #e2e8f0;padding-bottom:5px;}
        .payment-sidebar .summary-item{display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px;}
        .payment-sidebar .grand-total{font-size:18px;font-weight:bold;margin-top:10px;}
        .payment-sidebar .balance-due span{font-weight:bold;}
        .payment-sidebar .balance-due.paid span{color:#16a34a;}
        .payment-sidebar .balance-due.unpaid span{color:#dc2626;}
        .payment-sidebar .balance-due.partially-paid span{color:#d97706;}
        .status-badge{font-size:12px;font-weight:bold;padding:2px 8px;border-radius:9999px;}
        .status-badge.paid{background-color:#dcfce7;color:#166534;}
        .status-badge.unpaid{background-color:#fee2e2;color:#991b1b;}
        .status-badge.partially-paid{background-color:#fef3c7;color:#b45309;}
        .invoice-footer{margin-top:40px;text-align:center;font-size:12px;color:#9ca3b8;border-top:1px solid #eee;padding-top:20px;}
    `;
}

