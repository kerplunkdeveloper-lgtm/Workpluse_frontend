"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
  Check,
} from "lucide-react";

export interface DatePickerProps {
  value?: string; // Format: "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  min?: string; // Format: "YYYY-MM-DD"
  max?: string; // Format: "YYYY-MM-DD"
  disabled?: boolean;
  required?: boolean;
  className?: string;
  align?: "left" | "right";
  id?: string;
  name?: string;
  ariaLabel?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Timezone-safe local parsing & formatting helpers
function parseYMD(str?: string): Date | null {
  if (!str) return null;
  const clean = str.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function formatYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date...",
  min,
  max,
  disabled = false,
  required = false,
  className = "",
  align = "left",
  id,
  name,
  ariaLabel = "Select Date",
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => parseYMD(value), [value]);
  const minDate = useMemo(() => parseYMD(min), [min]);
  const maxDate = useMemo(() => parseYMD(max), [max]);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  // View state: Year and Month shown on the calendar
  const [viewYear, setViewYear] = useState<number>(() => {
    return selectedDate ? selectedDate.getFullYear() : today.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return selectedDate ? selectedDate.getMonth() : today.getMonth();
  });

  // Track mode: 'calendar' | 'month-picker' | 'year-picker'
  const [pickerMode, setPickerMode] = useState<"calendar" | "month" | "year">("calendar");

  // Keep view in sync when selectedDate changes from outside
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setPickerMode("calendar");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
        setPickerMode("calendar");
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handleSelectDay = (date: Date) => {
    if (isDateDisabled(date) || disabled) return;
    onChange(formatYMD(date));
    setIsOpen(false);
    setPickerMode("calendar");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange("");
  };

  const handleSelectToday = () => {
    if (isDateDisabled(today) || disabled) return;
    onChange(formatYMD(today));
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
    setPickerMode("calendar");
  };

  const handleSelectTomorrow = () => {
    const tmr = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    if (isDateDisabled(tmr) || disabled) return;
    onChange(formatYMD(tmr));
    setViewYear(tmr.getFullYear());
    setViewMonth(tmr.getMonth());
    setIsOpen(false);
    setPickerMode("calendar");
  };

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);

    const startingDayIndex = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }> = [];

    // Days from previous month
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(viewYear, viewMonth - 1, dayNum);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: formatYMD(d) === formatYMD(today),
        isSelected: selectedDate ? formatYMD(d) === formatYMD(selectedDate) : false,
        isDisabled: isDateDisabled(d),
      });
    }

    // Days in current month
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: formatYMD(d) === formatYMD(today),
        isSelected: selectedDate ? formatYMD(d) === formatYMD(selectedDate) : false,
        isDisabled: isDateDisabled(d),
      });
    }

    // Fill remaining cells for standard 35 or 42 grid
    const targetLength = days.length <= 35 ? 35 : 42;
    const remaining = targetLength - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: formatYMD(d) === formatYMD(today),
        isSelected: selectedDate ? formatYMD(d) === formatYMD(selectedDate) : false,
        isDisabled: isDateDisabled(d),
      });
    }

    return days;
  }, [viewYear, viewMonth, today, selectedDate, minDate, maxDate]);

  // Year options for fast jump
  const yearOptions = useMemo(() => {
    const currentYear = today.getFullYear();
    const list: number[] = [];
    for (let y = currentYear - 10; y <= currentYear + 15; y++) {
      list.push(y);
    }
    return list;
  }, [today]);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Hidden input for HTML form validation & accessibility */}
      {required && (
        <input
          type="text"
          value={value || ""}
          required={required}
          name={name}
          id={id}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setPickerMode("calendar");
          }
        }}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`group w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm transition-all duration-150 outline-none select-none ${
          isOpen
            ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-white shadow-sm"
            : "border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50/50 shadow-2xs"
        } ${
          disabled
            ? "bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200"
            : "cursor-pointer text-slate-900"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
              selectedDate
                ? "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                : "bg-slate-100 text-slate-500 group-hover:text-slate-700"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
          </div>

          <span className={`truncate font-medium ${selectedDate ? "text-slate-900" : "text-slate-400"}`}>
            {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedDate && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleClear(e as any);
              }}
              title="Clear date"
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-indigo-500" : "group-hover:text-slate-600"
            }`}
          />
        </div>
      </button>

      {/* Premium Calendar Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Calendar date picker"
          className={`absolute top-full mt-2 z-50 w-[300px] sm:w-[320px] p-4 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl shadow-2xl shadow-slate-900/15 animate-in fade-in zoom-in-95 duration-150 select-none ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            {pickerMode === "calendar" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPickerMode("month")}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-900 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-lg transition flex items-center gap-1"
                  >
                    {MONTH_NAMES[viewMonth]}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPickerMode("year")}
                    className="px-2 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/80 rounded-lg transition flex items-center gap-1"
                  >
                    {viewYear}
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    title="Previous month"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    title="Next month"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-slate-900 px-1">
                  {pickerMode === "month" ? "Choose Month" : "Choose Year"}
                </span>
                <button
                  type="button"
                  onClick={() => setPickerMode("calendar")}
                  className="px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                >
                  Back to Days
                </button>
              </div>
            )}
          </div>

          {/* Body: Month Picker Mode */}
          {pickerMode === "month" && (
            <div className="grid grid-cols-3 gap-2 py-2">
              {MONTH_NAMES.map((name, idx) => {
                const isSelectedMonth = viewMonth === idx;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx);
                      setPickerMode("calendar");
                    }}
                    className={`py-2 px-2 text-xs font-semibold rounded-xl transition ${
                      isSelectedMonth
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                        : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Body: Year Picker Mode */}
          {pickerMode === "year" && (
            <div className="grid grid-cols-4 gap-2 py-2 max-h-56 overflow-y-auto pr-1">
              {yearOptions.map((y) => {
                const isSelectedYear = viewYear === y;
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setViewYear(y);
                      setPickerMode("calendar");
                    }}
                    className={`py-2 px-1 text-xs font-semibold rounded-xl transition ${
                      isSelectedYear
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                        : "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          )}

          {/* Body: Calendar Days Grid */}
          {pickerMode === "calendar" && (
            <>
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {WEEKDAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="text-xs font-bold uppercase tracking-wider text-slate-400 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, idx) => {
                  const dayNum = item.date.getDate();

                  let cellClasses =
                    "relative h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-xl transition-all duration-100 ";

                  if (item.isDisabled) {
                    cellClasses += "text-slate-300 opacity-40 cursor-not-allowed line-through ";
                  } else if (item.isSelected) {
                    cellClasses +=
                      "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30 scale-105 z-10 ";
                  } else if (item.isToday) {
                    cellClasses +=
                      "font-bold text-indigo-600 bg-indigo-50/70 border border-indigo-200 hover:bg-indigo-100 cursor-pointer ";
                  } else if (!item.isCurrentMonth) {
                    cellClasses +=
                      "text-slate-300 hover:text-slate-600 hover:bg-slate-100/70 cursor-pointer ";
                  } else {
                    cellClasses +=
                      "text-slate-800 font-medium hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer active:scale-95 ";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={item.isDisabled}
                      onClick={() => handleSelectDay(item.date)}
                      className={cellClasses}
                    >
                      <span>{dayNum}</span>
                      {item.isToday && !item.isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Quick Presets Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectToday}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectTomorrow}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    Tomorrow
                  </button>
                </div>

                {selectedDate && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2 py-1 text-xs font-medium text-slate-400 hover:text-rose-600 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
