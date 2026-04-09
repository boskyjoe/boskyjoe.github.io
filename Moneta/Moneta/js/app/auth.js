import { COLLECTIONS } from "../config/collections.js";
import { DEFAULT_AUTH_ROUTE, LOGIN_ROUTE } from "../config/constants.js";
import { navigateTo, resolveRoute } from "./router.js";
import { setState } from "./store.js";
import { showModal } from "../shared/modal.js";
import { showToast } from "../shared/toast.js";

function getAuth() {
    return firebase.auth();
}

function getDb() {
    return firebase.firestore();
}

async function createGuestUserRecord(user) {
    const now = firebase.firestore.FieldValue.serverTimestamp();
    await getDb().collection(COLLECTIONS.users).doc(user.uid).set({
        UID: user.uid,
        displayName: user.displayName,
        email: user.email,
        role: "guest",
        isActive: true,
        createdBy: user.email,
        createdOn: now,
        updatedBy: user.email,
        updatedOn: now
    });
}

function mapSessionUser(user, userData) {
    return {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: userData.role,
        teamId: userData.teamId || null
    };
}

export function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return getAuth().signInWithPopup(provider);
}

export function logout() {
    return getAuth().signOut();
}

export function initializeAuth() {
    getAuth().onAuthStateChanged(async user => {
        if (!user) {
            setState({ currentUser: null });
            navigateTo(LOGIN_ROUTE);
            resolveRoute();
            return;
        }

        try {
            const userRef = getDb().collection(COLLECTIONS.users).doc(user.uid);
            const docSnap = await userRef.get();

            if (!docSnap.exists) {
                await createGuestUserRecord(user);
                setState({
                    currentUser: {
                        uid: user.uid,
                        displayName: user.displayName,
                        email: user.email,
                        photoURL: user.photoURL,
                        role: "guest"
                    }
                });
                await showModal({
                    title: "Account Created",
                    message: "Your account was created with guest access. An administrator can upgrade your role later."
                });
            } else {
                const userData = docSnap.data();

                if (!userData.isActive) {
                    await getAuth().signOut();
                    await showModal({
                        title: "Account Disabled",
                        message: "Your account is inactive. Please contact an administrator."
                    });
                    return;
                }

                setState({ currentUser: mapSessionUser(user, userData) });
                showToast(`Welcome back, ${user.displayName || "user"}.`, "success");
            }

            navigateTo(DEFAULT_AUTH_ROUTE);
            resolveRoute();
        } catch (error) {
            console.error("[Moneta] Auth initialization failed:", error);
            await showModal({
                title: "Authentication Error",
                message: error.message || "Could not complete sign in."
            });
        }
    });
}
