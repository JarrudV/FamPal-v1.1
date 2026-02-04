import { db, doc, getDoc, setDoc, serverTimestamp } from './firebase';

export function getPartnerThreadId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export async function ensurePartnerThread(uidA: string, uidB: string): Promise<string> {
  if (!db) {
    throw new Error('Firestore not initialized');
  }
  const threadId = getPartnerThreadId(uidA, uidB);
  const ref = doc(db, 'partnerThreads', threadId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      members: [uidA, uidB],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: 'active',
    });
  } else {
    const data = snap.data() || {};
    if (data.status === 'closed') {
      await setDoc(ref, { status: 'active', updatedAt: serverTimestamp() }, { merge: true });
    }
  }
  return threadId;
}
