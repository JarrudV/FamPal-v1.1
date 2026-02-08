import {
  db,
  collection,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from './firebase';
import type { FamilyFacility, FamilyFacilityValue } from '../src/types/place';
import { generateFamilyFacilitiesSummary } from '../src/utils/familyFacilities';

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

export async function submitFamilyFacilitiesReport(input: SubmitFamilyFacilitiesReportInput): Promise<void> {
  if (!db) throw new Error('Firestore not initialized');

  const selections = input.features
    .filter((item) => item.value === true)
    .map((item) => ({
      feature: item.feature as FamilyFacility,
      value: true as const,
      confidence: 'reported' as const,
    }));

  if (selections.length === 0) return;

  await addDoc(collection(db, 'places', input.placeId, 'familyFacilitiesReports'), {
    userId: input.userId,
    userDisplayName: input.userDisplayName || null,
    selections,
    comment: input.comment || null,
    createdAt: serverTimestamp(),
  });
}

