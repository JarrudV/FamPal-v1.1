type FamilyFacility =
  | 'playground'
  | 'baby_changing_table'
  | 'stroller_friendly'
  | 'high_chairs'
  | 'kids_menu'
  | 'family_restroom'
  | 'nursing_room'
  | 'child_friendly_space';

type FamilyFacilityConfidence = 'verified' | 'reported' | 'unknown';

export interface FamilyFacilityValue {
  feature: FamilyFacility;
  value: boolean;
  confidence: FamilyFacilityConfidence;
  sourcesCount?: number;
  updatedAt?: string;
}

export interface FamilyFacilitySelection {
  feature: FamilyFacility;
  value: true;
  confidence: 'reported';
}

export interface FamilyFacilityReportDoc {
  id: string;
  createdAt?: { toMillis?: () => number } | null;
  selections?: FamilyFacilitySelection[];
  features?: FamilyFacilityValue[];
}

const FEATURE_ORDER: FamilyFacility[] = [
  'playground',
  'baby_changing_table',
  'stroller_friendly',
  'high_chairs',
  'kids_menu',
  'family_restroom',
  'nursing_room',
  'child_friendly_space',
];

export function generateFamilyFacilitiesSummary(facilities: FamilyFacilityValue[] = []): string {
  const confirmed = facilities.filter((item) => item.value === true && item.confidence !== 'unknown');
  if (confirmed.length === 0) {
    return 'Family info not yet confirmed.';
  }

  const isTrue = (feature: FamilyFacility) =>
    facilities.some((item) => item.feature === feature && item.value === true && item.confidence !== 'unknown');

  const parts: string[] = [];
  if (isTrue('playground')) parts.push('Playground available');
  if (isTrue('baby_changing_table')) parts.push('Baby changing table available');
  if (isTrue('stroller_friendly')) parts.push('Stroller-friendly access reported');

  const comfort: string[] = [];
  if (isTrue('high_chairs')) comfort.push('high chairs');
  if (isTrue('kids_menu')) comfort.push("kids' menu");
  if (comfort.length > 0) parts.push(`${comfort.join(' and ')} available`);

  const support: string[] = [];
  if (isTrue('family_restroom')) support.push('family restroom');
  if (isTrue('nursing_room')) support.push('nursing room');
  if (isTrue('child_friendly_space')) support.push('child-friendly space');
  if (support.length > 0) parts.push(`${support.join(', ')} reported`);

  return parts.length > 0 ? `${parts.join('. ')}.` : 'Family info not yet confirmed.';
}

function reportTimestampMillis(report: FamilyFacilityReportDoc): number {
  return report.createdAt?.toMillis?.() || 0;
}

function getReportSelections(report: FamilyFacilityReportDoc): FamilyFacilitySelection[] {
  if (Array.isArray(report.selections)) {
    return report.selections.filter((s): s is FamilyFacilitySelection => !!s && s.value === true);
  }
  if (Array.isArray(report.features)) {
    return report.features
      .filter((f) => f && f.value === true)
      .map((f) => ({ feature: f.feature, value: true, confidence: 'reported' as const }));
  }
  return [];
}

export function aggregateFamilyFacilitiesFromReports(reports: FamilyFacilityReportDoc[]): {
  familyFacilities: FamilyFacilityValue[];
  familyFacilitiesSummary: string;
} {
  const sorted = [...reports].sort((a, b) => {
    const ta = reportTimestampMillis(a);
    const tb = reportTimestampMillis(b);
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });

  const byFeature = new Map<FamilyFacility, { sourcesCount: number; updatedAtMillis: number }>();

  sorted.forEach((report) => {
    const millis = reportTimestampMillis(report);
    const seen = new Set<FamilyFacility>();
    getReportSelections(report).forEach((selection) => {
      const feature = selection.feature;
      if (seen.has(feature)) return;
      seen.add(feature);
      const current = byFeature.get(feature) || { sourcesCount: 0, updatedAtMillis: 0 };
      byFeature.set(feature, {
        sourcesCount: current.sourcesCount + 1,
        updatedAtMillis: Math.max(current.updatedAtMillis, millis),
      });
    });
  });

  const familyFacilities: FamilyFacilityValue[] = FEATURE_ORDER.map((feature) => {
    const stat = byFeature.get(feature);
    if (!stat || stat.sourcesCount === 0) {
      return { feature, value: false, confidence: 'unknown' };
    }
    return {
      feature,
      value: true,
      confidence: 'reported',
      sourcesCount: stat.sourcesCount,
      updatedAt: new Date(stat.updatedAtMillis).toISOString(),
    };
  });

  return {
    familyFacilities,
    familyFacilitiesSummary: generateFamilyFacilitiesSummary(familyFacilities),
  };
}

