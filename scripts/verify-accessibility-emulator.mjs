import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-fampals';
const app = initializeApp({
  apiKey: 'demo-key',
  authDomain: `${projectId}.firebaseapp.com`,
  projectId,
});

const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
await signInAnonymously(auth);
const uid = auth.currentUser?.uid;
if (!uid) throw new Error('No signed-in user from auth emulator');

const db = getFirestore(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);

const placeId = `verify_${Date.now()}`;
const reportsRef = collection(db, 'places', placeId, 'accessibilityReports');

const created = await addDoc(reportsRef, {
  userId: uid,
  createdAt: serverTimestamp(),
  comment: 'emulator verification',
  selections: [
    { feature: 'step_free_entry', value: true, confidence: 'reported' },
    { feature: 'accessible_toilet', value: true, confidence: 'reported' },
  ],
});

const reportSnap = await getDoc(created);
if (!reportSnap.exists()) throw new Error('Report doc was not created');

const placeRef = doc(db, 'places', placeId);
let placeData = null;
for (let i = 0; i < 40; i += 1) {
  const snap = await getDoc(placeRef);
  if (snap.exists()) {
    const data = snap.data();
    if (Array.isArray(data.accessibility) && typeof data.accessibilitySummary === 'string') {
      placeData = data;
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 500));
}

if (!placeData) throw new Error('Function did not update place accessibility fields in time');

const stepFree = placeData.accessibility.find((f) => f.feature === 'step_free_entry');
if (!stepFree || stepFree.value !== true || stepFree.confidence !== 'reported') {
  throw new Error('Aggregated step_free_entry is incorrect');
}
if (typeof placeData.accessibilitySummary !== 'string' || placeData.accessibilitySummary.length === 0) {
  throw new Error('accessibilitySummary missing');
}

let blocked = false;
try {
  await setDoc(placeRef, { accessibilitySummary: 'client overwrite' }, { merge: true });
} catch (err) {
  blocked = String(err).includes('permission-denied') || String(err).includes('Missing or insufficient permissions');
}
if (!blocked) throw new Error('Rules did not block client write to places/{placeId}');

console.log('VERIFIED: report create, function aggregation, and rules protection all passed.');
