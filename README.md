# Sillage

[Open Sillage](https://t3hj.github.io/Sillage/)

A fragrance wardrobe for organising bottles, finding what to wear and keeping a
wear journal. The live app uses midnight black, cobalt blue and lime accents.

## Use the app

- Add bottles from the catalogue or enter an unlisted fragrance manually.
- Search notes, compare scents and choose daily picks for the weather and occasion.
- Use your current location after permission, or select a town/manual weather.
- Record wears, rate bottles and review your journal.
- Open **Data & backup** to download or restore a Sillage explorer JSON backup.
- On iPhone, open in Safari and choose **Share → Add to Home Screen**.

The public app starts with an empty collection. Your bottles, notes, ratings and
wear history save in the current browser/device. Keep backups before clearing site
data. GitHub Pages has no account backend, so it does not sync between devices.
An initial online visit prepares offline collection browsing and manual daily
picks; live weather needs a connection.

## Repository layout

| Path | Purpose |
| --- | --- |
| `explorer/dist/` | Tracked browser source for the live Pages app |
| `explorer/tests/` | Explorer tests |
| `explorer/scripts/` | Restore credited, checksum-verified bottle photos |
| `explorer/server/` | Optional authenticated account-sync integration |
| `scripts/build-explorer-pages.mjs` | Package the explorer for Pages |
| `src/`, `public/`, `tests/` | Original React app, retained for separate development |
| `catalogue/` | Original app catalogue data, import scripts and attribution |

The `dist` folder under `explorer/` is source despite its historical name.
The root `dist/` folder is generated build output and is ignored.
`.gitignore` is a normal Git configuration file: it excludes dependencies,
generated output, credentials and personal backup exports.

## Develop the live explorer

Use Node 24 and Python 3.9+. No npm installation or API keys are needed.

```sh
node --test explorer/tests/*.test.mjs
python3 explorer/scripts/fetch-photos.py
python3 -m http.server 4173 --bind 127.0.0.1 --directory explorer/dist
```

Open http://localhost:4173. See [explorer documentation](explorer/README.md) for
features, data sources, privacy and offline behaviour. A missing or changed source
photo uses the unavailable-photo state rather than an unverified image.

## Build and deploy

```sh
npm run build:pages
```

This copies only the explorer browser files to `dist/client`, adds `.nojekyll`
and rejects a non-empty public collection seed. Server code and personal backups
are excluded. Every push to `main` runs the explorer tests, restores verified
photos and deploys through `.github/workflows/deploy-pages.yml`.

In repository **Settings → Pages**, keep **Source** set to **GitHub Actions**.

## Original React app

The original TanStack Start/React application is retained, but is not the Pages
entry point. Its screens, backup format and data store are separate from the
explorer. For that application:

```sh
npm ci
npm run dev
npm test
npm run build
```

The catalogue refresh workflow updates the original application's catalogue.
Review attribution in [catalogue/NOTICE.md](catalogue/NOTICE.md) before reusing data.

## Privacy and services

Personal collection data is never committed to this public repository. Device
location is requested only after permission; weather/place lookup uses Open-Meteo,
and device area names use BigDataCloud. See the app's data notice for details.
Recommendations run locally. Cross-device sync requires the authenticated server
and database described in [the server integration guide](explorer/server/README.md).
