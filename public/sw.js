const CACHE_NAME = "hasten-driver-v1";
const OFFLINE_URLS = [
  "/driver/dashboard",
  "/driver/loads",
  "/driver/map",
  "/driver/documents",
  "/driver/messages",
  "/driver/earnings",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match("/driver/dashboard")))
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "HASTEN Alert", {
      body: data.body || "You have a new update.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "hasten",
      data: { url: data.url || "/driver/dashboard" },
      actions: data.actions || [],
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/driver/dashboard";
  event.waitUntil(clients.openWindow(url));
});
