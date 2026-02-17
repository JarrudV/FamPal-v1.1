import {
  auth,
  db,
  addDoc,
  collection,
  doc,
  getDocs,
  limit as firestoreLimit,
  query,
  serverTimestamp,
  setDoc,
} from '../../lib/firebase';

export type KidPrefSignal =
  | 'kids_menu'
  | 'high_chair'
  | 'play_area_jungle_gym'
  | 'outdoor_space'
  | 'stroller_friendly';

export type AccessibilitySignal =
  | 'wheelchair_friendly'
  | 'accessible_toilets'
  | 'step_free'
  | 'quiet_friendly';

export interface CommunityReportPayload {
  kidPrefs: Partial<Record<KidPrefSignal, boolean>>;
  accessibility: Partial<Record<AccessibilitySignal, boolean>>;
  notes?: string;
  photoRefs?: string[];
}

export interface CommunityReportDoc extends CommunityReportPayload {
  id: string;
  placeId: string;
  userId: string;
  userDisplayName?: string | null;
  status: 'published';
  helpfulVotes: number;
  moderatorVerified: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AggregatedSignal {
  positiveWeight: number;
  totalWeight: number;
  confidence: number;
  positive: boolean;
}

export interface AggregatedReportSignals {
  kidPrefs: Record<KidPrefSignal, AggregatedSignal>;
  accessibility: Record<AccessibilitySignal, AggregatedSignal>;
  reportCount: number;
  weightedReportCount: number;
}

const KID_PREF_KEYS: KidPrefSignal[] = [
  'kids_menu',
  'high_chair',
  'play_area_jungle_gym',
  'outdoor_space',
  'stroller_friendly',
];

const ACCESSIBILITY_KEYS: AccessibilitySignal[] = [
  'wheelchair_friendly',
  'accessible_toilets',
  'step_free',
  'quiet_friendly',
];

function toBooleanRecord<T extends string>(keys: T[], input?: Partial<Record<T, boolean>>): Partial<Record<T, boolean>> {
  const out: Partial<Record<T, boolean>> = {};
  keys.forEach((key) => {
    const value = input?.[key];
    if (typeof value === 'boolean') out[key] = value;
  });
  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function reportWeight(report: Pick<CommunityReportDoc, 'helpfulVotes' | 'moderatorVerified'>): number {
  const helpfulBoost = clamp((report.helpfulVotes || 0) * 0.15, 0, 2.5);
  const moderatorBoost = report.moderatorVerified ? 2 : 0;
  return 1 + helpfulBoost + moderatorBoost;
}

function aggregateByKeys<T extends string>(
  reports: CommunityReportDoc[],
  keys: T[],
  field: 'kidPrefs' | 'accessibility'
): Record<T, AggregatedSignal> {
  const output = {} as Record<T, AggregatedSignal>;
  keys.forEach((key) => {
    let totalWeight = 0;
    let positiveWeight = 0;
    reports.forEach((report) => {
      const value = report[field]?.[key as keyof typeof report[typeof field]];
      if (typeof value !== 'boolean') return;
      const weight = reportWeight(report);
      totalWeight += weight;
      if (value) positiveWeight += weight;
    });
    const ratio = totalWeight > 0 ? positiveWeight / totalWeight : 0;
    const confidenceBase = totalWeight > 0 ? clamp(totalWeight / 8, 0, 1) : 0;
    const confidence = Number(clamp(confidenceBase * (0.6 + ratio * 0.4), 0, 0.99).toFixed(2));
    output[key] = {
      positiveWeight: Number(positiveWeight.toFixed(2)),
      totalWeight: Number(totalWeight.toFixed(2)),
      confidence,
      positive: ratio >= 0.5 && confidence >= 0.35,
    };
  });
  return output;
}

export async function createReport(
  placeId: string,
  payload: CommunityReportPayload
): Promise<CommunityReportDoc> {
  if (!db) throw new Error('Firestore not initialized');
  const user = auth?.currentUser;
  if (!user) throw new Error('Authentication required');
  if (!placeId?.trim()) throw new Error('placeId is required');

  const normalizedPayload: CommunityReportPayload = {
    kidPrefs: toBooleanRecord(KID_PREF_KEYS, payload.kidPrefs),
    accessibility: toBooleanRecord(ACCESSIBILITY_KEYS, payload.accessibility),
    notes: (payload.notes?.trim() || '').slice(0, 1000),
    photoRefs: (payload.photoRefs || []).filter(Boolean).slice(0, 6).map((ref) => String(ref).slice(0, 300)),
  };

  const docPayload = {
    placeId,
    userId: user.uid,
    userDisplayName: user.displayName || user.email || null,
    status: 'published' as const,
    helpfulVotes: 0,
    moderatorVerified: false,
    kidPrefs: normalizedPayload.kidPrefs,
    accessibility: normalizedPayload.accessibility,
    notes: normalizedPayload.notes || '',
    photoRefs: normalizedPayload.photoRefs || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'places', placeId, 'reports'), docPayload);
  const aggregate = await aggregateReportSignals(placeId);
  await setDoc(
    doc(db, 'places', placeId),
    {
      reportTrust: {
        kidPrefs: aggregate.kidPrefs,
        accessibility: aggregate.accessibility,
        reportCount: aggregate.reportCount,
        weightedReportCount: aggregate.weightedReportCount,
        lastAggregatedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return {
    id: ref.id,
    ...docPayload,
  };
}

export async function listReportsForPlace(placeId: string, maxItems = 100): Promise<CommunityReportDoc[]> {
  if (!db || !placeId) return [];
  const limited = Math.max(1, Math.min(maxItems, 200));
  const snap = await getDocs(query(collection(db, 'places', placeId, 'reports'), firestoreLimit(limited)));
  const docs = snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<CommunityReportDoc, 'id'>) }));
  docs.sort((a, b) => {
    const aMs = (a.createdAt as any)?.toMillis?.() || 0;
    const bMs = (b.createdAt as any)?.toMillis?.() || 0;
    return bMs - aMs;
  });
  return docs;
}

export async function aggregateReportSignals(placeId: string): Promise<AggregatedReportSignals> {
  const reports = await listReportsForPlace(placeId, 500);
  const published = reports.filter((report) => report.status === 'published');
  const kidPrefs = aggregateByKeys(published, KID_PREF_KEYS, 'kidPrefs');
  const accessibility = aggregateByKeys(published, ACCESSIBILITY_KEYS, 'accessibility');
  const weightedReportCount = Number(
    published.reduce((sum, report) => sum + reportWeight(report), 0).toFixed(2)
  );
  return {
    kidPrefs,
    accessibility,
    reportCount: published.length,
    weightedReportCount,
  };
}
