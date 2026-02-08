import { Place, ExploreIntent } from '../types';

export type ExploreLensKey =
  | 'foodTypes'
  | 'venueTypes'
  | 'kidPrefs'
  | 'accessibility'
  | 'indoorOutdoor';

export interface ExploreFilters {
  foodTypes: string[];
  venueTypes: string[];
  kidPrefs: string[];
  accessibility: string[];
  indoorOutdoor: string[];
  strict: {
    foodTypes: boolean;
    venueTypes: boolean;
    kidPrefs: boolean;
    accessibility: boolean;
    indoorOutdoor: boolean;
  };
}

export interface PlaceCapabilities {
  servesFood: boolean;
  foodKeywords: Set<string>;
  venueTypes: Set<string>;
  kidFriendlySignals: Set<string>;
  accessibilitySignals: Set<string>;
  indoorOutdoorSignals: Set<string>;
}

export interface LensChip {
  id: string;
  label: string;
  matches: (caps: PlaceCapabilities) => boolean;
  conflicts?: (caps: PlaceCapabilities) => boolean;
}

export interface LensDefinition {
  key: ExploreLensKey;
  title: string;
  helperText: string;
  chips: LensChip[];
}

export interface SelectedChipItem {
  lensKey: ExploreLensKey;
  chipId: string;
  label: string;
}

export interface ScoredPlace {
  place: Place;
  score: number;
  matchedChips: string[];
  conflictedChips: string[];
}

const FOOD_TYPE_SET = new Set(['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery', 'food']);
const INDOOR_HINTS = ['indoor', 'museum', 'gallery', 'library', 'cinema', 'mall', 'bowling', 'aquarium'];
const OUTDOOR_HINTS = ['outdoor', 'park', 'trail', 'hike', 'beach', 'garden', 'camp', 'nature', 'viewpoint'];

const LENS_DEFINITIONS: Record<ExploreLensKey, LensDefinition> = {
  foodTypes: {
    key: 'foodTypes',
    title: 'Food type',
    helperText: 'Boost places matching your preferred food experience.',
    chips: [
      { id: 'coffee', label: 'Coffee', matches: (caps) => caps.foodKeywords.has('coffee') || (caps.venueTypes.has('cafe') && !caps.venueTypes.has('wine_farm')), conflicts: (caps) => !caps.servesFood },
      { id: 'bakery', label: 'Bakery', matches: (caps) => caps.foodKeywords.has('bakery') || caps.venueTypes.has('bakery'), conflicts: (caps) => !caps.servesFood },
      { id: 'brunch', label: 'Brunch', matches: (caps) => caps.foodKeywords.has('brunch') || caps.foodKeywords.has('breakfast'), conflicts: (caps) => !caps.servesFood },
      { id: 'pizza', label: 'Pizza', matches: (caps) => caps.foodKeywords.has('pizza'), conflicts: (caps) => !caps.servesFood },
      { id: 'sushi', label: 'Sushi', matches: (caps) => caps.foodKeywords.has('sushi'), conflicts: (caps) => !caps.servesFood },
      { id: 'burgers', label: 'Burgers', matches: (caps) => caps.foodKeywords.has('burger') || caps.foodKeywords.has('burgers'), conflicts: (caps) => !caps.servesFood },
      { id: 'steak', label: 'Steak', matches: (caps) => caps.foodKeywords.has('steak') || caps.foodKeywords.has('steakhouse'), conflicts: (caps) => !caps.servesFood },
      { id: 'seafood', label: 'Seafood', matches: (caps) => caps.foodKeywords.has('seafood') || caps.foodKeywords.has('fish'), conflicts: (caps) => !caps.servesFood },
      { id: 'italian', label: 'Italian', matches: (caps) => caps.foodKeywords.has('italian') || caps.foodKeywords.has('pasta'), conflicts: (caps) => !caps.servesFood },
      { id: 'indian', label: 'Indian', matches: (caps) => caps.foodKeywords.has('indian') || caps.foodKeywords.has('curry'), conflicts: (caps) => !caps.servesFood },
      { id: 'mexican', label: 'Mexican', matches: (caps) => caps.foodKeywords.has('mexican') || caps.foodKeywords.has('tacos'), conflicts: (caps) => !caps.servesFood },
      { id: 'asian', label: 'Asian', matches: (caps) => caps.foodKeywords.has('asian') || caps.foodKeywords.has('thai') || caps.foodKeywords.has('chinese') || caps.foodKeywords.has('vietnamese') || caps.foodKeywords.has('korean'), conflicts: (caps) => !caps.servesFood },
      { id: 'ice_cream', label: 'Ice cream', matches: (caps) => caps.foodKeywords.has('ice cream') || caps.foodKeywords.has('gelato'), conflicts: (caps) => !caps.servesFood },
      { id: 'wine_tasting', label: 'Wine tasting', matches: (caps) => caps.venueTypes.has('wine_farm') || caps.foodKeywords.has('wine tasting') },
      { id: 'farm_stall', label: 'Farm stall', matches: (caps) => caps.foodKeywords.has('farm stall') || caps.foodKeywords.has('farm shop'), conflicts: (caps) => !caps.servesFood },
    ],
  },
  venueTypes: {
    key: 'venueTypes',
    title: 'Venue type',
    helperText: 'Prioritize the kind of place you want to visit.',
    chips: [
      { id: 'restaurant', label: 'Restaurant', matches: (caps) => caps.venueTypes.has('restaurant'), conflicts: (caps) => !caps.servesFood },
      { id: 'cafe', label: 'Cafe', matches: (caps) => caps.venueTypes.has('cafe'), conflicts: (caps) => !caps.servesFood },
      { id: 'bar_pub', label: 'Bar or Pub', matches: (caps) => caps.venueTypes.has('bar_pub'), conflicts: (caps) => !caps.venueTypes.has('bar_pub') },
      { id: 'market', label: 'Market', matches: (caps) => caps.venueTypes.has('market'), conflicts: (caps) => !caps.venueTypes.has('market') },
      { id: 'wine_farm', label: 'Wine farm', matches: (caps) => caps.venueTypes.has('wine_farm'), conflicts: (caps) => !caps.venueTypes.has('wine_farm') },
      { id: 'food_truck', label: 'Food truck', matches: (caps) => caps.venueTypes.has('food_truck') || caps.foodKeywords.has('food truck') },
    ],
  },
  kidPrefs: {
    key: 'kidPrefs',
    title: 'Kid preferences',
    helperText: 'Surface places with child-friendly signals from community and public data.',
    chips: [
      { id: 'kids_menu', label: 'Kids menu', matches: (caps) => caps.kidFriendlySignals.has('kids_menu') },
      { id: 'high_chair', label: 'High chair', matches: (caps) => caps.kidFriendlySignals.has('high_chair') },
      { id: 'play_area_jungle_gym', label: 'Play area or Jungle gym', matches: (caps) => caps.kidFriendlySignals.has('play_area_jungle_gym') || caps.kidFriendlySignals.has('playground') },
      { id: 'outdoor_space', label: 'Outdoor space', matches: (caps) => caps.kidFriendlySignals.has('outdoor_space') || caps.indoorOutdoorSignals.has('outdoor') },
      { id: 'stroller_friendly', label: 'Stroller friendly', matches: (caps) => caps.kidFriendlySignals.has('stroller_friendly') },
    ],
  },
  accessibility: {
    key: 'accessibility',
    title: 'Accessibility',
    helperText: 'Use confirmed and suggested accessibility signals to rank venues.',
    chips: [
      { id: 'wheelchair_friendly', label: 'Wheelchair friendly', matches: (caps) => caps.accessibilitySignals.has('wheelchair_friendly') || caps.accessibilitySignals.has('step_free') },
      { id: 'accessible_toilets', label: 'Accessible toilets', matches: (caps) => caps.accessibilitySignals.has('accessible_toilet') },
      { id: 'step_free', label: 'Step free', matches: (caps) => caps.accessibilitySignals.has('step_free') },
      { id: 'quiet_friendly', label: 'Quiet friendly', matches: (caps) => caps.accessibilitySignals.has('quiet_friendly') || caps.foodKeywords.has('quiet') },
    ],
  },
  indoorOutdoor: {
    key: 'indoorOutdoor',
    title: 'Indoor or Outdoor',
    helperText: 'Balance weather-safe options with open-air adventures.',
    chips: [
      {
        id: 'indoor',
        label: 'Indoor',
        matches: (caps) => caps.indoorOutdoorSignals.has('indoor'),
        conflicts: (caps) => caps.indoorOutdoorSignals.has('outdoor') && !caps.indoorOutdoorSignals.has('indoor'),
      },
      {
        id: 'outdoor',
        label: 'Outdoor',
        matches: (caps) => caps.indoorOutdoorSignals.has('outdoor'),
        conflicts: (caps) => caps.indoorOutdoorSignals.has('indoor') && !caps.indoorOutdoorSignals.has('outdoor'),
      },
      {
        id: 'both',
        label: 'Both',
        matches: (caps) => caps.indoorOutdoorSignals.has('both'),
        conflicts: (caps) => !caps.indoorOutdoorSignals.has('both') && (caps.indoorOutdoorSignals.has('indoor') || caps.indoorOutdoorSignals.has('outdoor')),
      },
    ],
  },
};

const INTENT_LENS_MAP: Record<ExploreIntent, ExploreLensKey[]> = {
  all: ['venueTypes', 'foodTypes', 'kidPrefs', 'accessibility', 'indoorOutdoor'],
  eat_drink: ['venueTypes', 'foodTypes', 'kidPrefs', 'accessibility', 'indoorOutdoor'],
  play_kids: ['venueTypes', 'kidPrefs', 'accessibility', 'indoorOutdoor'],
  outdoors: ['venueTypes', 'kidPrefs', 'accessibility', 'indoorOutdoor'],
  things_to_do: ['venueTypes', 'kidPrefs', 'accessibility', 'indoorOutdoor'],
  sport_active: ['venueTypes', 'accessibility', 'indoorOutdoor'],
  indoor: ['venueTypes', 'kidPrefs', 'accessibility', 'indoorOutdoor'],
};

function normalizeToken(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '_');
}

function placeTypeSet(place: Place): Set<string> {
  return new Set((place.tags || []).map(normalizeToken));
}

function extractText(place: Place): string {
  return `${place.name || ''} ${place.description || ''} ${place.address || ''} ${(place.tags || []).join(' ')}`.toLowerCase();
}

function keywordMatches(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function parseDistanceKm(distance?: string): number {
  if (!distance) return Number.MAX_SAFE_INTEGER;
  const normalized = distance.trim().toLowerCase();
  if (normalized.endsWith('km')) {
    const value = Number.parseFloat(normalized.replace('km', '').trim());
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
  }
  if (normalized.endsWith('m')) {
    const value = Number.parseFloat(normalized.replace('m', '').trim());
    return Number.isFinite(value) ? value / 1000 : Number.MAX_SAFE_INTEGER;
  }
  return Number.MAX_SAFE_INTEGER;
}

function isPositiveCommunityValue(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const vote = value as { value?: boolean; confidence?: string };
  return vote.value === true && vote.confidence !== 'unknown';
}

function extractHintFeatures(place: Place): Set<string> {
  const features = new Set<string>();
  const hints = [
    ...(((place as any).googleHints || []) as Array<{ feature?: string }>),
    ...(((place as any).familyHints || []) as Array<{ feature?: string }>),
  ];
  hints.forEach((hint) => {
    if (hint?.feature) features.add(normalizeToken(hint.feature));
  });
  return features;
}

export function createDefaultExploreFilters(): ExploreFilters {
  return {
    foodTypes: [],
    venueTypes: [],
    kidPrefs: [],
    accessibility: [],
    indoorOutdoor: [],
    strict: {
      foodTypes: false,
      venueTypes: true,
      kidPrefs: false,
      accessibility: false,
      indoorOutdoor: false,
    },
  };
}

export function getLensDefinitions(
  intent: ExploreIntent,
  whoIsComing: 'all' | 'family' | 'partner' | 'solo'
): LensDefinition[] {
  const keys = INTENT_LENS_MAP[intent] || INTENT_LENS_MAP.all;
  const showKidPrefs = whoIsComing === 'all' || whoIsComing === 'family';
  return keys
    .filter((key) => !(key === 'kidPrefs' && !showKidPrefs))
    .map((key) => LENS_DEFINITIONS[key]);
}

export function getSelectedChipSummary(filters: ExploreFilters, lensDefs: LensDefinition[]): string[] {
  return getSelectedChipItems(filters, lensDefs).map((item) => item.label);
}

export function getSelectedChipItems(filters: ExploreFilters, lensDefs: LensDefinition[]): SelectedChipItem[] {
  const allowed = new Set(lensDefs.map((lens) => lens.key));
  const chips: SelectedChipItem[] = [];
  lensDefs.forEach((lens) => {
    const selected = filters[lens.key] as string[];
    selected.forEach((chipId) => {
      const chip = lens.chips.find((item) => item.id === chipId);
      if (!chip || !allowed.has(lens.key)) return;
      chips.push({
        lensKey: lens.key,
        chipId,
        label: chip.label,
      });
    });
  });
  return chips;
}

export function getFilterButtonLabel(filters: ExploreFilters, lensDefs: LensDefinition[]): string {
  const selected = getSelectedChipSummary(filters, lensDefs);
  if (selected.length === 0) return 'Must haves';
  if (selected.length === 1) return `Must haves: ${selected[0]}`;
  if (selected.length === 2) return `Must haves: ${selected[0]}, ${selected[1]}`;
  return `Must haves: ${selected[0]} +${selected.length - 1}`;
}

export function derivePlaceCapabilities(place: Place): PlaceCapabilities {
  const typeSet = placeTypeSet(place);
  const text = extractText(place);
  const hintSet = extractHintFeatures(place);
  const kidSignals = new Set<string>();
  const accessibilitySignals = new Set<string>();
  const foodKeywords = new Set<string>();
  const venueTypes = new Set<string>();
  const indoorOutdoorSignals = new Set<string>();

  if (typeSet.has('restaurant') || typeSet.has('meal_takeaway') || typeSet.has('meal_delivery')) venueTypes.add('restaurant');
  if (typeSet.has('cafe') || typeSet.has('coffee_shop')) venueTypes.add('cafe');
  if (typeSet.has('bar') || typeSet.has('pub') || typeSet.has('night_club')) venueTypes.add('bar_pub');
  if (typeSet.has('bakery')) venueTypes.add('bakery');
  if (typeSet.has('food_truck') || keywordMatches(text, ['food truck'])) venueTypes.add('food_truck');

  const nameAndDesc = `${place.name || ''} ${place.description || ''}`.toLowerCase();
  if (typeSet.has('market') || keywordMatches(nameAndDesc, ['market'])) venueTypes.add('market');

  const isWineFarm = typeSet.has('winery') || typeSet.has('vineyard') || keywordMatches(nameAndDesc, ['wine farm', 'wine estate', 'wine cellar', 'cellar door']);
  if (isWineFarm) venueTypes.add('wine_farm');

  const isCoffeeFocused = keywordMatches(nameAndDesc, ['coffee']) && !isWineFarm;
  const foodKwList = [
    'bakery', 'brunch', 'breakfast', 'pizza', 'sushi', 'burger', 'burgers',
    'steak', 'steakhouse', 'seafood', 'fish',
    'italian', 'pasta', 'indian', 'curry', 'mexican', 'tacos',
    'asian', 'thai', 'chinese', 'vietnamese', 'korean',
    'ice cream', 'gelato',
    'wine tasting', 'farm stall', 'farm shop', 'pet friendly', 'quiet',
  ];
  if (isCoffeeFocused) foodKeywords.add('coffee');
  foodKwList.forEach((keyword) => {
    if (text.includes(keyword)) foodKeywords.add(keyword);
  });

  (place.familyFacilities || []).forEach((feature) => {
    if (!isPositiveCommunityValue(feature)) return;
    const key = normalizeToken(feature.feature || '');
    kidSignals.add(key);
    if (key === 'playground' || key === 'child_friendly_space') kidSignals.add('play_area_jungle_gym');
    if (key === 'stroller_friendly') kidSignals.add('stroller_friendly');
    if (key === 'kids_menu') kidSignals.add('kids_menu');
    if (key === 'high_chairs') kidSignals.add('high_chair');
  });
  if (keywordMatches(text, ['kids menu', 'child friendly', 'family friendly'])) kidSignals.add('kids_menu');
  if (keywordMatches(text, ['high chair'])) kidSignals.add('high_chair');
  if (keywordMatches(text, ['jungle gym', 'play area', 'playground', 'kids play'])) kidSignals.add('play_area_jungle_gym');
  if (keywordMatches(text, ['pram', 'stroller'])) kidSignals.add('stroller_friendly');
  if (keywordMatches(text, ['outdoor seating', 'outdoor play', 'garden'])) kidSignals.add('outdoor_space');
  if (hintSet.has('playground') || hintSet.has('kids_activities')) kidSignals.add('play_area_jungle_gym');
  if (hintSet.has('stroller_friendly')) kidSignals.add('stroller_friendly');
  if (hintSet.has('kids_menu')) kidSignals.add('kids_menu');

  (place.accessibility || []).forEach((feature) => {
    if (!isPositiveCommunityValue(feature)) return;
    const key = normalizeToken(feature.feature || '');
    accessibilitySignals.add(key);
    if (key === 'step_free_entry' || key === 'ramp_access' || key === 'lift_available' || key === 'wide_doorways') {
      accessibilitySignals.add('step_free');
      accessibilitySignals.add('wheelchair_friendly');
    }
    if (key === 'accessible_toilet') accessibilitySignals.add('accessible_toilet');
  });
  if (hintSet.has('step_free_entry') || hintSet.has('accessible_parking')) accessibilitySignals.add('wheelchair_friendly');
  if (keywordMatches(text, ['quiet', 'calm'])) accessibilitySignals.add('quiet_friendly');

  const hasIndoorHint = typeSet.has('museum') || typeSet.has('library') || typeSet.has('movie_theater') || typeSet.has('shopping_mall') || keywordMatches(text, INDOOR_HINTS);
  const hasOutdoorHint = typeSet.has('park') || typeSet.has('beach') || typeSet.has('hiking_area') || typeSet.has('national_park') || keywordMatches(text, OUTDOOR_HINTS);
  if (hasIndoorHint) indoorOutdoorSignals.add('indoor');
  if (hasOutdoorHint) indoorOutdoorSignals.add('outdoor');
  if (hasIndoorHint && hasOutdoorHint) indoorOutdoorSignals.add('both');

  const hasFoodType = Array.from(typeSet).some((type) => FOOD_TYPE_SET.has(type));
  const hasFoodKeyword = keywordMatches(text, ['restaurant', 'cafe', 'kitchen', 'menu', 'takeaway', 'diner', 'eatery', 'grill', 'bistro']);
  const isWineOrFarmVenue = venueTypes.has('wine_farm') || foodKeywords.has('farm stall') || foodKeywords.has('farm shop');
  const servesFood = isWineOrFarmVenue
    ? (hasFoodType || hasFoodKeyword || keywordMatches(text, ['lunch', 'dinner', 'breakfast', 'brunch', 'food']))
    : (hasFoodType || hasFoodKeyword);

  return {
    servesFood,
    foodKeywords,
    venueTypes,
    kidFriendlySignals: kidSignals,
    accessibilitySignals,
    indoorOutdoorSignals,
  };
}

export function scorePlace(place: Place, filters: ExploreFilters, lensDefs: LensDefinition[]): ScoredPlace {
  const caps = derivePlaceCapabilities(place);
  let score = 0;
  const matchedChips: string[] = [];
  const conflictedChips: string[] = [];

  lensDefs.forEach((lens) => {
    const selected = filters[lens.key] as string[];
    if (selected.length === 0) return;
    selected.forEach((chipId) => {
      const chip = lens.chips.find((candidate) => candidate.id === chipId);
      if (!chip) return;
      if (chip.matches(caps)) {
        score += 10;
        matchedChips.push(`${lens.key}:${chip.id}`);
      } else if (chip.conflicts?.(caps)) {
        score -= 5;
        conflictedChips.push(`${lens.key}:${chip.id}`);
      }
    });
  });

  if (filters.foodTypes.length > 0 && !filters.strict.foodTypes && !caps.servesFood) {
    score -= 3;
  }

  return { place, score, matchedChips, conflictedChips };
}

function lensStrictPass(scored: ScoredPlace, filters: ExploreFilters, lens: LensDefinition): boolean {
  const selected = filters[lens.key] as string[];
  if (!filters.strict[lens.key] || selected.length === 0) return true;
  if (lens.key === 'foodTypes' && !derivePlaceCapabilities(scored.place).servesFood) {
    return false;
  }
  const selectedFullKeys = selected.map((chipId) => `${lens.key}:${chipId}`);
  return selectedFullKeys.some((chipKey) => scored.matchedChips.includes(chipKey));
}

export function applyExploreLensRanking(
  places: Place[],
  filters: ExploreFilters,
  lensDefs: LensDefinition[]
): {
  places: Place[];
  scored: ScoredPlace[];
  beforeCount: number;
  afterStrictCount: number;
} {
  const scored = places.map((place) => scorePlace(place, filters, lensDefs));
  const afterStrict = scored.filter((entry) => lensDefs.every((lens) => lensStrictPass(entry, filters, lens)));

  const hasSelections = lensDefs.some((lens) => (filters[lens.key] as string[]).length > 0);
  const sorted = hasSelections
    ? [...afterStrict].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aRating = Number.isFinite(a.place.rating) ? (a.place.rating as number) : 0;
      const bRating = Number.isFinite(b.place.rating) ? (b.place.rating as number) : 0;
      if (bRating !== aRating) return bRating - aRating;
      return parseDistanceKm(a.place.distance) - parseDistanceKm(b.place.distance);
    })
    : afterStrict;

  return {
    places: sorted.map((entry) => entry.place),
    scored: sorted,
    beforeCount: scored.length,
    afterStrictCount: afterStrict.length,
  };
}
