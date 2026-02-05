import { Place, ActivityType } from "./types";

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
  'truck_stop'
];

if (!PLACES_API_KEY) {
  console.error('[FamPals] CRITICAL: Google Places API key is missing! Places will not load.');
} else {
  console.log('[FamPals] Places API configured:', PLACES_API_KEY.substring(0, 8) + '...');
}

const PLACES_CACHE_KEY = 'fampals_google_places_cache';
const DETAILS_CACHE_KEY = 'fampals_place_details_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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
  error?: string;
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
  priceLevel?: number;
  types?: string[];
  lat: number;
  lng: number;
  mapsUrl: string;
}

export interface PlaceReview {
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
  profilePhotoUrl?: string;
}

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
  wine: ['bar', 'restaurant'],
  golf: ['golf_course'],
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

function mapGoogleTypeToCategory(types: string[]): ActivityType {
  if (types.some(t => ['restaurant', 'cafe', 'bakery', 'food', 'meal_takeaway'].includes(t))) return 'restaurant';
  if (types.some(t => ['park', 'campground', 'state_park'].includes(t))) return 'outdoor';
  if (types.some(t => ['museum', 'aquarium', 'bowling_alley', 'movie_theater', 'library'].includes(t))) return 'indoor';
  if (types.some(t => ['gym', 'sports_complex', 'swimming_pool', 'playground'].includes(t))) return 'active';
  if (types.some(t => ['national_park', 'state_park'].includes(t))) return 'hike';
  if (types.some(t => ['bar', 'wine_bar'].includes(t))) return 'wine';
  if (types.some(t => ['golf_course'].includes(t))) return 'golf';
  return 'all';
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
}

function priceLevelToString(level?: number): "$" | "$$" | "$$$" | "$$$$" {
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
  return [...envBrands, ...runtime].map((entry) => entry.toLowerCase()).filter(Boolean);
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
  return {
    id: placeId,
    name,
    description: 'Family-friendly venue',
    address: raw?.vicinity || raw?.formatted_address || '',
    rating: raw?.rating || 4.0,
    tags: rawTypes.slice(0, 3).map((t: string) => t.replace(/_/g, ' ')),
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
  retry: boolean
): Promise<PlacesSearchResponse> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const url = `${resolveApiUrl(endpoint)}?${query.toString()}`;
  try {
    const response = await fetch(url);
    if (response.status === 409 && retry && params.pageToken) {
      await sleep(1500);
      return fetchLegacyPlaces(endpoint, params, fallbackType, lat, lng, false);
    }
    if (!response.ok) {
      const errText = await response.text();
      console.warn('[FamPals] Places backend error:', errText);
      return { places: [], nextPageToken: null, error: errText || `HTTP ${response.status}` };
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
    return { places, nextPageToken: data.nextPageToken || null };
  } catch (error) {
    console.warn('[FamPals] Places backend fetch failed:', error);
    return { places: [], nextPageToken: null, error: 'fetch_failed' };
  }
}

export async function searchNearbyPlacesPaged(
  lat: number,
  lng: number,
  type: ActivityType = 'all',
  radiusKm: number = 10,
  pageToken?: string
): Promise<PlacesSearchResponse> {
  if (!lat || !lng) return { places: [], nextPageToken: null };
  if (!API_BASE && PLACES_API_KEY) {
    const places = await searchNearbyPlaces(lat, lng, type, radiusKm);
    return { places, nextPageToken: null };
  }
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
    true
  );
  if (response.error && !pageToken && PLACES_API_KEY) {
    const places = await searchNearbyPlaces(lat, lng, type, radiusKm);
    return { places, nextPageToken: null };
  }
  return response;
}

export async function textSearchPlacesPaged(
  query: string,
  lat: number,
  lng: number,
  radiusKm: number = 10,
  pageToken?: string
): Promise<PlacesSearchResponse> {
  if (!query.trim()) return { places: [], nextPageToken: null };
  if (!API_BASE && PLACES_API_KEY) {
    const places = await textSearchPlaces(query, lat, lng, radiusKm);
    return { places, nextPageToken: null };
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
    true
  );
  if (response.error && !pageToken && PLACES_API_KEY) {
    const places = await textSearchPlaces(query, lat, lng, radiusKm);
    return { places, nextPageToken: null };
  }
  return response;
}

export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  type: ActivityType = 'all',
  radiusKm: number = 10,
  searchQuery?: string
): Promise<Place[]> {
  if (!PLACES_API_KEY) {
    console.warn("Google Places API key missing");
    return [];
  }

  const cacheKey = `${lat.toFixed(3)}:${lng.toFixed(3)}:${type}:${radiusKm}:${searchQuery || ''}`;
  
  const cached = getCached<Place[]>(PLACES_CACHE_KEY, cacheKey);
  if (cached) {
    console.log('[FamPals] Loaded places from cache (instant)');
    return cached;
  }

  try {
    const radiusMeters = Math.min(radiusKm * 1000, 50000);
    const placeTypes = categoryToPlaceTypes[type] || categoryToPlaceTypes.all;
    
    const requestBody: any = {
      includedTypes: placeTypes,
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters
        }
      }
    };

    if (searchQuery) {
      requestBody.textQuery = searchQuery;
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.priceLevel,places.location,places.photos,places.primaryTypeDisplayName,places.regularOpeningHours'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Places API error:', errorText);
      return [];
    }

    const data = await response.json();
    
    if (!data.places || !Array.isArray(data.places)) {
      console.log('[FamPals] No places found for this search');
      return [];
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
      
      return {
        id: p.id || `gp-${Date.now()}-${index}`,
        name: p.displayName?.text || 'Unknown Place',
        description: p.primaryTypeDisplayName?.text || 'Family-friendly venue',
        address: p.formattedAddress || '',
        rating: p.rating || 4.0,
        tags: (p.types || []).slice(0, 3).map((t: string) => t.replace(/_/g, ' ')),
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.id}`,
        type: placeType,
        priceLevel: priceLevelToString(p.priceLevel),
        imageUrl: p.photos?.[0] 
          ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=400&maxWidthPx=600&key=${PLACES_API_KEY}`
          : getPlaceholderImage(placeType, p.displayName?.text || '', index),
        distance: calculateDistance(lat, lng, placeLat, placeLng),
        ageAppropriate: 'All ages',
        phone: undefined,
        website: undefined,
        googlePlaceId: p.id,
        userRatingsTotal: p.userRatingCount,
        lat: placeLat,
        lng: placeLng
      };
    });

    setCache(PLACES_CACHE_KEY, cacheKey, places);
    console.log(`[FamPals] Cached ${places.length} places from Google`);
    
    return places;
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
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
    console.log('[FamPals] Loaded text search from cache');
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
              radius: radiusKm * 1000
            }
          },
          maxResultCount: 20
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
      
      return {
        id: p.id || `gp-${Date.now()}-${index}`,
        name: p.displayName?.text || 'Unknown Place',
        description: p.primaryTypeDisplayName?.text || 'Family-friendly venue',
        address: p.formattedAddress || '',
        rating: p.rating || 4.0,
        tags: (p.types || []).slice(0, 3).map((t: string) => t.replace(/_/g, ' ')),
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${p.id}`,
        type: placeType,
        priceLevel: priceLevelToString(p.priceLevel),
        imageUrl: p.photos?.[0]
          ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxHeightPx=400&maxWidthPx=600&key=${PLACES_API_KEY}`
          : getPlaceholderImage(placeType, p.displayName?.text || '', index),
        distance: calculateDistance(lat, lng, placeLat, placeLng),
        ageAppropriate: 'All ages',
        googlePlaceId: p.id,
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
    console.log('[FamPals] Loaded place details from cache');
    return cached;
  }

  try {
    const response = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}`,
      {
        headers: {
          'X-Goog-Api-Key': PLACES_API_KEY,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,rating,userRatingCount,regularOpeningHours,photos,reviews,priceLevel,types,location,googleMapsUri'
        }
      }
    );

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
      photos: (p.photos || []).slice(0, 5).map((photo: any) => 
        `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=400&maxWidthPx=600&key=${PLACES_API_KEY}`
      ),
      reviews: (p.reviews || []).slice(0, 5).map((r: any) => ({
        authorName: r.authorAttribution?.displayName || 'Anonymous',
        rating: r.rating || 5,
        text: r.text?.text || '',
        relativeTimeDescription: r.relativePublishTimeDescription || '',
        profilePhotoUrl: r.authorAttribution?.photoUri
      })),
      priceLevel: p.priceLevel,
      types: p.types,
      lat: p.location?.latitude || 0,
      lng: p.location?.longitude || 0,
      mapsUrl: p.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${p.id}`
    };

    setCache(DETAILS_CACHE_KEY, placeId, details);
    console.log('[FamPals] Cached place details');
    
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
