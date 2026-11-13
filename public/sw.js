
/* Workpluse Firebase Cloud Messaging Service Worker */

// Register click handler BEFORE Firebase imports.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl = event.notification.data?.url || "/dashboard";
  const target = new URL(rawUrl, self.location.origin);

  // Prevent notifications from opening external websites.
  if (target.origin !== self.location.origin) return;

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then(async (windows) => {
      const existing = windows.find(
        (client) => client.url.startsWith(self.location.origin)
      );

      if (existing) {
        await existing.navigate(target.href);
        return existing.focus();
      }

      return self.clients.openWindow(target.href);
    })
  );
});

// Firebase Compatibility SDK
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js"
);

// Firebase Web Configuration
firebase.initializeApp({
  apiKey: "AIzaSyBtk4kH5LSvUoy91w5dMbCTW3wZi0jVp-4",
  authDomain: "workpluse-production.firebaseapp.com",
  projectId: "workpluse-production",
  storageBucket: "workpluse-production.firebasestorage.app",
  messagingSenderId: "234972434015",
  appId: "1:234972434015:web:6cdb1e5d6888b4668315ea",
});

const messaging = firebase.messaging();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive messages when website is in background.
messaging.onBackgroundMessage((payload) => {
  // FCM displays notification payloads automatically.
  // Avoid displaying them a second time.
  if (payload.notification) return;

  const title = payload.data?.title || "Workpluse";
  const body =
    payload.data?.body || "You have a new notification";

  return self.registration.showNotification(title, {
    body,
    icon: "/logo-v2-128.png",
    badge: "/logo-v2-128.png",
    silent: false,
    renotify: true,
    vibrate: [120, 80, 120],
    tag: payload.data?.notificationId || undefined,
    data: {
      url: payload.data?.url || "/dashboard",
    },
  });
});
