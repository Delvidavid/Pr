/* FitHome Pro — Service Worker: app 100% funcional sin conexión */
'use strict';

const CACHE = 'fithome-pro-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/data.js',
  './js/hologram.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// cache-first con actualización en segundo plano (stale-while-revalidate)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const red = fetch(e.request).then(res => {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          const copia = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copia));
        }
        return res;
      }).catch(() => cached);
      return cached || red;
    })
  );
});
