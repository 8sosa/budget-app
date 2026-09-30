// Transaction dates are calendar dates, not moments in time. They are stored at
// 12:00 UTC so they show as the same day in every timezone from UTC-11 to UTC+11,
// and period ranges are computed in UTC to match.

import { format } from "date-fns";

// "2026-09-30" -> 2026-09-30T12:00:00Z. Returns null for anything unparseable.
export function parseDateOnly(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return date.getUTCMonth() === m - 1 ? date : null;
}

// Value for an <input type="date">, using the viewer's local calendar day.
export function toDateInputValue(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

// [start, end) of a month (0-11) or a whole year, in UTC.
export function periodRange(viewMode: string, month: number, year: number) {
  if (viewMode === "yearly") {
    return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
  }
  return { gte: new Date(Date.UTC(year, month, 1)), lt: new Date(Date.UTC(year, month + 1, 1)) };
}
