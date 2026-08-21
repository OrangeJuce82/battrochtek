const CACHE_NAME = "battrochtek-v32";
const AUDIO_CACHE = "battrochtek-audio-v2";

// Alpine n'est volontairement pas pré-caché ici : il est généré localement par
// npm install. Le mettre dans l'app shell risquait de figer le placeholder dans
// le cache du service worker avant le postinstall.
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./vendor/oat/oat.min.css",
  "./vendor/oat/oat.min.js",
  "./vendor/qrcode/qrcode.js",
  "./grooves/external-grooves.js",
  "./vendor/fontawesome/css/all.min.css",
  "./vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "./favicon-16.png",
  "./favicon-32.png",
  "./apple-touch-icon.png",
  "./logo.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== AUDIO_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

async function cacheNetworkResponse(cacheName, request, response) {
  if (!response || response.status !== 200 || response.type === "opaque") return response;
  // Clone immédiatement, avant que la réponse originale soit rendue au navigateur.
  const copy = response.clone();
  const cache = await caches.open(cacheName);
  await cache.put(request, copy);
  return response;
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.pathname.includes("/sounds/")) {
    event.respondWith((async () => {
      const cache = await caches.open(AUDIO_CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (response && response.ok) {
          const copy = response.clone();
          await cache.put(event.request, copy);
        }
        return response;
      } catch {
        return new Response("", { status: 504, statusText: "Audio offline unavailable" });
      }
    })());
    return;
  }

  // Réseau d'abord pour le code et les vendors : un Cmd/Ctrl+R voit toujours
  // la version présente sur le serveur local au lieu d'un ancien fichier mis en cache.
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      return await cacheNetworkResponse(CACHE_NAME, event.request, response);
    } catch {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      if (event.request.mode === "navigate") {
        const fallback = await caches.match("./index.html");
        if (fallback) return fallback;
      }
      return new Response("", { status: 504, statusText: "Offline" });
    }
  })());
});
