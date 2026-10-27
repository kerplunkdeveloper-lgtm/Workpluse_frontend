import React from "react";

interface FieldProps {
  /** The id of the input inside, so the label and the error text are tied to it. */
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}

/** A label, the control, an optional hint and an error line: the same shape for every form field. */
export default function Field({ id, label, required, hint, error, children }: FieldProps) {
  return (
    <div data-field={id}>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium text-slate-700">
        {label}
        {required ? " *" : <span className="font-normal text-slate-400"> (optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[11px] font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
