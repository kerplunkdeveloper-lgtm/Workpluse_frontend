/** Shape returned by GET /employees/celebrations (birth month/day only, never the year). */
export type CelebrationPerson = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  designation?: string | null;
  department?: string | null;
  photoUrl?: string | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  /** Calendar date, YYYY-MM-DD. */
  dateOfJoining?: string | null;
};

export type MomentKind = "Birthday" | "Work anniversary";

export type Moment = {
  id: string;
  person: CelebrationPerson;
  name: string;
  kind: MomentKind;
  date: Date;
  /** Whole days from today (0 = today). */
  daysAway: number;
  /** Completed years with the company, for anniversaries. */
  years?: number;
};

const DAY_MS = 86_400_000;

export const personFullName = (person: CelebrationPerson) =>
  `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Team member";

export const personInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

/** Next date on or after `today` that falls on the given month (1-12) and day. */
function nextOccurrence(month: number, day: number, today: Date) {
  let date = new Date(today.getFullYear(), month - 1, day);
  if (date < today) date = new Date(today.getFullYear() + 1, month - 1, day);
  return date;
}

/**
 * Upcoming birthdays and work anniversaries within `windowDays`, soonest first.
 * An anniversary only counts once a full year has been completed, so a new joiner
 * does not get a "0 years" card.
 */
export function buildMoments(people: CelebrationPerson[], now: Date = new Date(), windowDays = 365): Moment[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const moments: Moment[] = [];

  for (const person of people) {
    const name = personFullName(person);

    if (person.birthMonth && person.birthDay) {
      const date = nextOccurrence(Number(person.birthMonth), Number(person.birthDay), today);
      moments.push({
        id: `${person.id}-birthday`,
        person,
        name,
        kind: "Birthday",
        date,
        daysAway: Math.round((date.getTime() - today.getTime()) / DAY_MS),
      });
    }

    // Parse the parts directly: new Date("YYYY-MM-DD") is UTC midnight and can shift the day.
    const joined = /^(\d{4})-(\d{2})-(\d{2})/.exec(person.dateOfJoining || "");
    if (joined) {
      const [joinYear, month, day] = [Number(joined[1]), Number(joined[2]), Number(joined[3])];
      const date = nextOccurrence(month, day, today);
      const years = date.getFullYear() - joinYear;
      // Same rule as the dashboard: nothing until a full year has been completed.
      const completedFirstYear = new Date(joinYear + 1, month - 1, day) <= today;
      if (years >= 1 && completedFirstYear) {
        moments.push({
          id: `${person.id}-anniversary`,
          person,
          name,
          kind: "Work anniversary",
          date,
          daysAway: Math.round((date.getTime() - today.getTime()) / DAY_MS),
          years,
        });
      }
    }
  }

  return moments
    .filter((moment) => moment.daysAway <= windowDays)
    .sort((a, b) => a.daysAway - b.daysAway || a.name.localeCompare(b.name));
}

export function momentWhen(moment: Moment) {
  if (moment.daysAway === 0) return "Today";
  if (moment.daysAway === 1) return "Tomorrow";
  return moment.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function defaultMessage(moment: Moment, companyName: string) {
  const first = moment.person.firstName || moment.name.split(" ")[0] || "there";
  if (moment.kind === "Birthday") {
    return `Wishing you a very happy birthday, ${first}! Thank you for everything you bring to ${companyName}. Have a wonderful day!`;
  }
  const years = moment.years || 1;
  return `Congratulations on ${years} ${years === 1 ? "year" : "years"} with ${companyName}, ${first}! Thank you for your dedication. Here's to everything ahead.`;
}
