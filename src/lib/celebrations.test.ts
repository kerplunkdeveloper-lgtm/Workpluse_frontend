import { describe, expect, it } from "vitest";
import { buildMoments, defaultMessage, momentWhen, personInitials, type CelebrationPerson } from "./celebrations";

// Wednesday 5 Nov 2026, afternoon: the time of day must not move any date.
const NOW = new Date(2026, 10, 5, 15, 30);

const person = (over: Partial<CelebrationPerson>): CelebrationPerson => ({ id: "p1", firstName: "Asha", lastName: "Rao", ...over });

describe("buildMoments", () => {
  it("finds a birthday later this year and one that already passed (next year)", () => {
    const moments = buildMoments(
      [person({ id: "a", birthMonth: 12, birthDay: 1 }), person({ id: "b", birthMonth: 10, birthDay: 7 })],
      NOW,
    );
    expect(moments.map((m) => [m.id, m.daysAway])).toEqual([
      ["a-birthday", 26],
      ["b-birthday", 336],
    ]);
  });

  it("treats today as 0 days away and tomorrow as 1", () => {
    const [today, tomorrow] = buildMoments(
      [person({ id: "t", birthMonth: 11, birthDay: 5 }), person({ id: "n", birthMonth: 11, birthDay: 6 })],
      NOW,
    );
    expect([today.daysAway, momentWhen(today)]).toEqual([0, "Today"]);
    expect([tomorrow.daysAway, momentWhen(tomorrow)]).toEqual([1, "Tomorrow"]);
  });

  it("counts completed years and skips anyone who has not finished a first year", () => {
    const moments = buildMoments(
      [
        person({ id: "old", dateOfJoining: "2018-11-20" }),
        person({ id: "new", dateOfJoining: "2026-03-01" }),
        person({ id: "almost", dateOfJoining: "2025-11-06" }),
        person({ id: "exact", dateOfJoining: "2025-11-05" }),
      ],
      NOW,
    );
    // "almost" completes its first year tomorrow, so it stays hidden until it has; "exact" is today.
    expect(moments.map((m) => [m.id, m.years])).toEqual([
      ["exact-anniversary", 1],
      ["old-anniversary", 8],
    ]);
  });

  it("reads a joining date as a calendar day, not a UTC instant", () => {
    const [moment] = buildMoments([person({ dateOfJoining: "2020-12-01" })], NOW);
    expect([moment.date.getMonth(), moment.date.getDate()]).toEqual([11, 1]);
  });

  it("ignores people with no dates and sorts soonest first", () => {
    const moments = buildMoments(
      [person({ id: "none" }), person({ id: "far", birthMonth: 9, birthDay: 1 }), person({ id: "near", birthMonth: 11, birthDay: 8 })],
      NOW,
    );
    expect(moments.map((m) => m.id)).toEqual(["near-birthday", "far-birthday"]);
  });

  it("limits results to the requested window", () => {
    const moments = buildMoments([person({ id: "far", birthMonth: 9, birthDay: 1 }), person({ id: "near", birthMonth: 11, birthDay: 8 })], NOW, 30);
    expect(moments.map((m) => m.id)).toEqual(["near-birthday"]);
  });
});

describe("card text", () => {
  it("writes a birthday and an anniversary message using the company name", () => {
    const [birthday] = buildMoments([person({ birthMonth: 11, birthDay: 9 })], NOW);
    const [anniversary] = buildMoments([person({ dateOfJoining: "2021-11-09" })], NOW);
    expect(defaultMessage(birthday, "Acme")).toContain("happy birthday, Asha");
    expect(defaultMessage(anniversary, "Acme")).toContain("5 years with Acme");
  });

  it("makes initials for a photo-less person", () => {
    expect(personInitials("Vasanth Raj")).toBe("VR");
    expect(personInitials("Madonna")).toBe("M");
  });
});
