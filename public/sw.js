// ─── Mentor Service Worker ────────────────────────────────────────────────────
// Provides offline support and fast repeat visits via caching

const CACHE_VERSION = "mentor-v1";
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const API_CACHE     = `${CACHE_VERSION}-api`;

// Pages to pre-cache on install (app shell)
const PRECACHE_URLS = [
  "/",
  "/feed",
  "/jobs",
  "/experts",
  "/communities",
  "/assistant",
  "/offline",
];

// API routes to cache with stale-while-revalidate (fast + fresh)
const SWR_API_PATTERNS = [
  /\/api\/jobs/,
];

// ─── Install: pre-cache shell ─────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Add what we can, ignore failures (some pages need auth)
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => { /* ignore */ })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("mentor-") && k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch strategy ───────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and extension requests
  if (
    request.method !== "GET" ||
    !url.origin.includes(self.location.origin) ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  // Next.js static assets (_next/static) → cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ?? fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  // API routes that benefit from stale-while-revalidate
  if (SWR_API_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(
      caches.open(API_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        }).catch(() => cached);

        return cached ?? fetchPromise;
      })
    );
    return;
  }

  // HTML navigation → network-first, fall back to cache, then offline page
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request).then(
            (cached) => cached ?? caches.match("/offline")
          )
        )
    );
    return;
  }
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Mentor", body: event.data.text() };
  }

  const options = {
    body:    payload.body ?? "You have a new notification",
    icon:    "/icons/icon-192.png",
    badge:   "/icons/icon-72.png",
    vibrate: [100, 50, 100],
    data:    { url: payload.url ?? "/feed" },
    actions: payload.actions ?? [],
    tag:     payload.tag ?? "mentor-notification",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Mentor", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/feed";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        clients.openWindow(url);
      }
    })
  );
});
