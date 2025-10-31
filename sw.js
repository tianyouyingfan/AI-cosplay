// 在脚本的最顶部添加一个醒目的“指纹”日志
console.log(
  '%c ✨ AI-Cosplay Service Worker v6 LOADED! Redirect fix is INCLUDED. ✨',
  'color: #ff8c00; font-size: 1.2em; font-weight: bold;'
);

// 缓存版本号更新到 v6
const CACHE_NAME = 'ai-cosplay-cache-v6';

const urlsToCache = [
    '/',
    '/index.html',
    '/settings.html',
    '/test-api.html',
    '/assets/css/style.css',
    '/assets/js/services/storage.service.js',
    '/assets/js/services/api.service.js',
    '/assets/js/providers/google.provider.js',
    '/assets/js/providers/grsai.provider.js',
    '/assets/js/utils/dom.util.js',
    '/assets/js/utils/image.util.js',
    '/assets/js/settings.js',
    '/assets/js/generator.js',
    '/favicon.ico',
    '/showPoto/show.png',
    'https://cdn.jsdelivr.net/npm/@google/generative-ai@0.24.1/dist/index.mjs'
];

// 安装事件
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker v6: Caching core assets.');
                return cache.addAll(urlsToCache);
            })
    );
});

// 激活事件
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker v6: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch 事件 (包含了 redirect: 'follow' 修复)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(event.request, { redirect: 'follow' }).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    console.error('Fetching failed:', error);
                });
                return cachedResponse || fetchPromise;
            });
        })
    );
});