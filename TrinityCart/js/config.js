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
export const SALES_COLLECTION_PATH = `${BASE_DOC_PATH}/salesInvoices`;


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




// Navigation Configuration - THIS WAS MISSING
// This object drives the entire sidebar navigation.
export const navConfig = [
    // 1. Dashboard
    {
        type: "link",
        label: "Dashboard",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" /></svg>`,
        viewId: "dashboard-view",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead"]
    },
    // 2. Product Management
    {
        type: "link",
        label: "Product Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM4 8h5v2H4V8z" clip-rule="evenodd" /></svg>`,
        viewId: "products-view",
        roles: ["admin", "inventory_manager"]
    },
    // NEW: Sales Catalogue Management
    {
        type: "link",
        label: "Sales Catalogue",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.586l-1.22-1.22a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l2.5-2.5a.75.75 0 10-1.06-1.06l-1.22 1.22V2.75z" /><path d="M3.5 9.75a.75.75 0 01.75-.75h11.5a.75.75 0 010 1.5H4.25a.75.75 0 01-.75-.75zM3 13.25a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" /></svg>`,
        viewId: "sales-catalogue-view",
        roles: ["admin", "inventory_manager"]
    },
    // 3. Purchase Management
    {
        type: "link",
        label: "Purchase Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>`,
        viewId: "purchases-view",
        roles: ["admin", "inventory_manager"]
    },
    // 4. Sales Management
    {
        type: "link",
        label: "Sales Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg>`,
        viewId: "sales-view",
        roles: ["admin", "sales_staff", "team_lead"]
    },
    // 5. Supplier Management
    {
        type: "link",
        label: "Supplier Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1-1h-1a1 1 0 00-1 1v5a1 1 0 001 1h1a1 1 0 001-1V7z" /></svg>`,
        viewId: "suppliers-view",
        roles: ["admin", "finance"]
    },
    // 6. Payment Management
    {
        type: "link",
        label: "Payment Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd" /></svg>`,
        viewId: "payments-view",
        roles: ["admin", "finance"]
    },
    // 7. Admin Modules
    {
        type: "link",
        label: "Admin Modules",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.49 3.17a1 1 0 00-1.414 0l-7 7a1 1 0 000 1.414l7 7a1 1 0 001.414-1.414L6.414 11H17a1 1 0 100-2H6.414l4.076-4.076a1 1 0 000-1.414z" clip-rule="evenodd" /></svg>`,
        viewId: "admin-modules-view",
        roles: ["admin"]
    }
];
