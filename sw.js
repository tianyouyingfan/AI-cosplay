// 缓存版本号，每次更新 sw.js 文件时，都应该修改这个值
const CACHE_NAME = 'ai-cosplay-cache-v2';

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
    '/showPoto/show.png'

    // 注意：我们已经从这里移除了 cdn.tailwindcss.com
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
                    // 如果缓存名不是当前版本，就删除它
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
    // 对非 GET 请求，或者包含 chrome-extension 的请求，我们不处理
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                // 发起网络请求去获取最新资源
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    // 如果请求成功，就用新资源更新缓存
                    // 我们需要克隆响应，因为响应体只能被读取一次
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                });

                // 优先返回缓存中的响应（如果存在），否则等待网络请求的结果
                return cachedResponse || fetchPromise;
            });
        })
    );
});