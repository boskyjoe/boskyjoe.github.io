import { getState, subscribe } from "../../app/store.js";
import { icons } from "../../shared/icons.js";
import { showToast } from "../../shared/toast.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import {
    fetchCustomerProfileActivity,
    subscribeToCustomers
} from "./repository.js";
import {
    initializeCustomersGrid,
    refreshCustomersGrid,
    updateCustomersGridSearch
} from "./grid.js";

const featureState = {
    customers: [],
    searchTerm: "",
    selectedCustomerId: "",
    profileModalOpen: false,
    profileLoading: false,
    profileActivity: createEmptyCustomerActivity(),
    profileActivityCache: {},
    loadingProfileCustomerId: "",
    unsubscribeCustomers: null,
    initialized: false
};

function createEmptyCustomerActivity() {
    return {
        leads: [],
        portalRequests: [],
        retailSales: []
    };
}

function normalizeText(value) {
    return String(value || "").trim();
}

function escapeHtml(value = "") {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

function formatDate(value) {
    if (!value) return "-";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(value) {
    if (!value) return "-";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatSourceChannelLabel(value) {
    const normalized = normalizeText(value).toLowerCase();
    if (!normalized) return "";

    if (normalized === "lead") return "Enquiry";
    if (normalized === "quote") return "Quote";
    if (normalized === "retail-sale") return "Retail Sale";
    if (normalized === "portal-request" || normalized === "moneta-pickup-portal") return "Portal Request";
    if (normalized === "manual") return "Manual";

    return value;
}

function getCustomerChannelLabels(customer = {}) {
    return Array.isArray(customer.sourceChannels)
        ? customer.sourceChannels.map(formatSourceChannelLabel).filter(Boolean)
        : [];
}

function hasCustomerChannel(customer, channelNames = []) {
    const normalizedChannels = new Set(
        (customer?.sourceChannels || []).map(channel => normalizeText(channel).toLowerCase()).filter(Boolean)
    );

    return channelNames.some(channelName => normalizedChannels.has(channelName));
}

function getCustomersIconMarkup() {
    return icons.users || icons.leads;
}

function formatCustomerStatus(value) {
    const normalized = normalizeText(value) || "active";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function renderCustomerDisplayField(label, value, options = {}) {
    const resolvedValue = normalizeText(value) || (options.fallback || "-");
    const fieldClass = options.full ? "customer-master-display-field field-full" : "customer-master-display-field";
    const valueClass = options.multiline
        ? "customer-master-display-value customer-master-display-value-multiline"
        : "customer-master-display-value";

    return `
        <div class="${fieldClass}">
            <span class="customer-master-display-label">${escapeHtml(label)}</span>
            <div class="${valueClass}" title="${escapeHtml(resolvedValue)}">${escapeHtml(resolvedValue)}</div>
        </div>
    `;
}

function ensureSelectedCustomer() {
    const hasSelected = featureState.customers.some(customer => customer.id === featureState.selectedCustomerId);
    if (hasSelected) return;

    featureState.selectedCustomerId = featureState.customers[0]?.id || "";
}

function getSelectedCustomer() {
    ensureSelectedCustomer();
    return featureState.customers.find(customer => customer.id === featureState.selectedCustomerId) || null;
}

function openCustomerProfile(customerId) {
    if (!customerId) return;

    featureState.selectedCustomerId = customerId;
    featureState.profileModalOpen = true;

    const cachedActivity = featureState.profileActivityCache[customerId];
    featureState.profileActivity = cachedActivity || createEmptyCustomerActivity();
    featureState.profileLoading = !Boolean(cachedActivity);

    renderCustomersView();

    if (!cachedActivity) {
        void loadCustomerProfileActivity(customerId);
    }
}

function closeCustomerProfile() {
    if (!featureState.profileModalOpen) return;
    featureState.profileModalOpen = false;
    renderCustomersView();
}

async function loadCustomerProfileActivity(customerId) {
    if (!customerId || featureState.loadingProfileCustomerId === customerId) return;

    featureState.loadingProfileCustomerId = customerId;

    try {
        const activity = await fetchCustomerProfileActivity(customerId);
        featureState.profileActivityCache[customerId] = activity;

        if (featureState.selectedCustomerId === customerId) {
            featureState.profileActivity = activity;
            featureState.profileLoading = false;

            if (getState().currentRoute === "#/customers" && featureState.profileModalOpen) {
                renderCustomersView();
            }
        }
    } catch (error) {
        console.error("[Moneta] Failed to load customer profile activity:", error);

        if (featureState.selectedCustomerId === customerId) {
            featureState.profileLoading = false;

            if (getState().currentRoute === "#/customers" && featureState.profileModalOpen) {
                renderCustomersView();
            }
        }

        showToast("Could not load linked customer activity.", "error", {
            title: "Customer Master"
        });
    } finally {
        if (featureState.loadingProfileCustomerId === customerId) {
            featureState.loadingProfileCustomerId = "";
        }
    }
}

function shouldListenToCustomers(snapshot = getState()) {
    return snapshot.currentRoute === "#/customers" && Boolean(snapshot.currentUser);
}

function detachCustomersSubscription() {
    if (featureState.unsubscribeCustomers) {
        featureState.unsubscribeCustomers();
        featureState.unsubscribeCustomers = null;
    }
}

function syncCustomersSubscription(snapshot = getState()) {
    if (!shouldListenToCustomers(snapshot)) {
        detachCustomersSubscription();

        if (!snapshot.currentUser) {
            featureState.customers = [];
            featureState.selectedCustomerId = "";
            featureState.profileModalOpen = false;
            featureState.profileLoading = false;
            featureState.profileActivity = createEmptyCustomerActivity();
            featureState.profileActivityCache = {};
            featureState.loadingProfileCustomerId = "";
        }
        return;
    }

    if (featureState.unsubscribeCustomers) return;

    featureState.unsubscribeCustomers = subscribeToCustomers(
        rows => {
            featureState.customers = rows;
            ensureSelectedCustomer();

            if (getState().currentRoute === "#/customers") {
                renderCustomersView();
            }
        },
        error => {
            console.error("[Moneta] Failed to load customer master records:", error);
            showToast("Could not load customer master records.", "error", {
                title: "Customer Master"
            });
        }
    );
}

function getSummaryCounts() {
    return featureState.customers.reduce((summary, customer) => {
        summary.total += 1;
        if (normalizeText(customer.primaryPhone)) summary.withPhone += 1;
        if (normalizeText(customer.primaryEmail)) summary.withEmail += 1;
        if (hasCustomerChannel(customer, ["lead", "quote"])) summary.enquiryLinked += 1;
        if (hasCustomerChannel(customer, ["portal-request", "moneta-pickup-portal"])) summary.portalLinked += 1;
        if (hasCustomerChannel(customer, ["retail-sale"])) summary.retailLinked += 1;
        return summary;
    }, {
        total: 0,
        withPhone: 0,
        withEmail: 0,
        enquiryLinked: 0,
        portalLinked: 0,
        retailLinked: 0
    });
}

function renderSummaryCards() {
    const counts = getSummaryCounts();

    return `
        <div class="customer-master-summary-grid">
            <section class="summary-card">
                <span class="metric-label">Total Customers</span>
                <strong>${counts.total}</strong>
            </section>
            <section class="summary-card">
                <span class="metric-label">Enquiry Linked</span>
                <strong>${counts.enquiryLinked}</strong>
            </section>
            <section class="summary-card">
                <span class="metric-label">Portal Linked</span>
                <strong>${counts.portalLinked}</strong>
            </section>
            <section class="summary-card">
                <span class="metric-label">Retail Linked</span>
                <strong>${counts.retailLinked}</strong>
            </section>
        </div>
    `;
}

function renderWorkspace() {
    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${getCustomersIconMarkup()}</span>
                    <div>
                        <h2>Customer Master</h2>
                        <p class="panel-copy">Search one linked customer spine across enquiries, portal requests, and completed retail sales.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span id="customer-master-total-pill" class="status-pill">${featureState.customers.length} customers</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Customer Directory</p>
                        <p class="panel-copy">Use the grid to inspect linked customer records and open the customer profile workspace.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="customer-master-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search by customer id, name, phone, email, or linked channel"
                            value="${escapeHtml(featureState.searchTerm)}">
                    </div>
                </div>
                <div class="ag-shell customer-master-grid-shell">
                    <div id="customers-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function buildLeadReference(lead = {}) {
    const businessLeadId = normalizeText(lead.businessLeadId);
    return businessLeadId || (lead.id ? `LEAD-${lead.id.slice(-6).toUpperCase()}` : "-");
}

function buildPortalRequestReference(request = {}) {
    const requestId = normalizeText(request.requestId);
    return requestId || (request.id ? `REQ-${request.id.slice(-6).toUpperCase()}` : "-");
}

function buildRetailSaleReference(sale = {}) {
    const saleNumber = normalizeText(sale.manualVoucherNumber || sale.saleId);
    return saleNumber || (sale.id ? `SALE-${sale.id.slice(-6).toUpperCase()}` : "-");
}

function renderActivityEmptyState(message) {
    return `<div class="customer-master-empty-state">${escapeHtml(message)}</div>`;
}

function renderActivityLoadingState() {
    return `<div class="customer-master-empty-state">Loading linked activity...</div>`;
}

function renderLeadActivityItem(lead) {
    const leadStatus = normalizeText(lead.leadStatus) || "New";
    const leadSource = normalizeText(lead.leadSource) || "-";

    return `
        <article class="customer-master-activity-item">
            <div class="customer-master-activity-item-head">
                <div>
                    <h4>${escapeHtml(buildLeadReference(lead))}</h4>
                    <p>${escapeHtml(formatDate(lead.enquiryDate))} • ${escapeHtml(leadSource)}</p>
                </div>
                <span class="status-pill">${escapeHtml(leadStatus)}</span>
            </div>
            <div class="customer-master-activity-item-grid">
                <div><span class="customer-master-activity-label">Expected Delivery</span><strong>${escapeHtml(formatDate(lead.expectedDeliveryDate))}</strong></div>
                <div><span class="customer-master-activity-label">Store</span><strong>${escapeHtml(normalizeText(lead.preferredStore) || "-")}</strong></div>
            </div>
        </article>
    `;
}

function renderPortalRequestActivityItem(request) {
    const pickupSchedule = [normalizeText(request.pickupDate), normalizeText(request.pickupTime)]
        .filter(Boolean)
        .join(" • ");

    return `
        <article class="customer-master-activity-item">
            <div class="customer-master-activity-item-head">
                <div>
                    <h4>${escapeHtml(buildPortalRequestReference(request))}</h4>
                    <p>${escapeHtml(formatDateTime(request.submittedAt))} • ${escapeHtml(pickupSchedule || "-")}</p>
                </div>
                <div class="customer-master-activity-pill-stack">
                    <span class="status-pill">${escapeHtml(normalizeText(request.status) || "new")}</span>
                    <span class="status-pill">${escapeHtml(normalizeText(request.conversionStatus) || "not_converted")}</span>
                </div>
            </div>
            <div class="customer-master-activity-item-grid">
                <div><span class="customer-master-activity-label">Location</span><strong>${escapeHtml(normalizeText(request.pickupLocation) || "-")}</strong></div>
                <div><span class="customer-master-activity-label">Submitted Total</span><strong>${escapeHtml(formatCurrency(request.subtotal || 0))}</strong></div>
            </div>
        </article>
    `;
}

function renderRetailSaleActivityItem(sale) {
    const total = Number(sale.financials?.grandTotal) || 0;
    const sourceLabel = formatSourceChannelLabel(sale.sourceType || "retail-sale") || "-";

    return `
        <article class="customer-master-activity-item">
            <div class="customer-master-activity-item-head">
                <div>
                    <h4>${escapeHtml(buildRetailSaleReference(sale))}</h4>
                    <p>${escapeHtml(formatDate(sale.saleDate))} • ${escapeHtml(sourceLabel)}</p>
                </div>
                <div class="customer-master-activity-pill-stack">
                    <span class="status-pill">${escapeHtml(normalizeText(sale.saleStatus) || "Active")}</span>
                    <span class="status-pill">${escapeHtml(normalizeText(sale.paymentStatus) || "Unpaid")}</span>
                </div>
            </div>
            <div class="customer-master-activity-item-grid">
                <div><span class="customer-master-activity-label">Store</span><strong>${escapeHtml(normalizeText(sale.store) || "-")}</strong></div>
                <div><span class="customer-master-activity-label">Grand Total</span><strong>${escapeHtml(formatCurrency(total))}</strong></div>
            </div>
        </article>
    `;
}

function renderRelatedActivitySection(config) {
    const count = Array.isArray(config.rows) ? config.rows.length : 0;
    const bodyMarkup = config.loading
        ? renderActivityLoadingState()
        : count
            ? `
                <div class="customer-master-activity-list">
                    ${config.rows.map(config.renderItem).join("")}
                </div>
            `
            : renderActivityEmptyState(config.emptyMessage);

    return `
        <section class="panel-card customer-master-related-panel">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${config.icon}</span>
                    <div>
                        <h3>${escapeHtml(config.title)}</h3>
                        <p class="panel-copy">${escapeHtml(config.copy)}</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${config.loading ? "Loading" : `${count} linked`}</span>
                </div>
            </div>
            <div class="panel-body">
                ${bodyMarkup}
            </div>
        </section>
    `;
}

function renderProfileModal(customer) {
    const channelLabels = getCustomerChannelLabels(customer);
    const activity = featureState.profileActivity;
    const sourceChannelsLabel = channelLabels.length ? channelLabels.join(", ") : "-";

    return `
        <div id="customer-master-profile-modal" class="purchase-payment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="customer-master-profile-title">
            <div class="purchase-payment-modal-card customer-master-profile-modal-card">
                <div class="panel-header panel-header-accent purchase-payment-modal-header">
                    <div class="purchase-payment-modal-title-row">
                        <span class="panel-icon panel-icon-alt">${getCustomersIconMarkup()}</span>
                        <div>
                            <h3 id="customer-master-profile-title">Customer Profile</h3>
                            <p class="panel-copy">Review the unified customer snapshot and inspect linked activity across enquiries, portal intake, and retail sales.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta purchase-payment-modal-meta">
                        <span class="status-pill">${escapeHtml(customer.id)}</span>
                        <span class="status-pill">${escapeHtml(formatCustomerStatus(customer.status))}</span>
                    </div>
                </div>
                <div class="panel-body purchase-payment-modal-body customer-master-profile-body">
                    <div class="customer-master-profile-layout">
                        <section class="workspace-form-section customer-master-profile-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Customer Snapshot</p>
                                <p class="panel-copy">Primary contact details and the current canonical identity Moneta is using for linked records.</p>
                            </div>
                            <div class="workspace-form-section-grid customer-master-display-grid">
                                ${renderCustomerDisplayField("Customer Name", customer.displayName)}
                                ${renderCustomerDisplayField("Phone", customer.primaryPhone)}
                                ${renderCustomerDisplayField("Email", customer.primaryEmail)}
                                ${renderCustomerDisplayField("Status", formatCustomerStatus(customer.status))}
                                ${renderCustomerDisplayField("Address", customer.primaryAddress, { full: true, multiline: true })}
                            </div>
                        </section>

                        <section class="workspace-form-section customer-master-profile-section">
                            <div class="workspace-form-section-head">
                                <p class="workspace-form-section-kicker">Relationship Summary</p>
                                <p class="panel-copy">Track when this customer entered Moneta, which channels have linked activity, and the most recent operational touchpoint.</p>
                            </div>
                            <div class="workspace-form-section-grid customer-master-display-grid">
                                ${renderCustomerDisplayField("Customer ID", customer.id)}
                                ${renderCustomerDisplayField("First Seen", formatDateTime(customer.firstSeenAt))}
                                ${renderCustomerDisplayField("Last Seen", formatDateTime(customer.lastSeenAt))}
                                ${renderCustomerDisplayField("Last Purchase", formatDate(customer.lastPurchaseOn))}
                                ${renderCustomerDisplayField("First Seen Source", formatSourceChannelLabel(customer.firstSeenSource) || "-")}
                                ${renderCustomerDisplayField("Last Activity Source", formatSourceChannelLabel(customer.lastActivitySource) || "-")}
                                ${renderCustomerDisplayField("Linked Channels", sourceChannelsLabel, { full: true, multiline: true })}
                            </div>
                        </section>
                    </div>

                    <div class="customer-master-activity-summary-grid">
                        <section class="summary-card">
                            <p class="summary-label">Enquiries</p>
                            <p class="summary-value">${featureState.profileLoading ? "…" : activity.leads.length}</p>
                        </section>
                        <section class="summary-card">
                            <p class="summary-label">Portal Requests</p>
                            <p class="summary-value">${featureState.profileLoading ? "…" : activity.portalRequests.length}</p>
                        </section>
                        <section class="summary-card">
                            <p class="summary-label">Retail Sales</p>
                            <p class="summary-value">${featureState.profileLoading ? "…" : activity.retailSales.length}</p>
                        </section>
                    </div>

                    <div class="customer-master-related-grid">
                        ${renderRelatedActivitySection({
                            title: "Enquiries",
                            copy: "Lead records linked to this customer master.",
                            icon: icons.leads,
                            rows: activity.leads,
                            loading: featureState.profileLoading,
                            emptyMessage: "No linked enquiries yet.",
                            renderItem: renderLeadActivityItem
                        })}
                        ${renderRelatedActivitySection({
                            title: "Portal Requests",
                            copy: "Pickup portal requests linked to this customer master.",
                            icon: icons.portalRequests,
                            rows: activity.portalRequests,
                            loading: featureState.profileLoading,
                            emptyMessage: "No linked portal requests yet.",
                            renderItem: renderPortalRequestActivityItem
                        })}
                        ${renderRelatedActivitySection({
                            title: "Retail Sales",
                            copy: "Completed retail sales linked to this customer master.",
                            icon: icons.retail,
                            rows: activity.retailSales,
                            loading: featureState.profileLoading,
                            emptyMessage: "No linked retail sales yet.",
                            renderItem: renderRetailSaleActivityItem
                        })}
                    </div>

                    <div class="form-actions">
                        <button id="customer-master-close-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.close}</span>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderCustomersShell() {
    return `
        <div class="section-stack">
            <div id="customer-master-summary-host">${renderSummaryCards()}</div>
            ${renderWorkspace()}
            <div id="customer-master-modal-host"></div>
        </div>
    `;
}

function bindCustomersRootEvents(root) {
    if (!root || root.dataset.customerMasterBound === "true") return;

    root.addEventListener("click", handleCustomersRootClick);
    root.dataset.customerMasterBound = "true";
}

function bindCustomersPersistentEvents(root) {
    const searchInput = root.querySelector("#customer-master-search");
    if (searchInput && searchInput.dataset.customerMasterBound !== "true") {
        searchInput.addEventListener("input", event => {
            featureState.searchTerm = event.target.value || "";
            updateCustomersGridSearch(featureState.searchTerm);
        });
        searchInput.dataset.customerMasterBound = "true";
    }
}

function syncCustomersSummaryAndMeta(root) {
    const summaryHost = root.querySelector("#customer-master-summary-host");
    if (summaryHost) {
        summaryHost.innerHTML = renderSummaryCards();
    }

    const totalPill = root.querySelector("#customer-master-total-pill");
    if (totalPill) {
        totalPill.textContent = `${featureState.customers.length} customers`;
    }

    const searchInput = root.querySelector("#customer-master-search");
    if (searchInput && searchInput.value !== featureState.searchTerm) {
        searchInput.value = featureState.searchTerm;
    }
}

function syncCustomerProfileModal(root) {
    const modalHost = root.querySelector("#customer-master-modal-host");
    if (!modalHost) return;

    const customer = getSelectedCustomer();
    const shouldRenderModal = featureState.profileModalOpen && customer;
    modalHost.innerHTML = shouldRenderModal ? renderProfileModal(customer) : "";
}

function syncCustomersGrid() {
    initializeCustomersGrid(document.getElementById("customers-grid"), {
        onRowClicked: customer => {
            if (!customer?.id) return;
            openCustomerProfile(customer.id);
        }
    });
    refreshCustomersGrid(featureState.customers);
    updateCustomersGridSearch(featureState.searchTerm);
}

function handleCustomersRootClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const reviewButton = target.closest(".customer-master-review-button");
    if (reviewButton) {
        openCustomerProfile(reviewButton.dataset.customerId || "");
        return;
    }

    if (target.id === "customer-master-profile-modal") {
        closeCustomerProfile();
        return;
    }

    if (target.closest("#customer-master-close-button")) {
        closeCustomerProfile();
    }
}

export function renderCustomersView() {
    const root = document.getElementById("customers-root");
    if (!root) return;

    ensureSelectedCustomer();
    bindCustomersRootEvents(root);

    if (root.dataset.customerMasterShellMounted !== "true") {
        root.innerHTML = renderCustomersShell();
        root.dataset.customerMasterShellMounted = "true";
    }

    syncCustomersSummaryAndMeta(root);
    syncCustomerProfileModal(root);
    bindCustomersPersistentEvents(root);
    syncCustomersGrid();
}

export function initializeCustomersFeature() {
    if (featureState.initialized) return;
    featureState.initialized = true;

    subscribe(snapshot => {
        syncCustomersSubscription(snapshot);

        if (snapshot.currentRoute === "#/customers") {
            renderCustomersView();
        }
    });

    syncCustomersSubscription(getState());
}
