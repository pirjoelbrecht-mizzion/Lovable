// Very small "app shell" cache for offline use
// Use timestamp to force cache refresh on each deployment
const CACHE = "mizzion-v2025-12-17-01";
const APP_SHELL = [
  "/",                 // index.html
  "/manifest.webmanifest",
  // Vite injects hashed assets at build. We still cache shell routes, CSS from runtime.
  "/offline.html"
];

// Install: pre-cache shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: cleanup old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for navigation and JS bundles, cache-first for other assets
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // For SPA navigations always use network-first with offline fallback
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // For JavaScript bundles, always try network first to get latest code
  if (url.pathname.endsWith('.js')) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // Cache the new JS bundle
          if (req.method === "GET" && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match("/offline.html")))
    );
    return;
  }

  // For other assets: try cache first, then network
  e.respondWith(
    caches.match(req).then((cached) =>
      cached ||
      fetch(req)
        .then((res) => {
          // Cache GET responses
          if (req.method === "GET" && res.status === 200 && res.type === "basic") {
            const resClone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => caches.match("/offline.html"))
    )
  );
});
