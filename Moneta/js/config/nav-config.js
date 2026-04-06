import { icons } from "../shared/icons.js";

export const navConfig = [
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
        roles: ["admin"]
    },
    {
        type: "link",
        route: "#/admin-modules",
        label: "Admin Modules",
        icon: icons.settings,
        iconClass: "nav-icon-cyan",
        roles: ["admin"],
        enabled: true
    },
    {
        type: "link",
        route: "#/user-management",
        label: "User Management",
        icon: icons.users,
        iconClass: "nav-icon-amber",
        roles: ["admin"],
        enabled: true
    }
];
