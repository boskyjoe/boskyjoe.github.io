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
// INTELLIGENT CACHING SYSTEM (FREE TIER OPTIMIZATION)
// ===================================================================

/**
 * Gets cached payment metrics if still fresh
 */
function getCachedPaymentMetrics(cacheKey) {
    try {
        const cached = localStorage.getItem(`pmt_mgmt_${cacheKey}`);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
        
        // ✅ 5-MINUTE CACHE: Balance between freshness and read optimization
        if (ageMinutes < 5) {
            console.log(`[PmtMgmt] Using cached metrics (${ageMinutes.toFixed(1)} min old)`);
            return data;
        } else {
            console.log(`[PmtMgmt] Cache expired (${ageMinutes.toFixed(1)} min old), fetching fresh data`);
            localStorage.removeItem(`pmt_mgmt_${cacheKey}`);
            return null;
        }
        
    } catch (error) {
        console.warn('[PmtMgmt] Error reading cache:', error);
        return null;
    }
}

/**
 * Caches payment metrics for future use
 */
function cachePaymentMetrics(cacheKey, metrics) {
    try {
        const cacheData = {
            data: metrics,
            timestamp: Date.now(),
            version: '1.0.0'
        };
        
        localStorage.setItem(`pmt_mgmt_${cacheKey}`, JSON.stringify(cacheData));
        console.log(`[PmtMgmt] ✅ Cached metrics for 5 minutes (${metrics.totalFirestoreReads} reads saved)`);
        
    } catch (error) {
        console.warn('[PmtMgmt] Error caching metrics:', error);
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
