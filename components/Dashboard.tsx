import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState, Place, Memory, UserReview, ActivityType, GroupPlace, VisitedPlace, PLAN_LIMITS, UserPreferences, SavedLocation, SavedPlace } from '../types';
import Header from './Header';
import PlaceCard from './PlaceCard';
import Filters from './Filters';
import VenueProfile from './VenueProfile';
import GroupsList from './GroupsList';
import GroupDetail from './GroupDetail';
import PlanBilling from './PlanBilling';
import { UpgradePrompt, LimitIndicator } from './UpgradePrompt';
import { searchNearbyPlacesPaged, textSearchPlacesPaged, getPlaceDetails } from '../placesService';
import { getLimits, canSavePlace, isPaidTier, getNextResetDate } from '../lib/entitlements';
import { updateLocation, updateRadius, updateCategory, updateActiveCircle } from '../lib/profileSync';
import { ShareMemoryModal } from './ShareMemory';
import { db, doc, getDoc, collection, onSnapshot, setDoc, auth, serverTimestamp, increment } from '../lib/firebase';
import { upsertSavedPlace, deleteSavedPlace } from '../lib/userData';
import MemoryCreate from './MemoryCreate';
import {
  CircleDoc,
  createCircle,
  createPartnerCircle,
  joinCircleByCode,
  listenToUserCircles,
  addCircleMemory,
  saveCirclePlace,
  deleteCircle,
} from '../lib/circles';
import { getPartnerThreadId, ensurePartnerThread } from '../lib/partnerThreads';
import { Timestamp } from 'firebase/firestore';

interface DashboardProps {
  state: AppState;
  isGuest: boolean;
  onSignOut: () => void;
  setView: (view: string) => void;
  onUpdateState: (key: keyof AppState, value: any) => void;
  initialCircleId?: string | null;
  onClearInitialCircle?: () => void;
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
    aria-label={`${label}${count !== undefined && count > 0 ? `, ${count} items` : ''}`}
    className={`px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 min-h-[44px] ${
      active ? 'bg-sky-500 text-white shadow-lg shadow-sky-200' : 'bg-white text-slate-600 border border-slate-200'
    }`}
  >
    {label}{count !== undefined && count > 0 ? ` (${count})` : ''}
  </button>
);

type NavButtonProps = { icon: string; label: string; active: boolean; onClick: () => void };
const NavButton: React.FC<NavButtonProps> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    aria-label={label}
    className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all min-w-[60px] min-h-[52px] ${
      active ? 'text-sky-500 bg-sky-50' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-[11px] font-semibold capitalize">{label}</span>
  </button>
);

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const Dashboard: React.FC<DashboardProps> = ({ state, isGuest, onSignOut, setView, onUpdateState, initialCircleId, onClearInitialCircle }) => {
  const userPrefs = state.userPreferences || {};
  const [activeTab, setActiveTab] = useState<'explore' | 'favorites' | 'adventures' | 'memories' | 'circles' | 'partner'>('explore');
  const hasLinkedPartner = state.partnerLink?.status === 'accepted';
  const partnerUserId = state.partnerLink?.partnerUserId;
  const partnerName = state.partnerLink?.partnerName?.trim();
  const partnerEmail = state.partnerLink?.partnerEmail;
  const partnerPhotoURL = state.partnerLink?.partnerPhotoURL;
  const partnerIdLabel = partnerUserId
    ? `Partner linked · ${partnerUserId.slice(0, 6)}…${partnerUserId.slice(-4)}`
    : 'Partner linked';
  const partnerLabel = partnerName || partnerIdLabel;
  const partnerInitial = partnerName ? partnerName[0].toUpperCase() : 'P';
  const [partnerNotes, setPartnerNotes] = useState<PartnerNote[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteSending, setNoteSending] = useState(false);
  const [newPartnerCircleName, setNewPartnerCircleName] = useState('');
  const [creatingPartnerCircle, setCreatingPartnerCircle] = useState(false);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ActivityType>(userPrefs.lastCategory || 'all');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [placesNextPageToken, setPlacesNextPageToken] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  // Location state - hydrate from saved preferences
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    userPrefs.lastLocation ? { lat: userPrefs.lastLocation.lat, lng: userPrefs.lastLocation.lng } : null
  );
  const [locationName, setLocationName] = useState(userPrefs.lastLocation?.label || 'Locating...');
  const [locationError, setLocationError] = useState<string | null>(null);
  const isEditingLocationRef = useRef(false);
  const isEditingRadiusRef = useRef(false);
  const isEditingCategoryRef = useRef(false);
  const locationEditTimeoutRef = useRef<number | null>(null);
  const radiusEditTimeoutRef = useRef<number | null>(null);
  const categoryEditTimeoutRef = useRef<number | null>(null);
  
  // Radius slider state (in km) - hydrate from saved preferences
  const [radiusKm, setRadiusKm] = useState(userPrefs.lastRadius || 10);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Preference filter mode: all (no filter), family (everyone), partner (adults), solo (just me)
  const [prefFilterMode, setPrefFilterMode] = useState<'all' | 'family' | 'partner' | 'solo'>('all');
  
  // Hide saved places toggle - show fresh discoveries only
  const [hideSavedPlaces, setHideSavedPlaces] = useState(false);
  
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
  
  // Computed: separate partner circles from regular circles
  const partnerCircles = circles.filter(c => c.isPartnerCircle);
  const regularCircles = circles.filter(c => !c.isPartnerCircle);
  
  // Computed: Combined preferences based on filter mode
  const combinedPreferences = useMemo(() => {
    const myPrefs = state.preferences || { foodPreferences: [], allergies: [], accessibility: [], activityPreferences: [] };
    const childrenPrefs = state.children.map(c => c.preferences || { foodPreferences: [], allergies: [], accessibility: [], activityPreferences: [] });
    // Partner preferences would come from partner's profile - for now we just note partner is included
    
    if (prefFilterMode === 'solo') {
      return {
        allergies: [...new Set(myPrefs.allergies)],
        accessibility: [...new Set(myPrefs.accessibility)],
        foodPreferences: [...new Set(myPrefs.foodPreferences)],
        activityPreferences: [...new Set(myPrefs.activityPreferences)],
        includesPartner: false,
        includesChildren: false,
      };
    }
    
    if (prefFilterMode === 'partner') {
      return {
        allergies: [...new Set(myPrefs.allergies)],
        accessibility: [...new Set(myPrefs.accessibility)],
        foodPreferences: [...new Set(myPrefs.foodPreferences)],
        activityPreferences: [...new Set(myPrefs.activityPreferences)],
        includesPartner: true,
        includesChildren: false,
      };
    }
    
    if (prefFilterMode === 'family') {
      const allAllergies = [...myPrefs.allergies];
      const allAccessibility = [...myPrefs.accessibility];
      const allFood = [...myPrefs.foodPreferences];
      const allActivity = [...myPrefs.activityPreferences];
      
      childrenPrefs.forEach(cp => {
        allAllergies.push(...cp.allergies);
        allAccessibility.push(...cp.accessibility);
        allFood.push(...cp.foodPreferences);
        allActivity.push(...cp.activityPreferences);
      });
      
      return {
        allergies: [...new Set(allAllergies)],
        accessibility: [...new Set(allAccessibility)],
        foodPreferences: [...new Set(allFood)],
        activityPreferences: [...new Set(allActivity)],
        includesPartner: hasLinkedPartner,
        includesChildren: state.children.length > 0,
      };
    }
    
    // 'all' mode - no filtering
    return {
      allergies: [],
      accessibility: [],
      foodPreferences: [],
      activityPreferences: [],
      includesPartner: false,
      includesChildren: false,
    };
  }, [prefFilterMode, state.preferences, state.children, hasLinkedPartner]);
  
  // Upgrade prompt state
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<'savedPlaces' | 'memories' | null>(null);
  
  // Share memory state
  const [shareMemory, setShareMemory] = useState<Memory | null>(null);
  const [partnerSharedMemories, setPartnerSharedMemories] = useState<Memory[]>([]);
  
  // Plan & Billing modal
  const [showPlanBilling, setShowPlanBilling] = useState(false);
  
  // Entitlement limits
  const limits = getLimits(state.entitlement);
  const isPaid = isPaidTier(state.entitlement);
  const enrichInFlightRef = useRef<Set<string>>(new Set());
  const fallbackImage = 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&h=300&fit=crop';
  const placesSearchKeyRef = useRef<string>('');
  const familyPoolResetRef = useRef<string | null>(null);
  const partnerLinkRequiresPro = import.meta.env.VITE_PARTNER_LINK_REQUIRES_PRO === 'true';
  const canLinkPartner = !partnerLinkRequiresPro || isPaid;
  const isPartnerPending = state.partnerLink?.status === 'pending';
  
  useEffect(() => {
    return () => {
      if (locationEditTimeoutRef.current) window.clearTimeout(locationEditTimeoutRef.current);
      if (radiusEditTimeoutRef.current) window.clearTimeout(radiusEditTimeoutRef.current);
      if (categoryEditTimeoutRef.current) window.clearTimeout(categoryEditTimeoutRef.current);
    };
  }, []);

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
    if (isGuest) return;
    const uid = state.user?.uid || auth?.currentUser?.uid;
    const partnerId = state.partnerLink?.partnerUserId;
    if (!uid || !partnerId) return;
    if (state.partnerLink?.status !== 'accepted') return;
    ensurePartnerThread(uid, partnerId).catch(err => {
      console.warn('Failed to ensure partner thread', err);
    });
  }, [isGuest, state.user?.uid, state.partnerLink?.partnerUserId, state.partnerLink?.status]);

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
    if (!initialCircleId) return;
    if (circles.length === 0) return;
    const found = circles.find(circle => circle.id === initialCircleId);
    if (found) {
      setSelectedCircle(found);
      if (onClearInitialCircle) {
        onClearInitialCircle();
      }
    }
  }, [initialCircleId, circles, onClearInitialCircle]);

  useEffect(() => {
    if (!db) return;
    if (!state.user?.uid) return;
    if (isGuest) return;
    const link = state.partnerLink;
    if (!link?.partnerUserId || link.status !== 'accepted') {
      setPartnerNotes([]);
      setNoteError(null);
      return;
    }
    let unsub: (() => void) | null = null;
    let cancelled = false;
    const threadId = getPartnerThreadId(state.user.uid, link.partnerUserId);
    (async () => {
      try {
        await ensurePartnerThread(state.user!.uid, link.partnerUserId);
        if (cancelled) return;
        const notesRef = collection(db, 'partnerThreads', threadId, 'notes');
        unsub = onSnapshot(notesRef, (snap) => {
          const nextNotes = snap.docs.map((docSnap) => {
            const data = docSnap.data() as Omit<PartnerNote, 'id'>;
            return { id: docSnap.id, ...data };
          });
          nextNotes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          setPartnerNotes(nextNotes);
        }, (err: any) => {
          console.warn('Partner notes listener error.', err);
          if (err?.code === 'permission-denied') {
            setNoteError('Partner notes are unavailable (permission denied).');
          } else {
            setNoteError('Unable to load notes right now.');
          }
        });
      } catch (err) {
        console.warn('Failed to initialize partner notes thread.', err);
      }
    })();

    return () => {
      cancelled = true;
      if (unsub) unsub();
    };
  }, [state.user?.uid, state.partnerLink, isGuest]);

  useEffect(() => {
    if (!db) return;
    if (isGuest) return;
    const uid = state.user?.uid;
    const link = state.partnerLink;
    if (!uid || !link?.partnerUserId || link.status !== 'accepted') {
      onUpdateState('partnerSharedPlaces', []);
      setPartnerSharedMemories([]);
      onUpdateState('familyPool', undefined);
      return;
    }
    let unsubPlaces: (() => void) | null = null;
    let unsubMemories: (() => void) | null = null;
    let unsubThread: (() => void) | null = null;
    let cancelled = false;
    const threadId = getPartnerThreadId(uid, link.partnerUserId);
    (async () => {
      try {
        await ensurePartnerThread(uid, link.partnerUserId);
        if (cancelled) return;
        const placesRef = collection(db, 'partnerThreads', threadId, 'sharedPlaces');
        const memoriesRef = collection(db, 'partnerThreads', threadId, 'sharedMemories');
        const threadRef = doc(db, 'partnerThreads', threadId);

        unsubPlaces = onSnapshot(placesRef, (snap) => {
          const nextPlaces = snap.docs.map(docSnap => docSnap.data() as GroupPlace);
          nextPlaces.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
          onUpdateState('partnerSharedPlaces', nextPlaces);
        }, (err: any) => {
          console.warn('Partner shared places listener error.', err);
        });

        unsubMemories = onSnapshot(memoriesRef, (snap) => {
          const nextMemories = snap.docs.map(docSnap => {
            const data = docSnap.data() as Omit<Memory, 'id'>;
            return { id: docSnap.id, ...data };
          });
          nextMemories.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
          setPartnerSharedMemories(nextMemories);
        }, (err: any) => {
          console.warn('Partner shared memories listener error.', err);
        });

        unsubThread = onSnapshot(threadRef, (snap) => {
          const data = snap.data() || {};
          const pool = data.entitlementPool;
          const isFamilyPlan = state.entitlement?.plan_tier === 'family';
          if (isFamilyPlan) {
            const poolResetDate = pool?.ai_requests_reset_date;
            const nextResetDate = getNextResetDate();
            const resetKey = `${threadId}:${poolResetDate || 'none'}`;
            const shouldReset = poolResetDate ? new Date() >= new Date(poolResetDate) : true;
            if (shouldReset && familyPoolResetRef.current !== resetKey) {
              familyPoolResetRef.current = resetKey;
              setDoc(threadRef, {
                entitlementPool: {
                  plan_tier: 'family',
                  ai_requests_this_month: 0,
                  ai_requests_reset_date: nextResetDate,
                },
                updatedAt: serverTimestamp(),
              }, { merge: true }).catch(err => {
                console.warn('Failed to reset family AI pool.', err);
              });
            } else if (!pool?.ai_requests_reset_date && familyPoolResetRef.current !== resetKey) {
              familyPoolResetRef.current = resetKey;
              setDoc(threadRef, {
                entitlementPool: {
                  plan_tier: 'family',
                  ai_requests_this_month: pool?.ai_requests_this_month || 0,
                  ai_requests_reset_date: nextResetDate,
                },
                updatedAt: serverTimestamp(),
              }, { merge: true }).catch(err => {
                console.warn('Failed to initialize family AI pool.', err);
              });
            }
          }

          if (isFamilyPlan && pool) {
            onUpdateState('familyPool', {
              ai_requests_this_month: pool.ai_requests_this_month || 0,
              ai_requests_reset_date: pool.ai_requests_reset_date || getNextResetDate(),
            });
          } else {
            onUpdateState('familyPool', undefined);
          }
        }, (err: any) => {
          console.warn('Partner thread listener error.', err);
        });
      } catch (err) {
        console.warn('Failed to initialize partner thread listeners.', err);
      }
    })();

    return () => {
      cancelled = true;
      if (unsubPlaces) unsubPlaces();
      if (unsubMemories) unsubMemories();
      if (unsubThread) unsubThread();
    };
  }, [state.user?.uid, state.partnerLink, isGuest, onUpdateState]);

  const handleSendPartnerNote = async () => {
    if (!noteInput.trim()) {
      setNoteError('Please enter a note before sending.');
      return;
    }
    if (!db || !state.user?.uid) {
      setNoteError('Please sign in to send notes.');
      return;
    }
    if (!state.partnerLink?.partnerUserId || state.partnerLink.status !== 'accepted') {
      setNoteError('Link a partner to send notes.');
      return;
    }

    setNoteError(null);
    setNoteSending(true);
    const uid = state.user.uid;
    const link = state.partnerLink;
    const threadId = getPartnerThreadId(uid, link.partnerUserId);
    const notesRef = collection(db, 'partnerThreads', threadId, 'notes');

    const createdByName = state.user.displayName || state.user.email || 'You';
    const noteId = `${Date.now()}`;
    const notePayload = {
      text: noteInput.trim(),
      createdAt: new Date().toISOString(),
      createdBy: uid,
      createdByName,
    };

    try {
      await ensurePartnerThread(uid, link.partnerUserId);
      await setDoc(doc(notesRef, noteId), notePayload);
      await setDoc(doc(db, 'partnerThreads', threadId), { updatedAt: serverTimestamp() }, { merge: true });
      setNoteInput('');
    } catch (err: any) {
      console.warn('Failed to send partner note.', err);
      if (err?.code === 'permission-denied') {
        setNoteError('Permission denied. Please re-link your partner.');
      } else {
        setNoteError('Failed to send note. Please try again.');
      }
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

      const searchKey = `${userLocation.lat.toFixed(3)}:${userLocation.lng.toFixed(3)}:${selectedFilter}:${radiusKm}:${searchQuery.trim().toLowerCase()}`;
      placesSearchKeyRef.current = searchKey;
      setLoading(true);
      setLoadingMore(false);
      setPlacesNextPageToken(null);
      try {
        let response: { places: Place[]; nextPageToken: string | null };
        if (searchQuery.trim()) {
          // Use text search for queries
          response = await textSearchPlacesPaged(searchQuery, userLocation.lat, userLocation.lng, radiusKm);
        } else {
          // Use nearby search for browsing - fast and cheap
          response = await searchNearbyPlacesPaged(userLocation.lat, userLocation.lng, selectedFilter, radiusKm);
        }
        if (placesSearchKeyRef.current !== searchKey) return;
        setPlaces(response.places);
        setPlacesNextPageToken(response.nextPageToken || null);
      } catch (error) {
        console.error('Error fetching places:', error);
      } finally {
        if (placesSearchKeyRef.current === searchKey) {
          setLoading(false);
        }
      }
    };
    
    if (activeTab === 'explore' && userLocation) {
      fetchPlaces();
    }
  }, [selectedFilter, activeTab, userLocation, radiusKm, searchQuery]);

  const handleLoadMorePlaces = async () => {
    if (!userLocation || loadingMore || !placesNextPageToken) return;
    const searchKey = `${userLocation.lat.toFixed(3)}:${userLocation.lng.toFixed(3)}:${selectedFilter}:${radiusKm}:${searchQuery.trim().toLowerCase()}`;
    setLoadingMore(true);
    try {
      let response: { places: Place[]; nextPageToken: string | null };
      if (searchQuery.trim()) {
        response = await textSearchPlacesPaged(searchQuery, userLocation.lat, userLocation.lng, radiusKm, placesNextPageToken);
      } else {
        response = await searchNearbyPlacesPaged(userLocation.lat, userLocation.lng, selectedFilter, radiusKm, placesNextPageToken);
      }
      if (placesSearchKeyRef.current !== searchKey) return;
      setPlaces((prev) => {
        const existingIds = new Set(prev.map(place => place.id));
        const deduped = response.places.filter(place => !existingIds.has(place.id));
        return [...prev, ...deduped];
      });
      setPlacesNextPageToken(response.nextPageToken || null);
    } catch (error) {
      console.warn('Load more places failed.', error);
    } finally {
      if (placesSearchKeyRef.current === searchKey) {
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (isGuest) return;
    const prefs = state.userPreferences;
    if (!prefs) return;

    if (!isEditingRadiusRef.current && typeof prefs.lastRadius === 'number' && prefs.lastRadius !== radiusKm) {
      setRadiusKm(prefs.lastRadius);
    }

    if (!isEditingCategoryRef.current && prefs.lastCategory && prefs.lastCategory !== selectedFilter) {
      setSelectedFilter(prefs.lastCategory);
    }

    if (!isEditingLocationRef.current && prefs.lastLocation) {
      const next = prefs.lastLocation;
      const current = userLocation;
      const sameLatLng = current &&
        Math.abs(current.lat - next.lat) < 0.00001 &&
        Math.abs(current.lng - next.lng) < 0.00001;
      if (!sameLatLng) {
        setUserLocation({ lat: next.lat, lng: next.lng });
      }
      if (next.label && next.label !== locationName) {
        setLocationName(next.label);
      }
      if (locationError) {
        setLocationError(null);
      }
    }
  }, [state.userPreferences, radiusKm, selectedFilter, userLocation, locationName, locationError, isGuest]);
  
  // Handle search from header
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveTab('explore');
  };
  
  // Handle location change from postcode input
  const handleLocationChange = async (postcode: string): Promise<void> => {
    isEditingLocationRef.current = true;
    if (locationEditTimeoutRef.current) {
      window.clearTimeout(locationEditTimeoutRef.current);
    }
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
    } finally {
      locationEditTimeoutRef.current = window.setTimeout(() => {
        isEditingLocationRef.current = false;
      }, 800);
    }
  };
  
  // Handler for radius slider that also persists
  const handleRadiusSliderChange = (newRadius: number) => {
    isEditingRadiusRef.current = true;
    if (radiusEditTimeoutRef.current) {
      window.clearTimeout(radiusEditTimeoutRef.current);
    }
    radiusEditTimeoutRef.current = window.setTimeout(() => {
      isEditingRadiusRef.current = false;
    }, 800);
    setRadiusKm(newRadius);
    persistRadius(newRadius);
  };
  
  // Handler for category filter that also persists
  const handleFilterChange = (category: ActivityType) => {
    isEditingCategoryRef.current = true;
    if (categoryEditTimeoutRef.current) {
      window.clearTimeout(categoryEditTimeoutRef.current);
    }
    categoryEditTimeoutRef.current = window.setTimeout(() => {
      isEditingCategoryRef.current = false;
    }, 800);
    setSelectedFilter(category);
    persistCategory(category);
  };

  const mapSavedPlaceToPlace = (saved: SavedPlace): Place => {
    const place: Place = {
      id: saved.placeId,
      name: saved.name || 'Saved place',
      description: saved.address || saved.description || 'Address unavailable',
      address: saved.address || '',
      rating: saved.rating,
      tags: saved.tags || [],
      mapsUrl: saved.mapsUrl || `https://www.google.com/maps/place/?q=place_id:${saved.placeId}`,
      type: saved.type || 'all',
      priceLevel: saved.priceLevel,
      imageUrl: saved.imageUrl || fallbackImage,
    };
    return place;
  };

  const savedPlaces = state.savedPlaces || [];

  const buildSavedPlaceSnapshot = (place: Place): SavedPlace => ({
    placeId: place.id,
    name: place.name,
    address: place.address || '',
    imageUrl: place.imageUrl,
    mapsUrl: place.mapsUrl || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    rating: place.rating,
    priceLevel: place.priceLevel,
    savedAt: Timestamp.now(),
  });

  const priceLevelToString = (level?: number): '$' | '$$' | '$$$' | '$$$$' | undefined => {
    switch (level) {
      case 0: return '$';
      case 1: return '$';
      case 2: return '$$';
      case 3: return '$$$';
      case 4: return '$$$$';
      default: return undefined;
    }
  };

  const toggleFavorite = (place: Place) => {
    const isRemoving = state.favorites.includes(place.id);
    
    if (!isRemoving) {
      const saveCheck = canSavePlace(state.entitlement, state.favorites.length);
      if (!saveCheck.allowed) {
        setShowUpgradePrompt('savedPlaces');
        return;
      }
    }
    
    const newFavorites = isRemoving
      ? state.favorites.filter(id => id !== place.id)
      : [...state.favorites, place.id];
    onUpdateState('favorites', newFavorites);
    const nextSavedPlaces = isRemoving
      ? savedPlaces.filter(saved => saved.placeId !== place.id)
      : [...savedPlaces.filter(saved => saved.placeId !== place.id), buildSavedPlaceSnapshot(place)];
    onUpdateState('savedPlaces', nextSavedPlaces);

    if (isGuest) return;
    const uid = state.user?.uid || auth?.currentUser?.uid;
    if (!uid) {
      console.warn('toggleFavorite: missing user uid');
      return;
    }
    if (isRemoving) {
      deleteSavedPlace(uid, place.id).catch(err => {
        console.warn('Failed to delete saved place', err);
      });
    } else {
      const snapshot = buildSavedPlaceSnapshot(place);
      upsertSavedPlace(uid, snapshot).catch(err => {
        console.warn('Failed to save place snapshot', err);
      });
    }
  };

  const handleAddPartnerPlace = async (groupPlace: GroupPlace) => {
    if (!db || !state.user?.uid || !state.partnerLink?.partnerUserId) {
      alert('Please sign in and link a partner first.');
      return;
    }
    try {
      const threadId = await ensurePartnerThread(state.user.uid, state.partnerLink.partnerUserId);
      const placeRef = doc(db, 'partnerThreads', threadId, 'sharedPlaces', groupPlace.placeId);
      await setDoc(placeRef, groupPlace, { merge: true });
      await setDoc(doc(db, 'partnerThreads', threadId), { updatedAt: serverTimestamp() }, { merge: true });
      alert(`Added "${groupPlace.placeName}" to Partner Plans!`);
    } catch (err: any) {
      console.warn('Failed to save partner shared place.', err);
      if (err?.code === 'permission-denied') {
        alert('Permission denied. Please re-link your partner.');
      } else {
        alert('Failed to add to Partner Plans. Please try again.');
      }
    }
  };

  useEffect(() => {
    if (isGuest) return;
    if (activeTab !== 'favorites') return;
    const uid = state.user?.uid || auth?.currentUser?.uid;
    if (!uid) return;
    const missing = savedPlaces.filter((place) => {
      const isPlaceholderName = !place.name || place.name === 'Saved place';
      return isPlaceholderName || !place.address || !place.imageUrl || !place.mapsUrl || place.rating === undefined;
    }).filter(place => !enrichInFlightRef.current.has(place.placeId));

    if (missing.length === 0) return;

    const queue = missing.slice(0, 6);
    let active = 0;
    const maxConcurrent = 2;

    const runNext = async () => {
      if (queue.length === 0) return;
      if (active >= maxConcurrent) return;
      const nextPlace = queue.shift();
      if (!nextPlace) return;
      active += 1;
      enrichInFlightRef.current.add(nextPlace.placeId);
      try {
        const details = await getPlaceDetails(nextPlace.placeId);
        if (!details) return;
        const updated: SavedPlace = {
          placeId: nextPlace.placeId,
          name: details.name || nextPlace.name || 'Saved place',
          address: details.address || nextPlace.address || '',
          imageUrl: details.photos?.[0] || nextPlace.imageUrl,
          mapsUrl: details.mapsUrl || nextPlace.mapsUrl || `https://www.google.com/maps/place/?q=place_id:${nextPlace.placeId}`,
          rating: details.rating ?? nextPlace.rating,
          priceLevel: priceLevelToString(details.priceLevel) || nextPlace.priceLevel,
          savedAt: nextPlace.savedAt || Timestamp.now(),
        };
        await upsertSavedPlace(uid, updated);
      } catch (err) {
        console.warn('Saved place enrichment failed', { placeId: nextPlace.placeId, err });
      } finally {
        enrichInFlightRef.current.delete(nextPlace.placeId);
        active -= 1;
        if (queue.length > 0) {
          runNext();
        }
      }
    };

    for (let i = 0; i < maxConcurrent; i += 1) {
      runNext();
    }
  }, [activeTab, isGuest, savedPlaces, state.user?.uid]);

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
    if (!isGuest && db && state.partnerLink?.status === 'accepted' && state.partnerLink.partnerUserId && memory.sharedWithPartner && state.user?.uid) {
      const threadId = getPartnerThreadId(state.user.uid, state.partnerLink.partnerUserId);
      const sharedRef = doc(db, 'partnerThreads', threadId, 'sharedMemories', newMemory.id);
      const payload: Omit<Memory, 'id'> = {
        placeId: newMemory.placeId,
        placeName: newMemory.placeName,
        photoUrl: newMemory.photoUrl,
        photoUrls: newMemory.photoUrls,
        photoThumbUrl: newMemory.photoThumbUrl,
        photoThumbUrls: newMemory.photoThumbUrls,
        caption: newMemory.caption,
        taggedFriends: newMemory.taggedFriends,
        date: newMemory.date,
        sharedWithPartner: true,
        circleIds: newMemory.circleIds,
        geo: newMemory.geo,
      };
      ensurePartnerThread(state.user.uid, state.partnerLink.partnerUserId)
        .then(() => setDoc(sharedRef, payload, { merge: true }))
        .then(() => setDoc(doc(db, 'partnerThreads', threadId), { updatedAt: serverTimestamp() }, { merge: true }))
        .catch((err) => console.warn('Failed to share memory with partner.', err));
    }

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
  }, [onUpdateState, places, state.favorites, state.memories, state.visitedPlaces, isGuest, state.partnerLink, state.user?.uid]);

  const favoritePlaces = savedPlaces.map(mapSavedPlaceToPlace);

  const handleIncrementAiRequests = async () => {
    const current = state.entitlement?.ai_requests_this_month || 0;
    if (
      state.entitlement?.plan_tier === 'family' &&
      state.partnerLink?.status === 'accepted' &&
      state.partnerLink?.partnerUserId &&
      state.user?.uid &&
      db
    ) {
      const threadId = getPartnerThreadId(state.user.uid, state.partnerLink.partnerUserId);
      const resetDate = state.familyPool?.ai_requests_reset_date || state.entitlement?.ai_requests_reset_date || getNextResetDate();
      try {
        await setDoc(doc(db, 'partnerThreads', threadId), {
          entitlementPool: {
            plan_tier: 'family',
            ai_requests_this_month: increment(1),
            ai_requests_reset_date: resetDate,
          },
          updatedAt: serverTimestamp(),
        }, { merge: true });
        onUpdateState('familyPool', {
          ai_requests_this_month: (state.familyPool?.ai_requests_this_month || 0) + 1,
          ai_requests_reset_date: resetDate,
        });
      } catch (err) {
        console.warn('Failed to increment family AI pool.', err);
      }
      return;
    }

    onUpdateState('entitlement', {
      ...state.entitlement,
      ai_requests_this_month: current + 1
    });
  };

  const handleCreateCircle = async (name: string) => {
    const currentUser = state.user || (auth?.currentUser ? {
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
    } : null);
    if (!currentUser) {
      window.alert('Please sign in to create a circle.');
      return;
    }
    try {
      await createCircle(name, currentUser);
    } catch (err) {
      console.error('Failed to create circle.', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      window.alert(`Failed to create circle: ${message}`);
    }
  };

  const handleJoinCircle = async (code: string) => {
    const currentUser = state.user || (auth?.currentUser ? {
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
    } : null);
    if (!currentUser) {
      window.alert('Please sign in to join a circle.');
      return;
    }
    try {
      await joinCircleByCode(code, currentUser);
    } catch (err) {
      console.error('Failed to join circle.', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      window.alert(`Failed to join circle: ${message}`);
    }
  };

  const handleDeleteCircle = async (circleId: string) => {
    const currentUser = state.user || (auth?.currentUser ? {
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
    } : null);
    if (!currentUser) {
      window.alert('Please sign in to delete a circle.');
      return;
    }
    try {
      await deleteCircle(circleId, currentUser.uid);
    } catch (err) {
      console.error('Failed to delete circle.', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      window.alert(`Failed to delete circle: ${message}`);
    }
  };

  const handleCreatePartnerCircle = async () => {
    if (!newPartnerCircleName.trim()) return;
    if (!state.user || !partnerUserId) {
      window.alert('Please link with a partner first.');
      return;
    }
    setCreatingPartnerCircle(true);
    try {
      await createPartnerCircle(
        newPartnerCircleName.trim(),
        { uid: state.user.uid, displayName: state.user.displayName, email: state.user.email },
        { uid: partnerUserId, displayName: partnerName || null, email: partnerEmail || null }
      );
      setNewPartnerCircleName('');
    } catch (err) {
      console.error('Failed to create partner circle.', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      window.alert(`Failed to create partner circle: ${message}`);
    } finally {
      setCreatingPartnerCircle(false);
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

  const showCircleDetail = !!selectedCircle;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32 container-safe">
      {!showCircleDetail && (
        <Header 
          setView={setView} 
          user={state.user} 
          locationName={locationName} 
          onSearch={handleSearch}
          onLocationChange={handleLocationChange}
        />
      )}
      
      {selectedCircle ? (
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
      ) : (
        <div className="px-4 py-4">
        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1 scroll-pl-4" style={{ scrollPaddingLeft: '1rem', scrollPaddingRight: '1rem' }}>
          <TabButton label="Explore" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <TabButton label="Saved" count={state.favorites.length} active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} />
          <TabButton label="Adventures" count={(state.visitedPlaces || []).length} active={activeTab === 'adventures'} onClick={() => setActiveTab('adventures')} />
          <TabButton label="Memories" count={state.memories.length} active={activeTab === 'memories'} onClick={() => setActiveTab('memories')} />
          <TabButton label="Partner" active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} />
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

            {/* Who's Coming Filter */}
            <div className="bg-white rounded-3xl p-4 mt-4 border border-slate-100 shadow-sm">
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 block">Who's Coming?</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setPrefFilterMode('all')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    prefFilterMode === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Everyone
                </button>
                <button
                  onClick={() => setPrefFilterMode('family')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    prefFilterMode === 'family'
                      ? 'bg-sky-500 text-white'
                      : 'bg-sky-50 text-sky-600 hover:bg-sky-100'
                  }`}
                >
                  👨‍👩‍👧‍👦 Family
                </button>
                {hasLinkedPartner && (
                  <button
                    onClick={() => setPrefFilterMode('partner')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                      prefFilterMode === 'partner'
                        ? 'bg-rose-500 text-white'
                        : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                    }`}
                  >
                    💑 Partner
                  </button>
                )}
                <button
                  onClick={() => setPrefFilterMode('solo')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    prefFilterMode === 'solo'
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  🧑 Just Me
                </button>
              </div>
              {prefFilterMode !== 'all' && (
                <div className="mt-3 text-xs text-slate-500">
                  {prefFilterMode === 'family' && (
                    <span>Considering preferences for you{hasLinkedPartner ? `, ${partnerLabel}` : ''}{state.children.length > 0 ? ` & ${state.children.length} kid${state.children.length > 1 ? 's' : ''}` : ''}</span>
                  )}
                  {prefFilterMode === 'partner' && (
                    <span>Considering preferences for you & {partnerLabel}</span>
                  )}
                  {prefFilterMode === 'solo' && (
                    <span>Just your preferences</span>
                  )}
                </div>
              )}
              
              {/* Preference chips - show combined allergies/accessibility */}
              {prefFilterMode !== 'all' && (combinedPreferences.allergies.length > 0 || combinedPreferences.accessibility.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {combinedPreferences.allergies.map(allergy => (
                    <span key={allergy} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                      <span>⚠️</span> {allergy}
                    </span>
                  ))}
                  {combinedPreferences.accessibility.map(access => (
                    <span key={access} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      <span>♿</span> {access}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Food preferences chips */}
              {prefFilterMode !== 'all' && combinedPreferences.foodPreferences.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {combinedPreferences.foodPreferences.map(pref => (
                    <span key={pref} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                      🥗 {pref}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {locationError && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4 text-amber-700 text-xs font-bold">
                {locationError}. Showing default location.
              </div>
            )}
            
            {/* Discovery Mode Toggle & Encouragement */}
            <div className="bg-gradient-to-r from-sky-50 to-purple-50 rounded-2xl p-4 mt-4 border border-sky-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧭</span>
                  <span className="font-bold text-slate-700 text-sm">Discovery Mode</span>
                </div>
                <button
                  onClick={() => setHideSavedPlaces(!hideSavedPlaces)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    hideSavedPlaces ? 'bg-sky-500' : 'bg-slate-200'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    hideSavedPlaces ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {hideSavedPlaces 
                  ? "Showing fresh finds only! Your saved spots are hidden so you can discover something new." 
                  : "Turn on to hide places you've already saved and find new adventures!"}
              </p>
            </div>

            {/* Fun encouragement messages */}
            {!loading && userLocation && (
              <div className="mt-4 text-center">
                <p className="text-sm text-slate-500 italic">
                  {prefFilterMode === 'family' && "🎉 Finding fun for the whole crew!"}
                  {prefFilterMode === 'partner' && "💕 Date ideas incoming..."}
                  {prefFilterMode === 'solo' && "🧘 Me-time discoveries await!"}
                  {prefFilterMode === 'all' && [
                    "✨ Every day is an adventure waiting to happen!",
                    "🌟 The best memories are made exploring together.",
                    "🎈 Ready for your next family adventure?",
                    "🗺️ New places, new memories, new stories!",
                  ][Math.floor(Date.now() / 60000) % 4]}
                </p>
              </div>
            )}

            {loading || !userLocation ? (
              <div className="py-24 text-center text-slate-300 font-black text-xs uppercase tracking-widest">
                {!userLocation ? 'Getting your location...' : 'Finding adventures...'}
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {places
                  .filter(place => !hideSavedPlaces || !state.favorites.includes(place.id))
                  .map(place => (
                  <PlaceCard 
                    key={place.id} 
                    place={place}
                    variant="list"
                    isFavorite={state.favorites.includes(place.id)}
                    onToggleFavorite={() => toggleFavorite(place)}
                    onClick={() => setSelectedPlace(place)}
                  />
                ))}
                {hideSavedPlaces && places.filter(p => !state.favorites.includes(p.id)).length === 0 && places.length > 0 && (
                  <div className="py-12 text-center bg-white rounded-2xl border border-slate-100">
                    <span className="text-4xl mb-3 block">🎊</span>
                    <p className="text-slate-600 font-semibold">You've saved them all!</p>
                    <p className="text-slate-400 text-sm mt-1">Try a different category or expand your search radius.</p>
                  </div>
                )}
                {placesNextPageToken && (
                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={handleLoadMorePlaces}
                      disabled={loadingMore}
                      className="px-6 py-3 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white shadow-lg shadow-slate-200 disabled:opacity-60"
                    >
                      {loadingMore ? 'Loading...' : 'Load more'}
                    </button>
                  </div>
                )}
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
                  onToggleFavorite={() => toggleFavorite(place)}
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
                {(state.visitedPlaces || []).map(visit => {
                  const handleOpenVisitedPlace = () => {
                    const existingPlace = savedPlaces.find(sp => sp.placeId === visit.placeId);
                    if (existingPlace) {
                      setSelectedPlace(mapSavedPlaceToPlace(existingPlace));
                    } else {
                      const fallbackImage = visit.imageUrl || 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=200&h=200&fit=crop';
                      const placeFromVisit: Place = {
                        id: visit.placeId,
                        name: visit.placeName,
                        type: visit.placeType || 'all',
                        tags: [visit.placeType || 'Family'],
                        rating: 0,
                        address: '',
                        description: '',
                        priceLevel: undefined,
                        distance: '',
                        ageAppropriate: '',
                        imageUrl: fallbackImage,
                        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${visit.placeId}`,
                      };
                      setSelectedPlace(placeFromVisit);
                    }
                  };
                  return (
                    <div key={visit.placeId} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <button
                        onClick={handleOpenVisitedPlace}
                        className="w-full flex gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
                      >
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
                        <div className="shrink-0 text-slate-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    </div>
                  );
                })}
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
            circles={regularCircles}
            onCreateCircle={handleCreateCircle}
            onJoinCircle={handleJoinCircle}
            onSelectCircle={setSelectedCircle}
            isGuest={isGuest}
            onDeleteCircle={handleDeleteCircle}
            userId={state.user?.uid}
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

              <div className="space-y-4">
                {state.memories.map(memory => {
                  const photos = memory.photoThumbUrls || memory.photoUrls || (memory.photoThumbUrl ? [memory.photoThumbUrl] : (memory.photoUrl ? [memory.photoUrl] : []));
                  const memoryDate = memory.date ? new Date(memory.date) : null;
                  const timeAgo = memoryDate && !isNaN(memoryDate.getTime()) ? getTimeAgo(memoryDate) : 'Recently';
                  
                  return (
                    <div key={memory.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      {/* Post Header */}
                      <div className="flex items-center gap-3 p-4 pb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-sky-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {state.user?.displayName?.charAt(0)?.toUpperCase() || '👤'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">
                            {state.user?.displayName || 'You'}
                          </p>
                          <p className="text-xs text-slate-400">{timeAgo}</p>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this memory?')) {
                              const updated = state.memories.filter(m => m.id !== memory.id);
                              onUpdateState('memories', updated);
                            }
                          }}
                          className="text-slate-300 hover:text-slate-500 p-1"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Caption */}
                      <div className="px-4 pb-3">
                        <p className="text-slate-800 text-sm leading-relaxed">{memory.caption}</p>
                      </div>
                      
                      {/* Photos */}
                      {photos.length > 0 && (
                        <div className={`${photos.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'}`}>
                          {photos.slice(0, 4).map((photo, idx) => (
                            <div key={idx} className={`relative ${photos.length === 1 ? 'aspect-video' : 'aspect-square'} bg-slate-100`}>
                              <img src={photo} className="w-full h-full object-cover" alt="" />
                              {idx === 3 && photos.length > 4 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">+{photos.length - 4}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Location Tag */}
                      {memory.placeName && (
                        <div className="px-4 py-3 flex items-center gap-2 border-t border-slate-100">
                          <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                          </svg>
                          <span className="text-xs font-medium text-slate-600">{memory.placeName}</span>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex border-t border-slate-100">
                        <button
                          onClick={() => setShareMemory(memory)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          <span className="text-sm font-medium">Share to Circle</span>
                        </button>
                        <div className="w-px bg-slate-100"></div>
                        <button
                          onClick={() => handleShareMemoryExternal(memory)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span className="text-sm font-medium">Share</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {activeTab === 'partner' && (
          <div className="space-y-6">
            {hasLinkedPartner ? (
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
            ) : (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-6 border border-rose-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white text-2xl flex items-center justify-center shadow-sm">💑</div>
                    <div>
                      <h3 className="font-black text-lg text-slate-800">Partner Space</h3>
                      <p className="text-xs text-slate-500">Share favorites, memories, and quick notes together.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border border-slate-100 space-y-3">
                  {isPartnerPending ? (
                    <>
                      <p className="text-sm font-semibold text-slate-700">Invite sent</p>
                      <p className="text-xs text-slate-500">Your partner hasn’t accepted yet. You can view or resend your invite code in Profile.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-700">Link your partner</p>
                      <p className="text-xs text-slate-500">Connect accounts to share places, notes, and partner circles.</p>
                    </>
                  )}

                  {isGuest ? (
                    <button
                      onClick={() => setView('login')}
                      className="w-full px-4 py-3 bg-rose-500 text-white rounded-2xl text-sm font-bold"
                    >
                      Sign in to link partner
                    </button>
                  ) : !canLinkPartner ? (
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                      <p className="text-xs font-semibold text-amber-700">Partner linking is a Pro feature.</p>
                      <button
                        onClick={() => setShowPlanBilling(true)}
                        className="mt-3 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold"
                      >
                        Upgrade to Pro
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setView('profile')}
                      className="w-full px-4 py-3 bg-rose-500 text-white rounded-2xl text-sm font-bold"
                    >
                      Link partner
                    </button>
                  )}
                </div>
              </div>
            )}

            {hasLinkedPartner && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Shared Favorites</h4>
                    {!isPaid && state.partnerSharedPlaces.length > 3 && (
                      <span className="text-[9px] font-bold text-amber-500">Free: 3 of {state.partnerSharedPlaces.length}</span>
                    )}
                  </div>
                  {state.partnerSharedPlaces.length > 0 ? (
                    <div className="space-y-3">
                      {state.partnerSharedPlaces.slice(0, isPaid ? undefined : 3).map((shared) => {
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
                    {!isPaid && partnerSharedMemories.length > 3 && (
                      <span className="text-[9px] font-bold text-amber-500">Free: 3 of {partnerSharedMemories.length}</span>
                    )}
                  </div>
                  {partnerSharedMemories.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {partnerSharedMemories.slice(0, isPaid ? undefined : 3).map((memory) => {
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
            
                {!isPaid && (state.favorites.length > 3 || state.memories.length > 3) && (
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
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Partner Circles</h4>
                  <p className="text-xs text-slate-500 -mt-2">Create themed collections to share with your partner</p>
                  
                  {partnerCircles.length > 0 ? (
                    <div className="space-y-3">
                      {partnerCircles.map((circle) => (
                        <button
                          key={circle.id}
                          onClick={() => setSelectedCircle(circle)}
                          className="w-full text-left bg-white rounded-2xl p-4 border border-slate-100 flex items-center justify-between hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-lg">💑</div>
                            <div>
                              <p className="font-bold text-sm text-slate-800">{circle.name}</p>
                              <p className="text-xs text-slate-500">Shared with {partnerLabel}</p>
                            </div>
                          </div>
                          <span className="text-slate-300">›</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-2xl p-6 text-center">
                      <p className="text-sm text-slate-500">No partner circles yet</p>
                      <p className="text-xs text-slate-400 mt-1">Create one below to start collecting places together</p>
                    </div>
                  )}
                  
                  <div className="bg-white rounded-2xl p-4 border border-slate-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g., Date Night, Weekend Getaways..."
                        value={newPartnerCircleName}
                        onChange={(e) => setNewPartnerCircleName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreatePartnerCircle()}
                        className="flex-1 text-sm outline-none text-slate-700 placeholder-slate-300"
                      />
                      <button
                        onClick={handleCreatePartnerCircle}
                        disabled={creatingPartnerCircle || !newPartnerCircleName.trim()}
                        className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold disabled:opacity-60"
                      >
                        {creatingPartnerCircle ? '...' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>

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
              </>
            )}
          </div>
        )}
      </div>

      {selectedPlace && (
        <VenueProfile 
          place={selectedPlace} 
          isFavorite={state.favorites.includes(selectedPlace.id)}
          isVisited={(state.visitedPlaces || []).some(v => v.placeId === selectedPlace.id)}
          memories={state.memories}
          memoryCount={state.memories.length}
          onToggleFavorite={() => toggleFavorite(selectedPlace)}
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
          familyPool={state.familyPool}
          onIncrementAiRequests={handleIncrementAiRequests}
          circles={circles}
          partnerLink={state.partnerLink}
          userName={state.user?.displayName || 'You'}
          userId={state.user?.uid || ''}
          tripContext={prefFilterMode !== 'all' ? combinedPreferences : undefined}
          onTagMemoryToCircle={handleTagMemoryToCircle}
          onAddToCircle={(circleId, groupPlace) => {
            if (circleId === 'partner') {
              const currentPartnerPlaces = state.partnerSharedPlaces || [];
              if (currentPartnerPlaces.some(p => p.placeId === groupPlace.placeId)) {
                alert('This place is already in Partner Plans!');
                return;
              }
              handleAddPartnerPlace(groupPlace);
            } else {
              const note = window.prompt('Add a note for this place (optional)') || '';
              const circle = circles.find(c => c.id === circleId);
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
              }).then(() => {
                alert(`Added to ${circle?.name || 'circle'}!`);
              }).catch(err => {
                console.error('Failed to save circle place:', err);
                alert('Failed to add to circle. Please try again.');
              });
            }
          }}
          onAddMemory={handleAddMemory}
        />
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/60 px-4 py-3 safe-area-inset-bottom z-50">
        <div className="flex justify-around max-w-md mx-auto">
          <NavButton icon="🏠" label="Home" active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} />
          <NavButton icon="💙" label="Saved" active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} />
          <NavButton icon="👥" label="Circles" active={activeTab === 'circles'} onClick={() => setActiveTab('circles')} />
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
