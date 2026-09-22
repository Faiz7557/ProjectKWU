const CACHE_NAME = 'smartfit-v2-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/workout',
  '/history',
  '/manifest.json',
  '/models/pose_landmarker_lite.task',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya proses request GET http/https
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Jangan cache API routes
  if (url.pathname.startsWith('/api/')) return;

  // 1. Cache-First untuk model MediaPipe dan WASM runtime (CDN atau lokal)
  if (
    url.pathname.includes('pose_landmarker_lite.task') ||
    url.hostname.includes('cdn.jsdelivr.net') ||
    url.pathname.endsWith('.wasm') ||
    url.pathname.endsWith('.task')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 2. Cache-First untuk Next.js static build chunks (JS, CSS, images)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 3. Network-First dengan Cache Fallback untuk halaman navigasi HTML
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Fallback untuk route navigasi jika offline
        if (event.request.mode === 'navigate') {
          const workoutFallback = await caches.match('/workout');
          if (workoutFallback) return workoutFallback;
          const rootFallback = await caches.match('/');
          if (rootFallback) return rootFallback;
        }

        return new Response('Offline - SMART-FIT v2', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});
