const CACHE_NAME = 'avito-sham-v4';

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
    caches.open(CACHE_NAME).then((cache) => {
      // 1. Кэшируем наши локальные файлы
      cache.addAll(OFFLINE_ASSETS);
      // 2. Принудительно кэшируем Tailwind CDN в фоне, чтобы интерфейс работал без интернета
      const twReq = new Request('https://cdn.tailwindcss.com', { mode: 'no-cors' });
      fetch(twReq).then(res => cache.put(twReq, res)).catch(() => {});
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Игнорируем запросы к Supabase, внешним API и не-GET запросы
  if (event.request.method !== 'GET' || url.includes('supabase.co') || url.includes('workers.dev') || url.includes('whatsapp-gateway') || url.includes('translate.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Стратегия "Stale-While-Revalidate":
      // Начинаем скачивание свежей версии с сервера
      const networkFetch = fetch(event.request).then((networkResponse) => {
        // Если скачали успешно — обновляем кэш в фоне
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // Если интернета нет и файла нет в кэше:
        // Отдаем index.html ТОЛЬКО если запрашивалась веб-страница (mode === 'navigate')
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
      
      // МГНОВЕННО отдаем кэш, если он есть. Если нет — ждем результата скачивания.
      return cachedResponse || networkFetch;
    })
  );
});
