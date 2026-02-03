
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
}

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
}
