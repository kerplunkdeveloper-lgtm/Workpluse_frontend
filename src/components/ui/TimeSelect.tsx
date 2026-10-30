"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Clock, ChevronUp, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type TimeSelectProps = {
  value: string;          // "HH:mm" in 24h
  onChange: (value: string) => void;
  defaultPeriod?: "AM" | "PM";
  ariaLabel?: string;
  disabled?: boolean;
};

/* ─── helpers ─────────────────────────────────────────────────────────── */
const HOURS_12 = Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i));
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const PERIODS: ("AM" | "PM")[] = ["AM", "PM"];
const pad = (n: number) => n.toString().padStart(2, "0");

/** "14:30" → { hour12: 2, minute: 30, period: "PM" } */
function parse24(val: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  const [hh, mm] = (val || "").split(":").map(Number);
  const h = isNaN(hh) ? 9 : hh;
  const m = isNaN(mm) ? 0 : mm;
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hour12, minute: m, period };
}

/** Compose back to "HH:mm" (24h) */
function to24(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12;
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

/** Format for display: "09:01 AM" */
function formatDisplay(val: string): string {
  if (!val) return "--:-- --";
  const { hour12, minute, period } = parse24(val);
  return `${pad(hour12)}:${pad(minute)} ${period}`;
}

/* ─── Scroll‑column configuration ─────────────────────────────────────── */
const ITEM_H = 32;     // px per row (compact & crisp)
const VISIBLE = 3;     // 3 visible items [prev, selected, next] - standard mobile/wheel UI

function ScrollColumn<T extends number | string>({
  items,
  selected,
  onSelect,
  renderItem,
  label,
}: {
  items: T[];
  selected: T;
  onSelect: (v: T) => void;
  renderItem: (v: T) => string;
  label: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const suppressScroll = useRef(false);

  // Scroll to selected item on mount / when selected changes
  useEffect(() => {
    const idx = items.indexOf(selected);
    if (idx >= 0 && listRef.current) {
      suppressScroll.current = true;
      listRef.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      const t = setTimeout(() => { suppressScroll.current = false; }, 280);
      return () => clearTimeout(t);
    }
  }, [selected, items]);

  // Snap to nearest item on scroll end
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = useCallback(() => {
    if (suppressScroll.current) return;
    if (snapTimer.current) clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      if (!listRef.current) return;
      const idx = Math.round(listRef.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      listRef.current.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      onSelect(items[clamped]);
    }, 70);
  }, [items, onSelect]);

  const nudge = (dir: 1 | -1) => {
    const idx = items.indexOf(selected);
    const next = Math.max(0, Math.min(idx + dir, items.length - 1));
    onSelect(items[next]);
  };

  return (
    <div className="flex flex-col items-center" role="listbox" aria-label={label}>
      {/* Up chevron */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => nudge(-1)}
        className="flex h-5 w-full items-center justify-center text-slate-400 transition hover:text-indigo-600 active:scale-95"
        aria-label={`Previous ${label}`}
      >
        <ChevronUp className="h-3.5 w-3.5 stroke-[2]" />
      </button>

      {/* Scroll area */}
      <div className="relative w-full">
        {/* Highlight band for the center selected row */}
        <div
          className="pointer-events-none absolute left-0 right-0 z-10 rounded-lg bg-indigo-50/80 ring-1 ring-indigo-500/25"
          style={{
            top: `${Math.floor(VISIBLE / 2) * ITEM_H}px`,
            height: `${ITEM_H}px`,
          }}
        />
        {/* Top & bottom subtle fade masks */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-6 bg-gradient-to-b from-white to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-6 bg-gradient-to-t from-white to-transparent" />

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="no-scrollbar overflow-y-auto overscroll-contain"
          style={{
            height: `${VISIBLE * ITEM_H}px`,
            scrollSnapType: "y mandatory",
          }}
        >
          {/* Top spacer so first item can sit in the center */}
          <div style={{ height: `${Math.floor(VISIBLE / 2) * ITEM_H}px` }} />
          {items.map((item) => {
            const active = item === selected;
            return (
              <button
                key={String(item)}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(item)}
                className={`flex w-full items-center justify-center text-xs font-semibold transition-all duration-150
                  ${active
                    ? "scale-105 font-bold text-indigo-600"
                    : "text-slate-400 hover:text-slate-600"
                  }`}
                style={{
                  height: `${ITEM_H}px`,
                  scrollSnapAlign: "start",
                }}
              >
                {renderItem(item)}
              </button>
            );
          })}
          {/* Bottom spacer */}
          <div style={{ height: `${Math.floor(VISIBLE / 2) * ITEM_H}px` }} />
        </div>
      </div>

      {/* Down chevron */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => nudge(1)}
        className="flex h-5 w-full items-center justify-center text-slate-400 transition hover:text-indigo-600 active:scale-95"
        aria-label={`Next ${label}`}
      >
        <ChevronDown className="h-3.5 w-3.5 stroke-[2]" />
      </button>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function TimeSelect({
  value,
  onChange,
  defaultPeriod,
  ariaLabel = "Time",
  disabled = false,
}: TimeSelectProps) {
  const parsed = parse24(value);
  const currentHour = parsed.hour12;
  const currentMinute = parsed.minute;
  const currentPeriod = value ? parsed.period : (defaultPeriod || parsed.period);

  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = useCallback(() => {
    const trigger = wrapRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const dropdownWidth = Math.min(220, window.innerWidth - 16);
    const left = Math.min(
      Math.max(8, rect.left),
      Math.max(8, window.innerWidth - dropdownWidth - 8),
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const shouldOpenUpward = spaceBelow < 240 && rect.top > spaceBelow;

    setOpenUpward(shouldOpenUpward);
    setDropdownPosition(
      shouldOpenUpward
        ? { left, bottom: Math.max(8, window.innerHeight - rect.top + 6) }
        : { left, top: Math.min(rect.bottom + 6, window.innerHeight - 8) },
    );
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Keep the fixed dropdown aligned when the page or a scrollable panel moves.
  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition]);

  // Close on Escape or Enter
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleHour = (h: number) => {
    onChange(to24(h, currentMinute, currentPeriod));
  };
  const handleMinute = (m: number) => {
    onChange(to24(currentHour, m, currentPeriod));
  };
  const handlePeriod = (p: "AM" | "PM") => {
    onChange(to24(currentHour, currentMinute, p));
  };

  // Toggle open and auto-detect upward/downward collision
  const handleToggle = () => {
    if (disabled) return;
    if (!open && wrapRef.current) {
      updateDropdownPosition();
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={wrapRef} className="relative" aria-label={ariaLabel}>
      {/* ── Trigger button ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`group flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-left text-xs transition-all duration-200
          ${open
            ? "border-indigo-500 ring-2 ring-indigo-100 shadow-sm"
            : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
          }
          ${disabled ? "cursor-not-allowed bg-slate-50 text-slate-400" : "text-slate-900"}`}
      >
        <span className="font-medium tracking-wide">{formatDisplay(value)}</span>
        <Clock
          className={`h-3.5 w-3.5 transition-colors duration-200 ${
            open ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
          }`}
        />
      </button>

      {/* ── Dropdown ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed z-[60] w-[220px] max-w-[calc(100vw-1rem)] rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl shadow-slate-900/10 backdrop-blur-xs
              ${openUpward 
                ? "origin-bottom"
                : "origin-top"
              }`}
            style={dropdownPosition ?? undefined}
          >
            {/* Header: Label, Live Value, and Primary Done button */}
            <div className="mb-2 flex items-center justify-between gap-1 border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Time
                </span>
                <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-bold text-indigo-600">
                  {pad(currentHour)}:{pad(currentMinute)} {currentPeriod}
                </span>
              </div>
              {/* Header "Done" action button — always visible without scrolling */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs transition hover:bg-indigo-500 active:scale-95"
                title="Done selecting time"
              >
                <Check className="h-3 w-3 stroke-[2.5]" />
                <span>Done</span>
              </button>
            </div>

            {/* Columns: Hour | Minute | Period */}
            <div className="grid grid-cols-3 gap-1">
              {/* Hours */}
              <ScrollColumn
                items={HOURS_12}
                selected={currentHour}
                onSelect={handleHour}
                renderItem={(h) => pad(h)}
                label="Hour"
              />

              {/* Minutes */}
              <ScrollColumn
                items={MINUTES}
                selected={currentMinute}
                onSelect={handleMinute}
                renderItem={(m) => pad(m)}
                label="Minute"
              />

              {/* AM / PM Segmented Control */}
              <div className="flex flex-col items-center justify-center gap-1 py-1">
                {PERIODS.map((p) => {
                  const active = p === currentPeriod;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePeriod(p)}
                      className={`flex h-10 w-full items-center justify-center rounded-lg text-xs font-bold transition-all duration-150 active:scale-95
                        ${active
                          ? "bg-indigo-600 text-white shadow-xs shadow-indigo-600/30"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer quick-action Done button */}
            <div className="mt-2 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-600 active:scale-[0.99]"
              >
                <Check className="h-3.5 w-3.5 text-indigo-500" />
                <span>Done</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
