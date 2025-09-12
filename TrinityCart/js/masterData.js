// js/masterData.js

import { CATEGORIES_COLLECTION_PATH, SEASONS_COLLECTION_PATH } from './config.js';

// This object will be our local, always-up-to-date cache of master data.
export const masterData = {
    categories: [],
    seasons: [],
    // We will add paymentModes, etc., here later
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

    // Add more listeners here for payment modes, banks, etc.
}
