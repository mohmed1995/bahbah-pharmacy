/*
 * Bahbah Pharmacy — service worker (Cloudflare Pages)
 * Page shell: network-first with offline fallback.
 * Static assets (images, JS, CSS): cache-first, refreshed in background.
 */
const VERSION = "bahbah-v3";
const CORE_CACHE = `${VERSION}-core`;
const ASSET_CACHE = `${VERSION}-assets`;

const CORE_ASSETS = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/images/bahbah-badge.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* page navigations → network first, cache fallback, offline page last */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CORE_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match("/offline.html"))
        )
    );
    return;
  }

  /* static assets → cache first, refresh in background (exclude catalog photos from bloated worker storage) */
  const isProductImg = url.pathname.startsWith("/images/products/");
  if (isProductImg) {
    // Let browser native HTTP cache handle product photos to save phone storage
    return;
  }

  const isAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    /\.(png|jpg|jpeg|webp|svg|ico|woff2?|css|js)$/.test(url.pathname);

  if (isAsset) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const fetching = fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => hit);
        return hit || fetching;
      })
    );
  }
});
