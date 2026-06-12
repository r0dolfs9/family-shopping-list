// sw.js — app-shell cache so Tally opens with weak/no reception.
// Strategy: precache shell on install; network-first for HTML (fresh deploys),
// cache-first for static assets; never caches Supabase API calls.

const CACHE = 'tally-v2-shell-v2';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/styles.css',
  './src/app.js',
  './src/app-config.js',
  './src/core.js',
  './src/local-store.js',
  './src/queue.js',
  './src/remote.js',
  './src/sheet.js',
  './src/settings.js',
  './src/supabase-mappers.js',
  './src/sync.js',
  './src/ui-helpers.js',
  './fonts/InterTight-VF.ttf',
  './fonts/BarlowCondensed-SemiBold.ttf',
  './fonts/BarlowCondensed-Medium.ttf',
  './fonts/DMMono-Regular.ttf',
  './fonts/DMMono-Medium.ttf',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  // Never intercept Supabase (or any cross-origin API) traffic.
  if (url.origin !== self.location.origin) {
    // Except the supabase-js module from jsdelivr: cache-first (it is versioned).
    if (url.hostname === 'cdn.jsdelivr.net') {
      event.respondWith(cacheFirst(event.request));
    }
    return;
  }
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(event.request));
  } else {
    // App code/styles: stale-while-revalidate so deploys reach users on next load.
    event.respondWith(staleWhileRevalidate(event.request));
  }
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached ?? (await network) ?? Response.error();
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    return cached ?? caches.match('./index.html');
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}
