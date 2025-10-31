// 缓存版本号更新到 v4
const CACHE_NAME = 'ai-cosplay-cache-v4';

// 需要在安装时预缓存的核心本地文件
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
    // 新增的 Google Generative AI ES 模块 URL
    'https://cdn.jsdelivr.net/npm/@google/generative-ai@0.24.1/dist/index.mjs'
];

// 1. 安装 Service Worker 并缓存核心文件
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache and caching core assets');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. 激活 Service Worker 并清理旧缓存
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

// 3. 拦截网络请求，并采用“缓存优先，后台更新”策略
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                // 发起网络请求去获取最新资源
                // *** 这是关键的修复 ***
                // 添加 { redirect: 'follow' } 来处理服务器端的重定向
                const fetchPromise = fetch(event.request, { redirect: 'follow' }).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    console.error('Fetching failed:', error);
                    // 你可以在这里返回一个自定义的离线页面
                });

                // 优先返回缓存中的响应，否则等待网络请求的结果
                return cachedResponse || fetchPromise;
            });
        })
    );
});