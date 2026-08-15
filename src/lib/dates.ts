/**
 * Every date in this app is a plain ISO `yyyy-mm-dd` string — a calendar day,
 * not an instant. All arithmetic goes through UTC so a browser in a negative
 * offset never renders an event a day early.
 */

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

const pad2 = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isoOf(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function addWeeks(iso: string, weeks: number): string {
  return addDays(iso, weeks * 7);
}

/** Whole days from `a` to `b`. Negative when `b` is earlier. */
export function daysBetween(a: string, b: string): number {
  return Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);
}

/** Inclusive length of a range, in days. */
export function spanDays(startISO: string, endISO: string): number {
  return daysBetween(startISO, endISO) + 1;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** 0 = Sunday. */
export function dayOfWeek(iso: string): number {
  return fromISO(iso).getUTCDay();
}

export function isWeekend(iso: string): boolean {
  const d = dayOfWeek(iso);
  return d === 0 || d === 6;
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

export function monthIndexOf(iso: string): number {
  return Number(iso.slice(5, 7)) - 1;
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

export function todayISO(): string {
  return toISO(new Date());
}

/** Do [aStart,aEnd] and [bStart,bEnd] share at least one day? */
export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function formatNice(iso: string): string {
  const d = fromISO(iso);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatRange(startISO: string, endISO: string): string {
  if (startISO === endISO) return formatNice(startISO);
  const sameYear = yearOf(startISO) === yearOf(endISO);
  return sameYear
    ? `${formatNice(startISO)} – ${formatNice(endISO)}`
    : `${formatNice(startISO)}, ${yearOf(startISO)} – ${formatNice(endISO)}, ${yearOf(endISO)}`;
}

/** Clamp a range to a calendar year, or null when it misses the year entirely. */
export function clampToYear(
  startISO: string,
  endISO: string,
  year: number,
): { start: string; end: string } | null {
  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;
  if (endISO < yStart || startISO > yEnd) return null;
  return {
    start: startISO < yStart ? yStart : startISO,
    end: endISO > yEnd ? yEnd : endISO,
  };
}
