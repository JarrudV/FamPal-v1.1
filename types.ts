
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

export type ActivityType = 'restaurant' | 'outdoor' | 'indoor' | 'active' | 'hike' | 'show' | 'all';

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

export interface Child {
  id: string;
  name: string;
  age: number;
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
  partnerEmail: string;
  partnerName: string;
  linkedAt: string;
  status: 'pending' | 'accepted';
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

export interface AppState {
  isAuthenticated: boolean;
  user: User | null;
  favorites: string[]; 
  favoriteDetails: Record<string, FavoriteData>;
  visited: string[];
  reviews: UserReview[];
  memories: Memory[];
  children: Child[];
  spouseName?: string;
  linkedEmail?: string;
  partnerLink?: PartnerLink;
  groups: FamilyGroup[];
  friendCircles: FriendCircle[];
  aiRequestsUsed: number;
  isPro?: boolean;
}
