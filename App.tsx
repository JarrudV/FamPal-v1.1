
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
import DashboardNetflix from './components/DashboardNetflix';
import Profile from './components/Profile';
import Onboarding from './components/Onboarding';
import { AppState, User, getDefaultEntitlement, UserPreferences, SavedPlace, Preferences, Child, PartnerLink, ProfileInfo } from './types';
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
  profileInfo: undefined,
  favorites: [],
  favoriteDetails: {},
  savedPlaces: [],
  onboardingCompletedAt: undefined,
  profileCompletionRequired: false,
  familyPool: undefined,
  visited: [],
  visitedPlaces: [],
  reviews: [],
  memories: [],
  children: [],
  spouseName: '',
  linkedEmail: '',
  accessibilityNeeds: {
    usesWheelchair: false,
    needsStepFree: false,
    needsAccessibleToilet: false,
    prefersPavedPaths: false,
    usesPushchair: false,
  },
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
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [pendingJoinCircleId, setPendingJoinCircleId] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'explore' | 'favorites' | 'adventures' | 'memories' | 'circles' | 'partner'>('explore');
  const [useNetflixLayout, setUseNetflixLayout] = useState(() => {
    try { return localStorage.getItem('fampals_netflix_layout') === 'true'; } catch { return false; }
  });
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('fampals_dark_mode') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
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

  type OnboardingResult = {
    profileInfo?: ProfileInfo | null;
    preferences?: Preferences | null;
    children?: Child[] | null;
    userPreferences?: UserPreferences | null;
    partnerLink?: PartnerLink | null;
    skipped: boolean;
  };

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
      setNeedsOnboarding(false);
      setState(getInitialState(null));
      setView('login');
      return;
    }
    try {
      await firebaseSignOut(auth);
      setState(getInitialState(null));
      setNeedsOnboarding(false);
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
        if (key !== 'savedPlaces' && key !== 'partnerSharedPlaces' && key !== 'familyPool') {
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
        const serializedUser = serializeUser(userAuth);
        console.log('[FamPals] User authenticated:', userAuth.email);
        setState(prev => ({ ...prev, isAuthenticated: true, user: serializedUser }));
        // Don't set view here - wait for Firestore to check onboarding status first

        // Safety timeout to prevent stuck loading state if Firestore fails
        const loadingTimeout = setTimeout(() => {
          if (loading) {
            console.warn('[FamPals] Firestore timeout - forcing load');
            setLoading(false);
            setOnboardingChecked(true);
          }
        }, 8000);

        // Upsert profile (non-blocking) and start listening for data
        upsertUserProfile(userAuth.uid, serializedUser).catch(err => console.error(err));

        // Listen to user doc and merge data when available
        if (unsubProfile) {
          unsubProfile();
        }
        unsubProfile = listenToUserDoc(userAuth.uid, (dbState) => {
          clearTimeout(loadingTimeout);
          console.timeEnd('auth:resolved');
          const initialState = getInitialState(serializedUser);
          if (dbState) {
            const onboardingCompleted = !!dbState.onboardingCompletedAt || dbState.onboardingCompleted === true;
            setNeedsOnboarding(!onboardingCompleted);
            setOnboardingChecked(true);
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
              const familyPool = prev.familyPool;
              return {
                ...initialState,
                user: serializedUser,
                ...restDbState,
                favorites: favoritesFromSaved.length > 0 ? favoritesFromSaved : legacyFavorites,
                favoriteDetails: dbState.favoriteDetails || {},
                savedPlaces,
                partnerSharedPlaces,
                familyPool,
                visited: dbState.visited || [],
                visitedPlaces: dbState.visitedPlaces || [],
                reviews: dbState.reviews || [],
                memories: (() => {
                  const mems = dbState.memories || [];
                  if (mems.length > 0) {
                    console.log('[FamPals] Loaded memories from Firestore:', mems.length, 'first memory photos:', {
                      photoUrl: mems[0]?.photoUrl,
                      photoUrls: mems[0]?.photoUrls,
                      photoThumbUrl: mems[0]?.photoThumbUrl,
                      photoThumbUrls: mems[0]?.photoThumbUrls,
                    });
                  }
                  return mems;
                })(),
                children: dbState.children || [],
                groups: dbState.groups || [],
                friendCircles: dbState.friendCircles || [],
                entitlement: loadedEntitlement,
                userPreferences: dbState.userPreferences || guestPrefs || {},
                partnerLink: dbState.partnerLink || undefined,
                spouseName: dbState.spouseName || '',
                linkedEmail: dbState.linkedEmail || '',
                onboardingCompletedAt: dbState.onboardingCompletedAt,
                profileCompletionRequired: dbState.profileCompletionRequired || false,
              };
            });
            setLoading(false);
            if (!onboardingCompleted) {
              setView('onboarding');
            } else if (view === 'onboarding') {
              setView('dashboard');
            }
          } else {
            legacyFavoritesRef.current = [];
            savedPlacesMigratedAtRef.current = null;
            setNeedsOnboarding(true);
            setOnboardingChecked(true);
            setState(prev => ({
              ...initialState,
              savedPlaces: prev.savedPlaces || [],
              favorites: prev.favorites || [],
              partnerSharedPlaces: prev.partnerSharedPlaces || [],
              familyPool: prev.familyPool,
            }));
            setLoading(false);
            setView('onboarding');
          }
        });
      } else {
        setSavedPlacesLoaded(false);
        legacyFavoritesRef.current = [];
        savedPlacesMigratedAtRef.current = null;
        migrationAttemptedRef.current = false;
        aiResetAttemptedRef.current = null;
        lastAuthUidRef.current = null;
        setNeedsOnboarding(false);
        setOnboardingChecked(true);
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

  const handleOnboardingComplete = useCallback(async (result: OnboardingResult) => {
    const uid = state.user?.uid || auth?.currentUser?.uid;
    if (!uid) return;
    const completedAt = Timestamp.now();
    try {
      await saveUserField(uid, 'onboardingCompletedAt', completedAt);
      await saveUserField(uid, 'onboardingCompleted', true);
      await saveUserField(uid, 'profileCompletionRequired', result.skipped);
      if (result.userPreferences) {
        handleUpdateState('userPreferences', result.userPreferences);
      }
      if (result.profileInfo) {
        const mergedProfile = { ...(state.profileInfo || {}), ...result.profileInfo };
        handleUpdateState('profileInfo', mergedProfile);
      }
      if (result.preferences) {
        handleUpdateState('preferences', result.preferences);
      }
      if (result.children) {
        handleUpdateState('children', result.children);
      }
      if (result.partnerLink && !state.partnerLink) {
        handleUpdateState('partnerLink', result.partnerLink);
      }
      setState(prev => ({
        ...prev,
        onboardingCompletedAt: completedAt,
        profileCompletionRequired: result.skipped,
      }));
    } catch (err) {
      console.warn('Failed to persist onboarding state.', err);
    } finally {
      setNeedsOnboarding(false);
      setView('dashboard');
    }
  }, [state.user?.uid, state.profileInfo, state.partnerLink, handleUpdateState]);

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
    console.log('[FamPals] renderView called - loading:', loading, 'view:', view, 'onboardingChecked:', onboardingChecked, 'needsOnboarding:', needsOnboarding);
    
    // Show loading while waiting for auth or onboarding status check
    if (loading) {
      return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-sky-50 to-white"><div className="text-sky-500 text-lg">Loading...</div></div>;
    }

    // For authenticated users, wait for onboarding check to complete BEFORE rendering anything else
    if (!isGuest && state.user && !onboardingChecked) {
      return <div className="flex items-center justify-center h-screen bg-gradient-to-br from-sky-50 to-white"><div className="text-sky-500 text-lg">Loading...</div></div>;
    }

    // If authenticated and needs onboarding, show onboarding (highest priority for authenticated users)
    if (!isGuest && state.user && needsOnboarding) {
      return (
        <Onboarding
          userName={state.user?.displayName || state.user?.email}
          initialProfileInfo={state.profileInfo}
          initialUserPreferences={state.userPreferences}
          initialPreferences={state.preferences}
          initialChildren={state.children}
          initialPartnerLink={state.partnerLink}
          onComplete={handleOnboardingComplete}
        />
      );
    }

    const toggleDiscoveryMode = () => {
      const next = !useNetflixLayout;
      setUseNetflixLayout(next);
      try { localStorage.setItem('fampals_netflix_layout', next ? 'true' : 'false'); } catch {}
    };

    const dashboardProps = {
      state,
      isGuest,
      onSignOut: handleSignOut,
      setView,
      onUpdateState: handleUpdateState,
      initialCircleId: pendingJoinCircleId,
      onClearInitialCircle: () => setPendingJoinCircleId(null),
      initialTab: dashboardTab,
      onTabChange: (tab: string) => setDashboardTab(tab as typeof dashboardTab),
      discoveryMode: useNetflixLayout,
      onToggleDiscoveryMode: toggleDiscoveryMode,
    };
    const DashboardComponent = useNetflixLayout ? DashboardNetflix : Dashboard;

    if (state.user && !needsOnboarding && view === 'login') {
      return <DashboardComponent {...dashboardProps} />;
    }

    switch (view) {
      case 'dashboard':
        return <DashboardComponent {...dashboardProps} />;
      case 'onboarding':
        return (
          <Onboarding
            userName={state.user?.displayName || state.user?.email}
            initialProfileInfo={state.profileInfo}
            initialUserPreferences={state.userPreferences}
            initialPreferences={state.preferences}
            initialChildren={state.children}
            initialPartnerLink={state.partnerLink}
            onComplete={handleOnboardingComplete}
          />
        );
      case 'profile':
        return <Profile state={state} isGuest={isGuest} onSignOut={handleSignOut} setView={setView} onUpdateState={handleUpdateState} onResetOnboarding={() => setNeedsOnboarding(true)} darkMode={darkMode} onToggleDarkMode={() => { const next = !darkMode; setDarkMode(next); try { localStorage.setItem('fampals_dark_mode', next ? 'true' : 'false'); } catch {} }} />;
      default:
        return <Login onLogin={handleSignIn} onGuestLogin={handleGuestLogin} error={error} />;
    }
  };

  const showBottomNav = !loading && onboardingChecked && (view === 'dashboard' || view === 'profile') && !needsOnboarding;

  const NavIcon = ({ type, active }: { type: string; active: boolean }) => {
    const cls = `w-[22px] h-[22px] transition-colors ${active ? 'text-sky-500' : 'text-slate-400'}`;
    switch (type) {
      case 'home':
        return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
      case 'saved':
        return <svg className={cls} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>;
      case 'circles':
        return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
      case 'profile':
        return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
      default:
        return null;
    }
  };

  const NavButton = ({ type, label, active, onClick }: { type: string; label: string; active: boolean; onClick: () => void }) => (
    <button 
      onClick={onClick}
      aria-label={label}
      className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all min-w-[56px] no-min-size ${
        active ? 'text-sky-500' : 'text-slate-400'
      }`}
    >
      <NavIcon type={type} active={active} />
      <span className={`text-[10px] font-semibold ${active ? 'text-sky-500' : 'text-slate-400'}`}>{label}</span>
    </button>
  );

  return (
    <Routes>
      <Route path="/" element={
        <div>
          {renderView()}
          {showBottomNav && (
            <nav className="fixed bottom-0 left-0 right-0 bottom-nav-blur border-t border-slate-200/60 px-2 pt-2 pb-1 safe-area-inset-bottom z-50">
              <div className="flex justify-around max-w-md mx-auto">
                <NavButton type="home" label="Home" active={view === 'dashboard' && dashboardTab === 'explore'} onClick={() => { setDashboardTab('explore'); setView('dashboard'); }} />
                <NavButton type="saved" label="Saved" active={view === 'dashboard' && dashboardTab === 'favorites'} onClick={() => { setDashboardTab('favorites'); setView('dashboard'); }} />
                <NavButton type="circles" label="Circles" active={view === 'dashboard' && dashboardTab === 'circles'} onClick={() => { setDashboardTab('circles'); setView('dashboard'); }} />
                <NavButton type="profile" label="Profile" active={view === 'profile'} onClick={() => setView('profile')} />
              </div>
            </nav>
          )}
        </div>
      } />
      <Route path="/join/:code" element={<JoinRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
