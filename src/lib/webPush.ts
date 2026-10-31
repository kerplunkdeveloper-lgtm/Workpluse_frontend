import { notificationsApi } from "@/lib/api";

const decodeKey = (value: string) => {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
};

/** Registers the worker and persists this browser's push endpoint for the logged-in user. */
export async function enableWebPushNotifications({ requestPermission = true }: { requestPermission?: boolean } = {}) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported" as const;
  if (!window.isSecureContext) return "insecure" as const;

  const keyResponse = await notificationsApi.getPushPublicKey();
  if (!keyResponse?.enabled || !keyResponse.publicKey) return "not-configured" as const;

  const permission = Notification.permission === "default" && requestPermission
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== "granted") return permission;

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeKey(keyResponse.publicKey),
    });
  }
  await notificationsApi.subscribePush(subscription.toJSON());
  return "granted" as const;
}
