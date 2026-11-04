/* Firebase Cloud Messaging service worker. Keep this file at the site root. */
importScripts("https://www.gstatic.com/firebasejs/13.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBtk4kH5LSvUoy91w5dMbCTW3wZi0jVp-4",
  authDomain: "workpluse-production.firebaseapp.com",
  projectId: "workpluse-production",
  storageBucket: "workpluse-production.firebasestorage.app",
  messagingSenderId: "234972434015",
  appId: "1:234972434015:web:6cdb1e5d6888b4668315ea",
});

const messaging = firebase.messaging();

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

messaging.onBackgroundMessage((payload) => {
  // FCM already displays payloads containing a notification. Only data-only
  // messages need a manual notification, otherwise the user sees two alerts.
  if (payload.notification) return;
  const title = payload.notification?.title || payload.data?.title || "WorkPluse notification";
  const body = payload.notification?.body || payload.data?.body || "You have a new notification.";
  const url = payload.data?.url || "/dashboard";

  return self.registration.showNotification(title, {
    body,
    icon: "/logo-v2-128.png",
    badge: "/logo-v2-128.png",
    tag: payload.data?.notificationId || "workpulse-notification",
    data: { url },
  });
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
