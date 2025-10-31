// 确认 v8 版本已加载，并说明新的缓存策略
console.log(
  '%c ✨ AI-Cosplay Service Worker v8 已加载！对页面采用网络优先策略。 ✨',
  'color: #007bff; font-size: 1.2em; font-weight: bold;'
);

// 缓存版本号更新到 v8
const CACHE_NAME = 'ai-cosplay-cache-v8';

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
                console.log('Service Worker v8: 正在缓存核心文件。');
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
                        console.log('Service Worker v8: 正在删除旧缓存:', cacheName);
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

    // *** 策略分离：对 HTML 页面采用“网络优先”策略 ***
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(new Request(event.request, { redirect: 'follow' }))
                .then(networkResponse => {
                    // 如果网络请求成功，将其存入缓存并返回
                    const cacheToPut = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, cacheToPut);
                    });
                    return networkResponse;
                })
                .catch(() => {
                    // 如果网络请求失败（离线），则从缓存中查找
                    return caches.match(event.request);
                })
        );
        return; // 结束执行
    }

    // *** 对其他静态资源（CSS, JS, 图片等）采用“缓存优先，后台更新”策略 ***
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                const fetchPromise = fetch(new Request(event.request, { redirect: 'follow' }))
                    .then(networkResponse => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                // 优先返回缓存，同时网络请求在后台更新缓存
                return cachedResponse || fetchPromise;
            });
        })
    );
});