"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { chatApi } from "@/lib/api";
import { unwrapList } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  Check,
  Hash,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Person {
  id: string;
  email?: string;
  role?: string;
  employee?: { firstName?: string; lastName?: string; employeeCode?: string } | null;
}

interface ChatMessage {
  id: string;
  body: string;
  createdAt: string;
  senderUserId?: string;
  sender?: Person | null;
}

interface Thread {
  id: string;
  title?: string | null;
  isDirect?: boolean;
  createdAt?: string;
  updatedAt?: string;
  members?: Array<{ userId?: string; user?: Person | null }>;
  messages?: ChatMessage[];
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 30;
const MESSAGE_PAGE_SIZE = 50;
const MAX_MESSAGE_LENGTH = 4000;

const toList = <T,>(val: unknown): T[] => {
  const v = val as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data?.records)) return v.data.records;
  if (Array.isArray(v?.records)) return v.records;
  if (Array.isArray(v?.data)) return v.data;
  const list = unwrapList<T>(val);
  return Array.isArray(list) ? list : [];
};

const metaOf = (val: unknown): { totalPages: number; total: number } => {
  const v = val as any;
  const d = v?.data && !Array.isArray(v.data) ? v.data : v;
  return { totalPages: Number(d?.totalPages) || 1, total: Number(d?.total) || 0 };
};

const personName = (u?: Person | null) => {
  const full = `${u?.employee?.firstName || ""} ${u?.employee?.lastName || ""}`.trim();
  return full || u?.email || "Teammate";
};

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || "?").slice(0, 2).toUpperCase();
};

const roleLabel = (role?: string) =>
  role === "COMPANY_ADMIN" || role === "SUPER_ADMIN" ? "Admin" : role === "MANAGER" ? "HR" : role ? "Employee" : "";

const timeOf = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const dayLabel = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

/** Compact label for the sidebar: time today, otherwise a short date. */
const listStamp = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toDateString() === new Date().toDateString()
    ? timeOf(iso)
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Server-side people search with paging, so it works for any workspace size. */
function usePeopleSearch(term: string, minChars: number, enabled = true) {
  const [state, setState] = useState({ people: [] as Person[], page: 1, totalPages: 1, loading: false });

  useEffect(() => {
    if (!enabled || term.length < minChars) {
      queueMicrotask(() => setState({ people: [], page: 1, totalPages: 1, loading: false }));
      return;
    }
    let cancelled = false;
    queueMicrotask(() => setState((s) => ({ ...s, loading: true })));
    chatApi
      .teammates({ search: term || undefined, page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setState({ people: toList<Person>(res), page: 1, totalPages: metaOf(res).totalPages, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [term, minChars, enabled]);

  const loadMore = useCallback(async () => {
    if (state.loading || state.page >= state.totalPages) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const next = state.page + 1;
      const res = await chatApi.teammates({ search: term || undefined, page: next, limit: PAGE_SIZE });
      setState((s) => ({
        people: [...s.people, ...toList<Person>(res).filter((p) => !s.people.some((q) => q.id === p.id))],
        page: next,
        totalPages: metaOf(res).totalPages,
        loading: false,
      }));
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [state.loading, state.page, state.totalPages, term]);

  return { ...state, hasMore: state.page < state.totalPages, loadMore };
}

function Avatar({ label, channel = false, size = "md" }: { label: string; channel?: boolean; size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "h-8 w-8 text-[11px] rounded-xl" : size === "lg" ? "h-11 w-11 text-sm rounded-2xl" : "h-10 w-10 text-xs rounded-xl";
  return channel ? (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100`}>
      <Hash className="h-4 w-4" />
    </span>
  ) : (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center bg-slate-100 font-bold tracking-wide text-slate-700 border border-slate-200`}>
      {initialsOf(label)}
    </span>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */

export default function ChatView() {
  const { user } = useAuth();
  const me = user?.id;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [workspaceSize, setWorkspaceSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgPage, setMsgPage] = useState(1);
  const [msgTotalPages, setMsgTotalPages] = useState(1);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"ALL" | "CHANNELS" | "DIRECT">("ALL");
  const debouncedQuery = useDebounced(query.trim(), 300);
  const peopleSearch = usePeopleSearch(debouncedQuery, 2);

  const [channelOpen, setChannelOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const prependAnchor = useRef<number | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  /* Data loading */
  const loadThreads = useCallback(async () => {
    try {
      const res = await chatApi.threads();
      setThreads(toList<Thread>(res));
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err.response?.data?.message || "Chat could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadThreads());
    chatApi
      .teammates({ limit: 1 })
      .then((res) => setWorkspaceSize(metaOf(res).total))
      .catch(() => undefined);
    const interval = window.setInterval(loadThreads, 20000);
    return () => window.clearInterval(interval);
  }, [loadThreads]);

  const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]) => {
    const byId = new Map(existing.map((m) => [m.id, m]));
    incoming.forEach((m) => byId.set(m.id, m));
    return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const openThread = useCallback(async (threadId: string) => {
    activeIdRef.current = threadId;
    setActiveId(threadId);
    setMessages([]);
    setMsgPage(1);
    setMsgTotalPages(1);
    stickToBottom.current = true;
    setLoadingMessages(true);
    try {
      const res = await chatApi.messages(threadId, { page: 1, limit: MESSAGE_PAGE_SIZE });
      if (activeIdRef.current !== threadId) return;
      setMessages(toList<ChatMessage>(res));
      setMsgTotalPages(metaOf(res).totalPages);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Messages could not be loaded.");
    } finally {
      if (activeIdRef.current === threadId) setLoadingMessages(false);
      setTimeout(() => composerRef.current?.focus(), 80);
    }
  }, []);

  const loadOlder = async () => {
    if (!activeId || loadingOlder || msgPage >= msgTotalPages) return;
    const el = scrollRef.current;
    setLoadingOlder(true);
    try {
      const next = msgPage + 1;
      const res = await chatApi.messages(activeId, { page: next, limit: MESSAGE_PAGE_SIZE });
      if (el) prependAnchor.current = el.scrollHeight - el.scrollTop;
      setMessages((current) => mergeMessages(current, toList<ChatMessage>(res)));
      setMsgPage(next);
      setMsgTotalPages(metaOf(res).totalPages);
    } catch {
      toast.error("Earlier messages could not be loaded.");
    } finally {
      setLoadingOlder(false);
    }
  };

  // Poll only the newest page and merge, so loaded history is never discarded.
  useEffect(() => {
    if (!activeId) return undefined;
    const interval = window.setInterval(() => {
      chatApi
        .messages(activeId, { page: 1, limit: MESSAGE_PAGE_SIZE })
        .then((res) => {
          if (activeIdRef.current !== activeId) return;
          setMessages((current) => mergeMessages(current, toList<ChatMessage>(res)));
        })
        .catch(() => undefined);
    }, 6000);
    return () => window.clearInterval(interval);
  }, [activeId]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (prependAnchor.current !== null) {
      el.scrollTop = el.scrollHeight - prependAnchor.current;
      prependAnchor.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loadingMessages]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  /* Derived lists */
  const sortedThreads = useMemo(() => {
    // Collapse duplicate channel titles, keep the most recently active copy.
    const seen = new Map<string, Thread>();
    const stamp = (t: Thread) => new Date(t.updatedAt || t.createdAt || 0).getTime();
    for (const t of threads) {
      if (!t?.id) continue;
      const key = t.isDirect ? `dm-${t.id}` : `ch-${(t.title || "").toLowerCase().trim()}`;
      const prev = seen.get(key);
      if (!prev || stamp(t) > stamp(prev)) seen.set(key, t);
    }
    return [...seen.values()].sort((a, b) => stamp(b) - stamp(a));
  }, [threads]);

  const otherMember = useCallback(
    (t: Thread) => t.members?.find((m) => (m.user?.id || m.userId) !== me)?.user || null,
    [me],
  );

  const describe = useCallback(
    (t: Thread) => {
      if (!t.isDirect) {
        const count = t.members?.length || 0;
        return { title: t.title || "General", subtitle: `${count} ${count === 1 ? "member" : "members"}`, channel: true };
      }
      const other = otherMember(t);
      return { title: personName(other), subtitle: roleLabel(other?.role) || other?.email || "Direct message", channel: false };
    },
    [otherMember],
  );

  const q = query.trim().toLowerCase();
  const channels = sortedThreads.filter((t) => !t.isDirect && (!q || (t.title || "").toLowerCase().includes(q)));
  const directs = sortedThreads.filter((t) => t.isDirect && (!q || describe(t).title.toLowerCase().includes(q)));
  const channelCount = sortedThreads.filter((t) => !t.isDirect).length;
  const directCount = sortedThreads.filter((t) => t.isDirect).length;

  const activeThread = sortedThreads.find((t) => t.id === activeId) || null;
  const activeInfo = activeThread ? describe(activeThread) : null;

  /* Actions */
  const startDirect = async (person: Person) => {
    const existing = sortedThreads.find((t) => t.isDirect && t.members?.some((m) => (m.user?.id || m.userId) === person.id));
    if (existing) {
      setQuery("");
      void openThread(existing.id);
      return;
    }
    try {
      const res = await chatApi.open(person.id);
      const thread = res?.data;
      if (thread?.id) {
        await loadThreads();
        setQuery("");
        void openThread(thread.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Could not open a chat with ${personName(person)}.`);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!activeId || !text || sending) return;
    setSending(true);
    try {
      const res = await chatApi.send(activeId, text);
      setDraft("");
      stickToBottom.current = true;
      if (res?.data) setMessages((current) => mergeMessages(current, [res.data as ChatMessage]));
      setThreads((current) => current.map((t) => (t.id === activeId ? { ...t, updatedAt: new Date().toISOString() } : t)));
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Message could not be sent.");
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  };

  const onComposerKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  // Grow the composer with its content, up to five lines.
  useLayoutEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [draft]);

  /* Rows for the conversation: day separators + grouped senders */
  const rows = useMemo(() => {
    const out: Array<{ kind: "day"; key: string; label: string } | { kind: "msg"; key: string; msg: ChatMessage; own: boolean; showSender: boolean }> = [];
    let lastDay = "";
    let lastSender = "";
    let lastTime = 0;
    for (const msg of messages) {
      const day = new Date(msg.createdAt).toDateString();
      const sender = msg.senderUserId || msg.sender?.id || "";
      const at = new Date(msg.createdAt).getTime();
      if (day !== lastDay) {
        out.push({ kind: "day", key: `day-${day}`, label: dayLabel(msg.createdAt) });
        lastDay = day;
        lastSender = "";
      }
      const showSender = sender !== lastSender || at - lastTime > 5 * 60 * 1000;
      out.push({ kind: "msg", key: msg.id, msg, own: sender === me, showSender });
      lastSender = sender;
      lastTime = at;
    }
    return out;
  }, [messages, me]);

  /* ── Render ─────────────────────────────────────────────────────────── */

  const searching = debouncedQuery.length >= 2;
  const showChannels = tab !== "DIRECT";
  const showDirects = tab !== "CHANNELS";

  const threadRow = (t: Thread) => {
    const info = describe(t);
    const last = t.messages?.[0];
    const isActive = t.id === activeId;
    const preview = last ? `${last.senderUserId === me ? "You: " : ""}${last.body}` : info.subtitle;
    return (
      <li key={t.id}>
        <button
          type="button"
          onClick={() => void openThread(t.id)}
          aria-current={isActive ? "true" : undefined}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
            isActive ? "bg-indigo-50 ring-1 ring-indigo-100" : "hover:bg-slate-50"
          }`}
        >
          <Avatar label={info.title} channel={info.channel} />
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className={`truncate text-sm ${isActive ? "font-bold text-indigo-950" : "font-semibold text-slate-900"}`}>
                {info.channel ? `# ${info.title}` : info.title}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-slate-500">{listStamp(last?.createdAt || t.updatedAt)}</span>
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-600">{preview}</span>
          </span>
        </button>
      </li>
    );
  };

  const sectionTitle = (text: string, action?: React.ReactNode) => (
    <div className="flex items-center justify-between px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
      <span>{text}</span>
      {action}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 font-serif text-2xl font-bold tracking-tight text-slate-900">
            <MessageSquare aria-hidden="true" className="h-6 w-6 text-indigo-600" />
            Team Chat &amp; Channels
          </h1>
          <p className="mt-1 text-sm text-slate-600">Direct messages and channels for your workforce</p>
        </div>
        <button
          type="button"
          onClick={() => setChannelOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <Plus className="h-4 w-4" />
          New channel
        </button>
      </div>

      <div className="grid h-[calc(100dvh-210px)] min-h-[560px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-34px_rgba(15,23,42,0.4)] md:grid-cols-[340px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside className={`min-h-0 flex-col border-r border-slate-100 bg-white ${activeId ? "hidden md:flex" : "flex"}`} aria-label="Conversations">
          <div className="shrink-0 space-y-3 border-b border-slate-100 p-4">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={workspaceSize ? `Search ${workspaceSize.toLocaleString("en-IN")} people and channels` : "Search people and channels"}
                aria-label="Search people and channels"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-500 transition focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50"
              />
            </div>
            <div role="tablist" aria-label="Conversation type" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              {(
                [
                  { key: "ALL", label: "All" },
                  { key: "CHANNELS", label: `Channels ${channelCount}` },
                  { key: "DIRECT", label: `Direct ${directCount}` },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={tab === t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`rounded-lg py-1.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                    tab === t.key ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
            {loading ? (
              <div aria-busy="true" aria-label="Loading conversations" className="space-y-2 p-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl p-2.5">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-2.5 w-full animate-pulse rounded bg-slate-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="m-3 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
                <p>{loadError}</p>
                <button type="button" onClick={() => void loadThreads()} className="mt-2 font-bold underline">
                  Try again
                </button>
              </div>
            ) : (
              <>
                {showChannels && (
                  <>
                    {sectionTitle(
                      "Channels",
                      <button
                        type="button"
                        onClick={() => setChannelOpen(true)}
                        aria-label="Create channel"
                        className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>,
                    )}
                    {channels.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-500">{q ? "No channels match." : "No channels yet. Create one for a team or project."}</p>
                    ) : (
                      <ul className="space-y-0.5">{channels.map(threadRow)}</ul>
                    )}
                  </>
                )}

                {showDirects && (
                  <>
                    {sectionTitle(searching ? "Conversations" : "Recent")}
                    {directs.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-500">
                        {q ? "No conversations match." : "No direct messages yet. Search for someone above to start one."}
                      </p>
                    ) : (
                      <ul className="space-y-0.5">{directs.map(threadRow)}</ul>
                    )}
                  </>
                )}

                {searching && (
                  <>
                    {sectionTitle("People")}
                    {peopleSearch.loading && peopleSearch.people.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-xs text-slate-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching
                      </div>
                    ) : peopleSearch.people.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-500">No one matches &ldquo;{debouncedQuery}&rdquo;.</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {peopleSearch.people.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => void startDirect(p)}
                              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                            >
                              <Avatar label={personName(p)} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-slate-900">{personName(p)}</span>
                                <span className="block truncate text-xs text-slate-600">
                                  {[roleLabel(p.role), p.employee?.employeeCode].filter(Boolean).join(" · ")}
                                </span>
                              </span>
                              <span className="shrink-0 text-[11px] font-bold text-indigo-600">Message</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {peopleSearch.hasMore && (
                      <button
                        type="button"
                        onClick={() => void peopleSearch.loadMore()}
                        disabled={peopleSearch.loading}
                        className="mx-3 mt-2 w-[calc(100%-1.5rem)] rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        {peopleSearch.loading ? "Loading" : "Show more people"}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </aside>

        {/* Conversation */}
        <section className={`min-h-0 min-w-0 flex-col bg-slate-50/60 ${activeId ? "flex" : "hidden md:flex"}`} aria-label="Conversation">
          {!activeThread && !loadingMessages ? (
            <div className="m-auto max-w-sm px-6 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
                <MessageSquare aria-hidden="true" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-serif text-xl font-semibold text-slate-950">Pick a conversation</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                Choose a channel or recent chat on the left, or search for any teammate to start a new one.
              </p>
              <button
                type="button"
                onClick={() => setChannelOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Create a channel
              </button>
            </div>
          ) : (
            <>
              <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => {
                    activeIdRef.current = null;
                    setActiveId(null);
                  }}
                  aria-label="Back to conversations"
                  className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {activeInfo && <Avatar label={activeInfo.title} channel={activeInfo.channel} size="lg" />}
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-slate-950">
                    {activeInfo?.channel ? `# ${activeInfo.title}` : activeInfo?.title}
                  </h2>
                  <p className="flex items-center gap-1.5 truncate text-xs text-slate-600">
                    {activeInfo?.channel && <Users aria-hidden="true" className="h-3 w-3" />}
                    {activeInfo?.subtitle}
                    {activeInfo?.channel && activeThread?.members && activeThread.members.length > 0 && (
                      <span className="truncate text-slate-500">
                        · {activeThread.members.slice(0, 3).map((m) => personName(m.user).split(" ")[0]).join(", ")}
                        {activeThread.members.length > 3 ? ` +${activeThread.members.length - 3}` : ""}
                      </span>
                    )}
                  </p>
                </div>
              </header>

              <div ref={scrollRef} onScroll={onScroll} role="log" aria-live="polite" aria-label="Messages" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
                {loadingMessages ? (
                  <div className="space-y-4" aria-busy="true">
                    {[false, true, false, false, true].map((own, i) => (
                      <div key={i} className={`flex ${own ? "justify-end" : ""}`}>
                        <div className={`h-10 animate-pulse rounded-2xl bg-slate-200/70 ${own ? "w-1/3" : "w-1/2"}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {msgPage < msgTotalPages && (
                      <div className="mb-4 text-center">
                        <button
                          type="button"
                          onClick={() => void loadOlder()}
                          disabled={loadingOlder}
                          className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-60"
                        >
                          {loadingOlder ? "Loading" : "Load earlier messages"}
                        </button>
                      </div>
                    )}
                    {rows.length === 0 ? (
                      <p className="mt-16 text-center text-sm text-slate-600">No messages yet. Say hello.</p>
                    ) : (
                      <ul className="space-y-0.5">
                        {rows.map((row) =>
                          row.kind === "day" ? (
                            <li key={row.key} className="flex justify-center py-3">
                              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600 shadow-xs ring-1 ring-slate-200">{row.label}</span>
                            </li>
                          ) : (
                            <li key={row.key} className={`flex ${row.own ? "justify-end" : "justify-start"} ${row.showSender ? "pt-3" : ""}`}>
                              <div className={`max-w-[78%] ${row.own ? "items-end" : "items-start"} flex flex-col`}>
                                {row.showSender && !row.own && activeInfo?.channel && (
                                  <span className="mb-1 px-1 text-[11px] font-bold text-slate-600">{personName(row.msg.sender)}</span>
                                )}
                                <div
                                  className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-6 ${
                                    row.own
                                      ? "keep-white rounded-br-md bg-indigo-600 shadow-sm shadow-indigo-600/20"
                                      : "rounded-bl-md border border-slate-200 bg-white text-slate-900 shadow-xs"
                                  }`}
                                >
                                  {row.msg.body}
                                </div>
                                {row.showSender && <span className="mt-1 px-1 text-[10px] tabular-nums text-slate-500">{timeOf(row.msg.createdAt)}</span>}
                              </div>
                            </li>
                          ),
                        )}
                      </ul>
                    )}
                  </>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-4"
              >
                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">
                  <label htmlFor="chat-composer" className="sr-only">
                    Message
                  </label>
                  <textarea
                    id="chat-composer"
                    ref={composerRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    onKeyDown={onComposerKey}
                    rows={1}
                    placeholder={activeInfo ? `Message ${activeInfo.channel ? "#" : ""}${activeInfo.title}` : "Write a message"}
                    className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    aria-label="Send message"
                    className="keep-white flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-40 disabled:shadow-none"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1.5 flex justify-between px-2 text-[11px] text-slate-500">
                  <span>Enter to send · Shift+Enter for a new line</span>
                  {draft.length > MAX_MESSAGE_LENGTH - 500 && <span className="tabular-nums">{draft.length}/{MAX_MESSAGE_LENGTH}</span>}
                </p>
              </form>
            </>
          )}
        </section>
      </div>

      {channelOpen && (
        <NewChannelModal
          onClose={() => setChannelOpen(false)}
          onCreated={async (threadId) => {
            setChannelOpen(false);
            await loadThreads();
            void openThread(threadId);
          }}
        />
      )}
    </div>
  );
}

/* ── New channel modal ──────────────────────────────────────────────────── */

function NewChannelModal({ onClose, onCreated }: { onClose: () => void; onCreated: (threadId: string) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Map<string, Person>>(new Map());
  const [creating, setCreating] = useState(false);
  const debounced = useDebounced(query.trim(), 300);
  const people = usePeopleSearch(debounced, 0);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const toggle = (p: Person) =>
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, p);
      return next;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) {
      toast.error("Give the channel a name.");
      return;
    }
    if (selected.size === 0) {
      toast.error("Add at least one teammate.");
      return;
    }
    setCreating(true);
    try {
      const res = await chatApi.createGroup({ title: clean, userIds: [...selected.keys()] });
      const created = res?.data;
      if (created?.id) {
        toast.success(`#${clean} is ready`);
        await onCreated(created.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "The channel could not be created.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-channel-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-3 pt-6">
          <div>
            <h2 id="new-channel-title" className="font-serif text-xl font-semibold text-slate-950">
              New channel
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">A shared space for a team or project.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 space-y-3 px-6">
          <div>
            <label htmlFor="channel-name" className="mb-1 block text-xs font-bold text-slate-700">
              Channel name
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50">
              <Hash aria-hidden="true" className="h-4 w-4 text-slate-400" />
              <input
                id="channel-name"
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={60}
                placeholder="e.g. sales-team"
                className="w-full bg-transparent py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="channel-people" className="mb-1 block text-xs font-bold text-slate-700">
              Add people {selected.size > 0 && <span className="text-indigo-600">· {selected.size} selected</span>}
            </label>
            {selected.size > 0 && (
              <ul className="mb-2 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                {[...selected.values()].map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => toggle(p)}
                      aria-label={`Remove ${personName(p)}`}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-100 transition hover:bg-indigo-100"
                    >
                      {personName(p)}
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="channel-people"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email or code"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-500 focus:border-indigo-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 min-h-[160px] flex-1 overflow-y-auto overscroll-contain px-4">
          {people.loading && people.people.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading people
            </p>
          ) : people.people.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-600">No one matches that search.</p>
          ) : (
            <ul className="space-y-0.5 pb-2">
              {people.people.map((p) => {
                const on = selected.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(p)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${on ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                    >
                      <Avatar label={personName(p)} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{personName(p)}</span>
                        <span className="block truncate text-xs text-slate-600">{[roleLabel(p.role), p.employee?.employeeCode].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "keep-white border-indigo-600 bg-indigo-600" : "border-slate-300 bg-white"}`}>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  </li>
                );
              })}
              {people.hasMore && (
                <li className="pt-2">
                  <button
                    type="button"
                    onClick={() => void people.loadMore()}
                    disabled={people.loading}
                    className="w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    {people.loading ? "Loading" : "Show more people"}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="keep-white inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold shadow-md shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-60"
          >
            {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {creating ? "Creating" : "Create channel"}
          </button>
        </div>
      </form>
    </div>
  );
}
