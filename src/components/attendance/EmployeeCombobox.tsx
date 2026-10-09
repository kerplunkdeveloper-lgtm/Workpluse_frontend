"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { employeesApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import type { Employee } from "@/types";

export interface EmployeeOption {
  id: string;
  name: string;
  meta: string;
}

const toOption = (e: Employee): EmployeeOption => ({
  id: e.id,
  name: `${e.firstName} ${e.lastName || ""}`.trim(),
  meta: [e.employeeCode, e.designation].filter(Boolean).join(" · "),
});

/**
 * Searches employees on the server as you type, so it stays fast with
 * thousands of people instead of loading everyone into a dropdown.
 */
export default function EmployeeCombobox({
  value,
  onChange,
  placeholder = "All employees",
  allowClear = true,
  className = "",
}: {
  value: EmployeeOption | null;
  onChange: (option: EmployeeOption | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      employeesApi
        .getAll({ search: query.trim() || undefined, limit: 8, page: 1 })
        .then((res) => {
          if (cancelled) return;
          setOptions(unwrapList<Employee>(res).map(toOption));
          setActive(0);
        })
        .catch(() => !cancelled && setOptions([]))
        .finally(() => !cancelled && setLoading(false));
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (option: EmployeeOption) => {
    onChange(option);
    setOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && options[active]) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          window.setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 rounded-lg bg-white px-3 text-left text-sm ring-1 ring-slate-200 transition hover:ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <span className={`min-w-0 flex-1 truncate ${value ? "font-medium text-slate-900" : "text-slate-500"}`}>{value?.name || placeholder}</span>
        {value && allowClear ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear employee"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onChange(null);
              }
            }}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-1.5 w-full min-w-[16rem] overflow-hidden rounded-xl bg-white shadow-[0_16px_40px_-12px_rgba(15,23,42,0.3)] ring-1 ring-slate-900/10">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search name or employee code"
              role="combobox"
              aria-controls={listId}
              aria-expanded
              aria-activedescendant={options[active] ? `${listId}-${options[active].id}` : undefined}
              className="h-10 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {loading && options.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-slate-500">Searching…</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-slate-500">No employees match “{query}”.</li>
            ) : (
              options.map((o, i) => (
                <li
                  key={o.id}
                  id={`${listId}-${o.id}`}
                  role="option"
                  aria-selected={value?.id === o.id}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(o);
                  }}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 ${i === active ? "bg-slate-100" : ""}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-700">
                    {o.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{o.name}</span>
                    {o.meta && <span className="block truncate text-[11px] text-slate-500">{o.meta}</span>}
                  </span>
                  {value?.id === o.id && <Check className="h-4 w-4 text-indigo-600" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
