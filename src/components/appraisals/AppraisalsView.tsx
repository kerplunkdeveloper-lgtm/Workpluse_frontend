"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CalendarRange, CheckCircle2, ChevronDown, Loader2, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import { appraisalsApi } from "@/lib/api";
import { formatDate, unwrapList } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/ui/PageHeader";

interface Review {
  id: string;
  status: "DRAFT" | "SELF_SUBMITTED" | "COMPLETED";
  selfScore?: number | null;
  managerScore?: number | null;
  selfComments?: string | null;
  managerComments?: string | null;
  cycle?: { name?: string; startDate?: string; endDate?: string } | null;
  employee?: { firstName?: string; lastName?: string; employeeCode?: string } | null;
}

interface Cycle {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  _count?: { reviews?: number };
  reviews?: Review[];
}

const CARD = "rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.18)]";
const INPUT =
  "h-11 w-full rounded-xl bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 transition hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const STATUS: Record<Review["status"], { label: string; tone: string }> = {
  DRAFT: { label: "Not started", tone: "bg-slate-100 text-slate-600 ring-slate-500/15" },
  SELF_SUBMITTED: { label: "Awaiting manager", tone: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  COMPLETED: { label: "Completed", tone: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
};
const errorOf = (err: any, fallback: string) => err?.response?.data?.message || err?.message || fallback;
const nameOf = (employee?: Review["employee"]) => `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() || "Employee";

export default function AppraisalsView() {
  const { role } = useAuth();
  const isReviewer = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "MANAGER";
  const canCreate = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
  const [mine, setMine] = useState<Review[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMine(unwrapList<Review>(await appraisalsApi.mine()));
      if (isReviewer) setCycles(unwrapList<Cycle>(await appraisalsApi.list()));
    } catch (err) {
      setError(errorOf(err, "Could not load appraisals."));
    } finally {
      setLoading(false);
    }
  }, [isReviewer]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-6 pb-10">
      <PageHeader
        icon={Star}
        title="Appraisals"
        description={isReviewer ? "Run review cycles, then score each person once they have submitted their self-review." : "Rate your own performance for each cycle and see your manager's feedback."}
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setCreating((open) => !open)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" /> New cycle
            </button>
          )
        }
      />

      {creating && (
        <CycleForm
          onDone={() => {
            setCreating(false);
            void load();
          }}
        />
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button>
        </div>
      )}

      <section className="space-y-3" aria-labelledby="my-reviews-title">
        <h2 id="my-reviews-title" className="text-sm font-semibold text-slate-900">My reviews</h2>
        {loading ? (
          <div className={`${CARD} skeleton-shimmer h-40`} aria-busy="true" />
        ) : mine.length === 0 ? (
          <p className={`${CARD} px-5 py-8 text-center text-sm text-slate-500`}>No reviews have been assigned to you yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map((review) => (
              <SelfReviewCard key={review.id} review={review} onSaved={() => void load()} />
            ))}
          </div>
        )}
      </section>

      {isReviewer && (
        <section className="space-y-3" aria-labelledby="cycles-title">
          <h2 id="cycles-title" className="text-sm font-semibold text-slate-900">Review cycles</h2>
          {loading ? (
            <div className={`${CARD} skeleton-shimmer h-24`} aria-busy="true" />
          ) : cycles.length === 0 ? (
            <p className={`${CARD} px-5 py-8 text-center text-sm text-slate-500`}>No appraisal cycles yet.{canCreate ? " Use New cycle to start one." : ""}</p>
          ) : (
            cycles.map((cycle) => <CycleCard key={cycle.id} cycle={cycle} />)
          )}
        </section>
      )}
    </div>
  );
}

function Stars({ value, onChange, disabled, label }: { value: number; onChange?: (score: number) => void; disabled?: boolean; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={value === score}
          aria-label={`${score} out of 5`}
          disabled={disabled}
          onClick={() => onChange?.(score)}
          className="rounded-md p-1 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:cursor-default disabled:hover:scale-100"
        >
          <Star className={`h-6 w-6 ${score <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
        </button>
      ))}
    </div>
  );
}

function SelfReviewCard({ review, onSaved }: { review: Review; onSaved: () => void }) {
  const done = review.status === "COMPLETED";
  const [score, setScore] = useState(review.selfScore || 0);
  const [comments, setComments] = useState(review.selfComments || "");
  const [saving, setSaving] = useState(false);
  const status = STATUS[review.status] ?? STATUS.DRAFT;

  const submit = async () => {
    if (!score) return toast.error("Choose a score from 1 to 5 first.");
    setSaving(true);
    try {
      const res = await appraisalsApi.submitSelf(review.id, { selfScore: score, selfComments: comments });
      if (!res?.success) throw new Error(res?.message);
      toast.success("Your self-review was saved.");
      onSaved();
    } catch (err) {
      toast.error(errorOf(err, "Could not save your review."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className={`${CARD} space-y-4 p-5`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{review.cycle?.name || "Review"}</h3>
          {review.cycle?.startDate && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><CalendarRange className="h-3.5 w-3.5" />{formatDate(review.cycle.startDate)} – {formatDate(review.cycle.endDate)}</p>
          )}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${status.tone}`}>{status.label}</span>
      </header>

      <div>
        <p className="mb-1 text-xs font-semibold text-slate-600">Your rating</p>
        <Stars value={score} onChange={setScore} disabled={done} label="Your self rating" />
      </div>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-600">What went well, and what would you improve?</span>
        <textarea value={comments} onChange={(e) => setComments(e.target.value)} disabled={done} rows={3} maxLength={2000} className="w-full rounded-xl bg-white p-3 text-sm text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50" />
      </label>

      {done ? (
        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Manager score: {review.managerScore ?? "—"} / 5</p>
          {review.managerComments && <p className="mt-1.5 text-sm text-emerald-900">{review.managerComments}</p>}
        </div>
      ) : (
        <div className="flex justify-end">
          <button type="button" onClick={submit} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {review.status === "SELF_SUBMITTED" ? "Update self-review" : "Submit self-review"}
          </button>
        </div>
      )}
    </article>
  );
}

function CycleCard({ cycle }: { cycle: Cycle }) {
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await appraisalsApi.get(cycle.id);
      setReviews((res?.data?.reviews || res?.reviews || []) as Review[]);
    } catch (err) {
      setLoadError(errorOf(err, "Could not load this cycle."));
    }
  }, [cycle.id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && reviews === null) void loadReviews();
  };

  const completed = reviews?.filter((r) => r.status === "COMPLETED").length ?? 0;

  return (
    <article className={`${CARD} overflow-hidden`}>
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950">{cycle.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {cycle.startDate ? `${formatDate(cycle.startDate)} – ${formatDate(cycle.endDate)} · ` : ""}
            {cycle._count?.reviews ?? 0} review{(cycle._count?.reviews ?? 0) === 1 ? "" : "s"}
            {reviews ? ` · ${completed} completed` : ""}
          </p>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100">
          {loadError ? (
            <p className="px-5 py-4 text-sm text-rose-700">{loadError} <button type="button" onClick={() => void loadReviews()} className="font-semibold underline">Retry</button></p>
          ) : reviews === null ? (
            <div className="skeleton-shimmer m-5 h-20 rounded-xl" aria-busy="true" />
          ) : reviews.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">No one is part of this cycle.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reviews.map((review) => (
                <ManagerReviewRow key={review.id} review={review} onSaved={() => void loadReviews()} />
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function ManagerReviewRow({ review, onSaved }: { review: Review; onSaved: () => void }) {
  const [score, setScore] = useState(review.managerScore || 0);
  const [comments, setComments] = useState(review.managerComments || "");
  const [saving, setSaving] = useState(false);
  const done = review.status === "COMPLETED";
  const ready = review.status === "SELF_SUBMITTED" || done;
  const status = STATUS[review.status] ?? STATUS.DRAFT;

  const save = async () => {
    if (!score) return toast.error("Choose a score from 1 to 5 first.");
    setSaving(true);
    try {
      const res = await appraisalsApi.submitManager(review.id, { managerScore: score, managerComments: comments });
      if (!res?.success) throw new Error(res?.message);
      toast.success(`Review saved for ${nameOf(review.employee)}.`);
      onSaved();
    } catch (err) {
      toast.error(errorOf(err, "Could not save this review."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-900">{nameOf(review.employee)}</p>
        <p className="text-xs text-slate-500">{review.employee?.employeeCode}</p>
        <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${status.tone}`}>{status.label}</span>
        {review.selfScore ? (
          <p className="mt-2 text-xs text-slate-600">Self score: <span className="font-semibold">{review.selfScore} / 5</span></p>
        ) : null}
        {review.selfComments && <p className="mt-1 line-clamp-3 text-xs text-slate-500">&ldquo;{review.selfComments}&rdquo;</p>}
      </div>
      {ready ? (
        <div className="space-y-2">
          <Stars value={score} onChange={setScore} label={`Score for ${nameOf(review.employee)}`} />
          <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={2} maxLength={2000} placeholder="Feedback for this person" aria-label="Manager feedback" className="w-full rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex justify-end">
            <button type="button" onClick={save} disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {done ? "Update review" : "Complete review"}
            </button>
          </div>
        </div>
      ) : (
        <p className="self-center text-sm text-slate-400">Waiting for the employee&apos;s self-review.</p>
      )}
    </li>
  );
}

function CycleForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [saving, setSaving] = useState(false);
  const invalidRange = Boolean(form.startDate && form.endDate && form.endDate < form.startDate);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invalidRange) return;
    setSaving(true);
    try {
      const res = await appraisalsApi.create(form);
      if (!res?.success) throw new Error(res?.message);
      toast.success("Cycle created. Everyone now has a review to complete.");
      onDone();
    } catch (err) {
      toast.error(errorOf(err, "Could not create the cycle."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${CARD} grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end`} aria-label="New appraisal cycle">
      <label className="block space-y-1.5 sm:col-span-2 lg:col-span-1">
        <span className="text-xs font-semibold text-slate-600">Cycle name</span>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual review 2026" className={INPUT} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-600">Starts</span>
        <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={INPUT} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-600">Ends</span>
        <input required type="date" min={form.startDate || undefined} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className={INPUT} />
        {invalidRange && <span className="block text-[11px] font-medium text-rose-600">Must be after the start date</span>}
      </label>
      <button disabled={saving || invalidRange} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create cycle
      </button>
    </form>
  );
}
