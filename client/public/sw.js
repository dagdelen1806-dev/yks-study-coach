// Pusula servis çalışanı: yalnızca oturum hatırlatma bildirimleri (Web Push).
// Bilerek `fetch` dinlemiyor: sayfalar ve API her zaman ağdan gelir, eski önbellek sorunu olmaz.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "Pusula";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag,
    renotify: Boolean(data.tag),
    lang: "tr",
    data: { url: data.url || "/" },
  }));
});

// Bildirime dokununca: açık bir Pusula sekmesi varsa ona geçip adresi aç, yoksa yeni pencere.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.focus();
      if ("navigate" in existing) return existing.navigate(url);
      return undefined;
    }
    return self.clients.openWindow(url);
  })());
});
