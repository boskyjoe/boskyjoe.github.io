import { getState, subscribe } from "../../app/store.js";
import { showChoiceModal, showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import {
    initializeCategoriesGrid,
    initializePaymentModesGrid,
    initializePricingPoliciesGrid,
    initializeProductPriceChangeReviewsGrid,
    initializeReorderPoliciesGrid,
    initializeSeasonsGrid,
    initializeStoreConfigsGrid,
    refreshCategoriesGrid,
    refreshPaymentModesGrid,
    refreshPricingPoliciesGrid,
    refreshProductPriceChangeReviewsGrid,
    refreshReorderPoliciesGrid,
    refreshSeasonsGrid,
    refreshStoreConfigsGrid,
    updateCategoriesGridSearch,
    updatePaymentModesGridSearch,
    updatePricingPoliciesGridSearch,
    updateProductPriceChangeReviewsGridSearch,
    updateReorderPoliciesGridSearch,
    updateSeasonsGridSearch,
    updateStoreConfigsGridSearch
} from "./grid.js";
import {
    buildPricingPolicyExplanation,
    COSTING_METHODS,
    resolveSystemDefaultPricingPolicy,
    SELLING_PRICE_BEHAVIORS
} from "../../shared/pricing-policy.js";
import {
    DEFAULT_REORDER_POLICY,
    buildReorderPolicyPrecedenceSummary,
    buildReorderPolicyExplanation,
    buildReorderPolicyScopeSummary,
    buildReorderPolicyWorkedExample,
    isSystemDefaultReorderPolicy,
    resolveReorderPolicyFallbackChain,
    resolveSystemDefaultPolicy
} from "../../shared/reorder-policy.js";
import {
    approveProductPriceChangeReview,
    getAdminEditRestriction,
    rejectProductPriceChangeReview,
    saveCategory,
    savePaymentMode,
    savePricingPolicy,
    saveReorderPolicy,
    saveSeason,
    saveStoreConfig,
    toggleCategoryStatus,
    togglePaymentModeStatus,
    toggleReorderPolicyStatus,
    toggleSeasonStatus
} from "./service.js";

function normalizeText(value) {
    return (value || "").trim();
}

const ADMIN_SECTIONS = {
    categories: {
        label: "Product Categories",
        entityLabel: "Category",
        icon: icons.products,
        description: "Control the product classification layer used by catalogue management and reporting."
    },
    seasons: {
        label: "Sales Seasons",
        entityLabel: "Season",
        icon: icons.catalogue,
        description: "Define seasonal windows that sales catalogues and campaigns can anchor to."
    },
    paymentModes: {
        label: "Payment Modes",
        entityLabel: "Payment Mode",
        icon: icons.payment,
        description: "Manage the transaction methods available across supplier and sales workflows."
    },
    pricingPolicies: {
        label: "Pricing Policy",
        entityLabel: "Pricing Policy",
        icon: icons.reports,
        description: "Control how Moneta derives standard cost from purchases and how it recommends or updates selling prices."
    },
    productPriceChangeReviews: {
        label: "Price Reviews",
        entityLabel: "Price Review",
        icon: icons.warning,
        description: "Review suggested product price changes, approve or reject them, and decide whether active Sales Catalogue items should sync."
    },
    storeConfigs: {
        label: "Store Config",
        entityLabel: "Store Config",
        icon: icons.retail,
        description: "Maintain the live business profile for each retail store, including invoice, tax, bank, and payment defaults."
    },
    reorderPolicies: {
        label: "Reorder Policies",
        entityLabel: "Reorder Policy",
        icon: icons.reports,
        description: "Define the stock-cover rules Moneta uses for Reorder Recommendations and explain them in plain language."
    }
};

const SEASON_STATUS_OPTIONS = ["Upcoming", "Active", "Archived"];
const NO_SELECTION = "__none__";

const featureState = {
    activeSection: "categories",
    searchTerms: {
        categories: "",
        seasons: "",
        paymentModes: "",
        pricingPolicies: "",
        productPriceChangeReviews: "",
        storeConfigs: "",
        reorderPolicies: ""
    },
    editingIds: {
        categories: null,
        seasons: null,
        paymentModes: null,
        pricingPolicies: null,
        productPriceChangeReviews: null,
        storeConfigs: null,
        reorderPolicies: null
    }
};

const ADMIN_FORM_FOCUS_TARGETS = {
    categories: {
        formId: "admin-category-form",
        inputSelector: "#admin-category-name"
    },
    seasons: {
        formId: "admin-season-form",
        inputSelector: "#admin-season-name"
    },
    paymentModes: {
        formId: "admin-payment-mode-form",
        inputSelector: "#admin-payment-mode-name"
    },
    pricingPolicies: {
        formId: "admin-pricing-policy-form",
        inputSelector: "#admin-pricing-policy-name"
    },
    productPriceChangeReviews: {
        formId: null,
        inputSelector: "#admin-product-price-review-approve-button"
    },
    storeConfigs: {
        formId: "admin-store-config-form",
        inputSelector: "#admin-store-config-company-name"
    },
    reorderPolicies: {
        formId: "admin-reorder-policy-form",
        inputSelector: "#admin-reorder-policy-name"
    }
};

function getAdminSectionFromHash() {
    const hash = window.location.hash || "";
    const [route, queryString = ""] = hash.split("?");
    if (route !== "#/admin-modules") {
        return null;
    }

    const params = new URLSearchParams(queryString);
    const section = params.get("section") || "categories";
    return ADMIN_SECTIONS[section] ? section : "categories";
}

function syncActiveSectionFromHash() {
    const section = getAdminSectionFromHash();
    if (section) {
        setActiveSection(section);
    }
}

function toDateInputValue(value) {
    if (!value) return "";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatCurrency(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
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

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#39;");
}

function renderFieldLabel({
    forId,
    label,
    required = false,
    tooltip = ""
} = {}) {
    const tooltipText = escapeHtml(tooltip);

    return `
        <label for="${forId}" class="field-label-row">
            <span class="field-label-main">
                <span>${label}</span>
                ${required ? `<span class="required-mark" aria-hidden="true">*</span>` : ""}
            </span>
            ${tooltip ? `
                <span
                    class="field-help-tip"
                    tabindex="0"
                    role="img"
                    aria-label="${escapeHtml(`${label}. ${tooltip}`)}"
                    title="${tooltipText}">?</span>
            ` : ""}
        </label>
    `;
}

function getActiveSectionConfig() {
    return ADMIN_SECTIONS[featureState.activeSection];
}

function clearEditingState(section = featureState.activeSection) {
    featureState.editingIds[section] = null;
}

function clearReviewSelection(section = "productPriceChangeReviews") {
    featureState.editingIds[section] = NO_SELECTION;
}

function setActiveSection(section) {
    if (!ADMIN_SECTIONS[section]) return;
    featureState.activeSection = section;
}

function getPendingProductPriceReviews(rows = []) {
    return (rows || []).filter(record => normalizeText(record.status || "pending") === "pending");
}

function getEditingRecord(snapshot, section = featureState.activeSection) {
    const recordId = featureState.editingIds[section];

    if (section === "pricingPolicies") {
        const rows = (snapshot.masterData.pricingPolicies || []).slice().sort((left, right) => {
            if (Boolean(left.isSystemDefault) !== Boolean(right.isSystemDefault)) {
                return left.isSystemDefault ? -1 : 1;
            }

            return 0;
        });

        if (recordId) {
            return rows.find(record => record.id === recordId) || null;
        }

        return rows[0] || null;
    }

    if (section === "storeConfigs") {
        const rows = (snapshot.masterData.storeConfigs || []).slice().sort((left, right) => (Number(left.sortOrder) || 999) - (Number(right.sortOrder) || 999));
        if (recordId) {
            return rows.find(record => record.id === recordId) || null;
        }

        return rows[0] || null;
    }

    if (section === "productPriceChangeReviews") {
        const rows = getSectionRows(snapshot, section);
        if (recordId === NO_SELECTION) {
            return null;
        }

        if (recordId) {
            return rows.find(record => record.id === recordId) || null;
        }

        const pendingRows = getPendingProductPriceReviews(rows);
        if (pendingRows.length === 1) {
            return pendingRows[0];
        }

        return null;
    }

    if (!recordId) return null;

    if (section === "categories") {
        return (snapshot.masterData.categories || []).find(record => record.id === recordId) || null;
    }

    if (section === "seasons") {
        return (snapshot.masterData.seasons || []).find(record => record.id === recordId) || null;
    }

    if (section === "reorderPolicies") {
        const resolvedDefault = resolveSystemDefaultPolicy(snapshot.masterData.reorderPolicies || [], { activeOnly: false });
        const record = (snapshot.masterData.reorderPolicies || []).find(item => item.id === recordId) || null;
        return record ? {
            ...record,
            isSystemDefault: Boolean(record.isSystemDefault) || record.id === resolvedDefault?.id
        } : null;
    }

    return (snapshot.masterData.paymentModes || []).find(record => record.id === recordId) || null;
}

function getSectionRows(snapshot, section = featureState.activeSection) {
    if (section === "categories") {
        return (snapshot.masterData.categories || []).slice().sort((left, right) => (left.categoryName || "").localeCompare(right.categoryName || ""));
    }

    if (section === "seasons") {
        return (snapshot.masterData.seasons || []).slice().sort((left, right) => {
            const leftDate = left.startDate?.toDate ? left.startDate.toDate() : new Date(left.startDate || 0);
            const rightDate = right.startDate?.toDate ? right.startDate.toDate() : new Date(right.startDate || 0);
            return rightDate - leftDate;
        });
    }

    if (section === "reorderPolicies") {
        const resolvedDefault = resolveSystemDefaultPolicy(snapshot.masterData.reorderPolicies || [], { activeOnly: false });
        return (snapshot.masterData.reorderPolicies || [])
            .map(policy => ({
                ...policy,
                isSystemDefault: Boolean(policy.isSystemDefault) || policy.id === resolvedDefault?.id
            }))
            .sort((left, right) => {
            if (Boolean(left.isSystemDefault) !== Boolean(right.isSystemDefault)) {
                return left.isSystemDefault ? -1 : 1;
            }

            if (Boolean(left.isActive) !== Boolean(right.isActive)) {
                return left.isActive ? -1 : 1;
            }

            return (left.policyName || "").localeCompare(right.policyName || "");
            });
    }

    if (section === "pricingPolicies") {
        const resolvedDefault = resolveSystemDefaultPricingPolicy(snapshot.masterData.pricingPolicies || [], { activeOnly: false });
        return (snapshot.masterData.pricingPolicies || [])
            .map(policy => ({
                ...policy,
                isSystemDefault: Boolean(policy.isSystemDefault) || policy.id === resolvedDefault?.id
            }))
            .sort((left, right) => {
                if (Boolean(left.isSystemDefault) !== Boolean(right.isSystemDefault)) {
                    return left.isSystemDefault ? -1 : 1;
                }

                return (left.policyName || "").localeCompare(right.policyName || "");
            });
    }

    if (section === "storeConfigs") {
        return (snapshot.masterData.storeConfigs || [])
            .slice()
            .sort((left, right) => (Number(left.sortOrder) || 999) - (Number(right.sortOrder) || 999)
                || (left.storeName || "").localeCompare(right.storeName || ""));
    }

    if (section === "productPriceChangeReviews") {
        return (snapshot.masterData.productPriceChangeReviews || [])
            .slice()
            .sort((left, right) => {
                const leftPending = normalizeText(left.status || "pending") === "pending";
                const rightPending = normalizeText(right.status || "pending") === "pending";
                if (leftPending !== rightPending) {
                    return leftPending ? -1 : 1;
                }

                const leftDate = left.updatedOn?.toDate ? left.updatedOn.toDate() : new Date(left.updatedOn || left.createdOn || 0);
                const rightDate = right.updatedOn?.toDate ? right.updatedOn.toDate() : new Date(right.updatedOn || right.createdOn || 0);
                return rightDate - leftDate;
            });
    }

    return (snapshot.masterData.paymentModes || []).slice().sort((left, right) => (left.paymentMode || "").localeCompare(right.paymentMode || ""));
}

function buildPolicyContext(snapshot) {
    return {
        categoryNameById: new Map((snapshot.masterData.categories || []).map(row => [row.id, row.categoryName || ""])),
        productNameById: new Map((snapshot.masterData.products || []).map(row => [row.id, row.itemName || ""]))
    };
}

function getReorderPolicyAssignableProducts(snapshot, currentProductId = "") {
    return (snapshot.masterData.products || []).filter(row => row.id === currentProductId || row.isActive !== false);
}

function findProductById(snapshot, productId = "") {
    return (snapshot.masterData.products || []).find(row => row.id === productId) || null;
}

function inferReorderPolicyCategoryId(snapshot, productId = "") {
    return findProductById(snapshot, productId)?.categoryId || "";
}

function renderCategorySelectOptions(snapshot, {
    currentValue = "",
    currentProductId = ""
} = {}) {
    const categoryIdsWithProducts = new Set(
        getReorderPolicyAssignableProducts(snapshot, currentProductId)
            .map(row => row.categoryId || "")
            .filter(Boolean)
    );
    const rows = (snapshot.masterData.categories || []).filter(row =>
        categoryIdsWithProducts.has(row.id)
        || row.id === currentValue
    );
    return rows
        .slice()
        .sort((left, right) => (left.categoryName || "").localeCompare(right.categoryName || ""))
        .map(row => `<option value="${row.id}" ${row.id === currentValue ? "selected" : ""}>${row.categoryName}</option>`)
        .join("");
}

function renderProductSelectOptions(snapshot, {
    currentValue = "",
    categoryId = ""
} = {}) {
    const rows = getReorderPolicyAssignableProducts(snapshot, currentValue).filter(row =>
        row.id === currentValue
        || (categoryId && row.categoryId === categoryId)
    );
    return rows
        .slice()
        .sort((left, right) => (left.itemName || "").localeCompare(right.itemName || ""))
        .map(row => `<option value="${row.id}" ${row.id === currentValue ? "selected" : ""}>${row.itemName}</option>`)
        .join("");
}

function getReorderPolicyDraft(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "reorderPolicies");
    const systemDefaultPolicy = resolveSystemDefaultPolicy(snapshot.masterData.reorderPolicies || [], { activeOnly: false });
    const derivedCategoryId = editingRecord?.scopeType === "product"
        ? (editingRecord?.categoryId || inferReorderPolicyCategoryId(snapshot, editingRecord?.productId || ""))
        : (editingRecord?.categoryId || "");
    const defaultScopeType = editingRecord?.scopeType
        || (systemDefaultPolicy ? "category" : DEFAULT_REORDER_POLICY.scopeType);

    return {
        policyName: editingRecord?.policyName || "",
        scopeType: defaultScopeType,
        categoryId: derivedCategoryId,
        productId: editingRecord?.productId || "",
        shortWindowDays: editingRecord?.shortWindowDays ?? DEFAULT_REORDER_POLICY.shortWindowDays,
        shortWindowWeight: editingRecord?.shortWindowWeight ?? DEFAULT_REORDER_POLICY.shortWindowWeight,
        longWindowDays: editingRecord?.longWindowDays ?? DEFAULT_REORDER_POLICY.longWindowDays,
        longWindowWeight: editingRecord?.longWindowWeight ?? DEFAULT_REORDER_POLICY.longWindowWeight,
        leadTimeDays: editingRecord?.leadTimeDays ?? DEFAULT_REORDER_POLICY.leadTimeDays,
        safetyDays: editingRecord?.safetyDays ?? DEFAULT_REORDER_POLICY.safetyDays,
        targetCoverDays: editingRecord?.targetCoverDays ?? DEFAULT_REORDER_POLICY.targetCoverDays,
        lowHistoryUnitThreshold: editingRecord?.lowHistoryUnitThreshold ?? DEFAULT_REORDER_POLICY.lowHistoryUnitThreshold,
        zeroDemandBehavior: editingRecord?.zeroDemandBehavior || DEFAULT_REORDER_POLICY.zeroDemandBehavior,
        minimumOrderQty: editingRecord?.minimumOrderQty ?? DEFAULT_REORDER_POLICY.minimumOrderQty,
        packSize: editingRecord?.packSize ?? DEFAULT_REORDER_POLICY.packSize,
        isActive: editingRecord?.isActive ?? DEFAULT_REORDER_POLICY.isActive,
        isSystemDefault: Boolean(editingRecord?.isSystemDefault)
    };
}

function buildReorderPolicyFallbackNotice(policyDraft = {}, fallbackChain = []) {
    const scopeType = policyDraft.scopeType || DEFAULT_REORDER_POLICY.scopeType;

    if (scopeType === "global") {
        return policyDraft.isSystemDefault
            ? "This draft is the global default, so narrower active product or category rules can still override it."
            : "This is a global-level rule draft. Moneta will use the active Moneta default rule as the real global fallback.";
    }

    if (scopeType === "category") {
        return fallbackChain.length
            ? "If this category rule cannot be used, Moneta will move down to the active fallback below."
            : "No active global default is available right now, so this category rule does not currently have a fallback.";
    }

    if (fallbackChain.length === 2) {
        return "If this product rule cannot be used, Moneta will move down the active fallback chain below.";
    }

    if (fallbackChain.length === 1) {
        return "Moneta found only one active fallback step for this product rule, so the chain below is shorter than normal.";
    }

    return "No active category or global fallback is available right now for this product rule.";
}

function normalizePreviewText(value) {
    return (value || "").trim();
}

function getReorderPolicyUpdatedTime(policy = {}) {
    const candidates = [policy.updatedOn, policy.updateDate, policy.createdOn];

    for (const candidate of candidates) {
        if (!candidate) continue;
        if (typeof candidate.toDate === "function") {
            return candidate.toDate().getTime();
        }

        const parsed = new Date(candidate);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.getTime();
        }
    }

    return 0;
}

function getReorderPolicyScopeRank(scopeType = "") {
    if (scopeType === "product") return 3;
    if (scopeType === "category") return 2;
    return 1;
}

function pickLatestMatchingReorderPolicy(policies = [], matcher) {
    return (policies || [])
        .filter(policy => policy?.isActive && matcher(policy))
        .slice()
        .sort((left, right) => getReorderPolicyUpdatedTime(right) - getReorderPolicyUpdatedTime(left))[0] || null;
}

function getSortedActiveReorderPolicies(policies = []) {
    return (policies || [])
        .filter(policy => policy?.isActive)
        .slice()
        .sort((left, right) => {
            const scopeDiff = getReorderPolicyScopeRank(normalizePreviewText(right.scopeType))
                - getReorderPolicyScopeRank(normalizePreviewText(left.scopeType));
            if (scopeDiff !== 0) return scopeDiff;

            const defaultDiff = Number(isSystemDefaultReorderPolicy(left)) - Number(isSystemDefaultReorderPolicy(right));
            if (defaultDiff !== 0) return defaultDiff;

            return getReorderPolicyUpdatedTime(right) - getReorderPolicyUpdatedTime(left);
        });
}

function buildPrimaryFlowStepTitle(policy = {}, { isCreateMode = false } = {}) {
    if (isSystemDefaultReorderPolicy(policy)) {
        return "Moneta Default Rule";
    }

    if (policy.scopeType === "product") {
        return isCreateMode ? "Live Product Rule" : "Product Rule";
    }

    if (policy.scopeType === "category") {
        return isCreateMode ? "Live Category Rule" : "Category Rule";
    }

    return isCreateMode ? "Live Global Rule" : "Global Rule";
}

function buildActiveRuleStepTitle(policy = {}) {
    if (isSystemDefaultReorderPolicy(policy)) {
        return "Moneta Default Rule";
    }

    if (normalizePreviewText(policy.scopeType) === "product") {
        return "Active Product Rule";
    }

    if (normalizePreviewText(policy.scopeType) === "category") {
        return "Active Category Rule";
    }

    return "Active Global Rule";
}

function buildActiveRuleStepCaption(policy = {}) {
    if (isSystemDefaultReorderPolicy(policy)) {
        return "Moneta uses this only when no narrower active product or category rule matches first.";
    }

    if (normalizePreviewText(policy.scopeType) === "product") {
        return "Moneta checks this first for the matching product before it falls back to broader rules.";
    }

    if (normalizePreviewText(policy.scopeType) === "category") {
        return "Moneta uses this for products in this category when no product-specific rule overrides it.";
    }

    return "Moneta can use this as a broad active rule when no narrower active rule applies.";
}

function buildReorderPolicyFlowEntries(primaryPolicy = {}, fallbackChain = [], defaultPreviewPolicy = null, options = {}) {
    const entries = [];
    const seenIds = new Set();
    const isCreateMode = Boolean(options.isCreateMode);

    const addEntry = (title, caption, policy) => {
        entries.push({ title, caption, policy });
        if (policy?.id) {
            seenIds.add(policy.id);
        }
    };

    addEntry(
        buildPrimaryFlowStepTitle(primaryPolicy, { isCreateMode }),
        isCreateMode
            ? "This is the active rule Moneta would use right now for the selection in this form."
            : (isSystemDefaultReorderPolicy(primaryPolicy)
                ? "Moneta treats this as the protected global fallback rule."
                : "Moneta checks this rule first for the context you are editing."),
        primaryPolicy
    );

    fallbackChain.forEach(entry => {
        addEntry(
            entry.title,
            "Moneta moves here next only if it cannot use the earlier rule.",
            entry.policy
        );
    });

    if (defaultPreviewPolicy && !isSystemDefaultReorderPolicy(primaryPolicy) && !seenIds.has(defaultPreviewPolicy.id)) {
        addEntry(
            "Moneta Default Rule",
            "This is the final fallback Moneta uses when no narrower active rule takes over.",
            defaultPreviewPolicy
        );
    }

    return entries;
}

function buildActiveReorderPolicyFlowEntries(policies = []) {
    return (policies || []).map(policy => ({
        title: buildActiveRuleStepTitle(policy),
        caption: buildActiveRuleStepCaption(policy),
        policy
    }));
}

function resolveLiveReorderPolicyPreview(snapshot, policyDraft = {}, context = {}) {
    const activePolicies = (snapshot.masterData.reorderPolicies || []).filter(policy => policy?.isActive);
    const systemDefaultPolicy = resolveSystemDefaultPolicy(activePolicies, { activeOnly: true });
    const scopeType = normalizePreviewText(policyDraft.scopeType || DEFAULT_REORDER_POLICY.scopeType);
    const categoryId = normalizePreviewText(policyDraft.categoryId);
    const productId = normalizePreviewText(policyDraft.productId);
    const derivedCategoryId = categoryId || inferReorderPolicyCategoryId(snapshot, productId);

    if (scopeType === "product") {
        if (!productId && !derivedCategoryId) {
            return {
                livePolicy: null,
                fallbackChain: [],
                selectionRequired: true
            };
        }

        const productRule = pickLatestMatchingReorderPolicy(activePolicies, policy =>
            normalizePreviewText(policy.scopeType) === "product"
            && normalizePreviewText(policy.productId) === productId
        );
        const categoryRule = pickLatestMatchingReorderPolicy(activePolicies, policy =>
            normalizePreviewText(policy.scopeType) === "category"
            && normalizePreviewText(policy.categoryId) === normalizePreviewText(derivedCategoryId)
        );
        const livePolicy = productRule || categoryRule || systemDefaultPolicy || policyDraft;
        return {
            livePolicy,
            fallbackChain: livePolicy?.id
                ? resolveReorderPolicyFallbackChain(livePolicy, activePolicies, livePolicy.id)
                : [],
            selectionRequired: false
        };
    }

    if (scopeType === "category") {
        if (!categoryId) {
            return {
                livePolicy: null,
                fallbackChain: [],
                selectionRequired: true
            };
        }

        const categoryRule = pickLatestMatchingReorderPolicy(activePolicies, policy =>
            normalizePreviewText(policy.scopeType) === "category"
            && normalizePreviewText(policy.categoryId) === categoryId
        );
        const livePolicy = categoryRule || systemDefaultPolicy || policyDraft;
        return {
            livePolicy,
            fallbackChain: livePolicy?.id
                ? resolveReorderPolicyFallbackChain(livePolicy, activePolicies, livePolicy.id)
                : [],
            selectionRequired: false
        };
    }

    const livePolicy = systemDefaultPolicy || policyDraft;
    return {
        livePolicy,
        fallbackChain: livePolicy?.id
            ? resolveReorderPolicyFallbackChain(livePolicy, activePolicies, livePolicy.id)
            : [],
        selectionRequired: false
    };
}

function renderReorderPolicyFlowCards(entries = [], context = {}) {
    return entries.map((entry, index) => `
        <article class="report-audit-card">
            <p class="report-audit-label">Step ${index + 1}</p>
            <p class="report-audit-value">${entry.title}</p>
            <p class="panel-copy panel-copy-tight">${buildReorderPolicyScopeSummary(entry.policy, context)}</p>
            <div class="reports-audit-note">${buildReorderPolicyExplanation(entry.policy, context)}</div>
            <div class="reports-audit-note"><strong>Why this step exists:</strong> ${entry.caption}</div>
        </article>
        ${index < (entries.length - 1) ? `
            <div class="reports-audit-note" style="margin:0.1rem 0 0.6rem;text-align:center;font-weight:700;">Next fallback step</div>
        ` : ""}
    `).join("");
}

function renderActiveRuleExamples(policies = [], context = {}) {
    return (policies || []).map(policy => `
        <div class="reports-audit-note">
            <strong>${buildActiveRuleStepTitle(policy)}:</strong> ${buildReorderPolicyScopeSummary(policy, context)}
        </div>
        <div class="reports-audit-note"><strong>Simple English:</strong> ${buildReorderPolicyExplanation(policy, context)}</div>
        <div class="reports-audit-note"><strong>Example:</strong> ${buildReorderPolicyWorkedExample(policy, context)}</div>
    `).join("");
}

function renderReorderPolicyExplanationPreview(snapshot, policyDraft = {}, editingRecord = null) {
    const context = buildPolicyContext(snapshot);
    const systemDefaultPolicy = resolveSystemDefaultPolicy(snapshot.masterData.reorderPolicies || [], { activeOnly: false });
    const isCreateMode = !editingRecord;
    const isFirstGlobalDraft = !editingRecord && policyDraft.scopeType === "global" && !systemDefaultPolicy;
    const effectiveDraft = (isSystemDefaultReorderPolicy(editingRecord) || isFirstGlobalDraft)
        ? { ...policyDraft, isSystemDefault: true, isActive: true }
        : policyDraft;
    const defaultPreviewPolicy = (isSystemDefaultReorderPolicy(editingRecord) || (!editingRecord && isSystemDefaultReorderPolicy(policyDraft)) || isFirstGlobalDraft)
        ? { ...systemDefaultPolicy, ...policyDraft, isSystemDefault: true, isActive: true }
        : systemDefaultPolicy;
    const activePolicies = getSortedActiveReorderPolicies(snapshot.masterData.reorderPolicies || []);
    const livePreview = isCreateMode
        ? {
            livePolicy: activePolicies[0] || null,
            fallbackChain: [],
            selectionRequired: false,
            activePolicies
        }
        : {
            livePolicy: effectiveDraft,
            fallbackChain: resolveReorderPolicyFallbackChain(
                effectiveDraft,
                snapshot.masterData.reorderPolicies || [],
                editingRecord?.id || ""
            ),
            selectionRequired: false,
            activePolicies: []
        };
    const previewLeadPolicy = livePreview.selectionRequired
        ? effectiveDraft
        : (livePreview.livePolicy || effectiveDraft);
    const previewScopeSummary = buildReorderPolicyScopeSummary(previewLeadPolicy, context);
    const previewExplanation = buildReorderPolicyExplanation(previewLeadPolicy, context);
    const workedExample = buildReorderPolicyWorkedExample(previewLeadPolicy, context);
    const precedenceSummary = buildReorderPolicyPrecedenceSummary(previewLeadPolicy, context);
    const activeFlowEntries = isCreateMode && livePreview.activePolicies.length
        ? buildActiveReorderPolicyFlowEntries(livePreview.activePolicies)
        : [];
    const flowEntries = activeFlowEntries.length
        ? activeFlowEntries
        : buildReorderPolicyFlowEntries(
            previewLeadPolicy,
            livePreview.selectionRequired ? [] : livePreview.fallbackChain,
            defaultPreviewPolicy,
            { isCreateMode }
        );
    const defaultExampleText = defaultPreviewPolicy
        ? buildReorderPolicyWorkedExample(defaultPreviewPolicy, context)
        : "";
    const pendingDraftSummary = buildReorderPolicyScopeSummary(effectiveDraft, context);
    const pendingDraftNote = isCreateMode
        ? (livePreview.activePolicies.length
            ? `This form is preparing ${pendingDraftSummary}. Moneta is currently using the active rules below until you save.`
            : (livePreview.selectionRequired
            ? `Choose ${effectiveDraft.scopeType === "product" ? "a product" : "a category"} to preview the matching live rule. Until then, Moneta can only show the rule shape you are preparing.`
            : (previewScopeSummary === pendingDraftSummary
                ? "This form matches the live rule Moneta is already using for this setup."
                : `This form is preparing ${pendingDraftSummary}. Moneta will keep using the live flow below until you save.`)))
        : "";
    const leadingSummaryLabel = isCreateMode
        ? (livePreview.activePolicies.length
            ? "Active rules in Moneta"
            : (livePreview.selectionRequired ? "Draft flow" : "Current live flow"))
        : "Rule you are editing";
    const leadingSummaryValue = isCreateMode && livePreview.activePolicies.length
        ? `${livePreview.activePolicies.length} active ${livePreview.activePolicies.length === 1 ? "rule" : "rules"}`
        : previewScopeSummary;
    const activeRuleExamples = isCreateMode && livePreview.activePolicies.length
        ? renderActiveRuleExamples(livePreview.activePolicies, context)
        : "";

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.reports}</span>
                    <div>
                        <h3>Moneta Reorder Rule Flow</h3>
                        <p class="panel-copy">Review the rule chain in order, then use the example panel to understand how Moneta will apply it.</p>
                    </div>
                </div>
            </div>
            <div class="panel-body">
                <div style="display:grid;gap:1rem;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));align-items:start;">
                    <div>
                        <div class="reports-audit-note">
                            <strong>${leadingSummaryLabel}:</strong> ${leadingSummaryValue}
                        </div>
                        ${pendingDraftNote ? `
                            <div class="reports-audit-note">${pendingDraftNote}</div>
                        ` : ""}
                        ${renderReorderPolicyFlowCards(flowEntries, context)}
                    </div>
                    <article class="report-audit-card">
                        <p class="report-audit-label">Example</p>
                        <p class="report-audit-value">${isCreateMode
                            ? (livePreview.activePolicies.length
                                ? "How Moneta Uses These Active Rules Right Now"
                                : (livePreview.selectionRequired ? "How This Draft Would Work" : "How Moneta Uses This Flow Right Now"))
                            : "How Moneta Uses This Flow"}</p>
                        ${activeRuleExamples ? `
                            <div class="reports-audit-note"><strong>How matching works:</strong> Moneta checks the most specific active rule that matches first. If no product or category override matches, it falls back to the Moneta default rule.</div>
                            ${activeRuleExamples}
                        ` : `
                            <div class="reports-audit-note"><strong>${livePreview.selectionRequired ? "Draft rule in simple English" : "Active rule in simple English"}:</strong> ${previewExplanation}</div>
                            <div class="reports-audit-note"><strong>${livePreview.selectionRequired ? "Example using this draft" : "Example using the active rule"}:</strong> ${workedExample}</div>
                        `}
                        ${!activeRuleExamples && defaultPreviewPolicy && !isSystemDefaultReorderPolicy(previewLeadPolicy) ? `
                            <div class="reports-audit-note"><strong>Moneta default rule:</strong> ${buildReorderPolicyScopeSummary(defaultPreviewPolicy, context)}</div>
                            <div class="reports-audit-note"><strong>Example using the default rule:</strong> ${defaultExampleText}</div>
                        ` : !activeRuleExamples ? `
                            <div class="reports-audit-note"><strong>Moneta default rule:</strong> The active rule shown above is already the Moneta default rule.</div>
                        ` : ""}
                        <div class="reports-audit-note"><strong>How fallback works:</strong> ${activeRuleExamples
                            ? "Moneta uses the most specific active rule that matches the product first, then falls back through broader active rules until it reaches the protected default."
                            : precedenceSummary}</div>
                        <div class="reports-audit-note"><strong>Fallback note:</strong> ${activeRuleExamples
                            ? "The rules on the left are the currently active rules Moneta can apply right now. Saving this form may add or change that active stack."
                            : buildReorderPolicyFallbackNotice(previewLeadPolicy, livePreview.selectionRequired ? [] : livePreview.fallbackChain)}</div>
                    </article>
                </div>
            </div>
        </div>
    `;
}

function renderHeader(snapshot) {
    const config = getActiveSectionConfig();
    const rows = getSectionRows(snapshot);
    const activeCount = featureState.activeSection === "productPriceChangeReviews"
        ? rows.filter(row => normalizeText(row.status || "pending") === "pending").length
        : rows.filter(row => row.isActive).length;

    return `
        <div class="panel-card">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.settings}</span>
                    <div>
                        <h2>${config.label}</h2>
                        <p class="panel-copy">Admin Modules · ${config.description}</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${rows.length} records</span>
                    <span class="status-pill">${activeCount} ${featureState.activeSection === "productPriceChangeReviews" ? "pending" : "active"}</span>
                </div>
            </div>
        </div>
    `;
}

function renderCategoryForm(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "categories");

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.products}</span>
                    <div>
                        <h3>${editingRecord ? "Edit Product Category" : "Add Product Category"}</h3>
                        <p class="panel-copy">Keep product classification clean so catalogue, search, and reporting stay consistent.</p>
                    </div>
                </div>
                <span class="status-pill">${editingRecord ? "Editing" : "Create"}</span>
            </div>
            <div class="panel-body">
                <form id="admin-category-form">
                    <input id="admin-category-doc-id" type="hidden" value="${editingRecord?.id || ""}">
                        <div class="form-grid">
                        <div class="field field-wide">
                            <label for="admin-category-name">Category Name <span class="required-mark" aria-hidden="true">*</span></label>
                            <input id="admin-category-name" class="input" type="text" value="${editingRecord?.categoryName || ""}" placeholder="Breads, Cakes, Seasonal Packs" required>
                        </div>
                    </div>
                    <div class="form-actions">
                        ${editingRecord ? `
                            <button id="admin-category-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${editingRecord ? icons.edit : icons.plus}</span>
                            ${editingRecord ? "Update Category" : "Save Category"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderSeasonForm(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "seasons");

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.catalogue}</span>
                    <div>
                        <h3>${editingRecord ? "Edit Sales Season" : "Add Sales Season"}</h3>
                        <p class="panel-copy">Define the seasonal windows that sales catalogues and campaigns will live inside.</p>
                    </div>
                </div>
                <span class="status-pill">${editingRecord ? "Editing" : "Create"}</span>
            </div>
            <div class="panel-body">
                <form id="admin-season-form">
                    <input id="admin-season-doc-id" type="hidden" value="${editingRecord?.id || ""}">
                        <div class="form-grid">
                        <div class="field field-wide">
                            <label for="admin-season-name">Season Name <span class="required-mark" aria-hidden="true">*</span></label>
                            <input id="admin-season-name" class="input" type="text" value="${editingRecord?.seasonName || ""}" placeholder="Easter 2026, Christmas 2026" required>
                        </div>
                        <div class="field">
                            <label for="admin-season-start-date">Start Date <span class="required-mark" aria-hidden="true">*</span></label>
                            <input id="admin-season-start-date" class="input" type="date" value="${toDateInputValue(editingRecord?.startDate)}" required>
                        </div>
                        <div class="field">
                            <label for="admin-season-end-date">End Date <span class="required-mark" aria-hidden="true">*</span></label>
                            <input id="admin-season-end-date" class="input" type="date" value="${toDateInputValue(editingRecord?.endDate)}" required>
                        </div>
                        <div class="field">
                            <label for="admin-season-status">Workflow Status</label>
                            <select id="admin-season-status" class="select">
                                ${SEASON_STATUS_OPTIONS.map(option => `
                                    <option value="${option}" ${option === (editingRecord?.status || "Upcoming") ? "selected" : ""}>${option}</option>
                                `).join("")}
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        ${editingRecord ? `
                            <button id="admin-season-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${editingRecord ? icons.edit : icons.plus}</span>
                            ${editingRecord ? "Update Season" : "Save Season"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderPaymentModeForm(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "paymentModes");

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.payment}</span>
                    <div>
                        <h3>${editingRecord ? "Edit Payment Mode" : "Add Payment Mode"}</h3>
                        <p class="panel-copy">Maintain the payment methods used across purchasing and the future sales layer.</p>
                    </div>
                </div>
                <span class="status-pill">${editingRecord ? "Editing" : "Create"}</span>
            </div>
            <div class="panel-body">
                <form id="admin-payment-mode-form">
                    <input id="admin-payment-mode-doc-id" type="hidden" value="${editingRecord?.id || ""}">
                        <div class="form-grid">
                        <div class="field field-wide">
                            <label for="admin-payment-mode-name">Payment Mode <span class="required-mark" aria-hidden="true">*</span></label>
                            <input id="admin-payment-mode-name" class="input" type="text" value="${editingRecord?.paymentMode || ""}" placeholder="Cash, UPI, Bank Transfer" required>
                        </div>
                    </div>
                    <div class="form-actions">
                        ${editingRecord ? `
                            <button id="admin-payment-mode-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${editingRecord ? icons.edit : icons.plus}</span>
                            ${editingRecord ? "Update Payment Mode" : "Save Payment Mode"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderPricingPolicyForm(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "pricingPolicies");

    if (!editingRecord) {
        return `
            <div class="panel-card">
                <div class="panel-header">
                    <div class="panel-title-wrap">
                        <span class="panel-icon">${icons.reports}</span>
                        <div>
                            <h3>Pricing Policy</h3>
                            <p class="panel-copy">Moneta is waiting for the pricing policy seed to appear in Firestore.</p>
                        </div>
                    </div>
                    <span class="status-pill">Waiting</span>
                </div>
            </div>
        `;
    }

    const explanation = buildPricingPolicyExplanation(editingRecord);

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.reports}</span>
                    <div>
                        <h3>Edit Pricing Policy</h3>
                        <p class="panel-copy">Set how Moneta derives standard cost from purchases and how it suggests or updates selling prices.</p>
                    </div>
                </div>
                <span class="status-pill">${editingRecord.isSystemDefault ? "System Default" : "Policy"}</span>
            </div>
            <div class="panel-body">
                <form id="admin-pricing-policy-form">
                    <input id="admin-pricing-policy-doc-id" type="hidden" value="${editingRecord.id || editingRecord.docId || ""}">
                    <div class="form-grid">
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-pricing-policy-name",
                                label: "Policy Name",
                                required: true,
                                tooltip: "This is the label admins will see when reviewing the pricing rule Moneta uses for cost and price calculations."
                            })}
                            <input id="admin-pricing-policy-name" class="input" type="text" value="${escapeHtml(editingRecord.policyName || "")}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-pricing-policy-costing-method",
                                label: "Costing Method",
                                required: true,
                                tooltip: "This tells Moneta how to set a product's standard cost from purchase history."
                            })}
                            <select id="admin-pricing-policy-costing-method" class="select" required>
                                ${COSTING_METHODS.map(option => `
                                    <option value="${option}" ${option === editingRecord.costingMethod ? "selected" : ""}>${option}</option>
                                `).join("")}
                            </select>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-pricing-policy-selling-behavior",
                                label: "Selling Price Behavior",
                                required: true,
                                tooltip: "This decides whether Moneta only suggests a selling price from margin or automatically updates the live selling price."
                            })}
                            <select id="admin-pricing-policy-selling-behavior" class="select" required>
                                ${SELLING_PRICE_BEHAVIORS.map(option => `
                                    <option value="${option}" ${option === editingRecord.sellingPriceBehavior ? "selected" : ""}>${option}</option>
                                `).join("")}
                            </select>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-pricing-policy-default-margin",
                                label: "Default Target Margin %",
                                required: true,
                                tooltip: "This is the margin Moneta uses when it needs to suggest or auto-calculate selling price from standard cost."
                            })}
                            <input id="admin-pricing-policy-default-margin" class="input" type="number" min="0" step="0.01" value="${escapeHtml(editingRecord.defaultTargetMarginPercentage ?? 0)}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-pricing-policy-cost-threshold",
                                label: "Cost Change Review Threshold %",
                                required: true,
                                tooltip: "If standard cost moves by at least this percentage, Moneta marks the product for price review."
                            })}
                            <input id="admin-pricing-policy-cost-threshold" class="input" type="number" min="0" step="0.01" value="${escapeHtml(editingRecord.costChangeAlertThresholdPercentage ?? 0)}" required>
                        </div>
                    </div>
                    <div class="panel-card panel-card-soft" style="margin-top:1rem;">
                        <div class="panel-header">
                            <div class="panel-title-wrap">
                                <span class="panel-icon">${icons.assistant}</span>
                                <div>
                                    <h3>Plain-English Rule Preview</h3>
                                    <p class="panel-copy">${escapeHtml(explanation)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button id="admin-pricing-policy-cancel-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            Reset View
                        </button>
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${icons.edit}</span>
                            Update Pricing Policy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderStoreConfigForm(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "storeConfigs");

    if (!editingRecord) {
        return `
            <div class="panel-card">
                <div class="panel-header">
                    <div class="panel-title-wrap">
                        <span class="panel-icon">${icons.retail}</span>
                        <div>
                            <h3>Store Configuration</h3>
                            <p class="panel-copy">Moneta is waiting for the store configuration seed to appear in Firestore.</p>
                        </div>
                    </div>
                    <span class="status-pill">Waiting</span>
                </div>
            </div>
        `;
    }

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.retail}</span>
                    <div>
                        <h3>Edit Store Configuration</h3>
                        <p class="panel-copy">Update the business profile Moneta uses for invoices, tax defaults, bank details, and retail store rules.</p>
                    </div>
                </div>
                <span class="status-pill">${editingRecord.storeName}</span>
            </div>
            <div class="panel-body">
                <form id="admin-store-config-form">
                    <input id="admin-store-config-doc-id" type="hidden" value="${editingRecord.id || editingRecord.docId || ""}">
                    <div class="form-grid">
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-store-name",
                                label: "Store Name",
                                tooltip: "This is the stable Moneta store key already used by sales, reports, and history. It stays read-only so existing records do not break."
                            })}
                            <input id="admin-store-config-store-name" class="input" type="text" value="${escapeHtml(editingRecord.storeName || "")}" readonly>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-store-code",
                                label: "Store Code",
                                tooltip: "This is the stable internal store code Moneta uses behind the scenes. It is not meant for day-to-day editing."
                            })}
                            <input id="admin-store-config-store-code" class="input" type="text" value="${escapeHtml(editingRecord.storeCode || "")}" readonly>
                        </div>
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-store-config-company-name",
                                label: "Company Name",
                                required: true,
                                tooltip: "This is the legal or branded business name Moneta prints on invoices, receipts, and store-facing documents."
                            })}
                            <input id="admin-store-config-company-name" class="input" type="text" value="${escapeHtml(editingRecord.companyName || "")}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-sale-prefix",
                                label: "Sale Prefix",
                                required: true,
                                tooltip: "Moneta uses this prefix when it generates store sale IDs, for example CS or TT."
                            })}
                            <input id="admin-store-config-sale-prefix" class="input" type="text" value="${escapeHtml(editingRecord.salePrefix || "")}" maxlength="6" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-requires-address",
                                label: "Customer Address Rule",
                                required: true,
                                tooltip: "Choose whether Moneta must force a customer address before saving a sale for this store."
                            })}
                            <select id="admin-store-config-requires-address" class="select" required>
                                <option value="false" ${editingRecord.requiresCustomerAddress ? "" : "selected"}>Address Optional</option>
                                <option value="true" ${editingRecord.requiresCustomerAddress ? "selected" : ""}>Address Required</option>
                            </select>
                        </div>
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-store-config-address-line-1",
                                label: "Address Line 1",
                                required: true,
                                tooltip: "This is the primary street or location line Moneta shows on the printed store address."
                            })}
                            <input id="admin-store-config-address-line-1" class="input" type="text" value="${escapeHtml(editingRecord.addressLine1 || "")}" required>
                        </div>
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-store-config-address-line-2",
                                label: "Address Line 2",
                                tooltip: "Use this for area, landmark, or second-line location details on the store profile."
                            })}
                            <input id="admin-store-config-address-line-2" class="input" type="text" value="${escapeHtml(editingRecord.addressLine2 || "")}">
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-city",
                                label: "City",
                                required: true,
                                tooltip: "Moneta prints this city as part of the store address and invoice location block."
                            })}
                            <input id="admin-store-config-city" class="input" type="text" value="${escapeHtml(editingRecord.city || "")}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-state",
                                label: "State",
                                required: true,
                                tooltip: "This is the state name Moneta shows on the store profile and tax-facing invoice header."
                            })}
                            <input id="admin-store-config-state" class="input" type="text" value="${escapeHtml(editingRecord.state || "")}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-pincode",
                                label: "Pincode",
                                required: true,
                                tooltip: "Moneta includes the pincode as part of the invoice address and delivery reference details."
                            })}
                            <input id="admin-store-config-pincode" class="input" type="text" value="${escapeHtml(editingRecord.pincode || "")}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-state-code",
                                label: "State Code",
                                required: true,
                                tooltip: "This is the numeric GST or state code Moneta shows with the invoice tax identity."
                            })}
                            <input id="admin-store-config-state-code" class="input" type="text" value="${escapeHtml(editingRecord.stateCode || "")}" required>
                        </div>
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-store-config-tax-id",
                                label: "Tax / GST Text",
                                required: true,
                                tooltip: "This is the exact GST or tax identity line Moneta prints on invoices for the store."
                            })}
                            <input id="admin-store-config-tax-id" class="input" type="text" value="${escapeHtml(editingRecord.taxId || "")}" required>
                        </div>
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-store-config-email",
                                label: "Email",
                                required: true,
                                tooltip: "This is the public contact email Moneta shows on store-facing invoices and documents."
                            })}
                            <input id="admin-store-config-email" class="input" type="email" value="${escapeHtml(editingRecord.email || "")}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-cgst-rate",
                                label: "CGST Rate %",
                                required: true,
                                tooltip: "Moneta uses this as the default CGST percentage when a retail or quote line inherits tax from the selected store."
                            })}
                            <input id="admin-store-config-cgst-rate" class="input" type="number" min="0" step="0.01" value="${escapeHtml(editingRecord.taxInfo?.cgstRate ?? 0)}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-sgst-rate",
                                label: "SGST Rate %",
                                required: true,
                                tooltip: "Moneta uses this as the default SGST percentage when a retail or quote line inherits tax from the selected store."
                            })}
                            <input id="admin-store-config-sgst-rate" class="input" type="number" min="0" step="0.01" value="${escapeHtml(editingRecord.taxInfo?.sgstRate ?? 0)}" required>
                        </div>
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-store-config-bank-name",
                                label: "Bank Name",
                                required: true,
                                tooltip: "This bank name appears in the payment block Moneta prints for invoice settlement instructions."
                            })}
                            <input id="admin-store-config-bank-name" class="input" type="text" value="${escapeHtml(editingRecord.paymentDetails?.bankName || "")}" required>
                        </div>
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-store-config-branch",
                                label: "Branch",
                                required: true,
                                tooltip: "This branch detail appears together with bank details when Moneta shows payment instructions."
                            })}
                            <input id="admin-store-config-branch" class="input" type="text" value="${escapeHtml(editingRecord.paymentDetails?.branch || "")}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-account-number",
                                label: "Account Number",
                                required: true,
                                tooltip: "This account number is printed in the payment section of the store invoice profile."
                            })}
                            <input id="admin-store-config-account-number" class="input" type="text" value="${escapeHtml(editingRecord.paymentDetails?.accountNumber || "")}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-store-config-ifsc-code",
                                label: "IFSC Code",
                                required: true,
                                tooltip: "Moneta includes this IFSC code next to the bank details for transfers and payment instructions."
                            })}
                            <input id="admin-store-config-ifsc-code" class="input" type="text" value="${escapeHtml(editingRecord.paymentDetails?.ifscCode || "")}" required>
                        </div>
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-store-config-account-holder-name",
                                label: "Account Holder Name",
                                required: true,
                                tooltip: "This is the bank account holder Moneta prints for the store payment instructions."
                            })}
                            <input id="admin-store-config-account-holder-name" class="input" type="text" value="${escapeHtml(editingRecord.paymentDetails?.accountHolderName || "")}" required>
                        </div>
                        <div class="field field-wide">
                            ${renderFieldLabel({
                                forId: "admin-store-config-upi-qr-url",
                                label: "UPI QR Code URL",
                                required: true,
                                tooltip: "This is the image URL Moneta uses when it prints the store UPI QR code on invoices or payment views."
                            })}
                            <input id="admin-store-config-upi-qr-url" class="input" type="url" value="${escapeHtml(editingRecord.paymentDetails?.upiQRCodeUrl || "")}" required>
                        </div>
                        <div class="field field-full">
                            ${renderFieldLabel({
                                forId: "admin-store-config-terms",
                                label: "Invoice Terms",
                                required: true,
                                tooltip: "This is the closing terms or payment note Moneta prints near the footer of store invoices."
                            })}
                            <textarea id="admin-store-config-terms" class="textarea" required>${escapeHtml(editingRecord.terms || "")}</textarea>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button id="admin-store-config-cancel-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            Reset View
                        </button>
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${icons.edit}</span>
                            Update Store Config
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderReorderPolicyForm(snapshot) {
    const editingRecord = getEditingRecord(snapshot, "reorderPolicies");
    const draft = getReorderPolicyDraft(snapshot);
    const systemDefaultPolicy = resolveSystemDefaultPolicy(snapshot.masterData.reorderPolicies || [], { activeOnly: false });
    const isSystemDefaultDraft = Boolean(draft.isSystemDefault) || (!editingRecord && draft.scopeType === "global" && !systemDefaultPolicy);
    const allowGlobalScopeOption = isSystemDefaultDraft || !systemDefaultPolicy;
    const isCategoryScope = draft.scopeType === "category";
    const isProductScope = draft.scopeType === "product";
    const showCategoryField = isCategoryScope || isProductScope;
    const isProductDisabled = isProductScope && !draft.categoryId;

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.reports}</span>
                    <div>
                        <h3>${editingRecord ? "Edit Reorder Policy" : "Add Reorder Policy"}</h3>
                        <p class="panel-copy">Set the stock-cover rule Moneta should use, and review the plain-English explanation before saving it.</p>
                    </div>
                </div>
                <span class="status-pill">${editingRecord ? "Editing" : "Create"}</span>
            </div>
            <div class="panel-body">
                <form id="admin-reorder-policy-form">
                    <input id="admin-reorder-policy-doc-id" type="hidden" value="${editingRecord?.id || ""}">
                    <div class="reorder-policy-form-grid reorder-policy-setup-grid">
                        <div class="field reorder-policy-span-8">
                            ${renderFieldLabel({
                                forId: "admin-reorder-policy-name",
                                label: "Policy Name",
                                required: true,
                                tooltip: "This is the business name users will see for the rule. Use a clear name that explains where Moneta should apply it."
                            })}
                            <input id="admin-reorder-policy-name" class="input" type="text" value="${draft.policyName}" placeholder="Global Default Policy, Bakery Category Policy" required>
                        </div>
                        <div class="field reorder-policy-span-2">
                            ${renderFieldLabel({
                                forId: "admin-reorder-policy-scope-type",
                                label: "Scope",
                                required: true,
                                tooltip: "Scope decides how broad the rule is. Product rules win first, then category rules, then the Moneta default rule."
                            })}
                            <select id="admin-reorder-policy-scope-type" class="select" required ${isSystemDefaultDraft ? "disabled data-disabled-reason=\"The Moneta default rule must stay as a global policy.\"" : ""}>
                                ${allowGlobalScopeOption ? `
                                    <option value="global" ${draft.scopeType === "global" ? "selected" : ""}>Global Default</option>
                                ` : ""}
                                <option value="category" ${draft.scopeType === "category" ? "selected" : ""}>Category Override</option>
                                <option value="product" ${draft.scopeType === "product" ? "selected" : ""}>Product Override</option>
                            </select>
                            <p class="panel-copy panel-copy-tight">${isSystemDefaultDraft
                                ? "This is the Moneta default rule. It can be updated, but it must remain a global rule."
                                : (!systemDefaultPolicy && draft.scopeType === "global"
                                    ? "This will become the first protected Moneta default rule."
                                    : (allowGlobalScopeOption
                                        ? "Choose whether this rule is the global fallback, a category override, or a product override."
                                        : "Moneta already has a protected default rule. New rules should be category or product overrides."))}</p>
                        </div>
                        <div class="field reorder-policy-span-2">
                            ${renderFieldLabel({
                                forId: "admin-reorder-policy-status",
                                label: "Status",
                                required: true,
                                tooltip: "Only active rules can drive reorder recommendations. Inactive rules stay in history but Moneta ignores them."
                            })}
                            <select id="admin-reorder-policy-status" class="select" required ${isSystemDefaultDraft ? "disabled data-disabled-reason=\"The Moneta default rule can be updated, but it cannot be deactivated.\"" : ""}>
                                <option value="true" ${draft.isActive ? "selected" : ""}>Active</option>
                                <option value="false" ${!draft.isActive ? "selected" : ""}>Inactive</option>
                            </select>
                            <p class="panel-copy panel-copy-tight">${isSystemDefaultDraft
                                ? "The Moneta default rule must stay active."
                                : "Inactive rules stay visible in Admin Modules but Moneta will not apply them in reports."}</p>
                        </div>
                        <div class="field reorder-policy-span-6" id="admin-reorder-policy-category-field" ${showCategoryField ? "" : "hidden"}>
                            ${renderFieldLabel({
                                forId: "admin-reorder-policy-category-id",
                                label: "Category",
                                required: showCategoryField,
                                tooltip: "Category tells Moneta which product group this override should control. Category rules affect every product in that category unless a product-specific rule overrides them."
                            })}
                            <select id="admin-reorder-policy-category-id" class="select" ${showCategoryField ? "required" : ""}>
                                <option value="">Select category</option>
                                ${renderCategorySelectOptions(snapshot, {
                                    currentValue: draft.categoryId,
                                    currentProductId: draft.productId
                                })}
                            </select>
                            <p id="admin-reorder-policy-category-help" class="panel-copy panel-copy-tight">${isProductScope
                                ? "Choose a category first so Moneta can narrow the product list to matching items."
                                : "Only categories that already have products assigned are listed here."}</p>
                        </div>
                        <div class="field reorder-policy-span-6" id="admin-reorder-policy-product-field" ${isProductScope ? "" : "hidden"}>
                            ${renderFieldLabel({
                                forId: "admin-reorder-policy-product-id",
                                label: "Product",
                                required: isProductScope,
                                tooltip: "Product narrows the rule to one specific item. A product rule is the most specific rule Moneta can apply."
                            })}
                            <select id="admin-reorder-policy-product-id" class="select" ${isProductScope ? "required" : ""} ${isProductDisabled ? "disabled" : ""}>
                                <option value="">${isProductDisabled ? "Select category first" : "Select product"}</option>
                                ${renderProductSelectOptions(snapshot, {
                                    currentValue: draft.productId,
                                    categoryId: draft.categoryId
                                })}
                            </select>
                            <p id="admin-reorder-policy-product-help" class="panel-copy panel-copy-tight">Moneta will only show products from the selected category.</p>
                        </div>
                    </div>
                    <div class="reorder-policy-form-section">
                        <div class="reorder-policy-form-section-head">
                            <p class="section-kicker">Demand Settings</p>
                            <p class="panel-copy">Tune how Moneta blends recent demand when it decides whether stock should be reordered.</p>
                        </div>
                        <div class="reorder-policy-form-grid reorder-policy-metric-grid">
                            <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-short-window-days",
                                label: "Short Demand Window (days)",
                                required: true,
                                tooltip: "This is the recent sales window Moneta looks at first. A shorter window makes the rule react faster to recent demand changes."
                            })}
                            <input id="admin-reorder-short-window-days" class="input" type="number" min="1" step="1" value="${draft.shortWindowDays}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-short-window-weight",
                                label: "Short Window Weight %",
                                required: true,
                                tooltip: "This percentage controls how much influence the short demand window has in the final demand estimate. Higher values make Moneta more reactive."
                            })}
                            <input id="admin-reorder-short-window-weight" class="input" type="number" min="0" max="100" step="1" value="${draft.shortWindowWeight}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-long-window-days",
                                label: "Long Demand Window (days)",
                                required: true,
                                tooltip: "This is the stabilizing sales window Moneta uses to smooth out short-term spikes. A longer window makes the rule less volatile."
                            })}
                            <input id="admin-reorder-long-window-days" class="input" type="number" min="1" step="1" value="${draft.longWindowDays}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-long-window-weight",
                                label: "Long Window Weight %",
                                required: true,
                                tooltip: "This percentage controls how much the longer history affects the demand estimate. The short and long weights together must add up to 100%."
                            })}
                            <input id="admin-reorder-long-window-weight" class="input" type="number" min="0" max="100" step="1" value="${draft.longWindowWeight}" required>
                        </div>
                        </div>
                    </div>
                    <div class="reorder-policy-form-section">
                        <div class="reorder-policy-form-section-head">
                            <p class="section-kicker">Stock Cover Settings</p>
                            <p class="panel-copy">Set the lead-time, safety, and order-size rules Moneta should use after it decides to reorder.</p>
                        </div>
                        <div class="reorder-policy-form-grid reorder-policy-metric-grid">
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-lead-time-days",
                                label: "Lead Time (days)",
                                required: true,
                                tooltip: "Lead time is how many days Moneta assumes it takes to replenish stock after you decide to reorder."
                            })}
                            <input id="admin-reorder-lead-time-days" class="input" type="number" min="0" step="1" value="${draft.leadTimeDays}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-safety-days",
                                label: "Safety Stock (days)",
                                required: true,
                                tooltip: "Safety stock adds extra cover above expected demand. Higher safety days make Moneta reorder earlier to reduce stockout risk."
                            })}
                            <input id="admin-reorder-safety-days" class="input" type="number" min="0" step="1" value="${draft.safetyDays}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-target-cover-days",
                                label: "Target Cover (days)",
                                required: true,
                                tooltip: "Target cover is how many days of stock Moneta tries to restore after a reorder is triggered. It must be at least lead time plus safety stock."
                            })}
                            <input id="admin-reorder-target-cover-days" class="input" type="number" min="1" step="1" value="${draft.targetCoverDays}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-low-history-threshold",
                                label: "Low-History Threshold (units)",
                                required: true,
                                tooltip: "If sales in the long window are at or below this level, Moneta treats the item as low-history and becomes more cautious instead of auto-reordering."
                            })}
                            <input id="admin-reorder-low-history-threshold" class="input" type="number" min="0" step="1" value="${draft.lowHistoryUnitThreshold}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-zero-demand-behavior",
                                label: "Zero-Demand Behavior",
                                required: true,
                                tooltip: "This tells Moneta what to do when there were no recent sales at all. It can either suppress the recommendation or send the item for manual review."
                            })}
                            <select id="admin-reorder-zero-demand-behavior" class="select" required>
                                <option value="manual-review" ${draft.zeroDemandBehavior === "manual-review" ? "selected" : ""}>Manual Review</option>
                                <option value="suppress" ${draft.zeroDemandBehavior === "suppress" ? "selected" : ""}>Suppress Recommendation</option>
                            </select>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-min-order-qty",
                                label: "Minimum Order Qty",
                                required: true,
                                tooltip: "This is the smallest reorder quantity Moneta is allowed to suggest, even if the stock-cover math produces a smaller number."
                            })}
                            <input id="admin-reorder-min-order-qty" class="input" type="number" min="0" step="1" value="${draft.minimumOrderQty}" required>
                        </div>
                        <div class="field">
                            ${renderFieldLabel({
                                forId: "admin-reorder-pack-size",
                                label: "Pack Size",
                                required: true,
                                tooltip: "Pack size tells Moneta how to round suggested order quantities so they match how the item is bought or stocked."
                            })}
                            <input id="admin-reorder-pack-size" class="input" type="number" min="1" step="1" value="${draft.packSize}" required>
                        </div>
                        </div>
                    </div>
                    <div id="admin-reorder-policy-explanation" style="margin-top:1rem;">
                        ${renderReorderPolicyExplanationPreview(snapshot, draft, editingRecord)}
                    </div>
                    <div class="form-actions">
                        ${editingRecord ? `
                            <button id="admin-reorder-policy-cancel-button" class="button button-secondary" type="button">
                                <span class="button-icon">${icons.inactive}</span>
                                Cancel
                            </button>
                        ` : ""}
                        <button class="button button-primary-alt" type="submit">
                            <span class="button-icon">${editingRecord ? icons.edit : icons.plus}</span>
                            ${editingRecord ? "Update Policy" : "Save Policy"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function renderProductPriceChangeReviewForm(snapshot) {
    const review = getEditingRecord(snapshot, "productPriceChangeReviews");
    const rows = getSectionRows(snapshot, "productPriceChangeReviews");
    const pendingRows = getPendingProductPriceReviews(rows);

    if (!review) {
        return `
            <div class="panel-card">
                <div class="panel-header">
                    <div class="panel-title-wrap">
                        <span class="panel-icon">${icons.warning}</span>
                        <div>
                            <h3>Product Price Change Review</h3>
                            <p class="panel-copy">${rows.length
                                ? (pendingRows.length === 1
                                    ? "Moneta found one pending review and can open it automatically."
                                    : "Select a review from the queue below to inspect the cost change, recommendation, and catalogue impact.")
                                : "Pending product pricing decisions appear here when cost movement needs approval."}</p>
                        </div>
                    </div>
                    <span class="status-pill">${rows.length ? `${pendingRows.length} pending` : "Waiting"}</span>
                </div>
                <div class="panel-body">
                    <div class="empty-state">
                        ${rows.length
                            ? "Choose a review from the queue to continue."
                            : "No product price reviews are waiting right now."}
                    </div>
                </div>
            </div>
        `;
    }

    const statusCopy = normalizeText(review.status || "pending");
    const isPending = statusCopy === "pending";

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon">${icons.warning}</span>
                    <div>
                        <h3>${isPending ? "Review Product Price Change" : "Price Review Record"}</h3>
                        <p class="panel-copy">Approve or reject the suggested selling-price change and decide whether linked catalogue items should sync.</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${escapeHtml(review.reviewCode || "Price Review")}</span>
                    <span class="status-pill">${escapeHtml(statusCopy || "pending")}</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="price-review-sections">
                    <section class="workspace-form-section price-review-section">
                        <div class="workspace-form-section-head">
                            <p class="workspace-form-section-kicker">Product</p>
                            <h3>${escapeHtml(review.productName || "Product")}</h3>
                            <p class="panel-copy">Item ID: ${escapeHtml(review.itemId || "-")}</p>
                        </div>
                        <div class="price-review-metrics-grid">
                            <div class="price-review-metric">
                                <p class="section-kicker">Current Live Price</p>
                                <p><strong>${formatCurrency(review.currentSellingPrice)}</strong></p>
                            </div>
                            <div class="price-review-metric">
                                <p class="section-kicker">Recommended Price</p>
                                <p><strong>${formatCurrency(review.recommendedSellingPrice)}</strong></p>
                            </div>
                            <div class="price-review-metric">
                                <p class="section-kicker">Previous Standard Cost</p>
                                <p><strong>${formatCurrency(review.previousStandardCost)}</strong></p>
                            </div>
                            <div class="price-review-metric">
                                <p class="section-kicker">New Standard Cost</p>
                                <p><strong>${formatCurrency(review.nextStandardCost)}</strong></p>
                            </div>
                        </div>
                    </section>
                    <section class="workspace-form-section price-review-section">
                        <div class="workspace-form-section-head">
                            <p class="workspace-form-section-kicker">Impact</p>
                            <h3>Decision Context</h3>
                            <p class="panel-copy">Use this summary to decide whether the live product price should change now.</p>
                        </div>
                        <div class="price-review-metrics-grid">
                            <div class="price-review-metric">
                                <p class="section-kicker">Cost Change</p>
                                <p><strong>${review.costChangePercent === null || review.costChangePercent === undefined ? "-" : `${review.costChangePercent > 0 ? "+" : ""}${Number(review.costChangePercent).toFixed(2)}%`}</strong></p>
                            </div>
                            <div class="price-review-metric">
                                <p class="section-kicker">Triggered By</p>
                                <p><strong>${escapeHtml(review.sourceType || "-")}</strong></p>
                            </div>
                            <div class="price-review-metric">
                                <p class="section-kicker">Active Sales Catalogues</p>
                                <p><strong>${Number(review.affectedSalesCatalogueCount || 0)}</strong></p>
                            </div>
                            <div class="price-review-metric">
                                <p class="section-kicker">Active Catalogue Items</p>
                                <p><strong>${Number(review.affectedSalesCatalogueItemCount || 0)}</strong></p>
                            </div>
                        </div>
                        <p class="panel-copy panel-copy-tight">${(review.affectedSalesCatalogueNames || []).length
                            ? `Affected active catalogues: ${escapeHtml(review.affectedSalesCatalogueNames.join(", "))}.`
                            : "This product is not currently used in any active Sales Catalogue."}</p>
                    </section>
                    <section class="workspace-form-section price-review-section">
                        <div class="workspace-form-section-head">
                            <p class="workspace-form-section-kicker">Audit</p>
                            <h3>Review Trail</h3>
                            <p class="panel-copy">Keep approvals and rejections visible for later audit.</p>
                        </div>
                        <div class="price-review-audit-grid">
                            <div class="price-review-metric">
                                <p class="section-kicker">Created By</p>
                                <p><strong>${escapeHtml(review.createdBy || "-")}</strong></p>
                            </div>
                            <div class="price-review-metric">
                                <p class="section-kicker">Created On</p>
                                <p><strong>${formatDateTime(review.createdOn)}</strong></p>
                            </div>
                            <div class="price-review-metric">
                                <p class="section-kicker">Resolved By</p>
                                <p><strong>${escapeHtml(review.resolvedBy || "-")}</strong></p>
                            </div>
                            <div class="price-review-metric">
                                <p class="section-kicker">Resolved On</p>
                                <p><strong>${formatDateTime(review.resolvedOn)}</strong></p>
                            </div>
                        </div>
                        <p class="panel-copy panel-copy-tight">${escapeHtml(review.resolutionNote || (isPending
                            ? "This review is still pending an admin decision."
                            : "This review has already been resolved."))}</p>
                    </section>
                </div>
                <div class="form-actions">
                    ${isPending ? `
                        <button id="admin-product-price-review-cancel-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            Cancel
                        </button>
                        <button id="admin-product-price-review-reject-button" class="button button-secondary" type="button" data-review-id="${review.id}">
                            <span class="button-icon">${icons.inactive}</span>
                            Reject Recommendation
                        </button>
                        <button id="admin-product-price-review-approve-button" class="button button-primary-alt" type="button" data-review-id="${review.id}">
                            <span class="button-icon">${icons.active}</span>
                            Approve Price Change
                        </button>
                    ` : `
                        <button id="admin-product-price-review-cancel-button" class="button button-secondary" type="button">
                            <span class="button-icon">${icons.inactive}</span>
                            Clear Selection
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

function renderCurrentForm(snapshot) {
    if (featureState.activeSection === "categories") {
        return renderCategoryForm(snapshot);
    }

    if (featureState.activeSection === "seasons") {
        return renderSeasonForm(snapshot);
    }

    if (featureState.activeSection === "pricingPolicies") {
        return renderPricingPolicyForm(snapshot);
    }

    if (featureState.activeSection === "productPriceChangeReviews") {
        return renderProductPriceChangeReviewForm(snapshot);
    }

    if (featureState.activeSection === "reorderPolicies") {
        return renderReorderPolicyForm(snapshot);
    }

    if (featureState.activeSection === "storeConfigs") {
        return renderStoreConfigForm(snapshot);
    }

    return renderPaymentModeForm(snapshot);
}

function getGridMeta(snapshot) {
    if (featureState.activeSection === "categories") {
        const rows = snapshot.masterData.categories || [];
        return {
            title: "Category Directory",
            copy: "Review active and inactive category records and reopen any row for editing.",
            count: rows.length,
            countLabel: "categories",
            directoryHelp: "Search records, open one for editing, or change active status without leaving the admin workspace."
        };
    }

    if (featureState.activeSection === "seasons") {
        const rows = snapshot.masterData.seasons || [];
        return {
            title: "Season Directory",
            copy: "Track current and archived sales seasons.",
            count: rows.length,
            countLabel: "seasons",
            directoryHelp: "Search records, open one for editing, or change active status without leaving the admin workspace."
        };
    }

    if (featureState.activeSection === "reorderPolicies") {
        const rows = snapshot.masterData.reorderPolicies || [];
        return {
            title: "Reorder Policy Directory",
            copy: "Review stock-cover policies, reopen one for editing, or change which rules Moneta can apply.",
            count: rows.length,
            countLabel: "policies",
            directoryHelp: "Search records, open one for editing, or change active status without leaving the admin workspace."
        };
    }

    if (featureState.activeSection === "pricingPolicies") {
        const rows = snapshot.masterData.pricingPolicies || [];
        return {
            title: "Pricing Policy Directory",
            copy: "Review the live pricing rule Moneta uses for cost updates, margin guidance, and review alerts.",
            count: rows.length,
            countLabel: "policies",
            directoryHelp: "Search the pricing policy record and reopen it for editing without leaving the admin workspace."
        };
    }

    if (featureState.activeSection === "productPriceChangeReviews") {
        const rows = snapshot.masterData.productPriceChangeReviews || [];
        const pendingCount = rows.filter(review => normalizeText(review.status || "pending") === "pending").length;
        return {
            title: "Product Price Review Queue",
            copy: "Review recommended product price changes and decide whether active catalogue items should sync right away.",
            count: pendingCount,
            countLabel: "pending reviews",
            directoryHelp: "Search review records, open one for decision, and keep pricing governance separate from day-to-day Product Catalogue editing."
        };
    }

    if (featureState.activeSection === "storeConfigs") {
        const rows = snapshot.masterData.storeConfigs || [];
        return {
            title: "Store Configuration Directory",
            copy: "Review every store profile Moneta uses for invoices, receipts, tax defaults, and payment details.",
            count: rows.length,
            countLabel: "store profiles",
            directoryHelp: "Search store profiles and reopen one for editing without leaving the admin workspace."
        };
    }

    const rows = snapshot.masterData.paymentModes || [];
    return {
        title: "Payment Mode Directory",
        copy: "Keep transaction methods tidy so operational screens only show approved modes.",
        count: rows.length,
        countLabel: "payment modes",
        directoryHelp: "Search records, open one for editing, or change active status without leaving the admin workspace."
    };
}

function renderCurrentGridCard(snapshot) {
    const meta = getGridMeta(snapshot);

    return `
        <div class="panel-card">
            <div class="panel-header">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${getActiveSectionConfig().icon}</span>
                    <div>
                        <h3>${meta.title}</h3>
                        <p class="panel-copy">${meta.copy}</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${meta.count} ${meta.countLabel}</span>
                </div>
            </div>
            <div class="panel-body">
                <div class="toolbar">
                    <div>
                        <p class="section-kicker" style="margin-bottom: 0.25rem;">Directory</p>
                        <p class="panel-copy">${meta.directoryHelp || "Search records and reopen one for editing."}</p>
                    </div>
                    <div class="search-wrap">
                        <span class="search-icon">${icons.search}</span>
                        <input
                            id="admin-module-grid-search"
                            class="input toolbar-search"
                            type="search"
                            placeholder="Search ${meta.countLabel}"
                            value="${featureState.searchTerms[featureState.activeSection]}">
                    </div>
                </div>
                <div class="ag-shell">
                    <div id="admin-module-grid" class="ag-theme-alpine moneta-grid" style="height: 560px; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;
}

function syncCurrentGrid(snapshot) {
    const gridElement = document.getElementById("admin-module-grid");
    const rows = getSectionRows(snapshot);

    if (featureState.activeSection === "categories") {
        initializeCategoriesGrid(gridElement);
        refreshCategoriesGrid(rows);
        updateCategoriesGridSearch(featureState.searchTerms.categories);
        return;
    }

    if (featureState.activeSection === "seasons") {
        initializeSeasonsGrid(gridElement);
        refreshSeasonsGrid(rows);
        updateSeasonsGridSearch(featureState.searchTerms.seasons);
        return;
    }

    if (featureState.activeSection === "reorderPolicies") {
        initializeReorderPoliciesGrid(gridElement);
        refreshReorderPoliciesGrid(rows);
        updateReorderPoliciesGridSearch(featureState.searchTerms.reorderPolicies);
        return;
    }

    if (featureState.activeSection === "pricingPolicies") {
        initializePricingPoliciesGrid(gridElement);
        refreshPricingPoliciesGrid(rows);
        updatePricingPoliciesGridSearch(featureState.searchTerms.pricingPolicies);
        return;
    }

    if (featureState.activeSection === "productPriceChangeReviews") {
        initializeProductPriceChangeReviewsGrid(gridElement);
        refreshProductPriceChangeReviewsGrid(rows);
        updateProductPriceChangeReviewsGridSearch(featureState.searchTerms.productPriceChangeReviews);
        return;
    }

    if (featureState.activeSection === "storeConfigs") {
        initializeStoreConfigsGrid(gridElement);
        refreshStoreConfigsGrid(rows);
        updateStoreConfigsGridSearch(featureState.searchTerms.storeConfigs);
        return;
    }

    initializePaymentModesGrid(gridElement);
    refreshPaymentModesGrid(rows);
    updatePaymentModesGridSearch(featureState.searchTerms.paymentModes);
}

export function renderAdminModulesView() {
    const root = document.getElementById("admin-modules-root");
    if (!root) return;

    syncActiveSectionFromHash();

    const snapshot = getState();
    root.innerHTML = `
        <div class="admin-module-shell">
            ${renderHeader(snapshot)}
            ${renderCurrentForm(snapshot)}
            ${renderCurrentGridCard(snapshot)}
        </div>
    `;

    syncCurrentGrid(snapshot);
}

async function handleCategorySubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("admin-category-doc-id")?.value;
        const categoryName = document.getElementById("admin-category-name")?.value || "-";
        const result = await runProgressToastFlow({
            title: docId ? "Updating Product Category" : "Adding Product Category",
            initialMessage: "Reading the current category records...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Product Category Updated" : "Product Category Added",
            successMessage: docId ? "The category was updated successfully." : "The category was added successfully."
        }, async ({ update }) => {
            update("Running validation and usage checks...", 38, "Step 2 of 5");

            update("Writing category changes to the database...", 72, "Step 3 of 5");

            const result = await saveCategory({
                docId,
                categoryName: document.getElementById("admin-category-name")?.value
            }, getState().currentUser, getState().masterData.categories);

            update("Refreshing the admin workspace...", 88, "Step 4 of 5");
            clearEditingState("categories");
            renderAdminModulesView();
            update("Category ready for use across Moneta.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Category created." : "Category updated.", "success", {
            title: "Admin Modules"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Product Category Added" : "Product Category Updated",
            message: "The category record has been saved successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Category", value: categoryName },
                { label: "Module", value: "Product Categories" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Category save failed:", error);
    }
}

async function handleSeasonSubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("admin-season-doc-id")?.value;
        const seasonName = document.getElementById("admin-season-name")?.value || "-";
        const seasonStatus = document.getElementById("admin-season-status")?.value || "-";
        const result = await runProgressToastFlow({
            title: docId ? "Updating Sales Season" : "Adding Sales Season",
            initialMessage: "Reading season records and date inputs...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Sales Season Updated" : "Sales Season Added",
            successMessage: docId ? "The season was updated successfully." : "The season was created successfully."
        }, async ({ update }) => {
            update("Validating dates, workflow status, and duplicates...", 38, "Step 2 of 5");

            update("Writing season changes to the database...", 72, "Step 3 of 5");

            const result = await saveSeason({
                docId,
                seasonName: document.getElementById("admin-season-name")?.value,
                startDate: document.getElementById("admin-season-start-date")?.value,
                endDate: document.getElementById("admin-season-end-date")?.value,
                status: document.getElementById("admin-season-status")?.value
            }, getState().currentUser, getState().masterData.seasons);

            update("Refreshing the admin workspace...", 88, "Step 4 of 5");
            clearEditingState("seasons");
            renderAdminModulesView();
            update("Season timeline is now ready for catalogue planning.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Season created." : "Season updated.", "success", {
            title: "Admin Modules"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Sales Season Added" : "Sales Season Updated",
            message: "The sales season has been saved successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Season", value: seasonName },
                { label: "Status", value: seasonStatus }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Season save failed:", error);
    }
}

async function handlePaymentModeSubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("admin-payment-mode-doc-id")?.value;
        const paymentModeName = document.getElementById("admin-payment-mode-name")?.value || "-";
        const result = await runProgressToastFlow({
            title: docId ? "Updating Payment Mode" : "Adding Payment Mode",
            initialMessage: "Reading payment mode records...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Payment Mode Updated" : "Payment Mode Added",
            successMessage: docId ? "The payment mode was updated successfully." : "The payment mode was created successfully."
        }, async ({ update }) => {
            update("Validating duplicates and usage restrictions...", 40, "Step 2 of 5");

            update("Writing payment mode changes to the database...", 72, "Step 3 of 5");

            const result = await savePaymentMode({
                docId,
                paymentMode: document.getElementById("admin-payment-mode-name")?.value
            }, getState().currentUser, getState().masterData.paymentModes);

            update("Refreshing the payment mode directory...", 88, "Step 4 of 5");
            clearEditingState("paymentModes");
            renderAdminModulesView();
            update("Payment mode is available for downstream workflows.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Payment mode created." : "Payment mode updated.", "success", {
            title: "Admin Modules"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Payment Mode Added" : "Payment Mode Updated",
            message: "The payment mode record has been saved successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Payment Mode", value: paymentModeName },
                { label: "Module", value: "Payment Modes" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Payment mode save failed:", error);
    }
}

async function handlePricingPolicySubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("admin-pricing-policy-doc-id")?.value;
        const policyName = document.getElementById("admin-pricing-policy-name")?.value || "-";
        await runProgressToastFlow({
            title: "Updating Pricing Policy",
            initialMessage: "Reading the pricing policy inputs...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: "Pricing Policy Updated",
            successMessage: "The pricing policy was updated successfully."
        }, async ({ update }) => {
            update("Validating costing, margin, and selling-price rules...", 40, "Step 2 of 5");

            update("Writing pricing policy changes to Firestore...", 72, "Step 3 of 5");
            await savePricingPolicy({
                docId,
                policyName: document.getElementById("admin-pricing-policy-name")?.value,
                costingMethod: document.getElementById("admin-pricing-policy-costing-method")?.value,
                sellingPriceBehavior: document.getElementById("admin-pricing-policy-selling-behavior")?.value,
                defaultTargetMarginPercentage: document.getElementById("admin-pricing-policy-default-margin")?.value,
                costChangeAlertThresholdPercentage: document.getElementById("admin-pricing-policy-cost-threshold")?.value
            }, getState().currentUser, getState().masterData.pricingPolicies);

            update("Refreshing the pricing policy workspace...", 88, "Step 4 of 5");
            renderAdminModulesView();
            update("Pricing rules are ready for Product Catalogue and Purchases.", 96, "Step 5 of 5");
        });

        showToast("Pricing policy updated.", "success", {
            title: "Admin Modules"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Pricing Policy Updated",
            message: "The pricing policy has been saved successfully.",
            details: [
                { label: "Policy", value: policyName },
                { label: "Action", value: "Update" },
                { label: "Module", value: "Pricing Policy" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Pricing policy save failed:", error);
        showToast(error.message || "Could not save the pricing policy.", "error");
    }
}

async function handleStoreConfigSubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("admin-store-config-doc-id")?.value;
        const storeName = document.getElementById("admin-store-config-store-name")?.value || "-";
        await runProgressToastFlow({
            title: "Updating Store Configuration",
            initialMessage: "Reading the selected store profile...",
            initialProgress: 18,
            initialStep: "Step 1 of 5",
            successTitle: "Store Configuration Updated",
            successMessage: "The store configuration was updated successfully."
        }, async ({ update }) => {
            update("Validating address, tax, bank, and payment defaults...", 40, "Step 2 of 5");

            update("Writing store configuration changes to Firestore...", 72, "Step 3 of 5");
            await saveStoreConfig({
                docId,
                companyName: document.getElementById("admin-store-config-company-name")?.value,
                addressLine1: document.getElementById("admin-store-config-address-line-1")?.value,
                addressLine2: document.getElementById("admin-store-config-address-line-2")?.value,
                city: document.getElementById("admin-store-config-city")?.value,
                state: document.getElementById("admin-store-config-state")?.value,
                pincode: document.getElementById("admin-store-config-pincode")?.value,
                stateCode: document.getElementById("admin-store-config-state-code")?.value,
                taxId: document.getElementById("admin-store-config-tax-id")?.value,
                email: document.getElementById("admin-store-config-email")?.value,
                salePrefix: document.getElementById("admin-store-config-sale-prefix")?.value,
                requiresCustomerAddress: document.getElementById("admin-store-config-requires-address")?.value,
                cgstRate: document.getElementById("admin-store-config-cgst-rate")?.value,
                sgstRate: document.getElementById("admin-store-config-sgst-rate")?.value,
                bankName: document.getElementById("admin-store-config-bank-name")?.value,
                branch: document.getElementById("admin-store-config-branch")?.value,
                accountNumber: document.getElementById("admin-store-config-account-number")?.value,
                ifscCode: document.getElementById("admin-store-config-ifsc-code")?.value,
                accountHolderName: document.getElementById("admin-store-config-account-holder-name")?.value,
                upiQRCodeUrl: document.getElementById("admin-store-config-upi-qr-url")?.value,
                terms: document.getElementById("admin-store-config-terms")?.value
            }, getState().currentUser, getState().masterData.storeConfigs);

            update("Refreshing the store profile directory...", 88, "Step 4 of 5");
            renderAdminModulesView();
            update("Store defaults are ready across retail, leads, and PDFs.", 96, "Step 5 of 5");
        });

        showToast("Store configuration updated.", "success", {
            title: "Admin Modules"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: "Store Configuration Updated",
            message: "The store profile has been saved successfully.",
            details: [
                { label: "Store", value: storeName },
                { label: "Action", value: "Update" },
                { label: "Module", value: "Store Config" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Store configuration save failed:", error);
        showToast(error.message || "Could not save the store configuration.", "error");
    }
}

function collectReorderPolicyFormDraft() {
    return {
        policyName: document.getElementById("admin-reorder-policy-name")?.value || "",
        scopeType: document.getElementById("admin-reorder-policy-scope-type")?.value
            || getEditingRecord(getState(), "reorderPolicies")?.scopeType
            || DEFAULT_REORDER_POLICY.scopeType,
        categoryId: document.getElementById("admin-reorder-policy-category-id")?.value || "",
        productId: document.getElementById("admin-reorder-policy-product-id")?.value || "",
        shortWindowDays: document.getElementById("admin-reorder-short-window-days")?.value || DEFAULT_REORDER_POLICY.shortWindowDays,
        shortWindowWeight: document.getElementById("admin-reorder-short-window-weight")?.value || DEFAULT_REORDER_POLICY.shortWindowWeight,
        longWindowDays: document.getElementById("admin-reorder-long-window-days")?.value || DEFAULT_REORDER_POLICY.longWindowDays,
        longWindowWeight: document.getElementById("admin-reorder-long-window-weight")?.value || DEFAULT_REORDER_POLICY.longWindowWeight,
        leadTimeDays: document.getElementById("admin-reorder-lead-time-days")?.value || DEFAULT_REORDER_POLICY.leadTimeDays,
        safetyDays: document.getElementById("admin-reorder-safety-days")?.value || DEFAULT_REORDER_POLICY.safetyDays,
        targetCoverDays: document.getElementById("admin-reorder-target-cover-days")?.value || DEFAULT_REORDER_POLICY.targetCoverDays,
        lowHistoryUnitThreshold: document.getElementById("admin-reorder-low-history-threshold")?.value || DEFAULT_REORDER_POLICY.lowHistoryUnitThreshold,
        zeroDemandBehavior: document.getElementById("admin-reorder-zero-demand-behavior")?.value || DEFAULT_REORDER_POLICY.zeroDemandBehavior,
        minimumOrderQty: document.getElementById("admin-reorder-min-order-qty")?.value || DEFAULT_REORDER_POLICY.minimumOrderQty,
        packSize: document.getElementById("admin-reorder-pack-size")?.value || DEFAULT_REORDER_POLICY.packSize,
        isActive: (document.getElementById("admin-reorder-policy-status")?.value
            || (getEditingRecord(getState(), "reorderPolicies")?.isActive ? "true" : "")
            || "true") === "true"
    };
}

function refreshReorderPolicyExplanationUi() {
    const snapshot = getState();
    const scopeTypeInput = document.getElementById("admin-reorder-policy-scope-type");
    const statusSelect = document.getElementById("admin-reorder-policy-status");
    const categorySelect = document.getElementById("admin-reorder-policy-category-id");
    const productSelect = document.getElementById("admin-reorder-policy-product-id");
    const draft = collectReorderPolicyFormDraft();
    const scopeType = draft.scopeType || DEFAULT_REORDER_POLICY.scopeType;
    const showCategoryField = scopeType === "category" || scopeType === "product";
    const categoryField = document.getElementById("admin-reorder-policy-category-field");
    const productField = document.getElementById("admin-reorder-policy-product-field");
    const categoryHelp = document.getElementById("admin-reorder-policy-category-help");
    const productHelp = document.getElementById("admin-reorder-policy-product-help");
    const explanationRoot = document.getElementById("admin-reorder-policy-explanation");
    let resolvedCategoryId = draft.categoryId;
    let resolvedProductId = draft.productId;

    if (scopeType === "product" && !resolvedCategoryId && resolvedProductId) {
        resolvedCategoryId = inferReorderPolicyCategoryId(snapshot, resolvedProductId);
    }

    if (scopeTypeInput) {
        scopeTypeInput.value = scopeType;
        scopeTypeInput.required = true;
    }

    if (statusSelect) {
        statusSelect.required = true;
    }

    if (categoryField) {
        categoryField.hidden = !showCategoryField;
    }

    if (productField) {
        productField.hidden = scopeType !== "product";
    }

    if (categoryHelp) {
        categoryHelp.textContent = scopeType === "product"
            ? "Choose a category first so Moneta can narrow the product list to matching items."
            : "Only categories that already have products assigned are listed here.";
    }

    if (productHelp) {
        productHelp.textContent = "Moneta will only show products from the selected category.";
    }

    if (categorySelect) {
        const categoryOptions = renderCategorySelectOptions(snapshot, {
            currentValue: resolvedCategoryId,
            currentProductId: resolvedProductId
        });
        const categoryIds = new Set(
            getReorderPolicyAssignableProducts(snapshot, resolvedProductId)
                .map(row => row.categoryId || "")
                .filter(Boolean)
        );

        if (resolvedCategoryId && !categoryIds.has(resolvedCategoryId)) {
            resolvedCategoryId = "";
        }

        categorySelect.innerHTML = `<option value="">Select category</option>${categoryOptions}`;
        categorySelect.value = resolvedCategoryId;
        categorySelect.required = showCategoryField;
    }

    if (scopeType === "product" && resolvedProductId) {
        const productCategoryId = inferReorderPolicyCategoryId(snapshot, resolvedProductId);
        if (!resolvedCategoryId) {
            resolvedCategoryId = productCategoryId;
            if (categorySelect) {
                categorySelect.value = resolvedCategoryId;
            }
        } else if (productCategoryId && productCategoryId !== resolvedCategoryId) {
            resolvedProductId = "";
        }
    }

    if (productSelect) {
        const productOptions = renderProductSelectOptions(snapshot, {
            currentValue: resolvedProductId,
            categoryId: scopeType === "product" ? resolvedCategoryId : ""
        });
        const productIds = new Set(
            getReorderPolicyAssignableProducts(snapshot, resolvedProductId)
                .filter(row => row.id === resolvedProductId || (resolvedCategoryId && row.categoryId === resolvedCategoryId))
                .map(row => row.id)
        );

        if (resolvedProductId && !productIds.has(resolvedProductId)) {
            resolvedProductId = "";
        }

        productSelect.disabled = scopeType !== "product" || !resolvedCategoryId;
        productSelect.innerHTML = `<option value="">${resolvedCategoryId ? "Select product" : "Select category first"}</option>${productOptions}`;
        productSelect.value = resolvedProductId;
        productSelect.required = scopeType === "product";
    }

    if (explanationRoot) {
        explanationRoot.innerHTML = renderReorderPolicyExplanationPreview(snapshot, {
            ...draft,
            categoryId: resolvedCategoryId,
            productId: resolvedProductId
        }, getEditingRecord(snapshot, "reorderPolicies"));
    }
}

async function handleReorderPolicySubmit(event) {
    event.preventDefault();

    try {
        const docId = document.getElementById("admin-reorder-policy-doc-id")?.value;
        const policyName = document.getElementById("admin-reorder-policy-name")?.value || "-";
        const result = await runProgressToastFlow({
            title: docId ? "Updating Reorder Policy" : "Adding Reorder Policy",
            initialMessage: "Reading policy form fields and scope...",
            initialProgress: 16,
            initialStep: "Step 1 of 5",
            successTitle: docId ? "Reorder Policy Updated" : "Reorder Policy Added",
            successMessage: docId ? "The reorder policy was updated successfully." : "The reorder policy was created successfully."
        }, async ({ update }) => {
            update("Validating scope, weights, and rule coverage...", 38, "Step 2 of 5");

            update("Writing reorder policy changes to the database...", 72, "Step 3 of 5");

            const result = await saveReorderPolicy({
                docId,
                ...collectReorderPolicyFormDraft()
            }, getState().currentUser, getState().masterData.reorderPolicies, getState().masterData.categories, getState().masterData.products);

            update("Refreshing policy directory and explanation preview...", 88, "Step 4 of 5");
            clearEditingState("reorderPolicies");
            renderAdminModulesView();
            update("Policy is ready for Reorder Recommendations.", 96, "Step 5 of 5");
            return result;
        });

        showToast(result.mode === "create" ? "Reorder policy created." : "Reorder policy updated.", "success", {
            title: "Admin Modules"
        });
        ProgressToast.hide(0);
        await showSummaryModal({
            title: result.mode === "create" ? "Reorder Policy Added" : "Reorder Policy Updated",
            message: "The reorder policy has been saved successfully.",
            details: [
                { label: "Action", value: result.mode === "create" ? "Create" : "Update" },
                { label: "Policy", value: policyName },
                { label: "Module", value: "Reorder Policies" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Reorder policy save failed:", error);
        showToast(error.message || "Could not save the reorder policy.", "error");
    }
}

function getRecordDisplayName(record = {}) {
    return record.categoryName || record.seasonName || record.paymentMode || record.policyName || record.productName || record.storeName || "-";
}

function handleSearchInput(target) {
    if (target.id !== "admin-module-grid-search") return;

    featureState.searchTerms[featureState.activeSection] = target.value || "";

    if (featureState.activeSection === "categories") {
        updateCategoriesGridSearch(featureState.searchTerms.categories);
        return;
    }

    if (featureState.activeSection === "seasons") {
        updateSeasonsGridSearch(featureState.searchTerms.seasons);
        return;
    }

    if (featureState.activeSection === "reorderPolicies") {
        updateReorderPoliciesGridSearch(featureState.searchTerms.reorderPolicies);
        return;
    }

    if (featureState.activeSection === "pricingPolicies") {
        updatePricingPoliciesGridSearch(featureState.searchTerms.pricingPolicies);
        return;
    }

    if (featureState.activeSection === "productPriceChangeReviews") {
        updateProductPriceChangeReviewsGridSearch(featureState.searchTerms.productPriceChangeReviews);
        return;
    }

    if (featureState.activeSection === "storeConfigs") {
        updateStoreConfigsGridSearch(featureState.searchTerms.storeConfigs);
        return;
    }

    updatePaymentModesGridSearch(featureState.searchTerms.paymentModes);
}

async function handleEditRecord(button) {
    const entity = button.dataset.entity;
    const recordId = button.dataset.recordId || null;
    const snapshot = getState();
    const rows = getSectionRows(snapshot, entity);
    const record = rows.find(row => row.id === recordId) || null;

    if (!recordId || !ADMIN_SECTIONS[entity] || !record) return;

    button.disabled = true;

    try {
        const restriction = await getAdminEditRestriction(entity, record);

        if (restriction.isLocked) {
            showToast(restriction.message || "This record can only be activated or deactivated.", "error");
            return;
        }

        setActiveSection(entity);
        featureState.editingIds[entity] = recordId;
        renderAdminModulesView();
        focusFormField(ADMIN_FORM_FOCUS_TARGETS[entity]);
    } catch (error) {
        console.error("[Moneta] Admin edit check failed:", error);
        showToast(error.message || "Could not open this record for editing.", "error");
    } finally {
        button.disabled = false;
    }
}

async function handleStatusToggle(button) {
    const entity = button.dataset.entity;
    const recordId = button.dataset.recordId;
    const nextValue = button.dataset.nextStatus === "true";
    const snapshot = getState();
    const rows = getSectionRows(snapshot, entity);
    const record = rows.find(row => row.id === recordId);

    if (!record || !recordId) {
        showToast("Admin record could not be found.", "error");
        return;
    }

    const confirmed = await showConfirmationModal({
        title: `${nextValue ? "Activate" : "Deactivate"} ${ADMIN_SECTIONS[entity].entityLabel}`,
        message: `${nextValue ? "Activate" : "Deactivate"} ${getRecordDisplayName(record)}?`,
        details: [
            { label: "Record", value: getRecordDisplayName(record) },
            { label: "Requested Action", value: nextValue ? "Activate" : "Deactivate" }
        ],
        note: nextValue
            ? "Please confirm this status change before Moneta updates the record."
            : "This will immediately hide the record from active operational pickers until it is activated again.",
        confirmText: nextValue ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        tone: nextValue ? "warning" : "danger"
    });

    if (!confirmed) return;

    try {
        if (entity === "categories") {
            await toggleCategoryStatus(recordId, nextValue, snapshot.currentUser);
        } else if (entity === "seasons") {
            await toggleSeasonStatus(recordId, nextValue, snapshot.currentUser);
        } else if (entity === "reorderPolicies") {
            await toggleReorderPolicyStatus(recordId, nextValue, snapshot.currentUser, snapshot.masterData.reorderPolicies);
        } else {
            await togglePaymentModeStatus(recordId, nextValue, snapshot.currentUser, record.paymentMode || "");
        }

        showToast(`${ADMIN_SECTIONS[entity].entityLabel} ${nextValue ? "activated" : "deactivated"}.`, "success");
        await showSummaryModal({
            title: `${ADMIN_SECTIONS[entity].entityLabel} ${nextValue ? "Activated" : "Deactivated"}`,
            message: "The record status was updated successfully.",
            details: [
                { label: "Record", value: getRecordDisplayName(record) },
                { label: "New Status", value: nextValue ? "Active" : "Inactive" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Admin status update failed:", error);
        showToast(error.message || "Could not update status.", "error");
    }
}

async function handleApproveProductPriceReview(button) {
    const reviewId = button.dataset.reviewId;
    const snapshot = getState();
    const review = getEditingRecord(snapshot, "productPriceChangeReviews");

    if (!reviewId || !review) {
        showToast("Price review could not be found.", "error");
        return;
    }

    const affectedCatalogueCount = Number(review.affectedSalesCatalogueCount || 0);
    const choice = await showChoiceModal({
        title: "Approve Product Price Change",
        message: `Approve the suggested live price for ${review.productName || "this product"}?`,
        details: [
            { label: "Current Live Price", value: formatCurrency(review.currentSellingPrice) },
            { label: "Recommended Price", value: formatCurrency(review.recommendedSellingPrice) },
            { label: "Active Sales Catalogues", value: String(affectedCatalogueCount) }
        ],
        note: affectedCatalogueCount > 0
            ? "Choose whether Moneta should also sync active Sales Catalogue items that still use the older product price."
            : "This product is not currently used in any active Sales Catalogue.",
        choices: [
            ...(affectedCatalogueCount > 0 ? [{ value: "approve-and-sync", label: `Approve + Sync ${affectedCatalogueCount} Active Catalogue${affectedCatalogueCount === 1 ? "" : "s"}`, variant: "primary" }] : []),
            { value: "approve-only", label: "Approve Product Only", variant: "secondary" },
            { value: "cancel", label: "Cancel", variant: "secondary" }
        ]
    });

    if (!choice || choice === "cancel") return;

    try {
        const result = await approveProductPriceChangeReview(
            reviewId,
            { syncActiveSalesCatalogues: choice === "approve-and-sync" },
            snapshot.currentUser,
            snapshot.masterData
        );
        renderAdminModulesView();
        showToast("Product price review approved.", "success", { title: "Admin Modules" });
        await showSummaryModal({
            title: "Product Price Change Approved",
            message: "Moneta applied the approved live product price successfully.",
            details: [
                { label: "Product", value: review.productName || "-" },
                { label: "Approved Price", value: formatCurrency(result.approvedSellingPrice) },
                { label: "Sales Catalogue Sync", value: choice === "approve-and-sync" ? `Synced ${result.syncResult.syncedCount || 0} items` : "Skipped" }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Product price approval failed:", error);
        showToast(error.message || "Could not approve the product price change.", "error");
    }
}

async function handleRejectProductPriceReview(button) {
    const reviewId = button.dataset.reviewId;
    const snapshot = getState();
    const review = getEditingRecord(snapshot, "productPriceChangeReviews");

    if (!reviewId || !review) {
        showToast("Price review could not be found.", "error");
        return;
    }

    const confirmed = await showConfirmationModal({
        title: "Reject Product Price Change",
        message: `Reject the suggested price update for ${review.productName || "this product"}?`,
        details: [
            { label: "Current Live Price", value: formatCurrency(review.currentSellingPrice) },
            { label: "Recommended Price", value: formatCurrency(review.recommendedSellingPrice) }
        ],
        note: "Rejecting will keep the current live product selling price unchanged and close this review.",
        confirmText: "Reject Recommendation",
        cancelText: "Cancel",
        tone: "danger"
    });

    if (!confirmed) return;

    try {
        const result = await rejectProductPriceChangeReview(reviewId, snapshot.currentUser, snapshot.masterData);
        renderAdminModulesView();
        showToast("Product price review rejected.", "success", { title: "Admin Modules" });
        await showSummaryModal({
            title: "Product Price Change Rejected",
            message: "Moneta kept the current live product selling price unchanged.",
            details: [
                { label: "Product", value: review.productName || "-" },
                { label: "Kept Price", value: formatCurrency(result.keptSellingPrice) }
            ]
        });
    } catch (error) {
        console.error("[Moneta] Product price rejection failed:", error);
        showToast(error.message || "Could not reject the product price change.", "error");
    }
}

function handleCancelEdit(section) {
    if (section === "productPriceChangeReviews") {
        clearReviewSelection(section);
    } else {
        clearEditingState(section);
    }
    renderAdminModulesView();
}

function bindAdminModulesDomEvents() {
    const root = document.getElementById("admin-modules-root");
    if (!root || root.dataset.bound === "true") return;

    root.addEventListener("submit", event => {
        if (event.target.id === "admin-category-form") {
            handleCategorySubmit(event);
            return;
        }

        if (event.target.id === "admin-season-form") {
            handleSeasonSubmit(event);
            return;
        }

        if (event.target.id === "admin-payment-mode-form") {
            handlePaymentModeSubmit(event);
            return;
        }

        if (event.target.id === "admin-pricing-policy-form") {
            handlePricingPolicySubmit(event);
            return;
        }

        if (event.target.id === "admin-store-config-form") {
            handleStoreConfigSubmit(event);
            return;
        }

        if (event.target.id === "admin-reorder-policy-form") {
            handleReorderPolicySubmit(event);
        }
    });

    root.addEventListener("input", event => {
        handleSearchInput(event.target);

        if (event.target.closest("#admin-reorder-policy-form")) {
            refreshReorderPolicyExplanationUi();
        }
    });

    root.addEventListener("change", event => {
        if (event.target.closest("#admin-reorder-policy-form")) {
            refreshReorderPolicyExplanationUi();
        }
    });

    root.addEventListener("click", event => {
        const target = event.target;
        const editButton = target.closest(".admin-module-edit-button");
        const statusButton = target.closest(".admin-module-status-button");
        const categoryCancelButton = target.closest("#admin-category-cancel-button");
        const seasonCancelButton = target.closest("#admin-season-cancel-button");
        const paymentModeCancelButton = target.closest("#admin-payment-mode-cancel-button");
        const pricingPolicyCancelButton = target.closest("#admin-pricing-policy-cancel-button");
        const productPriceReviewApproveButton = target.closest("#admin-product-price-review-approve-button");
        const productPriceReviewRejectButton = target.closest("#admin-product-price-review-reject-button");
        const productPriceReviewCancelButton = target.closest("#admin-product-price-review-cancel-button");
        const storeConfigCancelButton = target.closest("#admin-store-config-cancel-button");
        const reorderPolicyCancelButton = target.closest("#admin-reorder-policy-cancel-button");

        if (editButton) {
            handleEditRecord(editButton);
            return;
        }

        if (statusButton) {
            handleStatusToggle(statusButton);
            return;
        }

        if (categoryCancelButton) {
            handleCancelEdit("categories");
            return;
        }

        if (seasonCancelButton) {
            handleCancelEdit("seasons");
            return;
        }

        if (paymentModeCancelButton) {
            handleCancelEdit("paymentModes");
            return;
        }

        if (pricingPolicyCancelButton) {
            handleCancelEdit("pricingPolicies");
            return;
        }

        if (productPriceReviewApproveButton) {
            handleApproveProductPriceReview(productPriceReviewApproveButton);
            return;
        }

        if (productPriceReviewRejectButton) {
            handleRejectProductPriceReview(productPriceReviewRejectButton);
            return;
        }

        if (productPriceReviewCancelButton) {
            handleCancelEdit("productPriceChangeReviews");
            return;
        }

        if (storeConfigCancelButton) {
            handleCancelEdit("storeConfigs");
            return;
        }

        if (reorderPolicyCancelButton) {
            handleCancelEdit("reorderPolicies");
        }
    });

    root.dataset.bound = "true";
}

export function initializeAdminModulesFeature() {
    bindAdminModulesDomEvents();

    subscribe(snapshot => {
        if (snapshot.currentRoute === "#/admin-modules") {
            renderAdminModulesView();
        }
    });
}
