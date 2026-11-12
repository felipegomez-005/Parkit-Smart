// Service worker de ParkIt: instalable (PWA) y con caché versionada.
// __BUILD_VERSION__ se reemplaza en cada build (ver vite.config.js), así el
// navegador detecta un sw.js distinto y actualiza.
// NUNCA toca /api, /socket.io ni peticiones que no sean GET.

const VERSION = '__BUILD_VERSION__';
const CACHE_NAME = `parkit-cache-${VERSION}`;
const CORE = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(request, fallbackKey) {
  return fetch(request, { cache: 'no-store' })
    .then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(fallbackKey || request, copy));
      }
      return response;
    })
    .catch(() => caches.match(fallbackKey || request).then((r) => r || Response.error()));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io')
  ) {
    return;
  }

  // Navegaciones (index.html): red primero, caché solo sin conexión.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, '/index.html'));
    return;
  }

  // Archivos con hash: cache-first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Resto (manifest, íconos): red primero con respaldo en caché.
  event.respondWith(networkFirst(request));
});
