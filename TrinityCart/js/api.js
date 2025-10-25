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
    SALES_PAYMENTS_LEDGER_COLLECTION_PATH,DONATIONS_COLLECTION_PATH,
    DONATION_SOURCES,          
    getDonationSourceByStore 
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
 * [ENHANCED] Creates a new sales catalogue with items and price history records.
 * 
 * Creates the sales catalogue, adds all items to the catalogue's items sub-collection,
 * AND creates price history records for each product in their productCatalogue 
 * priceHistory sub-collections. This ensures accurate pricing audit trail.
 * 
 * @param {object} catalogueData - The header data for the catalogue.
 * @param {Array<object>} itemsData - An array of item objects to add.
 * @param {object} user - The currently authenticated user.
 * 
 * @since 1.0.0 (Enhanced with price history integration)
 */
export async function createCatalogueWithItems(catalogueData, itemsData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    try {
        console.log(`[API] Creating catalogue with ${itemsData.length} items AND price history records`);
        
        // 1. Create a new WriteBatch for catalogue and items
        const catalogueBatch = db.batch();

        // 2. Create a reference for the new main catalogue document
        const catalogueRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc();
        const catalogueId = `SC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

        // 3. Add the main catalogue creation to the batch
        catalogueBatch.set(catalogueRef, {
            ...catalogueData,
            catalogueId: catalogueId,
            isActive: true, // New catalogues are active by default
            audit: { createdBy: user.email, createdOn: now, updatedBy: user.email, updatedOn: now }
        });

        // 4. Add all items to the catalogue's items sub-collection
        itemsData.forEach(item => {
            const itemRef = catalogueRef.collection('items').doc();
            catalogueBatch.set(itemRef, { ...item, catalogueId: catalogueRef.id });
        });

        // 5. Commit the catalogue and items (atomic operation)
        await catalogueBatch.commit();
        console.log(`[API] ✅ Catalogue and items created successfully`);

        // 6. ENHANCED: Create price history records for each product
        console.log(`[API] Creating price history records for ${itemsData.length} products...`);
        
        const priceHistoryPromises = itemsData.map(async (item) => {
            try {
                await createProductPriceHistory(item.productId, {
                    salesCatalogueId: catalogueRef.id,
                    salesCatalogueName: catalogueData.catalogueName,
                    unitSellingPrice: item.sellingPrice,
                    isActive: true // New catalogue is active, so price history is active
                }, user);
                
                console.log(`[API] ✅ Price history created: ${item.productName} -> ₹${item.sellingPrice}`);
                
            } catch (priceHistoryError) {
                console.error(`[API] Error creating price history for ${item.productName}:`, priceHistoryError);
                // Don't fail the entire operation if one price history fails
            }
        });

        // Wait for all price history records to be created
        await Promise.all(priceHistoryPromises);
        
        console.log(`[API] ✅ ENHANCED catalogue creation completed with price history integration`);
        console.log(`[API] Created: 1 catalogue + ${itemsData.length} items + ${itemsData.length} price history records`);
        
        return catalogueRef;
        
    } catch (error) {
        console.error(`[API] Error in enhanced catalogue creation:`, error);
        throw new Error(`Enhanced catalogue creation failed: ${error.message}`);
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
 * [ENHANCED] Updates sales catalogue data with price history status management.
 * 
 * Updates the catalogue's main data AND manages price history activation/deactivation
 * when the catalogue's isActive status changes. This ensures price history records
 * accurately reflect current catalogue status for reporting.
 * 
 * @param {string} docId - The Firestore document ID of the catalogue to update.
 * @param {object} updatedData - The fields to update (e.g., { catalogueName, seasonId, isActive }).
 * @param {object} user - The currently authenticated user.
 * 
 * @since 1.0.0 (Enhanced with price history status management)
 */
export async function updateSalesCatalogue(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    try {
        console.log(`[API] Updating catalogue ${docId} with price history status management`);
        
        // 1. Get current catalogue state for comparison
        const catalogueRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(docId);
        const currentCatalogueDoc = await catalogueRef.get();
        
        if (!currentCatalogueDoc.exists) {
            throw new Error(`Catalogue ${docId} not found`);
        }
        
        const currentCatalogueData = currentCatalogueDoc.data();
        const currentActiveStatus = currentCatalogueData.isActive;
        const newActiveStatus = updatedData.isActive !== undefined ? updatedData.isActive : currentActiveStatus;
        
        console.log(`[API] Catalogue status change: ${currentActiveStatus} -> ${newActiveStatus}`);
        
        // 2. Update the main catalogue document (existing functionality)
        await catalogueRef.update({
            ...updatedData,
            'audit.updatedBy': user.email,
            'audit.updatedOn': now,
        });
        
        console.log(`[API] ✅ Catalogue main document updated`);
        
        // 3. ENHANCED: Manage price history status if isActive changed
        if (updatedData.isActive !== undefined && updatedData.isActive !== currentActiveStatus) {
            console.log(`[API] Catalogue active status changed, updating price history records...`);
            
            try {
                await updateProductPriceHistoryStatus(docId, newActiveStatus, user);
                console.log(`[API] ✅ Price history status updated to ${newActiveStatus ? 'active' : 'inactive'}`);
            } catch (priceHistoryError) {
                console.error(`[API] Error updating price history status:`, priceHistoryError);
                // Don't fail the entire operation if price history update fails
                console.warn(`[API] Catalogue updated but price history status update failed - this may affect reports`);
            }
        } else {
            console.log(`[API] No active status change, price history status unchanged`);
        }
        
        console.log(`[API] ✅ ENHANCED catalogue update completed with price history management`);
        
    } catch (error) {
        console.error(`[API] Error in enhanced catalogue update:`, error);
        throw new Error(`Enhanced catalogue update failed: ${error.message}`);
    }
}


/**
 * [ENHANCED] Adds item to catalogue with intelligent price history management.
 * 
 * Adds item to catalogue AND creates price history with full backward compatibility.
 * Handles both new catalogues and existing catalogues seamlessly.
 * 
 * @param {string} catalogueId - The Firestore document ID of the parent catalogue.
 * @param {object} itemData - The complete data for the item to be added.
 * 
 * @since 1.0.0 (Enhanced with intelligent price history management)
 */
export async function addItemToCatalogue(catalogueId, itemData) {
    const db = firebase.firestore();
    
    try {
        console.log(`[API] Adding item to catalogue ${catalogueId} with intelligent price history management`);
        
        // 1. Add item to catalogue items sub-collection (existing functionality)
        const itemRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH)
            .doc(catalogueId)
            .collection('items')
            .doc();
        
        await itemRef.set(itemData);
        console.log(`[API] ✅ Item added to catalogue: ${itemData.productName}`);
        
        // 2. Get catalogue information for price history
        const catalogueDoc = await db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(catalogueId).get();
        
        if (!catalogueDoc.exists) {
            throw new Error(`Catalogue ${catalogueId} not found`);
        }
        
        const catalogueData = catalogueDoc.data();
        
        // 3. ENHANCED: Always try to create price history (handles all scenarios)
        if (catalogueData.isActive) {
            console.log(`[API] Creating price history for ${itemData.productName} (catalogue is active)`);
            
            try {
                // Check if price history already exists (avoid duplicates)
                const existingPriceHistoryQuery = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH)
                    .doc(itemData.productId)
                    .collection('priceHistory')
                    .where('salesCatalogueId', '==', catalogueId)
                    .where('isActive', '==', true)
                    .limit(1);
                
                const existingSnapshot = await existingPriceHistoryQuery.get();
                
                if (existingSnapshot.empty) {
                    // No existing price history - create new one
                    await createProductPriceHistory(itemData.productId, {
                        salesCatalogueId: catalogueId,
                        salesCatalogueName: catalogueData.catalogueName,
                        unitSellingPrice: itemData.sellingPrice,
                        isActive: true
                    }, { email: catalogueData.audit?.updatedBy || catalogueData.audit?.createdBy || 'system' });
                    
                    console.log(`[API] ✅ New price history created: ${itemData.productName} -> ₹${itemData.sellingPrice}`);
                } else {
                    // Price history exists - update the price
                    const existingDoc = existingSnapshot.docs[0];
                    await existingDoc.ref.update({
                        unitSellingPrice: itemData.sellingPrice,
                        updatedBy: catalogueData.audit?.updatedBy || 'system',
                        updatedDate: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log(`[API] ✅ Existing price history updated: ${itemData.productName} -> ₹${itemData.sellingPrice}`);
                }
                
            } catch (priceHistoryError) {
                console.error(`[API] Error managing price history for ${itemData.productName}:`, priceHistoryError);
                console.warn(`[API] Item added to catalogue but price history operation failed`);
                // Don't fail the entire operation - catalogue item was added successfully
            }
        } else {
            console.log(`[API] ℹ️ Catalogue is inactive, price history will be created when catalogue is activated`);
        }
        
        console.log(`[API] ✅ ENHANCED item addition completed`);
        return itemRef;
        
    } catch (error) {
        console.error(`[API] Error in enhanced addItemToCatalogue:`, error);
        throw new Error(`Enhanced add item to catalogue failed: ${error.message}`);
    }
}


/**
 * [ENHANCED] Removes product from catalogue with price history deactivation.
 * 
 * Removes the item from the catalogue's items sub-collection AND deactivates
 * the corresponding price history record. This preserves pricing audit trail
 * while ensuring accurate current pricing for reports.
 * 
 * @param {string} catalogueId - The ID of the parent catalogue.
 * @param {string} itemId - The ID of the item document to delete.
 * 
 * @since 1.0.0 (Enhanced with price history deactivation)
 */
export async function removeItemFromCatalogue(catalogueId, itemId) {
    const db = firebase.firestore();
    
    try {
        console.log(`[API] Removing item from catalogue ${catalogueId} with price history deactivation`);
        
        // 1. Get item data before deletion to identify the product
        const itemRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH)
            .doc(catalogueId)
            .collection('items')
            .doc(itemId);
        
        const itemDoc = await itemRef.get();
        if (!itemDoc.exists) {
            throw new Error(`Catalogue item ${itemId} not found`);
        }
        
        const itemData = itemDoc.data();
        const productId = itemData.productId;
        const productName = itemData.productName;
        
        console.log(`[API] Removing ${productName} from catalogue`);
        
        // 2. ENHANCED: Deactivate price history first (preserve audit trail)
        try {
            const priceHistoryDeactivated = await deactivateProductPriceHistory(
                productId, 
                catalogueId, 
                { email: 'system' } // Use system user for removal operations
            );
            
            if (priceHistoryDeactivated) {
                console.log(`[API] ✅ Price history deactivated for ${productName}`);
            } else {
                console.log(`[API] ℹ️ No active price history found to deactivate for ${productName}`);
            }
            
        } catch (priceHistoryError) {
            console.error(`[API] Error deactivating price history:`, priceHistoryError);
            console.warn(`[API] Continuing with item removal despite price history error`);
        }
        
        // 3. Remove the item from catalogue (existing functionality)
        await itemRef.delete();
        console.log(`[API] ✅ Item removed from catalogue: ${productName}`);
        
        console.log(`[API] ✅ ENHANCED item removal completed with price history deactivation`);
        
    } catch (error) {
        console.error(`[API] Error in enhanced catalogue item removal:`, error);
        throw new Error(`Enhanced catalogue item removal failed: ${error.message}`);
    }
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
 * [NEW] Activates an existing inactive sales catalogue with price history management.
 * 
 * Activates the catalogue and creates/activates price history records for all
 * products in the catalogue. This function handles catalogues that were created
 * inactive or were previously deactivated.
 * 
 * @param {string} catalogueId - ID of the catalogue to activate
 * @param {Object} user - Currently authenticated user
 * 
 * @returns {Promise<number>} Number of price history records activated/created
 * 
 * @throws {Error} When catalogue not found or activation fails
 * 
 * @example
 * // Activate a previously inactive catalogue
 * const priceRecordsCreated = await activateSalesCatalogueWithPriceHistory('SC-2024-001', currentUser);
 * console.log(`Activated catalogue with ${priceRecordsCreated} price records`);
 * 
 * @since 1.0.0
 */
export async function activateSalesCatalogueWithPriceHistory(catalogueId, user) {
    const db = firebase.firestore();
    
    try {
        console.log(`[API] Activating catalogue ${catalogueId} with comprehensive price history management`);
        
        // 1. Get catalogue data
        const catalogueDoc = await db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(catalogueId).get();
        if (!catalogueDoc.exists) {
            throw new Error(`Catalogue ${catalogueId} not found`);
        }
        
        const catalogueData = catalogueDoc.data();
        console.log(`[API] Activating catalogue: ${catalogueData.catalogueName}`);
        
        // 2. Activate the main catalogue
        await updateSalesCatalogue(catalogueId, { isActive: true }, user);
        console.log(`[API] ✅ Main catalogue activated`);
        
        // 3. Get all items in the catalogue
        const itemsSnapshot = await db.collection(SALES_CATALOGUES_COLLECTION_PATH)
            .doc(catalogueId)
            .collection('items')
            .get();
        
        const catalogueItems = itemsSnapshot.docs.map(doc => doc.data());
        console.log(`[API] Found ${catalogueItems.length} items to activate price history for`);
        
        // 4. Create/activate price history records for all items
        let priceRecordsProcessed = 0;
        
        if (catalogueItems.length > 0) {
            priceRecordsProcessed = await batchCreatePriceHistory(
                catalogueId,
                catalogueData.catalogueName,
                catalogueItems.map(item => ({
                    productId: item.productId,
                    sellingPrice: item.sellingPrice
                })),
                true, // isActive = true
                user
            );
        }
        
        console.log(`[API] ✅ Catalogue activation completed:`);
        console.log(`[API]   - Catalogue: ${catalogueData.catalogueName} -> ACTIVE`);
        console.log(`[API]   - Items: ${catalogueItems.length}`);
        console.log(`[API]   - Price history records: ${priceRecordsProcessed}`);
        
        return priceRecordsProcessed;
        
    } catch (error) {
        console.error(`[API] Error activating catalogue with price history:`, error);
        throw new Error(`Catalogue activation failed: ${error.message}`);
    }
}

/**
 * [ENHANCED] Updates catalogue item with price history synchronization.
 * 
 * Updates the item in the catalogue's items sub-collection AND updates the
 * corresponding price history record to maintain pricing consistency across
 * the system. This ensures reports always reflect current pricing.
 * 
 * @param {string} catalogueId - The ID of the parent catalogue.
 * @param {string} itemId - The ID of the item document in the sub-collection.
 * @param {object} updatedData - The fields to update (e.g., { sellingPrice, isOverridden: true }).
 * @param {object} user - The currently authenticated user.
 * 
 * @since 1.0.0 (Enhanced with price history synchronization)
 */
export async function updateCatalogueItem(catalogueId, itemId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    try {
        console.log(`[API] Updating catalogue item ${itemId} with price history synchronization`);
        
        // 1. Get current item data to identify the product
        const itemRef = db.collection(SALES_CATALOGUES_COLLECTION_PATH)
            .doc(catalogueId)
            .collection('items')
            .doc(itemId);
        
        const currentItemDoc = await itemRef.get();
        if (!currentItemDoc.exists) {
            throw new Error(`Catalogue item ${itemId} not found`);
        }
        
        const currentItemData = currentItemDoc.data();
        const productId = currentItemData.productId;
        
        console.log(`[API] Updating item for product ${productId}: ${currentItemData.productName}`);
        
        // 2. Update the catalogue item (existing functionality)
        await itemRef.update({
            ...updatedData,
            'audit.updatedBy': user.email,
            'audit.updatedOn': now
        });
        
        console.log(`[API] ✅ Catalogue item updated`);
        
        // 3. ENHANCED: Update price history if selling price changed
        if (updatedData.sellingPrice && updatedData.sellingPrice !== currentItemData.sellingPrice) {
            console.log(`[API] Price changed from ₹${currentItemData.sellingPrice} to ₹${updatedData.sellingPrice}, updating price history...`);
            
            try {
                const priceHistoryUpdated = await updateProductPriceHistoryPrice(
                    productId,
                    catalogueId,
                    updatedData.sellingPrice,
                    user
                );
                
                if (priceHistoryUpdated) {
                    console.log(`[API] ✅ Price history synchronized: ${currentItemData.productName} -> ₹${updatedData.sellingPrice}`);
                } else {
                    console.warn(`[API] No price history found to update for product ${productId} in catalogue ${catalogueId}`);
                    console.log(`[API] This might be expected if the item was added before price history system was implemented`);
                }
                
            } catch (priceHistoryError) {
                console.error(`[API] Error updating price history for price change:`, priceHistoryError);
                // Don't fail the entire operation if price history update fails
                console.warn(`[API] Catalogue item updated but price history sync failed - reports may show inconsistent data`);
            }
        } else {
            console.log(`[API] No price change detected, price history unchanged`);
        }
        
        console.log(`[API] ✅ ENHANCED catalogue item update completed`);
        
    } catch (error) {
        console.error(`[API] Error in enhanced catalogue item update:`, error);
        throw new Error(`Enhanced catalogue item update failed: ${error.message}`);
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
 * [ENHANCED] Verifies consignment payment with donation source tracking capability.
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

        // ✅ FUTURE ENHANCEMENT: Add consignment donation handling if needed
        // If consignment payments can have overpayments, add donation logic here:
        
        if (paymentData.donationAmount && paymentData.donationAmount > 0) {
            const donationRef = db.collection(DONATIONS_COLLECTION_PATH).doc();
            transaction.set(donationRef, {
                amount: paymentData.donationAmount,
                donationDate: now,
                source: DONATION_SOURCES.CONSIGNMENT_OVERPAYMENT,
                sourceDetails: {
                    transactionType: 'consignment_payment_overpayment',
                    teamName: paymentData.teamName,
                    orderId: paymentData.orderId
                },
                relatedPaymentId: paymentId,
                recordedBy: adminUser.email
            });
        }
    
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
 * Helper function: Calculates invoice age safely handling different date formats
 */
function calculateInvoiceAge(saleDate) {
    try {
        const currentDate = new Date();
        let saleDateObj;
        
        if (saleDate?.toDate && typeof saleDate.toDate === 'function') {
            saleDateObj = saleDate.toDate(); // Firestore Timestamp
        } else if (saleDate instanceof Date) {
            saleDateObj = saleDate; // JavaScript Date
        } else if (typeof saleDate === 'string') {
            saleDateObj = new Date(saleDate); // Date string
        } else {
            return 0; // Cannot calculate
        }
        
        // Validate the date is reasonable
        if (isNaN(saleDateObj.getTime())) {
            return 0;
        }
        
        const ageDays = Math.ceil((currentDate - saleDateObj) / (1000 * 60 * 60 * 24));
        return Math.max(0, ageDays); // Ensure non-negative
        
    } catch (error) {
        console.warn('[API] Could not calculate invoice age:', error);
        return 0;
    }
}

/**
 * Helper function: Classifies donors based on donation amount for recognition programs
 */
function getDonorClassification(donationAmount) {
    if (donationAmount >= 2000) return 'Major Donor';
    if (donationAmount >= 1000) return 'Significant Donor';  
    if (donationAmount >= 500) return 'Generous Donor';
    if (donationAmount >= 200) return 'Regular Donor';
    if (donationAmount >= 100) return 'Supporter';
    if (donationAmount >= 50) return 'Contributor';
    return 'Friend';
}


/**
 * [ENHANCED] Creates a new Sales Invoice with donation source tracking,
 * decrements inventory, and optionally records an initial payment and donation.
 * @param {object} saleData - The complete data object for the new sale.
 * @param {object|null} initialPaymentData - Data for an initial payment, or null if none.
 * @param {number} donationAmount - The amount of any overpayment to be logged as a donation.
 * @param {string} userEmail - The email of the user creating the sale.
 * @param {string|null} donationSource - Standardized donation source from DONATION_SOURCES
 */
export async function createSaleAndUpdateInventory(saleData, initialPaymentData, donationAmount, userEmail, donationSource = null) {
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
                donationAmount: donationAmount || 0, // ✅ ENHANCED: Track donation in payment record
                totalCollected: initialPaymentData.amountPaid + (donationAmount || 0),
                status: 'Verified',
                recordedBy: userEmail
            });
        }

        // C. ✅ ENHANCED: Create donation record with standardized source tracking
        if (donationAmount > 0) {
            const donationRef = db.collection(DONATIONS_COLLECTION_PATH).doc();
            
            const donationId = `DON-${saleId}-${Date.now().toString().slice(-4)}`;

            transaction.set(donationRef, {
                donationId: donationId,
                amount: donationAmount,
                donationDate: now,
                source: donationSource || DONATION_SOURCES.POS_OVERPAYMENT, // ✅ USE CONSTANT
                sourceDetails: {
                    transactionType: 'direct_sale_overpayment',
                    store: saleData.store,
                    systemInvoiceId: saleId,
                    manualVoucherNumber: saleData.manualVoucherNumber,

                    originalTransactionAmount: saleData.financials.totalAmount,
                    customerPaymentAmount: saleData.financials.amountTendered,
                    overpaymentAmount: donationAmount,

                    paymentMode: initialPaymentData?.paymentMode || 'Cash',
                    transactionReference: initialPaymentData?.transactionRef || 'Direct sale',
                    

                    customerEmail: saleData.customerInfo.email,
                    customerPhone: saleData.customerInfo.phone,
                    saleDate: saleData.saleDate,

                    itemCount: saleData.lineItems.length,
                    wasPaidImmediately: true
                }, // ✅ ENHANCED: Rich source context
                relatedSaleId: saleRef.id,
                relatedPaymentId: initialPaymentData ? paymentRef.id : null, // ✅ LINK to payment if exists
                customerName: saleData.customerInfo.name,
                customerEmail: saleData.customerInfo.email,

                donorClassification: getDonorClassification(donationAmount),
                isAnonymous: false, // Direct sales have customer info
                recordedBy: userEmail,
                status: 'Verified',
                audit: {
                    createdBy: userEmail,
                    createdOn: now,
                    context: 'Direct sale overpayment donation',
                    donationSource: donationSource,
                    method: 'automatic_overpayment_processing'
                }
            });
            
            console.log(`[API] ✅ Enhanced donation record created:`);
            console.log(`  - Donation ID: ${donationId}`);
            console.log(`  - Amount: ₹${donationAmount.toFixed(2)}`);
            console.log(`  - Source: ${donationSource || 'POS Overpayment'}`);
            console.log(`  - Invoice: ${saleId} | Voucher: ${saleData.manualVoucherNumber}`);
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
 * [ENHANCED & CORRECTED] Records a payment against a sales invoice with comprehensive tracking.
 * 
 * Records customer payments against outstanding sales invoices with automatic balance updates,
 * donation processing for overpayments, cumulative cash tracking, and standardized source
 * attribution. Maintains complete audit trails and business intelligence context.
 * 
 * BUSINESS CONTEXT:
 * - Records customer payments against outstanding sales invoices
 * - Handles partial payments, full payments, and overpayments as donations
 * - Updates invoice balances and payment status automatically
 * - Tracks cumulative cash received for register reconciliation
 * - Critical for cash flow management and customer account reconciliation
 * 
 * ENHANCED FEATURES:
 * - Cumulative amountTendered tracking across multiple payments
 * - Standardized donation source attribution using DONATION_SOURCES constants
 * - Rich business intelligence context in donation records
 * - Safe date handling for invoice age calculations
 * - Comprehensive audit trails with payment sequence tracking
 * 
 * @param {object} paymentData - Payment details including donationSource for tracking
 * @param {object} user - The user recording the payment
 * @throws {Error} When invoice not found, validation fails, or transaction processing errors
 * @since 1.0.0 Enhanced with donation source tracking and cumulative cash management
 * @see DONATION_SOURCES - Standardized donation source constants
 * @see getDonorClassification() - Helper function for donor recognition levels
 */
export async function recordSalePayment(paymentData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    // Destructure payment data with enhanced fields
    const { 
        invoiceId, 
        amountPaid, 
        donationAmount, 
        donationSource, 
        customerName, 
        paymentMode, 
        transactionRef, 
        notes 
    } = paymentData;

    const saleRef = db.collection(SALES_COLLECTION_PATH).doc(invoiceId);
    const paymentRef = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH).doc();

    return db.runTransaction(async (transaction) => {
        try {
            // === PHASE 1: READ & VALIDATION ===
            console.log(`[API] Processing payment: ₹${amountPaid.toFixed(2)} for invoice ${invoiceId}`);
            
            const saleDoc = await transaction.get(saleRef);
            if (!saleDoc.exists) {
                throw new Error("The invoice you are trying to pay does not exist.");
            }
            
            const currentSaleData = saleDoc.data();
            
            // Validate invoice can accept payments
            if (currentSaleData.paymentStatus === 'Paid' && currentSaleData.balanceDue <= 0) {
                throw new Error("This invoice has already been paid in full.");
            }

            // === PHASE 2: PAYMENT RECORD CREATION ===
            const paymentId = `SPAY-${Date.now()}`;
            const physicalAmountGiven = amountPaid + (donationAmount || 0);
            
            transaction.set(paymentRef, {
                // Core payment identification
                invoiceId: invoiceId,
                paymentId: paymentId,
                paymentDate: now,
                
                // Financial details
                amountPaid: amountPaid,
                donationAmount: donationAmount || 0,
                totalCollected: physicalAmountGiven,
                
                // Payment method and reference
                paymentMode: paymentMode,
                transactionRef: transactionRef,
                notes: notes || '',
                
                // Administrative
                status: 'Verified',
                recordedBy: user.email,
                
                // ✅ ENHANCED: Donation source tracking
                donationSource: donationSource || null,
                
                // ✅ BUSINESS CONTEXT
                relatedInvoiceNumber: currentSaleData.saleId,
                customerName: customerName,
                store: currentSaleData.store,
                
                // Audit trail
                audit: {
                    createdBy: user.email,
                    createdOn: now,
                    context: 'Customer payment against sales invoice'
                }
            });

            console.log(`[API] ✅ Payment record created: ${paymentId}`);

            // === PHASE 3: INVOICE FINANCIAL UPDATES ===
            const newTotalAmountPaid = (currentSaleData.totalAmountPaid || 0) + amountPaid;
            const newBalanceDue = Math.max(0, (currentSaleData.financials?.totalAmount || 0) - newTotalAmountPaid);
            
            // ✅ ENHANCED: Proper payment status calculation
            let newPaymentStatus;
            if (newBalanceDue <= 0) {
                newPaymentStatus = 'Paid';
            } else if (newTotalAmountPaid > 0) {
                newPaymentStatus = 'Partially Paid';
            } else {
                newPaymentStatus = 'Unpaid'; // Edge case
            }

            // ✅ ENHANCED: Cumulative amount tendered tracking
            const currentAmountTendered = currentSaleData.financials?.amountTendered || 0;
            const newAmountTendered = currentAmountTendered + physicalAmountGiven;
            const currentPaymentCount = currentSaleData.financials?.paymentCount || 0;

            // Update invoice with enhanced financial tracking
            transaction.update(saleRef, {
                // Core payment tracking
                totalAmountPaid: newTotalAmountPaid,
                balanceDue: newBalanceDue,
                paymentStatus: newPaymentStatus,
                
                // ✅ ENHANCED: Comprehensive financial tracking
                'financials.amountTendered': newAmountTendered,
                'financials.totalPhysicalCashReceived': newAmountTendered,
                'financials.lastPaymentDate': now,
                'financials.paymentCount': currentPaymentCount + 1,
                'financials.lastPaymentAmount': physicalAmountGiven,
                'financials.lastPaymentMode': paymentMode,
                
                // ✅ AUDIT: Payment history summary
                lastPaymentDetails: {
                    paymentId: paymentId,
                    amount: amountPaid,
                    donationAmount: donationAmount || 0,
                    paymentMode: paymentMode,
                    recordedBy: user.email,
                    recordedOn: now
                }
            });

            console.log(`[API] ✅ Invoice financial totals updated:`);
            console.log(`  - Previous paid: ₹${(currentSaleData.totalAmountPaid || 0).toFixed(2)}`);
            console.log(`  - New total paid: ₹${newTotalAmountPaid.toFixed(2)}`);
            console.log(`  - New balance: ₹${newBalanceDue.toFixed(2)}`);
            console.log(`  - New status: ${newPaymentStatus}`);
            console.log(`  - Cumulative cash: ₹${newAmountTendered.toFixed(2)}`);

            // === PHASE 4: DONATION RECORD (IF APPLICABLE) ===
            if (donationAmount > 0) {
                const donationRef = db.collection(DONATIONS_COLLECTION_PATH).doc();
                const donationId = `DON-${paymentId}-${Date.now().toString().slice(-4)}`;
                
                // ✅ CORRECTED: Safe invoice age calculation
                const currentDate = new Date();
                let invoiceAge = 0;
                
                try {
                    let saleDate;
                    if (currentSaleData.saleDate?.toDate) {
                        saleDate = currentSaleData.saleDate.toDate();
                    } else if (currentSaleData.saleDate instanceof Date) {
                        saleDate = currentSaleData.saleDate;
                    } else {
                        saleDate = new Date(); // Fallback
                    }
                    
                    invoiceAge = Math.ceil((currentDate - saleDate) / (1000 * 60 * 60 * 24));
                    invoiceAge = Math.max(0, invoiceAge); // Ensure non-negative
                } catch (dateError) {
                    console.warn('[API] Invoice age calculation failed:', dateError);
                    invoiceAge = 0;
                }

                // ✅ ENHANCED: Comprehensive donation record
                transaction.set(donationRef, {
                    // Core donation identification
                    donationId: donationId,
                    amount: donationAmount,
                    donationDate: now,
                    
                    // ✅ STANDARDIZED: Source tracking using constants
                    source: donationSource || DONATION_SOURCES.INVOICE_OVERPAYMENT,
                    
                    // ✅ COMPREHENSIVE: Rich source context
                    sourceDetails: {
                        // Transaction classification
                        transactionType: 'invoice_payment_overpayment',
                        donationContext: 'customer_payment_overpayment',
                        
                        // Business identifiers
                        store: currentSaleData.store,
                        systemInvoiceId: currentSaleData.saleId,
                        manualVoucherNumber: currentSaleData.manualVoucherNumber,
                        
                        // Financial context
                        originalInvoiceAmount: currentSaleData.financials?.totalAmount || 0,
                        paymentAmount: amountPaid,
                        totalPhysicalPayment: physicalAmountGiven,
                        invoiceBalanceBeforePayment: currentSaleData.balanceDue || 0,
                        invoiceBalanceAfterPayment: newBalanceDue,
                        
                        // Payment details
                        paymentMode: paymentMode,
                        transactionReference: transactionRef,
                        paymentId: paymentId,
                        
                        // ✅ BUSINESS INTELLIGENCE
                        customerEmail: currentSaleData.customerInfo?.email || 'unknown',
                        customerPhone: currentSaleData.customerInfo?.phone || 'unknown',
                        invoiceAge: invoiceAge,
                        wasPartiallyPaid: (currentSaleData.totalAmountPaid || 0) > 0,
                        paymentSequence: (currentSaleData.totalAmountPaid || 0) > 0 ? 'subsequent_payment' : 'first_payment',
                        paymentNumber: currentPaymentCount + 1,
                        
                        // ✅ CUSTOMER INSIGHTS
                        isRepeatCustomer: currentPaymentCount > 0,
                        customerTotalContributed: newAmountTendered,
                        donationPercentageOfInvoice: ((donationAmount / (currentSaleData.financials?.totalAmount || 1)) * 100).toFixed(2)
                    },
                    
                    // Relationships for data linking
                    relatedPaymentId: paymentRef.id,
                    relatedInvoiceId: invoiceId,
                    relatedSaleId: invoiceId, // Same as invoice for sales
                    
                    // Customer information
                    customerName: customerName,
                    customerEmail: currentSaleData.customerInfo?.email,
                    
                    // ✅ DONOR RECOGNITION
                    donorClassification: getDonorClassification(donationAmount),
                    isAnonymous: false, // Sales donations have customer info
                    donationCategory: 'customer_generosity',
                    
                    // Administrative
                    recordedBy: user.email,
                    status: 'Verified',
                    processedAutomatically: true,
                    
                    // ✅ COMPREHENSIVE: Audit trail
                    audit: {
                        createdBy: user.email,
                        createdOn: now,
                        context: 'Invoice payment overpayment donation',
                        donationSource: donationSource,
                        method: 'payment_overpayment_processing',
                        userRole: user.role || 'unknown',
                        
                        // Processing context
                        processingLocation: 'sales_payment_modal',
                        systemVersion: '1.0.0',
                        dataVersion: 'enhanced_donation_tracking'
                    }
                });
                
                console.log(`[API] ✅ Enhanced donation record created:`);
                console.log(`  - Donation ID: ${donationId}`);
                console.log(`  - Amount: ₹${donationAmount.toFixed(2)}`);
                console.log(`  - Source: ${donationSource || 'Invoice Overpayment'}`);
                console.log(`  - Customer: ${customerName}`);
                console.log(`  - Invoice Age: ${invoiceAge} days`);
                console.log(`  - Payment Sequence: ${(currentSaleData.totalAmountPaid || 0) > 0 ? 'Subsequent' : 'First'}`);
            }

        } catch (transactionError) {
            console.error('[API] Error in payment transaction:', transactionError);
            throw new Error(`Payment processing failed: ${transactionError.message}`);
        }
    });
}


/**
 * [ENHANCED] Voids a verified payment with proper payment status recalculation,
 * creating a reversing transaction and updating all related financial totals.
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

        // READ the current invoice state to calculate new payment status
        const invoiceDoc = await transaction.get(orderRef);
        if (!invoiceDoc.exists) {
            throw new Error("Related invoice not found.");
        }
        const currentInvoiceData = invoiceDoc.data();

        // 2. WRITE: Update the original payment's status to "Voided".
        transaction.update(paymentRef, { 
            status: 'Voided',
            voidedBy: adminUser.email,
            voidedOn: now,
            originalStatus: 'Verified' // Track original status
        });

        // 3. WRITE: Create a new, reversing payment record for the audit trail.
        const reversalPaymentRef = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH).doc();
        transaction.set(reversalPaymentRef, {
            invoiceId: originalPaymentData.invoiceId,
            paymentId: `VOID-${originalPaymentData.paymentId}`,
            paymentDate: now,
            amountPaid: -originalPaymentData.amountPaid, // Negative amount
            donationAmount: -(originalPaymentData.donationAmount || 0), // Negative donation
            totalCollected: -(originalPaymentData.totalCollected || originalPaymentData.amountPaid),
            paymentMode: 'REVERSAL',
            transactionRef: `Reversal for ${originalPaymentData.transactionRef}`,
            status: 'Void Reversal',
            recordedBy: adminUser.email,
            originalPaymentId: paymentId, // Link to original payment
            notes: `Reversal of payment ${originalPaymentData.paymentId} by ${adminUser.email}`
        });

        // 4. ✅ ENHANCED: Calculate new payment status based on remaining balance
        const newTotalAmountPaid = (currentInvoiceData.totalAmountPaid || 0) - originalPaymentData.amountPaid;
        const newBalanceDue = currentInvoiceData.financials.totalAmount - newTotalAmountPaid;
        
        // ✅ CRITICAL: Recalculate payment status based on new balance
        let newPaymentStatus;
        if (newBalanceDue <= 0) {
            newPaymentStatus = 'Paid';
        } else if (newTotalAmountPaid > 0) {
            newPaymentStatus = 'Partially Paid';
        } else {
            newPaymentStatus = 'Unpaid';
        }

        // ✅ CORRECTED: Use plain numbers in console logs instead of formatCurrency
        console.log(`[API] Payment status recalculation:`);
        console.log(`  - Previous status: ${currentInvoiceData.paymentStatus}`);
        console.log(`  - Previous paid: ₹${(currentInvoiceData.totalAmountPaid || 0).toFixed(2)}`); // ✅ MANUAL FORMAT
        console.log(`  - Voided amount: ₹${originalPaymentData.amountPaid.toFixed(2)}`); // ✅ MANUAL FORMAT
        console.log(`  - New paid total: ₹${newTotalAmountPaid.toFixed(2)}`); // ✅ MANUAL FORMAT
        console.log(`  - New balance: ₹${newBalanceDue.toFixed(2)}`); // ✅ MANUAL FORMAT
        console.log(`  - New status: ${newPaymentStatus}`);


        // 5. WRITE: Update invoice with recalculated amounts and status
        transaction.update(orderRef, {
            totalAmountPaid: newTotalAmountPaid,
            balanceDue: newBalanceDue,
            paymentStatus: newPaymentStatus, // ✅ CRITICAL: Update payment status
            lastPaymentVoided: {
                voidedAmount: originalPaymentData.amountPaid,
                voidedBy: adminUser.email,
                voidedOn: now,
                previousStatus: currentInvoiceData.paymentStatus
            } // ✅ AUDIT: Track void details
        });

        // 6. ✅ ENHANCED: Create reversing donation record if original had donation
        if (originalPaymentData.donationAmount && originalPaymentData.donationAmount > 0) {
            const donationRef = db.collection(DONATIONS_COLLECTION_PATH).doc();
            transaction.set(donationRef, {
                amount: -originalPaymentData.donationAmount, // Negative amount (reversal)
                donationDate: now,
                source: originalPaymentData.donationSource || DONATION_SOURCES.INVOICE_OVERPAYMENT,
                sourceDetails: {
                    transactionType: 'payment_void_reversal',
                    store: currentInvoiceData.store,
                    
                    // ✅ CORRECTED: Use both identifiers for complete audit
                    systemInvoiceId: currentInvoiceData.saleId,           // Digital invoice ID
                    manualVoucherNumber: currentInvoiceData.manualVoucherNumber, // Manual voucher
                    
                    originalPaymentId: paymentId,
                    voidReason: 'Administrative payment void',
                    originalPaymentMode: originalPaymentData.paymentMode,
                    originalTransactionRef: originalPaymentData.transactionRef
                },
                relatedPaymentId: paymentId, // Link to original voided payment
                relatedReversalPaymentId: reversalPaymentRef.id, // Link to reversal record
                customerName: currentInvoiceData.customerInfo?.name,
                customerEmail: currentInvoiceData.customerInfo?.email,
                recordedBy: adminUser.email,
                audit: {
                    createdBy: adminUser.email,
                    createdOn: now,
                    context: 'Payment void donation reversal',
                    originalDonationAmount: originalPaymentData.donationAmount
                }
            });
            
            console.log(`[API] ✅ Donation reversal recorded: ₹${(-originalPaymentData.donationAmount).toFixed(2)}`); // ✅ MANUAL FORMAT
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

// =======================================================
// --- PRODUCT PRICING HISTORY API FUNCTIONS ---
// =======================================================

/**
 * Creates a price history record when a product is added to an active sales catalogue.
 * 
 * This function creates a pricing audit trail in the productCatalogue collection
 * under a priceHistory sub-collection. This enables efficient price tracking
 * and accurate inventory valuation without complex catalogue queries.
 * 
 * BUSINESS FLOW:
 * - Called when sales catalogue becomes active
 * - Called when product added to existing active catalogue
 * - Creates centralized pricing record for reports
 * 
 * @param {string} productId - Product document ID from productCatalogue
 * @param {Object} priceHistoryData - Price history record data:
 *   - salesCatalogueId: ID of the sales catalogue
 *   - salesCatalogueName: Name of the sales catalogue
 *   - unitSellingPrice: Current selling price for this product
 *   - isActive: Whether this price is currently active
 * @param {Object} user - Currently authenticated user
 * 
 * @returns {Promise<DocumentReference>} Reference to the created price history record
 * 
 * @throws {Error} When productId invalid or Firestore operation fails
 * 
 * @example
 * // Create price history when catalogue becomes active
 * await createProductPriceHistory('PROD123', {
 *   salesCatalogueId: 'SC-2024-001',
 *   salesCatalogueName: 'Christmas Sale 2024',
 *   unitSellingPrice: 25.50,
 *   isActive: true
 * }, currentUser);
 * 
 * @since 1.0.0
 */
export async function createProductPriceHistory(productId, priceHistoryData, user) {
    // Input validation
    if (!productId || typeof productId !== 'string') {
        throw new Error('createProductPriceHistory requires a valid product ID string');
    }
    
    if (!priceHistoryData || typeof priceHistoryData !== 'object') {
        throw new Error('createProductPriceHistory requires valid price history data object');
    }
    
    if (!user || !user.email) {
        throw new Error('createProductPriceHistory requires a valid user object with email');
    }

    // Validate required price history fields
    const requiredFields = ['salesCatalogueId', 'salesCatalogueName', 'unitSellingPrice'];
    for (const field of requiredFields) {
        if (!priceHistoryData[field]) {
            throw new Error(`Missing required field in price history data: ${field}`);
        }
    }

    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    try {
        console.log(`[API] Creating price history for product ${productId} in catalogue ${priceHistoryData.salesCatalogueName}`);
        
        // Create reference to the price history sub-collection
        const priceHistoryRef = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH)
            .doc(productId)
            .collection('priceHistory')
            .doc(); // Auto-generate document ID
        
        // Prepare complete price history document
        const priceHistoryDocument = {
            // Essential catalogue reference
            salesCatalogueId: priceHistoryData.salesCatalogueId,
            salesCatalogueName: priceHistoryData.salesCatalogueName,
            
            // Core pricing data
            unitSellingPrice: Number(priceHistoryData.unitSellingPrice), // Ensure number type
            isActive: priceHistoryData.isActive !== false, // Default to true if not specified
            
            // Standard audit fields
            createdBy: user.email,
            createdDate: now,
            updatedBy: user.email,
            updatedDate: now
        };
        
        // Create the price history record
        await priceHistoryRef.set(priceHistoryDocument);
        
        console.log(`[API] ✅ Price history created successfully for ${productId}`);
        console.log(`[API] Price: ₹${priceHistoryData.unitSellingPrice}, Active: ${priceHistoryDocument.isActive}`);
        
        return priceHistoryRef;
        
    } catch (error) {
        console.error(`[API] Error creating price history for product ${productId}:`, error);
        throw new Error(`Failed to create price history: ${error.message}`);
    }
}

/**
 * Updates the active status of price history records for a specific catalogue.
 * 
 * Used when catalogues are activated or deactivated to maintain accurate
 * pricing state across all products. This ensures inventory valuation
 * reports reflect only currently active pricing.
 * 
 * @param {string} salesCatalogueId - ID of the sales catalogue being updated
 * @param {boolean} isActive - New active status for the catalogue's price history
 * @param {Object} user - Currently authenticated user
 * 
 * @returns {Promise<void>} Resolves when all price history records updated
 * 
 * @throws {Error} When catalogue ID invalid or batch operation fails
 * 
 * @example
 * // Deactivate all price history for a catalogue
 * await updateProductPriceHistoryStatus('SC-2024-001', false, currentUser);
 * 
 * // Activate all price history for a catalogue
 * await updateProductPriceHistoryStatus('SC-2024-001', true, currentUser);
 * 
 * @since 1.0.0
 */
export async function updateProductPriceHistoryStatus(salesCatalogueId, isActive, user) {
    // Input validation
    if (!salesCatalogueId || typeof salesCatalogueId !== 'string') {
        throw new Error('updateProductPriceHistoryStatus requires a valid catalogue ID string');
    }
    
    if (typeof isActive !== 'boolean') {
        throw new Error('updateProductPriceHistoryStatus requires isActive to be a boolean');
    }
    
    if (!user || !user.email) {
        throw new Error('updateProductPriceHistoryStatus requires a valid user object');
    }

    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    try {
        console.log(`[API] Updating price history status for catalogue ${salesCatalogueId} to ${isActive ? 'active' : 'inactive'}`);
        
        // Create a batch operation for atomic updates
        const batch = db.batch();
        let updateCount = 0;
        
        // Get all products to check their price history
        const productsSnapshot = await db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).get();
        console.log(`[API] Checking price history across ${productsSnapshot.size} products`);
        
        // Process each product's price history in parallel for efficiency
        const updatePromises = productsSnapshot.docs.map(async (productDoc) => {
            const productId = productDoc.id;
            
            // Query price history records for this catalogue
            const priceHistoryQuery = productDoc.ref.collection('priceHistory')
                .where('salesCatalogueId', '==', salesCatalogueId);
            
            const priceHistorySnapshot = await priceHistoryQuery.get();
            
            // Update each matching price history record
            priceHistorySnapshot.docs.forEach(priceDoc => {
                batch.update(priceDoc.ref, {
                    isActive: isActive,
                    updatedBy: user.email,
                    updatedDate: now
                });
                updateCount++;
            });
        });
        
        // Wait for all price history queries to complete
        await Promise.all(updatePromises);
        
        // Commit all updates atomically
        if (updateCount > 0) {
            await batch.commit();
            console.log(`[API] ✅ Updated ${updateCount} price history records for catalogue ${salesCatalogueId}`);
        } else {
            console.log(`[API] ℹ️ No price history records found for catalogue ${salesCatalogueId}`);
        }
        
    } catch (error) {
        console.error(`[API] Error updating price history status for catalogue ${salesCatalogueId}:`, error);
        throw new Error(`Failed to update price history status: ${error.message}`);
    }
}

/**
 * Retrieves current selling prices for products from their price history records.
 * 
 * This is the optimized function for inventory valuation reports. It gets
 * current active prices from the centralized price history instead of
 * querying multiple sales catalogues and their sub-collections.
 * 
 * OPTIMIZATION BENEFITS:
 * - Single query per product vs multiple catalogue queries
 * - Centralized pricing data (no catalogue sub-collection traversal)  
 * - Handles multiple catalogue pricing automatically
 * - Perfect for free tier usage
 * 
 * @param {string[]} [productIds=null] - Specific products to get prices for (null = all products)
 * @param {boolean} [useHighestPrice=true] - Use highest price when product in multiple catalogues
 * 
 * @returns {Promise<Map>} Map of productId -> pricing information:
 *   - sellingPrice: Current selling price (highest if multiple catalogues)
 *   - catalogueCount: Number of active catalogues containing this product
 *   - catalogueSources: Array of catalogue names and their prices
 *   - lastUpdated: Most recent price update timestamp
 * 
 * @throws {Error} When database queries fail
 * 
 * @example
 * // Get current prices for all products
 * const currentPrices = await getCurrentSellingPricesFromHistory();
 * 
 * currentPrices.forEach((priceInfo, productId) => {
 *   console.log(`Product ${productId}: ₹${priceInfo.sellingPrice} (from ${priceInfo.catalogueCount} catalogues)`);
 * });
 * 
 * // Get prices for specific products only
 * const specificPrices = await getCurrentSellingPricesFromHistory(['PROD1', 'PROD2']);
 * 
 * @since 1.0.0
 */
export async function getCurrentSellingPricesFromHistory(productIds = null, useHighestPrice = true) {
    const db = firebase.firestore();
    let totalReads = 0;
    
    try {
        console.log(`[API] Getting current selling prices from price history (highest price: ${useHighestPrice})`);
        
        // Determine which products to query
        let productsToQuery;
        if (productIds && Array.isArray(productIds)) {
            productsToQuery = productIds;
            console.log(`[API] Querying prices for ${productsToQuery.length} specific products`);
        } else {
            // Get all active products from masterData cache
            productsToQuery = masterData.products
                .filter(product => product.isActive)
                .map(product => product.id);
            console.log(`[API] Querying prices for ${productsToQuery.length} active products from cache`);
        }
        
        const currentPrices = new Map();
        
        // Query price history for each product in parallel (optimized for speed)
        const priceQueryPromises = productsToQuery.map(async (productId) => {
            try {
                // Single query per product to get all active price history
                const priceHistoryQuery = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH)
                    .doc(productId)
                    .collection('priceHistory')
                    .where('isActive', '==', true)
                    .orderBy('updatedDate', 'desc'); // Most recently updated first
                
                const priceSnapshot = await priceHistoryQuery.get();
                const readCount = priceSnapshot.size;
                
                if (readCount > 0) {
                    const activePriceRecords = priceSnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    
                    // Determine which price to use
                    let selectedPrice;
                    let selectedCatalogue;
                    
                    if (useHighestPrice && activePriceRecords.length > 1) {
                        // Find highest price for maximum revenue potential
                        const highestPriceRecord = activePriceRecords.reduce((highest, current) => {
                            return (current.unitSellingPrice > highest.unitSellingPrice) ? current : highest;
                        });
                        
                        selectedPrice = highestPriceRecord.unitSellingPrice;
                        selectedCatalogue = highestPriceRecord.salesCatalogueName;
                    } else {
                        // Use the most recently updated price
                        selectedPrice = activePriceRecords[0].unitSellingPrice;
                        selectedCatalogue = activePriceRecords[0].salesCatalogueName;
                    }
                    
                    // Store comprehensive pricing information
                    currentPrices.set(productId, {
                        sellingPrice: selectedPrice,
                        catalogueCount: activePriceRecords.length,
                        catalogueSources: activePriceRecords.map(record => ({
                            catalogueName: record.salesCatalogueName,
                            catalogueId: record.salesCatalogueId,
                            price: record.unitSellingPrice,
                            lastUpdated: record.updatedDate
                        })),
                        selectedCatalogueSource: selectedCatalogue,
                        lastUpdated: activePriceRecords[0].updatedDate,
                        priceRange: activePriceRecords.length > 1 ? {
                            lowest: Math.min(...activePriceRecords.map(r => r.unitSellingPrice)),
                            highest: Math.max(...activePriceRecords.map(r => r.unitSellingPrice)),
                            variation: Math.max(...activePriceRecords.map(r => r.unitSellingPrice)) - 
                                      Math.min(...activePriceRecords.map(r => r.unitSellingPrice))
                        } : null
                    });
                    
                    console.log(`[API] ✅ ${productId}: ₹${selectedPrice} from ${selectedCatalogue} (${activePriceRecords.length} catalogues)`);
                }
                
                return readCount;
                
            } catch (productError) {
                console.warn(`[API] Error getting price history for product ${productId}:`, productError);
                return 0; // Return 0 reads for failed queries
            }
        });
        
        // Execute all price queries in parallel and sum up reads
        const readCounts = await Promise.all(priceQueryPromises);
        totalReads = readCounts.reduce((sum, count) => sum + count, 0);
        
        console.log(`[API] ✅ Current selling prices retrieved using ${totalReads} Firestore reads`);
        console.log(`[API] Found pricing for ${currentPrices.size} products out of ${productsToQuery.length} queried`);
        
        // Log pricing insights
        let multiCatalogueProducts = 0;
        let totalPriceVariation = 0;
        
        currentPrices.forEach((priceInfo, productId) => {
            if (priceInfo.catalogueCount > 1) {
                multiCatalogueProducts++;
                if (priceInfo.priceRange) {
                    totalPriceVariation += priceInfo.priceRange.variation;
                }
            }
        });
        
        if (multiCatalogueProducts > 0) {
            const avgVariation = totalPriceVariation / multiCatalogueProducts;
            console.log(`[API] 📊 ${multiCatalogueProducts} products in multiple catalogues, avg price variation: ₹${avgVariation.toFixed(2)}`);
        }
        
        return currentPrices;
        
    } catch (error) {
        console.error(`[API] Error getting current selling prices from history (${totalReads} reads used):`, error);
        throw new Error(`Failed to get current selling prices: ${error.message}`);
    }
}

/**
 * Batch creates price history records for all products in a sales catalogue.
 * 
 * Efficiently creates price history records for multiple products when a
 * sales catalogue is activated. Uses batch operations for optimal performance
 * and atomic consistency.
 * 
 * @param {string} salesCatalogueId - ID of the sales catalogue
 * @param {string} salesCatalogueName - Name of the sales catalogue  
 * @param {Array} catalogueItems - Array of catalogue item objects with productId and sellingPrice
 * @param {boolean} isActive - Whether the price history should be marked as active
 * @param {Object} user - Currently authenticated user
 * 
 * @returns {Promise<number>} Number of price history records created
 * 
 * @throws {Error} When parameters invalid or batch operation fails
 * 
 * @example
 * // Create price history for all items when catalogue is activated
 * const catalogueItems = [
 *   { productId: 'PROD1', sellingPrice: 25.00 },
 *   { productId: 'PROD2', sellingPrice: 15.50 }
 * ];
 * 
 * const recordsCreated = await batchCreatePriceHistory(
 *   'SC-2024-001', 
 *   'Christmas Sale 2024', 
 *   catalogueItems, 
 *   true, 
 *   currentUser
 * );
 * 
 * console.log(`Created ${recordsCreated} price history records`);
 * 
 * @since 1.0.0
 */
export async function batchCreatePriceHistory(salesCatalogueId, salesCatalogueName, catalogueItems, isActive, user) {
    // Input validation
    if (!salesCatalogueId || !salesCatalogueName) {
        throw new Error('batchCreatePriceHistory requires valid catalogue ID and name');
    }
    
    if (!catalogueItems || !Array.isArray(catalogueItems) || catalogueItems.length === 0) {
        throw new Error('batchCreatePriceHistory requires a non-empty array of catalogue items');
    }
    
    if (typeof isActive !== 'boolean') {
        throw new Error('batchCreatePriceHistory requires isActive to be a boolean');
    }

    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    try {
        console.log(`[API] Batch creating price history for ${catalogueItems.length} items in catalogue ${salesCatalogueName}`);
        
        // Create batch operation for atomic execution
        const batch = db.batch();
        let batchCount = 0;
        
        // Process each catalogue item
        catalogueItems.forEach(item => {
            // Validate item structure
            if (!item.productId || typeof item.sellingPrice !== 'number') {
                console.warn(`[API] Skipping invalid catalogue item:`, item);
                return;
            }
            
            // Create price history document reference
            const priceHistoryRef = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH)
                .doc(item.productId)
                .collection('priceHistory')
                .doc(); // Auto-generate ID
            
            // Prepare price history document
            const priceHistoryDocument = {
                salesCatalogueId: salesCatalogueId,
                salesCatalogueName: salesCatalogueName,
                unitSellingPrice: item.sellingPrice,
                isActive: isActive,
                createdBy: user.email,
                createdDate: now,
                updatedBy: user.email,
                updatedDate: now
            };
            
            // Add to batch
            batch.set(priceHistoryRef, priceHistoryDocument);
            batchCount++;
            
            console.log(`[API] Batched price history: ${item.productId} -> ₹${item.sellingPrice}`);
        });
        
        // Commit the entire batch atomically
        if (batchCount > 0) {
            await batch.commit();
            console.log(`[API] ✅ Batch created ${batchCount} price history records successfully`);
        } else {
            console.log(`[API] ⚠️ No valid items found for batch price history creation`);
        }
        
        return batchCount;
        
    } catch (error) {
        console.error(`[API] Error in batch price history creation for catalogue ${salesCatalogueId}:`, error);
        throw new Error(`Batch price history creation failed: ${error.message}`);
    }
}

/**
 * [ENHANCED] Updates or creates product price history record with backward compatibility.
 * 
 * Updates existing price history record OR creates a new one if none exists.
 * This provides full backward compatibility for products added to catalogues
 * before the price history system was implemented.
 * 
 * BACKWARD COMPATIBILITY:
 * - If price history exists: Updates the existing record
 * - If no price history exists: Creates a new price history record
 * - Handles transition from old system to new system seamlessly
 * 
 * @param {string} productId - Product document ID
 * @param {string} salesCatalogueId - Sales catalogue ID containing the item
 * @param {number} newSellingPrice - Updated selling price
 * @param {Object} user - Currently authenticated user
 * 
 * @returns {Promise<Object>} Operation result:
 *   - updated: boolean - Whether existing record was updated
 *   - created: boolean - Whether new record was created
 *   - priceHistoryId: string - ID of the price history record
 * 
 * @throws {Error} When parameters invalid or operation fails
 * 
 * @example
 * // This will either update existing or create new price history
 * const result = await updateProductPriceHistoryPrice('PROD123', 'SC-2024-001', 28.75, user);
 * 
 * if (result.created) {
 *   console.log('New price history record created for backward compatibility');
 * } else if (result.updated) {
 *   console.log('Existing price history record updated');
 * }
 * 
 * @since 1.0.0
 */
export async function updateProductPriceHistoryPrice(productId, salesCatalogueId, newSellingPrice, user) {
    // Input validation
    if (!productId || !salesCatalogueId) {
        throw new Error('updateProductPriceHistoryPrice requires valid product and catalogue IDs');
    }
    
    if (typeof newSellingPrice !== 'number' || newSellingPrice < 0) {
        throw new Error('updateProductPriceHistoryPrice requires a valid positive selling price');
    }
    
    if (!user || !user.email) {
        throw new Error('updateProductPriceHistoryPrice requires a valid user object');
    }

    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    try {
        console.log(`[API] Updating/creating price history for product ${productId} in catalogue ${salesCatalogueId} to ₹${newSellingPrice}`);
        
        // 1. Try to find existing active price history record
        const priceHistoryQuery = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH)
            .doc(productId)
            .collection('priceHistory')
            .where('salesCatalogueId', '==', salesCatalogueId)
            .where('isActive', '==', true)
            .limit(1);
        
        const priceHistorySnapshot = await priceHistoryQuery.get();
        
        if (!priceHistorySnapshot.empty) {
            // CASE 1: Price history exists - UPDATE existing record
            const existingPriceDoc = priceHistorySnapshot.docs[0];
            const existingData = existingPriceDoc.data();
            
            console.log(`[API] Found existing price history record, updating from ₹${existingData.unitSellingPrice} to ₹${newSellingPrice}`);
            
            await existingPriceDoc.ref.update({
                unitSellingPrice: newSellingPrice,
                updatedBy: user.email,
                updatedDate: now
            });
            
            console.log(`[API] ✅ Existing price history updated successfully`);
            
            return {
                updated: true,
                created: false,
                priceHistoryId: existingPriceDoc.id,
                previousPrice: existingData.unitSellingPrice,
                newPrice: newSellingPrice,
                operation: 'updated'
            };
            
        } else {
            // CASE 2: No price history exists - CREATE new record (BACKWARD COMPATIBILITY)
            console.log(`[API] No price history found, creating new record for backward compatibility`);
            
            // Get catalogue information for the new price history record
            const catalogueDoc = await db.collection(SALES_CATALOGUES_COLLECTION_PATH).doc(salesCatalogueId).get();
            
            if (!catalogueDoc.exists) {
                throw new Error(`Catalogue ${salesCatalogueId} not found for price history creation`);
            }
            
            const catalogueData = catalogueDoc.data();
            
            // Create new price history record
            const priceHistoryRef = await createProductPriceHistory(productId, {
                salesCatalogueId: salesCatalogueId,
                salesCatalogueName: catalogueData.catalogueName,
                unitSellingPrice: newSellingPrice,
                isActive: catalogueData.isActive !== false // Inherit catalogue's active status
            }, user);
            
            console.log(`[API] ✅ New price history record created for backward compatibility`);
            
            return {
                updated: false,
                created: true,
                priceHistoryId: priceHistoryRef.id,
                previousPrice: null,
                newPrice: newSellingPrice,
                operation: 'created',
                backwardCompatibility: true
            };
        }
        
    } catch (error) {
        console.error(`[API] Error in updateProductPriceHistoryPrice for ${productId}:`, error);
        throw new Error(`Price history update/create failed: ${error.message}`);
    }
}



/**
 * Removes (deactivates) price history records when product is removed from catalogue.
 * 
 * Instead of deleting price history records (which would lose audit trail),
 * this function marks them as inactive when products are removed from catalogues.
 * This preserves historical pricing data while ensuring accurate current pricing.
 * 
 * @param {string} productId - Product document ID
 * @param {string} salesCatalogueId - Sales catalogue ID to remove from
 * @param {Object} user - Currently authenticated user
 * 
 * @returns {Promise<boolean>} True if price history was deactivated, false if not found
 * 
 * @throws {Error} When parameters invalid or deactivation fails
 * 
 * @example
 * // Deactivate price history when product removed from catalogue
 * const deactivated = await deactivateProductPriceHistory(
 *   'PROD123', 
 *   'SC-2024-001', 
 *   currentUser
 * );
 * 
 * @since 1.0.0
 */
export async function deactivateProductPriceHistory(productId, salesCatalogueId, user) {
    // Input validation
    if (!productId || !salesCatalogueId) {
        throw new Error('deactivateProductPriceHistory requires valid product and catalogue IDs');
    }

    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    
    try {
        console.log(`[API] Deactivating price history for product ${productId} in catalogue ${salesCatalogueId}`);
        
        // Find and deactivate the specific price history record
        const priceHistoryQuery = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH)
            .doc(productId)
            .collection('priceHistory')
            .where('salesCatalogueId', '==', salesCatalogueId)
            .where('isActive', '==', true);
        
        const priceHistorySnapshot = await priceHistoryQuery.get();
        
        if (priceHistorySnapshot.empty) {
            console.log(`[API] No active price history found to deactivate for product ${productId}`);
            return false;
        }
        
        // Deactivate all matching records (should typically be just one)
        const batch = db.batch();
        priceHistorySnapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
                isActive: false,
                updatedBy: user.email,
                updatedDate: now
            });
        });
        
        await batch.commit();
        
        console.log(`[API] ✅ Deactivated ${priceHistorySnapshot.size} price history records for product ${productId}`);
        return true;
        
    } catch (error) {
        console.error(`[API] Error deactivating price history for product ${productId}:`, error);
        throw new Error(`Failed to deactivate price history: ${error.message}`);
    }
}

/**
 * Gets comprehensive price analysis for a specific product across all catalogues.
 * 
 * Provides detailed pricing insights for a single product including current
 * active prices, historical pricing, catalogue distribution, and pricing
 * recommendations. Useful for pricing strategy and margin optimization.
 * 
 * @param {string} productId - Product document ID to analyze
 * 
 * @returns {Promise<Object|null>} Product pricing analysis or null if no data:
 *   - currentPricing: Active pricing information across catalogues
 *   - pricingHistory: Historical price changes over time
 *   - catalogueDistribution: Which catalogues contain this product
 *   - pricingInsights: Recommendations and optimization opportunities
 * 
 * @throws {Error} When productId invalid or queries fail
 * 
 * @example
 * // Get complete pricing analysis for a product
 * const pricingAnalysis = await getProductPricingAnalysis('PROD123');
 * 
 * if (pricingAnalysis) {
 *   console.log(`Current price range: ₹${pricingAnalysis.currentPricing.priceRange.lowest} - ₹${pricingAnalysis.currentPricing.priceRange.highest}`);
 *   console.log(`Available in ${pricingAnalysis.catalogueDistribution.length} catalogues`);
 * }
 * 
 * @since 1.0.0
 */
export async function getProductPricingAnalysis(productId) {
    if (!productId || typeof productId !== 'string') {
        throw new Error('getProductPricingAnalysis requires a valid product ID string');
    }

    const db = firebase.firestore();
    
    try {
        console.log(`[API] Getting comprehensive pricing analysis for product ${productId}`);
        
        // Get ALL price history for this product (active and inactive)
        const allPriceHistoryQuery = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH)
            .doc(productId)
            .collection('priceHistory')
            .orderBy('createdDate', 'desc');
        
        const allPriceHistorySnapshot = await allPriceHistoryQuery.get();
        
        if (allPriceHistorySnapshot.empty) {
            console.log(`[API] No price history found for product ${productId}`);
            return null;
        }
        
        const allPriceRecords = allPriceHistorySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Separate active and inactive records
        const activePrices = allPriceRecords.filter(record => record.isActive);
        const historicalPrices = allPriceRecords.filter(record => !record.isActive);
        
        // Analyze current pricing (active records only)
        let currentPricing = null;
        if (activePrices.length > 0) {
            const prices = activePrices.map(r => r.unitSellingPrice);
            const catalogues = activePrices.map(r => ({
                catalogueId: r.salesCatalogueId,
                catalogueName: r.salesCatalogueName,
                price: r.unitSellingPrice
            }));
            
            currentPricing = {
                activeCatalogueCount: activePrices.length,
                currentHighestPrice: Math.max(...prices),
                currentLowestPrice: Math.min(...prices),
                currentAveragePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
                priceRange: {
                    lowest: Math.min(...prices),
                    highest: Math.max(...prices),
                    variation: Math.max(...prices) - Math.min(...prices),
                    variationPercentage: Math.min(...prices) > 0 
                        ? ((Math.max(...prices) - Math.min(...prices)) / Math.min(...prices)) * 100 
                        : 0
                },
                catalogueDistribution: catalogues
            };
        }
        
        // Analyze pricing history trends
        const pricingHistory = {
            totalHistoricalRecords: historicalPrices.length,
            priceChangesOverTime: allPriceRecords.map(record => ({
                date: record.createdDate,
                price: record.unitSellingPrice,
                catalogueName: record.salesCatalogueName,
                isActive: record.isActive
            })),
            highestHistoricalPrice: allPriceRecords.length > 0 
                ? Math.max(...allPriceRecords.map(r => r.unitSellingPrice)) 
                : 0,
            lowestHistoricalPrice: allPriceRecords.length > 0 
                ? Math.min(...allPriceRecords.map(r => r.unitSellingPrice)) 
                : 0
        };
        
        // Generate pricing insights and recommendations
        const pricingInsights = {
            isInMultipleCatalogues: activePrices.length > 1,
            hasPriceVariation: currentPricing && currentPricing.priceRange.variation > 0,
            priceConsistencyRating: currentPricing && currentPricing.priceRange.variationPercentage < 5 ? 'Excellent' :
                                   currentPricing && currentPricing.priceRange.variationPercentage < 15 ? 'Good' :
                                   currentPricing && currentPricing.priceRange.variationPercentage < 25 ? 'Fair' : 'Poor',
            recommendations: []
        };
        
        // Generate specific recommendations
        if (pricingInsights.isInMultipleCatalogues && pricingInsights.hasPriceVariation) {
            pricingInsights.recommendations.push({
                type: 'price-standardization',
                priority: 'Medium',
                message: `Product has different prices across ${activePrices.length} catalogues - consider standardizing`,
                action: 'Review pricing strategy across catalogues'
            });
        }
        
        const analysisResult = {
            productId,
            currentPricing,
            pricingHistory,
            catalogueDistribution: activePrices.map(record => ({
                catalogueId: record.salesCatalogueId,
                catalogueName: record.salesCatalogueName,
                price: record.unitSellingPrice,
                isActive: record.isActive
            })),
            pricingInsights,
            
            metadata: {
                analyzedAt: new Date().toISOString(),
                totalPriceRecords: allPriceRecords.length,
                activePriceRecords: activePrices.length,
                historicalPriceRecords: historicalPrices.length,
                firestoreReadsUsed: allPriceHistorySnapshot.size
            }
        };
        
        console.log(`[API] ✅ Product pricing analysis completed for ${productId} using ${allPriceHistorySnapshot.size} reads`);
        return analysisResult;
        
    } catch (error) {
        console.error(`[API] Error analyzing product pricing for ${productId}:`, error);
        throw new Error(`Product pricing analysis failed: ${error.message}`);
    }
}

/**
 * Gets pricing statistics and insights across all products with price history.
 * 
 * Provides business-level insights about pricing consistency, catalogue
 * distribution, and pricing optimization opportunities across the entire
 * product catalog. Perfect for executive reporting and pricing strategy.
 * 
 * @returns {Promise<Object>} Pricing statistics and business insights:
 *   - overallStatistics: High-level pricing metrics
 *   - catalogueAnalysis: Pricing distribution across catalogues  
 *   - pricingOpportunities: Products with pricing optimization potential
 *   - businessInsights: Strategic recommendations for pricing
 * 
 * @throws {Error} When database queries fail
 * 
 * @example
 * // Get overall pricing insights for business strategy
 * const pricingStats = await getPricingStatistics();
 * 
 * console.log(`${pricingStats.overallStatistics.productsInMultipleCatalogues} products need price review`);
 * console.log(`Average price variation: ${pricingStats.overallStatistics.averagePriceVariation}%`);
 * 
 * @since 1.0.0
 */
export async function getPricingStatistics() {
    const db = firebase.firestore();
    let totalReads = 0;
    
    try {
        console.log(`[API] Calculating comprehensive pricing statistics across all products`);
        
        // Get pricing data for all active products
        const activePrices = await getCurrentSellingPricesFromHistory(null, true);
        totalReads += activePrices.size; // Approximate read count
        
        // Initialize statistics collection
        const statistics = {
            totalProductsWithPricing: activePrices.size,
            totalProductsWithoutPricing: Math.max(0, (masterData.products?.length || 0) - activePrices.size),
            productsInMultipleCatalogues: 0,
            totalPriceVariation: 0,
            catalogueDistribution: new Map(), // catalogueId -> product count
            priceRanges: {
                under10: 0,
                between10And50: 0,
                between50And100: 0,
                over100: 0
            }
        };
        
        // Analyze each product's pricing
        activePrices.forEach((priceInfo, productId) => {
            // Count products in multiple catalogues
            if (priceInfo.catalogueCount > 1) {
                statistics.productsInMultipleCatalogues++;
                
                if (priceInfo.priceRange && priceInfo.priceRange.variation > 0) {
                    statistics.totalPriceVariation += priceInfo.priceRange.variation;
                }
            }
            
            // Count catalogue distribution
            priceInfo.catalogueSources.forEach(source => {
                const currentCount = statistics.catalogueDistribution.get(source.catalogueName) || 0;
                statistics.catalogueDistribution.set(source.catalogueName, currentCount + 1);
            });
            
            // Categorize by price ranges
            const price = priceInfo.sellingPrice;
            if (price < 10) {
                statistics.priceRanges.under10++;
            } else if (price < 50) {
                statistics.priceRanges.between10And50++;
            } else if (price < 100) {
                statistics.priceRanges.between50And100++;
            } else {
                statistics.priceRanges.over100++;
            }
        });
        
        // Calculate derived metrics
        const averagePriceVariation = statistics.productsInMultipleCatalogues > 0 
            ? statistics.totalPriceVariation / statistics.productsInMultipleCatalogues 
            : 0;
        
        // Convert catalogue distribution to array
        const catalogueAnalysis = [];
        statistics.catalogueDistribution.forEach((productCount, catalogueName) => {
            catalogueAnalysis.push({
                catalogueName,
                productCount,
                percentage: statistics.totalProductsWithPricing > 0 
                    ? (productCount / statistics.totalProductsWithPricing) * 100 
                    : 0
            });
        });
        
        // Sort by product count (highest first)
        catalogueAnalysis.sort((a, b) => b.productCount - a.productCount);
        
        // Generate business insights
        const businessInsights = [];
        
        if (statistics.productsInMultipleCatalogues > 5) {
            businessInsights.push({
                type: 'pricing-consistency',
                priority: 'Medium',
                message: `${statistics.productsInMultipleCatalogues} products have different prices across catalogues`,
                recommendation: 'Consider price standardization strategy',
                impact: 'Revenue optimization opportunity'
            });
        }
        
        if (averagePriceVariation > 10) {
            businessInsights.push({
                type: 'price-variation',
                priority: 'High',
                message: `Average price variation of ₹${averagePriceVariation.toFixed(2)} across catalogues`,
                recommendation: 'Review pricing strategy for consistency',
                impact: 'Customer confusion and lost sales potential'
            });
        }
        
        if (statistics.totalProductsWithoutPricing > 0) {
            businessInsights.push({
                type: 'missing-pricing',
                priority: 'High',
                message: `${statistics.totalProductsWithoutPricing} products have no active pricing`,
                recommendation: 'Add products to active sales catalogues',
                impact: 'Products cannot be sold without catalogue pricing'
            });
        }
        
        const finalResults = {
            overallStatistics: {
                totalProductsAnalyzed: masterData.products?.length || 0,
                productsWithActivePricing: statistics.totalProductsWithPricing,
                productsWithoutPricing: statistics.totalProductsWithoutPricing,
                pricingCoverage: masterData.products?.length > 0 
                    ? (statistics.totalProductsWithPricing / masterData.products.length) * 100 
                    : 0,
                productsInMultipleCatalogues: statistics.productsInMultipleCatalogues,
                averagePriceVariation: averagePriceVariation,
                totalActiveCatalogues: catalogueAnalysis.length
            },
            
            catalogueAnalysis: catalogueAnalysis,
            
            priceRangeDistribution: statistics.priceRanges,
            
            pricingOpportunities: Array.from(activePrices.entries())
                .filter(([productId, priceInfo]) => priceInfo.catalogueCount > 1 && priceInfo.priceRange?.variation > 5)
                .map(([productId, priceInfo]) => ({
                    productId,
                    productName: masterData.products.find(p => p.id === productId)?.itemName || 'Unknown Product',
                    catalogueCount: priceInfo.catalogueCount,
                    priceVariation: priceInfo.priceRange.variation,
                    currentPriceRange: `₹${priceInfo.priceRange.lowest} - ₹${priceInfo.priceRange.highest}`,
                    recommendedAction: priceInfo.priceRange.variation > 20 
                        ? 'High priority price review needed'
                        : 'Consider price standardization'
                }))
                .sort((a, b) => b.priceVariation - a.priceVariation) // Highest variation first
                .slice(0, 10), // Top 10 opportunities
            
            businessInsights,
            
            metadata: {
                generatedAt: new Date().toISOString(),
                approximateFirestoreReads: totalReads,
                dataFreshness: 'Real-time from price history records',
                analysisScope: 'All active products with pricing data'
            }
        };
        
        console.log(`[API] ✅ Pricing statistics completed using ~${totalReads} Firestore reads`);
        console.log(`[API] Key insights: ${statistics.totalProductsWithPricing} products priced, ${statistics.productsInMultipleCatalogues} in multiple catalogues`);
        
        return finalResults;
        
    } catch (error) {
        console.error(`[API] Error calculating pricing statistics:`, error);
        throw new Error(`Pricing statistics calculation failed: ${error.message}`);
    }
}

