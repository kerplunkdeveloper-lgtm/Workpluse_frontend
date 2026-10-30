"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import DatePicker from "./DatePicker";
import TimeSelect from "./TimeSelect";

export default function DateTimeSelect({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [date = "", time = ""] = value.split("T");
  const update = (nextDate = date, nextTime = time) => onChange(nextDate ? `${nextDate}T${nextTime || "00:00"}` : "");
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-2.5 shadow-inner shadow-slate-900/[0.02]">
    <div className="mb-2 flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-wider text-slate-500"><CalendarDays className="h-3.5 w-3.5 text-violet-600" />{label}</div>
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <DatePicker value={date} onChange={(next) => update(next, time)} placeholder="Choose date" ariaLabel={`${label} date`} className="!min-h-11 !rounded-xl !border-slate-200 !bg-white !px-3 !text-sm" />
      <div className="relative"><Clock3 className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-violet-600" /><div className="pl-8"><TimeSelect value={time} onChange={(next) => update(date, next)} ariaLabel={`${label} time`} /></div></div>
    </div>
  </div>;
}
