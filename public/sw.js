/*
 * Bahbah Pharmacy — service worker (Cloudflare Pages)
 * Page shell: network-first with offline fallback.
 * Static assets (images, JS, CSS): cache-first, refreshed in background.
 */
/* IMPORTANT: bump VERSION on EVERY deploy. Cache invalidation is manual —
   if this string does not change, returning visitors keep the old caches
   (old assets, and product images are served under fixed unhashed names). */
const VERSION = "bahbah-v8";
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
      /* addAll بيفشل كله لو ملف واحد مش موجود (404) فالـ SW ما بيتثبتش أبدًا —
         فبنخزّن كل ملف لوحده ونتجاهل الغايب */
      .then((cache) =>
        Promise.all(
          CORE_ASSETS.map((u) =>
            cache.add(u).catch(() => undefined)
          )
        )
      )
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
          /* ما نخزّنش غير الردود السليمة — صفحة 404/500 لو اتكاشت هتتعرض
             أوفلاين كأنها الصفحة الحقيقية */
          if (res.ok) {
            const copy = res.clone();
            caches.open(CORE_CACHE).then((c) => c.put(req, copy));
          }
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
            if (res.ok) {
              const copy = res.clone();
              caches.open(ASSET_CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || fetching;
      })
    );
  }
});
