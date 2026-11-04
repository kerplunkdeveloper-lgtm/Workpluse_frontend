"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowDownToLine, ArrowUpRight, BarChart3, Cake, CalendarDays, Check,
  ChevronDown, Clock3, Download, Gift, ImagePlus, Mail, Palette, PenLine,
  Search, Send, Settings2, Share2, Sparkles, Star, Users, WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

type Occasion = "Birthday" | "Work anniversary";
type Person = { id: number; name: string; role: string; team: string; date: string; years?: number; initials: string; color: string; kind: Occasion };

const people: Person[] = [
  { id: 1, name: "Aarav Mehta", role: "Product Designer", team: "Design", date: "Today", initials: "AM", color: "#f59e0b", kind: "Birthday" },
  { id: 2, name: "Priya Shah", role: "Engineering Manager", team: "Engineering", date: "Tomorrow", years: 5, initials: "PS", color: "#6366f1", kind: "Work anniversary" },
  { id: 3, name: "Rohan Kapoor", role: "Account Executive", team: "Sales", date: "28 Nov", initials: "RK", color: "#14b8a6", kind: "Birthday" },
  { id: 4, name: "Ananya Rao", role: "People Partner", team: "People Ops", date: "02 Dec", years: 2, initials: "AR", color: "#ec4899", kind: "Work anniversary" },
];

const templates = [
  { id: "confetti", name: "Confetti celebration", colors: ["#312e81", "#7c3aed"], icon: "🎉" },
  { id: "sunrise", name: "Warm sunrise", colors: ["#f97316", "#fbbf24"], icon: "☀️" },
  { id: "minimal", name: "Minimal brand", colors: ["#0f172a", "#334155"], icon: "✦" },
];

function initials(name: string) { return name.split(" ").map((part) => part[0]).join("").slice(0, 2); }

export default function CelebrationsView() {
  const { user } = useAuth();
  const companyName = user?.organization?.name || "WorkPluse";
  const [tab, setTab] = useState<"overview" | "templates" | "analytics">("overview");
  const [selected, setSelected] = useState<Person>(people[0]);
  const [template, setTemplate] = useState(templates[0]);
  const [message, setMessage] = useState("Wishing you a wonderful birthday, Aarav! Thank you for the energy and creativity you bring to WorkPluse every day.");
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");

  const filtered = useMemo(() => people.filter((person) => `${person.name} ${person.team}`.toLowerCase().includes(search.toLowerCase())), [search]);

  const downloadCard = () => {
    const content = `WORKPLUSE\n${selected.kind.toUpperCase()}\n\n${selected.name}\n${message}\n\n— ${companyName}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    link.download = `${selected.name.replaceAll(" ", "-").toLowerCase()}-${selected.kind.replaceAll(" ", "-").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Card downloaded");
  };

  const shareCard = async () => {
    const shareData = { title: `${selected.kind} · ${selected.name}`, text: message };
    if (navigator.share) await navigator.share(shareData).catch(() => undefined);
    else { await navigator.clipboard?.writeText(message); toast.success("Message copied to clipboard"); }
  };

  return (
    <main className="wp-main-canvas min-h-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1450px]">
        <div className="mb-7 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600"><Sparkles className="h-4 w-4" /> People moments</div>
            <h1>Celebrations</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Make every birthday and work anniversary feel personal — on brand, on time, and ready to share.</p>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-indigo-200 hover:text-indigo-700 xl:self-auto"><Settings2 className="h-4 w-4" /> Celebration settings</button>
        </div>

        {showSettings && <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-950"><div className="flex items-center gap-2 font-semibold"><Mail className="h-4 w-4" /> Automatic reminders are on</div><span className="text-indigo-700">HR admins get a reminder 7 days before each moment.</span><button onClick={() => { setShowSettings(false); toast.success("Settings saved"); }} className="ml-auto rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">Save</button></div>}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon={<CalendarDays />} label="This month" value="12" note="celebrations" tint="indigo" />
          <Metric icon={<Send />} label="Cards sent" value="86%" note="on time this year" tint="emerald" />
          <Metric icon={<Users />} label="Team moments" value="142" note="recognized in 2026" tint="amber" />
          <Metric icon={<Star />} label="Team response" value="4.8/5" note="average reaction" tint="violet" />
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-200">
          {([["overview", "Upcoming moments"], ["templates", "Templates"], ["analytics", "Analytics"]] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`border-b-2 px-1 pb-3 mr-5 text-sm font-bold transition ${tab === id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
        </div>

        {tab === "overview" && <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--wp-card-shadow)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2>Upcoming moments</h2><p className="mt-1 text-xs text-slate-500">Review, personalize, and send a card.</p></div><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-xs outline-none focus:border-indigo-400 sm:w-44" /></div></div>
            <div className="divide-y divide-slate-100">{filtered.map((person) => <button key={person.id} onClick={() => { setSelected(person); setMessage(person.kind === "Birthday" ? `Wishing you a wonderful birthday, ${person.name.split(" ")[0]}! Thank you for the energy and creativity you bring to WorkPluse every day.` : `Congratulations on ${person.years} years with WorkPluse, ${person.name.split(" ")[0]}! Here’s to everything you’ve achieved and what’s ahead.`); }} className={`flex w-full items-center gap-3 p-4 text-left transition hover:bg-indigo-50/50 ${selected.id === person.id ? "bg-indigo-50/70" : ""}`}><Avatar person={person} /><span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-bold text-slate-900">{person.name}{selected.id === person.id && <Check className="h-3.5 w-3.5 text-indigo-600" />}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{person.role} · {person.team}</span></span><span className="text-right"><span className={`block text-xs font-bold ${person.date === "Today" ? "text-amber-600" : "text-slate-700"}`}>{person.date}</span><span className="mt-1 block text-[10px] text-slate-400">{person.kind === "Birthday" ? "Birthday" : `${person.years} year milestone`}</span></span></button>)}{!filtered.length && <div className="p-8 text-center text-sm text-slate-500">No moments match your search.</div>}</div>
            <div className="flex items-center gap-2 border-t border-slate-100 p-4 text-xs text-slate-500"><Clock3 className="h-4 w-4 text-indigo-500" /> Next automatic reminder goes out tomorrow at 9:00 AM <ArrowUpRight className="ml-auto h-4 w-4" /></div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--wp-card-shadow)]"><div className="mb-5 flex items-center justify-between"><div><h2>Compose celebration</h2><p className="mt-1 text-xs text-slate-500">A preview of what your team member will receive.</p></div><div className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Ready to send</div></div><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_190px]"><div className="overflow-hidden rounded-2xl" style={{ background: `linear-gradient(135deg, ${template.colors[0]}, ${template.colors[1]})` }}><div className="relative flex min-h-[310px] flex-col justify-between p-6 text-white"><div className="absolute right-5 top-5 text-4xl opacity-80">{template.icon}</div><div><div className="mb-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70"><span className="grid h-7 w-7 place-items-center overflow-hidden rounded-lg bg-white/15 text-[10px]">{profilePhoto ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" /> : "WP"}</span> {companyName}</div><div className="mb-4 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 border-white/30 bg-white/15 text-sm font-black">{profilePhoto ? <img src={profilePhoto} alt={`${selected.name} profile`} className="h-full w-full object-cover" /> : selected.initials}</span><div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{selected.kind}</p><h3 className="text-3xl font-black tracking-tight">{selected.name}</h3></div></div></div><p className="max-w-md text-sm leading-6 text-white/90">{message}</p><div className="flex items-center justify-between text-xs text-white/60"><span>With appreciation,</span><span>{companyName} People Team</span></div></div></div><div className="space-y-3"><label className="block text-xs font-bold text-slate-700">Choose template</label>{templates.map((item) => <button key={item.id} onClick={() => setTemplate(item)} className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left text-xs font-semibold transition ${template.id === item.id ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-200 hover:border-indigo-200"}`}><span className="grid h-8 w-8 place-items-center rounded-lg text-base" style={{ background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})` }}>{item.icon}</span>{item.name}</button>)}<label htmlFor="celebration-photo" className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-2 text-xs font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-700"><ImagePlus className="h-3.5 w-3.5" /> Add profile photo</label><input id="celebration-photo" type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) setProfilePhoto(URL.createObjectURL(file)); }} /><button onClick={() => toast.info("Template editor is ready for custom brand colors") } className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 p-2 text-xs font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-700"><Palette className="h-3.5 w-3.5" /> Customize</button></div></div><div className="mt-5 border-t border-slate-100 pt-4"><label className="mb-2 block text-xs font-bold text-slate-700">Personal message</label><textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm leading-5 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" /><div className="mt-3 flex flex-wrap justify-end gap-2"><button onClick={shareCard} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Share2 className="h-3.5 w-3.5" /> Share</button><button onClick={downloadCard} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download className="h-3.5 w-3.5" /> Download</button><button onClick={() => toast.success(`${selected.kind} card sent to ${selected.name}`)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"><Send className="h-3.5 w-3.5" /> Send card</button></div></div></section>
        </div>}

        {tab === "templates" && <TemplatesPanel selected={template} onSelect={setTemplate} />}
        {tab === "analytics" && <AnalyticsPanel />}
      </div>
    </main>
  );
}

function Metric({ icon, label, value, note, tint }: { icon: React.ReactNode; label: string; value: string; note: string; tint: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--wp-card-shadow)]"><div className="mb-4 flex items-center justify-between"><span className={`grid h-9 w-9 place-items-center rounded-xl bg-${tint}-50 text-${tint}-600`}>{icon}</span><ChevronDown className="h-4 w-4 rotate-[-45deg] text-slate-300" /></div><p className="text-xs font-semibold text-slate-500">{label}</p><div className="mt-1 flex items-baseline gap-2"><strong className="text-2xl font-black tracking-tight text-slate-900">{value}</strong><span className="text-[11px] text-slate-400">{note}</span></div></div> }
function Avatar({ person }: { person: Person }) { return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-black text-white" style={{ backgroundColor: person.color }}>{person.initials}</span> }
function TemplatesPanel({ selected, onSelect }: { selected: typeof templates[number]; onSelect: (template: typeof templates[number]) => void }) { return <div className="grid gap-5 md:grid-cols-3">{templates.map((item) => <button key={item.id} onClick={() => onSelect(item)} className={`overflow-hidden rounded-2xl border bg-white text-left shadow-[var(--wp-card-shadow)] transition hover:-translate-y-0.5 ${selected.id === item.id ? "border-indigo-500 ring-2 ring-indigo-100" : "border-slate-200"}`}><div className="flex h-44 items-end p-5 text-5xl" style={{ background: `linear-gradient(135deg, ${item.colors[0]}, ${item.colors[1]})` }}>{item.icon}</div><div className="p-4"><div className="flex items-center justify-between"><h2 className="text-base">{item.name}</h2>{selected.id === item.id && <Check className="h-4 w-4 text-indigo-600" />}</div><p className="mt-1 text-xs text-slate-500">Birthday and work anniversary ready</p></div></button>)}</div> }
function AnalyticsPanel() { return <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--wp-card-shadow)]"><div className="mb-6 flex items-center justify-between"><div><h2>Recognition activity</h2><p className="mt-1 text-xs text-slate-500">Celebrations sent across your workspace</p></div><BarChart3 className="h-5 w-5 text-indigo-500" /></div><div className="flex h-52 items-end gap-3 border-b border-l border-slate-100 px-3 pb-0 pt-4">{[45, 64, 42, 78, 58, 91, 72, 84, 65, 96, 77, 88].map((height, index) => <div key={index} className="group flex flex-1 flex-col items-center justify-end gap-2"><div className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-violet-400 transition group-hover:from-indigo-500" style={{ height: `${height}%` }} /><span className="text-[10px] text-slate-400">{["Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"][index]}</span></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--wp-card-shadow)]"><h2>Channel performance</h2><p className="mt-1 text-xs text-slate-500">Where your team sees the most joy</p><div className="mt-6 space-y-5">{[["Email cards", 86, "indigo"], ["Team feed", 71, "violet"], ["Download & share", 48, "amber"]].map(([label, value, color]) => <div key={String(label)}><div className="mb-2 flex justify-between text-xs font-bold"><span>{label}</span><span className="text-slate-500">{value}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full bg-${color}-500`} style={{ width: `${value}%` }} /></div></div>)}</div><div className="mt-8 rounded-xl bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><WandSparkles className="mr-1 inline h-3.5 w-3.5" /> Tip: cards sent within 24 hours of a moment get 2.4× more reactions.</div></section></div> }
