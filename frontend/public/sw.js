/**
 * HealthSync AI - Service Worker for Browser Web Push Notifications
 */

self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "HealthSync AI";
    const options = {
      body: data.body || "You have a new healthcare update.",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/badge-72x72.png",
      tag: data.tag || "healthsync-notification",
      data: {
        url: data.url || "/dashboard/notifications",
      },
      requireInteraction: false,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("Error displaying push notification:", err);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/dashboard/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

