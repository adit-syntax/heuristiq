import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword as firebaseSignIn,
    createUserWithEmailAndPassword as firebaseSignUp,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db, isFirebaseConfigured } from '../config/firebase';

const AuthContext = createContext(null);

const GUEST_FLAG = 'preptracker-guest';
const GUEST_USER = { id: 'guest', name: 'Guest', email: null, isGuest: true };
const NOT_CONFIGURED = { success: false, error: 'Cloud sync is not configured. Continue as guest.' };

export function AuthProvider({ children }) {
    // Without Firebase env vars the app still works, local-only.
    const [user, setUser] = useState(() => (isFirebaseConfigured ? null : GUEST_USER));
    const [loading, setLoading] = useState(isFirebaseConfigured);

    // Listen for auth state changes & handle mobile redirect result
    useEffect(() => {
        if (!isFirebaseConfigured) return;

        getRedirectResult(auth).then(async (result) => {
            if (result && result.user) {
                localStorage.removeItem(GUEST_FLAG);
                try {
                    const userDoc = await getDoc(doc(db, 'users', result.user.uid));
                    if (!userDoc.exists()) {
                        await setDoc(doc(db, 'users', result.user.uid), {
                            name: result.user.displayName || 'User',
                            email: result.user.email,
                            createdAt: new Date().toISOString(),
                        });
                    }
                } catch (err) {
                    console.error('Error saving redirected user:', err);
                }
            }
        }).catch((error) => {
            console.error('Redirect sign-in error:', error);
        });

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                let userData = {};
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) userData = userDoc.data();
                } catch (error) {
                    // Offline or rules issue - fall back to the auth profile.
                    console.error('Could not read user profile:', error);
                }

                setUser({
                    id: firebaseUser.uid,
                    name: firebaseUser.displayName || userData.name || 'User',
                    email: firebaseUser.email,
                    photoURL: firebaseUser.photoURL || null,
                    createdAt: userData.createdAt || new Date().toISOString(),
                });
            } else {
                // Restore a previously chosen guest session across reloads.
                setUser(localStorage.getItem(GUEST_FLAG) === 'true' ? GUEST_USER : null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signup = useCallback(async (name, email, password) => {
        if (!isFirebaseConfigured) return NOT_CONFIGURED;
        try {
            const userCredential = await firebaseSignUp(auth, email, password);
            const firebaseUser = userCredential.user;
            localStorage.removeItem(GUEST_FLAG);

            // Update display name
            await updateProfile(firebaseUser, { displayName: name });

            // Create user document in Firestore
            await setDoc(doc(db, 'users', firebaseUser.uid), {
                name,
                email: email.toLowerCase(),
                createdAt: new Date().toISOString(),
            });

            return { success: true };
        } catch (error) {
            let errorMessage = 'Signup failed';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Email already registered';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password should be at least 6 characters';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                default:
                    errorMessage = error.message;
            }
            return { success: false, error: errorMessage };
        }
    }, []);

    const login = useCallback(async (email, password) => {
        if (!isFirebaseConfigured) return NOT_CONFIGURED;
        try {
            await firebaseSignIn(auth, email, password);
            localStorage.removeItem(GUEST_FLAG);
            return { success: true };
        } catch (error) {
            let errorMessage = 'Login failed';
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = 'Invalid email or password';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many attempts. Try again later';
                    break;
                default:
                    errorMessage = error.message;
            }
            return { success: false, error: errorMessage };
        }
    }, []);

    const loginWithGoogle = useCallback(async () => {
        if (!isFirebaseConfigured) return NOT_CONFIGURED;
        try {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                || window.matchMedia('(display-mode: standalone)').matches;

            if (isMobile) {
                await signInWithRedirect(auth, googleProvider);
                return { success: true };
            }

            const result = await signInWithPopup(auth, googleProvider);
            localStorage.removeItem(GUEST_FLAG);
            const firebaseUser = result.user;

            // Check if user document exists, create if not
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                    name: firebaseUser.displayName || 'User',
                    email: firebaseUser.email,
                    createdAt: new Date().toISOString(),
                });
            }

            return { success: true };
        } catch (error) {
            let errorMessage = 'Google login failed';
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Login cancelled';
            } else if (error.code === 'auth/popup-blocked') {
                errorMessage = 'Popup blocked. Please allow popups';
            }
            return { success: false, error: errorMessage };
        }
    }, []);

    const continueAsGuest = useCallback(() => {
        // Guest data lives in localStorage only; remember the choice across reloads.
        localStorage.setItem(GUEST_FLAG, 'true');
        setUser(GUEST_USER);
    }, []);

    const logout = useCallback(async () => {
        localStorage.removeItem(GUEST_FLAG);
        try {
            if (isFirebaseConfigured) await firebaseSignOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
        setUser(null);
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        login,
        signup,
        loginWithGoogle,
        continueAsGuest,
        logout,
        isAuthenticated: !!user,
        isGuest: user?.isGuest || false,
        isFirebaseConfigured,
    }), [user, loading, login, signup, loginWithGoogle, continueAsGuest, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Context hook, not a component - fast refresh warnings do not apply.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
