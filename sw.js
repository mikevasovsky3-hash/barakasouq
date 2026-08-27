const CACHE_NAME = 'baraka-offline-v1';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/config.js',
  '/api.js',
  '/ui.components.js',
  '/handlers.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('supabase.co') || event.request.url.includes('workers.dev')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((res) => res || caches.match('/index.html')))
  );
});
