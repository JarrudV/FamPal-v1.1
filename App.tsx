
// FamPals v1.1 - Family Activity Discovery App
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  isFirebaseConfigured,
  firebaseConfigError,
} from './lib/firebase';
import { listenToUserDoc, upsertUserProfile, saveUserField, listenToSavedPlaces, upsertSavedPlace } from './lib/userData';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import HomeFab from './components/HomeFab';
import { AppState, User, getDefaultEntitlement, UserPreferences, SavedPlace } from './types';
import { getGuestPreferences, syncGuestPreferencesToUser } from './lib/profileSync';
import type { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { shouldResetMonthlyAI, getNextResetDate } from './lib/entitlements';
import { joinCircleByCode } from './lib/circles';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

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
  savedPlaces: [],
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
  userPreferences: guestPrefs || {},
  partnerSharedPlaces: [],
});

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => getInitialState(null));
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState('login');
  const [pendingJoinCircleId, setPendingJoinCircleId] = useState<string | null>(null);
  const [savedPlacesLoaded, setSavedPlacesLoaded] = useState(false);
  const legacyFavoritesRef = useRef<string[]>([]);
  const savedPlacesMigratedAtRef = useRef<Timestamp | null>(null);
  const migrationAttemptedRef = useRef(false);
  const redirectHandledRef = useRef(false);
  const aiResetAttemptedRef = useRef<string | null>(null);
  const lastAuthUidRef = useRef<string | null>(null);
  const joinInFlightRef = useRef(false);
  const lastJoinCodeRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const PENDING_JOIN_KEY = 'fampals_pending_join_code';

  const handleSignIn = useCallback(async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      setError(firebaseConfigError || "Firebase is not configured properly.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      // Use popup as primary method - redirect has session storage issues in modern browsers
      await signInWithPopup(auth, googleProvider);
    } catch (popupErr: any) {
      console.warn("Login popup error:", popupErr);
      if (popupErr.code === 'auth/popup-blocked') {
        // Fallback to redirect only if popup is blocked
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: any) {
          setError(`Login failed: ${redirectErr.message}`);
          setLoading(false);
        }
      } else if (popupErr.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for Google Sign-In. Please add it to Firebase Console -> Authentication -> Settings -> Authorized domains.");
        setLoading(false);
      } else if (popupErr.code === 'auth/popup-closed-by-user') {
        setError(null);
        setLoading(false);
      } else {
        setError(`Login failed: ${popupErr.message}`);
        console.error("Login popup error:", popupErr);
        setLoading(false);
      }
    }
  }, []);

  const handleGuestLogin = () => {
    setIsGuest(true);
    setSavedPlacesLoaded(false);
    legacyFavoritesRef.current = [];
    savedPlacesMigratedAtRef.current = null;
    migrationAttemptedRef.current = false;
    const guestPrefs = getGuestPreferences();
    setState(getInitialState(null, guestPrefs));
    setView('dashboard');
  };

  const handleSignOut = useCallback(async () => {
    setError(null);
    if (isGuest) {
      setIsGuest(false);
      setSavedPlacesLoaded(false);
      legacyFavoritesRef.current = [];
      savedPlacesMigratedAtRef.current = null;
      migrationAttemptedRef.current = false;
      aiResetAttemptedRef.current = null;
      lastAuthUidRef.current = null;
      setPendingJoinCircleId(null);
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
        if (key !== 'savedPlaces' && key !== 'partnerSharedPlaces') {
          saveUserField(uid, key as string, value).catch(err => {
            console.error('Failed to save to Firestore:', err);
          });
        }
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

    let unsubProfile: (() => void) | null = null;
    const unsubscribe = onAuthStateChanged(auth, (userAuth) => {
      console.time('auth:resolved');
      if (userAuth) {
        if (lastAuthUidRef.current !== userAuth.uid) {
          aiResetAttemptedRef.current = null;
          lastAuthUidRef.current = userAuth.uid;
        }
        // Immediately show the dashboard shell so UI is responsive
        const serializedUser = serializeUser(userAuth);
        console.log('[FamPals] User authenticated:', userAuth.email);
        setState(prev => ({ ...prev, isAuthenticated: true, user: serializedUser }));
        console.log('[FamPals] Setting view to dashboard');
        setView('dashboard');
        setLoading(false);
        console.log('[FamPals] Loading set to false, view should be dashboard now');

        // Upsert profile (non-blocking) and start listening for data
        upsertUserProfile(userAuth.uid, serializedUser).catch(err => console.error(err));

        // Listen to user doc and merge data when available
        if (unsubProfile) {
          unsubProfile();
        }
        unsubProfile = listenToUserDoc(userAuth.uid, (dbState) => {
          console.timeEnd('auth:resolved');
          const initialState = getInitialState(serializedUser);
          if (dbState) {
            legacyFavoritesRef.current = Array.isArray(dbState.favorites) ? dbState.favorites : [];
            savedPlacesMigratedAtRef.current = dbState.savedPlacesMigratedAt || null;
            const loadedEntitlement = dbState.entitlement || getDefaultEntitlement();
            const guestPrefs = getGuestPreferences();
            const hasGuestPrefs = Object.keys(guestPrefs).length > 0;
            if (hasGuestPrefs && !dbState.userPreferences) {
              syncGuestPreferencesToUser(userAuth.uid);
            }
            const { isPro: _ignoredIsPro, ...restDbState } = dbState;
            const resetKey = `${userAuth.uid}:${loadedEntitlement.ai_requests_reset_date || 'none'}`;
            if (shouldResetMonthlyAI(loadedEntitlement) && aiResetAttemptedRef.current !== resetKey) {
              aiResetAttemptedRef.current = resetKey;
              const nextResetDate = getNextResetDate();
              saveUserField(userAuth.uid, 'entitlement', {
                ...loadedEntitlement,
                ai_requests_this_month: 0,
                ai_requests_reset_date: nextResetDate,
              }).catch(err => console.warn('Failed to reset AI usage.', err));
            }
            setState(prev => {
              const savedPlaces = prev.savedPlaces || [];
              const favoritesFromSaved = savedPlaces.map(place => place.placeId);
              const legacyFavorites = Array.isArray(dbState.favorites) ? dbState.favorites : [];
              const partnerSharedPlaces = prev.partnerSharedPlaces || [];
              return {
                ...initialState,
                user: serializedUser,
                ...restDbState,
                favorites: favoritesFromSaved.length > 0 ? favoritesFromSaved : legacyFavorites,
                favoriteDetails: dbState.favoriteDetails || {},
                savedPlaces,
                partnerSharedPlaces,
                visited: dbState.visited || [],
                visitedPlaces: dbState.visitedPlaces || [],
                reviews: dbState.reviews || [],
                memories: dbState.memories || [],
                children: dbState.children || [],
                groups: dbState.groups || [],
                friendCircles: dbState.friendCircles || [],
                entitlement: loadedEntitlement,
                userPreferences: dbState.userPreferences || guestPrefs || {},
                partnerLink: dbState.partnerLink || undefined,
                spouseName: dbState.spouseName || '',
                linkedEmail: dbState.linkedEmail || '',
              };
            });
          } else {
            legacyFavoritesRef.current = [];
            savedPlacesMigratedAtRef.current = null;
            setState(prev => ({
              ...initialState,
              savedPlaces: prev.savedPlaces || [],
              favorites: prev.favorites || [],
              partnerSharedPlaces: prev.partnerSharedPlaces || [],
            }));
          }
        });
      } else {
        setSavedPlacesLoaded(false);
        legacyFavoritesRef.current = [];
        savedPlacesMigratedAtRef.current = null;
        migrationAttemptedRef.current = false;
        aiResetAttemptedRef.current = null;
        lastAuthUidRef.current = null;
        setPendingJoinCircleId(null);
        setState(getInitialState(null));
        setView('login');
        setLoading(false);
        console.timeEnd('auth:resolved');
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
      }
    });

    return () => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      unsubscribe();
    };
  }, [isGuest, state.user?.uid]);

  useEffect(() => {
    if (isGuest) return;
    if (!isFirebaseConfigured || !auth || redirectHandledRef.current) return;
    redirectHandledRef.current = true;
    getRedirectResult(auth).catch((err: any) => {
      if (err?.code === 'auth/unauthorized-domain') {
        setError("This domain is not authorized for Google Sign-In. Please add it to Firebase Console -> Authentication -> Settings -> Authorized domains.");
      } else if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/redirect-cancelled-by-user') {
        setError(null);
      } else if (err) {
        setError(`Login failed: ${err.message || 'Unknown error'}`);
      }
      console.warn('Redirect result error:', err);
      setLoading(false);
    });
  }, [isGuest]);

  useEffect(() => {
    if (isGuest) return;
    if (!isFirebaseConfigured) return;
    const params = new URLSearchParams(window.location.search);
    const isPaymentCallback = params.get('payment_callback') === 'true';
    const ref = params.get('ref');
    if (!isPaymentCallback || !ref) return;
    const uid = auth?.currentUser?.uid || state.user?.uid;
    if (!uid) return;
    (async () => {
      try {
        await fetch(`${API_BASE}/api/paystack/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: ref }),
        });
        await fetch(`${API_BASE}/api/subscription/status/${uid}`);
      } catch (err) {
        console.warn('Payment verification failed', err);
      } finally {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    })();
  }, [isGuest]);

  useEffect(() => {
    if (isGuest) return;
    const uid = state.user?.uid || auth?.currentUser?.uid;
    if (!uid) return;
    const unsub = listenToSavedPlaces(uid, (places) => {
      setSavedPlacesLoaded(true);
      setState(prev => ({
        ...prev,
        savedPlaces: places,
        favorites: places.length > 0 ? places.map(place => place.placeId) : prev.favorites,
      }));
    });
    return () => unsub();
  }, [isGuest, state.user?.uid]);

  const consumeJoinCode = useCallback(async (code: string) => {
    if (!code || joinInFlightRef.current) return;
    if (lastJoinCodeRef.current === code) return;
    const uid = state.user?.uid || auth?.currentUser?.uid;
    const currentUser = state.user || (auth?.currentUser ? {
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
    } : null);
    if (!uid || !currentUser) {
      localStorage.setItem(PENDING_JOIN_KEY, code);
      setView('login');
      return;
    }
    joinInFlightRef.current = true;
    lastJoinCodeRef.current = code;
    try {
      const circle = await joinCircleByCode(code, currentUser);
      setPendingJoinCircleId(circle.id);
      localStorage.removeItem(PENDING_JOIN_KEY);
      setView('dashboard');
      navigate('/', { replace: true });
    } catch (err: any) {
      localStorage.removeItem(PENDING_JOIN_KEY);
      lastJoinCodeRef.current = null;
      if (state.user?.uid) {
        window.alert('Invalid or expired join code. Please ask for a new one.');
        setView('dashboard');
        navigate('/', { replace: true });
      } else {
        setError('Invalid or expired join code. Please ask for a new one.');
        setView('login');
        navigate('/', { replace: true });
      }
      console.warn('Join circle failed.', err);
    } finally {
      joinInFlightRef.current = false;
    }
  }, [state.user, state.user?.uid, navigate]);

  useEffect(() => {
    if (isGuest) return;
    const uid = state.user?.uid || auth?.currentUser?.uid;
    if (!uid) return;
    const pendingCode = localStorage.getItem(PENDING_JOIN_KEY);
    if (pendingCode) {
      consumeJoinCode(pendingCode);
    }
  }, [isGuest, state.user?.uid, consumeJoinCode]);

  const JoinRoute: React.FC = () => {
    const params = useParams();
    const code = params.code?.toUpperCase();
    useEffect(() => {
      if (loading) return;
      if (!code) return;
      if (state.user?.uid || auth?.currentUser?.uid) {
        consumeJoinCode(code);
      } else {
        localStorage.setItem(PENDING_JOIN_KEY, code);
        setView('login');
      }
    }, [code, loading]);
    return renderView();
  };

  useEffect(() => {
    if (isGuest) return;
    const uid = state.user?.uid || auth?.currentUser?.uid;
    if (!uid) return;
    if (!savedPlacesLoaded) return;
    if (migrationAttemptedRef.current) return;
    if (savedPlacesMigratedAtRef.current) return;
    const legacyFavorites = legacyFavoritesRef.current || [];
    if (legacyFavorites.length === 0) {
      migrationAttemptedRef.current = true;
      (async () => {
        try {
          const migratedAt = Timestamp.now();
          await saveUserField(uid, 'savedPlacesMigratedAt', migratedAt);
          savedPlacesMigratedAtRef.current = migratedAt;
        } catch (err) {
          console.warn('Failed to mark savedPlaces migration', err);
        }
      })();
      return;
    }
    const existing = new Set((state.savedPlaces || []).map(place => place.placeId));
    const missing = legacyFavorites.filter(id => !existing.has(id));
    migrationAttemptedRef.current = true;
    (async () => {
      for (const placeId of missing) {
        try {
          const payload: SavedPlace = {
            placeId,
            name: 'Saved place',
            address: '',
            mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
            savedAt: Timestamp.now(),
          };
          await upsertSavedPlace(uid, payload);
        } catch (err) {
          console.warn('Legacy favorite migration failed', { placeId, err });
        }
      }
      try {
        const migratedAt = Timestamp.now();
        await saveUserField(uid, 'savedPlacesMigratedAt', migratedAt);
        savedPlacesMigratedAtRef.current = migratedAt;
      } catch (err) {
        console.warn('Failed to mark savedPlaces migration', err);
      }
    })();
  }, [isGuest, state.user?.uid, savedPlacesLoaded, state.savedPlaces]);

  const renderView = () => {
    console.log('[FamPals] renderView called - loading:', loading, 'view:', view);
    if (loading) {
      return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard
          state={state}
          isGuest={isGuest}
          onSignOut={handleSignOut}
          setView={setView}
          onUpdateState={handleUpdateState}
          initialCircleId={pendingJoinCircleId}
          onClearInitialCircle={() => setPendingJoinCircleId(null)}
        />;
      case 'profile':
        return <Profile state={state} isGuest={isGuest} onSignOut={handleSignOut} setView={setView} onUpdateState={handleUpdateState} />;
      default:
        return <Login onLogin={handleSignIn} onGuestLogin={handleGuestLogin} error={error} />;
    }
  };

  return (
    <Routes>
      <Route path="/" element={
        <div>
          {renderView()}
          <HomeFab visible={view !== 'dashboard' && view !== 'login'} onClick={() => setView('dashboard')} />
        </div>
      } />
      <Route path="/join/:code" element={<JoinRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
