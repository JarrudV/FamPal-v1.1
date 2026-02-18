import {
  db,
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  serverTimestamp,
} from './firebase';
import type { PetFriendlyFeature, PetFriendlyFeatureValue } from '../src/types/place';
import { PET_FRIENDLY_FEATURE_LABELS } from '../src/types/place';

function generatePetFriendlySummary(features: PetFriendlyFeatureValue[]): string {
  const confirmed = features.filter((f) => f.value === true && f.confidence !== 'unknown');
  if (confirmed.length === 0) return 'Pet-friendly info not yet confirmed.';
  const labels = confirmed.map((f) => PET_FRIENDLY_FEATURE_LABELS[f.feature]).filter(Boolean);
  if (labels.length <= 3) return labels.join(', ') + '.';
  return labels.slice(0, 3).join(', ') + ` and ${labels.length - 3} more.`;
}

function normalizePetFriendly(
  existing: PetFriendlyFeatureValue[],
  incoming: PetFriendlyFeatureValue[]
): PetFriendlyFeatureValue[] {
  const map = new Map<PetFriendlyFeature, PetFriendlyFeatureValue>();
  for (const item of existing) {
    map.set(item.feature, item);
  }
  for (const item of incoming) {
    const prev = map.get(item.feature);
    if (!prev) {
      map.set(item.feature, { ...item, sourcesCount: 1 });
    } else {
      const newConfidence =
        item.confidence === 'verified' || prev.confidence === 'verified' ? 'verified' : 'reported';
      map.set(item.feature, {
        ...prev,
        value: item.value,
        confidence: newConfidence,
        sourcesCount: (prev.sourcesCount || 1) + 1,
        updatedAt: item.updatedAt || new Date().toISOString(),
      });
    }
  }
  return Array.from(map.values());
}

export async function loadPlacePetFriendlyByIds(placeIds: string[]): Promise<{
  petFriendlyById: Record<string, PetFriendlyFeatureValue[]>;
  summaryById: Record<string, string>;
}> {
  if (!db || placeIds.length === 0) return { petFriendlyById: {}, summaryById: {} };
  const uniqueIds = [...new Set(placeIds.filter(Boolean))];
  const snaps = await Promise.all(uniqueIds.map((placeId) => getDoc(doc(db, 'places', placeId))));
  const petFriendlyById: Record<string, PetFriendlyFeatureValue[]> = {};
  const summaryById: Record<string, string> = {};

  snaps.forEach((snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as { petFriendly?: PetFriendlyFeatureValue[]; petFriendlySummary?: string };
    const petFriendly = Array.isArray(data.petFriendly) ? data.petFriendly : [];
    petFriendlyById[snap.id] = petFriendly;
    summaryById[snap.id] =
      typeof data.petFriendlySummary === 'string'
        ? data.petFriendlySummary
        : generatePetFriendlySummary(petFriendly);
  });

  return { petFriendlyById, summaryById };
}

interface SubmitPetFriendlyReportInput {
  placeId: string;
  userId: string;
  userDisplayName?: string;
  features: PetFriendlyFeatureValue[];
  comment?: string;
}

export async function submitPetFriendlyReport(input: SubmitPetFriendlyReportInput): Promise<{ petFriendly: PetFriendlyFeatureValue[]; petFriendlySummary: string }> {
  if (!db) throw new Error('Firestore not initialized');

  const selections = input.features
    .filter((item) => item.value === true)
    .map((item) => ({
      feature: item.feature as PetFriendlyFeature,
      value: true as const,
      confidence: item.confidence || ('reported' as const),
      updatedAt: new Date().toISOString(),
    }));

  if (selections.length === 0) return { petFriendly: [], petFriendlySummary: 'Pet-friendly info not yet confirmed.' };

  const placeRef = doc(db, 'places', input.placeId);
  const currentPlace = await getDoc(placeRef);
  const currentData = currentPlace.exists() ? (currentPlace.data() as { petFriendly?: PetFriendlyFeatureValue[] }) : {};

  await addDoc(collection(db, 'places', input.placeId, 'petFriendlyReports'), {
    userId: input.userId,
    userDisplayName: input.userDisplayName || null,
    selections,
    comment: input.comment || null,
    createdAt: serverTimestamp(),
  });

  const normalized = normalizePetFriendly(currentData.petFriendly || [], selections);
  const summary = generatePetFriendlySummary(normalized);

  await setDoc(placeRef, {
    petFriendly: normalized,
    petFriendlySummary: summary,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  import('./placeCache').then(m => m.markPlaceAsCommunityEnriched(input.placeId)).catch(() => {});
  import('../src/services/gamification').then(m => { m.awardPoints('pet_friendly_report'); m.invalidateGamificationCache(); }).catch(() => {});

  return { petFriendly: normalized, petFriendlySummary: summary };
}
