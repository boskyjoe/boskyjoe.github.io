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
    resetPaymentForm
} from './ui.js';

import { formatCurrency } from './utils.js'; 


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
    SALES_PAYMENTS_LEDGER_COLLECTION_PATH,PURCHASE_INVOICES_COLLECTION_PATH,
    CONSIGNMENT_ORDERS_COLLECTION_PATH 
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


// ===================================================================
// REAL-TIME SYNCHRONIZATION SYSTEM
// ===================================================================

// Module state to track listeners
let pmtMgmtRealtimeListeners = {
    supplierPayments: null,
    teamPayments: null,
    salesPayments: null,
    isActive: false
};


// ===================================================================
// BALANCED CACHE CONFIGURATION
// ===================================================================

const BALANCED_CACHE_CONFIG = {
    // Cache durations optimized for balanced approach
    supplierPayments: 3,        // 3 minutes - supplier relationship critical
    salesOutstanding: 3,        // 3 minutes - customer collection critical  
    salesPaid: 8,              // 8 minutes - reference data less time-sensitive
    teamPayments: 3,           // 3 minutes - team settlement critical
    dashboardMetrics: 3,       // 3 minutes - overview needs currency
    
    // UI enhancements
    showFreshnessIndicators: true,
    enableManualRefresh: true,
    refreshNotificationDuration: 2000
};





/**
 * ENHANCED: Setup real-time listeners for Payment Management module
 * 
 * Establishes live connections to all payment collections to automatically
 * refresh action items when payments are added, verified, or modified by
 * other users or modules. Critical for multi-user environments.
 */
export function initializePaymentManagementRealtimeSync() {
    console.log('[PmtMgmt] 🔄 Initializing real-time synchronization...');
    
    // Only initialize if Payment Management view is active
    const paymentMgmtView = document.getElementById('pmt-mgmt-view');
    if (!paymentMgmtView || !paymentMgmtView.classList.contains('active')) {
        console.log('[PmtMgmt] Payment Management not active - skipping real-time setup');
        return;
    }

    const db = firebase.firestore();

    try {
        // ===================================================================
        // LISTENER 1: SUPPLIER PAYMENTS (Most Critical)
        // ===================================================================
        console.log('[PmtMgmt] 📤 Setting up supplier payments real-time listener...');
        
        pmtMgmtRealtimeListeners.supplierPayments = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('paymentStatus', '==', 'Pending Verification')
            .onSnapshot(
                // SUCCESS HANDLER
                async (snapshot) => {
                    console.log('[PmtMgmt] 🔔 SUPPLIER PAYMENTS CHANGED - refreshing action items...');
                    console.log(`[PmtMgmt] Detected ${snapshot.docChanges().length} supplier payment changes`);
                    
                    // Log what changed for debugging
                    snapshot.docChanges().forEach(change => {
                        const paymentData = change.doc.data();
                        console.log(`[PmtMgmt] Supplier payment ${change.type}: ${paymentData.paymentId || change.doc.id} (${formatCurrency(paymentData.amountPaid || 0)})`);
                    });

                    // ✅ REFRESH: Action items only (lightweight)
                    try {
                        await buildActionRequiredList({ forceRefresh: true });
                        console.log('[PmtMgmt] ✅ Action items refreshed due to supplier payment changes');
                        
                        // ✅ OPTIONAL: Show subtle notification to user
                        showRealtimeUpdateNotification('supplier', snapshot.docChanges().length);
                        
                    } catch (refreshError) {
                        console.error('[PmtMgmt] Error refreshing after supplier payment change:', refreshError);
                    }
                },
                // ERROR HANDLER
                (error) => {
                    console.error('[PmtMgmt] Supplier payments listener error:', error);
                }
            );

        // ===================================================================
        // LISTENER 2: TEAM PAYMENTS
        // ===================================================================
        console.log('[PmtMgmt] 👥 Setting up team payments real-time listener...');
        
        pmtMgmtRealtimeListeners.teamPayments = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('paymentStatus', '==', 'Pending Verification')
            .onSnapshot(
                async (snapshot) => {
                    console.log('[PmtMgmt] 🔔 TEAM PAYMENTS CHANGED - refreshing action items...');
                    
                    snapshot.docChanges().forEach(change => {
                        const paymentData = change.doc.data();
                        console.log(`[PmtMgmt] Team payment ${change.type}: ${paymentData.teamName} (${formatCurrency(paymentData.amountPaid || 0)})`);
                    });

                    try {
                        await buildActionRequiredList({ forceRefresh: true });
                        console.log('[PmtMgmt] ✅ Action items refreshed due to team payment changes');
                        
                        showRealtimeUpdateNotification('team', snapshot.docChanges().length);
                        
                    } catch (refreshError) {
                        console.error('[PmtMgmt] Error refreshing after team payment change:', refreshError);
                    }
                },
                (error) => {
                    console.error('[PmtMgmt] Team payments listener error:', error);
                }
            );

        // ===================================================================
        // LISTENER 3: SALES PAYMENTS (Future enhancement)
        // ===================================================================
        // You can add sales payment listener here later if needed

        pmtMgmtRealtimeListeners.isActive = true;
        console.log('[PmtMgmt] ✅ Real-time synchronization active for Payment Management');

    } catch (error) {
        console.error('[PmtMgmt] Error setting up real-time listeners:', error);
    }
}


/**
 * CLEANUP: Detach real-time listeners when leaving Payment Management
 */
export function detachPaymentManagementRealtimeSync() {
    console.log('[PmtMgmt] 🔌 Detaching real-time synchronization...');
    
    if (pmtMgmtRealtimeListeners.supplierPayments) {
        pmtMgmtRealtimeListeners.supplierPayments();
        pmtMgmtRealtimeListeners.supplierPayments = null;
        console.log('[PmtMgmt] ✅ Supplier payments listener detached');
    }

    if (pmtMgmtRealtimeListeners.teamPayments) {
        pmtMgmtRealtimeListeners.teamPayments();
        pmtMgmtRealtimeListeners.teamPayments = null;
        console.log('[PmtMgmt] ✅ Team payments listener detached');
    }

    if (pmtMgmtRealtimeListeners.salesPayments) {
        pmtMgmtRealtimeListeners.salesPayments();
        pmtMgmtRealtimeListeners.salesPayments = null;
        console.log('[PmtMgmt] ✅ Sales payments listener detached');
    }

    pmtMgmtRealtimeListeners.isActive = false;
    console.log('[PmtMgmt] ✅ All Payment Management real-time listeners detached');
}


/**
 * SUBTLE UX: Show brief notification when real-time changes occur
 */
function showRealtimeUpdateNotification(paymentType, changeCount) {
    const typeNames = {
        'supplier': '📤 Supplier',
        'team': '👥 Team', 
        'sales': '💳 Sales'
    };
    
    // Show subtle toast notification (brief, non-intrusive)
    ProgressToast.show(`${typeNames[paymentType]} Payment Update`, 'info');
    ProgressToast.updateProgress(`${changeCount} payment${changeCount > 1 ? 's' : ''} changed - action items updated`, 100, 'Real-time sync');
    
    // Auto-hide quickly
    setTimeout(() => {
        ProgressToast.hide(1000);
    }, 1500);
}






/**
 * BUSINESS-SMART: Supplier invoices grid optimized for payment operations
 * Shows outstanding invoices that need payment action, with complete business context
 */
const pmtMgmtSupplierGridOptions = {
    theme: 'legacy',
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
            width: 280, // Room for multiple buttons
            
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
                
                console.log('VERIFICATION :',params.data.hasPendingPayments);


                // ✅ VERIFICATION: Use pre-loaded pending payment status
                if (params.data.hasPendingPayments === true && params.data.pendingPaymentsCount > 0) {
                    const pendingCount = params.data.pendingPaymentsCount;
                    const pendingAmount = params.data.pendingPaymentsAmount || 0;
                    
                    
                    buttons += `<button class="pmt-mgmt-verify-invoice-payments bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 font-semibold animate-pulse"
                                    data-invoice-id="${params.data.id}"
                                    title="Verify ${pendingCount} Pending Payments (${formatCurrency(pendingAmount)})">
                                    <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    VERIFY (${pendingCount})
                                </button> `;
                }
                
                // ✅ PAYMENT: For outstanding invoices
                if (status !== 'Paid' && balanceDue > 0) {
                    const urgencyClass = params.data.urgencyLevel === 'critical' ? 'animate-pulse' : '';
                    
                    buttons += `<button class="pmt-mgmt-pay-supplier-invoice bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600 font-semibold ${urgencyClass}"
                                    data-id="${params.data.id}" 
                                    title="Pay Outstanding Balance of ${formatCurrency(balanceDue)}">
                                    <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    </svg>
                                    PAY ${formatCurrency(balanceDue)}
                                </button> `;
                }
                
                // ✅ VIEW: Always available
                buttons += `<button class="pmt-mgmt-view-supplier-invoice bg-gray-500 text-white px-2 py-1 text-xs rounded hover:bg-gray-600"
                                data-id="${params.data.id}" 
                                title="View Invoice Details">
                                <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                View
                            </button>`;
                
                return `<div class="flex space-x-1">${buttons}</div>`;
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
    theme: 'alpine',
    getRowId: params => params.data.id,
    
    pagination: true,
    paginationPageSize: 25,
    paginationPageSizeSelector: [10, 25, 50, 100],
    
    rowHeight: 60,
    domLayout: 'normal',
    suppressColumnVirtualisation: false,
    suppressAutoSize: true,   
    suppressSizeToFit: false,
    
    columnDefs: [
        {
            headerName: "Team Name",
            width: 160,
            pinned: 'left',
            field: "teamName",
            
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
            headerName: "Consignment ID",
            width: 140,
            
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
                return params.data.consignmentId || params.data.id || 'Unknown';
            },
            valueFormatter: params => {
                const consignmentId = params.value || 'Unknown';
                return consignmentId.length > 15 ? consignmentId.substring(0, 12) + '...' : consignmentId;
            }
        },
        {
            headerName: "Team Lead",
            width: 140,
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                fontSize: '12px'
            },
            valueGetter: params => {
                return params.data.requestingMemberName || params.data.teamLeadName || 'Unknown Lead';
            }
        },
        {
            headerName: "Request Date",
            width: 120,
            field: "requestDate",
            
            filter: 'agDateColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center'
            },
            valueFormatter: params => {
                const requestDate = params.value;
                
                console.log(`[Team Grid] Formatting requestDate:`, requestDate, 'Type:', typeof requestDate);
                
                if (!requestDate) return 'No Date';
                
                try {
                    let dateObj;
                    
                    if (requestDate instanceof Date) {
                        // ✅ EXPECTED: Processed JavaScript Date from loadTeamPaymentsForMgmtTab
                        dateObj = requestDate;
                    } else if (requestDate.toDate && typeof requestDate.toDate === 'function') {
                        // ✅ FALLBACK: Raw Firestore Timestamp (shouldn't happen but safe fallback)
                        dateObj = requestDate.toDate();
                        console.warn('[Team Grid] Processing raw Firestore Timestamp in grid - data processing may have failed');
                    } else if (typeof requestDate === 'string' || typeof requestDate === 'number') {
                        // ✅ FALLBACK: String or timestamp number
                        dateObj = new Date(requestDate);
                    } else {
                        console.warn('[Team Grid] Unknown date type:', typeof requestDate, requestDate);
                        return 'Unknown Date';
                    }
                    
                    // ✅ VALIDATION: Ensure date is valid
                    if (isNaN(dateObj.getTime())) {
                        console.warn('[Team Grid] Invalid date object created from:', requestDate);
                        return 'Invalid Date';
                    }
                    
                    return dateObj.toLocaleDateString();
                    
                } catch (error) {
                    console.error('[Team Grid] Date formatting error:', error, 'for value:', requestDate);
                    return 'Date Error';
                }
            }
        },
        {
            headerName: "Total Sold",
            width: 120,
            field: "totalValueSold",
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            valueFormatter: params => formatCurrency(params.value || 0),
            cellStyle: { 
                color: '#059669', // Green for revenue generated
                fontWeight: 'bold',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
            }
        },
        {
            headerName: "Amount Paid",
            width: 120,
            field: "totalAmountPaid",
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            valueFormatter: params => formatCurrency(params.value || 0),
            cellStyle: { 
                color: '#2563eb', // Blue for payments received
                fontWeight: 'bold',
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
            
            valueFormatter: params => formatCurrency(params.value || 0),
            cellStyle: params => {
                const balance = params.value || 0;
                const baseStyle = {
                    textAlign: 'right',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end'
                };
                
                if (balance > 15000) return { ...baseStyle, color: '#dc2626' }; // High amount - red
                if (balance > 8000) return { ...baseStyle, color: '#ea580c' };  // Medium amount - orange
                if (balance > 0) return { ...baseStyle, color: '#dc2626' };     // Any outstanding - red
                return { ...baseStyle, color: '#059669' };                     // Settled - green
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
            
            // ✅ CONSIGNMENT LOGIC: Days from checkout date (when team got products)
            valueGetter: params => {
                const checkoutDate = params.data.checkoutDate;
                if (!checkoutDate) return 0;
                
                try {
                    const checkout = checkoutDate instanceof Date ? 
                        checkoutDate : 
                        (checkoutDate.toDate ? checkoutDate.toDate() : new Date(checkoutDate));
                    
                    const days = Math.ceil((new Date() - checkout) / (1000 * 60 * 60 * 24));
                    return Math.max(0, days);
                } catch {
                    return 0;
                }
            },
            cellRenderer: params => {
                const days = params.value || 0;
                const balance = params.data.balanceDue || 0;
                
                let colorClass, urgencyText, urgencyIcon;
                
                if (balance === 0) {
                    // Fully settled
                    colorClass = 'text-green-700 bg-green-100 border-green-300';
                    urgencyText = 'SETTLED';
                    urgencyIcon = `<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                   </svg>`;
                } else if (days > 90 || (balance > 15000 && days > 60)) {
                    // Critical settlement issue
                    colorClass = 'text-red-700 bg-red-100 border-red-300';
                    urgencyText = 'CRITICAL';
                    urgencyIcon = `<svg class="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                   </svg>`;
                } else if (days > 60 || balance > 10000) {
                    // High priority settlement
                    colorClass = 'text-orange-700 bg-orange-100 border-orange-300';
                    urgencyText = 'HIGH';
                    urgencyIcon = `<svg class="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                   </svg>`;
                } else if (days > 45) {
                    // Medium priority
                    colorClass = 'text-yellow-700 bg-yellow-100 border-yellow-300';
                    urgencyText = 'MEDIUM';
                    urgencyIcon = `<svg class="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                   </svg>`;
                } else {
                    // Recent or normal timeline
                    colorClass = 'text-blue-700 bg-blue-100 border-blue-300';
                    urgencyText = 'CURRENT';
                    urgencyIcon = `<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            headerName: "Settlement Status",
            width: 140,
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            
            // ✅ SETTLEMENT STATUS: Based on balance due
            cellRenderer: params => {
                const balanceDue = params.data.balanceDue || 0;
                const totalSold = params.data.totalValueSold || 0;
                const totalPaid = params.data.totalAmountPaid || 0;
                
                let statusConfig;
                
                if (balanceDue === 0) {
                    statusConfig = { 
                        class: 'bg-green-100 text-green-800 border-green-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                               </svg>`, 
                        text: 'SETTLED' 
                    };
                } else if (totalPaid > 0) {
                    statusConfig = { 
                        class: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                               </svg>`, 
                        text: 'PARTIAL' 
                    };
                } else {
                    statusConfig = { 
                        class: 'bg-red-100 text-red-800 border-red-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                               </svg>`, 
                        text: 'PENDING' 
                    };
                }
                
                return `<span class="inline-flex items-center space-x-1 px-2 py-1 text-xs font-bold rounded-full border ${statusConfig.class}">
                            ${statusConfig.icon}
                            <span>${statusConfig.text}</span>
                        </span>`;
            }
        },
        {
            headerName: "Actions",
            width: 250, // ✅ INCREASED: From 280 to 320 for 3 buttons
            minWidth: 250, // ✅ MINIMUM: Ensure buttons don't get crushed
            
            filter: false,
            floatingFilter: false,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            suppressSizeToFit: true, // ✅ CRITICAL: Don't let auto-sizing shrink this column
            suppressAutoSize: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start', // ✅ CHANGED: Left align to prevent centering issues
                gap: '2px', // ✅ REDUCED: Smaller gap between buttons
                padding: '4px', // ✅ REDUCED: Less padding for more space
                overflow: 'visible' // ✅ ALLOW: Buttons to be visible
            },
            
            cellRenderer: params => {
                const balanceDue = params.data.balanceDue || 0;
                const hasPendingPayments = params.data.hasPendingPayments || false;
                const pendingCount = params.data.pendingPaymentsCount || 0;
                const pendingAmount = params.data.pendingPaymentsAmount || 0;
                const currentUser = appState.currentUser;
                
                const hasFinancialPermissions = currentUser && (
                    currentUser.role === 'admin' || currentUser.role === 'finance'
                );
                
                if (!hasFinancialPermissions) {
                    return `<span class="text-xs text-gray-500 italic">View only</span>`;
                }
                
                let buttons = '';
                
                // ✅ PRIORITY 1: Verification button (highest priority - first)
                if (hasPendingPayments && pendingCount > 0) {
                    buttons += `<button class="pmt-mgmt-verify-team-payments bg-green-500 text-white px-1 py-1 text-xs rounded hover:bg-green-600 font-semibold animate-pulse flex items-center space-x-1"
                                        data-order-id="${params.data.id}"
                                        data-team-name="${params.data.teamName}"
                                        title="Verify ${pendingCount} Pending Payment${pendingCount > 1 ? 's' : ''} (${formatCurrency(pendingAmount)})">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span class="hidden sm:inline">VERIFY</span>
                                    <span class="sm:hidden">${pendingCount}</span>
                                </button>`;
                }
                
                if (balanceDue > 0) {
                    // ✅ SETTLEMENT ACTION: More compact button
                    const daysOutstanding = calculateDaysOverdue(params.data.checkoutDate);
                    const urgencyClass = daysOutstanding > 90 ? 'animate-pulse' : '';
                    
                    buttons += `<button class="pmt-mgmt-collect-team-settlement bg-red-500 text-white px-1 py-1 text-xs rounded hover:bg-red-600 font-semibold ${urgencyClass} flex items-center space-x-1" 
                                    data-id="${params.data.id}" 
                                    data-team-name="${params.data.teamName}"
                                    data-balance-due="${balanceDue}"
                                    title="Follow up on Settlement (${formatCurrency(balanceDue)})">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    </svg>
                                    <span class="hidden md:inline">FOLLOW UP</span>
                                    <span class="md:hidden">💰</span>
                                </button>`;
                }
                
                // ✅ VIEW ORDER: Always available, most compact
                buttons += `<button class="pmt-mgmt-view-consignment-order bg-blue-500 text-white px-1 py-1 text-xs rounded hover:bg-blue-600 flex items-center space-x-1" 
                                data-id="${params.data.id}" 
                                title="View Consignment Order Details">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V9a2 2 0 00-2-2H9a2 2 0 00-2 2v2.25"/>
                                </svg>
                                <span class="hidden lg:inline">Order</span>
                                <span class="lg:hidden">📋</span>
                            </button>`;
                
                return `<div class="flex space-x-1 items-center justify-start min-w-full">${buttons}</div>`;
            }
        }
    ],
    
    defaultColDef: {
        resizable: true,
        sortable: true,
        filter: true,
        floatingFilter: true,
        
        wrapHeaderText: true,
        autoHeaderHeight: true,

        suppressAutoSize: false, 
        suppressSizeToFit: false, 
        
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
        console.log("[PmtMgmt] ✅ Team CONSIGNMENT ORDERS Grid ready for settlement management");
        
        setTimeout(() => {
            loadTeamPaymentsForMgmtTab('outstanding'); // Load outstanding settlements
        }, 200);
    }
};


/**
 * ENHANCED: Check if a consignment order has team payments pending verification
 * 
 * Similar to checkForPendingPayments() but focused on team payments from 
 * consignment settlements. Critical for admin verification workflow.
 * 
 * @param {string} consignmentOrderId - The consignment order ID to check
 * @returns {Promise<Object>} Pending team payment status and details
 */
export async function checkForPendingTeamPayments(consignmentOrderId) {
    console.log(`[PmtMgmt] 🔍 DEBUG: Checking pending team payments for order: ${consignmentOrderId}`);

    try {
        const db = firebase.firestore();
        let hasPendingPayments = false;
        let pendingPaymentsCount = 0;
        let totalPendingAmount = 0;
        const pendingPaymentsList = [];

        // ✅ DEBUG: Log the exact query being made
        console.log(`[PmtMgmt] 🔍 Building query:`);
        console.log(`  Collection: ${CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH}`);
        console.log(`  Where orderId == "${consignmentOrderId}"`);
        console.log(`  Where paymentStatus == "Pending Verification"`);
        
        const teamPaymentsQuery = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('orderId', '==', consignmentOrderId)
            .where('paymentStatus', '==', 'Pending Verification')
            .orderBy('submittedOn', 'asc');

        console.log(`[PmtMgmt] 🔍 Executing query...`);
        const teamPaymentsSnapshot = await teamPaymentsQuery.get();
        
        console.log(`[PmtMgmt] 🔍 Query results:`);
        console.log(`  Snapshot size: ${teamPaymentsSnapshot.size}`);
        console.log(`  Snapshot empty: ${teamPaymentsSnapshot.empty}`);
        
        if (teamPaymentsSnapshot.size === 0) {
            // ✅ DEBUG: If no results, check if payment exists with different criteria
            console.log(`[PmtMgmt] 🔍 No results found - checking broader criteria...`);
            
            // Check if payment exists with ANY status
            const broadQuery = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
                .where('orderId', '==', consignmentOrderId)
                .limit(5);
                
            const broadSnapshot = await broadQuery.get();
            console.log(`[PmtMgmt] 🔍 Broader search (any status): ${broadSnapshot.size} payments found`);
            
            if (broadSnapshot.size > 0) {
                console.log(`[PmtMgmt] 🔍 Payment statuses for this order:`);
                broadSnapshot.docs.forEach((doc, index) => {
                    const payment = doc.data();
                    console.log(`    ${index + 1}. Status: "${payment.paymentStatus}", Amount: ${formatCurrency(payment.amountPaid || 0)}, Submitted: ${payment.submittedBy}`);
                });
            } else {
                console.log(`[PmtMgmt] ❌ No payments found for order ${consignmentOrderId} at all`);
            }
        } else {
            // Process found payments
            teamPaymentsSnapshot.docs.forEach(doc => {
                const payment = { id: doc.id, ...doc.data() };
                
                console.log(`[PmtMgmt] ✅ Found pending payment: ${payment.teamName}, ${formatCurrency(payment.amountPaid || 0)}`);
                
                if (payment.amountPaid && payment.amountPaid > 0) {
                    hasPendingPayments = true;
                    pendingPaymentsCount++;
                    totalPendingAmount += payment.amountPaid;
                    
                    pendingPaymentsList.push({
                        id: payment.id,
                        type: 'team_payment',
                        paymentAmount: payment.amountPaid,
                        donationAmount: payment.donationAmount || 0,
                        teamName: payment.teamName || 'Unknown Team',
                        relatedOrderId: consignmentOrderId,
                        originalOrderId: consignmentOrderId, // ✅ Add for grid buttons
                        daysWaiting: calculateDaysWaiting(payment.submittedOn || new Date())
                    });
                }
            });
        }

        const result = {
            consignmentOrderId: consignmentOrderId,
            hasPendingPayments: hasPendingPayments,
            totalPendingCount: pendingPaymentsCount,
            totalPendingAmount: totalPendingAmount,
            pendingPaymentsList: pendingPaymentsList,
            summaryText: pendingPaymentsCount > 0 ? 
                `${pendingPaymentsCount} team payment${pendingPaymentsCount > 1 ? 's' : ''} awaiting verification (${formatCurrency(totalPendingAmount)})` :
                'No pending team payments for verification',
            actionState: pendingPaymentsCount > 0 ? 'verification_needed' : 'no_action_needed'
        };

        console.log(`[PmtMgmt] 🔍 checkForPendingTeamPayments FINAL RESULT for ${consignmentOrderId}:`, {
            hasPending: result.hasPendingPayments,
            count: result.totalPendingCount,
            amount: formatCurrency(result.totalPendingAmount),
            actionState: result.actionState
        });
        
        return result;

    } catch (error) {
        console.error(`[PmtMgmt] ❌ Error checking pending team payments for order ${consignmentOrderId}:`, error);
        
        return {
            consignmentOrderId: consignmentOrderId,
            hasPendingPayments: false,
            totalPendingCount: 0,
            totalPendingAmount: 0,
            pendingPaymentsList: [],
            summaryText: 'Error checking team payment status',
            actionState: 'error',
            errorMessage: error.message
        };
    }
}



/**
 * ENHANCED: Check if invoice has pending payments awaiting verification
 * @param {string} invoiceId - The invoice ID to check for pending payments
 * @returns {Promise<object>} Object with pending payment info and count
 */
export async function checkForPendingPayments(invoiceId) {
    console.log(`[PmtMgmt] Checking pending payments for invoice: ${invoiceId}`);

    try {
        const db = firebase.firestore();
        let hasPendingPayments = false;
        let pendingPaymentsCount = 0;
        let totalPendingAmount = 0;
        const pendingPaymentsList = [];

        // ===================================================================
        // PHASE 1: CHECK SUPPLIER PAYMENTS PENDING VERIFICATION
        // ===================================================================

        console.log('[PmtMgmt] Phase 1: Checking supplier payments...');
        
        const supplierPaymentsQuery = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('relatedInvoiceId', '==', invoiceId)
            .where('paymentStatus', '==', 'Pending Verification')
            .orderBy('submittedOn', 'asc');

        const supplierPaymentsSnapshot = await supplierPaymentsQuery.get();
        
        supplierPaymentsSnapshot.docs.forEach(doc => {
            const payment = { id: doc.id, ...doc.data() };
            
            if (payment.amountPaid && payment.amountPaid > 0) {
                hasPendingPayments = true;
                pendingPaymentsCount++;
                totalPendingAmount += payment.amountPaid;
                
                pendingPaymentsList.push({
                    id: payment.id,
                    type: 'supplier_payment',
                    paymentAmount: payment.amountPaid,
                    paymentMode: payment.paymentMode || 'Unknown',
                    submittedDate: payment.submittedOn,
                    submittedBy: payment.submittedBy || 'Unknown',
                    paymentReference: payment.transactionRef || '',
                    daysWaiting: calculateDaysWaiting(payment.submittedOn || new Date()),
                    relatedInvoiceId: payment.relatedInvoiceId || invoiceId, 
                    originalInvoiceId: invoiceId,                           
                    invoiceId: invoiceId 
                });
            }
        });

        console.log(`[PmtMgmt] Found ${pendingPaymentsCount} pending supplier payments`);

        // ===================================================================
        // PHASE 2: RETURN COMPLETE PENDING STATUS
        // ===================================================================

        const result = {
            invoiceId: invoiceId,
            hasPendingPayments: hasPendingPayments,
            totalPendingCount: pendingPaymentsCount,
            totalPendingAmount: totalPendingAmount,
            pendingPaymentsList: pendingPaymentsList,
            
            // Summary for UI display
            summaryText: pendingPaymentsCount > 0 ? 
                `${pendingPaymentsCount} payment${pendingPaymentsCount > 1 ? 's' : ''} awaiting verification (${formatCurrency(totalPendingAmount)})` :
                'No pending payments for verification',
                
            // Action state for buttons
            actionState: pendingPaymentsCount > 0 ? 'verification_needed' : 'no_action_needed'
        };

        console.log(`[PmtMgmt] Pending payments check result for invoice ${invoiceId}:`, {
            hasPending: result.hasPendingPayments,
            count: result.totalPendingCount,
            amount: formatCurrency(result.totalPendingAmount)
        });
        
        return result;

    } catch (error) {
        console.error(`[PmtMgmt] Error checking pending payments for invoice ${invoiceId}:`, error);
        
        // Return failure state
        return {
            invoiceId: invoiceId,
            hasPendingPayments: false,
            totalPendingCount: 0,
            totalPendingAmount: 0,
            pendingPaymentsList: [],
            summaryText: 'Error loading payment status',
            actionState: 'error',
            errorMessage: error.message
        };
    }
}

/**
 * HELPER: Calculate days waiting (reuse existing logic)
 */
function calculateDaysWaiting(submittedDate) {
    if (!submittedDate) return 0;

    try {
        const submitted = submittedDate.toDate ? 
            submittedDate.toDate() : 
            new Date(submittedDate);
        
        const today = new Date();
        const diffTime = today - submitted;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    } catch (error) {
        console.warn('[PmtMgmt] Error calculating days waiting:', error);
        return 0;
    }
}


const pmtMgmtSalesGridOptions = {
    theme: 'legacy', // ✅ CONSISTENT: Same theme as other grids
    getRowId: params => params.data.id,
    
    pagination: true,
    paginationPageSize: 25, // ✅ CONSISTENT: Same pagination as other grids
    paginationPageSizeSelector: [10, 25, 50, 100],
    
    // ✅ STABILITY: Fixed row height like other grids
    rowHeight: 60,

    suppressSizeToFit: true, 
    
    columnDefs: [
        {
            headerName: "Customer Name",
            width: 200,
            pinned: 'left',
            
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
            
            // ✅ CORRECTED: Get customer name from invoice data
            valueGetter: params => {
                return params.data.customerInfo?.name || params.data.customerName || 'Unknown Customer';
            }
        },
        {
            headerName: "Invoice ID",
            width: 150,
            
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
            
            // ✅ CORRECTED: Get invoice ID from sales invoice
            valueGetter: params => {
                return params.data.saleId || params.data.invoiceId || 'Unknown Invoice';
            },
            valueFormatter: params => {
                const invoiceId = params.value || 'Unknown';
                return invoiceId.length > 15 ? invoiceId.substring(0, 15) + '...' : invoiceId;
            }
        },
        {
            headerName: "Store",
            width: 200,
            field: "store",
            
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
            
            cellRenderer: params => {
                const store = params.value || 'Unknown Store';
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
            headerName: "Invoice Date",
            width: 130,
            field: "saleDate",
            
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
            headerName: "Invoice Total",
            width: 200,
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            // ✅ CORRECTED: Get total from invoice financials
            valueGetter: params => {
                return params.data.financials?.totalAmount || 0;
            },
            valueFormatter: params => formatCurrency(params.value || 0),
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
            width: 200,
            field: "totalAmountPaid",
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            valueFormatter: params => formatCurrency(params.value || 0),
            cellStyle: { 
                color: '#059669', // Green for payments received
                fontWeight: 'bold',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
            }
        },
        {
            headerName: "Balance Due",
            width: 200,
            field: "balanceDue",
            
            filter: 'agNumberColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            valueFormatter: params => formatCurrency(params.value || 0),
            cellStyle: params => {
                const balance = params.value || 0;
                const baseStyle = {
                    textAlign: 'right',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end'
                };
                
                // Color based on outstanding amount and urgency
                if (balance > 10000) return { ...baseStyle, color: '#dc2626' }; // High amount - red
                if (balance > 5000) return { ...baseStyle, color: '#ea580c' };  // Medium amount - orange
                if (balance > 0) return { ...baseStyle, color: '#dc2626' };     // Any outstanding - red
                return { ...baseStyle, color: '#059669' };                     // Paid in full - green
            }
        },
        {
            headerName: "Days Outstanding",
            width: 200,
            
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
            
            // ✅ CORRECTED: Calculate days from invoice date
            valueGetter: params => {
                const processedSaleDate = params.data.saleDate; // This is now a proper Date object
                
                if (!processedSaleDate || !(processedSaleDate instanceof Date)) {
                    return 0;
                }
                
                const today = new Date();
                const diffTime = today - processedSaleDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return Math.max(0, diffDays);
            },
            cellRenderer: params => {
                const days = params.value || 0;
                const balance = params.data.balanceDue || 0;
                
                let colorClass, urgencyText, urgencyIcon;
                
                // ✅ BUSINESS LOGIC: Collection urgency based on days + amount
                if (balance === 0) {
                    // Paid in full
                    colorClass = 'text-green-700 bg-green-100 border-green-300';
                    urgencyText = 'PAID';
                    urgencyIcon = `<svg class="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                   </svg>`;
                } else if (days > 60 || (balance > 10000 && days > 30)) {
                    // Critical collection issue
                    colorClass = 'text-red-700 bg-red-100 border-red-300';
                    urgencyText = 'CRITICAL';
                    urgencyIcon = `<svg class="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                   </svg>`;
                } else if (days > 30 || balance > 8000) {
                    // High priority collection
                    colorClass = 'text-orange-700 bg-orange-100 border-orange-300';
                    urgencyText = 'HIGH';
                    urgencyIcon = `<svg class="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                   </svg>`;
                } else if (days > 14 || balance > 3000) {
                    // Medium priority
                    colorClass = 'text-yellow-700 bg-yellow-100 border-yellow-300';
                    urgencyText = 'MEDIUM';
                    urgencyIcon = `<svg class="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                   </svg>`;
                } else {
                    // Recent or low priority
                    colorClass = 'text-blue-700 bg-blue-100 border-blue-300';
                    urgencyText = 'RECENT';
                    urgencyIcon = `<svg class="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            headerName: "Payment Status",
            width: 200,
            field: "paymentStatus",
            
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
                const status = params.value || 'Unknown';
                
                const statusConfig = {
                    'Paid': { 
                        class: 'bg-green-100 text-green-800 border-green-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                               </svg>`, 
                        text: 'PAID' 
                    },
                    'Partially Paid': { 
                        class: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                               </svg>`, 
                        text: 'PARTIAL' 
                    },
                    'Unpaid': { 
                        class: 'bg-red-100 text-red-800 border-red-300', 
                        icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2"/>
                               </svg>`, 
                        text: 'UNPAID' 
                    }
                };
                
                const config = statusConfig[status] || { 
                    class: 'bg-gray-100 text-gray-800 border-gray-300', 
                    icon: `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
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
            headerName: "Customer Contact",
            width: 250,
            
            filter: 'agTextColumnFilter',
            floatingFilter: true,
            
            wrapHeaderText: true,
            autoHeaderHeight: true,
            
            cellStyle: {
                display: 'flex',
                alignItems: 'center',
                fontSize: '11px'
            },
            
            // ✅ COLLECTION CONTEXT: Customer contact information
            cellRenderer: params => {
                const customerInfo = params.data.customerInfo || {};
                const email = customerInfo.email || 'No email';
                const phone = customerInfo.phone || 'No phone';
                
                return `
                    <div class="py-1">
                        <div class="text-xs text-blue-600 hover:text-blue-800 cursor-pointer" 
                             onclick="navigator.clipboard.writeText('${email}')" 
                             title="Click to copy email">
                            📧 ${email.length > 20 ? email.substring(0, 17) + '...' : email}
                        </div>
                        <div class="text-xs text-green-600 hover:text-green-800 cursor-pointer" 
                             onclick="navigator.clipboard.writeText('${phone}')" 
                             title="Click to copy phone">
                            📞 ${phone}
                        </div>
                    </div>
                `;
            },
            
            // Use email for filtering/sorting
            valueGetter: params => params.data.customerInfo?.email || 'No email'
        },
        {
            headerName: "Actions",
            width: 250,
            
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
                const paymentStatus = params.data.paymentStatus || 'Unknown';
                const balanceDue = params.data.balanceDue || 0;
                const invoiceDocId = params.data.id; // ✅ CRITICAL: Use document ID
                const invoiceSystemId = params.data.saleId || invoiceDocId; // ✅ Display ID
                
                console.log(`[Grid] Creating action buttons for invoice:`, {
                    docId: invoiceDocId,
                    systemId: invoiceSystemId,
                    customer: params.data.customerInfo?.name,
                    balanceDue: formatCurrency(balanceDue)
                });
                
                const currentUser = appState.currentUser;
                const hasFinancialPermissions = currentUser && (
                    currentUser.role === 'admin' || currentUser.role === 'finance'
                );
                
                if (!hasFinancialPermissions) {
                    return `<span class="text-xs text-gray-500 italic">View only</span>`;
                }
                
                let buttons = '';
                
                if (paymentStatus === 'Paid') {
                    // ✅ PAID INVOICES: View and payment management actions
                    buttons = `<div class="flex space-x-1">
                                    <button class="pmt-mgmt-view-sales-invoice bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 flex items-center space-x-1" 
                                        data-id="${invoiceDocId}"
                                        title="View Invoice Details (${invoiceSystemId})">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                        <span>View Details</span>
                                    </button>
                                </div>`;
                } else {
                    // ✅ OUTSTANDING INVOICES: Collection actions
                    const daysOverdue = calculateDaysOverdue(params.data.saleDate);
                    const urgencyClass = daysOverdue > 45 ? 'animate-pulse' : '';
                    
                    buttons = `<div class="flex space-x-1">
                                    <button class="pmt-mgmt-collect-customer-payment bg-green-600 text-white px-2 py-1 text-xs rounded hover:bg-green-700 font-semibold ${urgencyClass} flex items-center space-x-1" 
                                        data-id="${invoiceDocId}"
                                        data-customer-name="${params.data.customerInfo?.name || 'Unknown'}"
                                        data-balance-due="${balanceDue}"
                                        title="Collect Payment for ${formatCurrency(balanceDue)} from ${params.data.customerInfo?.name}">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                                        </svg>
                                        <span>COLLECT ${formatCurrency(balanceDue)}</span>
                                    </button>
                                    <button class="pmt-mgmt-view-sales-invoice bg-blue-500 text-white px-2 py-1 text-xs rounded hover:bg-blue-600 flex items-center space-x-1" 
                                        data-id="${invoiceDocId}"
                                        title="View Invoice Details (${invoiceSystemId})">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 616 0z"/>
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                        <span>View</span>
                                    </button>
                                </div>`;
                }
                
                console.log(`[Grid] ✅ Generated action buttons for invoice ${invoiceDocId} (${paymentStatus})`);
                return buttons;
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
        console.log("[PmtMgmt] ✅ Business-Smart Sales INVOICES Grid ready for collections");
        
       setTimeout(() => {
            console.log('[PmtMgmt] 🔄 Initial sales data load...');
            loadSalesPaymentsForMgmtTab('outstanding').then(() => {
                console.log('[PmtMgmt] ✅ Initial load completed - freshness indicator should be visible');
            });
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

let pmtMgmtPendingPaymentsGridApi = null;


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

        // ✅ NEW: Initialize real-time sync after dashboard is ready
        setTimeout(() => {
            initializePaymentManagementRealtimeSync();
        }, 1000); // Wait for dashboard to finish loading

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

    if (metrics.error) {
        actionItemsContainer.innerHTML = `
            <div class="text-center py-8">
                <svg class="w-12 h-12 mx-auto text-red-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <h4 class="text-lg font-semibold text-red-700">Error Loading Action Items</h4>
                <p class="text-sm text-red-600 mt-2">${metrics.errorMessage || 'Could not load pending verifications'}</p>
                <button onclick="refreshPaymentManagementDashboard()" class="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                    Refresh Dashboard
                </button>
            </div>
        `;
        return;
    }

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
        ProgressToast.updateProgress('Optimizing data queries for free tier...', 20);

        // ✅ OPTIMIZED: Load metrics with caching and limits
        const startTime = Date.now();
        const metrics = await loadPaymentMgmtMetrics();
        const loadTime = Date.now() - startTime;

        ProgressToast.updateProgress('Loading outstanding balances...', 45);

        // ✅ NEW: Load outstanding balance metrics separately
        const outstandingMetrics = await loadOutstandingBalanceMetrics();
        

        ProgressToast.updateProgress('Processing combined data...', 70);


        // Update dashboard cards
        //updatePaymentMgmtDashboardCards(metrics);

        // ✅ NEW: Update outstanding balance cards
        updateOutstandingBalanceCards(outstandingMetrics);


        // Update action items (high-priority payments)
        await buildActionRequiredList({ metrics: metrics });

        //updatePaymentMgmtActionItems(metrics);

        // Update tab badges with counts
        updatePaymentMgmtTabBadges(metrics);

        // Update last refresh time with performance info
        pmtMgmtState.lastRefreshTime = new Date();
        const refreshElement = document.getElementById('pmt-mgmt-last-refresh');
        if (refreshElement) {
            const totalReads = (metrics.totalFirestoreReads || 0) + (outstandingMetrics.metadata?.firestoreReadsUsed || 0);
            refreshElement.textContent = `${pmtMgmtState.lastRefreshTime.toLocaleTimeString()} (${totalReads} reads)`;
        }

        ProgressToast.updateProgress('Dashboard updated successfully!', 100);

        setTimeout(() => {
            ProgressToast.hide(300);

            // ✅ ENHANCED: Show combined performance info for free tier awareness
            const paymentReads = metrics.totalFirestoreReads || 0;
            const balanceReads = outstandingMetrics.metadata?.firestoreReadsUsed || 0;
            const totalReads = paymentReads + balanceReads;

            if (totalReads > 0) {
                console.log(`[PmtMgmt] 📊 ENHANCED PERFORMANCE SUMMARY:`);
                console.log(`  🔄 Payment Operations: ${paymentReads} reads`);
                console.log(`  💰 Outstanding Balances: ${balanceReads} reads`);
                console.log(`  🔥 Total Firestore Reads: ${totalReads}`);
                console.log(`  ⚡ Load Time: ${loadTime}ms`);
                console.log(`  💾 Cache Status: ${totalReads === 0 ? 'Hit (saved reads)' : 'Miss (fresh data)'}`);
                console.log(`  ⏰ Next Cache Expiry: ${new Date(Date.now() + 5 * 60 * 1000).toLocaleTimeString()}`);
                
                // ✅ NEW: Business intelligence summary
                console.log(`  💼 BUSINESS POSITION:`);
                console.log(`    📤 We Owe Suppliers: ${outstandingMetrics.supplierPayables?.formattedTotalOutstanding || '₹0'}`);
                console.log(`    📈 Owed to Us: ${formatCurrency((outstandingMetrics.directSalesReceivables?.totalOutstanding || 0) + (outstandingMetrics.consignmentReceivables?.totalOutstanding || 0))}`);
                console.log(`    💰 Net Position: ${outstandingMetrics.netPosition?.formattedNetPosition || '₹0'}`);
                console.log(`    🎯 Status: ${outstandingMetrics.executiveSummary?.overallHealth || 'Unknown'}`);
            }
        }, 800);

        console.log('[PmtMgmt] ✅ Enhanced dashboard refresh completed with outstanding balance intelligence');

    } catch (error) {
        console.error('[PmtMgmt] Enhanced dashboard refresh failed:', error);
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
/*function calculateDaysOverdue(dueDate, currentDate = new Date()) {
    if (!dueDate) return 0;

    const due = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
    const diffTime = currentDate - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}*/


/**
 * CORRECTED: Calculate days overdue from properly processed dates
 */
function calculateDaysOverdue(saleDate) {
    if (!saleDate) return 0;
    
    try {
        // Handle both processed Date objects and Firestore Timestamps
        let saleDateObj;
        
        if (saleDate instanceof Date) {
            saleDateObj = saleDate; // Already processed
        } else if (saleDate.toDate && typeof saleDate.toDate === 'function') {
            saleDateObj = saleDate.toDate(); // Firestore Timestamp
        } else {
            saleDateObj = new Date(saleDate); // String conversion
        }
        
        const today = new Date();
        const diffTime = today - saleDateObj;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
        
    } catch (error) {
        console.warn('[PmtMgmt] Error calculating days overdue:', error);
        return 0;
    }
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
        receivablesCount: document.getElementById('pmt-mgmt-receivables-count'),
        payablesCount: document.getElementById('pmt-mgmt-payables-count'),
        today: document.getElementById('pmt-mgmt-today-count'),
        todayAmount: document.getElementById('pmt-mgmt-today-amount'),
        pendingAmount: document.getElementById('pmt-mgmt-pending-amount'),
        receivables: document.getElementById('pmt-mgmt-receivables-amount'),
        payables: document.getElementById('pmt-mgmt-payables-amount')
        
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
 * BALANCED: Add data freshness indicator to grids
 */

function addDataFreshnessIndicator(gridId, loadedTime, cacheMinutes) {
    if (!BALANCED_CACHE_CONFIG.showFreshnessIndicators) return;
    
    console.log(`[PmtMgmt] 📊 Adding balanced freshness indicator to ${gridId}`);
    
    const gridContainer = document.getElementById(gridId)?.parentElement;
    if (!gridContainer) {
        console.warn(`[PmtMgmt] Could not find container for ${gridId}`);
        return;
    }
    
    // Remove existing indicator
    const existingIndicator = gridContainer.querySelector('.data-freshness-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Determine grid type for your existing refresh function
    const gridType = gridId.includes('supplier') ? 'supplier' : 'sales';
    
    // Create balanced freshness indicator
    const indicator = document.createElement('div');
    indicator.className = 'data-freshness-indicator flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 text-sm';
    
    indicator.innerHTML = `
        <div class="flex items-center space-x-3">
            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="text-blue-800">
                <strong>Loaded:</strong> ${loadedTime}
            </span>
            <span class="text-blue-600 text-xs">
                <strong>Cache:</strong> ${cacheMinutes}min | 
                <strong>Expires:</strong> <span id="${gridId}-cache-countdown" class="font-medium">calculating...</span>
            </span>
        </div>
        <div class="flex items-center space-x-2">
            <span class="text-xs" id="${gridId}-cache-status">
                <span class="text-green-600 font-medium">✅ Fresh Data</span>
            </span>
            <button onclick="refreshSpecificGrid('${gridId}', '${gridType}')" 
                   class="text-blue-600 hover:text-blue-800 underline text-xs font-medium px-2 py-1 hover:bg-blue-100 rounded transition-colors">
                🔄 Refresh Now
            </button>
        </div>
    `;
    
    // Insert at top of grid container
    gridContainer.insertBefore(indicator, gridContainer.firstChild);
    
    // Start cache countdown
    startBalancedCacheCountdown(gridId, cacheMinutes);
    
    console.log(`[PmtMgmt] ✅ Balanced freshness indicator added with ${cacheMinutes}-min cache using your refreshSpecificGrid function`);
}

/**
 * BALANCED: Cache countdown with visual feedback
 */
function startBalancedCacheCountdown(gridId, cacheMinutes) {
    let secondsRemaining = cacheMinutes * 60;
    const countdownElement = document.getElementById(`${gridId}-cache-countdown`);
    const statusElement = document.getElementById(`${gridId}-cache-status`);
    
    if (!countdownElement || !statusElement) return;
    
    const countdown = setInterval(() => {
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        
        countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (secondsRemaining <= 0) {
            // Cache expired - time for refresh
            statusElement.innerHTML = '<span class="text-orange-600 font-semibold animate-pulse">⚠️ Cache Expired</span>';
            countdownElement.textContent = 'Click Refresh for latest';
            countdownElement.className = 'text-orange-600 font-semibold';
            clearInterval(countdown);
            
        } else if (secondsRemaining <= 60) {
            // Expiring soon
            statusElement.innerHTML = '<span class="text-yellow-600 font-medium">🟡 Expiring Soon</span>';
            countdownElement.className = 'text-yellow-600 font-medium';
            
        } else if (secondsRemaining <= 120) {
            // Getting older  
            statusElement.innerHTML = '<span class="text-blue-600">🔵 Aging</span>';
            countdownElement.className = 'text-blue-600';
            
        } else {
            // Still fresh
            statusElement.innerHTML = '<span class="text-green-600 font-medium">✅ Fresh</span>';
            countdownElement.className = 'text-blue-600';
        }
        
        secondsRemaining--;
    }, 1000);
}


/**
 * HELPER: Get current supplier filter mode from UI state
 */
function getCurrentSupplierFilterMode() {
    const outstandingFilter = document.getElementById('pmt-mgmt-supplier-filter-outstanding');
    const paidFilter = document.getElementById('pmt-mgmt-supplier-filter-paid');
    
    console.log('[PmtMgmt] 🔍 Checking current supplier filter mode:');
    console.log('  Outstanding active:', outstandingFilter?.classList.contains('active'));
    console.log('  Paid active:', paidFilter?.classList.contains('active'));
    
    if (paidFilter?.classList.contains('active')) {
        return 'paid';
    } else {
        return 'outstanding'; // Default for suppliers
    }
}



/**
 * BALANCED: Cache countdown with visual feedback
 */
function startCacheCountdown(gridId, cacheMinutes) {
    let secondsRemaining = cacheMinutes * 60;
    const countdownElement = document.getElementById(`${gridId}-cache-countdown`);
    const statusElement = document.getElementById(`${gridId}-cache-status`);
    
    if (!countdownElement || !statusElement) return;
    
    const countdown = setInterval(() => {
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        
        countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (secondsRemaining <= 0) {
            // Cache expired
            statusElement.innerHTML = '⚠️ <span class="text-orange-600 font-semibold">Cache Expired</span>';
            countdownElement.textContent = 'Click Refresh for latest data';
            countdownElement.className = 'text-orange-600 font-semibold animate-pulse';
            clearInterval(countdown);
            
        } else if (secondsRemaining <= 60) {
            // Expiring soon
            statusElement.innerHTML = '🟡 <span class="text-yellow-600">Expiring Soon</span>';
            countdownElement.className = 'text-yellow-600 font-semibold';
            
        } else if (secondsRemaining <= 120) {
            // Getting older
            statusElement.innerHTML = '🟠 <span class="text-blue-600">Aging</span>';
            countdownElement.className = 'text-blue-600';
            
        } else {
            // Fresh
            statusElement.innerHTML = '✅ <span class="text-green-600">Fresh</span>';
            countdownElement.className = 'text-blue-600';
        }
        
        secondsRemaining--;
    }, 1000);
}

/**
 * BALANCED: Global refresh function for manual refresh buttons
 */

window.refreshSpecificGrid = async function(gridId, gridType) {
    console.log(`[PmtMgmt] 🔄 Manual refresh requested for ${gridType} grid (${gridId})`);
    
    try {
        ProgressToast.show(`Refreshing ${gridType.charAt(0).toUpperCase() + gridType.slice(1)} Data`, 'info');
        ProgressToast.updateProgress('Detecting current filter mode...', 25);
        
        switch (gridType) {
            case 'supplier':
                const currentSupplierFilter = getCurrentSupplierFilterMode();
                console.log(`[PmtMgmt] 📤 Supplier refresh: ${currentSupplierFilter} mode`);
                await loadSupplierInvoicesForMgmtTab(currentSupplierFilter, { forceRefresh: true });
                break;
                
            case 'sales':
                const currentSalesFilter = getCurrentSalesFilterMode();
                console.log(`[PmtMgmt] 💳 Sales refresh: ${currentSalesFilter} mode`);
                await loadSalesPaymentsForMgmtTab(currentSalesFilter, { forceRefresh: true });
                break;
                
            case 'team':
                // ✅ NEW: Team payments support
                const currentTeamFilter = getCurrentTeamFilterMode();
                console.log(`[PmtMgmt] 👥 Team refresh: ${currentTeamFilter} mode`);
                ProgressToast.updateProgress(`Refreshing ${currentTeamFilter} team payments...`, 50);
                await loadTeamPaymentsForMgmtTab(currentTeamFilter, { forceRefresh: true });
                break;
                
            default:
                throw new Error(`Unknown grid type: ${gridType}`);
        }
        
        ProgressToast.showSuccess('Data refreshed successfully!');
        setTimeout(() => ProgressToast.hide(300), 800);
        
        console.log(`[PmtMgmt] ✅ Manual refresh completed for ${gridType} grid`);
        
    } catch (error) {
        console.error(`[PmtMgmt] Manual refresh failed for ${gridType}:`, error);
        ProgressToast.showError('Refresh failed - please try again');
    }
};





// ✅ TEMPORARY DEBUG: Add this to test filter mode detection
window.debugSalesFilterMode = function() {
    const currentMode = getCurrentSalesFilterMode();
    console.log('[DEBUG] Current sales filter mode:', currentMode);
    
    const outstandingFilter = document.getElementById('pmt-mgmt-sales-filter-outstanding');
    const paymentsFilter = document.getElementById('pmt-mgmt-sales-filter-paid');
    
    console.log('[DEBUG] Filter states:');
    console.log('  Outstanding classes:', outstandingFilter?.className);
    console.log('  Payments classes:', paymentsFilter?.className);
    
    alert(`Current Mode: ${currentMode}\n\nOutstanding Active: ${outstandingFilter?.classList.contains('active')}\nPayments Active: ${paymentsFilter?.classList.contains('active')}`);
};



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

    console.log(`[PmtMgmt] Loading supplier invoices with pending payment status (${filterStatus}, page ${page})...`);
    
    if (!pmtMgmtSupplierGridApi) {
        console.error('[PmtMgmt] Supplier grid API not ready');
        return;
    }

    try {
        pmtMgmtSupplierGridApi.setGridOption('loading', true);

        // ✅ CORRECTED: Smart caching strategy
        const cacheMinutes = filterStatus === 'outstanding' ? 2 : 10;
        const cacheKey = `pmt_mgmt_supplier_${filterStatus}_p${page}`;
        
        if (!forceRefresh && page === 1) {
            const cached = getCachedPaymentMetrics(cacheKey, cacheMinutes);
            if (cached && cached.invoices) {
                console.log(`[PmtMgmt] ✅ Using cached ${filterStatus} invoices - 0 reads`);
                pmtMgmtSupplierGridApi.setGridOption('rowData', cached.invoices);
                pmtMgmtSupplierGridApi.setGridOption('loading', false);
                updateSupplierInvoicesSummary(cached.metadata, cached.invoices);
                
                // ✅ BALANCED: Add freshness indicator
                addDataFreshnessIndicator('pmt-mgmt-supplier-grid', cached.metadata.loadedAt || new Date().toLocaleTimeString(), cacheMinutes);
                
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
                    .orderBy('purchaseDate', 'asc'); // Oldest first (highest priority)
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

        console.log(`[PmtMgmt] ✅ Retrieved ${invoices.length} ${filterStatus} invoices (${totalReads} reads)`);

        // ===================================================================
        // ✅ ENHANCED: CHECK PENDING PAYMENTS FOR EACH INVOICE
        // ===================================================================
        
        console.log('[PmtMgmt] Checking pending payment status for each invoice...');
        
        const enhancedInvoicesWithPendingStatus = await Promise.all(
            invoices.map(async (invoice) => {
                try {
                    // Check for pending payments for this specific invoice
                    const pendingStatus = await checkForPendingPayments(invoice.id);
                    
                    const daysOutstanding = calculateDaysOutstanding(invoice.purchaseDate);
                    const urgency = calculateBusinessUrgency(invoice, daysOutstanding);
                    
                    return {
                        ...invoice,
                        
                        // ✅ PENDING PAYMENT STATUS: Pre-calculated for cell renderer
                        hasPendingPayments: pendingStatus.hasPendingPayments,
                        pendingPaymentsCount: pendingStatus.totalPendingCount,
                        pendingPaymentsAmount: pendingStatus.totalPendingAmount,
                        pendingPaymentsSummary: pendingStatus.summaryText,
                        
                        // Business intelligence
                        daysOutstanding: daysOutstanding,
                        urgencyLevel: urgency.level,
                        urgencyReason: urgency.reason,
                        requiresImmediateAction: urgency.level === 'critical' || urgency.level === 'high',
                        isOverdue: daysOutstanding > 30,
                        
                        // UI optimization
                        formattedTotal: formatCurrency(invoice.invoiceTotal || 0),
                        formattedPaid: formatCurrency(invoice.amountPaid || 0),
                        formattedBalance: formatCurrency(invoice.balanceDue || 0),
                        formattedDate: invoice.purchaseDate?.toDate ? 
                            invoice.purchaseDate.toDate().toLocaleDateString() : 'Unknown',
                        
                        // Remove doc snapshot from display data
                        _docSnapshot: undefined
                    };
                } catch (error) {
                    console.warn(`[PmtMgmt] Error checking pending payments for invoice ${invoice.id}:`, error);
                    
                    // Return invoice data without pending status if check fails
                    return {
                        ...invoice,
                        hasPendingPayments: false,
                        pendingPaymentsCount: 0,
                        pendingPaymentsAmount: 0,
                        pendingPaymentsSummary: 'Could not check pending status',
                        daysOutstanding: calculateDaysOutstanding(invoice.purchaseDate),
                        formattedTotal: formatCurrency(invoice.invoiceTotal || 0),
                        formattedPaid: formatCurrency(invoice.amountPaid || 0),
                        formattedBalance: formatCurrency(invoice.balanceDue || 0),
                        _docSnapshot: undefined
                    };
                }
            })
        );

        console.log(`[PmtMgmt] ✅ Enhanced ${enhancedInvoicesWithPendingStatus.length} invoices with pending payment verification status`);

        // ===================================================================
        // PAGINATION AND DISPLAY LOGIC
        // ===================================================================
        
        const hasMorePages = filterStatus === 'paid' && invoices.length === pageSize;
        
        if (page === 1) {
            // First page or outstanding (replace data)
            pmtMgmtSupplierGridApi.setGridOption('rowData', enhancedInvoicesWithPendingStatus);
        } else {
            // Subsequent pages for paid invoices (append data)
            const currentData = [];
            pmtMgmtSupplierGridApi.forEachNode(node => currentData.push(node.data));
            const combinedData = [...currentData, ...enhancedInvoicesWithPendingStatus];
            pmtMgmtSupplierGridApi.setGridOption('rowData', combinedData);
            console.log(`[PmtMgmt] ✅ Appended page ${page}: ${combinedData.length} total invoices`);
        }

        pmtMgmtSupplierGridApi.setGridOption('loading', false);

        // ===================================================================
        // BUSINESS METRICS AND ANALYTICS
        // ===================================================================
        
        // Calculate business metrics
        const businessMetrics = {
            filterStatus: filterStatus,
            totalInvoices: enhancedInvoicesWithPendingStatus.length,
            currentPage: page,
            hasMorePages: hasMorePages,
            lastDocument: invoices.length > 0 ? invoices[invoices.length - 1]._docSnapshot : null,
            totalReads: totalReads,
            
            // Financial intelligence
            totalOutstanding: enhancedInvoicesWithPendingStatus.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0),
            criticalCount: enhancedInvoicesWithPendingStatus.filter(inv => inv.urgencyLevel === 'critical').length,
            overdueCount: enhancedInvoicesWithPendingStatus.filter(inv => inv.isOverdue).length,
            averageDaysOutstanding: enhancedInvoicesWithPendingStatus.length > 0 ? 
                enhancedInvoicesWithPendingStatus.reduce((sum, inv) => sum + inv.daysOutstanding, 0) / enhancedInvoicesWithPendingStatus.length : 0,
            
            // ✅ VERIFICATION INTELLIGENCE: Count invoices with pending payments
            invoicesWithPendingPayments: enhancedInvoicesWithPendingStatus.filter(inv => inv.hasPendingPayments === true).length,
            totalPendingVerificationAmount: enhancedInvoicesWithPendingStatus.reduce((sum, inv) => sum + (inv.pendingPaymentsAmount || 0), 0),
            totalPendingPaymentsCount: enhancedInvoicesWithPendingStatus.reduce((sum, inv) => sum + (inv.pendingPaymentsCount || 0), 0)
        };

        // Cache enhanced data
        if (page === 1) {
            const cacheData = {
                invoices: enhancedInvoicesWithPendingStatus,
                metadata: {
                    ...businessMetrics,
                    loadedAt: new Date().toLocaleTimeString(), // ✅ ADD: Timestamp
                    cacheExpiresAt: new Date(Date.now() + cacheMinutes * 60 * 1000).toLocaleTimeString() // ✅ ADD: Expiry
                }
            };
            cachePaymentMetrics(cacheKey, cacheData);
            addDataFreshnessIndicator('pmt-mgmt-supplier-grid', cacheData.metadata.loadedAt, cacheMinutes);
        }

        // Update summary display
        updateSupplierInvoicesSummary(businessMetrics, enhancedInvoicesWithPendingStatus);

        // ===================================================================
        // SUCCESS REPORTING WITH VERIFICATION INSIGHTS
        // ===================================================================
        
        console.log(`[PmtMgmt] 🎯 ENHANCED LOADING RESULTS:`);
        console.log(`  📊 ${filterStatus.toUpperCase()}: ${enhancedInvoicesWithPendingStatus.length} invoices`);
        console.log(`  💰 Outstanding Amount: ${formatCurrency(businessMetrics.totalOutstanding)}`);
        console.log(`  🚨 Critical: ${businessMetrics.criticalCount}, Overdue: ${businessMetrics.overdueCount}`);
        console.log(`  ✅ Invoices with Pending Payments: ${businessMetrics.invoicesWithPendingPayments}`);
        console.log(`  🔍 Total Pending Verifications: ${businessMetrics.totalPendingPaymentsCount} payments (${formatCurrency(businessMetrics.totalPendingVerificationAmount)})`);
        console.log(`  🔥 Firestore Reads: ${totalReads}`);

        return { invoices: enhancedInvoicesWithPendingStatus, metadata: businessMetrics };

    } catch (error) {
        console.error('[PmtMgmt] ❌ Error loading supplier invoices with pending status:', error);
        
        if (pmtMgmtSupplierGridApi) {
            pmtMgmtSupplierGridApi.setGridOption('loading', false);
            pmtMgmtSupplierGridApi.showNoRowsOverlay();
        }
        
        showModal('error', 'Supplier Invoices Loading Failed', 
            `Could not load supplier invoices with pending payment status.\n\n` +
            `Error: ${error.message}\n\n` +
            `This might be due to:\n` +
            `• Network connectivity issues\n` +
            `• Database permission restrictions\n` +
            `• High volume of pending payments\n\n` +
            `Please refresh and try again.`
        );
    }
}

/**
 * BUSINESS INTELLIGENCE: Calculate days outstanding from invoice date
 */
function calculateDaysOutstandingPurchase(purchaseDate) {
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
    const summaryElement = document.getElementById('pmt-mgmt-supplier-summary-bar');
    if (!summaryElement) return;
    
    const totalOutstanding = invoices ? 
        invoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0) : 0;
    const criticalCount = invoices ? 
        invoices.filter(inv => inv.urgencyLevel === 'critical').length : 0;
    const overdueCount = invoices ?
        invoices.filter(inv => inv.daysOutstanding > 30).length : 0;
    const verificationCount = metadata.invoicesWithPendingPayments || 0;

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
                        
                        ${verificationCount > 0 ? 
                            `<div class="bg-green-100 border border-green-300 rounded-lg px-3 py-2">
                                <div class="text-green-800 font-bold flex items-center space-x-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <span>${verificationCount} NEED VERIFICATION</span>
                                </div>
                                <div class="text-xs text-green-600">
                                    ${formatCurrency(metadata.totalPendingVerificationAmount || 0)} pending approval
                                </div>
                            </div>` : ''
                        }
                        
                        ${criticalCount > 0 ? 
                            `<div class="bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                                <div class="text-red-800 font-bold flex items-center space-x-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/>
                                    </svg>
                                    <span>${criticalCount} CRITICAL</span>
                                </div>
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
    
    console.log(`[PmtMgmt] ✅ Summary updated: ${verificationCount} invoices need payment verification`);
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
 * ENHANCED: Load consignment orders for team settlement management with balanced caching.
 * 
 * This function focuses on consignment orders rather than payment transactions,
 * providing better business context for team settlement management and cash flow tracking.
 * Includes pending payment verification checks for comprehensive admin workflow.
 * 
 * BUSINESS MODES:
 * - 'outstanding': Active consignment orders with balance due (teams owe settlements)  
 * - 'settled': Orders that have been fully settled (reference/success tracking)
 * 
 * @param {string} [focusMode='outstanding'] - 'outstanding' or 'settled'
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.useCache=true] - Enable balanced caching
 * @param {number} [options.queryLimit=50] - Max records per query
 * @param {boolean} [options.forceRefresh=false] - Force fresh data load
 * 
 * @returns {Promise<Object>} Team settlement data with business intelligence
 */
async function loadTeamPaymentsForMgmtTab(focusMode = 'outstanding', options = {}) {
    const { useCache = true, queryLimit = 50, forceRefresh = false } = options;
    
    console.log(`[PmtMgmt] 👥 Loading ${focusMode} CONSIGNMENT ORDERS for team settlement management...`);

    if (!pmtMgmtTeamGridApi) {
        console.error('[PmtMgmt] ❌ Team grid API not available');
        return;
    }

    try {
        pmtMgmtTeamGridApi.setGridOption('loading', true);

        // ===================================================================
        // BALANCED CACHE CONFIGURATION
        // ===================================================================
        
        const cacheMinutes = focusMode === 'outstanding' ? 
            (BALANCED_CACHE_CONFIG?.teamPayments || 3) :      // 3 minutes for outstanding settlements
            (BALANCED_CACHE_CONFIG?.teamPayments || 8);       // 8 minutes for settled orders
        
        const cacheKey = `pmt_mgmt_consignment_orders_${focusMode}_balanced`;
        
        // ✅ BALANCED: Cache check with mode-appropriate duration
        if (useCache && !forceRefresh) {
            const cached = getCachedPaymentMetrics(cacheKey, cacheMinutes);
            if (cached && cached.orderData) {
                console.log(`[PmtMgmt] ✅ Using cached ${focusMode} consignment orders (${cacheMinutes}min cache) - 0 reads`);
                
                pmtMgmtTeamGridApi.setGridOption('rowData', cached.orderData);
                pmtMgmtTeamGridApi.setGridOption('loading', false);
                updateTeamOrdersSummary(cached.metadata, cached.orderData, focusMode);
                
                // ✅ BALANCED: Add freshness indicator for cached data
                setTimeout(() => {
                    addDataFreshnessIndicator('pmt-mgmt-team-grid', cached.metadata.loadedAt || 'Cached', cacheMinutes);
                }, 300);
                
                return cached;
            }
        }

        console.log(`[PmtMgmt] 📊 Loading fresh ${focusMode} consignment orders (cache expired or forced refresh)...`);
        
        const db = firebase.firestore();
        let totalReads = 0;
        let orderData = [];

        if (focusMode === 'outstanding') {
            // ===================================================================
            // OUTSTANDING: Active consignment orders with settlement balances
            // ===================================================================
            console.log('[PmtMgmt] 👥 SETTLEMENT FOCUS: Loading consignment orders with outstanding balances...');
            console.log('[PmtMgmt] Query collection:', CONSIGNMENT_ORDERS_COLLECTION_PATH);
            
            // ✅ BUSINESS QUERY: Active consignment orders where teams owe money
            const outstandingOrdersQuery = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH)
                .where('status', '==', 'Active')
                .where('balanceDue', '>', 0) // ✅ Teams owe settlement money
                .orderBy('requestDate', 'asc') // Oldest orders first (settlement priority)
                .limit(queryLimit);

            const snapshot = await outstandingOrdersQuery.get();
            totalReads = snapshot.size;

            console.log(`[PmtMgmt] Outstanding consignment orders snapshot size: ${snapshot.size}`);

            if (snapshot.size === 0) {
                // ✅ DEBUG: Check if any consignment orders exist at all
                console.log('[PmtMgmt] 🔍 No outstanding orders found, checking all active orders...');
                
                const allActiveOrdersQuery = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH)
                    .where('status', '==', 'Active')
                    .limit(10);
                
                const allOrdersSnapshot = await allActiveOrdersQuery.get();
                totalReads += allOrdersSnapshot.size;
                
                console.log(`[PmtMgmt] 🔍 Total active consignment orders: ${allOrdersSnapshot.size}`);
                
                if (allOrdersSnapshot.size > 0) {
                    console.log(`[PmtMgmt] 🔍 Sample order balances:`);
                    allOrdersSnapshot.docs.slice(0, 5).forEach((doc, index) => {
                        const orderData = doc.data();
                        console.log(`  ${index + 1}. ${orderData.teamName}: Balance Due = ${formatCurrency(orderData.balanceDue || 0)}, Status = ${orderData.status}`);
                    });
                    
                    // Show helpful message about why no outstanding orders
                    pmtMgmtTeamGridApi.setGridOption('rowData', []);
                    pmtMgmtTeamGridApi.setGridOption('loading', false);
                    
                    setTimeout(() => {
                        showModal('info', 'No Outstanding Team Settlements',
                            `Found ${allOrdersSnapshot.size} active consignment orders, but none have outstanding balances.\n\n` +
                            `This means:\n` +
                            `✅ All active teams are current on settlements\n` +
                            `✅ No collection actions required\n\n` +
                            `To see team activity:\n` +
                            `💡 Use "Settled" tab for completed settlements\n` +
                            `💡 Check Consignment Management for active orders\n` +
                            `💡 Teams may need to sell products before settlements are due`
                        );
                    }, 500);
                } else {
                    // No consignment orders exist at all
                    pmtMgmtTeamGridApi.setGridOption('rowData', []);
                    pmtMgmtTeamGridApi.setGridOption('loading', false);
                    
                    setTimeout(() => {
                        showModal('info', 'No Consignment Orders Found',
                            `No active consignment orders found in the system.\n\n` +
                            `To generate team settlements:\n` +
                            `1. Teams must first request consignments\n` +
                            `2. Admin fulfills requests (gives products to teams)\n` +
                            `3. Teams sell products and generate revenue\n` +
                            `4. Teams owe settlement payments for sold products\n\n` +
                            `Start in Consignment Management to create team orders.`
                        );
                    }, 500);
                }
                
                // ✅ STILL ADD: Freshness indicator even for no data
                setTimeout(() => {
                    addDataFreshnessIndicator('pmt-mgmt-team-grid', new Date().toLocaleTimeString(), cacheMinutes);
                }, 600);
                
                return { orderData: [], metadata: { totalReads, mode: focusMode, cacheMinutes } };
            }

            // ===================================================================
            // ✅ CORRECTED: Process orders with Promise.all for async operations
            // ===================================================================
            
            console.log(`[PmtMgmt] 📋 Processing ${snapshot.size} outstanding consignment orders with pending payment checks...`);
            
            const orderDataPromises = snapshot.docs.map(async (doc, index) => {
                const data = doc.data();
                
                console.log(`[PmtMgmt] 🔍 Processing order ${index + 1}/${snapshot.size}:`);
                console.log(`  Team: ${data.teamName}, Balance Due: ${formatCurrency(data.balanceDue || 0)}`);
                console.log(`  Order ID: ${doc.id}`);
                
                // ✅ CRITICAL: Process dates for grid compatibility
                let processedRequestDate = null;
                let processedCheckoutDate = null;
                
                try {
                    // Request Date processing
                    if (data.requestDate?.toDate && typeof data.requestDate.toDate === 'function') {
                        processedRequestDate = data.requestDate.toDate();
                        console.log(`    ✅ Converted requestDate: ${processedRequestDate.toLocaleDateString()}`);
                    } else if (data.requestDate instanceof Date) {
                        processedRequestDate = data.requestDate;
                        console.log(`    ✅ requestDate already Date: ${processedRequestDate.toLocaleDateString()}`);
                    } else if (data.requestDate) {
                        processedRequestDate = new Date(data.requestDate);
                        console.log(`    ✅ Converted requestDate from string: ${processedRequestDate.toLocaleDateString()}`);
                    } else {
                        processedRequestDate = new Date();
                        console.log(`    ⚠️ No requestDate, using current date`);
                    }
                    
                    // Checkout Date processing
                    if (data.checkoutDate?.toDate && typeof data.checkoutDate.toDate === 'function') {
                        processedCheckoutDate = data.checkoutDate.toDate();
                        console.log(`    ✅ Converted checkoutDate: ${processedCheckoutDate.toLocaleDateString()}`);
                    } else if (data.checkoutDate instanceof Date) {
                        processedCheckoutDate = data.checkoutDate;
                    } else if (data.checkoutDate) {
                        processedCheckoutDate = new Date(data.checkoutDate);
                    } else {
                        processedCheckoutDate = new Date();
                        console.log(`    ⚠️ No checkoutDate, using current date`);
                    }
                    
                } catch (dateError) {
                    console.error(`[PmtMgmt] ❌ Date processing error for order ${doc.id}:`, dateError);
                    processedRequestDate = new Date();
                    processedCheckoutDate = new Date();
                }

                // ✅ VALIDATE: Ensure dates are valid JavaScript Date objects
                if (!(processedRequestDate instanceof Date) || isNaN(processedRequestDate.getTime())) {
                    console.warn(`[PmtMgmt] Invalid requestDate for order ${doc.id}, using fallback`);
                    processedRequestDate = new Date();
                }

                if (!(processedCheckoutDate instanceof Date) || isNaN(processedCheckoutDate.getTime())) {
                    console.warn(`[PmtMgmt] Invalid checkoutDate for order ${doc.id}, using fallback`);
                    processedCheckoutDate = new Date();
                }

                // ✅ CHECK: Pending team payments for this order (async operation)
                let pendingPaymentStatus = {
                    hasPendingPayments: false,
                    totalPendingCount: 0,
                    totalPendingAmount: 0,
                    summaryText: 'No pending payments'
                };
                
                try {
                    console.log(`    🔍 Checking pending team payments for order ${doc.id}...`);
                    pendingPaymentStatus = await checkForPendingTeamPayments(doc.id);
                    console.log(`    ✅ Found ${pendingPaymentStatus.totalPendingCount} pending team payments`);
                } catch (paymentCheckError) {
                    console.warn(`[PmtMgmt] Could not check pending payments for order ${doc.id}:`, paymentCheckError);
                }

                const daysOutstanding = calculateDaysOverdue(processedCheckoutDate);
                
                const processedOrder = {
                    id: doc.id,
                    ...data,
                    
                    // ✅ CRITICAL: Override with processed JavaScript Dates
                    requestDate: processedRequestDate,
                    checkoutDate: processedCheckoutDate,
                    
                    // ✅ PENDING PAYMENT STATUS (for verification buttons)
                    hasPendingPayments: pendingPaymentStatus.hasPendingPayments,
                    pendingPaymentsCount: pendingPaymentStatus.totalPendingCount,
                    pendingPaymentsAmount: pendingPaymentStatus.totalPendingAmount,
                    pendingPaymentsSummary: pendingPaymentStatus.summaryText,
                    
                    // ✅ SETTLEMENT INTELLIGENCE
                    daysOutstanding: daysOutstanding,
                    isOverdue: daysOutstanding > 60,
                    settlementPriority: calculateSettlementPriority(data.balanceDue || 0, daysOutstanding),
                    
                    // ✅ TEAM CONTEXT
                    teamName: data.teamName || 'Unknown Team',
                    teamLeadName: data.requestingMemberName || 'Unknown Lead',
                    consignmentId: data.consignmentId || doc.id,
                    
                    // ✅ FINANCIAL CONTEXT
                    formattedBalanceDue: formatCurrency(data.balanceDue || 0),
                    formattedTotalSold: formatCurrency(data.totalValueSold || 0),
                    formattedTotalPaid: formatCurrency(data.totalAmountPaid || 0),
                    
                    // ✅ SETTLEMENT ACTIONS
                    needsSettlement: (data.balanceDue || 0) > 0,
                    settlementUrgency: daysOutstanding > 90 ? 'critical' : 
                                      daysOutstanding > 60 ? 'high' : 'medium'
                };
                
                console.log(`    ✅ Processed order: ${processedOrder.teamName} - ${processedOrder.formattedBalanceDue} (${processedOrder.pendingPaymentsCount} pending payments)`);
                
                return processedOrder;
            });

            // ✅ CRITICAL: Wait for all async operations to complete
            orderData = await Promise.all(orderDataPromises);

            console.log(`[PmtMgmt] 🔍 DEBUGGING PROCESSED ORDER DATA:`);
            orderData.forEach((order, index) => {
                console.log(`[DEBUG] Order ${index + 1}: ${order.teamName} (${order.id})`);
                console.log(`  hasPendingPayments: ${order.hasPendingPayments}`);
                console.log(`  pendingPaymentsCount: ${order.pendingPaymentsCount}`);
                console.log(`  pendingPaymentsAmount: ${formatCurrency(order.pendingPaymentsAmount || 0)}`);
                console.log(`  Should show VERIFY button: ${order.hasPendingPayments && order.pendingPaymentsCount > 0 ? 'YES' : 'NO'}`);
            });

            console.log(`[PmtMgmt] ✅ ALL OUTSTANDING ORDERS PROCESSED: ${orderData.length} orders with pending payment verification status`);

        } else if (focusMode === 'settled') {
            // ===================================================================
            // SETTLED: Fully settled consignment orders (reference data)
            // ===================================================================
            console.log('[PmtMgmt] ✅ SUCCESS FOCUS: Loading settled consignment orders...');
            console.log('[PmtMgmt] Query collection:', CONSIGNMENT_ORDERS_COLLECTION_PATH);
            
            const settledOrdersQuery = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH)
                .where('status', '==', 'Active') // Still active but fully settled
                .where('balanceDue', '==', 0)    // ✅ Fully settled (no money owed)
                .orderBy('requestDate', 'desc')  // Recent settlements first
                .limit(queryLimit);

            const snapshot = await settledOrdersQuery.get();
            totalReads = snapshot.size;

            console.log(`[PmtMgmt] Settled orders snapshot size: ${snapshot.size}`);

            if (snapshot.size === 0) {
                console.log('[PmtMgmt] ℹ️ No settled consignment orders found');
                
                pmtMgmtTeamGridApi.setGridOption('rowData', []);
                pmtMgmtTeamGridApi.setGridOption('loading', false);
                
                setTimeout(() => {
                    showModal('info', 'No Settled Orders Found',
                        `No fully settled consignment orders found.\n\n` +
                        `This could mean:\n` +
                        `• Teams are still working on settlements\n` +
                        `• Orders are still in progress\n` +
                        `• No teams have completed full settlements yet\n\n` +
                        `Check Outstanding tab for active settlement work.`
                    );
                }, 500);
                
                // ✅ STILL ADD: Freshness indicator
                setTimeout(() => {
                    addDataFreshnessIndicator('pmt-mgmt-team-grid', new Date().toLocaleTimeString(), cacheMinutes);
                }, 600);
                
                return { orderData: [], metadata: { totalReads, mode: focusMode, cacheMinutes } };
            }

            // ✅ PROCESS: Settled orders (no async operations needed, simpler processing)
            orderData = snapshot.docs.map((doc, index) => {
                const data = doc.data();
                
                console.log(`[PmtMgmt] 🔍 Processing settled order ${index + 1}/${snapshot.size}: ${data.teamName}`);
                
                // ✅ PROCESS: Date conversion for settled orders
                let processedRequestDate = null;
                let processedCheckoutDate = null;
                
                try {
                    if (data.requestDate?.toDate && typeof data.requestDate.toDate === 'function') {
                        processedRequestDate = data.requestDate.toDate();
                    } else if (data.requestDate instanceof Date) {
                        processedRequestDate = data.requestDate;
                    } else {
                        processedRequestDate = new Date(data.requestDate || Date.now());
                    }
                    
                    if (data.checkoutDate?.toDate && typeof data.checkoutDate.toDate === 'function') {
                        processedCheckoutDate = data.checkoutDate.toDate();
                    } else if (data.checkoutDate instanceof Date) {
                        processedCheckoutDate = data.checkoutDate;
                    } else {
                        processedCheckoutDate = new Date(data.checkoutDate || Date.now());
                    }
                    
                } catch (dateError) {
                    console.warn(`[PmtMgmt] Date processing error for settled order ${doc.id}:`, dateError);
                    processedRequestDate = new Date();
                    processedCheckoutDate = new Date();
                }
                
                return {
                    id: doc.id,
                    ...data,
                    
                    // ✅ PROCESSED: Dates
                    requestDate: processedRequestDate,
                    checkoutDate: processedCheckoutDate,
                    
                    // ✅ SUCCESS CONTEXT
                    teamName: data.teamName || 'Unknown Team',
                    teamLeadName: data.requestingMemberName || 'Unknown Lead',
                    consignmentId: data.consignmentId || doc.id,
                    settlementSuccess: 'Fully Settled',
                    
                    // ✅ SUCCESS METRICS
                    formattedTotalSold: formatCurrency(data.totalValueSold || 0),
                    formattedTotalPaid: formatCurrency(data.totalAmountPaid || 0),
                    
                    // ✅ NO PENDING PAYMENTS: Settled orders don't need verification checks
                    hasPendingPayments: false,
                    pendingPaymentsCount: 0,
                    
                    // ✅ SETTLEMENT ANALYSIS
                    settlementEfficiency: calculateSettlementEfficiency(data.checkoutDate, data.financials?.lastPaymentDate || data.checkoutDate),
                    wasSuccessful: true
                };
            });

            console.log(`[PmtMgmt] ✅ Settled orders processed: ${orderData.length} successful settlements`);
        }

        // ===================================================================
        // FINAL VALIDATION OF PROCESSED DATA
        // ===================================================================
        
        if (orderData.length > 0) {
            console.log(`[PmtMgmt] 🔍 FINAL DATA VALIDATION:`);
            const firstOrder = orderData[0];
            console.log(`  First order requestDate type:`, typeof firstOrder.requestDate);
            console.log(`  First order requestDate instanceof Date:`, firstOrder.requestDate instanceof Date);
            console.log(`  First order can format date:`, firstOrder.requestDate instanceof Date ? firstOrder.requestDate.toLocaleDateString() : 'Cannot format');
            console.log(`  First order pending payments:`, firstOrder.pendingPaymentsCount || 0);
        }

        // ===================================================================
        // UPDATE UI WITH PROCESSED DATA AND FRESHNESS INDICATORS
        // ===================================================================
        
        pmtMgmtTeamGridApi.setGridOption('rowData', orderData);
        pmtMgmtTeamGridApi.setGridOption('loading', false);

        // ✅ BALANCED: Cache with comprehensive metadata
        if (useCache && totalReads > 0) {
            const cacheData = {
                orderData: orderData,
                metadata: {
                    mode: focusMode,
                    totalRecords: orderData.length,
                    totalReads: totalReads,
                    loadedAt: new Date().toLocaleTimeString(),
                    cacheExpiresAt: new Date(Date.now() + cacheMinutes * 60 * 1000).toLocaleTimeString(),
                    cacheMinutes: cacheMinutes,
                    businessContext: focusMode === 'outstanding' ? 'Team Settlement Management' : 'Settlement Success Tracking'
                }
            };
            
            cachePaymentMetrics(cacheKey, cacheData);
            console.log(`[PmtMgmt] ✅ Cached ${focusMode} team data for ${cacheMinutes} minutes`);
        }

        // ✅ SUMMARY: Business intelligence reporting
        updateTeamOrdersSummary({
            mode: focusMode,
            totalRecords: orderData.length,
            totalReads: totalReads,
            loadedAt: new Date().toLocaleTimeString(),
            cacheMinutes: cacheMinutes
        }, orderData, focusMode);

        // ✅ BALANCED: ALWAYS add freshness indicator (with delay for grid stability)
        setTimeout(() => {
            addDataFreshnessIndicator('pmt-mgmt-team-grid', new Date().toLocaleTimeString(), cacheMinutes);
            console.log(`[PmtMgmt] ✅ Team freshness indicator added for ${focusMode} data`);
        }, 500);

        // Auto-fit columns after data and indicator are ready
        /*setTimeout(() => {
            if (pmtMgmtTeamGridApi) {
                pmtMgmtTeamGridApi.sizeColumnsToFit();
                console.log(`[PmtMgmt] ✅ Team columns auto-fitted for ${focusMode} mode`);
            }
        }, 700);*/

        console.log(`[PmtMgmt] ✅ Team ${focusMode} orders loaded with verification status: ${orderData.length} records (${totalReads} reads)`);

        return { 
            orderData: orderData, 
            metadata: { 
                mode: focusMode, 
                totalReads, 
                cacheMinutes,
                processedRecords: orderData.length,
                dataProcessingComplete: true,
                includesPendingPaymentStatus: focusMode === 'outstanding'
            } 
        };

    } catch (error) {
        console.error(`[PmtMgmt] ❌ Error loading team ${focusMode} orders:`, error);
        
        if (pmtMgmtTeamGridApi) {
            pmtMgmtTeamGridApi.setGridOption('loading', false);
            pmtMgmtTeamGridApi.showNoRowsOverlay();
        }
        
        showModal('error', `Team ${focusMode === 'outstanding' ? 'Settlement' : 'History'} Loading Failed`,
            `Could not load ${focusMode} consignment orders.\n\n` +
            `Error: ${error.message}\n\n` +
            `Collection: ${CONSIGNMENT_ORDERS_COLLECTION_PATH}\n\n` +
            `Please use the refresh button to try again.`
        );
        
        return { orderData: [], metadata: { totalReads: 0, mode: focusMode, error: error.message } };
    }
}

// ===================================================================
// HELPER FUNCTIONS FOR TEAM PAYMENT BUSINESS INTELLIGENCE
// ===================================================================


/**
 * CORRECTED: Update to focus on consignment orders (renamed function)
 */
function updateTeamOrdersSummary(metadata, orderData, focusMode) {
    console.log(`[PmtMgmt] 👥 TEAM ${focusMode.toUpperCase()} ORDERS SUMMARY (Balanced Cache):`);
    console.log(`  ⏰ Data loaded at: ${metadata.loadedAt || 'Unknown'}`);
    console.log(`  💾 Cache duration: ${metadata.cacheMinutes || 3} minutes`);
    
    if (focusMode === 'outstanding' && orderData.length > 0) {
        // Settlement management intelligence
        const totalOutstandingBalance = orderData.reduce((sum, order) => sum + (order.balanceDue || 0), 0);
        const totalValueSold = orderData.reduce((sum, order) => sum + (order.totalValueSold || 0), 0);
        const urgentCount = orderData.filter(order => order.settlementPriority === 'critical' || order.settlementPriority === 'high').length;
        const overdueCount = orderData.filter(order => order.isOverdue).length;
        const uniqueTeams = new Set(orderData.map(order => order.teamName)).size;
        
        // ✅ VERIFICATION INTELLIGENCE: Count orders with pending payments
        const ordersWithPendingPayments = orderData.filter(order => order.hasPendingPayments).length;
        const totalPendingVerificationAmount = orderData.reduce((sum, order) => sum + (order.pendingPaymentsAmount || 0), 0);
        const totalPendingPaymentsCount = orderData.reduce((sum, order) => sum + (order.pendingPaymentsCount || 0), 0);
        
        console.log(`  💰 Total Outstanding Settlements: ${formatCurrency(totalOutstandingBalance)}`);
        console.log(`  📈 Total Value Sold by Teams: ${formatCurrency(totalValueSold)}`);
        console.log(`  ⚠️ Urgent Settlements: ${urgentCount} orders`);
        console.log(`  🚨 Overdue Settlements: ${overdueCount} orders`);
        console.log(`  👥 Teams with Outstanding: ${uniqueTeams} teams`);
        
        console.log(`  🔍 VERIFICATION INTELLIGENCE:`);
        console.log(`    ✅ Orders with Pending Payments: ${ordersWithPendingPayments}`);
        console.log(`    💰 Total Pending Verification Amount: ${formatCurrency(totalPendingVerificationAmount)}`);
        console.log(`    📊 Total Pending Payment Count: ${totalPendingPaymentsCount}`);
        
    } else if (focusMode === 'settled' && orderData.length > 0) {
        // Settlement success analysis
        const totalSettledValue = orderData.reduce((sum, order) => sum + (order.totalValueSold || 0), 0);
        const totalSettlementPayments = orderData.reduce((sum, order) => sum + (order.totalAmountPaid || 0), 0);
        const uniqueSettledTeams = new Set(orderData.map(order => order.teamName)).size;
        
        console.log(`  ✅ Total Settled Value: ${formatCurrency(totalSettledValue)}`);
        console.log(`  💰 Total Settlement Payments: ${formatCurrency(totalSettlementPayments)}`);
        console.log(`  👥 Teams with Settled Orders: ${uniqueSettledTeams}`);
        console.log(`  🎯 Settlement Success Rate: 100% (all selected orders fully settled)`);
    }
    
    console.log(`  📊 Total Orders: ${orderData.length}`);
    console.log(`  🔥 Firestore Reads: ${metadata.totalReads || 0}`);
    console.log(`  ⚡ Cache Strategy: Balanced (${metadata.cacheMinutes || 3}min cache)`);
}


/**
 * HELPER: Calculate settlement priority for consignment orders
 */
function calculateSettlementPriority(balanceAmount, daysOutstanding) {
    if (balanceAmount > 20000 && daysOutstanding > 90) return 'critical';
    if (balanceAmount > 10000 || daysOutstanding > 75) return 'high';
    if (balanceAmount > 5000 || daysOutstanding > 60) return 'medium';
    return 'low';
}

/**
 * HELPER: Calculate settlement efficiency for completed settlements
 */
function calculateSettlementEfficiency(checkoutDate, lastPaymentDate) {
    if (!checkoutDate || !lastPaymentDate) return 'Unknown';
    
    try {
        const checkout = checkoutDate.toDate ? checkoutDate.toDate() : new Date(checkoutDate);
        const payment = lastPaymentDate.toDate ? lastPaymentDate.toDate() : new Date(lastPaymentDate);
        
        const diffTime = payment - checkout;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const days = Math.max(0, diffDays);
        
        if (days <= 7) return 'Excellent (Within Week)';
        if (days <= 30) return 'Good (Within Month)';
        if (days <= 60) return 'Fair (Within 2 Months)';
        return 'Slow (Over 2 Months)';
    } catch (error) {
        return 'Unknown';
    }
}

/**
 * BUSINESS LOGIC: Calculate team verification priority
 */
function calculateTeamVerificationPriority(paymentAmount, daysWaiting) {
    if (paymentAmount > 15000 && daysWaiting > 7) return 'critical';
    if (paymentAmount > 8000 || daysWaiting > 5) return 'high';
    if (paymentAmount > 3000 || daysWaiting > 2) return 'medium';
    return 'low';
}

/**
 * HELPER: Calculate verification processing efficiency
 */
function calculateVerificationEfficiency(submittedDate, verifiedDate) {
    if (!submittedDate || !verifiedDate) return 'Unknown';
    
    try {
        const submitted = submittedDate.toDate ? submittedDate.toDate() : new Date(submittedDate);
        const verified = verifiedDate.toDate ? verifiedDate.toDate() : new Date(verifiedDate);
        
        const diffTime = verified - submitted;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const days = Math.max(0, diffDays);
        
        if (days === 0) return 'Same Day';
        if (days === 1) return 'Next Day';
        if (days <= 3) return 'Fast Processing';
        if (days <= 7) return 'Standard Processing';
        return 'Slow Processing';
    } catch (error) {
        return 'Unknown';
    }
}

/**
 * ENHANCED: Team payments summary with balanced approach context
 */
function updateTeamPaymentsSummary(metadata, teamData, focusMode) {
    console.log(`[PmtMgmt] 👥 TEAM ${focusMode.toUpperCase()} SUMMARY (Balanced Cache):`);
    console.log(`  ⏰ Data loaded at: ${metadata.loadedAt || 'Unknown'}`);
    
    // ✅ CORRECTED: Access cache config properly
    const cacheMinutes = focusMode === 'outstanding' ? 
        (BALANCED_CACHE_CONFIG?.teamPayments || 3) : 
        (BALANCED_CACHE_CONFIG?.teamPayments || 3);
    console.log(`  💾 Cache duration: ${cacheMinutes} minutes`);
    
    if (focusMode === 'outstanding' && teamData.length > 0) {
        // Verification workflow intelligence
        const totalPendingAmount = teamData.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
        const totalDonations = teamData.reduce((sum, payment) => sum + (payment.donationAmount || 0), 0);
        const urgentCount = teamData.filter(payment => payment.isUrgent).length;
        const uniqueTeams = new Set(teamData.map(payment => payment.teamName)).size;
        
        // Team breakdown for pending payments
        const teamBreakdown = {};
        teamData.forEach(payment => {
            const teamName = payment.teamName || 'Unknown Team';
            if (!teamBreakdown[teamName]) {
                teamBreakdown[teamName] = { 
                    count: 0, 
                    amount: 0, 
                    donations: 0, 
                    avgDaysWaiting: 0, 
                    totalDaysWaiting: 0,
                    maxDaysWaiting: 0
                };
            }
            teamBreakdown[teamName].count += 1;
            teamBreakdown[teamName].amount += (payment.amountPaid || 0);
            teamBreakdown[teamName].donations += (payment.donationAmount || 0);
            teamBreakdown[teamName].totalDaysWaiting += (payment.daysWaiting || 0);
            teamBreakdown[teamName].maxDaysWaiting = Math.max(teamBreakdown[teamName].maxDaysWaiting, payment.daysWaiting || 0);
        });
        
        // Calculate team averages
        Object.values(teamBreakdown).forEach(team => {
            if (team.count > 0) {
                team.avgDaysWaiting = team.totalDaysWaiting / team.count;
            }
        });
        
        console.log(`  💰 Total Pending Amount: ${formatCurrency(totalPendingAmount)}`);
        console.log(`  🎁 Total Donations: ${formatCurrency(totalDonations)}`);
        console.log(`  ⚠️ Urgent Verifications: ${urgentCount} payments`);
        console.log(`  👥 Teams with Pending Payments: ${uniqueTeams} teams`);
        
        console.log(`  🏆 TEAM BREAKDOWN:`);
        Object.entries(teamBreakdown).forEach(([teamName, data]) => {
            const urgencyIndicator = data.maxDaysWaiting > 7 ? '🚨' : data.maxDaysWaiting > 3 ? '⚠️' : '✅';
            console.log(`    ${urgencyIndicator} ${teamName}: ${data.count} payment${data.count > 1 ? 's' : ''} (${formatCurrency(data.amount)}${data.donations > 0 ? ` + ${formatCurrency(data.donations)} donations` : ''})`);
            console.log(`       Avg waiting: ${data.avgDaysWaiting.toFixed(1)} days, Max waiting: ${data.maxDaysWaiting} days`);
        });
        
    } else if (focusMode === 'verified' && teamData.length > 0) {
        // Team verification success analysis
        const totalVerifiedAmount = teamData.reduce((sum, payment) => sum + (payment.amountPaid || 0), 0);
        const totalTeamDonations = teamData.reduce((sum, payment) => sum + (payment.donationAmount || 0), 0);
        const uniqueVerifiedTeams = new Set(teamData.map(payment => payment.teamName)).size;
        const uniqueVerifiers = new Set(teamData.map(payment => payment.verifiedBy)).size;
        
        // Verification efficiency analysis
        const verificationEfficiencies = teamData
            .map(payment => payment.verificationEfficiency)
            .filter(eff => eff && eff !== 'Unknown');
        
        const fastVerifications = verificationEfficiencies.filter(eff => 
            eff.includes('Same Day') || eff.includes('Next Day')
        ).length;
        
        // Team success breakdown
        const teamSuccessBreakdown = {};
        teamData.forEach(payment => {
            const teamName = payment.teamName || 'Unknown Team';
            if (!teamSuccessBreakdown[teamName]) {
                teamSuccessBreakdown[teamName] = { 
                    count: 0, 
                    amount: 0, 
                    donations: 0,
                    fastVerifications: 0
                };
            }
            teamSuccessBreakdown[teamName].count += 1;
            teamSuccessBreakdown[teamName].amount += (payment.amountPaid || 0);
            teamSuccessBreakdown[teamName].donations += (payment.donationAmount || 0);
            
            if (payment.verificationEfficiency && 
                (payment.verificationEfficiency.includes('Same Day') || payment.verificationEfficiency.includes('Next Day'))) {
                teamSuccessBreakdown[teamName].fastVerifications += 1;
            }
        });
        
        console.log(`  ✅ Total Verified Amount: ${formatCurrency(totalVerifiedAmount)}`);
        console.log(`  🎁 Total Team Donations: ${formatCurrency(totalTeamDonations)}`);
        console.log(`  👥 Teams with Verified Payments: ${uniqueVerifiedTeams}`);
        console.log(`  👤 Unique Verifiers: ${uniqueVerifiers} admin${uniqueVerifiers > 1 ? 's' : ''}`);
        console.log(`  ⚡ Fast Verifications: ${fastVerifications}/${verificationEfficiencies.length} (${verificationEfficiencies.length > 0 ? ((fastVerifications / verificationEfficiencies.length) * 100).toFixed(1) : 0}%)`);
        
        console.log(`  🏆 TEAM SUCCESS BREAKDOWN:`);
        Object.entries(teamSuccessBreakdown).forEach(([teamName, data]) => {
            const efficiencyRate = data.count > 0 ? (data.fastVerifications / data.count * 100).toFixed(0) : 0;
            console.log(`    ✅ ${teamName}: ${data.count} verified (${formatCurrency(data.amount)}${data.donations > 0 ? ` + ${formatCurrency(data.donations)} donations` : ''}, ${efficiencyRate}% fast processing)`);
        });
    }
    
    console.log(`  📊 Total Records: ${teamData.length}`);
    console.log(`  🔥 Firestore Reads: ${metadata.totalReads || 0}`);
    console.log(`  ⚡ Cache Strategy: Balanced (${cacheMinutes}min cache)`);
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
    console.log('[PmtMgmt] 💳 Initializing Sales Payments tab with COLLECTIONS-FOCUSED approach...');

    const gridContainer = document.getElementById('pmt-mgmt-sales-grid');
    if (!gridContainer) {
        console.error('[PmtMgmt] Sales payments grid container not found');
        return;
    }

    if (!pmtMgmtSalesGridApi) {
        pmtMgmtSalesGridApi = createGrid(gridContainer, pmtMgmtSalesGridOptions);
        console.log('[PmtMgmt] ✅ Sales invoices grid created');
    }

    // ✅ SET INITIAL FILTER STATE: Collections should be active
    setTimeout(() => {
        // Set Collections filter as active
        const collectionsFilter = document.getElementById('pmt-mgmt-sales-filter-outstanding');
        const paymentsFilter = document.getElementById('pmt-mgmt-sales-filter-paid');
        
        if (collectionsFilter && paymentsFilter) {
            // Remove active from payments filter
            paymentsFilter.classList.remove('active', 'bg-blue-100', 'text-blue-800', 'border-blue-300', 'font-semibold');
            paymentsFilter.classList.add('bg-white', 'border-gray-300');
            
            // Add active to collections filter  
            collectionsFilter.classList.add('active', 'bg-blue-100', 'text-blue-800', 'border-blue-300', 'font-semibold');
            collectionsFilter.classList.remove('bg-white', 'border-gray-300');
            
            console.log('[PmtMgmt] ✅ Set Collections filter as active by default');
        }
        
        // Load outstanding invoices (matches the active filter)
        loadSalesPaymentsForMgmtTab('outstanding');
        
    }, 300); // Slight delay to ensure DOM is ready

    setupSalesPaymentFilters();
}

/**
 * ENHANCED: Load sales invoices with balanced caching and freshness indicators
 * 
 * @param {string} [focusMode='outstanding'] - 'outstanding' or 'paid'
 * @param {Object} [options={}] - Configuration options
 */
async function loadSalesPaymentsForMgmtTab(focusMode = 'outstanding', options = {}) {
    const { useCache = true, queryLimit = 50, forceRefresh = false } = options;
    
    console.log(`[PmtMgmt] 💳 Loading ${focusMode} sales invoices with BALANCED caching...`);

    if (!pmtMgmtSalesGridApi) {
        console.error('[PmtMgmt] ❌ Sales grid API not available');
        return;
    }

    try {
        pmtMgmtSalesGridApi.setGridOption('loading', true);

        // ✅ BALANCED: Cache configuration by mode
        const cacheMinutes = focusMode === 'outstanding' ? 
            BALANCED_CACHE_CONFIG.salesOutstanding :    // 3 minutes for outstanding (collection-critical)
            BALANCED_CACHE_CONFIG.salesPaid;           // 8 minutes for paid (reference data)
        
        const cacheKey = `pmt_mgmt_sales_${focusMode}_balanced`;
        
        // ✅ BALANCED: Cache check with mode-appropriate duration
        if (useCache && !forceRefresh) {
            const cached = getCachedPaymentMetrics(cacheKey, cacheMinutes);
            if (cached && cached.salesData) {
                console.log(`[PmtMgmt] ✅ Using cached ${focusMode} sales data (${cacheMinutes}min cache) - 0 reads`);
                
                pmtMgmtSalesGridApi.setGridOption('rowData', cached.salesData);
                pmtMgmtSalesGridApi.setGridOption('loading', false);
                updateSalesDataSummary(cached.metadata, cached.salesData, focusMode);
                
                // ✅ BALANCED: Add freshness indicator for cached data
                setTimeout(() => {
                    addDataFreshnessIndicator('pmt-mgmt-sales-grid', cached.metadata.loadedAt || 'Cached', cacheMinutes);
                }, 300);
                
                return cached;
            }
        }

        console.log(`[PmtMgmt] 📊 Loading fresh ${focusMode} sales data (cache expired or forced refresh)...`);
        
        const db = firebase.firestore();
        let totalReads = 0;
        let salesData = [];

        if (focusMode === 'outstanding') {
            // ===================================================================
            // OUTSTANDING: Customer collection targets
            // ===================================================================
            console.log('[PmtMgmt] 📋 COLLECTION FOCUS: Loading outstanding sales invoices...');
            console.log('[PmtMgmt] Query collection:', SALES_COLLECTION_PATH);
            
            const outstandingQuery = db.collection(SALES_COLLECTION_PATH)
                .where('paymentStatus', 'in', ['Unpaid', 'Partially Paid'])
                .orderBy('saleDate', 'asc') // Oldest first for collection priority
                .limit(queryLimit);

            const snapshot = await outstandingQuery.get();
            totalReads = snapshot.size;

            console.log(`[PmtMgmt] Outstanding sales invoices snapshot size: ${snapshot.size}`);

            salesData = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // ✅ PROCESS: Date conversion for grid compatibility
                let processedSaleDate = null;
                try {
                    if (data.saleDate?.toDate && typeof data.saleDate.toDate === 'function') {
                        processedSaleDate = data.saleDate.toDate();
                    } else if (data.saleDate instanceof Date) {
                        processedSaleDate = data.saleDate;
                    } else {
                        processedSaleDate = new Date(data.saleDate || Date.now());
                    }
                } catch (dateError) {
                    console.warn(`[PmtMgmt] Date processing error for invoice ${doc.id}`);
                    processedSaleDate = new Date();
                }

                const daysOverdue = calculateDaysOverdue(processedSaleDate);
                
                return {
                    id: doc.id,
                    ...data,
                    
                    // ✅ PROCESSED: Date for grid compatibility
                    saleDate: processedSaleDate,
                    
                    // ✅ COLLECTION INTELLIGENCE
                    daysOverdue: daysOverdue,
                    isOverdue: daysOverdue > 30,
                    collectionUrgency: calculateCollectionUrgency(data.balanceDue || 0, daysOverdue),
                    
                    // ✅ CUSTOMER CONTEXT
                    customerName: data.customerInfo?.name || 'Unknown Customer',
                    customerEmail: data.customerInfo?.email || 'No Email',
                    customerPhone: data.customerInfo?.phone || 'No Phone',
                    
                    // ✅ BUSINESS CONTEXT
                    invoiceReference: data.saleId || doc.id,
                    manualVoucherNumber: data.manualVoucherNumber || 'No Voucher',
                    store: data.store || 'Unknown Store',
                    
                    // ✅ UI FORMATTING
                    formattedTotal: formatCurrency(data.financials?.totalAmount || 0),
                    formattedBalance: formatCurrency(data.balanceDue || 0),
                    formattedAmountPaid: formatCurrency(data.totalAmountPaid || 0),
                    
                    // ✅ ACTION CONTEXT
                    needsFollowUp: daysOverdue > 30 || (data.balanceDue || 0) > 5000,
                    contactMethod: data.customerInfo?.phone ? 'Phone' : 
                                 data.customerInfo?.email ? 'Email' : 'No Contact',
                    collectionPriority: calculateCollectionPriority(data.balanceDue || 0, daysOverdue)
                };
            });

            console.log(`[PmtMgmt] 📋 Outstanding processed: ${salesData.length} invoices for collection`);

        } else if (focusMode === 'paid') {
            // ===================================================================
            // PAID: Success analysis and reference data
            // ===================================================================
            console.log('[PmtMgmt] ✅ REFERENCE FOCUS: Loading paid sales invoices...');
            console.log('[PmtMgmt] Query collection:', SALES_COLLECTION_PATH);
            
            // ✅ DEBUG: First check if paid invoices exist
            const debugQuery = db.collection(SALES_COLLECTION_PATH).limit(5);
            const debugSnapshot = await debugQuery.get();
            
            console.log(`[PmtMgmt] 🔍 Sample sales invoices for status check:`, debugSnapshot.size);
            const statusBreakdown = {};
            debugSnapshot.docs.forEach(doc => {
                const status = doc.data().paymentStatus || 'Unknown';
                statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
            });
            console.log('[PmtMgmt] 🔍 Payment status breakdown:', statusBreakdown);
            
            const paidQuery = db.collection(SALES_COLLECTION_PATH)
                .where('paymentStatus', '==', 'Paid')
                .orderBy('saleDate', 'desc') // Recent successes first
                .limit(queryLimit);

            const snapshot = await paidQuery.get();
            totalReads = snapshot.size + debugSnapshot.size; // Include debug reads

            console.log(`[PmtMgmt] Paid sales invoices snapshot size: ${snapshot.size}`);

            if (snapshot.size === 0) {
                console.log('[PmtMgmt] ℹ️ No paid sales invoices found');
                
                // ✅ HELPFUL: Show status breakdown in no-data message
                pmtMgmtSalesGridApi.setGridOption('rowData', []);
                pmtMgmtSalesGridApi.setGridOption('loading', false);
                
                setTimeout(() => {
                    showModal('info', 'No Paid Invoices Available',
                        `No fully paid sales invoices found for reference.\n\n` +
                        `Current invoice status distribution:\n` +
                        `${Object.entries(statusBreakdown).map(([status, count]) => 
                            `• ${status}: ${count} invoice${count > 1 ? 's' : ''}`
                        ).join('\n')}\n\n` +
                        `To build payment history:\n` +
                        `1. Complete outstanding customer collections\n` +
                        `2. Process more direct sales transactions\n` +
                        `3. Use Outstanding tab for active collection targets`
                    );
                }, 500);
                
                return { salesData: [], metadata: { totalReads, mode: focusMode } };
            }

            salesData = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // ✅ PROCESS: Date conversion for paid invoices
                let processedSaleDate = null;
                try {
                    if (data.saleDate?.toDate && typeof data.saleDate.toDate === 'function') {
                        processedSaleDate = data.saleDate.toDate();
                    } else if (data.saleDate instanceof Date) {
                        processedSaleDate = data.saleDate;
                    } else {
                        processedSaleDate = new Date(data.saleDate || Date.now());
                    }
                } catch (dateError) {
                    console.warn(`[PmtMgmt] Date processing error for paid invoice ${doc.id}`);
                    processedSaleDate = new Date();
                }
                
                return {
                    id: doc.id,
                    ...data,
                    
                    // ✅ PROCESSED: Date for grid
                    saleDate: processedSaleDate,
                    
                    // ✅ SUCCESS CONTEXT
                    customerName: data.customerInfo?.name || 'Unknown Customer',
                    invoiceReference: data.saleId || doc.id,
                    store: data.store || 'Unknown Store',
                    
                    // ✅ SUCCESS METRICS
                    formattedTotal: formatCurrency(data.financials?.totalAmount || 0),
                    formattedAmountReceived: formatCurrency(data.totalAmountPaid || 0),
                    
                    // ✅ COLLECTION SUCCESS ANALYSIS
                    wasOverpayment: (data.totalAmountPaid || 0) > (data.financials?.totalAmount || 0),
                    donationGenerated: Math.max(0, (data.totalAmountPaid || 0) - (data.financials?.totalAmount || 0)),
                    collectionSuccess: 'Fully Collected',
                    
                    // ✅ EFFICIENCY METRICS
                    daysToCollection: calculateDaysToCollection(data.saleDate, data.financials?.lastPaymentDate),
                    collectionEfficiency: calculateCollectionEfficiency(data.saleDate, data.financials?.lastPaymentDate)
                };
            });

            console.log(`[PmtMgmt] ✅ Paid processed: ${salesData.length} successful collections`);
        }

        // ===================================================================
        // ✅ BALANCED: CACHE AND UPDATE UI WITH FRESHNESS
        // ===================================================================
        
        pmtMgmtSalesGridApi.setGridOption('rowData', salesData);
        pmtMgmtSalesGridApi.setGridOption('loading', false);

        // ✅ BALANCED: Cache with metadata
        if (useCache && totalReads > 0) {
            const cacheData = {
                salesData: salesData,
                metadata: {
                    mode: focusMode,
                    totalRecords: salesData.length,
                    totalReads: totalReads,
                    loadedAt: new Date().toLocaleTimeString(), // ✅ ADD: Timestamp
                    cacheExpiresAt: new Date(Date.now() + cacheMinutes * 60 * 1000).toLocaleTimeString(), // ✅ ADD: Expiry
                    businessContext: focusMode === 'outstanding' ? 'Customer Collection Management' : 'Payment Success Analysis'
                }
            };
            
            cachePaymentMetrics(cacheKey, cacheData);
            
            // ✅ BALANCED: Add freshness indicator for fresh data
            addDataFreshnessIndicator('pmt-mgmt-sales-grid', cacheData.metadata.loadedAt, cacheMinutes);
        }

        // ✅ SUMMARY: Business intelligence
        updateSalesDataSummary({
            mode: focusMode,
            totalRecords: salesData.length,
            totalReads: totalReads,
            loadedAt: new Date().toLocaleTimeString()
        }, salesData, focusMode);


        setTimeout(() => {
            addDataFreshnessIndicator('pmt-mgmt-sales-grid', new Date().toLocaleTimeString(), cacheMinutes);
            console.log(`[PmtMgmt] ✅ Freshness indicator added for fresh ${focusMode} data`);
        }, 500);


        // Auto-fit columns
        setTimeout(() => {
            if (pmtMgmtSalesGridApi) {
                pmtMgmtSalesGridApi.sizeColumnsToFit();
                console.log(`[PmtMgmt] ✅ Columns auto-fitted for ${focusMode} mode`);
            }
        }, 200);

        console.log(`[PmtMgmt] ✅ Sales ${focusMode} data loaded with ${cacheMinutes}-minute balanced cache: ${salesData.length} records (${totalReads} reads)`);

        return { salesData: salesData, metadata: { mode: focusMode, totalReads, cacheMinutes } };

    } catch (error) {
        console.error(`[PmtMgmt] ❌ Error loading sales ${focusMode} data:`, error);
        
        if (pmtMgmtSalesGridApi) {
            pmtMgmtSalesGridApi.setGridOption('loading', false);
            pmtMgmtSalesGridApi.showNoRowsOverlay();
        }
        
        showModal('error', `Sales ${focusMode === 'outstanding' ? 'Collections' : 'History'} Loading Failed`,
            `Could not load ${focusMode} sales invoices.\n\n` +
            `Error: ${error.message}\n\n` +
            `Please use the refresh button to try again.`
        );
    }
}

/**
 * HELPER: Calculate days to collection completion
 */
function calculateDaysToCollection(saleDate, lastPaymentDate) {
    if (!saleDate || !lastPaymentDate) return 0;
    
    try {
        const sale = saleDate.toDate ? saleDate.toDate() : new Date(saleDate);
        const payment = lastPaymentDate.toDate ? lastPaymentDate.toDate() : new Date(lastPaymentDate);
        
        const diffTime = payment - sale;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    } catch (error) {
        return 0;
    }
}




// ===================================================================
// HELPER FUNCTIONS FOR PAID MODE INTELLIGENCE
// ===================================================================

/**
 * ENHANCED: Update sales data summary with store grouping intelligence
 */
function updateSalesDataSummary(metadata, salesData, focusMode) {
    console.log(`[PmtMgmt] 💳 SALES ${focusMode.toUpperCase()} SUMMARY (Balanced Cache):`)
    console.log(`  ⏰ Data loaded at: ${metadata.loadedAt || 'Unknown'}`);
    console.log(`  💾 Cache duration: ${metadata.mode === 'outstanding' ? BALANCED_CACHE_CONFIG.salesOutstanding : BALANCED_CACHE_CONFIG.salesPaid} minutes`);
    
    if (focusMode === 'outstanding' && salesData.length > 0) {
        // Collection management intelligence
        const totalOutstanding = salesData.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
        const overdueCount = salesData.filter(inv => inv.isOverdue).length;
        const criticalCount = salesData.filter(inv => inv.collectionUrgency === 'critical').length;
        const highPriorityCount = salesData.filter(inv => inv.collectionPriority === 'high').length;
        
        // Store breakdown for outstanding collections
        const storeOutstanding = {};
        salesData.forEach(inv => {
            const store = inv.store || 'Unknown';
            if (!storeOutstanding[store]) {
                storeOutstanding[store] = { count: 0, amount: 0, overdueCount: 0 };
            }
            storeOutstanding[store].count += 1;
            storeOutstanding[store].amount += (inv.balanceDue || 0);
            if (inv.isOverdue) storeOutstanding[store].overdueCount += 1;
        });
        
        console.log(`  💰 Total Outstanding: ${formatCurrency(totalOutstanding)}`);
        console.log(`  ⚠️ Overdue Customers: ${overdueCount} invoices`);
        console.log(`  🚨 Critical Collections: ${criticalCount} customers`);
        console.log(`  📞 High Priority Follow-up: ${highPriorityCount} customers`);
        
        Object.entries(storeOutstanding).forEach(([store, data]) => {
            console.log(`  🏪 ${store}: ${data.count} outstanding (${formatCurrency(data.amount)}${data.overdueCount > 0 ? `, ${data.overdueCount} overdue` : ''})`);
        });
        
    } else if (focusMode === 'paid' && salesData.length > 0) {
        // Payment success analysis
        const totalRevenue = salesData.reduce((sum, inv) => sum + (inv.financials?.totalAmount || 0), 0);
        const totalCollected = salesData.reduce((sum, inv) => sum + (inv.totalAmountPaid || 0), 0);
        const totalDonations = salesData.reduce((sum, inv) => sum + (inv.donationGenerated || 0), 0);
        const averageCollection = salesData.length > 0 ? totalRevenue / salesData.length : 0;
        
        // Store success breakdown
        const storeSuccess = {};
        salesData.forEach(inv => {
            const store = inv.store || 'Unknown';
            if (!storeSuccess[store]) {
                storeSuccess[store] = { count: 0, revenue: 0, donations: 0 };
            }
            storeSuccess[store].count += 1;
            storeSuccess[store].revenue += (inv.financials?.totalAmount || 0);
            storeSuccess[store].donations += (inv.donationGenerated || 0);
        });
        
        console.log(`  ✅ Total Revenue (Paid): ${formatCurrency(totalRevenue)}`);
        console.log(`  💰 Total Collected: ${formatCurrency(totalCollected)}`);
        console.log(`  🎁 Total Donations: ${formatCurrency(totalDonations)}`);
        console.log(`  📊 Average Invoice: ${formatCurrency(averageCollection)}`);
        console.log(`  🎯 Collection Success: 100% (all selected invoices fully paid)`);
        
        Object.entries(storeSuccess).forEach(([store, data]) => {
            console.log(`  🏪 ${store}: ${data.count} paid (${formatCurrency(data.revenue)} revenue, ${formatCurrency(data.donations)} donations)`);
        });
    }
    
    console.log(`  📊 Total Records: ${salesData.length}`);
    console.log(`  🔥 Firestore Reads: ${metadata.totalReads || 0}`);
    console.log(`  ⚡ Cache Strategy: Balanced (${metadata.mode === 'outstanding' ? '3min' : '8min'} cache)`);
}


/**
 * HELPER: Process Firestore date to JavaScript Date
 */
function processFirestoreDate(firestoreDate) {
    if (!firestoreDate) return new Date();
    
    try {
        if (firestoreDate.toDate && typeof firestoreDate.toDate === 'function') {
            return firestoreDate.toDate();
        } else if (firestoreDate instanceof Date) {
            return firestoreDate;
        } else {
            return new Date(firestoreDate);
        }
    } catch (error) {
        return new Date();
    }
}

/**
 * BUSINESS INTELLIGENCE: Calculate store grouping insights
 */
function calculateStoreGroupingIntelligence(paidInvoices) {
    const storeGroups = {};
    
    paidInvoices.forEach(invoice => {
        const store = invoice.store || 'Unknown Store';
        
        if (!storeGroups[store]) {
            storeGroups[store] = {
                count: 0,
                totalRevenue: 0,
                totalDonations: 0,
                averageInvoice: 0,
                successRate: 100 // All paid invoices are 100% successful
            };
        }
        
        storeGroups[store].count += 1;
        storeGroups[store].totalRevenue += (invoice.financials?.totalAmount || 0);
        storeGroups[store].totalDonations += (invoice.donationAmount || 0);
    });
    
    // Calculate averages
    Object.values(storeGroups).forEach(group => {
        if (group.count > 0) {
            group.averageInvoice = group.totalRevenue / group.count;
        }
    });
    
    return storeGroups;
}

/**
 * HELPER: Calculate days from sale to full payment
 */
function calculateDaysToFullPayment(saleDate, lastPaymentDate) {
    if (!saleDate || !lastPaymentDate) return 0;
    
    try {
        const sale = processFirestoreDate(saleDate);
        const payment = processFirestoreDate(lastPaymentDate);
        
        const diffTime = payment - sale;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    } catch (error) {
        return 0;
    }
}

/**
 * HELPER: Calculate collection efficiency rating
 */
function calculateCollectionEfficiency(saleDate, lastPaymentDate) {
    const days = calculateDaysToFullPayment(saleDate, lastPaymentDate);
    
    if (days === 0) return 'Immediate';
    if (days <= 7) return 'Excellent';
    if (days <= 30) return 'Good';
    if (days <= 60) return 'Fair';
    return 'Slow';
}

/**
 * HELPER: Calculate collection priority
 */
function calculateCollectionPriority(balanceAmount, daysOverdue) {
    if (balanceAmount > 15000 && daysOverdue > 60) return 'critical';
    if (balanceAmount > 8000 || daysOverdue > 45) return 'high';
    if (balanceAmount > 3000 || daysOverdue > 30) return 'medium';
    return 'low';
}

/**
 * BUSINESS LOGIC: Calculate collection urgency for outstanding invoices
 */
function calculateCollectionUrgency(balanceAmount, daysOverdue) {
    if (balanceAmount > 15000 && daysOverdue > 60) return 'critical';
    if (balanceAmount > 8000 || daysOverdue > 45) return 'high';
    if (balanceAmount > 3000 || daysOverdue > 30) return 'medium';
    return 'low';
}

/**
 * HELPER: Calculate payment completion percentage
 */
function calculatePaymentCompletion(invoiceData) {
    const totalAmount = invoiceData.financials?.totalAmount || 0;
    const amountPaid = invoiceData.totalAmountPaid || 0;
    
    if (totalAmount === 0) return 0;
    return Math.round((amountPaid / totalAmount) * 100);
}

/**
 * HELPER: Calculate payment collection efficiency
 */
function calculatePaymentEfficiency(invoiceData) {
    const saleDate = invoiceData.saleDate?.toDate ? invoiceData.saleDate.toDate() : new Date();
    const lastPaymentDate = invoiceData.financials?.lastPaymentDate?.toDate ? 
        invoiceData.financials.lastPaymentDate.toDate() : saleDate;
    
    const daysToCollection = Math.ceil((lastPaymentDate - saleDate) / (1000 * 60 * 60 * 24));
    
    if (daysToCollection === 0) return 'Immediate';
    if (daysToCollection <= 7) return 'Fast';
    if (daysToCollection <= 30) return 'Normal';
    return 'Slow';
}

/**
 * HELPER: Update sales invoices summary
 */
function updateSalesInvoicesSummary(metadata, invoices) {
    console.log(`[PmtMgmt] 💳 SALES INVOICES ${metadata.mode.toUpperCase()} SUMMARY:`);
    
    if (metadata.mode === 'outstanding' && invoices.length > 0) {
        // Collection management summary
        const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
        const overdueCount = invoices.filter(inv => inv.isOverdue).length;
        const criticalCount = invoices.filter(inv => inv.collectionUrgency === 'critical').length;
        const highPriorityCount = invoices.filter(inv => inv.collectionUrgency === 'high').length;
        
        console.log(`  💰 Total Outstanding: ${formatCurrency(totalOutstanding)}`);
        console.log(`  ⚠️ Overdue Invoices: ${overdueCount}`);
        console.log(`  🚨 Critical Collections: ${criticalCount}`);
        console.log(`  📞 High Priority Follow-up: ${highPriorityCount}`);
        
        // Store breakdown
        const storeBreakdown = {};
        invoices.forEach(inv => {
            const store = inv.store || 'Unknown';
            if (!storeBreakdown[store]) {
                storeBreakdown[store] = { count: 0, amount: 0 };
            }
            storeBreakdown[store].count += 1;
            storeBreakdown[store].amount += (inv.balanceDue || 0);
        });
        
        Object.entries(storeBreakdown).forEach(([store, data]) => {
            console.log(`  🏪 ${store}: ${data.count} invoices, ${formatCurrency(data.amount)} outstanding`);
        });
        
    } else if (metadata.mode === 'paid' && invoices.length > 0) {
        // Payment success summary
        const totalCollected = invoices.reduce((sum, inv) => sum + (inv.financials?.totalAmount || 0), 0);
        const averageCollection = invoices.length > 0 ? totalCollected / invoices.length : 0;
        
        console.log(`  ✅ Total Collected: ${formatCurrency(totalCollected)}`);
        console.log(`  📊 Average Invoice: ${formatCurrency(averageCollection)}`);
        console.log(`  🎯 Collection Success Rate: 100% (all paid invoices)`);
    }
    
    console.log(`  📋 Total Records: ${invoices.length}`);
    console.log(`  🔥 Firestore Reads: ${metadata.totalReads || 0}`);
}



/**
 * BUSINESS LOGIC: Calculate customer collection priority
 */
function calculateCustomerCollectionPriority(saleData, daysOverdue) {
    const balanceDue = saleData.balanceDue || 0;
    
    // Critical: High amount + very overdue
    if (balanceDue > 15000 && daysOverdue > 60) {
        return 'critical';
    }
    // High: Significant amount or very overdue
    else if (balanceDue > 8000 || daysOverdue > 45) {
        return 'high';  
    }
    // Medium: Moderate amount or overdue
    else if (balanceDue > 3000 || daysOverdue > 30) {
        return 'medium';
    }
    // Low: Recent or small amounts
    else {
        return 'low';
    }
}


/**
 * HELPER: Update sales payments summary with business context
 */
function updateSalesPaymentsSummary(metadata, salesData, focusMode) {
    console.log(`[PmtMgmt] 💳 SALES ${focusMode.toUpperCase()} SUMMARY:`);
    
    if (focusMode === 'outstanding' && salesData.length > 0) {
        // Collection management intelligence
        const totalOutstanding = salesData.reduce((sum, sale) => sum + (sale.balanceDue || 0), 0);
        const overdueCount = salesData.filter(sale => sale.isOverdue).length;
        const criticalCount = salesData.filter(sale => sale.collectionPriority === 'critical').length;
        const highPriorityCount = salesData.filter(sale => sale.collectionPriority === 'high').length;
        
        // Store breakdown
        const churchStoreOutstanding = salesData.filter(s => s.store === 'Church Store')
            .reduce((sum, s) => sum + (s.balanceDue || 0), 0);
        const tastyTreatsOutstanding = salesData.filter(s => s.store === 'Tasty Treats')
            .reduce((sum, s) => sum + (s.balanceDue || 0), 0);
        
        console.log(`  💰 Total Outstanding: ${formatCurrency(totalOutstanding)}`);
        console.log(`  🏛️ Church Store Outstanding: ${formatCurrency(churchStoreOutstanding)}`);
        console.log(`  🍰 Tasty Treats Outstanding: ${formatCurrency(tastyTreatsOutstanding)}`);
        console.log(`  ⚠️ Overdue Customers: ${overdueCount} invoices`);
        console.log(`  🚨 Critical Collections: ${criticalCount} customers`);
        console.log(`  📞 High Priority Follow-up: ${highPriorityCount} customers`);
        
    } else if (focusMode === 'payments' && salesData.length > 0) {
        // Payment audit intelligence
        const totalAmount = salesData.reduce((sum, payment) => sum + Math.abs(payment.amountPaid || 0), 0);
        const verifiedCount = salesData.filter(p => (p.status || p.paymentStatus) === 'Verified').length;
        const voidedCount = salesData.filter(p => (p.status || p.paymentStatus) === 'Voided').length;
        
        console.log(`  💳 Total Payment Amount: ${formatCurrency(totalAmount)}`);
        console.log(`  ✅ Verified Payments: ${verifiedCount}`);
        console.log(`  ❌ Voided Payments: ${voidedCount}`);
    }
    
    console.log(`  📊 Records Loaded: ${salesData.length}`);
    console.log(`  🔥 Firestore Reads: ${metadata.totalReads || 0}`);
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
            console.log(`[PmtMgmt] Manual supplier refresh using existing refreshSpecificGrid`);
            refreshSpecificGrid('pmt-mgmt-supplier-grid', 'supplier'); 
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
    console.log('[PmtMgmt] Setting up OUTSTANDING vs VERIFIED team payment filters...');
    
    // ✅ OUTSTANDING FILTER: Pending verification focus
    const outstandingFilter = document.getElementById('pmt-mgmt-team-filter-outstanding');
    if (outstandingFilter) {
        outstandingFilter.addEventListener('click', () => {
            console.log('[PmtMgmt] ⏳ Outstanding team payments filter clicked');
            updateTeamFilterActiveState(outstandingFilter);
            loadTeamPaymentsForMgmtTab('outstanding');
        });
        console.log('[PmtMgmt] ✅ Outstanding team filter listener added');
    } else {
        console.error('[PmtMgmt] ❌ Outstanding team filter not found');
    }
    
    // ✅ VERIFIED FILTER: Reference and success tracking
    const verifiedFilter = document.getElementById('pmt-mgmt-team-filter-verified');
    if (verifiedFilter) {
        verifiedFilter.addEventListener('click', () => {
            console.log('[PmtMgmt] ✅ Verified team payments filter clicked');
            updateTeamFilterActiveState(verifiedFilter);
            loadTeamPaymentsForMgmtTab('verified');
        });
        console.log('[PmtMgmt] ✅ Verified team filter listener added');
    } else {
        console.error('[PmtMgmt] ❌ Verified team filter not found');
    }

    // Team name filter dropdown
    const teamFilter = document.getElementById('pmt-mgmt-team-name-filter');
    if (teamFilter) {
        // Populate with team names from masterData
        teamFilter.innerHTML = '<option value="">All Teams</option>';
        if (masterData.teams && masterData.teams.length > 0) {
            masterData.teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.teamName;
                option.textContent = team.teamName;
                teamFilter.appendChild(option);
            });
            console.log(`[PmtMgmt] ✅ Team filter populated with ${masterData.teams.length} teams`);
        }

        teamFilter.addEventListener('change', (e) => {
            console.log('[PmtMgmt] Team name filter changed:', e.target.value);
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

    // Search functionality
    const searchInput = document.getElementById('pmt-mgmt-team-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (pmtMgmtTeamGridApi) {
                pmtMgmtTeamGridApi.setQuickFilter(e.target.value);
            }
        });
    }

    // ✅ REFRESH BUTTON: Use existing refreshSpecificGrid function
    const refreshButton = document.getElementById('pmt-mgmt-team-refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            console.log(`[PmtMgmt] Manual team refresh using refreshSpecificGrid`);
            refreshSpecificGrid('pmt-mgmt-team-grid', 'team');
        });
    }

    console.log('[PmtMgmt] ✅ Team payment filters setup with Outstanding/Verified focus');
}

/**
 * HELPER: Get current team filter mode
 */
function getCurrentTeamFilterMode() {
    const outstandingFilter = document.getElementById('pmt-mgmt-team-filter-outstanding');
    const verifiedFilter = document.getElementById('pmt-mgmt-team-filter-verified');
    
    console.log('[PmtMgmt] 🔍 Checking current team filter mode:');
    console.log('  Outstanding active:', outstandingFilter?.classList.contains('active'));
    console.log('  Verified active:', verifiedFilter?.classList.contains('active'));
    
    if (verifiedFilter?.classList.contains('active')) {
        return 'verified';
    } else {
        return 'outstanding'; // Default
    }
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
    console.log('[PmtMgmt] 🎨 Updating team filter state for button:', activeButton.id);
    
    // Remove active from all team filters
    document.querySelectorAll('.pmt-mgmt-team-filter').forEach(btn => {
        btn.classList.remove('active', 'bg-yellow-100', 'text-yellow-800', 'border-yellow-300', 'bg-green-100', 'text-green-800', 'border-green-300', 'font-semibold');
        btn.classList.add('bg-white', 'border-gray-300');
    });
    
    // Add active state to clicked button
    activeButton.classList.remove('bg-white', 'border-gray-300');
    activeButton.classList.add('active', 'font-semibold');
    
    if (activeButton.id.includes('outstanding')) {
        activeButton.classList.add('bg-yellow-100', 'text-yellow-800', 'border-yellow-300');
    } else {
        activeButton.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
    }
    
    console.log('[PmtMgmt] ✅ Team filter state updated');
}



/**
 * Sets up filter listeners for sales payments tab
 */
function setupSalesPaymentFilters() {
    console.log('[PmtMgmt] Setting up OUTSTANDING vs PAID sales filters...');
    
    // Outstanding filter
    const outstandingFilter = document.getElementById('pmt-mgmt-sales-filter-outstanding');
    if (outstandingFilter) {
        outstandingFilter.addEventListener('click', () => {
            console.log('[PmtMgmt] 📋 Outstanding filter clicked');
            
            updateSalesFilterActiveState(outstandingFilter); // ✅ Update state FIRST
            loadSalesPaymentsForMgmtTab('outstanding');        // ✅ Then load data
        });
    }
    
    // Paid filter  
    const paidFilter = document.getElementById('pmt-mgmt-sales-filter-paid');
    if (paidFilter) {
        paidFilter.addEventListener('click', () => {
            console.log('[PmtMgmt] ✅ Paid filter clicked');
            
            updateSalesFilterActiveState(paidFilter);    // ✅ Update state FIRST
            loadSalesPaymentsForMgmtTab('paid');          // ✅ Then load paid data
        });
    }


    // Search functionality (works for both modes)
    const searchInput = document.getElementById('pmt-mgmt-sales-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (pmtMgmtSalesGridApi) {
                pmtMgmtSalesGridApi.setQuickFilter(e.target.value);
            }
        });
    }

    // Store filter (works for both modes)
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

    // Refresh button with current mode detection
    const refreshButton = document.getElementById('pmt-mgmt-sales-refresh');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            console.log(`[PmtMgmt] Manual sales refresh using existing refreshSpecificGrid`);
            refreshSpecificGrid('pmt-mgmt-sales-grid', 'sales'); // ✅ Use your existing function
        });
    }

    console.log('[PmtMgmt] ✅ Outstanding vs Paid filters setup completed');
}



/**
 * HELPER: Determine current sales filter mode
 */
function getCurrentSalesFilterMode() {
    const outstandingFilter = document.getElementById('pmt-mgmt-sales-filter-outstanding');
    const paymentsFilter = document.getElementById('pmt-mgmt-sales-filter-paid'); // Your actual HTML ID
    
    console.log('[PmtMgmt] 🔍 Detecting current sales filter mode:');
    console.log('  Outstanding element found:', !!outstandingFilter);
    console.log('  Outstanding active:', outstandingFilter?.classList.contains('active'));
    console.log('  Payments element found:', !!paymentsFilter);
    console.log('  Payments active:', paymentsFilter?.classList.contains('active'));
    
    // ✅ CORRECTED: Check if "Paid" filter (pmt-mgmt-sales-filter-paid) is active
    if (paymentsFilter?.classList.contains('active')) {
        console.log('[PmtMgmt] ✅ Detected Paid mode (payments filter active)');
        return 'paid'; // ✅ Maps to 'paid' mode in your loadSalesPaymentsForMgmtTab function
    } else {
        console.log('[PmtMgmt] ✅ Detected Outstanding mode (default)');
        return 'outstanding'; // Default
    }
}

/**
 * HELPER: Update active filter button state
 */
function updateSalesFilterActiveState(activeButton) {
    console.log('[PmtMgmt] 🎨 Updating sales filter state for button:', activeButton.id);
    
    // Remove active from ALL sales filters
    document.querySelectorAll('.pmt-mgmt-sales-filter').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-100', 'text-blue-800', 'border-blue-300', 'bg-red-100', 'text-red-800', 'border-red-300', 'bg-green-100', 'text-green-800', 'border-green-300', 'font-semibold');
        btn.classList.add('bg-white', 'border-gray-300');
        console.log(`[PmtMgmt]   Removed active from: ${btn.id}`);
    });
    
    // Add active to clicked button with appropriate colors
    activeButton.classList.remove('bg-white', 'border-gray-300');
    activeButton.classList.add('active', 'font-semibold');
    
    if (activeButton.id.includes('outstanding')) {
        activeButton.classList.add('bg-red-100', 'text-red-800', 'border-red-300');
        console.log('[PmtMgmt] ✅ Set Outstanding filter as active');
    } else {
        activeButton.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
        console.log('[PmtMgmt] ✅ Set Paid filter as active');
    }
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
export async function showSupplierInvoicePaymentVerificationModal(supplierInvoiceId) {
    console.log(`[PmtMgmt] Opening payment verification modal for invoice: ${supplierInvoiceId}`);


    // ✅ VALIDATION: Check if invoice ID is valid
    if (!supplierInvoiceId || typeof supplierInvoiceId !== 'string') {
        await showModal('error', 'Invalid Invoice ID', 
            'The invoice ID is missing or invalid. Please select an invoice from the grid and try again.');
        return;
    }


    const modal = document.getElementById('pmt-mgmt-verify-invoice-payments-modal');
    if (!modal) {
        console.error('[PmtMgmt] Verification modal not found');
        return;
    }

    try {
        ProgressToast.show('Loading Pending Payments', 'info');

        console.log('[payment-management.js] showSupplierInvoicePaymentVerificationModal supplierInvoiceId:', supplierInvoiceId);
        // Get invoice and pending payments data
        const [invoiceData, pendingStatus] = await Promise.all([
            //getInvoiceDataById(supplierInvoiceId),
            getPurchaseInvoiceById(supplierInvoiceId),
            checkForPendingPayments(supplierInvoiceId)
        ]);

        if (!invoiceData) {
            ProgressToast.hide(0);
            await showModal('error', 'Invoice Not Found',
                `Could not find invoice data for ID: ${supplierInvoiceId}\n\nPlease refresh the page and try again.`
            );
            return;
        }

        // Update modal header information
        document.getElementById('verify-invoice-number').textContent = 
            invoiceData.supplierInvoiceNo || supplierInvoiceId;
        document.getElementById('verify-supplier-name').textContent = 
            invoiceData.supplierName || 'Unknown Supplier';

        if (pendingStatus.hasPendingPayments === false || pendingStatus.totalPendingCount === 0) {
            ProgressToast.hide(0);

            await showModal('info', 'No Pending Payments',
                'This invoice has no payments pending verification.\n\n' +
                'All payments for this invoice are already in finalized state.'
            );
            return;
        }

        // Setup verification grid with pending payments
        console.log(`[PmtMgmt] Setting up verification grid: ${pendingStatus.totalPendingCount} payments`);
        
        setupPendingPaymentsVerificationGrid(pendingStatus.pendingPaymentsList);

        // Update modal subtitle with summary
        document.getElementById('verify-modal-subtitle').textContent = pendingStatus.summaryText;

        ProgressToast.showSuccess(`${pendingStatus.totalPendingCount} payments loaded for verification!`);

        setTimeout(() => {
            ProgressToast.hide(800);

            // Show modal
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('visible'), 10);

        }, 1200);

    } catch (error) {
        console.error('[PmtMgmt] Error showing verification modal:', error);

        ProgressToast.showError(`Failed to load payment verification modal: ${error.message}`);

        setTimeout(() => {
            showModal('error', 'Verification Modal Error', 
                'Could not load payment verification interface.\n\n' +
                `Error: ${error.message}`
            );
        }, 2000);
    }
}


/**
 * ENHANCED: Setup verification grid for pending payments
 */

function setupPendingPaymentsVerificationGrid(pendingPayments) {
    const gridContainer = document.getElementById('verify-pending-payments-grid');
    if (!gridContainer) return;

    console.log('[PmtMgmt] Setting up pending payments verification grid...',pendingPayments);

    const verificationGridOptions = {
        theme: 'legacy',
        rowHeight: 45,
        headerHeight: 60,
        
        // Enable tooltips globally
        tooltipShowDelay: 500, // Show tooltip after 500ms hover
        tooltipHideDelay: 2000, // Hide tooltip after 2 seconds of no hover
        
        columnDefs: [
            {
                headerName: "Payment Date",
                field: "submittedDate", 
                width: 120,
                floatingFilter: true,
                filter: 'agDateColumnFilter',
                valueFormatter: params => {
                    const date = params.value;
                    if (!date) return 'Unknown';
                    try {
                        return date.toDate ? 
                            date.toDate().toLocaleDateString() :
                            new Date(date).toLocaleDateString();
                    } catch {
                        return 'Invalid Date';
                    }
                },
                tooltipValueGetter: params => {
                    const date = params.value;
                    if (!date) return 'Unknown';
                    try {
                        return date.toDate ? 
                            date.toDate().toLocaleString() : // Full date+time in tooltip
                            new Date(date).toLocaleString();
                    } catch {
                        return 'Invalid Date';
                    }
                },
                headerClass: 'wrapped-header'
            },
            {
                headerName: "Submitted By",
                field: "submittedBy",
                flex: 1,
                floatingFilter: true,
                filter: 'agTextColumnFilter',
                cellStyle: { fontWeight: 'bold' },
                tooltipField: "submittedBy", // Show full name in tooltip
                headerClass: 'wrapped-header'
            },
            {
                headerName: "Amount",
                field: "paymentAmount",
                width: 120,
                floatingFilter: true,
                filter: 'agNumberColumnFilter',
                valueFormatter: params => formatCurrency(params.value || 0),
                cellClass: 'text-right font-semibold',
                cellStyle: { color: '#059669' },
                tooltipValueGetter: params => `Amount: ${formatCurrency(params.value || 0)}`,
                headerClass: 'wrapped-header'
            },
            {
                headerName: "Payment Mode",
                field: "paymentMode",
                width: 100,
                floatingFilter: true,
                filter: 'agTextColumnFilter',
                cellStyle: { fontSize: '12px' },
                tooltipField: "paymentMode", // Show full payment mode
                headerClass: 'wrapped-header'
            },
            {
                headerName: "Reference",
                field: "paymentReference",
                width: 120,
                floatingFilter: true,
                filter: 'agTextColumnFilter',
                cellStyle: { fontFamily: 'monospace', fontSize: '11px' },
                tooltipField: "paymentReference", // Show full reference number
                headerClass: 'wrapped-header'
            },
            {
                headerName: "Days Waiting",
                width: 110,
                floatingFilter: true,
                filter: 'agNumberColumnFilter',
                valueGetter: params => {
                    const submitted = params.data.submittedDate;
                    return calculateDaysWaiting(submitted);
                },
                cellRenderer: params => {
                    const days = params.value || 0;
                    let colorClass, urgencyText;
                    
                    if (days > 7) {
                        colorClass = 'text-red-700 bg-red-100 border-red-300';
                        urgencyText = 'URGENT';
                    } else if (days > 3) {
                        colorClass = 'text-yellow-700 bg-yellow-100 border-yellow-300';
                        urgencyText = 'FOLLOW';
                    } else {
                        colorClass = 'text-green-700 bg-green-100 border-green-300';
                        urgencyText = 'RECENT';
                    }
                    
                    return `<div class="text-center">
                                <div class="font-bold text-sm">${days}d</div>
                                <div class="text-xs px-2 py-1 rounded border ${colorClass}">${urgencyText}</div>
                            </div>`;
                },
                tooltipValueGetter: params => {
                    const days = params.value || 0;
                    const submitted = params.data.submittedDate;
                    let submittedDateStr = 'Unknown';
                    if (submitted) {
                        try {
                            submittedDateStr = submitted.toDate ? 
                                submitted.toDate().toLocaleDateString() :
                                new Date(submitted).toLocaleDateString();
                        } catch {}
                    }
                    return `Waiting for ${days} days (Submitted: ${submittedDateStr})`;
                },
                headerClass: 'wrapped-header'
            },
            {
                headerName: "Actions",
                width: 180,
                floatingFilter: false,
                filter: false,
                sortable: false,
                cellClass: 'flex items-center justify-center space-x-1',
                cellRenderer: params => {
                    const payment = params.data;
                    const originalInvoiceId = payment.relatedInvoiceId || payment.invoiceId || 'unknown';
                    // ✅ DEBUG: Log the complete payment data structure
                    console.log('[Grid] 🔍 PAYMENT DATA STRUCTURE DEBUG:');
                    console.log('  Payment ID:', payment.id);
                    console.log('  Payment object keys:', Object.keys(payment));
                    console.log('  relatedInvoiceId:', payment.relatedInvoiceId);
                    console.log('  invoiceId:', payment.invoiceId);
                    console.log('  Full payment data:', payment);
                    
                    // ✅ TRY DIFFERENT POSSIBLE FIELD NAMES
                    const possibleInvoiceIds = [
                        payment.relatedInvoiceId,
                        payment.invoiceId,
                        payment.originalInvoiceId,
                        payment.parentInvoiceId,
                        payment.supplierInvoiceId,
                        payment.purchaseInvoiceId
                    ];
                    
                    console.log('[Grid] Possible invoice ID fields:', possibleInvoiceIds);
                    
                    
                    return `<div class="flex space-x-1">
                                <button class="pmt-mgmt-verify-payment bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600 font-semibold"
                                    data-payment-id="${payment.id}"
                                    data-original-invoice-id="${originalInvoiceId}"
                                    title="Verify This Payment">
                                    <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    VERIFY
                                </button>
                                <button class="pmt-mgmt-reject-payment bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600"
                                    data-payment-id="${payment.id}"
                                    data-original-invoice-id="${originalInvoiceId}"
                                    title="Reject This Payment">
                                    <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                    REJECT
                                </button>
                            </div>`;
                },
                headerClass: 'wrapped-header'
                // No tooltip for action column
            }
        ],

        defaultColDef: {
            resizable: true, 
            sortable: true,
            filter: true,
            floatingFilter: true,
            wrapHeaderText: true,
            autoHeaderHeight: true,
            tooltipComponent: null // Use default tooltip component
        },
        
        onGridReady: (params) => {
            pmtMgmtPendingPaymentsGridApi = params.api;
            console.log('[PmtMgmt] Verification grid ready');
        }
    };
    // Create verification grid
    if (!pmtMgmtPendingPaymentsGridApi) {
        pmtMgmtPendingPaymentsGridApi = createGrid(gridContainer, verificationGridOptions);
    }

    // Load pending payments data
    pmtMgmtPendingPaymentsGridApi.setGridOption('rowData', pendingPayments);

    console.log(`[PmtMgmt] Verification grid setup: ${pendingPayments.length} payments loaded`);
}

/**
 * ENHANCED: Builds action required list that enhances your existing dashboard functionality.
 * 
 * This function works seamlessly WITH your existing updatePaymentMgmtActionItems() function,
 * enhancing it with advanced business intelligence while preserving all your excellent UI logic.
 * It can work with provided metrics (no extra reads) or collect fresh data when needed.
 * 
 * INTEGRATION APPROACH:
 * - Accepts existing metrics from loadPaymentMgmtMetrics() to avoid duplicate queries
 * - Enhances metrics with business intelligence (urgency, aging, risk assessment)
 * - Calls your existing updatePaymentMgmtActionItems() function with enhanced data
 * - Provides comprehensive caching and performance optimization
 * - Returns business summary for caller reference and monitoring
 * 
 * BUSINESS INTELLIGENCE ENHANCEMENTS:
 * - Payment urgency calculation based on amount and aging
 * - Supplier relationship risk assessment for overdue payments
 * - Team engagement analysis for consignment settlement priority
 * - Today's verification velocity for performance context
 * - Advanced caching to minimize database reads
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {Object} [options.metrics] - Existing metrics from loadPaymentMgmtMetrics() (preferred)
 * @param {boolean} [options.forceRefresh=false] - Bypass cache for fresh data collection
 * @param {boolean} [options.includeAdvancedIntelligence=true] - Calculate advanced business metrics
 * @param {number} [options.maxRecordsPerQuery=25] - Limit for fresh data collection queries
 * 
 * @returns {Promise<Object>} Enhanced action summary with business intelligence:
 *   - totalActionItems: Total verification tasks across all payment types
 *   - urgentCount: High-priority tasks needing immediate attention  
 *   - businessIntelligence: Advanced metrics for strategic decision making
 *   - performanceMetrics: Firestore usage and execution time transparency
 *   - enhancementApplied: Confirmation that UI was updated with enhanced data
 * 
 * @throws {Error} When database queries fail or user permissions insufficient
 * @since 1.0.0
 * @see updatePaymentMgmtActionItems() - Your existing UI function (enhanced by this function)
 * @see updatePaymentMgmtTabBadges() - Your existing badge function (called by this function)
 * @see loadPaymentMgmtMetrics() - Provides base metrics data to avoid duplicate queries
 */
export async function buildActionRequiredList(options = {}) {
    const {
        metrics = null,
        forceRefresh = false,
        includeAdvancedIntelligence = true,
        maxRecordsPerQuery = 25
    } = options;
    
    console.log('[PmtMgmt] 🎯 Building enhanced action intelligence to work WITH your existing UI function...');
    
    // ===================================================================
    // PHASE 1: PERMISSIONS AND INITIALIZATION
    // ===================================================================
    
    const currentUser = appState.currentUser;
    if (!currentUser || !['admin', 'finance'].includes(currentUser.role)) {
        console.warn('[PmtMgmt] User lacks payment verification permissions');
        
        // ✅ SAFE: Still call your UI function with empty data to maintain consistent UI
        updatePaymentMgmtActionItems({
            supplierMetrics: { pending: 0, pendingAmount: 0 },
            teamMetrics: { pending: 0, pendingAmount: 0 },
            salesMetrics: { voidRequests: 0 },
            permissionError: true
        });
        
        return {
            totalActionItems: 0,
            message: 'View only mode - insufficient permissions for payment verification',
            permissionError: true,
            enhancementApplied: false
        };
    }

    const executionStartTime = Date.now();
    let totalNewFirestoreReads = 0; // Track any additional reads we make

    try {
        // ===================================================================
        // PHASE 2: METRICS PROCESSING (Preferred path - use provided metrics)
        // ===================================================================
        
        if (metrics) {
            console.log('[PmtMgmt] ✅ EFFICIENT PATH: Using provided metrics - enhancing with business intelligence');
            console.log('[PmtMgmt] Base metrics received:', {
                supplierPending: metrics.supplierMetrics?.pending || 0,
                teamPending: metrics.teamMetrics?.pending || 0,
                totalReads: metrics.totalFirestoreReads || 0
            });

            // ✅ ENHANCE: Add business intelligence to existing metrics
            let enhancedMetrics = { ...metrics };

            if (includeAdvancedIntelligence) {
                // Add urgency assessment without additional database queries
                enhancedMetrics = {
                    ...metrics,
                    
                    // ✅ ENHANCED: Supplier intelligence
                    supplierMetrics: {
                        ...metrics.supplierMetrics,
                        urgencyLevel: calculateSupplierUrgencyLevel(metrics.supplierMetrics),
                        riskAssessment: calculateSupplierRiskFromMetrics(metrics.supplierMetrics),
                        priorityReason: generateSupplierPriorityReason(metrics.supplierMetrics)
                    },
                    
                    // ✅ ENHANCED: Team intelligence  
                    teamMetrics: {
                        ...metrics.teamMetrics,
                        urgencyLevel: calculateTeamUrgencyLevel(metrics.teamMetrics),
                        engagementAssessment: calculateTeamEngagementFromMetrics(metrics.teamMetrics),
                        priorityReason: generateTeamPriorityReason(metrics.teamMetrics)
                    },
                    
                    // ✅ ENHANCED: Overall business intelligence
                    businessIntelligence: {
                        totalActionItems: (metrics.supplierMetrics?.pending || 0) + (metrics.teamMetrics?.pending || 0),
                        urgentActionItems: calculateUrgentActionsFromMetrics(metrics),
                        overallUrgencyLevel: calculateOverallUrgencyFromMetrics(metrics),
                        recommendedAction: generateRecommendedActionFromMetrics(metrics),
                        
                        // Performance context
                        dataSource: 'enhanced_from_existing_metrics',
                        enhancementLevel: 'client_side_intelligence'
                    }
                };

                console.log('[PmtMgmt] 🧠 BUSINESS INTELLIGENCE APPLIED:');
                console.log(`  📤 Supplier Urgency: ${enhancedMetrics.supplierMetrics.urgencyLevel}`);
                console.log(`  👥 Team Urgency: ${enhancedMetrics.teamMetrics.urgencyLevel}`);
                console.log(`  🎯 Overall Priority: ${enhancedMetrics.businessIntelligence.overallUrgencyLevel}`);
                console.log(`  💡 Recommended Action: ${enhancedMetrics.businessIntelligence.recommendedAction}`);
            }

            // ✅ PERFECT: Feed your existing UI function with enhanced data
            updatePaymentMgmtActionItems(enhancedMetrics);

            const executionTime = Date.now() - executionStartTime;
            
            console.log(`[PmtMgmt] ✅ EFFICIENT ENHANCEMENT COMPLETED:`);
            console.log(`  📊 Enhanced existing metrics with business intelligence`);
            console.log(`  🔥 Additional Firestore Reads: ${totalNewFirestoreReads} (used cached metrics)`);
            console.log(`  ⚡ Enhancement Time: ${executionTime}ms`);
            console.log(`  🎨 UI Updated: Your existing updatePaymentMgmtActionItems() called with enhanced data`);

            return {
                totalActionItems: enhancedMetrics.businessIntelligence?.totalActionItems || 0,
                urgentCount: enhancedMetrics.businessIntelligence?.urgentActionItems || 0,
                enhancementApplied: true,
                dataSource: 'enhanced_existing_metrics',
                firestoreReadsUsed: totalNewFirestoreReads, // 0 in this path
                executionTimeMs: executionTime,
                businessIntelligence: enhancedMetrics.businessIntelligence || null
            };
        }

        // ===================================================================
        // PHASE 3: FRESH DATA COLLECTION (Fallback path if no metrics provided)
        // ===================================================================
        
        console.log('[PmtMgmt] 📊 FALLBACK PATH: No metrics provided - collecting fresh verification data...');
        
        // Cache check for fresh data collection
        const freshCacheKey = 'fresh_action_metrics';
        if (!forceRefresh) {
            const cachedFreshData = getCachedPaymentMetrics(freshCacheKey, 3); // 3-minute cache
            if (cachedFreshData) {
                console.log('[PmtMgmt] ✅ Using cached fresh metrics - 0 additional reads');
                updatePaymentMgmtActionItems(cachedFreshData);
                return cachedFreshData.summary;
            }
        }

        const db = firebase.firestore();

        // Parallel queries for efficiency
        const queryPromises = [
            // Supplier payments  
            db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
                .where('paymentStatus', '==', 'Pending Verification')
                .orderBy('submittedOn', 'asc')
                .limit(maxRecordsPerQuery)
                .get(),
            
            // Team payments
            db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
                .where('paymentStatus', '==', 'Pending Verification')
                .orderBy('submittedOn', 'asc')
                .limit(maxRecordsPerQuery)
                .get()
        ];

        const [supplierSnapshot, teamSnapshot] = await Promise.all(queryPromises);
        totalNewFirestoreReads = supplierSnapshot.size + teamSnapshot.size;

        // Process fresh data
        const supplierPayments = supplierSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            daysWaiting: calculateDaysWaiting(doc.data().submittedOn || doc.data().paymentDate)
        }));

        const teamPayments = teamSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            daysWaiting: calculateDaysWaiting(doc.data().submittedOn || doc.data().paymentDate)
        }));

        // Calculate enhanced metrics from fresh data
        const freshEnhancedMetrics = {
            supplierMetrics: {
                pending: supplierPayments.length,
                pendingAmount: supplierPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
                urgentCount: supplierPayments.filter(p => p.daysWaiting > 7 || (p.amountPaid || 0) > 10000).length,
                oldestDays: Math.max(...supplierPayments.map(p => p.daysWaiting), 0),
                urgencyLevel: supplierPayments.length > 5 ? 'critical' : supplierPayments.length > 2 ? 'high' : 'medium'
            },
            
            teamMetrics: {
                pending: teamPayments.length,
                pendingAmount: teamPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
                urgentCount: teamPayments.filter(p => p.daysWaiting > 5).length,
                oldestDays: Math.max(...teamPayments.map(p => p.daysWaiting), 0),
                uniqueTeams: new Set(teamPayments.map(p => p.teamName)).size,
                urgencyLevel: teamPayments.length > 3 ? 'high' : 'medium'
            },
            
            salesMetrics: {
                voidRequests: 0 // Future enhancement placeholder
            },
            
            todayCount: 0, // Could be calculated if needed
            todayAmount: 0
        };

        // Cache fresh data
        cachePaymentMetrics(freshCacheKey, {
            ...freshEnhancedMetrics,
            summary: {
                totalActionItems: freshEnhancedMetrics.supplierMetrics.pending + freshEnhancedMetrics.teamMetrics.pending,
                firestoreReadsUsed: totalNewFirestoreReads
            }
        });

        // ✅ PERFECT: Feed your existing UI function
        updatePaymentMgmtActionItems(freshEnhancedMetrics);

        const executionTime = Date.now() - executionStartTime;

        console.log(`[PmtMgmt] ✅ FRESH DATA ENHANCEMENT COMPLETED:`);
        console.log(`  📊 Supplier Verifications: ${freshEnhancedMetrics.supplierMetrics.pending} (${freshEnhancedMetrics.supplierMetrics.urgentCount} urgent)`);
        console.log(`  👥 Team Verifications: ${freshEnhancedMetrics.teamMetrics.pending} (${freshEnhancedMetrics.teamMetrics.urgentCount} urgent)`);
        console.log(`  🔥 Firestore Reads: ${totalNewFirestoreReads}`);
        console.log(`  ⚡ Execution Time: ${executionTime}ms`);

        return {
            totalActionItems: freshEnhancedMetrics.supplierMetrics.pending + freshEnhancedMetrics.teamMetrics.pending,
            urgentCount: freshEnhancedMetrics.supplierMetrics.urgentCount + freshEnhancedMetrics.teamMetrics.urgentCount,
            enhancementApplied: true,
            dataSource: 'fresh_database_query',
            firestoreReadsUsed: totalNewFirestoreReads,
            executionTimeMs: executionTime,
            
            breakdown: {
                supplierActions: freshEnhancedMetrics.supplierMetrics.pending,
                teamActions: freshEnhancedMetrics.teamMetrics.pending,
                oldestSupplierDays: freshEnhancedMetrics.supplierMetrics.oldestDays,
                oldestTeamDays: freshEnhancedMetrics.teamMetrics.oldestDays
            }
        };

    } catch (error) {
        console.error('[PmtMgmt] ❌ Error in enhanced buildActionRequiredList:', error);
        
        // ✅ SAFE FALLBACK: Ensure your UI function still gets called to prevent broken dashboard
        updatePaymentMgmtActionItems({
            supplierMetrics: { pending: 0, pendingAmount: 0 },
            teamMetrics: { pending: 0, pendingAmount: 0 },
            salesMetrics: { voidRequests: 0 },
            error: true,
            errorMessage: `Action items loading failed: ${error.message}`
        });
        
        // Re-throw for proper error handling in calling function
        throw new Error(`buildActionRequiredList failed: ${error.message}`);
    }
}

/**
 * BUSINESS INTELLIGENCE: Calculate supplier urgency level from metrics
 */
function calculateSupplierUrgencyLevel(supplierMetrics) {
    const pending = supplierMetrics.pending || 0;
    const amount = supplierMetrics.pendingAmount || 0;
    
    if (pending > 5 || amount > 50000) return 'critical';
    if (pending > 2 || amount > 20000) return 'high';
    if (pending > 0) return 'medium';
    return 'low';
}

/**
 * BUSINESS INTELLIGENCE: Calculate team urgency level from metrics
 */
function calculateTeamUrgencyLevel(teamMetrics) {
    const pending = teamMetrics.pending || 0;
    const amount = teamMetrics.pendingAmount || 0;
    
    if (pending > 3 || amount > 15000) return 'high';
    if (pending > 1 || amount > 5000) return 'medium';
    if (pending > 0) return 'low';
    return 'none';
}


/**
 * BUSINESS INTELLIGENCE: Assess supplier relationship risk from metrics
 */
function calculateSupplierRiskFromMetrics(supplierMetrics) {
    const pending = supplierMetrics.pending || 0;
    const amount = supplierMetrics.pendingAmount || 0;
    
    // Risk assessment based on pending volume and amounts
    if (pending > 5 && amount > 30000) {
        return 'high_relationship_risk';
    } else if (pending > 3 || amount > 15000) {
        return 'moderate_relationship_risk';  
    } else if (pending > 0) {
        return 'low_relationship_risk';
    }
    return 'no_risk';
}

/**
 * BUSINESS INTELLIGENCE: Calculate team engagement from metrics
 */
function calculateTeamEngagementFromMetrics(teamMetrics) {
    const pending = teamMetrics.pending || 0;
    
    if (pending > 5) return 'very_active';
    if (pending > 2) return 'active';
    if (pending > 0) return 'moderate';
    return 'low';
}

/**
 * BUSINESS INTELLIGENCE: Generate supplier priority reason
 */
function generateSupplierPriorityReason(supplierMetrics) {
    const pending = supplierMetrics.pending || 0;
    const amount = supplierMetrics.pendingAmount || 0;
    
    if (pending === 0) return 'No supplier payments pending verification';
    
    if (pending > 5) {
        return `High volume: ${pending} supplier payments awaiting verification may impact supplier relationships`;
    } else if (amount > 30000) {
        return `High value: ${formatCurrency(amount)} in pending payments requires priority verification`;
    } else {
        return `Standard verification: ${pending} supplier payment${pending > 1 ? 's' : ''} ready for admin approval`;
    }
}



/**
 * BUSINESS INTELLIGENCE: Generate team priority reason
 */
function generateTeamPriorityReason(teamMetrics) {
    const pending = teamMetrics.pending || 0;
    const amount = teamMetrics.pendingAmount || 0;
    
    if (pending === 0) return 'No team payments pending verification';
    
    if (pending > 3) {
        return `Active teams: ${pending} team payments from consignment activities need verification`;
    } else {
        return `Team settlements: ${pending} team payment${pending > 1 ? 's' : ''} ready for consignment settlement`;
    }
}

/**
 * BUSINESS INTELLIGENCE: Calculate urgent actions from existing metrics
 */
function calculateUrgentActionsFromMetrics(metrics) {
    const supplierUrgent = (metrics.supplierMetrics?.pending || 0) > 3 ? 1 : 0;
    const teamUrgent = (metrics.teamMetrics?.pending || 0) > 2 ? 1 : 0;
    const salesUrgent = (metrics.salesMetrics?.voidRequests || 0) > 0 ? 1 : 0;
    
    return supplierUrgent + teamUrgent + salesUrgent;
}

/**
 * BUSINESS INTELLIGENCE: Calculate overall urgency level from metrics
 */
function calculateOverallUrgencyFromMetrics(metrics) {
    const totalPending = (metrics.supplierMetrics?.pending || 0) + 
                        (metrics.teamMetrics?.pending || 0) + 
                        (metrics.salesMetrics?.voidRequests || 0);
    const totalAmount = (metrics.supplierMetrics?.pendingAmount || 0) + 
                       (metrics.teamMetrics?.pendingAmount || 0);
    
    if (totalPending > 8 || totalAmount > 75000) return 'critical';
    if (totalPending > 4 || totalAmount > 35000) return 'high';
    if (totalPending > 1 || totalAmount > 10000) return 'medium';
    return 'normal';
}

/**
 * BUSINESS INTELLIGENCE: Generate recommended action from metrics
 */
function generateRecommendedActionFromMetrics(metrics) {
    const supplierPending = metrics.supplierMetrics?.pending || 0;
    const teamPending = metrics.teamMetrics?.pending || 0;
    const supplierAmount = metrics.supplierMetrics?.pendingAmount || 0;
    
    if (supplierPending > 5) {
        return `Priority: Focus on supplier payment verification (${supplierPending} pending, ${formatCurrency(supplierAmount)})`;
    } else if (teamPending > 3) {
        return `Team Focus: Complete team payment verifications (${teamPending} teams waiting)`;
    } else if (supplierPending > 0) {
        return `Supplier Relations: Verify ${supplierPending} supplier payment${supplierPending > 1 ? 's' : ''} to maintain good relationships`;
    } else if (teamPending > 0) {
        return `Team Settlements: Complete ${teamPending} team payment verification${teamPending > 1 ? 's' : ''} for consignment closure`;
    } else {
        return 'Monitoring: All payment verifications current - continue regular monitoring';
    }
}



/**
 * BUSINESS LOGIC: Calculate payment urgency score based on amount and aging
 */
function calculatePaymentUrgencyScore(amount, daysWaiting, paymentType) {
    let baseScore = daysWaiting; // Days are the primary urgency factor
    
    // Amount-based urgency multipliers
    if (amount > 20000) baseScore += 5; // Very high amount
    else if (amount > 10000) baseScore += 3; // High amount  
    else if (amount > 5000) baseScore += 1; // Medium amount
    
    // Payment type considerations
    if (paymentType === 'supplier' && daysWaiting > 14) {
        baseScore += 3; // Supplier relationship risk
    } else if (paymentType === 'team' && daysWaiting > 7) {
        baseScore += 2; // Team settlement urgency
    }
    
    return baseScore;
}


/**
 * BUSINESS INTELLIGENCE: Assess supplier payment risk level
 */
function calculateSupplierRiskLevel(overdueCount, totalAmount, oldestDays) {
    if (overdueCount > 2 && totalAmount > 50000) return 'critical';
    if (overdueCount > 1 || totalAmount > 30000 || oldestDays > 21) return 'high';
    if (overdueCount > 0 || totalAmount > 10000 || oldestDays > 14) return 'medium';
    return 'low';
}

/**
 * BUSINESS INTELLIGENCE: Calculate overall urgency across all payment types
 */
function calculateOverallUrgencyLevel(supplierIntel, teamIntel) {
    const totalUrgent = supplierIntel.urgentCount + teamIntel.urgentCount;
    const totalCritical = supplierIntel.criticalCount;
    const maxDaysWaiting = Math.max(supplierIntel.oldestDays, teamIntel.oldestDays);
    
    if (totalCritical > 0 || maxDaysWaiting > 14) return 'critical';
    if (totalUrgent > 3 || maxDaysWaiting > 10) return 'high';  
    if (totalUrgent > 0 || maxDaysWaiting > 7) return 'medium';
    return 'normal';
}


/**
 * BUSINESS INTELLIGENCE: Calculate overall business risk from pending payments
 */
function calculateOverallBusinessRisk(supplierIntel, teamIntel) {
    const supplierRisk = supplierIntel.supplierRiskAssessment;
    const totalAmount = supplierIntel.pendingAmount + teamIntel.pendingAmount;
    const maxAge = Math.max(supplierIntel.oldestDays, teamIntel.oldestDays);
    
    if (supplierRisk === 'critical' || totalAmount > 100000 || maxAge > 21) return 'high';
    if (supplierRisk === 'high' || totalAmount > 50000 || maxAge > 14) return 'medium';
    return 'low';
}


/**
 * BUSINESS INTELLIGENCE: Generate recommended action based on current state
 */
function generateRecommendedAction(supplierIntel, teamIntel) {
    if (supplierIntel.criticalCount > 0) {
        return `Immediate action: Verify ${supplierIntel.criticalCount} critical supplier payments to prevent relationship damage`;
    }
    
    if (supplierIntel.urgentCount > 3) {
        return `High priority: Process ${supplierIntel.urgentCount} urgent supplier verifications`;
    }
    
    if (teamIntel.urgentCount > 2) {
        return `Team priority: Complete ${teamIntel.urgentCount} team payment verifications for settlement`;
    }
    
    if (supplierIntel.pending + teamIntel.pending > 10) {
        return `Volume management: ${supplierIntel.pending + teamIntel.pending} total verifications - consider batch processing`;
    }
    
    if (supplierIntel.pending > 0 || teamIntel.pending > 0) {
        return `Regular verification: Process pending payments in order of submission`;
    }
    
    return 'Monitor normally - no urgent payment verifications required';
}


/**
 * STANDALONE: Outstanding Balance Metrics (completely separate from payment metrics).
 * 
 * Provides executive-level financial intelligence by analyzing outstanding balances
 * across all business channels. This function is independent and doesn't interfere
 * with existing payment operations metrics.
 * 
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.useCache=true] - Enable 10-minute caching
 * @param {number} [options.queryLimit=100] - Max records per query
 * 
 * @returns {Promise<Object>} Complete outstanding balance analysis
 */
export async function loadOutstandingBalanceMetrics(options = {}) {
    const { useCache = true, queryLimit = 100 } = options;
    
    console.log('[PmtMgmt] 💰 Loading STANDALONE outstanding balance metrics...');
    
    // Separate cache key to avoid conflicts
    const balanceCacheKey = 'outstanding_balance_metrics_standalone';
    
    if (useCache) {
        const cachedBalances = getCachedPaymentMetrics(balanceCacheKey, 10); // 10-minute cache
        if (cachedBalances) {
            console.log('[PmtMgmt] ✅ Using cached outstanding balances - 0 Firestore reads');
            return cachedBalances;
        }
    }

    const db = firebase.firestore();
    let totalReads = 0;
    const startTime = Date.now();

    try {
        // ===================================================================
        // COLLECT OUTSTANDING DATA FROM ALL 3 BUSINESS CHANNELS
        // ===================================================================
        
        const [supplierInvoicesSnapshot, directSalesSnapshot, consignmentOrdersSnapshot] = await Promise.all([
            // 📤 SUPPLIER INVOICES with outstanding balances
            db.collection(PURCHASE_INVOICES_COLLECTION_PATH)
                .where('paymentStatus', 'in', ['Unpaid', 'Partially Paid'])
                .orderBy('purchaseDate', 'asc')
                .limit(queryLimit)
                .get(),
            
            // 🏪 DIRECT SALES with outstanding balances
            db.collection(SALES_COLLECTION_PATH)
                .where('paymentStatus', 'in', ['Unpaid', 'Partially Paid'])
                .orderBy('saleDate', 'asc')
                .limit(queryLimit)
                .get(),
            
            // 👥 CONSIGNMENT ORDERS with outstanding balances
            db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH)
                .where('status', '==', 'Active')
                .where('balanceDue', '>', 0)
                .orderBy('requestDate', 'asc')
                .limit(queryLimit)
                .get()
        ]);

        totalReads = supplierInvoicesSnapshot.size + directSalesSnapshot.size + consignmentOrdersSnapshot.size;

        console.log(`[PmtMgmt] 📊 Outstanding data collected:`, {
            supplierInvoices: supplierInvoicesSnapshot.size,
            directSales: directSalesSnapshot.size,
            consignmentOrders: consignmentOrdersSnapshot.size,
            totalReads: totalReads
        });

        // ===================================================================
        // PROCESS EACH CHANNEL INDEPENDENTLY
        // ===================================================================
        
        // Process supplier payables
        const supplierPayables = processSupplierPayables(supplierInvoicesSnapshot.docs);
        
        // Process direct sales receivables
        const directSalesReceivables = processDirectSalesReceivables(directSalesSnapshot.docs);
        
        // Process consignment receivables
        const consignmentReceivables = processConsignmentReceivables(consignmentOrdersSnapshot.docs);
        
        // Calculate net position
        const totalReceivables = directSalesReceivables.totalOutstanding + consignmentReceivables.totalOutstanding;
        const totalPayables = supplierPayables.totalOutstanding;
        const netPosition = totalReceivables - totalPayables;

        // ===================================================================
        // ASSEMBLE FINAL STANDALONE METRICS
        // ===================================================================
        
        const standalonemetrics = {
            supplierPayables,
            directSalesReceivables,
            consignmentReceivables,
            
            netPosition: {
                totalReceivables,
                totalPayables,
                netPosition,
                formattedReceivables: formatCurrency(totalReceivables),
                formattedPayables: formatCurrency(totalPayables),
                formattedNetPosition: formatCurrency(netPosition),
                healthStatus: netPosition >= 0 ? 'positive' : 'negative',
                riskLevel: Math.abs(netPosition) > 50000 ? 'high' : Math.abs(netPosition) > 20000 ? 'medium' : 'low'
            },
            
            executiveSummary: {
                keyInsight: generateKeyFinancialInsight(totalReceivables, totalPayables, netPosition),
                urgentAction: generateUrgentFinancialAction(supplierPayables, directSalesReceivables, consignmentReceivables),
                overallHealth: netPosition >= 0 ? 'Healthy Cash Position' : 'Cash Flow Attention Needed'
            },
            
            metadata: {
                generatedAt: new Date().toISOString(),
                firestoreReadsUsed: totalReads,
                executionTimeMs: Date.now() - startTime,
                cacheKey: balanceCacheKey
            }
        };

        // Cache for future use
        cachePaymentMetrics(balanceCacheKey, standalonemetrics);

        console.log(`[PmtMgmt] ✅ Standalone outstanding balance metrics completed (${totalReads} reads)`);
        return standalonemetrics;

    } catch (error) {
        console.error('[PmtMgmt] ❌ Error in standalone outstanding balance metrics:', error);
        throw new Error(`Outstanding balance calculation failed: ${error.message}`);
    }
}

/**
 * NEW: Updates outstanding balance cards (completely separate from payment operations)
 */
function updateOutstandingBalanceCards(outstandingMetrics) {
    console.log('[PmtMgmt] 💰 Updating standalone outstanding balance cards...');
    
    if (!outstandingMetrics) {
        console.warn('[PmtMgmt] No outstanding balance metrics provided - using placeholders');
        return;
    }

    // ✅ NET CASH POSITION (Most important business metric)
    const netPositionElement = document.getElementById('pmt-mgmt-net-position');
    const netPositionStatusElement = document.getElementById('pmt-mgmt-net-position-status');
    
    if (netPositionElement && outstandingMetrics.netPosition) {
        const netAmount = outstandingMetrics.netPosition.netPosition || 0;
        netPositionElement.textContent = formatCurrency(netAmount);
        
        // Dynamic styling based on cash position
        if (netAmount >= 20000) {
            netPositionElement.className = 'text-2xl font-bold text-green-700';
            if (netPositionStatusElement) netPositionStatusElement.textContent = 'Strong cash position';
        } else if (netAmount >= 0) {
            netPositionElement.className = 'text-2xl font-bold text-indigo-700';
            if (netPositionStatusElement) netPositionStatusElement.textContent = 'Healthy cash flow';
        } else if (netAmount >= -10000) {
            netPositionElement.className = 'text-2xl font-bold text-yellow-700';
            if (netPositionStatusElement) netPositionStatusElement.textContent = 'Monitor cash flow';
        } else {
            netPositionElement.className = 'text-2xl font-bold text-red-700 animate-pulse';
            if (netPositionStatusElement) netPositionStatusElement.textContent = 'Cash flow attention needed';
        }
    }

    // ✅ SUPPLIER PAYABLES (What we owe)
    const supplierPayablesElement = document.getElementById('pmt-mgmt-supplier-payables-outstanding');
    const supplierBreakdownElement = document.getElementById('pmt-mgmt-supplier-payables-breakdown');
    
    if (supplierPayablesElement && outstandingMetrics.supplierPayables) {
        const supplier = outstandingMetrics.supplierPayables;
        supplierPayablesElement.textContent = formatCurrency(supplier.totalOutstanding || 0);
        
        // Color based on urgency
        if (supplier.criticalCount > 0) {
            supplierPayablesElement.className = 'text-2xl font-bold text-red-700 animate-pulse';
        } else if (supplier.overdueCount > 0) {
            supplierPayablesElement.className = 'text-2xl font-bold text-red-700';
        } else {
            supplierPayablesElement.className = 'text-2xl font-bold text-red-600';
        }
        
        if (supplierBreakdownElement) {
            let breakdownText = `${supplier.invoiceCount || 0} invoices`;
            if (supplier.criticalCount > 0) {
                breakdownText += `, ${supplier.criticalCount} critical`;
            } else if (supplier.overdueCount > 0) {
                breakdownText += `, ${supplier.overdueCount} overdue`;
            }
            supplierBreakdownElement.textContent = breakdownText;
        }
    }

    // ✅ CUSTOMER RECEIVABLES (Direct sales owed to us)
    const customerReceivablesElement = document.getElementById('pmt-mgmt-customers-receivables-outstanding');
    const customerBreakdownElement = document.getElementById('pmt-mgmt-customers-receivables-breakdown');
    
    if (customerReceivablesElement && outstandingMetrics.directSalesReceivables) {
        const directSales = outstandingMetrics.directSalesReceivables;
        customerReceivablesElement.textContent = formatCurrency(directSales.totalOutstanding || 0);
        
        if (customerBreakdownElement) {
            const churchAmount = directSales.churchStoreOutstanding || 0;
            const tastyAmount = directSales.tastyTreatsOutstanding || 0;
            customerBreakdownElement.textContent = `Church: ${formatCurrency(churchAmount)}, Tasty: ${formatCurrency(tastyAmount)}`;
        }
    }

    // ✅ TEAM RECEIVABLES (Consignment settlements owed to us)
    const teamReceivablesElement = document.getElementById('pmt-mgmt-teams-receivables-outstanding');
    const teamBreakdownElement = document.getElementById('pmt-mgmt-teams-receivables-breakdown');
    
    if (teamReceivablesElement && outstandingMetrics.consignmentReceivables) {
        const consignment = outstandingMetrics.consignmentReceivables;
        teamReceivablesElement.textContent = formatCurrency(consignment.totalOutstanding || 0);
        
        if (teamBreakdownElement) {
            teamBreakdownElement.textContent = `${consignment.teamCount || 0} teams, ${consignment.activeOrderCount || 0} active orders`;
        }
    }

    console.log('[PmtMgmt] ✅ Outstanding balance cards updated with real business intelligence');
}

// ===================================================================
// HELPER FUNCTIONS FOR OUTSTANDING BALANCE ANALYSIS
// ===================================================================


// ===================================================================
// HELPER PROCESSING FUNCTIONS
// ===================================================================


function processSupplierPayables(invoiceDocs) {
    const invoices = invoiceDocs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            daysOutstanding: calculateDaysOutstandingPurchase(data.purchaseDate),
            isOverdue: calculateDaysOutstandingPurchase(data.purchaseDate) > 30,
            isCritical: calculateDaysOutstandingPurchase(data.purchaseDate) > 45 || (data.balanceDue || 0) > 15000
        };
    });

    return {
        totalOutstanding: invoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0),
        invoiceCount: invoices.length,
        overdueAmount: invoices.filter(inv => inv.isOverdue).reduce((sum, inv) => sum + (inv.balanceDue || 0), 0),
        overdueCount: invoices.filter(inv => inv.isOverdue).length,
        criticalAmount: invoices.filter(inv => inv.isCritical).reduce((sum, inv) => sum + (inv.balanceDue || 0), 0),
        criticalCount: invoices.filter(inv => inv.isCritical).length,
        avgDaysOutstanding: invoices.length > 0 
            ? invoices.reduce((sum, inv) => sum + inv.daysOutstanding, 0) / invoices.length 
            : 0
    };
}

function processDirectSalesReceivables(salesDocs) {
    const sales = salesDocs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            daysOutstanding: calculateDaysOutstandingPurchase(data.saleDate),
            isOverdue: calculateDaysOutstandingPurchase(data.saleDate) > 30
        };
    });

    return {
        totalOutstanding: sales.reduce((sum, sale) => sum + (sale.balanceDue || 0), 0),
        invoiceCount: sales.length,
        churchStoreOutstanding: sales.filter(s => s.store === 'Church Store').reduce((sum, s) => sum + (s.balanceDue || 0), 0),
        tastyTreatsOutstanding: sales.filter(s => s.store === 'Tasty Treats').reduce((sum, s) => sum + (s.balanceDue || 0), 0),
        overdueAmount: sales.filter(s => s.isOverdue).reduce((sum, s) => sum + (s.balanceDue || 0), 0),
        overdueCount: sales.filter(s => s.isOverdue).length
    };
}

function processConsignmentReceivables(orderDocs) {
    const orders = orderDocs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            daysOutstanding: calculateDaysOutstandingPurchase(data.requestDate),
            isOverdue: calculateDaysOutstandingPurchase(data.requestDate) > 60 // Longer cycle for consignments
        };
    });

    return {
        totalOutstanding: orders.reduce((sum, order) => sum + (order.balanceDue || 0), 0),
        activeOrderCount: orders.length,
        teamCount: new Set(orders.map(order => order.teamName)).size,
        largestBalance: Math.max(...orders.map(order => order.balanceDue || 0), 0),
        overdueAmount: orders.filter(o => o.isOverdue).reduce((sum, o) => sum + (o.balanceDue || 0), 0),
        overdueCount: orders.filter(o => o.isOverdue).length
    };
}

function generateKeyFinancialInsight(receivables, payables, netPosition) {
    if (netPosition > 20000) {
        return `Strong Position: ${formatCurrency(netPosition)} positive cash flow`;
    } else if (netPosition > 0) {
        return `Healthy: ${formatCurrency(netPosition)} positive, monitor collections`;
    } else if (netPosition > -10000) {
        return `Manageable: ${formatCurrency(Math.abs(netPosition))} negative, prioritize collections`;
    } else {
        return `Attention Needed: ${formatCurrency(Math.abs(netPosition))} negative, urgent action required`;
    }
}

function generateUrgentFinancialAction(supplier, directSales, consignment) {
    if (supplier.criticalCount > 0) return `Pay ${supplier.criticalCount} critical supplier invoices immediately`;
    if (supplier.overdueCount > 0) return `Address ${supplier.overdueCount} overdue supplier payments`;
    if (directSales.overdueCount > 0) return `Follow up on ${directSales.overdueCount} overdue customer payments`;
    if (consignment.overdueCount > 0) return `Settle ${consignment.overdueCount} overdue consignment balances`;
    return 'Continue normal monitoring of outstanding balances';
}

/**
 * Calculate days outstanding from invoice/order date
 */
function calculateDaysOutstanding(dateField) {
    if (!dateField) return 0;
    
    try {
        const invoiceDate = dateField.toDate ? dateField.toDate() : new Date(dateField);
        const today = new Date();
        const diffTime = today - invoiceDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    } catch (error) {
        console.warn('[PmtMgmt] Error calculating days outstanding:', error);
        return 0;
    }
}

/**
 * Generate most urgent outstanding action
 */
function generateMostUrgentOutstandingAction(supplierPayables, directSales, consignment) {
    if (supplierPayables.criticalCount > 0) {
        return `URGENT: ${supplierPayables.criticalCount} critical supplier invoices (${formatCurrency(supplierPayables.criticalAmount)})`;
    }
    
    if (supplierPayables.overdueCount > 0) {
        return `High Priority: ${supplierPayables.overdueCount} overdue supplier invoices (${formatCurrency(supplierPayables.overdueAmount)})`;
    }
    
    if (directSales.overdueCount > 0) {
        return `Customer Follow-up: ${directSales.overdueCount} overdue customer invoices (${formatCurrency(directSales.overdueAmount)})`;
    }
    
    if (consignment.overdueCount > 0) {
        return `Team Settlement: ${consignment.overdueCount} overdue team settlements (${formatCurrency(consignment.overdueAmount)})`;
    }
    
    if (supplierPayables.totalOutstanding > directSales.totalOutstanding + consignment.totalOutstanding) {
        return `Cash Flow Watch: Payables exceed receivables by ${formatCurrency(supplierPayables.totalOutstanding - (directSales.totalOutstanding + consignment.totalOutstanding))}`;
    }
    
    return 'Normal Monitoring: Outstanding balances within acceptable ranges';
}

/**
 * Assess overall financial health
 */
function assessOverallFinancialHealth(netPosition, cashFlowRisk) {
    if (cashFlowRisk === 'high') return 'Needs Immediate Attention';
    if (cashFlowRisk === 'medium') return 'Requires Monitoring';
    if (netPosition > 10000) return 'Strong Position';
    if (netPosition >= 0) return 'Healthy';
    return 'Manageable';
}


// ===================================================================
// DEBUG FUNCTIONS (Add this section to payment-management.js)
// ===================================================================

/**
 * DEBUG: Compare Action Required vs Grid data sources to find discrepancy
 * 
 * This function investigates why Action Required shows team payments needing
 * verification but the Team Grid doesn't show verify buttons.
 */
window.debugTeamPaymentDiscrepancy = async function() {
    console.log('[DEBUG] 🔍 Investigating team payment data discrepancy...');
    
    try {
        const db = firebase.firestore();
        
        // ===================================================================
        // CHECK 1: Direct team payments (what Action Required sees)
        // ===================================================================
        console.log('[DEBUG] 📊 STEP 1: Checking direct team payments (Action Required source)...');
        
        const teamPaymentsQuery = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('paymentStatus', '==', 'Pending Verification')
            .limit(10);
        
        const teamPaymentsSnapshot = await teamPaymentsQuery.get();
        
        console.log(`[DEBUG] 📤 DIRECT TEAM PAYMENTS FOUND: ${teamPaymentsSnapshot.size}`);
        
        const paymentDetails = [];
        teamPaymentsSnapshot.docs.forEach((doc, index) => {
            const payment = doc.data();
            const paymentInfo = {
                paymentId: doc.id,
                teamName: payment.teamName,
                orderId: payment.orderId,
                amount: payment.amountPaid || 0,
                status: payment.paymentStatus,
                submittedBy: payment.submittedBy
            };
            
            paymentDetails.push(paymentInfo);
            console.log(`    ${index + 1}. Team: ${payment.teamName}, Order: ${payment.orderId}, Amount: ${formatCurrency(payment.amountPaid || 0)}`);
        });
        
        // ===================================================================
        // CHECK 2: Consignment orders (what Team Grid sees)
        // ===================================================================
        console.log('[DEBUG] 📋 STEP 2: Checking consignment orders (Team Grid source)...');
        
        const consignmentOrdersQuery = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH)
            .where('status', '==', 'Active')
            .where('balanceDue', '>', 0)
            .limit(10);
        
        const ordersSnapshot = await consignmentOrdersQuery.get();
        
        console.log(`[DEBUG] 👥 OUTSTANDING CONSIGNMENT ORDERS FOUND: ${ordersSnapshot.size}`);
        
        const orderDetails = [];
        ordersSnapshot.docs.forEach((doc, index) => {
            const order = doc.data();
            const orderInfo = {
                orderId: doc.id,
                consignmentId: order.consignmentId,
                teamName: order.teamName,
                balanceDue: order.balanceDue || 0,
                status: order.status
            };
            
            orderDetails.push(orderInfo);
            console.log(`    ${index + 1}. Team: ${order.teamName}, Order ID: ${doc.id}, Balance: ${formatCurrency(order.balanceDue || 0)}`);
        });
        
        // ===================================================================
        // CHECK 3: Cross-reference analysis
        // ===================================================================
        console.log(`[DEBUG] 🔍 STEP 3: Cross-reference analysis...`);
        
        const paymentOrderIds = paymentDetails.map(p => p.orderId);
        const gridOrderIds = orderDetails.map(o => o.orderId);
        
        console.log(`[DEBUG] 📤 Payment Order IDs: [${paymentOrderIds.join(', ')}]`);
        console.log(`[DEBUG] 📋 Grid Order IDs: [${gridOrderIds.join(', ')}]`);
        
        // Find matches (orders that should show verify buttons)
        const matchingOrders = paymentOrderIds.filter(paymentOrderId => 
            gridOrderIds.includes(paymentOrderId)
        );
        console.log(`[DEBUG] ✅ MATCHING ORDERS (should show verify buttons): [${matchingOrders.join(', ')}]`);
        
        // Find payments without corresponding grid orders (explains discrepancy)
        const paymentsWithoutGridOrders = paymentDetails.filter(payment => 
            !gridOrderIds.includes(payment.orderId)
        );
        console.log(`[DEBUG] ❌ PAYMENTS WITHOUT GRID ORDERS (explains discrepancy):`, paymentsWithoutGridOrders.length);
        paymentsWithoutGridOrders.forEach((payment, index) => {
            console.log(`    ${index + 1}. Payment ID: ${payment.paymentId}, Team: ${payment.teamName}, Order: ${payment.orderId}, Amount: ${formatCurrency(payment.amount)}`);
        });
        
        // ===================================================================
        // CHECK 4: Investigate missing orders in detail
        // ===================================================================
        if (paymentsWithoutGridOrders.length > 0) {
            console.log(`[DEBUG] 🔍 STEP 4: Investigating why ${paymentsWithoutGridOrders.length} orders are missing from grid...`);
            
            for (const payment of paymentsWithoutGridOrders) {
                console.log(`[DEBUG] 🔍 Checking order ${payment.orderId} (Team: ${payment.teamName})...`);
                
                try {
                    const orderDoc = await db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(payment.orderId).get();
                    
                    if (orderDoc.exists) {
                        const orderData = orderDoc.data();
                        console.log(`    ✅ Order exists in database:`);
                        console.log(`      Team: ${orderData.teamName}`);
                        console.log(`      Status: "${orderData.status}"`);
                        console.log(`      Balance Due: ${formatCurrency(orderData.balanceDue || 0)}`);
                        console.log(`      Consignment ID: ${orderData.consignmentId}`);
                        
                        // ✅ DIAGNOSIS: Check why it's not in grid query results
                        const isActive = orderData.status === 'Active';
                        const hasBalance = (orderData.balanceDue || 0) > 0;
                        
                        console.log(`    🔍 Grid inclusion criteria:`);
                        console.log(`      ✅ status === 'Active': ${isActive} ${isActive ? '(PASSES)' : '(FAILS - not Active)'}`);
                        console.log(`      ✅ balanceDue > 0: ${hasBalance} ${hasBalance ? '(PASSES)' : '(FAILS - no balance due)'}`);
                        
                        if (!isActive || !hasBalance) {
                            console.log(`    🎯 REASON: Order doesn't meet grid criteria (status=${orderData.status}, balance=${orderData.balanceDue})`);
                        } else {
                            console.log(`    ⚠️ MYSTERY: Order meets criteria but wasn't returned by query!`);
                        }
                    } else {
                        console.log(`    ❌ ORDER DOES NOT EXIST: ${payment.orderId}`);
                        console.log(`    🎯 REASON: Team payment refers to non-existent order`);
                    }
                } catch (orderCheckError) {
                    console.error(`    ❌ Error checking order ${payment.orderId}:`, orderCheckError);
                }
            }
        }
        
        // ===================================================================
        // FINAL SUMMARY
        // ===================================================================
        console.log(`[DEBUG] 🎯 DISCREPANCY ANALYSIS COMPLETE:`);
        console.log(`  📤 Total Pending Team Payments: ${teamPaymentsSnapshot.size}`);
        console.log(`  📋 Total Outstanding Orders in Grid: ${ordersSnapshot.size}`);
        console.log(`  ✅ Orders that Should Show Verify Buttons: ${matchingOrders.length}`);
        console.log(`  ❌ Discrepancy (Payments without Grid Orders): ${paymentsWithoutGridOrders.length}`);
        
        if (paymentsWithoutGridOrders.length > 0) {
            console.log(`[DEBUG] 💡 SOLUTION: The discrepancy is caused by team payments that refer to orders that either:`);
            console.log(`    • Are not in 'Active' status`);
            console.log(`    • Have balanceDue = 0 (already settled)`);
            console.log(`    • Don't exist in the database`);
            console.log(`    • Have data inconsistencies`);
        } else {
            console.log(`[DEBUG] ✅ NO DISCREPANCY: All payments have corresponding grid orders`);
        }
        
        return {
            pendingPayments: teamPaymentsSnapshot.size,
            outstandingOrders: ordersSnapshot.size,
            matchingOrders: matchingOrders.length,
            discrepancyCount: paymentsWithoutGridOrders.length,
            missingOrderDetails: paymentsWithoutGridOrders
        };
        
    } catch (error) {
        console.error('[DEBUG] ❌ Error in team payment discrepancy analysis:', error);
        return { error: error.message };
    }
};



/**
 * ENHANCED: Show team payment verification modal for consignment order payments.
 * 
 * Opens verification interface for team payments submitted against consignment orders.
 * Similar to supplier payment verification but focused on team settlements.
 * 
 * @param {string} consignmentOrderId - The consignment order ID to verify payments for
 * @param {string} teamName - Team name for modal header context
 * @param {Object} pendingStatus - Pending payment status from checkForPendingTeamPayments()
 */
export async function showTeamPaymentVerificationModal(consignmentOrderId, teamName, pendingStatus) {
    console.log(`[PmtMgmt] 👥 Opening team payment verification modal for order: ${consignmentOrderId}`);
    
    // For now, we'll use a comprehensive modal dialog instead of a separate modal
    // This is simpler and reuses your existing modal system
    
    try {
        if (!pendingStatus || !pendingStatus.hasPendingPayments) {
            await showModal('info', 'No Team Payments to Verify',
                `No team payments are pending verification for this order.\n\n` +
                `Order: ${consignmentOrderId}\n` +
                `Team: ${teamName}\n\n` +
                `All payments have been processed or no payments submitted.`
            );
            return;
        }
        
        // ✅ BUILD: Detailed verification information
        const paymentDetails = pendingStatus.pendingPaymentsList.map((payment, index) => 
            `${index + 1}. ${formatCurrency(payment.paymentAmount)} ${payment.donationAmount > 0 ? `+ ${formatCurrency(payment.donationAmount)} donation` : ''}\n` +
            `   Mode: ${payment.paymentMode}, Reference: ${payment.paymentReference || 'No reference'}\n` +
            `   Submitted: ${payment.submittedDate?.toDate?.()?.toLocaleDateString() || 'Unknown date'} by ${payment.submittedBy}\n` +
            `   Waiting: ${payment.daysWaiting} days`
        ).join('\n\n');
        
        const confirmed = await showModal('confirm', 'Verify Team Payments',
            `Verify all pending team payments for this consignment order?\n\n` +
            `🏆 TEAM: ${teamName}\n` +
            `📋 ORDER: ${consignmentOrderId}\n` +
            `💰 TOTAL AMOUNT: ${formatCurrency(pendingStatus.totalPendingAmount)}\n` +
            `📊 PAYMENT COUNT: ${pendingStatus.totalPendingCount}\n\n` +
            `PAYMENT DETAILS:\n${paymentDetails}\n\n` +
            `This will:\n` +
            `✅ Verify all ${pendingStatus.totalPendingCount} payment${pendingStatus.totalPendingCount > 1 ? 's' : ''}\n` +
            `✅ Update consignment order balance\n` +
            `✅ Complete team settlement process\n` +
            `✅ Notify team of verification\n\n` +
            `Proceed with verification?`
        );

        if (confirmed) {
            ProgressToast.show('Verifying Team Payments', 'info');
            
            try {
                // ✅ PROCESS: Verify each team payment
                let verifiedCount = 0;
                let totalVerifiedAmount = 0;
                
                for (const payment of pendingStatus.pendingPaymentsList) {
                    ProgressToast.updateProgress(
                        `Verifying payment ${verifiedCount + 1} of ${pendingStatus.totalPendingCount}...`, 
                        ((verifiedCount + 1) / pendingStatus.totalPendingCount) * 80,
                        `Processing ${payment.teamName} payment`
                    );
                    
                    await verifyConsignmentPayment(payment.id, appState.currentUser);
                    
                    verifiedCount++;
                    totalVerifiedAmount += payment.paymentAmount;
                    
                    console.log(`[PmtMgmt] ✅ Verified team payment ${verifiedCount}/${pendingStatus.totalPendingCount}: ${formatCurrency(payment.paymentAmount)}`);
                }
                
                ProgressToast.updateProgress('All team payments verified successfully!', 100, 'Verification Complete');
                ProgressToast.showSuccess(`${verifiedCount} team payments verified (${formatCurrency(totalVerifiedAmount)})!`);
                
                setTimeout(async () => {
                    ProgressToast.hide(800);
                    
                    await showModal('success', 'Team Payment Verification Complete',
                        `All team payments have been verified successfully!\n\n` +
                        `🏆 Team: ${teamName}\n` +
                        `📋 Order: ${consignmentOrderId}\n` +
                        `✅ Payments Verified: ${verifiedCount}\n` +
                        `💰 Total Amount: ${formatCurrency(totalVerifiedAmount)}\n\n` +
                        `Results:\n` +
                        `✓ Consignment order balance updated\n` +
                        `✓ Team settlement progress recorded\n` +
                        `✓ Payment status changed to verified\n` +
                        `✓ Team notified of successful verification\n\n` +
                        `The team grids will refresh to show updated status.`
                    );
                    
                    // ✅ REFRESH: Team payment grid and action items
                    setTimeout(async () => {
                        // Clear cache to force fresh data
                        clearPaymentMgmtCache();
                        
                        // Refresh team grid if active
                        if (document.getElementById('pmt-mgmt-teams-content')?.classList.contains('active')) {
                            await loadTeamPaymentsForMgmtTab('outstanding', { forceRefresh: true });
                        }
                        
                        // Refresh action items
                        await buildActionRequiredList({ forceRefresh: true });
                        
                        console.log('[PmtMgmt] ✅ Team payment grids and action items refreshed after verification');
                    }, 1000);
                    
                }, 1200);
                
            } catch (verificationError) {
                console.error('[PmtMgmt] Error in team payment verification:', verificationError);
                ProgressToast.showError(`Team verification failed: ${verificationError.message}`);
                
                setTimeout(() => {
                    showModal('error', 'Team Verification Failed',
                        `Failed to verify team payments.\n\n` +
                        `Error: ${verificationError.message}\n\n` +
                        `Please try again or verify payments individually.`
                    );
                }, 2000);
            }
        }
        
    } catch (error) {
        console.error('[PmtMgmt] Error in team payment verification modal:', error);
        showModal('error', 'Verification Modal Error',
            `Could not open team payment verification.\n\n` +
            `Error: ${error.message}`
        );
    }
}

/**
 * BUSINESS INTELLIGENCE: Calculate collection efficiency metrics (ENHANCED)
 */
function calculateCollectionEfficiencyMetrics(businessSummary) {
    console.log('[Reports] 📊 Calculating collection efficiency metrics...');
    
    const detailedData = businessSummary.detailedBreakdown;
    let overallCollectionRate = 0;
    let collectionDetails = 'Calculating...';
    
    // Get collection data from direct sales
    if (detailedData?.directSalesData?.paymentAnalysis) {
        const paymentAnalysis = detailedData.directSalesData.paymentAnalysis;
        overallCollectionRate = paymentAnalysis.collectionRate || 0;
        
        const totalTransactions = detailedData.directSalesData.summary.totalTransactions;
        const paidTransactions = paymentAnalysis.paidTransactions || 0;
        
        collectionDetails = `${paidTransactions}/${totalTransactions} invoices collected`;
        
        console.log('[Reports] 📊 Collection efficiency calculated:', {
            collectionRate: overallCollectionRate.toFixed(1) + '%',
            paidTransactions,
            totalTransactions
        });
    } else {
        // Fallback calculation if detailed analysis not available
        const totalRevenue = businessSummary.executiveSummary.totalBusinessRevenue;
        const outstandingAmount = businessSummary.executiveSummary.totalOutstanding;
        
        if (totalRevenue > 0) {
            overallCollectionRate = ((totalRevenue - outstandingAmount) / totalRevenue) * 100;
            collectionDetails = `${formatCurrency(totalRevenue - outstandingAmount)} of ${formatCurrency(totalRevenue)} collected`;
        } else {
            collectionDetails = 'Insufficient data';
        }
        
        console.log('[Reports] 📊 Fallback collection calculation:', {
            totalRevenue: formatCurrency(totalRevenue),
            outstanding: formatCurrency(outstandingAmount),
            calculatedRate: overallCollectionRate.toFixed(1) + '%'
        });
    }
    
    return {
        collectionRate: Math.round(overallCollectionRate),
        formattedRate: overallCollectionRate.toFixed(1) + '%',
        efficiency: overallCollectionRate > 90 ? 'Excellent' : 
                   overallCollectionRate > 75 ? 'Good' : 
                   overallCollectionRate > 50 ? 'Fair' : 'Needs Improvement',
        details: collectionDetails,
        recommendation: overallCollectionRate < 75 ? 'Focus on improving payment collection processes' : 'Maintain excellent collection practices'
    };
}

/**
 * BUSINESS INTELLIGENCE: Calculate growth trend analysis (ENHANCED)
 */
function calculateGrowthTrendAnalysis(businessSummary) {
    console.log('[Reports] 📈 Calculating growth trend analysis...');
    
    const totalRevenue = businessSummary.executiveSummary.totalBusinessRevenue;
    const directRevenue = businessSummary.executiveSummary.directSalesRevenue;
    const consignmentRevenue = businessSummary.executiveSummary.consignmentRevenue;
    const reportPeriod = businessSummary.executiveSummary.reportPeriod;
    
    // Calculate daily average for trend context
    const periodDays = getDaysFromPeriodLabel(reportPeriod);
    const dailyAverage = periodDays > 0 ? totalRevenue / periodDays : 0;
    
    // Determine trend based on revenue performance and channel mix
    let trend, direction, confidence, trendDescription;
    
    if (totalRevenue > 100000) {
        trend = 'Strong Growth';
        direction = '📈';
        confidence = 'High';
        trendDescription = `Exceptional performance (${formatCurrency(dailyAverage)} daily average)`;
    } else if (totalRevenue > 50000) {
        trend = 'Steady Growth';
        direction = '📊';
        confidence = 'High';
        trendDescription = `Solid performance (${formatCurrency(dailyAverage)} daily average)`;
    } else if (totalRevenue > 20000) {
        trend = 'Moderate Growth';
        direction = '📊';
        confidence = 'Medium';
        trendDescription = `Good foundation (${formatCurrency(dailyAverage)} daily average)`;
    } else if (totalRevenue > 5000) {
        trend = 'Early Development';
        direction = '📈';
        confidence = 'Medium';
        trendDescription = `Building momentum (${formatCurrency(dailyAverage)} daily average)`;
    } else {
        trend = 'Startup Phase';
        direction = '🌱';
        confidence = 'Low';
        trendDescription = `Early stage development`;
    }
    
    // Channel diversification analysis
    const channelDiversification = Math.min(
        businessSummary.executiveSummary.channelMix.directPercentage,
        businessSummary.executiveSummary.channelMix.consignmentPercentage
    );
    
    const diversificationHealth = channelDiversification > 30 ? 'Well Diversified' : 
                                 channelDiversification > 15 ? 'Moderately Diversified' : 'Channel Concentrated';
    
    console.log('[Reports] 📈 Growth trend calculated:', {
        trend,
        totalRevenue: formatCurrency(totalRevenue),
        dailyAverage: formatCurrency(dailyAverage),
        channelDiversification: diversificationHealth,
        confidence
    });
    
    return {
        trend,
        direction,
        confidence,
        trendDescription,
        dailyAverage: formatCurrency(dailyAverage),
        channelDiversification: diversificationHealth,
        
        // Detailed breakdown
        breakdown: {
            directRevenue: formatCurrency(directRevenue),
            consignmentRevenue: formatCurrency(consignmentRevenue),
            directPercentage: businessSummary.executiveSummary.channelMix.directPercentage,
            consignmentPercentage: businessSummary.executiveSummary.channelMix.consignmentPercentage
        }
    };
}

/**
 * HELPER: Extract days from period label
 */
function getDaysFromPeriodLabel(periodLabel) {
    if (!periodLabel) return 30; // Default
    
    const dayMatches = periodLabel.match(/(\d+)\s*day/i);
    if (dayMatches) return parseInt(dayMatches[1]);
    
    if (periodLabel.toLowerCase().includes('today')) return 1;
    if (periodLabel.toLowerCase().includes('yesterday')) return 1;
    if (periodLabel.toLowerCase().includes('week')) return 7;
    if (periodLabel.toLowerCase().includes('month')) return 30;
    if (periodLabel.toLowerCase().includes('quarter')) return 90;
    if (periodLabel.toLowerCase().includes('year')) return 365;
    
    return 30; // Default fallback
}







console.log('[PmtMgmt] 💳 Payment Management Module loaded successfully');
