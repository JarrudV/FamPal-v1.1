# Community Reports and Trust Scoring

## Report Payload Example
```json
{
  "kidPrefs": {
    "kids_menu": true,
    "high_chair": true,
    "play_area_jungle_gym": false
  },
  "accessibility": {
    "wheelchair_friendly": true,
    "accessible_toilets": true,
    "step_free": true
  },
  "notes": "Ramp at main entrance and two accessible toilets.",
  "photoRefs": [
    "gs://bucket/community/places/ChIJ.../report_123/photo_1.jpg"
  ]
}
```

## Trust Scoring Model
- Base weight per report: `1.0`
- Helpful votes boost: `+0.15` per vote, capped at `+2.5`
- Moderator verified boost: `+2.0`
- Signal confidence is derived from weighted support volume and agreement:
  - `confidence = clamp((totalWeight / 8) * (0.6 + supportRatio * 0.4), 0, 0.99)`

Where:
- `supportRatio = positiveWeight / totalWeight`
- `positive` signal if `supportRatio >= 0.5` and `confidence >= 0.35`

## How Trust Affects Filtering and Ranking
- Strict filters still hard-eliminate non-matching places.
- Non-strict selected filters boost ranking.
- Trust signals can satisfy kid/accessibility chip matches when confidence is high.
- Additional score boost is applied proportional to confidence for matched chips.
