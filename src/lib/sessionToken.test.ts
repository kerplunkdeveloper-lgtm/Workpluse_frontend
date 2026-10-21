import { afterEach, describe, expect, it } from "vitest";
import { getSessionAccessToken, setSessionAccessToken } from "./sessionToken";

describe("in-memory browser session", () => {
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

  it("never writes the token to persistent storage", () => {
    const writes: string[] = [];
    const storage = { setItem: (k: string) => writes.push(k), getItem: () => "stale", removeItem: () => {} };
    const g = globalThis as unknown as { window?: { localStorage: typeof storage } };
    const previous = g.window;
    g.window = { localStorage: storage };
    try {
      setSessionAccessToken("access-token");
      expect(writes).toEqual([]);
      setSessionAccessToken(null);
      expect(getSessionAccessToken()).toBeNull();
    } finally {
      g.window = previous;
    }
  });
});
