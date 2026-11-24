const CACHE_NAME = "atm-dictionary-v35";

const CORE = [
  "./dictionary.html",
  "./privacy-policy.html",
  "./manifest.webmanifest",
  "./icon-logo.svg",
  "./icon-logo-192.png",
  "./icon-logo-512.png"
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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME && k !== "atm-dictionary-daily").map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  const isAppFile = /\.(html|css|js)$/.test(url.pathname) || url.pathname.endsWith("/");

  event.respondWith((async () => {
    if (isAppFile) {
      // Open from the saved copy at once; fetch the newest copy in the background for next time.
      const cached = await caches.match(request);
      const network = fetch(request).then(async response => {
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      }).catch(() => null);
      if (cached) { event.waitUntil(network); return cached; }
      return (await network) || caches.match("./dictionary.html");
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
  })());
});

/* ---------- DAILY WORD REMINDER ---------- */
self.addEventListener("periodicsync", event => {
  if (event.tag === "atm-daily-word") event.waitUntil(showDailyWordFromCache());
});

async function showDailyWordFromCache() {
  try {
    const cache = await caches.open("atm-dictionary-daily");
    const res = await cache.match("./__daily-word__.json");
    if (!res) return;
    const data = await res.json();
    if (!data.on || self.Notification.permission !== "granted") return;
    const title = data.en ? "Word of the day: " + data.en : "Your word of the day is ready";
    await self.registration.showNotification(title, {
      body: (data.ha ? data.ha + " — " : "") + "Open the dictionary to learn it.",
      tag: "atm-daily-word",
      icon: "icon-logo-192.png",
      badge: "icon-logo-192.png",
      data: { url: "./" }
    });
  } catch (e) {}
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of list) {
      if ("focus" in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow("./");
  })());
});
