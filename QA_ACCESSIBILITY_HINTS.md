# QA Accessibility Hints

## View hints in modal
1. Open a place detail page.
2. Click `Add accessibility info`.
3. In the modal:
   - `What we already know` should show confirmed FamPal features only.
   - `Help confirm these details` should show Google-derived hints with tag:
     - `Suggested by public sources`

## Confirm a hint and verify it becomes confirmed
1. Tick one or more suggested hints.
2. Submit the accessibility report.
3. Wait for Cloud Function aggregation to update `places/{placeId}`.
4. Refresh or wait for live listener update.
5. Confirm the feature appears as confirmed in `What we already know` and in place accessibility UI.

## Ensure hints do not leak outside modal
1. On place cards and place detail pills, verify only confirmed features are shown.
2. Unconfirmed Google hints must not appear as pills or summary content until confirmed by report aggregation.

