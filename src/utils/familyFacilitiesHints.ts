import type { FamilyFacility } from '../types/place';
import type { PlaceDetails } from '../../placesService';
import { getPublicHints } from './publicHints';

function readBoolean(source: Record<string, unknown> | undefined, keys: string[]): boolean {
  if (!source) return false;
  for (const key of keys) {
    if (source[key] === true) return true;
  }
  return false;
}

export function getFamilyFacilitiesHintsFromGoogle(placeDetails?: PlaceDetails | null): FamilyFacility[] {
  if (!placeDetails) return [];

  const hints = new Set<FamilyFacility>();
  const options = placeDetails.accessibilityOptions as Record<string, unknown> | undefined;
  const parkingOptions = placeDetails.parkingOptions as Record<string, unknown> | undefined;
  const types = placeDetails.types || [];
  const publicHints = getPublicHints(placeDetails);

  if (types.includes('playground') || types.includes('amusement_park')) {
    hints.add('playground');
  }

  if (placeDetails.goodForChildren === true) {
    hints.add('child_friendly_space');
  }

  if (placeDetails.menuForChildren === true) {
    hints.add('kids_menu');
  }

  if (placeDetails.restroom === true) {
    hints.add('family_restroom');
  }

  if (
    publicHints.strollerFriendlySuggested ||
    readBoolean(options, ['wheelchairAccessibleEntrance', 'wheelchair_accessible_entrance']) ||
    readBoolean(options, ['wheelchairAccessibleParking', 'wheelchair_accessible_parking']) ||
    readBoolean(parkingOptions, ['freeParkingLot', 'paidParkingLot'])
  ) {
    hints.add('stroller_friendly');
  }

  const reviewText = (placeDetails.reviews || []).map(r => r.text || '').join(' ').toLowerCase();
  if (reviewText) {
    if (/high\s?chair/i.test(reviewText)) hints.add('high_chairs');
    if (/baby\s?chang|nappy\s?chang|diaper\s?chang/i.test(reviewText)) hints.add('baby_changing_table');
    if (/nursing\s?room|breastfeed/i.test(reviewText)) hints.add('nursing_room');
    if (/playground|play\s?area|jungle\s?gym|play\s?zone|kids?\s?play/i.test(reviewText)) hints.add('playground');
    if (/kids?\s?menu|children.s\s?menu/i.test(reviewText) && !hints.has('kids_menu')) hints.add('kids_menu');
    if (/kid\s?friendly|child\s?friendly|family\s?friendly|great\s+for\s+kids/i.test(reviewText) && !hints.has('child_friendly_space')) hints.add('child_friendly_space');
    if (/stroller|pram|pushchair/i.test(reviewText) && !hints.has('stroller_friendly')) hints.add('stroller_friendly');
  }

  return [...hints];
}
