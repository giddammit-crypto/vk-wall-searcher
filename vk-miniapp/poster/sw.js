/**
 * Aurora Design — Service Worker (Cache-First with Network Fallback)
 * Provides offline caching for static assets, styles, scripts and fonts.
 */

const CACHE_NAME = 'aurora-poster-v5.7.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './enhancer.css',
  './ai_elements.css',
  './retouch_engine.css',
  './figma_inspector.css',
  './bg-removal-panel.css',
  './editor.js',
  './figma_pro_tools.js',
  './mask-painter.js',
  './bg-removal-browser.js',
  './bg-removal-server.js',
  './bg-removal-controller.js',
  './workers/bg-removal-worker.js',
  './qrcode.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[Aurora SW] Pre-cache partial warning:', err);
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Do not cache API proxy or dynamic PHP scripts
  if (url.pathname.includes('/api/') || url.pathname.endsWith('.php')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) {
          return response;
        }
        if (url.origin === location.origin) {
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
