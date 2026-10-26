/** OFF is a holiday or weekly off: the person is neither present nor absent. */
export type RosterStatus = "PRESENT" | "REMOTE" | "ON_LEAVE" | "LATE" | "ABSENT" | "OFF";

/** The statuses that have a KPI tile. Absent and day-off people are listed separately. */
export type KpiStatus = Exclude<RosterStatus, "ABSENT" | "OFF">;

interface AttendanceLike {
  status?: string;
  isWfh?: boolean;
}

/**
 * What the roster shows for one employee today. Only a real working status counts as
 * present: leave, holiday and week-off rows must not be listed as "Present".
 */
export function rosterStatusFor(attendance: AttendanceLike | undefined, hasApprovedLeave: boolean, isDayOff = false): RosterStatus {
  if (attendance) {
    switch (attendance.status) {
      case "LATE":
        return "LATE";
      case "WORK_FROM_HOME":
        return "REMOTE";
      case "ON_LEAVE":
        return "ON_LEAVE";
      case "HOLIDAY":
      case "WEEK_OFF":
        return "OFF";
      case "ABSENT":
        return "ABSENT";
      default:
        return attendance.isWfh ? "REMOTE" : "PRESENT";
    }
  }
  if (hasApprovedLeave) return "ON_LEAVE";
  // No record on a company holiday: they were never expected, so they are not absent.
  return isDayOff ? "OFF" : "ABSENT";
}

export interface DashboardCounts {
  total: number;
  present: number;
  wfh: number;
  onLeave: number;
  late: number;
  notStarted: number;
  turnoutPercent: number;
}

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * Headline numbers. The server summary is the source of truth (active staff only, the
 * tenant's own "today"); the roster is only a fallback while it has not loaded. Half-day
 * staff did attend, so they count as present.
 */
export function dashboardCounts(
  summary: Record<string, unknown> | null | undefined,
  roster: { status: RosterStatus }[],
  employeeTotal: number,
): DashboardCounts {
  const fromRoster = (status: RosterStatus) => roster.filter((person) => person.status === status).length;
  const hasSummary = Boolean(summary) && typeof summary === "object";

  const total = num(summary?.totalEmployees) ?? (employeeTotal || roster.length);
  const present = hasSummary ? (num(summary?.present) ?? 0) + (num(summary?.halfDay) ?? 0) : fromRoster("PRESENT");
  const wfh = hasSummary ? (num(summary?.wfh) ?? 0) : fromRoster("REMOTE");
  const onLeave = hasSummary ? (num(summary?.onLeave) ?? 0) : fromRoster("ON_LEAVE");
  const late = hasSummary ? (num(summary?.late) ?? 0) : fromRoster("LATE");

  // The server knows about holidays (nobody is "absent" on one); fall back to arithmetic.
  const notStarted = num(summary?.absent) ?? Math.max(0, total - present - wfh - onLeave - late);
  const turnoutPercent = total > 0 ? Math.min(100, Math.round(((present + late + wfh) / total) * 100)) : 0;

  return { total, present, wfh, onLeave, late, notStarted, turnoutPercent };
}
