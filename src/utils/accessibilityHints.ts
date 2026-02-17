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
  if (!placeDetails) return [];
  const options = placeDetails.accessibilityOptions as Record<string, unknown> | undefined;

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

  const reviewText = (placeDetails.reviews || []).map(r => r.text || '').join(' ').toLowerCase();
  if (reviewText) {
    if (/wheelchair\s?access|step\s?free|flat\s?entrance|level\s?entrance/i.test(reviewText) && !hints.has('step_free_entry')) hints.add('step_free_entry');
    if (/disabled\s?parking|accessible\s?parking|wheelchair\s?parking/i.test(reviewText) && !hints.has('accessible_parking')) hints.add('accessible_parking');
    if (/disabled\s?toilet|accessible\s?toilet|wheelchair\s?restroom|accessible\s?restroom/i.test(reviewText) && !hints.has('accessible_toilet')) hints.add('accessible_toilet');
    if (/ramp|ramped\s?access/i.test(reviewText) && !hints.has('ramp_access')) hints.add('ramp_access');
    if (/lift|elevator/i.test(reviewText) && !hints.has('lift_available')) hints.add('lift_available');
    if (/paved\s?path|tarred\s?path|smooth\s?path/i.test(reviewText)) hints.add('paved_paths');
    if (/seating|benches|sit\s?down/i.test(reviewText)) hints.add('seating_available');
  }

  return [...hints];
}

