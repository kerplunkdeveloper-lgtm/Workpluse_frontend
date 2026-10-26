"use client";

import React from "react";
import { CalendarRange } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import { localDateKey } from "./attendanceUtils";

export const ATTENDANCE_RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "single", label: "Pick a day" },
  { value: "7d", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Custom range" },
] as const;

export type AttendanceRangeValue = (typeof ATTENDANCE_RANGES)[number]["value"];

interface AttendanceDateFilterProps {
  range: AttendanceRangeValue;
  singleDate: string;
  customFrom: string;
  customTo: string;
  onChangeRange: (range: AttendanceRangeValue) => void;
  onChangeSingleDate: (date: string) => void;
  onChangeCustomRange: (from: string, to: string) => void;
}

/** Date range chooser for the attendance log: a preset menu, plus date pickers for a single day or a custom range. */
export default function AttendanceDateFilter({
  range,
  singleDate,
  customFrom,
  customTo,
  onChangeRange,
  onChangeSingleDate,
  onChangeCustomRange,
}: AttendanceDateFilterProps) {
  const today = localDateKey(new Date());

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative flex h-9 items-center gap-2 rounded-lg bg-white pl-3 pr-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-indigo-500">
        <CalendarRange aria-hidden="true" className="h-4 w-4 text-slate-400" />
        <span className="sr-only">Date range</span>
        <select
          value={range}
          onChange={(e) => onChangeRange(e.target.value as AttendanceRangeValue)}
          className="h-full cursor-pointer bg-transparent pr-1 text-xs font-semibold text-slate-700 focus:outline-none"
        >
          {ATTENDANCE_RANGES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {range === "single" && (
        <div className="w-44">
          <DatePicker value={singleDate} onChange={onChangeSingleDate} max={today} placeholder="Select a day" ariaLabel="Attendance day" />
        </div>
      )}

      {range === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <DatePicker
              value={customFrom}
              onChange={(from) => onChangeCustomRange(from, customTo && customTo < from ? from : customTo)}
              max={customTo || today}
              placeholder="From"
              ariaLabel="From date"
            />
          </div>
          <span aria-hidden="true" className="text-xs text-slate-400">
            to
          </span>
          <div className="w-40">
            <DatePicker
              value={customTo}
              onChange={(to) => onChangeCustomRange(customFrom && customFrom > to ? to : customFrom, to)}
              min={customFrom || undefined}
              max={today}
              placeholder="To"
              ariaLabel="To date"
            />
          </div>
        </div>
      )}
    </div>
  );
}
