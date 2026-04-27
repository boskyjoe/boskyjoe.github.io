import { COLLECTIONS } from "../../config/collections.js";
import {
    calculateCostChangePercent,
    calculateSellingPriceFromMargin,
    DEFAULT_PRICING_POLICY,
    getNormalizedPricingPolicySettings,
    resolveSystemDefaultPricingPolicy,
    roundCurrency
} from "../../shared/pricing-policy.js";

function getDb() {
    return firebase.firestore();
}

function normalizeText(value) {
    return (value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toTimestampMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getActivePurchaseHistoryRows(purchaseInvoices = [], productId = "") {
    const normalizedProductId = normalizeText(productId);
    if (!normalizedProductId) return [];

    return (purchaseInvoices || [])
        .filter(invoice => normalizeText(invoice.invoiceStatus || invoice.paymentStatus).toLowerCase() !== "voided")
        .flatMap(invoice => (invoice.lineItems || [])
            .filter(item => normalizeText(item.masterProductId) === normalizedProductId)
            .map(item => ({
                invoiceId: invoice.id,
                purchaseDate: invoice.purchaseDate,
                quantity: Math.max(0, normalizeNumber(item.quantity)),
                netPrice: roundCurrency(item.netPrice),
                unitPurchasePrice: roundCurrency(item.unitPurchasePrice),
                effectiveUnitCost: Math.max(0, normalizeNumber(item.quantity) || 0) > 0
                    ? roundCurrency(roundCurrency(item.netPrice) / Math.max(1, normalizeNumber(item.quantity)))
                    : roundCurrency(item.unitPurchasePrice)
            })))
        .filter(row => row.quantity > 0);
}

function computePurchaseCostSummary(historyRows = []) {
    const totalUnits = historyRows.reduce((sum, row) => sum + Math.max(0, normalizeNumber(row.quantity)), 0);
    const totalNetSpend = roundCurrency(historyRows.reduce((sum, row) => sum + roundCurrency(row.netPrice), 0));
    const weightedAverageCost = totalUnits > 0
        ? roundCurrency(totalNetSpend / totalUnits)
        : 0;

    const latestRow = historyRows
        .slice()
        .sort((left, right) => toTimestampMillis(right.purchaseDate) - toTimestampMillis(left.purchaseDate))[0] || null;

    return {
        totalUnits,
        totalNetSpend,
        purchaseEntryCount: historyRows.length,
        weightedAverageCost,
        latestPurchasePrice: latestRow?.effectiveUnitCost || 0,
        latestPurchaseDate: latestRow?.purchaseDate || null
    };
}

function resolveStandardCost(product = {}, policySettings = DEFAULT_PRICING_POLICY, purchaseSummary = {}) {
    const existingStandardCost = roundCurrency(product.unitPrice);

    if (policySettings.costingMethod === "latest-purchase") {
        return purchaseSummary.latestPurchasePrice > 0 ? purchaseSummary.latestPurchasePrice : existingStandardCost;
    }

    if (policySettings.costingMethod === "weighted-average") {
        return purchaseSummary.weightedAverageCost > 0 ? purchaseSummary.weightedAverageCost : existingStandardCost;
    }

    return existingStandardCost;
}

function normalizePurchaseSummary(source = {}) {
    return {
        totalUnits: Math.max(0, normalizeNumber(source.totalUnits ?? source.totalPurchasedUnits)),
        totalNetSpend: roundCurrency(source.totalNetSpend),
        purchaseEntryCount: Math.max(0, normalizeNumber(source.purchaseEntryCount)),
        weightedAverageCost: roundCurrency(source.weightedAverageCost),
        latestPurchasePrice: roundCurrency(source.latestPurchasePrice),
        latestPurchaseDate: source.latestPurchaseDate || null
    };
}

function buildPricingMeta(product = {}, policy = null, purchaseSummary = {}) {
    const policySettings = getNormalizedPricingPolicySettings(policy || DEFAULT_PRICING_POLICY);
    const previousStandardCost = roundCurrency(product.unitPrice);
    const standardCost = resolveStandardCost(product, policySettings, purchaseSummary);
    const targetMarginPercentage = normalizeNumber(
        product.unitMarginPercentage,
        policySettings.defaultTargetMarginPercentage
    );
    const recommendedSellingPrice = calculateSellingPriceFromMargin(standardCost, targetMarginPercentage);
    const costChangePercent = calculateCostChangePercent(standardCost, previousStandardCost);
    const requiresPriceReview = costChangePercent === null
        ? standardCost > 0 && previousStandardCost <= 0
        : Math.abs(costChangePercent) >= policySettings.costChangeAlertThresholdPercentage;
    const effectiveSellingPrice = policySettings.sellingPriceBehavior === "auto-update-from-margin"
        ? recommendedSellingPrice
        : roundCurrency(product.sellingPrice || calculateSellingPriceFromMargin(previousStandardCost, targetMarginPercentage));

    return {
        nextUnitPrice: standardCost,
        nextSellingPrice: effectiveSellingPrice,
        pricingMeta: {
            costingMethod: policySettings.costingMethod,
            sellingPriceBehavior: policySettings.sellingPriceBehavior,
            defaultTargetMarginPercentage: policySettings.defaultTargetMarginPercentage,
            costChangeAlertThresholdPercentage: policySettings.costChangeAlertThresholdPercentage,
            allowManualCostOverride: policySettings.allowManualCostOverride,
            weightedAverageCost: purchaseSummary.weightedAverageCost,
            latestPurchasePrice: purchaseSummary.latestPurchasePrice,
            latestPurchaseDate: purchaseSummary.latestPurchaseDate || null,
            purchaseEntryCount: purchaseSummary.purchaseEntryCount || 0,
            totalPurchasedUnits: purchaseSummary.totalUnits || 0,
            previousStandardCost,
            standardCost,
            costChangePercent,
            recommendedSellingPrice,
            requiresPriceReview
        }
    };
}

export function buildProductPricingSnapshot(product = {}, pricingPolicies = [], purchaseSummary = null) {
    const pricingPolicy = resolveSystemDefaultPricingPolicy(pricingPolicies, { activeOnly: true }) || DEFAULT_PRICING_POLICY;
    const resolvedPurchaseSummary = purchaseSummary
        ? normalizePurchaseSummary(purchaseSummary)
        : normalizePurchaseSummary(product.pricingMeta || {});

    return buildPricingMeta(product, pricingPolicy, resolvedPurchaseSummary);
}

export async function syncProductPricingFromPurchases(
    productIds = [],
    {
        products = [],
        pricingPolicies = [],
        user = null
    } = {}
) {
    const normalizedProductIds = [...new Set((productIds || []).map(id => normalizeText(id)).filter(Boolean))];
    if (!normalizedProductIds.length || !user?.email) {
        return { updatedCount: 0, affectedProductIds: normalizedProductIds };
    }

    const productMap = new Map((products || []).map(product => [normalizeText(product.id), product]));
    const missingProductIds = normalizedProductIds.filter(productId => !productMap.has(productId));

    if (missingProductIds.length > 0) {
        const missingSnapshots = await Promise.all(
            missingProductIds.map(productId => getDb().collection(COLLECTIONS.products).doc(productId).get())
        );

        missingSnapshots.forEach(snapshot => {
            if (!snapshot.exists) return;
            productMap.set(normalizeText(snapshot.id), { id: snapshot.id, ...snapshot.data() });
        });
    }

    const targetProducts = normalizedProductIds
        .map(productId => productMap.get(productId))
        .filter(Boolean);

    if (!targetProducts.length) {
        return { updatedCount: 0, affectedProductIds: normalizedProductIds };
    }

    const purchaseSnapshot = await getDb().collection(COLLECTIONS.purchaseInvoices).get();
    const purchaseInvoices = purchaseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const batch = getDb().batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    let updatedCount = 0;

    targetProducts.forEach(product => {
        const productId = normalizeText(product.id);
        const historyRows = getActivePurchaseHistoryRows(purchaseInvoices, productId);
        const purchaseSummary = computePurchaseCostSummary(historyRows);
        const pricingSnapshot = buildProductPricingSnapshot(product, pricingPolicies, purchaseSummary);
        const docRef = getDb().collection(COLLECTIONS.products).doc(productId);

        batch.update(docRef, {
            unitPrice: pricingSnapshot.nextUnitPrice,
            sellingPrice: pricingSnapshot.nextSellingPrice,
            pricingMeta: pricingSnapshot.pricingMeta,
            updatedBy: user.email,
            updateDate: now
        });
        updatedCount += 1;
    });

    if (updatedCount > 0) {
        await batch.commit();
    }

    return {
        updatedCount,
        affectedProductIds: normalizedProductIds
    };
}
