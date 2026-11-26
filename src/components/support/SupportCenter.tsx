"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileWarning,
  LifeBuoy,
  Loader2,
  MessageCircle,
  MessageSquareText,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Ticket,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supportApi } from "@/lib/api";
import { Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, ThemeProvider, Typography } from "@mui/material";
import { createTheme } from "@mui/material/styles";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ON_USER" | "RESOLVED" | "CLOSED";
type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface SupportMessage {
  id: string;
  body: string;
  isInternal?: boolean;
  createdAt: string;
  author?: { id: string; name: string; role?: string } | null;
}

interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  description?: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  sourcePage?: string | null;
  createdAt: string;
  updatedAt: string;
  requester?: { id: string; name: string; email?: string } | null;
  assignedTo?: { id: string; name: string; email?: string } | null;
  messages?: SupportMessage[];
}

const CATEGORIES = [
  ["BUG", "Bug or broken screen"],
  ["ATTENDANCE", "Attendance or avatar"],
  ["PAYROLL", "Payroll or payslip"],
  ["PROFILE", "Profile or account"],
  ["LEAVE", "Leave or approval"],
  ["EMPLOYEE", "Employee management"],
  ["BILLING", "Billing or subscription"],
  ["OTHER", "Other question"],
] as const;

const QUICK_ISSUES = [
  { icon: FileWarning, tone: "indigo", title: "Something is broken", description: "A page, button, or workflow is not working as expected.", subject: "A screen or workflow is not working", category: "BUG", priority: "NORMAL" as TicketPriority },
  { icon: Clock3, tone: "amber", title: "Attendance issue", description: "Punches, timesheets, or attendance history look wrong.", subject: "Attendance information is incorrect", category: "ATTENDANCE", priority: "HIGH" as TicketPriority },
  { icon: MessageCircle, tone: "violet", title: "Payroll question", description: "Payslips, salary calculations, or payroll records need attention.", subject: "I need help with payroll or payslip", category: "PAYROLL", priority: "NORMAL" as TicketPriority },
] as const;

const FAQS = [
  ["How do I report a bug?", "Select Report an issue, choose Bug or broken screen, explain what you expected and what happened, then submit. The current page and browser details are captured automatically."],
  ["What happens after I submit?", "Your request gets a reference number immediately. HR or an admin can assign it, reply, change the status, and keep the full conversation in one place."],
  ["What priority should I choose?", "Use Normal for everyday help, High when work is blocked, and Urgent only for a major outage affecting multiple people."],
  ["Can I add more information later?", "Yes. Open the ticket from Your requests and reply with screenshots, employee codes, timestamps, or reproduction steps."],
] as const;

const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  OPEN: { label: "Open", className: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  IN_PROGRESS: { label: "In progress", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  WAITING_ON_USER: { label: "Waiting for you", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  RESOLVED: { label: "Resolved", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  CLOSED: { label: "Closed", className: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const PRIORITY_META: Record<TicketPriority, { label: string; className: string }> = {
  LOW: { label: "Low", className: "text-slate-500" },
  NORMAL: { label: "Normal", className: "text-indigo-600" },
  HIGH: { label: "High", className: "text-amber-600" },
  URGENT: { label: "Urgent", className: "text-rose-600" },
};

const supportTheme = createTheme({
  palette: { primary: { main: "#4f46e5" }, secondary: { main: "#7c3aed" }, background: { default: "#f8fafc" } },
  shape: { borderRadius: 16 },
  typography: { fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", button: { textTransform: "none", fontWeight: 700 } },
});

const extractList = (response: any): SupportTicket[] => response?.data?.tickets || response?.tickets || [];
const extractTicket = (response: any): SupportTicket | null => response?.data || response || null;
const formatDate = (value?: string) => value ? new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

function StatusBadge({ status }: { status: TicketStatus }) {
  const meta = STATUS_META[status] || STATUS_META.OPEN;
  const color = status === "RESOLVED" ? "success" : status === "IN_PROGRESS" ? "warning" : status === "WAITING_ON_USER" ? "info" : status === "CLOSED" ? "default" : "primary";
  return <Chip size="small" label={meta.label} color={color} variant="outlined" sx={{ fontWeight: 800, fontSize: 11 }} />;
}

function TicketRow({ ticket, selected, onClick }: { ticket: SupportTicket; selected: boolean; onClick: () => void }) {
  const priority = PRIORITY_META[ticket.priority] || PRIORITY_META.NORMAL;
  return (
    <button type="button" onClick={onClick} className={`w-full rounded-2xl border p-4 text-left transition ${selected ? "border-indigo-300 bg-indigo-50/70 shadow-sm" : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{ticket.subject}</p>
          <p className="mt-1 text-[11px] font-semibold tracking-wide text-slate-400">{ticket.reference} · {ticket.category.replaceAll("_", " ")}</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
        <span className={`font-bold ${priority.className}`}>{priority.label} priority</span>
        <span className="text-slate-400">Updated {formatDate(ticket.updatedAt)}</span>
      </div>
      {ticket.requester && <p className="mt-2 truncate text-xs text-slate-500">From {ticket.requester.name}</p>}
    </button>
  );
}

export default function SupportCenter() {
  const pathname = usePathname();
  const { user, role } = useAuth();
  const canManage = ["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"].includes(role || "");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [queue, setQueue] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [view, setView] = useState<"mine" | "queue">("mine");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replying, setReplying] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [internalReply, setInternalReply] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("BUG");
  const [priority, setPriority] = useState<TicketPriority>("NORMAL");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const activeTickets = view === "queue" ? queue : tickets;
  const openCount = activeTickets.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const resolvedCount = activeTickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const supportEmail = "vasanth@kerplunkmedia.com";

  const startTicket = (preset?: (typeof QUICK_ISSUES)[number]) => {
    if (preset) {
      setSubject(preset.subject);
      setDescription("");
      setCategory(preset.category);
      setPriority(preset.priority);
    }
    setShowCreate(true);
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const [mineResponse, queueResponse] = await Promise.all([
        supportApi.list({ scope: "mine" }),
        canManage ? supportApi.list({ scope: "queue" }) : Promise.resolve(null),
      ]);
      setTickets(extractList(mineResponse));
      if (queueResponse) setQueue(extractList(queueResponse));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Support tickets could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadTickets(); }, [canManage]);

  const openTicket = async (ticket: SupportTicket) => {
    setDetailLoading(true);
    try {
      const response = await supportApi.get(ticket.id);
      setSelected(extractTicket(response));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Ticket details could not be loaded.");
    } finally {
      setDetailLoading(false);
    }
  };

  const submitTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast.error("Add a short subject and explain the issue.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await supportApi.create({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        sourcePage: pathname || "/support",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        metadata: typeof window !== "undefined" ? { viewport: `${window.innerWidth}x${window.innerHeight}`, language: navigator.language } : undefined,
      });
      const created = extractTicket(response);
      if (created) setSelected(created);
      setSubject("");
      setDescription("");
      setCategory("BUG");
      setPriority("NORMAL");
      setShowCreate(false);
      toast.success(`Ticket ${created?.reference || "created"}. Support will follow up here.`);
      await loadTickets();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not create support ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !replyText.trim()) return;
    setReplying(true);
    try {
      await supportApi.reply(selected.id, replyText.trim(), internalReply);
      setReplyText("");
      setInternalReply(false);
      await openTicket(selected);
      await loadTickets();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Reply could not be sent.");
    } finally {
      setReplying(false);
    }
  };

  const updateTicket = async (payload: { status?: string; priority?: string }) => {
    if (!selected) return;
    try {
      await supportApi.update(selected.id, payload);
      await openTicket(selected);
      await loadTickets();
      toast.success("Ticket updated.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Ticket could not be updated.");
    }
  };

  const closeTicket = async () => {
    if (!selected) return;
    try {
      await supportApi.close(selected.id);
      await openTicket(selected);
      await loadTickets();
      toast.success("Ticket closed.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Ticket could not be closed.");
    }
  };

  const activeMessages = useMemo(() => selected?.messages || [], [selected]);

  return (
    <ThemeProvider theme={supportTheme}>
    <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-indigo-950/10 sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-300"><LifeBuoy className="h-4 w-4" /> Support Center</div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Help that follows the issue to resolution.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Report attendance, payroll, profile, or product problems. Every request keeps its history, owner, priority, and status in one place.</p>
          </div>
          <div className="flex flex-wrap gap-3"><Button type="button" onClick={() => startTicket()} variant="contained" color="primary" startIcon={<Plus className="h-4 w-4" />} sx={{ borderRadius: 3, px: 2.5, py: 1.3, boxShadow: "0 10px 24px rgba(79,70,229,.28)" }}>Report an issue</Button><Button component="a" href="/assistant" variant="outlined" startIcon={<Sparkles className="h-4 w-4" />} sx={{ borderRadius: 3, px: 2.5, py: 1.3, color: "white", borderColor: "rgba(255,255,255,.2)", "&:hover": { borderColor: "rgba(255,255,255,.5)", bgcolor: "rgba(255,255,255,.08)" } }}>Ask AI assistant</Button></div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600">Start with a shortcut</p><h2 className="mt-1 text-xl font-black text-slate-900">What do you need help with?</h2></div><a href="/assistant" className="hidden items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 sm:flex">Search help with AI <ArrowUpRight className="h-3.5 w-3.5" /></a></div>
         <div className="grid gap-3 md:grid-cols-3">{QUICK_ISSUES.map((item) => { const Icon = item.icon; return <Card key={item.title} component="button" type="button" onClick={() => startTicket(item)} elevation={0} sx={{ display: "flex", height: "100%", minHeight: 166, textAlign: "left", border: "1px solid #e2e8f0", borderRadius: 4, cursor: "pointer", transition: "transform .2s, box-shadow .2s, border-color .2s", "&:hover": { transform: "translateY(-3px)", boxShadow: "0 12px 30px rgba(15,23,42,.08)", borderColor: "#a5b4fc" } }}><CardContent sx={{ display: "flex", width: "100%", flexDirection: "column", p: { xs: 2.5, sm: 3 }, "&:last-child": { pb: { xs: 2.5, sm: 3 } } }}><Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-slate-400" /></Stack><Typography sx={{ mt: 1.5, fontSize: 14, lineHeight: 1.35, fontWeight: 800, color: "#0f172a" }}>{item.title}</Typography><Typography sx={{ mt: .75, fontSize: 12, lineHeight: 1.55, color: "#64748b" }}>{item.description}</Typography></CardContent></Card>; })}</div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">All tickets</span><Ticket className="h-4 w-4 text-indigo-500" /></div><p className="mt-3 text-3xl font-black text-slate-900">{activeTickets.length}</p><p className="mt-1 text-xs text-slate-500">Your support history</p></div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-amber-700">Needs attention</span><Clock3 className="h-4 w-4 text-amber-600" /></div><p className="mt-3 text-3xl font-black text-amber-900">{openCount}</p><p className="mt-1 text-xs text-amber-700">Open or in progress</p></div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Completed</span><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><p className="mt-3 text-3xl font-black text-emerald-900">{resolvedCount}</p><p className="mt-1 text-xs text-emerald-700">Resolved or closed</p></div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">How support works</p><h2 className="mt-1 text-xl font-black text-slate-900">A clear path from issue to answer</h2></div><div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"><Zap className="h-3.5 w-3.5" /> Context captured automatically</div></div><div className="mt-6 grid gap-4 md:grid-cols-3"><div className="relative rounded-2xl bg-slate-50 p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-black text-white">1</span><h3 className="mt-4 text-sm font-black text-slate-900">Describe</h3><p className="mt-1 text-xs leading-5 text-slate-500">Tell us the expected result, what happened, and who is affected.</p></div><div className="relative rounded-2xl bg-slate-50 p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-black text-white">2</span><h3 className="mt-4 text-sm font-black text-slate-900">Track</h3><p className="mt-1 text-xs leading-5 text-slate-500">HR or an admin triages priority, assigns ownership, and replies in the ticket.</p></div><div className="relative rounded-2xl bg-slate-50 p-4"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-black text-white">3</span><h3 className="mt-4 text-sm font-black text-slate-900">Resolve</h3><p className="mt-1 text-xs leading-5 text-slate-500">Confirm the fix, keep the record for audit, and close the request when complete.</p></div></div></section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(460px,1.15fr)]">
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-black text-slate-900">{view === "queue" ? "Workspace support queue" : "Your requests"}</h2><p className="mt-1 text-xs text-slate-500">{view === "queue" ? "Triage issues from people in your workspace." : "Follow every question from report to resolution."}</p></div>
            {canManage && <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold"><button type="button" onClick={() => setView("mine")} className={`rounded-lg px-3 py-1.5 ${view === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>My requests</button><button type="button" onClick={() => setView("queue")} className={`rounded-lg px-3 py-1.5 ${view === "queue" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>Queue</button></div>}
          </div>
          {loading ? <div className="flex items-center justify-center py-20 text-sm text-slate-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading support center…</div> : activeTickets.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center"><MessageSquareText className="mx-auto h-9 w-9 text-indigo-300" /><p className="mt-3 text-sm font-bold text-slate-800">No tickets yet</p><p className="mt-1 text-xs text-slate-500">When something goes wrong, report it here and we’ll keep the conversation attached to the issue.</p><button type="button" onClick={() => startTicket()} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white">Create your first ticket</button></div> : <div className="space-y-3">{activeTickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} selected={selected?.id === ticket.id} onClick={() => void openTicket(ticket)} />)}</div>}
        </section>

        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {!selected ? <div className="flex min-h-[430px] flex-col items-center justify-center text-center"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-600"><LifeBuoy className="h-8 w-8" /></div><h2 className="mt-5 text-lg font-black text-slate-900">Select a ticket</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Open a request from the left to see its activity, reply, and current owner.</p></div> : <div><div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black tracking-wider text-indigo-600">{selected.reference}</span><StatusBadge status={selected.status} /></div><h2 className="mt-2 text-xl font-black text-slate-900">{selected.subject}</h2><p className="mt-1 text-xs text-slate-500">{selected.category.replaceAll("_", " ")} · Created {formatDate(selected.createdAt)}{selected.sourcePage ? ` · From ${selected.sourcePage}` : ""}</p></div><button type="button" onClick={() => setSelected(null)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close ticket details"><X className="h-4 w-4" /></button></div>
            {canManage && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3"><ShieldCheck className="h-4 w-4 text-indigo-600" /><span className="mr-1 text-xs font-bold text-slate-600">Agent controls</span><select value={selected.status} onChange={(event) => void updateTicket({ status: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="WAITING_ON_USER">Waiting on user</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select><select value={selected.priority} onChange={(event) => void updateTicket({ priority: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select><span className="text-xs text-slate-500">{selected.assignedTo ? `Owner: ${selected.assignedTo.name}` : "Unassigned"}</span></div>}
            <div className="mt-5 max-h-[360px] space-y-3 overflow-y-auto pr-1">{detailLoading ? <div className="py-16 text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading conversation…</div> : activeMessages.map((message) => <div key={message.id} className={`rounded-2xl p-4 ${message.isInternal ? "border border-amber-200 bg-amber-50" : message.author?.id === user?.id ? "ml-8 bg-indigo-50" : "mr-8 bg-slate-50"}`}><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-700">{message.author?.name || "Support"}{message.isInternal && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">Internal</span>}</span><span className="text-[11px] text-slate-400">{formatDate(message.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p></div>)}</div>
            {selected.status !== "CLOSED" && <form onSubmit={sendReply} className="mt-5 border-t border-slate-100 pt-4"><textarea value={replyText} onChange={(event) => setReplyText(event.target.value)} rows={3} placeholder={internalReply ? "Write an internal note for your support team…" : "Write a reply or add more details…"} className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white" /><div className="mt-2 flex items-center justify-between gap-3"><div className="flex items-center gap-3"><button type="button" onClick={() => void closeTicket()} className="text-xs font-bold text-slate-500 hover:text-rose-600">Close ticket</button>{canManage && <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><input type="checkbox" checked={internalReply} onChange={(event) => setInternalReply(event.target.checked)} className="rounded border-slate-300 text-indigo-600" /> Internal note</label>}</div><button type="submit" disabled={replying || !replyText.trim()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{replying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} {internalReply ? "Add note" : "Send reply"}</button></div></form>}
          </div>}
        </section>
      </div>

       <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-black text-slate-900">Quick answers</h2></div><div className="mt-4 divide-y divide-slate-100">{FAQS.map(([question, answer], index) => <div key={question}><button type="button" onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-bold text-slate-800"><span>{question}</span><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${openFaq === index ? "rotate-180" : ""}`} /></button>{openFaq === index && <p className="-mt-1 pb-4 pr-6 text-xs leading-5 text-slate-500">{answer}</p>}</div>)}</div></div><div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 shadow-sm sm:p-6"><div className="flex items-center gap-2"><AlertCircle className="h-5 w-5 text-indigo-600" /><h2 className="text-lg font-black text-indigo-950">Before you submit</h2></div><ul className="mt-4 space-y-3 text-xs leading-5 text-indigo-950/75"><li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Mention the employee code or ticket reference, never a password.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Tell us the exact page and approximate time of the problem.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Add the expected result and the actual result.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />For payroll issues, include the pay period but never bank credentials.</li></ul><a href="/assistant" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100 hover:bg-indigo-50"><Sparkles className="h-4 w-4" /> Try AI guidance first</a><p className="mt-4 border-t border-indigo-200/60 pt-3 text-xs font-bold text-indigo-700">Support contact: <a href={`mailto:${supportEmail}`} className="underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900">{supportEmail}</a></p></div></section>

      <Dialog open={showCreate} onClose={() => !submitting && setShowCreate(false)} fullWidth maxWidth="md"><DialogTitle sx={{ fontWeight: 900, pb: 1 }}>Tell us what happened</DialogTitle><DialogContent dividers><Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>A clear subject and reproduction detail helps your HR or support team resolve it faster.</Typography><form id="support-ticket-form" onSubmit={submitTicket} className="space-y-4"><TextField label="Subject" value={subject} onChange={(event) => setSubject(event.target.value)} slotProps={{ htmlInput: { maxLength: 160 } }} autoFocus fullWidth placeholder="Example: Avatar is missing in Attendance" /><div className="grid gap-4 sm:grid-cols-2"><TextField select label="Category" value={category} onChange={(event) => setCategory(event.target.value)} fullWidth>{CATEGORIES.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField><TextField select label="Priority" value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)} fullWidth><MenuItem value="LOW">Low · General question</MenuItem><MenuItem value="NORMAL">Normal · Needs help</MenuItem><MenuItem value="HIGH">High · Work is blocked</MenuItem><MenuItem value="URGENT">Urgent · Major outage</MenuItem></TextField></div><TextField label="What happened?" value={description} onChange={(event) => setDescription(event.target.value)} slotProps={{ htmlInput: { maxLength: 5000 } }} multiline minRows={6} fullWidth placeholder="Tell us what you expected, what happened, and how we can reproduce it…" helperText={`${description.length}/5000 characters`} /></form></DialogContent><DialogActions sx={{ p: 2.5 }}><Button onClick={() => setShowCreate(false)} color="inherit" disabled={submitting}>Cancel</Button><Button form="support-ticket-form" type="submit" variant="contained" disabled={submitting} startIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}>{submitting ? "Creating…" : "Create ticket"}</Button></DialogActions></Dialog>
    </div>
    </ThemeProvider>
  );
}
