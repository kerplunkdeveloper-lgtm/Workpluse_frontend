import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({ firebaseApp: {} }));
vi.mock("@/lib/api", () => ({ notificationsApi: { registerFcmToken: vi.fn() } }));
vi.mock("firebase/messaging", () => ({
  getMessaging: vi.fn(), getToken: vi.fn(), isSupported: vi.fn(), onMessage: vi.fn(),
}));

describe("notification permission prompt", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY", "test-public-key");
    vi.stubGlobal("window", { isSecureContext: true, Notification: {} });
    vi.stubGlobal("navigator", { serviceWorker: {} });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("keeps the Allow button available before the user has decided", async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    const { enableFirebaseNotifications } = await import("./firebaseMessaging");
    expect(await enableFirebaseNotifications({ requestPermission: false })).toBe("default");
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("keeps permission undecided when the user dismisses the prompt", async () => {
    const requestPermission = vi.fn().mockResolvedValue("default");
    vi.stubGlobal("Notification", { permission: "default", requestPermission });
    const { enableFirebaseNotifications } = await import("./firebaseMessaging");
    expect(await enableFirebaseNotifications()).toBe("default");
    expect(requestPermission).toHaveBeenCalledOnce();
  });

  it("reports blocked permission without prompting again", async () => {
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { permission: "denied", requestPermission });
    const { enableFirebaseNotifications } = await import("./firebaseMessaging");
    expect(await enableFirebaseNotifications()).toBe("denied");
    expect(requestPermission).not.toHaveBeenCalled();
  });
});
