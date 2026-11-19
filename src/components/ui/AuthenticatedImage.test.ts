import { describe, expect, it } from "vitest";
import { isAuthenticatedApiImage, toAuthenticatedApiPath } from "../../lib/privateMedia";

describe("authenticated media contract", () => {
  it("does not duplicate the /api prefix with Axios base URL", () => {
    expect(toAuthenticatedApiPath("/api/employees/emp-1/avatar-file")).toBe("/employees/emp-1/avatar-file");
    expect(toAuthenticatedApiPath("/api/organization/logo-file")).toBe("/organization/logo-file");
  });
  it("routes private API media through the authenticated fetch path", () => {
    expect(isAuthenticatedApiImage("/api/organization/logo-file")).toBe(true);
    expect(isAuthenticatedApiImage("/api/employees/emp-1/avatar-file")).toBe(true);
  });

  it("keeps Cloudinary and other public URLs browser-compatible", () => {
    expect(isAuthenticatedApiImage("https://res.cloudinary.com/demo/image.png")).toBe(false);
    expect(isAuthenticatedApiImage("https://ui-avatars.com/api/?name=Ada")).toBe(false);
    expect(isAuthenticatedApiImage("organizations/org-a/avatars/key")).toBe(false);
  });
});
