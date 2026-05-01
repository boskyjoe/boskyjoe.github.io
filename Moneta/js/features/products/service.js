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
import { syncSalesCatalogueItemsForApprovedProduct } from "../sales-catalogues/service.js";

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

function isCustomProductType(itemType = "") {
    return normalizeText(itemType).toLowerCase() === "custom";
}

function hasPurchaseHistory(product = {}) {
    const pricingMeta = product?.pricingMeta || {};

    return Math.max(
        0,
        normalizeNumber(pricingMeta.purchaseEntryCount ?? pricingMeta.totalPurchasedUnits)
    ) > 0;
}

function canSyncSalesCatalogues(user = null) {
    return ["admin", "inventory_manager", "sales_staff", "team_lead"].includes(normalizeText(user?.role));
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

function resolveReviewBaselineStandardCost(currentProduct = null) {
    if (!currentProduct) return 0;

    const pricingMeta = currentProduct.pricingMeta || {};
    const hasPendingReview = normalizeText(pricingMeta.reviewStatus) === "pending"
        && normalizeText(pricingMeta.activePriceReviewId);

    if (hasPendingReview) {
        return roundCurrency(pricingMeta.previousStandardCost ?? currentProduct.unitPrice);
    }

    return roundCurrency(pricingMeta.standardCost ?? currentProduct.unitPrice);
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
    const customProduct = isCustomProductType(itemType);
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
    const standardCostLocked = Boolean(currentProduct)
        && !customProduct
        && isPurchaseDriven
        && hasPurchaseHistory(currentProduct);
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
    if (standardCostLocked && roundCurrency(policyDerivedCost) !== roundCurrency(unitPrice)) {
        throw new Error("Standard cost is controlled by the active pricing policy.");
    }

    const hasCurrentProduct = Boolean(currentProduct);
    const preservedSellingPrice = hasCurrentProduct
        ? roundCurrency(normalizeNumber(currentProduct?.sellingPrice, recommendedSellingPrice))
        : recommendedSellingPrice;
    const effectiveLiveSellingPrice = customProduct
        ? manualSellingPrice
        : policySettings.sellingPriceBehavior === "manual"
            ? manualSellingPrice
            : policySettings.sellingPriceBehavior === "auto-update-from-margin"
                ? recommendedSellingPrice
                : preservedSellingPrice;

    const pricingBaseProduct = {
        ...(currentProduct || {}),
        itemType,
        unitPrice,
        unitMarginPercentage,
        sellingPrice: effectiveLiveSellingPrice,
        pricingMeta: {
            ...(currentProduct?.pricingMeta || {}),
            previousStandardCost: resolveReviewBaselineStandardCost(currentProduct)
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
            sourceType: "manual-product-update",
            skipReview: customProduct
        }
    };
}

export async function saveProduct(payload, masterData, user, options = {}) {
    if (!user) {
        throw new Error("You must be logged in to save a product.");
    }

    const postSaveAction = normalizeText(options.postSaveAction || "save");
    const isApprovalAction = postSaveAction === "approve-price-change" || postSaveAction === "approve-and-sync-catalogues";
    const wantsCatalogueSync = postSaveAction === "sync-catalogues" || postSaveAction === "approve-and-sync-catalogues";
    if (isApprovalAction && user.role !== "admin") {
        throw new Error("Only admins can approve product price changes from Product Catalogue.");
    }
    if (wantsCatalogueSync && !canSyncSalesCatalogues(user)) {
        throw new Error("You do not have permission to sync Sales Catalogue pricing from Product Catalogue.");
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
            sourceType: _reviewMeta.sourceType,
            skipReview: Boolean(_reviewMeta.skipReview)
        });

        if (isApprovalAction && reviewOutcome.status === "pending" && reviewOutcome.reviewId && reviewOutcome.review) {
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

        if (wantsCatalogueSync && reviewOutcome.status === "pending" && !_reviewMeta.skipReview) {
            const syncGuardError = new Error("This standard product was saved, but Sales Catalogue sync still requires price approval.");
            syncGuardError.productSaved = true;
            syncGuardError.reviewOutcome = reviewOutcome;
            throw syncGuardError;
        }

        let syncResult = null;
        if (wantsCatalogueSync) {
            syncResult = await syncSalesCatalogueItemsForApprovedProduct(
                buildApprovedProductSnapshot(docId, _reviewMeta.currentProduct, persistedProductData, reviewOutcome),
                masterData.salesCatalogues || [],
                user,
                masterData.categories || []
            );
        }

        return {
            mode: "update",
            docId,
            reviewOutcome,
            pricingAction: wantsCatalogueSync
                ? "sync-catalogues"
                : isApprovalAction
                    ? "save-only-no-review"
                    : "save",
            syncResult
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
