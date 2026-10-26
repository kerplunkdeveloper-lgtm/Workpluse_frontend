import { describe, expect, it } from "vitest";
import { dashboardCounts, rosterStatusFor } from "./dashboardMetrics";

describe("rosterStatusFor", () => {
  it("lists only working statuses as present", () => {
    expect(rosterStatusFor({ status: "PRESENT" }, false)).toBe("PRESENT");
    expect(rosterStatusFor({ status: "HALF_DAY" }, false)).toBe("PRESENT");
  });

  it("never reports leave, holiday or week-off rows as present", () => {
    expect(rosterStatusFor({ status: "ON_LEAVE" }, false)).toBe("ON_LEAVE");
    // A holiday or weekly off is a day off, not an absence.
    expect(rosterStatusFor({ status: "HOLIDAY" }, false)).toBe("OFF");
    expect(rosterStatusFor({ status: "WEEK_OFF" }, false)).toBe("OFF");
  });

  it("maps late and remote punches, and falls back to approved leave", () => {
    expect(rosterStatusFor({ status: "LATE" }, false)).toBe("LATE");
    expect(rosterStatusFor({ status: "WORK_FROM_HOME" }, false)).toBe("REMOTE");
    expect(rosterStatusFor({ status: "PRESENT", isWfh: true }, false)).toBe("REMOTE");
    expect(rosterStatusFor(undefined, true)).toBe("ON_LEAVE");
    expect(rosterStatusFor(undefined, false)).toBe("ABSENT");
    expect(rosterStatusFor({ status: "ABSENT" }, false)).toBe("ABSENT");
  });

  it("does not call someone absent when the whole company has the day off", () => {
    expect(rosterStatusFor(undefined, false, true)).toBe("OFF");
    expect(rosterStatusFor(undefined, true, true)).toBe("ON_LEAVE");
  });
});

describe("dashboardCounts", () => {
  const summary = { totalEmployees: 10, present: 4, halfDay: 1, late: 2, wfh: 1, onLeave: 1, absent: 1 };

  it("trusts the server summary and counts half-day staff as present", () => {
    expect(dashboardCounts(summary, [], 25)).toMatchObject({ total: 10, present: 5, late: 2, wfh: 1, onLeave: 1, notStarted: 1 });
  });

  it("uses active staff from the summary, not the unfiltered employee list", () => {
    expect(dashboardCounts(summary, [], 25).total).toBe(10);
  });

  it("reports nobody as not started on a holiday", () => {
    const holiday = { totalEmployees: 10, present: 0, halfDay: 0, late: 0, wfh: 0, onLeave: 0, absent: 0, isHoliday: true };
    expect(dashboardCounts(holiday, [], 10)).toMatchObject({ notStarted: 0, turnoutPercent: 0 });
  });

  it("computes turnout from the same counts shown on screen", () => {
    expect(dashboardCounts(summary, [], 10).turnoutPercent).toBe(80);
  });

  it("falls back to the roster while the summary has not loaded", () => {
    const roster = [{ status: "PRESENT" as const }, { status: "LATE" as const }, { status: "ABSENT" as const }];
    expect(dashboardCounts(null, roster, 3)).toMatchObject({ total: 3, present: 1, late: 1, notStarted: 1 });
  });
});
