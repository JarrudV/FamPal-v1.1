import {
  db,
  collection,
  doc,
  getDoc,
  addDoc,
  setDoc,
  serverTimestamp,
} from './firebase';
import type { Place, UserAccessibilityNeeds, AccessibilityFeatureValue } from '../types';
import { generateAccessibilitySummary, normalizeAccessibility } from '../src/utils/accessibility';
import type { AccessibilityFeature } from '../src/types/place';

export const ACCESSIBILITY_RANK_WEIGHTS = {
  matchBoost: 3,
  conflictPenalty: -4,
  unknownPenalty: -1,
} as const;

const NEEDS_TO_FEATURES: Record<keyof UserAccessibilityNeeds, AccessibilityFeature[]> = {
  usesWheelchair: ['step_free_entry', 'ramp_access', 'lift_available', 'wide_doorways'],
  needsStepFree: ['step_free_entry', 'ramp_access'],
  needsAccessibleToilet: ['accessible_toilet'],
  prefersPavedPaths: ['paved_paths', 'smooth_surface'],
  usesPushchair: ['step_free_entry', 'paved_paths', 'smooth_surface', 'wide_doorways'],
};

const CONFLICT_FEATURES: Partial<Record<keyof UserAccessibilityNeeds, AccessibilityFeature[]>> = {
  usesWheelchair: ['steep_slopes', 'gravel_or_sand'],
  needsStepFree: ['steep_slopes'],
  prefersPavedPaths: ['gravel_or_sand'],
  usesPushchair: ['steep_slopes', 'gravel_or_sand'],
};

export async function loadPlaceAccessibilityByIds(placeIds: string[]): Promise<{
  accessibilityById: Record<string, AccessibilityFeatureValue[]>;
  summaryById: Record<string, string>;
}> {
  if (!db || placeIds.length === 0) return { accessibilityById: {}, summaryById: {} };
  const uniqueIds = [...new Set(placeIds.filter(Boolean))];
  const snaps = await Promise.all(uniqueIds.map((placeId) => getDoc(doc(db, 'places', placeId))));
  const accessibilityById: Record<string, AccessibilityFeatureValue[]> = {};
  const summaryById: Record<string, string> = {};
  snaps.forEach((snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as { accessibility?: AccessibilityFeatureValue[]; accessibilitySummary?: string };
    const accessibility = Array.isArray(data.accessibility) ? data.accessibility : [];
    accessibilityById[snap.id] = accessibility;
    summaryById[snap.id] = typeof data.accessibilitySummary === 'string'
      ? data.accessibilitySummary
      : generateAccessibilitySummary(accessibility);
  });
  return { accessibilityById, summaryById };
}

interface SubmitAccessibilityReportInput {
  placeId: string;
  userId: string;
  userDisplayName?: string;
  features: AccessibilityFeatureValue[];
  comment?: string;
}

export async function submitAccessibilityReport(input: SubmitAccessibilityReportInput): Promise<{ accessibility: AccessibilityFeatureValue[]; accessibilitySummary: string }> {
  if (!db) throw new Error('Firestore not initialized');

  const placeRef = doc(db, 'places', input.placeId);
  const currentPlace = await getDoc(placeRef);
  const currentData = currentPlace.exists() ? (currentPlace.data() as { accessibility?: AccessibilityFeatureValue[] }) : {};

  await addDoc(collection(db, 'places', input.placeId, 'accessibilityReports'), {
    userId: input.userId,
    userDisplayName: input.userDisplayName || null,
    selections: input.features
      .filter((item) => item.value === true)
      .map((item) => ({
        feature: item.feature,
        value: true,
        confidence: 'reported',
      })),
    comment: input.comment || null,
    createdAt: serverTimestamp(),
  });

  const normalized = normalizeAccessibility(currentData.accessibility || [], input.features);
  const summary = generateAccessibilitySummary(normalized);

  await setDoc(placeRef, {
    accessibility: normalized,
    accessibilitySummary: summary,
    updatedAt: serverTimestamp(),
  }, { merge: true });

  import('./placeCache').then(m => m.markPlaceAsCommunityEnriched(input.placeId)).catch(() => {});
  import('../src/services/gamification').then(m => { m.awardPoints('accessibility_report'); m.invalidateGamificationCache(); }).catch(() => {});

  return {
    accessibility: normalized,
    accessibilitySummary: summary,
  };
}

function placeFeatureValue(accessibility: AccessibilityFeatureValue[] = [], feature: AccessibilityFeature): boolean | 'unknown' {
  const found = accessibility.find((item) => item.feature === feature);
  if (!found || found.confidence === 'unknown') return 'unknown';
  return found.value;
}

function scorePlaceByNeeds(place: Place, needs: UserAccessibilityNeeds): number {
  const accessibility = place.accessibility || [];
  let score = 0;

  (Object.keys(NEEDS_TO_FEATURES) as Array<keyof UserAccessibilityNeeds>).forEach((needKey) => {
    if (!needs[needKey]) return;
    const needFeatures = NEEDS_TO_FEATURES[needKey];
    needFeatures.forEach((feature) => {
      const value = placeFeatureValue(accessibility, feature);
      if (value === true) score += ACCESSIBILITY_RANK_WEIGHTS.matchBoost;
      else if (value === false) score += ACCESSIBILITY_RANK_WEIGHTS.conflictPenalty;
      else score += ACCESSIBILITY_RANK_WEIGHTS.unknownPenalty;
    });

    const conflictFeatures = CONFLICT_FEATURES[needKey] || [];
    conflictFeatures.forEach((feature) => {
      const value = placeFeatureValue(accessibility, feature);
      if (value === true) score += ACCESSIBILITY_RANK_WEIGHTS.conflictPenalty;
      else if (value === 'unknown') score += ACCESSIBILITY_RANK_WEIGHTS.unknownPenalty;
    });
  });

  return score;
}

export function rankPlacesWithAccessibilityNeeds(places: Place[], needs?: UserAccessibilityNeeds): Place[] {
  if (!needs) return places;
  const hasNeeds = Object.values(needs).some(Boolean);
  if (!hasNeeds) return places;

  return [...places].sort((a, b) => {
    const scoreA = scorePlaceByNeeds(a, needs);
    const scoreB = scorePlaceByNeeds(b, needs);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return (b.rating || 0) - (a.rating || 0);
  });
}
