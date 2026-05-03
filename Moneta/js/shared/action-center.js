import { findNavRouteItem } from "../config/nav-config.js";

export const PRICE_REVIEW_ROUTE = "#/admin-modules?section=productPriceChangeReviews";

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

export function buildImmediateActionItems(user, masterData = {}) {
    const role = user?.role || "guest";
    const items = [];
    const pendingPriceReviews = getPendingPriceReviews(masterData.productPriceChangeReviews || []);

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

    return items;
}

export function getImmediateActionCount(items = []) {
    return (items || []).reduce((sum, item) => sum + Math.max(0, Number(item?.count) || 0), 0);
}
