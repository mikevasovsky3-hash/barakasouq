const CACHE_NAME = 'avito-sham-v3';

// Оставляем в жестком кэше только внутренние файлы нашего сайта
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
  const url = event.request.url;

  // Пропускаем динамические API без кэширования
  if (url.includes('supabase.co') || url.includes('workers.dev') || url.includes('whatsapp-gateway') || url.includes('translate.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Кэшируем только успешные (200) и сторонние непрозрачные (0) ответы от CDN
        if (response && (response.status === 200 || response.status === 0) && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((res) => res || caches.match('/index.html')))
  );
});
