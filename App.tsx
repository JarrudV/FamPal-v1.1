
import React, { useState, useEffect, useCallback } from 'react';
import {
  auth,
  googleProvider,
  getRedirectResult,
  signInWithRedirect,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  doc,
  setDoc,
  onSnapshot,
  db,
} from './lib/firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import { AppState, User, Child, Memory, UserReview, FamilyGroup } from './types';


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
});

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => getInitialState(null));
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState('login');

  const handleSignIn = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (e: any) {
      setError(`Login failed: ${e.message}`);
      console.error("Login redirect error:", e);
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
    setState(prev => ({ ...prev, [key]: value }));
  }, []);
  

  useEffect(() => {
    if (isGuest) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (userAuth) => {
      if (userAuth) {
        const userDocRef = doc(db, 'users', userAuth.uid);

        const unsubscribeSnapshot = onSnapshot(userDocRef, (snap) => {
          const initialState = getInitialState(userAuth);
          if (snap.exists()) {
            const dbState = snap.data();
            // Deep merge to avoid undefined arrays
            setState({
              ...initialState,
              ...dbState,
              favorites: dbState.favorites || [],
              favoriteDetails: dbState.favoriteDetails || {},
              visited: dbState.visited || [],
              reviews: dbState.reviews || [],
              memories: dbState.memories || [],
              children: dbState.children || [],
              groups: dbState.groups || [],
            });
          } else {
            setDoc(userDocRef, initialState, { merge: true });
            setState(initialState);
          }
          setView('dashboard');
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        getRedirectResult(auth)
          .then((result) => {
            if (!result) {
              // No redirect result, so we are not in a login flow.
              // Stop loading and show the login page.
              setState(getInitialState(null));
              setView('login');
              setLoading(false);
            }
            // If there is a redirect result, onAuthStateChanged will
            // fire again with a user. We just wait.
          })
          .catch((error) => {
            console.error("Redirect result error:", error);
            setError(`Login failed: ${error.message}`);
            setLoading(false);
          });
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
        return <Dashboard state={state} onSignOut={handleSignOut} setView={setView} onUpdateState={handleUpdateState} />;
      case 'profile':
        return <Profile state={state} onSignOut={handleSignOut} setView={setView} onUpdateState={handleUpdateState} />;
      default:
        return <Login onLogin={handleSignIn} onGuestLogin={handleGuestLogin} error={error} />;
    }
  };

  return <div>{renderView()}</div>;
};

export default App;
