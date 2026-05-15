self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("agenda-faculdade-v1").then((cache) =>
      cache.addAll(["/", "/icons/icon-192.png", "/icons/icon-512.png"]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((response) => response || caches.match("/"))),
  );
});

