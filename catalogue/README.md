# Sillage catalogue

Two sources feed the app:

- `data/*.json` — hand-written entries (edit these).
- `imported/*.json` — generated from open datasets by `npm run catalogue:import`
  (currently Scento, CC BY 4.0). Do not hand-edit; re-run the import instead. Hand-written
  entries always win over an imported duplicate. `notes/*.json` holds note descriptions.

`data/*.json` is the source of truth for hand-written data. Each file is an array of fragrances in the
shape of `Fragrance` in `src/data/types.ts`. Files are merged in filename order.

- `npm run catalogue` validates every entry (ids, enums, `similar` links) and
  writes `public/catalogue/catalogue.json` + `meta.json`. `npm run build` and
  `npm run build:pages` run it automatically, and `npm test` validates the same
  data, so a malformed entry fails CI.
- The app bundles these files (works offline, first launch) and, when online,
  checks the published `meta.json`; if its `version` changed it downloads
  `catalogue.json`, caches it in IndexedDB and merges it over the bundled data.
  Publishing a new catalogue therefore reaches installed copies without an app
  update.
- Bottles in a user's collection refresh from the catalogue automatically unless
  the user edited them or created them by hand.

## Rules for entries

Write your own short descriptions and limit facts to widely published ones
(brand, launch year, headline notes, perfumer). Do not bulk-copy descriptions,
note pyramids or ratings from Fragrantica, Parfumo or any other proprietary
database. Wearability fields (seasons, weather, occasions, vibes, strength) are
editorial judgements.
