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
let customerContactMethodSelect ;
let noCustomersMessage;
let customerTypeSelect;
let customerCountrySelect ;
let customerSearchInput;
let customersGrid; // Grid.js instance
let customerIndustrySelect ;
let customerSourceSelect ;
let customerActiveCheckbox ;
let customerFormMessage ;
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
let leadFormMessage ;


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

let workLogsSectionContainer;
let addWorkLogEntryBtn;
let workLogFormContainer;
let workLogForm;
let cancelWorkLogBtn;
let workLogsList;
let noWorkLogsMessage;
let workLogFormMessage;
let workLogTypeSelect; // Added for easy access

let mainOpportunityDetailsAccordion ;
let opportunityAccordionsGrid ;


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

// Quote Customer Contact Fields (Corrected to match usage)
let quoteCustomerContactNameInput;
let quoteCustomerPhoneInput;
let quoteCustomerEmailInput;
let quoteCustomerAddressInput;

let quoteStatusSelect; // Status dropdown for quotes
let quoteFormMessage;
let mainQuoteDetailsAccordion; // Reference to the main details accordion in Quotes
let quoteAccordionsGrid; // Reference to the grid container for quote accordions

// Quote Line related DOM elements
let quoteLinesSectionContainer, addQuoteLineEntryBtn, quoteLineFormContainer, quoteLineForm, cancelQuoteLineBtn;
let quoteLinesList, noQuoteLinesMessage;
let quoteLineServicesInput, quoteLineDescriptionInput, quoteLineStartDateInput, quoteLineEndDateInput;
let quoteLineUnitPriceInput, quoteLineQuantityInput, quoteLineDiscountInput, quoteLineAdjustmentAmountInput, quoteLineFinalNetSpan;
let quoteLineFormMessage;

let addCountryBtn;
let countryFormContainer;
let countryForm;
let cancelCountryBtn;
let countriesGridContainer;
let noCountriesMessage;
let countrySearchInput;
let countriesGrid;
let countryFormMessage ;

let addCurrencyBtn;
let currencyFormContainer;
let currencyForm;
let cancelCurrencyBtn;
let currenciesGridContainer;
let noCurrenciesMessage;
let currencySearchInput;
let currenciesGrid;
let currencyCountrySelect;
let currencyFormMessage ;


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
 * @param {boolean} isOpen - True to open (show content, arrow down), false to close (hide content, arrow up).
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
        icon.style.transform = 'rotate(0deg)'; // Down arrow for open state
        accordionHeader.classList.add('expanded');
    } else {
        content.classList.add('hidden');
        icon.style.transform = 'rotate(180deg)'; // Up arrow for closed state
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

    if (workLog) {
        document.getElementById('work-log-id').value = workLog.id;
        document.getElementById('work-log-opportunity-id').value = workLog.opportunityId;
        const logDate = workLog.date ? new Date(workLog.date.seconds * 1000).toISOString().split('T')[0] : '';
        document.getElementById('work-log-date').value = logDate;
        workLogTypeSelect.value = log.type || '';
        document.getElementById('work-log-details').value = log.details || '';
    } else {
        if (workLogForm) workLogForm.reset();
        const workLogIdInput = document.getElementById('work-log-id');
        if (workLogIdInput) workLogIdInput.value = '';
        const workLogOpportunityIdInput = document.getElementById('work-log-opportunity-id');
        if (workLogOpportunityIdInput) workLogOpportunityIdInput.value = currentOpportunityId || ''; // Ensure opportunity ID is set for new logs
    }
    showWorkLogForm();
}

function showWorkLogForm() { // Made this function explicitly separate for clarity and global access
    if (workLogFormContainer) workLogFormContainer.classList.remove('hidden');
}

function hideWorkLogForm() {
    if (workLogFormContainer) {
        workLogFormContainer.classList.add('hidden');
    }
    if (workLogForm) {
        workLogForm.reset();
        workLogForm.setAttribute('novalidate', 'novalidate');
    }
    const workLogIdInput = document.getElementById('work-log-id');
    const workLogOpportunityIdInput = document.getElementById('work-log-opportunity-id');

    if (workLogIdInput) workLogIdInput.value = '';
    if (workLogOpportunityIdInput) workLogOpportunityIdInput.value = '';
    
    if (workLogFormMessage) {
        showMessageBox(workLogFormMessage, '', false);
    } else {
        console.warn("workLogFormMessage element not found or not yet initialized in hideWorkLogForm.");
    }
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

/**
async function handleSaveLead(event) {
    event.preventDefault(); // Prevent default form submission
    if (!db || !userId) {
        showMessageBox("Authentication required to save lead.", false);
        return;
    }

    const leadId = document.getElementById('lead-id').value;
    const messageElement = document.getElementById('lead-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    // --- Start Client-Side Validation ---
    const requiredFields = leadForm.querySelectorAll('[required]');
    let firstInvalidField = null;

    for (const field of requiredFields) {
        // Special handling for multi-select: check if at least one option is selected
        if (field.tagName === 'SELECT' && field.multiple) {
            const selectedOptions = Array.from(field.options).filter(option => option.selected);
            if (selectedOptions.length === 0) {
                firstInvalidField = field;
                break;
            }
        } else if (!field.value) {
            firstInvalidField = field;
            break;
        }
    }

    if (firstInvalidField) {
        console.warn('Validation failed: Required field is empty.', firstInvalidField);
        firstInvalidField.focus(); // Focus on the invalid field
        messageElement.textContent = `Please fill in the required field: ${firstInvalidField.labels ? firstInvalidField.labels[0].textContent : firstInvalidField.id.replace(/-/g, ' ')}.`;
        messageElement.classList.remove('hidden');
        return; // Stop form submission
    }
    // --- End Client-Side Validation ---

    const eventDateValue = document.getElementById('lead-event-date').value;
    const eventDateTimestamp = eventDateValue ? new Date(eventDateValue) : null;

    // NEW: Capture selected services from multi-select as an array
    const selectedServices = Array.from(leadServicesInterestedSelect.options)
        .filter(option => option.selected)
        .map(option => option.value);

    const leadData = {
        contactName: document.getElementById('lead-contact-name').value,
        phone: document.getElementById('lead-phone').value,
        email: document.getElementById('lead-email').value,
        servicesInterested: selectedServices, // NEW: Save as array
        eventDate: eventDateTimestamp, // Save as Date object (Firestore converts to Timestamp)
        source: document.getElementById('lead-source').value,
        additionalDetails: document.getElementById('lead-additional-details').value,
        creatorId: userId, // Added creatorId as per rules
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    // --- START DEBUG LOGGING ---
    console.log("Attempting to save lead with data:", JSON.stringify(leadData, null, 2));
    // --- END DEBUG LOGGING ---

    try {
        const collectionRef = collection(db, 'leads'); // Top-level collection
        if (leadId) {
            // For update, only update updatedAt, not createdAt
            delete leadData.createdAt; // Ensure createdAt is not sent on update
            await updateDoc(doc(collectionRef, leadId), leadData);
            showMessageBox("Lead updated successfully!", false);
        } else {
            await addDoc(collectionRef, leadData);
            showMessageBox("Lead added successfully!", false);
        }
        hideLeadForm();
        await loadLeads(); // Reload grid
    } catch (error) {
        console.error("Error saving lead:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving lead: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}*/

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
 * Calculates the Opportunity Net based on Value, Discount, and Adjustment.
 * Formula: Opportunity Net = (Value - (Value * (Opportunity Discount / 100))) - Adjustment Amt
 */
function calculateOpportunityNet() {
    const value = parseFloat(opportunityValueInput.value) || 0;
    const discount = parseFloat(opportunityDiscountInput.value) || 0;
    const adjustment = parseFloat(adjustmentAmtInput.value) || 0;

    let net = value - (value * (discount / 100));
    net = net - adjustment;

    // Ensure net is not negative and format to 2 decimal places
    opportunityNetDisplay.textContent = Math.max(0, net).toFixed(2);
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

async function setupOpportunityForm(opportunityData = null) {
    console.log('setupOpportunityForm called with opportunityData:', opportunityData);
    await populateOpportunityCustomers();
    await populateOpportunityCurrencies();
    populateServicesInterested(opportunityServicesInterestedSelect);

    if (opportunityData) { // Edit mode
        currentOpportunityId = opportunityData.id;
        document.getElementById('opportunity-id').value = opportunityData.id;
        document.getElementById('opportunity-name').value = opportunityData.name || '';
        document.getElementById('opportunity-customer').value = opportunityData.customerId || '';
        if (opportunityCurrencySelect) opportunityCurrencySelect.value = opportunityData.currency || '';

        await filterAndPopulatePriceBooks(opportunityData.currency, opportunityData.priceBookId);

        const startDate = opportunityData.expectedStartDate ? new Date(opportunityData.expectedStartDate.seconds * 1000).toISOString().split('T')[0] : '';
        const closeDate = opportunityData.expectedCloseDate ? new Date(opportunityData.expectedCloseDate.seconds * 1000).toISOString().split('T')[0] : '';

        if (document.getElementById('opportunity-start-date')) document.getElementById('opportunity-start-date').value = startDate;
        if (document.getElementById('opportunity-close-date')) document.getElementById('opportunity-close-date').value = closeDate;
        if (document.getElementById('opportunity-sales-stage')) document.getElementById('opportunity-sales-stage').value = opportunityData.salesStage || 'Prospect';
        if (document.getElementById('opportunity-probability')) document.getElementById('opportunity-probability').value = opportunityData.probability !== undefined ? opportunityData.probability : '';
        if (document.getElementById('opportunity-value')) document.getElementById('opportunity-value').value = opportunityData.value !== undefined ? opportunityData.value : '';
        if (document.getElementById('opportunity-notes')) document.getElementById('opportunity-notes').value = opportunityData.notes || '';

        if (opportunityDiscountInput) opportunityDiscountInput.value = opportunityData.opportunityDiscount !== undefined ? opportunityData.opportunityDiscount : 0;
        if (adjustmentAmtInput) adjustmentAmtInput.value = opportunityData.adjustmentAmt !== undefined ? opportunityData.adjustmentAmt : 0;

        calculateOpportunityNet();

        // Set selected options for multi-select
        if (opportunityServicesInterestedSelect) {
            Array.from(opportunityServicesInterestedSelect.options).forEach(option => {
                option.selected = opportunityData.servicesInterested && opportunityData.servicesInterested.includes(option.value);
            });
        }

        // --- Layout Adjustment for EDIT mode ---
        if (mainOpportunityDetailsAccordion) {
            mainOpportunityDetailsAccordion.classList.remove('md:col-span-full'); // Main details takes half width
            const mainDetailsHeader = mainOpportunityDetailsAccordion.querySelector('.accordion-header');
            if (mainDetailsHeader) {
                setAccordionVisualState(mainDetailsHeader, true); // True for OPEN
            }
        }

        if (workLogsSectionContainer) {
            workLogsSectionContainer.classList.remove('hidden'); // Show work logs container
            const workLogsAccordionHeader = workLogsSectionContainer.querySelector('.accordion-header');
            if (workLogsAccordionHeader) {
                setAccordionVisualState(workLogsAccordionHeader, false); // False for CLOSED
            }
            if (workLogForm) {
                workLogForm.removeAttribute('novalidate');
            }
        }
        await loadWorkLogs(opportunityData.id); // Load work logs for this opportunity
        // --- End Layout Adjustment for EDIT mode ---

    } else { // For a new opportunity (ADD mode)
        if (opportunityForm) opportunityForm.reset();
        const opportunityIdInput = document.getElementById('opportunity-id');
        if (opportunityIdInput) opportunityIdInput.value = '';
        currentOpportunityId = null;
        if (workLogsList) workLogsList.innerHTML = '';
        if (noWorkLogsMessage) noWorkLogsMessage.classList.remove('hidden');
        
        hideWorkLogForm(); // Call hideWorkLogForm, which now handles its own null checks for elements

        // Clear multi-select
        if (opportunityServicesInterestedSelect) {
            Array.from(opportunityServicesInterestedSelect.options).forEach(option => option.selected = false);
        }

        // --- Layout Adjustment for ADD mode ---
        if (workLogsSectionContainer) {
            workLogsSectionContainer.classList.add('hidden'); // Hide work logs container
            if (workLogForm) {
                workLogForm.setAttribute('novalidate', 'novalidate');
            }
        }
        if (mainOpportunityDetailsAccordion) {
            mainOpportunityDetailsAccordion.classList.add('md:col-span-full'); // Main details spans full width
            const mainDetailsHeader = mainOpportunityDetailsAccordion.querySelector('.accordion-header');
            if (mainDetailsHeader) {
                setAccordionVisualState(mainDetailsHeader, true); // True for OPEN
            }
        }
        // --- End Layout Adjustment for ADD mode ---

        filterAndPopulatePriceBooks('');
        if (opportunityDiscountInput) opportunityDiscountInput.value = 0;
        if (adjustmentAmtInput) adjustmentAmtInput.value = 0;
        calculateOpportunityNet();
    }
    showOpportunityForm();
    console.log('Add/Edit Opportunity form setup complete. currentOpportunityId:', currentOpportunityId);
}


async function handleSaveOpportunity(event) {
    event.preventDefault(); // Prevent default form submission
    console.log('handleSaveOpportunity: Form submit event triggered.'); // Diagnostic log

    if (!db || !userId) {
        showMessageBox("Authentication required to save opportunity.", false);
        return;
    }

    const opportunityId = document.getElementById('opportunity-id').value;
    const messageElement = document.getElementById('opportunity-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    // --- Start Client-Side Validation ---
    const requiredFields = opportunityForm.querySelectorAll('[required]');
    let firstInvalidField = null;

    for (const field of requiredFields) {
        if (!field.value) {
            firstInvalidField = field;
            break;
        }
    }

    if (firstInvalidField) {
        console.warn('Validation failed: Required field is empty.', firstInvalidField);
        // Find the parent accordion of the invalid field
        let parentAccordionContent = firstInvalidField.closest('.accordion-content');
        if (parentAccordionContent && parentAccordionContent.classList.contains('hidden')) {
            const parentAccordionHeader = parentAccordionContent.previousElementSibling;
            if (parentAccordionHeader) {
                console.log('Opening parent accordion:', parentAccordionHeader.textContent.trim());
                parentAccordionHeader.click(); // Programmatically click to open
            }
        }
        firstInvalidField.focus(); // Focus on the invalid field
        messageElement.textContent = `Please fill in the required field: ${firstInvalidField.labels ? firstInvalidField.labels[0].textContent : firstInvalidField.id.replace(/-/g, ' ')}.`;
        messageElement.classList.remove('hidden');
        return; // Stop form submission
    }
    // --- End Client-Side Validation ---

    // Get selected services from multi-select
    const selectedServices = Array.from(opportunityServicesInterestedSelect.options)
        .filter(option => option.selected)
        .map(option => option.value);

    const customerId = document.getElementById('opportunity-customer').value;
    let customerName = '';
    if (customerId) {
        try {
            // Fetch customer name from the top-level customer collection
            const customerSnap = await getDoc(doc(db, 'customers', customerId));
            if (customerSnap.exists()) {
                customerName = customerSnap.data().name;
            }
        } catch (error) {
            console.error("Error fetching customer name for opportunity:", error);
            customerName = 'Unknown Customer'; // Fallback
        }
    }

    const expectedStartDateValue = document.getElementById('opportunity-start-date').value;
    const expectedStartDateTimestamp = expectedStartDateValue ? new Date(expectedStartDateValue) : null;

    const expectedCloseDateValue = document.getElementById('opportunity-close-date').value;
    const expectedCloseDateTimestamp = expectedCloseDateValue ? new Date(expectedCloseDateValue) : null;

    // NEW: Get values for discount and adjustment
    const opportunityValue = parseFloat(opportunityValueInput.value) || 0;
    const opportunityDiscount = parseFloat(opportunityDiscountInput.value) || 0;
    const adjustmentAmt = parseFloat(adjustmentAmtInput.value) || 0;

    // NEW: Calculate Opportunity Net based on the formula
    let opportunityNet = opportunityValue - (opportunityValue * (opportunityDiscount / 100));
    opportunityNet = opportunityNet - adjustmentAmt;
    opportunityNet = Math.max(0, opportunityNet); // Ensure it's not negative

    const opportunityData = {
        name: document.getElementById('opportunity-name').value,
        customerId: customerId,
        customerName: customerName, // Added customerName as per rules
        currency: opportunityCurrencySelect.value, // Get value from the select
        priceBookId: opportunityPriceBookSelect.value, // Get value from the select
        expectedStartDate: expectedStartDateTimestamp, // Save as Date object (Firestore converts to Timestamp)
        expectedCloseDate: expectedCloseDateTimestamp, // Save as Date object (Firestore converts to Timestamp)
        salesStage: document.getElementById('opportunity-sales-stage').value,
        probability: parseFloat(document.getElementById('opportunity-probability').value) || 0,
        value: opportunityValue, // Use parsed value
        opportunityDiscount: opportunityDiscount, // NEW
        adjustmentAmt: adjustmentAmt, // NEW
        opportunityNet: opportunityNet, // NEW (calculated)
        notes: document.getElementById('opportunity-notes').value,
        servicesInterested: selectedServices, // NEW: Add selected services
        creatorId: userId, // Added creatorId as per rules
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        // Opportunities are top-level as per provided rules
        const collectionRef = collection(db, 'opportunities');
        let savedOpportunityId; // Variable to hold the ID of the saved/created opportunity

        if (opportunityId) {
            // Update existing opportunity
            delete opportunityData.createdAt;
            await updateDoc(doc(collectionRef, opportunityId), opportunityData);
            savedOpportunityId = opportunityId;
            showMessageBox("Opportunity updated successfully!", false);
            hideOpportunityForm(); // Hide form after update
        } else {
            // Create new opportunity
            const docRef = await addDoc(collectionRef, opportunityData);
            savedOpportunityId = docRef.id;
            showMessageBox("Opportunity added successfully! You can now add work logs.", false);

            // Instead of hiding, re-setup the form with the new ID to allow adding work logs
            // This will keep the form open and load work logs for the newly created opportunity
            // Fetch the full data of the newly created opportunity to pass to setupOpportunityForm
            const newOpportunitySnap = await getDoc(doc(collectionRef, savedOpportunityId));
            if (newOpportunitySnap.exists()) {
                await setupOpportunityForm({ id: newOpportunitySnap.id, ...newOpportunitySnap.data() });
            } else {
                console.error("Could not retrieve newly created opportunity data.");
                // Fallback: just set currentOpportunityId and hope for the best, or show error
                currentOpportunityId = savedOpportunityId;
                if (workLogsSectionContainer) workLogsSectionContainer.classList.remove('hidden');
            }
        }

        await loadOpportunities(); // Reload grid
        await updateDashboard();

    } catch (error) {
        console.error("Error saving opportunity:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving opportunity: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}
/**
 * Handles the editing of an existing opportunity.
 * Fetches the opportunity data and passes it to setupOpportunityForm.
 * @param {string} opportunityId The ID of the opportunity document to edit.
 */
async function handleEditOpportunity(opportunityId) {
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
 * Handles the deletion of an opportunity document and its associated work logs from Firestore.
 * Prompts for confirmation before proceeding with deletion.
 * @param {string} opportunityId The ID of the opportunity document to delete.
 */
async function handleDeleteOpportunity(opportunityId) { // Now async
    showMessageBox("Are you sure you want to delete this opportunity and all its work logs? This action cannot be undone.", 'confirm', async (confirmed) => {
        if (confirmed) {
            try {
                // Delete subcollection documents first (workLogs)
                const workLogsSnapshot = await getDocs(collection(getDocRef('opportunities', opportunityId), 'workLogs'));
                const deleteWorkLogPromises = [];
                workLogsSnapshot.forEach(doc => {
                    deleteWorkLogPromises.push(deleteDoc(doc.ref));
                });
                await Promise.all(deleteWorkLogPromises);

                // Then delete the parent opportunity document
                await deleteDoc(getDocRef('opportunities', opportunityId));
                showMessageBox("Opportunity and its work logs deleted successfully!");
            } catch (error) {
                console.error("Error deleting opportunity:", error);
                showMessageBox(`Error deleting opportunity: ${error.message}`, 'alert', true);
            }
        }
    });
}



async function loadOpportunities() {
    if (!db || !userId) {
        if (noOpportunitiesMessage) noOpportunitiesMessage.classList.remove('hidden');
        if (opportunitiesGrid) opportunitiesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    // Query only for current user's opportunities (top-level collection)
    onSnapshot(query(collection(db, 'opportunities'), where('creatorId', '==', userId)), async snapshot => {
        const opportunities = [];
        for (const docSnap of snapshot.docs) { // Renamed doc to docSnap to avoid conflict with import
            const opp = { id: docSnap.id, ...docSnap.data() };
            // customerName is now stored directly in the opportunity document, no need to fetch
            // Convert Firestore Timestamps to YYYY-MM-DD string for display
            opp.expectedStartDate = opp.expectedStartDate && opp.expectedStartDate.toDate ? opp.expectedStartDate.toDate().toISOString().split('T')[0] : 'N/A';
            opp.expectedCloseDate = opp.expectedCloseDate && opp.expectedCloseDate.toDate ? opp.expectedCloseDate.toDate().toISOString().split('T')[0] : 'N/A';
            // Display services as a comma-separated string
            opp.servicesInterestedDisplay = Array.isArray(opp.servicesInterested) ? opp.servicesInterested.join(', ') : 'N/A';

            // Add quote count to the opportunity data
            opp.quoteCount = opportunityQuoteCounts.get(opp.id) || 0;

            opportunities.push(opp);
        }
        renderOpportunitiesGrid(opportunities);
    }, error => {
        console.error("Error loading opportunities in real-time:", error);
        showMessageBox(`Error loading opportunities: ${error.message}`, false);
        if (noOpportunitiesMessage) noOpportunitiesMessage.classList.remove('hidden');
        if (opportunitiesGrid) opportunitiesGrid.updateConfig({ data: [] }).forceRender();
    });
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

async function handleSaveWorkLog(event) {
    event.preventDefault();
    console.log('handleSaveWorkLog: Form submit event triggered.'); // Diagnostic log
    if (!db || !userId || !currentOpportunityId) {
        showMessageBox("Authentication or selected opportunity required to save work log.", false);
        return;
    }

    const workLogId = document.getElementById('work-log-id').value;
    const messageElement = document.getElementById('work-log-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    // --- Start Client-Side Validation for Work Log ---
    const requiredFields = workLogForm.querySelectorAll('[required]');
    let firstInvalidField = null;

    for (const field of requiredFields) {
        if (!field.value) {
            firstInvalidField = field;
            break;
        }
    }

    if (firstInvalidField) {
        console.warn('Work Log Validation failed: Required field is empty.', firstInvalidField);
        firstInvalidField.focus(); // Focus on the invalid field
        messageElement.textContent = `Please fill in the required field: ${firstInvalidField.labels ? firstInvalidField.labels[0].textContent : firstInvalidField.id.replace(/-/g, ' ')}.`;
        messageElement.classList.remove('hidden');
        return; // Stop form submission
    }
    // --- End Client-Side Validation for Work Log ---

    const workLogDateValue = document.getElementById('work-log-date').value;
    const workLogDateTimestamp = workLogDateValue ? new Date(workLogDateValue) : null;

    const workLogData = {
        opportunityId: currentOpportunityId, // Stored for reference, but path is now subcollection
        date: workLogDateTimestamp, // Save as Date object (Firestore converts to Timestamp)
        type: workLogTypeSelect.value, // Get value from the select
        details: document.getElementById('work-log-details').value,
        creatorId: userId, // Added creatorId as per rules
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        // Work logs are a subcollection of top-level opportunities
        const collectionRef = collection(db, `opportunities/${currentOpportunityId}/workLogs`);
        if (workLogId) {
            // For update, only update updatedAt, not createdAt
            delete workLogData.createdAt;
            await updateDoc(doc(collectionRef, workLogId), workLogData);
            showMessageBox("Work log updated successfully!", false);
        } else {
            await addDoc(collectionRef, workLogData);
            showMessageBox("Work log added successfully!", false);
        }
        hideWorkLogForm();
        // loadWorkLogs is already onSnapshot, so it will update automatically
    } catch (error) {
        console.error("Error saving work log:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving work log: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
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
 * Handles the editing of an existing work log entry.
 * Populates the work log form with existing data and shows the form.
 * @param {string} workLogId The ID of the work log document to edit.
 * @param {object} workLogData The data of the work log entry (passed from renderWorkLogs).
 */
function handleEditWorkLog(workLogId, workLogData) {
    showWorkLogForm(); // Show the work log form
    if (document.getElementById('work-log-id')) document.getElementById('work-log-id').value = workLogId;
    if (document.getElementById('work-log-opportunity-id')) document.getElementById('work-log-opportunity-id').value = currentOpportunityId; // Ensure parent ID is set

    // Populate form fields
    if (document.getElementById('work-log-date')) {
        const date = workLogData.date ? new Date(workLogData.date.seconds * 1000).toISOString().split('T')[0] : '';
        document.getElementById('work-log-date').value = date;
    }
    
    // Populate work log type dropdown (assuming populateWorkLogTypes exists and is called)
    populateWorkLogTypes(); // Ensure dropdown is populated before setting value
    if (workLogTypeSelect) workLogTypeSelect.value = workLogData.type || '';
    
    if (document.getElementById('work-log-details')) document.getElementById('work-log-details').value = workLogData.details || '';

    if (workLogFormMessage) showMessageBox(workLogFormMessage, '', false); // Clear any previous messages
}



/**
 * Handles the deletion of a specific work log entry within an opportunity.
 * Prompts for confirmation before proceeding with deletion.
 * @param {string} workLogId The ID of the work log document to delete.
 */
async function handleDeleteWorkLog(workLogId) { // Now async
    showMessageBox("Are you sure you want to delete this work log entry? This action cannot be undone.", 'confirm', async (confirmed) => {
        if (confirmed) {
            try {
                const parentOpportunityId = document.getElementById('work-log-opportunity-id')?.value || currentOpportunityId;
                
                if (!parentOpportunityId) {
                    showMessageBox('Parent opportunity ID is missing. Cannot delete work log.', 'alert', true);
                    return;
                }

                await deleteDoc(doc(collection(getDocRef('opportunities', parentOpportunityId), 'workLogs'), workLogId));
                showMessageBox("Work log entry deleted successfully!");
            } catch (error) {
                console.error("Error deleting work log:", error);
                showMessageBox(`Error deleting work log: ${error.message}`, 'alert', true);
            }
        }
    });
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
async function handleDeleteCountry(countryId) { // Now async
    showMessageBox("Are you sure you want to delete this country? This action cannot be undone.", 'confirm', async (confirmed) => {
        if (confirmed) {
            try {
                await deleteDoc(getDocRef('countries', countryId));
                showMessageBox("Country deleted successfully!");
            } catch (error) {
                console.error("Error deleting country:", error);
                showMessageBox(`Error deleting country: ${error.message}`, 'alert', true);
            }
        }
    });
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
            await populateCurrencyCountries(); // Assuming this populates the options
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
async function handleDeleteCurrency(currencyId) { // Now async
    showMessageBox("Are you sure you want to delete this currency? This action cannot be undone.", 'confirm', async (confirmed) => {
        if (confirmed) {
            try {
                await deleteDoc(getDocRef('currencies', currencyId));
                showMessageBox("Currency deleted successfully!");
            } catch (error) {
                console.error("Error deleting currency:", error);
                showMessageBox(`Error deleting currency: ${error.message}`, 'alert', true);
            }
        }
    });
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
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        showMessageBox("Admin privileges required to save currency.", false);
        return;
    }

    const currencyId = document.getElementById('currency-id').value;
    const messageElement = document.getElementById('currency-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    const currencyData = {
        name: document.getElementById('currency-name').value,
        code: document.getElementById('currency-code').value.toUpperCase(),
        symbol: document.getElementById('currency-symbol').value,
        countryCode: document.getElementById('currency-country').value || null, // Save country code
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        const collectionRef = collection(db, 'currencies'); // Top-level collection
        if (currencyId) {
            // For update, only update updatedAt, not createdAt
            delete currencyData.createdAt;
            await updateDoc(doc(collectionRef, currencyId), currencyData);
            showMessageBox("Currency updated successfully!", false);
        } else {
            await addDoc(collectionRef, currencyData);
            showMessageBox("Currency added successfully!", false);
        }
        hideCurrencyForm();
        await loadCurrencies();
    } catch (error) {
        console.error("Error saving currency:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving currency: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
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
    if (!db || userRole !== 'Admin') { // Check for 'Admin' role
        showMessageBox("Admin privileges required to save price book.", false);
        return;
    }

    const priceBookId = document.getElementById('price-book-id').value;
    const messageElement = document.getElementById('price-book-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    const name = document.getElementById('price-book-name').value;
    const currency = document.getElementById('price-book-currency').value;

    const priceBookData = {
        name: name,
        normalizedName: name.toLowerCase().replace(/\s/g, ''), // Add normalizedName
        description: document.getElementById('price-book-description').value,
        currency: currency,
        normalizedCurrency: currency.toLowerCase().replace(/\s/g, ''), // Add normalizedCurrency
        isActive: document.getElementById('price-book-active').checked, // Use isActive
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        const collectionRef = collection(db, 'priceBooks'); // Top-level collection
        if (priceBookId) {
            // For update, only update updatedAt, not createdAt
            delete priceBookData.createdAt;
            await updateDoc(doc(collectionRef, priceBookId), priceBookData);
            showMessageBox("Price Book updated successfully!", false);
        } else {
            await addDoc(collectionRef, priceBookData);
            showMessageBox("Price Book added successfully!", false);
        }
        hidePriceBookForm();
        await loadPriceBooks();
    } catch (error) {
        console.error("Error saving price book:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving price book: ${error.message}`;
            messageElement.classList.remove('hidden');
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
            await populatePriceBookCurrencies(); // Assuming this populates the options
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
async function handleDeletePriceBook(priceBookId) { // Now async
    showMessageBox("Are you sure you want to delete this price book? This action cannot be undone.", 'confirm', async (confirmed) => {
        if (confirmed) {
            try {
                await deleteDoc(getDocRef('priceBooks', priceBookId));
                showMessageBox("Price Book deleted successfully!");
            } catch (error) {
                console.error("Error deleting price book:", error);
                showMessageBox(`Error deleting price book: ${error.message}`, 'alert', true);
            }
        }
    });
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

async function setupQuoteForm(quoteData = null) {
    console.log('setupQuoteForm called with quoteData:', quoteData);
    await populateQuoteOpportunities();
    await populateQuoteStatus();

    if (quoteData) { // Edit mode
        currentQuoteId = quoteData.id;
        if (document.getElementById('quote-id')) document.getElementById('quote-id').value = quoteData.id;
        if (document.getElementById('quote-name')) document.getElementById('quote-name').value = quoteData.quoteName || '';
        if (document.getElementById('event-name')) document.getElementById('event-name').value = quoteData.eventName || '';
        if (quoteOpportunitySelect) quoteOpportunitySelect.value = quoteData.opportunityId || '';
        if (document.getElementById('quote-amount')) document.getElementById('quote-amount').value = quoteData.quoteAmount !== undefined ? quoteData.quoteAmount.toFixed(2) : '0.00';
        if (quoteStatusSelect) quoteStatusSelect.value = quoteData.status || 'Draft';
        if (document.getElementById('quote-additional-details')) document.getElementById('quote-additional-details').value = quoteData.additionalDetails || '';

        const eventDate = quoteData.eventDate ? new Date(quoteData.eventDate.seconds * 1000).toISOString().split('T')[0] : '';
        if (document.getElementById('quote-event-date')) document.getElementById('quote-event-date').value = eventDate;

        await populateCustomerDetailsForQuote(quoteData.opportunityId);

        // --- Layout Adjustment for EDIT mode ---
        if (mainQuoteDetailsAccordion) {
            mainQuoteDetailsAccordion.classList.remove('md:col-span-full'); // Main details takes half width
            const mainDetailsHeader = mainQuoteDetailsAccordion.querySelector('.accordion-header');
            if (mainDetailsHeader) {
                setAccordionVisualState(mainDetailsHeader, true); // True for OPEN
            }
        }

        if (quoteLinesSectionContainer) {
            quoteLinesSectionContainer.classList.remove('hidden'); // Show quote lines container
            const quoteLinesAccordionHeader = quoteLinesSectionContainer.querySelector('.accordion-header');
            if (quoteLinesAccordionHeader) {
                setAccordionVisualState(quoteLinesAccordionHeader, false); // False for CLOSED
            }
            if (quoteLineForm) {
                quoteLineForm.removeAttribute('novalidate');
            }
        }
        await loadQuoteLines(quoteData.id); // Load quote lines for this quote
        // --- End Layout Adjustment for EDIT mode ---

    } else { // For a new quote (ADD mode)
        if (quoteForm) quoteForm.reset();
        const quoteIdInput = document.getElementById('quote-id');
        if (quoteIdInput) quoteIdInput.value = '';
        currentQuoteId = null;
        populateCustomerDetailsForQuote(''); // Clear customer details
        if (document.getElementById('quote-amount')) document.getElementById('quote-amount').value = '0.00'; // Reset quote amount for new quote
        if (quoteLinesList) quoteLinesList.innerHTML = ''; // Clear existing quote lines
        if (noQuoteLinesMessage) noQuoteLinesMessage.classList.remove('hidden'); // Show no lines message
        hideQuoteLineForm(); // Hide the quote line entry form (this will set novalidate)

        // --- Layout Adjustment for ADD mode ---
        if (quoteLinesSectionContainer) {
            quoteLinesSectionContainer.classList.add('hidden'); // Hide quote lines container
            if (quoteLineForm) {
                quoteLineForm.setAttribute('novalidate', 'novalidate');
            }
        }
        if (mainQuoteDetailsAccordion) {
            mainQuoteDetailsAccordion.classList.add('md:col-span-full'); // Main details spans full width
            const mainDetailsHeader = mainQuoteDetailsAccordion.querySelector('.accordion-header');
            if (mainDetailsHeader) {
                setAccordionVisualState(mainDetailsHeader, true); // True for OPEN
            }
        }
        // --- End Layout Adjustment for ADD mode ---
    }
    showForm(quoteFormContainer);
    console.log('Add/Edit Quote form setup complete. currentQuoteId:', currentQuoteId);
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

function renderQuoteLines(quoteLines) {
    if (quoteLinesList) { // Null check for quoteLinesList
        quoteLinesList.innerHTML = '';
    }
    if (quoteLines.length === 0) {
        if (noQuoteLinesMessage) { // Null check for noQuoteLinesMessage
            noQuoteLinesMessage.classList.remove('hidden');
        }
    } else {
        if (noQuoteLinesMessage) { // Null check for noQuoteLinesMessage
            noQuoteLinesMessage.classList.add('hidden');
        }
        quoteLines.forEach(line => {
            const li = document.createElement('li');
            li.className = 'bg-gray-50 p-3 rounded-md shadow-sm flex justify-between items-center';
            const startDate = line.serviceStartDate ? new Date(line.serviceStartDate.seconds * 1000).toLocaleDateString() : 'N/A';
            const endDate = line.serviceEndDate ? new Date(line.serviceEndDate.seconds * 1000).toLocaleDateString() : 'N/A';
            li.innerHTML = `
                <div>
                    <p class="font-semibold">${line.services} (Qty: ${line.quantity})</p>
                    <p class="text-sm text-gray-700">Net: ${line.finalNet ? line.finalNet.toFixed(2) : '0.00'}</p>
                    <p class="text-xs text-gray-500">${startDate} - ${endDate}</p>
                    <p class="text-xs text-gray-500">${line.serviceDescription || 'No description.'}</p>
                </div>
                <div>
                    <button class="text-blue-600 hover:text-blue-800 font-semibold mr-2" data-id="${line.id}">Edit</button>
                    <button class="text-red-600 hover:text-red-800 font-semibold" data-id="${line.id}">Delete</button>
                </div>
            `;
            // Attach event listeners using delegation or directly
            li.querySelector('button[data-id][class*="text-blue"]').addEventListener('click', () => handleEditQuoteLine(line.id, line));
            li.querySelector('button[data-id][class*="text-red"]').addEventListener('click', () => handleDeleteQuoteLine(line.id));
            if (quoteLinesList) { // Null check before appending
                quoteLinesList.appendChild(li);
            }
        });
    }
}

function showQuoteLineForm() {
    if (quoteLineFormContainer) { // Null check
        quoteLineFormContainer.classList.remove('hidden');
    }
    if (quoteLineForm) { // Null check
        quoteLineForm.reset();
        quoteLineForm.removeAttribute('novalidate'); // Enable validation when shown
    }
    if (document.getElementById('quote-line-id')) document.getElementById('quote-line-id').value = '';
    if (document.getElementById('quote-line-parent-quote-id')) document.getElementById('quote-line-parent-quote-id').value = currentQuoteId;
    if (quoteLineUnitPriceInput) quoteLineUnitPriceInput.value = 0;
    if (quoteLineQuantityInput) quoteLineQuantityInput.value = 1;
    if (quoteLineDiscountInput) quoteLineDiscountInput.value = 0;
    if (quoteLineAdjustmentAmountInput) quoteLineAdjustmentAmountInput.value = 0;
    
    calculateQuoteLineFinalNet(); // Recalculate for new form
    if (quoteLineFormMessage) { // Null check
        showMessageBox(quoteLineFormMessage, '', false); // Clear previous messages
    }
}

function hideQuoteLineForm() {
    if (quoteLineFormContainer) { // Null check
        quoteLineFormContainer.classList.add('hidden');
    }
    if (quoteLineForm) { // Null check
        quoteLineForm.reset();
        quoteLineForm.setAttribute('novalidate', 'novalidate'); // Disable validation when hidden
    }
    if (document.getElementById('quote-line-id')) document.getElementById('quote-line-id').value = '';
    if (document.getElementById('quote-line-parent-quote-id')) document.getElementById('quote-line-parent-quote-id').value = '';
    if (quoteLineFormMessage) { // Null check
        showMessageBox(quoteLineFormMessage, '', false);
    }
}

function calculateQuoteLineFinalNet() {
    const unitPrice = parseFloat(quoteLineUnitPriceInput ? quoteLineUnitPriceInput.value : 0) || 0;
    const quantity = parseFloat(quoteLineQuantityInput ? quoteLineQuantityInput.value : 0) || 0;
    const discount = parseFloat(quoteLineDiscountInput ? quoteLineDiscountInput.value : 0) || 0;
    const adjustment = parseFloat(quoteLineAdjustmentAmountInput ? quoteLineAdjustmentAmountInput.value : 0) || 0;

    const subtotal = unitPrice * quantity;
    const discountedValue = subtotal - (subtotal * (discount / 100));
    const finalNet = discountedValue - adjustment;

    if (quoteLineFinalNetSpan) { // Null check
        quoteLineFinalNetSpan.textContent = finalNet.toFixed(2);
    }
}

async function handleSaveQuoteLine(event) {
    event.preventDefault();
    // Ensure quoteLineForm is not null before creating FormData
    if (!quoteLineForm) {
        console.error("quoteLineForm is null. Cannot save quote line.");
        if (quoteLineFormMessage) {
            showMessageBox(quoteLineFormMessage, 'Error: Quote line form not found.', true);
        }
        return;
    }
    const formData = new FormData(quoteLineForm);
    const quoteLineId = document.getElementById('quote-line-id').value;
    const parentQuoteId = document.getElementById('quote-line-parent-quote-id').value;

    if (!parentQuoteId) {
        if (quoteLineFormMessage) {
            showMessageBox(quoteLineFormMessage, 'Parent quote not found. Cannot save quote line.', true);
        }
        return;
    }

    const data = {
        services: formData.get('services'),
        serviceDescription: formData.get('serviceDescription'),
        serviceStartDate: formData.get('serviceStartDate') ? new Date(formData.get('serviceStartDate')) : null,
        serviceEndDate: formData.get('serviceEndDate') ? new Date(formData.get('serviceEndDate')) : null,
        unitPrice: parseFloat(formData.get('unitPrice')) || 0,
        quantity: parseInt(formData.get('quantity')) || 0,
        discount: parseFloat(formData.get('discount')) || 0,
        adjustmentAmount: parseFloat(formData.get('adjustmentAmount')) || 0,
        finalNet: parseFloat(quoteLineFinalNetSpan ? quoteLineFinalNetSpan.textContent : 0) || 0, // Use the calculated value
        updatedAt: serverTimestamp(),
    };

    try {
        const quoteLinesCollectionRef = collection(getDocRef('quotes', parentQuoteId), 'quoteLines');
        if (quoteLineId) {
            await updateDoc(doc(quoteLinesCollectionRef, quoteLineId), data);
            if (quoteLineFormMessage) {
                showMessageBox(quoteLineFormMessage, 'Quote line updated successfully!', false);
            }
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(quoteLinesCollectionRef, data);
            if (quoteLineFormMessage) {
                showMessageBox(quoteLineFormMessage, 'Quote line added successfully!', false);
            }
        }
        hideQuoteLineForm();
    } catch (error) {
        console.error("Error saving quote line:", error);
        if (quoteLineFormMessage) {
            showMessageBox(quoteLineFormMessage, `Error saving quote line: ${error.message}`, true);
        }
    }
}


function handleDeleteQuote(quoteId) {
    showMessageBox("Are you sure you want to delete this quote and all its quote lines? This action cannot be undone.", 'confirm', async (confirmed) => {
        if (confirmed) {
            try {
                // Delete subcollection documents first
                const quoteLinesSnapshot = await getDocs(collection(getDocRef('quotes', quoteId), 'quoteLines'));
                const deletePromises = [];
                quoteLinesSnapshot.forEach(doc => {
                    deletePromises.push(deleteDoc(doc.ref));
                });
                await Promise.all(deletePromises);

                // Then delete the parent document
                await deleteDoc(getDocRef('quotes', quoteId));
                showMessageBox("Quote and its lines deleted successfully!");
            } catch (error) {
                console.error("Error deleting quote:", error);
                showMessageBox(`Error deleting quote: ${error.message}`);
            }
        }
    });
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


async function handleSaveQuote(event) {
    event.preventDefault();
    if (!db || userRole !== 'Admin') { // Only Admin can create/update quotes
        showMessageBox("Admin privileges required to save quote.", false);
        return;
    }

    const quoteId = document.getElementById('quote-id').value;
    const messageElement = document.getElementById('quote-form-message');
    if (messageElement) messageElement.classList.add('hidden');

    // --- Client-Side Validation ---
    const requiredFields = quoteForm.querySelectorAll('[required]');
    let firstInvalidField = null;

    for (const field of requiredFields) {
        if (!field.value) {
            firstInvalidField = field;
            break;
        }
    }

    if (firstInvalidField) {
        console.warn('Validation failed: Required field is empty.', firstInvalidField);
        firstInvalidField.focus();
        messageElement.textContent = `Please fill in the required field: ${firstInvalidField.labels ? firstInvalidField.labels[0].textContent : firstInvalidField.id.replace(/-/g, ' ')}.`;
        messageElement.classList.remove('hidden');
        return;
    }
    // --- End Client-Side Validation ---

    const eventDateValue = document.getElementById('quote-event-date').value;
    const eventDateTimestamp = eventDateValue ? new Date(eventDateValue) : null;

    const quoteData = {
        quoteName: document.getElementById('quote-name').value,
        opportunityId: quoteOpportunitySelect.value,
        eventName: document.getElementById('event-name').value,
        // Add null checks before reading values
        customerContactName: customerContactNameInput ? customerContactNameInput.value : '',
        phone: customerPhoneInput ? customerPhoneInput.value : '',
        email: customerEmailInput ? customerEmailInput.value : '',
        customerAddress: customerAddressInput ? customerAddressInput.value : '',
        eventDate: eventDateTimestamp,
        additionalDetails: document.getElementById('quote-additional-details').value,
        quoteAmount: parseFloat(document.getElementById('quote-amount').value) || 0,
        status: quoteStatusSelect.value,
        creatorId: userId, // Set creatorId
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
    };

    try {
        const collectionRef = collection(db, 'quotes');
        if (quoteId) {
            // For update, only update updatedAt, not createdAt
            delete quoteData.createdAt;
            await updateDoc(doc(collectionRef, quoteId), quoteData);
            showMessageBox("Quote updated successfully!", false);
        } else {
            await addDoc(collectionRef, quoteData);
            showMessageBox("Quote added successfully!", false);
        }
        hideQuoteForm();
        await loadQuotes(); // Reload grid
    } catch (error) {
        console.error("Error saving quote:", error);
        if (messageElement) {
            messageElement.textContent = `Error saving quote: ${error.message}`;
            messageElement.classList.remove('hidden');
        }
    }
}

async function loadQuotes() {
    if (!db || !userId) {
        if (noQuotesMessage) noQuotesMessage.classList.remove('hidden');
        if (quotesGrid) quotesGrid.updateConfig({ data: [] }).forceRender();
        return;
    }

    let quotesCollectionRef = collection(db, 'quotes');
    let quotesQuery;

    // Apply filter if an opportunity ID is set
    if (currentQuotesFilterOpportunityId) {
        quotesQuery = query(quotesCollectionRef, where('opportunityId', '==', currentQuotesFilterOpportunityId));
        // Show filter message
        if (quotesFilterDisplay && quotesFilterOpportunityName) {
            quotesFilterOpportunityName.textContent = currentQuotesFilterOpportunityName;
            quotesFilterDisplay.classList.remove('hidden');
        }
    } else {
        // No filter, load all quotes (subject to security rules)
        quotesQuery = quotesCollectionRef;
        // Hide filter message
        if (quotesFilterDisplay) {
            quotesFilterDisplay.classList.add('hidden');
        }
    }

    onSnapshot(quotesQuery, async snapshot => {
        const quotes = [];
        for (const docSnap of snapshot.docs) {
            const quoteData = docSnap.data();
            // Convert Firestore Timestamp to YYYY-MM-DD string for display
            const eventDateDisplay = quoteData.eventDate && quoteData.eventDate.toDate ? quoteData.eventDate.toDate().toISOString().split('T')[0] : 'N/A';
            quotes.push({ id: docSnap.id, ...quoteData, eventDate: eventDateDisplay });
        }
        renderQuotesGrid(quotes);
    }, error => {
        console.error("Error loading quotes in real-time:", error);
        showMessageBox(`Error loading quotes: ${error.message}`, false);
        if (noQuotesMessage) noQuotesMessage.classList.remove('hidden');
        if (quotesGrid) quotesGrid.updateConfig({ data: [] }).forceRender();
    });
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

/**
 * Handles the editing of an existing quote.
 * Fetches the quote data and passes it to setupQuoteForm.
 * @param {string} quoteId The ID of the quote document to edit.
 */
async function handleEditQuote(quoteId) {
    try {
        const docSnap = await getDoc(getDocRef('quotes', quoteId));
        if (docSnap.exists()) {
            const quoteData = { id: docSnap.id, ...docSnap.data() };
            await setupQuoteForm(quoteData); // Pass the data to setupQuoteForm
        } else {
            showMessageBox("Quote not found.", 'alert', true);
            hideForm(quoteFormContainer);
        }
    } catch (error) {
        console.error("Error editing quote:", error);
        showMessageBox(`Error loading quote data for edit: ${error.message}`, 'alert', true);
        hideForm(quoteFormContainer);
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
 * Handles the editing of an existing quote line entry.
 * Populates the quote line form with existing data and shows the form.
 * @param {string} quoteLineId The ID of the quote line document to edit.
 * @param {object} quoteLineData The data of the quote line entry (passed from renderQuoteLines).
 */
function handleEditQuoteLine(quoteLineId, quoteLineData) {
    showQuoteLineForm(); // Show the quote line form
    if (document.getElementById('quote-line-id')) document.getElementById('quote-line-id').value = quoteLineId;
    if (document.getElementById('quote-line-parent-quote-id')) document.getElementById('quote-line-parent-quote-id').value = currentQuoteId; // Ensure parent ID is set

    // Populate form fields
    if (quoteLineServicesInput) quoteLineServicesInput.value = quoteLineData.services || '';
    if (quoteLineDescriptionInput) quoteLineDescriptionInput.value = quoteLineData.serviceDescription || '';
    if (quoteLineUnitPriceInput) quoteLineUnitPriceInput.value = quoteLineData.unitPrice !== undefined ? quoteLineData.unitPrice : 0;
    if (quoteLineQuantityInput) quoteLineQuantityInput.value = quoteLineData.quantity !== undefined ? quoteLineData.quantity : 1;
    if (quoteLineDiscountInput) quoteLineDiscountInput.value = quoteLineData.discount !== undefined ? quoteLineData.discount : 0;
    if (quoteLineAdjustmentAmountInput) quoteLineAdjustmentAmountInput.value = quoteLineData.adjustmentAmount !== undefined ? quoteLineData.adjustmentAmount : 0;

    if (quoteLineStartDateInput) {
        const startDate = quoteLineData.serviceStartDate ? new Date(quoteLineData.serviceStartDate.seconds * 1000).toISOString().split('T')[0] : '';
        quoteLineStartDateInput.value = startDate;
    }
    if (quoteLineEndDateInput) {
        const endDate = quoteLineData.serviceEndDate ? new Date(quoteLineData.serviceEndDate.seconds * 1000).toISOString().split('T')[0] : '';
        quoteLineEndDateInput.value = endDate;
    }

    calculateQuoteLineFinalNet(); // Recalculate to update display
    if (quoteLineFormMessage) showMessageBox(quoteLineFormMessage, '', false); // Clear any previous messages
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
    addOpportunityBtn = document.getElementById('add-opportunity-btn');
    opportunityFormContainer = document.getElementById('opportunity-form-container');
    opportunityForm = document.getElementById('opportunity-form');
    cancelOpportunityBtn = document.getElementById('cancel-opportunity-btn');
    opportunitySearchInput = document.getElementById('opportunity-search');
    opportunitiesGridContainer = document.getElementById('opportunities-grid-container');
    noOpportunitiesMessage = document.getElementById('no-opportunities-message');
    opportunityCustomerSelect = document.getElementById('opportunity-customer');
    opportunityCurrencySelect = document.getElementById('opportunity-currency');
    opportunityPriceBookSelect = document.getElementById('opportunity-price-book');
    opportunityServicesInterestedSelect = document.getElementById('opportunity-services-interested');
    opportunityDiscountInput = document.getElementById('opportunity-discount');
    adjustmentAmtInput = document.getElementById('adjustment-amt');
    opportunityNetSpan = document.getElementById('opportunity-net'); // Corrected name
    opportunityFormMessage = document.getElementById('opportunity-form-message');
    workLogsSectionContainer = document.getElementById('work-logs-section-container');
    addWorkLogEntryBtn = document.getElementById('add-work-log-entry-btn');
    workLogFormContainer = document.getElementById('work-log-form-container');
    workLogForm = document.getElementById('work-log-form');
    cancelWorkLogBtn = document.getElementById('cancel-work-log-btn');
    workLogsList = document.getElementById('work-logs-list');
    noWorkLogsMessage = document.getElementById('no-work-logs-message');
    workLogFormMessage = document.getElementById('work-log-form-message');
    workLogTypeSelect = document.getElementById('work-log-type'); // Assigned
    mainOpportunityDetailsAccordion = document.getElementById('main-opportunity-details-accordion');
    opportunityAccordionsGrid = document.getElementById('opportunity-accordions-grid');


    // Quote elements
    addQuoteBtn = document.getElementById('add-quote-btn');
    quoteFormContainer = document.getElementById('quote-form-container');
    quoteForm = document.getElementById('quote-form');
    cancelQuoteBtn = document.getElementById('cancel-quote-btn');
    quoteSearchInput = document.getElementById('quote-search');
    quotesGridContainer = document.getElementById('quotes-grid-container');
    noQuotesMessage = document.getElementById('no-quotes-message');
    quoteOpportunitySelect = document.getElementById('quote-opportunity');
    quoteStatusSelect = document.getElementById('quote-status');
    quotesFilterDisplay = document.getElementById('quotes-filter-display');
    quotesFilterOpportunityName = document.getElementById('quotes-filter-opportunity-name');
    clearQuotesFilterBtn = document.getElementById('clear-quotes-filter-btn');
    quoteCustomerContactNameInput = document.getElementById('quote-customer-contact-name');
    quoteCustomerPhoneInput = document.getElementById('quote-customer-phone');
    quoteCustomerEmailInput = document.getElementById('quote-customer-email');
    quoteCustomerAddressInput = document.getElementById('quote-customer-address');
    quoteFormMessage = document.getElementById('quote-form-message');
    mainQuoteDetailsAccordion = document.getElementById('main-quote-details-accordion');
    quoteAccordionsGrid = document.getElementById('quote-accordions-grid');

    // Quote Line elements (ALL NEW)
    quoteLinesSectionContainer = document.getElementById('quote-lines-section-container');
    addQuoteLineEntryBtn = document.getElementById('add-quote-line-entry-btn');
    quoteLineFormContainer = document.getElementById('quote-line-form-container');
    quoteLineForm = document.getElementById('quote-line-form');
    cancelQuoteLineBtn = document.getElementById('cancel-quote-line-btn');
    quoteLinesList = document.getElementById('quote-lines-list');
    noQuoteLinesMessage = document.getElementById('no-quote-lines-message');
    quoteLineServicesInput = document.getElementById('quote-line-services');
    quoteLineDescriptionInput = document.getElementById('quote-line-description');
    quoteLineStartDateInput = document.getElementById('quote-line-start-date');
    quoteLineEndDateInput = document.getElementById('quote-line-end-date');
    quoteLineUnitPriceInput = document.getElementById('quote-line-unit-price');
    quoteLineQuantityInput = document.getElementById('quote-line-quantity');
    quoteLineDiscountInput = document.getElementById('quote-line-discount');
    quoteLineAdjustmentAmountInput = document.getElementById('quote-line-adjustment-amount');
    quoteLineFinalNetSpan = document.getElementById('quote-line-final-net');
    quoteLineFormMessage = document.getElementById('quote-line-form-message');


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

    if (addOpportunityBtn) addOpportunityBtn.addEventListener('click', () => setupOpportunityForm());
    if (cancelOpportunityBtn) cancelOpportunityBtn.addEventListener('click', () => hideForm(opportunityFormContainer, opportunityFormMessage));
    if (opportunityForm) opportunityForm.addEventListener('submit', handleSaveOpportunity);
    if (opportunitySearchInput) opportunitySearchInput.addEventListener('input', (event) => { if (opportunitiesGrid) opportunitiesGrid.search(event.target.value); });
    if (opportunityCurrencySelect) opportunityCurrencySelect.addEventListener('change', (event) => filterAndPopulatePriceBooks(event.target.value));
    if (opportunityValueInput) opportunityValueInput.addEventListener('input', calculateOpportunityNet);
    if (opportunityDiscountInput) opportunityDiscountInput.addEventListener('input', calculateOpportunityNet);
    if (adjustmentAmtInput) adjustmentAmtInput.addEventListener('input', calculateOpportunityNet);

    // Work Log Listeners
    if (addWorkLogEntryBtn) addWorkLogEntryBtn.addEventListener('click', showWorkLogForm);
    if (cancelWorkLogBtn) cancelWorkLogBtn.addEventListener('click', hideWorkLogForm);
    if (workLogForm) workLogForm.addEventListener('submit', handleSaveWorkLog);

    // Quote Listeners (PRESERVED FROM YOUR BASELINE)
    if (addQuoteBtn) addQuoteBtn.addEventListener('click', () => setupQuoteForm());
    if (cancelQuoteBtn) cancelQuoteBtn.addEventListener('click', () => hideForm(quoteFormContainer, quoteFormMessage));
    if (quoteForm) quoteForm.addEventListener('submit', handleSaveQuote);
    if (quoteSearchInput) quoteSearchInput.addEventListener('input', (event) => { if (quotesGrid) quotesGrid.search(event.target.value); });
    if (quoteOpportunitySelect) quoteOpportunitySelect.addEventListener('change', handleOpportunityChangeForQuote); // Auto-fill customer details
    if (clearQuotesFilterBtn) clearQuotesFilterBtn.addEventListener('click', clearQuotesFilter);

    // Quote Line Listeners (ALL NEW)
    if (addQuoteLineEntryBtn) addQuoteLineEntryBtn.addEventListener('click', showQuoteLineForm);
    if (cancelQuoteLineBtn) cancelQuoteLineBtn.addEventListener('click', hideQuoteLineForm);
    if (quoteLineForm) quoteLineForm.addEventListener('submit', handleSaveQuoteLine);
    if (quoteLineUnitPriceInput) quoteLineUnitPriceInput.addEventListener('input', calculateQuoteLineFinalNet);
    if (quoteLineQuantityInput) quoteLineQuantityInput.addEventListener('input', calculateQuoteLineFinalNet);
    if (quoteLineDiscountInput) quoteLineDiscountInput.addEventListener('input', calculateQuoteLineFinalNet);
    if (quoteLineAdjustmentAmountInput) quoteLineAdjustmentAmountInput.addEventListener('input', calculateQuoteLineFinalNet);

    // Admin Listeners
    if (addCountryBtn) addCountryBtn.addEventListener('click', () => { hideForm(countryFormContainer, countryFormMessage); showForm(countryFormContainer); countryForm.reset(); document.getElementById('country-id').value = ''; });
    if (cancelCountryBtn) cancelCountryBtn.addEventListener('click', () => hideForm(countryFormContainer, countryFormMessage));
    if (countryForm) countryForm.addEventListener('submit', handleSaveCountry);
    if (countrySearchInput) countrySearchInput.addEventListener('input', (event) => { if (countriesGrid) countriesGrid.search(event.target.value); });

    if (addCurrencyBtn) addCurrencyBtn.addEventListener('click', () => { hideForm(currencyFormContainer, currencyFormMessage); showForm(currencyFormContainer); currencyForm.reset(); document.getElementById('currency-id').value = ''; populateCurrencyCountries(); });
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
            { id: 'name', name: 'Name', width: 'auto' },
            { id: 'type', name: 'Type', width: '120px' },
            { id: 'email', name: 'Email', width: '200px' },
            { id: 'phone', name: 'Phone', width: '150px' },
            { id: 'country', name: 'Country', width: '120px' },
            { id: 'preferredContactMethod', name: 'Contact Method', width: '180px' },
            { id: 'industry', name: 'Industry', width: '120px' },
            { id: 'source', name: 'Source', width: '120px' },
            {
                name: 'Actions',
                width: '120px',
                formatter: (cell, row) => {
                    // CORRECTED: Access the ID directly from the first cell (index 0)
                    const customerId = row.cells[0].data;

                    if (!customerId) {
                        console.error("Error: Customer ID not found at row.cells[0].data for actions.");
                        return gridjs.html(`<span>Error</span>`); // Or some other fallback
                    }

                    return gridjs.html(`
                        <button class="text-blue-600 hover:text-blue-800 font-semibold mr-2" onclick="handleEditCustomer('${customerId}')">Edit</button>
                        <button class="text-red-600 hover:text-red-800 font-semibold" onclick="handleDeleteCustomer('${customerId}')">Delete</button>
                    `);
                }
            }
        ],
        data: [], // Will be populated by onSnapshot
        search: {
            selector: (cell, rowIndex, cellIndex) => {
                // Exclude 'Actions' column (last) and the hidden 'id' column (index 0) from search.
                // Visible columns are name (1), type (2), email (3), phone (4), country (5), contact (6), industry (7), source (8).
                // So, search from index 1 up to (but not including) the 'Actions' column.
                return cellIndex > 0 && cellIndex < 9 ? cell : undefined;
            }
        },
        pagination: {
            enabled: true,
            limit: 10,
        },
        sort: true,
        resizable: true,
        style: {
            table: {
                'min-width': '100%'
            },
            th: {
                'white-space': 'nowrap'
            }
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
            { id: 'servicesInterested', name: 'Services', width: 'auto', formatter: (cell) => cell ? cell.join(', ') : '' },
            { id: 'eventDate', name: 'Event Date', width: '120px', formatter: (cell) => cell ? new Date(cell.seconds * 1000).toLocaleDateString() : '' },
            { id: 'source', name: 'Source', width: '120px' },
            {
                name: 'Actions',
                width: '120px',
                formatter: (cell, row) => {
                    // CORRECTED: Access the ID directly from the first cell (index 0)
                    const leadId = row.cells[0].data;

                    if (!leadId) {
                        console.error("Error: Lead ID not found at row.cells[0].data for actions.");
                        return gridjs.html(`<span>Error</span>`); // Or some other fallback
                    }

                    return gridjs.html(`
                        <button class="text-blue-600 hover:text-blue-800 font-semibold mr-2" onclick="handleEditLead('${leadId}')">Edit</button>
                        <button class="text-red-600 hover:text-red-800 font-semibold" onclick="handleDeleteLead('${leadId}')">Delete</button>
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
        style: {
            table: {
                'min-width': '100%'
            },
            th: {
                'white-space': 'nowrap'
            }
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
            { id: 'name', name: 'Opportunity Name', width: 'auto' },
            { id: 'customerName', name: 'Customer', width: '180px' },
            { id: 'currency', name: 'Currency', width: '100px' },
            { id: 'salesStage', name: 'Sales Stage', width: '150px' },
            { id: 'opportunityNet', name: 'Net Value', width: '120px', formatter: (cell) => cell ? cell.toFixed(2) : '0.00' },
            { id: 'expectedCloseDate', name: 'Close Date', width: '120px', formatter: (cell) => cell ? new Date(cell.seconds * 1000).toLocaleDateString() : '' },
            { id: 'probability', name: 'Probability (%)', width: '120px' },
            {
                name: 'Actions',
                width: '120px',
                formatter: (cell, row) => {
                    const opportunityId = row.cells[row.cells.length - 1].data;
                    return gridjs.html(`
                        <button class="text-blue-600 hover:text-blue-800 font-semibold mr-2" onclick="handleEditOpportunity('${opportunityId}')">Edit</button>
                        <button class="text-red-600 hover:text-red-800 font-semibold" onclick="handleDeleteOpportunity('${opportunityId}')">Delete</button>
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
        style: {
            table: {
                'min-width': '100%'
            },
            th: {
                'white-space': 'nowrap'
            }
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


    // QUOTES GRID INITIALIZATION (UPDATED with column widths)
    quotesGrid = new gridjs.Grid({
        columns: [
            { id: 'quoteName', name: 'Quote Name', width: 'auto' },
            { id: 'opportunityId', name: 'Opportunity ID', width: '150px' },
            { id: 'eventName', name: 'Event Name', width: 'auto' },
            { id: 'eventDate', name: 'Event Date', width: '120px', formatter: (cell) => cell ? new Date(cell.seconds * 1000).toLocaleDateString() : '' },
            { id: 'quoteAmount', name: 'Quote Amount', width: '120px', formatter: (cell) => cell ? cell.toFixed(2) : '0.00' },
            { id: 'status', name: 'Status', width: '100px' },
            {
                name: 'Actions',
                width: '120px',
                formatter: (cell, row) => {
                    const quoteId = row.cells[row.cells.length - 1].data;
                    return gridjs.html(`
                        <button class="text-blue-600 hover:text-blue-800 font-semibold mr-2" onclick="handleEditQuote('${quoteId}')">Edit</button>
                        <button class="text-red-600 hover:text-red-800 font-semibold" onclick="handleDeleteQuote('${quoteId}')">Delete</button>
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
        style: {
            table: {
                'min-width': '100%'
            },
            th: {
                'white-space': 'nowrap'
            }
        }
    }).render(quotesGridContainer);

    unsubscribeQuotes = onSnapshot(getCollectionRef('quotes'), (snapshot) => {
        const quotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (quotes.length === 0) {
            if (noQuotesMessage) noQuotesMessage.classList.remove('hidden');
            if (quotesGridContainer) quotesGridContainer.classList.add('hidden');
        } else {
            if (noQuotesMessage) noQuotesMessage.classList.add('hidden');
            if (quotesGridContainer) quotesGridContainer.classList.remove('hidden');
        }
        quotesGrid.updateConfig({ data: quotes }).forceRender();
    }, (error) => {
        console.error("Error fetching quotes:", error);
        showMessageBox("Error loading quotes.");
    });


    countriesGrid = new gridjs.Grid({
        columns: [
            { id: 'id', name: 'ID', hidden: true }, // ADDED: Explicit ID column, hidden, and now reliably at index 0
            { id: 'name', name: 'Country Name', width: 'auto' },
            { id: 'code', name: 'Code', width: '80px' },
            { id: 'states', name: 'States/Provinces', width: 'auto', formatter: (cell) => cell ? cell.join(', ') : '' },
            {
                name: 'Actions',
                width: '120px',
                formatter: (cell, row) => {
                    // CORRECTED: Access the ID directly from the first cell (index 0)
                    const countryId = row.cells[0].data;

                    if (!countryId) {
                        console.error("Error: Country ID not found at row.cells[0].data for actions.");
                        return gridjs.html(`<span>Error</span>`); // Or some other fallback
                    }

                    return gridjs.html(`
                        <button class="text-blue-600 hover:text-blue-800 font-semibold mr-2" onclick="handleEditCountry('${countryId}')">Edit</button>
                        <button class="text-red-600 hover:text-red-800 font-semibold" onclick="handleDeleteCountry('${countryId}')">Delete</button>
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
        style: { table: { 'min-width': '100%' }, th: { 'white-space': 'nowrap' } }
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
            { id: 'name', name: 'Currency Name', width: 'auto' },
            { id: 'code', name: 'Code', width: '80px' },
            { id: 'symbol', name: 'Symbol', width: '80px' },
            { id: 'countryCode', name: 'Country', width: '100px' },
            {
                name: 'Actions',
                width: '120px',
                formatter: (cell, row) => {
                    const currencyId = row.cells[row.cells.length - 1].data;
                    return gridjs.html(`
                        <button class="text-blue-600 hover:text-blue-800 font-semibold mr-2" onclick="handleEditCurrency('${currencyId}')">Edit</button>
                        <button class="text-red-600 hover:text-red-800 font-semibold" onclick="handleDeleteCurrency('${currencyId}')">Delete</button>
                    `);
                }
            }
        ],
        data: [],
        search: true,
        pagination: { enabled: true, limit: 10 },
        sort: true,
        resizable: true,
        style: { table: { 'min-width': '100%' }, th: { 'white-space': 'nowrap' } }
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
            { id: 'name', name: 'Price Book Name', width: 'auto' },
            { id: 'currency', name: 'Currency', width: '100px' },
            { id: 'description', name: 'Description', width: 'auto' },
            { id: 'isActive', name: 'Active', width: '80px', formatter: (cell) => cell ? 'Yes' : 'No' },
            {
                name: 'Actions',
                width: '120px',
                formatter: (cell, row) => {
                    const priceBookId = row.cells[row.cells.length - 1].data;
                    return gridjs.html(`
                        <button class="text-blue-600 hover:text-blue-800 font-semibold mr-2" onclick="handleEditPriceBook('${priceBookId}')">Edit</button>
                        <button class="text-red-600 hover:text-red-800 font-semibold" onclick="handleDeletePriceBook('${priceBookId}')">Delete</button>
                    `);
                }
            }
        ],
        data: [],
        search: true,
        pagination: { enabled: true, limit: 10 },
        sort: true,
        resizable: true,
        style: { table: { 'min-width': '100%' }, th: { 'white-space': 'nowrap' } }
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


