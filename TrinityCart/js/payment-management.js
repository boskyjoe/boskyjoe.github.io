// js/payment-management.js

/**
 * TrinityCart Payment Management Module
 * 
 * Unified payment operations center for admin and finance roles.
 * Provides tabbed interface for managing supplier, team, and customer payments
 * with comprehensive dashboard overview and detailed operational controls.
 * 
 * ARCHITECTURE APPROACH:
 * - Routes to existing proven functions without modification
 * - Uses unique naming to avoid conflicts with existing code
 * - Maintains clean separation between module and existing functionality
 * - Provides unified view while preserving individual module workflows
 * 
 * @author TrinityCart Development Team
 * @since 1.0.0
 * @module PaymentManagement
 */

// ===================================================================
// IMPORTS: Access existing functionality without modification
// ===================================================================

// UI functions (existing - read-only access)
import { appState } from './state.js';
import { showModal } from './modal.js';
import { createGrid } from 'https://cdn.jsdelivr.net/npm/ag-grid-community@latest/+esm';
import {
    formatCurrency,
    showView,
    ProgressToast,

    // Existing payment modals (reuse as-is)
    showSupplierPaymentModal,
    showRecordSalePaymentModal,
    closeSupplierPaymentModal,
    closeRecordSalePaymentModal,

    // Existing grid data functions (reuse as-is)
    getSupplierPaymentDataFromGridById,
    getSalesPaymentDataFromGridById,
    getConsignmentPaymentDataFromGridById,

    // Existing helper functions
    resetPaymentForm,
    loadPaymentsForSelectedInvoice

} from './ui.js';

// API functions (existing - call without modification)
import {
    verifySupplierPayment,
    voidSupplierPaymentAndUpdateInvoice,
    verifyConsignmentPayment,
    cancelPaymentRecord,
    voidSalePayment,

    // Data functions (existing)
    getPurchaseInvoiceById,
    getSalesInvoiceById
} from './api.js';

import { masterData } from './masterData.js';
import {
    DONATION_SOURCES,
    SALES_COLLECTION_PATH,
    CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH,
    SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH,
    SALES_PAYMENTS_LEDGER_COLLECTION_PATH,PURCHASE_INVOICES_COLLECTION_PATH
} from './config.js';


// ===================================================================
// MODULE STATE FOR PAGINATION
// ===================================================================

const supplierInvoicesPagination = {
    currentPage: 1,
    pageSize: 25,
    lastSnapshot: null,
    hasMorePages: false,
    currentFilter: 'outstanding',
    totalOutstanding: 0
};




/**
 * BUSINESS-SMART: Supplier invoices grid optimized for payment operations
 * Shows outstanding invoices that need payment action, with complete business context
 */
const pmtMgmtSupplierGridOptions = {
    theme: 'alpine',
    getRowId: params => params.data.id,
    
    pagination: true,
    paginationPageSize: 25,
    paginationPageSizeSelector: [10, 25, 50, 100],
    
    // ✅ CRITICAL: Set fixed row height for stability
    rowHeight: 60,
    
    // ✅ CORRECT: Normal DOM layout
    domLayout: 'normal',
    
    columnDefs: [
        {
            headerName: "Supplier Invoice #",
            width: 160,
            pinned: 'left',
            field: "supplierInvoiceNo",
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                fontWeight: 'bold', 
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'normal',
                lineHeight: '1.4'
            },
            valueFormatter: params => params.value || 'Not Provided'
        },
        {
            headerName: "Supplier",
            width: 200,
            pinned: 'left',
            field: "supplierName",
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                fontWeight: 'bold', 
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'normal',
                lineHeight: '1.4'
            }
        },
        {
            headerName: "System Invoice ID",
            width: 140,
            field: "invoiceId",
            
            filter: 'agTextColumnFilter', 
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'normal',
                lineHeight: '1.4'
            }
        },
        {
            headerName: "Invoice Total",
            width: 120,
            field: "invoiceTotal",
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            valueFormatter: p => formatCurrency(p.value || 0),
            cellStyle: { 
                color: '#374151',
                fontWeight: '600',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
            }
        },
        {
            headerName: "Amount Paid",
            width: 120,
            field: "amountPaid",
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            valueFormatter: p => formatCurrency(p.value || 0),
            cellStyle: { 
                color: '#059669',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
            }
        },
        {
            headerName: "Balance Due",
            width: 120,
            field: "balanceDue",
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            valueFormatter: p => formatCurrency(p.value || 0),
            cellStyle: params => {
                const balance = params.value || 0;
                const baseStyle = {
                    textAlign: 'right',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end'
                };
                
                if (balance > 10000) return { ...baseStyle, color: '#dc2626' };
                if (balance > 5000) return { ...baseStyle, color: '#ea580c' };
                return { ...baseStyle, color: '#dc2626' };
            }
        },
        {
            headerName: "Days Outstanding",
            width: 130,
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                textAlign: 'center', 
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            valueGetter: params => {
                const purchaseDate = params.data.purchaseDate?.toDate ? 
                    params.data.purchaseDate.toDate() : new Date();
                const days = Math.ceil((new Date() - purchaseDate) / (1000 * 60 * 60 * 24));
                return Math.max(0, days);
            },
            cellRenderer: params => {
                const days = params.value || 0;
                let colorClass, urgencyText, urgencyIcon;
                
                if (days > 30) {
                    colorClass = 'text-red-700 bg-red-100 border-red-300';
                    urgencyText = 'OVERDUE';
                    urgencyIcon = `<svg class="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                   </svg>`;
                } else if (days > 14) {
                    colorClass = 'text-orange-700 bg-orange-100 border-orange-300';
                    urgencyText = 'AGING';
                    urgencyIcon = `<svg class="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                   </svg>`;
                } else if (days > 7) {
                    colorClass = 'text-yellow-700 bg-yellow-100 border-yellow-300';
                    urgencyText = 'DUE';
                    urgencyIcon = `<svg class="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                   </svg>`;
                } else {
                    colorClass = 'text-gray-700 bg-gray-100 border-gray-300';
                    urgencyText = 'RECENT';
                    urgencyIcon = `<svg class="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                   </svg>`;
                }
                
                return `<div class="flex flex-col items-center justify-center h-full gap-1">
                            <div class="font-bold text-sm">${days}d</div>
                            <div class="flex items-center space-x-1 text-xs px-2 py-1 rounded-full border ${colorClass}">
                                ${urgencyIcon}
                                <span>${urgencyText}</span>
                            </div>
                        </div>`;
            }
        },
        {
            field: "paymentStatus",
            headerName: "Status",
            width: 120,
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            filterParams: {
                values: ['Unpaid', 'Partially Paid', 'Paid']
            },
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            
            cellRenderer: params => {
                const status = params.value;
                
                const statusConfig = {
                    'Unpaid': { 
                        class: 'bg-red-100 text-red-800 border-red-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                               </svg>`, 
                        text: 'UNPAID' 
                    },
                    'Partially Paid': { 
                        class: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                               </svg>`, 
                        text: 'PARTIAL' 
                    },
                    'Paid': { 
                        class: 'bg-green-100 text-green-800 border-green-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                               </svg>`, 
                        text: 'PAID' 
                    }
                };
                
                const config = statusConfig[status] || { 
                    class: 'bg-gray-100 text-gray-800 border-gray-300', 
                    icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                           </svg>`, 
                    text: status 
                };
                
                return `<span class="inline-flex items-center space-x-1 px-2 py-1 text-xs font-bold rounded-full border ${config.class}">
                            ${config.icon}
                            <span>${config.text}</span>
                        </span>`;
            }
        },
        {
            headerName: "Actions",
            width: 220,
            
            filter: false,
            floatingFilter: false,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            suppressSizeToFit: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
            },
            
            cellRenderer: params => {
                const status = params.data.paymentStatus;
                const balanceDue = params.data.balanceDue || 0;
                const currentUser = appState.currentUser;
                
                const hasFinancialPermissions = currentUser && (
                    currentUser.role === 'admin' || currentUser.role === 'finance'
                );
                
                if (!hasFinancialPermissions) {
                    return `<span class="text-xs text-gray-500 italic">View only</span>`;
                }

                let buttons = '';

                const hasPendingPayments = checkForPendingPayments(params.data.id); // Helper function
                if (hasPendingPayments) {
                    buttons += `<button class="pmt-mgmt-verify-invoice-payments bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 font-semibold animate-pulse" 
                                      data-invoice-id="${params.data.id}" 
                                      title="Verify Pending Payments for this Invoice">
                                    <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    VERIFY PAYMENTS
                                </button> `;
                }

                if (status === 'Paid' || balanceDue <= 0) {
                    return `<div class="flex space-x-1">
                                <button class="pmt-mgmt-view-supplier-invoice bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 flex items-center space-x-1" 
                                      data-id="${params.data.id}" 
                                      title="View Invoice Details">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                    <span>View</span>
                                </button>
                                <button class="pmt-mgmt-view-payments-history bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 flex items-center space-x-1" 
                                      data-id="${params.data.id}" 
                                      title="View Payment History">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
                                    </svg>
                                    <span>History</span>
                                </button>
                            </div>`;
                } else {
                    // Outstanding invoice - primary pay action
                    const urgencyClass = params.data.urgencyLevel === 'critical' ? 'animate-pulse' : '';
                    
                    return `<div class="flex space-x-1">
                                <button class="pmt-mgmt-pay-supplier-invoice bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600 font-semibold ${urgencyClass} flex items-center space-x-1" 
                                      data-id="${params.data.id}" 
                                      title="Pay Outstanding Balance of ${formatCurrency(balanceDue)}">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    </svg>
                                    <span>PAY ${formatCurrency(balanceDue)}</span>
                                </button>
                                <button class="pmt-mgmt-view-supplier-invoice bg-gray-500 text-white px-2 py-1 text-xs rounded hover:bg-gray-600 flex items-center space-x-1" 
                                      data-id="${params.data.id}" 
                                      title="View Invoice Details">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    <span>View</span>
                                </button>
                            </div>`;
                }
            }
        }
    ],
    
    // ✅ CRITICAL: Fixed defaultColDef without autoHeight for stability
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        floatingFilter: true,
        
        // ✅ REMOVED: autoHeight prevents grid from rendering properly in payment management
        wrapHeaderText: true,
        autoHeaderHeight: true,
        
        cellStyle: {
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'normal',
            lineHeight: '1.4',
            padding: '8px'
        }
    },
   
    onGridReady: (params) => {
        pmtMgmtSupplierGridApi = params.api;
        console.log("[PmtMgmt] ✅ Business-Smart Supplier Invoices Grid ready with SVG icons");
        
        setTimeout(() => {
            loadSupplierInvoicesForMgmtTab('outstanding');
        }, 200);
    }
};

const pmtMgmtTeamGridOptions = {
    theme: 'alpine', // ✅ CONSISTENT: Same theme as supplier grid
    getRowId: params => params.data.id,
    
    pagination: true,
    paginationPageSize: 25, // ✅ CONSISTENT: Same as supplier grid
    paginationPageSizeSelector: [10, 25, 50, 100],
    
    // ✅ STABILITY: Fixed row height like supplier grid
    rowHeight: 60,
    domLayout: 'normal',
    
    columnDefs: [
        {
            headerName: "Team Name",
            width: 180,
            pinned: 'left',
            field: "teamName",
            
            // ✅ CONSISTENCY: Same filter setup as supplier grid
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                fontWeight: 'bold', 
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'normal',
                lineHeight: '1.4'
            }
        },
        {
            headerName: "Order Reference",
            width: 160,
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'normal',
                lineHeight: '1.4'
            },
            valueGetter: params => {
                const orderId = params.data.orderId;
                return orderId ? orderId : 'Unknown Order';
            },
            valueFormatter: params => {
                const orderId = params.value || 'Unknown';
                return orderId.length > 15 ? orderId.substring(0, 15) + '...' : orderId;
            }
        },
        {
            headerName: "Team Lead",
            width: 160,
            field: "teamLeadName",
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'normal',
                lineHeight: '1.4'
            }
        },
        {
            headerName: "Payment Date",
            width: 130,
            field: "paymentDate",
            
            filter: 'agDateColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center'
            },
            valueFormatter: params => {
                try {
                    const date = params.value?.toDate ? params.value.toDate() : new Date(params.value);
                    return date.toLocaleDateString();
                } catch {
                    return 'Unknown Date';
                }
            }
        },
        {
            headerName: "Amount Paid",
            width: 120,
            field: "amountPaid",
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            valueFormatter: params => formatCurrency(params.value || 0),
            cellStyle: { 
                color: '#059669', // Green for inbound payments
                fontWeight: 'bold',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
            }
        },
        {
            headerName: "Payment Mode",
            width: 120,
            field: "paymentMode",
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                display: 'flex',
                alignItems: 'center',
                fontSize: '12px'
            }
        },
        {
            headerName: "Days Since Submitted",
            width: 140,
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                textAlign: 'center',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            valueGetter: params => {
                const submittedDate = params.data.submittedOn?.toDate ? 
                    params.data.submittedOn.toDate() : 
                    (params.data.paymentDate?.toDate ? params.data.paymentDate.toDate() : new Date());
                const days = Math.ceil((new Date() - submittedDate) / (1000 * 60 * 60 * 24));
                return Math.max(0, days);
            },
            cellRenderer: params => {
                const days = params.value || 0;
                let colorClass, statusText, statusIcon;
                
                if (days > 5) {
                    colorClass = 'text-red-700 bg-red-100 border-red-300';
                    statusText = 'DELAYED';
                    statusIcon = `<svg class="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                  </svg>`;
                } else if (days > 2) {
                    colorClass = 'text-yellow-700 bg-yellow-100 border-yellow-300';
                    statusText = 'PENDING';
                    statusIcon = `<svg class="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                  </svg>`;
                } else {
                    colorClass = 'text-green-700 bg-green-100 border-green-300';
                    statusText = 'RECENT';
                    statusIcon = `<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                  </svg>`;
                }
                
                return `<div class="flex flex-col items-center justify-center h-full gap-1">
                            <div class="font-bold text-sm">${days}d</div>
                            <div class="flex items-center space-x-1 text-xs px-2 py-1 rounded-full border ${colorClass}">
                                ${statusIcon}
                                <span>${statusText}</span>
                            </div>
                        </div>`;
            }
        },
        {
            field: "paymentStatus",
            headerName: "Status",
            width: 130,
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            filterParams: {
                values: ['Pending Verification', 'Verified', 'Cancelled']
            },
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            
            cellRenderer: params => {
                const status = params.value || 'Pending Verification';
                
                const statusConfig = {
                    'Verified': { 
                        class: 'bg-green-100 text-green-800 border-green-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                               </svg>`, 
                        text: 'VERIFIED' 
                    },
                    'Pending Verification': { 
                        class: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                               </svg>`, 
                        text: 'PENDING' 
                    },
                    'Cancelled': { 
                        class: 'bg-gray-100 text-gray-800 border-gray-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                               </svg>`, 
                        text: 'CANCELLED' 
                    }
                };
                
                const config = statusConfig[status] || { 
                    class: 'bg-blue-100 text-blue-800 border-blue-300', 
                    icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                           </svg>`, 
                    text: status 
                };
                
                return `<span class="inline-flex items-center space-x-1 px-2 py-1 text-xs font-bold rounded-full border ${config.class}">
                            ${config.icon}
                            <span>${config.text}</span>
                        </span>`;
            }
        },
        {
            headerName: "Actions",
            width: 180,
            
            filter: false,
            floatingFilter: false,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            suppressSizeToFit: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
            },
            
            cellRenderer: params => {
                const paymentStatus = params.data.paymentStatus || 'Pending Verification';
                const currentUser = appState.currentUser;
                
                const hasFinancialPermissions = currentUser && (
                    currentUser.role === 'admin' || currentUser.role === 'finance'
                );
                
                if (!hasFinancialPermissions) {
                    return `<span class="text-xs text-gray-500 italic">View only</span>`;
                }
                
                if (paymentStatus === 'Verified') {
                    return `<div class="flex space-x-1">
                                <button class="pmt-mgmt-view-team-payment bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 flex items-center space-x-1" 
                                      data-id="${params.data.id}" 
                                      title="View Payment Details">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    <span>View Details</span>
                                </button>
                                <button class="pmt-mgmt-view-team-order bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 flex items-center space-x-1" 
                                      data-id="${params.data.orderId}" 
                                      title="View Consignment Order">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V9a2 2 0 00-2-2H9a2 2 0 00-2 2v2.25"/>
                                    </svg>
                                    <span>Order</span>
                                </button>
                            </div>`;
                } else if (paymentStatus === 'Pending Verification') {
                    // Pending payments - verify action
                    const daysWaiting = params.data.daysWaiting || 0;
                    const urgencyClass = daysWaiting > 5 ? 'animate-pulse' : '';
                    
                    return `<div class="flex space-x-1">
                                <button class="pmt-mgmt-verify-team-payment bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 font-semibold ${urgencyClass} flex items-center space-x-1" 
                                      data-id="${params.data.id}" 
                                      title="Verify Team Payment of ${formatCurrency(params.data.amountPaid || 0)}">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span>VERIFY ${formatCurrency(params.data.amountPaid || 0)}</span>
                                </button>
                                <button class="pmt-mgmt-view-team-payment bg-gray-500 text-white px-2 py-1 text-xs rounded hover:bg-gray-600 flex items-center space-x-1" 
                                      data-id="${params.data.id}" 
                                      title="View Payment Details">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    <span>View</span>
                                </button>
                            </div>`;
                } else {
                    // Other statuses - view only
                    return `<button class="pmt-mgmt-view-team-payment bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 flex items-center space-x-1" 
                                  data-id="${params.data.id}" 
                                  title="View Payment Details">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                <span>View Details</span>
                            </button>`;
                }
            }
        }
    ],
    
    // ✅ CONSISTENT: Same defaultColDef as supplier grid (without autoHeight)
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        floatingFilter: true,
        
        wrapHeaderText: true,
        autoHeaderHeight: true,
        
        cellStyle: {
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'normal',
            lineHeight: '1.4',
            padding: '8px'
        }
    },
   
    onGridReady: (params) => {
        pmtMgmtTeamGridApi = params.api;
        console.log("[PmtMgmt] ✅ Business-Smart Team Payments Grid ready with SVG icons");
        
        setTimeout(() => {
            loadTeamPaymentsForMgmtTab();
        }, 200);
    }
};


/**
 * HELPER: Check if invoice has pending payments awaiting verification
 */
function checkForPendingPayments(invoiceId) {
    // This would check if there are pending supplier payments for this invoice
    // Could be enhanced with real-time checking or cached data
    return false; // Placeholder - implement based on your data structure
}

const pmtMgmtSalesGridOptions = {
    theme: 'alpine', // ✅ CONSISTENT: Same theme as other payment management grids
    getRowId: params => params.data.id,
    
    pagination: true,
    paginationPageSize: 25, // ✅ CONSISTENT: Same pagination as other grids
    paginationPageSizeSelector: [10, 25, 50, 100],
    
    // ✅ STABILITY: Fixed row height like other grids
    rowHeight: 60,
    domLayout: 'normal',
    
    columnDefs: [
        {
            headerName: "Customer Name",
            width: 180,
            pinned: 'left',
            field: "customerName",
            
            // ✅ CONSISTENCY: Same filter setup
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                fontWeight: 'bold', 
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'normal',
                lineHeight: '1.4'
            }
        },
        {
            headerName: "Invoice Reference",
            width: 160,
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'normal',
                lineHeight: '1.4'
            },
            valueGetter: params => {
                const invoiceId = params.data.invoiceId;
                return invoiceId || 'Unknown Invoice';
            },
            valueFormatter: params => {
                const invoiceId = params.value || 'Unknown';
                return invoiceId.length > 15 ? invoiceId.substring(0, 15) + '...' : invoiceId;
            }
        },
        {
            headerName: "Store",
            width: 120,
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            filterParams: {
                values: ['Church Store', 'Tasty Treats']
            },
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: '500'
            },
            valueGetter: params => {
                // Get store from related invoice data if available
                return params.data.store || 'Unknown Store';
            },
            cellRenderer: params => {
                const store = params.value || 'Unknown';
                const storeConfig = {
                    'Church Store': { 
                        class: 'text-purple-700 bg-purple-100 border-purple-300',
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                               </svg>`
                    },
                    'Tasty Treats': { 
                        class: 'text-orange-700 bg-orange-100 border-orange-300',
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                               </svg>`
                    }
                };
                
                const config = storeConfig[store] || { 
                    class: 'text-gray-700 bg-gray-100 border-gray-300',
                    icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
                           </svg>`
                };
                
                return `<span class="inline-flex items-center space-x-1 px-2 py-1 text-xs font-semibold rounded-full border ${config.class}">
                            ${config.icon}
                            <span>${store}</span>
                        </span>`;
            }
        },
        {
            headerName: "Payment Date",
            width: 130,
            field: "paymentDate",
            
            filter: 'agDateColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center'
            },
            valueFormatter: params => {
                try {
                    const date = params.value?.toDate ? params.value.toDate() : new Date(params.value);
                    return date.toLocaleDateString();
                } catch {
                    return 'Unknown Date';
                }
            }
        },
        {
            headerName: "Amount Paid",
            width: 120,
            field: "amountPaid",
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            valueFormatter: params => formatCurrency(params.value || 0),
            cellStyle: { 
                color: '#059669', // Green for inbound payments
                fontWeight: 'bold',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
            }
        },
        {
            headerName: "Payment Mode",
            width: 120,
            field: "paymentMode",
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                display: 'flex',
                alignItems: 'center',
                fontSize: '12px'
            }
        },
        {
            headerName: "Transaction Ref",
            width: 140,
            field: "transactionRef",
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: { 
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center'
            },
            valueFormatter: params => {
                const ref = params.value || 'No Reference';
                return ref.length > 15 ? ref.substring(0, 15) + '...' : ref;
            }
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            filterParams: {
                values: ['Verified', 'Voided']
            },
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            
            cellRenderer: params => {
                const status = params.value || 'Verified';
                
                const statusConfig = {
                    'Verified': { 
                        class: 'bg-green-100 text-green-800 border-green-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                               </svg>`, 
                        text: 'VERIFIED' 
                    },
                    'Voided': { 
                        class: 'bg-gray-100 text-gray-800 border-gray-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                               </svg>`, 
                        text: 'VOIDED' 
                    },
                    'Pending': { 
                        class: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                               </svg>`, 
                        text: 'PENDING' 
                    }
                };
                
                const config = statusConfig[status] || { 
                    class: 'bg-blue-100 text-blue-800 border-blue-300', 
                    icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                           </svg>`, 
                    text: status.toUpperCase() 
                };
                
                return `<span class="inline-flex items-center space-x-1 px-2 py-1 text-xs font-bold rounded-full border ${config.class}">
                            ${config.icon}
                            <span>${config.text}</span>
                        </span>`;
            }
        },
        {
            headerName: "Actions",
            width: 180,
            
            filter: false,
            floatingFilter: false,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            suppressSizeToFit: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
            },
            
            cellRenderer: params => {
                const status = params.data.status || 'Verified';
                const currentUser = appState.currentUser;
                
                const hasFinancialPermissions = currentUser && (
                    currentUser.role === 'admin' || currentUser.role === 'finance'
                );
                
                if (!hasFinancialPermissions) {
                    return `<span class="text-xs text-gray-500 italic">View only</span>`;
                }
                
                if (status === 'Verified') {
                    return `<div class="flex space-x-1">
                                <button class="pmt-mgmt-void-sales-payment bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600 flex items-center space-x-1" 
                                      data-id="${params.data.id}" 
                                      title="Void Payment">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                    </svg>
                                    <span>Void</span>
                                </button>
                                <button class="pmt-mgmt-view-sales-payment bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 flex items-center space-x-1" 
                                      data-id="${params.data.id}" 
                                      title="View Payment Details">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                    </svg>
                                    <span>View</span>
                                </button>
                                <button class="pmt-mgmt-view-sales-invoice bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 flex items-center space-x-1" 
                                      data-id="${params.data.invoiceId}" 
                                      title="View Related Invoice">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                    <span>Invoice</span>
                                </button>
                            </div>`;
                } else if (status === 'Voided') {
                    return `<button class="pmt-mgmt-view-sales-payment bg-gray-500 text-white px-2 py-1 text-xs rounded hover:bg-gray-600 flex items-center space-x-1" 
                                  data-id="${params.data.id}" 
                                  title="View Voided Payment Details">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                <span>View Details</span>
                            </button>`;
                } else {
                    return `<button class="pmt-mgmt-view-sales-payment bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 flex items-center space-x-1" 
                                  data-id="${params.data.id}" 
                                  title="View Payment Details">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                <span>View Details</span>
                            </button>`;
                }
            }
        }
    ],
    
    // ✅ CONSISTENT: Same defaultColDef as other payment management grids
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        floatingFilter: true,
        
        wrapHeaderText: true,
        autoHeaderHeight: true,
        
        cellStyle: {
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'normal',
            lineHeight: '1.4',
            padding: '8px'
        }
    },
   
    onGridReady: (params) => {
        pmtMgmtSalesGridApi = params.api;
        console.log("[PmtMgmt] ✅ Business-Smart Sales Payments Grid ready with SVG icons");
        
        setTimeout(() => {
            loadSalesPaymentsForMgmtTab();
        }, 200);
    }
};


/**
 * ENHANCED: Show supplier payment modal with payment management integration
 */
export function showSupplierPaymentFromMgmt(invoiceData) {
    console.log('[PmtMgmt] Opening supplier payment modal with enhanced integration...');
    
    try {
        // ✅ POPULATE: Pre-fill supplier payment modal with invoice data
        const modal = document.getElementById('supplier-payment-modal');
        if (!modal) {
            showModal('error', 'Payment Modal Not Found', 
                'The supplier payment modal is not available. Please use the Purchase Management module instead.'
            );
            return;
        }
        
        // Pre-populate modal fields
        document.getElementById('supplier-payment-invoice-id').value = invoiceData.id;
        document.getElementById('supplier-payment-supplier-id').value = invoiceData.supplierId || '';
        
        // Set default payment amount to balance due
        const balanceDue = invoiceData.balanceDue || 0;
        document.getElementById('supplier-payment-amount-input').value = balanceDue.toFixed(2);
        
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('supplier-payment-date-input').value = today;
        
        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('visible'), 10);
        
        console.log('[PmtMgmt] ✅ Supplier payment modal opened with pre-filled data');
        
        // ✅ SETUP: Modal close handler to refresh payment management
        modal.addEventListener('close', () => {
            // Refresh supplier tab after modal closes
            setTimeout(() => {
                handlePmtMgmtSupplierRefresh();
            }, 500);
        });
        
    } catch (error) {
        console.error('[PmtMgmt] Error showing supplier payment modal:', error);
        showModal('error', 'Modal Error', 'Could not open supplier payment modal.');
    }
}

/**
 * Gets supplier invoice data from payment management grid
 */
export function getSupplierInvoiceFromMgmtGrid(invoiceId) {
    if (!pmtMgmtSupplierGridApi) {
        console.error('[PmtMgmt] Supplier grid API not available');
        return null;
    }
    
    try {
        const rowNode = pmtMgmtSupplierGridApi.getRowNode(invoiceId);
        return rowNode ? rowNode.data : null;
    } catch (error) {
        console.error('[PmtMgmt] Error getting invoice from grid:', error);
        return null;
    }
}


/**
 * BUSINESS ALTERNATIVE: Load outstanding sales invoices instead of just payments
 * (Similar to supplier approach - focus on what needs collection action)
 */
async function loadOutstandingSalesInvoices(filterStatus = 'outstanding') {
    console.log(`[PmtMgmt] 💳 Loading ${filterStatus} sales invoices for collection focus...`);
    
    if (!pmtMgmtSalesGridApi) return;
    
    try {
        pmtMgmtSalesGridApi.setGridOption('loading', true);
        
        const db = firebase.firestore();
        let query = db.collection(SALES_COLLECTION_PATH);
        
        switch (filterStatus) {
            case 'outstanding':
                // ✅ BUSINESS FOCUS: Unpaid and partially paid sales invoices (collection targets)
                query = query
                    .where('paymentStatus', 'in', ['Unpaid', 'Partially Paid'])
                    .orderBy('saleDate', 'desc');
                console.log('[PmtMgmt] Loading outstanding sales invoices for collection...');
                break;
                
            case 'paid':
                // Reference: Paid sales invoices
                query = query
                    .where('paymentStatus', '==', 'Paid')  
                    .orderBy('saleDate', 'desc')
                    .limit(25);
                console.log('[PmtMgmt] Loading paid sales invoices for reference...');
                break;
        }
        
        const snapshot = await query.get();
        const salesInvoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Enhance with collection context
        const enhancedInvoices = salesInvoices.map(invoice => ({
            ...invoice,
            daysOverdue: calculateDaysOverdue(invoice.saleDate),
            formattedTotal: formatCurrency(invoice.financials?.totalAmount || 0),
            formattedBalance: formatCurrency(invoice.balanceDue || 0),
            needsCollection: (invoice.balanceDue || 0) > 0
        }));
        
        pmtMgmtSalesGridApi.setGridOption('rowData', enhancedInvoices);
        pmtMgmtSalesGridApi.setGridOption('loading', false);
        
        console.log(`[PmtMgmt] ✅ Loaded ${enhancedInvoices.length} sales invoices (${snapshot.size} reads)`);
        
    } catch (error) {
        console.error('[PmtMgmt] Error loading sales invoices:', error);
    }
}

/**
 * Gets supplier invoice number for a payment (optimized lookup)
 */
function getInvoiceNumberForPayment(invoiceId) {
    if (!invoiceId) return 'Unknown';

    try {
        // ✅ OPTIMIZATION: Use cached invoice data if available from dashboard load
        const cachedInvoice = pmtMgmtState.invoiceCache?.get(invoiceId);
        if (cachedInvoice) {
            return cachedInvoice.supplierInvoiceNo || invoiceId;
        }

        // ✅ FALLBACK: Return invoice ID if we can't look up the supplier invoice number
        // This prevents empty cells while avoiding additional Firestore queries
        return invoiceId.substring(0, 20) + '...'; // Truncate long IDs

    } catch (error) {
        console.warn(`[PmtMgmt] Could not get invoice number for ${invoiceId}:`, error);
        return 'Unknown';
    }
}




// ===================================================================
// MODULE-SPECIFIC VARIABLES (Safe - isolated in this file)
// ===================================================================

let pmtMgmtDashboardInitialized = false;
let pmtMgmtCurrentTab = 'dashboard';

// Grid APIs (unique names to avoid conflicts)
let pmtMgmtSupplierGridApi = null;
let pmtMgmtTeamGridApi = null;
let pmtMgmtSalesGridApi = null;

// ✅ ADD: Supplier invoice details modal grids
let pmtMgmtSupplierLineItemsGridApi = null;
let pmtMgmtSupplierPaymentHistoryGridApi = null;


// ✅ FUTURE: Team payment details modal grids
let pmtMgmtTeamLineItemsGridApi = null;
let pmtMgmtTeamPaymentHistoryGridApi = null;

// ✅ FUTURE: Sales payment details modal grids  
let pmtMgmtSalesLineItemsGridApi = null;
let pmtMgmtSalesPaymentHistoryGridApi = null;


// Module state (isolated)
const pmtMgmtState = {
    dashboardMetrics: {
        urgentCount: 0,
        pendingCount: 0,
        receivablesAmount: 0,
        payablesAmount: 0,
        todayCount: 0
    },
    lastRefreshTime: null,
    autoRefreshInterval: null
};

// Configuration (unique to this module)
const PMT_MGMT_CONFIG = {
    REFRESH_INTERVAL: 30000,        // 30 seconds auto-refresh
    MAX_RECORDS_PER_TAB: 100,       // Performance limit
    DEFAULT_DATE_RANGE: 30          // Days to show by default
};

// ===================================================================
// MAIN ENTRY POINT
// ===================================================================

/**
 * Shows the payment management dashboard (main entry point from main.js)
 */
export function showPaymentManagementView() {
    console.log('[DEBUG] 🚀 showPaymentManagementView called');

    try {
        // Check if view exists
        const viewElement = document.getElementById('pmt-mgmt-view');
        console.log('[DEBUG] Payment management view element:', !!viewElement);

        if (!viewElement) {
            console.error('[DEBUG] ❌ pmt-mgmt-view element not found in DOM');
            showModal('error', 'View Not Found', 'Payment Management view was not found. Please check if the HTML was added correctly.');
            return;
        }

        console.log('[DEBUG] ✅ Showing payment management view...');
        showView('pmt-mgmt-view');

        // Initialize dashboard  
        if (!pmtMgmtDashboardInitialized) {
            console.log('[DEBUG] 🎯 Initializing dashboard for first time...');
            initializePaymentManagementDashboard();
            pmtMgmtDashboardInitialized = true;
        } else {
            console.log('[DEBUG] Dashboard already initialized, refreshing...');
            refreshPaymentManagementDashboard();
        }

    } catch (error) {
        console.error('[DEBUG] ❌ Error in showPaymentManagementView:', error);
    }
}

// ===================================================================
// DASHBOARD INITIALIZATION
// ===================================================================

/**
 * Initializes the payment management dashboard structure
 */
function initializePaymentManagementDashboard() {
    console.log('[DEBUG] 🎛️ initializePaymentManagementDashboard called');

    try {
        // Setup tab navigation
        console.log('[DEBUG] Setting up tab navigation...');
        setupPaymentMgmtTabNavigation();

        // Setup event listeners
        console.log('[DEBUG] Setting up event listeners...');
        setupPaymentMgmtEventListeners();

        // Initialize default tab (dashboard)
        console.log('[DEBUG] Switching to default dashboard tab...');
        switchPaymentMgmtTab('pmt-mgmt-tab-dashboard', 'pmt-mgmt-dashboard-content');

        console.log('[DEBUG] ✅ Dashboard initialization completed');

    } catch (error) {
        console.error('[DEBUG] ❌ Dashboard initialization failed:', error);
    }
}

/**
 * Sets up tab navigation event listeners
 */
function setupPaymentMgmtTabNavigation() {
    console.log('[DEBUG] 🎯 Setting up payment management tab navigation...');

    const tabs = [
        { tabId: 'pmt-mgmt-tab-dashboard', contentId: 'pmt-mgmt-dashboard-content' },
        { tabId: 'pmt-mgmt-tab-suppliers', contentId: 'pmt-mgmt-suppliers-content' },
        { tabId: 'pmt-mgmt-tab-teams', contentId: 'pmt-mgmt-teams-content' },
        { tabId: 'pmt-mgmt-tab-sales', contentId: 'pmt-mgmt-sales-content' }
    ];

    tabs.forEach((tab, index) => {
        const tabElement = document.getElementById(tab.tabId);
        console.log(`[DEBUG] Tab ${index + 1} (${tab.tabId}):`, !!tabElement);

        if (tabElement) {
            tabElement.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`[DEBUG] 🖱️ Tab clicked: ${tab.tabId} → ${tab.contentId}`);
                switchPaymentMgmtTab(tab.tabId, tab.contentId);
            });

            console.log(`[DEBUG] ✅ Event listener added to: ${tab.tabId}`);
        } else {
            console.error(`[DEBUG] ❌ Tab element not found: ${tab.tabId}`);
        }
    });

    console.log('[DEBUG] ✅ Tab navigation setup completed');
}


/**
 * Sets up payment management event listeners
 */
function setupPaymentMgmtEventListeners() {
    // Dashboard refresh button
    const refreshButton = document.getElementById('pmt-mgmt-refresh-all');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            refreshPaymentManagementDashboard();
        });
    }

    // Quick action buttons (will be implemented in next steps)
    console.log('[PmtMgmt] ✅ Event listeners setup completed');
}

// ===================================================================
// TAB MANAGEMENT
// ===================================================================

/**
 * Switches between payment management tabs
 */
export function switchPaymentMgmtTab(activeTabId, activeContentId) {
    console.log(`[DEBUG] switchPaymentMgmtTab called with:`, {
        activeTabId: activeTabId,
        activeContentId: activeContentId
    });

    try {
        // Update tab active states
        console.log('[DEBUG] Updating tab active states...');
        document.querySelectorAll('.pmt-mgmt-tab').forEach(tab => {
            tab.classList.remove('active');
            console.log(`[DEBUG] Removed active from tab: ${tab.id}`);
        });

        const activeTab = document.getElementById(activeTabId);
        console.log('[DEBUG] Active tab element found:', !!activeTab);
        if (activeTab) {
            activeTab.classList.add('active');
            console.log(`[DEBUG] ✅ Added active to tab: ${activeTabId}`);
        }

        // Update content visibility
        console.log('[DEBUG] Updating content visibility...');
        document.querySelectorAll('.pmt-mgmt-tab-content').forEach(content => {
            content.classList.remove('active');
            console.log(`[DEBUG] Removed active from content: ${content.id}`);
        });

        const activeContent = document.getElementById(activeContentId);
        console.log('[DEBUG] Active content element found:', !!activeContent);
        if (activeContent) {
            activeContent.classList.add('active');
            console.log(`[DEBUG] ✅ Added active to content: ${activeContentId}`);
        }

        // ✅ CRITICAL: Initialize tab-specific content
        console.log(`[DEBUG] Calling initializePaymentMgmtTabContent for: ${activeContentId}`);
        initializePaymentMgmtTabContent(activeContentId);

        pmtMgmtCurrentTab = activeContentId;
        console.log(`[DEBUG] ✅ Tab switch completed: ${activeTabId}`);

    } catch (error) {
        console.error('[DEBUG] ❌ Error in switchPaymentMgmtTab:', error);
    }
}

/**
 * Initializes content for specific payment management tab
 * 
 */
function initializePaymentMgmtTabContent(contentId) {
    console.log(`[DEBUG] 🚀 initializePaymentMgmtTabContent called for: ${contentId}`);

    switch (contentId) {
        case 'pmt-mgmt-dashboard-content':
            console.log('[DEBUG] Initializing dashboard content...');
            refreshPaymentManagementDashboard();
            break;

        case 'pmt-mgmt-suppliers-content':
            console.log('[DEBUG] 📤 Calling initializeSupplierPaymentsTab()');
            initializeSupplierPaymentsTab();
            break;

        case 'pmt-mgmt-teams-content':
            console.log('[DEBUG] 👥 Calling initializeTeamPaymentsTab()');
            initializeTeamPaymentsTab();
            break;

        case 'pmt-mgmt-sales-content':
            console.log('[DEBUG] 💳 Calling initializeSalesPaymentsTab()');
            initializeSalesPaymentsTab();
            break;

        default:
            console.warn(`[DEBUG] ❌ Unknown tab content: ${contentId}`);
    }
}


/**
 * Updates action items section with high-priority payments
 */
function updatePaymentMgmtActionItems(metrics) {
    const actionItemsContainer = document.getElementById('pmt-mgmt-action-items');
    if (!actionItemsContainer) return;

    console.log('[PmtMgmt] Updating VERIFICATION-FOCUSED action items section...');

    const verificationItems = [];

    // ✅ SIMPLIFIED: Only show verification tasks
    if (metrics.supplierMetrics && metrics.supplierMetrics.pending > 0) {
        verificationItems.push({
            priority: 'high',
            icon: '📤',
            title: `${metrics.supplierMetrics.pending} supplier payments need verification`,
            description: `${formatCurrency(metrics.supplierMetrics.pendingAmount || 0)} awaiting admin approval`,
            details: `Verify to update invoice balances and maintain supplier relationships`,
            action: 'verify-supplier-payments',
            color: 'red',
            urgency: metrics.supplierMetrics.pending > 5 ? 'critical' : 'high'
        });
    }

    if (metrics.teamMetrics && metrics.teamMetrics.pending > 0) {
        verificationItems.push({
            priority: 'medium',
            icon: '👥',
            title: `${metrics.teamMetrics.pending} team payments need verification`,
            description: `${formatCurrency(metrics.teamMetrics.pendingAmount || 0)} from consignment teams`,
            details: `Verify to complete team settlements and update order balances`,
            action: 'verify-team-payments',
            color: 'green',
            urgency: metrics.teamMetrics.pending > 3 ? 'high' : 'medium'
        });
    }

    // ✅ FUTURE: Add other verification types
    if (metrics.salesMetrics && metrics.salesMetrics.voidRequests > 0) {
        verificationItems.push({
            priority: 'medium',
            icon: '💳',
            title: `${metrics.salesMetrics.voidRequests} void requests need approval`,
            description: `Sales payment void requests awaiting admin approval`,
            details: `Review and approve/reject payment void requests`,
            action: 'review-void-requests',
            color: 'blue',
            urgency: 'medium'
        });
    }

    if (verificationItems.length === 0) {
        // ✅ ENHANCED: All verifications complete
        actionItemsContainer.innerHTML = `
            <div class="text-center py-8">
                <svg class="w-16 h-16 mx-auto text-green-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h4 class="text-xl font-semibold text-green-700">All Verifications Complete!</h4>
                <p class="text-sm text-green-600 mt-2">No payment verifications are pending your approval.</p>
                <div class="mt-4 p-3 bg-green-50 rounded-lg">
                    <p class="text-sm text-gray-600">
                        <span class="font-semibold">Today's Activity:</span> 
                        ${metrics.todayCount || 0} payments processed (${formatCurrency(metrics.todayAmount || 0)})
                    </p>
                </div>
                <div class="mt-4 text-xs text-gray-500">
                    💡 Use the tabs above to initiate new payments or review payment history
                </div>
            </div>
        `;
    } else {
        // ✅ VERIFICATION-FOCUSED: Show verification action items
        const verificationItemsHtml = verificationItems.map(item => {
            const priorityStyles = {
                'critical': 'border-red-400 bg-red-50',
                'high': 'border-orange-400 bg-orange-50', 
                'medium': 'border-yellow-400 bg-yellow-50',
                'low': 'border-gray-400 bg-gray-50'
            };
            
            const buttonStyles = {
                'red': 'bg-red-600 hover:bg-red-700',
                'green': 'bg-green-600 hover:bg-green-700',
                'blue': 'bg-blue-600 hover:bg-blue-700',
                'yellow': 'bg-yellow-600 hover:bg-yellow-700'
            };
            
            const containerStyle = priorityStyles[item.urgency] || priorityStyles['medium'];
            const buttonStyle = buttonStyles[item.color] || buttonStyles['blue'];
            const pulseClass = item.urgency === 'critical' ? 'animate-pulse' : '';
            
            return `
                <div class="flex items-center justify-between p-4 border-l-4 rounded-r-lg ${containerStyle}">
                    <div class="flex items-center space-x-4">
                        <div class="text-3xl">${item.icon}</div>
                        <div class="flex-1">
                            <h5 class="font-semibold text-gray-900">${item.title}</h5>
                            <p class="text-sm text-gray-600">${item.description}</p>
                            <p class="text-xs text-gray-500 mt-1">${item.details}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-3">
                        ${item.urgency === 'critical' ? 
                            `<div class="text-red-600 font-bold text-sm">
                                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/>
                                </svg>
                                URGENT
                             </div>` : ''
                        }
                        
                        <button class="pmt-mgmt-verification-action bg-green-600 text-white px-4 py-2 text-sm font-semibold rounded transition-colors hover:bg-green-700 ${pulseClass}"
                                data-verification-action="${item.action}"
                                data-verification-type="${item.color}">
                            <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Verify Now
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        actionItemsContainer.innerHTML = verificationItemsHtml;
    }

    console.log(`[PmtMgmt] ✅ Updated VERIFICATION action items: ${verificationItems.length} verifications needed`);
}

/**
 * Updates tab badges with payment counts
 */
function updatePaymentMgmtTabBadges(metrics) {
    const badges = {
        supplier: document.getElementById('pmt-mgmt-supplier-badge'),
        team: document.getElementById('pmt-mgmt-team-badge'),
        sales: document.getElementById('pmt-mgmt-sales-badge')
    };

    if (badges.supplier) {
        badges.supplier.textContent = metrics.supplierMetrics.pending || 0;
        badges.supplier.className = `ml-2 text-xs px-2 py-1 rounded-full ${metrics.supplierMetrics.pending > 0
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-600'
            }`;
    }

    if (badges.team) {
        badges.team.textContent = metrics.teamMetrics.pending || 0;
        badges.team.className = `ml-2 text-xs px-2 py-1 rounded-full ${metrics.teamMetrics.pending > 0
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-600'
            }`;
    }

    if (badges.sales) {
        badges.sales.textContent = metrics.salesMetrics.pending || 0;
        badges.sales.className = `ml-2 text-xs px-2 py-1 rounded-full ${metrics.salesMetrics.pending > 0
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-600'
            }`;
    }

    console.log('[PmtMgmt] ✅ Tab badges updated with pending counts');
}


/**
 * Handles quick action button clicks from dashboard
 */
function handlePaymentMgmtQuickAction(action) {
    console.log(`[PmtMgmt] Quick action triggered: ${action}`);

    switch (action) {
        case 'verify-pending':
            // Switch to appropriate tab with pending filter
            switchPaymentMgmtTab('pmt-mgmt-tab-suppliers', 'pmt-mgmt-suppliers-content');
            break;

        case 'goto-suppliers':
            switchPaymentMgmtTab('pmt-mgmt-tab-suppliers', 'pmt-mgmt-suppliers-content');
            break;

        case 'goto-teams':
            switchPaymentMgmtTab('pmt-mgmt-tab-teams', 'pmt-mgmt-teams-content');
            break;

        case 'goto-sales':
            switchPaymentMgmtTab('pmt-mgmt-tab-sales', 'pmt-mgmt-sales-content');
            break;

        default:
            console.warn('[PmtMgmt] Unknown quick action:', action);
    }
}



// ===================================================================
// DASHBOARD DATA MANAGEMENT
// ===================================================================

/**
 * Refreshes all payment management dashboard data
 */
export async function refreshPaymentManagementDashboard() {
    console.log('[PmtMgmt] 🔄 Refreshing dashboard with Firestore optimization...');

    try {
        ProgressToast.show('Loading Payment Dashboard', 'info');
        ProgressToast.updateProgress('Optimizing data queries for free tier...', 25);

        // ✅ OPTIMIZED: Load metrics with caching and limits
        const startTime = Date.now();
        const metrics = await loadPaymentMgmtMetrics();
        const loadTime = Date.now() - startTime;

        ProgressToast.updateProgress('Processing payment data...', 60);

        // Update dashboard cards
        updatePaymentMgmtDashboardCards(metrics);

        // Update action items (high-priority payments)
        updatePaymentMgmtActionItems(metrics);

        // Update tab badges with counts
        updatePaymentMgmtTabBadges(metrics);

        // Update last refresh time with performance info
        pmtMgmtState.lastRefreshTime = new Date();
        const refreshElement = document.getElementById('pmt-mgmt-last-refresh');
        if (refreshElement) {
            refreshElement.textContent = `${pmtMgmtState.lastRefreshTime.toLocaleTimeString()} (${metrics.totalFirestoreReads} reads)`;
        }

        ProgressToast.updateProgress('Dashboard updated successfully!', 100);

        setTimeout(() => {
            ProgressToast.hide(300);

            // Show performance info for free tier awareness
            if (metrics.totalFirestoreReads > 0) {
                console.log(`[PmtMgmt] 📊 PERFORMANCE SUMMARY:`);
                console.log(`  🔥 Firestore Reads: ${metrics.totalFirestoreReads}`);
                console.log(`  ⚡ Load Time: ${loadTime}ms`);
                console.log(`  💾 Cache Status: ${metrics.totalFirestoreReads === 0 ? 'Hit (saved reads)' : 'Miss (fresh data)'}`);
                console.log(`  ⏰ Next Cache Expiry: ${new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString()}`);
            }
        }, 800);

        console.log('[PmtMgmt] ✅ Dashboard refresh completed');

    } catch (error) {
        console.error('[PmtMgmt] Dashboard refresh failed:', error);
        ProgressToast.showError('Failed to refresh dashboard data');

        setTimeout(() => {
            showModal('error', 'Dashboard Refresh Failed',
                `Could not refresh payment management data.\n\n` +
                `Error: ${error.message}\n\n` +
                `This might be due to:\n` +
                `• Network connectivity issues\n` +
                `• Firestore quota limits reached\n` +
                `• Database permission changes\n\n` +
                `Try again in a few minutes or contact support.`
            );
        }, 1500);
    }
}

// ===================================================================
// ENHANCED CACHING SYSTEM (FREE TIER OPTIMIZATION)
// ===================================================================

/**
 * Enhanced cache function with multiple cache durations
 */
function getCachedPaymentMetrics(cacheKey, maxAgeMinutes = 3) {
    try {
        const cached = localStorage.getItem(`pmt_mgmt_${cacheKey}`);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const ageMinutes = (Date.now() - timestamp) / (1000 * 60);

        if (ageMinutes < maxAgeMinutes) {
            console.log(`[PmtMgmt] Cache hit: ${cacheKey} (${ageMinutes.toFixed(1)}min old)`);
            return data;
        } else {
            console.log(`[PmtMgmt] Cache expired: ${cacheKey} (${ageMinutes.toFixed(1)}min old)`);
            localStorage.removeItem(`pmt_mgmt_${cacheKey}`);
            return null;
        }

    } catch (error) {
        console.warn(`[PmtMgmt] Cache read error for ${cacheKey}:`, error);
        return null;
    }
}

/**
 * Enhanced cache storage with metadata
 */
function cachePaymentMetrics(cacheKey, data) {
    try {
        const cacheData = {
            data: data,
            timestamp: Date.now(),
            version: '1.0.0',
            module: 'PaymentManagement'
        };

        localStorage.setItem(`pmt_mgmt_${cacheKey}`, JSON.stringify(cacheData));
        console.log(`[PmtMgmt] ✅ Cached: ${cacheKey}`);

    } catch (error) {
        console.warn(`[PmtMgmt] Cache write error for ${cacheKey}:`, error);
    }
}

/**
 * Clears payment management cache (utility function)
 */
export function clearPaymentMgmtCache() {
    const keys = Object.keys(localStorage);
    const pmtMgmtKeys = keys.filter(key => key.startsWith('pmt_mgmt_'));

    pmtMgmtKeys.forEach(key => localStorage.removeItem(key));
    console.log(`[PmtMgmt] ✅ Cleared ${pmtMgmtKeys.length} cached items`);
}


// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Calculates days between two dates
 */
function calculateDaysOverdue(dueDate, currentDate = new Date()) {
    if (!dueDate) return 0;

    const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    const diffTime = currentDate - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}



/**
 * Determines payment priority based on amount, age, and status
 */
function calculatePaymentPriority(payment) {
    const amount = payment.amountPaid || 0;
    const status = (payment.paymentStatus || payment.status || '').toLowerCase();
    const daysOverdue = calculateDaysOverdue(payment.dueDate);

    // Priority scoring
    let priority = 'normal';

    if (status === 'pending verification' && daysOverdue > 5) {
        priority = 'urgent';
    } else if (amount > 10000 && status === 'pending verification') {
        priority = 'high';
    } else if (daysOverdue > 2) {
        priority = 'high';
    }

    return {
        level: priority,
        score: daysOverdue + (amount > 5000 ? 2 : 0),
        reason: `${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Pending verification'}`
    };
}




/**
 * FREE TIER OPTIMIZED: Loads payment metrics with minimal Firestore reads
 * 
 * Uses intelligent caching, query limits, and client-side aggregation to
 * minimize database usage. Caches results for 5 minutes to reduce repeated reads.
 * 
 * OPTIMIZATION STRATEGIES:
 * - 5-minute localStorage caching for dashboard metrics
 * - Query limits to prevent excessive reads (max 50 per collection)
 * - Client-side aggregation instead of multiple queries
 * - Uses existing masterData cache when possible
 * 
 * @returns {Promise<Object>} Dashboard metrics with Firestore read tracking
 */
async function loadPaymentMgmtMetrics() {
    console.log('[PmtMgmt] 📊 Loading dashboard metrics with Firestore optimization...');

    // ✅ CACHE CHECK: 5-minute cache for dashboard metrics
    const cacheKey = 'pmt_mgmt_dashboard_metrics';
    const cachedMetrics = getCachedPaymentMetrics(cacheKey);

    if (cachedMetrics) {
        console.log('[PmtMgmt] ✅ Using cached dashboard metrics - 0 Firestore reads');
        return cachedMetrics;
    }

    const db = firebase.firestore();
    let totalFirestoreReads = 0;
    const startTime = Date.now();

    try {
        // ===================================================================
        // PHASE 1: OPTIMIZED SUPPLIER PAYMENTS (Limited Query)
        // ===================================================================
        console.log('[PmtMgmt] 📤 Phase 1: Loading supplier payment metrics...');

        const supplierPaymentsQuery = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
            .orderBy('paymentDate', 'desc')
            .limit(50); // ✅ LIMIT: Prevent excessive reads

        const supplierSnapshot = await supplierPaymentsQuery.get();
        totalFirestoreReads += supplierSnapshot.size;

        const supplierPayments = supplierSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            paymentType: 'supplier'
        }));

        console.log(`[PmtMgmt] Retrieved ${supplierPayments.length} supplier payments`);

        // ===================================================================
        // PHASE 2: OPTIMIZED CONSIGNMENT PAYMENTS (Limited Query) 
        // ===================================================================
        console.log('[PmtMgmt] 👥 Phase 2: Loading team payment metrics...');

        const teamPaymentsQuery = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .orderBy('paymentDate', 'desc')
            .limit(50); // ✅ LIMIT: Prevent excessive reads

        const teamSnapshot = await teamPaymentsQuery.get();
        totalFirestoreReads += teamSnapshot.size;

        const teamPayments = teamSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            paymentType: 'consignment'
        }));

        console.log(`[PmtMgmt] Retrieved ${teamPayments.length} team payments`);

        // ===================================================================
        // PHASE 3: OPTIMIZED SALES PAYMENTS (Limited Query)
        // ===================================================================
        console.log('[PmtMgmt] 💳 Phase 3: Loading sales payment metrics...');

        const salesPaymentsQuery = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH)
            .orderBy('paymentDate', 'desc')
            .limit(50); // ✅ LIMIT: Prevent excessive reads

        const salesSnapshot = await salesPaymentsQuery.get();
        totalFirestoreReads += salesSnapshot.size;

        const salesPayments = salesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            paymentType: 'customer'
        }));

        console.log(`[PmtMgmt] Retrieved ${salesPayments.length} sales payments`);

        // ===================================================================
        // PHASE 4: CLIENT-SIDE AGGREGATION (No Additional Reads)
        // ===================================================================
        console.log('[PmtMgmt] 🧮 Phase 4: Calculating metrics client-side...');

        const allPayments = [...supplierPayments, ...teamPayments, ...salesPayments];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ✅ CLIENT-SIDE: Calculate all metrics without additional queries
        const metrics = {
            // Urgent actions (overdue + pending)
            urgentCount: 0,
            urgentDetails: '',

            // Pending verification
            pendingCount: 0,
            pendingAmount: 0,

            // Outstanding receivables (money owed to us)
            receivablesAmount: 0,
            receivablesCount: 0,

            // Outstanding payables (money we owe)
            payablesAmount: 0,
            payablesCount: 0,

            // Today's activity
            todayCount: 0,
            todayAmount: 0,

            // Breakdown by type
            supplierMetrics: {
                total: supplierPayments.length,
                pending: 0,
                verified: 0,
                amount: 0
            },
            teamMetrics: {
                total: teamPayments.length,
                pending: 0,
                verified: 0,
                amount: 0
            },
            salesMetrics: {
                total: salesPayments.length,
                pending: 0,
                verified: 0,
                amount: 0
            },

            // Metadata
            totalFirestoreReads: totalFirestoreReads,
            calculationTime: 0,
            cacheKey: cacheKey
        };

        // EFFICIENT SINGLE-PASS PROCESSING
        allPayments.forEach(payment => {
            const amount = payment.amountPaid || 0;
            const status = (payment.paymentStatus || payment.status || '').toLowerCase();
            const paymentDate = payment.paymentDate?.toDate ? payment.paymentDate.toDate() : new Date(payment.paymentDate);
            const isToday = paymentDate >= today;

            // Count pending verifications
            if (status === 'pending verification' || status === 'pending') {
                metrics.pendingCount++;
                metrics.pendingAmount += amount;
                metrics.urgentCount++; // Pending payments are urgent
            }

            // Count today's activity
            if (isToday && (status === 'verified' || status === 'completed')) {
                metrics.todayCount++;
                metrics.todayAmount += amount;
            }

            // Calculate by payment type
            switch (payment.paymentType) {
                case 'supplier':
                    metrics.supplierMetrics.amount += amount;
                    if (status === 'pending verification') metrics.supplierMetrics.pending++;
                    if (status === 'verified') metrics.supplierMetrics.verified++;

                    // Supplier payments are payables (money we owe)
                    if (status === 'pending verification') {
                        metrics.payablesAmount += amount;
                        metrics.payablesCount++;
                    }
                    break;

                case 'consignment':
                case 'customer':
                    if (payment.paymentType === 'consignment') {
                        metrics.teamMetrics.amount += amount;
                        if (status === 'pending verification') metrics.teamMetrics.pending++;
                        if (status === 'verified') metrics.teamMetrics.verified++;
                    } else {
                        metrics.salesMetrics.amount += amount;
                        if (status === 'pending verification') metrics.salesMetrics.pending++;
                        if (status === 'verified') metrics.salesMetrics.verified++;
                    }

                    // Team/customer payments are receivables (money owed to us)
                    // Note: This logic might need refinement based on your business model
                    break;
            }
        });

        // Calculate urgent details
        const pendingText = metrics.pendingCount > 0 ? `${metrics.pendingCount} pending` : '';
        metrics.urgentDetails = pendingText;

        const executionTime = Date.now() - startTime;
        metrics.calculationTime = executionTime;

        console.log('[PmtMgmt] 🎯 METRICS CALCULATION SUMMARY:');
        console.log(`  💰 Total Payments Analyzed: ${allPayments.length}`);
        console.log(`  ⚠️  Urgent Actions: ${metrics.urgentCount}`);
        console.log(`  ⏳ Pending Verification: ${metrics.pendingCount} (${formatCurrency(metrics.pendingAmount)})`);
        console.log(`  📊 Today's Activity: ${metrics.todayCount} payments (${formatCurrency(metrics.todayAmount)})`);
        console.log(`  🔥 Firestore Reads Used: ${totalFirestoreReads}`);
        console.log(`  ⚡ Calculation Time: ${executionTime}ms`);

        // ✅ CACHE: Store results for 5 minutes
        cachePaymentMetrics(cacheKey, metrics);

        return metrics;

    } catch (error) {
        console.error('[PmtMgmt] ❌ Error loading payment metrics:', error);
        throw new Error(`Payment metrics loading failed: ${error.message}`);
    }
}


/**
 * Updates dashboard metric cards
 */
function updatePaymentMgmtDashboardCards(metrics) {
    const elements = {
        urgent: document.getElementById('pmt-mgmt-urgent-count'),
        pending: document.getElementById('pmt-mgmt-pending-count'),
        pendingAmount: document.getElementById('pmt-mgmt-pending-amount'),
        receivables: document.getElementById('pmt-mgmt-receivables-amount'),
        receivablesCount: document.getElementById('pmt-mgmt-receivables-count'),
        payables: document.getElementById('pmt-mgmt-payables-amount'),
        payablesCount: document.getElementById('pmt-mgmt-payables-count'),
        today: document.getElementById('pmt-mgmt-today-count'),
        todayAmount: document.getElementById('pmt-mgmt-today-amount')
    };

    // Update card values safely
    if (elements.urgent) elements.urgent.textContent = metrics.urgentCount || 0;
    if (elements.pending) elements.pending.textContent = metrics.pendingCount || 0;
    if (elements.pendingAmount) elements.pendingAmount.textContent = formatCurrency(metrics.pendingAmount || 0);
    if (elements.receivables) elements.receivables.textContent = formatCurrency(metrics.receivablesAmount || 0);
    if (elements.receivablesCount) elements.receivablesCount.textContent = `${metrics.receivablesCount || 0} invoices`;
    if (elements.payables) elements.payables.textContent = formatCurrency(metrics.payablesAmount || 0);
    if (elements.payablesCount) elements.payablesCount.textContent = `${metrics.payablesCount || 0} invoices`;
    if (elements.today) elements.today.textContent = metrics.todayCount || 0;
    if (elements.todayAmount) elements.todayAmount.textContent = formatCurrency(metrics.todayAmount || 0);

    console.log('[PmtMgmt] ✅ Dashboard cards updated with latest metrics');
}

// ===================================================================
// TAB INITIALIZATION PLACEHOLDERS (Implement in next steps)
// ===================================================================

/**
 * ENHANCED: Load supplier payments with complete context
 */



/**
 * Initializes supplier payments tab (placeholder)
 */
function initializeSupplierPaymentsTab() {
    console.log('[PmtMgmt] 📤 Initializing BUSINESS-SMART Supplier Invoices tab...');
    
    const gridContainer = document.getElementById('pmt-mgmt-supplier-grid');
    if (!gridContainer) {
        console.error('[PmtMgmt] Supplier grid container not found');
        return;
    }
    
    if (!pmtMgmtSupplierGridApi) {
        pmtMgmtSupplierGridApi = createGrid(gridContainer, pmtMgmtSupplierGridOptions);
        console.log('[PmtMgmt] ✅ Business-smart supplier grid created');
    }
    
    setupSupplierPaymentFilters();
}

/**
 * BUSINESS-FOCUSED: Load supplier invoices based on payment operations needs
 * 
 * DEFAULT: Shows outstanding invoices (Unpaid/Partially Paid) - immediate action items
 * REFERENCE: Shows paid invoices with pagination - historical reference
 * EFFICIENCY: Minimizes reads by focusing on actionable business data
 */
async function loadSupplierInvoicesForMgmtTab(filterStatus = 'outstanding', paginationOptions = {}) {
    const {
        page = 1,
        pageSize = 25,
        lastDocSnapshot = null,
        forceRefresh = false
    } = paginationOptions;

    console.log(`[PmtMgmt] 🎯 BUSINESS-SMART loading: ${filterStatus} supplier invoices (page ${page})`);

    if (!pmtMgmtSupplierGridApi) {
        console.error('[PmtMgmt] Supplier grid API not ready');
        return;
    }

    try {
        pmtMgmtSupplierGridApi.setGridOption('loading', true);

        // Smart caching strategy
        const cacheMinutes = filterStatus === 'outstanding' ? 2 : 10;
        const cacheKey = `pmt_mgmt_supplier_${filterStatus}_p${page}`;
        
        if (!forceRefresh && page === 1) {
            const cached = getCachedPaymentMetrics(cacheKey, cacheMinutes);
            if (cached && cached.invoices) {
                console.log(`[PmtMgmt] ✅ Using cached ${filterStatus} invoices - 0 reads`);
                pmtMgmtSupplierGridApi.setGridOption('rowData', cached.invoices);
                pmtMgmtSupplierGridApi.setGridOption('loading', false);
                updateSupplierInvoicesSummary(cached.metadata, cached.invoices);
                return cached;
            }
        }

        const db = firebase.firestore();
        let query = db.collection(PURCHASE_INVOICES_COLLECTION_PATH);
        let totalReads = 0;

        // ===================================================================
        // BUSINESS-OPTIMIZED QUERY BUILDING
        // ===================================================================
        
        switch (filterStatus) {
            case 'outstanding':
                console.log('[PmtMgmt] 🎯 PRIORITY: Loading ALL outstanding invoices (complete action list)');
                query = query
                    .where('paymentStatus', 'in', ['Unpaid', 'Partially Paid'])
                    .orderBy('purchaseDate', 'asc'); // ✅ BUSINESS SMART: Oldest first (highest priority)
                break;
                
            case 'paid':
                console.log(`[PmtMgmt] 📚 REFERENCE: Loading paid invoices page ${page} (historical data)`);
                query = query
                    .where('paymentStatus', '==', 'Paid')
                    .orderBy('purchaseDate', 'desc'); // Recent paid first
                
                if (lastDocSnapshot && page > 1) {
                    query = query.startAfter(lastDocSnapshot);
                }
                query = query.limit(pageSize);
                break;
        }

        // Execute query
        const snapshot = await query.get();
        totalReads = snapshot.size;

        const invoices = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            _docSnapshot: doc
        }));

        console.log(`[PmtMgmt] ✅ QUERY RESULTS: ${invoices.length} ${filterStatus} invoices (${totalReads} reads)`);

        // ===================================================================
        // BUSINESS INTELLIGENCE ENHANCEMENT
        // ===================================================================
        const enhancedInvoices = invoices.map(invoice => {
            const daysOutstanding = calculateDaysOutstanding(invoice.purchaseDate);
            const urgency = calculateBusinessUrgency(invoice, daysOutstanding);
            
            return {
                ...invoice,
                daysOutstanding: daysOutstanding,
                urgencyLevel: urgency.level,
                urgencyReason: urgency.reason,
                requiresImmediateAction: urgency.level === 'critical' || urgency.level === 'high',
                isOverdue: daysOutstanding > 30,
                formattedTotal: formatCurrency(invoice.invoiceTotal || 0),
                formattedPaid: formatCurrency(invoice.amountPaid || 0),
                formattedBalance: formatCurrency(invoice.balanceDue || 0),
                formattedDate: invoice.purchaseDate?.toDate ? 
                    invoice.purchaseDate.toDate().toLocaleDateString() : 'Unknown',
                _docSnapshot: undefined
            };
        });

        // ===================================================================
        // PAGINATION AND DISPLAY LOGIC
        // ===================================================================
        const hasMorePages = filterStatus === 'paid' && invoices.length === pageSize;
        
        if (page === 1) {
            // First page or outstanding (replace data)
            pmtMgmtSupplierGridApi.setGridOption('rowData', enhancedInvoices);
        } else {
            // Subsequent pages for paid invoices (append data)
            const currentData = [];
            pmtMgmtSupplierGridApi.forEachNode(node => currentData.push(node.data));
            const combinedData = [...currentData, ...enhancedInvoices];
            pmtMgmtSupplierGridApi.setGridOption('rowData', combinedData);
            console.log(`[PmtMgmt] ✅ Appended page ${page}: ${combinedData.length} total invoices`);
        }

        pmtMgmtSupplierGridApi.setGridOption('loading', false);

        // Update pagination state
        supplierInvoicesPagination.currentPage = page;
        supplierInvoicesPagination.hasMorePages = hasMorePages;
        if (invoices.length > 0) {
            supplierInvoicesPagination.lastSnapshot = invoices[invoices.length - 1]._docSnapshot;
        }

        // Business metrics
        const businessMetrics = {
            filterStatus: filterStatus,
            totalInvoices: enhancedInvoices.length,
            currentPage: page,
            hasMorePages: hasMorePages,
            lastDocument: supplierInvoicesPagination.lastSnapshot,
            totalReads: totalReads,
            
            // Business intelligence
            totalOutstanding: enhancedInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0),
            criticalCount: enhancedInvoices.filter(inv => inv.urgencyLevel === 'critical').length,
            overdueCount: enhancedInvoices.filter(inv => inv.isOverdue).length,
            averageDaysOutstanding: enhancedInvoices.length > 0 ? 
                enhancedInvoices.reduce((sum, inv) => sum + inv.daysOutstanding, 0) / enhancedInvoices.length : 0
        };

        // Cache first page data
        if (page === 1) {
            cachePaymentMetrics(cacheKey, {
                invoices: enhancedInvoices,
                metadata: businessMetrics
            });
        }

        updateSupplierInvoicesSummary(businessMetrics, enhancedInvoices);

        console.log(`[PmtMgmt] 🎯 BUSINESS RESULTS:`);
        console.log(`  📊 ${filterStatus.toUpperCase()}: ${enhancedInvoices.length} invoices`);
        console.log(`  💰 Outstanding: ${formatCurrency(businessMetrics.totalOutstanding)}`);
        console.log(`  🚨 Critical: ${businessMetrics.criticalCount}, Overdue: ${businessMetrics.overdueCount}`);
        console.log(`  🔥 Firestore: ${totalReads} reads`);

        return { invoices: enhancedInvoices, metadata: businessMetrics };

    } catch (error) {
        console.error('[PmtMgmt] ❌ Error loading supplier invoices:', error);
        
        if (pmtMgmtSupplierGridApi) {
            pmtMgmtSupplierGridApi.setGridOption('loading', false);
            pmtMgmtSupplierGridApi.showNoRowsOverlay();
        }
        
        showModal('error', 'Supplier Invoices Loading Failed', 
            `Could not load supplier invoices.\n\nError: ${error.message}\n\nPlease refresh and try again.`
        );
    }
}

/**
 * BUSINESS INTELLIGENCE: Calculate days outstanding from invoice date
 */
function calculateDaysOutstanding(purchaseDate) {
    if (!purchaseDate) return 0;
    
    try {
        const invoiceDate = purchaseDate.toDate ? purchaseDate.toDate() : new Date(purchaseDate);
        const today = new Date();
        const diffTime = today - invoiceDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    } catch {
        return 0;
    }
}

/**
 * BUSINESS INTELLIGENCE: Calculate invoice urgency for prioritization
 */
function calculateBusinessUrgency(invoice, daysOutstanding) {
    const balanceDue = invoice.balanceDue || 0;
    
    if (balanceDue > 20000 && daysOutstanding > 45) {
        return { level: 'critical', reason: 'Large amount severely overdue - supplier relationship risk' };
    } else if (balanceDue > 10000 && daysOutstanding > 30) {
        return { level: 'high', reason: 'Significant amount overdue - needs immediate attention' };
    } else if (daysOutstanding > 30) {
        return { level: 'high', reason: 'Invoice overdue - supplier may escalate' };
    } else if (daysOutstanding > 14) {
        return { level: 'medium', reason: 'Invoice aging - plan payment soon' };
    } else if (balanceDue > 15000) {
        return { level: 'medium', reason: 'Large amount - consider payment scheduling' };
    } else {
        return { level: 'normal', reason: 'Standard payment timeline' };
    }
}

/**
 * BUSINESS SUMMARY: Updates supplier invoices summary with business intelligence
 */
function updateSupplierInvoicesSummary(metadata, invoices) {
    const tabContent = document.getElementById('pmt-mgmt-suppliers-content');
    if (!tabContent) return;
    
    let summaryElement = tabContent.querySelector('#pmt-mgmt-supplier-summary-bar');
    
    if (!summaryElement) {
        summaryElement = document.getElementById('pmt-mgmt-supplier-summary-bar');
    }
    
    if (!summaryElement) {
        console.warn('[PmtMgmt] Summary bar not found');
        return;
    }
    
    const totalOutstanding = invoices ? 
        invoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0) : 0;
    const criticalCount = invoices ? 
        invoices.filter(inv => inv.urgencyLevel === 'critical').length : 0;
    const overdueCount = invoices ?
        invoices.filter(inv => inv.daysOutstanding > 30).length : 0;

    if (metadata.filterStatus === 'outstanding') {
        summaryElement.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-6">
                        <div>
                            <h4 class="text-lg font-bold text-red-800">Outstanding Supplier Invoices</h4>
                            <p class="text-sm text-red-600">
                                ${metadata.totalInvoices} invoices • 
                                Total Outstanding: <strong>${formatCurrency(totalOutstanding)}</strong>
                                ${overdueCount > 0 ? ` • <span class="text-red-700 font-bold">${overdueCount} OVERDUE</span>` : ''}
                            </p>
                        </div>
                        ${criticalCount > 0 ? 
                            `<div class="bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                                <div class="text-red-800 font-bold">🚨 ${criticalCount} CRITICAL</div>
                                <div class="text-xs text-red-600">Require immediate attention</div>
                            </div>` : ''
                        }
                    </div>
                    <div class="text-sm text-red-600">
                        🔥 ${metadata.totalReads} Firestore reads used
                    </div>
                </div>
            </div>
        `;
    } else if (metadata.filterStatus === 'paid') {
        summaryElement.innerHTML = `
            <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                <div class="flex items-center justify-between">
                    <div>
                        <h4 class="text-base font-semibold text-green-800">Paid Invoices (Reference)</h4>
                        <p class="text-sm text-green-600">
                            Page ${metadata.currentPage} • ${metadata.totalInvoices} invoices shown
                        </p>
                    </div>
                    <div class="flex items-center space-x-3">
                        ${metadata.hasMorePages ? 
                            `<button id="pmt-mgmt-load-next-paid-page" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                                📄 Load More (Page ${metadata.currentPage + 1})
                            </button>` : 
                            `<span class="text-green-600 text-sm">All records loaded</span>`
                        }
                        <span class="text-green-600 text-sm">🔥 ${metadata.totalReads} reads</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add pagination handler for paid invoices
        const loadNextBtn = document.getElementById('pmt-mgmt-load-next-paid-page');
        if (loadNextBtn && metadata.hasMorePages) {
            loadNextBtn.addEventListener('click', () => {
                loadSupplierInvoicesForMgmtTab('paid', {
                    page: metadata.currentPage + 1,
                    pageSize: metadata.pageSize,
                    lastDocSnapshot: metadata.lastDocument,
                    forceRefresh: true
                });
            });
        }
    }
}




/**
 * FREE TIER OPTIMIZED: Load supplier payments with complete invoice and supplier context
 * 
 * Fetches supplier payments and enriches them with related invoice details (invoiceId, 
 * supplierInvoiceNo) and supplier names using efficient batch queries and intelligent 
 * caching to minimize Firestore reads while providing complete business context.
 */
async function loadSupplierPaymentsForMgmtTab() {
    console.log('[PmtMgmt] 📤 Loading supplier payments with complete context...');

    if (!pmtMgmtSupplierGridApi) {
        console.error('[PmtMgmt] Supplier grid API not ready');
        return;
    }

    try {
        pmtMgmtSupplierGridApi.setGridOption('loading', true);

        // ✅ CACHE CHECK: 3-minute cache for enriched data
        const cacheKey = 'pmt_mgmt_supplier_payments_enriched';
        const cached = getCachedPaymentMetrics(cacheKey, 3);

        if (cached && cached.enrichedSupplierPayments) {
            console.log('[PmtMgmt] ✅ Using cached enriched supplier payments - 0 Firestore reads');
            pmtMgmtSupplierGridApi.setGridOption('rowData', cached.enrichedSupplierPayments);
            pmtMgmtSupplierGridApi.setGridOption('loading', false);
            return;
        }

        const db = firebase.firestore();
        let totalReads = 0;

        // ===================================================================
        // PHASE 1: GET SUPPLIER PAYMENTS
        // ===================================================================
        console.log('[PmtMgmt] Phase 1: Fetching supplier payments...');

        const supplierPaymentsQuery = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
            .orderBy('paymentDate', 'desc')
            .limit(30);

        const paymentsSnapshot = await supplierPaymentsQuery.get();
        totalReads += paymentsSnapshot.size;

        const supplierPayments = paymentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`[PmtMgmt] Retrieved ${supplierPayments.length} supplier payments (${paymentsSnapshot.size} reads)`);

        // ===================================================================
        // PHASE 2: BATCH FETCH RELATED INVOICES
        // ===================================================================
        console.log('[PmtMgmt] Phase 2: Batch fetching related invoice details...');

        // Get unique invoice IDs from payments
        const uniqueInvoiceIds = [...new Set(
            supplierPayments
                .map(p => p.relatedInvoiceId)
                .filter(Boolean)
        )];

        console.log(`[PmtMgmt] Found ${uniqueInvoiceIds.length} unique invoice IDs to fetch`);

        let invoiceDetails = new Map();

        if (uniqueInvoiceIds.length > 0 && uniqueInvoiceIds.length <= 25) {
            console.log(`[PmtMgmt] Batch fetching ${uniqueInvoiceIds.length} invoice details...`);

            // ✅ BATCH FETCH: Get all related invoices
            const invoicePromises = uniqueInvoiceIds.map(invoiceId =>
                db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(invoiceId).get()
            );

            const invoiceDocs = await Promise.all(invoicePromises);
            totalReads += invoiceDocs.length;

            // Build invoice lookup map
            invoiceDocs.forEach((doc, index) => {
                if (doc.exists) {
                    const invoiceData = doc.data();
                    invoiceDetails.set(uniqueInvoiceIds[index], {
                        systemInvoiceId: invoiceData.invoiceId,         // Your system invoice ID
                        supplierInvoiceNo: invoiceData.supplierInvoiceNo, // Supplier's invoice number
                        supplierName: invoiceData.supplierName,          // Supplier name from invoice
                        invoiceTotal: invoiceData.invoiceTotal,
                        supplierId: invoiceData.supplierId,
                        purchaseDate: invoiceData.purchaseDate
                    });
                    
                    console.log(`[PmtMgmt] Invoice ${index + 1} details:`, {
                        systemId: invoiceData.invoiceId,
                        supplierInvoiceNo: invoiceData.supplierInvoiceNo,
                        supplier: invoiceData.supplierName
                    });
                }
            });

            console.log(`[PmtMgmt] ✅ Batch fetched ${invoiceDetails.size} invoice details (${invoiceDocs.length} reads)`);
        } else if (uniqueInvoiceIds.length > 25) {
            console.warn(`[PmtMgmt] Too many invoices to batch fetch (${uniqueInvoiceIds.length}), using fallback lookup`);
        }

        // ===================================================================
        // PHASE 3: ENRICH PAYMENT DATA WITH COMPLETE CONTEXT
        // ===================================================================
        console.log('[PmtMgmt] Phase 3: Enriching payments with complete business context...');

        const enrichedSupplierPayments = supplierPayments.map((payment, index) => {
            const invoice = invoiceDetails.get(payment.relatedInvoiceId);
            const supplier = masterData.suppliers.find(s => s.id === payment.supplierId);

            // Create enriched payment record with complete context
            const enrichedPayment = {
                ...payment,

                // ✅ INVOICE CONTEXT: From purchase invoice lookup
                systemInvoiceId: invoice?.systemInvoiceId || payment.relatedInvoiceId || 'Unknown',
                supplierInvoiceNo: invoice?.supplierInvoiceNo || 'Not Available',

                // ✅ SUPPLIER CONTEXT: Prioritize invoice supplier name, fallback to masterData
                supplierName: invoice?.supplierName || supplier?.supplierName || 'Unknown Supplier',

                // ✅ FINANCIAL CONTEXT: Invoice relationship
                invoiceTotal: invoice?.invoiceTotal || 0,
                purchaseDate: invoice?.purchaseDate,

                // ✅ UI OPTIMIZATION: Pre-formatted display values
                formattedAmount: formatCurrency(payment.amountPaid || 0),
                formattedDate: payment.paymentDate?.toDate ? 
                    payment.paymentDate.toDate().toLocaleDateString() : 'Unknown Date',

                // ✅ BUSINESS INTELLIGENCE: Data quality tracking
                dataCompleteness: {
                    hasInvoiceDetails: !!invoice,
                    hasSupplierDetails: !!supplier,
                    completenessScore: (!!invoice ? 70 : 0) + (!!supplier ? 30 : 0) // Invoice data more valuable
                }
            };

            // Debug first few payments
            if (index < 5) {
                console.log(`[PmtMgmt] Enriched payment ${index + 1}:`, {
                    paymentId: payment.paymentId || payment.id,
                    systemInvoiceId: enrichedPayment.systemInvoiceId,
                    supplierInvoiceNo: enrichedPayment.supplierInvoiceNo,
                    supplierName: enrichedPayment.supplierName,
                    amount: enrichedPayment.formattedAmount,
                    hasInvoiceData: !!invoice,
                    hasSupplierData: !!supplier
                });
            }

            return enrichedPayment;
        });

        // ===================================================================
        // PHASE 4: LOAD ENRICHED DATA AND REPORT RESULTS
        // ===================================================================
        console.log('[PmtMgmt] Phase 4: Loading enriched data into grid...');

        pmtMgmtSupplierGridApi.setGridOption('rowData', enrichedSupplierPayments);
        pmtMgmtSupplierGridApi.setGridOption('loading', false);

        // ✅ CACHE: Store enriched data with metadata
        cachePaymentMetrics(cacheKey, {
            enrichedSupplierPayments: enrichedSupplierPayments,
            metadata: {
                totalReads: totalReads,
                paymentsLoaded: enrichedSupplierPayments.length,
                invoicesLookedUp: invoiceDetails.size,
                uniqueInvoices: uniqueInvoiceIds.length,
                cacheExpiry: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
                loadTime: new Date().toISOString()
            }
        });

        // ===================================================================
        // PHASE 5: SUCCESS REPORTING AND ANALYTICS
        // ===================================================================
        console.log(`[PmtMgmt] 🎯 SUPPLIER PAYMENTS ENRICHMENT COMPLETED:`);
        console.log(`  💳 Total Payments: ${enrichedSupplierPayments.length}`);
        console.log(`  📋 Invoice Lookups: ${invoiceDetails.size}/${uniqueInvoiceIds.length} successful`);
        console.log(`  👥 Supplier Matches: ${enrichedSupplierPayments.filter(p => p.supplierName !== 'Unknown Supplier').length}`);
        console.log(`  📊 Invoice Numbers: ${enrichedSupplierPayments.filter(p => p.supplierInvoiceNo !== 'Not Available').length}`);
        console.log(`  🔥 Firestore Reads Used: ${totalReads}`);

        // Calculate data quality metrics
        const avgCompleteness = enrichedSupplierPayments.length > 0 ? 
            enrichedSupplierPayments.reduce((sum, p) => sum + p.dataCompleteness.completenessScore, 0) / enrichedSupplierPayments.length : 0;

        console.log(`  📈 Average Data Completeness: ${avgCompleteness.toFixed(1)}%`);

        // Business intelligence logging
        const statusBreakdown = {};
        enrichedSupplierPayments.forEach(payment => {
            const status = payment.paymentStatus || 'Verified';
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
        });

        console.log(`  📊 Payment Status Breakdown:`, statusBreakdown);

        // Auto-fit columns for optimal display
        setTimeout(() => {
            if (pmtMgmtSupplierGridApi) {
                pmtMgmtSupplierGridApi.sizeColumnsToFit();
                console.log('[PmtMgmt] ✅ Grid columns auto-fitted');
            }
        }, 200);

    } catch (error) {
        console.error('[PmtMgmt] ❌ Error in enriched supplier payments loading:', error);

        if (pmtMgmtSupplierGridApi) {
            pmtMgmtSupplierGridApi.setGridOption('loading', false);
            pmtMgmtSupplierGridApi.showNoRowsOverlay();
        }

        // Enhanced error reporting for troubleshooting
        showModal('error', 'Supplier Payments Loading Failed',
            `Could not load supplier payment details.\n\n` +
            `Error: ${error.message}\n\n` +
            `Possible causes:\n` +
            `• Network connectivity issues\n` +
            `• Firestore permission restrictions\n` +
            `• Database query limits reached\n` +
            `• Invoice or supplier data inconsistencies\n\n` +
            `Please try refreshing or contact support.`
        );
    }
}


/**
 * FREE TIER OPTIMIZED: Loads team payments data
 */
async function loadTeamPaymentsForMgmtTab() {
    console.log('[DEBUG] Starting loadTeamPaymentsForMgmtTab');

    if (!pmtMgmtTeamGridApi) {
        console.error('[DEBUG] ❌ pmtMgmtTeamGridApi not available');
        return;
    }

    try {
        console.log('[DEBUG] ✅ Team grid API available, loading data...');
        pmtMgmtTeamGridApi.setGridOption('loading', true);

        const db = firebase.firestore();
        console.log('[DEBUG] Collection path:', CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH);

        const teamPaymentsQuery = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .orderBy('paymentDate', 'desc')
            .limit(10); // Small limit for testing

        const snapshot = await teamPaymentsQuery.get();
        console.log(`[DEBUG] Team payments snapshot size: ${snapshot.size}`);

        const teamPayments = snapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            console.log('[DEBUG] Team payment:', {
                id: data.id,
                teamName: data.teamName,
                amountPaid: data.amountPaid,
                paymentStatus: data.paymentStatus
            });
            return data;
        });

        pmtMgmtTeamGridApi.setGridOption('rowData', teamPayments);
        pmtMgmtTeamGridApi.setGridOption('loading', false);

        setTimeout(() => {
            const rowCount = pmtMgmtTeamGridApi.getDisplayedRowCount();
            console.log(`[DEBUG] ✅ Team grid shows ${rowCount} rows`);
        }, 200);

    } catch (error) {
        console.error('[DEBUG] ❌ Error loading team payments:', error);
        if (pmtMgmtTeamGridApi) {
            pmtMgmtTeamGridApi.setGridOption('loading', false);
        }
    }
}


/**
 * Initializes team payments tab (placeholder)
 */
function initializeTeamPaymentsTab() {
    console.log('[PmtMgmt] 👥 Initializing Team Payments tab with dedicated grid...');

    const gridContainer = document.getElementById('pmt-mgmt-team-grid');
    if (!gridContainer) {
        console.error('[PmtMgmt] Team payments grid container not found');
        return;
    }

    if (!pmtMgmtTeamGridApi) {
        pmtMgmtTeamGridApi = createGrid(gridContainer, pmtMgmtTeamGridOptions); // Local config
        console.log('[PmtMgmt] ✅ Dedicated team payments grid created');
    }

    setupTeamPaymentFilters();
}


/**
 * Initializes sales payments tab (placeholder)
 */
function initializeSalesPaymentsTab() {
    console.log('[PmtMgmt] 💳 Initializing Sales Payments tab with dedicated grid...');

    const gridContainer = document.getElementById('pmt-mgmt-sales-grid');
    if (!gridContainer) {
        console.error('[PmtMgmt] Sales payments grid container not found');
        return;
    }

    if (!pmtMgmtSalesGridApi) {
        pmtMgmtSalesGridApi = createGrid(gridContainer, pmtMgmtSalesGridOptions); // Local config
        console.log('[PmtMgmt] ✅ Dedicated sales payments grid created');
    }

    setupSalesPaymentFilters();
}

/**
 * FREE TIER OPTIMIZED: Loads sales payments data
 */
async function loadSalesPaymentsForMgmtTab() {
    console.log('[DEBUG] Starting loadSalesPaymentsForMgmtTab');

    if (!pmtMgmtSalesGridApi) {
        console.error('[DEBUG] ❌ pmtMgmtSalesGridApi not available');
        return;
    }

    try {
        console.log('[DEBUG] ✅ Sales grid API available, loading data...');
        pmtMgmtSalesGridApi.setGridOption('loading', true);

        const db = firebase.firestore();
        console.log('[DEBUG] Collection path:', SALES_PAYMENTS_LEDGER_COLLECTION_PATH);

        const salesPaymentsQuery = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH)
            .orderBy('paymentDate', 'desc')
            .limit(10); // Small limit for testing

        const snapshot = await salesPaymentsQuery.get();
        console.log(`[DEBUG] Sales payments snapshot size: ${snapshot.size}`);

        const salesPayments = snapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            console.log('[DEBUG] Sales payment:', {
                id: data.id,
                customerName: data.customerName,
                amountPaid: data.amountPaid,
                status: data.status
            });
            return data;
        });

        pmtMgmtSalesGridApi.setGridOption('rowData', salesPayments);
        pmtMgmtSalesGridApi.setGridOption('loading', false);

        setTimeout(() => {
            const rowCount = pmtMgmtSalesGridApi.getDisplayedRowCount();
            console.log(`[DEBUG] ✅ Sales grid shows ${rowCount} rows`);
        }, 200);

    } catch (error) {
        console.error('[DEBUG] ❌ Error loading sales payments:', error);
        if (pmtMgmtSalesGridApi) {
            pmtMgmtSalesGridApi.setGridOption('loading', false);
        }
    }
}

// ===================================================================
// FILTER SETUP FUNCTIONS (TAB-SPECIFIC)
// ===================================================================

/**
 * Sets up filter listeners for supplier payments tab
 */
function setupSupplierPaymentFilters() {
    console.log('[PmtMgmt] Setting up business-smart supplier filters...');
    
    // Outstanding filter (default, primary business focus)
    const outstandingFilter = document.getElementById('pmt-mgmt-supplier-filter-outstanding');
    if (outstandingFilter) {
        outstandingFilter.addEventListener('click', () => {
            applySupplierInvoiceFilter('outstanding');
            updateSupplierFilterActiveState(outstandingFilter);
            
            // Enable/disable date range for outstanding
            const dateRange = document.getElementById('pmt-mgmt-supplier-date-range');
            if (dateRange) {
                dateRange.disabled = true; // Outstanding doesn't use date range
            }
        });
    }
    
    // Paid filter (reference, secondary focus)
    const paidFilter = document.getElementById('pmt-mgmt-supplier-filter-paid');
    if (paidFilter) {
        paidFilter.addEventListener('click', () => {
            applySupplierInvoiceFilter('paid');
            updateSupplierFilterActiveState(paidFilter);
            
            // Enable date range for paid invoices
            const dateRange = document.getElementById('pmt-mgmt-supplier-date-range');
            if (dateRange) {
                dateRange.disabled = false; // Paid invoices can use date range
            }
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('pmt-mgmt-supplier-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (pmtMgmtSupplierGridApi) {
                pmtMgmtSupplierGridApi.setQuickFilter(e.target.value);
            }
        });
    }
    
    // Refresh button
    const refreshButton = document.getElementById('pmt-mgmt-supplier-refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            const currentFilter = supplierInvoicesPagination.currentFilter;
            console.log(`[PmtMgmt] Manual refresh: ${currentFilter} invoices`);
            
            loadSupplierInvoicesForMgmtTab(currentFilter, {
                page: 1, // Reset to first page
                forceRefresh: true
            });
        });
    }
    
    console.log('[PmtMgmt] ✅ Business-smart filters setup completed');
}



/**
 * Apply invoice filter and reset pagination
 */
function applySupplierInvoiceFilter(filterType) {
    console.log(`[PmtMgmt] 🎯 Applying business filter: ${filterType}`);
    
    // Reset pagination when changing filters
    supplierInvoicesPagination.currentPage = 1;
    supplierInvoicesPagination.lastSnapshot = null;
    supplierInvoicesPagination.currentFilter = filterType;
    
    // Load data with new filter
    loadSupplierInvoicesForMgmtTab(filterType, {
        page: 1,
        forceRefresh: true
    });
}



/**
 * Applies filter to supplier payments grid
 */
function applySupplierPaymentFilter(filterType) {
    if (!pmtMgmtSupplierGridApi) return;

    console.log(`[PmtMgmt] Applying supplier filter: ${filterType}`);

    switch (filterType) {
        case 'all':
            pmtMgmtSupplierGridApi.setFilterModel(null);
            break;
        case 'pending':
            pmtMgmtSupplierGridApi.setFilterModel({
                paymentStatus: { type: 'equals', filter: 'Pending Verification' }
            });
            break;
        case 'overdue':
            // Could enhance with date-based overdue logic
            console.log('[PmtMgmt] TODO: Implement overdue filter logic');
            break;
        case 'today':
            const today = new Date().toISOString().split('T')[0];
            pmtMgmtSupplierGridApi.setFilterModel({
                paymentDate: { type: 'equals', filter: today }
            });
            break;
    }
}


/**
 * Updates active state for supplier filter buttons
 */
function updateSupplierFilterActiveState(activeButton) {
    document.querySelectorAll('.pmt-mgmt-supplier-filter').forEach(btn => {
        btn.classList.remove('active', 'bg-red-100', 'text-red-800', 'border-red-300', 'font-semibold');
        btn.classList.add('bg-white', 'border-gray-300');
    });
    
    activeButton.classList.add('active');
    
    if (activeButton.id.includes('outstanding')) {
        activeButton.classList.add('bg-red-100', 'text-red-800', 'border-red-300', 'font-semibold');
    } else {
        activeButton.classList.add('bg-green-100', 'text-green-800', 'border-green-300', 'font-semibold');
    }
}

/**
 * Sets up filter listeners for team payments tab
 */
function setupTeamPaymentFilters() {
    const filters = ['all', 'pending', 'verified', 'overdue'];

    filters.forEach(filter => {
        const button = document.getElementById(`pmt-mgmt-team-filter-${filter}`);
        if (button) {
            button.addEventListener('click', () => {
                applyTeamPaymentFilter(filter);
                updateTeamFilterActiveState(button);
            });
        }
    });

    // Team search
    const searchInput = document.getElementById('pmt-mgmt-team-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (pmtMgmtTeamGridApi) {
                pmtMgmtTeamGridApi.setQuickFilter(e.target.value);
            }
        });
    }

    // Team name filter dropdown
    const teamFilter = document.getElementById('pmt-mgmt-team-name-filter');
    if (teamFilter) {
        // Populate with team names from masterData
        teamFilter.innerHTML = '<option value="">All Teams</option>';
        masterData.teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.teamName;
            option.textContent = team.teamName;
            teamFilter.appendChild(option);
        });

        teamFilter.addEventListener('change', (e) => {
            if (pmtMgmtTeamGridApi) {
                const filterValue = e.target.value;
                if (filterValue) {
                    pmtMgmtTeamGridApi.setFilterModel({
                        teamName: { type: 'equals', filter: filterValue }
                    });
                } else {
                    pmtMgmtTeamGridApi.setFilterModel(null);
                }
            }
        });
    }

    console.log('[PmtMgmt] ✅ Team payment filters setup');
}

/**
 * Applies filter to team payments grid
 */
function applyTeamPaymentFilter(filterType) {
    if (!pmtMgmtTeamGridApi) return;

    console.log(`[PmtMgmt] Applying team filter: ${filterType}`);

    switch (filterType) {
        case 'all':
            pmtMgmtTeamGridApi.setFilterModel(null);
            break;
        case 'pending':
            pmtMgmtTeamGridApi.setFilterModel({
                paymentStatus: { type: 'equals', filter: 'Pending Verification' }
            });
            break;
        case 'verified':
            pmtMgmtTeamGridApi.setFilterModel({
                paymentStatus: { type: 'equals', filter: 'Verified' }
            });
            break;
        case 'overdue':
            // Enhanced logic for overdue team payments
            console.log('[PmtMgmt] TODO: Implement team overdue filter');
            break;
    }
}

/**
 * Updates active state for team filter buttons
 */
function updateTeamFilterActiveState(activeButton) {
    document.querySelectorAll('.pmt-mgmt-team-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    activeButton.classList.add('active');
}

/**
 * Sets up filter listeners for sales payments tab
 */
function setupSalesPaymentFilters() {
    const filters = ['all', 'unpaid', 'partial', 'overdue'];

    filters.forEach(filter => {
        const button = document.getElementById(`pmt-mgmt-sales-filter-${filter}`);
        if (button) {
            button.addEventListener('click', () => {
                applySalesPaymentFilter(filter);
                updateSalesFilterActiveState(button);
            });
        }
    });

    // Sales search
    const searchInput = document.getElementById('pmt-mgmt-sales-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (pmtMgmtSalesGridApi) {
                pmtMgmtSalesGridApi.setQuickFilter(e.target.value);
            }
        });
    }

    // Store filter
    const storeFilter = document.getElementById('pmt-mgmt-sales-store-filter');
    if (storeFilter) {
        storeFilter.addEventListener('change', (e) => {
            if (pmtMgmtSalesGridApi) {
                const filterValue = e.target.value;
                if (filterValue) {
                    pmtMgmtSalesGridApi.setFilterModel({
                        store: { type: 'equals', filter: filterValue }
                    });
                } else {
                    pmtMgmtSalesGridApi.setFilterModel(null);
                }
            }
        });
    }

    console.log('[PmtMgmt] ✅ Sales payment filters setup');
}


/**
 * Applies filter to sales payments grid
 */
function applySalesPaymentFilter(filterType) {
    if (!pmtMgmtSalesGridApi) return;

    console.log(`[PmtMgmt] Applying sales filter: ${filterType}`);

    switch (filterType) {
        case 'all':
            pmtMgmtSalesGridApi.setFilterModel(null);
            break;
        case 'unpaid':
            pmtMgmtSalesGridApi.setFilterModel({
                paymentStatus: { type: 'equals', filter: 'Unpaid' }
            });
            break;
        case 'partial':
            pmtMgmtSalesGridApi.setFilterModel({
                paymentStatus: { type: 'equals', filter: 'Partially Paid' }
            });
            break;
        case 'overdue':
            // Enhanced overdue logic for sales
            console.log('[PmtMgmt] TODO: Implement sales overdue filter');
            break;
    }
}


/**
 * Updates active state for sales filter buttons
 */
function updateSalesFilterActiveState(activeButton) {
    document.querySelectorAll('.pmt-mgmt-sales-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    activeButton.classList.add('active');
}

// Grid APIs for modal grids
let pmtMgmtInvoiceLineItemsGridApi = null;
let pmtMgmtPaymentHistoryGridApi = null;

/**
 * ENHANCED: Shows detailed supplier invoice modal with complete information
 */

export async function showSupplierInvoiceDetailsModal(invoiceId) {
    console.log(`[PmtMgmt] 📋 Opening detailed supplier invoice modal for: ${invoiceId}`);
    
    const modal = document.getElementById('pmt-mgmt-supplier-invoice-modal');
    if (!modal) {
        console.error('[PmtMgmt] Invoice details modal not found');
        return;
    }

    try {
        ProgressToast.show('Loading Invoice Details', 'info');
        ProgressToast.updateProgress('Retrieving invoice information...', 50);
        
        // ===================================================================
        // GET COMPLETE INVOICE DATA (UI OPERATION)
        // ===================================================================
        
        const db = firebase.firestore();
        const invoiceDoc = await db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(invoiceId).get();
        
        if (!invoiceDoc.exists) {
            ProgressToast.hide(0);
            await showModal('error', 'Invoice Not Found', 'The requested invoice could not be found.');
            return;
        }
        
        const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() };

        // ===================================================================
        // POPULATE MODAL (UI OPERATIONS)
        // ===================================================================
        
        ProgressToast.updateProgress('Populating invoice details...', 75);
        
        // Update modal title and subtitle
        document.getElementById('pmt-mgmt-invoice-modal-title').textContent = 
            `Invoice: ${invoiceData.supplierInvoiceNo || invoiceData.invoiceId}`;
        document.getElementById('pmt-mgmt-invoice-modal-subtitle').textContent = 
            `${invoiceData.supplierName} • ${invoiceData.paymentStatus}`;

        // Populate all invoice fields
        document.getElementById('pmt-mgmt-system-invoice-id').textContent = invoiceData.invoiceId || 'Unknown';
        document.getElementById('pmt-mgmt-supplier-invoice-no').textContent = invoiceData.supplierInvoiceNo || 'Not Provided';
        document.getElementById('pmt-mgmt-supplier-name').textContent = invoiceData.supplierName || 'Unknown Supplier';
        document.getElementById('pmt-mgmt-purchase-date').textContent = invoiceData.purchaseDate?.toDate ? 
            invoiceData.purchaseDate.toDate().toLocaleDateString() : 'Unknown Date';
        
        // Calculate and populate days outstanding
        const daysOutstanding = calculateDaysOutstanding(invoiceData.purchaseDate);
        document.getElementById('pmt-mgmt-days-outstanding').textContent = `${daysOutstanding} days`;
        
        // Populate financial information
        document.getElementById('pmt-mgmt-invoice-total').textContent = formatCurrency(invoiceData.invoiceTotal || 0);
        document.getElementById('pmt-mgmt-amount-paid').textContent = formatCurrency(invoiceData.amountPaid || 0);
        document.getElementById('pmt-mgmt-balance-due').textContent = formatCurrency(invoiceData.balanceDue || 0);
        
        // Payment status with proper styling
        const statusElement = document.getElementById('pmt-mgmt-payment-status-display');
        const status = invoiceData.paymentStatus || 'Unknown';
        
        const statusConfigs = {
            'Paid': {
                html: `<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                         <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                         </svg>
                         PAID
                       </span>`
            },
            'Partially Paid': {
                html: `<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                         <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                         </svg>
                         PARTIALLY PAID
                       </span>`
            },
            'Unpaid': {
                html: `<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                         <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                         </svg>
                         UNPAID
                       </span>`
            }
        };
        
        statusElement.innerHTML = statusConfigs[status]?.html || status;

        // ===================================================================
        // SETUP GRIDS (UI OPERATIONS)
        // ===================================================================
        
        await setupSupplierInvoiceLineItemsGrid(invoiceData);

        if ((invoiceData.amountPaid || 0) > 0) {
            await setupSupplierInvoicePaymentHistoryGrid(invoiceId);
            document.getElementById('pmt-mgmt-payment-history-section').style.display = 'block';
        } else {
            document.getElementById('pmt-mgmt-payment-history-section').style.display = 'none';
        }

        // ===================================================================
        // SETUP PAY BUTTON (UI OPERATION - NO BUSINESS LOGIC)
        // ===================================================================
        
        const payButton = document.getElementById('pmt-mgmt-modal-pay-invoice');
        const balanceDue = invoiceData.balanceDue || 0;
        
        if (balanceDue > 0 && (status === 'Unpaid' || status === 'Partially Paid')) {
            payButton.style.display = 'block';
            payButton.innerHTML = `
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
                Pay Outstanding Balance (${formatCurrency(balanceDue)})
            `;
            
            // ✅ UI SETUP: Store invoice ID for main.js to access
            payButton.dataset.invoiceId = invoiceId;
            payButton.dataset.balanceDue = balanceDue;
            
        } else {
            payButton.style.display = 'none';
        }

        // Update last updated time
        document.getElementById('pmt-mgmt-invoice-last-updated').textContent = new Date().toLocaleTimeString();

        // ===================================================================
        // SHOW MODAL (UI OPERATION)
        // ===================================================================
        
        ProgressToast.updateProgress('Invoice details loaded successfully!', 100);
        
        setTimeout(() => {
            ProgressToast.hide(300);
            
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('visible'), 10);
            
        }, 500);

    } catch (error) {
        console.error('[PmtMgmt] Error in supplier invoice details modal:', error);
        ProgressToast.showError(`Failed to load supplier invoice details: ${error.message}`);
    }
}


/**
 * SUPPLIER-SPECIFIC: Setup payment history grid for supplier invoice
 */
async function setupSupplierInvoicePaymentHistoryGrid(invoiceId) {
    const gridContainer = document.getElementById('pmt-mgmt-invoice-payment-history-grid');
    if (!gridContainer) {
        console.warn('[PmtMgmt] Supplier payment history grid container not found');
        return;
    }

    console.log('[PmtMgmt] Setting up supplier payment history grid...');

    const supplierPaymentHistoryGridOptions = {
        theme: 'alpine',
        pagination: false,
        rowHeight: 35, // Compact rows for payment history
        
        columnDefs: [
            { 
                headerName: "Payment Date", 
                field: "paymentDate", 
                width: 120,
                valueFormatter: p => p.value?.toDate ? p.value.toDate().toLocaleDateString() : 'Unknown'
            },
            { 
                headerName: "Amount Paid", 
                field: "amountPaid", 
                width: 120,
                valueFormatter: p => formatCurrency(p.value || 0),
                cellClass: 'text-right font-bold',
                cellStyle: { color: '#059669' }
            },
            { 
                headerName: "Payment Mode", 
                field: "paymentMode", 
                width: 120
            },
            { 
                headerName: "Reference #", 
                field: "transactionRef", 
                flex: 1,
                cellStyle: { fontFamily: 'monospace', fontSize: '11px' }
            },
            { 
                headerName: "Status", 
                field: "paymentStatus", 
                width: 100,
                cellRenderer: params => {
                    const status = params.value || 'Verified';
                    const statusConfig = {
                        'Verified': 'text-green-700',
                        'Pending Verification': 'text-yellow-700',
                        'Voided': 'text-red-700'
                    };
                    const colorClass = statusConfig[status] || 'text-blue-700';
                    return `<span class="text-xs font-semibold ${colorClass}">${status.toUpperCase()}</span>`;
                }
            }
        ],
        
        defaultColDef: {
            resizable: true,
            sortable: false,
            filter: false
        },
        
        onGridReady: (params) => {
            pmtMgmtSupplierPaymentHistoryGridApi = params.api; // ✅ NOW DECLARED
            console.log('[PmtMgmt] ✅ Supplier payment history grid ready');
        }
    };

    // Create grid only if not already created
    if (!pmtMgmtSupplierPaymentHistoryGridApi) {
        pmtMgmtSupplierPaymentHistoryGridApi = createGrid(gridContainer, supplierPaymentHistoryGridOptions);
    }

    // Wait for grid and load payment history
    const waitForPaymentHistoryGrid = setInterval(() => {
        if (pmtMgmtSupplierPaymentHistoryGridApi) {
            clearInterval(waitForPaymentHistoryGrid);
            
            // Load payment history for this supplier invoice
            loadSupplierPaymentHistoryData(invoiceId);
        }
    }, 50);
}

/**
 * SUPPLIER-SPECIFIC: Load payment history data for supplier invoice
 */
async function loadSupplierPaymentHistoryData(invoiceId) {
    try {
        console.log(`[PmtMgmt] Loading payment history for supplier invoice: ${invoiceId}`);
        
        const db = firebase.firestore();
        const paymentsQuery = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('relatedInvoiceId', '==', invoiceId)
            .orderBy('paymentDate', 'desc');
        
        const paymentsSnapshot = await paymentsQuery.get();
        const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        pmtMgmtSupplierPaymentHistoryGridApi.setGridOption('rowData', payments);
        
        // Update payments count display
        const countElement = document.getElementById('pmt-mgmt-payments-count');
        if (countElement) {
            countElement.textContent = `${payments.length} payments`;
        }
        
        console.log(`[PmtMgmt] ✅ Supplier payment history loaded: ${payments.length} payments`);
        
    } catch (error) {
        console.error('[PmtMgmt] Error loading supplier payment history:', error);
        
        // Show "No payments" if error
        const countElement = document.getElementById('pmt-mgmt-payments-count');
        if (countElement) {
            countElement.textContent = '0 payments';
        }
    }
}


/**
 * SUPPLIER-SPECIFIC: Setup line items grid for supplier invoice
 */
async function setupSupplierInvoiceLineItemsGrid(supplierInvoiceData) {
    const gridContainer = document.getElementById('pmt-mgmt-invoice-line-items-grid');
    if (!gridContainer) {
        console.warn('[PmtMgmt] Supplier line items grid container not found');
        return;
    }

    console.log('[PmtMgmt] Setting up supplier invoice line items grid...');

    const supplierLineItemsGridOptions = {
        theme: 'alpine',
        pagination: false,
        rowHeight: 40, // Smaller rows for line items
        
        columnDefs: [
            { 
                headerName: "Product Name", 
                field: "productName", 
                flex: 1,
                cellStyle: { fontWeight: 'bold' }
            },
            { 
                headerName: "Quantity", 
                field: "quantity", 
                width: 80,
                cellClass: 'text-center font-bold'
            },
            { 
                headerName: "Unit Cost", 
                field: "unitPurchasePrice", 
                width: 120,
                valueFormatter: p => formatCurrency(p.value || 0),
                cellClass: 'text-right'
            },
            { 
                headerName: "Line Total", 
                field: "lineItemTotal", 
                width: 120,
                valueFormatter: p => formatCurrency(p.value || 0),
                cellClass: 'text-right font-bold',
                cellStyle: { color: '#374151' }
            }
        ],
        
        defaultColDef: {
            resizable: true,
            sortable: false,
            filter: false
        },
        
        onGridReady: (params) => {
            pmtMgmtSupplierLineItemsGridApi = params.api; // ✅ NOW DECLARED
            console.log('[PmtMgmt] ✅ Supplier line items grid ready');
        }
    };

    // Create grid only if not already created
    if (!pmtMgmtSupplierLineItemsGridApi) {
        pmtMgmtSupplierLineItemsGridApi = createGrid(gridContainer, supplierLineItemsGridOptions);
    }

    // Wait for grid to be ready before loading data
    const waitForLineItemsGrid = setInterval(() => {
        if (pmtMgmtSupplierLineItemsGridApi) {
            clearInterval(waitForLineItemsGrid);
            
            const lineItems = supplierInvoiceData.lineItems || [];
            pmtMgmtSupplierLineItemsGridApi.setGridOption('rowData', lineItems);
            
            // Update count display
            const countElement = document.getElementById('pmt-mgmt-line-items-count');
            if (countElement) {
                countElement.textContent = `${lineItems.length} items`;
            }
            
            console.log(`[PmtMgmt] ✅ Supplier line items loaded: ${lineItems.length} items`);
        }
    }, 50);
}



/**
 * Sets up line items grid within the invoice modal
 */
async function setupInvoiceLineItemsGrid(invoiceData) {
    const gridContainer = document.getElementById('pmt-mgmt-invoice-line-items-grid');
    if (!gridContainer) return;

    console.log('[PmtMgmt] Setting up line items grid...');

    // Line items grid configuration
    const lineItemsGridOptions = {
        theme: 'alpine',
        pagination: false, // Usually not many line items
        
        columnDefs: [
            { 
                headerName: "Product", 
                field: "productName", 
                flex: 1,
                cellStyle: { fontWeight: 'bold' }
            },
            { 
                headerName: "Quantity", 
                field: "quantity", 
                width: 80,
                cellClass: 'text-center',
                cellStyle: { fontWeight: 'bold' }
            },
            { 
                headerName: "Unit Price", 
                field: "unitPurchasePrice", 
                width: 100,
                valueFormatter: p => formatCurrency(p.value || 0),
                cellClass: 'text-right'
            },
            { 
                headerName: "Line Total", 
                field: "lineItemTotal", 
                width: 120,
                valueFormatter: p => formatCurrency(p.value || 0),
                cellClass: 'text-right font-bold',
                cellStyle: { color: '#374151' }
            }
        ],
        
        defaultColDef: {
            resizable: true,
            sortable: false,
            filter: false
        }
    };

    // Create or update grid
    if (!pmtMgmtInvoiceLineItemsGridApi) {
        pmtMgmtInvoiceLineItemsGridApi = createGrid(gridContainer, lineItemsGridOptions);
    }

    // Load line items data
    const lineItems = invoiceData.lineItems || [];
    pmtMgmtInvoiceLineItemsGridApi.setGridOption('rowData', lineItems);
    
    // Update line items count
    document.getElementById('pmt-mgmt-line-items-count').textContent = `${lineItems.length} items`;
    
    console.log(`[PmtMgmt] ✅ Line items grid loaded with ${lineItems.length} items`);
}


/**
 * Sets up payment history grid within the invoice modal
 */
async function setupInvoicePaymentHistoryGrid(invoiceId) {
    const gridContainer = document.getElementById('pmt-mgmt-invoice-payment-history-grid');
    if (!gridContainer) return;

    console.log('[PmtMgmt] Setting up payment history grid...');

    // Payment history grid configuration
    const paymentHistoryGridOptions = {
        theme: 'alpine',
        pagination: false,
        
        columnDefs: [
            { 
                headerName: "Payment Date", 
                field: "paymentDate", 
                width: 120,
                valueFormatter: p => p.value?.toDate ? p.value.toDate().toLocaleDateString() : 'Unknown'
            },
            { 
                headerName: "Amount", 
                field: "amountPaid", 
                width: 100,
                valueFormatter: p => formatCurrency(p.value || 0),
                cellClass: 'text-right font-bold',
                cellStyle: { color: '#059669' }
            },
            { 
                headerName: "Payment Mode", 
                field: "paymentMode", 
                flex: 1
            },
            { 
                headerName: "Reference", 
                field: "transactionRef", 
                flex: 1,
                cellStyle: { fontFamily: 'monospace', fontSize: '11px' }
            },
            { 
                headerName: "Status", 
                field: "paymentStatus", 
                width: 100,
                cellRenderer: params => {
                    const status = params.value || 'Verified';
                    if (status === 'Verified') {
                        return `<span class="text-xs font-semibold text-green-700">✅ VERIFIED</span>`;
                    } else if (status === 'Voided') {
                        return `<span class="text-xs font-semibold text-gray-700">❌ VOIDED</span>`;
                    }
                    return status;
                }
            }
        ],
        
        defaultColDef: {
            resizable: true,
            sortable: false,
            filter: false
        }
    };

    // Create or update grid
    if (!pmtMgmtPaymentHistoryGridApi) {
        pmtMgmtPaymentHistoryGridApi = createGrid(gridContainer, paymentHistoryGridOptions);
    }

    // Load payment history
    try {
        const db = firebase.firestore();
        const paymentsQuery = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('relatedInvoiceId', '==', invoiceId)
            .orderBy('paymentDate', 'desc');
        
        const paymentsSnapshot = await paymentsQuery.get();
        const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        pmtMgmtPaymentHistoryGridApi.setGridOption('rowData', payments);
        
        // Update payments count
        document.getElementById('pmt-mgmt-payments-count').textContent = `${payments.length} payments`;
        
        console.log(`[PmtMgmt] ✅ Payment history loaded: ${payments.length} payments`);
        
    } catch (error) {
        console.error('[PmtMgmt] Error loading payment history:', error);
    }
}

/**
 * Closes the supplier invoice details modal
 */
export function closeSupplierInvoiceDetailsModal() {
    const modal = document.getElementById('pmt-mgmt-supplier-invoice-modal');
    if (!modal) return;

    modal.classList.remove('visible');
    setTimeout(() => {
        modal.style.display = 'none';
        
        // Clear grid data
        if (pmtMgmtInvoiceLineItemsGridApi) {
            pmtMgmtInvoiceLineItemsGridApi.setGridOption('rowData', []);
        }
        if (pmtMgmtPaymentHistoryGridApi) {
            pmtMgmtPaymentHistoryGridApi.setGridOption('rowData', []);
        }
    }, 300);
}


/**
 * SUPPLIER-SPECIFIC: Handles pay outstanding balance for SUPPLIER invoice
 */
export async function handleSupplierPayOutstandingBalance(invoiceId) {
    console.log(`[PmtMgmt] 💰 Paying outstanding balance for SUPPLIER invoice: ${invoiceId}`);
    
    try {
        ProgressToast.show('Preparing Supplier Payment Form...', 'info');
        ProgressToast.updateProgress('Loading invoice details...', 50);
        
        // ===================================================================
        // STEP 1: GET SUPPLIER INVOICE DATA AND VALIDATE
        // ===================================================================
        
        const invoiceData = getSupplierInvoiceFromMgmtGrid(invoiceId);
        if (!invoiceData) {
            ProgressToast.hide(0);
            await showModal('error', 'Supplier Invoice Not Found', 
                'Could not find supplier invoice data. Please refresh the page and try again.');
            return;
        }
        
        const balanceDue = invoiceData.balanceDue || 0;
        
        if (balanceDue <= 0) {
            ProgressToast.hide(0);
            await showModal('info', 'Supplier Invoice Fully Paid', 
                `Supplier invoice ${invoiceData.supplierInvoiceNo || invoiceData.invoiceId} is already fully paid!\n\n` +
                `• Supplier: ${invoiceData.supplierName}\n` +
                `• Status: ${invoiceData.paymentStatus}`
            );
            return;
        }
        
        console.log(`[PmtMgmt] Supplier invoice balance confirmed: ${formatCurrency(balanceDue)} for ${invoiceData.supplierName}`);
        
        // ===================================================================
        // STEP 2: CLOSE DETAILS MODAL AND OPEN PAYMENT MODAL
        // ===================================================================
        
        ProgressToast.updateProgress(`Preparing payment of ${formatCurrency(balanceDue)}...`, 75);
        
        // Close the invoice details modal first
        closeSupplierInvoiceDetailsModal();
        
        // Wait for modal to close, then open payment modal
        setTimeout(() => {
            ProgressToast.updateProgress('Opening supplier payment interface...', 90);
            
            // ✅ REUSE: Your existing supplier payment modal with pre-filled data
            showSupplierPaymentModalWithData({
                invoiceId: invoiceData.id,
                systemInvoiceId: invoiceData.invoiceId,
                supplierInvoiceNo: invoiceData.supplierInvoiceNo,
                supplierId: invoiceData.supplierId,
                supplierName: invoiceData.supplierName,
                invoiceTotal: invoiceData.invoiceTotal || 0,
                amountPaid: invoiceData.amountPaid || 0,
                balanceDue: balanceDue,
                suggestedPaymentAmount: balanceDue, // Default to full balance
                context: 'payment_management_outstanding'
            });
            
            ProgressToast.hide(300);
            
        }, 400); // Wait for details modal to close
        
    } catch (error) {
        console.error('[PmtMgmt] Error preparing supplier outstanding payment:', error);
        ProgressToast.showError(`Failed to prepare supplier payment: ${error.message}`);
        
        setTimeout(() => {
            showModal('error', 'Supplier Payment Preparation Failed', 
                `Failed to prepare payment for supplier invoice ${invoiceId}.\n\nError: ${error.message}`
            );
        }, 1500);
    }
}


/**
 * SUPPLIER-SPECIFIC: Calculate new balance after supplier payment
 */
function calculateSupplierBalanceAfterPayment(paymentAmount, supplierInvoiceData) {
    const currentBalanceDue = supplierInvoiceData.balanceDue || 0;
    const currentAmountPaid = supplierInvoiceData.amountPaid || 0;
    const invoiceTotal = supplierInvoiceData.invoiceTotal || 0;
    
    const newTotalAmountPaid = currentAmountPaid + paymentAmount;
    const newBalanceDue = Math.max(0, invoiceTotal - newTotalAmountPaid);
    
    let newPaymentStatus;
    if (newBalanceDue <= 0) {
        newPaymentStatus = 'Paid';
    } else if (newTotalAmountPaid > 0) {
        newPaymentStatus = 'Partially Paid';
    } else {
        newPaymentStatus = 'Unpaid';
    }
    
    return {
        newBalanceDue: newBalanceDue,
        newTotalAmountPaid: newTotalAmountPaid,
        newPaymentStatus: newPaymentStatus,
        isFullyPaid: newBalanceDue <= 0,
        paymentProgress: invoiceTotal > 0 ? (newTotalAmountPaid / invoiceTotal) * 100 : 0
    };
}

/**
 * SUPPLIER-SPECIFIC: Enhanced supplier payment modal with pre-filled data
 */
export function showSupplierPaymentModalWithData(supplierData) {
    console.log('[PmtMgmt] Opening supplier payment modal with pre-filled data...');
    
    try {
        // ✅ REUSE: Existing supplier payment modal
        const modal = document.getElementById('supplier-payment-modal'); // Your existing modal
        if (!modal) {
            showModal('error', 'Payment Modal Not Available', 
                'Supplier payment modal not found. Please use Purchase Management for payments.'
            );
            return;
        }

        // ✅ PRE-FILL: Populate modal with supplier invoice data
        const elements = {
            invoiceId: document.getElementById('supplier-payment-invoice-id'),
            supplierId: document.getElementById('supplier-payment-supplier-id'),
            amount: document.getElementById('supplier-payment-amount-input'),
            date: document.getElementById('supplier-payment-date-input')
        };

        // Pre-populate fields
        if (elements.invoiceId) elements.invoiceId.value = supplierData.invoiceId || '';
        if (elements.supplierId) elements.supplierId.value = supplierData.supplierId || '';
        if (elements.amount) elements.amount.value = (supplierData.suggestedPaymentAmount || 0).toFixed(2);
        if (elements.date) elements.date.value = new Date().toISOString().split('T')[0]; // Today's date

        // Update modal title with supplier context
        const modalTitle = modal.querySelector('h3');
        if (modalTitle) {
            modalTitle.textContent = `Pay Supplier: ${supplierData.supplierName}`;
        }

        // Show modal using existing pattern
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('visible'), 10);

        console.log('[PmtMgmt] ✅ Supplier payment modal opened with pre-filled data');
        
    } catch (error) {
        console.error('[PmtMgmt] Error showing supplier payment modal:', error);
        showModal('error', 'Modal Error', 'Could not open supplier payment modal.');
    }
}



/**
 * ENHANCED: Show verification modal for invoice payments
 */
export async function showSupplierInvoicePaymentVerificationModal(invoiceId) {
    console.log(`[PmtMgmt] ✅ Opening payment verification modal for invoice: ${invoiceId}`);
    
    const modal = document.getElementById('pmt-mgmt-verify-invoice-payments-modal');
    if (!modal) {
        console.error('[PmtMgmt] Payment verification modal not found');
        return;
    }

    try {
        ProgressToast.show('Loading Pending Payments', 'info');
        
        // Get invoice and pending payments data
        const invoiceData = getSupplierInvoiceFromMgmtGrid(invoiceId);
        const pendingPayments = await getPendingPaymentsForInvoice(invoiceId);
        
        if (pendingPayments.length === 0) {
            ProgressToast.hide(0);
            await showModal('info', 'No Pending Payments', 
                'This invoice has no payments pending verification.');
            return;
        }
        
        // Populate modal
        document.getElementById('verify-invoice-number').textContent = 
            invoiceData?.supplierInvoiceNo || invoiceData?.invoiceId || 'Unknown';
        document.getElementById('verify-supplier-name').textContent = 
            invoiceData?.supplierName || 'Unknown Supplier';
        document.getElementById('verify-modal-subtitle').textContent = 
            `${pendingPayments.length} payment${pendingPayments.length > 1 ? 's' : ''} awaiting verification`;
        
        // Setup verification grid with pending payments
        setupPendingPaymentsVerificationGrid(pendingPayments);
        
        ProgressToast.hide(300);
        
        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('visible'), 10);
        
    } catch (error) {
        console.error('[PmtMgmt] Error showing verification modal:', error);
        ProgressToast.showError('Failed to load verification modal');
    }
}




console.log('[PmtMgmt] 💳 Payment Management Module loaded successfully');
