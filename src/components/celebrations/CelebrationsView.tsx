"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cake, CalendarDays, Check, Download, ImagePlus, Loader2, RotateCcw, Search, Share2, Sparkles, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { employeesApi } from "@/lib/api";
import {
  buildMoments,
  defaultMessage,
  momentWhen,
  personInitials,
  type CelebrationPerson,
  type Moment,
  type MomentKind,
} from "@/lib/celebrations";
import { CARD_STYLES, defaultBackground, fileToBackground, overlayCss } from "@/lib/celebrationCard";
import {
  downloadMomentCard,
  emptySaved,
  momentKindLabel,
  momentSubtitle,
  readSavedTemplates,
  writeSavedTemplates,
  type SavedTemplates as Saved,
  type Template,
} from "@/lib/celebrationTemplates";

type Filter = "all" | MomentKind;
type Kind = MomentKind;

const KINDS: { kind: Kind; label: string }[] = [
  { kind: "Birthday", label: "Birthday template" },
  { kind: "Work anniversary", label: "Work anniversary template" },
];

export default function CelebrationsView() {
  const { user } = useAuth();
  const orgId = String(user?.organization?.id || user?.organizationId || "org");
  const companyName = user?.organization?.name || "Your company";
  const logoUrl = user?.organization?.logoUrl || null;

  const [people, setPeople] = useState<CelebrationPerson[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Saved>(emptySaved);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [photoFailed, setPhotoFailed] = useState<Record<string, boolean>>({});
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setStatus("loading");
    try {
      const response = await employeesApi.celebrations();
      setPeople(Array.isArray(response?.data) ? response.data : []);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // Fetch on mount; the state updates happen after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Saved template choices belong to the workspace; read them once the workspace is known.
  // localStorage only exists in the browser, so it cannot seed state during server rendering.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(readSavedTemplates(orgId));
  }, [orgId]);

  const persistAll = (next: Saved) => {
    setSaved(next);
    if (!writeSavedTemplates(orgId, next)) {
      toast.error("Your browser could not save this template (storage is full or blocked).");
    }
  };
  /** Change one occasion's template, leaving the other untouched. */
  const updateTemplate = (kind: Kind, patch: Partial<Template>) =>
    persistAll({ ...saved, [kind]: { ...saved[kind], ...patch } });

  const moments = useMemo(() => buildMoments(people), [people]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return moments.filter(
      (m) =>
        (filter === "all" || m.kind === filter) &&
        (!q || `${m.name} ${m.person.department || ""} ${m.person.designation || ""}`.toLowerCase().includes(q)),
    );
  }, [moments, filter, search]);

  const selected: Moment | undefined = moments.find((m) => m.id === selectedId) ?? visible[0] ?? moments[0];

  const counts = useMemo(
    () => ({
      today: moments.filter((m) => m.daysAway === 0).length,
      week: moments.filter((m) => m.daysAway <= 7).length,
      birthdays: moments.filter((m) => m.kind === "Birthday").length,
      anniversaries: moments.filter((m) => m.kind === "Work anniversary").length,
    }),
    [moments],
  );

  const message = selected ? (messages[selected.id] ?? defaultMessage(selected, companyName)) : "";
  // The template being edited and previewed is the one for the selected person's occasion.
  const editingKind: Kind = selected?.kind ?? "Birthday";
  const template = saved[editingKind];
  const background = template.background || defaultBackground(editingKind);
  const firstOfKind = (kind: Kind) => moments.find((m) => m.kind === kind);
  const useSameForBoth = () => {
    const other: Kind = editingKind === "Birthday" ? "Work anniversary" : "Birthday";
    persistAll({ ...saved, [other]: { ...template } });
    toast.success(`${editingKind === "Birthday" ? "Birthday" : "Anniversary"} template copied to the ${other === "Birthday" ? "birthday" : "anniversary"} cards`);
  };
  const photoUrl = selected && !photoFailed[selected.id] ? selected.person.photoUrl : null;
  const subtitle = selected ? momentSubtitle(selected) : "";
  const kindLabel = selected ? momentKindLabel(selected) : "";

  const onUpload = async (file?: File) => {
    if (!file) return;
    try {
      updateTemplate(editingKind, { background: await fileToBackground(file) });
      toast.success(`Background updated for all ${editingKind === "Birthday" ? "birthday" : "anniversary"} cards`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not use that image.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  /** Downloads one person's card from the saved default template for their occasion. */
  const downloadFor = async (moment: Moment, customMessage?: string) => {
    setBusy(true);
    setBusyId(moment.id);
    try {
      const { skippedRemote } = await downloadMomentCard(
        moment,
        { companyName, logoUrl: logoFailed ? null : logoUrl },
        saved,
        customMessage,
        photoFailed[moment.id] ? null : moment.person.photoUrl,
      );
      if (skippedRemote) toast.warning("Card saved without the photo/logo: their image host blocks downloads.");
      else toast.success(`${moment.name}'s card downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the card.");
    } finally {
      setBusy(false);
      setBusyId(null);
    }
  };
  const download = () => (selected ? downloadFor(selected, message) : Promise.resolve());

  const share = async () => {
    if (!selected) return;
    const data = { title: `${selected.kind} · ${selected.name}`, text: message };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(message);
        toast.success("Message copied to clipboard");
      }
    } catch {
      /* the person closed the share sheet */
    }
  };

  return (
    <main className="wp-main-canvas min-h-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1450px]">
        <div className="mb-7">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
            <Sparkles className="h-4 w-4" /> People moments
          </div>
          <h1>Celebrations</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Birthdays and work anniversaries from your employee records. Pick a person, customize the card once, and download it ready to share.
          </p>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<CalendarDays className="h-5 w-5" />} label="Today" value={counts.today} note="celebrations" tone="bg-indigo-50 text-indigo-600" />
          <Metric icon={<Users className="h-5 w-5" />} label="Next 7 days" value={counts.week} note="moments" tone="bg-emerald-50 text-emerald-600" />
          <Metric icon={<Cake className="h-5 w-5" />} label="Birthdays" value={counts.birthdays} note="in the next 12 months" tone="bg-pink-50 text-pink-600" />
          <Metric icon={<Trophy className="h-5 w-5" />} label="Anniversaries" value={counts.anniversaries} note="in the next 12 months" tone="bg-amber-50 text-amber-600" />
        </div>

        {status === "loading" && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your team&apos;s moments...
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-800">
            Could not load celebrations.{" "}
            <button onClick={() => void load(true)} className="font-bold underline">Try again</button>
          </div>
        )}

        {status === "ready" && moments.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Cake className="mx-auto h-8 w-8 text-slate-300" />
            <h2 className="mt-3">No upcoming moments yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Add a date of birth and date of joining to your employees&apos; profiles (Employees, then edit a profile) and their birthdays and work anniversaries will appear here. An anniversary shows once a full year is completed.
            </p>
          </div>
        )}

        {status === "ready" && moments.length > 0 && selected && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--wp-card-shadow)]">
              <div className="space-y-3 border-b border-slate-100 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2>Upcoming moments</h2>
                  <span className="text-xs text-slate-400">{visible.length} shown</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people, team or role" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400" />
                </div>
                <div className="flex gap-2">
                  {([["all", "All"], ["Birthday", "Birthdays"], ["Work anniversary", "Anniversaries"]] as const).map(([id, label]) => (
                    <button key={id} onClick={() => setFilter(id)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${filter === id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
                {visible.map((m) => (
                  <div key={m.id} className={`flex items-center transition hover:bg-indigo-50/50 ${selected.id === m.id ? "bg-indigo-50/70" : ""}`}>
                  <button onClick={() => setSelectedId(m.id)} className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left">
                    <Avatar moment={m} failed={!!photoFailed[m.id]} onFail={() => setPhotoFailed((p) => ({ ...p, [m.id]: true }))} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span className="truncate">{m.name}</span>
                        {selected.id === m.id && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {[m.person.designation, m.person.department].filter(Boolean).join(" · ") || "No role set"}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className={`block text-xs font-bold ${m.daysAway === 0 ? "text-amber-600" : "text-slate-700"}`}>{momentWhen(m)}</span>
                      <span className="mt-1 block text-[10px] text-slate-400">{m.kind === "Birthday" ? "Birthday" : `${m.years} year${m.years === 1 ? "" : "s"}`}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => void downloadFor(m, selected.id === m.id ? message : undefined)}
                    disabled={busy}
                    aria-label={`Download ${m.name}'s ${m.kind === "Birthday" ? "birthday" : "anniversary"} card`}
                    title="Download card with your default template"
                    className="mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-300 hover:bg-white hover:text-indigo-700 disabled:opacity-50"
                  >
                    {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </button>
                  </div>
                ))}
                {!visible.length && <div className="p-8 text-center text-sm text-slate-500">No moments match.</div>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--wp-card-shadow)]">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2>Card template</h2>
                  <p className="mt-1 text-xs text-slate-500">Your company logo and name are added automatically.</p>
                </div>
                {/* Each occasion has its own template: pick which one you are setting up. */}
                <div role="tablist" aria-label="Template to edit" className="inline-flex rounded-xl bg-slate-100 p-1">
                  {KINDS.map(({ kind, label }) => {
                    const target = firstOfKind(kind);
                    const active = editingKind === kind;
                    return (
                      <button
                        key={kind}
                        role="tab"
                        aria-selected={active}
                        disabled={!target}
                        title={target ? undefined : `No upcoming ${kind === "Birthday" ? "birthdays" : "anniversaries"} to preview yet`}
                        onClick={() => target && setSelectedId(target.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-slate-900/10" style={{ containerType: "inline-size" }}>
                <div className="relative w-full" style={{ aspectRatio: "1200 / 630", backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center", fontFamily: '"Segoe UI", system-ui, sans-serif' }}>
                  <div className="absolute inset-0" style={{ backgroundImage: overlayCss(template.styleId) }} />
                  <div className="absolute text-white" style={{ inset: "5.3cqw" }}>
                    <div className="flex items-center" style={{ gap: "1.6cqw" }}>
                      <span className="grid place-items-center overflow-hidden bg-white/90" style={{ width: "6cqw", height: "6cqw", borderRadius: "1.5cqw" }}>
                        {logoUrl && !logoFailed ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain p-[0.5cqw]" onError={() => setLogoFailed(true)} />
                        ) : (
                          <span className="font-extrabold text-indigo-700" style={{ fontSize: "2.3cqw" }}>{companyName.slice(0, 2).toUpperCase()}</span>
                        )}
                      </span>
                      <span className="truncate font-bold uppercase tracking-wide text-white/90" style={{ fontSize: "2.1cqw" }}>{companyName}</span>
                    </div>

                    <div className="flex items-center" style={{ marginTop: "3.2cqw", gap: "3.6cqw" }}>
                      <span className="grid shrink-0 place-items-center overflow-hidden rounded-full bg-white/20 font-extrabold ring-white/80" style={{ width: "14cqw", height: "14cqw", fontSize: "5cqw", boxShadow: "0 0 0 0.5cqw rgba(255,255,255,0.85)" }}>
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoUrl} alt={selected.name} className="h-full w-full object-cover" onError={() => setPhotoFailed((p) => ({ ...p, [selected.id]: true }))} />
                        ) : (
                          personInitials(selected.name)
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold uppercase text-white/80" style={{ fontSize: "2cqw", letterSpacing: "0.18em" }}>{kindLabel}</p>
                        <h3 className="truncate font-extrabold leading-tight text-white" style={{ fontSize: "5.3cqw" }}>{selected.name}</h3>
                        {subtitle && <p className="truncate text-white/80" style={{ fontSize: "2.3cqw" }}>{subtitle}</p>}
                      </div>
                    </div>

                    <p className="line-clamp-4 text-white/95" style={{ marginTop: "3.4cqw", fontSize: "2.6cqw", lineHeight: 1.45 }}>{message}</p>
                    <p className="absolute bottom-0 left-0 font-semibold text-white/70" style={{ fontSize: "1.85cqw" }}>With appreciation, {companyName} People Team</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-5 border-t border-slate-100 pt-5 lg:grid-cols-2">
                <div>
                  <p className="mb-3 rounded-lg bg-indigo-50 px-3 py-2 text-[11px] font-semibold leading-4 text-indigo-800">
                    Editing the <strong>{editingKind === "Birthday" ? "birthday" : "work anniversary"}</strong> template. It applies to every {editingKind === "Birthday" ? "birthday" : "anniversary"} card.
                  </p>
                  <p className="mb-2 text-xs font-bold text-slate-700">Card style</p>
                  <div className="flex flex-wrap gap-2">
                    {CARD_STYLES.map((s) => (
                      <button key={s.id} onClick={() => updateTemplate(editingKind, { styleId: s.id })} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${template.styleId === s.id ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-600 hover:border-indigo-200"}`}>{s.name}</button>
                    ))}
                  </div>

                  <p className="mb-2 mt-4 text-xs font-bold text-slate-700">Background</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-indigo-400 hover:text-indigo-700"><ImagePlus className="h-3.5 w-3.5" /> Upload background</button>
                    {template.background && (
                      <button onClick={() => updateTemplate(editingKind, { background: null })} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" /> Use default</button>
                    )}
                    <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => void onUpload(e.target.files?.[0])} />
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-slate-400">
                    {template.background ? "Using your custom background." : "Using the default background."} Remembered in this browser.
                  </p>
                  <button onClick={useSameForBoth} className="mt-3 text-[11px] font-bold text-indigo-600 hover:underline">
                    Use this style and background for {editingKind === "Birthday" ? "anniversary" : "birthday"} cards too
                  </button>
                </div>

                <div>
                  <label htmlFor="celebration-message" className="mb-2 block text-xs font-bold text-slate-700">Personal message</label>
                  <textarea id="celebration-message" value={message} onChange={(e) => setMessages((prev) => ({ ...prev, [selected.id]: e.target.value }))} rows={5} maxLength={280} className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm leading-5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                  <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                    <button onClick={() => setMessages((prev) => { const next = { ...prev }; delete next[selected.id]; return next; })} className="font-semibold text-indigo-600 hover:underline">Reset message</button>
                    <span>{message.length}/280</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <button onClick={() => void share()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Share2 className="h-3.5 w-3.5" /> {typeof navigator !== "undefined" && "share" in navigator ? "Share" : "Copy message"}</button>
                <button onClick={() => void download()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Download card (PNG)</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: number; note: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--wp-card-shadow)]">
      <span className={`mb-4 grid h-9 w-9 place-items-center rounded-xl ${tone}`}>{icon}</span>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <strong className="text-2xl font-black tracking-tight text-slate-900">{value}</strong>
        <span className="text-[11px] text-slate-400">{note}</span>
      </div>
    </div>
  );
}

function Avatar({ moment, failed, onFail }: { moment: Moment; failed: boolean; onFail: () => void }) {
  const photo = !failed ? moment.person.photoUrl : null;
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl text-xs font-black text-white ${moment.kind === "Birthday" ? "bg-pink-500" : "bg-indigo-500"}`}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="h-full w-full object-cover" onError={onFail} />
      ) : (
        personInitials(moment.name)
      )}
    </span>
  );
}
