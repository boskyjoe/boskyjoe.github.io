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
import { 
    showModal,
    formatCurrency,
    createGrid,
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

// ===================================================================
// DASHBOARD DATA MANAGEMENT
// ===================================================================

/**
 * Refreshes all payment management dashboard data
 */
async function refreshPaymentManagementDashboard() {
    console.log('[PmtMgmt] 🔄 Refreshing dashboard data...');
    
    try {
        ProgressToast.show('Refreshing Payment Data', 'info');
        ProgressToast.updateProgress('Loading payment information...', 50);
        
        // Load aggregated metrics (will implement in next step)
        const metrics = await loadPaymentMgmtMetrics();
        
        // Update dashboard cards
        updatePaymentMgmtDashboardCards(metrics);
        
        // Update last refresh time
        pmtMgmtState.lastRefreshTime = new Date();
        const refreshElement = document.getElementById('pmt-mgmt-last-refresh');
        if (refreshElement) {
            refreshElement.textContent = pmtMgmtState.lastRefreshTime.toLocaleTimeString();
        }
        
        ProgressToast.updateProgress('Dashboard updated successfully!', 100);
        
        setTimeout(() => {
            ProgressToast.hide(300);
        }, 800);
        
        console.log('[PmtMgmt] ✅ Dashboard refresh completed');
        
    } catch (error) {
        console.error('[PmtMgmt] Dashboard refresh failed:', error);
        ProgressToast.showError('Failed to refresh dashboard data');
        
        setTimeout(() => {
            showModal('error', 'Refresh Failed', 
                'Could not refresh payment management data. Please try again.'
            );
        }, 1500);
    }
}

/**
 * Placeholder: Load payment metrics (will implement data aggregation)
 */
async function loadPaymentMgmtMetrics() {
    // TODO: Implement data aggregation in next step
    console.log('[PmtMgmt] Loading payment metrics (placeholder)');
    
    return {
        urgentCount: 0,
        pendingCount: 0,
        receivablesAmount: 0,
        payablesAmount: 0,
        todayCount: 0,
        todayAmount: 0
    };
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
 * Initializes supplier payments tab (placeholder)
 */
function initializeSupplierPaymentsTab() {
    console.log('[PmtMgmt] TODO: Initialize supplier payments tab');
    // Will implement: reuse existing supplier payment grid
}

/**
 * Initializes team payments tab (placeholder)
 */
function initializeTeamPaymentsTab() {
    console.log('[PmtMgmt] TODO: Initialize team payments tab');
    // Will implement: reuse existing consignment payment grid
}

/**
 * Initializes sales payments tab (placeholder)
 */
function initializeSalesPaymentsTab() {
    console.log('[PmtMgmt] TODO: Initialize sales payments tab');
    // Will implement: reuse existing sales payment grid
}



console.log('[PmtMgmt] 💳 Payment Management Module loaded successfully');
