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
        route: "#/suppliers",
        label: "Supplier Management",
        icon: icons.suppliers,
        iconClass: "nav-icon-amber",
        roles: ["admin", "finance"],
        enabled: true
    }
];
