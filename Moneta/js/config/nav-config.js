export const navConfig = [
    {
        route: "#/dashboard",
        label: "Dashboard",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead", "guest"],
        enabled: true
    },
    {
        route: "#/suppliers",
        label: "Suppliers",
        roles: ["admin", "finance"],
        enabled: true
    },
    {
        route: "#/products",
        label: "Products",
        roles: ["admin", "inventory_manager"],
        enabled: true
    },
    {
        route: "#/purchases",
        label: "Purchases",
        roles: ["admin", "inventory_manager"],
        enabled: true
    }
];
