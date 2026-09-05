// Service worker — met uniquement en cache l'app shell (HTML/CSS/JS/icônes) pour permettre
// l'installation et un premier affichage hors-ligne. Le flux GTFS n'est JAMAIS mis en cache ici :
// il doit toujours être re-téléchargé à l'ouverture, conformément au principe du site
// (données réseau valables pour la session en cours uniquement).
const CACHE_NAME = 'agglo-en-bus-shell-v2';
const GTFS_HOST = 'gtfs-rt.infra-hubup.fr';

const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/logo-agglo-en-bus.png',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ne jamais intercepter le flux GTFS ni les appels réseau externes non-GET.
  if (url.hostname === GTFS_HOST || event.request.method !== 'GET') return;

  // Navigation (changement de page SPA) : réseau d'abord, repli sur le shell en cache si hors-ligne.
  // IMPORTANT : respondWith() DOIT toujours résoudre vers un vrai Response, jamais undefined
  // (sinon "Failed to convert value to 'Response'" et la navigation entière échoue).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request);
        } catch (err) {
          const cached = await caches.match('/');
          if (cached) return cached;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Hors ligne</title>' +
              '<p style="font-family:sans-serif;padding:2rem;text-align:center;">' +
              "Connexion indisponible. Reconnectez-vous puis réessayez.</p>",
            { status: 503, statusText: 'Offline', headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // Assets same-origin : cache d'abord, puis réseau (et mise à jour du cache en tâche de fond).
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        const network = fetch(event.request)
          .then((resp) => {
            if (resp && resp.ok) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return resp;
          })
          .catch(() => null);
        if (cached) return cached;
        const fromNetwork = await network;
        if (fromNetwork) return fromNetwork;
        return new Response('', { status: 504, statusText: 'Gateway Timeout' });
      })()
    );
  }
});
