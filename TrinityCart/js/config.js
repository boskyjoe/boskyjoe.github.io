// js/config.js

// Your real Firebase project configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBAt_2gMhSPPSBi0zApb7z05ODZjMceDOk",
  authDomain: "trinitycart-9e055.firebaseapp.com",
  projectId: "trinitycart-9e055",
  storageBucket: "trinitycart-9e055.appspot.com",
  messagingSenderId: "450216949740",
  appId: "1:450216949740:web:375d45d553bfd2a541f2c9",
  measurementId: "G-57JRDMJB14"
};


// 1. Define the base document path for all our data.
const BASE_DOC_PATH = 'artifacts/TrinityCart-default-app-id';

// The path to your users collection
export const USERS_COLLECTION_PATH = `${BASE_DOC_PATH}/users`;
export const SUPPLIERS_COLLECTION_PATH = `${BASE_DOC_PATH}/suppliers`;
export const PRODUCTS_COLLECTION_PATH = `${BASE_DOC_PATH}/products`;
export const PURCHASES_COLLECTION_PATH = `${BASE_DOC_PATH}/purchaseInvoices`;



export const CATEGORIES_COLLECTION_PATH = `${BASE_DOC_PATH}/productCategories`;
export const SALE_TYPES_COLLECTION_PATH = `${BASE_DOC_PATH}/saleTypes`;
export const PRODUCTS_CATALOGUE_COLLECTION_PATH = `${BASE_DOC_PATH}/productCatalogue`;
export const PAYMENT_MODES_COLLECTION_PATH = `${BASE_DOC_PATH}/paymentModes`;
export const SEASONS_COLLECTION_PATH = `${BASE_DOC_PATH}/salesSeasons`;
export const EVENTS_COLLECTION_PATH = `${BASE_DOC_PATH}/salesEvents`;


export const PURCHASE_INVOICES_COLLECTION_PATH = `${BASE_DOC_PATH}/purchaseInvoices`;
export const INVENTORY_LEDGER_COLLECTION_PATH = `${BASE_DOC_PATH}/inventoryLedger`;
export const SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH = `${BASE_DOC_PATH}/supplierPaymentsLedger`;

export const SALES_CATALOGUES_COLLECTION_PATH = `${BASE_DOC_PATH}/salesCatalogues`;

export const CHURCH_TEAMS_COLLECTION_PATH = `${BASE_DOC_PATH}/churchTeams`;
export const USER_TEAM_MEMBERSHIPS_COLLECTION_PATH = `${BASE_DOC_PATH}/userTeamMemberships`;

export const CONSIGNMENT_ORDERS_COLLECTION_PATH = `${BASE_DOC_PATH}/consignmentOrders`;
export const CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH = `${BASE_DOC_PATH}/consignmentPaymentsLedger`;

export const SYSTEM_SETUPS_COLLECTION_PATH = `${BASE_DOC_PATH}/systemSetups`;

export const SALES_PAYMENTS_LEDGER_COLLECTION_PATH = `${BASE_DOC_PATH}/salesPaymentsLedger`;
export const SALES_COLLECTION_PATH = `${BASE_DOC_PATH}/salesInvoices`;

export const DONATIONS_COLLECTION_PATH = `${BASE_DOC_PATH}/donations`;








// Navigation Configuration - THIS WAS MISSING
// This object drives the entire sidebar navigation.
export const navConfig = [
    // 1. Dashboard - Blue (Overview/Home)
    {
        type: "link",
        label: "Dashboard",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="text-blue-500"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>`,
        viewId: "dashboard-view",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead"]
    },
    
    // 2. Product Management - Purple (Inventory)
    {
        type: "link",
        label: "Product Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="text-purple-500"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" /></svg>`,
        viewId: "products-view",
        roles: ["admin", "inventory_manager"]
    },
    
    // 3. Sales Catalogue - Indigo (Catalog/Pricing)
    {
        type: "link",
        label: "Sales Catalogue",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="text-indigo-500"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>`,
        viewId: "sales-catalogue-view",
        roles: ["admin", "inventory_manager"]
    },
    
    // 4. Purchase Management - Orange (Procurement)
    {
        type: "link",
        label: "Purchase Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="text-orange-500"><path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" /></svg>`,
        viewId: "purchases-view",
        roles: ["admin", "inventory_manager"]
    },
    
    // 5. Sales Management - Green (Revenue/Sales)
    {
        type: "link",
        label: "Sales Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="text-green-500"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clip-rule="evenodd" /></svg>`,
        viewId: "sales-view",
        roles: ["admin", "sales_staff", "team_lead"]
    },
    
    // 6. Consignment Management - Teal (Distribution)
    {
        type: "link",
        label: "Consignment Mgmt",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="text-teal-500"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>`,
        viewId: "consignment-view",
        roles: ["admin", "team_lead", "sales_staff", "finance", "guest"]
    },
    
    // 7. Supplier Management - Amber (Vendors)
    {
        type: "link",
        label: "Supplier Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="text-amber-500"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>`,
        viewId: "suppliers-view",
        roles: ["admin", "finance"]
    },
    
    // 8. Payment Management - Emerald (Financial)
    {
        type: "link",
        label: "Payment Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="text-emerald-500"><path fill-rule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" /></svg>`,
        viewId: "payments-view",
        roles: ["admin", "finance"]
    },
    
    // 9. Admin Modules - Red (Settings/Admin)
    {
        type: "link",
        label: "Admin Modules",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="text-red-500"><path fill-rule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>`,
        viewId: "admin-modules-view",
        roles: ["admin"]
    },
    // 10. Reporting Modules -  (admin/finance)
    {
    type: "link",
    label: "Reports & Analytics",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>`,
    viewId: "reports-hub-view",
    roles: ["admin", "finance"]
    }   
];
