# FamPals - Parents Local Guide

## Overview
A React-based family adventure app that helps parents find curated family-friendly activities. The app supports Google authentication and guest mode, with Firebase integration.

## Tech Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS (via CDN)
- **Backend Services**: Firebase (Auth, Firestore)
- **AI Integration**: Google Gemini API

## Project Structure
```
/
├── App.tsx              # Main application component
├── index.tsx            # Entry point
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── components/          # React components
├── lib/                 # Library utilities (Firebase setup)
├── src/                 # Source files
├── dataconnect/         # Firebase Data Connect config
├── geminiService.ts     # Gemini AI integration
└── types.ts             # TypeScript type definitions
```

## Development
- Run `npm run dev` to start the development server on port 5000
- Run `npm run build` to create a production build
- The app uses hot module replacement (HMR) for development

## Environment Variables (Secrets)
All secrets are stored securely in Replit Secrets:
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_GEMINI_API_KEY` - Google Gemini API key

## Firebase Authentication Setup
For Google Sign-In to work:
1. Go to Firebase Console -> Authentication -> Settings -> Authorized domains
2. Add your Replit domain (e.g., `*.replit.dev`)
3. Add your Firebase App Hosting domain if publishing there

## Deployment
- Configured for static deployment
- Build output goes to `dist/` directory
