# Atlas Academy

A web-based geography quiz game with flags, capitals, country shapes, and bonus modes. Track streaks with local player profiles — no account required.

## Features

- **Core modes:** Flag → Country, Capital → Country, Country → Capital, Shape → Country
- **Bonus modes:** Country → Flag, Neighbor Quiz, Population Showdown, Daily Challenge, Marathon, Speed Round, Practice Weak Spots
- **Local profiles** with streak tracking and best-streak records
- **Continent filters** with checkbox selection
- **Three difficulty levels:** easy (MC + boosts), medium (MC), hard (type answer)
- **250 countries & territories** with up-to-date ISO 3166 data

## Getting started

```bash
npm install
npm run refresh-data   # Download country data, flags, and shapes
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Refresh country data

To update flags, shapes, and country metadata:

```bash
npm run refresh-data
```

See [DATA_NOTES.md](./DATA_NOTES.md) for data sources and geopolitical notes.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the project in your [Vercel dashboard](https://vercel.com)
3. Deploy — no environment variables needed

## Project structure

- `app/` — Pages (home, play, profiles, stats)
- `components/` — UI and game components
- `lib/` — Game engine, storage, country helpers
- `data/countries.json` — Generated country database
- `public/flags/` and `public/shapes/` — Generated assets
- `scripts/refresh-country-data.ts` — Data pipeline
