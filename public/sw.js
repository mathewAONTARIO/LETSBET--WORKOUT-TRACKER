const CACHE_NAME = 'letsbet-static-v1';

const ASSETS = [
  '/',
  '/offline',
  '/css/style.css',
  '/img/letsbet-logo.png',
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
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const req = event.request;
  const acceptHeader = req.headers.get('accept') || '';

  if (acceptHeader.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return response;
        })
        .catch(() => {
          return caches.match(req).then(cached => cached || caches.match('/offline') || caches.match('/'));
        })
    );
    return;
  }

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