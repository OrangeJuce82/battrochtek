const CACHE_NAME = "battrochtek-v13";
const AUDIO_CACHE = "battrochtek-audio-v1";
const APP_SHELL = [
  "./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest",
  "./vendor/alpine/alpine.min.js", "./vendor/fontawesome/css/all.min.css", "./vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "./favicon-32.png", "./apple-touch-icon.png", "./logo.png", "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME && key !== AUDIO_CACHE).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.includes("/sounds/")) {
    event.respondWith(caches.open(AUDIO_CACHE).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response && response.ok) cache.put(event.request, response.clone());
      return response;
    }).catch(() => new Response("", {status:504,statusText:"Audio offline unavailable"})));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.status === 200 && response.type !== "opaque") caches.open(CACHE_NAME).then(cache => cache.put(event.request,response.clone()));
    return response;
  }).catch(() => event.request.mode === "navigate" ? caches.match("./index.html") : new Response("",{status:504,statusText:"Offline"}))));
});
