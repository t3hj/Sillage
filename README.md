# Sillage

A personal fragrance collection app. Track what you own, log every wear, and get a
daily suggestion of what to wear based on the live weather and what you have planned.

## What it does

- **Today** — suggestions drawn from your own collection, scored against the current
  weather, season, time of day and your chosen activity, with the reasoning shown.
- **Collection** — search, filter and sort everything you own, rate it, log a wear in
  one tap, and see collection statistics (most worn, never worn, highest rated, favourite
  family).
- **Discover** — a built-in curated catalogue, plus a form for adding any bottle by hand.
- **Scan** — scan a QR code or barcode with your camera. Sillage only identifies codes it
  can match against its own catalogue; unknown codes are shown as-is with a manual
  search fallback. It never guesses a fragrance from an arbitrary barcode.
- **Guide** — browse the catalogue by season, weather, occasion, time of day, vibe or
  performance.
- **Compare** — weigh up to three fragrances side by side.
- **Wishlist** — bottles you want, promoted to your collection when you buy them.
- **Journal** — full wear history with weather and occasion, filterable by fragrance,
  activity and date, with most-worn and never-worn statistics.
- **Settings** — set your location (search or device geolocation), export or restore a
  backup, clear all data.

## Cost and privacy

**Sillage is completely free to run and requires no API keys, accounts, or paid
services — including no AI services.**

- All of your data (collection, wishlist, wear history, ratings, notes, settings) lives
  in your browser's local storage on your own device. Nothing is uploaded anywhere.
- The only network calls are to [Open-Meteo](https://open-meteo.com), which is free and
  keyless, for the current weather and place search. Only your approximate coordinates
  are sent — never any collection data.
- Recommendations are computed locally with a deterministic scoring function — no AI
  service is involved. The same inputs always produce the same recommendation.
- The catalogue is hand-written editorial data. Nothing is scraped from Fragrantica,
  Parfumo or any other proprietary database.

> **Security note:** an Anthropic API key was previously present in a local `.env` file
> in this repository's working copy. It was never committed to git history, but if you
> have seen or cloned that file, **revoke the key at console.anthropic.com**. Sillage
> itself no longer contains any Anthropic/AI code, and `.env` files are gitignored.

## Fragrance data

`src/data/fragrances.ts` holds a curated starter catalogue (~35 fragrances). Every entry
is short, written for this project, and limited to widely published facts (brand, launch
year, headline notes, perfumer). Wearability fields (seasons, weather, occasions, vibes)
are editorial judgements and are fully editable in the app — nothing is scraped, and no
proprietary dataset is bundled.

To extend the catalogue, append objects to `CATALOGUE` using the same shape
(see `src/data/types.ts` for the `Fragrance` model). Anything you add manually in the
app is stored locally and never leaves your device.

## How recommendations work

`src/lib/recommend.ts` scores every fragrance in your collection against the current
context. It is deterministic and runs entirely in the browser:

- **Weather suitability** (~30 pts) — how well the fragrance's weather tags match today's
  conditions, derived from temperature, precipitation and humidity.
- **Season** (~20 pts) — whether the fragrance suits the current season (or its flip in
  the southern hemisphere).
- **Activity/occasion** (~20 pts) — match against your chosen activity (University, Work,
  Gym, Date, Night Out, …).
- **Time of day** (~10 pts) — morning/day/evening/night suitability.
- **Personal rating** (up to ~12 pts) — your own ratings matter most.
- **Temperature fit** (±8 pts) — heavy scents are penalised in heat, rewarded in cold.
- **Rotation freshness** (−25 to +15 pts) — worn today is heavily penalised; untouched
  for weeks is boosted; never worn gets the largest boost.

The top pick is shown with its reasons ("Suits cold weather", "Works for university",
"Untouched for 12 days"), followed by 2–3 alternatives.

## Technology stack

- [TanStack Start](https://tanstack.com/start) (React 19, TanStack Router)
- TypeScript
- Tailwind CSS 4 + shadcn-style UI primitives
- Vitest for unit tests
- Static prerender for GitHub Pages (no server required)

## Architecture

```
src/
  routes/        # pages: Today, Collection, Discover, Scan, Guide, Compare,
                 # Wishlist, Journal, Settings, fragrance details
  components/    # AppShell navigation, FragranceCard, FragranceForm, ui/ primitives
  data/          # types, categories (seasons/occasions/etc.), fragrance catalogue
  lib/           # storage (localStorage abstraction), search, recommend, weather
  hooks/         # useSillage (app-wide data context)
tests/           # vitest unit tests for the core logic
scripts/         # GitHub Pages output preparation
```

All persistence goes through `src/lib/storage.ts` — pure functions over a single
versioned `SillageData` object backed by one localStorage key, with import/export
validation. Components never touch `localStorage` directly.

## Development

```sh
npm install
npm run dev          # dev server
npm test             # run the vitest suite
npm run lint         # eslint
npm run build        # production build (TanStack Start + nitro)
```

## Build & deploy to GitHub Pages

```sh
npm run build:pages  # static prerender → dist/client (+ .nojekyll, 404.html)
```

The site is deployed under `/Sillage/` automatically by
`.github/workflows/deploy-pages.yml` on every push to `main`. The app sets its router
base path from the Vite build base, so all asset paths and links work under the
repository sub-path.

## Testing

```sh
npm test
```

35 unit tests cover fuzzy search, the recommendation engine (weather/season/occasion
matching, recent-wear penalty, rating influence, determinism), weather-tag mapping,
season/time derivation, duplicate detection, and backup import validation.

## PWA / offline

The app registers a small service worker (`public/sw.js`) that caches the app shell and
hashed assets, so your collection, search, details, wear logging and last-known-weather
recommendations keep working offline. Weather cannot refresh offline — the Today page
shows an error state instead of silently stale data.

## Adding fragrance data

Append well-formed entries to `CATALOGUE` in `src/data/fragrances.ts`. Only include
facts that are legally shareable (short factual metadata you write yourself). Do not
bulk-copy descriptions or note pyramids from commercial databases.

## Licensing

- Sillage's own code and editorial data: MIT.
- [Open-Meteo](https://open-meteo.com) — used via its free public API, no key required.
- Fonts are loaded from Google Fonts (Fraunces, Karla) under the SIL Open Font License.
