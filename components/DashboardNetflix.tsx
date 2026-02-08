import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, Place, ExploreIntent, SavedPlace } from '../types';
import Header from './Header';
import PlaceCard from './PlaceCard';
import VenueProfile from './VenueProfile';
import { searchExploreIntent } from '../placesService';
import { canSavePlace } from '../lib/entitlements';
import { updateLocation, updateRadius } from '../lib/profileSync';
import { auth } from '../lib/firebase';
import { upsertSavedPlace, deleteSavedPlace } from '../lib/userData';
import { Timestamp } from 'firebase/firestore';

interface DashboardNetflixProps {
  state: AppState;
  isGuest: boolean;
  onSignOut: () => void;
  setView: (view: string) => void;
  onUpdateState: (key: keyof AppState, value: any) => void;
  initialCircleId?: string | null;
  onClearInitialCircle?: () => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

interface RowData {
  id: ExploreIntent;
  label: string;
  icon: string;
  places: Place[];
  loading: boolean;
  error?: string;
}

const ROW_CONFIGS: { id: ExploreIntent; label: string; icon: string }[] = [
  { id: 'play_kids', label: 'Play & Kids', icon: '🛝' },
  { id: 'eat_drink', label: 'Eat & Drink', icon: '🍽️' },
  { id: 'outdoors', label: 'Outdoors', icon: '🌿' },
  { id: 'things_to_do', label: 'Things to Do', icon: '🎟️' },
  { id: 'sport_active', label: 'Sport & Active', icon: '⚽' },
  { id: 'indoor', label: 'Indoor', icon: '🏛️' },
];

const SkeletonCard: React.FC = () => (
  <div className="min-w-[160px] h-[220px] bg-white rounded-2xl overflow-hidden shrink-0 border border-slate-100 animate-pulse">
    <div className="w-full h-[130px] bg-slate-100" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-slate-100 rounded-full w-3/4" />
      <div className="h-2.5 bg-slate-50 rounded-full w-1/2" />
      <div className="h-2 bg-slate-50 rounded-full w-1/3" />
    </div>
  </div>
);

const SkeletonRow: React.FC = () => (
  <div className="mb-6">
    <div className="flex items-center gap-2 mb-3 px-1">
      <div className="w-6 h-6 bg-slate-100 rounded-lg animate-pulse" />
      <div className="h-4 w-28 bg-slate-100 rounded-full animate-pulse" />
    </div>
    <div className="flex gap-3 overflow-hidden">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
);

const NetflixPlaceCard: React.FC<{
  place: Place;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}> = ({ place, isFavorite, onToggleFavorite, onClick }) => (
  <div
    onClick={onClick}
    className="min-w-[160px] w-[160px] bg-white rounded-2xl overflow-hidden shrink-0 border border-slate-100 shadow-sm cursor-pointer active:scale-[0.97] transition-transform"
  >
    <div className="relative w-full h-[130px] bg-slate-100">
      <img
        src={place.imageUrl}
        alt={place.name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-sm shadow-sm"
        aria-label={isFavorite ? 'Remove from saved' : 'Save place'}
      >
        {isFavorite ? '💙' : '🤍'}
      </button>
      {place.distance && (
        <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold rounded-full">
          {place.distance}
        </span>
      )}
    </div>
    <div className="p-2.5">
      <h3 className="font-bold text-[13px] text-slate-800 leading-tight line-clamp-2">{place.name}</h3>
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-amber-500 text-[11px] font-bold">⭐ {place.rating ?? '—'}</span>
        {place.priceLevel && <span className="text-slate-300 text-[11px]">{place.priceLevel}</span>}
      </div>
      {place.tags?.length > 0 && (
        <span className="inline-block mt-1.5 px-1.5 py-0.5 bg-sky-50 text-sky-600 text-[9px] font-bold uppercase tracking-wider rounded">
          {place.tags[0]}
        </span>
      )}
    </div>
  </div>
);

const HeroCard: React.FC<{
  place: Place;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}> = ({ place, isFavorite, onToggleFavorite, onClick }) => (
  <div
    onClick={onClick}
    className="relative w-full h-[200px] rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
  >
    <img
      src={place.imageUrl}
      alt={place.name}
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
    <button
      onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
      className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center border border-white/20"
      aria-label={isFavorite ? 'Remove from saved' : 'Save place'}
    >
      <span className="text-lg">{isFavorite ? '💙' : '🤍'}</span>
    </button>
    <div className="absolute bottom-0 left-0 right-0 p-4">
      <div className="flex gap-2 mb-1">
        {place.tags?.slice(0, 2).map((t) => (
          <span key={t} className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider rounded-full">{t}</span>
        ))}
      </div>
      <h3 className="text-lg font-extrabold text-white leading-tight">{place.name}</h3>
      <div className="flex items-center gap-3 mt-1 text-[11px] text-white/80 font-medium">
        <span className="text-amber-300 font-bold">⭐ {place.rating ?? '—'}</span>
        {place.distance && <><span>·</span><span>{place.distance}</span></>}
      </div>
    </div>
  </div>
);

const DashboardNetflix: React.FC<DashboardNetflixProps> = ({ state, isGuest, onSignOut, setView, onUpdateState, initialCircleId, onClearInitialCircle, initialTab, onTabChange }) => {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const userPrefs = state.userPreferences || {};
  const [activeTab, setActiveTab] = useState<'explore' | 'favorites' | 'adventures' | 'memories' | 'circles' | 'partner'>(
    (initialTab as any) || 'explore'
  );

  React.useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  const handleTabChange = (tab: 'explore' | 'favorites' | 'adventures' | 'memories' | 'circles' | 'partner') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    userPrefs.lastLocation ? { lat: userPrefs.lastLocation.lat, lng: userPrefs.lastLocation.lng } : null
  );
  const [locationName, setLocationName] = useState(userPrefs.lastLocation?.label || 'Locating...');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(userPrefs.lastRadius || 25);
  const [rows, setRows] = useState<RowData[]>(() =>
    ROW_CONFIGS.map((c) => ({ ...c, places: [], loading: true }))
  );
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const abortRefs = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    if (userLocation) return;
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`);
          const d = await r.json();
          const name = d.address?.city || d.address?.town || d.address?.suburb || 'Your area';
          setLocationName(name);
          if (!isGuest) {
            const newPrefs = updateLocation(
              { lat: loc.lat, lng: loc.lng, label: name },
              isGuest,
              userPrefs
            );
            onUpdateState('userPreferences', newPrefs);
          }
        } catch {
          setLocationName('Your area');
        }
      },
      () => {
        setLocationError('Location access denied');
        const fallback = { lat: -33.9249, lng: 18.4241 };
        setUserLocation(fallback);
        setLocationName('Cape Town');
        if (!isGuest) {
          const newPrefs = updateLocation(
            { lat: fallback.lat, lng: fallback.lng, label: 'Cape Town' },
            isGuest,
            userPrefs
          );
          onUpdateState('userPreferences', newPrefs);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    ROW_CONFIGS.forEach((config) => {
      if (abortRefs.current[config.id]) {
        (abortRefs.current[config.id] as AbortController).abort();
      }
      const controller = new AbortController();
      abortRefs.current[config.id] = controller;

      setRows((prev) =>
        prev.map((r) => (r.id === config.id ? { ...r, loading: true, error: undefined } : r))
      );

      searchExploreIntent(
        config.id,
        userLocation.lat,
        userLocation.lng,
        radiusKm,
        { signal: controller.signal }
      )
        .then((result) => {
          if (controller.signal.aborted) return;
          setRows((prev) =>
            prev.map((r) =>
              r.id === config.id ? { ...r, places: result.places.slice(0, 20), loading: false } : r
            )
          );
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.error(`Row ${config.id} fetch failed:`, err);
          setRows((prev) =>
            prev.map((r) =>
              r.id === config.id ? { ...r, loading: false, error: 'Failed to load' } : r
            )
          );
        });
    });

    return () => {
      Object.values(abortRefs.current).forEach((c) => (c as AbortController).abort());
    };
  }, [userLocation, radiusKm]);

  const heroPlace = useMemo(() => {
    const allPlaces = rows.flatMap((r) => r.places);
    const topRated = allPlaces.filter((p) => (p.rating || 0) >= 4.0 && p.imageUrl);
    if (topRated.length === 0) return allPlaces.find((p) => p.imageUrl) || null;
    return topRated[Math.floor(Date.now() / 60000) % topRated.length];
  }, [rows]);

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    const name = state.user?.displayName?.split(' ')[0] || '';
    if (hour < 12) return `Good morning${name ? `, ${name}` : ''}`;
    if (hour < 17) return `Good afternoon${name ? `, ${name}` : ''}`;
    return `Good evening${name ? `, ${name}` : ''}`;
  }, [state.user?.displayName]);

  const contextMessage = useMemo(() => {
    const day = new Date().getDay();
    const hour = new Date().getHours();
    if (day === 0 || day === 6) return "It's the weekend — time for an adventure!";
    if (hour >= 17) return 'Looking for an evening outing?';
    if (state.children?.length > 0) return `Spots perfect for your family of ${2 + state.children.length}`;
    return 'Discover something new today';
  }, [state.children?.length]);

  const toggleFavorite = useCallback(
    async (place: Place) => {
      const uid = state.user?.uid || auth?.currentUser?.uid;
      if (!uid && !isGuest) return;
      const isSaved = state.favorites.includes(place.id);
      if (isSaved) {
        onUpdateState('favorites', state.favorites.filter((f) => f !== place.id));
        if (uid) {
          deleteSavedPlace(uid, place.id).catch(console.warn);
        }
      } else {
        if (!isGuest && uid) {
          const check = canSavePlace(state.entitlement, state.savedPlaces?.length || 0);
          if (!check.allowed) {
            return;
          }
        }
        onUpdateState('favorites', [...state.favorites, place.id]);
        if (uid) {
          const saved: SavedPlace = {
            placeId: place.id,
            name: place.name,
            address: place.address,
            imageUrl: place.imageUrl,
            rating: place.rating,
            mapsUrl: place.mapsUrl,
            savedAt: Timestamp.now(),
          };
          upsertSavedPlace(uid, saved).catch(console.warn);
        }
      }
    },
    [state.favorites, state.savedPlaces, state.entitlement, state.user?.uid, isGuest, onUpdateState]
  );

  const handleLocationChange = async (input: string) => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=1`);
      const results = await r.json();
      if (results.length > 0) {
        const loc = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
        setUserLocation(loc);
        const locName = results[0].display_name.split(',')[0];
        setLocationName(locName);
        if (!isGuest) {
          const newPrefs = updateLocation(
            { lat: loc.lat, lng: loc.lng, label: locName },
            isGuest,
            userPrefs
          );
          onUpdateState('userPreferences', newPrefs);
        }
      }
    } catch {
      setLocationError('Could not find that location');
    }
  };

  const refreshGpsLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`);
          const d = await r.json();
          const name = d.address?.city || d.address?.town || d.address?.suburb || 'Your area';
          setLocationName(name);
        } catch {
          setLocationName('Your area');
        }
      },
      () => setLocationError('Could not get location'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (selectedPlace) {
    return (
      <VenueProfile
        place={selectedPlace}
        isFavorite={state.favorites.includes(selectedPlace.id)}
        isVisited={(state.visitedPlaces || []).some((v) => v.placeId === selectedPlace.id)}
        memories={state.memories?.filter((m) => m.placeId === selectedPlace.id)}
        childrenAges={state.children?.map((c) => c.age).filter((a): a is number => a !== undefined)}
        isGuest={isGuest}
        entitlement={state.entitlement}
        userId={state.user?.uid}
        userName={state.user?.displayName || state.user?.email || ''}
        onClose={() => setSelectedPlace(null)}
        onToggleFavorite={() => toggleFavorite(selectedPlace)}
        onMarkVisited={() => {}}
        onUpdateDetails={() => {}}
      />
    );
  }

  const isLoading = rows.every((r) => r.loading);
  const filledRows = rows.filter((r) => r.places.length > 0 || r.loading);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <Header
        setView={setView}
        user={state.user}
        locationName={locationName}
        onLocationChange={handleLocationChange}
      />

      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { key: 'explore' as const, label: 'Explore' },
            { key: 'favorites' as const, label: 'Saved', count: state.favorites.length },
            { key: 'adventures' as const, label: 'Adventures', count: (state.visitedPlaces || []).length },
            { key: 'memories' as const, label: 'Memories', count: state.memories.length },
            { key: 'partner' as const, label: 'Partner' },
            { key: 'circles' as const, label: 'Circles', count: 0 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 min-h-[44px] ${
                activeTab === tab.key
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-200'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              {tab.label}{'count' in tab && tab.count ? ` (${tab.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'explore' && (
        <div className="px-4">
          <div className="mb-4 mt-1">
            <h2 className="text-xl font-extrabold text-slate-800">{greetingText} 👋</h2>
            <p className="text-sm text-slate-500 mt-0.5">{contextMessage}</p>
          </div>

          <div className="bg-white rounded-2xl p-3 mb-4 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Radius</span>
              <span className="text-sm font-bold text-sky-500">{radiusKm} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              value={radiusKm}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setRadiusKm(val);
                if (!isGuest) {
                  const newPrefs = updateRadius(val, isGuest, userPrefs);
                  onUpdateState('userPreferences', newPrefs);
                }
              }}
              className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-300">1 km</span>
              <button
                onClick={refreshGpsLocation}
                className="text-[11px] font-semibold text-sky-500 active:text-sky-700"
              >
                📍 Update location
              </button>
              <span className="text-[10px] text-slate-300">200 km</span>
            </div>
          </div>

          {heroPlace && !isLoading && (
            <div className="mb-5">
              <HeroCard
                place={heroPlace}
                isFavorite={state.favorites.includes(heroPlace.id)}
                onToggleFavorite={() => toggleFavorite(heroPlace)}
                onClick={() => setSelectedPlace(heroPlace)}
              />
            </div>
          )}
          {isLoading && (
            <div className="mb-5 w-full h-[200px] bg-slate-100 rounded-2xl animate-pulse" />
          )}

          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : (
            filledRows.map((row) => (
              <div key={row.id} className="mb-6">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{row.icon}</span>
                    <h3 className="text-base font-extrabold text-slate-800">{row.label}</h3>
                    <span className="text-[11px] text-slate-400 font-medium">{row.places.length}</span>
                  </div>
                </div>
                {row.loading ? (
                  <div className="flex gap-3 overflow-hidden">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : row.error ? (
                  <div className="py-6 text-center text-sm text-slate-400">{row.error}</div>
                ) : row.places.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-400">No spots found nearby</div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-1 -mx-4 px-4 snap-x snap-mandatory">
                    {row.places.map((place) => (
                      <div key={place.id} className="snap-start">
                        <NetflixPlaceCard
                          place={place}
                          isFavorite={state.favorites.includes(place.id)}
                          onToggleFavorite={() => toggleFavorite(place)}
                          onClick={() => setSelectedPlace(place)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}

          {!isLoading && filledRows.length === 0 && (
            <div className="py-16 text-center">
              <span className="text-4xl block mb-3">🗺️</span>
              <p className="font-bold text-slate-600">No places found</p>
              <p className="text-sm text-slate-400 mt-1">Try expanding your search radius</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="px-4 mt-2">
          <h2 className="text-lg font-extrabold text-slate-800 mb-3">Saved Places</h2>
          {state.savedPlaces && state.savedPlaces.length > 0 ? (
            <div className="space-y-3">
              {state.savedPlaces.map((saved) => {
                const place: Place = {
                  id: saved.placeId,
                  name: saved.name || 'Saved place',
                  description: saved.address || '',
                  address: saved.address || '',
                  rating: saved.rating,
                  tags: [],
                  imageUrl: saved.imageUrl,
                  mapsUrl: saved.mapsUrl || '',
                  type: 'all',
                };
                return (
                  <PlaceCard
                    key={saved.placeId}
                    place={place}
                    variant="list"
                    isFavorite={true}
                    onToggleFavorite={() => toggleFavorite(place)}
                    onClick={() => setSelectedPlace(place)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center">
              <span className="text-4xl block mb-3">💙</span>
              <p className="font-bold text-slate-600">No saved places yet</p>
              <p className="text-sm text-slate-400 mt-1">Tap the heart on any place to save it</p>
            </div>
          )}
        </div>
      )}

      {activeTab !== 'explore' && activeTab !== 'favorites' && (
        <div className="px-4 mt-2">
          <div className="py-16 text-center">
            <span className="text-4xl block mb-3">
              {activeTab === 'adventures' ? '🧭' : activeTab === 'memories' ? '📸' : activeTab === 'partner' ? '💑' : '👥'}
            </span>
            <p className="font-bold text-slate-600 capitalize">{activeTab}</p>
            <p className="text-sm text-slate-400 mt-1">Switch to the classic dashboard for full {activeTab} features</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardNetflix;
