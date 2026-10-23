"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Megaphone, Pin, PinOff, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { announcementsApi } from "@/lib/api";
import { todayLocalKey, unwrapList } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  isExpired?: boolean;
  expiresAt?: string | null;
  createdAt: string;
  createdByUserId?: string | null;
}

const CARD = "rounded-3xl border border-slate-200/90 bg-white shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)]";
const INPUT =
  "w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 transition hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const errorOf = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Company notice board: everyone reads, HR and admins post. Hidden entirely when there is nothing to show to an employee. */
export default function AnnouncementsCard() {
  const { role, user } = useAuth();
  const canPost = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER";
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(unwrapList<Announcement>(await announcementsApi.list()));
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePin = async (item: Announcement) => {
    try {
      await announcementsApi.update(item.id, { pinned: !item.pinned });
      void load();
    } catch (err) {
      toast.error(errorOf(err, "Could not update the announcement."));
    }
  };

  const remove = async (item: Announcement) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await announcementsApi.remove(item.id);
      toast.success("Announcement deleted.");
      void load();
    } catch (err) {
      toast.error(errorOf(err, "Could not delete the announcement."));
    }
  };

  if (loading) return <div className={`${CARD} skeleton-shimmer h-28`} aria-busy="true" />;
  if (failed && !canPost) return null;
  if (!items.length && !canPost) return null;

  const visible = showAll ? items : items.slice(0, 3);

  return (
    <section className={`${CARD} p-5 sm:p-6`} aria-labelledby="announcements-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Megaphone className="h-5 w-5" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">Notice board</p>
            <h2 id="announcements-title" className="text-lg font-semibold tracking-tight text-slate-950">Announcements</h2>
          </div>
        </div>
        {canPost && (
          <button type="button" onClick={() => setComposing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Post
          </button>
        )}
      </div>

      {failed ? (
        <p className="mt-4 text-sm text-slate-500">Announcements could not be loaded. <button type="button" onClick={() => void load()} className="font-semibold text-indigo-600 underline">Retry</button></p>
      ) : items.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">Nothing posted yet. Share a policy change, event or office notice with your team.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {visible.map((item) => {
            const mayChange = isAdmin || item.createdByUserId === user?.id;
            return (
              <li key={item.id} className={`rounded-2xl p-4 ring-1 ${item.pinned ? "bg-indigo-50/60 ring-indigo-200" : "bg-slate-50/70 ring-slate-200/70"} ${item.isExpired ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-950">
                      {item.pinned && <Pin className="h-3.5 w-3.5 text-indigo-600" aria-label="Pinned" />}
                      {item.title}
                      {item.isExpired && <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">Expired</span>}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{item.body}</p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Posted {when(item.createdAt)}
                      {item.expiresAt && !item.isExpired ? ` · until ${when(item.expiresAt)}` : ""}
                    </p>
                  </div>
                  {canPost && mayChange && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => void togglePin(item)} aria-label={item.pinned ? "Unpin" : "Pin to top"} title={item.pinned ? "Unpin" : "Pin to top"} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-indigo-600">
                        {item.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => void remove(item)} aria-label="Delete announcement" title="Delete" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 3 && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          {showAll ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}

      {composing && (
        <Composer
          onClose={() => setComposing(false)}
          onPosted={() => {
            setComposing(false);
            void load();
          }}
        />
      )}
    </section>
  );
}

function Composer({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [form, setForm] = useState({ title: "", body: "", expiresAt: "", pinned: false, notify: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const today = todayLocalKey();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await announcementsApi.create({
        title: form.title,
        body: form.body,
        pinned: form.pinned,
        notify: form.notify,
        // End of the chosen day, so "until 31 Oct" includes 31 Oct.
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
      });
      if (!res?.success) throw new Error(res?.message);
      const notified = res.data?.notified ?? 0;
      toast.success(notified ? `Posted and sent to ${notified} ${notified === 1 ? "person" : "people"}.` : "Announcement posted.");
      onPosted();
    } catch (err) {
      toast.error(errorOf(err, "Could not post the announcement."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="compose-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="compose-title" className="text-base font-semibold text-slate-950">New announcement</h2>
            <p className="mt-0.5 text-sm text-slate-500">Everyone in your company will see this on their dashboard.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Title</span>
          <input required autoFocus maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Office closed for Diwali" className={INPUT} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Message</span>
          <textarea required rows={4} maxLength={2000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className={INPUT} />
          <span className="block text-right text-[11px] text-slate-400">{form.body.length} / 2000</span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-600">Show until (optional)</span>
          <input type="date" min={today} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={INPUT} />
        </label>
        <div className="space-y-2 text-sm text-slate-700">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Pin to the top</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600" /> Send a notification to everyone</label>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Cancel</button>
          <button disabled={saving || !form.title.trim() || !form.body.trim()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Post announcement
          </button>
        </div>
      </form>
    </div>
  );
}
