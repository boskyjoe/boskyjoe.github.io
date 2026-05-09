import { findNavRouteItem } from "../config/nav-config.js";

export const PRICE_REVIEW_ROUTE = "#/admin-modules?section=productPriceChangeReviews";
export const ONLINE_CATALOGUE_ROUTE = "#/admin-modules?section=onlineCatalogues";

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

export function buildImmediateActionItems(user, masterData = {}) {
    const role = user?.role || "guest";
    const items = [];
    const pendingPriceReviews = getPendingPriceReviews(masterData.productPriceChangeReviews || []);
    const pendingOnlineCatalogueReviews = getPendingOnlineCatalogueReviews(masterData.salesCatalogues || []);

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

    return items;
}

export function getImmediateActionCount(items = []) {
    return (items || []).reduce((sum, item) => sum + Math.max(0, Number(item?.count) || 0), 0);
}
