// --- START OF FILE sw.js (FIXED) ---

console.log(
  '%c ✨ AI-Cosplay Service Worker v10 (Robust) 已加载！ ✨',
  'color: #28a745; font-size: 1.2em; font-weight: bold;'
);

const CACHE_NAME = 'ai-cosplay-cache-v10';
const APP_SHELL_URL = '/index.html';

// 应用外壳，只包含核心文件，移除所有第三方 CDN 资源
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
    '/showPoto/show.png'
];

// 安装事件：仅缓存核心 App Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker v10: 正在缓存核心 App Shell。');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker v10: App Shell 缓存失败:', error);
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
                        console.log('Service Worker v10: 正在删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => self.clients.claim()) // 立即控制页面
    );
});

// Fetch 事件：实现健壮的 SPA 缓存策略
self.addEventListener('fetch', event => {
    // 忽略非 GET 请求和 chrome-extension 请求
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    // 策略1: 对于导航请求 (HTML 文档), 始终返回缓存的 App Shell (index.html)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            // 直接从缓存提供 index.html，确保应用能启动
            caches.match(APP_SHELL_URL)
                .then(response => {
                    if (response) return response;
                    // 如果 index.html 也不在缓存中（极少见），则从网络获取
                    // --- FIX 1: 添加 redirect: 'follow' ---
                    return fetch(APP_SHELL_URL, { redirect: 'follow' });
                })
        );
        return;
    }

    // 策略2: 对于所有其他请求 (CSS, JS, 图片, 字体等), 采用 "Stale-While-Revalidate" 策略
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(event.request).then(cachedResponse => {
                // 1. 从网络获取新的响应
                // --- FIX 2: 添加 redirect: 'follow' ---
                const fetchPromise = fetch(event.request, { redirect: 'follow' }).then(networkResponse => {
                    // 检查响应是否有效
                    if (networkResponse && networkResponse.status === 200) {
                        // 将有效的响应克隆一份存入缓存
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(error => {
                    // 网络请求失败时提供一些反馈，防止未捕获的 Promise 拒绝
                    console.error('Service Worker Fetch Error:', error);
                    // 可以返回一个自定义的离线响应或继续返回 null/undefined
                });

                // 2. 如果缓存中存在，立即返回缓存的响应 (Stale)
                //    同时，网络请求仍在后台进行，并会更新缓存 (Revalidate)
                return cachedResponse || fetchPromise;
            });
        })
    );
});