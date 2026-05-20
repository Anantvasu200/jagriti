const CACHE_NAME = 'jagriti-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Install Event - Pre-cache basic shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== 'jagriti-map-tiles' && key !== 'jagriti-api-cache') {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event Interception
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 1. Map Tiles Caching (basemaps.cartocdn.com)
  if (url.hostname.includes('basemaps.cartocdn.com')) {
    e.respondWith(
      caches.open('jagriti-map-tiles').then((cache) => {
        return cache.match(e.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(e.request).then((networkResponse) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            // Return empty tile or fallback if completely offline
            return new Response('');
          });
        });
      })
    );
    return;
  }

  // 2. Incident API responses Caching (Network First, then cache)
  if (url.pathname.includes('/api/incidents')) {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open('jagriti-api-cache').then((cache) => {
              cache.put(e.request, copy);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
    return;
  }

  // 3. Static assets & App Shell (Cache First, Network Fallback)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      
      return fetch(e.request).then((networkResponse) => {
        // Cache dynamic static assets (Vite JS/CSS chunks)
        if (
          networkResponse.status === 200 &&
          (url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.png') ||
           url.pathname.endsWith('.svg') ||
           url.pathname.endsWith('.woff2'))
        ) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, copy);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // If HTML document fails (offline), return index.html
      if (e.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
