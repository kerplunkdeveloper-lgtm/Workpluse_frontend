"use client";

import { useState } from "react";
import DatePicker from "@/components/ui/DatePicker";

interface Props { dateOfBirth?: string | null; dateOfJoining?: string | null; }
const toYMD = (value?: string | null) => String(value || "").slice(0, 10);
const localToday = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; };

/** Employee self-service date fields. Both dates can be corrected by the employee. */
export default function ProfileDateFields({ dateOfBirth, dateOfJoining }: Props) {
  const [birth, setBirth] = useState(toYMD(dateOfBirth));
  const [joining, setJoining] = useState(toYMD(dateOfJoining));
  const label = (text: string) => <span className="mb-1 flex items-center justify-between text-slate-500"><span>{text}<span className="text-rose-500"> *</span></span></span>;
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div>{label("Date of Birth")}<DatePicker name="dateOfBirth" value={birth} onChange={setBirth} required max={localToday()} placeholder="Select date of birth" ariaLabel="Date of birth" /></div>
    <div>{label("Date of Joining")}<DatePicker name="dateOfJoining" value={joining} onChange={setJoining} required min={birth || undefined} align="right" placeholder="Select joining date" ariaLabel="Date of joining" /></div>
  </div>;
}
