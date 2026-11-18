
const CACHE_NAME = "atm-dictionary-v7";

const CORE = [
  "./dictionary.html",
  "./dictionary.css",
  "./dictionary.js",
  "./dictionary-data.js",
  "./dictionary-extra-batch-1.js",
  "./dictionary-arabic-batch-1.js",
  "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const request = event.request;
  const url = new URL(request.url);

  const isAppFile =
    url.pathname.endsWith(".html") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js");

  event.respondWith(
    (async () => {
      if (isAppFile) {
        try {
          const response = await fetch(request);

          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }

          return response;
        } catch (error) {
          const cached = await caches.match(request);
          if (cached) return cached;
          throw error;
        }
      }

      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const response = await fetch(request);

        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }

        return response;
      } catch (error) {
        return caches.match("./dictionary.html");
      }
    })()
  );
});
