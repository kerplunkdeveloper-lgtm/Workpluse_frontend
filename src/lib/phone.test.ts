import { describe, expect, it } from "vitest";
import { sanitizeIndianPhone, toE164India, validateIndianPhone } from "../components/ui/PhoneInput";
import { EMPTY_PROFILE, toProfilePayload, validateProfile } from "./employeeProfile";

describe("Indian mobile numbers", () => {
  it("keeps digits only and caps at 10", () => {
    expect(sanitizeIndianPhone("98a76-5 43210 99")).toBe("9876543210");
    expect(sanitizeIndianPhone("abc")).toBe("");
  });

  it("drops a pasted +91, 91 or 0 prefix", () => {
    expect(sanitizeIndianPhone("+91 98765 43210")).toBe("9876543210");
    expect(sanitizeIndianPhone("919876543210")).toBe("9876543210");
    expect(sanitizeIndianPhone("09876543210")).toBe("9876543210");
  });

  it("needs 10 digits starting with 6-9", () => {
    expect(validateIndianPhone("98765", true)).toBe("Enter all 10 digits");
    expect(validateIndianPhone("1234567890", true)).toMatch(/start with 6/);
    expect(validateIndianPhone("9876543210", true)).toBeNull();
    expect(validateIndianPhone("", true)).toMatch(/required/);
    expect(validateIndianPhone("", false)).toBeNull();
  });

  it("the employee form flags a bad number and sends +91 for a good one", () => {
    const base = { ...EMPTY_PROFILE, phone: "12345", emergencyContactPhone: "9876543210" };
    const errors = validateProfile(base);
    expect(errors.phone).toBeTruthy();
    expect(errors.emergencyContactPhone).toBeUndefined();
    expect(toProfilePayload({ ...base, phone: "9123456780" }).phone).toBe("+919123456780");
    expect(toE164India("")).toBe("");
  });
});
