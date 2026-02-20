# Place Refresh Scheduler

## What It Does
- Daily refresh pipeline for stale `places` documents.
- Uses staleness from `lastRefreshedAt` + `popularityScore`.
- Refresh cadence:
  - High saves/views popularity: every 7 days.
  - Otherwise: every 30 days.
- Updates:
  - `refreshState`
  - `lastRefreshedAt`
  - `staleAfterDays`
  - `popularityScore`
  - latest Google source snapshot (`places/{placeId}/sources/google`)

## Endpoint
- `POST /api/admin/places/refresh-stale`
- Auth header required in production:
  - `x-scheduler-token: <PLACE_REFRESH_CRON_TOKEN>`

## Environment Variables
- `PLACE_REFRESH_CRON_TOKEN` (required in production)
- `PLACE_REFRESH_MAX_PER_RUN` (default `30`)
- `PLACE_REFRESH_CANDIDATE_MULTIPLIER` (default `4`)
- `PLACE_REFRESH_CONCURRENCY` (default `3`)
- `GOOGLE_PLACES_API_KEY` (server-side only)

## Manual Run (local/dev)
```bash
curl -X POST "http://localhost:8080/api/admin/places/refresh-stale?dryRun=true&limit=20"
```

If token configured locally:
```bash
curl -X POST "http://localhost:8080/api/admin/places/refresh-stale?limit=20" \
  -H "x-scheduler-token: YOUR_TOKEN"
```

## Cloud Scheduler (Cloud Run backend)
Create a daily HTTP job to call your deployed backend:
- URL: `https://<your-backend-domain>/api/admin/places/refresh-stale?limit=30`
- Method: `POST`
- Header: `x-scheduler-token: <PLACE_REFRESH_CRON_TOKEN>`
- Frequency: once per day (for example `0 3 * * *` UTC)

## Quota/Backoff Behaviour
- Per-run refresh cap enforced by `PLACE_REFRESH_MAX_PER_RUN`.
- Concurrency is bounded (`PLACE_REFRESH_CONCURRENCY`).
- Failures apply exponential retry backoff via `refreshState.nextRefreshAt`.

## Logging
- Job summary is logged:
  - `scannedCount`
  - `staleCount`
  - `refreshedCount`
  - `failedCount`
  - `skippedCount`
  - `elapsedMs`
