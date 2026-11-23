"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Copy, Maximize2, MessageCircle, Plus, Send, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { aiApi } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Message = { role: "user" | "assistant"; content: string };
type Person = { id: string; employeeCode: string; firstName: string; lastName?: string | null; department?: { name: string } | null; branch?: { name: string } | null; user?: { role?: string | null } | null; status: string };
const privilegedRoles = new Set(["SUPER_ADMIN", "COMPANY_ADMIN", "MANAGER", "HR"]);
const suggestions = ["What is my attendance status?", "How many leaves are remaining?", "Explain my latest payslip.", "Why is my punch-in not working?"];
const promptLibrary = [...suggestions, "What are my total working hours this month?", "Is my leave approved?", "How do I download my payslip?", "Explain my salary deductions.", "What documents are required for onboarding?", "What is the company leave policy?", "Show pending leave approvals.", "Which employee documents are incomplete?", "Show attendance anomalies.", "What payroll processing steps remain?"];

export default function AssistantWidget() {
  const { role } = useAuth();
  const pathname = usePathname();
  const fullScreen = pathname === "/assistant";
  const canSelectEmployee = Boolean(role && privilegedRoles.has(role));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Hello! I am your Clocked AI Assistant. I can help with attendance, leaves, payroll, policies, and HRMS features. How can I help?" }]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);
  useEffect(() => {
    if (!open || !canSelectEmployee || people.length) return;
    aiApi.people().then((res) => setPeople(Array.isArray(res?.data) ? res.data : [])).catch((e: any) => toast.error(e?.response?.data?.message || "Employees could not be loaded."));
  }, [open, canSelectEmployee, people.length]);

  const send = async (value = draft) => {
    const text = value.trim();
    if (!text || busy) return;
    setDraft("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await aiApi.chat(text, conversationId, selectedEmployeeId || undefined);
      setConversationId(res.data?.conversationId);
      setMessages((m) => [...m, res.data?.message || { role: "assistant", content: "I could not answer that." }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: e?.response?.data?.message || "The assistant is temporarily unavailable." }]);
    } finally { setBusy(false); }
  };

  const clear = () => { setConversationId(undefined); setSelectedEmployeeId(""); setMessages([{ role: "assistant", content: "New conversation started. What would you like to know?" }]); };
  const selectedName = people.find((person) => person.id === selectedEmployeeId);
  const employeeSuggestions = selectedName ? ["What attendance or leave issues does this employee have?", "Which documents or profile details are incomplete?"] : suggestions;
  const autocomplete = draft.trim().length > 0 ? promptLibrary.filter((item) => item.toLowerCase().includes(draft.trim().toLowerCase())).slice(0, 5) : [];

  return <>
    {(open || fullScreen) && <section aria-label="Clocked AI Assistant" className={fullScreen ? "absolute inset-0 z-40 flex min-h-full w-full flex-col overflow-hidden bg-white" : "fixed bottom-24 right-4 z-50 flex h-[min(680px,calc(100dvh-120px))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-indigo-100 bg-white shadow-2xl shadow-indigo-950/20"}>
      <header className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-white">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="rounded-xl bg-white/15 p-2"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-bold">Clocked AI Assistant</p><p className="text-[11px] text-indigo-100">Secure, role-aware HRMS help</p></div></div><div className="flex items-center gap-1"><button onClick={clear} title="New conversation" className="rounded-lg p-2 hover:bg-white/15"><Plus className="h-4 w-4" /></button>{!fullScreen && <Link href="/assistant" title="Open full assistant" className="rounded-lg p-2 hover:bg-white/15"><Maximize2 className="h-4 w-4" /></Link>}{fullScreen ? <Link href="/dashboard" title="Exit full screen" className="rounded-lg p-2 hover:bg-white/15"><X className="h-4 w-4" /></Link> : <button onClick={() => setOpen(false)} title="Close" className="rounded-lg p-2 hover:bg-white/15"><X className="h-4 w-4" /></button>}</div></div>
        {canSelectEmployee && <label className="mt-3 block"><span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-indigo-100">View employee issues</span><select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full rounded-xl border border-white bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-white focus:ring-2 focus:ring-white/40"><option value="" className="bg-white text-slate-900">My own HRMS information</option>{people.map((person) => <option key={person.id} value={person.id} className="bg-white text-slate-900">{person.firstName} {person.lastName || ""} - {person.employeeCode} - {person.user?.role || "EMPLOYEE"}{person.department?.name ? ` - ${person.department.name}` : ""}</option>)}</select>{selectedName && <span className="mt-1 block text-[10px] text-indigo-100">Selected: {selectedName.firstName} {selectedName.lastName || ""} - {selectedName.user?.role || "EMPLOYEE"}</span>}</label>}
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">{messages.map((m, i) => <div key={i} className={`group flex ${m.role === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${m.role === "user" ? "rounded-br-md bg-indigo-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700"}`}><div>{m.content}</div>{m.role === "assistant" && <button onClick={() => navigator.clipboard?.writeText(m.content).then(() => toast.success("Copied"))} className="mt-1 hidden items-center gap-1 text-[10px] text-slate-400 group-hover:flex"><Copy className="h-3 w-3" /> Copy</button>}</div></div>)}{busy && <div className="flex items-center gap-2 text-xs text-slate-500"><Bot className="h-4 w-4 text-indigo-500" /> Thinking...</div>}<div ref={endRef} /></div>
      {messages.length === 1 && <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-3 py-3">{employeeSuggestions.map((s) => <button key={s} onClick={() => void send(s)} className="rounded-full border border-indigo-100 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50">{s}</button>)}</div>}
      <div className="relative border-t border-slate-200 bg-white">
        {autocomplete.length > 0 && <div className="absolute bottom-full left-3 right-3 z-10 overflow-hidden rounded-2xl border border-indigo-100 bg-white p-1 shadow-xl shadow-slate-900/10">{autocomplete.map((item) => <button key={item} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setDraft(item)} className="block w-full rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">{item}</button>)}</div>}
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2 p-3"><textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 4000))} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={1} placeholder={selectedName ? `Ask about ${selectedName.firstName}...` : "Ask about your HRMS..."} className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50" /><button disabled={busy || !draft.trim()} className="rounded-xl bg-indigo-600 p-3 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></form>
      </div>
    </section>}
    {!fullScreen && <button aria-label="Open Clocked AI Assistant" onClick={() => setOpen((v) => !v)} className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 transition hover:scale-105 hover:bg-indigo-500">{open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}</button>}
  </>;
}
