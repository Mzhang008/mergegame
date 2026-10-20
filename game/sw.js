// Sakura Merge service worker: lets the installed game launch and play
// offline. Bump VERSION with every release so stale caches are dropped.
const VERSION = '1.0.0';
const CACHE = `sakura-merge-${VERSION}`;

// Everything the game needs to run offline. tests/pwa.spec.js fails if a
// shipped file is missing from this list.
const PRECACHE = [
  './',
  'index.html',
  'style.css',
  'game.js',
  'manifest.webmanifest',
  'privacy.html',
  'credits.html',
  'doc.css',
  'art/icon.svg',
  'art/icon-maskable.svg',
  'art/hana.svg',
  'art/torii.svg',
  ...[0, 1, 2, 3, 4, 5].map(i => `art/village-${i}.svg`),
  ...['sakura', 'food', 'tea'].flatMap(c => [1, 2, 3, 4, 5, 6, 7].map(t => `art/items/${c}-${t}.png`)),
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'lib/twemoji.min.js',
  ...['1f338', '1f381', '1f38b', '1fa99', '25b6', '26a1', '26e9', '2728'].map(c => `lib/svg/${c}.svg`),
  'lib/LICENSE-twemoji-code.txt',
  'lib/LICENSE-twemoji-graphics.txt',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith('sakura-merge-') && k !== CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: online players always get the newest build, so a deploy
// can't strand anyone on mismatched files; the cache is the offline
// fallback. Other origins (analytics) pass straight through.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
