"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Plus, Send, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { webhooksApi } from "@/lib/api";

type Endpoint = { id: string; url: string; events: string[]; isActive: boolean; failureCount: number; lastDeliveredAt?: string | null };
const EVENTS = ["employee.created", "employee.updated", "attendance.updated", "leave.updated", "compoff.updated", "expense.updated", "payroll.finalized", "billing.payment_failed"];

export default function WebhooksSettings() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["*"]);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const result = await webhooksApi.list();
      setEndpoints(result?.data || []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Webhooks could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!url.trim()) return toast.error("Enter an HTTPS webhook URL.");
    setSaving(true);
    try {
      const result = await webhooksApi.create({ url: url.trim(), events });
      setEndpoints((current) => [result.data.endpoint, ...current]);
      setSecret(result.data.secret);
      setUrl("");
      toast.success("Webhook created. Copy the signing secret now.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Webhook could not be created.");
    } finally {
      setSaving(false);
    }
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    toast.success("Signing secret copied.");
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="rounded-2xl bg-indigo-50 p-2.5 text-indigo-600"><Webhook className="h-5 w-5" /></div>
        <div><h3 className="text-base font-semibold text-slate-900">Outbound webhooks</h3><p className="text-xs text-slate-500">Send signed workforce events to your HRIS, payroll, or data warehouse.</p></div>
      </div>
      {secret && <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"><span className="min-w-0 break-all"><strong>Copy this signing secret now:</strong> {secret}</span><button type="button" onClick={() => void copySecret()} className="shrink-0 rounded-lg border border-amber-300 bg-white p-2"><Copy className="h-4 w-4" /></button></div>}
      <div className="mt-4 space-y-3">
        <div className="flex gap-2"><input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-system.example/workpulse-webhook" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-900" /><button type="button" onClick={() => void create()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add</button></div>
        <div className="flex flex-wrap gap-2">{EVENTS.map((event) => <label key={event} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600"><input type="checkbox" checked={events.includes("*") || events.includes(event)} onChange={(e) => setEvents((current) => e.target.checked ? [...current.filter((item) => item !== "*"), event] : current.filter((item) => item !== event))} className="accent-indigo-600" />{event}</label>)}</div>
      </div>
      <div className="mt-5 space-y-2">{loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : endpoints.length === 0 ? <p className="text-xs text-slate-400">No webhook endpoints configured.</p> : endpoints.map((endpoint) => <div key={endpoint.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-800">{endpoint.url}</p><p className="mt-1 text-[11px] text-slate-500">{endpoint.events.includes("*") ? "All events" : endpoint.events.join(", ")} · {endpoint.failureCount ? `${endpoint.failureCount} failure(s)` : "Healthy"}</p></div><div className="flex shrink-0 items-center gap-2"><button type="button" onClick={async () => { try { await webhooksApi.test(endpoint.id); toast.success("Test webhook delivered."); await load(); } catch (error: any) { toast.error(error?.response?.data?.message || "Test webhook failed."); } }} className="rounded-lg p-2 text-indigo-600 hover:bg-indigo-50" aria-label="Send test webhook"><Send className="h-4 w-4" /></button><button type="button" onClick={async () => { try { await webhooksApi.remove(endpoint.id); setEndpoints((current) => current.filter((item) => item.id !== endpoint.id)); toast.success("Webhook removed."); } catch (error: any) { toast.error(error?.response?.data?.message || "Webhook could not be removed."); } }} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50" aria-label="Remove webhook"><Trash2 className="h-4 w-4" /></button>{endpoint.isActive && <Check className="h-4 w-4 text-emerald-600" />}</div></div>)}</div>
    </section>
  );
}
