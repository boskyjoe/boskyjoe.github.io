// --- Initial Load (Corrected Order with Firebase Config) ---

document.addEventListener('DOMContentLoaded', async () => {
    console.group("DOMContentLoaded - Initializing App");
    console.log("DOMContentLoaded fired. Calling initializePage first...");

    // 1. Initialize Page DOM elements and static event listeners (including grid initializations)
    initializePage(); 
    console.log("initializePage function called (DOM elements and static listeners set up).");

    // CRITICAL FIX: Re-add the firebaseConfig object here
    const firebaseConfig = {
        apiKey: "AIzaSyDePPc0AYN6t7U1ygRaOvctR2CjIIjGODo",
        authDomain: "shuttersync-96971.firebaseapp.com",
        projectId: "shuttersync-96971",
        storageBucket: "shuttersync-96971.firebasestorage.app",
        appId: "1:10782416018:web:361db5572882a62f291a4b",
        measurementId: "G-T0W9CES4D3"
    };

    if (Object.keys(firebaseConfig).length === 0) {
        console.error("Firebase config is missing or empty.");
        showMessageBox("Firebase configuration is missing. Please ensure __firebase_config is set.", 'alert', true);
        console.groupEnd();
        return;
    }

    try {
        // 2. Initialize Firebase (now happens after DOM elements are referenced)
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app); 
        auth = getAuth(app);     
        console.log("Firebase app, db, and auth initialized.");

        // 3. Set up Authentication State Listener
        onAuthStateChanged(auth, async (user) => {
            console.group("onAuthStateChanged");
            console.log("Authentication state changed. User:", user ? user.uid : "null");

            if (user) {
                currentUserId = user.uid;
                if (userEmailDisplay) userEmailDisplay.textContent = user.email || user.uid;
                showSection('dashboard-section');
                console.log("User authenticated. Loading dynamic data...");
                
                await updateDashboard();
                await loadOpportunities();
                await loadCustomers();
                await loadQuotes(); 
                await loadPriceBooks();
                
                console.log("User authenticated and dynamic data loading functions invoked.");
            } else {
                currentUserId = null;
                showSection('login-section');
                console.log("User not authenticated, showing login section. Attempting anonymous sign-in...");
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                if (token) {
                    await signInWithCustomToken(auth, token);
                    console.log("Signed in with custom token.");
                } else {
                    await signInAnonymously(auth);
                    console.log("Signed in anonymously.");
                }
                console.log("signInUser logic completed.");
            }
            console.groupEnd(); // End onAuthStateChanged group
        });

    } catch (error) {
        console.error("Firebase initialization error:", error);
        showMessageBox(`Failed to initialize Firebase: ${error.message}`, 'alert', true);
    }
    console.groupEnd(); // End DOMContentLoaded group
});
