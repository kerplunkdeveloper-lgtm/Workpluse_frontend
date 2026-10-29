/* WorkPluse web push worker. It runs even when the dashboard tab is closed. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "You have a new notification." };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "WorkPluse notification", {
      body: data.body || "You have a new notification.",
      icon: "/logo-v2-128.png",
      badge: "/logo-v2-128.png",
      tag: data.notificationId || "workpulse-notification",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
