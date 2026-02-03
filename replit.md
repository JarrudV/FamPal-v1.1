# FamPals - Parents Local Guide

## Overview
A React-based family adventure app that helps parents find curated family-friendly activities. The app supports Google authentication and guest mode, with Firebase integration for user data persistence and AI-powered place recommendations using Google Gemini.

## Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS v4 (via PostCSS)
- **Backend Services**: Firebase (Auth, Firestore)
- **AI Integration**: Google Gemini API
- **Geolocation**: Browser Geolocation API + OpenStreetMap Nominatim for reverse geocoding

## Project Structure
```
/
├── App.tsx              # Main application component with auth & state management
├── index.tsx            # Entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS v4 configuration
├── postcss.config.js    # PostCSS configuration
├── components/          # React components
│   ├── Dashboard.tsx    # Main dashboard with geolocation & radius slider
│   ├── Header.tsx       # Header with user profile & location
│   ├── Profile.tsx      # User profile management
│   ├── PlaceCard.tsx    # Place card component
│   ├── VenueProfile.tsx # Venue detail view
│   └── ...
├── lib/                 # Library utilities
│   └── firebase.ts      # Firebase setup with runtime validation
├── src/
│   └── index.css        # Tailwind CSS entry point
├── geminiService.ts     # Gemini AI integration for place recommendations
└── types.ts             # TypeScript type definitions
```

## Development
- Run `npm run dev` to start the development server on port 5000
- Run `npm run build` to create a production build
- The app uses hot module replacement (HMR) for development

## Features
- **Google Sign-In**: Uses popup authentication for better cross-domain compatibility
- **Guest Mode**: Try the app without signing in
- **Geolocation**: Automatically detects user's location
- **Radius Slider**: Search for places within 1-200km radius
- **Profile Management**: Add children with ages, link partner
- **Firestore Persistence**: All profile data saves to Firebase automatically
- **AI Recommendations**: Uses Gemini to suggest family-friendly places
- **Share to WhatsApp**: One-tap sharing of place details with friends/family
- **Add to Calendar**: Quick "Plan This" button to add places to Google Calendar
- **Reliable Images**: Category-specific placeholder images from Unsplash

## Environment Variables (Secrets)
All secrets are stored securely in Replit Secrets:
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_GEMINI_API_KEY` - Google Gemini API key (must not be exposed publicly)

## Firebase Authentication Setup
For Google Sign-In to work:
1. Go to Firebase Console -> Authentication -> Settings -> Authorized domains
2. Add your Replit domain (e.g., `*.replit.dev`, `*.replit.app`)
3. Add your Firebase App Hosting domain (e.g., `your-project.web.app`)

## Deployment
- Configured for static deployment
- Build output goes to `dist/` directory
- Auto-deploys to Firebase App Hosting when pushed to GitHub

## Recent Changes (Feb 2026)
- Fixed Google Sign-In popup authentication for Firebase App Hosting
- Installed Tailwind CSS v4 properly via PostCSS (removed CDN)
- Added geolocation with reverse geocoding
- Added radius slider (1-200km) for search area
- Fixed profile picture display with `referrerPolicy="no-referrer"`
- Fixed Firestore persistence for profile data
- **V1.1 Features**:
  - AI "Ask about this place" with quick questions & custom input (in-memory cached per session)
  - Photo uploads for memories (Firebase Storage, 5MB limit, user-scoped paths)
  - Partner linking with PartnerLink data model (pending/accepted status, unlink option)
  - Category-specific placeholder images from Unsplash
  - Share to WhatsApp & Add to Google Calendar buttons
- **V1.2 Performance & UX**:
  - Places caching (5-min TTL) to reduce API calls and speed up navigation
  - Working search bar with search button and clear (X) functionality
  - Postcode/address input - click location name to enter custom location
  - Website and phone numbers now displayed on venue profiles (clickable)
  - Improved geocoding with proper User-Agent headers
  - Cache keys include family context (children ages) for accurate results
- **V1.3 Freemium Model**:
  - AI requests limited to 5 for free signed-in users (tracks usage in AppState)
  - Guest users see greyed-out AI panel with "Sign in to unlock AI summaries" prompt
  - Pro model foundation (isPro flag) for unlimited AI access
  - "Save Summary to Notes" button appends AI responses to venue notes with timestamps
  - Visual feedback with "Saved!" confirmation and remaining requests counter
- **V1.4 Friend Circles (Private Groups)**:
  - Create private groups with partner, family, or friends (max 2 circles per user)
  - Share saved places with group members
  - "Add to Group" button on saved places for quick sharing
  - Group detail view with members list and shared places
  - Invite members via shareable link or email
  - Leave or delete groups (owner can delete, members can leave)
  - Data models: FriendCircle, GroupMember, GroupPlace, GroupPlan
  - Guest users see teaser UI with sample groups and login CTA
- **V1.5 Parents Notebook Activities**:
  - Activities/features tagging system in Parent's Notebook
  - 40+ predefined activity tags across 4 categories (Kids & Family, Nature & Outdoors, Food & Drink, Logistics & Vibes)
  - Toggle tags on/off per saved place for quick reference
  - Tags persist to Firestore with favoriteData
- **V1.6 Past Adventures**:
  - New "Adventures" tab to track places you've visited
  - Adventure counter with trophy display showing total visits
  - "Mark as Visited" button (map icon) on venue profiles
  - Notes editing for each visited place
  - Visit date tracking and remove option
  - Shows heart for places that are also favorites
  - Wine farms category added to activity filters
- **V1.7 Mobile Layout Fixes (App Store Ready)**:
  - iOS safe area insets for notch/home indicator
  - Prevented horizontal overflow on all screens
  - Added container-safe class for proper viewport handling
  - Responsive text sizing for venue names
  - Minimum 44px touch targets for buttons
  - Word-break for long place names
- **V1.8 Improved Features**:
  - Partner linking now uses 6-digit invite codes (no email required)
  - Generate code, copy or share via WhatsApp
  - Partners enter code to link accounts
  - Enhanced Memories: Tag a venue when adding memory
  - Photo upload for memories (max 5MB)
  - Adding memory auto-marks venue as visited
  - Memories appear as activity feed on venue profile page
  - Venue selector shows saved places and nearby places
  - **Partner Space**: Dedicated tab for linked partners with shared favorites, memories, and quick notes
  - Tab bar: Smaller text, tighter spacing, Memories tab added back
  - Tabs now: Explore, Saved, Adventures, Memories, Partner (when linked), Groups
- **V1.9 Preferences & Personalization**:
  - User preferences: Food (vegetarian, vegan, halal, etc.), allergies, accessibility needs, activity preferences
  - Child preferences: Nested preferences per child with food, allergies, accessibility, and activity preferences
  - Collapsible preferences section in Profile with toggle buttons
  - AI search now uses preferences to filter recommendations (avoids allergens, considers accessibility)
  - **Free tier limits**: 3 preferences per category (food, allergies, accessibility, activities)
  - Disabled state for preferences at limit (greyed out buttons)
  - Pro upsell banner in preferences section
  - Partner Space limited to 3 favorites + 3 memories for free tier (Pro for unlimited)
  - Pro upsell banner when limits exceeded
- **V2.0 Performance & Cost Optimization**:
  - **NEW: Google Places API** for browsing - near-instant, no AI cost
  - Browsing/Explore/Search uses Google Places API (not Gemini)
  - AI (Gemini) now ONLY used for explicit "Ask AI" button actions
  - Places cached by area+radius (30-min TTL in localStorage)
  - Place details cached by place_id
  - Categories updated: Removed "Shows", renamed "Play" to "Indoor", added "Golf"
  - "Wine" renamed to "Wine Farms" and moved next to "Dine"
  - Fixed "Open in Maps" for iPhone - uses Apple Maps deep links on iOS
  - Navigate button uses coordinates when available for accurate directions
  - Google Reviews section on venue profiles (shows 3 reviews + "See all on Google" link)
  - Review source transparency: Shows total review count and links to Google
  - New placesService.ts handles all Google Places API calls
  - Cost reduction: Browsing is now free/cheap (Places API) instead of expensive (Gemini)
- **V2.1 Profile Sync & Persistence**:
  - New UserPreferences interface: lastLocation, lastRadius, lastCategory, activeCircleId
  - lib/profileSync.ts service with debounced saves (1.5s delay to batch rapid changes)
  - User preferences persist to Firestore for logged-in users
  - Guest users persist to localStorage, synced to account on login
  - Location, radius, and category restored on app restart
  - Geolocation only fetches if no saved location exists
- **Guest Mode Restrictions**:
  - Memories tab: Sign-in required prompt
  - Profile family updates: Sign-in required prompt
  - Connections/partner linking: Hidden for guests
  - Groups: Teaser UI with sample circles shown
  - Family info messaging: "Add children's ages for better AI recommendations"

## Environment Variables (Secrets)
All secrets are stored securely in Replit Secrets:
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_GEMINI_API_KEY` - Google Gemini API key (AI features only)
- `VITE_GOOGLE_PLACES_API_KEY` - Google Places API key (browsing/search)
