// Service worker : l'application s'ouvre même avec un réseau faible.
// Les fichiers de l'interface sont mis en cache ; l'API (/v1/) n'est JAMAIS mise en cache
// (le serveur reste la source de vérité ; les réponses hors ligne sont gardées et renvoyées par l'application).
const CACHE = 'r365-shell-v1';
const SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}icon-192.png`])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith(`${SCOPE}v1/`) || url.pathname.endsWith('/health')) return; // API : réseau uniquement
  if (req.mode === 'navigate') {
    // Page : réseau d'abord (pour recevoir les mises à jour), cache en secours.
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(SCOPE, copy));
          return res;
        })
        .catch(() => caches.match(SCOPE)),
    );
    return;
  }
  // Fichiers versionnés (assets/xxx-hash.js) : cache d'abord.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
