
import React, { useState, useEffect, useCallback } from 'react';
import { Place, ActivityType, AppState, UserReview, Memory, Child, FamilyGroup, FavoriteData } from './types';
import { fetchNearbyPlaces } from './geminiService';
import { auth, db, onAuthStateChanged, doc, onSnapshot, setDoc, collection, query, where, googleProvider, signInWithPopup, signOut, isFirebaseConfigured } from './lib/firebase';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Filters from './components/Filters';
import PlaceCard from './components/PlaceCard';
import FamilyGroups from './components/FamilyGroups';
import Login from './components/Login';
import Profile from './components/Profile';
import VenueProfile from './components/VenueProfile';

const STORAGE_KEY = 'fampals_offline_storage';

const App: React.FC = () => {
  const [view, setView] = useState<'discover' | 'dashboard' | 'groups' | 'profile'>('discover');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [selectedType, setSelectedType] = useState<ActivityType>('all');
  const [radiusKm, setRadiusKm] = useState<number>(10);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);

  const [state, setState] = useState<AppState>(() => {
    // Debug: confirm env + Firebase config (remove once stable)
    console.log("Firebase configured:", isFirebaseConfigured);
    console.log("Firebase env:", {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? "set" : "missing",
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? "set" : "missing",
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? "set" : "missing",
    });

    // Initial state from localStorage for immediate UI responsiveness
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {
      isAuthenticated: false,
      favorites: [],
      favoriteDetails: {},
      visited: [],
      reviews: [],
      memories: [],
      children: [],
      groups: []
    };
  });

  // Auth Listener
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      console.log("Auth state:", user?.email || "logged out");
      if (user) {
        setCurrentUser(user);
        setIsGuest(false);
        setState(prev => ({ ...prev, isAuthenticated: true }));
      } else if (!isGuest) {
        setCurrentUser(null);
        setState(prev => ({ ...prev, isAuthenticated: false }));
      }
    });

    return () => unsubscribe();
  }, [isGuest]);

  // 2. Data Listener (Cloud Sync)
  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured) return;

    const userDocRef = doc(db, 'users', currentUser.uid);

    // Listen to main user profile
    const unsubUser = onSnapshot(userDocRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setState(prev => ({
          ...prev,
          // Only merge fields that are stored on the main user doc
          isAuthenticated: true,
          favorites: data.favorites || [],
          visited: data.visited || [],
          children: data.children || [],
          reviews: data.reviews || [],
          memories: data.memories || [], // Keeping memories on user doc for now as per plan
          groups: prev.groups // Groups are loaded separately
        }));
      } else {
        setDoc(userDocRef, {
          favorites: [],
          visited: [],
          children: [],
          reviews: [],
          memories: []
        }, { merge: true });
      }
    });

    // Listen to Favorites Subcollection
    const favColsRef = collection(db, 'users', currentUser.uid, 'favorites');
    const unsubFavs = onSnapshot(favColsRef, (snapshot: any) => {
      const details: Record<string, FavoriteData> = {};
      snapshot.docs.forEach((d: any) => {
        details[d.id] = d.data() as FavoriteData;
      });
      setState(prev => ({ ...prev, favoriteDetails: details }));
    });

    // Listen to Groups (where user is a member)
    const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
    const unsubGroups = onSnapshot(groupsQuery, (snapshot: any) => {
      const groups: FamilyGroup[] = [];
      snapshot.docs.forEach((d: any) => {
        groups.push({ id: d.id, ...d.data() } as FamilyGroup);
      });
      setState(prev => ({ ...prev, groups }));
    });

    return () => {
      unsubUser();
      unsubFavs();
      unsubGroups();
    };
  }, [currentUser]);

  // 3. Persistent Save Helper
  const syncToCloud = async (newState: Partial<AppState>) => {
    // Update local state immediately for snappy UI
    const updatedState = { ...state, ...newState };
    setState(updatedState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));

    // If logged in, push to Firebase
    if (currentUser && isFirebaseConfigured) {
      setIsSyncing(true);
      try {
        const batchPromises = [];
        const userDocRef = doc(db, 'users', currentUser.uid);

        // handle favoriteDetails (Subcollection)
        if (newState.favoriteDetails) {
          Object.entries(newState.favoriteDetails).forEach(([placeId, data]) => {
            batchPromises.push(setDoc(doc(db, 'users', currentUser.uid, 'favorites', placeId), data, { merge: true }));
          });
        }

        // handle groups (Groups Collection)
        if (newState.groups) {
          newState.groups.forEach(group => {
            batchPromises.push(setDoc(doc(db, 'groups', group.id), group, { merge: true }));
          });
        }

        // handle fields that stay on user doc
        const userDocUpdates: any = {};
        if (newState.favorites) userDocUpdates.favorites = newState.favorites;
        if (newState.visited) userDocUpdates.visited = newState.visited;
        if (newState.children) userDocUpdates.children = newState.children;
        if (newState.reviews) userDocUpdates.reviews = newState.reviews;
        if (newState.memories) userDocUpdates.memories = newState.memories; // Still on user doc for MVP
        if (newState.spouseName) userDocUpdates.spouseName = newState.spouseName;
        if (newState.linkedEmail) userDocUpdates.linkedEmail = newState.linkedEmail;

        if (Object.keys(userDocUpdates).length > 0) {
          batchPromises.push(setDoc(userDocRef, userDocUpdates, { merge: true }));
        }

        await Promise.all(batchPromises);

      } catch (e) {
        console.error("Cloud Sync Failed", e);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const loadLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("Location found:", pos.coords.latitude, pos.coords.longitude);
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (error) => {
          console.warn("Geolocation error:", error.message);
          // Default to New York if location fails
          setLocation({ lat: 40.7128, lng: -74.0060 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    } else {
      console.warn("Geolocation not supported");
      setLocation({ lat: 40.7128, lng: -74.0060 });
    }
  }, []);

  useEffect(() => { loadLocation(); }, [loadLocation]);

  const searchPlaces = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    const results = await fetchNearbyPlaces(location.lat, location.lng, selectedType, state.children, radiusKm);
    setPlaces(results);
    setLoading(false);
  }, [location, selectedType, radiusKm, state.children]);

  useEffect(() => { searchPlaces(); }, [searchPlaces]);

  const handleLogin = async (mode: 'google' | 'guest' = 'google') => {
    if (mode === 'guest') {
      setIsGuest(true);
      setState(prev => ({ ...prev, isAuthenticated: true }));
      return;
    }

    if (!isFirebaseConfigured) {
      alert("Firebase is not configured yet. Please use Guest Mode to try the app!");
      return;
    }

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.log("FULL Google auth error:", err);
      alert(`Google sign-in failed: ${err?.code || err?.message}`);
    }
  };

  const handleLogout = () => {
    if (isFirebaseConfigured) signOut(auth);
    setIsGuest(false);
    setCurrentUser(null);
    setState(prev => ({ ...prev, isAuthenticated: false }));
  };

  if (!state.isAuthenticated) {
    return <Login onLogin={() => handleLogin('google')} onGuestLogin={() => handleLogin('guest')} />;
  }

  const toggleFavorite = (id: string) => {
    const isFav = state.favorites.includes(id);
    const newFavorites = isFav ? state.favorites.filter(f => f !== id) : [...state.favorites, id];
    syncToCloud({ favorites: newFavorites });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {selectedPlace && (
        <VenueProfile
          place={selectedPlace}
          isFavorite={state.favorites.includes(selectedPlace.id)}
          favoriteData={state.favoriteDetails[selectedPlace.id]}
          onClose={() => setSelectedPlace(null)}
          onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
          onUpdateDetails={(data) => {
            const updatedDetails = { ...state.favoriteDetails, [selectedPlace.id]: { ...state.favoriteDetails[selectedPlace.id], ...data } };
            syncToCloud({ favoriteDetails: updatedDetails });
          }}
        />
      )}

      {!selectedPlace && (
        <>
          <Header setView={setView} isSyncing={isSyncing} />
          <main className="max-w-screen-xl mx-auto">
            {isGuest && !isFirebaseConfigured && (
              <div className="mx-5 mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                <span className="text-xl">🛠️</span>
                <p className="text-[10px] font-bold text-amber-700 leading-tight">
                  <span className="block uppercase font-black mb-0.5">Development Mode</span>
                  Cloud sync is disabled. Add your Firebase API key to <code className="bg-amber-100 px-1 rounded">lib/firebase.ts</code> to enable Google Login.
                </p>
              </div>
            )}

            {view === 'discover' && (
              <div className="space-y-8 animate-slide-up">
                <div className="px-5 mt-4">
                  <h2 className="text-2xl font-black text-[#1E293B] tracking-tight">Browse Local</h2>
                  <Filters selected={selectedType} onChange={setSelectedType} radiusKm={radiusKm} onRadiusChange={setRadiusKm} />
                </div>

                <section className="px-5">
                  <div className="flex justify-between items-end mb-6">
                    <h2 className="text-2xl font-black text-[#1E293B] tracking-tight">Highly Rated</h2>
                    <button className="text-sky-500 font-black text-[10px] uppercase tracking-widest bg-sky-50 px-3 py-1.5 rounded-xl">See all</button>
                  </div>
                  {loading ? (
                    <div className="flex gap-4 overflow-x-hidden px-5">
                      <div className="min-w-[280px] h-[380px] bg-slate-100 rounded-[40px] animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="flex gap-6 overflow-x-auto no-scrollbar py-2 -mx-5 px-5">
                      {places.map(place => (
                        <PlaceCard
                          key={place.id} place={place} variant="hero"
                          isFavorite={state.favorites.includes(place.id)}
                          onToggleFavorite={() => toggleFavorite(place.id)}
                          onClick={() => setSelectedPlace(place)}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section className="px-5 mb-8">
                  <h2 className="text-2xl font-black text-[#1E293B] mb-6 tracking-tight">Explore More</h2>
                  <div className="grid grid-cols-1 gap-5">
                    {places.slice(2).map(place => (
                      <PlaceCard
                        key={place.id} place={place} variant="list"
                        isFavorite={state.favorites.includes(place.id)}
                        onToggleFavorite={() => toggleFavorite(place.id)}
                        onClick={() => setSelectedPlace(place)}
                      />
                    ))}
                  </div>
                </section>
              </div>
            )}
            {view === 'dashboard' && (
              <Dashboard
                favorites={places.filter(p => state.favorites.includes(p.id))}
                visitedPlaces={places.filter(p => state.visited.includes(p.id))}
                memories={state.memories}
                reviews={state.reviews}
                onAddMemory={(m) => syncToCloud({ memories: [m, ...state.memories] })}
              />
            )}
            {view === 'groups' && <FamilyGroups groups={state.groups} onAddGroup={(g) => syncToCloud({ groups: [...state.groups, g] })} />}
            {view === 'profile' && (
              <Profile
                userState={state}
                onLogout={handleLogout}
                onAddChild={(c) => syncToCloud({ children: [...state.children, c] })}
                onRemoveChild={(id) => syncToCloud({ children: state.children.filter(c => c.id !== id) })}
                onLinkSpouse={(e) => syncToCloud({ linkedEmail: e, spouseName: 'Partner' })}
              />
            )}
          </main>
          <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md h-20 bottom-nav-blur rounded-[40px] border border-white shadow-[0_25px_50px_-12px_rgba(14,165,233,0.15)] flex justify-around items-center px-8 z-50">
            <NavButton icon="🧭" label="Discover" active={view === 'discover'} onClick={() => setView('discover')} />
            <NavButton icon="💙" label="Saved" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
            <div className="relative -top-10"><button className="w-16 h-16 bg-gradient-to-br from-[#7DD3FC] to-[#0EA5E9] rounded-3xl shadow-2xl shadow-sky-200 flex items-center justify-center text-white text-3xl transition-transform active-press">＋</button></div>
            <NavButton icon="🫂" label="Groups" active={view === 'groups'} onClick={() => setView('groups')} />
            <NavButton icon="👤" label="Me" active={view === 'profile'} onClick={() => setView('profile')} />
          </nav>
        </>
      )}
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 transition-all">
    <span className={`text-2xl transition-transform ${active ? 'scale-110' : 'opacity-40 grayscale'}`}>{icon}</span>
    <span className={`text-[9px] font-black uppercase tracking-tighter transition-colors ${active ? 'text-sky-600' : 'text-slate-300'}`}>{label}</span>
  </button>
);

export default App;
