// Production Marine-Grade Offline Service Worker for Mariner Pro-Link
// Zero-latency instant offline startup (0ms Cache-First with Background Stale-While-Revalidate)
const CACHE_NAME = 'mariner-pro-offline-v16';

// Core shell assets precached on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './manifest.webmanifest',
  './icon-192.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-512.svg',
  './icon-maskable-512.png',
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. Install: Precache shell & immediately take over
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map((asset) => cache.add(asset).catch(() => {}))
      );
    })
  );
});

// 2. Activate: Clean up old caches and claim all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Strategy: INSTANT CACHE-FIRST for EVERYTHING (0ms latency offline/online)
// Stale-While-Revalidate in background when online
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  const isNavigation = event.request.mode === 'navigate' || 
                       event.request.destination === 'document' ||
                       event.request.headers.get('accept')?.includes('text/html');

  event.respondWith(
    (async () => {
      // 1. Check direct match in cache
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) {
        // If online, perform silent background update
        if (navigator.onLine) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
              }
            })
            .catch(() => {});
        }
        return cached;
      }

      // 2. If it's a navigation request and not in cache, fallback to index.html immediately
      if (isNavigation) {
        const cachedHtml = await caches.match('./index.html', { ignoreSearch: true }) ||
                           await caches.match('/index.html', { ignoreSearch: true }) ||
                           await caches.match('./', { ignoreSearch: true }) ||
                           await caches.match('/', { ignoreSearch: true });
        if (cachedHtml) {
          if (navigator.onLine) {
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  const clone = networkResponse.clone();
                  caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                }
              })
              .catch(() => {});
          }
          return cachedHtml;
        }
      }

      // 3. If asset not in cache yet (e.g. first load), fetch from network and store
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      } catch (err) {
        // Fallback for navigation or asset
        if (isNavigation) {
          const fallbackHtml = await caches.match('./index.html', { ignoreSearch: true }) ||
                               await caches.match('/index.html', { ignoreSearch: true });
          if (fallbackHtml) return fallbackHtml;
        }
        const urlMatch = await caches.match(url.pathname, { ignoreSearch: true });
        if (urlMatch) return urlMatch;

        return new Response('Offline Content', { status: 503, statusText: 'Service Unavailable' });
      }
    })()
  );
});

