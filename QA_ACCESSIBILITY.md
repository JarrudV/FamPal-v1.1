# Accessibility QA Checklist

## 1. Card badges
- Open Explore and confirm each place card shows up to 2 accessibility chips when data exists.
- Confirm a `+x` chip appears when more than 2 priority true features are present.
- Confirm `Accessibility info missing` appears when no accessibility data exists.

## 2. Detail section
- Open a place detail and confirm the `Accessibility` section renders.
- Confirm groups are shown:
  - Entry and movement
  - Facilities
  - Seating and space
  - Challenges
- Confirm confidence label behavior:
  - `Verified features present` when at least one feature has `verified`
  - `Reported by users` when only `reported` exists
  - `Accessibility info missing` when data is missing/unknown
- Confirm `Good to know` text uses `accessibilitySummary`.

## 3. Contribution flow
- In place detail, click `Add accessibility info`.
- In modal:
  - Select one or more features.
  - Set confidence (`I saw this myself` or `Not 100 percent`).
  - Optionally add a comment.
- Submit and verify:
  - New report is written to `places/{placeId}/accessibilityReports/{reportId}`.
  - `places/{placeId}.accessibility` is updated via normalization.
  - `places/{placeId}.accessibilitySummary` is regenerated deterministically.
  - Detail section updates after submit.

## 4. Summary generation
- Verify deterministic rule order:
  - step-free entry first
  - paved paths or smooth surface next
  - accessible toilet next
  - accessible parking next
  - warnings for steep slopes / gravel or sand
- Verify fallback when no usable data:
  - `Limited accessibility info. If you visit, add what you notice.`

## 5. Ranking behavior
- Set accessibility needs in Profile under `Mobility Needs for Ranking`.
- Return to Explore and verify:
  - matching places are boosted
  - conflicting places are de-ranked
  - unknown data is lightly de-ranked
  - no places are hidden

## Changed Files
- `src/types/place.ts`
- `types.ts`
- `src/utils/accessibility.ts`
- `src/components/AccessibilityBadges.tsx`
- `src/components/PlaceAccessibilitySection.tsx`
- `src/components/AccessibilityContributionModal.tsx`
- `lib/placeAccessibility.ts`
- `components/PlaceCard.tsx`
- `components/VenueProfile.tsx`
- `components/Dashboard.tsx`
- `components/Profile.tsx`
- `App.tsx`
- `firestore.rules`
- `QA_ACCESSIBILITY.md`

