"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BellRing, CheckCircle2, Clock3, Megaphone, Wallet } from "lucide-react";

const EVENTS = [
  { kind: "reminder", label: "Shift reminder", message: "Riya’s shift starts in 15 min", icon: BellRing, tone: "text-amber-300 bg-amber-300/10" },
  { kind: "announcement", label: "Team announcement", message: "Town hall moved to 4:30 PM", icon: Megaphone, tone: "text-sky-300 bg-sky-300/10" },
  { kind: "payroll", label: "Payroll ready", message: "March payroll is ready to review", icon: Wallet, tone: "text-emerald-300 bg-emerald-300/10" },
] as const;

export default function WorkflowLivePreview() {
  const reduce = useReducedMotion();
  // Keep the server and first browser render identical. Reading the current
  // time during render causes a hydration mismatch on the landing page.
  const [now, setNow] = useState<Date | null>(null);
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => {
    setNow(new Date());
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const events = window.setInterval(() => setEventIndex((value) => (value + 1) % EVENTS.length), 3600);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(events);
    };
  }, []);

  const event = EVENTS[eventIndex];
  const EventIcon = event.icon;
  const time = now
    ? now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";

  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950 p-3 text-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.75)] ring-1 ring-indigo-300/20 sm:p-4">
      <div className="grid gap-3 sm:grid-cols-[0.8fr_1.5fr_1fr] sm:items-center">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-400/15 text-indigo-200">
            <Clock3 className="h-4 w-4" />
            {!reduce && <span className="absolute inset-0 animate-ping rounded-lg bg-indigo-400/15" />}
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-200/70">Live workspace</p>
            <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-white">{time}</p>
          </div>
        </div>

        <div className="min-w-0 rounded-xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={event.kind}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -8 }}
              transition={{ duration: reduce ? 0 : 0.28 }}
              className="flex min-w-0 items-center gap-2.5"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${event.tone}`}><EventIcon className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{event.label}</p>
                <p className="truncate text-xs font-semibold text-white">{event.message}</p>
              </div>
              <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-emerald-300" />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="rounded-xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
            <span>Payroll workflow</span><span className="text-emerald-300">86%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div initial={{ width: reduce ? "86%" : "0%" }} animate={{ width: "86%" }} transition={{ duration: reduce ? 0 : 1.4, delay: 0.2 }} className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-300" />
          </div>
          <p className="mt-1.5 text-[10px] text-white/50">Attendance → approvals → payslips</p>
        </div>
      </div>
    </div>
  );
}
