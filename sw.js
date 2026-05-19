const CACHE_NAME = 'senty-cache-v2';
const OFFLINE_URL = '/offline.html';

// الملفات الأساسية التي سيتم تخزينها مؤقتاً عند التثبيت
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/css/style.css',
  '/js/app.js'
];

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('تم فتح الكاش وتخزين الملفات');
        return cache.addAll(FILES_TO_CACHE);
      })
      .catch(err => console.error('خطأ في التخزين:', err))
  );
  // تفعيل الـ SW فوراً
  self.skipWaiting();
});

// استراتيجية: محاولة الشبكة أولاً، ثم العودة للكاش، ثم صفحة offline
self.addEventListener('fetch', event => {
  // نستثني طلبات التحليلات والإعلانات إن وجدت
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // إذا نجحت الشبكة، نقوم بتحديث الكاش
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(async () => {
        // فشل الشبكة → نبحث في الكاش
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        // إذا كان الطلب لصفحة HTML (تنقل داخلي) نقدم صفحة offline
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match(OFFLINE_URL);
        }
        return new Response('', { status: 404, statusText: 'Not Found' });
      })
  );
});

// تفعيل الـ SW وتنظيف الكاش القديم
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('حذف الكاش القديم:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});
