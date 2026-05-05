self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("jetek-v1").then((cache) => cache.addAll(["/", "/manifest.webmanifest"])),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open("jetek-v1").then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => caches.match("/") || Response.error()),
    ),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "إشعار";
  const options = {
    body: data.body || "",
    data: { url: data.url || "/" },
    icon: "/icon.png",
    badge: "/icon.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
