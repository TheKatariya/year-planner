"use server";

// No revalidatePath here on purpose: the page is force-dynamic and every
// action returns the updated event, which the client merges into its own
// state. Revalidating would fire an extra full-page RSC fetch per drag.

import { db } from "@/lib/supabase";
import { addWeeks } from "@/lib/dates";
import type { LeadStep, Milestone, PlannerEvent, EventDraft } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

async function loadEvent(id: string): Promise<PlannerEvent> {
  const client = db();
  const [{ data: evt, error }, { data: ms, error: msError }] = await Promise.all([
    client.from("planner_events").select("*").eq("id", id).single(),
    client
      .from("planner_milestones")
      .select("*")
      .eq("event_id", id)
      .order("sort_order"),
  ]);

  if (error) throw new Error(error.message);
  if (msError) throw new Error(msError.message);

  return {
    ...(evt as Omit<PlannerEvent, "milestones">),
    milestones: (ms ?? []) as Milestone[],
  };
}

function ladderFor(template: LeadStep[], startDate: string, eventId: string) {
  return [...template]
    .sort((a, b) => b.weeks_before - a.weeks_before)
    .map((step, i) => ({
      event_id: eventId,
      label: step.label,
      weeks_before: step.weeks_before,
      due_date: addWeeks(startDate, -step.weeks_before),
      sort_order: i,
      done: false,
    }));
}

async function templateFor(categoryId: string | null): Promise<LeadStep[]> {
  if (!categoryId) return [];
  const { data, error } = await db()
    .from("planner_categories")
    .select("lead_template")
    .eq("id", categoryId)
    .single();
  if (error) throw new Error(error.message);
  return ((data?.lead_template ?? []) as LeadStep[]) ?? [];
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

export async function createEvent(draft: EventDraft): Promise<PlannerEvent> {
  const client = db();

  const { data, error } = await client
    .from("planner_events")
    .insert({
      title: draft.title,
      category_id: draft.category_id,
      start_date: draft.start_date,
      end_date: draft.end_date,
      note: draft.note || null,
      notion_url: draft.notion_url || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(`Could not save event: ${error.message}`);

  // Seed the backward-planning ladder from the category's template.
  const template = await templateFor(draft.category_id);
  if (template.length > 0) {
    const { error: msError } = await client
      .from("planner_milestones")
      .insert(ladderFor(template, draft.start_date, data.id));
    if (msError) throw new Error(`Could not seed milestones: ${msError.message}`);
  }

  return loadEvent(data.id);
}

export async function updateEvent(
  draft: EventDraft & { id: string },
): Promise<PlannerEvent> {
  const client = db();

  const { data: before, error: readError } = await client
    .from("planner_events")
    .select("start_date, category_id")
    .eq("id", draft.id)
    .single();
  if (readError) throw new Error(readError.message);

  const { error } = await client
    .from("planner_events")
    .update({
      title: draft.title,
      category_id: draft.category_id,
      start_date: draft.start_date,
      end_date: draft.end_date,
      note: draft.note || null,
      notion_url: draft.notion_url || null,
    })
    .eq("id", draft.id);

  if (error) throw new Error(`Could not update event: ${error.message}`);

  if (before.category_id !== draft.category_id) {
    // Category changed, so the old ladder no longer describes the work.
    return regenerateMilestones(draft.id);
  }
  if (before.start_date !== draft.start_date) {
    await reflowMilestones(draft.id, draft.start_date);
  }

  return loadEvent(draft.id);
}

/** Drag-move and drag-resize take this lighter path. */
export async function setEventDates(
  id: string,
  startDate: string,
  endDate: string,
): Promise<PlannerEvent> {
  const client = db();

  const { data: before, error: readError } = await client
    .from("planner_events")
    .select("start_date")
    .eq("id", id)
    .single();
  if (readError) throw new Error(readError.message);

  const { error } = await client
    .from("planner_events")
    .update({ start_date: startDate, end_date: endDate })
    .eq("id", id);

  if (error) throw new Error(`Could not move event: ${error.message}`);

  if (before.start_date !== startDate) await reflowMilestones(id, startDate);

  return loadEvent(id);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await db().from("planner_events").delete().eq("id", id);
  if (error) throw new Error(`Could not delete event: ${error.message}`);
}

/* ------------------------------------------------------------------ *
 * Milestones — the backward-planning ladder
 * ------------------------------------------------------------------ */

/**
 * Slide generated milestones along with the event. A milestone whose
 * `weeks_before` is null was hand-placed, so it stays where it was put.
 */
async function reflowMilestones(eventId: string, newStart: string): Promise<void> {
  const client = db();
  const { data, error } = await client
    .from("planner_milestones")
    .select("id, weeks_before")
    .eq("event_id", eventId)
    .not("weeks_before", "is", null);

  if (error) throw new Error(error.message);

  await Promise.all(
    (data ?? []).map((m) =>
      client
        .from("planner_milestones")
        .update({ due_date: addWeeks(newStart, -(m.weeks_before as number)) })
        .eq("id", m.id),
    ),
  );
}

/** Wipe the ladder and rebuild it from the category's current template. */
export async function regenerateMilestones(eventId: string): Promise<PlannerEvent> {
  const client = db();

  const { data: evt, error } = await client
    .from("planner_events")
    .select("start_date, category_id")
    .eq("id", eventId)
    .single();
  if (error) throw new Error(error.message);

  await client.from("planner_milestones").delete().eq("event_id", eventId);

  const template = await templateFor(evt.category_id);
  if (template.length > 0) {
    const { error: insertError } = await client
      .from("planner_milestones")
      .insert(ladderFor(template, evt.start_date, eventId));
    if (insertError) throw new Error(insertError.message);
  }

  return loadEvent(eventId);
}

export async function addMilestone(
  eventId: string,
  label: string,
  weeksBefore: number,
): Promise<PlannerEvent> {
  const client = db();

  const { data: evt, error } = await client
    .from("planner_events")
    .select("start_date")
    .eq("id", eventId)
    .single();
  if (error) throw new Error(error.message);

  const { error: insertError } = await client.from("planner_milestones").insert({
    event_id: eventId,
    label,
    weeks_before: weeksBefore,
    due_date: addWeeks(evt.start_date, -weeksBefore),
    sort_order: -weeksBefore,
  });
  if (insertError) throw new Error(insertError.message);

  return loadEvent(eventId);
}

export async function updateMilestone(
  id: string,
  patch: {
    label?: string;
    due_date?: string;
    done?: boolean;
    notion_url?: string | null;
  },
): Promise<PlannerEvent> {
  const client = db();

  // A hand-set date pins the milestone: null out the offset so it stops
  // sliding when the event moves.
  const payload: Record<string, unknown> = { ...patch };
  if (patch.due_date !== undefined) payload.weeks_before = null;

  const { data, error } = await client
    .from("planner_milestones")
    .update(payload)
    .eq("id", id)
    .select("event_id")
    .single();

  if (error) throw new Error(`Could not update milestone: ${error.message}`);

  return loadEvent(data.event_id as string);
}

export async function deleteMilestone(id: string): Promise<PlannerEvent> {
  const client = db();
  const { data, error } = await client
    .from("planner_milestones")
    .delete()
    .eq("id", id)
    .select("event_id")
    .single();

  if (error) throw new Error(`Could not delete milestone: ${error.message}`);

  return loadEvent(data.event_id as string);
}
