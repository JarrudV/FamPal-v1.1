
import React, { useState, useEffect, useCallback } from 'react';
import { Place, ActivityType, AppState, UserReview, Memory, Child, FamilyGroup, FavoriteData } from './types';
import { fetchNearbyPlaces } from './geminiService';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Filters from './components/Filters';
import PlaceCard from './components/PlaceCard';
import FamilyGroups from './components/FamilyGroups';
import Login from './components/Login';
import Profile from './components/Profile';
import VenueProfile from './components/VenueProfile';

const App: React.FC = () => {
  const [view, setView] = useState<'discover' | 'dashboard' | 'groups' | 'profile'>('discover');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [selectedType, setSelectedType] = useState<ActivityType>('all');
  const [showInstallTip, setShowInstallTip] = useState(false);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('fampals_v4_store');
    return saved ? JSON.parse(saved) : {
      isAuthenticated: false,
      favorites: [],
      favoriteDetails: {},
      visited: [],
      reviews: [],
      memories: [],
      children: [],
      groups: [
        { id: '1', name: 'The Millers', type: 'Family', members: ['Mom', 'Dad', 'Buddy'], inviteCode: 'MILLER-123' }
      ]
    };
  });

  useEffect(() => {
    localStorage.setItem('fampals_v4_store', JSON.stringify(state));
  }, [state]);

  // Check if it's running as a standalone app or browser
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (!isStandalone && state.isAuthenticated) {
      const timer = setTimeout(() => setShowInstallTip(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.isAuthenticated]);

  const loadLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      }, () => setLocation({ lat: 37.7749, lng: -122.4194 }));
    } else {
      setLocation({ lat: 37.7749, lng: -122.4194 });
    }
  }, []);

  useEffect(() => { loadLocation(); }, [loadLocation]);

  const searchPlaces = useCallback(async () => {
    if (!location || !state.isAuthenticated) return;
    setLoading(true);
    const results = await fetchNearbyPlaces(location.lat, location.lng, selectedType, state.children);
    setPlaces(results);
    setLoading(false);
  }, [location, selectedType, state.isAuthenticated, state.children]);

  useEffect(() => { searchPlaces(); }, [searchPlaces]);

  if (!state.isAuthenticated) {
    return <Login onLogin={() => setState(prev => ({ ...prev, isAuthenticated: true }))} />;
  }

  const toggleFavorite = (id: string) => {
    setState(prev => {
      const isFav = prev.favorites.includes(id);
      return {
        ...prev,
        favorites: isFav ? prev.favorites.filter(f => f !== id) : [...prev.favorites, id],
        favoriteDetails: isFav 
          ? { ...prev.favoriteDetails } 
          : { ...prev.favoriteDetails, [id]: prev.favoriteDetails[id] || { placeId: id, notes: '', costEstimate: '', menuPhotos: [] } }
      };
    });
  };

  const updateFavoriteDetail = (placeId: string, data: Partial<FavoriteData>) => {
    setState(prev => ({
      ...prev,
      favoriteDetails: {
        ...prev.favoriteDetails,
        [placeId]: { ...prev.favoriteDetails[placeId], ...data }
      }
    }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {showInstallTip && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 w-[85%] bg-white p-4 rounded-3xl shadow-2xl border border-sky-100 z-[100] animate-slide-up flex items-center gap-4">
          <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center text-white">✨</div>
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-sky-500 mb-0.5">Pro Tip</p>
            <p className="text-[11px] font-bold text-slate-600">Tap <span className="text-sky-500">Share</span> and <span className="text-sky-500">"Add to Home Screen"</span> for a better experience!</p>
          </div>
          <button onClick={() => setShowInstallTip(false)} className="text-slate-300 p-2">✕</button>
        </div>
      )}

      {selectedPlace && (
        <VenueProfile 
          place={selectedPlace} 
          isFavorite={state.favorites.includes(selectedPlace.id)}
          favoriteData={state.favoriteDetails[selectedPlace.id]}
          onClose={() => setSelectedPlace(null)}
          onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
          onUpdateDetails={(data) => updateFavoriteDetail(selectedPlace.id, data)}
        />
      )}

      {!selectedPlace && (
        <>
          <Header setView={setView} />
          <main className="max-w-screen-xl mx-auto">
            {view === 'discover' && (
              <div className="space-y-8 animate-slide-up">
                <div className="px-5 mt-4">
                  <h2 className="text-2xl font-black text-[#1E293B] tracking-tight">Browse Local</h2>
                  <Filters selected={selectedType} onChange={setSelectedType} />
                </div>

                <section className="px-5">
                  <div className="flex justify-between items-end mb-6">
                    <h2 className="text-2xl font-black text-[#1E293B] tracking-tight">Highly Rated</h2>
                    <button className="text-sky-500 font-black text-[10px] uppercase tracking-widest bg-sky-50 px-3 py-1.5 rounded-xl">See all</button>
                  </div>
                  {loading ? (
                    <div className="flex gap-4 overflow-x-hidden px-5"><div className="min-w-[280px] h-[380px] bg-slate-100 rounded-[40px] animate-pulse"></div></div>
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
                onAddMemory={(m) => setState(prev => ({ ...prev, memories: [m, ...prev.memories] }))}
              />
            )}
            {view === 'groups' && <FamilyGroups groups={state.groups} onAddGroup={(g) => setState(prev => ({ ...prev, groups: [...prev.groups, g] }))} />}
            {view === 'profile' && <Profile userState={state} onLogout={() => setState(prev => ({ ...prev, isAuthenticated: false }))} onAddChild={(c) => setState(prev => ({...prev, children: [...prev.children, c]}))} onRemoveChild={(id) => setState(prev => ({...prev, children: prev.children.filter(c => c.id !== id)}))} onLinkSpouse={(e) => setState(prev => ({...prev, linkedEmail: e, spouseName: 'Partner'}))} />}
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