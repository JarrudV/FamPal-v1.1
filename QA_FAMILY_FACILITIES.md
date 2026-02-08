# Family Facilities QA

## Run locally

1. Install dependencies:
   - `npm install`
   - `cd functions && npm install`
2. Start emulators from repo root:
   - `firebase emulators:start --only firestore,functions,auth`
3. In another terminal, start app:
   - `npm run dev`

## Manual checks

1. Open a place detail page.
2. Verify **Family Facilities** section:
   - If there are no confirmed true features, header shows `Family info not yet confirmed`.
   - Each group with no confirmed true features shows `No confirmed family info yet.`
3. Open **Add family facilities info** modal.
4. Verify modal sections:
   - `What we already know` lists only confirmed true features.
   - `Help confirm these details` shows optional Google-based hints tagged `Suggested by public sources`.
5. Submit a report with one or more selected features.
6. In Firestore emulator UI:
   - Confirm a new doc is created at `places/{placeId}/familyFacilitiesReports/{reportId}`.
7. Confirm Cloud Function writes aggregated parent fields on `places/{placeId}`:
   - `familyFacilities`
   - `familyFacilitiesSummary`
8. Refresh app (or wait for listener update):
   - Confirm Family Facilities section reflects parent doc values.
   - Confirm suggested hints are not shown on place detail page.

