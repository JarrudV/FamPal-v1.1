import type { AccessibilityFeature, AccessibilityFeatureValue } from '../types/place';

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

const CONFIDENCE_PRIORITY = {
  unknown: 0,
  reported: 1,
  verified: 2,
} as const;

function toMap(values: AccessibilityFeatureValue[] = []): Map<AccessibilityFeature, AccessibilityFeatureValue> {
  const map = new Map<AccessibilityFeature, AccessibilityFeatureValue>();
  values.forEach((item) => {
    map.set(item.feature, item);
  });
  return map;
}

export function normalizeAccessibility(
  existing: AccessibilityFeatureValue[] = [],
  incoming: AccessibilityFeatureValue[] = []
): AccessibilityFeatureValue[] {
  const result = toMap(existing);

  incoming.forEach((next) => {
    const current = result.get(next.feature);
    if (!current) {
      result.set(next.feature, {
        ...next,
        sourcesCount: next.sourcesCount ?? 1,
        updatedAt: next.updatedAt || new Date().toISOString(),
      });
      return;
    }

    const currentPriority = CONFIDENCE_PRIORITY[current.confidence];
    const nextPriority = CONFIDENCE_PRIORITY[next.confidence];
    const pick = nextPriority >= currentPriority ? next : current;

    result.set(next.feature, {
      feature: next.feature,
      value: pick.value,
      confidence: pick.confidence,
      sourcesCount: (current.sourcesCount ?? 1) + (next.sourcesCount ?? 1),
      updatedAt: next.updatedAt || new Date().toISOString(),
    });
  });

  return FEATURE_ORDER
    .filter((feature) => result.has(feature))
    .map((feature) => result.get(feature) as AccessibilityFeatureValue);
}

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

