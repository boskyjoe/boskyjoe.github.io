// js/api.js


import { SUPPLIERS_COLLECTION_PATH } from './config.js';
import { CATEGORIES_COLLECTION_PATH } from './config.js';
import { SALE_TYPES_COLLECTION_PATH } from './config.js';
import { PRODUCTS_CATALOGUE_COLLECTION_PATH } from './config.js';

import { PAYMENT_MODES_COLLECTION_PATH } from './config.js';
import { SEASONS_COLLECTION_PATH } from './config.js';
import { USERS_COLLECTION_PATH } from './config.js';
import { EVENTS_COLLECTION_PATH } from './config.js';

import { PURCHASE_INVOICES_COLLECTION_PATH, SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH } from './config.js';

import { SALES_CATALOGUES_COLLECTION_PATH,
        CHURCH_TEAMS_COLLECTION_PATH,USER_TEAM_MEMBERSHIPS_COLLECTION_PATH,
        CONSIGNMENT_ORDERS_COLLECTION_PATH,
        CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH,SALES_COLLECTION_PATH,
    SALES_PAYMENTS_LEDGER_COLLECTION_PATH,DONATIONS_COLLECTION_PATH
} from './config.js';







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

/**
 * [NEW] Fetches all items for a specific sales catalogue.
 * @param {string} catalogueId - The ID of the parent sales catalogue.
 */
export async function getItemsForCatalogue(catalogueId) {
    const db = firebase.firestore();
    const itemsRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(catalogueId).collection('items');
    const snapshot = await itemsRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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


// =======================================================
// --- CHURCH TEAM MANAGEMENT API FUNCTIONS ---
// =======================================================

/**
 * [NEW] Fetches all member documents for a specific team.
 * @param {string} teamId - The Firestore document ID of the parent team.
 * @returns {Promise<Array<object>>} An array of member documents.
 */
export async function getMembersForTeam(teamId) {
    if (!teamId) return []; // Return empty if no teamId is provided
    const db = firebase.firestore();
    const membersRef = db.collection(CHURCH_TEAMS_COLLECTION_PATH).doc(teamId).collection('members');
    const snapshot = await membersRef.orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


/**
 * [NEW & EFFICIENT] Gets a user's team memberships from their dedicated record.
 * @param {string} userEmail - The email of the user to look up.
 * @returns {Promise<object|null>} The user's team membership document or null if not found.
 */
export async function getTeamsForUser(userEmail) {
    const db = firebase.firestore();
    const membershipDocId = userEmail.toLowerCase();
    const membershipRef = db.collection(USER_TEAM_MEMBERSHIPS_COLLECTION_PATH).doc(membershipDocId);
    
    const doc = await membershipRef.get();

    if (doc.exists) {
        return doc.data();
    } else {
        return null; // This user is not a member of any team.
    }
}


/**
 * Fetches all documents from the churchTeams collection.
 * @returns {Promise<Array<object>>} An array of team documents.
 */
export async function getChurchTeams() {
    const db = firebase.firestore();
    const snapshot = await db.collection(CHURCH_TEAMS_COLLECTION_PATH).orderBy('teamName').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Creates a new church team document.
 * @param {object} teamData - The data for the new team (e.g., { teamName, churchName }).
 * @param {object} user - The currently authenticated user.
 */
export async function addChurchTeam(teamData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const teamId = `TEAM-${Date.now()}`;

    return db.collection(CHURCH_TEAMS_COLLECTION_PATH).add({
        ...teamData,
        teamId: teamId,
        isActive: true, // Teams are active by default
        audit: {
            createdBy: user.email,
            createdOn: now,
            updatedBy: user.email,
            updatedOn: now,
        }
    });
}



/**
 * Updates a church team's main properties (e.g., name or active status).
 * @param {string} teamId - The Firestore document ID of the team to update.
 * @param {object} updatedData - The fields to update.
 * @param {object} user - The currently authenticated user.
 */
export async function updateChurchTeam(teamId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return db.collection(CHURCH_TEAMS_COLLECTION_PATH).doc(teamId).update({
        ...updatedData,
        'audit.updatedBy': user.email,
        'audit.updatedOn': now,
    });
}

// --- Team Member Sub-collection Functions ---

/**
 * Fetches all members for a specific team.
 * @param {string} teamId - The Firestore document ID of the parent team.
 * @returns {Promise<Array<object>>} An array of member documents.
 */
export async function getTeamMembers(teamId) {
    const db = firebase.firestore();
    const snapshot = await db.collection(CHURCH_TEAMS_COLLECTION_PATH).doc(teamId).collection('members').orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


/**
 * [NEW & TRANSACTIONAL] Adds a member to a team and updates that
 * user's profile to reflect their new team membership.
 * @param {string} teamId - The ID of the parent team.
 * @param {string} teamName - The name of the parent team.
 * @param {object} memberData - Data for the new member { name, email, phone, role }.
 * @param {object} user - The admin performing the action.
 */
export async function addTeamMember(teamId, teamName, memberData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const membershipDocId = memberData.email.toLowerCase();
    const membershipRef = db.collection(USER_TEAM_MEMBERSHIPS_COLLECTION_PATH).doc(membershipDocId);

    return db.runTransaction(async (transaction) => {
        const newMemberRef = db.collection(CHURCH_TEAMS_COLLECTION_PATH).doc(teamId).collection('members').doc();
        transaction.set(newMemberRef, {
            ...memberData,
            audit: { addedBy: user.email, addedOn: now }
        });

        const teamInfoPath = `teams.${teamId}`;
        transaction.set(membershipRef, {
            displayName: memberData.name,
            email: memberData.email,
            [teamInfoPath]: {
                teamName: teamName,
                role: memberData.role
            }
        }, { merge: true });
    });
}

/**
 * [NEW & TRANSACTIONAL] Updates an existing member's details and syncs the changes
 * to the user's central membership record.
 * @param {string} teamId - The ID of the parent team.
 * @param {string} memberId - The ID of the member document to update.
 * @param {object} updatedData - The fields to update { name, email, phone, role }.
 */
export async function updateTeamMember(teamId, memberId, updatedData) {
    const db = firebase.firestore();
    const membershipDocId = updatedData.email.toLowerCase();
    const membershipRef = db.collection(USER_TEAM_MEMBERSHIPS_COLLECTION_PATH).doc(membershipDocId);

    return db.runTransaction(async (transaction) => {
        const memberRef = db.collection(CHURCH_TEAMS_COLLECTION_PATH).doc(teamId).collection('members').doc(memberId);
        transaction.update(memberRef, updatedData);

        const teamInfoPath = `teams.${teamId}.role`; // Path to update the role
        transaction.update(membershipRef, {
            displayName: updatedData.name,
            [teamInfoPath]: updatedData.role
        });
    });
}

/**
 * [NEW & TRANSACTIONAL] Removes a member from a team and from the user's
 * central membership record.
 * @param {string} teamId - The ID of the parent team.
 * @param {string} memberId - The ID of the member document to delete.
 * @param {string} memberEmail - The email of the member being removed.
 */
export async function removeTeamMember(teamId, memberId, memberEmail) {
    const db = firebase.firestore();
    const membershipDocId = memberEmail.toLowerCase();
    const membershipRef = db.collection(USER_TEAM_MEMBERSHIPS_COLLECTION_PATH).doc(membershipDocId);

    return db.runTransaction(async (transaction) => {
        const memberRef = db.collection(CHURCH_TEAMS_COLLECTION_PATH).doc(teamId).collection('members').doc(memberId);
        transaction.delete(memberRef);

        const teamInfoPath = `teams.${teamId}`;
        transaction.update(membershipRef, {
            [teamInfoPath]: firebase.firestore.FieldValue.delete()
        });
    });
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
        inventoryCount: productData.inventoryCount || 0,
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


/**
 * [NEW] Creates a new Purchase Invoice and atomically increments the inventory
 * for all products within a single transaction.
 * @param {object} invoiceData - The complete data for the new invoice.
 * @param {object} user - The currently authenticated user.
 */
export async function createPurchaseInvoiceAndUpdateInventory(invoiceData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // 1. Get a reference for the new invoice document.
    const invoiceRef = db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc();

    // 2. Run the transaction.
    return db.runTransaction(async (transaction) => {
        // --- Write Operations ---

        // A. Add the new purchase invoice to the transaction.
        transaction.set(invoiceRef, {
            ...invoiceData,
            invoiceId: `PI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
            amountPaid: 0,
            balanceDue: invoiceData.invoiceTotal,
            paymentStatus: 'Unpaid',
            audit: { createdBy: user.email, createdOn: now, updatedBy: user.email, updatedOn: now }
        });

        // B. Loop through the line items and add inventory increments to the transaction.
        invoiceData.lineItems.forEach(item => {
            const productRef = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).doc(item.masterProductId);
            const quantityPurchased = Number(item.quantity);
            
            // Atomically increment the inventory count for this product.
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(quantityPurchased)
            });
        });
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

/**
 * Fetches all supplier payments from the ledger, ordered by date.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of all payment documents.
 */
export async function getAllSupplierPayments() {
    const db = firebase.firestore();
    const snapshot = await db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH)
        .orderBy('paymentDate', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * [NEW] Updates an existing Purchase Invoice and atomically updates inventory
 * based on the "delta" (difference) of line item quantities.
 * @param {string} docId - The ID of the invoice document to update.
 * @param {object} newInvoiceData - The complete new data for the invoice from the form.
 * @param {object} user - The currently authenticated user.
 */
export async function updatePurchaseInvoiceAndInventory(docId, newInvoiceData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const invoiceRef = db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(docId);

    return db.runTransaction(async (transaction) => {
        // 1. READ the original invoice document from the database.
        const originalInvoiceDoc = await transaction.get(invoiceRef);
        if (!originalInvoiceDoc.exists) {
            throw new Error("Invoice to update does not exist.");
        }
        const originalInvoiceData = originalInvoiceDoc.data();

        // 2. CALCULATE THE DELTA
        const inventoryDelta = new Map(); // Use a Map to store the changes for each product ID.

        // A. Process original items (as subtractions)
        originalInvoiceData.lineItems.forEach(item => {
            const currentDelta = inventoryDelta.get(item.masterProductId) || 0;
            inventoryDelta.set(item.masterProductId, currentDelta - Number(item.quantity));
        });

        // B. Process new items (as additions)
        newInvoiceData.lineItems.forEach(item => {
            const currentDelta = inventoryDelta.get(item.masterProductId) || 0;
            inventoryDelta.set(item.masterProductId, currentDelta + Number(item.quantity));
        });

        // 3. CALCULATE THE NEW FINANCIAL STATE
        const amountPaid = originalInvoiceData.amountPaid || 0; // Get the authoritative amount paid
        const newBalanceDue = newInvoiceData.invoiceTotal - amountPaid; // Recalculate the balance

        // Determine the new payment status based on the recalculated balance
        let newPaymentStatus = "Unpaid";
        if (newBalanceDue <= 0) {
            newPaymentStatus = "Paid";
        } else if (amountPaid > 0) {
            newPaymentStatus = "Partially Paid";
        }

        // 4. APPLY THE WRITES

        // A. Update the inventory for every product that had a change.
        for (const [productId, delta] of inventoryDelta.entries()) {
            if (delta !== 0) { // Only update if there's an actual change
                const productRef = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).doc(productId);
                transaction.update(productRef, {
                    inventoryCount: firebase.firestore.FieldValue.increment(delta)
                });
            }
        }

        // B. Update the main purchase invoice document with the new data.
        transaction.update(invoiceRef, {
            ...newInvoiceData,
            balanceDue: newBalanceDue, // Overwrites with the correctly recalculated balance
            paymentStatus: newPaymentStatus,
            'audit.updatedBy': user.email,
            'audit.updatedOn': now,
        });
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
 * [NEW] Creates a new sales catalogue and all its items in a single atomic batch.
 * @param {object} catalogueData - The header data for the catalogue.
 * @param {Array<object>} itemsData - An array of item objects to add.
 * @param {object} user - The currently authenticated user.
 */
export async function createCatalogueWithItems(catalogueData, itemsData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    // 1. Create a new WriteBatch
    const batch = db.batch();

    // 2. Create a reference for the new main catalogue document
    const catalogueRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(); // Auto-generates an ID
    const catalogueId = `SC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    // 3. Add the main catalogue creation to the batch
    batch.set(catalogueRef, {
        ...catalogueData,
        catalogueId: catalogueId,
        isActive: true,
        audit: { createdBy: user.email, createdOn: now, updatedBy: user.email, updatedOn: now }
    });

    // 4. Loop through the draft items and add each one to the batch
    itemsData.forEach(item => {
        const itemRef = catalogueRef.collection('items').doc(); // New doc in the sub-collection
        batch.set(itemRef, { ...item, catalogueId: catalogueRef.id }); // Add catalogueId for consistency
    });

    // 5. Commit the batch. This is atomic.
    return batch.commit();
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


// =======================================================
// --- CONSIGNMENT MANAGEMENT API FUNCTIONS ---
// =======================================================

/**
 * [RENAMED & EFFICIENT] Gets a user's complete team membership info
 * from their dedicated record by using their email.
 * @param {string} userEmail - The email of the user to look up.
 * @returns {Promise<object|null>} The user's membership document or null.
 */
export async function getUserMembershipInfo(userEmail) { // <-- RENAMED
    const db = firebase.firestore();
    const membershipDocId = userEmail.toLowerCase();
    const membershipRef = db.collection(USER_TEAM_MEMBERSHIPS_COLLECTION_PATH).doc(membershipDocId);
    
    const doc = await membershipRef.get();

    if (doc.exists) {
        return doc.data();
    } else {
        return null;
    }
}

/**
 * Creates a new "Pending" Consignment Request using a batch write.
 * @param {object} requestData - Header data for the order { teamId, teamName, etc. }.
 * @param {Array<object>} items - The list of items being requested.
 * @param {object} user - The currently authenticated user.
 */
export async function createConsignmentRequest(requestData, items, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc();
    const consignmentId = `CON-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    batch.set(orderRef, {
        ...requestData,
        consignmentId: consignmentId,
        status: 'Pending',
        requestDate: now,
        requestingMemberId: user.uid,
        requestingMemberName: user.displayName,
        audit: { createdBy: user.email, createdOn: now }
    });

    items.forEach(item => {
        const itemRef = orderRef.collection('items').doc();
        // We only store the requested quantity at this stage.
        batch.set(itemRef, {
            productId: item.productId,
            productName: item.productName,
            sellingPrice: item.sellingPrice,
            quantityRequested: item.quantityRequested,
            quantityCheckedOut: 0, // Will be set during fulfillment
            quantitySold: 0,
            quantityReturned: 0,
            quantityDamaged: 0
        });
    });

    return batch.commit();
}

/**
 * [NEW] Fetches a single consignment order document by its ID.
 * @param {string} orderId - The Firestore document ID of the order.
 * @returns {Promise<object|null>} The order data or null if not found.
 */
export async function getConsignmentOrderById(orderId) {
    const db = firebase.firestore();
    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(orderId);
    const docSnap = await orderRef.get();
    if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        console.error(`Consignment order with ID ${orderId} not found.`);
        return null;
    }
}


/**
 * Fulfills a consignment order and atomically decrements inventory.
 * This is a critical transaction to prevent race conditions.
 * @param {string} orderId - The ID of the consignment order to fulfill.
 * @param {Array<object>} finalItems - The final list of items with admin-approved quantities.
 * @param {object} user - The admin performing the action.
 */
export async function fulfillConsignmentAndUpdateInventory(orderId, finalItems, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(orderId);

    return db.runTransaction(async (transaction) => {
        const productRefs = finalItems.map(item => db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).doc(item.productId));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // Validation Loop: Check stock for all items before making any changes.
        for (let i = 0; i < finalItems.length; i++) {
            const item = finalItems[i];
            const productDoc = productDocs[i];
            const currentStock = productDoc.data().inventoryCount || 0;
            if (currentStock < item.quantityCheckedOut) {
                throw new Error(`Not enough stock for "${item.productName}". Available: ${currentStock}, Requested: ${item.quantityCheckedOut}.`);
            }
        }

        // Update Loop: If validation passes, commit all changes.
        let totalValueCheckedOut = 0;
        for (let i = 0; i < finalItems.length; i++) {
            const item = finalItems[i];
            const productRef = productRefs[i];
            const quantityToDecrement = Number(item.quantityCheckedOut);
            
            // Decrement main store inventory
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(-quantityToDecrement)
            });

            // Update the item in the sub-collection with the final fulfilled quantity
            const itemRef = orderRef.collection('items').doc(item.id); // Assumes item has its own doc ID from the fulfillment grid
            transaction.update(itemRef, { quantityCheckedOut: quantityToDecrement });

            totalValueCheckedOut += item.sellingPrice * quantityToDecrement;
        }

        // Finally, update the main order to "Active".
        transaction.update(orderRef, { 
            status: 'Active', 
            checkoutDate: now,
            totalValueCheckedOut: totalValueCheckedOut,
            balanceDue: totalValueCheckedOut, // Initially, balance due is the full value
            totalAmountPaid: 0,
            totalValueSold: 0,
            totalValueReturned: 0,
            totalValueDamaged: 0,
            totalAmountPaid: 0,
            'audit.updatedBy': user.email,
            'audit.updatedOn': now
        });
    });
}

/**
 * [CORRECTED & FINAL] Logs an activity based on a delta and atomically
 * updates all related documents in a single transaction.
 * @param {object} activityData - An object containing all necessary data.
 * @param {object} user - The user logging the activity.
 */
export async function logActivityAndUpdateConsignment(activityData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    // Destructure all needed variables from the single activityData object.
    const { orderId, itemId, productId, productName, activityType, quantityDelta, sellingPrice, correctionDetails } = activityData;

    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(orderId);
    const itemRef = orderRef.collection('items').doc(itemId);
    const activityRef = orderRef.collection('activityLog').doc();

    const productRef = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).doc(productId);

    return db.runTransaction(async (transaction) => {
        // --- READ PHASE: Get the current, authoritative state of the item. ---
        const itemDoc = await transaction.get(itemRef);
        if (!itemDoc.exists) {
            throw new Error("The item you are trying to update does not exist.");
        }
        const currentItemData = itemDoc.data();

        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) throw new Error("Consignment order does not exist.");
        const currentOrderData = orderDoc.data();

        // --- 2. VALIDATION PHASE ---
        const fieldBeingChanged = correctionDetails ? correctionDetails.correctedField : `quantity${activityType}`;

        const currentSold = currentItemData.quantitySold || 0;
        const currentReturned = currentItemData.quantityReturned || 0;
        const currentDamaged = currentItemData.quantityDamaged || 0;

        // Calculate what the new totals would be after this change.
        const newSold = fieldBeingChanged === 'quantitySold' ? currentSold + quantityDelta : currentSold;
        const newReturned = fieldBeingChanged === 'quantityReturned' ? currentReturned + quantityDelta : currentReturned;
        const newDamaged = fieldBeingChanged === 'quantityDamaged' ? currentDamaged + quantityDelta : currentDamaged;

        const totalAccountedFor = newSold + newReturned + newDamaged;

        if (totalAccountedFor > currentItemData.quantityCheckedOut) {
            // If the new total exceeds what was checked out, abort the entire transaction.
            throw new Error(`Invalid quantity. The total accounted for (${totalAccountedFor}) cannot exceed the checked out quantity of ${currentItemData.quantityCheckedOut}.`);
        }
        

        // --- 3. WRITE PHASE (only runs if validation passes) ---

        // Determine the field to update on the item document
        let fieldToUpdate = '';
        if (activityType === 'Correction') {
            fieldToUpdate = correctionDetails.correctedField;
        } else if (activityType === 'Sale') {
            fieldToUpdate = 'quantitySold';
        } else if (activityType === 'Return') {
            fieldToUpdate = 'quantityReturned';
        } else if (activityType === 'Damage') {
            fieldToUpdate = 'quantityDamaged';
        }
        if (!fieldToUpdate) throw new Error(`Invalid activity type: ${activityType}`);

        const activityValueDelta = sellingPrice * quantityDelta;



        // A. Create the immutable Activity Log entry
        transaction.set(activityRef, {
            activityType: activityType,
            quantity: quantityDelta,
            unitSellingPrice: sellingPrice,
            totalSaleValue: activityValueDelta,
            correctionDetails: correctionDetails || null,
            recordedBy: user.email,
            activityDate: now,
            productId: productId,
            productName: productName,
        });

        // B. Atomically update the quantity counter on the consignment item
        transaction.update(itemRef, {
            [fieldToUpdate]: firebase.firestore.FieldValue.increment(quantityDelta)
        });

        // C. Atomically update the main order totals based on the Asset-Liability model
        if (fieldToUpdate === 'quantitySold') {
            transaction.update(orderRef, {
                totalValueSold: firebase.firestore.FieldValue.increment(activityValueDelta)
            });
        } else if (fieldToUpdate === 'quantityReturned') {
            transaction.update(orderRef, {
                totalValueReturned: firebase.firestore.FieldValue.increment(activityValueDelta),
                balanceDue: firebase.firestore.FieldValue.increment(-activityValueDelta)
            });
            // Also update main store inventory for returns
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(quantityDelta)
            });
        } else if (fieldToUpdate === 'quantityDamaged') {
            transaction.update(orderRef, {
                totalValueDamaged: firebase.firestore.FieldValue.increment(activityValueDelta),
                balanceDue: firebase.firestore.FieldValue.increment(-activityValueDelta)
            });
        }
    });
}


/**
 * [REFACTORED] Updates a pending payment record.
 * @param {string} paymentId - The document ID of the payment in the ledger.
 * @param {object} updatedData - The new data for the payment.
 * @param {object} user - The user making the update.
 */
export async function updatePaymentRecord(paymentId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentRef = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId);

    // The updatedData object is now simpler, without relatedActivityIds.
    return paymentRef.update({
        ...updatedData,
        'audit.updatedBy': user.email,
        'audit.updatedOn': now
    });
}

/**
 * [REFACTORED] Creates a new "Pending Verification" payment record in the ledger.
 * @param {object} paymentData - The payment data from the form.
 * @param {object} user - The team lead submitting the record.
 */
export async function submitPaymentRecord(paymentData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentId = `CPAY-${Date.now()}`;

    // The paymentData object no longer contains 'relatedActivityIds'.
    // It's just a simple record of a payment being made against the order balance.
    return db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH).add({
        ...paymentData,
        paymentId: paymentId,
        paymentStatus: 'Pending Verification',
        submittedBy: user.email,
        submittedOn: now,
    });
}

/**
 * [REFACTORED] Verifies a payment and atomically updates the parent order's balance.
 * @param {string} paymentId - The ID of the payment document in the ledger.
 * @param {object} adminUser - The admin verifying the payment.
 */
export async function verifyConsignmentPayment(paymentId, adminUser) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentRef = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId);

    return db.runTransaction(async (transaction) => {
        // 1. READ the payment document.
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists || paymentDoc.data().paymentStatus !== 'Pending Verification') {
            throw new Error("Payment not found or is not pending verification.");
        }
        const paymentData = paymentDoc.data();
        const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(paymentData.orderId);

        // 2. WRITE: Update the payment document itself to "Verified".
        transaction.update(paymentRef, {
            paymentStatus: 'Verified',
            verifiedBy: adminUser.email,
            verifiedOn: now
        });

        // 3. WRITE: Atomically update the main consignment order's financial totals.
        transaction.update(orderRef, {
            totalAmountPaid: firebase.firestore.FieldValue.increment(paymentData.amountPaid),
            balanceDue: firebase.firestore.FieldValue.increment(-paymentData.amountPaid)
        });

        // The logic to loop through relatedActivityIds has been completely removed.
    });
}


/**
 * [NEW] Deletes a pending payment record from the ledger.
 * @param {string} paymentId - The document ID of the payment to delete.
 */
export async function cancelPaymentRecord(paymentId) {
    const db = firebase.firestore();
    return db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId).delete();
}

// =======================================================
// --- SALES MANAGEMENT API FUNCTIONS ---
// =======================================================

/**
 * [CORRECTED & FINAL] Creates a new Sales Invoice, decrements inventory,
 * and optionally records an initial payment and a donation, all in one atomic operation.
 * @param {object} saleData - The complete data object for the new sale.
 * @param {object|null} initialPaymentData - Data for an initial payment, or null if none.
 * @param {number} donationAmount - The amount of any overpayment to be logged as a donation.
 * @param {string} userEmail - The email of the user creating the sale.
 */
export async function createSaleAndUpdateInventory(saleData, initialPaymentData, donationAmount, userEmail) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    return db.runTransaction(async (transaction) => {
        // --- 1. READ & VALIDATION PHASE ---
        const productRefs = saleData.lineItems.map(item => db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).doc(item.productId));
        const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        for (let i = 0; i < saleData.lineItems.length; i++) {
            const item = saleData.lineItems[i];
            const productDoc = productDocs[i];
            if (!productDoc.exists) {
                throw new Error(`Product "${item.productName}" not found in the catalogue.`);
            }
            const currentStock = productDoc.data().inventoryCount || 0;
            if (currentStock < item.quantity) {
                throw new Error(`Not enough stock for "${item.productName}". Only ${currentStock} available.`);
            }
        }

        // --- 2. WRITE PHASE ---

        // A. Create the main Sales Invoice document
        const saleRef = db.collection(SALES_COLLECTION_PATH).doc();
        
        let prefix = 'SALE-';
        if (saleData.store === 'Church Store') prefix = 'CS-';
        else if (saleData.store === 'Tasty Treats') prefix = 'TT-';
        const saleId = `${prefix}${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
        
        let totalAmountPaid = 0;
        if (initialPaymentData) {
            totalAmountPaid = initialPaymentData.amountPaid;
        }
        const balanceDue = saleData.financials.totalAmount - totalAmountPaid;
        const paymentStatus = balanceDue <= 0 ? 'Paid' : (totalAmountPaid > 0 ? 'Partially Paid' : 'Unpaid');

        transaction.set(saleRef, {
            ...saleData,
            saleId: saleId,
            totalAmountPaid: totalAmountPaid,
            balanceDue: balanceDue,
            paymentStatus: paymentStatus,
            audit: { createdBy: userEmail, createdOn: now }
        });

        // B. Create the initial payment record if one was made
        if (initialPaymentData) {
            const paymentRef = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH).doc();
            transaction.set(paymentRef, {
                ...initialPaymentData,
                invoiceId: saleRef.id,
                paymentId: `SPAY-${Date.now()}`,
                paymentDate: now,
                status: 'Verified',
                recordedBy: userEmail
            });
        }

        // C. Create the donation record if there was an overpayment
        if (donationAmount > 0) {
            const donationRef = db.collection(DONATIONS_COLLECTION_PATH).doc(); // Assumes a top-level 'donations' collection
            transaction.set(donationRef, {
                amount: donationAmount,
                donationDate: now,
                source: 'POS Overpayment',
                relatedSaleId: saleRef.id,
                customerName: saleData.customerInfo.name,
                recordedBy: userEmail,
            });
        }

        // D. Decrement inventory for each product sold
        for (let i = 0; i < saleData.lineItems.length; i++) {
            const item = saleData.lineItems[i];
            const productRef = productRefs[i];
            transaction.update(productRef, {
                inventoryCount: firebase.firestore.FieldValue.increment(-Number(item.quantity))
            });
        }
    });
}


// =======================================================
// --- SALES PAYMENT API FUNCTIONS ---
// =======================================================

/**
 * [NEW & TRANSACTIONAL] Records a payment against a sales invoice, updates the
 * invoice's balance, and handles any overpayment as a donation.
 * @param {object} paymentData - An object containing payment details like invoiceId, amountPaid, etc.
 * @param {object} user - The user recording the payment.
 */
export async function recordSalePayment(paymentData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    // Destructure all the data we receive from the controller
    const { invoiceId, amountPaid, donationAmount, customerName, paymentMode, transactionRef, notes } = paymentData;


    const saleRef = db.collection(SALES_COLLECTION_PATH).doc(invoiceId);
    const paymentRef = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH).doc(); // Get a ref to the new payment doc


    return db.runTransaction(async (transaction) => {
        // 1. READ the sales invoice to get its current state.
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists) {
            throw new Error("The invoice you are trying to pay does not exist.");
        }
        const currentSaleData = saleDoc.data();

        // 2. WRITE: Create the new payment document in the ledger.
        // This now includes the donationAmount.
        transaction.set(paymentRef, {
            invoiceId: invoiceId,
            paymentId: `SPAY-${Date.now()}`,
            paymentDate: now,
            amountPaid: amountPaid,
            donationAmount: donationAmount || 0, // <-- [NEW] Store donation amount
            totalCollected: amountPaid + (donationAmount || 0),
            paymentMode: paymentMode,
            transactionRef: transactionRef,
            notes: notes || '',
            status: 'Verified',
            recordedBy: user.email
        });

        // 3. WRITE: Update the main sales invoice's financial totals.
        const newTotalAmountPaid = (currentSaleData.totalAmountPaid || 0) + amountPaid;
        const newBalanceDue = currentSaleData.balanceDue - amountPaid;
        const newPaymentStatus = newBalanceDue <= 0 ? 'Paid' : 'Partially Paid';

        transaction.update(saleRef, {
            totalAmountPaid: newTotalAmountPaid,
            balanceDue: newBalanceDue,
            paymentStatus: newPaymentStatus
        });

        // 4. WRITE: If there was an overpayment, create a donation record.
        if (donationAmount > 0) {
            const donationRef = db.collection(DONATIONS_COLLECTION_PATH).doc();
            transaction.set(donationRef, {
                amount: donationAmount,
                donationDate: now,
                source: 'Invoice Overpayment',
                // --- [NEW & CRITICAL] Link the donation to the new payment's ID ---
                relatedPaymentId: paymentRef.id,
                customerName: customerName,
                recordedBy: user.email,
            });
        }
    });
}


/**
 * [NEW & TRANSACTIONAL] Voids a verified payment, creating a reversing
 * transaction and updating all related financial totals.
 * @param {string} paymentId - The document ID of the payment to void.
 * @param {object} adminUser - The admin performing the void.
 */
export async function voidSalePayment(paymentId, adminUser) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentRef = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId);

    return db.runTransaction(async (transaction) => {
        // 1. READ the original payment document to get its details.
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists || paymentDoc.data().status !== 'Verified') {
            throw new Error("Payment not found or is not in a 'Verified' state to be voided.");
        }
        const originalPaymentData = paymentDoc.data();
        const orderRef = db.collection(SALES_COLLECTION_PATH).doc(originalPaymentData.invoiceId);

        // 2. WRITE: Update the original payment's status to "Voided".
        transaction.update(paymentRef, { status: 'Voided' });

        // 3. WRITE: Create a new, reversing payment record for the audit trail.
        const reversalPaymentRef = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH).doc();
        transaction.set(reversalPaymentRef, {
            invoiceId: originalPaymentData.invoiceId,
            paymentId: `VOID-${originalPaymentData.paymentId}`,
            paymentDate: now,
            amountPaid: -originalPaymentData.amountPaid, // Negative amount
            donationAmount: -originalPaymentData.donationAmount, // Negative donation
            totalCollected: -originalPaymentData.totalCollected,
            paymentMode: 'REVERSAL',
            transactionRef: `Reversal for ${originalPaymentData.transactionRef}`,
            status: 'Void Reversal',
            recordedBy: adminUser.email
        });

        // 4. WRITE: Atomically reverse the amounts on the main sales invoice.
        transaction.update(orderRef, {
            totalAmountPaid: firebase.firestore.FieldValue.increment(-originalPaymentData.amountPaid),
            balanceDue: firebase.firestore.FieldValue.increment(originalPaymentData.amountPaid)
        });

        // 5. WRITE: If there was a donation, create a reversing donation record.
        if (originalPaymentData.donationAmount > 0) {
            const donationRef = db.collection(DONATIONS_COLLECTION_PATH).doc();
            transaction.set(donationRef, {
                amount: -originalPaymentData.donationAmount, // Negative amount
                donationDate: now,
                source: 'Payment Void',
                relatedPaymentId: paymentRef.id, // Link to the original voided payment
                recordedBy: adminUser.email,
            });
        }
    });
}

/**
 * [NEW] Fetches a single sales invoice document by its ID.
 */
export async function getSalesInvoiceById(invoiceId) {
    const db = firebase.firestore();
    const docRef = db.collection(SALES_COLLECTION_PATH).doc(invoiceId);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        throw new Error("Could not find the updated invoice document.");
    }
}

/**
 * Calculates comprehensive direct sales metrics for a given date range.
 * 
 * This function analyzes all direct sales (Church Store and Tasty Treats) within
 * the specified date range and returns detailed performance metrics including
 * revenue breakdowns, transaction counts, and customer analytics.
 * 
 * @param {Date} startDate - The start date for the analysis period (inclusive)
 * @param {Date} endDate - The end date for the analysis period (inclusive)
 * @param {string[]} [stores=['Church Store', 'Tasty Treats']] - Array of store names to include
 * 
 * @returns {Promise<Object>} Object containing:
 *   - totalDirectRevenue {number} - Total revenue across all direct sales
 *   - totalTransactions {number} - Count of all transactions
 *   - storeBreakdown {Array} - Per-store metrics (revenue, transactions, customers)
 *   - paymentModeDistribution {Object} - Breakdown of payment methods used
 *   - customerMetrics {Object} - New vs returning customer analysis
 *   - averageTransactionValue {number} - Mean transaction amount
 * 
 * @throws {Error} When Firestore query fails or date range is invalid
 * 
 * @example
 * // Get last 30 days of direct sales data
 * const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
 * const today = new Date();
 * const metrics = await calculateDirectSalesMetrics(thirtyDaysAgo, today);
 * console.log(`Total revenue: ${formatCurrency(metrics.totalDirectRevenue)}`);
 * 
 * @since 1.0.0
 * @author TrinityCart Development Team
 */


export async function calculateDirectSalesMetrics(startDate, endDate) {
    const db = firebase.firestore();
    
    const directSalesQuery = db.collection(SALES_COLLECTION_PATH)
        .where('saleDate', '>=', startDate)
        .where('saleDate', '<=', endDate);
    
    const snapshot = await directSalesQuery.get();
    const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calculate store-specific metrics
    const storeMetrics = {
        'Church Store': { revenue: 0, transactions: 0, customers: new Set() },
        'Tasty Treats': { revenue: 0, transactions: 0, customers: new Set() }
    };
    
    sales.forEach(sale => {
        const store = sale.store;
        if (storeMetrics[store]) {
            storeMetrics[store].revenue += sale.financials.totalAmount;
            storeMetrics[store].transactions += 1;
            storeMetrics[store].customers.add(sale.customerInfo.email);
        }
    });
    
    return {
        totalDirectRevenue: sales.reduce((sum, s) => sum + s.financials.totalAmount, 0),
        totalTransactions: sales.length,
        storeBreakdown: Object.keys(storeMetrics).map(store => ({
            store,
            revenue: storeMetrics[store].revenue,
            transactions: storeMetrics[store].transactions,
            uniqueCustomers: storeMetrics[store].customers.size,
            avgTransactionValue: storeMetrics[store].transactions > 0 
                ? storeMetrics[store].revenue / storeMetrics[store].transactions 
                : 0
        }))
    };
}


export async function calculateConsignmentSalesMetrics(startDate, endDate) {
    const db = firebase.firestore();
    
    // Get all consignment orders with activity in the date range
    const ordersQuery = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH)
        .where('status', '==', 'Active');
    
    const snapshot = await ordersQuery.get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let totalConsignmentRevenue = 0;
    let totalItemsSold = 0;
    let totalItemsReturned = 0;
    
    const teamPerformance = {};
    
    // Analyze each order's activity within the date range
    for (const order of orders) {
        const activitySnapshot = await db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH)
            .doc(order.id)
            .collection('activityLog')
            .where('activityDate', '>=', startDate)
            .where('activityDate', '<=', endDate)
            .where('activityType', '==', 'Sale')
            .get();
        
        const activities = activitySnapshot.docs.map(doc => doc.data());
        const orderRevenue = activities.reduce((sum, a) => sum + (a.totalSaleValue || 0), 0);
        const orderQuantity = activities.reduce((sum, a) => sum + (a.quantity || 0), 0);
        
        totalConsignmentRevenue += orderRevenue;
        totalItemsSold += orderQuantity;
        
        // Track team performance
        if (!teamPerformance[order.teamName]) {
            teamPerformance[order.teamName] = {
                revenue: 0,
                itemsSold: 0,
                activeOrders: 0
            };
        }
        
        teamPerformance[order.teamName].revenue += orderRevenue;
        teamPerformance[order.teamName].itemsSold += orderQuantity;
        teamPerformance[order.teamName].activeOrders += 1;
    }
    
    return {
        totalConsignmentRevenue,
        totalItemsSold,
        averageRevenuePerItem: totalItemsSold > 0 ? totalConsignmentRevenue / totalItemsSold : 0,
        teamRankings: Object.entries(teamPerformance)
            .map(([team, metrics]) => ({ team, ...metrics }))
            .sort((a, b) => b.revenue - a.revenue), // Sort by revenue descending
        activeConsignments: orders.length
    };
}

/**
 * Generates a formatted sales performance report for display in the UI.
 * 
 * This function takes raw sales metrics and formats them into a structure
 * suitable for rendering in the sales performance dashboard, including
 * formatted currency values, percentage calculations, and trend indicators.
 * 
 * @param {Object} rawMetrics - Raw metrics from calculateDirectSalesMetrics()
 * @param {Object} [comparisonMetrics=null] - Optional previous period metrics for comparison
 * 
 * @returns {Object} Formatted report object with:
 *   - formattedRevenue {string} - Currency-formatted total revenue
 *   - transactionSummary {Object} - Transaction count and average value
 *   - storeComparison {Array} - Formatted store performance data
 *   - trendIndicators {Object} - Percentage changes vs comparison period
 * 
 * @example
 * const rawData = await calculateDirectSalesMetrics(startDate, endDate);
 * const previousData = await calculateDirectSalesMetrics(prevStartDate, prevEndDate);
 * const report = generateSalesPerformanceReport(rawData, previousData);
 * 
 * @since 1.0.0
 * @author TrinityCart Development Team
 */
export function generateSalesPerformanceReport(rawMetrics, comparisonMetrics = null) {
    // Format primary metrics with proper currency and number formatting
    const report = {
        formattedRevenue: formatCurrency(rawMetrics.totalDirectRevenue),
        transactionSummary: {
            count: rawMetrics.totalTransactions,
            averageValue: formatCurrency(rawMetrics.averageTransactionValue)
        },
        storeComparison: [],
        trendIndicators: {}
    };
    
    // Format store breakdown data
    Object.entries(rawMetrics.storeBreakdown).forEach(([store, data]) => {
        report.storeComparison.push({
            storeName: store,
            revenue: formatCurrency(data.revenue),
            transactions: data.transactions,
            uniqueCustomers: data.uniqueCustomers,
            revenuePercentage: ((data.revenue / rawMetrics.totalDirectRevenue) * 100).toFixed(1)
        });
    });
    
    // Calculate trend indicators if comparison data provided
    if (comparisonMetrics) {
        const revenueChange = ((rawMetrics.totalDirectRevenue - comparisonMetrics.totalDirectRevenue) 
            / comparisonMetrics.totalDirectRevenue) * 100;
        
        report.trendIndicators = {
            revenueChange: {
                percentage: revenueChange.toFixed(1),
                direction: revenueChange > 0 ? 'up' : revenueChange < 0 ? 'down' : 'neutral',
                formatted: `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`
            }
        };
    }
    
    return report;
}

/**
 * [Brief one-line description of what the function does]
 * 
 * [Detailed description explaining the purpose, business logic, and any
 * important implementation details or assumptions]
 * 
 * @param {Type} paramName - Description of the parameter and its constraints
 * @param {Type} [optionalParam=defaultValue] - Optional parameter with default
 * 
 * @returns {Promise<Type>|Type} Description of return value structure
 * 
 * @throws {ErrorType} When specific error conditions occur
 * 
 * @example
 * // Realistic usage example showing how to call the function
 * const result = await functionName(param1, param2);
 * 
 * @since Version when function was introduced
 * @author Author or team responsible
 * @see Related functions or documentation links
 */
export async function complexBusinessFunction(data) {
    // STEP 1: Validate input data structure
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid data parameter');
    }
    
    // STEP 2: Initialize calculation variables
    let totalRevenue = 0;
    const storeMetrics = new Map(); // Using Map for better performance with large datasets
    
    // STEP 3: Process each transaction with detailed business logic
    data.transactions.forEach(transaction => {
        // Business rule: Only count completed transactions for revenue
        if (transaction.status === 'Completed') {
            totalRevenue += transaction.amount;
            
            // Store-level aggregation for breakdown analysis
            const currentStoreTotal = storeMetrics.get(transaction.store) || 0;
            storeMetrics.set(transaction.store, currentStoreTotal + transaction.amount);
        }
    });
    
    // STEP 4: Return structured results with clear property names
    return {
        totalRevenue,
        storeBreakdown: Object.fromEntries(storeMetrics),
        calculatedAt: new Date().toISOString() // Timestamp for cache validation
    };
}
