# Year Planner

Whole-year strategic calendar. Twelve month rows, one horizontal day track each,
every event a draggable block. Built to support the planning method in
[[planning-method]] — read that first if you haven't.

Rebuild of Blended Athletics' "Plan Your Whole Damn Year"
(kimberley-hue.github.io/big-ass-calendar), stripped of the marketing site and
rebuilt on a real database with overlap handling, direct manipulation, lead-time
milestones and Notion links.

---

## Setup

```bash
cp .env.example .env.local     # then paste the service role key
npm install
npm run dev                    # http://localhost:3000
```

The only value you have to supply is `SUPABASE_SERVICE_ROLE_KEY` — Supabase
dashboard → Project Settings → API Keys → `service_role`.

### Demo data

2027 is preloaded with ~30 entries built to stress the layout: nested events,
same-day collisions, and blocks crossing month boundaries. Wipe it whenever you
want to start on your real year:

```sql
delete from planner_events;   -- milestones cascade
```

### Deploy

Live on **tysons01** at `~/year-planner`, container `year-planner`, port
**3005** (3000-3004 and 3008 were already taken on that host).

Reachable on the LAN/Tailscale at `http://tysons01:3005` — there is no public
hostname yet. To add one, point a Cloudflare Tunnel at `localhost:3005`, the
same way `cloudflared-studio` fronts studio-os.

First-time setup on a new host:

```bash
git clone git@github.com:TheKatariya/year-planner.git
cd year-planner
cp .env.example .env            # paste the service role key
chmod 600 .env
docker compose up --build -d
```

To ship a change:

```bash
ssh pkatariya@tysons01 'cd ~/year-planner && git pull && docker compose up --build -d'
```

`restart: unless-stopped` means it comes back on reboot. **There is no auth in
front of it** — anyone who can reach port 3005 can edit the year. That is fine
behind Tailscale; put access control in front of it before exposing it
publicly.

---

## Data

Lives in the existing **Member Tracker** Supabase project
(`rvkhhlhtzweosrzhffct`), in three `planner_`-prefixed tables alongside the other
BFT tables. Splitting it into its own project would have meant a second billed
project for three tables.

| Table | Holds |
|---|---|
| `planner_categories` | The nine categories: name, both colour steps, render style, kind, and the default lead-time ladder |
| `planner_events` | Title, category, start/end date, note, Notion URL |
| `planner_milestones` | One row per lead-time step: label, due date, offset, done flag |

RLS is enabled with **no policies**, so the anon key cannot reach these tables.
Every read and write goes through a server action using the service role key,
which never leaves the server. That's the whole auth model — the app is expected
to sit behind the tunnel, not on the public internet.

### Changing categories

Categories are rows, not code. Edit them in the Supabase table editor and the app
picks the change up on next load — including `lead_template`, which is the JSON
ladder new events in that category get seeded with:

```json
[{"label": "Creative ready", "weeks_before": 4}]
```

---

## How it works

### The strip

Twelve rows, each a 31-column grid. Months shorter than 31 days render the
overflow columns hatched, so **day 15 sits in the same place in every row** — the
whole point is scanning down a column and seeing what else lands mid-month.

### Lanes — overlapping events

The original drew one event per day and dropped the rest, so a promotion running
under a race week simply vanished. Here lanes are assigned **globally across the
year** (`src/lib/lanes.ts`): events are sorted by start date, then longest-first,
and greedily packed into the lowest lane with no collision. A month row is as
tall as the highest lane it uses.

Global rather than per-row assignment means a three-month block stays on the same
line in every row it crosses. The cost is the occasional empty lane in a row —
worth it to keep long events reading as one thing.

### Direct manipulation

| Gesture | Result |
|---|---|
| Drag across empty track | New entry over that range |
| Drag a block | Move it, milestones follow |
| Drag a block's left/right edge | Resize from that end |
| Click a block | Opens the editor |
| Click the ↗ on a block | Opens its Notion page in a new tab |
| Click a block's ✎ in the table | Opens the editor |
| `Esc` mid-drag | Cancel |

Dragging works across month rows — the pointer is hit-tested against whatever
track is under it, so you can drag an event from March into September in one
gesture.

**Horizontal drag is clamped to the row you're over.** Pushing right past the
31st doesn't roll into the next month; it stops at the month's last day. To move
an event into a different month, drag *down or up* into that row. This keeps a
fast horizontal nudge from silently throwing an event a month sideways.

Clicking a block always opens the editor. Notion is one deliberate click away —
the ↗ on a linked block, or the **Open ↗** button in the editor — so reaching a
page never happens by accident when you meant to adjust an entry.

### Lead times

Every event carries milestones — see [[lead-times]].

### Colour

Nine categories, so colour cannot be the identity channel on its own. See
[[colour]] for the palette, what was validated, and what wasn't.

---

## Layout

```
src/
  app/
    actions.ts        server actions: all writes
    page.tsx          server component: loads a year, renders the shell
    globals.css       theme tokens, strip styles, print stylesheet
  components/
    Planner.tsx       page state, toolbar, legend, table view, CSV export
    YearStrip.tsx     the grid, lanes, and every drag gesture
    EventEditor.tsx   modal: event fields + milestone ladder
    MixSummary.tsx    Step 4 / Step 7 balance check
  lib/
    dates.ts          ISO-string date maths, all in UTC
    lanes.ts          lane assignment and month segmentation
    queries.ts        reads
    supabase.ts       server-only client
    types.ts          domain types
```

---

## Docs

- [[planning-method]] — the approach the tool exists to support
- [[lead-times]] — how backward planning works
- [[colour]] — palette and accessibility
- [[future-enhancements]] — what's deliberately left out, and where it would go
