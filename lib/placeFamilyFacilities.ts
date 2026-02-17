import {
  db,
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  serverTimestamp,
} from './firebase';
import type { FamilyFacility, FamilyFacilityValue } from '../src/types/place';
import { generateFamilyFacilitiesSummary, normalizeFamilyFacilities } from '../src/utils/familyFacilities';

export async function loadPlaceFamilyFacilitiesByIds(placeIds: string[]): Promise<{
  familyFacilitiesById: Record<string, FamilyFacilityValue[]>;
  summaryById: Record<string, string>;
}> {
  if (!db || placeIds.length === 0) return { familyFacilitiesById: {}, summaryById: {} };
  const uniqueIds = [...new Set(placeIds.filter(Boolean))];
  const snaps = await Promise.all(uniqueIds.map((placeId) => getDoc(doc(db, 'places', placeId))));
  const familyFacilitiesById: Record<string, FamilyFacilityValue[]> = {};
  const summaryById: Record<string, string> = {};

  snaps.forEach((snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as { familyFacilities?: FamilyFacilityValue[]; familyFacilitiesSummary?: string };
    const familyFacilities = Array.isArray(data.familyFacilities) ? data.familyFacilities : [];
    familyFacilitiesById[snap.id] = familyFacilities;
    summaryById[snap.id] =
      typeof data.familyFacilitiesSummary === 'string'
        ? data.familyFacilitiesSummary
        : generateFamilyFacilitiesSummary(familyFacilities);
  });

  return { familyFacilitiesById, summaryById };
}

interface SubmitFamilyFacilitiesReportInput {
  placeId: string;
  userId: string;
  userDisplayName?: string;
  features: FamilyFacilityValue[];
  comment?: string;
}

export async function submitFamilyFacilitiesReport(input: SubmitFamilyFacilitiesReportInput): Promise<{ familyFacilities: FamilyFacilityValue[]; familyFacilitiesSummary: string }> {
  if (!db) throw new Error('Firestore not initialized');

  const selections = input.features
    .filter((item) => item.value === true)
    .map((item) => ({
      feature: item.feature as FamilyFacility,
      value: true as const,
      confidence: item.confidence || ('reported' as const),
      updatedAt: new Date().toISOString(),
    }));

  if (selections.length === 0) return { familyFacilities: [], familyFacilitiesSummary: 'Family info not yet confirmed.' };

  const placeRef = doc(db, 'places', input.placeId);
  const currentPlace = await getDoc(placeRef);
  const currentData = currentPlace.exists() ? (currentPlace.data() as { familyFacilities?: FamilyFacilityValue[] }) : {};

  await addDoc(collection(db, 'places', input.placeId, 'familyFacilitiesReports'), {
    userId: input.userId,
    userDisplayName: input.userDisplayName || null,
    selections,
    comment: input.comment || null,
    createdAt: serverTimestamp(),
  });

  const normalized = normalizeFamilyFacilities(currentData.familyFacilities || [], selections);
  const summary = generateFamilyFacilitiesSummary(normalized);

  await setDoc(placeRef, {
    familyFacilities: normalized,
    familyFacilitiesSummary: summary,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  import('./placeCache').then(m => m.markPlaceAsCommunityEnriched(input.placeId)).catch(() => {});
  import('../src/services/gamification').then(m => { m.awardPoints('family_facilities_report'); m.invalidateGamificationCache(); }).catch(() => {});

  return { familyFacilities: normalized, familyFacilitiesSummary: summary };
}

