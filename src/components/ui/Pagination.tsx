"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  noun?: string;
}

type PageItem = number | "gap-start" | "gap-end";

/** 1 … 4 5 [6] 7 8 … 32 — always shows first, last and the current neighbourhood. */
function buildPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const items: PageItem[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push("gap-start");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push("gap-end");
  items.push(totalPages);
  return items;
}

const base =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-semibold tabular-nums transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:scale-[0.96]";

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  noun = "results",
}: PaginationProps) {
  if (total === 0) return null;

  const firstShown = (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, total);
  const go = (next: number) => onPageChange(Math.min(Math.max(1, next), totalPages));
  const arrow = `${base} text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30`;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <p>
          Showing <span className="font-semibold tabular-nums text-slate-900">{firstShown.toLocaleString()}</span>
          {"–"}
          <span className="font-semibold tabular-nums text-slate-900">{lastShown.toLocaleString()}</span> of{" "}
          <span className="font-semibold tabular-nums text-slate-900">{total.toLocaleString()}</span> {noun}
        </p>
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span>Rows</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go(1)} disabled={page <= 1} aria-label="First page" className={`${arrow} hidden sm:inline-flex`}>
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous page" className={arrow}>
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Compact indicator on phones, numbered pages from sm up */}
          <span className="px-3 text-xs font-semibold tabular-nums text-slate-600 sm:hidden">
            {page} / {totalPages}
          </span>
          <ul className="hidden items-center gap-1 sm:flex">
            {buildPageItems(page, totalPages).map((item) =>
              typeof item === "number" ? (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => go(item)}
                    aria-label={`Page ${item}`}
                    aria-current={item === page ? "page" : undefined}
                    className={`${base} ${
                      item === page
                        ? "bg-indigo-600 text-white shadow-[0_6px_16px_-8px_rgba(79,70,229,0.9)]"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item}
                  </button>
                </li>
              ) : (
                <li key={item} aria-hidden="true" className="px-1 text-slate-400">
                  …
                </li>
              ),
            )}
          </ul>

          <button type="button" onClick={() => go(page + 1)} disabled={page >= totalPages} aria-label="Next page" className={arrow}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => go(totalPages)} disabled={page >= totalPages} aria-label="Last page" className={`${arrow} hidden sm:inline-flex`}>
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  );
}
