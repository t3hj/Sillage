# Sillage Explorer

The standalone HTML/CSS/JavaScript explorer developed alongside Sillage. It is kept
here so it can be reviewed and developed without replacing the original React app.
This directory is not connected to the repository's GitHub Pages deployment.

## Run locally

Requires Node.js 20+ for tests and Python 3.9+ for image restoration and the local
server. No npm packages, API keys or build step are needed.

```sh
cd explorer
python3 scripts/fetch-photos.py
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://localhost:4173. Bottle images are recoverable downloads excluded from
git; `dist/photos.json` records their original HTTPS sources, credits, dimensions
and SHA-256 checksums. Restoration rejects a changed source image instead of
silently displaying a different product. A failed download leaves the existing
photo-unavailable state; the rest of the explorer remains usable. Product images
retain their brands' or retailers' rights; they are not relicensed as app code.

```sh
node --test tests/*.test.mjs
python3 scripts/fetch-photos.py --verify-only
```

## Features and data

- Search catalogue names, brands and notes, including accents and small typos.
- Filter by notes, weather, occasion and scent family; compare up to three scents.
- Add, edit and remove bottles; prevent duplicates; confirm exact concentrations.
- Rank owned profiles or the catalogue for current city weather, plans and notes,
  with manual scenarios, match explanations and heat/shared-space penalties.
- Save discoveries and export/restore validated browser backups with a review step.
- Responsive phone navigation, accessible controls and scrollable comparison.

`dist/collection.json` deliberately starts empty. No personal ownership list,
private notes, backups, site identifier or credentials are included. Tests use
synthetic records generated from the whole public catalogue. Catalogue entries
describe fragrances and never establish ownership. The private deployment can
maintain its own collection seed separately; do not commit it into this directory.
Backups from that deployment contain changes relative to its private seed and
cannot transfer the complete seed to this empty distribution.

The 38 core profiles come from `catalogue/data/core.json`. Additional profiles
use credited Scento data (CC BY 4.0) and linked brand/retailer sources. Wearing
guidance is subjective editorial metadata; unknown facts remain unspecified.
See `dist/data-notice.html` and the source links in each profile.

Weather uses Open-Meteo's keyless public API. London is an editable default city,
not a saved user location. Collection data remains in browser storage and never
goes to the weather provider. There is no cross-device sync or authentication
layer in this static source. Host-level access controls are required for private
hosting; a `noindex` tag does not restrict access.

## Scope

This smaller explorer does not implement the original React app's wear logging,
ratings, journal, scanner, offline/PWA support, or season/time/rating/rotation
scoring. The original app and its existing deployment remain independent.
Pushing this branch does not update the private hosted explorer automatically.

The private ancestor passed desktop/mobile browser checks. This empty-seed export
is checked separately by its Node tests; physical mobile Safari testing remains
outstanding. Run browser checks again before deploying a modified version.
