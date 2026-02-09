import { db, doc, onSnapshot, setDoc, deleteField, collection, deleteDoc } from './firebase';
import type { SavedPlace } from '../types';

type Unsubscribe = () => void;
const DEV_AUTH_BYPASS = import.meta.env.DEV && import.meta.env.VITE_AUTH_BYPASS === 'true';

export function listenToUserDoc(uid: string, onData: (data: any | null) => void): Unsubscribe {
  console.log('[FamPals] listenToUserDoc called for uid:', uid);
  if (!db) {
    console.error('[FamPals] listenToUserDoc: Firestore db is null/undefined!');
    return () => {};
  }
  const userDocRef = doc(db, 'users', uid);
  console.log('[FamPals] Setting up onSnapshot listener for user doc');
  console.time(`listen:user:${uid}`);
  const unsub = onSnapshot(userDocRef, (snap) => {
    console.timeEnd(`listen:user:${uid}`);
    console.log('[FamPals] User doc snapshot received, exists:', snap.exists());
    if (snap.exists()) {
      console.log('[FamPals] User doc data keys:', Object.keys(snap.data() || {}));
      onData(snap.data());
    } else {
      console.log('[FamPals] User doc does not exist yet');
      onData(null);
    }
  }, (err: any) => {
    console.error('[FamPals] listenToUserDoc error:', err?.message || err, err?.code);
    onData(null);
  });

  return () => {
    unsub();
  };
}

function stripUndefined(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof value.toMillis === 'function') {
    return value;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => stripUndefined(item))
      .filter((item) => item !== undefined);
    return cleaned;
  }
  if (typeof value === 'object') {
    const cleaned: Record<string, any> = {};
    Object.entries(value).forEach(([key, val]) => {
      const nextVal = stripUndefined(val);
      if (nextVal !== undefined) {
        cleaned[key] = nextVal;
      }
    });
    return cleaned;
  }
  return value;
}

export async function upsertUserProfile(uid: string, profile: Record<string, any>) {
  if (DEV_AUTH_BYPASS) return;
  console.log('[FamPals] upsertUserProfile called for uid:', uid);
  if (!db) {
    console.error('[FamPals] upsertUserProfile: Firestore db is null/undefined!');
    return;
  }
  console.log('[FamPals] Firestore db available, creating user doc ref...');
  try {
    const userDocRef = doc(db, 'users', uid);
    const dataToSave = {
      profile: stripUndefined(profile) || {},
      lastLoginAt: new Date().toISOString(),
    };
    console.log('[FamPals] Attempting setDoc for user:', uid, 'data:', JSON.stringify(dataToSave).substring(0, 200));
    console.time(`upsert:user:${uid}`);
    await setDoc(userDocRef, dataToSave, { merge: true });
    console.timeEnd(`upsert:user:${uid}`);
    console.log('[FamPals] User profile saved successfully to Firestore!');
  } catch (err: any) {
    console.error('[FamPals] upsertUserProfile FAILED:', err?.message || err, err?.code);
    throw err;
  }
}

export async function saveUserField(uid: string, key: string, value: any) {
  if (DEV_AUTH_BYPASS) return;
  if (!db) {
    console.warn('saveUserField: Firestore not initialized');
    return;
  }
  try {
    const userDocRef = doc(db, 'users', uid);
    const payload: Record<string, any> = {};
    const cleanedValue = stripUndefined(value);
    payload[key] = cleanedValue === undefined ? deleteField() : cleanedValue;
    await setDoc(userDocRef, payload, { merge: true });
  } catch (err) {
    console.error('saveUserField failed', err);
    throw err;
  }
}

export function listenToSavedPlaces(uid: string, onData: (places: SavedPlace[]) => void): Unsubscribe {
  if (!db) {
    console.warn('listenToSavedPlaces: Firestore not initialized');
    onData([]);
    return () => {};
  }
  const ref = collection(db, 'users', uid, 'savedPlaces');
  const unsub = onSnapshot(ref, (snap) => {
    const places = snap.docs.map((docSnap) => {
      const data = docSnap.data() as SavedPlace;
      return {
        placeId: data.placeId || docSnap.id,
        ...data,
      };
    });
    const toMillis = (value: any) => {
      if (!value) return 0;
      if (typeof value === 'string') return Date.parse(value) || 0;
      if (value instanceof Date) return value.getTime();
      if (typeof value.toMillis === 'function') return value.toMillis();
      return 0;
    };
    places.sort((a, b) => toMillis(b.savedAt) - toMillis(a.savedAt));
    onData(places);
  }, (err) => {
    console.error('listenToSavedPlaces error', err);
    onData([]);
  });

  return () => unsub();
}

export async function upsertSavedPlace(uid: string, place: SavedPlace): Promise<void> {
  if (DEV_AUTH_BYPASS) return;
  if (!db) {
    console.warn('upsertSavedPlace: Firestore not initialized');
    return;
  }
  try {
    const ref = doc(db, 'users', uid, 'savedPlaces', place.placeId);
    const payload = stripUndefined(place);
    await setDoc(ref, payload, { merge: true });
  } catch (err) {
    console.error('upsertSavedPlace failed', err);
    throw err;
  }
}

export async function deleteSavedPlace(uid: string, placeId: string): Promise<void> {
  if (DEV_AUTH_BYPASS) return;
  if (!db) {
    console.warn('deleteSavedPlace: Firestore not initialized');
    return;
  }
  try {
    const ref = doc(db, 'users', uid, 'savedPlaces', placeId);
    await deleteDoc(ref);
  } catch (err) {
    console.error('deleteSavedPlace failed', err);
    throw err;
  }
}
