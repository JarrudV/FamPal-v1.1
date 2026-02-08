export type ExploreIntentId =
  | 'all'
  | 'eat_drink'
  | 'play_kids'
  | 'outdoors'
  | 'things_to_do'
  | 'sport_active'
  | 'indoor';

export interface ExploreIntentDefinition {
  id: ExploreIntentId;
  label: string;
  subtitle: string;
  queries: string[];
  includeTypes: string[];
  excludeTypes: string[];
  keywordInclude: string[];
  keywordExclude: string[];
}

const COMMON_EXCLUDE_TYPES = [
  'lodging',
  'real_estate_agency',
  'finance',
  'car_dealer',
  'car_repair',
  'gas_station',
  'school',
  'hospital',
  'lawyer',
  'accounting',
];

export const EXPLORE_INTENT_DEFINITIONS: Record<ExploreIntentId, ExploreIntentDefinition> = {
  all: {
    id: 'all',
    label: 'All',
    subtitle: 'Showing diverse nearby spots for families',
    queries: ['restaurant', 'park', 'museum', 'playground', 'hiking', 'market', 'cafe'],
    includeTypes: [],
    excludeTypes: COMMON_EXCLUDE_TYPES,
    keywordInclude: [],
    keywordExclude: ['hotel', 'motel', 'attorney', 'accountant', 'car dealership'],
  },
  eat_drink: {
    id: 'eat_drink',
    label: 'Eat and Drink',
    subtitle: 'Showing restaurants, cafes, bars, and bakeries',
    queries: ['restaurant', 'cafe', 'coffee', 'bar', 'bakery', 'takeaway', 'pizza', 'sushi'],
    includeTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery', 'food'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'farm'],
    keywordInclude: ['restaurant', 'cafe', 'coffee', 'bar', 'bakery', 'takeaway', 'pizza', 'sushi', 'farm stall'],
    keywordExclude: ['winery estate sales', 'car wash', 'repair shop'],
  },
  play_kids: {
    id: 'play_kids',
    label: 'Play and Kids',
    subtitle: 'Showing playgrounds, family venues, and kid-friendly activities',
    queries: ['playground', 'kids play area', 'family restaurant', 'soft play', 'indoor play centre', 'park', 'zoo', 'aquarium'],
    includeTypes: ['playground', 'amusement_park', 'park', 'zoo', 'aquarium', 'tourist_attraction', 'restaurant'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'night_club'],
    keywordInclude: ['kids', 'play', 'playground', 'family', 'soft play', 'trampoline', 'zoo', 'aquarium'],
    keywordExclude: ['adult entertainment', 'nightclub'],
  },
  outdoors: {
    id: 'outdoors',
    label: 'Outdoors',
    subtitle: 'Showing trails, nature spots, and open-air venues',
    queries: ['hiking trail', 'nature reserve', 'park', 'beach', 'garden', 'viewpoint', 'lake', 'camping'],
    includeTypes: ['park', 'tourist_attraction', 'campground', 'hiking_area', 'national_park', 'state_park', 'beach'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery'],
    keywordInclude: ['hike', 'trail', 'nature', 'reserve', 'park', 'beach', 'garden', 'viewpoint', 'lake', 'camp'],
    keywordExclude: ['indoor', 'mall', 'office'],
  },
  things_to_do: {
    id: 'things_to_do',
    label: 'Things to Do',
    subtitle: 'Showing attractions, culture, and day-out activities',
    queries: ['museum', 'art gallery', 'attraction', 'market', 'theatre', 'cinema', 'tour', 'historical landmark'],
    includeTypes: ['tourist_attraction', 'museum', 'art_gallery', 'movie_theater', 'library', 'shopping_mall', 'amusement_park'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery'],
    keywordInclude: ['museum', 'gallery', 'market', 'theatre', 'cinema', 'tour', 'landmark', 'attraction'],
    keywordExclude: ['medical', 'clinic', 'law firm'],
  },
  sport_active: {
    id: 'sport_active',
    label: 'Sport and Active',
    subtitle: 'Showing gyms, sports venues, pools, and active fun',
    queries: ['gym', 'sports complex', 'swimming pool', 'tennis', 'padel', 'climbing gym', 'cycling', 'skate park'],
    includeTypes: ['gym', 'health', 'sports_complex', 'stadium', 'swimming_pool', 'park'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery'],
    keywordInclude: ['gym', 'sports', 'swim', 'tennis', 'padel', 'climbing', 'cycle', 'skate', 'fitness'],
    keywordExclude: ['hotel gym', 'office park'],
  },
  indoor: {
    id: 'indoor',
    label: 'Indoor',
    subtitle: 'Showing indoor activities and weather-safe options',
    queries: ['indoor playground', 'museum', 'library', 'aquarium', 'art gallery', 'shopping mall', 'cinema', 'bowling'],
    includeTypes: ['museum', 'library', 'aquarium', 'art_gallery', 'shopping_mall', 'movie_theater', 'bowling_alley', 'amusement_park'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery'],
    keywordInclude: ['indoor', 'museum', 'library', 'aquarium', 'gallery', 'mall', 'cinema', 'bowling', 'play centre'],
    keywordExclude: ['hiking', 'trailhead', 'campground'],
  },
};

export function getExploreIntentDefinition(intent: ExploreIntentId): ExploreIntentDefinition {
  return EXPLORE_INTENT_DEFINITIONS[intent] || EXPLORE_INTENT_DEFINITIONS.all;
}
