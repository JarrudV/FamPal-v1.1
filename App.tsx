
import React, { useState, useEffect, useCallback } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  isFirebaseConfigured,
  firebaseConfigError,
} from './lib/firebase';
import { listenToUserDoc, upsertUserProfile, saveUserField } from './lib/userData';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import HomeFab from './components/HomeFab';
import { AppState, User, getDefaultEntitlement, UserPreferences } from './types';
import { getGuestPreferences, syncGuestPreferencesToUser } from './lib/profileSync';
import type { User as FirebaseUser } from 'firebase/auth';

// Convert Firebase Auth User to plain serializable object
const serializeUser = (firebaseUser: FirebaseUser): User => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  displayName: firebaseUser.displayName,
  photoURL: firebaseUser.photoURL,
});

// Returns a state object with all arrays guaranteed to be non-null
const getInitialState = (user: User | null, guestPrefs?: UserPreferences): AppState => ({
  isAuthenticated: !!user,
  user,
  favorites: [],
  favoriteDetails: {},
  visited: [],
  visitedPlaces: [],
  reviews: [],
  memories: [],
  children: [],
  spouseName: '',
  linkedEmail: '',
  groups: [],
  friendCircles: [],
  entitlement: getDefaultEntitlement(),
  aiRequestsUsed: 0,
  isPro: false,
  userPreferences: guestPrefs || {},
  partnerSharedPlaces: [],
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
    const guestPrefs = getGuestPreferences();
    setState(getInitialState(null, guestPrefs));
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
      if (!isGuest && uid) {
        // Centralised save via userData service
        saveUserField(uid, key as string, value).catch(err => {
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
      console.time('auth:resolved');
      if (userAuth) {
        // Immediately show the dashboard shell so UI is responsive
        const serializedUser = serializeUser(userAuth);
        setState(prev => ({ ...prev, isAuthenticated: true, user: serializedUser }));
        setView('dashboard');
        setLoading(false);

        // Upsert profile (non-blocking) and start listening for data
        upsertUserProfile(userAuth.uid, serializedUser).catch(err => console.error(err));

        // Listen to user doc and merge data when available
        const unsubProfile = listenToUserDoc(userAuth.uid, (dbState) => {
          console.timeEnd('auth:resolved');
          const initialState = getInitialState(serializedUser);
          if (dbState) {
            const loadedEntitlement = dbState.entitlement || getDefaultEntitlement();
            const guestPrefs = getGuestPreferences();
            const hasGuestPrefs = Object.keys(guestPrefs).length > 0;
            if (hasGuestPrefs && !dbState.userPreferences) {
              syncGuestPreferencesToUser(userAuth.uid);
            }
            setState({
              ...initialState,
              user: serializedUser,
              ...dbState,
              favorites: dbState.favorites || [],
              favoriteDetails: dbState.favoriteDetails || {},
              visited: dbState.visited || [],
              visitedPlaces: dbState.visitedPlaces || [],
              reviews: dbState.reviews || [],
              memories: dbState.memories || [],
              children: dbState.children || [],
              groups: dbState.groups || [],
              friendCircles: dbState.friendCircles || [],
              entitlement: loadedEntitlement,
              isPro: loadedEntitlement.plan_tier === 'pro' || loadedEntitlement.plan_tier === 'lifetime',
              userPreferences: dbState.userPreferences || guestPrefs || {},
            });
          } else {
            setState(initialState);
          }
        });

        return () => unsubProfile();
      } else {
        setState(getInitialState(null));
        setView('login');
        setLoading(false);
        console.timeEnd('auth:resolved');
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

  return (
    <div>
      {renderView()}
      <HomeFab visible={view !== 'dashboard' && view !== 'login'} onClick={() => setView('dashboard')} />
    </div>
  );
};

export default App;
