# FamPals - Parents Local Guide

## Overview
FamPals is a React-based mobile application designed to help parents discover and plan family-friendly activities. It simplifies activity planning, leveraging AI-powered recommendations and social features to create personalized family adventures. The app aims to be a comprehensive local guide for finding, sharing, and organizing outings, enhancing family experiences, and creating lasting memories.

## User Preferences
The user prefers iterative development and detailed explanations. The user wants the agent to ask before making major changes. The user actively develops in VS Code and pushes to GitHub - always check for upstream changes when starting a session.

## System Architecture
The application is built with React 19, TypeScript, Vite 7, and Tailwind CSS v4. It features a mobile-first, responsive UI/UX with clear navigation. Firebase provides backend services for authentication and Firestore for data storage.

**Key Features:**
-   **Authentication**: Google Sign-In and email/password authentication, including guest mode.
-   **Location Services**: Automatic geolocation with a radius slider for searches (1-200km).
-   **Profile Management**: User and child profiles, partner linking.
-   **AI Recommendations**: Utilizes Google Gemini API for personalized place recommendations based on user and child preferences (food, allergies, accessibility).
-   **Intent-first Explore**: Netflix-style layered refinement lenses with optional strict toggles for discovering places.
-   **Content Sharing**: One-tap sharing via WhatsApp and Google Calendar integration.
-   **Performance & Cost Optimization**: Aggressive caching (5-min TTL for places, intent cache), incremental result streaming, background pagination, abortable requests. Google Places API is primarily used for browsing/search, reserving Gemini for explicit "Ask AI" actions to optimize costs.
-   **Persistence**: User preferences (location, radius, category) persist across sessions via Firestore (logged-in) and localStorage (guests).
-   **Social Features**: Friend Circles for private groups and shared places; Partner Space for shared favorites and memories.
-   **Activity Tracking**: "My Activity" dashboard for tracking visited places, notes, and past outings.
-   **Accessibility & Family Facilities**: Community-contributed and verified data for accessibility features and family facilities, influencing ranking and filtering.
-   **Gamification**: FamPals Explorer system awards points and badges for user contributions (e.g., reports, reviews), tracked via levels and an activity dashboard.
-   **PWA Support**: Installable as a web app on iOS and Android.

**Backend Components:**
-   Node.js/Express server (`server/index.ts`) for server-side logic.
-   Firebase Admin SDK for authentication and Firestore access.
-   Paystack integration for payments.
-   Google Places API proxy and OpenStreetMap Nominatim for location data.

**Frontend Components:**
-   React 19 + TypeScript with Vite 7.
-   Tailwind CSS v4 for styling.
-   Firebase client SDK for auth and Firestore.

**Data Strategy:**
-   **Community-first model**: User-contributed data (accessibility, family facilities, reports, verdicts) is prioritized and cached permanently in Firestore.
-   **Google Places as fallback**: Google Places API data fills gaps, cached in Firestore for 90 days.
-   **3-tier cache**: `localStorage` (60min) → Firestore shared cache (90 days / permanent) → Google Places API (last resort).
-   **Cost-effective**: Firestore reads are significantly cheaper than Google Places API calls, reducing dependency over time as community data grows.

## External Dependencies
-   **Firebase**: User authentication (Google Sign-In, email/password), Firestore database, Firebase App Hosting.
-   **Google Gemini API**: AI-driven place recommendations.
-   **Google Places API**: Browsing, searching, and detailed location information.
-   **Paystack**: Payment processing for premium plans.
-   **OpenStreetMap Nominatim**: Reverse geocoding and enriching place data with accessibility/family facility tags.
-   **WhatsApp**: Sharing place details.
-   **Google Calendar**: Adding planned activities.