const CACHE_NAME = 'ghep-xe-cache-v1';
// Danh sách các file cần được lưu lại để chạy offline
const urlsToCache = [
  '/',
  'yeucaughepxe.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// Sự kiện install: Mở cache và thêm các file cần thiết
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Sự kiện fetch: Can thiệp vào yêu cầu mạng
// Ưu tiên lấy từ cache trước (offline-first)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Nếu tìm thấy trong cache, trả về ngay
        if (response) {
          return response;
        }
        // Nếu không, đi lấy từ mạng
        return fetch(event.request);
      })
  );
});

// Sự kiện push: Lắng nghe và hiển thị thông báo đẩy
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'icon-192.png', // Icon hiển thị trên thông báo
    badge: 'icon-192.png'
  };
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
