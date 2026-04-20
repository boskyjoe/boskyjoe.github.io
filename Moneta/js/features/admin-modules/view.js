import { getState, subscribe } from "../../app/store.js";
import { showConfirmationModal, showSummaryModal } from "../../shared/modal.js";
import { ProgressToast, runProgressToastFlow, showToast } from "../../shared/toast.js";
import { icons } from "../../shared/icons.js";
import { focusFormField } from "../../shared/focus.js";
import {
    initializeCategoriesGrid,
    initializePaymentModesGrid,
    initializeReorderPoliciesGrid,
    initializeSeasonsGrid,
    refreshCategoriesGrid,
    refreshPaymentModesGrid,
    refreshReorderPoliciesGrid,
    refreshSeasonsGrid,
    updateCategoriesGridSearch,
    updatePaymentModesGridSearch,
    updateReorderPoliciesGridSearch,
    updateSeasonsGridSearch
} from "./grid.js";
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
    getAdminEditRestriction,
    saveCategory,
    savePaymentMode,
    saveReorderPolicy,
    saveSeason,
    toggleCategoryStatus,
    togglePaymentModeStatus,
    toggleReorderPolicyStatus,
    toggleSeasonStatus
} from "./service.js";

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
    reorderPolicies: {
        label: "Reorder Policies",
        entityLabel: "Reorder Policy",
        icon: icons.reports,
        description: "Define the stock-cover rules Moneta uses for Reorder Recommendations and explain them in plain language."
    }
};

const SEASON_STATUS_OPTIONS = ["Upcoming", "Active", "Archived"];

const featureState = {
    activeSection: "categories",
    searchTerms: {
        categories: "",
        seasons: "",
        paymentModes: "",
        reorderPolicies: ""
    },
    editingIds: {
        categories: null,
        seasons: null,
        paymentModes: null,
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
    reorderPolicies: {
        formId: "admin-reorder-policy-form",
        inputSelector: "#admin-reorder-policy-name"
    }
};

function toDateInputValue(value) {
    if (!value) return "";

    const date = value.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

function setActiveSection(section) {
    if (!ADMIN_SECTIONS[section]) return;
    featureState.activeSection = section;
}

function getEditingRecord(snapshot, section = featureState.activeSection) {
    const recordId = featureState.editingIds[section];
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

function renderSectionTabs(snapshot) {
    const categories = snapshot.masterData.categories || [];
    const seasons = snapshot.masterData.seasons || [];
    const paymentModes = snapshot.masterData.paymentModes || [];
    const reorderPolicies = snapshot.masterData.reorderPolicies || [];

    const counts = {
        categories: categories.length,
        seasons: seasons.length,
        paymentModes: paymentModes.length,
        reorderPolicies: reorderPolicies.length
    };

    return `
        <div class="admin-module-switcher" role="tablist" aria-label="Admin modules">
            ${Object.entries(ADMIN_SECTIONS).map(([key, config]) => `
                <button
                    class="admin-module-tab${featureState.activeSection === key ? " active" : ""}"
                    type="button"
                    role="tab"
                    aria-selected="${featureState.activeSection === key ? "true" : "false"}"
                    data-admin-section="${key}">
                    <span class="button-icon">${config.icon}</span>
                    <span>${config.label}</span>
                    <span class="admin-module-tab-count">${counts[key]}</span>
                </button>
            `).join("")}
        </div>
    `;
}

function renderHeader(snapshot) {
    const config = getActiveSectionConfig();
    const rows = getSectionRows(snapshot);
    const activeCount = rows.filter(row => row.isActive).length;

    return `
        <div class="panel-card">
            <div class="panel-header panel-header-accent">
                <div class="panel-title-wrap">
                    <span class="panel-icon panel-icon-alt">${icons.settings}</span>
                    <div>
                        <h2>Admin Modules</h2>
                        <p class="panel-copy">${config.description}</p>
                    </div>
                </div>
                <div class="toolbar-meta">
                    <span class="status-pill">${rows.length} records</span>
                    <span class="status-pill">${activeCount} active</span>
                </div>
            </div>
            <div class="panel-body">
                ${renderSectionTabs(snapshot)}
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

function renderCurrentForm(snapshot) {
    if (featureState.activeSection === "categories") {
        return renderCategoryForm(snapshot);
    }

    if (featureState.activeSection === "seasons") {
        return renderSeasonForm(snapshot);
    }

    if (featureState.activeSection === "reorderPolicies") {
        return renderReorderPolicyForm(snapshot);
    }

    return renderPaymentModeForm(snapshot);
}

function getGridMeta(snapshot) {
    if (featureState.activeSection === "categories") {
        const rows = snapshot.masterData.categories || [];
        return {
            title: "Category Directory",
            copy: "Review active and inactive category records, then reopen any row for editing.",
            count: rows.length,
            countLabel: "categories"
        };
    }

    if (featureState.activeSection === "seasons") {
        const rows = snapshot.masterData.seasons || [];
        return {
            title: "Season Directory",
            copy: "Track the full sales season history, including inactive or archived seasonal windows.",
            count: rows.length,
            countLabel: "seasons"
        };
    }

    if (featureState.activeSection === "reorderPolicies") {
        const rows = snapshot.masterData.reorderPolicies || [];
        return {
            title: "Reorder Policy Directory",
            copy: "Review the active stock-cover policies, reopen one for editing, or change which rules Moneta can apply in the report.",
            count: rows.length,
            countLabel: "policies"
        };
    }

    const rows = snapshot.masterData.paymentModes || [];
    return {
        title: "Payment Mode Directory",
        copy: "Keep transaction methods tidy so operational screens only offer the modes your team wants to use.",
        count: rows.length,
        countLabel: "payment modes"
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
                        <p class="panel-copy">Search records, open one for editing, or change active status without leaving the admin workspace.</p>
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

    initializePaymentModesGrid(gridElement);
    refreshPaymentModesGrid(rows);
    updatePaymentModesGridSearch(featureState.searchTerms.paymentModes);
}

export function renderAdminModulesView() {
    const root = document.getElementById("admin-modules-root");
    if (!root) return;

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
    return record.categoryName || record.seasonName || record.paymentMode || record.policyName || "-";
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

function handleCancelEdit(section) {
    clearEditingState(section);
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
        const sectionButton = target.closest("[data-admin-section]");
        const editButton = target.closest(".admin-module-edit-button");
        const statusButton = target.closest(".admin-module-status-button");
        const categoryCancelButton = target.closest("#admin-category-cancel-button");
        const seasonCancelButton = target.closest("#admin-season-cancel-button");
        const paymentModeCancelButton = target.closest("#admin-payment-mode-cancel-button");
        const reorderPolicyCancelButton = target.closest("#admin-reorder-policy-cancel-button");

        if (sectionButton) {
            setActiveSection(sectionButton.dataset.adminSection);
            renderAdminModulesView();
            return;
        }

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
