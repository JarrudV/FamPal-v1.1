import React, { useState, useEffect } from 'react';
import { AppState, Place, Memory, UserReview, ActivityType } from '../types';
import Header from './Header';
import PlaceCard from './PlaceCard';
import Filters from './Filters';
import VenueProfile from './VenueProfile';
import { fetchNearbyPlaces } from '../geminiService';

interface DashboardProps {
  state: AppState;
  onSignOut: () => void;
  setView: (view: string) => void;
  onUpdateState: (key: keyof AppState, value: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, onSignOut, setView, onUpdateState }) => {
  const [activeTab, setActiveTab] = useState<'explore' | 'favorites' | 'memories'>('explore');
  const [selectedFilter, setSelectedFilter] = useState<ActivityType>('all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [caption, setCaption] = useState('');
  
  // Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('Locating...');
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Radius slider state (in km)
  const [radiusKm, setRadiusKm] = useState(10);

  // Get user's location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setLocationName('Unknown Location');
      // Fallback to default location
      setUserLocation({ lat: 37.7749, lng: -122.4194 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Reverse geocode to get location name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || 'Your Area';
          setLocationName(city);
        } catch (err) {
          setLocationName('Your Area');
        }
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError('Unable to get location');
        setLocationName('Unknown Location');
        // Fallback to default location
        setUserLocation({ lat: 37.7749, lng: -122.4194 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // Fetch places when location, filter, or radius changes
  useEffect(() => {
    const fetchPlaces = async () => {
      if (!userLocation) return;
      
      setLoading(true);
      try {
        const results = await fetchNearbyPlaces(
          userLocation.lat, 
          userLocation.lng, 
          selectedFilter, 
          state.children,
          radiusKm
        );
        setPlaces(results);
      } catch (error) {
        console.error('Error fetching places:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (activeTab === 'explore' && userLocation) {
      fetchPlaces();
    }
  }, [selectedFilter, activeTab, state.children, userLocation, radiusKm]);

  const toggleFavorite = (placeId: string) => {
    const newFavorites = state.favorites.includes(placeId)
      ? state.favorites.filter(id => id !== placeId)
      : [...state.favorites, placeId];
    onUpdateState('favorites', newFavorites);
  };

  const captureMemory = () => {
    if (!caption) return;
    const newMemory: Memory = {
      id: Date.now().toString(),
      placeId: 'manual',
      placeName: 'Current Location',
      photoUrl: `https://picsum.photos/seed/${Date.now()}/600/600`,
      caption,
      taggedFriends: [],
      date: new Date().toLocaleDateString()
    };
    onUpdateState('memories', [...state.memories, newMemory]);
    setCaption('');
    setShowAddMemory(false);
  };

  const favoritePlaces = places.filter(p => state.favorites.includes(p.id));

  if (selectedPlace) {
    return (
      <VenueProfile 
        place={selectedPlace} 
        isFavorite={state.favorites.includes(selectedPlace.id)}
        onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
        onClose={() => setSelectedPlace(null)}
        onUpdateDetails={(data) => {
          const newDetails = { ...state.favoriteDetails, [selectedPlace.id]: { ...state.favoriteDetails[selectedPlace.id], ...data, placeId: selectedPlace.id } };
          onUpdateState('favoriteDetails', newDetails);
        }}
        favoriteData={state.favoriteDetails[selectedPlace.id]}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <Header setView={setView} user={state.user} locationName={locationName} />
      
      <div className="px-5 py-4">
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
          <TabButton label="Explore" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <TabButton label="Saved" count={state.favorites.length} active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} />
          <TabButton label="Memories" count={state.memories.length} active={activeTab === 'memories'} onClick={() => setActiveTab('memories')} />
        </div>

        {activeTab === 'explore' && (
          <>
            <Filters selected={selectedFilter} onChange={setSelectedFilter} />
            
            {/* Radius Slider */}
            <div className="bg-white rounded-3xl p-5 mt-4 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Search Radius</span>
                <span className="text-sm font-black text-sky-500">{radiusKm} km</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-slate-400 font-bold">1 km</span>
                <span className="text-[10px] text-slate-400 font-bold">200 km</span>
              </div>
            </div>

            {locationError && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4 text-amber-700 text-xs font-bold">
                {locationError}. Showing default location.
              </div>
            )}
            
            {loading || !userLocation ? (
              <div className="py-24 text-center text-slate-300 font-black text-xs uppercase tracking-widest">
                {!userLocation ? 'Getting your location...' : 'Finding adventures...'}
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {places.map(place => (
                  <PlaceCard 
                    key={place.id} 
                    place={place}
                    variant="list"
                    isFavorite={state.favorites.includes(place.id)}
                    onToggleFavorite={() => toggleFavorite(place.id)}
                    onClick={() => setSelectedPlace(place)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'favorites' && (
          <div className="space-y-4 mt-4">
            {favoritePlaces.length > 0 ? (
              favoritePlaces.map(place => (
                <PlaceCard 
                  key={place.id} 
                  place={place}
                  variant="list"
                  isFavorite={true}
                  onToggleFavorite={() => toggleFavorite(place.id)}
                  onClick={() => setSelectedPlace(place)}
                />
              ))
            ) : (
              <div className="py-24 text-center text-slate-300 font-black text-xs uppercase tracking-widest bg-white rounded-[40px] border border-slate-50">
                No saved spots yet.
              </div>
            )}
          </div>
        )}

        {activeTab === 'memories' && (
          <div className="space-y-4 mt-4">
            <button 
              onClick={() => setShowAddMemory(!showAddMemory)}
              className="w-full bg-sky-500 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-100"
            >
              {showAddMemory ? 'Cancel' : 'Add Memory'}
            </button>

            {showAddMemory && (
              <div className="bg-white p-6 rounded-[40px] shadow-2xl border border-sky-50 space-y-4 animate-slide-up">
                <h3 className="font-black text-sky-900">Tag a Memory</h3>
                <textarea 
                  placeholder="What happened today?..."
                  className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold text-slate-600 outline-none"
                  rows={3}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                />
                <button 
                  onClick={captureMemory}
                  className="w-full h-14 bg-sky-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-100"
                >
                  Save Memory
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {state.memories.map(memory => (
                <div key={memory.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm relative group aspect-square">
                  <img src={memory.photoUrl} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-gradient-to-t from-sky-950/80 via-transparent flex flex-col justify-end p-5 text-white">
                    <p className="text-[10px] font-black leading-tight mb-1">{memory.caption}</p>
                    <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest">@{memory.placeName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bottom-nav-blur border-t border-slate-100 px-6 py-4 safe-area-inset-bottom">
        <div className="flex justify-around">
          <NavButton icon="🏠" label="Home" active={true} onClick={() => {}} />
          <NavButton icon="💙" label="Saved" active={false} onClick={() => setActiveTab('favorites')} />
          <NavButton icon="👤" label="Profile" active={false} onClick={() => setView('profile')} />
        </div>
      </nav>
    </div>
  );
};

const TabButton = ({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
      active ? 'bg-sky-500 text-white shadow-lg shadow-sky-100' : 'bg-white text-slate-400 border border-slate-100'
    }`}
  >
    {label} {count !== undefined && <span className="opacity-60">[{count}]</span>}
  </button>
);

const NavButton = ({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 ${active ? 'text-sky-500' : 'text-slate-300'}`}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default Dashboard;
