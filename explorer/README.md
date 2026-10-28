# Sillage Explorer

The standalone fragrance explorer lives alongside the original React app. It has
its own source, tests and optional account-state server contract; the existing
GitHub Pages app remains independent.

## Run locally

Use Node 22.13+ for tests and Python 3.9+ for the static server/photo downloads.
No npm packages, API keys or build step are needed for the browser preview.

```sh
cd explorer
python3 scripts/fetch-photos.py
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://localhost:4173. Bottle images are downloaded from credited sources,
verified against pinned SHA-256 checksums, and excluded from git. A changed or
unavailable image receives the photo-unavailable state. Product image rights
remain with the original brands/retailers.

```sh
node --test tests/*.test.mjs
python3 scripts/fetch-photos.py --verify-only
```

## Everyday use

- Search names, brands and notes, filter by setting, and compare three scents.
- Manage bottles independently of saved discoveries, with duplicate prevention.
- Use current-location weather after permission, or choose a town/manual scenario.
- Log today's wear, edit its date/occasion/note, filter the Journal and rate bottles.
- Rank suitable daily picks using scent character, weather, plans, ratings and rotation.
- Sync account data when an authenticated server is configured; review conflicts
  and download a recovery copy before replacing device changes.
- Install supported home-screen shortcuts and use the collection/manual picks
  offline after an initial online visit. Viewed bottle images are cached as you browse.
- Export/restore versioned backups including wear history and ratings.

The distribution starts with an empty collection. No personal seed, private notes,
backups, production identifiers or credentials are included. Tests use synthetic
records and identities. Catalogue entries do not establish ownership. The private
hosted version keeps its supplied collection seed separately.

## Account sync and privacy

Static hosting alone remains device-local. Account sync needs the authenticated
server adapter and database described in [server/README.md](server/README.md).
The private hosted explorer already has that integration. Each account is isolated
and stale writes are rejected; conflicting copies require an explicit choice.
Device location, permissions and weather preferences are excluded from sync.

Weather/town search uses Open-Meteo. Device area names use BigDataCloud only with
a newly obtained device position after permission. There is no background location
tracking. The catalogue combines original repository profiles, credited Scento
data (CC BY 4.0) and sourced brand facts. See `dist/data-notice.html`.

## Installation and offline limits

Serve over HTTPS for installation, or localhost for local development. On iPhone
or iPad use Safari → Share → Add to Home Screen. Other browsers expose an Install
Sillage action when supported. An online visit prepares the offline shell; live
weather and account sync require connectivity. Account APIs, external services and
sign-in pages are never cached. Signing out clears the cached application copy.

The original React app remains separate. Scanning, external database lookup,
explicit season/time-of-day scoring and fuller Guide controls are outside this
explorer. Physical GPS, Safari installation and a real two-device account session
still need testing on those devices.
