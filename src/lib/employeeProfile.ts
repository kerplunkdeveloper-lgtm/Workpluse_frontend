/**
 * Employee profile form rules, shared by the add-employee form (manual entry and email invite) and
 * the profile edit form. They mirror attendance-backend/src/utils/employeeValidation.js, which stays
 * the source of truth: this only gives the person instant, per-field feedback.
 *
 * PAN, UAN and ESI are the only optional fields. Everything else is required.
 */

import { INDIAN_MOBILE_REGEX, sanitizeIndianPhone, toE164India } from "../components/ui/PhoneInput";

export interface EmployeeProfileValues {
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  dateOfJoining: string;
  designation: string;
  employmentType: string;
  branchId: string;
  departmentId: string;
  shiftId: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  ctc: string;
  panNumber: string;
  uanNumber: string;
  esiNumber: string;
}

export type ProfileErrors = Partial<Record<keyof EmployeeProfileValues, string>>;

export const EMPTY_PROFILE: EmployeeProfileValues = {
  firstName: "",
  lastName: "",
  email: "",
  personalEmail: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  dateOfJoining: "",
  designation: "",
  employmentType: "",
  branchId: "",
  departmentId: "",
  shiftId: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  ctc: "",
  panNumber: "",
  uanNumber: "",
  esiNumber: "",
};

export const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full time" },
  { value: "PART_TIME", label: "Part time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
];

const REQUIRED: [keyof EmployeeProfileValues, string][] = [
  ["firstName", "First name"],
  ["lastName", "Last name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["gender", "Gender"],
  ["dateOfBirth", "Date of birth"],
  ["dateOfJoining", "Date of joining"],
  ["designation", "Designation"],
  ["employmentType", "Employment type"],
  ["branchId", "Branch"],
  ["departmentId", "Department"],
  ["shiftId", "Shift"],
  ["address", "Address"],
  ["emergencyContactName", "Emergency contact name"],
  ["emergencyContactPhone", "Emergency contact phone"],
  ["bankName", "Bank name"],
  ["bankAccountNumber", "Bank account number"],
  ["bankIfsc", "IFSC code"],
  ["ctc", "Annual CTC"],
];

const FORMATS: Partial<Record<keyof EmployeeProfileValues, { pattern: RegExp; message: string; upper?: boolean; strip?: RegExp }>> = {
  email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address" },
  personalEmail: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid personal email address" },
  phone: { pattern: INDIAN_MOBILE_REGEX, message: "Enter a 10-digit mobile number starting with 6, 7, 8 or 9", strip: /\D/g },
  emergencyContactPhone: { pattern: INDIAN_MOBILE_REGEX, message: "Enter a 10-digit mobile number starting with 6, 7, 8 or 9", strip: /\D/g },
  bankAccountNumber: { pattern: /^\d{6,20}$/, message: "Enter 6 to 20 digits", strip: /\s+/g },
  bankIfsc: { pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: "Like HDFC0001234", upper: true, strip: /\s+/g },
  panNumber: { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: "Like ABCDE1234F", upper: true, strip: /\s+/g },
  uanNumber: { pattern: /^\d{12}$/, message: "Enter 12 digits", strip: /\s+/g },
  esiNumber: { pattern: /^\d{17}$/, message: "Enter 17 digits", strip: /\s+/g },
};

/** Today in the viewer's local calendar (toISOString would shift the day for UTC+ timezones). */
export const todayYmd = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Returns an error message per invalid field; an empty object means the form can be submitted. */
export function validateProfile(
  values: EmployeeProfileValues,
  options: { skip?: (keyof EmployeeProfileValues)[] } = {},
): ProfileErrors {
  const skip = new Set(options.skip || []);
  const errors: ProfileErrors = {};

  for (const [key, label] of REQUIRED) {
    if (skip.has(key)) continue;
    if (!String(values[key] ?? "").trim()) errors[key] = `${label} is required`;
  }

  for (const [key, rule] of Object.entries(FORMATS) as [keyof EmployeeProfileValues, NonNullable<(typeof FORMATS)[keyof typeof FORMATS]>][]) {
    if (skip.has(key) || errors[key]) continue;
    const raw = String(values[key] ?? "").trim();
    if (!raw) continue; // optional fields (personal email, PAN, UAN, ESI) may stay blank
    let value = rule.strip ? raw.replace(rule.strip, "") : raw;
    if (rule.upper) value = value.toUpperCase();
    if (!rule.pattern.test(value)) errors[key] = rule.message;
  }

  if (!errors.dateOfBirth && !skip.has("dateOfBirth") && values.dateOfBirth > todayYmd()) {
    errors.dateOfBirth = "Date of birth cannot be in the future";
  }
  if (!errors.ctc && !skip.has("ctc")) {
    const ctc = Number(values.ctc);
    if (!Number.isFinite(ctc) || ctc <= 0) errors.ctc = "Enter an amount greater than 0";
  }
  return errors;
}

/** The first field with an error, in form order, so the form can focus or scroll to it. */
export function firstErrorKey(errors: ProfileErrors): keyof EmployeeProfileValues | undefined {
  return (Object.keys(EMPTY_PROFILE) as (keyof EmployeeProfileValues)[]).find((key) => errors[key]);
}

/** Trims and normalises the values for the API (upper-case PAN/IFSC, digits-only numbers). */
export function toProfilePayload(values: EmployeeProfileValues) {
  const clean = (key: keyof EmployeeProfileValues) => {
    const rule = FORMATS[key];
    let value = String(values[key] ?? "").trim();
    if (rule?.strip) value = value.replace(rule.strip, "");
    if (rule?.upper) value = value.toUpperCase();
    return value;
  };
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim().toLowerCase(),
    personalEmail: values.personalEmail.trim().toLowerCase(),
    phone: toE164India(sanitizeIndianPhone(values.phone)),
    gender: values.gender,
    dateOfBirth: values.dateOfBirth,
    dateOfJoining: values.dateOfJoining,
    designation: values.designation.trim(),
    employmentType: values.employmentType,
    branchId: values.branchId,
    departmentId: values.departmentId,
    shiftId: values.shiftId,
    address: values.address.trim(),
    emergencyContactName: values.emergencyContactName.trim(),
    emergencyContactPhone: toE164India(sanitizeIndianPhone(values.emergencyContactPhone)),
    bankName: values.bankName.trim(),
    bankAccountNumber: clean("bankAccountNumber"),
    bankIfsc: clean("bankIfsc"),
    ctc: values.ctc ? Number(values.ctc) : undefined,
    panNumber: clean("panNumber"),
    uanNumber: clean("uanNumber"),
    esiNumber: clean("esiNumber"),
  };
}

/** The `YYYY-MM-DD` part of an API date, without a timezone shift. */
export const ymd = (value?: string | null) => (value ? String(value).split("T")[0] : "");
