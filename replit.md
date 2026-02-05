# FamPals - Parents Local Guide

## Overview
FamPals is a React-based mobile application designed to help parents discover and plan family-friendly activities. It leverages Google authentication, Firebase for data persistence, and AI-powered recommendations. The app aims to be a comprehensive local guide, assisting families in finding, sharing, and organizing outings while providing personalized experiences based on user and child preferences. Its core purpose is to simplify activity planning for parents, enhancing family adventures and creating lasting memories.

## User Preferences
The user prefers iterative development and detailed explanations. The user wants the agent to ask before making major changes.

## System Architecture
The application is built with React 19 and TypeScript, utilizing Vite 7 for building and Tailwind CSS v4 for styling. Firebase provides backend services including authentication and Firestore for data storage. The UI/UX prioritizes a mobile-first, responsive design with clear navigation and engaging visuals.

Key features include:
- **Authentication**: Google Sign-In and a guest mode.
- **Location Services**: Automatic geolocation with a radius slider for searching places within 1-200km.
- **Profile Management**: Users can manage their profiles, add children with ages, and link with a partner.
- **AI Recommendations**: Google Gemini API is used for AI-driven place recommendations.
- **Content Sharing**: One-tap sharing of place details via WhatsApp and integration with Google Calendar for event planning.
- **Image Handling**: Category-specific placeholder images and user photo uploads for memories via Firebase Storage.
- **Personalization**: User and child preferences (food, allergies, accessibility, activities) are incorporated into AI recommendations.
- **Performance Optimization**: Aggressive caching (5-min TTL for places, place details by ID) is implemented to reduce API calls and improve responsiveness.
- **Cost Optimization**: Google Places API is used for browsing and search to minimize Gemini API usage, reserving Gemini solely for explicit "Ask AI" actions.
- **Persistence**: User preferences, including last location, radius, and category, persist across sessions via Firestore for logged-in users and localStorage for guests.
- **Social Features**: Friend Circles allow users to create private groups, share saved places, and invite members. A dedicated Partner Space facilitates shared favorites and memories with a linked partner.
- **Activity Tracking**: An "Adventures" tab allows users to mark visited places, add notes, and track their family's past outings.
- **Discovery Mode**: A toggle to hide saved places from the explore feed, encouraging discovery of new venues.
- **Mobile Responsiveness**: Designed with iOS safe area insets, preventing horizontal overflow, and ensuring accessible touch targets.

## External Dependencies
- **Firebase**: Used for user authentication (Google Sign-In), Firestore database for data persistence (user profiles, preferences, saved places, circles, memories), and Firebase Storage for photo uploads.
- **Google Gemini API**: Powers AI-driven place recommendations and custom inquiries about venues.
- **Google Places API**: Used for browsing, searching, and fetching detailed information about locations, optimizing cost and performance.
- **OpenStreetMap Nominatim**: Utilized for reverse geocoding to convert coordinates into human-readable addresses.
- **Unsplash**: Provides category-specific placeholder images for venues.
- **WhatsApp**: Integrated for sharing place details directly from the app.
- **Google Calendar**: Allows users to quickly add planned activities to their calendar.

## Recent Updates
- **Places pagination**: Added a "Load more" flow for Explore results that appends pages without resetting filters or location.
- **Places filtering**: Added a configurable denylist to remove petrol stations/convenience venues from Places results, with optional brand exclusions.
- **Partner tab CTA**: Partner tab is visible for all users with an unlinked empty state and optional Pro gate via `VITE_PARTNER_LINK_REQUIRES_PRO`.
- **Onboarding flow**: First login now routes to onboarding with core feature screens and preference setup, tracked in Firestore.
- **Onboarding profile capture**: Collects name, age, preferences, dependants, and optional partner invite during first run.
- **AI guardrails**: Added Gemini logging, caching with refresh, output token caps, and request timeouts.
- **Family plan scaffolding**: Added a Family tier with pooled AI allowance for linked partners and entitlement-based gating for partner linking.
