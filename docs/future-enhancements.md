# Future Enhancements

You said you wanted to use the tool before deciding what else it needs. This is
the list of things deliberately left out of v1, each with the seam it would
attach to — so adding one later is a change, not a rewrite.

Nothing here is built. Ordered by how likely it is you'll want it.

---

## Very likely, once you've used it

### Scenario / draft plans
Two versions of the same year side by side, or a draft you commit later.

**Seam:** add `planner_plans (id, year, name, is_active)` and a nullable
`plan_id` on `planner_events`. `getEvents()` gains a filter, the year switcher
becomes a plan switcher. Left out because one plan per year is what the method
describes and a plans table you never use is just a join.

### Duplicate a year
Copy 2027's shape into 2028 with dates shifted, as a starting point.

**Seam:** one server action in `actions.ts` — select the year's events, offset
every date by 52 weeks (not 365 days, so weekdays line up), re-seed milestones.
Roughly 30 lines. This one is nearly free.

### Import
CSV in, matching the export format. Also: seeding the year's holidays and closures
automatically instead of typing them.

**Seam:** a route handler that parses and bulk-inserts. Holidays could come from a
public calendar feed, which shares plumbing with .ics export below.

### .ics export / Google Calendar push
Get the year into the calendar the team actually looks at.

**Seam:** `/api/export.ics` — a route handler generating VEVENTs from
`getEvents()`. Milestones become their own all-day events. A read-only .ics
subscription URL is the low-effort version and probably the right one: the team
subscribes once and it stays current. Two-way sync is a much bigger commitment
and I'd argue against it — the planner should be the source of truth for the
shape of the year, not a mirror.

---

## Plausible

### Create the Notion page from the planner
Right now you paste a URL. Better: a button that creates a page in a chosen
Notion database, pre-filled with the event's title, dates, category and note, and
writes the URL back.

**Seam:** the app already has a server, which is the hard prerequisite — the
Notion API can't be called from the browser. Add `NOTION_API_KEY` +
`NOTION_DATABASE_ID` to env and a `createNotionPage` server action. The event
already stores `notion_url`; nothing else changes. The milestone table has a
`notion_url` column sitting unused for the same treatment.

### Milestones as real tasks
Assignee, reminder, push into Todoist.

**Seam:** `planner_milestones` gains `assignee` and `external_id`. You already run
Todoist and n8n; a nightly workflow reading due milestones and creating tasks is
probably less work than building task management in here.

### Attendance / revenue overlay
Last year's monthly revenue or lead numbers as a faint band behind each month
row, so Step 2 (mark your seasons) is grounded in data rather than memory.

**Seam:** a new lib function pulling monthly aggregates, rendered as a background
layer in `YearStrip`. The data is already in MySQL (`remit_reports`,
`Leads`) — this is the one enhancement that would connect the planner to
studio-os, and it's the one I'd argue is most valuable. It turns "I think
February is slow" into "February was slow".

### Category management UI
Add, rename, recolour and reorder categories, and edit lead templates, without
opening Supabase.

**Seam:** a `/categories` route with CRUD server actions. Left out because you'll
touch it roughly twice a year, and the table editor already does it. Worth
building only if lead templates turn out to need frequent tuning.

---

## Only if the tool sticks

### Multi-studio
One planner, several locations, shared holidays and separate events.

**Seam:** `studio_id` on events and a scope switcher. The Studio OS brief already
flags "franchise-ready later" as the eventual direction; this would follow the
same configuration-driven approach.

### Collaboration
Multiple people editing during the 90-minute meeting. Supabase Realtime on
`planner_events` would give live updates cheaply, but it means moving reads to
the browser and writing real RLS policies — currently there's no auth at all,
just the tunnel.

### Keyboard-driven entry
Type a date range and a title without touching the mouse. Fast once you know the
tool, useless before then.

---

## Deliberately not planned

- **Recurring events.** A yearly planner has ~40 entries. Recurrence rules add
  real complexity to lane packing, dragging and milestone reflow to save maybe
  five rows of typing.
- **Two-way calendar sync.** See above.
- **Week or day views.** The entire premise is that you're zoomed out. If you need
  a week view you want a different tool.

---

## Known rough edges in v1

- Milestones falling in an adjacent year aren't drawn — you have to switch years
  to see a January event's preparation.
- Dragging an event across the December/January boundary works, but the part
  outside the displayed year disappears until you switch.
- No undo. Delete asks for nothing. Worth adding if it bites.
- Lane packing can leave an empty lane in a row — the price of keeping long
  events on one line. See [[README]] § Lanes.

---

## Related

- [[README]]
- [[planning-method]]
