import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from "firebase/messaging";
import { firebaseApp } from "@/lib/firebase";
import { notificationsApi } from "@/lib/api";

type FcmStatus = NotificationPermission | "unsupported" | "insecure" | "not-configured";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

export async function enableFirebaseNotifications({ requestPermission = true }: { requestPermission?: boolean } = {}): Promise<FcmStatus> {
  if (typeof window === "undefined" || !window.isSecureContext) return "insecure";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  if (!vapidKey) return "not-configured";

  let permission = Notification.permission;
  if (permission === "default" && requestPermission) permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;
  if (!(await isSupported())) return "unsupported";

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  const token = await getToken(getMessaging(firebaseApp), {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
  if (!token) return "not-configured";
  await notificationsApi.registerFcmToken(token);
  return "granted";
}

export async function listenForFirebaseNotifications(onNotification: (payload: MessagePayload) => void) {
  if (typeof window === "undefined" || !(await isSupported())) return () => {};
  return onMessage(getMessaging(firebaseApp), onNotification);
}

export async function unregisterFirebaseNotifications(token: string) {
  if (token) await notificationsApi.unregisterFcmToken(token);
}
