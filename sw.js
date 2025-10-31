console.log(
  '%c ✨ AI-Cosplay Service Worker v9 (SPA) 已加载！ ✨',
  'color: #ff8c00; font-size: 1.2em; font-weight: bold;'
);

const CACHE_NAME = 'ai-cosplay-cache-v9';
const APP_SHELL_URL = '/index.html';

// 应用外壳，包含所有核心文件
const urlsToCache = [
    '/',
    APP_SHELL_URL,
    '/assets/css/style.css',
    '/assets/js/router.js',
    '/assets/js/test-api.js',
    '/assets/js/services/storage.service.js',
    '/assets/js/services/api.service.js',
    '/assets/js/providers/google.provider.js',
    '/assets/js/providers/grsai.provider.js',
    '/assets/js/utils/dom.util.js',
    '/assets/js/utils/image.util.js',
    '/assets/js/settings.js',
    '/assets/js/generator.js',
    '/favicon.ico',
    '/manifest.json',
    '/assets/icons/icon-192x192.png',
    '/assets/icons/icon-512x512.png',
    '/showPoto/show.png',
    'https://cdn.tailwindcss.com?plugins=forms,container-queries',
    'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined',
    'https://cdn.jsdelivr.net/npm/@google/genai@0.15.0/dist/index.umd.min.js'
];

// 安装事件：缓存 App Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker v9: 正在缓存 App Shell。');
                // 使用 addAll 来原子性地添加所有 URL
                // 对外部资源使用 no-cors 模式，即使失败也不会导致整个缓存失败
                const cachePromises = urlsToCache.map(url => {
                    const request = new Request(url, { mode: 'no-cors' });
                    return cache.add(request).catch(err => console.warn(`无法缓存: ${url}`, err));
                });
                return Promise.all(cachePromises);
            })
    );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker v9: 正在删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => self.clients.claim()) // 立即控制页面
    );
});

// Fetch 事件：为 SPA 提供服务
self.addEventListener('fetch', event => {
    // 忽略非 GET 请求 和 chrome-extension 请求
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    // 策略1: 对于导航请求 (HTML 文档), 总是返回 App Shell (index.html)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match(APP_SHELL_URL)
                .then(response => {
                    return response || fetch(APP_SHELL_URL);
                })
        );
        return;
    }

    // 策略2: 对于其他所有请求 (CSS, JS, 图片等), 采用“缓存优先”策略
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // 如果缓存中有，直接返回
                if (cachedResponse) {
                    return cachedResponse;
                }
                // 如果缓存中没有，则发起网络请求
                return fetch(event.request).then(networkResponse => {
                    // 检查响应是否有效
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'error') {
                        return networkResponse;
                    }
                    // 将有效的响应克隆一份存入缓存
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    return networkResponse;
                });
            })
    );
});
