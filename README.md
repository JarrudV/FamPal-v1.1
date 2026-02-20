# FamPal

FamPal is a Vite + React + TypeScript app with a Node API server and Firebase services.

## Branch Workflow

- `main`: production-ready code only.
- `staging`: integration and live QA branch.
- Feature branches: branch from `staging`, merge back into `staging`, then promote `staging -> main` after sign-off.

Recommended flow:
1. `git checkout staging && git pull`
2. `git checkout -b feature/<name>`
3. Open PR into `staging`
4. Deploy `staging` only
5. After approval, PR `staging -> main` and release

## Staging Deployment (Safe Path)

Use a separate Firebase project for staging so Firestore/Auth/Storage data is isolated from production.

Setup once (local):
1. Create a Firebase staging project in Console.
2. Add project aliases locally:
   - `firebase use --add` then map alias `production` to your current project.
   - `firebase use --add` then map alias `staging` to your staging project.
3. Configure staging secrets/vars in the staging Firebase project only.

Deploy staging only:
1. `git checkout staging`
2. `npm run build:staging`
3. `firebase deploy --project staging --config firebase.staging.json --only hosting`

If using Firebase App Hosting backends:
1. Keep production backend in production project.
2. Create a separate backend in staging project.
3. Deploy from `staging` branch using staging project:
   - `firebase apphosting:backends:deploy <STAGING_BACKEND_ID> --project staging --config apphosting.staging.yaml`

## Environment Files

Client (Vite):
- Development: `.env.local`
- Staging builds: `.env.staging` (`vite --mode staging`)
- Production builds: `.env.production` (`vite --mode production`)

Server (`server/index.ts` dotenv loader):
- Development: `.env.local` -> `.env.development` -> `.env`
- Staging: `.env.staging` -> `.env`
- Production: `.env.production` -> `.env`

Key notes:
- `PLACES_API_KEY` is the server canonical key.
- Server bridges aliases at runtime:
  - `GOOGLE_PLACES_API_KEY`
- Client must not use any Google Places API key directly.
- Keep all `.env*` files local and uncommitted.

## Dev Auth Bypass (QA/Store Review Only)

- Use `VITE_AUTH_BYPASS=true` in local development to inject a mock signed-in user.
- Bypass is DEV-only and ignored in production builds.
- In bypass mode, cloud writes are disabled to avoid accidental production data changes.
- Before any production build/deploy, ensure `VITE_AUTH_BYPASS` is unset or `false`.

## Google Auth Reliability (Mobile)

- FamPal uses **redirect-first** Google sign-in for better reliability in iOS Safari, Android WebView, Capacitor wrappers, and installed PWA mode.
- The redirect completion handler lives in `App.tsx` (the `getRedirectResult(auth)` effect).
- Popup is only used as a fallback when redirect initialization fails and the browser is a known safe desktop popup environment.

Quick mobile test:
1. Open app in iOS Safari or Android WebView shell.
2. Tap Sign in with Google and complete consent.
3. Confirm app returns signed in (dashboard/profile) without repeated redirect loops.

## Versioning

- Semantic version source of truth: `package.json` `version`.
- Current app version is injected at build time and shown on Profile.

Release steps:
1. Update `package.json` version.
2. Update `CHANGELOG.md`.
3. Merge `staging -> main`.
4. Deploy `main` to production.

## Release Flows

### Web (Firebase App Hosting)
- Web deploy remains unchanged and automatic from Git push.
- Standard flow: push to the branch wired for App Hosting deployment.
- CI/build output remains `dist`.

### Mobile (Capacitor iOS/Android)
1. `npm run build`
2. `npm run cap:sync`
3. Open native project:
   - Android: `npm run cap:open:android`
   - iOS: `npm run cap:open:ios`
4. Build/archive in Android Studio or Xcode.

Note: mobile binaries do **not** auto-update when web is deployed. You must rebuild/sync and ship a new mobile release.
