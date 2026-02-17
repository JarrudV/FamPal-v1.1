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
    queries: ['family friendly things to do', 'restaurant park cafe', 'playground museum market'],
    includeTypes: [],
    excludeTypes: COMMON_EXCLUDE_TYPES,
    keywordInclude: [],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE],
  },
  eat_drink: {
    id: 'eat_drink',
    label: 'Eat and Drink',
    subtitle: 'Showing restaurants, cafes, bars, and bakeries',
    queries: ['family restaurant cafe', 'bakery bar wine farm', 'food market farm stall ice cream'],
    includeTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery', 'food', 'winery'],
    excludeTypes: COMMON_EXCLUDE_TYPES,
    keywordInclude: [
      'restaurant', 'cafe', 'coffee shop', 'bar', 'bakery', 'takeaway', 'pizza', 'sushi',
      'bistro', 'grill', 'diner', 'eatery', 'kitchen', 'steakhouse', 'seafood',
      'farm stall', 'farm shop', 'food market', 'deli', 'patisserie', 'gelato', 'ice cream',
      'wine farm', 'wine estate', 'winery', 'cellar', 'vineyard', 'brewery', 'taproom',
      'brunch', 'breakfast', 'lunch', 'dinner', 'buffet',
    ],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE],
  },
  play_kids: {
    id: 'play_kids',
    label: 'Play and Kids',
    subtitle: 'Showing playgrounds, family venues, and kid-friendly activities',
    queries: [
      'playground kids play area', 'zoo aquarium water park', 'family fun trampoline park mini golf',
    ],
    includeTypes: ['playground', 'amusement_park', 'park', 'zoo', 'aquarium', 'tourist_attraction'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'night_club', 'winery', 'vineyard', 'bar'],
    keywordInclude: [
      'kids', 'play', 'playground', 'child friendly', 'soft play', 'trampoline', 'trampoline park',
      'zoo', 'aquarium', 'jungle gym', 'kids menu', 'family fun', 'petting zoo', 'petting farm',
      'water park', 'splash pad', 'mini golf', 'putt putt', 'kids party', 'party venue',
      'face painting', 'jumping castle', 'inflatable park', 'bumper cars', 'maze',
      'puppet show', 'kids entertainment', 'toy library',
    ],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'adult entertainment', 'nightclub', 'wine tasting', 'cellar', 'brewery tour', 'strip club', 'casino'],
  },
  outdoors: {
    id: 'outdoors',
    label: 'Outdoors',
    subtitle: 'Showing trails, nature spots, and open-air venues',
    queries: [
      'hiking trail nature reserve park', 'beach garden botanical picnic', 'camping farm visit horse riding',
    ],
    includeTypes: ['park', 'tourist_attraction', 'campground', 'hiking_area', 'national_park', 'state_park', 'beach'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery', 'vineyard'],
    keywordInclude: [
      'hike', 'hiking', 'trail', 'nature', 'reserve', 'park', 'beach', 'garden', 'botanical',
      'viewpoint', 'lake', 'camp', 'camping', 'mountain', 'dam', 'waterfall', 'forest',
      'picnic', 'bird watching', 'birding', 'rock pool', 'tidal pool', 'river',
      'horse riding', 'pony ride', 'farm visit', 'strawberry picking', 'fruit picking',
      'zip line', 'canopy tour', 'abseiling', 'kayak', 'paddleboard',
      'outdoor adventure', 'nature walk', 'wetland', 'vlei', 'gorge', 'kloof',
    ],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'wine tasting', 'office park'],
  },
  things_to_do: {
    id: 'things_to_do',
    label: 'Things to Do',
    subtitle: 'Showing attractions, culture, and day-out activities',
    queries: [
      'museum art gallery attraction', 'market theatre cinema tour', 'historical landmark botanical garden',
    ],
    includeTypes: ['tourist_attraction', 'museum', 'art_gallery', 'movie_theater', 'amusement_park'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES],
    keywordInclude: [
      'museum', 'gallery', 'market', 'craft market', 'food market', 'flea market',
      'theatre', 'theater', 'cinema', 'tour', 'landmark', 'attraction', 'festival', 'exhibit',
      'botanical garden', 'monument', 'heritage', 'historical', 'cultural',
      'wine route', 'wine farm', 'brewery', 'distillery',
      'art walk', 'street art', 'sculpture', 'planetarium', 'observatory',
      'show', 'concert', 'live music', 'comedy', 'open day',
    ],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'medical', 'clinic', 'law firm', 'gym', 'fitness'],
  },
  sport_active: {
    id: 'sport_active',
    label: 'Sport and Active',
    subtitle: 'Showing gyms, sports venues, pools, and active fun',
    queries: [
      'gym sports complex swimming pool', 'climbing cycling skate park adventure', 'go karting mini golf surfing',
    ],
    includeTypes: ['gym', 'sports_complex', 'stadium', 'swimming_pool'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery', 'vineyard'],
    keywordInclude: [
      'gym', 'sports', 'swim', 'swimming pool', 'tennis', 'padel', 'climbing', 'bouldering',
      'cycle', 'cycling', 'skate', 'skate park', 'fitness', 'yoga', 'pilates',
      'martial arts', 'boxing', 'crossfit', 'dance studio', 'ballet',
      'horse riding', 'pony club', 'go kart', 'go karting', 'paintball',
      'mini golf', 'putt putt', 'surfing', 'surf school', 'kayak', 'paddleboard',
      'rock climbing', 'adventure park', 'obstacle course', 'parkour',
      'athletics', 'running club', 'cricket', 'rugby', 'soccer', 'football', 'netball',
      'ice skating', 'roller skating', 'zip line',
    ],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'hotel gym', 'office park', 'wine'],
  },
  indoor: {
    id: 'indoor',
    label: 'Indoor',
    subtitle: 'Showing indoor activities and weather-safe options',
    queries: [
      'indoor playground museum library', 'aquarium cinema bowling arcade', 'trampoline park escape room ice skating',
    ],
    includeTypes: ['museum', 'library', 'aquarium', 'art_gallery', 'movie_theater', 'bowling_alley', 'amusement_park'],
    excludeTypes: [...COMMON_EXCLUDE_TYPES, 'winery', 'vineyard'],
    keywordInclude: [
      'indoor', 'museum', 'library', 'aquarium', 'gallery', 'cinema', 'movie',
      'bowling', 'play centre', 'play center', 'escape room', 'laser tag',
      'trampoline park', 'trampoline', 'arcade', 'gaming', 'virtual reality', 'vr',
      'ice skating', 'roller skating', 'ice rink',
      'cooking class', 'pottery', 'ceramics', 'art class', 'craft workshop',
      'science centre', 'planetarium', 'soft play', 'indoor playground',
      'board game cafe', 'kids party', 'climbing wall', 'bouldering',
    ],
    keywordExclude: [...COMMON_KEYWORD_EXCLUDE, 'hiking', 'trailhead', 'campground', 'wine tasting', 'vineyard'],
  },
};

export function getExploreIntentDefinition(intent: ExploreIntentId): ExploreIntentDefinition {
  return EXPLORE_INTENT_DEFINITIONS[intent] || EXPLORE_INTENT_DEFINITIONS.all;
}
