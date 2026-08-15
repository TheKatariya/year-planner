# Year Planner

Plan a whole year on one screen.

Twelve month rows, each a horizontal strip of days. Every event is a coloured
block you drag into place. Built for gym and studio owners mapping out a year of
events, promotions, closures and competitions — but it's a generic year planner
and works for anything with an annual rhythm.

**Why a strip instead of twelve month grids:** you can scan down one column and
see everything landing mid-March, spot the three months with nothing in them, and
notice that two big events are only two weeks apart. A normal calendar hides all
of that.

- Overlapping events stack instead of hiding each other
- Drag to create, drag to move, drag the edges to resize
- Every event gets lead-time milestones that move with it
- Optional link from any event to a Notion page
- Category mix check, table view, CSV export, print stylesheet
- Light and dark, no sign-in, your data in your own database

Rebuilt from Blended Athletics' *Plan Your Whole Damn Year*
([original](https://kimberley-hue.github.io/big-ass-calendar/)) — the planning
method is theirs, the implementation is a from-scratch rewrite.

---

## Part 1 — How to plan a year

The tool is only half of it. This is the method it was built around. Longer
version in [docs/planning-method.md](docs/planning-method.md).

### Before you start

Put **90 minutes** in the diary, once a year. Bring:

- Last year's calendar
- Monthly revenue, leads, attrition, attendance
- Local event dates and competition dates
- The holiday calendar
- Staff travel and time off

Run it in three blocks: 30 minutes to understand the year, 30 to place the
anchors, 30 to look for gaps and conflicts.

### The seven steps

**Step 1 — Put in the non-negotiables.**
Everything already true about the year, before you have an opinion about it.

- Holidays and closures
- Major competitions and annual events
- Travel
- Local events
- Known facility projects

**Step 2 — Mark your seasons.**
Go month by month and characterise each one:

- *Weather* — can you be outside? Does it hurt attendance? Are people away?
- *Members* — motivated, busy, on holiday, coming back into routine?
- *Sales* — are leads historically strong or weak?
- *Retention* — are cancellations more common?
- *Community* — what's already happening locally?
- *Operations* — are staff away? Good time for renovations?

**Step 3 — Add your anchors.**
The major events and campaigns you already know you want. Place these about a
year ahead.

**Step 4 — Balance the mix.**
A good year isn't twelve promotions. Check the spread across:

- **Community** — bringing people together, no ask attached
- **Charity** — rallying around something bigger than you
- **Competition** — letting people test themselves
- **Promotion** — campaigns for revenue, leads, referrals
- **Member Appreciation** — rewarding the people already there

Not every category needs to appear every month. But none should be missing from
the year, and no month should be nothing but Promotion.

**Step 5 — Fill the strategic gaps.**
Look at the empty months and ask what's actually needed:

- Slow lead month → consider a promotion
- Higher attrition → consider a retention or community event
- Great weather → can something move outside?
- Big competition coming → support it with education, programming, content
- Right after a huge event → maybe nothing. Deliberately.
- You've asked people to spend repeatedly → don't ask again yet

**Step 6 — Connect the surrounding marketing.**
For each anchor, ask what should happen around it: what to talk about, what to
teach, what to sell, what content to capture, what happens before and after.

> A running event → running education → running content → relevant retail →
> a community run → event day

When the pieces relate to each other, marketing feels natural instead of
constant.

**Step 7 — Zoom out again.**
With the year populated, interrogate it:

- Are major events too close together?
- Are you constantly asking people to spend?
- Is there enough community?
- Are slow months supported?
- Will staff be exhausted?
- Is there enough lead time?
- Are there periods where you should deliberately do less?

### The rule

> **Big things: a year out. Small things: about two months out.**

You're not predicting every Tuesday next October. You're making sure October
doesn't surprise you.

### Work backwards

The event date is not the planning date. An event on 15 August really means:

| When | What |
|---|---|
| Earlier in the year | On the calendar at all |
| ~14 weeks before | Concept finalised |
| ~10 weeks before | Creative, operations, staffing |
| ~6 weeks before | Registration and promotion open |
| ~2 weeks before | Final communication |
| **15 August** | **Event** |

The tool does this for you — see *Lead times* below.

---

## Part 2 — Using it

### Gestures

| Do this | Get this |
|---|---|
| Drag across empty track | New entry over that range |
| Drag a block | Move it — milestones follow |
| Drag a block's left or right edge | Resize from that end |
| Click a block | Open the editor |
| Click the ↗ on a block | Open its linked page in a new tab |
| Click a legend chip | Filter to that category |
| `Esc` mid-drag | Cancel |

Drags cross month rows, so you can pull an event from March to September in one
gesture. Horizontal drag stops at the end of the row you're over — to change
month, drag up or down.

### Lead times

Each category carries a **ladder** of milestones measured in weeks before the
start date. Saving an event turns that ladder into real dated milestones, drawn
as small ticks above each month's lanes.

- Move the event and generated milestones move with it
- Edit a milestone's date by hand and it pins there
- Tick them off as you go
- **Reset from category** rebuilds the ladder

Details in [docs/lead-times.md](docs/lead-times.md).

### Categories

Nine ship by default — five you *create* and balance (Community, Charity,
Competition, Promotion, Member Appreciation) and four you *plan around*
(Marketing/Retail, Closure/Holiday, Travel, Operations).

They're database rows, not code. Rename them, recolour them, add your own, or
change their lead-time ladders in the Supabase table editor — no deploy needed.

### The mix panel

Under the strip: a grid of category × month, plus automatic flags for empty
months, months with three or more entries, back-to-back promotions, and
categories missing from the year entirely. Step 4 and Step 7, made checkable.

---

## Part 3 — Setup

You need Node 20+ and a free Supabase account.

**1. Clone and install**

```bash
git clone https://github.com/TheKatariya/year-planner.git
cd year-planner
npm install
```

**2. Create a Supabase project**

Any free project works — <https://supabase.com/dashboard>.

**3. Create the tables**

Open **SQL Editor** in the dashboard, paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run
it. That creates the three tables and the nine starting categories.

**4. Add your credentials**

```bash
cp .env.example .env.local
```

Fill in both values from **Project Settings → API**:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key |

The service role key is a **secret**. It's only ever read on the server and never
reaches the browser. Don't prefix it with `NEXT_PUBLIC_`, and don't commit it —
`.env.local` is gitignored.

**5. Run it**

```bash
npm run dev
```

Open <http://localhost:3000>. It starts on the current year; use the dropdown or
`?year=2027` to change it.

---

## Part 4 — Deploying

A Dockerfile and compose file are included. The container serves on port 3005 —
change the mapping in `docker-compose.yml` if that clashes with something.

```bash
cp .env.example .env     # the same two values
chmod 600 .env
docker compose up --build -d
```

To update a running deployment:

```bash
git pull && docker compose up --build -d
```

> **There is no authentication.** Anyone who can reach the port can edit the
> year. That's deliberate — it's built to sit on a private network or behind
> whatever access control you already run. Put something in front of it before
> exposing it to the internet.

---

## How it works

**Lanes.** Overlapping events are what the original got wrong: it drew one event
per day and silently dropped the rest, so a promotion running under a race week
just vanished. Here lanes are assigned globally across the year — events sorted
by start date, longest first, greedily packed into the lowest free lane. A month
row is as tall as the highest lane it uses. Global rather than per-row assignment
keeps a three-month block on the same line in every row it crosses.

**Dates.** Every date is a plain `YYYY-MM-DD` string and all arithmetic runs in
UTC, so a browser in a negative offset never renders an event a day early.

**Colour.** Nine categories can't be told apart by hue alone — no palette
achieves that. So colour is a grouping aid, and identity is carried by direct
labels on every block, a solid/outline/hatch style channel, a named legend, and
the table view. [docs/colour.md](docs/colour.md) has the palette and what was
actually validated.

**Security.** RLS is on with no policies, so the anon key can't touch these
tables at all. Every read and write goes through a Next.js server action using
the service role key.

### Layout

```
src/
  app/
    actions.ts       server actions — all writes
    page.tsx         loads a year, renders the shell
    globals.css      theme tokens, strip styles, print stylesheet
  components/
    Planner.tsx      page state, toolbar, legend, table, CSV export
    YearStrip.tsx    the grid, lanes, and every drag gesture
    EventEditor.tsx  event fields + milestone ladder
    MixSummary.tsx   the balance check
  lib/
    dates.ts         ISO date maths, all UTC
    lanes.ts         lane assignment and month segmentation
    queries.ts       reads
    supabase.ts      server-only client
    types.ts         domain types
supabase/migrations/ schema + starting categories
```

Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Supabase. No other
runtime dependencies.

---

## Docs

- [docs/planning-method.md](docs/planning-method.md) — the full method
- [docs/lead-times.md](docs/lead-times.md) — how backward planning works
- [docs/colour.md](docs/colour.md) — palette and accessibility
- [docs/future-enhancements.md](docs/future-enhancements.md) — what's deliberately left out, and where it would go

## Credit

The planning method — the seven steps, the seasonality prompts, the mix, the
rule, working backwards — comes from **Blended Athletics**' free
[Plan Your Whole Damn Year](https://kimberley-hue.github.io/big-ass-calendar/).
Built by gym owners, for gym owners. This project reimplements the idea with a
database behind it; the thinking is theirs.

## Licence

MIT — see [LICENSE](LICENSE).
