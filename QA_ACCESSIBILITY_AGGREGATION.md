# Accessibility Aggregation QA

## Run functions emulator
1. Install functions deps:
```bash
cd functions
npm install
npm run build
cd ..
```
2. Start emulators:
```bash
firebase emulators:start --only firestore,functions
```

## Submit a report in the app
1. Run app locally in another terminal:
```bash
npm run dev
```
2. Open a place detail.
3. Click `Add accessibility info`.
4. Select one or more features and submit.

## Verify place document updates
1. In Firestore emulator UI, open:
   - `places/{placeId}/accessibilityReports/{reportId}` and confirm fields:
     - `userId`
     - `createdAt`
     - `comment` (optional)
     - `selections: [{ feature, value: true, confidence: "reported" }]`
2. Open parent `places/{placeId}` and confirm:
   - `accessibility` array updated
   - `accessibilitySummary` updated

## Expected UI outcome
1. Place list pills show only confirmed true features.
2. If no confirmed true features, show:
   - `no confirmed accessibility info yet`
3. Place detail accessibility section updates after trigger runs.

