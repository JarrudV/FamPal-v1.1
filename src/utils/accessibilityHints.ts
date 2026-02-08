import type { AccessibilityFeature } from '../types/place';
import type { PlaceDetails } from '../../placesService';

function readBoolean(source: Record<string, unknown> | undefined, keys: string[]): boolean {
  if (!source) return false;
  for (const key of keys) {
    const value = source[key];
    if (value === true) return true;
  }
  return false;
}

export function getAccessibilityHintsFromGoogle(placeDetails?: PlaceDetails | null): AccessibilityFeature[] {
  const options = placeDetails?.accessibilityOptions as Record<string, unknown> | undefined;
  if (!options) return [];

  const hints = new Set<AccessibilityFeature>();

  if (readBoolean(options, ['wheelchairAccessibleEntrance', 'wheelchair_accessible_entrance'])) {
    hints.add('step_free_entry');
  }
  if (readBoolean(options, ['wheelchairAccessibleParking', 'wheelchair_accessible_parking'])) {
    hints.add('accessible_parking');
  }
  if (readBoolean(options, ['wheelchairAccessibleRestroom', 'wheelchair_accessible_restroom'])) {
    hints.add('accessible_toilet');
  }
  if (readBoolean(options, ['elevator', 'lift', 'liftAvailable', 'lift_available'])) {
    hints.add('lift_available');
  }
  if (readBoolean(options, ['ramp', 'rampAccess', 'ramp_access'])) {
    hints.add('ramp_access');
  }

  return [...hints];
}

