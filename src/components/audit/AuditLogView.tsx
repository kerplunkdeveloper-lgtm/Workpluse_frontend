"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Filter,
  History,
  MonitorSmartphone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { auditApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";

type AuditScope = "flagged" | "pending" | "all";
type ReviewStatus = "APPROVED" | "REJECTED" | "FALSE_POSITIVE";

interface PreviousOwner {
  id?: string | null;
  employeeId?: string | null;
  name?: string | null;
  employeeCode?: string | null;
  branchName?: string | null;
  branch?: { name?: string | null } | null;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  actor?: { name: string; email: string; role: string } | null;
  employee?: { id: string; firstName: string; lastName?: string; employeeCode?: string; branch?: { id: string; name: string; code?: string } | null } | null;
  deviceId?: string | null;
  deviceName?: string | null;
  eventType?: string | null;
  riskLevel?: string | null;
  reviewStatus?: string | null;
  reviewNote?: string | null;
  attendanceId?: string | null;
  previousOwners?: PreviousOwner[];
}

interface AuditSummary { total: number; pending: number; highRisk: number; flagged: number; }
interface ReviewTarget { id: string; status: ReviewStatus; entry: AuditEntry; }

const EMPTY_SUMMARY: AuditSummary = { total: 0, pending: 0, highRisk: 0, flagged: 0 };
const CARD = "rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.18)]";
const FIELD = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";
const ACTIONS = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "CANCEL", "EXPORT", "FLAGGED"];
const ENTITIES = ["EMPLOYEE", "ATTENDANCE", "LEAVE", "PAYROLL", "LOAN", "EXPENSE", "OVERTIME", "POLICY", "ATTENDANCE_POLICY", "BRANCH", "SHIFT", "DEPARTMENT", "HOLIDAY", "ASSET", "ONBOARDING", "OFFBOARDING", "ORGANIZATION", "BILLING", "ANNOUNCEMENTS", "DEVICE"];
const EVENT_TYPES = ["NEW_DEVICE_USE", "DEVICE_CONFLICT", "DUPLICATE_DEVICE", "DEVICE_REGISTERED", "DEVICE_APPROVED", "DEVICE_REVOKED", "LOCATION_FAILED", "UNTRUSTED_DEVICE", "ATTENDANCE_POLICY_UPDATED"];

const label = (value: string) => String(value || "")
  .toLowerCase()
  .split("_")
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(" ");

const parseDetails = (raw?: string | null): Record<string, unknown> | null => {
  if (!raw) return null;
  try { const parsed: unknown = JSON.parse(raw); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null; } catch { return null; }
};

const friendlyMessage = (entry: AuditEntry, details: Record<string, unknown> | null) => {
  const path = String(details?.path || "").toLowerCase();
  const method = String(details?.method || "").toUpperCase();
  if (path.includes("/notifications/fcm/token")) return "Push notification device registered.";
  if (path.includes("/login")) return "Signed in to the workspace.";
  if (entry.eventType === "DUPLICATE_DEVICE" || entry.eventType === "DEVICE_CONFLICT") return "Duplicate device detected. HR review is required.";
  if (entry.eventType === "LOCATION_FAILED") return "Attendance location check failed.";
  if (entry.eventType === "UNTRUSTED_DEVICE") return "An untrusted device was used for attendance.";
  const entityText: Record<string, string> = { AUTH: "account access", EMPLOYEE: "employee record", ATTENDANCE: "attendance record", LEAVE: "leave request", PAYROLL: "payroll record", DEVICE: "device security record", POLICY: "company policy", ATTENDANCE_POLICY: "attendance policy", COMP_OFF: "comp-off request", OVERTIME: "overtime request", EXPENSE: "expense claim", LOAN: "loan request", BRANCH: "branch", DEPARTMENT: "department", SHIFT: "shift", HOLIDAY: "holiday", ASSET: "company asset", ONBOARDING: "onboarding record", OFFBOARDING: "offboarding record", ANNOUNCEMENTS: "announcement" };
  const actionText: Record<string, string> = { CREATE: "created", UPDATE: "updated", DELETE: "deleted", APPROVE: "approved", REJECT: "rejected", CANCEL: "cancelled", EXPORT: "exported", FLAGGED: "flagged" };
  const action = actionText[entry.action] || (method === "POST" ? "submitted" : "changed");
  const subject = entityText[entry.entity] || label(entry.entity).toLowerCase();
  return `${label(entry.action) || "Activity"}: ${action} ${subject}.`;
};

const auditExplanation = (entry: AuditEntry, details: Record<string, unknown> | null) => {
  const message = friendlyMessage(entry, details);
  if (entry.eventType) return `${message} Security event: ${label(entry.eventType)}.`;
  if (entry.riskLevel === "HIGH") return `${message} This event needs attention because it is marked high risk.`;
  return message;
};

const stamp = (iso: string) => {
  const date = new Date(iso);
  return { day: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }), time: date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" }) };
};

const riskTone = (risk?: string | null) => risk === "HIGH" ? "bg-rose-50 text-rose-700 ring-rose-200" : risk === "MEDIUM" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-slate-100 text-slate-600 ring-slate-200";
const reviewTone = (status?: string | null) => status === "APPROVED" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : status === "REJECTED" ? "bg-rose-50 text-rose-700 ring-rose-200" : status === "FALSE_POSITIVE" ? "bg-slate-100 text-slate-600 ring-slate-200" : status === "PENDING" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-slate-100 text-slate-500 ring-slate-200";
const entryOwnerName = (entry: AuditEntry) => entry.employee ? `${entry.employee.firstName} ${entry.employee.lastName || ""}`.trim() : "Unlinked employee";

export default function AuditLogView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [scope, setScope] = useState<AuditScope>("flagged");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const resultsRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await auditApi.list({ page, limit: pageSize, entity: entity || undefined, action: action || (scope === "flagged" ? "FLAGGED" : undefined), search: search || undefined, eventType: eventType || undefined, riskLevel: riskLevel || undefined, reviewStatus: scope === "pending" ? "PENDING" : reviewStatus || undefined, from: from || undefined, to: to || undefined });
      const list = unwrapList<AuditEntry>(res);
      const nextTotal = Number(res?.total ?? list.length);
      setEntries(list); setTotal(nextTotal); setTotalPages(Number(res?.totalPages ?? 1));
      setSummary(res?.summary || { total: nextTotal, pending: list.filter((entry) => entry.reviewStatus === "PENDING").length, highRisk: list.filter((entry) => entry.riskLevel === "HIGH").length, flagged: list.filter((entry) => entry.action === "FLAGGED").length });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Could not load the audit log."); } finally { setLoading(false); }
  }, [page, pageSize, scope, entity, action, from, to, search, eventType, riskLevel, reviewStatus]);

  // The audit page intentionally fetches remote data when filters or refresh change.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load, reloadKey]);

  const changeFilter = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => { setter(event.target.value); setPage(1); };
  const setView = (next: AuditScope) => { setScope(next); setPage(1); setOpenId(null); };
  const clearFilters = () => { setScope("all"); setEntity(""); setAction(""); setFrom(""); setTo(""); setSearch(""); setEventType(""); setRiskLevel(""); setReviewStatus(""); setPage(1); };
  const focusMetric = (metric: "flagged" | "pending" | "risk" | "showing") => {
    setOpenId(null);
    if (metric === "showing") {
      clearFilters();
    } else if (metric === "flagged") {
      setScope("flagged"); setAction(""); setRiskLevel(""); setReviewStatus(""); setPage(1);
    } else if (metric === "pending") {
      setScope("pending"); setAction(""); setRiskLevel(""); setReviewStatus(""); setPage(1);
    } else {
      setScope("all"); setAction(""); setRiskLevel("HIGH"); setReviewStatus(""); setPage(1);
    }
    window.requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const submitReview = async (note: string) => {
    if (!reviewTarget) return;
    setReviewBusy(true);
    try { await auditApi.review(reviewTarget.id, { status: reviewTarget.status, note: note.trim() || undefined }); setReviewTarget(null); setOpenId(null); setReloadKey((key) => key + 1); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Could not update the review status."); } finally { setReviewBusy(false); }
  };
  const customFiltered = Boolean(entity || action || from || to || search || eventType || riskLevel || reviewStatus);
  const invalidRange = Boolean(from && to && to < from);

  return <div className="mx-auto w-full max-w-[1240px] space-y-5 pb-10">
    <PageHeader icon={History} title="Audit & security review" badge={scope === "flagged" ? "Flagged view" : undefined} description="See what happened, who did it, and which employee or device was affected. Every decision is recorded with the reviewer and note." actions={<button type="button" onClick={() => setReloadKey((key) => key + 1)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button>} />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={ShieldAlert} label="Flagged events" value={summary.flagged} tone="rose" hint="Security and policy flags" onClick={() => focusMetric("flagged")} /><MetricCard icon={Clock3} label="Pending review" value={summary.pending} tone="amber" hint="Needs an HR decision" onClick={() => focusMetric("pending")} /><MetricCard icon={AlertTriangle} label="High risk" value={summary.highRisk} tone="orange" hint="Requires attention" onClick={() => focusMetric("risk")} /><MetricCard icon={History} label="Showing" value={summary.total} tone="indigo" hint="Events in this view" onClick={() => focusMetric("showing")} /></div>

    <div className={`${CARD} p-1.5`} role="tablist" aria-label="Audit event views"><div className="grid grid-cols-3 gap-1"><ViewTab active={scope === "flagged"} icon={ShieldAlert} label="Flagged events" count={summary.flagged} onClick={() => setView("flagged")} /><ViewTab active={scope === "pending"} icon={Clock3} label="Pending review" count={summary.pending} onClick={() => setView("pending")} /><ViewTab active={scope === "all"} icon={History} label="All activity" count={summary.total} onClick={() => setView("all")} /></div></div>

    <div className={`${CARD} overflow-visible`}><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div className="flex items-center gap-2"><span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Filter className="h-4 w-4" /></span><div><h2 className="text-sm font-bold text-slate-900">Filter audit events</h2><p className="text-xs text-slate-500">Narrow the review queue by risk, event or person.</p></div></div>{(customFiltered || scope !== "flagged") && <button type="button" onClick={clearFilters} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Clear all filters</button>}</div><div className="grid min-w-0 grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4 xl:grid-cols-9" role="search" aria-label="Filter the audit log"><label className="col-span-1 flex min-w-0 flex-col gap-1 sm:col-span-2 xl:col-span-2"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Search</span><span className="relative block min-w-0"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={changeFilter(setSearch)} placeholder="Employee, device or ID" className={`${FIELD} w-full min-w-0 pl-9`} /></span></label><FilterField label="Area" className="col-span-1 min-w-0"><Select value={entity} onChange={changeFilter(setEntity)} className={`${FIELD} w-full min-w-0`}><option value="">All areas</option>{ENTITIES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</Select></FilterField><FilterField label="Event" className="col-span-1 min-w-0"><Select value={eventType} onChange={changeFilter(setEventType)} className={`${FIELD} w-full min-w-0`}><option value="">All events</option>{EVENT_TYPES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</Select></FilterField><FilterField label="Risk" className="col-span-1 min-w-0"><Select value={riskLevel} onChange={changeFilter(setRiskLevel)} className={`${FIELD} w-full min-w-0`}><option value="">All risk</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option></Select></FilterField><FilterField label="Review" className="col-span-1 min-w-0"><Select disabled={scope === "pending"} value={reviewStatus} onChange={changeFilter(setReviewStatus)} className={`${FIELD} w-full min-w-0`}><option value="">All review states</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="FALSE_POSITIVE">False positive</option></Select></FilterField><FilterField label="Action" className="col-span-1 min-w-0"><Select value={action} onChange={changeFilter(setAction)} className={`${FIELD} w-full min-w-0`}><option value="">All actions</option>{ACTIONS.map((value) => <option key={value} value={value}>{label(value)}</option>)}</Select></FilterField><FilterField label="From" className="col-span-1 min-w-0"><input type="date" value={from} max={to || undefined} onChange={changeFilter(setFrom)} className={`${FIELD} w-full min-w-0`} /></FilterField><FilterField label="To" className="col-span-1 min-w-0"><input type="date" value={to} min={from || undefined} onChange={changeFilter(setTo)} className={`${FIELD} w-full min-w-0`} /></FilterField>{invalidRange && <p className="col-span-full text-xs font-semibold text-rose-600">The end date is before the start date.</p>}</div></div>

    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200"><span>{error}</span><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="font-bold underline">Retry</button></div>}
    <section ref={resultsRef} className={`${CARD} scroll-mt-6 overflow-hidden`} aria-label="Audit entries"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">{scope === "flagged" ? "Flagged security events" : scope === "pending" ? "Pending HR review" : "Workspace activity"}</h2><p className="mt-0.5 text-xs text-slate-500">Open an event to see the full evidence and review decision.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{total} {total === 1 ? "event" : "events"}</span></div>{loading && entries.length === 0 ? <div className="space-y-3 p-5" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-shimmer h-16 rounded-xl" />)}</div> : entries.length === 0 && !error ? <EmptyState scope={scope} filtered={customFiltered} /> : <ul className="divide-y divide-slate-100">{entries.map((entry) => <AuditRow key={entry.id} entry={entry} open={openId === entry.id} onToggle={() => setOpenId(openId === entry.id ? null : entry.id)} onRequestReview={(status) => setReviewTarget({ id: entry.id, status, entry })} />)}</ul>}</section>
    <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} noun="events" />
    <ReviewDialog key={reviewTarget ? `${reviewTarget.id}:${reviewTarget.status}` : "closed"} target={reviewTarget} busy={reviewBusy} onClose={() => !reviewBusy && setReviewTarget(null)} onSubmit={submitReview} />
  </div>;
}

function MetricCard({ icon: Icon, label: title, value, hint, tone, onClick }: { icon: React.ElementType; label: string; value: number; hint: string; tone: "rose" | "amber" | "orange" | "indigo"; onClick: () => void }) {
  const tones = { rose: "bg-rose-50 text-rose-600", amber: "bg-amber-50 text-amber-700", orange: "bg-orange-50 text-orange-700", indigo: "bg-indigo-50 text-indigo-600" };
  return <button type="button" onClick={onClick} className={`${CARD} group flex w-full items-center gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:ring-2 hover:ring-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}><span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[tone]} transition-transform group-hover:scale-105`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="truncate text-xs font-bold text-slate-700">{title}</p><p className="truncate text-[11px] text-slate-400">{hint}</p></div></button>;
}

function ViewTab({ active, icon: Icon, label: title, count, onClick }: { active: boolean; icon: React.ElementType; label: string; count: number; onClick: () => void }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition sm:text-sm ${active ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}><Icon className="h-4 w-4" /><span>{title}</span><span className={`rounded-full px-2 py-0.5 text-[11px] ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span></button>;
}

function FilterField({ label: title, children, className }: { label: string; children: React.ReactNode; className?: string }) { return <label className={`flex min-w-0 flex-col gap-1 text-left ${className || ""}`}><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</span>{children}</label>; }

function EmptyState({ scope, filtered }: { scope: AuditScope; filtered: boolean }) {
  const title = scope === "flagged" ? "No flagged events" : scope === "pending" ? "No pending reviews" : filtered ? "No events match these filters" : "Nothing recorded yet";
  const text = scope === "flagged" ? "Device, location and policy flags will appear here." : scope === "pending" ? "All security events have been reviewed." : "Changes made in your workspace will appear here.";
  return <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><ShieldCheck className="h-6 w-6" /></span><p className="mt-4 text-sm font-bold text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{text}</p></div>;
}

function AuditRow({ entry, open, onToggle, onRequestReview }: { entry: AuditEntry; open: boolean; onToggle: () => void; onRequestReview: (status: ReviewStatus) => void }) {
  const details = useMemo(() => parseDetails(entry.details), [entry.details]);
  const when = stamp(entry.createdAt);
  const who = entry.actor?.name || entry.actor?.email || "Unknown user";
  const duplicate = entry.eventType === "DUPLICATE_DEVICE" || entry.eventType === "DEVICE_CONFLICT";
  const message = auditExplanation(entry, details);
  return <li><button type="button" onClick={onToggle} aria-expanded={open} className="grid w-full grid-cols-[82px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[145px_minmax(0,1fr)_auto] sm:gap-5"><span className="text-xs text-slate-500"><span className="block font-bold text-slate-700">{when.day}</span><span className="tabular-nums">{when.time}</span></span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${entry.action === "FLAGGED" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>{label(entry.action)}</span>{entry.riskLevel && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${riskTone(entry.riskLevel)}`}>{entry.riskLevel} risk</span>}{entry.reviewStatus && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${reviewTone(entry.reviewStatus)}`}>{label(entry.reviewStatus)}</span>}</span><span className="mt-1 block truncate text-sm font-bold text-slate-900">{message}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{entryOwnerName(entry)}{entry.deviceName ? ` · ${entry.deviceName}` : ""}</span></span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} /></button>{open && <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-5 py-5 text-sm">{duplicate && <DuplicateEvidence entry={entry} />}<dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3"><Item term="Done by" value={`${who}${entry.actor?.email && entry.actor.name !== entry.actor.email ? ` (${entry.actor.email})` : ""}`} /><Item term="From IP address" value={entry.ipAddress || "Not recorded"} mono /><Item term="Current employee / branch" value={entry.employee ? `${entryOwnerName(entry)} (${entry.employee.employeeCode || "no code"}) · ${entry.employee.branch?.name || "No branch"}` : "Not linked"} /><Item term="Device" value={entry.deviceName ? `${entry.deviceName}${entry.deviceId ? ` · ${entry.deviceId}` : ""}` : "Not recorded"} mono /><Item term="Event / risk" value={`${label(entry.eventType || entry.entity)} · ${entry.riskLevel || "Not rated"}`} /><Item term="Review status" value={entry.reviewStatus || "Not required"} /><Item term="Message" value={message} /><Item term="Record ID" value={entry.entityId || "—"} mono />{entry.attendanceId && <Item term="Attendance review" value={`Linked attendance: ${entry.attendanceId}`} mono />}</dl>{entry.reviewNote && <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Reviewer note</p><p className="mt-1 text-sm text-slate-700">{entry.reviewNote}</p></div>}{entry.reviewStatus === "PENDING" && <ReviewActions onReview={onRequestReview} />}</div>}</li>;
}

function DuplicateEvidence({ entry }: { entry: AuditEntry }) {
  const previousOwners = entry.previousOwners || [];
  return <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><MonitorSmartphone className="h-5 w-5" /></span><div><p className="font-bold text-slate-900">Device identity conflict</p><p className="mt-0.5 text-xs text-slate-500">The same device is registered to more than one employee.</p></div></div><span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">High risk</span></div><div className="mt-4 grid gap-3 md:grid-cols-2"><PersonEvidence title="Current employee" name={entryOwnerName(entry)} code={entry.employee?.employeeCode} branch={entry.employee?.branch?.name} current /><div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3"><p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Previously used by</p>{previousOwners.length ? previousOwners.map((owner, index) => <div key={`${owner.id || owner.employeeId || owner.name}-${index}`} className="mt-2 flex items-center gap-2"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-amber-700 ring-1 ring-amber-200"><UserRound className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{owner.name || "Unknown employee"}</p><p className="truncate text-xs text-slate-600">{owner.employeeCode || "No employee code"}{(owner.branchName || owner.branch?.name) ? ` · ${owner.branchName || owner.branch?.name}` : ""}</p></div></div>) : <p className="mt-2 text-sm text-amber-900">Previous employee information is not available.</p>}</div></div></div>;
}

function PersonEvidence({ title, name, code, branch, current }: { title: string; name: string; code?: string; branch?: string; current?: boolean }) {
  return <div className={`rounded-xl border p-3 ${current ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 bg-white"}`}><p className={`text-[11px] font-bold uppercase tracking-wider ${current ? "text-indigo-700" : "text-slate-400"}`}>{title}</p><div className="mt-2 flex items-center gap-2"><span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${current ? "bg-white text-indigo-600" : "bg-slate-100 text-slate-500"}`}><UserRound className="h-4 w-4" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{name}</p><p className="truncate text-xs text-slate-600">{code || "No employee code"}{branch ? ` · ${branch}` : ""}</p></div></div></div>;
}

function ReviewActions({ onReview }: { onReview: (status: ReviewStatus) => void }) {
  return <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4"><span className="mr-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-800"><ShieldAlert className="h-4 w-4" /> HR decision required</span><button type="button" onClick={() => onReview("APPROVED")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button><button type="button" onClick={() => onReview("REJECTED")} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"><XCircle className="h-3.5 w-3.5" />Reject</button><button type="button" onClick={() => onReview("FALSE_POSITIVE")} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-300">False positive</button></div>;
}

function ReviewDialog({ target, busy, onClose, onSubmit }: { target: ReviewTarget | null; busy: boolean; onClose: () => void; onSubmit: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  if (!target) return null;
  const title = target.status === "APPROVED" ? "Approve security event" : target.status === "REJECTED" ? "Reject security event" : "Mark as false positive";
  const tone = target.status === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700" : target.status === "REJECTED" ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-700 hover:bg-slate-800";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"><div className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Audit decision</p><h2 id="review-dialog-title" className="mt-1 text-lg font-bold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{friendlyMessage(target.entry, parseDetails(target.entry.details))}</p></div><button type="button" aria-label="Close" onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button></div><form onSubmit={(event) => { event.preventDefault(); void onSubmit(note); }}><div className="space-y-3 px-5 py-5"><div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><span className="font-bold text-slate-900">Employee:</span> {entryOwnerName(target.entry)}{target.entry.deviceName ? <><span className="mx-1">·</span><span className="font-bold text-slate-900">Device:</span> {target.entry.deviceName}</> : null}</div><label className="block"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Review note <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span></span><textarea autoFocus value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={4} placeholder="Explain why this event was reviewed..." className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" /></label><p className="text-right text-[11px] text-slate-400">{note.length}/1000</p></div><div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" disabled={busy} className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60 ${tone}`}>{busy ? "Saving..." : "Save decision"}</button></div></form></div></div>;
}

function Item({ term, value, mono }: { term: string; value: string; mono?: boolean }) { return <div className="min-w-0"><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{term}</dt><dd className={`mt-0.5 break-all text-slate-800 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>; }
