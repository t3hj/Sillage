# Sillage

A personal fragrance collection app. Track what you own, log every wear, and get a
daily suggestion of what to wear based on the live weather and what you have planned.

## What it does

- **Today** — suggestions drawn from your own collection, scored against the current
  weather, season, time of day and your chosen activity, with the reasoning shown.
- **Collection** — search and filter everything you own, rate it, log a wear in one tap.
- **Discover** — a built-in curated catalogue, plus a form for adding any bottle by hand.
- **Wishlist** — bottles you want, promoted to your collection when you buy them.
- **Journal** — full wear history with weather and occasion, most-worn and never-worn stats.
- **Settings** — set your location, export or restore a backup, clear all data.

## Cost and privacy

The app is free to run. There are no accounts, no API keys and no paid services.

- All of your data lives in your browser's local storage on your own device.
- The only network call is to [Open-Meteo](https://open-meteo.com), which is free and
  keyless, for the current weather and place search.
- Recommendations are computed locally with a deterministic scoring function — no AI
  service is involved.
- The catalogue is hand-written editorial data. Nothing is scraped from Fragrantica,
  Parfumo or any other proprietary database.

## Development

```sh
npm install
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
