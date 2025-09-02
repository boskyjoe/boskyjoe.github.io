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

// Add these new functions to js/api.js

export async function getVendors() {
    try {
        const response = await fetch(`${API_URL}?action=getVendors`);
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch vendors:", error);
        return [];
    }
}

async function postData(action, data, userEmail) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            // mode: 'no-cors', // <-- REMOVE THIS LINE
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, data, userEmail }),
        });
        // Now that we can read the response, let's return it!
        return await response.json(); 
    } catch (error) {
        console.error(`Action ${action} failed:`, error);
        return { success: false, error: error.message };
    }
}

export async function addVendor(vendorData, userEmail) {
    return postData('addVendor', vendorData, userEmail);
}

export async function updateVendor(vendorData, userEmail) {
    return postData('updateVendor', vendorData, userEmail);
}

export async function setVendorStatus(vendorId, isActive, userEmail) {
    return postData('setVendorStatus', { vendorId, isActive }, userEmail);
}
