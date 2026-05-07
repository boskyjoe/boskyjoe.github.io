import { getState, subscribe } from "../../app/store.js";
import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import { icons } from "../../shared/icons.js";
import {
    initializePortalRequestItemsGrid,
    initializePortalRequestsGrid,
    refreshPortalRequestItemsGrid,
    refreshPortalRequestsGrid,
    updatePortalRequestsGridSearch
} from "./grid.js";
import { subscribeToPortalRequests } from "./repository.js";
import {
    buildPortalRequestToRetailConversionDraft,
    canPreparePortalRequestForRetail,
    getPortalRequestAddress,
    getPortalRequestConversionStatusLabel,
    getPortalRequestItems,
    getPortalRequestRequestId,
    getPortalRequestStatusLabel,
    markPortalRequestPreparedForRetail,
    PORTAL_REQUEST_STATUSES,
    savePortalRequestReview
} from "./service.js";

const RETAIL_ROUTE = "#/retail-store";
const RETAIL_CONVERSION_STORAGE_KEY = "moneta.pendingLeadRetailConversion";

const featureState = {
    requests: [],
    searchTerm: "",
    selectedRequestId: "",
    reviewModalOpen: false,
    unsubscribeRequests: null,
    initialized: false
};

function normalizeText(value) {
    return String(value || "").trim();
}

function escapeHtml(value = "") {
    return String(value)
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

function ensureSelectedRequest() {
    const hasSelected = featureState.requests.some(request => request.id === featureState.selectedRequestId);
    if (hasSelected) return;

    featureState.selectedRequestId = featureState.requests[0]?.id || "";
}

function getSelectedRequest() {
    ensureSelectedRequest();
    return featureState.requests.find(request => request.id === featureState.selectedRequestId) || null;
}

function openPortalRequestReview(requestId) {
    if (!requestId) return;
    featureState.selectedRequestId = requestId;
    featureState.reviewModalOpen = true;
    renderPortalRequestsView();
}

function closePortalRequestReview() {
    if (!featureState.reviewModalOpen) return;
    featureState.reviewModalOpen = false;
    renderPortalRequestsView();
}

function shouldListenToPortalRequests(snapshot = getState()) {
    return snapshot.currentRoute === "#/portal-requests" && Boolean(snapshot.currentUser);
}

function detachPortalRequestsSubscription() {
    if (featureState.unsubscribeRequests) {
        featureState.unsubscribeRequests();
        featureState.unsubscribeRequests = null;
    }
}

function syncPortalRequestsSubscription(snapshot = getState()) {
    if (!shouldListenToPortalRequests(snapshot)) {
        detachPortalRequestsSubscription();

        if (!snapshot.currentUser) {
            featureState.requests = [];
            featureState.selectedRequestId = "";
        }
        return;
    }

    if (featureState.unsubscribeRequests) return;

    featureState.unsubscribeRequests = subscribeToPortalRequests(
        rows => {
            featureState.requests = rows;
            ensureSelectedRequest();

            if (getState().currentRoute === "#/portal-requests") {
                renderPortalRequestsView();
            }
        },
        error => {
            console.error("[Moneta] Failed to load portal requests:", error);
            showToast("Could not load portal requests.", "error", {
                title: "Portal Requests"
            });
        }
    );
}

function getSummaryCounts() {
    return featureState.requests.reduce((summary, request) => {
        const statusLabel = getPortalRequestStatusLabel(request.status);
        const conversionLabel = getPortalRequestConversionStatusLabel(request.conversionStatus);

        summary.total += 1;
        summary.byStatus[statusLabel] = (summary.byStatus[statusLabel] || 0) + 1;
        summary.byConversion[conversionLabel] = (summary.byConversion[conversionLabel] || 0) + 1;
        return summary;
    }, {
        total: 0,
        byStatus: {},
        byConversion: {}
    });
}

function renderSummaryCards() {
    const counts = getSummaryCounts();

    return `
        <div class="portal-request-summary-grid">
            <section class="summary-card">
                <span class="metric-label">Total Requests</span>
                <strong>${counts.total}</strong>
            </section>
            <section class="summary-card">
                <span class="metric-label">New</span>
                <strong>${counts.byStatus.New || 0}</strong>
            </section>
            <section class="summary-card">
                <span class="metric-label">Accepted</span>
                <strong>${counts.byStatus.Accepted || 0}</strong>
            </section>
            <section class="summary-card">
                <span class="metric-label">Prepared</span>
                <strong>${counts.byConversion.Prepared || 0}</strong>
            </section>
        </div>
    `;
}

function renderQueueCard() {
    const totalRequests = featureState.requests.length;
    const newRequests = featureState.requests.filter(request => getPortalRequestStatusLabel(request.status) === "New").length;

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.portalRequests}</span>
                    <div>
                        <h2>Portal Request Queue</h2>
                        <p class="panel-copy">Review pickup requests synced from the public portal, track decisions, and prepare them for Retail Store.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${totalRequests} requests</span>
                    <span class="status-pill">${newRequests} new</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Portal Intake</p>
                        <p class="panel-copy">Use the grid to inspect incoming requests and open the review workspace.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="portal-requests-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search by request id, customer, email, phone, or status"
                            value="${escapeHtml(featureState.searchTerm)}">
                    </div>
                </div>
                <div class="ag-shell portal-requests-grid-shell">
                    <div id="portal-requests-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function renderReviewModal(request) {
    const items = getPortalRequestItems(request);
    const prepareGate = canPreparePortalRequestForRetail(request);

    return `
        <div id="portal-request-review-modal" class="purchase-payment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="portal-request-review-title">
            <div class="purchase-payment-modal-card portal-request-review-modal-card">
                <div class="panel-header panel-header-accent purchase-payment-modal-header">
                    <div class="purchase-payment-modal-title-row">
                        <span class="panel-icon panel-icon-alt">${icons.portalRequests}</span>
                        <div>
                            <h3 id="portal-request-review-title">Request Review</h3>
                            <p class="panel-copy">Review the shopper details, update the request state, and prepare a Retail Store handoff when ready.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta purchase-payment-modal-meta">
                        <span class="status-pill">${escapeHtml(getPortalRequestRequestId(request))}</span>
                        <span class="status-pill">${escapeHtml(getPortalRequestStatusLabel(request.status))}</span>
                        <span class="status-pill">${escapeHtml(getPortalRequestConversionStatusLabel(request.conversionStatus))}</span>
                    </div>
                </div>
                <div class="panel-body purchase-payment-modal-body portal-request-review-modal-body">
                    <form id="portal-request-form">
                        <input id="portal-request-doc-id" type="hidden" value="${escapeHtml(request.id)}">
                        <div class="workspace-form-sections portal-request-form-sections">
                            <section class="workspace-form-section">
                                <div class="workspace-form-section-head">
                                    <p class="workspace-form-section-kicker">Customer & Pickup</p>
                                    <p class="panel-copy">Read-only shopper information captured from the public pickup portal.</p>
                                </div>
                                <div class="workspace-form-section-grid">
                                    <div class="field">
                                        <label>Customer Name</label>
                                        <input class="input" type="text" value="${escapeHtml(request.customerName || "-")}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Email</label>
                                        <input class="input" type="text" value="${escapeHtml(request.customerEmail || "-")}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Phone</label>
                                        <input class="input" type="text" value="${escapeHtml(request.customerPhone || "-")}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Pickup Date</label>
                                        <input class="input" type="text" value="${escapeHtml(request.pickupDate || "-")}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Pickup Time</label>
                                        <input class="input" type="text" value="${escapeHtml(request.pickupTime || "-")}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Pickup Location</label>
                                        <input class="input" type="text" value="${escapeHtml(request.pickupLocation || "-")}" readonly>
                                    </div>
                                    <div class="field field-full">
                                        <label>Address</label>
                                        <textarea class="textarea" readonly>${escapeHtml(getPortalRequestAddress(request) || "-")}</textarea>
                                    </div>
                                    <div class="field field-full">
                                        <label>Customer Notes</label>
                                        <textarea class="textarea" readonly>${escapeHtml(request.notes || "-")}</textarea>
                                    </div>
                                </div>
                            </section>

                            <section class="workspace-form-section">
                                <div class="workspace-form-section-head">
                                    <p class="workspace-form-section-kicker">Request Context</p>
                                    <p class="panel-copy">Track the request state, source metadata, and linked catalogue context.</p>
                                </div>
                                <div class="workspace-form-section-grid">
                                    <div class="field">
                                        <label>Request ID</label>
                                        <input class="input" type="text" value="${escapeHtml(getPortalRequestRequestId(request))}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Submitted On</label>
                                        <input class="input" type="text" value="${escapeHtml(formatDateTime(request.submittedAt))}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Current Status</label>
                                        <select id="portal-request-status" class="select">
                                            ${PORTAL_REQUEST_STATUSES.map(status => `
                                                <option value="${status}" ${status === request.status ? "selected" : ""}>${getPortalRequestStatusLabel(status)}</option>
                                            `).join("")}
                                        </select>
                                    </div>
                                    <div class="field">
                                        <label>Conversion Status</label>
                                        <input class="input" type="text" value="${escapeHtml(getPortalRequestConversionStatusLabel(request.conversionStatus))}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Catalogue</label>
                                        <input class="input" type="text" value="${escapeHtml(request.catalogueName || request.catalogueId || "-")}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Source</label>
                                        <input class="input" type="text" value="${escapeHtml(request.source || "-")}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Item Count</label>
                                        <input class="input" type="text" value="${escapeHtml(String(request.itemCount || items.length || 0))}" readonly>
                                    </div>
                                    <div class="field">
                                        <label>Submitted Total</label>
                                        <input class="input" type="text" value="${escapeHtml(formatCurrency(request.subtotal || 0))}" readonly>
                                    </div>
                                </div>
                            </section>

                            <section class="workspace-form-section">
                                <div class="workspace-form-section-head">
                                    <p class="workspace-form-section-kicker">Review Notes</p>
                                    <p class="panel-copy">Capture staff notes and update the request state before fulfilment prep.</p>
                                </div>
                                <div class="workspace-form-section-grid">
                                    <div class="field field-full">
                                        <label for="portal-request-internal-review-note">Internal Review Note</label>
                                        <textarea id="portal-request-internal-review-note" class="textarea" placeholder="Internal note for the sales team">${escapeHtml(request.internalReviewNote || "")}</textarea>
                                    </div>
                                    <div class="field field-full">
                                        <label for="portal-request-action-note">Decision Note</label>
                                        <textarea id="portal-request-action-note" class="textarea" placeholder="Reason for acceptance, rejection, cancellation, or fulfilment">${escapeHtml(request.actionNote || "")}</textarea>
                                    </div>
                                </div>
                            </section>
                        </div>
                        <div class="form-actions">
                            <button class="button button-primary" type="submit">
                                <span class="button-icon">${icons.edit}</span>
                                Save Update
                            </button>
                            <button
                                id="portal-request-prepare-button"
                                class="button button-secondary"
                                type="button"
                                ${prepareGate.allowed ? "" : `disabled title="${escapeHtml(prepareGate.reason)}" data-disabled-reason="${escapeHtml(prepareGate.reason)}"`}>
                                <span class="button-icon">${icons.retail}</span>
                                Prepare Retail Sale
                            </button>
                            <button id="portal-request-close-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.close}</span>
                                Close
                            </button>
                        </div>
                    </form>

                    <section class="portal-request-items-panel">
                        <div class="portal-request-items-panel-head">
                            <div>
                                <p class="workspace-form-section-kicker">Requested Items</p>
                                <p class="panel-copy">Snapshot lines received from the public pickup portal before any staff adjustments.</p>
                            </div>
                            <div class="toolbar-meta">
                                <span class="status-pill">${getPortalRequestItems(request).length} lines</span>
                                <span class="status-pill">${formatCurrency(request.subtotal || 0)} total</span>
                            </div>
                        </div>
                        <div class="ag-shell portal-request-items-grid-shell">
                            <div id="portal-request-items-grid" class="ag-theme-alpine moneta-grid ag-shell-compact" style="height: 320px; width: 100%;"></div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    `;
}

function renderWorkspace() {
    return renderQueueCard();
}

function bindPortalRequestsRootEvents(root) {
    if (!root || root.dataset.portalRequestsBound === "true") return;

    root.addEventListener("click", handlePortalRequestsRootClick);
    root.dataset.portalRequestsBound = "true";
}

function syncPortalRequestsGrid() {
    initializePortalRequestsGrid(document.getElementById("portal-requests-grid"), {
        onRowClicked: request => {
            if (!request?.id) return;
            openPortalRequestReview(request.id);
        }
    });
    refreshPortalRequestsGrid(featureState.requests);
    updatePortalRequestsGridSearch(featureState.searchTerm);
}

function syncPortalRequestItemsGrid() {
    const request = getSelectedRequest();
    const gridElement = document.getElementById("portal-request-items-grid");
    if (!featureState.reviewModalOpen || !request || !gridElement) return;

    const rows = getPortalRequestItems(request).map(item => ({
        name: item.name || item.productName || "Untitled Product",
        categoryName: item.categoryName || "-",
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        lineTotal: Number(item.lineTotal) || ((Number(item.quantity) || 0) * (Number(item.price) || 0))
    }));

    initializePortalRequestItemsGrid(gridElement);
    refreshPortalRequestItemsGrid(rows);
}

export function renderPortalRequestsView() {
    const root = document.getElementById("portal-requests-root");
    if (!root) return;

    ensureSelectedRequest();
    bindPortalRequestsRootEvents(root);
    root.innerHTML = `
        <div class="section-stack">
            ${renderSummaryCards()}
            ${renderWorkspace()}
            ${featureState.reviewModalOpen && getSelectedRequest() ? renderReviewModal(getSelectedRequest()) : ""}
        </div>
    `;

    syncPortalRequestsGrid();
    syncPortalRequestItemsGrid();

    root.querySelector("#portal-requests-search")?.addEventListener("input", event => {
        featureState.searchTerm = event.target.value || "";
        updatePortalRequestsGridSearch(featureState.searchTerm);
    });

    root.querySelector("#portal-request-form")?.addEventListener("submit", handlePortalRequestSubmit);
    root.querySelector("#portal-request-prepare-button")?.addEventListener("click", () => {
        const request = getSelectedRequest();
        if (request) {
            void handlePrepareRetailConversion(request);
        }
    });
    root.querySelector("#portal-request-close-button")?.addEventListener("click", closePortalRequestReview);
}

async function handlePortalRequestSubmit(event) {
    event.preventDefault();

    const request = getSelectedRequest();
    if (!request) {
        showToast("Select a portal request first.", "warning", {
            title: "Portal Requests"
        });
        return;
    }

    const snapshot = getState();
    const user = snapshot.currentUser;

    try {
        const status = document.getElementById("portal-request-status")?.value || request.status;
        const internalReviewNote = document.getElementById("portal-request-internal-review-note")?.value || "";
        const actionNote = document.getElementById("portal-request-action-note")?.value || "";

        const result = await runProgressToastFlow({
            title: "Updating Portal Request",
            initialMessage: "Reading request review changes...",
            initialProgress: 18,
            initialStep: "Step 1 of 4",
            successTitle: "Portal Request Updated",
            successMessage: "The portal request review is now up to date."
        }, async ({ update }) => {
            update("Validating request status and review notes...", 42, "Step 2 of 4");
            const result = await savePortalRequestReview({
                status,
                internalReviewNote,
                actionNote
            }, request, user);
            update("Writing portal request changes...", 78, "Step 3 of 4");
            update("Portal request workspace is in sync.", 96, "Step 4 of 4");
            return result;
        });

        showToast("Portal request updated.", "success", {
            title: "Portal Requests"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Portal Request Updated",
            message: "The request review was saved successfully.",
            details: [
                { label: "Request", value: getPortalRequestRequestId(request) },
                { label: "New Status", value: result.statusLabel }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Portal request update failed:", error);
        showToast(error?.message || "Could not update this portal request.", "error", {
            title: "Portal Requests"
        });
    }
}

async function handlePrepareRetailConversion(request) {
    const snapshot = getState();
    const user = snapshot.currentUser;

    try {
        const conversionDraft = await runProgressToastFlow({
            title: "Preparing Retail Conversion",
            initialMessage: "Reading portal request and requested items...",
            initialProgress: 18,
            initialStep: "Step 1 of 4",
            successTitle: "Retail Conversion Ready",
            successMessage: "The portal request is ready to open in Retail Store."
        }, async ({ update }) => {
            update("Validating request status, linked catalogue, and product snapshot...", 42, "Step 2 of 4");
            const conversionDraft = await buildPortalRequestToRetailConversionDraft(request, snapshot.masterData);
            update("Preparing Retail Store line items from current catalogue pricing...", 76, "Step 3 of 4");
            update("Retail conversion package prepared.", 96, "Step 4 of 4");
            return conversionDraft;
        });

        if ((conversionDraft.warnings || []).length > 0) {
            const warningDetails = conversionDraft.warnings
                .slice(0, 5)
                .map((warning, index) => ({
                    label: `Check ${index + 1}`,
                    value: warning
                }));

            const confirmed = await showConfirmationModal({
                title: "Conversion Checks Found",
                message: "Some checks need review before opening Retail Store.",
                details: warningDetails,
                note: conversionDraft.warnings.length > 5
                    ? `${conversionDraft.warnings.length - 5} more check(s) were detected. Proceed to continue with conversion and review in Retail Store.`
                    : "Proceed to continue with conversion and review in Retail Store before saving the sale.",
                confirmText: "Proceed",
                cancelText: "Cancel",
                tone: "warning"
            });

            if (!confirmed) {
                ProgressToast.hide(0);
                showToast("Retail conversion cancelled.", "info", {
                    title: "Portal Requests"
                });
                return;
            }
        }

        await markPortalRequestPreparedForRetail(request, user);

        const conversionPackage = {
            sourceType: conversionDraft.sourceType || "portal-request",
            leadId: conversionDraft.leadId,
            businessLeadId: conversionDraft.businessLeadId,
            sourceQuoteId: "",
            sourceQuoteNumber: "",
            sourceQuoteStatus: "",
            customerName: conversionDraft.customerName,
            customerPhone: conversionDraft.customerPhone,
            customerEmail: conversionDraft.customerEmail,
            customerAddress: conversionDraft.customerAddress,
            catalogueId: conversionDraft.catalogueId,
            catalogueName: conversionDraft.catalogueName,
            preferredStore: conversionDraft.preferredStore || "",
            leadNotes: conversionDraft.leadNotes,
            items: conversionDraft.items,
            warnings: conversionDraft.warnings || [],
            createdAt: Date.now()
        };

        sessionStorage.setItem(RETAIL_CONVERSION_STORAGE_KEY, JSON.stringify(conversionPackage));
        ProgressToast.hide(0);
        showToast("Portal request loaded. Opening Retail Store workspace...", "success", {
            title: "Portal Requests"
        });
        window.location.hash = RETAIL_ROUTE;
    } catch (error) {
        console.error("[Moneta] Portal request retail conversion prep failed:", error);
        ProgressToast.hide(0);
        showToast(error?.message || "Could not prepare this portal request for retail conversion.", "error", {
            title: "Portal Requests"
        });
    }
}

function handlePortalRequestsRootClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const reviewButton = target.closest(".portal-request-review-button");
    if (reviewButton) {
        openPortalRequestReview(reviewButton.dataset.requestId || "");
        return;
    }

    const prepareButton = target.closest(".portal-request-prepare-button");
    if (prepareButton) {
        const requestId = prepareButton.dataset.requestId || "";
        const request = featureState.requests.find(entry => entry.id === requestId) || null;
        if (!request) {
            showToast("Portal request record could not be found.", "error", {
                title: "Portal Requests"
            });
            return;
        }

        featureState.selectedRequestId = requestId;
        void handlePrepareRetailConversion(request);
        return;
    }

    const reviewModalBackdrop = target.closest("#portal-request-review-modal");
    if (target.id === "portal-request-review-modal" && reviewModalBackdrop) {
        closePortalRequestReview();
    }
}

export function initializePortalRequestsFeature() {
    if (featureState.initialized) return;
    featureState.initialized = true;

    subscribe(snapshot => {
        syncPortalRequestsSubscription(snapshot);

        if (snapshot.currentRoute === "#/portal-requests") {
            renderPortalRequestsView();
        }
    });

    syncPortalRequestsSubscription(getState());
}
