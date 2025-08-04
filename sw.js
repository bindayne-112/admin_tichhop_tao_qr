// Tên của bộ nhớ cache
const CACHE_NAME = 'ongkoi-admin-v1';

// Danh sách các tệp cần được cache lại
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js'
];

// Sự kiện 'install': được gọi khi Service Worker được cài đặt
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened admin cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Sự kiện 'fetch': được gọi mỗi khi có một yêu cầu mạng
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu có trong cache, trả về từ cache. Nếu không, fetch từ mạng.
        return response || fetch(event.request);
      }
    )
  );
});

// Sự kiện 'activate': dọn dẹp các cache cũ
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
