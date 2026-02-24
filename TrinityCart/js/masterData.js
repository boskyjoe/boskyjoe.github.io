// js/masterData.js

import { CATEGORIES_COLLECTION_PATH, SEASONS_COLLECTION_PATH,
    PRODUCTS_CATALOGUE_COLLECTION_PATH, SUPPLIERS_COLLECTION_PATH,
    PAYMENT_MODES_COLLECTION_PATH,
SALES_CATALOGUES_COLLECTION_PATH,CHURCH_TEAMS_COLLECTION_PATH,EVENTS_COLLECTION_PATH,SYSTEM_SETUPS_COLLECTION_PATH,DRAFT_SALES_COLLECTION_PATH
,LEADS_COLLECTION_PATH , SIMPLE_CONSIGNMENT_COLLECTION_PATH } from './config.js';

// This object will be our local, always-up-to-date cache of master data.
export const masterData = {
    categories: [],
    seasons: [],
    products: [],
    suppliers: [],
    paymentModes: [],
    salesCatalogues: [],
    teams: [],
    salesEvents: [],
    systemSetups: {},
    isDataReady: false,
    draftSales: [],
    leads: [] ,
    simpleConsignments: []
};


/**
 * Sets up real-time listeners for all master data collections.
 * This should be called once when the application starts.
 */


// Add at the top with other variables
let isInitialized = false;
const unsubscribeFunctions = [];

/**
 * Sets up real-time listeners for all master data collections.
 * It tracks the initial load of essential data and dispatches a 'masterDataReady'
 * event once core collections are populated, preventing race conditions in the UI.
 */
export function initializeMasterDataListeners() {
    if (isInitialized) {
        console.warn("Master data listeners are already initialized.");
        return;
    }
    
    console.log("Initializing master data listeners...");
    const db = firebase.firestore();

    // Flags to track the first data snapshot from each essential collection.
    let seasonsLoaded = false;
    let categoriesLoaded = false;
    let productsLoaded = false;
    let suppliersLoaded = false;
    let paymentModesLoaded = false;
    let teamsLoaded = false;

    /**
     * Checks if all essential data has been loaded. If so, it sets the global
     * `isDataReady` flag and dispatches a one-time event to the application.
     */
    const checkDataReady = () => {
        // This function will only execute its logic once.
        if (masterData.isDataReady) return;

        // Check if all required collections have received their first snapshot.
        if (seasonsLoaded && categoriesLoaded && productsLoaded && suppliersLoaded && paymentModesLoaded && teamsLoaded) {
            console.log("✅✅✅ All essential master data is now ready!");
            masterData.isDataReady = true;
            // Dispatch the special 'masterDataReady' event that other modules can listen for.
            document.dispatchEvent(new CustomEvent('masterDataReady'));
        }
    };

    // --- Real-time Listeners ---

    const categoriesUnsub = db.collection(CATEGORIES_COLLECTION_PATH).onSnapshot(snapshot => {
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.categories = categories.filter(c => c.isActive);
        console.log("Master data updated: Categories", masterData.categories.length);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'categories' } }));
        
        if (!categoriesLoaded) {
            categoriesLoaded = true;
            checkDataReady();
        }
    }, error => console.error("Error listening to categories:", error));
    unsubscribeFunctions.push(categoriesUnsub);

    const seasonsUnsub = db.collection(SEASONS_COLLECTION_PATH).onSnapshot(snapshot => {
        const seasons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.seasons = seasons.filter(s => s.isActive);
        console.log("Master data updated: Seasons", masterData.seasons.length);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'seasons' } }));

        if (!seasonsLoaded) {
            seasonsLoaded = true;
            checkDataReady();
        }
    }, error => console.error("Error listening to seasons:", error));
    unsubscribeFunctions.push(seasonsUnsub);

    const productsUnsub = db.collection(PRODUCTS_CATALOGUE_COLLECTION_PATH).onSnapshot(snapshot => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.products = products.filter(p => p.isActive);
        console.log("Master data updated: Products", masterData.products.length);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'products' } }));

        if (!productsLoaded) {
            productsLoaded = true;
            checkDataReady();
        }
    }, error => console.error("Error listening to products:", error));
    unsubscribeFunctions.push(productsUnsub);

    const suppliersUnsub = db.collection(SUPPLIERS_COLLECTION_PATH).onSnapshot(snapshot => {
        const suppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.suppliers = suppliers.filter(s => s.isActive);
        console.log("Master data updated: Suppliers", masterData.suppliers.length);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'suppliers' } }));

        if (!suppliersLoaded) {
            suppliersLoaded = true;
            checkDataReady();
        }
    }, error => console.error("Error listening to suppliers:", error));
    unsubscribeFunctions.push(suppliersUnsub);

    const paymentModesUnsub = db.collection(PAYMENT_MODES_COLLECTION_PATH).onSnapshot(snapshot => {
        const paymentModes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        masterData.paymentModes = paymentModes.filter(p => p.isActive);
        console.log("Master data updated: Payment Modes", masterData.paymentModes.length);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'paymentModes' } }));

        if (!paymentModesLoaded) {
            paymentModesLoaded = true;
            checkDataReady();
        }
    }, error => console.error("Error listening to paymentModes:", error));
    unsubscribeFunctions.push(paymentModesUnsub);

    const teamsUnsub = db.collection(CHURCH_TEAMS_COLLECTION_PATH).onSnapshot(snapshot => {
        masterData.teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Master data updated: Teams", masterData.teams.length);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'teams' } }));

        if (!teamsLoaded) {
            teamsLoaded = true;
            checkDataReady();
        }
    }, error => console.error("Error listening to churchTeams:", error));
    unsubscribeFunctions.push(teamsUnsub);

    // --- Non-essential listeners (don't need to be part of the 'ready' check) ---

    const salesCataloguesUnsub = db.collection(SALES_CATALOGUES_COLLECTION_PATH).onSnapshot(snapshot => {
        masterData.salesCatalogues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(sc => sc.isActive);
        console.log("Master data updated: Sales Catalogues", masterData.salesCatalogues.length);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'salesCatalogues' } }));
    }, error => console.error("Error listening to salesCatalogues:", error));
    unsubscribeFunctions.push(salesCataloguesUnsub);

    const salesEventsUnsub = db.collection(EVENTS_COLLECTION_PATH).onSnapshot(snapshot => {
        masterData.salesEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Master data updated: Sales Events", masterData.salesEvents.length);
        document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'salesEvents' } }));
    }, error => console.error("Error listening to salesEvents:", error));
    unsubscribeFunctions.push(salesEventsUnsub);

    const systemSetupsUnsub = db.collection(SYSTEM_SETUPS_COLLECTION_PATH).doc('mainConfig').onSnapshot(doc => {
        if (doc.exists) {
            masterData.systemSetups = doc.data();
            console.log("Master data updated: System Setups", masterData.systemSetups);
            document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'systemSetups' } }));
        } else {
            console.warn("System Setups document ('mainConfig') not found in Firestore!");
            masterData.systemSetups = {};
        }
    }, error => console.error("Error listening to systemSetups document:", error));
    unsubscribeFunctions.push(systemSetupsUnsub);


    const draftSalesUnsub = db.collection(DRAFT_SALES_COLLECTION_PATH)
        .where('status', '==', 'Pending') // Only listen for pending drafts
        .onSnapshot(snapshot => {
            masterData.draftSales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Master data updated: Pending Draft Sales", masterData.draftSales.length);
            // Dispatch an event so the UI can update the dropdown if needed
            document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'draftSales' } }));
        }, error => console.error("Error listening to draftSales:", error));
    unsubscribeFunctions.push(draftSalesUnsub);

    const leadsUnsub = db.collection(LEADS_COLLECTION_PATH)
        .orderBy('createdDate', 'desc') // Show newest leads first
        .onSnapshot(snapshot => {
            masterData.leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Master data updated: Leads", masterData.leads.length);
            document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'leads' } }));
            // Note: We don't add this to the `checkDataReady` function as it's not essential for initial app load.
        }, error => console.error("Error listening to leads:", error));
    unsubscribeFunctions.push(leadsUnsub);

    // --- ADD THIS NEW LISTENER FOR SIMPLE CONSIGNMENTS ---
    const simpleConsignmentsUnsub = db.collection(SIMPLE_CONSIGNMENT_COLLECTION_PATH)
        .onSnapshot(snapshot => {
            masterData.simpleConsignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Master data updated: Simple Consignments", masterData.simpleConsignments.length);
            document.dispatchEvent(new CustomEvent('masterDataUpdated', { detail: { type: 'simpleConsignments' } }));
        }, error => console.error("Error listening to simple consignments:", error));
    unsubscribeFunctions.push(simpleConsignmentsUnsub);
    // --- END OF NEW LISTENER ---

    isInitialized = true;
}

/**
 * Detaches all active Firestore listeners to prevent memory leaks on logout.
 */
export function detachMasterDataListeners() {
    console.log(`Detaching ${unsubscribeFunctions.length} master data listeners.`);
    unsubscribeFunctions.forEach(unsub => unsub());
    unsubscribeFunctions.length = 0; // Clear the array
    isInitialized = false;
    masterData.isDataReady = false; // Reset the ready flag for the next login
}

