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
});
