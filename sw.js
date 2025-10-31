// 确认 v7 版本已加载，并说明修复方案
console.log(
  '%c ✨ AI-Cosplay Service Worker v7 已加载！使用 new Request() 构造函数修复重定向问题。 ✨',
  'color: #28a745; font-size: 1.2em; font-weight: bold;'
);

// 缓存版本号更新到 v7
const CACHE_NAME = 'ai-cosplay-cache-v7';

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
                console.log('Service Worker v7: 正在缓存核心文件。');
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
                        console.log('Service Worker v7: 正在删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch 事件
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    // *** 这是最终的修复方案 ***
    // 我们基于原始请求创建一个新的 Request 对象，
    // 但强制将它的 redirect 模式覆写为 'follow'。
    const newRequest = new Request(event.request, {
        redirect: 'follow'
    });

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                // 重要：我们在 fetch 调用中使用的是 newRequest 对象。
                const fetchPromise = fetch(newRequest).then(networkResponse => {
                    // 我们仍然使用原始的 event.request 作为缓存的键(key)。
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    console.error('Fetch 失败:', error);
                });
                return cachedResponse || fetchPromise;
            });
        })
    );
});