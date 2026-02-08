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
  'university',
  'hospital',
  'doctor',
  'dentist',
  'pharmacy',
  'veterinary_care',
  'lawyer',
  'accounting',
  'insurance_agency',
  'moving_company',
  'storage',
  'funeral_home',
  'cemetery',
  'atm',
  'bank',
  'convenience_store',
  'car_wash',
  'car_rental',
  'truck_stop',
  'locksmith',
  'electrician',
  'plumber',
  'roofing_contractor',
  'general_contractor',
  'shopping_mall',
];

const COMMON_KEYWORD_EXCLUDE = [
  'petrol', 'garage', 'car wash', 'repair shop', 'attorney', 'accountant',
  'car dealership', 'storage unit', 'hotel', 'motel', 'guest house',
  'kfc', "mcdonald's", 'mcdonalds', 'burger king', 'hungry lion',
  'chicken licken', 'fishaways', 'steers', 'debonairs',
  "roman's pizza", "domino's", 'pizza hut', 'subway',
  'engen', 'shell garage', 'caltex', 'sasol', 'bp garage', 'bp express',
  'total energies', 'totalenergies',
  'shoprite', 'checkers', 'pick n pay', 'spar supermarket',
  'clicks', 'dis-chem', 'pep store', 'ackermans',
  'cashbuild', 'builders warehouse', 'shopping mall',
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
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE],
  },
  eat_drink: {
    id: 'eat_drink',
    label: 'Eat and Drink',
    subtitle: 'Showing restaurants, cafes, bars, and bakeries',
    queries: ['restaurant', 'cafe', 'bar', 'bakery', 'takeaway', 'pizza', 'sushi', 'family restaurant', 'wine farm', 'winery'],
    includeTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery', 'food', 'winery'],
    excludeTypes: COMMON_EXCLUDE_TYPES,
    keywordInclude: ['restaurant', 'cafe', 'bar', 'bakery', 'takeaway', 'pizza', 'sushi', 'bistro', 'grill', 'diner', 'eatery', 'kitchen', 'farm stall', 'farm shop', 'wine farm', 'wine estate', 'winery', 'wine tasting'],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE],
  },
  play_kids: {
    id: 'play_kids',
    label: 'Play and Kids',
    subtitle: 'Showing playgrounds, family venues, and kid-friendly activities',
    queries: ['playground', 'kids play area', 'family restaurant', 'soft play', 'indoor play centre', 'park', 'zoo', 'aquarium'],
    includeTypes: ['playground', 'amusement_park', 'park', 'zoo', 'aquarium', 'tourist_attraction'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'night_club', 'winery', 'vineyard', 'bar'],
    keywordInclude: ['kids', 'play', 'playground', 'child friendly', 'soft play', 'trampoline', 'zoo', 'aquarium', 'jungle gym', 'kids menu'],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'adult entertainment', 'nightclub', 'wine tasting', 'cellar', 'brewery tour'],
  },
  outdoors: {
    id: 'outdoors',
    label: 'Outdoors',
    subtitle: 'Showing trails, nature spots, and open-air venues',
    queries: ['hiking trail', 'nature reserve', 'park', 'beach', 'garden', 'viewpoint', 'lake', 'camping'],
    includeTypes: ['park', 'tourist_attraction', 'campground', 'hiking_area', 'national_park', 'state_park', 'beach'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery', 'vineyard', 'cafe', 'restaurant'],
    keywordInclude: ['hike', 'trail', 'nature', 'reserve', 'park', 'beach', 'garden', 'viewpoint', 'lake', 'camp', 'mountain', 'dam', 'waterfall', 'forest'],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'wine tasting', 'coffee shop', 'office park'],
  },
  things_to_do: {
    id: 'things_to_do',
    label: 'Things to Do',
    subtitle: 'Showing attractions, culture, and day-out activities',
    queries: ['museum', 'art gallery', 'attraction', 'market', 'theatre', 'cinema', 'tour', 'historical landmark'],
    includeTypes: ['tourist_attraction', 'museum', 'art_gallery', 'movie_theater', 'library', 'amusement_park'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery', 'vineyard'],
    keywordInclude: ['museum', 'gallery', 'market', 'theatre', 'cinema', 'tour', 'landmark', 'attraction', 'festival', 'exhibit'],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'medical', 'clinic', 'law firm', 'wine tasting', 'cellar door', 'gym', 'fitness'],
  },
  sport_active: {
    id: 'sport_active',
    label: 'Sport and Active',
    subtitle: 'Showing gyms, sports venues, pools, and active fun',
    queries: ['gym', 'sports complex', 'swimming pool', 'tennis', 'padel', 'climbing gym', 'cycling', 'skate park'],
    includeTypes: ['gym', 'sports_complex', 'stadium', 'swimming_pool'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery', 'vineyard', 'cafe', 'restaurant'],
    keywordInclude: ['gym', 'sports', 'swim', 'tennis', 'padel', 'climbing', 'cycle', 'skate', 'fitness', 'yoga', 'pilates', 'martial arts', 'boxing', 'crossfit'],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'hotel gym', 'office park', 'wine', 'coffee'],
  },
  indoor: {
    id: 'indoor',
    label: 'Indoor',
    subtitle: 'Showing indoor activities and weather-safe options',
    queries: ['indoor playground', 'museum', 'library', 'aquarium', 'art gallery', 'cinema', 'bowling'],
    includeTypes: ['museum', 'library', 'aquarium', 'art_gallery', 'movie_theater', 'bowling_alley', 'amusement_park'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery', 'vineyard'],
    keywordInclude: ['indoor', 'museum', 'library', 'aquarium', 'gallery', 'cinema', 'bowling', 'play centre', 'escape room', 'laser tag'],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'hiking', 'trailhead', 'campground', 'wine tasting', 'vineyard'],
  },
};

export function getExploreIntentDefinition(intent: ExploreIntentId): ExploreIntentDefinition {
  return EXPLORE_INTENT_DEFINITIONS[intent] || EXPLORE_INTENT_DEFINITIONS.all;
}
