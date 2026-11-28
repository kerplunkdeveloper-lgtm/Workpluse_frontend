"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Clock3, Code2, Inbox, LifeBuoy, Loader2, MessageSquare, Search, ShieldCheck, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supportApi } from "@/lib/api";

type Status = "OPEN" | "IN_PROGRESS" | "WAITING_ON_USER" | "RESOLVED" | "CLOSED";
type Ticket = {
  id: string; reference: string; subject: string; description: string; category: string; priority: string; status: Status;
  sourcePage?: string | null; createdAt: string; updatedAt: string; organization?: { id: string; name: string } | null;
  requester?: { name: string; email?: string } | null; assignedTo?: { id: string; name: string } | null;
  messages?: Array<{ id: string; body: string; isInternal: boolean; createdAt: string; author?: { name: string } | null }>;
};

const listOf = (response: any): Ticket[] => response?.data?.tickets || response?.tickets || [];
const oneOf = (response: any): Ticket | null => response?.data || response || null;
const dateText = (value?: string) => value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
const statusLabel = (status: Status) => status.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());

export default function DeveloperSupportDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [filter, setFilter] = useState<"ALL" | Status>("ALL");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [resolution, setResolution] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setTickets(listOf(await supportApi.list({ scope: "queue" }))); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Support queue could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tickets.filter((ticket) => (filter === "ALL" || ticket.status === filter) && (!query || `${ticket.reference} ${ticket.subject} ${ticket.organization?.name || ""} ${ticket.requester?.name || ""}`.toLowerCase().includes(query)));
  }, [tickets, filter, search]);
  const counts = useMemo(() => ({ all: tickets.length, open: tickets.filter((t) => ["OPEN", "IN_PROGRESS", "WAITING_ON_USER"].includes(t.status)).length, resolved: tickets.filter((t) => ["RESOLVED", "CLOSED"].includes(t.status)).length }), [tickets]);

  const open = async (ticket: Ticket) => {
    try { setSelected(oneOf(await supportApi.get(ticket.id))); setReply(""); setResolution(""); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Ticket could not be opened."); }
  };
  const update = async (payload: { status?: string; priority?: string; assignedToId?: string | null }) => {
    if (!selected) return;
    setBusy(true);
    try { setSelected(oneOf(await supportApi.update(selected.id, payload))); await load(); toast.success("Ticket updated."); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Ticket update failed."); }
    finally { setBusy(false); }
  };
  const send = async (body: string, isInternal = false) => {
    if (!selected || !body.trim()) return;
    setBusy(true);
    try { await supportApi.reply(selected.id, body.trim(), isInternal); setReply(""); setInternal(false); await open(selected); await load(); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Reply could not be sent."); }
    finally { setBusy(false); }
  };
  const submitResolution = async () => {
    if (!selected || !resolution.trim()) { toast.error("Add the resolution details before submitting."); return; }
    setBusy(true);
    try { await supportApi.reply(selected.id, resolution.trim()); await supportApi.update(selected.id, { status: "RESOLVED" }); setResolution(""); await open(selected); await load(); toast.success(`${selected.reference} marked resolved.`); }
    catch (error: any) { toast.error(error?.response?.data?.message || "Resolution could not be submitted."); }
    finally { setBusy(false); }
  };

  return <main className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-indigo-300"><Code2 className="h-4 w-4" /> Developer operations</p><h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Resolve customer issues</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Review incoming requests across workspaces, reproduce the issue, reply with the fix, and submit a resolution for the customer.</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10"><Inbox className="h-4 w-4" /> Refresh queue</button></div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3"><Stat icon={<Inbox />} label="All incoming" value={counts.all} tone="indigo" /><Stat icon={<Clock3 />} label="Needs attention" value={counts.open} tone="amber" /><Stat icon={<CheckCircle2 />} label="Resolved / closed" value={counts.resolved} tone="emerald" /></div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-indigo-600">Support queue</p><h2 className="mt-1 text-xl font-black text-slate-900">Incoming customer requests</h2><p className="mt-1 text-xs text-slate-500">Every request keeps its workspace, reporter, priority, history, and resolution status.</p></div><div className="flex flex-col gap-2 sm:flex-row"><label className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reference, company or subject" className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 sm:w-72" /></label><select value={filter} onChange={(e) => setFilter(e.target.value as "ALL" | Status)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"><option value="ALL">All statuses</option><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_ON_USER">Waiting on user</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></div></div></section>

      <div className="grid gap-6 xl:grid-cols-[minmax(360px,.8fr)_minmax(0,1.2fr)]"><section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-center justify-between"><h2 className="text-base font-black text-slate-900">{visible.length} requests</h2><span className="text-xs text-slate-400">Newest activity first</span></div>{loading ? <div className="flex justify-center py-20 text-sm text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading queue…</div> : !visible.length ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center"><LifeBuoy className="mx-auto h-8 w-8 text-indigo-300" /><p className="mt-3 text-sm font-bold text-slate-800">No matching requests</p><p className="mt-1 text-xs text-slate-500">New customer issues will appear here automatically.</p></div> : <div className="space-y-2">{visible.map((ticket) => <button type="button" key={ticket.id} onClick={() => void open(ticket)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === ticket.id ? "border-indigo-300 bg-indigo-50/70 shadow-sm" : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-black text-slate-900">{ticket.subject}</p><p className="mt-1 truncate text-[11px] font-bold uppercase tracking-wider text-indigo-600">{ticket.reference} · {ticket.organization?.name || "Workspace"}</p></div><Badge value={ticket.status} /></div><div className="mt-3 flex items-center justify-between gap-3 text-[11px]"><span className={`font-black ${ticket.priority === "URGENT" ? "text-rose-600" : ticket.priority === "HIGH" ? "text-amber-600" : "text-slate-500"}`}>{ticket.priority} priority</span><span className="truncate text-slate-400">{ticket.requester?.name || "Unknown reporter"} · {dateText(ticket.updatedAt)}</span></div></button>)}</div>}</section>

        <section className="min-h-[560px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">{!selected ? <div className="flex min-h-[520px] flex-col items-center justify-center text-center"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><LifeBuoy className="h-8 w-8" /></div><h2 className="mt-5 text-lg font-black text-slate-900">Select a request</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Choose an incoming ticket to inspect the report, reply to the customer, claim ownership, or submit a resolution.</p></div> : <div><div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black tracking-wider text-indigo-600">{selected.reference}</span><Badge value={selected.status} /></div><h2 className="mt-2 text-xl font-black text-slate-900">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{selected.organization?.name || "Workspace"} · {selected.category.replaceAll("_", " ")} · From {selected.sourcePage || "support center"}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Close details"><X className="h-4 w-4" /></button></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3"><Info label="Reporter" value={selected.requester?.name || "Unknown"} /><Info label="Priority" value={selected.priority} /><Info label="Owner" value={selected.assignedTo?.name || "Unassigned"} /></div>
          <div className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-3"><ShieldCheck className="h-4 w-4 text-indigo-600" /><span className="mr-1 text-xs font-bold text-slate-600">Developer actions</span><button disabled={busy || selected.assignedTo?.id === user?.id} onClick={() => void update({ assignedToId: user?.id, status: "IN_PROGRESS" })} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"><UserCheck className="h-3.5 w-3.5" />{selected.assignedTo?.id === user?.id ? "Claimed by me" : "Claim ticket"}</button><select disabled={busy} value={selected.status} onChange={(e) => void update({ status: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold"><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_ON_USER">Waiting on user</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select><select disabled={busy} value={selected.priority} onChange={(e) => void update({ priority: e.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold"><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></div>
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-500">Original report</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.description}</p></div>
          <div className="mt-5 max-h-[300px] space-y-3 overflow-y-auto pr-1">{(selected.messages || []).map((message) => <div key={message.id} className={`rounded-2xl p-3 ${message.isInternal ? "border border-amber-200 bg-amber-50" : "bg-slate-50"}`}><div className="flex justify-between gap-3 text-xs font-bold text-slate-700"><span>{message.author?.name || "Support"}{message.isInternal && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">Internal</span>}</span><span className="text-[11px] font-normal text-slate-400">{dateText(message.createdAt)}</span></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p></div>)}</div>
          {selected.status !== "CLOSED" && <div className="mt-5 space-y-3 border-t border-slate-100 pt-4"><textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} placeholder="Write the fix, deployed change, workaround, or next action…" className="w-full resize-none rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 text-sm outline-none focus:border-emerald-400" /><button disabled={busy || !resolution.trim()} onClick={() => void submitResolution()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Submit resolution</button><div className="flex gap-2"><textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Reply or add an internal note…" className="min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-400" /><div className="flex flex-col gap-2"><label className="flex items-center gap-1 text-[11px] font-bold text-slate-500"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />Internal</label><button disabled={busy || !reply.trim()} onClick={() => void send(reply, internal)} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black text-white disabled:opacity-50">Send</button></div></div></div>}
        </div>}</section>
      </div>
    </div>
  </main>;
}

function Badge({ value }: { value: string }) { return <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${value === "URGENT" ? "bg-rose-50 text-rose-700" : value === "RESOLVED" || value === "CLOSED" ? "bg-emerald-50 text-emerald-700" : value === "IN_PROGRESS" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-700"}`}>{statusLabel(value as Status)}</span>; }
function Stat({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: "indigo" | "amber" | "emerald" }) { const colors = { indigo: "bg-indigo-50 text-indigo-600", amber: "bg-amber-50 text-amber-600", emerald: "bg-emerald-50 text-emerald-600" }; return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className={`grid h-9 w-9 place-items-center rounded-xl ${colors[tone]}`}>{icon}</span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-3xl font-black text-slate-900">{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-bold text-slate-800">{value}</p></div>; }
