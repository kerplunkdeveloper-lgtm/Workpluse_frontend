"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Check, Loader2, MapPin, Plus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { attendanceApi, correctionsApi, shootRequestsApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { unwrapList } from "@/lib/utils";
import RegularizationModal from "@/components/attendance/RegularizationModal";

const statusClass: Record<string, string> = { PENDING: "bg-amber-50 text-amber-700", APPROVED: "bg-emerald-50 text-emerald-700", REJECTED: "bg-rose-50 text-rose-700", CANCELLED: "bg-slate-100 text-slate-600" };
const prettyDate = (value: string) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default function ShootRequestsPanel({ canReview }: { canReview: boolean }) {
  const { user } = useAuth();
  const [mine, setMine] = useState<any[]>([]); const [team, setTeam] = useState<any[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(""); const [shootName, setShootName] = useState(""); const [location, setLocation] = useState(""); const [note, setNote] = useState("");
  const [employees, setEmployees] = useState<any[]>([]); const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const employeeId = user?.employee?.id;
  const [correctionAttendance, setCorrectionAttendance] = useState<any | null>(null);
  const [corrections, setCorrections] = useState<any[]>([]);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const results = await Promise.all([
        shootRequestsApi.getMine(),
        correctionsApi.getMyCorrections(),
        shootRequestsApi.getParticipants(),
        canReview ? shootRequestsApi.getAll({ status: "PENDING" }) : Promise.resolve(null),
        canReview ? shootRequestsApi.getAll({ status: "CANCELLATION_PENDING" }) : Promise.resolve(null),
      ]);
      setMine(unwrapList(results[0]));
      setCorrections(unwrapList(results[1]));
      const active = unwrapList(results[2]);
      setEmployees(active);
      if (employeeId) setSelectedIds((current) => current.includes(employeeId) ? current : [employeeId, ...current]);
      if (results[3] || results[4]) setTeam([...unwrapList(results[3]), ...unwrapList(results[4])]);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not load shoot requests");
    } finally {
      setLoading(false);
    }
  };
  const toggleEmployee = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);  useEffect(() => { load(); }, [canReview, employeeId]);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (!date || !shootName.trim() || !location.trim()) return toast.error("Date, shoot name and location are required"); if (!selectedIds.length) return toast.error("Select at least one employee for this shoot"); setSaving(true); try { await shootRequestsApi.create({ date, shootName, location, employeeIds: selectedIds, note: note || undefined }); toast.success("Shoot request sent for admin approval"); setDate(""); setShootName(""); setLocation(""); setNote(""); load(); } catch (e: any) { toast.error(e?.response?.data?.message || "Could not submit shoot request"); } finally { setSaving(false); } };
  const review = async (id: string, status: "APPROVED" | "REJECTED") => { try { await shootRequestsApi.review(id, { status }); toast.success(`Shoot request ${status.toLowerCase()}`); load(); } catch (e: any) { toast.error(e?.response?.data?.message || "Could not review request"); } };
  const reviewCancellation = async (id: string, status: "APPROVED" | "REJECTED") => { try { await shootRequestsApi.cancelReview(id, { status }); toast.success(`Shoot cancellation ${status.toLowerCase()}`); load(); } catch (e: any) { toast.error(e?.response?.data?.message || "Could not review cancellation"); } };
  const cancel = async (id: string) => { try { await shootRequestsApi.cancel(id); toast.success("Shoot request cancelled"); load(); } catch (e: any) { toast.error(e?.response?.data?.message || "Could not cancel request"); } };  const openShootCorrection = async (request: any) => {
    try {
      const dateKey = String(request.date).slice(0, 10);
      const response = await attendanceApi.getHistory({ from: dateKey, to: dateKey, limit: 20 });
      const rows = unwrapList<any>(response);
      const attendance = rows.find((row) => row.employeeId === employeeId && String(row.date).slice(0, 10) === dateKey);
      if (!attendance?.checkIn || !attendance?.checkOut) {
        toast.error("Complete Shoot Out before requesting a shoot-time change.");
        return;
      }
      setCorrectionAttendance(attendance);
      setCorrectionOpen(true);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not load the completed shoot attendance");
    }
  };
  const correctionFor = (request: any) => corrections.find((correction) => String(correction.date).slice(0, 10) === String(request.date).slice(0, 10));
  return <div className="space-y-5">
    <form onSubmit={submit} className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-4"><div><h3 className="font-bold text-slate-900">Request off-site shoot</h3><p className="mt-1 text-xs text-slate-600">Submit before the shoot. After approval, you can select Shoot while punching in from the shoot location.</p></div><div className="grid gap-3 md:grid-cols-3"><label className="text-xs font-semibold text-slate-600">Date<input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Shoot name<input value={shootName} onChange={e => setShootName(e.target.value)} placeholder="Project / scene" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label><label className="text-xs font-semibold text-slate-600">Location<input value={location} onChange={e => setLocation(e.target.value)} placeholder="Shoot location" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label></div><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700"><Users className="h-4 w-4 text-indigo-600" />Add people to this request</p><div className="grid max-h-44 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{employees.map((employee) => { const selected = selectedIds.includes(employee.id); return <label key={employee.id} className={selected ? "flex cursor-pointer items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs text-indigo-900" : "flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600"}><input type="checkbox" checked={selected} onChange={() => toggleEmployee(employee.id)} /><span>{employee.firstName} {employee.lastName || ""}</span></label>; })}</div></div><label className="block text-xs font-semibold text-slate-600">Note (optional)<textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Send for approval</button></form>
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-slate-900">My shoot requests</h3></div>{loading ? <div className="p-6 text-sm text-slate-500">Loading…</div> : mine.length ? <div className="divide-y divide-slate-100">{mine.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-slate-900">{r.shootName}</p><p className="mt-1 text-xs text-slate-500 flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" />{prettyDate(r.date)} <MapPin className="h-3.5 w-3.5" />{r.location}</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status}</span>{r.status === "PENDING" && <button type="button" onClick={() => cancel(r.id)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Cancel</button>}{r.status === "APPROVED" && !r.cancellationRequested && <button type="button" onClick={() => cancel(r.id)} className="rounded-lg border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-50">Request cancellation</button>}{r.status === "APPROVED" && r.cancellationRequested && <span className="text-[11px] font-semibold text-amber-700">Cancellation pending</span>}{r.status === "APPROVED" && <button type="button" onClick={() => openShootCorrection(r)} className="rounded-lg border border-indigo-200 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50">Edit shoot time</button>}</div></div>)}</div> : <p className="p-6 text-sm text-slate-500">No shoot requests yet.</p>}</section>
    {canReview && <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden"><div className="border-b border-slate-100 px-5 py-4"><h3 className="font-bold text-slate-900">Pending shoot approvals</h3></div>{team.length ? <div className="divide-y divide-slate-100">{team.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-slate-900">{r.employee?.firstName} {r.employee?.lastName} · {r.shootName}</p><p className="mt-1 text-xs text-slate-500">{prettyDate(r.date)} · {r.location}{r.note ? ` · ${r.note}` : ""}</p></div><div className="flex gap-2">{r.cancellationRequested ? <><button onClick={() => reviewCancellation(r.id, "APPROVED")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" />Approve cancel</button><button onClick={() => reviewCancellation(r.id, "REJECTED")} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><X className="h-3.5 w-3.5" />Reject cancel</button></> : <><button onClick={() => review(r.id, "APPROVED")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" />Approve</button><button onClick={() => review(r.id, "REJECTED")} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"><X className="h-3.5 w-3.5" />Reject</button></>}</div></div>)}</div> : <p className="p-6 text-sm text-slate-500">No pending shoot approvals.</p>}</section>}
    <RegularizationModal attendance={correctionAttendance} isOpen={correctionOpen} onClose={() => { setCorrectionOpen(false); setCorrectionAttendance(null); }} onSuccess={() => { load(); }} />
  </div>;
}
