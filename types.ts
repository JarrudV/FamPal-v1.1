
export interface Place {
  id: string;
  name: string;
  description: string;
  address: string;
  rating?: number;
  tags: string[];
  imageUrl?: string;
  mapsUrl: string;
  type: ActivityType;
  priceLevel?: '$' | '$$' | '$$$' | '$$$$';
  phone?: string;
  website?: string;
  distance?: string;
  ageAppropriate?: string;
  fullSummary?: string;
}

export type ActivityType = 'restaurant' | 'outdoor' | 'indoor' | 'active' | 'hike' | 'wine' | 'golf' | 'all';

export interface VisitedPlace {
  placeId: string;
  placeName: string;
  placeType: ActivityType;
  imageUrl?: string;
  visitedAt: string;
  notes: string;
  rating?: number;
  isFavorite: boolean;
}

export interface UserReview {
  id: string;
  placeId: string;
  placeName: string;
  userName: string;
  rating: number;
  comment: string;
  isPublic: boolean;
  date: string;
}

export interface Memory {
  id: string;
  placeId: string;
  placeName: string;
  photoUrl: string;
  caption: string;
  taggedFriends: string[];
  date: string;
}

export interface FavoriteData {
  placeId: string;
  notes: string;
  costEstimate: string;
  menuPhotos: string[];
  lastVisited?: string;
  activities?: string[];
  customTags?: string[];
}

export const ACTIVITY_OPTIONS = {
  'Kids & Family': [
    'Jumping castle', 'Outdoor play area', 'Indoor play area', 'Jungle gym',
    'Water features', 'Pool', 'Petting zoo', 'Animal encounters',
    'Kid-friendly menu', 'High chair available', 'Changing facilities',
    'Pram friendly', 'Shaded seating', 'Safe parking', 'Birthday party friendly'
  ],
  'Nature & Outdoors': [
    'Hike', 'Easy walk', 'Trail running', 'Picnic spot', 'Beach', 'Dam/lake', 'Farm visit'
  ],
  'Food & Drink': [
    'Coffee spot', 'Breakfast', 'Lunch', 'Dinner', 'Wine tasting', 'Beer tasting', 'Craft gin tasting'
  ],
  'Logistics & Vibes': [
    'Free entry', 'Paid entry', 'Booking required', 'Dog friendly', 'Wheelchair accessible', 'Quiet', 'Busy/noisy'
  ]
} as const;

export const FOOD_PREFERENCES = [
  'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 
  'Dairy-free', 'Pescatarian', 'No red meat', 'Organic preferred'
] as const;

export const ALLERGY_OPTIONS = [
  'Nuts', 'Peanuts', 'Tree nuts', 'Dairy', 'Eggs', 'Wheat/Gluten', 
  'Soy', 'Fish', 'Shellfish', 'Sesame', 'Bee stings'
] as const;

export const ACCESSIBILITY_OPTIONS = [
  'Wheelchair user', 'Limited mobility', 'Visual impairment', 
  'Hearing impairment', 'Autism-friendly needed', 'Sensory sensitivities',
  'Service animal', 'Stroller/pram required'
] as const;

export const ACTIVITY_PREFERENCES = [
  'Active/energetic', 'Calm/relaxed', 'Educational', 'Creative/arts',
  'Nature/outdoors', 'Water activities', 'Animals', 'Sports',
  'Indoor play', 'Music/performance', 'Food experiences'
] as const;

export interface Preferences {
  foodPreferences: string[];
  allergies: string[];
  accessibility: string[];
  activityPreferences: string[];
  notes?: string;
}

export interface Child {
  id: string;
  name: string;
  age: number;
  preferences?: Preferences;
}

export interface FamilyGroup {
  id: string;
  name: string;
  type: 'partner' | 'family' | 'friends';
  members: string[];
  memberEmails: string[];
  inviteCode: string;
  whatsappLink?: string;
  sharedFavorites: string[];
  sharedNotes: Record<string, string>;
  createdAt: string;
  createdBy: string;
}

export interface PartnerLink {
  partnerEmail?: string;
  partnerName?: string;
  partnerUserId?: string;
  linkedAt: string;
  status: 'pending' | 'accepted';
  inviteCode?: string;
}

export interface GroupMember {
  userId: string;
  email: string;
  displayName: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface GroupPlace {
  placeId: string;
  placeName: string;
  addedBy: string;
  addedByName: string;
  addedAt: string;
  note?: string;
}

export interface GroupPlan {
  id: string;
  placeId: string;
  placeName: string;
  date: string;
  time?: string;
  note?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface FriendCircle {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  members: GroupMember[];
  sharedPlaces: GroupPlace[];
  plans: GroupPlan[];
  inviteCode: string;
  createdAt: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type PlanTier = 'free' | 'pro' | 'lifetime';
export type PlanStatus = 'active' | 'cancelled' | 'expired';
export type EntitlementSource = 'paystack' | 'apple' | 'google' | 'admin' | null;

export interface Entitlement {
  plan_tier: PlanTier;
  plan_status: PlanStatus;
  entitlement_source: EntitlementSource;
  entitlement_start_date: string | null;
  entitlement_end_date: string | null;
  paystack_customer_code?: string;
  paystack_subscription_code?: string;
  last_payment_reference?: string;
  ai_requests_this_month: number;
  ai_requests_reset_date: string;
}

export const PLAN_LIMITS = {
  free: {
    savedPlaces: 25,
    notebookEntries: 25,
    memories: 10,
    circles: 2,
    aiRequestsPerMonth: 10,
    preferencesPerCategory: 3,
    partnerFavorites: 3,
    partnerMemories: 3,
  },
  pro: {
    savedPlaces: Infinity,
    notebookEntries: Infinity,
    memories: Infinity,
    circles: Infinity,
    aiRequestsPerMonth: 100,
    preferencesPerCategory: Infinity,
    partnerFavorites: Infinity,
    partnerMemories: Infinity,
  },
  lifetime: {
    savedPlaces: Infinity,
    notebookEntries: Infinity,
    memories: Infinity,
    circles: Infinity,
    aiRequestsPerMonth: 200,
    preferencesPerCategory: Infinity,
    partnerFavorites: Infinity,
    partnerMemories: Infinity,
  }
} as const;

export const PLAN_PRICES = {
  pro: { amount: 7500, currency: 'ZAR', label: 'R75/year' },
  lifetime: { amount: 39900, currency: 'ZAR', label: 'R399 once-off' }
} as const;

export function getDefaultEntitlement(): Entitlement {
  const now = new Date();
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    plan_tier: 'free',
    plan_status: 'active',
    entitlement_source: null,
    entitlement_start_date: null,
    entitlement_end_date: null,
    ai_requests_this_month: 0,
    ai_requests_reset_date: resetDate.toISOString(),
  };
}

export interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  favorites: string[]; 
  favoriteDetails: Record<string, FavoriteData>;
  visited: string[];
  visitedPlaces: VisitedPlace[];
  reviews: UserReview[];
  memories: Memory[];
  children: Child[];
  preferences?: Preferences;
  spouseName?: string;
  linkedEmail?: string;
  partnerLink?: PartnerLink;
  groups: FamilyGroup[];
  friendCircles: FriendCircle[];
  entitlement: Entitlement;
  aiRequestsUsed: number;
  isPro?: boolean;
}
