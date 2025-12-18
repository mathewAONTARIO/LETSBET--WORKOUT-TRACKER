// public/sw.js
const CACHE_NAME = 'letsbet-static-v2'; // ✅ bump this any time you change CSS/JS

const ASSETS = [
  '/',
  '/offline',
  '/css/style.css',
  // '/img/letsbet-logo.png', // ✅ removed since you said you don’t need it
  '/manifest.json',
  '/workouts',
  '/workouts/stats',
  '/workouts/calendar',
  '/workouts/streak',
  '/workouts/library',
  '/meals',
  '/insights'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => null);
    })
  );
  self.skipWaiting(); // ✅ activate new SW sooner
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return null;
        })
      )
    )
  );
  self.clients.claim(); // ✅ take control without waiting for reloads
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const req = event.request;
  const acceptHeader = req.headers.get('accept') || '';

  // HTML pages → network first, fallback to cache/offline
  if (acceptHeader.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return response;
        })
        .catch(() => {
          return caches
            .match(req)
            .then(cached => cached || caches.match('/offline') || caches.match('/'));
        })
    );
    return;
  }

  // Static assets → cache first, then network
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return response;
      });
    })
  );
});