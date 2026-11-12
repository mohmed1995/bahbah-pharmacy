const V = 'bahbah-v41';
const SHELL = [
  './',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './pharmacy-hero-brand-bg.webp',
  './bahbah-logo.webp',
  './products.json'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(V).then(c => Promise.allSettled(SHELL.map(u => c.add(u))))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== V).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin !== location.origin && !/fonts\.(googleapis|gstatic)\.com/.test(u.host)) return;

  // Always Network First for HTML and dynamic API to ensure latest fixes load instantly
  if (r.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname === '/' || u.pathname.endsWith('/store-config.json')) {
    e.respondWith(
      fetch(r)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(V).then(c => c.put(r, clone));
          }
          return res;
        })
        .catch(() => caches.match(r).then(m => m || caches.match('./')))
    );
    return;
  }

  // Stale-while-revalidate for static assets
  e.respondWith(
    caches.match(r).then(cached => {
      const fetchPromise = fetch(r).then(networkRes => {
        if (networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(V).then(c => c.put(r, clone));
        }
        return networkRes;
      }).catch(() => null);
      return cached || fetchPromise;
    })
  );
});
