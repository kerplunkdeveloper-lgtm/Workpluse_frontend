"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, CreditCard, Gauge, KeyRound, PauseCircle } from "lucide-react";
import { platformApi } from "@/lib/api";

type Item = { id: string; name: string; plan: string; status: string; admin?: string | null; detail: string };
type Group = { count: number; items: Item[] };
interface Attention {
  total: number;
  pastDue: Group;
  seatLimit: Group;
  inactive: Group;
  awaitingUnlock: Group;
  suspended: Group;
}

const TABS = [
  { key: "pastDue", label: "Payment issues", icon: CreditCard, help: "Overdue or expired paid plans. Follow up, or extend if it was agreed." },
  { key: "seatLimit", label: "Near seat limit", icon: Gauge, help: "Using 90% or more of their seats. Good upgrade conversations." },
  { key: "inactive", label: "Inactive", icon: Clock, help: "Nobody has signed in for 30 days. At risk of leaving." },
  { key: "awaitingUnlock", label: "Not unlocked", icon: KeyRound, help: "Paid, but the admin has not entered their unlock code. They may be stuck." },
  { key: "suspended", label: "Suspended", icon: PauseCircle, help: "Currently blocked from using the app." },
] as const;

type Key = (typeof TABS)[number]["key"];

const PLAN: Record<string, string> = { FREE_TRIAL: "Free trial", STARTER: "Starter", PROFESSIONAL: "Professional", ENTERPRISE: "Enterprise" };

export default function AttentionPanel({ onOpen, refreshKey }: { onOpen: (id: string) => void; refreshKey: number }) {
  const [data, setData] = useState<Attention | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Key | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformApi
      .attention()
      .then((res) => {
        if (cancelled) return;
        const next: Attention = res?.data;
        setData(next);
        setFailed(false);
        // Open on the first group that has something in it.
        setTab((current) => (current && next[current].count > 0 ? current : TABS.find((t) => next[t.key].count > 0)?.key ?? null));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (failed) return null;
  if (!data) return <div className="h-24 animate-pulse rounded-3xl border border-slate-100 bg-white" aria-busy="true" aria-label="Loading attention list" />;

  if (data.total === 0) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
        <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-emerald-600" />
        <span>
          <strong>All clients look healthy.</strong> No payment issues, no one near their seat limit, and everyone has signed in recently.
        </span>
      </div>
    );
  }

  const active = tab ? TABS.find((t) => t.key === tab)! : null;
  const group = tab ? data[tab] : null;

  return (
    <section aria-labelledby="attention-title" className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-[0_18px_50px_-34px_rgba(180,83,9,0.35)]">
      <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50/70 px-5 py-3.5">
        <AlertTriangle aria-hidden="true" className="h-4 w-4 text-amber-700" />
        <h2 id="attention-title" className="text-sm font-bold text-amber-950">
          Needs attention <span className="ml-1 rounded-full bg-amber-200/70 px-2 py-0.5 text-xs">{data.total}</span>
        </h2>
      </div>

      <div role="tablist" aria-label="Attention groups" className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2">
        {TABS.map((t) => {
          const count = data[t.key].count;
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={on}
              type="button"
              disabled={count === 0}
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-3.5 py-2.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                on ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-900 disabled:text-slate-400 disabled:hover:text-slate-400"
              }`}
            >
              <t.icon aria-hidden="true" className="h-3.5 w-3.5" />
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${count > 0 ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-500"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {group && active && (
        <div role="tabpanel">
          <p className="px-5 pt-3 text-xs text-slate-600">{active.help}</p>
          <ul className="divide-y divide-slate-100 pb-1 pt-2">
            {group.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-950">{item.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {PLAN[item.plan] || item.plan}
                      {item.admin ? ` · ${item.admin}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-amber-800">{item.detail}</span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
          {group.count > group.items.length && (
            <p className="px-5 pb-3 text-xs text-slate-500">Showing {group.items.length} of {group.count}.</p>
          )}
        </div>
      )}
    </section>
  );
}
