import { SUPPLIERS_COLLECTION_PATH } from './config.js';
import { CATEGORIES_COLLECTION_PATH } from './config.js';
import { SALE_TYPES_COLLECTION_PATH } from './config.js';
import { PRODUCTS_CATALOGUE_COLLECTION_PATH } from './config.js';

import { PAYMENT_MODES_COLLECTION_PATH } from './config.js';
import { SEASONS_COLLECTION_PATH } from './config.js';
import { USERS_COLLECTION_PATH } from './config.js';
import { EVENTS_COLLECTION_PATH } from './config.js';

import { PURCHASE_INVOICES_COLLECTION_PATH, SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH } from './config.js';


// This file will contain all functions that interact with the backend.
// For now, they return mock data instantly.

export async function fetchProducts() {
    console.log("MOCK API: Fetching products...");
    return [
        { productID: 'P001', productName: 'Christmas Cake Slice', sellingPrice: 3.00, sourceItem: 'CAKE-1KG', conversion: 10 },
        { productID: 'P002', productName: 'Whole Christmas Cake', sellingPrice: 25.00, sourceItem: 'CAKE-1KG', conversion: 1 },
        { productID: 'P003', productName: 'Kerala Saree', sellingPrice: 50.00, sourceItem: 'SAREE-BOLT', conversion: 1 },
    ];
}

export async function fetchMemberConsignments() {
    console.log("MOCK API: Fetching member's current items...");
    return [
        { productID: 'P001', productName: 'Christmas Cake Slice', quantityHeld: 8 },
        { productID: 'P003', productName: 'Kerala Saree', quantityHeld: 1 },
    ];
}

// Add these new functions to js/api.js

export async function getVendors() {
    try {
        const response = await fetch(`${API_URL}?action=getVendors`);
        
        // Add response status check
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned HTML instead of JSON - check your deployment');
        }
        
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch vendors:", error);
        return []; // Return empty array as fallback
    }
}

async function postData(action, data, userEmail) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, data, userEmail }),
        });
        
        // Add response status check
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned HTML instead of JSON - check your deployment');
        }
        
        const result = await response.json();
        
        // Log successful operations for debugging
        if (result.success) {
            console.log(`✅ ${action} completed successfully`);
        } else {
            console.warn(`⚠️ ${action} failed:`, result.error || result.message);
        }
        
        return result;
    } catch (error) {
        console.error(`Action ${action} failed:`, error);
        return { success: false, error: error.message };
    }
}

export async function addVendor(vendorData, userEmail) {
    // Basic validation
    if (!vendorData?.vendorName || !userEmail) {
        console.error('Missing required fields for addVendor');
        return { success: false, error: 'vendorName and userEmail are required' };
    }
    
    return postData('addVendor', vendorData, userEmail);
}

export async function updateVendor(vendorData, userEmail) {
    // Basic validation
    if (!vendorData?.vendorId || !userEmail) {
        console.error('Missing required fields for updateVendor');
        return { success: false, error: 'vendorId and userEmail are required' };
    }
    
    return postData('updateVendor', vendorData, userEmail);
}

export async function setVendorStatus(vendorId, isActive, userEmail) {
    // Basic validation
    if (!vendorId || typeof isActive !== 'boolean' || !userEmail) {
        console.error('Missing or invalid fields for setVendorStatus');
        return { success: false, error: 'vendorId, isActive (boolean), and userEmail are required' };
    }
    
    return postData('setVendorStatus', { vendorId, isActive }, userEmail);
}

// Utility function to test your API connection
export async function testAPI() {
    console.log('🔍 Testing API connection...');
    console.log('API URL:', API_URL);
    
    const vendors = await getVendors();
    
    if (Array.isArray(vendors)) {
        console.log(`✅ API working! Found ${vendors.length} vendors`);
        return true;
    } else {
        console.log('❌ API test failed');
        return false;
    }
}




// --- SUPPLIER API FUNCTIONS ---

export async function getSuppliers() {
    console.log("[api.js] getSuppliers() called.");
    const db = firebase.firestore();
    try {
        // Use the new path constant
        const snapshot = await db.collection(SUPPLIERS_COLLECTION_PATH).orderBy('supplierName').get();
        const suppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[api.js] Firestore returned ${suppliers.length} suppliers.`, suppliers);
        return suppliers ;
    } catch (error) {
        console.error("[api.js] Error fetching suppliers from Firestore:", error);
        throw error;
    }
}

export async function addSupplier(supplierData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const supplierId = `SUP-${Date.now()}`;

    // Use the new path constant
    return db.collection(SUPPLIERS_COLLECTION_PATH).add({
        ...supplierData,
        supplierId: supplierId,
        isActive: true,
        hasActivePurchases: false,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now,
    });
}


export async function updateSupplier(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    // Use the new path constant
    return db.collection(SUPPLIERS_COLLECTION_PATH).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now,
    });
}


export async function setSupplierStatus(docId, newStatus, user) {
    const db = firebase.firestore();
    // This is a simplified call. The real business logic will be in the event handler.
    return updateSupplier(docId, { isActive: newStatus }, user);
}


// --- CATEGORY API FUNCTIONS ---

export async function getCategories() {
    const db = firebase.firestore();
    try {
        // Use the correct, nested path
        const snapshot = await db.collection(CATEGORIES_COLLECTION_PATH).orderBy('categoryName').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching categories:", error);
        throw error;
    }
}

export async function addCategory(categoryName, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const categoryId = `CAT-${Date.now()}`;

    // Use the correct, nested path
    return db.collection(CATEGORIES_COLLECTION_PATH).add({
        categoryId: categoryId,
        categoryName: categoryName,
        isActive: true,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function updateCategory(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    // Use the correct, nested path
    return db.collection(CATEGORIES_COLLECTION_PATH).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function setCategoryStatus(docId, newStatus, user) {
    return updateCategory(docId, { isActive: newStatus }, user);
}



// --- SALE TYPE API FUNCTIONS ---

export async function getSaleTypes() {
    const db = firebase.firestore();
    try {
        const snapshot = await db.collection(SALE_TYPES_COLLECTION_PATH).orderBy('saleTypeName').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching sale types:", error);
        throw error;
    }
}

export async function addSaleType(saleTypeName, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const saleTypeId = `ST-${Date.now()}`;

    return db.collection(SALE_TYPES_COLLECTION_PATH).add({
        saleTypeId: saleTypeId,
        saleTypeName: saleTypeName,
        isActive: true,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function updateSaleType(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return db.collection(SALE_TYPES_COLLECTION_PATH).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function setSaleTypeStatus(docId, newStatus, user) {
    return updateSaleType(docId, { isActive: newStatus }, user);
}


// --- PAYMENT MODE API FUNCTIONS ---

export async function getPaymentModes() {
    const db = firebase.firestore();
    console.log("api.js:getPaymentModes") ;
    try {
        const snapshot = await db.collection(PAYMENT_MODES_COLLECTION_PATH).orderBy('paymentMode').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching payment mode:", error);
        throw error;
    }
}

export async function addPaymentMode(modeName, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentTypeId = `PM-${Date.now()}`;
    return db.collection(PAYMENT_MODES_COLLECTION_PATH).add({
        paymentTypeId: paymentTypeId,
        paymentMode: modeName,
        isActive: true,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function updatePaymentMode(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return db.collection(PAYMENT_MODES_COLLECTION_PATH).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function setPaymentModeStatus(docId, newStatus, user) {
    return updatePaymentMode(docId, { isActive: newStatus }, user);
}


// --- SALES SEASON API FUNCTIONS ---

export async function getSeasons() {
    const db = firebase.firestore();
    console.log("api.js:getSeasons") ;
    try {
        const snapshot = await db.collection(SEASONS_COLLECTION_PATH).orderBy('startDate', 'desc').get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching Seasons:", error);
        throw error;
    }
    
    
}

export async function addSeason(seasonData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const seasonId = `SEASON-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    return db.collection(SEASONS_COLLECTION_PATH).add({
        ...seasonData,
        seasonId: seasonId,
        status: 'Upcoming', // Default status
        isActive: true,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function updateSeason(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return db.collection(SEASONS_COLLECTION_PATH).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function setSeasonStatus(docId, newStatus, user) {
    return updateSeason(docId, { isActive: newStatus }, user);
}



// --- SALES EVENT API FUNCTIONS ---

export async function getSalesEvents() {
    const db = firebase.firestore();
    console.log("api.js:getSalesEvents") ;

    try {
        const snapshot = await db.collection(EVENTS_COLLECTION_PATH).orderBy('eventStartDate', 'desc').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
         console.error("Error fetching Sales Event:", error);
        throw error;
    }
    
}

export async function addSalesEvent(eventData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const eventId = `EVENT-${Date.now()}`;

    return db.collection(EVENTS_COLLECTION_PATH).add({
        ...eventData,
        eventId: eventId,
        isActive: true,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function updateSalesEvent(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return db.collection(EVENTS_COLLECTION_PATH).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now,
    });
}

export async function setSalesEventStatus(docId, newStatus, user) {
    return updateSalesEvent(docId, { isActive: newStatus }, user);
}











// --- USER MANAGEMENT API FUNCTIONS ---


export async function getUsersWithRoles() {
    const db = firebase.firestore();
    console.log("api.js:getUsersWithRoles") ;
    try {
        const snapshot = await db.collection(USERS_COLLECTION_PATH).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching user roles:", error);
        throw error;
    }
}

/**
 * Creates or updates a user's role document in Firestore.
 * This is an "upsert" operation.
 * @param {string} uid - The Firebase Auth UID of the user.
 * @param {string} email - The user's email.
 * @param {string} displayName - The user's name.
 * @param {string} role - The role to assign.
 * @param {object} adminUser - The admin performing the action.
 */
export async function provisionUserRole(uid, email, displayName, role, adminUser) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const userDocRef = db.collection(USERS_COLLECTION_PATH).doc(uid);

    return userDocRef.set({
        uid: uid,
        email: email,
        displayName: displayName,
        role: role,
        isActive: true,
        createdBy: adminUser.email,
        createdOn: now,
        updatedBy: adminUser.email,
        updatedOn: now,
    }, { merge: true }); // { merge: true } prevents overwriting fields if the doc already exists
}

export async function updateUserRole(uid, newRole, adminUser) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return db.collection(USERS_COLLECTION_PATH).doc(uid).update({
        role: newRole,
        updatedBy: adminUser.email,
        updatedOn: now,
    });
}

export async function setUserActiveStatus(uid, newStatus, adminUser) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return db.collection(USERS_COLLECTION_PATH).doc(uid).update({
        isActive: newStatus,
        updatedBy: adminUser.email,
        updatedOn: now,
    });
}














// --- PRODUCT CATALOGUE API FUNCTIONS ---

export async function getProducts() {
    const db = firebase.firestore();
    try {
        const snapshot = await db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).orderBy('itemName').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching products:", error);
        throw error;
    }
}

export async function addProduct(productData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const itemId = `ITEM-${Date.now()}`;

    return db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).add({
        ...productData,
        itemId: itemId,
        isActive: true,
        isReadyForSale: true, 
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updateDate: now, // Note: field name from SRS
    });
}

export async function updateProduct(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updateDate: now,
    });
}

export async function setProductStatus(docId, field, newStatus, user) {
    // This function can toggle 'isActive' or 'isReadyForSale'
    return updateProduct(docId, { [field]: newStatus }, user);
}




// --- PURCHASE INVOICE API FUNCTION ---

export async function addPurchaseInvoice(invoiceData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const invoiceId = `PI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    return db.collection(PURCHASE_INVOICES_COLLECTION_PATH).add({
        ...invoiceData,
        invoiceId: invoiceId,
        amountPaid: 0, // Invoices always start as unpaid
        balanceDue: invoiceData.invoiceTotal,
        paymentStatus: 'Unpaid',
        audit: {
            createdBy: user.email,
            createdOn: now,
            updatedBy: user.email,
            updatedOn: now,
        }
    });
}

export async function getPurchaseInvoices() {
    const db = firebase.firestore();
    const snapshot = await db.collection(PURCHASE_INVOICES_COLLECTION_PATH).orderBy('purchaseDate', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getPaymentsForInvoice(invoiceId) {
    const db = firebase.firestore();
    const snapshot = await db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
        .where('relatedInvoiceId', '==', invoiceId)
        .orderBy('paymentDate', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getPurchaseInvoiceById(docId) {
    const db = firebase.firestore();
    const docRef = db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(docId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        throw new Error("Invoice not found!");
    }
}

// We also need an `updatePurchaseInvoice` function
export async function updatePurchaseInvoice(docId, invoiceData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    return db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(docId).update({
        ...invoiceData,
        'audit.updatedBy': user.email,
        'audit.updatedOn': now,
    });
}
