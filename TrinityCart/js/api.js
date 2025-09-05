import { SUPPLIERS_COLLECTION_PATH } from './config.js';
import { CATEGORIES_COLLECTION_PATH } from './config.js';
import { SALE_TYPES_COLLECTION_PATH } from './config.js';


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
