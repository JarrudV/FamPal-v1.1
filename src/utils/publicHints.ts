import type { PlaceDetails } from '../../placesService';

export interface PublicHints {
  strollerFriendlySuggested: boolean;
  source?: 'google_places' | 'public' | 'heuristic';
}

function readBoolean(source: Record<string, unknown> | undefined, keys: string[]): boolean {
  if (!source) return false;
  for (const key of keys) {
    if (source[key] === true) return true;
  }
  return false;
}

export function getPublicHints(placeDetails?: PlaceDetails | null): PublicHints {
  if (!placeDetails) {
    return { strollerFriendlySuggested: false };
  }

  const accessibilityOptions = placeDetails.accessibilityOptions as Record<string, unknown> | undefined;
  const parkingOptions = placeDetails.parkingOptions as Record<string, unknown> | undefined;

  const strollerFriendlySuggested =
    readBoolean(accessibilityOptions, ['wheelchairAccessibleEntrance', 'wheelchair_accessible_entrance']) ||
    readBoolean(accessibilityOptions, ['wheelchairAccessibleParking', 'wheelchair_accessible_parking']) ||
    readBoolean(parkingOptions, ['freeParkingLot', 'paidParkingLot']);

  if (!strollerFriendlySuggested) {
    return { strollerFriendlySuggested: false };
  }

  return {
    strollerFriendlySuggested: true,
    source: 'google_places',
  };
}

