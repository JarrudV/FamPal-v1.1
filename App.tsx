
import React, { useState, useEffect, useCallback } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  doc,
  setDoc,
  onSnapshot,
  db,
  isFirebaseConfigured,
  firebaseConfigError,
} from './lib/firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import { AppState, User } from './types';
import type { User as FirebaseUser } from 'firebase/auth';

// Convert Firebase Auth User to plain serializable object
const serializeUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName: firebaseUser.displayName,
  photoURL: firebaseUser.photoURL,
});

// Returns a state object with all arrays guaranteed to be non-null
const getInitialState = (user: User | null): AppState => ({
  isAuthenticated: !!user,
  user,
  favorites: [],
  favoriteDetails: {},
  visited: [],
  reviews: [],
  memories: [],
  children: [],
  spouseName: '',
  linkedEmail: '',
  groups: [],
  friendCircles: [],
  aiRequestsUsed: 0,
  isPro: false,
});

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => getInitialState(null));
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState('login');

  const handleSignIn = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setError(firebaseConfigError || "Firebase is not configured properly.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      if (e.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for Google Sign-In. Please add it to Firebase Console -> Authentication -> Settings -> Authorized domains.");
      } else if (e.code === 'auth/popup-blocked') {
        setError("Popup was blocked. Please allow popups for this site.");
      } else if (e.code === 'auth/popup-closed-by-user') {
        setError(null);
      } else {
        setError(`Login failed: ${e.message}`);
      }
      console.error("Login popup error:", e);
      setLoading(false);
    }
  }, []);

  const handleGuestLogin = () => {
    setIsGuest(true);
    setState(getInitialState(null));
    setView('dashboard');
  };

  const handleSignOut = useCallback(async () => {
    setError(null);
    if (isGuest) {
      setIsGuest(false);
      setState(getInitialState(null));
      setView('login');
      return;
    }
    try {
      await firebaseSignOut(auth);
      setState(getInitialState(null));
      setView('login');
    } catch (error: any) {
      console.error('Sign out error', error);
      setError(`Sign out failed: ${error.message}`);
    }
  }, [isGuest]);

  const handleUpdateState = useCallback((key: keyof AppState, value: any) => {
    setState(prev => {
      const newState = { ...prev, [key]: value };
      
      // Save to Firestore if user is logged in (not guest)
      // Use auth.currentUser for more reliable UID access
      const uid = auth?.currentUser?.uid || prev.user?.uid;
      if (!isGuest && uid && db) {
        const userDocRef = doc(db, 'users', uid);
        // Only save the data fields, not the full state
        const dataToSave: Record<string, any> = {};
        dataToSave[key] = value;
        setDoc(userDocRef, dataToSave, { merge: true }).catch(err => {
          console.error('Failed to save to Firestore:', err);
        });
      }
      
      return newState;
    });
  }, [isGuest]);
  

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (userAuth) => {
      if (userAuth) {
        if (!db) {
          setLoading(false);
          return;
        }
        
        // Convert Firebase Auth User to plain object for Firestore
        const serializedUser = serializeUser(userAuth);
        const userDocRef = doc(db, 'users', userAuth.uid);

        const unsubscribeSnapshot = onSnapshot(userDocRef, (snap) => {
          const initialState = getInitialState(serializedUser);
          if (snap.exists()) {
            const dbState = snap.data();
            // Deep merge to avoid undefined arrays
            setState({
              ...initialState,
              user: serializedUser, // Always use fresh user data from auth
              ...dbState,
              favorites: dbState.favorites || [],
              favoriteDetails: dbState.favoriteDetails || {},
              visited: dbState.visited || [],
              reviews: dbState.reviews || [],
              memories: dbState.memories || [],
              children: dbState.children || [],
              groups: dbState.groups || [],
              friendCircles: dbState.friendCircles || [],
            });
          } else {
            // Save only serializable data to Firestore
            const dataToSave = {
              ...initialState,
              user: serializedUser,
            };
            setDoc(userDocRef, dataToSave, { merge: true });
            setState(initialState);
          }
          setView('dashboard');
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setState(getInitialState(null));
        setView('login');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [isGuest]);

  const renderView = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard state={state} isGuest={isGuest} onSignOut={handleSignOut} setView={setView} onUpdateState={handleUpdateState} />;
      case 'profile':
        return <Profile state={state} isGuest={isGuest} onSignOut={handleSignOut} setView={setView} onUpdateState={handleUpdateState} />;
      default:
        return <Login onLogin={handleSignIn} onGuestLogin={handleGuestLogin} error={error} />;
    }
  };

  return <div>{renderView()}</div>;
};

export default App;
