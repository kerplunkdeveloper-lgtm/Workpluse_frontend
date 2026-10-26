"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarOff, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { policyApi } from "@/lib/api";

const DAYS = [
  { value: 1, short: "Mon", full: "Monday" },
  { value: 2, short: "Tue", full: "Tuesday" },
  { value: 3, short: "Wed", full: "Wednesday" },
  { value: 4, short: "Thu", full: "Thursday" },
  { value: 5, short: "Fri", full: "Friday" },
  { value: 6, short: "Sat", full: "Saturday" },
  { value: 0, short: "Sun", full: "Sunday" },
];

const parse = (csv: string) =>
  new Set(
    String(csv ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean)
      .map(Number),
  );

interface WeeklyOffCardProps {
  /** The saved weekly off as CSV (0 = Sunday), "0" when the company has not set one. */
  saved: string;
  onSaved: (weeklyOffDays: string) => void;
}

/**
 * The company's weekly off. Tap a day to make it a working day or a day off; the default is Sunday off and
 * Monday to Saturday working. Saving applies it to every shift. Holidays and company leave that fall on a
 * working day are set separately, under Leaves.
 */
export default function WeeklyOffCard({ saved, onSaved }: WeeklyOffCardProps) {
  const [off, setOff] = useState<Set<number>>(() => parse(saved));
  const [saving, setSaving] = useState(false);

  useEffect(() => setOff(parse(saved)), [saved]);

  const toCsv = (set: Set<number>) => [...set].sort((a, b) => a - b).join(",");
  const dirty = toCsv(off) !== toCsv(parse(saved));
  const tooMany = off.size > 3;
  const workingCount = 7 - off.size;

  const toggle = (day: number) =>
    setOff((current) => {
      const next = new Set(current);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  const summary = off.size === 0 ? "No weekly off. Every day is a working day." : `${DAYS.filter((d) => off.has(d.value)).map((d) => d.full).join(" and ")} ${off.size === 1 ? "is" : "are"} the weekly off.`;

  const save = async () => {
    if (tooMany) {
      toast.error("Choose at most 3 weekly off days.");
      return;
    }
    setSaving(true);
    try {
      const res = await policyApi.update({ weeklyOffDays: toCsv(off) });
      if (res?.success === false) throw new Error(res?.message || "Save failed");
      const count = res?.data?.shiftsUpdated ?? res?.policy?.shiftsUpdated;
      onSaved(toCsv(off));
      toast.success("Weekly off saved", {
        description: typeof count === "number" ? `Applied to ${count} ${count === 1 ? "shift" : "shifts"}. Punching is closed on these days unless HR or an admin approves work.` : "Punching is closed on these days unless HR or an admin approves work.",
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not save the weekly off.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs" aria-labelledby="weekly-off-heading">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <CalendarOff className="h-5 w-5" />
        </span>
        <div>
          <h2 id="weekly-off-heading" className="text-sm font-semibold text-slate-900">
            Weekly off
          </h2>
          <p className="text-xs text-slate-500">Pick the days your company is closed every week. Everyone else works on the other days.</p>
        </div>
      </div>

      <div role="group" aria-label="Weekly off days" className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {DAYS.map((day) => {
          const isOff = off.has(day.value);
          return (
            <button
              key={day.value}
              type="button"
              aria-pressed={isOff}
              aria-label={`${day.full}: ${isOff ? "weekly off" : "working day"}`}
              onClick={() => toggle(day.value)}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
                isOff ? "border-slate-800 bg-slate-900 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50"
              }`}
            >
              <span>{day.short}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${isOff ? "text-slate-300" : "text-emerald-600"}`}>{isOff ? "Off" : "Work"}</span>
            </button>
          );
        })}
      </div>

      <p className={`text-xs font-medium ${tooMany ? "text-rose-600" : "text-slate-600"}`} role={tooMany ? "alert" : "status"}>
        {tooMany ? "Choose at most 3 weekly off days." : summary}
        {!tooMany && <span className="text-slate-400"> {workingCount} working {workingCount === 1 ? "day" : "days"} a week.</span>}
      </p>

      <ul className="space-y-1.5 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-200/70">
        <li>
          <span className="font-semibold text-slate-800">On a weekly off,</span> punching is closed. An employee who has to work (a shoot, travel, client work) asks HR or an admin to approve it, and the hours count as overtime.
        </li>
        <li>
          <span className="font-semibold text-slate-800">Company leave or a holiday on a working day</span> (for example Diwali on a Monday) is set under{" "}
          <Link href="/leaves" className="font-semibold text-indigo-600 underline hover:text-indigo-800">
            Leaves, Company leave
          </Link>
          . It closes punching the same way.
        </li>
        <li>This changes the working days of every shift. You can still change a single shift on the Shifts page afterwards.</li>
      </ul>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || tooMany}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save weekly off"}
        </button>
      </div>
    </section>
  );
}
