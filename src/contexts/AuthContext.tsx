import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, signInWithPopup, signInWithCredential, GoogleAuthProvider, signInWithRedirect, getRedirectResult, signOut, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { User } from '../types';

// Detect if running inside a Capacitor native app
function isNativeApp(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform?.();
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginAsDemo: () => Promise<void>;
  loginWithRedirect: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function saveUserToFirestore(firebaseUser: FirebaseUser): Promise<User> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  const isAnonymous = firebaseUser.isAnonymous;
  const isDemoEmail = firebaseUser.email === 'demo@bigvegi.app';
  const userDataToSave: any = {
    name: (isAnonymous || isDemoEmail) ? 'Demo Roommate' : (firebaseUser.displayName || 'Unknown'),
    email: (isAnonymous || isDemoEmail) ? 'demo@bigvegi.app' : (firebaseUser.email || ''),
  };

  if (firebaseUser.photoURL) {
    userDataToSave.photoUrl = firebaseUser.photoURL;
  } else if (isAnonymous || isDemoEmail) {
    userDataToSave.photoUrl = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150';
  }

  if (!userSnap.exists()) {
    await setDoc(userRef, userDataToSave);
    return { id: firebaseUser.uid, ...userDataToSave };
  }

  const existingData = userSnap.data();
  return { id: firebaseUser.uid, ...existingData } as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result on app load (needed for mobile OAuth flow)
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          try {
            const savedUser = await saveUserToFirestore(result.user);
            setUser(savedUser);
          } catch (error) {
            console.error('Error saving redirect user:', error);
          }
        }
      })
      .catch((error) => {
        // Ignore redirect errors (e.g. no redirect pending)
        if (error?.code !== 'auth/no-auth-event') {
          console.error('Redirect result error:', error);
        }
      });

    let userUnsubscribe: (() => void) | null = null;

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (userUnsubscribe) {
        userUnsubscribe();
        userUnsubscribe = null;
      }

      if (firebaseUser) {
        try {
          const savedUser = await saveUserToFirestore(firebaseUser);
          setUser(savedUser);

          // Setup real-time listener for the user profile document to capture flatId updates instantly
          userUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
            if (docSnap.exists()) {
              setUser({ id: firebaseUser.uid, ...docSnap.data() } as User);
            }
          });
        } catch (error) {
          console.error('Error fetching/creating user:', error);
          // Still set user so they can access the app even if profile save fails
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Unknown',
            email: firebaseUser.email || '',
            photoUrl: firebaseUser.photoURL || undefined
          });
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (userUnsubscribe) {
        userUnsubscribe();
      }
    };
  }, []);

  const login = async () => {
    try {
      if (isNativeApp()) {
        // Native mobile: use the Capacitor Google Auth plugin
        // This shows the native Android/iOS account picker — NO browser redirect!
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        await GoogleAuth.initialize();
        const googleUser = await GoogleAuth.signIn();
        // Create a Firebase credential from the native Google ID token
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        // Web browser: use popup for better UX
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error: any) {
      // User cancelled sign-in — not a real error
      if (error?.error === 'popup_closed_by_user' || error?.message === 'User cancelled.') {
        return;
      }
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const loginAsDemo = async () => {
    try {
      setLoading(true);
      // Attempt to log into a shared, persistent Firebase account so flatmates can see the same data
      try {
        await signInWithEmailAndPassword(auth, 'demo@bigvegi.app', 'demo123');
      } catch (emailErr: any) {
        // If the demo user does not exist yet, try to create it
        if (emailErr?.code === 'auth/user-not-found' || emailErr?.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, 'demo@bigvegi.app', 'demo123');
          } catch (createErr) {
            console.warn('Failed to create demo user, trying anonymous auth:', createErr);
            await signInAnonymously(auth);
          }
        } else {
          console.warn('Email/password login failed, trying anonymous auth:', emailErr);
          await signInAnonymously(auth);
        }
      }
    } catch (error) {
      console.warn('Anonymous auth failed or is disabled, using local mock account:', error);
      setUser({
        id: 'demo-local-user',
        name: 'Demo Roommate',
        email: 'demo@bigvegi.app',
        flatId: 'FLAT-DEMO',
        photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150'
      });
      setLoading(false);
    }
  };

  const loginWithRedirect = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with redirect', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAsDemo, loginWithRedirect, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
