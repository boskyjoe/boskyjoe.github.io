import { getState, subscribe } from "../../app/store.js";
import { showChoiceModal, showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import { formatCurrency } from "../../shared/utils/currency.js";
import {
    initializeLeadQuotesGrid,
    initializeLeadWorkLogGrid,
    getLeadRequestedProductsGridRows,
    initializeLeadRequestedProductsGrid,
    initializeLeadsGrid,
    refreshLeadQuotesGrid,
    refreshLeadRequestedProductsGrid,
    refreshLeadWorkLogGrid,
    refreshLeadsGrid,
    updateLeadQuotesGridSearch,
    updateLeadRequestedProductsGridSearch,
    updateLeadWorkLogGridSearch,
    updateLeadsGridSearch
} from "./grid.js";
import { fetchSalesCatalogueItems, subscribeToLeadQuotes, subscribeToLeadWorkLog, subscribeToLeads } from "./repository.js";
import {
    acceptLeadQuote,
    buildLeadQuoteToRetailConversionDraft,
    buildLeadQuoteDraft,
    buildLeadToRetailConversionDraft,
    calculateLeadQuoteTotals,
    cancelLeadQuote,
    deleteLead,
    getLeadQuote,
    LEAD_LOG_TYPES,
    LEAD_QUOTE_MANUAL_STATUSES,
    LEAD_QUOTE_STORES,
    LEAD_SOURCES,
    LEAD_STATUSES,
    rejectLeadQuote,
    saveLead,
    saveLeadQuote,
    saveLeadWorkLog
} from "./service.js";
import { getRetailStoreTaxDefaults } from "../retail-store/service.js";

const featureState = {
    leads: [],
    editingLeadId: null,
    activeLeadTab: "details",
    searchTerm: "",
    itemSearchTerm: "",
    selectedCatalogueId: "",
    catalogueItemRows: [],
    unsubscribeLeads: null,
    activeWorkLogLeadId: null,
    unsubscribeWorkLog: null,
    workLogListenerLeadId: null,
    workLogEntries: [],
    workLogSearchTerm: "",
    quoteRows: [],
    quoteSearchTerm: "",
    quoteDrawerLeadId: null,
    isQuoteDrawerOpen: false,
    unsubscribeQuotes: null,
    quoteListenerLeadId: null,
    activeQuoteId: null,
    quoteDraft: null,
    pendingQuoteSelectionId: "",
    isQuoteSaveInFlight: false
};

const RETAIL_ROUTE = "#/retail-store";
const LEAD_QUOTES_ROUTE = "#/lead-quotes";
const LEAD_TO_RETAIL_CONVERSION_STORAGE_KEY = "moneta.pendingLeadRetailConversion";
const RETAIL_CONVERSION_ALLOWED_ROLES = new Set(["admin", "sales_staff", "finance"]);

function normalizeText(value) {
    return (value || "").trim();
}

function escapeAttribute(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function formatDateInputValue(value) {
    if (!value) return "";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatDisplayDate(value) {
    if (!value) return "-";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatDisplayDateTime(value) {
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

function parseLeadQuoteRouteParams() {
    const [, queryString = ""] = String(window.location.hash || "").split("?");
    const params = new URLSearchParams(queryString);

    return {
        leadId: normalizeText(params.get("leadId")),
        quoteId: normalizeText(params.get("quoteId")),
        mode: normalizeText(params.get("mode"))
    };
}

function buildLeadQuoteWorkspaceRoute(leadId, options = {}) {
    const { quoteId = "", mode = "" } = options;
    const params = new URLSearchParams();

    if (leadId) {
        params.set("leadId", leadId);
    }

    if (quoteId) {
        params.set("quoteId", quoteId);
    }

    if (mode) {
        params.set("mode", mode);
    }

    const query = params.toString();
    return query ? `${LEAD_QUOTES_ROUTE}?${query}` : LEAD_QUOTES_ROUTE;
}

function openLeadQuoteWorkspaceRoute(leadId, options = {}) {
    window.location.hash = buildLeadQuoteWorkspaceRoute(leadId, options);
}

function syncQuoteWorkspaceRouteState() {
    if (getState().currentRoute !== LEAD_QUOTES_ROUTE) return;

    const { leadId, quoteId } = parseLeadQuoteRouteParams();

    featureState.editingLeadId = leadId || null;
    featureState.quoteDrawerLeadId = null;
    featureState.isQuoteDrawerOpen = false;

    if (quoteId) {
        featureState.activeQuoteId = quoteId;
        if (featureState.quoteDraft?.docId && featureState.quoteDraft.docId !== quoteId) {
            featureState.quoteDraft = null;
        }
        return;
    }

    if (featureState.quoteDraft?.docId) {
        return;
    }

    featureState.activeQuoteId = "";
}

function getEditingLead() {
    if (!featureState.editingLeadId) return null;
    return featureState.leads.find(lead => lead.id === featureState.editingLeadId) || null;
}

function getActiveWorkLogLead() {
    if (!featureState.activeWorkLogLeadId) return null;
    return featureState.leads.find(lead => lead.id === featureState.activeWorkLogLeadId) || null;
}

function getQuoteContextLeadId() {
    if (getState().currentRoute === LEAD_QUOTES_ROUTE) {
        const routeParams = parseLeadQuoteRouteParams();
        if (routeParams.leadId) {
            return routeParams.leadId;
        }
    }

    return featureState.editingLeadId || featureState.quoteDrawerLeadId || "";
}

function getQuoteContextLead() {
    const leadId = getQuoteContextLeadId();
    return leadId ? featureState.leads.find(lead => lead.id === leadId) || null : null;
}

function getSelectedQuote() {
    if (!featureState.activeQuoteId) return null;
    return featureState.quoteRows.find(quote => quote.id === featureState.activeQuoteId) || null;
}

function getActiveLeadTab() {
    return featureState.activeLeadTab === "quotes" ? "quotes" : "details";
}

function resetLeadWorkspace() {
    featureState.editingLeadId = null;
    featureState.activeLeadTab = "details";
    featureState.selectedCatalogueId = "";
    featureState.catalogueItemRows = [];
    featureState.itemSearchTerm = "";
    featureState.quoteSearchTerm = "";
    featureState.activeQuoteId = null;
    featureState.quoteDraft = null;
}

function resetWorkLogWorkspace() {
    featureState.activeWorkLogLeadId = null;
    featureState.workLogEntries = [];
    featureState.workLogSearchTerm = "";
}

function resetQuoteWorkspace(options = {}) {
    const { closeDrawer = false } = options;
    featureState.activeQuoteId = null;
    featureState.quoteDraft = null;
    featureState.pendingQuoteSelectionId = "";
    featureState.isQuoteSaveInFlight = false;

    if (closeDrawer) {
        featureState.quoteDrawerLeadId = null;
        featureState.isQuoteDrawerOpen = false;
    }
}

function buildQuoteDraftFromRecord(quote = null) {
    if (!quote) return null;

    const lineItems = (quote.lineItems || []).map(item => ({
        productId: item.productId || "",
        productName: item.productName || "",
        categoryId: item.categoryId || "",
        categoryName: item.categoryName || "-",
        quotedQty: Math.max(0, Math.floor(Number(item.quotedQty) || 0)),
        unitPrice: Number(item.unitPrice) || 0,
        lineDiscountPercentage: Number(item.lineDiscountPercentage) || 0,
        cgstPercentage: Number(item.cgstPercentage) || 0,
        sgstPercentage: Number(item.sgstPercentage) || 0,
        lineSubtotal: Number(item.lineSubtotal) || 0,
        lineDiscountAmount: Number(item.lineDiscountAmount) || 0,
        taxableAmount: Number(item.taxableAmount) || 0,
        cgstAmount: Number(item.cgstAmount) || 0,
        sgstAmount: Number(item.sgstAmount) || 0,
        taxAmount: Number(item.taxAmount) || 0,
        lineTotal: Number(item.lineTotal) || 0
    }));

    return {
        docId: quote.id,
        businessQuoteId: quote.businessQuoteId || "",
        sourceQuoteId: quote.sourceQuoteId || quote.supersedesQuoteId || "",
        quoteStatus: quote.quoteStatus || "Draft",
        persistedQuoteStatus: quote.quoteStatus || "Draft",
        store: quote.store || "Church Store",
        validUntil: formatDateInputValue(quote.validUntil),
        customerName: quote.customerSnapshot?.customerName || "",
        customerPhone: quote.customerSnapshot?.customerPhone || "",
        customerEmail: quote.customerSnapshot?.customerEmail || "",
        customerAddress: quote.customerSnapshot?.customerAddress || "",
        quoteNotes: quote.quoteNotes || "",
        internalNotes: quote.internalNotes || "",
        acceptedByCustomerName: quote.acceptedByCustomerName || "",
        acceptedVia: quote.acceptedVia || "",
        acceptanceNotes: quote.acceptanceNotes || "",
        rejectionReason: quote.rejectionReason || "",
        cancellationReason: quote.cancellationReason || "",
        lineItems,
        totals: quote.totals || calculateLeadQuoteTotals(lineItems)
    };
}

function roundCurrency(value) {
    return Number((Number(value) || 0).toFixed(2));
}

function recalculateQuoteLineItem(item = {}) {
    const quotedQty = Math.max(0, Math.floor(Number(item.quotedQty) || 0));
    const unitPrice = roundCurrency(item.unitPrice);
    const lineDiscountPercentage = Math.max(0, Number(item.lineDiscountPercentage) || 0);
    const cgstPercentage = Math.max(0, Number(item.cgstPercentage) || 0);
    const sgstPercentage = Math.max(0, Number(item.sgstPercentage) || 0);
    const lineSubtotal = roundCurrency(quotedQty * unitPrice);
    const lineDiscountAmount = roundCurrency(lineSubtotal * (lineDiscountPercentage / 100));
    const taxableAmount = roundCurrency(lineSubtotal - lineDiscountAmount);
    const cgstAmount = roundCurrency(taxableAmount * (cgstPercentage / 100));
    const sgstAmount = roundCurrency(taxableAmount * (sgstPercentage / 100));
    const taxAmount = roundCurrency(cgstAmount + sgstAmount);
    const lineTotal = roundCurrency(taxableAmount + taxAmount);

    return {
        ...item,
        quotedQty,
        unitPrice,
        lineDiscountPercentage,
        cgstPercentage,
        sgstPercentage,
        lineSubtotal,
        lineDiscountAmount,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        taxAmount,
        lineTotal
    };
}

function recalculateQuoteDraftTotals() {
    if (!featureState.quoteDraft) return;
    featureState.quoteDraft.lineItems = (featureState.quoteDraft.lineItems || []).map(item => recalculateQuoteLineItem(item));
    featureState.quoteDraft.totals = calculateLeadQuoteTotals(featureState.quoteDraft.lineItems || []);
}

function updateQuoteDraftMetricsDom() {
    if (!featureState.quoteDraft) return;

    (featureState.quoteDraft.lineItems || []).forEach((item, index) => {
        const totalNode = document.querySelector(`[data-quote-line-total-index="${index}"]`);
        if (totalNode) {
            totalNode.textContent = formatCurrency(item.lineTotal || 0);
        }
    });

    const totals = featureState.quoteDraft.totals || {};
    const totalFieldMap = {
        subtotal: totals.subtotal || 0,
        discount: totals.discountTotal || 0,
        tax: totals.taxTotal || 0,
        grandTotal: totals.grandTotal || 0
    };

    Object.entries(totalFieldMap).forEach(([field, value]) => {
        const node = document.querySelector(`[data-quote-total-field="${field}"]`);
        if (node) {
            node.textContent = formatCurrency(value);
        }
    });
}

function isQuoteDraftEditable() {
    if (!featureState.quoteDraft) return false;
    const persistedQuoteStatus = normalizeText(featureState.quoteDraft.persistedQuoteStatus || featureState.quoteDraft.quoteStatus || "Draft");
    return persistedQuoteStatus === "Draft";
}

function getQuoteDraftSourceQuote() {
    const sourceQuoteId = normalizeText(featureState.quoteDraft?.sourceQuoteId || "");
    if (!sourceQuoteId) return null;
    return featureState.quoteRows.find(quote => quote.id === sourceQuoteId) || null;
}

function isQuoteRevisionDraft() {
    return Boolean(featureState.quoteDraft && !featureState.quoteDraft.docId && getQuoteDraftSourceQuote()?.id);
}

function sortLeads(rows = []) {
    return (rows || []).slice().sort((left, right) => {
        const leftDate = left.enquiryDate?.toDate ? left.enquiryDate.toDate() : new Date(left.enquiryDate || 0);
        const rightDate = right.enquiryDate?.toDate ? right.enquiryDate.toDate() : new Date(right.enquiryDate || 0);
        return rightDate - leftDate;
    });
}

function resolveSeasonName(seasonId, snapshot) {
    return (snapshot.masterData.seasons || []).find(season => season.id === seasonId)?.seasonName || "-";
}

function resolveCatalogueOptions(snapshot, currentValue) {
    return (snapshot.masterData.salesCatalogues || [])
        .filter(catalogue => catalogue.isActive || catalogue.id === currentValue)
        .map(catalogue => `
            <option value="${catalogue.id}" ${catalogue.id === currentValue ? "selected" : ""}>
                ${catalogue.catalogueName} (${catalogue.seasonName || resolveSeasonName(catalogue.seasonId, snapshot)})
            </option>
        `).join("");
}

function renderSourceOptions(currentValue) {
    return LEAD_SOURCES.map(source => `
        <option value="${source}" ${source === currentValue ? "selected" : ""}>
            ${source}
        </option>
    `).join("");
}

function renderStatusOptions(currentValue) {
    return LEAD_STATUSES.map(status => `
        <option value="${status}" ${status === currentValue ? "selected" : ""}>
            ${status}
        </option>
    `).join("");
}

function renderLogTypeOptions(currentValue = "General Note") {
    const selectedValue = normalizeText(currentValue) || "General Note";

    return LEAD_LOG_TYPES.map(type => `
        <option value="${type}" ${type === selectedValue ? "selected" : ""}>
            ${type}
        </option>
    `).join("");
}

function renderQuoteStoreOptions(currentValue = "Church Store") {
    return LEAD_QUOTE_STORES.map(storeName => `
        <option value="${storeName}" ${storeName === currentValue ? "selected" : ""}>
            ${storeName}
        </option>
    `).join("");
}

function renderQuoteStatusOptions(currentValue = "Draft") {
    const selectedValue = normalizeText(currentValue) || "Draft";
    return LEAD_QUOTE_MANUAL_STATUSES.map(status => `
        <option value="${status}" ${status === selectedValue ? "selected" : ""}>
            ${status}
        </option>
    `).join("");
}

function renderQuoteStatusPill(value = "") {
    const status = normalizeText(value) || "No Quotes";
    const normalized = status.toLowerCase().replace(/\s+/g, "-");
    return `<span class="quote-status-pill quote-status-${normalized}">${status}</span>`;
}

function isRetailConvertibleQuote(quote = null) {
    if (!quote?.id) return false;

    const status = normalizeText(quote.quoteStatus || "");
    const store = normalizeText(quote.store || "");

    if (store === "Consignment") return false;
    return ["Draft", "Sent", "Accepted"].includes(status);
}

async function resolveLeadConversionQuoteSource(lead) {
    if (!lead?.id) return null;

    const selectedQuote = getEditingLead()?.id === lead.id ? getSelectedQuote() : null;
    if (isRetailConvertibleQuote(selectedQuote)) {
        return {
            quote: selectedQuote,
            label: selectedQuote.quoteStatus === "Accepted" ? "Accepted Quote" : "Selected Quote"
        };
    }

    const acceptedQuoteId = normalizeText(lead.acceptedQuoteId || "");
    if (acceptedQuoteId) {
        const acceptedQuote = await getLeadQuote(lead.id, acceptedQuoteId);
        if (isRetailConvertibleQuote(acceptedQuote)) {
            return {
                quote: acceptedQuote,
                label: "Accepted Quote"
            };
        }
    }

    return null;
}

function getQuoteStoreTaxDefaults(storeName = "") {
    if (storeName === "Consignment") {
        return {
            cgstPercentage: 0,
            sgstPercentage: 0
        };
    }

    return getRetailStoreTaxDefaults(storeName || "Church Store");
}

function applyQuoteStoreTaxDefaults(storeName = "") {
    if (!featureState.quoteDraft) return;

    const taxDefaults = getQuoteStoreTaxDefaults(storeName);
    featureState.quoteDraft.lineItems = (featureState.quoteDraft.lineItems || []).map(item => ({
        ...item,
        cgstPercentage: Number(taxDefaults.cgstPercentage) || 0,
        sgstPercentage: Number(taxDefaults.sgstPercentage) || 0
    }));
    recalculateQuoteDraftTotals();
}

function ensureQuoteSelection() {
    if (featureState.pendingQuoteSelectionId) {
        const pendingQuote = featureState.quoteRows.find(quote => quote.id === featureState.pendingQuoteSelectionId) || null;

        if (pendingQuote) {
            featureState.activeQuoteId = pendingQuote.id;
            featureState.pendingQuoteSelectionId = "";
            return;
        }

        return;
    }

    if (!featureState.activeQuoteId && featureState.quoteDraft && !featureState.quoteDraft.docId) {
        return;
    }

    if (featureState.activeQuoteId && featureState.quoteRows.some(quote => quote.id === featureState.activeQuoteId)) {
        return;
    }

    const latestQuote = featureState.quoteRows[0] || null;

    if (latestQuote) {
        featureState.activeQuoteId = latestQuote.id;
        featureState.quoteDraft = buildQuoteDraftFromRecord(latestQuote);
        return;
    }

    if (featureState.quoteDraft?.docId) {
        featureState.quoteDraft = null;
    }

    featureState.activeQuoteId = "";
}

function hydrateQuoteDraftFromSelection() {
    const selectedQuote = getSelectedQuote();
    if (!selectedQuote) return;

    const currentDocId = featureState.quoteDraft?.docId || "";
    if (featureState.quoteDraft && !currentDocId) {
        return;
    }

    if (!featureState.quoteDraft || currentDocId === selectedQuote.id || normalizeText(featureState.quoteDraft?.quoteStatus) !== "Draft") {
        featureState.quoteDraft = buildQuoteDraftFromRecord(selectedQuote);
    }
}

function buildQuoteListMarkup(rows = [], options = {}) {
    const { compact = false } = options;

    if (!(rows || []).length) {
        return `
            <div class="lead-quotes-empty">
                <p class="lead-quotes-empty-title">No quotes yet</p>
                <p class="panel-copy">Create the first quote from this enquiry when pricing is ready.</p>
            </div>
        `;
    }

    return (rows || []).map(quote => {
        const isActive = quote.id === featureState.activeQuoteId;
        const acceptedMeta = normalizeText(quote.acceptedByCustomerName)
            ? `Accepted by ${quote.acceptedByCustomerName}${quote.acceptedOn ? ` on ${formatDisplayDate(quote.acceptedOn)}` : ""}`
            : (quote.sentOn ? `Sent ${formatDisplayDate(quote.sentOn)}` : `Created ${formatDisplayDate(quote.createdOn)}`);

        return `
            <button
                class="lead-quote-list-item ${isActive ? "lead-quote-list-item-active" : ""}"
                type="button"
                data-action="quote-select"
                data-quote-id="${quote.id}">
                <div class="lead-quote-list-item-head">
                    <div>
                        <p class="lead-quote-list-item-title">${quote.businessQuoteId || "Draft Quote"}</p>
                        <p class="lead-quote-list-item-subtitle">Version ${quote.versionNo || "-"}</p>
                    </div>
                    ${renderQuoteStatusPill(quote.quoteStatus)}
                </div>
                <div class="lead-quote-list-item-meta">
                    <span>${quote.store || "-"}</span>
                    <span>${formatCurrency(quote.totals?.grandTotal || 0)}</span>
                </div>
                <p class="lead-quote-list-item-note">${acceptedMeta}</p>
                ${compact ? "" : `<p class="lead-quote-list-item-note">Valid until ${formatDisplayDate(quote.validUntil)}</p>`}
            </button>
        `;
    }).join("");
}

function resolveLeadStatusLabel(lead = {}) {
    const leadStatus = normalizeText(lead.leadStatus || "New");
    const conversionOutcomeStatus = normalizeText(
        lead.conversionOutcomeStatus || lead.conversionOutcome || lead.convertedSaleStatus
    ).toLowerCase();

    if (leadStatus === "Converted" && conversionOutcomeStatus === "voided") {
        return "Converted (Sale Voided)";
    }

    return leadStatus || "New";
}

function buildLeadGridRows() {
    const currentRole = getState().currentUser?.role || "";
    const hasRetailAccess = RETAIL_CONVERSION_ALLOWED_ROLES.has(currentRole);

    return sortLeads(featureState.leads).map(lead => ({
        ...lead,
        displayLeadStatus: resolveLeadStatusLabel(lead),
        requestedItemCount: (lead.requestedProducts || []).filter(item => (Number(item.requestedQty) || 0) > 0).length,
        requestedValue: Number(lead.requestedValue) || Number((lead.requestedProducts || []).reduce((sum, item) => {
            return sum + ((Number(item.requestedQty) || 0) * (Number(item.sellingPrice) || 0));
        }, 0).toFixed(2)),
        canConvertToRetail: hasRetailAccess
            && normalizeText(lead.leadStatus) !== "Converted"
            && normalizeText(lead.leadStatus) !== "Lost"
            && Boolean(normalizeText(lead.catalogueId))
            && (lead.requestedProducts || []).some(item => (Number(item.requestedQty) || 0) > 0),
        convertDisabledReason: !hasRetailAccess
            ? "Your role does not have access to the Retail Store conversion workspace."
            : normalizeText(lead.leadStatus) === "Converted"
                ? "This enquiry is already converted."
                : normalizeText(lead.leadStatus) === "Lost"
                    ? "Lost enquiries cannot be converted."
                    : !normalizeText(lead.catalogueId)
                        ? "Select a sales catalogue before converting this enquiry."
                        : !(lead.requestedProducts || []).some(item => (Number(item.requestedQty) || 0) > 0)
                            ? "Add at least one requested product before conversion."
                            : ""
    }));
}

function getLeadConversionEligibility(lead, snapshot = getState()) {
    const role = snapshot.currentUser?.role || "";
    if (!RETAIL_CONVERSION_ALLOWED_ROLES.has(role)) {
        return {
            allowed: false,
            reason: "Your role does not have access to the Retail Store conversion workspace."
        };
    }

    if (!lead?.id) {
        return {
            allowed: false,
            reason: "Lead record could not be found."
        };
    }

    const leadStatus = normalizeText(lead.leadStatus || "New");
    if (leadStatus === "Converted") {
        return {
            allowed: false,
            reason: "This enquiry is already converted."
        };
    }

    if (leadStatus === "Lost") {
        return {
            allowed: false,
            reason: "Lost enquiries cannot be converted."
        };
    }

    if (!normalizeText(lead.catalogueId)) {
        return {
            allowed: false,
            reason: "Select a sales catalogue before converting this enquiry."
        };
    }

    const hasRequestedProducts = (lead.requestedProducts || []).some(item => (Number(item.requestedQty) || 0) > 0);
    if (!hasRequestedProducts) {
        return {
            allowed: false,
            reason: "Add at least one requested product before conversion."
        };
    }

    return {
        allowed: true,
        reason: ""
    };
}

function getRequestedSummary() {
    const rows = getLeadRequestedProductsGridRows();
    const requestedProducts = rows.filter(row => (Number(row.requestedQty) || 0) > 0);
    const requestedValue = requestedProducts.reduce((sum, row) => {
        return sum + ((Number(row.requestedQty) || 0) * (Number(row.sellingPrice) || 0));
    }, 0);

    return {
        requestedProductCount: requestedProducts.length,
        requestedValue: Number(requestedValue.toFixed(2))
    };
}

function updateRequestedSummary() {
    const summary = getRequestedSummary();
    const countNode = document.getElementById("lead-requested-count");
    const valueNode = document.getElementById("lead-requested-value");

    if (countNode) {
        countNode.textContent = `Total Products: ${summary.requestedProductCount}`;
    }

    if (valueNode) {
        valueNode.textContent = `Total Value: ${formatCurrency(summary.requestedValue)}`;
    }
}

function enrichLeadCatalogueItems(snapshot, items = [], savedProducts = []) {
    const products = snapshot.masterData.products || [];
    const categories = snapshot.masterData.categories || [];

    return (items || []).map(item => {
        const product = products.find(entry => entry.id === item.productId) || null;
        const resolvedCategoryId = item.categoryId || product?.categoryId || "";
        const resolvedCategoryName = item.categoryName
            || (savedProducts || []).find(saved => saved.productId === item.productId)?.categoryName
            || categories.find(category => category.id === resolvedCategoryId)?.categoryName
            || "-";

        return {
            productId: item.productId,
            productName: item.productName || product?.itemName || "Untitled Product",
            categoryName: resolvedCategoryName,
            sellingPrice: Number(item.sellingPrice) || 0,
            requestedQty: Number((savedProducts || []).find(saved => saved.productId === item.productId)?.requestedQty) || 0
        };
    });
}

async function loadCatalogueItemsIntoWorkspace(catalogueId, savedProducts = []) {
    featureState.selectedCatalogueId = catalogueId || "";

    if (!catalogueId) {
        featureState.catalogueItemRows = [];
        refreshLeadRequestedProductsGrid([]);
        updateRequestedSummary();
        return;
    }

    try {
        const catalogueItems = await fetchSalesCatalogueItems(catalogueId);
        featureState.catalogueItemRows = enrichLeadCatalogueItems(getState(), catalogueItems, savedProducts);

        refreshLeadRequestedProductsGrid(featureState.catalogueItemRows);
        updateLeadRequestedProductsGridSearch(featureState.itemSearchTerm);
        updateRequestedSummary();
    } catch (error) {
        console.error("[Moneta] Failed to load lead catalogue items:", error);
        showToast("Could not load catalogue items for this enquiry.", "error", {
            title: "Leads & Enquiries"
        });
    }
}

function renderQuoteLineItemsTable(quoteDraft, options = {}) {
    const { readOnly = false } = options;
    const lineItems = quoteDraft?.lineItems || [];

    if (!lineItems.length) {
        return `
            <div class="lead-quotes-empty">
                <p class="lead-quotes-empty-title">No quote lines</p>
                <p class="panel-copy">This quote does not have any product lines yet.</p>
            </div>
        `;
    }

    return `
        <div class="lead-quote-lines-table-wrap">
            <table class="lead-quote-lines-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th class="lead-quote-lines-number">Qty</th>
                        <th class="lead-quote-lines-number">Unit Price</th>
                        <th class="lead-quote-lines-number">Discount %</th>
                        <th class="lead-quote-lines-number">CGST %</th>
                        <th class="lead-quote-lines-number">SGST %</th>
                        <th class="lead-quote-lines-number">Line Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItems.map((item, index) => `
                        <tr>
                            <td>
                                <div class="lead-quote-line-product">
                                    <p>${item.productName || "-"}</p>
                                    <span>${item.productId || "-"}</span>
                                </div>
                            </td>
                            <td>${item.categoryName || "-"}</td>
                            <td class="lead-quote-lines-number">
                                <input
                                    class="input lead-quote-line-input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value="${Number(item.quotedQty) || 0}"
                                    data-quote-line-index="${index}"
                                    data-quote-line-field="quotedQty"
                                    ${readOnly ? "disabled" : ""}>
                            </td>
                            <td class="lead-quote-lines-number">
                                <input
                                    class="input lead-quote-line-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${Number(item.unitPrice) || 0}"
                                    data-quote-line-index="${index}"
                                    data-quote-line-field="unitPrice"
                                    ${readOnly ? "disabled" : ""}>
                            </td>
                            <td class="lead-quote-lines-number">
                                <input
                                    class="input lead-quote-line-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${Number(item.lineDiscountPercentage) || 0}"
                                    data-quote-line-index="${index}"
                                    data-quote-line-field="lineDiscountPercentage"
                                    ${readOnly ? "disabled" : ""}>
                            </td>
                            <td class="lead-quote-lines-number">
                                <input
                                    class="input lead-quote-line-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${Number(item.cgstPercentage) || 0}"
                                    data-quote-line-index="${index}"
                                    data-quote-line-field="cgstPercentage"
                                    ${readOnly ? "disabled" : ""}>
                            </td>
                            <td class="lead-quote-lines-number">
                                <input
                                    class="input lead-quote-line-input"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value="${Number(item.sgstPercentage) || 0}"
                                    data-quote-line-index="${index}"
                                    data-quote-line-field="sgstPercentage"
                                    ${readOnly ? "disabled" : ""}>
                            </td>
                            <td
                                class="lead-quote-lines-number lead-quote-lines-total"
                                data-quote-line-total-index="${index}">${formatCurrency(item.lineTotal || 0)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderQuoteAcceptanceFields(quoteDraft, options = {}) {
    const { readOnly = false } = options;
    const quoteStatus = normalizeText(quoteDraft?.quoteStatus || "");

    if (!["Sent", "Accepted"].includes(quoteStatus)) {
        return "";
    }

    return `
        <div class="lead-quote-acceptance-shell">
            <div class="lead-form-section-head">
                <p class="lead-form-section-kicker">Customer Acceptance</p>
            </div>
            <div class="lead-form-section-grid">
                <div class="field">
                    <label for="lead-quote-accepted-by">Accepted By</label>
                    <input
                        id="lead-quote-accepted-by"
                        class="input"
                        type="text"
                        value="${quoteDraft.acceptedByCustomerName || ""}"
                        ${readOnly ? "disabled" : ""}>
                </div>
                <div class="field">
                    <label for="lead-quote-accepted-via">Accepted Via</label>
                    <input
                        id="lead-quote-accepted-via"
                        class="input"
                        type="text"
                        value="${quoteDraft.acceptedVia || ""}"
                        placeholder="Phone, Email, WhatsApp, In Person"
                        ${readOnly ? "disabled" : ""}>
                </div>
                <div class="field field-full">
                    <label for="lead-quote-acceptance-notes">Acceptance Notes</label>
                    <textarea
                        id="lead-quote-acceptance-notes"
                        class="textarea"
                        rows="3"
                        placeholder="Record approval details or customer instructions"
                        ${readOnly ? "disabled" : ""}>${quoteDraft.acceptanceNotes || ""}</textarea>
                </div>
            </div>
        </div>
    `;
}

function renderLeadEditorTabs(editingLead, activeTab = "details") {
    if (!editingLead?.id) return "";

    const quoteCount = Number(editingLead.quoteCount) || featureState.quoteRows.length;

    return `
        <div class="lead-editor-tabs" role="tablist" aria-label="Lead editor sections">
            <button
                class="lead-editor-tab ${activeTab === "details" ? "lead-editor-tab-active" : ""}"
                type="button"
                role="tab"
                aria-selected="${activeTab === "details" ? "true" : "false"}"
                data-action="lead-tab"
                data-tab="details">
                Edit Enquiry
            </button>
            <button
                class="lead-editor-tab ${activeTab === "quotes" ? "lead-editor-tab-active" : ""}"
                type="button"
                role="tab"
                aria-selected="${activeTab === "quotes" ? "true" : "false"}"
                data-action="lead-tab"
                data-tab="quotes">
                Quotes${quoteCount ? ` (${quoteCount})` : ""}
            </button>
        </div>
    `;
}

function renderLeadQuoteSummaryPanel(editingLead) {
    if (!editingLead?.id) return "";

    const latestQuote = featureState.quoteRows[0] || null;
    const acceptedQuote = featureState.quoteRows.find(quote => normalizeText(quote.quoteStatus) === "Accepted") || null;
    const quoteCount = Number(editingLead.quoteCount) || featureState.quoteRows.length;

    return `
        <section class="panel-card lead-quote-summary-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.catalogue}</span>
                    <div>
                        <h3>Quote Summary</h3>
                        <p class="panel-copy">Keep the enquiry page focused, then open the dedicated Quote Workspace when you’re ready to price, send, or revise.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${quoteCount} quote${quoteCount === 1 ? "" : "s"}</span>
                    ${editingLead.latestQuoteStatus ? renderQuoteStatusPill(editingLead.latestQuoteStatus) : ""}
                </div>
            </div>
            <div class="panel-body">
                <div class="lead-quote-summary-grid">
                    <div class="metric-card">
                        <span class="metric-label">Latest Quote</span>
                        <strong class="metric-value">${editingLead.latestQuoteNumber || latestQuote?.businessQuoteId || "-"}</strong>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">Accepted Quote</span>
                        <strong class="metric-value">${editingLead.acceptedQuoteNumber || acceptedQuote?.businessQuoteId || "-"}</strong>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">Accepted Total</span>
                        <strong class="metric-value">${formatCurrency(editingLead.acceptedQuoteTotal || acceptedQuote?.totals?.grandTotal || 0)}</strong>
                    </div>
                    <div class="metric-card">
                        <span class="metric-label">Latest Sent</span>
                        <strong class="metric-value">${formatDisplayDate(editingLead.latestQuoteSentOn || latestQuote?.sentOn)}</strong>
                    </div>
                </div>
                <div class="lead-quote-summary-actions form-actions">
                    <button class="button button-primary-alt" type="button" data-action="quote-route-new" data-lead-id="${editingLead.id}">
                        <span class="button-icon">${icons.plus}</span>
                        Create Quote Draft
                    </button>
                    <button class="button button-secondary" type="button" data-action="quote-open-drawer">
                        <span class="button-icon">${icons.search}</span>
                        Quick View
                    </button>
                    ${quoteCount > 0 ? `
                        <button class="button button-secondary" type="button" data-action="quote-route-workspace" data-lead-id="${editingLead.id}">
                            <span class="button-icon">${icons.edit}</span>
                            Open Quote Workspace
                        </button>
                    ` : ""}
                </div>
            </div>
        </section>
    `;
}

function renderLeadQuotesWorkspaceMeta(editingLead) {
    const acceptedQuote = featureState.quoteRows.find(quote => normalizeText(quote.quoteStatus) === "Accepted") || null;
    const latestStatus = featureState.quoteRows[0]?.quoteStatus || editingLead?.latestQuoteStatus || "";
    const quoteCount = Number(editingLead?.quoteCount) || featureState.quoteRows.length;

    return `
        <div class="toolbar-meta lead-quotes-workspace-meta">
            <span class="status-pill">${quoteCount} quotes</span>
            ${latestStatus ? renderQuoteStatusPill(latestStatus) : ""}
            ${acceptedQuote?.businessQuoteId ? `<span class="status-pill">Accepted: ${acceptedQuote.businessQuoteId}</span>` : ""}
        </div>
    `;
}

function renderLeadQuotesEditorCard(editingLead) {
    const selectedQuote = getSelectedQuote();
    const quoteDraft = featureState.quoteDraft;
    const sourceQuote = getQuoteDraftSourceQuote();
    const revisionDraft = isQuoteRevisionDraft();
    const acceptedQuote = featureState.quoteRows.find(quote => normalizeText(quote.quoteStatus) === "Accepted") || null;
    const isEditable = isQuoteDraftEditable();
    const quoteTitle = revisionDraft
        ? `Revision Draft${sourceQuote?.businessQuoteId ? ` for ${sourceQuote.businessQuoteId}` : ""}`
        : (quoteDraft?.businessQuoteId || selectedQuote?.businessQuoteId || "New Quote Draft");
    const quoteStatus = quoteDraft?.quoteStatus || selectedQuote?.quoteStatus || "Draft";
    const metadataNote = revisionDraft
        ? `Based on ${sourceQuote?.businessQuoteId || "the selected quote"}${sourceQuote?.versionNo ? ` · Version ${sourceQuote.versionNo}` : ""} · Save draft or send to create the next version.`
        : (selectedQuote
            ? `Version ${selectedQuote.versionNo || "-"} · ${selectedQuote.store || "-"}`
            : "Start a fresh version from this enquiry when pricing is ready.");

    return `
        <div class="lead-quote-editor-card">
                    <div class="lead-quote-editor-head">
                        <div>
                            <p class="lead-quote-editor-title">${quoteTitle}</p>
                            <p class="lead-quote-editor-subtitle">${metadataNote}</p>
                        </div>
                        ${renderQuoteStatusPill(quoteStatus)}
                    </div>
                    ${quoteDraft ? `
                        <div class="lead-form-section-grid lead-quote-editor-grid">
                            <div class="field">
                                <label for="lead-quote-store">Sales Channel</label>
                                <select id="lead-quote-store" class="select" ${isEditable ? "" : "disabled"}>
                                    ${renderQuoteStoreOptions(quoteDraft.store || "Church Store")}
                                </select>
                            </div>
                            <div class="field">
                                <label for="lead-quote-status">Quote Status</label>
                                <select id="lead-quote-status" class="select" ${isEditable ? "" : "disabled"}>
                                    ${renderQuoteStatusOptions(quoteDraft.quoteStatus || "Draft")}
                                </select>
                            </div>
                            <div class="field">
                                <label for="lead-quote-valid-until">Valid Until</label>
                                <input
                                    id="lead-quote-valid-until"
                                    class="input"
                                    type="date"
                                    value="${quoteDraft.validUntil || ""}"
                                    ${isEditable ? "" : "disabled"}>
                            </div>
                            <div class="field">
                                <label for="lead-quote-customer-name">Customer Name</label>
                                <input
                                    id="lead-quote-customer-name"
                                    class="input"
                                    type="text"
                                    value="${quoteDraft.customerName || ""}"
                                    ${isEditable ? "" : "disabled"}>
                            </div>
                            <div class="field">
                                <label for="lead-quote-customer-phone">Customer Phone</label>
                                <input
                                    id="lead-quote-customer-phone"
                                    class="input"
                                    type="text"
                                    value="${quoteDraft.customerPhone || ""}"
                                    ${isEditable ? "" : "disabled"}>
                            </div>
                            <div class="field">
                                <label for="lead-quote-customer-email">Customer Email</label>
                                <input
                                    id="lead-quote-customer-email"
                                    class="input"
                                    type="email"
                                    value="${quoteDraft.customerEmail || ""}"
                                    placeholder="Required before sending the quote"
                                    ${isEditable ? "" : "disabled"}>
                            </div>
                            <div class="field lead-quote-field-span-3">
                                <label for="lead-quote-customer-address">Customer Address</label>
                                <textarea
                                    id="lead-quote-customer-address"
                                    class="textarea"
                                    rows="2"
                                    placeholder="Quote snapshot copies from the lead and can be updated here"
                                    ${isEditable ? "" : "disabled"}>${quoteDraft.customerAddress || ""}</textarea>
                            </div>
                            <div class="field lead-quote-field-span-2">
                                <label for="lead-quote-notes">Customer Notes</label>
                                <textarea
                                    id="lead-quote-notes"
                                    class="textarea"
                                    rows="3"
                                    placeholder="Terms, delivery notes, pricing assumptions, or service details"
                                    ${isEditable ? "" : "disabled"}>${quoteDraft.quoteNotes || ""}</textarea>
                            </div>
                            <div class="field">
                                <label for="lead-quote-internal-notes">Internal Notes</label>
                                <textarea
                                    id="lead-quote-internal-notes"
                                    class="textarea"
                                    rows="3"
                                    placeholder="Internal notes for revisions, approval checks, or follow-up reminders"
                                    ${isEditable ? "" : "disabled"}>${quoteDraft.internalNotes || ""}</textarea>
                            </div>
                        </div>
                        <div class="lead-quote-editor-section">
                            <div class="lead-form-section-head">
                                <p class="lead-form-section-kicker">Quoted Products</p>
                            </div>
                            ${renderQuoteLineItemsTable(quoteDraft, { readOnly: !isEditable })}
                        </div>
                        <div class="lead-quote-totals-grid">
                            <div class="metric-card">
                                <span class="metric-label">Subtotal</span>
                                <strong class="metric-value" data-quote-total-field="subtotal">${formatCurrency(quoteDraft.totals?.subtotal || 0)}</strong>
                            </div>
                            <div class="metric-card">
                                <span class="metric-label">Discount</span>
                                <strong class="metric-value" data-quote-total-field="discount">${formatCurrency(quoteDraft.totals?.discountTotal || 0)}</strong>
                            </div>
                            <div class="metric-card">
                                <span class="metric-label">Tax</span>
                                <strong class="metric-value" data-quote-total-field="tax">${formatCurrency(quoteDraft.totals?.taxTotal || 0)}</strong>
                            </div>
                            <div class="metric-card">
                                <span class="metric-label">Grand Total</span>
                                <strong class="metric-value" data-quote-total-field="grandTotal">${formatCurrency(quoteDraft.totals?.grandTotal || 0)}</strong>
                            </div>
                        </div>
                        ${renderQuoteAcceptanceFields(quoteDraft, { readOnly: normalizeText(quoteDraft.quoteStatus) === "Accepted" })}
                        <div class="lead-quote-editor-footer">
                            <div class="lead-quote-editor-note">
                                ${revisionDraft
            ? `Revision mode is active. Review the changes, then save draft or send to create the next version from ${sourceQuote?.businessQuoteId || "the selected quote"}.`
            : (acceptedQuote
                ? `Accepted quote on file: ${acceptedQuote.businessQuoteId || acceptedQuote.id} for ${formatCurrency(acceptedQuote.totals?.grandTotal || 0)}.`
                : "Only one quote should be marked accepted for a lead. Sent quotes are frozen and should be revised into a new version.")}
                            </div>
                            <div class="form-actions lead-quote-actions">
                                ${isEditable ? `
                                    <button class="button button-secondary" type="button" data-action="quote-reset-selection">
                                        <span class="button-icon">${icons.inactive}</span>
                                        Discard Changes
                                    </button>
                                    <button class="button button-secondary" type="button" data-action="quote-save-draft">
                                        <span class="button-icon">${icons.edit}</span>
                                        ${revisionDraft ? "Save Revision Quote" : "Save Quote"}
                                    </button>
                                    <button class="button button-primary-alt" type="button" data-action="quote-send">
                                        <span class="button-icon">${icons.plus}</span>
                                        ${revisionDraft ? "Send Revision Quote" : "Send Quote"}
                                    </button>
                                ` : `
                                    <button class="button button-secondary" type="button" data-action="quote-new-draft">
                                        <span class="button-icon">${icons.plus}</span>
                                        Create New Draft Version
                                    </button>
                                    ${selectedQuote ? `
                                        <button class="button button-secondary" type="button" data-action="quote-revise" data-quote-id="${selectedQuote.id}">
                                            <span class="button-icon">${icons.edit}</span>
                                            Revise
                                        </button>
                                        ${normalizeText(selectedQuote.quoteStatus) === "Sent" ? `
                                            <button class="button button-primary-alt" type="button" data-action="quote-accept" data-quote-id="${selectedQuote.id}">
                                                <span class="button-icon">${icons.active}</span>
                                                Mark Accepted
                                            </button>
                                            <button class="button button-secondary" type="button" data-action="quote-reject" data-quote-id="${selectedQuote.id}">
                                                <span class="button-icon">${icons.warning}</span>
                                                Reject
                                            </button>
                                            <button class="button button-secondary" type="button" data-action="quote-cancel" data-quote-id="${selectedQuote.id}">
                                                <span class="button-icon">${icons.inactive}</span>
                                                Cancel
                                            </button>
                                        ` : ""}
                                    ` : ""}
                                `}
                            </div>
                        </div>
                    ` : `
                        <div class="lead-quotes-empty lead-quotes-empty-large">
                            <p class="lead-quotes-empty-title">Quote history will appear here</p>
                            <p class="panel-copy">Create the first quote draft to capture a frozen snapshot of products, pricing, tax, and terms for this customer.</p>
                            <div class="form-actions" style="justify-content: flex-start;">
                                <button class="button button-primary-alt" type="button" data-action="quote-new-draft">
                                    <span class="button-icon">${icons.plus}</span>
                                    Create Quote Draft
                                </button>
                            </div>
                        </div>
                    `}
        </div>
    `;
}

function renderLeadQuotesWorkspace(editingLead) {
    if (!editingLead?.id) return "";

    return `
        <section class="panel-card lead-quotes-workspace-card">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.catalogue}</span>
                    <div>
                        <h3>Quotes Workspace</h3>
                        <p class="panel-copy">Draft, send, revise, and track accepted quote versions without leaving the lead.</p>
                    </div>
                </div>
                ${renderLeadQuotesWorkspaceMeta(editingLead)}
            </div>
            <div class="panel-body">
                ${renderLeadQuotesEditorCard(editingLead)}
                <div class="panel-card lead-quotes-grid-card">
                    <div class="panel-header">
                        <div class="panel-title-wrap">
                            <span class="panel-icon">${icons.catalogue}</span>
                            <div>
                                <h4>Quote Versions</h4>
                                <p class="panel-copy">Review all quote records below and use the action column for basic quote actions.</p>
                            </div>
                        </div>
                        <div class="lead-quotes-sidebar-actions">
                            <button class="button button-primary-alt" type="button" data-action="quote-new-draft">
                                <span class="button-icon">${icons.plus}</span>
                                ${featureState.quoteRows.length ? "Create New Draft Version" : "Create Quote Draft"}
                            </button>
                        </div>
                    </div>
                    <div class="panel-body">
                        <div class="toolbar lead-quotes-toolbar">
                            <div>
                                <p class="section-kicker" style="margin-bottom: 0.25rem;">Versions Grid</p>
                                <p class="panel-copy">Minimal columns, full width, and actions at the far right for faster handling.</p>
                            </div>
                            <div class="search-wrap">
                                <span class="search-icon">${icons.search}</span>
                                <input
                                    id="lead-quotes-search"
                                    class="input toolbar-search"
                                    type="search"
                                    placeholder="Search quote no, status, channel"
                                    value="${featureState.quoteSearchTerm}">
                            </div>
                        </div>
                        <div class="ag-shell">
                            <div id="lead-quotes-grid" class="ag-theme-alpine moneta-grid" style="height: 520px; width: 100%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;
}

function renderLeadQuotesDrawer() {
    if (getState().currentRoute !== "#/leads") {
        return "";
    }

    const activeLead = getQuoteContextLead();
    const hasQuotes = featureState.quoteRows.length > 0;
    const isOpen = Boolean(
        featureState.isQuoteDrawerOpen
        && featureState.quoteDrawerLeadId
        && activeLead?.id === featureState.quoteDrawerLeadId
    );

    if (!isOpen) {
        return "";
    }

    return `
        <div id="lead-quotes-drawer" class="lead-quotes-drawer-overlay">
            <aside class="lead-quotes-drawer-card">
                <div class="panel-header panel-header-accent">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.catalogue}</span>
                        <div>
                            <h3>Quote Quick View</h3>
                            <p class="panel-copy">Use this panel to scan quote history quickly. Drafting, editing, sending, and acceptance happen in the Quotes Workspace.</p>
                        </div>
                    </div>
                    <button class="button button-secondary" type="button" data-action="quote-close-drawer">
                        <span class="button-icon">${icons.close}</span>
                        Close
                    </button>
                </div>
                <div class="panel-body">
                    <div class="lead-quotes-drawer-summary">
                        <span class="status-pill">Lead: ${activeLead?.customerName || "-"}</span>
                        <span class="status-pill">${Number(activeLead?.quoteCount) || featureState.quoteRows.length} quotes</span>
                        ${activeLead?.latestQuoteStatus ? renderQuoteStatusPill(activeLead.latestQuoteStatus) : ""}
                    </div>
                    <div class="lead-quotes-drawer-sequence">
                        <p class="lead-quotes-drawer-sequence-title">Recommended flow</p>
                        <p class="panel-copy">${hasQuotes
            ? "1. Review the quote versions below. 2. Pick one to continue in the Quotes Workspace, or create a new draft version."
            : "1. Create the first quote draft. 2. Complete pricing and terms in the Quotes Workspace. 3. Send the quote from there."}</p>
                    </div>
                    <div class="lead-quotes-drawer-actions">
                        <button class="button button-primary-alt" type="button" data-action="quote-new-draft">
                            <span class="button-icon">${icons.plus}</span>
                            Create Quote Draft
                        </button>
                        ${hasQuotes ? `
                            <button class="button button-secondary" type="button" data-action="quote-focus-workspace">
                                <span class="button-icon">${icons.edit}</span>
                                Open Quotes Workspace
                            </button>
                        ` : ""}
                    </div>
                    <div class="lead-quote-list lead-quote-list-compact">
                        ${buildQuoteListMarkup(featureState.quoteRows, { compact: true })}
                    </div>
                </div>
            </aside>
        </div>
    `;
}

function renderLeadForm(snapshot) {
    const editingLead = getEditingLead();
    const activeLeadTab = getActiveLeadTab();
    const currentCatalogueId = featureState.selectedCatalogueId || editingLead?.catalogueId || "";
    const totalLeads = featureState.leads.length;
    const qualifiedCount = featureState.leads.filter(lead => lead.leadStatus === "Qualified").length;
    const convertedCount = featureState.leads.filter(lead => lead.leadStatus === "Converted").length;
    const requestedSummary = editingLead
        ? {
            requestedProductCount: (editingLead.requestedProducts || []).filter(item => (Number(item.requestedQty) || 0) > 0).length,
            requestedValue: Number(editingLead.requestedValue) || Number((editingLead.requestedProducts || []).reduce((sum, item) => {
                return sum + ((Number(item.requestedQty) || 0) * (Number(item.sellingPrice) || 0));
            }, 0).toFixed(2))
        }
        : { requestedProductCount: 0, requestedValue: 0 };
    const conversionEligibility = editingLead
        ? getLeadConversionEligibility(editingLead, snapshot)
        : { allowed: false, reason: "Save this enquiry first to enable conversion." };
    const convertDisabledAttrs = !conversionEligibility.allowed
        ? `disabled title="${escapeAttribute(conversionEligibility.reason)}" data-disabled-reason="${escapeAttribute(conversionEligibility.reason)}"`
        : "";

    return `
        <div class="panel-card">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.leads}</span>
                    <div>
                        <h2>${editingLead ? "Edit Enquiry" : "Leads & Enquiries"}</h2>
                        <p class="panel-copy">Capture enquiries, track follow-up in work logs, and convert validated enquiries into Retail Store sales.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${totalLeads} leads</span>
                    <span class="status-pill">${qualifiedCount} qualified</span>
                    <span class="status-pill">${convertedCount} converted</span>
                </div>
            </div>
            <div class="panel-body">
                ${editingLead ? renderLeadEditorTabs(editingLead, activeLeadTab) : ""}
                ${!editingLead || activeLeadTab === "details" ? `
                    <form id="lead-form">
                        <input id="lead-doc-id" type="hidden" value="${editingLead?.id || ""}">
                        <div class="lead-form-sections">
                            <section class="lead-form-section">
                                <div class="lead-form-section-head">
                                    <p class="lead-form-section-kicker">Customer Info</p>
                                </div>
                                <div class="lead-form-section-grid">
                                    <div class="field field-full">
                                        <label for="lead-customer-name">Full Name <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="lead-customer-name" class="input" type="text" value="${editingLead?.customerName || ""}" required>
                                    </div>
                                    <div class="field">
                                        <label for="lead-customer-phone">Phone</label>
                                        <input id="lead-customer-phone" class="input" type="tel" value="${editingLead?.customerPhone || ""}" placeholder="+1 555 123 4567">
                                    </div>
                                    <div class="field">
                                        <label for="lead-customer-email">Email</label>
                                        <input id="lead-customer-email" class="input" type="email" value="${editingLead?.customerEmail || ""}" placeholder="customer@example.com">
                                    </div>
                                    <div class="field field-full">
                                        <label for="lead-customer-address">Customer Address</label>
                                        <textarea id="lead-customer-address" class="textarea" placeholder="Street, city, zip, and delivery notes">${editingLead?.customerAddress || ""}</textarea>
                                    </div>
                                </div>
                            </section>

                            <section class="lead-form-section">
                                <div class="lead-form-section-head">
                                    <p class="lead-form-section-kicker">Lead Context</p>
                                </div>
                                <div class="lead-form-section-grid">
                                    <div class="field">
                                        <label for="lead-enquiry-date">Enquiry Date <span class="required-mark" aria-hidden="true">*</span></label>
                                        <input id="lead-enquiry-date" class="input" type="date" value="${formatDateInputValue(editingLead?.enquiryDate) || formatDateInputValue(new Date())}" required>
                                    </div>
                                    <div class="field">
                                        <label for="lead-expected-delivery-date">Expected Delivery</label>
                                        <input id="lead-expected-delivery-date" class="input" type="date" value="${formatDateInputValue(editingLead?.expectedDeliveryDate)}">
                                    </div>
                                    <div class="field field-full">
                                        <label for="lead-assigned-to">Assigned To</label>
                                        <input id="lead-assigned-to" class="input" type="text" value="${editingLead?.assignedTo || ""}" placeholder="Staff name or sales desk">
                                    </div>
                                    <div class="field">
                                        <label for="lead-source">Source <span class="required-mark" aria-hidden="true">*</span></label>
                                        <select id="lead-source" class="select" required>
                                            <option value="">Select source</option>
                                            ${renderSourceOptions(editingLead?.leadSource || "")}
                                        </select>
                                    </div>
                                    <div class="field">
                                        <label for="lead-status">Status <span class="required-mark" aria-hidden="true">*</span></label>
                                        <select id="lead-status" class="select" required>
                                            ${renderStatusOptions(editingLead?.leadStatus || "New")}
                                        </select>
                                    </div>
                                </div>
                            </section>

                            <section class="lead-form-section">
                                <div class="lead-form-section-head">
                                    <p class="lead-form-section-kicker">Requirements</p>
                                </div>
                                <div class="lead-form-section-grid">
                                    <div class="field field-full">
                                        <label for="lead-catalogue">Select Sales Catalogue <span class="required-mark" aria-hidden="true">*</span></label>
                                        <select id="lead-catalogue" class="select" required>
                                            <option value="">Select a catalogue...</option>
                                            ${resolveCatalogueOptions(snapshot, currentCatalogueId)}
                                        </select>
                                    </div>
                                    <div class="field field-full">
                                        <label for="lead-notes">General Notes</label>
                                        <textarea id="lead-notes" class="textarea" placeholder="Special requests, pricing notes, event context, or follow-up details">${editingLead?.leadNotes || ""}</textarea>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </form>
                    <div class="lead-product-list-shell">
                        <div class="lead-product-list-header">
                            <div>
                                <p class="lead-form-section-kicker lead-product-list-kicker">Product Inquiry List</p>
                                <p class="panel-copy">Only items with quantity greater than zero will be saved with this enquiry.</p>
                            </div>
                            <div class="lead-product-list-meta">
                                <span id="lead-requested-count" class="status-pill">Total Products: ${requestedSummary.requestedProductCount}</span>
                                <span id="lead-requested-value" class="status-pill">Total Value: ${formatCurrency(requestedSummary.requestedValue)}</span>
                            </div>
                        </div>
                        <div class="toolbar">
                            <div>
                                <p class="section-kicker" style="margin-bottom: 0.25rem;">Requested Products</p>
                                <p class="panel-copy">Search within the selected catalogue and capture the requested quantities directly in the worksheet.</p>
                            </div>
                            <div class="search-wrap">
                                <span class="search-icon">${icons.search}</span>
                                <input
                                    id="lead-products-search"
                                    class="input toolbar-search"
                                    type="search"
                                    placeholder="Search product or category"
                                    value="${featureState.itemSearchTerm}">
                            </div>
                        </div>
                        <div class="ag-shell">
                            <div id="lead-products-grid" class="ag-theme-alpine moneta-grid" style="height: 520px; width: 100%;"></div>
                        </div>
                        <div class="form-actions">
                            ${editingLead ? `
                                <button class="button button-primary-alt lead-convert-button" type="button" data-lead-id="${editingLead.id}" ${convertDisabledAttrs}>
                                    <span class="button-icon">${icons.retail}</span>
                                    Convert To Retail
                                </button>
                                <button class="button button-secondary lead-worklog-button" type="button" data-lead-id="${editingLead.id}">
                                    <span class="button-icon">${icons.leads}</span>
                                    Work Log
                                </button>
                                <button id="lead-cancel-button" class="button button-secondary" type="button">
                                    <span class="button-icon">${icons.inactive}</span>
                                    Cancel
                                </button>
                            ` : ""}
                            <button class="button button-primary-alt" type="submit" form="lead-form">
                                <span class="button-icon">${editingLead ? icons.edit : icons.plus}</span>
                                ${editingLead ? "Update Enquiry" : "Save Enquiry"}
                            </button>
                        </div>
                    </div>
                ` : renderLeadQuotesWorkspace(editingLead)}
            </div>
        </div>
    `;
}

function renderLeadQuotesPageShell() {
    const root = document.getElementById("lead-quotes-root");
    if (!root) return;

    const activeLead = getQuoteContextLead();

    root.innerHTML = activeLead
        ? `
            <div style="display:grid; gap:1rem;">
                <div class="panel-card">
                    <div class="panel-header panel-header-accent">
                        <div class="panel-title-wrap">
                            <span class="panel-icon panel-icon-alt">${icons.catalogue}</span>
                            <div>
                                <h2>Quote Workspace</h2>
                                <p class="panel-copy">Complete pricing, revise versions, send quotes, and record acceptance without the rest of the enquiry form competing for space.</p>
                            </div>
                        </div>
                        <div class="toolbar-meta">
                            <span class="status-pill">Lead: ${activeLead.customerName || "-"}</span>
                            <span class="status-pill">${activeLead.businessLeadId || "-"}</span>
                        </div>
                    </div>
                </div>
                ${renderLeadQuotesWorkspace(activeLead, { standalone: true })}
            </div>
        `
        : `
            <div class="panel-card">
                <div class="panel-header panel-header-accent">
                    <div class="panel-title-wrap">
                        <span class="panel-icon panel-icon-alt">${icons.catalogue}</span>
                        <div>
                            <h2>Quote Workspace</h2>
                            <p class="panel-copy">Open this workspace from a lead so Moneta knows which enquiry the quote belongs to.</p>
                        </div>
                    </div>
                </div>
                <div class="panel-body">
                    <div class="lead-quotes-empty lead-quotes-empty-large">
                        <p class="lead-quotes-empty-title">No lead selected</p>
                        <p class="panel-copy">Return to Leads & Enquiries, open a lead, and choose <strong>Create Quote Draft</strong> or <strong>Open Quote Workspace</strong>.</p>
                        <div class="form-actions" style="justify-content: flex-start;">
                            <button class="button button-secondary" type="button" data-action="quote-back-to-lead-list">
                                <span class="button-icon">${icons.leads}</span>
                                Go To Leads
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
}

function renderLeadsHistoryPanel() {
    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.leads}</span>
                    <div>
                        <h3>Enquiry History</h3>
                        <p class="panel-copy">Review all enquiries, reopen them for editing, and delete only the records that are still safe to remove.</p>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">History</p>
                        <p class="panel-copy">Search by customer, source, status, assignee, or lead id.</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="leads-grid-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search enquiry history"
                            value="${featureState.searchTerm}">
                    </div>
                </div>
                <div class="ag-shell">
                    <div id="leads-grid" class="ag-theme-alpine moneta-grid" style="height: 600px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function renderLeadWorkLogModal() {
    const activeLead = getActiveWorkLogLead();
    const entryCount = featureState.workLogEntries.length;

    return `
        <div id="lead-worklog-modal" class="purchase-payment-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="lead-worklog-title" ${activeLead ? "" : "hidden"}>
            <div class="purchase-payment-modal-card lead-worklog-modal-card" style="max-width: 1080px;">
                <div class="panel-header panel-header-accent purchase-payment-modal-header">
                    <div class="purchase-payment-modal-title-row">
                        <div>
                            <h3 id="lead-worklog-title">Lead Work Log</h3>
                            <p class="panel-copy">Track every follow-up, call, quote, and action taken for this enquiry.</p>
                        </div>
                    </div>
                    <div class="toolbar-meta purchase-payment-modal-meta">
                        <span class="status-pill">Lead: ${activeLead?.customerName || "-"}</span>
                        <span class="status-pill">${entryCount} entries</span>
                    </div>
                </div>
                <div class="panel-body purchase-payment-modal-body">
                    <div class="lead-worklog-shell">
                        <div class="panel-card lead-worklog-entry-card">
                            <div class="panel-header">
                                <div class="panel-title-wrap">
                                    <span class="panel-icon panel-icon-alt">${icons.plus}</span>
                                    <div>
                                        <h4>Add Work Log Entry</h4>
                                        <p class="panel-copy">Capture customer interaction notes in chronological order.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-body">
                                <form id="lead-worklog-entry-form">
                                    <input id="lead-worklog-lead-id" type="hidden" value="${activeLead?.id || ""}">
                                    <div class="lead-worklog-entry-grid">
                                        <div class="field">
                                            <label for="lead-worklog-type">Log Type <span class="required-mark" aria-hidden="true">*</span></label>
                                            <select id="lead-worklog-type" class="select" required>
                                                ${renderLogTypeOptions()}
                                            </select>
                                        </div>
                                        <div class="field field-full">
                                            <label for="lead-worklog-notes">Notes <span class="required-mark" aria-hidden="true">*</span></label>
                                            <textarea id="lead-worklog-notes" class="textarea" rows="3" placeholder="Document the interaction, follow-up outcome, or next action..." required></textarea>
                                        </div>
                                    </div>
                                    <div class="form-actions">
                                        <button id="lead-worklog-save-button" class="button button-primary-alt" type="submit">
                                            <span class="button-icon">${icons.plus}</span>
                                            Save Log Entry
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div class="panel-card lead-worklog-history-card">
                            <div class="panel-header">
                                <div class="panel-title-wrap">
                                    <span class="panel-icon">${icons.leads}</span>
                                    <div>
                                        <h4>History</h4>
                                        <p class="panel-copy">Search and review all logged activities for this enquiry.</p>
                                    </div>
                                </div>
                            </div>
                            <div class="panel-body">
                                <div class="toolbar">
                                    <div>
                                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Activity Timeline</p>
                                        <p class="panel-copy">Newest entries appear at the top.</p>
                                    </div>
                                    <div class="search-wrap">
                                        <span class="search-icon">${icons.search}</span>
                                        <input
                                            id="lead-worklog-search"
                                            class="input toolbar-search"
                                            type="search"
                                            placeholder="Search by type, notes, or user"
                                            value="${featureState.workLogSearchTerm}">
                                    </div>
                                </div>
                                <div class="ag-shell ag-shell-compact">
                                    <div id="lead-worklog-grid" class="ag-theme-alpine moneta-grid" style="height: 380px; width: 100%;"></div>
                                </div>
                                <div class="form-actions">
                                    <button id="lead-worklog-close-button" class="button button-secondary" type="button">
                                        <span class="button-icon">${icons.inactive}</span>
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderLeadsViewShell(snapshot) {
    const root = document.getElementById("leads-root");
    if (!root) return;
    const shouldShowHistory = !(getEditingLead()?.id && getActiveLeadTab() === "quotes");

    root.innerHTML = `
        <div style="display:grid; gap:1rem;">
            ${renderLeadForm(snapshot)}
            ${shouldShowHistory ? renderLeadsHistoryPanel() : ""}
        </div>
        ${renderLeadWorkLogModal()}
    `;
}

function refreshLeadQuotesWorkspaceDom() {
    const activeLead = getEditingLead() || getQuoteContextLead();
    const workspace = document.querySelector(".lead-quotes-workspace-card");

    if (!activeLead?.id || !workspace) {
        renderActiveLeadSurface();
        return;
    }

    const tabsNode = document.querySelector(".lead-editor-tabs");
    if (tabsNode && getState().currentRoute === "#/leads") {
        tabsNode.outerHTML = renderLeadEditorTabs(activeLead, getActiveLeadTab());
    }

    const workspaceMetaNode = workspace.querySelector(".lead-quotes-workspace-meta");
    if (workspaceMetaNode) {
        workspaceMetaNode.outerHTML = renderLeadQuotesWorkspaceMeta(activeLead);
    }

    const editorCardNode = workspace.querySelector(".lead-quote-editor-card");
    if (editorCardNode) {
        editorCardNode.outerHTML = renderLeadQuotesEditorCard(activeLead);
    }

    const createDraftButton = workspace.querySelector(".lead-quotes-sidebar-actions [data-action=\"quote-new-draft\"]");
    if (createDraftButton) {
        createDraftButton.innerHTML = `
            <span class="button-icon">${icons.plus}</span>
            ${featureState.quoteRows.length ? "Create New Draft Version" : "Create Quote Draft"}
        `;
    }

    syncLeadQuotesGrid();
}

function syncLeadProductsGrid() {
    const gridElement = document.getElementById("lead-products-grid");
    if (!gridElement) return;

    initializeLeadRequestedProductsGrid(gridElement, () => {
        updateRequestedSummary();
    });
    refreshLeadRequestedProductsGrid(featureState.catalogueItemRows);
    updateLeadRequestedProductsGridSearch(featureState.itemSearchTerm);
    updateRequestedSummary();
}

function syncLeadsGrid() {
    initializeLeadsGrid(document.getElementById("leads-grid"));
    refreshLeadsGrid(buildLeadGridRows());
    updateLeadsGridSearch(featureState.searchTerm);
}

function syncLeadWorkLogGrid() {
    if (!featureState.activeWorkLogLeadId) return;

    initializeLeadWorkLogGrid(document.getElementById("lead-worklog-grid"));
    refreshLeadWorkLogGrid(featureState.workLogEntries);
    updateLeadWorkLogGridSearch(featureState.workLogSearchTerm);
}

function syncLeadQuotesGrid() {
    const gridElement = document.getElementById("lead-quotes-grid");
    if (!gridElement) return;

    initializeLeadQuotesGrid(gridElement, quote => {
        if (!quote?.id) return;
        featureState.pendingQuoteSelectionId = "";
        featureState.activeQuoteId = quote.id;
        featureState.quoteDraft = buildQuoteDraftFromRecord(quote);
        renderActiveLeadSurface();
    });
    refreshLeadQuotesGrid(featureState.quoteRows, featureState.activeQuoteId || "");
    updateLeadQuotesGridSearch(featureState.quoteSearchTerm);
}

function detachQuoteListener(options = {}) {
    const { reset = false } = options;

    featureState.unsubscribeQuotes?.();
    featureState.unsubscribeQuotes = null;
    featureState.quoteListenerLeadId = null;

    if (reset) {
        featureState.quoteRows = [];
        featureState.activeQuoteId = "";
        featureState.pendingQuoteSelectionId = "";
        if (featureState.quoteDraft?.docId) {
            featureState.quoteDraft = null;
        }
    }
}

function detachWorkLogListener(options = {}) {
    const { reset = false } = options;

    featureState.unsubscribeWorkLog?.();
    featureState.unsubscribeWorkLog = null;
    featureState.workLogListenerLeadId = null;

    if (reset) {
        featureState.workLogEntries = [];
    }
}

function detachLeadsListener(options = {}) {
    const { clearRows = false } = options;

    featureState.unsubscribeLeads?.();
    featureState.unsubscribeLeads = null;

    if (clearRows) {
        featureState.leads = [];
        resetLeadWorkspace();
        detachQuoteListener({ reset: true });
        resetQuoteWorkspace({ closeDrawer: true });
        detachWorkLogListener({ reset: true });
        resetWorkLogWorkspace();
    }
}

function ensureQuoteListener(snapshot) {
    const isQuoteUiActive = getActiveLeadTab() === "quotes" || featureState.isQuoteDrawerOpen;
    const shouldListen = [ "#/leads", LEAD_QUOTES_ROUTE ].includes(snapshot.currentRoute)
        && Boolean(snapshot.currentUser)
        && Boolean(getQuoteContextLeadId())
        && isQuoteUiActive;

    if (!shouldListen) {
        if (![ "#/leads", LEAD_QUOTES_ROUTE ].includes(snapshot.currentRoute) || !snapshot.currentUser) {
            resetQuoteWorkspace({ closeDrawer: true });
            detachQuoteListener({ reset: true });
            return;
        }

        detachQuoteListener();
        return;
    }

    const leadId = getQuoteContextLeadId();
    if (
        featureState.unsubscribeQuotes
        && featureState.quoteListenerLeadId === leadId
    ) {
        return;
    }

    detachQuoteListener({ reset: true });
    featureState.quoteListenerLeadId = leadId;
    featureState.unsubscribeQuotes = subscribeToLeadQuotes(
        leadId,
        rows => {
            featureState.quoteRows = rows || [];

            if (featureState.isQuoteSaveInFlight) {
                return;
            }

            ensureQuoteSelection();
            hydrateQuoteDraftFromSelection();

            if (getQuoteContextLeadId()) {
                if (getState().currentRoute === LEAD_QUOTES_ROUTE) {
                    renderLeadQuotesView();
                } else if (getState().currentRoute === "#/leads") {
                    if (getActiveLeadTab() === "quotes") {
                        refreshLeadQuotesWorkspaceDom();
                    } else {
                        renderLeadsView();
                    }
                }
            }
        },
        error => {
            console.error("[Moneta] Failed to load lead quotes:", error);
            showToast("Could not load quote history for this enquiry.", "error", {
                title: "Leads & Enquiries"
            });
        }
    );
}

function ensureWorkLogListener(snapshot) {
    const shouldListen = snapshot.currentRoute === "#/leads"
        && Boolean(snapshot.currentUser)
        && Boolean(featureState.activeWorkLogLeadId);

    if (!shouldListen) {
        if (snapshot.currentRoute !== "#/leads" || !snapshot.currentUser) {
            const modal = document.getElementById("lead-worklog-modal");
            if (modal) {
                modal.hidden = true;
            }
            resetWorkLogWorkspace();
        }
        detachWorkLogListener({ reset: true });
        return;
    }

    if (
        featureState.unsubscribeWorkLog
        && featureState.workLogListenerLeadId === featureState.activeWorkLogLeadId
    ) {
        return;
    }

    detachWorkLogListener({ reset: true });
    featureState.workLogListenerLeadId = featureState.activeWorkLogLeadId;
    featureState.unsubscribeWorkLog = subscribeToLeadWorkLog(
        featureState.activeWorkLogLeadId,
        rows => {
            featureState.workLogEntries = rows || [];

            if (getState().currentRoute === "#/leads" && featureState.activeWorkLogLeadId) {
                syncLeadWorkLogGrid();
                const modal = document.getElementById("lead-worklog-modal");
                const entryCountPill = modal?.querySelector(".purchase-payment-modal-meta .status-pill:last-child");
                if (entryCountPill) {
                    entryCountPill.textContent = `${featureState.workLogEntries.length} entries`;
                }
            }
        },
        error => {
            console.error("[Moneta] Failed to load lead work log:", error);
            showToast("Could not load lead work log entries.", "error", {
                title: "Leads & Enquiries"
            });
        }
    );
}

function ensureLeadsListener(snapshot) {
    const shouldListen = ["#/leads", LEAD_QUOTES_ROUTE].includes(snapshot.currentRoute) && Boolean(snapshot.currentUser);

    if (!shouldListen) {
        detachLeadsListener();
        detachQuoteListener();
        detachWorkLogListener();
        return;
    }

    if (featureState.unsubscribeLeads) return;

    featureState.unsubscribeLeads = subscribeToLeads(
        rows => {
            featureState.leads = rows;

            if (featureState.editingLeadId && !rows.some(lead => lead.id === featureState.editingLeadId)) {
                resetLeadWorkspace();
            }

            if (featureState.activeWorkLogLeadId && !rows.some(lead => lead.id === featureState.activeWorkLogLeadId)) {
                closeLeadWorkLogModal();
            }

            const quoteContextLeadId = getQuoteContextLeadId();
            if (quoteContextLeadId && !rows.some(lead => lead.id === quoteContextLeadId)) {
                resetQuoteWorkspace({ closeDrawer: true });
                detachQuoteListener({ reset: true });
            }

            if (getState().currentRoute === LEAD_QUOTES_ROUTE) {
                renderLeadQuotesView();
            } else if (getState().currentRoute === "#/leads") {
                if (getActiveLeadTab() === "quotes") {
                    refreshLeadQuotesWorkspaceDom();
                } else {
                    renderLeadsView();
                }
            }
        },
        error => {
            console.error("[Moneta] Failed to load leads:", error);
            showToast("Could not load the enquiries module.", "error", {
                title: "Leads & Enquiries"
            });
        }
    );
}

export function renderLeadsView() {
    const snapshot = getState();
    renderLeadsViewShell(snapshot);
    syncLeadProductsGrid();
    syncLeadsGrid();
    syncLeadWorkLogGrid();
    syncLeadQuotesGrid();
    ensureQuoteListener(snapshot);
}

export function renderLeadQuotesView() {
    const snapshot = getState();
    syncQuoteWorkspaceRouteState();
    const routeParams = parseLeadQuoteRouteParams();
    const activeLead = getQuoteContextLead();

    if (routeParams.mode === "new" && activeLead?.id && (!featureState.quoteDraft || featureState.quoteDraft.docId)) {
        featureState.activeQuoteId = "";
        featureState.quoteDraft = buildLeadQuoteDraft(activeLead);
    }

    renderLeadQuotesPageShell();
    ensureQuoteListener(snapshot);
}

function handleLeadSearchInput(target) {
    featureState.searchTerm = target.value || "";
    updateLeadsGridSearch(featureState.searchTerm);
}

function handleLeadProductsSearchInput(target) {
    featureState.itemSearchTerm = target.value || "";
    updateLeadRequestedProductsGridSearch(featureState.itemSearchTerm);
}

async function handleCatalogueChange(target) {
    const catalogueId = target.value || "";
    await loadCatalogueItemsIntoWorkspace(catalogueId, []);
}

async function handleLeadSubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("lead-doc-id")?.value || "";
        const customerName = document.getElementById("lead-customer-name")?.value || "-";
        const catalogueLabel = document.getElementById("lead-catalogue")?.selectedOptions?.[0]?.textContent || "-";
        const leadStatus = document.getElementById("lead-status")?.value || "New";

        const result = await runProgressToastFlow({
            title: docId ? "Updating Enquiry" : "Saving Enquiry",
            initialMessage: "Reading enquiry form inputs...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Enquiry Updated" : "Enquiry Saved",
            successMessage: docId ? "The enquiry was updated successfully." : "The enquiry was saved successfully."
        }, async ({ update }) => {
            update("Validating customer details, dates, and requested products...", 36, "Step 2 of 5");

            update("Writing enquiry details to the database...", 72, "Step 3 of 5");
            const result = await saveLead({
                docId,
                customerName: document.getElementById("lead-customer-name")?.value,
                customerPhone: document.getElementById("lead-customer-phone")?.value,
                customerEmail: document.getElementById("lead-customer-email")?.value,
                customerAddress: document.getElementById("lead-customer-address")?.value,
                assignedTo: document.getElementById("lead-assigned-to")?.value,
                enquiryDate: document.getElementById("lead-enquiry-date")?.value,
                expectedDeliveryDate: document.getElementById("lead-expected-delivery-date")?.value,
                leadSource: document.getElementById("lead-source")?.value,
                leadStatus: document.getElementById("lead-status")?.value,
                catalogueId: document.getElementById("lead-catalogue")?.value,
                leadNotes: document.getElementById("lead-notes")?.value,
                requestedProducts: getLeadRequestedProductsGridRows()
            }, getState().currentUser, getState().masterData.salesCatalogues, getState().masterData.seasons);

            update("Refreshing enquiry history...", 88, "Step 4 of 5");
            resetLeadWorkspace();
            resetQuoteWorkspace({ closeDrawer: true });
            renderLeadsView();
            update("Leads and enquiry history are up to date.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Enquiry created." : "Enquiry updated.", "success", {
            title: "Leads & Enquiries"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Enquiry Saved" : "Enquiry Updated",
            message: "The enquiry record has been saved successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Customer", value: customerName },
                { label: "Catalogue", value: catalogueLabel },
                { label: "Status", value: leadStatus }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Lead save failed:", error);
    }
}

async function handleLeadEdit(button) {
    const leadId = button.dataset.leadId || null;
    const lead = featureState.leads.find(entry => entry.id === leadId) || null;
    if (!lead) return;

    if (featureState.quoteListenerLeadId !== leadId) {
        detachQuoteListener({ reset: true });
        resetQuoteWorkspace();
    }

    if (featureState.quoteDrawerLeadId && featureState.quoteDrawerLeadId !== leadId) {
        featureState.quoteDrawerLeadId = null;
        featureState.isQuoteDrawerOpen = false;
    }

    featureState.editingLeadId = leadId;
    featureState.activeLeadTab = "details";
    featureState.selectedCatalogueId = lead.catalogueId || "";
    featureState.itemSearchTerm = "";
    featureState.quoteSearchTerm = "";
    renderLeadsView();
    focusFormField({
        formId: "lead-form",
        inputSelector: "#lead-customer-name"
    });
    await loadCatalogueItemsIntoWorkspace(lead.catalogueId || "", lead.requestedProducts || []);
}

async function openLeadQuoteWorkspace(lead, options = {}) {
    const {
        quoteId = "",
        openDrawer = false,
        createDraft = false,
        sourceQuote = null
    } = options;

    if (!lead?.id) return;

    if (featureState.quoteListenerLeadId !== lead.id) {
        detachQuoteListener({ reset: true });
        resetQuoteWorkspace();
    }

    featureState.editingLeadId = lead.id;
    featureState.activeLeadTab = "quotes";
    featureState.selectedCatalogueId = lead.catalogueId || "";
    featureState.itemSearchTerm = "";
    featureState.quoteSearchTerm = "";
    featureState.quoteDrawerLeadId = openDrawer
        ? lead.id
        : (featureState.quoteDrawerLeadId === lead.id ? lead.id : null);
    featureState.isQuoteDrawerOpen = Boolean(openDrawer);
    featureState.pendingQuoteSelectionId = "";

    if (createDraft) {
        featureState.activeQuoteId = "";
        featureState.quoteDraft = buildLeadQuoteDraft(lead, sourceQuote);
    } else if (quoteId) {
        featureState.activeQuoteId = quoteId;
        const selectedQuote = featureState.quoteRows.find(entry => entry.id === quoteId) || await getLeadQuote(lead.id, quoteId);
        featureState.quoteDraft = selectedQuote ? buildQuoteDraftFromRecord(selectedQuote) : null;
    } else if (!featureState.quoteDraft && featureState.quoteRows.length) {
        ensureQuoteSelection();
        hydrateQuoteDraftFromSelection();
    }

    if (getState().currentRoute === LEAD_QUOTES_ROUTE) {
        renderLeadQuotesView();
    } else {
        renderLeadsView();
    }
    ensureQuoteListener(getState());
    await loadCatalogueItemsIntoWorkspace(lead.catalogueId || "", lead.requestedProducts || []);

    if (featureState.activeLeadTab === "quotes") {
        focusQuotesWorkspace();
        return;
    }

    focusFormField({
        formId: "lead-form",
        inputSelector: "#lead-customer-name"
    });
}

function openLeadQuotesDrawer(lead) {
    if (!lead?.id) return;

    featureState.quoteDrawerLeadId = lead.id;
    featureState.isQuoteDrawerOpen = true;
    renderLeadsView();
    ensureQuoteListener(getState());
}

function closeLeadQuotesDrawer() {
    featureState.isQuoteDrawerOpen = false;
    featureState.quoteDrawerLeadId = null;

    if (getState().currentRoute === LEAD_QUOTES_ROUTE) {
        renderLeadQuotesView();
        return;
    }

    renderLeadsView();
}

function focusQuotesWorkspace() {
    window.requestAnimationFrame(() => {
        const workspace = document.querySelector(".lead-quotes-workspace-card");
        workspace?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

function updateQuoteDraftField(field, value) {
    if (!featureState.quoteDraft) return;
    featureState.quoteDraft[field] = value;
}

function updateQuoteAcceptanceFieldsFromDom() {
    if (!featureState.quoteDraft) return;

    featureState.quoteDraft.acceptedByCustomerName = document.getElementById("lead-quote-accepted-by")?.value || "";
    featureState.quoteDraft.acceptedVia = document.getElementById("lead-quote-accepted-via")?.value || "";
    featureState.quoteDraft.acceptanceNotes = document.getElementById("lead-quote-acceptance-notes")?.value || "";
}

function getQuoteDraftPayload() {
    if (!featureState.quoteDraft) {
        throw new Error("Create or open a quote draft first.");
    }

    updateQuoteAcceptanceFieldsFromDom();

    return {
        docId: featureState.quoteDraft.docId || "",
        businessQuoteId: featureState.quoteDraft.businessQuoteId || "",
        sourceQuoteId: featureState.quoteDraft.sourceQuoteId || "",
        quoteStatus: featureState.quoteDraft.quoteStatus || "Draft",
        store: featureState.quoteDraft.store || "Church Store",
        validUntil: featureState.quoteDraft.validUntil || "",
        customerName: featureState.quoteDraft.customerName || "",
        customerPhone: featureState.quoteDraft.customerPhone || "",
        customerEmail: featureState.quoteDraft.customerEmail || "",
        customerAddress: featureState.quoteDraft.customerAddress || "",
        quoteNotes: featureState.quoteDraft.quoteNotes || "",
        internalNotes: featureState.quoteDraft.internalNotes || "",
        lineItems: featureState.quoteDraft.lineItems || []
    };
}

async function handleQuoteNewDraft() {
    const lead = getEditingLead() || getQuoteContextLead();

    if (!lead?.id) {
        showToast("Save or open a lead first before creating quotes.", "warning", {
            title: "Leads & Enquiries"
        });
        return;
    }

    await openLeadQuoteWorkspace(lead, {
        openDrawer: false,
        createDraft: true
    });
    focusQuotesWorkspace();
}

async function handleQuoteSelect(button) {
    const quoteId = button.dataset.quoteId || "";
    const lead = getEditingLead() || getQuoteContextLead();
    if (!lead?.id || !quoteId) return;

    await openLeadQuoteWorkspace(lead, {
        quoteId,
        openDrawer: false
    });
    focusQuotesWorkspace();
}

function handleQuoteLineFieldInput(target) {
    if (!featureState.quoteDraft || !isQuoteDraftEditable()) return;

    const lineIndex = Number(target.dataset.quoteLineIndex);
    const field = target.dataset.quoteLineField || "";
    const lineItems = featureState.quoteDraft.lineItems || [];
    const currentLine = lineItems[lineIndex];
    if (!currentLine) return;

    const numericValue = Number(target.value);
    const nextValue = Number.isFinite(numericValue) ? numericValue : 0;

    currentLine[field] = field === "quotedQty"
        ? Math.max(0, Math.floor(nextValue))
        : Math.max(0, Number(nextValue.toFixed(2)));

    recalculateQuoteDraftTotals();
    updateQuoteDraftMetricsDom();
}

async function handleQuoteSave(submitStatusOverride = "") {
    const lead = getEditingLead() || getQuoteContextLead();

    if (!lead?.id) {
        showToast("Open a saved lead before saving quotes.", "warning", {
            title: "Leads & Enquiries"
        });
        return;
    }

    try {
        featureState.isQuoteSaveInFlight = true;
        const payload = getQuoteDraftPayload();
        const submitStatus = submitStatusOverride || payload.quoteStatus || "Draft";
        const sourceQuote = payload.sourceQuoteId
            ? featureState.quoteRows.find(entry => entry.id === payload.sourceQuoteId) || null
            : null;
        const isRevisionCreate = !payload.docId && Boolean(payload.sourceQuoteId);
        const saveActionLabel = submitStatus === "Sent"
            ? (isRevisionCreate ? "Revision Quote Sent" : "Quote Sent")
            : submitStatus === "Expired"
                ? "Quote Marked Expired"
                : submitStatus === "Cancelled"
                    ? "Quote Cancelled"
                    : (isRevisionCreate ? "Revision Quote Saved" : "Quote Saved");
        const saveActionMessage = submitStatus === "Sent"
            ? "The quote was sent successfully."
            : submitStatus === "Expired"
                ? "The quote status was saved as expired."
                : submitStatus === "Cancelled"
                    ? "The quote status was saved as cancelled."
                    : "The quote was saved successfully.";
        const saveToastMessage = submitStatus === "Sent"
            ? (isRevisionCreate ? "Revision quote sent." : "Quote sent.")
            : submitStatus === "Expired"
                ? "Quote marked expired."
                : submitStatus === "Cancelled"
                    ? "Quote marked cancelled."
                    : (isRevisionCreate ? "Revision quote saved." : "Quote saved.");
        const result = await runProgressToastFlow({
            title: submitStatus === "Sent"
                ? (isRevisionCreate ? "Sending Revision Quote" : "Sending Quote")
                : (isRevisionCreate ? "Saving Revision Quote" : "Saving Quote"),
            initialMessage: "Reading quote draft inputs...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: saveActionLabel,
            successMessage: saveActionMessage
        }, async ({ update }) => {
            update("Validating customer details, quote status, and quoted items...", 38, "Step 2 of 5");

            update("Writing the quote snapshot to the database...", 70, "Step 3 of 5");
            const saveResult = await saveLeadQuote(
                payload,
                lead,
                getState().currentUser,
                {
                    submitStatus,
                    sourceQuote,
                    supersedeQuoteId: !payload.docId ? payload.sourceQuoteId || "" : ""
                }
            );

            update("Refreshing the latest quote version...", 86, "Step 4 of 5");
            const savedQuote = saveResult.quoteId ? await getLeadQuote(lead.id, saveResult.quoteId) : null;

            featureState.activeQuoteId = saveResult.quoteId || "";
            featureState.pendingQuoteSelectionId = saveResult.quoteId || "";
            featureState.quoteDraft = savedQuote ? buildQuoteDraftFromRecord(savedQuote) : null;
            featureState.quoteDrawerLeadId = lead.id;

            if (getState().currentRoute === LEAD_QUOTES_ROUTE && saveResult.quoteId) {
                window.history.replaceState(null, "", buildLeadQuoteWorkspaceRoute(lead.id, { quoteId: saveResult.quoteId }));
            }

            update("Quote workspace is up to date.", 96, "Step 5 of 5");
            return { saveResult, savedQuote };
        });

        featureState.isQuoteSaveInFlight = false;
        const hasSelectedQuoteRow = featureState.quoteRows.some(quote => quote.id === featureState.pendingQuoteSelectionId);
        if (hasSelectedQuoteRow) {
            ensureQuoteSelection();
            hydrateQuoteDraftFromSelection();
            if (getState().currentRoute === "#/leads" && getActiveLeadTab() === "quotes") {
                refreshLeadQuotesWorkspaceDom();
            } else {
                renderActiveLeadSurface();
            }
        }

        showToast(saveToastMessage, "success", {
                title: "Leads & Enquiries"
            });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: saveActionLabel,
            message: saveActionMessage,
            details: [
                { label: "Action", value: result.saveResult?.mode === "create" ? "Create" : "Update" },
                { label: "Quote", value: result.savedQuote?.businessQuoteId || "Pending" },
                { label: "Customer", value: payload.customerName || lead.customerName || "-" },
                { label: "Email", value: payload.customerEmail || "-" },
                { label: "Status", value: submitStatus },
                { label: "Channel", value: payload.store || "-" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Lead quote save failed:", error);
        featureState.isQuoteSaveInFlight = false;
        featureState.pendingQuoteSelectionId = "";
        ProgressToast.hide(0);
        showToast(error?.message || "Could not save this quote.", "error", {
            title: "Leads & Enquiries"
        });
    }
}

async function handleQuoteRevise(button) {
    const lead = getEditingLead() || getQuoteContextLead();
    const quoteId = button.dataset.quoteId || "";
    const quote = featureState.quoteRows.find(entry => entry.id === quoteId) || null;

    if (!lead?.id || !quote?.id) return;

    try {
        featureState.pendingQuoteSelectionId = "";
        featureState.activeQuoteId = quote.id;
        featureState.quoteDraft = buildLeadQuoteDraft(lead, quote);
        featureState.quoteDrawerLeadId = lead.id;
        renderActiveLeadSurface();
        focusQuotesWorkspace();

        showToast("Revision mode is ready. Save draft or send when the new version is ready.", "success", {
            title: "Leads & Enquiries"
        });
    } catch (error) {
        console.error("[Moneta] Quote revision failed:", error);
        showToast(error?.message || "Could not revise this quote.", "error", {
            title: "Leads & Enquiries"
        });
    }
}

async function handleQuoteAccept(button) {
    const lead = getEditingLead() || getQuoteContextLead();
    const quoteId = button.dataset.quoteId || "";
    const quote = featureState.quoteRows.find(entry => entry.id === quoteId) || null;

    if (!lead?.id || !quote?.id) return;

    try {
        updateQuoteAcceptanceFieldsFromDom();
        await acceptLeadQuote(lead, quote, {
            acceptedByCustomerName: featureState.quoteDraft?.acceptedByCustomerName || "",
            acceptedVia: featureState.quoteDraft?.acceptedVia || "",
            acceptanceNotes: featureState.quoteDraft?.acceptanceNotes || ""
        }, getState().currentUser);

        const acceptedQuote = await getLeadQuote(lead.id, quote.id);
        featureState.activeQuoteId = quote.id;
        featureState.quoteDraft = acceptedQuote ? buildQuoteDraftFromRecord(acceptedQuote) : null;
        if (getState().currentRoute === LEAD_QUOTES_ROUTE) {
            window.history.replaceState(null, "", buildLeadQuoteWorkspaceRoute(lead.id, { quoteId: quote.id }));
        }

        showToast("Quote marked accepted.", "success", {
            title: "Leads & Enquiries"
        });
    } catch (error) {
        console.error("[Moneta] Quote acceptance failed:", error);
        showToast(error?.message || "Could not mark this quote as accepted.", "error", {
            title: "Leads & Enquiries"
        });
    }
}

async function handleQuoteReject(button) {
    const lead = getEditingLead() || getQuoteContextLead();
    const quoteId = button.dataset.quoteId || "";
    const quote = featureState.quoteRows.find(entry => entry.id === quoteId) || null;

    if (!lead?.id || !quote?.id) return;

    const rejectionReason = window.prompt("Enter the rejection reason for this quote:", quote.rejectionReason || "") || "";
    if (!rejectionReason.trim()) return;

    try {
        await rejectLeadQuote(lead, quote, rejectionReason, getState().currentUser);
        const rejectedQuote = await getLeadQuote(lead.id, quote.id);
        featureState.activeQuoteId = quote.id;
        featureState.quoteDraft = rejectedQuote ? buildQuoteDraftFromRecord(rejectedQuote) : null;
        if (getState().currentRoute === LEAD_QUOTES_ROUTE) {
            window.history.replaceState(null, "", buildLeadQuoteWorkspaceRoute(lead.id, { quoteId: quote.id }));
        }

        showToast("Quote marked rejected.", "success", {
            title: "Leads & Enquiries"
        });
    } catch (error) {
        console.error("[Moneta] Quote rejection failed:", error);
        showToast(error?.message || "Could not reject this quote.", "error", {
            title: "Leads & Enquiries"
        });
    }
}

async function handleQuoteCancel(button) {
    const lead = getEditingLead() || getQuoteContextLead();
    const quoteId = button.dataset.quoteId || "";
    const quote = featureState.quoteRows.find(entry => entry.id === quoteId) || null;

    if (!lead?.id || !quote?.id) return;

    const cancellationReason = window.prompt("Enter the cancellation reason for this quote:", quote.cancellationReason || "") || "";
    if (!cancellationReason.trim()) return;

    try {
        await cancelLeadQuote(lead, quote, cancellationReason, getState().currentUser);
        const cancelledQuote = await getLeadQuote(lead.id, quote.id);
        featureState.activeQuoteId = quote.id;
        featureState.quoteDraft = cancelledQuote ? buildQuoteDraftFromRecord(cancelledQuote) : null;
        if (getState().currentRoute === LEAD_QUOTES_ROUTE) {
            window.history.replaceState(null, "", buildLeadQuoteWorkspaceRoute(lead.id, { quoteId: quote.id }));
        }

        showToast("Quote cancelled.", "success", {
            title: "Leads & Enquiries"
        });
    } catch (error) {
        console.error("[Moneta] Quote cancel failed:", error);
        showToast(error?.message || "Could not cancel this quote.", "error", {
            title: "Leads & Enquiries"
        });
    }
}

async function handleLeadConvert(button) {
    const leadId = button.dataset.leadId || null;
    const lead = featureState.leads.find(entry => entry.id === leadId) || null;

    if (!lead) {
        showToast("Enquiry record could not be found.", "error", {
            title: "Leads & Enquiries"
        });
        return;
    }

    const eligibility = getLeadConversionEligibility(lead, getState());
    if (!eligibility.allowed) {
        showToast(eligibility.reason, "warning", {
            title: "Leads & Enquiries"
        });
        return;
    }

    const requestedProductCount = (lead.requestedProducts || []).filter(item => (Number(item.requestedQty) || 0) > 0).length;
    const requestedValue = Number(lead.requestedValue) || Number((lead.requestedProducts || []).reduce((sum, item) => {
        return sum + ((Number(item.requestedQty) || 0) * (Number(item.sellingPrice) || 0));
    }, 0).toFixed(2));
    const quoteSource = await resolveLeadConversionQuoteSource(lead);
    let conversionSource = "lead";

    if (quoteSource?.quote) {
        const choice = await showChoiceModal({
            title: "Choose Conversion Source",
            message: "Select which source Moneta should use to prepare the Retail Store draft sale.",
            details: [
                { label: "Lead ID", value: lead.businessLeadId || "-" },
                { label: "Customer", value: lead.customerName || "-" },
                { label: "Quote", value: quoteSource.quote.businessQuoteId || "-" },
                { label: "Quote Status", value: quoteSource.quote.quoteStatus || "-" },
                { label: "Quote Total", value: formatCurrency(quoteSource.quote.totals?.grandTotal || 0) }
            ],
            note: "Quote conversion uses the quote snapshot for pricing, tax, and customer details. Lead conversion uses the enquiry requested products and current retail review flow.",
            choices: [
                { value: "quote", label: `Use ${quoteSource.label}`, variant: "primary" },
                { value: "lead", label: "Use Lead Request", variant: "secondary" },
                { value: "cancel", label: "Cancel", variant: "secondary" }
            ]
        });

        if (!choice || choice === "cancel") {
            showToast("Retail conversion cancelled.", "info", {
                title: "Leads & Enquiries"
            });
            return;
        }

        conversionSource = choice;
    }

    const preConversionDetails = conversionSource === "quote" && quoteSource?.quote
        ? [
            { label: "Lead ID", value: lead.businessLeadId || "-" },
            { label: "Customer", value: quoteSource.quote.customerSnapshot?.customerName || lead.customerName || "-" },
            { label: "Source", value: `${quoteSource.label}: ${quoteSource.quote.businessQuoteId || "-"}` },
            { label: "Quote Status", value: quoteSource.quote.quoteStatus || "-" },
            { label: "No. Of Products", value: String((quoteSource.quote.lineItems || []).filter(item => (Number(item.quotedQty) || 0) > 0).length) },
            { label: "Quoted Total", value: formatCurrency(quoteSource.quote.totals?.grandTotal || 0) }
        ]
        : [
            { label: "Lead ID", value: lead.businessLeadId || "-" },
            { label: "Customer", value: lead.customerName || "-" },
            { label: "Catalogue", value: lead.catalogueName || "-" },
            { label: "No. Of Products", value: String(requestedProductCount) },
            { label: "Est. Value", value: formatCurrency(requestedValue) }
        ];
    const preConversionConfirmed = await showConfirmationModal({
        title: "Convert Enquiry To Retail Sale",
        message: "Open this enquiry in Retail Store as a prefilled draft sale?",
        details: preConversionDetails,
        note: conversionSource === "quote"
            ? "Checklist: review the selected quote snapshot, confirm the retail store, and verify payment handling before saving. Quote conversion carries frozen quote pricing, tax, and customer details into Retail Store."
            : "Checklist: verify the correct sales catalogue is selected, confirm requested quantities and customer contact details, then review store, pricing, tax, discount, and payment in Retail Store before saving. No sale is saved yet; conversion opens a prefilled draft sale.",
        confirmText: "Convert",
        cancelText: "Cancel",
        tone: "warning"
    });

    if (!preConversionConfirmed) {
        showToast("Retail conversion cancelled.", "info", {
            title: "Leads & Enquiries"
        });
        return;
    }

    try {
        const conversionDraft = await runProgressToastFlow({
            title: "Preparing Retail Conversion",
            initialMessage: conversionSource === "quote"
                ? "Reading enquiry and selected quote snapshot..."
                : "Reading enquiry details and requested products...",
            initialProgress: 18,
            initialStep: "Step 1 of 4",
            successTitle: "Conversion Package Ready",
            successMessage: "The enquiry is ready to open in Retail Store."
        }, async ({ update }) => {
            update(
                conversionSource === "quote"
                    ? "Validating lead status, selected quote snapshot, and quoted products..."
                    : "Validating lead status, catalogue, and requested products...",
                42,
                "Step 2 of 4"
            );
            const conversionDraft = conversionSource === "quote" && quoteSource?.quote
                ? await buildLeadQuoteToRetailConversionDraft(lead, quoteSource.quote, getState().masterData)
                : await buildLeadToRetailConversionDraft(lead, getState().masterData);
            update(
                conversionSource === "quote"
                    ? "Preparing retail worksheet line items using quote pricing and tax..."
                    : "Preparing retail worksheet line items using current catalogue pricing...",
                76,
                "Step 3 of 4"
            );
            update("Conversion package prepared.", 96, "Step 4 of 4");
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
                    title: "Leads & Enquiries"
                });
                return;
            }
        }

        const conversionPackage = {
            sourceType: conversionDraft.sourceType || conversionSource,
            leadId: conversionDraft.leadId,
            businessLeadId: conversionDraft.businessLeadId,
            sourceQuoteId: conversionDraft.sourceQuoteId || "",
            sourceQuoteNumber: conversionDraft.sourceQuoteNumber || "",
            sourceQuoteStatus: conversionDraft.sourceQuoteStatus || "",
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

        sessionStorage.setItem(LEAD_TO_RETAIL_CONVERSION_STORAGE_KEY, JSON.stringify(conversionPackage));
        ProgressToast.hide(0);
        showToast("Enquiry loaded. Opening Retail Store workspace...", "success", {
            title: "Leads & Enquiries"
        });
        window.location.hash = RETAIL_ROUTE;
    } catch (error) {
        console.error("[Moneta] Lead conversion prep failed:", error);
        ProgressToast.hide(0);
        showToast(error?.message || "Could not prepare this lead for retail conversion.", "error", {
            title: "Leads & Enquiries"
        });
    }
}

async function handleLeadDelete(button) {
    const leadId = button.dataset.leadId || null;
    const lead = featureState.leads.find(entry => entry.id === leadId) || null;

    if (!lead) {
        showToast("Enquiry record could not be found.", "error", {
            title: "Leads & Enquiries"
        });
        return;
    }

    const confirmed = await showConfirmationModal({
        title: "Delete Enquiry",
        message: `Delete the enquiry for ${lead.customerName || "this customer"}?`,
        details: [
            { label: "Lead ID", value: lead.businessLeadId || "-" },
            { label: "Customer", value: lead.customerName || "-" },
            { label: "Status", value: lead.leadStatus || "New" }
        ],
        note: "This action cannot be undone. Converted enquiries or enquiries already linked to a sale are protected and will not be deleted.",
        confirmText: "Delete",
        cancelText: "Cancel",
        tone: "danger"
    });

    if (!confirmed) return;

    try {
        await runProgressToastFlow({
            title: "Deleting Enquiry",
            initialMessage: "Reading the selected enquiry record...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: "Enquiry Deleted",
            successMessage: "The enquiry record was deleted successfully."
        }, async ({ update }) => {
            update("Validating whether this enquiry can still be deleted...", 36, "Step 2 of 5");
            update("Removing the enquiry from the database...", 72, "Step 3 of 5");
            await deleteLead(lead);

            update("Refreshing enquiry history...", 88, "Step 4 of 5");
            if (featureState.editingLeadId === leadId) {
                resetLeadWorkspace();
                resetQuoteWorkspace({ closeDrawer: true });
            }
            if (featureState.quoteDrawerLeadId === leadId) {
                resetQuoteWorkspace({ closeDrawer: true });
            }
            renderLeadsView();
            update("Leads and enquiries are up to date.", 96, "Step 5 of 5");
        });

        showToast("Enquiry deleted.", "success", {
            title: "Leads & Enquiries"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Enquiry Deleted",
            message: "The enquiry record was removed successfully.",
            details: [
                { label: "Lead ID", value: lead.businessLeadId || "-" },
                { label: "Customer", value: lead.customerName || "-" },
                { label: "Status", value: lead.leadStatus || "New" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Lead delete failed:", error);
    }
}

function openLeadWorkLogModal(lead) {
    if (!lead?.id) return;

    featureState.activeWorkLogLeadId = lead.id;
    featureState.workLogSearchTerm = "";
    featureState.workLogEntries = [];

    const modal = document.getElementById("lead-worklog-modal");
    if (!modal) return;

    const leadIdInput = document.getElementById("lead-worklog-lead-id");
    const leadTypeSelect = document.getElementById("lead-worklog-type");
    const notesInput = document.getElementById("lead-worklog-notes");
    const searchInput = document.getElementById("lead-worklog-search");
    const leadPill = modal.querySelector(".purchase-payment-modal-meta .status-pill:first-child");
    const countPill = modal.querySelector(".purchase-payment-modal-meta .status-pill:last-child");

    if (leadIdInput) {
        leadIdInput.value = lead.id;
    }

    if (leadTypeSelect) {
        leadTypeSelect.value = "General Note";
    }

    if (notesInput) {
        notesInput.value = "";
    }

    if (searchInput) {
        searchInput.value = "";
    }

    if (leadPill) {
        leadPill.textContent = `Lead: ${lead.customerName || "-"}`;
    }

    if (countPill) {
        countPill.textContent = "0 entries";
    }

    modal.hidden = false;
    syncLeadWorkLogGrid();
    ensureWorkLogListener(getState());

    focusFormField({
        formId: "lead-worklog-entry-form",
        inputSelector: "#lead-worklog-notes"
    });
}

function closeLeadWorkLogModal() {
    const modal = document.getElementById("lead-worklog-modal");
    const form = document.getElementById("lead-worklog-entry-form");

    if (modal) {
        modal.hidden = true;
    }

    form?.reset();
    detachWorkLogListener({ reset: true });
    resetWorkLogWorkspace();
}

function handleLeadWorkLogSearchInput(target) {
    featureState.workLogSearchTerm = target.value || "";
    updateLeadWorkLogGridSearch(featureState.workLogSearchTerm);
}

function handleLeadQuoteSearchInput(target) {
    featureState.quoteSearchTerm = target.value || "";
    updateLeadQuotesGridSearch(featureState.quoteSearchTerm);
}

function renderActiveLeadSurface() {
    if (getState().currentRoute === LEAD_QUOTES_ROUTE) {
        renderLeadQuotesView();
        return;
    }

    renderLeadsView();
}

async function handleLeadWorkLogOpen(button) {
    const leadId = button.dataset.leadId || null;
    const lead = featureState.leads.find(entry => entry.id === leadId) || null;

    if (!lead) {
        showToast("Lead record could not be found.", "error", {
            title: "Leads & Enquiries"
        });
        return;
    }

    openLeadWorkLogModal(lead);
}

async function handleLeadWorkLogSubmit(event) {
    event.preventDefault();

    const leadId = document.getElementById("lead-worklog-lead-id")?.value || "";
    const logType = document.getElementById("lead-worklog-type")?.value || "";
    const notes = document.getElementById("lead-worklog-notes")?.value || "";
    try {
        await runProgressToastFlow({
            title: "Saving Work Log Entry",
            initialMessage: "Reading lead activity inputs...",
            initialProgress: 24,
            initialStep: "Step 1 of 4",
            successTitle: "Work Log Saved",
            successMessage: "The lead work log entry was saved successfully."
        }, async ({ update }) => {
            update("Validating work log type and notes...", 48, "Step 2 of 4");
            update("Writing work log entry to the database...", 74, "Step 3 of 4");
            await saveLeadWorkLog({
                leadId,
                logType,
                notes
            }, getState().currentUser);
            update("Refreshing activity history...", 92, "Step 4 of 4");
        });

        showToast("Work log entry saved.", "success", {
            title: "Leads & Enquiries"
        });
        ProgressToast.hide(0);

        const form = document.getElementById("lead-worklog-entry-form");
        form?.reset();
        const typeSelect = document.getElementById("lead-worklog-type");
        if (typeSelect) {
            typeSelect.value = "General Note";
        }
    } catch (error) {
        console.error("[Moneta] Lead work log save failed:", error);
    }
}

function handleCancelEdit() {
    resetLeadWorkspace();
    resetQuoteWorkspace({ closeDrawer: true });
    renderLeadsView();
}

function bindLeadsDomEvents() {
    const root = document.getElementById("app-content");
    if (!root || root.dataset.leadsBound === "true") return;

    root.addEventListener("input", event => {
        const leadsSearchInput = event.target.closest("#leads-grid-search");
        const productsSearchInput = event.target.closest("#lead-products-search");
        const workLogSearchInput = event.target.closest("#lead-worklog-search");
        const quoteSearchInput = event.target.closest("#lead-quotes-search");
        const quoteCustomerNameInput = event.target.closest("#lead-quote-customer-name");
        const quoteCustomerPhoneInput = event.target.closest("#lead-quote-customer-phone");
        const quoteCustomerEmailInput = event.target.closest("#lead-quote-customer-email");
        const quoteCustomerAddressInput = event.target.closest("#lead-quote-customer-address");
        const quoteNotesInput = event.target.closest("#lead-quote-notes");
        const quoteInternalNotesInput = event.target.closest("#lead-quote-internal-notes");
        const quoteAcceptedByInput = event.target.closest("#lead-quote-accepted-by");
        const quoteAcceptedViaInput = event.target.closest("#lead-quote-accepted-via");
        const quoteAcceptanceNotesInput = event.target.closest("#lead-quote-acceptance-notes");

        if (leadsSearchInput) {
            handleLeadSearchInput(leadsSearchInput);
            return;
        }

        if (productsSearchInput) {
            handleLeadProductsSearchInput(productsSearchInput);
            return;
        }

        if (workLogSearchInput) {
            handleLeadWorkLogSearchInput(workLogSearchInput);
            return;
        }

        if (quoteSearchInput) {
            handleLeadQuoteSearchInput(quoteSearchInput);
            return;
        }

        if (quoteCustomerNameInput) {
            updateQuoteDraftField("customerName", quoteCustomerNameInput.value || "");
            return;
        }

        if (quoteCustomerPhoneInput) {
            updateQuoteDraftField("customerPhone", quoteCustomerPhoneInput.value || "");
            return;
        }

        if (quoteCustomerEmailInput) {
            updateQuoteDraftField("customerEmail", quoteCustomerEmailInput.value || "");
            return;
        }

        if (quoteCustomerAddressInput) {
            updateQuoteDraftField("customerAddress", quoteCustomerAddressInput.value || "");
            return;
        }

        if (quoteNotesInput) {
            updateQuoteDraftField("quoteNotes", quoteNotesInput.value || "");
            return;
        }

        if (quoteInternalNotesInput) {
            updateQuoteDraftField("internalNotes", quoteInternalNotesInput.value || "");
            return;
        }

        if (quoteAcceptedByInput) {
            updateQuoteDraftField("acceptedByCustomerName", quoteAcceptedByInput.value || "");
            return;
        }

        if (quoteAcceptedViaInput) {
            updateQuoteDraftField("acceptedVia", quoteAcceptedViaInput.value || "");
            return;
        }

        if (quoteAcceptanceNotesInput) {
            updateQuoteDraftField("acceptanceNotes", quoteAcceptanceNotesInput.value || "");
        }
    });

    root.addEventListener("change", event => {
        const catalogueSelect = event.target.closest("#lead-catalogue");
        const quoteStoreSelect = event.target.closest("#lead-quote-store");
        const quoteStatusSelect = event.target.closest("#lead-quote-status");
        const quoteValidUntilInput = event.target.closest("#lead-quote-valid-until");
        const quoteLineInput = event.target.closest(".lead-quote-line-input");

        if (catalogueSelect) {
            handleCatalogueChange(catalogueSelect);
            return;
        }

        if (quoteStoreSelect && featureState.quoteDraft) {
            updateQuoteDraftField("store", quoteStoreSelect.value || "Church Store");
            applyQuoteStoreTaxDefaults(featureState.quoteDraft.store || "Church Store");
            renderLeadsView();
            return;
        }

        if (quoteStatusSelect && featureState.quoteDraft) {
            updateQuoteDraftField("quoteStatus", quoteStatusSelect.value || "Draft");
            renderLeadsView();
            return;
        }

        if (quoteValidUntilInput && featureState.quoteDraft) {
            updateQuoteDraftField("validUntil", quoteValidUntilInput.value || "");
            return;
        }

        if (quoteLineInput) {
            handleQuoteLineFieldInput(quoteLineInput);
        }
    });

    root.addEventListener("submit", event => {
        if (event.target.closest("#lead-form")) {
            handleLeadSubmit(event);
            return;
        }

        if (event.target.closest("#lead-worklog-entry-form")) {
            handleLeadWorkLogSubmit(event);
        }
    });

    root.addEventListener("click", event => {
        const editButton = event.target.closest(".lead-edit-button");
        const quotesButton = event.target.closest(".lead-quotes-button");
        const convertButton = event.target.closest(".lead-convert-button");
        const workLogButton = event.target.closest(".lead-worklog-button");
        const deleteButton = event.target.closest(".lead-delete-button");
        const cancelButton = event.target.closest("#lead-cancel-button");
        const closeWorkLogButton = event.target.closest("#lead-worklog-close-button");
        const workLogModalBackdrop = event.target.closest("#lead-worklog-modal");
        const quoteActionButton = event.target.closest("[data-action]");
        const quoteDrawerBackdrop = event.target.id === "lead-quotes-drawer" ? event.target : null;

        if (editButton) {
            handleLeadEdit(editButton);
            return;
        }

        if (quotesButton) {
            const leadId = quotesButton.dataset.leadId || "";
            const lead = featureState.leads.find(entry => entry.id === leadId) || null;
            if (!lead) return;
            openLeadQuoteWorkspace(lead, { openDrawer: false });
            return;
        }

        if (convertButton) {
            handleLeadConvert(convertButton);
            return;
        }

        if (workLogButton) {
            handleLeadWorkLogOpen(workLogButton);
            return;
        }

        if (deleteButton) {
            handleLeadDelete(deleteButton);
            return;
        }

        if (cancelButton) {
            handleCancelEdit();
            return;
        }

        if (closeWorkLogButton) {
            closeLeadWorkLogModal();
            return;
        }

        if (quoteActionButton) {
            const action = quoteActionButton.dataset.action || "";

            if (action === "lead-tab") {
                const nextTab = quoteActionButton.dataset.tab || "details";
                featureState.activeLeadTab = nextTab === "quotes" ? "quotes" : "details";
                renderLeadsView();
                if (featureState.activeLeadTab === "quotes") {
                    focusQuotesWorkspace();
                }
                return;
            }

            if (action === "quote-route-new") {
                handleQuoteNewDraft();
                return;
            }

            if (action === "quote-open-drawer") {
                const lead = getEditingLead() || getQuoteContextLead();
                if (lead) {
                    openLeadQuotesDrawer(lead);
                }
                return;
            }

            if (action === "quote-close-drawer") {
                closeLeadQuotesDrawer();
                return;
            }

            if (action === "quote-focus-workspace") {
                featureState.activeLeadTab = "quotes";
                closeLeadQuotesDrawer();
                renderLeadsView();
                focusQuotesWorkspace();
                return;
            }

            if (action === "quote-new-draft") {
                handleQuoteNewDraft();
                return;
            }

            if (action === "quote-select") {
                handleQuoteSelect(quoteActionButton);
                return;
            }

            if (action === "quote-save-draft") {
                handleQuoteSave();
                return;
            }

            if (action === "quote-send") {
                handleQuoteSave("Sent");
                return;
            }

            if (action === "quote-revise") {
                handleQuoteRevise(quoteActionButton);
                return;
            }

            if (action === "quote-accept") {
                handleQuoteAccept(quoteActionButton);
                return;
            }

            if (action === "quote-reject") {
                handleQuoteReject(quoteActionButton);
                return;
            }

            if (action === "quote-cancel") {
                handleQuoteCancel(quoteActionButton);
                return;
            }

            if (action === "quote-reset-selection") {
                const selectedQuote = getSelectedQuote();
                featureState.quoteDraft = selectedQuote ? buildQuoteDraftFromRecord(selectedQuote) : null;
                renderLeadsView();
                return;
            }
        }

        if (event.target.id === "lead-worklog-modal" && workLogModalBackdrop) {
            closeLeadWorkLogModal();
            return;
        }

        if (quoteDrawerBackdrop) {
            closeLeadQuotesDrawer();
        }
    });

    root.dataset.leadsBound = "true";
}

export function initializeLeadsFeature() {
    bindLeadsDomEvents();

    subscribe(snapshot => {
        ensureLeadsListener(snapshot);
        ensureQuoteListener(snapshot);
        ensureWorkLogListener(snapshot);

        if (snapshot.currentRoute === "#/leads") {
            renderLeadsView();
        }
    });
}
