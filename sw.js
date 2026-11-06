/**
 * Service Worker untuk PWA TUNTAS
 * Badan Pusat Statistik Provinsi Kalimantan Barat
 */

const CACHE_NAME = 'tuntas-bps-v1';
const PRECACHE_ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'img/logo_tuntas.png',
  'img/logo BPS.png',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon-maskable-192.png',
  'img/icon-maskable-512.png',
  'img/apple-touch-icon.png'
];

// Install Event: precache core shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-critical asset note:', err);
      });
    })
  );
});

// Activate Event: bersihkan cache lama
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

// Fetch Event: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  // Hanya tangani GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Jangan tangani / cache request ke API Google Apps Script atau Google APIs
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleusercontent.com') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache response valid untuk origin yang sama
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Jika offline / network gagal, ambil dari cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('index.html');
          }
        });
      })
  );
});
