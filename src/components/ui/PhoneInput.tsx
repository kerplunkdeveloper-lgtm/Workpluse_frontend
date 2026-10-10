"use client";

import React from "react";

/** Indian mobile: exactly 10 digits, first digit 6-9. */
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/** Strip everything except digits, drop a pasted +91 / 91 / 0 prefix, cap at 10 digits. */
export function sanitizeIndianPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** "" when empty, error message when invalid, null when valid. */
export function validateIndianPhone(digits: string, required = false): string | null {
  if (!digits) return required ? "Phone number is required" : null;
  if (digits.length < 10) return "Enter all 10 digits";
  if (!INDIAN_MOBILE_REGEX.test(digits)) return "Mobile number must start with 6, 7, 8 or 9";
  return null;
}

/** Value sent to the API: "+919876543210" (or "" when empty). */
export const toE164India = (digits: string) => (digits ? `+91${digits}` : "");

interface PhoneInputProps {
  /** The 10 national digits only (no +91). */
  value: string;
  onChange: (digits: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export default function PhoneInput({ value, onChange, required, disabled, id }: PhoneInputProps) {
  const [touched, setTouched] = React.useState(false);
  const error = touched ? validateIndianPhone(value, required) : null;

  return (
    <div>
      <div
        className={`flex items-center bg-white border rounded-xl overflow-hidden focus-within:border-indigo-500 ${
          error ? "border-red-400" : "border-slate-200"
        }`}
      >
        <span className="select-none px-3 py-2.5 text-xs font-medium text-slate-600 bg-slate-50 border-r border-slate-200">
          +91
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={value}
          disabled={disabled}
          required={required}
          onChange={(e) => onChange(sanitizeIndianPhone(e.target.value))}
          onBlur={() => setTouched(true)}
          placeholder="98765 43210"
          aria-invalid={!!error}
          className="w-full bg-transparent p-2.5 text-xs text-slate-900 focus:outline-none"
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
