import { icons } from "../shared/icons.js";

function routeBase(route = "") {
    return String(route).split("?")[0];
}

export const navConfig = [
    {
        type: "link",
        route: "#/home",
        label: "Home",
        icon: icons.home,
        iconClass: "nav-icon-cyan",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead", "guest"],
        enabled: true
    },
    {
        type: "link",
        route: "#/dashboard",
        label: "Dashboard",
        icon: icons.dashboard,
        iconClass: "nav-icon-cyan",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead", "guest"],
        enabled: true
    },
    {
        type: "link",
        route: "#/assistant",
        label: "Assistant",
        icon: icons.assistant,
        iconClass: "nav-icon-cyan",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead"],
        enabled: false
    },
    {
        type: "heading",
        label: "Pre-Sales",
        roles: ["admin", "sales_staff", "team_lead"]
    },
    {
        type: "link",
        route: "#/leads",
        label: "Enquiries",
        icon: icons.leads,
        iconClass: "nav-icon-cyan",
        roles: ["admin", "sales_staff", "team_lead"],
        enabled: true
    },
    {
        type: "link",
        route: "#/lead-quotes",
        label: "Quote Workspace",
        icon: icons.catalogue,
        iconClass: "nav-icon-cyan",
        roles: ["admin", "sales_staff", "team_lead"],
        enabled: false
    },
    {
        type: "heading",
        label: "Direct Sales",
        roles: ["admin", "sales_staff", "finance"]
    },
    {
        type: "link",
        route: "#/retail-store",
        label: "Retail Store",
        icon: icons.retail,
        iconClass: "nav-icon-cyan",
        roles: ["admin", "sales_staff", "finance"],
        enabled: true
    },
    {
        type: "link",
        route: "#/simple-consignment",
        label: "Simple Consignment",
        icon: icons.consignment,
        iconClass: "nav-icon-cyan",
        roles: ["admin", "inventory_manager"],
        enabled: true
    },
    {
        type: "heading",
        label: "Inventory",
        roles: ["admin", "inventory_manager"]
    },
    {
        type: "link",
        route: "#/purchases",
        label: "Stock Purchase",
        icon: icons.purchases,
        iconClass: "nav-icon-orange",
        roles: ["admin", "inventory_manager"],
        enabled: true
    },
    {
        type: "heading",
        label: "Store Admin",
        roles: ["admin", "finance", "inventory_manager"]
    },
    {
        type: "link",
        route: "#/products",
        label: "Product Catalogue",
        icon: icons.products,
        iconClass: "nav-icon-violet",
        roles: ["admin", "inventory_manager"],
        enabled: true
    },
    {
        type: "link",
        route: "#/sales-catalogues",
        label: "Sales Catalogue",
        icon: icons.catalogue,
        iconClass: "nav-icon-cyan",
        roles: ["admin", "inventory_manager", "sales_staff", "team_lead"],
        enabled: true
    },
    {
        type: "link",
        route: "#/suppliers",
        label: "Supplier Management",
        icon: icons.suppliers,
        iconClass: "nav-icon-amber",
        roles: ["admin", "finance"],
        enabled: true
    },
    {
        type: "heading",
        label: "System Settings",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead"]
    },
    {
        type: "link",
        route: "#/reports",
        label: "Reports",
        icon: icons.reports,
        iconClass: "nav-icon-orange",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead"],
        enabled: true
    },
    {
        type: "tree",
        key: "admin-modules",
        label: "Admin Modules",
        icon: icons.settings,
        iconClass: "nav-icon-cyan",
        roles: ["admin"],
        enabled: true,
        groups: [
            {
                label: "Catalogue Setup",
                items: [
                    {
                        type: "link",
                        route: "#/admin-modules?section=categories",
                        label: "Product Categories",
                        icon: icons.products,
                        iconClass: "nav-icon-violet",
                        roles: ["admin"],
                        enabled: true
                    },
                    {
                        type: "link",
                        route: "#/admin-modules?section=seasons",
                        label: "Sales Seasons",
                        icon: icons.catalogue,
                        iconClass: "nav-icon-cyan",
                        roles: ["admin"],
                        enabled: true
                    }
                ]
            },
            {
                label: "Pricing & Inventory Rules",
                items: [
                    {
                        type: "link",
                        route: "#/admin-modules?section=pricingPolicies",
                        label: "Pricing Policy",
                        icon: icons.reports,
                        iconClass: "nav-icon-orange",
                        roles: ["admin"],
                        enabled: true
                    },
                    {
                        type: "link",
                        route: "#/admin-modules?section=productPriceChangeReviews",
                        label: "Price Reviews",
                        icon: icons.warning,
                        iconClass: "nav-icon-amber",
                        roles: ["admin", "inventory_manager"],
                        enabled: true
                    },
                    {
                        type: "link",
                        route: "#/admin-modules?section=reorderPolicies",
                        label: "Reorder Policies",
                        icon: icons.reports,
                        iconClass: "nav-icon-orange",
                        roles: ["admin"],
                        enabled: true
                    }
                ]
            },
            {
                label: "Store Operations",
                items: [
                    {
                        type: "link",
                        route: "#/admin-modules?section=paymentModes",
                        label: "Payment Modes",
                        icon: icons.payment,
                        iconClass: "nav-icon-cyan",
                        roles: ["admin"],
                        enabled: true
                    },
                    {
                        type: "link",
                        route: "#/admin-modules?section=storeConfigs",
                        label: "Store Config",
                        icon: icons.retail,
                        iconClass: "nav-icon-cyan",
                        roles: ["admin"],
                        enabled: true
                    }
                ]
            },
            {
                label: "Security & Access",
                items: [
                    {
                        type: "link",
                        route: "#/user-management",
                        label: "User Management",
                        icon: icons.users,
                        iconClass: "nav-icon-amber",
                        roles: ["admin"],
                        enabled: true
                    }
                ]
            }
        ]
    }
];

export function canAccessNavItem(item, role) {
    return item?.enabled !== false && (!item?.roles || item.roles.includes(role));
}

export function flattenNavRoutes(items = navConfig) {
    return items.flatMap(item => {
        if (item.type === "tree") {
            return (item.groups || []).flatMap(group =>
                (group.items || [])
            );
        }

        return item.type === "link" ? [item] : [];
    });
}

export function findNavRouteItem(route, items = navConfig) {
    const requestedRoute = String(route || "");
    const requestedBaseRoute = routeBase(route);

    for (const item of items) {
        if (item.type === "tree") {
            for (const group of item.groups || []) {
                for (const child of group.items || []) {
                    if (child.route === requestedRoute || routeBase(child.route) === requestedBaseRoute) {
                        return child;
                    }
                }
            }
            continue;
        }

        if (item.type === "link" && (item.route === requestedRoute || routeBase(item.route) === requestedBaseRoute)) {
            return item;
        }
    }

    return null;
}
