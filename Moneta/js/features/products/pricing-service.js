import { COLLECTIONS } from "../../config/collections.js";
import {
    createProductPriceChangeReviewRecord,
    getProductPriceChangeReviewRecord,
    getSalesCatalogueItemsForProduct,
    updateProductPriceChangeReviewRecord
} from "./price-review-repository.js";
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
    const standardCostSource = normalizeText(product?.pricingMeta?.standardCostSource);

    if (policySettings.allowManualCostOverride && standardCostSource === "manual-override") {
        return existingStandardCost;
    }

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
    const previousStandardCost = roundCurrency(product?.pricingMeta?.previousStandardCost ?? product.unitPrice);
    const standardCost = resolveStandardCost(product, policySettings, purchaseSummary);
    const requestedStandardCostSource = normalizeText(product?.pricingMeta?.standardCostSource);
    const standardCostSource = policySettings.costingMethod === "manual-standard-cost"
        ? "manual-standard-cost"
        : requestedStandardCostSource === "manual-override" && policySettings.allowManualCostOverride
            ? "manual-override"
            : "policy-default";
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
            standardCostSource,
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

function buildPriceReviewCandidate(product = {}) {
    const pricingMeta = product.pricingMeta || {};
    const currentSellingPrice = roundCurrency(product.sellingPrice);
    const recommendedSellingPrice = roundCurrency(pricingMeta.recommendedSellingPrice);

    return Boolean(pricingMeta.requiresPriceReview)
        && recommendedSellingPrice > 0
        && Math.abs(recommendedSellingPrice - currentSellingPrice) >= 0.01;
}

async function buildAffectedSalesCatalogueSummary(productId, salesCatalogueHeaders = []) {
    const activeCatalogueHeaders = (salesCatalogueHeaders || []).filter(row => row?.isActive !== false);
    const activeCatalogueIds = activeCatalogueHeaders.map(row => normalizeText(row.id)).filter(Boolean);
    const catalogueItems = await getSalesCatalogueItemsForProduct(productId, activeCatalogueIds);
    const catalogueNameById = new Map(activeCatalogueHeaders.map(row => [normalizeText(row.id), normalizeText(row.catalogueName)]));
    const affectedCatalogueIds = [...new Set(catalogueItems.map(row => normalizeText(row.catalogueId)).filter(Boolean))];

    return {
        affectedCatalogueIds,
        affectedCatalogueNames: affectedCatalogueIds.map(id => catalogueNameById.get(id) || id),
        affectedCatalogueCount: affectedCatalogueIds.length,
        affectedCatalogueItemCount: catalogueItems.length
    };
}

function buildProductPriceChangeReviewPayload(product = {}, affectedSummary = {}, sourceType = "") {
    const pricingMeta = product.pricingMeta || {};

    return {
        productId: product.id,
        itemId: product.itemId || "",
        productName: product.itemName || "Untitled Product",
        categoryId: product.categoryId || "",
        previousStandardCost: roundCurrency(pricingMeta.previousStandardCost),
        nextStandardCost: roundCurrency(pricingMeta.standardCost ?? product.unitPrice),
        previousSellingPrice: roundCurrency(product.sellingPrice),
        recommendedSellingPrice: roundCurrency(pricingMeta.recommendedSellingPrice),
        currentSellingPrice: roundCurrency(product.sellingPrice),
        targetMarginPercentage: normalizeNumber(product.unitMarginPercentage),
        costChangePercent: pricingMeta.costChangePercent ?? null,
        sourceType: normalizeText(sourceType || pricingMeta.lastPolicyDrivenUpdateReason || "product-update"),
        status: "pending",
        affectedSalesCatalogueCount: affectedSummary.affectedCatalogueCount || 0,
        affectedSalesCatalogueItemCount: affectedSummary.affectedCatalogueItemCount || 0,
        affectedSalesCatalogueIds: affectedSummary.affectedCatalogueIds || [],
        affectedSalesCatalogueNames: affectedSummary.affectedCatalogueNames || []
    };
}

export async function syncProductPriceChangeReviewState(
    product,
    {
        salesCatalogues = [],
        user = null,
        sourceType = "",
        skipReview = false
    } = {}
) {
    const productId = normalizeText(product?.id);
    if (!productId || !user?.email) {
        return { reviewId: null, status: "skipped", review: null };
    }

    const pricingMeta = product.pricingMeta || {};
    const currentReviewId = normalizeText(pricingMeta.activePriceReviewId);
    const docRef = getDb().collection(COLLECTIONS.products).doc(productId);
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const reviewNeeded = !skipReview && buildPriceReviewCandidate(product);

    if (!reviewNeeded) {
        if (currentReviewId) {
            await updateProductPriceChangeReviewRecord(currentReviewId, {
                status: "cancelled",
                resolvedBy: user.email,
                resolvedOn: now,
                resolutionNote: "Review was cleared because the product no longer needs a pricing decision."
            }, user);
        }

        await docRef.update({
            pricingMeta: {
                ...pricingMeta,
                requiresPriceReview: false,
                activePriceReviewId: null,
                reviewStatus: "none"
            },
            updatedBy: user.email,
            updateDate: now
        });

        return { reviewId: null, status: "cleared", review: null };
    }

    const affectedSummary = await buildAffectedSalesCatalogueSummary(productId, salesCatalogues);
    const reviewPayload = buildProductPriceChangeReviewPayload(product, affectedSummary, sourceType);

    let reviewId = currentReviewId;
    if (reviewId) {
        const existingReview = await getProductPriceChangeReviewRecord(reviewId);
        if (existingReview && normalizeText(existingReview.status) === "pending") {
            await updateProductPriceChangeReviewRecord(reviewId, reviewPayload, user);
        } else {
            reviewId = "";
        }
    }

    if (!reviewId) {
        const createdRef = await createProductPriceChangeReviewRecord(reviewPayload, user);
        reviewId = createdRef.id;
    }

    await docRef.update({
        pricingMeta: {
            ...pricingMeta,
            activePriceReviewId: reviewId,
            reviewStatus: "pending"
        },
        updatedBy: user.email,
        updateDate: now
    });

    return {
        reviewId,
        status: "pending",
        review: {
            id: reviewId,
            ...reviewPayload
        }
    };
}

export async function syncProductPricingFromPurchases(
    productIds = [],
    {
        products = [],
        pricingPolicies = [],
        salesCatalogues = [],
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

    let purchaseSnapshot;
    try {
        purchaseSnapshot = await getDb().collection(COLLECTIONS.purchaseInvoices).get();
    } catch (error) {
        console.error("[Moneta] Failed to read purchase history for pricing sync:", {
            affectedProductIds: normalizedProductIds,
            userRole: user.role || "unknown",
            error
        });
        throw error;
    }

    const purchaseInvoices = purchaseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const batch = getDb().batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    let updatedCount = 0;

    const reviewSyncProducts = [];

    targetProducts.forEach(product => {
        const productId = normalizeText(product.id);
        const historyRows = getActivePurchaseHistoryRows(purchaseInvoices, productId);
        const purchaseSummary = computePurchaseCostSummary(historyRows);
        const pricingSnapshot = buildProductPricingSnapshot(product, pricingPolicies, purchaseSummary);
        const previousPricingMeta = product.pricingMeta || {};
        const previousVersion = Math.max(0, normalizeNumber(previousPricingMeta.priceVersion));
        const liveSellingPriceChanged = pricingSnapshot.nextSellingPrice !== roundCurrency(product.sellingPrice);
        const nextPriceVersion = liveSellingPriceChanged ? previousVersion + 1 : previousVersion;
        const nextPricingMeta = {
            ...pricingSnapshot.pricingMeta,
            priceVersion: nextPriceVersion,
            activePriceReviewId: previousPricingMeta.activePriceReviewId || null,
            reviewStatus: previousPricingMeta.reviewStatus || "none",
            lastPolicyDrivenUpdateAt: (pricingSnapshot.nextUnitPrice !== roundCurrency(product.unitPrice)
                || pricingSnapshot.pricingMeta.recommendedSellingPrice !== roundCurrency(previousPricingMeta.recommendedSellingPrice))
                ? new Date().toISOString()
                : (previousPricingMeta.lastPolicyDrivenUpdateAt || null),
            lastPolicyDrivenUpdateReason: (pricingSnapshot.nextUnitPrice !== roundCurrency(product.unitPrice)
                || pricingSnapshot.pricingMeta.recommendedSellingPrice !== roundCurrency(previousPricingMeta.recommendedSellingPrice))
                ? "purchase-history-sync"
                : (previousPricingMeta.lastPolicyDrivenUpdateReason || null)
        };
        const docRef = getDb().collection(COLLECTIONS.products).doc(productId);
        const updatedProduct = {
            ...product,
            unitPrice: pricingSnapshot.nextUnitPrice,
            sellingPrice: pricingSnapshot.nextSellingPrice,
            pricingMeta: nextPricingMeta
        };

        batch.update(docRef, {
            unitPrice: updatedProduct.unitPrice,
            sellingPrice: updatedProduct.sellingPrice,
            pricingMeta: updatedProduct.pricingMeta,
            updatedBy: user.email,
            updateDate: now
        });
        reviewSyncProducts.push(updatedProduct);
        updatedCount += 1;
    });

    if (updatedCount > 0) {
        try {
            await batch.commit();
        } catch (error) {
            console.error("[Moneta] Failed to update product pricing from purchases:", {
                affectedProductIds: normalizedProductIds,
                userRole: user.role || "unknown",
                error
            });
            throw error;
        }

        for (const product of reviewSyncProducts) {
            try {
                await syncProductPriceChangeReviewState(product, {
                    salesCatalogues,
                    user,
                    sourceType: "purchase-history-sync"
                });
            } catch (error) {
                console.error("[Moneta] Failed to sync product price change review state:", {
                    productId: product.id,
                    userRole: user.role || "unknown",
                    error
                });
                throw error;
            }
        }
    }

    return {
        updatedCount,
        affectedProductIds: normalizedProductIds
    };
}
