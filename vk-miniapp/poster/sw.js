/**
 * Aurora Design — Service Worker (Cache-First with Stale-While-Revalidate & Network Fallback)
 * Provides resilient offline caching for static assets, styles, scripts and templates.
 */

const CACHE_NAME = 'aurora-poster-v5.7.2';

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
  './a11y.js',
  './figma_pro_tools.js',
  './ai_elements.js',
  './enhancer.js',
  './retouch_engine.js',
  './mask-painter.js',
  './bg-removal-browser.js',
  './bg-removal-server.js',
  './bg-removal-controller.js',
  './workers/bg-removal-worker.js',
  './vk.js',
  './qrcode.min.js',
  './vendor/fabric.min.js',
  './vendor/paper-core.min.js',
  './vendor/jspdf.umd.min.js',
  './vendor/jszip.min.js',
  './vendor/vk-bridge.min.js',
  '../chronograph/data.js',
  '../chronograph/poster_templates.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Use allSettled so one missing or 403 file never breaks SW registration
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[Aurora SW] Pre-cache item skipped:', url, err.message);
          })
        )
      );
      return results;
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
  if (url.pathname.includes('/api/') || url.pathname.endsWith('.php') || url.searchParams.has('action')) {
    return;
  }

  // Stale-While-Revalidate for template data and large dictionaries
  if (url.pathname.includes('data.js') || url.pathname.includes('poster_templates.js')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Cache-first for other static assets
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
