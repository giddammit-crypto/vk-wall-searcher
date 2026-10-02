/**
 * sw.js — Root Service Worker for AURORA STAT
 * P-5: Offline caching of static core assets with network-first for VK API & PHP proxy.
 */

const CACHE_NAME = 'aurora-stat-v2';

const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './src/app.js',
    './src/api.js',
    './src/render.js',
    './src/analytics.js',
    './src/branches.js',
    './src/export.js',
    './src/advice.js',
    './src/ai.js',
    './src/subscribers.js',
    './src/updater.js',
    './assets/fonts/material-symbols-outlined.woff2',
    './assets/fonts/ShoptronicSP-Regular.woff2',
    './assets/fonts/arial.woff2'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] Cache addAll warning:', err))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const reqUrl = event.request.url;

    // VK API, JSONP callbacks, server proxy requests, and updater must go directly to the network
    if (
        reqUrl.includes('api.vk.com') ||
        reqUrl.includes('vk-proxy.php') ||
        reqUrl.includes('/api/') ||
        reqUrl.includes('vk_jsonp_cb_') ||
        event.request.method !== 'GET'
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch fresh in background (stale-while-revalidate for local static assets)
                fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    })
                    .catch(() => {});
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});
