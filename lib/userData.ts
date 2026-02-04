import { db, doc, onSnapshot, setDoc, deleteField } from './firebase';

type Unsubscribe = () => void;

export function listenToUserDoc(uid: string, onData: (data: any | null) => void): Unsubscribe {
  if (!db) {
    console.warn('listenToUserDoc: Firestore not initialized');
    return () => {};
  }
  const userDocRef = doc(db, 'users', uid);
  console.time(`listen:user:${uid}`);
  const unsub = onSnapshot(userDocRef, (snap) => {
    console.timeEnd(`listen:user:${uid}`);
    if (snap.exists()) {
      onData(snap.data());
    } else {
      onData(null);
    }
  }, (err) => {
    console.error('listenToUserDoc error', err);
    onData(null);
  });

  return () => {
    unsub();
  };
}

function stripUndefined(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;
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
  if (!db) {
    console.warn('upsertUserProfile: Firestore not initialized');
    return;
  }
  try {
    const userDocRef = doc(db, 'users', uid);
    const dataToSave = {
      profile: stripUndefined(profile) || {},
      lastLoginAt: new Date().toISOString(),
    };
    console.time(`upsert:user:${uid}`);
    await setDoc(userDocRef, dataToSave, { merge: true });
    console.timeEnd(`upsert:user:${uid}`);
  } catch (err) {
    console.error('upsertUserProfile failed', err);
    throw err;
  }
}

export async function saveUserField(uid: string, key: string, value: any) {
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
