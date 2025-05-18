const CACHE_NAME = 'vf-order-cache-v1'; // Thay đổi nếu cập nhật
const urlsToCache = [
  './', // Quan trọng: cache trang gốc
  './Index.html',
  './khoxe.html',
  './xedaban.html',
  './yeucaughepxe.html',
  './danhsach.html',
  './kpi-tvbh.html',
  './order-details.html',
  './tongxe.html',
  './bestsale.html',
  './xem-chi-tiet-lich-su.html',
  // Thêm các tệp CSS, JS, hình ảnh của bạn ở đây
  // Ví dụ: './css/style.css', './js/main.js',
  // './images/icon-192x192.png', // Cache cả icon
  // './images/icon-512x512.png'
  // Các thư viện bên ngoài nếu bạn tải về và lưu trữ cục bộ:
  // './libs/tailwindcss.js', // Ví dụ
  // './libs/fontawesome/css/all.min.css' // Ví dụ
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching initial assets');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .catch(error => {
        console.error('Failed to cache initial assets:', error);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }
  // Ưu tiên mạng trước, sau đó đến cache (Network falling back to cache)
  // Điều này tốt cho các ứng dụng cần dữ liệu mới nhất thường xuyên
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          // Nếu fetch thất bại hoặc trả về lỗi, thử lấy từ cache
          return caches.match(event.request).then(cacheResponse => {
            return cacheResponse || networkResponse; // Trả về cache nếu có, nếu không thì trả về lỗi network
          });
        }
        // Nếu fetch thành công, clone response để cache và trả về network response
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return networkResponse;
      })
      .catch(() => {
        // Nếu cả network và việc cache đều thất bại (ví dụ: offline hoàn toàn và chưa cache)
        return caches.match(event.request).then(cacheResponse => {
           return cacheResponse; // Trả về từ cache nếu có
           // Hoặc bạn có thể trả về một trang offline.html tùy chỉnh
           // return cacheResponse || caches.match('./offline.html');
        });
      })
  );
});
