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
    SALES_PAYMENTS_LEDGER_COLLECTION_PATH
} from './config.js';




/**
 * DEDICATED: Supplier payments grid configuration for Payment Management module
 * Optimized for payment operations workflow with enhanced context and actions
 */
const pmtMgmtSupplierGridOptions = {
    theme: 'alpine',
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100],
    
    columnDefs: [
        {
            headerName: "Invoice Reference",
            width: 160,
            pinned: 'left',
            cellStyle: { fontWeight: 'bold' },
            valueGetter: params => {
                if (!params.data) return 'Unknown';
                
                // ✅ PAYMENT MANAGEMENT SPECIFIC: Show meaningful reference
                if (params.data.supplierInvoiceNo) {
                    return params.data.supplierInvoiceNo;
                } else if (params.data.relatedInvoiceId) {
                    return `Doc: ${params.data.relatedInvoiceId.substring(0, 15)}...`;
                } else {
                    return `Payment: ${params.data.paymentId || 'Unknown'}`;
                }
            }
        },
        {
            headerName: "Supplier",
            width: 200,
            pinned: 'left',
            cellStyle: { fontWeight: 'bold' },
            valueGetter: params => {
                if (!params.data || !params.data.supplierId) return 'Unknown Supplier';
                
                const supplier = masterData.suppliers.find(s => s.id === params.data.supplierId);
                return supplier ? supplier.supplierName : `ID: ${params.data.supplierId}`;
            }
        },
        { 
            field: "paymentDate", 
            headerName: "Payment Date", 
            width: 130,
            valueFormatter: params => {
                try {
                    if (params.value?.toDate) {
                        return params.value.toDate().toLocaleDateString();
                    } else if (params.value instanceof Date) {
                        return params.value.toLocaleDateString();
                    } else {
                        return new Date(params.value).toLocaleDateString();
                    }
                } catch {
                    return 'Unknown Date';
                }
            }
        },
        {
            field: "amountPaid",
            headerName: "Amount",
            width: 120,
            valueFormatter: params => params.value ? formatCurrency(params.value) : '₹0.00',
            cellClass: 'text-right font-bold',
            cellStyle: { color: '#dc2626' } // Red for outbound payments
        },
        { 
            field: "paymentMode", 
            headerName: "Payment Mode", 
            width: 120,
            cellStyle: { fontSize: '12px' }
        },
        { 
            field: "transactionRef", 
            headerName: "Reference", 
            width: 140,
            cellRenderer: params => {
                const ref = params.value || '';
                if (!ref) return '<span class="text-gray-400 italic">No reference</span>';
                
                const displayRef = ref.length > 15 ? ref.substring(0, 15) + '...' : ref;
                return `<span class="text-sm font-mono" title="${ref}">${displayRef}</span>`;
            }
        },
        {
            field: "notes", 
            headerName: "Notes", 
            width: 180,
            cellRenderer: params => {
                const notes = params.value || '';
                
                if (!notes.trim()) {
                    return '<span class="text-gray-400 italic text-xs">No notes</span>';
                }
                
                const maxLength = 40;
                const displayText = notes.length > maxLength 
                    ? notes.substring(0, maxLength) + '...'
                    : notes;
                
                return `<span class="text-xs text-gray-700" title="${notes.replace(/"/g, '&quot;')}">${displayText}</span>`;
            }
        },
        {
            field: "paymentStatus",
            headerName: "Status",
            width: 130,
            cellRenderer: params => {
                const status = params.value || 'Verified';
                
                const statusConfig = {
                    'Verified': { class: 'text-green-700 bg-green-100 border-green-300', icon: '✅' },
                    'Pending Verification': { class: 'text-yellow-700 bg-yellow-100 border-yellow-300', icon: '⏳' },
                    'Voided': { class: 'text-gray-700 bg-gray-100 border-gray-300', icon: '❌' },
                    'Void_Reversal': { class: 'text-red-700 bg-red-100 border-red-300', icon: '🔄' }
                };
                
                const config = statusConfig[status] || { class: 'text-blue-700 bg-blue-100 border-blue-300', icon: '📋' };
                
                return `<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border ${config.class}">
                            ${config.icon} ${status}
                        </span>`;
            }
        },
        {
            headerName: "Actions",
            width: 160,
            cellClass: 'flex items-center justify-center space-x-1',
            suppressSizeToFit: true,
            cellRenderer: params => {
                const paymentStatus = params.data.paymentStatus || 'Verified';
                const submittedBy = params.data.submittedBy;
                const currentUser = appState.currentUser;
                
                const hasFinancialPermissions = currentUser && (
                    currentUser.role === 'admin' || 
                    currentUser.role === 'finance'
                );
                
                let buttons = '';
                
                // ✅ VERIFY BUTTON: For pending payments
                if (paymentStatus === 'Pending Verification' && hasFinancialPermissions) {
                    buttons += `<button class="action-btn-icon pmt-mgmt-verify-supplier-payment bg-green-100 text-green-700 hover:bg-green-200 p-2 rounded" 
                                      data-id="${params.data.id}" 
                                      title="Verify Payment">
                                  <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4-5.5Z" clip-rule="evenodd" />
                                  </svg>
                              </button>`;
                }
                
                // ✅ VOID BUTTON: For verified payments
                if ((paymentStatus === 'Verified' || !paymentStatus) && hasFinancialPermissions) {
                    buttons += `<button class="action-btn-icon pmt-mgmt-void-supplier-payment bg-red-100 text-red-700 hover:bg-red-200 p-2 rounded" 
                                      data-id="${params.data.id}" 
                                      title="Void Payment">
                                  <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4z" clip-rule="evenodd" />
                                  </svg>
                              </button>`;
                }
                
                // ✅ VIEW BUTTON: For all payments (see details)
                buttons += `<button class="action-btn-icon pmt-mgmt-view-supplier-payment bg-blue-100 text-blue-700 hover:bg-blue-200 p-2 rounded" 
                                  data-id="${params.data.id}" 
                                  title="View Payment Details">
                              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                              </svg>
                          </button>`;
                
                return buttons;
            }
        }
    ],
    
    defaultColDef: { 
        resizable: true, 
        sortable: true, 
        filter: true, 
        wrapText: false,
        suppressSizeToFit: false
    },
    
    onGridReady: (params) => {
        pmtMgmtSupplierGridApi = params.api;
        console.log("[PmtMgmt] ✅ Dedicated Supplier Payments Grid ready");
        
        // Auto-load data
        setTimeout(() => {
            loadSupplierPaymentsForMgmtTab();
        }, 100);
    }
};


const pmtMgmtTeamGridOptions = {
    theme: 'alpine',
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 50,
    
    columnDefs: [
        {
            headerName: "Team",
            width: 180,
            pinned: 'left',
            field: "teamName",
            cellStyle: { fontWeight: 'bold' }
        },
        {
            headerName: "Order Reference",
            width: 140,
            valueGetter: params => {
                const orderId = params.data.orderId;
                return orderId ? `Order: ${orderId.substring(0, 12)}...` : 'Unknown';
            }
        },
        { 
            field: "paymentDate", 
            headerName: "Payment Date", 
            width: 130,
            valueFormatter: params => {
                try {
                    return params.value?.toDate ? params.value.toDate().toLocaleDateString() : 'Unknown';
                } catch {
                    return 'Unknown Date';
                }
            }
        },
        {
            field: "amountPaid",
            headerName: "Amount",
            width: 120,
            valueFormatter: params => formatCurrency(params.value || 0),
            cellClass: 'text-right font-bold',
            cellStyle: { color: '#059669' } // Green for inbound payments
        },
        {
            field: "paymentMode",
            headerName: "Payment Mode",
            width: 120
        },
        {
            field: "paymentStatus",
            headerName: "Status",
            width: 140,
            cellRenderer: params => {
                const status = params.value || 'Pending Verification';
                
                const statusConfig = {
                    'Verified': { class: 'text-green-700 bg-green-100', icon: '✅' },
                    'Pending Verification': { class: 'text-yellow-700 bg-yellow-100', icon: '⏳' }
                };
                
                const config = statusConfig[status] || { class: 'text-blue-700 bg-blue-100', icon: '📋' };
                
                return `<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.class}">
                            ${config.icon} ${status}
                        </span>`;
            }
        },
        {
            headerName: "Actions",
            width: 140,
            cellClass: 'flex items-center justify-center space-x-1',
            cellRenderer: params => {
                const paymentStatus = params.data.paymentStatus || 'Pending Verification';
                const currentUser = appState.currentUser;
                
                const hasFinancialPermissions = currentUser && (
                    currentUser.role === 'admin' || currentUser.role === 'finance'
                );
                
                let buttons = '';
                
                // Verify button
                if (paymentStatus === 'Pending Verification' && hasFinancialPermissions) {
                    buttons += `<button class="pmt-mgmt-verify-team-payment bg-green-100 text-green-700 hover:bg-green-200 p-2 rounded" 
                                      data-id="${params.data.id}" 
                                      title="Verify Team Payment">
                                  <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.06 0l4-5.5Z" clip-rule="evenodd" />
                                  </svg>
                              </button>`;
                }
                
                // View button
                buttons += `<button class="pmt-mgmt-view-team-payment bg-blue-100 text-blue-700 hover:bg-blue-200 p-2 rounded" 
                                  data-id="${params.data.id}" 
                                  title="View Payment Details">
                              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10z" clip-rule="evenodd"/>
                              </svg>
                          </button>`;
                
                return buttons;
            }
        }
    ],
    
    defaultColDef: { 
        resizable: true, 
        sortable: true, 
        filter: true
    },
    
    onGridReady: (params) => {
        pmtMgmtTeamGridApi = params.api;
        console.log("[PmtMgmt] ✅ Dedicated Team Payments Grid ready");
        
        setTimeout(() => {
            loadTeamPaymentsForMgmtTab();
        }, 100);
    }
};


const pmtMgmtSalesGridOptions = {
    theme: 'alpine',
    getRowId: params => params.data.id,
    pagination: true,
    paginationPageSize: 50,
    
    columnDefs: [
        {
            headerName: "Customer",
            width: 180,
            pinned: 'left',
            field: "customerName",
            cellStyle: { fontWeight: 'bold' }
        },
        {
            headerName: "Invoice Reference",
            width: 140,
            valueGetter: params => {
                const invoiceId = params.data.invoiceId;
                return invoiceId ? `Invoice: ${invoiceId}` : 'Unknown';
            }
        },
        { 
            field: "paymentDate", 
            headerName: "Payment Date", 
            width: 130,
            valueFormatter: params => {
                try {
                    return params.value?.toDate ? params.value.toDate().toLocaleDateString() : 'Unknown';
                } catch {
                    return 'Unknown Date';
                }
            }
        },
        {
            field: "amountPaid",
            headerName: "Amount",
            width: 120,
            valueFormatter: params => formatCurrency(params.value || 0),
            cellClass: 'text-right font-bold',
            cellStyle: { color: '#059669' } // Green for inbound payments
        },
        {
            field: "paymentMode",
            headerName: "Payment Mode",
            width: 120
        },
        {
            field: "status",
            headerName: "Status", 
            width: 120,
            cellRenderer: params => {
                const status = params.value || 'Verified';
                
                const statusConfig = {
                    'Verified': { class: 'text-green-700 bg-green-100', icon: '✅' },
                    'Voided': { class: 'text-gray-700 bg-gray-100', icon: '❌' }
                };
                
                const config = statusConfig[status] || { class: 'text-blue-700 bg-blue-100', icon: '💳' };
                
                return `<span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${config.class}">
                            ${config.icon} ${status}
                        </span>`;
            }
        },
        {
            headerName: "Actions",
            width: 120,
            cellClass: 'flex items-center justify-center space-x-1',
            cellRenderer: params => {
                const status = params.data.status || 'Verified';
                const currentUser = appState.currentUser;
                
                const hasFinancialPermissions = currentUser && (
                    currentUser.role === 'admin' || currentUser.role === 'finance'
                );
                
                let buttons = '';
                
                // Void button for verified payments
                if (status === 'Verified' && hasFinancialPermissions) {
                    buttons += `<button class="pmt-mgmt-void-sales-payment bg-red-100 text-red-700 hover:bg-red-200 p-2 rounded" 
                                      data-id="${params.data.id}" 
                                      title="Void Payment">
                                  <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5z" clip-rule="evenodd"/>
                                  </svg>
                              </button>`;
                }
                
                // View button for all payments
                buttons += `<button class="pmt-mgmt-view-sales-payment bg-blue-100 text-blue-700 hover:bg-blue-200 p-2 rounded" 
                                  data-id="${params.data.id}" 
                                  title="View Payment Details">
                              <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10z" clip-rule="evenodd"/>
                              </svg>
                          </button>`;
                
                return buttons;
            }
        }
    ],
    
    defaultColDef: { 
        resizable: true, 
        sortable: true, 
        filter: true
    },
    
    onGridReady: (params) => {
        pmtMgmtSalesGridApi = params.api;
        console.log("[PmtMgmt] ✅ Dedicated Sales Payments Grid ready");
        
        setTimeout(() => {
            loadSalesPaymentsForMgmtTab();
        }, 100);
    }
};


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


/**
 * ENHANCED: Load supplier payments with invoice number pre-fetching (OPTIONAL)
 */
async function loadSupplierPaymentsForMgmtTab() {
    console.log('[DEBUG] Starting loadSupplierPaymentsForMgmtTab');
    
    if (!pmtMgmtSupplierGridApi) {
        console.error('[DEBUG] ❌ pmtMgmtSupplierGridApi not available');
        return;
    }
    
    try {
        console.log('[DEBUG] ✅ Grid API available, loading data...');
        pmtMgmtSupplierGridApi.setGridOption('loading', true);
        
        const db = firebase.firestore();
        console.log('[DEBUG] Firestore reference created');
        
        // ✅ DEBUG: Check collection path
        console.log('[DEBUG] Collection path:', SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH);
        
        const supplierPaymentsQuery = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
            .orderBy('paymentDate', 'desc')
            .limit(10); // ✅ REDUCED: Small limit for testing
        
        console.log('[DEBUG] Query created, executing...');
        const snapshot = await supplierPaymentsQuery.get();
        
        console.log('[DEBUG] Query results:');
        console.log(`  - Snapshot size: ${snapshot.size}`);
        console.log(`  - Snapshot empty: ${snapshot.empty}`);
        
        const supplierPayments = snapshot.docs.map(doc => {
            const data = { id: doc.id, ...doc.data() };
            console.log('[DEBUG] Payment record:', {
                id: data.id,
                supplierId: data.supplierId,
                amountPaid: data.amountPaid,
                paymentStatus: data.paymentStatus,
                paymentDate: data.paymentDate
            });
            return data;
        });
        
        console.log(`[DEBUG] ✅ Processed ${supplierPayments.length} supplier payments`);
        console.log('[DEBUG] First payment sample:', supplierPayments[0]);
        
        // ✅ LOAD: Data into grid
        pmtMgmtSupplierGridApi.setGridOption('rowData', supplierPayments);
        pmtMgmtSupplierGridApi.setGridOption('loading', false);
        
        // ✅ VERIFY: Data was loaded
        setTimeout(() => {
            const rowCount = pmtMgmtSupplierGridApi.getDisplayedRowCount();
            console.log(`[DEBUG] ✅ Grid shows ${rowCount} rows after loading`);
            
            if (rowCount === 0 && supplierPayments.length > 0) {
                console.error('[DEBUG] ❌ Grid has data but shows 0 rows - likely grid configuration issue');
                console.log('[DEBUG] Grid API state:', {
                    api: !!pmtMgmtSupplierGridApi,
                    rowData: supplierPayments.length,
                    displayed: rowCount
                });
            }
        }, 200);
        
    } catch (error) {
        console.error('[DEBUG] ❌ Error loading supplier payments:', error);
        console.error('[DEBUG] Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        
        if (pmtMgmtSupplierGridApi) {
            pmtMgmtSupplierGridApi.setGridOption('loading', false);
            pmtMgmtSupplierGridApi.showNoRowsOverlay();
        }
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
    console.log('[PmtMgmt] 🚀 Opening Payment Management Center');
    
    showView('pmt-mgmt-view');
    
    // Initialize dashboard on first load
    if (!pmtMgmtDashboardInitialized) {
        initializePaymentManagementDashboard();
        pmtMgmtDashboardInitialized = true;
    }
    
    // Always refresh data when view is opened
    refreshPaymentManagementDashboard();
}

// ===================================================================
// DASHBOARD INITIALIZATION
// ===================================================================

/**
 * Initializes the payment management dashboard structure
 */
function initializePaymentManagementDashboard() {
    console.log('[PmtMgmt] Initializing Payment Management Dashboard');
    
    try {
        // Setup tab navigation
        setupPaymentMgmtTabNavigation();
        
        // Setup event listeners
        setupPaymentMgmtEventListeners();
        
        // Initialize default tab (dashboard)
        switchPaymentMgmtTab('pmt-mgmt-tab-dashboard', 'pmt-mgmt-dashboard-content');
        
        console.log('[PmtMgmt] ✅ Dashboard initialization completed');
        
    } catch (error) {
        console.error('[PmtMgmt] Dashboard initialization failed:', error);
        showModal('error', 'Initialization Failed', 
            'Payment Management dashboard could not initialize properly. Please refresh the page.'
        );
    }
}

/**
 * Sets up tab navigation event listeners
 */
function setupPaymentMgmtTabNavigation() {
    const tabs = [
        { tabId: 'pmt-mgmt-tab-dashboard', contentId: 'pmt-mgmt-dashboard-content' },
        { tabId: 'pmt-mgmt-tab-suppliers', contentId: 'pmt-mgmt-suppliers-content' },
        { tabId: 'pmt-mgmt-tab-teams', contentId: 'pmt-mgmt-teams-content' },
        { tabId: 'pmt-mgmt-tab-sales', contentId: 'pmt-mgmt-sales-content' }
    ];
    
    tabs.forEach(tab => {
        const tabElement = document.getElementById(tab.tabId);
        if (tabElement) {
            tabElement.addEventListener('click', (e) => {
                e.preventDefault();
                switchPaymentMgmtTab(tab.tabId, tab.contentId);
            });
            
            console.log(`[PmtMgmt] ✅ Tab listener setup: ${tab.tabId}`);
        } else {
            console.warn(`[PmtMgmt] Tab element not found: ${tab.tabId}`);
        }
    });
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
    console.log(`[PmtMgmt] Switching to tab: ${activeTabId}`);
    
    try {
        // Update tab active states
        document.querySelectorAll('.pmt-mgmt-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        const activeTab = document.getElementById(activeTabId);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        // Update content visibility
        document.querySelectorAll('.pmt-mgmt-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const activeContent = document.getElementById(activeContentId);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        // Initialize tab-specific content
        initializePaymentMgmtTabContent(activeContentId);
        
        pmtMgmtCurrentTab = activeContentId;
        
        console.log(`[PmtMgmt] ✅ Switched to tab: ${activeTabId}`);
        
    } catch (error) {
        console.error('[PmtMgmt] Error switching tabs:', error);
    }
}

/**
 * Initializes content for specific payment management tab
 */
function initializePaymentMgmtTabContent(contentId) {
    console.log(`[PmtMgmt] Initializing tab content: ${contentId}`);
    
    switch (contentId) {
        case 'pmt-mgmt-dashboard-content':
            // Dashboard is always initialized, just refresh data
            refreshPaymentManagementDashboard();
            break;
            
        case 'pmt-mgmt-suppliers-content':
            initializeSupplierPaymentsTab();
            break;
            
        case 'pmt-mgmt-teams-content':
            initializeTeamPaymentsTab();
            break;
            
        case 'pmt-mgmt-sales-content':
            initializeSalesPaymentsTab();
            break;
            
        default:
            console.warn(`[PmtMgmt] Unknown tab content: ${contentId}`);
    }
}


/**
 * Updates action items section with high-priority payments
 */
function updatePaymentMgmtActionItems(metrics) {
    const actionItemsContainer = document.getElementById('pmt-mgmt-action-items');
    if (!actionItemsContainer) return;
    
    console.log('[PmtMgmt] Updating action items section...');
    
    const actionItems = [];
    
    // Generate action items based on metrics
    if (metrics.pendingCount > 0) {
        actionItems.push({
            priority: 'high',
            icon: '⏳',
            title: `${metrics.pendingCount} payments awaiting verification`,
            description: `${formatCurrency(metrics.pendingAmount)} total pending approval`,
            action: 'verify-pending',
            color: 'yellow'
        });
    }
    
    if (metrics.supplierMetrics.pending > 0) {
        actionItems.push({
            priority: 'high',
            icon: '📤',
            title: `${metrics.supplierMetrics.pending} supplier payments pending`,
            description: 'Verify to maintain good supplier relationships',
            action: 'goto-suppliers',
            color: 'red'
        });
    }
    
    if (metrics.teamMetrics.pending > 0) {
        actionItems.push({
            priority: 'medium',
            icon: '👥',
            title: `${metrics.teamMetrics.pending} team payments pending`,
            description: 'Verify team consignment settlements',
            action: 'goto-teams',
            color: 'green'
        });
    }
    
    if (actionItems.length === 0) {
        // No urgent actions
        actionItemsContainer.innerHTML = `
            <div class="text-center py-6">
                <svg class="w-12 h-12 mx-auto text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h4 class="text-lg font-semibold text-gray-700">All Caught Up!</h4>
                <p class="text-sm text-gray-500 mt-1">No urgent payment actions required at this time.</p>
                <p class="text-xs text-gray-400 mt-2">
                    ✅ ${metrics.todayCount} payments processed today (${formatCurrency(metrics.todayAmount)})
                </p>
            </div>
        `;
    } else {
        // Show action items
        const actionItemsHtml = actionItems.map(item => `
            <div class="flex items-center justify-between p-3 border-l-4 border-${item.color}-400 bg-${item.color}-50 rounded-r-lg">
                <div class="flex items-center space-x-3">
                    <div class="text-xl">${item.icon}</div>
                    <div>
                        <h5 class="font-semibold text-${item.color}-800">${item.title}</h5>
                        <p class="text-sm text-${item.color}-600">${item.description}</p>
                    </div>
                </div>
                <button class="pmt-mgmt-action-button bg-${item.color}-600 text-white px-3 py-2 rounded text-sm hover:bg-${item.color}-700" 
                        data-action="${item.action}">
                    Take Action →
                </button>
            </div>
        `).join('');
        
        actionItemsContainer.innerHTML = actionItemsHtml;
        
        // Add click listeners to action buttons
        actionItemsContainer.querySelectorAll('.pmt-mgmt-action-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                handlePaymentMgmtQuickAction(action);
            });
        });
    }
    
    console.log(`[PmtMgmt] ✅ Updated action items: ${actionItems.length} actions available`);
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
        badges.supplier.className = `ml-2 text-xs px-2 py-1 rounded-full ${
            metrics.supplierMetrics.pending > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-gray-100 text-gray-600'
        }`;
    }
    
    if (badges.team) {
        badges.team.textContent = metrics.teamMetrics.pending || 0;
        badges.team.className = `ml-2 text-xs px-2 py-1 rounded-full ${
            metrics.teamMetrics.pending > 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-600'
        }`;
    }
    
    if (badges.sales) {
        badges.sales.textContent = metrics.salesMetrics.pending || 0;
        badges.sales.className = `ml-2 text-xs px-2 py-1 rounded-full ${
            metrics.salesMetrics.pending > 0 
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
async function refreshPaymentManagementDashboard() {
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
async function loadSupplierPaymentsForMgmtTab() {
    if (!pmtMgmtSupplierGridApi) return;
    
    try {
        console.log('[PmtMgmt] Loading supplier payments with complete context...');
        pmtMgmtSupplierGridApi.setGridOption('loading', true);
        
        // Check cache first
        const cacheKey = 'pmt_mgmt_supplier_payments_enhanced';
        const cached = getCachedPaymentMetrics(cacheKey);
        
        if (cached && cached.supplierPayments) {
            console.log('[PmtMgmt] Using cached enhanced supplier payments - 0 reads');
            pmtMgmtSupplierGridApi.setGridOption('rowData', cached.supplierPayments);
            pmtMgmtSupplierGridApi.setGridOption('loading', false);
            return;
        }
        
        const db = firebase.firestore();
        let totalReads = 0;
        
        // Load supplier payments
        const supplierPaymentsQuery = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
            .orderBy('paymentDate', 'desc')
            .limit(50); // Reduced limit for free tier
        
        const paymentsSnapshot = await supplierPaymentsQuery.get();
        totalReads += paymentsSnapshot.size;
        
        const supplierPayments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`[PmtMgmt] Loaded ${supplierPayments.length} supplier payments (${totalReads} reads)`);
        
        // ✅ ENHANCE: Add supplier and invoice context to each payment
        const enhancedPayments = supplierPayments.map(payment => {
            // Get supplier name from masterData (no additional reads)
            const supplier = masterData.suppliers.find(s => s.id === payment.supplierId);
            const supplierName = supplier ? supplier.supplierName : 'Unknown Supplier';
            
            return {
                ...payment,
                supplierName: supplierName,
                supplierInvoiceDisplay: payment.relatedInvoiceId // Use invoice ID as display for now
            };
        });
        
        // Load enhanced data into grid
        pmtMgmtSupplierGridApi.setGridOption('rowData', enhancedPayments);
        pmtMgmtSupplierGridApi.setGridOption('loading', false);
        
        // Cache enhanced data
        cachePaymentMetrics(cacheKey, { 
            supplierPayments: enhancedPayments,
            totalReads: totalReads 
        });
        
        console.log(`[PmtMgmt] ✅ Enhanced supplier payments loaded (${totalReads} Firestore reads)`);
        
    } catch (error) {
        console.error('[PmtMgmt] Error loading supplier payments:', error);
        if (pmtMgmtSupplierGridApi) {
            pmtMgmtSupplierGridApi.setGridOption('loading', false);
            pmtMgmtSupplierGridApi.showNoRowsOverlay();
        }
    }
}



/**
 * Initializes supplier payments tab (placeholder)
 */
function initializeSupplierPaymentsTab() {
    console.log('[DEBUG] Initializing Supplier Payments tab...');
    
    const gridContainer = document.getElementById('pmt-mgmt-supplier-grid');
    console.log('[DEBUG] Supplier grid container:', gridContainer);
    
    if (!gridContainer) {
        console.error('[DEBUG] ❌ Supplier payments grid container not found');
        console.log('[DEBUG] Available elements with pmt-mgmt:', 
            Array.from(document.querySelectorAll('[id*="pmt-mgmt"]')).map(el => el.id)
        );
        return;
    }
    
    console.log('[DEBUG] Grid container found, creating grid...');
    console.log('[DEBUG] Container dimensions:', gridContainer.getBoundingClientRect());
    
    if (!pmtMgmtSupplierGridApi) {
        try {
            pmtMgmtSupplierGridApi = createGrid(gridContainer, pmtMgmtSupplierGridOptions);
            console.log('[DEBUG] ✅ Supplier payments grid created successfully');
        } catch (gridError) {
            console.error('[DEBUG] ❌ Error creating supplier grid:', gridError);
        }
    } else {
        console.log('[DEBUG] Supplier grid already exists, loading data...');
        setTimeout(() => {
            loadSupplierPaymentsForMgmtTab();
        }, 100);
    }
    
    setupSupplierPaymentFilters();
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
    const filters = ['all', 'pending', 'overdue', 'today'];
    
    filters.forEach(filter => {
        const button = document.getElementById(`pmt-mgmt-supplier-filter-${filter}`);
        if (button) {
            button.addEventListener('click', () => {
                applySupplierPaymentFilter(filter);
                updateSupplierFilterActiveState(button);
            });
        }
    });
    
    // Search input
    const searchInput = document.getElementById('pmt-mgmt-supplier-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            if (pmtMgmtSupplierGridApi) {
                pmtMgmtSupplierGridApi.setQuickFilter(e.target.value);
            }
        });
    }
    
    console.log('[PmtMgmt] ✅ Supplier payment filters setup');
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
        btn.classList.remove('active');
    });
    activeButton.classList.add('active');
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





console.log('[PmtMgmt] 💳 Payment Management Module loaded successfully');
