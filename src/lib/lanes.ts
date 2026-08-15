import type { PlannerEvent } from "./types";
import { clampToYear, overlaps, spanDays } from "./dates";

/**
 * Lane assignment is GLOBAL across the year, not per month row.
 *
 * The per-month alternative packs rows tighter, but a three-month event would
 * hop lanes between rows and stop reading as one thing. Assigning once over the
 * whole year keeps a long block on the same line in every row it touches, at
 * the cost of the occasional empty lane. That trade is why overlapping events
 * are visible here at all — the original tool drew only the first match per day
 * and silently swallowed the rest.
 */
export function assignLanes(events: PlannerEvent[]): Map<string, number> {
  const ordered = [...events].sort(
    (a, b) =>
      a.start_date.localeCompare(b.start_date) ||
      spanDays(b.start_date, b.end_date) - spanDays(a.start_date, a.end_date) ||
      a.title.localeCompare(b.title),
  );

  const lanes: PlannerEvent[][] = [];
  const assignment = new Map<string, number>();

  for (const evt of ordered) {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      const clash = lanes[i].some((other) =>
        overlaps(evt.start_date, evt.end_date, other.start_date, other.end_date),
      );
      if (!clash) {
        lanes[i].push(evt);
        assignment.set(evt.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push([evt]);
      assignment.set(evt.id, lanes.length - 1);
    }
  }

  return assignment;
}

export type MonthSegment = {
  event: PlannerEvent;
  lane: number;
  /** 1-based day of month where the block starts in this row. */
  startDay: number;
  /** 1-based day of month where it ends in this row, inclusive. */
  endDay: number;
  /** True when the event continues past this row. */
  clippedStart: boolean;
  clippedEnd: boolean;
};

/** Slice every event into the piece that belongs to one month row. */
export function segmentsForMonth(
  events: PlannerEvent[],
  lanes: Map<string, number>,
  year: number,
  monthIndex: number,
  daysInThisMonth: number,
): MonthSegment[] {
  const mStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const mEnd = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(daysInThisMonth).padStart(2, "0")}`;

  const out: MonthSegment[] = [];
  for (const evt of events) {
    if (!overlaps(evt.start_date, evt.end_date, mStart, mEnd)) continue;
    const start = evt.start_date > mStart ? evt.start_date : mStart;
    const end = evt.end_date < mEnd ? evt.end_date : mEnd;
    out.push({
      event: evt,
      lane: lanes.get(evt.id) ?? 0,
      startDay: Number(start.slice(8, 10)),
      endDay: Number(end.slice(8, 10)),
      clippedStart: evt.start_date < mStart,
      clippedEnd: evt.end_date > mEnd,
    });
  }
  return out;
}

/** How many lanes a month row has to be tall enough for. */
export function laneCountForMonth(segments: MonthSegment[]): number {
  return segments.reduce((max, s) => Math.max(max, s.lane + 1), 0);
}

/** Events that touch the given year at all, clipped for display purposes. */
export function eventsInYear(events: PlannerEvent[], year: number): PlannerEvent[] {
  return events.filter((e) => clampToYear(e.start_date, e.end_date, year) !== null);
}
