// js/config.js

// Your real Firebase project configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBAt_2gMhSPPSBi0zApb7z05ODZjMceDOk",
  authDomain: "trinitycart-9e055.firebaseapp.com",
  projectId: "trinitycart-9e055",
  storageBucket: "trinitycart-9e055.appspot.com",
  messagingSenderId: "450216949740",
  appId: "1:450216949740:web:375d45d553bfd2a541f2c9",
  measurementId: "G-57JRDMJB14"
};

// The path to your users collection
export const USERS_COLLECTION_PATH = 'artifacts/TrinityCart-default-app-id/users';

// Navigation Configuration - THIS WAS MISSING
// This object drives the entire sidebar navigation.
export const navConfig = [
    {
        type: "link", // This is a clickable link
        label: "Dashboard",
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>`,
        viewId: "dashboard-view",
        roles: ["admin", "sales_staff", "inventory_manager", "finance", "team_lead"]
    },
    {
        type: "heading", // This is a non-clickable group title
        label: "Operations",
        roles: ["admin", "sales_staff", "team_lead", "inventory_manager"]
    },
    {
        type: "link",
        label: "Sales",
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
        viewId: "sales-view",
        roles: ["admin", "sales_staff", "team_lead"]
    },
    {
        type: "link",
        label: "Purchases",
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>`,
        viewId: "purchases-view",
        roles: ["admin", "inventory_manager"]
    },
    {
        type: "heading",
        label: "Management",
        roles: ["admin", "inventory_manager", "finance"]
    },
    {
        type: "link",
        label: "Products",
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>`,
        viewId: "products-view",
        roles: ["admin", "inventory_manager"]
    },
    {
        type: "link",
        label: "Suppliers",
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2h8a1 1 0 001-1z"></path></svg>`,
        viewId: "suppliers-view",
        roles: ["admin", "inventory_manager", "finance"]
    },
    {
        type: "heading",
        label: "Analysis & Admin",
        roles: ["admin", "finance", "team_lead"]
    },
    {
        type: "link",
        label: "Reports",
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>`,
        viewId: "reports-view",
        roles: ["admin", "finance", "team_lead"]
    },
    {
        type: "link",
        label: "User Management",
        icon: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>`,
        viewId: "users-view",
        roles: ["admin"]
    }
];
