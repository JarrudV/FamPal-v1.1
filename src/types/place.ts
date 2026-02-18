export type AccessibilityFeature =
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

export type AccessibilityConfidence = 'verified' | 'reported' | 'unknown';

export interface AccessibilityFeatureValue {
  feature: AccessibilityFeature;
  value: boolean;
  confidence: AccessibilityConfidence;
  sourcesCount?: number;
  updatedAt?: string;
}

export interface UserAccessibilityNeeds {
  usesWheelchair: boolean;
  needsStepFree: boolean;
  needsAccessibleToilet: boolean;
  prefersPavedPaths: boolean;
  usesPushchair: boolean;
}

export type FamilyFacility =
  | 'playground'
  | 'baby_changing_table'
  | 'stroller_friendly'
  | 'high_chairs'
  | 'kids_menu'
  | 'family_restroom'
  | 'nursing_room'
  | 'child_friendly_space';

export type FamilyFacilityConfidence = 'verified' | 'reported' | 'unknown';

export interface FamilyFacilityValue {
  feature: FamilyFacility;
  value: boolean;
  confidence: FamilyFacilityConfidence;
  sourcesCount?: number;
  updatedAt?: string;
}

export const ACCESSIBILITY_FEATURE_LABELS: Record<AccessibilityFeature, string> = {
  step_free_entry: 'Step free entry',
  ramp_access: 'Ramp access',
  lift_available: 'Lift available',
  wide_doorways: 'Wide doorways',
  paved_paths: 'Paved paths',
  smooth_surface: 'Smooth surface',
  accessible_toilet: 'Accessible toilet',
  accessible_parking: 'Accessible parking',
  seating_available: 'Seating available',
  table_service_space: 'Table service space',
  steep_slopes: 'Steep slopes',
  gravel_or_sand: 'Gravel or sand',
};

export const FAMILY_FACILITY_LABELS: Record<FamilyFacility, string> = {
  playground: 'Playground',
  baby_changing_table: 'Baby changing table',
  stroller_friendly: 'Stroller friendly',
  high_chairs: 'High chairs',
  kids_menu: "Kids' menu",
  family_restroom: 'Family restroom',
  nursing_room: 'Nursing room',
  child_friendly_space: 'Child-friendly space',
};

export type PetFriendlyFeature =
  | 'dogs_allowed'
  | 'cats_allowed'
  | 'pet_friendly_patio'
  | 'water_bowls'
  | 'off_leash_area'
  | 'pet_menu'
  | 'shaded_pet_area'
  | 'pet_waste_stations'
  | 'enclosed_garden'
  | 'pets_inside_allowed';

export type PetFriendlyConfidence = 'verified' | 'reported' | 'unknown';

export interface PetFriendlyFeatureValue {
  feature: PetFriendlyFeature;
  value: boolean;
  confidence: PetFriendlyConfidence;
  sourcesCount?: number;
  updatedAt?: string;
}

export const PET_FRIENDLY_FEATURE_LABELS: Record<PetFriendlyFeature, string> = {
  dogs_allowed: 'Dogs allowed',
  cats_allowed: 'Cats allowed',
  pet_friendly_patio: 'Pet-friendly patio',
  water_bowls: 'Water bowls provided',
  off_leash_area: 'Off-leash area',
  pet_menu: 'Pet menu / treats',
  shaded_pet_area: 'Shaded pet area',
  pet_waste_stations: 'Pet waste stations',
  enclosed_garden: 'Enclosed garden',
  pets_inside_allowed: 'Pets allowed inside',
};
