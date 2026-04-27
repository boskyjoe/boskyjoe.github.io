const tastyTreatsQrCodeUrl = new URL("../../images/TTUIQRC.png", import.meta.url).href;

export const STORE_CONFIG_DOC_IDS = {
    churchStore: "church-store",
    tastyTreats: "tasty-treats"
};

export const DEFAULT_STORE_CONFIG_DOC_ID = STORE_CONFIG_DOC_IDS.tastyTreats;
export const DEFAULT_STORE_NAME = "Tasty Treats";
export const CONSIGNMENT_STORE_NAME = "Consignment";

export const MONETA_STORE_CONFIG_SEED = [
    {
        docId: STORE_CONFIG_DOC_IDS.churchStore,
        storeCode: "CHURCH_STORE",
        storeName: "Church Store",
        companyName: "Church Store",
        addressLine1: "1st Floor, 3rd Cross, New Byapanahally Extension",
        addressLine2: "Indiranagar, Bangalore - 560038",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560038",
        stateCode: "29",
        taxId: "GSTIN: 29AFTPV5130N1ZH, State: 29-Karnataka",
        email: "sscindiranagar@gmail.com",
        salePrefix: "CS",
        requiresCustomerAddress: false,
        isDefault: false,
        isActive: true,
        sortOrder: 1,
        taxInfo: {
            cgstRate: 0,
            sgstRate: 0
        },
        paymentDetails: {
            bankName: "South Indian Bank",
            branch: "Bangalore Indira Nagar",
            accountNumber: "0123 4567 8901 2345",
            ifscCode: "SIBL0000123",
            accountHolderName: "St. Sebastian's Church",
            upiQRCodeUrl: tastyTreatsQrCodeUrl
        },
        quoteTheme: {
            accent: "#143f66",
            accentSoft: "#edf4fb",
            accentStrong: "#0f3556",
            gradientStart: "#f7fafc",
            gradientEnd: "#e6eff8",
            badgeLabel: "Store Quote",
            channelLabel: "Church Store",
            title: "Customer Quote",
            strapline: "Prepared for direct store fulfilment"
        },
        terms: "Standard Terms: All Sales are Final."
    },
    {
        docId: STORE_CONFIG_DOC_IDS.tastyTreats,
        storeCode: "TASTY_TREATS",
        storeName: "Tasty Treats",
        companyName: "Tasty Treats",
        addressLine1: "1st Floor, 3rd Cross, New Byapanahally Extension",
        addressLine2: "Indiranagar, Bangalore - 560038",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560038",
        stateCode: "29",
        taxId: "GSTIN: 29AFTPV5130N1ZH, State: 29-Karnataka",
        email: "sscindiranagar@gmail.com",
        salePrefix: "TT",
        requiresCustomerAddress: true,
        isDefault: true,
        isActive: true,
        sortOrder: 2,
        taxInfo: {
            cgstRate: 0,
            sgstRate: 0
        },
        paymentDetails: {
            bankName: "South Indian Bank, Bangalore Indira Nagar",
            branch: "Indiranagar Branch, Bangalore",
            accountNumber: "0399073000000912",
            ifscCode: "SIBL0000399",
            accountHolderName: "Tasty Treats",
            upiQRCodeUrl: tastyTreatsQrCodeUrl
        },
        quoteTheme: {
            accent: "#9a3412",
            accentSoft: "#fff1e8",
            accentStrong: "#7c2d12",
            gradientStart: "#fff7ed",
            gradientEnd: "#ffedd5",
            badgeLabel: "Direct Sales",
            channelLabel: "Tasty Treats",
            title: "Customer Quote",
            strapline: "Fresh product quote for direct store sales"
        },
        terms: "Thank you for your generous support toward our dream of building a church. We are deeply grateful for your partnership in this mission. May you be richly blessed!"
    }
];
