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



export const DONATION_SOURCES = {
    // Direct store sales overpayments
    DIRECT_SALES_CHURCH: 'Direct Sales - Church Store',
    DIRECT_SALES_TASTY: 'Direct Sales - Tasty Treats',
    
    // Consignment-related donations
    CONSIGNMENT_OVERPAYMENT: 'Consignment Team Payment',
    CONSIGNMENT_SETTLEMENT: 'Consignment Settlement Donation',
    
    // Payment overpayments
    POS_OVERPAYMENT: 'POS Transaction Overpayment',
    INVOICE_OVERPAYMENT: 'Invoice Payment Overpayment',
    
    // Manual entries
    MANUAL_DONATION: 'Manual Donation Entry',
    CASH_ROUNDING: 'Cash Rounding Donation',
    
    // Special events
    FUNDRAISING_EVENT: 'Fundraising Event',
    SEASONAL_CAMPAIGN: 'Seasonal Campaign',
    
    // Other sources
    ANONYMOUS_DONATION: 'Anonymous Donation',
    SUPPLIER_CREDIT: 'Supplier Credit/Refund'
};

// ✅ ADD: Helper function to get donation source by store
export function getDonationSourceByStore(storeName) {
    switch (storeName) {
        case 'Church Store':
            return DONATION_SOURCES.DIRECT_SALES_CHURCH;
        case 'Tasty Treats':
            return DONATION_SOURCES.DIRECT_SALES_TASTY;
        default:
            return `Direct Sales - ${storeName}`;
    }
}





// Navigation Configuration - THIS WAS MISSING
// This object drives the entire sidebar navigation.
/*export const navConfig = [
    // 1. Dashboard - Blue (Overview/Home)
    {
        type: "link",
        label: "Dashboard",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-500">
            <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
            <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
        </svg>`,
        viewId: "dashboard-view",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead"]
    },
    
    // 2. Product Management - Purple (Inventory) - Box/Package with grid
    {
        type: "link",
        label: "Product Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-purple-500">
            <path d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375z" />
            <path fill-rule="evenodd" d="M3.087 9l.54 9.176A3 3 0 006.62 21h10.757a3 3 0 002.995-2.824L20.913 9H3.087zm6.163 3.75A.75.75 0 0110 12h4a.75.75 0 010 1.5h-4a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
        </svg>`,
        viewId: "products-view",
        roles: ["admin", "inventory_manager"]
    },
    
    // 3. Sales Catalogue - Indigo (Catalog/Pricing) - Price tags
    {
        type: "link",
        label: "Sales Catalogue",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-indigo-500">
            <path fill-rule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39 1.186 3.548.428a18.849 18.849 0 005.441-5.44c.758-1.16.492-2.629-.428-3.548l-9.58-9.581a3 3 0 00-2.122-.879H5.25zM6.375 7.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" clip-rule="evenodd" />
        </svg>`,
        viewId: "sales-catalogue-view",
        roles: ["admin", "inventory_manager"]
    },
    
    // 4. Purchase Management - Orange (Procurement) - Shopping cart with down arrow
    {
        type: "link",
        label: "Purchase Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-orange-500">
            <path d="M2.25 2.25a.75.75 0 000 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 00-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 000-1.5H5.378A2.25 2.25 0 017.5 15h11.218a.75.75 0 00.674-.421 60.358 60.358 0 002.96-7.228.75.75 0 00-.525-.965A60.864 60.864 0 005.68 4.509l-.232-.867A1.875 1.875 0 003.636 2.25H2.25zM3.75 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zM16.5 20.25a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" />
        </svg>`,
        viewId: "purchases-view",
        roles: ["admin", "inventory_manager"]
    },
    
    // 5. Sales Management - Green (Revenue/Sales) - Cash register/POS
    {
        type: "link",
        label: "Sales Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-green-500">
            <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 01-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004zM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 01-.921.42z" />
            <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v.816a3.836 3.836 0 00-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 01-.921-.421l-.879-.66a.75.75 0 00-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 001.5 0v-.81a4.124 4.124 0 001.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 00-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 00.933-1.175l-.415-.33a3.836 3.836 0 00-1.719-.755V6z" clip-rule="evenodd" />
        </svg>`,
        viewId: "sales-view",
        roles: ["admin", "sales_staff", "team_lead"]
    },
    
    // 6. Consignment Management - Teal (Distribution) - Delivery truck
    {
        type: "link",
        label: "Consignment Mgmt",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-teal-500">
            <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875h.375a3 3 0 116 0h3a.75.75 0 00.75-.75V15z" />
            <path d="M8.25 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0zM15.75 6.75a.75.75 0 00-.75.75v11.25c0 .087.015.17.042.248a3 3 0 015.958.464c.853-.175 1.522-.935 1.464-1.883a18.659 18.659 0 00-3.732-10.104 1.837 1.837 0 00-1.47-.725H15.75z" />
            <path d="M19.5 19.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
        </svg>`,
        viewId: "consignment-view",
        roles: ["admin", "team_lead", "sales_staff", "finance", "guest"]
    },
    
    // 7. Supplier Management - Amber (Vendors) - Building/storefront
    {
        type: "link",
        label: "Supplier Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-amber-500">
            <path d="M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 007.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 004.902-5.652l-1.3-1.299a1.875 1.875 0 00-1.325-.549H5.223z" />
            <path fill-rule="evenodd" d="M3 20.25v-8.755c1.42.674 3.08.673 4.5 0A5.234 5.234 0 009.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 002.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.675 4.5.001v8.755h.75a.75.75 0 010 1.5H2.25a.75.75 0 010-1.5H3zm3-6a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-3zm8.25-.75a.75.75 0 00-.75.75v5.25c0 .414.336.75.75.75h3a.75.75 0 00.75-.75v-5.25a.75.75 0 00-.75-.75h-3z" clip-rule="evenodd" />
        </svg>`,
        viewId: "suppliers-view",
        roles: ["admin", "finance"]
    },
    
    // 8. Payment Management - Emerald (Financial) - Credit card
    {
        type: "link",
        label: "Payment Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-emerald-500">
            <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
            <path fill-rule="evenodd" d="M22.5 9.75h-21v7.5a3 3 0 003 3h15a3 3 0 003-3v-7.5zm-18 3.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5h3a.75.75 0 000-1.5h-3z" clip-rule="evenodd" />
        </svg>`,
        viewId: "pmt-mgmt-view",
        roles: ["admin", "finance"]
    },
    
    // 9. Admin Modules - Red (Settings/Admin) - Cog/Settings
    {
        type: "link",
        label: "Admin Modules",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-red-500">
            <path fill-rule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clip-rule="evenodd" />
        </svg>`,
        viewId: "admin-modules-view",
        roles: ["admin"]
    },
    
    // 10. Reports & Analytics - Pink (Analytics) - Bar chart ascending
    {
        type: "link",
        label: "Reports & Analytics",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-pink-500">
            <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
        </svg>`,
        viewId: "reports-hub-view",
        roles: ["admin", "finance"]
    }
]; */

// BONUS: Alternative icon set using outline style (if you prefer)
export const navConfigOutline = [
    // 1. Dashboard - Outline style
    {
        type: "link",
        label: "Dashboard",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-blue-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>`,
        viewId: "dashboard-view",
        roles: ["admin", "inventory_manager", "sales_staff", "finance", "team_lead"]
    },
    
    // 2. Product Management - Outline
    {
        type: "link",
        label: "Product Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-purple-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>`,
        viewId: "products-view",
        roles: ["admin", "inventory_manager"]
    },
    
    // 3. Sales Catalogue - Outline
    {
        type: "link",
        label: "Sales Catalogue",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-indigo-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>`,
        viewId: "sales-catalogue-view",
        roles: ["admin", "inventory_manager"]
    },
    
    // 4. Purchase Management - Outline
    {
        type: "link",
        label: "Purchase Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-orange-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>`,
        viewId: "purchases-view",
        roles: ["admin", "inventory_manager"]
    },
    
    // 5. Sales Management - Outline
    {
        type: "link",
        label: "Sales Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-green-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`,
        viewId: "sales-view",
        roles: ["admin", "sales_staff", "team_lead"]
    },
    
    // 6. Consignment - Outline
    {
        type: "link",
        label: "Consignment Mgmt",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-teal-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>`,
        viewId: "consignment-view",
        roles: ["admin", "team_lead", "sales_staff", "finance", "guest"]
    },
    
    // 7. Supplier - Outline
    {
        type: "link",
        label: "Supplier Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-amber-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
        </svg>`,
        viewId: "suppliers-view",
        roles: ["admin", "finance"]
    },
    
    // 8. Payment - Outline
    {
        type: "link",
        label: "Payment Management",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-emerald-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>`,
        viewId: 'pmt-mgmt-view',  
        roles: ["admin", "finance"]
    },
    
    // 9. Admin - Outline
    {
        type: "link",
        label: "Admin Modules",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-red-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124-.072.044-.146.087-.22.128-.332.183-.582.495-.644.869l-.214 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>`,
        viewId: "admin-modules-view",
        roles: ["admin"]
    },
    
    // 10. Reports - Outline
    {
        type: "link",
        label: "Reports & Analytics",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-pink-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>`,
        viewId: "reports-hub-view",
        roles: ["admin", "finance"]
    }
];
