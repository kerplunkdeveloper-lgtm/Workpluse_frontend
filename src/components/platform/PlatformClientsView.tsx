"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CreditCard,
  IndianRupee,
  CalendarPlus,
  Loader2,
  Pause,
  Play,
  Repeat,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { platformApi } from "@/lib/api";
import Pagination from "@/components/ui/Pagination";
import PlatformNav from "@/components/platform/PlatformNav";
import OwnerActionDialog from "@/components/platform/OwnerActionDialog";
import AttentionPanel from "@/components/platform/AttentionPanel";

interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  createdAt: string;
  plan: string;
  status: string;
  billingCycle?: string | null;
  price: number;
  monthlyValue: number;
  employees: number;
  maxEmployees: number;
  branches: number;
  maxBranches?: number | null;
  planLocked: boolean;
  suspended?: boolean;
  suspendedAt?: string | null;
  periodEnd?: string | null;
  daysLeft?: number | null;
  admin?: { name?: string | null; email: string; lastLoginAt?: string | null } | null;
}

interface ClientDetail extends Client {
  address?: string | null;
  timezone?: string;
  planActivatedAt?: string | null;
  features?: { geofence: boolean; payroll: boolean; shiftPlanner: boolean; apiAccess: boolean } | null;
  departments: number;
  suspendReason?: string | null;
  activity?: Array<{ id: string; action: string; at: string; by?: string | null; details: any }>;
  lastActiveAt?: string | null;
  lifetimePaidInr: number;
  paidOrders: number;
  orders: Array<{
    id: string;
    plan: string;
    billingCycle: string;
    amountInr: number;
    discountAmountInr: number;
    couponCode?: string | null;
    status: string;
    createdAt: string;
    paidAt?: string | null;
  }>;
}

interface Overview {
  totalClients: number;
  payingClients: number;
  trialClients: number;
  mrrInr: number;
  arrInr: number;
  revenueLast30DaysInr: number;
  paidOrdersLast30Days: number;
  activeSeats: number;
  newClientsLast30Days: number;
  expiringSoon: number;
  recentPayments: Array<{ id: string; clientId?: string; client?: string; plan: string; amountInr: number; paidAt?: string }>;
}

const PLAN_LABEL: Record<string, string> = {
  FREE_TRIAL: "Free trial",
  STARTER: "Starter",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TRIALING: "bg-sky-50 text-sky-700 border-sky-200",
  PAST_DUE: "bg-amber-50 text-amber-800 border-amber-200",
  CANCELED: "bg-slate-100 text-slate-700 border-slate-200",
  EXPIRED: "bg-rose-50 text-rose-700 border-rose-200",
};

const rupees = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const ago = (iso?: string | null) => {
  if (!iso) return "Never";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 2) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days < 31 ? `${days} day${days === 1 ? "" : "s"} ago` : shortDate(iso);
};

function renewalText(c: Pick<Client, "status" | "daysLeft" | "periodEnd">) {
  if (c.daysLeft == null) return { text: "No end date", tone: "text-slate-500" };
  const label = c.status === "TRIALING" ? "Trial ends" : "Renews";
  if (c.daysLeft < 0) return { text: `Ended ${Math.abs(c.daysLeft)} days ago`, tone: "text-rose-600 font-semibold" };
  if (c.daysLeft > 730) return { text: "Long term", tone: "text-slate-600" };
  if (c.daysLeft <= 14) return { text: `${label} in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`, tone: "text-amber-700 font-semibold" };
  return { text: `${label} ${shortDate(c.periodEnd)}`, tone: "text-slate-600" };
}

function StatusBadge({ status, suspended }: { status: string; suspended?: boolean }) {
  if (suspended) {
    return <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">Suspended</span>;
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[status] || STATUS_STYLE.CANCELED}`}>
      {status === "TRIALING" ? "Trial" : status === "PAST_DUE" ? "Past due" : status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function SeatBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const tone = pct >= 90 ? "bg-rose-500" : pct >= 75 ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div className="min-w-[110px]">
      <p className="text-xs tabular-nums text-slate-700">
        <span className="font-semibold text-slate-900">{used.toLocaleString("en-IN")}</span> / {max.toLocaleString("en-IN")}
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Seats used">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function PlatformClientsView() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [expiring, setExpiring] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [openId, setOpenId] = useState<string | null>(null);
  const [attentionKey, setAttentionKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    platformApi
      .overview()
      .then((res) => setOverview(res?.data || null))
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi.clients({
        search: debounced || undefined,
        plan: plan || undefined,
        status: status || undefined,
        expiring: expiring || undefined,
        page,
        limit: pageSize,
      });
      const data = res?.data || {};
      setClients(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Clients could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [debounced, plan, status, expiring, page, pageSize]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const filtersOn = Boolean(search || plan || status || expiring);
  const kpis = overview
    ? [
        { label: "Clients", value: overview.totalClients.toLocaleString("en-IN"), sub: `${overview.newClientsLast30Days} new in 30 days`, icon: Building2 },
        { label: "Paying", value: overview.payingClients.toLocaleString("en-IN"), sub: `${overview.trialClients} on trial`, icon: CreditCard },
        { label: "Monthly revenue (MRR)", value: rupees(overview.mrrInr), sub: `${rupees(overview.arrInr)} per year`, icon: TrendingUp },
        { label: "Collected, last 30 days", value: rupees(overview.revenueLast30DaysInr), sub: `${overview.paidOrdersLast30Days} payment${overview.paidOrdersLast30Days === 1 ? "" : "s"}`, icon: IndianRupee },
        { label: "Active seats", value: overview.activeSeats.toLocaleString("en-IN"), sub: "across all clients", icon: Users },
      ]
    : [];

  const selectClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 transition focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-50";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600">Platform owner</p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight text-slate-950">Clients</h1>
          <p className="mt-1 text-sm text-slate-600">Every company on WorkPulse, their plan, seats and payments.</p>
        </div>
        <PlatformNav active="clients" />
      </div>

      {/* KPIs */}
      <section aria-label="Platform summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {overview
          ? kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_40px_-30px_rgba(15,23,42,0.35)]">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k.label}</p>
                  <k.icon aria-hidden="true" className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="mt-2 font-serif text-2xl font-semibold tracking-tight text-slate-950 tabular-nums">{k.value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{k.sub}</p>
              </div>
            ))
          : Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[104px] animate-pulse rounded-2xl border border-slate-100 bg-white" />)}
      </section>

      <AttentionPanel onOpen={setOpenId} refreshKey={attentionKey} />

      {overview && overview.expiringSoon > 0 && (
        <button
          type="button"
          onClick={() => {
            setExpiring(true);
            setPage(1);
          }}
          className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 transition hover:bg-amber-100"
        >
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>
            <strong>{overview.expiringSoon}</strong> client{overview.expiringSoon === 1 ? "" : "s"} renew or end within 14 days.
            <span className="ml-1 font-bold underline">Show them</span>
          </span>
        </button>
      )}

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs" role="search" aria-label="Filter clients">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or admin email"
              aria-label="Search clients"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-500 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50"
            />
          </div>
          <select value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1); }} aria-label="Filter by plan" className={selectClass}>
            <option value="">All plans</option>
            {Object.entries(PLAN_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className={selectClass}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIALING">On trial</option>
            <option value="PAST_DUE">Past due</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELED">Canceled</option>
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700">
            <input type="checkbox" checked={expiring} onChange={(e) => { setExpiring(e.target.checked); setPage(1); }} className="h-4 w-4 accent-indigo-600" />
            Ending within 14 days
          </label>
          {filtersOn && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPlan("");
                setStatus("");
                setExpiring(false);
                setPage(1);
              }}
              className="rounded-xl px-3 py-2.5 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* Table */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_-34px_rgba(15,23,42,0.35)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th scope="col" className="px-5 py-3.5">Client</th>
                <th scope="col" className="px-4 py-3.5">Plan</th>
                <th scope="col" className="px-4 py-3.5">Status</th>
                <th scope="col" className="px-4 py-3.5">Seats</th>
                <th scope="col" className="px-4 py-3.5">Branches</th>
                <th scope="col" className="px-4 py-3.5">Renewal</th>
                <th scope="col" className="px-4 py-3.5">Last active</th>
                <th scope="col" className="px-4 py-3.5 text-right">MRR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && clients.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-5 py-4">
                      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-rose-700">
                    {error}{" "}
                    <button type="button" onClick={() => void load()} className="font-bold underline">
                      Try again
                    </button>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-14 text-center text-sm text-slate-600">
                    {filtersOn ? "No clients match these filters." : "No clients yet. They appear here when a company signs up."}
                  </td>
                </tr>
              ) : (
                clients.map((c) => {
                  const renewal = renewalText(c);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setOpenId(c.id)}
                      className="cursor-pointer transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenId(c.id);
                          }}
                          className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                        >
                          <span className="block font-semibold text-slate-950">{c.name}</span>
                          <span className="block text-xs text-slate-500">{c.admin?.email || c.email || "No admin yet"}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800">{PLAN_LABEL[c.plan] || c.plan}</span>
                        {c.billingCycle && c.plan !== "FREE_TRIAL" && (
                          <span className="block text-xs text-slate-500">{c.billingCycle === "ANNUAL" ? "Annual" : "Monthly"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={c.status} suspended={c.suspended} />
                        {c.planLocked && c.plan !== "FREE_TRIAL" && <span className="mt-1 block text-[11px] font-medium text-amber-700">Awaiting unlock code</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <SeatBar used={c.employees} max={c.maxEmployees} />
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-slate-700">
                        {c.branches}
                        {c.maxBranches ? <span className="text-slate-500"> / {c.maxBranches}</span> : null}
                      </td>
                      <td className={`px-4 py-3.5 text-xs ${renewal.tone}`}>{renewal.text}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{ago(c.admin?.lastLoginAt)}</td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900">{c.monthlyValue ? rupees(c.monthlyValue) : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          noun="clients"
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      {overview && overview.recentPayments.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-bold text-slate-900">Recent payments</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {overview.recentPayments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <button type="button" onClick={() => p.clientId && setOpenId(p.clientId)} className="min-w-0 text-left">
                  <span className="block truncate font-semibold text-slate-900">{p.client}</span>
                  <span className="text-xs text-slate-500">
                    {PLAN_LABEL[p.plan] || p.plan} · {shortDate(p.paidAt)}
                  </span>
                </button>
                <span className="shrink-0 font-semibold tabular-nums text-emerald-700">{rupees(p.amountInr)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {openId && (
        <ClientPanel
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => {
            setAttentionKey((k) => k + 1);
            void load();
            platformApi.overview().then((res) => setOverview(res?.data || null)).catch(() => undefined);
          }}
        />
      )}
    </div>
  );
}

/* ── Detail slide-over ──────────────────────────────────────────────────── */

function ClientPanel({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [dialog, setDialog] = useState<null | "EXTEND" | "CHANGE_PLAN" | "SUSPEND" | "REACTIVATE">(null);
  const [failed, setFailed] = useState(false);
  const closeRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    platformApi
      .client(id)
      .then((res) => !cancelled && setClient(res?.data || null))
      .catch((err) => {
        if (cancelled) return;
        setFailed(true);
        toast.error(err?.response?.data?.message || "Client details could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("[data-owner-dialog]") && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Client details"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="min-w-0">
            {client ? (
              <>
                <h2 className="truncate font-serif text-xl font-semibold text-slate-950">{client.name}</h2>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={client.status} suspended={client.suspended} />
                  <span className="text-xs font-semibold text-slate-600">{PLAN_LABEL[client.plan] || client.plan}</span>
                </div>
              </>
            ) : (
              <div className="h-12 w-48 animate-pulse rounded-lg bg-slate-100" />
            )}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          {failed ? (
            <p className="text-sm text-rose-700">These details could not be loaded.</p>
          ) : !client ? (
            <div className="flex justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              {client.suspended && (
                <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <p className="font-bold">This workspace is suspended</p>
                  <p className="mt-1 text-rose-800">
                    Nobody at {client.name} can sign in or use the app. Their data is untouched.
                    {client.suspendReason ? <> Reason: <em>{client.suspendReason}</em></> : null}
                  </p>
                </div>
              )}

              <section aria-labelledby="manage-title">
                <h3 id="manage-title" className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Manage</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setDialog("EXTEND")} disabled={client.suspended} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50">
                    <CalendarPlus className="h-4 w-4 text-indigo-600" />
                    {client.plan === "FREE_TRIAL" ? "Extend trial" : "Extend period"}
                  </button>
                  <button type="button" onClick={() => setDialog("CHANGE_PLAN")} disabled={client.suspended} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50">
                    <Repeat className="h-4 w-4 text-indigo-600" />
                    Change plan
                  </button>
                  {client.suspended ? (
                    <button type="button" onClick={() => setDialog("REACTIVATE")} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500">
                      <Play className="h-4 w-4" />
                      Reactivate workspace
                    </button>
                  ) : (
                    <button type="button" onClick={() => setDialog("SUSPEND")} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50">
                      <Pause className="h-4 w-4" />
                      Suspend workspace
                    </button>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contact</h3>
                <dl className="mt-1 divide-y divide-slate-100">
                  {row("Admin", client.admin?.name || "—")}
                  {row("Admin email", client.admin?.email ? <a className="text-indigo-600 hover:underline" href={`mailto:${client.admin.email}`}>{client.admin.email}</a> : "—")}
                  {row("Phone", client.phone || "—")}
                  {row("Last admin login", ago(client.admin?.lastLoginAt))}
                  {row("Last activity (anyone)", ago(client.lastActiveAt))}
                  {row("Joined", shortDate(client.createdAt))}
                </dl>
              </section>

              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Plan and usage</h3>
                <dl className="mt-1 divide-y divide-slate-100">
                  {row("Billing", client.plan === "FREE_TRIAL" ? "Free trial" : `${client.billingCycle === "ANNUAL" ? "Annual" : "Monthly"} · ${rupees(client.price)}`)}
                  {row("Renewal", renewalText(client).text)}
                  {row("Seats", <SeatBar used={client.employees} max={client.maxEmployees} />)}
                  {row("Branches", `${client.branches}${client.maxBranches ? ` of ${client.maxBranches}` : ""}`)}
                  {row("Departments", client.departments)}
                  {row("Plan unlocked", client.planLocked ? "Not yet" : shortDate(client.planActivatedAt))}
                </dl>
                {client.features && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      ["Geofence", client.features.geofence],
                      ["Payroll", client.features.payroll],
                      ["Shift planner", client.features.shiftPlanner],
                      ["API access", client.features.apiAccess],
                    ].map(([label, on]) => (
                      <li
                        key={String(label)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500 line-through"}`}
                      >
                        {label}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payments</h3>
                  <span className="text-xs text-slate-500">
                    {client.paidOrders} paid · {rupees(client.lifetimePaidInr)} lifetime
                  </span>
                </div>
                {client.orders.length === 0 ? (
                  <p className="mt-2 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                    No payments yet. This plan was set up without checkout.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {client.orders.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {PLAN_LABEL[o.plan] || o.plan} · {o.billingCycle === "ANNUAL" ? "Annual" : "Monthly"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {shortDate(o.paidAt || o.createdAt)}
                            {o.couponCode ? ` · code ${o.couponCode}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums text-slate-900">{rupees(o.amountInr)}</p>
                          <p className={`text-[11px] font-bold ${o.status === "PAID" ? "text-emerald-700" : "text-slate-500"}`}>{o.status === "PAID" ? "Paid" : o.status.toLowerCase()}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {client.activity && client.activity.length > 0 && (
                <section>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Owner activity</h3>
                  <ol className="mt-2 space-y-3 border-l border-slate-200 pl-4">
                    {client.activity.map((a) => (
                      <li key={a.id} className="relative text-sm">
                        <span aria-hidden="true" className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-indigo-500 ring-4 ring-white" />
                        <p className="font-semibold text-slate-900">{describeActivity(a)}</p>
                        <p className="text-xs text-slate-500">
                          {ago(a.at)}
                          {a.by ? ` · ${a.by}` : ""}
                          {a.details?.reason ? ` · "${a.details.reason}"` : ""}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              )}

              <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                You see company-level information only. Employee records, attendance and payroll data stay private to each client.
              </p>
            </>
          )}
        </div>
      </aside>
      {dialog && client && (
        <OwnerActionDialog
          client={client}
          mode={dialog}
          onClose={() => setDialog(null)}
          onDone={(updated) => {
            setClient(updated);
            setDialog(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function describeActivity(a: { action: string; details: any }) {
  const d = a.details || {};
  switch (a.action) {
    case "TRIAL_EXTENDED":
      return `Trial extended by ${d.days} days`;
    case "PERIOD_EXTENDED":
      return `Paid period extended by ${d.days} days`;
    case "PLAN_CHANGED":
      return `Plan changed: ${PLAN_LABEL[d.before?.plan] || d.before?.plan} to ${PLAN_LABEL[d.after?.plan] || d.after?.plan}`;
    case "SUSPENDED":
      return "Workspace suspended";
    case "REACTIVATED":
      return "Workspace reactivated";
    default:
      return a.action;
  }
}
