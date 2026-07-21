// Month-grid helpers for the calendar. All dates are handled in UTC to match
// the app's fixed demo clock and ISO-string storage (no timezone drift).

export interface CalendarDay {
  iso: string; // YYYY-MM-DD (UTC)
  day: number; // day of month
  inMonth: boolean;
  isToday: boolean;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** YYYY-MM-DD (UTC) for an ISO timestamp. */
export function utcDayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Parse "YYYY-MM" → {year, month0}. Falls back to the given default. */
export function parseMonth(
  value: string | undefined,
  fallback: { year: number; month0: number },
): { year: number; month0: number } {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return fallback;
  const year = Number(m[1]);
  const month0 = Number(m[2]) - 1;
  if (month0 < 0 || month0 > 11) return fallback;
  return { year, month0 };
}

export function monthLabel(year: number, month0: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month0, 1)));
}

/** `?month=` string for an adjacent month. */
export function shiftMonth(year: number, month0: number, delta: number): string {
  const d = new Date(Date.UTC(year, month0 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 6×7 grid of days covering the month (with leading/trailing days). */
export function buildMonthGrid(
  year: number,
  month0: number,
  todayIso: string,
): CalendarDay[] {
  const firstOfMonth = new Date(Date.UTC(year, month0, 1));
  const startWeekday = firstOfMonth.getUTCDay(); // 0=Sun
  const gridStart = new Date(Date.UTC(year, month0, 1 - startWeekday));

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getTime() + i * 86400_000);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      iso,
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month0,
      isToday: iso === todayIso,
    });
  }
  return days;
}
