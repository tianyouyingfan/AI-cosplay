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
// Fetch 事件：实现健壮的 SPA 缓存策略
self.addEventListener('fetch', event => {
    // 忽略非 GET 请求和 chrome-extension 请求
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    // 策略1: 对于导航请求 (HTML 文档), 始终返回缓存的 App Shell (index.html)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match(APP_SHELL_URL).then(cachedResponse => {
                // 如果缓存命中，直接返回
                if (cachedResponse) {
                    return cachedResponse;
                }
                // 如果缓存未命中（例如首次访问），则从网络获取。
                // 必须创建一个能跟随重定向的新请求。
                return fetch(event.request, { redirect: 'follow' });
            })
        );
        return;
    }

    // 策略2: 对于所有其他请求 (CSS, JS, 图片等), 采用 "Stale-While-Revalidate" 策略
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                // 创建一个新的请求，并明确设置 redirect 模式为 'follow'
                // 这能解决 Cloudflare 将 /index.html 重定向到 / 的问题
                const fetchPromise = fetch(event.request, { redirect: 'follow' }).then(networkResponse => {
                    // 检查响应是否有效
                    if (networkResponse && networkResponse.status === 200) {
                        // 将有效的响应克隆一份存入缓存
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    // 网络请求失败时，提供一些调试信息，但不要让 Promise 链中断
                    console.error('Service Worker Fetch failed:', error);
                    // 即使网络失败，如果缓存存在，我们依然会在下面返回缓存
                });

                // 立即返回缓存的响应 (Stale)，同时让网络请求在后台进行 (Revalidate)
                return cachedResponse || fetchPromise;
            });
        })
    );
});