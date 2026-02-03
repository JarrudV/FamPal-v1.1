import React, { useState, useEffect, useCallback } from 'react';
import { AppState, Place, Memory, UserReview, ActivityType, FriendCircle, GroupMember, GroupPlace, VisitedPlace, PLAN_LIMITS, UserPreferences, SavedLocation } from '../types';
import Header from './Header';
import PlaceCard from './PlaceCard';
import Filters from './Filters';
import VenueProfile from './VenueProfile';
import GroupsList from './GroupsList';
import GroupDetail from './GroupDetail';
import PlanBilling from './PlanBilling';
import { UpgradePrompt, LimitIndicator } from './UpgradePrompt';
import { searchNearbyPlaces, textSearchPlaces } from '../placesService';
import { getLimits, canSavePlace, canAddMemory, isPaidTier } from '../lib/entitlements';
import { updateLocation, updateRadius, updateCategory, updateActiveCircle } from '../lib/profileSync';
import { ShareMemoryModal, QuickShareButton } from './ShareMemory';

interface DashboardProps {
  state: AppState;
  isGuest: boolean;
  onSignOut: () => void;
  setView: (view: string) => void;
  onUpdateState: (key: keyof AppState, value: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ state, isGuest, onSignOut, setView, onUpdateState }) => {
  const userPrefs = state.userPreferences || {};
  const [activeTab, setActiveTab] = useState<'explore' | 'favorites' | 'adventures' | 'memories' | 'groups' | 'partner'>('explore');
  const hasLinkedPartner = state.partnerLink?.status === 'accepted';
  const [selectedFilter, setSelectedFilter] = useState<ActivityType>(userPrefs.lastCategory || 'all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [caption, setCaption] = useState('');
  const [memoryPhoto, setMemoryPhoto] = useState<string | null>(null);
  const [memoryVenueId, setMemoryVenueId] = useState<string>('');
  const [memoryVenueName, setMemoryVenueName] = useState<string>('');
  
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
  
  // Groups state
  const [selectedGroup, setSelectedGroup] = useState<FriendCircle | null>(null);
  const [addToGroupPlace, setAddToGroupPlace] = useState<Place | null>(null);
  
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
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(postcode)}&format=json&limit=1`,
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

  const handleMemoryPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 5 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setMemoryPhoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const captureMemory = () => {
    if (!caption || !memoryVenueId) return;
    
    const memoryCheck = canAddMemory(state.entitlement, state.memories?.length || 0);
    if (!memoryCheck.allowed) {
      setShowUpgradePrompt('memories');
      return;
    }
    
    const newMemory: Memory = {
      id: Date.now().toString(),
      placeId: memoryVenueId,
      placeName: memoryVenueName || 'Adventure',
      photoUrl: memoryPhoto || `https://picsum.photos/seed/${Date.now()}/600/600`,
      caption,
      taggedFriends: [],
      date: new Date().toISOString()
    };
    onUpdateState('memories', [...state.memories, newMemory]);

    // Auto-mark venue as visited
    const visitedPlaces = state.visitedPlaces || [];
    const alreadyVisited = visitedPlaces.some(v => v.placeId === memoryVenueId);
    if (!alreadyVisited) {
      const selectedVenue = places.find(p => p.id === memoryVenueId);
      const newVisit: VisitedPlace = {
        placeId: memoryVenueId,
        placeName: memoryVenueName,
        placeType: selectedVenue?.type || 'all',
        imageUrl: selectedVenue?.imageUrl,
        visitedAt: new Date().toISOString(),
        notes: '',
        isFavorite: state.favorites.includes(memoryVenueId),
      };
      onUpdateState('visitedPlaces', [...visitedPlaces, newVisit]);
    }

    setCaption('');
    setMemoryPhoto(null);
    setMemoryVenueId('');
    setMemoryVenueName('');
    setShowAddMemory(false);
  };

  const favoritePlaces = places.filter(p => state.favorites.includes(p.id));

  const handleIncrementAiRequests = () => {
    const current = state.entitlement?.ai_requests_this_month || 0;
    onUpdateState('entitlement', {
      ...state.entitlement,
      ai_requests_this_month: current + 1
    });
  };

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateGroup = (name: string) => {
    if (!state.user) return;
    const newGroup: FriendCircle = {
      id: Date.now().toString(),
      name,
      ownerId: state.user.uid,
      ownerName: state.user.displayName || state.user.email || 'You',
      members: [{
        userId: state.user.uid,
        email: state.user.email || '',
        displayName: state.user.displayName || 'You',
        role: 'owner',
        joinedAt: new Date().toISOString(),
      }],
      sharedPlaces: [],
      plans: [],
      inviteCode: generateInviteCode(),
      createdAt: new Date().toISOString(),
    };
    const updatedCircles = [...(state.friendCircles || []), newGroup];
    onUpdateState('friendCircles', updatedCircles);
  };

  const handleAddPlaceToGroup = (groupId: string, placeId: string, placeName: string) => {
    if (!state.user) return;
    const updatedCircles = (state.friendCircles || []).map(g => {
      if (g.id === groupId) {
        const newPlace: GroupPlace = {
          placeId,
          placeName,
          addedBy: state.user!.uid,
          addedByName: state.user!.displayName || 'You',
          addedAt: new Date().toISOString(),
        };
        return { ...g, sharedPlaces: [...g.sharedPlaces, newPlace] };
      }
      return g;
    });
    onUpdateState('friendCircles', updatedCircles);
    const updatedGroup = updatedCircles.find(g => g.id === groupId);
    if (updatedGroup) setSelectedGroup(updatedGroup);
  };

  const handleRemovePlaceFromGroup = (groupId: string, placeId: string) => {
    const updatedCircles = (state.friendCircles || []).map(g => {
      if (g.id === groupId) {
        return { ...g, sharedPlaces: g.sharedPlaces.filter(sp => sp.placeId !== placeId) };
      }
      return g;
    });
    onUpdateState('friendCircles', updatedCircles);
    const updatedGroup = updatedCircles.find(g => g.id === groupId);
    if (updatedGroup) setSelectedGroup(updatedGroup);
  };

  const handleDeleteGroup = (groupId: string) => {
    const updatedCircles = (state.friendCircles || []).filter(g => g.id !== groupId);
    onUpdateState('friendCircles', updatedCircles);
    setSelectedGroup(null);
  };

  const handleLeaveGroup = (groupId: string) => {
    if (!state.user) return;
    const updatedCircles = (state.friendCircles || []).map(g => {
      if (g.id === groupId) {
        return { ...g, members: g.members.filter(m => m.userId !== state.user!.uid) };
      }
      return g;
    }).filter(g => g.members.length > 0);
    onUpdateState('friendCircles', updatedCircles);
    setSelectedGroup(null);
  };

  const handleInviteMember = (groupId: string, email: string) => {
    console.log('Invite sent to:', email, 'for group:', groupId);
  };

  if (selectedGroup) {
    return (
      <GroupDetail
        group={selectedGroup}
        userId={state.user?.uid || ''}
        userFavorites={state.favorites}
        allPlaces={places}
        onClose={() => setSelectedGroup(null)}
        onAddPlace={(placeId, placeName) => handleAddPlaceToGroup(selectedGroup.id, placeId, placeName)}
        onRemovePlace={(placeId) => handleRemovePlaceFromGroup(selectedGroup.id, placeId)}
        onInviteMember={(email) => handleInviteMember(selectedGroup.id, email)}
        onLeaveGroup={() => handleLeaveGroup(selectedGroup.id)}
        onDeleteGroup={() => handleDeleteGroup(selectedGroup.id)}
      />
    );
  }

  if (selectedPlace) {
    return (
      <VenueProfile 
        place={selectedPlace} 
        isFavorite={state.favorites.includes(selectedPlace.id)}
        isVisited={(state.visitedPlaces || []).some(v => v.placeId === selectedPlace.id)}
        memories={state.memories}
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
      />
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
          <TabButton label="Groups" count={(state.friendCircles || []).length} active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
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
                  showAddToGroup={!isGuest && (state.friendCircles || []).length > 0}
                  onAddToGroup={() => setAddToGroupPlace(place)}
                />
              ))
            ) : (
              <div className="py-24 text-center text-slate-300 font-black text-xs uppercase tracking-widest bg-white rounded-[40px] border border-slate-50">
                No saved spots yet.
              </div>
            )}
          </div>
        )}

        {addToGroupPlace && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setAddToGroupPlace(null)}>
            <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-lg text-slate-800">Add to Group</h3>
              <p className="text-sm text-slate-500">Select a group to add "{addToGroupPlace.name}":</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(state.friendCircles || []).map(group => {
                  const alreadyAdded = group.sharedPlaces.some(sp => sp.placeId === addToGroupPlace.id);
                  return (
                    <button
                      key={group.id}
                      onClick={() => {
                        if (!alreadyAdded) {
                          handleAddPlaceToGroup(group.id, addToGroupPlace.id, addToGroupPlace.name);
                        }
                        setAddToGroupPlace(null);
                      }}
                      disabled={alreadyAdded}
                      className={`w-full p-4 rounded-xl text-left transition-colors ${
                        alreadyAdded 
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                          : 'bg-purple-50 hover:bg-purple-100 text-slate-700'
                      }`}
                    >
                      <span className="font-semibold">{group.name}</span>
                      {alreadyAdded && <span className="text-xs ml-2">(already added)</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setAddToGroupPlace(null)}
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

        {activeTab === 'groups' && (
          <GroupsList
            friendCircles={state.friendCircles || []}
            onCreateGroup={handleCreateGroup}
            onSelectGroup={setSelectedGroup}
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
              <button 
                onClick={() => setShowAddMemory(!showAddMemory)}
                className="w-full bg-sky-500 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-100"
              >
                {showAddMemory ? 'Cancel' : 'Add Memory'}
              </button>

              {showAddMemory && (
                <div className="bg-white p-6 rounded-[40px] shadow-2xl border border-sky-50 space-y-4 animate-slide-up">
                  <h3 className="font-black text-sky-900">Add a Memory</h3>
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tag a Venue</label>
                    <select
                      value={memoryVenueId}
                      onChange={(e) => {
                        const venue = [...places, ...favoritePlaces].find(p => p.id === e.target.value);
                        setMemoryVenueId(e.target.value);
                        setMemoryVenueName(venue?.name || '');
                      }}
                      className="w-full h-14 bg-slate-50 border-none rounded-2xl px-5 text-sm font-bold text-slate-600 outline-none appearance-none"
                    >
                      <option value="">Select a place...</option>
                      {state.favorites.length > 0 && (
                        <optgroup label="Your Saved Places">
                          {favoritePlaces.map(p => (
                            <option key={`fav-${p.id}`} value={p.id}>{p.name}</option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Nearby Places">
                        {places.filter(p => !state.favorites.includes(p.id)).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Add a Photo</label>
                    <div className="flex gap-3">
                      {memoryPhoto ? (
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden">
                          <img src={memoryPhoto} className="w-full h-full object-cover" alt="" />
                          <button 
                            onClick={() => setMemoryPhoto(null)}
                            className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full text-white text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <label className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-100">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleMemoryPhotoUpload}
                          />
                          <span className="text-2xl text-slate-300">📷</span>
                        </label>
                      )}
                      <p className="text-xs text-slate-400 flex-1">Tap to add a photo from your adventure (max 5MB)</p>
                    </div>
                  </div>

                  <textarea 
                    placeholder="What happened today?..."
                    className="w-full p-5 bg-slate-50 border-none rounded-3xl text-sm font-bold text-slate-600 outline-none"
                    rows={3}
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                  />
                  <button 
                    onClick={captureMemory}
                    disabled={!memoryVenueId || !caption}
                    className="w-full h-14 bg-sky-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-100 disabled:opacity-50"
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
                    <button
                      onClick={() => setShareMemory(memory)}
                      className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm text-sky-600 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Share memory"
                    >
                      📤
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {activeTab === 'partner' && hasLinkedPartner && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-6 border border-rose-100">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                  💕
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800">{state.partnerLink?.partnerName || 'Your Partner'}</h3>
                  <p className="text-xs text-slate-500">Linked {state.partnerLink?.linkedAt ? new Date(state.partnerLink.linkedAt).toLocaleDateString() : ''}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Shared Favorites</h4>
                {!state.isPro && state.favorites.length > 3 && (
                  <span className="text-[9px] font-bold text-amber-500">Free: 3 of {state.favorites.length}</span>
                )}
              </div>
              {state.favorites.length > 0 ? (
                <div className="space-y-3">
                  {state.favorites.slice(0, state.isPro ? undefined : 3).map((favId, idx) => (
                    <div key={favId} className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4">
                      <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center text-xl">📍</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">Saved Place {idx + 1}</p>
                        <p className="text-xs text-slate-400">Shared with partner</p>
                      </div>
                    </div>
                  ))}
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
              {state.memories.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {state.memories.slice(0, state.isPro ? undefined : 3).map((memory) => (
                    <div key={memory.id} className="aspect-square rounded-xl overflow-hidden">
                      <img src={memory.photoUrl} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
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
                <textarea 
                  placeholder="Leave a note for your partner..."
                  className="w-full h-20 text-sm resize-none outline-none text-slate-700 placeholder-slate-300"
                />
                <div className="flex justify-end">
                  <button className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold">
                    Send
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
          <NavButton icon="👥" label="Groups" active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
          <NavButton icon="👤" label="Profile" active={false} onClick={() => setView('profile')} />
        </div>
      </nav>
      
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
          circles={state.friendCircles || []}
          onShareToCircle={(memory, circleId) => {
            const circle = (state.friendCircles || []).find(c => c.id === circleId);
            if (circle) {
              const sharedPlace: GroupPlace = {
                placeId: memory.placeId,
                placeName: memory.placeName,
                addedBy: state.user?.uid || 'guest',
                addedByName: state.user?.displayName || 'Guest',
                addedAt: new Date().toISOString(),
                note: memory.caption
              };
              const updatedCircle = {
                ...circle,
                sharedPlaces: [...circle.sharedPlaces, sharedPlace]
              };
              const updatedCircles = (state.friendCircles || []).map(c => 
                c.id === circleId ? updatedCircle : c
              );
              onUpdateState('friendCircles', updatedCircles);
            }
          }}
          onClose={() => setShareMemory(null)}
        />
      )}
    </div>
  );
};

const TabButton = ({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 ${
      active ? 'bg-sky-500 text-white shadow-lg shadow-sky-100' : 'bg-white text-slate-400 border border-slate-100'
    }`}
  >
    {label}{count !== undefined && count > 0 ? ` [${count}]` : ''}
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
