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
├── lib/                 # Library utilities
├── src/                 # Source files
├── dataconnect/         # Firebase Data Connect config
└── types.ts             # TypeScript type definitions
```

## Development
- Run `npm run dev` to start the development server on port 5000
- Run `npm run build` to create a production build
- The app uses hot module replacement (HMR) for development

## Environment Variables
The app expects:
- `GEMINI_API_KEY` - Google Gemini API key for AI features
- Firebase configuration in `.env` file

## Deployment
- Configured for static deployment
- Build output goes to `dist/` directory
