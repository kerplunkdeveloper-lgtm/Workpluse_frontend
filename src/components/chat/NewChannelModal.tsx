"use client";

import React, { useEffect, useRef, useState } from "react";
import { chatApi } from "@/lib/api";


import { Check, Hash, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Person } from "./chatTypes";
import { personName, roleLabel } from "./chatUtils";
import { useDebounced, usePeopleSearch } from "./chatHooks";
import { Avatar } from "./ChatAvatar";

/* ── New channel modal ──────────────────────────────────────────────────── */

export function NewChannelModal({ onClose, onCreated }: { onClose: () => void; onCreated: (threadId: string) => void | Promise<void> }) {
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
                        {p.employee?.department?.name && <span className="block truncate text-xs font-medium text-indigo-600">{p.employee.department.name}</span>}
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
