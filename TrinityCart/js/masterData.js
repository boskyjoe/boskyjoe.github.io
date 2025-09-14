// js/masterData.js

import { CATEGORIES_COLLECTION_PATH, SEASONS_COLLECTION_PATH,PRODUCTS_CATALOGUE_COLLECTION_PATH, SUPPLIERS_COLLECTION_PATH,PAYMENT_MODES_COLLECTION_PATH } from './config.js';

// This object will be our local, always-up-to-date cache of master data.
export const masterData = {
    categories: [],
    seasons: [],
    products: [],
    suppliers: [],
    paymentModes: [],
};

/**
 * Sets up real-time listeners for all master data collections.
 * This should be called once when the application starts.
 */
export function initializeMasterDataListeners() {
    const db = firebase.firestore();

    // Listener for Product Categories
    db.collection(CATEGORIES_COLLECTION_PATH).onSnapshot(snapshot => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.categories = categories.filter(c => c.isActive); // Store only active ones
        console.log("Master data updated: Categories", masterData.categories);
        
        // Dispatch a custom event to notify the app that data has changed
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'categories' } }));
    }, error => {
        console.error("Error listening to categories collection:", error);
    });

    // Listener for Sales Seasons
    db.collection(SEASONS_COLLECTION_PATH).onSnapshot(snapshot => {
        const seasons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.seasons = seasons.filter(s => s.isActive); // Store only active ones
        console.log("Master data updated: Seasons", masterData.seasons);
        
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'seasons' } }));
    }, error => {
        console.error("Error listening to seasons collection:", error);
    });


    // Listener for Products
    db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).onSnapshot(snapshot => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.products = products.filter(p => p.isActive);
        console.log("Master data updated: Products", masterData.products);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'products' } }));
    });

    // Listener for Suppliers
    db.collection(SUPPLIERS_COLLECTION_PATH).onSnapshot(snapshot => {
        const suppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.suppliers = suppliers.filter(s => s.isActive);
        console.log("Master data updated: Suppliers", masterData.suppliers);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'suppliers' } }));
    });

    //Listener for Payment Modes ---
    db.collection(PAYMENT_MODES_COLLECTION_PATH).onSnapshot(snapshot => {
        const paymentModes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.paymentModes = paymentModes.filter(p => p.isActive); // Store only active ones
        console.log("Master data updated: Payment Modes", masterData.paymentModes);
        
        // Dispatch a custom event to notify the app that data has changed
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'paymentModes' } }));
    }, error => {
        console.error("Error listening to paymentModes collection:", error);
    });





    // Add more listeners here for payment modes, banks, etc.
}
