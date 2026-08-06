# Atlas Academy Data Notes

This app uses **ISO 3166-1 alpha-2** codes as the canonical identifier for every country and territory (~250 entries from [mledoze/countries](https://github.com/mledoze/countries)).

US states (the "Across America" scope) use **ISO 3166-2:US** codes (`US-AL` … `US-WY`), which never collide with country codes, so code lookups, per-place progress, and weak-spot tracking work across both datasets without a scope tag.

## Data sources

| Asset | Source | Refresh |
|---|---|---|
| Country metadata | mledoze/countries | `npm run refresh-data` |
| Population | World Bank (2023) + manual overrides for territories | Fetched during refresh |
| Flag SVGs | [FlagCDN](https://flagcdn.com/) / Wikimedia Commons vectors | Downloaded at true flag ratios during refresh |
| Shape SVGs | Natural Earth 10m, each place projected with a local azimuthal equal-area view (mainland + nearby islands; remote overseas scraps dropped) so quiz silhouettes keep true proportions | `npm run generate-country-shapes` / `npm run refresh-data` |
| Context map SVGs | Natural Earth 10m + [geoBoundaries](https://www.geoboundaries.org/) ADM0 upgrades for microstates | `npm run generate-context-maps` |
| Exchange rates | [Frankfurter](https://frankfurter.dev/) daily reference rates from central banks; USD-base rates are converted at runtime and cached for 24 hours | Automatic runtime refresh; `npm run enrich-currency-data` refreshes the tracked fallback values |
| Elevation extremes | Wikipedia ([countries](https://en.wikipedia.org/wiki/List_of_elevation_extremes_by_country), [US states](https://en.wikipedia.org/wiki/List_of_U.S._states_and_territories_by_elevation)); meters, land surface | `npm run enrich-elevation-data` |
| Ecosystem / climate | Hand-curated dominant biome labels (Köppen / WWF ecoregion summaries); varied places use a short "contains" phrase | `npm run enrich-ecosystem-data` |
| Bird / flower emblems | Wikipedia ([national birds](https://en.wikipedia.org/wiki/List_of_national_birds), [national flowers](https://en.wikipedia.org/wiki/List_of_national_flowers), [state birds](https://en.wikipedia.org/wiki/List_of_U.S._state_birds), [state flowers](https://en.wikipedia.org/wiki/List_of_state_flowers)); countries are sparse | `npm run enrich-bird-plant-data` |
| Median household income | Countries: [Our World in Data](https://ourworldindata.org/grapher/daily-median-income) / World Bank PIP daily median (2021 PPP international dollars), annualized; US states: Census ACS 2023 | `npm run enrich-income-data` |
| Median rent | Countries: [Numbeo](https://www.numbeo.com/cost-of-living/prices_by_country.jsp?displayCurrency=USD&itemId=26&itemId=27) 1-bedroom apartment outside city centre (USD / month); US states: Census ACS median gross rent | `npm run enrich-rent-data` |
| US state metadata | Hand-curated (2023 Census population estimates, Census regions/divisions) | `npm run refresh-state-data` |
| US state flag SVGs | Wikimedia Commons (`public/flags/us-XX.svg`) | `npm run fetch-state-flags` |
| US state shape SVGs | [us-atlas](https://github.com/topojson/us-atlas) Census state geometry, per-state azimuthal equal-area (`public/shapes/us-XX.svg`) | `npm run generate-state-shapes` |

## Geopolitical edge cases

- **Taiwan (TW)** — Listed with its ISO code; naming follows the mledoze dataset.
- **Kosovo (XK)** — Uses the commonly adopted `XK` user-assigned code where ISO assignment is pending.
- **Palestine (PS), Hong Kong (HK), Puerto Rico (PR)** — Included as ISO territories.
- **Antarctica** — Included where present in the dataset; few territories have meaningful quiz content.
- **Somalia / Somaliland** — Natural Earth draws Somaliland as a separate de facto unit. Map/globe/shape generation merges it into Somalia (ISO-recognized territory) so the Horn is not missing land.
- **Morocco / Western Sahara** — Natural Earth follows the berm (de facto control). Generation rebuilds UN/ISO borders: Morocco ends at the recognized frontier; Western Sahara is the full former Spanish Sahara (and remains a playable territory).
- **Cyprus / Northern Cyprus** — Northern Cyprus (and the UN buffer zone) are merged into Cyprus so the island is not missing land.

## Shape quiz eligibility

Shape quiz questions include every place that has a silhouette asset (`hasShape`). Silhouettes use the same Natural Earth / Census geometry as maps, but each place is projected alone with an azimuthal equal-area view centered on its landmass so outlines keep true proportions (context maps still use Natural Earth I / Albers USA). Shapes are cropped to the mainland/core landmass plus nearby islands so remote overseas fragments (e.g. Caribbean Netherlands inside `NLD`) do not shrink the outline to a speck. On data refresh, `shapeQuizEligible` is set to match `hasShape`.

## Keeping data current

Most app exchange rates update automatically through the `/api/exchange-rates` route. The route fetches free Frankfurter data without an API key and caches the upstream response for 24 hours. These are daily reference rates, not real-time trading quotes. The menu links to Frankfurter as the rate source.

For the tracked offline fallback data, run periodically:

```bash
npm run refresh-data
```

Then commit the updated `data/countries.json` and `public/flags/` / `public/shapes/` assets. If the live endpoint is unavailable, the app uses the last successful cached response and then the tracked USD rates where available.

## Name aliases

The answer matcher accepts common aliases (e.g. USA, UK, Ivory Coast, Czechia). See `scripts/refresh-country-data.ts` for the full alias map.
