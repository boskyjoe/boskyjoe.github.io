import {
    createProductRecord,
    setProductFieldStatus,
    updateProductRecord
} from "./repository.js";
import { buildProductPricingSnapshot, syncProductPriceChangeReviewState } from "./pricing-service.js";
import {
    calculateSellingPriceFromMargin,
    getNormalizedPricingPolicySettings,
    resolveSystemDefaultPricingPolicy,
    roundCurrency
} from "../../shared/pricing-policy.js";
import { approveProductPriceChangeReview } from "../admin-modules/service.js";

function normalizeText(value) {
    return (value || "").trim();
}

function normalizeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function isPurchaseDrivenCostingMethod(policySettings = {}) {
    return policySettings.costingMethod === "weighted-average"
        || policySettings.costingMethod === "latest-purchase";
}

function getPolicyDerivedStandardCost(product = {}, policySettings = {}) {
    const pricingMeta = product?.pricingMeta || {};
    const existingStandardCost = roundCurrency(product?.unitPrice);

    if (policySettings.costingMethod === "latest-purchase") {
        return roundCurrency(pricingMeta.latestPurchasePrice) > 0
            ? roundCurrency(pricingMeta.latestPurchasePrice)
            : existingStandardCost;
    }

    if (policySettings.costingMethod === "weighted-average") {
        return roundCurrency(pricingMeta.weightedAverageCost) > 0
            ? roundCurrency(pricingMeta.weightedAverageCost)
            : existingStandardCost;
    }

    return existingStandardCost;
}

function inferStandardCostSource(currentProduct = null, policySettings = {}) {
    if (policySettings.costingMethod === "manual-standard-cost") {
        return "manual-standard-cost";
    }

    const storedSource = normalizeText(currentProduct?.pricingMeta?.standardCostSource);
    if (storedSource === "manual-override" && policySettings.allowManualCostOverride) {
        return "manual-override";
    }

    if (!policySettings.allowManualCostOverride) {
        return "policy-default";
    }

    if (!currentProduct) {
        return "policy-default";
    }

    const policyDerivedCost = getPolicyDerivedStandardCost(currentProduct, policySettings);
    return roundCurrency(currentProduct.unitPrice) !== policyDerivedCost
        ? "manual-override"
        : "policy-default";
}

export function calculateSellingPrice(unitPrice, unitMarginPercentage) {
    const price = normalizeNumber(unitPrice);
    const margin = normalizeNumber(unitMarginPercentage);
    return Number((price * (1 + margin / 100)).toFixed(2));
}

function buildApprovedProductSnapshot(docId, currentProduct = {}, persistedProductData = {}, reviewOutcome = {}) {
    return {
        id: docId,
        ...(currentProduct || {}),
        ...persistedProductData,
        pricingMeta: {
            ...(currentProduct?.pricingMeta || {}),
            ...(persistedProductData?.pricingMeta || {}),
            activePriceReviewId: reviewOutcome.reviewId || persistedProductData?.pricingMeta?.activePriceReviewId || null,
            reviewStatus: reviewOutcome.status === "pending"
                ? "pending"
                : persistedProductData?.pricingMeta?.reviewStatus || currentProduct?.pricingMeta?.reviewStatus || "none"
        }
    };
}

export function validateProductPayload(payload, masterData = {}) {
    const itemName = normalizeText(payload.itemName);
    const categoryId = normalizeText(payload.categoryId);
    const itemType = normalizeText(payload.itemType) || "Standard";
    const unitPrice = normalizeNumber(payload.unitPrice);
    const unitMarginPercentage = normalizeNumber(payload.unitMarginPercentage);
    const inventoryCount = normalizeNumber(payload.inventoryCount);
    const netWeightKg = normalizeNumber(payload.netWeightKg);
    const pricingPolicies = masterData.pricingPolicies || [];
    const currentProducts = masterData.products || [];
    const currentProduct = currentProducts.find(product => product.id === normalizeText(payload.docId)) || null;
    const resolvedPolicy = resolveSystemDefaultPricingPolicy(pricingPolicies, { activeOnly: true }) || null;
    const policySettings = getNormalizedPricingPolicySettings(resolvedPolicy || {});
    const isPurchaseDriven = isPurchaseDrivenCostingMethod(policySettings);
    const requestedStandardCostSource = normalizeText(payload.standardCostSource);
    const standardCostSource = policySettings.costingMethod === "manual-standard-cost"
        ? "manual-standard-cost"
        : requestedStandardCostSource === "manual-override" && policySettings.allowManualCostOverride
            ? "manual-override"
            : inferStandardCostSource(currentProduct, policySettings) === "manual-override"
                && policySettings.allowManualCostOverride
                && !requestedStandardCostSource
                ? "manual-override"
                : "policy-default";
    const recommendedSellingPrice = calculateSellingPriceFromMargin(unitPrice, unitMarginPercentage);
    const manualSellingPrice = roundCurrency(normalizeNumber(payload.sellingPrice, recommendedSellingPrice));
    const policyDerivedCost = currentProduct
        ? getPolicyDerivedStandardCost(currentProduct, policySettings)
        : roundCurrency(unitPrice);

    if (!itemName) throw new Error("Product name is required.");
    if (!categoryId) throw new Error("Category is required.");
    if (unitPrice < 0) throw new Error("Unit price cannot be negative.");
    if (unitMarginPercentage < 0) throw new Error("Margin cannot be negative.");
    if (manualSellingPrice < 0) throw new Error("Selling price cannot be negative.");
    if (
        currentProduct
        && isPurchaseDriven
        && standardCostSource !== "manual-override"
        && roundCurrency(policyDerivedCost) !== roundCurrency(unitPrice)
    ) {
        throw new Error("Standard cost is controlled by the active pricing policy.");
    }
    if (
        currentProduct
        && isPurchaseDriven
        && requestedStandardCostSource === "manual-override"
        && !policySettings.allowManualCostOverride
    ) {
        throw new Error("Manual standard-cost overrides are locked by the active pricing policy.");
    }

    const hasCurrentProduct = Boolean(currentProduct);
    const preservedSellingPrice = hasCurrentProduct
        ? roundCurrency(normalizeNumber(currentProduct?.sellingPrice, recommendedSellingPrice))
        : recommendedSellingPrice;
    const effectiveLiveSellingPrice = policySettings.sellingPriceBehavior === "manual"
        ? manualSellingPrice
        : policySettings.sellingPriceBehavior === "auto-update-from-margin"
            ? recommendedSellingPrice
            : preservedSellingPrice;

    const pricingBaseProduct = {
        ...(currentProduct || {}),
        unitPrice,
        unitMarginPercentage,
        sellingPrice: effectiveLiveSellingPrice,
        pricingMeta: {
            ...(currentProduct?.pricingMeta || {}),
            previousStandardCost: roundCurrency(currentProduct?.pricingMeta?.standardCost ?? currentProduct?.unitPrice),
            standardCostSource
        }
    };
    const pricingSnapshot = buildProductPricingSnapshot(pricingBaseProduct, pricingPolicies);
    const existingPricingMeta = currentProduct?.pricingMeta || {};
    const nextSellingPrice = pricingSnapshot.nextSellingPrice;
    const liveSellingPriceChanged = hasCurrentProduct
        ? roundCurrency(currentProduct?.sellingPrice) !== nextSellingPrice
        : nextSellingPrice > 0;

    return {
        itemName,
        categoryId,
        itemType,
        unitPrice: pricingSnapshot.nextUnitPrice,
        unitMarginPercentage,
        sellingPrice: pricingSnapshot.nextSellingPrice,
        inventoryCount,
        netWeightKg,
        pricingMeta: {
            ...pricingSnapshot.pricingMeta,
            standardCostSource: pricingSnapshot.pricingMeta.standardCostSource || standardCostSource,
            priceVersion: liveSellingPriceChanged
                ? Math.max(0, normalizeNumber(existingPricingMeta.priceVersion)) + 1
                : Math.max(0, normalizeNumber(existingPricingMeta.priceVersion)),
            activePriceReviewId: existingPricingMeta.activePriceReviewId || null,
            reviewStatus: existingPricingMeta.reviewStatus || "none",
            lastPolicyDrivenUpdateAt: existingPricingMeta.lastPolicyDrivenUpdateAt || null,
            lastPolicyDrivenUpdateReason: existingPricingMeta.lastPolicyDrivenUpdateReason || null
        },
        _reviewMeta: {
            currentProduct,
            liveSellingPriceChanged,
            sourceType: "manual-product-update"
        }
    };
}

export async function saveProduct(payload, masterData, user, options = {}) {
    if (!user) {
        throw new Error("You must be logged in to save a product.");
    }

    const postSaveAction = normalizeText(options.postSaveAction || "save");
    const isFastTrackAction = postSaveAction === "approve-price-change" || postSaveAction === "approve-and-sync-catalogues";
    if (isFastTrackAction && user.role !== "admin") {
        throw new Error("Only admins can approve product price changes from Product Catalogue.");
    }

    const productData = validateProductPayload(payload, masterData);
    const docId = normalizeText(payload.docId);
    const { _reviewMeta = {}, ...persistedProductData } = productData;

    if (docId) {
        await updateProductRecord(docId, persistedProductData, user);
        const reviewOutcome = await syncProductPriceChangeReviewState({
            id: docId,
            ...(_reviewMeta.currentProduct || {}),
            ...persistedProductData
        }, {
            salesCatalogues: masterData.salesCatalogues || [],
            user,
            sourceType: _reviewMeta.sourceType
        });

        if (isFastTrackAction && reviewOutcome.status === "pending" && reviewOutcome.reviewId && reviewOutcome.review) {
            try {
                const approvalResult = await approveProductPriceChangeReview(
                    reviewOutcome.reviewId,
                    { syncActiveSalesCatalogues: postSaveAction === "approve-and-sync-catalogues" },
                    user,
                    {
                        products: [buildApprovedProductSnapshot(docId, _reviewMeta.currentProduct, persistedProductData, reviewOutcome)],
                        productPriceChangeReviews: [reviewOutcome.review],
                        salesCatalogues: masterData.salesCatalogues || [],
                        categories: masterData.categories || []
                    }
                );

                return {
                    mode: "update",
                    docId,
                    reviewOutcome,
                    pricingAction: postSaveAction,
                    approvalResult
                };
            } catch (error) {
                error.productSaved = true;
                error.reviewOutcome = reviewOutcome;
                throw error;
            }
        }

        return {
            mode: "update",
            docId,
            reviewOutcome,
            pricingAction: isFastTrackAction ? "save-only-no-review" : "save"
        };
    }

    const createdRef = await createProductRecord(persistedProductData, user);
    return { mode: "create", docId: createdRef.id, reviewOutcome: { reviewId: null, status: "skipped", review: null }, pricingAction: "save" };
}

export async function toggleProductStatus(docId, field, nextValue, user) {
    if (!user) {
        throw new Error("You must be logged in to update product status.");
    }

    if (!docId) {
        throw new Error("Product record could not be found.");
    }

    await setProductFieldStatus(docId, field, nextValue, user);
}
