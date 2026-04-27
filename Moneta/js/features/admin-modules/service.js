import {
    createCategoryRecord,
    createPaymentModeRecord,
    createReorderPolicyRecord,
    createSeasonRecord,
    seedStoreConfigRecords,
    getCategoryUsageStatus,
    getPaymentModeUsageStatus,
    getSeasonUsageStatus,
    setCategoryActiveStatus,
    setPaymentModeActiveStatus,
    setReorderPolicyActiveStatus,
    setSeasonActiveStatus,
    updateCategoryRecord,
    updatePaymentModeRecord,
    updateReorderPolicyRecord,
    updateSeasonRecord,
    updateStoreConfigRecord
} from "./repository.js";
import { DEFAULT_REORDER_POLICY_SEED } from "../../config/reorder-policy-config.js";
import { MONETA_STORE_CONFIG_SEED } from "../../config/store-config.js";
import {
    buildReorderPolicyExplanation,
    buildReorderPolicyScopeSummary,
    DEFAULT_REORDER_POLICY,
    isSystemDefaultReorderPolicy,
    REORDER_POLICY_SCOPE_TYPES,
    resolveSystemDefaultPolicy,
    ZERO_DEMAND_BEHAVIORS
} from "../../shared/reorder-policy.js";
import { getStoreConfigByDocId } from "../../shared/store-config.js";

const SEASON_STATUSES = ["Upcoming", "Active", "Archived"];

function normalizeText(value) {
    return (value || "").trim();
}

function findDuplicate(records, field, value, docId) {
    return (records || []).find(record =>
        normalizeText(record[field]).toLowerCase() === normalizeText(value).toLowerCase()
        && record.id !== docId
    ) || null;
}

function parseDateInput(value, label) {
    const input = normalizeText(value);

    if (!input) {
        throw new Error(`${label} is required.`);
    }

    const date = new Date(`${input}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        throw new Error(`${label} is invalid.`);
    }

    return date;
}

function normalizeInteger(value, fallback = 0, minimum = 0) {
    const parsed = Math.floor(Number(value));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(minimum, parsed);
}

function normalizeBoolean(value, fallback = false) {
    if (value === true || value === "true") return true;
    if (value === false || value === "false") return false;
    return fallback;
}

function buildNameMap(rows = [], labelField) {
    return new Map((rows || []).map(row => [row.id, normalizeText(row[labelField])]));
}

function buildPolicyContext(existingCategories = [], existingProducts = []) {
    return {
        categoryNameById: buildNameMap(existingCategories, "categoryName"),
        productNameById: buildNameMap(existingProducts, "itemName"),
        productCategoryIdById: new Map((existingProducts || []).map(row => [row.id, normalizeText(row.categoryId)]))
    };
}

async function ensureCategoryIsEditable(docId, existingCategories = []) {
    const currentRecord = (existingCategories || []).find(record => record.id === docId) || null;

    if (!currentRecord) {
        throw new Error("Category record could not be found.");
    }

    const usage = await getCategoryUsageStatus(docId);
    if (usage.isUsed) {
        throw new Error(usage.message);
    }

    return currentRecord;
}

async function ensureSeasonIsEditable(docId, existingSeasons = []) {
    const currentRecord = (existingSeasons || []).find(record => record.id === docId) || null;

    if (!currentRecord) {
        throw new Error("Season record could not be found.");
    }

    const usage = await getSeasonUsageStatus(docId);
    if (usage.isUsed) {
        throw new Error(usage.message);
    }

    return currentRecord;
}

async function ensurePaymentModeIsEditable(docId, existingPaymentModes = []) {
    const currentRecord = (existingPaymentModes || []).find(record => record.id === docId) || null;

    if (!currentRecord) {
        throw new Error("Payment mode record could not be found.");
    }

    const usage = await getPaymentModeUsageStatus(currentRecord.paymentMode);
    if (usage.isUsed) {
        throw new Error(usage.message);
    }

    return currentRecord;
}

export function validateCategoryPayload(payload, existingCategories = []) {
    const docId = normalizeText(payload.docId);
    const categoryName = normalizeText(payload.categoryName);

    if (!categoryName) {
        throw new Error("Category name is required.");
    }

    if (categoryName.length < 2) {
        throw new Error("Category name must be at least 2 characters long.");
    }

    if (categoryName.length > 50) {
        throw new Error("Category name must be 50 characters or less.");
    }

    const duplicate = findDuplicate(existingCategories, "categoryName", categoryName, docId);
    if (duplicate) {
        throw new Error(`Category "${duplicate.categoryName}" already exists.`);
    }

    return { docId, categoryName };
}

export async function saveCategory(payload, user, existingCategories = []) {
    if (!user) {
        throw new Error("You must be logged in to save a category.");
    }

    const { docId, categoryName } = validateCategoryPayload(payload, existingCategories);

    if (docId) {
        await ensureCategoryIsEditable(docId, existingCategories);
        await updateCategoryRecord(docId, { categoryName }, user);
        return { mode: "update" };
    }

    await createCategoryRecord({ categoryName }, user);
    return { mode: "create" };
}

export async function toggleCategoryStatus(docId, nextValue, user) {
    if (!user) {
        throw new Error("You must be logged in to update category status.");
    }

    if (!docId) {
        throw new Error("Category record could not be found.");
    }

    if (!nextValue) {
        const usage = await getCategoryUsageStatus(docId);
        if (usage.isUsed) {
            throw new Error(usage.message);
        }
    }

    await setCategoryActiveStatus(docId, nextValue, user);
}

export function validatePaymentModePayload(payload, existingPaymentModes = []) {
    const docId = normalizeText(payload.docId);
    const paymentMode = normalizeText(payload.paymentMode);

    if (!paymentMode) {
        throw new Error("Payment mode name is required.");
    }

    if (paymentMode.length < 2) {
        throw new Error("Payment mode name must be at least 2 characters long.");
    }

    if (paymentMode.length > 30) {
        throw new Error("Payment mode name must be 30 characters or less.");
    }

    const duplicate = findDuplicate(existingPaymentModes, "paymentMode", paymentMode, docId);
    if (duplicate) {
        throw new Error(`Payment mode "${duplicate.paymentMode}" already exists.`);
    }

    return { docId, paymentMode };
}

export async function savePaymentMode(payload, user, existingPaymentModes = []) {
    if (!user) {
        throw new Error("You must be logged in to save a payment mode.");
    }

    const { docId, paymentMode } = validatePaymentModePayload(payload, existingPaymentModes);

    if (docId) {
        await ensurePaymentModeIsEditable(docId, existingPaymentModes);
        await updatePaymentModeRecord(docId, { paymentMode }, user);
        return { mode: "update" };
    }

    await createPaymentModeRecord({ paymentMode }, user);
    return { mode: "create" };
}

export async function togglePaymentModeStatus(docId, nextValue, user, paymentModeName = "") {
    if (!user) {
        throw new Error("You must be logged in to update payment mode status.");
    }

    if (!docId) {
        throw new Error("Payment mode record could not be found.");
    }

    if (!nextValue) {
        if (!normalizeText(paymentModeName)) {
            throw new Error("Payment mode name is required to validate deactivation.");
        }

        const usage = await getPaymentModeUsageStatus(paymentModeName);
        if (usage.isUsed) {
            throw new Error(usage.message);
        }
    }

    await setPaymentModeActiveStatus(docId, nextValue, user);
}

export function validateSeasonPayload(payload, existingSeasons = []) {
    const docId = normalizeText(payload.docId);
    const seasonName = normalizeText(payload.seasonName);
    const status = SEASON_STATUSES.includes(normalizeText(payload.status))
        ? normalizeText(payload.status)
        : "Upcoming";
    const startDate = parseDateInput(payload.startDate, "Start date");
    const endDate = parseDateInput(payload.endDate, "End date");

    if (!seasonName) {
        throw new Error("Season name is required.");
    }

    if (seasonName.length < 3) {
        throw new Error("Season name must be at least 3 characters long.");
    }

    if (seasonName.length > 60) {
        throw new Error("Season name must be 60 characters or less.");
    }

    if (startDate.getTime() > endDate.getTime()) {
        throw new Error("Start date must be before or equal to the end date.");
    }

    const duplicate = findDuplicate(existingSeasons, "seasonName", seasonName, docId);
    if (duplicate) {
        throw new Error(`Season "${duplicate.seasonName}" already exists.`);
    }

    return {
        docId,
        seasonName,
        startDate,
        endDate,
        status
    };
}

export async function saveSeason(payload, user, existingSeasons = []) {
    if (!user) {
        throw new Error("You must be logged in to save a season.");
    }

    const { docId, ...seasonData } = validateSeasonPayload(payload, existingSeasons);

    if (docId) {
        await ensureSeasonIsEditable(docId, existingSeasons);
        await updateSeasonRecord(docId, seasonData, user);
        return { mode: "update" };
    }

    await createSeasonRecord(seasonData, user);
    return { mode: "create" };
}

export async function toggleSeasonStatus(docId, nextValue, user) {
    if (!user) {
        throw new Error("You must be logged in to update season status.");
    }

    if (!docId) {
        throw new Error("Season record could not be found.");
    }

    if (!nextValue) {
        const usage = await getSeasonUsageStatus(docId);
        if (usage.isUsed) {
            throw new Error(usage.message);
        }
    }

    await setSeasonActiveStatus(docId, nextValue, user);
}

function countActiveGlobalPolicies(policies = [], excludeDocId = "") {
    return (policies || []).filter(policy =>
        policy?.isActive
        && policy.scopeType === "global"
        && policy.id !== excludeDocId
    ).length;
}

function findExistingPolicy(existingPolicies = [], docId = "") {
    return (existingPolicies || []).find(policy => policy?.id === docId) || null;
}

function getPolicyUpdatedTime(policy = {}) {
    const candidates = [policy.updatedOn, policy.createdOn];

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

function findLatestGlobalPolicy(existingPolicies = []) {
    return (existingPolicies || [])
        .filter(policy => normalizeText(policy.scopeType) === "global")
        .slice()
        .sort((left, right) => getPolicyUpdatedTime(right) - getPolicyUpdatedTime(left))[0] || null;
}

function findDuplicatePolicyName(existingPolicies = [], policyName = "", docId = "") {
    return (existingPolicies || []).find(policy =>
        normalizeText(policy.policyName).toLowerCase() === normalizeText(policyName).toLowerCase()
        && policy.id !== docId
    ) || null;
}

function findActiveScopeConflict(existingPolicies = [], candidate = {}, docId = "") {
    return (existingPolicies || []).find(policy => {
        if (!policy?.isActive || policy.id === docId) return false;
        if (normalizeText(policy.scopeType) !== normalizeText(candidate.scopeType)) return false;

        if (candidate.scopeType === "category") {
            return normalizeText(policy.categoryId) === normalizeText(candidate.categoryId);
        }

        if (candidate.scopeType === "product") {
            return normalizeText(policy.productId) === normalizeText(candidate.productId);
        }

        return candidate.scopeType === "global";
    }) || null;
}

export function validateReorderPolicyPayload(payload, existingPolicies = [], existingCategories = [], existingProducts = []) {
    const docId = normalizeText(payload.docId);
    const existingRecord = findExistingPolicy(existingPolicies, docId);
    const policyName = normalizeText(payload.policyName);
    const scopeType = REORDER_POLICY_SCOPE_TYPES.includes(normalizeText(payload.scopeType))
        ? normalizeText(payload.scopeType)
        : DEFAULT_REORDER_POLICY.scopeType;
    const isActive = payload.isActive === false || payload.isActive === "false"
        ? false
        : Boolean(payload.isActive ?? DEFAULT_REORDER_POLICY.isActive);
    const shortWindowDays = normalizeInteger(payload.shortWindowDays, DEFAULT_REORDER_POLICY.shortWindowDays, 1);
    const shortWindowWeight = normalizeInteger(payload.shortWindowWeight, DEFAULT_REORDER_POLICY.shortWindowWeight, 0);
    const longWindowDays = normalizeInteger(payload.longWindowDays, DEFAULT_REORDER_POLICY.longWindowDays, 1);
    const longWindowWeight = normalizeInteger(payload.longWindowWeight, DEFAULT_REORDER_POLICY.longWindowWeight, 0);
    const leadTimeDays = normalizeInteger(payload.leadTimeDays, DEFAULT_REORDER_POLICY.leadTimeDays, 0);
    const safetyDays = normalizeInteger(payload.safetyDays, DEFAULT_REORDER_POLICY.safetyDays, 0);
    const targetCoverDays = normalizeInteger(payload.targetCoverDays, DEFAULT_REORDER_POLICY.targetCoverDays, 1);
    const lowHistoryUnitThreshold = normalizeInteger(payload.lowHistoryUnitThreshold, DEFAULT_REORDER_POLICY.lowHistoryUnitThreshold, 0);
    const minimumOrderQty = normalizeInteger(payload.minimumOrderQty, DEFAULT_REORDER_POLICY.minimumOrderQty, 0);
    const packSize = normalizeInteger(payload.packSize, DEFAULT_REORDER_POLICY.packSize, 1);
    const zeroDemandBehavior = ZERO_DEMAND_BEHAVIORS.includes(normalizeText(payload.zeroDemandBehavior))
        ? normalizeText(payload.zeroDemandBehavior)
        : DEFAULT_REORDER_POLICY.zeroDemandBehavior;

    if (!policyName) {
        throw new Error("Policy name is required.");
    }

    if (policyName.length < 3) {
        throw new Error("Policy name must be at least 3 characters long.");
    }

    if (policyName.length > 80) {
        throw new Error("Policy name must be 80 characters or less.");
    }

    if ((shortWindowWeight + longWindowWeight) !== 100) {
        throw new Error("Short-window and long-window weights must add up to 100%.");
    }

    if (shortWindowDays > longWindowDays) {
        throw new Error("Short demand window cannot be longer than the long demand window.");
    }

    if (targetCoverDays < (leadTimeDays + safetyDays)) {
        throw new Error("Target cover days must be at least as large as lead time plus safety days.");
    }

    const duplicateName = findDuplicatePolicyName(existingPolicies, policyName, docId);
    if (duplicateName) {
        throw new Error(`Policy "${duplicateName.policyName}" already exists.`);
    }

    if (isSystemDefaultReorderPolicy(existingRecord) && scopeType !== "global") {
        throw new Error("The Moneta default rule must stay as a global policy.");
    }

    let categoryId = "";
    let productId = "";
    const context = buildPolicyContext(existingCategories, existingProducts);
    const systemDefaultPolicy = resolveSystemDefaultPolicy(existingPolicies, { activeOnly: false });
    const shouldBecomeSystemDefault = scopeType === "global" && (!systemDefaultPolicy || systemDefaultPolicy.id === docId);
    const isSystemDefault = isSystemDefaultReorderPolicy(existingRecord) || shouldBecomeSystemDefault;

    if (scopeType === "global" && systemDefaultPolicy && systemDefaultPolicy.id !== docId) {
        throw new Error("Moneta already has a protected global default rule. Create a category or product override instead.");
    }

    if (scopeType === "category") {
        categoryId = normalizeText(payload.categoryId);
        if (!categoryId) {
            throw new Error("Select a category for category-scoped policy.");
        }

        if (!context.categoryNameById.has(categoryId)) {
            throw new Error("Selected category could not be found.");
        }
    }

    if (scopeType === "product") {
        productId = normalizeText(payload.productId);
        if (!productId) {
            throw new Error("Select a product for product-scoped policy.");
        }

        if (!context.productNameById.has(productId)) {
            throw new Error("Selected product could not be found.");
        }

        const selectedCategoryId = normalizeText(payload.categoryId);
        const productCategoryId = normalizeText(context.productCategoryIdById.get(productId));

        if (!productCategoryId) {
            throw new Error("Selected product is not assigned to a category yet.");
        }

        if (selectedCategoryId && selectedCategoryId !== productCategoryId) {
            throw new Error("Selected product does not belong to the chosen category.");
        }

        categoryId = productCategoryId;
    }

    const policyRecord = {
        policyName,
        scopeType,
        categoryId,
        categoryName: categoryId ? normalizeText(context.categoryNameById.get(categoryId)) : "",
        productId,
        productName: productId ? normalizeText(context.productNameById.get(productId)) : "",
        shortWindowDays,
        shortWindowWeight,
        longWindowDays,
        longWindowWeight,
        leadTimeDays,
        safetyDays,
        targetCoverDays,
        lowHistoryUnitThreshold,
        zeroDemandBehavior,
        minimumOrderQty,
        packSize,
        isActive: isSystemDefault ? true : isActive,
        isSystemDefault
    };

    if (isActive) {
        const conflict = findActiveScopeConflict(existingPolicies, policyRecord, docId);
        if (conflict) {
            throw new Error(`Active policy "${conflict.policyName}" already covers ${buildReorderPolicyScopeSummary(conflict, context)}. Deactivate it first or edit that policy instead.`);
        }
    }

    const scopeSummary = buildReorderPolicyScopeSummary(policyRecord, context);
    const ruleExplanation = buildReorderPolicyExplanation(policyRecord, context);

    return {
        docId,
        ...policyRecord,
        scopeSummary,
        ruleExplanation
    };
}

export async function saveReorderPolicy(payload, user, existingPolicies = [], existingCategories = [], existingProducts = []) {
    if (!user) {
        throw new Error("You must be logged in to save a reorder policy.");
    }

    const { docId, ...policyData } = validateReorderPolicyPayload(payload, existingPolicies, existingCategories, existingProducts);

    if (policyData.isSystemDefault && !policyData.isActive) {
        throw new Error("The Moneta default rule must stay active.");
    }

    if (policyData.scopeType === "global" && !policyData.isActive && countActiveGlobalPolicies(existingPolicies, docId) === 0) {
        throw new Error("Moneta must always keep one active global reorder policy.");
    }

    if (docId) {
        await updateReorderPolicyRecord(docId, policyData, user);
        return { mode: "update" };
    }

    if (policyData.scopeType !== "global" && countActiveGlobalPolicies(existingPolicies) === 0) {
        throw new Error("Create the active Moneta default rule before adding narrower overrides.");
    }

    await createReorderPolicyRecord(policyData, user);
    return { mode: "create" };
}

export async function toggleReorderPolicyStatus(docId, nextValue, user, existingPolicies = []) {
    if (!user) {
        throw new Error("You must be logged in to update reorder policy status.");
    }

    if (!docId) {
        throw new Error("Reorder policy record could not be found.");
    }

    const record = (existingPolicies || []).find(policy => policy.id === docId) || null;
    if (!record) {
        throw new Error("Reorder policy record could not be found.");
    }

    if (!nextValue && isSystemDefaultReorderPolicy(record)) {
        throw new Error("The Moneta default rule can be updated, but it cannot be deactivated.");
    }

    if (!nextValue && record.scopeType === "global" && countActiveGlobalPolicies(existingPolicies, docId) === 0) {
        throw new Error("Moneta must always keep one active global reorder policy.");
    }

    if (nextValue) {
        const conflict = findActiveScopeConflict(existingPolicies, record, docId);
        if (conflict) {
            throw new Error(`Active policy "${conflict.policyName}" already covers ${buildReorderPolicyScopeSummary(conflict, buildPolicyContext())}. Deactivate it first or edit that policy instead.`);
        }
    }

    await setReorderPolicyActiveStatus(docId, nextValue, user);
}

export async function ensureSystemDefaultReorderPolicy(user, existingPolicies = [], existingCategories = [], existingProducts = []) {
    if (!user || user.role !== "admin") {
        return { mode: "skip" };
    }

    if ((existingPolicies || []).some(policy => isSystemDefaultReorderPolicy(policy))) {
        return { mode: "existing" };
    }

    const latestGlobalPolicy = findLatestGlobalPolicy(existingPolicies);
    if (latestGlobalPolicy) {
        await updateReorderPolicyRecord(latestGlobalPolicy.id, {
            isSystemDefault: true,
            isActive: true
        }, user);
        return { mode: "promote", policyId: latestGlobalPolicy.id };
    }

    const { docId, ...policyData } = validateReorderPolicyPayload(
        DEFAULT_REORDER_POLICY_SEED,
        existingPolicies,
        existingCategories,
        existingProducts
    );

    await createReorderPolicyRecord(policyData, user);
    return { mode: "create", policyId: docId || "" };
}

export function validateStoreConfigPayload(payload, existingStoreConfigs = []) {
    const docId = normalizeText(payload.docId);
    const existingRecord = getStoreConfigByDocId(docId, existingStoreConfigs);

    if (!docId || !existingRecord) {
        throw new Error("Store configuration record could not be found.");
    }

    const companyName = normalizeText(payload.companyName);
    const addressLine1 = normalizeText(payload.addressLine1);
    const addressLine2 = normalizeText(payload.addressLine2);
    const city = normalizeText(payload.city);
    const state = normalizeText(payload.state);
    const pincode = normalizeText(payload.pincode);
    const stateCode = normalizeText(payload.stateCode);
    const taxId = normalizeText(payload.taxId);
    const email = normalizeText(payload.email);
    const salePrefix = normalizeText(payload.salePrefix).toUpperCase();
    const requiresCustomerAddress = normalizeBoolean(payload.requiresCustomerAddress, Boolean(existingRecord.requiresCustomerAddress));
    const terms = normalizeText(payload.terms);
    const bankName = normalizeText(payload.bankName);
    const branch = normalizeText(payload.branch);
    const accountNumber = normalizeText(payload.accountNumber);
    const ifscCode = normalizeText(payload.ifscCode).toUpperCase();
    const accountHolderName = normalizeText(payload.accountHolderName);
    const upiQRCodeUrl = normalizeText(payload.upiQRCodeUrl);
    const cgstRate = Math.max(0, Number(payload.cgstRate) || 0);
    const sgstRate = Math.max(0, Number(payload.sgstRate) || 0);

    if (!companyName) throw new Error("Company name is required.");
    if (!addressLine1) throw new Error("Address line 1 is required.");
    if (!city) throw new Error("City is required.");
    if (!state) throw new Error("State is required.");
    if (!pincode) throw new Error("Pincode is required.");
    if (!stateCode) throw new Error("State code is required.");
    if (!taxId) throw new Error("Tax / GST text is required.");
    if (!email) throw new Error("Email is required.");
    if (!salePrefix) throw new Error("Sale prefix is required.");
    if (!bankName) throw new Error("Bank name is required.");
    if (!branch) throw new Error("Branch is required.");
    if (!accountNumber) throw new Error("Account number is required.");
    if (!ifscCode) throw new Error("IFSC code is required.");
    if (!accountHolderName) throw new Error("Account holder name is required.");
    if (!upiQRCodeUrl) throw new Error("UPI QR code URL is required.");
    if (!terms) throw new Error("Invoice terms are required.");

    if (companyName.length > 80) throw new Error("Company name must be 80 characters or less.");
    if (salePrefix.length > 6) throw new Error("Sale prefix must be 6 characters or less.");
    if (stateCode.length > 4) throw new Error("State code must be 4 characters or less.");

    return {
        docId,
        companyName,
        addressLine1,
        addressLine2,
        city,
        state,
        pincode,
        stateCode,
        taxId,
        email,
        salePrefix,
        requiresCustomerAddress,
        terms,
        taxInfo: {
            cgstRate,
            sgstRate
        },
        paymentDetails: {
            bankName,
            branch,
            accountNumber,
            ifscCode,
            accountHolderName,
            upiQRCodeUrl
        }
    };
}

export async function saveStoreConfig(payload, user, existingStoreConfigs = []) {
    if (!user) {
        throw new Error("You must be logged in to save store configuration.");
    }

    const { docId, ...storeConfigData } = validateStoreConfigPayload(payload, existingStoreConfigs);
    await updateStoreConfigRecord(docId, storeConfigData, user);
    return { mode: "update" };
}

export async function ensureStoreConfigSeed(user, existingStoreConfigs = []) {
    if (!user || user.role !== "admin") {
        return { mode: "skip" };
    }

    const existingRows = Array.isArray(existingStoreConfigs) ? existingStoreConfigs : [];
    const existingDocIds = new Set(existingRows.map(row => normalizeText(row.id || row.docId)).filter(Boolean));
    const missingSeedRows = MONETA_STORE_CONFIG_SEED.filter(row => !existingDocIds.has(normalizeText(row.docId)));

    if (missingSeedRows.length === 0) {
        return { mode: "existing" };
    }

    await seedStoreConfigRecords(missingSeedRows, user);
    return { mode: existingRows.length === 0 ? "create" : "repair" };
}

export async function getAdminEditRestriction(entity, record) {
    if (!record?.id) {
        return {
            isLocked: true,
            message: "Admin record could not be found."
        };
    }

    if (entity === "categories") {
        const usage = await getCategoryUsageStatus(record.id);
        return {
            isLocked: usage.isUsed,
            message: usage.message || ""
        };
    }

    if (entity === "seasons") {
        const usage = await getSeasonUsageStatus(record.id);
        return {
            isLocked: usage.isUsed,
            message: usage.message || ""
        };
    }

    if (entity === "paymentModes") {
        const usage = await getPaymentModeUsageStatus(record.paymentMode);
        return {
            isLocked: usage.isUsed,
            message: usage.message || ""
        };
    }

    if (entity === "reorderPolicies") {
        return {
            isLocked: false,
            message: ""
        };
    }

    if (entity === "storeConfigs") {
        return {
            isLocked: false,
            message: ""
        };
    }

    return {
        isLocked: false,
        message: ""
    };
}
