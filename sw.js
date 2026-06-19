// SWANK PWA Service Worker v3
// Caches app shell including merged app.html

const CACHE_NAME   = 'swank-shell-v3';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/manifest.json',
  '/logo.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html'
];

// ── Install: pre-cache shell assets ──────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key)   { return caches.delete(key);  })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: shell from cache, API calls always network ────────
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Never cache API calls to Worker or GAS
  if (url.hostname === 'script.google.com' ||
      url.hostname.endsWith('.workers.dev') ||
      url.hostname === 'swankcurtains.com' && url.pathname.startsWith('/api/')) {
    return;
  }

  // Shell assets: cache-first
  if (SHELL_ASSETS.indexOf(url.pathname) !== -1 || url.pathname === '/') {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match('/offline.html');
    })
  );
});
