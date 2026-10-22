// Service worker, rendered per build. The cache name and the asset list both
// carry the build id, so a change to any file under static/ installs a fresh
// cache and retires the old one.
//
// Everything the app does happens in the page, so a cached copy of the page
// is the whole app — offline is a full experience, not a fallback screen.

const CACHE = 'ogcalc-{{ build }}';
const ASSETS = [
  '/',
  '/manifest.webmanifest',
{%- for a in assets %}
  '/static/{{ a }}?v={{ build }}',
{%- endfor %}
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ogcalc-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // The page: network first, so a new build shows up as soon as it is online;
  // the cached copy when there is no network.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); }
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Versioned assets never change under the same URL: cache first.
  if (url.pathname.startsWith('/static/') || url.pathname === '/manifest.webmanifest') {
    // ignoreSearch: fonts.css asks for its fonts without ?v=, and only this
    // build's cache survives activate, so any hit is the current file.
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
  }
});
