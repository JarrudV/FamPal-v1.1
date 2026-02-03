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
