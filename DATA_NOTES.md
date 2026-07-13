# Atlas Academy Data Notes

This app uses **ISO 3166-1 alpha-2** codes as the canonical identifier for every country and territory (~250 entries from [mledoze/countries](https://github.com/mledoze/countries)).

US states (the "Across America" scope) use **ISO 3166-2:US** codes (`US-AL` … `US-WY`), which never collide with country codes, so code lookups, per-place progress, and weak-spot tracking work across both datasets without a scope tag.

## Data sources

| Asset | Source | Refresh |
|---|---|---|
| Country metadata | mledoze/countries | `npm run refresh-data` |
| Population | World Bank (2023) + manual overrides for territories | Fetched during refresh |
| Flag SVGs | [flag-icons](https://github.com/lipis/flag-icons) | Copied during refresh |
| Shape SVGs | [mapsicon](https://github.com/djaiss/mapsicon) country silhouettes | Downloaded during refresh |
| US state metadata | Hand-curated (2023 Census population estimates, Census regions/divisions) | `npm run refresh-state-data` |
| US state flag SVGs | Wikimedia Commons (`public/flags/us-XX.svg`) | `npm run fetch-state-flags` |
| US state shape SVGs | [@svg-maps/usa](https://www.npmjs.com/package/@svg-maps/usa) paths (`public/shapes/us-XX.svg`) | `npm run generate-state-shapes` |

## Geopolitical edge cases

- **Taiwan (TW)** — Listed with its ISO code; naming follows the mledoze dataset.
- **Kosovo (XK)** — Uses the commonly adopted `XK` user-assigned code where ISO assignment is pending.
- **Palestine (PS), Hong Kong (HK), Puerto Rico (PR)** — Included as ISO territories.
- **Antarctica** — Included where present in the dataset; few territories have meaningful quiz content.

## Shape quiz eligibility

Very small territories and micro-states are excluded from Shape → Country mode because their silhouettes are unreadable on mobile screens. This includes Vatican City, Monaco, Singapore, and similar entries. The `shapeQuizEligible` field in `data/countries.json` controls this.

## Keeping data current

Run periodically:

```bash
npm run refresh-data
```

Then commit the updated `data/countries.json` and `public/flags/` / `public/shapes/` assets.

## Name aliases

The answer matcher accepts common aliases (e.g. USA, UK, Ivory Coast, Czechia). See `scripts/refresh-country-data.ts` for the full alias map.
