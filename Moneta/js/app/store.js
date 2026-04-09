const state = {
    currentUser: null,
    currentRoute: "#/home",
    isMasterDataReady: false,
    masterData: {
        categories: [],
        seasons: [],
        products: [],
        suppliers: [],
        paymentModes: [],
        salesCatalogues: [],
        teams: []
    }
};

const listeners = new Set();

export function getState() {
    return {
        ...state,
        masterData: {
            ...state.masterData
        }
    };
}

export function setState(partial) {
    Object.assign(state, partial);
    listeners.forEach(listener => listener(getState()));
}

export function updateMasterData(key, value) {
    state.masterData[key] = value;
    listeners.forEach(listener => listener(getState()));
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
