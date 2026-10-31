"use client";

import React from "react";
import { Briefcase, CreditCard, FileBadge2, HeartPulse, Info, Mail, User } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import PhoneInput from "@/components/ui/PhoneInput";
import {
  EMPLOYMENT_TYPES,
  todayYmd,
  type EmployeeProfileValues,
  type ProfileErrors,
} from "@/lib/employeeProfile";
import Select from "@/components/ui/Select";
import BankSelector from "@/components/profile/BankSelector";

interface Option {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
}

interface EmployeeProfileFieldsProps {
  values: EmployeeProfileValues;
  errors: ProfileErrors;
  onChange: (key: keyof EmployeeProfileValues, value: string) => void;
  branches: Option[];
  departments: Option[];
  shifts: Option[];
  /** Existing values shown as suggestions; users may still type a custom designation. */
  designations?: string[];
  /** Hide the login email (not editable after creation). */
  hideEmail?: boolean;
  /** Hide annual CTC (salary is maintained in payroll after creation). */
  hideCtc?: boolean;
  /** Replaces the plain department select, e.g. with one that can create a department inline. */
  renderDepartment?: () => React.ReactNode;
}

const inputClass = (invalid: boolean) =>
  `w-full bg-white border rounded-xl p-2.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs transition focus:outline-none focus:ring-4 ${
    invalid
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-indigo-100"
  }`;

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-field={id}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1 text-[13px] font-medium text-slate-700">
        {label}
        {required ? (
          <span className="text-rose-500" aria-hidden="true">*</span>
        ) : (
          <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-500">Optional</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[11px] font-medium text-rose-600">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
      <header className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
          {icon}
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-semibold leading-tight text-slate-900">{title}</h4>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      </header>
      <div className="space-y-3.5">{children}</div>
    </section>
  );
}

/**
 * The employee profile inputs shared by "Add employee" (manual and email invite) and "Edit profile".
 * Every field is required except personal email, PAN, UAN and ESI; the owner of the form runs validateProfile().
 */
export default function EmployeeProfileFields({
  values,
  errors,
  onChange,
  branches,
  departments,
  shifts,
  designations = [],
  hideEmail,
  hideCtc,
  renderDepartment,
}: EmployeeProfileFieldsProps) {
  const text = (
    key: keyof EmployeeProfileValues,
    label: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
    optional = false,
    hint?: string,
  ) => (
    <Field id={`emp-${key}`} label={label} required={!optional} error={errors[key]} hint={hint}>
      <input
        id={`emp-${key}`}
        value={values[key]}
        onChange={(e) => onChange(key, e.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `emp-${key}-error` : undefined}
        className={inputClass(!!errors[key])}
        {...extra}
      />
    </Field>
  );

  // Indian mobile numbers: digits only, 10 of them, +91 shown as a fixed prefix.
  const phone = (key: "phone" | "emergencyContactPhone", label: string) => (
    <Field id={`emp-${key}`} label={label} required error={errors[key]}>
      <PhoneInput id={`emp-${key}`} value={values[key]} onChange={(digits) => onChange(key, digits)} required error={errors[key]} describedBy={errors[key] ? `emp-${key}-error` : undefined} />
    </Field>
  );

  const select = (key: keyof EmployeeProfileValues, label: string, placeholder: string, options: { value: string; label: string }[]) => (
    <Field id={`emp-${key}`} label={label} required error={errors[key]}>
      <Select
        id={`emp-${key}`}
        value={values[key]}
        onChange={(e) => onChange(key, e.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `emp-${key}-error` : undefined}
        className={inputClass(!!errors[key])}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );

  return (
    <div className="space-y-4">
      <Section icon={<User className="h-4 w-4" />} title="Personal details" description="Basic identity and how to reach this person.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {text("firstName", "First name")}
          {text("lastName", "Last name")}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {select("gender", "Gender", "Select...", [
            { value: "MALE", label: "Male" },
            { value: "FEMALE", label: "Female" },
          ])}
          <Field id="emp-dateOfBirth" label="Date of birth" required error={errors.dateOfBirth}>
            <DatePicker
              id="emp-dateOfBirth"
              value={values.dateOfBirth}
              onChange={(v) => onChange("dateOfBirth", v)}
              placeholder="Select date of birth"
              ariaLabel="Date of birth"
              max={todayYmd()}
            />
          </Field>
        </div>
        {phone("phone", "Phone")}
        {text("address", "Address", { placeholder: "House / street, city, state, PIN" })}
      </Section>

      <Section
        icon={<Mail className="h-4 w-4" />}
        title="Email & login"
        description="Either address can be used to sign in, with the same password."
      >
        <div className={hideEmail ? "" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
          {!hideEmail &&
            text("email", "Office email", { type: "email", placeholder: "name@company.com", autoComplete: "off" }, false, "Primary login address.")}
          {text(
            "personalEmail",
            "Personal email",
            { type: "email", placeholder: "name@gmail.com", autoComplete: "off" },
            true,
            "Alternate login. Must not be used by another employee.",
          )}
        </div>
        {hideEmail && (
          <p className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-snug text-slate-600 ring-1 ring-slate-200">
            <Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
            The office email is the account login and is set when the employee is added. Adding a personal email lets them sign in with that address too.
          </p>
        )}
      </Section>

      <Section icon={<HeartPulse className="h-4 w-4" />} title="Emergency contact" description="Who to call if something goes wrong.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {text("emergencyContactName", "Contact name")}
          {phone("emergencyContactPhone", "Contact phone")}
        </div>
      </Section>

      <Section icon={<Briefcase className="h-4 w-4" />} title="Employment" description="Role, schedule and where this person sits.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="emp-designation" label="Designation" required error={errors.designation}>
            <input
              id="emp-designation"
              list="employee-designation-options"
              value={values.designation}
              onChange={(e) => onChange("designation", e.target.value)}
              placeholder="Select or enter designation"
              maxLength={120}
              aria-invalid={!!errors.designation}
              aria-describedby={errors.designation ? "emp-designation-error" : undefined}
              className={inputClass(!!errors.designation)}
            />
            <datalist id="employee-designation-options">
              {designations.map((designation) => <option key={designation} value={designation} />)}
            </datalist>
          </Field>
          {select("employmentType", "Employment type", "Select...", EMPLOYMENT_TYPES)}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="emp-dateOfJoining" label="Date of joining" required error={errors.dateOfJoining}>
            <DatePicker
              id="emp-dateOfJoining"
              value={values.dateOfJoining}
              onChange={(v) => onChange("dateOfJoining", v)}
              placeholder="Select joining date"
              ariaLabel="Date of joining"
            />
          </Field>
          {!hideCtc && text("ctc", "Annual CTC (INR)", { type: "number", min: 1, placeholder: "e.g. 900000" })}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {select(
            "branchId",
            "Branch",
            "Select branch...",
            branches.map((b) => ({ value: b.id, label: b.name })),
          )}
          {renderDepartment ? (
            <Field id="emp-departmentId" label="Department" required error={errors.departmentId}>
              {renderDepartment()}
            </Field>
          ) : (
            select(
              "departmentId",
              "Department",
              "Select department...",
              departments.map((d) => ({ value: d.id, label: d.name })),
            )
          )}
        </div>
        {select(
          "shiftId",
          "Shift schedule",
          "Select shift...",
          shifts.map((s) => ({ value: s.id, label: s.startTime ? `${s.name} (${s.startTime} - ${s.endTime})` : s.name })),
        )}
      </Section>

      <Section icon={<CreditCard className="h-4 w-4" />} title="Bank details" description="Used for salary payouts and bank advice.">
        <Field id="emp-bankName" label="Bank name" required error={errors.bankName}>
          <BankSelector id="emp-bankName" value={values.bankName} onChange={(value) => onChange("bankName", value)} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {text("bankAccountNumber", "Account number", { inputMode: "numeric", placeholder: "6 to 20 digits" })}
          {text("bankIfsc", "IFSC code", { placeholder: "HDFC0001234", autoCapitalize: "characters" })}
        </div>
      </Section>

      <Section icon={<FileBadge2 className="h-4 w-4" />} title="Statutory IDs" description="Needed for PF, ESI and tax filings. Add them when available.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {text("panNumber", "PAN", { placeholder: "ABCDE1234F", autoCapitalize: "characters" }, true)}
          {text("uanNumber", "PF UAN", { inputMode: "numeric", placeholder: "12 digits" }, true)}
          {text("esiNumber", "ESI number", { inputMode: "numeric", placeholder: "17 digits" }, true)}
        </div>
      </Section>
    </div>
  );
}
