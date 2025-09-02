import { API_URL } from './config.js';

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
