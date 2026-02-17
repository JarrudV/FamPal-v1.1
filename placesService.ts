import { Place, ActivityType, ExploreIntent, AccessibilityFeature, FamilyFacility } from "./types";
import { getExploreIntentDefinition, type ExploreIntentDefinition } from './server/exploreIntentConfig';
import type { ExploreFilters } from './lib/exploreFilters';
import {
  upsertPlaceFromGoogle,
  getPlacesByGeoBoundsAndCategory,
  computeFacetsFromGoogleSource,
  type PlaceSourceGoogle,
  type PlaceRecord,
} from './src/services/placeStore';

const PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || "";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const resolveApiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);
const CLIENT_PLACES_KEY = PLACES_API_KEY || '';
const DENY_TYPES_ENV = import.meta.env.VITE_PLACES_DENY_TYPES || '';
const DENY_BRANDS_ENV = import.meta.env.VITE_PLACES_DENY_BRANDS || '';
const DENY_TYPES_STORAGE_KEY = 'fampals_places_deny_types';
const DENY_BRANDS_STORAGE_KEY = 'fampals_places_deny_brands';
const DEFAULT_DENY_TYPES = [
  'gas_station',
  'convenience_store',
  'car_wash',
  'car_dealer',
  'car_rental',
  'car_repair',
  'truck_stop',
  'atm',
  'bank',
  'insurance_agency',
  'real_estate_agency',
  'lawyer',
  'accounting',
  'dentist',
  'doctor',
  'hospital',
  'pharmacy',
  'veterinary_care',
  'funeral_home',
  'cemetery',
  'storage',
  'moving_company',
  'locksmith',
  'electrician',
  'plumber',
  'roofing_contractor',
  'general_contractor',
  'lodging',
  'school',
  'university',
  'shopping_mall',
];

const DEFAULT_DENY_BRANDS = [
  'kfc',
  'mcdonalds',
  "mcdonald's",
  'burger king',
  'hungry lion',
  'steers',
  'nandos',
  "nando's",
  'debonairs',
  'roman\'s pizza',
  'domino\'s',
  'pizza hut',
  'subway',
  'fishaways',
  'chicken licken',
  'wimpy',
  'engen',
  'shell garage',
  'shell service station',
  'shell ultra city',
  'caltex',
  'sasol',
  'bp garage',
  'bp express',
  'total energies',
  'totalenergies',
  'shoprite',
  'checkers',
  'pick n pay',
  'spar',
  'woolworths food',
  'clicks',
  'dis-chem',
  'pep store',
  'pep cell',
  'ackermans',
  'cashbuild',
  'builders warehouse',
];

if (!PLACES_API_KEY) {
  console.error('[FamPals] CRITICAL: Google Places API key is missing! Places will not load.');
}

const PLACES_CACHE_KEY = 'fampals_google_places_cache';
const DETAILS_CACHE_KEY = 'fampals_place_details_cache';
const INTENT_CACHE_KEY = 'fampals_intent_places_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const INTENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SHOULD_LOG_INTENT = import.meta.env.DEV;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface PlacesCacheData {
  [key: string]: CacheEntry<Place[]>;
}

interface DetailsCacheData {
  [key: string]: CacheEntry<PlaceDetails>;
}

export interface PlacesSearchResponse {
  places: Place[];
  nextPageToken: string | null;
  hasMore: boolean;
  error?: string;
}

export interface IntentQueryDebugCount {
  pagesFetched: number;
  fetchedResults: number;
  uniqueAdded: number;
}

export interface IntentSearchDebug {
  intent: ExploreIntent;
  subtitle: string;
  queriesRun: string[];
  perQueryCounts: Record<string, IntentQueryDebugCount>;
  totalBeforeFilter: number;
  totalAfterFilter: number;
  pipeline?: {
    cacheCount: number;
    afterFilterCount: number;
    googleFetchedCount: number;
    ingestedCount: number;
    mergedCount: number;
    cacheLow: boolean;
    googleLow: boolean;
    hardFiltersApplied: boolean;
    hardFilteredOut: boolean;
  };
}

export interface IntentSearchResponse {
  places: Place[];
  debug: IntentSearchDebug;
}

export interface IntentProgressUpdate {
  places: Place[];
  debug: IntentSearchDebug;
  query: string;
  page: number;
  isBackgroundLoading: boolean;
  fromCache?: boolean;
}

interface IntentCachePayload {
  places: Place[];
  debug: IntentSearchDebug;
}

function intentLog(...args: unknown[]) {
  if (!SHOULD_LOG_INTENT) return;
  console.log(...args);
}

export interface PlaceDetails {
  id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  userRatingsTotal?: number;
  openingHours?: string[];
  isOpen?: boolean;
  photos: string[];
  reviews?: PlaceReview[];
  priceLevel?: string;
  types?: string[];
  lat: number;
  lng: number;
  mapsUrl: string;
  accessibilityOptions?: Record<string, unknown>;
  googleHints?: { feature: AccessibilityFeature; source: 'google_places' }[];
  goodForChildren?: boolean;
  menuForChildren?: boolean;
  restroom?: boolean;
  parkingOptions?: Record<string, unknown>;
  familyHints?: { feature: FamilyFacility; source: 'google_places' }[];
  editorialSummary?: string;
  reviewSummary?: string;
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  profilePhotoUrl?: string;
}

const categoryToTextQuery: Record<ActivityType, string> = {
  all: 'family friendly activities things to do',
  restaurant: 'family friendly restaurants cafes',
  outdoor: 'parks nature reserves outdoor activities',
  indoor: 'indoor activities museums entertainment',
  active: 'sports activities playgrounds adventure parks',
  hike: 'hiking trails nature walks',
  wine: 'wine farm wine estate winery vineyard',
  golf: 'golf courses',
  kids: 'child friendly activities playgrounds kids entertainment',
};

const categoryToPlaceTypes: Record<ActivityType, string[]> = {
  all: [
    'tourist_attraction',
    'park',
    'playground',
    'restaurant',
    'cafe',
    'amusement_park',
    'zoo',
    'aquarium',
    'museum',
    'bowling_alley',
    'movie_theater',
    'library'
  ],
  restaurant: ['restaurant', 'cafe', 'bakery', 'ice_cream_shop', 'meal_takeaway', 'meal_delivery'],
  outdoor: ['park', 'national_park', 'campground', 'state_park'],
  indoor: ['museum', 'aquarium', 'bowling_alley', 'movie_theater', 'library'],
  active: ['gym', 'sports_complex', 'swimming_pool', 'playground', 'amusement_park'],
  hike: ['national_park', 'state_park', 'park'],
  wine: ['winery'],
  golf: ['golf_course'],
  kids: ['playground', 'amusement_park', 'zoo', 'aquarium', 'park', 'museum', 'library', 'bowling_alley'],
};

const placeholderImages: Record<string, string[]> = {
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop",
  ],
  outdoor: [
    "https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop",
  ],
  indoor: [
    "https://images.unsplash.com/photo-1519751138087-5bf79df62d5b?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=600&h=400&fit=crop",
  ],
  active: [
    "https://images.unsplash.com/photo-1564429238981-03da5e2d1a85?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&h=400&fit=crop",
  ],
  hike: [
    "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&h=400&fit=crop",
  ],
  wine: [
    "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1543418219-44e30b057fea?w=600&h=400&fit=crop",
  ],
  golf: [
    "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=600&h=400&fit=crop",
  ],
  kids: [
    "https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1527689638836-411945a2b57c?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=600&h=400&fit=crop",
  ],
  all: [
    "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1476234251651-f353703a034d?w=600&h=400&fit=crop",
  ],
};

function getPlaceholderImage(type: string, name: string, index: number): string {
  const typeImages = placeholderImages[type] || placeholderImages.all;
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return typeImages[(hash + index) % typeImages.length];
}

function getCache<T>(key: string): { [k: string]: CacheEntry<T> } {
  try {
    const cached = localStorage.getItem(key);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache<T>(storageKey: string, cacheKey: string, data: T) {
  try {
    const cache = getCache<T>(storageKey);
    cache[cacheKey] = { data, timestamp: Date.now() };
    const keys = Object.keys(cache);
    if (keys.length > 20) {
      const oldest = keys.sort((a, b) => 
        (cache[a] as CacheEntry<T>).timestamp - (cache[b] as CacheEntry<T>).timestamp
      )[0];
      delete cache[oldest];
    }
    localStorage.setItem(storageKey, JSON.stringify(cache));
  } catch {
    // Silently fail if localStorage is full
  }
}

function getCached<T>(storageKey: string, cacheKey: string): T | null {
  const cache = getCache<T>(storageKey);
  const entry = cache[cacheKey];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function getIntentCached(cacheKey: string): IntentCachePayload | null {
  const cache = getCache<IntentCachePayload>(INTENT_CACHE_KEY);
  const entry = cache[cacheKey];
  if (entry && Date.now() - entry.timestamp < INTENT_CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setIntentCached(cacheKey: string, payload: IntentCachePayload) {
  setCache(INTENT_CACHE_KEY, cacheKey, payload);
}

function mapGoogleTypeToCategory(types: string[]): ActivityType {
  if (types.some(t => ['restaurant', 'cafe', 'bakery', 'food', 'meal_takeaway'].includes(t))) return 'restaurant';
  if (types.some(t => ['park', 'campground', 'state_park'].includes(t))) return 'outdoor';
  if (types.some(t => ['museum', 'aquarium', 'bowling_alley', 'movie_theater', 'library'].includes(t))) return 'indoor';
  if (types.some(t => ['gym', 'sports_complex', 'swimming_pool', 'playground'].includes(t))) return 'active';
  if (types.some(t => ['national_park', 'state_park'].includes(t))) return 'hike';
  if (types.some(t => ['winery'].includes(t))) return 'wine';
  if (types.some(t => ['golf_course'].includes(t))) return 'golf';
  if (types.some(t => ['playground', 'amusement_park', 'zoo', 'aquarium'].includes(t))) return 'kids';
  return 'all';
}

function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const d = calculateDistanceKm(lat1, lng1, lat2, lng2);
  return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
}

function priceLevelToString(level?: number | string): "$" | "$$" | "$$$" | "$$$$" {
  if (typeof level === 'string') {
    switch(level) {
      case 'PRICE_LEVEL_FREE': return '$';
      case 'PRICE_LEVEL_INEXPENSIVE': return '$';
      case 'PRICE_LEVEL_MODERATE': return '$$';
      case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
      case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
      default:
        if (level.startsWith('$')) return level as "$" | "$$" | "$$$" | "$$$$";
        return '$$';
    }
  }
  switch(level) {
    case 0: return "$";
    case 1: return "$";
    case 2: return "$$";
    case 3: return "$$$";
    case 4: return "$$$$";
    default: return "$$";
  }
}

function parseCsvList(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeType(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '_');
}

function getRuntimeList(storageKey: string): string[] {
  try {
    const value = localStorage.getItem(storageKey);
    return parseCsvList(value);
  } catch {
    return [];
  }
}

function getDenyTypes(): Set<string> {
  const runtime = getRuntimeList(DENY_TYPES_STORAGE_KEY).map(normalizeType);
  const envTypes = parseCsvList(DENY_TYPES_ENV).map(normalizeType);
  const combined = [...DEFAULT_DENY_TYPES, ...envTypes, ...runtime].map(normalizeType);
  return new Set(combined.filter(Boolean));
}

function getDenyBrands(): string[] {
  const runtime = getRuntimeList(DENY_BRANDS_STORAGE_KEY);
  const envBrands = parseCsvList(DENY_BRANDS_ENV);
  return [...DEFAULT_DENY_BRANDS, ...envBrands, ...runtime].map((entry) => entry.toLowerCase()).filter(Boolean);
}

function shouldExcludePlace(types: string[] | undefined, name: string | undefined): boolean {
  const denyTypes = getDenyTypes();
  const denyBrands = getDenyBrands();
  const normalizedTypes = (types || []).map(normalizeType);
  if (normalizedTypes.some((type) => denyTypes.has(type))) {
    return true;
  }
  if (denyBrands.length > 0 && name) {
    const lowerName = name.toLowerCase();
    return denyBrands.some((brand) => lowerName.includes(brand));
  }
  return false;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    await sleep(ms);
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort);
  });
}

function createRequestLimiter(limit: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (active >= limit || queue.length === 0) return;
    active += 1;
    const run = queue.shift();
    run?.();
  };

  return async function runWithLimit<T>(task: () => Promise<T>): Promise<T> {
    await new Promise<void>((resolve) => {
      queue.push(resolve);
      next();
    });
    try {
      return await task();
    } finally {
      active = Math.max(0, active - 1);
      next();
    }
  };
}

export function dedupePlacesById(places: Place[]): Place[] {
  const seen = new Set<string>();
  const unique: Place[] = [];
  for (const place of places) {
    if (!place?.id || seen.has(place.id)) continue;
    seen.add(place.id);
    unique.push(place);
  }
  return unique;
}

const GENERIC_PLACE_TYPES = new Set(['point_of_interest', 'establishment', 'premise', 'food']);

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '_').trim();
}

function placeTypeTokens(place: Place): string[] {
  return (place.tags || []).map(normalizeToken);
}

function textContainsAny(text: string, keywords: string[]): boolean {
  const haystack = text.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function shouldKeepByIntent(place: Place, definition: ExploreIntentDefinition): boolean {
  const types = placeTypeTokens(place);
  const typeSet = new Set(types);
  const rawText = `${place.name || ''} ${place.description || ''} ${place.address || ''} ${(place.tags || []).join(' ')}`.toLowerCase();
  const includeTypes = definition.includeTypes.map(normalizeToken);
  const excludeTypes = definition.excludeTypes.map(normalizeToken);
  const hasGenericOnly = types.length === 0 || types.every((type) => GENERIC_PLACE_TYPES.has(type));
  const hasIncludeType = includeTypes.length > 0 && includeTypes.some((type) => typeSet.has(type));
  const hasKeywordInclude = definition.keywordInclude.length > 0 && textContainsAny(rawText, definition.keywordInclude);
  const hasKeywordExclude = definition.keywordExclude.length > 0 && textContainsAny(rawText, definition.keywordExclude);

  if (hasKeywordExclude) return false;

  const matchedExcludeType = excludeTypes.find((type) => typeSet.has(type));
  if (matchedExcludeType) {
    const farmStallOverride = matchedExcludeType === 'farm' && textContainsAny(rawText, ['farm stall', 'farm shop']);
    const wineryWithFoodOverride =
      (matchedExcludeType === 'winery' || matchedExcludeType === 'vineyard') &&
      (typeSet.has('restaurant') || typeSet.has('cafe') || typeSet.has('meal_takeaway')) &&
      textContainsAny(rawText, ['restaurant', 'cafe', 'bistro', 'grill', 'kitchen', 'eatery', 'menu', 'lunch', 'dinner', 'breakfast']);
    const venueWithConcessionOverride =
      (matchedExcludeType === 'cafe' || matchedExcludeType === 'restaurant') &&
      (typeSet.has('park') || typeSet.has('tourist_attraction') || typeSet.has('gym') || typeSet.has('sports_complex') || typeSet.has('swimming_pool') || typeSet.has('playground'));
    if (!farmStallOverride && !wineryWithFoodOverride && !venueWithConcessionOverride) {
      return false;
    }
  }

  if (includeTypes.length === 0) {
    return !hasKeywordExclude;
  }

  if (hasIncludeType || hasKeywordInclude) {
    return true;
  }

  // Fallback: when types are generic/missing, keyword include is optional.
  if (hasGenericOnly && definition.keywordInclude.length === 0) {
    return true;
  }

  return false;
}

function filterPlacesForIntent(places: Place[], definition: ExploreIntentDefinition): Place[] {
  return places.filter((place) => shouldKeepByIntent(place, definition));
}

function uniqueQueries(queries: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const query of queries) {
    const normalized = query.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(query.trim());
  }
  return output;
}

function normalizeQueryForCache(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

type FacetSnapshot = {
  categories: string[];
  venueTypes: string[];
  foodTypes: string[];
  kidFriendlySignals: string[];
  accessibilitySignals: string[];
  indoorOutdoorSignals: string[];
  reportConfidence: Record<string, number>;
};

const PIPELINE_MIN_RESULTS = 18;
const PIPELINE_TARGET_RESULTS = 30;
const PIPELINE_MAX_GOOGLE_PAGES = 3;
const PIPELINE_LOGS_ENABLED = import.meta.env.DEV || import.meta.env.VITE_SEARCH_PIPELINE_DEBUG === 'true';

function normalizeFacetToken(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '_');
}

function mapIntentToCategory(intent: ExploreIntent): ActivityType {
  switch (intent) {
    case 'eat_drink':
      return 'restaurant';
    case 'play_kids':
      return 'kids';
    case 'outdoors':
      return 'outdoor';
    case 'things_to_do':
      return 'all';
    case 'sport_active':
      return 'active';
    case 'indoor':
      return 'indoor';
    case 'all':
    default:
      return 'all';
  }
}

function getGeoBounds(lat: number, lng: number, radiusKm: number): { north: number; south: number; east: number; west: number } {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.15));
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta,
  };
}

function placeRecordToPlace(record: PlaceRecord, lat: number, lng: number, fallbackType: ActivityType): Place {
  const categoryCandidates = record.facets?.categories || [];
  const derivedType = mapGoogleTypeToCategory(record.types || []);
  const effectiveType = categoryCandidates[0] as ActivityType | undefined;
  const placeType = (effectiveType && effectiveType !== 'all')
    ? effectiveType
    : (derivedType === 'all' && fallbackType !== 'all' ? fallbackType : derivedType);
  return {
    id: record.placeId,
    name: record.name,
    description: record.primaryType || 'Family-friendly venue',
    address: record.address || '',
    rating: record.rating || 4.0,
    tags: (record.types || []).slice(0, 8).map((t) => t.replace(/_/g, ' ')),
    mapsUrl: record.mapsUrl || `https://www.google.com/maps/place/?q=place_id:${record.googlePlaceId}`,
    type: placeType,
    priceLevel: (record.priceLevel as '$' | '$$' | '$$$' | '$$$$') || '$$',
    imageUrl: record.imageUrl || undefined,
    distance: calculateDistance(lat, lng, record.geo.lat, record.geo.lng),
    ageAppropriate: 'All ages',
    googlePlaceId: record.googlePlaceId,
    userRatingsTotal: record.userRatingsTotal || undefined,
    lat: record.geo.lat,
    lng: record.geo.lng,
    facetSnapshot: facetSnapshotFromRecord(record),
  };
}

function facetSnapshotFromRecord(record: PlaceRecord): FacetSnapshot {
  const facets = record.facets || ({} as FacetSnapshot);
  const reportConfidence: Record<string, number> = {};
  const kidPrefsTrust = record.reportTrust?.kidPrefs || {};
  const accessibilityTrust = record.reportTrust?.accessibility || {};
  Object.entries(kidPrefsTrust).forEach(([key, value]) => {
    const confidence = Number((value as any)?.confidence || 0);
    if (confidence > 0) reportConfidence[normalizeFacetToken(key)] = confidence;
  });
  Object.entries(accessibilityTrust).forEach(([key, value]) => {
    const confidence = Number((value as any)?.confidence || 0);
    if (confidence > 0) reportConfidence[normalizeFacetToken(key)] = confidence;
  });
  return {
    categories: (facets.categories || []).map(normalizeFacetToken),
    venueTypes: (facets.venueTypes || []).map(normalizeFacetToken),
    foodTypes: (facets.foodTypes || []).map(normalizeFacetToken),
    kidFriendlySignals: (facets.kidFriendlySignals || []).map(normalizeFacetToken),
    accessibilitySignals: (facets.accessibilitySignals || []).map(normalizeFacetToken),
    indoorOutdoorSignals: (facets.indoorOutdoorSignals || []).map(normalizeFacetToken),
    reportConfidence,
  };
}

function facetSnapshotFromPlace(place: Place, requestedCategory: ActivityType): FacetSnapshot {
  const cachedSnapshot = (place as any).facetSnapshot as FacetSnapshot | undefined;
  if (cachedSnapshot) {
    return {
      categories: (cachedSnapshot.categories || []).map(normalizeFacetToken),
      venueTypes: (cachedSnapshot.venueTypes || []).map(normalizeFacetToken),
      foodTypes: (cachedSnapshot.foodTypes || []).map(normalizeFacetToken),
      kidFriendlySignals: (cachedSnapshot.kidFriendlySignals || []).map(normalizeFacetToken),
      accessibilitySignals: (cachedSnapshot.accessibilitySignals || []).map(normalizeFacetToken),
      indoorOutdoorSignals: (cachedSnapshot.indoorOutdoorSignals || []).map(normalizeFacetToken),
      reportConfidence: ((cachedSnapshot as any).reportConfidence || {}) as Record<string, number>,
    };
  }
  const source: PlaceSourceGoogle = {
    googlePlaceId: (place as any).googlePlaceId || place.id,
    name: place.name,
    address: place.address,
    lat: (place as any).lat || 0,
    lng: (place as any).lng || 0,
    types: (place.tags || []).map((tag) => normalizeFacetToken(tag)),
    primaryType: place.type,
    primaryTypeDisplayName: place.description,
    rating: place.rating,
    userRatingsTotal: (place as any).userRatingsTotal,
    priceLevel: place.priceLevel,
    mapsUrl: place.mapsUrl,
    photoUrl: place.imageUrl,
  };
  const computed = computeFacetsFromGoogleSource(source, requestedCategory);
  return {
    categories: computed.categories.map(normalizeFacetToken),
    venueTypes: computed.venueTypes.map(normalizeFacetToken),
    foodTypes: computed.foodTypes.map(normalizeFacetToken),
    kidFriendlySignals: computed.kidFriendlySignals.map(normalizeFacetToken),
    accessibilitySignals: computed.accessibilitySignals.map(normalizeFacetToken),
    indoorOutdoorSignals: computed.indoorOutdoorSignals.map(normalizeFacetToken),
    reportConfidence: {},
  };
}

function inferKidSignalsFromDetails(details: PlaceDetails): { tokens: string[]; confidence: Record<string, number> } {
  const name = details.name || '';
  const address = details.address || '';
  const reviews = Array.isArray(details.reviews)
    ? details.reviews.map((review) => review?.text || '').join(' ')
    : '';
  const blob = `${name} ${address} ${reviews}`.toLowerCase();

  const positivePhrases = [
    'jungle gym',
    'playground',
    'play area',
    'kids play',
    'soft play',
    'play zone',
    'kids corner',
    'climbing frame',
    'jumping castle',
    'playpark',
  ];
  const negativePhrases = [
    'no play area',
    'no playground',
    'nothing for kids',
    'not kid friendly',
    'no kids play',
  ];

  let score = 0;
  let positiveHits = 0;
  positivePhrases.forEach((phrase) => {
    if (blob.includes(phrase)) {
      positiveHits += 1;
    }
  });
  score += Math.min(6, positiveHits * 2);
  if (negativePhrases.some((phrase) => blob.includes(phrase))) {
    score -= 3;
  }

  const tokens = new Set<string>();
  const confidence: Record<string, number> = {};

  if (details.goodForChildren) {
    tokens.add('child_friendly_space');
    confidence.child_friendly_space = Math.max(confidence.child_friendly_space || 0, 0.7);
  }
  if (details.menuForChildren) {
    tokens.add('kids_menu');
    confidence.kids_menu = Math.max(confidence.kids_menu || 0, 0.75);
  }
  if (score >= 2) {
    tokens.add('play_area_jungle_gym');
    confidence.play_area_jungle_gym = score >= 4 ? 0.9 : 0.75;
  }

  return {
    tokens: Array.from(tokens),
    confidence,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];
  const normalizedLimit = Math.max(1, Math.min(limit, items.length));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (true) {
      const index = nextIndex;
      if (index >= items.length) return;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: normalizedLimit }, () => runWorker()));
  return results;
}

async function enrichPlacesForStrictKidPrefs(
  candidates: Place[],
  selectedKidPrefs: string[],
  requestedCategory: ActivityType
): Promise<Place[]> {
  const normalizedPrefs = (selectedKidPrefs || []).map(normalizeFacetToken);
  if (!normalizedPrefs.includes('play_area_jungle_gym')) {
    return candidates;
  }

  const batch = candidates.slice(0, 25);
  let upgradedCount = 0;
  await mapWithConcurrency(batch, 3, async (place) => {
    const existingSnapshot = (place as any).facetSnapshot as FacetSnapshot | undefined;
    if (existingSnapshot?.kidFriendlySignals?.map(normalizeFacetToken).includes('play_area_jungle_gym')) {
      return place;
    }

    const details = await getPlaceDetails(place.googlePlaceId || place.id);
    if (!details) return place;
    const inferred = inferKidSignalsFromDetails(details);
    if (!inferred.tokens.map(normalizeFacetToken).includes('play_area_jungle_gym')) return place;

    const snapshot = facetSnapshotFromPlace(place, requestedCategory);
    const kidFriendlySignals = new Set((snapshot.kidFriendlySignals || []).map(normalizeFacetToken));
    inferred.tokens.forEach((token) => kidFriendlySignals.add(normalizeFacetToken(token)));
    const reportConfidence: Record<string, number> = { ...(snapshot.reportConfidence || {}) };
    Object.entries(inferred.confidence).forEach(([token, value]) => {
      const normalizedToken = normalizeFacetToken(token);
      reportConfidence[normalizedToken] = Math.max(reportConfidence[normalizedToken] || 0, value);
    });
    (place as any).facetSnapshot = {
      ...snapshot,
      kidFriendlySignals: Array.from(kidFriendlySignals),
      reportConfidence,
    } as FacetSnapshot;
    upgradedCount += 1;
    return place;
  });
  intentLog(`[FamPals] strict kidPrefs enrichment complete: scanned=${batch.length}, upgraded=${upgradedCount}`);

  return candidates;
}

function facetMatchesLens(snapshot: FacetSnapshot, lensKey: keyof ExploreFilters, chipId: string): boolean {
  const token = normalizeFacetToken(chipId);
  const reportSupports = (snapshot.reportConfidence[token] || 0) >= 0.55;
  switch (lensKey) {
    case 'foodTypes':
      return snapshot.foodTypes.includes(token) || snapshot.venueTypes.includes(token) || reportSupports;
    case 'venueTypes':
      return snapshot.venueTypes.includes(token) || reportSupports;
    case 'kidPrefs':
      return snapshot.kidFriendlySignals.includes(token) || reportSupports;
    case 'accessibility':
      return snapshot.accessibilitySignals.includes(token) || reportSupports;
    case 'indoorOutdoor':
      return snapshot.indoorOutdoorSignals.includes(token);
    default:
      return false;
  }
}

function rankAndFilterByComputedFacets(
  candidates: Place[],
  requestedCategory: ActivityType,
  exploreFilters?: ExploreFilters
): { places: Place[]; hardFiltersApplied: boolean; hardFilteredOut: boolean; afterFilterCount: number } {
  if (!exploreFilters) {
    return { places: candidates, hardFiltersApplied: false, hardFilteredOut: false, afterFilterCount: candidates.length };
  }

  type FilterLensKey = 'foodTypes' | 'venueTypes' | 'kidPrefs' | 'accessibility' | 'indoorOutdoor';
  const lensKeys: FilterLensKey[] = ['foodTypes', 'venueTypes', 'kidPrefs', 'accessibility', 'indoorOutdoor'];
  const hasStrict = lensKeys.some((lensKey) => exploreFilters.strict[lensKey] && (exploreFilters[lensKey] as string[]).length > 0);
  const scored = candidates
    .map((place) => {
      const snapshot = facetSnapshotFromPlace(place, requestedCategory);
      let droppedByStrict = false;
      let score = 0;

      lensKeys.forEach((lensKey) => {
        const selected = (exploreFilters[lensKey] as string[]) || [];
        if (selected.length === 0) return;
        const matches = selected.filter((chipId) => facetMatchesLens(snapshot, lensKey, chipId)).length;
        const trustBoost = selected.reduce((sum, chipId) => sum + (snapshot.reportConfidence[normalizeFacetToken(chipId)] || 0), 0);
        if (exploreFilters.strict[lensKey] && matches === 0) {
          droppedByStrict = true;
        }
        if (matches > 0) {
          score += matches * 10;
          score += Math.round(trustBoost * 4);
        }
      });

      if (requestedCategory !== 'all' && !snapshot.categories.includes(normalizeFacetToken(requestedCategory))) {
        score -= 8;
      }

      return { place, score, droppedByStrict };
    })
    .filter((entry) => !entry.droppedByStrict)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.place.rating || 0) - (a.place.rating || 0);
    });

  const filtered = scored.map((entry) => entry.place);
  return {
    places: filtered,
    hardFiltersApplied: hasStrict,
    hardFilteredOut: hasStrict && candidates.length > 0 && filtered.length === 0,
    afterFilterCount: filtered.length,
  };
}

function buildBoosterQueriesFromFilters(filters?: ExploreFilters): string[] {
  if (!filters) return [];
  const mapping: Record<string, string[]> = {
    wine_farm: ['wine estate winery vineyard wine tasting'],
    kids_menu: ['kids menu family restaurant child friendly'],
    play_area_jungle_gym: ['play area jungle gym playground kids activities'],
    stroller_friendly: ['stroller friendly pram friendly'],
    wheelchair_friendly: ['wheelchair friendly step free accessible entrance'],
    accessible_toilets: ['accessible toilets family restroom'],
    indoor: ['indoor activities family'],
    outdoor: ['outdoor activities park trail family'],
    both: ['indoor and outdoor family activities'],
  };
  const chips = new Set<string>();
  (['foodTypes', 'venueTypes', 'kidPrefs', 'accessibility', 'indoorOutdoor'] as const).forEach((lensKey) => {
    (filters[lensKey] || []).forEach((chip) => chips.add(chip));
  });
  const queries: string[] = [];
  chips.forEach((chip) => {
    const options = mapping[normalizeFacetToken(chip)];
    if (options) queries.push(...options);
  });
  return uniqueQueries(queries);
}

export function getExploreIntentSubtitle(intent: ExploreIntent): string {
  const definition = getExploreIntentDefinition(intent);
  return definition.subtitle;
}

function mapLegacyPlaceToPlace(
  raw: any,
  index: number,
  lat: number,
  lng: number,
  fallbackType: ActivityType
): Place {
  const name = raw?.name || 'Unknown Place';
  const placeLat = raw?.geometry?.location?.lat ?? lat;
  const placeLng = raw?.geometry?.location?.lng ?? lng;
  const rawTypes = Array.isArray(raw?.types) ? raw.types : [];
  const mappedType = mapGoogleTypeToCategory(rawTypes);
  const placeType = mappedType === 'all' && fallbackType !== 'all' ? fallbackType : mappedType;
  const photoRef = raw?.photos?.[0]?.photo_reference;
  const imageUrl = photoRef && PLACES_API_KEY
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photoRef}&key=${PLACES_API_KEY}`
    : getPlaceholderImage(placeType, name, index);
  const placeId = raw?.place_id || raw?.id || `gp-${Date.now()}-${index}`;
  const sourceGoogle: PlaceSourceGoogle | null = placeId
    ? {
      googlePlaceId: placeId,
      name,
      address: raw?.vicinity || raw?.formatted_address || '',
      lat: placeLat,
      lng: placeLng,
      types: rawTypes,
      primaryType: rawTypes[0],
      rating: raw?.rating,
      userRatingsTotal: raw?.user_ratings_total,
      priceLevel: raw?.price_level,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      photoUrl: imageUrl,
      raw,
    }
    : null;
  if (sourceGoogle) {
    void upsertPlaceFromGoogle(sourceGoogle, {
      requestedCategory: fallbackType,
      ingestionSource: 'legacyPlacesApi',
    }).catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[FamPals] Legacy place cache upsert failed', err);
      }
    });
  }
  return {
    id: placeId,
    name,
    description: 'Family-friendly venue',
    address: raw?.vicinity || raw?.formatted_address || '',
    rating: raw?.rating || 4.0,
    tags: rawTypes.slice(0, 8).map((t: string) => t.replace(/_/g, ' ')),
    mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
    type: placeType,
    priceLevel: priceLevelToString(raw?.price_level),
    imageUrl,
    distance: calculateDistance(lat, lng, placeLat, placeLng),
    ageAppropriate: 'All ages',
  };
}

async function fetchLegacyPlaces(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  fallbackType: ActivityType,
  lat: number,
  lng: number,
  retry: boolean,
  signal?: AbortSignal
): Promise<PlacesSearchResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const url = `${resolveApiUrl(endpoint)}?${query.toString()}`;
  try {
    const response = await fetch(url, { signal });
    if (response.status === 409 && retry && params.pageToken) {
      await sleepWithAbort(2000, signal);
      return fetchLegacyPlaces(endpoint, params, fallbackType, lat, lng, false, signal);
    }
    if (!response.ok) {
      const errText = await response.text();
      console.warn('[FamPals] Places backend error:', errText);
      return { places: [], nextPageToken: null, hasMore: false, error: errText || `HTTP ${response.status}` };
    }
    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    const filtered = results.filter((raw: any) => {
      const rawTypes = Array.isArray(raw?.types) ? raw.types : [];
      const rawName = raw?.name || raw?.formatted_address || '';
      return !shouldExcludePlace(rawTypes, rawName);
    });
    const places = filtered.map((raw: any, index: number) =>
      mapLegacyPlaceToPlace(raw, index, lat, lng, fallbackType)
    );
    const nextPageToken = data.nextPageToken || null;
    const hasMore = typeof data.hasMore === 'boolean' ? data.hasMore : !!nextPageToken;
    return { places, nextPageToken, hasMore };
  } catch (error) {
    console.warn('[FamPals] Places backend fetch failed:', error);
    return { places: [], nextPageToken: null, hasMore: false, error: 'fetch_failed' };
  }
}

export async function searchNearbyPlacesPaged(
  lat: number,
  lng: number,
  type: ActivityType = 'all',
  radiusKm: number = 10,
  pageToken?: string,
  options?: { signal?: AbortSignal }
): Promise<PlacesSearchResponse> {
  if (!lat || !lng) return { places: [], nextPageToken: null, hasMore: false };
  if (PLACES_API_KEY) {
    return searchNearbyPlacesTextApi(lat, lng, type, radiusKm, undefined, pageToken, { signal: options?.signal });
  }
  if (API_BASE) {
    const response = await fetchLegacyPlaces(
      '/api/places/nearby',
      {
        apiKey: CLIENT_PLACES_KEY || undefined,
        lat,
        lng,
        radiusKm,
        type,
        pageToken,
      },
      type,
      lat,
      lng,
      true,
      options?.signal
    );
    return response;
  }
  return { places: [], nextPageToken: null, hasMore: false };
}

export async function textSearchPlacesPaged(
  query: string,
  lat: number,
  lng: number,
  radiusKm: number = 10,
  pageToken?: string,
  options?: { signal?: AbortSignal }
): Promise<PlacesSearchResponse> {
  if (!query.trim()) return { places: [], nextPageToken: null, hasMore: false };
  if (!API_BASE && PLACES_API_KEY) {
    return searchNearbyPlacesTextApi(lat, lng, 'all', radiusKm, query.trim(), pageToken, { useCache: false, signal: options?.signal });
  }
  const response = await fetchLegacyPlaces(
    '/api/places/text',
    {
      apiKey: CLIENT_PLACES_KEY || undefined,
      query: query.trim(),
      lat,
      lng,
      radiusKm,
      pageToken,
    },
    'all',
    lat,
    lng,
    true,
    options?.signal
  );
  if (response.error && !pageToken && PLACES_API_KEY) {
    const places = await textSearchPlaces(query, lat, lng, radiusKm);
    return { places, nextPageToken: null, hasMore: false };
  }
  return response;
}

export async function searchExploreIntent(
  intent: ExploreIntent,
  lat: number,
  lng: number,
  radiusKm: number,
  options?: {
    searchQuery?: string;
    searchKey?: string;
    cacheContext?: string;
    exploreFilters?: ExploreFilters;
    onProgress?: (update: IntentProgressUpdate) => void;
    isCancelled?: () => boolean;
    signal?: AbortSignal;
  }
): Promise<IntentSearchResponse> {
  const startedAt = performance.now();
  let firstRenderAt: number | null = null;
  let reached25At: number | null = null;
  const definition = getExploreIntentDefinition(intent);
  const requestedCategory = mapIntentToCategory(intent);
  const searchQuery = options?.searchQuery?.trim() || '';
  const qKey = normalizeQueryForCache(searchQuery);
  const baselineQueries = uniqueQueries(searchQuery ? [searchQuery, ...definition.queries.slice(0, 2)] : definition.queries);
  const boosterQueries = buildBoosterQueriesFromFilters(options?.exploreFilters);
  const queries = uniqueQueries([...baselineQueries, ...boosterQueries]);
  const coreQueries = queries.slice(0, Math.min(3, queries.length));
  const optionalQueries = queries.slice(coreQueries.length);
  const filtersSignature = options?.exploreFilters
    ? JSON.stringify({
      f: options.exploreFilters.foodTypes,
      v: options.exploreFilters.venueTypes,
      k: options.exploreFilters.kidPrefs,
      a: options.exploreFilters.accessibility,
      io: options.exploreFilters.indoorOutdoor,
      s: options.exploreFilters.strict,
    })
    : '';
  const baseSearchKey =
    options?.searchKey ||
    `intent:${intent}:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm}:${options?.cacheContext || ''}:${filtersSignature}`;
  const searchKey = `${baseSearchKey}|q:${qKey}`;
  intentLog('[FamPals] Explore search cache key', { query: searchQuery, qKey, searchKey });
  const runWithLimit = createRequestLimiter(3);
  const debug: IntentSearchDebug = {
    intent,
    subtitle: definition.subtitle,
    queriesRun: [],
    perQueryCounts: {},
    totalBeforeFilter: 0,
    totalAfterFilter: 0,
    pipeline: {
      cacheCount: 0,
      afterFilterCount: 0,
      googleFetchedCount: 0,
      ingestedCount: 0,
      mergedCount: 0,
      cacheLow: true,
      googleLow: true,
      hardFiltersApplied: false,
      hardFilteredOut: false,
    },
  };

  let merged: Place[] = [];
  let googleFetchedCount = 0;
  let ingestedCount = 0;
  const queryState = new Map<string, { nextPageToken?: string; hasMore: boolean; pagesFetched: number; fetchedResults: number; beforeUnique: number }>();

  const cached = getIntentCached(searchKey);
  if (cached && !options?.isCancelled?.()) {
    merged = dedupePlacesById(cached.places);
    Object.assign(debug, cached.debug);
    firstRenderAt = performance.now();
    if (merged.length >= 25) {
      reached25At = firstRenderAt;
    }
    options?.onProgress?.({
      places: merged,
      debug,
      query: 'cache',
      page: 0,
      isBackgroundLoading: true,
      fromCache: true,
    });
  }

  const bounds = getGeoBounds(lat, lng, radiusKm);
  const cacheRecords = await getPlacesByGeoBoundsAndCategory(bounds, requestedCategory, PIPELINE_TARGET_RESULTS * 2);
  const cachePlaces = dedupePlacesById(cacheRecords.map((record) => placeRecordToPlace(record, lat, lng, requestedCategory)));
  const cacheIntentFiltered = filterPlacesForIntent(cachePlaces, definition);
  const strictKidPrefsEnabled = !!options?.exploreFilters?.strict?.kidPrefs;
  const selectedKidPrefs = (options?.exploreFilters?.kidPrefs || []).map(normalizeFacetToken);
  const requiresStrictKidPlay = strictKidPrefsEnabled && selectedKidPrefs.includes('play_area_jungle_gym');
  const cacheHasMissingKidSignal = requiresStrictKidPlay && cacheIntentFiltered
    .slice(0, 25)
    .some((place) => !facetSnapshotFromPlace(place, requestedCategory).kidFriendlySignals.includes('play_area_jungle_gym'));
  let cacheFacetRanked = rankAndFilterByComputedFacets(cacheIntentFiltered, requestedCategory, options?.exploreFilters);
  if (requiresStrictKidPlay && (cacheFacetRanked.afterFilterCount === 0 || cacheHasMissingKidSignal)) {
    intentLog('[FamPals] strict kidPrefs enrichment running on cache candidates', {
      reason: cacheFacetRanked.afterFilterCount === 0 ? 'zero_after_strict' : 'missing_play_area_signal',
      candidates: cacheIntentFiltered.length,
    });
    await enrichPlacesForStrictKidPrefs(cacheIntentFiltered, selectedKidPrefs, requestedCategory);
    cacheFacetRanked = rankAndFilterByComputedFacets(cacheIntentFiltered, requestedCategory, options?.exploreFilters);
    intentLog('[FamPals] strict kidPrefs enrichment cache rerank', {
      afterFilterCount: cacheFacetRanked.afterFilterCount,
    });
  }
  merged = dedupePlacesById([...merged, ...cacheFacetRanked.places]);
  debug.totalBeforeFilter = cacheIntentFiltered.length;
  debug.totalAfterFilter = cacheFacetRanked.afterFilterCount;
  debug.pipeline = {
    ...debug.pipeline!,
    cacheCount: cacheIntentFiltered.length,
    afterFilterCount: cacheFacetRanked.afterFilterCount,
    mergedCount: merged.length,
    hardFiltersApplied: cacheFacetRanked.hardFiltersApplied,
    hardFilteredOut: cacheFacetRanked.hardFilteredOut,
    cacheLow: cacheFacetRanked.afterFilterCount < PIPELINE_MIN_RESULTS,
  };

  if (PIPELINE_LOGS_ENABLED) {
    console.log('[FamPals Pipeline] cache stage', {
      cacheCount: debug.pipeline.cacheCount,
      afterFilterCount: debug.pipeline.afterFilterCount,
      hardFiltersApplied: debug.pipeline.hardFiltersApplied,
      hardFilteredOut: debug.pipeline.hardFilteredOut,
    });
  }

  if (!options?.isCancelled?.()) {
    options?.onProgress?.({
      places: merged,
      debug,
      query: 'cache',
      page: 0,
      isBackgroundLoading: true,
      fromCache: true,
    });
  }

  intentLog(`[FamPals] Explore intent selected: ${intent}`);
  intentLog(`[FamPals] Intent queries executed: baseline=${baselineQueries.join(', ')} boosters=${boosterQueries.join(', ')}`);

  const applyMerge = (query: string, page: number, response: PlacesSearchResponse) => {
    const state = queryState.get(query);
    if (!state) return;
    const previousMergedCount = merged.length;
    state.pagesFetched = Math.max(state.pagesFetched, page);
    state.fetchedResults += response.places.length;
    state.nextPageToken = response.nextPageToken || undefined;
    state.hasMore = response.hasMore && !!state.nextPageToken;
    googleFetchedCount += response.places.length;
    ingestedCount += response.places.length;
    merged = dedupePlacesById([...merged, ...response.places]);
    const intentFiltered = filterPlacesForIntent(merged, definition);
    const facetRanked = rankAndFilterByComputedFacets(intentFiltered, requestedCategory, options?.exploreFilters);
    const uniqueAdded = Math.max(0, merged.length - previousMergedCount);
    if (firstRenderAt === null && facetRanked.places.length > 0) {
      firstRenderAt = performance.now();
    }
    if (reached25At === null && facetRanked.places.length >= 25) {
      reached25At = performance.now();
    }
    debug.totalBeforeFilter = merged.length;
    debug.totalAfterFilter = facetRanked.afterFilterCount;
    debug.perQueryCounts[query] = {
      pagesFetched: state.pagesFetched,
      fetchedResults: state.fetchedResults,
      uniqueAdded: merged.length - state.beforeUnique,
    };
    debug.pipeline = {
      ...debug.pipeline!,
      googleFetchedCount,
      ingestedCount,
      mergedCount: merged.length,
      afterFilterCount: facetRanked.afterFilterCount,
      hardFiltersApplied: facetRanked.hardFiltersApplied,
      hardFilteredOut: facetRanked.hardFilteredOut,
      googleLow: facetRanked.afterFilterCount < PIPELINE_MIN_RESULTS,
    };
    intentLog(`[FamPals] Query "${query}" page ${page}: ${response.places.length} results, uniqueAdded=${uniqueAdded}, hasMore: ${response.hasMore}`);
    intentLog(`[FamPals] Merge count after "${query}" page ${page}: ${merged.length} before filter, ${facetRanked.afterFilterCount} after filter`);
    options?.onProgress?.({
      places: facetRanked.places,
      debug,
      query,
      page,
      isBackgroundLoading: true,
    });
  };

  const fetchPage = async (query: string, page: number, pageToken?: string) => {
    if (options?.isCancelled?.() || options?.signal?.aborted) return null;
    return runWithLimit(async () =>
      textSearchPlacesPaged(query, lat, lng, radiusKm, pageToken, { signal: options?.signal })
    );
  };

  const shouldFetchGoogle = !options?.isCancelled?.() && !options?.signal?.aborted && (merged.length < PIPELINE_MIN_RESULTS);
  if (shouldFetchGoogle) {
    for (const query of coreQueries) {
      queryState.set(query, { nextPageToken: undefined, hasMore: true, pagesFetched: 0, fetchedResults: 0, beforeUnique: merged.length });
      debug.queriesRun.push(query);
    }
    const coreFirstPageTasks = coreQueries.map(async (query) => {
      const response = await fetchPage(query, 1);
      if (!response) return;
      applyMerge(query, 1, response);
    });
    await Promise.allSettled(coreFirstPageTasks);

    const interimIntentFiltered = filterPlacesForIntent(merged, definition);
    const interimFacetRanked = rankAndFilterByComputedFacets(interimIntentFiltered, requestedCategory, options?.exploreFilters);
    if (!options?.isCancelled?.() && interimFacetRanked.afterFilterCount < PIPELINE_TARGET_RESULTS && optionalQueries.length > 0) {
      for (const query of optionalQueries) {
        queryState.set(query, { nextPageToken: undefined, hasMore: true, pagesFetched: 0, fetchedResults: 0, beforeUnique: merged.length });
        debug.queriesRun.push(query);
      }
      const optionalFirstPageTasks = optionalQueries.map(async (query) => {
        const response = await fetchPage(query, 1);
        if (!response) return;
        applyMerge(query, 1, response);
      });
      await Promise.allSettled(optionalFirstPageTasks);
    }

    const activeQueries = [...debug.queriesRun];
    for (let page = 2; page <= PIPELINE_MAX_GOOGLE_PAGES; page += 1) {
      const latestIntentFiltered = filterPlacesForIntent(merged, definition);
      const latestFacetRanked = rankAndFilterByComputedFacets(latestIntentFiltered, requestedCategory, options?.exploreFilters);
      if (latestFacetRanked.afterFilterCount >= PIPELINE_TARGET_RESULTS) {
        break;
      }
      const tasks = activeQueries.map(async (query) => {
        const state = queryState.get(query);
        if (!state || !state.hasMore || !state.nextPageToken) return;
        if (options?.isCancelled?.() || options?.signal?.aborted) return;
        await sleepWithAbort(2000, options?.signal);
        const response = await fetchPage(query, page, state.nextPageToken);
        if (!response) return;
        applyMerge(query, page, response);
      });
      await Promise.allSettled(tasks);
    }
  }

  const finalIntentFiltered = filterPlacesForIntent(merged, definition);
  let finalFacetRanked = rankAndFilterByComputedFacets(finalIntentFiltered, requestedCategory, options?.exploreFilters);
  const finalHasMissingKidSignal = requiresStrictKidPlay && finalIntentFiltered
    .slice(0, 25)
    .some((place) => !facetSnapshotFromPlace(place, requestedCategory).kidFriendlySignals.includes('play_area_jungle_gym'));
  if (requiresStrictKidPlay && (finalFacetRanked.afterFilterCount === 0 || finalHasMissingKidSignal)) {
    intentLog('[FamPals] strict kidPrefs enrichment running on final candidates', {
      reason: finalFacetRanked.afterFilterCount === 0 ? 'zero_after_strict' : 'missing_play_area_signal',
      candidates: finalIntentFiltered.length,
    });
    await enrichPlacesForStrictKidPrefs(finalIntentFiltered, selectedKidPrefs, requestedCategory);
    finalFacetRanked = rankAndFilterByComputedFacets(finalIntentFiltered, requestedCategory, options?.exploreFilters);
    intentLog('[FamPals] strict kidPrefs enrichment final rerank', {
      afterFilterCount: finalFacetRanked.afterFilterCount,
    });
  }
  const finalPlaces = finalFacetRanked.places;
  debug.totalBeforeFilter = merged.length;
  debug.totalAfterFilter = finalFacetRanked.afterFilterCount;
  debug.pipeline = {
    ...debug.pipeline!,
    cacheLow: (debug.pipeline?.cacheCount || 0) < PIPELINE_MIN_RESULTS,
    googleLow: finalPlaces.length < PIPELINE_MIN_RESULTS,
    hardFiltersApplied: finalFacetRanked.hardFiltersApplied,
    hardFilteredOut: finalFacetRanked.hardFilteredOut,
    afterFilterCount: finalFacetRanked.afterFilterCount,
    googleFetchedCount,
    ingestedCount,
    mergedCount: merged.length,
  };
  if (!options?.isCancelled?.()) {
    setIntentCached(searchKey, { places: finalPlaces, debug });
  }
  const completedAt = performance.now();
  const timeToFirstRender = firstRenderAt ? Math.round(firstRenderAt - startedAt) : -1;
  const timeTo25Results = reached25At ? Math.round(reached25At - startedAt) : -1;
  intentLog(`[FamPals] Intent "${intent}" filter counts: before=${debug.totalBeforeFilter}, after=${debug.totalAfterFilter}`);
  intentLog(`[FamPals] Timing metrics: timeToFirstRenderMs=${timeToFirstRender}, timeTo25ResultsMs=${timeTo25Results}, timeToCompleteMs=${Math.round(completedAt - startedAt)}`);
  if (PIPELINE_LOGS_ENABLED) {
    console.log('[FamPals Pipeline]', {
      cacheCount: debug.pipeline?.cacheCount || 0,
      afterFilterCount: debug.pipeline?.afterFilterCount || 0,
      googleFetchedCount: debug.pipeline?.googleFetchedCount || 0,
      ingestedCount: debug.pipeline?.ingestedCount || 0,
      mergedCount: debug.pipeline?.mergedCount || 0,
      cacheLow: debug.pipeline?.cacheLow || false,
      googleLow: debug.pipeline?.googleLow || false,
      hardFiltersApplied: debug.pipeline?.hardFiltersApplied || false,
      hardFilteredOut: debug.pipeline?.hardFilteredOut || false,
    });
  }

  return {
    places: finalPlaces,
    debug,
  };
}

export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  type: ActivityType = 'all',
  radiusKm: number = 10,
  searchQuery?: string
): Promise<Place[]> {
  const result = await searchNearbyPlacesTextApi(lat, lng, type, radiusKm, searchQuery);
  return result.places;
}

export async function searchNearbyPlacesTextApi(
  lat: number,
  lng: number,
  type: ActivityType = 'all',
  radiusKm: number = 10,
  searchQuery?: string,
  pageToken?: string,
  options?: { useCache?: boolean; signal?: AbortSignal }
): Promise<PlacesSearchResponse> {
  if (!PLACES_API_KEY) {
    console.warn("Google Places API key missing");
    return { places: [], nextPageToken: null, hasMore: false };
  }

  const useCache = options?.useCache !== false;
  const cacheKey = `text-cat:${lat.toFixed(3)}:${lng.toFixed(3)}:${type}:${radiusKm}:${searchQuery || ''}:${pageToken || ''}`;

  if (useCache) {
    const cached = getCached<PlacesSearchResponse>(PLACES_CACHE_KEY, cacheKey);
    if (cached) {
      intentLog('[FamPals] Loaded places from cache (instant)');
      return {
        ...cached,
        hasMore: typeof cached.hasMore === 'boolean' ? cached.hasMore : !!cached.nextPageToken,
      };
    }
  }

  try {
    const radiusMeters = radiusKm * 1000;
    const placeTypes = categoryToPlaceTypes[type] || categoryToPlaceTypes.all;
    const categoryQuery = searchQuery || categoryToTextQuery[type] || categoryToTextQuery.all;

    const requestBody: any = {
      textQuery: categoryQuery,
      pageSize: 20,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radiusMeters, 50000)
        }
      },
    };

    if (type !== 'all' && type !== 'kids' && placeTypes.length === 1) {
      requestBody.includedType = placeTypes[0];
    }

    if (pageToken) {
      requestBody.pageToken = pageToken;
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.priceLevel,places.location,places.photos,places.primaryTypeDisplayName,places.regularOpeningHours,nextPageToken'
        },
        body: JSON.stringify(requestBody),
        signal: options?.signal,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places Text Search API error:', errorText);
      return { places: [], nextPageToken: null, hasMore: false };
    }

    const data = await response.json();

    if (!data.places || !Array.isArray(data.places)) {
      intentLog('[FamPals] No places found for this search');
      return { places: [], nextPageToken: null, hasMore: false };
    }

    const rawPlaces: any[] = data.places.filter((p: any) => {
      const rawTypes = Array.isArray(p.types) ? p.types : [];
      const rawName = p.displayName?.text || p.name || '';
      return !shouldExcludePlace(rawTypes, rawName);
    });

    const places: Place[] = rawPlaces.map((p: any, index: number) => {
      const placeType = mapGoogleTypeToCategory(p.types || []);
      const placeLat = p.location?.latitude || lat;
      const placeLng = p.location?.longitude || lng;
      const placeId = p.id || `gp-${Date.now()}-${index}`;
      const imageUrl = p.photos?.[0]
        ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=400&maxWidthPx=600&key=${PLACES_API_KEY}`
        : getPlaceholderImage(placeType, p.displayName?.text || '', index);
      const sourceGoogle: PlaceSourceGoogle = {
        googlePlaceId: placeId,
        name: p.displayName?.text || 'Unknown Place',
        address: p.formattedAddress || '',
        lat: placeLat,
        lng: placeLng,
        types: p.types || [],
        primaryType: p.primaryType || p.types?.[0],
        primaryTypeDisplayName: p.primaryTypeDisplayName?.text,
        rating: p.rating,
        userRatingsTotal: p.userRatingCount,
        priceLevel: p.priceLevel,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        photoUrl: imageUrl,
        goodForChildren: p.goodForChildren === true,
        menuForChildren: p.menuForChildren === true,
        restroom: p.restroom === true,
        accessibilityOptions: p.accessibilityOptions,
        parkingOptions: p.parkingOptions,
        raw: p,
      };
      void upsertPlaceFromGoogle(sourceGoogle, {
        requestedCategory: type,
        searchQuery,
        ingestionSource: 'searchNearbyPlacesTextApi',
      }).catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[FamPals] Text API place cache upsert failed', err);
        }
      });

      return {
        id: placeId,
        name: p.displayName?.text || 'Unknown Place',
        description: p.primaryTypeDisplayName?.text || 'Family-friendly venue',
        address: p.formattedAddress || '',
        rating: p.rating || 4.0,
        tags: (p.types || []).slice(0, 8).map((t: string) => t.replace(/_/g, ' ')),
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        type: placeType,
        priceLevel: priceLevelToString(p.priceLevel),
        imageUrl,
        distance: calculateDistance(lat, lng, placeLat, placeLng),
        ageAppropriate: 'All ages',
        phone: undefined,
        website: undefined,
        googlePlaceId: placeId,
        userRatingsTotal: p.userRatingCount,
        lat: placeLat,
        lng: placeLng
      };
    });

    const filteredPlaces = places.filter(p => {
      const pLat = (p as any).lat;
      const pLng = (p as any).lng;
      if (!pLat || !pLng) return true;
      const distKm = calculateDistanceKm(lat, lng, pLat, pLng);
      return distKm <= radiusKm;
    });

    const nextPageToken = data.nextPageToken || null;
    const result: PlacesSearchResponse = {
      places: filteredPlaces,
      nextPageToken,
      hasMore: !!nextPageToken
    };

    if (useCache) {
      setCache(PLACES_CACHE_KEY, cacheKey, result);
    }
    intentLog(`[FamPals] Text Search: ${places.length} total, ${filteredPlaces.length} within ${radiusKm}km, hasMore: ${!!data.nextPageToken}`);

    return result;
  } catch (error) {
    console.error('Error fetching places via Text Search:', error);
    return { places: [], nextPageToken: null, hasMore: false };
  }
}

export async function textSearchPlaces(
  query: string,
  lat: number,
  lng: number,
  radiusKm: number = 10
): Promise<Place[]> {
  if (!PLACES_API_KEY || !query.trim()) {
    return [];
  }

  const cacheKey = `text:${query.toLowerCase()}:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm}`;
  
  const cached = getCached<Place[]>(PLACES_CACHE_KEY, cacheKey);
  if (cached) {
    intentLog('[FamPals] Loaded text search from cache');
    return cached;
  }

  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.priceLevel,places.location,places.photos,places.primaryTypeDisplayName'
        },
        body: JSON.stringify({
          textQuery: `${query} family friendly`,
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: Math.min(radiusKm * 1000, 50000)
            }
          },
          pageSize: 20
        })
      }
    );

    if (!response.ok) {
      console.error('Text search error:', await response.text());
      return [];
    }

    const data = await response.json();
    
    if (!data.places) return [];

    const rawPlaces: any[] = data.places.filter((p: any) => {
      const rawTypes = Array.isArray(p.types) ? p.types : [];
      const rawName = p.displayName?.text || p.name || '';
      return !shouldExcludePlace(rawTypes, rawName);
    });

    const places: Place[] = rawPlaces.map((p: any, index: number) => {
      const placeType = mapGoogleTypeToCategory(p.types || []);
      const placeLat = p.location?.latitude || lat;
      const placeLng = p.location?.longitude || lng;
      const placeId = p.id || `gp-${Date.now()}-${index}`;
      const imageUrl = p.photos?.[0]
        ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=400&maxWidthPx=600&key=${PLACES_API_KEY}`
        : getPlaceholderImage(placeType, p.displayName?.text || '', index);
      const sourceGoogle: PlaceSourceGoogle = {
        googlePlaceId: placeId,
        name: p.displayName?.text || 'Unknown Place',
        address: p.formattedAddress || '',
        lat: placeLat,
        lng: placeLng,
        types: p.types || [],
        primaryType: p.primaryType || p.types?.[0],
        primaryTypeDisplayName: p.primaryTypeDisplayName?.text,
        rating: p.rating,
        userRatingsTotal: p.userRatingCount,
        priceLevel: p.priceLevel,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        photoUrl: imageUrl,
        raw: p,
      };
      void upsertPlaceFromGoogle(sourceGoogle, {
        requestedCategory: 'all',
        searchQuery: query,
        ingestionSource: 'textSearchPlaces',
      }).catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('[FamPals] Text search cache upsert failed', err);
        }
      });
      
      return {
        id: placeId,
        name: p.displayName?.text || 'Unknown Place',
        description: p.primaryTypeDisplayName?.text || 'Family-friendly venue',
        address: p.formattedAddress || '',
        rating: p.rating || 4.0,
        tags: (p.types || []).slice(0, 8).map((t: string) => t.replace(/_/g, ' ')),
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
        type: placeType,
        priceLevel: priceLevelToString(p.priceLevel),
        imageUrl,
        distance: calculateDistance(lat, lng, placeLat, placeLng),
        ageAppropriate: 'All ages',
        googlePlaceId: placeId,
        userRatingsTotal: p.userRatingCount,
        lat: placeLat,
        lng: placeLng
      };
    });

    setCache(PLACES_CACHE_KEY, cacheKey, places);
    return places;
  } catch (error) {
    console.error('Text search error:', error);
    return [];
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!PLACES_API_KEY || !placeId) return null;

  const cached = getCached<PlaceDetails>(DETAILS_CACHE_KEY, placeId);
  if (cached) {
    intentLog('[FamPals] Loaded place details from cache');
    return cached;
  }

  const baseFields = 'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,regularOpeningHours,photos,reviews,priceLevel,types,location,googleMapsUri,accessibilityOptions,goodForChildren,menuForChildren,restroom,parkingOptions';
  const extendedFields = `${baseFields},editorialSummary,generativeSummary`;

  try {
    let response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': extendedFields
        }
      }
    );

    if (!response.ok && response.status === 400) {
      console.warn('[FamPals] Extended field mask failed, retrying with base fields');
      response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}`,
        {
          headers: {
            'X-Goog-Api-Key': PLACES_API_KEY,
            'X-Goog-FieldMask': baseFields
          }
        }
      );
    }

    if (!response.ok) {
      console.error('Place details error:', await response.text());
      return null;
    }

    const p = await response.json();
    
    const details: PlaceDetails = {
      id: p.id,
      name: p.displayName?.text || 'Unknown',
      address: p.formattedAddress || '',
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber,
      website: p.websiteUri,
      rating: p.rating,
      userRatingsTotal: p.userRatingCount,
      openingHours: p.regularOpeningHours?.weekdayDescriptions,
      isOpen: p.regularOpeningHours?.openNow,
      photos: (p.photos || []).slice(0, 10).map((photo: any) => 
        `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=600&key=${PLACES_API_KEY}`
      ),
      reviews: (p.reviews || []).slice(0, 5).map((r: any) => ({
        authorName: r.authorAttribution?.displayName || 'Anonymous',
        rating: r.rating || 5,
        text: r.text?.text || '',
        relativeTimeDescription: r.relativePublishTimeDescription || '',
        profilePhotoUrl: r.authorAttribution?.photoUri
      })),
      priceLevel: priceLevelToString(p.priceLevel),
      types: p.types,
      lat: p.location?.latitude || 0,
      lng: p.location?.longitude || 0,
      mapsUrl: p.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${p.id}`,
      accessibilityOptions: p.accessibilityOptions || undefined,
      goodForChildren: p.goodForChildren === true,
      menuForChildren: p.menuForChildren === true,
      restroom: p.restroom === true,
      parkingOptions: p.parkingOptions || undefined,
      editorialSummary: p.editorialSummary?.text || undefined,
      reviewSummary: p.generativeSummary?.overview?.text || undefined,
    };

    setCache(DETAILS_CACHE_KEY, placeId, details);
    intentLog('[FamPals] Cached place details');
    
    return details;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}

export function clearPlacesCache() {
  localStorage.removeItem(PLACES_CACHE_KEY);
  localStorage.removeItem(DETAILS_CACHE_KEY);
}
