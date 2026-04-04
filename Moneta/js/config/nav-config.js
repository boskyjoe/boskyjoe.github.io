import { icons } from "../shared/icons.js";

export const navConfig = [
    {
        route: "#/dashboard",
        label: "Dashboard",
        icon: icons.dashboard,
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead", "guest"],
        enabled: true
    },
    {
        route: "#/suppliers",
        label: "Suppliers",
        icon: icons.suppliers,
        roles: ["admin", "finance"],
        enabled: true
    },
    {
        route: "#/products",
        label: "Products",
        icon: icons.products,
        roles: ["admin", "inventory_manager"],
        enabled: true
    },
    {
        route: "#/purchases",
        label: "Purchases",
        icon: icons.purchases,
        roles: ["admin", "inventory_manager"],
        enabled: true
    }
];
