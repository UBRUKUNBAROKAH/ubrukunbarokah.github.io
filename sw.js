const CACHE = 'rukun-barokah-v44';

// App shell yang di-cache saat install.
// Pastikan semua file ini benar-benar ada di root repo.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // allSettled: satu file hilang/404 tidak menggagalkan seluruh install.
      .then(c => Promise.allSettled(APP_SHELL.map(url => c.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Jangan cache request lintas-origin (Supabase API, CDN, WhatsApp gateway).
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        // Update cache hanya untuk response yang valid.
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        // Fallback navigasi: selalu tampilkan app shell saat offline.
        if (req.mode === 'navigate') {
          return (await caches.match('./index.html')) || (await caches.match('./'));
        }
        return Response.error();
      })
  );
});
