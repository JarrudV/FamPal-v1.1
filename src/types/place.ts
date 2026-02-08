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
