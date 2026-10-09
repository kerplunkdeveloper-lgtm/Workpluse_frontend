"use client";

import React, { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { platformApi } from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import PlatformNav from "@/components/platform/PlatformNav";

interface Entry {
  id: string;
  at: string;
  action: string;
  label: string;
  clientId?: string | null;
  client: string;
  by?: string | null;
  ip?: string | null;
  details: any;
}

const PLAN: Record<string, string> = { FREE_TRIAL: "Free trial", STARTER: "Starter", PROFESSIONAL: "Professional", ENTERPRISE: "Enterprise" };

const TONE: Record<string, string> = {
  SUSPENDED: "bg-rose-50 text-rose-700 border-rose-200",
  REACTIVATED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PLAN_CHANGED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  TRIAL_EXTENDED: "bg-sky-50 text-sky-700 border-sky-200",
  PERIOD_EXTENDED: "bg-sky-50 text-sky-700 border-sky-200",
};

function summary(e: Entry) {
  const d = e.details || {};
  switch (e.action) {
    case "TRIAL_EXTENDED":
    case "PERIOD_EXTENDED":
      return `Added ${d.days} days`;
    case "PLAN_CHANGED":
      return `${PLAN[d.before?.plan] || d.before?.plan} to ${PLAN[d.after?.plan] || d.after?.plan}${d.after?.billingCycle ? ` (${d.after.billingCycle === "ANNUAL" ? "annual" : "monthly"})` : ""}`;
    default:
      return "";
  }
}

const exact = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

const relative = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days < 31 ? `${days} day${days === 1 ? "" : "s"} ago` : exact(iso);
};

export default function PlatformActivityView() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi.activity({ page, limit: pageSize, action: action || undefined });
      const data = res?.data || {};
      setRows(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Activity could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, action]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600">Platform owner</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-950">Activity</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">Every change made to a client from the owner console: who did it, when, and why.</p>
        </div>
        <PlatformNav active="activity" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="activity-filter" className="sr-only">
          Filter by action
        </label>
        <select
          id="activity-filter"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-50"
        >
          <option value="">All actions</option>
          <option value="PLAN_CHANGED">Plan changed</option>
          <option value="TRIAL_EXTENDED">Trial extended</option>
          <option value="PERIOD_EXTENDED">Paid period extended</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="REACTIVATED">Reactivated</option>
        </select>
        <p className="text-xs text-slate-500" aria-live="polite">
          {total.toLocaleString("en-IN")} {total === 1 ? "entry" : "entries"}
        </p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]">
        {loading && rows.length === 0 ? (
          <div aria-busy="true" className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <p className="px-5 py-12 text-center text-sm text-rose-700">
            {error}{" "}
            <button type="button" onClick={() => void load()} className="font-bold underline">
              Try again
            </button>
          </p>
        ) : rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <History aria-hidden="true" className="h-6 w-6" />
            </span>
            <h2 className="mt-4 font-serif text-xl font-semibold text-slate-950">{action ? "No matching activity" : "Nothing here yet"}</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-600">
              {action ? "Try another filter." : "When you extend a trial, change a plan, suspend or reactivate a client, it is recorded here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5">When</th>
                  <th scope="col" className="px-4 py-3.5">Client</th>
                  <th scope="col" className="px-4 py-3.5">Action</th>
                  <th scope="col" className="px-4 py-3.5">Reason</th>
                  <th scope="col" className="px-4 py-3.5">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-3.5 align-top">
                      <time dateTime={r.at} title={exact(r.at)} className="text-slate-700">
                        {relative(r.at)}
                      </time>
                      <span className="block text-[11px] text-slate-500">{exact(r.at)}</span>
                    </td>
                    <td className="px-4 py-3.5 align-top font-semibold text-slate-950">{r.client}</td>
                    <td className="px-4 py-3.5 align-top">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${TONE[r.action] || "bg-slate-100 text-slate-700 border-slate-200"}`}>{r.label}</span>
                      {summary(r) && <span className="mt-1 block text-xs text-slate-600">{summary(r)}</span>}
                    </td>
                    <td className="max-w-[260px] px-4 py-3.5 align-top text-slate-700">{r.details?.reason || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-3.5 align-top text-xs text-slate-600">
                      {r.by || "Unknown"}
                      {r.ip && <span className="block text-[11px] text-slate-500">{r.ip}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          noun="entries"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>
    </div>
  );
}
