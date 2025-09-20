// Simple PWA service worker for Card Tutorial Deluxe
const CACHE_STATIC = 'ctd-static-v1';
const CACHE_DYNAMIC = 'ctd-dynamic-v1';

const CORE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './data.json',
  './offline.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => ![CACHE_STATIC, CACHE_DYNAMIC].includes(k)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Helper: cache-first for static assets, stale-while-revalidate for data.json, offline fallback for navigations
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== location.origin) return;

  // Navigation requests (HTML)
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        // cache a copy
        const cache = await caches.open(CACHE_DYNAMIC);
        cache.put(req, net.clone());
        return net;
      } catch (err) {
        // try cache first
        const cache = await caches.open(CACHE_DYNAMIC);
        const cached = await cache.match(req) || await caches.match(req);
        return cached || await caches.match('./offline.html');
      }
    })());
    return;
  }

  // JSON data: stale-while-revalidate
  if (url.pathname.endsWith('/data.json') || url.pathname.endsWith('data.json')) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE_DYNAMIC);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then((res) => {
        cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return cached || fetchPromise || new Response(JSON.stringify({ tutorials: [] }), {headers:{'Content-Type':'application/json'}});
    })());
    return;
  }

  // Static assets: cache first
  if (['.css','.js','.png','.jpg','.jpeg','.gif','.svg','.webmanifest','.ico','.woff','.woff2','.ttf'].some(ext => url.pathname.endsWith(ext))) {
    e.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE_DYNAMIC);
        cache.put(req, net.clone());
        return net;
      } catch {
        return await caches.match('./offline.html');
      }
    })());
    return;
  }
});
