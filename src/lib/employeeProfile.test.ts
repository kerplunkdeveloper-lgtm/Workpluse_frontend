import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE, firstErrorKey, toProfilePayload, validateProfile, ymd, type EmployeeProfileValues } from "./employeeProfile";

const complete = (patch: Partial<EmployeeProfileValues> = {}): EmployeeProfileValues => ({
  ...EMPTY_PROFILE,
  firstName: "Asha",
  lastName: "Nair",
  email: "Asha@Example.com",
  phone: "9876543210",
  gender: "FEMALE",
  dateOfBirth: "1995-04-02",
  dateOfJoining: "2024-01-10",
  designation: "Designer",
  employmentType: "FULL_TIME",
  branchId: "b1",
  departmentId: "d1",
  shiftId: "s1",
  address: "12 Main Road, Salem 636001",
  emergencyContactName: "Ravi",
  emergencyContactPhone: "9123456780",
  bankName: "HDFC",
  bankAccountNumber: "123456789012",
  bankIfsc: "hdfc0001234",
  ctc: "600000",
  ...patch,
});

describe("employee profile validation", () => {
  it("accepts a complete profile with PAN, UAN and ESI left blank", () => {
    expect(validateProfile(complete())).toEqual({});
  });

  it("requires every field except PAN, UAN and ESI", () => {
    const errors = validateProfile(EMPTY_PROFILE);
    expect(errors.firstName).toBeTruthy();
    expect(errors.bankIfsc).toBeTruthy();
    expect(errors.address).toBeTruthy();
    expect(errors.panNumber).toBeUndefined();
    expect(errors.uanNumber).toBeUndefined();
    expect(errors.esiNumber).toBeUndefined();
  });

  it("checks formats once a value is entered", () => {
    expect(validateProfile(complete({ panNumber: "ABC" })).panNumber).toBeTruthy();
    expect(validateProfile(complete({ panNumber: "abcde1234f" })).panNumber).toBeUndefined();
    expect(validateProfile(complete({ uanNumber: "123" })).uanNumber).toBeTruthy();
    expect(validateProfile(complete({ esiNumber: "1".repeat(17) })).esiNumber).toBeUndefined();
    expect(validateProfile(complete({ email: "nope" })).email).toBeTruthy();
    expect(validateProfile(complete({ bankIfsc: "BAD" })).bankIfsc).toBeTruthy();
  });

  it("treats personal email as optional but format-checked, and lower-cases it", () => {
    expect(validateProfile(complete({ personalEmail: "" })).personalEmail).toBeUndefined();
    expect(validateProfile(complete({ personalEmail: "nope" })).personalEmail).toBeTruthy();
    expect(validateProfile(complete({ personalEmail: "asha@gmail.com" })).personalEmail).toBeUndefined();
    expect(toProfilePayload(complete({ personalEmail: " Asha.N@Gmail.com " })).personalEmail).toBe("asha.n@gmail.com");
  });

  it("rejects a future birth date and a zero CTC", () => {
    expect(validateProfile(complete({ dateOfBirth: "2999-01-01" })).dateOfBirth).toBeTruthy();
    expect(validateProfile(complete({ ctc: "0" })).ctc).toBeTruthy();
  });

  it("can skip fields the form does not show", () => {
    const errors = validateProfile(complete({ email: "", ctc: "" }), { skip: ["email", "ctc"] });
    expect(errors).toEqual({});
  });

  it("reports the first bad field in form order", () => {
    expect(firstErrorKey({ ctc: "x", firstName: "y" })).toBe("firstName");
    expect(firstErrorKey({})).toBeUndefined();
  });

  it("builds a clean payload: lower-case email, upper-case IFSC, +91 phone", () => {
    const payload = toProfilePayload(complete());
    expect(payload.email).toBe("asha@example.com");
    expect(payload.bankIfsc).toBe("HDFC0001234");
    expect(payload.phone).toBe("+919876543210");
    expect(payload.ctc).toBe(600000);
  });

  it("reads the date part of an API date without a timezone shift", () => {
    expect(ymd("2024-01-10T18:30:00.000Z")).toBe("2024-01-10");
    expect(ymd(null)).toBe("");
  });
});
