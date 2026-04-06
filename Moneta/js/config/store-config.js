const tastyTreatsQrCodeUrl = new URL("../../images/TTUIQRC.png", import.meta.url).href;

export const MONETA_STORE_CONFIG = {
    default: {
        companyName: "Tasty Treats",
        addressLine1: "1st Floor, 3rd Cross, New Byapanahally Extension",
        addressLine2: "Indiranagar, Bangalore - 560038",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560038",
        stateCode: "29",
        taxId: "GSTIN: 29AFTPV5130N1ZH, State: 29-Karnataka",
        email: "sscindiranagar@gmail.com",
        taxInfo: {
            cgstRate: 0,
            sgstRate: 0
        },
        paymentDetails: {
            bankName: "South Indian Bank",
            branch: "Bangalore Indira Nagar",
            accountNumber: "0000 0000 0000 0000",
            ifscCode: "BANK0000000",
            accountHolderName: "Default Account Holder",
            upiQRCodeUrl: tastyTreatsQrCodeUrl
        },
        terms: "Standard Terms: All Sales are Final."
    },
    "Church Store": {
        companyName: "Church Store",
        addressLine1: "1st Floor, 3rd Cross, New Byapanahally Extension",
        addressLine2: "Indiranagar, Bangalore - 560038",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560038",
        stateCode: "29",
        taxId: "GSTIN: 29AFTPV5130N1ZH, State: 29-Karnataka",
        email: "sscindiranagar@gmail.com",
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
        terms: "Standard Terms: All Sales are Final."
    },
    "Tasty Treats": {
        companyName: "Tasty Treats",
        addressLine1: "1st Floor, 3rd Cross, New Byapanahally Extension",
        addressLine2: "Indiranagar, Bangalore - 560038",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560038",
        stateCode: "29",
        taxId: "GSTIN: 29AFTPV5130N1ZH, State: 29-Karnataka",
        email: "sscindiranagar@gmail.com",
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
        terms: "Thank you for your generous support toward our dream of building a church. We are deeply grateful for your partnership in this mission. May you be richly blessed!"
    }
};
