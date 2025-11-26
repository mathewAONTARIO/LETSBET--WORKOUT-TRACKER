// public/service-worker.js

const CACHE_NAME = 'letsbet-v1';

// Add whatever routes/assets matter the most for offline
const OFFLINE_URLS = [
  '/',
  '/workouts',
  '/workouts/stats',
  '/workouts/calendar',
  '/css/style.css',
  '/img/letsbet-logo.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first for dynamic pages, fallback to cache
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Clone + cache successful responses
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      })
      .catch(() =>
        // If network fails, try cache
        caches.match(request).then(cached => cached || caches.match('/'))
      )
  );
});