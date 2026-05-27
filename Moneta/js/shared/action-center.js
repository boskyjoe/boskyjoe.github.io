import { findNavRouteItem } from "../config/nav-config.js";
import { getInventoryOperationsSettings } from "./system-settings.js";

export const PRICE_REVIEW_ROUTE = "#/admin-modules?section=productPriceChangeReviews";
export const ONLINE_CATALOGUE_ROUTE = "#/admin-modules?section=onlineCatalogues";
export const PRODUCT_CATALOGUE_ROUTE = "#/products";

function normalizeText(value) {
    return (value || "").trim();
}

function roleCanAccess(route, role) {
    const navItem = findNavRouteItem(route);
    if (!navItem) return false;
    return navItem.roles.includes(role);
}

export function getPendingPriceReviews(rows = []) {
    return (rows || []).filter(review => normalizeText(review.status || "pending") === "pending");
}

function buildOnlineCataloguePendingReviewKey(entry = {}) {
    const sourceCatalogueId = normalizeText(entry.sourceCatalogueId || entry.catalogueId);
    const sourceCatalogueItemId = normalizeText(entry.sourceCatalogueItemId || entry.itemId || entry.id);
    return sourceCatalogueId && sourceCatalogueItemId
        ? `${sourceCatalogueId}::${sourceCatalogueItemId}`
        : "";
}

export function getPendingOnlineCatalogueReviews(rows = []) {
    const pendingItems = [];
    const seenKeys = new Set();

    (rows || []).forEach(record => {
        (record?.onlinePublishPendingItems || []).forEach(entry => {
            const key = buildOnlineCataloguePendingReviewKey(entry);
            if (!key || seenKeys.has(key)) {
                return;
            }

            seenKeys.add(key);
            pendingItems.push(entry);
        });
    });

    return pendingItems;
}

export function getLowStockProducts(rows = []) {
    const { lowStockThreshold } = getInventoryOperationsSettings();
    return (rows || []).filter(product => {
        const inventoryCount = Math.max(0, Math.floor(Number(product?.inventoryCount) || 0));
        return inventoryCount <= lowStockThreshold;
    });
}

export function buildImmediateActionItems(user, masterData = {}) {
    const role = user?.role || "guest";
    const items = [];
    const pendingPriceReviews = getPendingPriceReviews(masterData.productPriceChangeReviews || []);
    const pendingOnlineCatalogueReviews = getPendingOnlineCatalogueReviews(masterData.salesCatalogues || []);
    const lowStockProducts = getLowStockProducts(masterData.products || []);

    if (pendingPriceReviews.length > 0 && roleCanAccess(PRICE_REVIEW_ROUTE, role)) {
        const previewNames = pendingPriceReviews
            .map(review => normalizeText(review.productName))
            .filter(Boolean)
            .slice(0, 3);
        const previewLabel = previewNames.length
            ? `Waiting on ${previewNames.join(", ")}${pendingPriceReviews.length > previewNames.length ? ", and more." : "."}`
            : "Open the queue to approve or reject the recommended selling-price changes.";

        items.push({
            key: "price-reviews",
            title: "Price Reviews Pending",
            count: pendingPriceReviews.length,
            copy: previewLabel,
            actionLabel: "Open Price Reviews",
            route: PRICE_REVIEW_ROUTE,
            tone: "warning"
        });
    }

    if (pendingOnlineCatalogueReviews.length > 0 && roleCanAccess(ONLINE_CATALOGUE_ROUTE, role)) {
        const previewNames = pendingOnlineCatalogueReviews
            .map(entry => normalizeText(entry.productName))
            .filter(Boolean)
            .slice(0, 3);
        const previewLabel = previewNames.length
            ? `New Sales Catalogue items are waiting for pickup-portal review: ${previewNames.join(", ")}${pendingOnlineCatalogueReviews.length > previewNames.length ? ", and more." : "."}`
            : "New Sales Catalogue items were added after the last online catalogue review. Open the queue and regenerate the pickup-portal snapshot.";

        items.push({
            key: "online-catalogue-review",
            title: "Online Catalogue Review Needed",
            count: pendingOnlineCatalogueReviews.length,
            copy: previewLabel,
            actionLabel: "Review Online Catalogue",
            route: ONLINE_CATALOGUE_ROUTE,
            tone: "warning"
        });
    }

    if (lowStockProducts.length > 0 && roleCanAccess(PRODUCT_CATALOGUE_ROUTE, role)) {
        const previewNames = lowStockProducts
            .map(product => normalizeText(product.itemName || product.productName))
            .filter(Boolean)
            .slice(0, 3);
        const previewLabel = previewNames.length
            ? `These products are at or below the stock threshold: ${previewNames.join(", ")}${lowStockProducts.length > previewNames.length ? ", and more." : "."}`
            : "Some products are at or below the low-stock threshold. Review stock levels and reorder plans.";

        items.push({
            key: "low-stock-products",
            title: "Low Stock Review Needed",
            count: lowStockProducts.length,
            copy: previewLabel,
            actionLabel: "Open Product Catalogue",
            route: PRODUCT_CATALOGUE_ROUTE,
            tone: "warning"
        });
    }

    return items;
}

export function getImmediateActionCount(items = []) {
    return (items || []).reduce((sum, item) => sum + Math.max(0, Number(item?.count) || 0), 0);
}
