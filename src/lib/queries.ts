import "server-only";
import { db } from "./supabase";
import type { Category, Milestone, PlannerEvent } from "./types";

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await db()
    .from("planner_categories")
    .select("*")
    .eq("archived", false)
    .order("sort_order");

  if (error) throw new Error(`Loading categories failed: ${error.message}`);
  return (data ?? []) as Category[];
}

/**
 * Events overlapping the year, plus a lead-in window so a January event's
 * milestones from the previous December are still available to render.
 */
export async function getEvents(year: number): Promise<PlannerEvent[]> {
  const client = db();

  const { data: rows, error } = await client
    .from("planner_events")
    .select("*")
    .lte("start_date", `${year}-12-31`)
    .gte("end_date", `${year}-01-01`)
    .order("start_date");

  if (error) throw new Error(`Loading events failed: ${error.message}`);

  const events = (rows ?? []) as Omit<PlannerEvent, "milestones">[];
  if (events.length === 0) return [];

  const { data: msRows, error: msError } = await client
    .from("planner_milestones")
    .select("*")
    .in(
      "event_id",
      events.map((e) => e.id),
    )
    .order("sort_order");

  if (msError) throw new Error(`Loading milestones failed: ${msError.message}`);

  const byEvent = new Map<string, Milestone[]>();
  for (const m of (msRows ?? []) as Milestone[]) {
    const list = byEvent.get(m.event_id);
    if (list) list.push(m);
    else byEvent.set(m.event_id, [m]);
  }

  return events.map((e) => ({ ...e, milestones: byEvent.get(e.id) ?? [] }));
}

/** Which years already have something on them, for the year switcher. */
export async function getPopulatedYears(): Promise<number[]> {
  const { data, error } = await db()
    .from("planner_events")
    .select("start_date, end_date");

  if (error) throw new Error(`Loading year list failed: ${error.message}`);

  const years = new Set<number>();
  for (const row of (data ?? []) as { start_date: string; end_date: string }[]) {
    const from = Number(row.start_date.slice(0, 4));
    const to = Number(row.end_date.slice(0, 4));
    for (let y = from; y <= to; y++) years.add(y);
  }
  return [...years].sort();
}
