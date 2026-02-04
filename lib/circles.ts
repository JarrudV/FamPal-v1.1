import {
  db,
  collection,
  collectionGroup,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  documentId,
  deleteDoc,
} from './firebase';

export interface CircleDoc {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  joinCode: string;
}

export interface CircleMemberDoc {
  uid: string;
  role: 'owner' | 'member';
  displayName?: string;
  email?: string;
  joinedAt: string;
}

export interface CirclePlaceDoc {
  placeId: string;
  savedByUid: string;
  savedByName: string;
  savedAt: string;
  note?: string;
  placeSummary: {
    placeId: string;
    name: string;
    imageUrl?: string;
    type?: string;
    mapsUrl?: string;
  };
}

export interface CircleCommentDoc {
  id: string;
  placeId: string;
  uid: string;
  text: string;
  createdAt: string;
  displayName?: string;
}

export interface CircleMemoryDoc {
  id: string;
  memoryId: string;
  createdAt: string;
  createdByUid: string;
  createdByName: string;
  memorySnapshot: {
    caption: string;
    placeId?: string;
    placeName: string;
    photoUrl?: string;
    photoUrls?: string[];
    photoThumbUrl?: string;
    photoThumbUrls?: string[];
    date: string;
  };
}

type Unsubscribe = () => void;

function stripUndefined<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefined(item))
      .filter((item) => item !== undefined) as T;
  }
  if (value && typeof value === 'object') {
    const cleaned: Record<string, any> = {};
    Object.entries(value as Record<string, any>).forEach(([key, val]) => {
      const nextVal = stripUndefined(val);
      if (nextVal !== undefined) {
        cleaned[key] = nextVal;
      }
    });
    return cleaned as T;
  }
  return value;
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createCircle(name: string, user: { uid: string; displayName?: string | null; email?: string | null }) {
  console.log('[FamPals] Creating circle:', name, 'for user:', user.uid);
  if (!db) throw new Error('Firestore not initialized');
  const circleRef = doc(collection(db, 'circles'));
  const joinCode = generateJoinCode();
  const createdAt = new Date().toISOString();
  console.log('[FamPals] Circle ref:', circleRef.id, 'joinCode:', joinCode);
  await setDoc(circleRef, stripUndefined({
    name,
    createdBy: user.uid,
    createdAt,
    joinCode,
  }));
  console.log('[FamPals] Circle document created successfully');

  const memberRef = doc(db, 'circles', circleRef.id, 'members', user.uid);
  await setDoc(memberRef, stripUndefined({
    uid: user.uid,
    role: 'owner',
    displayName: user.displayName || undefined,
    email: user.email || undefined,
    joinedAt: createdAt,
  }));

  return {
    id: circleRef.id,
    name,
    createdBy: user.uid,
    createdAt,
    joinCode,
  } as CircleDoc;
}

export async function joinCircleByCode(code: string, user: { uid: string; displayName?: string | null; email?: string | null }) {
  if (!db) throw new Error('Firestore not initialized');
  const circlesRef = collection(db, 'circles');
  const q = query(circlesRef, where('joinCode', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error('No circle found for that code.');
  }
  const circleDoc = snap.docs[0];
  const circleData = circleDoc.data();
  const memberRef = doc(db, 'circles', circleDoc.id, 'members', user.uid);
  await setDoc(memberRef, stripUndefined({
    uid: user.uid,
    role: 'member',
    displayName: user.displayName || undefined,
    email: user.email || undefined,
    joinedAt: new Date().toISOString(),
  }), { merge: true });

  return {
    id: circleDoc.id,
    name: circleData.name,
    createdBy: circleData.createdBy,
    createdAt: circleData.createdAt,
    joinCode: circleData.joinCode,
  } as CircleDoc;
}

export function listenToUserCircles(uid: string, onData: (circles: CircleDoc[]) => void): Unsubscribe {
  console.log('[FamPals] listenToUserCircles called for uid:', uid);
  if (!db) {
    console.error('[FamPals] listenToUserCircles: db is null');
    onData([]);
    return () => {};
  }
  const membersQuery = query(
    collectionGroup(db, 'members'),
    where('uid', '==', uid)
  );
  console.log('[FamPals] Setting up collectionGroup query on members');

  const unsub = onSnapshot(membersQuery, async (snap) => {
    console.log('[FamPals] Members query result - docs count:', snap.docs.length);
    if (snap.docs.length === 0) {
      console.log('[FamPals] No member docs found for this user');
      onData([]);
      return;
    }
    const circleDocs = await Promise.all(
      snap.docs.map(async (memberDoc) => {
        console.log('[FamPals] Processing member doc:', memberDoc.id, memberDoc.data());
        const circleRef = memberDoc.ref.parent.parent;
        if (!circleRef) {
          console.log('[FamPals] No parent circle ref found');
          return null;
        }
        console.log('[FamPals] Fetching circle:', circleRef.id);
        const circleSnap = await getDoc(circleRef);
        if (!circleSnap.exists()) {
          console.log('[FamPals] Circle doc does not exist');
          return null;
        }
        const data = circleSnap.data();
        console.log('[FamPals] Found circle:', data.name);
        return {
          id: circleSnap.id,
          name: data.name,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          joinCode: data.joinCode,
        } as CircleDoc;
      })
    );
    const filtered = circleDocs.filter(Boolean) as CircleDoc[];
    console.log('[FamPals] Final circles list:', filtered.length, 'circles');
    onData(filtered);
  }, (error: any) => {
    console.error('[FamPals] listenToUserCircles error:', error?.message, error?.code);
    onData([]);
  });

  return () => unsub();
}

export function listenToCircleMembers(circleId: string, onData: (members: CircleMemberDoc[]) => void): Unsubscribe {
  if (!db) {
    onData([]);
    return () => {};
  }
  const ref = collection(db, 'circles', circleId, 'members');
  const unsub = onSnapshot(ref, (snap) => {
    const members = snap.docs.map((docSnap) => docSnap.data() as CircleMemberDoc);
    onData(members);
  });
  return () => unsub();
}

export function listenToCirclePlaces(circleId: string, onData: (places: CirclePlaceDoc[]) => void): Unsubscribe {
  if (!db) {
    onData([]);
    return () => {};
  }
  const ref = collection(db, 'circles', circleId, 'places');
  const unsub = onSnapshot(ref, (snap) => {
    const places = snap.docs.map((docSnap) => docSnap.data() as CirclePlaceDoc);
    onData(places);
  });
  return () => unsub();
}

export async function saveCirclePlace(circleId: string, place: CirclePlaceDoc) {
  if (!db) throw new Error('Firestore not initialized');
  const placeRef = doc(db, 'circles', circleId, 'places', place.placeId);
  await setDoc(placeRef, stripUndefined(place), { merge: true });
}

export async function removeCirclePlace(circleId: string, placeId: string) {
  if (!db) throw new Error('Firestore not initialized');
  const placeRef = doc(db, 'circles', circleId, 'places', placeId);
  await deleteDoc(placeRef);
}

export function listenToCircleComments(circleId: string, placeId: string, onData: (comments: CircleCommentDoc[]) => void): Unsubscribe {
  if (!db) {
    onData([]);
    return () => {};
  }
  const ref = collection(db, 'circles', circleId, 'placeComments');
  const q = query(ref, where('placeId', '==', placeId));
  const unsub = onSnapshot(q, (snap) => {
    const comments = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<CircleCommentDoc, 'id'>),
    }));
    comments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    onData(comments);
  });
  return () => unsub();
}

export async function addCircleComment(circleId: string, placeId: string, comment: Omit<CircleCommentDoc, 'id' | 'placeId'>) {
  if (!db) throw new Error('Firestore not initialized');
  const ref = collection(db, 'circles', circleId, 'placeComments');
  await addDoc(ref, stripUndefined({ ...comment, placeId }));
}

export function listenToCircleMemories(circleId: string, onData: (memories: CircleMemoryDoc[]) => void): Unsubscribe {
  if (!db) {
    onData([]);
    return () => {};
  }
  const ref = collection(db, 'circles', circleId, 'memories');
  const unsub = onSnapshot(ref, (snap) => {
    const memories = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<CircleMemoryDoc, 'id'>),
    }));
    memories.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    onData(memories);
  });
  return () => unsub();
}

export async function addCircleMemory(circleId: string, memory: CircleMemoryDoc) {
  if (!db) throw new Error('Firestore not initialized');
  const ref = doc(db, 'circles', circleId, 'memories', memory.memoryId);
  await setDoc(ref, stripUndefined(memory), { merge: true });
}
