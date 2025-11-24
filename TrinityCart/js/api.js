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

import {
    SALES_CATALOGUES_COLLECTION_PATH,
    CHURCH_TEAMS_COLLECTION_PATH, USER_TEAM_MEMBERSHIPS_COLLECTION_PATH,
    CONSIGNMENT_ORDERS_COLLECTION_PATH,
    CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH, SALES_COLLECTION_PATH,
    SALES_PAYMENTS_LEDGER_COLLECTION_PATH, DONATIONS_COLLECTION_PATH,
    DONATION_SOURCES,
    getDonationSourceByStore, EXPENSES_COLLECTION_PATH, EXPENSE_RECEIPTS_STORAGE_PATH, imageKitConfig
} from './config.js';

import { masterData } from './masterData.js';
import { formatCurrency } from './utils.js';


/**
 * Creates a new user document in the 'users' collection.
 * This is called the first time a user logs in.
 * @param {object} user - The user object from Firebase Authentication.
 * @param {string} role - The initial role to assign (e.g., 'guest').
 */
export async function createUserRecord(user, role) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // Use the user's UID as the document ID, as per your data model.
    const userRef = db.collection(USERS_COLLECTION_PATH).doc(user.uid);

    console.log(`Creating new user record for ${user.email} with role: ${role}`);

    // Use set() to create the document with a specific ID and all required fields.
    return userRef.set({
        // --- Your specified fields ---
        UID: user.uid,
        displayName: user.displayName,
        email: user.email,
        role: role,
        isActive: true, // Default new users to active

        // --- Your specified audit fields ---
        // Since the user is creating their own record upon first login,
        // they are the 'createdBy' and 'updatedBy' user.
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });
}



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
        return suppliers;
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
    console.log("api.js:getPaymentModes");
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
    console.log("api.js:getSeasons");
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
    console.log("api.js:getSalesEvents");

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


/**
 * ✅ NEW: Deletes a team document. Used for cleanup after a failed ad-hoc request.
 * NOTE: This does not delete sub-collections. It's intended for empty, orphaned teams.
 * @param {string} teamId The ID of the team to delete.
 */
export async function deleteTeam(teamId) {
    if (!teamId) return;
    const db = firebase.firestore();
    console.log(`[API] Attempting to delete orphaned team: ${teamId}`);
    return db.collection(CHURCH_TEAMS_COLLECTION_PATH).doc(teamId).delete();
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

/**
 * ✅ ENHANCED: Adds a team member and now returns a reference to the new member document.
 * @param {string} teamId - The ID of the team to add the member to.
 * @param {string} teamName - The name of the team.
 * @param {object} memberData - The data for the new member.
 * @param {object} user - The user performing the action.
 * @returns {Promise<DocumentReference>} A promise that resolves with the reference to the newly created member document.
 */
export async function addTeamMember(teamId, teamName, memberData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const membershipDocId = memberData.email.toLowerCase();
    const membershipRef = db.collection(USER_TEAM_MEMBERSHIPS_COLLECTION_PATH).doc(membershipDocId);

    // ✅ 1. Get a reference to the new member document BEFORE the transaction.
    const newMemberRef = db.collection(CHURCH_TEAMS_COLLECTION_PATH).doc(teamId).collection('members').doc();

    // 2. Run the transaction and wait for it to complete.
    await db.runTransaction(async (transaction) => {
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

    // ✅ 3. Return the reference after the transaction is successful.
    return newMemberRef;
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
    console.log("api.js:getUsersWithRoles");
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
 * ENHANCED: Records supplier payment with optional verification workflow.
 * 
 * Records payments to suppliers for outstanding purchase invoices. Supports both
 * immediate processing (legacy) and verification workflow (new). When verification
 * is enabled, payment is created as "Pending Verification" and invoice is updated
 * only after admin verification.
 * 
 * @param {object} paymentData - Payment data with optional verification flag
 * @param {object} user - User submitting the payment
 * @param {boolean} [requireVerification=true] - Whether payment needs admin verification
 * @returns {Promise<void>}
 * @since 1.0.0 Enhanced with verification workflow support
 */

export async function recordPaymentAndUpdateInvoice(paymentData, user, requireVerification = true) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    const invoiceRef = db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(paymentData.relatedInvoiceId);
    const newPaymentRef = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH).doc();

    if (requireVerification) {
        // ✅ NEW: VERIFICATION WORKFLOW - Just create payment record
        console.log(`[API] Creating supplier payment for verification workflow`);

        const paymentId = `SPAY-SUP-${Date.now()}`;

        return newPaymentRef.set({
            paymentId: paymentId,
            relatedInvoiceId: paymentData.relatedInvoiceId,
            supplierId: paymentData.supplierId,

            // Financial details
            amountPaid: paymentData.amountPaid,
            paymentDate: paymentData.paymentDate,
            paymentMode: paymentData.paymentMode,
            transactionRef: paymentData.transactionRef,
            notes: paymentData.notes || '',

            // ✅ VERIFICATION STATUS
            paymentStatus: 'Pending Verification',
            submittedBy: user.email,
            submittedOn: now,
            requiresVerification: true,

            audit: {
                createdBy: user.email,
                createdOn: now,
                context: 'Supplier payment submitted for admin verification'
            }
        });

    } else {
        // ✅ LEGACY: IMMEDIATE PROCESSING (transactional)
        console.log(`[API] Processing supplier payment with immediate invoice update`);

        return db.runTransaction(async (transaction) => {
            // READ: Get the current state of the invoice
            const invoiceDoc = await transaction.get(invoiceRef);
            if (!invoiceDoc.exists) {
                throw new Error("Invoice document does not exist!");
            }

            const invoiceData = invoiceDoc.data();

            // ✅ ENHANCED: Same debugging as verification function
            console.log(`[API] 🔍 LEGACY payment processing debug:`);
            console.log(`  📋 Invoice Total: ${invoiceData.invoiceTotal}`);
            console.log(`  💳 Current Paid: ${invoiceData.amountPaid || 0}`);
            console.log(`  💸 Payment Amount: ${paymentData.amountPaid}`);

            // ✅ CORRECTED: Same calculation logic as verification
            const invoiceTotal = Number(invoiceData.invoiceTotal || 0);
            const currentAmountPaid = Number(invoiceData.amountPaid || 0);
            const paymentAmount = Number(paymentData.amountPaid || 0);

            const newTotalAmountPaid = currentAmountPaid + paymentAmount;
            const calculatedBalance = invoiceTotal - newTotalAmountPaid;
            const newBalanceDue = Math.max(0, Math.round(calculatedBalance * 100) / 100);

            // ✅ IDENTICAL: Same status logic as verification function
            let newPaymentStatus;

            if (newBalanceDue === 0) {
                newPaymentStatus = "Paid";
            } else if (newBalanceDue < 0) {
                newPaymentStatus = "Paid"; // Overpaid
            } else if (newTotalAmountPaid > 0) {
                newPaymentStatus = "Partially Paid";
            } else {
                newPaymentStatus = "Unpaid";
            }

            console.log(`[API] 🧮 LEGACY calculation results:`);
            console.log(`  💰 NEW Total Paid: ₹${newTotalAmountPaid.toFixed(2)}`);
            console.log(`  📊 NEW Balance Due: ₹${newBalanceDue.toFixed(2)}`);
            console.log(`  📈 NEW Status: ${invoiceData.paymentStatus} → ${newPaymentStatus}`);

            // WRITE 1: Update the invoice document
            transaction.update(invoiceRef, {
                amountPaid: newTotalAmountPaid,
                balanceDue: newBalanceDue,
                paymentStatus: newPaymentStatus, // ✅ CRITICAL: Should be "Paid" when balance is 0
                'audit.updatedBy': user.email,
                'audit.updatedOn': now,
            });

            // WRITE 2: Create the payment record
            transaction.set(newPaymentRef, {
                ...paymentData,
                paymentId: `SPAY-SUP-${Date.now()}`,
                paymentStatus: 'Verified',
                status: 'Verified',
                recordedBy: user.email,
                verifiedBy: user.email,
                verifiedOn: now,
                requiresVerification: false,
                audit: {
                    createdBy: user.email,
                    createdOn: now,
                    context: 'Supplier payment with immediate processing (legacy mode)'
                }
            });

            console.log(`[API] ✅ Legacy payment completed with status: ${newPaymentStatus}`);
        });
    }
}


/**
 * ENHANCED: Verifies pending supplier payment and updates invoice balance.
 * 
 * Takes a pending supplier payment and processes it using the existing transactional
 * logic from recordPaymentAndUpdateInvoice. This ensures consistent balance calculation
 * and payment status management.
 * 
 * @param {string} paymentId - ID of the payment to verify
 * @param {object} adminUser - Admin performing the verification
 */

export async function verifySupplierPayment(paymentId, adminUser) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentRef = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId);

    return db.runTransaction(async (transaction) => {
        // 1. READ the payment document
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists || paymentDoc.data().paymentStatus !== 'Pending Verification') {
            throw new Error("Payment not found or is not pending verification.");
        }

        const paymentData = paymentDoc.data();
        const invoiceRef = db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(paymentData.relatedInvoiceId);

        // 2. READ invoice for balance calculation
        const invoiceDoc = await transaction.get(invoiceRef);
        if (!invoiceDoc.exists) {
            throw new Error(`Related invoice does not exist.`);
        }

        const currentInvoiceData = invoiceDoc.data();

        // ✅ ENHANCED: Comprehensive debugging
        console.log(`[API] 🔍 DETAILED payment verification debugging:`);
        console.log(`  📋 Invoice ID: ${currentInvoiceData.invoiceId}`);
        console.log(`  💰 Invoice Total (raw): ${currentInvoiceData.invoiceTotal}`);
        console.log(`  💰 Invoice Total (number): ${Number(currentInvoiceData.invoiceTotal)}`);
        console.log(`  💳 Current Amount Paid (raw): ${currentInvoiceData.amountPaid}`);
        console.log(`  💳 Current Amount Paid (number): ${Number(currentInvoiceData.amountPaid || 0)}`);
        console.log(`  📊 Current Balance Due: ${currentInvoiceData.balanceDue}`);
        console.log(`  📈 Current Status: "${currentInvoiceData.paymentStatus}"`);
        console.log(`  💸 Payment Being Verified: ${paymentData.amountPaid}`);

        // ✅ CORRECTED: Safe number conversion and calculation
        const invoiceTotal = Number(currentInvoiceData.invoiceTotal || 0);
        const currentAmountPaid = Number(currentInvoiceData.amountPaid || 0);
        const paymentAmount = Number(paymentData.amountPaid || 0);

        // Validate numbers
        if (isNaN(invoiceTotal) || isNaN(currentAmountPaid) || isNaN(paymentAmount)) {
            console.error(`[API] ❌ Invalid numbers detected:`, {
                invoiceTotal: invoiceTotal,
                currentAmountPaid: currentAmountPaid,
                paymentAmount: paymentAmount
            });
            throw new Error("Invalid number values in invoice or payment data");
        }

        // ✅ CORRECTED: Precise calculation with proper rounding
        const newTotalAmountPaid = currentAmountPaid + paymentAmount;
        const calculatedBalance = invoiceTotal - newTotalAmountPaid;
        const newBalanceDue = Math.max(0, Math.round(calculatedBalance * 100) / 100); // Round to 2 decimal places

        // ✅ ENHANCED: Detailed status calculation with explicit logic
        let newPaymentStatus;

        console.log(`[API] 🧮 STATUS CALCULATION LOGIC:`);
        console.log(`  💰 Invoice Total: ${invoiceTotal}`);
        console.log(`  💰 New Total Paid: ${newTotalAmountPaid}`);
        console.log(`  📊 Calculated Balance: ${calculatedBalance}`);
        console.log(`  📊 Rounded Balance Due: ${newBalanceDue}`);
        console.log(`  🤔 Is Balance Zero? ${newBalanceDue === 0}`);
        console.log(`  🤔 Is Balance <= 0? ${newBalanceDue <= 0}`);
        console.log(`  🤔 Total Paid > 0? ${newTotalAmountPaid > 0}`);

        if (newBalanceDue === 0) {
            newPaymentStatus = 'Paid';
            console.log(`  ✅ STATUS: PAID (balance is exactly zero)`);
        } else if (newBalanceDue < 0) {
            newPaymentStatus = 'Paid'; // Overpaid
            console.log(`  ✅ STATUS: PAID (overpaid by ₹${Math.abs(newBalanceDue).toFixed(2)})`);
        } else if (newTotalAmountPaid > 0) {
            newPaymentStatus = 'Partially Paid';
            console.log(`  📊 STATUS: PARTIALLY PAID (₹${newBalanceDue.toFixed(2)} remaining)`);
        } else {
            newPaymentStatus = 'Unpaid';
            console.log(`  ❌ STATUS: UNPAID (no payments recorded)`);
        }

        // ✅ FINAL: Log the transition
        console.log(`[API] 📈 STATUS TRANSITION: "${currentInvoiceData.paymentStatus}" → "${newPaymentStatus}"`);

        // 3. WRITE: Update payment status to verified
        transaction.update(paymentRef, {
            paymentStatus: 'Verified',
            status: 'Verified', // For compatibility
            verifiedBy: adminUser.email,
            verifiedOn: now,
            verificationDetails: {
                submittedBy: paymentData.submittedBy,
                submittedOn: paymentData.submittedOn,
                invoiceTotal: invoiceTotal,
                previousBalance: currentInvoiceData.balanceDue || 0,
                newBalance: newBalanceDue,
                statusTransition: `${currentInvoiceData.paymentStatus} → ${newPaymentStatus}`,
                calculationDebug: {
                    invoiceTotal: invoiceTotal,
                    previousPaid: currentAmountPaid,
                    thisPayment: paymentAmount,
                    newTotalPaid: newTotalAmountPaid,
                    calculatedBalance: calculatedBalance,
                    finalBalance: newBalanceDue
                }
            }
        });

        // 4. ✅ CORRECTED: Update invoice with proper status
        transaction.update(invoiceRef, {
            amountPaid: newTotalAmountPaid,
            balanceDue: newBalanceDue,
            paymentStatus: newPaymentStatus, // ✅ CRITICAL: Should now correctly show "Paid"

            // ✅ AUDIT: Enhanced tracking
            lastPaymentVerification: {
                verifiedPaymentId: paymentId,
                verifiedAmount: paymentAmount,
                verifiedBy: adminUser.email,
                verifiedOn: now,
                previousStatus: currentInvoiceData.paymentStatus,
                newStatus: newPaymentStatus,
                balanceTransition: `₹${(currentInvoiceData.balanceDue || 0).toFixed(2)} → ₹${newBalanceDue.toFixed(2)}`
            },

            'audit.updatedBy': adminUser.email,
            'audit.updatedOn': now
        });

        console.log(`[API] ✅ VERIFICATION COMPLETED:`);
        console.log(`  💳 Payment: ${paymentData.paymentId || paymentId} → VERIFIED`);
        console.log(`  📋 Invoice: ${currentInvoiceData.invoiceId} → ${newPaymentStatus}`);
        console.log(`  💰 Balance: ₹${(currentInvoiceData.balanceDue || 0).toFixed(2)} → ₹${newBalanceDue.toFixed(2)}`);
        console.log(`  📊 Status: ${currentInvoiceData.paymentStatus} → ${newPaymentStatus}`);
    });
}

/**
 * Cancels an unverified supplier payment (deletes record since not yet processed).
 * @param {string} paymentId - ID of pending payment to cancel
 */
export async function cancelSupplierPaymentRecord(paymentId) {
    const db = firebase.firestore();
    const paymentRef = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId);

    // Verify payment is pending before cancelling
    const paymentDoc = await paymentRef.get();
    if (!paymentDoc.exists) {
        throw new Error("Payment record not found.");
    }

    if (paymentDoc.data().paymentStatus !== 'Pending Verification') {
        throw new Error("Only pending payments can be cancelled. Verified payments must be voided.");
    }

    // Safe to delete since it was never processed
    return paymentRef.delete();
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

/**
 * ENHANCED: Voids a supplier payment with proper audit trail and balance adjustment.
 * 
 * Creates reversing payment entry instead of deleting the original record, maintaining
 * complete audit trail for accounting compliance. Updates invoice balance and payment
 * status while preserving all historical payment information.
 * 
 * BUSINESS CONTEXT:
 * - Maintains complete audit trail for supplier payment corrections
 * - Follows professional accounting practices for payment reversals  
 * - Enables financial reconciliation with proper paper trail
 * - Supports error correction without data loss
 * 
 * @param {string} paymentId - The document ID of the supplier payment to void
 * @param {object} adminUser - The admin performing the void operation
 * @throws {Error} When payment not found, already voided, or transaction fails
 * @since 1.0.0 Enhanced with void system for audit compliance
 * @see deletePaymentAndUpdateInvoice() - Deprecated in favor of void system
 */
export async function voidSupplierPaymentAndUpdateInvoice(paymentId, adminUser) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentRef = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId);

    return db.runTransaction(async (transaction) => {
        // === PHASE 1: READ & VALIDATION ===
        console.log(`[API] Voiding supplier payment: ${paymentId}`);

        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists) {
            throw new Error("Payment record not found. It may have already been voided or deleted.");
        }

        const originalPaymentData = paymentDoc.data();

        // ✅ CORRECTED: Handle missing or undefined paymentStatus
        const currentStatus = originalPaymentData.paymentStatus || originalPaymentData.status || 'Verified';

        console.log(`[API] Original payment status: "${currentStatus}"`);

        // Validate payment can be voided
        if (currentStatus === 'Voided') {
            throw new Error("This payment has already been voided.");
        }

        // ✅ FLEXIBLE: Allow voiding of verified payments OR legacy payments without status
        if (currentStatus !== 'Verified' && currentStatus !== 'Recorded' && originalPaymentData.amountPaid > 0) {
            console.warn(`[API] Payment has status "${currentStatus}" but proceeding with void since it has valid amount`);
        } else if (!originalPaymentData.amountPaid || originalPaymentData.amountPaid <= 0) {
            throw new Error("Cannot void payment: Invalid or missing payment amount.");
        }

        const invoiceRef = db.collection(PURCHASE_INVOICES_COLLECTION_PATH).doc(originalPaymentData.relatedInvoiceId);
        const invoiceDoc = await transaction.get(invoiceRef);

        if (!invoiceDoc.exists) {
            throw new Error(`Related invoice ${originalPaymentData.relatedInvoiceId} does not exist.`);
        }

        const currentInvoiceData = invoiceDoc.data();

        // Get supplier information for logging
        const supplier = masterData.suppliers.find(s => s.id === originalPaymentData.supplierId);
        const supplierName = supplier ? supplier.supplierName : 'Unknown Supplier';

        console.log(`[API] Voiding payment to ${supplierName}:`, {
            originalAmount: `₹${originalPaymentData.amountPaid.toFixed(2)}`,
            originalStatus: currentStatus,
            invoiceId: currentInvoiceData.invoiceId,
            paymentDate: originalPaymentData.paymentDate.toDate?.() || originalPaymentData.paymentDate
        });

        // === PHASE 2: CALCULATE NEW BALANCES ===
        const voidedAmount = originalPaymentData.amountPaid;
        const currentInvoicePaidAmount = currentInvoiceData.amountPaid || 0;
        const newTotalAmountPaid = Math.max(0, currentInvoicePaidAmount - voidedAmount);
        const newBalanceDue = currentInvoiceData.invoiceTotal - newTotalAmountPaid;

        // ✅ ENHANCED: Recalculate payment status based on new balance
        let newPaymentStatus;
        if (newBalanceDue <= 0) {
            newPaymentStatus = 'Paid';
        } else if (newTotalAmountPaid > 0) {
            newPaymentStatus = 'Partially Paid';
        } else {
            newPaymentStatus = 'Unpaid';
        }

        console.log(`[API] Balance recalculation after void:`);
        console.log(`  - Previous paid: ₹${currentInvoicePaidAmount.toFixed(2)}`);
        console.log(`  - Voided amount: ₹${voidedAmount.toFixed(2)}`);
        console.log(`  - New paid total: ₹${newTotalAmountPaid.toFixed(2)}`);
        console.log(`  - New balance: ₹${newBalanceDue.toFixed(2)}`);
        console.log(`  - New status: ${currentInvoiceData.paymentStatus} → ${newPaymentStatus}`);

        // === PHASE 3: UPDATE ORIGINAL PAYMENT (VOID, DON'T DELETE) ===
        transaction.update(paymentRef, {
            // ✅ CORRECTED: Set status field consistently
            paymentStatus: 'Voided',
            status: 'Voided', // Also set legacy status field for compatibility

            voidedBy: adminUser.email,
            voidedOn: now,
            originalStatus: currentStatus, // ✅ CORRECTED: Use the status we determined
            voidReason: 'Administrative void - payment reversal',

            // ✅ ENHANCED: Preserve original data for audit
            originalPaymentData: {
                originalAmount: originalPaymentData.amountPaid,
                originalDate: originalPaymentData.paymentDate,
                originalMode: originalPaymentData.paymentMode,
                originalRef: originalPaymentData.transactionRef,
                originalStatus: currentStatus
            }
        });

        // === PHASE 4: CREATE REVERSING PAYMENT ENTRY ===
        const reversalPaymentRef = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH).doc();
        const reversalPaymentId = `VOID-${originalPaymentData.paymentId || paymentId}`;

        transaction.set(reversalPaymentRef, {
            // ✅ ENHANCED: Professional reversing entry
            paymentId: reversalPaymentId,
            relatedInvoiceId: originalPaymentData.relatedInvoiceId,
            supplierId: originalPaymentData.supplierId,

            // ✅ NEGATIVE AMOUNTS: Reversing entry
            amountPaid: -voidedAmount,

            paymentDate: now,
            paymentMode: 'VOID_REVERSAL',
            transactionRef: `Reversal of ${originalPaymentData.transactionRef || 'payment'}`,

            // ✅ ENHANCED: Clear reversal context
            notes: `Reversed payment for Invoice ${currentInvoiceData.invoiceId}. Original payment: ₹${voidedAmount.toFixed(2)} on ${originalPaymentData.paymentDate.toDate?.().toLocaleDateString() || 'unknown date'}`,

            // ✅ CONSISTENT: Set both status fields
            paymentStatus: 'Void_Reversal',
            status: 'Void_Reversal',

            originalPaymentId: paymentId,
            recordedBy: adminUser.email,
            voidedBy: adminUser.email,
            isReversalEntry: true,

            // ✅ AUDIT TRAIL
            audit: {
                createdBy: adminUser.email,
                createdOn: now,
                context: 'Supplier payment void reversal',
                originalPaymentReference: originalPaymentData.paymentId || paymentId,
                voidReason: 'Administrative correction'
            }
        });

        // === PHASE 5: UPDATE INVOICE WITH CORRECTED BALANCES ===
        transaction.update(invoiceRef, {
            amountPaid: newTotalAmountPaid,
            balanceDue: newBalanceDue,
            paymentStatus: newPaymentStatus,

            // ✅ ENHANCED: Track void activity
            lastPaymentVoided: {
                voidedAmount: voidedAmount,
                voidedPaymentId: paymentId,
                voidedBy: adminUser.email,
                voidedOn: now,
                previousStatus: currentInvoiceData.paymentStatus,
                reversalPaymentId: reversalPaymentRef.id
            },

            // Update audit trail
            'audit.updatedBy': adminUser.email,
            'audit.updatedOn': now
        });

        console.log(`[API] ✅ Supplier payment voided successfully:`);
        console.log(`  - Original payment: VOIDED (preserved for audit)`);
        console.log(`  - Reversal entry: ${reversalPaymentId} created`);
        console.log(`  - Invoice status: ${currentInvoiceData.paymentStatus} → ${newPaymentStatus}`);
        console.log(`  - Invoice balance: Updated to ₹${newBalanceDue.toFixed(2)}`);
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
 * ✅ NEW: Rejects a pending consignment order by updating its status.
 * @param {string} orderId - The Firestore document ID of the consignment order.
 * @param {string} reason - The reason for the rejection, provided by the admin.
 * @param {object} user - The admin or manager performing the action.
 * @returns {Promise<void>}
 */
export async function rejectConsignmentRequest(orderId, reason, user) {
    const db = firebase.firestore();
    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(orderId);
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // This is a simple update, not a transaction, as no other documents are involved.
    return orderRef.update({
        status: 'Rejected',
        'audit.updatedBy': user.email,
        'audit.updatedOn': now,
        'audit.rejectionReason': reason // Store the reason for the audit trail
    });
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
        hasPendingPayments: false,
        totalExpenses: 0,
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
            quantityDamaged: 0,
            quantityGifted: 0
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
 * ✅ NEW: Fetches all items from the sub-collection of a specific consignment order.
 * @param {string} orderId - The Firestore document ID of the parent order.
 * @returns {Promise<Array<object>>} An array of item objects.
 */
export async function getItemsForConsignmentOrder(orderId) {
    const db = firebase.firestore();
    const itemsRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(orderId).collection('items');
    const snapshot = await itemsRef.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            totalValueGifted: 0,
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
        } else if (activityType === 'Gift') {
            fieldToUpdate = 'quantityGifted';
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
        } else if (fieldToUpdate === 'quantityGifted') {
            // Treat 'Gift' financially the same as 'Damage' or 'Return'
            transaction.update(orderRef, {
                totalValueGifted: firebase.firestore.FieldValue.increment(activityValueDelta),
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
 * ENHANCED: Creates consignment payment record with automatic donation handling.
 * @param {object} paymentData - The payment data with donation information.
 * @param {object} user - The team lead submitting the record.
 */
export async function submitPaymentRecord(paymentData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const paymentId = `CPAY-${Date.now()}`;

    return db.runTransaction(async (transaction) => {
        // Create main payment record
        const paymentRef = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH).doc();

        transaction.set(paymentRef, {
            paymentId: paymentId,
            orderId: paymentData.orderId,
            teamLeadId: paymentData.teamLeadId,
            teamLeadName: paymentData.teamLeadName,
            teamName: paymentData.teamName,

            // ✅ ENHANCED: Include donation information
            amountPaid: paymentData.amountPaid, // Amount applied to balance
            donationAmount: paymentData.donationAmount || 0, // Extra amount as donation
            totalCollected: (paymentData.amountPaid || 0) + (paymentData.donationAmount || 0),

            paymentDate: paymentData.paymentDate,
            paymentMode: paymentData.paymentMode,
            transactionRef: paymentData.transactionRef,
            notes: paymentData.notes || '',
            paymentReason: paymentData.paymentReason,

            paymentStatus: 'Pending Verification',
            submittedBy: user.email,
            submittedOn: now,

            // ✅ DONATION CONTEXT
            donationSource: paymentData.donationSource
        });

        // ✅ ENHANCED: Create donation record if overpayment (same pattern as sales)
        if (paymentData.donationAmount && paymentData.donationAmount > 0) {
            const donationRef = db.collection(DONATIONS_COLLECTION_PATH).doc();
            const donationId = `DON-TEAM-${paymentId}-${Date.now().toString().slice(-4)}`;

            transaction.set(donationRef, {
                donationId: donationId,
                amount: paymentData.donationAmount,
                donationDate: now,
                source: DONATION_SOURCES.CONSIGNMENT_OVERPAYMENT,

                sourceDetails: {
                    transactionType: 'consignment_payment_overpayment',
                    teamName: paymentData.teamName,
                    orderId: paymentData.orderId,
                    requiredAmount: (paymentData.totalPhysicalPayment || 0) - (paymentData.donationAmount || 0),
                    tenderedAmount: paymentData.totalPhysicalPayment || paymentData.amountPaid + paymentData.donationAmount,
                    overpaymentAmount: paymentData.donationAmount,
                    paymentMode: paymentData.paymentMode,
                    transactionReference: paymentData.transactionRef
                },

                relatedPaymentId: paymentRef.id,
                relatedConsignmentOrderId: paymentData.orderId,

                teamName: paymentData.teamName,
                teamLeadName: paymentData.teamLeadName,
                teamLeadEmail: user.email,

                donorClassification: getDonorClassification(paymentData.donationAmount),
                isAnonymous: false,

                recordedBy: user.email,
                status: 'Pending Verification',

                audit: {
                    createdBy: user.email,
                    createdOn: now,
                    context: 'Consignment team payment overpayment',
                    donationSource: DONATION_SOURCES.CONSIGNMENT_OVERPAYMENT
                }
            });
        }

        // --- 3. ✅ NEW: Update the parent consignment order to set the flag ---
        const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(paymentData.orderId);

        console.log(`[API] Setting hasPendingPayments flag to true for order ${paymentData.orderId}`);

        transaction.update(orderRef, {
            hasPendingPayments: true
        });

    });
}

/**
 * [ENHANCED] Verifies consignment payment with donation source tracking capability.
 * @param {string} paymentId - The ID of the payment document in the ledger.
 * @param {object} adminUser - The admin verifying the payment.
 */

export async function verifyConsignmentPayment(paymentId, adminUser) {
    const db = firebase.firestore();

    const FieldValue = firebase.firestore.FieldValue;
    const now = FieldValue.serverTimestamp();


    const paymentRef = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId);

    // --- PHASE 1: READ ALL NECESSARY DATA (OUTSIDE THE TRANSACTION) ---
    console.log(`[API-Verify] Phase 1: Reading all related documents for payment ${paymentId}`);

    // 1. READ the payment document.
    const paymentDoc = await paymentRef.get();
    if (!paymentDoc.exists || paymentDoc.data().paymentStatus !== 'Pending Verification') {
        throw new Error("Payment not found or is not pending verification.");
    }
    const paymentData = paymentDoc.data();

    console.log("[API-Verify] Read payment document successfully.");

    // 2. Read the parent consignment order document to get its current financial state.
    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(paymentData.orderId);
    const orderDoc = await orderRef.get(orderRef);
    if (!orderDoc.exists) {
        throw new Error("The associated consignment order could not be found.");
    }
    const orderData = orderDoc.data();

    console.log("[API-Verify] Read parent order document successfully.");

    // 3. Query for any other pending payments for this order to manage the 'hasPendingPayments' flag.
    const pendingPaymentsQuery = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
        .where('orderId', '==', paymentData.orderId)
        .where('paymentStatus', '==', 'Pending Verification');
    const pendingSnapshot = await pendingPaymentsQuery.get(pendingPaymentsQuery);

    console.log(`[API-Verify] Found ${pendingSnapshot.size} pending payments for this order.`);


    // --- PHASE 2: RUN THE ATOMIC WRITE-ONLY TRANSACTION ---
    console.log("[API-Verify] Phase 2: Starting atomic write transaction...");

    return db.runTransaction(async (transaction) => {

        // --- CALCULATION PHASE (INSIDE TRANSACTION FOR SAFETY) ---

        console.log("[API-Verify] Calculating new financial state...");

        const currentPaid = orderData.totalAmountPaid || 0;
        const currentBalance = orderData.balanceDue || 0;
        const paymentAmount = paymentData.amountPaid || 0;

        const newTotalAmountPaid = currentPaid + paymentAmount;
        const newBalanceDue = currentBalance - paymentAmount;

        console.log(`[API-Verify] New Totals Calculated: Paid=${newTotalAmountPaid}, Balance=${newBalanceDue}`);


        // --- PHASE 3: WRITE ALL CHANGES ---


        console.log("[API-Verify] Preparing paymentStatus write operations...");
        // A. Update the payment document itself to "Verified".
        transaction.update(paymentRef, {
            paymentStatus: 'Verified',
            verifiedBy: adminUser.email,
            verifiedOn: now
        });

        console.log("[API-Verify]  paymentStatus write operations success");

        console.log("[API-Verify] Preparing update order balance ...");
        // B. Update the parent consignment order with the new, manually calculated totals.
        // We are NOT using FieldValue.increment() here.
        transaction.update(orderRef, {
            totalAmountPaid: newTotalAmountPaid,
            balanceDue: newBalanceDue
        });
        console.log("[API-Verify] order status updae successful");

        // C. Update the hasPendingPayments flag based on the query result.
        // Inside the transaction, the current payment still counts as "Pending".
        // So, if the size is exactly 1, it means we are verifying the LAST one.
        if (pendingSnapshot.size === 1) {
            console.log(`[API-Verify]  Last pending payment for order ${paymentData.orderId} verified. Clearing flag.`);
            // We can merge this update with the one above for efficiency.
            transaction.update(orderRef, { hasPendingPayments: false });
        } else {
            console.log(`[API-Verify]  Order ${paymentData.orderId} still has ${pendingSnapshot.size - 1} other pending payments. Flag remains true.`);
        }


        // ✅ FUTURE ENHANCEMENT: Add consignment donation handling if needed
        // If consignment payments can have overpayments, add donation logic here:

        // D. Handle donation creation if there was an overpayment.
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
        console.log("[API-Verify] All transaction writes queued successfully.");
    });
}


/**
 * [NEW] Deletes a pending payment record from the ledger.
 * @param {string} paymentId - The document ID of the payment to delete.
 */
export async function cancelPaymentRecord(paymentId) {
    const db = firebase.firestore();
    const paymentRef = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH).doc(paymentId);

    return db.runTransaction(async (transaction) => {
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists) throw new Error("Payment not found.");
        const paymentData = paymentDoc.data();

        // Delete the payment record
        transaction.delete(paymentRef);

        // Now, check if any OTHER pending payments exist for this order
        const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(paymentData.orderId);
        const pendingQuery = db.collection(CONSIGNMENT_PAYMENTS_LEDGER_COLLECTION_PATH)
            .where('orderId', '==', paymentData.orderId)
            .where('paymentStatus', '==', 'Pending Verification');
        const pendingSnapshot = await transaction.get(pendingQuery);

        // If the size is 1, it means we are cancelling the LAST pending payment
        if (pendingSnapshot.size === 1) {
            transaction.update(orderRef, { hasPendingPayments: false });
        }
    });
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
 * ✅ NEW (CLIENT-SIDE): Deletes a sale and reverses all associated transactions.
 * Runs as a single atomic transaction from the client.
 * Requires that the logged-in user has admin permissions set in Firestore Security Rules.
 * @param {string} saleId - The ID of the sales invoice to delete.
 */

/**
 * ✅ FINAL & CORRECTED (Client-Side without Rule Changes): Deletes a sale and reverses transactions.
 * This version reads the necessary documents BEFORE the transaction starts to avoid
 * client-side transaction query limitations.
 * @param {string} saleId - The ID of the sales invoice to delete.
 */
export async function deleteSaleAndReverseClientSide(saleId) {
    const db = firebase.firestore();
    const FieldValue = firebase.firestore.FieldValue;
    const saleRef = db.collection(SALES_COLLECTION_PATH).doc(saleId);

    console.log(`[API] Initiating client-side deletion for sale: ${saleId}`);

    // --- STEP 1: READ ALL NECESSARY DATA (OUTSIDE THE TRANSACTION) ---
    console.log('[API] Phase 1: Reading all related documents...');

    // Get the main sale document
    const saleDoc = await saleRef.get();
    if (!saleDoc.exists) {
        throw new Error("Sale document not found. It may have already been deleted.");
    }
    const saleData = saleDoc.data();

    // Get all associated payments
    const paymentsQuery = db.collection(SALES_PAYMENTS_LEDGER_COLLECTION_PATH).where('invoiceId', '==', saleId);
    const paymentsSnapshot = await paymentsQuery.get();

    // Get all associated donations
    const donationsQuery = db.collection(DONATIONS_COLLECTION_PATH).where('relatedSaleId', '==', saleId);
    const donationsSnapshot = await donationsQuery.get();

    console.log(`[API] Found ${paymentsSnapshot.size} payments and ${donationsSnapshot.size} donations to delete.`);

    const collectionsToDelete = ['expenses']; // Add 'payments', 'donations' if they are sub-collections
    for (const subCollection of collectionsToDelete) {
        const snapshot = await saleRef.collection(subCollection).get();
        if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log(`[API] Deleted ${snapshot.size} documents from sub-collection: ${subCollection}`);
        }
    }

    // --- STEP 2: PERFORM ALL WRITES IN A SINGLE ATOMIC TRANSACTION ---
    console.log('[API] Phase 2: Starting atomic write transaction...');
    return db.runTransaction(async (transaction) => {

        // A. Restock Inventory
        for (const item of saleData.lineItems) {
            const productRef = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).doc(item.productId);
            const quantityToRestock = Number(item.quantity);

            if (isNaN(quantityToRestock)) {
                throw new Error(`Invalid data in invoice: Product "${item.productName}" has a non-numeric quantity.`);
            }
            // NOTE: This is now a "blind" increment. It's safe inside a transaction.
            transaction.update(productRef, { inventoryCount: FieldValue.increment(quantityToRestock) });
        }

        // B. Delete Payments
        paymentsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));

        // C. Delete Donations
        donationsSnapshot.docs.forEach(doc => transaction.delete(doc.ref));

        // D. Delete the Sale itself
        transaction.delete(saleRef);
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


// =======================================================
// --- EXPENSE MANAGEMENT API FUNCTIONS ---
// =======================================================

/**
 * ENHANCED: Creates a new expense, uploading a receipt file to ImageKit if provided.
 * @param {object} expenseData - The data for the new expense, may include a 'receiptFile' property.
 * @param {object} user - The currently authenticated user object.
 * @returns {Promise<DocumentReference>}
 */

export async function addExpense(expenseData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const expenseId = `EXP-${Date.now()}`;

    let receiptUrl = null;
    let receiptFileId = null;

    if (expenseData.receiptFile) {
        const file = expenseData.receiptFile;

        // Initialize ImageKit SDK (no auth details needed here)
        const imagekit = new ImageKit({
            publicKey: imageKitConfig.publicKey,
            urlEndpoint: imageKitConfig.urlEndpoint,
        });

        console.log(`Uploading receipt to ImageKit...`);

        try {
            // ===================================================================
            // ✅ NEW APPROACH: Manually fetch the authentication token first
            // ===================================================================
            console.log("Step 1: Manually fetching security token...");
            //const authUrl = `https://moneta007.netlify.app/.netlify/functions/imagekit-auth?t=${Date.now()}`;

            const authUrl = `https://boskyjoe-github-io.vercel.app/api/imagekit-auth`;

            const authResponse = await fetch(authUrl);

            if (!authResponse.ok) {
                throw new Error(`Authentication server failed with status ${authResponse.status}`);
            }
            const authenticationParameters = await authResponse.json();
            console.log("Step 2: Security token received successfully:", authenticationParameters);

            // Validate that we received all the necessary parts
            if (!authenticationParameters.token || !authenticationParameters.expire || !authenticationParameters.signature) {
                throw new Error("Incomplete authentication token received from the server.");
            }

            // ===================================================================
            // ✅ STEP 3: Perform the upload, passing the raw token details
            // ===================================================================
            console.log("Step 3: Calling imagekit.upload with manual token...");
            const result = await imagekit.upload({
                file: file,
                fileName: file.name,
                folder: `MONETA/expense_receipts/${user.uid}/`,
                useUniqueFileName: true,
                // Pass the parameters directly instead of using the authenticator function
                token: authenticationParameters.token,
                expire: authenticationParameters.expire,
                signature: authenticationParameters.signature,
            });

            receiptUrl = result.url;
            receiptFileId = result.fileId;
            console.log('Step 4: Receipt uploaded successfully to ImageKit. URL:', receiptUrl);

        } catch (error) {
            console.error("ImageKit Upload Error:", error);
            throw new Error("Receipt upload failed. Please check the browser console for details.");
        }
    }

    const dataToSave = {
        // ... your data to save
        expenseId,
        seasonId: expenseData.seasonId,
        expenseType: expenseData.expenseType,
        expenseDate: expenseData.expenseDate,
        description: expenseData.description,
        amount: expenseData.amount,
        voucherNumber: expenseData.voucherNumber,
        status: 'Pending', // New expenses now start as 'Pending'
        activityLog: [],   // Initialize with an empty array
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now,
        receiptUrl,
        receiptFileId
    };

    return db.collection(EXPENSES_COLLECTION_PATH).add(dataToSave);
}




/**
 * Updates an existing expense document in Firestore.
 * @param {string} docId - The Firestore document ID of the expense to update.
 * @param {object} updatedData - An object containing the fields to update.
 * @param {object} user - The currently authenticated user object.
 * @returns {Promise<void>} A promise that resolves when the update is complete.
 */
export async function updateExpense(docId, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    // Use the new path constant
    return db.collection(EXPENSES_COLLECTION_PATH).doc(docId).update({
        ...updatedData,
        updatedBy: user.email,
        updatedOn: now,
    });
}

/**
 * ✅ ENHANCED: Deletes an expense document and its associated receipt file from ImageKit.
 * @param {string} docId - The Firestore document ID of the expense to delete.
 * @param {string|null} receiptFileId - The fileId of the receipt in ImageKit, if it exists.
 * @returns {Promise<void>}
 */

export async function deleteExpense(docId, receiptFileId) {
    const db = firebase.firestore();

    // --- Step 1: Delete the file from ImageKit first (if it exists) ---
    if (receiptFileId) {
        console.log(`Deleting receipt file from ImageKit: ${receiptFileId}`);
        try {
            // Call our new secure serverless function to perform the deletion
            const deleteUrl = `https://boskyjoe-github-io.vercel.app/api/imagekit-delete`;
            const response = await fetch(deleteUrl, {
                method: 'POST',
                body: JSON.stringify({ fileId: receiptFileId })
            });

            if (!response.ok) {
                // Log the error but don't stop the process. We still want to delete the Firestore doc.
                console.warn(`Failed to delete receipt from ImageKit. Status: ${response.status}. Proceeding with Firestore deletion.`);
            } else {
                console.log("Receipt successfully deleted from ImageKit.");
            }
        } catch (error) {
            console.error("Error calling the delete file function:", error);
        }
    }

    // --- Step 2: Delete the document from Firestore ---
    console.log(`Deleting expense document from Firestore: ${docId}`);
    return db.collection(EXPENSES_COLLECTION_PATH).doc(docId).delete();
}


/**
 * ✅ NEW & CORRECTED: Uploads a receipt for an existing expense and updates the document.
 * @param {string} docId - The Firestore document ID of the expense.
 * @param {File} file - The receipt file to upload.
 * @param {object} user - The currently authenticated user object.
 * @returns {Promise<void>}
 */
export async function uploadReceiptForExistingExpense(docId, file, user) {
    const db = firebase.firestore();

    // ✅ CORRECTED: Use a capital 'I' for the class name "ImageKit"
    const imagekit = new ImageKit({
        publicKey: imageKitConfig.publicKey,
        urlEndpoint: imageKitConfig.urlEndpoint,
    });

    // --- Step 1: Get an authentication token ---
    const authenticator = async () => {
        try {
            console.log("Authenticator called for existing expense. Fetching token...");
            const authUrl = `https://boskyjoe-github-io.vercel.app/api/imagekit-auth`;
            const response = await fetch(authUrl);

            if (!response.ok) {
                throw new Error(`Authentication server failed with status ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Error in ImageKit authenticator:", error);
            throw error;
        }
    };

    // --- Step 2: Upload the file using the authenticator ---
    console.log(`Uploading new receipt for existing expense: ${file.name}`);

    const result = await imagekit.upload({
        file: file,
        fileName: file.name,
        folder: `MONETA/expense_receipts/${user.uid}/`,
        useUniqueFileName: true,
        authenticator: authenticator
    });

    // --- Step 3: Update the existing Firestore document ---
    console.log(`Updating Firestore document ${docId} with new receipt URL.`);
    const expenseRef = db.collection(EXPENSES_COLLECTION_PATH).doc(docId);
    return expenseRef.update({
        receiptUrl: result.url,
        receiptFileId: result.fileId,
        updatedBy: user.email,
        updatedOn: firebase.firestore.FieldValue.serverTimestamp(),
        activityLog: firebase.firestore.FieldValue.arrayUnion({
            action: 'Receipt Uploaded',
            user: user.email,
            timestamp: new Date(),
            details: `Uploaded new receipt: ${file.name}`
        })
    });
}

/**
 * ✅ NEW: Approves or rejects an expense, updating its status and logging the activity.
 * @param {string} docId - The Firestore document ID of the expense.
 * @param {string} action - The action to perform ('Approved' or 'Rejected').
 * @param {string} justification - The reason for the action (especially for rejections).
 * @param {object} user - The currently authenticated user object.
 * @returns {Promise<void>}
 */
export async function processExpense(docId, action, justification, user) {
    const db = firebase.firestore();
    const expenseRef = db.collection(EXPENSES_COLLECTION_PATH).doc(docId);
    const now = new Date(); // Use a client-side timestamp for consistency in the log

    const logEntry = {
        action: action,
        user: user.email,
        timestamp: now,
        details: justification || `Expense ${action.toLowerCase()} by ${user.email}.`
    };

    // Use Firestore's arrayUnion to atomically add the new log entry
    return expenseRef.update({
        status: action, // Update the status to 'Approved' or 'Rejected'
        updatedBy: user.email,
        updatedOn: firebase.firestore.FieldValue.serverTimestamp(),
        activityLog: firebase.firestore.FieldValue.arrayUnion(logEntry)
    });
}

/**
 * ✅ NEW: Replaces an existing receipt file. Deletes the old file from ImageKit,
 * uploads the new one, and updates the Firestore document.
 * @param {string} docId - The Firestore document ID of the expense.
 * @param {object} expenseData - The full data object for the row, containing the old file ID.
 * @param {File} newFile - The new receipt file to upload.
 * @param {object} user - The currently authenticated user object.
 * @returns {Promise<void>}
 */

export async function replaceExpenseReceipt(docId, expenseData, newFile, user) {
    const oldFileId = expenseData.receiptFileId;

    // --- Step 1: Delete the OLD file from ImageKit first ---
    if (oldFileId) {
        console.log(`Replacing receipt. Requesting deletion of old file: ${oldFileId}`);
        try {
            const deleteUrl = `https://boskyjoe-github-io.vercel.app/api/imagekit-delete`;
            const response = await fetch(deleteUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: oldFileId })
            });
            if (!response.ok) {
                console.warn(`Deletion of old file may have failed (Status: ${response.status}). Proceeding anyway.`);
            } else {
                console.log("Old receipt successfully deleted from ImageKit.");
            }
        } catch (error) {
            console.error("Error calling the delete file function, but proceeding with upload:", error);
        }
    }

    // --- Step 2: Upload the NEW file (using the same pattern as addExpense) ---
    try {
        // Initialize the ImageKit SDK
        const imagekit = new ImageKit({
            publicKey: imageKitConfig.publicKey,
            urlEndpoint: imageKitConfig.urlEndpoint,
        });

        // Manually fetch the authentication token first
        console.log("Step A: Manually fetching security token for replacement...");
        const authUrl = `https://boskyjoe-github-io.vercel.app/api/imagekit-auth`;
        const authResponse = await fetch(authUrl);

        if (!authResponse.ok) {
            throw new Error(`Authentication server failed with status ${authResponse.status}`);
        }
        const authenticationParameters = await authResponse.json();
        console.log("Step B: Security token received successfully for replacement:", authenticationParameters);

        if (!authenticationParameters.token || !authenticationParameters.expire || !authenticationParameters.signature) {
            throw new Error("Incomplete authentication token received from the server.");
        }

        // Perform the upload, passing the raw token details directly
        console.log("Step C: Calling imagekit.upload with manual token for replacement...");
        const result = await imagekit.upload({
            file: newFile,
            fileName: newFile.name,
            folder: `MONETA/expense_receipts/${user.uid}/`,
            useUniqueFileName: true,
            token: authenticationParameters.token,
            expire: authenticationParameters.expire,
            signature: authenticationParameters.signature,
        });

        console.log('Step D: New receipt uploaded successfully. URL:', result.url);

        // --- Step 3: Update the Firestore document ---
        const db = firebase.firestore();
        const expenseRef = db.collection(EXPENSES_COLLECTION_PATH).doc(docId);
        return expenseRef.update({
            receiptUrl: result.url,
            receiptFileId: result.fileId,
            updatedBy: user.email,
            updatedOn: firebase.firestore.FieldValue.serverTimestamp(),
            activityLog: firebase.firestore.FieldValue.arrayUnion({
                action: 'Receipt Changed',
                user: user.email,
                timestamp: new Date(),
                details: `Replaced receipt. Old File ID: ${oldFileId || 'none'}. New File: ${newFile.name}`
            })
        });

    } catch (error) {
        console.error("ImageKit Upload Error during replacement:", error);
        throw new Error("Failed to replace receipt. The authentication token could not be retrieved or was invalid.");
    }
}

//Export utility 

/**
 * ✅ NEW: Fetches all sales catalogues and their complete item sub-collections.
 * Returns a structured array, perfect for creating a multi-sheet Excel report.
 * @returns {Promise<Array<object>>} An array of catalogue objects, each containing an 'items' array.
 */
export async function getAllCataloguesWithItems() {
    const db = firebase.firestore();
    console.log("[API] Fetching all catalogues and enriching items with master data...");

    const cataloguesSnapshot = await db.collection(SALES_CATALOGUES_COLLECTION_PATH).where('isActive', '==', true).get();

    const cataloguePromises = cataloguesSnapshot.docs.map(async (catalogueDoc) => {
        const catalogueData = catalogueDoc.data();
        const itemsSnapshot = await catalogueDoc.ref.collection('items').get();

        const enrichedItems = itemsSnapshot.docs.map(itemDoc => {
            const itemData = itemDoc.data();

            // 1. Find the corresponding master product from the cache
            const masterProduct = masterData.products.find(p => p.id === itemData.productId);

            // 2. Find the corresponding category from the cache
            const category = masterData.categories.find(c => c.id === masterProduct?.categoryId);

            // 3. Return a new object with the additional fields
            return {
                ...itemData, // Keep all original item data (productName, sellingPrice, etc.)
                categoryName: category ? category.categoryName : 'N/A', // Add the category name
                inventoryCount: masterProduct ? masterProduct.inventoryCount : 0 // Add the inventory count
            };
        });

        return {
            id: catalogueDoc.id,
            ...catalogueData,
            items: enrichedItems // Use the new array of enriched items
        };
    });

    const allCataloguesWithItems = await Promise.all(cataloguePromises);

    console.log(`[API] Fetched and enriched ${allCataloguesWithItems.reduce((sum, cat) => sum + cat.items.length, 0)} items.`);
    return allCataloguesWithItems;
}

/**
 * ✅ NEW & CORRECT: Processes a bulk payment by creating individual, verifiable
 * payment records for each invoice being paid. This maintains a clean audit trail.
 * @param {object} paymentDetails - The details of the single payment being made (total amount, mode, ref, etc.).
 * @param {Array<object>} invoicesToPay - An array of the invoice objects to apply the payment to.
 * @param {object} user - The user performing the action.
 */

export async function processBulkSupplierPayment(paymentDetails, invoicesToPay, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    let paymentAmountToAllocate = paymentDetails.amountPaid;

    // Sort invoices by date to pay off the oldest debts first
    const sortedInvoices = invoicesToPay.sort((a, b) => a.purchaseDate.toDate() - b.purchaseDate.toDate());

    console.log(`[API] Starting ATOMIC bulk payment. Total to allocate: ${formatCurrency(paymentAmountToAllocate)}`);

    // The entire operation is wrapped in a single transaction
    return db.runTransaction(async (transaction) => {
        for (const invoice of sortedInvoices) {
            if (paymentAmountToAllocate <= 0) break;

            const amountToApply = Math.min(invoice.balanceDue, paymentAmountToAllocate);
            if (amountToApply <= 0) continue;

            // This is the logic from your recordPaymentAndUpdateInvoice function,
            // but adapted for use inside a transaction.

            // 1. Get a reference for the new payment document
            const newPaymentRef = db.collection(SUPPLIER_PAYMENTS_LEDGER_COLLECTION_PATH).doc();
            const paymentId = `SPAY-SUP-${Date.now()}-${invoice.id.slice(0, 4)}`;

            // 2. Prepare the data for this individual payment record
            const singlePaymentData = {
                paymentId: paymentId,
                relatedInvoiceId: invoice.id,
                supplierId: invoice.supplierId,
                amountPaid: amountToApply,
                paymentDate: paymentDetails.paymentDate,
                paymentMode: paymentDetails.paymentMode,
                transactionRef: paymentDetails.transactionRef,
                notes: `Part of bulk payment ref: ${paymentDetails.transactionRef}. ${paymentDetails.notes || ''}`.trim(),
                paymentStatus: 'Pending Verification',
                submittedBy: user.email,
                submittedOn: now,
                requiresVerification: true,
                audit: {
                    createdBy: user.email,
                    createdOn: now,
                    context: 'Supplier payment submitted via bulk operation'
                }
            };

            // 3. Add the creation of this payment document to the transaction
            transaction.set(newPaymentRef, singlePaymentData);

            console.log(`[API-TX] Queued payment of ${formatCurrency(amountToApply)} for invoice ${invoice.invoiceId}`);

            // 4. Decrease the amount of payment left to allocate
            paymentAmountToAllocate -= amountToApply;
        }

        if (paymentAmountToAllocate > 0.01) {
            console.warn(`Bulk payment overpaid by ${formatCurrency(paymentAmountToAllocate)}. This amount has not been allocated.`);
        }
    });
}

/**
 * ✅ NEW: Atomically adds an expense to a consignment order.
 * Creates an expense record and updates the parent order's totals.
 * @param {string} orderId - The document ID of the consignment order.
 * @param {object} expenseData - An object with { amount, justification }.
 * @param {object} user - The user adding the expense.
 */
export async function addConsignmentExpense(orderId, expenseData, user) {
    const db = firebase.firestore();

    const FieldValue = firebase.firestore.FieldValue;
    const now = FieldValue.serverTimestamp();

    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(orderId);
    const expenseRef = orderRef.collection('expenses').doc();

    const expenseAmount = Number(expenseData.amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
        throw new Error("Expense amount must be a positive number.");
    }

    return db.runTransaction(async (transaction) => {
        // 1. Create the new expense document in the sub-collection
        transaction.set(expenseRef, {
            expenseId: `EXP-${Date.now()}`,
            // ✅ CHANGED: Use the date from the form, converted to a proper Date object
            expenseDate: new Date(expenseData.expenseDate),
            justification: expenseData.justification,
            amount: expenseAmount,
            hasPendingPayments: false,
            addedBy: user.email,
            addedOn: now // Keep track of when it was added
        });

        // 2. Update the parent consignment order document
        transaction.update(orderRef, {
            totalExpenses: FieldValue.increment(expenseAmount),
            balanceDue: FieldValue.increment(-expenseAmount)
        });
    });
}

/**
 * ✅ NEW: Atomically updates an existing consignment expense and the parent order's totals.
 * @param {string} orderId - The ID of the parent consignment order.
 * @param {string} expenseId - The ID of the expense document to update.
 * @param {number} amountDelta - The change in the expense amount (newValue - oldValue).
 * @param {object} updatedData - The new data for the expense document (e.g., { amount: 150, justification: 'New text' }).
 * @param {object} user - The user performing the update.
 */
export async function updateConsignmentExpense(orderId, expenseId, amountDelta, updatedData, user) {
    const db = firebase.firestore();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const FieldValue = firebase.firestore.FieldValue;

    const orderRef = db.collection(CONSIGNMENT_ORDERS_COLLECTION_PATH).doc(orderId);
    const expenseRef = orderRef.collection('expenses').doc(expenseId);

    return db.runTransaction(async (transaction) => {
        // 1. Update the specific expense document in the sub-collection
        transaction.update(expenseRef, {
            ...updatedData,
            'audit.updatedBy': user.email,
            'audit.updatedOn': now
        });

        // 2. If the amount changed, update the parent order's totals
        if (amountDelta !== 0) {
            transaction.update(orderRef, {
                totalExpenses: FieldValue.increment(amountDelta),
                balanceDue: FieldValue.increment(-amountDelta) // Note the negative sign
            });
        }
    });
}

/**
 * ✅ NEW & CORRECT: Atomically adds an expense to a direct sale invoice.
 * Creates an expense record and updates the parent invoice's totals, including balanceDue.
 * @param {string} invoiceId - The document ID of the sales invoice.
 * @param {object} expenseData - An object with { amount, justification, expenseDate }.
 * @param {object} user - The user adding the expense.
 */
export async function addDirectSaleExpense(invoiceId, expenseData, user) {
    const db = firebase.firestore();
    const FieldValue = firebase.firestore.FieldValue;
    const now = FieldValue.serverTimestamp();

    const invoiceRef = db.collection(SALES_COLLECTION_PATH).doc(invoiceId);
    const expenseRef = invoiceRef.collection('expenses').doc();

    const expenseAmount = Number(expenseData.amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
        throw new Error("Expense amount must be a positive number.");
    }

    return db.runTransaction(async (transaction) => {
        // 1. Create the new expense document in the sub-collection
        transaction.set(expenseRef, {
            expenseId: `DSEXP-${Date.now()}`,
            expenseDate: new Date(expenseData.expenseDate),
            justification: expenseData.justification,
            amount: expenseAmount,
            addedBy: user.email,
            addedOn: now
        });

        // 2. Update the parent sales invoice document
        transaction.update(invoiceRef, {
            // Increment the total expenses within the financials map
            'financials.totalExpenses': FieldValue.increment(expenseAmount),
            // DECREMENT the top-level balanceDue by the same amount
            balanceDue: FieldValue.increment(-expenseAmount)
        });
    });
}

