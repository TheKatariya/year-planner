# Lead Times (Backward Planning)

> The event date is not the planning date.

In the original tool this was a slide. Here it's data.

Every event carries a **ladder** of milestones — labelled steps measured in weeks
before the start date. They render as small ticks in a thin band above each
month's lanes, in the event's category colour, so you can see the preparation
work sitting weeks or months earlier in the year.

---

## Where a ladder comes from

Each category in `planner_categories` has a `lead_template` — a JSON array:

```json
[
  {"label": "Cause and format confirmed",       "weeks_before": 14},
  {"label": "Creative, ops and staffing",       "weeks_before": 10},
  {"label": "Registration and promotion open",  "weeks_before": 6},
  {"label": "Final member comms",               "weeks_before": 2}
]
```

When you save a new event, the ladder is instantiated: each step becomes a
`planner_milestones` row with `due_date = start_date − weeks_before × 7`.

### The shipped defaults

| Category | Ladder (weeks before start) |
|---|---|
| **Competition** | 16 event confirmed · 12 training focus in programming · 8 registration opens · 4 community hype + content · 1 final logistics |
| **Charity** | 14 cause and format · 10 creative, ops, staffing · 6 registration and promotion · 2 final comms |
| **Community** | 8 concept locked · 4 creative + signup live · 1 final comms |
| **Promotion** | 6 offer and margins · 4 creative and landing page · 2 warm-up content · 1 launch comms |
| **Member Appreciation** | 4 plan and budget · 2 prep and staff brief · 1 tease it |
| **Marketing / Retail** | 4 content plan · 2 assets shot |
| **Closure / Holiday** | 4 staff notified · 2 members notified · 1 signage |
| **Travel** | 6 cover arranged · 3 schedule published · 1 handover notes |
| **Operations** | 8 scope and quotes · 4 vendor booked · 2 member notice |

These are a starting position, not a doctrine. Edit `lead_template` in Supabase
and every event created afterwards uses the new ladder. Existing events keep
theirs until you hit **Reset from category** in the editor.

---

## Generated vs pinned

The `weeks_before` column is what makes a milestone follow its event.

- **Generated** (`weeks_before` is a number) — the milestone slides automatically
  whenever the event's start date moves, whether you dragged the block or typed a
  new date. Twelve weeks before is still twelve weeks before.
- **Pinned** (`weeks_before` is `null`) — the milestone stays exactly where it is.

Editing a milestone's date by hand pins it. That's deliberate: if you've moved
"registration opens" to a specific Monday because that's when the email goes out,
nudging the event by three days shouldn't drag it off that Monday.

To un-pin, delete the milestone and re-add it with a week offset, or reset the
whole ladder from the category.

---

## Reading the strip

The band sits between the day numbers and the event lanes in every month row.

- A **hollow tick** is an outstanding milestone.
- A **filled tick** is done — tick the checkbox in the editor.
- Hovering or selecting an event **highlights all of its milestones** across
  every month row at once, which is the view that actually answers "when does
  work on this start?"
- Hovering a tick tells you which event it belongs to.

Milestones falling outside the displayed year aren't drawn. A January event with
a 16-week ladder has most of its preparation in the previous year — switch years
to see it.

---

## What this doesn't do yet

Milestones are markers, not tasks. There's no assignee, no reminder, no push into
Todoist or Notion. See [[future-enhancements]].

---

## Related

- [[planning-method]] — § *Work backwards*
- [[README]]
