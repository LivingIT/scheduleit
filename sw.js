const CACHE = 'scheduleit-v22';
const ASSETS = ['./','./index.html','./manifest.webmanifest','./schedule.json',
  './icon-192.png','./icon-512.png','./icon-512-maskable.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // any schedule file (schedule.json, opio.json, …): network-first so edits and
  // ?s=<name> switches show up without a version bump
  if (url.pathname.endsWith('.json')) {
    // Only cache good responses (a 5xx must not replace the last good copy), and on a
    // 5xx or a network failure fall back to that copy if there is one.
    e.respondWith(
      fetch(e.request).then(r => {
        if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }
        if (r.status >= 500) return caches.match(e.request).then(hit => hit || r);
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // app shell: cache-first
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      const copy = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return resp;
    }).catch(() => caches.match('./index.html')))
  );
});
