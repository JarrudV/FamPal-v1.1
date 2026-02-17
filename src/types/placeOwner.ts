import type { ActivityType } from '../../types';

export type ClaimStatus = 'pending' | 'verified' | 'rejected';
export type OwnerTier = 'free' | 'business_pro';
export type VerificationMethod = 'email' | 'phone' | 'document' | 'manual';

export interface PlaceClaim {
  id: string;
  placeId: string;
  placeName: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  status: ClaimStatus;
  verificationMethod: VerificationMethod;
  verificationEvidence: string;
  businessRole: string;
  businessEmail?: string;
  businessPhone?: string;
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface PlaceOwnerProfile {
  placeId: string;
  userId: string;
  tier: OwnerTier;
  verifiedAt: string;
  ownerContent: OwnerContent;
  promotedUntil?: string;
  lastUpdatedAt: string;
}

export interface OwnerContent {
  headline?: string;
  aboutUs?: string;
  operatingHours?: OperatingHours;
  photos?: string[];
  specialOffers?: SpecialOffer[];
  events?: PlaceEvent[];
  amenities?: string[];
  ageGroups?: string[];
  kidsMenu?: boolean;
  kidsMenuDetails?: string;
  priceRange?: string;
  bookingUrl?: string;
  socialMedia?: SocialMedia;
  customSections?: CustomSection[];
}

export interface OperatingHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  publicHolidays?: string;
  notes?: string;
}

export interface SpecialOffer {
  id: string;
  title: string;
  description: string;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

export interface PlaceEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  isRecurring: boolean;
  recurringSchedule?: string;
}

export interface SocialMedia {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
}

export interface CustomSection {
  id: string;
  title: string;
  content: string;
}

export interface PlaceTypeTemplate {
  type: ActivityType;
  label: string;
  sections: TemplateSectionConfig[];
}

export interface TemplateSectionConfig {
  key: keyof OwnerContent;
  label: string;
  type: 'text' | 'textarea' | 'boolean' | 'hours' | 'list' | 'offers' | 'events' | 'social' | 'photos';
  description?: string;
  proOnly?: boolean;
}

export const PLACE_TYPE_TEMPLATES: Record<string, PlaceTypeTemplate> = {
  restaurant: {
    type: 'restaurant',
    label: 'Restaurant / Eatery',
    sections: [
      { key: 'headline', label: 'Tagline', type: 'text', description: 'A short catchy description' },
      { key: 'aboutUs', label: 'About Your Restaurant', type: 'textarea' },
      { key: 'operatingHours', label: 'Operating Hours', type: 'hours' },
      { key: 'kidsMenu', label: 'Kids Menu Available', type: 'boolean' },
      { key: 'kidsMenuDetails', label: 'Kids Menu Details', type: 'textarea' },
      { key: 'amenities', label: 'Amenities & Features', type: 'list', description: 'e.g. Play area, High chairs, Changing room' },
      { key: 'ageGroups', label: 'Best For Age Groups', type: 'list', description: 'e.g. Toddlers, 3-6, 7-12' },
      { key: 'priceRange', label: 'Price Range', type: 'text' },
      { key: 'bookingUrl', label: 'Booking Link', type: 'text' },
      { key: 'specialOffers', label: 'Special Offers', type: 'offers', proOnly: true },
      { key: 'events', label: 'Events', type: 'events', proOnly: true },
      { key: 'photos', label: 'Photo Gallery', type: 'photos', proOnly: true },
      { key: 'socialMedia', label: 'Social Media', type: 'social' },
    ],
  },
  outdoor: {
    type: 'outdoor',
    label: 'Outdoor / Nature',
    sections: [
      { key: 'headline', label: 'Tagline', type: 'text' },
      { key: 'aboutUs', label: 'About This Place', type: 'textarea' },
      { key: 'operatingHours', label: 'Operating Hours', type: 'hours' },
      { key: 'amenities', label: 'Facilities', type: 'list', description: 'e.g. Toilets, Braai areas, Picnic spots, Parking' },
      { key: 'ageGroups', label: 'Best For Age Groups', type: 'list' },
      { key: 'priceRange', label: 'Entry Fee', type: 'text' },
      { key: 'bookingUrl', label: 'Booking Link', type: 'text' },
      { key: 'specialOffers', label: 'Seasonal Specials', type: 'offers', proOnly: true },
      { key: 'events', label: 'Upcoming Events', type: 'events', proOnly: true },
      { key: 'photos', label: 'Photo Gallery', type: 'photos', proOnly: true },
      { key: 'socialMedia', label: 'Social Media', type: 'social' },
    ],
  },
  indoor: {
    type: 'indoor',
    label: 'Indoor Activity',
    sections: [
      { key: 'headline', label: 'Tagline', type: 'text' },
      { key: 'aboutUs', label: 'About This Venue', type: 'textarea' },
      { key: 'operatingHours', label: 'Operating Hours', type: 'hours' },
      { key: 'amenities', label: 'What We Offer', type: 'list', description: 'e.g. Trampolines, Soft play, Arcade, VR' },
      { key: 'ageGroups', label: 'Age Groups Welcome', type: 'list' },
      { key: 'priceRange', label: 'Pricing', type: 'text' },
      { key: 'kidsMenu', label: 'Food Available', type: 'boolean' },
      { key: 'kidsMenuDetails', label: 'Food Details', type: 'textarea' },
      { key: 'bookingUrl', label: 'Booking Link', type: 'text' },
      { key: 'specialOffers', label: 'Special Offers', type: 'offers', proOnly: true },
      { key: 'events', label: 'Events & Parties', type: 'events', proOnly: true },
      { key: 'photos', label: 'Photo Gallery', type: 'photos', proOnly: true },
      { key: 'socialMedia', label: 'Social Media', type: 'social' },
    ],
  },
  kids: {
    type: 'kids',
    label: 'Kids Venue',
    sections: [
      { key: 'headline', label: 'Tagline', type: 'text' },
      { key: 'aboutUs', label: 'About Your Venue', type: 'textarea' },
      { key: 'operatingHours', label: 'Operating Hours', type: 'hours' },
      { key: 'amenities', label: 'Activities & Facilities', type: 'list', description: 'e.g. Ball pit, Slides, Climbing wall, Party room' },
      { key: 'ageGroups', label: 'Age Groups', type: 'list', description: 'e.g. 0-2, 3-5, 6-10, 11+' },
      { key: 'kidsMenu', label: 'Food Available', type: 'boolean' },
      { key: 'kidsMenuDetails', label: 'Menu Details', type: 'textarea' },
      { key: 'priceRange', label: 'Entry Prices', type: 'text' },
      { key: 'bookingUrl', label: 'Book a Party / Visit', type: 'text' },
      { key: 'specialOffers', label: 'Deals & Packages', type: 'offers', proOnly: true },
      { key: 'events', label: 'Events & Parties', type: 'events', proOnly: true },
      { key: 'photos', label: 'Photo Gallery', type: 'photos', proOnly: true },
      { key: 'socialMedia', label: 'Social Media', type: 'social' },
    ],
  },
  wine: {
    type: 'wine',
    label: 'Wine Estate / Tasting',
    sections: [
      { key: 'headline', label: 'Tagline', type: 'text' },
      { key: 'aboutUs', label: 'About the Estate', type: 'textarea' },
      { key: 'operatingHours', label: 'Tasting Hours', type: 'hours' },
      { key: 'amenities', label: 'Family Amenities', type: 'list', description: 'e.g. Play area, Picnic lawn, Restaurant, Deli' },
      { key: 'ageGroups', label: 'Kid-Friendly For', type: 'list' },
      { key: 'kidsMenu', label: 'Kids Menu', type: 'boolean' },
      { key: 'kidsMenuDetails', label: 'Kids Menu / Activities', type: 'textarea' },
      { key: 'priceRange', label: 'Tasting Prices', type: 'text' },
      { key: 'bookingUrl', label: 'Book a Tasting', type: 'text' },
      { key: 'specialOffers', label: 'Specials & Deals', type: 'offers', proOnly: true },
      { key: 'events', label: 'Events', type: 'events', proOnly: true },
      { key: 'photos', label: 'Photo Gallery', type: 'photos', proOnly: true },
      { key: 'socialMedia', label: 'Social Media', type: 'social' },
    ],
  },
  active: {
    type: 'active',
    label: 'Sport & Active',
    sections: [
      { key: 'headline', label: 'Tagline', type: 'text' },
      { key: 'aboutUs', label: 'About This Venue', type: 'textarea' },
      { key: 'operatingHours', label: 'Operating Hours', type: 'hours' },
      { key: 'amenities', label: 'Activities & Facilities', type: 'list' },
      { key: 'ageGroups', label: 'Age Groups', type: 'list' },
      { key: 'priceRange', label: 'Pricing', type: 'text' },
      { key: 'bookingUrl', label: 'Book a Session', type: 'text' },
      { key: 'specialOffers', label: 'Packages & Offers', type: 'offers', proOnly: true },
      { key: 'events', label: 'Events & Leagues', type: 'events', proOnly: true },
      { key: 'photos', label: 'Photo Gallery', type: 'photos', proOnly: true },
      { key: 'socialMedia', label: 'Social Media', type: 'social' },
    ],
  },
  hike: {
    type: 'hike',
    label: 'Hiking Trail',
    sections: [
      { key: 'headline', label: 'Trail Description', type: 'text' },
      { key: 'aboutUs', label: 'About This Trail', type: 'textarea' },
      { key: 'operatingHours', label: 'Opening Times', type: 'hours' },
      { key: 'amenities', label: 'Trail Facilities', type: 'list', description: 'e.g. Parking, Toilets, Picnic area, Swimming' },
      { key: 'ageGroups', label: 'Suitable For', type: 'list' },
      { key: 'priceRange', label: 'Entry/Permit Fee', type: 'text' },
      { key: 'bookingUrl', label: 'Book / Permits', type: 'text' },
      { key: 'photos', label: 'Trail Photos', type: 'photos', proOnly: true },
      { key: 'socialMedia', label: 'Social Media', type: 'social' },
    ],
  },
  golf: {
    type: 'golf',
    label: 'Golf / Sport Club',
    sections: [
      { key: 'headline', label: 'Tagline', type: 'text' },
      { key: 'aboutUs', label: 'About the Club', type: 'textarea' },
      { key: 'operatingHours', label: 'Operating Hours', type: 'hours' },
      { key: 'amenities', label: 'Family Facilities', type: 'list', description: 'e.g. Driving range, Restaurant, Pool, Kids area' },
      { key: 'ageGroups', label: 'Kids Programs For', type: 'list' },
      { key: 'kidsMenu', label: 'Food Available', type: 'boolean' },
      { key: 'priceRange', label: 'Green Fees / Rates', type: 'text' },
      { key: 'bookingUrl', label: 'Book a Round', type: 'text' },
      { key: 'specialOffers', label: 'Specials', type: 'offers', proOnly: true },
      { key: 'events', label: 'Events & Tournaments', type: 'events', proOnly: true },
      { key: 'photos', label: 'Photo Gallery', type: 'photos', proOnly: true },
      { key: 'socialMedia', label: 'Social Media', type: 'social' },
    ],
  },
};

export function getTemplateForType(type: ActivityType): PlaceTypeTemplate {
  return PLACE_TYPE_TEMPLATES[type] || PLACE_TYPE_TEMPLATES['indoor'];
}

export const BUSINESS_PRO_PRICE = { amount: 14900, currency: 'ZAR', label: 'R149/month' } as const;

export const BUSINESS_PRO_FEATURES = [
  'Verified Owner Badge',
  'Boosted ranking in search results',
  'Photo gallery (up to 20 photos)',
  'Special offers & promotions',
  'Events listing',
  'Priority support',
] as const;
