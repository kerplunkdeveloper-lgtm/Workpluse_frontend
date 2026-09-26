"use client";

import React, { useEffect, useState } from "react";
import { chatApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import PageHeader from "@/components/ui/PageHeader";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

const toList = <T = any>(val: any): T[] => {
  if (Array.isArray(val)) return val;
  if (Array.isArray(val?.data?.records)) return val.data.records;
  if (Array.isArray(val?.records)) return val.records;
  if (Array.isArray(val?.data)) return val.data;
  const list = unwrapList<T>(val);
  return Array.isArray(list) ? list : [];
};

export default function ChatView() {
  const [teammates, setTeammates] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, th] = await Promise.all([chatApi.teammates(), chatApi.threads()]);
      setTeammates(toList(t));
      setThreads(toList(th));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load chat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    const tick = window.setInterval(() => {
      chatApi.messages(activeId).then((res) => setMessages(toList(res))).catch(() => {});
    }, 8000);
    return () => window.clearInterval(tick);
  }, [activeId]);

  const openThread = async (id: string) => {
    setActiveId(id);
    try {
      const res = await chatApi.messages(id);
      setMessages(toList(res));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load messages");
      setMessages([]);
    }
  };

  const startChat = async (userId: string) => {
    const res = await chatApi.open(userId);
    const thread = res?.data;
    if (thread?.id) {
      await load();
      openThread(thread.id);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !body.trim()) return;
    try {
      const res = await chatApi.send(activeId, body.trim());
      setBody("");
      setMessages((prev) => [...prev, res.data]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Send failed");
    }
  };

  const safeTeammates = Array.isArray(teammates) ? teammates : [];
  const safeThreads = Array.isArray(threads) ? threads : [];
  const safeMessages = Array.isArray(messages) ? messages : [];

  return (
    <div className="space-y-5">
      <PageHeader icon={MessageSquare} title="Team chat" description="Direct messages inside your organization." />
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading conversations…</div>}
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {!loading && !error && (
      <div className="grid md:grid-cols-[240px_1fr] gap-4 min-h-[480px]">
        <aside className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3">
          <p className="text-[11px] uppercase text-slate-500 font-semibold">Teammates</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {safeTeammates.length === 0 && <p className="text-xs text-slate-400 px-2">No teammates yet.</p>}
            {safeTeammates.map((u) => (
              <button
                key={u.id}
                onClick={() => startChat(u.id)}
                className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50"
              >
                <span className="flex items-center justify-between">
                  <span>{u.employee ? `${u.employee.firstName} ${u.employee.lastName || ""}` : u.email}</span>
                  <input
                    type="checkbox"
                    checked={groupMembers.includes(u.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      setGroupMembers((prev) => (prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]));
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </span>
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <input
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="Group name"
              className="w-full px-2 py-1.5 rounded-lg border text-xs"
            />
            <button
              onClick={async () => {
                const res = await chatApi.createGroup({ title: groupTitle, userIds: groupMembers });
                if (res?.data?.id) {
                  toast.success("Group created");
                  setGroupTitle("");
                  await load();
                  openThread(res.data.id);
                }
              }}
              className="w-full px-2 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold"
            >
              Create group
            </button>
          </div>
          <p className="text-[11px] uppercase text-slate-500 font-semibold">Threads</p>
          {safeThreads.length === 0 && <p className="text-xs text-slate-400 px-2">No threads yet.</p>}
          {safeThreads.map((t) => (
            <button
              key={t.id}
              onClick={() => openThread(t.id)}
              className={`w-full text-left text-xs px-2 py-1.5 rounded-lg ${activeId === t.id ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50"}`}
            >
              {t.title || t.members?.map((m: any) => m.user?.email).filter(Boolean).join(", ") || "Chat"}
            </button>
          ))}
        </aside>
        <section className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
          <div className="flex-1 space-y-2 overflow-y-auto text-sm">
            {safeMessages.length === 0 && <p className="text-xs text-slate-500">Pick a teammate to start.</p>}
            {safeMessages.map((m) => (
              <div key={m.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-500">{m.sender?.email}</p>
                <p>{m.body}</p>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Message"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
            <button className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">Send</button>
          </form>
        </section>
      </div>
      )}
    </div>
  );
}
