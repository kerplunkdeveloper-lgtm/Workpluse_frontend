"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, History, RefreshCw } from "lucide-react";
import { auditApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  actor?: { name: string; email: string; role: string } | null;
}

const CARD = "rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.18)]";
const SELECT =
  "h-10 rounded-xl bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "CANCEL", "EXPORT"];
const ENTITIES = [
  "EMPLOYEE", "ATTENDANCE", "LEAVE", "PAYROLL", "LOAN", "EXPENSE", "OVERTIME", "POLICY", "BRANCH", "SHIFT",
  "DEPARTMENT", "HOLIDAY", "ASSET", "ONBOARDING", "OFFBOARDING", "ORGANIZATION", "BILLING", "ANNOUNCEMENTS",
];

const ACTION_TONE: Record<string, string> = {
  CREATE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  UPDATE: "bg-sky-50 text-sky-700 ring-sky-600/20",
  DELETE: "bg-rose-50 text-rose-700 ring-rose-600/20",
  APPROVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECT: "bg-amber-50 text-amber-800 ring-amber-600/25",
  CANCEL: "bg-slate-100 text-slate-600 ring-slate-500/15",
  EXPORT: "bg-violet-50 text-violet-700 ring-violet-600/20",
};

const label = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ");

const parseDetails = (raw?: string | null): Record<string, any> | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const stamp = (iso: string) => {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" }),
  };
};

export default function AuditLogView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.list({
        page,
        limit: pageSize,
        entity: entity || undefined,
        action: action || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setEntries(unwrapList<AuditEntry>(res));
      setTotal(Number(res?.total ?? 0));
      setTotalPages(Number(res?.totalPages ?? 1));
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not load the audit log.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, entity, action, from, to]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const changeFilter = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setter(e.target.value);
    setPage(1);
  };
  const filtered = Boolean(entity || action || from || to);
  const invalidRange = Boolean(from && to && to < from);

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 pb-10">
      <PageHeader
        icon={History}
        title="Audit log"
        description="A record of every change made in your workspace: who did it, what changed, and when. Passwords and tokens are never stored."
        actions={
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-3.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      <div className={`${CARD} flex flex-wrap items-end gap-3 p-4`} role="search" aria-label="Filter the audit log">
        <label className="space-y-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Area</span>
          <select value={entity} onChange={changeFilter(setEntity)} className={SELECT}>
            <option value="">All areas</option>
            {ENTITIES.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Action</span>
          <select value={action} onChange={changeFilter(setAction)} className={SELECT}>
            <option value="">All actions</option>
            {ACTIONS.map((value) => <option key={value} value={value}>{label(value)}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">From</span>
          <input type="date" value={from} max={to || undefined} onChange={changeFilter(setFrom)} className={SELECT} />
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">To</span>
          <input type="date" value={to} min={from || undefined} onChange={changeFilter(setTo)} className={SELECT} />
        </label>
        {filtered && (
          <button type="button" onClick={() => { setEntity(""); setAction(""); setFrom(""); setTo(""); setPage(1); }} className="h-10 rounded-xl px-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
            Clear filters
          </button>
        )}
        {invalidRange && <p className="basis-full text-xs font-medium text-rose-600">The end date is before the start date.</p>}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          <span>{error}</span>
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline">Retry</button>
        </div>
      )}

      <section className={`${CARD} overflow-hidden`} aria-label="Audit entries">
        {loading && entries.length === 0 ? (
          <div className="space-y-3 p-5" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-shimmer h-14 rounded-xl" />)}</div>
        ) : entries.length === 0 && !error ? (
          <div className="px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><History className="h-6 w-6" /></span>
            <p className="mt-4 text-sm font-semibold text-slate-900">{filtered ? "No entries match these filters" : "Nothing recorded yet"}</p>
            <p className="mt-1 text-sm text-slate-500">{filtered ? "Try a wider date range or clear the filters." : "Changes made in your workspace will appear here."}</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => <Row key={entry.id} entry={entry} open={openId === entry.id} onToggle={() => setOpenId(openId === entry.id ? null : entry.id)} />)}
          </ul>
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} noun="entries" />
    </div>
  );
}

function Row({ entry, open, onToggle }: { entry: AuditEntry; open: boolean; onToggle: () => void }) {
  const details = useMemo(() => parseDetails(entry.details), [entry.details]);
  const when = stamp(entry.createdAt);
  const who = entry.actor?.name || entry.actor?.email || "Unknown user";
  const request = details?.method && details?.path ? `${details.method} ${String(details.path).split("?")[0]}` : null;

  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50 sm:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:gap-4">
        <span className="text-xs text-slate-500">
          <span className="block font-semibold text-slate-700">{when.day}</span>
          <span className="tabular-nums">{when.time}</span>
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${ACTION_TONE[entry.action] ?? ACTION_TONE.UPDATE}`}>{label(entry.action)}</span>
          <span className="truncate text-sm font-semibold text-slate-900">{label(entry.entity)}</span>
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block truncate text-sm text-slate-700">{who}</span>
          {entry.actor?.role && <span className="block text-[11px] text-slate-400">{label(entry.actor.role)}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-3 bg-slate-50/70 px-5 py-4 text-sm">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            <Item term="Done by" value={`${who}${entry.actor?.email && entry.actor.name !== entry.actor.email ? ` (${entry.actor.email})` : ""}`} />
            <Item term="From IP address" value={entry.ipAddress || "Not recorded"} />
            <Item term="Request" value={request || "Not recorded"} mono />
            <Item term="Record ID" value={entry.entityId || "—"} mono />
          </dl>
          {details?.body && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">What was sent</p>
              <pre className="max-h-64 overflow-auto rounded-xl bg-white p-3 text-xs leading-5 text-slate-700 ring-1 ring-slate-200">{JSON.stringify(details.body, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Item({ term, value, mono }: { term: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{term}</dt>
      <dd className={`mt-0.5 break-all text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
