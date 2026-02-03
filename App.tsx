import React, { useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut as firebaseSignOut, // Renamed to avoid conflict
  doc,
  setDoc,
  onSnapshot,
  db,
} from './lib/firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import { User } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false); // New state for guest mode
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState('login'); // login, dashboard, profile

  const handleSignIn = async (): Promise<void> => {
    setError(null);
    try {
      // Prefer popup, fallback to redirect
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch(e: any) {
            setError(`Redirect login failed: ${e.message}`);
            console.error("Redirect login error:", e);
        }
      } else {
        setError(`Login failed: ${error.message}`);
        console.error("Login error:", error);
      }
    }
  };

  const handleGuestLogin = () => {
    setIsGuest(true);
    setView('dashboard');
  };

  const handleSignOut = async () => {
    setError(null);
    if (isGuest) {
      setIsGuest(false);
      setView('login');
      return;
    }
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setView('login');
    } catch (error: any) {
      console.error('Sign out error', error);
      setError(`Sign out failed: ${error.message}`);
    }
  };

  useEffect(() => {
    // If we are in guest mode, don't run firebase auth listeners
    if (isGuest) {
      setLoading(false);
      return;
    }

    console.log("Auth state change: pending...");
    console.log("Current location on load:", window.location.href);

    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        console.log("onAuthStateChanged: User found", userAuth);
        const userDocRef = doc(db, 'users', userAuth.uid);
        
        const unsubscribeSnapshot = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setUser({ ...userAuth, ...snap.data() });
          } else {
            // Create user profile if it doesn't exist
            const userData = {
              uid: userAuth.uid,
              email: userAuth.email,
              displayName: userAuth.displayName,
              photoURL: userAuth.photoURL,
              createdAt: new Date(),
            };
            setDoc(userDocRef, userData);
            setUser(userAuth);
          }
          setView('dashboard'); // Go to dashboard after login/profile creation
          setLoading(false);
        });

        // Detach snapshot listener on cleanup
        return () => unsubscribeSnapshot();
      } else {
        console.log("onAuthStateChanged: No user found. Checking for redirect result...");
        getRedirectResult(auth)
          .then((result) => {
            console.log("getRedirectResult:", result);
            if (result && result.user) {
              // This is handled by onAuthStateChanged, so this is just for debugging
              console.log("User found via getRedirectResult", result.user);
            } else {
              console.log("No active user and no redirect user.");
            }
          })
          .catch((error) => {
            console.error("Error getting redirect result:", error);
            setError(`Redirect failed: ${error.code} - ${error.message}`);
          })
          .finally(() => {
            setUser(null);
            setView('login');
            setLoading(false);
          });
      }
    });

    return () => unsubscribe();
  }, [isGuest]); // Re-run effect if guest status changes

  const renderView = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard user={user} onSignOut={handleSignOut} setView={setView} />;
      case 'profile':
        return <Profile user={user} onSignOut={handleSignOut} setView={setView} />;
      default: // 'login' view
        return <Login onLogin={handleSignIn} onGuestLogin={handleGuestLogin} error={error} />;
    }
  };

  return <div>{renderView()}</div>;
};

export default App;
