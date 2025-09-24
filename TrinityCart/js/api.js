import { SUPPLIERS_COLLECTION_PATH } from './config.js';
import { CATEGORIES_COLLECTION_PATH } from './config.js';
import { SALE_TYPES_COLLECTION_PATH } from './config.js';
import { PRODUCTS_CATALOGUE_COLLECTION_PATH } from './config.js';

import { PAYMENT_MODES_COLLECTION_PATH } from './config.js';
import { SEASONS_COLLECTION_PATH } from './config.js';
import { USERS_COLLECTION_PATH } from './config.js';
import { EVENTS_COLLECTION_PATH } from './config.js';

import { PURCHASE_INVOICES_COLLECTION_PATH, SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH } from './config.js';

import { SALES_CATALOGUES_COLLECTION_PATH } from './config.js';





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

// --- SUPPLIER PAYMENT API FUNCTION ---

export async function addSupplierPayment(paymentData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH).add({
        ...paymentData,
        audit: {
            createdBy: user.email,
            createdOn: now,
        }
    });
}

/**
 * Records a new supplier payment AND updates the corresponding purchase invoice
 * within a single, atomic transaction.
 * @param {object} paymentData - The data for the new payment document.
 * @param {object} user - The currently authenticated user object.
 * @returns {Promise<void>}
 */
export async function recordPaymentAndUpdateInvoice(paymentData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // 1. Get references to the two documents we need to work with.
    const invoiceRef = db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(paymentData.relatedInvoiceId);
    const newPaymentRef = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH).doc(); // Creates a ref with a new auto-generated ID

    // 2. Run the transaction.
    return db.runTransaction(async (transaction) => {
        // READ: Get the current state of the invoice first.
        const invoiceDoc = await transaction.get(invoiceRef);
        if (!invoiceDoc.exists) {
            throw new Error("Invoice document does not exist!");
        }

        const invoiceData = invoiceDoc.data();
        const amountBeingPaid = paymentData.amountPaid;

        // CALCULATE: Determine the new totals and status.
        const newAmountPaid = (invoiceData.amountPaid || 0) + amountBeingPaid;
        const newBalanceDue = invoiceData.invoiceTotal - newAmountPaid;
        let newPaymentStatus = "Partially Paid";
        if (newBalanceDue <= 0) {
            newPaymentStatus = "Paid";
        }

        // WRITE 1: Update the invoice document.
        transaction.update(invoiceRef, {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            paymentStatus: newPaymentStatus,
            'audit.updatedBy': user.email, // Also update the audit trail
            'audit.updatedOn': now,
        });

        // WRITE 2: Create the new payment ledger document.
        transaction.set(newPaymentRef, {
            ...paymentData,
            audit: {
                createdBy: user.email,
                createdOn: now,
            }
        });
    });
}


/**
 * Deletes a supplier payment AND reverses the amount on the corresponding invoice
 * within a single, atomic transaction.
 * @param {string} paymentId - The document ID of the payment to delete.
 * @param {object} user - The currently authenticated user object.
 * @returns {Promise<void>}
 */
export async function deletePaymentAndUpdateInvoice(paymentId, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // 1. Get a reference to the payment document we intend to delete.
    const paymentRef = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId);

    // 2. Run the transaction.
    return db.runTransaction(async (transaction) => {
        // READ 1: Get the payment document to find out how much was paid and which invoice it belongs to.
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists) {
            throw new Error("Payment document not found. It may have already been deleted.");
        }
        const paymentData = paymentDoc.data();
        const amountToDelete = paymentData.amountPaid;
        const relatedInvoiceId = paymentData.relatedInvoiceId;

        // READ 2: Get the corresponding invoice document.
        const invoiceRef = db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(relatedInvoiceId);
        const invoiceDoc = await transaction.get(invoiceRef);
        if (!invoiceDoc.exists) {
            throw new Error(`Related invoice document ${relatedInvoiceId} does not exist!`);
        }
        const invoiceData = invoiceDoc.data();

        // CALCULATE: Determine the new totals and status by reversing the payment.
        const newAmountPaid = invoiceData.amountPaid - amountToDelete;
        const newBalanceDue = invoiceData.balanceDue + amountToDelete;
        let newPaymentStatus = "Partially Paid";
        if (newAmountPaid <= 0) {
            newPaymentStatus = "Unpaid";
        } else if (newBalanceDue <= 0) {
            newPaymentStatus = "Paid";
        }

        // WRITE 1: Update the invoice with the reversed amounts.
        transaction.update(invoiceRef, {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            paymentStatus: newPaymentStatus,
            'audit.updatedBy': user.email,
            'audit.updatedOn': now,
        });

        // WRITE 2: Delete the actual payment document.
        transaction.delete(paymentRef);
    });
}


// =======================================================
// --- SALES CATALOGUE API FUNCTIONS ---
// =======================================================

/**
 * Finds the most recent purchase price for a given product ID using an
 * efficient, indexed query.
 * @param {string} productId - The document ID of the product from the productCatalogue.
 * @returns {Promise<number|null>} The latest price, or null if no purchase history is found.
 */

export async function getLatestPurchasePrice(productId) {
    const db = firebase.firestore();

    // This is the highly efficient query.
    // It finds only invoices containing the product, sorts by newest first, and gets only the top one.
    const invoicesQuery = db.collection(PURCHASE_INVOICES_COLLECTION_PATH)
                            .where('productIds', 'array-contains', productId) // Query the new simple array
                            .orderBy('purchaseDate', 'desc')
                            .limit(1);
    try {
        const snapshot = await invoicesQuery.get();

        if (snapshot.empty) {
            // No purchase history found for this product.
            console.warn(`No purchase history found for product ID: ${productId}`);
            return null;
        }

        // We only have one document in the snapshot.
        const latestInvoice = snapshot.docs[0].data();
        
        // Find the specific line item within that one invoice.
        const foundItem = latestInvoice.lineItems.find(item => item.masterProductId === productId);

        if (foundItem) {
            console.log(`Found latest price for ${productId} in invoice ${latestInvoice.invoiceId}: ${foundItem.unitPurchasePrice}`);
            return foundItem.unitPurchasePrice;
        } else {
            // This case is unlikely but possible if data is inconsistent.
            return null;
        }

    } catch (error) {
        // IMPORTANT: The first time you run this, Firestore will log an error
        // with a link to create the required composite index. You MUST click that link.
        console.error("Error in getLatestPurchasePrice. This may be an indexing issue.", error);
        console.error("If the error message includes a link to create an index, please click it in the Firebase console.");
        throw error; // Re-throw the error so the calling function knows something went wrong.
    }
}

/**
 * Creates a new Sales Catalogue document.
 * @param {object} catalogueData - Data for the new catalogue (name, seasonId, etc.).
 * @param {object} user - The currently authenticated user.
 */

export async function addSalesCatalogue(catalogueData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const catalogueId = `SC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // This is a single write operation. (Cost: 1 write)
    return db.collection(SALES_CATALOGUES_COLLECTION_PATH).add({
        ...catalogueData,
        catalogueId: catalogueId,
        isActive: true,
        audit: { createdBy: user.email, createdOn: now, updatedBy: user.email, updatedOn: now }
    });
}

export async function getSalesCatalogues() {
    const db = firebase.firestore();
    const snapshot = await db.collection(SALES_CATALOGUES_COLLECTION_PATH).orderBy('catalogueName').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * [NEWLY ADDED] Updates the top-level data for an existing Sales Catalogue document.
 * @param {string} docId - The Firestore document ID of the catalogue to update.
 * @param {object} updatedData - The fields to update (e.g., { catalogueName, seasonId }).
 * @param {object} user - The currently authenticated user.
 */

export async function updateSalesCatalogue(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const catalogueRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(docId);

    // This is a single, efficient write operation.
    return catalogueRef.update({
        ...updatedData,
        'audit.updatedBy': user.email,
        'audit.updatedOn': now,
    });
}



/**
 * Adds a single product item to a specific sales catalogue's 'items' sub-collection.
 * @param {string} catalogueId - The Firestore document ID of the parent catalogue.
 * @param {object} itemData - The complete data for the item to be added.
 */

export async function addItemToCatalogue(catalogueId, itemData) {
    const db = firebase.firestore();
    // This is a single write operation to a sub-collection. (Cost: 1 write)
    return db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(catalogueId).collection('items').add(itemData);
}

/**
 * Updates a specific item within a sales catalogue (e.g., when a price is overridden).
 * @param {string} catalogueId - The ID of the parent catalogue.
 * @param {string} itemId - The ID of the item document in the sub-collection.
 * @param {object} updatedData - The fields to update (e.g., { sellingPrice, isOverridden: true }).
 * @param {object} user - The currently authenticated user.
 */

export async function updateCatalogueItem(catalogueId, itemId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const itemRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(catalogueId).collection('items').doc(itemId);

    // This is a single write operation. (Cost: 1 write)
    return itemRef.update({
        ...updatedData,
        'audit.updatedBy': user.email,
        'audit.updatedOn': now
    });
}


/**
 * Removes a single product item from a sales catalogue.
 * @param {string} catalogueId - The ID of the parent catalogue.
 * @param {string} itemId - The ID of the item document to delete.
 */
export async function removeItemFromCatalogue(catalogueId, itemId) {
    const db = firebase.firestore();
    // This is a single delete operation. (Cost: 1 delete)
    return db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(catalogueId).collection('items').doc(itemId).delete();
}




