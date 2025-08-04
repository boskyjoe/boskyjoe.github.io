// Firebase imports for ES Modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInWithCustomToken, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where, orderBy, getDocs, onSnapshot, serverTimestamp, writeBatch } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Firebase configuration: Using the exact configuration provided by the user
const firebaseConfig = {
    apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
    authDomain: "shuttersync-96971.firebaseapp.com",
    projectId: "shuttersync-96971",
    storageBucket: "shuttersync-96971.firebasestorage.app",
    appId: "1:10782416018:web:361db5572882a62f291a4b",
    measurementId: "G-T0W9CES4D3"
};

// The appId from firebaseConfig is sufficient as collections are top-level, not nested under artifacts/appId/
const appId = firebaseConfig.appId;

// Environment variable for initial auth token (if available)
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase App and Services (initialized in setupAuth)
// --- ACTUAL FIREBASE INITIALIZATION ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// --- END ACTUAL FIREBASE INITIALIZATION ---


// Global Firestore unsubscribe functions
let unsubscribeCustomers = null;
let unsubscribeLeads = null;
let unsubscribeOpportunities = null;
let unsubscribeQuotes = null;
let unsubscribeQuoteLines = null; // For quote lines

let userId = null; // Will be set after authentication
let currentUserRole = 'guest'; // Renamed to avoid confusion with DOM element 'userRole'
let currentOpportunityId = null; // To track the opportunity being edited
let currentQuoteId = null; // To store the ID of the quote being edited
let currentQuoteLineId = null; // To store the ID of the quote line being edited

// Global cache for price books to enable filtering without re-fetching
let allPriceBooks = [];

// Global state for opportunity quote counts
let opportunityQuoteCounts = new Map(); // Map<opportunityId, count>

// Global state for quotes filter
let currentQuotesFilterOpportunityId = null;
let currentQuotesFilterOpportunityName = '';

// Declare DOM elements globally, but assign them inside initializePage
// This ensures they are found after the DOM is fully loaded.
let authSection;
let dashboardSection;
let customersSection;
let leadsSection;
let opportunitiesSection;
let quotesSection;
let countriesSection;
let currenciesSection;
let priceBooksSection;

let navDashboard;
let navCustomers;
let navLeads;
let navOpportunities;
let navQuotes;
let navCountries;
let navCurrencies;
let navPriceBooks;
let logoutBtn; // Use logoutBtn consistently, matching HTML ID 'nav-logout'
let adminMenuItem;

let googleSignInBtn;
let authStatus;
let userDisplayName;
let userIdDisplay;
let userRole; // This will hold the DOM element for the user's role display
let authErrorMessage; // Global variable for the error message element

let dashboardTotalCustomers;
let dashboardTotalOpportunities;
let dashboardOpenOpportunities;
let dashboardWonOpportunities;

let addCustomerBtn;
let customerFormContainer;
let customerForm;

let cancelCustomerBtn;
let customersGridContainer;
let customerContactMethodSelect;
let noCustomersMessage;
let customerTypeSelect;
let customerCountrySelect;
let customerSearchInput;
let customersGrid; // Grid.js instance
let customerIndustrySelect;
let customerSourceSelect;
let customerActiveCheckbox;
let customerFormMessage;
let additionalDetails;

let addLeadBtn;
let leadFormContainer;
let leadForm;
let cancelLeadBtn;
let leadsGridContainer;
let noLeadsMessage;
let leadSearchInput;
let leadsGrid; // Grid.js instance
let leadServicesInterestedSelect; // For Leads: multi-select
let leadSourceSelect;
let leadFormMessage;



let addOpportunityBtn;
let opportunityFormContainer;
let opportunityForm;
let cancelOpportunityBtn;
let opportunitiesGridContainer;
let noOpportunitiesMessage;
let opportunitySearchInput;
let opportunitiesGrid; // Grid.js instance
let opportunityCustomerSelect;
let opportunityCurrencySelect;
let opportunityPriceBookSelect;
let opportunityServicesInterestedSelect; // For Opportunities: multi-select
let opportunityValueInput; // Opportunity form calculation fields
let opportunityDiscountInput;
let adjustmentAmtInput;
let opportunityNetSpan; // Renamed to match HTML ID and usage
let opportunityFormMessage;

// Opportunity form specific elements
let opportunitySalesStageSelect;

let opportunityWorkLogsSection; // Already declared in your list
let opportunityWorkLogsContainer; // Already declared in your list
let opportunityWorkLogFormContainer;
let opportunityWorkLogForm;

let mainOpportunityDetailsContent; // NEW: For the collapsible content of the main accordion

let opportunityWorkLogsContent; // NEW: For the collapsible content of work logs accordion



let addWorkLogBtn;
let workLogsSectionContainer;
let addWorkLogEntryBtn;
let workLogFormContainer;
let workLogForm;
let cancelWorkLogBtn;
let workLogsList;
let noWorkLogsMessage;
let workLogFormMessage;
let workLogTypeSelect; // Added for easy access

let mainOpportunityDetailsAccordion;
let opportunityAccordionsGrid;


// Quote Accordion Elements (CRITICAL: Ensure these exist and are assigned in initializePage)
let mainQuoteDetailsAccordion; // Main Quote Details accordion header
let mainQuoteDetailsContent; // Main Quote Details accordion content
let quoteAccordionsGrid; // Parent grid for quote accordions

let addQuoteBtn;
let quoteFormContainer;
let quoteForm;
let cancelQuoteBtn;
let noQuotesMessage;
let quoteSearchInput;
let quotesGrid; // Grid.js instance
let quoteOpportunitySelect; // Opportunity dropdown for quotes
let quotesGridContainer;
let quotesFilterDisplay;
let quotesFilterOpportunityName;
let clearQuotesFilterBtn;
let quoteAmountInput;

// ADD THESE NEW VARIABLES:
let quoteDiscountInput;
let quoteAdjustmentInput;
let quoteNetAmountInput;

// Quote Customer Contact Fields (Corrected to match usage)
let quoteCustomerContactNameInput;
let quoteCustomerPhoneInput;
let quoteCustomerEmailInput;
let quoteCustomerAddressInput;

let quoteStatusSelect; // Status dropdown for quotes
let quoteFormMessage;

// Quote Line related DOM elements
let quoteLinesSectionContainer, addQuoteLineEntryBtn, quoteLineFormContainer, quoteLineForm, cancelQuoteLineBtn;
let quoteLinesList, noQuoteLinesMessage, quoteLinesContent;
let quoteLineServicesInput, quoteLineDescriptionInput, quoteLineStartDateInput, quoteLineEndDateInput;
let quoteLineUnitPriceInput, quoteLineQuantityInput, quoteLineDiscountInput, quoteLineAdjustmentAmountInput, quoteLineFinalNetSpan;
let quoteLineFormMessage;
let currentFilterOpportunityId;

let quoteLinesGrid; // CRITICAL: Declare quoteLinesGrid globally here
let quoteLinesGridContainer; // Also declare its container


let addCountryBtn;
let countryFormContainer;
let countryForm;
let cancelCountryBtn;
let countriesGridContainer;
let noCountriesMessage;
let countrySearchInput;
let countriesGrid;
let countryFormMessage;

let addCurrencyBtn;
let currencyFormContainer;
let currencyForm;
let cancelCurrencyBtn;
let currenciesGridContainer;
let noCurrenciesMessage;
let currencySearchInput;
let currenciesGrid;
let currencyCountrySelect;
let currencyFormMessage;


let addPriceBookBtn;
let priceBookFormContainer;
let priceBookForm;
let cancelPriceBookBtn;
let priceBooksGridContainer;
let noPriceBooksMessage;
let priceBookSearchInput;
let priceBooksGrid;
let priceBookCurrencySelect;
let priceBookActiveCheckbox;
let priceBookFormMessage;

let messageBox;
let messageContent;
let messageConfirmBtn;
let messageCancelBtn;

// --- Firestore Utility Functions ---

/**
 * Gets a Firestore collection reference for a top-level collection,
 * using the collection name directly as defined in Firestore security rules.
 * The Canvas environment implicitly handles the 'artifacts/{appId}/users/{userId}/' or 'artifacts/{appId}/public/data/' prefixing.
 * @param {string} collectionName The name of the top-level collection (e.g., 'customers', 'countries').
 * @returns {import('firebase/firestore').CollectionReference} A Firestore CollectionReference.
 */
function getCollectionRef(collectionName) {
    // Use the collection name directly. Canvas handles the environment-specific pathing.
    return collection(db, collectionName);
}

/**
 * Gets a Firestore document reference for a top-level document,
 * using the collection name and document ID directly as defined in Firestore security rules.
 * The Canvas environment implicitly handles the 'artifacts/{appId}/users/{userId}/' or 'artifacts/{appId}/public/data/' prefixing.
 * @param {string} collectionName The name of the top-level collection.
 * @param {string} docId The ID of the document.
 * @returns {import('firebase/firestore').DocumentReference} A Firestore DocumentReference.
 */
function getDocRef(collectionName, docId) {
    // Use the collection name and doc ID directly. Canvas handles the environment-specific pathing.
    return doc(db, collectionName, docId);
}

// --- End Firestore Utility Functions ---


/**
 * Displays a message in the global modal message box and returns a Promise.
 * For 'confirm' type, the Promise resolves to true (Confirm) or false (Cancel).
 * For 'alert' type, the Promise resolves to void when closed.
 * @param {string} message The message text to display.
 * @param {string} type The type of message box ('alert' or 'confirm').
 * @param {boolean} isError True if the message is an error, for styling. (Optional, default false)
 * @returns {Promise<boolean | void>} A Promise that resolves based on user interaction.
 */
function showMessageBox(message, type = 'alert', isError = false) { // Removed callback parameter
    return new Promise((resolve) => {
        // Ensure all global message box elements are assigned
        if (!messageBox || !messageContent || !messageConfirmBtn || !messageCancelBtn) {
            console.error("MessageBox DOM elements not found. Cannot display message.");
            // Resolve the promise immediately if elements are missing to prevent hanging
            resolve(false); // For confirm, assume false; for alert, just resolve.
            return;
        }

        messageContent.textContent = message;
        messageBox.classList.remove('hidden');
        messageContent.classList.toggle('text-red-600', isError);
        messageContent.classList.toggle('text-gray-800', !isError);

        // Clear previous event listeners to prevent multiple executions
        messageConfirmBtn.onclick = null;
        messageCancelBtn.onclick = null;
        messageBox.onclick = null; // For alert type
        messageContent.onclick = null; // For alert type

        if (type === 'confirm') {
            messageConfirmBtn.classList.remove('hidden');
            messageCancelBtn.classList.remove('hidden');

            messageConfirmBtn.onclick = () => {
                messageBox.classList.add('hidden');
                resolve(true); // Resolve with true for Confirm
            };
            messageCancelBtn.onclick = () => {
                messageBox.classList.add('hidden');
                resolve(false); // Resolve with false for Cancel
            };
        } else { // 'alert' type
            messageConfirmBtn.classList.add('hidden');
            messageCancelBtn.classList.add('hidden');

            // For simple alerts, allow clicking anywhere on the overlay to close
            messageBox.onclick = () => {
                messageBox.classList.add('hidden');
                resolve(); // Resolve with void for Alert
            };
            messageContent.onclick = (e) => e.stopPropagation(); // Prevent clicks on content from closing
        }
    });
}



/**
 * Shows a specific section of the application and hides all others.
 * Includes null checks for robustness against early calls or missing elements.
 * @param {string} sectionId The ID of the section to show (e.g., 'dashboard-section').
 */
function showSection(sectionId) {
    // Get all section elements by their IDs.
    // We get them dynamically here to ensure they are available when this function is called,
    // even if global variables haven't been fully assigned yet during initial load.
    const sections = {
        'dashboard-section': document.getElementById('dashboard-section'),
        'customers-section': document.getElementById('customers-section'),
        'leads-section': document.getElementById('leads-section'),
        'opportunities-section': document.getElementById('opportunities-section'),
        'quotes-section': document.getElementById('quotes-section'),
        'countries-section': document.getElementById('countries-section'),
        'currencies-section': document.getElementById('currencies-section'),
        'price-books-section': document.getElementById('price-books-section'),
        'auth-section': document.getElementById('auth-section') // Include auth section for completeness
    };

    // Hide all sections first
    for (const id in sections) {
        if (sections[id]) { // Check if the element exists
            sections[id].classList.add('hidden');
        }
    }

    // Show the requested section
    const targetSection = sections[sectionId];
    if (targetSection) { // Check if the target section element exists
        targetSection.classList.remove('hidden');
    } else {
        console.warn(`Attempted to show section with ID '${sectionId}', but the element was not found.`);
    }

    // Update active navigation link styling
    document.querySelectorAll('nav .nav-link, nav a[id^="nav-"]').forEach(link => {
        link.classList.remove('bg-blue-700', 'text-white'); // Remove active style
        link.classList.add('text-blue-200'); // Add inactive style
    });

    const activeNavLink = document.getElementById(`nav-${sectionId.replace('-section', '')}`);
    if (activeNavLink) {
        activeNavLink.classList.add('bg-blue-700', 'text-white'); // Add active style
        activeNavLink.classList.remove('text-blue-200'); // Remove inactive style
    }
}

/**
 * Shows a form container and optionally clears a form-specific message box.
 * @param {HTMLElement} formContainer The container element of the form to show.
 * @param {HTMLElement | null} formMessageElement Optional: The form-specific message paragraph element to clear.
 */
function showForm(formContainer, formMessageElement = null) {
    if (formContainer) {
        formContainer.classList.remove('hidden');
    } else {
        console.warn("showForm: formContainer is null or undefined.");
    }
    if (formMessageElement) {
        formMessageElement.textContent = ''; // Directly clear the form's message text
        formMessageElement.classList.add('hidden'); // Hide the message element
    }
}

/**
 * Hides a form container and optionally clears a form-specific message box.
 * @param {HTMLElement} formContainer The container element of the form to hide.
 * @param {HTMLElement | null} formMessageElement Optional: The form-specific message paragraph element to clear.
 */
function hideForm(formContainer, formMessageElement = null) {
    if (formContainer) {
        formContainer.classList.add('hidden');
    } else {
        console.warn("hideForm: formContainer is null or undefined.");
    }
    if (formMessageElement) {
        formMessageElement.textContent = ''; // Directly clear the form's message text
        formMessageElement.classList.add('hidden'); // Hide the message element
    }
}



/**
 * Sets up the authentication state listener and handles UI updates.
 */
async function setupAuth() {
    // Initialize Firebase if not already initialized
    if (!app) {
        if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.apiKey) {
            console.error("Firebase config is empty or invalid. Cannot initialize Firebase.");
            if (authErrorMessage) {
                authErrorMessage.textContent = "Firebase is not configured. Please check your firebaseConfig.";
                authErrorMessage.classList.remove('hidden');
            }
            return;
        }
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            console.log("Firebase initialized.");
        } catch (error) {
            console.error("Error initializing Firebase:", error);
            if (authErrorMessage) {
                authErrorMessage.textContent = `Error initializing Firebase: ${error.message}`;
                authErrorMessage.classList.remove('hidden');
            }
            return;
        }
    }

    // Start listening for quote counts immediately after Firebase is initialized
    // This will populate opportunityQuoteCounts in real-time
    onSnapshot(collection(db, 'quotes'), snapshot => {
        const counts = new Map();
        snapshot.forEach(doc => {
            const opportunityId = doc.data().opportunityId;
            if (opportunityId) {
                counts.set(opportunityId, (counts.get(opportunityId) || 0) + 1);
            }
        });
        opportunityQuoteCounts = counts;
        console.log("Updated opportunityQuoteCounts:", opportunityQuoteCounts);
        // If opportunities grid is visible, force a re-render to update quote counts
        // This will trigger loadOpportunities which will then use the updated counts
        if (opportunitiesGrid && opportunitiesSection && !opportunitiesSection.classList.contains('hidden')) {
            loadOpportunities();
        }
    }, error => {
        console.error("Error listening to quotes for counts:", error);
    });


    // Check for existing auth state first
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            if (userDisplayName) userDisplayName.textContent = user.displayName || 'Guest';
            if (userIdDisplay) userIdDisplay.textContent = `(ID: ${userId.substring(0, 8)}...)`; // Display first 8 chars of UID
            if (navLogout) navLogout.classList.remove('hidden');
            if (authSection) authSection.classList.add('hidden');

            // Determine user role (e.g., based on a 'users_data' collection or claims)
            // Fetch user role from 'users_data' collection
            try {
                // User data is stored in a top-level collection, as per rules
                const userDocRef = doc(db, 'users_data', userId);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    userRole = userDocSnap.data().role || 'Standard';
                } else {
                    // If user data doesn't exist, create it (for new Google sign-ins)
                    // Default to 'Standard' role for new users
                    userRole = 'Standard';
                    await setDoc(userDocRef, {
                        displayName: user.displayName || 'New User',
                        email: user.email || '',
                        role: userRole,
                        createdAt: serverTimestamp(),
                        lastLogin: serverTimestamp()
                    }, { merge: true }); // Use merge to avoid overwriting existing fields if any
                    console.log(`New user data created for ${user.email} with role ${userRole}`);
                }
            } catch (error) {
                console.error("Error fetching/setting user role:", error);
                userRole = 'guest'; // Fallback to guest if there's an error
            }

            if (userRoleDisplay) userRoleDisplay.textContent = `(${userRole})`;

            if (adminMenuItem) {
                if (userRole === 'Admin') { // Check for 'Admin' role as per rules
                    adminMenuItem.classList.remove('hidden');
                } else {
                    adminMenuItem.classList.add('hidden');
                }
            }

            console.log(`User ${user.uid} (${userRole}) is signed in.`);
            showSection(dashboardSection); // Show dashboard after successful login
            await updateDashboard();
        } else {
            // No user is signed in. Attempt custom token login (for Canvas) or show Google Sign-In.
            userId = null;
            userRole = 'guest';
            if (userDisplayName) userDisplayName.textContent = 'Guest';
            if (userIdDisplay) userId.textContent = '';
            if (userRoleDisplay) userRoleDisplay.textContent = '';
            if (navLogout) navLogout.classList.add('hidden');
            if (adminMenuItem) adminMenuItem.classList.add('hidden');

            if (initialAuthToken) {
                try {
                    await signInWithCustomToken(auth, initialAuthToken);
                    console.log("Attempted sign-in with custom token.");
                    // onAuthStateChanged will be triggered again if successful
                } catch (error) {
                    console.error("Error signing in with custom token:", error);
                    if (authErrorMessage) {
                        authErrorMessage.textContent = `Authentication failed: ${error.message}. Please sign in with Google.`;
                        authErrorMessage.classList.remove('hidden');
                    }
                    showSection(authSection); // Show auth section if custom token fails
                }
            } else {
                // No custom token, show Google Sign-In
                console.log("No custom token, prompting Google Sign-In.");
                showSection(authSection);
            }
        }
    });
}

/**
 * Handles Google Sign-In.
 */
async function handleGoogleSignIn() {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error during Google Sign-In:", error);
        if (authErrorMessage) {
            authErrorMessage.textContent = `Google Sign-In failed: ${error.message}`;
            authErrorMessage.classList.remove('hidden');
        }
    }
}

/**
 * Handles user logout.
 */
async function handleLogout() {
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
        showMessageBox("You have been signed out.", false);
    } catch (error) {
        console.error("Error during logout:", error);
        showMessageBox(`Error signing out: ${error.message}`, false);
    }
}

/**
 * Loads and displays the dashboard data, including counts for customers and opportunities.
 * This function respects user roles (standard users see their own data, admins see all data).
 */
async function loadDashboardData() {
    console.log("Loading dashboard data...");

    // Ensure user is authenticated and userId is available before proceeding.
    // userId is set by onAuthStateChanged.
    if (!auth.currentUser?.uid) {
        console.warn("User ID not available yet for dashboard data loading. Skipping dashboard data load.");
        // Potentially clear dashboard display or show a message indicating data is not available
        if (dashboardTotalCustomers) dashboardTotalCustomers.textContent = 'N/A';
        if (dashboardTotalOpportunities) dashboardTotalOpportunities.textContent = 'N/A';
        if (dashboardOpenOpportunities) dashboardOpenOpportunities.textContent = 'N/A';
        if (dashboardWonOpportunities) dashboardWonOpportunities.textContent = 'N/A';
        return;
    }

    try {
        // Fetch Total Customers
        const customersSnapshot = await getDocs(getCollectionRef('customers'));
        if (dashboardTotalCustomers) {
            dashboardTotalCustomers.textContent = customersSnapshot.size;
        }

        // Fetch Total Opportunities
        const opportunitiesSnapshot = await getDocs(getCollectionRef('opportunities'));
        if (dashboardTotalOpportunities) {
            dashboardTotalOpportunities.textContent = opportunitiesSnapshot.size;
        }

        // Fetch Open Opportunities (Sales Stage 'Prospect', 'Qualification', 'Proposal', 'Negotiation')
        // Firestore does not support 'not in' for field filters. Query for each "open" stage.
        let openOpportunitiesCount = 0;
        const openStages = ['Prospect', 'Qualification', 'Proposal', 'Negotiation'];

        for (const stage of openStages) {
            const stageQuery = query(
                getCollectionRef('opportunities'),
                where('salesStage', '==', stage)
            );
            const stageSnapshot = await getDocs(stageQuery);
            openOpportunitiesCount += stageSnapshot.size;
        }

        if (dashboardOpenOpportunities) {
            dashboardOpenOpportunities.textContent = openOpportunitiesCount;
        }

        // Fetch Won Opportunities (Sales Stage 'Won')
        const wonOpportunitiesQuery = query(
            getCollectionRef('opportunities'),
            where('salesStage', '==', 'Won')
        );
        const wonOpportunitiesSnapshot = await getDocs(wonOpportunitiesQuery);
        if (dashboardWonOpportunities) {
            dashboardWonOpportunities.textContent = wonOpportunitiesSnapshot.size;
        }

        console.log("Dashboard data loaded successfully.");

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        showMessageBox("Error loading dashboard data. Please check console for details.");
    }
}


/**
 * Calculates and updates the Quote Net Amount based on Quote Amount, Discount, and Adjustment.
 * This function only updates the UI and does not write to the database.
 */
function calculateQuoteNetAmount() {
    console.log("calculateQuoteNetAmount triggered.");
    const quoteAmountInput = document.getElementById('quote-amount');
    const quoteDiscountInput = document.getElementById('quote-discount');
    const quoteAdjustmentInput = document.getElementById('quote-adjustment');
    const quoteNetAmountInput = document.getElementById('quote-net-amount');
    
    const quoteAmount = parseFloat(quoteAmountInput.value) || 0;
    const quoteDiscount = parseFloat(quoteDiscountInput.value) || 0;
    const quoteAdjustment = parseFloat(quoteAdjustmentInput.value) || 0;

    const discountAmount = (quoteDiscount / 100) * quoteAmount;
    const netAmount = quoteAmount - discountAmount - quoteAdjustment;

    if (quoteNetAmountInput) {
        quoteNetAmountInput.value = netAmount.toFixed(2);
    }
}


/**
 * Asynchronously fetches all quote lines for a given quote ID from Firestore,
 * calculates the total quote amount, and then performs a full update on the
 * parent quote document to satisfy strict security rules.
 * @param {string} quoteId The ID of the parent quote.
 */
async function updateAllQuoteTotalsAndUI(quoteId) {
    if (!quoteId) {
        console.error("updateAllQuoteTotalsAndUI: No quoteId provided.");
        return;
    }

    try {
        // Step 1: Fetch the existing quote document to get all its data
        const quoteRef = doc(db, 'quotes', quoteId);
        const quoteDoc = await getDoc(quoteRef);
        if (!quoteDoc.exists()) {
            console.error("updateAllQuoteTotalsAndUI: Parent quote document does not exist.");
            return;
        }

        let existingQuoteData = quoteDoc.data();

        // Step 2: Fetch all quote lines to calculate the new total amount
        const quoteLinesCollection = collection(db, 'quotes', quoteId, 'quoteLines');
        const q = query(quoteLinesCollection);
        const querySnapshot = await getDocs(q);

        let totalQuoteAmount = 0;
        querySnapshot.forEach(doc => {
            const quoteLine = doc.data();
            totalQuoteAmount += parseFloat(quoteLine.finalNet) || 0;
        });

        // Step 3: Get all relevant DOM elements to perform the UI update
        const quoteAmountInput = document.getElementById('quote-amount');
        const quoteDiscountInput = document.getElementById('quote-discount');
        const quoteAdjustmentInput = document.getElementById('quote-adjustment');
        const quoteNetAmountInput = document.getElementById('quote-net-amount');

        // Step 4: Update the Quote Amount field in the UI
        if (quoteAmountInput) {
            quoteAmountInput.value = totalQuoteAmount.toFixed(2);
        }

        // Step 5: Enable/Disable discount and adjustment fields based on the new amount
        const amountIsPositive = totalQuoteAmount > 0;
        if (quoteDiscountInput) {
            if (amountIsPositive) quoteDiscountInput.removeAttribute('disabled');
            else {
                quoteDiscountInput.setAttribute('disabled', 'true');
                quoteDiscountInput.value = '0';
            }
        }
        if (quoteAdjustmentInput) {
            if (amountIsPositive) quoteAdjustmentInput.removeAttribute('disabled');
            else {
                quoteAdjustmentInput.setAttribute('disabled', 'true');
                quoteAdjustmentInput.value = '0';
            }
        }
        
        // Step 6: Calculate the Quote Net Amount
        const quoteDiscount = parseFloat(quoteDiscountInput.value) || 0;
        const quoteAdjustment = parseFloat(quoteAdjustmentInput.value) || 0;
        const discountAmount = (quoteDiscount / 100) * totalQuoteAmount;
        const netAmount = totalQuoteAmount - discountAmount - quoteAdjustment;

        if (quoteNetAmountInput) {
            quoteNetAmountInput.value = netAmount.toFixed(2);
        }

        // Step 7: Prepare the full data object for the Firestore update
        const updatedData = {
            ...existingQuoteData, // Preserve all existing fields
            quoteAmount: totalQuoteAmount,
            quoteDiscount: quoteDiscount,
            quoteAdjustment: quoteAdjustment,
            quoteNetAmount: netAmount,
            updatedAt: new Date() // Use client-side timestamp as per your rule
        };
        
        // Step 8: Perform the full update with the merged data
        await updateDoc(quoteRef, updatedData);

        console.log(`updateAllQuoteTotalsAndUI: All totals updated in UI and Firestore.`);

    } catch (error) {
        console.error("Error updating all quote totals and UI:", error);
    }
}




/**
 * Enables or disables the discount and adjustment fields based on the quote amount.
 */
function toggleDiscountAdjustmentFields() {
    if (!quoteAmountInput || !quoteDiscountInput || !quoteAdjustmentInput) {
        console.error("toggleDiscountAdjustmentFields: Required input elements are not defined.");
        return;
    }

    const amount = parseFloat(quoteAmountInput.value) || 0;

    if (amount > 0) {
        // If amount is greater than 0, enable the fields
        quoteDiscountInput.removeAttribute('disabled');
        quoteAdjustmentInput.removeAttribute('disabled');
    } else {
        // If amount is 0 or less, disable the fields and reset their values
        quoteDiscountInput.setAttribute('disabled', 'true');
        quoteAdjustmentInput.setAttribute('disabled', 'true');
        quoteDiscountInput.value = 0;
        quoteAdjustmentInput.value = 0;
    }
}

/**
 * Updates dashboard statistics.
 */
async function updateDashboard() {
    if (!db || !userId) return;

    try {
        // Customers are top-level, filtered by creatorId
        const customersRef = collection(db, 'customers');
        // Opportunities are top-level, filtered by creatorId
        const opportunitiesRef = collection(db, 'opportunities');

        const totalCustomersQuery = query(customersRef, where('creatorId', '==', userId));
        const totalCustomersSnap = await getDocs(totalCustomersQuery);
        if (dashboardTotalCustomers) dashboardTotalCustomers.textContent = totalCustomersSnap.size;

        const totalOpportunitiesQuery = query(opportunitiesRef, where('creatorId', '==', userId));
        const totalOpportunitiesSnap = await getDocs(totalOpportunitiesQuery);
        if (dashboardTotalOpportunities) dashboardTotalOpportunities.textContent = totalOpportunitiesSnap.size;

        const openOpportunitiesQuery = query(opportunitiesRef,
            where('creatorId', '==', userId),
            where('salesStage', 'in', ['Prospect', 'Qualification', 'Proposal', 'Negotiation'])
        );
        const openOpportunitiesSnap = await getDocs(openOpportunitiesQuery);
        if (dashboardOpenOpportunities) dashboardOpenOpportunities.textContent = openOpportunitiesSnap.size;

        const wonOpportunitiesQuery = query(opportunitiesRef,
            where('creatorId', '==', userId),
            where('salesStage', '==', 'Won')
        );
        const wonOpportunitiesSnap = await getDocs(wonOpportunitiesQuery);
        if (dashboardWonOpportunities) dashboardWonOpportunities.textContent = wonOpportunitiesSnap.size;

    } catch (error) {
        console.error("Error updating dashboard:", error);
        showMessageBox(`Error loading dashboard data: ${error.message}`, false);
    }
}

// --- Accordion Logic ---
function setupAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    console.log('setupAccordions: querySelectorAll found', accordionHeaders.length, 'accordion headers.');
    accordionHeaders.forEach(header => {
        // Remove existing listener to prevent duplicates if called multiple times
        header.removeEventListener('click', toggleAccordion);
        header.addEventListener('click', toggleAccordion);
    });
}


/**
 * Sets the visual state of an accordion (content visibility and icon rotation).
 * @param {HTMLElement} accordionHeader - The header element of the accordion.
 * @param {boolean} isOpen - True to open (show content, arrow up), false to close (hide content, arrow down).
 */
function setAccordionVisualState(accordionHeader, isOpen) {
    if (!accordionHeader) {
        console.warn("setAccordionVisualState: accordionHeader is null.");
        return;
    }
    const content = accordionHeader.nextElementSibling;
    const icon = accordionHeader.querySelector('.accordion-icon');

    if (!content || !icon) {
        console.warn("setAccordionVisualState: Could not find content or icon for header.", accordionHeader);
        return;
    }

    if (isOpen) {
        content.classList.remove('hidden');
        icon.style.transform = 'rotate(180deg)'; // Arrow points UP when content is OPEN
        accordionHeader.classList.add('expanded');
    } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(0deg)'; // Arrow points DOWN when content is CLOSED
        accordionHeader.classList.remove('expanded');
    }
    console.log(`Accordion state set for ${accordionHeader.textContent.trim()}: ${isOpen ? 'OPEN' : 'CLOSED'}`);
}


/**
 * Sets up click listeners for all accordion headers on the page.
 * This should be called once on page load.
 */
function setupAccordionListeners() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.removeEventListener('click', toggleAccordion); // Ensure no duplicate listeners
        header.addEventListener('click', toggleAccordion);
    });
    console.log("All accordion listeners set up.");
}



function toggleAccordion(event) {
    const header = event.currentTarget;
    const content = header.nextElementSibling;
    const icon = header.querySelector('.accordion-icon');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        // Only apply transform for SVG icons, as per HTML structure
        if (icon) {
            icon.style.transform = 'rotate(0deg)';// Down arrow for open state
        }
        header.classList.add('expanded');
    } else {
        content.classList.add('hidden');
        if (icon) {
            icon.style.transform = 'rotate(180deg)'; // Up arrow for closed state
        }
        header.classList.remove('expanded');
    }
}

// --- Form Visibility Functions ---
function showCustomerForm() {
    if (customerFormContainer) customerFormContainer.classList.remove('hidden');
}

function hideCustomerForm() {
    if (customerFormContainer) customerFormContainer.classList.add('hidden');
    if (customerForm) customerForm.reset(); // Clear form fields
    const customerIdInput = document.getElementById('customer-id');
    if (customerIdInput) customerIdInput.value = ''; // Clear hidden ID
    const customerFormMessage = document.getElementById('customer-form-message');
    if (customerFormMessage) customerFormMessage.classList.add('hidden');
}

function showLeadForm() {
    if (leadFormContainer) leadFormContainer.classList.remove('hidden');
}

function hideLeadForm() {
    if (leadFormContainer) leadFormContainer.classList.add('hidden');
    if (leadForm) leadForm.reset();
    const leadIdInput = document.getElementById('lead-id');
    if (leadIdInput) leadIdInput.value = '';
    const leadFormMessage = document.getElementById('lead-form-message');
    if (leadFormMessage) leadFormMessage.classList.add('hidden');
}

/**
 * Shows the Opportunity form and sets the initial state of its accordions.
 * This function should NOT manipulate the work logs section visibility directly.
 * That is handled by setupOpportunityForm based on whether it's a new or existing opportunity.
 */
function showOpportunityForm() {
    // Show the main opportunity form container
    if (opportunityFormContainer) opportunityFormContainer.classList.remove('hidden');

    console.log('showOpportunityForm: Setting initial accordion states for opportunity form.');
    // Note: This function no longer attempts to manipulate the work logs accordion.
    // The visibility and state of the work logs section are managed by setupOpportunityForm
    // and handleSaveOpportunity based on whether an opportunity is new or existing.
}

function hideOpportunityForm() {
    if (opportunityFormContainer) opportunityFormContainer.classList.add('hidden');
    if (opportunityForm) opportunityForm.reset();
    const opportunityIdInput = document.getElementById('opportunity-id');
    if (opportunityIdInput) opportunityIdInput.value = '';
    const opportunityFormMessage = document.getElementById('opportunity-form-message');
    if (opportunityFormMessage) opportunityFormMessage.classList.add('hidden');
    currentOpportunityId = null; // Reset current opportunity being edited
    if (workLogsList) workLogsList.innerHTML = ''; // Clear work logs
    if (noWorkLogsMessage) noWorkLogsMessage.classList.remove('hidden'); // Show no work logs message
    hideWorkLogForm(); // Hide work log entry form
    // Also hide the work logs section container when opportunity form is hidden
    if (workLogsSectionContainer) workLogsSectionContainer.classList.add('hidden');
}

/**
 * Sets up the Work Log form, populating the Type dropdown.
 * @param {Object|null} workLog - The work log data to pre-fill the form, or null for a new entry.
 */
async function setupWorkLogForm(workLog = null) {
    // Populate Work Log Type (hardcoded options for now)
    const workLogTypes = [
        { id: 'Call', name: 'Call' },
        { id: 'Email', name: 'Email' },
        { id: 'Meeting', name: 'Meeting' },
        { id: 'Site Visit', name: 'Site Visit' },
        { id: 'Proposal Sent', name: 'Proposal Sent' },
        { id: 'Follow-up', name: 'Follow-up' },
        { id: 'Other', name: 'Other' }
    ];
    populateSelect(workLogTypeSelect, workLogTypes, 'id', 'name', 'Select Type');

    const workLogIdInput = document.getElementById('work-log-id');
    const workLogOpportunityIdInput = document.getElementById('work-log-opportunity-id');
    const workLogDateInput = document.getElementById('work-log-date');
    const workLogDetailsTextarea = document.getElementById('work-log-details');

    if (workLogForm) {
        workLogForm.reset(); // Always reset the form first to a clean state
    }

    if (workLogIdInput) {
        workLogIdInput.value = ''; // Always clear the ID input field
    }

    if (workLog) {
        // Edit Mode: Populate with existing data
        console.log("setupWorkLogForm: Entering EDIT mode for work log:", workLog.id);
        if (workLogIdInput) workLogIdInput.value = workLog.id;
        if (workLogOpportunityIdInput) workLogOpportunityIdInput.value = currentOpportunityId || ''; // Keep parent ID
        const logDate = workLog.date ? new Date(workLog.date.seconds * 1000).toISOString().split('T')[0] : '';
        if (workLogDateInput) workLogDateInput.value = logDate;
        if (workLogTypeSelect) workLogTypeSelect.value = workLog.type || ''; // CORRECTED variable from `log.type` to `workLog.type`
        if (workLogDetailsTextarea) workLogDetailsTextarea.value = workLog.details || ''; // CORRECTED variable from `log.details` to `workLog.details`
    } else {
        // Add New Mode: Set default values
        console.log("setupWorkLogForm: Entering ADD NEW mode.");
        if (workLogOpportunityIdInput) workLogOpportunityIdInput.value = currentOpportunityId || ''; // Ensure opportunity ID is set for new logs
        if (workLogDateInput) workLogDateInput.valueAsDate = new Date();
    }
    
    showWorkLogForm();
}



/**
 * Shows the work log entry form and resets it.
 */
function showWorkLogForm() {
    if (opportunityWorkLogFormContainer) {
        opportunityWorkLogFormContainer.classList.remove('hidden');
    }
    if (opportunityWorkLogForm) {
        opportunityWorkLogForm.reset();
    }
    // Clear any previous messages
    if (workLogFormMessage) workLogFormMessage.classList.add('hidden');
    // Set opportunity ID in hidden field for new work log
    if (document.getElementById('work-log-opportunity-id')) {
        document.getElementById('work-log-opportunity-id').value = currentOpportunityId;
    }
    // Populate dropdowns for the work log form
    populateWorkLogTypes();
}

/**
 * Hides the work log entry form.
 */
function hideWorkLogForm() {
    if (opportunityWorkLogFormContainer) {
        opportunityWorkLogFormContainer.classList.add('hidden');
    }
    if (opportunityWorkLogForm) {
        opportunityWorkLogForm.reset();
    }
    if (workLogFormMessage) workLogFormMessage.classList.add('hidden');
}



// NEW: Quote Form Visibility Functions
function showQuoteForm() {
    if (quoteFormContainer) quoteFormContainer.classList.remove('hidden');
}

function hideQuoteForm() {
    if (quoteFormContainer) quoteFormContainer.classList.add('hidden');
    if (quoteForm) quoteForm.reset();
    const quoteIdInput = document.getElementById('quote-id');
    if (quoteIdInput) quoteIdInput.value = '';
    const quoteFormMessage = document.getElementById('quote-form-message');
    if (quoteFormMessage) quoteFormMessage.classList.add('hidden');
    // Clear auto-filled fields
    if (customerContactNameInput) customerContactNameInput.value = '';
    if (customerPhoneInput) customerPhoneInput.value = '';
    if (customerEmailInput) customerEmailInput.value = '';
    if (customerAddressInput) customerAddressInput.value = '';
}


function showCountryForm() {
    if (countryFormContainer) countryFormContainer.classList.remove('hidden');
}

function hideCountryForm() {
    if (countryFormContainer) countryFormContainer.classList.add('hidden');
    if (countryForm) countryForm.reset();
    const countryIdInput = document.getElementById('country-id');
    if (countryIdInput) countryIdInput.value = '';
    const countryFormMessage = document.getElementById('country-form-message');
    if (countryFormMessage) countryFormMessage.classList.add('hidden');
}

function showCurrencyForm() {
    if (currencyFormContainer) currencyFormContainer.classList.remove('hidden');
}

function hideCurrencyForm() {
    if (currencyFormContainer) currencyFormContainer.classList.add('hidden');
    if (currencyForm) currencyForm.reset();
    const currencyIdInput = document.getElementById('currency-id');
    if (currencyIdInput) currencyIdInput.value = '';
    const currencyFormMessage = document.getElementById('currency-form-message');
    if (currencyFormMessage) currencyFormMessage.classList.add('hidden');
}

function showPriceBookForm() {
    if (priceBookFormContainer) priceBookFormContainer.classList.remove('hidden');
}

function hidePriceBookForm() {
    if (priceBookFormContainer) priceBookFormContainer.classList.add('hidden');
    if (priceBookForm) priceBookForm.reset();
    const priceBookIdInput = document.getElementById('price-book-id');
    if (priceBookIdInput) priceBookIdInput.value = '';
    const priceBookFormMessage = document.getElementById('price-book-form-message');
    if (priceBookFormMessage) priceBookFormMessage.classList.add('hidden');
}

// --- Data Loading Functions ---

/**
 * Fetches data from a Firestore collection.
 * @param {string} collectionName - The name of the Firestore collection (e.g., 'customers').
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of documents.
 */
async function fetchData(collectionName) {
    if (!db || !userId) {
        console.warn("Firestore or userId not available. Cannot fetch data from:", collectionName);
        return [];
    }
    let collectionRef = collection(db, collectionName);

    try {
        let q;
        // Apply creatorId filter only for user-specific collections as per rules
        // Note: 'users_data' is also top-level but not filtered by creatorId in client-side fetches
        // 'quotes' read rule depends on opportunity creator, so it's not simply creatorId == userId here
        if (['customers', 'leads', 'opportunities'].includes(collectionName)) {
            q = query(collectionRef, where('creatorId', '==', userId));
        } else {
            // For public collections (countries, currencies, priceBooks, quotes), no client-side creatorId filter
            // Security rules will handle read permissions for 'quotes'
            q = query(collectionRef);
        }
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return data;
    } catch (error) {
        console.error(`Error fetching data from ${collectionName}:`, error);
        showMessageBox(`Error loading data from ${collectionName}: ${error.message}`, false);
        return [];
    }
}


/**
 * Populates the lead source dropdown with predefined options.
 * This list should match the allowed sources in Firestore security rules.
 */
function populateLeadSource() {
    if (!leadSourceSelect) {
        console.warn("populateLeadSource: leadSourceSelect element not found. Cannot populate sources.");
        return;
    }

    // Clear existing options and add a default placeholder
    leadSourceSelect.innerHTML = '<option value="">Select Source</option>';

    // This list must match the one defined in your Firestore security rules for 'source'
    const allowedSources = ['Website', 'Referral', 'Advertisement', 'Social Media', 'Event', 'Others'];

    allowedSources.forEach(source => {
        const option = document.createElement('option');
        option.value = source;
        option.textContent = source;
        leadSourceSelect.appendChild(option);
    });
}




/**
 * Populates a multi-select dropdown with predefined service options.
 * This list should match the 'getAllowedServicesList()' in Firestore security rules.
 * @param {HTMLSelectElement} selectElement The select element to populate.
 */
function populateServicesInterested(selectElement) {
    if (!selectElement) {
        console.warn("populateServicesInterested: Select element is null or undefined.");
        return;
    }

    // Clear existing options, but keep the first default if it's a placeholder
    // For multi-select, we usually just clear all and add new ones.
    selectElement.innerHTML = '';

    // This list must match the one defined in your Firestore security rules (getAllowedServicesList)
    const allowedServices = [
        'Save the Day', 'Pre-Wedding Photo Shoot', 'Wedding',
        'Post-Wedding Photo Shoot', 'Baby Shower', 'Corporate Event',
        'Product Launch', 'Political Meeting', 'Others'
    ];

    allowedServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service;
        option.textContent = service;
        selectElement.appendChild(option);
    });
}




/**
 * Populates a select element with options from Firestore.
 * @param {HTMLElement} selectElement - The select element to populate.
 * @param {Array<Object>} data - Array of objects with id and name properties.
 * @param {string} valueKey - The key to use for the option's value.
 * @param {string} textKey - The key to use for the option's text.
 * @param {string} defaultOptionText - Optional text for the default/placeholder option.
 */
function populateSelect(selectElement, data, valueKey, textKey, defaultOptionText = 'Select...') {
    if (!selectElement) {
        console.warn("populateSelect: selectElement is null.");
        return;
    }
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        selectElement.appendChild(option);
    });
}

/**
 * Populates a multi-select element with options.
 * @param {HTMLElement} selectElement - The multi-select element to populate.
 * @param {Array<Object>} data - Array of objects with id and name properties.
 * @param {string} valueKey - The key to use for the option's value.
 * @param {string} textKey - The key to use for the option's text.
 * @param {Array<string>} selectedValues - An array of values to pre-select.
 */
function populateMultiSelect(selectElement, data, valueKey, textKey, selectedValues = []) {
    if (!selectElement) {
        console.warn("populateMultiSelect: selectElement is null.");
        return;
    }
    selectElement.innerHTML = ''; // Clear existing options
    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        if (selectedValues.includes(item[valueKey])) {
            option.selected = true;
        }
        selectElement.appendChild(option);
    });
}

// --- Customer Logic ---

async function setupCustomerForm(customer = null) {
    const countries = await fetchData('countries'); // Countries are top-level
    populateSelect(document.getElementById('customer-country'), countries, 'name', 'name', 'Select Country');

    if (customer) {
        document.getElementById('customer-id').value = customer.id;
        document.getElementById('customer-type').value = customer.type || 'Individual';
        document.getElementById('customer-name').value = customer.name || '';
        document.getElementById('customer-email').value = customer.email || '';
        document.getElementById('customer-phone').value = customer.phone || '';
        document.getElementById('customer-address').value = customer.address || '';
        document.getElementById('customer-country').value = customer.country || '';
        document.getElementById('customer-contact-method').value = customer.preferredContactMethod || 'Email';
        document.getElementById('customer-industry').value = customer.industry || '';
        document.getElementById('ccustomer-additional-details').value = customer.additionalDetails || '';
        document.getElementById('customer-source').value = customer.source || '';
        document.getElementById('customer-active').checked = customer.active !== undefined ? customer.active : true;
    } else {
        if (customerForm) customerForm.reset();
        const customerIdInput = document.getElementById('customer-id');
        if (customerIdInput) customerIdInput.value = '';
        const customerActiveCheckbox = document.getElementById('customer-active');
        if (customerActiveCheckbox) customerActiveCheckbox.checked = true; // Default to active for new customers
    }
    showCustomerForm();
}

// Inside handleSaveCustomer() function:

async function handleSaveCustomer(event) {
    event.preventDefault();
    const customerId = document.getElementById('customer-id').value;

    // Get the current authenticated user's UID
    const creatorId = auth.currentUser?.uid;

    if (!creatorId) {
        showMessageBox("Authentication required to save customer.", 'alert', true);
        console.error("Error saving customer: User not authenticated or UID not available.");
        return;
    }

    // Collect data directly from DOM elements using their IDs
    const data = {
        name: document.getElementById('customer-name').value || '',
        type: document.getElementById('customer-type').value || '',
        email: document.getElementById('customer-email').value || '',
        phone: document.getElementById('customer-phone').value || '',
        address: document.getElementById('customer-address').value || '',
        country: document.getElementById('customer-country').value || '',
        preferredContactMethod: document.getElementById('customer-contact-method').value || '',
        industry: document.getElementById('customer-industry').value || '',
        additionalDetails: document.getElementById('customer-additional-details').value || '',
        source: document.getElementById('customer-source').value || '',
        active: customerActiveCheckbox ? customerActiveCheckbox.checked : false, // Checkbox value
        updatedAt: serverTimestamp(),
        creatorId: creatorId // Explicitly set creatorId
    };

    try {
        if (customerId) {
            // For update, ensure createdAt is preserved
            const existingDoc = await getDoc(getDocRef('customers', customerId));
            if (existingDoc.exists()) {
                data.createdAt = existingDoc.data().createdAt;
            } else {
                showMessageBox("Error: Cannot update non-existent customer.", 'alert', true);
                return;
            }
            await updateDoc(getDocRef('customers', customerId), data);
            showMessageBox("Customer updated successfully!");
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef('customers'), data);
            showMessageBox("Customer added successfully!");
        }
        hideForm(customerFormContainer, customerFormMessage);
    } catch (error) {
        console.error("Error saving customer:", error);
        showMessageBox(`Error saving customer: ${error.message}`, 'alert', true);
    }
}


/**
 * Handles the editing of an existing customer.
 * Populates the customer form with existing data and shows the form.
 * @param {string} customerId The ID of the customer document to edit.
 */
async function handleEditCustomer(customerId) {
    console.log(`handleEditCustomer called for customerId: ${customerId}`); // DEBUG LOG
    showForm(customerFormContainer); // Show the form container
    if (customerForm) customerForm.reset(); // Reset form fields
    if (document.getElementById('customer-id')) document.getElementById('customer-id').value = customerId; // Set hidden ID

    try {
        const customerDocRef = getDocRef('customers', customerId);
        console.log(`Attempting to get document from path: ${customerDocRef.path}`); // DEBUG LOG
        const docSnap = await getDoc(customerDocRef);

        if (docSnap.exists()) {
            console.log("Customer document found:", docSnap.data()); // DEBUG LOG
            const customerData = { id: docSnap.id, ...docSnap.data() };

            // Populate form fields using their IDs
            if (document.getElementById('customer-name')) document.getElementById('customer-name').value = customerData.name || '';
            if (customerTypeSelect) customerTypeSelect.value = customerData.type || '';
            if (document.getElementById('customer-email')) document.getElementById('customer-email').value = customerData.email || '';
            if (document.getElementById('customer-phone')) document.getElementById('customer-phone').value = customerData.phone || '';
            if (document.getElementById('customer-address')) document.getElementById('customer-address').value = customerData.address || '';

            // Populate countries dropdown before setting the value
            await populateCustomerCountries();
            if (customerCountrySelect) customerCountrySelect.value = customerData.country || '';

            if (customerContactMethodSelect) customerContactMethodSelect.value = customerData.preferredContactMethod || '';
            if (customerIndustrySelect) customerIndustrySelect.value = customerData.industry || '';
            if (document.getElementById('customer-additional-details')) document.getElementById('customer-additional-details').value = customerData.additionalDetails || '';
            if (customerSourceSelect) customerSourceSelect.value = customerData.source || '';
            if (customerActiveCheckbox) customerActiveCheckbox.checked = customerData.active || false;

        } else {
            console.warn(`Customer with ID ${customerId} not found in Firestore.`); // DEBUG LOG
            showMessageBox("Customer not found.", 'alert', true);
            hideForm(customerFormContainer);
        }
    } catch (error) {
        console.error("Error editing customer:", error); // DEBUG LOG
        showMessageBox(`Error loading customer data for edit: ${error.message}`, 'alert', true);
        hideForm(customerFormContainer);
    }
}


async function loadCustomers() {
    if (!db || !userId) {
        if (noCustomersMessage) noCustomersMessage.classList.remove('hidden');
        if (customersGrid) customersGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    const customersCollectionRef = collection(db, 'customers'); // Top-level collection

    // Setup real-time listener, query only for current user's customers
    onSnapshot(query(customersCollectionRef, where('creatorId', '==', userId)), snapshot => {
        const customers = [];
        snapshot.forEach(doc => {
            customers.push({ id: doc.id, ...doc.data() });
        });
        renderCustomersGrid(customers);
    }, error => {
        console.error("Error loading customers in real-time:", error);
        showMessageBox(`Error loading customers: ${error.message}`, false);
        if (noCustomersMessage) noCustomersMessage.classList.remove('hidden');
        if (customersGrid) customersGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderCustomersGrid(customers) {
    const data = customers.map(customer => [
        customer.name,
        customer.email,
        customer.phone,
        customer.country,
        customer.active ? 'Yes' : 'No',
        customer.id
    ]);

    if (!customersGrid) {
        if (customersGridContainer) {
            customersGrid = new gridjs.Grid({
                columns: [
                    { name: 'Name', width: '20%' },
                    { name: 'Email', width: '25%' },
                    { name: 'Phone', width: '15%' },
                    { name: 'Country', width: '15%' },
                    { name: 'Active', width: '10%' },
                    {
                        name: 'Actions',
                        width: '15%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editCustomer(row.cells[5].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteCustomer(row.cells[5].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(customersGridContainer);
            console.log('Grid.js is now available for customers.'); // Log once when grid is initialized
        } else {
            console.error("customersGridContainer not found, cannot render customers grid.");
        }
    } else {
        customersGrid.updateConfig({ data: data }).forceRender();
    }

    if (noCustomersMessage) {
        if (customers.length === 0) {
            noCustomersMessage.classList.remove('hidden');
        } else {
            noCustomersMessage.classList.add('hidden');
        }
    }
}

async function editCustomer(customerDataId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, 'customers', customerDataId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupCustomerForm(docSnap.data());
            const customerIdInput = document.getElementById('customer-id');
            if (customerIdInput) customerIdInput.value = customerDataId; // Ensure ID is set
        } else {
            showMessageBox("Customer not found!", false);
        }
    } catch (error) {
        console.error("Error editing customer:", error);
        showMessageBox(`Error loading customer for edit: ${error.message}`, false);
    }
}

async function deleteCustomer(customerDataId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this customer?", true);
    if (!confirmDelete) return;

    if (!db || !userId) return;
    try {
        await deleteDoc(doc(db, 'customers', customerDataId)); // Top-level collection
        showMessageBox("Customer deleted successfully!", false);
        await loadCustomers(); // Reload grid
        await updateDashboard();
    }
    catch (error) {
        console.error("Error deleting customer:", error);
        showMessageBox(`Error deleting customer: ${error.message}`, false);
    }
}

/**
 * Handles the deletion of a customer document from Firestore.
 * Prompts for confirmation before proceeding with deletion.
 * @param {string} customerId The ID of the customer document to delete.
 */
async function handleDeleteCustomer(customerId) {
    console.log(`handleDeleteCustomer: Attempting to delete customer with ID: ${customerId}`); // DEBUG LOG

    // Await the result from showMessageBox directly
    const confirmed = await showMessageBox("Are you sure you want to delete this customer? This action cannot be undone.", 'confirm');

    console.log(`handleDeleteCustomer: Confirmed status from MessageBox: ${confirmed}`); // DEBUG LOG: Check confirmed value

    if (confirmed) {
        console.log("handleDeleteCustomer: Confirmed is true, proceeding with deletion logic."); // DEBUG LOG: Confirm block entered
        try {
            // Get the document reference
            const customerDocRef = getDocRef('customers', customerId);
            console.log(`handleDeleteCustomer: Deleting document at path: ${customerDocRef.path}`); // DEBUG LOG

            await deleteDoc(customerDocRef);
            showMessageBox("Customer deleted successfully!", 'alert', false); // Use 'alert' type for success message
            console.log(`handleDeleteCustomer: Customer ${customerId} deleted successfully.`); // SUCCESS LOG
        } catch (error) {
            console.error("handleDeleteCustomer: Error deleting customer:", error); // Log the full error object
            if (error.code && error.message) {
                showMessageBox(`Error deleting customer: ${error.message} (Code: ${error.code})`, 'alert', true);
            } else {
                showMessageBox(`Error deleting customer: An unexpected error occurred.`, 'alert', true);
            }
        }
    } else {
        console.log("handleDeleteCustomer: Deletion cancelled by user."); // DEBUG LOG: If user cancels
    }
}



// --- Lead Logic ---

async function setupLeadForm(lead = null) {
    // Populate Services Interested (example data, replace with Firestore if needed)
    const services = [
        { id: 'Save the Day', name: 'Save the Day' },
        { id: 'Pre-Wedding Photo Shoot', name: 'Pre-Wedding Photo Shoot' },
        { id: 'Wedding', name: 'Wedding' },
        { id: 'Post-Wedding Photo Shoot', name: 'Post-Wedding Photo Shoot' },
        { id: 'Baby Shower', name: 'Baby Shower' },
        { id: 'Corporate Event', name: 'Corporate Event' },
        { id: 'Product Launch', name: 'Product Launch' },
        { id: 'Political Meeting', name: 'Political Meeting' },
        { id: 'Others', name: 'Others' }
    ];

    // Populate Source (example data, replace with Firestore if needed)
    const sources = [
        { id: 'Website', name: 'Website' },
        { id: 'Referral', name: 'Referral' },
        { id: 'Advertisement', name: 'Advertisement' },
        { id: 'Social Media', name: 'Social Media' },
        { id: 'Event', name: 'Event' },
        { id: 'Others', name: 'Others' }
    ];
    populateSelect(document.getElementById('lead-source'), sources, 'id', 'name', 'Select Source');

    if (lead) {
        document.getElementById('lead-id').value = lead.id;
        document.getElementById('lead-contact-name').value = lead.contactName || '';
        document.getElementById('lead-phone').value = lead.phone || '';
        document.getElementById('lead-email').value = lead.email || '';
        // NEW: Populate multi-select for servicesInterested
        const currentServices = Array.isArray(lead.servicesInterested) ? lead.servicesInterested : [];
        populateMultiSelect(leadServicesInterestedSelect, services, 'id', 'name', currentServices);

        // Convert Firestore Timestamp to YYYY-MM-DD string for input type="date"
        const eventDate = lead.eventDate ? new Date(lead.eventDate.seconds * 1000).toISOString().split('T')[0] : '';
        document.getElementById('lead-event-date').value = eventDate;
        document.getElementById('lead-source').value = lead.source || '';
        document.getElementById('lead-additional-details').value = lead.additionalDetails || '';
    } else {
        if (leadForm) leadForm.reset();
        const leadIdInput = document.getElementById('lead-id');
        if (leadIdInput) leadIdInput.value = '';
        // NEW: For new leads, ensure multi-select is reset
        populateMultiSelect(leadServicesInterestedSelect, services, 'id', 'name', []);
    }
    showLeadForm();
}

async function handleSaveLead(event) {
    event.preventDefault();
    const leadId = document.getElementById('lead-id').value;

    // Get the current authenticated user's UID
    const creatorId = auth.currentUser?.uid;

    if (!creatorId) {
        showMessageBox("Authentication required to save lead.", 'alert', true);
        console.error("Error saving lead: User not authenticated or UID not available.");
        return;
    }

    // Collect data directly from DOM elements using their IDs
    const servicesInterested = leadServicesInterestedSelect ?
        Array.from(leadServicesInterestedSelect.selectedOptions).map(option => option.value) : [];

    const data = {
        contactName: document.getElementById('lead-contact-name').value || '',
        phone: document.getElementById('lead-phone').value || '',
        email: document.getElementById('lead-email').value || '',
        servicesInterested: servicesInterested,
        eventDate: document.getElementById('lead-event-date').value ? new Date(document.getElementById('lead-event-date').value) : null,
        source: leadSourceSelect ? leadSourceSelect.value : '',
        additionalDetails: document.getElementById('lead-additional-details').value || '',
        updatedAt: serverTimestamp(),
        creatorId: creatorId // Explicitly set creatorId
    };

    try {
        if (leadId) {
            // For update, ensure createdAt is preserved
            const existingDoc = await getDoc(getDocRef('leads', leadId));
            if (existingDoc.exists()) {
                data.createdAt = existingDoc.data().createdAt;
            } else {
                showMessageBox("Error: Cannot update non-existent lead.", 'alert', true);
                return;
            }
            await updateDoc(getDocRef('leads', leadId), data);
            showMessageBox("Lead updated successfully!", 'alert', false);
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef('leads'), data);
            showMessageBox("Lead added successfully!", 'alert', false);
        }
        hideForm(leadFormContainer, leadFormMessage);
    } catch (error) {
        console.error("Error saving lead:", error);
        showMessageBox(`Error saving lead: ${error.message}`, 'alert', true);
    }
}


/**
 * Handles the editing of an existing lead.
 * Populates the lead form with existing data and shows the form.
 * @param {string} leadId The ID of the lead document to edit.
 */
async function handleEditLead(leadId) {
    showForm(leadFormContainer); // Show the form container
    if (leadForm) leadForm.reset(); // Reset form fields
    if (document.getElementById('lead-id')) document.getElementById('lead-id').value = leadId; // Set hidden ID

    try {
        const docSnap = await getDoc(getDocRef('leads', leadId));
        if (docSnap.exists()) {
            const leadData = { id: docSnap.id, ...docSnap.data() };

            // Populate form fields using their IDs
            if (document.getElementById('lead-contact-name')) document.getElementById('lead-contact-name').value = leadData.contactName || '';
            if (document.getElementById('lead-phone')) document.getElementById('lead-phone').value = leadData.phone || '';
            if (document.getElementById('lead-email')) document.getElementById('lead-email').value = leadData.email || '';

            populateServicesInterested(leadServicesInterestedSelect);
            if (leadServicesInterestedSelect && leadData.servicesInterested && Array.isArray(leadData.servicesInterested)) {
                Array.from(leadServicesInterestedSelect.options).forEach(option => {
                    option.selected = leadData.servicesInterested.includes(option.value);
                });
            }

            const eventDate = leadData.eventDate ? new Date(leadData.eventDate.seconds * 1000).toISOString().split('T')[0] : '';
            if (document.getElementById('lead-event-date')) document.getElementById('lead-event-date').value = eventDate;

            // ADD THIS LINE: Populate lead source before setting the value
            populateLeadSource();
            if (leadSourceSelect) leadSourceSelect.value = leadData.source || '';

            if (document.getElementById('lead-additional-details')) document.getElementById('lead-additional-details').value = leadData.additionalDetails || '';

        } else {
            showMessageBox("Lead not found.", 'alert', true);
            hideForm(leadFormContainer);
        }
    } catch (error) {
        console.error("Error editing lead:", error);
        showMessageBox(`Error loading lead data for edit: ${error.message}`, 'alert', true);
        hideForm(leadFormContainer);
    }
}



async function loadLeads() {
    if (!db || !userId) {
        if (noLeadsMessage) noLeadsMessage.classList.remove('hidden');
        if (leadsGrid) leadsGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Query only for current user's leads (top-level collection)
    onSnapshot(query(collection(db, 'leads'), where('creatorId', '==', userId)), snapshot => {
        const leads = [];
        snapshot.forEach(doc => {
            const leadData = doc.data();
            // Convert Firestore Timestamp to YYYY-MM-DD string for display
            const eventDateDisplay = leadData.eventDate && leadData.eventDate.toDate ? leadData.eventDate.toDate().toISOString().split('T')[0] : 'N/A';
            // Display services as a comma-separated string
            const servicesInterestedDisplay = Array.isArray(leadData.servicesInterested) ? leadData.servicesInterested.join(', ') : 'N/A';
            leads.push({ id: doc.id, ...leadData, eventDate: eventDateDisplay, servicesInterestedDisplay: servicesInterestedDisplay });
        });
        renderLeadsGrid(leads);
    }, error => {
        console.error("Error loading leads in real-time:", error);
        showMessageBox(`Error loading leads: ${error.message}`, false);
        if (noLeadsMessage) noLeadsMessage.classList.remove('hidden');
        if (leadsGrid) leadsGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderLeadsGrid(leads) {
    const data = leads.map(lead => [
        lead.contactName,
        lead.email,
        lead.phone,
        lead.servicesInterestedDisplay, // NEW: Display formatted services
        lead.eventDate, // Already formatted in loadLeads
        lead.source,
        lead.id
    ]);

    if (!leadsGrid) {
        if (leadsGridContainer) {
            leadsGrid = new gridjs.Grid({
                columns: [
                    { name: 'Contact Name', width: '20%' },
                    { name: 'Email', width: '20%' },
                    { name: 'Phone', width: '15%' },
                    { name: 'Service', width: '15%' },
                    { name: 'Event Date', width: '10%' },
                    { name: 'Source', width: '10%' },
                    {
                        name: 'Actions',
                        width: '10%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editLead(row.cells[6].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteLead(row.cells[6].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(leadsGridContainer);
        } else {
            console.error("leadsGridContainer not found, cannot render leads grid.");
        }
    } else {
        leadsGrid.updateConfig({ data: data }).forceRender();
    }

    if (noLeadsMessage) {
        if (leads.length === 0) {
            noLeadsMessage.classList.remove('hidden');
        } else {
            noLeadsMessage.classList.add('hidden');
        }
    }
}

async function editLead(leadId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, 'leads', leadId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupLeadForm(docSnap.data());
            const leadIdInput = document.getElementById('lead-id');
            if (leadIdInput) leadIdInput.value = leadId; // Ensure ID is set
        } else {
            showMessageBox("Lead not found!", false);
        }
    } catch (error) {
        console.error("Error editing lead:", error);
        showMessageBox(`Error loading lead for edit: ${error.message}`, false);
    }
}

/**
 * Handles the deletion of a lead document from Firestore.
 * Prompts for confirmation before proceeding with deletion.
 * @param {string} leadId The ID of the lead document to delete.
 */
async function handleDeleteLead(leadId) {
    console.log(`handleDeleteLead: Attempting to delete lead with ID: ${leadId}`); // DEBUG LOG

    // Await the result from showMessageBox directly
    const confirmed = await showMessageBox("Are you sure you want to delete this lead? This action cannot be undone.", 'confirm');

    console.log(`handleDeleteLead: Confirmed status from MessageBox: ${confirmed}`); // DEBUG LOG: Check confirmed value

    if (confirmed) {
        console.log("handleDeleteLead: Confirmed is true, proceeding with deletion logic."); // DEBUG LOG: Confirm block entered
        try {
            // Get the document reference
            const leadDocRef = getDocRef('leads', leadId);
            console.log(`handleDeleteLead: Deleting document at path: ${leadDocRef.path}`); // DEBUG LOG

            await deleteDoc(leadDocRef);
            showMessageBox("Lead deleted successfully!", 'alert', false); // Use 'alert' type for success message
            console.log(`handleDeleteLead: Lead ${leadId} deleted successfully.`); // SUCCESS LOG
        } catch (error) {
            console.error("handleDeleteLead: Error deleting lead:", error); // Log the full error object
            if (error.code && error.message) {
                showMessageBox(`Error deleting lead: ${error.message} (Code: ${error.code})`, 'alert', true);
            } else {
                showMessageBox(`Error deleting lead: An unexpected error occurred.`, 'alert', true);
            }
        }
    } else {
        console.log("handleDeleteLead: Deletion cancelled by user."); // DEBUG LOG: If user cancels
    }
}



// --- Opportunity Logic ---


/**
 * Populates the opportunity customer dropdown with data from the 'customers' collection.
 */
async function populateOpportunityCustomers() {
    if (!opportunityCustomerSelect) {
        console.warn("populateOpportunityCustomers: opportunityCustomerSelect element not found. Cannot populate customers.");
        return;
    }
    opportunityCustomerSelect.innerHTML = '<option value="">Select Customer</option>'; // Clear existing options and add default
    try {
        const customersSnapshot = await getDocs(getCollectionRef('customers'));
        customersSnapshot.forEach(doc => {
            const customer = doc.data();
            const option = document.createElement('option');
            option.value = doc.id; // Use customer ID as value
            option.textContent = customer.name; // Display customer name
            opportunityCustomerSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating customers for opportunity form:", error);
        showMessageBox("Error loading customers for opportunity dropdown.", 'alert', true);
    }
}

/**
 * Calculates and displays the Opportunity Net value based on Opportunity Value, Discount, and Adjustment Amount.
 * This function now includes a retry mechanism to ensure DOM elements are available.
 * @param {number} [retries=5] The number of times to retry finding elements if initially null.
 * @param {number} [delay=50] The delay in milliseconds between retries.
 */
function calculateOpportunityNet(retries = 5, delay = 50) {
    const valueInput = document.getElementById('opportunity-value');
    const discountInput = document.getElementById('opportunity-discount');
    const adjustmentInput = document.getElementById('opportunity-adjustment-amt');
    const netSpan = document.getElementById('opportunity-net-span');

    // Check if all elements are found
    if (valueInput && discountInput && adjustmentInput && netSpan) {
        const value = parseFloat(valueInput.value) || 0;
        const discount = parseFloat(discountInput.value) || 0;
        const adjustment = parseFloat(adjustmentInput.value) || 0;

        console.log(`calculateOpportunityNet: Elements found. Value=${value}, Discount=${discount}, Adjustment=${adjustment}`);

        let net = value - (value * (discount / 100));
        net = net - adjustment;
        net = Math.max(0, net); // Ensure net is not negative

        netSpan.textContent = net.toFixed(2);
        console.log(`calculateOpportunityNet: Calculated Net=${net.toFixed(2)}`);
    } else if (retries > 0) {
        // If elements are not found and retries remain, try again after a delay
        console.warn(`calculateOpportunityNet: Elements not found (retries left: ${retries}). Retrying in ${delay}ms.`);
        if (!valueInput) console.error("Missing in retry: opportunity-value");
        if (!discountInput) console.error("Missing in retry: opportunity-discount");
        if (!adjustmentInput) console.error("Missing in retry: opportunity-adjustment-amt");
        if (!netSpan) console.error("Missing in retry: opportunity-net-span");

        setTimeout(() => calculateOpportunityNet(retries - 1, delay), delay);
    } else {
        // No retries left, and elements still not found
        console.error("calculateOpportunityNet: Failed to find required input/span elements after multiple retries. Cannot calculate net.");
        if (!valueInput) console.error("FINAL MISSING: opportunity-value");
        if (!discountInput) console.error("FINAL MISSING: opportunity-discount");
        if (!adjustmentInput) console.error("FINAL MISSING: opportunity-adjustment-amt");
        if (!netSpan) console.error("FINAL MISSING: opportunity-net-span");
    }
}




/**
 * Filters price books based on the selected currency and populates the dropdown.
 * @param {string} selectedCurrencyCode - The currency code to filter by.
 * @param {string|null} currentPriceBookId - The ID of the price book to select after filtering, if any.
 */
function filterAndPopulatePriceBooks(selectedCurrencyCode, currentPriceBookId = null) {
    const filteredPriceBooks = selectedCurrencyCode
        ? allPriceBooks.filter(pb => pb.currency === selectedCurrencyCode && pb.isActive)
        : allPriceBooks.filter(pb => pb.isActive); // Show all active if no currency selected

    console.log(`  Filtering price books for currency: ${selectedCurrencyCode}. Found ${filteredPriceBooks.length} active price books.`);

    populateSelect(opportunityPriceBookSelect, filteredPriceBooks, 'id', 'name', 'Select a Price Book');

    // Auto-select if only one option is available
    if (filteredPriceBooks.length === 1) {
        opportunityPriceBookSelect.value = filteredPriceBooks[0].id;
        console.log(`  Auto-selected single price book: ${filteredPriceBooks[0].name} (ID: ${filteredPriceBooks[0].id})`);
    } else if (currentPriceBookId && filteredPriceBooks.some(pb => pb.id === currentPriceBookId)) {
        // Attempt to re-select the current price book if it's still in the filtered list
        opportunityPriceBookSelect.value = currentPriceBookId;
        console.log(`  Re-selected existing price book with ID: ${currentPriceBookId}`);
    } else {
        // If no auto-selection, or current price book is no longer valid, reset selection
        opportunityPriceBookSelect.value = "";
        console.log('  No auto-selection for price book, resetting dropdown.');
    }
}

// Hardcoded services options for the multi-select dropdown
const opportunityServicesOptions = [
    { id: 'Save the Day', name: 'Save the Day' },
    { id: 'Pre-Wedding Photo Shoot', name: 'Pre-Wedding Photo Shoot' },
    { id: 'Wedding', name: 'Wedding' },
    { id: 'Post-Wedding Photo Shoot', name: 'Post-Wedding Photo Shoot' },
    { id: 'Baby Shower', name: 'Baby Shower' },
    { id: 'Corporate Event', name: 'Corporate Event' },
    { id: 'Product Launch', name: 'Product Launch' },
    { id: 'Political Meeting', name: 'Political Meeting' },
    { id: 'Others', name: 'Others' }
];


/**
 * Populates the opportunity sales stage dropdown with predefined options.
 * This list should match the allowed stages in Firestore security rules.
 */
function populateOpportunitySalesStages() {
    if (!opportunitySalesStageSelect) {
        console.warn("populateOpportunitySalesStages: opportunitySalesStageSelect element not found.");
        return;
    }
    opportunitySalesStageSelect.innerHTML = '<option value="">Select Stage</option>'; // Clear existing options and add default

    // This list must match the one defined in your Firestore security rules for 'salesStage'
    const allowedStages = ['Prospect', 'Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost'];

    allowedStages.forEach(stage => {
        const option = document.createElement('option');
        option.value = stage;
        option.textContent = stage;
        opportunitySalesStageSelect.appendChild(option);
    });
}


/**
 * Filters the price book dropdown based on the selected currency.
 */
function filterPriceBooksByCurrency() {
    if (!opportunityCurrencySelect || !opportunityPriceBookSelect || !allPriceBooks.length) {
        return; // Don't run if elements or data are not ready
    }

    const selectedCurrencyCode = opportunityCurrencySelect.value;
    opportunityPriceBookSelect.innerHTML = '<option value="">Select Price Book</option>'; // Clear and add default

    const filteredPriceBooks = allPriceBooks.filter(pb =>
        pb.isActive && (selectedCurrencyCode === '' || pb.currency === selectedCurrencyCode)
    );

    filteredPriceBooks.forEach(priceBook => {
        const option = document.createElement('option');
        option.value = priceBook.id;
        option.textContent = `${priceBook.name} (${priceBook.currency})`;
        opportunityPriceBookSelect.appendChild(option);
    });

    // If the previously selected price book is no longer in the filtered list, clear its selection
    if (opportunityPriceBookSelect.value && !filteredPriceBooks.some(pb => pb.id === opportunityPriceBookSelect.value)) {
        opportunityPriceBookSelect.value = '';
    }
}



/**
 * Populates the opportunity price book dropdown with data from the 'priceBooks' collection.
 * Stores all price books in a global cache for later filtering.
 */
async function populateOpportunityPriceBooks() {
    if (!opportunityPriceBookSelect) {
        console.warn("populateOpportunityPriceBooks: opportunityPriceBookSelect element not found.");
        return;
    }
    opportunityPriceBookSelect.innerHTML = '<option value="">Select Price Book</option>'; // Clear existing options and add default

    try {
        const priceBooksSnapshot = await getDocs(getCollectionRef('priceBooks'));
        // Cache all price books for filtering based on currency later
        allPriceBooks = priceBooksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Initially add all active price books
        allPriceBooks.filter(pb => pb.isActive).forEach(priceBook => {
            const option = document.createElement('option');
            option.value = priceBook.id; // Use price book ID as value
            option.textContent = `${priceBook.name} (${priceBook.currency})`;
            opportunityPriceBookSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating price books for opportunity form:", error);
        showMessageBox("Error loading price books for opportunity dropdown.", 'alert', true);
    }
}


/**
 * Populates the opportunity currency dropdown with data from the 'currencies' collection.
 */
async function populateOpportunityCurrencies() {
    if (!opportunityCurrencySelect) {
        console.warn("populateOpportunityCurrencies: opportunityCurrencySelect element not found.");
        return;
    }
    opportunityCurrencySelect.innerHTML = '<option value="">Select Currency</option>'; // Clear existing options and add default
    try {
        const currenciesSnapshot = await getDocs(getCollectionRef('currencies'));
        currenciesSnapshot.forEach(doc => {
            const currency = doc.data();
            const option = document.createElement('option');
            option.value = currency.code; // Use currency code as value
            option.textContent = `${currency.name} (${currency.symbol})`;
            opportunityCurrencySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating currencies for opportunity form:", error);
        showMessageBox("Error loading currencies for opportunity dropdown.", 'alert', true);
    }
}

/**
 * Populates the opportunity services interested multi-select dropdown with predefined options.
 * This list should match the allowed services in Firestore security rules.
 */
function populateOpportunityServicesInterested() {
    if (!opportunityServicesInterestedSelect) {
        console.warn("populateOpportunityServicesInterested: opportunityServicesInterestedSelect element not found.");
        return;
    }

    // Clear existing options
    opportunityServicesInterestedSelect.innerHTML = '';

    // This list must match the one defined in your Firestore security rules for 'servicesInterested'
    const allowedServices = [
        'Save the Day', 'Pre-Wedding Photo Shoot', 'Wedding',
        'Post-Wedding Photo Shoot', 'Baby Shower', 'Corporate Event',
        'Product Launch', 'Political Meeting', 'Others'
    ];

    allowedServices.forEach(service => {
        const option = document.createElement('option');
        option.value = service;
        option.textContent = service;
        opportunityServicesInterestedSelect.appendChild(option);
    });
}

/**
 * Sets up the opportunity form for adding a new opportunity or editing an existing one.
 * It handles clearing the form, populating dropdowns, setting default values for new opportunities,
 * pre-populating fields for existing opportunities, and managing the visibility of accordions.
 * @param {object | null} opportunityData Optional: The opportunity data to pre-populate the form.
 */
async function setupOpportunityForm(opportunityData = null) {
    // 1. Show the form container and reset the form
    showForm(opportunityFormContainer);
    if (opportunityForm) opportunityForm.reset();
    if (document.getElementById('opportunity-id')) document.getElementById('opportunity-id').value = ''; // Clear ID for new

    // 2. Clear work logs section content initially
    if (opportunityWorkLogsContainer) opportunityWorkLogsContainer.innerHTML = '';
    // Also hide the work log form
    hideForm(opportunityWorkLogFormContainer);

    // 3. Populate all dropdowns
    await populateOpportunityCustomers();
    populateOpportunitySalesStages();
    populateOpportunityServicesInterested();
    await populateOpportunityCurrencies();
    await populateOpportunityPriceBooks();

    // 4. Handle existing opportunity data (edit mode)
    if (opportunityData) {
        console.log("setupOpportunityForm: Editing existing opportunity:", opportunityData);

        currentOpportunityId = opportunityData.id;
        if (document.getElementById('opportunity-id')) document.getElementById('opportunity-id').value = opportunityData.id;

        // Populate form fields
        if (document.getElementById('opportunity-name')) document.getElementById('opportunity-name').value = opportunityData.name || '';
        if (opportunityCustomerSelect) opportunityCustomerSelect.value = opportunityData.customerId || '';
        if (opportunityCurrencySelect) opportunityCurrencySelect.value = opportunityData.currency || '';
        if (opportunityPriceBookSelect) opportunityPriceBookSelect.value = opportunityData.priceBookId || '';

        const expectedStartDate = opportunityData.expectedStartDate ? new Date(opportunityData.expectedStartDate.seconds * 1000).toISOString().split('T')[0] : '';
        if (document.getElementById('opportunity-expected-start-date')) document.getElementById('opportunity-expected-start-date').value = expectedStartDate;

        const expectedCloseDate = opportunityData.expectedCloseDate ? new Date(opportunityData.expectedCloseDate.seconds * 1000).toISOString().split('T')[0] : '';
        if (document.getElementById('opportunity-expected-close-date')) document.getElementById('opportunity-expected-close-date').value = expectedCloseDate;

        if (opportunitySalesStageSelect) opportunitySalesStageSelect.value = opportunityData.salesStage || '';

        if (opportunityServicesInterestedSelect && opportunityData.servicesInterested && Array.isArray(opportunityData.servicesInterested)) {
            Array.from(opportunityServicesInterestedSelect.options).forEach(option => {
                option.selected = opportunityData.servicesInterested.includes(option.value);
            });
        }

        if (document.getElementById('opportunity-probability')) document.getElementById('opportunity-probability').value = opportunityData.probability !== undefined ? opportunityData.probability : 0;
        if (document.getElementById('opportunity-value')) document.getElementById('opportunity-value').value = opportunityData.value !== undefined ? opportunityData.value : 0;
        if (document.getElementById('opportunity-discount')) document.getElementById('opportunity-discount').value = opportunityData.opportunityDiscount !== undefined ? opportunityData.opportunityDiscount : 0;
        if (document.getElementById('opportunity-adjustment-amt')) document.getElementById('opportunity-adjustment-amt').value = opportunityData.adjustmentAmt !== undefined ? opportunityData.adjustmentAmt : 0;
        if (document.getElementById('opportunity-notes')) document.getElementById('opportunity-notes').value = opportunityData.notes || '';

        calculateOpportunityNet();

        // Layout adjustment for existing opportunities: Main Details takes 1 column, Work Logs visible
        if (mainOpportunityDetailsAccordion) mainOpportunityDetailsAccordion.classList.remove('md:col-span-full');
        if (opportunityWorkLogsSection) opportunityWorkLogsSection.classList.remove('hidden');
        if (opportunityWorkLogsContent) opportunityWorkLogsContent.classList.remove('hidden'); // Ensure content is also visible

        // Load and render work logs
        await renderWorkLogs(opportunityData.id);

        // Ensure Main Details accordion is open
        if (mainOpportunityDetailsContent) mainOpportunityDetailsContent.classList.remove('hidden');
        if (mainOpportunityDetailsAccordion) {
            const icon = mainOpportunityDetailsAccordion.querySelector('.accordion-icon');
            if (icon) icon.textContent = '▲';
        }

    } else { // Handle new opportunity (add mode)
        console.log("setupOpportunityForm: Setting up for new opportunity.");
        currentOpportunityId = null;

        // Set default values for new opportunities
        if (opportunitySalesStageSelect) opportunitySalesStageSelect.value = 'Prospect';
        if (document.getElementById('opportunity-probability')) document.getElementById('opportunity-probability').value = 0;
        if (document.getElementById('opportunity-value')) document.getElementById('opportunity-value').value = 0;
        if (document.getElementById('opportunity-discount')) document.getElementById('opportunity-discount').value = 0;
        if (document.getElementById('opportunity-adjustment-amt')) document.getElementById('opportunity-adjustment-amt').value = 0;
        calculateOpportunityNet();

        // Layout adjustment for new opportunities: Main Details takes full width, Work Logs hidden
        if (mainOpportunityDetailsAccordion) mainOpportunityDetailsAccordion.classList.add('md:col-span-full');
        if (opportunityWorkLogsSection) opportunityWorkLogsSection.classList.add('hidden');
        if (opportunityWorkLogsContent) opportunityWorkLogsContent.classList.add('hidden'); // Ensure content is hidden

        // Ensure Main Details accordion is open
        if (mainOpportunityDetailsContent) mainOpportunityDetailsContent.classList.remove('hidden');
        if (mainOpportunityDetailsAccordion) {
            const icon = mainOpportunityDetailsAccordion.querySelector('.accordion-icon');
            if (icon) icon.textContent = '▲';
        }
    }
}





/**
 * Handles saving a new opportunity or updating an existing one.
 * Performs client-side validation and interacts with Firestore.
 * @param {Event} event The form submission event.
 */
async function handleSaveOpportunity(event) {
    event.preventDefault(); // Prevent default form submission
    console.log('handleSaveOpportunity: Form submit event triggered.'); // Diagnostic log

    // Get the current authenticated user's UID
    const creatorId = auth.currentUser?.uid;

    if (!creatorId) {
        showMessageBox("Authentication required to save opportunity.", 'alert', true);
        console.error("Error saving opportunity: User not authenticated or UID not available.");
        return;
    }

    const opportunityId = document.getElementById('opportunity-id').value;
    const messageElement = document.getElementById('opportunity-form-message');
    if (messageElement) messageElement.classList.add('hidden'); // Hide previous messages

    // --- Start Client-Side Validation ---
    const requiredFields = opportunityForm.querySelectorAll('[required]');
    let firstInvalidField = null;

    for (const field of requiredFields) {
        if (!field.value || (field.type === 'select-multiple' && field.selectedOptions.length === 0)) {
            firstInvalidField = field;
            break;
        }
    }

    if (firstInvalidField) {
        console.warn('Validation failed: Required field is empty.', firstInvalidField);
        // Find the parent accordion of the invalid field and open it if hidden
        let parentAccordionContent = firstInvalidField.closest('.accordion-content');
        if (parentAccordionContent && parentAccordionContent.classList.contains('hidden')) {
            const parentAccordionHeader = parentAccordionContent.previousElementSibling;
            if (parentAccordionHeader) {
                console.log('Opening parent accordion:', parentAccordionHeader.textContent.trim());
                // Simulate a click on the header to toggle it open
                parentAccordionHeader.click();
            }
        }
        firstInvalidField.focus(); // Focus on the invalid field
        const fieldLabel = firstInvalidField.labels && firstInvalidField.labels.length > 0 ? firstInvalidField.labels[0].textContent.replace('*', '').trim() : firstInvalidField.id.replace(/-/g, ' ');
        showMessageBox(`Please fill in the required field: ${fieldLabel}.`, 'alert', true);
        return; // Stop form submission
    }
    // --- End Client-Side Validation ---

    // Get selected services from multi-select
    const selectedServices = opportunityServicesInterestedSelect ?
        Array.from(opportunityServicesInterestedSelect.selectedOptions).map(option => option.value) : [];

    const customerId = opportunityCustomerSelect ? opportunityCustomerSelect.value : '';
    let customerName = '';
    if (customerId) {
        try {
            // Fetch customer name from the top-level customer collection
            const customerSnap = await getDoc(getDocRef('customers', customerId));
            if (customerSnap.exists()) {
                customerName = customerSnap.data().name;
            }
        } catch (error) {
            console.error("Error fetching customer name for opportunity:", error);
            customerName = 'Unknown Customer'; // Fallback
        }
    }

    // Get date values and convert to Date objects (Firestore will convert to Timestamps)
    const expectedStartDateValue = document.getElementById('opportunity-expected-start-date').value;
    const expectedStartDateTimestamp = expectedStartDateValue ? new Date(expectedStartDateValue) : null;

    const expectedCloseDateValue = document.getElementById('opportunity-expected-close-date').value;
    const expectedCloseDateTimestamp = expectedCloseDateValue ? new Date(expectedCloseDateValue) : null;

    // Get numeric values, parse them, and default to 0 if invalid
    const probability = parseFloat(document.getElementById('opportunity-probability').value) || 0;

    // Use direct document.getElementById for getting values
    const opportunityValue = parseFloat(document.getElementById('opportunity-value').value) || 0;
    const opportunityDiscount = parseFloat(document.getElementById('opportunity-discount').value) || 0;
    const adjustmentAmt = parseFloat(document.getElementById('opportunity-adjustment-amt').value) || 0;

    // Calculate Opportunity Net based on the formula
    let opportunityNet = opportunityValue - (opportunityValue * (opportunityDiscount / 100));
    opportunityNet = opportunityNet - adjustmentAmt;
    opportunityNet = Math.max(0, opportunityNet); // Ensure it's not negative

    // Base data object for both add and update
    let data = {
        name: document.getElementById('opportunity-name').value || '',
        customerId: customerId,
        customerName: customerName,
        currency: opportunityCurrencySelect ? opportunityCurrencySelect.value : '',
        priceBookId: opportunityPriceBookSelect ? opportunityPriceBookSelect.value : '',
        expectedStartDate: expectedStartDateTimestamp,
        expectedCloseDate: expectedCloseDateTimestamp,
        salesStage: opportunitySalesStageSelect ? opportunitySalesStageSelect.value : '',
        probability: probability,
        value: opportunityValue,
        opportunityDiscount: opportunityDiscount,
        adjustmentAmt: adjustmentAmt,
        opportunityNet: opportunityNet,
        notes: document.getElementById('opportunity-notes').value || '',
        servicesInterested: selectedServices,
        creatorId: creatorId, // creatorId is always set for new and kept for updates
        updatedAt: serverTimestamp(),
    };

    try {
        if (opportunityId) { // Update existing opportunity
            console.log(`handleSaveOpportunity: Attempting to update opportunity with ID: ${opportunityId}`); // DEBUG LOG
            const existingDoc = await getDoc(getDocRef('opportunities', opportunityId));
            if (existingDoc.exists()) {
                const existingData = existingDoc.data();
                console.log("handleSaveOpportunity: Existing document data for update:", existingData); // DEBUG LOG

                // CRITICAL FOR RULES: Preserve original createdAt for updates
                data.createdAt = existingData.createdAt !== undefined ? existingData.createdAt : null;
                // Also, ensure existing normalized fields are preserved if your rules require them
                // (Assuming normalizedName/Currency are not part of Opportunity rules, but good to check)
                // If your rules for opportunities have similar immutability checks as priceBooks,
                // you would add: data.normalizedName = existingData.normalizedName; etc.

                console.log("handleSaveOpportunity: Data payload for update:", data); // DEBUG LOG: Inspect final payload
                await updateDoc(getDocRef('opportunities', opportunityId), data);
                showMessageBox("Opportunity updated successfully!", 'alert', false);
                console.log(`handleSaveOpportunity: Opportunity ${opportunityId} updated successfully.`); // SUCCESS LOG
                hideForm(opportunityFormContainer, opportunityFormMessage); // Hide form after update
            } else {
                showMessageBox("Error: Cannot update non-existent opportunity.", 'alert', true);
                return;
            }
        } else { // Create new opportunity
            console.log("handleSaveOpportunity: Attempting to add new opportunity."); // DEBUG LOG
            data.createdAt = serverTimestamp(); // Set createdAt for new document
            console.log("handleSaveOpportunity: Data payload for add:", data); // DEBUG LOG: Inspect final payload

            const docRef = await addDoc(getCollectionRef('opportunities'), data);
            const savedOpportunityId = docRef.id;

            showMessageBox("Opportunity added successfully! You can now add work logs.", 'alert', false);
            console.log(`handleSaveOpportunity: Opportunity ${savedOpportunityId} added successfully.`); // SUCCESS LOG

            // Re-setup the form with the new ID to allow adding work logs and quotes
            const newOpportunitySnap = await getDoc(getDocRef('opportunities', savedOpportunityId));
            if (newOpportunitySnap.exists()) {
                await setupOpportunityForm({ id: newOpportunitySnap.id, ...newOpportunitySnap.data() });
            } else {
                console.error("Could not retrieve newly created opportunity data for re-setup.");
                // Fallback: just set currentOpportunityId and ensure work logs section is visible
                currentOpportunityId = savedOpportunityId;
                if (opportunityWorkLogsSection) opportunityWorkLogsSection.classList.remove('hidden');
            }
        }

        // Reload the opportunities grid and update dashboard after any save operation
        await loadOpportunities();
        await updateDashboard();

    } catch (error) {
        console.error("handleSaveOpportunity: Error saving opportunity:", error); // Log the full error object
        if (error.code && error.message) {
            showMessageBox(`Error saving opportunity: ${error.message} (Code: ${error.code})`, 'alert', true);
        } else {
            showMessageBox(`Error saving opportunity: An unexpected error occurred.`, 'alert', true);
        }
    }
}




/**
 * Handles the editing of an existing opportunity.
 * Fetches the opportunity data and passes it to setupOpportunityForm.
 * @param {string} opportunityId The ID of the opportunity document to edit.
 */
async function handleEditOpportunity(opportunityId) {
    console.log(`handleEditOpportunity: Attempting to edit opportunity with ID: ${opportunityId}`); // This log will be key!

    try {
        const docSnap = await getDoc(getDocRef('opportunities', opportunityId));
        if (docSnap.exists()) {
            const opportunityData = { id: docSnap.id, ...docSnap.data() };
            await setupOpportunityForm(opportunityData); // Pass the data to setupOpportunityForm
        } else {
            showMessageBox("Opportunity not found.", 'alert', true);
            hideForm(opportunityFormContainer);
        }
    } catch (error) {
        console.error("Error editing opportunity:", error);
        showMessageBox(`Error loading opportunity data for edit: ${error.message}`, 'alert', true);
        hideForm(opportunityFormContainer);
    }
}


/**
 * Handles the deletion of an opportunity document from Firestore.
 * Prompts for confirmation and performs client-side role check.
 * @param {string} opportunityId The ID of the opportunity document to delete.
 */
async function handleDeleteOpportunity(opportunityId) {
    console.log(`handleDeleteOpportunity: Attempting to delete opportunity with ID: ${opportunityId}`); // DEBUG LOG

    if (!db || !auth.currentUser?.uid) {
        showMessageBox("Authentication required to delete opportunity.", 'alert', true);
        console.error("handleDeleteOpportunity: User not authenticated.");
        return;
    }

    if (!opportunityId) {
        showMessageBox("Error: No opportunity ID provided for deletion.", 'alert', true);
        console.error("handleDeleteOpportunity: opportunityId is null or empty.");
        return;
    }

    // Fetch the opportunity data to check creatorId for permission logic
    let opportunityData;
    try {
        const opportunityDocRef = doc(db, 'opportunities', opportunityId);
        const opportunitySnap = await getDoc(opportunityDocRef);

        if (opportunitySnap.exists()) {
            opportunityData = opportunitySnap.data();
            console.log("handleDeleteOpportunity: Fetched opportunity data for permission check:", opportunityData);
        } else {
            showMessageBox("Error: Opportunity not found for deletion.", 'alert', true);
            console.error(`handleDeleteOpportunity: Opportunity with ID ${opportunityId} not found.`);
            return;
        }
    } catch (error) {
        console.error("handleDeleteOpportunity: Error fetching opportunity for permission check:", error);
        showMessageBox(`Error checking opportunity permissions: ${error.message}`, 'alert', true);
        return;
    }

    // --- IMPORTANT: Client-side role/ownership check for deleting ---
    const isOwner = opportunityData.creatorId === auth.currentUser.uid;
    const isAdmin = currentUserRole === 'Admin';

    if (!isOwner && !isAdmin) {
        showMessageBox("Permission Denied: Only the creator or an 'Admin' can delete this opportunity.", 'alert', true);
        console.warn("Attempted to delete opportunity without sufficient privileges.");
        return;
    }
    // --- End Role/Ownership Check ---

    // Await the result from showMessageBox directly for user confirmation
    const confirmed = await showMessageBox("Are you sure you want to delete this opportunity? This action cannot be undone.", 'confirm');

    console.log(`handleDeleteOpportunity: Confirmed status from MessageBox: ${confirmed}`);

    if (confirmed) {
        console.log("handleDeleteOpportunity: User confirmed deletion. Proceeding with Firestore delete.");
        try {
            // Delete the main opportunity document
            const opportunityDocRef = doc(db, 'opportunities', opportunityId);
            await deleteDoc(opportunityDocRef);
            console.log(`handleDeleteOpportunity: Opportunity ${opportunityId} deleted successfully.`);

            // Optional: Delete its subcollections (like workLogs, quotes, quoteLines)
            // Firestore does NOT automatically delete subcollections when a parent document is deleted.
            // You would need to implement a Cloud Function for recursive deletion for production.
            // For client-side, you'd have to fetch and delete each subdocument, which can be slow for many docs.
            // For now, we'll just delete the main doc and rely on security rules to prevent access to orphaned subcollection data.
            // If you need full recursive deletion, let me know, and we can discuss Cloud Functions.

            showMessageBox("Opportunity deleted successfully!", 'alert', false);
            await loadOpportunities(); // Reload grid
            await updateDashboard(); // Update dashboard stats

        } catch (error) {
            console.error("handleDeleteOpportunity: Error deleting opportunity:", error);
            if (error.code && error.message) {
                showMessageBox(`Error deleting opportunity: ${error.message} (Code: ${error.code})`, 'alert', true);
            } else {
                showMessageBox(`Error deleting opportunity: An unexpected error occurred.`, 'alert', true);
            }
        }
    } else {
        console.log("handleDeleteOpportunity: Deletion cancelled by user.");
    }
}



/**
 * Loads opportunities from Firestore and renders them in the opportunities grid.
 * Sets up a real-time listener for updates.
 */
async function loadOpportunities() {
    if (!opportunitiesGridContainer || !noOpportunitiesMessage) {
        console.error("loadOpportunities: Required DOM elements for opportunities grid not found.");
        return;
    }

    // Stop previous listener if it exists
    if (unsubscribeOpportunities) {
        unsubscribeOpportunities();
        unsubscribeOpportunities = null;
        console.log("loadOpportunities: Unsubscribed from previous opportunities listener.");
    }

    // Hide "No opportunities" message initially
    noOpportunitiesMessage.classList.add('hidden');

    try {
        const opportunitiesCollectionRef = getCollectionRef('opportunities');
        // Order by createdAt descending for latest opportunities first
        const q = query(opportunitiesCollectionRef, orderBy('createdAt', 'desc'));

        console.log("loadOpportunities: Setting up real-time listener for opportunities."); // DEBUG LOG
        unsubscribeOpportunities = onSnapshot(q, async (querySnapshot) => {
            const opportunities = [];
            querySnapshot.forEach(doc => {
                const data = doc.data();
                opportunities.push({
                    id: doc.id, // Ensure ID is included for Grid.js actions
                    contactName: data.contactName || 'N/A', // Assuming contactName is desired
                    // Add other fields needed for the grid here
                    name: data.name || 'N/A',
                    customerName: data.customerName || 'N/A',
                    salesStage: data.salesStage || 'N/A',
                    value: data.value !== undefined ? data.value : 0,
                    opportunityNet: data.opportunityNet !== undefined ? data.opportunityNet : 0,
                    currency: data.currency || 'N/A',
                    expectedCloseDate: data.expectedCloseDate, // Keep as Timestamp for formatter
                    createdAt: data.createdAt // Keep as Timestamp for sorting/display
                });
            });

            console.log(`loadOpportunities: Fetched ${opportunities.length} opportunities for grid.`); // DEBUG LOG
            console.log("loadOpportunities: Opportunities data for grid:", opportunities); // DEBUG LOG: Inspect the data

            if (opportunities.length === 0) {
                noOpportunitiesMessage.classList.remove('hidden');
                opportunitiesGrid.updateConfig({ data: [] }).forceRender(); // Clear grid
            } else {
                noOpportunitiesMessage.classList.add('hidden');
                opportunitiesGrid.updateConfig({ data: opportunities }).forceRender();
            }
        }, (error) => {
            console.error("loadOpportunities: Error listening to opportunities:", error);
            showMessageBox(`Error loading opportunities: ${error.message}`, 'alert', true);
            noOpportunitiesMessage.classList.remove('hidden');
        });
    } catch (error) {
        console.error("loadOpportunities: Error setting up opportunities listener:", error);
        showMessageBox(`Error setting up opportunities listener: ${error.message}`, 'alert', true);
        noOpportunitiesMessage.classList.remove('hidden');
    }
}



function renderOpportunitiesGrid(opportunities) {
    const data = opportunities.map(opportunity => [
        opportunity.name,
        opportunity.customerName, // Display fetched customer name
        opportunity.servicesInterestedDisplay, // NEW: Column for services
        `${opportunity.currency} ${opportunity.value !== undefined ? opportunity.value.toFixed(2) : 'N/A'}`, // Handle undefined value
        `${opportunity.opportunityDiscount !== undefined ? opportunity.opportunityDiscount.toFixed(2) : 'N/A'}%`, // NEW: Discount
        `${opportunity.adjustmentAmt !== undefined ? opportunity.adjustmentAmt.toFixed(2) : 'N/A'}`, // NEW: Adjustment Amt
        `${opportunity.opportunityNet !== undefined ? opportunity.opportunityNet.toFixed(2) : 'N/A'}`, // NEW: Opportunity Net
        opportunity.salesStage,
        `${opportunity.probability !== undefined ? opportunity.probability : 'N/A'}%`, // Handle undefined probability
        opportunity.expectedCloseDate,
        opportunity.quoteCount, // Pass quote count to formatter
        opportunity.id // Pass ID as last for actions
    ]);

    if (!opportunitiesGrid) {
        if (opportunitiesGridContainer) {
            opportunitiesGrid = new gridjs.Grid({
                columns: [
                    { name: 'Opportunity Name', width: '10%' },
                    { name: 'Customer', width: '10%' },
                    { name: 'Services', width: '15%' },
                    { name: 'Value', width: '15%' },
                    { name: 'Discount', width: '10%' }, // NEW
                    { name: 'Adjustment', width: '10%' }, // NEW
                    { name: 'Net', width: '10%' }, // NEW
                    { name: 'Stage', width: '8%' },
                    { name: 'Probability', width: '10%' },
                    { name: 'Close Date', width: '10%' },
                    {
                        name: 'Quotes', // New column for quote count
                        width: '7%',
                        formatter: (quoteCount, row) => {
                            const opportunityId = row.cells[11].data; // ID is the last cell
                            const opportunityName = row.cells[0].data; // Name is the first cell
                            if (quoteCount > 0) {
                                return gridjs.h('button', {
                                    className: 'px-2 py-1 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition duration-300 text-xs font-bold',
                                    onclick: () => showQuotesForOpportunity(opportunityId, opportunityName),
                                    title: `View ${quoteCount} quote(s) for this opportunity`
                                }, quoteCount);
                            }
                            return ''; // No icon if no quotes
                        },
                        sort: false,
                    },
                    {
                        name: 'Actions',
                        width: '10%',
                        formatter: (cell, row) => {
                            const opportunityId = row.cells[11].data; // ID is the last cell
                            const salesStage = row.cells[7].data; // Sales Stage is the 8th cell (index 7)
                            const quoteCount = row.cells[10].data; // Quote Count is the 11th cell (index 10)

                            const isWon = salesStage === 'Won';
                            const hasQuotes = quoteCount >= 1;
                            const canEdit = !(isWon && hasQuotes); // Opportunity cannot be edited if Won AND has 1+ quotes

                            const editButtonClass = canEdit
                                ? 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm'
                                : 'px-2 py-1 bg-gray-400 text-gray-700 rounded-md cursor-not-allowed text-sm';
                            const editButtonTitle = canEdit
                                ? 'Edit Opportunity'
                                : 'Cannot edit: Won opportunity with associated quotes.';

                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: editButtonClass,
                                    onclick: canEdit ? () => editOpportunity(opportunityId) : null,
                                    disabled: !canEdit,
                                    title: editButtonTitle
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteOpportunity(opportunityId)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(opportunitiesGridContainer);
            console.log('Grid.js is now available for opportunities.');
        } else {
            console.error("opportunitiesGridContainer not found, cannot render opportunities grid.");
        }
    } else {
        opportunitiesGrid.updateConfig({ data: data }).forceRender();
    }

    if (noOpportunitiesMessage) {
        if (opportunities.length === 0) {
            noOpportunitiesMessage.classList.remove('hidden');
        } else {
            noOpportunitiesMessage.classList.add('hidden');
        }
    }
}

async function editOpportunity(opportunityId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, 'opportunities', opportunityId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const opportunityData = docSnap.data();
            const salesStage = opportunityData.salesStage;
            const quoteCount = opportunityQuoteCounts.get(opportunityId) || 0;

            // Prevent editing if Won and has 1 or more quotes
            if (salesStage === 'Won' && quoteCount >= 1) {
                showMessageBox("This opportunity cannot be edited because it is 'Won' and has associated quotes.", false);
                return; // Stop function execution
            }
            await setupOpportunityForm({ id: docSnap.id, ...opportunityData });
        } else {
            showMessageBox("Opportunity not found!", false);
        }
    }
    catch (error) {
        console.error("Error editing opportunity:", error);
        showMessageBox(`Error loading opportunity for edit: ${error.message}`, false);
    }
}

async function deleteOpportunity(opportunityId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this opportunity and all its work logs?", true);
    if (!confirmDelete) return;

    if (!db || !userId) return;
    try {
        // Delete associated work logs first (subcollection of top-level opportunity)
        const workLogsRef = collection(db, `opportunities/${opportunityId}/workLogs`);
        const workLogsQuery = query(workLogsRef); // No need for where('opportunityId') as it's a subcollection
        const workLogsSnapshot = await getDocs(workLogsQuery);
        const batch = writeBatch(db);
        workLogsSnapshot.forEach(docSnap => {
            batch.delete(docSnap.ref);
        });
        await batch.commit();

        // Then delete the opportunity (top-level)
        await deleteDoc(doc(db, 'opportunities', opportunityId));
        showMessageBox("Opportunity and associated work logs deleted successfully!", false);
        await loadOpportunities(); // Reload grid
        await updateDashboard();
    } catch (error) {
        console.error("Error deleting opportunity:", error);
        showMessageBox(`Error deleting opportunity: ${error.message}`, false);
    }
}

// --- Work Log Logic ---

async function loadWorkLogs(opportunityId) {
    if (!db || !userId || !opportunityId) {
        if (workLogsList) workLogsList.innerHTML = '';
        if (noWorkLogsMessage) noWorkLogsMessage.classList.remove('hidden');
        return;
    }

    // Query work logs as a subcollection of the specific opportunity (top-level opportunity)
    onSnapshot(query(collection(db, `opportunities/${opportunityId}/workLogs`),
        where('creatorId', '==', userId), // Work logs are also user-specific
        orderBy('date', 'desc')), // Order by date, newest first
        snapshot => {
            if (workLogsList) workLogsList.innerHTML = ''; // Clear existing logs
            if (noWorkLogsMessage) {
                if (snapshot.empty) {
                    noWorkLogsMessage.classList.remove('hidden');
                    return;
                }
                noWorkLogsMessage.classList.add('hidden');
            }
            snapshot.forEach(docSnap => {
                const log = docSnap.data();
                const logId = docSnap.id;
                // Convert Firestore Timestamp to YYYY-MM-DD string for display
                const logDateDisplay = log.date && log.date.toDate ? log.date.toDate().toISOString().split('T')[0] : 'N/A';

                const li = document.createElement('li');
                li.className = 'bg-gray-50 p-3 rounded-md shadow-sm border border-gray-200 flex justify-between items-center';
                li.innerHTML = `
                    <div>
                        <p class="text-sm font-semibold text-gray-700">${logDateDisplay} - ${log.type}</p>
                        <p class="text-gray-600 text-sm mt-1">${log.details}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button type="button" class="px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-xs"
                            onclick="editWorkLog('${logId}', '${opportunityId}')">Edit</button>
                        <button type="button" class="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-xs"
                            onclick="deleteWorkLog('${logId}', '${opportunityId}')">Delete</button>
                    </div>
                `;
                if (workLogsList) workLogsList.appendChild(li);
            });
        }, error => {
            console.error("Error loading work logs in real-time:", error);
            showMessageBox(`Error loading work logs: ${error.message}`, false);
            if (workLogsList) workLogsList.innerHTML = '';
            if (noWorkLogsMessage) noWorkLogsMessage.classList.remove('hidden');
        });
}

/**
 * Handles saving a new work log entry or updating an existing one within an opportunity.
 * This version handles the case where an existing document may have been deleted,
 * and falls back to creating a new one.
 * @param {Event} event The form submission event.
 */
async function handleSaveWorkLog(event) {
    event.preventDefault();
    console.log('handleSaveWorkLog: Form submit event triggered.');

    if (!db || !auth.currentUser?.uid) {
        showMessageBox("Authentication required to save work log.", 'alert', true);
        return;
    }

    if (!currentOpportunityId) {
        showMessageBox("Error: Cannot save work log. Parent opportunity ID is missing.", 'alert', true);
        console.error("handleSaveWorkLog: currentOpportunityId is null, cannot save work log.");
        return;
    }

    const workLogId = document.getElementById('work-log-id').value;
    const workLogOpportunityId = document.getElementById('work-log-opportunity-id').value;

    if (workLogOpportunityId !== currentOpportunityId) {
        console.warn("Work log's opportunity ID mismatch. Using currentOpportunityId.");
    }

    // Collect data directly from DOM elements
    const workLogDate = document.getElementById('work-log-date').value;
    const workLogType = workLogTypeSelect ? workLogTypeSelect.value : '';
    const workLogDetails = document.getElementById('work-log-details').value;

    // Client-side validation
    if (!workLogDate || !workLogType || !workLogDetails) {
        showMessageBox("Please fill in all required work log fields.", 'alert', true);
        return;
    }

    let data = {
        date: new Date(workLogDate),
        type: workLogType,
        details: workLogDetails,
        creatorId: auth.currentUser.uid,
        updatedAt: serverTimestamp(),
    };

    try {
        const workLogsCollectionRef = collection(db, 'opportunities', currentOpportunityId, 'workLogs');
        let shouldCreateNew = false;

        if (workLogId) { // Check if we should update an existing work log
            const existingDoc = await getDoc(doc(workLogsCollectionRef, workLogId));
            if (existingDoc.exists()) {
                // The document exists, so we can update it
                data.createdAt = existingDoc.data().createdAt !== undefined ? existingDoc.data().createdAt : null;
                await updateDoc(doc(workLogsCollectionRef, workLogId), data);
                showMessageBox("Work log entry updated successfully!", 'alert', false);
                console.log(`handleSaveWorkLog: Work log ${workLogId} updated successfully.`);
            } else {
                // The document does not exist, so we fall back to creating a new one.
                console.warn(`handleSaveWorkLog: Work log with ID ${workLogId} not found. Creating a new one instead.`);
                shouldCreateNew = true;
            }
        } else {
            // No ID was provided, so we should definitely create a new one
            shouldCreateNew = true;
        }

        if (shouldCreateNew) {
            data.createdAt = serverTimestamp();
            await addDoc(workLogsCollectionRef, data);
            showMessageBox("Work log entry added successfully!", 'alert', false);
            console.log("handleSaveWorkLog: New work log added.");
        }

        hideWorkLogForm();
        await renderWorkLogs(currentOpportunityId);

    } catch (error) {
        console.error("handleSaveWorkLog: Error saving work log:", error);
        showMessageBox(`Error saving work log: ${error.message}`, 'alert', true);
    }
}



async function editWorkLog(workLogId, opportunityId) { // Pass opportunityId to correctly build docRef
    if (!db || !userId || !opportunityId) return;
    try {
        // Work logs are a subcollection of top-level opportunities
        const docRef = doc(db, `opportunities/${opportunityId}/workLogs`, workLogId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const log = docSnap.data();
            await setupWorkLogForm(log); // Call setupWorkLogForm to pre-fill
            // Ensure the hidden ID and opportunity ID are correctly set after setupWorkLogForm
            document.getElementById('work-log-id').value = workLogId;
            document.getElementById('work-log-opportunity-id').value = opportunityId;
        } else {
            showMessageBox("Work log not found!", false);
        }
    } catch (error) {
        console.error("Error editing work log:", error);
        showMessageBox(`Error loading work log for edit: ${error.message}`, false);
    }
}

/**
 * Populates the work log type dropdown with predefined options.
 * This list should match the allowed types in Firestore security rules.
 */
function populateWorkLogTypes() {
    if (!workLogTypeSelect) {
        console.warn("populateWorkLogTypes: workLogTypeSelect element not found.");
        return;
    }
    workLogTypeSelect.innerHTML = '<option value="">Select Type</option>'; // Clear existing options and add default

    // This list must match the one defined in your Firestore security rules for work log types
    const allowedTypes = ['Call', 'Email', 'Meeting', 'Task', 'Site Visit', 'Follow-up', 'Other'];

    allowedTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        workLogTypeSelect.appendChild(option);
    });
}

/**
 * Renders the work logs for a given opportunity.
 * It fetches work logs from the 'workLogs' subcollection of the specified opportunity.
 * @param {string} opportunityId The ID of the opportunity whose work logs are to be rendered.
 */
async function renderWorkLogs(opportunityId) {
    console.log(`renderWorkLogs: Attempting to render work logs for Opportunity ID: ${opportunityId}`);

    if (!opportunityWorkLogsContainer || !noWorkLogsMessage) {
        console.error("renderWorkLogs: CRITICAL: Work log DOM elements are still null. Check initializePage() and HTML IDs.");
        return;
    }

    opportunityWorkLogsContainer.innerHTML = ''; // Clear existing work logs
    noWorkLogsMessage.classList.add('hidden'); // Hide "No work logs" message initially

    if (!opportunityId) {
        console.log("renderWorkLogs: No opportunity ID provided, hiding work logs section.");
        noWorkLogsMessage.classList.remove('hidden');
        return;
    }

    try {
        const workLogsCollectionRef = collection(db, 'opportunities', opportunityId, 'workLogs');
        const q = query(workLogsCollectionRef, orderBy('date', 'desc'));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noWorkLogsMessage.classList.remove('hidden');
            console.log(`renderWorkLogs: No work logs found for opportunity ${opportunityId}.`);
        } else {
            querySnapshot.forEach(doc => {
                const workLog = doc.data();
                const workLogId = doc.id;
                const date = workLog.date ? new Date(workLog.date.seconds * 1000).toLocaleDateString() : 'N/A';

                const li = document.createElement('li');
                li.className = 'bg-gray-100 p-3 rounded-md shadow-sm flex justify-between items-center';
                li.innerHTML = `
                    <div>
                        <p class="text-sm font-semibold text-gray-700">${date} - ${workLog.type}</p>
                        <p class="text-gray-600 text-sm">${workLog.details}</p>
                    </div>
                    <div>
                        <button class="text-blue-600 hover:text-blue-800 font-semibold mr-2" onclick="handleEditWorkLog('${workLogId}')">Edit</button>
                        <button class="text-red-600 hover:text-red-800 font-semibold" onclick="handleDeleteWorkLog('${workLogId}')">Delete</button>
                    </div>
                `;
                opportunityWorkLogsContainer.appendChild(li);
            });
            console.log(`renderWorkLogs: Successfully rendered ${querySnapshot.size} work logs for opportunity ${opportunityId}.`);
        }
    } catch (error) {
        console.error("renderWorkLogs: Error fetching work logs:", error);
        showMessageBox(`Error loading work logs: ${error.message}`, 'alert', true);
        noWorkLogsMessage.classList.remove('hidden');
    }
}



/**
 * Handles the editing of an existing work log entry.
 * Fetches the work log data from Firestore and populates the form.
 * @param {string} workLogId The ID of the work log document to edit.
 */
async function handleEditWorkLog(workLogId) {
    console.log(`handleEditWorkLog: Attempting to edit work log ID: ${workLogId}`); // DEBUG LOG

    // --- IMPORTANT: Client-side role check for editing ---
    if (currentUserRole !== 'Admin') {
        showMessageBox("Permission Denied: Only users with 'Admin' role can edit work logs.", 'alert', true);
        console.warn("Attempted to edit work log without Admin privileges.");
        return;
    }
    // --- End Role Check ---

    if (!currentOpportunityId) {
        showMessageBox("Error: Cannot edit work log. Parent opportunity ID is missing.", 'alert', true);
        console.error("handleEditWorkLog: currentOpportunityId is null.");
        return;
    }

    try {
        const workLogDocRef = doc(db, 'opportunities', currentOpportunityId, 'workLogs', workLogId);
        const workLogSnap = await getDoc(workLogDocRef);

        if (!workLogSnap.exists()) {
            showMessageBox("Error: Work log not found.", 'alert', true);
            console.error(`handleEditWorkLog: Work log with ID ${workLogId} not found.`);
            return;
        }

        const workLogData = workLogSnap.data();
        console.log("handleEditWorkLog: Fetched work log data:", workLogData); // DEBUG LOG

        showForm(opportunityWorkLogFormContainer); // Show the work log form
        if (opportunityWorkLogForm) opportunityWorkLogForm.reset();
        if (document.getElementById('work-log-id')) document.getElementById('work-log-id').value = workLogId;
        if (document.getElementById('work-log-opportunity-id')) document.getElementById('work-log-opportunity-id').value = currentOpportunityId;

        // Populate form fields
        if (document.getElementById('work-log-date')) {
            const date = workLogData.date ? new Date(workLogData.date.seconds * 1000).toISOString().split('T')[0] : '';
            document.getElementById('work-log-date').value = date;
        }

        populateWorkLogTypes(); // Ensure dropdown is populated before setting value
        if (workLogTypeSelect) workLogTypeSelect.value = workLogData.type || '';

        if (document.getElementById('work-log-details')) document.getElementById('work-log-details').value = workLogData.details || '';

        // Clear any previous messages on the work log form
        if (workLogFormMessage) workLogFormMessage.classList.add('hidden');

    } catch (error) {
        console.error("handleEditWorkLog: Error fetching work log for edit:", error);
        showMessageBox(`Error loading work log for edit: ${error.message}`, 'alert', true);
    }
}




/**
 * Handles the deletion of a work log document from Firestore.
 * Prompts for confirmation before proceeding with deletion.
 * @param {string} workLogId The ID of the work log document to delete.
 */
async function handleDeleteWorkLog(workLogId) {
    console.log(`handleDeleteWorkLog: Attempting to delete work log with ID: ${workLogId}`); // DEBUG LOG

    // --- IMPORTANT: Client-side role check for deleting ---
    if (currentUserRole !== 'Admin') {
        showMessageBox("Permission Denied: Only users with 'Admin' role can delete work logs.", 'alert', true);
        console.warn("Attempted to delete work log without Admin privileges.");
        return;
    }
    // --- End Role Check ---

    if (!currentOpportunityId) {
        showMessageBox("Error: Cannot delete work log. Parent opportunity ID is missing.", 'alert', true);
        console.error("handleDeleteWorkLog: currentOpportunityId is null.");
        return;
    }

    // Await the result from showMessageBox directly
    const confirmed = await showMessageBox("Are you sure you want to delete this work log entry? This action cannot be undone.", 'confirm');

    console.log(`handleDeleteWorkLog: Confirmed status from MessageBox: ${confirmed}`); // DEBUG LOG: Check confirmed value

    if (confirmed) {
        console.log("handleDeleteWorkLog: Confirmed is true, proceeding with deletion logic."); // DEBUG LOG: Confirm block entered
        try {
            // Reference to the work log document within the subcollection
            const workLogDocRef = doc(db, 'opportunities', currentOpportunityId, 'workLogs', workLogId);
            console.log(`handleDeleteWorkLog: Deleting document at path: ${workLogDocRef.path}`); // DEBUG LOG

            await deleteDoc(workLogDocRef);
            showMessageBox("Work log entry deleted successfully!", 'alert', false); // Use 'alert' type for success message
            console.log(`handleDeleteWorkLog: Work log ${workLogId} deleted successfully.`); // SUCCESS LOG

            // Re-render work logs to update the list
            await renderWorkLogs(currentOpportunityId);

        } catch (error) {
            console.error("handleDeleteWorkLog: Error deleting work log:", error); // Log the full error object
            if (error.code && error.message) {
                showMessageBox(`Error deleting work log: ${error.message}`, 'alert', true);
            } else {
                showMessageBox(`Error deleting work log: An unexpected error occurred.`, 'alert', true);
            }
        }
    } else {
        console.log("handleDeleteWorkLog: Deletion cancelled by user."); // DEBUG LOG: If user cancels
    }
}



// --- Admin Logic - Countries ---

async function setupCountryForm(country = null) {
    const countries = await fetchData('countries'); // Countries are top-level
    populateSelect(document.getElementById('country-country'), countries, 'name', 'name', 'Select Country');

    if (country) {
        document.getElementById('country-id').value = country.id;
        document.getElementById('country-name').value = country.name || '';
        document.getElementById('country-code').value = country.code || '';
        document.getElementById('country-states').value = Array.isArray(country.states) ? country.states.join(', ') : '';
    } else {
        if (countryForm) countryForm.reset();
        const countryIdInput = document.getElementById('country-id');
        if (countryIdInput) countryIdInput.value = '';
    }
    showCountryForm();
}


async function handleSaveCountry(event) {
    event.preventDefault();
    const countryId = document.getElementById('country-id').value;

    // --- IMPORTANT: Check user role before attempting to save ---
    if (currentUserRole !== 'Admin') {
        showMessageBox("Permission Denied: Only users with 'Admin' role can manage countries.", 'alert', true);
        console.warn("Attempted to save country without Admin privileges.");
        return;
    }
    // --- End Role Check ---

    // Collect data directly from DOM elements using their IDs
    const data = {
        name: document.getElementById('country-name').value || '',
        code: document.getElementById('country-code').value || '',
        // Split states by comma and trim whitespace for array storage
        states: document.getElementById('country-states').value.split(',').map(s => s.trim()).filter(s => s.length > 0),
        updatedAt: serverTimestamp(),
    };

    try {
        if (countryId) { // This is the update path
            // For update, ensure createdAt is preserved
            const existingDoc = await getDoc(getDocRef('countries', countryId));
            if (existingDoc.exists()) {
                // CORRECTED: Assign existing createdAt, or null if it's undefined/missing
                data.createdAt = existingDoc.data().createdAt !== undefined ? existingDoc.data().createdAt : null;
            } else {
                showMessageBox("Error: Cannot update non-existent country.", 'alert', true);
                return;
            }
            await updateDoc(getDocRef('countries', countryId), data);
            showMessageBox("Country updated successfully!", 'alert', false);
        } else { // This is the add path
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef('countries'), data);
            showMessageBox("Country added successfully!", 'alert', false);
        }
        hideForm(countryFormContainer, countryFormMessage);
    } catch (error) {
        console.error("Error saving country:", error);
        showMessageBox(`Error saving country: ${error.message}`, 'alert', true);
    }
}


/**
 * Handles the editing of an existing country.
 * Populates the country form with existing data and shows the form.
 * @param {string} countryId The ID of the country document to edit.
 */
async function handleEditCountry(countryId) {
    showForm(countryFormContainer); // Show the form container
    if (countryForm) countryForm.reset(); // Reset form fields
    if (document.getElementById('country-id')) document.getElementById('country-id').value = countryId; // Set hidden ID

    try {
        const docSnap = await getDoc(getDocRef('countries', countryId));
        if (docSnap.exists()) {
            const countryData = { id: docSnap.id, ...docSnap.data() };

            // Populate form fields
            if (document.getElementById('country-name')) document.getElementById('country-name').value = countryData.name || '';
            if (document.getElementById('country-code')) document.getElementById('country-code').value = countryData.code || '';
            if (document.getElementById('country-states')) document.getElementById('country-states').value = (countryData.states && Array.isArray(countryData.states)) ? countryData.states.join(', ') : '';

        } else {
            showMessageBox("Country not found.", 'alert', true);
            hideForm(countryFormContainer);
        }
    } catch (error) {
        console.error("Error editing country:", error);
        showMessageBox(`Error loading country data for edit: ${error.message}`, 'alert', true);
        hideForm(countryFormContainer);
    }
}

/**
 * Handles the deletion of a country document from Firestore.
 * Prompts for confirmation before proceeding with deletion.
 * @param {string} countryId The ID of the country document to delete.
 */
async function handleDeleteCountry(countryId) {
    console.log(`handleDeleteCountry: Attempting to delete country with ID: ${countryId}`); // DEBUG LOG

    // Await the result from showMessageBox directly
    const confirmed = await showMessageBox("Are you sure you want to delete this country? This action cannot be undone.", 'confirm');

    console.log(`handleDeleteCountry: Confirmed status from MessageBox: ${confirmed}`); // DEBUG LOG: Check confirmed value

    if (confirmed) {
        console.log("handleDeleteCountry: Confirmed is true, proceeding with deletion logic."); // DEBUG LOG: Confirm block entered
        try {
            // Get the document reference
            const countryDocRef = getDocRef('countries', countryId);
            console.log(`handleDeleteCountry: Deleting document at path: ${countryDocRef.path}`); // DEBUG LOG

            await deleteDoc(countryDocRef);
            showMessageBox("Country deleted successfully!", 'alert', false); // Use 'alert' type for success message
            console.log(`handleDeleteCountry: Country ${countryId} deleted successfully.`); // SUCCESS LOG
        } catch (error) {
            console.error("handleDeleteCountry: Error deleting country:", error); // Log the full error object
            if (error.code && error.message) {
                showMessageBox(`Error deleting country: ${error.message} (Code: ${error.code})`, 'alert', true);
            } else {
                showMessageBox(`Error deleting country: An unexpected error occurred.`, 'alert', true);
            }
        }
    } else {
        console.log("handleDeleteCountry: Deletion cancelled by user."); // DEBUG LOG: If user cancels
    }
}

async function loadCountries() {
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        if (noCountriesMessage) noCountriesMessage.classList.remove('hidden');
        if (countriesGrid) countriesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Countries are top-level public data, no creatorId filter needed
    onSnapshot(collection(db, 'countries'), snapshot => {
        const countries = [];
        snapshot.forEach(doc => {
            countries.push({ id: doc.id, ...doc.data() });
        });
        renderCountriesGrid(countries);
    }, error => {
        console.error("Error loading countries in real-time:", error);
        showMessageBox(`Error loading countries: ${error.message}`, false);
        if (noCountriesMessage) noCountriesMessage.classList.remove('hidden');
        if (countriesGrid) countriesGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderCountriesGrid(countries) {
    const data = countries.map(country => [
        country.name,
        country.code,
        country.states ? country.states.join(', ') : '',
        country.id
    ]);

    if (!countriesGrid) {
        if (countriesGridContainer) {
            countriesGrid = new gridjs.Grid({
                columns: [
                    { name: 'Country Name', width: '30%' },
                    { name: 'Code', width: '15%' },
                    { name: 'States/Provinces', width: '40%' },
                    {
                        name: 'Actions',
                        width: '15%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editCountry(row.cells[3].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteCountry(row.cells[3].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(countriesGridContainer);
        } else {
            console.error("countriesGridContainer not found, cannot render countries grid.");
        }
    } else {
        countriesGrid.updateConfig({ data: data }).forceRender();
    }

    if (noCountriesMessage) {
        if (countries.length === 0) {
            noCountriesMessage.classList.remove('hidden');
        } else {
            noCountriesMessage.classList.add('hidden');
        }
    }
}

async function editCountry(countryId) {
    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        const docRef = doc(db, 'countries', countryId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupCountryForm(docSnap.data());
        } else {
            showMessageBox("Country not found!", false);
        }
    } catch (error) {
        console.error("Error editing country:", error);
        showMessageBox(`Error loading country for edit: ${error.message}`, false);
    }
}

/**
 * Handles the editing of an existing currency.
 * Populates the currency form with existing data and shows the form.
 * @param {string} currencyId The ID of the currency document to edit.
 */
async function handleEditCurrency(currencyId) {
    showForm(currencyFormContainer); // Show the form container
    if (currencyForm) currencyForm.reset(); // Reset form fields
    if (document.getElementById('currency-id')) document.getElementById('currency-id').value = currencyId; // Set hidden ID

    try {
        const docSnap = await getDoc(getDocRef('currencies', currencyId));
        if (docSnap.exists()) {
            const currencyData = { id: docSnap.id, ...docSnap.data() };

            // Populate form fields
            if (document.getElementById('currency-name')) document.getElementById('currency-name').value = currencyData.name || '';
            if (document.getElementById('currency-code')) document.getElementById('currency-code').value = currencyData.code || '';
            if (document.getElementById('currency-symbol')) document.getElementById('currency-symbol').value = currencyData.symbol || '';

            // Populate countries dropdown before setting the value
            await populateCurrencyCountries(); // ADDED/CONFIRMED THIS LINE
            if (currencyCountrySelect) currencyCountrySelect.value = currencyData.countryCode || '';

        } else {
            showMessageBox("Currency not found.", 'alert', true);
            hideForm(currencyFormContainer);
        }
    } catch (error) {
        console.error("Error editing currency:", error);
        showMessageBox(`Error loading currency data for edit: ${error.message}`, 'alert', true);
        hideForm(currencyFormContainer);
    }
}

/**
 * Handles the deletion of a currency document from Firestore.
 * Prompts for confirmation before proceeding with deletion.
 * @param {string} currencyId The ID of the currency document to delete.
 */
async function handleDeleteCurrency(currencyId) {
    console.log(`handleDeleteCurrency: Attempting to delete currency with ID: ${currencyId}`); // DEBUG LOG

    // Await the result from showMessageBox directly
    const confirmed = await showMessageBox("Are you sure you want to delete this currency? This action cannot be undone.", 'confirm');

    console.log(`handleDeleteCurrency: Confirmed status from MessageBox: ${confirmed}`); // DEBUG LOG: Check confirmed value

    if (confirmed) {
        console.log("handleDeleteCurrency: Confirmed is true, proceeding with deletion logic."); // DEBUG LOG: Confirm block entered
        try {
            // Get the document reference
            const currencyDocRef = getDocRef('currencies', currencyId);
            console.log(`handleDeleteCurrency: Deleting document at path: ${currencyDocRef.path}`); // DEBUG LOG

            await deleteDoc(currencyDocRef);
            showMessageBox("Currency deleted successfully!", 'alert', false); // Use 'alert' type for success message
            console.log(`handleDeleteCurrency: Currency ${currencyId} deleted successfully.`); // SUCCESS LOG
        } catch (error) {
            console.error("handleDeleteCurrency: Error deleting currency:", error); // Log the full error object
            if (error.code && error.message) {
                showMessageBox(`Error deleting currency: ${error.message} (Code: ${error.code})`, 'alert', true);
            } else {
                showMessageBox(`Error deleting currency: An unexpected error occurred.`, 'alert', true);
            }
        }
    } else {
        console.log("handleDeleteCurrency: Deletion cancelled by user."); // DEBUG LOG: If user cancels
    }
}



async function deleteCountry(countryId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this country?", true);
    if (!confirmDelete) return;

    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        await deleteDoc(doc(db, 'countries', countryId)); // Top-level collection
        showMessageBox("Country deleted successfully!", false);
        await loadCountries();
    }
    catch (error) {
        console.error("Error deleting country:", error);
        showMessageBox(`Error deleting country: ${error.message}`, false);
    }
}

// --- Admin Logic - Currencies ---

/**
 * Populates the currency country dropdown with data from the 'countries' collection.
 */
async function populateCurrencyCountries() {
    if (!currencyCountrySelect) {
        console.warn("currencyCountrySelect element not found. Cannot populate countries for currency.");
        return;
    }
    currencyCountrySelect.innerHTML = '<option value="">Select Country</option>'; // Clear existing options and add default
    try {
        const countriesSnapshot = await getDocs(getCollectionRef('countries'));
        countriesSnapshot.forEach(doc => {
            const country = doc.data();
            const option = document.createElement('option');
            option.value = country.code; // Use country code as value for currency-country select
            option.textContent = country.name;
            currencyCountrySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating countries for currency form:", error);
        showMessageBox("Error loading countries for currency dropdown.", 'alert', true);
    }
}


async function setupCurrencyForm(currency = null) {
    const countries = await fetchData('countries'); // Countries are top-level
    populateSelect(document.getElementById('currency-country'), countries, 'code', 'name', 'Select Country (Optional)');

    if (currency) {
        document.getElementById('currency-id').value = currency.id;
        document.getElementById('currency-name').value = currency.name || '';
        document.getElementById('currency-code').value = currency.code || '';
        document.getElementById('currency-symbol').value = currency.symbol || '';
        document.getElementById('currency-country').value = currency.countryCode || ''; // Assuming countryCode is stored
    } else {
        if (currencyForm) currencyForm.reset();
        const currencyIdInput = document.getElementById('currency-id');
        if (currencyIdInput) currencyIdInput.value = '';
    }
    showCurrencyForm();
}


async function handleSaveCurrency(event) {
    event.preventDefault();
    const currencyId = document.getElementById('currency-id').value;

    // --- IMPORTANT: Check user role before attempting to save ---
    if (currentUserRole !== 'Admin') {
        showMessageBox("Permission Denied: Only users with 'Admin' role can manage currencies.", 'alert', true);
        console.warn("Attempted to save currency without Admin privileges.");
        return;
    }
    // --- End Role Check ---

    // Collect data directly from DOM elements using their IDs
    const data = {
        name: document.getElementById('currency-name').value || '',
        code: document.getElementById('currency-code').value || '',
        symbol: document.getElementById('currency-symbol').value || '',
        countryCode: currencyCountrySelect ? currencyCountrySelect.value : '', // Value from dropdown
        updatedAt: serverTimestamp(),
    };

    try {
        if (currencyId) { // This is the update path
            // For update, ensure createdAt is preserved
            const existingDoc = await getDoc(getDocRef('currencies', currencyId));
            if (existingDoc.exists()) {
                // Assign existing createdAt, or null if it's undefined/missing
                data.createdAt = existingDoc.data().createdAt !== undefined ? existingDoc.data().createdAt : null;
            } else {
                showMessageBox("Error: Cannot update non-existent currency.", 'alert', true);
                return;
            }
            await updateDoc(getDocRef('currencies', currencyId), data);
            showMessageBox("Currency updated successfully!", 'alert', false);
        } else { // This is the add path
            data.createdAt = serverTimestamp();
            await addDoc(getCollectionRef('currencies'), data);
            showMessageBox("Currency added successfully!", 'alert', false);
        }
        hideForm(currencyFormContainer, currencyFormMessage);
    } catch (error) {
        console.error("Error saving currency:", error);
        showMessageBox(`Error saving currency: ${error.message}`, 'alert', true);
    }
}


async function loadCurrencies() {
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        if (noCurrenciesMessage) noCurrenciesMessage.classList.remove('hidden');
        if (currenciesGrid) currenciesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Currencies are top-level public data, no creatorId filter needed
    onSnapshot(collection(db, 'currencies'), snapshot => {
        const currencies = [];
        snapshot.forEach(doc => {
            currencies.push({ id: doc.id, ...doc.data() });
        });
        renderCurrenciesGrid(currencies);
    }, error => {
        console.error("Error loading currencies in real-time:", error);
        showMessageBox(`Error loading currencies: ${error.message}`, false);
        if (noCurrenciesMessage) noCurrenciesMessage.classList.remove('hidden');
        if (currenciesGrid) currenciesGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderCurrenciesGrid(currencies) {
    const data = currencies.map(currency => [
        currency.name,
        currency.code,
        currency.symbol,
        currency.countryCode || 'N/A',
        currency.id
    ]);

    if (!currenciesGrid) {
        if (currenciesGridContainer) {
            currenciesGrid = new gridjs.Grid({
                columns: [
                    { name: 'Name', width: '25%' },
                    { name: 'Code', width: '15%' },
                    { name: 'Symbol', width: '15%' },
                    { name: 'Country', width: '30%' },
                    {
                        name: 'Actions',
                        width: '15%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editCurrency(row.cells[4].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteCurrency(row.cells[4].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(currenciesGridContainer);
        } else {
            console.error("currenciesGridContainer not found, cannot render currencies grid.");
        }
    } else {
        currenciesGrid.updateConfig({ data: data }).forceRender();
    }

    if (noCurrenciesMessage) {
        if (currencies.length === 0) {
            noCurrenciesMessage.classList.remove('hidden');
        } else {
            noCurrenciesMessage.classList.add('hidden');
        }
    }
}

async function editCurrency(currencyId) {
    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        const docRef = doc(db, 'currencies', currencyId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupCurrencyForm(docSnap.data());
        } else {
            showMessageBox("Currency not found!", false);
        }
    } catch (error) {
        console.error("Error editing currency:", error);
        showMessageBox(`Error loading currency for edit: ${error.message}`, false);
    }
}

async function deleteCurrency(currencyId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this currency?", true);
    if (!confirmDelete) return;

    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        await deleteDoc(doc(db, 'currencies', currencyId)); // Top-level collection
        showMessageBox("Currency deleted successfully!", false);
        await loadCurrencies();
    }
    catch (error) {
        console.error("Error deleting currency:", error);
        showMessageBox(`Error deleting currency: ${error.message}`, false);
    }
}

// --- Admin Logic - Price Books ---

/**
 * Populates the price book currency dropdown with data from the 'currencies' collection.
 */
async function populatePriceBookCurrencies() {
    if (!priceBookCurrencySelect) {
        console.warn("priceBookCurrencySelect element not found. Cannot populate currencies for price book.");
        return;
    }
    priceBookCurrencySelect.innerHTML = '<option value="">Select Currency</option>'; // Clear existing options and add default
    try {
        const currenciesSnapshot = await getDocs(getCollectionRef('currencies'));
        currenciesSnapshot.forEach(doc => {
            const currency = doc.data();
            const option = document.createElement('option');
            option.value = currency.code; // Use currency code as value
            option.textContent = `${currency.name} (${currency.symbol})`;
            priceBookCurrencySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating currencies for price book form:", error);
        showMessageBox("Error loading currencies for price book dropdown.", 'alert', true);
    }
}


async function setupPriceBookForm(priceBook = null) {
    const currencies = await fetchData('currencies'); // Currencies are top-level
    populateSelect(document.getElementById('price-book-currency'), currencies, 'code', 'code', 'Select Currency'); // Changed to 'code' for display as well

    if (priceBook) {
        document.getElementById('price-book-id').value = priceBook.id;
        document.getElementById('price-book-name').value = priceBook.name || '';
        document.getElementById('price-book-description').value = priceBook.description || '';
        document.getElementById('price-book-currency').value = priceBook.currency || '';
        document.getElementById('price-book-active').checked = priceBook.isActive !== undefined ? priceBook.isActive : true; // Use isActive
    } else {
        if (priceBookForm) priceBookForm.reset();
        const priceBookIdInput = document.getElementById('price-book-id');
        if (priceBookIdInput) priceBookIdInput.value = '';
        const priceBookActiveCheckbox = document.getElementById('price-book-active');
        if (priceBookActiveCheckbox) priceBookActiveCheckbox.checked = true; // Default to active for new price books
    }
    showPriceBookForm();
}


async function handleSavePriceBook(event) {
    event.preventDefault();
    const priceBookId = document.getElementById('price-book-id').value;

    // --- IMPORTANT: Check user role before attempting to save ---
    if (currentUserRole !== 'Admin') {
        showMessageBox("Permission Denied: Only users with 'Admin' role can manage price books.", 'alert', true);
        console.warn("Attempted to save price book without Admin privileges.");
        return;
    }
    // --- End Role Check ---

    // Collect data directly from DOM elements using their IDs
    const name = document.getElementById('price-book-name').value || '';
    const currency = priceBookCurrencySelect ? priceBookCurrencySelect.value : '';
    const description = document.getElementById('price-book-description').value || '';
    const isActive = priceBookActiveCheckbox ? priceBookActiveCheckbox.checked : false;

    let data = { // Use let as we'll modify it
        name: name,
        description: description,
        currency: currency,
        isActive: isActive,
        // updatedAt will be added below, after checking for existing doc
    };

    try {
        if (priceBookId) { // This is the update path
            console.log(`handleSavePriceBook: Attempting to update price book with ID: ${priceBookId}`); // DEBUG LOG
            const existingDoc = await getDoc(getDocRef('priceBooks', priceBookId));
            if (existingDoc.exists()) {
                const existingData = existingDoc.data();
                console.log("handleSavePriceBook: Existing document data:", existingData); // DEBUG LOG

                // CRITICAL FIX: Ensure normalizedName, normalizedCurrency, and createdAt
                // are explicitly copied from existing data, handling 'undefined' for createdAt.
                data.normalizedName = existingData.normalizedName;
                data.normalizedCurrency = existingData.normalizedCurrency;
                data.createdAt = existingData.createdAt !== undefined ? existingData.createdAt : null;
                data.updatedAt = serverTimestamp(); // Set updatedAt for the update operation

                console.log("handleSavePriceBook: Data payload for update:", data); // DEBUG LOG: Inspect final payload
                await updateDoc(getDocRef('priceBooks', priceBookId), data);
                showMessageBox("Price Book updated successfully!", 'alert', false);
                console.log(`handleSavePriceBook: Price Book ${priceBookId} updated successfully.`); // SUCCESS LOG
            } else {
                showMessageBox("Error: Cannot update non-existent price book.", 'alert', true);
                return;
            }
        } else { // This is the add path (new price book)
            console.log("handleSavePriceBook: Attempting to add new price book."); // DEBUG LOG
            // For new documents, calculate normalized values
            data.normalizedName = name.toLowerCase().replace(/\s/g, '');
            data.normalizedCurrency = currency.toLowerCase().replace(/\s/g, '');
            data.createdAt = serverTimestamp();
            data.updatedAt = serverTimestamp(); // Set updatedAt for new document
            console.log("handleSavePriceBook: Data payload for add:", data); // DEBUG LOG: Inspect final payload
            await addDoc(getCollectionRef('priceBooks'), data);
            showMessageBox("Price Book added successfully!", 'alert', false);
            console.log(`handleSavePriceBook: Price Book added successfully.`); // SUCCESS LOG
        }
        hideForm(priceBookFormContainer, priceBookFormMessage);
    } catch (error) {
        console.error("handleSavePriceBook: Error saving price book:", error); // Log the full error object
        if (error.code && error.message) {
            showMessageBox(`Error saving price book: ${error.message} (Code: ${error.code})`, 'alert', true);
        } else {
            showMessageBox(`Error saving price book: An unexpected error occurred.`, 'alert', true);
        }
    }
}




async function loadPriceBooks() {
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        if (noPriceBooksMessage) noPriceBooksMessage.classList.remove('hidden');
        if (priceBooksGrid) priceBooksGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Price books are top-level public data, no creatorId filter needed
    onSnapshot(collection(db, 'priceBooks'), snapshot => {
        const priceBooks = [];
        snapshot.forEach(doc => {
            priceBooks.push({ id: doc.id, ...doc.data() });
        });
        renderPriceBooksGrid(priceBooks);
    }, error => {
        console.error("Error loading price books in real-time:", error);
        showMessageBox(`Error loading price books: ${error.message}`, false);
        if (noPriceBooksMessage) noPriceBooksMessage.classList.remove('hidden');
        if (priceBooksGrid) priceBooksGrid.updateConfig({ data: [] }).forceRender();
    });
}

function renderPriceBooksGrid(priceBooks) {
    const data = priceBooks.map(priceBook => [
        priceBook.name,
        priceBook.description,
        priceBook.currency,
        priceBook.isActive ? 'Yes' : 'No', // Use isActive
        priceBook.id
    ]);

    if (!priceBooksGrid) {
        if (priceBooksGridContainer) {
            priceBooksGrid = new gridjs.Grid({
                columns: [
                    { name: 'Name', width: '25%' },
                    { name: 'Description', width: '35%' },
                    { name: 'Currency', width: '15%' },
                    { name: 'Active', width: '10%' },
                    {
                        name: 'Actions',
                        width: '15%',
                        formatter: (cell, row) => {
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editPriceBook(row.cells[4].data)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deletePriceBook(row.cells[4].data)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900',
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(priceBooksGridContainer);
        } else {
            console.error("priceBooksGridContainer not found, cannot render price books grid.");
        }
    } else {
        priceBooksGrid.updateConfig({ data: data }).forceRender();
    }

    if (noPriceBooksMessage) {
        if (priceBooks.length === 0) {
            noPriceBooksMessage.classList.remove('hidden');
        } else {
            noPriceBooksMessage.classList.add('hidden');
        }
    }
}

async function editPriceBook(priceBookId) {
    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        const docRef = doc(db, 'priceBooks', priceBookId); // Top-level collection
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupPriceBookForm(docSnap.data());
        } else {
            showMessageBox("Price Book not found!", false);
        }
    } catch (error) {
        console.error("Error editing price book:", error);
        showMessageBox(`Error loading price book for edit: ${error.message}`, false);
    }
}

/**
 * Handles the editing of an existing price book.
 * Populates the price book form with existing data and shows the form.
 * @param {string} priceBookId The ID of the price book document to edit.
 */
async function handleEditPriceBook(priceBookId) {
    showForm(priceBookFormContainer); // Show the form container
    if (priceBookForm) priceBookForm.reset(); // Reset form fields
    if (document.getElementById('price-book-id')) document.getElementById('price-book-id').value = priceBookId; // Set hidden ID

    try {
        const docSnap = await getDoc(getDocRef('priceBooks', priceBookId));
        if (docSnap.exists()) {
            const priceBookData = { id: docSnap.id, ...docSnap.data() };

            // Populate form fields
            if (document.getElementById('price-book-name')) document.getElementById('price-book-name').value = priceBookData.name || '';
            if (document.getElementById('price-book-description')) document.getElementById('price-book-description').value = priceBookData.description || '';
            if (priceBookActiveCheckbox) priceBookActiveCheckbox.checked = priceBookData.isActive || false;

            // Populate currencies dropdown before setting the value
            await populatePriceBookCurrencies();
            if (priceBookCurrencySelect) priceBookCurrencySelect.value = priceBookData.currency || '';

        } else {
            showMessageBox("Price Book not found.", 'alert', true);
            hideForm(priceBookFormContainer);
        }
    } catch (error) {
        console.error("Error editing price book:", error);
        showMessageBox(`Error loading price book data for edit: ${error.message}`, 'alert', true);
        hideForm(priceBookFormContainer);
    }
}


/**
 * Handles the deletion of a price book document from Firestore.
 * Prompts for confirmation before proceeding with deletion.
 * @param {string} priceBookId The ID of the price book document to delete.
 */
async function handleDeletePriceBook(priceBookId) {
    console.log(`handleDeletePriceBook: Attempting to delete price book with ID: ${priceBookId}`); // DEBUG LOG

    // Await the result from showMessageBox directly
    const confirmed = await showMessageBox("Are you sure you want to delete this price book? This action cannot be undone.", 'confirm');

    console.log(`handleDeletePriceBook: Confirmed status from MessageBox: ${confirmed}`); // DEBUG LOG: Check confirmed value

    if (confirmed) {
        console.log("handleDeletePriceBook: Confirmed is true, proceeding with deletion logic."); // DEBUG LOG: Confirm block entered
        try {
            // Get the document reference
            const priceBookDocRef = getDocRef('priceBooks', priceBookId);
            console.log(`handleDeletePriceBook: Deleting document at path: ${priceBookDocRef.path}`); // DEBUG LOG

            await deleteDoc(priceBookDocRef);
            showMessageBox("Price Book deleted successfully!", 'alert', false); // Use 'alert' type for success message
            console.log(`handleDeletePriceBook: Price Book ${priceBookId} deleted successfully.`); // SUCCESS LOG
        } catch (error) {
            console.error("handleDeletePriceBook: Error deleting price book:", error); // Log the full error object
            if (error.code && error.message) {
                showMessageBox(`Error deleting price book: ${error.message} (Code: ${error.code})`, 'alert', true);
            } else {
                showMessageBox(`Error deleting price book: An unexpected error occurred.`, 'alert', true);
            }
        }
    } else {
        console.log("handleDeletePriceBook: Deletion cancelled by user."); // DEBUG LOG: If user cancels
    }
}


async function deletePriceBook(priceBookId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this price book?", true);
    if (!confirmDelete) return;

    if (!db || userRole !== 'Admin') return; // Check for 'Admin' role
    try {
        await deleteDoc(doc(db, 'priceBooks', priceBookId)); // Top-level collection
        showMessageBox("Price Book deleted successfully!", false);
        await loadPriceBooks();
    }
    catch (error) {
        console.error("Error deleting price book:", error);
        showMessageBox(`Error deleting price book: ${error.message}`, false);
    }
}

// --- Quote Logic ---

/**
 * Populates the 'Opportunity' dropdown in the Quote form with opportunities
 * that are in the 'Won' sales stage.
 */
async function populateQuoteOpportunities() {
    console.log("populateQuoteOpportunities: Populating quote opportunities dropdown.");

    if (!quoteOpportunitySelect) {
        console.error("populateQuoteOpportunities: quoteOpportunitySelect element not found.");
        return;
    }

    // Clear existing options and add a default "Select Opportunity" option
    quoteOpportunitySelect.innerHTML = '<option value="">Select Opportunity</option>';

    if (!db || !auth.currentUser?.uid) {
        console.warn("populateQuoteOpportunities: DB or user not authenticated, cannot fetch opportunities.");
        return;
    }

    try {
        const opportunitiesCollectionRef = getCollectionRef('opportunities');
        // Query for opportunities that are 'Won' and either owned by the current user or if user is Admin
        // Note: Client-side filtering is for UX. Security rules will enforce the actual access.
        let q;
        if (currentUserRole === 'Admin') {
            q = query(opportunitiesCollectionRef, where('salesStage', '==', 'Won'), orderBy('name'));
        } else {
            q = query(opportunitiesCollectionRef, where('salesStage', '==', 'Won'), where('creatorId', '==', auth.currentUser.uid), orderBy('name'));
        }

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            console.log("populateQuoteOpportunities: No 'Won' opportunities found.");
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No Won Opportunities Available';
            option.disabled = true;
            quoteOpportunitySelect.appendChild(option);
        } else {
            querySnapshot.forEach(doc => {
                const opportunity = doc.data();
                const option = document.createElement('option');
                option.value = doc.id; // Store opportunity ID as value
                option.textContent = `${opportunity.name} (${opportunity.customerName || 'N/A'})`;
                quoteOpportunitySelect.appendChild(option);
            });
            console.log(`populateQuoteOpportunities: Populated ${querySnapshot.size} opportunities.`);
        }
    } catch (error) {
        console.error("populateQuoteOpportunities: Error fetching opportunities:", error);
        showMessageBox(`Error loading opportunities for quotes: ${error.message}`, 'alert', true);
    }
}


/**
 * Populates the 'Status' dropdown in the Quote form with predefined options.
 */
function populateQuoteStatus() {
    console.log("populateQuoteStatus: Populating quote status dropdown.");

    if (!quoteStatusSelect) {
        console.error("populateQuoteStatus: quoteStatusSelect element not found.");
        return;
    }

    quoteStatusSelect.innerHTML = '<option value="">Select Status</option>'; // Clear existing options and add default

    // These statuses should align with your Firestore security rules for quotes
    const statuses = ['Draft', 'Review', 'Finalized'];

    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        quoteStatusSelect.appendChild(option);
    });
    console.log(`populateQuoteStatus: Populated ${statuses.length} statuses.`);
}


/**
 * Populates customer contact details (name, phone, email, address) in the Quote form
 * based on the selected Opportunity.
 */
async function populateCustomerDetailsForQuote() {
    console.log("populateCustomerDetailsForQuote: Attempting to populate customer details.");

    if (!quoteOpportunitySelect || !document.getElementById('quote-customer-contact-name') ||
        !document.getElementById('quote-phone') || !document.getElementById('quote-email') ||
        !document.getElementById('quote-customer-address')) {
        console.error("populateCustomerDetailsForQuote: Required DOM elements for customer details not found.");
        return;
    }

    const selectedOpportunityId = quoteOpportunitySelect.value;
    console.log("populateCustomerDetailsForQuote: Selected Opportunity ID:", selectedOpportunityId);

    // Clear previous customer details if no opportunity is selected
    if (!selectedOpportunityId) {
        document.getElementById('quote-customer-contact-name').value = '';
        document.getElementById('quote-phone').value = '';
        document.getElementById('quote-email').value = '';
        document.getElementById('quote-customer-address').value = '';
        console.log("populateCustomerDetailsForQuote: No opportunity selected, cleared customer details.");
        return;
    }

    if (!db) {
        console.warn("populateCustomerDetailsForQuote: Firestore DB not initialized.");
        return;
    }

    try {
        // 1. Fetch the selected Opportunity to get its customerId
        const opportunityDocRef = doc(db, 'opportunities', selectedOpportunityId);
        const opportunitySnap = await getDoc(opportunityDocRef);

        if (!opportunitySnap.exists()) {
            console.error("populateCustomerDetailsForQuote: Selected opportunity not found:", selectedOpportunityId);
            showMessageBox("Error: Selected opportunity not found.", 'alert', true);
            return;
        }

        const opportunityData = opportunitySnap.data();
        const customerId = opportunityData.customerId; // Get customerId from opportunity
        const customerNameFromOpportunity = opportunityData.customerName; // Get customerName from opportunity (for contact name)
        console.log("populateCustomerDetailsForQuote: Found customerId from opportunity:", customerId);

        if (!customerId) {
            console.warn("populateCustomerDetailsForQuote: No customerId found for selected opportunity.");
            showMessageBox("Warning: No customer associated with this opportunity.", 'alert', false);
            return;
        }

        // 2. Fetch the Customer details using the customerId
        const customerDocRef = doc(db, 'customers', customerId);
        const customerSnap = await getDoc(customerDocRef);

        if (!customerSnap.exists()) {
            console.error("populateCustomerDetailsForQuote: Customer not found for customerId:", customerId);
            showMessageBox("Error: Associated customer not found.", 'alert', true);
            return;
        }

        const customerData = customerSnap.data();
        console.log("populateCustomerDetailsForQuote: Fetched customer data:", customerData);

        // 3. Populate the Quote form fields
        document.getElementById('quote-customer-contact-name').value = customerNameFromOpportunity || customerData.name || ''; // Use customerName from opportunity if available, else customer name
        document.getElementById('quote-phone').value = customerData.phone || '';
        document.getElementById('quote-email').value = customerData.email || '';
        document.getElementById('quote-customer-address').value = customerData.address || '';

        console.log("populateCustomerDetailsForQuote: Customer details populated successfully.");

    } catch (error) {
        console.error("populateCustomerDetailsForQuote: Error fetching customer details:", error);
        showMessageBox(`Error populating customer details: ${error.message}`, 'alert', true);
    }
}



/**
 * Navigates to the Quotes section and filters the grid for a specific opportunity.
 * @param {string} opportunityId - The ID of the opportunity to filter by.
 * @param {string} opportunityName - The name of the opportunity to display in the filter message.
 */
function showQuotesForOpportunity(opportunityId, opportunityName) {
    currentQuotesFilterOpportunityId = opportunityId;
    currentQuotesFilterOpportunityName = opportunityName;
    showSection(quotesSection);
    loadQuotes(); // This will now load filtered quotes
}

/**
 * Clears the quote filter and reloads all quotes.
 */
function clearQuotesFilter() {
    currentQuotesFilterOpportunityId = null;
    currentQuotesFilterOpportunityName = '';
    loadQuotes(); // This will now load all quotes
}

/**
* Sets up the Quote form for adding a new quote or editing an existing one.
* @param {object | null} quoteData Optional: The quote data to pre-populate the form.
*/
async function setupQuoteForm(quoteData = null) {
    console.group("setupQuoteForm");
    console.log('setupQuoteForm called with quoteData:', quoteData);

    showForm(quoteFormContainer, quoteFormMessage);
    if (quoteForm) quoteForm.reset();
    if (document.getElementById('quote-id')) document.getElementById('quote-id').value = '';

    await populateQuoteOpportunities();
    populateQuoteStatus();

    document.getElementById('quote-customer-contact-name').value = '';
    document.getElementById('quote-phone').value = '';
    document.getElementById('quote-email').value = '';
    document.getElementById('quote-customer-address').value = '';

    // --- NEW: Reset fields for a new quote ---
    if (quoteAmountInput) quoteAmountInput.value = '0.00';
    if (quoteDiscountInput) {
        quoteDiscountInput.value = '0.00';
        quoteDiscountInput.setAttribute('disabled', 'true');
    }
    if (quoteAdjustmentInput) {
        quoteAdjustmentInput.value = '0.00';
        quoteAdjustmentInput.setAttribute('disabled', 'true');
    }
    if (quoteNetAmountInput) quoteNetAmountInput.value = '0.00';

    if (quoteFormMessage) quoteFormMessage.classList.add('hidden');

    // CRITICAL LAYOUT FIX: Always ensure the parent grid is 1 column for stacked layout
    if (quoteAccordionsGrid) {
        quoteAccordionsGrid.classList.remove('md:grid-cols-2');
        quoteAccordionsGrid.classList.add('md:grid-cols-1');
        console.log("setupQuoteForm: quoteAccordionsGrid forced to md:grid-cols-1 for stacked layout.");
    }

    if (quoteData) { // Edit mode
        console.log("setupQuoteForm: Entering EDIT mode for quote:", quoteData);
        currentQuoteId = quoteData.id;
        if (document.getElementById('quote-id')) document.getElementById('quote-id').value = quoteData.id;
        if (document.getElementById('quote-name')) document.getElementById('quote-name').value = quoteData.quoteName || '';
        if (document.getElementById('quote-event-name')) document.getElementById('quote-event-name').value = quoteData.eventName || '';

        if (quoteOpportunitySelect) {
            quoteOpportunitySelect.value = quoteData.opportunityId || '';
            if (quoteData.opportunityId) {
                await populateCustomerDetailsForQuote();
            }
        }
        
        // --- NEW: Populate discount and adjustment fields from Firestore
        if (quoteDiscountInput) quoteDiscountInput.value = quoteData.quoteDiscount !== undefined ? quoteData.quoteDiscount.toFixed(2) : '0.00';
        if (quoteAdjustmentInput) quoteAdjustmentInput.value = quoteData.quoteAdjustment !== undefined ? quoteData.quoteAdjustment.toFixed(2) : '0.00';
        // Note: We don't populate quoteAmount or quoteNetAmount directly here.
        // The updateAllQuoteTotalsAndUI function will handle that.

        if (quoteStatusSelect) quoteStatusSelect.value = quoteData.status || 'Draft';
        if (document.getElementById('quote-additional-details')) document.getElementById('quote-additional-details').value = quoteData.additionalDetails || '';

        const eventDate = quoteData.eventDate ? new Date(quoteData.eventDate.seconds * 1000).toISOString().split('T')[0] : '';
        if (document.getElementById('quote-event-date')) document.getElementById('quote-event-date').value = eventDate;

        if (mainQuoteDetailsAccordion) {
            const mainDetailsHeader = mainQuoteDetailsAccordion.querySelector('.accordion-header');
            if (mainDetailsHeader) {
                setAccordionVisualState(mainDetailsHeader, true);
            }
        }

        if (quoteLinesSectionContainer) {
            quoteLinesSectionContainer.classList.remove('hidden');
            const quoteLinesAccordionHeader = quoteLinesSectionContainer.querySelector('.accordion-header');
            if (quoteLinesAccordionHeader) {
                setAccordionVisualState(quoteLinesAccordionHeader, true);
            }
            if (quoteLineForm) {
                quoteLineForm.removeAttribute('novalidate');
            }
        }

        await renderQuoteLines(quoteData.id);

        // --- NEW ADDITION: Call the new, comprehensive function after rendering lines ---
        // This will fetch the sum, update all totals, and save them back to Firestore.
        await updateAllQuoteTotalsAndUI(quoteData.id);

        // --- NEW ADDITION: Add event listeners for manual changes ---
        if (quoteDiscountInput) {
            quoteDiscountInput.addEventListener('input', calculateQuoteNetAmount);
        }
        if (quoteAdjustmentInput) {
            quoteAdjustmentInput.addEventListener('input', calculateQuoteNetAmount);
        }

    } else { // For a new quote (ADD mode)
        console.log("setupQuoteForm: Entering ADD NEW mode.");
        currentQuoteId = null;

        if (quoteOpportunitySelect) quoteOpportunitySelect.value = '';
        await populateCustomerDetailsForQuote();

        if (quoteAmountInput) quoteAmountInput.value = '0.00';
        if (quoteLinesGrid) quoteLinesGrid.updateConfig({ data: [] }).forceRender(); // Clear quote lines grid
        if (noQuoteLinesMessage) noQuoteLinesMessage.classList.remove('hidden');
        if (quoteLinesGridContainer) quoteLinesGridContainer.classList.add('hidden'); // Hide quote lines grid container
        hideQuoteLineForm();

        if (mainQuoteDetailsAccordion) {
            const mainDetailsHeader = mainQuoteDetailsAccordion.querySelector('.accordion-header');
            if (mainDetailsHeader) {
                setAccordionVisualState(mainDetailsHeader, true);
            }
        }
        if (quoteLinesSectionContainer) {
            quoteLinesSectionContainer.classList.add('hidden');
        }
    }
    showForm(quoteFormContainer);
    console.log('Add/Edit Quote form setup complete. currentQuoteId:', currentQuoteId);
    console.groupEnd();
}



/**
 * Calculates the Final Net value for a Quote Line based on its inputs.
 */
function calculateQuoteLineNet() {
    // Ensure all necessary input elements are available
    if (!quoteLineUnitPriceInput || !quoteLineQuantityInput || !quoteLineDiscountInput || !quoteLineAdjustmentAmountInput || !quoteLineFinalNetSpan) {
        console.warn("calculateQuoteLineNet: One or more calculation elements not found for quote line. Skipping calculation.");
        return;
    }

    // Parse values, defaulting to 0 if empty or invalid
    const unitPrice = parseFloat(quoteLineUnitPriceInput.value) || 0;
    const quantity = parseFloat(quoteLineQuantityInput.value) || 0;
    const discount = parseFloat(quoteLineDiscountInput.value) || 0; // Percentage
    const adjustment = parseFloat(quoteLineAdjustmentAmountInput.value) || 0;

    // Perform the calculation
    const subtotal = unitPrice * quantity;
    const discountAmount = subtotal * (discount / 100);
    const finalNet = subtotal - discountAmount - adjustment;

    // Update the displayed final net value
    quoteLineFinalNetSpan.textContent = finalNet.toFixed(2);

    // CRITICAL: Call this to update the main quote's total amount
    updateMainQuoteAmount();
}
/**
 * Updates the total Quote Amount in the main Quote form
 * by summing the Final Net of all currently displayed quote line items.
 * This function should be called whenever quote lines are added, edited, or deleted.
 */
function updateMainQuoteAmount() {
    let totalAmount = 0;
    // Ensure the list of quote lines exists
    if (quoteLinesList) {
        // Query all list items that represent a quote line
        const quoteLineElements = quoteLinesList.querySelectorAll('li');
        quoteLineElements.forEach(li => {
            // Find the span that displays the final net for each line
            const finalNetSpan = li.querySelector('.quote-line-final-net-display');
            if (finalNetSpan) {
                // Use a more robust way to parse the number, removing the '$' if present
                const finalNetText = finalNetSpan.textContent.replace('$', '');
                totalAmount += parseFloat(finalNetText) || 0;
            }
        });
    }

    // Update the main quote amount input field if it exists
    if (quoteAmountInput) {
        quoteAmountInput.value = totalAmount.toFixed(2);
    }

    console.log(`updateMainQuoteAmount: Total quote amount updated to ${totalAmount.toFixed(2)}.`);
}

/**
 * Asynchronously fetches all quote lines for a given quote ID from Firestore,
 * calculates the total net amount, and updates the Quote Amount, Discount, and Net Amount fields
 * on the quote edit form.
 * @param {string} quoteId The ID of the parent quote.
 */
async function updateMainQuoteAmountFromFirestore(quoteId) {
    if (!quoteId) {
        console.error("updateMainQuoteAmountFromFirestore: No quoteId provided.");
        return;
    }

    try {
        const quoteLinesCollection = collection(db, 'quotes', quoteId, 'quoteLines');
        const q = query(quoteLinesCollection);
        const querySnapshot = await getDocs(q);

        let totalAmount = 0;
        querySnapshot.forEach(doc => {
            const quoteLine = doc.data();
            totalAmount += parseFloat(quoteLine.finalNet) || 0;
        });

        // Get all relevant DOM elements directly for robustness
        const quoteAmountInput = document.getElementById('quote-amount');
        const quoteDiscountInput = document.getElementById('quote-discount');
        const quoteAdjustmentInput = document.getElementById('quote-adjustment');
        const quoteNetAmountInput = document.getElementById('quote-net-amount');
        
        if (quoteAmountInput) {
            quoteAmountInput.value = totalAmount.toFixed(2);
        }

        // Now, perform the net amount calculation based on the new total amount
        const quoteDiscount = parseFloat(quoteDiscountInput.value) || 0;
        const quoteAdjustment = parseFloat(quoteAdjustmentInput.value) || 0;

        const discountAmount = (quoteDiscount / 100) * totalAmount;
        const netAmount = totalAmount - discountAmount - quoteAdjustment;

        if (quoteNetAmountInput) {
            quoteNetAmountInput.value = netAmount.toFixed(2);
        }

        console.log(`updateMainQuoteAmountFromFirestore: Total quote amount updated to ${totalAmount.toFixed(2)}.`);

    } catch (error) {
        console.error("Error updating main quote amount from Firestore:", error);
    }
}


// --- Quote Lines Logic (Quotes Subcollection) ---
async function loadQuoteLines(quoteId) {
    if (unsubscribeQuoteLines) {
        unsubscribeQuoteLines(); // Unsubscribe from previous listener
    }

    const quoteLinesCollectionRef = collection(getDocRef('quotes', quoteId), 'quoteLines');
    unsubscribeQuoteLines = onSnapshot(query(quoteLinesCollectionRef, orderBy('createdAt', 'asc')), (snapshot) => {
        const quoteLines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderQuoteLines(quoteLines);
        updateParentQuoteAmount(quoteLines); // Update parent quote amount whenever lines change
    }, (error) => {
        console.error("Error fetching quote lines:", error);
        showMessageBox("Error loading quote lines.");
    });
}


/**
 * Renders the quote lines for a given quote ID.
 * It fetches quote lines from the 'quoteLines' subcollection of the specified quote
 * and updates the UI in real-time.
 * @param {string} quoteId The ID of the parent quote whose lines are to be rendered.
 */
async function renderQuoteLines(quoteId) {
    console.group("renderQuoteLines");
    console.log(`renderQuoteLines: Attempting to render quote lines for Quote ID: ${quoteId}`);

    if (!quoteLinesGrid || !quoteLinesGridContainer || !noQuoteLinesMessage) {
        console.error("renderQuoteLines: Required DOM elements or quoteLinesGrid not found. Check initializePage() and HTML IDs.");
        console.groupEnd();
        return;
    }

    noQuoteLinesMessage.classList.add('hidden');
    quoteLinesGridContainer.classList.remove('hidden');

    if (!quoteId) {
        console.log("renderQuoteLines: No quote ID provided, clearing grid and displaying 'no quote lines' message.");
        quoteLinesGrid.updateConfig({ data: [] }).forceRender();
        noQuoteLinesMessage.classList.remove('hidden');
        quoteLinesGridContainer.classList.add('hidden');
        updateMainQuoteAmount();
        console.groupEnd();
        return;
    }

    if (unsubscribeQuoteLines) {
        unsubscribeQuoteLines();
        unsubscribeQuoteLines = null;
        console.log("renderQuoteLines: Unsubscribed from previous quote lines listener.");
    }

    try {
        const quoteLinesCollectionRef = collection(db, 'quotes', quoteId, 'quoteLines');
        const q = query(quoteLinesCollectionRef, orderBy('createdAt', 'asc'));

        console.log(`renderQuoteLines: Setting up real-time listener for quote lines under quote ${quoteId}.`);
        unsubscribeQuoteLines = onSnapshot(q, (querySnapshot) => {
            const quoteLinesData = [];
            let totalQuoteLinesAmount = 0;

            if (querySnapshot.empty) {
                noQuoteLinesMessage.classList.remove('hidden');
                quoteLinesGridContainer.classList.add('hidden');
                quoteLinesGrid.updateConfig({ data: [] }).forceRender();
                console.log(`renderQuoteLines: No quote lines found for quote ${quoteId}. Displaying message.`);
            } else {
                noQuoteLinesMessage.classList.add('hidden');
                quoteLinesGridContainer.classList.remove('hidden');

                querySnapshot.forEach(doc => {
                    const quoteLine = doc.data();
                    const quoteLineId = doc.id;

                    // CRITICAL DEBUG: Log the full quoteLine data object before pushing
                    console.log(`renderQuoteLines: Processing quote line ID: ${quoteLineId}, Data:`, quoteLine);

                    quoteLinesData.push({
                        id: quoteLineId,
                        services: quoteLine.services, // Check if this property exists and has data
                        serviceDescription: quoteLine.serviceDescription || '', // Check this too
                        unitPrice: quoteLine.unitPrice,
                        quantity: quoteLine.quantity,
                        discount: quoteLine.discount,
                        adjustmentAmount: quoteLine.adjustmentAmount,
                        finalNet: quoteLine.finalNet,
                        serviceStartDate: quoteLine.serviceStartDate,
                        serviceEndDate: quoteLine.serviceEndDate,
                    });
                    totalQuoteLinesAmount += quoteLine.finalNet || 0;
                });

                // CRITICAL DEBUG: Log the final array passed to the grid
                console.log("renderQuoteLines: Final quoteLinesData array being passed to grid:", quoteLinesData);

                quoteLinesGrid.updateConfig({ data: quoteLinesData }).forceRender();
                console.log(`renderQuoteLines: Successfully updated grid with ${quoteLinesData.length} quote lines for quote ${quoteId}.`);
            }
            updateMainQuoteAmount(totalQuoteLinesAmount);
        }, (error) => {
            console.error("renderQuoteLines: Error listening to quote lines:", error);
            showMessageBox(`Error loading quote lines: ${error.message}`, 'alert', true);
            noQuoteLinesMessage.classList.remove('hidden');
            quoteLinesGridContainer.classList.add('hidden');
            quoteLinesGrid.updateConfig({ data: [] }).forceRender();
        });
    } catch (error) {
        console.error("renderQuoteLines: Error setting up quote lines listener:", error);
        showMessageBox(`Error setting up quote lines listener: ${error.message}`, 'alert', true);
        noQuoteLinesMessage.classList.remove('hidden');
        quoteLinesGridContainer.classList.add('hidden');
        quoteLinesGrid.updateConfig({ data: [] }).forceRender();
    }
    console.groupEnd();
}


/**
 * Shows the quote line entry form, resets it, and populates it with data if editing.
 * It also manages the 'novalidate' attribute to control browser validation.
 * @param {string | null} quoteLineId Optional: The ID of the quote line to edit.
 * @param {object | null} quoteLineData Optional: The data of the quote line to pre-populate.
 */
function showQuoteLineForm(quoteLineId = null, quoteLineData = null) {
    console.group("showQuoteLineForm");
    console.log("Called with quoteLineId:", quoteLineId, "quoteLineData:", quoteLineData);

    if (quoteLineFormContainer) {
        quoteLineFormContainer.classList.remove('hidden');
    } else {
        console.error("showQuoteLineForm: quoteLineFormContainer is null. Cannot show form.");
        console.groupEnd();
        return;
    }

    if (quoteLineForm) {
        quoteLineForm.reset(); // Reset form fields
        quoteLineForm.removeAttribute('novalidate'); // CRITICAL: Enable validation when shown
        console.log("showQuoteLineForm: novalidate removed from quoteLineForm. Current state:", quoteLineForm.hasAttribute('novalidate'));
    } else {
        console.error("showQuoteLineForm: quoteLineForm is null. Cannot remove novalidate.");
        console.groupEnd();
        return;
    }

    // Set hidden IDs for the quote line and its parent quote
    if (document.getElementById('quote-line-id')) document.getElementById('quote-line-id').value = quoteLineId || '';
    if (document.getElementById('quote-line-parent-quote-id')) document.getElementById('quote-line-parent-quote-id').value = currentQuoteId || '';

    // Add event listeners for calculation inputs. These are safe to call multiple times.
    if (quoteLineUnitPriceInput) quoteLineUnitPriceInput.addEventListener('input', calculateQuoteLineFinalNet);
    if (quoteLineQuantityInput) quoteLineQuantityInput.addEventListener('input', calculateQuoteLineFinalNet);
    if (quoteLineDiscountInput) quoteLineDiscountInput.addEventListener('input', calculateQuoteLineFinalNet);
    if (quoteLineAdjustmentAmountInput) quoteLineAdjustmentAmountInput.addEventListener('input', calculateQuoteLineFinalNet);

    if (quoteLineData) {
        console.log("showQuoteLineForm: Populating form for editing.");
        // Populate form fields with existing data for editing
        if (quoteLineServicesInput) quoteLineServicesInput.value = quoteLineData.services || '';
        if (quoteLineDescriptionInput) quoteLineDescriptionInput.value = quoteLineData.serviceDescription || '';

        const startDate = quoteLineData.serviceStartDate ? new Date(quoteLineData.serviceStartDate.seconds * 1000).toISOString().split('T')[0] : '';
        if (quoteLineStartDateInput) quoteLineStartDateInput.value = startDate;

        const endDate = quoteLineData.serviceEndDate ? new Date(quoteLineData.serviceEndDate.seconds * 1000).toISOString().split('T')[0] : '';
        if (quoteLineEndDateInput) quoteLineEndDateInput.value = endDate;

        if (quoteLineUnitPriceInput) quoteLineUnitPriceInput.value = quoteLineData.unitPrice !== undefined ? quoteLineData.unitPrice : 0;
        if (quoteLineQuantityInput) quoteLineQuantityInput.value = quoteLineData.quantity !== undefined ? quoteLineData.quantity : 1;
        if (quoteLineDiscountInput) quoteLineDiscountInput.value = quoteLineData.discount !== undefined ? quoteLineData.discount : 0;
        if (quoteLineAdjustmentAmountInput) quoteLineAdjustmentAmountInput.value = quoteLineData.adjustmentAmount !== undefined ? quoteLineData.adjustmentAmount : 0;

        calculateQuoteLineFinalNet(); // Recalculate net for existing data after populating
    } else {
        console.log("showQuoteLineForm: Resetting form for new entry.");
        // Reset specific fields for a new entry (already done by form.reset() but good for clarity)
        if (quoteLineServicesInput) quoteLineServicesInput.value = '';
        if (quoteLineDescriptionInput) quoteLineDescriptionInput.value = '';
        if (quoteLineStartDateInput) quoteLineStartDateInput.value = '';
        if (quoteLineEndDateInput) quoteLineEndDateInput.value = '';
        if (quoteLineUnitPriceInput) quoteLineUnitPriceInput.value = 0;
        if (quoteLineQuantityInput) quoteLineQuantityInput.value = 1;
        if (quoteLineDiscountInput) quoteLineDiscountInput.value = 0;
        if (quoteLineAdjustmentAmountInput) quoteLineAdjustmentAmountInput.value = 0;
        calculateQuoteLineFinalNet(); // Set initial net to 0 for new entry
    }

    if (quoteLineFormMessage) {
        quoteLineFormMessage.classList.add('hidden'); // Ensure message is hidden
    }
    console.groupEnd();
}


/**
 * Hides the quote line entry form and applies novalidate to prevent browser validation.
 */
function hideQuoteLineForm() {
    console.group("hideQuoteLineForm");
    console.log("Called.");

    if (quoteLineFormContainer) {
        quoteLineFormContainer.classList.add('hidden');
    } else {
        console.error("hideQuoteLineForm: quoteLineFormContainer is null. Cannot hide form.");
        console.groupEnd();
        return;
    }

    if (quoteLineForm) {
        quoteLineForm.reset(); // Reset form fields when hiding
        quoteLineForm.setAttribute('novalidate', 'novalidate'); // CRITICAL: Add novalidate when hiding
        console.log("hideQuoteLineForm: novalidate applied to quoteLineForm. Current state:", quoteLineForm.hasAttribute('novalidate'));
    } else {
        console.error("hideQuoteLineForm: quoteLineForm is null. Cannot apply novalidate.");
        console.groupEnd();
        return;
    }
    if (quoteLineFormMessage) {
        quoteLineFormMessage.classList.add('hidden'); // Hide any messages
    }
    console.log("hideQuoteLineForm: Quote line form hidden.");
    console.groupEnd();
}





/**
 * Handles saving a new quote or updating an existing one.
 * @param {Event} event The form submission event.
 */
async function handleSaveQuote(event) {
    event.preventDefault();
    console.group("handleSaveQuote");
    console.log('Form submit event triggered.');

    if (!db || !auth.currentUser?.uid) {
        showMessageBox("Authentication required to save quote.", 'alert', true);
        console.groupEnd();
        return;
    }

    const quoteId = document.getElementById('quote-id').value;
    const creatorId = auth.currentUser.uid;

    const data = {
        quoteName: document.getElementById('quote-name').value || '',
        opportunityId: quoteOpportunitySelect ? quoteOpportunitySelect.value : '',
        customerContactName: document.getElementById('quote-customer-contact-name').value || '',
        phone: document.getElementById('quote-phone').value || '',
        email: document.getElementById('quote-email').value || '',
        customerAddress: document.getElementById('quote-customer-address').value || '',
        eventName: document.getElementById('quote-event-name').value || '',
        eventDate: document.getElementById('quote-event-date').value ? new Date(document.getElementById('quote-event-date').value) : null,
        additionalDetails: document.getElementById('quote-additional-details').value || '',
        quoteAmount: parseFloat(document.getElementById('quote-amount').value) || 0,

        // --- NEW: Add the new fields to the data object ---
        quoteDiscount: parseFloat(document.getElementById('quote-discount').value) || 0,
        quoteAdjustment: parseFloat(document.getElementById('quote-adjustment').value) || 0,
        quoteNetAmount: parseFloat(document.getElementById('quote-net-amount').value) || 0,

        status: quoteStatusSelect ? quoteStatusSelect.value : '',
        updatedAt: serverTimestamp(),
        creatorId: creatorId,
    };

    if (quoteLineForm) {
        console.log("handleSaveQuote: Before saving, quoteLineForm novalidate state:", quoteLineForm.hasAttribute('novalidate'));
    } else {
        console.error("handleSaveQuote: quoteLineForm is null before saving.");
    }

    try {
        if (quoteId) {
            const existingDoc = await getDoc(doc(db, 'quotes', quoteId));
            if (existingDoc.exists()) {
                data.createdAt = existingDoc.data().createdAt;
            } else {
                showMessageBox("Error: Cannot update non-existent quote.", 'alert', true);
                console.groupEnd();
                return;
            }
            await updateDoc(doc(db, 'quotes', quoteId), data);
            showMessageBox("Quote updated successfully! You can now add/edit quote lines.", 'alert', false);
            currentQuoteId = quoteId;
        } else {
            data.createdAt = serverTimestamp();
            const docRef = await addDoc(collection(db, 'quotes'), data);
            showMessageBox("Quote added successfully! You can now add quote lines.", 'alert', false);
            currentQuoteId = docRef.id;
            document.getElementById('quote-id').value = docRef.id;
        }

        if (mainQuoteDetailsAccordion) mainQuoteDetailsAccordion.classList.remove('md:col-span-full');
        if (quoteLinesSectionContainer) quoteLinesSectionContainer.classList.remove('hidden');

        if (mainQuoteDetailsContent) mainQuoteDetailsContent.classList.remove('hidden');
        if (mainQuoteDetailsAccordion) {
            const icon = mainQuoteDetailsAccordion.querySelector('.accordion-icon');
            if (icon) setAccordionVisualState(mainQuoteDetailsAccordion.querySelector('.accordion-header'), true);
        }
        if (quoteLinesContent) quoteLinesContent.classList.remove('hidden');
        if (quoteLinesSectionContainer) {
            const icon = quoteLinesSectionContainer.querySelector('.accordion-header');
            if (icon) setAccordionVisualState(quoteLinesSectionContainer.querySelector('.accordion-header'), true);
        }

        await renderQuoteLines(currentQuoteId);
        await loadQuotes();
        await updateDashboard();

    } catch (error) {
        console.error("handleSaveQuote: Error saving quote:", error);
        showMessageBox(`Error saving quote: ${error.message}`, 'alert', true);
    }
    console.groupEnd();
}


/**
 * Calculates the Final Net value for a Quote Line based on its inputs.
 * This function should be called whenever unit price, quantity, discount, or adjustment amount changes.
 */
function calculateQuoteLineFinalNet() { // Renamed from calculateQuoteLineNet for consistency
    // Ensure all necessary input elements are available
    if (!quoteLineUnitPriceInput || !quoteLineQuantityInput || !quoteLineDiscountInput || !quoteLineAdjustmentAmountInput || !quoteLineFinalNetSpan) {
        console.warn("calculateQuoteLineFinalNet: One or more calculation elements not found for quote line. Skipping calculation.");
        return;
    }

    // Parse values, defaulting to 0 if empty or invalid
    const unitPrice = parseFloat(quoteLineUnitPriceInput.value) || 0;
    const quantity = parseFloat(quoteLineQuantityInput.value) || 0;
    const discount = parseFloat(quoteLineDiscountInput.value) || 0; // Percentage
    const adjustment = parseFloat(quoteLineAdjustmentAmountInput.value) || 0;

    // Perform the calculation: (Unit Price * Quantity) - (Discount Percentage of Subtotal) - Adjustment Amount
    const subtotal = unitPrice * quantity;
    const discountAmount = subtotal * (discount / 100);
    const finalNet = subtotal - discountAmount - adjustment;

    // Update the displayed final net value
    quoteLineFinalNetSpan.textContent = finalNet.toFixed(2);

    // CRITICAL: Call this to update the main quote's total amount
    updateMainQuoteAmount();
}




/**
* Handles saving a new quote line or updating an existing one to Firestore.
* @param {Event} event The form submission event.
*/
async function handleSaveQuoteLine(event) {
    event.preventDefault();
    console.log('handleSaveQuoteLine: Form submit event triggered.');

    if (!db || !auth.currentUser?.uid) {
        showMessageBox("Authentication required to save quote line.", 'alert', true);
        return;
    }

    // Ensure there is a parent quote ID to associate the quote line with
    if (!currentQuoteId) {
        showMessageBox("Error: Cannot save quote line. Parent quote ID is missing. Please save the main quote first.", 'alert', true);
        console.error("handleSaveQuoteLine: currentQuoteId is null, cannot save quote line.");
        return;
    }

    const quoteLineId = document.getElementById('quote-line-id').value; // Get ID for update, empty for new

    // Collect data from form inputs
    const services = quoteLineServicesInput ? quoteLineServicesInput.value.trim() : '';
    const serviceDescription = quoteLineDescriptionInput ? quoteLineDescriptionInput.value.trim() : '';
    const serviceStartDate = quoteLineStartDateInput && quoteLineStartDateInput.value ? new Date(quoteLineStartDateInput.value) : null;
    const serviceEndDate = quoteLineEndDateInput && quoteLineEndDateInput.value ? new Date(quoteLineEndDateInput.value) : null;
    const unitPrice = parseFloat(quoteLineUnitPriceInput.value) || 0;
    const quantity = parseFloat(quoteLineQuantityInput.value) || 0;
    const discount = parseFloat(quoteLineDiscountInput.value) || 0;
    const adjustmentAmount = parseFloat(quoteLineAdjustmentAmountInput.value) || 0;
    
    // --- NEW: Calculate finalNet directly from input values ---
    const netAmount = unitPrice * quantity;
    const discountAmount = netAmount * (discount / 100);
    const finalNet = netAmount - discountAmount - adjustmentAmount;

    // Client-side validation
    if (!services || unitPrice === 0 || quantity === 0) {
        showMessageBox("Please fill in required fields (Services, Unit Price, Quantity) and ensure numerical values are not zero.", 'alert', true);
        return;
    }

    let data = {
        services,
        serviceDescription,
        serviceStartDate,
        serviceEndDate,
        unitPrice,
        quantity,
        discount,
        adjustmentAmount,
        finalNet, // Save the newly calculated final net
        creatorId: auth.currentUser.uid, // Associate with the current user
        updatedAt: serverTimestamp(), // Set last updated timestamp
    };

    try {
        // Reference to the 'quoteLines' subcollection of the current quote
        const quoteLinesCollectionRef = collection(db, 'quotes', currentQuoteId, 'quoteLines');

        if (quoteLineId) {
            // If quoteLineId exists, update an existing document
            const existingDoc = await getDoc(doc(quoteLinesCollectionRef, quoteLineId));
            if (existingDoc.exists()) {
                data.createdAt = existingDoc.data().createdAt; // Preserve original createdAt timestamp
            } else {
                showMessageBox("Error: Cannot update non-existent quote line.", 'alert', true);
                return;
            }
            await updateDoc(doc(quoteLinesCollectionRef, quoteLineId), data);
            showMessageBox("Quote line updated successfully!", 'alert', false);
        } else {
            // If no quoteLineId, add a new document
            data.createdAt = serverTimestamp(); // Set createdAt for new document
            await addDoc(quoteLinesCollectionRef, data);
            showMessageBox("Quote line added successfully!", 'alert', false);
        }

        hideQuoteLineForm(); // Hide the form after successful save
        
        // --- NEW: After saving the quote line, update the parent quote's totals in Firestore and the UI ---
        await updateAllQuoteTotalsAndUI(currentQuoteId);
        
        // After all updates are complete, re-render the quote lines list.
        await renderQuoteLines(currentQuoteId);

    } catch (error) {
        console.error("handleSaveQuoteLine: Error saving quote line:", error);
        showMessageBox(`Error saving quote line: ${error.message}`, 'alert', true);
    }
}



/**
 * Handles deleting an existing quote.
 * @param {string} quoteId The ID of the quote to delete.
 */
async function handleDeleteQuote(quoteId) {
    console.group("handleDeleteQuote");
    console.log(`Attempting to delete quote with ID: ${quoteId}`);

    if (!db || !auth.currentUser?.uid) {
        showMessageBox("Authentication required to delete quote.", 'alert', true);
        console.groupEnd();
        return;
    }

    if (!quoteId) {
        showMessageBox("Error: No quote ID provided for deletion.", 'alert', true);
        console.error("handleDeleteQuote: quoteId is null or empty.");
        console.groupEnd();
        return;
    }

    const confirmed = await showMessageBox("Are you sure you want to delete this quote and all its associated quote lines? This action cannot be undone.", 'confirm');
    console.log("handleDeleteQuote: Confirmation result:", confirmed);

    if (confirmed) {
        try {
            // 1. Delete all quote lines associated with this quote first
            const quoteLinesCollectionRef = collection(db, 'quotes', quoteId, 'quoteLines');
            const quoteLinesSnapshot = await getDocs(quoteLinesCollectionRef);
            const deleteQuoteLinePromises = [];

            if (!quoteLinesSnapshot.empty) {
                console.log(`handleDeleteQuote: Found ${quoteLinesSnapshot.size} quote lines to delete for quote ${quoteId}.`);
                quoteLinesSnapshot.forEach(doc => {
                    deleteQuoteLinePromises.push(deleteDoc(doc.ref));
                });
                await Promise.all(deleteQuoteLinePromises);
                console.log(`Successfully deleted all quote lines for quote ${quoteId}.`);
            } else {
                console.log(`handleDeleteQuote: No quote lines found for quote ${quoteId}.`);
            }

            // 2. Then delete the main quote itself
            await deleteDoc(getDocRef('quotes', quoteId));
            showMessageBox("Quote and associated quote lines deleted successfully!", 'alert', false);
            console.log(`Successfully deleted main quote document ${quoteId}.`);

            // 3. Reload data and update UI
            await loadQuotes(); // Reload main quotes grid
            await updateDashboard(); // Update dashboard stats
            hideForm(quoteFormContainer); // Hide the form if currently open for this quote

        } catch (error) {
            console.error("handleDeleteQuote: Error deleting quote or quote lines:", error);
            showMessageBox(`Error deleting quote: ${error.message}`, 'alert', true);
        }
    } else {
        console.log("handleDeleteQuote: Quote deletion cancelled by user.");
    }
    console.groupEnd();
}



// Function to update the parent quote's total amount based on its quote lines
async function updateParentQuoteAmount(currentQuoteLines = null) {
    if (!currentQuoteId) {
        console.warn("No current quote ID to update parent amount.");
        return;
    }

    let totalAmount = 0;
    if (currentQuoteLines) {
        // If quote lines are already provided (e.g., from onSnapshot callback)
        totalAmount = currentQuoteLines.reduce((sum, line) => sum + (line.finalNet || 0), 0);
    } else {
        // Otherwise, fetch them
        try {
            const quoteLinesSnapshot = await getDocs(collection(getDocRef('quotes', currentQuoteId), 'quoteLines'));
            totalAmount = quoteLinesSnapshot.docs.reduce((sum, doc) => sum + (doc.data().finalNet || 0), 0);
        } catch (error) {
            console.error("Error calculating total quote amount from lines:", error);
            showMessageBox("Error calculating total quote amount.");
            return;
        }
    }

    try {
        await updateDoc(getDocRef('quotes', currentQuoteId), { quoteAmount: totalAmount });
        if (document.getElementById('quote-amount')) { // Null check
            document.getElementById('quote-amount').value = totalAmount.toFixed(2); // Update the displayed amount
        }
        console.log(`Parent quote ${currentQuoteId} amount updated to: ${totalAmount.toFixed(2)}`);
    } catch (error) {
        console.error("Error updating parent quote amount:", error);
        showMessageBox(`Error updating parent quote amount: ${error.message}`);
    }
}



/**
 * Handles the change event on the Opportunity dropdown in the Quote form.
 * Auto-fills customer contact details based on the selected opportunity's customer.
 */
async function handleOpportunityChangeForQuote() {
    const selectedOpportunityId = quoteOpportunitySelect.value;
    console.log('handleOpportunityChangeForQuote: Selected Opportunity ID:', selectedOpportunityId);

    // Clear fields immediately when selection changes or is empty
    // Add null checks before attempting to set values
    if (customerContactNameInput) customerContactNameInput.value = '';
    if (customerPhoneInput) customerPhoneInput.value = '';
    if (customerEmailInput) customerEmailInput.value = '';
    if (customerAddressInput) customerAddressInput.value = '';

    if (!selectedOpportunityId) {
        console.log('handleOpportunityChangeForQuote: No opportunity selected, clearing customer fields.');
        return;
    }

    try {
        const opportunityDoc = await getDoc(doc(db, 'opportunities', selectedOpportunityId));
        if (opportunityDoc.exists()) {
            const opportunityData = opportunityDoc.data();
            const customerId = opportunityData.customerId;
            console.log('handleOpportunityChangeForQuote: Found Opportunity Data:', opportunityData);
            console.log('handleOpportunityChangeForQuote: Customer ID from Opportunity:', customerId);


            if (customerId) {
                const customerDoc = await getDoc(doc(db, 'customers', customerId));
                if (customerDoc.exists()) {
                    const customerData = customerDoc.data();
                    console.log('handleOpportunityChangeForQuote: Found Customer Data:', customerData);

                    // Assign values to the input fields
                    // Add null checks before attempting to set values
                    if (customerContactNameInput) customerContactNameInput.value = customerData.name || '';
                    if (customerPhoneInput) customerPhoneInput.value = customerData.phone || '';
                    if (customerEmailInput) customerEmailInput.value = customerData.email || '';
                    if (customerAddressInput) customerAddressInput.value = customerData.address || '';

                    console.log('handleOpportunityChangeForQuote: Populated fields:');
                    console.log('  Name:', customerContactNameInput ? customerContactNameInput.value : 'N/A (null element)');
                    console.log('  Phone:', customerPhoneInput ? customerPhoneInput.value : 'N/A (null element)');
                    console.log('  Email:', customerEmailInput ? customerEmailInput.value : 'N/A (null element)');
                    console.log('  Address:', customerAddressInput ? customerAddressInput.value : 'N/A (null element)');

                } else {
                    console.warn("handleOpportunityChangeForQuote: Customer not found for selected opportunity:", customerId);
                    showMessageBox("Customer details not found for the selected opportunity. Please ensure the customer exists.", false);
                }
            } else {
                console.warn("handleOpportunityChangeForQuote: Selected opportunity has no customerId.");
                showMessageBox("The selected opportunity is not linked to a customer.", false);
            }
        } else {
            console.warn("handleOpportunityChangeForQuote: Selected opportunity does not exist:", selectedOpportunityId);
            showMessageBox("Selected opportunity does not exist.", false);
        }
    } catch (error) {
        console.error("handleOpportunityChangeForQuote: Error fetching customer details for opportunity:", error);
        showMessageBox(`Error fetching customer details: ${error.message}`, false);
    }
}

/**
 * Loads and displays quotes in the Grid.js table.
 * @param {string | null} opportunityId Optional: Filter quotes by this opportunity ID.
 */
async function loadQuotes(opportunityId = null) {
    console.group("loadQuotes");
    console.log(`Loading quotes for opportunity ID: ${opportunityId || 'All'}`);
    const noQuotesMessage = document.getElementById('no-quotes-message');

    if (!db) {
        console.warn("loadQuotes: Firestore DB not initialized.");
        console.groupEnd();
        return;
    }
    if (!quotesGrid || !noQuotesMessage) {
        console.error("loadQuotes: Required elements (quotesGrid or noQuotesMessage) not found. Grid might not be initialized.");
        console.groupEnd();
        return;
    }

    noQuotesMessage.classList.add('hidden');
    if (quotesGridContainer) quotesGridContainer.classList.remove('hidden');
    console.log("loadQuotes: Initial state - noQuotesMessage hidden, quotesGridContainer visible.");

    if (unsubscribeQuotes) {
        unsubscribeQuotes();
        unsubscribeQuotes = null;
        console.log("loadQuotes: Unsubscribed from previous quotes listener.");
    }

    try {
        const quotesCollectionRef = collection(db, 'quotes');
        const opportunitiesCollectionRef = collection(db, 'opportunities');

        // CRITICAL DEBUG: Fetch all opportunities once to create a lookup map
        const opportunitiesSnapshot = await getDocs(opportunitiesCollectionRef);
        const opportunityMap = new Map();
        opportunitiesSnapshot.forEach(doc => {
            const oppData = doc.data();
            opportunityMap.set(doc.id, oppData.opportunityName || 'Unknown Opportunity (No Name)');
            console.log(`loadQuotes: Populating opportunityMap - ID: ${doc.id}, Name: ${oppData.opportunityName}`);
        });
        console.log("loadQuotes: Final Opportunity map:", opportunityMap);

        let q;
        if (opportunityId) {
            q = query(quotesCollectionRef, where('opportunityId', '==', opportunityId), orderBy('createdAt', 'desc'));
            currentFilterOpportunityId = opportunityId;
            const opportunityDoc = await getDoc(doc(db, 'opportunities', opportunityId));
            if (opportunityDoc.exists()) {
                document.getElementById('quotes-filter-opportunity-name').textContent = opportunityDoc.data().opportunityName;
                document.getElementById('quotes-filter-display').classList.remove('hidden');
            }
        } else {
            q = query(quotesCollectionRef, orderBy('createdAt', 'desc'));
            currentFilterOpportunityId = null;
            document.getElementById('quotes-filter-display').classList.add('hidden');
        }

        unsubscribeQuotes = onSnapshot(q, (querySnapshot) => {
            const quotesData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const quoteOpportunityId = data.opportunityId;
                const oppName = opportunityMap.get(quoteOpportunityId);

                console.log(`loadQuotes: Processing Quote ID: ${doc.id}`);
                console.log(` - Quote's opportunityId: ${quoteOpportunityId}`);
                console.log(` - Looked up opportunityName: ${oppName}`);
                console.log(` - Full quote data:`, data);

                quotesData.push({
                    id: doc.id,
                    quoteName: data.quoteName,
                    opportunityName: oppName || 'N/A',
                    eventName: data.eventName || 'N/A',
                    eventDate: data.eventDate ? new Date(data.eventDate.seconds * 1000).toLocaleDateString() : 'N/A',
                    quoteAmount: data.quoteAmount !== undefined ? data.quoteAmount : 0,

                    // --- NEW: Add the new fields here ---
                    quoteDiscount: data.quoteDiscount !== undefined ? data.quoteDiscount : 0,
                    quoteAdjustment: data.quoteAdjustment !== undefined ? data.quoteAdjustment : 0,
                    quoteNetAmount: data.quoteNetAmount !== undefined ? data.quoteNetAmount : 0,

                    status: data.status,
                    updatedAt: data.updatedAt,
                });
            });

            console.log(`loadQuotes: onSnapshot received ${quotesData.length} quotes.`);

            if (quotesData.length > 0) {
                noQuotesMessage.classList.add('hidden');
                quotesGridContainer.classList.remove('hidden');
                quotesGrid.updateConfig({ data: quotesData }).forceRender();
                console.log(`loadQuotes: Successfully updated grid with ${quotesData.length} quotes.`);
            } else {
                quotesGrid.updateConfig({ data: [] }).forceRender();
                quotesGridContainer.classList.add('hidden');
                noQuotesMessage.classList.remove('hidden');
                console.log("loadQuotes: No quotes found, clearing grid and showing message.");
            }
        }, (error) => {
            console.error("loadQuotes: Error listening to quotes:", error);
            showMessageBox(`Error loading quotes: ${error.message}`, 'alert', true);
            if (quotesGrid) quotesGrid.updateConfig({ data: [] }).forceRender();
            if (quotesGridContainer) quotesGridContainer.classList.add('hidden');
            if (noQuotesMessage) noQuotesMessage.classList.remove('hidden');
        });
    } catch (error) {
        console.error("loadQuotes: Error setting up quotes listener:", error);
        showMessageBox(`Error setting up quotes listener: ${error.message}`, 'alert', true);
        if (quotesGrid) quotesGrid.updateConfig({ data: [] }).forceRender();
        if (quotesGridContainer) quotesGridContainer.classList.add('hidden');
        if (noQuotesMessage) noQuotesMessage.classList.remove('hidden');
    }
    console.groupEnd();
}



/**
 * Handles editing an existing quote.
 * Fetches the quote data from Firestore and populates the form.
 * @param {string} quoteId The ID of the quote to edit.
 */
async function handleEditQuote(quoteId) {
    console.group("handleEditQuote");
    console.log(`handleEditQuote: Attempting to edit quote with ID: ${quoteId}`);

    if (!db || !auth.currentUser?.uid) {
        showMessageBox("Authentication required to edit quote.", 'alert', true);
        console.groupEnd();
        return;
    }

    if (!quoteId) {
        showMessageBox("Error: No quote ID provided for editing.", 'alert', true);
        console.error("handleEditQuote: quoteId is null or empty.");
        console.groupEnd();
        return;
    }

    try {
        const quoteDocRef = getDocRef('quotes', quoteId);
        const quoteSnap = await getDoc(quoteDocRef);

        if (quoteSnap.exists()) {
            const quoteData = { id: quoteSnap.id, ...quoteSnap.data() };
            console.log("handleEditQuote: Found quote data:", quoteData);
            await setupQuoteForm(quoteData); // This will now handle rendering quote lines
        } else {
            showMessageBox("Quote not found.", 'alert', true);
            console.warn(`handleEditQuote: Quote with ID ${quoteId} not found in Firestore.`);
        }
    } catch (error) {
        console.error("handleEditQuote: Error fetching quote for edit:", error);
        showMessageBox(`Error loading quote for edit: ${error.message}`, 'alert', true);
    }
    console.groupEnd();
}


function renderQuotesGrid(quotes) {
    const data = quotes.map(quote => [
        quote.quoteName,
        quote.eventName,
        quote.customerContactName,
        quote.phone,
        quote.email,
        `${quote.quoteAmount !== undefined ? quote.quoteAmount.toFixed(2) : 'N/A'}`,
        quote.status,
        quote.eventDate,
        quote.id // Keep ID as the last element for actions formatter
    ]);

    if (!quotesGrid) {
        if (quotesGridContainer) {
            quotesGrid = new gridjs.Grid({
                columns: [
                    { name: 'Quote Name', width: '15%' },
                    { name: 'Event Name', width: '15%' },
                    { name: 'Customer', width: '15%' },
                    { name: 'Phone', width: '10%' },
                    { name: 'Email', width: '15%' },
                    { name: 'Amount', width: '10%' },
                    { name: 'Status', width: '10%' },
                    { name: 'Event Date', width: '10%' },
                    {
                        name: 'Actions',
                        width: '10%',
                        formatter: (cell, row) => {
                            const quoteId = row.cells[8].data; // Get the ID from the last cell
                            return gridjs.h('div', { className: 'flex space-x-2' },
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition duration-300 text-sm',
                                    onclick: () => editQuote(quoteId)
                                }, 'Edit'),
                                gridjs.h('button', {
                                    className: 'px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                    onclick: () => deleteQuote(quoteId)
                                }, 'Delete')
                            );
                        },
                        sort: false,
                    }
                ],
                data: data,
                search: true,
                pagination: {
                    enabled: true,
                    limit: 10
                },
                sort: true,
                className: {
                    table: 'min-w-full divide-y divide-gray-200',
                    thead: 'bg-gray-50',
                    th: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    tbody: 'bg-white divide-y divide-gray-200',
                    td: 'px-6 py-4 whitespace-normal text-sm text-gray-900', // Ensure text wrapping
                    footer: 'p-4',
                    pagination: 'flex items-center justify-between',
                    container: 'overflow-x-auto'
                }
            }).render(quotesGridContainer);
        } else {
            console.error("quotesGridContainer not found, cannot render quotes grid.");
        }
    } else {
        quotesGrid.updateConfig({ data: data }).forceRender();
    }

    if (noQuotesMessage) {
        if (quotes.length === 0) {
            noQuotesMessage.classList.remove('hidden');
        } else {
            noQuotesMessage.classList.add('hidden');
        }
    }
}

async function editQuote(quoteId) {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, 'quotes', quoteId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await setupQuoteForm(docSnap.data());
            document.getElementById('quote-id').value = quoteId;
        } else {
            showMessageBox("Quote not found!", false);
        }
    } catch (error) {
        console.error("Error editing quote:", error);
        showMessageBox(`Error loading quote for edit: ${error.message}`, false);
    }
}


async function deleteQuote(quoteId) {
    const confirmDelete = await showMessageBox("Are you sure you want to delete this quote?", true);
    if (!confirmDelete) return;

    if (!db || !userId) return;
    try {
        await deleteDoc(doc(db, 'quotes', quoteId));
        showMessageBox("Quote deleted successfully!", false);
        await loadQuotes();
    }
    catch (error) {
        console.error("Error deleting quote:", error);
        showMessageBox(`Error deleting quote: ${error.message}`, false);
    }
}

/**
 * Handles editing an existing quote line.
 * Fetches the quote line data from Firestore and populates the form.
 * @param {string} quoteLineId The ID of the quote line to edit.
 */
async function handleEditQuoteLine(quoteLineId) {
    console.log(`handleEditQuoteLine: Attempting to edit quote line ID: ${quoteLineId}`);

    if (!db || !auth.currentUser?.uid) {
        showMessageBox("Authentication required to edit quote line.", 'alert', true);
        return;
    }

    // Ensure there is a parent quote ID set
    if (!currentQuoteId) {
        showMessageBox("Error: Cannot edit quote line. Parent quote ID is missing.", 'alert', true);
        return;
    }

    try {
        // Reference to the specific quote line document within its parent quote
        const quoteLineDocRef = doc(db, 'quotes', currentQuoteId, 'quoteLines', quoteLineId);
        const quoteLineSnap = await getDoc(quoteLineDocRef);

        if (!quoteLineSnap.exists()) {
            showMessageBox("Error: Quote line not found.", 'alert', true);
            return;
        }

        const quoteLineData = quoteLineSnap.data();
        // Call showQuoteLineForm with the retrieved data to populate the form for editing
        showQuoteLineForm(quoteLineId, quoteLineData); // CRITICAL: Call showQuoteLineForm

    } catch (error) {
        console.error("handleEditQuoteLine: Error fetching quote line for edit:", error);
        showMessageBox(`Error loading quote line for edit: ${error.message}`, 'alert', true);
    }
}



/**
 * Handles the deletion of a specific quote line entry within a quote.
 * Prompts for confirmation before proceeding with deletion.
 * @param {string} quoteLineId The ID of the quote line document to delete.
 */
async function handleDeleteQuoteLine(quoteLineId) { // Now async
    showMessageBox("Are you sure you want to delete this quote line entry? This action cannot be undone.", 'confirm', async (confirmed) => {
        if (confirmed) {
            try {
                // The parent quote ID is needed to get the correct subcollection reference
                // This assumes `currentQuoteId` is correctly set when in the quote form context
                const parentQuoteId = document.getElementById('quote-line-parent-quote-id')?.value || currentQuoteId;

                if (!parentQuoteId) {
                    showMessageBox('Parent quote ID is missing. Cannot delete quote line.', 'alert', true);
                    return;
                }

                await deleteDoc(doc(collection(getDocRef('quotes', parentQuoteId), 'quoteLines'), quoteLineId));
                showMessageBox("Quote line entry deleted successfully!");
            } catch (error) {
                console.error("Error deleting quote line:", error);
                showMessageBox(`Error deleting quote line: ${error.message}`, 'alert', true);
            }
        }
    });
}


/**
 * Populates the customer country dropdown with data from the 'countries' collection.
 */
async function populateCustomerCountries() {
    if (!customerCountrySelect) {
        console.warn("customerCountrySelect element not found. Cannot populate countries.");
        return;
    }
    customerCountrySelect.innerHTML = '<option value="">Select Country</option>'; // Clear existing options and add default
    try {
        const countriesSnapshot = await getDocs(getCollectionRef('countries'));
        countriesSnapshot.forEach(doc => {
            const country = doc.data();
            const option = document.createElement('option');
            option.value = country.name;
            option.textContent = country.name;
            customerCountrySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error populating countries for customer form:", error);
        showMessageBox("Error loading countries for dropdown.", 'alert', true);
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', initializePage);

async function initializePage() {
    // Get DOM elements
    authSection = document.getElementById('auth-section');
    dashboardSection = document.getElementById('dashboard-section');
    customersSection = document.getElementById('customers-section');
    leadsSection = document.getElementById('leads-section');
    opportunitiesSection = document.getElementById('opportunities-section');
    quotesSection = document.getElementById('quotes-section');
    countriesSection = document.getElementById('countries-section');
    currenciesSection = document.getElementById('currencies-section');
    priceBooksSection = document.getElementById('price-books-section');

    userDisplayName = document.getElementById('user-display-name');
    userIdDisplay = document.getElementById('user-id-display');
    userRole = document.getElementById('user-role'); // This is the DOM element
    googleSignInBtn = document.getElementById('google-signin-btn');
    logoutBtn = document.getElementById('nav-logout'); // Correctly assigned here
    adminMenuItem = document.getElementById('admin-menu-item');
    authErrorMessage = document.getElementById('auth-error-message'); // Correctly assigned globally

    // Nav links
    navDashboard = document.getElementById('nav-dashboard');
    navCustomers = document.getElementById('nav-customers');
    navLeads = document.getElementById('nav-leads');
    navOpportunities = document.getElementById('nav-opportunities');
    navQuotes = document.getElementById('nav-quotes');
    navCountries = document.getElementById('nav-countries');
    navCurrencies = document.getElementById('nav-currencies');
    navPriceBooks = document.getElementById('nav-price-books');
    authStatus = document.getElementById('auth-status'); // Assuming this is where userDisplayName/userIdDisplay are nested

    // Dashboard elements
    dashboardTotalCustomers = document.getElementById('dashboard-total-customers');
    dashboardTotalOpportunities = document.getElementById('dashboard-total-opportunities');
    dashboardOpenOpportunities = document.getElementById('dashboard-open-opportunities');
    dashboardWonOpportunities = document.getElementById('dashboard-won-opportunities');


    // Customer elements
    addCustomerBtn = document.getElementById('add-customer-btn');
    customerFormContainer = document.getElementById('customer-form-container');
    customerForm = document.getElementById('customer-form');
    cancelCustomerBtn = document.getElementById('cancel-customer-btn');
    customerSearchInput = document.getElementById('customer-search');
    customersGridContainer = document.getElementById('customers-grid-container');
    noCustomersMessage = document.getElementById('no-customers-message');
    customerTypeSelect = document.getElementById('customer-type');
    customerCountrySelect = document.getElementById('customer-country');
    customerContactMethodSelect = document.getElementById('customer-contact-method');
    customerIndustrySelect = document.getElementById('customer-industry');
    customerSourceSelect = document.getElementById('customer-source');
    customerActiveCheckbox = document.getElementById('customer-active');
    customerFormMessage = document.getElementById('customer-form-message');

    // Lead elements
    addLeadBtn = document.getElementById('add-lead-btn');
    leadFormContainer = document.getElementById('lead-form-container');
    leadForm = document.getElementById('lead-form');
    cancelLeadBtn = document.getElementById('cancel-lead-btn');
    leadSearchInput = document.getElementById('lead-search');
    leadsGridContainer = document.getElementById('leads-grid-container');
    noLeadsMessage = document.getElementById('no-leads-message');
    leadServicesInterestedSelect = document.getElementById('lead-services-interested');
    leadSourceSelect = document.getElementById('lead-source');
    leadFormMessage = document.getElementById('lead-form-message');

    // Opportunity elements

    opportunityFormContainer = document.getElementById('opportunity-form-container');
    opportunityForm = document.getElementById('opportunity-form');
    opportunityFormMessage = document.getElementById('opportunity-form-message');
    opportunityCustomerSelect = document.getElementById('opportunity-customer');
    opportunitySalesStageSelect = document.getElementById('opportunity-sales-stage');
    opportunityServicesInterestedSelect = document.getElementById('opportunity-services-interested');
    opportunityCurrencySelect = document.getElementById('opportunity-currency');
    opportunityPriceBookSelect = document.getElementById('opportunity-price-book');

    // Calculation inputs/span - these are now globally assigned for event listeners
    opportunityValueInput = document.getElementById('opportunity-value');
    opportunityDiscountInput = document.getElementById('opportunity-discount');
    adjustmentAmtInput = document.getElementById('opportunity-adjustment-amt');
    opportunityNetSpan = document.getElementById('opportunity-net-span');



    addOpportunityBtn = document.getElementById('add-opportunity-btn');
    cancelOpportunityBtn = document.getElementById('cancel-opportunity-btn');
    opportunitySearchInput = document.getElementById('opportunity-search');
    opportunitiesGridContainer = document.getElementById('opportunities-grid-container');
    noOpportunitiesMessage = document.getElementById('no-opportunities-message');


    // Assign work log section elements
    opportunityWorkLogsSection = document.getElementById('opportunity-work-logs-section'); // Confirmed HTML ID
    opportunityWorkLogsContent = document.getElementById('opportunity-work-logs-content'); // NEW Assignment
    opportunityWorkLogsContainer = document.getElementById('opportunity-work-logs-container'); // Confirmed HTML ID (the UL)
    opportunityWorkLogFormContainer = document.getElementById('work-log-form-container'); // Confirmed HTML ID
    opportunityWorkLogForm = document.getElementById('work-log-form'); // Confirmed HTML ID
    workLogFormMessage = document.getElementById('work-log-form-message'); // Correct variable name
    workLogTypeSelect = document.getElementById('work-log-type'); // Confirmed HTML ID
    addWorkLogBtn = document.getElementById('add-work-log-btn'); // Confirmed HTML ID
    noWorkLogsMessage = document.getElementById('no-work-logs-message'); // Confirmed HTML ID
    cancelWorkLogBtn = document.getElementById('cancel-work-log-btn'); // Confirmed HTML ID


    // Assign accordion elements
    mainOpportunityDetailsAccordion = document.getElementById('main-opportunity-details-accordion'); // Confirmed HTML ID (header)
    mainOpportunityDetailsContent = document.getElementById('main-details-content'); // Confirmed HTML ID (content body)
    opportunityAccordionsGrid = document.getElementById('opportunity-accordions-grid'); // Confirmed HTML ID (parent grid for accordions)


    workLogsSectionContainer = document.getElementById('work-logs-section-container');
    addWorkLogEntryBtn = document.getElementById('add-work-log-entry-btn');
    workLogFormContainer = document.getElementById('work-log-form-container');
    workLogForm = document.getElementById('work-log-form');
    cancelWorkLogBtn = document.getElementById('cancel-work-log-btn');
    workLogsList = document.getElementById('work-logs-list');
    noWorkLogsMessage = document.getElementById('no-work-logs-message');
    workLogFormMessage = document.getElementById('work-log-form-message');


    // Quote elements
    quoteFormContainer = document.getElementById('quote-form-container');
    quoteForm = document.getElementById('quote-form');
    quoteFormMessage = document.getElementById('quote-form-message');
    addQuoteBtn = document.getElementById('add-quote-btn');
    cancelQuoteBtn = document.getElementById('cancel-quote-btn');
    quoteOpportunitySelect = document.getElementById('quote-opportunity');
    quoteStatusSelect = document.getElementById('quote-status');

    // Quote Accordion Elements (CRITICAL: Assign these new HTML IDs here)
    mainQuoteDetailsAccordion = document.getElementById('main-quote-details-accordion');
    mainQuoteDetailsContent = document.getElementById('main-quote-details-content'); // NEW ID from HTML fix
    quoteAccordionsGrid = document.getElementById('quote-accordions-grid');

    quoteSearchInput = document.getElementById('quote-search');
    quotesGridContainer = document.getElementById('quotes-grid-container');
    noQuotesMessage = document.getElementById('no-quotes-message');
    quotesFilterDisplay = document.getElementById('quotes-filter-display');
    quotesFilterOpportunityName = document.getElementById('quotes-filter-opportunity-name');
    clearQuotesFilterBtn = document.getElementById('clear-quotes-filter-btn');
    quoteCustomerContactNameInput = document.getElementById('quote-customer-contact-name');
    quoteCustomerPhoneInput = document.getElementById('quote-customer-phone');
    quoteCustomerEmailInput = document.getElementById('quote-customer-email');
    quoteCustomerAddressInput = document.getElementById('quote-customer-address');

    // --- ADD THESE NEW ELEMENT ASSIGNMENTS ---
    quoteDiscountInput = document.getElementById('quote-discount');
    quoteAdjustmentInput = document.getElementById('quote-adjustment');
    quoteNetAmountInput = document.getElementById('quote-net-amount');


    // Quote Line Elements (CRITICAL: Assign these new HTML IDs here)
    quoteLinesSectionContainer = document.getElementById('quote-lines-section-container');
    quoteLinesContent = document.getElementById('quote-lines-content'); // NEW ID from HTML fix
    addQuoteLineEntryBtn = document.getElementById('add-quote-line-entry-btn');
    quoteLineFormContainer = document.getElementById('quote-line-form-container');

    // *** THE CRITICAL DEBUGGING LINE ***
    quoteLineForm = document.getElementById('quote-line-form');
    //console.log("initializePage: Attempting to get 'quote-line-form'. Result:", quoteLineForm);
    //if (quoteLineForm) {
    //    console.log("initializePage: 'quote-line-form' found. Its outerHTML:", quoteLineForm.outerHTML);
    //} else {
    //   console.error("initializePage: 'quote-line-form' is null. The element might not exist or ID is incorrect.");
    //}
    // *** END CRITICAL DEBUGGING LINE ***

    // Quote Lines Grid Container
    quoteLinesGridContainer = document.getElementById('quote-lines-grid-container');



    quoteLineFormMessage = document.getElementById('quote-line-form-message');
    quoteLineServicesInput = document.getElementById('quote-line-services');
    quoteLineDescriptionInput = document.getElementById('quote-line-description');
    quoteLineStartDateInput = document.getElementById('quote-line-start-date');
    quoteLineEndDateInput = document.getElementById('quote-line-end-date');
    quoteLineUnitPriceInput = document.getElementById('quote-line-unit-price');
    quoteLineQuantityInput = document.getElementById('quote-line-quantity');
    quoteLineDiscountInput = document.getElementById('quote-line-discount');
    quoteLineAdjustmentAmountInput = document.getElementById('quote-line-adjustment-amount');
    quoteLineFinalNetSpan = document.getElementById('quote-line-final-net');
    cancelQuoteLineBtn = document.getElementById('cancel-quote-line-btn');
    quoteLinesList = document.getElementById('quote-lines-list');
    noQuoteLinesMessage = document.getElementById('no-quote-lines-message');

    // Admin elements
    adminMenuItem = document.getElementById('admin-menu-item');
    addCountryBtn = document.getElementById('add-country-btn');
    countryFormContainer = document.getElementById('country-form-container');
    countryForm = document.getElementById('country-form');
    cancelCountryBtn = document.getElementById('cancel-country-btn');
    countrySearchInput = document.getElementById('country-search');
    countriesGridContainer = document.getElementById('countries-grid-container');
    noCountriesMessage = document.getElementById('no-countries-message');
    countryFormMessage = document.getElementById('country-form-message');

    addCurrencyBtn = document.getElementById('add-currency-btn');
    currencyFormContainer = document.getElementById('currency-form-container');
    currencyForm = document.getElementById('currency-form');
    cancelCurrencyBtn = document.getElementById('cancel-currency-btn');
    currencySearchInput = document.getElementById('currency-search');
    currenciesGridContainer = document.getElementById('currencies-grid-container');
    noCurrenciesMessage = document.getElementById('no-currencies-message');
    currencyCountrySelect = document.getElementById('currency-country');
    currencyFormMessage = document.getElementById('currency-form-message');

    addPriceBookBtn = document.getElementById('add-price-book-btn');
    priceBookFormContainer = document.getElementById('price-book-form-container');
    priceBookForm = document.getElementById('price-book-form');
    cancelPriceBookBtn = document.getElementById('cancel-price-book-btn');
    priceBookSearchInput = document.getElementById('price-book-search');
    priceBooksGridContainer = document.getElementById('price-books-grid-container');
    noPriceBooksMessage = document.getElementById('no-price-books-message');
    priceBookCurrencySelect = document.getElementById('price-book-currency');
    priceBookActiveCheckbox = document.getElementById('price-book-active');
    priceBookFormMessage = document.getElementById('price-book-form-message');

    // --- In initializePage() function, after all DOM elements are assigned: ---
    if (opportunityCurrencySelect) {
        opportunityCurrencySelect.addEventListener('change', filterPriceBooksByCurrency);
    }


    // Message Box elements
    messageBox = document.getElementById('message-box');
    messageContent = document.getElementById('message-content');
    messageConfirmBtn = document.getElementById('message-confirm-btn');
    messageCancelBtn = document.getElementById('message-cancel-btn');


    // Setup Event Listeners
    if (googleSignInBtn) googleSignInBtn.addEventListener('click', handleGoogleSignIn);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout); // Corrected listener for logoutBtn

    // Navigation Listeners
    if (navDashboard) navDashboard.addEventListener('click', () => showSection('dashboard-section'));
    if (navCustomers) navCustomers.addEventListener('click', () => showSection('customers-section'));
    if (navLeads) navLeads.addEventListener('click', () => showSection('leads-section'));
    if (navOpportunities) navOpportunities.addEventListener('click', () => showSection('opportunities-section'));
    if (navQuotes) navQuotes.addEventListener('click', () => showSection('quotes-section'));
    if (navCountries) navCountries.addEventListener('click', () => showSection('countries-section'));
    if (navCurrencies) navCurrencies.addEventListener('click', () => showSection('currencies-section'));
    if (navPriceBooks) navPriceBooks.addEventListener('click', () => showSection('price-books-section'));


    if (addCustomerBtn) addCustomerBtn.addEventListener('click', () => {
        hideForm(customerFormContainer, customerFormMessage);
        showForm(customerFormContainer);
        customerForm.reset();
        document.getElementById('customer-id').value = '';
        if (customerActiveCheckbox) customerActiveCheckbox.checked = true;

        // ADD THIS LINE: Populate countries when adding a new customer
        populateCustomerCountries();
    });
    if (cancelCustomerBtn) cancelCustomerBtn.addEventListener('click', () => hideForm(customerFormContainer, customerFormMessage));
    if (customerForm) customerForm.addEventListener('submit', handleSaveCustomer);
    if (customerSearchInput) customerSearchInput.addEventListener('input', (event) => { if (customersGrid) customersGrid.search(event.target.value); });

    if (addLeadBtn) addLeadBtn.addEventListener('click', () => {
        hideForm(leadFormContainer, leadFormMessage);
        showForm(leadFormContainer);
        if (leadForm) leadForm.reset();
        if (document.getElementById('lead-id')) document.getElementById('lead-id').value = '';

        populateServicesInterested(leadServicesInterestedSelect);
        if (leadServicesInterestedSelect) Array.from(leadServicesInterestedSelect.options).forEach(option => option.selected = false);

        // ADD THIS LINE: Populate lead source when adding a new lead
        populateLeadSource();
    });

    if (cancelLeadBtn) cancelLeadBtn.addEventListener('click', () => hideForm(leadFormContainer, leadFormMessage));
    if (leadForm) leadForm.addEventListener('submit', handleSaveLead);
    if (leadSearchInput) leadSearchInput.addEventListener('input', (event) => { if (leadsGrid) leadsGrid.search(event.target.value); });

    if (addOpportunityBtn) addOpportunityBtn.addEventListener('click', async () => { // Make this async
        await setupOpportunityForm(); // Call setupOpportunityForm without data to reset/prepare for new
    });

    if (cancelOpportunityBtn) cancelOpportunityBtn.addEventListener('click', () => hideForm(opportunityFormContainer, opportunityFormMessage));
    if (opportunityForm) opportunityForm.addEventListener('submit', handleSaveOpportunity);
    if (opportunitySearchInput) opportunitySearchInput.addEventListener('input', (event) => { if (opportunitiesGrid) opportunitiesGrid.search(event.target.value); });
    if (opportunityCurrencySelect) opportunityCurrencySelect.addEventListener('change', (event) => filterAndPopulatePriceBooks(event.target.value));


    // Add event listeners for opportunity net calculation
    const valueInputForListener = document.getElementById('opportunity-value');
    const discountInputForListener = document.getElementById('opportunity-discount');
    const adjustmentInputForListener = document.getElementById('opportunity-adjustment-amt');

    if (valueInputForListener) {
        valueInputForListener.addEventListener('input', calculateOpportunityNet);
    }
    if (discountInputForListener) {
        discountInputForListener.addEventListener('input', calculateOpportunityNet);
    }
    if (adjustmentInputForListener) {
        adjustmentInputForListener.addEventListener('input', calculateOpportunityNet);
    }

    // Work Log Listeners
    if (addWorkLogBtn) {
        addWorkLogBtn.addEventListener('click', () => {
            if (!currentOpportunityId) {
                showMessageBox("Please save the opportunity first to add work logs.", 'alert', true);
                return;
            }
            showWorkLogForm();
        });
    }

    if (cancelWorkLogBtn) {
        cancelWorkLogBtn.addEventListener('click', () => {
            hideWorkLogForm();
        });
    }

    // Attach submit listener for the work log form
    if (opportunityWorkLogForm) {
        opportunityWorkLogForm.addEventListener('submit', handleSaveWorkLog);
    }


    // Quote Listeners (PRESERVED FROM YOUR BASELINE)

    // Event listener for Opportunity selection change in Quote form
    if (quoteOpportunitySelect) {
        quoteOpportunitySelect.addEventListener('change', populateCustomerDetailsForQuote);
        console.log("initializePage: Added change listener for quoteOpportunitySelect.");
    }
    if (addQuoteBtn) addQuoteBtn.addEventListener('click', () => setupQuoteForm());
    if (cancelQuoteBtn) cancelQuoteBtn.addEventListener('click', () => hideForm(quoteFormContainer, quoteFormMessage));
    if (quoteForm) quoteForm.addEventListener('submit', handleSaveQuote);
    if (quoteSearchInput) quoteSearchInput.addEventListener('input', (event) => { if (quotesGrid) quotesGrid.search(event.target.value); });

    if (clearQuotesFilterBtn) clearQuotesFilterBtn.addEventListener('click', clearQuotesFilter);

    // Update the event listeners for the new quote fields
    if (quoteAmountInput) quoteAmountInput.addEventListener('input', () => {
        toggleDiscountAdjustmentFields();
        calculateQuoteNetAmount();
    });
    if (quoteDiscountInput) quoteDiscountInput.addEventListener('input', calculateQuoteNetAmount);
    if (quoteAdjustmentInput) quoteAdjustmentInput.addEventListener('input', calculateQuoteNetAmount);
    

    // Quote Line Listeners (ALL NEW)
    if (addQuoteLineEntryBtn) {
        addQuoteLineEntryBtn.addEventListener('click', () => {
            if (!currentQuoteId) {
                showMessageBox("Please save the main quote first to add quote lines.", 'alert', true);
                return;
            }
            showQuoteLineForm(); // CRITICAL: Call showQuoteLineForm without arguments for a new entry
        });
    }
    if (cancelQuoteLineBtn) cancelQuoteLineBtn.addEventListener('click', () => hideQuoteLineForm());
    if (quoteLineForm) quoteLineForm.addEventListener('submit', handleSaveQuoteLine);

    // Add event listeners for quote line net calculation
    if (quoteLineUnitPriceInput) quoteLineUnitPriceInput.addEventListener('input', calculateQuoteLineFinalNet); // CRITICAL: Use calculateQuoteLineFinalNet
    if (quoteLineQuantityInput) quoteLineQuantityInput.addEventListener('input', calculateQuoteLineFinalNet); // CRITICAL: Use calculateQuoteLineFinalNet
    if (quoteLineDiscountInput) quoteLineDiscountInput.addEventListener('input', calculateQuoteLineFinalNet); // CRITICAL: Use calculateQuoteLineFinalNet
    if (quoteLineAdjustmentAmountInput) quoteLineAdjustmentAmountInput.addEventListener('input', calculateQuoteLineFinalNet); // CRITICAL: Use calculateQuoteLineFinalNet


    // Accordion event listeners for Quotes
    if (mainQuoteDetailsAccordion) {
        // Listener for the header to toggle the accordion
        mainQuoteDetailsAccordion.addEventListener('click', (event) => {
            // Check if the click originated directly on the header or its immediate children (like h3 or icon)
            // This prevents clicks on inputs/labels inside the content from toggling the header
            if (event.target.closest('.accordion-header') === mainQuoteDetailsAccordion.querySelector('.accordion-header')) {
                if (mainQuoteDetailsContent) {
                    const isHidden = mainQuoteDetailsContent.classList.contains('hidden');
                    mainQuoteDetailsContent.classList.toggle('hidden', !isHidden);
                    setAccordionVisualState(mainQuoteDetailsAccordion.querySelector('.accordion-header'), !isHidden);
                }
            }
        });

        // CRITICAL FIX: Add a listener to the content area to stop propagation
        if (mainQuoteDetailsContent) {
            mainQuoteDetailsContent.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent clicks inside content from bubbling up to the header
            });
        }
    }



    if (quoteLinesSectionContainer) { // This is the header of the quote lines accordion
        // Listener for the header to toggle the accordion
        quoteLinesSectionContainer.addEventListener('click', (event) => {
            // Check if the click originated directly on the header or its immediate children
            if (event.target.closest('.accordion-header') === quoteLinesSectionContainer.querySelector('.accordion-header')) {
                if (quoteLinesContent) {
                    const isHidden = quoteLinesContent.classList.contains('hidden');
                    quoteLinesContent.classList.toggle('hidden', !isHidden);
                    setAccordionVisualState(quoteLinesSectionContainer.querySelector('.accordion-header'), !isHidden);
                }
            }
        });

        // CRITICAL FIX: Add a listener to the content area to stop propagation
        if (quoteLinesContent) {
            quoteLinesContent.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent clicks inside content from bubbling up to the header
            });
        }
    }



    // Admin Listeners
    if (addCountryBtn) addCountryBtn.addEventListener('click', () => { hideForm(countryFormContainer, countryFormMessage); showForm(countryFormContainer); countryForm.reset(); document.getElementById('country-id').value = ''; });
    if (cancelCountryBtn) cancelCountryBtn.addEventListener('click', () => hideForm(countryFormContainer, countryFormMessage));
    if (countryForm) countryForm.addEventListener('submit', handleSaveCountry);
    if (countrySearchInput) countrySearchInput.addEventListener('input', (event) => { if (countriesGrid) countriesGrid.search(event.target.value); });

    if (addCurrencyBtn) addCurrencyBtn.addEventListener('click', () => {
        hideForm(currencyFormContainer, currencyFormMessage);
        showForm(currencyFormContainer);
        if (currencyForm) currencyForm.reset();
        if (document.getElementById('currency-id')) document.getElementById('currency-id').value = '';

        // ADD THIS LINE: Populate countries when adding a new currency
        populateCurrencyCountries();
    });

    if (cancelCurrencyBtn) cancelCurrencyBtn.addEventListener('click', () => hideForm(currencyFormContainer, currencyFormMessage));
    if (currencyForm) currencyForm.addEventListener('submit', handleSaveCurrency);
    if (currencySearchInput) currencySearchInput.addEventListener('input', (event) => { if (currenciesGrid) currenciesGrid.search(event.target.value); });

    if (addPriceBookBtn) addPriceBookBtn.addEventListener('click', () => { hideForm(priceBookFormContainer, priceBookFormMessage); showForm(priceBookFormContainer); priceBookForm.reset(); document.getElementById('price-book-id').value = ''; if (priceBookActiveCheckbox) priceBookActiveCheckbox.checked = true; populatePriceBookCurrencies(); });
    if (cancelPriceBookBtn) cancelPriceBookBtn.addEventListener('click', () => hideForm(priceBookFormContainer, priceBookFormMessage));
    if (priceBookForm) priceBookForm.addEventListener('submit', handleSavePriceBook);
    if (priceBookSearchInput) priceBookSearchInput.addEventListener('input', (event) => { if (priceBooksGrid) priceBooksGrid.search(event.target.value); });


    // Setup Grids (Existing initializations, now with column widths and null checks)
    customersGrid = new gridjs.Grid({
        columns: [
            { id: 'id', name: 'ID', hidden: true }, // Explicit ID column, hidden, and now reliably at index 0
            { id: 'name', name: 'Name', width: '150px' }, // Auto for flexibility
            { id: 'type', name: 'Type', width: '120px' },
            { id: 'email', name: 'Email', width: '150px' }, // Auto for flexibility
            { id: 'phone', name: 'Phone', width: '150px' },
            { id: 'country', name: 'Country', width: '120px' },
            { id: 'preferredContactMethod', name: 'Contact Method', width: '180px' },
            { id: 'industry', name: 'Industry', width: '120px' },
            { id: 'source', name: 'Source', width: '120px' },
            {
                name: 'Actions',
                width: '180px', // Ensure enough space for buttons
                formatter: (cell, row) => {
                    const customerId = row.cells[0].data;

                    if (!customerId) {
                        console.error("Error: Customer ID not found at row.cells[0].data for actions.");
                        return gridjs.html(`<span>Error</span>`);
                    }

                    return gridjs.html(`
                <button class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 text-sm mr-2" onclick="handleEditCustomer('${customerId}')">Edit</button>
                <button class="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-800 transition duration-300 text-sm" onclick="handleDeleteCustomer('${customerId}')">Delete</button>
                `);
                }
            }
        ],
        data: [], // Will be populated by onSnapshot
        search: {
            selector: (cell, rowIndex, cellIndex) => {
                return cellIndex > 0 && cellIndex < 9 ? cell : undefined;
            }
        },
        pagination: {
            enabled: true,
            limit: 10,
        },
        sort: true,
        resizable: true,
        className: {
            // Overall table container styling
            container: 'rounded-lg shadow-md border border-gray-200 overflow-x-auto', // Added rounded corners, shadow, border, and horizontal scroll

            // Table element itself
            table: 'min-w-full divide-y divide-gray-200',

            // Table Header styling
            thead: 'bg-gray-50', // Lighter header background
            th: 'px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[60px]', // Bolder, slightly larger padding, darker text

            // Table Body styling
            tbody: 'bg-white divide-y divide-gray-100', // Lighter divider
            tr: 'hover:bg-gray-50', // Subtle row hover effect

            // Table Data cells
            td: 'px-4 py-3 whitespace-normal break-words text-sm text-gray-800', // Increased padding, normal whitespace, word break

            // Footer styling (for pagination)
            footer: 'py-3 px-4 bg-gray-50 rounded-b-lg text-sm', // Rounded bottom corners for footer

            // Pagination buttons
            paginationButton: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonCurrent: 'px-3 py-1 mx-1 rounded-md text-white bg-blue-600 border border-blue-600',
            paginationButtonPrev: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonNext: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
        }
    }).render(customersGridContainer);


    unsubscribeCustomers = onSnapshot(getCollectionRef('customers'), (snapshot) => {
        const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (customers.length === 0) {
            if (noCustomersMessage) noCustomersMessage.classList.remove('hidden');
            if (customersGridContainer) customersGridContainer.classList.add('hidden');
        } else {
            if (noCustomersMessage) noCustomersMessage.classList.add('hidden');
            if (customersGridContainer) customersGridContainer.classList.remove('hidden');
        }
        customersGrid.updateConfig({ data: customers }).forceRender();
    }, (error) => {
        console.error("Error fetching customers:", error);
        showMessageBox("Error loading customers.");
    });


    leadsGrid = new gridjs.Grid({
        columns: [
            { id: 'id', name: 'ID', hidden: true }, // ADDED: Explicit ID column, hidden, and now reliably at index 0
            { id: 'contactName', name: 'Contact Name', width: 'auto' },
            { id: 'phone', name: 'Phone', width: '150px' },
            { id: 'email', name: 'Email', width: '200px' },
            { id: 'servicesInterested', name: 'Services', width: '300px', formatter: (cell) => cell ? cell.join(', ') : '' },
            { id: 'eventDate', name: 'Event Date', width: '120px', formatter: (cell) => cell ? new Date(cell.seconds * 1000).toLocaleDateString() : '' },
            { id: 'source', name: 'Source', width: '120px' },
            {
                name: 'Actions',
                width: '180px',
                formatter: (cell, row) => {
                    // CORRECTED: Access the ID directly from the first cell (index 0)
                    const leadId = row.cells[0].data;

                    if (!leadId) {
                        console.error("Error: Lead ID not found at row.cells[0].data for actions.");
                        return gridjs.html(`<span>Error</span>`); // Or some other fallback
                    }

                    return gridjs.html(`
                        <button class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 text-sm mr-2" onclick="handleEditLead('${leadId}')">Edit</button>
                        <button class="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-800 transition duration-300 text-sm" onclick="handleDeleteLead('${leadId}')">Delete</button>
                    `);
                }
            }
        ],
        data: [],
        search: {
            selector: (cell, rowIndex, cellIndex) => {
                // Exclude 'Actions' column (last) and the hidden 'id' column (index 0) from search.
                // Visible columns are contactName (1), phone (2), email (3), services (4), eventDate (5), source (6).
                // So, search from index 1 up to (but not including) the 'Actions' column (index 7).
                return cellIndex > 0 && cellIndex < 7 ? cell : undefined;
            }
        },
        pagination: {
            enabled: true,
            limit: 10,
        },
        sort: true,
        resizable: true,
        className: {
            // Overall table container styling
            container: 'rounded-lg shadow-md border border-gray-200 overflow-x-auto', // Added rounded corners, shadow, border, and horizontal scroll

            // Table element itself
            table: 'min-w-full divide-y divide-gray-200',

            // Table Header styling
            thead: 'bg-gray-50', // Lighter header background
            th: 'px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[60px]', // Bolder, slightly larger padding, darker text

            // Table Body styling
            tbody: 'bg-white divide-y divide-gray-100', // Lighter divider
            tr: 'hover:bg-gray-50', // Subtle row hover effect

            // Table Data cells
            td: 'px-4 py-3 whitespace-normal break-words text-sm text-gray-800', // Increased padding, normal whitespace, word break

            // Footer styling (for pagination)
            footer: 'py-3 px-4 bg-gray-50 rounded-b-lg text-sm', // Rounded bottom corners for footer

            // Pagination buttons
            paginationButton: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonCurrent: 'px-3 py-1 mx-1 rounded-md text-white bg-blue-600 border border-blue-600',
            paginationButtonPrev: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonNext: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
        }
    }).render(leadsGridContainer);

    unsubscribeLeads = onSnapshot(getCollectionRef('leads'), (snapshot) => {
        const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (leads.length === 0) {
            if (noLeadsMessage) noLeadsMessage.classList.remove('hidden');
            if (leadsGridContainer) leadsGridContainer.classList.add('hidden');
        } else {
            if (noLeadsMessage) noLeadsMessage.classList.add('hidden');
            if (leadsGridContainer) leadsGridContainer.classList.remove('hidden');
        }
        leadsGrid.updateConfig({ data: leads }).forceRender();
    }, (error) => {
        console.error("Error fetching leads:", error);
        showMessageBox("Error loading leads.");
    });



    opportunitiesGrid = new gridjs.Grid({
        columns: [
            // CRITICAL FIX: Add a hidden 'id' column first
            { id: 'id', name: 'ID', hidden: true },
            { id: 'name', name: 'Opportunity Name', width: 'auto' },
            { id: 'customerName', name: 'Customer', width: '180px' },
            { id: 'currency', name: 'Currency', width: '100px' },
            { id: 'salesStage', name: 'Sales Stage', width: '150px' },
            { id: 'opportunityNet', name: 'Net Value', width: '120px', formatter: (cell) => cell ? cell.toFixed(2) : '0.00' },
            { id: 'expectedCloseDate', name: 'Close Date', width: '120px', formatter: (cell) => cell ? new Date(cell.seconds * 1000).toLocaleDateString() : '' },
            { id: 'probability', name: 'Probability (%)', width: '120px' },
            {
                name: 'Actions',
                width: '200px',
                formatter: (cell, row) => {
                    // CRITICAL FIX: Get the ID from the first cell (index 0)
                    const opportunityId = row.cells[0].data;
                    return gridjs.html(`
                    <button class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 text-sm mr-2" onclick="handleEditOpportunity('${opportunityId}')">Edit</button>
                    <button class="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-800 transition duration-300 text-sm" onclick="handleDeleteOpportunity('${opportunityId}')">Delete</button>
                `);
                }
            }
        ],
        data: [],
        search: true,
        pagination: {
            enabled: true,
            limit: 10,
        },
        sort: true,
        resizable: true,
        className: {
            // Overall table container styling
            container: 'rounded-lg shadow-md border border-gray-200 overflow-x-auto', // Added rounded corners, shadow, border, and horizontal scroll

            // Table element itself
            table: 'min-w-full divide-y divide-gray-200',

            // Table Header styling
            thead: 'bg-gray-50', // Lighter header background
            th: 'px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[60px]', // Bolder, slightly larger padding, darker text

            // Table Body styling
            tbody: 'bg-white divide-y divide-gray-100', // Lighter divider
            tr: 'hover:bg-gray-50', // Subtle row hover effect

            // Table Data cells
            td: 'px-4 py-3 whitespace-normal break-words text-sm text-gray-800', // Increased padding, normal whitespace, word break

            // Footer styling (for pagination)
            footer: 'py-3 px-4 bg-gray-50 rounded-b-lg text-sm', // Rounded bottom corners for footer

            // Pagination buttons
            paginationButton: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonCurrent: 'px-3 py-1 mx-1 rounded-md text-white bg-blue-600 border border-blue-600',
            paginationButtonPrev: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonNext: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
        }
    }).render(opportunitiesGridContainer);



    unsubscribeOpportunities = onSnapshot(getCollectionRef('opportunities'), (snapshot) => {
        const opportunities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (opportunities.length === 0) {
            if (noOpportunitiesMessage) noOpportunitiesMessage.classList.remove('hidden');
            if (opportunitiesGridContainer) opportunitiesGridContainer.classList.add('hidden');
        } else {
            if (noOpportunitiesMessage) noOpportunitiesMessage.classList.add('hidden');
            if (opportunitiesGridContainer) opportunitiesGridContainer.classList.remove('hidden');
        }
        opportunitiesGrid.updateConfig({ data: opportunities }).forceRender();
    }, (error) => {
        console.error("Error fetching opportunities:", error);
        showMessageBox("Error loading opportunities.");
    });


    // QUOTES GRID INITIALIZATION (Aligned with opportunitiesGrid pattern)
    if (quotesGridContainer) { // Ensure container exists before initializing grid
        quotesGrid = new gridjs.Grid({
            columns: [
                // Quote ID: Hidden again, but still present for actions
                { id: 'id', name: 'Quote ID', hidden: true },
                { id: 'quoteName', name: 'Quote Name', width: '200px'  },
                // NEW: Opportunity Name column
                { id: 'opportunityName', name: 'Opportunity Name', width: '200px'  },
                { id: 'eventName', name: 'Event Name' , width: '200px' },
                {
                    id: 'eventDate',
                    name: 'Event Date',
                    width: '120px',
                    formatter: (cell) => {
                        if (cell && typeof cell.seconds === 'number' && typeof cell.nanoseconds === 'number') {
                            return new Date(cell.seconds * 1000).toLocaleDateString();
                        }
                        return 'N/A';
                    }
                },
                { id: 'quoteAmount',   name: 'Amount', formatter: (cell) => `$${cell ? cell.toFixed(2) : '0.00'}`, width: '100px'  },
                { id: 'quoteDiscount', name: 'Discount (%)', formatter: (cell) => `${cell}%`, width: '100px' },
                {
                    id: 'quoteAdjustment',
                    name: 'Adjustment',
                    formatter: (cell) => `$${parseFloat(cell || 0).toFixed(2)}`,
                    width: '120px'
                },
                {
                    id: 'quoteNetAmount',
                    name: 'Net Amount',
                    width: '200px',
                    formatter: (cell) => `$${parseFloat(cell || 0).toFixed(2)}`,
                    width: '120px'
                },
                { id: 'status', name: 'Status', width: '100px', },
                {
                    name: 'Actions',
                    width: '180px',
                    formatter: (cell, row) => {
                        const quoteId = row.cells[0].data;
                        return gridjs.h('div', {
                            className: 'flex space-x-2'
                        },
                            gridjs.h('button', {
                                className: 'px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 text-sm',
                                onClick: () => handleEditQuote(quoteId)
                            }, 'Edit'),
                            gridjs.h('button', {
                                className: 'px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 text-sm',
                                onClick: () => handleDeleteQuote(quoteId)
                            }, 'Delete')
                        );
                    }
                }
            ],
            data: [],
            search: true,
            pagination: {
                enabled: true,
                limit: 5
            },
            sort: true,
            className: {
                // Overall table container styling
                container: 'rounded-lg shadow-md border border-gray-200 overflow-x-auto', // Added rounded corners, shadow, border, and horizontal scroll

                // Table element itself
                table: 'min-w-full divide-y divide-gray-200',

                // Table Header styling
                thead: 'bg-gray-50', // Lighter header background
                th: 'px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[60px]', // Bolder, slightly larger padding, darker text

                // Table Body styling
                tbody: 'bg-white divide-y divide-gray-100', // Lighter divider
                tr: 'hover:bg-gray-50', // Subtle row hover effect

                // Table Data cells
                td: 'px-4 py-3 whitespace-normal break-words text-sm text-gray-800', // Increased padding, normal whitespace, word break

                // Footer styling (for pagination)
                footer: 'py-3 px-4 bg-gray-50 rounded-b-lg text-sm', // Rounded bottom corners for footer

                // Pagination buttons
                paginationButton: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
                paginationButtonCurrent: 'px-3 py-1 mx-1 rounded-md text-white bg-blue-600 border border-blue-600',
                paginationButtonPrev: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
                paginationButtonNext: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            }
        }).render(quotesGridContainer);
        console.log("initializePage: quotesGrid initialized.");
    } else {
        console.error("initializePage: quotesGridContainer not found, cannot initialize quotesGrid.");
    }


    // QUOTE LINES GRID INITIALIZATION
    if (quoteLinesGridContainer) {
        quoteLinesGrid = new gridjs.Grid({
            columns: [
                { id: 'id', name: 'ID', hidden: true }, // Hidden ID for actions
                { id: 'services', name: 'Service', width: 'auto' }, // Auto for flexibility
                { id: 'serviceDescription', name: 'Description', width: 'auto' }, // Auto for flexibility
                { id: 'unitPrice', name: 'Unit Price', formatter: (cell) => `$${cell.toFixed(2)}`, width: '100px' },
                { id: 'quantity', name: 'Qty', width: '80px' },
                { id: 'discount', name: 'Disc (%)', formatter: (cell) => `${cell}%`, width: '90px' },
                { id: 'adjustmentAmount', name: 'Adj Amt', formatter: (cell) => `$${cell.toFixed(2)}`, width: '120px' },
                { id: 'finalNet', name: 'Net', formatter: (cell) => `$${cell.toFixed(2)}`, width: '100px' },
                {
                    id: 'serviceStartDate',
                    name: 'Start Date', width: '120px',
                    formatter: (cell) => cell ? new Date(cell.seconds * 1000).toLocaleDateString() : 'N/A'
                },
                {
                    id: 'serviceEndDate',
                    name: 'End Date', width: '120px',
                    formatter: (cell) => cell ? new Date(cell.seconds * 1000).toLocaleDateString() : 'N/A'
                },
                {
                    name: 'Actions',
                    width: '180px', // Ensure enough space for buttons
                    formatter: (cell, row) => {
                        const quoteLineId = row.cells[0].data;
                        return gridjs.h('div', {
                            className: 'flex space-x-2'
                        },
                            gridjs.h('button', {
                                className: 'px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 text-sm',
                                onClick: () => handleEditQuoteLine(quoteLineId)
                            }, 'Edit'),
                            gridjs.h('button', {
                                className: 'px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-800 transition duration-300 text-sm', // Darker red on hover
                                onClick: () => handleDeleteQuoteLine(quoteLineId)
                            }, 'Delete')
                        );
                    }
                }
            ],
            data: [],
            search: false,
            pagination: {
                enabled: true,
                limit: 5
            },
            sort: true,
            resizable: true,
            className: {
                // Overall table container styling
                container: 'rounded-lg shadow-md border border-gray-200', // Added rounded corners, shadow, border

                // Table element itself
                table: 'min-w-full divide-y divide-gray-200',

                // Table Header styling
                thead: 'bg-gray-50', // Lighter header background
                th: 'px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[60px]', // Bolder, slightly larger padding, darker text

                // Table Body styling
                tbody: 'bg-white divide-y divide-gray-100', // Lighter divider
                tr: 'hover:bg-gray-50', // Subtle row hover effect

                // Alternating row colors (Zebra striping)
                // Note: Grid.js default behavior usually handles this with tbody's bg-white,
                // but for explicit zebra striping, you might need custom CSS or more advanced Grid.js options.
                // For now, hover effect and general tbody background are good.

                // Table Data cells
                td: 'px-4 py-3 whitespace-normal break-words text-sm text-gray-800', // Increased padding, normal whitespace

                // Footer styling (for pagination)
                footer: 'py-3 px-4 bg-gray-50 rounded-b-lg text-sm', // Rounded bottom corners for footer

                // Pagination buttons
                paginationButton: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
                paginationButtonCurrent: 'px-3 py-1 mx-1 rounded-md text-white bg-blue-600 border border-blue-600',
                paginationButtonPrev: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
                paginationButtonNext: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            }
        }).render(quoteLinesGridContainer);
        console.log("initializePage: quoteLinesGrid initialized.");
    } else {
        console.error("initializePage: quoteLinesGridContainer not found, cannot initialize quoteLinesGrid.");
    }


    // A real-time listener for the quotes collection.
    // This function now also fetches the related opportunity name to display in the grid.
    unsubscribeQuotes = onSnapshot(getCollectionRef('quotes'), async (snapshot) => {
        console.log("Quotes real-time listener triggered. Fetching and preparing data...");
        
        if (snapshot.empty) {
            if (noQuotesMessage) noQuotesMessage.classList.remove('hidden');
            if (quotesGridContainer) quotesGridContainer.classList.add('hidden');
            quotesGrid.updateConfig({ data: [] }).forceRender(); // Ensure the grid is cleared
            return;
        }

        // Create an array of promises to fetch each opportunity document in parallel
        const quotesWithOpportunityPromises = snapshot.docs.map(async (docSnapshot) => {
            const quote = { id: docSnapshot.id, ...docSnapshot.data() };
            let opportunityName = 'Not Found';

            if (quote.opportunityId) {
                try {
                    // Fetch the linked opportunity document
                    const opportunityDocRef = doc(db, 'opportunities', quote.opportunityId);
                    const opportunityDoc = await getDoc(opportunityDocRef);
                    
                    if (opportunityDoc.exists()) {
                        opportunityName = opportunityDoc.data().name || 'Unnamed Opportunity';
                    }
                } catch (error) {
                    console.error(`Error fetching opportunity for quote ${quote.id}:`, error);
                }
            }
            
            // Return a new object with the opportunityName added
            return { ...quote, opportunityName };
        });

        // Wait for all the promises to resolve
        const quotes = await Promise.all(quotesWithOpportunityPromises);

        // Update UI based on whether there are quotes
        if (noQuotesMessage) noQuotesMessage.classList.add('hidden');
        if (quotesGridContainer) quotesGridContainer.classList.remove('hidden');
        
        // Update the grid with the new, enriched data
        quotesGrid.updateConfig({ data: quotes }).forceRender();
        console.log("Quotes grid updated with opportunity names.");

    }, (error) => {
        console.error("Error fetching quotes:", error);
        showMessageBox("Error loading quotes.");
    });





    countriesGrid = new gridjs.Grid({
        columns: [
            { id: 'id', name: 'ID', hidden: true }, // ADDED: Explicit ID column, hidden, and now reliably at index 0
            { id: 'name', name: 'Country Name', width: '200px' },
            { id: 'code', name: 'Code', width: '80px' },
            { id: 'states', name: 'States/Provinces', width: 'auto', formatter: (cell) => cell ? cell.join(', ') : '' },
            {
                name: 'Actions',
                width: '180px',
                formatter: (cell, row) => {
                    // CORRECTED: Access the ID directly from the first cell (index 0)
                    const countryId = row.cells[0].data;

                    if (!countryId) {
                        console.error("Error: Country ID not found at row.cells[0].data for actions.");
                        return gridjs.html(`<span>Error</span>`); // Or some other fallback
                    }
                    return gridjs.html(`
                        <button class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 text-sm mr-2" onclick="handleEditCountry('${countryId}')">Edit</button>
                        <button class="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-800 transition duration-300 text-sm" onclick="handleDeleteCountry('${countryId}')">Delete</button>
                    `);
                }
            }
        ],
        data: [],
        search: {
            selector: (cell, rowIndex, cellIndex) => {
                // Exclude 'Actions' column (last) and the hidden 'id' column (index 0) from search.
                // Visible columns are name (1), code (2), states (3).
                // So, search from index 1 up to (but not including) the 'Actions' column (index 4).
                return cellIndex > 0 && cellIndex < 4 ? cell : undefined;
            }
        },
        pagination: { enabled: true, limit: 10 },
        sort: true,
        resizable: true,
        className: {
            // Overall table container styling
            container: 'rounded-lg shadow-md border border-gray-200 overflow-x-auto', // Added rounded corners, shadow, border, and horizontal scroll

            // Table element itself
            table: 'min-w-full divide-y divide-gray-200',

            // Table Header styling
            thead: 'bg-gray-50', // Lighter header background
            th: 'px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[60px]', // Bolder, slightly larger padding, darker text

            // Table Body styling
            tbody: 'bg-white divide-y divide-gray-100', // Lighter divider
            tr: 'hover:bg-gray-50', // Subtle row hover effect

            // Table Data cells
            td: 'px-4 py-3 whitespace-normal break-words text-sm text-gray-800', // Increased padding, normal whitespace, word break

            // Footer styling (for pagination)
            footer: 'py-3 px-4 bg-gray-50 rounded-b-lg text-sm', // Rounded bottom corners for footer

            // Pagination buttons
            paginationButton: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonCurrent: 'px-3 py-1 mx-1 rounded-md text-white bg-blue-600 border border-blue-600',
            paginationButtonPrev: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonNext: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
        }
    }).render(countriesGridContainer);


    onSnapshot(getCollectionRef('countries'), (snapshot) => {
        const countries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (countries.length === 0) {
            if (noCountriesMessage) noCountriesMessage.classList.remove('hidden');
            if (countriesGridContainer) countriesGridContainer.classList.add('hidden');
        } else {
            if (noCountriesMessage) noCountriesMessage.classList.add('hidden');
            if (countriesGridContainer) countriesGridContainer.classList.remove('hidden');
        }
        countriesGrid.updateConfig({ data: countries }).forceRender();
    }, (error) => {
        console.error("Error fetching countries:", error);
        showMessageBox("Error loading countries.");
    });



    currenciesGrid = new gridjs.Grid({
        columns: [
            { id: 'id', name: 'ID', hidden: true }, // ADDED: Explicit ID column, hidden, and now reliably at index 0
            { id: 'name', name: 'Currency Name', width: '200px' },
            { id: 'code', name: 'Code', width: '100px' },
            { id: 'symbol', name: 'Symbol', width: '100px' },
            { id: 'countryCode', name: 'Country', width: '100px' },
            {
                name: 'Actions',
                width: '180px',
                formatter: (cell, row) => {
                    // CORRECTED: Access the ID directly from the first cell (index 0)
                    const currencyId = row.cells[0].data;

                    if (!currencyId) {
                        console.error("Error: Currency ID not found at row.cells[0].data for actions.");
                        return gridjs.html(`<span>Error</span>`); // Or some other fallback
                    }

                    return gridjs.html(`
                        <button class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 text-sm mr-2" onclick="handleEditCurrency('${currencyId}')">Edit</button>
                        <button class="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-800 transition duration-300 text-sm" onclick="handleDeleteCurrency('${currencyId}')">Delete</button>
                    `);
                }
            }
        ],
        data: [],
        search: {
            selector: (cell, rowIndex, cellIndex) => {
                // Exclude 'Actions' column (last) and the hidden 'id' column (index 0) from search.
                // Visible columns are name (1), code (2), symbol (3), countryCode (4).
                // So, search from index 1 up to (but not including) the 'Actions' column (index 5).
                return cellIndex > 0 && cellIndex < 5 ? cell : undefined;
            }
        },
        pagination: { enabled: true, limit: 10 },
        sort: true,
        resizable: true,
        className: {
            // Overall table container styling
            container: 'rounded-lg shadow-md border border-gray-200 overflow-x-auto', // Added rounded corners, shadow, border, and horizontal scroll

            // Table element itself
            table: 'min-w-full divide-y divide-gray-200',

            // Table Header styling
            thead: 'bg-gray-50', // Lighter header background
            th: 'px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[60px]', // Bolder, slightly larger padding, darker text

            // Table Body styling
            tbody: 'bg-white divide-y divide-gray-100', // Lighter divider
            tr: 'hover:bg-gray-50', // Subtle row hover effect

            // Table Data cells
            td: 'px-4 py-3 whitespace-normal break-words text-sm text-gray-800', // Increased padding, normal whitespace, word break

            // Footer styling (for pagination)
            footer: 'py-3 px-4 bg-gray-50 rounded-b-lg text-sm', // Rounded bottom corners for footer

            // Pagination buttons
            paginationButton: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonCurrent: 'px-3 py-1 mx-1 rounded-md text-white bg-blue-600 border border-blue-600',
            paginationButtonPrev: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonNext: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
        }
    }).render(currenciesGridContainer);


    onSnapshot(getCollectionRef('currencies'), (snapshot) => {
        const currencies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currencies.length === 0) {
            if (noCurrenciesMessage) noCurrenciesMessage.classList.remove('hidden');
            if (currenciesGridContainer) currenciesGridContainer.classList.add('hidden');
        } else {
            if (noCurrenciesMessage) noCurrenciesMessage.classList.add('hidden');
            if (currenciesGridContainer) currenciesGridContainer.classList.remove('hidden');
        }
        currenciesGrid.updateConfig({ data: currencies }).forceRender();
    }, (error) => {
        console.error("Error fetching currencies:", error);
        showMessageBox("Error loading currencies.");
    });


    priceBooksGrid = new gridjs.Grid({
        columns: [
            { id: 'id', name: 'ID', hidden: true }, // ADDED: Explicit ID column, hidden, and now reliably at index 0
            { id: 'name', name: 'Price Book Name', width: '220px' },
            { id: 'currency', name: 'Currency', width: '100px' },
            { id: 'description', name: 'Description', width: '200px' },
            { id: 'isActive', name: 'Active', width: '80px', formatter: (cell) => cell ? 'Yes' : 'No' },
            {
                name: 'Actions',
                width: '120px',
                formatter: (cell, row) => {
                    // CORRECTED: Access the ID directly from the first cell (index 0)
                    const priceBookId = row.cells[0].data;

                    if (!priceBookId) {
                        console.error("Error: Price Book ID not found at row.cells[0].data for actions.");
                        return gridjs.html(`<span>Error</span>`); // Or some other fallback
                    }

                    return gridjs.html(`
                        <button class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300 text-sm mr-2" onclick="handleEditPriceBook('${priceBookId}')">Edit</button>
                        <button class="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-800 transition duration-300 text-sm" onclick="handleDeletePriceBook('${priceBookId}')">Delete</button>
                    `);
                }
            }
        ],
        data: [],
        search: {
            selector: (cell, rowIndex, cellIndex) => {
                // Exclude 'Actions' column (last) and the hidden 'id' column (index 0) from search.
                // Visible columns are name (1), currency (2), description (3), isActive (4).
                // So, search from index 1 up to (but not including) the 'Actions' column (index 5).
                return cellIndex > 0 && cellIndex < 5 ? cell : undefined;
            }
        },
        pagination: { enabled: true, limit: 10 },
        sort: true,
        resizable: true,
        className: {
            // Overall table container styling
            container: 'rounded-lg shadow-md border border-gray-200 overflow-x-auto', // Added rounded corners, shadow, border, and horizontal scroll

            // Table element itself
            table: 'min-w-full divide-y divide-gray-200',

            // Table Header styling
            thead: 'bg-gray-50', // Lighter header background
            th: 'px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap min-w-[60px]', // Bolder, slightly larger padding, darker text

            // Table Body styling
            tbody: 'bg-white divide-y divide-gray-100', // Lighter divider
            tr: 'hover:bg-gray-50', // Subtle row hover effect

            // Table Data cells
            td: 'px-4 py-3 whitespace-normal break-words text-sm text-gray-800', // Increased padding, normal whitespace, word break

            // Footer styling (for pagination)
            footer: 'py-3 px-4 bg-gray-50 rounded-b-lg text-sm', // Rounded bottom corners for footer

            // Pagination buttons
            paginationButton: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonCurrent: 'px-3 py-1 mx-1 rounded-md text-white bg-blue-600 border border-blue-600',
            paginationButtonPrev: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
            paginationButtonNext: 'px-3 py-1 mx-1 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-100',
        }
    }).render(priceBooksGridContainer);



    onSnapshot(getCollectionRef('priceBooks'), (snapshot) => {
        const priceBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (priceBooks.length === 0) {
            if (noPriceBooksMessage) noPriceBooksMessage.classList.remove('hidden');
            if (priceBooksGridContainer) priceBooksGridContainer.classList.add('hidden');
        } else {
            if (noPriceBooksMessage) noPriceBooksMessage.classList.add('hidden');
            if (priceBooksGridContainer) priceBooksGridContainer.classList.remove('hidden');
        }
        priceBooksGrid.updateConfig({ data: priceBooks }).forceRender();
    }, (error) => {
        console.error("Error fetching price books:", error);
        showMessageBox("Error loading price books.");
    });


    // NEW: Setup all accordion click listeners centrally
    setupAccordionListeners();

    // Initial authentication check
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("User is authenticated:", user.uid);
            if (userDisplayName) userDisplayName.textContent = user.displayName || user.email || 'User';
            if (userIdDisplay) userIdDisplay.textContent = `(ID: ${user.uid})`;

            // Fetch user role
            try {
                const userDoc = await getDoc(getDocRef('users_data', user.uid));
                let role = 'Standard';
                if (userDoc.exists()) {
                    role = userDoc.data().role || 'Standard';
                } else {
                    // Create user_data entry if it doesn't exist (first time sign-in)
                    await setDoc(getDocRef('users_data', user.uid), {
                        email: user.email,
                        displayName: user.displayName || user.email,
                        role: 'Standard', // Default role
                        createdAt: serverTimestamp(),
                        lastLogin: serverTimestamp(),
                    }, { merge: true }); // Use merge to avoid overwriting existing data if any
                }
                currentUserRole = role; // Assign to the data variable
                if (userRole) userRole.textContent = `(Role: ${role})`; // Update DOM element
                if (adminMenuItem) {
                    if (role === 'Admin') {
                        adminMenuItem.classList.remove('hidden');
                    } else {
                        adminMenuItem.classList.add('hidden');
                    }
                }
            } catch (error) {
                console.error("Error fetching/setting user role:", error);
                showMessageBox("Error loading user profile.");
                if (userRole) userRole.textContent = `(Role: Error)`;
            }

            if (authSection) authSection.classList.add('hidden');
            showSection('dashboard-section'); // Show dashboard by default after login
            loadDashboardData(); // Load dashboard data after user is authenticated
        } else {
            console.log("User is not authenticated. Signing in anonymously...");
            try {
                // Use __initial_auth_token if provided by Canvas, otherwise sign in anonymously
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                    console.log("Signed in with custom token.");
                } else {
                    await signInAnonymously(auth);
                    console.log("Signed in anonymously.");
                }
            } catch (anonError) {
                console.error("Anonymous Sign-In Error:", anonError);
                if (authErrorMessage) { // Null check
                    authErrorMessage.textContent = `Anonymous sign-in failed: ${anonError.message}`;
                    authErrorMessage.classList.remove('hidden');
                }
            }
            if (authSection) authSection.classList.remove('hidden');
            showSection('auth-section');
        }
    });
}


// Make functions globally accessible for inline onclick attributes (e.g., in Grid.js formatters)
window.handleEditCustomer = handleEditCustomer;
window.handleDeleteCustomer = handleDeleteCustomer; // ADDED THIS LINE
window.handleEditLead = handleEditLead;
window.handleDeleteLead = handleDeleteLead;
window.handleEditOpportunity = handleEditOpportunity;
window.handleDeleteOpportunity = handleDeleteOpportunity;
window.handleEditWorkLog = handleEditWorkLog; // For editing individual work logs
window.handleDeleteWorkLog = handleDeleteWorkLog; // For deleting individual work logs
window.handleEditQuote = handleEditQuote;
window.handleDeleteQuote = handleDeleteQuote;
window.handleEditQuoteLine = handleEditQuoteLine; // For editing individual quote lines
window.handleDeleteQuoteLine = handleDeleteQuoteLine; // For deleting individual quote lines
window.handleEditCountry = handleEditCountry;
window.handleDeleteCountry = handleDeleteCountry;
window.handleEditCurrency = handleEditCurrency;
window.handleDeleteCurrency = handleDeleteCurrency;
window.handleEditPriceBook = handleEditPriceBook;
window.handleDeletePriceBook = handleDeletePriceBook;

// Other globally used functions
window.showMessageBox = showMessageBox; // For modal alerts/confirms
window.showWorkLogForm = showWorkLogForm; // If called directly from HTML (e.g. from Add button in Opportunity)
window.showQuotesForOpportunity = showQuotesForOpportunity; // For filtering quotes grid
window.clearQuotesFilter = clearQuotesFilter; // For clearing quotes filter
