"use client";

import React from "react";
import DatePicker from "@/components/ui/DatePicker";
import {
  EMPLOYMENT_TYPES,
  todayYmd,
  type EmployeeProfileValues,
  type ProfileErrors,
} from "@/lib/employeeProfile";

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
  /** Hide the login email (not editable after creation). */
  hideEmail?: boolean;
  /** Hide annual CTC (salary is maintained in payroll after creation). */
  hideCtc?: boolean;
  /** Replaces the plain department select, e.g. with one that can create a department inline. */
  renderDepartment?: () => React.ReactNode;
}

const inputClass = (invalid: boolean) =>
  `w-full bg-white border rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none ${
    invalid ? "border-rose-400 focus:border-rose-500" : "border-slate-200 focus:border-indigo-500"
  }`;

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-field={id}>
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700 mb-1">
        {label}
        {required ? " *" : <span className="font-normal text-slate-400"> (optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[11px] font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The employee profile inputs shared by "Add employee" (manual and email invite) and "Edit profile".
 * Every field is required except PAN, UAN and ESI; the owner of the form runs validateProfile().
 */
export default function EmployeeProfileFields({
  values,
  errors,
  onChange,
  branches,
  departments,
  shifts,
  hideEmail,
  hideCtc,
  renderDepartment,
}: EmployeeProfileFieldsProps) {
  const text = (
    key: keyof EmployeeProfileValues,
    label: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
    optional = false,
  ) => (
    <Field id={`emp-${key}`} label={label} required={!optional} error={errors[key]}>
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

  const select = (key: keyof EmployeeProfileValues, label: string, placeholder: string, options: { value: string; label: string }[]) => (
    <Field id={`emp-${key}`} label={label} required error={errors[key]}>
      <select
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
      </select>
    </Field>
  );

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Personal</h4>
        <div className="grid grid-cols-2 gap-3">
          {text("firstName", "First name")}
          {text("lastName", "Last name")}
        </div>
        <div className="grid grid-cols-2 gap-3">
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
        <div className={hideEmail ? "" : "grid grid-cols-2 gap-3"}>
          {!hideEmail && text("email", "Email", { type: "email", placeholder: "employee@company.com" })}
          {text("phone", "Phone", { type: "tel", placeholder: "+91 98765 43210" })}
        </div>
        {text("address", "Address", { placeholder: "House / street, city, state, PIN" })}
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Emergency contact</h4>
        <div className="grid grid-cols-2 gap-3">
          {text("emergencyContactName", "Contact name")}
          {text("emergencyContactPhone", "Contact phone", { type: "tel" })}
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Employment</h4>
        <div className="grid grid-cols-2 gap-3">
          {text("designation", "Designation", { placeholder: "e.g. Software Engineer", maxLength: 120 })}
          {select("employmentType", "Employment type", "Select...", EMPLOYMENT_TYPES)}
        </div>
        <div className="grid grid-cols-2 gap-3">
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
        <div className="grid grid-cols-2 gap-3">
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
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Bank details</h4>
        {text("bankName", "Bank name", { placeholder: "e.g. HDFC Bank" })}
        <div className="grid grid-cols-2 gap-3">
          {text("bankAccountNumber", "Account number", { inputMode: "numeric", placeholder: "6 to 20 digits" })}
          {text("bankIfsc", "IFSC code", { placeholder: "HDFC0001234", autoCapitalize: "characters" })}
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Statutory IDs</h4>
        <div className="grid grid-cols-3 gap-3">
          {text("panNumber", "PAN", { placeholder: "ABCDE1234F", autoCapitalize: "characters" }, true)}
          {text("uanNumber", "PF UAN", { inputMode: "numeric", placeholder: "12 digits" }, true)}
          {text("esiNumber", "ESI number", { inputMode: "numeric", placeholder: "17 digits" }, true)}
        </div>
      </section>
    </div>
  );
}
