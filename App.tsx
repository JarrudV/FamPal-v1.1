import React, { useState, useEffect, useCallback } from 'react';
import { auth, googleProvider, getRedirectResult, signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut, doc, setDoc, onSnapshot, db } from './lib/firebase';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import { User } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState('login'); // login, dashboard, profile

  const handleSignIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
      } else {
        setError(`Login failed: ${error.code} - ${error.message}`);
        console.error("Login error:", error);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setView('login');
    } catch (error) {
      console.error('Sign out error', error);
      setError('Failed to sign out.');
    }
  };

  useEffect(() => {
    console.log("Auth state change: pending...");
    console.log("Current location on load:", window.location.href);

    const unsubscribe = onAuthStateChanged(auth, async (userAuth) => {
      if (userAuth) {
        console.log("onAuthStateChanged: User found", userAuth);
        const userDocRef = doc(db, 'users', userAuth.uid);
        onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setUser({ ...userAuth, ...snap.data() });
          } else {
            const userData = {
              uid: userAuth.uid,
              email: userAuth.email,
              displayName: userAuth.displayName,
              photoURL: userAuth.photoURL,
              createdAt: new Date()
            };
            setDoc(userDocRef, userData);
            setUser(userAuth);
          }
        });
        setView('profile');
        setLoading(false);
      } else {
        console.log("onAuthStateChanged: No user found. Checking for redirect result...");
        getRedirectResult(auth)
          .then((result) => {
            console.log("getRedirectResult:", result);
            if (result && result.user) {
              // This is handled by onAuthStateChanged, but we log it for debug
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
  }, []);

  const renderView = () => {
    if (loading) {
      return <div>Loading...</div>;
    }

    if (error) {
      return (
        <div>
          <p style={{ color: 'red' }}>{error}</p>
          <Login onSignIn={handleSignIn} />
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard user={user} onSignOut={handleSignOut} setView={setView} />;
      case 'profile':
        return <Profile user={user} onSignOut={handleSignOut} setView={setView} />;
      default:
        return <Login onSignIn={handleSignIn} />;
    }
  };

  return <div>{renderView()}</div>;
};

export default App;
