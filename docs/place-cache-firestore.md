# Place Cache Firestore Notes

## Collections
- `places/{placeId}`
- `places/{placeId}/sources/google`
- `places/{placeId}/reports/{reportId}`
- `places/{placeId}/edits/{editId}`

## Canonical Document Shapes

### `places/{placeId}`
```json
{
  "placeId": "ChIJ123abcXYZ",
  "googlePlaceId": "ChIJ123abcXYZ",
  "name": "Example Family Cafe",
  "normalizedName": "example family cafe",
  "address": "123 Main Rd, Cape Town",
  "geo": { "lat": -33.9249, "lng": 18.4241, "geohash": "k3vngp6f3" },
  "rating": 4.4,
  "userRatingsTotal": 182,
  "priceLevel": "$$",
  "mapsUrl": "https://www.google.com/maps/place/?q=place_id:ChIJ123abcXYZ",
  "imageUrl": "https://places.googleapis.com/v1/places/.../media?...",
  "types": ["restaurant", "cafe", "food"],
  "primaryType": "restaurant",
  "facets": {
    "categories": ["restaurant", "kids"],
    "venueTypes": ["restaurant", "cafe"],
    "foodTypes": ["coffee", "brunch"],
    "kidFriendlySignals": ["kids_menu"],
    "accessibilitySignals": ["wheelchair_friendly"],
    "indoorOutdoorSignals": ["indoor"]
  },
  "facetsConfidence": 0.75,
  "categoryContext": {
    "requestedCategory": "restaurant",
    "searchQuery": "breakfast",
    "ingestionSource": "searchNearbyPlacesTextApi"
  },
  "sourceVersions": { "google": "9a3ef021" },
  "lastRefreshedAt": "serverTimestamp",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### `places/{placeId}/sources/google`
```json
{
  "googlePlaceId": "ChIJ123abcXYZ",
  "versionHash": "9a3ef021",
  "fetchedAt": "serverTimestamp",
  "requestedCategory": "restaurant",
  "searchQuery": "breakfast",
  "ingestionSource": "searchNearbyPlacesTextApi",
  "source": {
    "id": "ChIJ123abcXYZ",
    "displayName": { "text": "Example Family Cafe" },
    "formattedAddress": "123 Main Rd, Cape Town"
  }
}
```

## Composite Index Notes
`getPlacesByGeoBoundsAndCategory(bounds, category, limit)` now uses geohash range queries:
- `orderBy('geo.geohash')`
- `startAt(prefix)` / `endAt(prefix + '\uf8ff')`
- optional `where('facets.categories', 'array-contains', category)`
- precise `geo.lat`/`geo.lng` bounds filtering in memory after fetch

Required composite index:
- Collection: `places`
- Fields:
  - `facets.categories` (`array-contains`)
  - `geo.geohash` (`ascending`)

This avoids Firestore multi-range warnings from querying both `geo.lat` and `geo.lng` as inequalities.

Deploy index changes:
```bash
firebase deploy --only firestore:indexes
```
