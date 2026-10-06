"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, RefreshCw, Search, Users, X } from "lucide-react";
import { attendanceApi } from "@/lib/api";
import { formatTime } from "@/lib/utils";
import { mapsSearchUrl } from "@/lib/reverseGeocode";
import { useAuth } from "@/context/AuthContext";

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
  location?: string | null;
  clockedIn?: boolean;
}

export default function TeamPunchBoard() {
  const { user } = useAuth();
  const [people, setPeople] = useState<TeamPunchPerson[]>([]);
  const [clockedIn, setClockedIn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ON_SHIFT" | "CLOCKED_OUT" | "NOT_IN">("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const load = useCallback(async () => {
    try {
      const res = await attendanceApi.getLiveToday();
      const payload = res?.data || res;
      const list: TeamPunchPerson[] = payload?.people || [];
      setPeople(list);
      setClockedIn(payload?.clockedIn ?? list.filter((person) => person.clockedIn).length);
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
  const branchOptions = useMemo(() => unique(people.map((p) => p.branchName)), [people]);
  const departmentOptions = useMemo(() => unique(people.map((p) => p.department)), [people]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter((p) => {
      if (q && !`${p.name} ${p.employeeCode || ""} ${p.designation || ""}`.toLowerCase().includes(q)) return false;
      if (branchFilter !== "ALL" && p.branchName !== branchFilter) return false;
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

  return (
    <section className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" />
            Team punch locations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {clockedIn} on shift · visible to everyone in this workspace
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          title="Refresh locations"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {people.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" role="search" aria-label="Filter team members">
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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Filter by status" className={selectClass}>
            <option value="ALL">All status</option>
            <option value="ON_SHIFT">On shift</option>
            <option value="CLOCKED_OUT">Clocked out</option>
            <option value="NOT_IN">Not clocked in</option>
          </select>
          {branchOptions.length > 1 && (
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} aria-label="Filter by branch" className={selectClass}>
              <option value="ALL">All branches</option>
              {branchOptions.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
          {departmentOptions.length > 1 && (
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filter by department" className={selectClass}>
              <option value="ALL">All departments</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          {filtersActive && (
            <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50">
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
          <p className="w-full text-[11px] text-slate-500" aria-live="polite">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[28rem] overflow-y-auto">
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
                    <p className="mt-1 text-xs text-slate-400">Not clocked in</p>
                  )}
                </div>
                <span className="text-xs font-mono font-semibold text-slate-600 shrink-0">
                  {person.checkIn ? formatTime(person.checkIn) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
