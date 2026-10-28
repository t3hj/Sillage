# Repository guidance

- GitHub Pages serves the standalone explorer in `explorer/dist/`.
- Keep that directory tracked; root `dist/` is generated output.
- Run `node --test explorer/tests/*.test.mjs` and `npm run build:pages` for explorer changes.
- Keep the public collection seed empty. Never commit personal collections,
  backups, location history, credentials or deployment identifiers.
- The original React application remains under `src/`; avoid changing its data
  model or deleting its source as part of explorer-only work.
- Preserve catalogue and product-photo attribution and checksum verification.
