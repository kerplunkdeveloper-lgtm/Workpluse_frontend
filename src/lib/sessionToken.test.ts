import { afterEach, describe, expect, it } from "vitest";
import { getSessionAccessToken, setSessionAccessToken } from "./sessionToken";

describe("persistent browser session", () => {
  afterEach(() => setSessionAccessToken(null));

  it("keeps the current access token in memory", () => {
    setSessionAccessToken("access-token");
    expect(getSessionAccessToken()).toBe("access-token");
  });

  it("removes the token on logout", () => {
    setSessionAccessToken("access-token");
    setSessionAccessToken(null);
    expect(getSessionAccessToken()).toBeNull();
  });

  it("persists the token across simulated page reloads", () => {
    const store = new Map<string, string>();
    const storage = {
      setItem: (k: string, v: string) => store.set(k, v),
      getItem: (k: string) => store.get(k) ?? null,
      removeItem: (k: string) => store.delete(k),
    };
    const g = globalThis as unknown as { window?: { localStorage: typeof storage } };
    const previous = g.window;
    g.window = { localStorage: storage };
    try {
      setSessionAccessToken("persisted-token");
      expect(store.get("workpulse_access_token")).toBe("persisted-token");
      expect(getSessionAccessToken()).toBe("persisted-token");

      setSessionAccessToken(null);
      expect(store.get("workpulse_access_token")).toBeUndefined();
      expect(getSessionAccessToken()).toBeNull();
    } finally {
      g.window = previous;
    }
  });
});
