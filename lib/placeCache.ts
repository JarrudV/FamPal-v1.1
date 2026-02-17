import { db, doc, getDoc, setDoc } from './firebase';
import type { PlaceDetails } from '../placesService';

const COLLECTION = 'placeCache';
const GOOGLE_ONLY_TTL_MS = 90 * 24 * 60 * 60 * 1000;

interface CachedPlaceDoc {
  details: PlaceDetails;
  cachedAt: number;
  version: number;
  hasCommunityData?: boolean;
  lastGoogleRefresh?: number;
}

const CURRENT_VERSION = 2;

export async function getPlaceFromFirestore(placeId: string): Promise<PlaceDetails | null> {
  if (!db || !placeId) return null;
  try {
    const ref = doc(db, COLLECTION, placeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as CachedPlaceDoc;
    if (!data.details || !data.cachedAt) return null;
    if (data.version && data.version > CURRENT_VERSION) return null;
    if (data.hasCommunityData) {
      return data.details;
    }
    const age = Date.now() - data.cachedAt;
    if (age > GOOGLE_ONLY_TTL_MS) return null;
    return data.details;
  } catch (err) {
    console.warn('[PlaceCache] Firestore read failed:', err);
    return null;
  }
}

export async function savePlaceToFirestore(
  placeId: string,
  details: PlaceDetails,
): Promise<void> {
  if (!db || !placeId || !details) return;
  try {
    const ref = doc(db, COLLECTION, placeId);
    let existingCommunityFlag = false;
    try {
      const existing = await getDoc(ref);
      if (existing.exists()) {
        existingCommunityFlag = (existing.data() as CachedPlaceDoc).hasCommunityData === true;
      }
    } catch {}
    const payload: CachedPlaceDoc = {
      details: sanitizeForFirestore(details),
      cachedAt: Date.now(),
      version: CURRENT_VERSION,
      hasCommunityData: existingCommunityFlag,
      lastGoogleRefresh: Date.now(),
    };
    await setDoc(ref, payload, { merge: true });
  } catch (err) {
    console.warn('[PlaceCache] Firestore write failed:', err);
  }
}

export async function markPlaceAsCommunityEnriched(placeId: string): Promise<void> {
  if (!db || !placeId) return;
  try {
    const ref = doc(db, COLLECTION, placeId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await setDoc(ref, { hasCommunityData: true }, { merge: true });
    } else {
      await setDoc(ref, {
        details: {},
        cachedAt: Date.now(),
        version: CURRENT_VERSION,
        hasCommunityData: true,
        lastGoogleRefresh: 0,
      }, { merge: true });
    }
  } catch (err) {
    console.warn('[PlaceCache] Failed to mark as community-enriched:', err);
  }
}

function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

export async function getMultiplePlacesFromFirestore(placeIds: string[]): Promise<Map<string, PlaceDetails>> {
  const results = new Map<string, PlaceDetails>();
  if (!db || placeIds.length === 0) return results;
  const batchSize = 10;
  const batches: string[][] = [];
  for (let i = 0; i < placeIds.length; i += batchSize) {
    batches.push(placeIds.slice(i, i + batchSize));
  }
  await Promise.all(
    batches.map(async (batch) => {
      await Promise.all(
        batch.map(async (id) => {
          const details = await getPlaceFromFirestore(id);
          if (details) results.set(id, details);
        })
      );
    })
  );
  return results;
}
