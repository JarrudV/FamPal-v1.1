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
  isPartnerCircle?: boolean;
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

export async function createPartnerCircle(
  name: string, 
  user: { uid: string; displayName?: string | null; email?: string | null },
  partner: { uid: string; displayName?: string | null; email?: string | null }
) {
  console.log('[FamPals] Creating partner circle:', name, 'for user:', user.uid, 'with partner:', partner.uid);
  if (!db) throw new Error('Firestore not initialized');
  const circleRef = doc(collection(db, 'circles'));
  const joinCode = generateJoinCode();
  const createdAt = new Date().toISOString();
  
  await setDoc(circleRef, stripUndefined({
    name,
    createdBy: user.uid,
    createdAt,
    joinCode,
    isPartnerCircle: true,
  }));
  
  const ownerRef = doc(db, 'circles', circleRef.id, 'members', user.uid);
  await setDoc(ownerRef, stripUndefined({
    uid: user.uid,
    role: 'owner',
    displayName: user.displayName || undefined,
    email: user.email || undefined,
    joinedAt: createdAt,
  }));
  
  const partnerRef = doc(db, 'circles', circleRef.id, 'members', partner.uid);
  await setDoc(partnerRef, stripUndefined({
    uid: partner.uid,
    role: 'member',
    displayName: partner.displayName || undefined,
    email: partner.email || undefined,
    joinedAt: createdAt,
  }));

  return {
    id: circleRef.id,
    name,
    createdBy: user.uid,
    createdAt,
    joinCode,
    isPartnerCircle: true,
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
  
  // First try a direct query on circles collection to verify connectivity
  console.log('[FamPals] Testing Firestore connectivity...');
  getDocs(collection(db, 'circles')).then(snap => {
    console.log('[FamPals] Direct circles query returned', snap.docs.length, 'circles');
  }).catch(err => {
    console.error('[FamPals] Direct circles query failed:', err);
  });

  const membersQuery = query(
    collectionGroup(db, 'members'),
    where('uid', '==', uid)
  );
  console.log('[FamPals] Setting up collectionGroup query on members for uid:', uid);

  const unsub = onSnapshot(membersQuery, async (snap) => {
    console.log('[FamPals] Members query result - docs count:', snap.docs.length, 'metadata:', snap.metadata);
    if (snap.docs.length === 0) {
      console.log('[FamPals] No member docs found for this user - user may need to create or join a circle');
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
        console.log('[FamPals] Found circle:', data.name, 'isPartnerCircle:', data.isPartnerCircle);
        return {
          id: circleSnap.id,
          name: data.name,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          joinCode: data.joinCode,
          isPartnerCircle: data.isPartnerCircle || false,
        } as CircleDoc;
      })
    );
    const filtered = circleDocs.filter(Boolean) as CircleDoc[];
    console.log('[FamPals] Final circles list:', filtered.length, 'circles');
    onData(filtered);
  }, (error: any) => {
    console.error('[FamPals] listenToUserCircles error:', error?.message, error?.code, error);
    if (error?.code === 'failed-precondition') {
      console.error('[FamPals] MISSING INDEX: The collectionGroup query requires a Firestore index. Please check Firebase Console > Firestore > Indexes');
    }
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

export async function deleteCircle(circleId: string, userId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  // Get the circle to verify ownership
  const circleRef = doc(db, 'circles', circleId);
  const circleSnap = await getDoc(circleRef);
  
  if (!circleSnap.exists()) {
    throw new Error('Circle not found');
  }
  
  const circleData = circleSnap.data();
  if (circleData.createdBy !== userId) {
    throw new Error('Only the circle owner can delete it');
  }
  
  // Delete all subcollections first (members, places, memories, placeComments)
  const subcollections = ['members', 'places', 'memories', 'placeComments'];
  
  for (const subcol of subcollections) {
    const subcolRef = collection(db, 'circles', circleId, subcol);
    const subcolSnap = await getDocs(subcolRef);
    await Promise.all(subcolSnap.docs.map(docSnap => deleteDoc(docSnap.ref)));
  }
  
  // Delete the circle document
  await deleteDoc(circleRef);
  console.log('[FamPals] Circle deleted:', circleId);
}

export async function leaveCircle(circleId: string, userId: string): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');
  
  // Get the circle to check if user is owner
  const circleRef = doc(db, 'circles', circleId);
  const circleSnap = await getDoc(circleRef);
  
  if (!circleSnap.exists()) {
    throw new Error('Circle not found');
  }
  
  const circleData = circleSnap.data();
  if (circleData.createdBy === userId) {
    throw new Error('Owner cannot leave the circle. Delete it instead.');
  }
  
  // Remove the member
  const memberRef = doc(db, 'circles', circleId, 'members', userId);
  await deleteDoc(memberRef);
  console.log('[FamPals] User left circle:', circleId);
}
