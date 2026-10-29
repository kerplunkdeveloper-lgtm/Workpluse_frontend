"use client";

import React from "react";

/** Indian mobile: exactly 10 digits, first digit 6-9. */
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export const COUNTRY_CODES = [
  { code: "+91", name: "India", iso: "IN", placeholder: "98765 43210" },
  { code: "+1", name: "United States / Canada", iso: "US", placeholder: "(555) 123-4567" },
  { code: "+44", name: "United Kingdom", iso: "GB", placeholder: "7700 900123" },
  { code: "+61", name: "Australia", iso: "AU", placeholder: "412 345 678" },
  { code: "+65", name: "Singapore", iso: "SG", placeholder: "8123 4567" },
  { code: "+971", name: "United Arab Emirates", iso: "AE", placeholder: "50 123 4567" },
  { code: "+81", name: "Japan", iso: "JP", placeholder: "90 1234 5678" },
  { code: "+49", name: "Germany", iso: "DE", placeholder: "151 23456789" },
  { code: "+33", name: "France", iso: "FR", placeholder: "6 12 34 56 78" },
  { code: "+27", name: "South Africa", iso: "ZA", placeholder: "71 123 4567" },
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number]["code"];

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

export const toE164 = (countryCode: string, digits: string) => (digits ? `${countryCode}${digits}` : "");

export function getCountryCodeFromPhone(raw: string): CountryCode {
  const normalized = String(raw || "").replace(/[^\d+]/g, "");
  return (COUNTRY_CODES.find((country) => normalized.startsWith(country.code))?.code || "+91") as CountryCode;
}

export function sanitizePhone(raw: string, countryCode: string = "+91"): string {
  let digits = String(raw || "").replace(/\D/g, "");
  const codeDigits = countryCode.replace(/\D/g, "");
  if (digits.length > 7 && codeDigits && digits.startsWith(codeDigits)) digits = digits.slice(codeDigits.length);
  return digits.slice(0, 15);
}

export function validatePhone(digits: string, countryCode: string, required = false): string | null {
  if (!digits) return required ? "Phone number is required" : null;
  if (countryCode === "+91") return validateIndianPhone(digits, required);
  if (digits.length < 7) return "Enter at least 7 digits";
  if (digits.length > 15) return "Enter a valid phone number";
  return null;
}

interface PhoneInputProps {
  /** The 10 national digits only (no +91). */
  value: string;
  onChange: (digits: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  /** An error from the owning form (for example after a failed submit). Takes the place of the on-blur check. */
  error?: string;
  /** Reaches the visible input, so a form can label it and point its error text at it. */
  describedBy?: string;
  className?: string;
  countryCode?: CountryCode;
  onCountryCodeChange?: (countryCode: CountryCode) => void;
}

export default function PhoneInput({ value, onChange, required, disabled, id, error: formError, describedBy, className = "", countryCode: controlledCountryCode, onCountryCodeChange }: PhoneInputProps) {
  const [internalCountryCode, setInternalCountryCode] = React.useState<CountryCode>("+91");
  const countryCode = controlledCountryCode || internalCountryCode;
  const country = COUNTRY_CODES.find((option) => option.code === countryCode) || COUNTRY_CODES[0];
  const [touched, setTouched] = React.useState(false);
  const error = formError || (touched ? validatePhone(value, countryCode, required) : null);
  // The owning form already prints its own message under the field, so only the border reacts to it.
  const showMessage = !formError && !!error;

  return (
    <div>
      <div
        className={`flex min-h-11 min-w-0 items-center overflow-hidden rounded-2xl border bg-white transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 ${
          error ? "border-red-400" : "border-slate-200"
        } ${className}`}
      >
        <label className="sr-only" htmlFor={id ? `${id}-country` : undefined}>Country code</label>
        <select
          id={id ? `${id}-country` : undefined}
          value={countryCode}
          disabled={disabled}
          aria-label="Country code"
          onChange={(event) => {
            const next = event.target.value as CountryCode;
            setInternalCountryCode(next);
            onCountryCodeChange?.(next);
            onChange(sanitizePhone(value, next));
          }}
          title={`${country.name} (${country.code})`}
          className="h-11 w-[116px] shrink-0 cursor-pointer appearance-none truncate bg-slate-50 px-3 text-[11px] font-semibold text-slate-700 outline-none transition hover:bg-indigo-50 focus:bg-indigo-50 sm:w-[146px]"
        >
          {COUNTRY_CODES.map((option) => (
            <option key={option.code} value={option.code}>{option.iso} {option.code} · {option.name}</option>
          ))}
        </select>
        <span aria-hidden="true" className="h-5 w-px bg-slate-200" />
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={value}
          disabled={disabled}
          required={required}
          onChange={(e) => onChange(sanitizePhone(e.target.value, countryCode))}
          onBlur={() => setTouched(true)}
          placeholder={country.placeholder}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          maxLength={14}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      {showMessage && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

/** For plain forms read with FormData: keeps its own digits and submits them under `name`. */
export function PhoneFormField({ name, defaultValue, required, disabled }: { name: string; defaultValue?: string | null; required?: boolean; disabled?: boolean }) {
  const [countryCode, setCountryCode] = React.useState<CountryCode>(() => getCountryCodeFromPhone(defaultValue || ""));
  const [digits, setDigits] = React.useState(() => sanitizePhone(defaultValue || "", getCountryCodeFromPhone(defaultValue || "")));
  return (
    <>
      <PhoneInput value={digits} onChange={setDigits} countryCode={countryCode} onCountryCodeChange={setCountryCode} required={required} disabled={disabled} />
      <input type="hidden" name={name} value={digits} />
      <input type="hidden" name={`${name}CountryCode`} value={countryCode} />
    </>
  );
}
