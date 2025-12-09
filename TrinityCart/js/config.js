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

export const EXPENSES_COLLECTION_PATH = `${BASE_DOC_PATH}/expenses`;



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


export const storeConfig = {
    // Default or fallback information
    'default': {
        companyName:'Tasty Treats',
        address: '1st Floor,3rd Cross, New Byapanahally Extension, Indiranagar, Bangalore - 560038',
        taxId: 'GSTIN: 29AFTPV5130N1ZH, State: 29-Karnataka',
        signatoryName: 'Ms. Mary Joseph',
        signatoryTitle: 'Proprietor, Tasty Treats',
        email:'sscindiranagar@gmail.com',
        paymentDetails: {
            bankName: 'Default Bank Name',
            branch:'Bangalore Indira Nagar' ,
            accountNumber: '0000 0000 0000 0000',
            ifscCode: 'BANK0000000',
            accountHolderName: 'Default Account Holder',
            upiQRCodeUrl: './images/TTUIQRC.png' // A placeholder QR code
        },
        terms:'Standard Terms:All Sales are Final'        
    },
    // Specific details for Church Store
    'Church Store': {
        companyName:'Church Store',
        address: '1st Floor,3rd Cross, New Byapanahally Extension, Indiranagar, Bangalore - 560038',
        taxId: 'GSTIN: 29AFTPV5130N1ZH, State: 29-Karnataka',
        signatoryName: 'Ms. Mary Joseph',
        signatoryTitle: 'Proprietor, Tasty Treats',
        email:'sscindiranagar@gmail.com',
        paymentDetails: {
            bankName: 'South Indian Bank',
            branch:'Bangalore Indira Nagar' ,
            accountNumber: '0123 4567 8901 2345',
            ifscCode: 'SIBL0000123',
            accountHolderName: 'St. Sebastian\'s Church',
            upiQRCodeUrl: './images/TTUIQRC.png' // URL to the QR code image
        },
        terms:'Standard Terms:All Sales are Final'
    },
    // Specific details for Tasty Treats
    'Tasty Treats': {
        companyName:'Tasty Treats',
        address: '1st Floor,3rd Cross, New Byapanahally Extension, Indiranagar, Bangalore - 560038',
        taxId: 'GSTIN: 29AFTPV5130N1ZH, State: 29-Karnataka',
        signatoryName: 'Ms. Mary Joseph',
        signatoryTitle: 'Proprietor, Tasty Treats',
        email:'sscindiranagar@gmail.com',
        taxInfo: {
            cgstRate: 0, // Central GST as a percentage (e.g., 9 for 9%)
            sgstRate: 0  // State GST as a percentage (e.g., 9 for 9%)
        },
        paymentDetails: {
            bankName: 'South Indian Bank, Bangalore Indira Nagar',
            branch:'Indiranagar Branch, Bangalore' ,
            accountNumber: '0399073000000912',
            ifscCode: 'SIBL0000399',
            accountHolderName: 'Tasty Treats',
            upiQRCodeUrl: './images/TTUIQRC.png' // URL to the QR code image
        },
        terms:'Thank you for your generous support toward our dream of building a church. We are deeply grateful for your partnership in this mission. May you be richly blessed!'
    }
};


export const expenseTypes = [
    'Operational',
    'Marketing',
    'Utilities',
    'Salaries & Wages',
    'Rent',
    'Food',
    'Supplies',
    'Travel',
    'Other'
];

export const productType = [
    'Standard',
    'Custom'
] ;

export const saleTypeOptions = [
    { value: 'Revenue', label: 'Revenue Sale' },
    { value: 'Sample', label: 'Sample / Non-Revenue' }
];

export const EXPENSE_RECEIPTS_STORAGE_PATH = 'MONETA/expense_receipts/';


export const imageKitConfig = {
    publicKey: "public_c36ykO3NmGBX4Hf/e4mPAX3lBiE=",
    urlEndpoint: "https://ik.imagekit.io/MONETA"
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


export const creditTermOptions = [
    { value: 'Net 30', label: 'Net 30 - Payment due within 30 days' },
    { value: 'Net 60', label: 'Net 60 - Payment due within 60 days' },
    { value: 'Net 90', label: 'Net 90 - Payment due within 90 days' },
    { value: 'COD', label: 'Cash on Delivery (COD)' },
    { value: 'PIA', label: 'Payment in Advance (PIA)' },
    { value: 'CBS', label: 'Cash Before Shipment (CBS)' },
    { value: 'Due on Receipt', label: 'Due on Receipt' }
];






// BONUS: Alternative icon set using outline style (if you prefer)
export const navConfig = [
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
        roles: ["admin", "sales_staff", "team_lead","guest","inventory_manager"]
    },
    
    // 6. Consignment - Outline
    {
        type: "link",
        label: "Consignment Mgmt",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-teal-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>`,
        viewId: "consignment-view",
        roles: ["admin", "team_lead", "sales_staff", "finance", "guest","inventory_manager"]
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
    // 9. Expenses 
    {
        type: "link",
        label: "Log Expenses",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-cyan-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm-9-3h.008v.008H6V7.5z" />
        </svg>`,
        viewId: "expenses-view", // This must match the ID of the view div we created
        roles: ["admin", "finance"]
    },
    
    // 10. Admin - Outline
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
    
    // 11. Reports - Outline
    {
        type: "link",
        label: "Reports & Analytics",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="text-pink-500">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>`,
        viewId: "reports-hub-view",
        roles: ["admin"]
    }
];
