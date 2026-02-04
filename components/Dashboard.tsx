import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Place, Memory, UserReview, ActivityType, GroupPlace, VisitedPlace, PLAN_LIMITS, UserPreferences, SavedLocation } from '../types';
import Header from './Header';
import PlaceCard from './PlaceCard';
import Filters from './Filters';
import VenueProfile from './VenueProfile';
import GroupsList from './GroupsList';
import GroupDetail from './GroupDetail';
import PlanBilling from './PlanBilling';
import { UpgradePrompt, LimitIndicator } from './UpgradePrompt';
import { searchNearbyPlaces, textSearchPlaces } from '../placesService';
import { getLimits, canSavePlace, isPaidTier } from '../lib/entitlements';
import { updateLocation, updateRadius, updateCategory, updateActiveCircle } from '../lib/profileSync';
import { ShareMemoryModal } from './ShareMemory';
import HomeFab from './HomeFab';
import { db, doc, getDoc, collection, onSnapshot, setDoc } from '../lib/firebase';
import MemoryCreate from './MemoryCreate';
import {
  CircleDoc,
  createCircle,
  joinCircleByCode,
  listenToUserCircles,
  addCircleMemory,
  saveCirclePlace,
} from '../lib/circles';

interface DashboardProps {
  state: AppState;
  isGuest: boolean;
  onSignOut: () => void;
  setView: (view: string) => void;
  onUpdateState: (key: keyof AppState, value: any) => void;
}

interface PartnerNote {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

type TabButtonProps = { label: string; count?: number; active: boolean; onClick: () => void };
const TabButton: React.FC<TabButtonProps> = ({ label, count, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
      active ? 'bg-sky-500 text-white shadow-lg shadow-sky-100' : 'bg-white text-slate-400 border border-slate-100'
    }`}
  >
    {label}{count !== undefined && count > 0 ? ` [${count}]` : ''}
  </button>
);

type NavButtonProps = { icon: string; label: string; active: boolean; onClick: () => void };
const NavButton: React.FC<NavButtonProps> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 ${active ? 'text-sky-500' : 'text-slate-300'}`}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const Dashboard: React.FC<DashboardProps> = ({ state, isGuest, onSignOut, setView, onUpdateState }) => {
  const userPrefs = state.userPreferences || {};
  const [activeTab, setActiveTab] = useState<'explore' | 'favorites' | 'adventures' | 'memories' | 'circles' | 'partner'>('explore');
  const hasLinkedPartner = state.partnerLink?.status === 'accepted';
  const partnerName = state.partnerLink?.partnerName?.trim();
  const partnerEmail = state.partnerLink?.partnerEmail;
  const partnerPhotoURL = state.partnerLink?.partnerPhotoURL;
  const partnerUserId = state.partnerLink?.partnerUserId;
  const partnerIdLabel = partnerUserId
    ? `Partner linked · ${partnerUserId.slice(0, 6)}…${partnerUserId.slice(-4)}`
    : 'Partner linked';
  const partnerLabel = partnerName || partnerIdLabel;
  const partnerInitial = partnerName ? partnerName[0].toUpperCase() : 'P';
  const [partnerNotes, setPartnerNotes] = useState<PartnerNote[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSending, setNoteSending] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ActivityType>(userPrefs.lastCategory || 'all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  // Location state - hydrate from saved preferences
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    userPrefs.lastLocation ? { lat: userPrefs.lastLocation.lat, lng: userPrefs.lastLocation.lng } : null
  );
  const [locationName, setLocationName] = useState(userPrefs.lastLocation?.label || 'Locating...');
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Radius slider state (in km) - hydrate from saved preferences
  const [radiusKm, setRadiusKm] = useState(userPrefs.lastRadius || 10);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Preference update callbacks - persist to database with debouncing
  const persistLocation = useCallback((lat: number, lng: number, label: string) => {
    const newPrefs = updateLocation({ lat, lng, label }, isGuest, userPrefs);
    onUpdateState('userPreferences', newPrefs);
  }, [isGuest, userPrefs, onUpdateState]);
  
  const persistRadius = useCallback((radius: number) => {
    const newPrefs = updateRadius(radius, isGuest, userPrefs);
    onUpdateState('userPreferences', newPrefs);
  }, [isGuest, userPrefs, onUpdateState]);
  
  const persistCategory = useCallback((category: ActivityType) => {
    const newPrefs = updateCategory(category, isGuest, userPrefs);
    onUpdateState('userPreferences', newPrefs);
  }, [isGuest, userPrefs, onUpdateState]);
  
  // Circles state
  const [circles, setCircles] = useState<CircleDoc[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<CircleDoc | null>(null);
  const [addToCirclePlace, setAddToCirclePlace] = useState<Place | null>(null);
  
  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<'savedPlaces' | 'memories' | null>(null);
  
  // Share memory state
  const [shareMemory, setShareMemory] = useState<Memory | null>(null);
  
  // Plan & Billing modal
  const [showPlanBilling, setShowPlanBilling] = useState(false);
  
  // Entitlement limits
  const limits = getLimits(state.entitlement);
  const isPaid = isPaidTier(state.entitlement);

  // Get user's location on mount (only if not already saved)
  useEffect(() => {
    // If we have saved preferences, don't re-fetch geolocation
    if (userPrefs.lastLocation) {
      return;
    }
    
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setLocationName('Unknown Location');
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
          // Persist the detected location
          persistLocation(latitude, longitude, city);
        } catch (err) {
          setLocationName('Your Area');
          persistLocation(latitude, longitude, 'Your Area');
        }
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError('Unable to get location');
        setLocationName('Unknown Location');
        setUserLocation({ lat: 37.7749, lng: -122.4194 });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [userPrefs.lastLocation, persistLocation]);

  useEffect(() => {
    if (!db) return;
    const link = state.partnerLink;
    if (!link?.partnerUserId) return;
    if (link.partnerName && link.partnerPhotoURL && link.partnerEmail) return;

    let cancelled = false;
    const loadPartnerProfile = async () => {
      try {
        const partnerDoc = await getDoc(doc(db, 'users', link.partnerUserId));
        if (!partnerDoc.exists()) return;
        const data = partnerDoc.data() || {};
        const profile = data.profile || {};
        const nextName = link.partnerName || profile.displayName || profile.email;
        const nextEmail = link.partnerEmail || profile.email;
        const nextPhoto = link.partnerPhotoURL || profile.photoURL;
        if (!nextName && !nextEmail && !nextPhoto) return;
        if (!cancelled) {
          onUpdateState('partnerLink', {
            ...link,
            partnerName: nextName,
            partnerEmail: nextEmail,
            partnerPhotoURL: nextPhoto,
          });
        }
      } catch (err) {
        console.warn('Partner profile lookup failed.', err);
      }
    };

    loadPartnerProfile();
    return () => {
      cancelled = true;
    };
  }, [state.partnerLink, onUpdateState]);

  useEffect(() => {
    if (isGuest || !state.user?.uid) {
      setCircles([]);
      return;
    }
    return listenToUserCircles(state.user.uid, (next) => {
      setCircles(next);
    });
  }, [isGuest, state.user?.uid]);

  useEffect(() => {
    if (!db) return;
    if (!state.user?.uid) return;
    const uid = state.user.uid;
    const link = state.partnerLink;
    const threadId = link?.partnerUserId
      ? [uid, link.partnerUserId].sort().join('_')
      : null;
    const notesRef = threadId
      ? collection(db, 'partnerThreads', threadId, 'notes')
      : collection(db, 'users', uid, 'partnerNotes');

    const unsub = onSnapshot(notesRef, (snap) => {
      const nextNotes = snap.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<PartnerNote, 'id'>;
        return { id: docSnap.id, ...data };
      });
      nextNotes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      setPartnerNotes(nextNotes);
    }, (err) => {
      console.warn('Partner notes listener error.', err);
      setNoteError('Unable to load notes right now.');
    });

    return () => unsub();
  }, [state.user?.uid, state.partnerLink]);

  const handleSendPartnerNote = async () => {
    if (!noteInput.trim()) {
      setNoteError('Please enter a note before sending.');
      return;
    }
    if (!db || !state.user?.uid) {
      setNoteError('Please sign in to send notes.');
      return;
    }

    setNoteError(null);
    setNoteSending(true);
    const uid = state.user.uid;
    const link = state.partnerLink;
    const threadId = link?.partnerUserId
      ? [uid, link.partnerUserId].sort().join('_')
      : null;
    const notesRef = threadId
      ? collection(db, 'partnerThreads', threadId, 'notes')
      : collection(db, 'users', uid, 'partnerNotes');

    const createdByName = state.user.displayName || state.user.email || 'You';
    const noteId = `${Date.now()}`;
    const notePayload = {
      text: noteInput.trim(),
      createdAt: new Date().toISOString(),
      createdBy: uid,
      createdByName,
    };

    try {
      await setDoc(doc(notesRef, noteId), notePayload);
      setNoteInput('');
    } catch (err) {
      console.warn('Failed to send partner note.', err);
      setNoteError('Failed to send note. Please try again.');
    } finally {
      setNoteSending(false);
    }
  };

  const handleShareMemoryExternal = async (memory: Memory) => {
    const shareText = `${memory.caption}${memory.placeName ? `\n@${memory.placeName}` : ''}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'FamPals Memory',
          text: shareText,
        });
        setShareStatus('Shared!');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setShareStatus('Copied to clipboard.');
      } else {
        window.prompt('Copy this memory text:', shareText);
      }
    } catch (err) {
      console.warn('Memory share failed.', err);
      setShareStatus('Unable to share right now.');
    } finally {
      setTimeout(() => setShareStatus(null), 2000);
    }
  };

  // Fetch places when location, filter, radius, or search changes - uses Google Places API (fast, no AI cost)
  useEffect(() => {
    const fetchPlaces = async () => {
      if (!userLocation) return;
      
      setLoading(true);
      try {
        let results: Place[];
        if (searchQuery.trim()) {
          // Use text search for queries
          results = await textSearchPlaces(searchQuery, userLocation.lat, userLocation.lng, radiusKm);
        } else {
          // Use nearby search for browsing - fast and cheap
          results = await searchNearbyPlaces(userLocation.lat, userLocation.lng, selectedFilter, radiusKm);
        }
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
  }, [selectedFilter, activeTab, userLocation, radiusKm, searchQuery]);
  
  // Handle search from header
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveTab('explore');
  };
  
  // Handle location change from postcode input
  const handleLocationChange = async (postcode: string): Promise<void> => {
    setLocationName('Searching...');
    setLocationError(null);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(postcode)}&format=json&limit=1&countrycodes=za`,
        {
          headers: {
            'User-Agent': 'FamPals/1.0 (Family Adventure App)'
          }
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lon);
        const shortName = display_name.split(',')[0];
        setUserLocation({ lat: parsedLat, lng: parsedLng });
        setLocationName(shortName);
        // Persist the new location
        persistLocation(parsedLat, parsedLng, shortName);
      } else {
        setLocationError('Location not found. Try a different address.');
        setLocationName('Unknown');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setLocationError('Failed to find location. Please try again.');
      setLocationName('Your Area');
    }
  };
  
  // Handler for radius slider that also persists
  const handleRadiusSliderChange = (newRadius: number) => {
    setRadiusKm(newRadius);
    persistRadius(newRadius);
  };
  
  // Handler for category filter that also persists
  const handleFilterChange = (category: ActivityType) => {
    setSelectedFilter(category);
    persistCategory(category);
  };

  const toggleFavorite = (placeId: string) => {
    const isRemoving = state.favorites.includes(placeId);
    
    if (!isRemoving) {
      const saveCheck = canSavePlace(state.entitlement, state.favorites.length);
      if (!saveCheck.allowed) {
        setShowUpgradePrompt('savedPlaces');
        return;
      }
    }
    
    const newFavorites = isRemoving
      ? state.favorites.filter(id => id !== placeId)
      : [...state.favorites, placeId];
    onUpdateState('favorites', newFavorites);
  };

  const markVisited = (place: Place) => {
    const visitedPlaces = state.visitedPlaces || [];
    const isAlreadyVisited = visitedPlaces.some(v => v.placeId === place.id);
    
    if (isAlreadyVisited) {
      const updated = visitedPlaces.filter(v => v.placeId !== place.id);
      onUpdateState('visitedPlaces', updated);
    } else {
      const newVisit: VisitedPlace = {
        placeId: place.id,
        placeName: place.name,
        placeType: place.type,
        imageUrl: place.imageUrl,
        visitedAt: new Date().toISOString(),
        notes: '',
        isFavorite: state.favorites.includes(place.id),
      };
      onUpdateState('visitedPlaces', [...visitedPlaces, newVisit]);
    }
  };

  const handleAddMemory = useCallback((memory: Omit<Memory, 'id'>) => {
    const newMemory: Memory = { ...memory, id: Date.now().toString() };
    onUpdateState('memories', [...state.memories, newMemory]);

    if (memory.placeId) {
      const visitedPlaces = state.visitedPlaces || [];
      const alreadyVisited = visitedPlaces.some(v => v.placeId === memory.placeId);
      if (!alreadyVisited) {
        const selectedVenue = places.find(p => p.id === memory.placeId);
        const newVisit: VisitedPlace = {
          placeId: memory.placeId,
          placeName: memory.placeName,
          placeType: selectedVenue?.type || 'all',
          imageUrl: selectedVenue?.imageUrl,
          visitedAt: new Date().toISOString(),
          notes: '',
          isFavorite: state.favorites.includes(memory.placeId),
        };
        onUpdateState('visitedPlaces', [...visitedPlaces, newVisit]);
      }
    }
  }, [onUpdateState, places, state.favorites, state.memories, state.visitedPlaces]);

  const favoritePlaces = places.filter(p => state.favorites.includes(p.id));

  const handleIncrementAiRequests = () => {
    const current = state.entitlement?.ai_requests_this_month || 0;
    onUpdateState('entitlement', {
      ...state.entitlement,
      ai_requests_this_month: current + 1
    });
  };

  const handleCreateCircle = async (name: string) => {
    if (!state.user) return;
    try {
      await createCircle(name, state.user);
    } catch (err) {
      console.warn('Failed to create circle.', err);
    }
  };

  const handleJoinCircle = async (code: string) => {
    if (!state.user) return;
    try {
      await joinCircleByCode(code, state.user);
    } catch (err) {
      console.warn('Failed to join circle.', err);
    }
  };

  const handleTagMemoryToCircle = async (circleId: string, memory: Omit<Memory, 'id'>) => {
    if (!state.user) return;
    try {
      await addCircleMemory(circleId, {
        id: `${Date.now()}`,
        memoryId: `${Date.now()}`,
        createdAt: new Date().toISOString(),
        createdByUid: state.user.uid,
        createdByName: state.user.displayName || state.user.email || 'Member',
        memorySnapshot: {
          caption: memory.caption,
          placeId: memory.placeId,
          placeName: memory.placeName,
          photoUrl: memory.photoUrl,
          photoUrls: memory.photoUrls,
          photoThumbUrl: memory.photoThumbUrl,
          photoThumbUrls: memory.photoThumbUrls,
          date: memory.date,
        },
      });
    } catch (err) {
      console.warn('Failed to tag memory to circle.', err);
    }
  };

  if (selectedCircle) {
    return (
      <>
        <GroupDetail
          circle={selectedCircle}
          userId={state.user?.uid || ''}
          userName={state.user?.displayName || state.user?.email || 'Member'}
          userEmail={state.user?.email}
          userFavorites={state.favorites}
          allPlaces={[...places, ...favoritePlaces]}
          onClose={() => setSelectedCircle(null)}
          onOpenPlace={(place) => setSelectedPlace(place)}
        />
        <HomeFab visible={true} onClick={() => { setSelectedCircle(null); setActiveTab('explore'); }} />
      </>
    );
  }

  if (selectedPlace) {
    return (
      <>
        <VenueProfile 
          place={selectedPlace} 
          isFavorite={state.favorites.includes(selectedPlace.id)}
          isVisited={(state.visitedPlaces || []).some(v => v.placeId === selectedPlace.id)}
          memories={state.memories}
          memoryCount={state.memories.length}
          onToggleFavorite={() => toggleFavorite(selectedPlace.id)}
          onMarkVisited={() => markVisited(selectedPlace)}
          onClose={() => setSelectedPlace(null)}
          onUpdateDetails={(data) => {
            const newDetails = { ...state.favoriteDetails, [selectedPlace.id]: { ...state.favoriteDetails[selectedPlace.id], ...data, placeId: selectedPlace.id } };
            onUpdateState('favoriteDetails', newDetails);
          }}
          favoriteData={state.favoriteDetails[selectedPlace.id]}
          childrenAges={state.children?.map(c => c.age) || []}
          isGuest={isGuest}
          entitlement={state.entitlement}
          onIncrementAiRequests={handleIncrementAiRequests}
          circles={circles}
          partnerLink={state.partnerLink}
          userName={state.user?.displayName || 'You'}
          userId={state.user?.uid || ''}
          onTagMemoryToCircle={handleTagMemoryToCircle}
          onAddToCircle={(circleId, groupPlace) => {
            if (circleId === 'partner') {
              const currentPartnerPlaces = state.partnerSharedPlaces || [];
              if (currentPartnerPlaces.some(p => p.placeId === groupPlace.placeId)) {
                alert('This place is already in Partner Plans!');
                return;
              }
              onUpdateState('partnerSharedPlaces', [...currentPartnerPlaces, groupPlace]);
              alert(`Added "${groupPlace.placeName}" to Partner Plans!`);
            } else {
              const note = window.prompt('Why are we saving this?') || '';
              saveCirclePlace(circleId, {
                placeId: groupPlace.placeId,
                savedByUid: state.user?.uid || 'guest',
                savedByName: state.user?.displayName || state.user?.email || 'Member',
                savedAt: new Date().toISOString(),
                note: note.trim(),
                placeSummary: {
                  placeId: groupPlace.placeId,
                  name: groupPlace.placeName,
                  imageUrl: groupPlace.imageUrl,
                  type: groupPlace.placeType,
                },
              }).catch(err => console.warn('Failed to save circle place.', err));
            }
          }}
          onAddMemory={handleAddMemory}
        />
        <HomeFab visible={true} onClick={() => { setSelectedPlace(null); setActiveTab('explore'); }} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 container-safe">
      <Header 
        setView={setView} 
        user={state.user} 
        locationName={locationName} 
        onSearch={handleSearch}
        onLocationChange={handleLocationChange}
      />
      
      <div className="px-5 py-4">
        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
          <TabButton label="Explore" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <TabButton label="Saved" count={state.favorites.length} active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} />
          <TabButton label="Adventures" count={(state.visitedPlaces || []).length} active={activeTab === 'adventures'} onClick={() => setActiveTab('adventures')} />
          <TabButton label="Memories" count={state.memories.length} active={activeTab === 'memories'} onClick={() => setActiveTab('memories')} />
          {hasLinkedPartner && (
            <TabButton label="Partner" active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} />
          )}
          <TabButton label="Circles" count={circles.length} active={activeTab === 'circles'} onClick={() => setActiveTab('circles')} />
        </div>

        {activeTab === 'explore' && (
          <>
            <Filters selected={selectedFilter} onChange={handleFilterChange} />
            
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
                onChange={(e) => handleRadiusSliderChange(parseInt(e.target.value))}
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
                  showAddToGroup={!isGuest && circles.length > 0}
                  onAddToGroup={() => setAddToCirclePlace(place)}
                />
              ))
            ) : (
              <div className="py-24 text-center text-slate-300 font-black text-xs uppercase tracking-widest bg-white rounded-[40px] border border-slate-50">
                No saved spots yet.
              </div>
            )}
          </div>
        )}

        {addToCirclePlace && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setAddToCirclePlace(null)}>
            <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg text-slate-800">Add to Circle</h3>
              <p className="text-sm text-slate-500">Select a circle to add "{addToCirclePlace.name}":</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {circles.map(circle => {
                  return (
                    <button
                      key={circle.id}
                      onClick={() => {
                        const note = window.prompt('Why are we saving this?') || '';
                        saveCirclePlace(circle.id, {
                          placeId: addToCirclePlace.id,
                          savedByUid: state.user?.uid || 'guest',
                          savedByName: state.user?.displayName || state.user?.email || 'Member',
                          savedAt: new Date().toISOString(),
                          note: note.trim(),
                          placeSummary: {
                            placeId: addToCirclePlace.id,
                            name: addToCirclePlace.name,
                            imageUrl: addToCirclePlace.imageUrl,
                            type: addToCirclePlace.type,
                            mapsUrl: addToCirclePlace.mapsUrl,
                          },
                        }).catch(err => console.warn('Failed to save circle place.', err));
                        setAddToCirclePlace(null);
                      }}
                      className={`w-full p-4 rounded-xl text-left transition-colors ${
                        'bg-purple-50 hover:bg-purple-100 text-slate-700'
                      }`}
                    >
                      <span className="font-semibold">{circle.name}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setAddToCirclePlace(null)}
                className="w-full py-3 text-slate-500 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {activeTab === 'adventures' && (
          <div className="space-y-4 mt-4">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-6 text-white shadow-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-80 font-bold">Adventures Completed</p>
                  <p className="text-4xl font-black mt-1">{(state.visitedPlaces || []).length}</p>
                </div>
                <div className="text-5xl">🏆</div>
              </div>
            </div>

            {isGuest ? (
              <div className="py-16 text-center bg-white rounded-[40px] border border-slate-100">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <span className="text-2xl">🗺️</span>
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-2">Track Your Adventures</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Sign in to keep a record of places you've visited and add notes about your experiences.
                </p>
              </div>
            ) : (state.visitedPlaces || []).length > 0 ? (
              <div className="space-y-3">
                {(state.visitedPlaces || []).map(visit => (
                  <div key={visit.placeId} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        {visit.imageUrl && <img src={visit.imageUrl} className="w-full h-full object-cover" alt="" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-800 truncate">{visit.placeName}</h3>
                          {visit.isFavorite && <span className="text-sky-500 shrink-0">💙</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Visited {new Date(visit.visitedAt).toLocaleDateString()}
                        </p>
                        {visit.notes && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{visit.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          const note = prompt('Add/update notes:', visit.notes);
                          if (note !== null) {
                            const updated = (state.visitedPlaces || []).map(v =>
                              v.placeId === visit.placeId ? { ...v, notes: note } : v
                            );
                            onUpdateState('visitedPlaces', updated);
                          }
                        }}
                        className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100"
                      >
                        Edit Notes
                      </button>
                      <button
                        onClick={() => {
                          const updated = (state.visitedPlaces || []).filter(v => v.placeId !== visit.placeId);
                          onUpdateState('visitedPlaces', updated);
                        }}
                        className="px-4 py-2 text-xs font-bold text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center bg-white rounded-[40px] border border-slate-100">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <span className="text-2xl">🗺️</span>
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-2">No adventures yet</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">
                  Mark places as visited to track your family adventures!
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'circles' && (
          <GroupsList
            circles={circles}
            onCreateCircle={handleCreateCircle}
            onJoinCircle={handleJoinCircle}
            onSelectCircle={setSelectedCircle}
            isGuest={isGuest}
          />
        )}

        {activeTab === 'memories' && (
          isGuest ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Sign in to save memories</h3>
              <p className="text-sm text-slate-500 max-w-xs">
                Create an account to save photos and memories from your family adventures.
              </p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <MemoryCreate
                entitlement={state.entitlement}
                currentCount={state.memories.length}
                places={places}
                favoritePlaces={favoritePlaces}
                onCreate={handleAddMemory}
                onUpgradePrompt={() => setShowUpgradePrompt('memories')}
                enablePartnerShare={hasLinkedPartner}
                circleOptions={circles.map(circle => ({ id: circle.id, name: circle.name }))}
                onTagCircle={handleTagMemoryToCircle}
                title="Add a Memory"
                toggleLabels={{ closed: 'Add Memory', open: 'Cancel' }}
                showToggle={true}
              />

              <div className="grid grid-cols-2 gap-4">
                {state.memories.map(memory => {
                  const photos = memory.photoThumbUrls || memory.photoUrls || (memory.photoThumbUrl ? [memory.photoThumbUrl] : (memory.photoUrl ? [memory.photoUrl] : []));
                  const mainPhoto = photos[0] || memory.photoThumbUrl || memory.photoUrl;
                  return (
                    <div key={memory.id} className="bg-white rounded-[32px] overflow-hidden shadow-sm relative group aspect-square">
                      {mainPhoto ? (
                        <img src={mainPhoto} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-bold">
                          Text Memory
                        </div>
                      )}
                      {photos.length > 1 && (
                        <div className="absolute top-3 left-3 bg-black/60 text-white text-[9px] px-2 py-1 rounded-full font-bold">
                          {photos.length} photos
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-sky-950/80 via-transparent flex flex-col justify-end p-5 text-white">
                        <p className="text-[10px] font-black leading-tight mb-1">{memory.caption}</p>
                        <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest">@{memory.placeName}</p>
                      </div>
                      <button
                        onClick={() => setShareMemory(memory)}
                        className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm text-sky-600 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Share memory"
                      >
                        📤
                      </button>
                      <button
                        onClick={() => handleShareMemoryExternal(memory)}
                        className="absolute bottom-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-sm text-slate-700 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Share externally"
                      >
                        Share
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {activeTab === 'partner' && hasLinkedPartner && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-6 border border-rose-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm overflow-hidden">
                  {partnerPhotoURL ? (
                    <img src={partnerPhotoURL} alt={partnerLabel} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-black text-rose-500">{partnerInitial}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">{partnerLabel}</h3>
                  {partnerEmail && (
                    <p className="text-xs text-slate-500">{partnerEmail}</p>
                  )}
                  <p className="text-xs text-slate-500">Linked {state.partnerLink?.linkedAt ? new Date(state.partnerLink.linkedAt).toLocaleDateString() : ''}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Shared Favorites</h4>
                {!state.isPro && state.partnerSharedPlaces.length > 3 && (
                  <span className="text-[9px] font-bold text-amber-500">Free: 3 of {state.partnerSharedPlaces.length}</span>
                )}
              </div>
              {state.partnerSharedPlaces.length > 0 ? (
                <div className="space-y-3">
                  {state.partnerSharedPlaces.slice(0, state.isPro ? undefined : 3).map((shared) => {
                    const placeFromList = places.find(p => p.id === shared.placeId) ||
                      favoritePlaces.find(p => p.id === shared.placeId);
                    const fallbackImage = shared.imageUrl || 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=200&h=200&fit=crop';
                    const resolvedPlace: Place = placeFromList || {
                      id: shared.placeId,
                      name: shared.placeName,
                      description: 'Family-friendly place',
                      address: '',
                      rating: undefined,
                      tags: [],
                      imageUrl: fallbackImage,
                      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${shared.placeId}`,
                      type: shared.placeType || 'all',
                    };
                    return (
                      <button
                        key={shared.placeId}
                        onClick={() => setSelectedPlace(resolvedPlace)}
                        className="w-full text-left bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4 hover:bg-slate-50"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                          <img src={resolvedPlace.imageUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{shared.placeName}</p>
                          {shared.note && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{shared.note}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-6 text-center">
                  <p className="text-sm text-slate-500">No shared favorites yet</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Shared Memories</h4>
                {!state.isPro && state.memories.length > 3 && (
                  <span className="text-[9px] font-bold text-amber-500">Free: 3 of {state.memories.length}</span>
                )}
              </div>
              {state.memories.filter(m => m.sharedWithPartner).length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {state.memories.filter(m => m.sharedWithPartner).slice(0, state.isPro ? undefined : 3).map((memory) => {
                  const photos = memory.photoThumbUrls || memory.photoUrls || (memory.photoThumbUrl ? [memory.photoThumbUrl] : (memory.photoUrl ? [memory.photoUrl] : []));
                  const mainPhoto = photos[0] || memory.photoThumbUrl || memory.photoUrl;
                    return (
                      <div key={memory.id} className="aspect-square rounded-xl overflow-hidden">
                        {mainPhoto ? (
                          <img src={mainPhoto} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-bold">
                            Text
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-6 text-center">
                  <p className="text-sm text-slate-500">No shared memories yet</p>
                </div>
              )}
            </div>
            
            {!state.isPro && (state.favorites.length > 3 || state.memories.length > 3) && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✨</span>
                  <div>
                    <p className="font-bold text-sm text-amber-800">Upgrade to Pro</p>
                    <p className="text-xs text-amber-600">Unlimited shared favorites, memories & notes</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Notes</h4>
              <div className="bg-white rounded-2xl p-4 border border-slate-100">
                {noteError && (
                  <p className="text-xs text-rose-500 mb-2">{noteError}</p>
                )}
                {partnerNotes.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {partnerNotes.map(note => (
                      <div key={note.id} className="bg-slate-50 rounded-xl px-3 py-2">
                        <p className="text-xs text-slate-600">{note.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {note.createdByName} · {new Date(note.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mb-3">No notes yet.</p>
                )}
                <textarea 
                  placeholder="Leave a note for your partner..."
                  className="w-full h-20 text-sm resize-none outline-none text-slate-700 placeholder-slate-300"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSendPartnerNote}
                    disabled={noteSending}
                    className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold disabled:opacity-60"
                  >
                    {noteSending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bottom-nav-blur border-t border-slate-100 px-6 py-4 safe-area-inset-bottom">
        <div className="flex justify-around">
          <NavButton icon="🏠" label="Home" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <NavButton icon="💙" label="Saved" active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} />
          <NavButton icon="👥" label="Circles" active={activeTab === 'circles'} onClick={() => setActiveTab('circles')} />
          <NavButton icon="👤" label="Profile" active={false} onClick={() => setView('profile')} />
        </div>
      </nav>
      {/* Home FAB for non-explore tabs inside dashboard */}
      <HomeFab visible={activeTab !== 'explore'} onClick={() => setActiveTab('explore')} />
      
      {showPlanBilling && (
        <PlanBilling 
          state={state} 
          onClose={() => setShowPlanBilling(false)} 
          onUpdateState={onUpdateState}
        />
      )}
      
      {showUpgradePrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setShowUpgradePrompt(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <UpgradePrompt 
              feature={showUpgradePrompt === 'savedPlaces' ? 'saved places' : 'memories'}
              currentLimit={showUpgradePrompt === 'savedPlaces' ? limits.savedPlaces : limits.memories}
              onUpgrade={() => {
                setShowUpgradePrompt(null);
                setShowPlanBilling(true);
              }}
            />
            <button 
              onClick={() => setShowUpgradePrompt(null)}
              className="w-full mt-4 py-2 text-slate-500 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {shareMemory && (
        <ShareMemoryModal
          memory={shareMemory}
          circles={circles}
          onShareToCircle={(memory, circleId) => {
            const { id, ...payload } = memory;
            handleTagMemoryToCircle(circleId, payload);
          }}
          onClose={() => setShareMemory(null)}
        />
      )}

      {shareStatus && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
          <div className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-full shadow-lg shadow-slate-900/30">
            {shareStatus}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
