# FamPals - Parents Local Guide

## Overview
FamPals is a React-based mobile application designed to help parents discover and plan family-friendly activities. It leverages Google authentication, Firebase for data persistence, and AI-powered recommendations. The app aims to be a comprehensive local guide, assisting families in finding, sharing, and organizing outings while providing personalized experiences based on user and child preferences. Its core purpose is to simplify activity planning for parents, enhancing family adventures and creating lasting memories. Currently at **v1.3.0** with ~20 test users.

## User Preferences
The user prefers iterative development and detailed explanations. The user wants the agent to ask before making major changes. The user actively develops in VS Code and pushes to GitHub - always check for upstream changes when starting a session.

## System Architecture
The application is built with React 19 and TypeScript, utilizing Vite 7 for building and Tailwind CSS v4 for styling. Firebase provides backend services including authentication and Firestore for data storage. The UI/UX prioritizes a mobile-first, responsive design with clear navigation and engaging visuals.

### Backend
- Node.js/Express backend server (server/index.ts) running on port 8080
- Firebase Admin SDK for server-side auth verification and Firestore access
- Paystack integration for payments/subscriptions
- Google Places API proxy for location searches
- Explore intent configuration (server/exploreIntentConfig.ts)

### Frontend
- React 19 + TypeScript with Vite 7
- Tailwind CSS v4 for styling
- Firebase client SDK for auth and Firestore
- PWA-capable with manifest.json and app icons

Key features include:
- **Authentication**: Google Sign-In and a guest mode.
- **Location Services**: Automatic geolocation with a radius slider for searching places within 1-200km.
- **Profile Management**: Users can manage their profiles, add children with ages, and link with a partner.
- **AI Recommendations**: Google Gemini API is used for AI-driven place recommendations.
- **Intent-first Explore**: Netflix-style layered refinement lenses with optional strict toggles for discovering places.
- **Content Sharing**: One-tap sharing of place details via WhatsApp and integration with Google Calendar for event planning.
- **Personalization**: User and child preferences (food, allergies, accessibility, activities) are incorporated into AI recommendations.
- **Performance Optimization**: Aggressive caching (5-min TTL for places, intent cache), incremental result streaming, background pagination, abortable requests.
- **Cost Optimization**: Google Places API is used for browsing and search to minimize Gemini API usage, reserving Gemini solely for explicit "Ask AI" actions.
- **Persistence**: User preferences, including last location, radius, and category, persist across sessions via Firestore for logged-in users and localStorage for guests.
- **Social Features**: Friend Circles allow users to create private groups, share saved places, and invite members. A dedicated Partner Space facilitates shared favorites and memories with a linked partner.
- **Activity Tracking**: An "Adventures" tab allows users to mark visited places, add notes, and track their family's past outings.
- **Accessibility & Family Facilities**: Confirmed/suggested model for accessibility features and family facilities, preserved in ranking and filtering.
- **Must-Haves Filtering**: MustHavesSheet component for strict filtering requirements.
- **Mobile Responsiveness**: Designed with iOS safe area insets, preventing horizontal overflow, and ensuring accessible touch targets.
- **PWA Support**: Installable as a web app on iOS and Android with proper manifest and icons.

## Plan Limits (Entitlements)
| Feature | Free | Pro (R59/month) |
|---|---|---|
| Saved Places | 10 | Unlimited |
| Memories | 15 | Unlimited |
| Circles | 1 | Unlimited |
| AI Requests/mo | 5 | 100 |
| Preferences | 3/category | Unlimited |
| Partner Favorites | 3 | Unlimited |
| Partner Memories | 3 | Unlimited |

## External Dependencies
- **Firebase**: User authentication (Google Sign-In), Firestore database, Firebase App Hosting (Cloud Run).
- **Google Gemini API**: AI-driven place recommendations.
- **Google Places API**: Browsing, searching, and fetching detailed location information.
- **Paystack**: Payment processing for Pro/Family/Lifetime plans.
- **OpenStreetMap Nominatim**: Reverse geocoding.
- **WhatsApp**: Sharing place details.
- **Google Calendar**: Adding planned activities.

## Key Files
- `App.tsx` - Main app component with routing and global bottom nav
- `types.ts` - Type definitions and plan limits (PLAN_LIMITS)
- `lib/entitlements.ts` - Entitlement checking logic
- `lib/exploreFilters.ts` - Explore filtering logic
- `lib/placeAccessibility.ts` - Accessibility data handling
- `lib/placeFamilyFacilities.ts` - Family facilities data
- `placesService.ts` - Google Places API service
- `server/index.ts` - Express backend server
- `server/exploreIntentConfig.ts` - Explore intent configuration
- `components/Dashboard.tsx` - Main dashboard with tabs
- `components/Filters.tsx` - Category/filter components
- `components/MustHavesSheet.tsx` - Must-haves filtering UI
- `components/VenueProfile.tsx` - Venue detail view
- `components/PlaceCard.tsx` - Place card component
- `components/GroupsList.tsx` - Circles list component
- `components/Profile.tsx` - User profile page
- `components/Onboarding.tsx` - Onboarding flow
- `components/DashboardNetflix.tsx` - Netflix-style browse dashboard (alternative layout)

## Recent Updates
- **V1.3.0 (2026-02-08)**: Intent-first Explore with Netflix-style layered refinement lenses, Explore performance improvements (core/optional query strategy, parallel page-1 loading, background pagination, abortable requests, 5-minute intent cache), accessibility and family-facilities confirmed/suggested model, version display on Profile page.
- **V1.2.0 (2026-02-07)**: Must-haves filtering UX and Explore ranking improvements.
- **V1.1.0 (2026-02-06)**: Partner space enhancements, sharing improvements, and profile sync updates.
- **Replit session (2026-02-08)**: Fixed category cross-contamination. Discovery Mode toggle, Fresh Finds Only toggle, dark mode, toggle alignment fixes, deny list expansion, wine farm detection improvements, venue type scoring, food type filters expansion.
- **Replit session (2026-02-09)**: Aligned tiers to Free + Pro (R59/month) only. Removed family/lifetime tiers from PLAN_LIMITS, PLAN_PRICES, server PLANS, and all UI. Free limits: savedPlaces 10, circles 1, AI 5/mo. Pro: unlimited places/circles/memories, 100 AI/mo. Circle creation enforced with UpgradePrompt. Legacy family/lifetime entitlements mapped to Pro.
- **Replit session (2026-02-16)**: Fixed post-login redirect (view stayed on 'login' after successful auth). Added email/password authentication (sign-in, sign-up with display name, forgot password/reset) alongside Google Sign-In. Login UI redesigned with mode switching (main/email-signin/email-signup/forgot-password). Comprehensive Firebase auth error handling.
- **Replit session (2026-02-17)**: Fixed production auth hang (removed redirectChecked gate from renderView). Refactored Explore tab filters: moved all controls (radius, who's coming, discovery mode, fresh finds, refine/must-haves) into a collapsible FilterPanel bottom sheet. Compact inline filter bar with active-filter badge count and dedicated Refresh button. Active filter chips shown below the bar for quick reference. Photo lightbox: hero image clickable, touch swipe navigation, fallback to hero when no detail photos, safe area insets, dot indicators collapse for >10 photos. Price level display fix: handles new Places API string enums (PRICE_LEVEL_MODERATE → $$). Accessibility & Family Facilities sections: compact layout with section icons, colored status badges, dashed-border contribution buttons, friendlier CTA copy, helper text for empty states.
- **Replit session (2026-02-17b)**: Photo lightbox rendered via ReactDOM.createPortal to document.body (fixes mobile scroll-position issue). Family Facilities section now appears above Accessibility. "About this place" (Google editorial/review summary) + "What visitors say" (review insights with family keyword chips and highlight quote) shown before Family Review. Review-based hint extraction: accessibility and family facility features now detected from Google review text (high chairs, baby changing, playground, stroller, wheelchair access, etc.) and shown as suggested hints. Places API field mask includes editorialSummary/generativeSummary with automatic fallback retry if 400 error.
- **Replit session (2026-02-17c)**: VenueProfile converted from fixed overlay (z-[60]) to inline page component — renders in normal page flow within Dashboard, header/tabs hidden when place detail shown. Removed dead swipe-to-close code. Added bottom padding (pb-24) for fixed nav clearance. Integrated OpenStreetMap Overpass API (src/utils/osmService.ts) to enrich place data with accessibility and family facility tags (wheelchair, playground, baby changing, high chairs, etc.). OSM hints merged with Google Places hints for suggested features. 150m query radius with shop/tourism/leisure filters. 10-minute cache. Race-condition guard with cancellation flag on place change.
