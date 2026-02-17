import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, Place, ExploreIntent, SavedPlace } from '../types';
import { formatPriceLevel } from '../src/utils/priceLevel';
import Header from './Header';
import PlaceCard from './PlaceCard';
import VenueProfile from './VenueProfile';
import { searchExploreIntent } from '../placesService';
import { canSavePlace } from '../lib/entitlements';
import { updateLocation, updateRadius } from '../lib/profileSync';
import { auth } from '../lib/firebase';
import { upsertSavedPlace, deleteSavedPlace } from '../lib/userData';
import { Timestamp } from 'firebase/firestore';
import type { AppAccessContext } from '../lib/access';

interface DashboardNetflixProps {
  state: AppState;
  isGuest: boolean;
  accessContext?: AppAccessContext;
  onSignOut: () => void;
  setView: (view: string) => void;
  onUpdateState: (key: keyof AppState, value: any) => void;
  initialCircleId?: string | null;
  onClearInitialCircle?: () => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
  discoveryMode?: boolean;
  onToggleDiscoveryMode?: () => void;
}

interface RowData {
  id: ExploreIntent;
  label: string;
  icon: React.ReactNode;
  places: Place[];
  loading: boolean;
  error?: string;
}

const RowIcon: React.FC<{ type: string }> = ({ type }) => {
  const cls = "w-5 h-5";
  switch (type) {
    case 'play_kids':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>;
    case 'eat_drink':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 010 8h-1" /><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>;
    case 'outdoors':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-4a2 2 0 00-2-2H5" /><path d="M21 12l-9-9-9 9" /><path d="M12 3C8 3 4 5 2 8" /><circle cx="12" cy="12" r="3" /><path d="M12 22c4 0 8-2 10-5" /></svg>;
    case 'things_to_do':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
    case 'sport_active':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2l-6 6-6-6" /><path d="M6 22l6-6 6 6" /><circle cx="12" cy="12" r="4" /></svg>;
    case 'indoor':
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
    default:
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>;
  }
};

const ROW_CONFIGS: { id: ExploreIntent; label: string; icon: React.ReactNode }[] = [
  { id: 'play_kids', label: 'Play & Kids', icon: <RowIcon type="play_kids" /> },
  { id: 'eat_drink', label: 'Eat & Drink', icon: <RowIcon type="eat_drink" /> },
  { id: 'outdoors', label: 'Outdoors', icon: <RowIcon type="outdoors" /> },
  { id: 'things_to_do', label: 'Things to Do', icon: <RowIcon type="things_to_do" /> },
  { id: 'sport_active', label: 'Sport & Active', icon: <RowIcon type="sport_active" /> },
  { id: 'indoor', label: 'Indoor', icon: <RowIcon type="indoor" /> },
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
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ color: isFavorite ? '#0ea5e9' : '#94a3b8' }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
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
        <span className="text-amber-500 text-[11px] font-bold flex items-center gap-0.5"><svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> {place.rating ?? '—'}</span>
        {place.priceLevel && <span className="text-slate-300 text-[11px]">{formatPriceLevel(place.priceLevel)}</span>}
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
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={{ color: isFavorite ? '#0ea5e9' : '#ffffff' }}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
    </button>
    <div className="absolute bottom-0 left-0 right-0 p-4">
      <div className="flex gap-2 mb-1">
        {place.tags?.slice(0, 2).map((t) => (
          <span key={t} className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider rounded-full">{t}</span>
        ))}
      </div>
      <h3 className="text-lg font-extrabold text-white leading-tight">{place.name}</h3>
      <div className="flex items-center gap-3 mt-1 text-[11px] text-white/80 font-medium">
        <span className="text-amber-300 font-bold flex items-center gap-0.5"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg> {place.rating ?? '—'}</span>
        {place.distance && <><span>·</span><span>{place.distance}</span></>}
      </div>
    </div>
  </div>
);

const DashboardNetflix: React.FC<DashboardNetflixProps> = ({ state, isGuest, accessContext, onSignOut, setView, onUpdateState, initialCircleId, onClearInitialCircle, initialTab, onTabChange, discoveryMode, onToggleDiscoveryMode }) => {
  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  const canSyncCloud = accessContext?.canSyncCloud ?? !isGuest;
  const effectiveGuestForPersistence = !canSyncCloud;
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
          if (canSyncCloud) {
            const newPrefs = updateLocation(
              { lat: loc.lat, lng: loc.lng, label: name },
              effectiveGuestForPersistence,
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
        if (canSyncCloud) {
          const newPrefs = updateLocation(
            { lat: fallback.lat, lng: fallback.lng, label: 'Cape Town' },
            effectiveGuestForPersistence,
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
      if (!uid && canSyncCloud) return;
      const isSaved = state.favorites.includes(place.id);
      if (isSaved) {
        onUpdateState('favorites', state.favorites.filter((f) => f !== place.id));
        if (uid) {
          deleteSavedPlace(uid, place.id).catch(console.warn);
        }
      } else {
        if (canSyncCloud && uid) {
          const check = canSavePlace(accessContext?.entitlement ?? state.entitlement, state.savedPlaces?.length || 0);
          if (!check.allowed) {
            return;
          }
        }
        onUpdateState('favorites', [...state.favorites, place.id]);
        if (uid && canSyncCloud) {
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
    [state.favorites, state.savedPlaces, state.entitlement, state.user?.uid, canSyncCloud, onUpdateState]
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
        if (canSyncCloud) {
          const newPrefs = updateLocation(
            { lat: loc.lat, lng: loc.lng, label: locName },
            effectiveGuestForPersistence,
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
        entitlement={accessContext?.entitlement ?? state.entitlement}
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

      <div className="px-5 pt-3 pb-2">
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
        <div className="px-5">
          <div className="mb-4 mt-1">
            <h2 className="text-xl font-extrabold text-slate-800">{greetingText}</h2>
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
                if (canSyncCloud) {
                  const newPrefs = updateRadius(val, effectiveGuestForPersistence, userPrefs);
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
                <svg className="w-3.5 h-3.5 inline -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg> Update location
              </button>
              <span className="text-[10px] text-slate-300">200 km</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-sky-50 to-purple-50 rounded-2xl p-3 mb-4 border border-sky-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
                <div>
                  <span className="font-bold text-slate-700 text-sm">Discovery Mode</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Browse by category</p>
                </div>
              </div>
              <button
                onClick={() => onToggleDiscoveryMode?.()}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  discoveryMode ? 'bg-sky-500' : 'bg-slate-300'
                }`}
                aria-label="Toggle Discovery Mode"
              >
                <span data-toggle-knob className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  discoveryMode ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
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
                    <span className="text-slate-500">{row.icon}</span>
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
                  <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-1 -mx-5 px-5 snap-x snap-mandatory">
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
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
              <p className="font-bold text-slate-600">No places found</p>
              <p className="text-sm text-slate-400 mt-1">Try expanding your search radius</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="px-5 mt-2">
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
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
              <p className="font-bold text-slate-600">No saved places yet</p>
              <p className="text-sm text-slate-400 mt-1">Tap the heart on any place to save it</p>
            </div>
          )}
        </div>
      )}

      {activeTab !== 'explore' && activeTab !== 'favorites' && (
        <div className="px-5 mt-2">
          <div className="py-16 text-center">
            <div className="flex justify-center mb-3">
              {activeTab === 'adventures' ? (
                <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>
              ) : activeTab === 'memories' ? (
                <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
              ) : activeTab === 'partner' ? (
                <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
              ) : (
                <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
              )}
            </div>
            <p className="font-bold text-slate-600 capitalize">{activeTab}</p>
            <p className="text-sm text-slate-400 mt-1">Switch to the classic dashboard for full {activeTab} features</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardNetflix;
