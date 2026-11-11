"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Coins, Loader2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { overtimeAllocationApi } from "@/lib/api";
import { unwrapItem } from "@/lib/utils";

const hm = (minutes: number) => `${Math.floor(Math.max(0, minutes) / 60)}h ${String(Math.max(0, minutes) % 60).padStart(2, "0")}m`;

export default function OvertimeAllocationPanel() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const [balance, setBalance] = useState<any>(null);
  const [permission, setPermission] = useState(0);
  const [leave, setLeave] = useState(0);
  const [compOff, setCompOff] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const nextBalance = unwrapItem<any>(await overtimeAllocationApi.getMine(month, year));
      setBalance(nextBalance);
      const allocation = nextBalance?.allocation;
      if (allocation) {
        setPermission(Number(allocation.permissionMinutes || 0));
        setLeave(Number(allocation.leaveMinutes || 0));
        setCompOff(Number(allocation.compOffMinutes || 0));
        setNote(allocation.employeeNote || "");
      }
    }
    catch (error: any) { toast.error(error?.response?.data?.message || "Could not load monthly overtime balance"); }
  };
  useEffect(() => { void load(); }, []);

  const approved = Number(balance?.approvedMinutes || 0);
  const nonCash = permission + leave + compOff;
  const cash = Math.max(0, approved - nonCash);
  const allocation = balance?.allocation;
  const settledPermission = Number(allocation?.settledPermissionMinutes ?? (allocation?.status === "APPROVED" ? allocation?.permissionMinutes : 0));
  const settledLeave = Number(allocation?.settledLeaveMinutes ?? (allocation?.status === "APPROVED" ? allocation?.leaveMinutes : 0));
  const settledCompOff = Number(allocation?.settledCompOffMinutes ?? (allocation?.status === "APPROVED" ? allocation?.compOffMinutes : 0));
  const valid = nonCash <= approved && permission >= settledPermission && leave >= settledLeave && compOff >= settledCompOff;
  const submit = async () => {
    if (!valid) return toast.error("Your conversion choices cannot exceed the approved overtime balance.");
    setSaving(true);
    try { await overtimeAllocationApi.submit({ month, year, permissionMinutes: permission, leaveMinutes: leave, compOffMinutes: compOff, employeeNote: note }); toast.success("Monthly overtime choice sent to HR"); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Could not submit overtime choice"); }
    finally { setSaving(false); }
  };

  return <section className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm sm:p-6">
    <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white"><WalletCards className="h-5 w-5" /></span><div><h2 className="text-lg font-black text-indigo-950">Monthly overtime choice</h2><p className="mt-1 text-xs leading-5 text-indigo-800">Use approved OT as permission, leave or comp-off. Only the remaining hours go to payroll as cash OT.</p></div></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-4"><div className="rounded-2xl bg-white p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Approved OT</p><p className="mt-1 text-lg font-black text-indigo-900">{hm(approved)}</p></div><label className="rounded-2xl bg-white p-3"><span className="text-[10px] font-bold uppercase text-slate-500">Permission hours</span><input type="number" min="0" step="0.25" value={permission / 60} onChange={(e) => setPermission(Math.round(Math.max(0, Number(e.target.value) || 0) * 60))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label><label className="rounded-2xl bg-white p-3"><span className="text-[10px] font-bold uppercase text-slate-500">OT leave hours</span><input type="number" min="0" step="4" value={leave / 60} onChange={(e) => setLeave(Math.round(Math.max(0, Number(e.target.value) || 0) / 4) * 240)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /><span className="mt-1 block text-[10px] text-slate-500">8 hours = 1 OT Leave day</span></label><label className="rounded-2xl bg-white p-3"><span className="text-[10px] font-bold uppercase text-slate-500">Comp-off hours</span><input type="number" min="0" step="4" value={compOff / 60} onChange={(e) => setCompOff(Math.round(Math.max(0, Number(e.target.value) || 0) / 4) * 240)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" /></label></div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm"><span className="flex items-center gap-2 font-semibold text-slate-700"><Coins className="h-4 w-4 text-emerald-600" />Cash OT to payroll</span><strong className={valid ? "text-emerald-700" : "text-rose-700"}>{hm(cash)}{!valid ? " · exceeds balance" : ""}</strong></div>
    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Optional note for HR" className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Status: <strong>{allocation?.status || "Not submitted"}</strong>. You can claim additional leave or comp-off before payroll; already approved claims cannot be reduced.</p><button type="button" onClick={() => void submit()} disabled={saving || !approved || !valid} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{allocation?.status === "APPROVED" ? "Submit additional claim" : "Submit monthly choice"}</button></div>
  </section>;
}
