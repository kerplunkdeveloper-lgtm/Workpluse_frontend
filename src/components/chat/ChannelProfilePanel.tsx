"use client";

import React, { useEffect, useState } from "react";
import { Bell, Hash, Loader2, Mail, Save, Trash2, UserRound, Users, X } from "lucide-react";
import { toast } from "sonner";
import { chatApi } from "@/lib/api";
import { Person, Thread } from "./chatTypes";
import { personName, roleLabel } from "./chatUtils";
import { Avatar } from "./ChatAvatar";
import { confirmDialog } from "@/components/ui/confirmDialog";

export function ChannelProfilePanel({
  thread,
  canManage,
  onClose,
  onUpdated,
  onDeleted,
  profilePerson,
}: {
  thread: Thread;
  canManage: boolean;
  onClose: () => void;
  onUpdated: (title: string) => void;
  onDeleted: () => void;
  profilePerson?: Person | null;
}) {
  const [title, setTitle] = useState(thread.title || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isDirect = thread.isDirect === true;
  const directUser = profilePerson || thread.members?.[0]?.user;
  const displayName = isDirect ? personName(directUser) : `#${thread.title || "General"}`;
  const memberCount = thread.members?.length || 0;

  useEffect(() => setTitle(thread.title || ""), [thread.title]);

  const save = async () => {
    const clean = title.trim();
    if (!clean || clean === thread.title) return;
    setSaving(true);
    try {
      await chatApi.updateGroup(thread.id, { title: clean });
      onUpdated(clean);
      toast.success("Channel profile updated");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Channel could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirmDialog({
      title: `Delete #${thread.title || "channel"}?`,
      message: "This permanently removes the channel, its members, and its messages.",
      confirmLabel: "Delete channel",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await chatApi.deleteGroup(thread.id);
      toast.success("Channel deleted");
      onDeleted();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Channel could not be deleted.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="channel-profile-title" onClick={(e) => e.stopPropagation()} className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <header className="relative overflow-hidden border-b border-slate-100 px-6 pb-6 pt-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
          <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative"><Avatar label={isDirect ? displayName : thread.title || "Channel"} channel={!isDirect} size="lg" />{isDirect && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">{isDirect ? "Team member" : "Channel profile"}</p>
              <h2 id="channel-profile-title" className="mt-1 truncate text-lg font-bold text-slate-950">{displayName}</h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {isDirect ? "Available to chat" : `${memberCount} members`}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close channel profile" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">People</p><p className="mt-1 text-lg font-bold text-slate-950">{memberCount}</p></div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Created</p><p className="mt-1 text-sm font-bold text-slate-950">{thread.createdAt ? new Date(thread.createdAt).toLocaleDateString([], { day: "numeric", month: "short" }) : "Recently"}</p></div>
          </div>

          {isDirect ? (
            <section className="rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-slate-100">
              <div className="flex items-center gap-3 px-4 py-4"><Avatar label={displayName} size="md" /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{displayName}</p><p className="truncate text-xs text-slate-500">{roleLabel(directUser?.role) || "Team member"}</p></div></div>
              <div className="space-y-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-600"><p className="flex items-center gap-2"><Mail className="h-4 w-4 text-indigo-600" /> {directUser?.email || "Workplace contact"}</p><p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-indigo-600" /> {directUser?.employee?.department?.name || "Workforce team"}</p></div>
            </section>
          ) : canManage && (
            <section>
              <label htmlFor="channel-profile-name" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Channel name</label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">
                <Hash className="h-4 w-4 text-slate-400" />
                <input id="channel-profile-name" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm font-semibold text-slate-900 outline-none" />
                <button type="button" onClick={() => void save()} disabled={saving || !title.trim() || title.trim() === thread.title} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">HR and workspace managers can keep the channel name current.</p>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Users className="h-4 w-4 text-indigo-600" /> {isDirect ? "Conversation details" : "Members"}</h3><span className="text-xs font-semibold text-slate-500">{memberCount}</span></div>
            <ul className="space-y-2">
              {(thread.members || []).map((member) => {
                const user = member.user;
                return <li key={member.userId || user?.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5"><Avatar label={personName(user)} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{personName(user)}</span><span className="block truncate text-xs text-slate-500">{[roleLabel(user?.role), user?.employee?.department?.name || user?.email].filter(Boolean).join(" · ")}</span></span><span className="h-2 w-2 rounded-full bg-emerald-500" /></li>;
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4"><div className="flex items-start gap-3"><Bell className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /><div><p className="text-xs font-bold text-indigo-950">Stay in the loop</p><p className="mt-1 text-xs leading-5 text-indigo-800/80">{isDirect ? "Keep this conversation easy to find from your recent chats." : "This space keeps project updates and decisions together for the whole team."}</p></div></div></section>
        </div>

        {canManage && !isDirect && <footer className="border-t border-slate-100 px-6 py-5"><button type="button" onClick={() => void remove()} disabled={deleting} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete channel"}</button></footer>}
      </aside>
    </div>
  );
}
