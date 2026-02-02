# AGENTS.md

This repo is a Vite + React + TypeScript app using Firebase (Auth + Firestore) and Gemini.

## Goals
- Keep changes minimal and targeted.
- Prefer boring, reliable solutions over clever ones.
- Auth must be stable (redirect flow preferred over popup).

## Tech Stack
- Vite + React + TypeScript
- Firebase Auth (Google provider)
- Firestore for user data sync
- Gemini API for place suggestions

## Commands
- Install: npm install
- Dev: npm run dev
- Build: npm run build
- Preview: npm run preview
- Start (hosting): npm run start

## Hard Rules
- Do NOT run deploy commands (firebase deploy / gcloud / hosting release) unless explicitly requested.
- Do NOT change Firebase project identifiers or hosting config unless asked:
  - firebase.json
  - apphosting.yaml
  - VITE_FIREBASE_* env var names
- Do NOT commit secrets or real API keys. Use .env.example as reference.
- Keep Google Auth implementation within Firebase Auth only (no extra auth frameworks unless requested).
- Prefer signInWithRedirect + getRedirectResult over popup for Google sign-in stability.

## Coding Conventions
- TypeScript strictness: keep types explicit for any public function and shared state.
- Keep components small and readable. Avoid giant “god components” unless already present.
- Add logs only when debugging; remove noisy logs once stable.

## PR / Change Discipline
- Explain what changed and why in a short summary.
- If you touch auth, include the exact user flow tested:
  - sign-in
  - refresh persistence
  - logout
