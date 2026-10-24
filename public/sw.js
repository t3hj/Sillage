/* Sillage service worker — minimal, no external dependencies.
 * Cache-first for build assets and the app shell so the app keeps working
 * offline; network-only for API calls (weather) so data is never served stale
 * silently. Paths are derived from the worker's own scope so it works both at
 * the site root and under a sub-path such as /Sillage/ on GitHub Pages. */
const CACHE = "sillage-v2";
const SCOPE = new URL(self.registration.scope).pathname; // e.g. "/Sillage/"

self.addEventListener("install", (event) => {
  // Best-effort: a failed shell pre-cache must never block installation.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(SCOPE))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to the cached shell when offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(SCOPE, copy));
          }
          return res;
        })
        .catch(() => caches.match(SCOPE).then((r) => r ?? Response.error())),
    );
    return;
  }

  // Hashed build assets and static files: cache first.
  if (
    /\/assets\//.test(url.pathname) ||
    /\.(css|js|woff2|png|svg|webmanifest|json)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ??
          fetch(event.request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(event.request, copy));
            }
            return res;
          }),
      ),
    );
  }
});
