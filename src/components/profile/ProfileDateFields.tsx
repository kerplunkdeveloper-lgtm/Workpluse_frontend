"use client";

import { useState } from "react";
import DatePicker from "@/components/ui/DatePicker";

interface Props {
  dateOfBirth?: string | null;
  dateOfJoining?: string | null;
}

const toYMD = (value?: string | null) => String(value || "").slice(0, 10);

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Date of birth / date of joining for the self-service profile form.
 * Renders named inputs (via DatePicker `required`) so the surrounding <form>'s FormData picks them up.
 * A date already on record is shown read-only and not submitted; only HR can change it.
 */
export default function ProfileDateFields({ dateOfBirth, dateOfJoining }: Props) {
  const savedBirth = toYMD(dateOfBirth);
  const savedJoining = toYMD(dateOfJoining);
  const [birth, setBirth] = useState(savedBirth);
  const [joining, setJoining] = useState(savedJoining);

  const label = (text: string, locked: boolean) => (
    <span className="mb-1 flex items-center justify-between text-slate-500">
      <span>
        {text}
        {!locked && <span className="text-rose-500"> *</span>}
      </span>
      {locked && (
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          Locked · contact HR to change
        </span>
      )}
    </span>
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        {label("Date of Birth", !!savedBirth)}
        <DatePicker
          name="dateOfBirth"
          value={birth}
          onChange={setBirth}
          disabled={!!savedBirth}
          required={!savedBirth}
          max={localToday()}
          placeholder="Select date of birth"
          ariaLabel="Date of birth"
        />
      </div>
      <div>
        {label("Date of Joining", !!savedJoining)}
        <DatePicker
          name="dateOfJoining"
          value={joining}
          onChange={setJoining}
          disabled={!!savedJoining}
          required={!savedJoining}
          min={birth || undefined}
          align="right"
          placeholder="Select joining date"
          ariaLabel="Date of joining"
        />
      </div>
    </div>
  );
}
