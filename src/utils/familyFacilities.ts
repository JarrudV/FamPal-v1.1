import type { FamilyFacility, FamilyFacilityValue } from '../types/place';

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

const CONFIDENCE_PRIORITY = {
  unknown: 0,
  reported: 1,
  verified: 2,
} as const;

function toMap(values: FamilyFacilityValue[] = []): Map<FamilyFacility, FamilyFacilityValue> {
  const map = new Map<FamilyFacility, FamilyFacilityValue>();
  values.forEach((item) => {
    map.set(item.feature, item);
  });
  return map;
}

export function normalizeFamilyFacilities(
  existing: FamilyFacilityValue[] = [],
  incoming: FamilyFacilityValue[] = []
): FamilyFacilityValue[] {
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
    .map((feature) => result.get(feature) as FamilyFacilityValue);
}

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
  if (comfort.length > 0) {
    parts.push(`${comfort.join(' and ')} available`);
  }

  const support: string[] = [];
  if (isTrue('family_restroom')) support.push('family restroom');
  if (isTrue('nursing_room')) support.push('nursing room');
  if (isTrue('child_friendly_space')) support.push('child-friendly space');
  if (support.length > 0) {
    parts.push(`${support.join(', ')} reported`);
  }

  return parts.length > 0 ? `${parts.join('. ')}.` : 'Family info not yet confirmed.';
}

