"use client";

import React, { useCallback, useEffect, useState } from "react";
import { MapPin, RefreshCw, Users } from "lucide-react";
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

  return (
    <section className="rounded-3xl bg-white border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
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

      {loading && people.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading team locations…</p>
      ) : people.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No employees to show yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-[28rem] overflow-y-auto">
          {people.map((person) => {
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
                    {isMe ? <span className="ml-1 text-[10px] font-bold text-indigo-600">YOU</span> : null}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {person.department || person.designation || "Staff"}
                    {person.employeeCode ? ` · ${person.employeeCode}` : ""}
                  </p>
                  {person.checkIn ? (
                    mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline truncate"
                      >
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{person.location}</span>
                      </a>
                    ) : (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-700 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-indigo-500" />
                        {person.location || "Location not shared"}
                      </p>
                    )
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-400">Not clocked in</p>
                  )}
                </div>
                <span className="text-[11px] font-mono font-semibold text-slate-600 shrink-0">
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
