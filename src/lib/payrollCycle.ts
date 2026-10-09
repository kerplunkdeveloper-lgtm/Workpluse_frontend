/**
 * Mirrors the backend payroll cycle rule (attendance-backend/src/utils/payrollCycle.js) so the
 * policy screen can show an example while the admin edits the days.
 *  - startDay < endDay: both days in the same month, inclusive.
 *  - startDay >= endDay: startDay of the previous month up to the day before endDay.
 */
export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DAY_MS = 86400000;

const daysInMonth = (year: number, monthIndex: number) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const clampDay = (year: number, monthIndex: number, day: number) =>
  Math.min(Math.max(1, day), daysInMonth(year, monthIndex));

export function cyclePeriod(month: number, year: number, startDay: number, endDay: number) {
  const monthIndex = month - 1;
  let start: number;
  let end: number;

  if (startDay < endDay) {
    start = Date.UTC(year, monthIndex, clampDay(year, monthIndex, startDay));
    end = Date.UTC(year, monthIndex, clampDay(year, monthIndex, endDay));
  } else {
    const prevIndex = monthIndex === 0 ? 11 : monthIndex - 1;
    const prevYear = monthIndex === 0 ? year - 1 : year;
    start = Date.UTC(prevYear, prevIndex, clampDay(prevYear, prevIndex, startDay));
    end = Date.UTC(year, monthIndex, clampDay(year, monthIndex, endDay)) - DAY_MS;
  }

  return {
    start: new Date(start),
    end: new Date(end),
    days: Math.round((end - start) / DAY_MS) + 1,
  };
}

export const formatCycleDate = (date: Date) =>
  `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;

/** Half-hour and quarter-hour permission steps, from 0.25 to 8 hours. */
export const PERMISSION_HOUR_OPTIONS = Array.from({ length: 32 }, (_, i) => (i + 1) * 0.25);
