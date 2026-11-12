"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Coffee, MapPin, RefreshCw, Search, Timer, Users, Utensils, X } from "lucide-react";
import { attendanceApi } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import { mapsSearchUrl } from "@/lib/reverseGeocode";
import { useAuth } from "@/context/AuthContext";
import Select from "@/components/ui/Select";

export interface TeamPunchPerson {
  employeeId: string;
  name: string;
  employeeCode?: string | null;
  designation?: string | null;
  department?: string | null;
  branchName?: string | null;
  status?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  checkInLocation?: string | null;
  checkOutLocation?: string | null;
  location?: string | null;
  clockedIn?: boolean;
  isOnBreak?: boolean;
  activePauseType?: "BREAK" | "LUNCH" | null;
  activePauseStartedAt?: string | null;
  activePauseMinutes?: number;
  breakMinutes?: number;
  lunchMinutes?: number;
  completedPauseCount?: number;
}

interface PauseAnalytics {
  activeCount: number;
  activeBreakCount: number;
  activeLunchCount: number;
  totalBreakMinutes: number;
  totalLunchMinutes: number;
  completedPauseCount: number;
}

export default function TeamPunchBoard() {
  const { user } = useAuth();
  const [people, setPeople] = useState<TeamPunchPerson[]>([]);
  const [clockedIn, setClockedIn] = useState(0);
  const [pauseAnalytics, setPauseAnalytics] = useState<PauseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ON_SHIFT" | "CLOCKED_OUT" | "NOT_IN">("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [selectedPauseEmployeeId, setSelectedPauseEmployeeId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await attendanceApi.getLiveToday();
      const payload = res?.data || res;
      const list: TeamPunchPerson[] = payload?.people || [];
      setPeople(list);
      setClockedIn(payload?.clockedIn ?? list.filter((person) => person.clockedIn).length);
      setPauseAnalytics(payload?.pauseAnalytics || null);
    } catch (err) {
      console.warn("Could not load team punch locations", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const myId = user?.employee?.id;

  const unique = (values: Array<string | null | undefined>) =>
    [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));
  const departmentOptions = useMemo(() => unique(people.map((p) => p.department)), [people]);
  const branchViews = useMemo(() => {
    const groups = new Map<string, { name: string; total: number; onShift: number; onPause: number }>();
    people.forEach((person) => {
      const name = person.branchName || "Unassigned";
      const current = groups.get(name) || { name, total: 0, onShift: 0, onPause: 0 };
      current.total += 1;
      if (person.clockedIn) current.onShift += 1;
      if (person.isOnBreak) current.onPause += 1;
      groups.set(name, current);
    });
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [people]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (q && !`${p.name} ${p.employeeCode || ""} ${p.designation || ""}`.toLowerCase().includes(q)) return false;
      if (branchFilter !== "ALL" && (branchFilter === "__UNASSIGNED__" ? Boolean(p.branchName) : p.branchName !== branchFilter)) return false;
      if (departmentFilter !== "ALL" && p.department !== departmentFilter) return false;
      if (statusFilter === "ON_SHIFT") return Boolean(p.clockedIn);
      if (statusFilter === "CLOCKED_OUT") return Boolean(p.checkIn) && !p.clockedIn;
      if (statusFilter === "NOT_IN") return !p.checkIn;
      return true;
    });
  }, [people, search, statusFilter, branchFilter, departmentFilter]);

  const filtersActive = search !== "" || statusFilter !== "ALL" || branchFilter !== "ALL" || departmentFilter !== "ALL";
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setBranchFilter("ALL");
    setDepartmentFilter("ALL");
  };
  const selectClass =
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100";
  const activePeople = visible.filter((person) => person.isOnBreak);
  const pauseTakenPeople = visible
    .filter((person) => Number(person.breakMinutes || 0) + Number(person.lunchMinutes || 0) + Number(person.activePauseMinutes || 0) > 0)
    .sort((a, b) => (Number(b.breakMinutes || 0) + Number(b.lunchMinutes || 0) + Number(b.activePauseMinutes || 0)) - (Number(a.breakMinutes || 0) + Number(a.lunchMinutes || 0) + Number(a.activePauseMinutes || 0)));
  const formatMinutes = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  const viewAnalytics = useMemo(() => {
    if (!people.length) return pauseAnalytics;
    const active = visible.filter((person) => person.isOnBreak);
    return {
      activeCount: active.length,
      activeBreakCount: active.filter((person) => person.activePauseType === "BREAK").length,
      activeLunchCount: active.filter((person) => person.activePauseType === "LUNCH").length,
      totalBreakMinutes: visible.reduce((sum, person) => sum + Number(person.breakMinutes || 0) + (person.activePauseType === "BREAK" ? Number(person.activePauseMinutes || 0) : 0), 0),
      totalLunchMinutes: visible.reduce((sum, person) => sum + Number(person.lunchMinutes || 0) + (person.activePauseType === "LUNCH" ? Number(person.activePauseMinutes || 0) : 0), 0),
      completedPauseCount: visible.reduce((sum, person) => sum + Number(person.completedPauseCount || 0), 0),
    };
  }, [people, pauseAnalytics, visible]);
  const selectedPauseEmployee = pauseTakenPeople.find((person) => person.employeeId === selectedPauseEmployeeId) || null;
  const pauseScope = selectedPauseEmployee
    ? {
        activeCount: selectedPauseEmployee.isOnBreak ? 1 : 0,
        activeBreakCount: selectedPauseEmployee.activePauseType === "BREAK" ? 1 : 0,
        activeLunchCount: selectedPauseEmployee.activePauseType === "LUNCH" ? 1 : 0,
        totalBreakMinutes: Number(selectedPauseEmployee.breakMinutes || 0) + (selectedPauseEmployee.activePauseType === "BREAK" ? Number(selectedPauseEmployee.activePauseMinutes || 0) : 0),
        totalLunchMinutes: Number(selectedPauseEmployee.lunchMinutes || 0) + (selectedPauseEmployee.activePauseType === "LUNCH" ? Number(selectedPauseEmployee.activePauseMinutes || 0) : 0),
        completedPauseCount: Number(selectedPauseEmployee.completedPauseCount || 0),
      }
    : viewAnalytics;

  return (
    <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-slate-50/80 shadow-[0_24px_80px_-42px_rgba(15,23,42,.35)]">
      <div className="flex items-center justify-between gap-4 bg-[linear-gradient(115deg,#0f172a_0%,#172554_55%,#312e81_100%)] px-5 py-5 text-white sm:px-7 sm:py-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-indigo-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,.15)]" /> Live workforce pulse
          </div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-300" />
            Team punch locations
          </h2>
          <p className="mt-1 text-xs text-indigo-100/70">
            {clockedIn} on shift
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-xl border border-white/15 bg-white/10 p-2.5 text-indigo-100 transition hover:bg-white/20"
          title="Refresh locations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-white px-4 py-4 sm:grid-cols-4 sm:px-7 sm:py-5" aria-label="Today break analytics">
        <PauseMetric icon={Timer} label={selectedPauseEmployee ? "Employee on pause" : "On pause now"} value={pauseScope?.activeCount ?? 0} tone="text-amber-700" />
        <PauseMetric icon={Coffee} label={selectedPauseEmployee ? "Employee break" : "Breaks active"} value={pauseScope?.activeBreakCount ?? 0} tone="text-orange-700" />
        <PauseMetric icon={Utensils} label={selectedPauseEmployee ? "Employee lunch" : "Lunch active"} value={pauseScope?.activeLunchCount ?? 0} tone="text-indigo-700" />
        <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#fff,#f8fafc)] px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500">Taken today</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-slate-900">
            {pauseScope ? `${formatMinutes(pauseScope.totalBreakMinutes + pauseScope.totalLunchMinutes)}` : "0h 0m"}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">{pauseScope?.completedPauseCount ?? 0} completed pauses{selectedPauseEmployee ? ` · ${selectedPauseEmployee.name}` : ""}</p>
        </div>
      </div>

      {people.length > 0 && (
        <div className="border-t border-slate-100 bg-white px-4 py-5 sm:px-7" aria-label="Filter people by branch">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-slate-500">
              <Building2 className="h-3.5 w-3.5 text-indigo-600" /> Branch view
            </div>
            <span className="text-[11px] font-medium text-slate-400">Choose an operating location</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <BranchViewButton
              active={branchFilter === "ALL"}
              label="All people"
              total={people.length}
              onShift={people.filter((person) => person.clockedIn).length}
              onPause={people.filter((person) => person.isOnBreak).length}
              onClick={() => setBranchFilter("ALL")}
            />
            {branchViews.map((branch) => (
              <BranchViewButton
                key={branch.name}
                active={branchFilter === branch.name || (branch.name === "Unassigned" && branchFilter === "__UNASSIGNED__")}
                label={branch.name}
                total={branch.total}
                onShift={branch.onShift}
                onPause={branch.onPause}
                onClick={() => setBranchFilter(branch.name === "Unassigned" ? "__UNASSIGNED__" : branch.name)}
              />
            ))}
          </div>
        </div>
      )}

      {activePeople.length > 0 && (
        <div className="mx-4 mb-5 rounded-2xl border border-amber-200/70 bg-[linear-gradient(135deg,#fffbeb,#fff7ed)] p-4 shadow-sm sm:mx-7" aria-label="People currently on break or lunch">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[.12em] text-amber-900">Active break list</h3>
              <p className="mt-1 text-xs text-amber-800">{activePeople.length} {activePeople.length === 1 ? "person is" : "people are"} away right now</p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold tabular-nums text-amber-900 ring-1 ring-amber-200">Live</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activePeople.map((person) => (
              <div key={`pause-${person.employeeId}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-amber-100">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{person.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    {person.activePauseType === "LUNCH" ? <Utensils className="h-3 w-3 text-indigo-500" /> : <Coffee className="h-3 w-3 text-orange-500" />}
                    {person.activePauseType === "LUNCH" ? "Lunch" : "Break"} · started {person.activePauseStartedAt ? formatTime(person.activePauseStartedAt) : "—"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold tabular-nums text-amber-800">{person.activePauseMinutes ?? 0}m</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pauseTakenPeople.length > 0 && (
        <div className="mx-4 mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mx-7" aria-label="Today's pause activity">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-[.12em] text-slate-700">Today&apos;s pause activity</h3>
              <p className="mt-1 text-xs text-slate-500">Completed and currently active break/lunch time by person</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{pauseTakenPeople.length} people</span>
          </div>
          <div className="mt-3 grid max-h-52 grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
            {pauseTakenPeople.map((person) => {
              const active = Number(person.activePauseMinutes || 0);
              const breakMinutes = Number(person.breakMinutes || 0) + (person.activePauseType === "BREAK" ? active : 0);
              const lunchMinutes = Number(person.lunchMinutes || 0) + (person.activePauseType === "LUNCH" ? active : 0);
              return (
                <button
                  key={`taken-${person.employeeId}`}
                  type="button"
                  aria-pressed={selectedPauseEmployeeId === person.employeeId}
                  onClick={() => setSelectedPauseEmployeeId((current) => current === person.employeeId ? null : person.employeeId)}
                  className={`flex min-h-[58px] w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left shadow-sm transition ${selectedPauseEmployeeId === person.employeeId ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200/80 bg-white hover:border-indigo-200"}`}
                >
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-slate-700">{person.name}</span>
                    <span className="mt-1 block text-[10px] text-slate-400">Today&apos;s pause time</span>
                  </div>
                  <span className="shrink-0 text-right text-[11px] tabular-nums text-slate-500">
                    {breakMinutes > 0 && <span className="mr-2 text-orange-700">☕ {breakMinutes}m</span>}
                    {lunchMinutes > 0 && <span className="text-indigo-700">🍽️ {lunchMinutes}m</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {people.length > 0 && (
        <div className="border-t border-slate-200/70 bg-slate-50/70 px-4 py-4 sm:px-7" role="search" aria-label="Filter team members">
          <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code"
              aria-label="Search by name or employee code"
              className={`${selectClass} w-full pl-8`}
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Filter by status" className={selectClass}>
            <option value="ALL">All status</option>
            <option value="ON_SHIFT">On shift</option>
            <option value="CLOCKED_OUT">Punched out</option>
            <option value="NOT_IN">Not punched in</option>
          </Select>
          {departmentOptions.length > 1 && (
            <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department" className={selectClass}>
              <option value="ALL">All departments</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Select>
          )}
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50">
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
          </div>
          <p className="mt-2 text-[11px] font-medium text-slate-400" aria-live="polite">
            Showing {visible.length} of {people.length}
          </p>
        </div>
      )}

      {loading && people.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading team locations…</p>
      ) : visible.length === 0 && people.length > 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No one matches these filters.</p>
      ) : people.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No employees to show yet.</p>
      ) : (
        <div className="grid max-h-[32rem] grid-cols-1 gap-3 overflow-y-auto bg-slate-50/70 px-4 pb-5 sm:grid-cols-2 sm:px-7 xl:grid-cols-3">
          {visible.map((person) => {
            const isMe = person.employeeId === myId;
            const mapsUrl = mapsSearchUrl(person.location);
            return (
              <div
                key={person.employeeId}
                className={`flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl border ${
                  person.clockedIn ? "bg-emerald-50/70 border-emerald-100" : "bg-slate-50 border-slate-100"
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {person.name}
                    {isMe ? <span className="ml-1 text-xs font-bold text-indigo-600">YOU</span> : null}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {person.department || person.designation || "Staff"}
                    {person.employeeCode ? ` · ${person.employeeCode}` : ""}
                  </p>
                  {person.checkIn ? (
                    mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline truncate"
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{person.location}</span>
                      </a>
                    ) : (
                      <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-700 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-indigo-500" />
                        {person.location || "Location not shared"}
                      </p>
                    )
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">Not punched in</p>
                  )}
                </div>
                <span className="shrink-0 text-right text-[10px] font-mono font-semibold text-slate-600">
                  {person.checkIn ? formatTime(person.checkIn) : "—"}
                  {person.checkOut && <span className="mt-0.5 block text-emerald-700">OUT {formatTime(person.checkOut)}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PauseMetric({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><Icon className={`h-3.5 w-3.5 ${tone}`} />{label}</div>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function BranchViewButton({
  active,
  label,
  total,
  onShift,
  onPause,
  onClick,
}: {
  active: boolean;
  label: string;
  total: number;
  onShift: number;
  onPause: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-[150px] shrink-0 rounded-2xl px-3.5 py-3 text-left ring-1 transition ${
        active ? "bg-indigo-600 text-white ring-indigo-600 shadow-[0_12px_24px_-12px_rgba(79,70,229,.8)]" : "bg-white text-slate-700 ring-slate-200 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:ring-slate-300"
      }`}
    >
      <span className="block truncate text-xs font-bold">{label}</span>
      <span className={`mt-1 block text-lg font-semibold tabular-nums ${active ? "text-white" : "text-slate-950"}`}>{total}</span>
      <span className={`mt-0.5 block text-[10px] ${active ? "text-indigo-100" : "text-slate-500"}`}>
        {onShift} on shift {onPause > 0 ? `· ${onPause} on pause` : ""}
      </span>
    </button>
  );
}
