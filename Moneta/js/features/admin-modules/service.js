import {
    createCategoryRecord,
    createChurchMemberRecord,
    createPaymentModeRecord,
    createReorderPolicyRecord,
    getOnlineCatalogueRecord,
    getSalesCatalogueItemsForCatalogueHeaders,
    getProductPriceChangeReviewRecord,
    seedPricingPolicyRecords,
    createSeasonRecord,
    saveOnlineCatalogueRecord,
    seedStoreConfigRecords,
    seedSystemSettingsRecords,
    getCategoryUsageStatus,
    getPaymentModeUsageStatus,
    getSeasonUsageStatus,
    setCategoryActiveStatus,
    setChurchMemberActiveStatus,
    setPaymentModeActiveStatus,
    setReorderPolicyActiveStatus,
    setSeasonActiveStatus,
    updateCategoryRecord,
    updateChurchMemberRecord,
    updatePaymentModeRecord,
    updateProductPriceChangeReviewRecord,
    updatePricingPolicyRecord,
    updateReorderPolicyRecord,
    updateSeasonRecord,
    updateStoreConfigRecord,
    updateSystemSettingsRecord
} from "./repository.js";
import { syncSalesCatalogueItemsForApprovedProduct } from "../sales-catalogues/service.js";
import { clearSalesCatalogueOnlinePublishPendingItems } from "../sales-catalogues/repository.js";
import { DEFAULT_PRICING_POLICY_SEED } from "../../config/pricing-policy-config.js";
import { DEFAULT_REORDER_POLICY_SEED } from "../../config/reorder-policy-config.js";
import { MONETA_STORE_CONFIG_SEED } from "../../config/store-config.js";
import { MONETA_SYSTEM_SETTINGS_SEED } from "../../config/system-settings-config.js";
import { COLLECTIONS } from "../../config/collections.js";
import {
    buildPricingPolicyExplanation,
    COSTING_METHODS,
    DEFAULT_PRICING_POLICY,
    isSystemDefaultPricingPolicy,
    roundCurrency,
    resolveSystemDefaultPricingPolicy,
    SELLING_PRICE_BEHAVIORS
} from "../../shared/pricing-policy.js";
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
import { getLeadWorkflowSettings, getSystemSettingByDocId } from "../../shared/system-settings.js";

const SEASON_STATUSES = ["Upcoming", "Active", "Archived"];
export const ONLINE_CATALOGUE_DOC_ID = "pickupPortal";
export const DEFAULT_ONLINE_CATALOGUE_CONFIG = {
    id: ONLINE_CATALOGUE_DOC_ID,
    catalogueName: "Church Pickup Requests",
    currency: "INR",
    pickupNotice: "Submit a pickup request and wait for confirmation from the church store team before collection.",
    pickupLocation: "Church Resource Centre",
    contactPhone: "",
    requestLeadTimeHours: 24,
    version: 1,
    selectedItems: []
};

function normalizeText(value) {
    return (value || "").trim();
}

function normalizeUpperText(value, fallback = "") {
    const normalized = normalizeText(value).toUpperCase();
    return normalized || fallback;
}

function getDb() {
    return firebase.firestore();
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

function normalizeDecimal(value, fallback = 0, minimum = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(minimum, Number(parsed.toFixed(2)));
}

export function buildOnlineCatalogueItemKey(entry = {}) {
    const sourceCatalogueId = normalizeText(entry.sourceCatalogueId || entry.catalogueId);
    const sourceCatalogueItemId = normalizeText(entry.sourceCatalogueItemId || entry.id);
    return sourceCatalogueId && sourceCatalogueItemId
        ? `${sourceCatalogueId}::${sourceCatalogueItemId}`
        : "";
}

function buildOnlineCatalogueImageLabel(name = "") {
    const words = normalizeText(name).split(/\s+/).filter(Boolean);
    if (!words.length) return "Item";
    return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join("");
}

function normalizeOnlineCatalogueSelectionEntries(items = []) {
    const seenKeys = new Set();

    return (items || [])
        .map((item, index) => {
            const sourceCatalogueId = normalizeText(item.sourceCatalogueId || item.catalogueId);
            const sourceCatalogueItemId = normalizeText(item.sourceCatalogueItemId || item.id);
            const key = buildOnlineCatalogueItemKey({ sourceCatalogueId, sourceCatalogueItemId });

            if (!key || seenKeys.has(key)) {
                return null;
            }

            seenKeys.add(key);

            return {
                sourceCatalogueId,
                sourceCatalogueItemId,
                sortOrder: normalizeInteger(item.sortOrder, index + 1, 1)
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.sortOrder - right.sortOrder || buildOnlineCatalogueItemKey(left).localeCompare(buildOnlineCatalogueItemKey(right)));
}

function buildOnlineCataloguePendingReviewKey(entry = {}) {
    const sourceCatalogueId = normalizeText(entry.sourceCatalogueId || entry.catalogueId);
    const sourceCatalogueItemId = normalizeText(entry.sourceCatalogueItemId || entry.itemId || entry.id);
    return sourceCatalogueId && sourceCatalogueItemId
        ? `${sourceCatalogueId}::${sourceCatalogueItemId}`
        : "";
}

function getOnlineCatalogueTrackedCatalogueIds(config = {}) {
    return [...new Set(
        (normalizeOnlineCatalogueConfig(config).selectedItems || [])
            .map(item => normalizeText(item.sourceCatalogueId || item.catalogueId))
            .filter(Boolean)
    )];
}

function getOnlineCataloguePendingPublishReviewItems(config = {}, salesCatalogueHeaders = []) {
    const trackedCatalogueIds = new Set(getOnlineCatalogueTrackedCatalogueIds(config));
    const seenKeys = new Set();

    return (salesCatalogueHeaders || []).flatMap(header => {
        const catalogueId = normalizeText(header?.id);
        if (!catalogueId || !trackedCatalogueIds.has(catalogueId)) {
            return [];
        }

        return (header.onlinePublishPendingItems || []).map(entry => ({
            sourceCatalogueId: normalizeText(entry.sourceCatalogueId || catalogueId),
            sourceCatalogueName: normalizeText(entry.sourceCatalogueName || header.catalogueName || header.catalogueId || "Sales Catalogue"),
            sourceCatalogueItemId: normalizeText(entry.sourceCatalogueItemId || entry.itemId || entry.id),
            productId: normalizeText(entry.productId),
            productName: normalizeText(entry.productName || "Untitled Product"),
            categoryName: normalizeText(entry.categoryName || "Uncategorized"),
            detectedOn: entry.detectedOn || null
        }));
    }).filter(entry => {
        const key = buildOnlineCataloguePendingReviewKey(entry);
        if (!key || seenKeys.has(key)) {
            return false;
        }

        seenKeys.add(key);
        return true;
    });
}

function normalizeOnlineCatalogueComparableConfig(record = {}) {
    return {
        catalogueName: normalizeText(record.catalogueName),
        currency: normalizeUpperText(record.currency, DEFAULT_ONLINE_CATALOGUE_CONFIG.currency),
        pickupNotice: normalizeText(record.pickupNotice),
        pickupLocation: normalizeText(record.pickupLocation),
        contactPhone: normalizeText(record.contactPhone),
        requestLeadTimeHours: normalizeInteger(record.requestLeadTimeHours, DEFAULT_ONLINE_CATALOGUE_CONFIG.requestLeadTimeHours, 0),
        selectedItems: normalizeOnlineCatalogueSelectionEntries(record.selectedItems)
    };
}

export function normalizeOnlineCatalogueConfig(record = {}) {
    const normalized = normalizeOnlineCatalogueComparableConfig(record);

    return {
        ...DEFAULT_ONLINE_CATALOGUE_CONFIG,
        ...normalized,
        id: normalizeText(record.id || record.docId || ONLINE_CATALOGUE_DOC_ID) || ONLINE_CATALOGUE_DOC_ID,
        catalogueCode: normalizeText(record.catalogueCode),
        version: Math.max(1, normalizeInteger(record.version, DEFAULT_ONLINE_CATALOGUE_CONFIG.version, 1)),
        createdBy: normalizeText(record.createdBy),
        createdOn: record.createdOn || null,
        updatedBy: normalizeText(record.updatedBy),
        updatedOn: record.updatedOn || null
    };
}

function validateOnlineCataloguePayload(payload = {}) {
    const normalized = normalizeOnlineCatalogueComparableConfig(payload);

    if (!normalized.catalogueName) {
        throw new Error("Online catalogue name is required.");
    }

    if (!normalized.pickupNotice) {
        throw new Error("Pickup notice is required.");
    }

    if (!normalized.pickupLocation) {
        throw new Error("Pickup location is required.");
    }

    if (!normalized.contactPhone) {
        throw new Error("Contact phone is required.");
    }

    if (!normalized.selectedItems.length) {
        throw new Error("Select at least one Sales Catalogue item for the online catalogue.");
    }

    return normalized;
}

export async function loadOnlineCatalogueWorkspace(masterData = {}) {
    const existingRecord = await getOnlineCatalogueRecord(ONLINE_CATALOGUE_DOC_ID);
    const config = existingRecord
        ? normalizeOnlineCatalogueConfig(existingRecord)
        : { ...DEFAULT_ONLINE_CATALOGUE_CONFIG };

    const selectedCatalogueIds = new Set((config.selectedItems || []).map(item => item.sourceCatalogueId).filter(Boolean));
    const headersToFetch = (masterData.salesCatalogues || [])
        .filter(header => header?.isActive || selectedCatalogueIds.has(normalizeText(header?.id)))
        .map(header => ({
            id: normalizeText(header.id),
            catalogueName: normalizeText(header.catalogueName || header.catalogueId || "Sales Catalogue"),
            isActive: header.isActive !== false
        }))
        .filter(header => header.id);

    const sourceItems = await getSalesCatalogueItemsForCatalogueHeaders(headersToFetch);

    return {
        config,
        sourceItems: (sourceItems || []).slice().sort((left, right) => {
            const catalogueCompare = normalizeText(left.sourceCatalogueName).localeCompare(normalizeText(right.sourceCatalogueName));
            if (catalogueCompare !== 0) return catalogueCompare;
            return normalizeText(left.productName).localeCompare(normalizeText(right.productName));
        })
    };
}

export async function saveOnlineCatalogueWorkspace(payload, user, masterData = {}, existingConfig = null) {
    if (!user) {
        throw new Error("You must be logged in to save the online catalogue.");
    }

    const normalized = validateOnlineCataloguePayload(payload);
    const currentConfig = existingConfig ? normalizeOnlineCatalogueConfig(existingConfig) : normalizeOnlineCatalogueConfig(await getOnlineCatalogueRecord(ONLINE_CATALOGUE_DOC_ID) || {});
    const currentComparable = normalizeOnlineCatalogueComparableConfig(currentConfig);
    const hasChanges = JSON.stringify(normalized) !== JSON.stringify(currentComparable);
    const hasPendingReviewItems = getOnlineCataloguePendingPublishReviewItems(currentConfig, masterData.salesCatalogues || []).length > 0;

    if (!hasChanges && !hasPendingReviewItems && currentConfig?.updatedOn) {
        return {
            mode: "noop",
            config: currentConfig
        };
    }

    const savedConfig = normalizeOnlineCatalogueConfig(await saveOnlineCatalogueRecord(
        ONLINE_CATALOGUE_DOC_ID,
        {
            ...normalized,
            version: hasChanges
                ? Math.max(1, normalizeInteger(currentConfig.version, 1, 1) + 1)
                : Math.max(1, normalizeInteger(currentConfig.version, 1, 1)),
            sourceType: "sales-catalogue",
            portalType: "pickup-requests"
        },
        user,
        currentConfig?.updatedOn ? currentConfig : null
    ));

    const catalogueIdsToClear = [...new Set([
        ...getOnlineCatalogueTrackedCatalogueIds(currentConfig),
        ...getOnlineCatalogueTrackedCatalogueIds(savedConfig)
    ])];
    if (catalogueIdsToClear.length) {
        await clearSalesCatalogueOnlinePublishPendingItems(catalogueIdsToClear, user);
    }

    return {
        mode: currentConfig?.updatedOn ? "update" : "create",
        config: savedConfig
    };
}

export function buildOnlineCatalogueJsonSnapshot(config = {}, sourceItems = []) {
    const normalizedConfig = normalizeOnlineCatalogueConfig(config);
    const sourceMap = new Map((sourceItems || []).map(item => [buildOnlineCatalogueItemKey(item), item]));
    const missingItems = normalizedConfig.selectedItems.filter(item => !sourceMap.has(buildOnlineCatalogueItemKey(item)));

    if (missingItems.length) {
        throw new Error("Some saved online catalogue selections no longer exist in Sales Catalogue. Review the selection and save again before generating JSON.");
    }

    const selectedRows = normalizedConfig.selectedItems
        .map(selection => sourceMap.get(buildOnlineCatalogueItemKey(selection)))
        .filter(Boolean);

    const categories = Array.from(new Map(
        selectedRows.map(row => [
            normalizeText(row.categoryId || "uncategorized"),
            {
                id: normalizeText(row.categoryId || "uncategorized"),
                name: normalizeText(row.categoryName || "Uncategorized")
            }
        ])
    ).values()).sort((left, right) => left.name.localeCompare(right.name));

    const generatedAt = new Date().toISOString();

    const items = selectedRows.map((row, index) => ({
        id: `${normalizeText(row.sourceCatalogueId || row.catalogueId)}__${normalizeText(row.id)}`,
        sourceCatalogueId: normalizeText(row.sourceCatalogueId || row.catalogueId),
        sourceCatalogueName: normalizeText(row.sourceCatalogueName || "Sales Catalogue"),
        sourceCatalogueItemId: normalizeText(row.id),
        productId: normalizeText(row.productId),
        itemId: normalizeText(row.itemId),
        name: normalizeText(row.productName || "Untitled Product"),
        categoryId: normalizeText(row.categoryId || "uncategorized"),
        categoryName: normalizeText(row.categoryName || "Uncategorized"),
        description: "",
        price: roundCurrency(normalizeDecimal(row.sellingPrice, 0, 0)),
        unitLabel: "each",
        imageLabel: buildOnlineCatalogueImageLabel(row.productName || row.itemId || `Item ${index + 1}`),
        isAvailable: true
    }));

    return {
        fileName: "catalogue.json",
        payload: {
            catalogueId: normalizedConfig.id || ONLINE_CATALOGUE_DOC_ID,
            catalogueName: normalizedConfig.catalogueName,
            currency: normalizedConfig.currency,
            publishedAt: generatedAt,
            generatedAt,
            version: Math.max(1, normalizeInteger(normalizedConfig.version, 1, 1)),
            pickupNotice: normalizedConfig.pickupNotice,
            pickupLocation: normalizedConfig.pickupLocation,
            contactPhone: normalizedConfig.contactPhone,
            requestLeadTimeHours: normalizedConfig.requestLeadTimeHours,
            categories,
            items
        }
    };
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

function findDuplicateChurchMember(existingChurchMembers = [], field, value, docId = "") {
    const normalizedValue = normalizeText(value).toLowerCase();
    if (!normalizedValue) return null;

    return (existingChurchMembers || []).find(record =>
        normalizeText(record[field]).toLowerCase() === normalizedValue
        && record.id !== docId
    ) || null;
}

export function validateChurchMemberPayload(payload, existingChurchMembers = []) {
    const docId = normalizeText(payload.docId);
    const fullName = normalizeText(payload.fullName);
    const phone = normalizeText(payload.phone);
    const email = normalizeText(payload.email).toLowerCase();
    const canHandleEnquiries = normalizeBoolean(payload.canHandleEnquiries, true);

    if (!fullName) {
        throw new Error("Member name is required.");
    }

    if (fullName.length < 2) {
        throw new Error("Member name must be at least 2 characters long.");
    }

    if (fullName.length > 80) {
        throw new Error("Member name must be 80 characters or less.");
    }

    if (!phone && !email) {
        throw new Error("Provide at least a phone number or email address.");
    }

    if (phone.length > 25) {
        throw new Error("Phone number must be 25 characters or less.");
    }

    if (email.length > 120) {
        throw new Error("Email address must be 120 characters or less.");
    }

    const duplicatePhone = phone ? findDuplicateChurchMember(existingChurchMembers, "phone", phone, docId) : null;
    if (duplicatePhone) {
        throw new Error(`Phone number is already assigned to ${duplicatePhone.fullName || "another church member"}.`);
    }

    const duplicateEmail = email ? findDuplicateChurchMember(existingChurchMembers, "email", email, docId) : null;
    if (duplicateEmail) {
        throw new Error(`Email address is already assigned to ${duplicateEmail.fullName || "another church member"}.`);
    }

    return {
        docId,
        fullName,
        phone,
        email,
        canHandleEnquiries
    };
}

export async function saveChurchMember(payload, user, existingChurchMembers = []) {
    if (!user) {
        throw new Error("You must be logged in to save a church member.");
    }

    const { docId, ...churchMemberData } = validateChurchMemberPayload(payload, existingChurchMembers);

    if (docId) {
        await updateChurchMemberRecord(docId, churchMemberData, user);
        return { mode: "update" };
    }

    await createChurchMemberRecord(churchMemberData, user);
    return { mode: "create" };
}

export async function toggleChurchMemberStatus(docId, nextValue, user) {
    if (!user) {
        throw new Error("You must be logged in to update church member status.");
    }

    if (!docId) {
        throw new Error("Church member record could not be found.");
    }

    await setChurchMemberActiveStatus(docId, nextValue, user);
}

export function validatePricingPolicyPayload(payload, existingPolicies = []) {
    const docId = normalizeText(payload.docId);
    const existingPolicy = (existingPolicies || []).find(policy => policy.id === docId || policy.docId === docId) || null;

    if (!docId || !existingPolicy) {
        throw new Error("Pricing policy record could not be found.");
    }

    const policyName = normalizeText(payload.policyName);
    const costingMethod = COSTING_METHODS.includes(payload.costingMethod)
        ? payload.costingMethod
        : DEFAULT_PRICING_POLICY.costingMethod;
    const sellingPriceBehavior = SELLING_PRICE_BEHAVIORS.includes(payload.sellingPriceBehavior)
        ? payload.sellingPriceBehavior
        : DEFAULT_PRICING_POLICY.sellingPriceBehavior;
    const defaultTargetMarginPercentage = normalizeDecimal(
        payload.defaultTargetMarginPercentage,
        DEFAULT_PRICING_POLICY.defaultTargetMarginPercentage,
        0
    );
    const costChangeAlertThresholdPercentage = normalizeDecimal(
        payload.costChangeAlertThresholdPercentage,
        DEFAULT_PRICING_POLICY.costChangeAlertThresholdPercentage,
        0
    );
    const allowManualCostOverride = existingPolicy.allowManualCostOverride !== undefined
        ? Boolean(existingPolicy.allowManualCostOverride)
        : DEFAULT_PRICING_POLICY.allowManualCostOverride;

    if (!policyName) {
        throw new Error("Policy name is required.");
    }

    if (policyName.length > 80) {
        throw new Error("Policy name must be 80 characters or less.");
    }

    if (defaultTargetMarginPercentage > 500) {
        throw new Error("Default target margin must be 500% or less.");
    }

    if (costChangeAlertThresholdPercentage > 1000) {
        throw new Error("Cost change alert threshold must be 1000% or less.");
    }

    const normalized = {
        docId,
        policyName,
        costingMethod,
        sellingPriceBehavior,
        defaultTargetMarginPercentage,
        costChangeAlertThresholdPercentage,
        allowManualCostOverride,
        isActive: true,
        isSystemDefault: true
    };

    return {
        ...normalized,
        explanation: buildPricingPolicyExplanation(normalized)
    };
}

export async function savePricingPolicy(payload, user, existingPolicies = []) {
    if (!user) {
        throw new Error("You must be logged in to save the pricing policy.");
    }

    const { docId, ...policyData } = validatePricingPolicyPayload(payload, existingPolicies);
    await updatePricingPolicyRecord(docId, policyData, user);
    return { mode: "update" };
}

export async function ensurePricingPolicySeed(user, existingPolicies = []) {
    if (!user || user.role !== "admin") {
        return { mode: "skip" };
    }

    const existingRows = Array.isArray(existingPolicies) ? existingPolicies : [];
    const existingDocIds = new Set(existingRows.map(row => normalizeText(row.id || row.docId)).filter(Boolean));
    const missingSeedRows = [DEFAULT_PRICING_POLICY_SEED].filter(row => !existingDocIds.has(normalizeText(row.docId)));

    if (missingSeedRows.length === 0) {
        return { mode: "existing" };
    }

    await seedPricingPolicyRecords(missingSeedRows, user);
    return { mode: existingRows.length === 0 ? "create" : "repair" };
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

export function validateSystemSettingsPayload(payload, existingSystemSettings = []) {
    const docId = normalizeText(payload.docId);
    const existingRecord = getSystemSettingByDocId(docId, existingSystemSettings);

    if (!docId || !existingRecord) {
        throw new Error("System setup record could not be found.");
    }

    const existingWorkflow = getLeadWorkflowSettings([existingRecord]);
    const quoteSentFollowUpDays = normalizeInteger(payload.quoteSentFollowUpDays, existingWorkflow.quoteSentFollowUpDays, 0);
    const quoteAcceptedFollowUpDays = normalizeInteger(payload.quoteAcceptedFollowUpDays, existingWorkflow.quoteAcceptedFollowUpDays, 0);
    const quoteDraftValidityDays = normalizeInteger(payload.quoteDraftValidityDays, existingWorkflow.quoteDraftValidityDays, 1);
    const staleWarningDays = normalizeInteger(payload.staleWarningDays, existingWorkflow.staleWarningDays, 1);
    const staleCriticalDays = normalizeInteger(payload.staleCriticalDays, existingWorkflow.staleCriticalDays, 1);

    if (staleCriticalDays < staleWarningDays) {
        throw new Error("Stale critical days must be greater than or equal to stale warning days.");
    }

    return {
        docId,
        settingName: existingRecord.settingName || "System Setup",
        settingGroup: existingRecord.settingGroup || "General",
        description: existingRecord.description || "",
        isActive: existingRecord.isActive !== false,
        sortOrder: normalizeInteger(existingRecord.sortOrder, 999, 0),
        leadWorkflow: {
            quoteSentFollowUpDays,
            quoteAcceptedFollowUpDays,
            quoteDraftValidityDays,
            staleWarningDays,
            staleCriticalDays
        }
    };
}

export async function saveSystemSettings(payload, user, existingSystemSettings = []) {
    if (!user) {
        throw new Error("You must be logged in to save system setup.");
    }

    const { docId, ...systemSettingsData } = validateSystemSettingsPayload(payload, existingSystemSettings);
    await updateSystemSettingsRecord(docId, systemSettingsData, user);
    return { mode: "update" };
}

export async function ensureSystemSettingsSeed(user, existingSystemSettings = []) {
    if (!user || user.role !== "admin") {
        return { mode: "skip" };
    }

    const existingRows = Array.isArray(existingSystemSettings) ? existingSystemSettings : [];
    const existingDocIds = new Set(existingRows.map(row => normalizeText(row.id || row.docId)).filter(Boolean));
    const missingSeedRows = MONETA_SYSTEM_SETTINGS_SEED.filter(row => !existingDocIds.has(normalizeText(row.docId)));

    if (missingSeedRows.length === 0) {
        return { mode: "existing" };
    }

    await seedSystemSettingsRecords(missingSeedRows, user);
    return { mode: existingRows.length === 0 ? "create" : "repair" };
}

async function getProductRecord(productId, masterData = {}) {
    const fromState = (masterData.products || []).find(product => normalizeText(product.id) === normalizeText(productId)) || null;
    if (fromState) return fromState;

    const snapshot = await getDb().collection(COLLECTIONS.products).doc(productId).get();
    if (!snapshot.exists) return null;
    return { id: snapshot.id, ...snapshot.data() };
}

async function getPriceReviewRecord(reviewId, masterData = {}) {
    const fromState = (masterData.productPriceChangeReviews || []).find(review => normalizeText(review.id) === normalizeText(reviewId)) || null;
    return fromState || await getProductPriceChangeReviewRecord(reviewId);
}

export async function approveProductPriceChangeReview(reviewId, { syncActiveSalesCatalogues = false } = {}, user, masterData = {}) {
    if (!user) {
        throw new Error("You must be logged in to approve a product price review.");
    }

    const review = await getPriceReviewRecord(reviewId, masterData);
    if (!review) {
        throw new Error("Price review record could not be found.");
    }

    if (normalizeText(review.status || "pending") !== "pending") {
        throw new Error("This price review is no longer pending.");
    }

    const product = await getProductRecord(review.productId, masterData);
    if (!product) {
        throw new Error("The linked product could not be found.");
    }

    if (normalizeText(product.pricingMeta?.activePriceReviewId) !== normalizeText(review.id)) {
        throw new Error("This review is no longer the active pricing decision for the product.");
    }

    const currentPriceVersion = normalizeInteger(product.pricingMeta?.priceVersion, 0, 0);
    const currentSellingPrice = normalizeDecimal(product.sellingPrice, 0, 0);
    const approvedSellingPrice = normalizeDecimal(review.recommendedSellingPrice, currentSellingPrice, 0);
    const liveSellingPriceChanged = roundCurrency(currentSellingPrice) !== roundCurrency(approvedSellingPrice);
    const nextPricingMeta = {
        ...(product.pricingMeta || {}),
        requiresPriceReview: false,
        activePriceReviewId: null,
        reviewStatus: "approved",
        priceVersion: liveSellingPriceChanged ? currentPriceVersion + 1 : currentPriceVersion
    };
    const now = firebase.firestore.FieldValue.serverTimestamp();

    await getDb().collection(COLLECTIONS.products).doc(product.id).update({
        sellingPrice: approvedSellingPrice,
        pricingMeta: nextPricingMeta,
        updatedBy: user.email,
        updateDate: now
    });

    let syncResult = { syncedCount: 0, syncedCatalogueCount: 0 };
    if (syncActiveSalesCatalogues) {
        syncResult = await syncSalesCatalogueItemsForApprovedProduct({
            ...product,
            sellingPrice: approvedSellingPrice,
            pricingMeta: nextPricingMeta
        }, masterData.salesCatalogues || [], user, masterData.categories || []);
    }

    await updateProductPriceChangeReviewRecord(review.id, {
        status: "approved",
        approvedSellingPrice,
        syncActiveSalesCatalogues: Boolean(syncActiveSalesCatalogues),
        syncedCatalogueCount: syncResult.syncedCatalogueCount || 0,
        syncedCatalogueItemCount: syncResult.syncedCount || 0,
        resolvedBy: user.email,
        resolvedOn: now,
        resolutionNote: syncActiveSalesCatalogues
            ? "Approved and synced active Sales Catalogue items."
            : "Approved without syncing Sales Catalogue items."
    }, user);

    return {
        approvedSellingPrice,
        syncResult,
        liveSellingPriceChanged
    };
}

export async function rejectProductPriceChangeReview(reviewId, user, masterData = {}) {
    if (!user) {
        throw new Error("You must be logged in to reject a product price review.");
    }

    const review = await getPriceReviewRecord(reviewId, masterData);
    if (!review) {
        throw new Error("Price review record could not be found.");
    }

    if (normalizeText(review.status || "pending") !== "pending") {
        throw new Error("This price review is no longer pending.");
    }

    const product = await getProductRecord(review.productId, masterData);
    if (!product) {
        throw new Error("The linked product could not be found.");
    }

    if (normalizeText(product.pricingMeta?.activePriceReviewId) !== normalizeText(review.id)) {
        throw new Error("This review is no longer the active pricing decision for the product.");
    }

    const now = firebase.firestore.FieldValue.serverTimestamp();
    await getDb().collection(COLLECTIONS.products).doc(product.id).update({
        pricingMeta: {
            ...(product.pricingMeta || {}),
            requiresPriceReview: false,
            activePriceReviewId: null,
            reviewStatus: "rejected"
        },
        updatedBy: user.email,
        updateDate: now
    });

    await updateProductPriceChangeReviewRecord(review.id, {
        status: "rejected",
        resolvedBy: user.email,
        resolvedOn: now,
        resolutionNote: "Rejected. Moneta kept the current live selling price unchanged."
    }, user);

    return {
        keptSellingPrice: roundCurrency(product.sellingPrice)
    };
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

    if (entity === "pricingPolicies") {
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
