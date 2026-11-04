// Offline support: after the first visit the whole game works without internet.
// Pages are network-first (so updates arrive); everything else is cache-first.
const CACHE = 'letterlings-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './assets/fonts/andika-400.woff2', './assets/fonts/andika-700.woff2', './assets/fonts/fredoka-600.woff2'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const keep = (res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  };
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(keep).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(keep)));
});
