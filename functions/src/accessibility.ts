type AccessibilityFeature =
  | 'step_free_entry'
  | 'ramp_access'
  | 'lift_available'
  | 'wide_doorways'
  | 'paved_paths'
  | 'smooth_surface'
  | 'accessible_toilet'
  | 'accessible_parking'
  | 'seating_available'
  | 'table_service_space'
  | 'steep_slopes'
  | 'gravel_or_sand';

type AccessibilityConfidence = 'verified' | 'reported' | 'unknown';

export interface AccessibilityFeatureValue {
  feature: AccessibilityFeature;
  value: boolean;
  confidence: AccessibilityConfidence;
  sourcesCount?: number;
  updatedAt?: string;
}

export interface AccessibilitySelection {
  feature: AccessibilityFeature;
  value: true;
  confidence: 'reported';
}

export interface AccessibilityReportDoc {
  id: string;
  createdAt?: { toMillis?: () => number } | null;
  selections?: AccessibilitySelection[];
  features?: AccessibilityFeatureValue[];
}

const FEATURE_ORDER: AccessibilityFeature[] = [
  'step_free_entry',
  'ramp_access',
  'lift_available',
  'wide_doorways',
  'paved_paths',
  'smooth_surface',
  'accessible_toilet',
  'accessible_parking',
  'seating_available',
  'table_service_space',
  'steep_slopes',
  'gravel_or_sand',
];

function listLabel(items: string[]): string {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function generateAccessibilitySummary(accessibility: AccessibilityFeatureValue[] = []): string {
  const known = accessibility.filter((item) => item.confidence !== 'unknown');
  if (known.length === 0) {
    return 'Limited accessibility info. If you visit, add what you notice.';
  }

  const isTrue = (feature: AccessibilityFeature) =>
    accessibility.some((item) => item.feature === feature && item.value === true && item.confidence !== 'unknown');

  const parts: string[] = [];
  const warnings: string[] = [];

  if (isTrue('step_free_entry')) {
    parts.push('Step-free entry is available');
  }

  const pathFeatures: string[] = [];
  if (isTrue('paved_paths')) pathFeatures.push('paved paths');
  if (isTrue('smooth_surface')) pathFeatures.push('smooth surfaces');
  if (pathFeatures.length > 0) {
    parts.push(`${listLabel(pathFeatures)} are reported`);
  }

  if (isTrue('accessible_toilet')) {
    parts.push('accessible toilet is available');
  }

  if (isTrue('accessible_parking')) {
    parts.push('accessible parking is available');
  }

  if (isTrue('steep_slopes')) warnings.push('steep slopes');
  if (isTrue('gravel_or_sand')) warnings.push('gravel or sand');
  if (warnings.length > 0) {
    parts.push(`watch out for ${listLabel(warnings)}`);
  }

  if (parts.length === 0) {
    return 'Limited accessibility info. If you visit, add what you notice.';
  }

  return `${parts.join('. ')}.`;
}

function reportTimestampMillis(report: AccessibilityReportDoc): number {
  return report.createdAt?.toMillis?.() || 0;
}

function getReportSelections(report: AccessibilityReportDoc): AccessibilitySelection[] {
  if (Array.isArray(report.selections)) {
    return report.selections.filter((s): s is AccessibilitySelection => !!s && s.value === true);
  }
  // Backward compatibility with previous payload.
  if (Array.isArray(report.features)) {
    return report.features
      .filter((f) => f && f.value === true)
      .map((f) => ({ feature: f.feature, value: true, confidence: 'reported' as const }));
  }
  return [];
}

export function aggregateFromReports(reports: AccessibilityReportDoc[]): {
  accessibility: AccessibilityFeatureValue[];
  accessibilitySummary: string;
} {
  const sorted = [...reports].sort((a, b) => {
    const ta = reportTimestampMillis(a);
    const tb = reportTimestampMillis(b);
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });

  const byFeature = new Map<AccessibilityFeature, { sourcesCount: number; updatedAtMillis: number }>();

  sorted.forEach((report) => {
    const millis = reportTimestampMillis(report);
    const seen = new Set<AccessibilityFeature>();
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

  const accessibility: AccessibilityFeatureValue[] = FEATURE_ORDER.map((feature) => {
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
    accessibility,
    accessibilitySummary: generateAccessibilitySummary(accessibility),
  };
}

