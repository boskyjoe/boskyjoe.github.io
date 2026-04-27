import { COLLECTIONS } from "../config/collections.js";
import { setState, updateMasterData } from "./store.js";
import { showToast } from "../shared/toast.js";

const unsubscribeFns = [];
const MASTER_DATA_KEYS = ["categories", "seasons", "products", "suppliers", "paymentModes", "pricingPolicies", "reorderPolicies", "storeConfigs", "salesCatalogues", "teams"];
const loadedMasterDataKeys = new Set();
let isInitialized = false;

function listenToCollection(db, key, path, transform = docs => docs) {
    const unsubscribe = db.collection(path).onSnapshot(
        snapshot => {
            const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateMasterData(key, transform(rows));

            if (!loadedMasterDataKeys.has(key)) {
                loadedMasterDataKeys.add(key);

                if (loadedMasterDataKeys.size === MASTER_DATA_KEYS.length) {
                    setState({ isMasterDataReady: true });
                }
            }
        },
        error => {
            console.error(`[Moneta] Failed to load ${key}:`, error);
            showToast(`Could not load ${key}.`, "error");
        }
    );

    unsubscribeFns.push(unsubscribe);
}

export function initializeMasterData() {
    if (isInitialized) return;

    const db = firebase.firestore();
    loadedMasterDataKeys.clear();
    setState({ isMasterDataReady: false });

    listenToCollection(db, "categories", COLLECTIONS.categories);
    listenToCollection(db, "seasons", COLLECTIONS.seasons);
    listenToCollection(db, "products", COLLECTIONS.products, rows => rows.filter(row => row.isActive));
    listenToCollection(db, "suppliers", COLLECTIONS.suppliers);
    listenToCollection(db, "paymentModes", COLLECTIONS.paymentModes);
    listenToCollection(db, "pricingPolicies", COLLECTIONS.pricingPolicies);
    listenToCollection(db, "reorderPolicies", COLLECTIONS.reorderPolicies);
    listenToCollection(db, "storeConfigs", COLLECTIONS.storeConfigs);
    listenToCollection(db, "salesCatalogues", COLLECTIONS.salesCatalogues);
    listenToCollection(db, "teams", COLLECTIONS.teams);

    isInitialized = true;
}

export function detachMasterData() {
    while (unsubscribeFns.length > 0) {
        const unsubscribe = unsubscribeFns.pop();
        unsubscribe?.();
    }

    isInitialized = false;
    loadedMasterDataKeys.clear();
    setState({ isMasterDataReady: false });
}
