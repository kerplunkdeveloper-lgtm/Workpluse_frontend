"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileCheck2, Loader2, MapPin, Receipt, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { policyApi, shootRequestsApi, shootSettlementsApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";

const money = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const hm = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100";
const statusClass: Record<string, string> = { PENDING: "bg-amber-50 text-amber-700", APPROVED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-rose-50 text-rose-700" };

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1.5"><span className="text-xs font-semibold text-slate-600">{label}</span><input className={inputClass} type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" /></label>;
}

export default function ShootSettlementPanel({ canReview = false }: { canReview?: boolean }) {
  const [shoots, setShoots] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>({ shootRecoveryThresholdMinutes: 720, shootRecoveryEnabled: true, shootTravelOtEnabled: true });
  const [selectedShootId, setSelectedShootId] = useState("");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [shootMinutes, setShootMinutes] = useState("");
  const [returnedNextDay, setReturnedNextDay] = useState(false);
  const [recoveryLeaveRequested, setRecoveryLeaveRequested] = useState(false);
  const [recoveryLeaveDate, setRecoveryLeaveDate] = useState("");
  const [employeeNote, setEmployeeNote] = useState("");
  const [allowances, setAllowances] = useState({ Lunch: "", Tiffin: "", Tea: "", Room: "" });
  const [expenses, setExpenses] = useState({ Transport: "", Fuel: "", Other: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState<string | null>(null);
  const [reviewValues, setReviewValues] = useState<Record<string, { shootOt: string; travelOt: string; allowance: string; expense: string; note: string }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [shootRes, settlementRes, policyRes] = await Promise.all([shootRequestsApi.getMine(), canReview ? shootSettlementsApi.getAll("PENDING") : shootSettlementsApi.getMine(), policyApi.get()]);
      setShoots(unwrapList(shootRes));
      setSettlements(unwrapList(settlementRes));
      setPolicy(policyRes?.policy || policyRes?.data || policyRes || {});
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not load shoot settlement"); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submittedIds = new Set(settlements.map((row) => row.shootRequestId));
  const eligibleShoots = shoots.filter((row) => row.status === "APPROVED" && !submittedIds.has(row.id));
  const selectedShoot = shoots.find((row) => row.id === selectedShootId);
  const travelMinutes = useMemo(() => {
    if (!travelStart || !travelEnd) return 0;
    const result = Math.round((new Date(travelEnd).getTime() - new Date(travelStart).getTime()) / 60000);
    return Math.max(0, Number.isFinite(result) ? result : 0);
  }, [travelStart, travelEnd]);
  const dutyMinutes = travelMinutes + Math.max(0, Number(shootMinutes) || 0);
  const recoveryEligible = Boolean(policy.shootRecoveryEnabled && returnedNextDay && dutyMinutes >= Number(policy.shootRecoveryThresholdMinutes || 720));
  const allowanceTotal = Object.values(allowances).reduce((sum, value) => sum + (Number(value) || 0), 0);
  const expenseTotal = Object.values(expenses).reduce((sum, value) => sum + (Number(value) || 0), 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedShoot) return toast.error("Choose an approved shoot first");
    if (!shootMinutes || !travelStart || !travelEnd) return toast.error("Add shoot hours and the complete travel time");
    if (returnedNextDay && recoveryEligible && recoveryLeaveRequested && !recoveryLeaveDate) return toast.error("Choose the recovery leave date");
    setSaving(true);
    try {
      const res = await shootSettlementsApi.create({ shootRequestId: selectedShoot.id, shootDate: selectedShoot.date, travelStart, travelEnd, returnedNextDay, shootMinutes: Number(shootMinutes), recoveryLeaveRequested, recoveryLeaveDate: recoveryLeaveDate || undefined, employeeNote, allowances: Object.entries(allowances).map(([category, amount]) => ({ category, amount })), expenses: Object.entries(expenses).map(([category, amount]) => ({ category, amount })) });
      if (!res?.success) throw new Error(res?.message || "Could not submit settlement");
      toast.success("Shoot settlement sent to HR");
      setSelectedShootId(""); setTravelStart(""); setTravelEnd(""); setShootMinutes(""); setReturnedNextDay(false); setRecoveryLeaveRequested(false); setRecoveryLeaveDate(""); setEmployeeNote(""); setAllowances({ Lunch: "", Tiffin: "", Tea: "", Room: "" }); setExpenses({ Transport: "", Fuel: "", Other: "" });
      await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || error?.message || "Could not submit settlement"); } finally { setSaving(false); }
  };

  const review = async (id: string, status: "APPROVED" | "REJECTED") => {
    setReviewSaving(id);
    const row = settlements.find((item) => item.id === id);
    const values = reviewValues[id];
    try {
      await shootSettlementsApi.review(id, { status, approvedShootOtMinutes: Number(values?.shootOt ?? row?.shootOvertimeMinutes ?? 0), approvedTravelOtMinutes: Number(values?.travelOt ?? row?.travelOvertimeMinutes ?? 0), approvedAllowanceAmount: Number(values?.allowance ?? Object.values(row?.allowances || {}).reduce((sum: number, item: any) => sum + Number(item?.amount || 0), 0)), approvedExpenseAmount: Number(values?.expense ?? Object.values(row?.expenses || {}).reduce((sum: number, item: any) => sum + Number(item?.amount || 0), 0)), reviewNote: values?.note || undefined });
      toast.success(status === "APPROVED" ? "Settlement approved and queued for payroll" : "Settlement rejected"); await load();
    } catch (error: any) { toast.error(error?.response?.data?.message || "Could not review settlement"); } finally { setReviewSaving(null); }
  };

  if (loading) return <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white py-16 text-slate-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading shoot settlements...</div>;

  return <div className="space-y-5">
    {!canReview && <form onSubmit={submit} className="overflow-hidden rounded-3xl border border-violet-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-violet-700 to-indigo-700 p-6 text-white"><div className="flex items-start gap-3"><Sparkles className="mt-1 h-6 w-6" /><div><h2 className="text-xl font-bold">Complete your shoot settlement</h2><p className="mt-1 max-w-2xl text-sm text-violet-100">Submit shoot hours, travel OT and company expenses separately. HR checks each section before anything reaches payroll.</p></div></div></div>
      <div className="space-y-6 p-5 sm:p-7">
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">1. Choose the approved shoot</span><select className={inputClass} value={selectedShootId} onChange={(e) => setSelectedShootId(e.target.value)}><option value="">Select an approved shoot</option>{eligibleShoots.map((shoot) => <option key={shoot.id} value={shoot.id}>{shoot.shootName} · {new Date(shoot.date).toLocaleDateString("en-IN")} · {shoot.location}</option>)}</select></label>
        {selectedShoot && <div className="grid gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm sm:grid-cols-3"><div><p className="text-[10px] font-bold uppercase text-indigo-600">Shoot</p><p className="mt-1 font-semibold text-indigo-950">{selectedShoot.shootName}</p></div><div><p className="text-[10px] font-bold uppercase text-indigo-600">Location</p><p className="mt-1 flex items-center gap-1 font-semibold text-indigo-950"><MapPin className="h-3.5 w-3.5" />{selectedShoot.location}</p></div><div><p className="text-[10px] font-bold uppercase text-indigo-600">Approved status</p><p className="mt-1 font-semibold text-emerald-700">Ready for settlement</p></div></div>}
        <section><div className="mb-3 flex items-center gap-2"><Clock3 className="h-5 w-5 text-violet-600" /><div><h3 className="font-bold text-slate-900">2. Shoot time</h3><p className="text-xs text-slate-500">Enter the total time you worked on the shoot. This is reviewed separately from travel.</p></div></div><label className="block max-w-sm space-y-1.5"><span className="text-xs font-semibold text-slate-600">Total shoot hours</span><input className={inputClass} type="number" min="0" step="0.25" value={shootMinutes ? Number(shootMinutes) / 60 : ""} onChange={(e) => setShootMinutes(String(Number(e.target.value || 0) * 60))} placeholder="Example: 10" /></label></section>
        <section><div className="mb-3 flex items-center gap-2"><Clock3 className="h-5 w-5 text-orange-600" /><div><h3 className="font-bold text-slate-900">3. Travel time & overtime</h3><p className="text-xs text-slate-500">Add the complete journey. Same-day return travel can become OT after HR approval. Next-day return travel is used for recovery eligibility, not automatic OT.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5"><span className="text-xs font-semibold text-slate-600">Travel started</span><input className={inputClass} type="datetime-local" value={travelStart} onChange={(e) => setTravelStart(e.target.value)} /></label><label className="space-y-1.5"><span className="text-xs font-semibold text-slate-600">Travel ended</span><input className={inputClass} type="datetime-local" value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)} /></label></div><div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl bg-orange-50 p-4 text-sm text-orange-950"><span><strong>{hm(travelMinutes)}</strong> travel time</span><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={returnedNextDay} onChange={(e) => setReturnedNextDay(e.target.checked)} /> I returned the next day</label></div></section>
        <section><div className="mb-3 flex items-center gap-2"><Receipt className="h-5 w-5 text-emerald-600" /><div><h3 className="font-bold text-slate-900">4. Allowances & expenses</h3><p className="text-xs text-slate-500">These are company reimbursements, not overtime. Add only amounts paid for this shoot.</p></div></div><div className="grid gap-4 sm:grid-cols-4">{Object.entries(allowances).map(([key, value]) => <NumberField key={key} label={`${key} allowance`} value={value} onChange={(next) => setAllowances((current) => ({ ...current, [key]: next }))} />)}</div><div className="mt-4 grid gap-4 sm:grid-cols-3">{Object.entries(expenses).map(([key, value]) => <NumberField key={key} label={`${key} expense`} value={value} onChange={(next) => setExpenses((current) => ({ ...current, [key]: next }))} />)}</div><p className="mt-3 text-right text-sm font-bold text-emerald-700">Claim total: {money(allowanceTotal + expenseTotal)}</p></section>
        {returnedNextDay && <section className={`rounded-2xl border p-4 ${recoveryEligible ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}><div className="flex items-start gap-3"><ShieldCheck className={`mt-0.5 h-5 w-5 ${recoveryEligible ? "text-emerald-600" : "text-slate-400"}`} /><div className="min-w-0 flex-1"><p className="font-bold text-slate-900">Recovery Leave</p><p className="mt-1 text-xs leading-5 text-slate-600">Total duty time: <strong>{hm(dutyMinutes)}</strong>. Company rule: next-day return + {hm(Number(policy.shootRecoveryThresholdMinutes || 720))} or more makes a full-day paid-if-eligible recovery leave available.</p>{recoveryEligible && <div className="mt-3 flex flex-wrap items-end gap-3"><label className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><input type="checkbox" checked={recoveryLeaveRequested} onChange={(e) => setRecoveryLeaveRequested(e.target.checked)} /> Claim full-day Recovery Leave</label>{recoveryLeaveRequested && <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Leave date</span><input className={inputClass} type="date" value={recoveryLeaveDate} onChange={(e) => setRecoveryLeaveDate(e.target.value)} /></label>}</div>}</div></div></section>}
        <label className="block space-y-1.5"><span className="text-sm font-semibold text-slate-800">Anything HR should know?</span><textarea className={inputClass} rows={3} value={employeeNote} onChange={(e) => setEmployeeNote(e.target.value)} placeholder="Explain unusual travel, missing punch, or a special expense..." /></label>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5"><p className="text-xs text-slate-500">HR approval is required. Approved OT goes to payroll; approved expenses are reimbursed separately.</p><button disabled={saving || !selectedShoot} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck2 className="h-4 w-4" />}Submit to HR</button></div>
      </div>
    </form>}
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900">{canReview ? "Shoot settlement approvals" : "My settlement history"}</h2><p className="mt-1 text-xs text-slate-500">{canReview ? "Approve shoot time, travel OT, expenses and recovery leave before payroll." : "Every category keeps its own approval status."}</p></div><button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Refresh</button></div>{settlements.length === 0 ? <div className="py-12 text-center text-sm text-slate-500">{canReview ? "No shoot settlements are waiting for review." : "Your submitted shoot settlements will appear here."}</div> : <div className="mt-5 space-y-3">{settlements.map((row) => <div key={row.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{row.shootRequest?.shootName || "Shoot settlement"}</p><p className="mt-1 text-xs text-slate-500">{row.employee ? `${row.employee.firstName} ${row.employee.lastName || ""} · ` : ""}{row.shootRequest?.location || ""} · {new Date(row.shootDate).toLocaleDateString("en-IN")}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass[row.status] || "bg-slate-100 text-slate-600"}`}>{row.status === "APPROVED" ? "Approved · payroll ready" : row.status}</span></div><div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-4"><span>Shoot: <strong>{hm(row.approvedShootMinutes ?? row.shootMinutes ?? 0)}</strong></span><span>Travel: <strong>{hm(row.approvedTravelOtMinutes ?? row.travelOvertimeMinutes ?? 0)} OT</strong></span><span>Claims: <strong>{money(Number(row.approvedAllowanceAmount || 0) + Number(row.approvedExpenseAmount || 0))}</strong></span><span>Recovery: <strong>{row.recoveryLeaveRequested ? (row.recoveryLeaveStatus === "APPROVED" ? "Approved" : "Requested") : "Not requested"}</strong></span></div>{canReview && row.status === "PENDING" && <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={reviewSaving === row.id} onClick={() => void review(row.id, "REJECTED")} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><XCircle className="h-4 w-4" />Reject</button><button type="button" disabled={reviewSaving === row.id} onClick={() => void review(row.id, "APPROVED")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><CheckCircle2 className="h-4 w-4" />{reviewSaving === row.id ? "Saving..." : "Approve & queue payroll"}</button></div>}</div>)}</div>}</section>
  </div>;
}
