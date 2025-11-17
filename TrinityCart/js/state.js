// In js/state.js

export const appState = {
    currentUser: null,
    activeView: 'dashboard-view',   
    selectedPurchaseInvoiceId: null, 
    selectedSaleId: null, // Assuming you have this for the direct sale expense modal
    isLocalUpdateInProgress: null,
    draftCatalogueItems: [],
    selectedConsignmentId: null,
    
    // ✅ NEW: Add the new state property, initialized to null.
    activeConsignmentModalData: null, 
    
    ChurchName: 'St. Sebastians Shurch (Indiranagar & Halasuru)',
};
